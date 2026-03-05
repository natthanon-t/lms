import { getAccessToken } from "./authService";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:5020";

const authHeaders = () => ({
  "Content-Type": "application/json",
  Authorization: `Bearer ${getAccessToken()}`,
});

const request = async (path, options = {}) => {
  const response = await fetch(`${API_BASE_URL}${path}`, options);
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(payload?.message ?? "request failed");
  }
  return payload;
};

// ── Avatar ────────────────────────────────────────────────────────────────────

export const fetchAvatarApi = async () => {
  const payload = await request("/api/profile/avatar", {
    headers: authHeaders(),
  });
  return payload?.data_url ?? "";
};

export const updateAvatarApi = async (dataUrl) =>
  request("/api/profile/avatar", {
    method: "PUT",
    headers: authHeaders(),
    body: JSON.stringify({ data_url: dataUrl }),
  });

// ── Course Content Images ─────────────────────────────────────────────────────

export const fetchCourseImagesApi = async (courseId) => {
  const payload = await request(`/api/courses/${encodeURIComponent(courseId)}/images`);
  return payload?.images ?? {};
};

export const saveCourseImageApi = async (courseId, filename, dataUrl) =>
  request(`/api/courses/${encodeURIComponent(courseId)}/images`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify({ filename, data_url: dataUrl }),
  });
