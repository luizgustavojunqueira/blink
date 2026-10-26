FROM oven/bun:alpine AS frontend-builder
WORKDIR /app
COPY frontend/package*.json ./
RUN bun install
COPY frontend/ ./
RUN bun run build

FROM golang:1.26-alpine AS backend-builder
WORKDIR /app
RUN apk add --no-cache gcc musl-dev
COPY backend/go.mod ./
RUN go mod download
COPY backend/ ./
COPY --from=frontend-builder /app/dist ./ui/dist
RUN CGO_ENABLED=1 go build -o blink ./cmd/main.go

FROM alpine:latest
ARG PORT=8081
ENV PORT=${PORT}
WORKDIR /app
COPY --from=backend-builder /app/blink .
EXPOSE ${PORT}
CMD ["./blink"]
