from __future__ import annotations

import time

from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.clients.redis import redis_client
from app.core.logging import logger
from app.services.users.models import UserModel
from app.services.users.schema import CreateProfile, UpdateProfile, User

PROFILE_CACHE_PREFIX = "user:profile:"
PROFILE_CACHE_TTL_SECONDS = 60 * 60 * 24


class UserStore:

    @staticmethod
    def _profile_key(user_id: str) -> str:
        """Build the Redis key caching one user's profile."""
        return f"{PROFILE_CACHE_PREFIX}{user_id}"

    async def _get_cached_profile(self, user_id: str) -> User | None:
        """Read a user's profile from Redis. Postgres is the source of truth, so a
        cache outage must degrade to a miss, never fail the caller."""
        try:
            raw = await redis_client.get(self._profile_key(user_id))
        except Exception:
            logger.warning("profile cache read failed, falling back to DB", exc_info=True)
            return None
        return User.model_validate_json(raw) if raw else None

    async def _cache_profile(self, user: User) -> None:
        """Best-effort write-through of a user's profile into Redis."""
        try:
            await redis_client.set(
                self._profile_key(user.user_id),
                user.model_dump_json(),
                ex=PROFILE_CACHE_TTL_SECONDS,
            )
        except Exception:
            logger.warning("profile cache write failed, DB row is still authoritative", exc_info=True)

    async def _invalidate_profile_cache(self, user_id: str) -> None:
        """Drop a user's cached profile after a write, so the next read refetches from DB."""
        try:
            await redis_client.delete(self._profile_key(user_id))
        except Exception:
            logger.warning("profile cache invalidation failed", exc_info=True)

    async def create_profile(
        self, session: AsyncSession, user_id: str, request: CreateProfile
    ) -> User:
        """Create a new user's profile. Raises if the user already has one or the username is taken."""
        existing = await session.get(UserModel, user_id)
        if existing is not None:
            raise ProfileAlreadyExistsError(user_id)

        now = int(time.time() * 1000)
        row = UserModel(
            user_id=user_id,
            username=request.username,
            display_name=request.display_name,
            bio=request.bio,
            status=request.status,
            created_at=now,
            updated_at=now,
        )
        session.add(row)
        try:
            await session.commit()
        except IntegrityError:
            await session.rollback()
            raise UsernameTakenError(request.username)

        user = self._row_to_user(row)
        await self._cache_profile(user)
        return user

    async def get_profile(self, session: AsyncSession, user_id: str) -> User | None:
        """Fetch a user's profile by id, or None if it doesn't exist. Reads Redis before Postgres."""
        cached = await self._get_cached_profile(user_id)
        if cached is not None:
            return cached

        row = await session.get(UserModel, user_id)
        if row is None:
            return None

        user = self._row_to_user(row)
        await self._cache_profile(user)
        return user

    async def update_avatar(
        self, session: AsyncSession, user_id: str, avatar_url: str
    ) -> User:
        """Set a user's avatar_url. Raises if the user has no profile yet."""
        row = await session.get(UserModel, user_id)
        if row is None:
            raise ProfileNotFoundError(user_id)

        row.avatar_url = avatar_url
        row.updated_at = int(time.time() * 1000)
        await session.commit()

        user = self._row_to_user(row)
        await self._cache_profile(user)
        return user

    async def update_profile(
        self, session: AsyncSession, user_id: str, request: UpdateProfile
    ) -> User:
        """Update whichever fields are set on the request, leaving the rest untouched."""
        row = await session.get(UserModel, user_id)
        if row is None:
            raise ProfileNotFoundError(user_id)

        updates = request.model_dump(exclude_unset=True, exclude_none=True)
        for field, value in updates.items():
            setattr(row, field, value)
        row.updated_at = int(time.time() * 1000)

        try:
            await session.commit()
        except IntegrityError:
            await session.rollback()
            raise UsernameTakenError(request.username)

        user = self._row_to_user(row)
        await self._cache_profile(user)
        return user

    async def search_users(
        self, session: AsyncSession, query: str, exclude_user_id: str, limit: int = 20
    ) -> list[User]:
        """Search users by username prefix, excluding the requesting user."""
        result = await session.execute(
            select(UserModel)
            .where(UserModel.username.ilike(f"{query}%"))
            .where(UserModel.user_id != exclude_user_id)
            .limit(limit)
        )
        return [self._row_to_user(row) for row in result.scalars().all()]

    def _row_to_user(self, row: UserModel) -> User:
        return User(
            user_id=row.user_id,
            username=row.username,
            display_name=row.display_name,
            bio=row.bio,
            status=row.status,
            avatar_url=row.avatar_url,
            created_at=row.created_at,
            updated_at=row.updated_at,
        )


class ProfileAlreadyExistsError(Exception):
    """Raised when a user already has a profile."""


class UsernameTakenError(Exception):
    """Raised when the requested username is already in use."""


class ProfileNotFoundError(Exception):
    """Raised when an operation targets a user with no profile yet."""


user_store = UserStore()
