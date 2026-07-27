// Package ui embeds the frontend build output into the Go binary.
package ui

import (
	"embed"
	"io/fs"
	"net/http"
	"os"
)

//go:embed dist/*
var Assets embed.FS

func SPAHandler() http.Handler {
	dist, _ := fs.Sub(Assets, "dist")
	return http.FileServer(&spaFileSystem{root: http.FS(dist)})
}

type spaFileSystem struct {
	root http.FileSystem
}

func (s *spaFileSystem) Open(name string) (http.File, error) {
	f, err := s.root.Open(name)
	if os.IsNotExist(err) {
		return s.root.Open("index.html")
	}
	return f, err
}
