package api

import (
	"context"
	"errors"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"github.com/luizgustavojunqueira/blink/internal/models"
	"github.com/luizgustavojunqueira/blink/internal/service"
	"github.com/luizgustavojunqueira/blink/internal/userctx"
)

type fakeAuth struct {
	err        error
	loggedOut  string
	changedFor int64
	deletedFor int64
}

func (f *fakeAuth) session() *service.Session {
	return &service.Session{Token: "bls_token", ExpiresAt: time.Now().Add(time.Hour)}
}

func (f *fakeAuth) Signup(_ context.Context, c models.Credentials) (*models.UserResponse, *service.Session, error) {
	if f.err != nil {
		return nil, nil, f.err
	}
	return &models.UserResponse{GUID: "u", Username: c.Username}, f.session(), nil
}

func (f *fakeAuth) Login(ctx context.Context, c models.Credentials) (*models.UserResponse, *service.Session, error) {
	return f.Signup(ctx, c)
}

func (f *fakeAuth) Logout(_ context.Context, token string) error {
	f.loggedOut = token
	return nil
}

func (f *fakeAuth) Authenticate(_ context.Context, token string) (int64, *models.UserResponse, error) {
	if token != "bls_token" {
		return 0, nil, service.ErrUnauthorized
	}
	return 7, &models.UserResponse{GUID: "u", Username: "alice"}, nil
}

func (f *fakeAuth) ChangePassword(_ context.Context, id int64, _ models.ChangePasswordRequest) (*service.Session, error) {
	f.changedFor = id
	if f.err != nil {
		return nil, f.err
	}
	return f.session(), nil
}

func (f *fakeAuth) DeleteAccount(_ context.Context, id int64, _ models.DeleteAccountRequest) error {
	f.deletedFor = id
	return f.err
}

func do(h http.Handler, method, path, body string, cookie bool) *httptest.ResponseRecorder {
	req := httptest.NewRequest(method, path, strings.NewReader(body))
	if cookie {
		req.AddCookie(&http.Cookie{Name: SessionCookie, Value: "bls_token"})
	}
	rec := httptest.NewRecorder()
	h.ServeHTTP(rec, req)
	return rec
}

func TestAuthAPI_Signup(t *testing.T) {
	fake := &fakeAuth{}
	a := NewAuthAPI(fake, AuthConfig{})

	rec := do(http.HandlerFunc(a.Signup), "POST", "/", `{"username":"alice","password":"password123"}`, false)
	if rec.Code != http.StatusCreated {
		t.Fatalf("expected 201, got %d", rec.Code)
	}

	cookie := rec.Result().Cookies()[0]
	if cookie.Name != SessionCookie || cookie.Value != "bls_token" || !cookie.HttpOnly || cookie.SameSite != http.SameSiteLaxMode {
		t.Errorf("unexpected session cookie: %+v", cookie)
	}
	if cookie.Secure {
		t.Error("expected a plain http request not to set Secure")
	}

	cases := []struct {
		name string
		err  error
		body string
		want int
	}{
		{"bad json", nil, `{`, http.StatusBadRequest},
		{"taken", service.ErrUsernameTaken, `{}`, http.StatusConflict},
		{"invalid", models.ValidationError("username is too short"), `{}`, http.StatusBadRequest},
		{"internal", errors.New("boom"), `{}`, http.StatusInternalServerError},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			a := NewAuthAPI(&fakeAuth{err: tc.err}, AuthConfig{})
			if rec := do(http.HandlerFunc(a.Signup), "POST", "/", tc.body, false); rec.Code != tc.want {
				t.Errorf("expected %d, got %d", tc.want, rec.Code)
			}
		})
	}
}

func TestAuthAPI_SecureCookieBehindProxy(t *testing.T) {
	fake := &fakeAuth{}
	body := `{"username":"alice","password":"password123"}`

	for _, trust := range []bool{false, true} {
		a := NewAuthAPI(fake, AuthConfig{TrustProxy: trust})
		req := httptest.NewRequest("POST", "/", strings.NewReader(body))
		req.Header.Set("X-Forwarded-Proto", "https")
		rec := httptest.NewRecorder()
		a.Login(rec, req)

		if got := rec.Result().Cookies()[0].Secure; got != trust {
			t.Errorf("trustProxy=%v: expected Secure=%v, got %v", trust, trust, got)
		}
	}
}

func TestAuthAPI_Login_WrongCredentials(t *testing.T) {
	a := NewAuthAPI(&fakeAuth{err: models.ErrInvalidCredentials}, AuthConfig{})

	rec := do(http.HandlerFunc(a.Login), "POST", "/", `{}`, false)
	if rec.Code != http.StatusUnauthorized {
		t.Errorf("expected 401, got %d", rec.Code)
	}
	if len(rec.Result().Cookies()) != 0 {
		t.Error("expected no cookie on a failed login")
	}
}

func TestAuthAPI_RequireSession(t *testing.T) {
	a := NewAuthAPI(&fakeAuth{}, AuthConfig{})
	var seen int64
	h := a.RequireSession(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		seen, _ = userctx.ID(r.Context())
		w.WriteHeader(http.StatusNoContent)
	}))

	if rec := do(h, "GET", "/", "", false); rec.Code != http.StatusUnauthorized {
		t.Errorf("expected 401 without a cookie, got %d", rec.Code)
	}

	req := httptest.NewRequest("GET", "/", nil)
	req.AddCookie(&http.Cookie{Name: SessionCookie, Value: "bls_other"})
	rec := httptest.NewRecorder()
	h.ServeHTTP(rec, req)
	if rec.Code != http.StatusUnauthorized {
		t.Errorf("expected 401 with a bad cookie, got %d", rec.Code)
	}
	if c := rec.Result().Cookies(); len(c) != 1 || c[0].MaxAge != -1 {
		t.Error("expected the bad cookie to be cleared")
	}

	if rec := do(h, "GET", "/", "", true); rec.Code != http.StatusNoContent || seen != 7 {
		t.Errorf("expected the handler to run for user 7, got %d / %d", rec.Code, seen)
	}
}

func TestAuthAPI_Me(t *testing.T) {
	a := NewAuthAPI(&fakeAuth{}, AuthConfig{})
	h := a.RequireSession(http.HandlerFunc(a.Me))

	rec := do(h, "GET", "/", "", true)
	if rec.Code != http.StatusOK || !strings.Contains(rec.Body.String(), `"username":"alice"`) {
		t.Errorf("unexpected response: %d %s", rec.Code, rec.Body.String())
	}
}

func TestAuthAPI_Logout(t *testing.T) {
	fake := &fakeAuth{}
	a := NewAuthAPI(fake, AuthConfig{})

	rec := do(http.HandlerFunc(a.Logout), "POST", "/", "", true)
	if rec.Code != http.StatusNoContent || fake.loggedOut != "bls_token" {
		t.Errorf("expected the session to be dropped, got %d %q", rec.Code, fake.loggedOut)
	}
	if c := rec.Result().Cookies(); len(c) != 1 || c[0].MaxAge != -1 {
		t.Error("expected the cookie to be cleared")
	}
}

func TestAuthAPI_ChangePasswordAndDelete(t *testing.T) {
	fake := &fakeAuth{}
	a := NewAuthAPI(fake, AuthConfig{})

	pw := a.RequireSession(http.HandlerFunc(a.ChangePassword))
	if rec := do(pw, "POST", "/", `{"current_password":"a","new_password":"b"}`, true); rec.Code != http.StatusNoContent || fake.changedFor != 7 {
		t.Errorf("expected the password change for user 7, got %d / %d", rec.Code, fake.changedFor)
	}

	del := a.RequireSession(http.HandlerFunc(a.DeleteAccount))
	if rec := do(del, "DELETE", "/", `{"password":"a"}`, true); rec.Code != http.StatusNoContent || fake.deletedFor != 7 {
		t.Errorf("expected the account deletion for user 7, got %d / %d", rec.Code, fake.deletedFor)
	}

	wrong := NewAuthAPI(&fakeAuth{err: models.ErrWrongPassword}, AuthConfig{})
	if rec := do(wrong.RequireSession(http.HandlerFunc(wrong.DeleteAccount)), "DELETE", "/", `{}`, true); rec.Code != http.StatusForbidden {
		t.Errorf("expected 403 for a wrong password, got %d", rec.Code)
	}
}

func TestIPLimiter(t *testing.T) {
	l := newIPLimiter(false)
	now := time.Now()
	l.now = func() time.Time { return now }

	for i := 0; i < limiterBurst; i++ {
		if !l.allow("1.1.1.1") {
			t.Fatalf("expected attempt %d to be allowed", i+1)
		}
	}
	if l.allow("1.1.1.1") {
		t.Error("expected the burst to be exhausted")
	}
	if !l.allow("2.2.2.2") {
		t.Error("expected other addresses to be unaffected")
	}

	now = now.Add(limiterEvery)
	if !l.allow("1.1.1.1") {
		t.Error("expected an attempt to be allowed after the refill interval")
	}
}

func TestIPLimiter_ClientIP(t *testing.T) {
	req := httptest.NewRequest("GET", "/", nil)
	req.RemoteAddr = "10.0.0.1:1234"
	req.Header.Set("X-Forwarded-For", "6.6.6.6, 9.9.9.9")

	if got := newIPLimiter(false).clientIP(req); got != "10.0.0.1" {
		t.Errorf("expected the socket address without a trusted proxy, got %q", got)
	}
	if got := newIPLimiter(true).clientIP(req); got != "9.9.9.9" {
		t.Errorf("expected the proxy-appended address, got %q", got)
	}
}

func TestAuthAPI_LimitedReturns429(t *testing.T) {
	a := NewAuthAPI(&fakeAuth{}, AuthConfig{})
	h := http.HandlerFunc(a.Limited(a.Login))

	var last int
	for i := 0; i <= limiterBurst; i++ {
		last = do(h, "POST", "/", `{"username":"a","password":"b"}`, false).Code
	}
	if last != http.StatusTooManyRequests {
		t.Errorf("expected 429 after the burst, got %d", last)
	}
}
