package api

import (
	"backend/internal/auth"
	"backend/internal/data"
	"database/sql"
	"errors"
	"slices"
	"strings"

	"github.com/gofiber/fiber/v2"
)

var validCourseStatuses = []string{"active", "inprogress", "inactive"}

func (h *Handler) ListCourses(c *fiber.Ctx) error {
	courses, err := data.ListCourses()
	if err != nil {
		return fiber.NewError(fiber.StatusInternalServerError, "cannot list courses")
	}
	return c.JSON(fiber.Map{"courses": courses})
}

func (h *Handler) UpsertCourse(c *fiber.Ctx) error {
	username, err := auth.CurrentUsername(c)
	if err != nil {
		return fiber.NewError(fiber.StatusUnauthorized, "invalid token")
	}
	isAdmin := auth.IsAdminContext(c)

	var req courseRequest
	if err := c.BodyParser(&req); err != nil {
		return fiber.NewError(fiber.StatusBadRequest, "invalid request body")
	}
	req.ID = strings.TrimSpace(req.ID)
	req.Title = strings.TrimSpace(req.Title)
	req.Status = strings.ToLower(strings.TrimSpace(req.Status))
	if req.ID == "" || req.Title == "" {
		return fiber.NewError(fiber.StatusBadRequest, "id and title are required")
	}
	if req.Status == "" {
		req.Status = "inprogress"
	}
	if !slices.Contains(validCourseStatuses, req.Status) {
		return fiber.NewError(fiber.StatusBadRequest, "status must be active, inprogress, or inactive")
	}

	skillRewards := make([]data.SkillReward, 0, len(req.SkillRewards))
	for _, sr := range req.SkillRewards {
		if strings.TrimSpace(sr.Skill) != "" {
			skillRewards = append(skillRewards, data.SkillReward{Skill: sr.Skill, Points: sr.Points})
		}
	}

	course := data.Course{
		ID:                      req.ID,
		Title:                   req.Title,
		Creator:                 strings.TrimSpace(req.Creator),
		Status:                  req.Status,
		Description:             strings.TrimSpace(req.Description),
		Image:                   strings.TrimSpace(req.Image),
		Content:                 req.Content,
		SkillPoints:             req.SkillPoints,
		SubtopicCompletionScore: req.SubtopicCompletionScore,
		CourseCompletionScore:   req.CourseCompletionScore,
		SkillRewards:            skillRewards,
	}

	saved, err := data.UpsertCourse(course, username, isAdmin)
	if err != nil {
		if errors.Is(err, data.ErrForbidden) {
			return fiber.NewError(fiber.StatusForbidden, "not allowed to edit this course")
		}
		return fiber.NewError(fiber.StatusInternalServerError, "cannot save course")
	}

	return c.JSON(fiber.Map{"course": saved})
}

func (h *Handler) UpdateCourseStatus(c *fiber.Ctx) error {
	username, err := auth.CurrentUsername(c)
	if err != nil {
		return fiber.NewError(fiber.StatusUnauthorized, "invalid token")
	}
	isAdmin := auth.IsAdminContext(c)
	id := strings.TrimSpace(c.Params("id"))
	if id == "" {
		return fiber.NewError(fiber.StatusBadRequest, "course id is required")
	}

	var req courseStatusRequest
	if err := c.BodyParser(&req); err != nil {
		return fiber.NewError(fiber.StatusBadRequest, "invalid request body")
	}
	status := strings.ToLower(strings.TrimSpace(req.Status))
	if !slices.Contains(validCourseStatuses, status) {
		return fiber.NewError(fiber.StatusBadRequest, "status must be active, inprogress, or inactive")
	}

	if err := data.UpdateCourseStatus(id, status, username, isAdmin); err != nil {
		if errors.Is(err, data.ErrForbidden) {
			return fiber.NewError(fiber.StatusForbidden, "not allowed to edit this course")
		}
		if errors.Is(err, sql.ErrNoRows) {
			return fiber.NewError(fiber.StatusNotFound, "course not found")
		}
		return fiber.NewError(fiber.StatusInternalServerError, "cannot update course status")
	}

	return c.JSON(fiber.Map{"message": "status updated"})
}

func (h *Handler) DeleteCourse(c *fiber.Ctx) error {
	username, err := auth.CurrentUsername(c)
	if err != nil {
		return fiber.NewError(fiber.StatusUnauthorized, "invalid token")
	}
	isAdmin := auth.IsAdminContext(c)
	id := strings.TrimSpace(c.Params("id"))
	if id == "" {
		return fiber.NewError(fiber.StatusBadRequest, "course id is required")
	}

	if err := data.DeleteCourse(id, username, isAdmin); err != nil {
		if errors.Is(err, data.ErrForbidden) {
			return fiber.NewError(fiber.StatusForbidden, "not allowed to delete this course")
		}
		if errors.Is(err, sql.ErrNoRows) {
			return fiber.NewError(fiber.StatusNotFound, "course not found")
		}
		return fiber.NewError(fiber.StatusInternalServerError, "cannot delete course")
	}

	return c.JSON(fiber.Map{"message": "course deleted"})
}

// Learning progress handlers

func (h *Handler) GetLearningProgress(c *fiber.Ctx) error {
	username, err := auth.CurrentUsername(c)
	if err != nil {
		return fiber.NewError(fiber.StatusUnauthorized, "invalid token")
	}

	progress, err := data.GetLearningProgress(username)
	if err != nil {
		return fiber.NewError(fiber.StatusInternalServerError, "cannot get learning progress")
	}

	return c.JSON(fiber.Map{"progress": progress})
}

func (h *Handler) MarkSubtopicComplete(c *fiber.Ctx) error {
	username, err := auth.CurrentUsername(c)
	if err != nil {
		return fiber.NewError(fiber.StatusUnauthorized, "invalid token")
	}
	courseID := strings.TrimSpace(c.Params("courseId"))
	subtopicID := strings.TrimSpace(c.Params("subtopicId"))
	if courseID == "" || subtopicID == "" {
		return fiber.NewError(fiber.StatusBadRequest, "courseId and subtopicId are required")
	}

	if err := data.MarkSubtopicComplete(username, courseID, subtopicID); err != nil {
		return fiber.NewError(fiber.StatusInternalServerError, "cannot mark subtopic complete")
	}

	return c.JSON(fiber.Map{"message": "subtopic marked complete"})
}

func (h *Handler) SubmitSubtopicAnswer(c *fiber.Ctx) error {
	username, err := auth.CurrentUsername(c)
	if err != nil {
		return fiber.NewError(fiber.StatusUnauthorized, "invalid token")
	}
	courseID := strings.TrimSpace(c.Params("courseId"))
	subtopicID := strings.TrimSpace(c.Params("subtopicId"))
	if courseID == "" || subtopicID == "" {
		return fiber.NewError(fiber.StatusBadRequest, "courseId and subtopicId are required")
	}

	var req subtopicAnswerRequest
	if err := c.BodyParser(&req); err != nil {
		return fiber.NewError(fiber.StatusBadRequest, "invalid request body")
	}
	if strings.TrimSpace(req.QuestionID) == "" {
		return fiber.NewError(fiber.StatusBadRequest, "questionId is required")
	}

	if err := data.UpsertSubtopicAnswer(username, courseID, subtopicID, req.QuestionID, req.TypedAnswer, req.IsCorrect); err != nil {
		return fiber.NewError(fiber.StatusInternalServerError, "cannot save answer")
	}

	return c.JSON(fiber.Map{"message": "answer saved"})
}
