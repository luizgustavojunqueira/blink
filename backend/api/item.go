package api

import (
	"encoding/json"
	"net/http"
	"strings"

	"github.com/google/uuid"
	"github.com/luizgustavojunqueira/blink/db"
	"github.com/luizgustavojunqueira/blink/models"
)

func (a *API) CreateItem(w http.ResponseWriter, r *http.Request) {
	var createItemReq models.CreateItemRequest
	err := json.NewDecoder(r.Body).Decode(&createItemReq)
	if err != nil {
		http.Error(w, "Failed to decode request body", http.StatusBadRequest)
		return
	}

	if err = createItemReq.Validate(); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	var tagsStr *string
	if len(createItemReq.Tags) > 0 {
		joined := strings.Join(createItemReq.Tags, ",")
		tagsStr = &joined
	}

	item, err := a.repo.CreateItem(r.Context(), db.CreateItemParams{
		Guid:        uuid.New().String(),
		Title:       createItemReq.Title,
		Description: pointerToNullString(createItemReq.Description),
		Type:        string(createItemReq.Type),
		Status:      string(createItemReq.Status),
		Priority:    string(createItemReq.Priority),
		Tags:        pointerToNullString(tagsStr),
	})
	if err != nil {
		http.Error(w, "Failed to create item", http.StatusInternalServerError)
		return
	}

	var tags []string
	if item.Tags.Valid && item.Tags.String != "" {
		tags = strings.Split(item.Tags.String, ",")
	} else {
		tags = []string{}
	}

	itemResponse := &models.GetItemResponse{
		GUID:        item.Guid,
		Title:       item.Title,
		Description: nullStringToPointer(item.Description),
		Type:        models.ItemType(item.Type),
		Status:      models.ItemStatus(item.Status),
		Priority:    models.ItemPriority(item.Priority),
		Tags:        tags,
	}

	w.Header().Set("Content-Type", "application/json")
	if err = json.NewEncoder(w).Encode(itemResponse); err != nil {
		http.Error(w, "Failed to encode item response", http.StatusInternalServerError)
		return
	}
}
