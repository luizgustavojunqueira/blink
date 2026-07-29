package main

import (
	"database/sql"
	"fmt"
	"log"
	"os"

	"github.com/luizgustavojunqueira/blink/api"
	"github.com/luizgustavojunqueira/blink/app"
	"github.com/luizgustavojunqueira/blink/db"
	"github.com/luizgustavojunqueira/blink/db/migrations"

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

	conn, err := sql.Open("sqlite", dbPath+"?_pragma=journal_mode(WAL)&_pragma=busy_timeout(5000)")
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

	queries := db.New(conn)

	myAPI := api.NewAPI(queries)

	application := app.New(myAPI)

	if err := application.Start(port); err != nil {
		return fmt.Errorf("could not start app: %w", err)
	}

	return nil
}
