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


class CreateDirectChat(BaseModel):
    """Request to get-or-create the 1:1 chat between the caller and `recipient_id`."""

    chat_type: Literal[ChatType.DIRECT] = ChatType.DIRECT
    recipient_id: str


class CreateGroupChat(BaseModel):
    """Request to create a new named group chat with the given members."""

    chat_type: Literal[ChatType.GROUP] = ChatType.GROUP
    title: str
    member_ids: list[str] = Field(min_length=1)


CreateChat = CreateDirectChat | CreateGroupChat


class ChatCreated(BaseModel):
    """Response to a create_chat request: the resolved chat, new or pre-existing."""

    chat_id: str
    chat_type: ChatType
    title: str | None = None
    members: list[str]
    created_at: int
    already_existed: bool = False
