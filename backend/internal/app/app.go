// Package app
package app

import (
	"net/http"

	"github.com/luizgustavojunqueira/blink/internal/api"
	"github.com/luizgustavojunqueira/blink/ui"
)

type App struct {
	api *api.API
	mcp http.Handler
}

func New(api *api.API, mcp http.Handler) *App {
	return &App{api: api, mcp: mcp}
}

func (a *App) Start(port string) error {
	mux := http.NewServeMux()

	mux.HandleFunc("/api/health", func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
		_, _ = w.Write([]byte("OK"))
	})

	mux.HandleFunc("POST /api/items", a.api.CreateItem)
	mux.HandleFunc("PATCH /api/items", a.api.UpdateItem)
	mux.HandleFunc("POST /api/items/bulk", a.api.BulkUpdateItem)
	mux.HandleFunc("DELETE /api/items", a.api.DeleteItems)
	mux.HandleFunc("POST /api/items/restore", a.api.RestoreItems)
	mux.HandleFunc("GET /api/items", a.api.GetItems)
	mux.HandleFunc("GET /api/tags", a.api.GetTags)
	mux.HandleFunc("GET /api/agents", a.api.GetAgents)
	mux.HandleFunc("POST /api/agents", a.api.CreateAgent)
	mux.HandleFunc("DELETE /api/agents/{guid}", a.api.DeleteAgent)

	if a.mcp != nil {
		mux.Handle("/mcp", a.mcp)
	}

	mux.Handle("/", ui.SPAHandler())

	return http.ListenAndServe(":"+port, mux)
}
