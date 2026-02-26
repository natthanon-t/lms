package main

import (
	"github.com/gofiber/fiber/v2"
	jwtware "github.com/gofiber/jwt/v2"
)

func registerRoutes(app *fiber.App, cfg appConfig) {
	app.Get("/health", func(c *fiber.Ctx) error {
		return c.JSON(fiber.Map{"status": "ok"})
	})

	api := app.Group("/api")

	auth := api.Group("/auth")
	auth.Post("/register", registerHandler)
	auth.Post("/login", loginHandler)
	auth.Post("/refresh", refreshHandler)
	auth.Post("/logout", logoutHandler)

	protected := api.Group("")
	protected.Use(jwtware.New(jwtware.Config{
		SigningKey: []byte(cfg.JWTSecret),
	}))

	authProtected := protected.Group("/auth")
	authProtected.Get("/me", meHandler)

	profile := protected.Group("/profile")
	profile.Patch("", updateProfileNameHandler)
	profile.Post("/change-password", changePasswordHandler)

	admin := protected.Group("/users", adminOnlyMiddleware)
	admin.Get("", listUsersHandler)
	admin.Post("", createUserByAdminHandler)
	admin.Patch("/:username", updateUserByAdminHandler)
	admin.Post("/:username/reset-password", resetUserPasswordByAdminHandler)
}
