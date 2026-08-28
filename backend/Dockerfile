# Tahap build: kompilasi biner Go.
FROM golang:alpine AS builder

WORKDIR /app

# Salin modul dan unduh dependensi terlebih dahulu (cache layer).
COPY go.mod go.sum* ./
RUN go mod download

# Salin seluruh kode sumber dan kompilasi.
COPY . .
RUN CGO_ENABLED=0 GOOS=linux go build -ldflags="-s -w" -o /app/bin/api ./cmd/api

# Tahap runtime: image minimal.
FROM alpine:3.20

# ca-certificates untuk HTTPS (Supabase, R2, pusdatin), wget untuk healthcheck.
RUN apk add --no-cache ca-certificates wget

WORKDIR /app
COPY --from=builder /app/bin/api /app/api

EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://localhost:8080/api/v1/health || exit 1

CMD ["/app/api"]