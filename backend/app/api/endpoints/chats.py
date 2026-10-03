from typing import Annotated

from fastapi import APIRouter, Depends, Header, HTTPException, status
from pydantic import Field
from sqlalchemy.ext.asyncio import AsyncSession

from app.clients.postgre import get_db
from app.services.chat.schema import (
    AddMember,
    Chat,
    ChatCreated,
    ChatMember,
    CreateDirectChat,
    CreateGroupChat,
)
from app.services.chat.store import (
    AlreadyMemberError,
    ChatNotFoundError,
    InsufficientRoleError,
    NotAGroupChatError,
    NotAMemberError,
    chat_store,
)

router = APIRouter(prefix="/chats")


def get_current_user_id(x_user_id: str = Header(alias="X-User-Id")) -> str:
    """Resolve the requesting user's id. Stand-in until real session/token auth exists."""
    return x_user_id


@router.post("", response_model=ChatCreated, status_code=status.HTTP_201_CREATED)
async def create_chat(
    request: Annotated[CreateDirectChat | CreateGroupChat, Field(discriminator="chat_type")],
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
) -> ChatCreated:
    """Get-or-create a direct chat, or create a new group chat."""
    if isinstance(request, CreateDirectChat):
        return await chat_store.create_direct_chat(db, user_id, request)
    return await chat_store.create_group_chat(db, user_id, request)


@router.get("", response_model=list[Chat])
async def list_my_chats(
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
) -> list[Chat]:
    """List every chat the requesting user is a member of."""
    return await chat_store.list_my_chats(db, user_id)


@router.get("/{chat_id}", response_model=Chat)
async def get_chat(
    chat_id: str,
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
) -> Chat:
    """Fetch one chat's details. 404s if it doesn't exist or the caller isn't a member."""
    members = await chat_store.list_members(db, chat_id)
    if not any(member.user_id == user_id for member in members):
        raise HTTPException(status_code=404, detail="chat not found")

    chat = await chat_store.get_chat(db, chat_id)
    if chat is None:
        raise HTTPException(status_code=404, detail="chat not found")
    return chat


@router.get("/{chat_id}/members", response_model=list[ChatMember])
async def get_chat_members(
    chat_id: str,
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
) -> list[ChatMember]:
    """List every member of a chat. 404s if the caller isn't a member."""
    members = await chat_store.list_members(db, chat_id)
    if not any(member.user_id == user_id for member in members):
        raise HTTPException(status_code=404, detail="chat not found")
    return members


@router.post(
    "/{chat_id}/members", response_model=ChatMember, status_code=status.HTTP_201_CREATED
)
async def add_chat_member(
    chat_id: str,
    request: AddMember,
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
) -> ChatMember:
    """Add a user to a group chat. Requires the caller to be an OWNER/ADMIN."""
    try:
        return await chat_store.add_member(db, chat_id, user_id, request.user_id)
    except ChatNotFoundError:
        raise HTTPException(status_code=404, detail="chat not found")
    except NotAGroupChatError:
        raise HTTPException(status_code=400, detail="cannot add members to a direct chat")
    except NotAMemberError:
        raise HTTPException(status_code=404, detail="chat not found")
    except InsufficientRoleError:
        raise HTTPException(status_code=403, detail="only an owner or admin can add members")
    except AlreadyMemberError:
        raise HTTPException(status_code=409, detail="user is already a member")


@router.delete("/{chat_id}/members/{member_user_id}", status_code=status.HTTP_204_NO_CONTENT)
async def remove_chat_member(
    chat_id: str,
    member_user_id: str,
    user_id: str = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
) -> None:
    """Remove a user from a group chat, or leave it yourself."""
    try:
        await chat_store.remove_member(db, chat_id, user_id, member_user_id)
    except ChatNotFoundError:
        raise HTTPException(status_code=404, detail="chat not found")
    except NotAGroupChatError:
        raise HTTPException(status_code=400, detail="cannot remove members from a direct chat")
    except NotAMemberError:
        raise HTTPException(status_code=404, detail="chat or member not found")
    except InsufficientRoleError:
        raise HTTPException(status_code=403, detail="only an owner or admin can remove members")
