/* =========================================================
   CBT-LMS — PostgreSQL Schema
   Managed by: database/Dockerfile → /docker-entrypoint-initdb.d/
   ========================================================= */

BEGIN;

-- ---------- DROP (order-safe) ----------
DROP TABLE IF EXISTS app_settings CASCADE;
DROP TABLE IF EXISTS exam_attempt_answers CASCADE;
DROP TABLE IF EXISTS exam_attempts CASCADE;
DROP TABLE IF EXISTS exam_domain_percentages CASCADE;
DROP TABLE IF EXISTS exam_questions CASCADE;
DROP TABLE IF EXISTS exams CASCADE;

DROP TABLE IF EXISTS learning_subtopic_answers CASCADE;
DROP TABLE IF EXISTS learning_subtopic_progress CASCADE;
DROP TABLE IF EXISTS user_course_enrollments CASCADE;

DROP TABLE IF EXISTS course_skill_rewards CASCADE;
DROP TABLE IF EXISTS courses CASCADE;

DROP TABLE IF EXISTS course_content_images CASCADE;
DROP TABLE IF EXISTS user_avatars CASCADE;
DROP TABLE IF EXISTS user_score_events CASCADE;
DROP TABLE IF EXISTS user_skill_scores CASCADE;
DROP TABLE IF EXISTS user_scores CASCADE;
DROP TABLE IF EXISTS user_login_logs CASCADE;
DROP TABLE IF EXISTS refresh_tokens CASCADE;
DROP TABLE IF EXISTS role_permissions CASCADE;
DROP TABLE IF EXISTS roles CASCADE;
DROP TABLE IF EXISTS permissions CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- ==========================================================
-- USERS & AUTH
-- ==========================================================

CREATE TABLE roles (
  code         TEXT         PRIMARY KEY,
  name         TEXT         NOT NULL,
  created_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE TABLE users (
  id            BIGSERIAL    PRIMARY KEY,
  name          TEXT         NOT NULL,
  username      TEXT         NOT NULL UNIQUE,
  employee_code TEXT         NOT NULL DEFAULT '',
  password_hash TEXT         NOT NULL,
  role_code     TEXT         NOT NULL DEFAULT 'user',
  status        TEXT         NOT NULL DEFAULT 'active',
  created_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  CONSTRAINT fk_users_role
    FOREIGN KEY (role_code) REFERENCES roles(code)
);

CREATE TABLE refresh_tokens (
  id          BIGSERIAL    PRIMARY KEY,
  user_id     BIGINT       NOT NULL,
  token_hash  TEXT         NOT NULL UNIQUE,
  expires_at  TIMESTAMPTZ  NOT NULL,
  revoked_at  TIMESTAMPTZ  NULL,
  created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  CONSTRAINT fk_refresh_tokens_user
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE permissions (
  code         TEXT         PRIMARY KEY,
  module       TEXT         NOT NULL,
  action       TEXT         NOT NULL,
  description  TEXT         NOT NULL DEFAULT '',
  created_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE TABLE role_permissions (
  role_code        TEXT         NOT NULL,
  permission_code  TEXT         NOT NULL,
  created_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  PRIMARY KEY (role_code, permission_code),
  CONSTRAINT fk_role_permissions_role
    FOREIGN KEY (role_code) REFERENCES roles(code) ON DELETE CASCADE,
  CONSTRAINT fk_role_permissions_permission
    FOREIGN KEY (permission_code) REFERENCES permissions(code) ON DELETE CASCADE
);

-- ประวัติการ login ของผู้ใช้
CREATE TABLE user_login_logs (
  id          BIGSERIAL    PRIMARY KEY,
  user_id     BIGINT       NOT NULL,
  logged_in_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT fk_login_logs_user
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX ix_refresh_tokens_user ON refresh_tokens(user_id);
CREATE INDEX ix_users_role_code ON users(role_code);
CREATE INDEX ix_role_permissions_permission ON role_permissions(permission_code);
CREATE INDEX ix_role_permissions_role_code ON role_permissions(role_code);

CREATE INDEX ix_login_logs_user ON user_login_logs(user_id);
CREATE INDEX ix_login_logs_time ON user_login_logs(logged_in_at);

CREATE TABLE app_settings (
  key        TEXT        PRIMARY KEY,
  value      TEXT        NOT NULL DEFAULT '',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- รูป avatar ของผู้ใช้
CREATE TABLE user_avatars (
  username   TEXT        PRIMARY KEY,
  data_url   TEXT        NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT fk_user_avatars_user
    FOREIGN KEY (username) REFERENCES users(username) ON DELETE CASCADE
);

-- คะแนนรวมของผู้ใช้
CREATE TABLE user_scores (
  username   TEXT        PRIMARY KEY,
  total      INT         NOT NULL DEFAULT 0 CHECK (total >= 0),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT fk_user_scores_user
    FOREIGN KEY (username) REFERENCES users(username) ON DELETE CASCADE
);

-- ประวัติการได้คะแนนของผู้ใช้ (สำหรับ leaderboard รายช่วงเวลา)
CREATE TABLE user_score_events (
  id        BIGSERIAL    PRIMARY KEY,
  username  TEXT         NOT NULL,
  score     INT          NOT NULL,
  reason    TEXT         NOT NULL,  -- 'subtopic_complete' | 'course_complete'
  course_id TEXT,
  earned_at TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  CONSTRAINT fk_score_events_user
    FOREIGN KEY (username) REFERENCES users(username) ON DELETE CASCADE
);

CREATE INDEX ix_score_events_user ON user_score_events(username);
CREATE INDEX ix_score_events_time ON user_score_events(earned_at);

-- คะแนนแยกตามทักษะของผู้ใช้
CREATE TABLE user_skill_scores (
  username   TEXT NOT NULL,
  skill      TEXT NOT NULL,
  points     INT  NOT NULL DEFAULT 0 CHECK (points >= 0),
  PRIMARY KEY (username, skill),
  CONSTRAINT fk_user_skill_scores_user
    FOREIGN KEY (username) REFERENCES users(username) ON DELETE CASCADE
);

-- ==========================================================
-- COURSES (เนื้อหา)
-- ==========================================================

CREATE TABLE courses (
  id                        TEXT         PRIMARY KEY,
  title                     TEXT         NOT NULL,
  creator                   TEXT         NOT NULL DEFAULT '',
  owner_username            TEXT,
  status                    TEXT         NOT NULL DEFAULT 'inprogress'
                            CHECK (status IN ('active', 'inprogress', 'inactive')),
  visibility                TEXT         NOT NULL DEFAULT 'public'
                            CHECK (visibility IN ('public', 'private')),
  allowed_usernames         TEXT[]       NOT NULL DEFAULT '{}',
  description               TEXT         NOT NULL DEFAULT '',
  image                     TEXT         NOT NULL DEFAULT '',
  content                   TEXT         NOT NULL DEFAULT '',   -- Markdown
  skill_points              INT          NOT NULL DEFAULT 0,
  subtopic_completion_score INT          NOT NULL DEFAULT 0,
  course_completion_score   INT          NOT NULL DEFAULT 0,
  created_at                TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  CONSTRAINT fk_courses_owner
    FOREIGN KEY (owner_username) REFERENCES users(username) ON DELETE SET NULL
);

CREATE INDEX ix_courses_owner  ON courses(owner_username);
CREATE INDEX ix_courses_status ON courses(status) WHERE status = 'active';  -- 🟡 partial index: browse active courses

-- รูปภาพในเนื้อหาของ course
CREATE TABLE course_content_images (
  course_id  TEXT NOT NULL,
  filename   TEXT NOT NULL,
  data_url   TEXT NOT NULL,
  PRIMARY KEY (course_id, filename),
  CONSTRAINT fk_content_images_course
    FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE
);

-- ทักษะและคะแนนที่ได้เมื่อเรียนจบ course นี้
CREATE TABLE course_skill_rewards (
  course_id TEXT  NOT NULL,
  skill     TEXT  NOT NULL,
  points    INT   NOT NULL DEFAULT 0,
  PRIMARY KEY (course_id, skill),
  CONSTRAINT fk_course_skill_rewards_course
    FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE
);

-- ==========================================================
-- LEARNING PROGRESS (ความคืบหน้าการเรียน)
-- ==========================================================

-- รายการลงทะเบียนเรียนของพนักงานแต่ละคน (เริ่มเรียน course ไหน เมื่อไหร่)
CREATE TABLE user_course_enrollments (
  username     TEXT         NOT NULL,
  course_id    TEXT         NOT NULL,
  enrolled_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ  NULL,
  PRIMARY KEY (username, course_id),
  CONSTRAINT fk_enrollments_user
    FOREIGN KEY (username)  REFERENCES users(username) ON DELETE CASCADE,
  CONSTRAINT fk_enrollments_course
    FOREIGN KEY (course_id) REFERENCES courses(id)    ON DELETE CASCADE
);

CREATE INDEX ix_enrollments_user       ON user_course_enrollments(username);
CREATE INDEX ix_enrollments_course     ON user_course_enrollments(course_id);
CREATE INDEX ix_enrollments_incomplete ON user_course_enrollments(username)    -- 🟡 partial index: in-progress courses
  WHERE completed_at IS NULL;

-- subtopic ที่ผู้ใช้ทำเสร็จแล้ว
CREATE TABLE learning_subtopic_progress (
  username     TEXT         NOT NULL,
  course_id    TEXT         NOT NULL,
  subtopic_id  TEXT         NOT NULL,
  completed_at TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  PRIMARY KEY (username, course_id, subtopic_id),
  CONSTRAINT fk_subtopic_progress_user
    FOREIGN KEY (username)  REFERENCES users(username) ON DELETE CASCADE,
  CONSTRAINT fk_subtopic_progress_course
    FOREIGN KEY (course_id) REFERENCES courses(id)    ON DELETE CASCADE
);

CREATE INDEX ix_subtopic_progress_user        ON learning_subtopic_progress(username);
CREATE INDEX ix_subtopic_progress_user_course ON learning_subtopic_progress(username, course_id);  -- 🔴 composite: progress ใน course

-- คำตอบของผู้ใช้ต่อคำถามในแต่ละ subtopic
CREATE TABLE learning_subtopic_answers (
  username     TEXT         NOT NULL,
  course_id    TEXT         NOT NULL,
  subtopic_id  TEXT         NOT NULL,
  question_id  TEXT         NOT NULL,
  typed_answer TEXT         NOT NULL DEFAULT '',
  is_correct   BOOLEAN      NOT NULL DEFAULT FALSE,
  answered_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  PRIMARY KEY (username, course_id, subtopic_id, question_id),
  CONSTRAINT fk_subtopic_answers_user
    FOREIGN KEY (username)  REFERENCES users(username) ON DELETE CASCADE,
  CONSTRAINT fk_subtopic_answers_course
    FOREIGN KEY (course_id) REFERENCES courses(id)    ON DELETE CASCADE
);

CREATE INDEX ix_subtopic_answers_user ON learning_subtopic_answers(username);

-- เวลา (วินาที) ที่ผู้ใช้อยู่ในแต่ละ subtopic
CREATE TABLE learning_subtopic_time (
  username      TEXT        NOT NULL,
  course_id     TEXT        NOT NULL,
  subtopic_id   TEXT        NOT NULL,
  seconds_spent INTEGER     NOT NULL DEFAULT 0,
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (username, course_id, subtopic_id),
  CONSTRAINT fk_subtopic_time_user
    FOREIGN KEY (username)  REFERENCES users(username) ON DELETE CASCADE,
  CONSTRAINT fk_subtopic_time_course
    FOREIGN KEY (course_id) REFERENCES courses(id)    ON DELETE CASCADE
);

CREATE INDEX ix_subtopic_time_user ON learning_subtopic_time(username);

-- ==========================================================
-- EXAMS (ข้อสอบ)
-- ==========================================================

CREATE TABLE exams (
  id                  TEXT         PRIMARY KEY,
  title               TEXT         NOT NULL,
  creator             TEXT         NOT NULL DEFAULT '',
  owner_username      TEXT,
  status              TEXT         NOT NULL DEFAULT 'inprogress'
                      CHECK (status IN ('active', 'inprogress', 'inactive')),
  visibility          TEXT         NOT NULL DEFAULT 'public'
                      CHECK (visibility IN ('public', 'private')),
  allowed_usernames   TEXT[]       NOT NULL DEFAULT '{}',
  description         TEXT         NOT NULL DEFAULT '',
  instructions        TEXT         NOT NULL DEFAULT '',
  image               TEXT         NOT NULL DEFAULT '',
  number_of_questions INT          NOT NULL DEFAULT 0,
  default_time        INT          NOT NULL DEFAULT 0,  -- minutes
  max_attempts        INT          NOT NULL DEFAULT 0,  -- 0 = unlimited
  created_at          TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  CONSTRAINT fk_exams_owner
    FOREIGN KEY (owner_username) REFERENCES users(username) ON DELETE SET NULL
);

CREATE INDEX ix_exams_owner ON exams(owner_username);

-- สัดส่วนของแต่ละ domain ที่จะสุ่มออกข้อสอบ
CREATE TABLE exam_domain_percentages (
  exam_id    TEXT  NOT NULL,
  domain     TEXT  NOT NULL,
  percentage INT   NOT NULL CHECK (percentage BETWEEN 0 AND 100),
  PRIMARY KEY (exam_id, domain),
  CONSTRAINT fk_exam_domain_percentages_exam
    FOREIGN KEY (exam_id) REFERENCES exams(id) ON DELETE CASCADE
);

-- คำถามในข้อสอบ
CREATE TABLE exam_questions (
  id            TEXT  PRIMARY KEY,
  exam_id       TEXT  NOT NULL,
  domain        TEXT  NOT NULL DEFAULT '',
  question_type TEXT  NOT NULL DEFAULT 'multiple_choice',  -- multiple_choice | text
  question      TEXT  NOT NULL DEFAULT '',
  choice_a      TEXT  NOT NULL DEFAULT '',
  choice_b      TEXT  NOT NULL DEFAULT '',
  choice_c      TEXT  NOT NULL DEFAULT '',
  choice_d      TEXT  NOT NULL DEFAULT '',
  answer_key    TEXT  NOT NULL DEFAULT '',   -- ข้อที่ถูก (ว่างสำหรับ text type)
  explanation   TEXT  NOT NULL DEFAULT '',
  CONSTRAINT fk_exam_questions_exam
    FOREIGN KEY (exam_id) REFERENCES exams(id) ON DELETE CASCADE
);

CREATE INDEX ix_exam_questions_exam        ON exam_questions(exam_id);
CREATE INDEX ix_exam_questions_exam_domain ON exam_questions(exam_id, domain, id);  -- 🔴 composite: สุ่มข้อสอบตาม domain

-- ==========================================================
-- EXAM ATTEMPTS (การทำข้อสอบ)
-- ==========================================================

CREATE TABLE exam_attempts (
  id              BIGSERIAL     PRIMARY KEY,
  username        TEXT          NOT NULL,
  exam_id         TEXT          NOT NULL,
  correct_count   INT           NOT NULL DEFAULT 0,
  total_questions INT           NOT NULL DEFAULT 0,
  score_percent   NUMERIC(5,2)  NOT NULL DEFAULT 0,
  domain_stats    JSONB         NOT NULL DEFAULT '{}',
  started_at      TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  finished_at     TIMESTAMPTZ,
  CONSTRAINT fk_exam_attempts_user
    FOREIGN KEY (username) REFERENCES users(username) ON DELETE CASCADE,
  CONSTRAINT fk_exam_attempts_exam
    FOREIGN KEY (exam_id)  REFERENCES exams(id)       ON DELETE CASCADE
);

CREATE INDEX ix_exam_attempts_user ON exam_attempts(username);
CREATE INDEX ix_exam_attempts_exam ON exam_attempts(exam_id);

-- คำตอบในแต่ละครั้งที่ทำข้อสอบ
CREATE TABLE exam_attempt_answers (
  attempt_id  BIGINT   NOT NULL,
  question_id TEXT     NOT NULL,
  selected    TEXT     NOT NULL DEFAULT '',  -- ตัวเลือกที่เลือก / ข้อความที่พิมพ์
  is_correct  BOOLEAN,                       -- NULL = text type (ไม่มีเฉลยตายตัว)
  PRIMARY KEY (attempt_id, question_id),
  CONSTRAINT fk_attempt_answers_attempt
    FOREIGN KEY (attempt_id)  REFERENCES exam_attempts(id)   ON DELETE CASCADE,
  CONSTRAINT fk_attempt_answers_question
    FOREIGN KEY (question_id) REFERENCES exam_questions(id)  ON DELETE CASCADE
);

COMMIT;
