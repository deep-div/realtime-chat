# Realtime Chat — Backend

FastAPI backend for the realtime chat application, providing REST APIs and WebSocket connections for chat, messaging, presence, and user management.

## Tech Stack

- **FastAPI** — web framework
- **PostgreSQL** (via SQLAlchemy + asyncpg/psycopg2) — primary database
- **Alembic** — database migrations
- **Redis** — caching / presence / pub-sub
- **Supabase** — storage (avatars) and auth helpers
- **Firebase Admin** — push notifications / auth
- **WebSockets** — realtime chat connections

## Project Structure

```
backend/
├── app/
│   ├── main.py              # FastAPI app entrypoint
│   ├── api/
│   │   ├── router.py        # API router aggregation
│   │   ├── deps.py          # Shared dependencies
│   │   └── endpoints/       # chats, connections, health, sockets, users
│   ├── clients/             # firebase, postgres, redis, storage clients
│   ├── core/                # config, logging
│   └── services/
│       ├── chat/
│       ├── messaging/
│       ├── presence/
│       └── users/
├── alembic/                 # database migrations
├── scripts/                 # utility scripts
├── secrets/                 # local secrets (not committed)
└── requirements.txt
```

## Setup

1. Create and activate a virtual environment:
   ```bash
   python -m venv venv
   venv\Scripts\activate   # Windows
   ```

2. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```

3. Configure environment variables (database URL, Redis URL, Firebase/Supabase credentials, CORS origins, etc.) — see `app/core/config.py` for required settings.

4. Run database migrations:
   ```bash
   alembic upgrade head
   ```

## Running the Server

```bash
python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

## Migrations

Create a new migration:
```bash
alembic revision --autogenerate -m "description"
```

Apply migrations:
```bash
alembic upgrade head
```
