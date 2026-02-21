import { useCallback, useEffect, useMemo, useState } from "react";
import MarkdownContent from "../components/markdown/MarkdownContent";
import TableOfContents from "../components/markdown/TableOfContents";
import { getSubtopicPages } from "../components/markdown/headingUtils";

const normalizeAnswer = (value) => String(value ?? "").trim().toLowerCase();

export default function StudyPage({ draft, onBack, progress, onMarkSubtopicComplete, onSubmitSubtopicAnswer }) {
  const [activeSubtopicId, setActiveSubtopicId] = useState("");
  const [answerInputs, setAnswerInputs] = useState({});
  const subtopicPages = useMemo(() => getSubtopicPages(draft.content, draft.title), [draft.content, draft.title]);
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

  const areAllQuestionsCorrect = selectedSubtopic
    ? selectedSubtopic.questions.every((question) => selectedSubtopicAnswers[question.id]?.isCorrect)
    : false;

  const canComplete = Boolean(selectedSubtopic) && (
    selectedSubtopic.questions.length === 0 ||
    areAllQuestionsCorrect
  );

  const handleSubmitAnswer = (question) => {
    if (!selectedSubtopic) {
      return;
    }
    const typedAnswer = answerInputs[question.id] ?? "";
    const isCorrect = normalizeAnswer(typedAnswer) === normalizeAnswer(question.answer);
    onSubmitSubtopicAnswer?.(draft.sourceId, selectedSubtopic.id, {
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
    const subtopicScore = Number(selectedSubtopic.baseScore ?? draft.subtopicCompletionScore ?? 20) + questionScore;
    onMarkSubtopicComplete?.(draft.sourceId, selectedSubtopic.id, subtopicScore);
  };

  return (
    <section className="workspace-content content-theme-exam">
      <header className="content-header editor-head">
        <div>
          <h1>{draft.title}</h1>
          <p>หน้าเรียนเนื้อหา</p>
        </div>
        <button type="button" className="back-button" onClick={onBack}>
          กลับหน้าเลือกเนื้อหา
        </button>
      </header>

      <div className="study-layout">
        <div className="preview-panel study-panel">
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
          <div className="preview-body study-preview-body">
            <MarkdownContent content={selectedSubtopic?.content ?? draft.content} />
          </div>

          {selectedSubtopic && selectedSubtopic.questions.length > 0 ? (
            <div className="subtopic-quiz-shell">
              <div className="subtopic-quiz-head">
                <h3>Questions</h3>
                <p>ตอบคำถามด้านล่างเพื่อปลดล็อกการเสร็จสิ้นหัวข้อย่อย</p>
              </div>
              <div className="subtopic-quiz">
                {selectedSubtopic.questions.map((question, index) => {
                  const result = selectedSubtopicAnswers[question.id];
                  const inputId = `${question.id}-answer`;
                  return (
                    <div key={question.id} className="quiz-question-card">
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
                          placeholder="พิมพ์คำตอบ"
                        />
                        <button type="button" onClick={() => handleSubmitAnswer(question)}>
                          Submit
                        </button>
                      </div>
                      {result ? (
                        <p className={result.isCorrect ? "result-correct" : "result-wrong"}>
                          {result.isCorrect ? "ตอบถูก" : "ตอบไม่ถูก"}
                        </p>
                      ) : null}
                    </div>
                  );
                })}
              </div>
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
                {selectedSubtopicCompleted ? "หัวข้อนี้เสร็จสิ้นแล้ว" : "เสร็จสิ้นหัวข้อย่อย"}
              </button>
              {!canComplete && selectedSubtopic.questions.length > 0 ? (
                <p className="result-wrong">ต้องตอบคำถามของหัวข้อนี้ให้ครบและถูกต้องก่อน</p>
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
        </div>
      </div>
    </section>
  );
}
