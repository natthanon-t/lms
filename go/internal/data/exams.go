package data

import (
	"database/sql"
	"errors"
	"fmt"
	"strings"
)

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
	// Check duplicate title
	title := strings.TrimSpace(exam.Title)
	if title != "" {
		var dupID string
		dupErr := db.QueryRow(
			`SELECT id FROM exams WHERE LOWER(TRIM(title)) = LOWER($1) AND id != $2 LIMIT 1`,
			title, exam.ID,
		).Scan(&dupID)
		if dupErr == nil {
			return Exam{}, fmt.Errorf("ชื่อข้อสอบ \"%s\" ซ้ำกับข้อสอบที่มีอยู่แล้ว", title)
		}
	}

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

	// Use a transaction for the multi-step upsert
	tx, err := db.Begin()
	if err != nil {
		return Exam{}, err
	}
	defer tx.Rollback()

	err = tx.QueryRow(`
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
	if _, err := tx.Exec(`DELETE FROM exam_domain_percentages WHERE exam_id = $1`, exam.ID); err != nil {
		return Exam{}, err
	}
	for domain, pct := range exam.DomainPercentages {
		if strings.TrimSpace(domain) == "" {
			continue
		}
		if _, err := tx.Exec(
			`INSERT INTO exam_domain_percentages (exam_id, domain, percentage) VALUES ($1,$2,$3)`,
			exam.ID, domain, pct,
		); err != nil {
			return Exam{}, err
		}
	}

	// Replace questions
	if _, err := tx.Exec(`DELETE FROM exam_questions WHERE exam_id = $1`, exam.ID); err != nil {
		return Exam{}, err
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
		if _, err := tx.Exec(
			`INSERT INTO exam_questions
			 (id, exam_id, domain, question_type, question, choice_a, choice_b, choice_c, choice_d, answer_key, explanation)
			 VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
			qID, exam.ID, q.Domain, qType, q.Question,
			choiceA, choiceB, choiceC, choiceD,
			q.AnswerKey, q.Explanation,
		); err != nil {
			return Exam{}, err
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

	if err := tx.Commit(); err != nil {
		return Exam{}, err
	}

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
