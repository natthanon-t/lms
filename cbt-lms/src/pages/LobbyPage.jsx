import { useState } from "react";

const CONTENT_STATUS_OPTIONS = ["inprogress", "active", "inactive"];
const isActiveItem = (item) => String(item?.status ?? "active").toLowerCase() === "active";

const toStatusLabel = (status) => {
  if (status === "inprogress") {
    return "inprogress";
  }
  if (status === "inactive") {
    return "inactive";
  }
  return "active";
};

export default function LobbyPage({
  examples,
  examBank,
  onOpenEditor,
  onOpenExamEditor,
  onEnterClass,
  onEnterExam,
  onUpdateContentStatus,
  canManage = false,
}) {
  const [searchTerm, setSearchTerm] = useState("");
  const [managingContentId, setManagingContentId] = useState("");

  const keyword = searchTerm.trim().toLowerCase();
  const filteredExamples = examples.filter(
    (example) => isActiveItem(example) && (keyword ? example.title.toLowerCase().includes(keyword) : true),
  );
  const filteredExams = examBank.filter(
    (exam) => isActiveItem(exam) && (keyword ? exam.title.toLowerCase().includes(keyword) : true),
  );
  const limitedExamples = filteredExamples.slice(0, 3);
  const limitedExams = filteredExams.slice(0, 3);

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
              <div className="example-action-box">
                <span className={`content-status-badge ${example.status ?? "active"}`}>
                  {toStatusLabel(example.status)}
                </span>
                {canManage ? (
                  <button
                    type="button"
                    className="gear-button"
                    aria-label={`จัดการ ${example.title}`}
                    onClick={() =>
                      setManagingContentId((prevId) => (prevId === example.id ? "" : example.id))
                    }
                  >
                    ⚙
                  </button>
                ) : null}
              </div>
            </div>
            {canManage && managingContentId === example.id ? (
              <div className="content-manage-menu">
                <button
                  type="button"
                  className="manage-button"
                  onClick={() => {
                    onOpenEditor(example);
                    setManagingContentId("");
                  }}
                >
                  แก้ไขเนื้อหา
                </button>
                <label htmlFor={`status-${example.id}`}>สถานะ</label>
                <select
                  id={`status-${example.id}`}
                  value={example.status ?? "active"}
                  onChange={(event) => onUpdateContentStatus?.(example.id, event.target.value)}
                >
                  {CONTENT_STATUS_OPTIONS.map((status) => (
                    <option key={`${example.id}-${status}`} value={status}>
                      {status}
                    </option>
                  ))}
                </select>
              </div>
            ) : null}
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
              {canManage ? (
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
