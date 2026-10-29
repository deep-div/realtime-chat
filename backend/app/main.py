from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.router import api_router
from app.clients.firebase import init_firebase
from app.clients.storage import ensure_avatar_bucket_exists
from app.core.config import settings


@asynccontextmanager
async def lifespan(app: FastAPI):
    init_firebase()
    ensure_avatar_bucket_exists()
    yield


app = FastAPI(lifespan=lifespan)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.include_router(api_router)

# python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000