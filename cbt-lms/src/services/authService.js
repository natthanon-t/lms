import { API_BASE_URL, getCsrfToken } from "./apiClient";

const request = async (path, options = {}) => {
  const method = (options.method ?? "GET").toUpperCase();
  const csrfHeaders = method !== "GET" ? { "X-CSRF-Token": getCsrfToken() } : {};
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    credentials: "include",
    headers: { "Content-Type": "application/json", ...options.headers, ...csrfHeaders },
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const err = new Error(payload?.message ?? "request failed");
    err.status = response.status;
    throw err;
  }
  return payload;
};

export const loginAuth = async ({ username, password }) =>
  request("/api/auth/login", {
    method: "POST",
    body: JSON.stringify({ username, password }),
  });

export const registerAuth = async ({ name, username, employeeCode, password }) =>
  request("/api/auth/register", {
    method: "POST",
    body: JSON.stringify({
      name,
      username,
      password,
      ...(employeeCode && { employee_code: employeeCode }),
    }),
  });

export const refreshAuth = async () =>
  request("/api/auth/refresh", { method: "POST" });

export const meAuth = async () =>
  request("/api/auth/me", { method: "GET" });

export const fetchMyPermissions = async () =>
  request("/api/auth/permissions", { method: "GET" });

export const fetchLoginDates = async () => {
  const payload = await request("/api/auth/login-dates", { method: "GET" });
  return payload.dates ?? [];
};

export const logoutAuth = async () => {
  try {
    await request("/api/auth/logout", { method: "POST" });
  } finally {
    // Cookies are cleared by the server via Set-Cookie
  }
};
