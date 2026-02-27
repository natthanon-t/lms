package api

import (
	"backend/internal/auth"
	"backend/internal/data"
	"strings"

	"github.com/gofiber/fiber/v2"
)

func (h *Handler) UpdateProfileName(c *fiber.Ctx) error {
	userID, err := auth.CurrentUserID(c)
	if err != nil {
		return fiber.NewError(fiber.StatusUnauthorized, "invalid token")
	}

	var req updateProfileNameRequest
	if err := c.BodyParser(&req); err != nil {
		return fiber.NewError(fiber.StatusBadRequest, "invalid request body")
	}
	req.Name = strings.TrimSpace(req.Name)
	if req.Name == "" {
		return fiber.NewError(fiber.StatusBadRequest, "name is required")
	}

	user, err := data.UpdateUserName(userID, req.Name)
	if err != nil {
		return fiber.NewError(fiber.StatusInternalServerError, "cannot update profile")
	}

	return c.JSON(fiber.Map{
		"message": "profile updated",
		"user":    toUserPayload(user),
	})
}

func (h *Handler) ChangePassword(c *fiber.Ctx) error {
	userID, err := auth.CurrentUserID(c)
	if err != nil {
		return fiber.NewError(fiber.StatusUnauthorized, "invalid token")
	}

	var req changePasswordRequest
	if err := c.BodyParser(&req); err != nil {
		return fiber.NewError(fiber.StatusBadRequest, "invalid request body")
	}

	req.CurrentPassword = strings.TrimSpace(req.CurrentPassword)
	req.NewPassword = strings.TrimSpace(req.NewPassword)
	if req.CurrentPassword == "" || req.NewPassword == "" {
		return fiber.NewError(fiber.StatusBadRequest, "current_password and new_password are required")
	}
	if len(req.NewPassword) < 8 {
		return fiber.NewError(fiber.StatusBadRequest, "new password must be at least 8 characters")
	}

	ok, err := data.VerifyUserPassword(userID, req.CurrentPassword)
	if err != nil {
		return fiber.NewError(fiber.StatusInternalServerError, "cannot verify current password")
	}
	if !ok {
		return fiber.NewError(fiber.StatusBadRequest, "current password is incorrect")
	}

	if err := data.SetUserPasswordByID(userID, req.NewPassword); err != nil {
		return fiber.NewError(fiber.StatusInternalServerError, "cannot update password")
	}
	if err := data.RevokeAllRefreshTokensByUserID(userID); err != nil {
		return fiber.NewError(fiber.StatusInternalServerError, "cannot revoke sessions")
	}

	return c.JSON(fiber.Map{"message": "password changed"})
}
