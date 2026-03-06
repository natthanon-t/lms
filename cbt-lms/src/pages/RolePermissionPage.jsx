import { useState } from "react";
import ConfirmModal from "../components/ui/ConfirmModal";

// Future API:
//   GET /api/admin/permissions  → { matrix: { [roleKey]: { [permKey]: boolean } } }
//   PUT /api/admin/permissions  → body: { matrix }

const INITIAL_ROLES = [
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

const buildEmptyPermissions = () =>
  Object.fromEntries(PERMISSIONS.map((p) => [p.key, false]));

export default function RolePermissionPage() {
  const [roles, setRoles] = useState(INITIAL_ROLES);
  const [matrix, setMatrix] = useState(DEFAULT_MATRIX);
  const [saveState, setSaveState] = useState("idle");
  const [isDirty, setIsDirty] = useState(false);

  // --- Add Role form state ---
  const [showAddRole, setShowAddRole] = useState(false);
  const [newRoleLabel, setNewRoleLabel] = useState("");
  const [addError, setAddError] = useState("");

  // --- Confirm Delete modal state ---
  const [confirmDelete, setConfirmDelete] = useState(null); // { key, label } | null

  const toggle = (roleKey, permKey) => {
    if (LOCKED.has(`${roleKey}:${permKey}`)) return;
    setMatrix((prev) => ({
      ...prev,
      [roleKey]: { ...prev[roleKey], [permKey]: !prev[roleKey]?.[permKey] },
    }));
    setSaveState("idle");
    setIsDirty(true);
  };

  const handleSave = () => {
    // Future: await updatePermissionsApi(matrix)
    setSaveState("saved");
    setIsDirty(false);
    setTimeout(() => setSaveState("idle"), 2500);
  };

  const handleAddRole = () => {
    const label = newRoleLabel.trim();
    if (!label) { setAddError("กรุณากรอกชื่อบทบาท"); return; }
    const key = label.toLowerCase().replace(/\s+/g, "_").replace(/[^a-z0-9_ก-๙]/g, "");
    if (roles.some((r) => r.key === key)) { setAddError("ชื่อบทบาทนี้มีอยู่แล้ว"); return; }
    setRoles((prev) => [...prev, { key, label }]);
    setMatrix((prev) => ({ ...prev, [key]: buildEmptyPermissions() }));
    setNewRoleLabel("");
    setAddError("");
    setShowAddRole(false);
    setSaveState("idle");
    setIsDirty(true);
  };

  const handleRemoveRole = (roleKey) => {
    if (roleKey === "admin") return;
    const role = roles.find((r) => r.key === roleKey);
    setConfirmDelete({ key: roleKey, label: role?.label ?? roleKey });
  };

  const doRemoveRole = (roleKey) => {
    setRoles((prev) => prev.filter((r) => r.key !== roleKey));
    setMatrix((prev) => { const next = { ...prev }; delete next[roleKey]; return next; });
    setSaveState("idle");
    setIsDirty(true);
    setConfirmDelete(null);
  };

  return (
    <section className="workspace-content">
      {confirmDelete && (
        <ConfirmModal
          title="ยืนยันการลบ?"
          message={`คุณต้องการลบบทบาท "${confirmDelete.label}" ใช่หรือไม่? หากลบแล้วจะไม่สามารถย้อนกลับได้`}
          confirmLabel="ลบทิ้ง"
          cancelLabel="ยกเลิก"
          confirmDanger
          onConfirm={() => doRemoveRole(confirmDelete.key)}
          onCancel={() => setConfirmDelete(null)}
        />
      )}

      <header className="content-header">
        <div>
          <h1>สิทธิ์การใช้งาน</h1>
          <p>กำหนดสิทธิ์การเข้าถึงฟีเจอร์ต่าง ๆ ของแต่ละบทบาท (ข้อมูลจำลอง)</p>
        </div>
        {isDirty && (
          <div style={{ marginLeft: "auto" }}>
            <button
              type="button"
              className="enter-button"
              style={{ borderRadius: "999px" }}
              onClick={handleSave}
            >
              {saveState === "saved" ? "บันทึกแล้ว ✓" : "บันทึก"}
            </button>
          </div>
        )}
      </header>

      {/* ── Add Role inline form ── */}
      {showAddRole && (
        <div className="info-card" style={{ marginBottom: "1rem", display: "flex", gap: "0.75rem", alignItems: "center", flexWrap: "wrap" }}>
          <label style={{ fontWeight: 600, whiteSpace: "nowrap" }}>ชื่อบทบาทใหม่:</label>
          <input
            type="text"
            className="editor-input"
            style={{ flex: "1 1 200px", minWidth: "160px" }}
            placeholder="เช่น ผู้สอน"
            value={newRoleLabel}
            onChange={(e) => { setNewRoleLabel(e.target.value); setAddError(""); }}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleAddRole();
              if (e.key === "Escape") { setShowAddRole(false); setNewRoleLabel(""); setAddError(""); }
            }}
            autoFocus
          />
          <button type="button" className="enter-button" onClick={handleAddRole}>ยืนยัน</button>
          <button type="button" className="back-button" onClick={() => { setShowAddRole(false); setNewRoleLabel(""); setAddError(""); }}>ยกเลิก</button>
          {addError && <span style={{ color: "var(--color-danger, #e54)", fontSize: "0.875rem" }}>{addError}</span>}
        </div>
      )}

      <div className="role-perm-table-wrap">
        <table className="role-perm-table">
          <thead>
            <tr>
              <th className="perm-label-col">สิทธิ์การใช้งาน</th>
              {roles.map((r) => (
                <th key={r.key} className="perm-role-col">
                  {/* หุ้ม <span> ด้วย div relative ให้ปุ่มอ้างอิงจากตรงนี้แทนขอบตาราง */}
                  <div style={{ position: "relative", display: "inline-block", marginTop: "0.25rem" }}>
                    <span>{r.label}</span>
                    {r.key !== "admin" && (
                      <button
                        type="button"
                        title={`ลบบทบาท ${r.label}`}
                        onClick={() => handleRemoveRole(r.key)}
                        style={{
                          position: "absolute",
                          top: "-8px", // ลอยขึ้นขวาบนของคำ
                          right: "-14px", // ห่างจากชื่อมาทางขวานิดหน่อย
                          background: "none",
                          border: "none",
                          cursor: "pointer",
                          color: "#9ca3af",
                          fontSize: "0.65rem",
                          lineHeight: 1,
                          padding: "2px",
                          opacity: 0.5,
                          transition: "opacity 0.2s, color 0.2s",
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.opacity = "1";
                          e.currentTarget.style.color = "var(--color-danger, #e54)";
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.opacity = "0.5";
                          e.currentTarget.style.color = "#9ca3af";
                        }}
                      >
                        ✕
                      </button>
                    )}
                  </div>
                </th>
              ))}
              {/* ── Add Role button as last column header ── */}
              <th className="perm-role-col">
                <button
                  type="button"
                  onClick={() => setShowAddRole(true)}
                  style={{
                    background: "none", border: "1.5px dashed currentColor",
                    borderRadius: "999px", padding: "0.2rem 0.75rem",
                    cursor: "pointer", fontSize: "0.85rem", opacity: 0.65,
                    whiteSpace: "nowrap",
                  }}
                  title="เพิ่ม Role ใหม่"
                >
                  + เพิ่ม Role
                </button>
              </th>
            </tr>
          </thead>
          <tbody>
            {GROUPS.flatMap((group) => [
              <tr key={`g-${group}`} className="perm-group-row">
                <td colSpan={roles.length + 2}>{group}</td>
              </tr>,
              ...PERMISSIONS.filter((p) => p.group === group).map((perm) => (
                <tr key={perm.key}>
                  <td className="perm-label">{perm.label}</td>
                  {roles.map((role) => {
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
                  <td /> {/* empty cell for add-role column */}
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
