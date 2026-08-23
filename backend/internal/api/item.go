package api

import (
	"encoding/json"
	"net/http"
	"strings"

	"github.com/luizgustavojunqueira/blink/internal/models"
)

func (a *API) UpdateItem(w http.ResponseWriter, r *http.Request) {
	var updateItemReq models.UpdateItemRequest
	err := json.NewDecoder(r.Body).Decode(&updateItemReq)
	if err != nil {
		http.Error(w, "Failed to decode request body", http.StatusBadRequest)
		return
	}

	if err = updateItemReq.Validate(); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	updateResponse, err := a.itemService.UpdateItem(r.Context(), updateItemReq)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	if err = json.NewEncoder(w).Encode(updateResponse); err != nil {
		http.Error(w, "Failed to encode item response", http.StatusInternalServerError)
		return
	}
}

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

	itemResponse, err := a.itemService.CreateItem(r.Context(), createItemReq)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	if err = json.NewEncoder(w).Encode(itemResponse); err != nil {
		http.Error(w, "Failed to encode item response", http.StatusInternalServerError)
		return
	}
}

func (a *API) GetItems(w http.ResponseWriter, r *http.Request) {
	req := models.GetItemRequest{}
	queryParams := r.URL.Query()

	req.Title = parseQueryValue[string](r.URL.Query().Get("title"))
	req.Description = parseQueryValue[string](r.URL.Query().Get("description"))

	req.Status = toUpperCase(parseQueryList[models.ItemStatus](queryParams["status"]))
	req.Priority = toUpperCase(parseQueryList[models.ItemPriority](queryParams["priority"]))
	req.Type = toUpperCase(parseQueryList[models.ItemType](queryParams["type"]))
	req.Tags = parseQueryList[string](queryParams["tags"])

	if err := req.Validate(); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	itemsResponse, err := a.itemService.GetItems(r.Context(), req)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	if err = json.NewEncoder(w).Encode(itemsResponse); err != nil {
		http.Error(w, "Failed to encode item response", http.StatusInternalServerError)
		return
	}
}

func toUpperCase[T ~string](s []T) []T {
	res := make([]T, len(s))
	for i, v := range s {
		res[i] = T(strings.ToUpper(string(v)))
	}

	return res
}

func parseQueryList[T ~string](values []string) []T {
	if len(values) == 0 {
		return nil
	}
	result := make([]T, 0, len(values))
	for _, v := range values {
		result = append(result, T(v))
	}
	return result
}

func parseQueryValue[T ~string](val string) *T {
	if val == "" {
		return nil
	}
	v := T(val)
	return &v
}
