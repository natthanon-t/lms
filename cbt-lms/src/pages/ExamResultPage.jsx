import { useEffect, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { fetchMyExamAttemptDetailsApi } from "../services/examApiService";

const normalizeBackendDetails = (rawDetails) =>
  rawDetails.map((item, idx) => ({
    index: idx + 1,
    question: {
      id: item.questionId,
      question: item.question,
      domain: item.domain,
      questionType: item.questionType ?? "multiple_choice",
      choices: Array.isArray(item.choices) ? item.choices : [],
      answerKey: item.answerKey ?? "",
      explanation: item.explanation ?? "",
    },
    selected: item.selected || null,
    isCorrect: item.isCorrect ?? null,
  }));

export default function ExamResultPage() {
  const { examId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const result = location.state?.result;
  const examTitle = location.state?.examTitle ?? "ข้อสอบ";

  const attemptId = result?.attemptId ?? null;
  const [details, setDetails] = useState(result?.details ?? []);
  const [loadingDetails, setLoadingDetails] = useState(Boolean(attemptId));

  useEffect(() => {
    if (!attemptId) return;
    let mounted = true;
    setLoadingDetails(true);
    fetchMyExamAttemptDetailsApi(attemptId)
      .then((rawDetails) => {
        if (mounted && rawDetails.length > 0) {
          setDetails(normalizeBackendDetails(rawDetails));
        }
      })
      .catch(() => {
        // keep navigation-state details as fallback
      })
      .finally(() => {
        if (mounted) setLoadingDetails(false);
      });
    return () => {
      mounted = false;
    };
  }, [attemptId]);

  if (!result) {
    return (
      <section className="workspace-content">
        <header className="content-header">
          <h1>ไม่พบผลการสอบ</h1>
          <p>กรุณากลับไปทำข้อสอบใหม่</p>
        </header>
        <button type="button" className="back-button" onClick={() => navigate(`/exam/${examId}`)}>
          กลับหน้าข้อสอบ
        </button>
      </section>
    );
  }

  const scoreNum = parseFloat(result.scorePercent);
  const scoreColor = scoreNum >= 80 ? "#1f8d4e" : scoreNum >= 60 ? "#d97706" : "#b13a3a";

  return (
    <section className="workspace-content">
      <header className="content-header editor-head">
        <div>
          <h1>ผลการสอบ: {examTitle}</h1>
        </div>
        <button type="button" className="back-button" onClick={() => navigate(`/exam/${examId}`)}>
          กลับหน้าข้อสอบ
        </button>
      </header>

      {/* Score banner */}
      <div className="result-score-banner">
        <div className="result-score-ring" style={{ "--score-color": scoreColor }}>
          <span className="result-score-pct">{result.scorePercent}%</span>
          <span className="result-score-label">คะแนน</span>
        </div>
        <div className="result-score-info">
          <p className="result-score-fraction">
            {result.correctCount} <span>/ {result.gradedTotal} ข้อ</span>
          </p>
          {result.gradedTotal < result.totalQuestions && (
            <p className="result-score-note">
              รวม {result.totalQuestions} ข้อ · {result.totalQuestions - result.gradedTotal} ข้อพิมพ์ตอบ (ไม่นับคะแนนอัตโนมัติ)
            </p>
          )}
          <p className="result-score-status" style={{ color: scoreColor }}>
            {scoreNum >= 80 ? "ยอดเยี่ยม" : scoreNum >= 60 ? "ผ่านเกณฑ์" : "ต้องพัฒนาเพิ่ม"}
          </p>
        </div>
      </div>

      {/* Two-column split */}
      <div className="result-split">
        {/* Left: domain stats (sticky) */}
        <aside className="result-domain-col">
          <article className="info-card result-card">
            <h3>สถิติราย Domain</h3>
            <div className="domain-result-list">
              {result.domainStats.map((entry) => (
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
        </aside>

        {/* Right: question details */}
        <div className="result-questions-col">
          {loadingDetails ? (
            <article className="info-card result-card">
              <p style={{ color: "var(--text-muted, #888)", textAlign: "center" }}>กำลังโหลดเฉลย…</p>
            </article>
          ) : (
            details.map((item) => {
              const cardClass =
                item.question.questionType === "text"
                  ? "result-card-pending"
                  : item.isCorrect
                  ? "result-card-correct"
                  : "result-card-wrong";
              return (
                <article key={item.question.id} className={`info-card result-card ${cardClass}`}>
                  <div className="result-q-head">
                    <span className="result-q-num">ข้อ {item.index}</span>
                    {item.question.questionType !== "text" && (
                      <span className={item.isCorrect ? "result-badge-correct" : "result-badge-wrong"}>
                        {item.isCorrect ? "ถูก" : "ผิด"}
                      </span>
                    )}
                    {item.question.questionType === "text" && (
                      <span className="result-badge-pending">พิมพ์ตอบ</span>
                    )}
                  </div>
                  <h3 className="result-q-text">{item.question.question}</h3>

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
                      <div className="result-answer-row">
                        <div className="result-answer-box result-answer-selected">
                          <span className="result-answer-box-label">คำตอบที่เลือก</span>
                          <span>{item.selected ?? <em style={{ color: "#888" }}>ไม่ได้ตอบ</em>}</span>
                        </div>
                        <div className="result-answer-box result-answer-key">
                          <span className="result-answer-box-label">เฉลย</span>
                          <span>
                            {item.question.answerKey || (
                              <em style={{ color: "#888" }}>ไม่มีเฉลย</em>
                            )}
                          </span>
                        </div>
                      </div>
                      {item.question.explanation ? (
                        <p className="result-explain">
                          <strong>คำอธิบาย:</strong> {item.question.explanation}
                        </p>
                      ) : null}
                    </>
                  )}
                </article>
              );
            })
          )}
        </div>
      </div>
    </section>
  );
}
