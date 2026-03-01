package data

import (
	"database/sql"
	"errors"
	"fmt"
	"regexp"
	"strings"
	"time"

	_ "github.com/jackc/pgx/v5/stdlib"
	"golang.org/x/crypto/bcrypt"
)

var db *sql.DB
var employeeCodePattern = regexp.MustCompile(`^2026-[A-Z0-9]{2}-[0-9]{4}$`)

func ConnectPostgres(databaseURL string) error {
	if strings.TrimSpace(databaseURL) == "" {
		return errors.New("DATABASE_URL is required")
	}

	conn, err := sql.Open("pgx", databaseURL)
	if err != nil {
		return err
	}
	conn.SetConnMaxLifetime(15 * time.Minute)
	conn.SetMaxOpenConns(15)
	conn.SetMaxIdleConns(5)

	if err := conn.Ping(); err != nil {
		_ = conn.Close()
		return err
	}

	db = conn
	return nil
}


func NormalizeUsername(username string) string {
	return strings.ToLower(strings.TrimSpace(username))
}

func NormalizeEmployeeCode(employeeCode string) string {
	return strings.ToUpper(strings.TrimSpace(employeeCode))
}

func IsValidEmployeeCode(employeeCode string) bool {
	return employeeCodePattern.MatchString(NormalizeEmployeeCode(employeeCode))
}

func CreateUser(name, username, employeeCode, password, role, status string) (AuthUser, error) {
	hashed, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	if err != nil {
		return AuthUser{}, err
	}

	normalizedUsername := NormalizeUsername(username)
	normalizedEmployeeCode := NormalizeEmployeeCode(employeeCode)
	var user AuthUser
	err = db.QueryRow(
		`INSERT INTO users (name, username, employee_code, password_hash, role, status)
		 VALUES ($1, $2, $3, $4, $5, $6)
		 RETURNING id, name, username, employee_code, role, status, created_at`,
		name,
		normalizedUsername,
		normalizedEmployeeCode,
		string(hashed),
		role,
		status,
	).Scan(&user.ID, &user.Name, &user.Username, &user.EmployeeCode, &user.Role, &user.Status, &user.CreatedAt)
	return user, err
}

func FindUserByUsername(username string) (AuthUserRecord, error) {
	var user AuthUserRecord
	err := db.QueryRow(
		`SELECT id, name, username, employee_code, password_hash, role, status, created_at
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

	var existingID int64
	err := db.QueryRow(`SELECT id FROM users WHERE username = $1`, normalizedUsername).Scan(&existingID)
	if err == nil {
		return nil
	}
	if !errors.Is(err, sql.ErrNoRows) {
		return err
	}

	_, err = CreateUser(strings.TrimSpace(name), normalizedUsername, "", password, "admin", "active")
	return err
}

func FindUserByID(id int64) (AuthUserRecord, error) {
	var user AuthUserRecord
	err := db.QueryRow(
		`SELECT id, name, username, employee_code, password_hash, role, status, created_at
		 FROM users
		 WHERE id = $1`,
		id,
	).Scan(&user.ID, &user.Name, &user.Username, &user.EmployeeCode, &user.PasswordHash, &user.Role, &user.Status, &user.CreatedAt)
	return user, err
}

func ListUsers() ([]AuthUser, error) {
	rows, err := db.Query(`
SELECT id, name, username, employee_code, role, status, created_at
FROM users
ORDER BY created_at DESC`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	result := make([]AuthUser, 0)
	for rows.Next() {
		var user AuthUser
		if err := rows.Scan(&user.ID, &user.Name, &user.Username, &user.EmployeeCode, &user.Role, &user.Status, &user.CreatedAt); err != nil {
			return nil, err
		}
		result = append(result, user)
	}
	return result, rows.Err()
}

func UpdateUserName(userID int64, name string) (AuthUserRecord, error) {
	var user AuthUserRecord
	err := db.QueryRow(
		`UPDATE users
		 SET name = $2
		 WHERE id = $1
		 RETURNING id, name, username, employee_code, password_hash, role, status, created_at`,
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
		nextRole = strings.TrimSpace(role)
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
		 SET name = $2, role = $3, status = $4, employee_code = $5
		 WHERE username = $1
		 RETURNING id, name, username, employee_code, password_hash, role, status, created_at`,
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

func CreateRefreshToken(userID int64, tokenHash string, expiresAt time.Time) error {
	_, err := db.Exec(
		`INSERT INTO refresh_tokens (user_id, token_hash, expires_at)
		 VALUES ($1, $2, $3)`,
		userID,
		tokenHash,
		expiresAt,
	)
	return err
}

func RevokeAllRefreshTokensByUserID(userID int64) error {
	_, err := db.Exec(
		`UPDATE refresh_tokens
		 SET revoked_at = NOW()
		 WHERE user_id = $1
		   AND revoked_at IS NULL`,
		userID,
	)
	return err
}

func GetActiveRefreshTokenUser(tokenHash string) (int64, error) {
	var userID int64
	err := db.QueryRow(
		`SELECT user_id
		 FROM refresh_tokens
		 WHERE token_hash = $1
		   AND revoked_at IS NULL
		   AND expires_at > NOW()`,
		tokenHash,
	).Scan(&userID)
	return userID, err
}

func RevokeRefreshToken(tokenHash string) error {
	_, err := db.Exec(
		`UPDATE refresh_tokens
		 SET revoked_at = NOW()
		 WHERE token_hash = $1
		   AND revoked_at IS NULL`,
		tokenHash,
	)
	return err
}

func Close() error {
	if db == nil {
		return nil
	}
	return db.Close()
}
