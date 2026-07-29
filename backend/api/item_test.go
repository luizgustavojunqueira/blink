package api_test

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/luizgustavojunqueira/blink/api"
	"github.com/luizgustavojunqueira/blink/db"
	"github.com/luizgustavojunqueira/blink/models"
)

type MockDB struct {
	db.Querier
	simulateErr error
}

func (m *MockDB) CreateItem(ctx context.Context, arg db.CreateItemParams) (db.Item, error) {
	if m.simulateErr != nil {
		return db.Item{}, m.simulateErr
	}
	return db.Item{
		Guid:     arg.Guid,
		Title:    arg.Title,
		Type:     arg.Type,
		Status:   arg.Status,
		Priority: arg.Priority,
	}, nil
}

func TestCreateItem(t *testing.T) {
	tests := []struct {
		name         string
		requestBody  any
		dbError      error
		expectedCode int
	}{
		{
			name:         "Success",
			requestBody:  models.CreateItemRequest{Title: "Build blink", Type: models.Task, Status: models.ToDo, Priority: models.Normal},
			dbError:      nil,
			expectedCode: http.StatusOK, // 200
		},
		{
			name:         "Validation error (missing title)",
			requestBody:  models.CreateItemRequest{Type: models.Task, Status: models.ToDo, Priority: models.Normal},
			dbError:      nil,
			expectedCode: http.StatusBadRequest, // 400
		},
		{
			name:         "JSON Syntax Error",
			requestBody:  `{"title": broken body`,
			dbError:      nil,
			expectedCode: http.StatusBadRequest, // 400
		},
		{
			name:         "DB error",
			requestBody:  models.CreateItemRequest{Title: "Build blink", Type: models.Task, Status: models.ToDo, Priority: models.Normal},
			dbError:      errors.New("Some db error"),
			expectedCode: http.StatusInternalServerError, // 500
		},
	}

	for _, tt := range tests {

		mockRepo := &MockDB{
			simulateErr: tt.dbError,
		}
		handler := api.NewAPI(mockRepo)

		var bodyBytes []byte
		if strBody, ok := tt.requestBody.(string); ok {
			bodyBytes = []byte(strBody)
		} else {
			bodyBytes, _ = json.Marshal(tt.requestBody)
		}

		req := httptest.NewRequest(http.MethodPost, "/api/items", bytes.NewBuffer(bodyBytes))
		req.Header.Set("Content-Type", "application/json")

		rr := httptest.NewRecorder()

		handler.CreateItem(rr, req)

		if rr.Code != tt.expectedCode {
			t.Errorf("Expected status %d, but got %v", tt.expectedCode, rr.Code)
		}
	}
}
