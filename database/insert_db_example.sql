/* =========================================================
   CBT-LMS — Sample Data (1 row per table)
   ========================================================= */

BEGIN;

-- ==========================================================
-- USERS & AUTH
-- ==========================================================

-- Roles
INSERT INTO roles (code, name)
VALUES ('admin', 'Administrator');

-- Permissions
INSERT INTO permissions (code, module, action, description)
VALUES ('user.create', 'user', 'create', 'Create new user');

-- Users
INSERT INTO users
  (name, username, employee_code, password_hash, role_code, status)
VALUES
  ('Administrator', 'admin', 'ADM001',
   '$2a$10$example_hash_admin', 'admin', 'active');

-- Role Permissions
INSERT INTO role_permissions (role_code, permission_code)
VALUES ('admin', 'user.create');

-- User Login Logs
INSERT INTO user_login_logs (user_id, logged_in_at)
VALUES (1, NOW());

-- Refresh Tokens
INSERT INTO refresh_tokens (user_id, token_hash, expires_at)
VALUES (1, 'example_token_hash_1', NOW() + INTERVAL '7 days');

-- App Settings
INSERT INTO app_settings (key, value)
VALUES ('default_reset_password', 'securepassword123');

-- User Avatars
INSERT INTO user_avatars (username, data_url)
VALUES ('admin', '/uploads/avatars/admin.png');

-- User Scores
INSERT INTO user_scores (username, total)
VALUES ('admin', 150);

-- User Score Events
INSERT INTO user_score_events (username, score, reason, course_id)
VALUES ('admin', 50, 'subtopic_complete', 'COURSE001');

-- User Skill Scores
INSERT INTO user_skill_scores (username, skill, points)
VALUES ('admin', 'communication', 25);

-- ==========================================================
-- COURSES
-- ==========================================================

-- Courses
INSERT INTO courses
  (id, title, creator, owner_username, status, visibility,
   description, skill_points, subtopic_completion_score, course_completion_score)
VALUES
  ('COURSE001', 'Introduction to Programming',
   'john_instructor', 'john_instructor',
   'active', 'public',
   'Learn the basics of programming',
   100, 10, 50);

-- Course Content Images
INSERT INTO course_content_images (course_id, filename, data_url)
VALUES ('COURSE001', 'cover.png', '/uploads/courses/COURSE001/cover.png');

-- Course Attachments
INSERT INTO course_attachments
  (course_id, stored_name, orig_name, url_path)
VALUES
  ('COURSE001', 'module1_lessons.pdf', 'Module 1 - Lessons.pdf',
   '/uploads/courses/COURSE001/attachments/module1_lessons.pdf');

-- Course Skill Rewards
INSERT INTO course_skill_rewards (course_id, skill, points)
VALUES ('COURSE001', 'communication', 25);

-- ==========================================================
-- LEARNING PROGRESS
-- ==========================================================

-- Enrollments
INSERT INTO user_course_enrollments (username, course_id, enrolled_at)
VALUES ('admin', 'COURSE001', NOW() - INTERVAL '30 days');

-- Subtopic Progress
INSERT INTO learning_subtopic_progress (username, course_id, subtopic_id)
VALUES ('admin', 'COURSE001', 'SUBTOPIC001');

-- Subtopic Answers
INSERT INTO learning_subtopic_answers
  (username, course_id, subtopic_id, question_id, typed_answer, is_correct)
VALUES
  ('admin', 'COURSE001', 'SUBTOPIC001', 'Q001',
   'This is my answer', TRUE);

-- Subtopic Time
INSERT INTO learning_subtopic_time (username, course_id, subtopic_id, seconds_spent)
VALUES ('admin', 'COURSE001', 'SUBTOPIC001', 1800);

-- ==========================================================
-- Q&A
-- ==========================================================

-- Questions
INSERT INTO qna_questions (course_id, subtopic_id, username, question)
VALUES ('COURSE001', 'SUBTOPIC001', 'admin',
        'How do I declare a variable in Python?');

-- Replies
INSERT INTO qna_replies (question_id, username, reply)
VALUES (1, 'admin',
        'In Python, you use the syntax: variable_name = value');

-- ==========================================================
-- EXAMS
-- ==========================================================

-- Exams
INSERT INTO exams
  (id, title, creator, owner_username, status, visibility,
   description, instructions, number_of_questions, default_time, max_attempts)
VALUES
  ('EXAM001', 'Programming Basics Quiz', 'admin', 'admin',
   'active', 'public',
   'Test your understanding of programming basics',
   'Answer all questions. Select the best answer.',
   10, 30, 3);

-- Exam Domain Percentages
INSERT INTO exam_domain_percentages (exam_id, domain, percentage)
VALUES ('EXAM001', 'basic_concepts', 40);

-- Exam Questions
INSERT INTO exam_questions
  (id, exam_id, domain, question_type, question,
   choice_a, choice_b, choice_c, choice_d, answer_key, explanation)
VALUES
  ('Q001', 'EXAM001', 'basic_concepts', 'multiple_choice',
   'What is a variable?',
   'A container for storing data values',
   'A type of loop',
   'A function definition',
   'A class method',
   'A',
   'A variable is a named storage location that holds a value.');

-- ==========================================================
-- EXAM ATTEMPTS
-- ==========================================================

-- Attempts
INSERT INTO exam_attempts
  (username, exam_id, correct_count, total_questions, score_percent,
   domain_stats, started_at, finished_at)
VALUES
  ('admin', 'EXAM001', 8, 10, 80.00,
   '{"basic_concepts": 4, "variables_types": 3, "control_flow": 1}',
   NOW() - INTERVAL '7 days',
   NOW() - INTERVAL '6 days 23 hours');

-- Attempt Answers
INSERT INTO exam_attempt_answers (attempt_id, question_id, selected, is_correct)
VALUES (1, 'Q001', 'A', TRUE);

COMMIT;
