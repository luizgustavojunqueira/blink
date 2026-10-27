package db_test

import (
	"context"
	"database/sql"
	"errors"
	"slices"
	"testing"
	"time"

	"github.com/luizgustavojunqueira/blink/internal/db"
)

func TestGetItem(t *testing.T) {
	ctx := userCtx()
	store := newTestStore(t)

	byGuid, err := store.GetItemByGuid(ctx, "a")
	if err != nil {
		t.Fatalf("failed to get by guid: %v", err)
	}
	if byGuid.Title != "alpha" || byGuid.Status != "DONE" || byGuid.Priority != "HIGH" || byGuid.Type != "TASK" {
		t.Errorf("unexpected item: %+v", byGuid)
	}

	byID, err := store.GetItem(ctx, byGuid.ID)
	if err != nil {
		t.Fatalf("failed to get by id: %v", err)
	}
	if byID.Guid != "a" || byID.Title != "alpha" {
		t.Errorf("expected the same item by id, got %+v", byID)
	}

	if _, err := store.GetItemByGuid(ctx, "missing"); !errors.Is(err, sql.ErrNoRows) {
		t.Errorf("expected ErrNoRows for an unknown guid, got %v", err)
	}
	if _, err := store.GetItem(ctx, 9999); !errors.Is(err, sql.ErrNoRows) {
		t.Errorf("expected ErrNoRows for an unknown id, got %v", err)
	}
}

func TestCreateItem(t *testing.T) {
	ctx := userCtx()
	store := newTestStore(t)

	parent, err := store.GetItemByGuid(ctx, "a")
	if err != nil {
		t.Fatalf("failed to get parent: %v", err)
	}

	created, err := store.CreateItem(ctx, db.CreateItemParams{
		Guid:        "new",
		Title:       "new task",
		Description: sql.NullString{String: "notes", Valid: true},
		Type:        "TASK",
		ParentID:    sql.NullInt64{Int64: parent.ID, Valid: true},
		Status:      "IN_PROGRESS",
		Priority:    "URGENT",
		Tags:        sql.NullString{String: "work,home", Valid: true},
	})
	if err != nil {
		t.Fatalf("failed to create: %v", err)
	}

	got, err := store.GetItemByGuid(ctx, "new")
	if err != nil {
		t.Fatalf("failed to read back: %v", err)
	}
	if got.ID != created.ID || got.Title != "new task" || got.Description.String != "notes" ||
		got.Status != "IN_PROGRESS" || got.Priority != "URGENT" || got.Tags.String != "work,home" ||
		got.ParentID.Int64 != parent.ID {
		t.Errorf("unexpected stored item: %+v", got)
	}
	if got.UserID.Int64 != 1 {
		t.Errorf("expected the item to belong to the context user, got %v", got.UserID)
	}
	if got.CreatedAt.IsZero() || got.UpdatedAt.IsZero() {
		t.Errorf("expected timestamps to be set, got created %v updated %v", got.CreatedAt, got.UpdatedAt)
	}
	if got.CompletedAt.Valid || got.DeletedAt.Valid {
		t.Errorf("expected a new item to be neither completed nor deleted, got %+v", got)
	}

	if _, err := store.CreateItem(ctx, db.CreateItemParams{Guid: "new", Title: "dup", Type: "TASK", Status: "TODO", Priority: "NORMAL"}); err == nil {
		t.Error("expected a duplicate guid to be refused")
	}
}

func TestUpdateItem(t *testing.T) {
	ctx := userCtx()
	store, conn := newTestStoreConn(t)

	if _, err := conn.Exec(`UPDATE items SET updated_at = '2020-01-01 00:00:00'`); err != nil {
		t.Fatalf("failed to age items: %v", err)
	}

	updated, err := store.UpdateItem(ctx, db.UpdateItemParams{Guid: "b", Status: sql.NullString{String: "DONE", Valid: true}})
	if err != nil {
		t.Fatalf("failed to update status: %v", err)
	}
	if updated.Status != "DONE" || updated.Title != "bravo" || updated.Priority != "LOW" {
		t.Errorf("expected only the status to change, got %+v", updated)
	}
	if !updated.UpdatedAt.After(time.Date(2020, 1, 1, 0, 0, 0, 0, time.UTC)) {
		t.Errorf("expected updated_at to move forward, got %v", updated.UpdatedAt)
	}

	parent, err := store.GetItemByGuid(ctx, "a")
	if err != nil {
		t.Fatalf("failed to get parent: %v", err)
	}
	completed := time.Date(2026, 3, 4, 5, 6, 7, 0, time.UTC)

	if _, err := store.UpdateItem(ctx, db.UpdateItemParams{
		Guid:        "b",
		Title:       sql.NullString{String: "renamed", Valid: true},
		Description: sql.NullString{String: "details", Valid: true},
		Priority:    sql.NullString{String: "HIGH", Valid: true},
		Tags:        sql.NullString{String: "x,y", Valid: true},
		ParentID:    sql.NullInt64{Int64: parent.ID, Valid: true},
		CompletedAt: sql.NullTime{Time: completed, Valid: true},
	}); err != nil {
		t.Fatalf("failed to update all fields: %v", err)
	}

	got, err := store.GetItemByGuid(ctx, "b")
	if err != nil {
		t.Fatalf("failed to read back: %v", err)
	}
	if got.Title != "renamed" || got.Description.String != "details" || got.Priority != "HIGH" ||
		got.Tags.String != "x,y" || got.ParentID.Int64 != parent.ID || got.Status != "DONE" {
		t.Errorf("unexpected stored item: %+v", got)
	}
	if !got.CompletedAt.Valid || !got.CompletedAt.Time.Equal(completed) {
		t.Errorf("expected completed_at %v, got %v", completed, got.CompletedAt)
	}

	kept, err := store.UpdateItem(ctx, db.UpdateItemParams{Guid: "b"})
	if err != nil {
		t.Fatalf("failed empty update: %v", err)
	}
	if kept.Title != "renamed" || kept.Description.String != "details" || kept.Tags.String != "x,y" ||
		kept.ParentID.Int64 != parent.ID || !kept.CompletedAt.Valid {
		t.Errorf("expected null args to keep current values, got %+v", kept)
	}

	if _, err := store.UpdateItem(ctx, db.UpdateItemParams{Guid: "missing", Title: sql.NullString{String: "x", Valid: true}}); !errors.Is(err, sql.ErrNoRows) {
		t.Errorf("expected ErrNoRows for an unknown guid, got %v", err)
	}
}

func TestGetTags(t *testing.T) {
	ctx := userCtx()
	store := newTestStore(t)

	tags, err := store.GetTags(ctx)
	if err != nil || len(tags) != 0 {
		t.Fatalf("expected no tags yet, got %v (%v)", tags, err)
	}

	for guid, value := range map[string]string{
		"t1":   " work, home",
		"t2":   "home,urgent",
		"t3":   "a,,b",
		"t4":   "",
		"gone": "deleted-only",
	} {
		if _, err := store.CreateItem(ctx, db.CreateItemParams{Guid: guid, Title: guid, Type: "TASK", Status: "TODO", Priority: "NORMAL", Tags: sql.NullString{String: value, Valid: true}}); err != nil {
			t.Fatalf("failed to create %s: %v", guid, err)
		}
	}
	if err := store.DeleteItems(ctx, []string{"gone"}); err != nil {
		t.Fatalf("failed to delete: %v", err)
	}

	tags, err = store.GetTags(ctx)
	if err != nil {
		t.Fatalf("failed to get tags: %v", err)
	}
	want := []string{"a", "b", "home", "urgent", "work"}
	if !slices.Equal(tags, want) {
		t.Errorf("expected %v, got %v", want, tags)
	}
}

func TestUsers(t *testing.T) {
	ctx := context.Background()
	store := newTestStore(t)

	count, err := store.CountUsers(ctx)
	if err != nil || count != 2 {
		t.Fatalf("expected 2 seeded users, got %d (%v)", count, err)
	}

	created, err := store.CreateUser(ctx, db.CreateUserParams{Guid: "u3", Username: "Third", PasswordHash: "h"})
	if err != nil {
		t.Fatalf("failed to create user: %v", err)
	}
	if created.ID == 0 || created.Username != "Third" || created.CreatedAt.IsZero() {
		t.Errorf("unexpected user: %+v", created)
	}

	if _, err := store.CreateUser(ctx, db.CreateUserParams{Guid: "u4", Username: "THIRD", PasswordHash: "h"}); err == nil {
		t.Error("expected a username differing only in case to be refused")
	}

	found, err := store.GetUserByUsername(ctx, "third")
	if err != nil || found.ID != created.ID {
		t.Errorf("expected a case-insensitive lookup to find the user, got %+v (%v)", found, err)
	}
	if _, err := store.GetUserByUsername(ctx, "nobody"); !errors.Is(err, sql.ErrNoRows) {
		t.Errorf("expected ErrNoRows for an unknown username, got %v", err)
	}

	if err := store.UpdateUserPassword(ctx, db.UpdateUserPasswordParams{ID: created.ID, PasswordHash: "new-hash"}); err != nil {
		t.Fatalf("failed to update password: %v", err)
	}
	byID, err := store.GetUserByID(ctx, created.ID)
	if err != nil || byID.PasswordHash != "new-hash" {
		t.Errorf("expected the new hash, got %+v (%v)", byID, err)
	}
	other, err := store.GetUserByID(ctx, 1)
	if err != nil || other.PasswordHash != "x" {
		t.Errorf("expected other users' hashes untouched, got %+v (%v)", other, err)
	}

	if _, err := store.GetUserByID(ctx, 9999); !errors.Is(err, sql.ErrNoRows) {
		t.Errorf("expected ErrNoRows for an unknown id, got %v", err)
	}
}

func TestSessions(t *testing.T) {
	ctx := context.Background()
	store := newTestStore(t)
	now := time.Now().UTC().Truncate(time.Second)

	sessions := []db.CreateSessionParams{
		{UserID: 1, TokenHash: "live", ExpiresAt: now.Add(time.Hour)},
		{UserID: 1, TokenHash: "expired", ExpiresAt: now.Add(-time.Hour)},
		{UserID: 1, TokenHash: "second", ExpiresAt: now.Add(time.Hour)},
		{UserID: 2, TokenHash: "other", ExpiresAt: now.Add(time.Hour)},
	}
	for _, s := range sessions {
		if err := store.CreateSession(ctx, s); err != nil {
			t.Fatalf("failed to create session %s: %v", s.TokenHash, err)
		}
	}

	if err := store.CreateSession(ctx, db.CreateSessionParams{UserID: 2, TokenHash: "live", ExpiresAt: now}); err == nil {
		t.Error("expected a duplicate token hash to be refused")
	}

	row, err := store.GetSessionUser(ctx, "live")
	if err != nil {
		t.Fatalf("failed to get session user: %v", err)
	}
	if row.ID != 1 || row.Guid != "u1" || row.Username != "tester" || !row.ExpiresAt.Equal(now.Add(time.Hour)) {
		t.Errorf("unexpected session user: %+v", row)
	}
	if _, err := store.GetSessionUser(ctx, "unknown"); !errors.Is(err, sql.ErrNoRows) {
		t.Errorf("expected ErrNoRows for an unknown token, got %v", err)
	}

	if err := store.DeleteExpiredSessions(ctx, now); err != nil {
		t.Fatalf("failed to delete expired: %v", err)
	}
	if _, err := store.GetSessionUser(ctx, "expired"); !errors.Is(err, sql.ErrNoRows) {
		t.Errorf("expected the expired session to be gone, got %v", err)
	}
	if _, err := store.GetSessionUser(ctx, "live"); err != nil {
		t.Errorf("expected the live session to survive, got %v", err)
	}

	if err := store.DeleteSession(ctx, "live"); err != nil {
		t.Fatalf("failed to delete session: %v", err)
	}
	if _, err := store.GetSessionUser(ctx, "live"); !errors.Is(err, sql.ErrNoRows) {
		t.Errorf("expected the deleted session to be gone, got %v", err)
	}

	if err := store.DeleteUserSessions(ctx, 1); err != nil {
		t.Fatalf("failed to delete user sessions: %v", err)
	}
	if _, err := store.GetSessionUser(ctx, "second"); !errors.Is(err, sql.ErrNoRows) {
		t.Errorf("expected all of the user's sessions to be gone, got %v", err)
	}
	if _, err := store.GetSessionUser(ctx, "other"); err != nil {
		t.Errorf("expected another user's session to survive, got %v", err)
	}
}
