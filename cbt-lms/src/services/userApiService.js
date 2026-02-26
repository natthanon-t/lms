import { getAccessToken } from "./authService";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:5020";

const toHeaders = (token) => ({
  "Content-Type": "application/json",
  ...(token ? { Authorization: `Bearer ${token}` } : {}),
});

const request = async (path, options = {}) => {
  const response = await fetch(`${API_BASE_URL}${path}`, options);
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(payload?.message ?? "request failed");
  }
  return payload;
};

const authRequest = (path, options = {}) =>
  request(path, {
    ...options,
    headers: {
      ...toHeaders(getAccessToken()),
      ...(options.headers ?? {}),
    },
  });

export const listUsersAdmin = async () => {
  const payload = await authRequest("/api/users", { method: "GET" });
  return Array.isArray(payload?.users) ? payload.users : [];
};

export const createUserAdmin = async ({ name, username, password, role, status }) =>
  authRequest("/api/users", {
    method: "POST",
    body: JSON.stringify({ name, username, password, role, status }),
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

export const updateProfileName = async (name) =>
  authRequest("/api/profile", {
    method: "PATCH",
    body: JSON.stringify({ name }),
  });

export const changeProfilePassword = async (currentPassword, nextPassword) =>
  authRequest("/api/profile/change-password", {
    method: "POST",
    body: JSON.stringify({
      current_password: currentPassword,
      new_password: nextPassword,
    }),
  });
