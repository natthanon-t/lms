import { useState } from "react";

const EXAM_STATUS_OPTIONS = ["inprogress", "active", "inactive"];
const toStatusLabel = (status) => {
  if (status === "inprogress") {
    return "inprogress";
  }
  if (status === "inactive") {
    return "inactive";
  }
  return "active";
};

export default function ExamPage({
  examBank,
  onOpenEditor,
  onEnterExam,
  onCreateExam,
  onUpdateExamStatus,
  currentUserKey = "",
  isAdmin = false,
}) {
  const [managingExamId, setManagingExamId] = useState("");
  const isOwner = (exam) =>
    Boolean(currentUserKey) && String(exam?.ownerUsername ?? "").trim() === currentUserKey;
  const canManageExam = (exam) => isAdmin || isOwner(exam);
  const canViewExam = (exam) =>
    isAdmin ||
    String(exam?.status ?? "active").toLowerCase() === "active" ||
    isOwner(exam);
  const visibleExams = examBank.filter(canViewExam);

  return (
    <section className="workspace-content">
      <header className="content-header">
        <h1>ข้อสอบ</h1>
        <p>เลือกข้อสอบเพื่อดูรายละเอียดก่อนเริ่มสอบ หรือกดปุ่มเฝืองเพื่อแก้ไข</p>
      </header>

      {currentUserKey ? (
        <div className="section-row">
          <p className="section-label">รายการข้อสอบ</p>
          <button type="button" className="create-content-button" onClick={onCreateExam}>
            + สร้างข้อสอบ
          </button>
        </div>
      ) : null}

      <div className="exam-grid">
        {visibleExams.map((exam) => (
          <article key={exam.id} className="exam-card">
            <img src={exam.image} alt={exam.title} className="card-image" />
            <div className="example-head">
              <h3>{exam.title}</h3>
              {canManageExam(exam) ? (
                <div className="example-action-box">
                  <span className={`content-status-badge ${exam.status ?? "active"}`}>
                    {toStatusLabel(exam.status)}
                  </span>
                  <button
                    type="button"
                    className="gear-button"
                    aria-label={`แก้ไข ${exam.title}`}
                    onClick={() =>
                      setManagingExamId((prevExamId) => (prevExamId === exam.id ? "" : exam.id))
                    }
                  >
                    ⚙
                  </button>
                </div>
              ) : null}
            </div>
            {canManageExam(exam) && managingExamId === exam.id ? (
              <div className="content-manage-menu">
                <button
                  type="button"
                  className="manage-button"
                  onClick={() => {
                    onOpenEditor(exam);
                    setManagingExamId("");
                  }}
                >
                  แก้ไขข้อสอบ
                </button>
                <label htmlFor={`exam-status-${exam.id}`}>สถานะ</label>
                <select
                  id={`exam-status-${exam.id}`}
                  value={exam.status ?? "active"}
                  onChange={(event) => onUpdateExamStatus?.(exam.id, event.target.value)}
                >
                  {EXAM_STATUS_OPTIONS.map((status) => (
                    <option key={`${exam.id}-${status}`} value={status}>
                      {status}
                    </option>
                  ))}
                </select>
              </div>
            ) : null}
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
