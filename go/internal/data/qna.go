package data

func GetCourseQnA(courseID string) ([]QnAQuestion, error) {
	rows, err := db.Query(`
		SELECT q.id, q.course_id, q.subtopic_id, q.username, u.name, q.question, q.created_at
		FROM qna_questions q
		JOIN users u ON u.username = q.username
		WHERE q.course_id = $1
		ORDER BY q.created_at ASC`, courseID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var questions []QnAQuestion
	questionMap := make(map[int64]int) // id → index

	for rows.Next() {
		var q QnAQuestion
		if err := rows.Scan(&q.ID, &q.CourseID, &q.SubtopicID, &q.Username, &q.Name, &q.Question, &q.CreatedAt); err != nil {
			continue
		}
		q.Replies = []QnAReply{}
		questionMap[q.ID] = len(questions)
		questions = append(questions, q)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}

	if len(questions) == 0 {
		return questions, nil
	}

	replyRows, err := db.Query(`
		SELECT r.id, r.question_id, r.username, u.name, r.reply, r.created_at
		FROM qna_replies r
		JOIN users u ON u.username = r.username
		INNER JOIN qna_questions q ON q.id = r.question_id
		WHERE q.course_id = $1
		ORDER BY r.created_at ASC`, courseID)
	if err != nil {
		return questions, nil // return questions without replies on error
	}
	defer replyRows.Close()

	for replyRows.Next() {
		var r QnAReply
		if err := replyRows.Scan(&r.ID, &r.QuestionID, &r.Username, &r.Name, &r.Reply, &r.CreatedAt); err != nil {
			continue
		}
		if idx, ok := questionMap[r.QuestionID]; ok {
			questions[idx].Replies = append(questions[idx].Replies, r)
		}
	}

	return questions, nil
}

func CreateQnAQuestion(courseID, subtopicID, username, question string) (QnAQuestion, error) {
	var q QnAQuestion
	err := db.QueryRow(`
		INSERT INTO qna_questions (course_id, subtopic_id, username, question)
		VALUES ($1, $2, $3, $4)
		RETURNING id, course_id, subtopic_id, username,
			(SELECT name FROM users WHERE username = $3), question, created_at`,
		courseID, subtopicID, username, question,
	).Scan(&q.ID, &q.CourseID, &q.SubtopicID, &q.Username, &q.Name, &q.Question, &q.CreatedAt)
	q.Replies = []QnAReply{}
	return q, err
}

func CreateQnAReply(questionID int64, username, reply string) (QnAReply, error) {
	var r QnAReply
	err := db.QueryRow(`
		INSERT INTO qna_replies (question_id, username, reply)
		VALUES ($1, $2, $3)
		RETURNING id, question_id, username,
			(SELECT name FROM users WHERE username = $2), reply, created_at`,
		questionID, username, reply,
	).Scan(&r.ID, &r.QuestionID, &r.Username, &r.Name, &r.Reply, &r.CreatedAt)
	return r, err
}
