from enum import Enum
from typing import Literal

from pydantic import BaseModel


class MessageStatus(str, Enum):
    """A recipient's delivery state for one message."""

    SENT = "sent"  # single tick: stored in DB, not yet delivered to any recipient device
    DELIVERED = "delivered"  # grey double tick: reached at least one recipient device, unread
    READ = "read"  # blue double tick: recipient opened and viewed the message


class EncryptedContent(BaseModel):
    """A text message, encrypted client-side into one opaque blob.

    The server only ever stores/relays `ciphertext` — it never sees the plaintext.
    """

    scheme: str
    ciphertext: str


class SendMessage(BaseModel):
    """Payload a client sends over the socket to send a message into a chat."""

    client_message_id: str
    chat_id: str
    content: EncryptedContent


class ChatMessage(BaseModel):
    """A persisted message, as pushed to recipients or returned during sync."""

    message_id: str
    chat_id: str
    sender_id: str
    sent_at: int
    client_message_id: str | None = None
    content: EncryptedContent
    edited_at: int | None = None
    deleted_at: int | None = None


class MessageAck(BaseModel):
    """Sent by a client when it reads a message. Delivery is inferred server-side, not acked."""

    chat_id: str
    message_id: str
    status: Literal[MessageStatus.READ] = MessageStatus.READ


class MessageReceipt(BaseModel):
    """One recipient's delivery/read state for a message, stored per (message_id, user_id)."""

    message_id: str
    chat_id: str
    user_id: str
    status: MessageStatus
    updated_at: int
