package service_test

import (
	"context"
	"database/sql"
	"errors"
	"testing"

	"github.com/luizgustavojunqueira/blink/internal/db"
	"github.com/luizgustavojunqueira/blink/internal/models"
	"github.com/luizgustavojunqueira/blink/internal/service"
)

type MockRepository struct {
	simulateErr          error
	capturedFilter       *db.GetIemsFilter
	capturedCreateParams *db.CreateItemParams
	capturedUpdateParams *db.UpdateItemParams
}

func (m *MockRepository) UpdateItem(ctx context.Context, arg db.UpdateItemParams) (db.Item, error) {
	m.capturedUpdateParams = &arg
	if m.simulateErr != nil {
		return db.Item{}, m.simulateErr
	}
	return db.Item{
		Guid:     arg.Guid,
		Title:    arg.Title.String,
		Status:   arg.Status.String,
		Priority: arg.Priority.String,
		Tags:     arg.Tags,
	}, nil
}

func (m *MockRepository) CreateItem(ctx context.Context, arg db.CreateItemParams) (db.Item, error) {
	m.capturedCreateParams = &arg
	if m.simulateErr != nil {
		return db.Item{}, m.simulateErr
	}
	return db.Item{
		Guid:     arg.Guid,
		Title:    arg.Title,
		Type:     arg.Type,
		Status:   arg.Status,
		Priority: arg.Priority,
		Tags:     arg.Tags,
	}, nil
}

func (m *MockRepository) GetItemsDynamic(ctx context.Context, filter db.GetIemsFilter) ([]db.Item, error) {
	m.capturedFilter = &filter
	if m.simulateErr != nil {
		return nil, m.simulateErr
	}

	return []db.Item{
		{
			Guid:   "fake-guid",
			Title:  "Fake Title",
			Type:   "TASK",
			Status: "TODO",
			Tags:   sql.NullString{String: "tag1,tag2", Valid: true},
		},
	}, nil
}

func (m *MockRepository) GetTags(ctx context.Context) ([]string, error) {
	if m.simulateErr != nil {
		return nil, m.simulateErr
	}
	return []string{"tag1", "tag2"}, nil
}

func TestService_CreateItem(t *testing.T) {
	mockRepo := &MockRepository{}
	svc := service.NewService(mockRepo)

	req := models.CreateItemRequest{
		Title:    "Test service",
		Type:     models.Task,
		Status:   models.ToDo,
		Priority: models.Normal,
		Tags:     []string{"work", "urgent"},
	}

	resp, err := svc.CreateItem(context.Background(), req)
	if err != nil {
		t.Fatalf("expected no error, got %v", err)
	}

	if resp.Title != req.Title {
		t.Errorf("expected title %s, got %s", req.Title, resp.Title)
	}

	if mockRepo.capturedCreateParams == nil {
		t.Fatal("expected repo to be called")
	}

	if !mockRepo.capturedCreateParams.Tags.Valid || mockRepo.capturedCreateParams.Tags.String != "work,urgent" {
		t.Errorf("expected tags CSV 'work,urgent', got '%s'", mockRepo.capturedCreateParams.Tags.String)
	}

	if len(resp.Tags) != 2 || resp.Tags[0] != "work" {
		t.Errorf("expected tags array, got %v", resp.Tags)
	}
}

func TestService_GetItems(t *testing.T) {
	tests := []struct {
		name                string
		request             models.GetItemRequest
		expectedTitleFilter *string
		expectedDescFilter  *string
		expectedTagsFilter  []string
	}{
		{
			name: "Success - all fields populated with spaces",
			request: models.GetItemRequest{
				Title:       new("  my title  "),
				Description: new(" desc "),
				Type:        []models.ItemType{models.Task, models.Group},
				Status:      []models.ItemStatus{models.ToDo},
				Priority:    []models.ItemPriority{models.High},
				Tags:        []string{"  tag1 ", " tag2"},
			},
			expectedTitleFilter: new("my title"),
			expectedDescFilter:  new("desc"),
			expectedTagsFilter:  []string{"tag1", "tag2"},
		},
		{
			name:                "Success - empty request (nil pointers)",
			request:             models.GetItemRequest{},
			expectedTitleFilter: nil,
			expectedDescFilter:  nil,
			expectedTagsFilter:  nil,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			mockRepo := &MockRepository{}
			svc := service.NewService(mockRepo)

			resp, err := svc.GetItems(context.Background(), tt.request)
			if err != nil {
				t.Fatalf("expected no error, got %v", err)
			}

			if mockRepo.capturedFilter == nil {
				t.Fatal("expected repo to be called")
			}

			if tt.expectedTitleFilter != nil {
				if mockRepo.capturedFilter.Title == nil || *mockRepo.capturedFilter.Title != *tt.expectedTitleFilter {
					t.Errorf("expected title filter %v, got %v", *tt.expectedTitleFilter, mockRepo.capturedFilter.Title)
				}
			} else if mockRepo.capturedFilter.Title != nil {
				t.Errorf("expected nil title filter, got %v", *mockRepo.capturedFilter.Title)
			}

			if tt.expectedDescFilter != nil {
				if mockRepo.capturedFilter.Description == nil || *mockRepo.capturedFilter.Description != *tt.expectedDescFilter {
					t.Errorf("expected desc filter %v, got %v", *tt.expectedDescFilter, mockRepo.capturedFilter.Description)
				}
			} else if mockRepo.capturedFilter.Description != nil {
				t.Errorf("expected nil desc filter, got %v", *mockRepo.capturedFilter.Description)
			}

			if len(mockRepo.capturedFilter.Tags) != len(tt.expectedTagsFilter) {
				t.Errorf("expected tags filter %v, got %v", tt.expectedTagsFilter, mockRepo.capturedFilter.Tags)
			} else {
				for i, tag := range tt.expectedTagsFilter {
					if mockRepo.capturedFilter.Tags[i] != tag {
						t.Errorf("expected tag %v, got %v", tag, mockRepo.capturedFilter.Tags[i])
					}
				}
			}

			if len(mockRepo.capturedFilter.Type) != len(tt.request.Type) {
				t.Errorf("expected mapped type array of len %d, got %v", len(tt.request.Type), mockRepo.capturedFilter.Type)
			}

			if len(resp) != 1 {
				t.Fatalf("expected 1 item, got %d", len(resp))
			}
			if len(resp[0].Tags) != 2 || resp[0].Tags[0] != "tag1" {
				t.Errorf("expected parsed tags, got %v", resp[0].Tags)
			}
		})
	}
}

func TestService_Errors(t *testing.T) {
	mockRepo := &MockRepository{
		simulateErr: errors.New("db is down"),
	}
	svc := service.NewService(mockRepo)

	_, err := svc.CreateItem(context.Background(), models.CreateItemRequest{})
	if err == nil {
		t.Errorf("Expected CreateItem to return an error when DB fails")
	}

	_, err = svc.GetItems(context.Background(), models.GetItemRequest{})
	if err == nil {
		t.Errorf("Expected GetItems to return an error when DB fails")
	}

	_, err = svc.UpdateItem(context.Background(), models.UpdateItemRequest{GUID: "item-1"})
	if err == nil {
		t.Errorf("Expected UpdateItem to return an error when DB fails")
	}
}

func assertNullString(t *testing.T, field string, got, want sql.NullString) {
	t.Helper()

	if got.Valid != want.Valid || got.String != want.String {
		t.Errorf("%s: expected %+v, got %+v", field, want, got)
	}
}

func TestService_UpdateItem(t *testing.T) {
	tests := []struct {
		name         string
		request      models.UpdateItemRequest
		wantTitle    sql.NullString
		wantDesc     sql.NullString
		wantStatus   sql.NullString
		wantPriority sql.NullString
		wantTags     sql.NullString
		wantRespTags []string
	}{
		{
			name:         "Success - status only leaves the other columns untouched",
			request:      models.UpdateItemRequest{GUID: "item-1", Status: new(models.Done)},
			wantStatus:   sql.NullString{String: "DONE", Valid: true},
			wantRespTags: []string{},
		},
		{
			name: "Success - every field at once, tags joined into CSV",
			request: models.UpdateItemRequest{
				GUID:        "item-1",
				Title:       new("Build blink"),
				Description: new("with tests"),
				Status:      new(models.InProgress),
				Priority:    new(models.High),
				Tags:        new([]string{"work", "urgent"}),
			},
			wantTitle:    sql.NullString{String: "Build blink", Valid: true},
			wantDesc:     sql.NullString{String: "with tests", Valid: true},
			wantStatus:   sql.NullString{String: "IN_PROGRESS", Valid: true},
			wantPriority: sql.NullString{String: "HIGH", Valid: true},
			wantTags:     sql.NullString{String: "work,urgent", Valid: true},
			wantRespTags: []string{"work", "urgent"},
		},
		{
			name:         "Success - empty tags slice clears the column",
			request:      models.UpdateItemRequest{GUID: "item-1", Tags: new([]string{})},
			wantTags:     sql.NullString{String: "", Valid: true},
			wantRespTags: []string{},
		},
		{
			name:         "Success - nil tags leaves the column untouched",
			request:      models.UpdateItemRequest{GUID: "item-1", Status: new(models.ToDo)},
			wantStatus:   sql.NullString{String: "TODO", Valid: true},
			wantRespTags: []string{},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			mockRepo := &MockRepository{}
			svc := service.NewService(mockRepo)

			resp, err := svc.UpdateItem(context.Background(), tt.request)
			if err != nil {
				t.Fatalf("expected no error, got %v", err)
			}

			if mockRepo.capturedUpdateParams == nil {
				t.Fatal("expected repo to be called")
			}

			if mockRepo.capturedUpdateParams.Guid != tt.request.GUID {
				t.Errorf("expected guid %s, got %s", tt.request.GUID, mockRepo.capturedUpdateParams.Guid)
			}

			assertNullString(t, "title", mockRepo.capturedUpdateParams.Title, tt.wantTitle)
			assertNullString(t, "description", mockRepo.capturedUpdateParams.Description, tt.wantDesc)
			assertNullString(t, "status", mockRepo.capturedUpdateParams.Status, tt.wantStatus)
			assertNullString(t, "priority", mockRepo.capturedUpdateParams.Priority, tt.wantPriority)
			assertNullString(t, "tags", mockRepo.capturedUpdateParams.Tags, tt.wantTags)

			if resp.GUID != tt.request.GUID {
				t.Errorf("expected response guid %s, got %s", tt.request.GUID, resp.GUID)
			}

			if string(resp.Status) != tt.wantStatus.String {
				t.Errorf("expected response status %q, got %q", tt.wantStatus.String, resp.Status)
			}

			if len(resp.Tags) != len(tt.wantRespTags) {
				t.Fatalf("expected tags %v, got %v", tt.wantRespTags, resp.Tags)
			}

			for i, tag := range tt.wantRespTags {
				if resp.Tags[i] != tag {
					t.Errorf("expected tag %v, got %v", tag, resp.Tags[i])
				}
			}
		})
	}
}
