package db_test

import (
	"database/sql"
	"slices"
	"testing"

	"github.com/luizgustavojunqueira/blink/internal/db"
)

func dueOf(t *testing.T, store *db.SQLStore, guid string) sql.NullString {
	t.Helper()

	item, err := store.GetItemByGuid(userCtx(), guid)
	if err != nil {
		t.Fatalf("failed to get %s: %v", guid, err)
	}
	return item.DueDate
}

func setDue(t *testing.T, store *db.SQLStore, guid string, due any) {
	t.Helper()

	if _, err := store.UpdateItem(userCtx(), db.UpdateItemParams{Guid: guid, DueDate: due}); err != nil {
		t.Fatalf("failed to set due date of %s: %v", guid, err)
	}
}

func TestDueDate_CreateAndUpdate(t *testing.T) {
	store := newTestStore(t)

	created, err := store.CreateItem(userCtx(), db.CreateItemParams{
		Guid: "due", Title: "with a date", Type: "TASK", Status: "TODO", Priority: "NORMAL",
		DueDate: sql.NullString{String: "2026-11-20", Valid: true},
	})
	if err != nil {
		t.Fatalf("failed to create: %v", err)
	}
	if created.DueDate.String != "2026-11-20" {
		t.Errorf("Expected the created item to keep its due date, got %+v", created.DueDate)
	}

	setDue(t, store, "b", "2026-12-01")
	if got := dueOf(t, store, "b"); got.String != "2026-12-01" {
		t.Errorf("Expected the due date to be set, got %+v", got)
	}

	if _, err := store.UpdateItem(userCtx(), db.UpdateItemParams{Guid: "b", Status: sql.NullString{String: "DONE", Valid: true}}); err != nil {
		t.Fatalf("failed to update status: %v", err)
	}
	if got := dueOf(t, store, "b"); got.String != "2026-12-01" {
		t.Errorf("Expected an update without a due date to keep it, got %+v", got)
	}

	setDue(t, store, "b", "")
	if got := dueOf(t, store, "b"); got.Valid {
		t.Errorf("Expected an empty due date to clear it, got %+v", got)
	}
}

func TestDueDate_History(t *testing.T) {
	store := newTestStore(t)

	setDue(t, store, "b", "2026-12-01")
	setDue(t, store, "b", "")

	var due []db.ListItemHistoryRow
	for _, row := range historyFields(userCtx(), t, store, "b") {
		if row.Field == "due" {
			due = append(due, row)
		}
	}

	if len(due) != 2 {
		t.Fatalf("Expected 2 due rows, got %+v", due)
	}
	values := []string{due[0].OldValue.String + ">" + due[0].NewValue.String, due[1].OldValue.String + ">" + due[1].NewValue.String}
	if !slices.Contains(values, ">2026-12-01") || !slices.Contains(values, "2026-12-01>") {
		t.Errorf("Expected the set and the clear to be recorded, got %v", values)
	}
}

func TestDueDate_BulkUpdate(t *testing.T) {
	store := newTestStore(t)

	items, err := store.BulkUpdateItems(userCtx(), db.BulkUpdateItemsParams{Guids: []string{"a", "b"}, DueDate: str("2026-11-30")})
	if err != nil {
		t.Fatalf("failed to bulk set: %v", err)
	}
	for _, item := range items {
		if item.DueDate.String != "2026-11-30" {
			t.Errorf("Expected %s to come back with its due date, got %+v", item.Guid, item.DueDate)
		}
	}
	if got := dueOf(t, store, "c"); got.Valid {
		t.Errorf("Expected unmarked items to keep no due date, got %+v", got)
	}

	if _, err := store.BulkUpdateItems(userCtx(), db.BulkUpdateItemsParams{Guids: []string{"a"}, DueDate: str("")}); err != nil {
		t.Fatalf("failed to bulk clear: %v", err)
	}
	if got := dueOf(t, store, "a"); got.Valid {
		t.Errorf("Expected an empty due date to clear it, got %+v", got)
	}
	if got := dueOf(t, store, "b"); got.String != "2026-11-30" {
		t.Errorf("Expected b to keep its due date, got %+v", got)
	}
}

func TestDueDate_FilterAndOrder(t *testing.T) {
	store := newTestStore(t)
	setDue(t, store, "a", "2026-11-10")
	setDue(t, store, "b", "2026-11-20")
	setDue(t, store, "c", "2026-11-15")

	list := func(filter db.GetIemsFilter) []string {
		t.Helper()
		items, err := store.GetItemsDynamic(userCtx(), filter)
		if err != nil {
			t.Fatalf("failed to list: %v", err)
		}
		return guidsOf(items)
	}

	if got := list(db.GetIemsFilter{DueTo: str("2026-11-15")}); !slices.Equal(sorted(got), []string{"a", "c"}) {
		t.Errorf("Expected items due on or before the 15th, got %v", got)
	}
	if got := list(db.GetIemsFilter{DueFrom: str("2026-11-15"), DueTo: str("2026-11-15")}); !slices.Equal(got, []string{"c"}) {
		t.Errorf("Expected only the item due on the 15th, got %v", got)
	}
	if got := list(db.GetIemsFilter{DueFrom: str("2026-11-16")}); !slices.Equal(got, []string{"b"}) {
		t.Errorf("Expected items due from the 16th, got %v", got)
	}

	got := list(db.GetIemsFilter{Order: []db.OrderBy{{Field: "due"}}})
	if !slices.Equal(got[:3], []string{"a", "c", "b"}) {
		t.Errorf("Expected the earliest due dates first and items without one last, got %v", got)
	}
}

func sorted(values []string) []string {
	out := slices.Clone(values)
	slices.Sort(out)
	return out
}
