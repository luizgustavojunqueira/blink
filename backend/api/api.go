// Package api
package api

import (
	"database/sql"

	"github.com/luizgustavojunqueira/blink/db"
)

type API struct {
	repo db.Querier
}

func NewAPI(repo db.Querier) *API {
	return &API{repo: repo}
}

func nullStringToPointer(ns sql.NullString) *string {
	if !ns.Valid {
		return nil
	}
	return &ns.String
}

func pointerToNullString(s *string) sql.NullString {
	if s != nil {
		return sql.NullString{String: *s, Valid: true}
	}
	return sql.NullString{}
}
