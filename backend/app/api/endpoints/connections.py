from fastapi import WebSocket

from app.services.messaging.schema import ChatMessage, MessageStatus
from app.services.messaging.store import message_store
from app.services.presence.connection_registry import connection_registry
from app.services.presence.schema import UserPresence
from app.services.presence.user_presence import presence_watcher_registry


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
            await watcher_socket.send_json(payload)


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
        for conn in connections:
            recipient_socket = local_connections.get(conn.connection_id)
            if recipient_socket is not None:
                await recipient_socket.send_json({
                    "event": "new_message",
                    "message": chat_message.model_dump(mode="json"),
                })
                delivered = True

    if delivered:
        # Grey double tick: delivered to at least one recipient's device, not yet read.
        await sender_socket.send_json({
            "type": "message_status",
            "message_id": chat_message.message_id,
            "status": MessageStatus.DELIVERED.value,
        })


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
        connections = await connection_registry.get_connections_for_user(recipient_id)
        for conn in connections:
            recipient_socket = local_connections.get(conn.connection_id)
            if recipient_socket is not None:
                await recipient_socket.send_json({
                    "type": "message_status",
                    "message_id": message_id,
                    "status": MessageStatus.READ.value,
                })
