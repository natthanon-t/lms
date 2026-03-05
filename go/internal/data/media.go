package data

import (
	"database/sql"
	"errors"
)

func GetAvatar(username string) (string, error) {
	var dataURL string
	err := db.QueryRow(`SELECT data_url FROM user_avatars WHERE username = $1`, username).Scan(&dataURL)
	if errors.Is(err, sql.ErrNoRows) {
		return "", nil
	}
	return dataURL, err
}

func SaveAvatar(username, dataURL string) error {
	_, err := db.Exec(`
		INSERT INTO user_avatars (username, data_url, updated_at)
		VALUES ($1, $2, NOW())
		ON CONFLICT (username) DO UPDATE
			SET data_url = EXCLUDED.data_url, updated_at = NOW()`,
		username, dataURL)
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
		var filename, dataURL string
		if err := rows.Scan(&filename, &dataURL); err != nil {
			return nil, err
		}
		images[filename] = dataURL
	}
	return images, rows.Err()
}

func SaveCourseImage(courseID, filename, dataURL string) error {
	_, err := db.Exec(`
		INSERT INTO course_content_images (course_id, filename, data_url)
		VALUES ($1, $2, $3)
		ON CONFLICT (course_id, filename) DO UPDATE
			SET data_url = EXCLUDED.data_url`,
		courseID, filename, dataURL)
	return err
}
