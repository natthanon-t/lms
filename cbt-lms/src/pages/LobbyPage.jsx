import { useState } from "react";
import { isItemOwner, canViewItemByStatus } from "../services/accessControlService";

export default function LobbyPage({
  examples,
  examBank,
  onOpenExamEditor,
  onEnterClass,
  onEnterExam,
  currentUserKey = "",
  canManageContent = false,
  canManageExams = false,
}) {
  const [searchTerm, setSearchTerm] = useState("");
  const canManageExam = (exam) => canManageExams || isItemOwner(exam, currentUserKey);

  const keyword = searchTerm.trim().toLowerCase();
  const baseExamples = examples.filter((example) =>
    canViewItemByStatus({ item: example, currentUserKey, hasManageAccess: canManageContent }),
  );
  const baseExams = examBank.filter((exam) =>
    canViewItemByStatus({ item: exam, currentUserKey, hasManageAccess: canManageExams }),
  );
  const filteredExamples = baseExamples
    .filter((example) => (keyword ? example.title.toLowerCase().includes(keyword) : true))
    .sort((a, b) => (b.learnerCount ?? 0) - (a.learnerCount ?? 0));
  const filteredExams = baseExams
    .filter((exam) => (keyword ? exam.title.toLowerCase().includes(keyword) : true))
    .sort((a, b) => (b.attemptCount ?? 0) - (a.attemptCount ?? 0));
  const limitedExamples = filteredExamples.slice(0, 4);
  const limitedExams = filteredExams.slice(0, 4);

  return (
    <section className="workspace-content">
      <header className="content-header">
        <h1>Lobby - บทเรียน</h1>
        <p>หน้าหลักแสดงบทเรียนและข้อสอบแยกส่วนในหน้าเดียว</p>
      </header>

      <div className="search-box">
        <label htmlFor="example-search">หาตัวอย่าง</label>
        <input
          id="example-search"
          type="text"
          placeholder="พิมพ์ชื่อหัวข้อ"
          value={searchTerm}
          onChange={(event) => setSearchTerm(event.target.value)}
        />
      </div>

      <p className="section-label">ตัวอย่างเนื้อหา</p>
      <div className="example-grid">
        {limitedExamples.map((example) => (
          <article key={example.id} className="example-card">
            <img src={example.image} alt={example.title} className="card-image" />
            <div className="example-head">
              <h3 className="example-title">{example.title}</h3>
            </div>
            {example.skills?.length ? (
              <div className="skill-tags">
                {example.skills.map((skill) => (
                  <span key={`${example.id}-${skill}`} className="skill-tag">
                    {skill}
                  </span>
                ))}
              </div>
            ) : null}
            <button type="button" className="enter-button" onClick={() => onEnterClass(example)}>
              ดูรายละเอียด
            </button>
          </article>
        ))}
      </div>

      <p className="section-label">ตัวอย่างข้อสอบ</p>
      <div className="exam-grid">
        {limitedExams.map((exam) => (
          <article key={exam.id} className="exam-card">
            <img src={exam.image} alt={exam.title} className="card-image" />
            <div className="example-head">
              <h3>{exam.title}</h3>
              {canManageExam(exam) ? (
                <button
                  type="button"
                  className="gear-button"
                  aria-label={`แก้ไข ${exam.title}`}
                  onClick={() => onOpenExamEditor(exam)}
                >
                  ⚙
                </button>
              ) : null}
            </div>
            <p>{exam.description}</p>
            <button type="button" className="enter-button" onClick={() => onEnterExam(exam)}>
              ดูรายละเอียดข้อสอบ
            </button>
          </article>
        ))}
      </div>
    </section>
  );
}
