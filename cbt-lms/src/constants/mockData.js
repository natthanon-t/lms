export const DEFAULT_USERNAME = "admin";
export const DEFAULT_PASSWORD = "admin";

export const fallbackExamples = [
  {
    id: "ex-1",
    title: "Cyber Analyst: SOC Foundations",
    creator: "Blue Team Academy",
    description: "เดโมพื้นฐาน SOC Analyst: monitoring, triage, investigation, response และการสรุปผลเหตุการณ์",
    image: "https://picsum.photos/seed/soc-analyst/640/360",
    status: "active",
    skills: ["Log Analysis", "Alert Triage", "Incident Response"],
    skillRewards: [
      { skill: "Log Analysis", points: 30 },
      { skill: "Alert Triage", points: 25 },
      { skill: "Incident Response", points: 20 },
    ],
    skillPoints: 20,
    subtopicCompletionScore: 20,
    courseCompletionScore: 80,
    content: `# Cyber Analyst: SOC Foundations

## SOC Core Workflow
เส้นทางงานหลักของ SOC Analyst ตั้งแต่เห็นสัญญาณผิดปกติจนปิดเหตุการณ์

### Security Monitoring
SOC เฝ้าระวังเหตุการณ์จาก SIEM, EDR และ Firewall เพื่อตรวจจับพฤติกรรมที่ผิดปกติแบบ near real-time
[video: SOC Monitoring Basics](https://www.youtube.com/watch?v=JMY6fYL6l1Y)
- [SCORE] 15
- [Q] เครื่องมือรวม log จากหลายระบบเพื่อตรวจจับเหตุผิดปกติเรียกว่าอะไร :: SIEM :: 10
- [Q] Endpoint Detection and Response ใช้ตัวย่อว่าอะไร :: EDR :: 10

### Alert Triage
เมื่อมี Alert เข้ามา Analyst ต้องคัดแยกตาม Severity, Asset Criticality และความเป็นไปได้ที่จะเป็น True Positive
- [SCORE] 20
- [Q] ขั้นตอนคัดแยกแจ้งเตือนตามความเสี่ยงเรียกว่าอะไร :: triage :: 10
- [Q] แจ้งเตือนที่เกิดขึ้นแต่ไม่ใช่ภัยจริงเรียกว่าอะไร :: false positive :: 10

### Investigation & Correlation
นำ log หลายแหล่งมาวิเคราะห์ร่วมกันเพื่อสร้าง timeline และยืนยันขอบเขตของเหตุการณ์
- [SCORE] 20
- [Q] การเชื่อมเหตุการณ์จากหลายแหล่งเพื่อหาภาพรวมเรียกว่าอะไร :: correlation :: 10
- [Q] ตัวบ่งชี้การโจมตี เช่น IP, Hash, Domain เรียกรวมว่าอะไร :: IOC :: 10

## Incident Response Foundations
พื้นฐานการตอบสนองเหตุการณ์แบบเป็นขั้นตอนและตรวจสอบย้อนหลังได้

### Initial Containment
จำกัดผลกระทบทันที เช่น isolate เครื่องที่น่าสงสัย, block IOC สำคัญ และป้องกัน lateral movement
- [SCORE] 20
- [Q] การแยกเครื่องออกจากเครือข่ายเพื่อลดความเสี่ยงเรียกว่าอะไร :: isolate :: 10
- [Q] ขั้นตอนลดผลกระทบระยะแรกของเหตุการณ์เรียกว่าอะไร :: containment :: 10

### Escalation & Communication
ถ้าเหตุการณ์กระทบธุรกิจสูง ต้อง escalate ไป Incident Commander และแจ้งทีมที่เกี่ยวข้องตาม playbook
- [SCORE] 10
- [Q] การส่งต่อเหตุที่รุนแรงไปทีมระดับสูงเรียกว่าอะไร :: escalation :: 10
- [Q] เอกสารขั้นตอนรับมือเหตุการณ์มาตรฐานเรียกว่าอะไร :: playbook :: 10

### Reporting & Lessons Learned
หลังปิดเหตุการณ์ ต้องสรุป root cause, timeline, impact และ action items เพื่อป้องกันเหตุซ้ำ
- [SCORE] 15
- [Q] สรุปสาเหตุหลักของเหตุการณ์เรียกว่าอะไร :: root cause :: 10
- [Q] สิ่งที่ต้องปรับปรุงหลังจบเหตุการณ์มักบันทึกเป็นอะไร :: action items :: 10`,
  },
  {
    id: "ex-2",
    title: "Pentester: Engagement Basics",
    creator: "Red Team Workshop",
    description: "เข้าใจวงจรงาน Pentest ตั้งแต่กำหนดขอบเขต สำรวจระบบ ทดสอบ และเก็บหลักฐาน",
    image: "https://picsum.photos/seed/pentester-basic/640/360",
    status: "active",
    skills: ["Web Security", "Vulnerability Validation", "Evidence Reporting"],
    skillRewards: [
      { skill: "Web Security", points: 30 },
      { skill: "Vulnerability Validation", points: 25 },
      { skill: "Evidence Reporting", points: 20 },
    ],
    skillPoints: 20,
    subtopicCompletionScore: 25,
    courseCompletionScore: 90,
    content: `# Pentester: Engagement Basics

## วงจรงาน Pentest
ลำดับการทดสอบตั้งแต่ก่อนเริ่มจนส่งรายงาน

### Scoping
กำหนดขอบเขต เป้าหมาย และข้อจำกัดให้ชัดเจนเพื่อให้การทดสอบปลอดภัยและวัดผลได้
- [SCORE] 20
- [Q] เอกสารกำหนดขอบเขตก่อนเริ่มทดสอบคือขั้นตอนไหน :: scoping :: 10

### Reconnaissance
เก็บข้อมูลเป้าหมายจากแหล่งเปิดและบริการที่เปิดใช้งานเพื่อระบุ attack surface
- [SCORE] 20
- [Q] ขั้นตอนเก็บข้อมูลระบบเป้าหมายเรียกว่าอะไร :: reconnaissance :: 10

## เทคนิคประเมินช่องโหว่
แนวทางทดสอบเชิงเทคนิคที่ใช้บ่อย

### Exploitation Validation
ทดสอบการใช้ประโยชน์จากช่องโหว่แบบควบคุมได้ เพื่อพิสูจน์ผลกระทบจริงโดยไม่ทำระบบล่ม
- [SCORE] 25
- [Q] การพิสูจน์ผลกระทบช่องโหว่แบบควบคุมเรียกว่าอะไร :: exploitation :: 10

### Evidence Collection
เก็บหลักฐานผลทดสอบ เช่น screenshot, request/response และ payload ที่ใช้ เพื่อแนบในรายงาน
- [SCORE] 25
- [Q] สิ่งที่ต้องมีในรายงานเพื่อยืนยันผลทดสอบเรียกว่าอะไร :: evidence :: 10`,
  },
  {
    id: "ex-3",
    title: "Cyber Analyst + Pentester Collaboration",
    creator: "Purple Team Lab",
    description: "การทำงานร่วมกันของ Blue Team และ Red Team เพื่อยกระดับการตรวจจับและป้องกัน",
    image: "https://picsum.photos/seed/blue-red-collab/640/360",
    status: "active",
    skills: ["Detection Engineering", "Threat Hunting", "Purple Team Collaboration"],
    skillRewards: [
      { skill: "Detection Engineering", points: 30 },
      { skill: "Threat Hunting", points: 30 },
      { skill: "Purple Team Collaboration", points: 25 },
    ],
    skillPoints: 20,
    subtopicCompletionScore: 30,
    courseCompletionScore: 120,
    content: `# Cyber Analyst + Pentester Collaboration

## การทำงานร่วมกันของ Blue Team และ Red Team
เป้าหมายคือเพิ่มความพร้อมขององค์กรแบบต่อเนื่อง

### Detection Gap Review
ใช้ผล pentest ย้อนกลับไปตรวจว่า SOC ตรวจจับเทคนิคเดียวกันได้หรือไม่
- [SCORE] 25
- [Q] การทบทวนช่องว่างการตรวจจับเรียกว่าอะไร :: detection gap review :: 10

### Rule Tuning
ปรับปรุงกฎ SIEM/EDR จากพฤติกรรมจริงที่พบทดสอบ เพื่อเพิ่มความแม่นยำในการแจ้งเตือน
- [SCORE] 25
- [Q] การปรับกฎเพื่อให้แจ้งเตือนแม่นขึ้นเรียกว่าอะไร :: rule tuning :: 10

## การวัดผลหลังปรับปรุง
ติดตามผลเพื่อยืนยันว่าระบบป้องกันดีขึ้นจริง

### Retest Prioritized Findings
ทดสอบซ้ำช่องโหว่ระดับสูงที่เคยพบเพื่อยืนยันว่าปิดความเสี่ยงได้แล้ว
- [SCORE] 30
- [Q] การทดสอบซ้ำหลังแก้ไขเรียกว่าอะไร :: retest :: 10

### Lessons Learned
สรุปสิ่งที่ได้เรียนรู้ทั้งฝั่งตรวจจับและฝั่งทดสอบเพื่อวางแผนรอบถัดไป
- [SCORE] 30
- [Q] การสรุปบทเรียนหลังจบกิจกรรมเรียกว่าอะไร :: lessons learned :: 10`,
  },
];

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
