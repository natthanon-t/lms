package server

import (
	"backend/internal/api"
	"backend/internal/auth"
	"backend/internal/config"
	"github.com/gofiber/fiber/v2"
	jwtware "github.com/gofiber/jwt/v2"
)

func registerRoutes(app *fiber.App, cfg config.AppConfig) {
	handler := api.NewHandler(cfg)

	app.Get("/health", func(c *fiber.Ctx) error {
		return c.JSON(fiber.Map{"status": "ok"})
	})
	app.Get("/openapi.yaml", func(c *fiber.Ctx) error {
		return c.SendFile("openapi.yaml")
	})
	app.Get("/swagger", swaggerUIHandler)
	app.Get("/swagger/", swaggerUIHandler)

	api := app.Group("/api")

	authGroup := api.Group("/auth")
	authGroup.Post("/register", handler.Register)
	authGroup.Post("/login", handler.Login)
	authGroup.Post("/refresh", handler.Refresh)
	authGroup.Post("/logout", handler.Logout)

	protected := api.Group("")
	protected.Use(jwtware.New(jwtware.Config{
		SigningKey: []byte(cfg.JWTSecret),
	}))

	authProtected := protected.Group("/auth")
	authProtected.Get("/me", handler.Me)
	protected.Get("/role", handler.RoleOptions)

	profile := protected.Group("/profile")
	profile.Patch("", handler.UpdateProfileName)
	profile.Post("/change-password", handler.ChangePassword)

	admin := protected.Group("/users", auth.AdminOnlyMiddleware)
	admin.Get("/options", handler.UserOptions)
	admin.Get("", handler.ListUsers)
	admin.Post("", handler.CreateUserByAdmin)
	admin.Patch("/:username", handler.UpdateUserByAdmin)
	admin.Post("/:username/reset-password", handler.ResetUserPasswordByAdmin)
}
