// Package agent
package agent

import (
	"context"
	"crypto/subtle"
	"net/http"

	"github.com/luizgustavojunqueira/blink/internal/models"
	"github.com/modelcontextprotocol/go-sdk/auth"
	"github.com/modelcontextprotocol/go-sdk/mcp"
)

type ItemService interface {
	GetItems(ctx context.Context, req models.GetItemRequest) ([]models.GetItemResponse, error)
}

type listProjectsInput struct {
	ProjectID *string `json:"project_id,omitempty" jsonschema:"guid of a project to list the projects inside it; omit for top-level projects"`
}

type listTasksInput struct {
	ProjectID string                `json:"project_id" jsonschema:"guid of the project; only its direct tasks are returned"`
	Status    []models.ItemStatus   `json:"status,omitempty" jsonschema:"TODO, IN_PROGRESS, DONE, CANCELED or ARCHIVED; defaults to TODO"`
	Priority  []models.ItemPriority `json:"priority,omitempty" jsonschema:"LOW, NORMAL, HIGH or URGENT"`
	Tags      []string              `json:"tags,omitempty" jsonschema:"only tasks having these tags"`
	Order     []string              `json:"order,omitempty" jsonschema:"title, created, updated, status or priority; prefix with - for descending; defaults to priority"`
}

type itemsOutput struct {
	Items []models.GetItemResponse `json:"items"`
}

func NewHandler(svc ItemService, token string) http.Handler {
	server := mcp.NewServer(&mcp.Implementation{Name: "blink"}, nil)

	mcp.AddTool(server, &mcp.Tool{
		Name:        "list_projects",
		Description: "List projects (groups). Returns top-level projects, or the projects inside project_id.",
	}, func(ctx context.Context, _ *mcp.CallToolRequest, in listProjectsInput) (*mcp.CallToolResult, itemsOutput, error) {
		return list(ctx, svc, models.GetItemRequest{
			ParentID: in.ProjectID,
			Type:     []models.ItemType{models.Group},
		})
	})

	mcp.AddTool(server, &mcp.Tool{
		Name:        "list_tasks",
		Description: "List the tasks of a project, most urgent first. Defaults to tasks with status TODO.",
	}, func(ctx context.Context, _ *mcp.CallToolRequest, in listTasksInput) (*mcp.CallToolResult, itemsOutput, error) {
		status := in.Status
		if len(status) == 0 {
			status = []models.ItemStatus{models.ToDo}
		}
		order := in.Order
		if len(order) == 0 {
			order = []string{"priority"}
		}
		return list(ctx, svc, models.GetItemRequest{
			ParentID: &in.ProjectID,
			Type:     []models.ItemType{models.Task},
			Status:   status,
			Priority: in.Priority,
			Tags:     in.Tags,
			Order:    order,
		})
	})

	handler := mcp.NewStreamableHTTPHandler(
		func(*http.Request) *mcp.Server { return server },
		&mcp.StreamableHTTPOptions{Stateless: true, JSONResponse: true},
	)

	verify := func(_ context.Context, got string, _ *http.Request) (*auth.TokenInfo, error) {
		if subtle.ConstantTimeCompare([]byte(got), []byte(token)) != 1 {
			return nil, auth.ErrInvalidToken
		}
		return &auth.TokenInfo{}, nil
	}

	return auth.RequireBearerToken(verify, &auth.RequireBearerTokenOptions{AllowMissingExpiration: true})(handler)
}

func list(ctx context.Context, svc ItemService, req models.GetItemRequest) (*mcp.CallToolResult, itemsOutput, error) {
	if err := req.Validate(); err != nil {
		return nil, itemsOutput{}, err
	}

	items, err := svc.GetItems(ctx, req)
	if err != nil {
		return nil, itemsOutput{}, err
	}

	return nil, itemsOutput{Items: items}, nil
}
