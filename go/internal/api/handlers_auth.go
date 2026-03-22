package api

import (
	"backend/internal/auth"
	"backend/internal/data"
	"crypto/rand"
	"database/sql"
	"encoding/base64"
	"encoding/hex"
	"errors"
	"os"
	"path/filepath"
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
	req.EmployeeCode = data.NormalizeEmployeeCode(req.EmployeeCode)
	req.Password = strings.TrimSpace(req.Password)

	if req.Name == "" || req.Username == "" || req.Password == "" {
		return fiber.NewError(fiber.StatusBadRequest, "name, username and password are required")
	}
	if req.EmployeeCode != "" && !data.IsValidEmployeeCode(req.EmployeeCode) {
		return fiber.NewError(fiber.StatusBadRequest, "employee_code must be in format XXXX-XX-XXXX")
	}
	if len(req.Password) < 8 {
		return fiber.NewError(fiber.StatusBadRequest, "password must be at least 8 characters")
	}

	user, err := data.CreateUser(req.Name, req.Username, req.EmployeeCode, req.Password, "user", "active")
	if err != nil {
		if data.IsDuplicateKey(err) {
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
		return fiber.NewError(fiber.StatusUnauthorized, "user is inactive")
	}

	if err := bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(req.Password)); err != nil {
		return fiber.NewError(fiber.StatusUnauthorized, "invalid credentials")
	}

	permissions, err := data.PermissionsForUser(user.ID)
	if err != nil {
		return fiber.NewError(fiber.StatusInternalServerError, "cannot load permissions")
	}

	accessToken, err := auth.GenerateAccessToken(user, h.cfg.JWTSecret, h.cfg.AccessTTL, permissions)
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

	_ = data.RecordLoginLog(user.ID)

	userPayload, err := toUserPayload(user)
	if err != nil {
		return fiber.NewError(fiber.StatusInternalServerError, "cannot load user permissions")
	}

	csrfToken, err := generateCSRFToken()
	if err != nil {
		return fiber.NewError(fiber.StatusInternalServerError, "cannot generate csrf token")
	}
	setAuthCookies(c, accessToken, h.cfg.AccessTTL, refreshToken, h.cfg.RefreshTTL, csrfToken, isSecureCookie(h.cfg.CORSOrigins))

	return c.JSON(fiber.Map{
		"message":    "login success",
		"expires_in": h.cfg.AccessTTL * 60,
		"user":       userPayload,
	})
}

func (h *Handler) Refresh(c *fiber.Ctx) error {
	rawToken := c.Cookies("refresh_token")
	if rawToken == "" {
		// Fallback: read from request body for backward compatibility
		var req refreshRequest
		if err := c.BodyParser(&req); err == nil {
			rawToken = strings.TrimSpace(req.RefreshToken)
		}
	}
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
		return fiber.NewError(fiber.StatusUnauthorized, "user is inactive")
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

	permissions, err := auth.PermissionsForRole(user.Role)
	if err != nil {
		return fiber.NewError(fiber.StatusInternalServerError, "cannot load permissions")
	}

	accessToken, err := auth.GenerateAccessToken(user, h.cfg.JWTSecret, h.cfg.AccessTTL, permissions)
	if err != nil {
		return fiber.NewError(fiber.StatusInternalServerError, "cannot generate token")
	}

	userPayload, err := toUserPayload(user)
	if err != nil {
		return fiber.NewError(fiber.StatusInternalServerError, "cannot load user permissions")
	}

	csrfToken, err := generateCSRFToken()
	if err != nil {
		return fiber.NewError(fiber.StatusInternalServerError, "cannot generate csrf token")
	}
	setAuthCookies(c, accessToken, h.cfg.AccessTTL, nextRefreshToken, h.cfg.RefreshTTL, csrfToken, isSecureCookie(h.cfg.CORSOrigins))

	return c.JSON(fiber.Map{
		"message":    "refresh success",
		"expires_in": h.cfg.AccessTTL * 60,
		"user":       userPayload,
	})
}

func (h *Handler) Logout(c *fiber.Ctx) error {
	rawToken := c.Cookies("refresh_token")
	if rawToken == "" {
		// Fallback: read from request body for backward compatibility
		var req logoutRequest
		if err := c.BodyParser(&req); err == nil {
			rawToken = strings.TrimSpace(req.RefreshToken)
		}
	}

	if rawToken != "" {
		_ = data.RevokeRefreshToken(auth.HashRefreshToken(rawToken))
	}

	clearAuthCookies(c, isSecureCookie(h.cfg.CORSOrigins))
	return c.JSON(fiber.Map{"message": "logout success"})
}

func (h *Handler) LoginDates(c *fiber.Ctx) error {
	userID, err := auth.CurrentUserID(c)
	if err != nil {
		return fiber.NewError(fiber.StatusUnauthorized, "invalid token")
	}
	dates, err := data.GetLoginDatesByUserID(userID)
	if err != nil {
		return fiber.NewError(fiber.StatusInternalServerError, "failed to get login dates")
	}
	return c.JSON(fiber.Map{"dates": dates})
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
	userPayload, err := toUserPayload(user)
	if err != nil {
		return fiber.NewError(fiber.StatusInternalServerError, "cannot load user permissions")
	}
	return c.JSON(userPayload)
}

func (h *Handler) GetAvatar(c *fiber.Ctx) error {
	username, err := auth.CurrentUsername(c)
	if err != nil {
		return fiber.NewError(fiber.StatusUnauthorized, "invalid token")
	}
	urlPath, err := data.GetAvatar(username)
	if err != nil {
		return fiber.NewError(fiber.StatusInternalServerError, "cannot get avatar")
	}
	if urlPath == "" {
		return c.JSON(fiber.Map{"data_url": ""})
	}
	// Read the file and return as data URL (avatars are no longer served statically)
	fsPath := strings.TrimPrefix(urlPath, "/")
	fileData, err := os.ReadFile(fsPath)
	if err != nil {
		return c.JSON(fiber.Map{"data_url": ""})
	}
	mime := mimeFromExt(filepath.Ext(fsPath))
	dataURL := "data:" + mime + ";base64," + base64.StdEncoding.EncodeToString(fileData)
	return c.JSON(fiber.Map{"data_url": dataURL})
}

const maxAvatarBytes = 2 * 1024 * 1024 // 2 MB (base64-encoded)

func (h *Handler) UpdateAvatar(c *fiber.Ctx) error {
	username, err := auth.CurrentUsername(c)
	if err != nil {
		return fiber.NewError(fiber.StatusUnauthorized, "invalid token")
	}
	var req avatarRequest
	if err := c.BodyParser(&req); err != nil {
		return fiber.NewError(fiber.StatusBadRequest, "invalid request body")
	}
	if len(req.DataURL) > maxAvatarBytes {
		return fiber.NewError(fiber.StatusRequestEntityTooLarge, "avatar must not exceed 2 MB")
	}
	// Validate image magic bytes
	decoded, err := decodeDataURL(req.DataURL)
	if err != nil {
		return fiber.NewError(fiber.StatusBadRequest, "invalid image data")
	}
	if err := validateImageBytes(decoded); err != nil {
		return fiber.NewError(fiber.StatusBadRequest, "file is not a valid image")
	}
	filename := username + extFromDataURL(req.DataURL)
	url, err := saveBytesToFile("uploads/avatars", filename, decoded)
	if err != nil {
		return fiber.NewError(fiber.StatusInternalServerError, "cannot save avatar file")
	}
	if err := data.SaveAvatar(username, url); err != nil {
		return fiber.NewError(fiber.StatusInternalServerError, "cannot save avatar")
	}
	return c.JSON(fiber.Map{"data_url": url})
}

// ── Cookie helpers for httpOnly token storage ────────────────────────────────

func generateCSRFToken() (string, error) {
	buf := make([]byte, 32)
	if _, err := rand.Read(buf); err != nil {
		return "", err
	}
	return hex.EncodeToString(buf), nil
}

func isSecureCookie(origins string) bool {
	return strings.Contains(origins, "https://")
}

func setAuthCookies(c *fiber.Ctx, accessToken string, accessTTL int, refreshToken string, refreshTTL int, csrfToken string, secure bool) {
	sameSite := "Lax"
	c.Cookie(&fiber.Cookie{
		Name:     "access_token",
		Value:    accessToken,
		HTTPOnly: true,
		Secure:   secure,
		SameSite: sameSite,
		Path:     "/",
		MaxAge:   accessTTL * 60,
	})
	c.Cookie(&fiber.Cookie{
		Name:     "refresh_token",
		Value:    refreshToken,
		HTTPOnly: true,
		Secure:   secure,
		SameSite: sameSite,
		Path:     "/api/auth",
		MaxAge:   refreshTTL * 3600,
	})
	c.Cookie(&fiber.Cookie{
		Name:     "csrf_token",
		Value:    csrfToken,
		HTTPOnly: false,
		Secure:   secure,
		SameSite: sameSite,
		Path:     "/",
		MaxAge:   refreshTTL * 3600,
	})
}

func clearAuthCookies(c *fiber.Ctx, secure bool) {
	sameSite := "Lax"
	c.Cookie(&fiber.Cookie{Name: "access_token", Value: "", HTTPOnly: true, Secure: secure, SameSite: sameSite, Path: "/", MaxAge: -1})
	c.Cookie(&fiber.Cookie{Name: "refresh_token", Value: "", HTTPOnly: true, Secure: secure, SameSite: sameSite, Path: "/api/auth", MaxAge: -1})
	c.Cookie(&fiber.Cookie{Name: "csrf_token", Value: "", Secure: secure, SameSite: sameSite, Path: "/", MaxAge: -1})
}
