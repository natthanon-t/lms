package api

import (
	"backend/internal/auth"
	"backend/internal/data"
	"database/sql"
	"errors"
	"slices"
	"strconv"
	"strings"

	"github.com/gofiber/fiber/v2"
)

var validExamStatuses = []string{"active", "inprogress", "inactive"}

func (h *Handler) ListExams(c *fiber.Ctx) error {
	limit, offset, page := parsePage(c)
	exams, total, err := data.ListExams(limit, offset)
	if err != nil {
		return fiber.NewError(fiber.StatusInternalServerError, "cannot list exams")
	}
	return c.JSON(fiber.Map{"exams": exams, "pagination": paginationMeta(total, limit, page)})
}

func (h *Handler) GetExam(c *fiber.Ctx) error {
	id := strings.TrimSpace(c.Params("id"))
	if id == "" {
		return fiber.NewError(fiber.StatusBadRequest, "exam id is required")
	}
	exam, err := data.GetExamPublic(id)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return fiber.NewError(fiber.StatusNotFound, "exam not found")
		}
		return fiber.NewError(fiber.StatusInternalServerError, "cannot get exam")
	}
	return c.JSON(fiber.Map{"exam": exam})
}

func (h *Handler) GetExamAdmin(c *fiber.Ctx) error {
	id := strings.TrimSpace(c.Params("id"))
	if id == "" {
		return fiber.NewError(fiber.StatusBadRequest, "exam id is required")
	}
	exam, err := data.GetExam(id)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return fiber.NewError(fiber.StatusNotFound, "exam not found")
		}
		return fiber.NewError(fiber.StatusInternalServerError, "cannot get exam")
	}
	return c.JSON(fiber.Map{"exam": exam})
}

func (h *Handler) UpsertExam(c *fiber.Ctx) error {
	username, err := auth.CurrentUsername(c)
	if err != nil {
		return fiber.NewError(fiber.StatusUnauthorized, "invalid token")
	}
	isAdmin := auth.IsAdminContext(c)

	var req examRequest
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
	if !slices.Contains(validExamStatuses, req.Status) {
		return fiber.NewError(fiber.StatusBadRequest, "status must be active, inprogress, or inactive")
	}

	if req.DomainPercentages == nil {
		req.DomainPercentages = map[string]int{}
	}

	questions := make([]data.ExamQuestion, 0, len(req.Questions))
	for _, q := range req.Questions {
		choices := make([]string, 0, len(q.Choices))
		for _, ch := range q.Choices {
			choices = append(choices, strings.TrimSpace(ch))
		}
		qType := strings.TrimSpace(q.QuestionType)
		if qType == "" {
			qType = "multiple_choice"
		}
		questions = append(questions, data.ExamQuestion{
			Domain:       strings.TrimSpace(q.Domain),
			QuestionType: qType,
			Question:     strings.TrimSpace(q.Question),
			Choices:      choices,
			AnswerKey:    strings.TrimSpace(q.AnswerKey),
			Explanation:  strings.TrimSpace(q.Explanation),
		})
	}

	exam := data.Exam{
		ID:                req.ID,
		Title:             req.Title,
		Creator:           strings.TrimSpace(req.Creator),
		Status:            req.Status,
		Description:       strings.TrimSpace(req.Description),
		Instructions:      strings.TrimSpace(req.Instructions),
		Image:             strings.TrimSpace(req.Image),
		NumberOfQuestions: req.NumberOfQuestions,
		DefaultTime:       req.DefaultTime,
		MaxAttempts:       req.MaxAttempts,
		DomainPercentages: req.DomainPercentages,
		Questions:         questions,
	}

	saved, err := data.UpsertExam(exam, username, isAdmin)
	if err != nil {
		if errors.Is(err, data.ErrForbidden) {
			return fiber.NewError(fiber.StatusForbidden, "not allowed to edit this exam")
		}
		return fiber.NewError(fiber.StatusInternalServerError, "cannot save exam")
	}

	return c.JSON(fiber.Map{"exam": saved})
}

func (h *Handler) UpdateExamStatus(c *fiber.Ctx) error {
	username, err := auth.CurrentUsername(c)
	if err != nil {
		return fiber.NewError(fiber.StatusUnauthorized, "invalid token")
	}
	isAdmin := auth.IsAdminContext(c)
	id := strings.TrimSpace(c.Params("id"))
	if id == "" {
		return fiber.NewError(fiber.StatusBadRequest, "exam id is required")
	}

	var req examStatusRequest
	if err := c.BodyParser(&req); err != nil {
		return fiber.NewError(fiber.StatusBadRequest, "invalid request body")
	}
	status := strings.ToLower(strings.TrimSpace(req.Status))
	if !slices.Contains(validExamStatuses, status) {
		return fiber.NewError(fiber.StatusBadRequest, "status must be active, inprogress, or inactive")
	}

	if err := data.UpdateExamStatus(id, status, username, isAdmin); err != nil {
		if errors.Is(err, data.ErrForbidden) {
			return fiber.NewError(fiber.StatusForbidden, "not allowed to edit this exam")
		}
		if errors.Is(err, sql.ErrNoRows) {
			return fiber.NewError(fiber.StatusNotFound, "exam not found")
		}
		return fiber.NewError(fiber.StatusInternalServerError, "cannot update exam status")
	}

	return c.JSON(fiber.Map{"message": "status updated"})
}

func (h *Handler) DeleteExam(c *fiber.Ctx) error {
	username, err := auth.CurrentUsername(c)
	if err != nil {
		return fiber.NewError(fiber.StatusUnauthorized, "invalid token")
	}
	isAdmin := auth.IsAdminContext(c)
	id := strings.TrimSpace(c.Params("id"))
	if id == "" {
		return fiber.NewError(fiber.StatusBadRequest, "exam id is required")
	}

	if err := data.DeleteExam(id, username, isAdmin); err != nil {
		if errors.Is(err, data.ErrForbidden) {
			return fiber.NewError(fiber.StatusForbidden, "not allowed to delete this exam")
		}
		if errors.Is(err, sql.ErrNoRows) {
			return fiber.NewError(fiber.StatusNotFound, "exam not found")
		}
		return fiber.NewError(fiber.StatusInternalServerError, "cannot delete exam")
	}

	return c.JSON(fiber.Map{"message": "exam deleted"})
}

func (h *Handler) SaveExamAttempt(c *fiber.Ctx) error {
	username, err := auth.CurrentUsername(c)
	if err != nil {
		return fiber.NewError(fiber.StatusUnauthorized, "invalid token")
	}
	examID := strings.TrimSpace(c.Params("id"))
	if examID == "" {
		return fiber.NewError(fiber.StatusBadRequest, "exam id is required")
	}

	var req examAttemptRequest
	if err := c.BodyParser(&req); err != nil {
		return fiber.NewError(fiber.StatusBadRequest, "invalid request body")
	}

	rawAnswers := make([]struct{ QuestionID, Selected string }, 0, len(req.Answers))
	for _, ans := range req.Answers {
		rawAnswers = append(rawAnswers, struct{ QuestionID, Selected string }{
			QuestionID: ans.QuestionID,
			Selected:   ans.Selected,
		})
	}

	attempt, details, err := data.GradeAndSaveExamAttempt(examID, username, rawAnswers)
	if err != nil {
		return fiber.NewError(fiber.StatusInternalServerError, "cannot save attempt")
	}
	return c.JSON(fiber.Map{"attempt": attempt, "details": details})
}

func (h *Handler) GetMyExamAttempts(c *fiber.Ctx) error {
	username, err := auth.CurrentUsername(c)
	if err != nil {
		return fiber.NewError(fiber.StatusUnauthorized, "invalid token")
	}
	attempts, err := data.GetMyAllExamAttempts(username)
	if err != nil {
		return fiber.NewError(fiber.StatusInternalServerError, "cannot get attempts")
	}
	return c.JSON(fiber.Map{"attempts": attempts})
}

func (h *Handler) GetMyExamAttemptDetails(c *fiber.Ctx) error {
	username, err := auth.CurrentUsername(c)
	if err != nil {
		return fiber.NewError(fiber.StatusUnauthorized, "invalid token")
	}
	idStr := strings.TrimSpace(c.Params("id"))
	attemptID, err := strconv.ParseInt(idStr, 10, 64)
	if err != nil || attemptID <= 0 {
		return fiber.NewError(fiber.StatusBadRequest, "invalid attempt id")
	}
	details, err := data.GetMyExamAttemptDetails(username, attemptID)
	if err != nil {
		if errors.Is(err, data.ErrForbidden) {
			return fiber.NewError(fiber.StatusForbidden, "not your attempt")
		}
		return fiber.NewError(fiber.StatusInternalServerError, "cannot get attempt details")
	}
	return c.JSON(fiber.Map{"details": details})
}

func (h *Handler) GetAllExamAttemptsAdmin(c *fiber.Ctx) error {
	limit, offset, page := parsePage(c)
	attempts, total, err := data.GetAllExamAttemptsAdmin(limit, offset)
	if err != nil {
		return fiber.NewError(fiber.StatusInternalServerError, "cannot get attempts")
	}
	return c.JSON(fiber.Map{"attempts": attempts, "pagination": paginationMeta(total, limit, page)})
}

func (h *Handler) GetExamAttemptDetailsAdmin(c *fiber.Ctx) error {
	idStr := strings.TrimSpace(c.Params("id"))
	attemptID, err := strconv.ParseInt(idStr, 10, 64)
	if err != nil || attemptID <= 0 {
		return fiber.NewError(fiber.StatusBadRequest, "invalid attempt id")
	}
	details, err := data.GetExamAttemptDetails(attemptID)
	if err != nil {
		return fiber.NewError(fiber.StatusInternalServerError, "cannot get attempt details")
	}
	return c.JSON(fiber.Map{"details": details})
}

func (h *Handler) GetExamAttempts(c *fiber.Ctx) error {
	username, err := auth.CurrentUsername(c)
	if err != nil {
		return fiber.NewError(fiber.StatusUnauthorized, "invalid token")
	}
	examID := strings.TrimSpace(c.Params("id"))
	if examID == "" {
		return fiber.NewError(fiber.StatusBadRequest, "exam id is required")
	}

	attempts, err := data.GetUserExamAttempts(username, examID)
	if err != nil {
		return fiber.NewError(fiber.StatusInternalServerError, "cannot get attempts")
	}

	return c.JSON(fiber.Map{"attempts": attempts})
}
