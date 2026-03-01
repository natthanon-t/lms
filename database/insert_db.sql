/* =========================================================
   CBT-LMS — Seed Data
   หมายเหตุ: admin user ถูก seed อัตโนมัติโดย Go backend
   ตอน startup ผ่าน EnsureDefaultAdminUser() จาก env vars:
     APP_ADMIN_NAME, APP_ADMIN_USERNAME, APP_ADMIN_PASSWORD
   =========================================================
   ไฟล์นี้ใช้สำหรับ manual seed เท่านั้น (เช่น dev/test)
   password_hash ด้านล่างต้องเป็น bcrypt hash จริง
   ========================================================= */

-- ตัวอย่าง: INSERT admin แบบ manual (ใช้ bcrypt hash จริง)
-- INSERT INTO users (name, email, employee_code, password_hash, role, status)
-- VALUES ('Admin', 'admin', '', '<bcrypt_hash>', 'admin', 'active');
