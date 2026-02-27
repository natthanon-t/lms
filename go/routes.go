package main

import (
	"github.com/gofiber/fiber/v2"
	jwtware "github.com/gofiber/jwt/v2"
)

func registerRoutes(app *fiber.App, cfg appConfig) {
	app.Get("/health", func(c *fiber.Ctx) error {
		return c.JSON(fiber.Map{"status": "ok"})
	})
	app.Get("/openapi.yaml", func(c *fiber.Ctx) error {
		return c.SendFile("openapi.yaml")
	})
	swaggerUIHandler := func(c *fiber.Ctx) error {
		c.Type("html", "utf-8")
		return c.SendString(`<!doctype html>
	<html>
	<head>
		<meta charset="utf-8" />
		<meta name="viewport" content="width=device-width, initial-scale=1" />
		<title>Swagger UI</title>
		<link rel="stylesheet" href="https://unpkg.com/swagger-ui-dist@5/swagger-ui.css" />
	</head>
	<body>
		<div id="swagger-ui"></div>
		<script src="https://unpkg.com/swagger-ui-dist@5/swagger-ui-bundle.js"></script>
		<script>
		window.onload = function () {
			window.SwaggerUIBundle({
			url: "/openapi.yaml",
			dom_id: "#swagger-ui"
			});
		};
		</script>
	</body>
	</html>`)
	}
	app.Get("/swagger", swaggerUIHandler)
	app.Get("/swagger/", swaggerUIHandler)

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
