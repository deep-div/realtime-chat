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

CHAT_CACHE_PREFIX = "chat:detail:"
CHAT_CACHE_TTL_SECONDS = 60 * 60 * 24

MEMBERS_CACHE_PREFIX = "chat:members:"
MEMBERS_CACHE_TTL_SECONDS = 60 * 60 * 24

USER_CHATS_CACHE_PREFIX = "chat:user_chats:"
USER_CHATS_CACHE_TTL_SECONDS = 60 * 60 * 24


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

    @staticmethod
    def _chat_key(chat_id: str) -> str:
        """Build the Redis key caching one chat's metadata row."""
        return f"{CHAT_CACHE_PREFIX}{chat_id}"

    @staticmethod
    def _members_key(chat_id: str) -> str:
        """Build the Redis key caching one chat's member list."""
        return f"{MEMBERS_CACHE_PREFIX}{chat_id}"

    async def _get_cached_chat(self, chat_id: str) -> Chat | None:
        """Read a chat's metadata from Redis. Falls back to a miss on any cache error."""
        try:
            raw = await redis_client.get(self._chat_key(chat_id))
        except Exception:
            logger.warning("chat detail cache read failed, falling back to DB", exc_info=True)
            return None
        return Chat.model_validate_json(raw) if raw else None

    async def _cache_chat(self, chat: Chat) -> None:
        """Best-effort write-through of a chat's metadata into Redis."""
        try:
            await redis_client.set(
                self._chat_key(chat.chat_id), chat.model_dump_json(), ex=CHAT_CACHE_TTL_SECONDS
            )
        except Exception:
            logger.warning("chat detail cache write failed, DB row is still authoritative", exc_info=True)

    async def _get_cached_members(self, chat_id: str) -> list[ChatMember] | None:
        """Read a chat's member list from Redis. Falls back to a miss on any cache error."""
        try:
            raw = await redis_client.get(self._members_key(chat_id))
        except Exception:
            logger.warning("chat members cache read failed, falling back to DB", exc_info=True)
            return None
        if not raw:
            return None
        return [ChatMember.model_validate_json(item) for item in raw.split("\n")]

    async def _cache_members(self, chat_id: str, members: list[ChatMember]) -> None:
        """Best-effort write-through of a chat's member list into Redis."""
        try:
            payload = "\n".join(member.model_dump_json() for member in members)
            await redis_client.set(
                self._members_key(chat_id), payload, ex=MEMBERS_CACHE_TTL_SECONDS
            )
        except Exception:
            logger.warning("chat members cache write failed, DB rows are still authoritative", exc_info=True)

    async def _invalidate_members_cache(self, chat_id: str) -> None:
        """Drop a chat's cached member list after a membership change, so the next read refetches from DB."""
        try:
            await redis_client.delete(self._members_key(chat_id))
        except Exception:
            logger.warning("chat members cache invalidation failed", exc_info=True)

    @staticmethod
    def _user_chats_key(user_id: str) -> str:
        """Build the Redis key caching one user's chat list."""
        return f"{USER_CHATS_CACHE_PREFIX}{user_id}"

    async def _get_cached_user_chats(self, user_id: str) -> list[Chat] | None:
        """Read a user's chat list from Redis. Falls back to a miss on any cache error."""
        try:
            raw = await redis_client.get(self._user_chats_key(user_id))
        except Exception:
            logger.warning("user chats cache read failed, falling back to DB", exc_info=True)
            return None
        if not raw:
            return None
        return [Chat.model_validate_json(item) for item in raw.split("\n")]

    async def _cache_user_chats(self, user_id: str, chats: list[Chat]) -> None:
        """Best-effort write-through of a user's chat list into Redis."""
        try:
            payload = "\n".join(chat.model_dump_json() for chat in chats)
            await redis_client.set(
                self._user_chats_key(user_id), payload, ex=USER_CHATS_CACHE_TTL_SECONDS
            )
        except Exception:
            logger.warning("user chats cache write failed, DB rows are still authoritative", exc_info=True)

    async def _invalidate_user_chats_cache(self, user_id: str) -> None:
        """Drop a user's cached chat list after their chat memberships change."""
        try:
            await redis_client.delete(self._user_chats_key(user_id))
        except Exception:
            logger.warning("user chats cache invalidation failed", exc_info=True)

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
        await session.flush()  # insert the parent row before the members that FK to it
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
        for member_id in direct_member_ids:
            await self._invalidate_user_chats_cache(member_id)
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
        await session.flush()  # insert the parent row before the members that FK to it
        session.add_all(member_rows)
        await session.commit()

        for member_id in member_ids:
            await self._invalidate_user_chats_cache(member_id)
        return self._to_chat_created(chat_row, member_ids, already_existed=False)

    async def add_member(
        self, session: AsyncSession, chat_id: str, requester_id: str, user_id: str
    ) -> ChatMember:
        """Add a user to a group chat. Only an OWNER/ADMIN of that chat may do this."""
        chat_row = await session.get(ChatModel, chat_id)
        if chat_row is None:
            raise ChatNotFoundError(chat_id)
        if chat_row.chat_type != ChatType.GROUP.value:
            raise NotAGroupChatError(chat_id)

        members = await self.list_members(session, chat_id)
        requester = next((m for m in members if m.user_id == requester_id), None)
        if requester is None:
            raise NotAMemberError(requester_id)
        if requester.role not in (ChatRole.OWNER, ChatRole.ADMIN):
            raise InsufficientRoleError(requester_id)
        if any(m.user_id == user_id for m in members):
            raise AlreadyMemberError(user_id)

        now = int(time.time() * 1000)
        member_row = ChatMemberModel(
            chat_id=chat_id, user_id=user_id, role=ChatRole.MEMBER.value, joined_at=now
        )
        session.add(member_row)
        await session.commit()
        await self._invalidate_members_cache(chat_id)
        await self._invalidate_user_chats_cache(user_id)
        return self._row_to_member(member_row)

    async def remove_member(
        self, session: AsyncSession, chat_id: str, requester_id: str, user_id: str
    ) -> None:
        """Remove a user from a group chat. A member may remove themself (leave);
        removing someone else requires OWNER/ADMIN."""
        chat_row = await session.get(ChatModel, chat_id)
        if chat_row is None:
            raise ChatNotFoundError(chat_id)
        if chat_row.chat_type != ChatType.GROUP.value:
            raise NotAGroupChatError(chat_id)

        members = await self.list_members(session, chat_id)
        requester = next((m for m in members if m.user_id == requester_id), None)
        if requester is None:
            raise NotAMemberError(requester_id)
        if not any(m.user_id == user_id for m in members):
            raise NotAMemberError(user_id)

        is_self_leave = requester_id == user_id
        if not is_self_leave and requester.role not in (ChatRole.OWNER, ChatRole.ADMIN):
            raise InsufficientRoleError(requester_id)

        member_row = await session.get(ChatMemberModel, (chat_id, user_id))
        await session.delete(member_row)
        await session.commit()
        await self._invalidate_members_cache(chat_id)
        await self._invalidate_user_chats_cache(user_id)

    async def get_chat(self, session: AsyncSession, chat_id: str) -> Chat | None:
        """Fetch one chat by id, or None if it doesn't exist. Reads Redis before Postgres."""
        cached = await self._get_cached_chat(chat_id)
        if cached is not None:
            return cached

        row = await session.get(ChatModel, chat_id)
        if row is None:
            return None

        chat = self._row_to_chat(row)
        await self._cache_chat(chat)
        return chat

    async def list_members(self, session: AsyncSession, chat_id: str) -> list[ChatMember]:
        """Fetch every member of a chat. Reads Redis before Postgres."""
        cached = await self._get_cached_members(chat_id)
        if cached is not None:
            return cached

        result = await session.execute(
            select(ChatMemberModel).where(ChatMemberModel.chat_id == chat_id)
        )
        members = [self._row_to_member(row) for row in result.scalars().all()]
        await self._cache_members(chat_id, members)
        return members

    async def list_my_chats(self, session: AsyncSession, user_id: str) -> list[Chat]:
        """Fetch every chat the given user is a member of. Reads Redis before Postgres."""
        cached = await self._get_cached_user_chats(user_id)
        if cached is not None:
            return cached

        result = await session.execute(
            select(ChatModel)
            .join(ChatMemberModel, ChatMemberModel.chat_id == ChatModel.chat_id)
            .where(ChatMemberModel.user_id == user_id)
        )
        chats = [self._row_to_chat(row) for row in result.scalars().all()]
        await self._cache_user_chats(user_id, chats)
        return chats

    async def list_my_chats_with_peer_ids(
        self, session: AsyncSession, user_id: str, limit: int = 50, before: int | None = None
    ) -> list[tuple[Chat, str | None]]:
        """Fetch a page of the user's chats, newest-created first, paired with each direct
        chat's other member id.

        Bypasses the list_my_chats cache since it needs the direct_user_min/max columns
        that cache doesn't store, and cursor pagination isn't worth caching.
        """
        query = (
            select(ChatModel)
            .join(ChatMemberModel, ChatMemberModel.chat_id == ChatModel.chat_id)
            .where(ChatMemberModel.user_id == user_id)
            .order_by(ChatModel.created_at.desc(), ChatModel.chat_id.desc())
            .limit(limit)
        )
        if before is not None:
            query = query.where(ChatModel.created_at < before)

        result = await session.execute(query)
        rows = list(result.scalars().all())

        pairs: list[tuple[Chat, str | None]] = []
        for row in rows:
            peer_id = None
            if row.chat_type == ChatType.DIRECT.value:
                peer_id = row.direct_user_max if row.direct_user_min == user_id else row.direct_user_min
            pairs.append((self._row_to_chat(row), peer_id))
        return pairs

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


class ChatNotFoundError(Exception):
    """Raised when a chat_id doesn't exist."""


class NotAGroupChatError(Exception):
    """Raised when a group-only operation targets a direct chat."""


class NotAMemberError(Exception):
    """Raised when a user referenced isn't (or isn't yet) a member of the chat."""


class InsufficientRoleError(Exception):
    """Raised when the requester's role doesn't permit the action."""


class AlreadyMemberError(Exception):
    """Raised when adding a user who is already a member."""


chat_store = ChatStore()
