import { authHeaders, request } from "./apiClient";

const authRequest = (path, options = {}) =>
  request(path, { ...options, headers: { ...authHeaders(), ...(options.headers ?? {}) } });

export const listUsersAdmin = async () => {
  const first = await authRequest("/api/users?page=1&limit=100", { method: "GET" });
  let all = Array.isArray(first?.users) ? first.users : [];
  const totalPages = first?.pagination?.total_pages ?? 1;
  if (totalPages > 1) {
    const rest = await Promise.all(
      Array.from({ length: totalPages - 1 }, (_, i) =>
        authRequest(`/api/users?page=${i + 2}&limit=100`, { method: "GET" }).then(
          (r) => (Array.isArray(r?.users) ? r.users : []),
        ),
      ),
    );
    all = [...all, ...rest.flat()];
  }
  return all;
};

export const createRoleAdmin = async ({ code, name }) =>
  authRequest("/api/role", {
    method: "POST",
    body: JSON.stringify({ code, name }),
  });

export const fetchRoleOptionsAdmin = async () => authRequest("/api/role", { method: "GET" });

export const updateRoleAdmin = async (roleCode, { name }) =>
  authRequest(`/api/role/${encodeURIComponent(roleCode)}`, {
    method: "PATCH",
    body: JSON.stringify({ name }),
  });

export const deleteRoleAdmin = async (roleCode) =>
  authRequest(`/api/role/${encodeURIComponent(roleCode)}`, {
    method: "DELETE",
  });

export const createUserAdmin = async ({ name, username, employeeCode, password, role, status }) =>
  authRequest("/api/users", {
    method: "POST",
    body: JSON.stringify({ name, username, employee_code: employeeCode, password, role, status }),
  });

export const updateUserAdmin = async (username, payload) =>
  authRequest(`/api/users/${encodeURIComponent(username)}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });

export const resetUserPasswordAdmin = async (username, newPassword) =>
  authRequest(`/api/users/${encodeURIComponent(username)}/reset-password`, {
    method: "POST",
    body: JSON.stringify({ new_password: newPassword }),
  });

export const fetchDefaultResetPasswordAdmin = async () => {
  const payload = await authRequest("/api/users/default-password", { method: "GET" });
  return String(payload?.default_password ?? "");
};

export const updateDefaultResetPasswordAdmin = async (defaultPassword) =>
  authRequest("/api/users/default-password", {
    method: "PUT",
    body: JSON.stringify({ default_password: defaultPassword }),
  });

export const updateProfileName = async (name) =>
  authRequest("/api/profile", {
    method: "PATCH",
    body: JSON.stringify({ name }),
  });

export const updateProfile = async ({ name, employeeCode }) =>
  authRequest("/api/profile", {
    method: "PATCH",
    body: JSON.stringify({
      ...(name !== undefined && { name }),
      ...(employeeCode !== undefined && { employee_code: employeeCode }),
    }),
  });

export const changeProfilePassword = async (currentPassword, nextPassword) =>
  authRequest("/api/profile/change-password", {
    method: "POST",
    body: JSON.stringify({
      current_password: currentPassword,
      new_password: nextPassword,
    }),
  });

export const updateRolePermissionsAdmin = async (roleCode, permissions) =>
  authRequest(`/api/role/${encodeURIComponent(roleCode)}/permissions`, {
    method: "PUT",
    body: JSON.stringify({ permissions }),
  });
