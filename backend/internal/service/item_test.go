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
	simulateErr              error
	getItemByGuidErr         error
	getItemErr               error
	itemsByGuid              map[string]db.Item
	itemsByID                map[int64]db.Item
	updateItemParentID       sql.NullInt64
	bulkUpdateParentGuid     sql.NullString
	getItemCalled            bool
	capturedGetItemID        *int64
	capturedFilter           *db.GetIemsFilter
	capturedCreateParams     *db.CreateItemParams
	capturedUpdateParams     *db.UpdateItemParams
	capturedBulkUpdateParams *db.BulkUpdateItemsParams
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
		ParentID: m.updateItemParentID,
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

func (m *MockRepository) GetItemsDynamic(ctx context.Context, filter db.GetIemsFilter) ([]db.ItemWithParent, error) {
	m.capturedFilter = &filter
	if m.simulateErr != nil {
		return nil, m.simulateErr
	}

	return []db.ItemWithParent{
		{
			Item: db.Item{
				Guid:   "fake-guid",
				Title:  "Fake Title",
				Type:   "TASK",
				Status: "TODO",
				Tags:   sql.NullString{String: "tag1,tag2", Valid: true},
			},
		},
	}, nil
}

func (m *MockRepository) GetTags(ctx context.Context) ([]string, error) {
	if m.simulateErr != nil {
		return nil, m.simulateErr
	}
	return []string{"tag1", "tag2"}, nil
}

func (m *MockRepository) GetItemByGuid(ctx context.Context, guid string) (db.Item, error) {
	if m.simulateErr != nil {
		return db.Item{}, m.simulateErr
	}
	if m.getItemByGuidErr != nil {
		return db.Item{}, m.getItemByGuidErr
	}
	if item, ok := m.itemsByGuid[guid]; ok {
		return item, nil
	}
	return db.Item{}, sql.ErrNoRows
}

func (m *MockRepository) GetItem(ctx context.Context, id int64) (db.Item, error) {
	m.getItemCalled = true
	m.capturedGetItemID = &id
	if m.simulateErr != nil {
		return db.Item{}, m.simulateErr
	}
	if m.getItemErr != nil {
		return db.Item{}, m.getItemErr
	}
	if item, ok := m.itemsByID[id]; ok {
		return item, nil
	}
	return db.Item{}, sql.ErrNoRows
}

func (m *MockRepository) BulkUpdateItems(ctx context.Context, arg db.BulkUpdateItemsParams) ([]db.ItemWithParent, error) {
	m.capturedBulkUpdateParams = &arg
	if m.simulateErr != nil {
		return []db.ItemWithParent{}, m.simulateErr
	}
	items := make([]db.ItemWithParent, 0, len(arg.Guids))

	for _, guid := range arg.Guids {
		items = append(items, db.ItemWithParent{
			Item: db.Item{
				Guid:     guid,
				Title:    stringOrEmpty(arg.Title),
				Status:   stringOrEmpty(arg.Status),
				Priority: stringOrEmpty(arg.Priority),
				Tags:     pointerToNullString(arg.Tags),
				ParentID: m.updateItemParentID,
			},
			ParentGuid: m.bulkUpdateParentGuid,
		})
	}

	return items, nil
}

func stringOrEmpty(s *string) string {
	if s == nil {
		return ""
	}
	return *s
}

func pointerToNullString(s *string) sql.NullString {
	if s == nil {
		return sql.NullString{}
	}
	return sql.NullString{String: *s, Valid: true}
}

func assertStringPointer(t *testing.T, field string, got, want *string) {
	t.Helper()

	if want == nil {
		if got != nil {
			t.Errorf("%s: expected nil, got %q", field, *got)
		}
		return
	}

	if got == nil || *got != *want {
		t.Errorf("%s: expected %q, got %v", field, *want, got)
	}
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

func TestService_CreateItem_Parent(t *testing.T) {
	t.Run("Success - parent guid resolves to a group and is attached", func(t *testing.T) {
		mockRepo := &MockRepository{
			itemsByGuid: map[string]db.Item{
				"parent-guid": {ID: 42, Guid: "parent-guid", Type: string(models.Group)},
			},
		}
		svc := service.NewService(mockRepo)

		parentGuid := "parent-guid"
		req := models.CreateItemRequest{
			Title:      "child",
			Type:       models.Task,
			Status:     models.ToDo,
			Priority:   models.Normal,
			ParentGUID: &parentGuid,
		}

		resp, err := svc.CreateItem(context.Background(), req)
		if err != nil {
			t.Fatalf("expected no error, got %v", err)
		}

		if mockRepo.capturedCreateParams == nil {
			t.Fatal("expected repo to be called")
		}

		if !mockRepo.capturedCreateParams.ParentID.Valid || mockRepo.capturedCreateParams.ParentID.Int64 != 42 {
			t.Errorf("expected parent id 42, got %+v", mockRepo.capturedCreateParams.ParentID)
		}

		if resp.ParentGUID == nil || *resp.ParentGUID != parentGuid {
			t.Errorf("expected response parent id %s, got %v", parentGuid, resp.ParentGUID)
		}
	})

	t.Run("Error - parent guid does not exist", func(t *testing.T) {
		mockRepo := &MockRepository{}
		svc := service.NewService(mockRepo)

		parentGuid := "does-not-exist"
		req := models.CreateItemRequest{
			Title:      "child",
			Type:       models.Task,
			Status:     models.ToDo,
			Priority:   models.Normal,
			ParentGUID: &parentGuid,
		}

		if _, err := svc.CreateItem(context.Background(), req); err == nil {
			t.Error("expected an error when the parent guid does not exist")
		}

		if mockRepo.capturedCreateParams != nil {
			t.Error("expected CreateItem to not be called when the parent lookup fails")
		}
	})

	t.Run("Error - parent exists but is not a Group", func(t *testing.T) {
		mockRepo := &MockRepository{
			itemsByGuid: map[string]db.Item{
				"parent-guid": {ID: 42, Guid: "parent-guid", Type: string(models.Task)},
			},
		}
		svc := service.NewService(mockRepo)

		parentGuid := "parent-guid"
		req := models.CreateItemRequest{
			Title:      "child",
			Type:       models.Task,
			Status:     models.ToDo,
			Priority:   models.Normal,
			ParentGUID: &parentGuid,
		}

		if _, err := svc.CreateItem(context.Background(), req); err == nil {
			t.Error("expected an error when the parent is not of type Group")
		}

		if mockRepo.capturedCreateParams != nil {
			t.Error("expected CreateItem to not be called when the parent is not a Group")
		}
	})
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

func TestService_GetItems_Parent(t *testing.T) {
	mockRepo := &MockRepository{}
	svc := service.NewService(mockRepo)

	parentGuid := "parent-guid"
	resp, err := svc.GetItems(context.Background(), models.GetItemRequest{ParentID: &parentGuid})
	if err != nil {
		t.Fatalf("expected no error, got %v", err)
	}

	if mockRepo.capturedFilter == nil || mockRepo.capturedFilter.ParentID == nil || *mockRepo.capturedFilter.ParentID != parentGuid {
		t.Errorf("expected filter parent id %q, got %v", parentGuid, mockRepo.capturedFilter.ParentID)
	}

	if resp[0].ParentGUID != nil {
		t.Errorf("expected nil parent id when the item has none, got %v", *resp[0].ParentGUID)
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

	_, err = svc.BulkUpdateItem(context.Background(), models.BulkUpdateItemRequest{GUIDS: []string{"item-1"}})
	if err == nil {
		t.Errorf("Expected BulkUpdateItem to return an error when DB fails")
	}
}

func TestService_UpdateItem_Parent(t *testing.T) {
	t.Run("Item without a parent skips the parent lookup entirely", func(t *testing.T) {
		mockRepo := &MockRepository{}
		svc := service.NewService(mockRepo)

		resp, err := svc.UpdateItem(context.Background(), models.UpdateItemRequest{GUID: "item-1"})
		if err != nil {
			t.Fatalf("expected no error, got %v", err)
		}

		if mockRepo.getItemCalled {
			t.Error("expected GetItem to not be called for an item without a parent")
		}

		if resp.ParentGUID != nil {
			t.Errorf("expected nil parent id, got %v", *resp.ParentGUID)
		}
	})

	t.Run("Item with a parent resolves its guid", func(t *testing.T) {
		mockRepo := &MockRepository{
			updateItemParentID: sql.NullInt64{Int64: 42, Valid: true},
			itemsByID: map[int64]db.Item{
				42: {ID: 42, Guid: "parent-guid"},
			},
		}
		svc := service.NewService(mockRepo)

		resp, err := svc.UpdateItem(context.Background(), models.UpdateItemRequest{GUID: "item-1"})
		if err != nil {
			t.Fatalf("expected no error, got %v", err)
		}

		if mockRepo.capturedGetItemID == nil || *mockRepo.capturedGetItemID != 42 {
			t.Errorf("expected GetItem to be called with id 42, got %v", mockRepo.capturedGetItemID)
		}

		if resp.ParentGUID == nil || *resp.ParentGUID != "parent-guid" {
			t.Errorf("expected parent id %q, got %v", "parent-guid", resp.ParentGUID)
		}
	})

	t.Run("Error - parent lookup fails", func(t *testing.T) {
		mockRepo := &MockRepository{
			updateItemParentID: sql.NullInt64{Int64: 42, Valid: true},
			getItemErr:         errors.New("parent lookup failed"),
		}
		svc := service.NewService(mockRepo)

		if _, err := svc.UpdateItem(context.Background(), models.UpdateItemRequest{GUID: "item-1"}); err == nil {
			t.Error("expected UpdateItem to return an error when the parent lookup fails")
		}
	})
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

func TestService_BulkUpdateItem(t *testing.T) {
	tests := []struct {
		name         string
		request      models.BulkUpdateItemRequest
		wantTitle    *string
		wantDesc     *string
		wantStatus   *string
		wantPriority *string
		wantTags     *string
		wantRespTags []string
	}{
		{
			name:         "Success - status only leaves the other columns out of the SET",
			request:      models.BulkUpdateItemRequest{GUIDS: []string{"item-1", "item-2"}, Status: new(models.Done)},
			wantStatus:   new("DONE"),
			wantRespTags: []string{},
		},
		{
			name: "Success - every field at once, tags joined into CSV",
			request: models.BulkUpdateItemRequest{
				GUIDS:       []string{"item-1", "item-2"},
				Title:       new("Build blink"),
				Description: new("with tests"),
				Status:      new(models.InProgress),
				Priority:    new(models.High),
				Tags:        new([]string{"work", "urgent"}),
			},
			wantTitle:    new("Build blink"),
			wantDesc:     new("with tests"),
			wantStatus:   new("IN_PROGRESS"),
			wantPriority: new("HIGH"),
			wantTags:     new("work,urgent"),
			wantRespTags: []string{"work", "urgent"},
		},
		{
			name:         "Success - empty tags slice clears the column",
			request:      models.BulkUpdateItemRequest{GUIDS: []string{"item-1", "item-2"}, Tags: new([]string{})},
			wantTags:     new(""),
			wantRespTags: []string{},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			mockRepo := &MockRepository{}
			svc := service.NewService(mockRepo)

			resp, err := svc.BulkUpdateItem(context.Background(), tt.request)
			if err != nil {
				t.Fatalf("expected no error, got %v", err)
			}

			if mockRepo.capturedBulkUpdateParams == nil {
				t.Fatal("expected repo to be called")
			}

			if len(mockRepo.capturedBulkUpdateParams.Guids) != len(tt.request.GUIDS) {
				t.Fatalf("expected guids %v, got %v", tt.request.GUIDS, mockRepo.capturedBulkUpdateParams.Guids)
			}

			for i, guid := range tt.request.GUIDS {
				if mockRepo.capturedBulkUpdateParams.Guids[i] != guid {
					t.Errorf("expected guid %s, got %s", guid, mockRepo.capturedBulkUpdateParams.Guids[i])
				}
			}

			if mockRepo.capturedBulkUpdateParams.ParentID != nil {
				t.Errorf("expected no parent id, got %d", *mockRepo.capturedBulkUpdateParams.ParentID)
			}

			assertStringPointer(t, "title", mockRepo.capturedBulkUpdateParams.Title, tt.wantTitle)
			assertStringPointer(t, "description", mockRepo.capturedBulkUpdateParams.Description, tt.wantDesc)
			assertStringPointer(t, "status", mockRepo.capturedBulkUpdateParams.Status, tt.wantStatus)
			assertStringPointer(t, "priority", mockRepo.capturedBulkUpdateParams.Priority, tt.wantPriority)
			assertStringPointer(t, "tags", mockRepo.capturedBulkUpdateParams.Tags, tt.wantTags)

			if len(resp) != len(tt.request.GUIDS) {
				t.Fatalf("expected %d items, got %d", len(tt.request.GUIDS), len(resp))
			}

			for i, guid := range tt.request.GUIDS {
				if resp[i].GUID != guid {
					t.Errorf("expected response guid %s, got %s", guid, resp[i].GUID)
				}

				if tt.wantStatus != nil && string(resp[i].Status) != *tt.wantStatus {
					t.Errorf("expected response status %q, got %q", *tt.wantStatus, resp[i].Status)
				}

				if len(resp[i].Tags) != len(tt.wantRespTags) {
					t.Fatalf("expected tags %v, got %v", tt.wantRespTags, resp[i].Tags)
				}

				for j, tag := range tt.wantRespTags {
					if resp[i].Tags[j] != tag {
						t.Errorf("expected tag %v, got %v", tag, resp[i].Tags[j])
					}
				}
			}
		})
	}
}

func TestService_BulkUpdateItem_Parent(t *testing.T) {
	t.Run("Success - parent guid resolves to a group and is attached", func(t *testing.T) {
		mockRepo := &MockRepository{
			itemsByGuid: map[string]db.Item{
				"parent-guid": {ID: 42, Guid: "parent-guid", Type: string(models.Group)},
			},
			bulkUpdateParentGuid: sql.NullString{String: "parent-guid", Valid: true},
		}
		svc := service.NewService(mockRepo)

		parentGuid := "parent-guid"
		resp, err := svc.BulkUpdateItem(context.Background(), models.BulkUpdateItemRequest{
			GUIDS:      []string{"item-1", "item-2"},
			ParentGUID: &parentGuid,
		})
		if err != nil {
			t.Fatalf("expected no error, got %v", err)
		}

		if mockRepo.capturedBulkUpdateParams == nil {
			t.Fatal("expected repo to be called")
		}

		if mockRepo.capturedBulkUpdateParams.ParentID == nil || *mockRepo.capturedBulkUpdateParams.ParentID != 42 {
			t.Errorf("expected parent id 42, got %v", mockRepo.capturedBulkUpdateParams.ParentID)
		}

		for _, item := range resp {
			if item.ParentGUID == nil || *item.ParentGUID != parentGuid {
				t.Errorf("expected response parent guid %s, got %v", parentGuid, item.ParentGUID)
			}
		}
	})

	t.Run("The parent guid of an untouched parent comes from the updated row", func(t *testing.T) {
		mockRepo := &MockRepository{
			bulkUpdateParentGuid: sql.NullString{String: "existing-parent", Valid: true},
		}
		svc := service.NewService(mockRepo)

		resp, err := svc.BulkUpdateItem(context.Background(), models.BulkUpdateItemRequest{
			GUIDS:  []string{"item-1"},
			Status: new(models.Done),
		})
		if err != nil {
			t.Fatalf("expected no error, got %v", err)
		}

		if mockRepo.capturedBulkUpdateParams.ParentID != nil {
			t.Errorf("expected parent id to stay out of the SET, got %d", *mockRepo.capturedBulkUpdateParams.ParentID)
		}

		if resp[0].ParentGUID == nil || *resp[0].ParentGUID != "existing-parent" {
			t.Errorf("expected parent guid %q, got %v", "existing-parent", resp[0].ParentGUID)
		}
	})

	t.Run("Error - parent guid does not exist", func(t *testing.T) {
		mockRepo := &MockRepository{}
		svc := service.NewService(mockRepo)

		parentGuid := "does-not-exist"
		_, err := svc.BulkUpdateItem(context.Background(), models.BulkUpdateItemRequest{
			GUIDS:      []string{"item-1"},
			ParentGUID: &parentGuid,
		})
		if err == nil {
			t.Error("expected an error when the parent guid does not exist")
		}

		if mockRepo.capturedBulkUpdateParams != nil {
			t.Error("expected BulkUpdateItems to not be called when the parent lookup fails")
		}
	})

	t.Run("Error - parent exists but is not a Group", func(t *testing.T) {
		mockRepo := &MockRepository{
			itemsByGuid: map[string]db.Item{
				"parent-guid": {ID: 42, Guid: "parent-guid", Type: string(models.Task)},
			},
		}
		svc := service.NewService(mockRepo)

		parentGuid := "parent-guid"
		_, err := svc.BulkUpdateItem(context.Background(), models.BulkUpdateItemRequest{
			GUIDS:      []string{"item-1"},
			ParentGUID: &parentGuid,
		})
		if err == nil {
			t.Error("expected an error when the parent is not of type Group")
		}

		if mockRepo.capturedBulkUpdateParams != nil {
			t.Error("expected BulkUpdateItems to not be called when the parent is not a Group")
		}
	})
}
