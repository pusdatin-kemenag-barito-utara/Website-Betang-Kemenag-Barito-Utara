# Frontend SI BETANG (E-Arsip) - Astro SSR
# Build context = root repo (membaca workspace root package.json).
FROM node:22-alpine AS build

WORKDIR /app

# Salin manifest workspace agar npm workspace root ikut terbaca
COPY package.json package-lock.json ./
COPY frontend/package.json ./frontend/package.json

RUN npm ci --workspace=betang-kemenag-frontend --include-workspace-root

COPY frontend/ ./frontend/

# Build produksi Astro
RUN npm run build --workspace=betang-kemenag-frontend

# --- Stage produksi ---
FROM node:22-alpine AS runtime

WORKDIR /app

ENV NODE_ENV=production
ENV HOST=0.0.0.0
ENV PORT=3000

# Salin hasil build + node_modules (produksi)
COPY --from=build /app/frontend/dist ./dist
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/frontend/package.json ./package.json

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD wget -qO- http://localhost:3000/api/health || exit 1

CMD ["node", "./dist/server/entry.mjs"]