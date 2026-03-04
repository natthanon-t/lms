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

// ── Normalize attempt from API to the shape ExamDetailPage expects ────────────

const normalizeAttempt = (attempt) => ({
  attemptId: String(attempt.id),
  date: attempt.startedAt,
  correctCount: attempt.correctCount,
  totalQuestions: attempt.totalQuestions,
  scorePercent: attempt.scorePercent,
  domainStats: Object.entries(attempt.domainStats ?? {})
    .map(([domain, stat]) => ({
      domain,
      correct: stat.correct,
      total: stat.total,
      percent: stat.total > 0 ? Math.round((stat.correct / stat.total) * 100) : 0,
    }))
    .sort((a, b) => a.domain.localeCompare(b.domain)),
  details: (attempt.details ?? []).map((item, idx) => ({
    index: idx + 1,
    question: {
      id: item.questionId,
      question: item.question,
      domain: item.domain,
      questionType: item.questionType ?? "multiple_choice",
      choices: Array.isArray(item.choices) ? item.choices : [],
      answerKey: item.answerKey,
      explanation: item.explanation,
    },
    selected: item.selected,
    isCorrect: item.isCorrect,
  })),
});

// ── Exams ─────────────────────────────────────────────────────────────────────

export const fetchExamsApi = async () => {
  const payload = await request("/api/exams");
  return Array.isArray(payload?.exams) ? payload.exams : [];
};

export const fetchExamApi = async (id) => {
  const payload = await request(`/api/exams/${encodeURIComponent(id)}`);
  return payload?.exam ?? null;
};

export const upsertExamApi = async (exam) =>
  request("/api/exams", {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify({
      id:                exam.id ?? exam.sourceId,
      title:             exam.title,
      creator:           exam.creator,
      status:            exam.status,
      description:       exam.description,
      instructions:      exam.instructions,
      image:             exam.image,
      numberOfQuestions: exam.numberOfQuestions,
      defaultTime:       exam.defaultTime,
      maxAttempts:       exam.maxAttempts ?? 0,
      domainPercentages: exam.domainPercentages ?? {},
      questions:         Array.isArray(exam.questions) ? exam.questions.map((q) => ({
        ...q,
        questionType: q.questionType ?? "multiple_choice",
      })) : [],
    }),
  });

export const updateExamStatusApi = async (id, status) =>
  request(`/api/exams/${encodeURIComponent(id)}/status`, {
    method: "PATCH",
    headers: authHeaders(),
    body: JSON.stringify({ status }),
  });

export const deleteExamApi = async (id) =>
  request(`/api/exams/${encodeURIComponent(id)}`, {
    method: "DELETE",
    headers: authHeaders(),
  });

// ── Attempts ──────────────────────────────────────────────────────────────────

export const saveExamAttemptApi = async (examId, { correctCount, totalQuestions, scorePercent, domainStats, answers }) =>
  request(`/api/exams/${encodeURIComponent(examId)}/attempts`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify({ correctCount, totalQuestions, scorePercent, domainStats, answers }),
  });

export const fetchExamAttemptsApi = async (examId) => {
  const payload = await request(`/api/exams/${encodeURIComponent(examId)}/attempts`, {
    headers: authHeaders(),
  });
  return (Array.isArray(payload?.attempts) ? payload.attempts : []).map(normalizeAttempt);
};
