// Package app
package app

import (
	"net/http"
	"time"

	"github.com/luizgustavojunqueira/blink/internal/api"
	"github.com/luizgustavojunqueira/blink/ui"
)

const (
	maxBodyBytes      = 4 << 20
	readHeaderTimeout = 10 * time.Second
	readTimeout       = 30 * time.Second
	writeTimeout      = 60 * time.Second
	idleTimeout       = 120 * time.Second
)

type App struct {
	api  *api.API
	auth *api.AuthAPI
	mcp  http.Handler
}

func New(api *api.API, auth *api.AuthAPI, mcp http.Handler) *App {
	return &App{api: api, auth: auth, mcp: mcp}
}

func limitBody(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		r.Body = http.MaxBytesReader(w, r.Body, maxBodyBytes)
		next.ServeHTTP(w, r)
	})
}

func (a *App) Start(port string) error {
	mux := http.NewServeMux()

	protected := func(h http.HandlerFunc) http.Handler {
		return a.auth.RequireSession(h)
	}

	mux.HandleFunc("/api/health", func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
		_, _ = w.Write([]byte("OK"))
	})

	mux.HandleFunc("POST /api/auth/signup", a.auth.Limited(a.auth.Signup))
	mux.HandleFunc("POST /api/auth/login", a.auth.Limited(a.auth.Login))
	mux.HandleFunc("POST /api/auth/logout", a.auth.Logout)

	mux.Handle("GET /api/me", protected(a.auth.Me))
	mux.Handle("POST /api/me/password", protected(a.auth.Limited(a.auth.ChangePassword)))
	mux.Handle("DELETE /api/me", protected(a.auth.Limited(a.auth.DeleteAccount)))

	mux.Handle("POST /api/items", protected(a.api.CreateItem))
	mux.Handle("PATCH /api/items", protected(a.api.UpdateItem))
	mux.Handle("POST /api/items/bulk", protected(a.api.BulkUpdateItem))
	mux.Handle("DELETE /api/items", protected(a.api.DeleteItems))
	mux.Handle("POST /api/items/restore", protected(a.api.RestoreItems))
	mux.Handle("GET /api/items", protected(a.api.GetItems))
	mux.Handle("GET /api/tags", protected(a.api.GetTags))
	mux.Handle("GET /api/agents", protected(a.api.GetAgents))
	mux.Handle("POST /api/agents", protected(a.api.CreateAgent))
	mux.Handle("DELETE /api/agents/{guid}", protected(a.api.DeleteAgent))

	if a.mcp != nil {
		mux.Handle("/mcp", a.mcp)
	}

	mux.Handle("/", ui.SPAHandler())

	srv := &http.Server{
		Addr:              ":" + port,
		Handler:           limitBody(mux),
		ReadHeaderTimeout: readHeaderTimeout,
		ReadTimeout:       readTimeout,
		WriteTimeout:      writeTimeout,
		IdleTimeout:       idleTimeout,
	}

	return srv.ListenAndServe()
}
