from __future__ import annotations

import time

from pydantic import ValidationError

from app.clients.redis import redis_client
from app.core.logging import logger
from app.services.presence.schema import (
    CONNECTION_TTL_SECONDS,
    ClientHandshake,
    ConnectionRegistry,
    SyncState,
)

CONN_KEY_PREFIX = "presence:conn:"
USER_KEY_PREFIX = "presence:user:"

_HANDSHAKE_FIELDS = set(ClientHandshake.model_fields)


class ConnectionRegistryRepository:
    """Reads and writes WebSocket connection presence state in Redis."""

    @staticmethod
    def _conn_key(connection_id: str) -> str:
        """Build the Redis hash key for a connection."""
        return f"{CONN_KEY_PREFIX}{connection_id}"

    @staticmethod
    def _user_key(user_id: str) -> str:
        """Build the Redis set key holding a user's live connection ids."""
        return f"{USER_KEY_PREFIX}{user_id}"

    async def register(self, conn: ConnectionRegistry) -> None:
        """Store a new connection hash, set its TTL, and index it under its user.

        Connection state lives only in Redis, so a failure here means the connection
        genuinely cannot be tracked - log and re-raise so the caller aborts the handshake.
        """
        mapping = conn.model_dump(mode="json", exclude={"handshake"})
        mapping.update(conn.handshake.model_dump(mode="json"))

        try:
            async with redis_client.pipeline() as pipe:
                pipe.hset(self._conn_key(conn.connection_id), mapping=mapping)
                pipe.expire(self._conn_key(conn.connection_id), conn.ttl_seconds)
                pipe.sadd(self._user_key(conn.handshake.user_id), conn.connection_id)
                await pipe.execute()
        except Exception:
            logger.error("connection registration failed, Redis unavailable", exc_info=True)
            raise

    async def heartbeat(self, connection_id: str, ttl_seconds: int = CONNECTION_TTL_SECONDS) -> None:
        """Refresh a connection's last heartbeat timestamp and TTL. Best-effort: a missed
        heartbeat just means the connection expires a little early, not a hard failure."""
        key = self._conn_key(connection_id)
        try:
            async with redis_client.pipeline() as pipe:
                pipe.hset(key, "last_heartbeat_at", int(time.time() * 1000))
                pipe.expire(key, ttl_seconds)
                await pipe.execute()
        except Exception:
            logger.warning("heartbeat refresh failed, Redis unavailable", exc_info=True)

    async def mark_ready(self, connection_id: str) -> None:
        """Flip a connection's sync_state to ready once backlog delivery finishes. Best-effort."""
        try:
            await redis_client.hset(
                self._conn_key(connection_id),
                "sync_state",
                SyncState.READY.value,
            )
        except Exception:
            logger.warning("sync_state update failed, Redis unavailable", exc_info=True)

    async def get_connection(self, connection_id: str) -> ConnectionRegistry | None:
        """Fetch one connection's state, or None if it has expired, never existed, or Redis is down."""
        try:
            data = await redis_client.hgetall(self._conn_key(connection_id))
        except Exception:
            logger.warning("connection lookup failed, Redis unavailable", exc_info=True)
            return None
        if not data:
            return None
        try:
            return self._to_model(data)
        except ValidationError:
            logger.warning(f"dropping malformed connection registry entry: {connection_id}")
            return None

    async def get_connections_for_user(self, user_id: str) -> list[ConnectionRegistry]:
        """Fetch all live connections for a user, pruning any that have expired.

        Returns an empty list on a Redis outage - callers treat that the same as
        "no live connections", which degrades delivery to offline-backlog, not a crash.
        """
        user_key = self._user_key(user_id)
        try:
            connection_ids = await redis_client.smembers(user_key)
            if not connection_ids:
                return []

            async with redis_client.pipeline() as pipe:
                for connection_id in connection_ids:
                    pipe.hgetall(self._conn_key(connection_id))
                results = await pipe.execute()
        except Exception:
            logger.warning("connection list fetch failed, Redis unavailable", exc_info=True)
            return []

        connections: list[ConnectionRegistry] = []
        stale_ids = []
        for connection_id, data in zip(connection_ids, results):
            if not data:
                stale_ids.append(connection_id)
                continue
            try:
                connections.append(self._to_model(data))
            except ValidationError:
                # Hash exists but is missing required fields (e.g. a partially-written or
                # torn-down entry) - treat it like a stale connection rather than crashing
                # the caller's whole socket loop over one corrupt record.
                logger.warning(f"dropping malformed connection registry entry: {connection_id}")
                stale_ids.append(connection_id)

        if stale_ids:
            try:
                await redis_client.srem(user_key, *stale_ids)
            except Exception:
                logger.warning("stale connection cleanup failed, Redis unavailable", exc_info=True)

        return connections

    async def has_live_connections(self, user_id: str) -> bool:
        """Check whether a user currently has any live connection (i.e. is online).

        Degrades to False on a Redis outage - worst case a user briefly shows offline.
        """
        try:
            return await redis_client.scard(self._user_key(user_id)) > 0
        except Exception:
            logger.warning("live-connection check failed, Redis unavailable", exc_info=True)
            return False

    async def deregister(self, connection_id: str, user_id: str) -> None:
        """Remove a connection on clean socket close. Best-effort: the TTL will expire
        a stuck entry eventually even if this call fails."""
        try:
            async with redis_client.pipeline() as pipe:
                pipe.delete(self._conn_key(connection_id))
                pipe.srem(self._user_key(user_id), connection_id)
                await pipe.execute()
        except Exception:
            logger.warning("connection deregistration failed, Redis unavailable", exc_info=True)

    def _to_model(self, data: dict) -> ConnectionRegistry:
        """Rebuild a ConnectionRegistry from a raw Redis hash."""
        handshake_data = {k: v for k, v in data.items() if k in _HANDSHAKE_FIELDS}
        conn_data = {k: v for k, v in data.items() if k not in _HANDSHAKE_FIELDS}
        return ConnectionRegistry(**conn_data, handshake=ClientHandshake(**handshake_data))


connection_registry = ConnectionRegistryRepository()