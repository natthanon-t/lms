package config

type AppConfig struct {
	Port        string
	DatabaseURL string
	JWTSecret   string
	CORSOrigins string
	AccessTTL   int
	RefreshTTL  int
	AdminName   string
	AdminUser   string
	AdminPass   string
}
