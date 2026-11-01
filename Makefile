-include .env
export

.PHONY: dev-api dev-ui build generate test test-back test-front perf perf-back perf-ui

dev-api:
	cd backend && air

dev-ui:
	cd frontend && bun run dev

build:
	cd frontend && bun run build && cp -r dist/. ../backend/ui/dist/
	cd backend && go build -o ../bin/blink ./cmd

generate:
	cd backend && sqlc generate && tygo generate

test: test-back test-front

test-back:
	cd backend && go test ./...

test-front:
	cd frontend && bun run test

perf: perf-back perf-ui

perf-back:
	cd backend && go test -run '^$$' -bench . -benchmem ./internal/api/

perf-ui:
	cd frontend && bun run perf
