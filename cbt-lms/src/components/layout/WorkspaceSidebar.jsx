const tabs = [
  { key: "home", label: "หน้าหลัก" },
  { key: "content", label: "เนื้อหา" },
  { key: "exam", label: "ข้อสอบ" },
  { key: "profile", label: "โปรไฟล์" },
  { key: "user-management", label: "จัดการ user" },
  { key: "leaderboard", label: "ลีดเดอร์บอร์ด" },
  { key: "summary", label: "สรุปผล" },
];

const tabGroups = [
  ["home", "content", "exam"],
  ["profile", "user-management", "summary"],
  ["leaderboard"],
];

export default function WorkspaceSidebar({
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
  const visibleTabsByKey = new Map(visibleTabs.map((tab) => [tab.key, tab]));

  return (
    <aside className="workspace-sidebar">
      <nav className="sidebar-nav" aria-label="main navigation">
        {tabGroups.map((group, groupIndex) => {
          const groupTabs = group.map((key) => visibleTabsByKey.get(key)).filter(Boolean);
          if (!groupTabs.length) {
            return null;
          }

          return (
            <div className="sidebar-nav-group" key={`group-${groupIndex}`}>
              {groupTabs.map((tab) => (
                <button
                  key={tab.key}
                  type="button"
                  className={activeTab === tab.key ? "active" : ""}
                  onClick={() => onSelectTab(tab.key)}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          );
        })}
      </nav>

      <button type="button" className="logout-button" onClick={onAuthAction}>
        {isAuthenticated ? "Logout" : "Login"}
      </button>
    </aside>
  );
}
