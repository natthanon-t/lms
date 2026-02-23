import { EXAM_STATUS_OPTIONS } from "../constants/appConfig";
import { ensureCoverImage } from "./imageService";

export const normalizeExamRecord = (item) => {
  const normalizedStatus = String(item.status ?? "active").toLowerCase();
  const questions = Array.isArray(item.questions)
    ? item.questions.map((question, index) => ({
        id: question.id ?? `q-${index + 1}`,
        domain: question.domain ?? question.DomainOfKnowledge ?? "-",
        question: question.question ?? question.Question ?? "",
        choices: Array.isArray(question.choices)
          ? question.choices
          : Array.isArray(question.Choices)
            ? question.Choices
            : [],
        answerKey: question.answerKey ?? question.AnswerKey ?? "",
        explanation: question.explanation ?? question.Explaination ?? "",
      }))
    : [];

  return {
    ...item,
    status: EXAM_STATUS_OPTIONS.includes(normalizedStatus) ? normalizedStatus : "active",
    title: item.title ?? "Exam",
    creator: item.creator ?? "ทีมผู้สอน",
    ownerUsername: String(item.ownerUsername ?? "").trim(),
    description: item.description ?? "",
    instructions: item.instructions ?? "",
    image: ensureCoverImage(item.image, item.id ?? `exam-${Date.now()}`),
    numberOfQuestions: Number(item.numberOfQuestions ?? questions.length ?? 0),
    defaultTime: Number(item.defaultTime ?? 0),
    domainPercentages: item.domainPercentages ?? {},
    questions,
  };
};

export const toExamTakingDraft = (exam) => ({
  sourceId: exam.id,
  title: exam.title,
  description: exam.description,
  instructions: exam.instructions,
  numberOfQuestions: exam.numberOfQuestions,
  defaultTime: exam.defaultTime,
  domainPercentages: exam.domainPercentages ?? {},
  questions: exam.questions ?? [],
  content: exam.content ?? "",
});

export const buildNewExamRecord = ({ now, creator, ownerUsername }) =>
  normalizeExamRecord({
    id: `exam-${now}`,
    sourceId: `exam-${now}`,
    title: "New Practice Exam",
    description: "Custom exam created by instructor",
    creator: creator ?? "ทีมผู้สอน",
    ownerUsername: ownerUsername ?? "",
    instructions: "Read all questions carefully.",
    image: `https://picsum.photos/seed/exam-${now}/640/360`,
    status: "inprogress",
    numberOfQuestions: 1,
    defaultTime: 60,
    domainPercentages: {
      "ISC2 CC Domain 1: Security Principles": 100,
    },
    questions: [
      {
        id: "q-1",
        domain: "ISC2 CC Domain 1: Security Principles",
        question: "Sample question",
        choices: ["A. Choice 1", "B. Choice 2", "C. Choice 3", "D. Choice 4"],
        answerKey: "A. Choice 1",
        explanation: "Sample explanation",
      },
    ],
  });
