from fastapi import WebSocket
from starlette.websockets import WebSocketDisconnect

from app.core.logging import logger
from app.services.messaging.schema import ChatMessage, MessageStatus
from app.services.messaging.store import message_store
from app.services.presence.connection_registry import connection_registry
from app.services.presence.schema import UserPresence
from app.services.presence.store import presence_watcher_registry


async def _safe_send_json(socket: WebSocket, payload: dict) -> bool:
    """Send to a socket that may have closed concurrently; never raise.

    local_connections is only pruned by each connection's own disconnect handler,
    so a socket that is mid-close (another request just sent its close frame but
    hasn't run its cleanup yet) can still be present here. Treat a closed/dead
    socket as a missed delivery instead of letting it crash the caller's task.
    """
    try:
        await socket.send_json(payload)
    except (WebSocketDisconnect, RuntimeError):
        logger.info("skipped push to a socket that was already closing")
        return False
    return True


async def notify_watchers(
    user_id: str,
    presence: UserPresence,
    local_connections: dict[str, WebSocket],
) -> None:
    """Push a presence update to every connection (on this server) watching this user."""
    watcher_ids = await presence_watcher_registry.get_user_watchers(user_id)
    payload = {"event": "presence_update", "users": [presence.model_dump(mode="json")]}
    for watcher_id in watcher_ids:
        watcher_socket = local_connections.get(watcher_id)
        if watcher_socket is not None:
            await _safe_send_json(watcher_socket, payload)


async def notify_status(
    user_id: str,
    message_id: str,
    status: MessageStatus,
    local_connections: dict[str, WebSocket],
) -> None:
    """Push a message_status update to every live connection (on this process) a user has."""
    connections = await connection_registry.get_connections_for_user(user_id)
    for conn in connections:
        socket = local_connections.get(conn.connection_id)
        if socket is not None:
            await _safe_send_json(socket, {
                "type": "message_status",
                "message_id": message_id,
                "status": status.value,
            })


async def notify_typing(
    chat_id: str,
    user_id: str,
    is_typing: bool,
    recipient_ids: list[str],
    local_connections: dict[str, WebSocket],
) -> None:
    """Push a typing_update to a chat's other members, for whichever are connected to this process."""
    payload = {
        "event": "typing_update",
        "chat_id": chat_id,
        "user_id": user_id,
        "is_typing": is_typing,
    }
    for recipient_id in recipient_ids:
        connections = await connection_registry.get_connections_for_user(recipient_id)
        for conn in connections:
            socket = local_connections.get(conn.connection_id)
            if socket is not None:
                await _safe_send_json(socket, payload)


async def notify_membership_change(
    event: str,
    chat_id: str,
    member_user_id: str,
    recipient_ids: list[str],
    local_connections: dict[str, WebSocket],
) -> None:
    """Push a member_added/member_removed update to a chat's members, for whichever are connected to this process."""
    payload = {"event": event, "chat_id": chat_id, "user_id": member_user_id}
    for recipient_id in recipient_ids:
        connections = await connection_registry.get_connections_for_user(recipient_id)
        for conn in connections:
            socket = local_connections.get(conn.connection_id)
            if socket is not None:
                await _safe_send_json(socket, payload)


async def notify_message_deleted(
    chat_id: str,
    message_ids: list[str],
    recipient_ids: list[str],
    local_connections: dict[str, WebSocket],
) -> None:
    """Push a message_deleted update to a chat's other members, for whichever are connected to this process."""
    payload = {"event": "message_deleted", "chat_id": chat_id, "message_ids": message_ids}
    for recipient_id in recipient_ids:
        connections = await connection_registry.get_connections_for_user(recipient_id)
        for conn in connections:
            socket = local_connections.get(conn.connection_id)
            if socket is not None:
                await _safe_send_json(socket, payload)


async def deliver_message(
    session,
    chat_message: ChatMessage,
    sender_socket: WebSocket,
    local_connections: dict[str, WebSocket],
) -> None:
    """Push a new message to its other online recipients on this process, and grey-tick the sender if any got it."""
    recipient_ids = await message_store.get_recipient_ids(
        session, chat_message.chat_id, chat_message.sender_id
    )

    delivered = False
    for recipient_id in recipient_ids:
        connections = await connection_registry.get_connections_for_user(recipient_id)
        recipient_delivered = False
        for conn in connections:
            recipient_socket = local_connections.get(conn.connection_id)
            if recipient_socket is not None:
                sent = await _safe_send_json(recipient_socket, {
                    "event": "new_message",
                    "message": chat_message.model_dump(mode="json"),
                })
                if sent:
                    delivered = True
                    recipient_delivered = True

        if recipient_delivered:
            await message_store.mark_delivered(session, recipient_id, [chat_message])

    if delivered:
        # Grey double tick: delivered to at least one recipient's device, not yet read.
        await _safe_send_json(sender_socket, {
            "type": "message_status",
            "message_id": chat_message.message_id,
            "status": MessageStatus.DELIVERED.value,
        })


async def deliver_backlog(
    session, user_id: str, websocket: WebSocket, local_connections: dict[str, WebSocket]
) -> None:
    """Push any messages user_id missed while offline, mark them delivered, and
    grey-tick each message's original sender if they're online right now."""
    missed = await message_store.get_undelivered_messages(session, user_id)
    if not missed:
        return

    for chat_message in missed:
        await websocket.send_json({
            "event": "new_message",
            "message": chat_message.model_dump(mode="json"),
        })

    await message_store.mark_delivered(session, user_id, missed)

    for chat_message in missed:
        await notify_status(
            chat_message.sender_id, chat_message.message_id, MessageStatus.DELIVERED, local_connections
        )


async def notify_read(
    session,
    chat_id: str,
    message_id: str,
    reader_id: str,
    local_connections: dict[str, WebSocket],
) -> None:
    """Push a blue-tick read status to the message's other chat members, if online on this process."""
    recipient_ids = await message_store.get_recipient_ids(session, chat_id, reader_id)
    for recipient_id in recipient_ids:
        await notify_status(recipient_id, message_id, MessageStatus.READ, local_connections)
