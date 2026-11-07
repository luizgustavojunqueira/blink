// Package models
package models

import (
	"github.com/luizgustavojunqueira/blink/internal/apperr"
	"strings"
	"time"
)

type (
	ItemType     string
	ItemStatus   string
	ItemPriority string
	OrderField   string
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

const (
	OrderTitle    OrderField = "title"
	OrderCreated  OrderField = "created"
	OrderUpdated  OrderField = "updated"
	OrderStatus   OrderField = "status"
	OrderPriority OrderField = "priority"
	OrderDue      OrderField = "due"
)

type CreateItemRequest struct {
	ParentGUID  *string      `json:"parent_guid"`
	Title       string       `json:"title"`
	Description *string      `json:"description"`
	Type        ItemType     `json:"type"`
	Status      ItemStatus   `json:"status"`
	Priority    ItemPriority `json:"priority"`
	Tags        []string     `json:"tags"`
	DueDate     *string      `json:"due_date"`
}

type UpdateItemRequest struct {
	GUID        string        `json:"guid"`
	Title       *string       `json:"title"`
	Description *string       `json:"description"`
	Status      *ItemStatus   `json:"status"`
	Priority    *ItemPriority `json:"priority"`
	Tags        *[]string     `json:"tags,omitempty"`
	DueDate     *string       `json:"due_date"`
}

type BulkUpdateItemRequest struct {
	GUIDS       []string      `json:"guids"`
	Title       *string       `json:"title"`
	Description *string       `json:"description"`
	Status      *ItemStatus   `json:"status"`
	Priority    *ItemPriority `json:"priority"`
	Tags        *[]string     `json:"tags,omitempty"`
	ParentGUID  *string       `json:"parent_guid"`
	DueDate     *string       `json:"due_date"`
}

type ItemGuidsRequest struct {
	GUIDS []string `json:"guids"`
}

type GetItemRequest struct {
	ParentID    *string        `json:"parent_id,omitempty"`
	Title       *string        `json:"title"`
	Description *string        `json:"description"`
	Type        []ItemType     `json:"type,omitempty"`
	Status      []ItemStatus   `json:"status,omitempty"`
	Priority    []ItemPriority `json:"priority,omitempty"`
	Tags        []string       `json:"tags,omitempty"`
	Order       []string       `json:"order,omitempty"`
	Recursive   bool           `json:"recursive,omitempty"`
	DueFrom     *string        `json:"due_from,omitempty"`
	DueTo       *string        `json:"due_to,omitempty"`
}

type OrderBy struct {
	Field OrderField `json:"field"`
	Desc  bool       `json:"desc"`
}

type GetItemResponse struct {
	ParentGUID  *string      `json:"parent_guid"`
	GUID        string       `json:"guid"`
	Title       string       `json:"title"`
	Description *string      `json:"description"`
	Type        ItemType     `json:"type"`
	Status      ItemStatus   `json:"status"`
	Priority    ItemPriority `json:"priority"`
	Tags        []string     `json:"tags"`
	DueDate     *string      `json:"due_date"`
}

type ItemHistoryEntry struct {
	At       time.Time `json:"at"`
	Actor    *string   `json:"actor"`
	OldValue *string   `json:"old_value"`
	NewValue *string   `json:"new_value"`
	Field    string    `json:"field"`
}

type GetTagsResponse struct {
	Tags []string `json:"tags,omitempty"`
}

var (
	ErrInvalidItemTypes  = apperr.New("invalid_item_types", "invalid item types")
	ErrGUIDRequired      = apperr.New("guid_required", "guid is required")
	ErrGUIDsRequired     = apperr.New("guids_required", "guids are required")
	ErrTitleRequired     = apperr.New("title_required", "title is required")
	ErrParentIDEmpty     = apperr.New("parent_id_empty", "parent id cannot be empty")
	ErrInvalidItemType   = apperr.New("invalid_item_type", "invalid item type")
	ErrInvalidDueDate    = apperr.New("invalid_due_date", "due date must be YYYY-MM-DD")
	ErrInvalidStatus     = apperr.New("invalid_status", "invalid status")
	ErrInvalidOrderField = apperr.New("invalid_order_field", "invalid field")
	ErrInvalidPriority   = apperr.New("invalid_priority", "invalid priority")
)

func (req *GetItemRequest) Validate() error {
	for _, reqType := range req.Type {
		if reqType != Task && reqType != Group {
			return ErrInvalidItemTypes
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

	if err := validDueDate(req.DueFrom, false); err != nil {
		return err
	}
	if err := validDueDate(req.DueTo, false); err != nil {
		return err
	}

	parsedOrders := ParseOrders(req.Order)

	for _, pO := range parsedOrders {
		if err := validField(pO.Field); err != nil {
			return err
		}
	}

	return nil
}

func (req *BulkUpdateItemRequest) Validate() error {
	if len(req.GUIDS) == 0 {
		return ErrGUIDRequired
	}

	if err := validDueDate(req.DueDate, true); err != nil {
		return err
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

func (req *ItemGuidsRequest) Validate() error {
	if len(req.GUIDS) == 0 {
		return ErrGUIDsRequired
	}

	return nil
}

func (req *UpdateItemRequest) Validate() error {
	if req.GUID == "" {
		return ErrGUIDRequired
	}

	if err := validDueDate(req.DueDate, true); err != nil {
		return err
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
		return ErrTitleRequired
	}

	if req.ParentGUID != nil && *req.ParentGUID == "" {
		return ErrParentIDEmpty
	}

	if req.Type != Task && req.Type != Group {
		return ErrInvalidItemType
	}

	if err := validDueDate(req.DueDate, false); err != nil {
		return err
	}

	if err := validStatus(req.Status); err != nil {
		return err
	}

	if err := validPriority(req.Priority); err != nil {
		return err
	}

	return nil
}

func validDueDate(date *string, allowEmpty bool) error {
	if date == nil || (allowEmpty && *date == "") {
		return nil
	}
	if _, err := time.Parse(time.DateOnly, *date); err != nil {
		return ErrInvalidDueDate
	}
	return nil
}

func validStatus(s ItemStatus) error {
	validStatuses := map[ItemStatus]bool{
		ToDo: true, InProgress: true, Done: true, Canceled: true, Archived: true,
	}
	if !validStatuses[s] {
		return ErrInvalidStatus
	}
	return nil
}

func validField(field OrderField) error {
	validFields := map[OrderField]bool{
		OrderPriority: true, OrderTitle: true, OrderStatus: true, OrderCreated: true, OrderUpdated: true, OrderDue: true,
	}
	if !validFields[field] {
		return ErrInvalidOrderField
	}
	return nil
}

func validPriority(p ItemPriority) error {
	validPriorities := map[ItemPriority]bool{
		Low: true, Normal: true, High: true, Urgent: true,
	}
	if !validPriorities[p] {
		return ErrInvalidPriority
	}
	return nil
}

func ParseOrders(orders []string) []OrderBy {
	parsedOrders := make([]OrderBy, 0, len(orders))

	for _, order := range orders {
		res, found := strings.CutPrefix(order, "-")
		parsedOrders = append(parsedOrders, OrderBy{
			Field: OrderField(strings.ToLower(res)),
			Desc:  found,
		})
	}
	return parsedOrders
}
