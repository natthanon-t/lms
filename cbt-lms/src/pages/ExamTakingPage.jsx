import { useState } from "react";
import MarkdownContent from "../components/markdown/MarkdownContent";

export default function ExamTakingPage({ draft, onBack }) {
  const [answers, setAnswers] = useState("");

  return (
    <section className="workspace-content">
      <header className="content-header editor-head">
        <div>
          <h1>เข้าสอบ: {draft.title}</h1>
          <p>อ่านโจทย์และตอบคำถามในช่องคำตอบด้านล่าง</p>
        </div>
        <button type="button" className="back-button" onClick={onBack}>
          กลับหน้าข้อสอบ
        </button>
      </header>

      <div className="preview-panel study-panel">
        <div className="preview-body">
          <MarkdownContent content={draft.content} />
        </div>
      </div>

      <div className="answer-box">
        <label htmlFor="exam-answer">คำตอบของผู้เรียน</label>
        <textarea
          id="exam-answer"
          rows={8}
          value={answers}
          onChange={(event) => setAnswers(event.target.value)}
          placeholder="พิมพ์คำตอบของคุณที่นี่"
        />
      </div>
    </section>
  );
}
