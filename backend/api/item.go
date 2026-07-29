// Package api
package api

import (
	"database/sql"
	"encoding/json"
	"net/http"

	"github.com/google/uuid"
	"github.com/luizgustavojunqueira/blink/db"
	"github.com/luizgustavojunqueira/blink/models"
)

type API struct {
	repo db.Querier
}

func NewAPI(repo db.Querier) *API {
	return &API{repo: repo}
}

func (a *API) CreateItem(w http.ResponseWriter, r *http.Request) {
	var createItemReq models.CreateItemRequest
	err := json.NewDecoder(r.Body).Decode(&createItemReq)
	if err != nil {
		http.Error(w, "Failed to decode request body", http.StatusBadRequest)
		return
	}

	item, err := a.repo.CreateItem(r.Context(), db.CreateItemParams{
		Guid:        uuid.New().String(),
		Title:       createItemReq.Title,
		Description: sql.NullString{String: createItemReq.Description, Valid: true},
		Type:        createItemReq.Type,
		Status:      createItemReq.Status,
		Priority:    createItemReq.Priority,
		Tags:        sql.NullString{String: createItemReq.Tags, Valid: true},
	})
	if err != nil {
		http.Error(w, "Failed to create item", http.StatusInternalServerError)
		return
	}

	itemResponse := &models.GetItemResponse{
		GUID:        item.Guid,
		Title:       item.Title,
		Description: item.Description.String,
		Type:        item.Type,
		Status:      item.Status,
		Priority:    item.Priority,
		Tags:        item.Tags.String,
	}

	w.Header().Set("Content-Type", "application/json")
	if err = json.NewEncoder(w).Encode(itemResponse); err != nil {
		http.Error(w, "Failed to encode item response", http.StatusInternalServerError)
		return
	}
}
