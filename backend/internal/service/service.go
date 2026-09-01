// Package service
package service

import (
	"context"
	"database/sql"
	"strings"

	"github.com/luizgustavojunqueira/blink/internal/db"
	"github.com/luizgustavojunqueira/blink/internal/models"
)

type Repository interface {
	CreateItem(ctx context.Context, arg db.CreateItemParams) (db.Item, error)
	UpdateItem(ctx context.Context, arg db.UpdateItemParams) (db.Item, error)
	GetItemsDynamic(ctx context.Context, filter db.GetIemsFilter) ([]db.Item, error)
	GetTags(ctx context.Context) ([]string, error)
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

func pointerToNullString[T ~string](s *T) sql.NullString {
	if s != nil {
		return sql.NullString{String: string(*s), Valid: true}
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

func toDBOrders(orders []models.OrderBy) []db.OrderBy {
	if orders == nil {
		return nil
	}
	result := make([]db.OrderBy, 0, len(orders))
	for _, o := range orders {
		result = append(result, db.OrderBy{Field: string(o.Field), Desc: o.Desc})
	}
	return result
}

func tagsToStringSlice(csvTags sql.NullString) []string {
	var tags []string
	if csvTags.Valid && csvTags.String != "" {
		tags = strings.Split(csvTags.String, ",")
	} else {
		tags = []string{}
	}
	return tags
}
