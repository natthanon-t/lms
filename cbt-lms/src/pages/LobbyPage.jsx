import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { canViewItemByStatus } from "../services/accessControlService";
import { useAuth } from "../contexts/AuthContext";
import { useAppData } from "../contexts/AppDataContext";

export default function LobbyPage() {
  const navigate = useNavigate();
  const { currentUserKey, canManageContent, canManageExams, currentUser } = useAuth();
  const { examples, examBank, openContentDetail, openExam, canManageExamItem, userTotalScore, userSkillScores, learningProgress } = useAppData();

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

  const stats = useMemo(() => {
    const totalCourses = examples.filter(e => canViewItemByStatus({ item: e, currentUserKey, hasManageAccess: canManageContent })).length;
    const totalExams = examBank.filter(e => canViewItemByStatus({ item: e, currentUserKey, hasManageAccess: canManageExams })).length;
    const myScore = userTotalScore ?? 0;
    const skillCount = Object.keys(userSkillScores ?? {}).length;
    const coursesStarted = Object.keys(learningProgress[currentUserKey] ?? {}).length;
    return { totalCourses, totalExams, myScore, skillCount, coursesStarted };
  }, [examples, examBank, userTotalScore, userSkillScores, learningProgress, currentUserKey, canManageContent, canManageExams]);

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
      {/* Personalized greeting header */}
      <div className="lobby-hero">
        <div className="lobby-hero-text">
          <h1>สวัสดี, {currentUser?.name || currentUserKey} 👋</h1>
          <p>ยินดีต้อนรับกลับ — วันนี้อยากเรียนอะไร?</p>
        </div>
      </div>

      {/* Stats Dashboard */}
      <div className="metric-grid lobby-metric-grid">
        <article className="metric-card">
          <h3>คอร์สทั้งหมด</h3>
          <p>{stats.totalCourses}</p>
        </article>
        <article className="metric-card">
          <h3>ข้อสอบทั้งหมด</h3>
          <p>{stats.totalExams}</p>
        </article>
        <article className="metric-card">
          <h3>คะแนนของฉัน</h3>
          <p>{stats.myScore}</p>
        </article>
        <article className="metric-card">
          <h3>ทักษะที่มี</h3>
          <p>{stats.skillCount}</p>
        </article>
        <article className="metric-card">
          <h3>คอร์สที่เข้าเรียน</h3>
          <p>{stats.coursesStarted}</p>
        </article>
      </div>

      {/* Section with "view all" link */}
      <div className="section-row lobby-section-row">
        <p className="section-label">บทเรียนแนะนำ</p>
        <a href="#" className="lobby-view-all" onClick={(e) => { e.preventDefault(); navigate('/content'); }}>ดูทั้งหมด →</a>
      </div>
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

      {/* Section with "view all" link */}
      <div className="section-row lobby-section-row">
        <p className="section-label">ข้อสอบแนะนำ</p>
        <a href="#" className="lobby-view-all" onClick={(e) => { e.preventDefault(); navigate('/exam'); }}>ดูทั้งหมด →</a>
      </div>
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
