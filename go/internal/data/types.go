package data

import "time"

type AuthUser struct {
	ID        int64     `json:"id"`
	Name      string    `json:"name"`
	Username  string    `json:"username"`
	Role      string    `json:"role"`
	Status    string    `json:"status"`
	CreatedAt time.Time `json:"created_at"`
}

type AuthUserRecord struct {
	ID           int64
	Name         string
	Username     string
	PasswordHash string
	Role         string
	Status       string
	CreatedAt    time.Time
}
