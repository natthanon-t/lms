package data

import (
	"database/sql"
	"sort"
	"strings"
)

type Permission struct {
	Code        string `json:"code"`
	Module      string `json:"module"`
	Action      string `json:"action"`
	Description string `json:"description"`
}

type Role struct {
	Code        string `json:"code"`
	Name        string `json:"name"`
	Description string `json:"description"`
}

type AllowedMenuItem struct {
	Key         string `json:"key"`
	Section     string `json:"section"`
	Label       string `json:"label"`
	Permission  string `json:"permission"`
}

var defaultPermissions = []Permission{
	{Code: "content.learn", Module: "content", Action: "learn", Description: "เรียนเนื้อหา"},
	{Code: "content.manage", Module: "content", Action: "manage", Description: "สร้าง / แก้ไขเนื้อหา"},
	{Code: "exam.take", Module: "exam", Action: "take", Description: "เข้าทำข้อสอบ"},
	{Code: "exam.manage", Module: "exam", Action: "manage", Description: "สร้าง / แก้ไขข้อสอบ"},
	{Code: "system.report.view", Module: "system", Action: "report.view", Description: "ดูรายงานสรุปผล"},
	{Code: "system.exam_history.view", Module: "system", Action: "exam_history.view", Description: "ดูประวัติการสอบของตัวเอง"},
	{Code: "management.users.manage", Module: "management", Action: "users.manage", Description: "จัดการผู้ใช้"},
	{Code: "management.exam_history.view", Module: "management", Action: "exam_history.view", Description: "ดูประวัติการสอบของทุกคน"},
}

var defaultRoles = []Role{
	{Code: "instructor", Name: "ผู้สอน", Description: "ผู้สอนและผู้ดูแลเนื้อหา/ข้อสอบ"},
	{Code: "admin", Name: "ผู้ดูแลระบบ", Description: "ผู้ดูแลระบบทั้งหมด"},
	{Code: "user", Name: "ผู้ใช้งาน", Description: "ผู้ใช้งานทั่วไป"},
}

var sidebarPermissionItems = []AllowedMenuItem{
	{Key: "content.learn", Section: "content", Label: "เรียนเนื้อหา", Permission: "content.learn"},
	{Key: "content.manage", Section: "content", Label: "สร้าง / แก้ไขเนื้อหา", Permission: "content.manage"},
	{Key: "exam.take", Section: "exam", Label: "เข้าทำข้อสอบ", Permission: "exam.take"},
	{Key: "exam.manage", Section: "exam", Label: "สร้าง / แก้ไขข้อสอบ", Permission: "exam.manage"},
	{Key: "system.report", Section: "system", Label: "ดูรายงานสรุปผล", Permission: "system.report.view"},
	{Key: "system.exam_history", Section: "system", Label: "ประวัติการสอบของฉัน", Permission: "system.exam_history.view"},
	{Key: "management.users", Section: "management", Label: "จัดการผู้ใช้", Permission: "management.users.manage"},
	{Key: "management.exam_history", Section: "management", Label: "ประวัติการสอบทุกคน", Permission: "management.exam_history.view"},
}

var defaultRolePermissions = map[string][]string{
	"user": {
		"content.learn",
		"exam.take",
		"system.exam_history.view",
	},
	"instructor": {
		"content.learn",
		"content.manage",
		"exam.take",
		"exam.manage",
		"system.report.view",
		"system.exam_history.view",
	},
	"admin": {
		"content.learn",
		"content.manage",
		"exam.take",
		"exam.manage",
		"system.report.view",
		"system.exam_history.view",
		"management.users.manage",
		"management.exam_history.view",
	},
}

func NormalizeRoleName(role string) string {
	switch strings.TrimSpace(strings.ToLower(role)) {
	case "admin", "ผู้ดูแลระบบ":
		return "admin"
	case "instructor", "ผู้สอน":
		return "instructor"
	case "user", "ผู้ใช้งาน":
		return "user"
	default:
		return strings.TrimSpace(strings.ToLower(role))
	}
}

// IsDefaultRole returns true if the role is a built-in protected role
// whose permissions cannot be modified.
// Only "admin" is fully locked; "user" is a default role but its permissions are editable.
func IsDefaultRole(code string) bool {
	return NormalizeRoleName(code) == "admin"
}

func GetPermissionsByRole(role string) ([]string, error) {
	rows, err := db.Query(
		`SELECT permission_code
		 FROM role_permissions
		 WHERE role_code = $1
		 ORDER BY permission_code`,
		NormalizeRoleName(role),
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	permissions := make([]string, 0)
	for rows.Next() {
		var code string
		if err := rows.Scan(&code); err != nil {
			return nil, err
		}
		permissions = append(permissions, code)
	}
	return permissions, rows.Err()
}

func PermissionsForUser(userID int64) ([]string, error) {
	user, err := FindUserByID(userID)
	if err != nil {
		return nil, err
	}
	return GetPermissionsByRole(user.Role)
}

func EnsureDefaultRoles() error {
	for _, role := range defaultRoles {
		_, err := db.Exec(
			`INSERT INTO roles (code, name, description)
			 VALUES ($1, $2, $3)
			 ON CONFLICT (code) DO UPDATE
			 SET name = EXCLUDED.name,
			     description = EXCLUDED.description`,
			role.Code,
			role.Name,
			role.Description,
		)
		if err != nil {
			return err
		}
	}
	return nil
}

func ListRoles() ([]Role, error) {
	rows, err := db.Query(
		`SELECT code, name, description
		 FROM roles
		 ORDER BY CASE code
		   WHEN 'admin'      THEN 1
		   WHEN 'user'       THEN 2
		   WHEN 'instructor' THEN 3
		   ELSE 4
		 END, code`,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	roles := make([]Role, 0)
	for rows.Next() {
		var role Role
		if err := rows.Scan(&role.Code, &role.Name, &role.Description); err != nil {
			return nil, err
		}
		roles = append(roles, role)
	}
	return roles, rows.Err()
}

func RoleExists(role string) (bool, error) {
	var exists bool
	err := db.QueryRow(
		`SELECT EXISTS(SELECT 1 FROM roles WHERE code = $1)`,
		NormalizeRoleName(role),
	).Scan(&exists)
	return exists, err
}

func EnsurePermissionCatalog() error {
	if err := EnsureDefaultRoles(); err != nil {
		return err
	}
	if _, err := db.Exec(`UPDATE users SET role_code = 'instructor' WHERE role_code = 'teacher'`); err != nil {
		return err
	}
	if _, err := db.Exec(
		`INSERT INTO role_permissions (role_code, permission_code)
		 SELECT 'instructor', permission_code
		 FROM role_permissions
		 WHERE role_code = 'teacher'
		 ON CONFLICT (role_code, permission_code) DO NOTHING`,
	); err != nil {
		return err
	}
	if _, err := db.Exec(`DELETE FROM role_permissions WHERE role_code = 'teacher'`); err != nil {
		return err
	}
	if _, err := db.Exec(`DELETE FROM roles WHERE code = 'teacher'`); err != nil {
		return err
	}
	if _, err := db.Exec(`DELETE FROM role_permissions WHERE permission_code = 'system.leaderboard.view'`); err != nil {
		return err
	}
	if _, err := db.Exec(`DELETE FROM permissions WHERE code = 'system.leaderboard.view'`); err != nil {
		return err
	}
	for _, permission := range defaultPermissions {
		_, err := db.Exec(
			`INSERT INTO permissions (code, module, action, description)
			 VALUES ($1, $2, $3, $4)
			 ON CONFLICT (code) DO UPDATE
			 SET module = EXCLUDED.module,
			     action = EXCLUDED.action,
			     description = EXCLUDED.description`,
			permission.Code,
			permission.Module,
			permission.Action,
			permission.Description,
		)
		if err != nil {
			return err
		}
	}
	for role, permissions := range defaultRolePermissions {
		if err := EnsureRolePermissions(role, permissions); err != nil {
			return err
		}
	}
	return nil
}

func EnsureRolePermissions(role string, permissions []string) error {
	normalizedRole := NormalizeRoleName(role)
	for _, permission := range permissions {
		_, err := db.Exec(
			`INSERT INTO role_permissions (role_code, permission_code)
			 VALUES ($1, $2)
			 ON CONFLICT (role_code, permission_code) DO NOTHING`,
			normalizedRole,
			permission,
		)
		if err != nil {
			return err
		}
	}
	return nil
}

// SetRolePermissions replaces the full permission set for a role inside a single transaction.
func SetRolePermissions(roleCode string, permissionCodes []string) error {
	normalized := NormalizeRoleName(roleCode)
	tx, err := db.Begin()
	if err != nil {
		return err
	}
	defer func() {
		if err != nil {
			_ = tx.Rollback()
		}
	}()

	if _, err = tx.Exec(`DELETE FROM role_permissions WHERE role_code = $1`, normalized); err != nil {
		return err
	}
	for _, code := range permissionCodes {
		if _, err = tx.Exec(
			`INSERT INTO role_permissions (role_code, permission_code) VALUES ($1, $2)
			 ON CONFLICT (role_code, permission_code) DO NOTHING`,
			normalized, code,
		); err != nil {
			return err
		}
	}
	return tx.Commit()
}

func EnsureDefaultAdminPermissions() error {
	if err := EnsurePermissionCatalog(); err != nil {
		return err
	}
	return nil
}

func ListPermissions() ([]Permission, error) {
	rows, err := db.Query(
		`SELECT code, module, action, description
		 FROM permissions
		 ORDER BY module, action, code`,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	permissions := make([]Permission, 0)
	for rows.Next() {
		var permission Permission
		if err := rows.Scan(&permission.Code, &permission.Module, &permission.Action, &permission.Description); err != nil {
			return nil, err
		}
		permissions = append(permissions, permission)
	}
	return permissions, rows.Err()
}

func GetRolePermissionsMap() (map[string][]string, error) {
	rows, err := db.Query(
		`SELECT role_code, permission_code
		 FROM role_permissions
		 ORDER BY role_code, permission_code`,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	result := make(map[string][]string)
	for rows.Next() {
		var role string
		var permissionCode string
		if err := rows.Scan(&role, &permissionCode); err != nil {
			return nil, err
		}
		role = NormalizeRoleName(role)
		result[role] = append(result[role], permissionCode)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}

	for role := range result {
		sort.Strings(result[role])
	}
	return result, nil
}

func AllowedSidebarItemsForUser(userID int64) ([]AllowedMenuItem, error) {
	permissions, err := PermissionsForUser(userID)
	if err != nil {
		if err == sql.ErrNoRows {
			return []AllowedMenuItem{}, nil
		}
		return nil, err
	}
	granted := make(map[string]bool, len(permissions))
	for _, permission := range permissions {
		granted[permission] = true
	}
	items := make([]AllowedMenuItem, 0)
	for _, item := range sidebarPermissionItems {
		if granted[item.Permission] {
			items = append(items, item)
		}
	}
	return items, nil
}
