package config

import (
	"os"
	"strconv"
)

func LoadConfig() AppConfig {
	port := os.Getenv("PORT")
	if port == "" {
		port = "5020"
	}

	corsOrigins := os.Getenv("CORS_ORIGINS")
	if corsOrigins == "" {
		corsOrigins = "*"
	}

	return AppConfig{
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
