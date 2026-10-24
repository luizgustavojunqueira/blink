package service_test

import (
	"context"
	"database/sql"
	"errors"
	"strings"
	"testing"

	"github.com/luizgustavojunqueira/blink/internal/db"
	"github.com/luizgustavojunqueira/blink/internal/db/migrations"
	"github.com/luizgustavojunqueira/blink/internal/models"
	"github.com/luizgustavojunqueira/blink/internal/service"
	"github.com/luizgustavojunqueira/blink/internal/userctx"
	_ "modernc.org/sqlite"
)

func newAuthService(t *testing.T) (*service.AuthService, *service.Service, *db.SQLStore) {
	t.Helper()

	conn, err := sql.Open("sqlite", ":memory:?_pragma=foreign_keys(1)")
	if err != nil {
		t.Fatalf("failed to open database: %v", err)
	}
	conn.SetMaxOpenConns(1)
	t.Cleanup(func() { _ = conn.Close() })

	entries, err := migrations.FS.ReadDir(".")
	if err != nil {
		t.Fatalf("failed to list migrations: %v", err)
	}
	for _, e := range entries {
		if !strings.HasSuffix(e.Name(), ".up.sql") {
			continue
		}
		schema, err := migrations.FS.ReadFile(e.Name())
		if err != nil {
			t.Fatalf("failed to read %s: %v", e.Name(), err)
		}
		if _, err := conn.Exec(string(schema)); err != nil {
			t.Fatalf("failed to apply %s: %v", e.Name(), err)
		}
	}

	store := db.NewRepository(conn)
	auth, err := service.NewAuthService(store)
	if err != nil {
		t.Fatalf("failed to create auth service: %v", err)
	}

	return auth, service.NewService(store), store
}

func creds(username, password string) models.Credentials {
	return models.Credentials{Username: username, Password: password}
}

func TestAuth_SignupAndAuthenticate(t *testing.T) {
	auth, _, _ := newAuthService(t)
	ctx := context.Background()

	user, session, err := auth.Signup(ctx, creds("  alice  ", "password123"))
	if err != nil {
		t.Fatalf("Didn't expect error but got: %v", err)
	}
	if user.Username != "alice" {
		t.Errorf("expected the username to be trimmed, got %q", user.Username)
	}

	id, got, err := auth.Authenticate(ctx, session.Token)
	if err != nil || got.Username != "alice" || id == 0 {
		t.Fatalf("expected the session to authenticate alice, got %v %+v (%v)", id, got, err)
	}

	for _, token := range []string{"", "nope", "bls_" + strings.Repeat("0", 64)} {
		if _, _, err := auth.Authenticate(ctx, token); !errors.Is(err, service.ErrUnauthorized) {
			t.Errorf("expected %q to be unauthorized, got %v", token, err)
		}
	}
}

func TestAuth_SignupValidation(t *testing.T) {
	auth, _, _ := newAuthService(t)
	ctx := context.Background()

	cases := map[string]models.Credentials{
		"short username": creds("ab", "password123"),
		"long username":  creds(strings.Repeat("a", 33), "password123"),
		"bad characters": creds("bad name!", "password123"),
		"short password": creds("alice", "short"),
		"long password":  creds("alice", strings.Repeat("a", 129)),
	}

	for name, c := range cases {
		t.Run(name, func(t *testing.T) {
			_, _, err := auth.Signup(ctx, c)
			var v models.ValidationError
			if !errors.As(err, &v) {
				t.Errorf("expected a validation error, got %v", err)
			}
		})
	}
}

func TestAuth_UsernamesAreUniqueIgnoringCase(t *testing.T) {
	auth, _, _ := newAuthService(t)
	ctx := context.Background()

	if _, _, err := auth.Signup(ctx, creds("Alice", "password123")); err != nil {
		t.Fatalf("Didn't expect error but got: %v", err)
	}

	if _, _, err := auth.Signup(ctx, creds("alice", "password123")); !errors.Is(err, service.ErrUsernameTaken) {
		t.Errorf("expected ErrUsernameTaken, got %v", err)
	}
}

func TestAuth_Login(t *testing.T) {
	auth, _, _ := newAuthService(t)
	ctx := context.Background()

	if _, _, err := auth.Signup(ctx, creds("alice", "password123")); err != nil {
		t.Fatalf("Didn't expect error but got: %v", err)
	}

	if _, session, err := auth.Login(ctx, creds("ALICE", "password123")); err != nil || session.Token == "" {
		t.Errorf("expected login to work ignoring case, got %v", err)
	}

	for name, c := range map[string]models.Credentials{
		"wrong password": creds("alice", "wrong-password"),
		"unknown user":   creds("bob", "password123"),
		"empty":          creds("", ""),
		"too long input": creds("alice", strings.Repeat("a", 500)),
	} {
		t.Run(name, func(t *testing.T) {
			if _, _, err := auth.Login(ctx, c); !errors.Is(err, models.ErrInvalidCredentials) {
				t.Errorf("expected ErrInvalidCredentials, got %v", err)
			}
		})
	}
}

func TestAuth_Logout(t *testing.T) {
	auth, _, _ := newAuthService(t)
	ctx := context.Background()

	_, session, err := auth.Signup(ctx, creds("alice", "password123"))
	if err != nil {
		t.Fatalf("Didn't expect error but got: %v", err)
	}

	if err := auth.Logout(ctx, session.Token); err != nil {
		t.Fatalf("Didn't expect error but got: %v", err)
	}

	if _, _, err := auth.Authenticate(ctx, session.Token); !errors.Is(err, service.ErrUnauthorized) {
		t.Errorf("expected the session to be gone, got %v", err)
	}
}

func TestAuth_ChangePassword(t *testing.T) {
	auth, _, _ := newAuthService(t)
	ctx := context.Background()

	_, old, err := auth.Signup(ctx, creds("alice", "password123"))
	if err != nil {
		t.Fatalf("Didn't expect error but got: %v", err)
	}
	id, _, _ := auth.Authenticate(ctx, old.Token)

	_, err = auth.ChangePassword(ctx, id, models.ChangePasswordRequest{CurrentPassword: "wrong", NewPassword: "newpassword1"})
	if !errors.Is(err, models.ErrWrongPassword) {
		t.Fatalf("expected ErrWrongPassword, got %v", err)
	}

	fresh, err := auth.ChangePassword(ctx, id, models.ChangePasswordRequest{CurrentPassword: "password123", NewPassword: "newpassword1"})
	if err != nil {
		t.Fatalf("Didn't expect error but got: %v", err)
	}

	if _, _, err := auth.Authenticate(ctx, old.Token); !errors.Is(err, service.ErrUnauthorized) {
		t.Error("expected the old session to be revoked")
	}
	if _, _, err := auth.Authenticate(ctx, fresh.Token); err != nil {
		t.Errorf("expected the new session to work, got %v", err)
	}
	if _, _, err := auth.Login(ctx, creds("alice", "password123")); !errors.Is(err, models.ErrInvalidCredentials) {
		t.Error("expected the old password to stop working")
	}
	if _, _, err := auth.Login(ctx, creds("alice", "newpassword1")); err != nil {
		t.Errorf("expected the new password to work, got %v", err)
	}
}

func TestAuth_DeleteAccount(t *testing.T) {
	auth, svc, _ := newAuthService(t)
	ctx := context.Background()

	_, session, err := auth.Signup(ctx, creds("alice", "password123"))
	if err != nil {
		t.Fatalf("Didn't expect error but got: %v", err)
	}
	id, _, _ := auth.Authenticate(ctx, session.Token)
	userCtx := userctx.With(ctx, id)

	if _, err := svc.CreateItem(userCtx, models.CreateItemRequest{Title: "t", Type: models.Task, Status: models.ToDo, Priority: models.Normal}); err != nil {
		t.Fatalf("Didn't expect error but got: %v", err)
	}

	if err := auth.DeleteAccount(ctx, id, models.DeleteAccountRequest{Password: "wrong"}); !errors.Is(err, models.ErrWrongPassword) {
		t.Fatalf("expected ErrWrongPassword, got %v", err)
	}

	if err := auth.DeleteAccount(ctx, id, models.DeleteAccountRequest{Password: "password123"}); err != nil {
		t.Fatalf("Didn't expect error but got: %v", err)
	}

	if _, _, err := auth.Authenticate(ctx, session.Token); !errors.Is(err, service.ErrUnauthorized) {
		t.Error("expected the session to be gone")
	}
	if _, _, err := auth.Login(ctx, creds("alice", "password123")); !errors.Is(err, models.ErrInvalidCredentials) {
		t.Error("expected the account to be gone")
	}
	if _, _, err := auth.Signup(ctx, creds("alice", "password123")); err != nil {
		t.Errorf("expected the username to be free again, got %v", err)
	}
}

func TestAuth_UsersCannotSeeEachOthersItems(t *testing.T) {
	auth, svc, _ := newAuthService(t)
	ctx := context.Background()

	_, aliceSession, _ := auth.Signup(ctx, creds("alice", "password123"))
	_, bobSession, _ := auth.Signup(ctx, creds("bob", "password123"))
	aliceID, _, _ := auth.Authenticate(ctx, aliceSession.Token)
	bobID, _, _ := auth.Authenticate(ctx, bobSession.Token)

	aliceCtx := userctx.With(ctx, aliceID)
	bobCtx := userctx.With(ctx, bobID)

	item, err := svc.CreateItem(aliceCtx, models.CreateItemRequest{Title: "private", Type: models.Group, Status: models.ToDo, Priority: models.Normal})
	if err != nil {
		t.Fatalf("Didn't expect error but got: %v", err)
	}

	items, err := svc.GetItems(bobCtx, models.GetItemRequest{Recursive: true})
	if err != nil || len(items) != 0 {
		t.Errorf("expected bob to see nothing, got %d (%v)", len(items), err)
	}

	if _, err := svc.CreateItem(bobCtx, models.CreateItemRequest{Title: "child", Type: models.Task, Status: models.ToDo, Priority: models.Normal, ParentGUID: &item.GUID}); err == nil {
		t.Error("expected bob to be unable to create an item under alice's group")
	}

	title := "hacked"
	if _, err := svc.UpdateItem(bobCtx, models.UpdateItemRequest{GUID: item.GUID, Title: &title}); err == nil {
		t.Error("expected bob to be unable to update alice's item")
	}

	agent, err := svc.CreateAgent(aliceCtx, models.CreateAgentRequest{Name: "claude"})
	if err != nil {
		t.Fatalf("Didn't expect error but got: %v", err)
	}
	owner, ok, err := svc.VerifyAgentToken(ctx, agent.Token)
	if err != nil || !ok || owner != aliceID {
		t.Errorf("expected the token to resolve to alice, got %d %v (%v)", owner, ok, err)
	}
	if err := svc.DeleteAgent(bobCtx, agent.GUID); !errors.Is(err, service.ErrAgentNotFound) {
		t.Errorf("expected bob to be unable to revoke alice's agent, got %v", err)
	}
}
