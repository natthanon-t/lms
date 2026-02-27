package api

import "backend/internal/data"
import "github.com/gofiber/fiber/v2"

func toUserPayload(user data.AuthUserRecord) fiber.Map {
	return fiber.Map{
		"id":            user.ID,
		"name":          user.Name,
		"username":      user.Username,
		"employee_code": user.EmployeeCode,
		"role":          user.Role,
		"status":        user.Status,
	}
}
