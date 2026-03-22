import { useCallback } from "react";
import {
  changeProfilePassword,
  createUserAdmin,
  fetchDefaultResetPasswordAdmin,
  resetUserPasswordAdmin,
  updateProfile,
  updateProfileName,
  updateUserAdmin,
} from "../services/userApiService";

export function useUserActions({ currentUserKey, setUsers, patchUserState, defaultUserPassword, setDefaultUserPassword, refreshUsersForAdmin }) {
  const handleSaveName = useCallback(async (name) => {
    if (!currentUserKey) return { success: false, message: "ไม่พบผู้ใช้ที่ล็อกอิน" };
    try {
      const payload = await updateProfileName(name);
      const user = payload?.user ?? {};
      const username = String(user?.username ?? currentUserKey).trim().toLowerCase();
      setUsers((prev) => ({
        ...prev,
        [username]: {
          ...(prev[username] ?? {}),
          name: user?.name ?? name,
          employeeCode: user?.employee_code ?? prev[username]?.employeeCode ?? "",
          role: user?.role ?? prev[username]?.role ?? "ผู้ใช้งาน",
          status: user?.status ?? prev[username]?.status ?? "active",
        },
      }));
      return { success: true, message: "บันทึกชื่อเรียบร้อย" };
    } catch (error) {
      return { success: false, message: error?.message ?? "ไม่สามารถบันทึกชื่อได้" };
    }
  }, [currentUserKey, setUsers]);

  const handleSaveProfile = useCallback(async ({ name, employeeCode }) => {
    if (!currentUserKey) return { success: false, message: "ไม่พบผู้ใช้ที่ล็อกอิน" };
    try {
      const payload = await updateProfile({ name, employeeCode });
      const user = payload?.user ?? {};
      const username = String(user?.username ?? currentUserKey).trim().toLowerCase();
      setUsers((prev) => ({
        ...prev,
        [username]: {
          ...(prev[username] ?? {}),
          name: user?.name ?? name,
          employeeCode: user?.employee_code ?? employeeCode ?? prev[username]?.employeeCode ?? "",
          role: user?.role ?? prev[username]?.role ?? "ผู้ใช้งาน",
          status: user?.status ?? prev[username]?.status ?? "active",
        },
      }));
      return { success: true, message: "บันทึกข้อมูลเรียบร้อย" };
    } catch (error) {
      return { success: false, message: error?.message ?? "ไม่สามารถบันทึกข้อมูลได้" };
    }
  }, [currentUserKey, setUsers]);

  const handleChangePassword = useCallback(async (username, currentPassword, nextPassword) => {
    if (!username || username !== currentUserKey) return { success: false, message: "ไม่สามารถเปลี่ยนรหัสผ่านได้" };
    try {
      await changeProfilePassword(currentPassword, nextPassword);
      return { success: true, message: "เปลี่ยนรหัสผ่านเรียบร้อย" };
    } catch (error) {
      return { success: false, message: error?.message ?? "ไม่สามารถเปลี่ยนรหัสผ่านได้" };
    }
  }, [currentUserKey]);

  const handleResetUserPassword = useCallback(async (username) => {
    try {
      const resolvedPassword = String(defaultUserPassword ?? "").trim() || (await fetchDefaultResetPasswordAdmin());
      await resetUserPasswordAdmin(username, resolvedPassword);
      setDefaultUserPassword(resolvedPassword);
      await refreshUsersForAdmin();
      return { success: true, message: `รีเซ็ตรหัสผ่านของ ${username} สำเร็จ` };
    } catch (error) {
      return { success: false, message: error?.message ?? "รีเซ็ตรหัสผ่านไม่สำเร็จ" };
    }
  }, [defaultUserPassword, setDefaultUserPassword, refreshUsersForAdmin]);

  const handleCreateUser = useCallback(async ({ name, username, employeeCode, role, status, password }) => {
    try {
      const resolvedPassword =
        String(password ?? "").trim() ||
        String(defaultUserPassword ?? "").trim() ||
        (await fetchDefaultResetPasswordAdmin());
      const payload = await createUserAdmin({ name, username, employeeCode, role, status, password: resolvedPassword });
      setDefaultUserPassword((prev) => prev || resolvedPassword);
      const user = payload?.user ?? {};
      const normalizedUsername = String(user?.username ?? username).trim().toLowerCase();
      if (normalizedUsername) {
        setUsers((prev) => ({
          ...prev,
          [normalizedUsername]: {
            name: user?.name ?? name,
            employeeCode: user?.employee_code ?? employeeCode ?? "",
            role: user?.role ?? role ?? "ผู้ใช้งาน",
            status: user?.status ?? status ?? "active",
          },
        }));
      }
      return { success: true, message: `เพิ่มผู้ใช้ ${normalizedUsername} เรียบร้อย` };
    } catch (error) {
      return { success: false, message: error?.message ?? "ไม่สามารถเพิ่มผู้ใช้ได้" };
    }
  }, [defaultUserPassword, setDefaultUserPassword, setUsers]);

  const handleUpdateUserRole = useCallback(async (username, role) => {
    try {
      await updateUserAdmin(username, { role });
      patchUserState(username, { role });
      return { success: true };
    } catch (error) {
      return { success: false, message: error?.message ?? "ไม่สามารถอัปเดตตำแหน่งได้" };
    }
  }, [patchUserState]);

  const handleUpdateUserStatus = useCallback(async (username, status) => {
    try {
      await updateUserAdmin(username, { status });
      patchUserState(username, { status });
      return { success: true };
    } catch (error) {
      return { success: false, message: error?.message ?? "ไม่สามารถอัปเดตสถานะได้" };
    }
  }, [patchUserState]);

  const handleUpdateUserProfileByAdmin = useCallback(async (username, payload) => {
    try {
      const response = await updateUserAdmin(username, payload);
      const user = response?.user ?? {};
      setUsers((prev) => ({
        ...prev,
        [username]: {
          ...(prev[username] ?? {}),
          name: user?.name ?? payload?.name ?? prev[username]?.name ?? username,
          employeeCode: user?.employee_code ?? payload?.employee_code ?? prev[username]?.employeeCode ?? "",
          role: user?.role ?? prev[username]?.role ?? "ผู้ใช้งาน",
          status: user?.status ?? prev[username]?.status ?? "active",
        },
      }));
      return { success: true, message: `อัปเดตข้อมูลของ ${username} สำเร็จ` };
    } catch (error) {
      return { success: false, message: error?.message ?? "ไม่สามารถอัปเดตข้อมูลผู้ใช้ได้" };
    }
  }, [setUsers]);

  return {
    handleSaveName,
    handleSaveProfile,
    handleChangePassword,
    handleResetUserPassword,
    handleCreateUser,
    handleUpdateUserRole,
    handleUpdateUserStatus,
    handleUpdateUserProfileByAdmin,
  };
}
