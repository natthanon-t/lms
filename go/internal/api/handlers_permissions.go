package api

import (
	"backend/internal/auth"
	"backend/internal/data"

	"github.com/gofiber/fiber/v2"
)

func (h *Handler) MyPermissions(c *fiber.Ctx) error {
	userID, err := auth.CurrentUserID(c)
	if err != nil {
		return fiber.NewError(fiber.StatusUnauthorized, "invalid token")
	}

	permissions, err := data.PermissionsForUser(userID)
	if err != nil {
		return fiber.NewError(fiber.StatusInternalServerError, "cannot load permissions")
	}
	menuItems, err := data.AllowedSidebarItemsForUser(userID)
	if err != nil {
		return fiber.NewError(fiber.StatusInternalServerError, "cannot load allowed menu items")
	}

	return c.JSON(fiber.Map{
		"permissions": permissions,
		"sidebar":     menuItems,
	})
}
