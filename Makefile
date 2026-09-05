.PHONY: dev-api dev-ui build generate test test-back test-front

dev-api:
	cd backend && DB_PATH=../data/blink.db air

dev-ui:
	cd frontend && bun run dev

build:
	cd frontend && bun run build && cp -r dist ../backend/cmd/dist
	cd backend && go build -o ../bin/blink ./cmd

generate:
	cd backend && sqlc generate && tygo generate

test: test-back test-front

test-back:
	cd backend && go test ./...

test-front:
	cd frontend && bun run test
