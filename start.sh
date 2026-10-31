#!/usr/bin/env bash
set -euo pipefail

cd /app/backend

if [ -n "${FIREBASE_CREDENTIALS_JSON:-}" ]; then
  mkdir -p ./secrets
  echo "${FIREBASE_CREDENTIALS_JSON}" > ./secrets/firebase-adminsdk.json
fi

mkdir -p alembic/versions
if [ -z "$(find alembic/versions -maxdepth 1 -name '*.py' -print -quit 2>/dev/null)" ]; then
  alembic revision --autogenerate -m "create schema"
fi
alembic upgrade head

REDIS_PID=""
if [ "${REDIS_HOST:-localhost}" = "localhost" ] || [ "${REDIS_HOST:-localhost}" = "127.0.0.1" ]; then
  redis-server --daemonize no --bind 127.0.0.1 --port "${REDIS_PORT:-6379}" &
  REDIS_PID=$!
fi

uvicorn app.main:app --host 127.0.0.1 --port 8000 &
UVICORN_PID=$!

nginx -g 'daemon off;' &
NGINX_PID=$!

PIDS="$UVICORN_PID $NGINX_PID"
[ -n "$REDIS_PID" ] && PIDS="$PIDS $REDIS_PID"

trap 'kill -TERM $PIDS 2>/dev/null; exit 0' TERM INT

wait -n $PIDS
EXIT_CODE=$?

kill -TERM $PIDS 2>/dev/null || true
exit $EXIT_CODE
