// Package models
package models

type CreateItemRequest struct {
	Title       string `json:"title"`
	Description string `json:"description"`
	Type        string `json:"type"`
	Status      string `json:"status"`
	Priority    string `json:"priority"`
	Tags        string `json:"tags"`
}

type GetItemResponse struct {
	GUID        string `json:"guid"`
	Title       string `json:"title"`
	Description string `json:"description"`
	Type        string `json:"type"`
	Status      string `json:"status"`
	Priority    string `json:"priority"`
	Tags        string `json:"tags"`
}
