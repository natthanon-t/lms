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
	authSensitiveLimiter := limiter.New(limiter.Config{
		Max:        cfg.RateLimitAuth,
		Expiration: 1 * time.Minute,
		KeyGenerator: func(c *fiber.Ctx) string {
			return c.IP()
		},
		LimitReached: func(c *fiber.Ctx) error {
			return fiber.NewError(fiber.StatusTooManyRequests, "too many requests, please try again later")
		},
	})
	authGroup.Post("/register", authSensitiveLimiter, handler.Register)
	authGroup.Post("/login", authSensitiveLimiter, handler.Login)
	authGroup.Post("/refresh", handler.Refresh)
	authGroup.Post("/logout", handler.Logout)

	publicLimiter := limiter.New(limiter.Config{
		Max:        cfg.RateLimitPublic,
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
	api.Get("/courses/:id/attachments", publicLimiter, handler.GetCourseAttachments)
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

	adminExams := protected.Group("/admin")
	adminExams.Get("/exam-attempts", auth.RequirePermissions(auth.PermissionManagementExamHistory), handler.GetAllExamAttemptsAdmin)
	adminExams.Get("/exam-attempts/:id", auth.RequirePermissions(auth.PermissionManagementExamHistory), handler.GetExamAttemptDetailsAdmin)
	adminExams.Get("/analytics", auth.RequirePermissions(auth.PermissionSystemReport), handler.GetAnalytics)
	adminExams.Get("/analytics/courses/:courseId/learners", auth.RequirePermissions(auth.PermissionSystemReport), handler.GetCourseLearners)

	courses := protected.Group("/courses")
	courses.Post("", auth.RequirePermissions(auth.PermissionContentManage), handler.UpsertCourse)
	courses.Patch("/:id/status", auth.RequirePermissions(auth.PermissionContentManage), handler.UpdateCourseStatus)
	courses.Delete("/:id", auth.RequirePermissions(auth.PermissionContentManage), handler.DeleteCourse)
	courses.Post("/:id/images", auth.RequirePermissions(auth.PermissionContentManage), handler.SaveCourseImage)
	courses.Post("/:id/attachments", auth.RequirePermissions(auth.PermissionContentManage), handler.UploadCourseAttachment)
	courses.Delete("/:id/attachments/:attId", auth.RequirePermissions(auth.PermissionContentManage), handler.DeleteCourseAttachment)

	// Exams — per-route permission to avoid Fiber Use-middleware stacking across groups
	exams := protected.Group("/exams")
	exams.Get("/:id/full", auth.RequirePermissions(auth.PermissionExamManage), handler.GetExamAdmin)
	exams.Post("", auth.RequirePermissions(auth.PermissionExamManage), handler.UpsertExam)
	exams.Patch("/:id/status", auth.RequirePermissions(auth.PermissionExamManage), handler.UpdateExamStatus)
	exams.Delete("/:id", auth.RequirePermissions(auth.PermissionExamManage), handler.DeleteExam)
	exams.Get("/me/attempts", auth.RequirePermissions(auth.PermissionSystemExamHistory), handler.GetMyExamAttempts)
	exams.Get("/me/attempts/:id", auth.RequirePermissions(auth.PermissionSystemExamHistory), handler.GetMyExamAttemptDetails)
	exams.Get("/:id/attempts", auth.RequirePermissions(auth.PermissionSystemExamHistory), handler.GetExamAttempts)
	exams.Post("/:id/attempts", auth.RequirePermissions(auth.PermissionExamTake), handler.SaveExamAttempt)

	// Learning progress
	learning := protected.Group("/learning")
	learning.Get("/progress", auth.RequirePermissions(auth.PermissionContentLearn), handler.GetLearningProgress)
	learning.Get("/scores", auth.RequirePermissions(auth.PermissionContentLearn), handler.GetUserScores)
	learning.Post("/courses/:courseId/subtopics/:subtopicId/complete", auth.RequirePermissions(auth.PermissionContentLearn), handler.MarkSubtopicComplete)
	learning.Post("/courses/:courseId/subtopics/:subtopicId/answer", auth.RequirePermissions(auth.PermissionContentLearn), handler.SubmitSubtopicAnswer)
	learning.Post("/courses/:courseId/subtopics/:subtopicId/time", auth.RequirePermissions(auth.PermissionContentLearn), handler.RecordSubtopicTime)
	learning.Post("/courses/:courseId/complete", auth.RequirePermissions(auth.PermissionContentLearn), handler.CompleteCourse)
}
