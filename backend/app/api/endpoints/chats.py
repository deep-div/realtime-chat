from typing import Annotated

from fastapi import APIRouter, Depends, Header, HTTPException, status
from pydantic import Field
from sqlalchemy.ext.asyncio import AsyncSession

from app.clients.postgre import get_db
from app.services.chat.schema import (
    Chat,
    ChatCreated,
    ChatMember,
    CreateDirectChat,
    CreateGroupChat,
)
from app.services.chat.store import chat_store

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
