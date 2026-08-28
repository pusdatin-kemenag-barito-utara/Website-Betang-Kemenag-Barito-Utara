# ==============================================================================
# Unified Production Multi-Stage Dockerfile for SI BETANG
# (Go Fiber v3 Backend + Astro v7 SSR Frontend)
# ==============================================================================

# --- Stage 1: Build Backend Go ---
FROM golang:alpine AS backend-builder
WORKDIR /build/backend
COPY backend/go.mod backend/go.sum* ./
RUN go mod download
COPY backend/ ./
RUN CGO_ENABLED=0 GOOS=linux go build -ldflags="-s -w" -o /build/bin/betang-api ./cmd/api

# --- Stage 2: Build Frontend Astro ---
FROM node:22-alpine AS frontend-builder
WORKDIR /build
COPY package.json package-lock.json ./
COPY frontend/package.json ./frontend/package.json
RUN npm ci --workspace=betang-kemenag-frontend --include-workspace-root
COPY frontend/ ./frontend/
RUN npm run build --workspace=betang-kemenag-frontend

# --- Stage 3: Production Runtime ---
FROM node:22-alpine AS runtime

RUN apk add --no-cache ca-certificates wget bash

WORKDIR /app

ENV NODE_ENV=production
ENV HOST=0.0.0.0
ENV PORT=3000
ENV BACKEND_PORT=8080

# Salin biner backend Go
COPY --from=backend-builder /build/bin/betang-api /app/betang-api
RUN chmod +x /app/betang-api

# Salin hasil build Astro SSR dan dependensi produksi
COPY --from=frontend-builder /build/frontend/dist ./frontend/dist
COPY --from=frontend-builder /build/node_modules ./node_modules
COPY --from=frontend-builder /build/frontend/package.json ./frontend/package.json

# Salin script startup produksi
COPY start.sh /app/start.sh
RUN chmod +x /app/start.sh

EXPOSE 3000 8080

HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD wget -qO- http://localhost:3000/api/health || exit 1

CMD ["/app/start.sh"]
