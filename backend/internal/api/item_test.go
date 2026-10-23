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

func (m *MockItemService) GetTags(ctx context.Context) (*models.GetTagsResponse, error) {
	if m.simulateErr != nil {
		return nil, m.simulateErr
	}

	return &models.GetTagsResponse{Tags: []string{"tag1", "tag2"}}, nil
}

func (m *MockItemService) UpdateItem(ctx context.Context, req models.UpdateItemRequest) (*models.GetItemResponse, error) {
	if m.simulateErr != nil {
		return nil, m.simulateErr
	}

	item := models.GetItemResponse{
		GUID:        req.GUID,
		Title:       "Stored title",
		Description: new("Stored description"),
		Type:        models.Task,
		Status:      models.ToDo,
		Priority:    models.Normal,
		Tags:        []string{"stored"},
	}

	if req.Title != nil {
		item.Title = *req.Title
	}
	if req.Description != nil {
		item.Description = req.Description
	}
	if req.Status != nil {
		item.Status = *req.Status
	}
	if req.Priority != nil {
		item.Priority = *req.Priority
	}
	if req.Tags != nil {
		item.Tags = *req.Tags
	}

	return &item, nil
}

func (m *MockItemService) CreateAgent(ctx context.Context, req models.CreateAgentRequest) (*models.CreateAgentResponse, error) {
	if m.simulateErr != nil {
		return nil, m.simulateErr
	}
	return &models.CreateAgentResponse{
		GetAgentResponse: models.GetAgentResponse{GUID: "agent-1", Name: req.Name, CreatedAt: "2026-01-01T00:00:00Z"},
		Token:            "blk_secret",
	}, nil
}

func (m *MockItemService) GetAgents(ctx context.Context) ([]models.GetAgentResponse, error) {
	if m.simulateErr != nil {
		return nil, m.simulateErr
	}
	return []models.GetAgentResponse{{GUID: "agent-1", Name: "claude", CreatedAt: "2026-01-01T00:00:00Z"}}, nil
}

func (m *MockItemService) DeleteAgent(ctx context.Context, guid string) error {
	return m.simulateErr
}

func (m *MockItemService) DeleteItems(ctx context.Context, req models.ItemGuidsRequest) error {
	return m.simulateErr
}

func (m *MockItemService) RestoreItems(ctx context.Context, req models.ItemGuidsRequest) ([]models.GetItemResponse, error) {
	if m.simulateErr != nil {
		return nil, m.simulateErr
	}
	items := make([]models.GetItemResponse, 0, len(req.GUIDS))
	for _, guid := range req.GUIDS {
		items = append(items, models.GetItemResponse{GUID: guid, Type: models.Task, Status: models.ToDo, Priority: models.Normal, Tags: []string{}})
	}
	return items, nil
}

func (m *MockItemService) BulkUpdateItem(ctx context.Context, req models.BulkUpdateItemRequest) ([]models.GetItemResponse, error) {
	if m.simulateErr != nil {
		return nil, m.simulateErr
	}

	items := make([]models.GetItemResponse, 0, len(req.GUIDS))

	for _, guid := range req.GUIDS {
		item := models.GetItemResponse{
			GUID:        guid,
			Title:       "Stored title",
			Description: new("Stored description"),
			Type:        models.Task,
			Status:      models.ToDo,
			Priority:    models.Normal,
			Tags:        []string{"stored"},
		}

		if req.Title != nil {
			item.Title = *req.Title
		}
		if req.Description != nil {
			item.Description = req.Description
		}
		if req.Status != nil {
			item.Status = *req.Status
		}
		if req.Priority != nil {
			item.Priority = *req.Priority
		}
		if req.Tags != nil {
			item.Tags = *req.Tags
		}

		items = append(items, item)
	}

	return items, nil
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

func TestUpdateItem(t *testing.T) {
	tests := []struct {
		name         string
		requestBody  any
		serviceError error
		expectedCode int
	}{
		{
			name:         "Success - status only",
			requestBody:  models.UpdateItemRequest{GUID: "item-1", Status: new(models.Done)},
			serviceError: nil,
			expectedCode: http.StatusOK, // 200
		},
		{
			name:         "Success - every field at once",
			requestBody:  models.UpdateItemRequest{GUID: "item-1", Title: new("Build blink"), Description: new("with tests"), Status: new(models.InProgress), Priority: new(models.High), Tags: new([]string{"work"})},
			serviceError: nil,
			expectedCode: http.StatusOK, // 200
		},
		{
			name:         "Validation error (missing guid)",
			requestBody:  models.UpdateItemRequest{Status: new(models.Done)},
			serviceError: nil,
			expectedCode: http.StatusBadRequest, // 400
		},
		{
			name:         "Validation error (invalid status)",
			requestBody:  models.UpdateItemRequest{GUID: "item-1", Status: new(models.ItemStatus("SLEEPING"))},
			serviceError: nil,
			expectedCode: http.StatusBadRequest, // 400
		},
		{
			name:         "Validation error (invalid priority)",
			requestBody:  models.UpdateItemRequest{GUID: "item-1", Priority: new(models.ItemPriority("WHENEVER"))},
			serviceError: nil,
			expectedCode: http.StatusBadRequest, // 400
		},
		{
			name:         "JSON Syntax Error",
			requestBody:  `{"guid": broken body`,
			serviceError: nil,
			expectedCode: http.StatusBadRequest, // 400
		},
		{
			name:         "Service error",
			requestBody:  models.UpdateItemRequest{GUID: "item-1", Status: new(models.Done)},
			serviceError: errors.New("Some service error"),
			expectedCode: http.StatusInternalServerError, // 500
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			mockSvc := &MockItemService{
				simulateErr: tt.serviceError,
			}
			handler := api.NewAPI(mockSvc)

			var bodyBytes []byte
			if strBody, ok := tt.requestBody.(string); ok {
				bodyBytes = []byte(strBody)
			} else {
				bodyBytes, _ = json.Marshal(tt.requestBody)
			}

			req := httptest.NewRequest(http.MethodPatch, "/api/items", bytes.NewBuffer(bodyBytes))
			req.Header.Set("Content-Type", "application/json")

			rr := httptest.NewRecorder()

			handler.UpdateItem(rr, req)

			if rr.Code != tt.expectedCode {
				t.Errorf("Expected status %d, but got %v", tt.expectedCode, rr.Code)
			}
		})
	}
}

func TestUpdateItem_RespondsWithTheUpdatedItem(t *testing.T) {
	handler := api.NewAPI(&MockItemService{})

	body, _ := json.Marshal(models.UpdateItemRequest{GUID: "item-1", Status: new(models.Done)})
	req := httptest.NewRequest(http.MethodPatch, "/api/items", bytes.NewBuffer(body))
	req.Header.Set("Content-Type", "application/json")

	rr := httptest.NewRecorder()
	handler.UpdateItem(rr, req)

	if rr.Code != http.StatusOK {
		t.Fatalf("Expected status %d, but got %d", http.StatusOK, rr.Code)
	}

	if contentType := rr.Header().Get("Content-Type"); contentType != "application/json" {
		t.Errorf("Expected Content-Type application/json, got %q", contentType)
	}

	var resp models.GetItemResponse
	if err := json.NewDecoder(rr.Body).Decode(&resp); err != nil {
		t.Fatalf("Expected a decodable item, got %v", err)
	}

	if resp.GUID != "item-1" {
		t.Errorf("Expected guid item-1, got %q", resp.GUID)
	}

	if resp.Status != models.Done {
		t.Errorf("Expected status %s, got %s", models.Done, resp.Status)
	}

	if resp.Title != "Stored title" {
		t.Errorf("Expected the untouched title, got %q", resp.Title)
	}

	if resp.Description == nil || *resp.Description != "Stored description" {
		t.Errorf("Expected the untouched description, got %v", resp.Description)
	}

	if resp.Type != models.Task {
		t.Errorf("Expected the untouched type, got %q", resp.Type)
	}

	if resp.Priority != models.Normal {
		t.Errorf("Expected the untouched priority, got %q", resp.Priority)
	}

	if len(resp.Tags) != 1 || resp.Tags[0] != "stored" {
		t.Errorf("Expected the untouched tags, got %v", resp.Tags)
	}
}

func TestBulkUpdateItem(t *testing.T) {
	tests := []struct {
		name         string
		requestBody  any
		serviceError error
		expectedCode int
	}{
		{
			name:         "Success - status only",
			requestBody:  models.BulkUpdateItemRequest{GUIDS: []string{"item-1", "item-2"}, Status: new(models.Done)},
			serviceError: nil,
			expectedCode: http.StatusOK, // 200
		},
		{
			name:         "Success - every field at once",
			requestBody:  models.BulkUpdateItemRequest{GUIDS: []string{"item-1"}, Title: new("Build blink"), Description: new("with tests"), Status: new(models.InProgress), Priority: new(models.High), Tags: new([]string{"work"}), ParentGUID: new("parent-guid")},
			serviceError: nil,
			expectedCode: http.StatusOK, // 200
		},
		{
			name:         "Validation error (missing guids)",
			requestBody:  models.BulkUpdateItemRequest{Status: new(models.Done)},
			serviceError: nil,
			expectedCode: http.StatusBadRequest, // 400
		},
		{
			name:         "Validation error (invalid status)",
			requestBody:  models.BulkUpdateItemRequest{GUIDS: []string{"item-1"}, Status: new(models.ItemStatus("SLEEPING"))},
			serviceError: nil,
			expectedCode: http.StatusBadRequest, // 400
		},
		{
			name:         "Validation error (invalid priority)",
			requestBody:  models.BulkUpdateItemRequest{GUIDS: []string{"item-1"}, Priority: new(models.ItemPriority("WHENEVER"))},
			serviceError: nil,
			expectedCode: http.StatusBadRequest, // 400
		},
		{
			name:         "JSON Syntax Error",
			requestBody:  `{"guids": broken body`,
			serviceError: nil,
			expectedCode: http.StatusBadRequest, // 400
		},
		{
			name:         "Service error",
			requestBody:  models.BulkUpdateItemRequest{GUIDS: []string{"item-1"}, Status: new(models.Done)},
			serviceError: errors.New("Some service error"),
			expectedCode: http.StatusInternalServerError, // 500
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			mockSvc := &MockItemService{
				simulateErr: tt.serviceError,
			}
			handler := api.NewAPI(mockSvc)

			var bodyBytes []byte
			if strBody, ok := tt.requestBody.(string); ok {
				bodyBytes = []byte(strBody)
			} else {
				bodyBytes, _ = json.Marshal(tt.requestBody)
			}

			req := httptest.NewRequest(http.MethodPatch, "/api/items/bulk", bytes.NewBuffer(bodyBytes))
			req.Header.Set("Content-Type", "application/json")

			rr := httptest.NewRecorder()

			handler.BulkUpdateItem(rr, req)

			if rr.Code != tt.expectedCode {
				t.Errorf("Expected status %d, but got %v", tt.expectedCode, rr.Code)
			}
		})
	}
}

func TestBulkUpdateItem_RespondsWithTheUpdatedItems(t *testing.T) {
	handler := api.NewAPI(&MockItemService{})

	body, _ := json.Marshal(models.BulkUpdateItemRequest{GUIDS: []string{"item-1", "item-2"}, Status: new(models.Done)})
	req := httptest.NewRequest(http.MethodPatch, "/api/items/bulk", bytes.NewBuffer(body))
	req.Header.Set("Content-Type", "application/json")

	rr := httptest.NewRecorder()
	handler.BulkUpdateItem(rr, req)

	if rr.Code != http.StatusOK {
		t.Fatalf("Expected status %d, but got %d", http.StatusOK, rr.Code)
	}

	if contentType := rr.Header().Get("Content-Type"); contentType != "application/json" {
		t.Errorf("Expected Content-Type application/json, got %q", contentType)
	}

	var resp []models.GetItemResponse
	if err := json.NewDecoder(rr.Body).Decode(&resp); err != nil {
		t.Fatalf("Expected decodable items, got %v", err)
	}

	if len(resp) != 2 {
		t.Fatalf("Expected 2 items, got %d", len(resp))
	}

	for i, guid := range []string{"item-1", "item-2"} {
		if resp[i].GUID != guid {
			t.Errorf("Expected guid %s, got %q", guid, resp[i].GUID)
		}

		if resp[i].Status != models.Done {
			t.Errorf("Expected status %s, got %s", models.Done, resp[i].Status)
		}

		if resp[i].Title != "Stored title" {
			t.Errorf("Expected the untouched title, got %q", resp[i].Title)
		}

		if len(resp[i].Tags) != 1 || resp[i].Tags[0] != "stored" {
			t.Errorf("Expected the untouched tags, got %v", resp[i].Tags)
		}
	}
}
