export default function SummaryPage({ lessonCount, examCount }) {
  return (
    <section className="workspace-content">
      <header className="content-header">
        <h1>สรุปผล</h1>
        <p>ภาพรวมจำนวนเนื้อหาในระบบ</p>
      </header>

      <div className="metric-grid">
        <article className="metric-card">
          <h3>บทเรียนทั้งหมด</h3>
          <p>{lessonCount}</p>
        </article>
        <article className="metric-card">
          <h3>ข้อสอบทั้งหมด</h3>
          <p>{examCount}</p>
        </article>
      </div>
    </section>
  );
}
