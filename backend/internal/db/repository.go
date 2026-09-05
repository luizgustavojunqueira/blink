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
	Order       []OrderBy
	ParentID    *string
}

type ItemWithParent struct {
	Item
	ParentGuid sql.NullString
}

type OrderBy struct {
	Field string
	Desc  bool
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

const (
	statusRankExpr   = "CASE i.status WHEN 'TODO' THEN 0 WHEN 'IN_PROGRESS' THEN 1 WHEN 'DONE' THEN 2 WHEN 'CANCELED' THEN 3 WHEN 'ARCHIVED' THEN 4 ELSE 5 END"
	priorityRankExpr = "CASE i.priority WHEN 'URGENT' THEN 0 WHEN 'HIGH' THEN 1 WHEN 'NORMAL' THEN 2 WHEN 'LOW' THEN 3 ELSE 4 END"
	orderTiebreaker  = "i.id DESC"
)

var defaultOrder = []string{statusRankExpr + " ASC", "i.created_at DESC"}

var orderColumns = map[string]string{
	"title":    "i.title",
	"created":  "i.created_at",
	"updated":  "i.updated_at",
	"priority": priorityRankExpr,
	"status":   statusRankExpr,
}

func (s *SQLStore) GetItemsDynamic(ctx context.Context, filter GetIemsFilter) ([]ItemWithParent, error) {
	query := squirrel.Select(
		"i.id",
		"i.guid",
		"i.title",
		"i.description",
		"i.type",
		"i.parent_id",
		"i.status",
		"i.priority",
		"i.tags",
		"i.created_at",
		"i.updated_at",
		"i.completed_at",
		"p.guid AS parent_guid",
	).
		From("items i").
		LeftJoin("items p ON p.id = i.parent_id").
		PlaceholderFormat(squirrel.Question)

	if len(filter.Status) > 0 {
		query = query.Where(squirrel.Eq{"i.status": filter.Status})
	}
	if len(filter.Priority) > 0 {
		query = query.Where(squirrel.Eq{"i.priority": filter.Priority})
	}
	if len(filter.Type) > 0 {
		query = query.Where(squirrel.Eq{"i.type": filter.Type})
	}

	if filter.Title != nil {
		query = query.Where(squirrel.Like{"i.title": "%" + *filter.Title + "%"})
	}
	if filter.Description != nil {
		query = query.Where(squirrel.Like{"i.description": "%" + *filter.Description + "%"})
	}

	if filter.ParentID == nil {
		query = query.Where(squirrel.Eq{"i.parent_id": nil})
	} else {
		sub := squirrel.Select("id").From("items").Where(squirrel.Eq{"guid": *filter.ParentID})
		query = query.Where(squirrel.Expr("i.parent_id = (?)", sub))
	}

	for _, tag := range filter.Tags {
		query = query.Where(squirrel.Or{
			squirrel.Like{"i.tags": tag},
			squirrel.Like{"i.tags": tag + ",%"},
			squirrel.Like{"i.tags": "%," + tag},
			squirrel.Like{"i.tags": "%," + tag + ",%"},
		})
	}

	if len(filter.Order) == 0 {
		query = query.OrderBy(defaultOrder...)
	} else {
		for _, order := range filter.Order {
			if expr, ok := orderColumns[order.Field]; ok {
				if order.Desc {
					query = query.OrderBy(expr + " DESC")
				} else {
					query = query.OrderBy(expr + " ASC")
				}
			}
		}
	}

	query = query.OrderBy(orderTiebreaker)

	sql, args, err := query.ToSql()
	if err != nil {
		return nil, err
	}

	rows, err := s.db.QueryContext(ctx, sql, args...)
	if err != nil {
		return nil, err
	}

	var items []ItemWithParent

	for rows.Next() {
		var i ItemWithParent
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
			&i.ParentGuid,
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
