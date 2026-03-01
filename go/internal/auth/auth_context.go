package auth

import (
	"errors"
	"strconv"
	"strings"

	"github.com/gofiber/fiber/v2"
	"github.com/golang-jwt/jwt/v4"
)

func CurrentUserID(c *fiber.Ctx) (int64, error) {
	token, ok := c.Locals("user").(*jwt.Token)
	if !ok {
		return 0, errors.New("invalid token")
	}
	claims, ok := token.Claims.(jwt.MapClaims)
	if !ok {
		return 0, errors.New("invalid token claims")
	}

	rawSub, ok := claims["sub"]
	if !ok {
		return 0, errors.New("missing sub claim")
	}
	subValue, ok := rawSub.(string)
	if !ok {
		return 0, errors.New("invalid sub claim")
	}
	sub := strings.TrimSpace(subValue)
	if sub == "" {
		return 0, errors.New("empty sub claim")
	}
	return strconv.ParseInt(sub, 10, 64)
}

func currentUserRole(c *fiber.Ctx) string {
	token, ok := c.Locals("user").(*jwt.Token)
	if !ok {
		return ""
	}
	claims, ok := token.Claims.(jwt.MapClaims)
	if !ok {
		return ""
	}
	role, _ := claims["role"].(string)
	return strings.TrimSpace(role)
}

func isAdminRole(role string) bool {
	normalized := strings.ToLower(strings.TrimSpace(role))
	return normalized == "admin" || role == "ผู้ดูแลระบบ"
}

func CurrentUsername(c *fiber.Ctx) (string, error) {
	token, ok := c.Locals("user").(*jwt.Token)
	if !ok {
		return "", errors.New("invalid token")
	}
	claims, ok := token.Claims.(jwt.MapClaims)
	if !ok {
		return "", errors.New("invalid token claims")
	}
	username, _ := claims["username"].(string)
	username = strings.ToLower(strings.TrimSpace(username))
	if username == "" {
		return "", errors.New("missing username claim")
	}
	return username, nil
}

func IsAdminContext(c *fiber.Ctx) bool {
	return isAdminRole(currentUserRole(c))
}

func AdminOnlyMiddleware(c *fiber.Ctx) error {
	if !isAdminRole(currentUserRole(c)) {
		return fiber.NewError(fiber.StatusForbidden, "admin only")
	}
	return c.Next()
}
