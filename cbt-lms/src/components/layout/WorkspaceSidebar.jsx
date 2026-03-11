import { NavLink, useLocation } from "react-router-dom";

const tabs = [
  { key: "home",            label: "หน้าหลัก",        path: "/" },
  { key: "content",         label: "เนื้อหา",          path: "/content" },
  { key: "exam",            label: "ข้อสอบ",           path: "/exam" },
  { key: "profile",         label: "โปรไฟล์",         path: "/profile" },
  { key: "leaderboard",     label: "ลีดเดอร์บอร์ด",   path: "/leaderboard" },
  { key: "user-management", label: "จัดการ User",      path: "/user-management" },
  { key: "exam-history",    label: "ประวัติการสอบ",    path: "/exam-history" },
  { key: "role-permission", label: "สิทธิ์การใช้งาน", path: "/role-permission" },
  { key: "summary",         label: "สรุปผล",           path: "/summary" },
];

const RESTRICTED_TABS = new Set(["user-management", "exam-history", "role-permission", "summary"]);

const tabGroups = [
  ["home", "content", "exam"],
  ["profile", "leaderboard"],
  ["user-management", "exam-history", "role-permission"],
  ["summary"],
];

export default function WorkspaceSidebar({
  onAuthAction,
  isAuthenticated,
  canViewRestrictedTabs = false,
  visibleTabKeys = null,
}) {
  const location = useLocation();
  const allowedTabSet = Array.isArray(visibleTabKeys) ? new Set(visibleTabKeys) : null;

  const visibleTabs = tabs.filter((tab) => {
    if (allowedTabSet) return allowedTabSet.has(tab.key);
    if (!canViewRestrictedTabs && RESTRICTED_TABS.has(tab.key)) return false;
    return true;
  });
  const visibleTabsByKey = new Map(visibleTabs.map((tab) => [tab.key, tab]));

  const isTabActive = (tab) => {
    if (tab.key === "home") {
      // home is active only on exact "/"
      return location.pathname === "/";
    }
    return location.pathname.startsWith(tab.path);
  };

  return (
    <aside className="workspace-sidebar">
      <nav className="sidebar-nav" aria-label="main navigation">
        {tabGroups.map((group, groupIndex) => {
          const groupTabs = group.map((key) => visibleTabsByKey.get(key)).filter(Boolean);
          if (!groupTabs.length) return null;

          return (
            <div className="sidebar-nav-group" key={`group-${groupIndex}`}>
              {groupTabs.map((tab) => (
                <NavLink
                  key={tab.key}
                  to={tab.path}
                  end={tab.key === "home"}
                  className={() => {
                    // Use our own active detection for nested routes (content/exam)
                    const active = isTabActive(tab);
                    return active ? "active" : "";
                  }}
                >
                  {tab.label}
                </NavLink>
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
