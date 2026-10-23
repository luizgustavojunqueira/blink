package service_test

import (
	"context"
	"errors"
	"strings"
	"testing"

	"github.com/luizgustavojunqueira/blink/internal/models"
	"github.com/luizgustavojunqueira/blink/internal/service"
)

func TestService_CreateAgent(t *testing.T) {
	ctx := context.Background()

	t.Run("The token is returned once and only its hash is stored", func(t *testing.T) {
		repo := &MockRepository{}
		svc := service.NewService(repo)

		resp, err := svc.CreateAgent(ctx, models.CreateAgentRequest{Name: " claude "})
		if err != nil {
			t.Fatalf("Didn't expect error but got: %v", err)
		}

		if !strings.HasPrefix(resp.Token, "blk_") || len(resp.Token) < 40 {
			t.Errorf("unexpected token %q", resp.Token)
		}
		if resp.Name != "claude" {
			t.Errorf("expected the name to be trimmed, got %q", resp.Name)
		}
		for hash := range repo.agentsByHash {
			if hash == resp.Token || strings.Contains(hash, resp.Token) {
				t.Error("the token must not be stored in plain text")
			}
		}
	})

	t.Run("Two agents never share a token", func(t *testing.T) {
		svc := service.NewService(&MockRepository{})

		a, _ := svc.CreateAgent(ctx, models.CreateAgentRequest{Name: "a"})
		b, _ := svc.CreateAgent(ctx, models.CreateAgentRequest{Name: "b"})

		if a.Token == b.Token {
			t.Error("expected different tokens")
		}
	})

	t.Run("A taken name is reported", func(t *testing.T) {
		svc := service.NewService(&MockRepository{})

		if _, err := svc.CreateAgent(ctx, models.CreateAgentRequest{Name: "claude"}); err != nil {
			t.Fatalf("Didn't expect error but got: %v", err)
		}
		_, err := svc.CreateAgent(ctx, models.CreateAgentRequest{Name: "claude"})

		if !errors.Is(err, service.ErrAgentNameTaken) {
			t.Errorf("expected ErrAgentNameTaken, got %v", err)
		}
	})
}

func TestService_VerifyAgentToken(t *testing.T) {
	ctx := context.Background()
	svc := service.NewService(&MockRepository{})

	created, err := svc.CreateAgent(ctx, models.CreateAgentRequest{Name: "claude"})
	if err != nil {
		t.Fatalf("Didn't expect error but got: %v", err)
	}

	cases := []struct {
		name  string
		token string
		want  bool
	}{
		{"the issued token", created.Token, true},
		{"another token", "blk_" + strings.Repeat("0", 64), false},
		{"a token without the prefix", strings.TrimPrefix(created.Token, "blk_"), false},
		{"an empty token", "", false},
	}

	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			got, err := svc.VerifyAgentToken(ctx, tc.token)
			if err != nil {
				t.Fatalf("Didn't expect error but got: %v", err)
			}
			if got != tc.want {
				t.Errorf("expected %v, got %v", tc.want, got)
			}
		})
	}

	t.Run("A deleted agent stops being accepted", func(t *testing.T) {
		if err := svc.DeleteAgent(ctx, created.GUID); err != nil {
			t.Fatalf("Didn't expect error but got: %v", err)
		}

		got, _ := svc.VerifyAgentToken(ctx, created.Token)
		if got {
			t.Error("expected the revoked token to be rejected")
		}
	})
}

func TestService_DeleteAgent_Unknown(t *testing.T) {
	svc := service.NewService(&MockRepository{})

	err := svc.DeleteAgent(context.Background(), "nope")

	if !errors.Is(err, service.ErrAgentNotFound) {
		t.Errorf("expected ErrAgentNotFound, got %v", err)
	}
}
