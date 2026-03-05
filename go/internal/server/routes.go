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

	// Courses & Exams — GET is public (register before JWT middleware)
	api.Get("/courses", handler.ListCourses)
	api.Get("/exams", handler.ListExams)
	api.Get("/exams/:id", handler.GetExam)

	protected := api.Group("")
	protected.Use(jwtware.New(jwtware.Config{
		SigningKey: []byte(cfg.JWTSecret),
	}))

	authProtected := protected.Group("/auth")
	authProtected.Get("/me", handler.Me)
	authProtected.Get("/login-dates", handler.LoginDates)
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

	courses := protected.Group("/courses")
	courses.Post("", handler.UpsertCourse)
	courses.Patch("/:id/status", handler.UpdateCourseStatus)
	courses.Delete("/:id", handler.DeleteCourse)

	// Exams — protected CRUD + attempts
	exams := protected.Group("/exams")
	exams.Post("", handler.UpsertExam)
	exams.Patch("/:id/status", handler.UpdateExamStatus)
	exams.Delete("/:id", handler.DeleteExam)
	exams.Get("/:id/attempts", handler.GetExamAttempts)
	exams.Post("/:id/attempts", handler.SaveExamAttempt)

	// Learning progress
	learning := protected.Group("/learning")
	learning.Get("/progress", handler.GetLearningProgress)
	learning.Get("/scores", handler.GetUserScores)
	learning.Post("/courses/:courseId/subtopics/:subtopicId/complete", handler.MarkSubtopicComplete)
	learning.Post("/courses/:courseId/subtopics/:subtopicId/answer", handler.SubmitSubtopicAnswer)
	learning.Post("/courses/:courseId/complete", handler.CompleteCourse)
}
