package main

import (
	"fmt"
	"net/http"
	"os"

	"github.com/luizgustavojunqueira/blink/ui"
)

func main() {
	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	mux := http.NewServeMux()

	mux.HandleFunc("/api/health", func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
		_, _ = w.Write([]byte("OK"))
	})

	mux.Handle("/", ui.SPAHandler())

	fmt.Printf("Starting server on port %s...\n", port)
	if err := http.ListenAndServe(":"+port, mux); err != nil {
		fmt.Printf("Server failed: %v\n", err)
	}
}
