package server

import (
	"backend/internal/config"
	"backend/internal/data"
	"fmt"
	"log"
)

func Start() error {
	cfg := config.LoadConfig()
	if cfg.JWTSecret == "" {
		return fmt.Errorf("JWT_SECRET is required")
	}

	if err := data.ConnectPostgres(cfg.DatabaseURL); err != nil {
		return fmt.Errorf("connect postgres failed: %w", err)
	}
	defer data.Close()

	if err := data.EnsureDefaultAdminUser(cfg.AdminName, cfg.AdminUser, cfg.AdminPass); err != nil {
		return fmt.Errorf("ensure default admin failed: %w", err)
	}

	if err := data.EnsureExamSchema(); err != nil {
		return fmt.Errorf("ensure exam schema failed: %w", err)
	}

	if err := data.SeedExamsFromDir(cfg.ExamSeedDir); err != nil {
		log.Printf("seed exams warning: %v", err)
	}

	app := newFiberApp(cfg)
	registerRoutes(app, cfg)

	addr := ":" + cfg.Port
	log.Printf("fiber listening on %s", addr)
	return app.Listen(addr)
}
