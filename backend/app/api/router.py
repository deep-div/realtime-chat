from fastapi import APIRouter

from app.api.endpoints import chats, sockets

api_router = APIRouter()
api_router.include_router(sockets.router, tags=["Web Socket"])
api_router.include_router(chats.router, tags=["Chats"])
