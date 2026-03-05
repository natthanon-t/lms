import { authHeaders, request } from "./apiClient";

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
