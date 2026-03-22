package data

import (
	"database/sql"
	"encoding/json"
	"errors"
	"fmt"
	"log"
	"os"
	"path/filepath"
)

// ── Seed-file JSON structures ─────────────────────────────────────────────────

type examSeedIndexEntry struct {
	ID               string `json:"id"`
	Title            string `json:"title"`
	Description      string `json:"description"`
	Instructions     string `json:"instructions"`
	NumberOfQuestions int    `json:"numberOfQuestions"`
	DefaultTime      int    `json:"defaultTime"`
	File             string `json:"file"`
	Image            string `json:"image"`
}

type examSeedFile struct {
	ExamName          string             `json:"Exam Name"`
	NumberOfQuestions  int                `json:"Number of Questions"`
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
