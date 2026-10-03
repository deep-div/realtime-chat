from enum import Enum
from typing import Literal

from pydantic import BaseModel, Field


class ChatType(str, Enum):
    """Whether a chat is a 1:1 direct conversation or a multi-member group."""

    DIRECT = "direct"
    GROUP = "group"


class ChatRole(str, Enum):
    """A member's permission level within a chat. Direct chats only ever use MEMBER."""

    OWNER = "owner"
    ADMIN = "admin"
    MEMBER = "member"


class ChatMember(BaseModel):
    """One user's membership record within a chat."""

    chat_id: str
    user_id: str
    role: ChatRole = ChatRole.MEMBER
    joined_at: int
    muted_until: int | None = None


class Chat(BaseModel):
    """A conversation: either a 1:1 direct chat or a named group."""

    chat_id: str
    chat_type: ChatType
    title: str | None = None
    avatar_media_id: str | None = None
    created_by: str
    created_at: int


class MessageStatus(str, Enum):
    """A recipient's delivery state for one message."""

    SENT = "sent"
    DELIVERED = "delivered"
    READ = "read"


class MessagePartType(str, Enum):
    """The kind of content one message part carries."""

    TEXT = "text"
    IMAGE = "image"
    VIDEO = "video"
    AUDIO = "audio"
    FILE = "file"


class TextContent(BaseModel):
    """Plain text content for a TEXT message part."""

    text: str


class MediaContent(BaseModel):
    """Reference to an uploaded media object backing an IMAGE/VIDEO/AUDIO/FILE part."""

    media_id: str
    mime_type: str
    size_bytes: int
    width: int | None = None
    height: int | None = None
    duration_ms: int | None = None
    thumbnail_media_id: str | None = None


class MessagePart(BaseModel):
    """One block of a message's content; a message can carry several parts (e.g. caption + image)."""

    type: MessagePartType
    text: TextContent | None = None
    media: MediaContent | None = None


class Mention(BaseModel):
    """An @-mention of a user within a text part, by character offset."""

    user_id: str
    offset: int
    length: int


class ReplyRef(BaseModel):
    """Reference to the message being replied to, within the same chat."""

    message_id: str


class ForwardRef(BaseModel):
    """Reference to a message's original chat/message, when forwarded."""

    message_id: str
    chat_id: str


class PlainContent(BaseModel):
    """A message's content in the clear: its parts plus mentions/reply/forward refs."""

    kind: Literal["plain"] = "plain"
    parts: list[MessagePart]
    mentions: list[Mention] = Field(default_factory=list)
    reply_to: ReplyRef | None = None
    forwarded_from: ForwardRef | None = None


class EncryptedContent(BaseModel):
    """A PlainContent, serialized client-side and encrypted into one opaque blob.

    The server only ever stores/relays `ciphertext` — it never sees parts,
    mentions, or reply/forward refs for an encrypted message.
    """

    kind: Literal["encrypted"] = "encrypted"
    scheme: str
    ciphertext: str


class SendMessage(BaseModel):
    """Payload a client sends over the socket to send a message into a chat."""

    client_message_id: str
    chat_id: str
    content: PlainContent | EncryptedContent = Field(discriminator="kind")


class ChatMessage(BaseModel):
    """A persisted message, as pushed to recipients or returned during sync."""

    message_id: str
    chat_id: str
    sender_id: str
    sent_at: int
    client_message_id: str | None = None
    content: PlainContent | EncryptedContent = Field(discriminator="kind")
    edited_at: int | None = None
    deleted_at: int | None = None


class MessageAck(BaseModel):
    """Status update a client sends when it delivers or reads a message."""

    message_id: str
    status: MessageStatus


class MessageReceipt(BaseModel):
    """One recipient's delivery/read state for a message, stored per (message_id, user_id)."""

    message_id: str
    chat_id: str
    user_id: str
    status: MessageStatus
    updated_at: int
