package models

import (
	"errors"
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

type ValidationError string

func (e ValidationError) Error() string { return string(e) }

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
		return ValidationError("password is too short")
	}

	if len(password) > PasswordMax {
		return ValidationError("password is too long")
	}

	return nil
}

func (c *Credentials) ValidateSignup() error {
	c.Username = strings.TrimSpace(c.Username)

	if len(c.Username) < UsernameMin {
		return ValidationError("username is too short")
	}

	if len(c.Username) > UsernameMax {
		return ValidationError("username is too long")
	}

	if !usernamePattern.MatchString(c.Username) {
		return ValidationError("username may only contain letters, numbers, . _ -")
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
	ErrInvalidCredentials = errors.New("invalid username or password")
	ErrWrongPassword      = errors.New("incorrect password")
)

func (r *ChangePasswordRequest) Validate() error {
	if r.CurrentPassword == "" {
		return ValidationError("current password is required")
	}

	return ValidatePassword(r.NewPassword)
}
