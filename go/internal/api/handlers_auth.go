package api

import (
	"backend/internal/auth"
	"backend/internal/data"
	"database/sql"
	"errors"
	"strings"
	"time"

	"github.com/gofiber/fiber/v2"
	"golang.org/x/crypto/bcrypt"
)

func (h *Handler) Register(c *fiber.Ctx) error {
	var req registerRequest
	if err := c.BodyParser(&req); err != nil {
		return fiber.NewError(fiber.StatusBadRequest, "invalid request body")
	}

	req.Name = strings.TrimSpace(req.Name)
	req.Username = data.NormalizeUsername(req.Username)
	req.Password = strings.TrimSpace(req.Password)

	if req.Name == "" || req.Username == "" || req.Password == "" {
		return fiber.NewError(fiber.StatusBadRequest, "name, username and password are required")
	}
	if len(req.Password) < 8 {
		return fiber.NewError(fiber.StatusBadRequest, "password must be at least 8 characters")
	}

	user, err := data.CreateUser(req.Name, req.Username, "", req.Password, "user", "active")
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

func (h *Handler) Login(c *fiber.Ctx) error {
	var req loginRequest
	if err := c.BodyParser(&req); err != nil {
		return fiber.NewError(fiber.StatusBadRequest, "invalid request body")
	}
	req.Username = data.NormalizeUsername(req.Username)
	req.Password = strings.TrimSpace(req.Password)
	if req.Username == "" || req.Password == "" {
		return fiber.NewError(fiber.StatusBadRequest, "username and password are required")
	}

	user, err := data.FindUserByUsername(req.Username)
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

	accessToken, err := auth.GenerateAccessToken(user, h.cfg.JWTSecret, h.cfg.AccessTTL)
	if err != nil {
		return fiber.NewError(fiber.StatusInternalServerError, "cannot generate token")
	}
	refreshToken, refreshHash, err := auth.GenerateRefreshToken()
	if err != nil {
		return fiber.NewError(fiber.StatusInternalServerError, "cannot generate refresh token")
	}
	refreshExpiresAt := time.Now().Add(time.Duration(h.cfg.RefreshTTL) * time.Hour)
	if err := data.CreateRefreshToken(user.ID, refreshHash, refreshExpiresAt); err != nil {
		return fiber.NewError(fiber.StatusInternalServerError, "cannot store refresh token")
	}

	return c.JSON(fiber.Map{
		"message":       "login success",
		"token":         accessToken,
		"refresh_token": refreshToken,
		"token_type":    "Bearer",
		"expires_in":    h.cfg.AccessTTL * 60,
		"user":          toUserPayload(user),
	})
}

func (h *Handler) Refresh(c *fiber.Ctx) error {
	var req refreshRequest
	if err := c.BodyParser(&req); err != nil {
		return fiber.NewError(fiber.StatusBadRequest, "invalid request body")
	}
	rawToken := strings.TrimSpace(req.RefreshToken)
	if rawToken == "" {
		return fiber.NewError(fiber.StatusBadRequest, "refresh token is required")
	}

	currentHash := auth.HashRefreshToken(rawToken)
	userID, err := data.GetActiveRefreshTokenUser(currentHash)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return fiber.NewError(fiber.StatusUnauthorized, "invalid refresh token")
		}
		return fiber.NewError(fiber.StatusInternalServerError, "refresh failed")
	}

	user, err := data.FindUserByID(userID)
	if err != nil {
		return fiber.NewError(fiber.StatusUnauthorized, "invalid refresh token")
	}
	if strings.ToLower(strings.TrimSpace(user.Status)) != "active" {
		return fiber.NewError(fiber.StatusForbidden, "user is inactive")
	}

	if err := data.RevokeRefreshToken(currentHash); err != nil {
		return fiber.NewError(fiber.StatusInternalServerError, "cannot rotate refresh token")
	}

	nextRefreshToken, nextRefreshHash, err := auth.GenerateRefreshToken()
	if err != nil {
		return fiber.NewError(fiber.StatusInternalServerError, "cannot generate refresh token")
	}
	nextRefreshExpiresAt := time.Now().Add(time.Duration(h.cfg.RefreshTTL) * time.Hour)
	if err := data.CreateRefreshToken(user.ID, nextRefreshHash, nextRefreshExpiresAt); err != nil {
		return fiber.NewError(fiber.StatusInternalServerError, "cannot store refresh token")
	}

	accessToken, err := auth.GenerateAccessToken(user, h.cfg.JWTSecret, h.cfg.AccessTTL)
	if err != nil {
		return fiber.NewError(fiber.StatusInternalServerError, "cannot generate token")
	}

	return c.JSON(fiber.Map{
		"message":       "refresh success",
		"token":         accessToken,
		"refresh_token": nextRefreshToken,
		"token_type":    "Bearer",
		"expires_in":    h.cfg.AccessTTL * 60,
		"user":          toUserPayload(user),
	})
}

func (h *Handler) Logout(c *fiber.Ctx) error {
	var req logoutRequest
	if err := c.BodyParser(&req); err != nil {
		return fiber.NewError(fiber.StatusBadRequest, "invalid request body")
	}

	rawToken := strings.TrimSpace(req.RefreshToken)
	if rawToken == "" {
		return c.JSON(fiber.Map{"message": "logout success"})
	}

	if err := data.RevokeRefreshToken(auth.HashRefreshToken(rawToken)); err != nil {
		return fiber.NewError(fiber.StatusInternalServerError, "logout failed")
	}

	return c.JSON(fiber.Map{"message": "logout success"})
}

func (h *Handler) Me(c *fiber.Ctx) error {
	userID, err := auth.CurrentUserID(c)
	if err != nil {
		return fiber.NewError(fiber.StatusUnauthorized, "invalid token")
	}
	user, err := data.FindUserByID(userID)
	if err != nil {
		return fiber.NewError(fiber.StatusUnauthorized, "invalid token")
	}
	return c.JSON(toUserPayload(user))
}
