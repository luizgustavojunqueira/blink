// Package models
package models

import "errors"

type (
	ItemType     string
	ItemStatus   string
	ItemPriority string
)

const (
	Task  ItemType = "TASK"
	Group ItemType = "GROUP"
)

const (
	ToDo       ItemStatus = "TODO"
	InProgress ItemStatus = "IN_PROGRESS"
	Done       ItemStatus = "DONE"
	Canceled   ItemStatus = "CANCELED"
	Archived   ItemStatus = "ARCHIVED"
)

const (
	Low    ItemPriority = "LOW"
	Normal ItemPriority = "NORMAL"
	High   ItemPriority = "HIGH"
	Urgent ItemPriority = "URGENT"
)

type CreateItemRequest struct {
	Title       string       `json:"title"`
	Description *string      `json:"description"`
	Type        ItemType     `json:"type"`
	Status      ItemStatus   `json:"status"`
	Priority    ItemPriority `json:"priority"`
	Tags        []string     `json:"tags"`
}

type GetItemRequest struct {
	Title       *string        `json:"title"`
	Description *string        `json:"description"`
	Type        []ItemType     `json:"type,omitempty"`
	Status      []ItemStatus   `json:"status,omitempty"`
	Priority    []ItemPriority `json:"priority,omitempty"`
	Tags        []string       `json:"tags,omitempty"`
}

type GetItemResponse struct {
	GUID        string       `json:"guid"`
	Title       string       `json:"title"`
	Description *string      `json:"description"`
	Type        ItemType     `json:"type"`
	Status      ItemStatus   `json:"status"`
	Priority    ItemPriority `json:"priority"`
	Tags        []string     `json:"tags"`
}

func (req *GetItemRequest) Validate() error {
	for _, reqType := range req.Type {
		if reqType != Task && reqType != Group {
			return errors.New("invalid item types")
		}
	}

	validStatuses := map[ItemStatus]bool{
		ToDo: true, InProgress: true, Done: true, Canceled: true, Archived: true,
	}
	for _, reqStatus := range req.Status {
		if !validStatuses[reqStatus] {
			return errors.New("invalid statuses")
		}
	}

	validPriorities := map[ItemPriority]bool{
		Low: true, Normal: true, High: true, Urgent: true,
	}
	for _, reqPriority := range req.Priority {
		if !validPriorities[reqPriority] {
			return errors.New("invalid priorities")
		}
	}

	return nil
}

func (req *CreateItemRequest) Validate() error {
	if req.Title == "" {
		return errors.New("title is required")
	}

	if req.Type != Task && req.Type != Group {
		return errors.New("invalid item type")
	}

	validStatuses := map[ItemStatus]bool{
		ToDo: true, InProgress: true, Done: true, Canceled: true, Archived: true,
	}
	if !validStatuses[req.Status] {
		return errors.New("invalid status")
	}

	validPriorities := map[ItemPriority]bool{
		Low: true, Normal: true, High: true, Urgent: true,
	}
	if !validPriorities[req.Priority] {
		return errors.New("invalid priority")
	}

	return nil
}
