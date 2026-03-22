import { useState, useCallback, useRef, useEffect, useMemo } from "react";
import { extractMeta, parseBlocks, toMarkdown, wrapSelection, prefixLines, createBlock } from "./markdownBlocks";

/* ── Block Components ─────────────────────────────────────────── */

function BlockActions({ onMoveUp, onMoveDown, onRemove, isFirst, isLast }) {
  return (
    <div className="rich-block-actions">
      {!isFirst && (
        <button type="button" onClick={onMoveUp} title="เลื่อนขึ้น">
          ↑
        </button>
      )}
      {!isLast && (
        <button type="button" onClick={onMoveDown} title="เลื่อนลง">
          ↓
        </button>
      )}
      <button type="button" onClick={onRemove} className="rich-block-delete" title="ลบ">
        ×
      </button>
    </div>
  );
}

function TextBlock({ block, onChange, onRemove, onMoveUp, onMoveDown, isFirst, isLast }) {
  const ref = useRef(null);

  const handleToolbar = (action) => {
    const ta = ref.current;
    if (!ta) return;
    let next;
    switch (action) {
      case "bold":
        next = wrapSelection(ta, "**", "**");
        break;
      case "italic":
        next = wrapSelection(ta, "*", "*");
        break;
      case "bullet":
        next = prefixLines(ta, "- ");
        break;
      case "number":
        next = prefixLines(ta, (i) => `${i + 1}. `);
        break;
      case "link": {
        const { selectionStart: s, selectionEnd: e, value } = ta;
        const selected = value.slice(s, e) || "ข้อความ";
        ta.setRangeText(`[${selected}](url)`, s, e, "select");
        ta.focus();
        next = ta.value;
        break;
      }
      default:
        return;
    }
    onChange({ ...block, content: next });
  };

  const lineCount = (block.content || "").split("\n").length;

  return (
    <div className="rich-block rich-block-text">
      <div className="rich-block-head">
        <span className="rich-block-icon">📝</span>
        <span className="rich-block-label">ข้อความ</span>
        <BlockActions {...{ onMoveUp, onMoveDown, onRemove, isFirst, isLast }} />
      </div>
      <div className="rich-text-toolbar">
        <button type="button" onClick={() => handleToolbar("bold")} title="ตัวหนา">
          <b>B</b>
        </button>
        <button type="button" onClick={() => handleToolbar("italic")} title="ตัวเอียง">
          <i>I</i>
        </button>
        <span className="toolbar-divider" />
        <button type="button" onClick={() => handleToolbar("bullet")} title="รายการ">
          • List
        </button>
        <button type="button" onClick={() => handleToolbar("number")} title="ลำดับ">
          1. List
        </button>
        <span className="toolbar-divider" />
        <button type="button" onClick={() => handleToolbar("link")} title="ลิงก์">
          🔗 Link
        </button>
      </div>
      <textarea
        ref={ref}
        value={block.content}
        onChange={(e) => onChange({ ...block, content: e.target.value })}
        placeholder="พิมพ์เนื้อหาที่นี่..."
        rows={Math.max(3, lineCount + 1)}
      />
    </div>
  );
}

function ImageBlock({ block, onChange, onRemove, onMoveUp, onMoveDown, isFirst, isLast, images, onUploadImage }) {
  const [uploading, setUploading] = useState(false);
  const resolvedUrl =
    images?.[block.url] || images?.[decodeURIComponent(block.url || "")] || block.url;

  const handleFileSelect = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !onUploadImage) return;
    setUploading(true);
    try {
      const result = await onUploadImage(file);
      if (result) {
        onChange({ ...block, alt: result.filename, url: result.encodedFilename });
      }
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="rich-block rich-block-image">
      <div className="rich-block-head">
        <span className="rich-block-icon">🖼️</span>
        <span className="rich-block-label">รูปภาพ</span>
        <BlockActions {...{ onMoveUp, onMoveDown, onRemove, isFirst, isLast }} />
      </div>
      <div className="rich-block-body">
        {resolvedUrl && (
          <img src={resolvedUrl} alt={block.alt || ""} className="rich-image-preview" />
        )}
        <label className="rich-upload-button">
          {uploading ? "กำลังอัพโหลด..." : "📤 เลือกไฟล์รูปภาพ"}
          <input
            type="file"
            accept="image/*"
            onChange={handleFileSelect}
            disabled={uploading}
            style={{ display: "none" }}
          />
        </label>
        <div className="rich-field-row">
          <label>ชื่อรูป</label>
          <input
            value={block.alt || ""}
            onChange={(e) => onChange({ ...block, alt: e.target.value })}
            placeholder="คำอธิบายรูปภาพ"
          />
        </div>
        <div className="rich-field-row">
          <label>ไฟล์/URL</label>
          <input
            value={block.url || ""}
            onChange={(e) => onChange({ ...block, url: e.target.value })}
            placeholder="ชื่อไฟล์ที่อัพโหลด หรือ URL"
          />
        </div>
      </div>
    </div>
  );
}

function VideoBlock({ block, onChange, onRemove, onMoveUp, onMoveDown, isFirst, isLast }) {
  const embedUrl = useMemo(() => {
    const url = block.url || "";
    const yt = url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/))([^&?#]+)/);
    if (yt) return `https://www.youtube.com/embed/${yt[1]}`;
    return null;
  }, [block.url]);

  return (
    <div className="rich-block rich-block-video">
      <div className="rich-block-head">
        <span className="rich-block-icon">🎬</span>
        <span className="rich-block-label">วิดีโอ</span>
        <BlockActions {...{ onMoveUp, onMoveDown, onRemove, isFirst, isLast }} />
      </div>
      <div className="rich-block-body">
        <div className="rich-field-row">
          <label>ชื่อวิดีโอ</label>
          <input
            value={block.title || ""}
            onChange={(e) => onChange({ ...block, title: e.target.value })}
            placeholder="วิดีโอการสอน"
          />
        </div>
        <div className="rich-field-row">
          <label>ลิงก์</label>
          <input
            value={block.url || ""}
            onChange={(e) => onChange({ ...block, url: e.target.value })}
            placeholder="https://youtube.com/..."
          />
        </div>
        {embedUrl && (
          <div className="rich-video-preview">
            <iframe src={embedUrl} title={block.title || "วิดีโอ"} allowFullScreen />
          </div>
        )}
      </div>
    </div>
  );
}

function QuestionBlock({ block, onChange, onRemove, onMoveUp, onMoveDown, isFirst, isLast }) {
  return (
    <div className="rich-block rich-block-question">
      <div className="rich-block-head">
        <span className="rich-block-icon">❓</span>
        <span className="rich-block-label">คำถาม</span>
        <BlockActions {...{ onMoveUp, onMoveDown, onRemove, isFirst, isLast }} />
      </div>
      <div className="rich-block-body">
        <div className="rich-field-row">
          <label>คำถาม</label>
          <input
            value={block.question || ""}
            onChange={(e) => onChange({ ...block, question: e.target.value })}
            placeholder="พิมพ์คำถาม"
          />
        </div>
        <div className="rich-field-row">
          <label>คำตอบ</label>
          <input
            value={block.answer || ""}
            onChange={(e) => onChange({ ...block, answer: e.target.value })}
            placeholder="พิมพ์คำตอบที่ถูกต้อง"
          />
        </div>
        <div className="rich-field-row rich-field-short">
          <label>คะแนน</label>
          <input
            type="number"
            min={1}
            value={block.score || 10}
            onChange={(e) => onChange({ ...block, score: +e.target.value })}
          />
        </div>
      </div>
    </div>
  );
}

const CODE_LANGUAGES = [
  { value: "", label: "Plain Text" },
  { value: "javascript", label: "JavaScript" },
  { value: "python", label: "Python" },
  { value: "html", label: "HTML" },
  { value: "css", label: "CSS" },
  { value: "sql", label: "SQL" },
  { value: "bash", label: "Bash / Shell" },
  { value: "json", label: "JSON" },
  { value: "go", label: "Go" },
  { value: "java", label: "Java" },
  { value: "csharp", label: "C#" },
  { value: "yaml", label: "YAML" },
];

function CodeBlock({ block, onChange, onRemove, onMoveUp, onMoveDown, isFirst, isLast }) {
  const lineCount = (block.content || "").split("\n").length;

  return (
    <div className="rich-block rich-block-code">
      <div className="rich-block-head">
        <span className="rich-block-icon">{"</>"}</span>
        <span className="rich-block-label">โค้ด</span>
        <select
          className="rich-code-lang-select"
          value={block.language || ""}
          onChange={(e) => onChange({ ...block, language: e.target.value })}
        >
          {CODE_LANGUAGES.map((lang) => (
            <option key={lang.value} value={lang.value}>
              {lang.label}
            </option>
          ))}
        </select>
        <BlockActions {...{ onMoveUp, onMoveDown, onRemove, isFirst, isLast }} />
      </div>
      <textarea
        className="rich-code-textarea"
        value={block.content || ""}
        onChange={(e) => onChange({ ...block, content: e.target.value })}
        placeholder="พิมพ์โค้ดที่นี่..."
        rows={Math.max(3, lineCount + 1)}
        spellCheck={false}
      />
    </div>
  );
}

function DividerBlock({ onRemove, onMoveUp, onMoveDown, isFirst, isLast }) {
  return (
    <div className="rich-block rich-block-divider">
      <div className="rich-block-head">
        <span className="rich-block-icon">—</span>
        <span className="rich-block-label">เส้นคั่น</span>
        <BlockActions {...{ onMoveUp, onMoveDown, onRemove, isFirst, isLast }} />
      </div>
      <hr className="rich-divider-line" />
    </div>
  );
}

/* ── Add Block menu ───────────────────────────────────────────── */

const BLOCK_TYPES = [
  { type: "text", icon: "📝", label: "ข้อความ" },
  { type: "image", icon: "🖼️", label: "รูปภาพ" },
  { type: "video", icon: "🎬", label: "วิดีโอ" },
  { type: "question", icon: "❓", label: "คำถาม" },
  { type: "code", icon: "</>", label: "โค้ด" },
  { type: "divider", icon: "—", label: "เส้นคั่น" },
];

function AddBlockMenu({ onAdd }) {
  const [open, setOpen] = useState(false);

  const add = (type) => {
    onAdd(createBlock(type));
    setOpen(false);
  };

  return (
    <div className="rich-add-block">
      <button
        type="button"
        className="rich-add-button"
        onClick={() => setOpen((v) => !v)}
        onBlur={() => setTimeout(() => setOpen(false), 180)}
      >
        + เพิ่มเนื้อหา
      </button>
      {open && (
        <div className="rich-add-menu">
          {BLOCK_TYPES.map((bt) => (
            <button key={bt.type} type="button" onMouseDown={() => add(bt.type)}>
              {bt.icon} {bt.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/* ── Block renderer ───────────────────────────────────────────── */

function renderBlock(block, index, total, handlers) {
  const common = {
    block,
    onChange: handlers.onChange,
    onRemove: handlers.onRemove,
    onMoveUp: handlers.onMoveUp,
    onMoveDown: handlers.onMoveDown,
    isFirst: index === 0,
    isLast: index === total - 1,
  };

  switch (block.type) {
    case "text":
      return <TextBlock {...common} />;
    case "image":
      return <ImageBlock {...common} images={handlers.images} onUploadImage={handlers.onUploadImage} />;
    case "video":
      return <VideoBlock {...common} />;
    case "question":
      return <QuestionBlock {...common} />;
    case "code":
      return <CodeBlock {...common} />;
    case "divider":
      return <DividerBlock {...common} />;
    default:
      return null;
  }
}

/* ── Main component ───────────────────────────────────────────── */

export default function RichContentEditor({ value, onChange, images, onUploadImage }) {
  const metaRef = useRef(extractMeta(value || ""));
  const [blocks, setBlocks] = useState(() => parseBlocks(value));
  const blocksRef = useRef(blocks);
  const lastExternalValue = useRef(value);

  // Re-parse when value changes externally (subtopic switch, toolbar insert, etc.)
  useEffect(() => {
    const norm = (v) => (v || "").trim();
    if (norm(value) !== norm(lastExternalValue.current)) {
      metaRef.current = extractMeta(value || "");
      const parsed = parseBlocks(value);
      setBlocks(parsed);
      blocksRef.current = parsed;
      lastExternalValue.current = value;
    }
  }, [value]);

  const emitChange = useCallback(
    (nextBlocks) => {
      blocksRef.current = nextBlocks;
      setBlocks(nextBlocks);
      const md = toMarkdown(nextBlocks, metaRef.current);
      lastExternalValue.current = md;
      onChange(md);
    },
    [onChange],
  );

  const updateBlock = useCallback(
    (index, nextBlock) => {
      const next = [...blocksRef.current];
      next[index] = nextBlock;
      emitChange(next);
    },
    [emitChange],
  );

  const removeBlock = useCallback(
    (index) => {
      const next = blocksRef.current.filter((_, i) => i !== index);
      if (next.length === 0) next.push(createBlock("text"));
      emitChange(next);
    },
    [emitChange],
  );

  const moveBlock = useCallback(
    (index, direction) => {
      const next = [...blocksRef.current];
      const target = index + direction;
      if (target < 0 || target >= next.length) return;
      [next[index], next[target]] = [next[target], next[index]];
      emitChange(next);
    },
    [emitChange],
  );

  const insertBlockAfter = useCallback(
    (index, block) => {
      const next = [...blocksRef.current];
      next.splice(index + 1, 0, block);
      emitChange(next);
    },
    [emitChange],
  );

  return (
    <div className="rich-editor">
      {blocks.map((block, i) => (
        <div key={block.id} className="rich-editor-slot">
          {renderBlock(block, i, blocks.length, {
            onChange: (b) => updateBlock(i, b),
            onRemove: () => removeBlock(i),
            onMoveUp: () => moveBlock(i, -1),
            onMoveDown: () => moveBlock(i, 1),
            images,
            onUploadImage,
          })}
          <AddBlockMenu onAdd={(b) => insertBlockAfter(i, b)} />
        </div>
      ))}
    </div>
  );
}
