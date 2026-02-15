import MarkdownContent from "../components/markdown/MarkdownContent";

export default function StudyPage({ draft, onBack }) {
  return (
    <section className="workspace-content">
      <header className="content-header editor-head">
        <div>
          <h1>{draft.title}</h1>
          <p>หน้าเรียนเนื้อหา</p>
        </div>
        <button type="button" className="back-button" onClick={onBack}>
          กลับหน้าเลือกเนื้อหา
        </button>
      </header>

      <div className="preview-panel study-panel">
        <div className="preview-body">
          <MarkdownContent content={draft.content} />
        </div>
      </div>
    </section>
  );
}
