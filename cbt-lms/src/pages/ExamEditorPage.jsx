import { useEffect, useMemo, useState } from "react";

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
    question: question.question ?? "",
    choices: Array.isArray(question.choices) && question.choices.length ? question.choices : ["A. ", "B. ", "C. ", "D. "],
    answerKey: question.answerKey ?? "",
    explanation: question.explanation ?? "",
  }));
};

export default function ExamEditorPage({ draft, onBack, onSaveDraft }) {
  const [exam, setExam] = useState(draft);
  const [domainRows, setDomainRows] = useState(() => toDomainRows(draft.domainPercentages));
  const [questions, setQuestions] = useState(() => toQuestions(draft.questions));

  useEffect(() => {
    setExam(draft);
    setDomainRows(toDomainRows(draft.domainPercentages));
    setQuestions(toQuestions(draft.questions));
  }, [draft]);

  const domainTotal = useMemo(
    () => domainRows.reduce((sum, row) => sum + Number(row.percent || 0), 0),
    [domainRows],
  );

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
        question: "",
        choices: ["A. ", "B. ", "C. ", "D. "],
        answerKey: "",
        explanation: "",
      },
    ]);
  };

  const removeQuestion = (index) => {
    setQuestions((prevQuestions) => prevQuestions.filter((_, questionIndex) => questionIndex !== index));
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
      question: String(question.question ?? "").trim(),
      choices: (Array.isArray(question.choices) ? question.choices : []).map((choice) => String(choice ?? "").trim()),
      answerKey: String(question.answerKey ?? "").trim(),
      explanation: String(question.explanation ?? "").trim(),
    }));

    onSaveDraft?.({
      ...exam,
      domainPercentages,
      numberOfQuestions: Number(exam.numberOfQuestions ?? 0),
      defaultTime: Number(exam.defaultTime ?? 0),
      questions: normalizedQuestions,
    });
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
          <h3>DomainPercentages (รวม {domainTotal}%)</h3>
          <button
            type="button"
            className="create-content-button"
            onClick={() => setDomainRows((prev) => [...prev, { domain: "", percent: 0 }])}
          >
            + เพิ่ม Domain
          </button>
        </div>
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
          <button type="button" className="create-content-button" onClick={addQuestion}>
            + เพิ่มคำถาม
          </button>
        </div>
        <div className="editor-question-list">
          {questions.map((question, index) => (
            <article key={`question-${index}`} className="editor-question-card">
              <div className="editor-question-head">
                <h4>Question {index + 1}</h4>
                <button type="button" className="toc-delete-button" onClick={() => removeQuestion(index)}>
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
                <div className="editor-title-box editor-meta-full">
                  <label htmlFor={`q-question-${index}`}>Question</label>
                  <textarea
                    id={`q-question-${index}`}
                    rows={3}
                    value={question.question}
                    onChange={(event) => updateQuestion(index, "question", event.target.value)}
                  />
                </div>
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
          ))}
        </div>
      </div>
    </section>
  );
}
