// Package agent
package agent

import (
	"context"
	"errors"
	"net/http"

	"github.com/luizgustavojunqueira/blink/internal/models"
	"github.com/modelcontextprotocol/go-sdk/auth"
	"github.com/modelcontextprotocol/go-sdk/mcp"
)

type ItemService interface {
	GetItems(ctx context.Context, req models.GetItemRequest) ([]models.GetItemResponse, error)
	CreateItem(ctx context.Context, req models.CreateItemRequest) (*models.GetItemResponse, error)
	UpdateItem(ctx context.Context, req models.UpdateItemRequest) (*models.GetItemResponse, error)
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

type createTaskInput struct {
	ProjectID   string               `json:"project_id" jsonschema:"guid of the project the task belongs to"`
	Title       string               `json:"title" jsonschema:"title of the task"`
	Description *string              `json:"description,omitempty" jsonschema:"markdown notes"`
	Priority    *models.ItemPriority `json:"priority,omitempty" jsonschema:"LOW, NORMAL, HIGH or URGENT; defaults to NORMAL"`
	Status      *models.ItemStatus   `json:"status,omitempty" jsonschema:"TODO, IN_PROGRESS, DONE, CANCELED or ARCHIVED; defaults to TODO"`
	Tags        []string             `json:"tags,omitempty"`
}

type updateItemInput struct {
	GUID        string               `json:"guid" jsonschema:"guid of the task or project to update"`
	Status      *models.ItemStatus   `json:"status,omitempty" jsonschema:"TODO, IN_PROGRESS, DONE, CANCELED or ARCHIVED"`
	Priority    *models.ItemPriority `json:"priority,omitempty" jsonschema:"LOW, NORMAL, HIGH or URGENT"`
	Title       *string              `json:"title,omitempty"`
	Description *string              `json:"description,omitempty" jsonschema:"markdown notes; replaces the current description"`
	Tags        *[]string            `json:"tags,omitempty" jsonschema:"replaces the current tags; an empty list clears them"`
}

type itemsOutput struct {
	Items []models.GetItemResponse `json:"items"`
}

type itemOutput struct {
	Item models.GetItemResponse `json:"item"`
}

type TokenVerifier interface {
	VerifyAgentToken(ctx context.Context, token string) (bool, error)
}

func NewHandler(svc ItemService, tokens TokenVerifier) http.Handler {
	server := newServer(svc)

	handler := mcp.NewStreamableHTTPHandler(
		func(*http.Request) *mcp.Server { return server },
		&mcp.StreamableHTTPOptions{Stateless: true, JSONResponse: true},
	)

	verify := func(ctx context.Context, got string, _ *http.Request) (*auth.TokenInfo, error) {
		valid, err := tokens.VerifyAgentToken(ctx, got)
		if err != nil {
			return nil, err
		}
		if !valid {
			return nil, auth.ErrInvalidToken
		}
		return &auth.TokenInfo{}, nil
	}

	return auth.RequireBearerToken(verify, &auth.RequireBearerTokenOptions{AllowMissingExpiration: true})(handler)
}

func newServer(svc ItemService) *mcp.Server {
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

	mcp.AddTool(server, &mcp.Tool{
		Name:        "create_task",
		Description: "Create a task inside a project.",
	}, func(ctx context.Context, _ *mcp.CallToolRequest, in createTaskInput) (*mcp.CallToolResult, itemOutput, error) {
		req := models.CreateItemRequest{
			ParentGUID:  &in.ProjectID,
			Title:       in.Title,
			Description: in.Description,
			Type:        models.Task,
			Status:      models.ToDo,
			Priority:    models.Normal,
			Tags:        in.Tags,
		}
		if in.Status != nil {
			req.Status = *in.Status
		}
		if in.Priority != nil {
			req.Priority = *in.Priority
		}
		if err := req.Validate(); err != nil {
			return nil, itemOutput{}, err
		}

		item, err := svc.CreateItem(ctx, req)
		if err != nil {
			return nil, itemOutput{}, err
		}
		return nil, itemOutput{Item: *item}, nil
	})

	mcp.AddTool(server, &mcp.Tool{
		Name:        "update_item",
		Description: "Update a task or project, e.g. set its status to IN_PROGRESS when starting it and DONE when finished. Only the given fields change.",
	}, func(ctx context.Context, _ *mcp.CallToolRequest, in updateItemInput) (*mcp.CallToolResult, itemOutput, error) {
		if in.Status == nil && in.Priority == nil && in.Title == nil && in.Description == nil && in.Tags == nil {
			return nil, itemOutput{}, errors.New("nothing to update")
		}
		if in.Title != nil && *in.Title == "" {
			return nil, itemOutput{}, errors.New("title cannot be empty")
		}

		req := models.UpdateItemRequest{
			GUID:        in.GUID,
			Title:       in.Title,
			Description: in.Description,
			Status:      in.Status,
			Priority:    in.Priority,
			Tags:        in.Tags,
		}
		if err := req.Validate(); err != nil {
			return nil, itemOutput{}, err
		}

		item, err := svc.UpdateItem(ctx, req)
		if err != nil {
			return nil, itemOutput{}, err
		}
		return nil, itemOutput{Item: *item}, nil
	})

	return server
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
