#!/bin/sh
set -e

API_DOMAIN="${INFISICAL_API_URL:-${INFISICAL_HOST_URL:-https://app.infisical.com/api}}"
ENV_TARGET="${INFISICAL_ENV:-prod}"
PROJECT_ID="${INFISICAL_PROJECT_ID}"
CLIENT_ID="${INFISICAL_CLIENT_ID:-$INFISICAL_UNIVERSAL_AUTH_CLIENT_ID}"
CLIENT_SECRET="${INFISICAL_CLIENT_SECRET:-$INFISICAL_UNIVERSAL_AUTH_CLIENT_SECRET}"
SECRET_PATH="${INFISICAL_SECRET_PATH:-/betang-kemenag}"

# Pastikan API_DOMAIN berakhiran /api untuk Infisical CLI
case "$API_DOMAIN" in
    */api) ;;
    *) API_DOMAIN="${API_DOMAIN%/}/api" ;;
esac

TOKEN="$INFISICAL_TOKEN"

# Login mesin headless menggunakan Universal Auth untuk mendapatkan Identity Access Token
if [ -z "$TOKEN" ] && [ -n "$CLIENT_ID" ] && [ -n "$CLIENT_SECRET" ]; then
    echo "[ENTRYPOINT] Melakukan autentikasi mesin ke Infisical via Universal Auth ($API_DOMAIN)..."
    TOKEN=$(infisical login --method=universal-auth --client-id="$CLIENT_ID" --client-secret="$CLIENT_SECRET" --domain="$API_DOMAIN" --plain --silent 2>/dev/null || true)
fi

if [ -n "$TOKEN" ]; then
    PROJECT_ARG=""
    if [ -n "$PROJECT_ID" ]; then
        PROJECT_ARG="--projectId=$PROJECT_ID"
    fi
    echo "[ENTRYPOINT] Kredensial Infisical valid. Menginjeksi secrets dari path: $SECRET_PATH (env: $ENV_TARGET)..."
    exec infisical run --token="$TOKEN" --domain="$API_DOMAIN" --env="$ENV_TARGET" $PROJECT_ARG --silent --path="$SECRET_PATH" -- "$@"
else
    echo "[ENTRYPOINT] Infisical token tidak tersedia, melanjutkan proses dengan environment container..."
    exec "$@"
fi
