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
		"roles":              roles,
		"default_role":       "user",
		"permission_catalog": permissionCatalog,
		"role_permissions":   rolePermissions,
	})
}

func (h *Handler) UserOptions(c *fiber.Ctx) error {
	roles, err := data.ListRoles()
	if err != nil {
		return fiber.NewError(fiber.StatusInternalServerError, "cannot load roles")
	}
	defaultResetPassword, err := data.GetDefaultResetPassword(h.cfg.DefaultResetPassword)
	if err != nil {
		return fiber.NewError(fiber.StatusInternalServerError, "cannot load default reset password")
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
		"default_password":   defaultResetPassword,
		"permission_catalog": permissionCatalog,
		"role_permissions":   rolePermissions,
	})
}

func (h *Handler) GetDefaultResetPassword(c *fiber.Ctx) error {
	defaultResetPassword, err := data.GetDefaultResetPassword(h.cfg.DefaultResetPassword)
	if err != nil {
		return fiber.NewError(fiber.StatusInternalServerError, "cannot load default reset password")
	}
	return c.JSON(fiber.Map{
		"default_password": defaultResetPassword,
	})
}

func (h *Handler) UpdateDefaultResetPassword(c *fiber.Ctx) error {
	var req adminDefaultResetPasswordRequest
	if err := c.BodyParser(&req); err != nil {
		return fiber.NewError(fiber.StatusBadRequest, "invalid request body")
	}
	req.DefaultPassword = strings.TrimSpace(req.DefaultPassword)
	if len(req.DefaultPassword) < 8 {
		return fiber.NewError(fiber.StatusBadRequest, "default_password must be at least 8 characters")
	}
	if err := data.SetDefaultResetPassword(req.DefaultPassword); err != nil {
		return fiber.NewError(fiber.StatusInternalServerError, "cannot update default reset password")
	}
	return c.JSON(fiber.Map{
		"message":          "default reset password updated",
		"default_password": req.DefaultPassword,
	})
}

func (h *Handler) CreateRole(c *fiber.Ctx) error {
	var req createRoleRequest
	if err := c.BodyParser(&req); err != nil {
		return fiber.NewError(fiber.StatusBadRequest, "invalid request body")
	}

	req.Code = data.NormalizeRoleName(req.Code)
	req.Name = strings.TrimSpace(req.Name)
	if req.Code == "" || req.Name == "" {
		return fiber.NewError(fiber.StatusBadRequest, "role code and name are required")
	}
	if data.IsBuiltInRole(req.Code) {
		return fiber.NewError(fiber.StatusConflict, "role code is reserved")
	}

	role, err := data.CreateRole(req.Code, req.Name)
	if err != nil {
		if data.IsDuplicateKey(err) {
			return fiber.NewError(fiber.StatusConflict, "role code already exists")
		}
		return fiber.NewError(fiber.StatusInternalServerError, "cannot create role")
	}

	return c.Status(fiber.StatusCreated).JSON(fiber.Map{
		"message": "create role success",
		"role":    role,
	})
}

func (h *Handler) UpdateRole(c *fiber.Ctx) error {
	roleCode := data.NormalizeRoleName(c.Params("code"))
	if roleCode == "" {
		return fiber.NewError(fiber.StatusBadRequest, "role code is required")
	}
	if data.IsBuiltInRole(roleCode) {
		return fiber.NewError(fiber.StatusForbidden, "cannot rename a built-in role")
	}
	exists, err := data.RoleExists(roleCode)
	if err != nil {
		return fiber.NewError(fiber.StatusInternalServerError, "cannot validate role")
	}
	if !exists {
		return fiber.NewError(fiber.StatusNotFound, "role not found")
	}

	var req updateRoleRequest
	if err := c.BodyParser(&req); err != nil {
		return fiber.NewError(fiber.StatusBadRequest, "invalid request body")
	}
	req.Name = strings.TrimSpace(req.Name)
	if req.Name == "" {
		return fiber.NewError(fiber.StatusBadRequest, "role name is required")
	}

	role, err := data.UpdateRoleName(roleCode, req.Name)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return fiber.NewError(fiber.StatusNotFound, "role not found")
		}
		return fiber.NewError(fiber.StatusInternalServerError, "cannot update role")
	}

	return c.JSON(fiber.Map{
		"message": "update role success",
		"role":    role,
	})
}

func (h *Handler) DeleteRole(c *fiber.Ctx) error {
	roleCode := data.NormalizeRoleName(c.Params("code"))
	if roleCode == "" {
		return fiber.NewError(fiber.StatusBadRequest, "role code is required")
	}
	if data.IsBuiltInRole(roleCode) {
		return fiber.NewError(fiber.StatusForbidden, "cannot delete a built-in role")
	}
	exists, err := data.RoleExists(roleCode)
	if err != nil {
		return fiber.NewError(fiber.StatusInternalServerError, "cannot validate role")
	}
	if !exists {
		return fiber.NewError(fiber.StatusNotFound, "role not found")
	}

	err = data.DeleteRole(roleCode)
	if err != nil {
		if errors.Is(err, data.ErrRoleAssignedToUsers) {
			return fiber.NewError(fiber.StatusConflict, "cannot delete role while users are assigned")
		}
		return fiber.NewError(fiber.StatusInternalServerError, "cannot delete role")
	}

	return c.JSON(fiber.Map{
		"message": "delete role success",
		"role":    roleCode,
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
	// Prevent creating users with admin role
	if strings.ToLower(req.Role) == "admin" {
		return fiber.NewError(fiber.StatusForbidden, "cannot create user with admin role")
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

	callerUsername, err := auth.CurrentUsername(c)
	if err != nil {
		return fiber.NewError(fiber.StatusUnauthorized, "cannot identify caller")
	}

	targetUser, err := data.FindUserByUsername(username)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return fiber.NewError(fiber.StatusNotFound, "user not found")
		}
		return fiber.NewError(fiber.StatusInternalServerError, "cannot find user")
	}

	isSelf := callerUsername == username
	targetIsAdmin := strings.ToLower(strings.TrimSpace(targetUser.Role)) == "admin"

	// Cannot modify other admin accounts
	if targetIsAdmin && !isSelf {
		return fiber.NewError(fiber.StatusForbidden, "cannot modify other admin accounts")
	}

	var req adminUpdateUserRequest
	if err := c.BodyParser(&req); err != nil {
		return fiber.NewError(fiber.StatusBadRequest, "invalid request body")
	}
	req.Role = strings.TrimSpace(req.Role)
	req.Status = strings.ToLower(strings.TrimSpace(req.Status))
	req.Name = strings.TrimSpace(req.Name)
	req.EmployeeCode = data.NormalizeEmployeeCode(req.EmployeeCode)

	// Self-edit: only name is allowed
	if isSelf {
		req.Role = ""
		req.Status = ""
		req.EmployeeCode = ""
	}

	// Prevent assigning admin role to anyone
	if strings.ToLower(req.Role) == "admin" {
		return fiber.NewError(fiber.StatusForbidden, "cannot assign admin role")
	}

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

	userPayload, err := toUserPayload(user)
	if err != nil {
		return fiber.NewError(fiber.StatusInternalServerError, "cannot load user permissions")
	}
	return c.JSON(fiber.Map{
		"message": "update user success",
		"user":    userPayload,
	})
}

func (h *Handler) UpdateRolePermissions(c *fiber.Ctx) error {
	roleCode := data.NormalizeRoleName(c.Params("code"))
	if roleCode == "" {
		return fiber.NewError(fiber.StatusBadRequest, "role code is required")
	}
	if data.IsDefaultRole(roleCode) {
		return fiber.NewError(fiber.StatusForbidden, "cannot modify permissions of a default role")
	}
	exists, err := data.RoleExists(roleCode)
	if err != nil {
		return fiber.NewError(fiber.StatusInternalServerError, "cannot validate role")
	}
	if !exists {
		return fiber.NewError(fiber.StatusNotFound, "role not found")
	}

	var req updateRolePermissionsRequest
	if err := c.BodyParser(&req); err != nil {
		return fiber.NewError(fiber.StatusBadRequest, "invalid request body")
	}
	if req.Permissions == nil {
		req.Permissions = []string{}
	}

	if err := data.SetRolePermissions(roleCode, req.Permissions); err != nil {
		return fiber.NewError(fiber.StatusInternalServerError, "cannot update permissions")
	}
	return c.JSON(fiber.Map{
		"message": "permissions updated",
		"role":    roleCode,
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
