package service

import (
	"context"
	"database/sql"
	"errors"
	"strings"

	"github.com/google/uuid"
	"github.com/luizgustavojunqueira/blink/internal/db"
	"github.com/luizgustavojunqueira/blink/internal/models"
)

func (s *Service) UpdateItem(ctx context.Context, req models.UpdateItemRequest) (*models.GetItemResponse, error) {
	var tagsStr *string
	if req.Tags != nil {
		joined := strings.Join(*req.Tags, ",")
		tagsStr = &joined
	}

	item, err := s.repo.UpdateItem(ctx, db.UpdateItemParams{
		Guid:        req.GUID,
		Title:       pointerToNullString(req.Title),
		Description: pointerToNullString(req.Description),
		Status:      pointerToNullString(req.Status),
		Priority:    pointerToNullString(req.Priority),
		Tags:        pointerToNullString(tagsStr),
	})
	if err != nil {
		return nil, err
	}

	tags := tagsToStringSlice(item.Tags)

	var parentGuid *string
	if item.ParentID.Valid {
		parent, err := s.repo.GetItem(ctx, item.ParentID.Int64)
		if err != nil {
			return nil, err
		}
		parentGuid = &parent.Guid
	}

	return &models.GetItemResponse{
		GUID:        item.Guid,
		Title:       item.Title,
		Description: nullStringToPointer(item.Description),
		Type:        models.ItemType(item.Type),
		Status:      models.ItemStatus(item.Status),
		Priority:    models.ItemPriority(item.Priority),
		Tags:        tags,
		ParentGUID:  parentGuid,
	}, nil
}

func (s *Service) CreateItem(ctx context.Context, req models.CreateItemRequest) (*models.GetItemResponse, error) {
	var tagsStr *string
	if len(req.Tags) > 0 {
		joined := strings.Join(req.Tags, ",")
		tagsStr = &joined
	}

	parentId := sql.NullInt64{Valid: false}

	if req.ParentGUID != nil {
		parentItem, err := s.repo.GetItemByGuid(ctx, *req.ParentGUID)
		if err != nil {
			return nil, err
		}

		if parentItem.Type != string(models.Group) {
			return nil, errors.New("parent is not of type Group")
		}

		parentId.Int64 = parentItem.ID
		parentId.Valid = true
	}

	item, err := s.repo.CreateItem(ctx, db.CreateItemParams{
		Guid:        uuid.New().String(),
		Title:       req.Title,
		Description: pointerToNullString(req.Description),
		Type:        string(req.Type),
		Status:      string(req.Status),
		Priority:    string(req.Priority),
		Tags:        pointerToNullString(tagsStr),
		ParentID:    parentId,
	})
	if err != nil {
		return nil, err
	}

	tags := tagsToStringSlice(item.Tags)

	return &models.GetItemResponse{
		GUID:        item.Guid,
		Title:       item.Title,
		Description: nullStringToPointer(item.Description),
		Type:        models.ItemType(item.Type),
		Status:      models.ItemStatus(item.Status),
		Priority:    models.ItemPriority(item.Priority),
		Tags:        tags,
		ParentGUID:  req.ParentGUID,
	}, nil
}

func (s *Service) GetItems(ctx context.Context, req models.GetItemRequest) ([]models.GetItemResponse, error) {
	var tags []string
	for _, tag := range req.Tags {
		tag := strings.Trim(tag, " ")
		tags = append(tags, tag)
	}

	filter := db.GetIemsFilter{
		Title:       req.Title,
		Description: req.Description,
		Priority:    toStringSlice(req.Priority),
		Status:      toStringSlice(req.Status),
		Type:        toStringSlice(req.Type),
		Tags:        tags,
		Order:       toDBOrders(models.ParseOrders(req.Order)),
		ParentID:    req.ParentID,
		Recursive:   req.Recursive,
	}

	if filter.Title != nil {
		title := strings.TrimSpace(*filter.Title)
		filter.Title = &title
	}

	if filter.Description != nil {
		desc := strings.TrimSpace(*filter.Description)
		filter.Description = &desc
	}

	items, err := s.repo.GetItemsDynamic(ctx, filter)
	if err != nil {
		return nil, err
	}

	itemsResponse := make([]models.GetItemResponse, 0)

	for _, item := range items {

		tags := tagsToStringSlice(item.Tags)

		itemResp := models.GetItemResponse{
			GUID:        item.Guid,
			Title:       item.Title,
			Description: nullStringToPointer(item.Description),
			Type:        models.ItemType(item.Type),
			Status:      models.ItemStatus(item.Status),
			Priority:    models.ItemPriority(item.Priority),
			Tags:        tags,
			ParentGUID:  nullStringToPointer(item.ParentGuid),
		}

		itemsResponse = append(itemsResponse, itemResp)
	}

	return itemsResponse, nil
}

func (s *Service) GetTags(ctx context.Context) (*models.GetTagsResponse, error) {
	tags, err := s.repo.GetTags(ctx)
	if err != nil {
		return nil, err
	}

	result := &models.GetTagsResponse{
		Tags: tags,
	}

	return result, nil
}

func (s *Service) BulkUpdateItem(ctx context.Context, req models.BulkUpdateItemRequest) ([]models.GetItemResponse, error) {
	var tagsStr *string
	if req.Tags != nil {
		joined := strings.Join(*req.Tags, ",")
		tagsStr = &joined
	}

	var parentId *int64

	if req.ParentGUID != nil {
		parentItem, err := s.repo.GetItemByGuid(ctx, *req.ParentGUID)
		if err != nil {
			return nil, err
		}

		if parentItem.Type != string(models.Group) {
			return nil, errors.New("parent is not of type Group")
		}

		inside, err := s.repo.IsInTree(ctx, req.GUIDS, *req.ParentGUID)
		if err != nil {
			return nil, err
		}

		if inside {
			return nil, errors.New("cannot move a group into itself")
		}

		parentId = &parentItem.ID
	}

	updateItems, err := s.repo.BulkUpdateItems(ctx, db.BulkUpdateItemsParams{
		Guids:       req.GUIDS,
		Title:       req.Title,
		Description: req.Description,
		Status:      pointerToString(req.Status),
		Priority:    pointerToString(req.Priority),
		Tags:        tagsStr,
		ParentID:    parentId,
	})
	if err != nil {
		return nil, err
	}

	itemsResponse := make([]models.GetItemResponse, 0)

	for _, item := range updateItems {

		tags := tagsToStringSlice(item.Tags)

		itemResp := models.GetItemResponse{
			GUID:        item.Guid,
			Title:       item.Title,
			Description: nullStringToPointer(item.Description),
			Type:        models.ItemType(item.Type),
			Status:      models.ItemStatus(item.Status),
			Priority:    models.ItemPriority(item.Priority),
			Tags:        tags,
			ParentGUID:  nullStringToPointer(item.ParentGuid),
		}

		itemsResponse = append(itemsResponse, itemResp)
	}

	return itemsResponse, nil
}

func (s *Service) DeleteItems(ctx context.Context, req models.ItemGuidsRequest) error {
	return s.repo.DeleteItems(ctx, req.GUIDS)
}

func (s *Service) RestoreItems(ctx context.Context, req models.ItemGuidsRequest) ([]models.GetItemResponse, error) {
	items, err := s.repo.RestoreItems(ctx, req.GUIDS)
	if err != nil {
		return nil, err
	}

	itemsResponse := make([]models.GetItemResponse, 0, len(items))

	for _, item := range items {
		itemsResponse = append(itemsResponse, models.GetItemResponse{
			GUID:        item.Guid,
			Title:       item.Title,
			Description: nullStringToPointer(item.Description),
			Type:        models.ItemType(item.Type),
			Status:      models.ItemStatus(item.Status),
			Priority:    models.ItemPriority(item.Priority),
			Tags:        tagsToStringSlice(item.Tags),
			ParentGUID:  nullStringToPointer(item.ParentGuid),
		})
	}

	return itemsResponse, nil
}
