from __future__ import annotations

import time

from sqlalchemy import select
from sqlalchemy.dialects.postgresql import insert as pg_insert

from app.clients.postgre import AsyncSessionLocal
from app.clients.redis import redis_client
from app.services.presence.connection_registry import connection_registry
from app.services.presence.models import LastSeen
from app.services.presence.schema import (
    LASTSEEN_CACHE_TTL_SECONDS,
    LastSeenCache,
    PresenceStatus,
    UserPresence,
)


LASTSEEN_KEY_PREFIX = "presence:lastseen:"
WATCHERS_KEY_PREFIX = "presence:watchers:"
SUBSCRIPTIONS_KEY_PREFIX = "presence:subscriptions:"

# A is subscribed to B. (Chat Opened)
# C is subscribed to B. (Chat Opened)
# D is subscribed to B. (Chat Opened)
# E is subscribed to B. (Chat Opened)
# B's watchers are A, C, D, and E. (B goes Offline Server notifies all Watchers B is offline.)
# If B goes offline, A, C, D, and E are notified.


class PresenceWatcherRegistry:
    """Tracks which connections are watching each user's presence."""

    @staticmethod
    def _watchers_key(user_id: str) -> str:
        """Build the Redis key containing connections watching a user."""
        return f"{WATCHERS_KEY_PREFIX}{user_id}"

    @staticmethod
    def _subscriptions_key(connection_id: str) -> str:
        """Build the Redis key containing users watched by a connection."""
        return f"{SUBSCRIPTIONS_KEY_PREFIX}{connection_id}"

    async def watch_users(self, connection_id: str, user_ids: list[str]) -> None:
        """Record that a connection watches the given users' presence."""
        if not user_ids:
            return

        async with redis_client.pipeline() as pipe:
            for user_id in user_ids:
                pipe.sadd(self._watchers_key(user_id), connection_id)

            pipe.sadd(self._subscriptions_key(connection_id), *user_ids)
            await pipe.execute()

    async def unwatch_users(self, connection_id: str, user_ids: list[str]) -> None:
        """Remove a connection's watch on the given users' presence."""
        if not user_ids:
            return

        async with redis_client.pipeline() as pipe:
            for user_id in user_ids:
                pipe.srem(self._watchers_key(user_id), connection_id)

            pipe.srem(self._subscriptions_key(connection_id), *user_ids)
            await pipe.execute()

    async def get_user_watchers(self, user_id: str) -> set[str]:
        """Return connections currently watching a user's presence."""
        return await redis_client.smembers(self._watchers_key(user_id))

    async def clear_connection(self, connection_id: str) -> None:
        """Remove a disconnected connection from all presence subscriptions."""
        subscriptions_key = self._subscriptions_key(connection_id)
        user_ids = await redis_client.smembers(subscriptions_key)

        if not user_ids:
            return

        async with redis_client.pipeline() as pipe:
            for user_id in user_ids:
                pipe.srem(self._watchers_key(user_id), connection_id)

            pipe.delete(subscriptions_key)
            await pipe.execute()


class PresenceManager:
    """Handles user online/offline presence and last-seen state."""

    @staticmethod
    def _last_seen_key(user_id: str) -> str:
        """Build the Redis key caching a user's last-seen state."""
        return f"{LASTSEEN_KEY_PREFIX}{user_id}"

    async def get_user_presence(self, user_ids: list[str]) -> list[UserPresence]:
        """Return current online/offline presence and cached last-seen data."""
        results: list[UserPresence] = []
        now = int(time.time() * 1000)

        for user_id in user_ids:
            if await connection_registry.has_live_connections(user_id):
                results.append(
                    UserPresence(
                        user_id=user_id,
                        status=PresenceStatus.ONLINE,
                        last_seen=None,
                        updated_at=now,
                    )
                )
                continue

            cache = await self._get_last_seen(user_id)

            results.append(
                UserPresence(
                    user_id=user_id,
                    status=PresenceStatus.OFFLINE,
                    last_seen=cache.last_seen_at if cache else None,
                    updated_at=cache.updated_at if cache else now,
                )
            )

        return results

    async def handle_disconnect(
        self,
        connection_id: str,
        user_id: str,
    ) -> UserPresence | None:
        """Handle disconnect and create an offline transition when needed."""
        await connection_registry.deregister(connection_id, user_id)

        if await connection_registry.has_live_connections(user_id):
            return None

        now = int(time.time() * 1000)

        await self._set_last_seen(
            user_id=user_id,
            last_seen_at=now,
            updated_at=now,
        )

        return UserPresence(
            user_id=user_id,
            status=PresenceStatus.OFFLINE,
            last_seen=now,
            updated_at=now,
        )

    async def _get_last_seen(self, user_id: str) -> LastSeenCache | None:
        """Fetch a user's last-seen data, falling back to the DB on a cache miss."""
        data = await redis_client.hgetall(self._last_seen_key(user_id))

        if data:
            return LastSeenCache(**data)

        cache = await self._get_last_seen_from_db(user_id)
        if cache is not None:
            await self._cache_last_seen(user_id, cache)

        return cache

    async def _set_last_seen(
        self,
        user_id: str,
        last_seen_at: int,
        updated_at: int,
    ) -> None:
        """Persist a user's last-seen timestamp to the DB and refresh the cache."""
        cache = LastSeenCache(last_seen_at=last_seen_at, updated_at=updated_at)

        await self._upsert_last_seen_db(user_id, cache)
        await self._cache_last_seen(user_id, cache)

    async def _cache_last_seen(self, user_id: str, cache: LastSeenCache) -> None:
        """Write a user's last-seen data into Redis with a TTL."""
        key = self._last_seen_key(user_id)

        async with redis_client.pipeline() as pipe:
            pipe.hset(key, mapping=cache.model_dump(mode="json"))
            pipe.expire(key, LASTSEEN_CACHE_TTL_SECONDS)
            await pipe.execute()

    async def _get_last_seen_from_db(self, user_id: str) -> LastSeenCache | None:
        """Read a user's durable last-seen record from Postgres."""
        async with AsyncSessionLocal() as session:
            row = await session.scalar(
                select(LastSeen).where(LastSeen.user_id == user_id)
            )

        if row is None:
            return None

        return LastSeenCache(last_seen_at=row.last_seen_at, updated_at=row.updated_at)

    async def _upsert_last_seen_db(self, user_id: str, cache: LastSeenCache) -> None:
        """Upsert a user's last-seen record in Postgres."""
        stmt = pg_insert(LastSeen).values(
            user_id=user_id,
            last_seen_at=cache.last_seen_at,
            updated_at=cache.updated_at,
        )
        stmt = stmt.on_conflict_do_update(
            index_elements=[LastSeen.user_id],
            set_={
                "last_seen_at": stmt.excluded.last_seen_at,
                "updated_at": stmt.excluded.updated_at,
            },
        )

        async with AsyncSessionLocal() as session:
            await session.execute(stmt)
            await session.commit()


presence_manager = PresenceManager()
presence_watcher_registry = PresenceWatcherRegistry()