from fastapi import FastAPI

from app.api.router import api_router

app = FastAPI()
app.include_router(api_router)

# python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000