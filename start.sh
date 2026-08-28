#!/bin/sh
set -e

echo "=== Memulai SI BETANG Enterprise Production Monorepo ==="

# Pastikan port frontend dan backend terpisah secara eksplisit
FE_PORT="${PORT:-3000}"
BE_PORT="${BACKEND_PORT:-8080}"

# 1. Jalankan Go Fiber v3 Backend di background pada port 8080
echo "[1/2] Menjalankan Go Fiber v3 Backend pada port $BE_PORT..."
BACKEND_PORT="$BE_PORT" PORT="$BE_PORT" /app/betang-api &
BACKEND_PID=$!

# Tunggu backend siap
sleep 1

# 2. Jalankan Frontend Astro v7 SSR di background pada port 3000
echo "[2/2] Menjalankan Astro v7 SSR Frontend pada port $FE_PORT..."
HOST="0.0.0.0" PORT="$FE_PORT" BACKEND_INTERNAL_URL="http://127.0.0.1:$BE_PORT" node /app/frontend/dist/server/entry.mjs &
FRONTEND_PID=$!

# Tangani graceful shutdown (SIGTERM / SIGINT)
trap "echo 'Mematikan container secara aman...'; kill -TERM $BACKEND_PID $FRONTEND_PID 2>/dev/null; wait" TERM INT

# Tunggu proses
wait -n $BACKEND_PID $FRONTEND_PID
exit $?
