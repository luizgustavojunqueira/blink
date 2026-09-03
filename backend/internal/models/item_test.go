package models_test

import (
	"slices"
	"testing"

	"github.com/luizgustavojunqueira/blink/internal/models"
)

func parseError(t *testing.T, err error, expect bool) {
	if expect && err == nil {
		t.Errorf("Expected error but got: %v", err)
	}

	if !expect && err != nil {
		t.Errorf("Didn't expect error but got: %v", err)
	}
}

func TestCreateItemRequest_Validate(t *testing.T) {
	tests := []struct {
		name        string
		req         models.CreateItemRequest
		expectError bool
	}{
		{
			name: "Success - Correct payload",
			req: models.CreateItemRequest{
				Title:    "Test item creation",
				Type:     models.Task,
				Status:   models.ToDo,
				Priority: models.Normal,
			},
			expectError: false,
		},
		{
			name: "Error - Missing Title",
			req: models.CreateItemRequest{
				Type:     models.Task,
				Status:   models.ToDo,
				Priority: models.Normal,
			},
			expectError: true,
		},
		{
			name: "Error - Missing Type",
			req: models.CreateItemRequest{
				Title:    "Test item creation",
				Status:   models.ToDo,
				Priority: models.Normal,
			},
			expectError: true,
		},
		{
			name: "Error - Missing Status",
			req: models.CreateItemRequest{
				Title:    "Test item creation",
				Type:     models.Task,
				Priority: models.Normal,
			},
			expectError: true,
		},
		{
			name: "Error - Missing Priority",
			req: models.CreateItemRequest{
				Title:  "Test item creation",
				Status: models.ToDo,
				Type:   models.Task,
			},
			expectError: true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			err := tt.req.Validate()
			parseError(t, err, tt.expectError)
		})
	}
}

func TestGetItemRequest_Validate(t *testing.T) {
	tests := []struct {
		name        string
		req         models.GetItemRequest
		expectError bool
	}{
		{
			name:        "Success - Empty payload",
			req:         models.GetItemRequest{},
			expectError: false,
		},
		{
			name: "Success - Correct filters",
			req: models.GetItemRequest{
				Type:     []models.ItemType{models.Task, models.Group},
				Status:   []models.ItemStatus{models.ToDo, models.InProgress},
				Priority: []models.ItemPriority{models.Normal, models.High},
			},
			expectError: false,
		},
		{
			name: "Error - Invalid Type",
			req: models.GetItemRequest{
				Type: []models.ItemType{"INVALID_TYPE"},
			},
			expectError: true,
		},
		{
			name: "Error - Invalid Status",
			req: models.GetItemRequest{
				Status: []models.ItemStatus{"INVALID_STATUS"},
			},
			expectError: true,
		},
		{
			name: "Error - Invalid Priority",
			req: models.GetItemRequest{
				Priority: []models.ItemPriority{"INVALID_PRIORITY"},
			},
			expectError: true,
		},
		{
			name: "Success - Correct order",
			req: models.GetItemRequest{
				Order: []string{"priority", "-status"},
			},
			expectError: false,
		},
		{
			name: "Error - Invalid order field",
			req: models.GetItemRequest{
				Order: []string{"created_at"},
			},
			expectError: true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			err := tt.req.Validate()
			parseError(t, err, tt.expectError)
		})
	}
}

func TestUpdateItemRequest_Validate(t *testing.T) {
	tests := []struct {
		name        string
		req         models.UpdateItemRequest
		expectError bool
	}{
		{
			name: "Success - guid only, nothing to change",
			req: models.UpdateItemRequest{
				GUID: "item-1",
			},
			expectError: false,
		},
		{
			name: "Success - partial update with a single field",
			req: models.UpdateItemRequest{
				GUID:   "item-1",
				Status: new(models.Done),
			},
			expectError: false,
		},
		{
			name: "Success - every field populated",
			req: models.UpdateItemRequest{
				GUID:        "item-1",
				Title:       new("Test item update"),
				Description: new("with tests"),
				Status:      new(models.InProgress),
				Priority:    new(models.High),
				Tags:        new([]string{"work"}),
			},
			expectError: false,
		},
		{
			name: "Error - Missing GUID",
			req: models.UpdateItemRequest{
				Status: new(models.Done),
			},
			expectError: true,
		},
		{
			name: "Error - Invalid Status",
			req: models.UpdateItemRequest{
				GUID:   "item-1",
				Status: new(models.ItemStatus("SLEEPING")),
			},
			expectError: true,
		},
		{
			name: "Error - Invalid Priority",
			req: models.UpdateItemRequest{
				GUID:     "item-1",
				Priority: new(models.ItemPriority("WHENEVER")),
			},
			expectError: true,
		},
		{
			name: "Error - Empty Status is not the same as absent",
			req: models.UpdateItemRequest{
				GUID:   "item-1",
				Status: new(models.ItemStatus("")),
			},
			expectError: true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			err := tt.req.Validate()
			parseError(t, err, tt.expectError)
		})
	}
}

func TestParseOrders(t *testing.T) {
	tests := []struct {
		name     string
		orders   []string
		expected []models.OrderBy
	}{
		{
			name:     "Empty input yields no entries",
			orders:   []string{},
			expected: []models.OrderBy{},
		},
		{
			name:     "Bare field is ascending",
			orders:   []string{"title"},
			expected: []models.OrderBy{{Field: models.OrderTitle, Desc: false}},
		},
		{
			name:     "Dash prefix is descending",
			orders:   []string{"-created"},
			expected: []models.OrderBy{{Field: models.OrderCreated, Desc: true}},
		},
		{
			name:     "Field is normalized to lower case",
			orders:   []string{"-STATUS"},
			expected: []models.OrderBy{{Field: models.OrderStatus, Desc: true}},
		},
		{
			name:   "Input order is preserved",
			orders: []string{"priority", "-status", "title"},
			expected: []models.OrderBy{
				{Field: models.OrderPriority, Desc: false},
				{Field: models.OrderStatus, Desc: true},
				{Field: models.OrderTitle, Desc: false},
			},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := models.ParseOrders(tt.orders)

			if !slices.Equal(got, tt.expected) {
				t.Errorf("Expected %v but got %v", tt.expected, got)
			}
		})
	}
}
