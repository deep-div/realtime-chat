import time
import uuid

from fastapi import APIRouter, WebSocket, WebSocketDisconnect

from app.core.config import settings
from app.core.logging import logger
from app.services.presence.connection_registry import connection_registry
from app.services.presence.schema import (
    CONNECTION_TTL_SECONDS,
    ClientHandshake,
    ConnectionRegistry,
)

router = APIRouter()

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
    except WebSocketDisconnect:
        await connection_registry.deregister(connection_id, handshake.user_id)
        logger.info(f"connection deregistered: {connection_id} user={handshake.user_id}")
