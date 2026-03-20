/* =========================================================
   CBT-LMS — Production Deploy Seed
   ไฟล์นี้ใช้สำหรับ deploy จริง (ไม่มี demo data)

   ข้อมูลเริ่มต้นทั้งหมดจัดการโดย Go server อัตโนมัติตอน start:
     - roles        (admin, user, instructor)
     - permissions   (11 รายการ)
     - role_permissions
     - admin user   (จาก env: APP_ADMIN_NAME, APP_ADMIN_USERNAME, APP_ADMIN_PASSWORD)
     - app_settings (default_reset_password)

   ขั้นตอน deploy:
     1. รัน create_db.sql สร้างตาราง
     2. ตั้ง env vars (DATABASE_URL, JWT_SECRET, APP_ADMIN_*)
     3. start Go server → ข้อมูลเริ่มต้นถูกสร้างอัตโนมัติ
   ========================================================= */

-- ไม่ต้อง INSERT อะไร — Go server จัดการให้ทั้งหมด
