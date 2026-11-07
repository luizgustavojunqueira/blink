package models

import (
	"github.com/luizgustavojunqueira/blink/internal/apperr"
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

var (
	ErrAgentNameRequired = apperr.New("agent_name_required", "name is required")
	ErrAgentNameTooLong  = apperr.New("agent_name_too_long", "name is too long")
)

func (req *CreateAgentRequest) Validate() error {
	name := strings.TrimSpace(req.Name)

	if name == "" {
		return ErrAgentNameRequired
	}

	if len(name) > AgentNameMax {
		return ErrAgentNameTooLong
	}

	return nil
}
