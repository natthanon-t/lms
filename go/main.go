package main

import (
	"github.com/joho/godotenv"
	"log"
)

var appCfg appConfig

func main() {
	_ = godotenv.Load()

	cfg := loadConfig()
	appCfg = cfg
	if cfg.JWTSecret == "" {
		log.Fatal("JWT_SECRET is required")
	}

	if err := connectPostgres(cfg.DatabaseURL); err != nil {
		log.Fatalf("connect postgres failed: %v", err)
	}
	defer db.Close()

	if err := ensureAuthSchema(); err != nil {
		log.Fatalf("ensure auth schema failed: %v", err)
	}
	if err := ensureDefaultAdminUser(cfg.AdminName, cfg.AdminUser, cfg.AdminPass); err != nil {
		log.Fatalf("ensure default admin failed: %v", err)
	}

	app := newFiberApp(cfg)
	registerRoutes(app, cfg)

	addr := ":" + cfg.Port
	log.Printf("fiber listening on %s", addr)
	log.Fatal(app.Listen(addr))
}
