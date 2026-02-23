const tabs = [
  { key: "home", label: "หน้าหลัก" },
  { key: "content", label: "เนื้อหา" },
  { key: "exam", label: "ข้อสอบ" },
  { key: "profile", label: "โปรไฟล์" },
  { key: "user-management", label: "จัดการ user" },
  { key: "leaderboard", label: "ลีดเดอร์บอร์ด" },
  { key: "summary", label: "สรุปผล" },
];

export default function WorkspaceSidebar({
  currentUser,
  activeTab,
  onSelectTab,
  onAuthAction,
  isAuthenticated,
  isAdmin = false,
}) {
  const visibleTabs = tabs.filter((tab) => {
    if (!isAdmin && (tab.key === "user-management" || tab.key === "summary")) {
      return false;
    }
    return true;
  });

  return (
    <aside className="workspace-sidebar">
      <div>
        <h2>LMS Panel</h2>
        <p className="user-label">ผู้ใช้: {currentUser?.name ?? "Guest"}</p>
        <p className="user-role">ตำแหน่ง: {currentUser?.role ?? "ผู้เยี่ยมชม"}</p>
      </div>

      <nav className="sidebar-nav" aria-label="main navigation">
        {visibleTabs.map((tab) => (
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

      <button type="button" className="logout-button" onClick={onAuthAction}>
        {isAuthenticated ? "Logout" : "Login"}
      </button>
    </aside>
  );
}
