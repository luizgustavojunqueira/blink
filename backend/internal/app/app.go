// Package app
package app

import (
	"net/http"

	"github.com/luizgustavojunqueira/blink/internal/api"
	"github.com/luizgustavojunqueira/blink/ui"
)

type App struct {
	api *api.API
}

func New(api *api.API) *App {
	return &App{api: api}
}

func (a *App) Start(port string) error {
	mux := http.NewServeMux()

	mux.HandleFunc("/api/health", func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
		_, _ = w.Write([]byte("OK"))
	})

	mux.HandleFunc("POST /api/items", a.api.CreateItem)
	mux.HandleFunc("GET /api/items", a.api.GetItems)

	mux.Handle("/", ui.SPAHandler())

	return http.ListenAndServe(":"+port, mux)
}
