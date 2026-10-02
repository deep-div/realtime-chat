import time
import uuid

from fastapi import APIRouter, WebSocket, WebSocketDisconnect

from app.core.config import settings
from app.core.logging import logger
from app.services.presence.connection_registry import connection_registry
from app.services.presence.user_presence import presence_manager
from app.services.presence.schema import (
    CONNECTION_TTL_SECONDS,
    ClientHandshake,
    ConnectionRegistry,
    UserPresence,
)
from app.services.presence.user_presence import presence_watcher_registry

router = APIRouter()

# Live WebSocket objects for connections on this process, keyed by connection_id.
# Redis knows *that* a connection exists; only the process holding it can push to it.
local_connections: dict[str, WebSocket] = {}


async def notify_watchers(user_id: str, presence: UserPresence) -> None:
    """Push a presence update to every connection (on this server) watching this user."""
    watcher_ids = await presence_watcher_registry.get_user_watchers(user_id)
    payload = {"event": "presence_update", "users": [presence.model_dump(mode="json")]}
    for watcher_id in watcher_ids:
        watcher_socket = local_connections.get(watcher_id)
        if watcher_socket is not None:
            await watcher_socket.send_json(payload)

@router.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket) -> None:
    """Accept a client socket, register its presence, and keep it alive via heartbeats."""
    await websocket.accept()

    handshake_payload = await websocket.receive_json()
    handshake = ClientHandshake(**handshake_payload)

    connection_id = str(uuid.uuid4())
    connected_at = int(time.time() * 1000)

    conn = ConnectionRegistry.from_handshake(
        handshake=handshake,
        server_id=settings.SERVER_ID,
        connection_id=connection_id,
        connected_at=connected_at,
    )
    await connection_registry.register(conn)
    local_connections[connection_id] = websocket
    logger.info(f"connection registered: {connection_id} user={handshake.user_id}")

    await websocket.send_json({
        "type": "handshake_ack",
        "connection_id": connection_id,
        "server_id": settings.SERVER_ID,
        "heartbeat_interval_seconds": CONNECTION_TTL_SECONDS // 3,
        "ttl_seconds": CONNECTION_TTL_SECONDS,
    })

    try:
        while True:
            message = await websocket.receive_json()
            if message.get("type") == "heartbeat":
                await connection_registry.heartbeat(connection_id)
            elif message.get("type") == "get_presence":
                users = await presence_manager.get_user_presence(message["user_ids"])
                await websocket.send_json({
                    "event": "presence",
                    "users": [user.model_dump(mode="json") for user in users],
                })
            elif message.get("type") == "subscribe_presence":
                await presence_watcher_registry.watch_users(connection_id, message["user_ids"])
            elif message.get("type") == "unsubscribe_presence":
                await presence_watcher_registry.unwatch_users(connection_id, message["user_ids"])
    except WebSocketDisconnect:
        local_connections.pop(connection_id, None)
        await presence_watcher_registry.clear_connection(connection_id)

        offline_presence = await presence_manager.handle_disconnect(connection_id, handshake.user_id)
        if offline_presence is not None:
            await notify_watchers(handshake.user_id, offline_presence)

        logger.info(f"connection deregistered: {connection_id} user={handshake.user_id}")
        