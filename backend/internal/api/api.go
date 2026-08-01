// Package api
package api

import (
	"context"

	"github.com/luizgustavojunqueira/blink/internal/models"
)

type ItemService interface {
	CreateItem(ctx context.Context, req models.CreateItemRequest) (*models.GetItemResponse, error)
	GetItems(ctx context.Context, req models.GetItemRequest) ([]models.GetItemResponse, error)
}

type API struct {
	itemService ItemService
}

func NewAPI(itemService ItemService) *API {
	return &API{itemService: itemService}
}
