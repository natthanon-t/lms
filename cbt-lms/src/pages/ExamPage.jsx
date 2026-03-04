import StatusSelect from "../components/StatusSelect";
import { STATUS_OPTIONS, isItemOwner, canViewItemByStatus } from "../services/accessControlService";

export default function ExamPage({
  examBank,
  onOpenEditor,
  onEnterExam,
  onCreateExam,
  onUpdateExamStatus,
  currentUserKey = "",
  isAdmin = false,
  canCreate = false,
}) {
  const canManageExam = (exam) => isAdmin || isItemOwner(exam, currentUserKey);
  const visibleExams = examBank.filter((exam) =>
    canViewItemByStatus({ item: exam, currentUserKey, isAdmin }),
  );

  return (
    <section className="workspace-content">
      <header className="content-header">
        <h1>ข้อสอบ</h1>
        <p>เลือกข้อสอบเพื่อดูรายละเอียดก่อนเริ่มสอบ หรือกดปุ่มเฝืองเพื่อแก้ไข</p>
      </header>

      {canCreate ? (
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
                  <StatusSelect
                    value={exam.status ?? "active"}
                    options={STATUS_OPTIONS}
                    onChange={(status) => onUpdateExamStatus?.(exam.id, status)}
                  />
                  <button
                    type="button"
                    className="gear-button"
                    aria-label={`แก้ไข ${exam.title}`}
                    onClick={() => onOpenEditor(exam)}
                  >
                    ⚙
                  </button>
                </div>
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
