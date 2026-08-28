#!/bin/sh
set -e

echo "=== Memulai SI BETANG Enterprise Production Monorepo ==="

# 1. Jalankan Go Fiber v3 Backend di background
echo "[1/2] Menjalankan Go Fiber v3 Backend pada port ${BACKEND_PORT:-8080}..."
PORT=${BACKEND_PORT:-8080} /app/betang-api &
BACKEND_PID=$!

# Berikan waktu 1 detik agar backend siap menerima koneksi
sleep 1

# 2. Jalankan Frontend Astro v7 SSR di foreground
echo "[2/2] Menjalankan Astro v7 SSR Frontend pada port ${PORT:-3000}..."
HOST=${HOST:-0.0.0.0} PORT=${PORT:-3000} node /app/frontend/dist/server/entry.mjs &
FRONTEND_PID=$!

# Tangani graceful shutdown (SIGTERM / SIGINT)
trap "echo 'Mematikan container secara aman...'; kill -TERM $BACKEND_PID $FRONTEND_PID 2>/dev/null; wait" TERM INT

# Tunggu proses
wait -n $BACKEND_PID $FRONTEND_PID
exit $?
