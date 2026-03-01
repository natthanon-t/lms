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

export default function EditorPage({ draft, onBack, onChangeDraft, onSaveDraft, onDeleteContent, isAdmin = false }) {
  const editorViewRef = useRef(null);
  const [activeSubtopicId, setActiveSubtopicId] = useState("");
  const [saveMessage, setSaveMessage] = useState("");
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showQuestionModal, setShowQuestionModal] = useState(false);
  const [showVideoModal, setShowVideoModal] = useState(false);
  const [showSubtopicModal, setShowSubtopicModal] = useState(false);
  const [questionText, setQuestionText] = useState("");
  const [answerText, setAnswerText] = useState("");
  const [questionScore, setQuestionScore] = useState(10);
  const [videoTitle, setVideoTitle] = useState("วิดีโอการสอน");
  const [videoUrl, setVideoUrl] = useState("");
  const [subtopicTitle, setSubtopicTitle] = useState("หัวข้อย่อยใหม่");
  const [subtopicScore, setSubtopicScore] = useState(20);
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
    setShowSubtopicModal(true);
  };

  const closeSubtopicModal = () => {
    setShowSubtopicModal(false);
    setSubtopicTitle("หัวข้อย่อยใหม่");
    setSubtopicScore(20);
  };

  const handleInsertSubSectionFromModal = () => {
    const normalizedTitle = String(subtopicTitle ?? "").trim();
    const normalizedScore = Number(subtopicScore);
    if (!normalizedTitle || !Number.isFinite(normalizedScore) || normalizedScore <= 0) {
      setSaveMessage("กรุณากรอกชื่อหัวข้อย่อยและคะแนนให้ถูกต้อง");
      return;
    }

    const subtopicBlock = `\n\n### ${normalizedTitle}\n\nใส่รายละเอียดหัวข้อย่อย\n\n- [SCORE] ${Math.round(normalizedScore)}\n`;
    if (!selectedSubtopic?.mainText) {
      insertAtCursor(subtopicBlock);
      setSaveMessage("");
      closeSubtopicModal();
      return;
    }

    const marker = `## ${selectedSubtopic.mainText}`;
    const markerIndex = draft.content.indexOf(marker);
    if (markerIndex < 0) {
      insertAtCursor(subtopicBlock);
      setSaveMessage("");
      closeSubtopicModal();
      return;
    }
    const insertIndex = markerIndex + marker.length;
    const nextContent = `${draft.content.slice(0, insertIndex)}${subtopicBlock}${draft.content.slice(insertIndex)}`;
    onChangeDraft("content", nextContent);
    setSaveMessage("");
    closeSubtopicModal();
  };

  const insertVideoLink = () => {
    setShowVideoModal(true);
  };

  const closeVideoModal = () => {
    setShowVideoModal(false);
    setVideoTitle("วิดีโอการสอน");
    setVideoUrl("");
  };

  const handleInsertVideoFromModal = () => {
    const normalizedTitle = String(videoTitle ?? "").trim() || "วิดีโอการสอน";
    const normalizedUrl = String(videoUrl ?? "").trim();
    if (!normalizedUrl) {
      setSaveMessage("กรุณากรอกลิงก์วิดีโอ");
      return;
    }
    insertAtCursor(`\n[video: ${normalizedTitle}](${normalizedUrl})\n`);
    setSaveMessage("");
    closeVideoModal();
  };

  const closeQuestionModal = () => {
    setShowQuestionModal(false);
    setQuestionText("");
    setAnswerText("");
    setQuestionScore(10);
  };

  const insertQuestionTemplate = () => {
    setShowQuestionModal(true);
  };

  const handleInsertQuestionFromModal = () => {
    const normalizedQuestion = String(questionText ?? "").trim().replaceAll("::", "-");
    const normalizedAnswer = String(answerText ?? "").trim().replaceAll("::", "-");
    const normalizedScore = Number(questionScore);
    if (!normalizedQuestion || !normalizedAnswer || !Number.isFinite(normalizedScore) || normalizedScore <= 0) {
      setSaveMessage("กรุณากรอกคำถาม คำตอบ และคะแนนให้ถูกต้อง");
      return;
    }
    insertAtCursor(`\n- [Q] ${normalizedQuestion} :: ${normalizedAnswer} :: ${Math.round(normalizedScore)}\n`);
    setSaveMessage("");
    closeQuestionModal();
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

  const handleDeleteContent = async () => {
    const result = await onDeleteContent?.(draft.sourceId || draft.id);
    if (!result?.success) {
      setSaveMessage(result?.message ?? "ลบเนื้อหาไม่สำเร็จ");
      setShowDeleteConfirm(false);
      return;
    }
    setShowDeleteConfirm(false);
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
          <button type="button" className="back-button danger-button" onClick={() => setShowDeleteConfirm(true)}>
            ลบเนื้อหา
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
            {isAdmin && <option value="active">active</option>}
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

      {showQuestionModal ? (
        <div className="modal-backdrop" onClick={closeQuestionModal}>
          <article
            className="info-card confirm-delete-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="add-question-modal-title"
            onClick={(event) => event.stopPropagation()}
          >
            <button
              type="button"
              className="modal-close-button"
              aria-label="ปิดกล่องเพิ่มคำถาม"
              onClick={closeQuestionModal}
            >
              ×
            </button>
            <h3 id="add-question-modal-title">เพิ่มคำถามหัวข้อย่อย</h3>
            <div className="profile-form">
              <label htmlFor="subtopic-question">คำถาม</label>
              <input
                id="subtopic-question"
                type="text"
                value={questionText}
                onChange={(event) => setQuestionText(event.target.value)}
                placeholder="พิมพ์คำถาม"
              />
              <label htmlFor="subtopic-answer">คำตอบ</label>
              <input
                id="subtopic-answer"
                type="text"
                value={answerText}
                onChange={(event) => setAnswerText(event.target.value)}
                placeholder="พิมพ์คำตอบที่ถูกต้อง"
              />
              <label htmlFor="subtopic-question-score">คะแนน</label>
              <input
                id="subtopic-question-score"
                type="number"
                min={1}
                value={questionScore}
                onChange={(event) => setQuestionScore(Number(event.target.value))}
              />
              <div className="profile-action-row">
                <button type="button" className="enter-button" onClick={handleInsertQuestionFromModal}>
                  เพิ่มคำถาม
                </button>
                <button type="button" className="back-button" onClick={closeQuestionModal}>
                  ยกเลิก
                </button>
              </div>
            </div>
          </article>
        </div>
      ) : null}

      {showSubtopicModal ? (
        <div className="modal-backdrop" onClick={closeSubtopicModal}>
          <article
            className="info-card confirm-delete-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="add-subtopic-modal-title"
            onClick={(event) => event.stopPropagation()}
          >
            <button
              type="button"
              className="modal-close-button"
              aria-label="ปิดกล่องเพิ่มหัวข้อย่อย"
              onClick={closeSubtopicModal}
            >
              ×
            </button>
            <h3 id="add-subtopic-modal-title">เพิ่มหัวข้อย่อย</h3>
            <div className="profile-form">
              <label htmlFor="subtopic-title-input">ชื่อหัวข้อย่อย</label>
              <input
                id="subtopic-title-input"
                type="text"
                value={subtopicTitle}
                onChange={(event) => setSubtopicTitle(event.target.value)}
                placeholder="หัวข้อย่อยใหม่"
              />
              <label htmlFor="subtopic-score-input">คะแนน</label>
              <input
                id="subtopic-score-input"
                type="number"
                min={1}
                value={subtopicScore}
                onChange={(event) => setSubtopicScore(Number(event.target.value))}
              />
              <div className="profile-action-row">
                <button type="button" className="enter-button" onClick={handleInsertSubSectionFromModal}>
                  เพิ่มหัวข้อย่อย
                </button>
                <button type="button" className="back-button" onClick={closeSubtopicModal}>
                  ยกเลิก
                </button>
              </div>
            </div>
          </article>
        </div>
      ) : null}

      {showVideoModal ? (
        <div className="modal-backdrop" onClick={closeVideoModal}>
          <article
            className="info-card confirm-delete-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="add-video-modal-title"
            onClick={(event) => event.stopPropagation()}
          >
            <button
              type="button"
              className="modal-close-button"
              aria-label="ปิดกล่องแทรกวิดีโอ"
              onClick={closeVideoModal}
            >
              ×
            </button>
            <h3 id="add-video-modal-title">แทรกวิดีโอ</h3>
            <div className="profile-form">
              <label htmlFor="subtopic-video-title">ชื่อวิดีโอ</label>
              <input
                id="subtopic-video-title"
                type="text"
                value={videoTitle}
                onChange={(event) => setVideoTitle(event.target.value)}
                placeholder="วิดีโอการสอน"
              />
              <label htmlFor="subtopic-video-url">ลิงก์วิดีโอ</label>
              <input
                id="subtopic-video-url"
                type="text"
                value={videoUrl}
                onChange={(event) => setVideoUrl(event.target.value)}
                placeholder="https://..."
              />
              <div className="profile-action-row">
                <button type="button" className="enter-button" onClick={handleInsertVideoFromModal}>
                  แทรกวิดีโอ
                </button>
                <button type="button" className="back-button" onClick={closeVideoModal}>
                  ยกเลิก
                </button>
              </div>
            </div>
          </article>
        </div>
      ) : null}

      {showDeleteConfirm ? (
        <div className="modal-backdrop" onClick={() => setShowDeleteConfirm(false)}>
          <article
            className="info-card confirm-delete-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-content-modal-title"
            onClick={(event) => event.stopPropagation()}
          >
            <button
              type="button"
              className="modal-close-button"
              aria-label="ปิดกล่องยืนยันลบเนื้อหา"
              onClick={() => setShowDeleteConfirm(false)}
            >
              ×
            </button>
            <h3 id="delete-content-modal-title">ยืนยันการลบเนื้อหา</h3>
            <p>ต้องการลบเนื้อหา "{draft.title}" ใช่หรือไม่</p>
            <div className="profile-action-row">
              <button type="button" className="end-exam-button" onClick={handleDeleteContent}>
                ยืนยันลบ
              </button>
              <button type="button" className="back-button" onClick={() => setShowDeleteConfirm(false)}>
                ยกเลิก
              </button>
            </div>
          </article>
        </div>
      ) : null}
    </section>
  );
}
