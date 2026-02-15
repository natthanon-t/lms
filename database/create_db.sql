/* =========================================================
   LMS (Learning Management System) - PostgreSQL Schema
   Based on requirements: users/roles, courses/contents,
   file upload, progress tracking, practice+Q&A, skills tags,
   exams/quizzes + reports.
   ========================================================= */

BEGIN;

-- ---------- DROP (order-safe) ----------
DROP TABLE IF EXISTS quiz_attempt_answers CASCADE;
DROP TABLE IF EXISTS quiz_attempts CASCADE;
DROP TABLE IF EXISTS quiz_questions CASCADE;
DROP TABLE IF EXISTS quizzes CASCADE;

DROP TABLE IF EXISTS exercise_submissions CASCADE;
DROP TABLE IF EXISTS exercises CASCADE;

DROP TABLE IF EXISTS lesson_questions CASCADE;

DROP TABLE IF EXISTS recommendations CASCADE;
DROP TABLE IF EXISTS user_skill_progress CASCADE;
DROP TABLE IF EXISTS lesson_skill_tags CASCADE;
DROP TABLE IF EXISTS skill_tags CASCADE;

DROP TABLE IF EXISTS lesson_progress CASCADE;
DROP TABLE IF EXISTS lesson_attachments CASCADE;
DROP TABLE IF EXISTS lesson_contents CASCADE;
DROP TABLE IF EXISTS lessons CASCADE;
DROP TABLE IF EXISTS course_modules CASCADE;
DROP TABLE IF EXISTS enrollments CASCADE;
DROP TABLE IF EXISTS courses CASCADE;

DROP TABLE IF EXISTS role_permissions CASCADE;
DROP TABLE IF EXISTS user_roles CASCADE;
DROP TABLE IF EXISTS permissions CASCADE;
DROP TABLE IF EXISTS roles CASCADE;

DROP TABLE IF EXISTS users CASCADE;
DROP TABLE IF EXISTS user_status CASCADE;

-- ---------- MASTER: user status ----------
CREATE TABLE user_status (
  id   INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name VARCHAR(30) NOT NULL UNIQUE
);

-- seed statuses (ปรับได้)
INSERT INTO user_status(name) VALUES ('active'), ('suspended')
ON CONFLICT DO NOTHING;

-- ---------- USERS ----------
CREATE TABLE users (
  id            BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_name     VARCHAR(30) NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  full_name     VARCHAR(50) NOT NULL,
  status_id     INT NOT NULL REFERENCES user_status(id)
);

CREATE INDEX IF NOT EXISTS ix_users_status ON users(status_id);

-- ---------- ROLES / PERMISSIONS ----------
CREATE TABLE roles (
  id   INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name VARCHAR(30) NOT NULL UNIQUE
);

CREATE TABLE permissions (
  id   INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name VARCHAR(20) NOT NULL
  code VARCHAR(80) NOT NULL UNIQUE,
);

CREATE TABLE user_roles (
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role_id INT NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  PRIMARY KEY (user_id, role_id)
);

CREATE TABLE role_permissions (
  role_id       INT NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  permission_id INT NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
  PRIMARY KEY (role_id, permission_id)
);

-- ---------- COURSES / ENROLLMENTS ----------
CREATE TABLE courses (
  id           BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  code         VARCHAR(50) UNIQUE,
  title        VARCHAR(200) NOT NULL,
  description  TEXT,
  created_by   BIGINT NOT NULL REFERENCES users(id),
  is_published BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE INDEX IF NOT EXISTS ix_courses_created_by ON courses(created_by);

-- -???
CREATE TABLE enrollments (
  course_id    BIGINT NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  user_id      BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  enrolled_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (course_id, user_id)
);

CREATE INDEX IF NOT EXISTS ix_enrollments_user ON enrollments(user_id);

-- ---------- MODULES / LESSONS (บท/หัวข้อย่อย) ----------
CREATE TABLE course_modules (
  id        BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  course_id BIGINT NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  title     VARCHAR(200) NOT NULL,
  position  INT NOT NULL DEFAULT 1,
  UNIQUE (course_id, position)
);

CREATE INDEX IF NOT EXISTS ix_course_modules_course ON course_modules(course_id);

CREATE TABLE lessons (
  id         BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  module_id  BIGINT NOT NULL REFERENCES course_modules(id) ON DELETE CASCADE,
  title      VARCHAR(200) NOT NULL,
  position   INT NOT NULL DEFAULT 1,
  is_active  BOOLEAN NOT NULL DEFAULT TRUE,
  UNIQUE (module_id, position)
);

CREATE INDEX IF NOT EXISTS ix_lessons_module ON lessons(module_id);

-- ---------- LESSON CONTENT (ข้อความ/รูปภาพ) ----------
CREATE TABLE lesson_contents (
  id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  lesson_id   BIGINT NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
  content_type VARCHAR(20) NOT NULL CHECK (content_type IN ('text','image')),
  body_text   TEXT,
  image_url   TEXT,
  position    INT NOT NULL DEFAULT 1,
  CHECK (
    (content_type = 'text'  AND body_text IS NOT NULL AND image_url IS NULL) OR
    (content_type = 'image' AND image_url IS NOT NULL AND body_text IS NULL)
  ),
  UNIQUE (lesson_id, position)
);

CREATE INDEX IF NOT EXISTS ix_lesson_contents_lesson ON lesson_contents(lesson_id);

-- ---------- FILE UPLOADS (PDF, etc.) ----------
CREATE TABLE lesson_attachments (
  id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  lesson_id   BIGINT NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
  file_name   VARCHAR(255) NOT NULL,
  file_type   VARCHAR(80),
  file_size   BIGINT,
  file_url    TEXT NOT NULL,          -- เก็บ URL/path ไปที่ object storage
  uploaded_by BIGINT NOT NULL REFERENCES users(id),
  uploaded_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS ix_lesson_attachments_lesson ON lesson_attachments(lesson_id);

-- ---------- PROGRESS TRACKING ----------
CREATE TABLE lesson_progress (
  lesson_id     BIGINT NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
  user_id       BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status        VARCHAR(20) NOT NULL DEFAULT 'not_started'
                CHECK (status IN ('not_started','in_progress','completed')),
  completed_at  TIMESTAMPTZ,
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (lesson_id, user_id)
);

CREATE INDEX IF NOT EXISTS ix_lesson_progress_user ON lesson_progress(user_id);

-- ---------- Q&A PER LESSON (ตอบคำถาม/ส่งคำตอบ) ----------
CREATE TABLE lesson_questions (
  id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  lesson_id   BIGINT NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
  question    TEXT NOT NULL,
  created_by  BIGINT NOT NULL REFERENCES users(id),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS ix_lesson_questions_lesson ON lesson_questions(lesson_id);

-- ---------- PRACTICE / EXERCISES ----------
CREATE TABLE exercises (
  id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  lesson_id   BIGINT REFERENCES lessons(id) ON DELETE SET NULL,
  title       VARCHAR(200) NOT NULL,
  prompt      TEXT NOT NULL,
  created_by  BIGINT NOT NULL REFERENCES users(id),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS ix_exercises_lesson ON exercises(lesson_id);

CREATE TABLE exercise_submissions (
  id           BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  exercise_id  BIGINT NOT NULL REFERENCES exercises(id) ON DELETE CASCADE,
  user_id      BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  answer_text  TEXT,
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  score        NUMERIC(5,2),
  feedback     TEXT
);

CREATE INDEX IF NOT EXISTS ix_exercise_submissions_ex ON exercise_submissions(exercise_id);
CREATE INDEX IF NOT EXISTS ix_exercise_submissions_user ON exercise_submissions(user_id);

-- ---------- SKILL TAGS (แท็กทักษะตามหัวข้อ) ----------
CREATE TABLE skill_tags (
  id    BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  code  VARCHAR(60) NOT NULL UNIQUE,
  name  VARCHAR(120) NOT NULL
);

CREATE TABLE lesson_skill_tags (
  lesson_id BIGINT NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
  tag_id    BIGINT NOT NULL REFERENCES skill_tags(id) ON DELETE CASCADE,
  PRIMARY KEY (lesson_id, tag_id)
);

CREATE TABLE user_skill_progress (
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  tag_id  BIGINT NOT NULL REFERENCES skill_tags(id) ON DELETE CASCADE,
  level   INT NOT NULL DEFAULT 0 CHECK (level BETWEEN 0 AND 100),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, tag_id)
);

CREATE INDEX IF NOT EXISTS ix_user_skill_progress_user ON user_skill_progress(user_id);

-- ---------- RECOMMENDATIONS (แนะนำเนื้อหาตามทักษะที่ยังไม่เรียน) ----------
CREATE TABLE recommendations (
  id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id     BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  lesson_id   BIGINT NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
  reason      TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, lesson_id)
);

CREATE INDEX IF NOT EXISTS ix_recommendations_user ON recommendations(user_id);

-- ---------- QUIZZES / EXAMS ----------
CREATE TABLE quizzes (
  id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  course_id   BIGINT NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  title       VARCHAR(200) NOT NULL,
  description TEXT,
  mode        VARCHAR(20) NOT NULL DEFAULT 'ordered'
              CHECK (mode IN ('ordered','random')),
  time_limit_minutes INT CHECK (time_limit_minutes IS NULL OR time_limit_minutes > 0),
  created_by  BIGINT NOT NULL REFERENCES users(id),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS ix_quizzes_course ON quizzes(course_id);

CREATE TABLE quiz_questions (
  id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  quiz_id     BIGINT NOT NULL REFERENCES quizzes(id) ON DELETE CASCADE,
  question_no INT NOT NULL,
  question    TEXT NOT NULL,
  choice_a    TEXT NOT NULL,
  choice_b    TEXT NOT NULL,
  choice_c    TEXT NOT NULL,
  choice_d    TEXT NOT NULL,
  correct_choice CHAR(1) NOT NULL CHECK (correct_choice IN ('A','B','C','D')),
  explanation TEXT,
  UNIQUE (quiz_id, question_no)
);

CREATE INDEX IF NOT EXISTS ix_quiz_questions_quiz ON quiz_questions(quiz_id);

CREATE TABLE quiz_attempts (
  id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  quiz_id     BIGINT NOT NULL REFERENCES quizzes(id) ON DELETE CASCADE,
  user_id     BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  started_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  finished_at TIMESTAMPTZ,
  score       NUMERIC(5,2),
  UNIQUE (quiz_id, user_id, started_at)
);

CREATE INDEX IF NOT EXISTS ix_quiz_attempts_quiz_user ON quiz_attempts(quiz_id, user_id);

CREATE TABLE quiz_attempt_answers (
  attempt_id   BIGINT NOT NULL REFERENCES quiz_attempts(id) ON DELETE CASCADE,
  question_id  BIGINT NOT NULL REFERENCES quiz_questions(id) ON DELETE CASCADE,
  chosen_choice CHAR(1) CHECK (chosen_choice IN ('A','B','C','D')),
  is_correct   BOOLEAN,
  answered_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (attempt_id, question_id)
);

COMMIT;
-- End of LMS database schema