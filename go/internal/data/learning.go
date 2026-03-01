package data

func EnsureEnrollment(username, courseID string) error {
	_, err := db.Exec(`
		INSERT INTO user_course_enrollments (username, course_id)
		VALUES ($1, $2)
		ON CONFLICT (username, course_id) DO NOTHING`,
		username, courseID)
	return err
}

func MarkSubtopicComplete(username, courseID, subtopicID string) error {
	if err := EnsureEnrollment(username, courseID); err != nil {
		return err
	}
	_, err := db.Exec(`
		INSERT INTO learning_subtopic_progress (username, course_id, subtopic_id)
		VALUES ($1, $2, $3)
		ON CONFLICT (username, course_id, subtopic_id) DO NOTHING`,
		username, courseID, subtopicID)
	return err
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
