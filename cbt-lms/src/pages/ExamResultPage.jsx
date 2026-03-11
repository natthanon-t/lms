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

  return (
    <section className="workspace-content">
      <header className="content-header editor-head">
        <div>
          <h1>ผลการสอบ: {examTitle}</h1>
          <p>
            คะแนน {result.correctCount}/{result.gradedTotal} ({result.scorePercent}%)
            {result.gradedTotal < result.totalQuestions ? (
              <span style={{ fontSize: "0.85rem", color: "var(--text-muted, #888)", marginLeft: "0.5rem" }}>
                (รวม {result.totalQuestions} ข้อ, {result.totalQuestions - result.gradedTotal} ข้อพิมพ์ตอบ)
              </span>
            ) : null}
          </p>
        </div>
        <button type="button" className="back-button" onClick={() => navigate(`/exam/${examId}`)}>
          กลับหน้าข้อสอบ
        </button>
      </header>

      <div className="result-list">
        <article className="info-card result-card">
          <h3>สถิติราย DomainOfKnowledge</h3>
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

        {loadingDetails ? (
          <article className="info-card result-card">
            <p style={{ color: "var(--text-muted, #888)", textAlign: "center" }}>กำลังโหลดเฉลย…</p>
          </article>
        ) : (
          details.map((item) => (
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
                    <strong>เฉลย:</strong>{" "}
                    {item.question.answerKey || (
                      <em style={{ color: "var(--text-muted, #888)" }}>ไม่มีเฉลย</em>
                    )}
                  </p>
                  <p className={item.isCorrect ? "result-correct" : "result-wrong"}>
                    {item.isCorrect ? "ถูก" : "ผิด"}
                  </p>
                  {item.question.explanation ? (
                    <p>
                      <strong>คำอธิบาย:</strong> {item.question.explanation}
                    </p>
                  ) : null}
                </>
              )}
            </article>
          ))
        )}
      </div>
    </section>
  );
}
