// Package service
package service

import (
	"context"
	"database/sql"

	"github.com/luizgustavojunqueira/blink/internal/db"
)

type Repository interface {
	CreateItem(ctx context.Context, arg db.CreateItemParams) (db.Item, error)
	GetItemsDynamic(ctx context.Context, filter db.GetIemsFilter) ([]db.Item, error)
}

type Service struct {
	repo Repository
}

func NewService(repo Repository) *Service {
	return &Service{repo: repo}
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

func toStringSlice[T ~string](items []T) []string {
	if items == nil {
		return nil
	}
	result := make([]string, len(items))
	for i, v := range items {
		result[i] = string(v)
	}
	return result
}
