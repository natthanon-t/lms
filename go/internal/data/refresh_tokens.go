package data

import "time"

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

// RotateRefreshToken atomically revokes the current token and creates a new one.
func RotateRefreshToken(currentHash string, userID int64, newHash string, newExpiresAt time.Time) error {
	tx, err := db.Begin()
	if err != nil {
		return err
	}
	defer tx.Rollback()

	if _, err := tx.Exec(
		`UPDATE refresh_tokens SET revoked_at = NOW() WHERE token_hash = $1 AND revoked_at IS NULL`,
		currentHash,
	); err != nil {
		return err
	}

	if _, err := tx.Exec(
		`INSERT INTO refresh_tokens (user_id, token_hash, expires_at) VALUES ($1, $2, $3)`,
		userID, newHash, newExpiresAt,
	); err != nil {
		return err
	}

	return tx.Commit()
}
