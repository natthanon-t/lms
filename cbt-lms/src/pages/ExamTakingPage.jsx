import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import ConfirmModal from "../components/ui/ConfirmModal";
import { useAppData } from "../contexts/AppDataContext";

const shuffleArray = (items) => {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
};

const formatTime = (seconds) => {
  const safe = Math.max(0, seconds);
  const mm = String(Math.floor(safe / 60)).padStart(2, "0");
  const ss = String(safe % 60).padStart(2, "0");
  return `${mm}:${ss}`;
};

const normalizeText = (text) => String(text ?? "").trim().toLowerCase();

const allocateDomainCounts = (totalQuestions, domainPercentages) => {
  const domains = Object.entries(domainPercentages ?? {});
  if (!domains.length || totalQuestions <= 0) {
    return {};
  }

  const raw = domains.map(([domain, percent]) => ({
    domain,
    exact: (totalQuestions * Number(percent || 0)) / 100,
  }));
  const base = raw.map((item) => ({
    domain: item.domain,
    count: Math.floor(item.exact),
    remainder: item.exact - Math.floor(item.exact),
  }));

  let used = base.reduce((sum, item) => sum + item.count, 0);
  let remaining = Math.max(0, totalQuestions - used);

  base
    .sort((a, b) => b.remainder - a.remainder)
    .forEach((item) => {
      if (remaining <= 0) {
        return;
      }
      item.count += 1;
      remaining -= 1;
      used += 1;
    });

  return Object.fromEntries(base.map((item) => [item.domain, item.count]));
};

const pickQuestionsByDomainPercentage = (questions, totalQuestions, domainPercentages) => {
  const base = Array.isArray(questions) ? questions : [];
  if (!base.length) {
    return [];
  }

  const limit = Math.min(Math.max(0, Number(totalQuestions) || 0), base.length);
  if (!limit) {
    return [];
  }

  const targets = allocateDomainCounts(limit, domainPercentages);
  if (!Object.keys(targets).length) {
    return base.slice(0, limit);
  }

  const grouped = base.reduce((acc, question) => {
    const domain = question.domain || "-";
    if (!acc[domain]) {
      acc[domain] = [];
    }
    acc[domain].push(question);
    return acc;
  }, {});

  const selected = [];

  Object.entries(targets).forEach(([domain, needed]) => {
    const pool = grouped[domain] ?? [];
    const take = Math.min(needed, pool.length);
    for (let i = 0; i < take; i += 1) {
      selected.push(pool[i]);
    }
  });

  if (selected.length < limit) {
    const seen = new Set(selected.map((item) => item.id));
    const fallback = base.filter((question) => !seen.has(question.id));
    for (const question of fallback) {
      selected.push(question);
      if (selected.length >= limit) {
        break;
      }
    }
  }

  return selected;
};

export default function ExamTakingPage() {
  const { examId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { examDraft, handleSaveAttempt } = useAppData();

  const draft = examDraft;
  const orderMode = location.state?.orderMode ?? "sequential";
  const durationSeconds = (draft?.defaultTime ?? 0) * 60;
  const onSaveAttempt = handleSaveAttempt;
  const selectedQuestions = useMemo(() => {
    return pickQuestionsByDomainPercentage(draft.questions, draft.numberOfQuestions, draft.domainPercentages);
  }, [draft.questions, draft.numberOfQuestions, draft.domainPercentages]);

  const orderedQuestions = useMemo(() => {
    const base = Array.isArray(selectedQuestions) ? selectedQuestions : [];
    return orderMode === "random" ? shuffleArray(base) : base;
  }, [draft.sourceId, selectedQuestions, orderMode]);

  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState({});
  const [remainingSeconds, setRemainingSeconds] = useState(durationSeconds);
  const [showEndConfirm, setShowEndConfirm] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    setCurrentIndex(0);
    setAnswers({});
    setRemainingSeconds(durationSeconds);
    setSubmitting(false);
  }, [draft.sourceId, orderMode, durationSeconds]);

  const totalQuestions = orderedQuestions.length;

  const submitExam = useCallback(async () => {
    setSubmitting(true);
    const rawAnswers = orderedQuestions.map((question) => ({
      questionId: question.id,
      selected: answers[question.id] ?? "",
    }));
    const payload = await onSaveAttempt(rawAnswers);

    if (!payload) {
      // fallback: grade client-side if backend fails
      const details = orderedQuestions.map((question, index) => {
        const selected = answers[question.id] ?? null;
        const isTextType = question.questionType === "text";
        const isCorrect = isTextType ? null : normalizeText(selected) === normalizeText(question.answerKey);
        return { index: index + 1, question, selected, isCorrect };
      });
      const gradedDetails = details.filter((item) => item.isCorrect !== null);
      const correctCount = gradedDetails.filter((item) => item.isCorrect).length;
      const gradedTotal = gradedDetails.length;
      const scorePercent = gradedTotal > 0 ? Math.round((correctCount / gradedTotal) * 100) : 0;
      const domainStatsMap = {};
      details.forEach((item) => {
        if (item.isCorrect === null) return;
        const domain = item.question.domain || "-";
        if (!domainStatsMap[domain]) domainStatsMap[domain] = { domain, total: 0, correct: 0 };
        domainStatsMap[domain].total += 1;
        if (item.isCorrect) domainStatsMap[domain].correct += 1;
      });
      const domainStats = Object.values(domainStatsMap)
        .map((e) => ({ ...e, percent: e.total > 0 ? Math.round((e.correct / e.total) * 100) : 0 }))
        .sort((a, b) => a.domain.localeCompare(b.domain));
      navigate(`/exam/${examId}/result`, {
        state: { result: { correctCount, totalQuestions, gradedTotal, scorePercent, details, domainStats }, examTitle: draft.title },
        replace: true,
      });
      return;
    }

    // Use backend-graded result
    const { attempt, details: backendDetails } = payload;
    const details = (backendDetails ?? []).map((item, index) => ({
      index: index + 1,
      question: {
        id: item.questionId,
        domain: item.domain,
        questionType: item.questionType,
        question: item.question,
        choices: item.choices,
        answerKey: item.answerKey,
        explanation: item.explanation,
      },
      selected: item.selected || null,
      isCorrect: item.isCorrect,
    }));
    const gradedDetails = details.filter((d) => d.isCorrect !== null);
    const domainStatsMap = {};
    gradedDetails.forEach((item) => {
      const domain = item.question.domain || "-";
      if (!domainStatsMap[domain]) domainStatsMap[domain] = { domain, total: 0, correct: 0 };
      domainStatsMap[domain].total += 1;
      if (item.isCorrect) domainStatsMap[domain].correct += 1;
    });
    const domainStats = Object.values(domainStatsMap)
      .map((e) => ({ ...e, percent: e.total > 0 ? Math.round((e.correct / e.total) * 100) : 0 }))
      .sort((a, b) => a.domain.localeCompare(b.domain));
    navigate(`/exam/${examId}/result`, {
      state: {
        result: {
          attemptId: attempt?.id ?? null,
          correctCount: attempt?.correctCount ?? 0,
          totalQuestions: attempt?.totalQuestions ?? details.length,
          gradedTotal: gradedDetails.length,
          scorePercent: attempt?.scorePercent ?? 0,
          details,
          domainStats,
        },
        examTitle: draft.title,
      },
      replace: true,
    });
  }, [answers, orderedQuestions, totalQuestions, onSaveAttempt, navigate, examId, draft.title]);

  useEffect(() => {
    if (submitting) {
      return undefined;
    }

    if (durationSeconds > 0 && remainingSeconds <= 0) {
      void submitExam();
      return undefined;
    }

    if (durationSeconds <= 0) {
      return undefined;
    }

    const timerId = setInterval(() => {
      setRemainingSeconds((prev) => prev - 1);
    }, 1000);

    return () => clearInterval(timerId);
  }, [durationSeconds, remainingSeconds, submitting, submitExam]);

  const currentQuestion = orderedQuestions[currentIndex];

  if (submitting) {
    return (
      <section className="workspace-content">
        <header className="content-header">
          <h1>เข้าสอบ: {draft.title}</h1>
          <p>กำลังตรวจข้อสอบ...</p>
        </header>
      </section>
    );
  }

  if (!currentQuestion) {
    return (
      <section className="workspace-content">
        <header className="content-header">
          <h1>เข้าสอบ: {draft.title}</h1>
          <p>ไม่พบข้อสอบในชุดนี้</p>
        </header>
      </section>
    );
  }

  const handleEndExam = () => {
    setShowEndConfirm(true);
  };

  const answeredCount = Object.keys(answers).filter((key) => answers[key] !== "" && answers[key] != null).length;
  const answeredPercent = totalQuestions > 0 ? Math.round((answeredCount / totalQuestions) * 100) : 0;

  return (
    <section className="workspace-content exam-taking-page">
      {showEndConfirm && (
        <ConfirmModal
          title="ต้องการสิ้นสุดการสอบ?"
          message="หากกดยืนยัน ระบบจะนับคะแนนเฉพาะข้อที่ทำเสร็จแล้ว และจะไม่สามารถกลับมาทำต่อได้"
          confirmLabel="สิ้นสุดการสอบ"
          cancelLabel="ยกเลิก"
          confirmDanger
          onConfirm={() => { setShowEndConfirm(false); void submitExam(); }}
          onCancel={() => setShowEndConfirm(false)}
        />
      )}
      <header className="content-header editor-head">
        <div>
          <h1>เข้าสอบ: {draft.title}</h1>
          <p>
            ข้อ {currentIndex + 1} / {totalQuestions}
            {" · "}ตอบแล้ว {answeredCount}/{totalQuestions} ข้อ
          </p>
        </div>
        <div className="exam-top-actions">
          <span className="timer-badge">⏱ เวลาคงเหลือ {formatTime(remainingSeconds)}</span>
        </div>
      </header>

      <article className="info-card question-card">
        <div className="exam-progress-shell" aria-label="Exam progress">
          <div className="exam-progress-track">
            <div className="exam-progress-fill" style={{ width: `${answeredPercent}%` }} />
          </div>
          <span className="exam-progress-label">ตอบแล้ว {answeredCount}/{totalQuestions} ({answeredPercent}%)</span>
        </div>

        <p className="question-domain-label">
          <span className="question-domain-badge">{currentQuestion.domain}</span>
          <span className="question-counter">ข้อ {currentIndex + 1} จาก {totalQuestions}</span>
        </p>
        <h3>{currentQuestion.question}</h3>

        {currentQuestion.questionType === "text" ? (
          <div className="text-answer-wrap">
            <p style={{ fontSize: "0.85rem", color: "var(--text-muted, #6b7280)", marginBottom: "0.5rem" }}>
              พิมพ์คำตอบของคุณด้านล่าง (ข้อนี้ไม่มีเฉลยตายตัว)
            </p>
            <textarea
              className="text-answer-input"
              rows={5}
              value={answers[currentQuestion.id] ?? ""}
              onChange={(event) =>
                setAnswers((prevAnswers) => ({
                  ...prevAnswers,
                  [currentQuestion.id]: event.target.value,
                }))
              }
              placeholder="พิมพ์คำตอบที่นี่..."
            />
          </div>
        ) : (
          <div className="choice-list">
            {currentQuestion.choices.map((choice, idx) => {
              const key = `${currentQuestion.id}-${idx}`;
              const checked = answers[currentQuestion.id] === choice;

              return (
                <label key={key} className={checked ? "choice-item checked" : "choice-item"}>
                  <input
                    type="radio"
                    name={currentQuestion.id}
                    checked={checked}
                    onChange={() =>
                      setAnswers((prevAnswers) => ({
                        ...prevAnswers,
                        [currentQuestion.id]: choice,
                      }))
                    }
                  />
                  <span>{choice}</span>
                </label>
              );
            })}
          </div>
        )}

        <div className="exam-nav-actions">
          <button
            type="button"
            className="back-button"
            onClick={() => setCurrentIndex((prev) => Math.max(0, prev - 1))}
            disabled={currentIndex === 0}
          >
            ← ย้อนกลับ
          </button>
          <button
            type="button"
            className="enter-button"
            onClick={() => setCurrentIndex((prev) => Math.min(totalQuestions - 1, prev + 1))}
            disabled={currentIndex === totalQuestions - 1}
          >
            ถัดไป →
          </button>
          {currentIndex === totalQuestions - 1 ? (
            <button type="button" className="submit-exam-button" onClick={() => void submitExam()}>
              ✓ ส่งข้อสอบ
            </button>
          ) : null}
        </div>

        <div className="exam-end-wrap">
          <button type="button" className="end-exam-button" onClick={handleEndExam}>
            สิ้นสุดการสอบ
          </button>
        </div>
      </article>
    </section>
  );
}
