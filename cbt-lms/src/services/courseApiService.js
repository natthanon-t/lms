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

// ── Courses ──────────────────────────────────────────────────────────────────

export const fetchCoursesApi = async () => {
  const payload = await request("/api/courses");
  return Array.isArray(payload?.courses) ? payload.courses : [];
};

export const upsertCourseApi = async (course) =>
  request("/api/courses", {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify({
      id:                      course.id ?? course.sourceId,
      title:                   course.title,
      creator:                 course.creator,
      status:                  course.status,
      description:             course.description,
      image:                   course.image,
      content:                 course.content,
      skillPoints:             course.skillPoints,
      subtopicCompletionScore: course.subtopicCompletionScore,
      courseCompletionScore:   course.courseCompletionScore,
      skillRewards:            Array.isArray(course.skillRewards) ? course.skillRewards : [],
    }),
  });

export const updateCourseStatusApi = async (id, status) =>
  request(`/api/courses/${encodeURIComponent(id)}/status`, {
    method: "PATCH",
    headers: authHeaders(),
    body: JSON.stringify({ status }),
  });

export const deleteCourseApi = async (id) =>
  request(`/api/courses/${encodeURIComponent(id)}`, {
    method: "DELETE",
    headers: authHeaders(),
  });

// ── Learning progress ─────────────────────────────────────────────────────────

export const fetchLearningProgressApi = async () => {
  const payload = await request("/api/learning/progress", {
    headers: authHeaders(),
  });
  return payload?.progress ?? {};
};

export const markSubtopicCompleteApi = async (courseId, subtopicId) =>
  request(
    `/api/learning/courses/${encodeURIComponent(courseId)}/subtopics/${encodeURIComponent(subtopicId)}/complete`,
    { method: "POST", headers: authHeaders() },
  );

export const submitSubtopicAnswerApi = async (courseId, subtopicId, questionId, typedAnswer, isCorrect) =>
  request(
    `/api/learning/courses/${encodeURIComponent(courseId)}/subtopics/${encodeURIComponent(subtopicId)}/answer`,
    {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify({ questionId, typedAnswer, isCorrect }),
    },
  );
