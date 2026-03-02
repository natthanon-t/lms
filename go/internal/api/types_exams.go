package api

type examRequest struct {
	ID                string            `json:"id"`
	Title             string            `json:"title"`
	Creator           string            `json:"creator"`
	Status            string            `json:"status"`
	Description       string            `json:"description"`
	Instructions      string            `json:"instructions"`
	Image             string            `json:"image"`
	NumberOfQuestions int               `json:"numberOfQuestions"`
	DefaultTime       int               `json:"defaultTime"`
	MaxAttempts       int               `json:"maxAttempts"`
	DomainPercentages map[string]int    `json:"domainPercentages"`
	Questions         []examQuestionReq `json:"questions"`
}

type examQuestionReq struct {
	ID          string   `json:"id"`
	Domain      string   `json:"domain"`
	Question    string   `json:"question"`
	Choices     []string `json:"choices"`
	AnswerKey   string   `json:"answerKey"`
	Explanation string   `json:"explanation"`
}

type examStatusRequest struct {
	Status string `json:"status"`
}

type examAttemptRequest struct {
	CorrectCount   int                          `json:"correctCount"`
	TotalQuestions int                          `json:"totalQuestions"`
	ScorePercent   float64                      `json:"scorePercent"`
	DomainStats    map[string]examDomainStatBody `json:"domainStats"`
	Answers        []examAnswerBody             `json:"answers"`
}

type examDomainStatBody struct {
	Correct int `json:"correct"`
	Total   int `json:"total"`
}

type examAnswerBody struct {
	QuestionID string `json:"questionId"`
	Selected   string `json:"selected"`
	IsCorrect  bool   `json:"isCorrect"`
}
