package api

import (
	"context"
	"encoding/json"
	"errors"
	"github.com/luizgustavojunqueira/blink/internal/apperr"
	"net/http"
	"time"

	"github.com/luizgustavojunqueira/blink/internal/models"
	"github.com/luizgustavojunqueira/blink/internal/service"
	"github.com/luizgustavojunqueira/blink/internal/userctx"
)

const SessionCookie = "blink_session"

type AuthService interface {
	Signup(ctx context.Context, creds models.Credentials) (*models.UserResponse, *service.Session, error)
	Login(ctx context.Context, creds models.Credentials) (*models.UserResponse, *service.Session, error)
	Logout(ctx context.Context, token string) error
	Authenticate(ctx context.Context, token string) (int64, *models.UserResponse, error)
	ChangePassword(ctx context.Context, userID int64, req models.ChangePasswordRequest) (*service.Session, error)
	DeleteAccount(ctx context.Context, userID int64, req models.DeleteAccountRequest) error
}

type AuthConfig struct {
	TrustProxy bool
}

type AuthAPI struct {
	auth       AuthService
	limiter    *ipLimiter
	trustProxy bool
}

type userKey struct{}

func NewAuthAPI(auth AuthService, cfg AuthConfig) *AuthAPI {
	return &AuthAPI{auth: auth, limiter: newIPLimiter(cfg.TrustProxy), trustProxy: cfg.TrustProxy}
}

func (a *AuthAPI) secure(r *http.Request) bool {
	if r.TLS != nil {
		return true
	}
	return a.trustProxy && r.Header.Get("X-Forwarded-Proto") == "https"
}

func (a *AuthAPI) setCookie(w http.ResponseWriter, r *http.Request, session *service.Session) {
	http.SetCookie(w, &http.Cookie{
		Name:     SessionCookie,
		Value:    session.Token,
		Path:     "/",
		Expires:  session.ExpiresAt,
		HttpOnly: true,
		Secure:   a.secure(r),
		SameSite: http.SameSiteLaxMode,
	})
}

func (a *AuthAPI) clearCookie(w http.ResponseWriter, r *http.Request) {
	http.SetCookie(w, &http.Cookie{
		Name:     SessionCookie,
		Value:    "",
		Path:     "/",
		Expires:  time.Unix(0, 0),
		MaxAge:   -1,
		HttpOnly: true,
		Secure:   a.secure(r),
		SameSite: http.SameSiteLaxMode,
	})
}

func writeUser(w http.ResponseWriter, status int, user *models.UserResponse) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(user)
}

func (a *AuthAPI) RequireSession(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		cookie, err := r.Cookie(SessionCookie)
		if err != nil {
			apperr.Write(w, http.StatusUnauthorized, apperr.ErrUnauthorized)
			return
		}

		userID, user, err := a.auth.Authenticate(r.Context(), cookie.Value)
		if errors.Is(err, service.ErrUnauthorized) {
			a.clearCookie(w, r)
			apperr.Write(w, http.StatusUnauthorized, apperr.ErrUnauthorized)
			return
		}
		if err != nil {
			apperr.Write(w, http.StatusInternalServerError, apperr.ErrInternal)
			return
		}

		ctx := userctx.With(r.Context(), userID)
		ctx = context.WithValue(ctx, userKey{}, user)
		next.ServeHTTP(w, r.WithContext(ctx))
	})
}

func (a *AuthAPI) Signup(w http.ResponseWriter, r *http.Request) {
	var creds models.Credentials
	if err := json.NewDecoder(r.Body).Decode(&creds); err != nil {
		apperr.Write(w, http.StatusBadRequest, apperr.ErrBadRequest)
		return
	}

	user, session, err := a.auth.Signup(r.Context(), creds)
	switch {
	case errors.Is(err, service.ErrUsernameTaken):
		apperr.Write(w, http.StatusConflict, err)
		return
	case err != nil && isInputError(err):
		apperr.Write(w, http.StatusBadRequest, err)
		return
	case err != nil:
		apperr.Write(w, http.StatusInternalServerError, apperr.ErrInternal)
		return
	}

	a.setCookie(w, r, session)
	writeUser(w, http.StatusCreated, user)
}

func (a *AuthAPI) Login(w http.ResponseWriter, r *http.Request) {
	var creds models.Credentials
	if err := json.NewDecoder(r.Body).Decode(&creds); err != nil {
		apperr.Write(w, http.StatusBadRequest, apperr.ErrBadRequest)
		return
	}

	user, session, err := a.auth.Login(r.Context(), creds)
	switch {
	case errors.Is(err, models.ErrInvalidCredentials):
		apperr.Write(w, http.StatusUnauthorized, err)
		return
	case err != nil:
		apperr.Write(w, http.StatusInternalServerError, apperr.ErrInternal)
		return
	}

	a.setCookie(w, r, session)
	writeUser(w, http.StatusOK, user)
}

func (a *AuthAPI) Logout(w http.ResponseWriter, r *http.Request) {
	if cookie, err := r.Cookie(SessionCookie); err == nil {
		_ = a.auth.Logout(r.Context(), cookie.Value)
	}

	a.clearCookie(w, r)
	w.WriteHeader(http.StatusNoContent)
}

func (a *AuthAPI) Me(w http.ResponseWriter, r *http.Request) {
	user, _ := r.Context().Value(userKey{}).(*models.UserResponse)
	if user == nil {
		apperr.Write(w, http.StatusUnauthorized, apperr.ErrUnauthorized)
		return
	}

	writeUser(w, http.StatusOK, user)
}

func (a *AuthAPI) ChangePassword(w http.ResponseWriter, r *http.Request) {
	userID, err := userctx.ID(r.Context())
	if err != nil {
		apperr.Write(w, http.StatusUnauthorized, apperr.ErrUnauthorized)
		return
	}

	var req models.ChangePasswordRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		apperr.Write(w, http.StatusBadRequest, apperr.ErrBadRequest)
		return
	}

	session, err := a.auth.ChangePassword(r.Context(), userID, req)
	switch {
	case errors.Is(err, models.ErrWrongPassword):
		apperr.Write(w, http.StatusForbidden, err)
		return
	case err != nil && isInputError(err):
		apperr.Write(w, http.StatusBadRequest, err)
		return
	case err != nil:
		apperr.Write(w, http.StatusInternalServerError, apperr.ErrInternal)
		return
	}

	a.setCookie(w, r, session)
	w.WriteHeader(http.StatusNoContent)
}

func (a *AuthAPI) DeleteAccount(w http.ResponseWriter, r *http.Request) {
	userID, err := userctx.ID(r.Context())
	if err != nil {
		apperr.Write(w, http.StatusUnauthorized, apperr.ErrUnauthorized)
		return
	}

	var req models.DeleteAccountRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		apperr.Write(w, http.StatusBadRequest, apperr.ErrBadRequest)
		return
	}

	err = a.auth.DeleteAccount(r.Context(), userID, req)
	switch {
	case errors.Is(err, models.ErrWrongPassword):
		apperr.Write(w, http.StatusForbidden, err)
		return
	case err != nil:
		apperr.Write(w, http.StatusInternalServerError, apperr.ErrInternal)
		return
	}

	a.clearCookie(w, r)
	w.WriteHeader(http.StatusNoContent)
}

func (a *AuthAPI) Limited(next http.HandlerFunc) http.HandlerFunc {
	return a.limiter.wrap(next)
}

func isInputError(err error) bool {
	var v models.ValidationError
	return errors.As(err, &v)
}
