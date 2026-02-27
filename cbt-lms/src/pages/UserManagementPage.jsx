import { useEffect, useMemo, useState } from "react";

const roleOptions = ["ผู้ใช้งาน", "ผู้สอน", "ผู้ดูแลระบบ", "user", "admin"];
const statusOptions = ["active", "inactive"];
const employeeCodePattern = /^2026-[A-Z0-9]{2}-\d{4}$/;

export default function UserManagementPage({
  users,
  onUpdateUserRole,
  onUpdateUserStatus,
  onUpdateUserProfile,
  defaultPassword,
  onUpdateDefaultPassword,
  onResetUserPassword,
  onCreateUser,
}) {
  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [defaultPasswordInput, setDefaultPasswordInput] = useState(defaultPassword ?? "");
  const [newUserName, setNewUserName] = useState("");
  const [newUsername, setNewUsername] = useState("");
  const [newEmployeeCode, setNewEmployeeCode] = useState("");
  const [newRole, setNewRole] = useState(roleOptions[0]);
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
        role: profile?.role ?? "ผู้ใช้งาน",
        status: profile?.status ?? "active",
      })),
    [users],
  );

  const userSummary = useMemo(() => {
    const totals = allRows.reduce(
      (acc, row) => {
        const normalizedRole = String(row.role ?? "").trim().toLowerCase();
        const normalizedStatus = String(row.status ?? "active").trim().toLowerCase();

        acc.total += 1;
        if (normalizedStatus === "active") acc.active += 1;
        if (normalizedStatus === "inactive") acc.inactive += 1;
        if (normalizedRole === "admin" || normalizedRole === "ผู้ดูแลระบบ") acc.admin += 1;
        if (normalizedRole === "ผู้สอน") acc.instructor += 1;
        return acc;
      },
      { total: 0, active: 0, inactive: 0, admin: 0, instructor: 0 },
    );

    return {
      ...totals,
      learner: Math.max(0, totals.total - totals.admin - totals.instructor),
    };
  }, [allRows]);

  const keyword = searchTerm.trim().toLowerCase();
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
          const statusWeight = (status) => (String(status).toLowerCase() === "active" ? 0 : 1);
          const statusDiff = statusWeight(a.status) - statusWeight(b.status);
          if (statusDiff !== 0) return statusDiff;
          return a.name.localeCompare(b.name, "th");
        }),
    [allRows, keyword, roleFilter, statusFilter],
  );

  const handleSaveDefaultPassword = () => {
    const success = onUpdateDefaultPassword?.(defaultPasswordInput);
    setMessage(success ? "บันทึก default password เรียบร้อย" : "ไม่สามารถบันทึก default password ได้");
  };

  const handleCreateUser = async () => {
    const normalizedEmployeeCode = String(newEmployeeCode ?? "").trim().toUpperCase();
    if (!employeeCodePattern.test(normalizedEmployeeCode)) {
      setMessage("รหัสพนักงานต้องเป็นรูปแบบ 2026-XX-XXXX");
      return;
    }

    const result = await onCreateUser?.({
      name: newUserName,
      username: newUsername,
      employeeCode: normalizedEmployeeCode,
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
    setNewRole(roleOptions[0]);
    setNewStatus(statusOptions[0]);
    setNewPassword(defaultPassword ?? "");
    setShowCreateUserModal(false);
  };

  const closeCreateUserModal = () => {
    setShowCreateUserModal(false);
  };

  useEffect(() => {
    if (!showCreateUserModal) {
      return undefined;
    }

    const handleEscape = (event) => {
      if (event.key === "Escape") {
        closeCreateUserModal();
      }
    };

    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [showCreateUserModal]);

  const closeEditUserModal = () => {
    setShowEditUserModal(false);
  };

  useEffect(() => {
    if (!showEditUserModal) {
      return undefined;
    }

    const handleEscape = (event) => {
      if (event.key === "Escape") {
        closeEditUserModal();
      }
    };

    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [showEditUserModal]);

  const handleOpenEditUserModal = (row) => {
    setEditingUsername(row.username);
    setEditingName(row.name ?? "");
    setEditingEmployeeCode(row.employeeCode ?? "");
    setShowEditUserModal(true);
  };

  const handleSaveEditedUser = async () => {
    const normalizedName = String(editingName ?? "").trim();
    const normalizedEmployeeCode = String(editingEmployeeCode ?? "").trim().toUpperCase();
    if (!normalizedName) {
      setMessage("กรุณากรอกชื่อผู้ใช้");
      return;
    }
    if (!employeeCodePattern.test(normalizedEmployeeCode)) {
      setMessage("รหัสพนักงานต้องเป็นรูปแบบ 2026-XX-XXXX");
      return;
    }

    const result = await onUpdateUserProfile?.(editingUsername, {
      name: normalizedName,
      employee_code: normalizedEmployeeCode,
    });
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
          <h1>จัดการ user</h1>
          <p>ค้นหา user และเปลี่ยนตำแหน่ง/สถานะผู้ใช้งานในระบบ</p>
        </div>
        <button type="button" className="enter-button user-create-open-button" onClick={() => setShowCreateUserModal(true)}>
          + เพิ่มผู้ใช้งาน
        </button>
      </header>

      <div className="metric-grid user-management-metrics">
        <article className="metric-card">
          <h3>ผู้ใช้ทั้งหมด</h3>
          <p>{userSummary.total}</p>
        </article>
        <article className="metric-card">
          <h3>Active</h3>
          <p>{userSummary.active}</p>
        </article>
        <article className="metric-card">
          <h3>Inactive</h3>
          <p>{userSummary.inactive}</p>
        </article>
        <article className="metric-card">
          <h3>Admin / Instructor</h3>
          <p>
            {userSummary.admin} / {userSummary.instructor}
          </p>
        </article>
      </div>

      <div className="info-card">
        <div className="user-management-toolbar">
          <div className="editor-title-box">
            <label htmlFor="user-search">ค้นหา user</label>
            <input
              id="user-search"
              type="text"
              placeholder="พิมพ์ชื่อ, username, employee code หรือ role"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
            />
          </div>
          <div className="editor-title-box">
            <label htmlFor="user-role-filter">Filter ตำแหน่ง</label>
            <select
              id="user-role-filter"
              className="role-select"
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
            >
              <option value="all">ทุกตำแหน่ง</option>
              {roleOptions.map((role) => (
                <option key={`role-filter-${role}`} value={role}>
                  {role}
                </option>
              ))}
            </select>
          </div>
          <div className="editor-title-box">
            <label htmlFor="user-status-filter">Filter สถานะ</label>
            <select
              id="user-status-filter"
              className="role-select"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="all">ทุกสถานะ</option>
              {statusOptions.map((status) => (
                <option key={`status-filter-${status}`} value={status}>
                  {status}
                </option>
              ))}
            </select>
          </div>
          <button
            type="button"
            className="manage-button"
            onClick={() => {
              setSearchTerm("");
              setRoleFilter("all");
              setStatusFilter("all");
            }}
          >
            ล้างเงื่อนไข
          </button>
        </div>
        <p className="summary-note">พบผู้ใช้ {rows.length} จาก {allRows.length} รายการ</p>
      </div>

      <div className="info-card">
        <h3>ตั้งค่า Default Password</h3>
        <div className="default-password-row">
          <input
            type="text"
            value={defaultPasswordInput}
            onChange={(event) => setDefaultPasswordInput(event.target.value)}
            placeholder="กำหนด default password สำหรับ reset"
          />
          <button type="button" className="enter-button" onClick={handleSaveDefaultPassword}>
            บันทึก
          </button>
        </div>
        <p className="summary-note">ค่าใช้งานปัจจุบัน: {defaultPassword}</p>
      </div>

      <div className="leaderboard-card">
        <table className="user-management-table">
          <thead>
            <tr>
              <th>รหัสพนักงาน</th>
              <th>ชื่อ</th>
              <th>Username</th>
              <th>ตำแหน่ง</th>
              <th>Status</th>
              <th>Password</th>
            </tr>
          </thead>
          <tbody>
            {rows.length ? (
              rows.map((row) => (
                <tr key={row.username}>
                  <td>{row.employeeCode || "-"}</td>
                  <td>{row.name}</td>
                  <td>{row.username}</td>
                  <td>
                    <select
                      className="role-select"
                      value={row.role}
                      onChange={async (event) => {
                        const result = await onUpdateUserRole?.(row.username, event.target.value);
                        if (result?.success === false) {
                          setMessage(result.message ?? "ไม่สามารถอัปเดตตำแหน่งได้");
                        }
                      }}
                    >
                      {roleOptions.map((role) => (
                        <option key={role} value={role}>
                          {role}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td>
                    <select
                      className="role-select"
                      value={row.status}
                      onChange={async (event) => {
                        const result = await onUpdateUserStatus?.(row.username, event.target.value);
                        if (result?.success === false) {
                          setMessage(result.message ?? "ไม่สามารถอัปเดตสถานะได้");
                        }
                      }}
                    >
                      {statusOptions.map((status) => (
                        <option key={status} value={status}>
                          {status}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td>
                    <div className="user-row-actions">
                      <button
                        type="button"
                        className="manage-button"
                        onClick={async () => {
                          const result = await onResetUserPassword?.(row.username);
                          setMessage(result?.message ?? `รีเซ็ตรหัสผ่านของ ${row.username} เป็นค่า default แล้ว`);
                        }}
                      >
                        Reset Password
                      </button>
                      <button
                        type="button"
                        className="manage-button"
                        onClick={() => handleOpenEditUserModal(row)}
                      >
                        แก้ไขข้อมูล
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={6}>
                  <p className="user-management-empty">ไม่พบผู้ใช้ตามเงื่อนไขที่เลือก</p>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {showCreateUserModal ? (
        <div className="modal-backdrop" onClick={closeCreateUserModal}>
          <article
            className="info-card user-create-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="create-user-modal-title"
            onClick={(event) => event.stopPropagation()}
          >
            <button
              type="button"
              className="modal-close-button"
              aria-label="ปิดกล่องเพิ่มผู้ใช้"
              onClick={closeCreateUserModal}
            >
              ×
            </button>
            <h3 id="create-user-modal-title">เพิ่มผู้ใช้ใหม่</h3>
            <div className="editor-course-meta">
              <div className="editor-title-box">
                <label htmlFor="new-user-name">ชื่อ</label>
                <input
                  id="new-user-name"
                  type="text"
                  value={newUserName}
                  onChange={(event) => setNewUserName(event.target.value)}
                  placeholder="ชื่อที่จะแสดง"
                />
              </div>
              <div className="editor-title-box">
                <label htmlFor="new-username">Username</label>
                <input
                  id="new-username"
                  type="text"
                  value={newUsername}
                  onChange={(event) => setNewUsername(event.target.value)}
                  placeholder="username สำหรับ login"
                />
              </div>
              <div className="editor-title-box">
                <label htmlFor="new-user-employee-code">รหัสพนักงาน</label>
                <input
                  id="new-user-employee-code"
                  type="text"
                  value={newEmployeeCode}
                  onChange={(event) => setNewEmployeeCode(event.target.value.toUpperCase())}
                  placeholder="2026-XX-XXXX"
                  maxLength={13}
                />
              </div>
              <div className="editor-title-box">
                <label htmlFor="new-user-role">ตำแหน่ง</label>
                <select
                  id="new-user-role"
                  className="role-select"
                  value={newRole}
                  onChange={(event) => setNewRole(event.target.value)}
                >
                  {roleOptions.map((role) => (
                    <option key={`new-role-${role}`} value={role}>
                      {role}
                    </option>
                  ))}
                </select>
              </div>
              <div className="editor-title-box">
                <label htmlFor="new-user-status">สถานะ</label>
                <select
                  id="new-user-status"
                  className="role-select"
                  value={newStatus}
                  onChange={(event) => setNewStatus(event.target.value)}
                >
                  {statusOptions.map((status) => (
                    <option key={`new-status-${status}`} value={status}>
                      {status}
                    </option>
                  ))}
                </select>
              </div>
              <div className="editor-title-box editor-meta-full">
                <label htmlFor="new-user-password">Password</label>
                <input
                  id="new-user-password"
                  type="text"
                  value={newPassword}
                  onChange={(event) => setNewPassword(event.target.value)}
                  placeholder={`ว่างไว้เพื่อใช้ default (${defaultPassword})`}
                />
              </div>
            </div>
            <div className="user-modal-actions">
              <button type="button" className="enter-button" onClick={handleCreateUser}>
                + เพิ่ม user
              </button>
            </div>
          </article>
        </div>
      ) : null}

      {showEditUserModal ? (
        <div className="modal-backdrop" onClick={closeEditUserModal}>
          <article
            className="info-card user-create-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="edit-user-modal-title"
            onClick={(event) => event.stopPropagation()}
          >
            <button
              type="button"
              className="modal-close-button"
              aria-label="ปิดกล่องแก้ไขข้อมูลผู้ใช้"
              onClick={closeEditUserModal}
            >
              ×
            </button>
            <h3 id="edit-user-modal-title">แก้ไขข้อมูลผู้ใช้</h3>
            <div className="editor-course-meta">
              <div className="editor-title-box">
                <label htmlFor="edit-user-name">ชื่อ</label>
                <input
                  id="edit-user-name"
                  type="text"
                  value={editingName}
                  onChange={(event) => setEditingName(event.target.value)}
                  placeholder="ชื่อที่จะแสดง"
                />
              </div>
              <div className="editor-title-box">
                <label htmlFor="edit-user-employee-code">รหัสพนักงาน</label>
                <input
                  id="edit-user-employee-code"
                  type="text"
                  value={editingEmployeeCode}
                  onChange={(event) => setEditingEmployeeCode(event.target.value.toUpperCase())}
                  placeholder="2026-XX-XXXX"
                  maxLength={13}
                />
              </div>
              <div className="editor-title-box">
                <label htmlFor="edit-username-readonly">Username</label>
                <input id="edit-username-readonly" type="text" value={editingUsername} readOnly />
              </div>
            </div>
            <div className="user-modal-actions">
              <button type="button" className="enter-button" onClick={handleSaveEditedUser}>
                บันทึกข้อมูล
              </button>
            </div>
          </article>
        </div>
      ) : null}

      {message ? <p className="profile-message">{message}</p> : null}
    </section>
  );
}
