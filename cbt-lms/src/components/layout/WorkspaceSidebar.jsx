const tabs = [
  { key: "home",            label: "หน้าหลัก" },
  { key: "content",         label: "เนื้อหา" },
  { key: "exam",            label: "ข้อสอบ" },
  { key: "profile",         label: "โปรไฟล์" },
  { key: "leaderboard",     label: "ลีดเดอร์บอร์ด" },
  { key: "user-management", label: "จัดการ User" },
  { key: "exam-history",    label: "ประวัติการสอบ" },
  { key: "role-permission", label: "สิทธิ์การใช้งาน" },
  { key: "summary",         label: "สรุปผล" },
];

const RESTRICTED_TABS = new Set(["user-management", "exam-history", "role-permission", "summary"]);

const tabGroups = [
  ["home", "content", "exam"],
  ["profile", "leaderboard"],
  ["user-management", "exam-history", "role-permission"],
  ["summary"],
];

export default function WorkspaceSidebar({
  activeTab,
  onSelectTab,
  onAuthAction,
  isAuthenticated,
  canViewRestrictedTabs = false,
  visibleTabKeys = null,
}) {
  const allowedTabSet = Array.isArray(visibleTabKeys) ? new Set(visibleTabKeys) : null;
  const visibleTabs = tabs.filter((tab) => {
    if (allowedTabSet) {
      return allowedTabSet.has(tab.key);
    }
    if (!canViewRestrictedTabs && RESTRICTED_TABS.has(tab.key)) return false;
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
