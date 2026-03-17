package data

import (
	"database/sql"
	"encoding/json"
	"errors"
	"fmt"
	"log"
	"os"
	"path/filepath"
	"strings"

)

// ── Seed-file JSON structures ─────────────────────────────────────────────────

type examSeedIndexEntry struct {
	ID                string `json:"id"`
	Title             string `json:"title"`
	Description       string `json:"description"`
	Instructions      string `json:"instructions"`
	NumberOfQuestions int    `json:"numberOfQuestions"`
	DefaultTime       int    `json:"defaultTime"`
	File              string `json:"file"`
	Image             string `json:"image"`
}

type examSeedFile struct {
	ExamName          string             `json:"Exam Name"`
	NumberOfQuestions int                `json:"Number of Questions"`
	DefaultTime       int                `json:"Default Time"`
	Instructions      string             `json:"Instructions"`
	DomainPercentages map[string]int     `json:"DomainPercentages"`
	Questions         []examSeedQuestion `json:"Questions"`
}

type examSeedQuestion struct {
	DomainOfKnowledge string   `json:"DomainOfKnowledge"`
	Question          string   `json:"Question"`
	Choices           []string `json:"Choices"`
	AnswerKey         string   `json:"AnswerKey"`
	Explanation       string   `json:"Explaination"` // Typo intentional — matches source files
}

// ── Schema migration ──────────────────────────────────────────────────────────

func EnsureExamSchema() error {
	_, err := db.Exec(`
		ALTER TABLE exams ADD COLUMN IF NOT EXISTS max_attempts INT NOT NULL DEFAULT 0;
		ALTER TABLE exam_attempts ADD COLUMN IF NOT EXISTS domain_stats JSONB NOT NULL DEFAULT '{}';
		ALTER TABLE exam_questions ADD COLUMN IF NOT EXISTS question_type TEXT NOT NULL DEFAULT 'multiple_choice';
		ALTER TABLE exam_attempt_answers ALTER COLUMN is_correct DROP NOT NULL;
		ALTER TABLE exams ADD COLUMN IF NOT EXISTS visibility TEXT NOT NULL DEFAULT 'public';
		ALTER TABLE exams ADD COLUMN IF NOT EXISTS allowed_usernames TEXT[] NOT NULL DEFAULT '{}';
		ALTER TABLE courses ADD COLUMN IF NOT EXISTS visibility TEXT NOT NULL DEFAULT 'public';
		ALTER TABLE courses ADD COLUMN IF NOT EXISTS allowed_usernames TEXT[] NOT NULL DEFAULT '{}';
		CREATE TABLE IF NOT EXISTS course_attachments (
			id           BIGSERIAL    PRIMARY KEY,
			course_id    TEXT         NOT NULL,
			stored_name  TEXT         NOT NULL,
			orig_name    TEXT         NOT NULL,
			url_path     TEXT         NOT NULL,
			uploaded_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
			CONSTRAINT fk_course_attachments_course
				FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE
		);
		CREATE INDEX IF NOT EXISTS ix_course_attachments_course ON course_attachments(course_id);
		CREATE INDEX IF NOT EXISTS ix_exam_attempts_user_exam ON exam_attempts(username, exam_id);
	`)
	return err
}

// ── Read ──────────────────────────────────────────────────────────────────────

func ListExams(limit, offset int) ([]Exam, int, error) {
	var total int
	if err := db.QueryRow(`SELECT COUNT(*) FROM exams`).Scan(&total); err != nil {
		return nil, 0, err
	}

	rows, err := db.Query(`
		SELECT ex.id, ex.title, ex.creator, COALESCE(ex.owner_username, ''), ex.status,
		       COALESCE(ex.visibility, 'public'), COALESCE(ex.allowed_usernames, '{}'),
		       ex.description, ex.instructions, ex.image,
		       ex.number_of_questions, ex.default_time, ex.max_attempts, ex.created_at,
		       COUNT(DISTINCT ea.username) AS attempt_count
		FROM exams ex
		LEFT JOIN exam_attempts ea ON ea.exam_id = ex.id
		GROUP BY ex.id
		ORDER BY attempt_count DESC, ex.created_at DESC
		LIMIT $1 OFFSET $2`, limit, offset)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()

	exams := make([]Exam, 0)
	examIdx := map[string]int{}
	for rows.Next() {
		var e Exam
		if err := rows.Scan(
			&e.ID, &e.Title, &e.Creator, &e.OwnerUsername, &e.Status,
			&e.Visibility, (*StringArray)(&e.AllowedUsernames),
			&e.Description, &e.Instructions, &e.Image,
			&e.NumberOfQuestions, &e.DefaultTime, &e.MaxAttempts, &e.CreatedAt,
			&e.AttemptCount,
		); err != nil {
			return nil, 0, err
		}
		if e.AllowedUsernames == nil {
			e.AllowedUsernames = []string{}
		}
		e.DomainPercentages = map[string]int{}
		e.Questions = []ExamQuestion{}
		examIdx[e.ID] = len(exams)
		exams = append(exams, e)
	}
	if err := rows.Err(); err != nil {
		return nil, 0, err
	}

	if len(exams) > 0 {
		ids := make([]string, 0, len(exams))
		for id := range examIdx {
			ids = append(ids, id)
		}
		dpRows, err := db.Query(`SELECT exam_id, domain, percentage FROM exam_domain_percentages WHERE exam_id = ANY($1)`, ids)
		if err == nil {
			defer dpRows.Close()
			for dpRows.Next() {
				var examID, domain string
				var pct int
				if err := dpRows.Scan(&examID, &domain, &pct); err != nil {
					continue
				}
				if idx, ok := examIdx[examID]; ok {
					exams[idx].DomainPercentages[domain] = pct
				}
			}
		}
	}

	return exams, total, nil
}

func GetExam(id string) (*Exam, error) {
	var e Exam
	err := db.QueryRow(`
		SELECT id, title, creator, COALESCE(owner_username, ''), status,
		       COALESCE(visibility, 'public'), COALESCE(allowed_usernames, '{}'),
		       description, instructions, image,
		       number_of_questions, default_time, max_attempts, created_at
		FROM exams WHERE id = $1`, id,
	).Scan(
		&e.ID, &e.Title, &e.Creator, &e.OwnerUsername, &e.Status,
		&e.Visibility, (*StringArray)(&e.AllowedUsernames),
		&e.Description, &e.Instructions, &e.Image,
		&e.NumberOfQuestions, &e.DefaultTime, &e.MaxAttempts, &e.CreatedAt,
	)
	if err != nil {
		return nil, err
	}

	e.DomainPercentages = map[string]int{}
	dpRows, err := db.Query(`SELECT domain, percentage FROM exam_domain_percentages WHERE exam_id = $1`, id)
	if err == nil {
		defer dpRows.Close()
		for dpRows.Next() {
			var domain string
			var pct int
			if err := dpRows.Scan(&domain, &pct); err == nil {
				e.DomainPercentages[domain] = pct
			}
		}
	}

	e.Questions = []ExamQuestion{}
	qRows, err := db.Query(`
		SELECT id, exam_id, domain, COALESCE(question_type, 'multiple_choice'), question,
		       choice_a, choice_b, choice_c, choice_d,
		       answer_key, explanation
		FROM exam_questions WHERE exam_id = $1 ORDER BY id`, id)
	if err == nil {
		defer qRows.Close()
		for qRows.Next() {
			var q ExamQuestion
			var choiceA, choiceB, choiceC, choiceD string
			if err := qRows.Scan(
				&q.ID, &q.ExamID, &q.Domain, &q.QuestionType, &q.Question,
				&choiceA, &choiceB, &choiceC, &choiceD,
				&q.AnswerKey, &q.Explanation,
			); err != nil {
				continue
			}
			q.Choices = []string{choiceA, choiceB, choiceC, choiceD}
			e.Questions = append(e.Questions, q)
		}
	}

	return &e, nil
}

func GetExamPublic(id string) (*PublicExam, error) {
	var e PublicExam
	err := db.QueryRow(`
		SELECT id, title, creator, status,
		       COALESCE(visibility, 'public'), COALESCE(allowed_usernames, '{}'),
		       description, instructions, image,
		       number_of_questions, default_time, max_attempts, created_at
		FROM exams WHERE id = $1`, id,
	).Scan(
		&e.ID, &e.Title, &e.Creator, &e.Status,
		&e.Visibility, (*StringArray)(&e.AllowedUsernames),
		&e.Description, &e.Instructions, &e.Image,
		&e.NumberOfQuestions, &e.DefaultTime, &e.MaxAttempts, &e.CreatedAt,
	)
	if err != nil {
		return nil, err
	}

	e.DomainPercentages = map[string]int{}
	dpRows, err := db.Query(`SELECT domain, percentage FROM exam_domain_percentages WHERE exam_id = $1`, id)
	if err == nil {
		defer dpRows.Close()
		for dpRows.Next() {
			var domain string
			var pct int
			if err := dpRows.Scan(&domain, &pct); err == nil {
				e.DomainPercentages[domain] = pct
			}
		}
	}

	return &e, nil
}

// GetExamQuestionsPublic returns only questions (without answer keys) for exam-taking.
func GetExamQuestionsPublic(examID string) ([]PublicExamQuestion, error) {
	// Verify exam exists
	var exists bool
	if err := db.QueryRow(`SELECT EXISTS(SELECT 1 FROM exams WHERE id = $1)`, examID).Scan(&exists); err != nil {
		return nil, err
	}
	if !exists {
		return nil, sql.ErrNoRows
	}

	rows, err := db.Query(`
		SELECT id, exam_id, domain, COALESCE(question_type, 'multiple_choice'), question,
		       choice_a, choice_b, choice_c, choice_d
		FROM exam_questions WHERE exam_id = $1 ORDER BY id`, examID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	questions := make([]PublicExamQuestion, 0)
	for rows.Next() {
		var q PublicExamQuestion
		var choiceA, choiceB, choiceC, choiceD string
		if err := rows.Scan(
			&q.ID, &q.ExamID, &q.Domain, &q.QuestionType, &q.Question,
			&choiceA, &choiceB, &choiceC, &choiceD,
		); err != nil {
			continue
		}
		q.Choices = []string{choiceA, choiceB, choiceC, choiceD}
		questions = append(questions, q)
	}
	return questions, rows.Err()
}

// ── Write ─────────────────────────────────────────────────────────────────────

func UpsertExam(exam Exam, callerUsername string, isAdmin bool) (Exam, error) {
	var existingOwner sql.NullString
	err := db.QueryRow(`SELECT owner_username FROM exams WHERE id = $1`, exam.ID).Scan(&existingOwner)
	if err != nil && !errors.Is(err, sql.ErrNoRows) {
		return Exam{}, err
	}

	if err == nil {
		// Exam exists — check ownership
		if !isAdmin && (!existingOwner.Valid || existingOwner.String != callerUsername) {
			return Exam{}, ErrForbidden
		}
	} else {
		// New exam — set caller as owner
		exam.OwnerUsername = callerUsername
	}

	var ownerPtr *string
	if exam.OwnerUsername != "" {
		ownerPtr = &exam.OwnerUsername
	}

	if exam.DomainPercentages == nil {
		exam.DomainPercentages = map[string]int{}
	}
	if exam.Visibility == "" {
		exam.Visibility = "public"
	}
	if exam.AllowedUsernames == nil {
		exam.AllowedUsernames = []string{}
	}

	err = db.QueryRow(`
		INSERT INTO exams (id, title, creator, owner_username, status, visibility, allowed_usernames,
		                   description, instructions, image,
		                   number_of_questions, default_time, max_attempts)
		VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
		ON CONFLICT (id) DO UPDATE SET
			title               = EXCLUDED.title,
			creator             = EXCLUDED.creator,
			status              = EXCLUDED.status,
			visibility          = EXCLUDED.visibility,
			allowed_usernames   = EXCLUDED.allowed_usernames,
			description         = EXCLUDED.description,
			instructions        = EXCLUDED.instructions,
			image               = EXCLUDED.image,
			number_of_questions = EXCLUDED.number_of_questions,
			default_time        = EXCLUDED.default_time,
			max_attempts        = EXCLUDED.max_attempts
		RETURNING id, title, creator, COALESCE(owner_username, ''), status,
		          COALESCE(visibility, 'public'), COALESCE(allowed_usernames, '{}'),
		          description, instructions, image,
		          number_of_questions, default_time, max_attempts, created_at`,
		exam.ID, exam.Title, exam.Creator, ownerPtr, exam.Status, exam.Visibility, StringArray(exam.AllowedUsernames),
		exam.Description, exam.Instructions, exam.Image,
		exam.NumberOfQuestions, exam.DefaultTime, exam.MaxAttempts,
	).Scan(
		&exam.ID, &exam.Title, &exam.Creator, &exam.OwnerUsername, &exam.Status,
		&exam.Visibility, (*StringArray)(&exam.AllowedUsernames),
		&exam.Description, &exam.Instructions, &exam.Image,
		&exam.NumberOfQuestions, &exam.DefaultTime, &exam.MaxAttempts, &exam.CreatedAt,
	)
	if err != nil {
		return Exam{}, err
	}

	// Replace domain percentages
	if _, err := db.Exec(`DELETE FROM exam_domain_percentages WHERE exam_id = $1`, exam.ID); err != nil {
		return exam, err
	}
	for domain, pct := range exam.DomainPercentages {
		if strings.TrimSpace(domain) == "" {
			continue
		}
		if _, err := db.Exec(
			`INSERT INTO exam_domain_percentages (exam_id, domain, percentage) VALUES ($1,$2,$3)`,
			exam.ID, domain, pct,
		); err != nil {
			return exam, err
		}
	}

	// Replace questions
	if _, err := db.Exec(`DELETE FROM exam_questions WHERE exam_id = $1`, exam.ID); err != nil {
		return exam, err
	}
	savedQuestions := make([]ExamQuestion, 0, len(exam.Questions))
	for i, q := range exam.Questions {
		qID := fmt.Sprintf("%s-q-%d", exam.ID, i+1)
		qType := q.QuestionType
		if qType == "" {
			qType = "multiple_choice"
		}
		choiceA, choiceB, choiceC, choiceD := "", "", "", ""
		if len(q.Choices) > 0 {
			choiceA = q.Choices[0]
		}
		if len(q.Choices) > 1 {
			choiceB = q.Choices[1]
		}
		if len(q.Choices) > 2 {
			choiceC = q.Choices[2]
		}
		if len(q.Choices) > 3 {
			choiceD = q.Choices[3]
		}
		if _, err := db.Exec(
			`INSERT INTO exam_questions
			 (id, exam_id, domain, question_type, question, choice_a, choice_b, choice_c, choice_d, answer_key, explanation)
			 VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
			qID, exam.ID, q.Domain, qType, q.Question,
			choiceA, choiceB, choiceC, choiceD,
			q.AnswerKey, q.Explanation,
		); err != nil {
			return exam, err
		}
		savedQuestions = append(savedQuestions, ExamQuestion{
			ID:           qID,
			ExamID:       exam.ID,
			Domain:       q.Domain,
			QuestionType: qType,
			Question:     q.Question,
			Choices:      q.Choices,
			AnswerKey:    q.AnswerKey,
			Explanation:  q.Explanation,
		})
	}
	exam.Questions = savedQuestions

	return exam, nil
}

func UpdateExamStatus(id, status, callerUsername string, isAdmin bool) error {
	var ownerUsername sql.NullString
	err := db.QueryRow(`SELECT owner_username FROM exams WHERE id = $1`, id).Scan(&ownerUsername)
	if errors.Is(err, sql.ErrNoRows) {
		return sql.ErrNoRows
	}
	if err != nil {
		return err
	}
	if !isAdmin && (!ownerUsername.Valid || ownerUsername.String != callerUsername) {
		return ErrForbidden
	}
	_, err = db.Exec(`UPDATE exams SET status = $2 WHERE id = $1`, id, status)
	return err
}

func DeleteExam(id, callerUsername string, isAdmin bool) error {
	var ownerUsername sql.NullString
	err := db.QueryRow(`SELECT owner_username FROM exams WHERE id = $1`, id).Scan(&ownerUsername)
	if errors.Is(err, sql.ErrNoRows) {
		return sql.ErrNoRows
	}
	if err != nil {
		return err
	}
	if !isAdmin && (!ownerUsername.Valid || ownerUsername.String != callerUsername) {
		return ErrForbidden
	}
	_, err = db.Exec(`DELETE FROM exams WHERE id = $1`, id)
	return err
}

// ── Attempt helpers ──────────────────────────────────────────────────────────

// CheckExamAttemptLimit returns the max_attempts for an exam and the user's current attempt count
// in a single query. Returns sql.ErrNoRows if the exam does not exist.
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
			continue
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
				continue
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
func GetMyAllExamAttempts(username string, limit, offset int) ([]AdminExamAttempt, int, error) {
	var total int
	if err := db.QueryRow(`SELECT COUNT(*) FROM exam_attempts WHERE username = $1`, username).Scan(&total); err != nil {
		return nil, 0, err
	}

	rows, err := db.Query(`
		SELECT ea.id, ea.exam_id, ea.correct_count, ea.total_questions, ea.score_percent::float8,
		       ea.started_at, ea.finished_at, e.title
		FROM exam_attempts ea
		JOIN exams e ON e.id = ea.exam_id
		WHERE ea.username = $1
		ORDER BY ea.started_at DESC
		LIMIT $2 OFFSET $3`,
		username, limit, offset,
	)
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
			continue
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
			continue
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
func GetAllExamAttemptsAdmin(limit, offset int) ([]AdminExamAttempt, int, error) {
	var total int
	if err := db.QueryRow(`SELECT COUNT(*) FROM exam_attempts`).Scan(&total); err != nil {
		return nil, 0, err
	}

	rows, err := db.Query(`
		SELECT ea.id, ea.username, u.name, u.employee_code,
		       ea.exam_id, e.title,
		       ea.correct_count, ea.total_questions, ea.score_percent::float8,
		       ea.started_at, ea.finished_at
		FROM exam_attempts ea
		JOIN users u ON u.username = ea.username
		JOIN exams e ON e.id = ea.exam_id
		ORDER BY COALESCE(ea.finished_at, ea.started_at) DESC
		LIMIT $1 OFFSET $2`, limit, offset)
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

// GetExamAttemptStatsAdmin returns aggregate statistics for all exam attempts.
func GetExamAttemptStatsAdmin() (ExamAttemptAggregateStats, error) {
	var s ExamAttemptAggregateStats
	err := db.QueryRow(`
		SELECT COUNT(*),
		       COUNT(*) FILTER (WHERE score_percent >= 70),
		       COALESCE(AVG(score_percent), 0)::float8
		FROM exam_attempts`).Scan(&s.Total, &s.PassCount, &s.AvgScore)
	return s, err
}

// GetMyExamAttemptStats returns aggregate statistics for a specific user's exam attempts.
func GetMyExamAttemptStats(username string) (ExamAttemptAggregateStats, error) {
	var s ExamAttemptAggregateStats
	err := db.QueryRow(`
		SELECT COUNT(*),
		       COUNT(*) FILTER (WHERE score_percent >= 70),
		       COALESCE(AVG(score_percent), 0)::float8
		FROM exam_attempts
		WHERE username = $1`, username).Scan(&s.Total, &s.PassCount, &s.AvgScore)
	return s, err
}

// ── Seeding ───────────────────────────────────────────────────────────────────

func SeedExamsFromDir(dir string) error {
	if dir == "" {
		return nil
	}

	indexPath := filepath.Join(dir, "index.json")
	indexData, err := os.ReadFile(indexPath)
	if err != nil {
		log.Printf("seed: index.json not found at %s — skipping exam seed", indexPath)
		return nil
	}

	var index []examSeedIndexEntry
	if err := json.Unmarshal(indexData, &index); err != nil {
		return fmt.Errorf("seed: index.json parse error: %w", err)
	}

	for _, entry := range index {
		// Skip if already seeded
		var existingID string
		err := db.QueryRow(`SELECT id FROM exams WHERE id = $1`, entry.ID).Scan(&existingID)
		if err == nil {
			continue
		}
		if !errors.Is(err, sql.ErrNoRows) {
			return err
		}

		// Read individual exam file
		fileName := filepath.Base(entry.File)
		examPath := filepath.Join(dir, fileName)
		examData, err := os.ReadFile(examPath)
		if err != nil {
			log.Printf("seed: cannot read %s: %v", examPath, err)
			continue
		}

		var seedFile examSeedFile
		if err := json.Unmarshal(examData, &seedFile); err != nil {
			log.Printf("seed: cannot parse %s: %v", examPath, err)
			continue
		}

		// Insert exam (owner_username = NULL for seeded exams)
		_, err = db.Exec(`
			INSERT INTO exams
			  (id, title, creator, status, description, instructions, image,
			   number_of_questions, default_time, max_attempts)
			VALUES ($1,$2,'System','active',$3,$4,$5,$6,$7,0)`,
			entry.ID, entry.Title,
			entry.Description, seedFile.Instructions, entry.Image,
			entry.NumberOfQuestions, entry.DefaultTime,
		)
		if err != nil {
			log.Printf("seed: cannot insert exam %s: %v", entry.ID, err)
			continue
		}

		// Insert domain percentages
		for domain, pct := range seedFile.DomainPercentages {
			_, _ = db.Exec(
				`INSERT INTO exam_domain_percentages (exam_id, domain, percentage) VALUES ($1,$2,$3)`,
				entry.ID, domain, pct,
			)
		}

		// Insert questions
		for i, q := range seedFile.Questions {
			qID := fmt.Sprintf("%s-q-%d", entry.ID, i+1)
			choiceA, choiceB, choiceC, choiceD := "", "", "", ""
			if len(q.Choices) > 0 {
				choiceA = q.Choices[0]
			}
			if len(q.Choices) > 1 {
				choiceB = q.Choices[1]
			}
			if len(q.Choices) > 2 {
				choiceC = q.Choices[2]
			}
			if len(q.Choices) > 3 {
				choiceD = q.Choices[3]
			}
			_, _ = db.Exec(`
				INSERT INTO exam_questions
				  (id, exam_id, domain, question, choice_a, choice_b, choice_c, choice_d, answer_key, explanation)
				VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
				qID, entry.ID, q.DomainOfKnowledge, q.Question,
				choiceA, choiceB, choiceC, choiceD,
				q.AnswerKey, q.Explanation,
			)
		}

		log.Printf("seed: inserted exam %s with %d questions", entry.ID, len(seedFile.Questions))
	}

	return nil
}
