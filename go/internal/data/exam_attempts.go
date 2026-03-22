package data

import (
	"database/sql"
	"encoding/json"
	"fmt"
	"strings"
)

// ExamAttemptFilter holds optional filter parameters for exam attempt queries.
type ExamAttemptFilter struct {
	Search    string // search by name or employee code (admin) or exam title (self)
	ExamTitle string // exact exam title filter
}

// filterBuilder helps build dynamic WHERE clauses with parameterized placeholders.
type filterBuilder struct {
	where string
	args  []any
	idx   int
}

func newFilterBuilder(baseWhere string, baseArgs ...any) *filterBuilder {
	return &filterBuilder{where: baseWhere, args: baseArgs, idx: len(baseArgs) + 1}
}

func (fb *filterBuilder) add(clause string, args ...any) {
	placeholders := make([]any, len(args))
	for i := range args {
		placeholders[i] = fb.idx
		fb.idx++
	}
	fb.where += fmt.Sprintf(clause, placeholders...)
	fb.args = append(fb.args, args...)
}

// applyUserSearch adds search filter for user-facing queries (search by exam title).
func (fb *filterBuilder) applyUserSearch(f ExamAttemptFilter) {
	if f.Search != "" {
		fb.add(` AND e.title ILIKE $%d`, "%"+f.Search+"%")
	}
	if f.ExamTitle != "" {
		fb.add(` AND e.title = $%d`, f.ExamTitle)
	}
}

// applyAdminSearch adds search filter for admin queries (search by user name/employee code).
func (fb *filterBuilder) applyAdminSearch(f ExamAttemptFilter) {
	if f.Search != "" {
		fb.add(` AND (u.name ILIKE $%d OR u.employee_code ILIKE $%d)`, "%"+f.Search+"%", "%"+f.Search+"%")
	}
	if f.ExamTitle != "" {
		fb.add(` AND e.title = $%d`, f.ExamTitle)
	}
}

// limitOffset appends LIMIT and OFFSET placeholders and args.
func (fb *filterBuilder) limitOffset(limit, offset int) string {
	clause := fmt.Sprintf(` LIMIT $%d OFFSET $%d`, fb.idx, fb.idx+1)
	fb.args = append(fb.args, limit, offset)
	fb.idx += 2
	return clause
}

func CheckExamAttemptLimit(examID, username string) (maxAttempts int, currentCount int, err error) {
	err = db.QueryRow(`
		SELECT e.max_attempts, COUNT(ea.id)
		FROM exams e
		LEFT JOIN exam_attempts ea ON ea.exam_id = e.id AND ea.username = $2
		WHERE e.id = $1
		GROUP BY e.max_attempts`, examID, username,
	).Scan(&maxAttempts, &currentCount)
	return
}

// ── Attempts ──────────────────────────────────────────────────────────────────

func SaveExamAttempt(examID, username string, correctCount, totalQuestions int, scorePercent float64, domainStats map[string]ExamDomainStat, answers []ExamAnswerInput) (ExamAttempt, error) {
	if domainStats == nil {
		domainStats = map[string]ExamDomainStat{}
	}
	domainStatsJSON, err := json.Marshal(domainStats)
	if err != nil {
		return ExamAttempt{}, err
	}

	tx, err := db.Begin()
	if err != nil {
		return ExamAttempt{}, err
	}
	defer func() {
		if err != nil {
			_ = tx.Rollback()
		}
	}()

	var attempt ExamAttempt
	var domainStatsRaw json.RawMessage
	var finishedAt sql.NullTime

	err = tx.QueryRow(`
		INSERT INTO exam_attempts
		  (username, exam_id, correct_count, total_questions, score_percent, domain_stats, finished_at)
		VALUES ($1,$2,$3,$4,$5,$6,NOW())
		RETURNING id, correct_count, total_questions, score_percent::float8,
		          started_at, finished_at, domain_stats`,
		username, examID, correctCount, totalQuestions, scorePercent, domainStatsJSON,
	).Scan(
		&attempt.ID, &attempt.CorrectCount, &attempt.TotalQuestions, &attempt.ScorePercent,
		&attempt.StartedAt, &finishedAt, &domainStatsRaw,
	)
	if err != nil {
		return ExamAttempt{}, err
	}
	if finishedAt.Valid {
		attempt.FinishedAt = &finishedAt.Time
	}
	_ = json.Unmarshal(domainStatsRaw, &attempt.DomainStats)
	attempt.ExamID = examID
	attempt.Username = username

	for _, ans := range answers {
		if _, err = tx.Exec(
			`INSERT INTO exam_attempt_answers (attempt_id, question_id, selected, is_correct)
			 VALUES ($1,$2,$3,$4)
			 ON CONFLICT (attempt_id, question_id) DO UPDATE
			   SET selected = EXCLUDED.selected, is_correct = EXCLUDED.is_correct`,
			attempt.ID, ans.QuestionID, ans.Selected, ans.IsCorrect,
		); err != nil {
			return ExamAttempt{}, err
		}
	}

	if err = tx.Commit(); err != nil {
		return ExamAttempt{}, err
	}

	attempt.Details = []ExamAttemptAnswer{}
	return attempt, nil
}

func GetUserExamAttempts(username, examID string) ([]ExamAttempt, error) {
	rows, err := db.Query(`
		SELECT id, correct_count, total_questions, score_percent::float8,
		       started_at, finished_at, domain_stats
		FROM exam_attempts
		WHERE username = $1 AND exam_id = $2
		ORDER BY started_at DESC`,
		username, examID,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	attempts := make([]ExamAttempt, 0)
	for rows.Next() {
		var a ExamAttempt
		var domainStatsRaw json.RawMessage
		var finishedAt sql.NullTime
		if err := rows.Scan(
			&a.ID, &a.CorrectCount, &a.TotalQuestions, &a.ScorePercent,
			&a.StartedAt, &finishedAt, &domainStatsRaw,
		); err != nil {
			return nil, err
		}
		if finishedAt.Valid {
			a.FinishedAt = &finishedAt.Time
		}
		_ = json.Unmarshal(domainStatsRaw, &a.DomainStats)
		a.ExamID = examID
		a.Username = username
		a.Details = []ExamAttemptAnswer{}
		attempts = append(attempts, a)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}

	// Load per-question details for each attempt
	for i := range attempts {
		ansRows, err := db.Query(`
			SELECT a.question_id, q.domain, COALESCE(q.question_type, 'multiple_choice'), q.question,
			       q.choice_a, q.choice_b, q.choice_c, q.choice_d,
			       q.answer_key, q.explanation, a.selected, a.is_correct
			FROM exam_attempt_answers a
			JOIN exam_questions q ON q.id = a.question_id
			WHERE a.attempt_id = $1
			ORDER BY a.question_id`,
			attempts[i].ID,
		)
		if err != nil {
			return nil, fmt.Errorf("cannot load attempt answers for attempt %d: %w", attempts[i].ID, err)
		}
		details := make([]ExamAttemptAnswer, 0)
		for ansRows.Next() {
			var d ExamAttemptAnswer
			var choiceA, choiceB, choiceC, choiceD string
			if err := ansRows.Scan(
				&d.QuestionID, &d.Domain, &d.QuestionType, &d.Question,
				&choiceA, &choiceB, &choiceC, &choiceD,
				&d.AnswerKey, &d.Explanation,
				&d.Selected, &d.IsCorrect,
			); err != nil {
				ansRows.Close()
				return nil, fmt.Errorf("cannot scan attempt answer: %w", err)
			}
			d.Choices = []string{choiceA, choiceB, choiceC, choiceD}
			details = append(details, d)
		}
		ansRows.Close()
		attempts[i].Details = details
	}

	return attempts, nil
}

// GetExamAttemptDetails returns the per-question answers for a single attempt.
func GetExamAttemptDetails(attemptID int64) ([]ExamAttemptAnswer, error) {
	rows, err := db.Query(`
		SELECT a.question_id, q.domain, COALESCE(q.question_type, 'multiple_choice'), q.question,
		       q.choice_a, q.choice_b, q.choice_c, q.choice_d,
		       q.answer_key, q.explanation, a.selected, a.is_correct
		FROM exam_attempt_answers a
		JOIN exam_questions q ON q.id = a.question_id
		WHERE a.attempt_id = $1
		ORDER BY a.question_id`,
		attemptID,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	details := make([]ExamAttemptAnswer, 0)
	for rows.Next() {
		var d ExamAttemptAnswer
		var choiceA, choiceB, choiceC, choiceD string
		if err := rows.Scan(
			&d.QuestionID, &d.Domain, &d.QuestionType, &d.Question,
			&choiceA, &choiceB, &choiceC, &choiceD,
			&d.AnswerKey, &d.Explanation,
			&d.Selected, &d.IsCorrect,
		); err != nil {
			return nil, err
		}
		d.Choices = []string{choiceA, choiceB, choiceC, choiceD}
		details = append(details, d)
	}
	return details, rows.Err()
}

// GetMyExamAttemptDetails returns the per-question answers for an attempt owned by the given user.
// Returns ErrForbidden if the attempt does not belong to the user.
func GetMyExamAttemptDetails(username string, attemptID int64) ([]ExamAttemptAnswer, error) {
	var owner string
	if err := db.QueryRow(`SELECT username FROM exam_attempts WHERE id = $1`, attemptID).Scan(&owner); err != nil {
		return nil, err
	}
	if owner != username {
		return nil, ErrForbidden
	}
	return GetExamAttemptDetails(attemptID)
}

// GetMyAllExamAttempts returns paginated exam attempts for a user across all exams, with exam title.
func GetMyAllExamAttempts(username string, limit, offset int, f ExamAttemptFilter) ([]AdminExamAttempt, int, error) {
	fb := newFilterBuilder(`WHERE ea.username = $1`, username)
	fb.applyUserSearch(f)

	var total int
	if err := db.QueryRow(`SELECT COUNT(*) FROM exam_attempts ea JOIN exams e ON e.id = ea.exam_id `+fb.where, fb.args...).Scan(&total); err != nil {
		return nil, 0, err
	}

	lo := fb.limitOffset(limit, offset)
	query := `
		SELECT ea.id, ea.exam_id, ea.correct_count, ea.total_questions, ea.score_percent::float8,
		       ea.started_at, ea.finished_at, e.title
		FROM exam_attempts ea
		JOIN exams e ON e.id = ea.exam_id
		` + fb.where + `
		ORDER BY ea.started_at DESC` + lo

	rows, err := db.Query(query, fb.args...)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()

	attempts := make([]AdminExamAttempt, 0)
	for rows.Next() {
		var a AdminExamAttempt
		var finishedAt sql.NullTime
		if err := rows.Scan(
			&a.ID, &a.ExamID, &a.CorrectCount, &a.TotalQuestions, &a.ScorePercent,
			&a.StartedAt, &finishedAt, &a.ExamTitle,
		); err != nil {
			return nil, 0, fmt.Errorf("cannot scan exam attempt: %w", err)
		}
		if finishedAt.Valid {
			a.FinishedAt = &finishedAt.Time
		}
		a.Username = username
		attempts = append(attempts, a)
	}
	return attempts, total, rows.Err()
}

// GradeAndSaveExamAttempt fetches exam questions, grades the submitted answers, saves the attempt, and returns graded details.
func GradeAndSaveExamAttempt(examID, username string, rawAnswers []struct{ QuestionID, Selected string }) (ExamAttempt, []ExamAttemptAnswer, error) {
	// 1. Load exam questions with answer keys
	qRows, err := db.Query(`
		SELECT id, domain, COALESCE(question_type,'multiple_choice'), question,
		       choice_a, choice_b, choice_c, choice_d, answer_key, explanation
		FROM exam_questions WHERE exam_id = $1 ORDER BY id`, examID)
	if err != nil {
		return ExamAttempt{}, nil, err
	}
	defer qRows.Close()

	type questionRecord struct {
		ID           string
		Domain       string
		QuestionType string
		Question     string
		Choices      []string
		AnswerKey    string
		Explanation  string
	}
	questions := make(map[string]questionRecord)
	for qRows.Next() {
		var q questionRecord
		var choiceA, choiceB, choiceC, choiceD string
		if err := qRows.Scan(&q.ID, &q.Domain, &q.QuestionType, &q.Question,
			&choiceA, &choiceB, &choiceC, &choiceD, &q.AnswerKey, &q.Explanation); err != nil {
			return ExamAttempt{}, nil, fmt.Errorf("cannot scan exam question: %w", err)
		}
		q.Choices = []string{choiceA, choiceB, choiceC, choiceD}
		questions[q.ID] = q
	}

	// 2. Grade only the submitted answers (not all questions in the exam)
	var answers []ExamAnswerInput
	var details []ExamAttemptAnswer
	domainStats := make(map[string]ExamDomainStat)
	correctCount := 0
	totalGraded := 0

	for _, raw := range rawAnswers {
		q, ok := questions[raw.QuestionID]
		if !ok {
			continue // skip if question not found in this exam
		}
		var isCorrect *bool
		if q.QuestionType != "text" && strings.TrimSpace(q.AnswerKey) != "" {
			graded := strings.EqualFold(strings.TrimSpace(raw.Selected), strings.TrimSpace(q.AnswerKey))
			isCorrect = &graded
			totalGraded++
			if graded {
				correctCount++
			}
			ds := domainStats[q.Domain]
			ds.Total++
			if graded {
				ds.Correct++
			}
			domainStats[q.Domain] = ds
		}
		answers = append(answers, ExamAnswerInput{QuestionID: raw.QuestionID, Selected: raw.Selected, IsCorrect: isCorrect})
		details = append(details, ExamAttemptAnswer{
			QuestionID:   raw.QuestionID,
			Domain:       q.Domain,
			QuestionType: q.QuestionType,
			Question:     q.Question,
			Choices:      q.Choices,
			AnswerKey:    q.AnswerKey,
			Explanation:  q.Explanation,
			Selected:     raw.Selected,
			IsCorrect:    isCorrect,
		})
	}

	totalQuestions := len(rawAnswers)
	var scorePercent float64
	if totalGraded > 0 {
		scorePercent = float64(correctCount) / float64(totalGraded) * 100
	}

	attempt, err := SaveExamAttempt(examID, username, correctCount, totalQuestions, scorePercent, domainStats, answers)
	if err != nil {
		return ExamAttempt{}, nil, err
	}
	return attempt, details, nil
}

// GetAllExamAttemptsAdmin returns paginated exam attempts across all users for admin view.
func GetAllExamAttemptsAdmin(limit, offset int, f ExamAttemptFilter) ([]AdminExamAttempt, int, error) {
	fb := newFilterBuilder(`WHERE 1=1`)
	fb.applyAdminSearch(f)

	var total int
	countQuery := `SELECT COUNT(*) FROM exam_attempts ea JOIN users u ON u.username = ea.username JOIN exams e ON e.id = ea.exam_id ` + fb.where
	if err := db.QueryRow(countQuery, fb.args...).Scan(&total); err != nil {
		return nil, 0, err
	}

	lo := fb.limitOffset(limit, offset)
	query := `
		SELECT ea.id, ea.username, u.name, u.employee_code,
		       ea.exam_id, e.title,
		       ea.correct_count, ea.total_questions, ea.score_percent::float8,
		       ea.started_at, ea.finished_at
		FROM exam_attempts ea
		JOIN users u ON u.username = ea.username
		JOIN exams e ON e.id = ea.exam_id
		` + fb.where + `
		ORDER BY COALESCE(ea.finished_at, ea.started_at) DESC` + lo

	rows, err := db.Query(query, fb.args...)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()

	attempts := make([]AdminExamAttempt, 0)
	for rows.Next() {
		var a AdminExamAttempt
		var finishedAt sql.NullTime
		if err := rows.Scan(
			&a.ID, &a.Username, &a.UserName, &a.EmployeeCode,
			&a.ExamID, &a.ExamTitle,
			&a.CorrectCount, &a.TotalQuestions, &a.ScorePercent,
			&a.StartedAt, &finishedAt,
		); err != nil {
			return nil, 0, err
		}
		if finishedAt.Valid {
			a.FinishedAt = &finishedAt.Time
		}
		attempts = append(attempts, a)
	}
	return attempts, total, rows.Err()
}

// GetExamAttemptStatsAdmin returns aggregate statistics for all exam attempts (with optional filters).
func GetExamAttemptStatsAdmin(f ExamAttemptFilter) (ExamAttemptAggregateStats, error) {
	fb := newFilterBuilder(`WHERE 1=1`)
	fb.applyAdminSearch(f)
	var s ExamAttemptAggregateStats
	err := db.QueryRow(`
		SELECT COUNT(*),
		       COUNT(*) FILTER (WHERE ea.score_percent >= 70),
		       COALESCE(AVG(ea.score_percent), 0)::float8
		FROM exam_attempts ea
		JOIN users u ON u.username = ea.username
		JOIN exams e ON e.id = ea.exam_id `+fb.where, fb.args...).Scan(&s.Total, &s.PassCount, &s.AvgScore)
	return s, err
}

// GetMyExamAttemptStats returns aggregate statistics for a specific user's exam attempts (with optional filters).
func GetMyExamAttemptStats(username string, f ExamAttemptFilter) (ExamAttemptAggregateStats, error) {
	fb := newFilterBuilder(`WHERE ea.username = $1`, username)
	fb.applyUserSearch(f)
	var s ExamAttemptAggregateStats
	err := db.QueryRow(`
		SELECT COUNT(*),
		       COUNT(*) FILTER (WHERE ea.score_percent >= 70),
		       COALESCE(AVG(ea.score_percent), 0)::float8
		FROM exam_attempts ea
		JOIN exams e ON e.id = ea.exam_id `+fb.where, fb.args...).Scan(&s.Total, &s.PassCount, &s.AvgScore)
	return s, err
}

// GetExamAttemptDistinctTitles returns all distinct exam titles that have attempts (optionally for a specific user).
func GetExamAttemptDistinctTitles(username string) ([]string, error) {
	query := `SELECT DISTINCT e.title FROM exam_attempts ea JOIN exams e ON e.id = ea.exam_id`
	args := []any{}
	if username != "" {
		query += ` WHERE ea.username = $1`
		args = append(args, username)
	}
	query += ` ORDER BY e.title`
	rows, err := db.Query(query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var titles []string
	for rows.Next() {
		var t string
		if err := rows.Scan(&t); err != nil {
			return nil, fmt.Errorf("cannot scan exam title: %w", err)
		}
		titles = append(titles, t)
	}
	return titles, rows.Err()
}
