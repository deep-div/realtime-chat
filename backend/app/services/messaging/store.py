from __future__ import annotations

import time
import uuid

from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.clients.redis import redis_client
from app.core.logging import logger
from app.services.chat.store import ChatNotFoundError, NotAMemberError, chat_store
from app.services.messaging.models import MessageModel
from app.services.messaging.schema import ChatMessage, EncryptedContent, SendMessage

MESSAGE_CACHE_PREFIX = "chat:messages:"
MESSAGE_CACHE_MAX = 100
MESSAGE_CACHE_TTL_SECONDS = 60 * 60 * 24


class MessageStore:

    @staticmethod
    def _cache_key(chat_id: str) -> str:
        """Build the Redis key for a chat's cached recent-messages sorted set."""
        return f"{MESSAGE_CACHE_PREFIX}{chat_id}"

    async def _cache_message(self, message: ChatMessage) -> None:
        """Best-effort write-through of a new message into its chat's Redis cache.

        Postgres is the source of truth, so a cache write failure must never
        fail the send - it just means that message waits for the DB on next read.
        """
        key = self._cache_key(message.chat_id)
        try:
            async with redis_client.pipeline() as pipe:
                pipe.zadd(key, {message.model_dump_json(): message.sent_at})
                pipe.zremrangebyrank(key, 0, -(MESSAGE_CACHE_MAX + 1))
                pipe.expire(key, MESSAGE_CACHE_TTL_SECONDS)
                await pipe.execute()
        except Exception:
            logger.warning("message cache write failed, DB row is still authoritative", exc_info=True)

    async def _cache_messages_bulk(self, chat_id: str, messages: list[ChatMessage]) -> None:
        """Best-effort population of a chat's Redis cache after a DB-backed read."""
        if not messages:
            return
        key = self._cache_key(chat_id)
        try:
            mapping = {message.model_dump_json(): message.sent_at for message in messages}
            async with redis_client.pipeline() as pipe:
                pipe.zadd(key, mapping)
                pipe.zremrangebyrank(key, 0, -(MESSAGE_CACHE_MAX + 1))
                pipe.expire(key, MESSAGE_CACHE_TTL_SECONDS)
                await pipe.execute()
        except Exception:
            logger.warning("message cache backfill failed", exc_info=True)

    async def _get_cached_messages(self, chat_id: str, limit: int) -> list[ChatMessage] | None:
        """Read the most recent messages for a chat from Redis, oldest first.

        Returns None on a cache miss or Redis outage so the caller falls back to Postgres.
        """
        try:
            raw = await redis_client.zrevrange(self._cache_key(chat_id), 0, limit - 1)
        except Exception:
            logger.warning("message cache read failed, falling back to DB", exc_info=True)
            return None

        if not raw:
            return None

        messages = [ChatMessage.model_validate_json(item) for item in raw]
        messages.reverse()
        return messages

    async def send_message(
        self, session: AsyncSession, sender_id: str, request: SendMessage
    ) -> ChatMessage:
        """Persist a message into a chat the sender belongs to, and cache it for fast reads."""
        chat = await chat_store.get_chat(session, request.chat_id)
        if chat is None:
            raise ChatNotFoundError(request.chat_id)

        members = await chat_store.list_members(session, request.chat_id)
        if not any(member.user_id == sender_id for member in members):
            raise NotAMemberError(sender_id)

        message_id = str(uuid.uuid4())
        now = int(time.time() * 1000)

        row = MessageModel(
            message_id=message_id,
            chat_id=request.chat_id,
            sender_id=sender_id,
            client_message_id=request.client_message_id,
            scheme=request.content.scheme,
            ciphertext=request.content.ciphertext,
            sent_at=now,
        )
        session.add(row)
        try:
            await session.commit()
        except IntegrityError:
            # Client retried a send we already persisted - return the original, not a duplicate.
            await session.rollback()
            existing = await self._get_by_client_message_id(
                session, request.chat_id, sender_id, request.client_message_id
            )
            if existing is None:
                raise
            return existing

        message = self._row_to_message(row)
        await self._cache_message(message)
        return message

    async def get_messages(
        self, session: AsyncSession, chat_id: str, limit: int = 50
    ) -> list[ChatMessage]:
        """Fetch a chat's most recent messages, oldest first. Reads Redis before Postgres."""
        cached = await self._get_cached_messages(chat_id, limit)
        if cached is not None:
            return cached

        result = await session.execute(
            select(MessageModel)
            .where(MessageModel.chat_id == chat_id)
            .order_by(MessageModel.sent_at.desc())
            .limit(limit)
        )
        rows = list(result.scalars().all())
        messages = [self._row_to_message(row) for row in reversed(rows)]

        await self._cache_messages_bulk(chat_id, messages)
        return messages

    async def _get_by_client_message_id(
        self, session: AsyncSession, chat_id: str, sender_id: str, client_message_id: str
    ) -> ChatMessage | None:
        """Look up a message by its client-supplied idempotency key."""
        result = await session.execute(
            select(MessageModel).where(
                MessageModel.chat_id == chat_id,
                MessageModel.sender_id == sender_id,
                MessageModel.client_message_id == client_message_id,
            )
        )
        row = result.scalar_one_or_none()
        return self._row_to_message(row) if row is not None else None

    def _row_to_message(self, row: MessageModel) -> ChatMessage:
        return ChatMessage(
            message_id=row.message_id,
            chat_id=row.chat_id,
            sender_id=row.sender_id,
            sent_at=row.sent_at,
            client_message_id=row.client_message_id,
            content=EncryptedContent(scheme=row.scheme, ciphertext=row.ciphertext),
            edited_at=row.edited_at,
            deleted_at=row.deleted_at,
        )


message_store = MessageStore()
