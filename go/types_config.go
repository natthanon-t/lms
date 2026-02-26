package main

type appConfig struct {
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
