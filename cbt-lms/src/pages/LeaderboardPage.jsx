export default function LeaderboardPage({ users, learningStats }) {
  const ranking = Object.entries(users)
    .map(([username, profile]) => ({
      username,
      name: profile.name,
      role: profile.role,
      score: learningStats?.[username]?.score ?? 0,
      completedCourses: learningStats?.[username]?.completedCourses ?? 0,
      solvedQuestions: learningStats?.[username]?.solvedQuestions ?? 0,
      topSkills: Object.entries(learningStats?.[username]?.skillScores ?? {})
        .sort(([, a], [, b]) => b - a)
        .slice(0, 3),
    }))
    .sort((a, b) => b.score - a.score);

  return (
    <section className="workspace-content">
      <header className="content-header">
        <h1>ลีดเดอร์บอร์ด</h1>
        <p>คะแนนรวมจากการตอบคำถามและการเรียนจบเนื้อหา</p>
      </header>

      <div className="leaderboard-card">
        <table>
          <thead>
            <tr>
              <th>อันดับ</th>
              <th>ชื่อ</th>
              <th>Username</th>
              <th>ตำแหน่ง</th>
              <th>คำถามที่ตอบถูก</th>
              <th>เนื้อหาที่เรียนจบ</th>
              <th>ทักษะเด่น</th>
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
                <td>{item.solvedQuestions}</td>
                <td>{item.completedCourses}</td>
                <td>
                  {item.topSkills.length
                    ? item.topSkills.map(([skill, points]) => `${skill} (${points})`).join(", ")
                    : "-"}
                </td>
                <td>{item.score}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
