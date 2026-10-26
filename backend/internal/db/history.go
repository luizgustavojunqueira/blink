package db

import (
	"context"
	"database/sql"
	"fmt"
	"strings"
)

const historyChunk = 500

type execer interface {
	ExecContext(ctx context.Context, query string, args ...any) (sql.Result, error)
	QueryContext(ctx context.Context, query string, args ...any) (*sql.Rows, error)
}

type itemState struct {
	ID          int64
	Title       string
	Description sql.NullString
	Status      string
	Priority    string
	Tags        sql.NullString
	ParentGuid  sql.NullString
}

type historyEntry struct {
	itemID   int64
	field    string
	oldValue sql.NullString
	newValue sql.NullString
}

func stateOf(i ItemWithParent) itemState {
	return itemState{
		ID:          i.ID,
		Title:       i.Title,
		Description: i.Description,
		Status:      i.Status,
		Priority:    i.Priority,
		Tags:        i.Tags,
		ParentGuid:  i.ParentGuid,
	}
}

func loadStates(ctx context.Context, q execer, userID int64, guids []string) (map[int64]itemState, error) {
	placeholders, args := guidPlaceholders(guids)
	args = append(args, userID)

	rows, err := q.QueryContext(ctx, fmt.Sprintf(`SELECT i.id, i.title, i.description, i.status, i.priority, i.tags, p.guid
FROM items i LEFT JOIN items p ON p.id = i.parent_id
WHERE i.guid IN (%s) AND i.user_id = ?`, placeholders), args...)
	if err != nil {
		return nil, err
	}
	defer func() { _ = rows.Close() }()

	states := make(map[int64]itemState, len(guids))
	for rows.Next() {
		var s itemState
		if err := rows.Scan(&s.ID, &s.Title, &s.Description, &s.Status, &s.Priority, &s.Tags, &s.ParentGuid); err != nil {
			return nil, err
		}
		states[s.ID] = s
	}

	return states, rows.Err()
}

func diffStates(before, after itemState) []historyEntry {
	var entries []historyEntry

	add := func(field string, oldValue, newValue sql.NullString) {
		if oldValue != newValue {
			entries = append(entries, historyEntry{itemID: after.ID, field: field, oldValue: oldValue, newValue: newValue})
		}
	}
	text := func(s string) sql.NullString { return sql.NullString{String: s, Valid: true} }

	add("title", text(before.Title), text(after.Title))
	add("description", before.Description, after.Description)
	add("status", text(before.Status), text(after.Status))
	add("priority", text(before.Priority), text(after.Priority))
	add("tags", before.Tags, after.Tags)
	add("parent", before.ParentGuid, after.ParentGuid)

	return entries
}

func mapValues(m map[int64]itemState) []itemState {
	values := make([]itemState, 0, len(m))
	for _, s := range m {
		values = append(values, s)
	}
	return values
}

func diffAll(before map[int64]itemState, after []itemState) []historyEntry {
	var entries []historyEntry
	for _, a := range after {
		b, ok := before[a.ID]
		if !ok {
			continue
		}
		entries = append(entries, diffStates(b, a)...)
	}
	return entries
}

func marker(field string, ids []int64) []historyEntry {
	entries := make([]historyEntry, 0, len(ids))
	for _, id := range ids {
		entries = append(entries, historyEntry{itemID: id, field: field})
	}
	return entries
}

func insertHistory(ctx context.Context, q execer, actorID int64, entries []historyEntry) error {
	for start := 0; start < len(entries); start += historyChunk {
		end := min(start+historyChunk, len(entries))
		chunk := entries[start:end]

		args := make([]any, 0, len(chunk)*5)
		for _, e := range chunk {
			args = append(args, e.itemID, actorID, e.field, e.oldValue, e.newValue)
		}

		query := "INSERT INTO item_history (item_id, actor_id, field, old_value, new_value) VALUES " +
			strings.TrimSuffix(strings.Repeat("(?,?,?,?,?),", len(chunk)), ",")

		if _, err := q.ExecContext(ctx, query, args...); err != nil {
			return err
		}
	}

	return nil
}
