package data

// ── Types ────────────────────────────────────────────────────────────────────

type ExamInstructorStats struct {
	ID         string  `json:"id"`
	Title      string  `json:"title"`
	TestTakers int     `json:"testTakers"`
	Attempts   int     `json:"attempts"`
	AvgScore   float64 `json:"avgScore"`
	PassRate   float64 `json:"passRate"`
}

type DomainAvgScore struct {
	Domain   string  `json:"domain"`
	AvgScore float64 `json:"avgScore"`
	Total    int     `json:"total"`
}

type HardExamQuestion struct {
	QuestionID  string  `json:"questionId"`
	Question    string  `json:"question"`
	Domain      string  `json:"domain"`
	CorrectRate float64 `json:"correctRate"`
	Attempts    int     `json:"attempts"`
}

type ExamDetailAnalytics struct {
	DomainAvgScores []DomainAvgScore   `json:"domainAvgScores"`
	HardQuestions   []HardExamQuestion `json:"hardQuestions"`
}

// ── Queries ──────────────────────────────────────────────────────────────────

// GetAllExamStats returns per-exam stats for all exams (or filtered by owner).
func GetAllExamStats(ownerUsername string) ([]ExamInstructorStats, error) {
	query := `
		SELECT
			e.id,
			e.title,
			COUNT(DISTINCT a.username) AS test_takers,
			COUNT(a.id) AS attempts,
			COALESCE(ROUND(AVG(a.score_percent)::numeric, 1), 0) AS avg_score,
			CASE WHEN COUNT(a.id) > 0
				THEN ROUND(COUNT(CASE WHEN a.score_percent >= 60 THEN 1 END)::numeric * 100 / COUNT(a.id), 1)
				ELSE 0
			END AS pass_rate
		FROM exams e
		LEFT JOIN exam_attempts a ON a.exam_id = e.id AND a.finished_at IS NOT NULL
	`
	args := []interface{}{}
	if ownerUsername != "" {
		query += ` WHERE e.owner_username = $1`
		args = append(args, ownerUsername)
	}
	query += ` GROUP BY e.id, e.title ORDER BY attempts DESC`

	rows, err := db.Query(query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var result []ExamInstructorStats
	for rows.Next() {
		var s ExamInstructorStats
		if err := rows.Scan(&s.ID, &s.Title, &s.TestTakers, &s.Attempts, &s.AvgScore, &s.PassRate); err != nil {
			continue
		}
		result = append(result, s)
	}
	return result, rows.Err()
}

// GetExamDetailAnalytics returns domain average scores and hardest questions for an exam.
func GetExamDetailAnalytics(examID string) (ExamDetailAnalytics, error) {
	var detail ExamDetailAnalytics

	// 1. Domain avg scores
	domainRows, err := db.Query(`
		SELECT
			eq.domain,
			ROUND(AVG(CASE WHEN eaa.is_correct THEN 100 ELSE 0 END)::numeric, 1) AS avg_score,
			COUNT(*) AS total
		FROM exam_attempt_answers eaa
		JOIN exam_questions eq ON eq.id = eaa.question_id
		JOIN exam_attempts ea ON ea.id = eaa.attempt_id
		WHERE ea.exam_id = $1 AND ea.finished_at IS NOT NULL AND eq.domain != '' AND eaa.is_correct IS NOT NULL
		GROUP BY eq.domain
		ORDER BY avg_score ASC`, examID)
	if err != nil {
		return detail, err
	}
	defer domainRows.Close()

	for domainRows.Next() {
		var d DomainAvgScore
		if err := domainRows.Scan(&d.Domain, &d.AvgScore, &d.Total); err != nil {
			continue
		}
		detail.DomainAvgScores = append(detail.DomainAvgScores, d)
	}
	if err := domainRows.Err(); err != nil {
		return detail, err
	}

	// 2. Hard questions — lowest correct rate, min 2 attempts, limit 10
	hardRows, err := db.Query(`
		SELECT
			eq.id,
			eq.question,
			eq.domain,
			ROUND(AVG(CASE WHEN eaa.is_correct THEN 100 ELSE 0 END)::numeric, 1) AS correct_rate,
			COUNT(*) AS attempts
		FROM exam_attempt_answers eaa
		JOIN exam_questions eq ON eq.id = eaa.question_id
		JOIN exam_attempts ea ON ea.id = eaa.attempt_id
		WHERE ea.exam_id = $1 AND ea.finished_at IS NOT NULL AND eaa.is_correct IS NOT NULL
		GROUP BY eq.id, eq.question, eq.domain
		HAVING COUNT(*) >= 2
		ORDER BY correct_rate ASC
		LIMIT 10`, examID)
	if err != nil {
		return detail, err
	}
	defer hardRows.Close()

	for hardRows.Next() {
		var q HardExamQuestion
		if err := hardRows.Scan(&q.QuestionID, &q.Question, &q.Domain, &q.CorrectRate, &q.Attempts); err != nil {
			continue
		}
		detail.HardQuestions = append(detail.HardQuestions, q)
	}
	if err := hardRows.Err(); err != nil {
		return detail, err
	}

	if detail.DomainAvgScores == nil {
		detail.DomainAvgScores = []DomainAvgScore{}
	}
	if detail.HardQuestions == nil {
		detail.HardQuestions = []HardExamQuestion{}
	}
	return detail, nil
}
