package data

import (
	"database/sql"
	"strings"
)

const defaultResetPasswordSettingKey = "default_reset_password"

func EnsureAppSettings(defaultResetPassword string) error {
	if _, err := db.Exec(`
CREATE TABLE IF NOT EXISTS app_settings (
	key TEXT PRIMARY KEY,
	value TEXT NOT NULL DEFAULT '',
	updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
)`); err != nil {
		return err
	}

	trimmed := strings.TrimSpace(defaultResetPassword)
	if trimmed == "" {
		return nil
	}

	_, err := db.Exec(
		`INSERT INTO app_settings (key, value)
		 VALUES ($1, $2)
		 ON CONFLICT (key) DO NOTHING`,
		defaultResetPasswordSettingKey,
		trimmed,
	)
	return err
}

func GetDefaultResetPassword(fallback string) (string, error) {
	var value string
	err := db.QueryRow(`SELECT value FROM app_settings WHERE key = $1`, defaultResetPasswordSettingKey).Scan(&value)
	if err != nil {
		if err == sql.ErrNoRows {
			return strings.TrimSpace(fallback), nil
		}
		return "", err
	}
	trimmed := strings.TrimSpace(value)
	if trimmed == "" {
		return strings.TrimSpace(fallback), nil
	}
	return trimmed, nil
}

func SetDefaultResetPassword(value string) error {
	trimmed := strings.TrimSpace(value)
	_, err := db.Exec(
		`INSERT INTO app_settings (key, value, updated_at)
		 VALUES ($1, $2, NOW())
		 ON CONFLICT (key) DO UPDATE
		 SET value = EXCLUDED.value,
		     updated_at = NOW()`,
		defaultResetPasswordSettingKey,
		trimmed,
	)
	return err
}
