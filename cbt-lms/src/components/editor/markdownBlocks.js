/* ── Block ID generator ───────────────────────────────────────── */
let _blockId = 0;
export const nextId = () => `blk-${++_blockId}-${Date.now()}`;

/* ── Parse / serialize helpers ────────────────────────────────── */

export function extractMeta(md) {
  let score = null;
  let minTime = null;
  const s = (md || "").match(/^\s*-\s*\[SCORE\]\s*(\d+)/m);
  const m = (md || "").match(/^\s*-\s*\[MINTIME\]\s*(\d+)/m);
  if (s) score = parseInt(s[1]);
  if (m) minTime = parseInt(m[1]);
  return { score, minTime };
}

export function parseBlocks(md) {
  if (!md?.trim()) return [{ type: "text", content: "", id: nextId() }];

  const lines = md.split("\n");
  const blocks = [];
  let buf = [];
  let inCode = false;
  let codeLang = "";
  let codeLines = [];

  const flush = () => {
    const t = buf.join("\n").trim();
    if (t) blocks.push({ type: "text", content: t, id: nextId() });
    buf = [];
  };

  for (const line of lines) {
    const tr = line.trim();

    // Code fence toggle
    if (/^```/.test(tr)) {
      if (!inCode) {
        flush();
        inCode = true;
        codeLang = tr.slice(3).trim();
        codeLines = [];
        continue;
      } else {
        blocks.push({
          type: "code",
          language: codeLang,
          content: codeLines.join("\n"),
          id: nextId(),
        });
        inCode = false;
        codeLang = "";
        codeLines = [];
        continue;
      }
    }

    if (inCode) {
      codeLines.push(line);
      continue;
    }

    // Skip metadata
    if (/^-\s*\[SCORE\]\s*\d+/i.test(tr) || /^-\s*\[MINTIME\]\s*\d+/i.test(tr)) continue;

    // Question
    if (/^-\s*\[Q\]\s/i.test(tr)) {
      flush();
      const m = tr.match(/^-\s*\[Q\]\s*(.+?)\s*::\s*(.+?)(?:\s*::\s*(\d+))?\s*$/i);
      if (m) {
        blocks.push({
          type: "question",
          question: m[1].trim(),
          answer: m[2].trim(),
          score: parseInt(m[3] ?? "10"),
          id: nextId(),
        });
      }
      continue;
    }

    // Image (whole line)
    if (/^!\[.*?\]\(.*?\)\s*$/.test(tr)) {
      flush();
      const m = tr.match(/^!\[(.*?)\]\((.*?)\)$/);
      if (m) blocks.push({ type: "image", alt: m[1], url: m[2], id: nextId() });
      continue;
    }

    // Video
    if (/^\[video:\s*.*?\]\(.*?\)\s*$/i.test(tr)) {
      flush();
      const m = tr.match(/^\[video:\s*(.*?)\]\((.*?)\)$/i);
      if (m) blocks.push({ type: "video", title: m[1], url: m[2], id: nextId() });
      continue;
    }

    // Divider
    if (/^-{3,}$/.test(tr)) {
      flush();
      blocks.push({ type: "divider", id: nextId() });
      continue;
    }

    buf.push(line);
  }

  // Flush unclosed code block as text
  if (inCode && codeLines.length) {
    blocks.push({ type: "code", language: codeLang, content: codeLines.join("\n"), id: nextId() });
  }

  flush();
  if (!blocks.length) blocks.push({ type: "text", content: "", id: nextId() });
  return blocks;
}

export function toMarkdown(blocks, meta) {
  let md = blocks
    .map((b) => {
      switch (b.type) {
        case "text":
          return b.content || "";
        case "image":
          return `![${b.alt || ""}](${b.url || ""})`;
        case "video":
          return `[video: ${b.title || "วิดีโอ"}](${b.url || ""})`;
        case "question":
          return `- [Q] ${(b.question || "").replaceAll("::", "-")} :: ${(b.answer || "").replaceAll("::", "-")} :: ${b.score || 10}`;
        case "code":
          return "```" + (b.language || "") + "\n" + (b.content || "") + "\n```";
        case "divider":
          return "---";
        default:
          return "";
      }
    })
    .join("\n\n");

  const metaParts = [];
  if (meta?.score != null) metaParts.push(`- [SCORE] ${meta.score}`);
  if (meta?.minTime != null && meta.minTime > 0) metaParts.push(`- [MINTIME] ${meta.minTime}`);
  if (metaParts.length) md += "\n\n" + metaParts.join("\n");

  return md;
}

/* ── Textarea helpers ─────────────────────────────────────────── */

export function wrapSelection(textarea, before, after) {
  const { selectionStart: s, selectionEnd: e, value } = textarea;
  const selected = value.slice(s, e);
  const replacement = before + (selected || "ข้อความ") + after;
  textarea.setRangeText(replacement, s, e, "select");
  textarea.focus();
  return textarea.value;
}

export function prefixLines(textarea, prefix) {
  const { selectionStart: s, selectionEnd: e, value } = textarea;
  const lineStart = value.lastIndexOf("\n", s - 1) + 1;
  const lineEnd = value.indexOf("\n", e);
  const end = lineEnd === -1 ? value.length : lineEnd;
  const selection = value.slice(lineStart, end);
  const prefixed = selection
    .split("\n")
    .map((l, i) => {
      const stripped = l.replace(/^(\d+\.\s|- )/, "");
      return typeof prefix === "function" ? prefix(i) + stripped : prefix + stripped;
    })
    .join("\n");
  textarea.setRangeText(prefixed, lineStart, end, "select");
  textarea.focus();
  return textarea.value;
}

export function createBlock(type) {
  const id = nextId();
  switch (type) {
    case "text":
      return { type: "text", content: "", id };
    case "image":
      return { type: "image", alt: "", url: "", id };
    case "video":
      return { type: "video", title: "วิดีโอการสอน", url: "", id };
    case "question":
      return { type: "question", question: "", answer: "", score: 10, id };
    case "code":
      return { type: "code", language: "", content: "", id };
    case "divider":
      return { type: "divider", id };
    default:
      return { type: "text", content: "", id };
  }
}
