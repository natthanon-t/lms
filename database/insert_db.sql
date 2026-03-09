/* =========================================================
   CBT-LMS — Demo Seed Data  (ครอบคลุมทุกฟีเจอร์)
   รหัสผ่าน demo users ทุกคน: Demo@2026
   admin user: สร้างอัตโนมัติจาก env vars ตอน backend start
     (APP_ADMIN_NAME, APP_ADMIN_USERNAME, APP_ADMIN_PASSWORD)

   วิธีรัน:
     docker exec -i cbt_postgres psql -U <POSTGRES_USER> -d <POSTGRES_DB> < insert_db.sql
   หรือเพิ่มใน Dockerfile:
     COPY insert_db.sql /docker-entrypoint-initdb.d/02-insert_db.sql
   ========================================================= */

BEGIN;

-- ต้องการ pgcrypto สำหรับ hash bcrypt
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ==========================================================
-- ROLES
-- ==========================================================

INSERT INTO roles (code, name) VALUES
  ('admin',      'ผู้ดูแลระบบ'),
  ('user',       'ผู้ใช้งาน'),
  ('instructor', 'ผู้สอน');

-- ==========================================================
-- PERMISSIONS
-- ==========================================================

INSERT INTO permissions (code, module, action, description) VALUES
  ('content.learn',                 'content',    'learn',              'เรียนเนื้อหา'),
  ('content.manage',                'content',    'manage',             'สร้าง / แก้ไขเนื้อหา'),
  ('exam.take',                     'exam',       'take',               'เข้าทำข้อสอบ'),
  ('exam.manage',                   'exam',       'manage',             'สร้าง / แก้ไขข้อสอบ'),
  ('system.report.view',            'system',     'report.view',        'ดูรายงานสรุปผล'),
  ('system.exam_history.view',      'system',     'exam_history.view',  'ดูประวัติการสอบของตัวเอง'),
  ('management.users.manage',       'management', 'users.manage',       'จัดการผู้ใช้'),
  ('management.exam_history.view',  'management', 'exam_history.view',  'ดูประวัติการสอบของทุกคน');

INSERT INTO role_permissions (role_code, permission_code) VALUES
  ('user',       'content.learn'),
  ('user',       'exam.take'),
  ('user',       'system.exam_history.view'),
  ('instructor', 'content.learn'),
  ('instructor', 'content.manage'),
  ('instructor', 'exam.take'),
  ('instructor', 'exam.manage'),
  ('instructor', 'system.report.view'),
  ('instructor', 'system.exam_history.view'),
  ('admin',      'content.learn'),
  ('admin',      'content.manage'),
  ('admin',      'exam.take'),
  ('admin',      'exam.manage'),
  ('admin',      'system.report.view'),
  ('admin',      'system.exam_history.view'),
  ('admin',      'management.users.manage'),
  ('admin',      'management.exam_history.view');

-- ==========================================================
-- USERS  (password ทุก account: Demo@2026)
-- ==========================================================
-- สร้าง users หลากหลายระดับเพื่อทดสอบ Level badge:
--   Lv5 ปรมาจารย์ : anant, kittichai   (≥700 pts)
--   Lv4 ผู้เชี่ยวชาญ: somchai, pranom   (≥350 pts)
--   Lv3 มีทักษะ     : somying, wannee   (≥150 pts)
--   Lv2 ผู้เรียน    : wichai, burin     (≥50 pts)
--   Lv1 มือใหม่     : napa, pairot      (<50 pts)

INSERT INTO users (name, username, employee_code, password_hash, role_code, status) VALUES
  -- ผู้ใช้ทั่วไป (role: user)
  ('สมชาย ใจดี',       'somchai',   '2026-IT-0001', crypt('Demo@2026', gen_salt('bf', 10)), 'user',       'active'),
  ('สมหญิง รักเรียน',  'somying',   '2026-HR-0002', crypt('Demo@2026', gen_salt('bf', 10)), 'user',       'active'),
  ('วิชัย มุ่งมั่น',   'wichai',    '2026-FN-0003', crypt('Demo@2026', gen_salt('bf', 10)), 'user',       'active'),
  ('นภา สดใส',         'napa',      '2026-OP-0004', crypt('Demo@2026', gen_salt('bf', 10)), 'user',       'active'),
  ('อนันต์ พัฒนา',    'anant',     '2026-IT-0005', crypt('Demo@2026', gen_salt('bf', 10)), 'user',       'active'),
  ('มนัส ขยันดี',      'manas',     '2026-HR-0006', crypt('Demo@2026', gen_salt('bf', 10)), 'user',       'inactive'),
  ('กิตติชัย เก่งมาก', 'kittichai', '2026-IT-0008', crypt('Demo@2026', gen_salt('bf', 10)), 'user',       'active'),
  ('วันเพ็ญ เรียนดี',  'wannee',    '2026-HR-0009', crypt('Demo@2026', gen_salt('bf', 10)), 'user',       'active'),
  ('บุริน เริ่มต้น',   'burin',     '2026-FN-0010', crypt('Demo@2026', gen_salt('bf', 10)), 'user',       'active'),
  ('ไพโรจน์ มือใหม่',  'pairot',    '2026-OP-0011', crypt('Demo@2026', gen_salt('bf', 10)), 'user',       'active'),
  -- ผู้สอน (role: instructor) — ทดสอบสร้างเนื้อหา / รายงาน
  ('ปราณี สร้างสรรค์', 'pranom',    '2026-IT-0007', crypt('Demo@2026', gen_salt('bf', 10)), 'instructor', 'active'),
  ('วีระชัย บรรยาย',   'weerachai', '2026-IT-0012', crypt('Demo@2026', gen_salt('bf', 10)), 'instructor', 'active');

-- ==========================================================
-- LOGIN LOGS  (ทดสอบ Activity Heatmap บน ProfilePage)
-- ==========================================================

INSERT INTO user_login_logs (user_id, logged_in_at)
SELECT u.id, ts
FROM users u
CROSS JOIN (VALUES
  (NOW() - INTERVAL '60 days'), (NOW() - INTERVAL '55 days'),
  (NOW() - INTERVAL '45 days'), (NOW() - INTERVAL '40 days'),
  (NOW() - INTERVAL '30 days'), (NOW() - INTERVAL '25 days'),
  (NOW() - INTERVAL '20 days'), (NOW() - INTERVAL '14 days'),
  (NOW() - INTERVAL '10 days'), (NOW() - INTERVAL '7 days'),
  (NOW() - INTERVAL '3 days'),  (NOW() - INTERVAL '1 day')
) AS t(ts)
WHERE u.username IN ('anant', 'somchai', 'kittichai');

INSERT INTO user_login_logs (user_id, logged_in_at)
SELECT u.id, ts
FROM users u
CROSS JOIN (VALUES
  (NOW() - INTERVAL '30 days'), (NOW() - INTERVAL '20 days'),
  (NOW() - INTERVAL '10 days'), (NOW() - INTERVAL '5 days'),
  (NOW() - INTERVAL '2 days'),  (NOW() - INTERVAL '1 day')
) AS t(ts)
WHERE u.username IN ('somying', 'pranom', 'weerachai', 'wannee');

INSERT INTO user_login_logs (user_id, logged_in_at)
SELECT u.id, ts
FROM users u
CROSS JOIN (VALUES
  (NOW() - INTERVAL '15 days'), (NOW() - INTERVAL '8 days'),
  (NOW() - INTERVAL '3 days')
) AS t(ts)
WHERE u.username IN ('wichai', 'napa', 'burin');

-- ==========================================================
-- COURSES  (demo cyber content — 3 courses)
-- ==========================================================

INSERT INTO courses (id, title, creator, owner_username, status, description, image, content, skill_points, subtopic_completion_score, course_completion_score) VALUES
  (
    'ex-1',
    'Cyber Analyst: SOC Foundations',
    'Blue Team Academy',
    NULL,
    'active',
    'เดโมพื้นฐาน SOC Analyst: monitoring, triage, investigation, response และการสรุปผลเหตุการณ์',
    'https://picsum.photos/seed/soc-analyst/640/360',
    $content$# Cyber Analyst: SOC Foundations

## SOC Core Workflow
เส้นทางงานหลักของ SOC Analyst ตั้งแต่เห็นสัญญาณผิดปกติจนปิดเหตุการณ์

### Security Monitoring
SOC เฝ้าระวังเหตุการณ์จาก SIEM, EDR และ Firewall เพื่อตรวจจับพฤติกรรมที่ผิดปกติแบบ near real-time
[video: SOC Monitoring Basics](https://youtu.be/TlB-vGW-xLQ?si=vLAnovx5iB4FPXN3)
- [SCORE] 15
- [Q] เครื่องมือรวม log จากหลายระบบเพื่อตรวจจับเหตุผิดปกติเรียกว่าอะไร :: SIEM :: 10
- [Q] Endpoint Detection and Response ใช้ตัวย่อว่าอะไร :: EDR :: 10

### Alert Triage
เมื่อมี Alert เข้ามา Analyst ต้องคัดแยกตาม Severity, Asset Criticality และความเป็นไปได้ที่จะเป็น True Positive
- [SCORE] 20
- [Q] ขั้นตอนคัดแยกแจ้งเตือนตามความเสี่ยงเรียกว่าอะไร :: triage :: 10
- [Q] แจ้งเตือนที่เกิดขึ้นแต่ไม่ใช่ภัยจริงเรียกว่าอะไร :: false positive :: 10

### Investigation & Correlation
นำ log หลายแหล่งมาวิเคราะห์ร่วมกันเพื่อสร้าง timeline และยืนยันขอบเขตของเหตุการณ์
- [SCORE] 20
- [Q] การเชื่อมเหตุการณ์จากหลายแหล่งเพื่อหาภาพรวมเรียกว่าอะไร :: correlation :: 10
- [Q] ตัวบ่งชี้การโจมตี เช่น IP, Hash, Domain เรียกรวมว่าอะไร :: IOC :: 10

## Incident Response Foundations
พื้นฐานการตอบสนองเหตุการณ์แบบเป็นขั้นตอนและตรวจสอบย้อนหลังได้

### Initial Containment
จำกัดผลกระทบทันที เช่น isolate เครื่องที่น่าสงสัย, block IOC สำคัญ และป้องกัน lateral movement
- [SCORE] 20
- [Q] การแยกเครื่องออกจากเครือข่ายเพื่อลดความเสี่ยงเรียกว่าอะไร :: isolate :: 10
- [Q] ขั้นตอนลดผลกระทบระยะแรกของเหตุการณ์เรียกว่าอะไร :: containment :: 10

### Escalation & Communication
ถ้าเหตุการณ์กระทบธุรกิจสูง ต้อง escalate ไป Incident Commander และแจ้งทีมที่เกี่ยวข้องตาม playbook
- [SCORE] 10
- [Q] การส่งต่อเหตุที่รุนแรงไปทีมระดับสูงเรียกว่าอะไร :: escalation :: 10
- [Q] เอกสารขั้นตอนรับมือเหตุการณ์มาตรฐานเรียกว่าอะไร :: playbook :: 10

### Reporting & Lessons Learned
หลังปิดเหตุการณ์ ต้องสรุป root cause, timeline, impact และ action items เพื่อป้องกันเหตุซ้ำ
- [SCORE] 15
- [Q] สรุปสาเหตุหลักของเหตุการณ์เรียกว่าอะไร :: root cause :: 10
- [Q] สิ่งที่ต้องปรับปรุงหลังจบเหตุการณ์มักบันทึกเป็นอะไร :: action items :: 10$content$,
    20, 20, 80
  ),
  (
    'ex-2',
    'Pentester: Engagement Basics',
    'Red Team Workshop',
    NULL,
    'active',
    'เข้าใจวงจรงาน Pentest ตั้งแต่กำหนดขอบเขต สำรวจระบบ ทดสอบ และเก็บหลักฐาน',
    'https://picsum.photos/seed/pentester-basic/640/360',
    $content$# Pentester: Engagement Basics

## วงจรงาน Pentest
ลำดับการทดสอบตั้งแต่ก่อนเริ่มจนส่งรายงาน

### Scoping
กำหนดขอบเขต เป้าหมาย และข้อจำกัดให้ชัดเจนเพื่อให้การทดสอบปลอดภัยและวัดผลได้
- [SCORE] 20
- [Q] เอกสารกำหนดขอบเขตก่อนเริ่มทดสอบคือขั้นตอนไหน :: scoping :: 10

### Reconnaissance
เก็บข้อมูลเป้าหมายจากแหล่งเปิดและบริการที่เปิดใช้งานเพื่อระบุ attack surface
- [SCORE] 20
- [Q] ขั้นตอนเก็บข้อมูลระบบเป้าหมายเรียกว่าอะไร :: reconnaissance :: 10

## เทคนิคประเมินช่องโหว่
แนวทางทดสอบเชิงเทคนิคที่ใช้บ่อย

### Exploitation Validation
ทดสอบการใช้ประโยชน์จากช่องโหว่แบบควบคุมได้ เพื่อพิสูจน์ผลกระทบจริงโดยไม่ทำระบบล่ม
- [SCORE] 25
- [Q] การพิสูจน์ผลกระทบช่องโหว่แบบควบคุมเรียกว่าอะไร :: exploitation :: 10

### Evidence Collection
เก็บหลักฐานผลทดสอบ เช่น screenshot, request/response และ payload ที่ใช้ เพื่อแนบในรายงาน
- [SCORE] 25
- [Q] สิ่งที่ต้องมีในรายงานเพื่อยืนยันผลทดสอบเรียกว่าอะไร :: evidence :: 10$content$,
    20, 25, 90
  ),
  (
    'ex-3',
    'Cyber Analyst + Pentester Collaboration',
    'Purple Team Lab',
    NULL,
    'active',
    'การทำงานร่วมกันของ Blue Team และ Red Team เพื่อยกระดับการตรวจจับและป้องกัน',
    'https://picsum.photos/seed/blue-red-collab/640/360',
    $content$# Cyber Analyst + Pentester Collaboration

## การทำงานร่วมกันของ Blue Team และ Red Team
เป้าหมายคือเพิ่มความพร้อมขององค์กรแบบต่อเนื่อง

### Detection Gap Review
ใช้ผล pentest ย้อนกลับไปตรวจว่า SOC ตรวจจับเทคนิคเดียวกันได้หรือไม่
- [SCORE] 25
- [Q] การทบทวนช่องว่างการตรวจจับเรียกว่าอะไร :: detection gap review :: 10

### Rule Tuning
ปรับปรุงกฎ SIEM/EDR จากพฤติกรรมจริงที่พบทดสอบ เพื่อเพิ่มความแม่นยำในการแจ้งเตือน
- [SCORE] 25
- [Q] การปรับกฎเพื่อให้แจ้งเตือนแม่นขึ้นเรียกว่าอะไร :: rule tuning :: 10

## การวัดผลหลังปรับปรุง
ติดตามผลเพื่อยืนยันว่าระบบป้องกันดีขึ้นจริง

### Retest Prioritized Findings
ทดสอบซ้ำช่องโหว่ระดับสูงที่เคยพบเพื่อยืนยันว่าปิดความเสี่ยงได้แล้ว
- [SCORE] 30
- [Q] การทดสอบซ้ำหลังแก้ไขเรียกว่าอะไร :: retest :: 10

### Lessons Learned
สรุปสิ่งที่ได้เรียนรู้ทั้งฝั่งตรวจจับและฝั่งทดสอบเพื่อวางแผนรอบถัดไป
- [SCORE] 30
- [Q] การสรุปบทเรียนหลังจบกิจกรรมเรียกว่าอะไร :: lessons learned :: 10$content$,
    20, 30, 120
  );

INSERT INTO course_skill_rewards (course_id, skill, points) VALUES
  ('ex-1', 'Log Analysis',               30),
  ('ex-1', 'Alert Triage',               25),
  ('ex-1', 'Incident Response',          20),
  ('ex-2', 'Web Security',               30),
  ('ex-2', 'Vulnerability Validation',   25),
  ('ex-2', 'Evidence Reporting',         20),
  ('ex-3', 'Detection Engineering',      30),
  ('ex-3', 'Threat Hunting',             30),
  ('ex-3', 'Purple Team Collaboration',  25);

-- ==========================================================
-- COURSES  (org courses — ทดสอบ Top Creators ด้วย owner_username)
-- ==========================================================

INSERT INTO courses (id, title, creator, owner_username, status, description, image, content, skill_points, subtopic_completion_score, course_completion_score) VALUES
  (
    'course-itsec',
    'ความปลอดภัยในการใช้งาน IT',
    'ฝ่าย IT',
    'pranom',  -- instructor owns this
    'active',
    'เรียนรู้แนวปฏิบัติพื้นฐานด้านความปลอดภัยทางไซเบอร์ การจัดการรหัสผ่าน และการป้องกันการโจมตีจากภายนอก',
    'https://picsum.photos/seed/itsec-org/640/360',
    E'# ความปลอดภัยในการใช้งาน IT\n\n## การจัดการรหัสผ่าน\nรหัสผ่านที่ดีควรมีความยาวอย่างน้อย 12 ตัวอักษร ผสมระหว่างตัวพิมพ์ใหญ่ พิมพ์เล็ก ตัวเลข และสัญลักษณ์\n\n### password-mgmt\n- [SCORE] 5\n- [Q] รหัสผ่านควรมีความยาวขั้นต่ำเท่าไหร่ :: อย่างน้อย 12 ตัวอักษร :: 10\n\n## การระวัง Phishing\nอีเมล Phishing มักสร้างความรู้สึกเร่งด่วน หลอกให้คลิก link หรือดาวน์โหลดไฟล์อันตราย\n\n### phishing\n- [SCORE] 5\n- [Q] เมื่อได้รับอีเมลที่น่าสงสัยควรทำอย่างไร :: แจ้ง IT ทันที :: 10\n\n## การสำรองข้อมูล\nใช้กฎ 3-2-1 คือ เก็บ 3 สำเนา บน 2 สื่อต่างกัน โดย 1 สำเนาเก็บนอกสถานที่\n\n### backup\n- [SCORE] 5\n- [Q] กฎ 3-2-1 หมายความว่าอย่างไร :: 3 สำเนา 2 สื่อ 1 นอกสถานที่ :: 10',
    10, 5, 50
  ),
  (
    'course-timemgmt',
    'การบริหารจัดการเวลา',
    'ฝ่าย HR',
    'weerachai',  -- instructor owns this
    'active',
    'เทคนิคและเครื่องมือในการจัดการเวลาอย่างมีประสิทธิภาพสำหรับการทำงานในองค์กร',
    'https://picsum.photos/seed/timemgmt-org/640/360',
    E'# การบริหารจัดการเวลา\n\n## เทคนิค Pomodoro\nทำงาน 25 นาที จากนั้นพัก 5 นาที ทำซ้ำ 4 รอบแล้วพักยาว 15-30 นาที\n\n### pomodoro\n- [SCORE] 5\n- [Q] เทคนิค Pomodoro แบ่งเวลาทำงานอย่างไร :: ทำ 25 นาที พัก 5 นาที :: 10\n\n## การจัดลำดับความสำคัญ\nEisenhower Matrix แบ่งงานเป็น 4 กลุ่มตามความเร่งด่วนและความสำคัญ\n\n### priority\n- [SCORE] 5\n- [Q] งานประเภทใดควรทำก่อนตาม Eisenhower Matrix :: เร่งด่วนและสำคัญ :: 10\n\n## การวางแผนประจำวัน\nกำหนด MIT (Most Important Tasks) ไม่เกิน 3 งานต่อวัน\n\n### daily-plan\n- [SCORE] 5\n- [Q] MIT ย่อมาจากอะไรและควรมีกี่งานต่อวัน :: Most Important Tasks 3 งาน :: 10',
    10, 5, 40
  ),
  (
    'course-excel',
    'Excel สำหรับการวิเคราะห์ข้อมูล',
    'ฝ่าย IT',
    'pranom',  -- instructor owns this (2nd course for top creators chart)
    'active',
    'เรียนรู้การใช้ Excel ขั้นสูงสำหรับการวิเคราะห์ข้อมูล ครอบคลุม VLOOKUP, Pivot Table และการสร้างกราฟ',
    'https://picsum.photos/seed/excel-org/640/360',
    E'# Excel สำหรับการวิเคราะห์ข้อมูล\n\n## VLOOKUP และ XLOOKUP\nใช้สำหรับค้นหาข้อมูลจากตารางอื่น XLOOKUP เป็น version ใหม่ที่ยืดหยุ่นกว่า\n\n### vlookup\n- [SCORE] 5\n- [Q] ความแตกต่างระหว่าง VLOOKUP และ XLOOKUP คืออะไร :: XLOOKUP ยืดหยุ่นกว่า :: 10\n\n## Pivot Table\nสรุปข้อมูลปริมาณมากได้อย่างรวดเร็ว สามารถ group, sum, count ได้\n\n### pivot\n- [SCORE] 5\n- [Q] Pivot Table ใช้สำหรับทำอะไร :: สรุปข้อมูลปริมาณมาก :: 10\n\n## การสร้างกราฟ\nเลือกประเภทกราฟให้เหมาะกับข้อมูล เช่น Bar สำหรับเปรียบเทียบ Line สำหรับแนวโน้ม\n\n### chart\n- [SCORE] 5\n- [Q] ควรเลือกกราฟประเภทใดเพื่อแสดงแนวโน้มตามเวลา :: Line Chart :: 10',
    10, 5, 60
  ),
  (
    'course-leadership',
    'ภาวะผู้นำในองค์กร',
    'ฝ่าย HR',
    'weerachai',  -- instructor owns this (2nd course for top creators)
    'active',
    'พัฒนาทักษะความเป็นผู้นำ การสื่อสาร และการสร้างทีมงานที่มีประสิทธิภาพ',
    'https://picsum.photos/seed/leadership-org/640/360',
    E'# ภาวะผู้นำในองค์กร\n\n## การสื่อสารที่มีประสิทธิภาพ\nผู้นำที่ดีต้องสื่อสารอย่างชัดเจน ฟังอย่างตั้งใจ และให้ feedback ที่สร้างสรรค์\n\n### communication\n- [SCORE] 5\n- [Q] ทักษะสำคัญที่สุดของผู้นำที่ดีคืออะไร :: การสื่อสาร :: 10\n\n## การสร้างทีม\nทีมที่แข็งแกร่งต้องมีเป้าหมายร่วม บทบาทชัดเจน และวัฒนธรรมความไว้วางใจ\n\n### teambuilding\n- [SCORE] 5\n- [Q] สิ่งสำคัญที่ทำให้ทีมแข็งแกร่งคืออะไร :: เป้าหมายร่วมและความไว้วางใจ :: 10',
    10, 5, 45
  );

INSERT INTO course_skill_rewards (course_id, skill, points) VALUES
  ('course-itsec',      'IT Security',          50),
  ('course-itsec',      'Cybersecurity',         30),
  ('course-timemgmt',   'Time Management',       40),
  ('course-timemgmt',   'Productivity',          30),
  ('course-excel',      'Data Analysis',         60),
  ('course-excel',      'Excel',                 50),
  ('course-leadership', 'Leadership',            50),
  ('course-leadership', 'Communication',         40);

-- ==========================================================
-- ENROLLMENTS  (ทดสอบ Top Enrollment & Course Status charts)
-- ==========================================================
-- course-itsec: 8 learners (สูงสุด)
-- course-timemgmt: 6 learners
-- course-excel: 5 learners
-- course-leadership: 4 learners

INSERT INTO user_course_enrollments (username, course_id, enrolled_at, completed_at) VALUES
  -- course-itsec (8 learners)
  ('somchai',   'course-itsec',    NOW() - INTERVAL '90 days', NOW() - INTERVAL '75 days'),  -- completed
  ('somying',   'course-itsec',    NOW() - INTERVAL '60 days', NOW() - INTERVAL '50 days'),  -- completed
  ('wichai',    'course-itsec',    NOW() - INTERVAL '45 days', NULL),                         -- in progress
  ('napa',      'course-itsec',    NOW() - INTERVAL '30 days', NULL),                         -- in progress
  ('anant',     'course-itsec',    NOW() - INTERVAL '120 days', DATE_TRUNC('year', NOW()) + INTERVAL '0 months' + INTERVAL '15 days'), -- completed Jan
  ('kittichai', 'course-itsec',    NOW() - INTERVAL '70 days', NOW() - INTERVAL '55 days'),  -- completed
  ('wannee',    'course-itsec',    NOW() - INTERVAL '20 days', NULL),                         -- in progress
  ('burin',     'course-itsec',    NOW() - INTERVAL '5 days',  NULL),                         -- just started
  -- course-timemgmt (6 learners)
  ('somying',   'course-timemgmt', NOW() - INTERVAL '80 days', DATE_TRUNC('year', NOW()) + INTERVAL '1 month' + INTERVAL '10 days'), -- completed Feb
  ('wichai',    'course-timemgmt', NOW() - INTERVAL '55 days', NOW() - INTERVAL '40 days'),  -- completed
  ('anant',     'course-timemgmt', NOW() - INTERVAL '110 days', DATE_TRUNC('year', NOW()) + INTERVAL '1 month' + INTERVAL '20 days'), -- completed Feb
  ('kittichai', 'course-timemgmt', NOW() - INTERVAL '50 days', NOW() - INTERVAL '35 days'),  -- completed
  ('wannee',    'course-timemgmt', NOW() - INTERVAL '25 days', DATE_TRUNC('year', NOW()) + INTERVAL '3 months' + INTERVAL '5 days'),  -- completed Apr
  ('pairot',    'course-timemgmt', NOW() - INTERVAL '3 days',  NULL),                         -- just started
  -- course-excel (5 learners)
  ('somchai',   'course-excel',    NOW() - INTERVAL '60 days', DATE_TRUNC('year', NOW()) + INTERVAL '2 months' + INTERVAL '5 days'), -- completed Mar
  ('wichai',    'course-excel',    NOW() - INTERVAL '40 days', NULL),                         -- in progress
  ('anant',     'course-excel',    NOW() - INTERVAL '100 days', DATE_TRUNC('year', NOW()) + INTERVAL '2 months' + INTERVAL '15 days'), -- completed Mar
  ('kittichai', 'course-excel',    NOW() - INTERVAL '35 days', NOW() - INTERVAL '20 days'),  -- completed
  ('burin',     'course-excel',    NOW() - INTERVAL '10 days', NULL),                         -- in progress
  -- course-leadership (4 learners)
  ('anant',     'course-leadership', NOW() - INTERVAL '80 days', DATE_TRUNC('year', NOW()) + INTERVAL '4 months' + INTERVAL '10 days'), -- completed May
  ('kittichai', 'course-leadership', NOW() - INTERVAL '60 days', NOW() - INTERVAL '45 days'),   -- completed
  ('pranom',    'course-leadership', NOW() - INTERVAL '30 days', NULL),                          -- in progress
  ('wannee',    'course-leadership', NOW() - INTERVAL '15 days', NULL);                          -- in progress

-- ==========================================================
-- LEARNING PROGRESS  (subtopic completions & answers)
-- ==========================================================

INSERT INTO learning_subtopic_progress (username, course_id, subtopic_id, completed_at) VALUES
  -- somchai: itsec 2/3, excel 1/3
  ('somchai', 'course-itsec',  'password-mgmt', NOW() - INTERVAL '88 days'),
  ('somchai', 'course-itsec',  'phishing',      NOW() - INTERVAL '86 days'),
  ('somchai', 'course-excel',  'vlookup',       NOW() - INTERVAL '58 days'),
  -- somying: timemgmt 2/3, itsec 1/3
  ('somying', 'course-timemgmt', 'pomodoro',    NOW() - INTERVAL '78 days'),
  ('somying', 'course-timemgmt', 'priority',    NOW() - INTERVAL '76 days'),
  ('somying', 'course-itsec',  'password-mgmt', NOW() - INTERVAL '58 days'),
  -- wichai: timemgmt 1/3, itsec 1/3
  ('wichai',  'course-timemgmt', 'pomodoro',    NOW() - INTERVAL '53 days'),
  ('wichai',  'course-itsec',  'password-mgmt', NOW() - INTERVAL '43 days'),
  -- anant: ครบทุก subtopic ทุก course
  ('anant',   'course-itsec',  'password-mgmt', NOW() - INTERVAL '118 days'),
  ('anant',   'course-itsec',  'phishing',      NOW() - INTERVAL '117 days'),
  ('anant',   'course-itsec',  'backup',        NOW() - INTERVAL '116 days'),
  ('anant',   'course-timemgmt', 'pomodoro',    NOW() - INTERVAL '108 days'),
  ('anant',   'course-timemgmt', 'priority',    NOW() - INTERVAL '107 days'),
  ('anant',   'course-timemgmt', 'daily-plan',  NOW() - INTERVAL '106 days'),
  ('anant',   'course-excel',  'vlookup',       NOW() - INTERVAL '98 days'),
  ('anant',   'course-excel',  'pivot',         NOW() - INTERVAL '97 days'),
  ('anant',   'course-excel',  'chart',         NOW() - INTERVAL '96 days'),
  -- kittichai: itsec 3/3, timemgmt 3/3, excel 2/3
  ('kittichai', 'course-itsec',  'password-mgmt', NOW() - INTERVAL '68 days'),
  ('kittichai', 'course-itsec',  'phishing',      NOW() - INTERVAL '67 days'),
  ('kittichai', 'course-itsec',  'backup',        NOW() - INTERVAL '66 days'),
  ('kittichai', 'course-timemgmt', 'pomodoro',    NOW() - INTERVAL '48 days'),
  ('kittichai', 'course-timemgmt', 'priority',    NOW() - INTERVAL '47 days'),
  ('kittichai', 'course-timemgmt', 'daily-plan',  NOW() - INTERVAL '46 days'),
  ('kittichai', 'course-excel',  'vlookup',       NOW() - INTERVAL '33 days'),
  ('kittichai', 'course-excel',  'pivot',         NOW() - INTERVAL '32 days');

INSERT INTO learning_subtopic_answers (username, course_id, subtopic_id, question_id, typed_answer, is_correct, answered_at) VALUES
  ('somchai',   'course-itsec',    'password-mgmt', 'q-pwd-len',  'อย่างน้อย 12 ตัวอักษร',       TRUE,  NOW() - INTERVAL '88 days'),
  ('somchai',   'course-itsec',    'phishing',      'q-phi-act',  'แจ้ง IT ทันที',                TRUE,  NOW() - INTERVAL '86 days'),
  ('somchai',   'course-excel',    'vlookup',       'q-xl-diff',  'XLOOKUP ยืดหยุ่นกว่า',         TRUE,  NOW() - INTERVAL '58 days'),
  ('somying',   'course-timemgmt', 'pomodoro',      'q-pom-time', 'ทำ 25 นาที พัก 5 นาที',        TRUE,  NOW() - INTERVAL '78 days'),
  ('somying',   'course-timemgmt', 'priority',      'q-eis-grp',  'เร่งด่วนและสำคัญ',             TRUE,  NOW() - INTERVAL '76 days'),
  ('somying',   'course-itsec',    'password-mgmt', 'q-pwd-len',  '8 ตัวอักษร',                   FALSE, NOW() - INTERVAL '58 days'),
  ('wichai',    'course-timemgmt', 'pomodoro',      'q-pom-time', 'ทำ 25 นาที พัก 5 นาที',        TRUE,  NOW() - INTERVAL '53 days'),
  ('wichai',    'course-itsec',    'password-mgmt', 'q-pwd-len',  'อย่างน้อย 12 ตัวอักษร',       TRUE,  NOW() - INTERVAL '43 days'),
  ('anant',     'course-itsec',    'password-mgmt', 'q-pwd-len',  'อย่างน้อย 12 ตัวอักษร',       TRUE,  NOW() - INTERVAL '118 days'),
  ('anant',     'course-itsec',    'phishing',      'q-phi-act',  'แจ้ง IT ทันที',                TRUE,  NOW() - INTERVAL '117 days'),
  ('anant',     'course-itsec',    'backup',        'q-bkp-rule', '3 สำเนา 2 สื่อ 1 นอกสถานที่', TRUE,  NOW() - INTERVAL '116 days'),
  ('anant',     'course-timemgmt', 'pomodoro',      'q-pom-time', 'ทำ 25 นาที พัก 5 นาที',        TRUE,  NOW() - INTERVAL '108 days'),
  ('anant',     'course-timemgmt', 'priority',      'q-eis-grp',  'เร่งด่วนและสำคัญ',             TRUE,  NOW() - INTERVAL '107 days'),
  ('anant',     'course-timemgmt', 'daily-plan',    'q-mit-def',  'Most Important Tasks 3 งาน',   TRUE,  NOW() - INTERVAL '106 days'),
  ('anant',     'course-excel',    'vlookup',       'q-xl-diff',  'XLOOKUP ยืดหยุ่นกว่า',         TRUE,  NOW() - INTERVAL '98 days'),
  ('anant',     'course-excel',    'pivot',         'q-pvt-use',  'สรุปข้อมูลปริมาณมาก',          TRUE,  NOW() - INTERVAL '97 days'),
  ('anant',     'course-excel',    'chart',         'q-chrt-typ', 'Line Chart',                    TRUE,  NOW() - INTERVAL '96 days'),
  ('kittichai', 'course-itsec',    'password-mgmt', 'q-pwd-len',  'อย่างน้อย 12 ตัวอักษร',       TRUE,  NOW() - INTERVAL '68 days'),
  ('kittichai', 'course-itsec',    'phishing',      'q-phi-act',  'แจ้ง IT ทันที',                TRUE,  NOW() - INTERVAL '67 days'),
  ('kittichai', 'course-itsec',    'backup',        'q-bkp-rule', '3 สำเนา 2 สื่อ 1 นอกสถานที่', TRUE,  NOW() - INTERVAL '66 days'),
  ('kittichai', 'course-timemgmt', 'pomodoro',      'q-pom-time', 'ทำ 25 นาที พัก 5 นาที',        TRUE,  NOW() - INTERVAL '48 days'),
  ('kittichai', 'course-timemgmt', 'priority',      'q-eis-grp',  'เร่งด่วนและสำคัญ',             TRUE,  NOW() - INTERVAL '47 days'),
  ('kittichai', 'course-timemgmt', 'daily-plan',    'q-mit-def',  'Most Important Tasks 3 งาน',   TRUE,  NOW() - INTERVAL '46 days'),
  ('kittichai', 'course-excel',    'vlookup',       'q-xl-diff',  'XLOOKUP ยืดหยุ่นกว่า',         TRUE,  NOW() - INTERVAL '33 days'),
  ('kittichai', 'course-excel',    'pivot',         'q-pvt-use',  'สรุปข้อมูลปริมาณมาก',          TRUE,  NOW() - INTERVAL '32 days');

-- ==========================================================
-- USER SCORES  (ทดสอบ Leaderboard + Level system)
-- ==========================================================
-- Lv5 ปรมาจารย์ (≥700):  anant=750, kittichai=720
-- Lv4 ผู้เชี่ยวชาญ (≥350): somchai=380, pranom=420
-- Lv3 มีทักษะ (≥150):     somying=170, wannee=155
-- Lv2 ผู้เรียน (≥50):     wichai=85,   burin=60
-- Lv1 มือใหม่ (<50):      napa=25,     pairot=10

INSERT INTO user_scores (username, total) VALUES
  ('anant',     750),
  ('kittichai', 720),
  ('pranom',    420),
  ('somchai',   380),
  ('wannee',    155),
  ('somying',   170),
  ('wichai',     85),
  ('burin',      60),
  ('napa',       25),
  ('pairot',     10),
  ('weerachai', 200);

-- ==========================================================
-- USER SKILL SCORES  (ทดสอบ Profile modal — skill badges)
-- ==========================================================

INSERT INTO user_skill_scores (username, skill, points) VALUES
  ('anant',     'IT Security',              50),
  ('anant',     'Data Analysis',            60),
  ('anant',     'Time Management',          40),
  ('anant',     'Log Analysis',             60),
  ('anant',     'Incident Response',        45),
  ('kittichai', 'IT Security',              50),
  ('kittichai', 'Data Analysis',            60),
  ('kittichai', 'Time Management',          40),
  ('kittichai', 'Web Security',             70),
  ('somchai',   'IT Security',              50),
  ('somchai',   'Data Analysis',            40),
  ('somchai',   'Cybersecurity',            30),
  ('pranom',    'Detection Engineering',    80),
  ('pranom',    'Threat Hunting',           60),
  ('pranom',    'Leadership',               50),
  ('weerachai', 'Time Management',          40),
  ('weerachai', 'Leadership',               50),
  ('weerachai', 'Communication',            40),
  ('somying',   'Time Management',          40),
  ('somying',   'Productivity',             30),
  ('wichai',    'Time Management',          30),
  ('wannee',    'Time Management',          30),
  ('wannee',    'IT Security',              25);

-- ==========================================================
-- EXAMS  (2 ข้อสอบ — ทดสอบ Exam History + Daily Activity)
-- ==========================================================

INSERT INTO exams (id, title, creator, owner_username, status, description, instructions, image, number_of_questions, default_time, max_attempts) VALUES
  (
    'exam-itsec-01',
    'ข้อสอบความปลอดภัย IT เบื้องต้น',
    'ปราณี สร้างสรรค์',
    'pranom',
    'active',
    'ทดสอบความเข้าใจพื้นฐานด้านความปลอดภัยทางไซเบอร์',
    'เลือกคำตอบที่ถูกต้องที่สุด มีเวลา 20 นาที',
    'https://picsum.photos/seed/exam-itsec/640/360',
    5, 20, 3
  ),
  (
    'exam-timemgmt-01',
    'ข้อสอบการบริหารเวลาและประสิทธิภาพ',
    'วีระชัย บรรยาย',
    'weerachai',
    'active',
    'ทดสอบความรู้เรื่องการจัดการเวลาและเทคนิคเพิ่มประสิทธิภาพการทำงาน',
    'เลือกคำตอบที่ถูกต้องที่สุด มีเวลา 15 นาที',
    'https://picsum.photos/seed/exam-timemgmt/640/360',
    5, 15, 5
  );

INSERT INTO exam_domain_percentages (exam_id, domain, percentage) VALUES
  ('exam-itsec-01',    'Security',    100),
  ('exam-timemgmt-01', 'Management',  100);

-- Questions for exam-itsec-01
INSERT INTO exam_questions (id, exam_id, domain, question_type, question, choice_a, choice_b, choice_c, choice_d, answer_key, explanation) VALUES
  ('eq-sec-01', 'exam-itsec-01', 'Security', 'multiple_choice',
   'รหัสผ่านที่ดีควรมีความยาวขั้นต่ำกี่ตัวอักษร?',
   '6 ตัวอักษร', '8 ตัวอักษร', '12 ตัวอักษร', '16 ตัวอักษร',
   'C', 'ผู้เชี่ยวชาญแนะนำรหัสผ่านอย่างน้อย 12 ตัวอักษรเพื่อความปลอดภัยเพียงพอ'),

  ('eq-sec-02', 'exam-itsec-01', 'Security', 'multiple_choice',
   'เมื่อได้รับอีเมลจากธนาคารขอให้คลิก link เพื่อยืนยันข้อมูลควรทำอย่างไร?',
   'คลิก link ทันทีเพื่อรักษาความปลอดภัย', 'ลบอีเมลทิ้งโดยไม่ต้องสนใจ',
   'โทรหาธนาคารโดยตรงเพื่อยืนยัน', 'ส่งต่ออีเมลให้เพื่อนตรวจสอบ',
   'C', 'ควรติดต่อธนาคารโดยตรงผ่านช่องทางที่เป็นทางการ ไม่ใช่ link ในอีเมล'),

  ('eq-sec-03', 'exam-itsec-01', 'Security', 'multiple_choice',
   'กฎ 3-2-1 สำหรับการสำรองข้อมูลหมายความว่าอย่างไร?',
   'สำรอง 3 ครั้ง ทุก 2 วัน ใช้เวลา 1 ชั่วโมง',
   'เก็บ 3 สำเนา บน 2 สื่อต่างกัน โดย 1 สำเนาเก็บนอกสถานที่',
   'ใช้ 3 รหัสผ่าน 2 อุปกรณ์ 1 cloud',
   'ลบข้อมูล 3 ครั้ง บน 2 เครื่อง เหลือ 1 backup',
   'B', 'กฎ 3-2-1: สำเนา 3 ชุด สื่อบันทึก 2 ชนิดต่างกัน และ 1 ชุดต้องอยู่นอกสถานที่'),

  ('eq-sec-04', 'exam-itsec-01', 'Security', 'multiple_choice',
   'Multi-Factor Authentication (MFA) คืออะไร?',
   'การใช้รหัสผ่านยาวมากกว่าปกติ',
   'การตรวจสอบตัวตนด้วยปัจจัยมากกว่า 1 อย่าง',
   'การเปลี่ยนรหัสผ่านทุกเดือน',
   'การล็อกบัญชีหลังพิมพ์รหัสผิด 3 ครั้ง',
   'B', 'MFA ใช้หลายปัจจัยในการยืนยันตัวตน เช่น รหัสผ่าน + OTP'),

  ('eq-sec-05', 'exam-itsec-01', 'Security', 'multiple_choice',
   'ข้อใดเป็นตัวอย่างของ Social Engineering?',
   'การโจมตีด้วย Malware', 'การสแกนช่องโหว่ระบบ',
   'การโทรหลอกว่าเป็น IT Support เพื่อขอรหัสผ่าน', 'การ DDoS เซิร์ฟเวอร์',
   'C', 'Social Engineering คือการหลอกให้คนเปิดเผยข้อมูลโดยใช้จิตวิทยาสังคม');

-- Questions for exam-timemgmt-01
INSERT INTO exam_questions (id, exam_id, domain, question_type, question, choice_a, choice_b, choice_c, choice_d, answer_key, explanation) VALUES
  ('eq-time-01', 'exam-timemgmt-01', 'Management', 'multiple_choice',
   'เทคนิค Pomodoro แบ่งเวลาทำงานอย่างไร?',
   'ทำงาน 50 นาที พัก 10 นาที', 'ทำงาน 30 นาที พัก 15 นาที',
   'ทำงาน 25 นาที พัก 5 นาที',  'ทำงาน 45 นาที พัก 15 นาที',
   'C', 'Pomodoro: ทำงาน 25 นาที พัก 5 นาที ทำซ้ำ 4 รอบแล้วพักยาว'),

  ('eq-time-02', 'exam-timemgmt-01', 'Management', 'multiple_choice',
   'Eisenhower Matrix แบ่งงานตามอะไร?',
   'ความยากและความสนุก', 'ความเร่งด่วนและความสำคัญ',
   'ระยะเวลาและค่าใช้จ่าย', 'ทีมงานและเครื่องมือ',
   'B', 'Eisenhower Matrix จัดกลุ่มงานเป็น 4 ประเภทตามความเร่งด่วน × ความสำคัญ'),

  ('eq-time-03', 'exam-timemgmt-01', 'Management', 'multiple_choice',
   'MIT ในการวางแผนงานย่อมาจากอะไร?',
   'Monthly Important Tasks', 'Most Important Tasks',
   'Multiple Input Tasks',    'Minimal Impact Tasks',
   'B', 'MIT = Most Important Tasks ควรกำหนดไม่เกิน 3 งานต่อวัน'),

  ('eq-time-04', 'exam-timemgmt-01', 'Management', 'multiple_choice',
   'Time Blocking คืออะไร?',
   'การล็อกเวลาออฟฟิศให้ตรงเวลา', 'การจัดสรรเวลาเฉพาะสำหรับงานแต่ละประเภทในปฏิทิน',
   'การบล็อกการแจ้งเตือนทั้งหมด', 'การทำงานหลายอย่างพร้อมกัน',
   'B', 'Time Blocking คือการจองช่วงเวลาในปฏิทินให้งานแต่ละประเภทล่วงหน้า'),

  ('eq-time-05', 'exam-timemgmt-01', 'Management', 'multiple_choice',
   'งานประเภทใดใน Eisenhower Matrix ที่ควรมอบหมายให้คนอื่นทำ?',
   'เร่งด่วน + สำคัญ', 'เร่งด่วน + ไม่สำคัญ',
   'ไม่เร่งด่วน + สำคัญ', 'ไม่เร่งด่วน + ไม่สำคัญ',
   'B', 'งานเร่งด่วนแต่ไม่สำคัญควรมอบหมาย (Delegate) ให้ผู้อื่น');

-- ==========================================================
-- EXAM ATTEMPTS  (ทดสอบ Daily Activity, Exam History, Admin view)
-- ==========================================================
-- *** Daily Activity chart ดูเฉพาะสัปดาห์ปัจจุบัน (จ-อา) ***
-- ใช้ DATE_TRUNC('week', NOW()) + EXTRACT(DOW) เพื่อให้กระจายทั้งสัปดาห์

-- attempts ในสัปดาห์นี้ (pass = score_percent ≥ 70)
INSERT INTO exam_attempts (username, exam_id, correct_count, total_questions, score_percent, domain_stats, started_at, finished_at) VALUES
  -- จันทร์ (วันที่ 1 ของสัปดาห์)
  ('anant',     'exam-itsec-01',    5, 5, 100.00, '{"Security":{"correct":5,"total":5}}',
   DATE_TRUNC('week', NOW()),                  DATE_TRUNC('week', NOW()) + INTERVAL '18 minutes'),
  ('kittichai', 'exam-itsec-01',    4, 5,  80.00, '{"Security":{"correct":4,"total":5}}',
   DATE_TRUNC('week', NOW()),                  DATE_TRUNC('week', NOW()) + INTERVAL '20 minutes'),
  ('napa',      'exam-itsec-01',    2, 5,  40.00, '{"Security":{"correct":2,"total":5}}',
   DATE_TRUNC('week', NOW()),                  DATE_TRUNC('week', NOW()) + INTERVAL '22 minutes'),
  -- อังคาร
  ('somchai',   'exam-itsec-01',    4, 5,  80.00, '{"Security":{"correct":4,"total":5}}',
   DATE_TRUNC('week', NOW()) + INTERVAL '1 day', DATE_TRUNC('week', NOW()) + INTERVAL '1 day 19 minutes'),
  ('somying',   'exam-timemgmt-01', 5, 5, 100.00, '{"Management":{"correct":5,"total":5}}',
   DATE_TRUNC('week', NOW()) + INTERVAL '1 day', DATE_TRUNC('week', NOW()) + INTERVAL '1 day 14 minutes'),
  ('wichai',    'exam-timemgmt-01', 2, 5,  40.00, '{"Management":{"correct":2,"total":5}}',
   DATE_TRUNC('week', NOW()) + INTERVAL '1 day', DATE_TRUNC('week', NOW()) + INTERVAL '1 day 15 minutes'),
  -- พุธ
  ('wannee',    'exam-itsec-01',    3, 5,  60.00, '{"Security":{"correct":3,"total":5}}',
   DATE_TRUNC('week', NOW()) + INTERVAL '2 days', DATE_TRUNC('week', NOW()) + INTERVAL '2 days 20 minutes'),
  ('burin',     'exam-timemgmt-01', 3, 5,  60.00, '{"Management":{"correct":3,"total":5}}',
   DATE_TRUNC('week', NOW()) + INTERVAL '2 days', DATE_TRUNC('week', NOW()) + INTERVAL '2 days 13 minutes'),
  -- พฤหัส
  ('anant',     'exam-timemgmt-01', 5, 5, 100.00, '{"Management":{"correct":5,"total":5}}',
   DATE_TRUNC('week', NOW()) + INTERVAL '3 days', DATE_TRUNC('week', NOW()) + INTERVAL '3 days 12 minutes'),
  ('kittichai', 'exam-timemgmt-01', 4, 5,  80.00, '{"Management":{"correct":4,"total":5}}',
   DATE_TRUNC('week', NOW()) + INTERVAL '3 days', DATE_TRUNC('week', NOW()) + INTERVAL '3 days 11 minutes'),
  ('pairot',    'exam-itsec-01',    1, 5,  20.00, '{"Security":{"correct":1,"total":5}}',
   DATE_TRUNC('week', NOW()) + INTERVAL '3 days', DATE_TRUNC('week', NOW()) + INTERVAL '3 days 25 minutes'),
  -- ศุกร์
  ('somchai',   'exam-timemgmt-01', 4, 5,  80.00, '{"Management":{"correct":4,"total":5}}',
   DATE_TRUNC('week', NOW()) + INTERVAL '4 days', DATE_TRUNC('week', NOW()) + INTERVAL '4 days 14 minutes'),
  ('wannee',    'exam-timemgmt-01', 4, 5,  80.00, '{"Management":{"correct":4,"total":5}}',
   DATE_TRUNC('week', NOW()) + INTERVAL '4 days', DATE_TRUNC('week', NOW()) + INTERVAL '4 days 13 minutes');

-- attempts ย้อนหลัง (ทดสอบ Exam History + Admin Exam Attempts)
INSERT INTO exam_attempts (username, exam_id, correct_count, total_questions, score_percent, domain_stats, started_at, finished_at) VALUES
  ('somchai',   'exam-itsec-01',    3, 5,  60.00, '{"Security":{"correct":3,"total":5}}',
   NOW() - INTERVAL '14 days', NOW() - INTERVAL '14 days' + INTERVAL '21 minutes'),
  ('somchai',   'exam-itsec-01',    5, 5, 100.00, '{"Security":{"correct":5,"total":5}}',
   NOW() - INTERVAL '7 days',  NOW() - INTERVAL '7 days'  + INTERVAL '16 minutes'),
  ('anant',     'exam-itsec-01',    5, 5, 100.00, '{"Security":{"correct":5,"total":5}}',
   NOW() - INTERVAL '30 days', NOW() - INTERVAL '30 days' + INTERVAL '15 minutes'),
  ('anant',     'exam-timemgmt-01', 5, 5, 100.00, '{"Management":{"correct":5,"total":5}}',
   NOW() - INTERVAL '25 days', NOW() - INTERVAL '25 days' + INTERVAL '12 minutes'),
  ('kittichai', 'exam-itsec-01',    4, 5,  80.00, '{"Security":{"correct":4,"total":5}}',
   NOW() - INTERVAL '20 days', NOW() - INTERVAL '20 days' + INTERVAL '18 minutes'),
  ('somying',   'exam-itsec-01',    3, 5,  60.00, '{"Security":{"correct":3,"total":5}}',
   NOW() - INTERVAL '10 days', NOW() - INTERVAL '10 days' + INTERVAL '22 minutes'),
  ('wichai',    'exam-itsec-01',    2, 5,  40.00, '{"Security":{"correct":2,"total":5}}',
   NOW() - INTERVAL '8 days',  NOW() - INTERVAL '8 days'  + INTERVAL '25 minutes'),
  ('napa',      'exam-timemgmt-01', 3, 5,  60.00, '{"Management":{"correct":3,"total":5}}',
   NOW() - INTERVAL '5 days',  NOW() - INTERVAL '5 days'  + INTERVAL '15 minutes'),
  ('pranom',    'exam-itsec-01',    5, 5, 100.00, '{"Security":{"correct":5,"total":5}}',
   NOW() - INTERVAL '15 days', NOW() - INTERVAL '15 days' + INTERVAL '10 minutes'),
  ('wannee',    'exam-itsec-01',    3, 5,  60.00, '{"Security":{"correct":3,"total":5}}',
   NOW() - INTERVAL '3 days',  NOW() - INTERVAL '3 days'  + INTERVAL '20 minutes');

-- ==========================================================
-- EXAM ATTEMPT ANSWERS  (ทดสอบ Exam Attempt Detail view)
-- ==========================================================
-- สร้าง answers สำหรับ attempt แรกของแต่ละคน (attempt id จะเป็น auto-increment)
-- ใช้ subquery เพื่อหา attempt id

-- anant attempt ที่ 1 (exam-itsec-01, current week Monday, 5/5)
INSERT INTO exam_attempt_answers (attempt_id, question_id, selected, is_correct)
SELECT a.id, q.question_id, q.selected, q.is_correct
FROM exam_attempts a
CROSS JOIN (VALUES
  ('eq-sec-01', 'C', TRUE),
  ('eq-sec-02', 'C', TRUE),
  ('eq-sec-03', 'B', TRUE),
  ('eq-sec-04', 'B', TRUE),
  ('eq-sec-05', 'C', TRUE)
) AS q(question_id, selected, is_correct)
WHERE a.username = 'anant' AND a.exam_id = 'exam-itsec-01'
ORDER BY a.started_at ASC
LIMIT 5 OFFSET 0 * 5;

-- somchai attempt ล่าสุด (exam-itsec-01, 5/5 pass)
INSERT INTO exam_attempt_answers (attempt_id, question_id, selected, is_correct)
SELECT a.id, q.question_id, q.selected, q.is_correct
FROM exam_attempts a
CROSS JOIN (VALUES
  ('eq-sec-01', 'C', TRUE),
  ('eq-sec-02', 'C', TRUE),
  ('eq-sec-03', 'B', TRUE),
  ('eq-sec-04', 'B', TRUE),
  ('eq-sec-05', 'C', TRUE)
) AS q(question_id, selected, is_correct)
WHERE a.username = 'somchai' AND a.exam_id = 'exam-itsec-01'
  AND a.score_percent = 100.00
ORDER BY a.started_at DESC
LIMIT 1;

-- napa attempt (exam-itsec-01, 2/5 fail)
INSERT INTO exam_attempt_answers (attempt_id, question_id, selected, is_correct)
SELECT a.id, q.question_id, q.selected, q.is_correct
FROM exam_attempts a
CROSS JOIN (VALUES
  ('eq-sec-01', 'C', TRUE),
  ('eq-sec-02', 'A', FALSE),
  ('eq-sec-03', 'B', TRUE),
  ('eq-sec-04', 'A', FALSE),
  ('eq-sec-05', 'B', FALSE)
) AS q(question_id, selected, is_correct)
WHERE a.username = 'napa' AND a.exam_id = 'exam-itsec-01'
ORDER BY a.started_at DESC
LIMIT 1;

COMMIT;
