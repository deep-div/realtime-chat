from __future__ import annotations

import time

from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.services.users.models import UserModel
from app.services.users.schema import CreateProfile, User


class UserStore:

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

        return self._row_to_user(row)

    async def get_profile(self, session: AsyncSession, user_id: str) -> User | None:
        """Fetch a user's profile by id, or None if it doesn't exist."""
        row = await session.get(UserModel, user_id)
        if row is None:
            return None
        return self._row_to_user(row)

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
            created_at=row.created_at,
            updated_at=row.updated_at,
        )


class ProfileAlreadyExistsError(Exception):
    """Raised when a user already has a profile."""


class UsernameTakenError(Exception):
    """Raised when the requested username is already in use."""


user_store = UserStore()
