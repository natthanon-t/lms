const escapePipes = (text) => String(text).replaceAll("|", "\\|");
const stripHtml = (text) => String(text ?? "").replace(/<[^>]*>/g, "");

const buildExamMarkdown = (examRaw) => {
  const questions = Array.isArray(examRaw.Questions) ? examRaw.Questions : [];
  const questionBlocks = questions
    .map((question, index) => {
      const choices = Array.isArray(question.Choices) ? question.Choices : [];
      const choiceText = choices.map((choice) => `- ${choice}`).join("\n");

      return `## ข้อ ${index + 1}

**Domain:** ${question.DomainOfKnowledge ?? "-"}

${question.Question ?? "-"}

${choiceText}
`;
    })
    .join("\n");

  return `# ${examRaw["Exam Name"] ?? "Exam"}

## คำแนะนำ
${examRaw.Instructions ?? "-"}

${questionBlocks}`;
};

const buildDomainSummaryMarkdown = (domainPercentages) => {
  const entries = Object.entries(domainPercentages ?? {});
  if (!entries.length) {
    return "";
  }

  const rows = entries.map(([domain, percent]) => `| ${escapePipes(domain)} | ${percent}% |`).join("\n");
  return `\n\n## สัดส่วนเนื้อหา\n| Domain | Percentage |\n| --- | --- |\n${rows}`;
};

export const normalizeExamRaw = (examRaw, meta = {}) => {
  const normalizedQuestions = (Array.isArray(examRaw.Questions) ? examRaw.Questions : []).map(
    (question, index) => ({
      id: `q-${index + 1}`,
      domain: question.DomainOfKnowledge ?? "-",
      question: stripHtml(question.Question),
      choices: Array.isArray(question.Choices)
        ? question.Choices.map((choice) => stripHtml(choice))
        : [],
      answerKey: stripHtml(question.AnswerKey),
      explanation: stripHtml(question.Explaination),
    }),
  );

  const numberOfQuestions = examRaw["Number of Questions"] ?? normalizedQuestions.length;
  const defaultTime = examRaw["Default Time"] ?? meta.defaultTime ?? 0;

  return {
    id: meta.id ?? "exam",
    title: examRaw["Exam Name"] ?? meta.title ?? "Exam",
    description: meta.description ?? `${numberOfQuestions} Questions • ${defaultTime} Minutes`,
    image: meta.image ?? "https://picsum.photos/seed/exam-default/640/360",
    file: meta.file,
    instructions: examRaw.Instructions ?? meta.instructions ?? "-",
    numberOfQuestions,
    defaultTime,
    domainPercentages: examRaw.DomainPercentages ?? {},
    questions: normalizedQuestions,
    content: `${buildExamMarkdown(examRaw)}${buildDomainSummaryMarkdown(examRaw.DomainPercentages)}`,
  };
};
