package service

import (
	"context"
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

	return &models.GetItemResponse{
		GUID:        item.Guid,
		Title:       item.Title,
		Description: nullStringToPointer(item.Description),
		Type:        models.ItemType(item.Type),
		Status:      models.ItemStatus(item.Status),
		Priority:    models.ItemPriority(item.Priority),
		Tags:        tags,
	}, nil
}

func (s *Service) CreateItem(ctx context.Context, req models.CreateItemRequest) (*models.GetItemResponse, error) {
	var tagsStr *string
	if len(req.Tags) > 0 {
		joined := strings.Join(req.Tags, ",")
		tagsStr = &joined
	}

	item, err := s.repo.CreateItem(ctx, db.CreateItemParams{
		Guid:        uuid.New().String(),
		Title:       req.Title,
		Description: pointerToNullString(req.Description),
		Type:        string(req.Type),
		Status:      string(req.Status),
		Priority:    string(req.Priority),
		Tags:        pointerToNullString(tagsStr),
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
