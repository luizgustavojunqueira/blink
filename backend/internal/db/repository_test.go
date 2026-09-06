package db_test

import (
	"context"
	"database/sql"
	"slices"
	"testing"

	"github.com/luizgustavojunqueira/blink/internal/db"
	"github.com/luizgustavojunqueira/blink/internal/db/migrations"
	_ "modernc.org/sqlite"
)

func newTestStore(t *testing.T) *db.SQLStore {
	t.Helper()

	conn, err := sql.Open("sqlite", ":memory:?_pragma=foreign_keys(1)")
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

func seedGroups(t *testing.T, store *db.SQLStore) {
	t.Helper()

	ctx := context.Background()

	group, err := store.CreateItem(ctx, db.CreateItemParams{
		Guid: "group", Title: "with children", Type: "GROUP", Status: "TODO", Priority: "NORMAL",
	})
	if err != nil {
		t.Fatalf("failed to insert the group: %v", err)
	}

	if _, err := store.CreateItem(ctx, db.CreateItemParams{
		Guid: "empty", Title: "without children", Type: "GROUP", Status: "TODO", Priority: "NORMAL",
	}); err != nil {
		t.Fatalf("failed to insert the empty group: %v", err)
	}

	for _, child := range []struct{ guid, title string }{
		{"child-a", "first child"},
		{"child-b", "second child"},
	} {
		if _, err := store.CreateItem(ctx, db.CreateItemParams{
			Guid:     child.guid,
			Title:    child.title,
			Type:     "TASK",
			Status:   "TODO",
			Priority: "NORMAL",
			ParentID: sql.NullInt64{Int64: group.ID, Valid: true},
		}); err != nil {
			t.Fatalf("failed to insert %s: %v", child.guid, err)
		}
	}
}

func guidsOf(items []db.ItemWithParent) []string {
	guids := make([]string, 0, len(items))
	for _, i := range items {
		guids = append(guids, i.Guid)
	}
	return guids
}

func TestGetItemsDynamic_Parent(t *testing.T) {
	byTitle := []db.OrderBy{{Field: "title"}}

	t.Run("No parent id lists the roots and leaves the children out", func(t *testing.T) {
		store := newTestStore(t)
		seedGroups(t, store)

		items, err := store.GetItemsDynamic(context.Background(), db.GetIemsFilter{})
		if err != nil {
			t.Fatalf("Didn't expect error but got: %v", err)
		}

		got := guidsOf(items)
		for _, child := range []string{"child-a", "child-b"} {
			if slices.Contains(got, child) {
				t.Errorf("Expected %v to leave %s out", got, child)
			}
		}
		for _, root := range []string{"a", "b", "c", "d", "group", "empty"} {
			if !slices.Contains(got, root) {
				t.Errorf("Expected %v to contain %s", got, root)
			}
		}
	})

	t.Run("A parent id lists only that group's children", func(t *testing.T) {
		store := newTestStore(t)
		seedGroups(t, store)

		parent := "group"
		items, err := store.GetItemsDynamic(
			context.Background(),
			db.GetIemsFilter{ParentID: &parent, Order: byTitle},
		)
		if err != nil {
			t.Fatalf("Didn't expect error but got: %v", err)
		}

		expected := []string{"child-a", "child-b"}
		if got := guidsOf(items); !slices.Equal(got, expected) {
			t.Errorf("Expected %v but got %v", expected, got)
		}
	})

	t.Run("A group without children lists nothing", func(t *testing.T) {
		store := newTestStore(t)
		seedGroups(t, store)

		parent := "empty"
		items, err := store.GetItemsDynamic(context.Background(), db.GetIemsFilter{ParentID: &parent})
		if err != nil {
			t.Fatalf("Didn't expect error but got: %v", err)
		}

		if len(items) != 0 {
			t.Errorf("Expected no items but got %v", guidsOf(items))
		}
	})

	t.Run("An unknown parent guid lists nothing instead of everything", func(t *testing.T) {
		store := newTestStore(t)
		seedGroups(t, store)

		parent := "does-not-exist"
		items, err := store.GetItemsDynamic(context.Background(), db.GetIemsFilter{ParentID: &parent})
		if err != nil {
			t.Fatalf("Didn't expect error but got: %v", err)
		}

		if len(items) != 0 {
			t.Errorf("Expected no items but got %v", guidsOf(items))
		}
	})

	t.Run("Children carry the parent guid, roots carry none", func(t *testing.T) {
		store := newTestStore(t)
		seedGroups(t, store)

		parent := "group"
		children, err := store.GetItemsDynamic(
			context.Background(),
			db.GetIemsFilter{ParentID: &parent, Order: byTitle},
		)
		if err != nil {
			t.Fatalf("Didn't expect error but got: %v", err)
		}

		for _, child := range children {
			if !child.ParentGuid.Valid || child.ParentGuid.String != "group" {
				t.Errorf("Expected %s to point at group but got %+v", child.Guid, child.ParentGuid)
			}
		}

		roots, err := store.GetItemsDynamic(context.Background(), db.GetIemsFilter{})
		if err != nil {
			t.Fatalf("Didn't expect error but got: %v", err)
		}

		for _, root := range roots {
			if root.ParentGuid.Valid {
				t.Errorf("Expected %s to have no parent but got %q", root.Guid, root.ParentGuid.String)
			}
		}
	})
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

			if got := guidsOf(items); !slices.Equal(got, tt.expected) {
				t.Errorf("Expected %v but got %v", tt.expected, got)
			}
		})
	}
}

func itemsByGuid(items []db.ItemWithParent) map[string]db.ItemWithParent {
	byGuid := make(map[string]db.ItemWithParent, len(items))
	for _, i := range items {
		byGuid[i.Guid] = i
	}
	return byGuid
}

func TestBulkUpdateItems(t *testing.T) {
	ctx := context.Background()

	t.Run("Only the given columns and the given guids are touched", func(t *testing.T) {
		store := newTestStore(t)

		updated, err := store.BulkUpdateItems(ctx, db.BulkUpdateItemsParams{
			Guids:  []string{"a", "b"},
			Status: new("DONE"),
		})
		if err != nil {
			t.Fatalf("failed to bulk update: %v", err)
		}

		if len(updated) != 2 {
			t.Fatalf("expected 2 updated items, got %d", len(updated))
		}

		byGuid := itemsByGuid(updated)

		if got := byGuid["b"]; got.Status != "DONE" || got.Title != "bravo" || got.Priority != "LOW" {
			t.Errorf("expected only the status to change, got %+v", got.Item)
		}

		untouched, err := store.GetItemByGuid(ctx, "c")
		if err != nil {
			t.Fatalf("failed to read the untouched item: %v", err)
		}

		if untouched.Status != "TODO" {
			t.Errorf("expected item c to keep its status, got %q", untouched.Status)
		}
	})

	t.Run("An empty guid list updates nothing", func(t *testing.T) {
		store := newTestStore(t)

		updated, err := store.BulkUpdateItems(ctx, db.BulkUpdateItemsParams{
			Guids:  []string{},
			Status: new("DONE"),
		})
		if err != nil {
			t.Fatalf("failed to bulk update: %v", err)
		}

		if len(updated) != 0 {
			t.Fatalf("expected no updated items, got %d", len(updated))
		}
	})

	t.Run("The returned parent guid is the one set by the update", func(t *testing.T) {
		store := newTestStore(t)
		seedGroups(t, store)

		group, err := store.GetItemByGuid(ctx, "group")
		if err != nil {
			t.Fatalf("failed to read the group: %v", err)
		}

		updated, err := store.BulkUpdateItems(ctx, db.BulkUpdateItemsParams{
			Guids:    []string{"a", "b"},
			ParentID: &group.ID,
		})
		if err != nil {
			t.Fatalf("failed to bulk update: %v", err)
		}

		for guid, item := range itemsByGuid(updated) {
			if !item.ParentGuid.Valid || item.ParentGuid.String != "group" {
				t.Errorf("expected item %s to come back under the group, got %+v", guid, item.ParentGuid)
			}
		}
	})

	t.Run("An untouched parent still comes back in the response", func(t *testing.T) {
		store := newTestStore(t)
		seedGroups(t, store)

		updated, err := store.BulkUpdateItems(ctx, db.BulkUpdateItemsParams{
			Guids:  []string{"child-a", "a"},
			Status: new("DONE"),
		})
		if err != nil {
			t.Fatalf("failed to bulk update: %v", err)
		}

		byGuid := itemsByGuid(updated)

		if got := byGuid["child-a"]; !got.ParentGuid.Valid || got.ParentGuid.String != "group" {
			t.Errorf("expected the existing parent guid, got %+v", got.ParentGuid)
		}

		if got := byGuid["a"]; got.ParentGuid.Valid {
			t.Errorf("expected no parent guid for a root item, got %+v", got.ParentGuid)
		}
	})
}
