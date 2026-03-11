import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { canViewItemByStatus } from "../services/accessControlService";
import { useAuth } from "../contexts/AuthContext";
import { useAppData } from "../contexts/AppDataContext";

export default function LobbyPage() {
  const navigate = useNavigate();
  const { currentUserKey, canManageContent, canManageExams } = useAuth();
  const { examples, examBank, openContentDetail, openExam, canManageExamItem } = useAppData();

  const limitedExamples = useMemo(() => {
    return examples
      .filter((example) => canViewItemByStatus({ item: example, currentUserKey, hasManageAccess: canManageContent }))
      .sort((a, b) => (b.learnerCount ?? 0) - (a.learnerCount ?? 0))
      .slice(0, 4);
  }, [examples, currentUserKey, canManageContent]);

  const limitedExams = useMemo(() => {
    return examBank
      .filter((exam) => canViewItemByStatus({ item: exam, currentUserKey, hasManageAccess: canManageExams }))
      .sort((a, b) => (b.attemptCount ?? 0) - (a.attemptCount ?? 0))
      .slice(0, 4);
  }, [examBank, currentUserKey, canManageExams]);

  const handleEnterClass = (example) => {
    const result = openContentDetail(example);
    if (result?.blocked) return;
    navigate(`/content/${example.id}`);
  };

  const handleEnterExam = async (exam) => {
    const result = await openExam(exam);
    if (result?.success) navigate(`/exam/${exam.id}`);
  };

  const handleOpenExamEditor = async (exam) => {
    navigate(`/exam/${exam.id}/edit`);
  };

  return (
    <section className="workspace-content">
      <header className="content-header">
        <h1>Lobby - บทเรียน</h1>
        <p>หน้าหลักแสดงบทเรียนและข้อสอบแยกส่วนในหน้าเดียว</p>
      </header>

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
            <button type="button" className="enter-button" onClick={() => handleEnterClass(example)}>
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
              {canManageExamItem(exam) ? (
                <button
                  type="button"
                  className="gear-button"
                  aria-label={`แก้ไข ${exam.title}`}
                  onClick={() => handleOpenExamEditor(exam)}
                >
                  ⚙
                </button>
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
