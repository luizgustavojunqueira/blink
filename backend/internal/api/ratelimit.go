package api

import (
	"github.com/luizgustavojunqueira/blink/internal/apperr"
	"net"
	"net/http"
	"strings"
	"sync"
	"time"

	"golang.org/x/time/rate"
)

const (
	limiterBurst     = 5
	limiterEvery     = 12 * time.Second
	limiterMaxKeys   = 10000
	limiterIdleAfter = 10 * time.Minute
)

type visitor struct {
	limiter *rate.Limiter
	seen    time.Time
}

type ipLimiter struct {
	mu         sync.Mutex
	visitors   map[string]*visitor
	trustProxy bool
	now        func() time.Time
}

func newIPLimiter(trustProxy bool) *ipLimiter {
	return &ipLimiter{visitors: make(map[string]*visitor), trustProxy: trustProxy, now: time.Now}
}

func (l *ipLimiter) clientIP(r *http.Request) string {
	if l.trustProxy {
		if fwd := r.Header.Get("X-Forwarded-For"); fwd != "" {
			parts := strings.Split(fwd, ",")
			return strings.TrimSpace(parts[len(parts)-1])
		}
	}

	host, _, err := net.SplitHostPort(r.RemoteAddr)
	if err != nil {
		return r.RemoteAddr
	}
	return host
}

func (l *ipLimiter) allow(key string) bool {
	l.mu.Lock()
	defer l.mu.Unlock()

	now := l.now()

	if len(l.visitors) >= limiterMaxKeys {
		for k, v := range l.visitors {
			if now.Sub(v.seen) > limiterIdleAfter {
				delete(l.visitors, k)
			}
		}
	}

	v, ok := l.visitors[key]
	if !ok {
		v = &visitor{limiter: rate.NewLimiter(rate.Every(limiterEvery), limiterBurst)}
		l.visitors[key] = v
	}
	v.seen = now

	return v.limiter.AllowN(now, 1)
}

func (l *ipLimiter) wrap(next http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if !l.allow(l.clientIP(r)) {
			apperr.Write(w, http.StatusTooManyRequests, apperr.ErrRateLimited)
			return
		}
		next(w, r)
	}
}
