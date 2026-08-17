// Package db
package db

import (
	"context"
	"database/sql"

	"github.com/Masterminds/squirrel"
)

type GetIemsFilter struct {
	Status      []string
	Priority    []string
	Type        []string
	Title       *string
	Description *string
	Tags        []string
}

type SQLStore struct {
	db *sql.DB
	*Queries
}

func NewRepository(dbConn *sql.DB) *SQLStore {
	return &SQLStore{
		db:      dbConn,
		Queries: New(dbConn),
	}
}

func (s *SQLStore) GetItemsDynamic(ctx context.Context, filter GetIemsFilter) ([]Item, error) {
	query := squirrel.Select("*").From("items").PlaceholderFormat(squirrel.Question)

	if len(filter.Status) > 0 {
		query = query.Where(squirrel.Eq{"status": filter.Status})
	}
	if len(filter.Priority) > 0 {
		query = query.Where(squirrel.Eq{"priority": filter.Priority})
	}
	if len(filter.Type) > 0 {
		query = query.Where(squirrel.Eq{"type": filter.Type})
	}

	if filter.Title != nil {
		query = query.Where(squirrel.Like{"title": "%" + *filter.Title + "%"})
	}
	if filter.Description != nil {
		query = query.Where(squirrel.Like{"description": "%" + *filter.Description + "%"})
	}

	for _, tag := range filter.Tags {
		query = query.Where(squirrel.Or{
			squirrel.Like{"tags": tag},
			squirrel.Like{"tags": tag + ",%"},
			squirrel.Like{"tags": "%," + tag},
			squirrel.Like{"tags": "%," + tag + ",%"},
		})
	}

	query = query.OrderBy("updated_at DESC", "created_at DESC")

	sql, args, err := query.ToSql()
	if err != nil {
		return nil, err
	}

	rows, err := s.db.QueryContext(ctx, sql, args...)
	if err != nil {
		return nil, err
	}

	var items []Item

	for rows.Next() {
		var i Item
		if err := rows.Scan(
			&i.ID,
			&i.Guid,
			&i.Title,
			&i.Description,
			&i.Type,
			&i.ParentID,
			&i.Status,
			&i.Priority,
			&i.Tags,
			&i.CreatedAt,
			&i.UpdatedAt,
			&i.CompletedAt,
		); err != nil {
			return nil, err
		}
		items = append(items, i)
	}
	if err := rows.Close(); err != nil {
		return nil, err
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	return items, nil
}
