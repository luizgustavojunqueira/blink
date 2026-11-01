package api_test

import (
	"bytes"
	"context"
	"database/sql"
	"encoding/json"
	"fmt"
	"net/http"
	"net/http/httptest"
	"path/filepath"
	"testing"

	"github.com/golang-migrate/migrate/v4"
	"github.com/golang-migrate/migrate/v4/database/sqlite"
	"github.com/golang-migrate/migrate/v4/source/iofs"
	"github.com/luizgustavojunqueira/blink/internal/api"
	"github.com/luizgustavojunqueira/blink/internal/db"
	"github.com/luizgustavojunqueira/blink/internal/db/migrations"
	"github.com/luizgustavojunqueira/blink/internal/service"
	"github.com/luizgustavojunqueira/blink/internal/userctx"
	_ "modernc.org/sqlite"
)

const benchUserID = 1

var benchSizes = []int{1_000, 10_000, 20_000}

var (
	benchStatuses   = []string{"TODO", "IN_PROGRESS", "DONE", "CANCELED"}
	benchPriorities = []string{"LOW", "NORMAL", "HIGH", "URGENT"}
	benchTags       = []any{nil, "work", "work,urgent", nil, "home"}
)

type benchEnv struct {
	api   *api.API
	guids []string
}

func newBenchEnv(b *testing.B, n int) *benchEnv {
	b.Helper()

	conn, err := sql.Open("sqlite", filepath.Join(b.TempDir(), "bench.db")+"?_pragma=journal_mode(WAL)&_pragma=busy_timeout(5000)&_pragma=foreign_keys(1)&_txlock=immediate")
	if err != nil {
		b.Fatalf("open db: %v", err)
	}
	b.Cleanup(func() { _ = conn.Close() })

	driver, err := sqlite.WithInstance(conn, &sqlite.Config{})
	if err != nil {
		b.Fatalf("migrate driver: %v", err)
	}
	source, err := iofs.New(migrations.FS, ".")
	if err != nil {
		b.Fatalf("migrate source: %v", err)
	}
	m, err := migrate.NewWithInstance("iofs", source, "sqlite", driver)
	if err != nil {
		b.Fatalf("migrate: %v", err)
	}
	if err := m.Up(); err != nil {
		b.Fatalf("migrate up: %v", err)
	}

	if _, err := conn.Exec(`INSERT INTO users (id, guid, username, password_hash) VALUES (?, 'bench-user', 'bench', 'x')`, benchUserID); err != nil {
		b.Fatalf("insert user: %v", err)
	}

	tx, err := conn.Begin()
	if err != nil {
		b.Fatalf("begin: %v", err)
	}
	stmt, err := tx.Prepare(`INSERT INTO items (guid, title, description, type, status, priority, tags, user_id) VALUES (?, ?, ?, 'TASK', ?, ?, ?, ?)`)
	if err != nil {
		b.Fatalf("prepare: %v", err)
	}

	guids := make([]string, n)
	for i := range n {
		guids[i] = fmt.Sprintf("bench-%d", i)
		var description any
		if i%3 == 0 {
			description = fmt.Sprintf("notes for task %d", i)
		}
		if _, err := stmt.Exec(guids[i], fmt.Sprintf("task number %d", i), description,
			benchStatuses[i%len(benchStatuses)], benchPriorities[i%len(benchPriorities)], benchTags[i%len(benchTags)], benchUserID); err != nil {
			b.Fatalf("insert item: %v", err)
		}
	}
	if err := tx.Commit(); err != nil {
		b.Fatalf("commit: %v", err)
	}

	return &benchEnv{api: api.NewAPI(service.NewService(db.NewRepository(conn))), guids: guids}
}

func (e *benchEnv) call(b *testing.B, handler http.HandlerFunc, method, target string, body any) {
	b.Helper()

	var reader *bytes.Reader
	if body != nil {
		raw, err := json.Marshal(body)
		if err != nil {
			b.Fatalf("marshal: %v", err)
		}
		reader = bytes.NewReader(raw)
	} else {
		reader = bytes.NewReader(nil)
	}

	req := httptest.NewRequestWithContext(userctx.With(context.Background(), benchUserID), method, target, reader)
	rec := httptest.NewRecorder()
	handler(rec, req)

	if rec.Code >= 300 {
		b.Fatalf("%s %s: status %d: %s", method, target, rec.Code, rec.Body.String())
	}
}

func forSizes(b *testing.B, run func(b *testing.B, env *benchEnv)) {
	for _, n := range benchSizes {
		b.Run(fmt.Sprintf("items=%d", n), func(b *testing.B) {
			run(b, newBenchEnv(b, n))
		})
	}
}

func BenchmarkGetItems(b *testing.B) {
	forSizes(b, func(b *testing.B, env *benchEnv) {
		for b.Loop() {
			env.call(b, env.api.GetItems, http.MethodGet, "/api/items", nil)
		}
	})
}

func BenchmarkGetItemsFiltered(b *testing.B) {
	forSizes(b, func(b *testing.B, env *benchEnv) {
		for b.Loop() {
			env.call(b, env.api.GetItems, http.MethodGet, "/api/items?status=TODO&status=IN_PROGRESS&tags=work&title=number&order=-priority", nil)
		}
	})
}

func BenchmarkGetTags(b *testing.B) {
	forSizes(b, func(b *testing.B, env *benchEnv) {
		for b.Loop() {
			env.call(b, env.api.GetTags, http.MethodGet, "/api/tags", nil)
		}
	})
}

func BenchmarkCreateItem(b *testing.B) {
	forSizes(b, func(b *testing.B, env *benchEnv) {
		for b.Loop() {
			env.call(b, env.api.CreateItem, http.MethodPost, "/api/items", map[string]any{
				"title": "new task", "type": "TASK", "status": "TODO", "priority": "NORMAL",
			})
		}
	})
}

func BenchmarkUpdateItem(b *testing.B) {
	forSizes(b, func(b *testing.B, env *benchEnv) {
		i := 0
		for b.Loop() {
			env.call(b, env.api.UpdateItem, http.MethodPatch, "/api/items", map[string]any{
				"guid": env.guids[len(env.guids)/2], "status": benchStatuses[i%2],
			})
			i++
		}
	})
}

func BenchmarkBulkUpdateAll(b *testing.B) {
	forSizes(b, func(b *testing.B, env *benchEnv) {
		i := 0
		for b.Loop() {
			env.call(b, env.api.BulkUpdateItem, http.MethodPost, "/api/items/bulk", map[string]any{
				"guids": env.guids, "status": benchStatuses[i%2],
			})
			i++
		}
	})
}

func BenchmarkDeleteAndRestoreAll(b *testing.B) {
	forSizes(b, func(b *testing.B, env *benchEnv) {
		body := map[string]any{"guids": env.guids}
		for b.Loop() {
			env.call(b, env.api.DeleteItems, http.MethodDelete, "/api/items", body)
			env.call(b, env.api.RestoreItems, http.MethodPost, "/api/items/restore", body)
		}
	})
}
