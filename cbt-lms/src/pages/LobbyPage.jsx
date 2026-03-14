import { useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { canViewItemByStatus } from "../services/accessControlService";
import { useAuth } from "../contexts/AuthContext";
import { useAppData } from "../contexts/AppDataContext";
import { getSubtopicPages } from "../components/markdown/headingUtils";

const QUOTES = [
  "LMS status: 'In Progress.' My brain: 'In Bed.'",
  "99% Loading... (My motivation, not the website).",
  "If 'Procrastination' was a course, I would be the Top Student.",
  "LMS stands for: Let Me Sleep.",
  "My favorite activity? Looking at the due date and closing the tab.",
  "I'm not ignoring the lesson, I'm just giving it some space.",
  "The 'Due Date' is the only thing moving fast around here.",
  "I'll start the module in 5 minutes... (Sent 3 hours ago).",
  "My progress bar is shorter than my attention span.",
  "I’m a professional 'Next' button clicker.",
  "The most dangerous game: Clicking 'Submit' when the WiFi is low.",
  "Nothing brings people together like a video with no 'Skip' button.",
  "Instruction: 'Please watch the full video.' Me: Plays at 2.0x speed.",
  "That mini-heart attack when the loading circle stops spinning.",
  "My nightmare: A 30-minute video that doesn't let me fast-forward.",
  "User: Clicks Submit | LMS: 'Error 404' | Me: Cries.",
  "I don’t need an alarm. The LMS notification is enough to scare me.",
  "My laptop is currently hotter than my future.",
  "The 'Logout' button is the most user-friendly feature here.",
  "Is it a 'Learning Path' or a 'Highway to Stress'?",
];

export default function LobbyPage() {
  const navigate = useNavigate();
  const { currentUserKey, canManageContent, canViewAllContent, canManageExams, canViewAllExams, currentUser } = useAuth();
  const { examples, examBank, loadExamples, loadExamCatalog, openContentDetail, openExam, canManageExamItem, userSkillScores, learningProgress } = useAppData();

  useEffect(() => {
    void loadExamples();
    void loadExamCatalog();
  }, [loadExamples, loadExamCatalog]);

  const dailyQuote = QUOTES[Math.floor(Math.random() * QUOTES.length)];

  const inProgressCourses = useMemo(() => {
    const userProgress = learningProgress[currentUserKey] ?? {};
    return examples
      .filter(e =>
        canViewItemByStatus({ item: e, currentUserKey, hasManageAccess: canManageContent, hasViewAllAccess: canViewAllContent })
        && userProgress[e.id]
      )
      .map(e => {
        const completedSubtopics = userProgress[e.id]?.completedSubtopics ?? {};
        const allSubtopics = getSubtopicPages(e.content ?? '', e.title);
        const total = allSubtopics.length;
        const done = allSubtopics.filter(s => Boolean(completedSubtopics[s.id])).length;
        const percent = total > 0 ? Math.round((done / total) * 100) : 0;
        return { ...e, percent, done, total };
      })
      .filter(e => e.total > 0 && e.done < e.total)
      .sort((a, b) => b.percent - a.percent)
      .slice(0, 4);
  }, [examples, learningProgress, currentUserKey, canManageContent]);

  const recommendedCourses = useMemo(() => {
    const userProgress = learningProgress[currentUserKey] ?? {};
    const mySkills = userSkillScores ?? {};
    return examples
      .filter(e =>
        canViewItemByStatus({ item: e, currentUserKey, hasManageAccess: canManageContent, hasViewAllAccess: canViewAllContent })
        && !userProgress[e.id]
      )
      .map(e => {
        const skills = e.skills ?? [];
        const relevance = skills.reduce((sum, skill) => {
          const score = mySkills[skill] ?? 0;
          return sum + (score < 40 ? 2 : score < 70 ? 1 : 0);
        }, 0);
        return { ...e, relevance };
      })
      .sort((a, b) =>
        b.relevance !== a.relevance
          ? b.relevance - a.relevance
          : (b.learnerCount ?? 0) - (a.learnerCount ?? 0)
      )
      .slice(0, 4);
  }, [examples, learningProgress, currentUserKey, canManageContent, userSkillScores]);

  const limitedExams = useMemo(() => {
    return examBank
      .filter((exam) => canViewItemByStatus({ item: exam, currentUserKey, hasManageAccess: canManageExams, hasViewAllAccess: canViewAllExams }))
      .sort((a, b) => (b.attemptCount ?? 0) - (a.attemptCount ?? 0))
      .slice(0, 4);
  }, [examBank, currentUserKey, canManageExams, canViewAllExams]);

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
          <h1>สวัสดี, {currentUser?.name || 'Guest'} 👋</h1>
          <p>{dailyQuote}</p>
        </div>
      </div>

      {/* Learning Progress */}
      <div className="section-row lobby-section-row">
        <p className="section-label">กำลังเรียนอยู่</p>
      </div>
      {inProgressCourses.length > 0 ? (
        <div className="lobby-progress-list">
          {inProgressCourses.map(course => (
            <div key={course.id} className="lobby-progress-item" onClick={() => handleEnterClass(course)}>
              <img src={course.image} alt={course.title} className="lobby-progress-thumb" />
              <div className="lobby-progress-info">
                <h4 className="lobby-progress-title">{course.title}</h4>
                <div className="lobby-progress-track">
                  <div className="lobby-progress-fill" style={{ width: `${course.percent}%` }} />
                </div>
                <span className="lobby-progress-pct">{course.percent}% &mdash; {course.done}/{course.total} หัวข้อ</span>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="lobby-empty-hint">ยังไม่มีบทเรียนที่กำลังเรียนอยู่ — เลือกบทเรียนจากด้านล่างได้เลย!</p>
      )}

      {/* Recommended for You */}
      <div className="section-row lobby-section-row">
        <p className="section-label">แนะนำสำหรับคุณ</p>
        <a href="#" className="lobby-view-all" onClick={(e) => { e.preventDefault(); navigate('/content'); }}>ดูทั้งหมด →</a>
      </div>
      {recommendedCourses.length > 0 ? (
        <div className="example-grid">
          {recommendedCourses.map((example) => (
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
      ) : (
        <p className="lobby-empty-hint">ยังไม่มีคอร์สที่แนะนำ — คลิกดูทั้งหมดเพื่อสำรวจคอร์สอื่น ๆ</p>
      )}

      {/* Section with "view all" link */}
      <div className="section-row lobby-section-row">
        <p className="section-label">ข้อสอบแนะนำ</p>
        <a href="#" className="lobby-view-all" onClick={(e) => { e.preventDefault(); navigate('/exam'); }}>ดูทั้งหมด →</a>
      </div>
      {limitedExams.length > 0 ? (
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
      ) : (
        <p className="lobby-empty-hint">ยังไม่มีข้อสอบที่แนะนำ — คลิกดูทั้งหมดเพื่อสำรวจข้อสอบอื่น ๆ</p>
      )}
    </section>
  );
}
