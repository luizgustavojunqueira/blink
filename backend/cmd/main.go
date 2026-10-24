package main

import (
	"database/sql"
	"fmt"
	"log"
	"os"

	"github.com/luizgustavojunqueira/blink/internal/agent"
	"github.com/luizgustavojunqueira/blink/internal/api"
	"github.com/luizgustavojunqueira/blink/internal/app"
	"github.com/luizgustavojunqueira/blink/internal/db"
	"github.com/luizgustavojunqueira/blink/internal/db/migrations"
	"github.com/luizgustavojunqueira/blink/internal/service"

	"github.com/golang-migrate/migrate/v4"
	"github.com/golang-migrate/migrate/v4/database/sqlite"
	"github.com/golang-migrate/migrate/v4/source/iofs"

	_ "modernc.org/sqlite"
)

func main() {
	if err := run(); err != nil {
		log.Fatalf("Fatal erro: %v", err)
	}
}

func run() error {
	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}
	dbPath := os.Getenv("DB_PATH")
	if dbPath == "" {
		dbPath = "data/blink.db"
	}

	conn, err := sql.Open("sqlite", dbPath+"?_pragma=journal_mode(WAL)&_pragma=busy_timeout(5000)&_pragma=foreign_keys(1)")
	if err != nil {
		return fmt.Errorf("could not connect to DB: %w", err)
	}
	defer func() {
		if cerr := conn.Close(); cerr != nil {
			log.Printf("failed to close DB connection: %v", cerr)
		}
	}()

	driver, err := sqlite.WithInstance(conn, &sqlite.Config{})
	if err != nil {
		return fmt.Errorf("could not create migrate driver: %w", err)
	}

	sourceDriver, err := iofs.New(migrations.FS, ".")
	if err != nil {
		return fmt.Errorf("could not create iofs driver: %w", err)
	}

	m, err := migrate.NewWithInstance("iofs", sourceDriver, "sqlite", driver)
	if err != nil {
		return fmt.Errorf("could not create migrate instance: %w", err)
	}

	if err := m.Up(); err != nil && err != migrate.ErrNoChange {
		return fmt.Errorf("could not run migrations: %w", err)
	}
	log.Println("Migrations applied successfully!")

	repo := db.NewRepository(conn)
	svc := service.NewService(repo)
	myAPI := api.NewAPI(svc)

	authSvc, err := service.NewAuthService(repo)
	if err != nil {
		return fmt.Errorf("could not create auth service: %w", err)
	}
	authAPI := api.NewAuthAPI(authSvc, api.AuthConfig{TrustProxy: os.Getenv("TRUST_PROXY") == "true"})

	application := app.New(myAPI, authAPI, agent.NewHandler(svc, svc))

	if err := application.Start(port); err != nil {
		return fmt.Errorf("could not start app: %w", err)
	}

	return nil
}
