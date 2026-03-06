package api

import (
	"backend/internal/config"
	"math"
	"strconv"

	"github.com/gofiber/fiber/v2"
)

type Handler struct {
	cfg config.AppConfig
}

func NewHandler(cfg config.AppConfig) *Handler {
	return &Handler{cfg: cfg}
}

const defaultPageLimit = 20
const maxPageLimit = 100

func parsePage(c *fiber.Ctx) (limit, offset, page int) {
	page, _ = strconv.Atoi(c.Query("page", "1"))
	if page < 1 {
		page = 1
	}
	limit, _ = strconv.Atoi(c.Query("limit", strconv.Itoa(defaultPageLimit)))
	if limit < 1 {
		limit = defaultPageLimit
	}
	if limit > maxPageLimit {
		limit = maxPageLimit
	}
	offset = (page - 1) * limit
	return
}

func paginationMeta(total, limit, page int) fiber.Map {
	totalPages := int(math.Ceil(float64(total) / float64(limit)))
	if totalPages < 1 {
		totalPages = 1
	}
	return fiber.Map{
		"total":       total,
		"page":        page,
		"limit":       limit,
		"total_pages": totalPages,
	}
}
