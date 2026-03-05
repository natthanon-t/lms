import { useState, useEffect } from "react";
import { fetchLeaderboardApi } from "../services/courseApiService";
import { getAvatarColor, getInitials } from "../utils/avatar";

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

export default function LeaderboardPage() {
  const [ranking, setRanking] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchLeaderboardApi()
      .then(setRanking)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <section className="workspace-content">
      <header className="content-header">
        <h1>ลีดเดอร์บอร์ด</h1>
        <p>คะแนนรวมจากการตอบคำถามและการเรียนจบเนื้อหา</p>
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
                <th>คำถามที่ตอบถูก</th>
                <th>เนื้อหาที่เรียนจบ</th>
                <th>คะแนน</th>
              </tr>
            </thead>
            <tbody>
              {ranking.map((item, index) => (
                <tr
                  key={item.username}
                  className={
                    index === 0
                      ? "leaderboard-rank-1"
                      : index === 1
                        ? "leaderboard-rank-2"
                        : index === 2
                          ? "leaderboard-rank-3"
                          : ""
                  }
                >
                  <td>
                    <span className="leaderboard-rank-badge">{index + 1}</span>
                  </td>
                  <td>
                    <AvatarCell name={item.name} username={item.username} avatarUrl={item.avatar_url} />
                  </td>
                  <td>{item.username}</td>
                  <td>{item.role}</td>
                  <td>{item.solved_questions}</td>
                  <td>{item.completed_courses}</td>
                  <td>{item.total_score}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </section>
  );
}
