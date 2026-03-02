import { useState } from "react";

export default function ExamDetailPage({ exam, onBack, onStartExam, userAttempts = [], isLoggedIn = false }) {
  const [orderMode, setOrderMode] = useState("sequential");
  const [showHistory, setShowHistory] = useState(false);

  const maxAttempts = Number(exam.maxAttempts ?? 0);
  const attemptCount = userAttempts.length;
  const hasReachedMax = maxAttempts > 0 && attemptCount >= maxAttempts;
  const remainingAttempts = maxAttempts > 0 ? maxAttempts - attemptCount : null;

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
          <article className="info-card">
            <p>ยังไม่มีประวัติการทำข้อสอบ</p>
          </article>
        ) : (
          <div className="result-list">
            {[...userAttempts].reverse().map((attempt, idx) => (
              <article key={attempt.attemptId ?? idx} className="info-card result-card">
                <div className="domain-result-head">
                  <h3>ครั้งที่ {userAttempts.length - idx}</h3>
                  <p>{new Date(attempt.date).toLocaleString("th-TH")}</p>
                </div>
                <p>
                  คะแนน: {attempt.correctCount}/{attempt.totalQuestions} ({attempt.scorePercent}%)
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
                  <details>
                    <summary style={{ cursor: "pointer", marginTop: "0.75rem" }}>
                      ดูรายข้อ ({attempt.details.length} ข้อ)
                    </summary>
                    <div style={{ marginTop: "0.5rem" }}>
                      {attempt.details.map((item) => (
                        <div
                          key={item.question?.id ?? item.index}
                          style={{ borderTop: "1px solid var(--border)", paddingTop: "0.5rem", marginTop: "0.5rem" }}
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
    <section className="workspace-content">
      <header className="content-header editor-head">
        <div>
          <h1>รายละเอียดข้อสอบ</h1>
          <p>ตรวจสอบรายละเอียดก่อนเริ่มทำข้อสอบ</p>
        </div>
        <button type="button" className="back-button" onClick={onBack}>
          กลับหน้าข้อสอบ
        </button>
      </header>

      <article className="info-card">
        <p>
          <strong>ชื่อข้อสอบ:</strong> {exam.title}
        </p>
        <p>
          <strong>ผู้สร้าง:</strong> {exam.creator ?? "-"}
        </p>
        <p>
          <strong>รายละเอียด:</strong> {exam.description}
        </p>
        <p>
          <strong>จำนวนข้อ:</strong> {exam.numberOfQuestions ?? "-"}
        </p>
        <p>
          <strong>เวลา:</strong> {exam.defaultTime ?? "-"} นาที
        </p>
        <p>
          <strong>คำแนะนำ:</strong> {exam.instructions ?? "-"}
        </p>
        <p>
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
            onClick={() => onStartExam(orderMode)}
            disabled={!isLoggedIn || hasReachedMax}
          >
            {!isLoggedIn ? "กรุณา Login ก่อนเริ่มสอบ" : hasReachedMax ? "ถึงจำนวนครั้งสูงสุดแล้ว" : "เริ่มสอบ"}
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
