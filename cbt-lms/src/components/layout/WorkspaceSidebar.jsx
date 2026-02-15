const tabs = [
  { key: "home", label: "หน้าหลัก" },
  { key: "content", label: "เนื้อหา" },
  { key: "exam", label: "ข้อสอบ" },
  { key: "profile", label: "โปรไฟล์" },
  { key: "user-management", label: "จัดการ user" },
  { key: "leaderboard", label: "ลีดเดอร์บอร์ด" },
  { key: "summary", label: "สรุปผล" },
];

export default function WorkspaceSidebar({ currentUser, activeTab, onSelectTab, onLogout }) {
  return (
    <aside className="workspace-sidebar">
      <div>
        <h2>LMS Panel</h2>
        <p className="user-label">ผู้ใช้: {currentUser.name}</p>
        <p className="user-role">ตำแหน่ง: {currentUser.role}</p>
      </div>

      <nav className="sidebar-nav" aria-label="main navigation">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            type="button"
            className={activeTab === tab.key ? "active" : ""}
            onClick={() => onSelectTab(tab.key)}
          >
            {tab.label}
          </button>
        ))}
      </nav>

      <button type="button" className="logout-button" onClick={onLogout}>
        Logout
      </button>
    </aside>
  );
}
