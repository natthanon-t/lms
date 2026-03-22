import { useEffect, useMemo, useRef, useState } from "react";
import { useEscapeKey } from "../hooks/useEscapeKey";
import { getSubtopicPages } from "../components/markdown/headingUtils";
import { getCourseSkillRewards } from "../services/skillRewardsService";
import { fileToDataUrl } from "../services/imageService";
import { fetchLoginDates } from "../services/authService";
import { fetchAvatarApi, updateAvatarApi } from "../services/mediaApiService";
import { useAuth } from "../contexts/AuthContext";
import { useAppData } from "../contexts/AppDataContext";

import { avatarStorageKey, getAvatarColor, getInitials } from "../utils/avatar";
import { getLevel, getLevelProgress, pointsToNext } from "../utils/level";

const avatarKey = avatarStorageKey;

const MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const DAY_LABELS = ["", "Mon", "", "Wed", "", "Fri", ""];
const CELL = 13;
const GAP = 3;
const LEFT_W = 30;
const TOP_H = 20;

function LoginActivityHeatmap({ dates }) {
  const loginDateSet = useMemo(() => new Set(dates), [dates]);

  const { weeks, monthLabels, totalWeeks } = useMemo(() => {
    const pad = (n) => String(n).padStart(2, "0");
    const toLocalStr = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

    const year = new Date().getFullYear();
    // Start from the Sunday of the week containing Jan 1
    const jan1 = new Date(year, 0, 1);
    const startDay = new Date(jan1);
    startDay.setDate(jan1.getDate() - jan1.getDay());
    // End at the Saturday of the week containing Dec 31
    const dec31 = new Date(year, 11, 31);
    const endDay = new Date(dec31);
    endDay.setDate(dec31.getDate() + (6 - dec31.getDay()));
    const numWeeks = Math.round((endDay - startDay) / (7 * 24 * 60 * 60 * 1000)) + 1;

    const todayStr = toLocalStr(new Date());

    const builtWeeks = [];
    for (let w = 0; w < numWeeks; w++) {
      const week = [];
      for (let d = 0; d < 7; d++) {
        const date = new Date(startDay);
        date.setDate(startDay.getDate() + w * 7 + d);
        const dateStr = toLocalStr(date);
        const isFuture = dateStr > todayStr;
        week.push({ dateStr, isActive: !isFuture && loginDateSet.has(dateStr), isFuture, dayOfWeek: d });
      }
      builtWeeks.push(week);
    }

    const builtMonthLabels = [];
    for (let w = 0; w < numWeeks; w++) {
      const hit = builtWeeks[w].find(({ dateStr }) => dateStr.slice(8) === "01");
      if (hit) {
        builtMonthLabels.push({ week: w, label: MONTH_NAMES[parseInt(hit.dateStr.slice(5, 7), 10) - 1] });
      }
    }

    return { weeks: builtWeeks, monthLabels: builtMonthLabels, totalWeeks: numWeeks };
  }, [loginDateSet]);

  const svgWidth = LEFT_W + totalWeeks * (CELL + GAP);
  const svgHeight = TOP_H + 7 * (CELL + GAP);

  return (
    <div className="heatmap-scroll">
      <svg width={svgWidth} height={svgHeight} style={{ display: "block" }}>
        {monthLabels.map(({ week, label }) => (
          <text key={`m-${week}`} x={LEFT_W + week * (CELL + GAP)} y={14} fontSize="11" fill="#6b8ab8">
            {label}
          </text>
        ))}
        {DAY_LABELS.map((label, d) =>
          label ? (
            <text key={`d-${d}`} x={LEFT_W - 4} y={TOP_H + d * (CELL + GAP) + CELL - 2} fontSize="11" fill="#6b8ab8" textAnchor="end">
              {label}
            </text>
          ) : null,
        )}
        {weeks.map((week, w) =>
          week.map(({ dateStr, isActive, isFuture, dayOfWeek }) => (
            <rect
              key={dateStr}
              x={LEFT_W + w * (CELL + GAP)}
              y={TOP_H + dayOfWeek * (CELL + GAP)}
              width={CELL}
              height={CELL}
              rx={2}
              fill={isActive ? "#2ea043" : isFuture ? "#f0f2f5" : "#dde3ed"}
            >
              <title>{dateStr}</title>
            </rect>
          )),
        )}
      </svg>
    </div>
  );
}

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

export default function ProfilePage() {
  const { currentUser, currentUserKey: username } = useAuth();
  const { examples, learningProgress, userSkillScores: skillScores, userTotalScore: totalScore, handleSaveName: onSaveName, handleSaveProfile: onSaveProfile, handleChangePassword: onChangePassword, loadUserScoresFromApi, loadExamples } = useAppData();
  const currentUserProgress = (learningProgress[username] ?? {});

  useEffect(() => {
    if (username) void loadUserScoresFromApi();
    void loadExamples();
  }, [username, loadUserScoresFromApi, loadExamples]);
  const [name, setName] = useState(currentUser.name);
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [message, setMessage] = useState("");
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: "",
    nextPassword: "",
    confirmPassword: "",
  });
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [passwordMessage, setPasswordMessage] = useState("");
  const [showEditModal, setShowEditModal] = useState(false);
  const [editModalName, setEditModalName] = useState(currentUser.name);
  const [editModalEmployeeCode, setEditModalEmployeeCode] = useState(currentUser.employeeCode ?? "");
  const [editModalMessage, setEditModalMessage] = useState("");
  const [avatar, setAvatar] = useState(() => {
    try { return localStorage.getItem(avatarKey(username)) ?? ""; } catch { return ""; }
  });
  const avatarInputRef = useRef(null);
  const [showAllSkills, setShowAllSkills] = useState(false);
  const [loginActivityDates, setLoginActivityDates] = useState([]);
  useEffect(() => {
    fetchLoginDates().then(setLoginActivityDates).catch(() => {});
  }, [username]);
  const currentYear = new Date().getFullYear().toString();
  const activeDaysThisYear = loginActivityDates.filter((d) => d.startsWith(currentYear)).length;
  const userSkillScores = skillScores ?? {};
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
  const sortedSkillRows = useMemo(
    () => [...skillRows].sort((a, b) => b.currentPoints - a.currentPoints),
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
    setIsEditingProfile(false);
    setMessage("");
    setPasswordForm({
      currentPassword: "",
      nextPassword: "",
      confirmPassword: "",
    });
    setShowPasswordForm(false);
    setPasswordMessage("");
    setEditModalName(currentUser.name);
    setEditModalEmployeeCode(currentUser.employeeCode ?? "");
  }, [currentUser.name, currentUser.employeeCode]);

  useEffect(() => {
    fetchAvatarApi()
      .then((dataUrl) => {
        if (dataUrl) {
          try { localStorage.setItem(avatarKey(username), dataUrl); } catch { /* ignore */ }
          setAvatar(dataUrl);
        } else {
          try { setAvatar(localStorage.getItem(avatarKey(username)) ?? ""); } catch { setAvatar(""); }
        }
      })
      .catch(() => {
        try { setAvatar(localStorage.getItem(avatarKey(username)) ?? ""); } catch { setAvatar(""); }
      });
  }, [username]);

  const handleAvatarUpload = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    try {
      const dataUrl = await fileToDataUrl(file);
      await updateAvatarApi(dataUrl);
      try { localStorage.setItem(avatarKey(username), dataUrl); } catch { /* ignore */ }
      setAvatar(dataUrl);
    } catch {
      // ignore upload errors
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    const trimmedName = name.trim();
    if (!trimmedName) {
      setMessage("กรุณากรอกชื่อก่อนบันทึก");
      return;
    }

    const result = await onSaveName?.(trimmedName);
    setMessage(result?.message ?? "บันทึกชื่อเรียบร้อย");
    if (result?.success !== false) {
      setIsEditingProfile(false);
    }
  };

  const handleChangePasswordSubmit = async (event) => {
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

    const result = await onChangePassword?.(username, currentPassword, nextPassword);
    if (result?.success) {
      setPasswordForm({ currentPassword: "", nextPassword: "", confirmPassword: "" });
    }
    setPasswordMessage(result?.message ?? "ไม่สามารถเปลี่ยนรหัสผ่านได้");
  };

  const closePasswordModal = () => {
    setShowPasswordForm(false);
    setPasswordForm({
      currentPassword: "",
      nextPassword: "",
      confirmPassword: "",
    });
    setPasswordMessage("");
  };

  const handleEditModalSave = async () => {
    const trimmedName = editModalName.trim();
    if (!trimmedName) {
      setEditModalMessage("กรุณากรอกชื่อ");
      return;
    }

    const result = await (onSaveProfile?.({ name: trimmedName, employeeCode: editModalEmployeeCode }) ?? onSaveName?.(trimmedName));
    setEditModalMessage(result?.message ?? "บันทึกข้อมูลเรียบร้อย");
    if (result?.success !== false) {
      setShowEditModal(false);
    }
  };

  const closeEditModal = () => {
    setShowEditModal(false);
    setEditModalName(currentUser.name);
    setEditModalEmployeeCode(currentUser.employeeCode ?? "");
    setEditModalMessage("");
  };

  useEscapeKey(showPasswordForm, closePasswordModal);
  useEscapeKey(showEditModal, closeEditModal);

  return (
    <section className="workspace-content">
      <header className="content-header">
        <h1>โปรไฟล์</h1>
        <p>ข้อมูลผู้ใช้ที่กำลังเข้าสู่ระบบ</p>
      </header>

      <article className="info-card profile-info-card">
        <div className="profile-left-panel">
        {/* Avatar */}
        <div className="profile-avatar-area">
          <div
            className="profile-avatar-circle"
            style={{ background: avatar ? "transparent" : getAvatarColor(username) }}
            onClick={() => avatarInputRef.current?.click()}
            title="คลิกเพื่อเปลี่ยนรูปโปรไฟล์"
          >
            {avatar ? (
              <img src={avatar} alt="avatar" className="profile-avatar-img" />
            ) : (
              <span className="profile-avatar-initials">{getInitials(currentUser.name, username)}</span>
            )}
          </div>
          <button type="button" className="profile-avatar-change-btn" onClick={() => avatarInputRef.current?.click()}>
            เปลี่ยนรูป
          </button>
          <input ref={avatarInputRef} type="file" accept="image/*" style={{ display: "none" }} onChange={handleAvatarUpload} />
        </div>

        {/* Info */}
        {isEditingProfile ? (
          <form className="profile-form" onSubmit={handleSubmit}>
            <div className="profile-info-rows">
              <div className="profile-info-row">
                <span className="profile-info-label">รหัสพนักงาน</span>
                <span className="profile-info-value">{currentUser.employeeCode || "-"}</span>
              </div>

              <div className="profile-info-row">
                <span className="profile-info-label">ชื่อ</span>
                <input
                  id="profile-name"
                  type="text"
                  className="profile-info-input"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                />
              </div>
              <div className="profile-info-row">
                <span className="profile-info-label">Username</span>
                <span className="profile-info-value">{username}</span>
              </div>
              <div className="profile-info-row">
                <span className="profile-info-label">ตำแหน่ง</span>
                <span className="profile-info-value">{currentUser.role}</span>
              </div>
              <div className="profile-info-row">
                <span className="profile-info-label">เลเวล</span>
                <span className="profile-info-value">
                  {(() => {
                    const lv = getLevel(totalScore);
                    return (
                      <span className="level-badge level-badge-sm" style={{ color: lv.color, background: lv.bg }}>
                        Lv.{lv.num} {lv.label}
                      </span>
                    );
                  })()}
                </span>
              </div>
            </div>
            <div className="profile-action-row">
              <button type="submit" className="enter-button">บันทึก</button>
              <button type="button" className="back-button" onClick={() => { setName(currentUser.name); setIsEditingProfile(false); }}>ยกเลิก</button>
              <button type="button" className="back-button" onClick={() => setShowPasswordForm(true)}>เปลี่ยนรหัสผ่าน</button>
            </div>
          </form>
        ) : (
          <>
            <div className="profile-info-rows">
              <div className="profile-info-row">
                <span className="profile-info-label">รหัสพนักงาน</span>
                <span className="profile-info-value">{currentUser.employeeCode || "-"}</span>
              </div>

              <div className="profile-info-row">
                <span className="profile-info-label">ชื่อ</span>
                <span className="profile-info-value">{currentUser.name}</span>
              </div>
              <div className="profile-info-row">
                <span className="profile-info-label">Username</span>
                <span className="profile-info-value">{username}</span>
              </div>
              <div className="profile-info-row">
                <span className="profile-info-label">ตำแหน่ง</span>
                <span className="profile-info-value">{currentUser.role}</span>
              </div>
              <div className="profile-info-row">
                <span className="profile-info-label">เลเวล</span>
                <span className="profile-info-value">
                  {(() => {
                    const lv = getLevel(totalScore);
                    return (
                      <span className="level-badge level-badge-sm" style={{ color: lv.color, background: lv.bg }}>
                        Lv.{lv.num} {lv.label}
                      </span>
                    );
                  })()}
                </span>
              </div>
            </div>
            <div className="profile-action-row" style={{ marginTop: 12 }}>
              <button type="button" className="enter-button" onClick={() => setShowEditModal(true)}>แก้ไขข้อมูล</button>
              <button type="button" className="back-button" onClick={() => setShowPasswordForm(true)}>เปลี่ยนรหัสผ่าน</button>
            </div>
          </>
        )}

        {message ? <p className="profile-message">{message}</p> : null}
        </div>

        <div className="profile-activity-panel">
          <div className="heatmap-header">
            <h3 className="heatmap-title">ACTIVITY</h3>
            <span className="heatmap-active-days">{activeDaysThisYear} วันที่เข้าใช้งานในปีนี้</span>
          </div>
          <p className="heatmap-subtitle">วันที่เข้าใช้งานระบบในปีนี้ (นับจากการ Login)</p>
          <LoginActivityHeatmap dates={loginActivityDates} />
          <div className="heatmap-legend">
            <span className="heatmap-legend-cell" style={{ background: "#dde3ed" }} />
            <span>ไม่ได้เข้าใช้งาน</span>
            <span className="heatmap-legend-cell" style={{ background: "#2ea043" }} />
            <span>เข้าใช้งาน</span>
          </div>
        </div>
      </article>

      {showEditModal && (
        <div className="modal-backdrop" onClick={closeEditModal}>
          <article
            className="info-card profile-password-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="edit-modal-title"
            onClick={(event) => event.stopPropagation()}
          >
            <button
              type="button"
              className="modal-close-button"
              aria-label="ปิดกล่องแก้ไข"
              onClick={closeEditModal}
            >
              ×
            </button>
            <h3 id="edit-modal-title">แก้ไขข้อมูล</h3>
            <form className="profile-form" onSubmit={(e) => { e.preventDefault(); handleEditModalSave(); }}>
              <label htmlFor="edit-modal-name">ชื่อ</label>
              <input
                id="edit-modal-name"
                type="text"
                value={editModalName}
                onChange={(e) => setEditModalName(e.target.value)}
                placeholder="ชื่อ นามสกุล"
                autoFocus
              />
              <label htmlFor="edit-modal-employee-code">รหัสพนักงาน</label>
              <input
                id="edit-modal-employee-code"
                type="text"
                value={editModalEmployeeCode}
                onChange={(e) => setEditModalEmployeeCode(e.target.value)}
              />
              <button type="submit" className="enter-button">
                บันทึก
              </button>
            </form>
            {editModalMessage ? <p className="profile-message">{editModalMessage}</p> : null}
          </article>
        </div>
      )}

      {showPasswordForm ? (
        <div className="modal-backdrop" onClick={closePasswordModal}>
          <article
            className="info-card profile-password-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="password-modal-title"
            onClick={(event) => event.stopPropagation()}
          >
            <button
              type="button"
              className="modal-close-button"
              aria-label="ปิดกล่องเปลี่ยนรหัสผ่าน"
              onClick={closePasswordModal}
            >
              ×
            </button>
            <h3 id="password-modal-title">เปลี่ยนรหัสผ่าน</h3>
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
        </div>
      ) : null}

      {/* Stats strip */}
      <div className="profile-stat-strip">
        <div className="profile-stat-box profile-stat-box-blue">
          <span className="profile-stat-num">{activeDaysThisYear}</span>
          <span className="profile-stat-lbl">วันที่ใช้งาน (ปีนี้)</span>
        </div>
        <div className="profile-stat-box profile-stat-box-green">
          <span className="profile-stat-num">{completedTrackedCourses}</span>
          <span className="profile-stat-lbl">คอร์สที่เรียนจบ</span>
        </div>
        <div className="profile-stat-box profile-stat-box-purple">
          <span className="profile-stat-num">{trackedCourseCount}</span>
          <span className="profile-stat-lbl">คอร์สที่มี Activity</span>
        </div>
        <div className="profile-stat-box profile-stat-box-orange">
          <span className="profile-stat-num">{totalSkillScore}</span>
          <span className="profile-stat-lbl">คะแนนทักษะรวม</span>
        </div>
      </div>

      <section className="profile-dashboard-grid">
        <article className="info-card profile-projects-panel">
          <h3 className="profile-panel-title">คอร์สเรียน</h3>
          {(() => {
            const lv = getLevel(totalScore);
            const progress = getLevelProgress(totalScore);
            const toNext = pointsToNext(totalScore);
            return (
              <div className="level-bar-wrap" style={{ marginBottom: 16 }}>
                <div className="level-bar-row">
                  <span className="level-bar-label" style={{ color: lv.color }}>Lv.{lv.num} {lv.label}</span>
                  {toNext !== null
                    ? <span className="level-bar-next">อีก {toNext} แต้ม → Lv.{lv.num + 1}</span>
                    : <span className="level-bar-next">เลเวลสูงสุด</span>
                  }
                </div>
                <div className="level-bar-track">
                  <div className="level-bar-fill" style={{ width: `${Math.round(progress * 100)}%`, background: lv.color }} />
                </div>
              </div>
            );
          })()}
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
          <h3 className="profile-panel-title">ทักษะ</h3>

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
              {radarGeometry.dataPolygon && <polygon points={radarGeometry.dataPolygon} className="radar-data" />}
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
            {(showAllSkills ? sortedSkillRows : sortedSkillRows.slice(0, 6)).map((row) => (
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
          {sortedSkillRows.length > 6 && (
            <button type="button" className="section-toggle-btn" onClick={() => setShowAllSkills((v) => !v)}>
              {showAllSkills ? "ซ่อน ▲" : `ดูทั้งหมด (${sortedSkillRows.length}) ▼`}
            </button>
          )}
        </article>
      </section>
    </section>
  );
}
