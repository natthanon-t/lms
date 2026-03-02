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
	`)
	return err
}

// ── Read ──────────────────────────────────────────────────────────────────────

func ListExams() ([]Exam, error) {
	rows, err := db.Query(`
		SELECT id, title, creator, COALESCE(owner_username, ''), status,
		       description, instructions, image,
		       number_of_questions, default_time, max_attempts, created_at
		FROM exams
		ORDER BY created_at DESC`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	exams := make([]Exam, 0)
	examIdx := map[string]int{}
	for rows.Next() {
		var e Exam
		if err := rows.Scan(
			&e.ID, &e.Title, &e.Creator, &e.OwnerUsername, &e.Status,
			&e.Description, &e.Instructions, &e.Image,
			&e.NumberOfQuestions, &e.DefaultTime, &e.MaxAttempts, &e.CreatedAt,
		); err != nil {
			return nil, err
		}
		e.DomainPercentages = map[string]int{}
		e.Questions = []ExamQuestion{}
		examIdx[e.ID] = len(exams)
		exams = append(exams, e)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}

	// Load domain percentages for all exams
	dpRows, err := db.Query(`SELECT exam_id, domain, percentage FROM exam_domain_percentages`)
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

	return exams, nil
}

func GetExam(id string) (*Exam, error) {
	var e Exam
	err := db.QueryRow(`
		SELECT id, title, creator, COALESCE(owner_username, ''), status,
		       description, instructions, image,
		       number_of_questions, default_time, max_attempts, created_at
		FROM exams WHERE id = $1`, id,
	).Scan(
		&e.ID, &e.Title, &e.Creator, &e.OwnerUsername, &e.Status,
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
		SELECT id, exam_id, domain, question,
		       choice_a, choice_b, choice_c, choice_d,
		       answer_key, explanation
		FROM exam_questions WHERE exam_id = $1 ORDER BY id`, id)
	if err == nil {
		defer qRows.Close()
		for qRows.Next() {
			var q ExamQuestion
			var choiceA, choiceB, choiceC, choiceD string
			if err := qRows.Scan(
				&q.ID, &q.ExamID, &q.Domain, &q.Question,
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

	err = db.QueryRow(`
		INSERT INTO exams (id, title, creator, owner_username, status,
		                   description, instructions, image,
		                   number_of_questions, default_time, max_attempts)
		VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
		ON CONFLICT (id) DO UPDATE SET
			title               = EXCLUDED.title,
			creator             = EXCLUDED.creator,
			status              = EXCLUDED.status,
			description         = EXCLUDED.description,
			instructions        = EXCLUDED.instructions,
			image               = EXCLUDED.image,
			number_of_questions = EXCLUDED.number_of_questions,
			default_time        = EXCLUDED.default_time,
			max_attempts        = EXCLUDED.max_attempts
		RETURNING id, title, creator, COALESCE(owner_username, ''), status,
		          description, instructions, image,
		          number_of_questions, default_time, max_attempts, created_at`,
		exam.ID, exam.Title, exam.Creator, ownerPtr, exam.Status,
		exam.Description, exam.Instructions, exam.Image,
		exam.NumberOfQuestions, exam.DefaultTime, exam.MaxAttempts,
	).Scan(
		&exam.ID, &exam.Title, &exam.Creator, &exam.OwnerUsername, &exam.Status,
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
			 (id, exam_id, domain, question, choice_a, choice_b, choice_c, choice_d, answer_key, explanation)
			 VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
			qID, exam.ID, q.Domain, q.Question,
			choiceA, choiceB, choiceC, choiceD,
			q.AnswerKey, q.Explanation,
		); err != nil {
			return exam, err
		}
		savedQuestions = append(savedQuestions, ExamQuestion{
			ID:          qID,
			ExamID:      exam.ID,
			Domain:      q.Domain,
			Question:    q.Question,
			Choices:     q.Choices,
			AnswerKey:   q.AnswerKey,
			Explanation: q.Explanation,
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

// ── Attempts ──────────────────────────────────────────────────────────────────

func SaveExamAttempt(examID, username string, correctCount, totalQuestions int, scorePercent float64, domainStats map[string]ExamDomainStat, answers []ExamAnswerInput) (ExamAttempt, error) {
	if domainStats == nil {
		domainStats = map[string]ExamDomainStat{}
	}
	domainStatsJSON, err := json.Marshal(domainStats)
	if err != nil {
		return ExamAttempt{}, err
	}

	var attempt ExamAttempt
	var domainStatsRaw json.RawMessage
	var finishedAt sql.NullTime

	err = db.QueryRow(`
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

	// Save per-question answers (ignore FK errors if question was removed)
	for _, ans := range answers {
		_, _ = db.Exec(
			`INSERT INTO exam_attempt_answers (attempt_id, question_id, selected, is_correct)
			 VALUES ($1,$2,$3,$4)
			 ON CONFLICT (attempt_id, question_id) DO UPDATE
			   SET selected = EXCLUDED.selected, is_correct = EXCLUDED.is_correct`,
			attempt.ID, ans.QuestionID, ans.Selected, ans.IsCorrect,
		)
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
			SELECT a.question_id, q.domain, q.question,
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
				&d.QuestionID, &d.Domain, &d.Question,
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
