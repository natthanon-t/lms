export default function ContentPage({ examples, onOpenEditor, onEnterClass }) {
  return (
    <section className="workspace-content">
      <header className="content-header">
        <h1>เนื้อหา</h1>
        <p>รายการบทเรียนสำหรับเข้าเรียนหรือแก้ไขเนื้อหา</p>
      </header>

      <div className="example-grid">
        {examples.map((example) => (
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
    </section>
  );
}
