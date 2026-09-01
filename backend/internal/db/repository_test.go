package db_test

import (
	"context"
	"database/sql"
	"testing"

	"github.com/luizgustavojunqueira/blink/internal/db"
	"github.com/luizgustavojunqueira/blink/internal/db/migrations"
	_ "modernc.org/sqlite"
)

func newTestStore(t *testing.T) *db.SQLStore {
	t.Helper()

	conn, err := sql.Open("sqlite", ":memory:")
	if err != nil {
		t.Fatalf("failed to open database: %v", err)
	}
	t.Cleanup(func() {
		if err := conn.Close(); err != nil {
			t.Errorf("failed to close database: %v", err)
		}
	})

	schema, err := migrations.FS.ReadFile("000001_create_items_table.up.sql")
	if err != nil {
		t.Fatalf("failed to read migration: %v", err)
	}

	if _, err := conn.Exec(string(schema)); err != nil {
		t.Fatalf("failed to apply migration: %v", err)
	}

	items := []struct {
		guid      string
		title     string
		status    string
		priority  string
		createdAt string
	}{
		{"a", "alpha", "DONE", "HIGH", "2026-01-01"},
		{"b", "bravo", "TODO", "LOW", "2026-01-02"},
		{"c", "charlie", "TODO", "URGENT", "2026-01-03"},
		{"d", "delta", "ARCHIVED", "NORMAL", "2026-01-04"},
	}

	for _, i := range items {
		_, err := conn.Exec(
			`INSERT INTO items (guid, title, type, status, priority, created_at) VALUES (?, ?, 'TASK', ?, ?, ?)`,
			i.guid, i.title, i.status, i.priority, i.createdAt,
		)
		if err != nil {
			t.Fatalf("failed to insert %s: %v", i.guid, err)
		}
	}

	return db.NewRepository(conn)
}

func TestGetItemsDynamic_Order(t *testing.T) {
	tests := []struct {
		name     string
		order    []db.OrderBy
		expected []string
	}{
		{
			name:     "No order falls back to status rank then newest first",
			order:    nil,
			expected: []string{"c", "b", "a", "d"},
		},
		{
			name:     "Title ascending",
			order:    []db.OrderBy{{Field: "title"}},
			expected: []string{"a", "b", "c", "d"},
		},
		{
			name:     "Priority ascending follows severity, not alphabet",
			order:    []db.OrderBy{{Field: "priority"}},
			expected: []string{"c", "a", "d", "b"},
		},
		{
			name:     "Priority descending",
			order:    []db.OrderBy{{Field: "priority", Desc: true}},
			expected: []string{"b", "d", "a", "c"},
		},
		{
			name:     "Ties are broken by id",
			order:    []db.OrderBy{{Field: "status"}},
			expected: []string{"c", "b", "a", "d"},
		},
		{
			name:     "First field wins over the second",
			order:    []db.OrderBy{{Field: "status"}, {Field: "priority", Desc: true}},
			expected: []string{"b", "c", "a", "d"},
		},
		{
			name:     "Unknown field is ignored instead of reaching the query",
			order:    []db.OrderBy{{Field: "title; DROP TABLE items--"}},
			expected: []string{"d", "c", "b", "a"},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			store := newTestStore(t)

			items, err := store.GetItemsDynamic(context.Background(), db.GetIemsFilter{Order: tt.order})
			if err != nil {
				t.Fatalf("Didn't expect error but got: %v", err)
			}

			got := make([]string, 0, len(items))
			for _, i := range items {
				got = append(got, i.Guid)
			}

			if len(got) != len(tt.expected) {
				t.Fatalf("Expected %v but got %v", tt.expected, got)
			}

			for i := range got {
				if got[i] != tt.expected[i] {
					t.Errorf("Expected %v but got %v", tt.expected, got)
					break
				}
			}
		})
	}
}
