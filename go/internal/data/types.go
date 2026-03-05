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

type Exam struct {
	ID                string         `json:"id"`
	Title             string         `json:"title"`
	Creator           string         `json:"creator"`
	OwnerUsername     string         `json:"ownerUsername"`
	Status            string         `json:"status"`
	Description       string         `json:"description"`
	Instructions      string         `json:"instructions"`
	Image             string         `json:"image"`
	NumberOfQuestions int            `json:"numberOfQuestions"`
	DefaultTime       int            `json:"defaultTime"`
	MaxAttempts       int            `json:"maxAttempts"`
	CreatedAt         time.Time      `json:"createdAt"`
	DomainPercentages map[string]int `json:"domainPercentages"`
	Questions         []ExamQuestion `json:"questions"`
}

type ExamQuestion struct {
	ID           string   `json:"id"`
	ExamID       string   `json:"examId"`
	Domain       string   `json:"domain"`
	QuestionType string   `json:"questionType"`
	Question     string   `json:"question"`
	Choices      []string `json:"choices"`
	AnswerKey    string   `json:"answerKey"`
	Explanation  string   `json:"explanation"`
}

type ExamDomainStat struct {
	Correct int `json:"correct"`
	Total   int `json:"total"`
}

type ExamAttemptAnswer struct {
	QuestionID   string   `json:"questionId"`
	Domain       string   `json:"domain"`
	QuestionType string   `json:"questionType"`
	Question     string   `json:"question"`
	Choices      []string `json:"choices"`
	AnswerKey    string   `json:"answerKey"`
	Explanation  string   `json:"explanation"`
	Selected     string   `json:"selected"`
	IsCorrect    *bool    `json:"isCorrect"`
}

type ExamAttempt struct {
	ID             int64                      `json:"id"`
	Username       string                     `json:"username,omitempty"`
	ExamID         string                     `json:"examId,omitempty"`
	CorrectCount   int                        `json:"correctCount"`
	TotalQuestions int                        `json:"totalQuestions"`
	ScorePercent   float64                    `json:"scorePercent"`
	StartedAt      time.Time                  `json:"startedAt"`
	FinishedAt     *time.Time                 `json:"finishedAt"`
	DomainStats    map[string]ExamDomainStat  `json:"domainStats"`
	Details        []ExamAttemptAnswer        `json:"details"`
}

// AdminExamAttempt extends ExamAttempt with user and exam display fields for admin view.
type AdminExamAttempt struct {
	ID             int64      `json:"id"`
	Username       string     `json:"username"`
	UserName       string     `json:"name"`
	EmployeeCode   string     `json:"employeeCode"`
	ExamID         string     `json:"examId"`
	ExamTitle      string     `json:"examTitle"`
	CorrectCount   int        `json:"correctCount"`
	TotalQuestions int        `json:"totalQuestions"`
	ScorePercent   float64    `json:"scorePercent"`
	StartedAt      time.Time  `json:"startedAt"`
	FinishedAt     *time.Time `json:"finishedAt"`
}

// ExamAnswerInput is used when saving attempt answers
type ExamAnswerInput struct {
	QuestionID string
	Selected   string
	IsCorrect  *bool
}

type AnswerProgress struct {
	TypedAnswer string `json:"typedAnswer"`
	IsCorrect   bool   `json:"isCorrect"`
}

type CourseProgress struct {
	CompletedSubtopics map[string]bool                       `json:"completedSubtopics"`
	Answers            map[string]map[string]AnswerProgress  `json:"answers"`
}

type LeaderboardEntry struct {
	Username         string `json:"username"`
	Name             string `json:"name"`
	Role             string `json:"role"`
	TotalScore       int    `json:"total_score"`
	CompletedCourses int    `json:"completed_courses"`
	SolvedQuestions  int    `json:"solved_questions"`
	AvatarURL        string `json:"avatar_url"`
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
