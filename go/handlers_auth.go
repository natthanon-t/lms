package main

import (
	"database/sql"
	"errors"
	"strings"
	"time"

	"github.com/gofiber/fiber/v2"
	"golang.org/x/crypto/bcrypt"
)

func registerHandler(c *fiber.Ctx) error {
	var req registerRequest
	if err := c.BodyParser(&req); err != nil {
		return fiber.NewError(fiber.StatusBadRequest, "invalid request body")
	}

	req.Name = strings.TrimSpace(req.Name)
	req.Username = normalizeUsername(req.Username)
	req.Password = strings.TrimSpace(req.Password)

	if req.Name == "" || req.Username == "" || req.Password == "" {
		return fiber.NewError(fiber.StatusBadRequest, "name, username and password are required")
	}
	if len(req.Password) < 8 {
		return fiber.NewError(fiber.StatusBadRequest, "password must be at least 8 characters")
	}

	user, err := createUser(req.Name, req.Username, req.Password, "user", "active")
	if err != nil {
		if strings.Contains(strings.ToLower(err.Error()), "duplicate") || strings.Contains(strings.ToLower(err.Error()), "unique") {
			return fiber.NewError(fiber.StatusConflict, "username already exists")
		}
		return fiber.NewError(fiber.StatusInternalServerError, "cannot create user")
	}

	return c.Status(fiber.StatusCreated).JSON(fiber.Map{
		"message": "register success",
		"user":    user,
	})
}

func loginHandler(c *fiber.Ctx) error {
	var req loginRequest
	if err := c.BodyParser(&req); err != nil {
		return fiber.NewError(fiber.StatusBadRequest, "invalid request body")
	}
	req.Username = normalizeUsername(req.Username)
	req.Password = strings.TrimSpace(req.Password)
	if req.Username == "" || req.Password == "" {
		return fiber.NewError(fiber.StatusBadRequest, "username and password are required")
	}

	user, err := findUserByUsername(req.Username)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return fiber.NewError(fiber.StatusUnauthorized, "invalid credentials")
		}
		return fiber.NewError(fiber.StatusInternalServerError, "login failed")
	}
	if strings.ToLower(strings.TrimSpace(user.Status)) != "active" {
		return fiber.NewError(fiber.StatusForbidden, "user is inactive")
	}

	if err := bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(req.Password)); err != nil {
		return fiber.NewError(fiber.StatusUnauthorized, "invalid credentials")
	}

	accessToken, err := generateAccessToken(user)
	if err != nil {
		return fiber.NewError(fiber.StatusInternalServerError, "cannot generate token")
	}
	refreshToken, refreshHash, err := generateRefreshToken()
	if err != nil {
		return fiber.NewError(fiber.StatusInternalServerError, "cannot generate refresh token")
	}
	refreshExpiresAt := time.Now().Add(time.Duration(appCfg.RefreshTTL) * time.Hour)
	if err := createRefreshToken(user.ID, refreshHash, refreshExpiresAt); err != nil {
		return fiber.NewError(fiber.StatusInternalServerError, "cannot store refresh token")
	}

	return c.JSON(fiber.Map{
		"message":       "login success",
		"token":         accessToken,
		"refresh_token": refreshToken,
		"token_type":    "Bearer",
		"expires_in":    appCfg.AccessTTL * 60,
		"user":          toUserPayload(user),
	})
}

func refreshHandler(c *fiber.Ctx) error {
	var req refreshRequest
	if err := c.BodyParser(&req); err != nil {
		return fiber.NewError(fiber.StatusBadRequest, "invalid request body")
	}
	rawToken := strings.TrimSpace(req.RefreshToken)
	if rawToken == "" {
		return fiber.NewError(fiber.StatusBadRequest, "refresh token is required")
	}

	currentHash := hashRefreshToken(rawToken)
	userID, err := getActiveRefreshTokenUser(currentHash)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return fiber.NewError(fiber.StatusUnauthorized, "invalid refresh token")
		}
		return fiber.NewError(fiber.StatusInternalServerError, "refresh failed")
	}

	user, err := findUserByID(userID)
	if err != nil {
		return fiber.NewError(fiber.StatusUnauthorized, "invalid refresh token")
	}
	if strings.ToLower(strings.TrimSpace(user.Status)) != "active" {
		return fiber.NewError(fiber.StatusForbidden, "user is inactive")
	}

	if err := revokeRefreshToken(currentHash); err != nil {
		return fiber.NewError(fiber.StatusInternalServerError, "cannot rotate refresh token")
	}

	nextRefreshToken, nextRefreshHash, err := generateRefreshToken()
	if err != nil {
		return fiber.NewError(fiber.StatusInternalServerError, "cannot generate refresh token")
	}
	nextRefreshExpiresAt := time.Now().Add(time.Duration(appCfg.RefreshTTL) * time.Hour)
	if err := createRefreshToken(user.ID, nextRefreshHash, nextRefreshExpiresAt); err != nil {
		return fiber.NewError(fiber.StatusInternalServerError, "cannot store refresh token")
	}

	accessToken, err := generateAccessToken(user)
	if err != nil {
		return fiber.NewError(fiber.StatusInternalServerError, "cannot generate token")
	}

	return c.JSON(fiber.Map{
		"message":       "refresh success",
		"token":         accessToken,
		"refresh_token": nextRefreshToken,
		"token_type":    "Bearer",
		"expires_in":    appCfg.AccessTTL * 60,
		"user":          toUserPayload(user),
	})
}

func logoutHandler(c *fiber.Ctx) error {
	var req logoutRequest
	if err := c.BodyParser(&req); err != nil {
		return fiber.NewError(fiber.StatusBadRequest, "invalid request body")
	}

	rawToken := strings.TrimSpace(req.RefreshToken)
	if rawToken == "" {
		return c.JSON(fiber.Map{"message": "logout success"})
	}

	if err := revokeRefreshToken(hashRefreshToken(rawToken)); err != nil {
		return fiber.NewError(fiber.StatusInternalServerError, "logout failed")
	}

	return c.JSON(fiber.Map{"message": "logout success"})
}

func meHandler(c *fiber.Ctx) error {
	userID, err := currentUserID(c)
	if err != nil {
		return fiber.NewError(fiber.StatusUnauthorized, "invalid token")
	}
	user, err := findUserByID(userID)
	if err != nil {
		return fiber.NewError(fiber.StatusUnauthorized, "invalid token")
	}
	return c.JSON(toUserPayload(user))
}
