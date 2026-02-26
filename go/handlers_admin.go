package main

import (
	"database/sql"
	"errors"
	"strings"

	"github.com/gofiber/fiber/v2"
)

func listUsersHandler(c *fiber.Ctx) error {
	users, err := listUsers()
	if err != nil {
		return fiber.NewError(fiber.StatusInternalServerError, "cannot list users")
	}
	return c.JSON(fiber.Map{"users": users})
}

func createUserByAdminHandler(c *fiber.Ctx) error {
	var req adminCreateUserRequest
	if err := c.BodyParser(&req); err != nil {
		return fiber.NewError(fiber.StatusBadRequest, "invalid request body")
	}

	req.Name = strings.TrimSpace(req.Name)
	req.Username = normalizeUsername(req.Username)
	req.Password = strings.TrimSpace(req.Password)
	req.Role = strings.TrimSpace(req.Role)
	req.Status = strings.ToLower(strings.TrimSpace(req.Status))
	if req.Name == "" || req.Username == "" || req.Password == "" {
		return fiber.NewError(fiber.StatusBadRequest, "name, username and password are required")
	}
	if len(req.Password) < 8 {
		return fiber.NewError(fiber.StatusBadRequest, "password must be at least 8 characters")
	}
	if req.Role == "" {
		req.Role = "ผู้ใช้งาน"
	}
	if req.Status == "" {
		req.Status = "active"
	}
	if req.Status != "active" && req.Status != "inactive" {
		return fiber.NewError(fiber.StatusBadRequest, "status must be active or inactive")
	}

	user, err := createUser(req.Name, req.Username, req.Password, req.Role, req.Status)
	if err != nil {
		if strings.Contains(strings.ToLower(err.Error()), "duplicate") || strings.Contains(strings.ToLower(err.Error()), "unique") {
			return fiber.NewError(fiber.StatusConflict, "username already exists")
		}
		return fiber.NewError(fiber.StatusInternalServerError, "cannot create user")
	}
	return c.Status(fiber.StatusCreated).JSON(fiber.Map{
		"message": "create user success",
		"user":    user,
	})
}

func updateUserByAdminHandler(c *fiber.Ctx) error {
	username := normalizeUsername(c.Params("username"))
	if username == "" {
		return fiber.NewError(fiber.StatusBadRequest, "username is required")
	}

	var req adminUpdateUserRequest
	if err := c.BodyParser(&req); err != nil {
		return fiber.NewError(fiber.StatusBadRequest, "invalid request body")
	}
	req.Role = strings.TrimSpace(req.Role)
	req.Status = strings.ToLower(strings.TrimSpace(req.Status))
	req.Name = strings.TrimSpace(req.Name)

	user, err := updateUserByUsername(username, req.Name, req.Role, req.Status)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return fiber.NewError(fiber.StatusNotFound, "user not found")
		}
		if strings.Contains(strings.ToLower(err.Error()), "invalid status") {
			return fiber.NewError(fiber.StatusBadRequest, "status must be active or inactive")
		}
		return fiber.NewError(fiber.StatusInternalServerError, "cannot update user")
	}

	return c.JSON(fiber.Map{
		"message": "update user success",
		"user":    user,
	})
}

func resetUserPasswordByAdminHandler(c *fiber.Ctx) error {
	username := normalizeUsername(c.Params("username"))
	if username == "" {
		return fiber.NewError(fiber.StatusBadRequest, "username is required")
	}

	var req adminResetPasswordRequest
	if err := c.BodyParser(&req); err != nil {
		return fiber.NewError(fiber.StatusBadRequest, "invalid request body")
	}
	req.NewPassword = strings.TrimSpace(req.NewPassword)
	if len(req.NewPassword) < 8 {
		return fiber.NewError(fiber.StatusBadRequest, "new_password must be at least 8 characters")
	}

	user, err := findUserByUsername(username)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return fiber.NewError(fiber.StatusNotFound, "user not found")
		}
		return fiber.NewError(fiber.StatusNotFound, "user not found")
	}

	if err := setUserPasswordByID(user.ID, req.NewPassword); err != nil {
		return fiber.NewError(fiber.StatusInternalServerError, "cannot reset password")
	}
	if err := revokeAllRefreshTokensByUserID(user.ID); err != nil {
		return fiber.NewError(fiber.StatusInternalServerError, "cannot revoke sessions")
	}

	return c.JSON(fiber.Map{"message": "reset password success"})
}
