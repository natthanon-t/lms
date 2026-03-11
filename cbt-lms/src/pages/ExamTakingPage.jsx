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
  const { examDraft, handleSaveAttempt, openExam, examBank } = useAppData();
  const [saveError, setSaveError] = useState(null);
  const [examLoading, setExamLoading] = useState(false);

  // Load exam if context draft doesn't match current examId (e.g. page refresh)
  useEffect(() => {
    const alreadyLoaded = examDraft?.sourceId === examId || examDraft?.id === examId;
    if (!alreadyLoaded && examId) {
      const fromBank = examBank.find((e) => e.id === examId);
      if (fromBank) {
        setExamLoading(true);
        openExam(fromBank).then(() => setExamLoading(false));
      }
    }
  }, [examId, examDraft?.sourceId, examDraft?.id, examBank, openExam]);

  const draft = examDraft;
  const orderMode = location.state?.orderMode ?? "sequential";
  const durationSeconds = (draft?.defaultTime ?? 0) * 60;
  const onEndExam = () => navigate(`/exam/${examId}`);
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
  const [submittedResult, setSubmittedResult] = useState(null);
  const [showEndConfirm, setShowEndConfirm] = useState(false);

  useEffect(() => {
    setCurrentIndex(0);
    setAnswers({});
    setRemainingSeconds(durationSeconds);
    setSubmittedResult(null);
  }, [draft.sourceId, orderMode, durationSeconds]);

  const totalQuestions = orderedQuestions.length;

  const submitExam = useCallback(() => {
    const details = orderedQuestions.map((question, index) => {
      const selected = answers[question.id] ?? null;
      const isTextType = question.questionType === "text";
      const isCorrect = isTextType ? null : normalizeText(selected) === normalizeText(question.answerKey);

      return {
        index: index + 1,
        question,
        selected,
        isCorrect,
      };
    });

    const gradedDetails = details.filter((item) => item.isCorrect !== null);
    const correctCount = gradedDetails.filter((item) => item.isCorrect).length;
    const gradedTotal = gradedDetails.length;
    const scorePercent = gradedTotal > 0 ? Math.round((correctCount / gradedTotal) * 100) : 0;
    const domainStatsMap = details.reduce((acc, item) => {
      if (item.isCorrect === null) {
        return acc;
      }
      const domain = item.question.domain || "-";
      if (!acc[domain]) {
        acc[domain] = { domain, total: 0, correct: 0 };
      }
      acc[domain].total += 1;
      if (item.isCorrect) {
        acc[domain].correct += 1;
      }
      return acc;
    }, {});
    const domainStats = Object.values(domainStatsMap)
      .map((entry) => ({
        ...entry,
        percent: entry.total > 0 ? Math.round((entry.correct / entry.total) * 100) : 0,
      }))
      .sort((a, b) => a.domain.localeCompare(b.domain));

    const result = {
      correctCount,
      totalQuestions,
      gradedTotal,
      scorePercent,
      details,
      domainStats,
    };
    setSubmittedResult(result);
    setSaveError(null);
    onSaveAttempt(result).then((res) => {
      if (res && !res.success) {
        setSaveError(res.message ?? "บันทึกผลการสอบไม่สำเร็จ");
      }
    });
  }, [answers, orderedQuestions, totalQuestions, onSaveAttempt]);

  useEffect(() => {
    if (submittedResult) {
      return undefined;
    }

    if (remainingSeconds <= 0) {
      submitExam();
      return undefined;
    }

    const timerId = setInterval(() => {
      setRemainingSeconds((prev) => prev - 1);
    }, 1000);

    return () => clearInterval(timerId);
  }, [remainingSeconds, submittedResult, submitExam]);

  const currentQuestion = orderedQuestions[currentIndex];

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

  if (examLoading || (!draft?.title && examId)) {
    return (
      <section className="workspace-content">
        <header className="content-header">
          <h1>กำลังโหลดข้อสอบ</h1>
          <p>Loading...</p>
        </header>
      </section>
    );
  }

  if (submittedResult) {
    return (
      <section className="workspace-content">
        {saveError ? (
          <div
            style={{
              background: "#fef2f2",
              border: "1px solid #fca5a5",
              borderRadius: "8px",
              color: "#b91c1c",
              padding: "12px 16px",
              marginBottom: "16px",
            }}
          >
            ⚠️ ไม่สามารถบันทึกผลการสอบได้: {saveError} — กรุณาติดต่อผู้ดูแลระบบ
          </div>
        ) : null}
        <header className="content-header editor-head">
          <div>
            <h1>ผลการสอบ: {draft.title}</h1>
            <p>
              คะแนน {submittedResult.correctCount}/{submittedResult.gradedTotal} ({submittedResult.scorePercent}%)
              {submittedResult.gradedTotal < submittedResult.totalQuestions ? (
                <span style={{ fontSize: "0.85rem", color: "var(--text-muted, #888)", marginLeft: "0.5rem" }}>
                  (รวม {submittedResult.totalQuestions} ข้อ, {submittedResult.totalQuestions - submittedResult.gradedTotal} ข้อพิมพ์ตอบ)
                </span>
              ) : null}
            </p>
          </div>
          <button type="button" className="back-button" onClick={onEndExam}>
            กลับหน้าข้อสอบ
          </button>
        </header>

        <div className="result-list">
          <article className="info-card result-card">
            <h3>สถิติราย DomainOfKnowledge</h3>
            <div className="domain-result-list">
              {submittedResult.domainStats.map((entry) => (
                <div key={entry.domain} className="domain-result-item">
                  <div className="domain-result-head">
                    <p>{entry.domain}</p>
                    <p>
                      {entry.correct}/{entry.total}
                    </p>
                  </div>
                  <div className="domain-result-bar">
                    <div className="domain-result-fill" style={{ width: `${entry.percent}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </article>

          {submittedResult.details.map((item) => (
            <article key={item.question.id} className="info-card result-card">
              <h3>
                ข้อ {item.index}: {item.question.question}
              </h3>
              {item.question.questionType === "text" ? (
                <>
                  <p>
                    <strong>คำตอบที่พิมพ์:</strong>{" "}
                    {item.selected ? (
                      <span style={{ whiteSpace: "pre-wrap" }}>{item.selected}</span>
                    ) : (
                      <em style={{ color: "var(--text-muted, #888)" }}>ไม่ได้ตอบ</em>
                    )}
                  </p>
                  <p className="result-pending">ข้อพิมพ์ตอบอิสระ — ไม่นับคะแนนอัตโนมัติ</p>
                  {item.question.explanation ? (
                    <p>
                      <strong>แนวคำตอบ:</strong> {item.question.explanation}
                    </p>
                  ) : null}
                </>
              ) : (
                <>
                  <p>
                    <strong>คำตอบที่เลือก:</strong> {item.selected ?? "ไม่ได้ตอบ"}
                  </p>
                  <p>
                    <strong>เฉลย:</strong> {item.question.answerKey}
                  </p>
                  <p className={item.isCorrect ? "result-correct" : "result-wrong"}>
                    {item.isCorrect ? "ถูก" : "ผิด"}
                  </p>
                  <p>
                    <strong>คำอธิบาย:</strong> {item.question.explanation}
                  </p>
                </>
              )}
            </article>
          ))}
        </div>
      </section>
    );
  }

  return (
    <section className="workspace-content">
      {showEndConfirm && (
        <ConfirmModal
          title="ต้องการสิ้นสุดการสอบ?"
          message="หากกดยืนยัน ระบบจะนับคะแนนเฉพาะข้อที่ทำเสร็จแล้ว และจะไม่สามารถกลับมาทำต่อได้"
          confirmLabel="สิ้นสุดการสอบ"
          cancelLabel="ยกเลิก"
          confirmDanger
          onConfirm={() => { setShowEndConfirm(false); submitExam(); }}
          onCancel={() => setShowEndConfirm(false)}
        />
      )}
      <header className="content-header editor-head">
        <div>
          <h1>เข้าสอบ: {draft.title}</h1>
          <p>
            ข้อ {currentIndex + 1} / {totalQuestions}
          </p>
        </div>
        <div className="exam-top-actions">
          <span className="timer-badge">เวลาคงเหลือ {formatTime(remainingSeconds)}</span>
        </div>
      </header>

      <article className="info-card question-card">
        <p>
          <strong>Domain:</strong> {currentQuestion.domain}
        </p>
        <h3>{currentQuestion.question}</h3>

        {currentQuestion.questionType === "text" ? (
          <div className="text-answer-wrap">
            <p style={{ fontSize: "0.85rem", color: "var(--text-muted, #888)", marginBottom: "0.5rem" }}>
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
            ย้อนกลับ
          </button>
          <button
            type="button"
            className="enter-button"
            onClick={() => setCurrentIndex((prev) => Math.min(totalQuestions - 1, prev + 1))}
            disabled={currentIndex === totalQuestions - 1}
          >
            ถัดไป
          </button>
          {currentIndex === totalQuestions - 1 ? (
            <button type="button" className="submit-exam-button" onClick={submitExam}>
              ส่งข้อสอบ
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
