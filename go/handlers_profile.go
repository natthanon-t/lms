package main

import (
	"strings"

	"github.com/gofiber/fiber/v2"
)

func updateProfileNameHandler(c *fiber.Ctx) error {
	userID, err := currentUserID(c)
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

	user, err := updateUserName(userID, req.Name)
	if err != nil {
		return fiber.NewError(fiber.StatusInternalServerError, "cannot update profile")
	}

	return c.JSON(fiber.Map{
		"message": "profile updated",
		"user":    toUserPayload(user),
	})
}

func changePasswordHandler(c *fiber.Ctx) error {
	userID, err := currentUserID(c)
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

	ok, err := verifyUserPassword(userID, req.CurrentPassword)
	if err != nil {
		return fiber.NewError(fiber.StatusInternalServerError, "cannot verify current password")
	}
	if !ok {
		return fiber.NewError(fiber.StatusBadRequest, "current password is incorrect")
	}

	if err := setUserPasswordByID(userID, req.NewPassword); err != nil {
		return fiber.NewError(fiber.StatusInternalServerError, "cannot update password")
	}
	if err := revokeAllRefreshTokensByUserID(userID); err != nil {
		return fiber.NewError(fiber.StatusInternalServerError, "cannot revoke sessions")
	}

	return c.JSON(fiber.Map{"message": "password changed"})
}
