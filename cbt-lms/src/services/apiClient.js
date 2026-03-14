import { getAccessToken } from "./authService";

export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:5020";

export const authHeaders = () => ({
  "Content-Type": "application/json",
  Authorization: `Bearer ${getAccessToken()}`,
});

/* In-flight GET deduplication: concurrent identical GETs share one promise */
const inflight = new Map();

export const request = async (path, options = {}) => {
  const method = (options.method ?? "GET").toUpperCase();
  const isGet = method === "GET";
  const key = isGet ? path : null;

  if (isGet && inflight.has(key)) return inflight.get(key);

  const promise = (async () => {
    const response = await fetch(`${API_BASE_URL}${path}`, options);
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(payload?.message ?? "request failed");
    }
    return payload;
  })();

  if (isGet) {
    inflight.set(key, promise);
    promise.finally(() => inflight.delete(key));
  }

  return promise;
};
