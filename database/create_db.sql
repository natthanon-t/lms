/* =========================================================
   CBT-LMS — PostgreSQL Schema
   Managed by: database/Dockerfile → /docker-entrypoint-initdb.d/
   ========================================================= */

BEGIN;

-- ---------- DROP (order-safe) ----------
DROP TABLE IF EXISTS exam_attempt_answers CASCADE;
DROP TABLE IF EXISTS exam_attempts CASCADE;
DROP TABLE IF EXISTS exam_domain_percentages CASCADE;
DROP TABLE IF EXISTS exam_questions CASCADE;
DROP TABLE IF EXISTS exams CASCADE;

DROP TABLE IF EXISTS learning_subtopic_answers CASCADE;
DROP TABLE IF EXISTS learning_subtopic_progress CASCADE;

DROP TABLE IF EXISTS course_skill_rewards CASCADE;
DROP TABLE IF EXISTS courses CASCADE;

DROP TABLE IF EXISTS refresh_tokens CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- ==========================================================
-- USERS & AUTH
-- ==========================================================

CREATE TABLE users (
  id            BIGSERIAL PRIMARY KEY,
  name          TEXT NOT NULL,
  username      TEXT NOT NULL UNIQUE,
  employee_code TEXT NOT NULL DEFAULT '',
  password_hash TEXT NOT NULL,
  role          TEXT NOT NULL DEFAULT 'user',
  status        TEXT NOT NULL DEFAULT 'active',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE refresh_tokens (
  id          BIGSERIAL PRIMARY KEY,
  user_id     BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash  TEXT NOT NULL UNIQUE,
  expires_at  TIMESTAMPTZ NOT NULL,
  revoked_at  TIMESTAMPTZ NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ==========================================================
-- COURSES (เนื้อหา)
-- ==========================================================

CREATE TABLE courses (
  id                        TEXT PRIMARY KEY,
  title                     TEXT NOT NULL,
  creator                   TEXT NOT NULL DEFAULT '',
  owner_username            TEXT REFERENCES users(username) ON DELETE SET NULL,
  status                    TEXT NOT NULL DEFAULT 'inprogress'
                            CHECK (status IN ('active', 'inprogress', 'inactive')),
  description               TEXT NOT NULL DEFAULT '',
  image                     TEXT NOT NULL DEFAULT '',
  content                   TEXT NOT NULL DEFAULT '',   -- Markdown
  skill_points              INT NOT NULL DEFAULT 0,     -- default score per skill reward
  subtopic_completion_score INT NOT NULL DEFAULT 0,
  course_completion_score   INT NOT NULL DEFAULT 0,
  created_at                TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX ix_courses_owner ON courses(owner_username);

-- ทักษะและคะแนนที่ได้เมื่อเรียนจบ course นี้
CREATE TABLE course_skill_rewards (
  course_id TEXT NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  skill     TEXT NOT NULL,
  points    INT  NOT NULL DEFAULT 0,
  PRIMARY KEY (course_id, skill)
);

-- ==========================================================
-- LEARNING PROGRESS (ความคืบหน้าการเรียน)
-- ==========================================================

-- subtopic ที่ผู้ใช้ทำเสร็จแล้ว
-- subtopic_id คือ hash-based ID ที่ generate จาก heading ใน markdown
CREATE TABLE learning_subtopic_progress (
  username     TEXT NOT NULL REFERENCES users(username) ON DELETE CASCADE,
  course_id    TEXT NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  subtopic_id  TEXT NOT NULL,
  completed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (username, course_id, subtopic_id)
);

CREATE INDEX ix_subtopic_progress_user ON learning_subtopic_progress(username);

-- คำตอบของผู้ใช้ต่อคำถามในแต่ละ subtopic
-- question_id คือ hash-based ID ที่ generate จากข้อความคำถามใน markdown
CREATE TABLE learning_subtopic_answers (
  username     TEXT    NOT NULL REFERENCES users(username) ON DELETE CASCADE,
  course_id    TEXT    NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  subtopic_id  TEXT    NOT NULL,
  question_id  TEXT    NOT NULL,
  typed_answer TEXT    NOT NULL DEFAULT '',
  is_correct   BOOLEAN NOT NULL DEFAULT FALSE,
  answered_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (username, course_id, subtopic_id, question_id)
);

CREATE INDEX ix_subtopic_answers_user ON learning_subtopic_answers(username);

-- ==========================================================
-- EXAMS (ข้อสอบ)
-- ==========================================================

CREATE TABLE exams (
  id                  TEXT PRIMARY KEY,
  title               TEXT NOT NULL,
  creator             TEXT NOT NULL DEFAULT '',
  owner_username      TEXT REFERENCES users(username) ON DELETE SET NULL,
  status              TEXT NOT NULL DEFAULT 'inprogress'
                      CHECK (status IN ('active', 'inprogress', 'inactive')),
  description         TEXT NOT NULL DEFAULT '',
  instructions        TEXT NOT NULL DEFAULT '',
  image               TEXT NOT NULL DEFAULT '',
  number_of_questions INT  NOT NULL DEFAULT 0,
  default_time        INT  NOT NULL DEFAULT 0,  -- minutes
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX ix_exams_owner ON exams(owner_username);

-- สัดส่วนของแต่ละ domain ที่จะสุ่มออกข้อสอบ
CREATE TABLE exam_domain_percentages (
  exam_id    TEXT NOT NULL REFERENCES exams(id) ON DELETE CASCADE,
  domain     TEXT NOT NULL,
  percentage INT  NOT NULL CHECK (percentage BETWEEN 0 AND 100),
  PRIMARY KEY (exam_id, domain)
);

-- คำถามในข้อสอบ (multiple choice 4 ตัวเลือก)
CREATE TABLE exam_questions (
  id          TEXT PRIMARY KEY,
  exam_id     TEXT NOT NULL REFERENCES exams(id) ON DELETE CASCADE,
  domain      TEXT NOT NULL DEFAULT '',
  question    TEXT NOT NULL,
  choice_a    TEXT NOT NULL DEFAULT '',
  choice_b    TEXT NOT NULL DEFAULT '',
  choice_c    TEXT NOT NULL DEFAULT '',
  choice_d    TEXT NOT NULL DEFAULT '',
  answer_key  TEXT NOT NULL DEFAULT '',   -- ข้อที่ถูก (ตัวอักษรหรือข้อความ)
  explanation TEXT NOT NULL DEFAULT ''
);

CREATE INDEX ix_exam_questions_exam ON exam_questions(exam_id);

-- ==========================================================
-- EXAM ATTEMPTS (การทำข้อสอบ)
-- ==========================================================

CREATE TABLE exam_attempts (
  id              BIGSERIAL PRIMARY KEY,
  username        TEXT    NOT NULL REFERENCES users(username) ON DELETE CASCADE,
  exam_id         TEXT    NOT NULL REFERENCES exams(id) ON DELETE CASCADE,
  correct_count   INT     NOT NULL DEFAULT 0,
  total_questions INT     NOT NULL DEFAULT 0,
  score_percent   NUMERIC(5,2) NOT NULL DEFAULT 0,
  started_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  finished_at     TIMESTAMPTZ
);

CREATE INDEX ix_exam_attempts_user ON exam_attempts(username);
CREATE INDEX ix_exam_attempts_exam ON exam_attempts(exam_id);

-- คำตอบในแต่ละครั้งที่ทำข้อสอบ
CREATE TABLE exam_attempt_answers (
  attempt_id  BIGINT  NOT NULL REFERENCES exam_attempts(id) ON DELETE CASCADE,
  question_id TEXT    NOT NULL REFERENCES exam_questions(id) ON DELETE CASCADE,
  selected    TEXT    NOT NULL DEFAULT '',  -- ตัวเลือกที่เลือก
  is_correct  BOOLEAN NOT NULL DEFAULT FALSE,
  PRIMARY KEY (attempt_id, question_id)
);

COMMIT;
