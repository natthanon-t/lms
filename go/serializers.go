package main

import "github.com/gofiber/fiber/v2"

func toUserPayload(user AuthUserRecord) fiber.Map {
	return fiber.Map{
		"id":       user.ID,
		"name":     user.Name,
		"username": user.Username,
		"role":     user.Role,
		"status":   user.Status,
	}
}
