import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import CodeMirror from "@uiw/react-codemirror";
import { markdown as mdLang } from "@codemirror/lang-markdown";
import MarkdownContent from "../components/markdown/MarkdownContent";
import RichContentEditor from "../components/editor/RichContentEditor";
import TableOfContents from "../components/markdown/TableOfContents";
import {
  deleteHeadingById,
  getSubtopicPages,
  moveMainSectionBefore,
  moveSubSectionBefore,
  moveSubSectionToMain,
  parseMarkdownOutline,
  renameHeadingById,
  swapSubSections,
  updateSubtopicBodyMarkdown,
} from "../components/markdown/headingUtils";
import { ensureCoverImage, fileToDataUrl } from "../services/imageService";
import { getStoredImages, storeImage } from "../services/contentImagesStore";
import {
  fetchCourseImagesApi,
  saveCourseImageApi,
  fetchCourseAttachmentsApi,
  uploadCourseAttachmentApi,
  deleteCourseAttachmentApi,
} from "../services/mediaApiService";
import { normalizeExampleRecord, toCourseDraft } from "../services/courseService";
import { useAuth } from "../contexts/AuthContext";
import { useAppData } from "../contexts/AppDataContext";

function AllowedUsernameInput({ onAdd, users = {}, excluded = [] }) {
  const [value, setValue] = useState("");
  const [open, setOpen] = useState(false);

  const suggestions = useMemo(() => {
    const q = value.trim().toLowerCase();
    if (!q) return [];
    return Object.entries(users)
      .filter(([u, info]) =>
        !excluded.includes(u) &&
        (u.includes(q) || String(info?.name ?? "").toLowerCase().includes(q))
      )
      .slice(0, 8);
  }, [value, users, excluded]);

  const commit = (username) => {
    if (username) { onAdd(username); }
    setValue("");
    setOpen(false);
  };

  return (
    <div className="allowed-user-input-row">
      <div className="allowed-user-autocomplete">
        <input
          type="text"
          value={value}
          onChange={(e) => { setValue(e.target.value); setOpen(true); }}
          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); commit(value.trim().toLowerCase()); } }}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          onFocus={() => { if (value.trim()) setOpen(true); }}
          placeholder="พิมพ์ username หรือชื่อ"
        />
        {open && suggestions.length > 0 && (
          <div className="allowed-user-suggestions">
            {suggestions.map(([u, info]) => (
              <div key={u} className="allowed-user-suggestion-item" onMouseDown={() => commit(u)}>
                <span className="suggestion-username">{u}</span>
                {info?.name && info.name !== u && (
                  <span className="suggestion-name"> — {info.name}</span>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
      <button type="button" className="create-content-button" onClick={() => commit(value.trim().toLowerCase())}>
        + เพิ่ม
      </button>
    </div>
  );
}

function getAttachmentIcon(filename) {
  const ext = String(filename ?? "").split(".").pop().toLowerCase();
  const icons = { pdf: "📄", doc: "📝", docx: "📝", xls: "📊", xlsx: "📊", ppt: "📽️", pptx: "📽️", txt: "📃" };
  return icons[ext] ?? "📎";
}

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

export default function EditorPage() {
  const { courseId } = useParams();
  const navigate = useNavigate();
  const { canManageContent, users } = useAuth();
  const { examples, editorDraft: contextEditorDraft, updateEditorDraft, saveEditorDraft, handleDeleteContent: deleteContentFn } = useAppData();
  const canPublish = canManageContent;

  // Initialize local draft from context/examples
  const [draft, setDraft] = useState(() => {
    const found = examples.find((e) => e.id === courseId);
    return found ? toCourseDraft(normalizeExampleRecord(found)) : contextEditorDraft;
  });

  // Sync draft when examples change (e.g., after saving)
  useEffect(() => {
    const found = examples.find((e) => e.id === courseId);
    if (found) {
      const normalized = toCourseDraft(normalizeExampleRecord(found));
      setDraft((prev) => {
        // Only sync if sourceId matches to avoid overwriting edits
        if (prev.sourceId !== normalized.sourceId) return normalized;
        return prev;
      });
    }
  }, [courseId, examples]);

  const onChangeDraft = useCallback((field, value) => {
    setDraft((prev) => {
      const nextValue =
        field === "image"
          ? ensureCoverImage(value, prev.sourceId || prev.id || `course-${Date.now()}`)
          : value;
      const nextDraft = { ...prev, [field]: nextValue };
      // Keep context in sync for other pages to use
      updateEditorDraft(field, nextValue);
      return nextDraft;
    });
  }, [updateEditorDraft]);

  const onSaveDraft = useCallback(async () => {
    return saveEditorDraft();
  }, [saveEditorDraft]);

  const onDeleteContent = useCallback(async (contentId) => {
    const result = await deleteContentFn(contentId);
    if (result?.success) navigate("/content");
    return result;
  }, [deleteContentFn, navigate]);

  const editorViewRef = useRef(null);
  const [activeSubtopicId, setActiveSubtopicId] = useState("");
  const [saveMessage, setSaveMessage] = useState("");
  const [contentImages, setContentImages] = useState(() => getStoredImages(draft?.sourceId ?? ""));

  useEffect(() => {
    const courseId = draft.sourceId;
    setContentImages(getStoredImages(courseId));
    if (courseId) {
      fetchCourseImagesApi(courseId)
        .then((apiImages) => {
          if (Object.keys(apiImages).length > 0) {
            setContentImages((prev) => ({ ...prev, ...apiImages }));
          }
        })
        .catch(() => {});
      fetchCourseAttachmentsApi(courseId)
        .then(setAttachments)
        .catch(() => {});
    }
  }, [draft.sourceId]);
  const [attachments, setAttachments] = useState([]);
  const [attachmentUploading, setAttachmentUploading] = useState(false);
  const [attachmentMessage, setAttachmentMessage] = useState("");
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
  const [subtopicMinTime, setSubtopicMinTime] = useState(0);
  const [showPreview, setShowPreview] = useState(false);
  const [editorMode, setEditorMode] = useState("visual");
  const subtopicPages = useMemo(() => getSubtopicPages(draft.content, draft.title), [draft.content, draft.title]);
  const selectedSubtopic = subtopicPages.find((subtopic) => subtopic.id === activeSubtopicId) ?? subtopicPages[0];
  const selectedSubtopicBody = selectedSubtopic?.bodyMarkdown ?? "";
  const skillRewards = useMemo(() => getSkillRewards(draft), [draft]);

  // Clear CodeMirror ref when switching to visual mode so insertAtCursor falls back
  useEffect(() => {
    if (editorMode === "visual") editorViewRef.current = null;
  }, [editorMode]);

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

  const updateSubtopicMinTime = useCallback(
    (minutes) => {
      if (!selectedSubtopic) return;
      const value = Math.max(0, Math.round(Number(minutes) || 0));
      const body = selectedSubtopicBody;
      const hasMinTime = /^\s*-\s*\[MINTIME\]\s*\d+\s*$/im.test(body);

      let nextBody;
      if (value > 0 && hasMinTime) {
        nextBody = body.replace(/^(\s*-\s*\[MINTIME\]\s*)\d+(\s*)$/im, `$1${value}$2`);
      } else if (value > 0 && !hasMinTime) {
        const hasScore = /^\s*-\s*\[SCORE\]\s*\d+\s*$/im.test(body);
        if (hasScore) {
          nextBody = body.replace(/^(\s*-\s*\[SCORE\]\s*\d+\s*)$/im, `$1\n- [MINTIME] ${value}`);
        } else {
          const spacer = body.endsWith("\n") || body.length === 0 ? "" : "\n";
          nextBody = `${body}${spacer}- [MINTIME] ${value}\n`;
        }
      } else if (value === 0 && hasMinTime) {
        nextBody = body.replace(/^\s*-\s*\[MINTIME\]\s*\d+\s*\n?/im, "");
      } else {
        return;
      }
      updateSelectedSubtopicBody(nextBody);
    },
    [selectedSubtopic, selectedSubtopicBody, updateSelectedSubtopicBody],
  );

  const updateSubtopicScore = useCallback(
    (score) => {
      if (!selectedSubtopic) return;
      const value = Math.max(0, Math.round(Number(score) || 0));
      const body = selectedSubtopicBody;
      const hasScore = /^\s*-\s*\[SCORE\]\s*\d+\s*$/im.test(body);

      let nextBody;
      if (hasScore) {
        nextBody = body.replace(/^(\s*-\s*\[SCORE\]\s*)\d+(\s*)$/im, `$1${value}$2`);
      } else {
        const hasMinTime = /^\s*-\s*\[MINTIME\]\s*\d+\s*$/im.test(body);
        if (hasMinTime) {
          nextBody = body.replace(/^(\s*-\s*\[MINTIME\])/im, `- [SCORE] ${value}\n$1`);
        } else {
          const spacer = body.endsWith("\n") || body.length === 0 ? "" : "\n";
          nextBody = `${body}${spacer}- [SCORE] ${value}\n`;
        }
      }
      updateSelectedSubtopicBody(nextBody);
    },
    [selectedSubtopic, selectedSubtopicBody, updateSelectedSubtopicBody],
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
    const nextContent = `${draft.content}\n\n## หัวข้อหลักใหม่\n\n### หัวข้อย่อย\n\nใส่รายละเอียดหัวข้อย่อย\n`;
    onChangeDraft("content", nextContent);
    const nextPages = getSubtopicPages(nextContent, draft.title);
    const newPage = nextPages.find((p) => !subtopicPages.some((sp) => sp.id === p.id));
    if (newPage) setActiveSubtopicId(newPage.id);
  };

  const insertSubSection = () => {
    setShowSubtopicModal(true);
  };

  const closeSubtopicModal = () => {
    setShowSubtopicModal(false);
    setSubtopicTitle("หัวข้อย่อยใหม่");
    setSubtopicScore(20);
    setSubtopicMinTime(0);
  };

  const handleInsertSubSectionFromModal = () => {
    const normalizedTitle = String(subtopicTitle ?? "").trim();
    if (!normalizedTitle) {
      setSaveMessage("กรุณากรอกชื่อหัวข้อย่อย");
      return;
    }

    const subtopicBlock = `\n\n### ${normalizedTitle}\n\nใส่รายละเอียดหัวข้อย่อย\n\n- [SCORE] 20\n`;
    if (!selectedSubtopic?.mainText) {
      insertAtCursor(subtopicBlock);
      setSaveMessage("");
      closeSubtopicModal();
      return;
    }

    const outline = parseMarkdownOutline(draft.content);
    const currentMain = outline.mainSections.find((s) => s.id === selectedSubtopic.mainId);
    if (!currentMain) {
      insertAtCursor(subtopicBlock);
      setSaveMessage("");
      closeSubtopicModal();
      return;
    }
    const blockLines = subtopicBlock.split("\n");
    const newLines = [
      ...outline.lines.slice(0, currentMain.endLine),
      ...blockLines,
      ...outline.lines.slice(currentMain.endLine),
    ];
    const nextContent = newLines.join("\n");
    onChangeDraft("content", nextContent);
    const nextPages = getSubtopicPages(nextContent, draft.title);
    const newPage = nextPages.find((p) => !subtopicPages.some((sp) => sp.id === p.id));
    if (newPage) setActiveSubtopicId(newPage.id);
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
    Promise.resolve(onSaveDraft()).then((result) => {
      setSaveMessage(result?.message ?? (result?.success ? "บันทึกเนื้อหาเรียบร้อยแล้ว" : "บันทึกไม่สำเร็จ"));
    });
  };

  const handleDeleteContent = async () => {
    const result = await onDeleteContent(draft.sourceId || draft.id);
    if (!result?.success) {
      setSaveMessage(result?.message ?? "ลบเนื้อหาไม่สำเร็จ");
      setShowDeleteConfirm(false);
      return;
    }
    setShowDeleteConfirm(false);
  };

  const isSavedToDB = examples.some((e) => e.id === (draft.sourceId || draft.id));

  const handleUploadEditorImage = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    try {
      const dataUrl = await fileToDataUrl(file);
      if (!draft.sourceId || !isSavedToDB) {
        setSaveMessage("บันทึกคอร์สก่อนอัพโหลดรูป");
        return;
      }
      const url = await saveCourseImageApi(draft.sourceId, file.name, dataUrl);
      const resolved = url || dataUrl;
      const newImages = storeImage(draft.sourceId, file.name, resolved);
      setContentImages(newImages);
      insertAtCursor(`\n![${file.name}](${encodeURIComponent(file.name)})\n`);
    } catch {
      setSaveMessage("อัพโหลดรูปไม่สำเร็จ");
    }
  };

  // Image upload callback for Visual Editor blocks
  const handleUploadImageForBlock = useCallback(async (file) => {
    if (!draft.sourceId || !isSavedToDB) {
      setSaveMessage("บันทึกคอร์สก่อนอัพโหลดรูป");
      return null;
    }
    try {
      const dataUrl = await fileToDataUrl(file);
      const url = await saveCourseImageApi(draft.sourceId, file.name, dataUrl);
      const resolved = url || dataUrl;
      const newImages = storeImage(draft.sourceId, file.name, resolved);
      setContentImages(newImages);
      return { filename: file.name, encodedFilename: encodeURIComponent(file.name) };
    } catch {
      setSaveMessage("อัพโหลดรูปไม่สำเร็จ");
      return null;
    }
  }, [draft.sourceId, isSavedToDB]);

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

  const handleSwapSubSections = (subId1, subId2) => {
    const nextContent = swapSubSections(draft.content, subId1, subId2);
    if (nextContent !== draft.content) {
      onChangeDraft("content", nextContent);
    }
  };

  const handleMoveSubToMain = (subId, targetMainId) => {
    const nextContent = moveSubSectionToMain(draft.content, subId, targetMainId);
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

  const handleUploadAttachment = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (!draft.sourceId) {
      setAttachmentMessage("บันทึกคอร์สก่อนอัพโหลดไฟล์แนบ");
      return;
    }
    setAttachmentUploading(true);
    setAttachmentMessage("");
    try {
      const att = await uploadCourseAttachmentApi(draft.sourceId, file);
      setAttachments((prev) => [att, ...prev]);
      setAttachmentMessage("อัพโหลดไฟล์สำเร็จ");
    } catch (err) {
      setAttachmentMessage(err?.message ?? "อัพโหลดไม่สำเร็จ");
    } finally {
      setAttachmentUploading(false);
    }
  };

  const handleDeleteAttachment = async (attId) => {
    if (!draft.sourceId) return;
    try {
      await deleteCourseAttachmentApi(draft.sourceId, attId);
      setAttachments((prev) => prev.filter((a) => a.id !== attId));
    } catch (err) {
      setAttachmentMessage(err?.message ?? "ลบไฟล์ไม่สำเร็จ");
    }
  };

  return (
    <section className="workspace-content">
      <header className="content-header editor-head">
        <div>
          <h1>หน้าแก้เนื้อหา</h1>
          <p>แก้ไขเฉพาะหัวข้อย่อยที่เลือกจาก Table of Contents</p>
        </div>
        <div className="editor-header-actions">
          <button type="button" className="save-button" onClick={handleSave}>
            บันทึกเนื้อหา
          </button>
          <button type="button" className="back-button danger-button" onClick={() => setShowDeleteConfirm(true)}>
            ลบเนื้อหา
          </button>
          <button type="button" className="back-button" onClick={() => navigate("/content")}>
            กลับหน้า Lobby
          </button>
        </div>
      </header>

      {saveMessage ? <p className="save-message">{saveMessage}</p> : null}

      <div className="editor-section-card">
        <div className="editor-section-head">
          <span className="section-icon">📋</span>
          ข้อมูลทั่วไป
        </div>
        <div className="editor-section-body">
          <div className="editor-title-box">
            <label htmlFor="editor-title">ชื่อเนื้อหา</label>
            <input
              id="editor-title"
              value={draft.title}
              onChange={(event) => onChangeDraft("title", event.target.value)}
            />
          </div>

          <div className="editor-course-meta" style={{ marginTop: "12px" }}>
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
                {canPublish && <option value="active">active</option>}
                <option value="inactive">inactive</option>
              </select>
            </div>
            <div className="editor-title-box">
              <label htmlFor="editor-visibility">การมองเห็น</label>
              <select
                id="editor-visibility"
                value={draft.visibility ?? "public"}
                onChange={(event) => onChangeDraft("visibility", event.target.value)}
              >
                <option value="public">Public — ทุกคนมองเห็น</option>
                <option value="private">Private — เฉพาะที่ระบุ</option>
              </select>
            </div>
            {(draft.visibility ?? "public") === "private" && (
              <div className="editor-title-box editor-meta-full">
                <label>ผู้ใช้ที่มองเห็นได้ (username)</label>
                <div className="allowed-users-list">
                  {(Array.isArray(draft.allowedUsernames) ? draft.allowedUsernames : []).map((u, i) => (
                    <div key={i} className="allowed-user-row">
                      <span className="allowed-user-tag">{u}</span>
                      <button
                        type="button"
                        className="toc-delete-button"
                        onClick={() => {
                          const next = (draft.allowedUsernames ?? []).filter((_, idx) => idx !== i);
                          onChangeDraft("allowedUsernames", next);
                        }}
                      >
                        ลบ
                      </button>
                    </div>
                  ))}
                  <AllowedUsernameInput
                    users={users}
                    excluded={Array.isArray(draft.allowedUsernames) ? draft.allowedUsernames : []}
                    onAdd={(username) => {
                      const existing = Array.isArray(draft.allowedUsernames) ? draft.allowedUsernames : [];
                      if (username && !existing.includes(username)) {
                        onChangeDraft("allowedUsernames", [...existing, username]);
                      }
                    }}
                  />
                </div>
              </div>
            )}
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
            </div>
          </div>
        </div>
      </div>

      <div className="editor-skill-card">
        <div className="editor-skill-head">
          <h3>ทักษะและคะแนนรางวัล</h3>
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
          <p className="toc-empty" style={{ padding: "12px 16px" }}>ยังไม่ได้เพิ่มแท็กทักษะ</p>
        )}
      </div>

      <div className="editor-skill-card">
        <div className="editor-skill-head">
          <h3>ไฟล์แนบ (PDF, Word, Excel, ฯลฯ)</h3>
          <label className="create-content-button" style={{ cursor: "pointer" }}>
            {attachmentUploading ? "กำลังอัพโหลด…" : "+ อัพโหลดไฟล์"}
            <input
              type="file"
              accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt"
              onChange={handleUploadAttachment}
              disabled={attachmentUploading}
              style={{ display: "none" }}
            />
          </label>
        </div>
        <div style={{ padding: "10px 16px 14px" }}>
          {attachmentMessage && (
            <p className={`attachment-message ${attachmentMessage.includes("สำเร็จ") ? "is-success" : "is-error"}`}>
              {attachmentMessage}
            </p>
          )}
          {attachments.length === 0 ? (
            <p className="toc-empty" style={{ padding: 0 }}>ยังไม่มีไฟล์แนบ</p>
          ) : (
            <div className="attachment-list">
              {attachments.map((att) => (
                <div key={att.id} className="attachment-row">
                  <span className="attachment-icon">{getAttachmentIcon(att.origName)}</span>
                  <a
                    href={att.urlPath}
                    target="_blank"
                    rel="noreferrer"
                    download={att.origName}
                    className="attachment-name"
                  >
                    {att.origName}
                  </a>
                  <button
                    type="button"
                    className="toc-delete-button"
                    onClick={() => handleDeleteAttachment(att.id)}
                  >
                    ลบ
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="editor-toolbar">
        <button type="button" onClick={insertMainSection}>
          เพิ่มหัวข้อหลัก
        </button>
        <button type="button" onClick={insertSubSection}>
          เพิ่มหัวข้อย่อย
        </button>
        {editorMode === "markdown" && (
          <>
            <button type="button" onClick={insertVideoLink}>
              แทรกวิดีโอ
            </button>
            <button type="button" onClick={insertQuestionTemplate}>
              เพิ่มคำถามหัวข้อย่อย
            </button>
          </>
        )}
        <button type="button" onClick={() => setShowPreview((prev) => !prev)}>
          {showPreview ? "ซ่อน Preview" : "แสดง Preview"}
        </button>
        {editorMode === "markdown" && (
          <label>
            อัพโหลดรูป
            <input type="file" accept="image/*" onChange={handleUploadEditorImage} style={{ display: "none" }} />
          </label>
        )}
        <div className="editor-mode-toggle">
          <button
            type="button"
            className={editorMode === "visual" ? "active" : ""}
            onClick={() => setEditorMode("visual")}
          >
            Visual
          </button>
          <button
            type="button"
            className={editorMode === "markdown" ? "active" : ""}
            onClick={() => setEditorMode("markdown")}
          >
            Markdown
          </button>
        </div>
      </div>

      {editorMode === "markdown" && (
        <div className="editor-hint">
          รูปแบบวิดีโอ: `[video: ชื่อวิดีโอ](ลิงก์ YouTube)` | รูปแบบคำถาม: `- [Q] คำถาม :: คำตอบ :: คะแนน` |
          คะแนนหัวข้อ: `- [SCORE] 20` | ลากหัวข้อในสารบัญด้วยเมาส์เพื่อจัดเรียง
        </div>
      )}
      {editorMode === "visual" && (
        <div className="editor-hint-visual">
          เพิ่มเนื้อหาด้วยปุ่ม "+ เพิ่มเนื้อหา" ในพื้นที่แก้ไข | ลากหัวข้อในสารบัญด้วยเมาส์เพื่อจัดเรียง
        </div>
      )}

      <div className={`editor-split ${showPreview ? "preview-mode" : "editor-mode"}`}>
        <TableOfContents
          title="Table of Contents"
          content={draft.content}
          activeHeadingId={selectedSubtopic?.id ?? ""}
          onSelectHeading={selectSubtopic}
          editable
          onMoveMainBefore={handleMoveMainBefore}
          onMoveSubBefore={handleMoveSubBefore}
          onSwapSubSections={handleSwapSubSections}
          onMoveSubToMain={handleMoveSubToMain}
          onRenameHeading={handleRenameHeading}
          onDeleteHeading={handleDeleteHeading}
        />

        {!showPreview && editorMode === "visual" ? (
          <div className="rich-editor-panel">
            <h3>
              Visual Editor
              {selectedSubtopic ? `: ${selectedSubtopic.subText}` : ""}
            </h3>
            {selectedSubtopic ? (
              <div className="rich-subtopic-settings">
                <label>
                  ⭐ คะแนนหัวข้อย่อย
                  <input
                    type="number"
                    min={0}
                    value={selectedSubtopic.baseScore ?? 0}
                    onChange={(e) => updateSubtopicScore(Number(e.target.value))}
                    style={{ width: 70, marginLeft: 8 }}
                  />
                </label>
                <label>
                  ⏱ เวลาขั้นต่ำก่อนปลดล็อคคำถาม (นาที)
                  <input
                    type="number"
                    min={0}
                    value={selectedSubtopic.minTimeMinutes ?? 0}
                    onChange={(e) => updateSubtopicMinTime(Number(e.target.value))}
                    style={{ width: 70, marginLeft: 8 }}
                  />
                </label>
              </div>
            ) : null}
            <RichContentEditor
              key={selectedSubtopic?.id ?? "no-subtopic"}
              value={selectedSubtopicBody}
              onChange={updateSelectedSubtopicBody}
              images={contentImages}
              onUploadImage={handleUploadImageForBlock}
            />
          </div>
        ) : null}

        {!showPreview && editorMode === "markdown" ? (
          <div className="editor-panel">
            <h3>
              Markdown Editor
              {selectedSubtopic ? `: ${selectedSubtopic.subText}` : ""}
            </h3>
            {selectedSubtopic ? (
              <div className="editor-subtopic-settings">
                <label>
                  ⭐ คะแนนหัวข้อย่อย
                  <input
                    type="number"
                    min={0}
                    value={selectedSubtopic.baseScore ?? 0}
                    onChange={(e) => updateSubtopicScore(Number(e.target.value))}
                    style={{ width: 70, marginLeft: 8 }}
                  />
                </label>
                <label>
                  ⏱ เวลาขั้นต่ำก่อนปลดล็อคคำถาม (นาที)
                  <input
                    type="number"
                    min={0}
                    value={selectedSubtopic.minTimeMinutes ?? 0}
                    onChange={(e) => updateSubtopicMinTime(Number(e.target.value))}
                    style={{ width: 70, marginLeft: 8 }}
                  />
                </label>
              </div>
            ) : null}
            <CodeMirror
              key={selectedSubtopic?.id ?? "no-subtopic"}
              value={selectedSubtopicBody}
              height="auto"
              minHeight="420px"
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
            <div className="preview-panel-body">
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
                <MarkdownContent content={selectedSubtopic?.content ?? draft.content} images={contentImages} />
              </div>
              {selectedSubtopic?.questions?.length > 0 && (
                <div className="subtopic-quiz-shell">
                  <div className="subtopic-quiz-head">
                    <h3>Questions</h3>
                    <p>ตัวอย่างคำถามของหัวข้อย่อยนี้</p>
                  </div>
                  <div className="subtopic-quiz">
                    {selectedSubtopic.questions.map((question, index) => (
                      <div key={question.id} className="quiz-question-card">
                        <p className="quiz-question-text">
                          <span className="question-points">+{question.points}</span>
                          <strong>คำถาม {index + 1}: {question.question}</strong>
                        </p>
                        <p className="quiz-answer-label" style={{ color: "#6b8ab8", fontSize: "0.85rem" }}>
                          คำตอบ: {question.answer}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
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
