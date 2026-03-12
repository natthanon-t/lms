import { API_BASE_URL, authHeaders, request } from "./apiClient";
import { getAccessToken } from "./authService";

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

// ── Course Attachments ────────────────────────────────────────────────────────

export const fetchCourseAttachmentsApi = async (courseId) => {
  const payload = await request(`/api/courses/${encodeURIComponent(courseId)}/attachments`);
  return (payload?.attachments ?? []).map((att) => ({
    ...att,
    urlPath: toAbsoluteUrl(att.urlPath),
  }));
};

export const uploadCourseAttachmentApi = async (courseId, file) => {
  const formData = new FormData();
  formData.append("file", file);
  // Use fetch directly — do NOT set Content-Type (browser sets multipart boundary automatically)
  const response = await fetch(`${API_BASE_URL}/api/courses/${encodeURIComponent(courseId)}/attachments`, {
    method: "POST",
    headers: { Authorization: `Bearer ${getAccessToken()}` },
    body: formData,
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload?.message ?? "upload failed");
  const att = payload?.attachment ?? {};
  return { ...att, urlPath: toAbsoluteUrl(att.urlPath) };
};

export const deleteCourseAttachmentApi = async (courseId, attId) =>
  request(`/api/courses/${encodeURIComponent(courseId)}/attachments/${attId}`, {
    method: "DELETE",
    headers: authHeaders(),
  });
