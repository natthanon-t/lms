import { refreshAuth } from "./authService";

export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:5020";

export const getCsrfToken = () => {
  const match = document.cookie.match(/(?:^|;\s*)csrf_token=([^;]*)/);
  return match ? decodeURIComponent(match[1]) : "";
};

export const authHeaders = () => ({
  "Content-Type": "application/json",
});

/* Singleton refresh lock: prevents concurrent refresh calls */
let refreshPromise = null;

const tryRefreshToken = async () => {
  if (refreshPromise) return refreshPromise;
  refreshPromise = refreshAuth().finally(() => { refreshPromise = null; });
  return refreshPromise;
};

/* In-flight GET deduplication: concurrent identical GETs share one promise */
const inflight = new Map();

export const request = async (path, options = {}) => {
  const method = (options.method ?? "GET").toUpperCase();
  const isGet = method === "GET";
  const key = isGet ? path : null;

  if (isGet && inflight.has(key)) return inflight.get(key);

  const buildFetchOptions = () => {
    const csrfHeaders = !isGet ? { "X-CSRF-Token": getCsrfToken() } : {};
    return {
      ...options,
      credentials: "include",
      headers: { "Content-Type": "application/json", ...options.headers, ...csrfHeaders },
    };
  };

  const promise = (async () => {
    const response = await fetch(`${API_BASE_URL}${path}`, buildFetchOptions());
    const payload = await response.json().catch(() => ({}));

    // Auto-refresh on 401 and retry once (skip auth endpoints to avoid loops)
    if (response.status === 401 && !path.startsWith("/api/auth/")) {
      try {
        await tryRefreshToken();
        // After refresh, cookies are updated; rebuild CSRF header
        const retryResponse = await fetch(`${API_BASE_URL}${path}`, buildFetchOptions());
        const retryPayload = await retryResponse.json().catch(() => ({}));
        if (!retryResponse.ok) {
          const err = new Error(retryPayload?.message ?? "request failed");
          err.status = retryResponse.status;
          throw err;
        }
        return retryPayload;
      } catch {
        const err = new Error(payload?.message ?? "request failed");
        err.status = response.status;
        throw err;
      }
    }

    if (!response.ok) {
      const err = new Error(payload?.message ?? "request failed");
      err.status = response.status;
      throw err;
    }
    return payload;
  })();

  if (isGet) {
    inflight.set(key, promise);
    promise.finally(() => inflight.delete(key));
  }

  return promise;
};
