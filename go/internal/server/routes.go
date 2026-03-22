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

// csrfProtection validates the double-submit cookie pattern on state-changing requests.
func csrfProtection() fiber.Handler {
	return func(c *fiber.Ctx) error {
		method := c.Method()
		if method == "GET" || method == "HEAD" || method == "OPTIONS" {
			return c.Next()
		}
		cookie := c.Cookies("csrf_token")
		header := c.Get("X-CSRF-Token")
		if cookie == "" || header == "" || cookie != header {
			return fiber.NewError(fiber.StatusForbidden, "invalid CSRF token")
		}
		return c.Next()
	}
}

func registerRoutes(app *fiber.App, cfg config.AppConfig) {
	handler := api.NewHandler(cfg)

	// Only serve course files statically; avatars are served via authenticated API
	app.Static("/uploads/courses", "./uploads/courses")

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
	api.Get("/courses/:courseId/qna", publicLimiter, handler.GetCourseQnA)
	api.Get("/users/:username/profile", publicLimiter, handler.GetUserPublicProfile)

	protected := api.Group("")
	protected.Use(jwtware.New(jwtware.Config{
		SigningKey:   []byte(cfg.JWTSecret),
		TokenLookup: "cookie:access_token",
	}))
	protected.Use(csrfProtection())

	authProtected := protected.Group("/auth")
	authProtected.Get("/me", handler.Me)
	authProtected.Get("/login-dates", handler.LoginDates)
	authProtected.Get("/permissions", handler.MyPermissions)
	protected.Post("/role", auth.RequireAnyPermission(auth.PermissionRoleManage), handler.CreateRole)
	protected.Get("/role", auth.RequireAnyPermission(auth.PermissionRoleManage, auth.PermissionUserManage), handler.RoleOptions)
	protected.Patch("/role/:code", auth.RequireAnyPermission(auth.PermissionRoleManage), handler.UpdateRole)
	protected.Delete("/role/:code", auth.RequireAnyPermission(auth.PermissionRoleManage), handler.DeleteRole)
	protected.Put("/role/:code/permissions", auth.RequireAnyPermission(auth.PermissionRoleManage), handler.UpdateRolePermissions)

	profile := protected.Group("/profile")
	profile.Patch("", handler.UpdateProfileName)
	profile.Post("/change-password", handler.ChangePassword)
	profile.Get("/avatar", handler.GetAvatar)
	profile.Put("/avatar", handler.UpdateAvatar)

	admin := protected.Group("/users", auth.RequireAnyPermission(auth.PermissionUserManage))
	admin.Get("/options", handler.UserOptions)
	admin.Get("/default-password", handler.GetDefaultResetPassword)
	admin.Put("/default-password", handler.UpdateDefaultResetPassword)
	admin.Get("", handler.ListUsers)
	admin.Post("", handler.CreateUserByAdmin)
	admin.Patch("/:username", handler.UpdateUserByAdmin)
	admin.Post("/:username/reset-password", handler.ResetUserPasswordByAdmin)

	adminExams := protected.Group("/admin")
	adminExams.Get("/exam-attempts", auth.RequireAnyPermission(auth.PermissionManagementExamHistory), handler.GetAllExamAttemptsAdmin)
	adminExams.Get("/exam-attempts/:id", auth.RequireAnyPermission(auth.PermissionManagementExamHistory), handler.GetExamAttemptDetailsAdmin)
	adminExams.Get("/analytics", auth.RequireAnyPermission(auth.PermissionSystemReport), handler.GetAnalytics)
	adminExams.Get("/analytics/courses/:courseId/learners", auth.RequireAnyPermission(auth.PermissionSystemReport), handler.GetCourseLearners)
	adminExams.Get("/analytics/course-stats", auth.RequireAnyPermission(auth.PermissionContentManage), handler.GetCourseStats)
	adminExams.Get("/analytics/courses/:courseId/detail", auth.RequireAnyPermission(auth.PermissionContentManage), handler.GetCourseDetailAnalytics)
	adminExams.Get("/analytics/exam-stats", auth.RequireAnyPermission(auth.PermissionExamManage), handler.GetExamStats)
	adminExams.Get("/analytics/exams/:examId/detail", auth.RequireAnyPermission(auth.PermissionExamManage), handler.GetExamDetailAnalytics)

	courses := protected.Group("/courses")
	courses.Post("", auth.RequireAnyPermission(auth.PermissionContentManage), handler.UpsertCourse)
	courses.Patch("/:id/status", auth.RequireAnyPermission(auth.PermissionContentManage), handler.UpdateCourseStatus)
	courses.Delete("/:id", auth.RequireAnyPermission(auth.PermissionContentManage), handler.DeleteCourse)
	courses.Post("/:id/images", auth.RequireAnyPermission(auth.PermissionContentManage), handler.SaveCourseImage)
	courses.Post("/:id/attachments", auth.RequireAnyPermission(auth.PermissionContentManage), handler.UploadCourseAttachment)
	courses.Delete("/:id/attachments/:attId", auth.RequireAnyPermission(auth.PermissionContentManage), handler.DeleteCourseAttachment)

	// Exams — per-route permission to avoid Fiber Use-middleware stacking across groups
	exams := protected.Group("/exams")
	exams.Get("/:id/full", auth.RequireAnyPermission(auth.PermissionExamManage), handler.GetExamAdmin)
	exams.Post("", auth.RequireAnyPermission(auth.PermissionExamManage), handler.UpsertExam)
	exams.Patch("/:id/status", auth.RequireAnyPermission(auth.PermissionExamManage), handler.UpdateExamStatus)
	exams.Delete("/:id", auth.RequireAnyPermission(auth.PermissionExamManage), handler.DeleteExam)
	exams.Get("/me/attempts", auth.RequireAnyPermission(auth.PermissionSystemExamHistory), handler.GetMyExamAttempts)
	exams.Get("/me/attempts/:id", auth.RequireAnyPermission(auth.PermissionSystemExamHistory), handler.GetMyExamAttemptDetails)
	exams.Get("/:id/questions", auth.RequireAnyPermission(auth.PermissionExamTake), handler.GetExamQuestions)
	exams.Get("/:id/attempts", auth.RequireAnyPermission(auth.PermissionSystemExamHistory), handler.GetExamAttempts)
	exams.Post("/:id/attempts", auth.RequireAnyPermission(auth.PermissionExamTake), handler.SaveExamAttempt)

	// Learning progress
	learning := protected.Group("/learning")
	learning.Get("/progress", auth.RequireAnyPermission(auth.PermissionContentLearn), handler.GetLearningProgress)
	learning.Get("/scores", auth.RequireAnyPermission(auth.PermissionContentLearn), handler.GetUserScores)
	learning.Post("/courses/:courseId/subtopics/:subtopicId/complete", auth.RequireAnyPermission(auth.PermissionContentLearn), handler.MarkSubtopicComplete)
	learning.Post("/courses/:courseId/subtopics/:subtopicId/answer", auth.RequireAnyPermission(auth.PermissionContentLearn), handler.SubmitSubtopicAnswer)
	learning.Post("/courses/:courseId/subtopics/:subtopicId/time", auth.RequireAnyPermission(auth.PermissionContentLearn), handler.RecordSubtopicTime)
	learning.Post("/courses/:courseId/complete", auth.RequireAnyPermission(auth.PermissionContentLearn), handler.CompleteCourse)
	learning.Post("/courses/:courseId/qna", auth.RequireAnyPermission(auth.PermissionContentLearn), handler.PostQnAQuestion)
	learning.Post("/qna/:questionId/reply", auth.RequireAnyPermission(auth.PermissionContentLearn), handler.PostQnAReply)
}
