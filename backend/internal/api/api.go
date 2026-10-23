// Package api
package api

import (
	"context"

	"github.com/luizgustavojunqueira/blink/internal/models"
)

type ItemService interface {
	CreateItem(ctx context.Context, req models.CreateItemRequest) (*models.GetItemResponse, error)
	GetItems(ctx context.Context, req models.GetItemRequest) ([]models.GetItemResponse, error)
	UpdateItem(ctx context.Context, req models.UpdateItemRequest) (*models.GetItemResponse, error)
	GetTags(ctx context.Context) (*models.GetTagsResponse, error)
	BulkUpdateItem(ctx context.Context, req models.BulkUpdateItemRequest) ([]models.GetItemResponse, error)
	CreateAgent(ctx context.Context, req models.CreateAgentRequest) (*models.CreateAgentResponse, error)
	GetAgents(ctx context.Context) ([]models.GetAgentResponse, error)
	DeleteAgent(ctx context.Context, guid string) error
	DeleteItems(ctx context.Context, req models.ItemGuidsRequest) error
	RestoreItems(ctx context.Context, req models.ItemGuidsRequest) ([]models.GetItemResponse, error)
}

type API struct {
	itemService ItemService
}

func NewAPI(itemService ItemService) *API {
	return &API{itemService: itemService}
}
