package data

import (
	"database/sql"
	"strings"
)

func ListCourses(limit, offset int) ([]Course, int, error) {
	var total int
	if err := db.QueryRow(`SELECT COUNT(*) FROM courses`).Scan(&total); err != nil {
		return nil, 0, err
	}

	rows, err := db.Query(`
		SELECT c.id, c.title, c.creator, COALESCE(c.owner_username, ''), c.status,
		       COALESCE(c.visibility, 'public'), COALESCE(c.allowed_usernames, '{}'),
		       c.description, c.image, c.content,
		       c.skill_points, c.subtopic_completion_score, c.course_completion_score, c.created_at,
		       COUNT(DISTINCT e.username) AS learner_count
		FROM courses c
		LEFT JOIN user_course_enrollments e ON e.course_id = c.id
		GROUP BY c.id
		ORDER BY learner_count DESC, c.created_at DESC
		LIMIT $1 OFFSET $2`, limit, offset)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()

	courses := make([]Course, 0)
	courseIdx := map[string]int{}
	for rows.Next() {
		var c Course
		if err := rows.Scan(
			&c.ID, &c.Title, &c.Creator, &c.OwnerUsername, &c.Status,
			&c.Visibility, (*StringArray)(&c.AllowedUsernames),
			&c.Description, &c.Image, &c.Content,
			&c.SkillPoints, &c.SubtopicCompletionScore, &c.CourseCompletionScore, &c.CreatedAt,
			&c.LearnerCount,
		); err != nil {
			return nil, 0, err
		}
		if c.AllowedUsernames == nil {
			c.AllowedUsernames = []string{}
		}
		c.SkillRewards = []SkillReward{}
		courseIdx[c.ID] = len(courses)
		courses = append(courses, c)
	}
	if err := rows.Err(); err != nil {
		return nil, 0, err
	}

	if len(courses) > 0 {
		ids := make([]string, 0, len(courses))
		for id := range courseIdx {
			ids = append(ids, id)
		}
		srRows, err := db.Query(`SELECT course_id, skill, points FROM course_skill_rewards WHERE course_id = ANY($1)`, ids)
		if err == nil {
			defer srRows.Close()
			for srRows.Next() {
				var courseID, skill string
				var points int
				if err := srRows.Scan(&courseID, &skill, &points); err != nil {
					continue
				}
				if idx, ok := courseIdx[courseID]; ok {
					courses[idx].SkillRewards = append(courses[idx].SkillRewards, SkillReward{Skill: skill, Points: points})
				}
			}
		}
	}

	return courses, total, nil
}

func UpsertCourse(c Course, callerUsername string, isAdmin bool) (Course, error) {
	var existingOwner sql.NullString
	err := db.QueryRow(`SELECT owner_username FROM courses WHERE id = $1`, c.ID).Scan(&existingOwner)
	if err != nil && err != sql.ErrNoRows {
		return Course{}, err
	}

	if err == nil {
		// Course exists — check ownership
		if !isAdmin && (!existingOwner.Valid || existingOwner.String != callerUsername) {
			return Course{}, ErrForbidden
		}
	} else {
		// New course — set caller as owner
		c.OwnerUsername = callerUsername
	}

	var ownerPtr *string
	if c.OwnerUsername != "" {
		ownerPtr = &c.OwnerUsername
	}

	if c.Visibility == "" {
		c.Visibility = "public"
	}
	if c.AllowedUsernames == nil {
		c.AllowedUsernames = []string{}
	}

	err = db.QueryRow(`
		INSERT INTO courses (id, title, creator, owner_username, status, visibility, allowed_usernames,
		                     description, image, content,
		                     skill_points, subtopic_completion_score, course_completion_score)
		VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
		ON CONFLICT (id) DO UPDATE SET
			title                     = EXCLUDED.title,
			creator                   = EXCLUDED.creator,
			status                    = EXCLUDED.status,
			visibility                = EXCLUDED.visibility,
			allowed_usernames         = EXCLUDED.allowed_usernames,
			description               = EXCLUDED.description,
			image                     = EXCLUDED.image,
			content                   = EXCLUDED.content,
			skill_points              = EXCLUDED.skill_points,
			subtopic_completion_score = EXCLUDED.subtopic_completion_score,
			course_completion_score   = EXCLUDED.course_completion_score
		RETURNING id, title, creator, COALESCE(owner_username, ''), status,
		          COALESCE(visibility, 'public'), COALESCE(allowed_usernames, '{}'),
		          description, image, content,
		          skill_points, subtopic_completion_score, course_completion_score, created_at`,
		c.ID, c.Title, c.Creator, ownerPtr, c.Status, c.Visibility, StringArray(c.AllowedUsernames),
		c.Description, c.Image, c.Content,
		c.SkillPoints, c.SubtopicCompletionScore, c.CourseCompletionScore,
	).Scan(
		&c.ID, &c.Title, &c.Creator, &c.OwnerUsername, &c.Status,
		&c.Visibility, (*StringArray)(&c.AllowedUsernames),
		&c.Description, &c.Image, &c.Content,
		&c.SkillPoints, &c.SubtopicCompletionScore, &c.CourseCompletionScore, &c.CreatedAt,
	)
	if err != nil {
		return Course{}, err
	}

	if _, err := db.Exec(`DELETE FROM course_skill_rewards WHERE course_id = $1`, c.ID); err != nil {
		return c, err
	}
	for _, sr := range c.SkillRewards {
		if strings.TrimSpace(sr.Skill) == "" {
			continue
		}
		if _, err := db.Exec(
			`INSERT INTO course_skill_rewards (course_id, skill, points) VALUES ($1,$2,$3)`,
			c.ID, sr.Skill, sr.Points,
		); err != nil {
			return c, err
		}
	}

	return c, nil
}

func UpdateCourseStatus(id, status, callerUsername string, isAdmin bool) error {
	var ownerUsername sql.NullString
	err := db.QueryRow(`SELECT owner_username FROM courses WHERE id = $1`, id).Scan(&ownerUsername)
	if err == sql.ErrNoRows {
		return sql.ErrNoRows
	}
	if err != nil {
		return err
	}
	if !isAdmin && (!ownerUsername.Valid || ownerUsername.String != callerUsername) {
		return ErrForbidden
	}
	_, err = db.Exec(`UPDATE courses SET status = $2 WHERE id = $1`, id, status)
	return err
}

func DeleteCourse(id, callerUsername string, isAdmin bool) error {
	var ownerUsername sql.NullString
	err := db.QueryRow(`SELECT owner_username FROM courses WHERE id = $1`, id).Scan(&ownerUsername)
	if err == sql.ErrNoRows {
		return sql.ErrNoRows
	}
	if err != nil {
		return err
	}
	if !isAdmin && (!ownerUsername.Valid || ownerUsername.String != callerUsername) {
		return ErrForbidden
	}
	_, err = db.Exec(`DELETE FROM courses WHERE id = $1`, id)
	return err
}
