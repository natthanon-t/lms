import { useEffect, useRef, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { useAppData } from "../contexts/AppDataContext";

export default function ExamDetailPage() {
  const { examId } = useParams();
  const navigate = useNavigate();
  const { currentUserKey, canTakeExam } = useAuth();
  const { examDraft, currentExamAttempts, openExam, examBank, loadCurrentExamAttempts, loadExamCatalog } = useAppData();
  const [orderMode, setOrderMode] = useState("sequential");
  const [showHistory, setShowHistory] = useState(false);
  const [loading, setLoading] = useState(false);
  const fetchedRef = useRef(null);

  const isLoggedIn = Boolean(currentUserKey);
  const canStartExam = isLoggedIn && canTakeExam;

  useEffect(() => {
    void loadExamCatalog();
  }, [loadExamCatalog]);

  // Load exam metadata (once per examId)
  useEffect(() => {
    if (!examId || fetchedRef.current === examId) return;
    const alreadyLoaded = examDraft?.sourceId === examId || examDraft?.id === examId;
    if (!alreadyLoaded) {
      const fromBank = examBank.find((e) => e.id === examId);
      if (fromBank) {
        fetchedRef.current = examId;
        setLoading(true);
        openExam(fromBank).then(() => setLoading(false));
      }
    } else {
      fetchedRef.current = examId;
    }
  }, [examId, examDraft?.sourceId, examDraft?.id, examBank, openExam]);

  // Load attempts (separate effect, re-runs on login)
  useEffect(() => {
    if (examId && currentUserKey) {
      void loadCurrentExamAttempts(examId);
    }
  }, [examId, currentUserKey, loadCurrentExamAttempts]);

  const exam = examDraft;
  const userAttempts = currentExamAttempts;

  const maxAttempts = Number(exam?.maxAttempts ?? 0);
  const attemptCount = userAttempts.length;
  const hasReachedMax = maxAttempts > 0 && attemptCount >= maxAttempts;
  const remainingAttempts = maxAttempts > 0 ? maxAttempts - attemptCount : null;

  const handleStartExam = () => {
    navigate(`/exam/${examId}/take`, { state: { orderMode } });
  };

  if (loading || !exam?.title) {
    return (
      <section className="workspace-content exam-detail-page">
        <header className="content-header">
          <h1>กำลังโหลดข้อสอบ</h1>
          <p>Loading...</p>
        </header>
      </section>
    );
  }

  if (showHistory) {
    return (
      <section className="workspace-content">
        <header className="content-header editor-head">
          <div>
            <h1>ประวัติการทำข้อสอบ</h1>
            <p>{exam.title}</p>
          </div>
          <button type="button" className="back-button" onClick={() => setShowHistory(false)}>
            กลับรายละเอียด
          </button>
        </header>

        {userAttempts.length === 0 ? (
          <article className="info-card exam-history-empty-card">
            <p>ยังไม่มีประวัติการทำข้อสอบ</p>
          </article>
        ) : (
          <div className="result-list exam-history-list">
            {[...userAttempts].reverse().map((attempt, idx) => (
              <article key={attempt.attemptId ?? idx} className="info-card result-card exam-history-card">
                <div className="domain-result-head">
                  <h3>ครั้งที่ {userAttempts.length - idx}</h3>
                  <p>{new Date(attempt.date).toLocaleString("th-TH")}</p>
                </div>
                <p className="exam-history-score-row">
                  คะแนน: {attempt.correctCount}/{attempt.totalQuestions} ({attempt.scorePercent}%)
                  <button
                    type="button"
                    className="view-answers-btn"
                    style={{ marginLeft: 12 }}
                    onClick={() => {
                      const gradedDetails = (attempt.details ?? []).filter((d) => d.isCorrect !== null);
                      navigate(`/exam/${examId}/result`, {
                        state: {
                          result: {
                            attemptId: attempt.attemptId,
                            correctCount: attempt.correctCount,
                            totalQuestions: attempt.totalQuestions,
                            gradedTotal: gradedDetails.length || attempt.totalQuestions,
                            scorePercent: attempt.scorePercent,
                            details: attempt.details ?? [],
                            domainStats: attempt.domainStats ?? [],
                          },
                          examTitle: exam.title,
                        },
                      });
                    }}
                  >
                    ดูผลสอบ
                  </button>
                </p>

                {attempt.domainStats?.length > 0 && (
                  <div className="domain-result-list">
                    {attempt.domainStats.map((entry) => (
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
                )}

                {attempt.details?.length > 0 && (
                  <details className="exam-history-details">
                    <summary className="exam-history-summary">
                      ดูรายข้อ ({attempt.details.length} ข้อ)
                    </summary>
                    <div className="exam-history-details-body">
                      {attempt.details.map((item) => (
                        <div
                          key={item.question?.id ?? item.index}
                          className="exam-history-item"
                        >
                          <p>
                            <strong>ข้อ {item.index}:</strong> {item.question?.question}
                          </p>
                          <p>
                            <strong>คำตอบที่เลือก:</strong> {item.selected ?? "ไม่ได้ตอบ"}
                          </p>
                          <p>
                            <strong>เฉลย:</strong> {item.question?.answerKey}
                          </p>
                          <p className={item.isCorrect ? "result-correct" : "result-wrong"}>
                            {item.isCorrect ? "ถูก" : "ผิด"}
                          </p>
                        </div>
                      ))}
                    </div>
                  </details>
                )}
              </article>
            ))}
          </div>
        )}
      </section>
    );
  }

  return (
    <section className="workspace-content exam-detail-page">
      <header className="content-header editor-head">
        <div>
          <h1>รายละเอียดข้อสอบ</h1>
          <p>ตรวจสอบรายละเอียดก่อนเริ่มทำข้อสอบ</p>
        </div>
        <button type="button" className="back-button" onClick={() => navigate("/exam")}>
          กลับหน้าข้อสอบ
        </button>
      </header>

      <article className="info-card exam-detail-card">
        <div className="exam-detail-meta-grid">
          <p className="exam-meta-chip exam-meta-chip-title">
            <strong>ชื่อข้อสอบ:</strong> {exam.title}
          </p>
          <p className="exam-meta-chip">
            <strong>ผู้สร้าง:</strong> {exam.creator ?? "-"}
          </p>
          <p className="exam-meta-chip">
            <strong>จำนวนข้อ:</strong> {exam.numberOfQuestions ?? "-"}
          </p>
          <p className="exam-meta-chip">
            <strong>เวลา:</strong> {exam.defaultTime ?? "-"} นาที
          </p>
        </div>

        <p className="exam-detail-description">
          <strong>รายละเอียด:</strong> {exam.description}
        </p>
        <p className="exam-detail-instructions">
          <strong>คำแนะนำ:</strong> {exam.instructions ?? "-"}
        </p>
        <p className="exam-detail-attempt-note">
          <strong>จำนวนครั้งที่ทำได้:</strong>{" "}
          {maxAttempts === 0
            ? "ไม่จำกัด"
            : `${maxAttempts} ครั้ง (ทำแล้ว ${attemptCount} ครั้ง, เหลือ ${remainingAttempts} ครั้ง)`}
        </p>

        <div className="exam-order-box">
          <p>
            <strong>รูปแบบข้อสอบ:</strong>
          </p>
          <label>
            <input
              type="radio"
              name="order-mode"
              value="sequential"
              checked={orderMode === "sequential"}
              onChange={(event) => setOrderMode(event.target.value)}
            />
            เรียงตามลำดับ
          </label>
          <label>
            <input
              type="radio"
              name="order-mode"
              value="random"
              checked={orderMode === "random"}
              onChange={(event) => setOrderMode(event.target.value)}
            />
            สุ่มข้อสอบ
          </label>
        </div>

        <div className="profile-action-row">
          <button
            type="button"
            className="enter-button"
            onClick={canStartExam && !hasReachedMax ? handleStartExam : undefined}
            disabled={!canStartExam || hasReachedMax}
            title={!isLoggedIn ? "กรุณา Login ก่อนเริ่มสอบ" : !canTakeExam ? "คุณไม่มีสิทธิ์เข้าทำข้อสอบ" : hasReachedMax ? "ถึงจำนวนครั้งสูงสุดแล้ว" : ""}
          >
            {!isLoggedIn ? "กรุณา Login ก่อนเริ่มสอบ" : !canTakeExam ? "ไม่มีสิทธิ์เข้าทำข้อสอบ" : hasReachedMax ? "ถึงจำนวนครั้งสูงสุดแล้ว" : "เริ่มสอบ"}
          </button>
          {attemptCount > 0 && (
            <button type="button" className="manage-button" onClick={() => setShowHistory(true)}>
              ดูประวัติการทำข้อสอบ ({attemptCount} ครั้ง)
            </button>
          )}
        </div>
      </article>
    </section>
  );
}
