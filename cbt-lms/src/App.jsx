import { useState } from "react";
import "./App.css";
import LoginScreen from "./components/auth/LoginScreen";
import WorkspaceSidebar from "./components/layout/WorkspaceSidebar";
import { DEFAULT_PASSWORD, DEFAULT_USERNAME, initialExamBank, initialExamples } from "./constants/mockData";
import ContentPage from "./pages/ContentPage";
import EditorPage from "./pages/EditorPage";
import ExamPage from "./pages/ExamPage";
import ExamTakingPage from "./pages/ExamTakingPage";
import LeaderboardPage from "./pages/LeaderboardPage";
import LobbyPage from "./pages/LobbyPage";
import ProfilePage from "./pages/ProfilePage";
import StudyPage from "./pages/StudyPage";
import SummaryPage from "./pages/SummaryPage";
import UserManagementPage from "./pages/UserManagementPage";

export default function App() {
  const [currentUserKey, setCurrentUserKey] = useState("");
  const [activeTab, setActiveTab] = useState("home");
  const [homeView, setHomeView] = useState("lobby");
  const [examples, setExamples] = useState(initialExamples);
  const [examBank, setExamBank] = useState(initialExamBank);
  const [examView, setExamView] = useState("list");
  const [users, setUsers] = useState({
    [DEFAULT_USERNAME]: {
      name: "Admin",
      password: DEFAULT_PASSWORD,
      role: "ผู้ดูแลระบบ",
      status: "active",
    },
  });

  const [editorDraft, setEditorDraft] = useState({
    sourceId: initialExamples[0].id,
    title: initialExamples[0].title,
    content: initialExamples[0].content,
  });
  const [studyDraft, setStudyDraft] = useState({
    sourceId: initialExamples[0].id,
    title: initialExamples[0].title,
    content: initialExamples[0].content,
  });
  const [examDraft, setExamDraft] = useState({
    sourceId: initialExamBank[0].id,
    title: initialExamBank[0].title,
    content: initialExamBank[0].content,
  });

  const currentUser = currentUserKey ? users[currentUserKey] : null;

  const openEditor = (item) => {
    setEditorDraft({
      sourceId: item.id,
      title: item.title,
      content: item.content,
    });
    setActiveTab("home");
    setHomeView("editor");
  };

  const openStudy = (item) => {
    setStudyDraft({
      sourceId: item.id,
      title: item.title,
      content: item.content,
    });
    setActiveTab("home");
    setHomeView("study");
  };

  const openExam = (item) => {
    setExamDraft({
      sourceId: item.id,
      title: item.title,
      content: item.content,
    });
    setActiveTab("exam");
    setExamView("taking");
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
    setActiveTab("home");
    setHomeView("lobby");
    setExamView("list");
  };

  const handleSelectTab = (tab) => {
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

  if (!currentUser) {
    return (
      <LoginScreen
        onSuccess={(username) => setCurrentUserKey(username)}
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
      />
    );
  }

  return (
    <main className="workspace-shell">
      <WorkspaceSidebar
        currentUser={currentUser}
        activeTab={activeTab}
        onSelectTab={handleSelectTab}
        onLogout={handleLogout}
      />

      {activeTab === "profile" ? (
        <ProfilePage
          currentUser={currentUser}
          username={currentUserKey}
          onSaveName={handleSaveName}
        />
      ) : activeTab === "user-management" ? (
        <UserManagementPage
          users={users}
          onUpdateUserRole={handleUpdateUserRole}
          onUpdateUserStatus={handleUpdateUserStatus}
        />
      ) : activeTab === "leaderboard" ? (
        <LeaderboardPage users={users} />
      ) : activeTab === "summary" ? (
        <SummaryPage lessonCount={examples.length} examCount={examBank.length} />
      ) : activeTab === "exam" ? (
        examView === "taking" ? (
          <ExamTakingPage draft={examDraft} onBack={() => setExamView("list")} />
        ) : (
          <ExamPage examBank={examBank} onOpenEditor={openEditor} onEnterExam={openExam} />
        )
      ) : activeTab === "content" ? (
        <ContentPage examples={examples} onOpenEditor={openEditor} onEnterClass={openStudy} />
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
