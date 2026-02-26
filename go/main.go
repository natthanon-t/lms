package main

import (
	"log"
	"os"
	"strconv"

	"github.com/gofiber/fiber/v2"
	"github.com/gofiber/fiber/v2/middleware/cors"
	jwtware "github.com/gofiber/jwt/v2"
	"github.com/joho/godotenv"
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

	app := fiber.New()
	app.Use(cors.New(cors.Config{
		AllowOrigins: cfg.CORSOrigins,
		AllowMethods: "GET,POST,PUT,DELETE,OPTIONS",
		AllowHeaders: "Origin, Content-Type, Accept, Authorization",
	}))

	app.Get("/health", func(c *fiber.Ctx) error {
		return c.JSON(fiber.Map{"status": "ok"})
	})

	api := app.Group("/api")
	auth := api.Group("/auth")
	auth.Post("/register", registerHandler)
	auth.Post("/login", loginHandler)
	auth.Post("/refresh", refreshHandler)
	auth.Post("/logout", logoutHandler)

	authProtected := auth.Group("")
	authProtected.Use(jwtware.New(jwtware.Config{
		SigningKey: []byte(cfg.JWTSecret),
	}))
	authProtected.Get("/me", meHandler)

	addr := ":" + cfg.Port
	log.Printf("fiber listening on %s", addr)
	log.Fatal(app.Listen(addr))
}

func loadConfig() appConfig {
	port := os.Getenv("PORT")
	if port == "" {
		port = "5020"
	}

	corsOrigins := os.Getenv("CORS_ORIGINS")
	if corsOrigins == "" {
		corsOrigins = "*"
	}

	return appConfig{
		Port:        port,
		DatabaseURL: os.Getenv("DATABASE_URL"),
		JWTSecret:   os.Getenv("JWT_SECRET"),
		CORSOrigins: corsOrigins,
		AccessTTL:   getIntEnv("ACCESS_TOKEN_MINUTES", 15),
		RefreshTTL:  getIntEnv("REFRESH_TOKEN_HOURS", 168),
		AdminName:   getStringEnv("APP_ADMIN_NAME", "System Admin"),
		AdminUser:   getStringEnv("APP_ADMIN_USERNAME", getStringEnv("APP_ADMIN_EMAIL", "admin")),
		AdminPass:   getStringEnv("APP_ADMIN_PASSWORD", "admin12345"),
	}
}

func getIntEnv(key string, fallback int) int {
	raw := os.Getenv(key)
	if raw == "" {
		return fallback
	}
	value, err := strconv.Atoi(raw)
	if err != nil || value <= 0 {
		return fallback
	}
	return value
}

func getStringEnv(key, fallback string) string {
	raw := os.Getenv(key)
	if raw == "" {
		return fallback
	}
	return raw
}
