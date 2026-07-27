.PHONY: dev dev-api dev-ui build

dev:
	make -j2 dev-api dev-ui

dev-api:
	cd backend && air

dev-ui:
	cd frontend && bun run dev

build:
	cd frontend && bun run build && cp -r dist ../backend/cmd/dist
	cd backend && go build -o ../bin/blink ./cmd

generate:
	cd backend && sqlc generate && tygo generate
