package service

import (
	"context"
	"crypto/rand"
	"database/sql"
	"encoding/hex"
	"errors"
	"strings"
	"sync"
	"time"

	"github.com/google/uuid"
	"github.com/luizgustavojunqueira/blink/internal/db"
	"github.com/luizgustavojunqueira/blink/internal/models"
)

const (
	SessionTTL     = 30 * 24 * time.Hour
	sessionPrefix  = "bls_"
	purgeThrottle  = time.Hour
	usernameUnique = "UNIQUE constraint failed: users.username"
)

var (
	ErrUsernameTaken = errors.New("username is already taken")
	ErrUnauthorized  = errors.New("unauthorized")
)

type AuthRepository interface {
	GetUserByUsername(ctx context.Context, username string) (db.User, error)
	GetUserByID(ctx context.Context, id int64) (db.User, error)
	CreateUserAdoptingOrphans(ctx context.Context, arg db.CreateUserParams) (db.User, error)
	UpdateUserPassword(ctx context.Context, arg db.UpdateUserPasswordParams) error
	CreateSession(ctx context.Context, arg db.CreateSessionParams) error
	GetSessionUser(ctx context.Context, tokenHash string) (db.GetSessionUserRow, error)
	DeleteSession(ctx context.Context, tokenHash string) error
	DeleteUserSessions(ctx context.Context, userID int64) error
	DeleteExpiredSessions(ctx context.Context, now time.Time) error
	DeleteUserData(ctx context.Context, userID int64) error
}

type AuthService struct {
	repo      AuthRepository
	dummyHash string
	now       func() time.Time
	purgeMu   sync.Mutex
	lastPurge time.Time
}

type Session struct {
	Token     string
	ExpiresAt time.Time
}

func NewAuthService(repo AuthRepository) (*AuthService, error) {
	dummy, err := hashPassword("blink-dummy-password")
	if err != nil {
		return nil, err
	}

	return &AuthService{repo: repo, dummyHash: dummy, now: time.Now}, nil
}

func newSessionToken() (string, error) {
	raw := make([]byte, 32)
	if _, err := rand.Read(raw); err != nil {
		return "", err
	}

	return sessionPrefix + hex.EncodeToString(raw), nil
}

func toUserResponse(guid, username string) *models.UserResponse {
	return &models.UserResponse{GUID: guid, Username: username}
}

func (s *AuthService) startSession(ctx context.Context, userID int64) (*Session, error) {
	token, err := newSessionToken()
	if err != nil {
		return nil, err
	}

	expires := s.now().UTC().Add(SessionTTL)

	if err := s.repo.CreateSession(ctx, db.CreateSessionParams{
		UserID:    userID,
		TokenHash: hashToken(token),
		ExpiresAt: expires,
	}); err != nil {
		return nil, err
	}

	return &Session{Token: token, ExpiresAt: expires}, nil
}

func (s *AuthService) Signup(ctx context.Context, creds models.Credentials) (*models.UserResponse, *Session, error) {
	if err := creds.ValidateSignup(); err != nil {
		return nil, nil, err
	}

	hash, err := hashPassword(creds.Password)
	if err != nil {
		return nil, nil, err
	}

	user, err := s.repo.CreateUserAdoptingOrphans(ctx, db.CreateUserParams{
		Guid:         uuid.New().String(),
		Username:     creds.Username,
		PasswordHash: hash,
	})
	if err != nil {
		if strings.Contains(err.Error(), usernameUnique) {
			return nil, nil, ErrUsernameTaken
		}
		return nil, nil, err
	}

	session, err := s.startSession(ctx, user.ID)
	if err != nil {
		return nil, nil, err
	}

	return toUserResponse(user.Guid, user.Username), session, nil
}

func (s *AuthService) Login(ctx context.Context, creds models.Credentials) (*models.UserResponse, *Session, error) {
	if err := creds.ValidateLogin(); err != nil {
		return nil, nil, err
	}

	user, err := s.repo.GetUserByUsername(ctx, creds.Username)
	if errors.Is(err, sql.ErrNoRows) {
		verifyPassword(creds.Password, s.dummyHash)
		return nil, nil, models.ErrInvalidCredentials
	}
	if err != nil {
		return nil, nil, err
	}

	if !verifyPassword(creds.Password, user.PasswordHash) {
		return nil, nil, models.ErrInvalidCredentials
	}

	session, err := s.startSession(ctx, user.ID)
	if err != nil {
		return nil, nil, err
	}

	s.purgeExpired(ctx)

	return toUserResponse(user.Guid, user.Username), session, nil
}

func (s *AuthService) Logout(ctx context.Context, token string) error {
	return s.repo.DeleteSession(ctx, hashToken(token))
}

func (s *AuthService) Authenticate(ctx context.Context, token string) (int64, *models.UserResponse, error) {
	if !strings.HasPrefix(token, sessionPrefix) {
		return 0, nil, ErrUnauthorized
	}

	row, err := s.repo.GetSessionUser(ctx, hashToken(token))
	if errors.Is(err, sql.ErrNoRows) {
		return 0, nil, ErrUnauthorized
	}
	if err != nil {
		return 0, nil, err
	}

	if !row.ExpiresAt.After(s.now()) {
		return 0, nil, ErrUnauthorized
	}

	return row.ID, toUserResponse(row.Guid, row.Username), nil
}

func (s *AuthService) ChangePassword(ctx context.Context, userID int64, req models.ChangePasswordRequest) (*Session, error) {
	if err := req.Validate(); err != nil {
		return nil, err
	}

	user, err := s.repo.GetUserByID(ctx, userID)
	if err != nil {
		return nil, err
	}

	if !verifyPassword(req.CurrentPassword, user.PasswordHash) {
		return nil, models.ErrWrongPassword
	}

	hash, err := hashPassword(req.NewPassword)
	if err != nil {
		return nil, err
	}

	if err := s.repo.UpdateUserPassword(ctx, db.UpdateUserPasswordParams{PasswordHash: hash, ID: userID}); err != nil {
		return nil, err
	}

	if err := s.repo.DeleteUserSessions(ctx, userID); err != nil {
		return nil, err
	}

	return s.startSession(ctx, userID)
}

func (s *AuthService) DeleteAccount(ctx context.Context, userID int64, req models.DeleteAccountRequest) error {
	user, err := s.repo.GetUserByID(ctx, userID)
	if err != nil {
		return err
	}

	if !verifyPassword(req.Password, user.PasswordHash) {
		return models.ErrWrongPassword
	}

	return s.repo.DeleteUserData(ctx, userID)
}

func (s *AuthService) purgeExpired(ctx context.Context) {
	now := s.now()

	s.purgeMu.Lock()
	due := now.Sub(s.lastPurge) >= purgeThrottle
	if due {
		s.lastPurge = now
	}
	s.purgeMu.Unlock()

	if !due {
		return
	}

	_ = s.repo.DeleteExpiredSessions(ctx, now.UTC())
}
