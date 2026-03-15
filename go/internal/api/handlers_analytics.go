package api

import (
	"backend/internal/auth"
	"backend/internal/data"
	"strings"

	"github.com/gofiber/fiber/v2"
)

func (h *Handler) GetAnalytics(c *fiber.Ctx) error {
	summary, err := data.GetAnalyticsSummary()
	if err != nil {
		return fiber.NewError(fiber.StatusInternalServerError, "cannot get analytics")
	}
	return c.JSON(summary)
}

func (h *Handler) GetCourseLearners(c *fiber.Ctx) error {
	courseID := strings.TrimSpace(c.Params("courseId"))
	if courseID == "" {
		return fiber.NewError(fiber.StatusBadRequest, "course id is required")
	}
	learners, err := data.GetCourseLearners(courseID)
	if err != nil {
		return fiber.NewError(fiber.StatusInternalServerError, "cannot get course learners")
	}
	return c.JSON(fiber.Map{"learners": learners})
}

// GetCourseStats returns per-course stats.
// ?scope=my → only courses owned by the current user; otherwise all courses.
func (h *Handler) GetCourseStats(c *fiber.Ctx) error {
	owner := ""
	if c.Query("scope") == "my" {
		username, err := auth.CurrentUsername(c)
		if err != nil {
			return fiber.NewError(fiber.StatusUnauthorized, "invalid token")
		}
		owner = username
	}
	stats, err := data.GetAllCourseStats(owner)
	if err != nil {
		return fiber.NewError(fiber.StatusInternalServerError, "cannot get course stats")
	}
	if stats == nil {
		stats = []data.CourseInstructorStats{}
	}
	return c.JSON(fiber.Map{"courses": stats})
}

// GetExamStats returns per-exam stats.
// ?scope=my → only exams owned by the current user; otherwise all exams.
func (h *Handler) GetExamStats(c *fiber.Ctx) error {
	owner := ""
	if c.Query("scope") == "my" {
		username, err := auth.CurrentUsername(c)
		if err != nil {
			return fiber.NewError(fiber.StatusUnauthorized, "invalid token")
		}
		owner = username
	}
	stats, err := data.GetAllExamStats(owner)
	if err != nil {
		return fiber.NewError(fiber.StatusInternalServerError, "cannot get exam stats")
	}
	if stats == nil {
		stats = []data.ExamInstructorStats{}
	}
	return c.JSON(fiber.Map{"exams": stats})
}

// GetExamDetailAnalytics returns domain scores and hard questions for an exam.
func (h *Handler) GetExamDetailAnalytics(c *fiber.Ctx) error {
	examID := strings.TrimSpace(c.Params("examId"))
	if examID == "" {
		return fiber.NewError(fiber.StatusBadRequest, "exam id is required")
	}
	detail, err := data.GetExamDetailAnalytics(examID)
	if err != nil {
		return c.JSON(data.ExamDetailAnalytics{
			DomainAvgScores: []data.DomainAvgScore{},
			HardQuestions:   []data.HardExamQuestion{},
		})
	}
	return c.JSON(detail)
}

// GetCourseDetailAnalytics returns subtopic time, hard questions, and unanswered Q&A for a course.
func (h *Handler) GetCourseDetailAnalytics(c *fiber.Ctx) error {
	courseID := strings.TrimSpace(c.Params("courseId"))
	if courseID == "" {
		return fiber.NewError(fiber.StatusBadRequest, "course id is required")
	}

	subtopicTime, err := data.GetCourseSubtopicTime(courseID)
	if err != nil {
		subtopicTime = []data.SubtopicTimeStat{}
	}
	unansweredQnA, err := data.GetCourseUnansweredQnA(courseID)
	if err != nil {
		unansweredQnA = []data.UnansweredQnA{}
	}

	return c.JSON(data.CourseDetailAnalytics{
		SubtopicTime:  subtopicTime,
		UnansweredQnA: unansweredQnA,
	})
}
