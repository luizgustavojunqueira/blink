package api_test

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/luizgustavojunqueira/blink/internal/api"
	"github.com/luizgustavojunqueira/blink/internal/models"
)

type MockItemService struct {
	simulateErr error
}

func (m *MockItemService) CreateItem(ctx context.Context, req models.CreateItemRequest) (*models.GetItemResponse, error) {
	if m.simulateErr != nil {
		return nil, m.simulateErr
	}
	return &models.GetItemResponse{
		Title:    req.Title,
		Type:     req.Type,
		Status:   req.Status,
		Priority: req.Priority,
	}, nil
}

func (m *MockItemService) GetItems(ctx context.Context, req models.GetItemRequest) ([]models.GetItemResponse, error) {
	if m.simulateErr != nil {
		return nil, m.simulateErr
	}
	return []models.GetItemResponse{}, nil
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
			name:         "Service error",
			requestBody:  models.CreateItemRequest{Title: "Build blink", Type: models.Task, Status: models.ToDo, Priority: models.Normal},
			dbError:      errors.New("Some service error"),
			expectedCode: http.StatusInternalServerError, // 500
		},
	}

	for _, tt := range tests {

		mockSvc := &MockItemService{
			simulateErr: tt.dbError,
		}
		handler := api.NewAPI(mockSvc)

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

func TestGetItems(t *testing.T) {
	tests := []struct {
		name         string
		queryString  string
		dbError      error
		expectedCode int
	}{
		{
			name:         "Success",
			queryString:  "?status=TODO&type=TASK",
			dbError:      nil,
			expectedCode: http.StatusOK, // 200
		},
		{
			name:         "Validation error (invalid status)",
			queryString:  "?status=INVALID_STATUS",
			dbError:      nil,
			expectedCode: http.StatusBadRequest, // 400
		},
		{
			name:         "Service error",
			queryString:  "?status=TODO",
			dbError:      errors.New("Some service error"),
			expectedCode: http.StatusInternalServerError, // 500
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			mockSvc := &MockItemService{
				simulateErr: tt.dbError,
			}
			handler := api.NewAPI(mockSvc)

			req := httptest.NewRequest(http.MethodGet, "/api/items"+tt.queryString, nil)
			rr := httptest.NewRecorder()

			handler.GetItems(rr, req)

			if rr.Code != tt.expectedCode {
				t.Errorf("Expected status %d, but got %v", tt.expectedCode, rr.Code)
			}
		})
	}
}
