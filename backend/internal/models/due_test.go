package models_test

import (
	"testing"

	"github.com/luizgustavojunqueira/blink/internal/models"
)

func TestDueDate_Validate(t *testing.T) {
	valid := models.CreateItemRequest{Title: "t", Type: models.Task, Status: models.ToDo, Priority: models.Normal}

	create := func(due *string) error {
		req := valid
		req.DueDate = due
		return req.Validate()
	}

	parseError(t, create(nil), false)
	parseError(t, create(new("2026-11-20")), false)
	parseError(t, create(new("20/11/2026")), true)
	parseError(t, create(new("2026-02-30")), true)
	parseError(t, create(new("")), true)

	parseError(t, (&models.UpdateItemRequest{GUID: "a", DueDate: new("")}).Validate(), false)
	parseError(t, (&models.UpdateItemRequest{GUID: "a", DueDate: new("tomorrow")}).Validate(), true)
	parseError(t, (&models.BulkUpdateItemRequest{GUIDS: []string{"a"}, DueDate: new("")}).Validate(), false)
	parseError(t, (&models.BulkUpdateItemRequest{GUIDS: []string{"a"}, DueDate: new("2026-13-01")}).Validate(), true)

	parseError(t, (&models.GetItemRequest{DueFrom: new("2026-11-01"), DueTo: new("2026-11-30")}).Validate(), false)
	parseError(t, (&models.GetItemRequest{DueTo: new("")}).Validate(), true)
	parseError(t, (&models.GetItemRequest{Order: []string{"due", "-due"}}).Validate(), false)
}
