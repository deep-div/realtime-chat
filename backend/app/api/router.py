from fastapi import APIRouter

from app.api.endpoints import chats, health, sockets, users

api_router = APIRouter()
api_router.include_router(health.router, tags=["Health"])
api_router.include_router(sockets.router, tags=["Web Socket"])
api_router.include_router(chats.router, tags=["Chats"])
api_router.include_router(users.router, tags=["Users"])
