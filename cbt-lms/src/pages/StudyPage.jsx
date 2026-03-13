import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { getStoredImages } from "../services/contentImagesStore";
import { fetchCourseImagesApi, fetchCourseAttachmentsApi } from "../services/mediaApiService";
import { recordSubtopicTimeApi } from "../services/courseApiService";
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
  const { currentUserKey } = useAuth();
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
    }
  }, [draft?.sourceId, draft?.id]);
  const [answerInputs, setAnswerInputs] = useState({});
  const subtopicPages = useMemo(() => draft ? getSubtopicPages(draft.content, draft.title) : [], [draft?.content, draft?.title]);
  const selectedSubtopic = subtopicPages.find((subtopic) => subtopic.id === activeSubtopicId) ?? subtopicPages[0];
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
        </div>

        <div className="study-toc-sticky">
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
        </div>
      </div>
    </section>
  );
}
