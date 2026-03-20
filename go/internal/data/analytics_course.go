package data

import "time"

// ── Types ────────────────────────────────────────────────────────────────────

type CourseInstructorStats struct {
	ID             string `json:"id"`
	Title          string `json:"title"`
	Learners       int    `json:"learners"`
	Completed      int    `json:"completed"`
	InProgress     int    `json:"inProgress"`
	NotStarted     int    `json:"notStarted"`
	AvgScore       int    `json:"avgScore"`
	QnaTotal       int    `json:"qnaTotal"`
	QnaUnanswered  int    `json:"qnaUnanswered"`
}

type SubtopicTimeStat struct {
	SubtopicID string  `json:"subtopicId"`
	Name       string  `json:"name"`
	AvgMinutes float64 `json:"avgMinutes"`
	Learners   int     `json:"learners"`
}

type UnansweredQnA struct {
	ID         int64     `json:"id"`
	SubtopicID string    `json:"subtopicId"`
	Question   string    `json:"question"`
	Asker      string    `json:"asker"`
	CreatedAt  time.Time `json:"createdAt"`
}

type CourseDetailAnalytics struct {
	SubtopicTime  []SubtopicTimeStat `json:"subtopicTime"`
	UnansweredQnA []UnansweredQnA    `json:"unansweredQna"`
}

// ── Queries ──────────────────────────────────────────────────────────────────

// GetAllCourseStats returns per-course stats for all courses (or filtered by owner).
func GetAllCourseStats(ownerUsername string) ([]CourseInstructorStats, error) {
	// Count total active learners (non-admin) for NotStarted calculation
	var totalLearners int
	_ = db.QueryRow(`
		SELECT COUNT(*) FROM users u
		WHERE u.status = 'active'
		  AND u.role_code NOT IN (
			SELECT DISTINCT role_code FROM role_permissions
			WHERE permission_code = 'management.users.manage'
		  )`).Scan(&totalLearners)

	query := `
		SELECT
			c.id,
			c.title,
			COUNT(DISTINCT e.username)                                                    AS learners,
			COUNT(DISTINCT CASE WHEN e.completed_at IS NOT NULL THEN e.username END)      AS completed,
			COUNT(DISTINCT CASE WHEN e.completed_at IS NULL AND e.username IS NOT NULL THEN e.username END) AS in_progress,
			COALESCE((SELECT COUNT(*) FROM qna_questions WHERE course_id = c.id), 0)      AS qna_total,
			COALESCE((
				SELECT COUNT(*) FROM qna_questions q2
				WHERE q2.course_id = c.id
				  AND NOT EXISTS (SELECT 1 FROM qna_replies r WHERE r.question_id = q2.id)
			), 0) AS qna_unanswered
		FROM courses c
		LEFT JOIN user_course_enrollments e ON e.course_id = c.id
	`
	args := []interface{}{}
	if ownerUsername != "" {
		query += ` WHERE c.owner_username = $1`
		args = append(args, ownerUsername)
	}
	query += ` GROUP BY c.id, c.title ORDER BY learners DESC`

	rows, err := db.Query(query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var result []CourseInstructorStats
	for rows.Next() {
		var s CourseInstructorStats
		if err := rows.Scan(&s.ID, &s.Title, &s.Learners, &s.Completed, &s.InProgress, &s.QnaTotal, &s.QnaUnanswered); err != nil {
			continue
		}
		s.NotStarted = totalLearners - s.Learners
		if s.NotStarted < 0 {
			s.NotStarted = 0
		}
		// AvgScore: average subtopic-answer correct rate for this course
		var avgScore *float64
		_ = db.QueryRow(`
			SELECT ROUND(AVG(CASE WHEN is_correct THEN 100 ELSE 0 END))
			FROM learning_subtopic_answers
			WHERE course_id = $1`, s.ID).Scan(&avgScore)
		if avgScore != nil {
			s.AvgScore = int(*avgScore)
		}
		result = append(result, s)
	}
	return result, rows.Err()
}

// GetCourseSubtopicTime returns average time per subtopic for a course.
func GetCourseSubtopicTime(courseID string) ([]SubtopicTimeStat, error) {
	rows, err := db.Query(`
		SELECT
			subtopic_id,
			ROUND(AVG(seconds_spent) / 60.0, 1) AS avg_minutes,
			COUNT(DISTINCT username) AS learners
		FROM learning_subtopic_time
		WHERE course_id = $1 AND seconds_spent > 0
		GROUP BY subtopic_id
		ORDER BY avg_minutes DESC`, courseID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var result []SubtopicTimeStat
	for rows.Next() {
		var s SubtopicTimeStat
		if err := rows.Scan(&s.SubtopicID, &s.AvgMinutes, &s.Learners); err != nil {
			continue
		}
		s.Name = s.SubtopicID // frontend will map to display name
		result = append(result, s)
	}
	return result, rows.Err()
}

// GetCourseUnansweredQnA returns Q&A questions without any replies.
func GetCourseUnansweredQnA(courseID string) ([]UnansweredQnA, error) {
	rows, err := db.Query(`
		SELECT q.id, q.subtopic_id, q.question, u.name, q.created_at
		FROM qna_questions q
		JOIN users u ON u.username = q.username
		WHERE q.course_id = $1
		  AND NOT EXISTS (SELECT 1 FROM qna_replies r WHERE r.question_id = q.id)
		ORDER BY q.created_at DESC`, courseID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var result []UnansweredQnA
	for rows.Next() {
		var q UnansweredQnA
		if err := rows.Scan(&q.ID, &q.SubtopicID, &q.Question, &q.Asker, &q.CreatedAt); err != nil {
			continue
		}
		result = append(result, q)
	}
	return result, rows.Err()
}
