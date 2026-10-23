package api

import (
	"encoding/json"
	"errors"
	"net/http"

	"github.com/luizgustavojunqueira/blink/internal/models"
	"github.com/luizgustavojunqueira/blink/internal/service"
)

func (a *API) GetAgents(w http.ResponseWriter, r *http.Request) {
	agents, err := a.itemService.GetAgents(r.Context())
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	if err = json.NewEncoder(w).Encode(agents); err != nil {
		http.Error(w, "Failed to encode agent response", http.StatusInternalServerError)
		return
	}
}

func (a *API) CreateAgent(w http.ResponseWriter, r *http.Request) {
	var req models.CreateAgentRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Failed to decode request body", http.StatusBadRequest)
		return
	}

	if err := req.Validate(); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	agent, err := a.itemService.CreateAgent(r.Context(), req)
	if errors.Is(err, service.ErrAgentNameTaken) {
		http.Error(w, err.Error(), http.StatusConflict)
		return
	}
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	if err = json.NewEncoder(w).Encode(agent); err != nil {
		http.Error(w, "Failed to encode agent response", http.StatusInternalServerError)
		return
	}
}

func (a *API) DeleteAgent(w http.ResponseWriter, r *http.Request) {
	err := a.itemService.DeleteAgent(r.Context(), r.PathValue("guid"))
	if errors.Is(err, service.ErrAgentNotFound) {
		http.Error(w, err.Error(), http.StatusNotFound)
		return
	}
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusNoContent)
}
