import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import CodeMirror from "@uiw/react-codemirror";
import { markdown as mdLang } from "@codemirror/lang-markdown";
import MarkdownContent from "../components/markdown/MarkdownContent";
import TableOfContents from "../components/markdown/TableOfContents";
import {
  deleteHeadingById,
  getSubtopicPages,
  moveMainSectionBefore,
  moveSubSectionBefore,
  renameHeadingById,
  updateSubtopicBodyMarkdown,
} from "../components/markdown/headingUtils";
import { ensureCoverImage, fileToDataUrl } from "../services/imageService";

const getSkillRewards = (draft) => {
  if (Array.isArray(draft.skillRewards) && draft.skillRewards.length > 0) {
    return draft.skillRewards.map((reward) => ({
      skill: String(reward?.skill ?? "").trim(),
      points: Number(reward?.points ?? 0),
    }));
  }
  return (Array.isArray(draft.skills) ? draft.skills : []).map((skill) => ({
    skill: String(skill ?? "").trim(),
    points: Number(draft.skillPoints ?? 20),
  }));
};

export default function EditorPage({ draft, onBack, onChangeDraft, onSaveDraft }) {
  const editorViewRef = useRef(null);
  const [activeSubtopicId, setActiveSubtopicId] = useState("");
  const [saveMessage, setSaveMessage] = useState("");
  const [showPreview, setShowPreview] = useState(false);
  const subtopicPages = useMemo(() => getSubtopicPages(draft.content, draft.title), [draft.content, draft.title]);
  const selectedSubtopic = subtopicPages.find((subtopic) => subtopic.id === activeSubtopicId) ?? subtopicPages[0];
  const selectedSubtopicBody = selectedSubtopic?.bodyMarkdown ?? "";
  const skillRewards = useMemo(() => getSkillRewards(draft), [draft]);

  const captureEditorView = useCallback((view) => {
    editorViewRef.current = view;
  }, []);

  const updateSelectedSubtopicBody = useCallback(
    (nextBodyMarkdown) => {
      if (!selectedSubtopic) {
        return;
      }
      const nextContent = updateSubtopicBodyMarkdown(draft.content, selectedSubtopic.id, nextBodyMarkdown);
      if (nextContent !== draft.content) {
        onChangeDraft("content", nextContent);
      }
    },
    [draft.content, onChangeDraft, selectedSubtopic],
  );

  const insertAtCursor = useCallback(
    (text) => {
      const view = editorViewRef.current;
      if (!view) {
        const spacer = selectedSubtopicBody.endsWith("\n") || selectedSubtopicBody.length === 0 ? "" : "\n";
        updateSelectedSubtopicBody(`${selectedSubtopicBody}${spacer}${text}`);
        return;
      }

      const { from, to } = view.state.selection.main;
      view.dispatch({
        changes: { from, to, insert: text },
        selection: { anchor: from + text.length },
        scrollIntoView: true,
      });
      view.focus();
    },
    [selectedSubtopicBody, updateSelectedSubtopicBody],
  );

  const insertMainSection = () => {
    onChangeDraft("content", `${draft.content}\n\n## หัวข้อหลักใหม่\n\n### หัวข้อย่อย\n\nใส่รายละเอียดหัวข้อย่อย\n`);
  };

  const insertSubSection = () => {
    if (!selectedSubtopic?.mainText) {
      insertAtCursor("\n### หัวข้อย่อย\n\nใส่รายละเอียดหัวข้อย่อย\n");
      return;
    }

    const marker = `## ${selectedSubtopic.mainText}`;
    const markerIndex = draft.content.indexOf(marker);
    if (markerIndex < 0) {
      insertAtCursor("\n### หัวข้อย่อย\n\nใส่รายละเอียดหัวข้อย่อย\n");
      return;
    }
    const insertIndex = markerIndex + marker.length;
    const nextContent = `${draft.content.slice(0, insertIndex)}\n\n### หัวข้อย่อยใหม่\n\nใส่รายละเอียดหัวข้อย่อย\n${draft.content.slice(insertIndex)}`;
    onChangeDraft("content", nextContent);
  };

  const insertVideoLink = () => {
    const url = window.prompt("วางลิงก์ YouTube");
    if (!url) {
      return;
    }

    const title = window.prompt("ชื่อวิดีโอ (ไม่กรอกได้)", "วิดีโอการสอน") ?? "วิดีโอการสอน";
    insertAtCursor(`\n[video: ${title.trim() || "วิดีโอการสอน"}](${url.trim()})\n`);
  };

  const insertQuestionTemplate = () => {
    insertAtCursor("\n- [Q] คำถามที่ต้องตอบ :: คำตอบที่ถูกต้อง :: 10\n");
  };

  const insertSubtopicScore = () => {
    insertAtCursor("\n- [SCORE] 20\n");
  };

  useEffect(() => {
    if (!subtopicPages.length) {
      setActiveSubtopicId("");
      return;
    }

    const exists = subtopicPages.some((subtopic) => subtopic.id === activeSubtopicId);
    if (!exists) {
      setActiveSubtopicId(subtopicPages[0].id);
    }
  }, [activeSubtopicId, subtopicPages]);

  const selectSubtopic = useCallback((subtopicId) => {
    setActiveSubtopicId(subtopicId);
  }, []);

  const jumpSubtopic = (offset) => {
    if (!selectedSubtopic) {
      return;
    }
    const currentIndex = subtopicPages.findIndex((subtopic) => subtopic.id === selectedSubtopic.id);
    const nextSubtopic = subtopicPages[currentIndex + offset];
    if (nextSubtopic) {
      setActiveSubtopicId(nextSubtopic.id);
    }
  };

  const handleSave = () => {
    const fallbackSeed = draft.sourceId || draft.id || `course-${Date.now()}`;
    const nextImage = ensureCoverImage(draft.image, fallbackSeed);
    if (nextImage !== draft.image) {
      onChangeDraft("image", nextImage);
    }
    const success = onSaveDraft?.();
    setSaveMessage(success ? "บันทึกเนื้อหาเรียบร้อยแล้ว" : "บันทึกไม่สำเร็จ");
  };

  const handleUploadCoverImage = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) {
      return;
    }
    try {
      const dataUrl = await fileToDataUrl(file);
      onChangeDraft("image", dataUrl);
      setSaveMessage("");
    } catch {
      setSaveMessage("อัปโหลดรูปไม่สำเร็จ");
    }
  };

  const handleMoveMainBefore = (sourceHeadingId, targetHeadingId) => {
    const nextContent = moveMainSectionBefore(draft.content, sourceHeadingId, targetHeadingId);
    if (nextContent !== draft.content) {
      onChangeDraft("content", nextContent);
    }
  };

  const handleMoveSubBefore = (sourceHeadingId, targetHeadingId) => {
    const nextContent = moveSubSectionBefore(draft.content, sourceHeadingId, targetHeadingId);
    if (nextContent !== draft.content) {
      onChangeDraft("content", nextContent);
    }
  };

  const handleRenameHeading = (headingId, nextTitle) => {
    const nextContent = renameHeadingById(draft.content, headingId, nextTitle);
    if (nextContent !== draft.content) {
      onChangeDraft("content", nextContent);
    }
  };

  const handleDeleteHeading = (headingId) => {
    const nextContent = deleteHeadingById(draft.content, headingId);
    if (nextContent !== draft.content) {
      onChangeDraft("content", nextContent);
    }
  };

  const updateSkillRewardAt = (index, nextReward) => {
    const nextRewards = skillRewards.map((reward, rewardIndex) =>
      rewardIndex === index
        ? {
            skill: String(nextReward.skill ?? "").trim(),
            points: Number(nextReward.points ?? 0),
          }
        : reward,
    );
    onChangeDraft("skillRewards", nextRewards);
    onChangeDraft(
      "skills",
      nextRewards.map((reward) => reward.skill).filter(Boolean),
    );
  };

  const removeSkillRewardAt = (index) => {
    const nextRewards = skillRewards.filter((_, rewardIndex) => rewardIndex !== index);
    onChangeDraft("skillRewards", nextRewards);
    onChangeDraft(
      "skills",
      nextRewards.map((reward) => reward.skill).filter(Boolean),
    );
  };

  const addSkillReward = () => {
    const nextRewards = [...skillRewards, { skill: "", points: 20 }];
    onChangeDraft("skillRewards", nextRewards);
  };

  return (
    <section className="workspace-content">
      <header className="content-header editor-head">
        <div>
          <h1>หน้าแก้เนื้อหา</h1>
          <p>แก้ไขเฉพาะหัวข้อย่อยที่เลือกจาก Table of Contents</p>
        </div>
        <div className="editor-header-actions">
          <button type="button" className="back-button" onClick={() => setShowPreview((prev) => !prev)}>
            {showPreview ? "ซ่อน Live Preview" : "แสดง Live Preview"}
          </button>
          <button type="button" className="save-button" onClick={handleSave}>
            บันทึกเนื้อหา
          </button>
          <button type="button" className="back-button" onClick={onBack}>
            กลับหน้า Lobby
          </button>
        </div>
      </header>

      {saveMessage ? <p className="save-message">{saveMessage}</p> : null}

      <div className="editor-title-box">
        <label htmlFor="editor-title">ชื่อเนื้อหา</label>
        <input
          id="editor-title"
          value={draft.title}
          onChange={(event) => onChangeDraft("title", event.target.value)}
        />
      </div>

      <div className="editor-course-meta">
        <div className="editor-title-box">
          <label htmlFor="editor-creator">ผู้สร้าง</label>
          <input
            id="editor-creator"
            value={draft.creator ?? ""}
            onChange={(event) => onChangeDraft("creator", event.target.value)}
          />
        </div>
        <div className="editor-title-box">
          <label htmlFor="editor-status">สถานะคอร์ส</label>
          <select
            id="editor-status"
            value={draft.status ?? "active"}
            onChange={(event) => onChangeDraft("status", event.target.value)}
          >
            <option value="inprogress">inprogress</option>
            <option value="active">active</option>
            <option value="inactive">inactive</option>
          </select>
        </div>
        <div className="editor-title-box editor-meta-full">
          <label htmlFor="editor-description">รายละเอียดคอร์ส</label>
          <textarea
            id="editor-description"
            value={draft.description ?? ""}
            onChange={(event) => onChangeDraft("description", event.target.value)}
            rows={3}
          />
        </div>
        <div className="editor-title-box editor-meta-full">
          <label htmlFor="editor-image">ลิงก์รูปปกคอร์ส</label>
          <input
            id="editor-image"
            value={draft.image ?? ""}
            onChange={(event) => onChangeDraft("image", event.target.value)}
            placeholder="https://..."
          />
          <div className="default-password-row">
            <input id="editor-image-upload" type="file" accept="image/*" onChange={handleUploadCoverImage} />
            <button
              type="button"
              className="manage-button"
              onClick={() => onChangeDraft("image", "")}
            >
              ล้างรูป (ใช้รูปสุ่ม)
            </button>
          </div>
        </div>
      </div>

      <div className="editor-skill-card">
        <div className="editor-skill-head">
          <h3>แท็กทักษะและคะแนนทักษะของคอร์ส</h3>
          <button type="button" className="create-content-button" onClick={addSkillReward}>
            + เพิ่มทักษะ
          </button>
        </div>
        {skillRewards.length ? (
          <div className="editor-skill-grid">
            {skillRewards.map((reward, index) => (
              <div key={`skill-reward-${index}`} className="editor-skill-row">
                <input
                  value={reward.skill}
                  onChange={(event) =>
                    updateSkillRewardAt(index, { ...reward, skill: event.target.value })
                  }
                  placeholder="เช่น Log Analysis"
                />
                <input
                  type="number"
                  min={0}
                  value={Number.isFinite(reward.points) ? reward.points : 0}
                  onChange={(event) =>
                    updateSkillRewardAt(index, { ...reward, points: Number(event.target.value) })
                  }
                  placeholder="คะแนน"
                />
                <button type="button" className="toc-delete-button" onClick={() => removeSkillRewardAt(index)}>
                  ลบ
                </button>
              </div>
            ))}
          </div>
        ) : (
          <p className="toc-empty">ยังไม่ได้เพิ่มแท็กทักษะ</p>
        )}
      </div>

      <div className="editor-toolbar">
        <button type="button" onClick={insertMainSection}>
          เพิ่มหัวข้อหลัก
        </button>
        <button type="button" onClick={insertSubSection}>
          เพิ่มหัวข้อย่อย
        </button>
        <button type="button" onClick={insertVideoLink}>
          แทรกวิดีโอ
        </button>
        <button type="button" onClick={insertQuestionTemplate}>
          เพิ่มคำถามหัวข้อย่อย
        </button>
        <button type="button" onClick={insertSubtopicScore}>
          กำหนดคะแนนหัวข้อย่อย
        </button>
      </div>

      <div className="editor-hint">
        รูปแบบวิดีโอ: `[video: ชื่อวิดีโอ](ลิงก์ YouTube)` | รูปแบบคำถาม: `- [Q] คำถาม :: คำตอบ :: คะแนน` |
        คะแนนหัวข้อ: `- [SCORE] 20` | ลากหัวข้อในสารบัญด้วยเมาส์เพื่อจัดเรียง
      </div>

      <div className={`editor-split ${showPreview ? "preview-mode" : "editor-mode"}`}>
        <TableOfContents
          title="Table of Contents"
          content={draft.content}
          activeHeadingId={selectedSubtopic?.id ?? ""}
          onSelectHeading={selectSubtopic}
          editable
          onMoveMainBefore={handleMoveMainBefore}
          onMoveSubBefore={handleMoveSubBefore}
          onRenameHeading={handleRenameHeading}
          onDeleteHeading={handleDeleteHeading}
        />

        {!showPreview ? (
          <div className="editor-panel">
            <h3>
              Markdown Editor
              {selectedSubtopic ? `: ${selectedSubtopic.subText}` : ""}
            </h3>
            <CodeMirror
              key={selectedSubtopic?.id ?? "no-subtopic"}
              value={selectedSubtopicBody}
              height="420px"
              extensions={[mdLang()]}
              onCreateEditor={captureEditorView}
              onChange={(value) => updateSelectedSubtopicBody(value)}
              theme="dark"
              basicSetup={{
                lineNumbers: true,
                foldGutter: false,
                highlightActiveLine: true,
              }}
            />
          </div>
        ) : null}

        {showPreview ? (
          <div className="preview-panel">
            <h3>Live Preview</h3>
            {selectedSubtopic ? (
              <div className="subtopic-nav">
                <button type="button" className="subtopic-nav-button" onClick={() => jumpSubtopic(-1)}>
                  ก่อนหน้า
                </button>
                <span>
                  {selectedSubtopic.mainText} / {selectedSubtopic.subText}
                </span>
                <button type="button" className="subtopic-nav-button" onClick={() => jumpSubtopic(1)}>
                  ถัดไป
                </button>
              </div>
            ) : null}
            <div className="preview-body">
              <MarkdownContent content={selectedSubtopic?.content ?? draft.content} />
            </div>
          </div>
        ) : null}
      </div>
    </section>
  );
}
