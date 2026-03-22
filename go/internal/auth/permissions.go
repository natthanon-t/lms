package auth

import (
	"backend/internal/data"

	"github.com/gofiber/fiber/v2"
)

const (
	PermissionContentLearn   = "content.learn"
	PermissionContentManage  = "content.manage"
	PermissionContentViewAll = "content.view_all"

	PermissionExamTake    = "exam.take"
	PermissionExamManage  = "exam.manage"
	PermissionExamViewAll = "exam.view_all"

	PermissionSystemReport      = "system.report.view"
	PermissionSystemExamHistory = "system.exam_history.view"

	PermissionUserManage            = "management.users.manage"
	PermissionRoleManage            = "management.roles.manage"
	PermissionManagementExamHistory = "management.exam_history.view"
)

func normalizeRole(role string) string {
	return data.NormalizeRoleName(role)
}

func PermissionsForRole(role string) ([]string, error) {
	return data.GetPermissionsByRole(normalizeRole(role))
}

func PermissionCatalog() ([]data.Permission, error) {
	return data.ListPermissions()
}

func RolePermissionsMap() (map[string][]string, error) {
	return data.GetRolePermissionsMap()
}

func RequireAnyPermission(permissions ...string) fiber.Handler {
	return func(c *fiber.Ctx) error {
		role := currentUserRole(c)
		grantedPermissions, err := data.GetPermissionsByRole(role)
		if err != nil {
			return fiber.NewError(fiber.StatusInternalServerError, "cannot load permissions")
		}
		for _, requiredPermission := range permissions {
			for _, grantedPermission := range grantedPermissions {
				if grantedPermission == requiredPermission {
					return c.Next()
				}
			}
		}
		return fiber.NewError(fiber.StatusForbidden, "insufficient permissions")
	}
}
