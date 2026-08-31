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

type UpdateItemRequest struct {
	GUID        string        `json:"guid"`
	Title       *string       `json:"title"`
	Description *string       `json:"description"`
	Status      *ItemStatus   `json:"status"`
	Priority    *ItemPriority `json:"priority"`
	Tags        *[]string     `json:"tags,omitempty"`
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

type GetTagsResponse struct {
	Tags []string `json:"tags,omitempty"`
}

func (req *GetItemRequest) Validate() error {
	for _, reqType := range req.Type {
		if reqType != Task && reqType != Group {
			return errors.New("invalid item types")
		}
	}

	for _, reqStatus := range req.Status {
		if err := validStatus(reqStatus); err != nil {
			return err
		}
	}

	for _, reqPriority := range req.Priority {
		if err := validPriority(reqPriority); err != nil {
			return err
		}
	}

	return nil
}

func (req *UpdateItemRequest) Validate() error {
	if req.GUID == "" {
		return errors.New("guid is required")
	}
	if req.Status != nil {
		if err := validStatus(*req.Status); err != nil {
			return err
		}
	}

	if req.Priority != nil {
		if err := validPriority(*req.Priority); err != nil {
			return err
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

	if err := validStatus(req.Status); err != nil {
		return err
	}

	if err := validPriority(req.Priority); err != nil {
		return err
	}

	return nil
}

func validStatus(s ItemStatus) error {
	validStatuses := map[ItemStatus]bool{
		ToDo: true, InProgress: true, Done: true, Canceled: true, Archived: true,
	}
	if !validStatuses[s] {
		return errors.New("invalid status")
	}
	return nil
}

func validPriority(p ItemPriority) error {
	validPriorities := map[ItemPriority]bool{
		Low: true, Normal: true, High: true, Urgent: true,
	}
	if !validPriorities[p] {
		return errors.New("invalid priority")
	}
	return nil
}
