import { useState } from "react";

export default function ExamDetailPage({ exam, onBack, onStartExam }) {
  const [orderMode, setOrderMode] = useState("sequential");

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

        <button type="button" className="enter-button" onClick={() => onStartExam(orderMode)}>
          เริ่มสอบ
        </button>
      </article>
    </section>
  );
}
