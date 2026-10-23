package api_test

import (
	"bytes"
	"encoding/json"
	"errors"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/luizgustavojunqueira/blink/internal/api"
	"github.com/luizgustavojunqueira/blink/internal/models"
	"github.com/luizgustavojunqueira/blink/internal/service"
)

func TestCreateAgent(t *testing.T) {
	cases := []struct {
		name       string
		body       string
		simulate   error
		wantStatus int
	}{
		{"creates the agent", `{"name":"claude"}`, nil, http.StatusOK},
		{"rejects a blank name", `{"name":"  "}`, nil, http.StatusBadRequest},
		{"rejects a broken body", `{`, nil, http.StatusBadRequest},
		{"reports a taken name", `{"name":"claude"}`, service.ErrAgentNameTaken, http.StatusConflict},
		{"reports a server error", `{"name":"claude"}`, errors.New("boom"), http.StatusInternalServerError},
	}

	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			handler := api.NewAPI(&MockItemService{simulateErr: tc.simulate})
			req := httptest.NewRequest(http.MethodPost, "/api/agents", bytes.NewBufferString(tc.body))
			rec := httptest.NewRecorder()

			handler.CreateAgent(rec, req)

			if rec.Code != tc.wantStatus {
				t.Fatalf("expected %d, got %d: %s", tc.wantStatus, rec.Code, rec.Body.String())
			}

			if tc.wantStatus == http.StatusOK {
				var resp models.CreateAgentResponse
				if err := json.NewDecoder(rec.Body).Decode(&resp); err != nil {
					t.Fatalf("failed to decode: %v", err)
				}
				if resp.Token == "" || resp.Name != "claude" {
					t.Errorf("unexpected response %+v", resp)
				}
			}
		})
	}
}

func TestGetAgents(t *testing.T) {
	handler := api.NewAPI(&MockItemService{})
	rec := httptest.NewRecorder()

	handler.GetAgents(rec, httptest.NewRequest(http.MethodGet, "/api/agents", nil))

	var agents []map[string]any
	if err := json.NewDecoder(rec.Body).Decode(&agents); err != nil {
		t.Fatalf("failed to decode: %v", err)
	}
	if len(agents) != 1 {
		t.Fatalf("expected 1 agent, got %d", len(agents))
	}
	if _, leaked := agents[0]["token"]; leaked {
		t.Error("the list must never carry a token")
	}
}

func TestDeleteAgent(t *testing.T) {
	cases := []struct {
		name       string
		simulate   error
		wantStatus int
	}{
		{"removes the agent", nil, http.StatusNoContent},
		{"reports an unknown agent", service.ErrAgentNotFound, http.StatusNotFound},
		{"reports a server error", errors.New("boom"), http.StatusInternalServerError},
	}

	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			handler := api.NewAPI(&MockItemService{simulateErr: tc.simulate})
			req := httptest.NewRequest(http.MethodDelete, "/api/agents/agent-1", nil)
			req.SetPathValue("guid", "agent-1")
			rec := httptest.NewRecorder()

			handler.DeleteAgent(rec, req)

			if rec.Code != tc.wantStatus {
				t.Errorf("expected %d, got %d", tc.wantStatus, rec.Code)
			}
		})
	}
}
