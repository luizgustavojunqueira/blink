package models_test

import (
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
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			err := tt.req.Validate()
			parseError(t, err, tt.expectError)
		})
	}
}
