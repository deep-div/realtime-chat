import time
import uuid

from fastapi import APIRouter, WebSocket, WebSocketDisconnect, status
from firebase_admin import auth as firebase_auth

from app.api.endpoints.connections import (
    deliver_backlog,
    deliver_message,
    notify_read,
    notify_watchers,
)
from app.clients.postgre import AsyncSessionLocal
from app.core.config import settings
from app.core.logging import logger
from app.services.chat.store import ChatNotFoundError, NotAMemberError
from app.services.messaging.schema import MessageAck, MessageStatus, SendMessage
from app.services.messaging.store import MessageNotFoundError, message_store
from app.services.presence.connection_registry import connection_registry
from app.services.presence.store import presence_store
from app.services.presence.schema import (
    CONNECTION_TTL_SECONDS,
    ClientHandshake,
    ConnectionRegistry,
)
from app.services.presence.store import presence_watcher_registry

router = APIRouter()

@router.get(
    "/ws/docs",
    summary="WebSocket protocol reference (not a real endpoint)",
)
async def websocket_docs() -> dict:
    return {"status": "ok", "detail": "Reference only, connect to /ws via WebSocket."}

# Live WebSocket objects for connections on this process, keyed by connection_id.
# Redis knows *that* a connection exists; only the process holding it can push to it.
local_connections: dict[str, WebSocket] = {}


@router.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket) -> None:
    """Accept a client socket, register its presence, and keep it alive via heartbeats."""
    await websocket.accept()

    handshake_payload = await websocket.receive_json()
    handshake = ClientHandshake(**handshake_payload)

    if settings.DISABLE_AUTH:
        handshake.user_id = settings.DEV_USER_ID
    else:
        try:
            decoded = firebase_auth.verify_id_token(handshake.id_token)
        except Exception:
            logger.error("socket handshake rejected: invalid or expired id_token")
            await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
            return
        if not decoded.get("email_verified", False):
            logger.error("socket handshake rejected: email not verified")
            await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
            return
        handshake.user_id = decoded["uid"]

    connection_id = str(uuid.uuid4())
    connected_at = int(time.time() * 1000)

    conn = ConnectionRegistry.from_handshake(
        handshake=handshake,
        server_id=settings.SERVER_ID,
        connection_id=connection_id,
        connected_at=connected_at,
    )
    try:
        await connection_registry.register(conn)
    except Exception:
        logger.error(f"connection registration failed for user={handshake.user_id}, closing socket")
        await websocket.close(code=status.WS_1011_INTERNAL_ERROR)
        return

    local_connections[connection_id] = websocket
    logger.info(f"connection registered: {connection_id} user={handshake.user_id}")

    await websocket.send_json({
        "type": "handshake_ack",
        "connection_id": connection_id,
        "server_id": settings.SERVER_ID,
        "heartbeat_interval_seconds": CONNECTION_TTL_SECONDS // 3,
        "ttl_seconds": CONNECTION_TTL_SECONDS,
    })

    async with AsyncSessionLocal() as session:
        await deliver_backlog(session, handshake.user_id, websocket, local_connections)
    await connection_registry.mark_ready(connection_id)

    try:
        while True:
            message = await websocket.receive_json()
            if message.get("type") == "heartbeat":
                await connection_registry.heartbeat(connection_id)
            elif message.get("type") == "get_presence":
                users = await presence_store.get_user_presence(message["user_ids"])
                await websocket.send_json({
                    "event": "presence",
                    "users": [user.model_dump(mode="json") for user in users],
                })
            elif message.get("type") == "subscribe_presence":
                await presence_watcher_registry.watch_users(connection_id, message["user_ids"])
            elif message.get("type") == "unsubscribe_presence":
                await presence_watcher_registry.unwatch_users(connection_id, message["user_ids"])
            elif message.get("type") == "send_message":
                request = SendMessage(**message)
                async with AsyncSessionLocal() as session:
                    try:
                        chat_message = await message_store.send_message(
                            session, handshake.user_id, request
                        )
                    except ChatNotFoundError:
                        await websocket.send_json({
                            "type": "message_error",
                            "client_message_id": request.client_message_id,
                            "error": "chat not found",
                        })
                    except NotAMemberError:
                        await websocket.send_json({
                            "type": "message_error",
                            "client_message_id": request.client_message_id,
                            "error": "not a member of this chat",
                        })
                    else:
                        # Single tick: tell the sender their message is durably stored.
                        await websocket.send_json({
                            "type": "message_status",
                            "status": MessageStatus.SENT.value,
                            "message": chat_message.model_dump(mode="json"),
                        })
                        await deliver_message(session, chat_message, websocket, local_connections)
            elif message.get("type") == "message_ack":
                ack = MessageAck(**message)
                async with AsyncSessionLocal() as session:
                    try:
                        await message_store.mark_read(
                            session, handshake.user_id, ack.chat_id, ack.message_id
                        )
                    except NotAMemberError:
                        await websocket.send_json({
                            "type": "message_error",
                            "message_id": ack.message_id,
                            "error": "not a member of this chat",
                        })
                    except MessageNotFoundError:
                        await websocket.send_json({
                            "type": "message_error",
                            "message_id": ack.message_id,
                            "error": "message not found",
                        })
                    else:
                        # Blue tick: tell the other chat members this message has been read.
                        await notify_read(
                            session, ack.chat_id, ack.message_id, handshake.user_id, local_connections
                        )
    except WebSocketDisconnect:
        local_connections.pop(connection_id, None)
        await presence_watcher_registry.clear_connection(connection_id)

        offline_presence = await presence_store.handle_disconnect(connection_id, handshake.user_id)
        if offline_presence is not None:
            await notify_watchers(handshake.user_id, offline_presence, local_connections)

        logger.info(f"connection deregistered: {connection_id} user={handshake.user_id}")
        