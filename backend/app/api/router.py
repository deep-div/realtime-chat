from fastapi import APIRouter

from app.api.endpoints import sockets

api_router = APIRouter()
api_router.include_router(sockets.router, tags=["Web Socket"])
