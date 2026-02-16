import { useCallback, useEffect, useMemo, useState } from "react";

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

export default function ExamTakingPage({ draft, onEndExam, orderMode, durationSeconds }) {
  const orderedQuestions = useMemo(() => {
    const base = Array.isArray(draft.questions) ? draft.questions : [];
    return orderMode === "random" ? shuffleArray(base) : base;
  }, [draft.sourceId, draft.questions, orderMode]);

  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState({});
  const [remainingSeconds, setRemainingSeconds] = useState(durationSeconds);
  const [submittedResult, setSubmittedResult] = useState(null);

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
      const isCorrect = normalizeText(selected) === normalizeText(question.answerKey);

      return {
        index: index + 1,
        question,
        selected,
        isCorrect,
      };
    });

    const correctCount = details.filter((item) => item.isCorrect).length;
    const scorePercent = totalQuestions > 0 ? Math.round((correctCount / totalQuestions) * 100) : 0;

    setSubmittedResult({
      correctCount,
      totalQuestions,
      scorePercent,
      details,
    });
  }, [answers, orderedQuestions, totalQuestions]);

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
    const confirmed = window.confirm("ต้องการสิ้นสุดการสอบและออกจากหน้าใช่หรือไม่?");
    if (!confirmed) {
      return;
    }
    submitExam();
  };

  if (submittedResult) {
    return (
      <section className="workspace-content">
        <header className="content-header editor-head">
          <div>
            <h1>ผลการสอบ: {draft.title}</h1>
            <p>
              คะแนน {submittedResult.correctCount}/{submittedResult.totalQuestions} ({submittedResult.scorePercent}
              %)
            </p>
          </div>
          <button type="button" className="back-button" onClick={onEndExam}>
            กลับหน้าข้อสอบ
          </button>
        </header>

        <div className="result-list">
          {submittedResult.details.map((item) => (
            <article key={item.question.id} className="info-card result-card">
              <h3>
                ข้อ {item.index}: {item.question.question}
              </h3>
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
            </article>
          ))}
        </div>
      </section>
    );
  }

  return (
    <section className="workspace-content">
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
