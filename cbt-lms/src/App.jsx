import { useCallback, useEffect, useState } from "react";
import "./App.css";
import LoginScreen from "./components/auth/LoginScreen";
import WorkspaceSidebar from "./components/layout/WorkspaceSidebar";
import { DEFAULT_PASSWORD, DEFAULT_USERNAME, fallbackExamples, normalizeExamRaw } from "./constants/mockData";
import ContentPage from "./pages/ContentPage";
import EditorPage from "./pages/EditorPage";
import ExamPage from "./pages/ExamPage";
import ExamDetailPage from "./pages/ExamDetailPage";
import ExamTakingPage from "./pages/ExamTakingPage";
import LeaderboardPage from "./pages/LeaderboardPage";
import LobbyPage from "./pages/LobbyPage";
import ProfilePage from "./pages/ProfilePage";
import StudyPage from "./pages/StudyPage";
import SummaryPage from "./pages/SummaryPage";
import UserManagementPage from "./pages/UserManagementPage";

const emptyExamDraft = {
  sourceId: "",
  title: "",
  description: "",
  instructions: "",
  numberOfQuestions: 0,
  defaultTime: 0,
  questions: [],
  content: "",
};

export default function App() {
  const [currentUserKey, setCurrentUserKey] = useState("");
  const [showLogin, setShowLogin] = useState(false);
  const [accessMessage, setAccessMessage] = useState("");
  const [activeTab, setActiveTab] = useState("home");
  const [homeView, setHomeView] = useState("lobby");
  const [examples, setExamples] = useState([]);
  const [examBank, setExamBank] = useState([]);
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
  });
  const [studyDraft, setStudyDraft] = useState({
    sourceId: fallbackExamples[0].id,
    title: fallbackExamples[0].title,
    content: fallbackExamples[0].content,
  });
  const [examDraft, setExamDraft] = useState(emptyExamDraft);

  const currentUser = currentUserKey ? users[currentUserKey] : null;

  const loadExamples = useCallback(async () => {
    if (examples.length > 0) {
      return;
    }

    try {
      const response = await fetch("/data/examples.json");
      if (!response.ok) {
        throw new Error("failed to load examples");
      }
      const data = await response.json();
      const list = Array.isArray(data) ? data : [];
      setExamples(list);
      if (list[0]) {
        setEditorDraft({ sourceId: list[0].id, title: list[0].title, content: list[0].content });
        setStudyDraft({ sourceId: list[0].id, title: list[0].title, content: list[0].content });
      }
    } catch {
      setExamples(fallbackExamples);
    }
  }, [examples.length]);

  const loadExamCatalog = useCallback(async () => {
    if (examBank.length > 0) {
      return;
    }

    try {
      const response = await fetch("/exam/index.json");
      if (!response.ok) {
        throw new Error("failed to load exam catalog");
      }
      const data = await response.json();
      setExamBank(Array.isArray(data) ? data : []);
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
    const normalizedExam = normalizeExamRaw(examRaw, item);

    setExamBank((prevExamBank) =>
      prevExamBank.map((exam) => (exam.id === normalizedExam.id ? { ...exam, ...normalizedExam } : exam)),
    );

    return normalizedExam;
  }, []);

  const openEditor = async (item) => {
    let nextItem = item;
    if (item?.file) {
      try {
        nextItem = await ensureFullExam(item);
      } catch {
        return;
      }
    }

    setEditorDraft({
      sourceId: nextItem.id,
      title: nextItem.title,
      content: nextItem.content,
    });
    setActiveTab("home");
    setHomeView("editor");
  };

  const openStudy = (item) => {
    if (!currentUser) {
      setAccessMessage("กรุณา Login ก่อนใช้งานหน้านี้");
      setActiveTab("home");
      setHomeView("auth-required");
      return;
    }

    setStudyDraft({
      sourceId: item.id,
      title: item.title,
      content: item.content,
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
        />
      ) : activeTab === "user-management" && !currentUser ? (
        <section className="workspace-content">
          <header className="content-header">
            <h1>จัดการ user</h1>
            <p>กรุณา Login ก่อนใช้งานหน้านี้</p>
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
        <LeaderboardPage users={users} />
      ) : activeTab === "summary" ? (
        <SummaryPage lessonCount={examples.length} examCount={examBank.length} />
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
        ) : (
          <ExamPage examBank={examBank} onOpenEditor={openEditor} onEnterExam={openExam} />
        )
      ) : activeTab === "content" ? (
        <ContentPage examples={examples} onOpenEditor={openEditor} onEnterClass={openStudy} />
      ) : homeView === "auth-required" ? (
        <section className="workspace-content">
          <header className="content-header">
            <h1>เนื้อหา</h1>
            <p>{accessMessage || "กรุณา Login ก่อนใช้งานหน้านี้"}</p>
          </header>
        </section>
      ) : homeView === "study" ? (
        <StudyPage draft={studyDraft} onBack={() => setHomeView("lobby")} />
      ) : homeView === "editor" ? (
        <EditorPage
          draft={editorDraft}
          onBack={() => setHomeView("lobby")}
          onChangeDraft={updateEditorDraft}
        />
      ) : (
        <LobbyPage
          examples={examples}
          examBank={examBank}
          onOpenEditor={openEditor}
          onEnterClass={openStudy}
          onEnterExam={openExam}
        />
      )}
    </main>
  );
}
