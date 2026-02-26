package main

import (
	"database/sql"
	"errors"
	"strings"
	"time"

	_ "github.com/jackc/pgx/v5/stdlib"
	"golang.org/x/crypto/bcrypt"
)

var db *sql.DB

func connectPostgres(databaseURL string) error {
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

func ensureAuthSchema() error {
	_, err := db.Exec(`
CREATE TABLE IF NOT EXISTS users (
  id BIGSERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'user',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);`)
	if err != nil {
		return err
	}
	_, err = db.Exec(`
CREATE TABLE IF NOT EXISTS refresh_tokens (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  revoked_at TIMESTAMPTZ NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);`)
	return err
}

func normalizeUsername(username string) string {
	return strings.ToLower(strings.TrimSpace(username))
}

func createUser(name, username, password, role string) (AuthUser, error) {
	hashed, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	if err != nil {
		return AuthUser{}, err
	}

	normalizedUsername := normalizeUsername(username)
	var user AuthUser
	err = db.QueryRow(
		`INSERT INTO users (name, email, password_hash, role)
		 VALUES ($1, $2, $3, $4)
		 RETURNING id, name, email, role, created_at`,
		name,
		normalizedUsername,
		string(hashed),
		role,
	).Scan(&user.ID, &user.Name, &user.Username, &user.Role, &user.CreatedAt)
	return user, err
}

func findUserByUsername(username string) (AuthUserRecord, error) {
	var user AuthUserRecord
	err := db.QueryRow(
		`SELECT id, name, email, password_hash, role, created_at
		 FROM users
		 WHERE email = $1`,
		normalizeUsername(username),
	).Scan(&user.ID, &user.Name, &user.Username, &user.PasswordHash, &user.Role, &user.CreatedAt)
	return user, err
}

func ensureDefaultAdminUser(name, username, password string) error {
	normalizedUsername := normalizeUsername(username)
	if normalizedUsername == "" || strings.TrimSpace(password) == "" {
		return errors.New("APP_ADMIN_USERNAME and APP_ADMIN_PASSWORD are required")
	}

	var existingID int64
	err := db.QueryRow(`SELECT id FROM users WHERE email = $1`, normalizedUsername).Scan(&existingID)
	if err == nil {
		return nil
	}
	if !errors.Is(err, sql.ErrNoRows) {
		return err
	}

	_, err = createUser(strings.TrimSpace(name), normalizedUsername, password, "admin")
	return err
}

func findUserByID(id int64) (AuthUserRecord, error) {
	var user AuthUserRecord
	err := db.QueryRow(
		`SELECT id, name, email, password_hash, role, created_at
		 FROM users
		 WHERE id = $1`,
		id,
	).Scan(&user.ID, &user.Name, &user.Username, &user.PasswordHash, &user.Role, &user.CreatedAt)
	return user, err
}

func createRefreshToken(userID int64, tokenHash string, expiresAt time.Time) error {
	_, err := db.Exec(
		`INSERT INTO refresh_tokens (user_id, token_hash, expires_at)
		 VALUES ($1, $2, $3)`,
		userID,
		tokenHash,
		expiresAt,
	)
	return err
}

func getActiveRefreshTokenUser(tokenHash string) (int64, error) {
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

func revokeRefreshToken(tokenHash string) error {
	_, err := db.Exec(
		`UPDATE refresh_tokens
		 SET revoked_at = NOW()
		 WHERE token_hash = $1
		   AND revoked_at IS NULL`,
		tokenHash,
	)
	return err
}
