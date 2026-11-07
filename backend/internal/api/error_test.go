package api_test

import (
	"bytes"
	"encoding/json"
	"errors"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/luizgustavojunqueira/blink/internal/api"
	"github.com/luizgustavojunqueira/blink/internal/apperr"
)

func decodeError(t *testing.T, rr *httptest.ResponseRecorder) apperr.Response {
	t.Helper()
	if ct := rr.Header().Get("Content-Type"); ct != "application/json; charset=utf-8" {
		t.Fatalf("content type = %q", ct)
	}
	var body apperr.Response
	if err := json.NewDecoder(rr.Body).Decode(&body); err != nil {
		t.Fatalf("decode: %v", err)
	}
	return body
}

func TestErrors_CarryAStableCode(t *testing.T) {
	tests := []struct {
		name     string
		body     string
		svcErr   error
		wantCode string
		wantMsg  string
		status   int
	}{
		{"validation", `{"title":"","type":"TASK","status":"TODO","priority":"NORMAL"}`, nil, "title_required", "title is required", http.StatusBadRequest},
		{"bad json", `{`, nil, "bad_request", "Failed to decode request body", http.StatusBadRequest},
		{"unknown service error", `{"title":"x","type":"TASK","status":"TODO","priority":"NORMAL"}`, errors.New("database is locked"), "internal", "database is locked", http.StatusInternalServerError},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			handler := api.NewAPI(&MockItemService{simulateErr: tt.svcErr})
			req := httptest.NewRequest(http.MethodPost, "/api/items", bytes.NewBufferString(tt.body))
			rr := httptest.NewRecorder()

			handler.CreateItem(rr, req)

			if rr.Code != tt.status {
				t.Fatalf("status = %d", rr.Code)
			}
			if got := decodeError(t, rr); got.Code != tt.wantCode || got.Message != tt.wantMsg {
				t.Fatalf("body = %+v", got)
			}
		})
	}
}
