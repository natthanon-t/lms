export default function LeaderboardPage({ users }) {
  const ranking = Object.entries(users)
    .map(([username, profile], index) => ({
      username,
      name: profile.name,
      role: profile.role,
      score: 100 - index * 8,
    }))
    .sort((a, b) => b.score - a.score);

  return (
    <section className="workspace-content">
      <header className="content-header">
        <h1>ลีดเดอร์บอร์ด</h1>
        <p>อันดับคะแนนตัวอย่างของผู้ใช้งานในระบบ</p>
      </header>

      <div className="leaderboard-card">
        <table>
          <thead>
            <tr>
              <th>อันดับ</th>
              <th>ชื่อ</th>
              <th>Username</th>
              <th>ตำแหน่ง</th>
              <th>คะแนน</th>
            </tr>
          </thead>
          <tbody>
            {ranking.map((item, index) => (
              <tr key={item.username}>
                <td>{index + 1}</td>
                <td>{item.name}</td>
                <td>{item.username}</td>
                <td>{item.role}</td>
                <td>{item.score}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
