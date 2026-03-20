import { useState, useEffect, useCallback, useMemo } from "react";
import { fetchLeaderboardApi, fetchUserPublicProfileApi } from "../services/courseApiService";
import { getAvatarColor, getInitials } from "../utils/avatar";
import { getLevel, getLevelProgress, pointsToNext } from "../utils/level";

function LevelBadge({ score, size = "sm" }) {
  const lv = getLevel(score);
  return (
    <span
      className={`level-badge level-badge-${size}`}
      style={{ color: lv.color, background: lv.bg }}
    >
      Lv.{lv.num} {lv.label}
    </span>
  );
}

function LevelBar({ score }) {
  const lv = getLevel(score);
  const progress = getLevelProgress(score);
  const toNext = pointsToNext(score);
  return (
    <div className="level-bar-wrap">
      <div className="level-bar-row">
        <span className="level-bar-label" style={{ color: lv.color }}>Lv.{lv.num} {lv.label}</span>
        {toNext !== null && (
          <span className="level-bar-next">อีก {toNext} แต้ม → Lv.{lv.num + 1}</span>
        )}
      </div>
      <div className="level-bar-track">
        <div
          className="level-bar-fill"
          style={{ width: `${Math.round(progress * 100)}%`, background: lv.color }}
        />
      </div>
    </div>
  );
}

function AvatarCell({ name, username, avatarUrl }) {
  const color = getAvatarColor(username);
  const initials = getInitials(name, username);
  return (
    <span className="leaderboard-name-cell">
      <span
        className="leaderboard-avatar"
        style={{ background: avatarUrl ? "transparent" : color }}
      >
        {avatarUrl ? (
          <img src={avatarUrl} alt={name} className="leaderboard-avatar-img" />
        ) : (
          <span className="leaderboard-avatar-initials">{initials}</span>
        )}
      </span>
      {name}
    </span>
  );
}

function ProfileModal({ username, onClose }) {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchUserPublicProfileApi(username)
      .then(setProfile)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [username]);

  const handleBackdropClick = useCallback(
    (e) => { if (e.target === e.currentTarget) onClose(); },
    [onClose],
  );

  const color = profile ? getAvatarColor(profile.username) : "#ccc";
  const initials = profile ? getInitials(profile.name, profile.username) : "";
  const skillEntries = profile?.skillScores ? Object.entries(profile.skillScores) : [];

  return (
    <div className="profile-modal-backdrop" onClick={handleBackdropClick}>
      <div className="profile-modal">
        <button type="button" className="profile-modal-close" onClick={onClose} aria-label="ปิด">
          ✕
        </button>

        {loading ? (
          <p className="profile-modal-loading">กำลังโหลด...</p>
        ) : !profile ? (
          <p className="profile-modal-loading">ไม่พบข้อมูล</p>
        ) : (
          <>
            <div className="profile-modal-head">
              <span
                className="profile-modal-avatar"
                style={{ background: profile.avatarUrl ? "transparent" : color }}
              >
                {profile.avatarUrl ? (
                  <img src={profile.avatarUrl} alt={profile.name} className="profile-modal-avatar-img" />
                ) : (
                  <span className="profile-modal-avatar-initials">{initials}</span>
                )}
              </span>
              <div>
                <h2 className="profile-modal-name">{profile.name}</h2>
                <p className="profile-modal-username">@{profile.username}</p>
                <p className="profile-modal-role">{profile.role}</p>
              </div>
            </div>

            <LevelBar score={profile.totalScore} />

            <div className="profile-modal-stats">
              <div className="profile-stat-card">
                <span className="profile-stat-value">{profile.totalScore}</span>
                <span className="profile-stat-label">คะแนนรวม</span>
              </div>
              <div className="profile-stat-card">
                <span className="profile-stat-value">{profile.completedCourses}</span>
                <span className="profile-stat-label">คอร์สที่เรียนจบ</span>
              </div>
              <div className="profile-stat-card">
                <span className="profile-stat-value">{profile.solvedQuestions}</span>
                <span className="profile-stat-label">คำถามที่ตอบถูก</span>
              </div>
            </div>

            {skillEntries.length > 0 && (
              <div className="profile-modal-skills">
                <h3 className="profile-skills-title">ทักษะ</h3>
                <div className="profile-skills-grid">
                  {skillEntries.map(([skill, pts]) => (
                    <div key={skill} className="profile-skill-item">
                      <span className="profile-skill-name">{skill}</span>
                      <span className="profile-skill-pts">{pts} pts</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

const LIMIT_OPTIONS = [10, 50, 100];

export default function LeaderboardPage() {
  const [ranking, setRanking] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedUsername, setSelectedUsername] = useState(null);
  const [limit, setLimit] = useState(10);

  useEffect(() => {
    fetchLeaderboardApi()
      .then(setRanking)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const displayed = useMemo(
    () => (limit === 0 ? ranking : ranking.slice(0, limit)),
    [ranking, limit],
  );

  return (
    <section className="workspace-content">
      <header className="content-header">
        <div>
          <h1>ลีดเดอร์บอร์ด</h1>
          <p>คะแนนรวมจากการตอบคำถามและการเรียนจบเนื้อหา</p>
        </div>
        <div className="leaderboard-limit-control">
          <label htmlFor="lb-limit">แสดง</label>
          <select
            id="lb-limit"
            value={limit}
            onChange={(e) => setLimit(Number(e.target.value))}
          >
            {LIMIT_OPTIONS.map((n) => (
              <option key={n} value={n}>Top {n}</option>
            ))}
            <option value={0}>ทั้งหมด ({ranking.length})</option>
          </select>
          <span>คน</span>
        </div>
      </header>

      <div className="leaderboard-card">
        {loading ? (
          <p>กำลังโหลด...</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>อันดับ</th>
                <th>ชื่อ</th>
                <th>Username</th>
                <th>ตำแหน่ง</th>
                <th>เลเวล</th>
                <th>คำถามที่ตอบถูก</th>
                <th>เนื้อหาที่เรียนจบ</th>
                <th>คะแนน</th>
              </tr>
            </thead>
            <tbody>
              {displayed.map((item, index) => (
                <tr
                  key={item.username}
                  className={["leaderboard-rank-1", "leaderboard-rank-2", "leaderboard-rank-3"][index] ?? ""}
                >
                  <td>
                    <span className="leaderboard-rank-badge">{index + 1}</span>
                  </td>
                  <td>
                    <button
                      type="button"
                      className="leaderboard-name-btn"
                      onClick={() => setSelectedUsername(item.username)}
                    >
                      <AvatarCell name={item.name} username={item.username} avatarUrl={item.avatar_url} />
                    </button>
                  </td>
                  <td>{item.username}</td>
                  <td>{item.role}</td>
                  <td><LevelBadge score={item.total_score} /></td>
                  <td>{item.solved_questions}</td>
                  <td>{item.completed_courses}</td>
                  <td>{item.total_score}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {selectedUsername && (
        <ProfileModal username={selectedUsername} onClose={() => setSelectedUsername(null)} />
      )}
    </section>
  );
}
