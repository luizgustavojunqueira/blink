package agent

import (
	"context"
	"testing"

	"github.com/luizgustavojunqueira/blink/internal/models"
	"github.com/modelcontextprotocol/go-sdk/mcp"
)

type fakeService struct {
	created []models.CreateItemRequest
	updated []models.UpdateItemRequest
}

func (f *fakeService) GetItems(context.Context, models.GetItemRequest) ([]models.GetItemResponse, error) {
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
