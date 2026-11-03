// Package db
package db

import (
	"context"
	"database/sql"
	"fmt"
	"strings"

	"github.com/Masterminds/squirrel"
	"github.com/luizgustavojunqueira/blink/internal/userctx"
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
	Recursive   bool
	DueFrom     *string
	DueTo       *string
}

type ItemWithParent struct {
	Item
	ParentGuid sql.NullString
}

type BulkUpdateItemsParams struct {
	Guids       []string
	Title       *string
	Description *string
	Status      *string
	Priority    *string
	Tags        *string
	ParentID    *int64
	DueDate     *string
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

const bulkUpdateReturning = `RETURNING id, guid, title, description, type, parent_id, status, priority, tags, created_at, updated_at, completed_at, deleted_at, due_date, (SELECT p.guid FROM items p WHERE p.id = items.parent_id) AS parent_guid`

var orderColumns = map[string]string{
	"title":    "i.title",
	"created":  "i.created_at",
	"updated":  "i.updated_at",
	"priority": priorityRankExpr,
	"status":   statusRankExpr,
	"due":      "COALESCE(i.due_date, '9999-12-31')",
}

func (s *SQLStore) GetItemsDynamic(ctx context.Context, filter GetIemsFilter) ([]ItemWithParent, error) {
	userID, err := userctx.ID(ctx)
	if err != nil {
		return nil, err
	}

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
		"i.deleted_at",
		"i.due_date",
		"p.guid AS parent_guid",
	).
		From("items i").
		LeftJoin("items p ON p.id = i.parent_id").
		Where(squirrel.Eq{"i.deleted_at": nil, "i.user_id": userID}).
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
	if filter.DueFrom != nil {
		query = query.Where(squirrel.GtOrEq{"i.due_date": *filter.DueFrom})
	}
	if filter.DueTo != nil {
		query = query.Where(squirrel.LtOrEq{"i.due_date": *filter.DueTo})
	}

	switch {
	case filter.Recursive:
	case filter.ParentID == nil:
		query = query.Where(squirrel.Eq{"i.parent_id": nil})
	default:
		sub := squirrel.Select("id").From("items").Where(squirrel.Eq{"guid": *filter.ParentID, "user_id": userID})
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

	return scanItemsWithParent(rows)
}

func (s *SQLStore) BulkUpdateItems(ctx context.Context, arg BulkUpdateItemsParams) ([]ItemWithParent, error) {
	userID, err := userctx.ID(ctx)
	if err != nil {
		return nil, err
	}

	query := squirrel.Update("items").
		Where(squirrel.Eq{"guid": arg.Guids, "user_id": userID}).
		Suffix(bulkUpdateReturning).
		PlaceholderFormat(squirrel.Question)

	if arg.Title != nil {
		query = query.Set("title", *arg.Title)
	}
	if arg.Description != nil {
		query = query.Set("description", *arg.Description)
	}
	if arg.Status != nil {
		query = query.Set("status", *arg.Status)
	}
	if arg.Priority != nil {
		query = query.Set("priority", *arg.Priority)
	}
	if arg.Tags != nil {
		query = query.Set("tags", *arg.Tags)
	}
	if arg.ParentID != nil {
		query = query.Set("parent_id", *arg.ParentID)
	}
	if arg.DueDate != nil {
		query = query.Set("due_date", squirrel.Expr("NULLIF(?, '')", *arg.DueDate))
	}

	query = query.Set("updated_at", squirrel.Expr("CURRENT_TIMESTAMP"))

	sql, args, err := query.ToSql()
	if err != nil {
		return nil, err
	}

	tx, err := s.db.BeginTx(ctx, nil)
	if err != nil {
		return nil, err
	}
	defer func() { _ = tx.Rollback() }()

	before, err := loadStates(ctx, tx, userID, arg.Guids)
	if err != nil {
		return nil, err
	}

	rows, err := tx.QueryContext(ctx, sql, args...)
	if err != nil {
		return nil, err
	}

	items, err := scanItemsWithParent(rows)
	if err != nil {
		return nil, err
	}

	after := make([]itemState, 0, len(items))
	for _, i := range items {
		after = append(after, stateOf(i))
	}

	if err := insertHistory(ctx, tx, userID, diffAll(before, after)); err != nil {
		return nil, err
	}

	return items, tx.Commit()
}

const deleteItemsQuery = `WITH RECURSIVE tree(id) AS (
	SELECT id FROM items WHERE guid IN (%s) AND user_id = ? AND deleted_at IS NULL
	UNION ALL
	SELECT i.id FROM items i JOIN tree t ON i.parent_id = t.id WHERE i.deleted_at IS NULL
)
UPDATE items SET deleted_at = strftime('%%Y-%%m-%%d %%H:%%M:%%f', 'now') WHERE id IN (SELECT id FROM tree) RETURNING id`

const restoreItemsQuery = `WITH RECURSIVE tree(id) AS (
	SELECT id FROM items WHERE guid IN (%s) AND user_id = ? AND deleted_at IS NOT NULL
	UNION ALL
	SELECT i.id FROM items i JOIN tree t ON i.parent_id = t.id
	WHERE i.deleted_at = (SELECT deleted_at FROM items WHERE id = t.id)
)
UPDATE items SET deleted_at = NULL WHERE id IN (SELECT id FROM tree) ` + bulkUpdateReturning

const inTreeQuery = `WITH RECURSIVE tree(id) AS (
	SELECT id FROM items WHERE guid IN (%s) AND user_id = ?
	UNION ALL
	SELECT i.id FROM items i JOIN tree t ON i.parent_id = t.id
)
SELECT EXISTS(SELECT 1 FROM tree WHERE id = (SELECT id FROM items WHERE guid = ? AND user_id = ?))`

func (s *SQLStore) IsInTree(ctx context.Context, rootGuids []string, guid string) (bool, error) {
	userID, err := userctx.ID(ctx)
	if err != nil {
		return false, err
	}

	placeholders, args := guidPlaceholders(rootGuids)
	args = append(args, userID, guid, userID)

	var found bool
	err = s.db.QueryRowContext(ctx, fmt.Sprintf(inTreeQuery, placeholders), args...).Scan(&found)

	return found, err
}

func guidPlaceholders(guids []string) (string, []any) {
	args := make([]any, len(guids))
	for i, g := range guids {
		args[i] = g
	}
	return strings.TrimSuffix(strings.Repeat("?,", len(guids)), ","), args
}

func (s *SQLStore) DeleteItems(ctx context.Context, guids []string) error {
	userID, err := userctx.ID(ctx)
	if err != nil {
		return err
	}

	placeholders, args := guidPlaceholders(guids)

	tx, err := s.db.BeginTx(ctx, nil)
	if err != nil {
		return err
	}
	defer func() { _ = tx.Rollback() }()

	rows, err := tx.QueryContext(ctx, fmt.Sprintf(deleteItemsQuery, placeholders), append(args, userID)...)
	if err != nil {
		return err
	}

	ids, err := scanIDs(rows)
	if err != nil {
		return err
	}

	if err := insertHistory(ctx, tx, userID, marker("deleted", ids)); err != nil {
		return err
	}

	return tx.Commit()
}

func (s *SQLStore) RestoreItems(ctx context.Context, guids []string) ([]ItemWithParent, error) {
	userID, err := userctx.ID(ctx)
	if err != nil {
		return nil, err
	}

	placeholders, args := guidPlaceholders(guids)

	tx, err := s.db.BeginTx(ctx, nil)
	if err != nil {
		return nil, err
	}
	defer func() { _ = tx.Rollback() }()

	rows, err := tx.QueryContext(ctx, fmt.Sprintf(restoreItemsQuery, placeholders), append(args, userID)...)
	if err != nil {
		return nil, err
	}

	items, err := scanItemsWithParent(rows)
	if err != nil {
		return nil, err
	}

	ids := make([]int64, 0, len(items))
	for _, i := range items {
		ids = append(ids, i.ID)
	}

	if err := insertHistory(ctx, tx, userID, marker("restored", ids)); err != nil {
		return nil, err
	}

	return items, tx.Commit()
}

func scanIDs(rows *sql.Rows) ([]int64, error) {
	var ids []int64

	for rows.Next() {
		var id int64
		if err := rows.Scan(&id); err != nil {
			return nil, err
		}
		ids = append(ids, id)
	}
	if err := rows.Close(); err != nil {
		return nil, err
	}

	return ids, rows.Err()
}

func scanItemsWithParent(rows *sql.Rows) ([]ItemWithParent, error) {
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
			&i.DeletedAt,
			&i.DueDate,
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
