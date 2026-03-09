import { API_BASE_URL, authHeaders, request } from "./apiClient";

const toAbsoluteUrl = (path) => (path ? `${API_BASE_URL}${path}` : "");

// ── Avatar ────────────────────────────────────────────────────────────────────

export const fetchAvatarApi = async () => {
  const payload = await request("/api/profile/avatar", {
    headers: authHeaders(),
  });
  const raw = payload?.data_url ?? "";
  return raw.startsWith("/uploads/") ? toAbsoluteUrl(raw) : raw;
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
  const images = payload?.images ?? {};
  return Object.fromEntries(
    Object.entries(images).map(([filename, url]) => [filename, toAbsoluteUrl(url)])
  );
};

export const saveCourseImageApi = async (courseId, filename, dataUrl) => {
  const payload = await request(`/api/courses/${encodeURIComponent(courseId)}/images`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify({ filename, data_url: dataUrl }),
  });
  return toAbsoluteUrl(String(payload?.url ?? ""));
};
