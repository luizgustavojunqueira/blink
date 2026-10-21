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
	GetItemsDynamic(ctx context.Context, filter db.GetIemsFilter) ([]db.ItemWithParent, error)
	GetTags(ctx context.Context) ([]string, error)
	GetItemByGuid(ctx context.Context, guid string) (db.Item, error)
	GetItem(ctx context.Context, id int64) (db.Item, error)
	BulkUpdateItems(ctx context.Context, arg db.BulkUpdateItemsParams) ([]db.ItemWithParent, error)
	IsInTree(ctx context.Context, rootGuids []string, guid string) (bool, error)
	DeleteItems(ctx context.Context, guids []string) error
	RestoreItems(ctx context.Context, guids []string) ([]db.ItemWithParent, error)
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

func pointerToString[T ~string](s *T) *string {
	if s == nil {
		return nil
	}
	str := string(*s)
	return &str
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
