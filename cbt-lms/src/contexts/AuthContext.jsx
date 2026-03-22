import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import {
  fetchMyPermissions,
  loginAuth,
  logoutAuth,
  meAuth,
  refreshAuth,
  registerAuth,
} from "../services/authService";
import { fetchAvatarApi } from "../services/mediaApiService";
import { avatarStorageKey } from "../utils/avatar";
import {
  fetchDefaultResetPasswordAdmin,
  fetchRoleOptionsAdmin,
  listUsersAdmin,
  updateDefaultResetPasswordAdmin,
} from "../services/userApiService";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const toUserMap = useCallback((userList) => {
    const rows = Array.isArray(userList) ? userList : [];
    return rows.reduce((acc, user) => {
      const username = String(user?.username ?? "").trim().toLowerCase();
      if (!username) return acc;
      acc[username] = {
        name: user?.name ?? username,
        employeeCode: user?.employee_code ?? "",
        role: user?.role ?? "user",
        status: user?.status ?? "active",
      };
      return acc;
    }, {});
  }, []);

  const [currentUserKey, setCurrentUserKey] = useState("");
  const [showLogin, setShowLogin] = useState(false);
  const [authBootstrapped, setAuthBootstrapped] = useState(false);
  const [currentPermissions, setCurrentPermissions] = useState([]);
  const [sidebarItems, setSidebarItems] = useState([]);
  const [users, setUsers] = useState({});
  const [adminRoles, setAdminRoles] = useState([]);
  const [defaultUserPassword, setDefaultUserPassword] = useState("");

  const currentUser = currentUserKey ? users[currentUserKey] ?? null : null;

  const permissionSet = useMemo(() => new Set(currentPermissions), [currentPermissions]);
  const canLearnContent = permissionSet.has("content.learn");
  const canManageContent = permissionSet.has("content.manage");
  const canViewAllContent = permissionSet.has("content.view_all");
  const canTakeExam = permissionSet.has("exam.take");
  const canManageExams = permissionSet.has("exam.manage");
  const canViewAllExams = permissionSet.has("exam.view_all");
  const canManageUsers = permissionSet.has("management.users.manage");
  const canManageRoles = permissionSet.has("management.roles.manage");
  const canViewAllExamHistory = permissionSet.has("management.exam_history.view");
  const canViewOwnExamHistory = permissionSet.has("system.exam_history.view");
  const canViewExamHistory = canViewAllExamHistory || canViewOwnExamHistory;
  const canViewSummary = permissionSet.has("system.report.view");

  const visibleSidebarTabs = useMemo(() => {
    if (!currentUser) return null;
    const allowedTabKeys = new Set(["home", "profile", "leaderboard"]);
    sidebarItems.forEach((item) => {
      const key = String(item?.key ?? "").trim();
      if (key === "content.learn" || key === "content.manage") allowedTabKeys.add("content");
      if (key === "exam.take" || key === "exam.manage") allowedTabKeys.add("exam");
      if (key === "system.report") allowedTabKeys.add("summary");
      if (key === "system.exam_history" || key === "management.exam_history") allowedTabKeys.add("exam-history");
      if (key === "management.users") allowedTabKeys.add("user-management");
      if (key === "management.roles") allowedTabKeys.add("role-permission");
    });
    return Array.from(allowedTabKeys);
  }, [currentUser, sidebarItems]);

  // Bootstrap auth on mount
  useEffect(() => {
    let mounted = true;
    const bootstrapAuth = async () => {
      try {
        const payload = await refreshAuth();
        const profile = payload?.user ?? (await meAuth());
        const username = String(profile?.username ?? "").trim().toLowerCase();
        if (!mounted || !username) return;
        setUsers((prev) => ({
          ...prev,
          [username]: {
            ...(prev[username] ?? {}),
            name: profile?.name ?? profile?.username ?? username,
            employeeCode: profile?.employee_code ?? prev[username]?.employeeCode ?? "",
            role: profile?.role ?? prev[username]?.role ?? "ผู้ใช้งาน",
            status: profile?.status ?? prev[username]?.status ?? "active",
          },
        }));
        setCurrentUserKey(username);
        void fetchAvatarApi()
          .then((dataUrl) => {
            if (dataUrl)
              try { localStorage.setItem(avatarStorageKey(username), dataUrl); } catch { /* ignore */ }
          })
          .catch(() => {});
      } catch {
        // Auth cookies are cleared by the server; nothing to do client-side
      } finally {
        if (mounted) setAuthBootstrapped(true);
      }
    };
    void bootstrapAuth();
    return () => { mounted = false; };
  }, []);

  // Fetch permissions when user changes
  useEffect(() => {
    if (!currentUserKey) {
      setCurrentPermissions([]);
      setSidebarItems([]);
      return;
    }
    let mounted = true;
    void fetchMyPermissions()
      .then((payload) => {
        if (!mounted) return;
        setCurrentPermissions(Array.isArray(payload?.permissions) ? payload.permissions : []);
        setSidebarItems(Array.isArray(payload?.sidebar) ? payload.sidebar : []);
      })
      .catch(() => {
        if (!mounted) return;
        setCurrentPermissions([]);
        setSidebarItems([]);
      });
    return () => { mounted = false; };
  }, [currentUserKey]);

  // Load admin data when user has manage access
  useEffect(() => {
    if (!currentUserKey || !canManageUsers) {
      setDefaultUserPassword("");
      return;
    }
    void (async () => {
      try {
        const [apiUsers, defaultPassword, roleResult] = await Promise.all([
          listUsersAdmin(),
          fetchDefaultResetPasswordAdmin(),
          fetchRoleOptionsAdmin(),
        ]);
        setUsers((prev) => ({ ...prev, ...toUserMap(apiUsers) }));
        setDefaultUserPassword(defaultPassword);
        setAdminRoles(Array.isArray(roleResult?.roles) ? roleResult.roles : []);
      } catch {
        // noop
      }
    })();
  }, [currentUserKey, canManageUsers, toUserMap]);

  // Load role data when user has roles.manage but not users.manage
  useEffect(() => {
    if (!currentUserKey || canManageUsers || !canManageRoles) return;
    void fetchRoleOptionsAdmin()
      .then((roleResult) => {
        setAdminRoles(Array.isArray(roleResult?.roles) ? roleResult.roles : []);
      })
      .catch(() => {});
  }, [currentUserKey, canManageUsers, canManageRoles]);

  const handleLoginFromBackend = async ({ username, password }) => {
    try {
      const payload = await loginAuth({ username, password });
      const profile = payload?.user ?? {};
      const normalizedUsername = String(profile?.username ?? username ?? "").trim().toLowerCase();
      if (!normalizedUsername) return { success: false, message: "ไม่พบข้อมูลผู้ใช้" };
      setUsers((prev) => ({
        ...prev,
        [normalizedUsername]: {
          ...(prev[normalizedUsername] ?? {}),
          name: profile?.name ?? normalizedUsername,
          employeeCode: profile?.employee_code ?? prev[normalizedUsername]?.employeeCode ?? "",
          role: profile?.role ?? "ผู้ใช้งาน",
          status: profile?.status ?? "active",
        },
      }));
      setCurrentPermissions(Array.isArray(profile?.permissions) ? profile.permissions : []);
      setCurrentUserKey(normalizedUsername);
      setShowLogin(false);
      void fetchAvatarApi()
        .then((dataUrl) => {
          if (dataUrl)
            try { localStorage.setItem(avatarStorageKey(normalizedUsername), dataUrl); } catch { /* ignore */ }
        })
        .catch(() => {});
      return { success: true };
    } catch (error) {
      return { success: false, message: error?.message ?? "เข้าสู่ระบบไม่สำเร็จ" };
    }
  };

  const handleRegisterFromBackend = async ({ name, username, employeeCode, password }) => {
    try {
      await registerAuth({ name, username, employeeCode, password });
      return { success: true };
    } catch (error) {
      return { success: false, message: error?.message ?? "สมัครสมาชิกไม่สำเร็จ" };
    }
  };

  const handleLogout = async () => {
    await logoutAuth();
    setCurrentUserKey("");
    setCurrentPermissions([]);
    setSidebarItems([]);
    setShowLogin(false);
  };

  const handleAuthAction = () => {
    if (currentUser) {
      void handleLogout();
      return;
    }
    setShowLogin(true);
  };

  const patchUserState = useCallback((username, fields) => {
    setUsers((prev) => ({
      ...prev,
      [username]: { ...(prev[username] ?? {}), ...fields },
    }));
  }, []);

  const refreshUsersForAdmin = useCallback(async () => {
    if (!canManageUsers) return;
    try {
      const apiUsers = await listUsersAdmin();
      setUsers((prev) => ({ ...prev, ...toUserMap(apiUsers) }));
    } catch {
      // noop
    }
  }, [canManageUsers, toUserMap]);

  const handleUpdateDefaultPassword = async (nextPassword) => {
    const trimmed = String(nextPassword ?? "").trim();
    if (!trimmed) return { success: false, message: "กรุณากรอก default password" };
    try {
      const payload = await updateDefaultResetPasswordAdmin(trimmed);
      setDefaultUserPassword(String(payload?.default_password ?? trimmed));
      return { success: true, message: "บันทึก default password เรียบร้อย" };
    } catch (error) {
      return { success: false, message: error?.message ?? "ไม่สามารถบันทึก default password ได้" };
    }
  };

  const value = {
    currentUserKey,
    currentUser,
    currentPermissions,
    showLogin,
    setShowLogin,
    authBootstrapped,
    users,
    setUsers,
    adminRoles,
    defaultUserPassword,
    setDefaultUserPassword,
    permissionSet,
    canLearnContent,
    canManageContent,
    canViewAllContent,
    canTakeExam,
    canManageExams,
    canViewAllExams,
    canManageUsers,
    canManageRoles,
    canViewAllExamHistory,
    canViewOwnExamHistory,
    canViewExamHistory,
    canViewSummary,
    visibleSidebarTabs,
    handleLoginFromBackend,
    handleRegisterFromBackend,
    handleLogout,
    handleAuthAction,
    patchUserState,
    refreshUsersForAdmin,
    handleUpdateDefaultPassword,
    toUserMap,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
