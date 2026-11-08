FROM oven/bun:1.4.4-alpine AS frontend-builder
WORKDIR /app
COPY frontend/package.json frontend/bun.lock ./
RUN bun install --frozen-lockfile
COPY frontend/ ./
RUN bun run build

FROM golang:1.26.3-alpine AS backend-builder
WORKDIR /app
COPY backend/go.mod backend/go.sum ./
RUN go mod download
COPY backend/ ./
COPY --from=frontend-builder /app/dist ./ui/dist
RUN CGO_ENABLED=0 go build -trimpath -ldflags="-s -w" -o /blink ./cmd

FROM alpine:3.22
WORKDIR /app
RUN mkdir -p /app/data
COPY --from=backend-builder /blink ./blink
ENV PORT=8081 DB_PATH=/app/data/blink.db
EXPOSE 8081
HEALTHCHECK --interval=30s --timeout=3s CMD wget -qO- "http://127.0.0.1:${PORT}/api/health" >/dev/null || exit 1
CMD ["./blink"]
