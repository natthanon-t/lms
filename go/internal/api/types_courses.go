package api

type courseRequest struct {
	ID                      string            `json:"id"`
	Title                   string            `json:"title"`
	Creator                 string            `json:"creator"`
	Status                  string            `json:"status"`
	Visibility              string            `json:"visibility"`
	AllowedUsernames        []string          `json:"allowedUsernames"`
	Description             string            `json:"description"`
	Image                   string            `json:"image"`
	Content                 string            `json:"content"`
	SkillPoints             int               `json:"skillPoints"`
	SubtopicCompletionScore int               `json:"subtopicCompletionScore"`
	CourseCompletionScore   int               `json:"courseCompletionScore"`
	SkillRewards            []skillRewardBody `json:"skillRewards"`
}

type skillRewardBody struct {
	Skill  string `json:"skill"`
	Points int    `json:"points"`
}

type courseStatusRequest struct {
	Status string `json:"status"`
}

type subtopicAnswerRequest struct {
	QuestionID  string `json:"questionId"`
	TypedAnswer string `json:"typedAnswer"`
	IsCorrect   bool   `json:"isCorrect"`
}

type subtopicTimeRequest struct {
	Seconds int `json:"seconds"`
}

type courseImageRequest struct {
	Filename string `json:"filename"`
	DataURL  string `json:"data_url"`
}

type qnaQuestionRequest struct {
	SubtopicID string `json:"subtopicId"`
	Question   string `json:"question"`
}

type qnaReplyRequest struct {
	Reply string `json:"reply"`
}

type avatarRequest struct {
	DataURL string `json:"data_url"`
}
