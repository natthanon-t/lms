package server

import (
	"backend/internal/api"
	"backend/internal/auth"
	"backend/internal/config"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/gofiber/fiber/v2/middleware/limiter"
	jwtware "github.com/gofiber/jwt/v2"
)

func registerRoutes(app *fiber.App, cfg config.AppConfig) {
	handler := api.NewHandler(cfg)

	app.Static("/uploads", "./uploads")

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
	authGroup.Use(limiter.New(limiter.Config{
		Max:        10,
		Expiration: 1 * time.Minute,
		KeyGenerator: func(c *fiber.Ctx) string {
			return c.IP()
		},
		LimitReached: func(c *fiber.Ctx) error {
			return fiber.NewError(fiber.StatusTooManyRequests, "too many requests, please try again later")
		},
	}))
	authGroup.Post("/register", handler.Register)
	authGroup.Post("/login", handler.Login)
	authGroup.Post("/refresh", handler.Refresh)
	authGroup.Post("/logout", handler.Logout)

	publicLimiter := limiter.New(limiter.Config{
		Max:        60,
		Expiration: 1 * time.Minute,
		KeyGenerator: func(c *fiber.Ctx) string {
			return c.IP()
		},
		LimitReached: func(c *fiber.Ctx) error {
			return fiber.NewError(fiber.StatusTooManyRequests, "too many requests, please try again later")
		},
	})

	// Courses, Exams & Leaderboard — GET is public (register before JWT middleware)
	api.Get("/courses", publicLimiter, handler.ListCourses)
	api.Get("/courses/:id/images", publicLimiter, handler.GetCourseImages)
	api.Get("/exams", publicLimiter, handler.ListExams)
	api.Get("/exams/:id", publicLimiter, handler.GetExam)
	api.Get("/learning/leaderboard", publicLimiter, handler.GetLeaderboard)
	api.Get("/users/:username/profile", publicLimiter, handler.GetUserPublicProfile)

	protected := api.Group("")
	protected.Use(jwtware.New(jwtware.Config{
		SigningKey: []byte(cfg.JWTSecret),
	}))

	authProtected := protected.Group("/auth")
	authProtected.Get("/me", handler.Me)
	authProtected.Get("/login-dates", handler.LoginDates)
	authProtected.Get("/permissions", handler.MyPermissions)
	protected.Post("/role", auth.RequirePermissions(auth.PermissionUserManage), handler.CreateRole)
	protected.Get("/role", auth.RequirePermissions(auth.PermissionUserManage), handler.RoleOptions)
	protected.Patch("/role/:code", auth.RequirePermissions(auth.PermissionUserManage), handler.UpdateRole)
	protected.Delete("/role/:code", auth.RequirePermissions(auth.PermissionUserManage), handler.DeleteRole)
	protected.Put("/role/:code/permissions", auth.RequirePermissions(auth.PermissionUserManage), handler.UpdateRolePermissions)

	profile := protected.Group("/profile")
	profile.Patch("", handler.UpdateProfileName)
	profile.Post("/change-password", handler.ChangePassword)
	profile.Get("/avatar", handler.GetAvatar)
	profile.Put("/avatar", handler.UpdateAvatar)

	admin := protected.Group("/users", auth.RequirePermissions(auth.PermissionUserManage))
	admin.Get("/options", handler.UserOptions)
	admin.Get("/default-password", handler.GetDefaultResetPassword)
	admin.Put("/default-password", handler.UpdateDefaultResetPassword)
	admin.Get("", handler.ListUsers)
	admin.Post("", handler.CreateUserByAdmin)
	admin.Patch("/:username", handler.UpdateUserByAdmin)
	admin.Post("/:username/reset-password", handler.ResetUserPasswordByAdmin)

	adminExams := protected.Group("/admin", auth.RequirePermissions(auth.PermissionManagementExamHistory))
	adminExams.Get("/exam-attempts", handler.GetAllExamAttemptsAdmin)
	adminExams.Get("/exam-attempts/:id", handler.GetExamAttemptDetailsAdmin)

	analytics := protected.Group("/admin/analytics", auth.RequirePermissions(auth.PermissionSystemReport))
	analytics.Get("", handler.GetAnalytics)
	analytics.Get("/courses/:courseId/learners", handler.GetCourseLearners)

	courses := protected.Group("/courses", auth.RequirePermissions(auth.PermissionContentManage))
	courses.Post("", handler.UpsertCourse)
	courses.Patch("/:id/status", handler.UpdateCourseStatus)
	courses.Delete("/:id", handler.DeleteCourse)
	courses.Post("/:id/images", handler.SaveCourseImage)

	// Exams — protected CRUD + attempts
	examManagement := protected.Group("/exams", auth.RequirePermissions(auth.PermissionExamManage))
	examManagement.Get("/:id/full", handler.GetExamAdmin)
	examManagement.Post("", handler.UpsertExam)
	examManagement.Patch("/:id/status", handler.UpdateExamStatus)
	examManagement.Delete("/:id", handler.DeleteExam)

	examHistory := protected.Group("/exams", auth.RequirePermissions(auth.PermissionSystemExamHistory))
	examHistory.Get("/:id/attempts", handler.GetExamAttempts)

	examAttempts := protected.Group("/exams", auth.RequirePermissions(auth.PermissionExamTake))
	examAttempts.Post("/:id/attempts", handler.SaveExamAttempt)

	// Learning progress
	learning := protected.Group("/learning", auth.RequirePermissions(auth.PermissionContentLearn))
	learning.Get("/progress", handler.GetLearningProgress)
	learning.Get("/scores", handler.GetUserScores)
	learning.Post("/courses/:courseId/subtopics/:subtopicId/complete", handler.MarkSubtopicComplete)
	learning.Post("/courses/:courseId/subtopics/:subtopicId/answer", handler.SubmitSubtopicAnswer)
	learning.Post("/courses/:courseId/subtopics/:subtopicId/time", handler.RecordSubtopicTime)
	learning.Post("/courses/:courseId/complete", handler.CompleteCourse)
}
