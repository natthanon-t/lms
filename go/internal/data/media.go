package data

import (
	"database/sql"
	"errors"
)

func GetAvatar(username string) (string, error) {
	var url string
	err := db.QueryRow(`SELECT data_url FROM user_avatars WHERE username = $1`, username).Scan(&url)
	if errors.Is(err, sql.ErrNoRows) {
		return "", nil
	}
	return url, err
}

func SaveAvatar(username, url string) error {
	_, err := db.Exec(`
		INSERT INTO user_avatars (username, data_url, updated_at)
		VALUES ($1, $2, NOW())
		ON CONFLICT (username) DO UPDATE
			SET data_url = EXCLUDED.data_url, updated_at = NOW()`,
		username, url)
	return err
}

func GetCourseImages(courseID string) (map[string]string, error) {
	rows, err := db.Query(`SELECT filename, data_url FROM course_content_images WHERE course_id = $1`, courseID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	images := make(map[string]string)
	for rows.Next() {
		var filename, url string
		if err := rows.Scan(&filename, &url); err != nil {
			return nil, err
		}
		images[filename] = url
	}
	return images, rows.Err()
}

func SaveCourseImage(courseID, filename, url string) error {
	_, err := db.Exec(`
		INSERT INTO course_content_images (course_id, filename, data_url)
		VALUES ($1, $2, $3)
		ON CONFLICT (course_id, filename) DO UPDATE
			SET data_url = EXCLUDED.data_url`,
		courseID, filename, url)
	return err
}

// ── Course Attachments ────────────────────────────────────────────────────────

func GetCourseAttachments(courseID string) ([]CourseAttachment, error) {
	rows, err := db.Query(
		`SELECT id, course_id, stored_name, orig_name, url_path, uploaded_at
		 FROM course_attachments WHERE course_id = $1 ORDER BY uploaded_at DESC`,
		courseID,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	result := make([]CourseAttachment, 0)
	for rows.Next() {
		var a CourseAttachment
		if err := rows.Scan(&a.ID, &a.CourseID, &a.StoredName, &a.OrigName, &a.URLPath, &a.UploadedAt); err != nil {
			return nil, err
		}
		result = append(result, a)
	}
	return result, rows.Err()
}

func GetCourseAttachment(id int64, courseID string) (CourseAttachment, error) {
	var a CourseAttachment
	err := db.QueryRow(
		`SELECT id, course_id, stored_name, orig_name, url_path, uploaded_at
		 FROM course_attachments WHERE id = $1 AND course_id = $2`,
		id, courseID,
	).Scan(&a.ID, &a.CourseID, &a.StoredName, &a.OrigName, &a.URLPath, &a.UploadedAt)
	if errors.Is(err, sql.ErrNoRows) {
		return CourseAttachment{}, sql.ErrNoRows
	}
	return a, err
}

func SaveCourseAttachment(courseID, storedName, origName, urlPath string) (CourseAttachment, error) {
	var a CourseAttachment
	err := db.QueryRow(
		`INSERT INTO course_attachments (course_id, stored_name, orig_name, url_path)
		 VALUES ($1, $2, $3, $4)
		 RETURNING id, course_id, stored_name, orig_name, url_path, uploaded_at`,
		courseID, storedName, origName, urlPath,
	).Scan(&a.ID, &a.CourseID, &a.StoredName, &a.OrigName, &a.URLPath, &a.UploadedAt)
	return a, err
}

func DeleteCourseAttachment(id int64, courseID string) error {
	_, err := db.Exec(
		`DELETE FROM course_attachments WHERE id = $1 AND course_id = $2`,
		id, courseID,
	)
	return err
}
