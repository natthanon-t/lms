import { authHeaders, request } from "./apiClient";

export const fetchAnalyticsApi = async () =>
  request("/api/admin/analytics", { headers: authHeaders() });

export const fetchCourseLearnerApi = async (courseId) =>
  request(`/api/admin/analytics/courses/${encodeURIComponent(courseId)}/learners`, {
    headers: authHeaders(),
  });

export const fetchCourseStatsApi = async (scope) => {
  const qs = scope === "my" ? "?scope=my" : "";
  const payload = await request(`/api/admin/analytics/course-stats${qs}`, {
    headers: authHeaders(),
  });
  return Array.isArray(payload?.courses) ? payload.courses : [];
};

export const fetchCourseDetailAnalyticsApi = async (courseId) =>
  request(`/api/admin/analytics/courses/${encodeURIComponent(courseId)}/detail`, {
    headers: authHeaders(),
  });

export const fetchExamStatsApi = async (scope) => {
  const qs = scope === "my" ? "?scope=my" : "";
  const payload = await request(`/api/admin/analytics/exam-stats${qs}`, {
    headers: authHeaders(),
  });
  return Array.isArray(payload?.exams) ? payload.exams : [];
};

export const fetchExamDetailAnalyticsApi = async (examId) =>
  request(`/api/admin/analytics/exams/${encodeURIComponent(examId)}/detail`, {
    headers: authHeaders(),
  });
