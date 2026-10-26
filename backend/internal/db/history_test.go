package db_test

import (
	"context"
	"database/sql"
	"testing"

	"github.com/luizgustavojunqueira/blink/internal/db"
	"github.com/luizgustavojunqueira/blink/internal/userctx"
)

func str(s string) *string { return &s }

func historyFields(ctx context.Context, t *testing.T, store *db.SQLStore, guid string) []db.ListItemHistoryRow {
	t.Helper()

	rows, err := store.ListItemHistory(ctx, guid)
	if err != nil {
		t.Fatalf("Didn't expect error but got: %v", err)
	}
	return rows
}

func TestItemHistory_Create(t *testing.T) {
	store := newTestStore(t)

	if _, err := store.CreateItem(userCtx(), db.CreateItemParams{
		Guid: "new", Title: "fresh", Type: "TASK", Status: "TODO", Priority: "NORMAL",
	}); err != nil {
		t.Fatalf("Didn't expect error but got: %v", err)
	}

	rows := historyFields(userCtx(), t, store, "new")
	if len(rows) != 1 || rows[0].Field != "created" || rows[0].NewValue.String != "fresh" || rows[0].Actor.String != "tester" {
		t.Errorf("Unexpected history: %+v", rows)
	}
}

func TestItemHistory_UpdateItem(t *testing.T) {
	t.Run("Records one row per changed field with the actor", func(t *testing.T) {
		store := newTestStore(t)

		if _, err := store.UpdateItem(userCtx(), db.UpdateItemParams{
			Guid:   "b",
			Title:  sql.NullString{String: "bravo 2", Valid: true},
			Status: sql.NullString{String: "DONE", Valid: true},
		}); err != nil {
			t.Fatalf("Didn't expect error but got: %v", err)
		}

		got := map[string]db.ListItemHistoryRow{}
		for _, r := range historyFields(userCtx(), t, store, "b") {
			got[r.Field] = r
		}

		if len(got) != 2 {
			t.Fatalf("Expected 2 rows but got %+v", got)
		}
		if got["title"].OldValue.String != "bravo" || got["title"].NewValue.String != "bravo 2" {
			t.Errorf("Unexpected title row: %+v", got["title"])
		}
		if got["status"].OldValue.String != "TODO" || got["status"].NewValue.String != "DONE" || got["status"].Actor.String != "tester" {
			t.Errorf("Unexpected status row: %+v", got["status"])
		}
	})

	t.Run("A no-op update records nothing", func(t *testing.T) {
		store := newTestStore(t)

		if _, err := store.UpdateItem(userCtx(), db.UpdateItemParams{
			Guid:  "b",
			Title: sql.NullString{String: "bravo", Valid: true},
		}); err != nil {
			t.Fatalf("Didn't expect error but got: %v", err)
		}

		if rows := historyFields(userCtx(), t, store, "b"); len(rows) != 0 {
			t.Errorf("Expected no rows but got %+v", rows)
		}
	})

	t.Run("A failed update records nothing", func(t *testing.T) {
		store := newTestStore(t)
		other := userctx.With(context.Background(), 2)

		if _, err := store.UpdateItem(other, db.UpdateItemParams{
			Guid:  "b",
			Title: sql.NullString{String: "stolen", Valid: true},
		}); err == nil {
			t.Fatal("Expected an error")
		}

		if rows := historyFields(userCtx(), t, store, "b"); len(rows) != 0 {
			t.Errorf("Expected no rows but got %+v", rows)
		}
	})
}

func TestItemHistory_BulkUpdateItems(t *testing.T) {
	store := newTestStore(t)

	if _, err := store.BulkUpdateItems(userCtx(), db.BulkUpdateItemsParams{
		Guids:    []string{"a", "b"},
		Status:   str("DONE"),
		Priority: str("LOW"),
	}); err != nil {
		t.Fatalf("Didn't expect error but got: %v", err)
	}

	a := historyFields(userCtx(), t, store, "a")
	if len(a) != 1 || a[0].Field != "priority" || a[0].OldValue.String != "HIGH" || a[0].NewValue.String != "LOW" {
		t.Errorf("Unexpected history for a (status and priority were already partly equal): %+v", a)
	}

	b := historyFields(userCtx(), t, store, "b")
	if len(b) != 1 || b[0].Field != "status" {
		t.Errorf("Unexpected history for b: %+v", b)
	}
}

func TestItemHistory_DeleteAndRestore(t *testing.T) {
	store := newTestStore(t)
	seedGroups(t, store)

	if err := store.DeleteItems(userCtx(), []string{"group"}); err != nil {
		t.Fatalf("Didn't expect error but got: %v", err)
	}

	for _, guid := range []string{"group", "child-a", "child-b"} {
		rows := historyFields(userCtx(), t, store, guid)
		if rows[0].Field != "deleted" {
			t.Errorf("Expected %s to end with a deleted row but got %+v", guid, rows)
		}
	}

	if _, err := store.RestoreItems(userCtx(), []string{"group"}); err != nil {
		t.Fatalf("Didn't expect error but got: %v", err)
	}

	for _, guid := range []string{"group", "child-a", "child-b"} {
		rows := historyFields(userCtx(), t, store, guid)
		if rows[0].Field != "restored" || rows[1].Field != "deleted" {
			t.Errorf("Expected %s to end with restored after deleted but got %+v", guid, rows)
		}
	}
}

func TestItemHistory_Isolation(t *testing.T) {
	store := newTestStore(t)

	if _, err := store.UpdateItem(userCtx(), db.UpdateItemParams{
		Guid:  "b",
		Title: sql.NullString{String: "bravo 2", Valid: true},
	}); err != nil {
		t.Fatalf("Didn't expect error but got: %v", err)
	}

	other := userctx.With(context.Background(), 2)
	if rows := historyFields(other, t, store, "b"); len(rows) != 0 {
		t.Errorf("Expected another user to see nothing but got %+v", rows)
	}
}

func TestItemHistory_DeleteUserData(t *testing.T) {
	store := newTestStore(t)

	if _, err := store.UpdateItem(userCtx(), db.UpdateItemParams{
		Guid:  "b",
		Title: sql.NullString{String: "bravo 2", Valid: true},
	}); err != nil {
		t.Fatalf("Didn't expect error but got: %v", err)
	}

	if err := store.DeleteUserData(context.Background(), 1); err != nil {
		t.Fatalf("Didn't expect error but got: %v", err)
	}
}
