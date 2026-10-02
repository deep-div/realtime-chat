from __future__ import annotations

import time

from app.clients.redis import redis_client
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
        """Store a new connection hash, set its TTL, and index it under its user."""
        mapping = conn.model_dump(mode="json", exclude={"handshake"})
        mapping.update(conn.handshake.model_dump(mode="json"))

        async with redis_client.pipeline() as pipe:
            pipe.hset(self._conn_key(conn.connection_id), mapping=mapping)
            pipe.expire(self._conn_key(conn.connection_id), conn.ttl_seconds)
            pipe.sadd(self._user_key(conn.handshake.user_id), conn.connection_id)
            await pipe.execute()

    async def heartbeat(self, connection_id: str, ttl_seconds: int = CONNECTION_TTL_SECONDS) -> None:
        """Refresh a connection's last heartbeat timestamp and TTL."""
        key = self._conn_key(connection_id)
        async with redis_client.pipeline() as pipe:
            pipe.hset(key, "last_heartbeat_at", int(time.time() * 1000))
            pipe.expire(key, ttl_seconds)
            await pipe.execute()

    async def mark_ready(self, connection_id: str) -> None:
        """Flip a connection's sync_state to ready once backlog delivery finishes."""
        await redis_client.hset(
            self._conn_key(connection_id),
            "sync_state",
            SyncState.READY.value,
        )

    async def get_connection(self, connection_id: str) -> ConnectionRegistry | None:
        """Fetch one connection's state, or None if it has expired or never existed."""
        data = await redis_client.hgetall(self._conn_key(connection_id))
        if not data:
            return None
        return self._to_model(data)

    async def get_connections_for_user(self, user_id: str) -> list[ConnectionRegistry]:
        """Fetch all live connections for a user, pruning any that have expired."""
        user_key = self._user_key(user_id)
        connection_ids = await redis_client.smembers(user_key)
        if not connection_ids:
            return []

        async with redis_client.pipeline() as pipe:
            for connection_id in connection_ids:
                pipe.hgetall(self._conn_key(connection_id))
            results = await pipe.execute()

        connections: list[ConnectionRegistry] = []
        stale_ids = []
        for connection_id, data in zip(connection_ids, results):
            if not data:
                stale_ids.append(connection_id)
                continue
            connections.append(self._to_model(data))

        if stale_ids:
            await redis_client.srem(user_key, *stale_ids)

        return connections

    async def has_live_connections(self, user_id: str) -> bool:
        """Check whether a user currently has any live connection (i.e. is online)."""
        return await redis_client.scard(self._user_key(user_id)) > 0

    async def deregister(self, connection_id: str, user_id: str) -> None:
        """Remove a connection on clean socket close."""
        async with redis_client.pipeline() as pipe:
            pipe.delete(self._conn_key(connection_id))
            pipe.srem(self._user_key(user_id), connection_id)
            await pipe.execute()

    def _to_model(self, data: dict) -> ConnectionRegistry:
        """Rebuild a ConnectionRegistry from a raw Redis hash."""
        handshake_data = {k: v for k, v in data.items() if k in _HANDSHAKE_FIELDS}
        conn_data = {k: v for k, v in data.items() if k not in _HANDSHAKE_FIELDS}
        return ConnectionRegistry(**conn_data, handshake=ClientHandshake(**handshake_data))


connection_registry = ConnectionRegistryRepository()