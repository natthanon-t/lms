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

-- ==========================================================
-- ███  STRESS TEST DATA  (50 users, 110 courses, 3 exams)  ███
-- ==========================================================

-- === STRESS TEST USERS (50 คน) ===
INSERT INTO users (name, username, employee_code, password_hash, role_code, status) VALUES
  ('ทดสอบ คนที่หนึ่ง',    'st-user-001', 'ST-001', crypt('Demo@2026', gen_salt('bf', 10)), 'user',       'active'),
  ('ทดสอบ คนที่สอง',     'st-user-002', 'ST-002', crypt('Demo@2026', gen_salt('bf', 10)), 'user',       'active'),
  ('ทดสอบ คนที่สาม',     'st-user-003', 'ST-003', crypt('Demo@2026', gen_salt('bf', 10)), 'user',       'active'),
  ('ทดสอบ คนที่สี่',      'st-user-004', 'ST-004', crypt('Demo@2026', gen_salt('bf', 10)), 'user',       'active'),
  ('ทดสอบ คนที่ห้า',     'st-user-005', 'ST-005', crypt('Demo@2026', gen_salt('bf', 10)), 'user',       'active'),
  ('ทดสอบ คนที่หก',      'st-user-006', 'ST-006', crypt('Demo@2026', gen_salt('bf', 10)), 'user',       'active'),
  ('ทดสอบ คนที่เจ็ด',    'st-user-007', 'ST-007', crypt('Demo@2026', gen_salt('bf', 10)), 'user',       'active'),
  ('ทดสอบ คนที่แปด',     'st-user-008', 'ST-008', crypt('Demo@2026', gen_salt('bf', 10)), 'user',       'active'),
  ('ทดสอบ คนที่เก้า',    'st-user-009', 'ST-009', crypt('Demo@2026', gen_salt('bf', 10)), 'user',       'active'),
  ('ทดสอบ คนที่สิบ',     'st-user-010', 'ST-010', crypt('Demo@2026', gen_salt('bf', 10)), 'user',       'active'),
  ('ทดสอบ คนที่ 11',     'st-user-011', 'ST-011', crypt('Demo@2026', gen_salt('bf', 10)), 'user',       'active'),
  ('ทดสอบ คนที่ 12',     'st-user-012', 'ST-012', crypt('Demo@2026', gen_salt('bf', 10)), 'user',       'active'),
  ('ทดสอบ คนที่ 13',     'st-user-013', 'ST-013', crypt('Demo@2026', gen_salt('bf', 10)), 'user',       'active'),
  ('ทดสอบ คนที่ 14',     'st-user-014', 'ST-014', crypt('Demo@2026', gen_salt('bf', 10)), 'user',       'active'),
  ('ทดสอบ คนที่ 15',     'st-user-015', 'ST-015', crypt('Demo@2026', gen_salt('bf', 10)), 'user',       'active'),
  ('ทดสอบ คนที่ 16',     'st-user-016', 'ST-016', crypt('Demo@2026', gen_salt('bf', 10)), 'user',       'active'),
  ('ทดสอบ คนที่ 17',     'st-user-017', 'ST-017', crypt('Demo@2026', gen_salt('bf', 10)), 'user',       'active'),
  ('ทดสอบ คนที่ 18',     'st-user-018', 'ST-018', crypt('Demo@2026', gen_salt('bf', 10)), 'user',       'active'),
  ('ทดสอบ คนที่ 19',     'st-user-019', 'ST-019', crypt('Demo@2026', gen_salt('bf', 10)), 'user',       'active'),
  ('ทดสอบ คนที่ 20',     'st-user-020', 'ST-020', crypt('Demo@2026', gen_salt('bf', 10)), 'user',       'active'),
  ('ทดสอบ คนที่ 21',     'st-user-021', 'ST-021', crypt('Demo@2026', gen_salt('bf', 10)), 'user',       'active'),
  ('ทดสอบ คนที่ 22',     'st-user-022', 'ST-022', crypt('Demo@2026', gen_salt('bf', 10)), 'user',       'active'),
  ('ทดสอบ คนที่ 23',     'st-user-023', 'ST-023', crypt('Demo@2026', gen_salt('bf', 10)), 'user',       'active'),
  ('ทดสอบ คนที่ 24',     'st-user-024', 'ST-024', crypt('Demo@2026', gen_salt('bf', 10)), 'user',       'active'),
  ('ทดสอบ คนที่ 25',     'st-user-025', 'ST-025', crypt('Demo@2026', gen_salt('bf', 10)), 'user',       'active'),
  ('ทดสอบ คนที่ 26',     'st-user-026', 'ST-026', crypt('Demo@2026', gen_salt('bf', 10)), 'user',       'active'),
  ('ทดสอบ คนที่ 27',     'st-user-027', 'ST-027', crypt('Demo@2026', gen_salt('bf', 10)), 'user',       'active'),
  ('ทดสอบ คนที่ 28',     'st-user-028', 'ST-028', crypt('Demo@2026', gen_salt('bf', 10)), 'user',       'active'),
  ('ทดสอบ คนที่ 29',     'st-user-029', 'ST-029', crypt('Demo@2026', gen_salt('bf', 10)), 'user',       'active'),
  ('ทดสอบ คนที่ 30',     'st-user-030', 'ST-030', crypt('Demo@2026', gen_salt('bf', 10)), 'user',       'active'),
  ('ทดสอบ คนที่ 31',     'st-user-031', 'ST-031', crypt('Demo@2026', gen_salt('bf', 10)), 'user',       'active'),
  ('ทดสอบ คนที่ 32',     'st-user-032', 'ST-032', crypt('Demo@2026', gen_salt('bf', 10)), 'user',       'active'),
  ('ทดสอบ คนที่ 33',     'st-user-033', 'ST-033', crypt('Demo@2026', gen_salt('bf', 10)), 'user',       'active'),
  ('ทดสอบ คนที่ 34',     'st-user-034', 'ST-034', crypt('Demo@2026', gen_salt('bf', 10)), 'user',       'active'),
  ('ทดสอบ คนที่ 35',     'st-user-035', 'ST-035', crypt('Demo@2026', gen_salt('bf', 10)), 'user',       'active'),
  ('ทดสอบ คนที่ 36',     'st-user-036', 'ST-036', crypt('Demo@2026', gen_salt('bf', 10)), 'instructor', 'active'),
  ('ทดสอบ คนที่ 37',     'st-user-037', 'ST-037', crypt('Demo@2026', gen_salt('bf', 10)), 'instructor', 'active'),
  ('ทดสอบ คนที่ 38',     'st-user-038', 'ST-038', crypt('Demo@2026', gen_salt('bf', 10)), 'instructor', 'active'),
  ('ทดสอบ คนที่ 39',     'st-user-039', 'ST-039', crypt('Demo@2026', gen_salt('bf', 10)), 'user',       'active'),
  ('ทดสอบ คนที่ 40',     'st-user-040', 'ST-040', crypt('Demo@2026', gen_salt('bf', 10)), 'user',       'active'),
  ('ทดสอบ คนที่ 41',     'st-user-041', 'ST-041', crypt('Demo@2026', gen_salt('bf', 10)), 'user',       'inactive'),
  ('ทดสอบ คนที่ 42',     'st-user-042', 'ST-042', crypt('Demo@2026', gen_salt('bf', 10)), 'user',       'inactive'),
  ('ทดสอบ คนที่ 43',     'st-user-043', 'ST-043', crypt('Demo@2026', gen_salt('bf', 10)), 'user',       'active'),
  ('ทดสอบ คนที่ 44',     'st-user-044', 'ST-044', crypt('Demo@2026', gen_salt('bf', 10)), 'user',       'active'),
  ('ทดสอบ คนที่ 45',     'st-user-045', 'ST-045', crypt('Demo@2026', gen_salt('bf', 10)), 'user',       'active'),
  ('ทดสอบ คนที่ 46',     'st-user-046', 'ST-046', crypt('Demo@2026', gen_salt('bf', 10)), 'user',       'active'),
  ('ทดสอบ คนที่ 47',     'st-user-047', 'ST-047', crypt('Demo@2026', gen_salt('bf', 10)), 'user',       'active'),
  ('ทดสอบ คนที่ 48',     'st-user-048', 'ST-048', crypt('Demo@2026', gen_salt('bf', 10)), 'user',       'active'),
  ('ทดสอบ คนที่ 49',     'st-user-049', 'ST-049', crypt('Demo@2026', gen_salt('bf', 10)), 'user',       'active'),
  ('ทดสอบ คนที่ 50',     'st-user-050', 'ST-050', crypt('Demo@2026', gen_salt('bf', 10)), 'user',       'active');

-- === STRESS TEST LOGIN LOGS (กระจาย heatmap) ===
INSERT INTO user_login_logs (user_id, logged_in_at)
SELECT u.id, ts
FROM users u
CROSS JOIN (VALUES
  (NOW() - INTERVAL '90 days'), (NOW() - INTERVAL '85 days'),
  (NOW() - INTERVAL '80 days'), (NOW() - INTERVAL '75 days'),
  (NOW() - INTERVAL '70 days'), (NOW() - INTERVAL '65 days'),
  (NOW() - INTERVAL '60 days'), (NOW() - INTERVAL '55 days'),
  (NOW() - INTERVAL '50 days'), (NOW() - INTERVAL '45 days'),
  (NOW() - INTERVAL '40 days'), (NOW() - INTERVAL '35 days'),
  (NOW() - INTERVAL '30 days'), (NOW() - INTERVAL '25 days'),
  (NOW() - INTERVAL '20 days'), (NOW() - INTERVAL '15 days'),
  (NOW() - INTERVAL '10 days'), (NOW() - INTERVAL '5 days'),
  (NOW() - INTERVAL '3 days'),  (NOW() - INTERVAL '1 day')
) AS t(ts)
WHERE u.username LIKE 'st-user-0%' AND RIGHT(u.username, 2)::int <= 20;

INSERT INTO user_login_logs (user_id, logged_in_at)
SELECT u.id, ts
FROM users u
CROSS JOIN (VALUES
  (NOW() - INTERVAL '30 days'), (NOW() - INTERVAL '20 days'),
  (NOW() - INTERVAL '10 days'), (NOW() - INTERVAL '5 days'),
  (NOW() - INTERVAL '2 days'),  (NOW() - INTERVAL '1 day')
) AS t(ts)
WHERE u.username LIKE 'st-user-0%' AND RIGHT(u.username, 2)::int BETWEEN 21 AND 40;

INSERT INTO user_login_logs (user_id, logged_in_at)
SELECT u.id, ts
FROM users u
CROSS JOIN (VALUES
  (NOW() - INTERVAL '10 days'), (NOW() - INTERVAL '3 days')
) AS t(ts)
WHERE u.username LIKE 'st-user-0%' AND RIGHT(u.username, 2)::int BETWEEN 41 AND 50;

-- === STRESS TEST COURSES (10 courses จาก instructors ทดสอบ top creators) ===
INSERT INTO courses (id, title, creator, owner_username, status, description, image, content, skill_points, subtopic_completion_score, course_completion_score) VALUES
  (
    'st-course-01', 'Network Fundamentals', 'ทดสอบ คนที่ 36', 'st-user-036', 'active',
    'เครือข่ายพื้นฐาน: OSI Model, TCP/IP, Subnetting',
    'https://picsum.photos/seed/st-net/640/360',
    E'# Network Fundamentals\n\n## OSI Model\nOSI Model มี 7 ชั้น ตั้งแต่ Physical จนถึง Application\n\n### osi-basics\n- [SCORE] 10\n- [Q] OSI Model มีกี่ชั้น :: 7 ชั้น :: 10\n\n## TCP/IP\nTCP/IP มี 4 ชั้น ซึ่งถือเป็นโมเดลที่ใช้จริงบน Internet\n\n### tcpip\n- [SCORE] 10\n- [Q] TCP/IP มีกี่ชั้น :: 4 ชั้น :: 10\n\n## Subnetting\nSubnetting ใช้แบ่ง network ออกเป็น subnet ย่อย\n\n### subnetting\n- [SCORE] 10\n- [Q] Subnet mask /24 มีกี่ host :: 254 :: 10',
    10, 10, 60
  ),
  (
    'st-course-02', 'Cloud Computing Basics', 'ทดสอบ คนที่ 36', 'st-user-036', 'active',
    'พื้นฐาน Cloud: IaaS, PaaS, SaaS',
    'https://picsum.photos/seed/st-cloud/640/360',
    E'# Cloud Computing Basics\n\n## IaaS\nInfrastructure as a Service ให้เช่า VM, Storage, Network\n\n### iaas\n- [SCORE] 10\n- [Q] IaaS ย่อมาจากอะไร :: Infrastructure as a Service :: 10\n\n## PaaS\nPlatform as a Service ให้ runtime พร้อมใช้งาน\n\n### paas\n- [SCORE] 10\n- [Q] PaaS ย่อมาจากอะไร :: Platform as a Service :: 10\n\n## SaaS\nSoftware as a Service คือซอฟต์แวร์สำเร็จรูปบน cloud\n\n### saas\n- [SCORE] 10\n- [Q] Gmail จัดเป็น cloud model ใด :: SaaS :: 10',
    10, 10, 50
  ),
  (
    'st-course-03', 'Docker & Containers', 'ทดสอบ คนที่ 37', 'st-user-037', 'active',
    'การใช้ Docker สร้าง container และ image',
    'https://picsum.photos/seed/st-docker/640/360',
    E'# Docker & Containers\n\n## Container vs VM\nContainer แชร์ kernel เดียวกัน เบากว่า VM มาก\n\n### container-vs-vm\n- [SCORE] 10\n- [Q] Container ต่างจาก VM อย่างไร :: แชร์ kernel เบากว่า :: 10\n\n## Dockerfile\nDockerfile ใช้สร้าง image โดยกำหนด base image, command, expose port\n\n### dockerfile\n- [SCORE] 10\n- [Q] คำสั่งกำหนด base image คือ :: FROM :: 10',
    10, 10, 40
  ),
  (
    'st-course-04', 'Git Version Control', 'ทดสอบ คนที่ 37', 'st-user-037', 'active',
    'พื้นฐาน Git: branch, merge, rebase, conflict resolution',
    'https://picsum.photos/seed/st-git/640/360',
    E'# Git Version Control\n\n## Branch & Merge\nBranch ใช้แยกงาน Merge ใช้รวมงานกลับ\n\n### branch-merge\n- [SCORE] 10\n- [Q] คำสั่งสร้าง branch ใหม่ :: git branch :: 10\n\n## Rebase\nRebase ย้ายประวัติ commit ให้เรียงใหม่บน target branch\n\n### rebase\n- [SCORE] 10\n- [Q] Rebase ต่างจาก Merge อย่างไร :: ย้ายประวัติให้เรียงใหม่ :: 10',
    10, 10, 40
  ),
  (
    'st-course-05', 'SQL Fundamentals', 'ทดสอบ คนที่ 38', 'st-user-038', 'active',
    'พื้นฐาน SQL: SELECT, JOIN, GROUP BY, Subquery',
    'https://picsum.photos/seed/st-sql/640/360',
    E'# SQL Fundamentals\n\n## SELECT & WHERE\nSELECT เลือกคอลัมน์ WHERE กรองข้อมูลตามเงื่อนไข\n\n### select-where\n- [SCORE] 10\n- [Q] คำสั่งกรองข้อมูลใน SQL คือ :: WHERE :: 10\n\n## JOIN\nJOIN ใช้เชื่อมตารางหลายตารางเข้าด้วยกัน\n\n### join-basics\n- [SCORE] 10\n- [Q] INNER JOIN แสดงข้อมูลแบบใด :: เฉพาะแถวที่ตรงกัน :: 10\n\n## GROUP BY\nGROUP BY รวมกลุ่มข้อมูลเพื่อใช้กับ aggregate function\n\n### group-by\n- [SCORE] 10\n- [Q] Aggregate function ที่นับจำนวนคือ :: COUNT :: 10',
    10, 10, 60
  ),
  (
    'st-course-06', 'Agile & Scrum', 'ทดสอบ คนที่ 38', 'st-user-038', 'active',
    'Agile Methodology, Sprint, User Story, Retrospective',
    'https://picsum.photos/seed/st-agile/640/360',
    E'# Agile & Scrum\n\n## Sprint\nSprint คือช่วงเวลาทำงานคงที่ โดยปกติ 1-4 สัปดาห์\n\n### sprint\n- [SCORE] 10\n- [Q] Sprint ปกติยาวกี่สัปดาห์ :: 1-4 สัปดาห์ :: 10\n\n## Retrospective\nRetrospective สรุปสิ่งที่ดีและควรปรับปรุงหลังจบ Sprint\n\n### retro\n- [SCORE] 10\n- [Q] Retrospective จัดเมื่อไหร่ :: หลังจบ Sprint :: 10',
    10, 10, 40
  ),
  (
    'st-course-07', 'Python for Beginners', 'ทดสอบ คนที่ 36', 'st-user-036', 'active',
    'พื้นฐาน Python: ตัวแปร, ฟังก์ชัน, loop, list comprehension',
    'https://picsum.photos/seed/st-python/640/360',
    E'# Python for Beginners\n\n## Variables & Types\nPython เป็น dynamically typed ไม่ต้องประกาศ type\n\n### var-types\n- [SCORE] 10\n- [Q] Python เป็น typed แบบใด :: dynamically typed :: 10\n\n## Functions\nFunction ใช้ def ตามด้วยชื่อและ parameter\n\n### functions\n- [SCORE] 10\n- [Q] คำสั่งสร้างฟังก์ชันใน Python :: def :: 10',
    10, 10, 40
  ),
  (
    'st-course-08', 'Cybersecurity Advanced', 'ทดสอบ คนที่ 37', 'st-user-037', 'active',
    'การป้องกันภัยไซเบอร์ขั้นสูง: Zero Trust, SASE, XDR',
    'https://picsum.photos/seed/st-cybadv/640/360',
    E'# Cybersecurity Advanced\n\n## Zero Trust\nZero Trust หมายถึงไม่ไว้วางใจทุกเครื่องและทุกผู้ใช้โดยอัตโนมัติ\n\n### zero-trust\n- [SCORE] 15\n- [Q] หลักการ Zero Trust คืออะไร :: ไม่ไว้วางใจโดยอัตโนมัติ :: 10\n\n## XDR\nExtended Detection and Response รวม EDR, NDR, SIEM เข้าด้วยกัน\n\n### xdr\n- [SCORE] 15\n- [Q] XDR ย่อมาจากอะไร :: Extended Detection and Response :: 10',
    10, 15, 50
  ),
  (
    'st-course-09', 'Data Privacy & PDPA', 'ทดสอบ คนที่ 38', 'st-user-038', 'inactive',
    'กฎหมายคุ้มครองข้อมูลส่วนบุคคล PDPA',
    'https://picsum.photos/seed/st-pdpa/640/360',
    E'# Data Privacy & PDPA\n\n## PDPA Overview\nPDPA คือ พ.ร.บ. คุ้มครองข้อมูลส่วนบุคคล พ.ศ. 2562\n\n### pdpa-overview\n- [SCORE] 10\n- [Q] PDPA ย่อมาจากอะไร :: Personal Data Protection Act :: 10\n\n## Data Subject Rights\nเจ้าของข้อมูลมีสิทธิ ขอเข้าถึง แก้ไข ลบ และคัดค้าน\n\n### data-rights\n- [SCORE] 10\n- [Q] สิทธิของเจ้าของข้อมูลมีอะไรบ้าง :: เข้าถึง แก้ไข ลบ คัดค้าน :: 10',
    10, 10, 40
  ),
  (
    'st-course-10', 'Presentation Skills', 'ทดสอบ คนที่ 36', 'st-user-036', 'inprogress',
    'ทักษะนำเสนองาน: โครงสร้าง, การพูด, สไลด์',
    'https://picsum.photos/seed/st-present/640/360',
    E'# Presentation Skills\n\n## Storytelling\nเล่าเรื่องแบบมีโครงสร้าง: Opening, Body, Closing\n\n### storytelling\n- [SCORE] 10\n- [Q] โครงสร้างการนำเสนอมี 3 ส่วนคือ :: Opening Body Closing :: 10\n\n## Slide Design\nสไลด์ที่ดีไม่ควรมีข้อความมากเกิน ใช้ภาพและกราฟเสริม\n\n### slide-design\n- [SCORE] 10\n- [Q] สไลด์ที่ดีควรเป็นอย่างไร :: ข้อความน้อย ใช้ภาพเสริม :: 10',
    10, 10, 40
  );

INSERT INTO course_skill_rewards (course_id, skill, points) VALUES
  ('st-course-01', 'Networking',         50),
  ('st-course-01', 'Infrastructure',     30),
  ('st-course-02', 'Cloud',              50),
  ('st-course-02', 'Infrastructure',     40),
  ('st-course-03', 'DevOps',             50),
  ('st-course-03', 'Container',          40),
  ('st-course-04', 'Git',                50),
  ('st-course-04', 'DevOps',             30),
  ('st-course-05', 'SQL',                60),
  ('st-course-05', 'Data Analysis',      40),
  ('st-course-06', 'Agile',              50),
  ('st-course-06', 'Project Management', 40),
  ('st-course-07', 'Python',             60),
  ('st-course-07', 'Programming',        40),
  ('st-course-08', 'Cybersecurity',      60),
  ('st-course-08', 'Threat Hunting',     40),
  ('st-course-09', 'Data Privacy',       50),
  ('st-course-09', 'Compliance',         30),
  ('st-course-10', 'Communication',      40),
  ('st-course-10', 'Presentation',       30);

-- === STRESS TEST ENROLLMENTS (กระจาย users ลง courses ให้เยอะ) ===
-- st-course-01 (35 learners — สูงสุด)
INSERT INTO user_course_enrollments (username, course_id, enrolled_at, completed_at)
SELECT 'st-user-' || LPAD(n::text, 3, '0'), 'st-course-01',
  NOW() - (120 - n) * INTERVAL '1 day',
  CASE WHEN n <= 20 THEN NOW() - (90 - n) * INTERVAL '1 day' ELSE NULL END
FROM generate_series(1, 35) AS n;

-- st-course-02 (30 learners)
INSERT INTO user_course_enrollments (username, course_id, enrolled_at, completed_at)
SELECT 'st-user-' || LPAD(n::text, 3, '0'), 'st-course-02',
  NOW() - (100 - n) * INTERVAL '1 day',
  CASE WHEN n <= 15 THEN NOW() - (70 - n) * INTERVAL '1 day' ELSE NULL END
FROM generate_series(1, 30) AS n;

-- st-course-03 (25 learners)
INSERT INTO user_course_enrollments (username, course_id, enrolled_at, completed_at)
SELECT 'st-user-' || LPAD(n::text, 3, '0'), 'st-course-03',
  NOW() - (90 - n) * INTERVAL '1 day',
  CASE WHEN n <= 12 THEN NOW() - (60 - n) * INTERVAL '1 day' ELSE NULL END
FROM generate_series(1, 25) AS n;

-- st-course-04 (20 learners)
INSERT INTO user_course_enrollments (username, course_id, enrolled_at, completed_at)
SELECT 'st-user-' || LPAD(n::text, 3, '0'), 'st-course-04',
  NOW() - (80 - n) * INTERVAL '1 day',
  CASE WHEN n <= 10 THEN NOW() - (50 - n) * INTERVAL '1 day' ELSE NULL END
FROM generate_series(1, 20) AS n;

-- st-course-05 (28 learners)
INSERT INTO user_course_enrollments (username, course_id, enrolled_at, completed_at)
SELECT 'st-user-' || LPAD(n::text, 3, '0'), 'st-course-05',
  NOW() - (110 - n) * INTERVAL '1 day',
  CASE WHEN n <= 18 THEN NOW() - (80 - n) * INTERVAL '1 day' ELSE NULL END
FROM generate_series(1, 28) AS n;

-- st-course-06 (22 learners)
INSERT INTO user_course_enrollments (username, course_id, enrolled_at, completed_at)
SELECT 'st-user-' || LPAD(n::text, 3, '0'), 'st-course-06',
  NOW() - (70 - n) * INTERVAL '1 day',
  CASE WHEN n <= 8 THEN NOW() - (40 - n) * INTERVAL '1 day' ELSE NULL END
FROM generate_series(1, 22) AS n;

-- st-course-07 (18 learners)
INSERT INTO user_course_enrollments (username, course_id, enrolled_at, completed_at)
SELECT 'st-user-' || LPAD(n::text, 3, '0'), 'st-course-07',
  NOW() - (60 - n) * INTERVAL '1 day',
  CASE WHEN n <= 5 THEN NOW() - (30 - n) * INTERVAL '1 day' ELSE NULL END
FROM generate_series(1, 18) AS n;

-- st-course-08 (15 learners)
INSERT INTO user_course_enrollments (username, course_id, enrolled_at, completed_at)
SELECT 'st-user-' || LPAD(n::text, 3, '0'), 'st-course-08',
  NOW() - (50 - n) * INTERVAL '1 day',
  CASE WHEN n <= 5 THEN NOW() - (25 - n) * INTERVAL '1 day' ELSE NULL END
FROM generate_series(1, 15) AS n;

-- original users ลง stress-test courses ด้วย
INSERT INTO user_course_enrollments (username, course_id, enrolled_at, completed_at) VALUES
  ('somchai',   'st-course-01', NOW() - INTERVAL '80 days',  NOW() - INTERVAL '60 days'),
  ('somying',   'st-course-01', NOW() - INTERVAL '70 days',  NOW() - INTERVAL '55 days'),
  ('anant',     'st-course-01', NOW() - INTERVAL '90 days',  NOW() - INTERVAL '70 days'),
  ('kittichai', 'st-course-02', NOW() - INTERVAL '60 days',  NOW() - INTERVAL '40 days'),
  ('wannee',    'st-course-02', NOW() - INTERVAL '50 days',  NULL),
  ('wichai',    'st-course-03', NOW() - INTERVAL '40 days',  NULL),
  ('pranom',    'st-course-05', NOW() - INTERVAL '45 days',  NOW() - INTERVAL '30 days'),
  ('weerachai', 'st-course-05', NOW() - INTERVAL '50 days',  NOW() - INTERVAL '35 days'),
  ('burin',     'st-course-07', NOW() - INTERVAL '20 days',  NULL),
  ('pairot',    'st-course-06', NOW() - INTERVAL '15 days',  NULL);

-- === STRESS TEST LEARNING PROGRESS (subtopic completions) ===
-- completed learners ใน st-course-01 (3 subtopics: osi-basics, tcpip, subnetting)
INSERT INTO learning_subtopic_progress (username, course_id, subtopic_id, completed_at)
SELECT 'st-user-' || LPAD(n::text, 3, '0'), 'st-course-01', sub.id,
  NOW() - (90 - n) * INTERVAL '1 day' + sub.offset_hrs * INTERVAL '1 hour'
FROM generate_series(1, 20) AS n
CROSS JOIN (VALUES ('osi-basics', 0), ('tcpip', 2), ('subnetting', 4)) AS sub(id, offset_hrs);

-- completed learners ใน st-course-02 (3 subtopics: iaas, paas, saas)
INSERT INTO learning_subtopic_progress (username, course_id, subtopic_id, completed_at)
SELECT 'st-user-' || LPAD(n::text, 3, '0'), 'st-course-02', sub.id,
  NOW() - (70 - n) * INTERVAL '1 day' + sub.offset_hrs * INTERVAL '1 hour'
FROM generate_series(1, 15) AS n
CROSS JOIN (VALUES ('iaas', 0), ('paas', 2), ('saas', 4)) AS sub(id, offset_hrs);

-- completed learners ใน st-course-05 (3 subtopics: select-where, join-basics, group-by)
INSERT INTO learning_subtopic_progress (username, course_id, subtopic_id, completed_at)
SELECT 'st-user-' || LPAD(n::text, 3, '0'), 'st-course-05', sub.id,
  NOW() - (80 - n) * INTERVAL '1 day' + sub.offset_hrs * INTERVAL '1 hour'
FROM generate_series(1, 18) AS n
CROSS JOIN (VALUES ('select-where', 0), ('join-basics', 2), ('group-by', 4)) AS sub(id, offset_hrs);

-- partial progress สำหรับ in-progress learners
INSERT INTO learning_subtopic_progress (username, course_id, subtopic_id, completed_at)
SELECT 'st-user-' || LPAD(n::text, 3, '0'), 'st-course-01', 'osi-basics',
  NOW() - (30 - n) * INTERVAL '1 day'
FROM generate_series(21, 30) AS n;

INSERT INTO learning_subtopic_progress (username, course_id, subtopic_id, completed_at)
SELECT 'st-user-' || LPAD(n::text, 3, '0'), 'st-course-03', sub.id,
  NOW() - (60 - n) * INTERVAL '1 day' + sub.offset_hrs * INTERVAL '1 hour'
FROM generate_series(1, 12) AS n
CROSS JOIN (VALUES ('container-vs-vm', 0), ('dockerfile', 2)) AS sub(id, offset_hrs);

-- === STRESS TEST SCORES (กระจายระดับ Lv1-Lv5) ===
INSERT INTO user_scores (username, total) VALUES
  ('st-user-001', 850),  -- Lv5
  ('st-user-002', 780),  -- Lv5
  ('st-user-003', 720),  -- Lv5
  ('st-user-004', 600),  -- Lv4
  ('st-user-005', 550),  -- Lv4
  ('st-user-006', 480),  -- Lv4
  ('st-user-007', 400),  -- Lv4
  ('st-user-008', 350),  -- Lv4
  ('st-user-009', 300),  -- Lv3
  ('st-user-010', 280),  -- Lv3
  ('st-user-011', 250),  -- Lv3
  ('st-user-012', 220),  -- Lv3
  ('st-user-013', 200),  -- Lv3
  ('st-user-014', 180),  -- Lv3
  ('st-user-015', 165),  -- Lv3
  ('st-user-016', 150),  -- Lv3
  ('st-user-017', 140),  -- Lv2
  ('st-user-018', 130),  -- Lv2
  ('st-user-019', 120),  -- Lv2
  ('st-user-020', 110),  -- Lv2
  ('st-user-021', 100),  -- Lv2
  ('st-user-022',  95),  -- Lv2
  ('st-user-023',  85),  -- Lv2
  ('st-user-024',  75),  -- Lv2
  ('st-user-025',  65),  -- Lv2
  ('st-user-026',  55),  -- Lv2
  ('st-user-027',  50),  -- Lv2
  ('st-user-028',  45),  -- Lv1
  ('st-user-029',  40),  -- Lv1
  ('st-user-030',  35),  -- Lv1
  ('st-user-031',  30),  -- Lv1
  ('st-user-032',  25),  -- Lv1
  ('st-user-033',  20),  -- Lv1
  ('st-user-034',  15),  -- Lv1
  ('st-user-035',  10),  -- Lv1
  ('st-user-036', 420),  -- Lv4 (instructor)
  ('st-user-037', 380),  -- Lv4 (instructor)
  ('st-user-038', 350),  -- Lv4 (instructor)
  ('st-user-039',   5),  -- Lv1
  ('st-user-040',   3),  -- Lv1
  ('st-user-043',  45),  -- Lv1
  ('st-user-044',  40),  -- Lv1
  ('st-user-045',  35),  -- Lv1
  ('st-user-046',  30),  -- Lv1
  ('st-user-047',  20),  -- Lv1
  ('st-user-048',  15),  -- Lv1
  ('st-user-049',  10),  -- Lv1
  ('st-user-050',   5);  -- Lv1

-- === STRESS TEST SKILL SCORES ===
INSERT INTO user_skill_scores (username, skill, points) VALUES
  ('st-user-001', 'Networking',     80), ('st-user-001', 'Cloud',          60), ('st-user-001', 'SQL',       70),
  ('st-user-002', 'Networking',     70), ('st-user-002', 'DevOps',         60), ('st-user-002', 'Python',    50),
  ('st-user-003', 'SQL',            80), ('st-user-003', 'Data Analysis',  60), ('st-user-003', 'Cloud',     40),
  ('st-user-004', 'Networking',     60), ('st-user-004', 'Cybersecurity',  50),
  ('st-user-005', 'Cloud',          60), ('st-user-005', 'DevOps',         40),
  ('st-user-006', 'SQL',            50), ('st-user-006', 'Agile',          40),
  ('st-user-007', 'Python',         50), ('st-user-007', 'Git',            30),
  ('st-user-008', 'Networking',     40), ('st-user-008', 'Cloud',          30),
  ('st-user-009', 'SQL',            40), ('st-user-009', 'Data Analysis',  25),
  ('st-user-010', 'DevOps',         35), ('st-user-010', 'Container',      25),
  ('st-user-036', 'Networking',     80), ('st-user-036', 'Cloud',          70), ('st-user-036', 'Python', 60),
  ('st-user-037', 'DevOps',         80), ('st-user-037', 'Git',            60), ('st-user-037', 'Cybersecurity', 50),
  ('st-user-038', 'SQL',            70), ('st-user-038', 'Data Privacy',   60), ('st-user-038', 'Agile', 50);

-- === STRESS TEST SCORE EVENTS (ทดสอบ leaderboard ตามช่วงเวลา) ===
INSERT INTO user_score_events (username, score, reason, course_id, earned_at)
SELECT 'st-user-' || LPAD(n::text, 3, '0'),
  (10 + (n % 5) * 5),
  CASE WHEN n % 3 = 0 THEN 'course_complete' ELSE 'subtopic_complete' END,
  'st-course-0' || (1 + (n % 8))::text,
  NOW() - (n * 3) * INTERVAL '1 day'
FROM generate_series(1, 50) AS n;

-- เพิ่ม score events สำหรับ monthly completions chart (กระจาย ม.ค.-ธ.ค.)
INSERT INTO user_score_events (username, score, reason, course_id, earned_at)
SELECT 'st-user-' || LPAD(((m * 3 + s) % 50 + 1)::text, 3, '0'),
  20,
  'course_complete',
  'st-course-0' || (1 + (m % 8))::text,
  DATE_TRUNC('year', NOW()) + (m - 1) * INTERVAL '1 month' + s * INTERVAL '3 days'
FROM generate_series(1, 12) AS m
CROSS JOIN generate_series(1, 4) AS s;

-- === STRESS TEST EXAMS (3 exams เพิ่ม) ===
INSERT INTO exams (id, title, creator, owner_username, status, description, instructions, image, number_of_questions, default_time, max_attempts) VALUES
  (
    'st-exam-01',
    'ข้อสอบ Network Fundamentals',
    'ทดสอบ คนที่ 36',
    'st-user-036',
    'active',
    'ทดสอบความเข้าใจเรื่องเครือข่ายพื้นฐาน OSI, TCP/IP',
    'เลือกคำตอบที่ถูกต้อง มีเวลา 15 นาที',
    'https://picsum.photos/seed/st-exam-net/640/360',
    5, 15, 5
  ),
  (
    'st-exam-02',
    'ข้อสอบ Cloud Computing',
    'ทดสอบ คนที่ 37',
    'st-user-037',
    'active',
    'ทดสอบความเข้าใจ Cloud models: IaaS, PaaS, SaaS',
    'เลือกคำตอบที่ถูกต้อง มีเวลา 15 นาที',
    'https://picsum.photos/seed/st-exam-cloud/640/360',
    5, 15, 3
  ),
  (
    'st-exam-03',
    'ข้อสอบ SQL & Database',
    'ทดสอบ คนที่ 38',
    'st-user-038',
    'active',
    'ทดสอบความเข้าใจพื้นฐาน SQL: SELECT, JOIN, GROUP BY',
    'เลือกคำตอบที่ถูกต้อง มีเวลา 20 นาที',
    'https://picsum.photos/seed/st-exam-sql/640/360',
    5, 20, 0
  );

INSERT INTO exam_domain_percentages (exam_id, domain, percentage) VALUES
  ('st-exam-01', 'Networking', 100),
  ('st-exam-02', 'Cloud',      100),
  ('st-exam-03', 'Database',   100);

-- Questions for st-exam-01
INSERT INTO exam_questions (id, exam_id, domain, question_type, question, choice_a, choice_b, choice_c, choice_d, answer_key, explanation) VALUES
  ('st-eq-net-01', 'st-exam-01', 'Networking', 'multiple_choice',
   'OSI Model มีกี่ชั้น (layer)?', '4 ชั้น', '5 ชั้น', '7 ชั้น', '9 ชั้น',
   'C', 'OSI Model มี 7 ชั้น: Physical, Data Link, Network, Transport, Session, Presentation, Application'),
  ('st-eq-net-02', 'st-exam-01', 'Networking', 'multiple_choice',
   'TCP/IP Model มีกี่ชั้น?', '3 ชั้น', '4 ชั้น', '5 ชั้น', '7 ชั้น',
   'B', 'TCP/IP มี 4 ชั้น: Network Access, Internet, Transport, Application'),
  ('st-eq-net-03', 'st-exam-01', 'Networking', 'multiple_choice',
   'Subnet mask /24 มี host ได้กี่ตัว?', '128', '254', '256', '512',
   'B', '/24 = 256 addresses - 2 (network + broadcast) = 254 hosts'),
  ('st-eq-net-04', 'st-exam-01', 'Networking', 'multiple_choice',
   'HTTP ใช้ port มาตรฐานใด?', '21', '22', '80', '443',
   'C', 'HTTP ใช้ port 80, HTTPS ใช้ port 443'),
  ('st-eq-net-05', 'st-exam-01', 'Networking', 'multiple_choice',
   'DNS ทำหน้าที่อะไร?', 'เข้ารหัสข้อมูล', 'แปลง domain เป็น IP', 'กรองเว็บ', 'ส่งอีเมล',
   'B', 'DNS = Domain Name System แปลงชื่อ domain เป็น IP address');

-- Questions for st-exam-02
INSERT INTO exam_questions (id, exam_id, domain, question_type, question, choice_a, choice_b, choice_c, choice_d, answer_key, explanation) VALUES
  ('st-eq-cloud-01', 'st-exam-02', 'Cloud', 'multiple_choice',
   'IaaS ให้บริการอะไร?', 'ซอฟต์แวร์สำเร็จรูป', 'แพลตฟอร์มพัฒนา', 'โครงสร้างพื้นฐาน', 'ฐานข้อมูลเท่านั้น',
   'C', 'IaaS = Infrastructure as a Service ให้ VM, Storage, Network'),
  ('st-eq-cloud-02', 'st-exam-02', 'Cloud', 'multiple_choice',
   'Gmail จัดเป็น Cloud model ใด?', 'IaaS', 'PaaS', 'SaaS', 'FaaS',
   'C', 'Gmail เป็น SaaS: ซอฟต์แวร์พร้อมใช้งานผ่าน browser'),
  ('st-eq-cloud-03', 'st-exam-02', 'Cloud', 'multiple_choice',
   'PaaS เหมาะกับใคร?', 'End Users', 'Developers', 'Network Engineers', 'Auditors',
   'B', 'PaaS ให้ runtime, middleware เหมาะสำหรับนักพัฒนา'),
  ('st-eq-cloud-04', 'st-exam-02', 'Cloud', 'multiple_choice',
   'ข้อใดเป็น Public Cloud Provider?', 'VMware', 'AWS', 'Docker', 'Kubernetes',
   'B', 'AWS, Azure, GCP เป็น Public Cloud Provider ชั้นนำ'),
  ('st-eq-cloud-05', 'st-exam-02', 'Cloud', 'multiple_choice',
   'Hybrid Cloud คืออะไร?', 'ใช้เฉพาะ On-premise', 'ผสม Public + Private Cloud', 'ใช้เฉพาะ SaaS', 'Cloud สำรอง',
   'B', 'Hybrid Cloud ผสมผสาน Public Cloud กับ Private Cloud/On-premises');

-- Questions for st-exam-03
INSERT INTO exam_questions (id, exam_id, domain, question_type, question, choice_a, choice_b, choice_c, choice_d, answer_key, explanation) VALUES
  ('st-eq-sql-01', 'st-exam-03', 'Database', 'multiple_choice',
   'คำสั่งใดใช้กรองข้อมูลใน SQL?', 'SELECT', 'WHERE', 'GROUP BY', 'ORDER BY',
   'B', 'WHERE ใช้กำหนดเงื่อนไขกรองข้อมูลใน query'),
  ('st-eq-sql-02', 'st-exam-03', 'Database', 'multiple_choice',
   'INNER JOIN แสดงข้อมูลแบบใด?', 'ทุกแถวจากทั้งสองตาราง', 'เฉพาะแถวที่ตรงกัน', 'เฉพาะตารางซ้าย', 'เฉพาะตารางขวา',
   'B', 'INNER JOIN คืนเฉพาะแถวที่ match กันทั้งสองตาราง'),
  ('st-eq-sql-03', 'st-exam-03', 'Database', 'multiple_choice',
   'Aggregate function ที่นับจำนวนคือ?', 'SUM', 'AVG', 'COUNT', 'MAX',
   'C', 'COUNT ใช้นับจำนวน row ที่ตรงเงื่อนไข'),
  ('st-eq-sql-04', 'st-exam-03', 'Database', 'multiple_choice',
   'คำสั่งใดเรียงลำดับผลลัพธ์?', 'GROUP BY', 'HAVING', 'ORDER BY', 'LIMIT',
   'C', 'ORDER BY เรียงลำดับผลลัพธ์ตามคอลัมน์ที่กำหนด'),
  ('st-eq-sql-05', 'st-exam-03', 'Database', 'multiple_choice',
   'PRIMARY KEY มีคุณสมบัติใด?', 'ซ้ำได้', 'ไม่ซ้ำและไม่เป็น NULL', 'เป็น NULL ได้', 'เก็บข้อมูลหลาย type',
   'B', 'PRIMARY KEY ต้อง unique และ NOT NULL');

-- === STRESS TEST EXAM ATTEMPTS (100+ attempts ข้ามสัปดาห์) ===

-- สัปดาห์ปัจจุบัน: วันจันทร์-ศุกร์ ข้อสอบ st-exam-01 (กระจายทุกวัน)
INSERT INTO exam_attempts (username, exam_id, correct_count, total_questions, score_percent, domain_stats, started_at, finished_at)
SELECT
  'st-user-' || LPAD(n::text, 3, '0'),
  'st-exam-01',
  CASE WHEN n % 4 = 0 THEN 5 WHEN n % 4 = 1 THEN 4 WHEN n % 4 = 2 THEN 3 ELSE 2 END,
  5,
  CASE WHEN n % 4 = 0 THEN 100.00 WHEN n % 4 = 1 THEN 80.00 WHEN n % 4 = 2 THEN 60.00 ELSE 40.00 END,
  ('{"Networking":{"correct":' || CASE WHEN n % 4 = 0 THEN '5' WHEN n % 4 = 1 THEN '4' WHEN n % 4 = 2 THEN '3' ELSE '2' END || ',"total":5}}')::jsonb,
  DATE_TRUNC('week', NOW()) + ((n - 1) % 5) * INTERVAL '1 day' + n * INTERVAL '30 minutes',
  DATE_TRUNC('week', NOW()) + ((n - 1) % 5) * INTERVAL '1 day' + n * INTERVAL '30 minutes' + INTERVAL '12 minutes'
FROM generate_series(1, 30) AS n;

-- สัปดาห์ปัจจุบัน: st-exam-02 (Cloud)
INSERT INTO exam_attempts (username, exam_id, correct_count, total_questions, score_percent, domain_stats, started_at, finished_at)
SELECT
  'st-user-' || LPAD(n::text, 3, '0'),
  'st-exam-02',
  CASE WHEN n % 3 = 0 THEN 5 WHEN n % 3 = 1 THEN 3 ELSE 2 END,
  5,
  CASE WHEN n % 3 = 0 THEN 100.00 WHEN n % 3 = 1 THEN 60.00 ELSE 40.00 END,
  ('{"Cloud":{"correct":' || CASE WHEN n % 3 = 0 THEN '5' WHEN n % 3 = 1 THEN '3' ELSE '2' END || ',"total":5}}')::jsonb,
  DATE_TRUNC('week', NOW()) + ((n - 1) % 5) * INTERVAL '1 day' + (n + 15) * INTERVAL '30 minutes',
  DATE_TRUNC('week', NOW()) + ((n - 1) % 5) * INTERVAL '1 day' + (n + 15) * INTERVAL '30 minutes' + INTERVAL '14 minutes'
FROM generate_series(1, 20) AS n;

-- สัปดาห์ปัจจุบัน: st-exam-03 (SQL) + original exams
INSERT INTO exam_attempts (username, exam_id, correct_count, total_questions, score_percent, domain_stats, started_at, finished_at)
SELECT
  'st-user-' || LPAD(n::text, 3, '0'),
  'st-exam-03',
  CASE WHEN n % 5 = 0 THEN 5 WHEN n % 5 = 1 THEN 4 WHEN n % 5 = 2 THEN 3 WHEN n % 5 = 3 THEN 2 ELSE 1 END,
  5,
  CASE WHEN n % 5 = 0 THEN 100.00 WHEN n % 5 = 1 THEN 80.00 WHEN n % 5 = 2 THEN 60.00 WHEN n % 5 = 3 THEN 40.00 ELSE 20.00 END,
  ('{"Database":{"correct":' || CASE WHEN n % 5 = 0 THEN '5' WHEN n % 5 = 1 THEN '4' WHEN n % 5 = 2 THEN '3' WHEN n % 5 = 3 THEN '2' ELSE '1' END || ',"total":5}}')::jsonb,
  DATE_TRUNC('week', NOW()) + ((n - 1) % 5) * INTERVAL '1 day' + (n + 30) * INTERVAL '30 minutes',
  DATE_TRUNC('week', NOW()) + ((n - 1) % 5) * INTERVAL '1 day' + (n + 30) * INTERVAL '30 minutes' + INTERVAL '18 minutes'
FROM generate_series(1, 25) AS n;

-- attempts ย้อนหลัง (กระจาย 90 วัน — ทดสอบ exam history pagination)
INSERT INTO exam_attempts (username, exam_id, correct_count, total_questions, score_percent, domain_stats, started_at, finished_at)
SELECT
  'st-user-' || LPAD(((n - 1) % 35 + 1)::text, 3, '0'),
  CASE WHEN n % 5 IN (0,1) THEN 'st-exam-01' WHEN n % 5 IN (2,3) THEN 'st-exam-02' ELSE 'st-exam-03' END,
  CASE WHEN n % 4 = 0 THEN 5 WHEN n % 4 = 1 THEN 4 WHEN n % 4 = 2 THEN 3 ELSE 1 END,
  5,
  CASE WHEN n % 4 = 0 THEN 100.00 WHEN n % 4 = 1 THEN 80.00 WHEN n % 4 = 2 THEN 60.00 ELSE 20.00 END,
  (CASE
    WHEN n % 5 IN (0,1) THEN '{"Networking":{"correct":' || CASE WHEN n % 4 = 0 THEN '5' WHEN n % 4 = 1 THEN '4' WHEN n % 4 = 2 THEN '3' ELSE '1' END || ',"total":5}}'
    WHEN n % 5 IN (2,3) THEN '{"Cloud":{"correct":' || CASE WHEN n % 4 = 0 THEN '5' WHEN n % 4 = 1 THEN '4' WHEN n % 4 = 2 THEN '3' ELSE '1' END || ',"total":5}}'
    ELSE '{"Database":{"correct":' || CASE WHEN n % 4 = 0 THEN '5' WHEN n % 4 = 1 THEN '4' WHEN n % 4 = 2 THEN '3' ELSE '1' END || ',"total":5}}'
  END)::jsonb,
  NOW() - n * INTERVAL '1 day' - (n % 8) * INTERVAL '1 hour',
  NOW() - n * INTERVAL '1 day' - (n % 8) * INTERVAL '1 hour' + INTERVAL '15 minutes'
FROM generate_series(1, 90) AS n;

-- stress-test users สอบ original exams ด้วย
INSERT INTO exam_attempts (username, exam_id, correct_count, total_questions, score_percent, domain_stats, started_at, finished_at)
SELECT
  'st-user-' || LPAD(n::text, 3, '0'),
  'exam-itsec-01',
  CASE WHEN n % 3 = 0 THEN 5 WHEN n % 3 = 1 THEN 4 ELSE 2 END,
  5,
  CASE WHEN n % 3 = 0 THEN 100.00 WHEN n % 3 = 1 THEN 80.00 ELSE 40.00 END,
  ('{"Security":{"correct":' || CASE WHEN n % 3 = 0 THEN '5' WHEN n % 3 = 1 THEN '4' ELSE '2' END || ',"total":5}}')::jsonb,
  NOW() - (n * 2) * INTERVAL '1 day',
  NOW() - (n * 2) * INTERVAL '1 day' + INTERVAL '20 minutes'
FROM generate_series(1, 30) AS n;

INSERT INTO exam_attempts (username, exam_id, correct_count, total_questions, score_percent, domain_stats, started_at, finished_at)
SELECT
  'st-user-' || LPAD(n::text, 3, '0'),
  'exam-timemgmt-01',
  CASE WHEN n % 2 = 0 THEN 5 ELSE 3 END,
  5,
  CASE WHEN n % 2 = 0 THEN 100.00 ELSE 60.00 END,
  ('{"Management":{"correct":' || CASE WHEN n % 2 = 0 THEN '5' ELSE '3' END || ',"total":5}}')::jsonb,
  NOW() - (n * 2 + 1) * INTERVAL '1 day',
  NOW() - (n * 2 + 1) * INTERVAL '1 day' + INTERVAL '13 minutes'
FROM generate_series(1, 25) AS n;

-- === STRESS TEST MONTHLY COMPLETIONS (เพิ่ม enrollments ที่ complete ในแต่ละเดือน) ===
-- ใช้ st-course-06: สร้าง enrollments ที่จบแต่ละเดือนของปี
INSERT INTO user_course_enrollments (username, course_id, enrolled_at, completed_at)
SELECT
  'st-user-' || LPAD(n::text, 3, '0'),
  'st-course-06',
  DATE_TRUNC('year', NOW()) + (n - 1) * INTERVAL '1 month',
  DATE_TRUNC('year', NOW()) + (n - 1) * INTERVAL '1 month' + INTERVAL '10 days'
FROM generate_series(23, 35) AS n  -- users 23-35 ในเดือน ม.ค-ม.ค+12 ไม่เกิน
WHERE n <= 35
  AND 'st-user-' || LPAD(n::text, 3, '0') NOT IN (
    SELECT username FROM user_course_enrollments WHERE course_id = 'st-course-06'
  );

-- ==========================================================
-- ███  BULK COURSES (100 more: st-course-011 ~ st-course-110)  ███
-- ==========================================================

DO $$
DECLARE
  titles TEXT[] := ARRAY[
    'Linux Administration',        'Windows Server Management',   'DevOps Pipeline',
    'API Design Patterns',         'React Frontend Development',  'Node.js Backend',
    'Kubernetes Orchestration',    'Terraform Infrastructure',    'Ansible Automation',
    'Prometheus Monitoring',       'GraphQL API',                 'TypeScript Advanced',
    'MongoDB NoSQL',               'Redis Caching',               'RabbitMQ Messaging',
    'Elasticsearch Analytics',     'CI/CD Best Practices',        'Microservices Architecture',
    'Clean Code Principles',       'Design Patterns',             'UX/UI Foundations',
    'Business Analysis',           'Data Engineering',            'Machine Learning Basics',
    'IoT Fundamentals'
  ];
  descs TEXT[] := ARRAY[
    'การบริหารจัดการระบบปฏิบัติการ Linux สำหรับ Server',
    'การจัดการ Windows Server: Active Directory, Group Policy',
    'ออกแบบ Pipeline สำหรับ Build, Test, Deploy อัตโนมัติ',
    'หลักการออกแบบ RESTful API และ versioning',
    'พัฒนา Single Page Application ด้วย React และ Hooks',
    'สร้าง Backend API ด้วย Node.js, Express, middleware',
    'จัดการ Container cluster ด้วย Kubernetes',
    'สร้าง Infrastructure as Code ด้วย Terraform',
    'Automate configuration management ด้วย Ansible',
    'ติดตั้งและใช้ Prometheus + Grafana เพื่อ monitoring',
    'ออกแบบ API ด้วย GraphQL: Query, Mutation, Subscription',
    'TypeScript ขั้นสูง: Generics, Utility Types, Decorators',
    'ฐานข้อมูล NoSQL ด้วย MongoDB: CRUD, Aggregation Pipeline',
    'ใช้ Redis สำหรับ caching, session, pub/sub',
    'ระบบ Message Queue ด้วย RabbitMQ: exchange, routing',
    'ค้นหาและวิเคราะห์ข้อมูลด้วย Elasticsearch',
    'แนวปฏิบัติ CI/CD: GitHub Actions, Jenkins, ArgoCD',
    'ออกแบบระบบแบบ Microservices: decomposition, communication',
    'เขียนโค้ดสะอาดตามหลัก SOLID และ DRY',
    'รูปแบบการออกแบบซอฟต์แวร์: Singleton, Factory, Observer',
    'พื้นฐานการออกแบบ UI/UX: wireframe, prototype, usability',
    'วิเคราะห์ความต้องการธุรกิจและเขียน requirement',
    'สร้าง Data Pipeline: ETL, data lake, data warehouse',
    'เรียนรู้ Machine Learning เบื้องต้น: regression, classification',
    'พื้นฐาน Internet of Things: sensor, protocol, edge computing'
  ];
  owners TEXT[] := ARRAY['st-user-036','st-user-037','st-user-038','pranom','weerachai'];
  creators TEXT[] := ARRAY['ทดสอบ คนที่ 36','ทดสอบ คนที่ 37','ทดสอบ คนที่ 38','ปราณี สร้างสรรค์','วีระชัย บรรยาย'];
  statuses TEXT[] := ARRAY['active','active','active','active','active','active','active','inprogress','inprogress','inactive'];
  skills_a TEXT[] := ARRAY[
    'Linux','Windows','DevOps','API Design','React',
    'Node.js','Kubernetes','Terraform','Ansible','Monitoring',
    'GraphQL','TypeScript','MongoDB','Redis','RabbitMQ',
    'Elasticsearch','CI/CD','Microservices','Clean Code','Design Patterns',
    'UX/UI','Business Analysis','Data Engineering','Machine Learning','IoT'
  ];
  skills_b TEXT[] := ARRAY[
    'System Admin','System Admin','Automation','Backend','Frontend',
    'Backend','Container','Infrastructure','Infrastructure','Observability',
    'Backend','Frontend','Database','Database','Messaging',
    'Data Analysis','Automation','Architecture','Software Engineering','Software Engineering',
    'Design','Project Management','Data Analysis','AI','Embedded Systems'
  ];
  i INT; idx INT; oidx INT; sidx INT; vol INT;
  c_title TEXT; c_id TEXT;
BEGIN
  FOR i IN 11..110 LOOP
    idx  := ((i - 11) % 25) + 1;
    oidx := ((i - 11) % 5) + 1;
    sidx := ((i - 11) % 10) + 1;
    vol  := (i - 11) / 25 + 1;
    c_title := titles[idx] || CASE WHEN vol > 1 THEN ' Vol.' || vol ELSE '' END;
    c_id := 'st-course-' || LPAD(i::text, 3, '0');

    INSERT INTO courses (id, title, creator, owner_username, status, description, image, content, skill_points, subtopic_completion_score, course_completion_score)
    VALUES (
      c_id,
      c_title,
      creators[oidx],
      owners[oidx],
      statuses[sidx],
      descs[idx],
      'https://picsum.photos/seed/st-c' || i || '/640/360',
      E'# ' || c_title
        || E'\n\n## บทที่ 1\n' || descs[idx]
        || E'\n\n### subtopic-a\n- [SCORE] 10\n- [Q] คำถามข้อ 1 ของ ' || c_title || E' :: คำตอบ 1 :: 10'
        || E'\n\n## บทที่ 2\nเนื้อหาเชิงลึกของ ' || c_title
        || E'\n\n### subtopic-b\n- [SCORE] 10\n- [Q] คำถามข้อ 2 ของ ' || c_title || ' :: คำตอบ 2 :: 10',
      10, 10, 50
    );

    INSERT INTO course_skill_rewards (course_id, skill, points) VALUES
      (c_id, skills_a[idx], 30 + (i % 30)),
      (c_id, skills_b[idx], 20 + (i % 20));
  END LOOP;
END;
$$;

-- === BULK ENROLLMENTS สำหรับ 100 courses (st-course-011 ~ st-course-110) ===
-- แต่ละ course มี 1-15 learners (จำนวนลดหลั่นตาม course id)
INSERT INTO user_course_enrollments (username, course_id, enrolled_at, completed_at)
SELECT
  'st-user-' || LPAD(u::text, 3, '0'),
  'st-course-' || LPAD(c::text, 3, '0'),
  NOW() - (150 - c + u) * INTERVAL '1 day',
  CASE
    WHEN u <= GREATEST(1, (15 - (c - 11) % 10) / 2)
    THEN NOW() - (100 - c + u) * INTERVAL '1 day'
    ELSE NULL
  END
FROM generate_series(11, 110) AS c
CROSS JOIN generate_series(1, 50) AS u
WHERE u <= GREATEST(2, 15 - ((c - 11) % 13))
  AND u NOT IN (36, 37, 38, 41, 42)  -- exclude instructors & inactive
ON CONFLICT DO NOTHING;

-- === BULK SUBTOPIC PROGRESS สำหรับ completed enrollments ===
INSERT INTO learning_subtopic_progress (username, course_id, subtopic_id, completed_at)
SELECT
  e.username,
  e.course_id,
  sub.id,
  e.completed_at - sub.offset_d * INTERVAL '1 day'
FROM user_course_enrollments e
CROSS JOIN (VALUES ('subtopic-a', 2), ('subtopic-b', 1)) AS sub(id, offset_d)
WHERE e.course_id LIKE 'st-course-0%'
  AND CAST(RIGHT(e.course_id, 3) AS INT) >= 11
  AND e.completed_at IS NOT NULL
ON CONFLICT DO NOTHING;

COMMIT;
