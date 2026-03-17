import { useEffect, useMemo, useState } from "react";
import { getPageNumbers } from "../utils/pagination";
import { useEscapeKey } from "../hooks/useEscapeKey";
import { getInitials } from "../utils/avatar";
import { useAuth } from "../contexts/AuthContext";
import { useAppData } from "../contexts/AppDataContext";

const statusOptions = ["active", "inactive"];
const employeeCodePattern = /^2026-[A-Z0-9]{2}-\d{4}$/;

function getRoleKey(role) {
  const r = String(role ?? "").toLowerCase().trim();
  if (r === "admin") return "admin";
  if (r === "instructor") return "instructor";
  return "user";
}

export default function UserManagementPage() {
  const { currentUserKey, users, adminRoles: roleOptions, defaultUserPassword: defaultPassword, handleUpdateDefaultPassword: onUpdateDefaultPassword } = useAuth();
  const { handleUpdateUserRole: onUpdateUserRole, handleUpdateUserStatus: onUpdateUserStatus, handleUpdateUserProfileByAdmin: onUpdateUserProfile, handleResetUserPassword: onResetUserPassword, handleCreateUser: onCreateUser } = useAppData();
  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [defaultPasswordInput, setDefaultPasswordInput] = useState(defaultPassword ?? "");
  const [newUserName, setNewUserName] = useState("");
  const [newUsername, setNewUsername] = useState("");
  const [newEmployeeCode, setNewEmployeeCode] = useState("");
  const [newRole, setNewRole] = useState("user");
  const [newStatus, setNewStatus] = useState(statusOptions[0]);
  const [newPassword, setNewPassword] = useState(defaultPassword ?? "");
  const [showCreateUserModal, setShowCreateUserModal] = useState(false);
  const [showEditUserModal, setShowEditUserModal] = useState(false);
  const [editingUsername, setEditingUsername] = useState("");
  const [editingName, setEditingName] = useState("");
  const [editingEmployeeCode, setEditingEmployeeCode] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    setDefaultPasswordInput(defaultPassword ?? "");
    if (!String(newPassword ?? "").trim()) {
      setNewPassword(defaultPassword ?? "");
    }
  }, [defaultPassword, newPassword]);

  const allRows = useMemo(
    () =>
      Object.entries(users ?? {}).map(([username, profile]) => ({
        username,
        name: profile?.name ?? username,
        employeeCode: profile?.employeeCode ?? "",
        role: String(profile?.role ?? "user").trim().toLowerCase(),
        status: profile?.status ?? "active",
      })),
    [users],
  );

  const userSummary = useMemo(() => {
    return allRows.reduce(
      (acc, row) => {
        const s = String(row.status ?? "active").trim().toLowerCase();
        acc.total += 1;
        if (s === "active") acc.active += 1;
        if (s === "inactive") acc.inactive += 1;
        return acc;
      },
      { total: 0, active: 0, inactive: 0 },
    );
  }, [allRows]);

  const roleNameMap = useMemo(
    () => Object.fromEntries(roleOptions.map((r) => [r.code, r.name])),
    [roleOptions],
  );

  const [currentPage, setCurrentPage] = useState(1);
  const PAGE_SIZE = 20;

  const keyword = useMemo(() => searchTerm.trim().toLowerCase(), [searchTerm]);
  const nonAdminRoles = useMemo(
    () => roleOptions.filter((r) => r.code !== "admin"),
    [roleOptions],
  );
  const rows = useMemo(
    () =>
      allRows
        .filter((row) => {
          const rolePass = roleFilter === "all" || row.role === roleFilter;
          const statusPass = statusFilter === "all" || row.status === statusFilter;
          const searchPass =
            !keyword ||
            row.username.toLowerCase().includes(keyword) ||
            row.name.toLowerCase().includes(keyword) ||
            row.role.toLowerCase().includes(keyword) ||
            row.employeeCode.toLowerCase().includes(keyword);
          return rolePass && statusPass && searchPass;
        })
        .sort((a, b) => {
          const w = (s) => (String(s).toLowerCase() === "active" ? 0 : 1);
          const diff = w(a.status) - w(b.status);
          if (diff !== 0) return diff;
          return a.name.localeCompare(b.name, "th");
        }),
    [allRows, keyword, roleFilter, statusFilter],
  );

  // Reset page when filters change
  useEffect(() => { setCurrentPage(1); }, [keyword, roleFilter, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
  const paginatedRows = rows.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const handleSaveDefaultPassword = async () => {
    const result = await onUpdateDefaultPassword?.(defaultPasswordInput);
    setMessage(result?.message ?? (result?.success ? "บันทึก default password เรียบร้อย" : "ไม่สามารถบันทึก default password ได้"));
  };

  const handleCreateUser = async () => {
    const normalizedEmployeeCode = String(newEmployeeCode ?? "").trim().toUpperCase();
    if (normalizedEmployeeCode && !employeeCodePattern.test(normalizedEmployeeCode)) {
      setMessage("รหัสพนักงานต้องเป็นรูปแบบ 2026-XX-XXXX");
      return;
    }
    const result = await onCreateUser?.({
      name: newUserName,
      username: newUsername,
      employeeCode: normalizedEmployeeCode || "",
      role: newRole,
      status: newStatus,
      password: newPassword,
    });
    if (!result?.success) {
      setMessage(result?.message ?? "ไม่สามารถเพิ่มผู้ใช้ได้");
      return;
    }
    setMessage(result.message);
    setNewUserName("");
    setNewUsername("");
    setNewEmployeeCode("");
    setNewRole("user");
    setNewStatus(statusOptions[0]);
    setNewPassword(defaultPassword ?? "");
    setShowCreateUserModal(false);
  };

  const isSelfEdit = editingUsername === currentUserKey;

  const closeCreateUserModal = () => setShowCreateUserModal(false);
  const closeEditUserModal = () => setShowEditUserModal(false);

  useEscapeKey(showCreateUserModal, closeCreateUserModal);
  useEscapeKey(showEditUserModal, closeEditUserModal);

  const handleOpenEditUserModal = (row) => {
    setEditingUsername(row.username);
    setEditingName(row.name ?? "");
    setEditingEmployeeCode(row.employeeCode ?? "");
    setShowEditUserModal(true);
  };

  const handleSaveEditedUser = async () => {
    const normalizedName = String(editingName ?? "").trim();
    if (!normalizedName) {
      setMessage("กรุณากรอกชื่อผู้ใช้");
      return;
    }

    const isSelfEdit = editingUsername === currentUserKey;
    const payload = { name: normalizedName };

    if (!isSelfEdit) {
      const normalizedEmployeeCode = String(editingEmployeeCode ?? "").trim().toUpperCase();
      if (normalizedEmployeeCode && !employeeCodePattern.test(normalizedEmployeeCode)) {
        setMessage("รหัสพนักงานต้องเป็นรูปแบบ 2026-XX-XXXX");
        return;
      }
      payload.employee_code = normalizedEmployeeCode || "";
    }

    const result = await onUpdateUserProfile?.(editingUsername, payload);
    if (!result?.success) {
      setMessage(result?.message ?? "ไม่สามารถอัปเดตข้อมูลผู้ใช้ได้");
      return;
    }
    setMessage(result.message ?? "อัปเดตข้อมูลผู้ใช้เรียบร้อย");
    setShowEditUserModal(false);
  };

  return (
    <section className="workspace-content">
      <header className="content-header user-management-header">
        <div>
          <h1>จัดการ User</h1>
          <p>ค้นหาและจัดการตำแหน่ง / สถานะของผู้ใช้งานในระบบ</p>
        </div>
        <button type="button" className="um-add-btn" onClick={() => setShowCreateUserModal(true)}>
          + เพิ่มผู้ใช้งาน
        </button>
      </header>

      {/* Metric Strip */}
      <div className="um-metrics">
        <div className="um-metric-card um-metric-total">
          <span className="um-metric-icon">●</span>
          <div className="um-metric-body">
            <strong className="um-metric-value">{userSummary.total}</strong>
            <span className="um-metric-label">ผู้ใช้ทั้งหมด</span>
          </div>
        </div>
        <div className="um-metric-card um-metric-active">
          <span className="um-metric-icon">✓</span>
          <div className="um-metric-body">
            <strong className="um-metric-value">{userSummary.active}</strong>
            <span className="um-metric-label">Active</span>
          </div>
        </div>
        <div className="um-metric-card um-metric-inactive">
          <span className="um-metric-icon">○</span>
          <div className="um-metric-body">
            <strong className="um-metric-value">{userSummary.inactive}</strong>
            <span className="um-metric-label">Inactive</span>
          </div>
        </div>
      </div>

      {/* Controls Row */}
      <div className="um-controls-row">
        <div className="info-card um-filter-card">
          <div className="um-toolbar">
            <div className="um-search-wrap">
              <span className="um-search-icon">⌕</span>
              <input
                id="user-search"
                type="text"
                className="um-search-input"
                placeholder="ค้นหาชื่อ, username, employee code..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <select className="um-filter-select" value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)}>
              <option value="all">ทุกตำแหน่ง</option>
              {roleOptions.map((r) => (
                <option key={r.code} value={r.code}>
                  {r.name}
                </option>
              ))}
            </select>
            <select className="um-filter-select" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
              <option value="all">ทุกสถานะ</option>
              {statusOptions.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
            <button
              type="button"
              className="um-clear-btn"
              onClick={() => {
                setSearchTerm("");
                setRoleFilter("all");
                setStatusFilter("all");
              }}
            >
              ล้าง
            </button>
          </div>
          <p className="um-result-count">
            พบ <strong>{rows.length}</strong> จาก {allRows.length} รายการ
          </p>
        </div>

        <div className="info-card um-pw-card">
          <p className="um-pw-label">Default Password</p>
          <div className="um-pw-row">
            <input
              type="text"
              className="um-pw-input"
              value={defaultPasswordInput}
              onChange={(e) => setDefaultPasswordInput(e.target.value)}
              placeholder="กำหนด default password"
            />
            <button type="button" className="um-save-btn" onClick={handleSaveDefaultPassword}>
              บันทึก
            </button>
          </div>
          <p className="um-pw-current">
            ปัจจุบัน: <code>{defaultPassword}</code>
          </p>
        </div>
      </div>

      {/* User Table */}
      <div className="leaderboard-card um-table-card">
        <table className="user-management-table um-table">
          <thead>
            <tr>
              <th>ผู้ใช้งาน</th>
              <th>รหัสพนักงาน</th>
              <th>Username</th>
              <th>ตำแหน่ง</th>
              <th>สถานะ</th>
              <th>การจัดการ</th>
            </tr>
          </thead>
          <tbody>
            {paginatedRows.length ? (
              paginatedRows.map((row) => {
                const isAdmin = getRoleKey(row.role) === "admin";
                const isSelf = row.username === currentUserKey;
                const isOtherAdmin = isAdmin && !isSelf;
                return (
                  <tr key={row.username} className={row.status === "inactive" ? "um-row-inactive" : ""}>
                    <td>
                      <div className="um-user-cell">
                        <div className={`um-avatar um-avatar-${getRoleKey(row.role)}`}>{getInitials(row.name)}</div>
                        <div className="um-user-info">
                          <span className="um-user-name">{row.name}</span>
                          {(isSelf || isOtherAdmin) && (
                            <span className="um-protected-badge" title={isSelf ? "บัญชีของคุณ" : "Admin ไม่สามารถแก้ไขได้"}>
                              {isSelf ? "ตัวเอง" : "🔒"}
                            </span>
                          )}
                        </div>
                      </div>
                    </td>
                    <td>
                      <code className="um-emp-code">{row.employeeCode || "—"}</code>
                    </td>
                    <td>
                      <span className="um-at-username">@{row.username}</span>
                    </td>
                    <td>
                      <select
                        className="um-select-role"
                        data-role={getRoleKey(row.role)}
                        value={row.role}
                        disabled={isOtherAdmin || isSelf}
                        onChange={async (e) => {
                          const result = await onUpdateUserRole?.(row.username, e.target.value);
                          if (result?.success === false) setMessage(result.message ?? "ไม่สามารถอัปเดตตำแหน่งได้");
                        }}
                      >
                        {nonAdminRoles.map((r) => (
                          <option key={r.code} value={r.code}>
                            {r.name}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td>
                      <select
                        className="um-select-status"
                        data-status={row.status}
                        value={row.status}
                        disabled={isOtherAdmin || isSelf}
                        onChange={async (e) => {
                          const result = await onUpdateUserStatus?.(row.username, e.target.value);
                          if (result?.success === false) setMessage(result.message ?? "ไม่สามารถอัปเดตสถานะได้");
                        }}
                      >
                        {statusOptions.map((s) => (
                          <option key={s} value={s}>
                            {s}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td>
                      <div className="um-actions">
                        <button
                          type="button"
                          className="um-action-btn um-action-reset"
                          disabled={isOtherAdmin || isSelf}
                          onClick={async () => {
                            const result = await onResetUserPassword?.(row.username);
                            setMessage(result?.message ?? `รีเซ็ตรหัสผ่านของ ${row.username} แล้ว`);
                          }}
                        >
                          🔑 Reset
                        </button>
                        <button
                          type="button"
                          className="um-action-btn um-action-edit"
                          disabled={isOtherAdmin}
                          onClick={() => handleOpenEditUserModal(row)}
                        >
                          ✏ แก้ไข
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan={6}>
                  <div className="um-empty">ไม่พบผู้ใช้ตามเงื่อนไขที่เลือก</div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <nav className="pagination-bar" aria-label="User pagination">
          <button type="button" disabled={currentPage <= 1} onClick={() => setCurrentPage(currentPage - 1)}>
            ← ก่อนหน้า
          </button>
          {getPageNumbers(currentPage, totalPages).map((p, i) =>
            p === "…" ? (
              <span key={`ellipsis-${i}`} className="pagination-ellipsis">…</span>
            ) : (
              <button
                key={p}
                type="button"
                className={p === currentPage ? "active" : ""}
                onClick={() => setCurrentPage(p)}
              >
                {p}
              </button>
            )
          )}
          <button type="button" disabled={currentPage >= totalPages} onClick={() => setCurrentPage(currentPage + 1)}>
            ถัดไป →
          </button>
        </nav>
      )}

      {/* Create User Modal */}
      {showCreateUserModal && (
        <div className="modal-backdrop" onClick={closeCreateUserModal}>
          <article
            className="um-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="create-user-modal-title"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="um-modal-header">
              <h3 id="create-user-modal-title">เพิ่มผู้ใช้ใหม่</h3>
              <button type="button" className="um-modal-close" aria-label="ปิด" onClick={closeCreateUserModal}>
                ✕
              </button>
            </div>
            <div className="um-modal-body">
              <div className="um-form-grid">
                <div className="um-field">
                  <label htmlFor="new-user-name">ชื่อที่แสดง</label>
                  <input
                    id="new-user-name"
                    type="text"
                    value={newUserName}
                    onChange={(e) => setNewUserName(e.target.value)}
                    placeholder="ชื่อ นามสกุล"
                  />
                </div>
                <div className="um-field">
                  <label htmlFor="new-username">Username</label>
                  <input
                    id="new-username"
                    type="text"
                    value={newUsername}
                    onChange={(e) => setNewUsername(e.target.value)}
                    placeholder="สำหรับ login"
                  />
                </div>
                <div className="um-field">
                  <label htmlFor="new-user-employee-code">รหัสพนักงาน</label>
                  <input
                    id="new-user-employee-code"
                    type="text"
                    value={newEmployeeCode}
                    onChange={(e) => setNewEmployeeCode(e.target.value.toUpperCase())}
                    placeholder="2026-XX-XXXX"
                    maxLength={13}
                  />
                </div>
                <div className="um-field">
                  <label htmlFor="new-user-role">ตำแหน่ง</label>
                  <select id="new-user-role" value={newRole} onChange={(e) => setNewRole(e.target.value)}>
                    {nonAdminRoles.map((r) => (
                      <option key={r.code} value={r.code}>
                        {r.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="um-field">
                  <label htmlFor="new-user-status">สถานะ</label>
                  <select id="new-user-status" value={newStatus} onChange={(e) => setNewStatus(e.target.value)}>
                    {statusOptions.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="um-field um-field-full">
                  <label htmlFor="new-user-password">Password</label>
                  <input
                    id="new-user-password"
                    type="text"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder={`ว่างไว้เพื่อใช้ default: ${defaultPassword}`}
                  />
                </div>
              </div>
            </div>
            <div className="um-modal-footer">
              <button type="button" className="um-btn-secondary" onClick={closeCreateUserModal}>
                ยกเลิก
              </button>
              <button type="button" className="um-btn-primary" onClick={handleCreateUser}>
                + เพิ่มผู้ใช้
              </button>
            </div>
          </article>
        </div>
      )}

      {/* Edit User Modal */}
      {showEditUserModal && (
        <div className="modal-backdrop" onClick={closeEditUserModal}>
          <article
            className="um-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="edit-user-modal-title"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="um-modal-header">
              <h3 id="edit-user-modal-title">{isSelfEdit ? "แก้ไขชื่อของคุณ" : "แก้ไขข้อมูลผู้ใช้"}</h3>
              <button type="button" className="um-modal-close" aria-label="ปิด" onClick={closeEditUserModal}>
                ✕
              </button>
            </div>
            <div className="um-modal-body">
              {isSelfEdit && (
                <p className="um-modal-note">Admin สามารถแก้ไขได้เฉพาะชื่อที่แสดงของตัวเองเท่านั้น</p>
              )}
              <div className="um-form-grid">
                <div className={`um-field ${isSelfEdit ? "um-field-full" : ""}`}>
                  <label htmlFor="edit-user-name">ชื่อที่แสดง</label>
                  <input
                    id="edit-user-name"
                    type="text"
                    value={editingName}
                    onChange={(e) => setEditingName(e.target.value)}
                    placeholder="ชื่อ นามสกุล"
                    autoFocus
                  />
                </div>
                {!isSelfEdit && (
                  <>
                    <div className="um-field">
                      <label htmlFor="edit-user-employee-code">รหัสพนักงาน</label>
                      <input
                        id="edit-user-employee-code"
                        type="text"
                        value={editingEmployeeCode}
                        onChange={(e) => setEditingEmployeeCode(e.target.value.toUpperCase())}
                        placeholder="2026-XX-XXXX"
                        maxLength={13}
                      />
                    </div>
                    <div className="um-field">
                      <label htmlFor="edit-username-readonly">Username (แก้ไขไม่ได้)</label>
                      <input id="edit-username-readonly" type="text" value={editingUsername} readOnly className="um-input-readonly" />
                    </div>
                  </>
                )}
              </div>
            </div>
            <div className="um-modal-footer">
              <button type="button" className="um-btn-secondary" onClick={closeEditUserModal}>
                ยกเลิก
              </button>
              <button type="button" className="um-btn-primary" onClick={handleSaveEditedUser}>
                บันทึกข้อมูล
              </button>
            </div>
          </article>
        </div>
      )}

      {message && (
        <div className="um-toast" onClick={() => setMessage("")}>
          <span>{message}</span>
          <span className="um-toast-close">✕</span>
        </div>
      )}
    </section>
  );
}
