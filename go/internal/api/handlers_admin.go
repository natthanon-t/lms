package api

import (
	"backend/internal/auth"
	"backend/internal/data"
	"database/sql"
	"errors"
	"strings"

	"github.com/gofiber/fiber/v2"
)

var userStatusOptions = []string{"active", "inactive"}

func (h *Handler) RoleOptions(c *fiber.Ctx) error {
	roles, err := data.ListRoles()
	if err != nil {
		return fiber.NewError(fiber.StatusInternalServerError, "cannot load roles")
	}
	permissionCatalog, err := auth.PermissionCatalog()
	if err != nil {
		return fiber.NewError(fiber.StatusInternalServerError, "cannot load permission catalog")
	}
	rolePermissions, err := auth.RolePermissionsMap()
	if err != nil {
		return fiber.NewError(fiber.StatusInternalServerError, "cannot load role permissions")
	}
	return c.JSON(fiber.Map{
		"roles":             roles,
		"default_role":      "user",
		"permission_catalog": permissionCatalog,
		"role_permissions":   rolePermissions,
	})
}

func (h *Handler) UserOptions(c *fiber.Ctx) error {
	roles, err := data.ListRoles()
	if err != nil {
		return fiber.NewError(fiber.StatusInternalServerError, "cannot load roles")
	}
	permissionCatalog, err := auth.PermissionCatalog()
	if err != nil {
		return fiber.NewError(fiber.StatusInternalServerError, "cannot load permission catalog")
	}
	rolePermissions, err := auth.RolePermissionsMap()
	if err != nil {
		return fiber.NewError(fiber.StatusInternalServerError, "cannot load role permissions")
	}
	return c.JSON(fiber.Map{
		"role_options":       roles,
		"status_options":     userStatusOptions,
		"default_role":       "user",
		"default_status":     "active",
		"permission_catalog": permissionCatalog,
		"role_permissions":   rolePermissions,
	})
}

func (h *Handler) ListUsers(c *fiber.Ctx) error {
	limit, offset, page := parsePage(c)
	users, total, err := data.ListUsers(limit, offset)
	if err != nil {
		return fiber.NewError(fiber.StatusInternalServerError, "cannot list users")
	}
	return c.JSON(fiber.Map{"users": users, "pagination": paginationMeta(total, limit, page)})
}

func (h *Handler) CreateUserByAdmin(c *fiber.Ctx) error {
	var req adminCreateUserRequest
	if err := c.BodyParser(&req); err != nil {
		return fiber.NewError(fiber.StatusBadRequest, "invalid request body")
	}

	req.Name = strings.TrimSpace(req.Name)
	req.Username = data.NormalizeUsername(req.Username)
	req.Password = strings.TrimSpace(req.Password)
	req.Role = strings.TrimSpace(req.Role)
	req.Status = strings.ToLower(strings.TrimSpace(req.Status))
	req.EmployeeCode = data.NormalizeEmployeeCode(req.EmployeeCode)
	if req.Name == "" || req.Username == "" || req.Password == "" || req.EmployeeCode == "" {
		return fiber.NewError(fiber.StatusBadRequest, "name, username, employee_code and password are required")
	}
	if !data.IsValidEmployeeCode(req.EmployeeCode) {
		return fiber.NewError(fiber.StatusBadRequest, "employee_code must be in format XXXX-XX-XXXX")
	}
	if len(req.Password) < 8 {
		return fiber.NewError(fiber.StatusBadRequest, "password must be at least 8 characters")
	}
	if req.Role == "" {
		req.Role = "user"
	}
	roleExists, err := data.RoleExists(req.Role)
	if err != nil {
		return fiber.NewError(fiber.StatusInternalServerError, "cannot validate role")
	}
	if !roleExists {
		return fiber.NewError(fiber.StatusBadRequest, "role is invalid")
	}
	if req.Status == "" {
		req.Status = "active"
	}
	if req.Status != "active" && req.Status != "inactive" {
		return fiber.NewError(fiber.StatusBadRequest, "status is invalid")
	}

	user, err := data.CreateUser(req.Name, req.Username, req.EmployeeCode, req.Password, req.Role, req.Status)
	if err != nil {
		if data.IsDuplicateKey(err) {
			return fiber.NewError(fiber.StatusConflict, "username already exists")
		}
		return fiber.NewError(fiber.StatusInternalServerError, "cannot create user")
	}
	userPayload, err := toAuthUserPayload(user)
	if err != nil {
		return fiber.NewError(fiber.StatusInternalServerError, "cannot load user permissions")
	}
	return c.Status(fiber.StatusCreated).JSON(fiber.Map{
		"message": "create user success",
		"user":    userPayload,
	})
}

func (h *Handler) UpdateUserByAdmin(c *fiber.Ctx) error {
	username := data.NormalizeUsername(c.Params("username"))
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
	req.EmployeeCode = data.NormalizeEmployeeCode(req.EmployeeCode)
	if req.Role != "" {
		roleExists, err := data.RoleExists(req.Role)
		if err != nil {
			return fiber.NewError(fiber.StatusInternalServerError, "cannot validate role")
		}
		if !roleExists {
			return fiber.NewError(fiber.StatusBadRequest, "role is invalid")
		}
	}
	if req.EmployeeCode != "" && !data.IsValidEmployeeCode(req.EmployeeCode) {
		return fiber.NewError(fiber.StatusBadRequest, "employee_code must be in format XXXX-XX-XXXX")
	}

	user, err := data.UpdateUserByUsername(username, req.Name, req.Role, req.Status, req.EmployeeCode)
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
		"user": func() fiber.Map {
			payload, payloadErr := toUserPayload(user)
			if payloadErr != nil {
				return fiber.Map{}
			}
			return payload
		}(),
	})
}

func (h *Handler) ResetUserPasswordByAdmin(c *fiber.Ctx) error {
	username := data.NormalizeUsername(c.Params("username"))
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

	user, err := data.FindUserByUsername(username)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return fiber.NewError(fiber.StatusNotFound, "user not found")
		}
		return fiber.NewError(fiber.StatusNotFound, "user not found")
	}

	if err := data.SetUserPasswordByID(user.ID, req.NewPassword); err != nil {
		return fiber.NewError(fiber.StatusInternalServerError, "cannot reset password")
	}
	if err := data.RevokeAllRefreshTokensByUserID(user.ID); err != nil {
		return fiber.NewError(fiber.StatusInternalServerError, "cannot revoke sessions")
	}

	return c.JSON(fiber.Map{"message": "reset password success"})
}
