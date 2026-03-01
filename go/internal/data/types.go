package data

import "time"

type SkillReward struct {
	Skill  string `json:"skill"`
	Points int    `json:"points"`
}

type Course struct {
	ID                      string        `json:"id"`
	Title                   string        `json:"title"`
	Creator                 string        `json:"creator"`
	OwnerUsername           string        `json:"ownerUsername"`
	Status                  string        `json:"status"`
	Description             string        `json:"description"`
	Image                   string        `json:"image"`
	Content                 string        `json:"content"`
	SkillPoints             int           `json:"skillPoints"`
	SubtopicCompletionScore int           `json:"subtopicCompletionScore"`
	CourseCompletionScore   int           `json:"courseCompletionScore"`
	CreatedAt               time.Time     `json:"createdAt"`
	SkillRewards            []SkillReward `json:"skillRewards"`
}

type AnswerProgress struct {
	TypedAnswer string `json:"typedAnswer"`
	IsCorrect   bool   `json:"isCorrect"`
}

type CourseProgress struct {
	CompletedSubtopics map[string]bool                       `json:"completedSubtopics"`
	Answers            map[string]map[string]AnswerProgress  `json:"answers"`
}

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
