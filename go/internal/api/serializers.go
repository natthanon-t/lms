package api

import (
	"backend/internal/auth"
	"backend/internal/data"

	"github.com/gofiber/fiber/v2"
)

func toUserPayload(user data.AuthUserRecord) (fiber.Map, error) {
	permissions, err := auth.PermissionsForRole(user.Role)
	if err != nil {
		return nil, err
	}
	return fiber.Map{
		"id":            user.ID,
		"name":          user.Name,
		"username":      user.Username,
		"employee_code": user.EmployeeCode,
		"role":          user.Role,
		"status":        user.Status,
		"permissions":   permissions,
	}, nil
}

func toAuthUserPayload(user data.AuthUser) (fiber.Map, error) {
	permissions, err := auth.PermissionsForRole(user.Role)
	if err != nil {
		return nil, err
	}
	return fiber.Map{
		"id":            user.ID,
		"name":          user.Name,
		"username":      user.Username,
		"employee_code": user.EmployeeCode,
		"role":          user.Role,
		"status":        user.Status,
		"created_at":    user.CreatedAt,
		"permissions":   permissions,
	}, nil
}
