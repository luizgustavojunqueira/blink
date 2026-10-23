package service

import (
	"context"
	"crypto/rand"
	"crypto/sha256"
	"encoding/hex"
	"errors"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/luizgustavojunqueira/blink/internal/db"
	"github.com/luizgustavojunqueira/blink/internal/models"
)

const tokenPrefix = "blk_"

var (
	ErrAgentNameTaken = errors.New("an agent with this name already exists")
	ErrAgentNotFound  = errors.New("agent not found")
)

func hashToken(token string) string {
	sum := sha256.Sum256([]byte(token))
	return hex.EncodeToString(sum[:])
}

func newToken() (string, error) {
	raw := make([]byte, 32)
	if _, err := rand.Read(raw); err != nil {
		return "", err
	}

	return tokenPrefix + hex.EncodeToString(raw), nil
}

func toAgentResponse(agent db.Agent) models.GetAgentResponse {
	resp := models.GetAgentResponse{
		GUID:      agent.Guid,
		Name:      agent.Name,
		CreatedAt: agent.CreatedAt.UTC().Format(time.RFC3339),
	}

	if agent.LastUsedAt.Valid {
		lastUsed := agent.LastUsedAt.Time.UTC().Format(time.RFC3339)
		resp.LastUsedAt = &lastUsed
	}

	return resp
}

func (s *Service) CreateAgent(ctx context.Context, req models.CreateAgentRequest) (*models.CreateAgentResponse, error) {
	token, err := newToken()
	if err != nil {
		return nil, err
	}

	agent, err := s.repo.CreateAgent(ctx, db.CreateAgentParams{
		Guid:      uuid.New().String(),
		Name:      strings.TrimSpace(req.Name),
		TokenHash: hashToken(token),
	})
	if err != nil {
		if strings.Contains(err.Error(), "UNIQUE constraint failed: agents.name") {
			return nil, ErrAgentNameTaken
		}
		return nil, err
	}

	return &models.CreateAgentResponse{GetAgentResponse: toAgentResponse(agent), Token: token}, nil
}

func (s *Service) GetAgents(ctx context.Context) ([]models.GetAgentResponse, error) {
	agents, err := s.repo.ListAgents(ctx)
	if err != nil {
		return nil, err
	}

	resp := make([]models.GetAgentResponse, 0, len(agents))
	for _, agent := range agents {
		resp = append(resp, toAgentResponse(agent))
	}

	return resp, nil
}

func (s *Service) DeleteAgent(ctx context.Context, guid string) error {
	removed, err := s.repo.DeleteAgent(ctx, guid)
	if err != nil {
		return err
	}

	if removed == 0 {
		return ErrAgentNotFound
	}

	return nil
}

func (s *Service) VerifyAgentToken(ctx context.Context, token string) (bool, error) {
	if !strings.HasPrefix(token, tokenPrefix) {
		return false, nil
	}

	touched, err := s.repo.TouchAgentByTokenHash(ctx, hashToken(token))
	if err != nil {
		return false, err
	}

	return touched > 0, nil
}
