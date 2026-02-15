import { useState } from "react";

export default function LobbyPage({ examples, examBank, onOpenEditor, onEnterClass, onEnterExam }) {
  const [searchTerm, setSearchTerm] = useState("");

  const keyword = searchTerm.trim().toLowerCase();
  const filteredExamples = examples.filter((example) =>
    keyword ? example.title.toLowerCase().includes(keyword) : true,
  );
  const filteredExams = examBank.filter((exam) =>
    keyword ? exam.title.toLowerCase().includes(keyword) : true,
  );

  return (
    <section className="workspace-content">
      <header className="content-header">
        <h1>Lobby - บทเรียน</h1>
        <p>หน้าหลักแสดงบทเรียนและข้อสอบแยกส่วนในหน้าเดียว</p>
      </header>

      <div className="search-box">
        <label htmlFor="example-search">หาตัวอย่าง</label>
        <input
          id="example-search"
          type="text"
          placeholder="พิมพ์ชื่อหัวข้อ"
          value={searchTerm}
          onChange={(event) => setSearchTerm(event.target.value)}
        />
      </div>

      <p className="section-label">ตัวอย่างเนื้อหา</p>
      <div className="example-grid">
        {filteredExamples.map((example) => (
          <article key={example.id} className="example-card">
            <img src={example.image} alt={example.title} className="card-image" />
            <div className="example-head">
              <h3 className="example-title">{example.title}</h3>
              <button
                type="button"
                className="gear-button"
                aria-label={`แก้ไข ${example.title}`}
                onClick={() => onOpenEditor(example)}
              >
                ⚙
              </button>
            </div>
            <button type="button" className="enter-button" onClick={() => onEnterClass(example)}>
              เข้าเรียน
            </button>
          </article>
        ))}
      </div>

      <p className="section-label">ตัวอย่างข้อสอบ</p>
      <div className="exam-grid">
        {filteredExams.map((exam) => (
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
