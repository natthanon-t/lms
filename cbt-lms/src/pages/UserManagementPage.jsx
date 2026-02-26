import { useEffect, useState } from "react";

const roleOptions = ["ผู้ใช้งาน", "ผู้สอน", "ผู้ดูแลระบบ", "user", "admin"];
const statusOptions = ["active", "inactive"];

export default function UserManagementPage({
  users,
  onUpdateUserRole,
  onUpdateUserStatus,
  defaultPassword,
  onUpdateDefaultPassword,
  onResetUserPassword,
  onCreateUser,
}) {
  const [searchTerm, setSearchTerm] = useState("");
  const [defaultPasswordInput, setDefaultPasswordInput] = useState(defaultPassword ?? "");
  const [newUserName, setNewUserName] = useState("");
  const [newUsername, setNewUsername] = useState("");
  const [newRole, setNewRole] = useState(roleOptions[0]);
  const [newStatus, setNewStatus] = useState(statusOptions[0]);
  const [newPassword, setNewPassword] = useState(defaultPassword ?? "");
  const [message, setMessage] = useState("");

  useEffect(() => {
    setDefaultPasswordInput(defaultPassword ?? "");
    if (!String(newPassword ?? "").trim()) {
      setNewPassword(defaultPassword ?? "");
    }
  }, [defaultPassword, newPassword]);

  const keyword = searchTerm.trim().toLowerCase();
  const rows = Object.entries(users)
    .map(([username, profile]) => ({
      username,
      name: profile.name,
      role: profile.role,
      status: profile.status ?? "active",
    }))
    .filter((row) => {
      if (!keyword) {
        return true;
      }
      return row.username.toLowerCase().includes(keyword) || row.name.toLowerCase().includes(keyword);
    });

  const handleSaveDefaultPassword = () => {
    const success = onUpdateDefaultPassword?.(defaultPasswordInput);
    setMessage(success ? "บันทึก default password เรียบร้อย" : "ไม่สามารถบันทึก default password ได้");
  };

  const handleCreateUser = () => {
    const result = onCreateUser?.({
      name: newUserName,
      username: newUsername,
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
    setNewRole(roleOptions[0]);
    setNewStatus(statusOptions[0]);
    setNewPassword(defaultPassword ?? "");
  };

  return (
    <section className="workspace-content">
      <header className="content-header">
        <h1>จัดการ user</h1>
        <p>ค้นหา user และเปลี่ยนตำแหน่ง/สถานะผู้ใช้งานในระบบ</p>
      </header>

      <div className="search-box">
        <label htmlFor="user-search">ค้นหา user</label>
        <input
          id="user-search"
          type="text"
          placeholder="พิมพ์ชื่อหรือ username"
          value={searchTerm}
          onChange={(event) => setSearchTerm(event.target.value)}
        />
      </div>

      <div className="info-card">
        <h3>เพิ่มผู้ใช้ใหม่</h3>
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
        <button type="button" className="enter-button" onClick={handleCreateUser}>
          + เพิ่ม user
        </button>
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
        <table>
          <thead>
            <tr>
              <th>ชื่อ</th>
              <th>Username</th>
              <th>ตำแหน่ง</th>
              <th>Status</th>
              <th>Password</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.username}>
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
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {message ? <p className="profile-message">{message}</p> : null}
    </section>
  );
}
