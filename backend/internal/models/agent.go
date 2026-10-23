package models

import (
	"errors"
	"strings"
)

const AgentNameMax = 32

type CreateAgentRequest struct {
	Name string `json:"name"`
}

type GetAgentResponse struct {
	GUID       string  `json:"guid"`
	Name       string  `json:"name"`
	CreatedAt  string  `json:"created_at"`
	LastUsedAt *string `json:"last_used_at"`
}

type CreateAgentResponse struct {
	GetAgentResponse
	Token string `json:"token"`
}

func (req *CreateAgentRequest) Validate() error {
	name := strings.TrimSpace(req.Name)

	if name == "" {
		return errors.New("name is required")
	}

	if len(name) > AgentNameMax {
		return errors.New("name is too long")
	}

	return nil
}
