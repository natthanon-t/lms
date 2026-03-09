package api

import (
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
