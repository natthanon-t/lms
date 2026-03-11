import { useNavigate } from "react-router-dom";
import StatusSelect from "../components/StatusSelect";
import { STATUS_OPTIONS, isItemOwner, canViewItemByStatus } from "../services/accessControlService";
import { useAuth } from "../contexts/AuthContext";
import { useAppData } from "../contexts/AppDataContext";

export default function ExamPage() {
  const navigate = useNavigate();
  const { currentUserKey, canManageExams } = useAuth();
  const { examBank, openExam, openExamEditor, createExam, updateExamStatus } = useAppData();

  const hasManageAccess = canManageExams;
  const canCreate = canManageExams;

  const canManageExam = (exam) => hasManageAccess || isItemOwner(exam, currentUserKey);
  const visibleExams = examBank.filter((exam) =>
    canViewItemByStatus({ item: exam, currentUserKey, hasManageAccess }),
  );

  const handleEnterExam = async (exam) => {
    const result = await openExam(exam);
    if (result?.success) navigate(`/exam/${exam.id}`);
  };

  const handleOpenEditor = async (exam) => {
    await openExamEditor(exam);
    navigate(`/exam/${exam.id}/edit`);
  };

  const handleCreateExam = async () => {
    const nextExam = await createExam();
    if (nextExam?.id) navigate(`/exam/${nextExam.id}/edit`);
  };

  return (
    <section className="workspace-content">
      <header className="content-header">
        <h1>ข้อสอบ</h1>
        <p>เลือกข้อสอบเพื่อดูรายละเอียดก่อนเริ่มสอบ หรือกดปุ่มเฝืองเพื่อแก้ไข</p>
      </header>

      {canCreate ? (
        <div className="section-row">
          <p className="section-label">รายการข้อสอบ</p>
          <button type="button" className="create-content-button" onClick={handleCreateExam}>
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
                    onChange={(status) => updateExamStatus(exam.id, status)}
                  />
                  <button
                    type="button"
                    className="gear-button"
                    aria-label={`แก้ไข ${exam.title}`}
                    onClick={() => handleOpenEditor(exam)}
                  >
                    ⚙
                  </button>
                </div>
              ) : null}
            </div>
            <p>{exam.description}</p>
            <button type="button" className="enter-button" onClick={() => handleEnterExam(exam)}>
              ดูรายละเอียดข้อสอบ
            </button>
          </article>
        ))}
      </div>
    </section>
  );
}
