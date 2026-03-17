import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { fetchMyExamAttemptDetailsApi } from "../services/examApiService";

const toDomainAnchorId = (domain) => `domain-${(domain || "-").replace(/\s+/g, "-")}`;

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

  const domainGroups = useMemo(() => {
    const map = new Map();
    details.forEach((item) => {
      const domain = item.question.domain || "-";
      if (!map.has(domain)) map.set(domain, []);
      map.get(domain).push(item);
    });
    return Array.from(map.entries()).map(([domain, items]) => ({ domain, items }));
  }, [details]);

  // Compute domainStats from details when result.domainStats is empty
  const domainStats = useMemo(() => {
    if (result?.domainStats?.length > 0) return result.domainStats;
    if (details.length === 0) return [];
    const map = {};
    details.forEach((item) => {
      if (item.isCorrect === null) return; // skip ungraded
      const domain = item.question.domain || "-";
      if (!map[domain]) map[domain] = { domain, correct: 0, total: 0 };
      map[domain].total += 1;
      if (item.isCorrect) map[domain].correct += 1;
    });
    return Object.values(map)
      .map((e) => ({ ...e, percent: e.total > 0 ? Math.round((e.correct / e.total) * 100) : 0 }))
      .sort((a, b) => a.domain.localeCompare(b.domain));
  }, [result?.domainStats, details]);

  // Compute gradedTotal from details when not provided
  const gradedTotal = useMemo(() => {
    if (result?.gradedTotal > 0) return result.gradedTotal;
    if (details.length === 0) return result?.totalQuestions ?? 0;
    return details.filter((d) => d.isCorrect !== null).length;
  }, [result?.gradedTotal, result?.totalQuestions, details]);

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
            {result.correctCount} <span>/ {gradedTotal} ข้อ</span>
          </p>
          {gradedTotal < result.totalQuestions && (
            <p className="result-score-note">
              รวม {result.totalQuestions} ข้อ · {result.totalQuestions - gradedTotal} ข้อพิมพ์ตอบ (ไม่นับคะแนนอัตโนมัติ)
            </p>
          )}
          <p className="result-score-status" style={{ color: scoreColor }}>
            {scoreNum >= 90 ? "ยอดเยี่ยม" : scoreNum >= 70 ? "ผ่านเกณฑ์" : "ต้องพัฒนาเพิ่ม"}
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
              {domainStats.map((entry) => (
                <div
                  key={entry.domain}
                  className="domain-result-item domain-result-item-clickable"
                  onClick={() => {
                    const el = document.getElementById(toDomainAnchorId(entry.domain));
                    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
                  }}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      const el = document.getElementById(toDomainAnchorId(entry.domain));
                      if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
                    }
                  }}
                >
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
            domainGroups.map(({ domain, items }) => (
              <div key={domain}>
                <div className="result-domain-separator" id={toDomainAnchorId(domain)}>
                  <span className="result-domain-separator-line" />
                  <span className="result-domain-separator-label">{domain}</span>
                  <span className="result-domain-separator-line" />
                </div>
                {items.map((item) => {
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
                    <span className="result-q-domain-badge">{item.question.domain || "-"}</span>
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
            })}
              </div>
            ))
          )}
        </div>
      </div>
    </section>
  );
}
