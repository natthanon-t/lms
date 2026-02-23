import { useEffect, useMemo, useState } from "react";
import { getSubtopicPages } from "../components/markdown/headingUtils";
import { getCourseSkillRewards } from "../services/skillRewardsService";

const RADAR_SIZE = 520;
const RADAR_CENTER = RADAR_SIZE / 2;
const RADAR_RADIUS = 165;
const RADAR_LEVELS = [0.2, 0.4, 0.6, 0.8, 1];

const toRadarLabel = (value) => {
  const text = String(value ?? "").trim();
  if (text.length <= 18) {
    return text;
  }
  return `${text.slice(0, 16)}...`;
};

export default function ProfilePage({
  currentUser,
  username,
  onSaveName,
  onChangePassword,
  examples,
  learningStats,
  currentUserProgress,
}) {
  const [name, setName] = useState(currentUser.name);
  const [message, setMessage] = useState("");
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: "",
    nextPassword: "",
    confirmPassword: "",
  });
  const [passwordMessage, setPasswordMessage] = useState("");
  const userSkillScores = learningStats?.[username]?.skillScores ?? {};
  const safeExamples = Array.isArray(examples) ? examples : [];

  const completedCourseIds = useMemo(() => {
    const result = new Set();
    safeExamples.forEach((course) => {
      const subtopics = getSubtopicPages(course.content, course.title);
      if (!subtopics.length) {
        return;
      }
      const completedSubtopics = currentUserProgress?.[course.id]?.completedSubtopics ?? {};
      const allDone = subtopics.every((subtopic) => Boolean(completedSubtopics[subtopic.id]));
      if (allDone) {
        result.add(course.id);
      }
    });
    return result;
  }, [currentUserProgress, safeExamples]);

  const engagedCourseIds = useMemo(() => {
    const result = new Set();
    safeExamples.forEach((course) => {
      const courseProgress = currentUserProgress?.[course.id] ?? {};
      const completedSubtopics = courseProgress.completedSubtopics ?? {};
      const answers = courseProgress.answers ?? {};

      const hasCompleted = Object.values(completedSubtopics).some((done) => Boolean(done));
      const hasAnswered = Object.values(answers).some((subtopicAnswers) =>
        Object.values(subtopicAnswers ?? {}).some((answer) => {
          const typedAnswer = String(answer?.typedAnswer ?? "").trim();
          return typedAnswer.length > 0 || typeof answer?.isCorrect === "boolean";
        }),
      );

      if (hasCompleted || hasAnswered) {
        result.add(course.id);
      }
    });
    return result;
  }, [currentUserProgress, safeExamples]);

  const allSkills = useMemo(
    () =>
      Array.from(
        new Set(
          safeExamples.flatMap((course) =>
            getCourseSkillRewards(course).map((reward) => reward.skill),
          ),
        ),
      ),
    [safeExamples],
  );

  const trackedCourses = useMemo(
    () => safeExamples.filter((course) => engagedCourseIds.has(course.id)),
    [engagedCourseIds, safeExamples],
  );

  const skillRows = useMemo(() => {
    return allSkills.map((skill) => {
      const maxPoints = safeExamples.reduce((sum, course) => {
        const rewards = getCourseSkillRewards(course);
        const reward = rewards.find((entry) => entry.skill === skill);
        return reward ? sum + Number(reward.points) : sum;
      }, 0);
      const currentPoints = Number(userSkillScores[skill] ?? 0);
      const percent = maxPoints > 0 ? Math.min(100, Math.round((currentPoints / maxPoints) * 100)) : 0;

      return {
        skill,
        currentPoints,
        maxPoints,
        percent,
      };
    });
  }, [allSkills, safeExamples, userSkillScores]);
  const acquiredSkillRows = useMemo(
    () =>
      skillRows
        .filter((row) => row.currentPoints > 0)
        .map((row) => ({
          ...row,
          powerScore: Math.max(0, Math.min(100, Math.round(row.currentPoints))),
        }))
        .sort((a, b) => b.powerScore - a.powerScore),
    [skillRows],
  );

  const completedTrackedCourses = trackedCourses.filter((course) => completedCourseIds.has(course.id)).length;
  const trackedCourseCount = trackedCourses.length;
  const totalSkillScore = Object.values(userSkillScores).reduce((sum, score) => sum + Number(score ?? 0), 0);

  const radarGeometry = useMemo(() => {
    const count = skillRows.length;
    if (!count) {
      return { axisPoints: [], dataPoints: [], rings: [] };
    }

    const angleStep = (Math.PI * 2) / count;
    const axisPoints = skillRows.map((row, index) => {
      const angle = -Math.PI / 2 + index * angleStep;
      const cos = Math.cos(angle);
      const sin = Math.sin(angle);
      const axisX = RADAR_CENTER + cos * RADAR_RADIUS;
      const axisY = RADAR_CENTER + sin * RADAR_RADIUS;
      const labelX = RADAR_CENTER + cos * (RADAR_RADIUS + 32);
      const labelY = RADAR_CENTER + sin * (RADAR_RADIUS + 32);
      const textAnchor = labelX > RADAR_CENTER + 6 ? "start" : labelX < RADAR_CENTER - 6 ? "end" : "middle";
      const dominantBaseline = labelY > RADAR_CENTER + 6 ? "hanging" : labelY < RADAR_CENTER - 6 ? "auto" : "middle";

      return {
        id: row.skill,
        skill: row.skill,
        axisX,
        axisY,
        labelX,
        labelY,
        textAnchor,
        dominantBaseline,
      };
    });

    const dataPoints = skillRows.map((row, index) => {
      const angle = -Math.PI / 2 + index * angleStep;
      const ratio = Math.max(0, Math.min(1, Number(row.percent) / 100));
      return {
        x: RADAR_CENTER + Math.cos(angle) * RADAR_RADIUS * ratio,
        y: RADAR_CENTER + Math.sin(angle) * RADAR_RADIUS * ratio,
      };
    });

    const rings = RADAR_LEVELS.map((level) =>
      skillRows
        .map((_, index) => {
          const angle = -Math.PI / 2 + index * angleStep;
          const x = RADAR_CENTER + Math.cos(angle) * RADAR_RADIUS * level;
          const y = RADAR_CENTER + Math.sin(angle) * RADAR_RADIUS * level;
          return `${x},${y}`;
        })
        .join(" "),
    );

    return {
      axisPoints,
      dataPoints,
      dataPolygon: dataPoints.map((point) => `${point.x},${point.y}`).join(" "),
      rings,
    };
  }, [skillRows]);

  useEffect(() => {
    setName(currentUser.name);
    setMessage("");
    setPasswordForm({
      currentPassword: "",
      nextPassword: "",
      confirmPassword: "",
    });
    setPasswordMessage("");
  }, [currentUser.name]);

  const handleSubmit = (event) => {
    event.preventDefault();

    const trimmedName = name.trim();
    if (!trimmedName) {
      setMessage("กรุณากรอกชื่อก่อนบันทึก");
      return;
    }

    onSaveName(trimmedName);
    setMessage("บันทึกชื่อเรียบร้อย");
  };

  const handleChangePasswordSubmit = (event) => {
    event.preventDefault();

    const currentPassword = passwordForm.currentPassword;
    const nextPassword = passwordForm.nextPassword;
    const confirmPassword = passwordForm.confirmPassword;

    if (!currentPassword || !nextPassword || !confirmPassword) {
      setPasswordMessage("กรุณากรอกข้อมูลรหัสผ่านให้ครบ");
      return;
    }
    if (nextPassword.length < 4) {
      setPasswordMessage("รหัสผ่านใหม่ต้องอย่างน้อย 4 ตัวอักษร");
      return;
    }
    if (nextPassword !== confirmPassword) {
      setPasswordMessage("ยืนยันรหัสผ่านใหม่ไม่ตรงกัน");
      return;
    }

    const result = onChangePassword?.(username, currentPassword, nextPassword);
    if (result?.success) {
      setPasswordForm({ currentPassword: "", nextPassword: "", confirmPassword: "" });
    }
    setPasswordMessage(result?.message ?? "ไม่สามารถเปลี่ยนรหัสผ่านได้");
  };

  return (
    <section className="workspace-content">
      <header className="content-header">
        <h1>โปรไฟล์</h1>
        <p>ข้อมูลผู้ใช้ที่กำลังเข้าสู่ระบบ</p>
      </header>

      <article className="info-card">
        <form className="profile-form" onSubmit={handleSubmit}>
          <label htmlFor="profile-name">ชื่อ</label>
          <input
            id="profile-name"
            type="text"
            value={name}
            onChange={(event) => setName(event.target.value)}
          />

          <p>
            <strong>Username:</strong> {username}
          </p>
          <p>
            <strong>ตำแหน่ง:</strong> {currentUser.role}
          </p>

          <button type="submit" className="enter-button">
            บันทึก
          </button>
        </form>

        {message ? <p className="profile-message">{message}</p> : null}
      </article>

      <article className="info-card">
        <h3>เปลี่ยนรหัสผ่าน</h3>
        <form className="profile-form" onSubmit={handleChangePasswordSubmit}>
          <label htmlFor="current-password">รหัสผ่านปัจจุบัน</label>
          <input
            id="current-password"
            type="password"
            value={passwordForm.currentPassword}
            onChange={(event) =>
              setPasswordForm((prev) => ({ ...prev, currentPassword: event.target.value }))
            }
          />
          <label htmlFor="next-password">รหัสผ่านใหม่</label>
          <input
            id="next-password"
            type="password"
            value={passwordForm.nextPassword}
            onChange={(event) =>
              setPasswordForm((prev) => ({ ...prev, nextPassword: event.target.value }))
            }
          />
          <label htmlFor="confirm-password">ยืนยันรหัสผ่านใหม่</label>
          <input
            id="confirm-password"
            type="password"
            value={passwordForm.confirmPassword}
            onChange={(event) =>
              setPasswordForm((prev) => ({ ...prev, confirmPassword: event.target.value }))
            }
          />
          <button type="submit" className="enter-button">
            บันทึกรหัสผ่านใหม่
          </button>
        </form>
        {passwordMessage ? <p className="profile-message">{passwordMessage}</p> : null}
      </article>

      <section className="profile-dashboard-grid">
        <article className="info-card profile-projects-panel">
          <h3>COURSES</h3>
          <div className="project-metrics">
            <div className="project-metric-chip">
              <span>คอร์สที่มี activity</span>
              <strong>
                {trackedCourseCount}
              </strong>
            </div>
            <div className="project-metric-chip">
              <span>คอร์สที่จบ</span>
              <strong>{completedTrackedCourses}</strong>
            </div>
            <div className="project-metric-chip">
              <span>คะแนนทักษะรวม</span>
              <strong>{totalSkillScore}</strong>
            </div>
          </div>

          <div className="project-course-list">
            {trackedCourses.map((course) => {
              const isDone = completedCourseIds.has(course.id);
              const rewards = getCourseSkillRewards(course);
              return (
                <div key={course.id} className={`project-course-item ${isDone ? "done" : ""}`}>
                  <p className="project-course-title">{course.title}</p>
                  <p className="project-course-status">{isDone ? "เรียนจบแล้ว" : "ยังไม่จบ"}</p>
                  {rewards.length ? (
                    <ul className="project-course-reward-list">
                      {rewards.map((reward) => (
                        <li key={`${course.id}-${reward.skill}`}>
                          {reward.skill} +{reward.points}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="project-course-skills">ยังไม่ได้กำหนดแต้มทักษะในคอร์สนี้</p>
                  )}
                </div>
              );
            })}
            {!trackedCourses.length ? <p className="toc-empty">ยังไม่มีคอร์สที่เคยทำแบบฝึกหรือกดเสร็จสิ้น</p> : null}
          </div>
        </article>

        <article className="info-card profile-skills-panel">
          <h3>SKILLS</h3>
          {!skillRows.length ? (
            <p className="toc-empty">ยังไม่มีการกำหนดทักษะในคอร์ส</p>
          ) : (
            <>
              <div className="acquired-skill-box">
                <h4>ทักษะที่มีแล้ว (Power 0/100)</h4>
                {acquiredSkillRows.length ? (
                  <div className="acquired-skill-grid">
                    {acquiredSkillRows.map((row) => (
                      <div key={`power-${row.skill}`} className="acquired-skill-item">
                        <p className="skill-name">{row.skill}</p>
                        <p className="skill-score">
                          {row.powerScore} / 100
                        </p>
                        <div className="skill-progress power-progress">
                          <span style={{ width: `${row.powerScore}%` }} />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="toc-empty">ยังไม่มีทักษะที่ได้คะแนน</p>
                )}
              </div>

              <div className="radar-wrap">
                <svg viewBox={`0 0 ${RADAR_SIZE} ${RADAR_SIZE}`} className="skill-radar" aria-label="Skill radar chart">
                  {radarGeometry.rings.map((ring, index) => (
                    <polygon key={`ring-${RADAR_LEVELS[index]}`} points={ring} className="radar-ring" />
                  ))}
                  {radarGeometry.axisPoints.map((point) => (
                    <line
                      key={`axis-${point.id}`}
                      x1={RADAR_CENTER}
                      y1={RADAR_CENTER}
                      x2={point.axisX}
                      y2={point.axisY}
                      className="radar-axis"
                    />
                  ))}
                  <polygon points={radarGeometry.dataPolygon} className="radar-data" />
                  {radarGeometry.dataPoints.map((point, index) => (
                    <circle key={`dot-${skillRows[index].skill}`} cx={point.x} cy={point.y} r="4" className="radar-dot" />
                  ))}
                  {radarGeometry.axisPoints.map((point) => (
                    <text
                      key={`label-${point.id}`}
                      x={point.labelX}
                      y={point.labelY}
                      textAnchor={point.textAnchor}
                      dominantBaseline={point.dominantBaseline}
                      className="radar-label"
                    >
                      {toRadarLabel(point.skill)}
                    </text>
                  ))}
                </svg>
              </div>

              <div className="skill-grid">
                {skillRows.map((row) => (
                  <div key={row.skill} className="skill-item">
                    <p className="skill-name">{row.skill}</p>
                    <p className="skill-score">
                      {row.currentPoints} / {row.maxPoints} คะแนน ({row.percent}%)
                    </p>
                    <div className="skill-progress">
                      <span style={{ width: `${row.percent}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </article>
      </section>
    </section>
  );
}
