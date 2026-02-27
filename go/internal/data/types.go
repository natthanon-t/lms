package data

import "time"

type AuthUser struct {
	ID           int64     `json:"id"`
	Name         string    `json:"name"`
	Username     string    `json:"username"`
	EmployeeCode string    `json:"employee_code"`
	Role         string    `json:"role"`
	Status       string    `json:"status"`
	CreatedAt    time.Time `json:"created_at"`
}

type AuthUserRecord struct {
	ID           int64
	Name         string
	Username     string
	EmployeeCode string
	PasswordHash string
	Role         string
	Status       string
	CreatedAt    time.Time
}
