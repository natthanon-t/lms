import { useCallback, useEffect, useMemo, useState } from "react";
import "./App.css";
import LoginScreen from "./components/auth/LoginScreen";
import WorkspaceSidebar from "./components/layout/WorkspaceSidebar";
import { DEFAULT_PASSWORD, DEFAULT_USERNAME, fallbackExamples, normalizeExamRaw } from "./constants/mockData";
import ContentPage from "./pages/ContentPage";
import ContentDetailPage from "./pages/ContentDetailPage";
import EditorPage from "./pages/EditorPage";
import ExamPage from "./pages/ExamPage";
import ExamDetailPage from "./pages/ExamDetailPage";
import ExamEditorPage from "./pages/ExamEditorPage";
import ExamTakingPage from "./pages/ExamTakingPage";
import LeaderboardPage from "./pages/LeaderboardPage";
import LobbyPage from "./pages/LobbyPage";
import ProfilePage from "./pages/ProfilePage";
import StudyPage from "./pages/StudyPage";
import SummaryPage from "./pages/SummaryPage";
import UserManagementPage from "./pages/UserManagementPage";
import { getSubtopicPages } from "./components/markdown/headingUtils";

const emptyExamDraft = {
  sourceId: "",
  title: "",
  description: "",
  instructions: "",
  numberOfQuestions: 0,
  defaultTime: 0,
  domainPercentages: {},
  questions: [],
  content: "",
};

const EXAMPLES_STORAGE_KEY = "cbt_lms_examples";
const EXAMPLES_SEED_VERSION_KEY = "cbt_lms_examples_seed_version";
const EXAMPLES_SEED_VERSION = "2026-02-21-soc-foundations-demo-v5";
const EXAMS_STORAGE_KEY = "cbt_lms_exam_bank";
const LEARNING_PROGRESS_STORAGE_KEY = "cbt_lms_learning_progress";
const CONTENT_STATUS_OPTIONS = ["active", "inprogress", "inactive"];
const EXAM_STATUS_OPTIONS = ["active", "inprogress", "inactive"];

const normalizeSkillRewardList = (item) => {
  if (Array.isArray(item.skillRewards)) {
    return item.skillRewards
      .map((entry) => ({
        skill: String(entry?.skill ?? "").trim(),
        points: Number(entry?.points ?? 0),
      }))
      .filter((entry) => entry.skill && entry.points > 0);
  }

  if (item.skillRewards && typeof item.skillRewards === "object") {
    return Object.entries(item.skillRewards)
      .map(([skill, points]) => ({
        skill: String(skill ?? "").trim(),
        points: Number(points ?? 0),
      }))
      .filter((entry) => entry.skill && entry.points > 0);
  }

  return [];
};

const normalizeExampleRecord = (item) => {
  const normalizedStatus = String(item.status ?? "active").toLowerCase();
  const normalizedSkills = Array.isArray(item.skills)
    ? item.skills.map((skill) => String(skill).trim()).filter(Boolean)
    : [];
  const normalizedSkillRewards = normalizeSkillRewardList(item);
  const fallbackSkillPoints = Number(item.skillPoints ?? 20);
  const mergedSkills = Array.from(
    new Set([...normalizedSkills, ...normalizedSkillRewards.map((reward) => reward.skill)]),
  );
  const skillRewards = normalizedSkillRewards.length
    ? normalizedSkillRewards
    : mergedSkills.map((skill) => ({ skill, points: fallbackSkillPoints }));
  const ensuredSkillRewards = skillRewards.length
    ? skillRewards
    : [{ skill: "Cyber Fundamentals", points: fallbackSkillPoints > 0 ? fallbackSkillPoints : 20 }];
  const ensuredSkills = Array.from(new Set(ensuredSkillRewards.map((reward) => reward.skill)));

  return {
    ...item,
    status: CONTENT_STATUS_OPTIONS.includes(normalizedStatus) ? normalizedStatus : "active",
    creator: item.creator ?? "Cyber Training Team",
    description: item.description ?? "คอร์สเนื้อหาด้าน Cyber Security",
    skills: ensuredSkills,
    skillRewards: ensuredSkillRewards,
    skillPoints: fallbackSkillPoints,
    subtopicCompletionScore: Number(item.subtopicCompletionScore ?? 20),
    courseCompletionScore: Number(item.courseCompletionScore ?? 100),
  };
};

const normalizeExamRecord = (item) => {
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
    description: item.description ?? "",
    instructions: item.instructions ?? "",
    image: item.image ?? "https://picsum.photos/seed/exam-default/640/360",
    numberOfQuestions: Number(item.numberOfQuestions ?? questions.length ?? 0),
    defaultTime: Number(item.defaultTime ?? 0),
    domainPercentages: item.domainPercentages ?? {},
    questions,
  };
};

const readStoredJson = (key) => {
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) {
      return null;
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
};

const readStoredObject = (key) => {
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) {
      return null;
    }
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
};

const calculateLearningStats = (users, examples, learningProgress) => {
  const stats = {};

  Object.keys(users).forEach((username) => {
    const userProgress = learningProgress?.[username] ?? {};
    let totalScore = 0;
    let solvedQuestions = 0;
    let completedCourses = 0;
    const skillScores = {};

    examples.forEach((course) => {
      const courseProgress = userProgress?.[course.id] ?? {};
      const subtopics = getSubtopicPages(course.content, course.title);
      const completedSubtopics = courseProgress.completedSubtopics ?? {};
      const answers = courseProgress.answers ?? {};
      let allDone = subtopics.length > 0;

      subtopics.forEach((subtopic) => {
        const isDone = Boolean(completedSubtopics[subtopic.id]);
        if (!isDone) {
          allDone = false;
          return;
        }

        totalScore += Number(subtopic.baseScore ?? course.subtopicCompletionScore ?? 20);
        const subtopicAnswers = answers[subtopic.id] ?? {};
        subtopic.questions.forEach((question) => {
          if (subtopicAnswers[question.id]?.isCorrect) {
            totalScore += Number(question.points ?? 0);
            solvedQuestions += 1;
          }
        });
      });

      if (allDone && subtopics.length > 0) {
        totalScore += Number(course.courseCompletionScore ?? 100);
        completedCourses += 1;
        const rewards = Array.isArray(course.skillRewards)
          ? course.skillRewards
          : (Array.isArray(course.skills) ? course.skills : []).map((skill) => ({
              skill,
              points: Number(course.skillPoints ?? 20),
            }));
        rewards.forEach((reward) => {
          const skill = String(reward?.skill ?? "").trim();
          const points = Number(reward?.points ?? 0);
          if (!skill || points <= 0) {
            return;
          }
          skillScores[skill] = Number(skillScores[skill] ?? 0) + points;
        });
      }
    });

    stats[username] = {
      score: totalScore,
      solvedQuestions,
      completedCourses,
      skillScores,
    };
  });

  return stats;
};

export default function App() {
  const [currentUserKey, setCurrentUserKey] = useState("");
  const [showLogin, setShowLogin] = useState(false);
  const [accessMessage, setAccessMessage] = useState("");
  const [activeTab, setActiveTab] = useState("home");
  const [homeView, setHomeView] = useState("lobby");
  const [selectedContent, setSelectedContent] = useState(null);
  const [examples, setExamples] = useState([]);
  const [examBank, setExamBank] = useState([]);
  const [learningProgress, setLearningProgress] = useState({});
  const [examView, setExamView] = useState("list");
  const [examOrderMode, setExamOrderMode] = useState("sequential");
  const [users, setUsers] = useState({
    [DEFAULT_USERNAME]: {
      name: "Admin",
      password: DEFAULT_PASSWORD,
      role: "ผู้ดูแลระบบ",
      status: "active",
    },
  });

  const [editorDraft, setEditorDraft] = useState({
    sourceId: fallbackExamples[0].id,
    title: fallbackExamples[0].title,
    content: fallbackExamples[0].content,
    creator: fallbackExamples[0].creator,
    description: fallbackExamples[0].description,
    image: fallbackExamples[0].image,
    status: fallbackExamples[0].status,
    skills: fallbackExamples[0].skills,
    skillRewards: fallbackExamples[0].skillRewards,
    skillPoints: fallbackExamples[0].skillPoints,
    subtopicCompletionScore: fallbackExamples[0].subtopicCompletionScore,
    courseCompletionScore: fallbackExamples[0].courseCompletionScore,
  });
  const [studyDraft, setStudyDraft] = useState({
    sourceId: fallbackExamples[0].id,
    title: fallbackExamples[0].title,
    content: fallbackExamples[0].content,
    creator: fallbackExamples[0].creator,
    description: fallbackExamples[0].description,
    image: fallbackExamples[0].image,
    status: fallbackExamples[0].status,
    skills: fallbackExamples[0].skills,
    skillRewards: fallbackExamples[0].skillRewards,
    skillPoints: fallbackExamples[0].skillPoints,
    subtopicCompletionScore: fallbackExamples[0].subtopicCompletionScore,
    courseCompletionScore: fallbackExamples[0].courseCompletionScore,
  });
  const [examDraft, setExamDraft] = useState(emptyExamDraft);
  const [examEditorDraft, setExamEditorDraft] = useState(normalizeExamRecord(emptyExamDraft));

  const currentUser = currentUserKey ? users[currentUserKey] : null;
  const isAdmin = currentUser?.role === "ผู้ดูแลระบบ";

  const loadExamples = useCallback(async () => {
    if (examples.length > 0) {
      return;
    }

    const storedExamples = readStoredJson(EXAMPLES_STORAGE_KEY);
    const storedSeedVersion = window.localStorage.getItem(EXAMPLES_SEED_VERSION_KEY);
    if (storedExamples?.length && storedSeedVersion === EXAMPLES_SEED_VERSION) {
      const normalizedExamples = storedExamples.map(normalizeExampleRecord);
      setExamples(normalizedExamples);
      setEditorDraft({
        sourceId: normalizedExamples[0].id,
        ...normalizedExamples[0],
      });
      setStudyDraft({
        sourceId: normalizedExamples[0].id,
        ...normalizedExamples[0],
      });
      return;
    }

    try {
      const response = await fetch("/data/examples.json");
      if (!response.ok) {
        throw new Error("failed to load examples");
      }
      const data = await response.json();
      const list = (Array.isArray(data) ? data : []).map(normalizeExampleRecord);
      setExamples(list);
      window.localStorage.setItem(EXAMPLES_STORAGE_KEY, JSON.stringify(list));
      window.localStorage.setItem(EXAMPLES_SEED_VERSION_KEY, EXAMPLES_SEED_VERSION);
      if (list[0]) {
        setEditorDraft({ sourceId: list[0].id, ...list[0] });
        setStudyDraft({ sourceId: list[0].id, ...list[0] });
      }
    } catch {
      if (storedExamples?.length) {
        const normalizedStored = storedExamples.map(normalizeExampleRecord);
        setExamples(normalizedStored);
        if (normalizedStored[0]) {
          setEditorDraft({ sourceId: normalizedStored[0].id, ...normalizedStored[0] });
          setStudyDraft({ sourceId: normalizedStored[0].id, ...normalizedStored[0] });
        }
        return;
      }

      const normalizedFallback = fallbackExamples.map(normalizeExampleRecord);
      setExamples(normalizedFallback);
      if (normalizedFallback[0]) {
        setEditorDraft({ sourceId: normalizedFallback[0].id, ...normalizedFallback[0] });
        setStudyDraft({ sourceId: normalizedFallback[0].id, ...normalizedFallback[0] });
      }
    }
  }, [examples.length]);

  const loadExamCatalog = useCallback(async () => {
    if (examBank.length > 0) {
      return;
    }

    const storedExamBank = readStoredJson(EXAMS_STORAGE_KEY);
    if (storedExamBank?.length) {
      setExamBank(storedExamBank.map(normalizeExamRecord));
      return;
    }

    try {
      const response = await fetch("/exam/index.json");
      if (!response.ok) {
        throw new Error("failed to load exam catalog");
      }
      const data = await response.json();
      setExamBank((Array.isArray(data) ? data : []).map(normalizeExamRecord));
    } catch {
      setExamBank([]);
    }
  }, [examBank.length]);

  useEffect(() => {
    if (activeTab === "home" || activeTab === "content") {
      void loadExamples();
    }
  }, [activeTab, loadExamples]);

  useEffect(() => {
    if (activeTab === "home" || activeTab === "exam") {
      void loadExamCatalog();
    }
  }, [activeTab, loadExamCatalog]);

  useEffect(() => {
    const storedProgress = readStoredObject(LEARNING_PROGRESS_STORAGE_KEY);
    if (storedProgress) {
      setLearningProgress(storedProgress);
    }
  }, []);

  useEffect(() => {
    try {
      window.localStorage.setItem(LEARNING_PROGRESS_STORAGE_KEY, JSON.stringify(learningProgress));
    } catch {
      // noop
    }
  }, [learningProgress]);

  const ensureFullExam = useCallback(async (item) => {
    if (item?.questions?.length) {
      return item;
    }
    if (!item?.file) {
      return item;
    }

    const response = await fetch(item.file);
    if (!response.ok) {
      throw new Error("failed to load exam detail");
    }

    const examRaw = await response.json();
    const normalizedExam = normalizeExamRecord(normalizeExamRaw(examRaw, item));

    setExamBank((prevExamBank) =>
      prevExamBank.map((exam) => (exam.id === normalizedExam.id ? { ...exam, ...normalizedExam } : exam)),
    );

    return normalizedExam;
  }, []);

  const openContentEditor = (item) => {
    if (!isAdmin) {
      return;
    }
    const nextItem = normalizeExampleRecord(item);
    setEditorDraft({
      sourceId: nextItem.id,
      ...nextItem,
    });
    setActiveTab("home");
    setHomeView("editor");
  };

  const openExamEditor = async (item) => {
    if (!isAdmin) {
      return;
    }
    let nextItem = normalizeExamRecord(item);
    if (item?.file) {
      try {
        nextItem = normalizeExamRecord(await ensureFullExam(item));
      } catch {
        return;
      }
    }
    setExamEditorDraft({
      sourceId: nextItem.id ?? item?.id ?? "",
      ...nextItem,
    });
    setActiveTab("exam");
    setExamView("editor");
  };

  const createExam = () => {
    if (!isAdmin) {
      return;
    }
    const now = Date.now();
    const nextExam = normalizeExamRecord({
      id: `exam-${now}`,
      sourceId: `exam-${now}`,
      title: "New Practice Exam",
      description: "Custom exam created by admin",
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

    setExamEditorDraft(nextExam);
    setActiveTab("exam");
    setExamView("editor");
  };

  const saveExamEditorDraft = (nextDraft) => {
    const normalizedDraft = normalizeExamRecord({
      ...nextDraft,
      numberOfQuestions:
        Number(nextDraft.numberOfQuestions ?? 0) > 0
          ? Number(nextDraft.numberOfQuestions)
          : Array.isArray(nextDraft.questions)
            ? nextDraft.questions.length
            : 0,
    });

    setExamBank((prevExamBank) => {
      const exists = prevExamBank.some((exam) => exam.id === normalizedDraft.id);
      const nextExamBank = exists
        ? prevExamBank.map((exam) => (exam.id === normalizedDraft.id ? normalizedDraft : exam))
        : [normalizedDraft, ...prevExamBank];
      try {
        window.localStorage.setItem(EXAMS_STORAGE_KEY, JSON.stringify(nextExamBank));
      } catch {
        // noop
      }
      return nextExamBank;
    });

    setExamDraft({
      sourceId: normalizedDraft.id,
      title: normalizedDraft.title,
      description: normalizedDraft.description,
      instructions: normalizedDraft.instructions,
      numberOfQuestions: normalizedDraft.numberOfQuestions,
      defaultTime: normalizedDraft.defaultTime,
      domainPercentages: normalizedDraft.domainPercentages ?? {},
      questions: normalizedDraft.questions ?? [],
      content: normalizedDraft.content ?? "",
    });
    setExamEditorDraft(normalizedDraft);
    setExamView("list");
  };

  const openContentDetail = (item) => {
    if (!currentUser) {
      setAccessMessage("กรุณา Login ก่อนใช้งานหน้านี้");
      setActiveTab("home");
      setHomeView("auth-required");
      return;
    }

    setSelectedContent(normalizeExampleRecord(item));
    setAccessMessage("");
    setActiveTab("home");
    setHomeView("content-detail");
  };

  const enterStudy = (item) => {
    setStudyDraft({
      sourceId: item.id,
      ...normalizeExampleRecord(item),
    });
    setAccessMessage("");
    setActiveTab("home");
    setHomeView("study");
  };

  const openExam = async (item) => {
    if (!currentUser) {
      setAccessMessage("กรุณา Login ก่อนใช้งานหน้านี้");
      setActiveTab("exam");
      setExamView("auth-required");
      return;
    }

    try {
      const fullExam = await ensureFullExam(item);
      setExamDraft({
        sourceId: fullExam.id,
        title: fullExam.title,
        description: fullExam.description,
        instructions: fullExam.instructions,
        numberOfQuestions: fullExam.numberOfQuestions,
        defaultTime: fullExam.defaultTime,
        domainPercentages: fullExam.domainPercentages ?? {},
        questions: fullExam.questions ?? [],
        content: fullExam.content,
      });
      setExamOrderMode("sequential");
      setAccessMessage("");
      setActiveTab("exam");
      setExamView("detail");
    } catch {
      setAccessMessage("ไม่สามารถโหลดรายละเอียดข้อสอบได้");
      setActiveTab("exam");
      setExamView("auth-required");
    }
  };

  const startExam = (orderMode) => {
    setExamOrderMode(orderMode);
    setActiveTab("exam");
    setExamView("taking");
  };

  const endExam = () => {
    setActiveTab("exam");
    setExamView("list");
  };

  const updateEditorDraft = (field, value) => {
    setEditorDraft((prevDraft) => ({ ...prevDraft, [field]: value }));

    setExamples((prevExamples) =>
      prevExamples.map((example) =>
        example.id === editorDraft.sourceId ? { ...example, [field]: value } : example,
      ),
    );

    setStudyDraft((prevDraft) => {
      if (prevDraft.sourceId !== editorDraft.sourceId) {
        return prevDraft;
      }
      return { ...prevDraft, [field]: value };
    });

    setExamBank((prevExams) =>
      prevExams.map((exam) =>
        exam.id === editorDraft.sourceId ? { ...exam, [field]: value } : exam,
      ),
    );

    setExamDraft((prevDraft) => {
      if (prevDraft.sourceId !== editorDraft.sourceId) {
        return prevDraft;
      }
      return { ...prevDraft, [field]: value };
    });
  };

  const createContent = () => {
    const now = Date.now();
    const newContent = normalizeExampleRecord({
      id: `course-${now}`,
      title: `เนื้อหาใหม่ ${examples.length + 1}`,
      creator: currentUser?.name ?? "Cyber Training Team",
      description: "เนื้อหาใหม่สำหรับฝึกการเรียนรู้ด้าน Cyber Security",
      image: `https://picsum.photos/seed/course-${now}/640/360`,
      status: "inprogress",
      skills: ["Log Analysis"],
      skillRewards: [
        { skill: "Log Analysis", points: 20 },
        { skill: "Threat Detection", points: 15 },
      ],
      skillPoints: 20,
      subtopicCompletionScore: 20,
      courseCompletionScore: 100,
      content: `# เนื้อหาใหม่

## หัวข้อหลัก 1
อธิบายภาพรวมหัวข้อหลัก

### หัวข้อย่อย 1
ใส่รายละเอียดหัวข้อย่อย
- [SCORE] 20`,
    });

    setExamples((prevExamples) => {
      const nextExamples = [newContent, ...prevExamples];
      try {
        window.localStorage.setItem(EXAMPLES_STORAGE_KEY, JSON.stringify(nextExamples));
        window.localStorage.setItem(EXAMPLES_SEED_VERSION_KEY, EXAMPLES_SEED_VERSION);
      } catch {
        // noop
      }
      return nextExamples;
    });

    setEditorDraft({ sourceId: newContent.id, ...newContent });
    setStudyDraft({ sourceId: newContent.id, ...newContent });
    setSelectedContent(newContent);
    setActiveTab("home");
    setHomeView("editor");
  };

  const updateContentStatus = (contentId, nextStatus) => {
    const normalizedStatus = String(nextStatus ?? "").toLowerCase();
    if (!CONTENT_STATUS_OPTIONS.includes(normalizedStatus)) {
      return;
    }

    setExamples((prevExamples) => {
      const nextExamples = prevExamples.map((example) =>
        example.id === contentId ? { ...example, status: normalizedStatus } : example,
      );
      try {
        window.localStorage.setItem(EXAMPLES_STORAGE_KEY, JSON.stringify(nextExamples));
        window.localStorage.setItem(EXAMPLES_SEED_VERSION_KEY, EXAMPLES_SEED_VERSION);
      } catch {
        // noop
      }
      return nextExamples;
    });

    setEditorDraft((prevDraft) =>
      prevDraft.sourceId === contentId ? { ...prevDraft, status: normalizedStatus } : prevDraft,
    );
    setStudyDraft((prevDraft) =>
      prevDraft.sourceId === contentId ? { ...prevDraft, status: normalizedStatus } : prevDraft,
    );
    setSelectedContent((prevContent) =>
      prevContent?.id === contentId ? { ...prevContent, status: normalizedStatus } : prevContent,
    );
  };

  const handleLogout = () => {
    setCurrentUserKey("");
    setShowLogin(false);
    setAccessMessage("");
    setActiveTab("home");
    setHomeView("lobby");
    setExamView("list");
  };

  const handleAuthAction = () => {
    if (currentUser) {
      handleLogout();
      return;
    }
    setShowLogin(true);
  };

  const handleSelectTab = (tab) => {
    setAccessMessage("");
    setActiveTab(tab);
    if (tab === "home") {
      setHomeView("lobby");
      setSelectedContent(null);
    }
    if (tab === "exam") {
      setExamView("list");
    }
  };

  const handleSaveName = (name) => {
    if (!currentUserKey) {
      return;
    }

    setUsers((prevUsers) => ({
      ...prevUsers,
      [currentUserKey]: {
        ...prevUsers[currentUserKey],
        name,
      },
    }));
  };

  const handleUpdateUserRole = (username, role) => {
    setUsers((prevUsers) => ({
      ...prevUsers,
      [username]: {
        ...prevUsers[username],
        role,
      },
    }));
  };

  const handleUpdateUserStatus = (username, status) => {
    setUsers((prevUsers) => ({
      ...prevUsers,
      [username]: {
        ...prevUsers[username],
        status,
      },
    }));
  };

  const saveEditorDraft = useCallback(() => {
    try {
      window.localStorage.setItem(EXAMPLES_STORAGE_KEY, JSON.stringify(examples));
      window.localStorage.setItem(EXAMPLES_SEED_VERSION_KEY, EXAMPLES_SEED_VERSION);
      window.localStorage.setItem(EXAMS_STORAGE_KEY, JSON.stringify(examBank));
      return true;
    } catch {
      return false;
    }
  }, [examples, examBank]);

  const handleSubmitSubtopicAnswer = (courseId, subtopicId, answerResult) => {
    if (!currentUserKey) {
      return;
    }

    setLearningProgress((prevProgress) => ({
      ...prevProgress,
      [currentUserKey]: {
        ...(prevProgress[currentUserKey] ?? {}),
        [courseId]: {
          ...((prevProgress[currentUserKey] ?? {})[courseId] ?? {}),
          completedSubtopics: {
            ...(((prevProgress[currentUserKey] ?? {})[courseId] ?? {}).completedSubtopics ?? {}),
          },
          answers: {
            ...(((prevProgress[currentUserKey] ?? {})[courseId] ?? {}).answers ?? {}),
            [subtopicId]: {
              ...((((prevProgress[currentUserKey] ?? {})[courseId] ?? {}).answers ?? {})[subtopicId] ?? {}),
              [answerResult.id]: {
                typedAnswer: answerResult.typedAnswer,
                isCorrect: answerResult.isCorrect,
              },
            },
          },
        },
      },
    }));
  };

  const handleMarkSubtopicComplete = (courseId, subtopicId) => {
    if (!currentUserKey) {
      return;
    }

    setLearningProgress((prevProgress) => ({
      ...prevProgress,
      [currentUserKey]: {
        ...(prevProgress[currentUserKey] ?? {}),
        [courseId]: {
          ...((prevProgress[currentUserKey] ?? {})[courseId] ?? {}),
          answers: {
            ...(((prevProgress[currentUserKey] ?? {})[courseId] ?? {}).answers ?? {}),
          },
          completedSubtopics: {
            ...(((prevProgress[currentUserKey] ?? {})[courseId] ?? {}).completedSubtopics ?? {}),
            [subtopicId]: true,
          },
        },
      },
    }));
  };

  const learningStats = useMemo(
    () => calculateLearningStats(users, examples, learningProgress),
    [users, examples, learningProgress],
  );

  if (!currentUser && showLogin) {
    return (
      <LoginScreen
        onSuccess={(username) => {
          setCurrentUserKey(username);
          setAccessMessage("");
          setShowLogin(false);
        }}
        onRegister={(name, user, password) =>
          setUsers((prevUsers) => ({
            ...prevUsers,
            [user]: {
              name,
              password,
              role: "ผู้ใช้งาน",
              status: "active",
            },
          }))
        }
        users={users}
        onCancel={() => setShowLogin(false)}
      />
    );
  }

  return (
    <main className="workspace-shell">
      <WorkspaceSidebar
        currentUser={currentUser}
        activeTab={activeTab}
        onSelectTab={handleSelectTab}
        onAuthAction={handleAuthAction}
        isAuthenticated={Boolean(currentUser)}
        isAdmin={isAdmin}
      />

      {activeTab === "profile" && !currentUser ? (
        <section className="workspace-content">
          <header className="content-header">
            <h1>โปรไฟล์</h1>
            <p>กรุณา Login ก่อนใช้งานหน้านี้</p>
          </header>
        </section>
      ) : activeTab === "profile" ? (
        <ProfilePage
          currentUser={currentUser}
          username={currentUserKey}
          onSaveName={handleSaveName}
          examples={examples}
          learningStats={learningStats}
          currentUserProgress={learningProgress[currentUserKey] ?? {}}
        />
      ) : activeTab === "user-management" && !currentUser ? (
        <section className="workspace-content">
          <header className="content-header">
            <h1>จัดการ user</h1>
            <p>กรุณา Login ก่อนใช้งานหน้านี้</p>
          </header>
        </section>
      ) : activeTab === "user-management" && !isAdmin ? (
        <section className="workspace-content">
          <header className="content-header">
            <h1>จัดการ user</h1>
            <p>หน้านี้สำหรับผู้ดูแลระบบเท่านั้น</p>
          </header>
        </section>
      ) : activeTab === "user-management" ? (
        <UserManagementPage
          users={users}
          onUpdateUserRole={handleUpdateUserRole}
          onUpdateUserStatus={handleUpdateUserStatus}
        />
      ) : activeTab === "leaderboard" && !currentUser ? (
        <section className="workspace-content">
          <header className="content-header">
            <h1>ลีดเดอร์บอร์ด</h1>
            <p>กรุณา Login ก่อนใช้งานหน้านี้</p>
          </header>
        </section>
      ) : activeTab === "leaderboard" ? (
        <LeaderboardPage users={users} learningStats={learningStats} />
      ) : activeTab === "summary" && !isAdmin ? (
        <section className="workspace-content">
          <header className="content-header">
            <h1>สรุปผล</h1>
            <p>หน้านี้สำหรับผู้ดูแลระบบเท่านั้น</p>
          </header>
        </section>
      ) : activeTab === "summary" ? (
        <SummaryPage
          lessonCount={examples.length}
          examCount={examBank.length}
          users={users}
          learningStats={learningStats}
          examples={examples}
          learningProgress={learningProgress}
        />
      ) : activeTab === "exam" ? (
        examView === "taking" ? (
          <ExamTakingPage
            draft={examDraft}
            onEndExam={endExam}
            orderMode={examOrderMode}
            durationSeconds={(examDraft.defaultTime ?? 0) * 60}
          />
        ) : examView === "detail" ? (
          <ExamDetailPage
            exam={examDraft}
            onBack={() => setExamView("list")}
            onStartExam={startExam}
          />
        ) : examView === "auth-required" ? (
          <section className="workspace-content">
            <header className="content-header">
              <h1>ข้อสอบ</h1>
              <p>{accessMessage || "กรุณา Login ก่อนใช้งานหน้านี้"}</p>
            </header>
          </section>
        ) : examView === "editor" ? (
          <ExamEditorPage
            draft={examEditorDraft}
            onBack={() => setExamView("list")}
            onSaveDraft={saveExamEditorDraft}
          />
        ) : (
          <ExamPage
            examBank={examBank}
            onOpenEditor={openExamEditor}
            onEnterExam={openExam}
            onCreateExam={createExam}
            canManage={isAdmin}
          />
        )
      ) : activeTab === "content" ? (
        <ContentPage
          examples={examples}
          onOpenEditor={openContentEditor}
          onOpenDetail={openContentDetail}
          onCreateContent={createContent}
          onUpdateContentStatus={updateContentStatus}
          canManage={isAdmin}
        />
      ) : homeView === "auth-required" ? (
        <section className="workspace-content">
          <header className="content-header">
            <h1>เนื้อหา</h1>
            <p>{accessMessage || "กรุณา Login ก่อนใช้งานหน้านี้"}</p>
          </header>
        </section>
      ) : homeView === "content-detail" && selectedContent ? (
        <ContentDetailPage
          contentItem={selectedContent}
          onBack={() => {
            setHomeView("lobby");
            setSelectedContent(null);
          }}
          onEnterStudy={() => enterStudy(selectedContent)}
        />
      ) : homeView === "study" ? (
        <StudyPage
          draft={studyDraft}
          onBack={() => setHomeView("lobby")}
          progress={(learningProgress[currentUserKey] ?? {})[studyDraft.sourceId] ?? {}}
          onMarkSubtopicComplete={handleMarkSubtopicComplete}
          onSubmitSubtopicAnswer={handleSubmitSubtopicAnswer}
        />
      ) : homeView === "editor" ? (
        <EditorPage
          draft={editorDraft}
          onBack={() => setHomeView("lobby")}
          onChangeDraft={updateEditorDraft}
          onSaveDraft={saveEditorDraft}
        />
      ) : (
        <LobbyPage
          examples={examples}
          examBank={examBank}
          onOpenEditor={openContentEditor}
          onOpenExamEditor={openExamEditor}
          onEnterClass={openContentDetail}
          onEnterExam={openExam}
          onUpdateContentStatus={updateContentStatus}
          canManage={isAdmin}
        />
      )}
    </main>
  );
}
