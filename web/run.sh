#!/usr/bin/env bash
set -e
ROOT="$(dirname "$0")/.."

echo "Starting backend server (production)..."
"$ROOT/.venv/bin/python" "$ROOT/backend/server.py" -p &
SERVER_PID=$!
sleep 2

echo "Starting frontend..."
cd "$(dirname "$0")"
npm run dev &
FRONTEND_PID=$!

trap "kill $SERVER_PID $FRONTEND_PID 2>/dev/null" EXIT
wait
