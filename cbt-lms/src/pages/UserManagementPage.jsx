import { useState } from "react";

const roleOptions = ["Chick", "Beyonder", "Admin"];
const statusOptions = ["active", "inactive"];

export default function UserManagementPage({ users, onUpdateUserRole, onUpdateUserStatus }) {
  const [searchTerm, setSearchTerm] = useState("");

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

      <div className="leaderboard-card">
        <table>
          <thead>
            <tr>
              <th>ชื่อ</th>
              <th>Username</th>
              <th>ตำแหน่ง</th>
              <th>Status</th>
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
                    onChange={(event) => onUpdateUserRole(row.username, event.target.value)}
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
                    onChange={(event) => onUpdateUserStatus(row.username, event.target.value)}
                  >
                    {statusOptions.map((status) => (
                      <option key={status} value={status}>
                        {status}
                      </option>
                    ))}
                  </select>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
