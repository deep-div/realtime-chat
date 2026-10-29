from contextlib import asynccontextmanager

from fastapi import FastAPI

from app.api.router import api_router
from app.clients.firebase import init_firebase


@asynccontextmanager
async def lifespan(app: FastAPI):
    init_firebase()
    yield


app = FastAPI(lifespan=lifespan)
app.include_router(api_router)

# python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000