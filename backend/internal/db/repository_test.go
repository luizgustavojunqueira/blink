package db_test

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"slices"
	"testing"
	"time"

	"github.com/luizgustavojunqueira/blink/internal/db"
	"github.com/luizgustavojunqueira/blink/internal/db/migrations"
	"github.com/luizgustavojunqueira/blink/internal/userctx"
	_ "modernc.org/sqlite"
)

func userCtx() context.Context {
	return userctx.With(context.Background(), 1)
}

func newTestStore(t *testing.T) *db.SQLStore {
	t.Helper()

	store, _ := newTestStoreConn(t)
	return store
}

func newTestStoreConn(t *testing.T) (*db.SQLStore, *sql.DB) {
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

	for _, name := range []string{"000001_create_items_table.up.sql", "000002_add_items_deleted_at.up.sql", "000003_create_agents_table.up.sql", "000004_create_users.up.sql", "000005_add_items_user_id.up.sql", "000006_scope_agents_by_user.up.sql", "000007_create_item_history.up.sql", "000008_index_items_parent_deleted.up.sql"} {
		schema, err := migrations.FS.ReadFile(name)
		if err != nil {
			t.Fatalf("failed to read migration: %v", err)
		}

		if _, err := conn.Exec(string(schema)); err != nil {
			t.Fatalf("failed to apply migration: %v", err)
		}
	}

	if _, err := conn.Exec(`INSERT INTO users (id, guid, username, password_hash) VALUES (1, 'u1', 'tester', 'x'), (2, 'u2', 'other', 'x')`); err != nil {
		t.Fatalf("failed to insert users: %v", err)
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
			`INSERT INTO items (guid, title, type, status, priority, created_at, user_id) VALUES (?, ?, 'TASK', ?, ?, ?, 1)`,
			i.guid, i.title, i.status, i.priority, i.createdAt,
		)
		if err != nil {
			t.Fatalf("failed to insert %s: %v", i.guid, err)
		}
	}

	return db.NewRepository(conn), conn
}

func seedGroups(t *testing.T, store *db.SQLStore) {
	t.Helper()

	ctx := userCtx()

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

		items, err := store.GetItemsDynamic(userCtx(), db.GetIemsFilter{})
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
			userCtx(),
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
		items, err := store.GetItemsDynamic(userCtx(), db.GetIemsFilter{ParentID: &parent})
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
		items, err := store.GetItemsDynamic(userCtx(), db.GetIemsFilter{ParentID: &parent})
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
			userCtx(),
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

		roots, err := store.GetItemsDynamic(userCtx(), db.GetIemsFilter{})
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

			items, err := store.GetItemsDynamic(userCtx(), db.GetIemsFilter{Order: tt.order})
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
	ctx := userCtx()

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

func TestDeleteAndRestoreItems(t *testing.T) {
	ctx := userCtx()

	listed := func(t *testing.T, store *db.SQLStore, parent *string) []string {
		t.Helper()
		items, err := store.GetItemsDynamic(ctx, db.GetIemsFilter{ParentID: parent})
		if err != nil {
			t.Fatalf("failed to list items: %v", err)
		}
		return guidsOf(items)
	}

	t.Run("A deleted item stops being listed", func(t *testing.T) {
		store := newTestStore(t)

		if err := store.DeleteItems(ctx, []string{"a", "b"}); err != nil {
			t.Fatalf("failed to delete: %v", err)
		}

		got := listed(t, store, nil)
		for _, guid := range []string{"a", "b"} {
			if slices.Contains(got, guid) {
				t.Errorf("Expected %v to leave %s out", got, guid)
			}
		}
		if !slices.Contains(got, "c") {
			t.Errorf("Expected %v to keep c", got)
		}
	})

	t.Run("Deleting a group takes its children with it", func(t *testing.T) {
		store := newTestStore(t)
		seedGroups(t, store)

		if err := store.DeleteItems(ctx, []string{"group"}); err != nil {
			t.Fatalf("failed to delete: %v", err)
		}

		parent := "group"
		if got := listed(t, store, &parent); len(got) != 0 {
			t.Errorf("Expected no children but got %v", got)
		}
	})

	t.Run("Restoring a group brings its children back", func(t *testing.T) {
		store := newTestStore(t)
		seedGroups(t, store)

		if err := store.DeleteItems(ctx, []string{"group"}); err != nil {
			t.Fatalf("failed to delete: %v", err)
		}

		restored, err := store.RestoreItems(ctx, []string{"group"})
		if err != nil {
			t.Fatalf("failed to restore: %v", err)
		}

		if len(restored) != 3 {
			t.Errorf("Expected 3 restored items but got %v", guidsOf(restored))
		}

		parent := "group"
		got := listed(t, store, &parent)
		for _, child := range []string{"child-a", "child-b"} {
			if !slices.Contains(got, child) {
				t.Errorf("Expected %v to contain %s", got, child)
			}
		}
	})

	t.Run("Restoring a group leaves a child deleted earlier deleted", func(t *testing.T) {
		store := newTestStore(t)
		seedGroups(t, store)

		if err := store.DeleteItems(ctx, []string{"child-a"}); err != nil {
			t.Fatalf("failed to delete: %v", err)
		}
		time.Sleep(5 * time.Millisecond)
		if err := store.DeleteItems(ctx, []string{"group"}); err != nil {
			t.Fatalf("failed to delete: %v", err)
		}

		if _, err := store.RestoreItems(ctx, []string{"group"}); err != nil {
			t.Fatalf("failed to restore: %v", err)
		}

		parent := "group"
		got := listed(t, store, &parent)
		if slices.Contains(got, "child-a") {
			t.Errorf("Expected %v to leave child-a out", got)
		}
		if !slices.Contains(got, "child-b") {
			t.Errorf("Expected %v to contain child-b", got)
		}
	})

	t.Run("Deleted items stop showing in tags", func(t *testing.T) {
		store := newTestStore(t)

		if _, err := store.BulkUpdateItems(ctx, db.BulkUpdateItemsParams{Guids: []string{"a"}, Tags: new("gone")}); err != nil {
			t.Fatalf("failed to tag: %v", err)
		}
		if err := store.DeleteItems(ctx, []string{"a"}); err != nil {
			t.Fatalf("failed to delete: %v", err)
		}

		tags, err := store.GetTags(ctx)
		if err != nil {
			t.Fatalf("failed to get tags: %v", err)
		}
		if slices.Contains(tags, "gone") {
			t.Errorf("Expected %v to leave gone out", tags)
		}
	})
}

func TestDeleteAndRestoreItems_ScaleLinearly(t *testing.T) {
	const count = 8000
	store, conn := newTestStoreConn(t)
	ctx := userCtx()

	tx, err := conn.Begin()
	if err != nil {
		t.Fatalf("failed to begin: %v", err)
	}
	guids := make([]string, count)
	for i := range count {
		guids[i] = fmt.Sprintf("bulk-%d", i)
		if _, err := tx.Exec(`INSERT INTO items (guid, title, type, status, priority, user_id) VALUES (?, 'bulk', 'TASK', 'TODO', 'NORMAL', 1)`, guids[i]); err != nil {
			t.Fatalf("failed to insert: %v", err)
		}
	}
	if err := tx.Commit(); err != nil {
		t.Fatalf("failed to commit: %v", err)
	}

	start := time.Now()
	if err := store.DeleteItems(ctx, guids); err != nil {
		t.Fatalf("failed to delete: %v", err)
	}
	restored, err := store.RestoreItems(ctx, guids)
	if err != nil {
		t.Fatalf("failed to restore: %v", err)
	}
	elapsed := time.Since(start)

	if len(restored) != count {
		t.Fatalf("Expected %d restored items, got %d", count, len(restored))
	}
	if elapsed > 3*time.Second {
		t.Errorf("Expected deleting and restoring %d items to take well under 3s, took %v", count, elapsed)
	}
}

func TestIsInTree(t *testing.T) {
	ctx := userCtx()
	store := newTestStore(t)
	seedGroups(t, store)

	cases := []struct {
		name  string
		roots []string
		guid  string
		want  bool
	}{
		{"the root itself", []string{"group"}, "group", true},
		{"a child of the root", []string{"group"}, "child-a", true},
		{"a sibling of the root", []string{"group"}, "empty", false},
		{"the parent of the root", []string{"child-a"}, "group", false},
		{"any of several roots", []string{"a", "group"}, "child-b", true},
	}

	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			got, err := store.IsInTree(ctx, tc.roots, tc.guid)
			if err != nil {
				t.Fatalf("Didn't expect error but got: %v", err)
			}
			if got != tc.want {
				t.Errorf("expected %v, got %v", tc.want, got)
			}
		})
	}
}

func TestGetItemsDynamic_Recursive(t *testing.T) {
	store := newTestStore(t)
	seedGroups(t, store)

	items, err := store.GetItemsDynamic(userCtx(), db.GetIemsFilter{Type: []string{"GROUP"}, Recursive: true})
	if err != nil {
		t.Fatalf("Didn't expect error but got: %v", err)
	}

	if got := guidsOf(items); !slices.Contains(got, "group") || !slices.Contains(got, "empty") || len(got) != 2 {
		t.Errorf("expected both groups, got %v", got)
	}

	all, err := store.GetItemsDynamic(userCtx(), db.GetIemsFilter{Recursive: true})
	if err != nil {
		t.Fatalf("Didn't expect error but got: %v", err)
	}
	if !slices.Contains(guidsOf(all), "child-a") {
		t.Errorf("expected children to be listed, got %v", guidsOf(all))
	}
}

func TestAgents(t *testing.T) {
	ctx := userCtx()
	store := newTestStore(t)

	agent, err := store.CreateAgent(ctx, db.CreateAgentParams{Guid: "g1", Name: "claude", TokenHash: "hash-1"})
	if err != nil {
		t.Fatalf("failed to create: %v", err)
	}
	if agent.LastUsedAt.Valid {
		t.Error("expected a new agent to have never been used")
	}

	if _, err := store.CreateAgent(ctx, db.CreateAgentParams{Guid: "g2", Name: "claude", TokenHash: "hash-2"}); err == nil {
		t.Error("expected a duplicate name to be refused")
	}

	if _, err := store.TouchAgentByTokenHash(ctx, "nope"); !errors.Is(err, sql.ErrNoRows) {
		t.Errorf("expected an unknown hash to touch nothing, got %v", err)
	}
	if owner, err := store.TouchAgentByTokenHash(ctx, "hash-1"); err != nil || owner.Int64 != 1 {
		t.Errorf("expected the known hash to be touched and return its owner, got %v (%v)", owner, err)
	}

	agents, err := store.ListAgents(ctx)
	if err != nil || len(agents) != 1 || !agents[0].LastUsedAt.Valid {
		t.Fatalf("expected one used agent, got %+v (%v)", agents, err)
	}

	if removed, _ := store.DeleteAgent(ctx, "g1"); removed != 1 {
		t.Errorf("expected one agent removed, got %d", removed)
	}
	if _, err := store.TouchAgentByTokenHash(ctx, "hash-1"); !errors.Is(err, sql.ErrNoRows) {
		t.Error("expected a removed agent to stop matching")
	}
}

func otherCtx() context.Context {
	return userctx.With(context.Background(), 2)
}

func TestRepository_RequiresAUser(t *testing.T) {
	store := newTestStore(t)
	ctx := context.Background()

	if _, err := store.GetItemsDynamic(ctx, db.GetIemsFilter{Recursive: true}); !errors.Is(err, userctx.ErrNoUser) {
		t.Errorf("expected ErrNoUser listing without a user, got %v", err)
	}
	if _, err := store.GetItemByGuid(ctx, "a"); !errors.Is(err, userctx.ErrNoUser) {
		t.Errorf("expected ErrNoUser reading without a user, got %v", err)
	}
	if _, err := store.CreateItem(ctx, db.CreateItemParams{Guid: "x", Title: "x", Type: "TASK", Status: "TODO", Priority: "NORMAL"}); !errors.Is(err, userctx.ErrNoUser) {
		t.Errorf("expected ErrNoUser creating without a user, got %v", err)
	}
	if err := store.DeleteItems(ctx, []string{"a"}); !errors.Is(err, userctx.ErrNoUser) {
		t.Errorf("expected ErrNoUser deleting without a user, got %v", err)
	}
}

func TestRepository_IsolatesUsers(t *testing.T) {
	store := newTestStore(t)
	mine := userCtx()
	theirs := otherCtx()

	items, err := store.GetItemsDynamic(theirs, db.GetIemsFilter{Recursive: true})
	if err != nil || len(items) != 0 {
		t.Fatalf("expected the other user to see nothing, got %d (%v)", len(items), err)
	}

	if _, err := store.GetItemByGuid(theirs, "a"); !errors.Is(err, sql.ErrNoRows) {
		t.Errorf("expected another user's item to be not found, got %v", err)
	}

	title := "hacked"
	if _, err := store.UpdateItem(theirs, db.UpdateItemParams{Guid: "a", Title: sql.NullString{String: title, Valid: true}}); !errors.Is(err, sql.ErrNoRows) {
		t.Errorf("expected updating another user's item to fail, got %v", err)
	}

	changed, err := store.BulkUpdateItems(theirs, db.BulkUpdateItemsParams{Guids: []string{"a", "b"}, Title: &title})
	if err != nil || len(changed) != 0 {
		t.Errorf("expected a bulk update of another user's items to change nothing, got %d (%v)", len(changed), err)
	}

	if err := store.DeleteItems(theirs, []string{"a", "b", "c"}); err != nil {
		t.Fatalf("delete returned an error: %v", err)
	}
	restored, err := store.RestoreItems(theirs, []string{"a"})
	if err != nil || len(restored) != 0 {
		t.Errorf("expected nothing to restore, got %d (%v)", len(restored), err)
	}

	inTree, err := store.IsInTree(theirs, []string{"a"}, "a")
	if err != nil || inTree {
		t.Errorf("expected another user's tree to be empty, got %v (%v)", inTree, err)
	}

	still, err := store.GetItemsDynamic(mine, db.GetIemsFilter{Recursive: true})
	if err != nil || len(still) != 4 {
		t.Fatalf("expected the owner to keep all 4 items, got %d (%v)", len(still), err)
	}
	for _, i := range still {
		if i.Title == title {
			t.Errorf("item %s was modified by another user", i.Guid)
		}
	}

	created, err := store.CreateItem(theirs, db.CreateItemParams{Guid: "mine-now", Title: "t", Type: "TASK", Status: "TODO", Priority: "NORMAL", Tags: sql.NullString{String: "secret", Valid: true}})
	if err != nil || created.UserID.Int64 != 2 {
		t.Fatalf("expected the item to belong to user 2, got %+v (%v)", created, err)
	}

	tags, err := store.GetTags(mine)
	if err != nil || slices.Contains(tags, "secret") {
		t.Errorf("expected tags to be private, got %v (%v)", tags, err)
	}

	if _, err := store.GetItem(mine, created.ID); !errors.Is(err, sql.ErrNoRows) {
		t.Errorf("expected another user's item id to be not found, got %v", err)
	}
}

func TestRepository_IsolatesAgents(t *testing.T) {
	store := newTestStore(t)
	mine := userCtx()
	theirs := otherCtx()

	if _, err := store.CreateAgent(mine, db.CreateAgentParams{Guid: "g1", Name: "claude", TokenHash: "h1"}); err != nil {
		t.Fatalf("failed to create: %v", err)
	}
	if _, err := store.CreateAgent(theirs, db.CreateAgentParams{Guid: "g2", Name: "claude", TokenHash: "h2"}); err != nil {
		t.Fatalf("expected the same name to be allowed for another user: %v", err)
	}

	agents, err := store.ListAgents(theirs)
	if err != nil || len(agents) != 1 || agents[0].Guid != "g2" {
		t.Fatalf("expected only their own agent, got %+v (%v)", agents, err)
	}

	if removed, _ := store.DeleteAgent(theirs, "g1"); removed != 0 {
		t.Errorf("expected another user's agent to survive, removed %d", removed)
	}
}

func TestRepository_FirstUserAdoptsOrphans(t *testing.T) {
	store, rawConn := newTestStoreConn(t)
	conn := func(q string, args ...any) {
		t.Helper()
		if _, err := rawConn.Exec(q, args...); err != nil {
			t.Fatalf("exec failed: %v", err)
		}
	}
	conn(`UPDATE items SET user_id = NULL`)
	conn(`INSERT INTO agents (guid, name, token_hash) VALUES ('old', 'old-agent', 'old-hash')`)

	user, err := store.CreateUserAdoptingOrphans(context.Background(), db.CreateUserParams{Guid: "u3", Username: "first", PasswordHash: "x"})
	if err != nil {
		t.Fatalf("failed to create user: %v", err)
	}

	ctx := userctx.With(context.Background(), user.ID)
	items, err := store.GetItemsDynamic(ctx, db.GetIemsFilter{Recursive: true})
	if err != nil || len(items) != 4 {
		t.Errorf("expected the new user to adopt 4 items, got %d (%v)", len(items), err)
	}
	agents, err := store.ListAgents(ctx)
	if err != nil || len(agents) != 1 {
		t.Errorf("expected the new user to adopt the agent, got %+v (%v)", agents, err)
	}
}

func TestRepository_DeleteUserData(t *testing.T) {
	store, rawConn := newTestStoreConn(t)
	seedGroups(t, store)
	ctx := userCtx()

	if _, err := store.CreateAgent(ctx, db.CreateAgentParams{Guid: "g1", Name: "claude", TokenHash: "h1"}); err != nil {
		t.Fatalf("failed to create agent: %v", err)
	}
	if err := store.CreateSession(context.Background(), db.CreateSessionParams{UserID: 1, TokenHash: "s1", ExpiresAt: time.Now().Add(time.Hour)}); err != nil {
		t.Fatalf("failed to create session: %v", err)
	}
	if _, err := store.CreateItem(otherCtx(), db.CreateItemParams{Guid: "keep", Title: "keep", Type: "TASK", Status: "TODO", Priority: "NORMAL"}); err != nil {
		t.Fatalf("failed to create other item: %v", err)
	}

	if err := store.DeleteUserData(context.Background(), 1); err != nil {
		t.Fatalf("failed to delete user data: %v", err)
	}

	if _, err := store.GetUserByID(context.Background(), 1); !errors.Is(err, sql.ErrNoRows) {
		t.Errorf("expected the user to be gone, got %v", err)
	}
	if _, err := store.GetSessionUser(context.Background(), "s1"); !errors.Is(err, sql.ErrNoRows) {
		t.Errorf("expected the session to be gone, got %v", err)
	}
	var left int
	if err := rawConn.QueryRow(`SELECT COUNT(*) FROM items WHERE user_id = 1`).Scan(&left); err != nil || left != 0 {
		t.Errorf("expected no items left for the deleted user, got %d (%v)", left, err)
	}
	kept, err := store.GetItemsDynamic(otherCtx(), db.GetIemsFilter{Recursive: true})
	if err != nil || len(kept) != 1 {
		t.Errorf("expected the other user's item to survive, got %d (%v)", len(kept), err)
	}
}
