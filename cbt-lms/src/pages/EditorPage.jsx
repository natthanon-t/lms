import CodeMirror from "@uiw/react-codemirror";
import { markdown as mdLang } from "@codemirror/lang-markdown";
import MarkdownContent from "../components/markdown/MarkdownContent";

export default function EditorPage({ draft, onBack, onChangeDraft }) {
  return (
    <section className="workspace-content">
      <header className="content-header editor-head">
        <div>
          <h1>หน้าแก้เนื้อหา</h1>
          <p>แก้ไข Markdown แล้วดูตัวอย่างผลลัพธ์ได้ทันที</p>
        </div>
        <button type="button" className="back-button" onClick={onBack}>
          กลับหน้า Lobby
        </button>
      </header>

      <div className="editor-title-box">
        <label htmlFor="editor-title">ชื่อเนื้อหา</label>
        <input
          id="editor-title"
          value={draft.title}
          onChange={(event) => onChangeDraft("title", event.target.value)}
        />
      </div>

      <div className="editor-split">
        <div className="editor-panel">
          <h3>Markdown Editor</h3>
          <CodeMirror
            value={draft.content}
            height="420px"
            extensions={[mdLang()]}
            onChange={(value) => onChangeDraft("content", value)}
            theme="dark"
            basicSetup={{
              lineNumbers: true,
              foldGutter: false,
              highlightActiveLine: true,
            }}
          />
        </div>

        <div className="preview-panel">
          <h3>Live Preview</h3>
          <div className="preview-body">
            <MarkdownContent content={draft.content} />
          </div>
        </div>
      </div>
    </section>
  );
}
