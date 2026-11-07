package apperr

import (
	"encoding/json"
	"errors"
	"net/http"
)

type Error struct {
	Code    string
	Message string
}

func (e *Error) Error() string { return e.Message }

func New(code, message string) *Error {
	return &Error{Code: code, Message: message}
}

var (
	ErrBadRequest   = New("bad_request", "Failed to decode request body")
	ErrUnauthorized = New("unauthorized", "unauthorized")
	ErrInternal     = New("internal", "internal error")
	ErrRateLimited  = New("rate_limited", "too many attempts, try again later")
)

type Response struct {
	Code    string `json:"code"`
	Message string `json:"message"`
}

func CodeOf(err error) string {
	var coded *Error
	if errors.As(err, &coded) {
		return coded.Code
	}
	return ErrInternal.Code
}

func Write(w http.ResponseWriter, status int, err error) {
	h := w.Header()
	h.Del("Content-Length")
	h.Set("Content-Type", "application/json; charset=utf-8")
	h.Set("X-Content-Type-Options", "nosniff")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(Response{Code: CodeOf(err), Message: err.Error()})
}
