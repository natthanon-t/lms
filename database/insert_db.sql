/* =========================================================
   CBT-LMS — Demo Seed Data
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
-- USERS (demo)  password ทุก account: Demo@2026
-- ==========================================================

INSERT INTO users (name, username, employee_code, password_hash, role, status) VALUES
  ('สมชาย ใจดี',      'somchai',  '2026-IT-0001', crypt('Demo@2026', gen_salt('bf', 10)), 'user',    'active'),
  ('สมหญิง รักเรียน', 'somying',  '2026-HR-0002', crypt('Demo@2026', gen_salt('bf', 10)), 'user',    'active'),
  ('วิชัย มุ่งมั่น',  'wichai',   '2026-FN-0003', crypt('Demo@2026', gen_salt('bf', 10)), 'user',    'active'),
  ('นภา สดใส',        'napa',     '2026-OP-0004', crypt('Demo@2026', gen_salt('bf', 10)), 'user',    'active'),
  ('อนันต์ พัฒนา',   'anant',    '2026-IT-0005', crypt('Demo@2026', gen_salt('bf', 10)), 'user',    'active'),
  ('มนัส ขยันดี',     'manas',    '2026-HR-0006', crypt('Demo@2026', gen_salt('bf', 10)), 'user',    'inactive');

-- ==========================================================
-- LOGIN LOGS
-- ==========================================================

INSERT INTO user_login_logs (user_id, logged_in_at)
SELECT u.id, ts
FROM users u
CROSS JOIN (VALUES
  (NOW() - INTERVAL '14 days'),
  (NOW() - INTERVAL '10 days'),
  (NOW() - INTERVAL '7 days'),
  (NOW() - INTERVAL '3 days'),
  (NOW() - INTERVAL '1 day')
) AS t(ts)
WHERE u.username IN ('somchai', 'somying', 'anant');

INSERT INTO user_login_logs (user_id, logged_in_at)
SELECT u.id, ts
FROM users u
CROSS JOIN (VALUES
  (NOW() - INTERVAL '5 days'),
  (NOW() - INTERVAL '2 days')
) AS t(ts)
WHERE u.username IN ('wichai', 'napa');

-- ==========================================================
-- COURSES
-- ==========================================================

-- courses จาก demo content (ex-1, ex-2, ex-3)
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
[video: SOC Monitoring Basics](https://www.youtube.com/watch?v=JMY6fYL6l1Y)
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

-- courses จาก org (itsec, timemgmt, excel)
INSERT INTO courses (id, title, creator, owner_username, status, description, image, content, skill_points, subtopic_completion_score, course_completion_score) VALUES
  (
    'course-itsec',
    'ความปลอดภัยในการใช้งาน IT',
    'ฝ่าย IT',
    NULL,
    'active',
    'เรียนรู้แนวปฏิบัติพื้นฐานด้านความปลอดภัยทางไซเบอร์ การจัดการรหัสผ่าน และการป้องกันการโจมตีจากภายนอก',
    '',
    E'# ความปลอดภัยในการใช้งาน IT\n\n## การจัดการรหัสผ่าน\nรหัสผ่านที่ดีควรมีความยาวอย่างน้อย 12 ตัวอักษร ผสมระหว่างตัวพิมพ์ใหญ่ พิมพ์เล็ก ตัวเลข และสัญลักษณ์\n\n**คำถาม:** รหัสผ่านควรมีความยาวขั้นต่ำเท่าไหร่?\n\n## การระวัง Phishing\nอีเมล Phishing มักสร้างความรู้สึกเร่งด่วน หลอกให้คลิก link หรือดาวน์โหลดไฟล์อันตราย\n\n**คำถาม:** เมื่อได้รับอีเมลที่น่าสงสัยควรทำอย่างไร?\n\n## การสำรองข้อมูล\nใช้กฎ 3-2-1 คือ เก็บ 3 สำเนา บน 2 สื่อต่างกัน โดย 1 สำเนาเก็บนอกสถานที่\n\n**คำถาม:** กฎ 3-2-1 หมายความว่าอย่างไร?',
    10, 5, 50
  ),
  (
    'course-timemgmt',
    'การบริหารจัดการเวลา',
    'ฝ่าย HR',
    NULL,
    'active',
    'เทคนิคและเครื่องมือในการจัดการเวลาอย่างมีประสิทธิภาพสำหรับการทำงานในองค์กร',
    '',
    E'# การบริหารจัดการเวลา\n\n## เทคนิค Pomodoro\nทำงาน 25 นาที จากนั้นพัก 5 นาที ทำซ้ำ 4 รอบแล้วพักยาว 15-30 นาที\n\n**คำถาม:** เทคนิค Pomodoro แบ่งเวลาทำงานอย่างไร?\n\n## การจัดลำดับความสำคัญ\nEisenhower Matrix แบ่งงานเป็น 4 กลุ่มตามความเร่งด่วนและความสำคัญ\n\n**คำถาม:** งานประเภทใดควรทำก่อนตาม Eisenhower Matrix?\n\n## การวางแผนประจำวัน\nกำหนด MIT (Most Important Tasks) ไม่เกิน 3 งานต่อวัน\n\n**คำถาม:** MIT ย่อมาจากอะไรและควรมีกี่งานต่อวัน?',
    10, 5, 40
  ),
  (
    'course-excel',
    'Excel สำหรับการวิเคราะห์ข้อมูล',
    'ฝ่าย IT',
    NULL,
    'active',
    'เรียนรู้การใช้ Excel ขั้นสูงสำหรับการวิเคราะห์ข้อมูล ครอบคลุม VLOOKUP, Pivot Table และการสร้างกราฟ',
    '',
    E'# Excel สำหรับการวิเคราะห์ข้อมูล\n\n## VLOOKUP และ XLOOKUP\nใช้สำหรับค้นหาข้อมูลจากตารางอื่น XLOOKUP เป็น version ใหม่ที่ยืดหยุ่นกว่า\n\n**คำถาม:** ความแตกต่างระหว่าง VLOOKUP และ XLOOKUP คืออะไร?\n\n## Pivot Table\nสรุปข้อมูลปริมาณมากได้อย่างรวดเร็ว สามารถ group, sum, count ได้\n\n**คำถาม:** Pivot Table ใช้สำหรับทำอะไร?\n\n## การสร้างกราฟ\nเลือกประเภทกราฟให้เหมาะกับข้อมูล เช่น Bar สำหรับเปรียบเทียบ Line สำหรับแนวโน้ม\n\n**คำถาม:** ควรเลือกกราฟประเภทใดเพื่อแสดงแนวโน้มตามเวลา?',
    10, 5, 60
  );

INSERT INTO course_skill_rewards (course_id, skill, points) VALUES
  ('course-itsec',    'IT Security',     50),
  ('course-itsec',    'Cybersecurity',   30),
  ('course-timemgmt', 'Time Management', 40),
  ('course-timemgmt', 'Productivity',    30),
  ('course-excel',    'Data Analysis',   60),
  ('course-excel',    'Excel',           50);

-- ==========================================================
-- ENROLLMENTS
-- ==========================================================

INSERT INTO user_course_enrollments (username, course_id, enrolled_at) VALUES
  ('somchai',  'course-itsec',    NOW() - INTERVAL '30 days'),
  ('somchai',  'course-excel',    NOW() - INTERVAL '20 days'),
  ('somying',  'course-timemgmt', NOW() - INTERVAL '25 days'),
  ('somying',  'course-itsec',    NOW() - INTERVAL '15 days'),
  ('wichai',   'course-timemgmt', NOW() - INTERVAL '20 days'),
  ('wichai',   'course-excel',    NOW() - INTERVAL '10 days'),
  ('napa',     'course-itsec',    NOW() - INTERVAL '12 days'),
  ('anant',    'course-itsec',    NOW() - INTERVAL '40 days'),
  ('anant',    'course-timemgmt', NOW() - INTERVAL '35 days'),
  ('anant',    'course-excel',    NOW() - INTERVAL '28 days');

-- ==========================================================
-- LEARNING PROGRESS
-- ==========================================================

INSERT INTO learning_subtopic_progress (username, course_id, subtopic_id, completed_at) VALUES
  -- somchai: itsec 2/3 subtopics, excel 1/3
  ('somchai', 'course-itsec',    'password-mgmt', NOW() - INTERVAL '28 days'),
  ('somchai', 'course-itsec',    'phishing',      NOW() - INTERVAL '26 days'),
  ('somchai', 'course-excel',    'vlookup',       NOW() - INTERVAL '18 days'),
  -- somying: timemgmt 2/3, itsec 0
  ('somying', 'course-timemgmt', 'pomodoro',      NOW() - INTERVAL '23 days'),
  ('somying', 'course-timemgmt', 'priority',      NOW() - INTERVAL '21 days'),
  -- wichai: timemgmt 1/3, excel 0
  ('wichai',  'course-timemgmt', 'pomodoro',      NOW() - INTERVAL '18 days'),
  -- anant: ครบทุก subtopic
  ('anant',   'course-itsec',    'password-mgmt', NOW() - INTERVAL '38 days'),
  ('anant',   'course-itsec',    'phishing',      NOW() - INTERVAL '37 days'),
  ('anant',   'course-itsec',    'backup',        NOW() - INTERVAL '36 days'),
  ('anant',   'course-timemgmt', 'pomodoro',      NOW() - INTERVAL '33 days'),
  ('anant',   'course-timemgmt', 'priority',      NOW() - INTERVAL '32 days'),
  ('anant',   'course-timemgmt', 'daily-plan',    NOW() - INTERVAL '31 days'),
  ('anant',   'course-excel',    'vlookup',       NOW() - INTERVAL '26 days'),
  ('anant',   'course-excel',    'pivot',         NOW() - INTERVAL '25 days'),
  ('anant',   'course-excel',    'chart',         NOW() - INTERVAL '24 days');

INSERT INTO learning_subtopic_answers (username, course_id, subtopic_id, question_id, typed_answer, is_correct, answered_at) VALUES
  ('somchai', 'course-itsec',    'password-mgmt', 'q-pwd-len',  'อย่างน้อย 12 ตัวอักษร',      TRUE,  NOW() - INTERVAL '28 days'),
  ('somchai', 'course-itsec',    'phishing',      'q-phi-act',  'แจ้ง IT ทันที',               TRUE,  NOW() - INTERVAL '26 days'),
  ('somchai', 'course-excel',    'vlookup',       'q-xl-diff',  'XLOOKUP ยืดหยุ่นกว่า',        TRUE,  NOW() - INTERVAL '18 days'),
  ('somying', 'course-timemgmt', 'pomodoro',      'q-pom-time', 'ทำ 25 นาที พัก 5 นาที',       TRUE,  NOW() - INTERVAL '23 days'),
  ('somying', 'course-timemgmt', 'priority',      'q-eis-grp',  '4 กลุ่ม',                     TRUE,  NOW() - INTERVAL '21 days'),
  ('anant',   'course-itsec',    'password-mgmt', 'q-pwd-len',  'อย่างน้อย 12 ตัวอักษร',      TRUE,  NOW() - INTERVAL '38 days'),
  ('anant',   'course-itsec',    'phishing',      'q-phi-act',  'แจ้ง IT ทันที',               TRUE,  NOW() - INTERVAL '37 days'),
  ('anant',   'course-itsec',    'backup',        'q-bkp-rule', '3 สำเนา 2 สื่อ 1 นอกสถานที่', TRUE, NOW() - INTERVAL '36 days'),
  ('anant',   'course-timemgmt', 'pomodoro',      'q-pom-time', 'ทำ 25 นาที พัก 5 นาที',       TRUE,  NOW() - INTERVAL '33 days'),
  ('anant',   'course-timemgmt', 'priority',      'q-eis-grp',  '4 กลุ่ม',                     TRUE,  NOW() - INTERVAL '32 days'),
  ('anant',   'course-excel',    'vlookup',       'q-xl-diff',  'XLOOKUP ยืดหยุ่นกว่า',        TRUE,  NOW() - INTERVAL '26 days'),
  ('anant',   'course-excel',    'pivot',         'q-pvt-use',  'สรุปข้อมูลปริมาณมาก',         TRUE,  NOW() - INTERVAL '25 days');


COMMIT;
