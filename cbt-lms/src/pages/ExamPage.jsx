export default function ExamPage({ examBank, onOpenEditor, onEnterExam }) {
  return (
    <section className="workspace-content">
      <header className="content-header">
        <h1>ข้อสอบ</h1>
        <p>เลือกเข้าสอบได้ทันที หรือกดปุ่มเฝืองเพื่อแก้ไขข้อสอบ</p>
      </header>

      <div className="exam-grid">
        {examBank.map((exam) => (
          <article key={exam.id} className="exam-card">
            <img src={exam.image} alt={exam.title} className="card-image" />
            <div className="example-head">
              <h3>{exam.title}</h3>
              <button
                type="button"
                className="gear-button"
                aria-label={`แก้ไข ${exam.title}`}
                onClick={() => onOpenEditor(exam)}
              >
                ⚙
              </button>
            </div>
            <p>{exam.description}</p>
            <button type="button" className="enter-button" onClick={() => onEnterExam(exam)}>
              เข้าสอบ
            </button>
          </article>
        ))}
      </div>
    </section>
  );
}
