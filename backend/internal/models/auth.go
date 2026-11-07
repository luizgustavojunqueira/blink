package models

import (
	"github.com/luizgustavojunqueira/blink/internal/apperr"
	"regexp"
	"strings"
)

const (
	UsernameMin = 3
	UsernameMax = 32
	PasswordMin = 8
	PasswordMax = 128
)

var usernamePattern = regexp.MustCompile(`^[A-Za-z0-9_.-]+$`)

type ValidationError struct{ err *apperr.Error }

func (e ValidationError) Error() string { return e.err.Message }

func (e ValidationError) Unwrap() error { return e.err }

func validation(code, message string) ValidationError {
	return ValidationError{apperr.New(code, message)}
}

var (
	ErrPasswordTooShort = validation("password_too_short", "password is too short")
	ErrPasswordTooLong  = validation("password_too_long", "password is too long")
	ErrUsernameTooShort = validation("username_too_short", "username is too short")
	ErrUsernameTooLong  = validation("username_too_long", "username is too long")
	ErrUsernameChars    = validation("username_chars", "username may only contain letters, numbers, . _ -")

	ErrCurrentPasswordRequired = validation("current_password_required", "current password is required")
)

type Credentials struct {
	Username string `json:"username"`
	Password string `json:"password"`
}

type UserResponse struct {
	GUID     string `json:"guid"`
	Username string `json:"username"`
}

type ChangePasswordRequest struct {
	CurrentPassword string `json:"current_password"`
	NewPassword     string `json:"new_password"`
}

type DeleteAccountRequest struct {
	Password string `json:"password"`
}

func ValidatePassword(password string) error {
	if len(password) < PasswordMin {
		return ErrPasswordTooShort
	}

	if len(password) > PasswordMax {
		return ErrPasswordTooLong
	}

	return nil
}

func (c *Credentials) ValidateSignup() error {
	c.Username = strings.TrimSpace(c.Username)

	if len(c.Username) < UsernameMin {
		return ErrUsernameTooShort
	}

	if len(c.Username) > UsernameMax {
		return ErrUsernameTooLong
	}

	if !usernamePattern.MatchString(c.Username) {
		return ErrUsernameChars
	}

	return ValidatePassword(c.Password)
}

func (c *Credentials) ValidateLogin() error {
	c.Username = strings.TrimSpace(c.Username)

	if c.Username == "" || c.Password == "" || len(c.Username) > UsernameMax || len(c.Password) > PasswordMax {
		return ErrInvalidCredentials
	}

	return nil
}

var (
	ErrInvalidCredentials = apperr.New("invalid_credentials", "invalid username or password")
	ErrWrongPassword      = apperr.New("wrong_password", "incorrect password")
)

func (r *ChangePasswordRequest) Validate() error {
	if r.CurrentPassword == "" {
		return ErrCurrentPasswordRequired
	}

	return ValidatePassword(r.NewPassword)
}
