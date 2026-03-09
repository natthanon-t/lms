import { authHeaders, request } from "./apiClient";

export const fetchAnalyticsApi = async () =>
  request("/api/admin/analytics", { headers: authHeaders() });

export const fetchCourseLearnerApi = async (courseId) =>
  request(`/api/admin/analytics/courses/${encodeURIComponent(courseId)}/learners`, {
    headers: authHeaders(),
  });
