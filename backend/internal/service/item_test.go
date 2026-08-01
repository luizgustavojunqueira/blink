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
}
