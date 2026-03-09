package data

import "time"

type DailyExamStat struct {
	Day  string `json:"day"`
	Pass int    `json:"pass"`
	Fail int    `json:"fail"`
}

type CreatorStat struct {
	Name  string `json:"name"`
	Count int    `json:"count"`
}

type CourseStatusStat struct {
	Course     string `json:"course"`
	Completed  int    `json:"completed"`
	InProgress int    `json:"inProgress"`
	NotStarted int    `json:"notStarted"`
}

type EnrollmentStat struct {
	Course string `json:"course"`
	Count  int    `json:"count"`
}

type AnalyticsSummary struct {
	DailyExamActivity  []DailyExamStat    `json:"dailyExamActivity"`
	TopCreators        []CreatorStat      `json:"topCreators"`
	MonthlyCompletions []int              `json:"monthlyCompletions"`
	CourseStatus       []CourseStatusStat `json:"courseStatus"`
	TopEnrollment      []EnrollmentStat   `json:"topEnrollment"`
}

type CourseLearnerStatus struct {
	Username      string     `json:"username"`
	Name          string     `json:"name"`
	EmployeeCode  string     `json:"employeeCode"`
	Status        string     `json:"status"`
	AnsweredCount int        `json:"answeredCount"`
	StartedAt     *time.Time `json:"startedAt"`
	FinishedAt    *time.Time `json:"finishedAt"`
}

var thaiISODayNames = map[int]string{
	1: "จ.", 2: "อ.", 3: "พ.", 4: "พฤ.", 5: "ศ.", 6: "ส.", 7: "อา.",
}

func GetAnalyticsSummary() (AnalyticsSummary, error) {
	var s AnalyticsSummary
	var err error

	if s.DailyExamActivity, err = getDailyExamActivity(); err != nil {
		return s, err
	}
	if s.TopCreators, err = getTopCreators(); err != nil {
		return s, err
	}
	if s.MonthlyCompletions, err = getMonthlyCompletions(); err != nil {
		return s, err
	}
	if s.CourseStatus, err = getCourseStatus(); err != nil {
		return s, err
	}
	if s.TopEnrollment, err = getTopEnrollment(); err != nil {
		return s, err
	}
	return s, nil
}

func getDailyExamActivity() ([]DailyExamStat, error) {
	stats := make(map[int]*DailyExamStat, 7)
	for dow := 1; dow <= 7; dow++ {
		stats[dow] = &DailyExamStat{Day: thaiISODayNames[dow]}
	}

	rows, err := db.Query(`
		SELECT
			EXTRACT(ISODOW FROM started_at)::int AS dow,
			COUNT(CASE WHEN score_percent >= 60 THEN 1 END) AS pass_count,
			COUNT(CASE WHEN score_percent < 60  THEN 1 END) AS fail_count
		FROM exam_attempts
		WHERE finished_at IS NOT NULL
		  AND started_at >= DATE_TRUNC('week', NOW())
		GROUP BY dow
		ORDER BY dow`)
	if err != nil {
		return buildDaySlice(stats), err
	}
	defer rows.Close()
	for rows.Next() {
		var dow, pass, fail int
		if err := rows.Scan(&dow, &pass, &fail); err != nil {
			continue
		}
		if s, ok := stats[dow]; ok {
			s.Pass = pass
			s.Fail = fail
		}
	}
	return buildDaySlice(stats), rows.Err()
}

func buildDaySlice(stats map[int]*DailyExamStat) []DailyExamStat {
	result := make([]DailyExamStat, 7)
	for i := range result {
		result[i] = *stats[i+1]
	}
	return result
}

func getTopCreators() ([]CreatorStat, error) {
	rows, err := db.Query(`
		SELECT creator, COUNT(*) AS count
		FROM courses
		WHERE creator != ''
		GROUP BY creator
		ORDER BY count DESC
		LIMIT 5`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var result []CreatorStat
	for rows.Next() {
		var s CreatorStat
		if err := rows.Scan(&s.Name, &s.Count); err != nil {
			continue
		}
		result = append(result, s)
	}
	return result, rows.Err()
}

func getMonthlyCompletions() ([]int, error) {
	result := make([]int, 12)
	rows, err := db.Query(`
		SELECT EXTRACT(MONTH FROM completed_at)::int AS month, COUNT(*) AS count
		FROM user_course_enrollments
		WHERE completed_at IS NOT NULL
		  AND EXTRACT(YEAR FROM completed_at) = EXTRACT(YEAR FROM NOW())
		GROUP BY month
		ORDER BY month`)
	if err != nil {
		return result, err
	}
	defer rows.Close()
	for rows.Next() {
		var month, count int
		if err := rows.Scan(&month, &count); err != nil {
			continue
		}
		if month >= 1 && month <= 12 {
			result[month-1] = count
		}
	}
	return result, rows.Err()
}

func getCourseStatus() ([]CourseStatusStat, error) {
	var totalLearners int
	_ = db.QueryRow(`
		SELECT COUNT(*) FROM users u
		WHERE u.status = 'active'
		  AND u.role_code NOT IN (
			SELECT DISTINCT role_code FROM role_permissions
			WHERE permission_code = 'management.users.manage'
		  )`).Scan(&totalLearners)

	rows, err := db.Query(`
		SELECT
			c.title,
			COUNT(CASE WHEN e.completed_at IS NOT NULL THEN 1 END)                        AS completed,
			COUNT(CASE WHEN e.completed_at IS NULL AND e.username IS NOT NULL THEN 1 END) AS in_progress,
			COUNT(DISTINCT e.username)                                                    AS total_enrolled
		FROM courses c
		LEFT JOIN user_course_enrollments e ON e.course_id = c.id
		GROUP BY c.id, c.title
		ORDER BY total_enrolled DESC
		LIMIT 5`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var result []CourseStatusStat
	for rows.Next() {
		var s CourseStatusStat
		var totalEnrolled int
		if err := rows.Scan(&s.Course, &s.Completed, &s.InProgress, &totalEnrolled); err != nil {
			continue
		}
		s.NotStarted = totalLearners - totalEnrolled
		if s.NotStarted < 0 {
			s.NotStarted = 0
		}
		result = append(result, s)
	}
	return result, rows.Err()
}

func getTopEnrollment() ([]EnrollmentStat, error) {
	rows, err := db.Query(`
		SELECT c.title, COUNT(DISTINCT e.username) AS count
		FROM courses c
		LEFT JOIN user_course_enrollments e ON e.course_id = c.id
		GROUP BY c.id, c.title
		ORDER BY count DESC
		LIMIT 5`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var result []EnrollmentStat
	for rows.Next() {
		var s EnrollmentStat
		if err := rows.Scan(&s.Course, &s.Count); err != nil {
			continue
		}
		result = append(result, s)
	}
	return result, rows.Err()
}

func GetCourseLearners(courseID string) ([]CourseLearnerStatus, error) {
	rows, err := db.Query(`
		SELECT
			u.username,
			u.name,
			COALESCE(u.employee_code, '') AS employee_code,
			e.enrolled_at,
			e.completed_at,
			COALESCE(a.answered_count, 0) AS answered_count
		FROM users u
		LEFT JOIN user_course_enrollments e
			ON e.username = u.username AND e.course_id = $1
		LEFT JOIN (
			SELECT username, COUNT(DISTINCT question_id) AS answered_count
			FROM learning_subtopic_answers
			WHERE course_id = $1
			GROUP BY username
		) a ON a.username = u.username
		WHERE u.status = 'active'
		ORDER BY
			CASE
				WHEN e.completed_at IS NOT NULL THEN 0
				WHEN e.enrolled_at  IS NOT NULL THEN 1
				ELSE 2
			END,
			u.name`, courseID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var result []CourseLearnerStatus
	for rows.Next() {
		var s CourseLearnerStatus
		var enrolledAt, completedAt *time.Time
		if err := rows.Scan(
			&s.Username, &s.Name, &s.EmployeeCode,
			&enrolledAt, &completedAt,
			&s.AnsweredCount,
		); err != nil {
			continue
		}
		s.StartedAt = enrolledAt
		s.FinishedAt = completedAt
		switch {
		case completedAt != nil:
			s.Status = "completed"
		case enrolledAt != nil:
			s.Status = "in_progress"
		default:
			s.Status = "not_started"
		}
		result = append(result, s)
	}
	return result, rows.Err()
}
