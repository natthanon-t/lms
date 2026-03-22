package data

import (
	"database/sql"
	"errors"
	"fmt"
	"strings"

	"golang.org/x/crypto/bcrypt"
)

func CreateUser(name, username, employeeCode, password, role, status string) (AuthUser, error) {
	hashed, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	if err != nil {
		return AuthUser{}, err
	}

	normalizedUsername := NormalizeUsername(username)
	normalizedEmployeeCode := NormalizeEmployeeCode(employeeCode)
	normalizedRole := NormalizeRoleName(role)
	var user AuthUser
	err = db.QueryRow(
		`INSERT INTO users (name, username, employee_code, password_hash, role_code, status)
		 VALUES ($1, $2, $3, $4, $5, $6)
		 RETURNING id, name, username, employee_code, role_code, status, created_at`,
		name,
		normalizedUsername,
		normalizedEmployeeCode,
		string(hashed),
		normalizedRole,
		status,
	).Scan(&user.ID, &user.Name, &user.Username, &user.EmployeeCode, &user.Role, &user.Status, &user.CreatedAt)
	return user, err
}

func FindUserByUsername(username string) (AuthUserRecord, error) {
	var user AuthUserRecord
	err := db.QueryRow(
		`SELECT id, name, username, employee_code, password_hash, role_code, status, created_at
		 FROM users
		 WHERE username = $1`,
		NormalizeUsername(username),
	).Scan(&user.ID, &user.Name, &user.Username, &user.EmployeeCode, &user.PasswordHash, &user.Role, &user.Status, &user.CreatedAt)
	return user, err
}

func EnsureDefaultAdminUser(name, username, password string) error {
	normalizedUsername := NormalizeUsername(username)
	if normalizedUsername == "" || strings.TrimSpace(password) == "" {
		return errors.New("APP_ADMIN_USERNAME and APP_ADMIN_PASSWORD are required")
	}

	if err := EnsurePermissionCatalog(); err != nil {
		return err
	}

	var existingID int64
	err := db.QueryRow(`SELECT id FROM users WHERE username = $1`, normalizedUsername).Scan(&existingID)
	if err == nil {
		return EnsureDefaultAdminPermissions()
	}
	if !errors.Is(err, sql.ErrNoRows) {
		return err
	}

	_, err = CreateUser(strings.TrimSpace(name), normalizedUsername, "", password, "admin", "active")
	if err != nil {
		return err
	}
	return EnsureDefaultAdminPermissions()
}

func FindUserByID(id int64) (AuthUserRecord, error) {
	var user AuthUserRecord
	err := db.QueryRow(
		`SELECT id, name, username, employee_code, password_hash, role_code, status, created_at
		 FROM users
		 WHERE id = $1`,
		id,
	).Scan(&user.ID, &user.Name, &user.Username, &user.EmployeeCode, &user.PasswordHash, &user.Role, &user.Status, &user.CreatedAt)
	return user, err
}

func ListUsers(limit, offset int) ([]AuthUser, int, error) {
	var total int
	if err := db.QueryRow(`SELECT COUNT(*) FROM users`).Scan(&total); err != nil {
		return nil, 0, err
	}

	rows, err := db.Query(`
SELECT id, name, username, employee_code, role_code, status, created_at
FROM users
ORDER BY created_at DESC
LIMIT $1 OFFSET $2`, limit, offset)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()

	result := make([]AuthUser, 0)
	for rows.Next() {
		var user AuthUser
		if err := rows.Scan(&user.ID, &user.Name, &user.Username, &user.EmployeeCode, &user.Role, &user.Status, &user.CreatedAt); err != nil {
			return nil, 0, err
		}
		result = append(result, user)
	}
	return result, total, rows.Err()
}

func UpdateUserName(userID int64, name string) (AuthUserRecord, error) {
	var user AuthUserRecord
	err := db.QueryRow(
		`UPDATE users
		 SET name = $2
		 WHERE id = $1
		 RETURNING id, name, username, employee_code, password_hash, role_code, status, created_at`,
		userID,
		strings.TrimSpace(name),
	).Scan(&user.ID, &user.Name, &user.Username, &user.EmployeeCode, &user.PasswordHash, &user.Role, &user.Status, &user.CreatedAt)
	return user, err
}

func UpdateUserByUsername(username, name, role, status, employeeCode string) (AuthUserRecord, error) {
	target, err := FindUserByUsername(username)
	if err != nil {
		return AuthUserRecord{}, err
	}

	nextName := target.Name
	if strings.TrimSpace(name) != "" {
		nextName = strings.TrimSpace(name)
	}

	nextRole := target.Role
	if strings.TrimSpace(role) != "" {
		nextRole = NormalizeRoleName(role)
	}

	nextStatus := strings.ToLower(strings.TrimSpace(status))
	if nextStatus == "" {
		nextStatus = strings.ToLower(strings.TrimSpace(target.Status))
	}
	if nextStatus != "active" && nextStatus != "inactive" {
		return AuthUserRecord{}, fmt.Errorf("invalid status")
	}

	nextEmployeeCode := target.EmployeeCode
	normalizedEmployeeCode := NormalizeEmployeeCode(employeeCode)
	if normalizedEmployeeCode != "" {
		nextEmployeeCode = normalizedEmployeeCode
	}

	var updated AuthUserRecord
	err = db.QueryRow(
		`UPDATE users
		 SET name = $2, role_code = $3, status = $4, employee_code = $5
		 WHERE username = $1
		 RETURNING id, name, username, employee_code, password_hash, role_code, status, created_at`,
		NormalizeUsername(username),
		nextName,
		nextRole,
		nextStatus,
		nextEmployeeCode,
	).Scan(&updated.ID, &updated.Name, &updated.Username, &updated.EmployeeCode, &updated.PasswordHash, &updated.Role, &updated.Status, &updated.CreatedAt)
	return updated, err
}

func VerifyUserPassword(userID int64, rawPassword string) (bool, error) {
	var passwordHash string
	err := db.QueryRow(`SELECT password_hash FROM users WHERE id = $1`, userID).Scan(&passwordHash)
	if err != nil {
		return false, err
	}
	return bcrypt.CompareHashAndPassword([]byte(passwordHash), []byte(rawPassword)) == nil, nil
}

func SetUserPasswordByID(userID int64, password string) error {
	hashed, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	if err != nil {
		return err
	}
	_, err = db.Exec(`UPDATE users SET password_hash = $2 WHERE id = $1`, userID, string(hashed))
	return err
}

func RecordLoginLog(userID int64) error {
	_, err := db.Exec(`INSERT INTO user_login_logs (user_id) VALUES ($1)`, userID)
	return err
}

func GetLoginDatesByUserID(userID int64) ([]string, error) {
	rows, err := db.Query(
		`SELECT DISTINCT TO_CHAR(logged_in_at AT TIME ZONE 'Asia/Bangkok', 'YYYY-MM-DD')
		 FROM user_login_logs
		 WHERE user_id = $1
		 ORDER BY 1`,
		userID,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	dates := make([]string, 0)
	for rows.Next() {
		var d string
		if err := rows.Scan(&d); err != nil {
			return nil, err
		}
		dates = append(dates, d)
	}
	return dates, rows.Err()
}

