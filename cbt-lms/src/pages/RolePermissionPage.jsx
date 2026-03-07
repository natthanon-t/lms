import { useEffect, useMemo, useState } from "react";
import ConfirmModal from "../components/ui/ConfirmModal";
import {
  createRoleAdmin,
  deleteRoleAdmin,
  fetchRoleOptionsAdmin,
  updateRoleAdmin,
  updateRolePermissionsAdmin,
} from "../services/userApiService";

// Future API:
//   GET /api/admin/permissions  → { matrix: { [roleKey]: { [permKey]: boolean } } }
//   PUT /api/admin/permissions  → body: { matrix }

const INITIAL_ROLES = [];
const PERMISSIONS = [];
const DEFAULT_MATRIX = {};

// admin = greyed out, cannot edit permissions or rename
const LOCKED_ROLES = new Set(["admin"]);
const BUILT_IN_ROLES = new Set(["admin", "user"]);
// user = show "(Default)" label, but permissions ARE editable
const DEFAULT_LABEL_ROLES = new Set(["user"]);

const GROUP_LABELS = {
  content: "เนื้อหา",
  exam: "ข้อสอบ",
  system: "ระบบ",
  management: "การจัดการ",
};

const buildEmptyPermissions = (permissions) =>
  Object.fromEntries(permissions.map((p) => [p.key, false]));

const buildMatrix = (roles, permissions, rolePermissions) =>
  Object.fromEntries(
    roles.map((role) => {
      const granted = new Set(Array.isArray(rolePermissions?.[role.key]) ? rolePermissions[role.key] : []);
      return [
        role.key,
        Object.fromEntries(permissions.map((permission) => [permission.key, granted.has(permission.key)])),
      ];
    }),
  );

export default function RolePermissionPage() {
  const [roles, setRoles] = useState(INITIAL_ROLES);
  const [permissions, setPermissions] = useState(PERMISSIONS);
  const [matrix, setMatrix] = useState(DEFAULT_MATRIX);
  const [saveState, setSaveState] = useState("idle");
  const [isDirty, setIsDirty] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [actionError, setActionError] = useState("");

  // --- Add Role form state ---
  const [showAddRole, setShowAddRole] = useState(false);
  const [newRoleLabel, setNewRoleLabel] = useState("");
  const [addError, setAddError] = useState("");

  // --- Confirm Delete modal state ---
  const [confirmDelete, setConfirmDelete] = useState(null); // { key, label } | null

  // --- Inline rename state ---
  const [editingRoleKey, setEditingRoleKey] = useState(null); // key of role being renamed
  const [editingRoleLabel, setEditingRoleLabel] = useState("");

  const GROUPS = useMemo(() => [...new Set(permissions.map((p) => p.group))], [permissions]);

  useEffect(() => {
    let mounted = true;
    void fetchRoleOptionsAdmin()
      .then((payload) => {
        if (!mounted) return;
        const nextRoles = Array.isArray(payload?.roles)
          ? payload.roles.map((role) => ({
            key: String(role?.code ?? "").trim(),
            label: String(role?.name ?? role?.code ?? "").trim(),
          })).filter((role) => role.key)
          : [];
        const nextPermissions = Array.isArray(payload?.permission_catalog)
          ? payload.permission_catalog.map((permission) => ({
            key: String(permission?.code ?? "").trim(),
            group: GROUP_LABELS[String(permission?.module ?? "").trim()] ?? String(permission?.module ?? "อื่น ๆ").trim(),
            label: String(permission?.description ?? permission?.code ?? "").trim(),
          })).filter((permission) => permission.key)
          : [];
        const nextMatrix = buildMatrix(nextRoles, nextPermissions, payload?.role_permissions ?? {});
        setRoles(nextRoles);
        setPermissions(nextPermissions);
        setMatrix(nextMatrix);
        setIsDirty(false);
        setSaveState("idle");
        setLoadError("");
        setActionError("");
      })
      .catch((error) => {
        if (!mounted) return;
        setLoadError(error?.message ?? "ไม่สามารถโหลดข้อมูลบทบาทและสิทธิ์ได้");
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });
    return () => { mounted = false; };
  }, []);

  const toggle = (roleKey, permKey) => {
    if (LOCKED_ROLES.has(roleKey)) return;
    setMatrix((prev) => ({
      ...prev,
      [roleKey]: { ...prev[roleKey], [permKey]: !prev[roleKey]?.[permKey] },
    }));
    setSaveState("idle");
    setIsDirty(true);
  };

  const handleSave = async () => {
    setSaveState("saving");
    setActionError("");
    try {
      // Save each non-locked role concurrently
      const editableRoles = roles.filter((r) => !LOCKED_ROLES.has(r.key));
      await Promise.all(
        editableRoles.map((role) => {
          const granted = Object.entries(matrix[role.key] ?? {})
            .filter(([, checked]) => checked)
            .map(([permKey]) => permKey);
          return updateRolePermissionsAdmin(role.key, granted);
        }),
      );
      setSaveState("saved");
      setIsDirty(false);
      setTimeout(() => setSaveState("idle"), 2000);
    } catch (err) {
      setActionError(err?.message ?? "ไม่สามารถบันทึกสิทธิ์ได้");
      setSaveState("error");
      setTimeout(() => setSaveState("idle"), 3000);
    }
  };

  const handleAddRole = async () => {
    const label = newRoleLabel.trim();
    if (!label) { setAddError("กรุณากรอกชื่อบทบาท"); return; }
    const key = label.toLowerCase().replace(/\s+/g, "_").replace(/[^a-z0-9_ก-๙]/g, "");
    if (roles.some((r) => r.key === key)) { setAddError("ชื่อบทบาทนี้มีอยู่แล้ว"); return; }
    try {
      const payload = await createRoleAdmin({ code: key, name: label });
      const createdRole = payload?.role ?? {};
      const nextRole = {
        key: String(createdRole?.code ?? key).trim(),
        label: String(createdRole?.name ?? label).trim(),
      };
      setRoles((prev) => [...prev, nextRole]);
      setMatrix((prev) => ({ ...prev, [nextRole.key]: buildEmptyPermissions(permissions) }));
      setNewRoleLabel("");
      setAddError("");
      setShowAddRole(false);
      setSaveState("idle");
      setIsDirty(false);
      setActionError("");
    } catch (error) {
      setAddError(error?.message ?? "ไม่สามารถเพิ่มบทบาทได้");
    }
  };

  const handleRemoveRole = (roleKey) => {
    if (BUILT_IN_ROLES.has(roleKey)) return;
    const role = roles.find((r) => r.key === roleKey);
    setConfirmDelete({ key: roleKey, label: role?.label ?? roleKey });
  };

  const doRemoveRole = async (roleKey) => {
    try {
      await deleteRoleAdmin(roleKey);
      setRoles((prev) => prev.filter((r) => r.key !== roleKey));
      setMatrix((prev) => { const next = { ...prev }; delete next[roleKey]; return next; });
      setSaveState("idle");
      setIsDirty(false);
      setActionError("");
      setConfirmDelete(null);
    } catch (error) {
      setActionError(error?.message ?? "ไม่สามารถลบบทบาทได้");
      setConfirmDelete(null);
    }
  };

  // --- Inline rename handlers ---
  const startRename = (role) => {
    if (BUILT_IN_ROLES.has(role.key)) return;
    setEditingRoleKey(role.key);
    setEditingRoleLabel(role.label);
  };

  const commitRename = async () => {
    const trimmed = editingRoleLabel.trim();
    if (trimmed && editingRoleKey) {
      try {
        const payload = await updateRoleAdmin(editingRoleKey, { name: trimmed });
        const updatedRole = payload?.role ?? {};
        setRoles((prev) => prev.map((r) => (
          r.key === editingRoleKey
            ? { ...r, label: String(updatedRole?.name ?? trimmed).trim() }
            : r
        )));
        setIsDirty(false);
        setSaveState("idle");
        setActionError("");
      } catch (error) {
        setActionError(error?.message ?? "ไม่สามารถแก้ไขชื่อบทบาทได้");
      }
    }
    setEditingRoleKey(null);
    setEditingRoleLabel("");
  };

  const cancelRename = () => {
    setEditingRoleKey(null);
    setEditingRoleLabel("");
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
          <p>กำหนดสิทธิ์การเข้าถึงฟีเจอร์ต่าง ๆ ของแต่ละบทบาทจากข้อมูลหลังบ้าน</p>
        </div>
        {isDirty && (
          <div style={{ marginLeft: "auto" }}>
            <button
              type="button"
              className="enter-button"
              style={{ borderRadius: "999px" }}
              disabled={saveState === "saving"}
              onClick={handleSave}
            >
              {saveState === "saving"
                ? "กำลังบันทึก…"
                : saveState === "saved"
                  ? "✓ บันทึกแล้ว"
                  : saveState === "error"
                    ? "❌ บันทึกไม่สำเร็จ"
                    : "บันทึก"}
            </button>
          </div>
        )}
      </header>

      {loading ? (
        <div className="info-card" style={{ marginBottom: "1rem" }}>
          กำลังโหลดข้อมูลบทบาทและสิทธิ์…
        </div>
      ) : null}

      {!loading && loadError ? (
        <div className="info-card" style={{ marginBottom: "1rem", color: "var(--color-danger, #e54)" }}>
          {loadError}
        </div>
      ) : null}

      {!loading && !loadError && actionError ? (
        <div className="info-card" style={{ marginBottom: "1rem", color: "var(--color-danger, #e54)" }}>
          {actionError}
        </div>
      ) : null}

      {/* ── Add Role inline form ── */}
      {showAddRole && !loading && !loadError && (
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
              {roles.map((r) => {
                const isLocked = LOCKED_ROLES.has(r.key);
                const isBuiltIn = BUILT_IN_ROLES.has(r.key);
                const isDefaultLabel = DEFAULT_LABEL_ROLES.has(r.key);
                const isEditing = editingRoleKey === r.key;

                return (
                  <th key={r.key} className="perm-role-col">
                    <div style={{ position: "relative", display: "inline-block", marginTop: "0.25rem" }}>

                      {/* ── Role name (click to rename if not locked) ── */}
                      {isEditing ? (
                        <input
                          type="text"
                          className="editor-input"
                          value={editingRoleLabel}
                          style={{ width: "90px", fontSize: "0.85rem", padding: "2px 6px" }}
                          autoFocus
                          onChange={(e) => setEditingRoleLabel(e.target.value)}
                          onBlur={commitRename}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") commitRename();
                            if (e.key === "Escape") cancelRename();
                          }}
                        />
                      ) : (
                        <span
                          title={isBuiltIn ? "บทบาทนี้ไม่สามารถแก้ไขชื่อได้" : "คลิกเพื่อแก้ไขชื่อ"}
                          style={{
                            cursor: isBuiltIn ? "default" : "text",
                            borderBottom: isBuiltIn ? "none" : "1px dashed #9ca3af",
                            paddingBottom: "1px",
                          }}
                          onClick={() => !isBuiltIn && startRename(r)}
                        >
                          {r.label}
                        </span>
                      )}

                      {/* ── (Default) label below name ── */}
                      {isDefaultLabel && (
                        <span style={{
                          display: "block",
                          fontSize: "0.68rem",
                          color: "#9ca3af",
                          marginTop: "0.1rem",
                          fontWeight: 400,
                          letterSpacing: "0.01em",
                        }}>(Default)</span>
                      )}

                      {/* ── Delete button (hidden for locked roles) ── */}
                      {!isBuiltIn && !isEditing && (
                        <button
                          type="button"
                          title={`ลบบทบาท ${r.label}`}
                          onClick={() => handleRemoveRole(r.key)}
                          style={{
                            position: "absolute",
                            top: "-8px",
                            right: "-14px",
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
                );
              })}
              {/* ── Add Role button as last column header ── */}
              <th className="perm-role-col">
                <button
                  type="button"
                  onClick={() => setShowAddRole(true)}
                  disabled={loading || Boolean(loadError)}
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
            {!loading && !loadError && GROUPS.flatMap((group) => [
              <tr key={`g-${group}`} className="perm-group-row">
                <td colSpan={roles.length + 2}>{group}</td>
              </tr>,
              ...permissions.filter((p) => p.group === group).map((perm) => (
                <tr key={perm.key}>
                  <td className="perm-label">{perm.label}</td>
                  {roles.map((role) => {
                    const isLocked = LOCKED_ROLES.has(role.key);
                    const checked = matrix[role.key]?.[perm.key] ?? false;
                    return (
                      <td
                        key={role.key}
                        className="perm-cell"
                        style={isLocked ? { opacity: 0.4, pointerEvents: "none" } : undefined}
                      >
                        <input
                          type="checkbox"
                          className="perm-checkbox"
                          checked={checked}
                          disabled={isLocked}
                          onChange={() => toggle(role.key, perm.key)}
                          title={isLocked ? "ไม่สามารถแก้ไขสิทธิ์ของบทบาทนี้ได้" : ""}
                        />
                      </td>
                    );
                  })}
                  <td /> {/* empty cell for add-role column */}
                </tr>
              )),
            ])}
            {!loading && !loadError && roles.length === 0 ? (
              <tr>
                <td colSpan={2} style={{ textAlign: "center", color: "#6b8ab8", padding: "24px" }}>
                  ไม่พบบทบาทจากระบบ
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>


    </section>
  );
}
