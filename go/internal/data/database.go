package data

import (
	"database/sql"
	"errors"
	"regexp"
	"strings"
	"time"

	"github.com/jackc/pgx/v5/pgconn"
	_ "github.com/jackc/pgx/v5/stdlib"
)

var db *sql.DB
var employeeCodePattern = regexp.MustCompile(`^[A-Z0-9]{4}-[A-Z0-9]{2}-[A-Z0-9]{4}$`)

var ErrForbidden = errors.New("forbidden")

// IsDuplicateKey returns true when err is a PostgreSQL unique-constraint violation (code 23505).
func IsDuplicateKey(err error) bool {
	var pgErr *pgconn.PgError
	return errors.As(err, &pgErr) && pgErr.Code == "23505"
}

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

func Close() error {
	if db == nil {
		return nil
	}
	return db.Close()
}
