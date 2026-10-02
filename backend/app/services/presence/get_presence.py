from __future__ import annotations

import time

from app.clients.redis import redis_client
from app.services.presence.connection_registry import connection_registry
from app.services.presence.schema import (
    LASTSEEN_CACHE_TTL_SECONDS,
    LastSeenCache,
    PresenceStatus,
    UserPresence,
)

LASTSEEN_KEY_PREFIX = "presence:lastseen:"


class GetPresence:
    """Composes online/offline status with cached last-seen facts for user-facing presence."""

    @staticmethod
    def _lastseen_key(user_id: str) -> str:
        """Build the Redis hash key caching a user's last-seen fact."""
        return f"{LASTSEEN_KEY_PREFIX}{user_id}"

    async def get_presence(self, user_ids: list[str]) -> list[UserPresence]:
        """Build presence for each requested user: online from live connections, else cached last-seen."""
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

    async def handle_disconnect(self, connection_id: str, user_id: str) -> None:
        """Deregister a connection, and if it was the user's last one, cache the offline transition."""
        await connection_registry.deregister(connection_id, user_id)

        if not await connection_registry.has_live_connections(user_id):
            now = int(time.time() * 1000)
            await self._set_last_seen(user_id, last_seen_at=now, updated_at=now)

    async def _get_last_seen(self, user_id: str) -> LastSeenCache | None:
        """Fetch a user's cached last-seen fact, or None if never cached or expired."""
        data = await redis_client.hgetall(self._lastseen_key(user_id))
        if not data:
            return None
        return LastSeenCache(**data)

    async def _set_last_seen(self, user_id: str, last_seen_at: int, updated_at: int) -> None:
        """Write a user's last-seen fact to the cache, refreshing its TTL."""
        key = self._lastseen_key(user_id)
        cache = LastSeenCache(last_seen_at=last_seen_at, updated_at=updated_at)
        async with redis_client.pipeline() as pipe:
            pipe.hset(key, mapping=cache.model_dump(mode="json"))
            pipe.expire(key, LASTSEEN_CACHE_TTL_SECONDS)
            await pipe.execute()


get_presence = GetPresence()
