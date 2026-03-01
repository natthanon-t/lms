package data

import (
	"database/sql"
	"strings"
)

func ListCourses() ([]Course, error) {
	rows, err := db.Query(`
		SELECT id, title, creator, COALESCE(owner_username, ''), status, description, image, content,
		       skill_points, subtopic_completion_score, course_completion_score, created_at
		FROM courses
		ORDER BY created_at DESC`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	courses := make([]Course, 0)
	courseIdx := map[string]int{}
	for rows.Next() {
		var c Course
		if err := rows.Scan(
			&c.ID, &c.Title, &c.Creator, &c.OwnerUsername, &c.Status,
			&c.Description, &c.Image, &c.Content,
			&c.SkillPoints, &c.SubtopicCompletionScore, &c.CourseCompletionScore, &c.CreatedAt,
		); err != nil {
			return nil, err
		}
		c.SkillRewards = []SkillReward{}
		courseIdx[c.ID] = len(courses)
		courses = append(courses, c)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}

	srRows, err := db.Query(`SELECT course_id, skill, points FROM course_skill_rewards`)
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

	return courses, nil
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

	err = db.QueryRow(`
		INSERT INTO courses (id, title, creator, owner_username, status, description, image, content,
		                     skill_points, subtopic_completion_score, course_completion_score)
		VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
		ON CONFLICT (id) DO UPDATE SET
			title                    = EXCLUDED.title,
			creator                  = EXCLUDED.creator,
			status                   = EXCLUDED.status,
			description              = EXCLUDED.description,
			image                    = EXCLUDED.image,
			content                  = EXCLUDED.content,
			skill_points             = EXCLUDED.skill_points,
			subtopic_completion_score = EXCLUDED.subtopic_completion_score,
			course_completion_score  = EXCLUDED.course_completion_score
		RETURNING id, title, creator, COALESCE(owner_username, ''), status, description, image, content,
		          skill_points, subtopic_completion_score, course_completion_score, created_at`,
		c.ID, c.Title, c.Creator, ownerPtr, c.Status, c.Description, c.Image, c.Content,
		c.SkillPoints, c.SubtopicCompletionScore, c.CourseCompletionScore,
	).Scan(
		&c.ID, &c.Title, &c.Creator, &c.OwnerUsername, &c.Status,
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
