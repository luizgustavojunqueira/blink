package agent

import (
	"context"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/luizgustavojunqueira/blink/internal/models"
	"github.com/luizgustavojunqueira/blink/internal/userctx"
	"github.com/modelcontextprotocol/go-sdk/mcp"
)

type fakeService struct {
	created  []models.CreateItemRequest
	updated  []models.UpdateItemRequest
	listedAs []int64
}

func (f *fakeService) GetItems(ctx context.Context, _ models.GetItemRequest) ([]models.GetItemResponse, error) {
	id, _ := userctx.ID(ctx)
	f.listedAs = append(f.listedAs, id)
	return nil, nil
}

func (f *fakeService) CreateItem(_ context.Context, req models.CreateItemRequest) (*models.GetItemResponse, error) {
	f.created = append(f.created, req)
	return &models.GetItemResponse{GUID: "new", Title: req.Title, Type: req.Type, Status: req.Status, Priority: req.Priority}, nil
}

func (f *fakeService) UpdateItem(_ context.Context, req models.UpdateItemRequest) (*models.GetItemResponse, error) {
	f.updated = append(f.updated, req)
	return &models.GetItemResponse{GUID: req.GUID, Title: "t", Type: models.Task, Status: models.Done, Priority: models.Normal}, nil
}

func call(t *testing.T, svc *fakeService, tool string, args map[string]any) *mcp.CallToolResult {
	t.Helper()
	ctx := context.Background()
	serverT, clientT := mcp.NewInMemoryTransports()

	if _, err := newServer(svc).Connect(ctx, serverT, nil); err != nil {
		t.Fatal(err)
	}
	session, err := mcp.NewClient(&mcp.Implementation{Name: "test"}, nil).Connect(ctx, clientT, nil)
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() { _ = session.Close() })

	res, err := session.CallTool(ctx, &mcp.CallToolParams{Name: tool, Arguments: args})
	if err != nil {
		t.Fatal(err)
	}
	return res
}

func TestCreateTask_DefaultsToATodoNormalTaskInTheProject(t *testing.T) {
	svc := &fakeService{}

	res := call(t, svc, "create_task", map[string]any{"project_id": "p1", "title": "Write docs"})

	if res.IsError || len(svc.created) != 1 {
		t.Fatalf("expected one created task, got error=%v created=%d", res.IsError, len(svc.created))
	}
	got := svc.created[0]
	if *got.ParentGUID != "p1" || got.Type != models.Task || got.Status != models.ToDo || got.Priority != models.Normal {
		t.Fatalf("unexpected request: %+v", got)
	}
}

func TestCreateTask_RejectsInvalidInputWithoutCreating(t *testing.T) {
	cases := map[string]map[string]any{
		"empty title":      {"project_id": "p1", "title": ""},
		"invalid priority": {"project_id": "p1", "title": "x", "priority": "SOMEDAY"},
		"empty project":    {"project_id": "", "title": "x"},
	}

	for name, args := range cases {
		t.Run(name, func(t *testing.T) {
			svc := &fakeService{}
			if res := call(t, svc, "create_task", args); !res.IsError || len(svc.created) != 0 {
				t.Fatalf("expected an error and nothing created, got error=%v created=%d", res.IsError, len(svc.created))
			}
		})
	}
}

func TestUpdateItem_SendsOnlyTheGivenFields(t *testing.T) {
	svc := &fakeService{}

	res := call(t, svc, "update_item", map[string]any{"guid": "g1", "status": "DONE"})

	if res.IsError || len(svc.updated) != 1 {
		t.Fatalf("expected one update, got error=%v updated=%d", res.IsError, len(svc.updated))
	}
	got := svc.updated[0]
	if got.GUID != "g1" || got.Status == nil || *got.Status != models.Done {
		t.Fatalf("unexpected request: %+v", got)
	}
	if got.Title != nil || got.Description != nil || got.Priority != nil || got.Tags != nil {
		t.Fatalf("expected untouched fields to stay nil: %+v", got)
	}
}

func TestUpdateItem_RejectsInvalidInputWithoutUpdating(t *testing.T) {
	cases := map[string]map[string]any{
		"nothing to update": {"guid": "g1"},
		"invalid status":    {"guid": "g1", "status": "FINISHED"},
		"empty title":       {"guid": "g1", "title": ""},
		"missing guid":      {"guid": "", "status": "DONE"},
	}

	for name, args := range cases {
		t.Run(name, func(t *testing.T) {
			svc := &fakeService{}
			if res := call(t, svc, "update_item", args); !res.IsError || len(svc.updated) != 0 {
				t.Fatalf("expected an error and nothing updated, got error=%v updated=%d", res.IsError, len(svc.updated))
			}
		})
	}
}

type fakeVerifier struct {
	valid string
	err   error
}

func (f fakeVerifier) VerifyAgentToken(_ context.Context, token string) (int64, bool, error) {
	return 1, token == f.valid, f.err
}

func TestHandler_RequiresAValidAgentToken(t *testing.T) {
	handler := NewHandler(&fakeService{}, fakeVerifier{valid: "blk_good"})

	cases := []struct {
		name   string
		header string
		want   int
	}{
		{"no token", "", http.StatusUnauthorized},
		{"a revoked or unknown token", "Bearer blk_bad", http.StatusUnauthorized},
	}

	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			req := httptest.NewRequest(http.MethodPost, "/mcp", strings.NewReader("{}"))
			if tc.header != "" {
				req.Header.Set("Authorization", tc.header)
			}
			rec := httptest.NewRecorder()

			handler.ServeHTTP(rec, req)

			if rec.Code != tc.want {
				t.Errorf("expected %d, got %d", tc.want, rec.Code)
			}
		})
	}

	t.Run("a valid token gets past the auth", func(t *testing.T) {
		req := httptest.NewRequest(http.MethodPost, "/mcp", strings.NewReader("{}"))
		req.Header.Set("Authorization", "Bearer blk_good")
		rec := httptest.NewRecorder()

		handler.ServeHTTP(rec, req)

		if rec.Code == http.StatusUnauthorized {
			t.Errorf("expected the valid token to be accepted, got %d", rec.Code)
		}
	})
}

func TestHandler_ToolsRunAsTheTokenOwner(t *testing.T) {
	svc := &fakeService{}
	handler := NewHandler(svc, fakeVerifier{valid: "blk_good"})

	body := `{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"list_projects","arguments":{}}}`
	req := httptest.NewRequest(http.MethodPost, "/mcp", strings.NewReader(body))
	req.Header.Set("Authorization", "Bearer blk_good")
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Accept", "application/json, text/event-stream")
	rec := httptest.NewRecorder()

	handler.ServeHTTP(rec, req)

	if len(svc.listedAs) != 1 || svc.listedAs[0] != 1 {
		t.Fatalf("expected the tool to run as user 1, got %v (status %d: %s)", svc.listedAs, rec.Code, rec.Body.String())
	}
}
