# ==============================================================================
# Unified Production Multi-Stage Dockerfile for SI BETANG
# (Go Fiber v3 Backend + Astro v7 SSR Frontend)
# Referensi: Standar Arsitektur SI MANDAU & PUSDATIN Kemenag
# ==============================================================================

# --- Stage 1: Build Backend Go ---
FROM golang:alpine AS backend-builder
WORKDIR /build/backend
RUN apk add --no-cache git ca-certificates tzdata
COPY backend/go.mod backend/go.sum* ./
RUN go mod download
COPY backend/ ./
RUN CGO_ENABLED=0 GOOS=linux go build -ldflags="-s -w" -trimpath -o /build/bin/betang-api ./cmd/api

# --- Stage 2: Build Frontend Astro ---
FROM node:22-alpine AS frontend-builder
WORKDIR /build
COPY package.json package-lock.json ./
COPY frontend/package.json ./frontend/package.json
RUN npm ci --workspace=betang-kemenag-frontend --include-workspace-root
COPY frontend/ ./frontend/
ENV ASTRO_TELEMETRY_DISABLED=1
ENV NODE_ENV=production
RUN npm run build --workspace=betang-kemenag-frontend

# --- Stage 3: Production Runtime ---
FROM node:22-alpine AS runtime

RUN apk add --no-cache ca-certificates tzdata wget curl bash
ENV TZ=Asia/Jakarta

WORKDIR /app

ENV NODE_ENV=production
ENV HOST=0.0.0.0
ENV PORT=3000
ENV BACKEND_PORT=8080
ENV BACKEND_INTERNAL_URL=http://127.0.0.1:8080

# Salin biner backend Go
COPY --from=backend-builder /build/bin/betang-api /app/betang-api
RUN chmod +x /app/betang-api

# Salin package.json frontend dan install dependensi produksi bersih di /app
COPY --from=frontend-builder /build/frontend/package.json /app/package.json
COPY --from=frontend-builder /build/package-lock.json /app/package-lock.json
RUN npm install --omit=dev --no-audit && npm cache clean --force

# Salin hasil build Astro SSR ke /app/dist
COPY --from=frontend-builder /build/frontend/dist /app/dist

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD wget -qO- http://localhost:3000/api/health || exit 1

CMD ["sh", "-c", "/app/betang-api & node /app/dist/server/entry.mjs"]
