import { useEffect, useMemo, useRef, useState } from "react";
import { ensureCoverImage, fileToDataUrl } from "../services/imageService";
import { parseExamUploadJson } from "../services/examService";

const toDomainRows = (domainPercentages) => {
  const entries = Object.entries(domainPercentages ?? {});
  if (!entries.length) {
    return [{ domain: "ISC2 CC Domain 1: Security Principles", percent: 100 }];
  }
  return entries.map(([domain, percent]) => ({
    domain,
    percent: Number(percent ?? 0),
  }));
};

const toQuestions = (questions) => {
  if (!Array.isArray(questions) || !questions.length) {
    return [
      {
        id: "q-1",
        domain: "ISC2 CC Domain 1: Security Principles",
        questionType: "multiple_choice",
        question: "",
        choices: ["A. ", "B. ", "C. ", "D. "],
        answerKey: "",
        explanation: "",
      },
    ];
  }
  return questions.map((question, index) => ({
    id: question.id ?? `q-${index + 1}`,
    domain: question.domain ?? "-",
    questionType: question.questionType ?? "multiple_choice",
    question: question.question ?? "",
    choices: Array.isArray(question.choices) && question.choices.length ? question.choices : ["A. ", "B. ", "C. ", "D. "],
    answerKey: question.answerKey ?? "",
    explanation: question.explanation ?? "",
  }));
};

export default function ExamEditorPage({ draft, onBack, onSaveDraft, onDeleteExam }) {
  const [exam, setExam] = useState(draft);
  const [domainRows, setDomainRows] = useState(() => toDomainRows(draft.domainPercentages));
  const [questions, setQuestions] = useState(() => toQuestions(draft.questions));
  const [selectedQuestionIndex, setSelectedQuestionIndex] = useState(0);
  const [importStatus, setImportStatus] = useState({ type: "", message: "" });
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [questionViewMode, setQuestionViewMode] = useState("single");
  const questionRefs = useRef({});

  useEffect(() => {
    setExam(draft);
    setDomainRows(toDomainRows(draft.domainPercentages));
    setQuestions(toQuestions(draft.questions));
    setSelectedQuestionIndex(0);
    setImportStatus({ type: "", message: "" });
  }, [draft]);

  const domainTotal = useMemo(
    () => domainRows.reduce((sum, row) => sum + Number(row.percent || 0), 0),
    [domainRows],
  );

  useEffect(() => {
    if (!questions.length) {
      setSelectedQuestionIndex(0);
      return;
    }
    setSelectedQuestionIndex((prevIndex) => Math.min(prevIndex, questions.length - 1));
  }, [questions.length]);

  const jumpToQuestion = (index) => {
    const nextIndex = Number(index);
    if (!Number.isFinite(nextIndex) || nextIndex < 0 || nextIndex >= questions.length) {
      return;
    }
    setSelectedQuestionIndex(nextIndex);
    questionRefs.current[nextIndex]?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const updateQuestion = (index, field, value) => {
    setQuestions((prevQuestions) =>
      prevQuestions.map((question, questionIndex) =>
        questionIndex === index ? { ...question, [field]: value } : question,
      ),
    );
  };

  const updateQuestionChoice = (questionIndex, choiceIndex, value) => {
    setQuestions((prevQuestions) =>
      prevQuestions.map((question, qIndex) => {
        if (qIndex !== questionIndex) {
          return question;
        }
        return {
          ...question,
          choices: question.choices.map((choice, cIndex) => (cIndex === choiceIndex ? value : choice)),
        };
      }),
    );
  };

  const addQuestion = () => {
    setQuestions((prevQuestions) => [
      ...prevQuestions,
      {
        id: `q-${prevQuestions.length + 1}`,
        domain: domainRows[0]?.domain ?? "ISC2 CC Domain 1: Security Principles",
        questionType: "multiple_choice",
        question: "",
        choices: ["A. ", "B. ", "C. ", "D. "],
        answerKey: "",
        explanation: "",
      },
    ]);
    setSelectedQuestionIndex(questions.length);
  };

  const removeQuestion = (index) => {
    setQuestions((prevQuestions) => prevQuestions.filter((_, questionIndex) => questionIndex !== index));
    setSelectedQuestionIndex((prevIndex) => {
      if (prevIndex === index) {
        return Math.max(0, index - 1);
      }
      if (prevIndex > index) {
        return prevIndex - 1;
      }
      return prevIndex;
    });
  };

  const handleSave = () => {
    const domainPercentages = {};
    domainRows.forEach((row) => {
      const name = String(row.domain ?? "").trim();
      const percent = Number(row.percent ?? 0);
      if (name && percent > 0) {
        domainPercentages[name] = percent;
      }
    });

    const normalizedQuestions = questions.map((question, index) => ({
      ...question,
      id: `q-${index + 1}`,
      domain: String(question.domain ?? "").trim() || "-",
      questionType: String(question.questionType ?? "multiple_choice").trim(),
      question: String(question.question ?? "").trim(),
      choices: (Array.isArray(question.choices) ? question.choices : []).map((choice) => String(choice ?? "").trim()),
      answerKey: String(question.answerKey ?? "").trim(),
      explanation: String(question.explanation ?? "").trim(),
    }));

    onSaveDraft?.({
      ...exam,
      image: ensureCoverImage(exam.image, exam.id ?? exam.sourceId ?? `exam-${Date.now()}`),
      domainPercentages,
      numberOfQuestions: Number(exam.numberOfQuestions ?? 0),
      defaultTime: Number(exam.defaultTime ?? 0),
      maxAttempts: Number(exam.maxAttempts ?? 0),
      questions: normalizedQuestions,
    });
  };

  const handleUploadCoverImage = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) {
      return;
    }
    try {
      const dataUrl = await fileToDataUrl(file);
      setExam((prev) => ({ ...prev, image: dataUrl }));
    } catch {
      // noop
    }
  };

  const handleImportExamJson = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) {
      return;
    }
    try {
      const text = await file.text();
      const parsedJson = JSON.parse(text);
      const importedExam = parseExamUploadJson(parsedJson, exam);
      if (!Array.isArray(importedExam.questions) || importedExam.questions.length === 0) {
        throw new Error("ไม่พบคำถามในไฟล์");
      }

      setExam(importedExam);
      setDomainRows(toDomainRows(importedExam.domainPercentages));
      setQuestions(toQuestions(importedExam.questions));
      setSelectedQuestionIndex(0);
      setImportStatus({
        type: "success",
        message: `นำเข้าไฟล์สำเร็จ: ${importedExam.questions.length} ข้อ`,
      });
    } catch {
      setImportStatus({
        type: "error",
        message: "ไฟล์ไม่ถูกต้อง หรือไม่ตรงโครงสร้าง CC1.json",
      });
    }
  };

  const handleDeleteExam = async () => {
    const result = await onDeleteExam?.(exam.id || exam.sourceId);
    if (!result?.success) {
      setImportStatus({ type: "error", message: result?.message ?? "ลบข้อสอบไม่สำเร็จ" });
      setShowDeleteConfirm(false);
      return;
    }
    setShowDeleteConfirm(false);
  };

  return (
    <section className="workspace-content">
      <header className="content-header editor-head">
        <div>
          <h1>แก้ไขข้อสอบ</h1>
          <p>โครงสร้างข้อมูลอ้างอิงตาม CC1.json</p>
        </div>
        <div className="editor-header-actions">
          <button type="button" className="save-button" onClick={handleSave}>
            บันทึกข้อสอบ
          </button>
          <button type="button" className="back-button danger-button" onClick={() => setShowDeleteConfirm(true)}>
            ลบข้อสอบ
          </button>
          <button type="button" className="back-button" onClick={onBack}>
            กลับหน้าข้อสอบ
          </button>
        </div>
      </header>

      <div className="editor-course-meta">
        <div className="editor-title-box">
          <label htmlFor="exam-name">Exam Name</label>
          <input
            id="exam-name"
            value={exam.title ?? ""}
            onChange={(event) => setExam((prev) => ({ ...prev, title: event.target.value }))}
          />
        </div>
        <div className="editor-title-box">
          <label htmlFor="exam-status">Status</label>
          <select
            id="exam-status"
            value={exam.status ?? "active"}
            onChange={(event) => setExam((prev) => ({ ...prev, status: event.target.value }))}
          >
            <option value="inprogress">inprogress</option>
            <option value="active">active</option>
            <option value="inactive">inactive</option>
          </select>
        </div>
        <div className="editor-title-box">
          <label htmlFor="exam-creator">Creator</label>
          <input
            id="exam-creator"
            value={exam.creator ?? ""}
            onChange={(event) => setExam((prev) => ({ ...prev, creator: event.target.value }))}
          />
        </div>
        <div className="editor-title-box">
          <label htmlFor="exam-number-of-questions">Number of Questions</label>
          <input
            id="exam-number-of-questions"
            type="number"
            min={1}
            value={Number(exam.numberOfQuestions ?? 0)}
            onChange={(event) => setExam((prev) => ({ ...prev, numberOfQuestions: Number(event.target.value) }))}
          />
        </div>
        <div className="editor-title-box">
          <label htmlFor="exam-default-time">Default Time (minutes)</label>
          <input
            id="exam-default-time"
            type="number"
            min={1}
            value={Number(exam.defaultTime ?? 0)}
            onChange={(event) => setExam((prev) => ({ ...prev, defaultTime: Number(event.target.value) }))}
          />
        </div>
        <div className="editor-title-box">
          <label htmlFor="exam-max-attempts">จำนวนครั้งที่ทำได้ (0 = ไม่จำกัด)</label>
          <input
            id="exam-max-attempts"
            type="number"
            min={0}
            value={Number(exam.maxAttempts ?? 0)}
            onChange={(event) => setExam((prev) => ({ ...prev, maxAttempts: Number(event.target.value) }))}
          />
        </div>
        <div className="editor-title-box editor-meta-full">
          <label htmlFor="exam-image-url">Cover Image URL</label>
          <input
            id="exam-image-url"
            value={exam.image ?? ""}
            onChange={(event) => setExam((prev) => ({ ...prev, image: event.target.value }))}
            placeholder="https://..."
          />
          <div className="default-password-row">
            <input id="exam-image-upload" type="file" accept="image/*" onChange={handleUploadCoverImage} />
            <button
              type="button"
              className="manage-button"
              onClick={() => setExam((prev) => ({ ...prev, image: "" }))}
            >
              ล้างรูป (ใช้รูปสุ่ม)
            </button>
          </div>
        </div>
        <div className="editor-title-box editor-meta-full">
          <label htmlFor="exam-description">Description</label>
          <textarea
            id="exam-description"
            rows={2}
            value={exam.description ?? ""}
            onChange={(event) => setExam((prev) => ({ ...prev, description: event.target.value }))}
          />
        </div>
        <div className="editor-title-box editor-meta-full">
          <label htmlFor="exam-instructions">Instructions</label>
          <textarea
            id="exam-instructions"
            rows={3}
            value={exam.instructions ?? ""}
            onChange={(event) => setExam((prev) => ({ ...prev, instructions: event.target.value }))}
          />
        </div>
      </div>

      <div className="editor-skill-card">
        <div className="editor-skill-head">
          <h3>Import JSON (CC1 format)</h3>
        </div>
        <div className="exam-json-import-row">
          <input id="exam-json-upload" type="file" accept=".json,application/json" onChange={handleImportExamJson} />
          <p>อัปโหลดไฟล์ข้อสอบครั้งเดียว แล้วแก้รายข้อได้เลย</p>
        </div>
        <details style={{ marginTop: "0.5rem" }}>
          <summary style={{ cursor: "pointer", fontSize: "0.85rem", color: "var(--text-muted, #888)" }}>
            ดู format ไฟล์ที่รองรับ
          </summary>
          <pre style={{
            marginTop: "0.5rem",
            padding: "0.75rem",
            background: "var(--bg-code, #1e1e1e)",
            color: "var(--text-code, #d4d4d4)",
            borderRadius: "6px",
            fontSize: "0.78rem",
            overflowX: "auto",
            lineHeight: 1.6,
          }}>{`{
  "Exam Name": "ชื่อข้อสอบ",
  "Number of Questions": 4,
  "Default Time": 60,
  "Description": "คำอธิบาย (ถ้ามี)",
  "Instructions": "คำแนะนำการทำข้อสอบ",
  "DomainPercentages": {
    "Domain A": 50,
    "Domain B": 50
  },
  "Questions": [
    {
      "DomainOfKnowledge": "Domain A",
      "Question": "คำถามข้อ 1 (Domain A)",
      "Choices": [
        "A. ตัวเลือก 1",
        "B. ตัวเลือก 2",
        "C. ตัวเลือก 3",
        "D. ตัวเลือก 4"
      ],
      "AnswerKey": "B. ตัวเลือก 2",
      "Explaination": "คำอธิบายเฉลยข้อ 1"
    },
    {
      "DomainOfKnowledge": "Domain A",
      "Question": "คำถามข้อ 2 (Domain A)",
      "Choices": [
        "A. ตัวเลือก 1",
        "B. ตัวเลือก 2",
        "C. ตัวเลือก 3",
        "D. ตัวเลือก 4"
      ],
      "AnswerKey": "A. ตัวเลือก 1",
      "Explaination": "คำอธิบายเฉลยข้อ 2"
    },
    {
      "DomainOfKnowledge": "Domain B",
      "Question": "คำถามข้อ 3 (Domain B)",
      "Choices": [
        "A. ตัวเลือก 1",
        "B. ตัวเลือก 2",
        "C. ตัวเลือก 3",
        "D. ตัวเลือก 4"
      ],
      "AnswerKey": "C. ตัวเลือก 3",
      "Explaination": "คำอธิบายเฉลยข้อ 3"
    },
    {
      "DomainOfKnowledge": "Domain B",
      "Question": "คำถามข้อ 4 (Domain B)",
      "Choices": [
        "A. ตัวเลือก 1",
        "B. ตัวเลือก 2",
        "C. ตัวเลือก 3",
        "D. ตัวเลือก 4"
      ],
      "AnswerKey": "D. ตัวเลือก 4",
      "Explaination": "คำอธิบายเฉลยข้อ 4"
    }
  ]
}`}</pre>
        </details>
        {importStatus.message ? (
          <p className={`exam-json-import-message ${importStatus.type === "error" ? "is-error" : "is-success"}`}>
            {importStatus.message}
          </p>
        ) : null}
      </div>

      <div className="editor-skill-card">
        <div className="editor-skill-head">
          <h3>DomainPercentages (รวม {domainTotal}%)</h3>
          <button
            type="button"
            className="create-content-button"
            onClick={() => setDomainRows((prev) => [...prev, { domain: "", percent: 0 }])}
          >
            + เพิ่ม Domain
          </button>
        </div>
        <p style={{ fontSize: "0.85rem", color: "var(--text-muted, #888)", marginBottom: "0.5rem" }}>
          กำหนดสัดส่วน (%) ของข้อสอบในแต่ละ Domain — รวมทุก Domain ควรได้ 100%
          <br />
          ระบบจะสุ่มหรือเลือกข้อสอบให้ตรงตามสัดส่วนนี้เมื่อนักเรียนเริ่มสอบ
          เช่น ถ้ากำหนด Domain A = 60% และ Domain B = 40% และจำนวนข้อสอบ = 10 ข้อ
          จะได้ข้อจาก Domain A 6 ข้อ และ Domain B 4 ข้อ
        </p>
        <div className="editor-skill-grid">
          {domainRows.map((row, index) => (
            <div key={`domain-${index}`} className="editor-skill-row">
              <input
                value={row.domain}
                onChange={(event) =>
                  setDomainRows((prev) =>
                    prev.map((entry, entryIndex) =>
                      entryIndex === index ? { ...entry, domain: event.target.value } : entry,
                    ),
                  )
                }
                placeholder="Domain name"
              />
              <input
                type="number"
                min={0}
                value={Number(row.percent ?? 0)}
                onChange={(event) =>
                  setDomainRows((prev) =>
                    prev.map((entry, entryIndex) =>
                      entryIndex === index ? { ...entry, percent: Number(event.target.value) } : entry,
                    ),
                  )
                }
                placeholder="%"
              />
              <button
                type="button"
                className="toc-delete-button"
                onClick={() => setDomainRows((prev) => prev.filter((_, entryIndex) => entryIndex !== index))}
              >
                ลบ
              </button>
            </div>
          ))}
        </div>
      </div>

      <div className="editor-skill-card">
        <div className="editor-skill-head">
          <h3>Questions</h3>
          <div className="editor-question-tools">
            <label htmlFor="question-view-mode">แสดงผล</label>
            <select
              id="question-view-mode"
              value={questionViewMode}
              onChange={(event) => setQuestionViewMode(event.target.value)}
            >
              <option value="single">ทีละข้อ</option>
              <option value="all">ทั้งหมด</option>
            </select>
            <label htmlFor="question-jump">ข้อที่</label>
            <select
              id="question-jump"
              value={selectedQuestionIndex}
              onChange={(event) => jumpToQuestion(Number(event.target.value))}
            >
              {questions.map((_, index) => (
                <option key={`jump-${index}`} value={index}>
                  Question {index + 1}
                </option>
              ))}
            </select>
            {questionViewMode === "single" ? (
              <>
                <button
                  type="button"
                  className="back-button"
                  onClick={() => jumpToQuestion(selectedQuestionIndex - 1)}
                  disabled={selectedQuestionIndex === 0}
                >
                  ←
                </button>
                <button
                  type="button"
                  className="back-button"
                  onClick={() => jumpToQuestion(selectedQuestionIndex + 1)}
                  disabled={selectedQuestionIndex === questions.length - 1}
                >
                  →
                </button>
              </>
            ) : null}
            <button type="button" className="create-content-button" onClick={addQuestion}>
              + เพิ่มคำถาม
            </button>
          </div>
        </div>
        <div className="editor-question-list">
          {questions.map((question, index) => (
            questionViewMode === "single" && index !== selectedQuestionIndex ? null : (
            <article
              key={`question-${index}`}
              ref={(element) => {
                questionRefs.current[index] = element;
              }}
              className={`editor-question-card ${selectedQuestionIndex === index ? "editor-question-card-active" : ""}`}
              onClick={() => setSelectedQuestionIndex(index)}
            >
              <div className="editor-question-head">
                <h4>Question {index + 1}</h4>
                <button
                  type="button"
                  className="toc-delete-button"
                  onClick={(event) => {
                    event.stopPropagation();
                    removeQuestion(index);
                  }}
                >
                  ลบข้อ
                </button>
              </div>
              <div className="editor-course-meta">
                <div className="editor-title-box editor-meta-full">
                  <label htmlFor={`q-domain-${index}`}>DomainOfKnowledge</label>
                  <input
                    id={`q-domain-${index}`}
                    value={question.domain}
                    onChange={(event) => updateQuestion(index, "domain", event.target.value)}
                  />
                </div>
                <div className="editor-title-box">
                  <label htmlFor={`q-type-${index}`}>รูปแบบการตอบ</label>
                  <select
                    id={`q-type-${index}`}
                    value={question.questionType ?? "multiple_choice"}
                    onChange={(event) => updateQuestion(index, "questionType", event.target.value)}
                  >
                    <option value="multiple_choice">เลือกตอบ (Multiple Choice)</option>
                    <option value="text">พิมพ์ตอบอิสระ (ไม่มีเฉลยตายตัว)</option>
                  </select>
                </div>
                <div className="editor-title-box editor-meta-full">
                  <label htmlFor={`q-question-${index}`}>Question</label>
                  <textarea
                    id={`q-question-${index}`}
                    rows={3}
                    value={question.question}
                    onChange={(event) => updateQuestion(index, "question", event.target.value)}
                  />
                </div>
                {(question.questionType ?? "multiple_choice") === "multiple_choice" ? (
                  <>
                    <div className="editor-title-box editor-meta-full">
                      <label>Choices</label>
                      <div className="editor-choice-list">
                        {question.choices.map((choice, choiceIndex) => (
                          <input
                            key={`q-${index}-c-${choiceIndex}`}
                            value={choice}
                            onChange={(event) => updateQuestionChoice(index, choiceIndex, event.target.value)}
                            placeholder={`Choice ${choiceIndex + 1}`}
                          />
                        ))}
                      </div>
                    </div>
                    <div className="editor-title-box">
                      <label htmlFor={`q-answer-${index}`}>AnswerKey</label>
                      <input
                        id={`q-answer-${index}`}
                        value={question.answerKey}
                        onChange={(event) => updateQuestion(index, "answerKey", event.target.value)}
                      />
                    </div>
                  </>
                ) : (
                  <div className="editor-title-box editor-meta-full">
                    <p style={{ fontSize: "0.85rem", color: "var(--text-muted, #888)", margin: 0 }}>
                      ข้อนี้เป็นแบบพิมพ์ตอบอิสระ — ผู้เรียนจะพิมพ์คำตอบเองและไม่นับคะแนนอัตโนมัติ
                    </p>
                  </div>
                )}
                <div className="editor-title-box editor-meta-full">
                  <label htmlFor={`q-explain-${index}`}>Explaination</label>
                  <textarea
                    id={`q-explain-${index}`}
                    rows={3}
                    value={question.explanation}
                    onChange={(event) => updateQuestion(index, "explanation", event.target.value)}
                  />
                </div>
              </div>
            </article>
            )
          ))}
        </div>
      </div>

      {showDeleteConfirm ? (
        <div className="modal-backdrop" onClick={() => setShowDeleteConfirm(false)}>
          <article
            className="info-card confirm-delete-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-exam-modal-title"
            onClick={(event) => event.stopPropagation()}
          >
            <button
              type="button"
              className="modal-close-button"
              aria-label="ปิดกล่องยืนยันลบข้อสอบ"
              onClick={() => setShowDeleteConfirm(false)}
            >
              ×
            </button>
            <h3 id="delete-exam-modal-title">ยืนยันการลบข้อสอบ</h3>
            <p>ต้องการลบข้อสอบ "{exam.title}" ใช่หรือไม่</p>
            <div className="profile-action-row">
              <button type="button" className="end-exam-button" onClick={handleDeleteExam}>
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
