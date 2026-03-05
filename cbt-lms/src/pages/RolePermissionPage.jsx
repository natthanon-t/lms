import { useState } from "react";

// Future API:
//   GET /api/admin/permissions  → { matrix: { [roleKey]: { [permKey]: boolean } } }
//   PUT /api/admin/permissions  → body: { matrix }

const ROLES = [
  { key: "admin", label: "ผู้ดูแลระบบ" },
  { key: "user",  label: "ผู้ใช้งาน" },
];

const PERMISSIONS = [
  { key: "view_courses",        group: "เนื้อหา",    label: "ดูเนื้อหาคอร์ส" },
  { key: "study_courses",       group: "เนื้อหา",    label: "เรียนคอร์สและทำแบบฝึกหัด" },
  { key: "create_content",      group: "เนื้อหา",    label: "สร้าง / แก้ไขเนื้อหา" },
  { key: "take_exams",          group: "ข้อสอบ",     label: "เข้าทำข้อสอบ" },
  { key: "create_exams",        group: "ข้อสอบ",     label: "สร้าง / แก้ไขข้อสอบ" },
  { key: "view_leaderboard",    group: "ระบบ",       label: "ดูลีดเดอร์บอร์ด" },
  { key: "view_summary",        group: "ระบบ",       label: "ดูรายงานสรุปผล" },
  { key: "view_exam_history",   group: "ระบบ",       label: "ดูประวัติการสอบ" },
  { key: "manage_users",        group: "การจัดการ",  label: "จัดการผู้ใช้" },
  { key: "manage_permissions",  group: "การจัดการ",  label: "จัดการสิทธิ์การใช้งาน" },
];

const LOCKED = new Set(["admin:manage_users", "admin:manage_permissions"]);

const DEFAULT_MATRIX = {
  admin: {
    view_courses: true, study_courses: true, create_content: true,
    take_exams: true, create_exams: true, view_leaderboard: true,
    view_summary: true, view_exam_history: true,
    manage_users: true, manage_permissions: true,
  },
  user: {
    view_courses: true, study_courses: true, create_content: false,
    take_exams: true, create_exams: false, view_leaderboard: true,
    view_summary: false, view_exam_history: false,
    manage_users: false, manage_permissions: false,
  },
};

const GROUPS = [...new Set(PERMISSIONS.map((p) => p.group))];

export default function RolePermissionPage() {
  const [matrix, setMatrix] = useState(DEFAULT_MATRIX);
  const [saveState, setSaveState] = useState("idle"); // "idle" | "saved"

  const toggle = (roleKey, permKey) => {
    if (LOCKED.has(`${roleKey}:${permKey}`)) return;
    setMatrix((prev) => ({
      ...prev,
      [roleKey]: { ...prev[roleKey], [permKey]: !prev[roleKey]?.[permKey] },
    }));
    setSaveState("idle");
  };

  const handleSave = () => {
    // Future: await updatePermissionsApi(matrix)
    setSaveState("saved");
    setTimeout(() => setSaveState("idle"), 2500);
  };

  return (
    <section className="workspace-content">
      <header className="content-header">
        <div>
          <h1>สิทธิ์การใช้งาน</h1>
          <p>กำหนดสิทธิ์การเข้าถึงฟีเจอร์ต่าง ๆ ของแต่ละบทบาท (ข้อมูลจำลอง)</p>
        </div>
        <button type="button" className="enter-button" onClick={handleSave}>
          {saveState === "saved" ? "บันทึกแล้ว ✓" : "บันทึก"}
        </button>
      </header>

      <div className="role-perm-table-wrap">
        <table className="role-perm-table">
          <thead>
            <tr>
              <th className="perm-label-col">สิทธิ์การใช้งาน</th>
              {ROLES.map((r) => (
                <th key={r.key} className="perm-role-col">{r.label}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {GROUPS.flatMap((group) => [
              <tr key={`g-${group}`} className="perm-group-row">
                <td colSpan={ROLES.length + 1}>{group}</td>
              </tr>,
              ...PERMISSIONS.filter((p) => p.group === group).map((perm) => (
                <tr key={perm.key}>
                  <td className="perm-label">{perm.label}</td>
                  {ROLES.map((role) => {
                    const locked = LOCKED.has(`${role.key}:${perm.key}`);
                    const checked = matrix[role.key]?.[perm.key] ?? false;
                    return (
                      <td key={role.key} className="perm-cell">
                        <input
                          type="checkbox"
                          className="perm-checkbox"
                          checked={checked}
                          disabled={locked}
                          onChange={() => toggle(role.key, perm.key)}
                          title={locked ? "สิทธิ์นี้ไม่สามารถปิดได้สำหรับผู้ดูแลระบบ" : ""}
                        />
                      </td>
                    );
                  })}
                </tr>
              )),
            ])}
          </tbody>
        </table>
      </div>

      <p className="perm-note">
        หมายเหตุ: การเปลี่ยนแปลงสิทธิ์จะมีผลเมื่อกด &ldquo;บันทึก&rdquo; — ยังไม่ได้เชื่อมกับหลังบ้าน
      </p>
    </section>
  );
}
