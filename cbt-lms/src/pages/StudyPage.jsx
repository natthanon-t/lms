import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { getStoredImages } from "../services/contentImagesStore";
import { fetchCourseImagesApi, fetchCourseAttachmentsApi } from "../services/mediaApiService";
import { recordSubtopicTimeApi, fetchCourseQnAApi, postQnAQuestionApi, postQnAReplyApi } from "../services/courseApiService";
import MarkdownContent from "../components/markdown/MarkdownContent";
import TableOfContents from "../components/markdown/TableOfContents";
import { getSubtopicPages } from "../components/markdown/headingUtils";
import { normalizeExampleRecord, toCourseDraft } from "../services/courseService";
import { useAuth } from "../contexts/AuthContext";
import { useAppData } from "../contexts/AppDataContext";

const normalizeAnswer = (value) => String(value ?? "").trim().toLowerCase();

function getAttachmentIcon(filename) {
  const ext = String(filename ?? "").split(".").pop().toLowerCase();
  const icons = { pdf: "📄", doc: "📝", docx: "📝", xls: "📊", xlsx: "📊", ppt: "📽️", pptx: "📽️", txt: "📃" };
  return icons[ext] ?? "📎";
}

export default function StudyPage() {
  const { courseId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { currentUserKey, users: authUsers } = useAuth();
  const { examples, learningProgress, handleMarkSubtopicComplete, handleSubmitSubtopicAnswer } = useAppData();

  const contentItem = useMemo(() => {
    const found = examples.find((e) => e.id === courseId);
    return found ? normalizeExampleRecord(found) : null;
  }, [examples, courseId]);

  const draft = useMemo(() => contentItem ? toCourseDraft(contentItem) : null, [contentItem]);
  const initialSubtopicId = location.state?.initialSubtopicId ?? "";
  const progress = (learningProgress[currentUserKey] ?? {})[courseId] ?? {};

  const [activeSubtopicId, setActiveSubtopicId] = useState(initialSubtopicId);
  const [contentImages, setContentImages] = useState(() => getStoredImages(draft?.sourceId ?? draft?.id ?? ""));
  const [attachments, setAttachments] = useState([]);
  const timeSpentRef = useRef(progress?.timeSpent ?? {});
  const pendingSecondsRef = useRef(0);
  // lockedDisplaySeconds: null = unlocked, number = seconds spent so far (countdown display)
  const [lockedDisplaySeconds, setLockedDisplaySeconds] = useState(null);
  const [answerInputs, setAnswerInputs] = useState({});
  const [qnaItems, setQnaItems] = useState([]);
  const [qnaInput, setQnaInput] = useState("");
  const [replyInputs, setReplyInputs] = useState({});
  const [expandedQnaId, setExpandedQnaId] = useState(null);
  const [tocTab, setTocTab] = useState("toc"); // "toc" | "qna"
  const [qnaFilter, setQnaFilter] = useState("all"); // "all" | "answered" | "unanswered"
  const subtopicPages = useMemo(() => draft ? getSubtopicPages(draft.content, draft.title) : [], [draft?.content, draft?.title]);
  const selectedSubtopic = subtopicPages.find((subtopic) => subtopic.id === activeSubtopicId) ?? subtopicPages[0];

  // Sync timeSpentRef when backend progress loads (useRef only captures initial value)
  useEffect(() => {
    const loaded = progress?.timeSpent;
    if (!loaded) return;
    for (const [key, val] of Object.entries(loaded)) {
      if ((timeSpentRef.current[key] ?? 0) < val) {
        timeSpentRef.current[key] = val;
      }
    }
    // Re-evaluate lock for current subtopic
    const subtopicId = selectedSubtopic?.id;
    if (subtopicId) {
      const minTimeSecs = (selectedSubtopic?.minTimeMinutes ?? 0) * 60;
      const current = timeSpentRef.current[subtopicId] ?? 0;
      if (minTimeSecs > 0 && current < minTimeSecs) {
        setLockedDisplaySeconds(current);
      } else if (minTimeSecs > 0) {
        setLockedDisplaySeconds(null);
      }
    }
  }, [progress?.timeSpent, selectedSubtopic?.id, selectedSubtopic?.minTimeMinutes]);

  useEffect(() => {
    if (!draft) return;
    const draftCourseId = draft.sourceId ?? draft.id;
    setContentImages(getStoredImages(draftCourseId));
    if (draftCourseId) {
      fetchCourseImagesApi(draftCourseId)
        .then((apiImages) => {
          if (Object.keys(apiImages).length > 0) {
            setContentImages((prev) => ({ ...prev, ...apiImages }));
          }
        })
        .catch(() => {});
      fetchCourseAttachmentsApi(draftCourseId)
        .then(setAttachments)
        .catch(() => {});
      fetchCourseQnAApi(draftCourseId)
        .then((questions) =>
          setQnaItems(
            questions.map((q) => ({
              id: q.id,
              subtopicId: q.subtopicId ?? "",
              question: q.question,
              username: q.username,
              name: q.name || q.username,
              postedAt: new Date(q.createdAt).toLocaleString("th-TH"),
              replies: (q.replies ?? []).map((r) => ({
                id: r.id,
                text: r.reply,
                username: r.username,
                name: r.name || r.username,
                postedAt: new Date(r.createdAt).toLocaleString("th-TH"),
              })),
            })),
          ),
        )
        .catch(() => {});
    }
  }, [draft?.sourceId, draft?.id]);
  const selectedSubtopicAnswers = progress?.answers?.[selectedSubtopic?.id] ?? {};
  const selectedSubtopicCompleted = Boolean(progress?.completedSubtopics?.[selectedSubtopic?.id]);
  const completedSubtopicIds = useMemo(
    () =>
      Object.entries(progress?.completedSubtopics ?? {})
        .filter(([, done]) => Boolean(done))
        .map(([id]) => id),
    [progress?.completedSubtopics],
  );

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

  // Timer: track time spent per subtopic, flush to backend every 30 s
  // Uses ref for accumulation to avoid re-renders every second.
  // Only updates state when lock status changes or countdown needs display.
  useEffect(() => {
    const courseId = draft?.sourceId;
    const subtopicId = selectedSubtopic?.id;
    if (!courseId || !subtopicId) return;

    pendingSecondsRef.current = 0;
    const minTimeSecs = (selectedSubtopic?.minTimeMinutes ?? 0) * 60;
    const initial = timeSpentRef.current[subtopicId] ?? 0;
    setLockedDisplaySeconds(minTimeSecs > 0 && initial < minTimeSecs ? initial : null);

    const tick = () => {
      pendingSecondsRef.current += 1;
      const newTotal = (timeSpentRef.current[subtopicId] ?? 0) + 1;
      timeSpentRef.current[subtopicId] = newTotal;

      if (minTimeSecs > 0 && newTotal <= minTimeSecs) {
        setLockedDisplaySeconds(newTotal < minTimeSecs ? newTotal : null);
      }

      if (pendingSecondsRef.current >= 30) {
        const toFlush = pendingSecondsRef.current;
        pendingSecondsRef.current = 0;
        recordSubtopicTimeApi(courseId, subtopicId, toFlush).catch(() => {});
      }
    };

    const id = setInterval(tick, 1000);
    return () => {
      clearInterval(id);
      if (pendingSecondsRef.current > 0) {
        recordSubtopicTimeApi(courseId, subtopicId, pendingSecondsRef.current).catch(() => {});
        pendingSecondsRef.current = 0;
      }
    };
  }, [selectedSubtopic?.id, draft?.sourceId]);

  const subtopicMinTime = selectedSubtopic?.minTimeMinutes ?? 0;
  const requiredSeconds = subtopicMinTime * 60;
  const isTimeUnlocked = lockedDisplaySeconds === null;
  const subtopicSecondsSpent = lockedDisplaySeconds ?? (timeSpentRef.current[selectedSubtopic?.id] ?? 0);
  const timeRemainingSeconds = Math.max(0, requiredSeconds - subtopicSecondsSpent);

  const areAllQuestionsCorrect = selectedSubtopic
    ? selectedSubtopic.questions.every((question) => selectedSubtopicAnswers[question.id]?.isCorrect)
    : false;

  const canComplete = Boolean(selectedSubtopic) && isTimeUnlocked && (
    selectedSubtopic.questions.length === 0 ||
    areAllQuestionsCorrect
  );

  const handleSubmitAnswer = (question) => {
    if (!selectedSubtopic) {
      return;
    }
    const typedAnswer = answerInputs[question.id] ?? "";
    const isCorrect = normalizeAnswer(typedAnswer) === normalizeAnswer(question.answer);
    handleSubmitSubtopicAnswer(draft?.sourceId, selectedSubtopic.id, {
      ...question,
      typedAnswer,
      isCorrect,
    });
  };

  const handlePostQuestion = () => {
    const text = qnaInput.trim();
    if (!text) return;
    const courseSourceId = draft?.sourceId ?? draft?.id;
    const subtopicId = selectedSubtopic?.id ?? "";
    // Optimistic update
    const tempId = `temp-${Date.now()}`;
    const currentName = authUsers[currentUserKey]?.name ?? currentUserKey;
    setQnaItems((prev) => [
      ...prev,
      {
        id: tempId,
        subtopicId,
        question: text,
        username: currentUserKey,
        name: currentName,
        postedAt: new Date().toLocaleString("th-TH"),
        replies: [],
      },
    ]);
    setQnaInput("");
    // Send to backend, replace temp with real data
    postQnAQuestionApi(courseSourceId, subtopicId, text)
      .then((res) => {
        if (res?.question) {
          const q = res.question;
          setQnaItems((prev) =>
            prev.map((item) =>
              item.id === tempId
                ? { ...item, id: q.id, name: q.name || item.name, postedAt: new Date(q.createdAt).toLocaleString("th-TH") }
                : item,
            ),
          );
        }
      })
      .catch(() => {});
  };

  const handlePostReply = (qnaId) => {
    const text = (replyInputs[qnaId] ?? "").trim();
    if (!text) return;
    const isTempQuestion = typeof qnaId === "string" && qnaId.startsWith("temp-");
    const tempId = `temp-r-${Date.now()}`;
    // Optimistic update
    setQnaItems((prev) =>
      prev.map((item) =>
        item.id === qnaId
          ? {
              ...item,
              replies: [
                ...item.replies,
                { id: tempId, text, username: currentUserKey, name: authUsers[currentUserKey]?.name ?? currentUserKey, postedAt: new Date().toLocaleString("th-TH") },
              ],
            }
          : item,
      ),
    );
    setReplyInputs((prev) => ({ ...prev, [qnaId]: "" }));
    // Skip API call if the question hasn't been saved yet (temp ID)
    if (isTempQuestion) return;
    // Send to backend
    postQnAReplyApi(qnaId, text)
      .then((res) => {
        if (res?.reply) {
          const r = res.reply;
          setQnaItems((prev) =>
            prev.map((item) =>
              item.id === qnaId
                ? {
                    ...item,
                    replies: item.replies.map((rep) =>
                      rep.id === tempId
                        ? { ...rep, id: r.id, name: r.name || rep.name, postedAt: new Date(r.createdAt).toLocaleString("th-TH") }
                        : rep,
                    ),
                  }
                : item,
            ),
          );
        }
      })
      .catch(() => {});
  };

  const handleCompleteSubtopic = () => {
    if (!selectedSubtopic || !canComplete) {
      return;
    }

    const questionScore = selectedSubtopic.questions.reduce((total, question) => total + question.points, 0);
    const subtopicScore = Number(selectedSubtopic.baseScore ?? draft?.subtopicCompletionScore ?? 20) + questionScore;
    handleMarkSubtopicComplete(draft?.sourceId, selectedSubtopic.id, subtopicScore);
  };

  if (!draft) {
    return (
      <section className="workspace-content">
        <header className="content-header">
          <h1>ไม่พบเนื้อหา</h1>
          <p>กำลังโหลด...</p>
        </header>
      </section>
    );
  }

  const currentIndex = subtopicPages.findIndex((s) => s.id === selectedSubtopic?.id);
  const totalSubtopics = subtopicPages.length;
  const progressPercent = totalSubtopics > 0 ? Math.round((completedSubtopicIds.length / totalSubtopics) * 100) : 0;

  return (
    <section className="workspace-content content-theme-exam">
      <header className="content-header editor-head">
        <div>
          <h1>{draft.title}</h1>
          <p>หน้าเรียนเนื้อหา — สำเร็จ {completedSubtopicIds.length}/{totalSubtopics} หัวข้อ ({progressPercent}%)</p>
        </div>
        <button type="button" className="back-button" onClick={() => navigate(`/content/${courseId}`)}>
          กลับหน้าเลือกเนื้อหา
        </button>
      </header>

      <div className="study-layout">
        <div className="preview-panel study-panel">
          {selectedSubtopic ? (
            <div className="subtopic-nav">
              <button type="button" className="subtopic-nav-button" disabled={currentIndex <= 0} onClick={() => jumpSubtopic(-1)}>
                ← ก่อนหน้า
              </button>
              <span>
                {selectedSubtopicCompleted ? "✓ " : ""}
                {selectedSubtopic.mainText}
                {selectedSubtopic.subText ? ` / ${selectedSubtopic.subText}` : ""}
                {" "}({currentIndex + 1}/{totalSubtopics})
              </span>
              <button type="button" className="subtopic-nav-button" disabled={currentIndex >= totalSubtopics - 1} onClick={() => jumpSubtopic(1)}>
                ถัดไป →
              </button>
            </div>
          ) : null}
          <div className="preview-body study-preview-body">
            <MarkdownContent content={selectedSubtopic?.content ?? draft.content} images={contentImages} />
          </div>

          {selectedSubtopic && selectedSubtopic.questions.length > 0 ? (
            <div className="subtopic-quiz-shell">
              <div className="subtopic-quiz-head">
                <h3>Questions</h3>
                <p>ตอบคำถามด้านล่างเพื่อปลดล็อกการเสร็จสิ้นหัวข้อย่อย</p>
              </div>
              {!isTimeUnlocked ? (
                <div className="time-lock-notice">
                  <p className="time-lock-text">
                    🔒 ต้องอ่านเนื้อหาอีก {Math.floor(timeRemainingSeconds / 60)} นาที{" "}
                    {timeRemainingSeconds % 60} วินาที จึงจะปลดล็อคคำถาม
                  </p>
                  <div className="time-lock-bar">
                    <div
                      className="time-lock-bar-fill"
                      style={{ width: `${Math.min(100, (subtopicSecondsSpent / requiredSeconds) * 100)}%` }}
                    />
                  </div>
                </div>
              ) : (
                <div className="subtopic-quiz">
                  {selectedSubtopic.questions.map((question, index) => {
                    const result = selectedSubtopicAnswers[question.id];
                    const inputId = `${question.id}-answer`;
                    return (
                      <div key={question.id} className={`quiz-question-card${result?.isCorrect ? " quiz-card-correct" : result ? " quiz-card-wrong" : ""}`}>
                        <p className="quiz-question-text">
                          <span className="question-points">+{question.points}</span>
                          <strong>
                            คำถาม {index + 1}: {question.question}
                          </strong>
                        </p>
                        <label htmlFor={inputId} className="quiz-answer-label">
                          คำตอบ
                        </label>
                        <div className="quiz-answer-row">
                          <input
                            id={inputId}
                            value={answerInputs[question.id] ?? result?.typedAnswer ?? ""}
                            onChange={(event) =>
                              setAnswerInputs((prev) => ({ ...prev, [question.id]: event.target.value }))
                            }
                            placeholder="พิมพ์คำตอบที่นี่..."
                            disabled={result?.isCorrect}
                          />
                          <button type="button" onClick={() => handleSubmitAnswer(question)} disabled={result?.isCorrect}>
                            Submit
                          </button>
                        </div>
                        {result ? (
                          <p className={result.isCorrect ? "result-correct" : "result-wrong"}>
                            {result.isCorrect ? "✅ ตอบถูกต้อง!" : "❌ ตอบไม่ถูก ลองใหม่อีกครั้ง"}
                          </p>
                        ) : null}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ) : null}

          {selectedSubtopic ? (
            <div className="subtopic-complete-actions">
              <button
                type="button"
                className="submit-exam-button"
                disabled={!canComplete || selectedSubtopicCompleted}
                onClick={handleCompleteSubtopic}
              >
                {selectedSubtopicCompleted ? "✓ หัวข้อนี้เสร็จสิ้นแล้ว" : "เสร็จสิ้นหัวข้อย่อย →"}
              </button>
              {!canComplete && !isTimeUnlocked ? (
                <p className="result-wrong">
                  ⏱ ต้องอ่านเนื้อหาให้ครบ {subtopicMinTime} นาทีก่อน
                </p>
              ) : !canComplete && selectedSubtopic.questions.length > 0 ? (
                <p className="result-wrong">📝 ต้องตอบคำถามของหัวข้อนี้ให้ครบและถูกต้องก่อน</p>
              ) : null}
            </div>
          ) : null}
        <div className="qna-shell">
          <div className="qna-head">
            <div className="qna-head-icon">💬</div>
            <div className="qna-head-text">
              <h3>ถามตอบ</h3>
              <p>มีข้อสงสัยในเนื้อหาหัวข้อนี้? ถามได้เลย</p>
            </div>
          </div>

          <div className="qna-form">
            <textarea
              className="qna-textarea"
              value={qnaInput}
              onChange={(e) => setQnaInput(e.target.value)}
              placeholder="พิมพ์คำถามของคุณที่นี่..."
              rows={3}
              onKeyDown={(e) => {
                if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) handlePostQuestion();
              }}
            />
            <div className="qna-form-footer">
              <span className="qna-hint">Ctrl+Enter เพื่อส่ง</span>
              <button type="button" className="qna-submit-btn" onClick={handlePostQuestion} disabled={!qnaInput.trim()}>
                ส่งคำถาม
              </button>
            </div>
          </div>

          {qnaItems.filter((q) => q.subtopicId === (selectedSubtopic?.id ?? "")).length === 0 ? (
            <p className="qna-empty">ยังไม่มีคำถามในหัวข้อนี้ เป็นคนแรกที่ถาม!</p>
          ) : (
            <div className="qna-list">
              {qnaItems
                .filter((q) => q.subtopicId === (selectedSubtopic?.id ?? ""))
                .map((item) => (
                  <div key={item.id} className="qna-item">
                    <div className="qna-item-header">
                      <div className="qna-avatar">👤</div>
                      <div className="qna-item-meta">
                        <span className="qna-item-user">{item.name ?? item.username ?? "คุณ"}</span>
                        <span className="qna-item-time">{item.postedAt}</span>
                      </div>
                    </div>
                    <p className="qna-item-text">{item.question}</p>
                    <div className="qna-item-actions">
                      <button
                        type="button"
                        className="qna-reply-toggle"
                        onClick={() => setExpandedQnaId((prev) => (prev === item.id ? null : item.id))}
                      >
                        💬 {item.replies.length > 0 ? `ตอบกลับ (${item.replies.length})` : "ตอบกลับ"}
                      </button>
                    </div>

                    {expandedQnaId === item.id && (
                      <div className="qna-replies">
                        {item.replies.map((reply) => (
                          <div key={reply.id} className="qna-reply">
                            <div className="qna-item-header">
                              <div className="qna-avatar qna-avatar-reply">🧑‍🏫</div>
                              <div className="qna-item-meta">
                                <span className="qna-item-user">{reply.name ?? reply.username ?? "ผู้สอน"}</span>
                                <span className="qna-item-time">{reply.postedAt}</span>
                              </div>
                            </div>
                            <p className="qna-item-text">{reply.text}</p>
                          </div>
                        ))}
                        <div className="qna-reply-form">
                          <textarea
                            className="qna-textarea qna-textarea-sm"
                            value={replyInputs[item.id] ?? ""}
                            onChange={(e) =>
                              setReplyInputs((prev) => ({ ...prev, [item.id]: e.target.value }))
                            }
                            placeholder="พิมพ์คำตอบ..."
                            rows={2}
                          />
                          <button
                            type="button"
                            className="qna-submit-btn qna-submit-btn-sm"
                            onClick={() => handlePostReply(item.id)}
                            disabled={!(replyInputs[item.id] ?? "").trim()}
                          >
                            ส่ง
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
            </div>
          )}
        </div>
        </div>

        <div className="study-toc-sticky">
          <div className="toc-tab-bar">
            <button
              type="button"
              className={`toc-tab-btn${tocTab === "toc" ? " active" : ""}`}
              onClick={() => setTocTab("toc")}
            >
              สารบัญหัวข้อ
            </button>
            <button
              type="button"
              className={`toc-tab-btn${tocTab === "qna" ? " active" : ""}`}
              onClick={() => setTocTab("qna")}
            >
              💬 ถามตอบ
              {qnaItems.length > 0 && <span className="toc-tab-badge">{qnaItems.length}</span>}
            </button>
          </div>

          {tocTab === "toc" ? (
            <>
              <TableOfContents
                content={draft.content}
                activeHeadingId={selectedSubtopic?.id ?? ""}
                onSelectHeading={selectSubtopic}
                completedHeadingIds={completedSubtopicIds}
              />
              {attachments.length > 0 && (
                <div className="study-attachments-panel">
                  <div className="study-attachments-head">📎 ไฟล์แนบ</div>
                  <div className="study-attachments-list">
                    {attachments.map((att) => (
                      <a
                        key={att.id}
                        href={att.urlPath}
                        target="_blank"
                        rel="noreferrer"
                        download={att.origName}
                        className="study-attachment-item"
                      >
                        <span className="study-attachment-icon">{getAttachmentIcon(att.origName)}</span>
                        <span className="study-attachment-name">{att.origName}</span>
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="toc-qna-panel">
              <div className="toc-qna-filter-bar">
                {[
                  { key: "all", label: "ทั้งหมด" },
                  { key: "unanswered", label: "ยังไม่ตอบ" },
                  { key: "answered", label: "ตอบแล้ว" },
                ].map(({ key, label }) => (
                  <button
                    key={key}
                    type="button"
                    className={`toc-qna-filter-btn${qnaFilter === key ? " active" : ""}`}
                    onClick={() => setQnaFilter(key)}
                  >
                    {label}
                    <span className="toc-qna-filter-count">
                      {key === "all" ? qnaItems.length
                        : key === "answered" ? qnaItems.filter((q) => q.replies.length > 0).length
                        : qnaItems.filter((q) => q.replies.length === 0).length}
                    </span>
                  </button>
                ))}
              </div>
              {qnaItems.length === 0 ? (
                <p className="toc-qna-empty">ยังไม่มีคำถามในคอร์สนี้</p>
              ) : (() => {
                const filtered = qnaItems.filter((q) =>
                  qnaFilter === "answered" ? q.replies.length > 0
                  : qnaFilter === "unanswered" ? q.replies.length === 0
                  : true
                );
                return filtered.length === 0 ? (
                  <p className="toc-qna-empty">
                    {qnaFilter === "answered" ? "ยังไม่มีคำถามที่ตอบแล้ว" : "ไม่มีคำถามที่ยังไม่ตอบ"}
                  </p>
                ) : (
                <div className="toc-qna-list">
                  {filtered.map((item) => {
                    const subtopic = subtopicPages.find((s) => s.id === item.subtopicId);
                    const subtopicLabel = subtopic
                      ? `${subtopic.mainText}${subtopic.subText ? ` / ${subtopic.subText}` : ""}`
                      : "—";
                    const isExpanded = expandedQnaId === item.id;
                    return (
                      <div key={item.id} className={`toc-qna-item${isExpanded ? " toc-qna-item-open" : ""}`}>
                        <div className="toc-qna-subtopic-tag">{subtopicLabel}</div>
                        <p className="toc-qna-question">{item.question}</p>
                        <div className="toc-qna-meta">
                          <span>{item.postedAt}</span>
                          {item.replies.length > 0 && (
                            <span className="toc-qna-replied-badge">✓ ตอบแล้ว {item.replies.length}</span>
                          )}
                        </div>
                        <button
                          type="button"
                          className="toc-qna-reply-btn"
                          onClick={() => setExpandedQnaId((prev) => (prev === item.id ? null : item.id))}
                        >
                          {isExpanded ? "ซ่อน" : item.replies.length > 0 ? "ดู/ตอบ" : "ตอบคำถาม"}
                        </button>
                        {isExpanded && (
                          <div className="toc-qna-reply-area">
                            {item.replies.map((reply) => (
                              <div key={reply.id} className="toc-qna-reply-bubble">
                                <span className="toc-qna-reply-label">🧑‍🏫 {reply.name ?? reply.username ?? "ผู้สอน"}</span>
                                <p>{reply.text}</p>
                              </div>
                            ))}
                            <div className="toc-qna-reply-form">
                              <textarea
                                className="qna-textarea qna-textarea-sm"
                                value={replyInputs[item.id] ?? ""}
                                onChange={(e) =>
                                  setReplyInputs((prev) => ({ ...prev, [item.id]: e.target.value }))
                                }
                                placeholder="พิมพ์คำตอบ..."
                                rows={2}
                              />
                              <button
                                type="button"
                                className="qna-submit-btn qna-submit-btn-sm"
                                onClick={() => handlePostReply(item.id)}
                                disabled={!(replyInputs[item.id] ?? "").trim()}
                              >
                                ส่ง
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
                );
              })()}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
