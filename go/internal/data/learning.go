package data

func RecordScoreEvent(username, reason, courseID string, score int) {
	_, _ = db.Exec(
		`INSERT INTO user_score_events (username, score, reason, course_id) VALUES ($1, $2, $3, NULLIF($4, ''))`,
		username, score, reason, courseID,
	)
}

func AddTotalScore(username string, delta int) error {
	_, err := db.Exec(`
		INSERT INTO user_scores (username, total, updated_at)
		VALUES ($1, $2, NOW())
		ON CONFLICT (username) DO UPDATE
			SET total      = user_scores.total + EXCLUDED.total,
			    updated_at = NOW()`,
		username, delta)
	return err
}

func AddSkillScore(username, skill string, delta int) error {
	_, err := db.Exec(`
		INSERT INTO user_skill_scores (username, skill, points)
		VALUES ($1, $2, $3)
		ON CONFLICT (username, skill) DO UPDATE
			SET points = user_skill_scores.points + EXCLUDED.points`,
		username, skill, delta)
	return err
}

func GetUserScores(username string) (total int, skills map[string]int, err error) {
	skills = make(map[string]int)
	_ = db.QueryRow(`SELECT total FROM user_scores WHERE username = $1`, username).Scan(&total)

	rows, err := db.Query(`SELECT skill, points FROM user_skill_scores WHERE username = $1`, username)
	if err != nil {
		return total, skills, err
	}
	defer rows.Close()
	for rows.Next() {
		var skill string
		var points int
		if err := rows.Scan(&skill, &points); err != nil {
			continue
		}
		skills[skill] = points
	}
	return total, skills, rows.Err()
}

func AwardCourseCompletion(username, courseID string) (int, []SkillReward, error) {
	result, err := db.Exec(`
		UPDATE user_course_enrollments
		SET completed_at = NOW()
		WHERE username = $1 AND course_id = $2 AND completed_at IS NULL`,
		username, courseID)
	if err != nil {
		return 0, nil, err
	}
	affected, _ := result.RowsAffected()
	if affected == 0 {
		return 0, nil, nil // already awarded
	}

	var courseScore int
	_ = db.QueryRow(`SELECT course_completion_score FROM courses WHERE id = $1`, courseID).Scan(&courseScore)
	if courseScore > 0 {
		_ = AddTotalScore(username, courseScore)
		RecordScoreEvent(username, "course_complete", courseID, courseScore)
	}

	rows, err := db.Query(`SELECT skill, points FROM course_skill_rewards WHERE course_id = $1`, courseID)
	if err != nil {
		return courseScore, nil, err
	}
	defer rows.Close()
	var rewards []SkillReward
	for rows.Next() {
		var r SkillReward
		if err := rows.Scan(&r.Skill, &r.Points); err != nil {
			continue
		}
		_ = AddSkillScore(username, r.Skill, r.Points)
		rewards = append(rewards, r)
	}
	return courseScore, rewards, rows.Err()
}

func EnsureEnrollment(username, courseID string) error {
	_, err := db.Exec(`
		INSERT INTO user_course_enrollments (username, course_id)
		VALUES ($1, $2)
		ON CONFLICT (username, course_id) DO NOTHING`,
		username, courseID)
	return err
}

func MarkSubtopicComplete(username, courseID, subtopicID string) (awardedScore int, err error) {
	if err := EnsureEnrollment(username, courseID); err != nil {
		return 0, err
	}
	result, err := db.Exec(`
		INSERT INTO learning_subtopic_progress (username, course_id, subtopic_id)
		VALUES ($1, $2, $3)
		ON CONFLICT (username, course_id, subtopic_id) DO NOTHING`,
		username, courseID, subtopicID)
	if err != nil {
		return 0, err
	}
	affected, _ := result.RowsAffected()
	if affected == 0 {
		return 0, nil // already completed before, no score
	}

	var score int
	_ = db.QueryRow(`SELECT subtopic_completion_score FROM courses WHERE id = $1`, courseID).Scan(&score)
	if score > 0 {
		_ = AddTotalScore(username, score)
		RecordScoreEvent(username, "subtopic_complete", courseID, score)
	}
	return score, nil
}

func UpsertSubtopicAnswer(username, courseID, subtopicID, questionID, typedAnswer string, isCorrect bool) error {
	if err := EnsureEnrollment(username, courseID); err != nil {
		return err
	}
	_, err := db.Exec(`
		INSERT INTO learning_subtopic_answers (username, course_id, subtopic_id, question_id, typed_answer, is_correct)
		VALUES ($1, $2, $3, $4, $5, $6)
		ON CONFLICT (username, course_id, subtopic_id, question_id) DO UPDATE
			SET typed_answer = EXCLUDED.typed_answer,
			    is_correct   = EXCLUDED.is_correct,
			    answered_at  = NOW()`,
		username, courseID, subtopicID, questionID, typedAnswer, isCorrect)
	return err
}

func GetLearningProgress(username string) (map[string]CourseProgress, error) {
	result := make(map[string]CourseProgress)

	rows, err := db.Query(`
		SELECT course_id, subtopic_id
		FROM learning_subtopic_progress
		WHERE username = $1`, username)
	if err != nil {
		return result, err
	}
	defer rows.Close()
	for rows.Next() {
		var courseID, subtopicID string
		if err := rows.Scan(&courseID, &subtopicID); err != nil {
			continue
		}
		cp := getOrCreateCourseProgress(result, courseID)
		cp.CompletedSubtopics[subtopicID] = true
		result[courseID] = cp
	}

	answerRows, err := db.Query(`
		SELECT course_id, subtopic_id, question_id, typed_answer, is_correct
		FROM learning_subtopic_answers
		WHERE username = $1`, username)
	if err != nil {
		return result, err
	}
	defer answerRows.Close()
	for answerRows.Next() {
		var courseID, subtopicID, questionID, typedAnswer string
		var isCorrect bool
		if err := answerRows.Scan(&courseID, &subtopicID, &questionID, &typedAnswer, &isCorrect); err != nil {
			continue
		}
		cp := getOrCreateCourseProgress(result, courseID)
		if cp.Answers[subtopicID] == nil {
			cp.Answers[subtopicID] = make(map[string]AnswerProgress)
		}
		cp.Answers[subtopicID][questionID] = AnswerProgress{TypedAnswer: typedAnswer, IsCorrect: isCorrect}
		result[courseID] = cp
	}

	return result, nil
}

func GetLeaderboard() ([]LeaderboardEntry, error) {
	rows, err := db.Query(`
		SELECT
			u.username,
			u.name,
			u.role,
			COALESCE(s.total, 0)  AS total_score,
			COALESCE(ec.cnt, 0)   AS completed_courses,
			COALESCE(aq.cnt, 0)   AS solved_questions
		FROM users u
		LEFT JOIN user_scores s ON s.username = u.username
		LEFT JOIN (
			SELECT username, COUNT(*) AS cnt
			FROM user_course_enrollments
			WHERE completed_at IS NOT NULL
			GROUP BY username
		) ec ON ec.username = u.username
		LEFT JOIN (
			SELECT username, COUNT(*) AS cnt
			FROM learning_subtopic_answers
			WHERE is_correct = true
			GROUP BY username
		) aq ON aq.username = u.username
		WHERE u.status = 'active'
		ORDER BY total_score DESC, completed_courses DESC`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var entries []LeaderboardEntry
	for rows.Next() {
		var e LeaderboardEntry
		if err := rows.Scan(&e.Username, &e.Name, &e.Role, &e.TotalScore, &e.CompletedCourses, &e.SolvedQuestions); err != nil {
			return nil, err
		}
		entries = append(entries, e)
	}
	return entries, rows.Err()
}

func getOrCreateCourseProgress(result map[string]CourseProgress, courseID string) CourseProgress {
	cp, ok := result[courseID]
	if !ok {
		cp = CourseProgress{
			CompletedSubtopics: make(map[string]bool),
			Answers:            make(map[string]map[string]AnswerProgress),
		}
	}
	return cp
}
