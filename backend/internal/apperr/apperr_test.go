package apperr

import (
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"net/http/httptest"
	"testing"
)

func TestWrite_SendsTheCodeAndMessage(t *testing.T) {
	rec := httptest.NewRecorder()
	Write(rec, http.StatusConflict, New("username_taken", "username is already taken"))

	if rec.Code != http.StatusConflict {
		t.Fatalf("status = %d", rec.Code)
	}
	if ct := rec.Header().Get("Content-Type"); ct != "application/json; charset=utf-8" {
		t.Fatalf("content type = %q", ct)
	}
	var body Response
	if err := json.NewDecoder(rec.Body).Decode(&body); err != nil {
		t.Fatal(err)
	}
	if body != (Response{Code: "username_taken", Message: "username is already taken"}) {
		t.Fatalf("body = %+v", body)
	}
}

func TestWrite_FindsTheCodeOfAWrappedError(t *testing.T) {
	rec := httptest.NewRecorder()
	Write(rec, http.StatusBadRequest, fmt.Errorf("create: %w", ErrBadRequest))

	var body Response
	_ = json.NewDecoder(rec.Body).Decode(&body)
	if body.Code != "bad_request" || body.Message != "create: Failed to decode request body" {
		t.Fatalf("body = %+v", body)
	}
}

func TestWrite_MarksUnknownErrorsAsInternal(t *testing.T) {
	rec := httptest.NewRecorder()
	Write(rec, http.StatusInternalServerError, errors.New("database is locked"))

	var body Response
	_ = json.NewDecoder(rec.Body).Decode(&body)
	if body.Code != "internal" || body.Message != "database is locked" {
		t.Fatalf("body = %+v", body)
	}
}
