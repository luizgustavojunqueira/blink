package api

import (
	"encoding/json"
	"errors"
	"github.com/luizgustavojunqueira/blink/internal/apperr"
	"net/http"

	"github.com/luizgustavojunqueira/blink/internal/models"
	"github.com/luizgustavojunqueira/blink/internal/service"
)

func (a *API) GetAgents(w http.ResponseWriter, r *http.Request) {
	agents, err := a.itemService.GetAgents(r.Context())
	if err != nil {
		apperr.Write(w, http.StatusInternalServerError, err)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	if err = json.NewEncoder(w).Encode(agents); err != nil {
		apperr.Write(w, http.StatusInternalServerError, apperr.ErrInternal)
		return
	}
}

func (a *API) CreateAgent(w http.ResponseWriter, r *http.Request) {
	var req models.CreateAgentRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		apperr.Write(w, http.StatusBadRequest, apperr.ErrBadRequest)
		return
	}

	if err := req.Validate(); err != nil {
		apperr.Write(w, http.StatusBadRequest, err)
		return
	}

	agent, err := a.itemService.CreateAgent(r.Context(), req)
	if errors.Is(err, service.ErrAgentNameTaken) {
		apperr.Write(w, http.StatusConflict, err)
		return
	}
	if err != nil {
		apperr.Write(w, http.StatusInternalServerError, err)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	if err = json.NewEncoder(w).Encode(agent); err != nil {
		apperr.Write(w, http.StatusInternalServerError, apperr.ErrInternal)
		return
	}
}

func (a *API) DeleteAgent(w http.ResponseWriter, r *http.Request) {
	err := a.itemService.DeleteAgent(r.Context(), r.PathValue("guid"))
	if errors.Is(err, service.ErrAgentNotFound) {
		apperr.Write(w, http.StatusNotFound, err)
		return
	}
	if err != nil {
		apperr.Write(w, http.StatusInternalServerError, err)
		return
	}

	w.WriteHeader(http.StatusNoContent)
}
