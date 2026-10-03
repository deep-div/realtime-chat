from __future__ import annotations

import time
import uuid

from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.clients.redis import redis_client
from app.core.logging import logger
from app.services.chat.models import ChatMemberModel, ChatModel
from app.services.chat.schema import (
    Chat,
    ChatCreated,
    ChatMember,
    ChatRole,
    ChatType,
    CreateDirectChat,
    CreateGroupChat,
)

DIRECT_CHAT_CACHE_PREFIX = "chat:direct_pair:"
DIRECT_CHAT_CACHE_TTL_SECONDS = 60 * 60 * 24


class ChatStore:

    @staticmethod
    def _direct_pair_key(user_min: str, user_max: str) -> str:
        """Build the Redis key caching a direct-chat pair -> (chat_id, created_at)."""
        return f"{DIRECT_CHAT_CACHE_PREFIX}{user_min}:{user_max}"

    async def _get_cached_direct_pair(self, user_min: str, user_max: str) -> dict | None:
        """Read a direct-chat pair from Redis. Postgres is the source of truth, so a
        cache outage must degrade to a miss, never fail the request."""
        try:
            data = await redis_client.hgetall(self._direct_pair_key(user_min, user_max))
        except Exception:
            logger.warning("chat cache read failed, falling back to DB", exc_info=True)
            return None
        return data or None

    async def _cache_direct_pair(
        self, user_min: str, user_max: str, chat_id: str, created_at: int
    ) -> None:
        """Best-effort write-through of a resolved direct-chat pair into Redis."""
        key = self._direct_pair_key(user_min, user_max)
        try:
            async with redis_client.pipeline() as pipe:
                pipe.hset(key, mapping={"chat_id": chat_id, "created_at": created_at})
                pipe.expire(key, DIRECT_CHAT_CACHE_TTL_SECONDS)
                await pipe.execute()
        except Exception:
            logger.warning("chat cache write failed, DB row is still authoritative", exc_info=True)

    async def create_direct_chat(
        self, session: AsyncSession, requester_id: str, request: CreateDirectChat
    ) -> ChatCreated:
        """Get-or-create the 1:1 chat between requester_id and request.recipient_id."""
        user_min, user_max = sorted([requester_id, request.recipient_id])
        direct_member_ids = {requester_id, request.recipient_id}

        cached = await self._get_cached_direct_pair(user_min, user_max)
        if cached:
            return ChatCreated(
                chat_id=cached["chat_id"],
                chat_type=ChatType.DIRECT,
                title=None,
                members=list(direct_member_ids),
                created_at=int(cached["created_at"]),
                already_existed=True,
            )

        existing = await self._get_direct_chat_by_pair(session, user_min, user_max)
        if existing is not None:
            chat_row, members = existing
            await self._cache_direct_pair(user_min, user_max, chat_row.chat_id, chat_row.created_at)
            return self._to_chat_created(chat_row, members, already_existed=True)

        chat_id = str(uuid.uuid4())
        now = int(time.time() * 1000)

        chat_row = ChatModel(
            chat_id=chat_id,
            chat_type=ChatType.DIRECT.value,
            title=None,
            avatar_media_id=None,
            created_by=requester_id,
            created_at=now,
            direct_user_min=user_min,
            direct_user_max=user_max,
        )
        member_rows = [
            ChatMemberModel(chat_id=chat_id, user_id=user_id, role=ChatRole.MEMBER.value, joined_at=now)
            for user_id in direct_member_ids
        ]

        session.add(chat_row)
        session.add_all(member_rows)
        try:
            await session.commit()
        except IntegrityError:
            # Lost a race to a concurrent create for the same pair — fetch the winner's row.
            await session.rollback()
            existing = await self._get_direct_chat_by_pair(session, user_min, user_max)
            if existing is None:
                raise
            winner_chat, winner_members = existing
            await self._cache_direct_pair(user_min, user_max, winner_chat.chat_id, winner_chat.created_at)
            return self._to_chat_created(winner_chat, winner_members, already_existed=True)

        await self._cache_direct_pair(user_min, user_max, chat_id, now)
        return self._to_chat_created(chat_row, list(direct_member_ids), already_existed=False)

    async def create_group_chat(
        self, session: AsyncSession, requester_id: str, request: CreateGroupChat
    ) -> ChatCreated:
        """Create a new group chat owned by requester_id."""
        chat_id = str(uuid.uuid4())
        now = int(time.time() * 1000)

        chat_row = ChatModel(
            chat_id=chat_id,
            chat_type=ChatType.GROUP.value,
            title=request.title,
            avatar_media_id=None,
            created_by=requester_id,
            created_at=now,
            direct_user_min=None,
            direct_user_max=None,
        )

        member_ids = [requester_id] + [uid for uid in request.member_ids if uid != requester_id]
        member_rows = [
            ChatMemberModel(
                chat_id=chat_id,
                user_id=user_id,
                role=ChatRole.OWNER.value if user_id == requester_id else ChatRole.MEMBER.value,
                joined_at=now,
            )
            for user_id in member_ids
        ]

        session.add(chat_row)
        session.add_all(member_rows)
        await session.commit()

        return self._to_chat_created(chat_row, member_ids, already_existed=False)

    async def get_chat(self, session: AsyncSession, chat_id: str) -> Chat | None:
        """Fetch one chat by id, or None if it doesn't exist."""
        row = await session.get(ChatModel, chat_id)
        return self._row_to_chat(row) if row is not None else None

    async def list_members(self, session: AsyncSession, chat_id: str) -> list[ChatMember]:
        """Fetch every member of a chat."""
        result = await session.execute(
            select(ChatMemberModel).where(ChatMemberModel.chat_id == chat_id)
        )
        return [self._row_to_member(row) for row in result.scalars().all()]

    async def list_my_chats(self, session: AsyncSession, user_id: str) -> list[Chat]:
        """Fetch every chat the given user is a member of."""
        result = await session.execute(
            select(ChatModel)
            .join(ChatMemberModel, ChatMemberModel.chat_id == ChatModel.chat_id)
            .where(ChatMemberModel.user_id == user_id)
        )
        return [self._row_to_chat(row) for row in result.scalars().all()]

    async def _get_direct_chat_by_pair(
        self, session: AsyncSession, user_min: str, user_max: str
    ) -> tuple[ChatModel, list[str]] | None:
        """Look up an existing direct chat by its normalized user pair, with members."""
        result = await session.execute(
            select(ChatModel).where(
                ChatModel.direct_user_min == user_min,
                ChatModel.direct_user_max == user_max,
            )
        )
        chat_row = result.scalar_one_or_none()
        if chat_row is None:
            return None

        members_result = await session.execute(
            select(ChatMemberModel.user_id).where(ChatMemberModel.chat_id == chat_row.chat_id)
        )
        return chat_row, list(members_result.scalars().all())

    def _row_to_chat(self, row: ChatModel) -> Chat:
        return Chat(
            chat_id=row.chat_id,
            chat_type=ChatType(row.chat_type),
            title=row.title,
            avatar_media_id=row.avatar_media_id,
            created_by=row.created_by,
            created_at=row.created_at,
        )

    def _row_to_member(self, row: ChatMemberModel) -> ChatMember:
        return ChatMember(
            chat_id=row.chat_id,
            user_id=row.user_id,
            role=ChatRole(row.role),
            joined_at=row.joined_at,
            muted_until=row.muted_until,
        )

    def _to_chat_created(
        self, chat: ChatModel, members: list[str], already_existed: bool
    ) -> ChatCreated:
        return ChatCreated(
            chat_id=chat.chat_id,
            chat_type=ChatType(chat.chat_type),
            title=chat.title,
            members=members,
            created_at=chat.created_at,
            already_existed=already_existed,
        )


chat_store = ChatStore()
