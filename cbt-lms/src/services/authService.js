const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:5020";
const ACCESS_TOKEN_KEY = "cbt_auth_access_token";
const REFRESH_TOKEN_KEY = "cbt_auth_refresh_token";

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

export const saveTokens = (accessToken, refreshToken) => {
  if (accessToken) {
    window.localStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
  }
  if (refreshToken) {
    window.localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
  }
};

export const clearTokens = () => {
  window.localStorage.removeItem(ACCESS_TOKEN_KEY);
  window.localStorage.removeItem(REFRESH_TOKEN_KEY);
};

export const getAccessToken = () => window.localStorage.getItem(ACCESS_TOKEN_KEY) ?? "";
export const getRefreshToken = () => window.localStorage.getItem(REFRESH_TOKEN_KEY) ?? "";

export const loginAuth = async ({ username, password }) => {
  const payload = await request("/api/auth/login", {
    method: "POST",
    headers: toHeaders(),
    body: JSON.stringify({ username, password }),
  });
  saveTokens(payload.token, payload.refresh_token);
  return payload;
};

export const registerAuth = async ({ name, username, employeeCode, password }) =>
  request("/api/auth/register", {
    method: "POST",
    headers: toHeaders(),
    body: JSON.stringify({ name, username, employee_code: employeeCode, password }),
  });

export const refreshAuth = async () => {
  const refreshToken = getRefreshToken();
  if (!refreshToken) {
    throw new Error("missing refresh token");
  }
  const payload = await request("/api/auth/refresh", {
    method: "POST",
    headers: toHeaders(),
    body: JSON.stringify({ refresh_token: refreshToken }),
  });
  saveTokens(payload.token, payload.refresh_token);
  return payload;
};

export const meAuth = async () =>
  request("/api/auth/me", {
    method: "GET",
    headers: toHeaders(getAccessToken()),
  });

export const logoutAuth = async () => {
  const refreshToken = getRefreshToken();
  try {
    await request("/api/auth/logout", {
      method: "POST",
      headers: toHeaders(),
      body: JSON.stringify({ refresh_token: refreshToken }),
    });
  } finally {
    clearTokens();
  }
};
