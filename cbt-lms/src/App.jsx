import { useCallback, useEffect, useMemo, useState } from "react";
import "./App.css";
import LoginScreen from "./components/auth/LoginScreen";
import AlertModal from "./components/ui/AlertModal";
import WorkspaceSidebar from "./components/layout/WorkspaceSidebar";
import WorkspaceTopbar from "./components/layout/WorkspaceTopbar";
import {
  CONTENT_STATUS_OPTIONS,
  EXAM_STATUS_OPTIONS,
  EMPTY_EXAM_DRAFT,
} from "./constants/appConfig";
import ContentPage from "./pages/ContentPage";
import ContentDetailPage from "./pages/ContentDetailPage";
import EditorPage from "./pages/EditorPage";
import ExamPage from "./pages/ExamPage";
import ExamDetailPage from "./pages/ExamDetailPage";
import ExamEditorPage from "./pages/ExamEditorPage";
import ExamTakingPage from "./pages/ExamTakingPage";
import ExamHistoryPage from "./pages/ExamHistoryPage";
import LeaderboardPage from "./pages/LeaderboardPage";
import LobbyPage from "./pages/LobbyPage";
import ProfilePage from "./pages/ProfilePage";
import RolePermissionPage from "./pages/RolePermissionPage";
import StudyPage from "./pages/StudyPage";
import SummaryPage from "./pages/SummaryPage";
import UserManagementPage from "./pages/UserManagementPage";
import {
  buildNewCourseRecord,
  normalizeExampleRecord,
  toCourseDraft,
} from "./services/courseService";
import { buildNewExamRecord, normalizeExamRecord, toExamTakingDraft } from "./services/examService";
import { ensureCoverImage } from "./services/imageService";
import { withCompletedSubtopic, withSubmittedSubtopicAnswer } from "./services/progressService";
import { getSubtopicPages } from "./components/markdown/headingUtils";
import {
  deleteExamApi,
  fetchExamApi,
  fetchExamAttemptsApi,
  fetchExamsApi,
  saveExamAttemptApi,
  updateExamStatusApi,
  upsertExamApi,
} from "./services/examApiService";
import { canManageOwnedItem, canViewItemByStatus } from "./services/accessControlService";
import {
  clearTokens,
  fetchMyPermissions,
  loginAuth,
  logoutAuth,
  meAuth,
  refreshAuth,
  registerAuth,
} from "./services/authService";
import {
  completeCourseApi,
  deleteCourseApi,
  fetchCoursesApi,
  fetchLearningProgressApi,
  fetchUserScoresApi,
  markSubtopicCompleteApi,
  submitSubtopicAnswerApi,
  updateCourseStatusApi,
  upsertCourseApi,
} from "./services/courseApiService";
import { fetchAvatarApi } from "./services/mediaApiService";
import {
  changeProfilePassword,
  createUserAdmin,
  fetchDefaultResetPasswordAdmin,
  listUsersAdmin,
  resetUserPasswordAdmin,
  updateDefaultResetPasswordAdmin,
  updateProfileName,
  updateUserAdmin,
} from "./services/userApiService";

export default function App() {
  const toUserMap = useCallback((userList) => {
    const rows = Array.isArray(userList) ? userList : [];
    return rows.reduce((acc, user) => {
      const username = String(user?.username ?? "").trim().toLowerCase();
      if (!username) {
        return acc;
      }
      acc[username] = {
        name: user?.name ?? username,
        employeeCode: user?.employee_code ?? "",
        role: user?.role ?? "ผู้ใช้งาน",
        status: user?.status ?? "active",
      };
      return acc;
    }, {});
  }, []);

  const [currentUserKey, setCurrentUserKey] = useState("");
  const [showLogin, setShowLogin] = useState(false);
  const [authBootstrapped, setAuthBootstrapped] = useState(false);
  const [accessMessage, setAccessMessage] = useState("");
  const [activeTab, setActiveTab] = useState("home");
  const [homeView, setHomeView] = useState("lobby");
  const [selectedContent, setSelectedContent] = useState(null);
  const [examples, setExamples] = useState([]);
  const [examBank, setExamBank] = useState([]);
  const [learningProgress, setLearningProgress] = useState({});
  const [initialStudySubtopicId, setInitialStudySubtopicId] = useState("");
  const [userSkillScores, setUserSkillScores] = useState({});
  const [userTotalScore, setUserTotalScore] = useState(0);
  const [examView, setExamView] = useState("list");
  const [examOrderMode, setExamOrderMode] = useState("sequential");
  const [users, setUsers] = useState({});
  const [defaultUserPassword, setDefaultUserPassword] = useState("");
  const [currentPermissions, setCurrentPermissions] = useState([]);
  const [sidebarItems, setSidebarItems] = useState([]);

  const [editorDraft, setEditorDraft] = useState(() => toCourseDraft(normalizeExampleRecord({ id: "" })));
  const [studyDraft, setStudyDraft] = useState(() => toCourseDraft(normalizeExampleRecord({ id: "" })));
  const [examDraft, setExamDraft] = useState(EMPTY_EXAM_DRAFT);
  const [examEditorDraft, setExamEditorDraft] = useState(normalizeExamRecord(EMPTY_EXAM_DRAFT));
  const [currentExamAttempts, setCurrentExamAttempts] = useState([]);
  const [appAlert, setAppAlert] = useState(null); // { title: string, message: string } | null

  const currentUser = currentUserKey ? users[currentUserKey] : null;
  const permissionSet = useMemo(() => new Set(currentPermissions), [currentPermissions]);
  const canManageUsers = permissionSet.has("management.users.manage");
  const canViewAllExamHistory = permissionSet.has("management.exam_history.view");
  const canViewOwnExamHistory = permissionSet.has("system.exam_history.view");
  const canViewExamHistory = canViewAllExamHistory || canViewOwnExamHistory;
  const canViewSummary = permissionSet.has("system.report.view");
  const canManageContent = permissionSet.has("content.manage");
  const canManageExams = permissionSet.has("exam.manage");
  const canManageContentItem = useCallback(
    (item) => canManageOwnedItem({ item, currentUser, currentUserKey, hasManageAccess: canManageContent }),
    [currentUser, currentUserKey, canManageContent],
  );
  const canManageExamItem = useCallback(
    (item) => canManageOwnedItem({ item, currentUser, currentUserKey, hasManageAccess: canManageExams }),
    [currentUser, currentUserKey, canManageExams],
  );
  const canViewContentItem = useCallback(
    (item) => canViewItemByStatus({ item, currentUserKey, hasManageAccess: canManageContent }),
    [currentUserKey, canManageContent],
  );
  const visibleSidebarTabs = useMemo(() => {
    if (!currentUser) {
      return null;
    }
    const allowedTabKeys = new Set(["home", "profile", "leaderboard"]);
    sidebarItems.forEach((item) => {
      const key = String(item?.key ?? "").trim();
      if (key === "content.learn" || key === "content.manage") {
        allowedTabKeys.add("content");
      }
      if (key === "exam.take" || key === "exam.manage") {
        allowedTabKeys.add("exam");
      }
      if (key === "system.report") {
        allowedTabKeys.add("summary");
      }
      if (key === "system.exam_history" || key === "management.exam_history") {
        allowedTabKeys.add("exam-history");
      }
      if (key === "management.users") {
        allowedTabKeys.add("user-management");
        allowedTabKeys.add("role-permission");
      }
    });
    return Array.from(allowedTabKeys);
  }, [currentUser, sidebarItems]);

  const syncPrimaryCourseDrafts = useCallback((course) => {
    if (!course) {
      return;
    }
    setEditorDraft(toCourseDraft(course));
    setStudyDraft(toCourseDraft(course));
  }, []);

  const loadExamples = useCallback(async () => {
    if (examples.length > 0) {
      return;
    }
    try {
      const apiCourses = await fetchCoursesApi();
      const list = apiCourses.map(normalizeExampleRecord);
      setExamples(list);
      syncPrimaryCourseDrafts(list[0]);
    } catch {
      // API unavailable — leave examples empty
    }
  }, [examples.length, syncPrimaryCourseDrafts]);

  const loadExamCatalog = useCallback(async () => {
    if (examBank.length > 0) {
      return;
    }
    try {
      const apiExams = await fetchExamsApi();
      setExamBank(apiExams.map(normalizeExamRecord));
    } catch {
      setExamBank([]);
    }
  }, [examBank.length]);

  const loadCurrentExamAttempts = useCallback(async (examId) => {
    if (!currentUserKey || !examId) {
      setCurrentExamAttempts([]);
      return;
    }
    try {
      const attempts = await fetchExamAttemptsApi(examId);
      setCurrentExamAttempts(attempts);
    } catch {
      setCurrentExamAttempts([]);
    }
  }, [currentUserKey]);

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

  const loadUserScoresFromApi = useCallback(async () => {
    try {
      const { total, skills } = await fetchUserScoresApi();
      setUserTotalScore(total);
      setUserSkillScores(skills);
    } catch {
      // keep existing
    }
  }, []);

  useEffect(() => {
    if (!currentUserKey) {
      setCurrentPermissions([]);
      setSidebarItems([]);
      return;
    }
    let mounted = true;
    void fetchMyPermissions()
      .then((payload) => {
        if (!mounted) {
          return;
        }
        setCurrentPermissions(Array.isArray(payload?.permissions) ? payload.permissions : []);
        setSidebarItems(Array.isArray(payload?.sidebar) ? payload.sidebar : []);
      })
      .catch(() => {
        if (!mounted) {
          return;
        }
        setCurrentPermissions([]);
        setSidebarItems([]);
      });
    return () => {
      mounted = false;
    };
  }, [currentUserKey]);

  useEffect(() => {
    if (!visibleSidebarTabs?.length || visibleSidebarTabs.includes(activeTab)) {
      return;
    }
    setActiveTab("home");
    setHomeView("lobby");
    setExamView("list");
  }, [activeTab, visibleSidebarTabs]);

  useEffect(() => {
    if (activeTab === "profile" && currentUserKey) {
      void loadUserScoresFromApi();
    }
  }, [activeTab, currentUserKey, loadUserScoresFromApi]);

  useEffect(() => {
    let mounted = true;
    const bootstrapAuth = async () => {
      try {
        const payload = await refreshAuth();
        const profile = payload?.user ?? (await meAuth());
        const username = String(profile?.username ?? "").trim().toLowerCase();
        if (!mounted || !username) {
          return;
        }
        setUsers((prevUsers) => ({
          ...prevUsers,
          [username]: {
            ...(prevUsers[username] ?? {}),
            name: profile?.name ?? profile?.username ?? username,
            employeeCode: profile?.employee_code ?? prevUsers[username]?.employeeCode ?? "",
            role: profile?.role ?? prevUsers[username]?.role ?? "ผู้ใช้งาน",
            status: profile?.status ?? prevUsers[username]?.status ?? "active",
          },
        }));
        setCurrentPermissions(Array.isArray(profile?.permissions) ? profile.permissions : []);
        setCurrentUserKey(username);
        void loadLearningProgressFromApi(username);
        void loadUserScoresFromApi();
        void fetchAvatarApi().then((dataUrl) => {
          if (dataUrl) try { localStorage.setItem(`profile_avatar_${username}`, dataUrl); } catch { /* ignore */ }
        }).catch(() => { });
      } catch {
        clearTokens();
      } finally {
        if (mounted) {
          setAuthBootstrapped(true);
        }
      }
    };
    void bootstrapAuth();
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (!currentUserKey || !canManageUsers) {
      setDefaultUserPassword("");
      return;
    }
    void (async () => {
      try {
        const [apiUsers, defaultPassword] = await Promise.all([
          listUsersAdmin(),
          fetchDefaultResetPasswordAdmin(),
        ]);
        setUsers((prevUsers) => ({
          ...prevUsers,
          ...toUserMap(apiUsers),
        }));
        setDefaultUserPassword(defaultPassword);
      } catch {
        // noop
      }
    })();
  }, [currentUserKey, canManageUsers, toUserMap]);

  const openContentEditor = (item) => {
    if (!canManageContentItem(item)) {
      return;
    }
    const nextItem = normalizeExampleRecord(item);
    setEditorDraft(toCourseDraft(nextItem));
    setActiveTab("home");
    setHomeView("editor");
  };

  const openExamEditor = async (item) => {
    if (!canManageExamItem(item)) {
      return;
    }
    try {
      const fullExam = await fetchExamApi(item.id ?? item.sourceId);
      const nextItem = normalizeExamRecord(fullExam ?? item);
      setExamEditorDraft({ sourceId: nextItem.id ?? item?.id ?? "", ...nextItem });
    } catch {
      const nextItem = normalizeExamRecord(item);
      setExamEditorDraft({ sourceId: nextItem.id ?? item?.id ?? "", ...nextItem });
    }
    setActiveTab("exam");
    setExamView("editor");
  };

  const createExam = () => {
    if (!currentUserKey) {
      return;
    }
    const nextExam = buildNewExamRecord({
      now: Date.now(),
      creator: currentUser?.name,
      ownerUsername: currentUserKey,
    });

    setExamEditorDraft(nextExam);
    setActiveTab("exam");
    setExamView("editor");
  };

  const saveExamEditorDraft = async (nextDraft) => {
    const normalized = normalizeExamRecord({
      ...nextDraft,
      numberOfQuestions:
        Number(nextDraft.numberOfQuestions ?? 0) > 0
          ? Number(nextDraft.numberOfQuestions)
          : Array.isArray(nextDraft.questions)
            ? nextDraft.questions.length
            : 0,
    });

    try {
      const payload = await upsertExamApi(normalized);
      const saved = normalizeExamRecord(payload?.exam ?? normalized);
      setExamBank((prev) => {
        const exists = prev.some((e) => e.id === saved.id);
        return exists ? prev.map((e) => (e.id === saved.id ? saved : e)) : [saved, ...prev];
      });
      setExamDraft(toExamTakingDraft(saved));
      setExamEditorDraft(saved);
      setExamView("list");
    } catch (error) {
      setAppAlert({
        title: "ไม่สามารถบันทึกข้อสอบได้",
        message: error?.message ?? "เกิดข้อผิดพลาดในการเชื่อมต่อ กรุณาลองใหม่ในภายหลัง",
      });
    }
  };

  const openContentDetail = (item) => {
    if (!canViewContentItem(item)) {
      setAccessMessage("ไม่มีสิทธิ์เข้าถึงเนื้อหานี้");
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
    if (!canViewContentItem(item)) {
      setAccessMessage("ไม่มีสิทธิ์เข้าถึงเนื้อหานี้");
      setActiveTab("home");
      setHomeView("auth-required");
      return;
    }
    const normalized = normalizeExampleRecord(item);
    const subtopics = getSubtopicPages(normalized.content, normalized.title);
    const completedSubtopics = (learningProgress[currentUserKey] ?? {})[normalized.id]?.completedSubtopics ?? {};
    const firstIncomplete = subtopics.find((s) => !completedSubtopics[s.id]);
    setInitialStudySubtopicId(firstIncomplete?.id ?? "");
    setStudyDraft(toCourseDraft(normalized));
    setAccessMessage("");
    setActiveTab("home");
    setHomeView("study");
  };

  const openExam = async (item) => {
    try {
      const fullExam = await fetchExamApi(item.id ?? item.sourceId);
      if (!fullExam) {
        throw new Error("exam not found");
      }
      setExamDraft(toExamTakingDraft(normalizeExamRecord(fullExam)));
      setExamOrderMode("sequential");
      setCurrentExamAttempts([]);
      setAccessMessage("");
      setActiveTab("exam");
      setExamView("detail");
      if (currentUserKey) {
        void loadCurrentExamAttempts(fullExam.id);
      }
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

  const handleSaveAttempt = useCallback(
    async (result) => {
      if (!currentUserKey || !examDraft.sourceId) {
        return;
      }
      const domainStatsMap = {};
      result.domainStats.forEach(({ domain, correct, total }) => {
        domainStatsMap[domain] = { correct, total };
      });
      const answers = result.details.map(({ question, selected, isCorrect }) => ({
        questionId: question.id,
        selected: selected ?? "",
        isCorrect,
      }));
      try {
        await saveExamAttemptApi(examDraft.sourceId, {
          correctCount: result.correctCount,
          totalQuestions: result.totalQuestions,
          scorePercent: result.scorePercent,
          domainStats: domainStatsMap,
          answers,
        });
        void loadCurrentExamAttempts(examDraft.sourceId);
      } catch {
        // noop — attempt save failed silently
      }
    },
    [currentUserKey, examDraft.sourceId, loadCurrentExamAttempts],
  );

  const updateEditorDraft = (field, value) => {
    const nextValue =
      field === "image"
        ? ensureCoverImage(value, editorDraft.sourceId || editorDraft.id || `course-${Date.now()}`)
        : value;
    setEditorDraft((prevDraft) => ({ ...prevDraft, [field]: nextValue }));

    setExamples((prevExamples) =>
      prevExamples.map((example) =>
        example.id === editorDraft.sourceId ? { ...example, [field]: nextValue } : example,
      ),
    );

    setStudyDraft((prevDraft) => {
      if (prevDraft.sourceId !== editorDraft.sourceId) {
        return prevDraft;
      }
      return { ...prevDraft, [field]: nextValue };
    });

    setExamBank((prevExams) =>
      prevExams.map((exam) =>
        exam.id === editorDraft.sourceId ? { ...exam, [field]: nextValue } : exam,
      ),
    );

    setExamDraft((prevDraft) => {
      if (prevDraft.sourceId !== editorDraft.sourceId) {
        return prevDraft;
      }
      return { ...prevDraft, [field]: nextValue };
    });
  };

  const createContent = async () => {
    if (!currentUserKey) {
      return;
    }
    const newContent = buildNewCourseRecord({
      now: Date.now(),
      courseIndex: examples.length + 1,
      creator: currentUser?.name,
      ownerUsername: currentUserKey,
    });

    try {
      const payload = await upsertCourseApi(newContent);
      const saved = normalizeExampleRecord(payload?.course ?? newContent);
      setExamples((prevExamples) => [saved, ...prevExamples]);
      setEditorDraft(toCourseDraft(saved));
      setStudyDraft(toCourseDraft(saved));
      setSelectedContent(saved);
    } catch (error) {
      setAppAlert({
        title: "ไม่สามารถสร้างเนื้อหาได้",
        message: error?.message ?? "เกิดข้อผิดพลาดในการเชื่อมต่อ กรุณาลองใหม่อีกครั้ง",
      });
      return;
    }

    setActiveTab("home");
    setHomeView("editor");
  };

  const updateContentStatus = async (contentId, nextStatus) => {
    const normalizedStatus = String(nextStatus ?? "").toLowerCase();
    if (!CONTENT_STATUS_OPTIONS.includes(normalizedStatus)) {
      return;
    }
    const targetContent = examples.find((example) => example.id === contentId);
    if (!canManageContentItem(targetContent)) {
      return;
    }

    try {
      await updateCourseStatusApi(contentId, normalizedStatus);
      setExamples((prevExamples) =>
        prevExamples.map((example) =>
          example.id === contentId ? { ...example, status: normalizedStatus } : example,
        ),
      );
      setEditorDraft((prevDraft) =>
        prevDraft.sourceId === contentId ? { ...prevDraft, status: normalizedStatus } : prevDraft,
      );
      setStudyDraft((prevDraft) =>
        prevDraft.sourceId === contentId ? { ...prevDraft, status: normalizedStatus } : prevDraft,
      );
      setSelectedContent((prevContent) =>
        prevContent?.id === contentId ? { ...prevContent, status: normalizedStatus } : prevContent,
      );
    } catch (error) {
      setAppAlert({
        title: "ไม่สามารถอัปเดตสถานะเนื้อหาได้",
        message: error?.message ?? "เกิดข้อผิดพลาดในการเชื่อมต่อ กรุณาลองใหม่อีกครั้ง",
      });
    }
  };

  const updateExamStatus = (examId, nextStatus) => {
    const normalizedStatus = String(nextStatus ?? "").toLowerCase();
    if (!EXAM_STATUS_OPTIONS.includes(normalizedStatus)) {
      return;
    }
    const targetExam = examBank.find((exam) => exam.id === examId);
    if (!canManageExamItem(targetExam)) {
      return;
    }

    setExamBank((prev) =>
      prev.map((e) => (e.id === examId ? { ...e, status: normalizedStatus } : e)),
    );
    setExamEditorDraft((prev) =>
      prev.id === examId || prev.sourceId === examId ? { ...prev, status: normalizedStatus } : prev,
    );
    setExamDraft((prev) =>
      prev.sourceId === examId ? { ...prev, status: normalizedStatus } : prev,
    );

    void updateExamStatusApi(examId, normalizedStatus).catch(() => { });
  };

  const handleDeleteContent = async (contentId) => {
    const targetId = String(contentId ?? "").trim();
    if (!targetId) {
      return { success: false, message: "ไม่พบเนื้อหาที่ต้องการลบ" };
    }
    const targetContent = examples.find((example) => example.id === targetId);
    if (!canManageContentItem(targetContent)) {
      return { success: false, message: "ไม่มีสิทธิ์ลบเนื้อหานี้" };
    }

    try {
      await deleteCourseApi(targetId);
    } catch (error) {
      return { success: false, message: error?.message ?? "ไม่สามารถลบเนื้อหาได้" };
    }

    setExamples((prevExamples) => prevExamples.filter((example) => example.id !== targetId));
    setSelectedContent((prev) => (prev?.id === targetId ? null : prev));
    setHomeView("lobby");
    return { success: true, message: "ลบเนื้อหาเรียบร้อย" };
  };

  const handleDeleteExam = async (examId) => {
    const targetId = String(examId ?? "").trim();
    if (!targetId) {
      return { success: false, message: "ไม่พบข้อสอบที่ต้องการลบ" };
    }
    const targetExam = examBank.find((exam) => exam.id === targetId);
    if (!canManageExamItem(targetExam)) {
      return { success: false, message: "ไม่มีสิทธิ์ลบข้อสอบนี้" };
    }

    try {
      await deleteExamApi(targetId);
    } catch {
      // continue with local removal
    }
    setExamBank((prev) => prev.filter((e) => e.id !== targetId));
    setExamView("list");
    return { success: true, message: "ลบข้อสอบเรียบร้อย" };
  };

  const handleLogout = async () => {
    await logoutAuth();
    setCurrentUserKey("");
    setCurrentPermissions([]);
    setSidebarItems([]);
    setShowLogin(false);
    setAccessMessage("");
    setActiveTab("home");
    setHomeView("lobby");
    setExamView("list");
  };

  const handleAuthAction = () => {
    if (currentUser) {
      void handleLogout();
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

  const handleSaveName = async (name) => {
    if (!currentUserKey) {
      return { success: false, message: "ไม่พบผู้ใช้ที่ล็อกอิน" };
    }
    try {
      const payload = await updateProfileName(name);
      const user = payload?.user ?? {};
      const username = String(user?.username ?? currentUserKey).trim().toLowerCase();
      setUsers((prevUsers) => ({
        ...prevUsers,
        [username]: {
          ...(prevUsers[username] ?? {}),
          name: user?.name ?? name,
          employeeCode: user?.employee_code ?? prevUsers[username]?.employeeCode ?? "",
          role: user?.role ?? prevUsers[username]?.role ?? "ผู้ใช้งาน",
          status: user?.status ?? prevUsers[username]?.status ?? "active",
        },
      }));
      return { success: true, message: "บันทึกชื่อเรียบร้อย" };
    } catch (error) {
      return { success: false, message: error?.message ?? "ไม่สามารถบันทึกชื่อได้" };
    }
  };

  const handleChangePassword = async (username, currentPassword, nextPassword) => {
    if (!username || username !== currentUserKey) {
      return { success: false, message: "ไม่สามารถเปลี่ยนรหัสผ่านได้" };
    }
    try {
      await changeProfilePassword(currentPassword, nextPassword);
      return { success: true, message: "เปลี่ยนรหัสผ่านเรียบร้อย" };
    } catch (error) {
      return { success: false, message: error?.message ?? "ไม่สามารถเปลี่ยนรหัสผ่านได้" };
    }
  };

  const refreshUsersForAdmin = useCallback(async () => {
    if (!canManageUsers) {
      return;
    }
    try {
      const apiUsers = await listUsersAdmin();
      setUsers((prevUsers) => ({
        ...prevUsers,
        ...toUserMap(apiUsers),
      }));
    } catch {
      // noop
    }
  }, [canManageUsers, toUserMap]);

  const handleResetUserPassword = async (username) => {
    try {
      const resolvedPassword = String(defaultUserPassword ?? "").trim() || (await fetchDefaultResetPasswordAdmin());
      await resetUserPasswordAdmin(username, resolvedPassword);
      setDefaultUserPassword(resolvedPassword);
      await refreshUsersForAdmin();
      return { success: true, message: `รีเซ็ตรหัสผ่านของ ${username} สำเร็จ` };
    } catch (error) {
      return { success: false, message: error?.message ?? "รีเซ็ตรหัสผ่านไม่สำเร็จ" };
    }
  };

  const handleUpdateDefaultPassword = async (nextPassword) => {
    const trimmed = String(nextPassword ?? "").trim();
    if (!trimmed) {
      return { success: false, message: "กรุณากรอก default password" };
    }
    try {
      const payload = await updateDefaultResetPasswordAdmin(trimmed);
      setDefaultUserPassword(String(payload?.default_password ?? trimmed));
      return { success: true, message: "บันทึก default password เรียบร้อย" };
    } catch (error) {
      return { success: false, message: error?.message ?? "ไม่สามารถบันทึก default password ได้" };
    }
  };

  const handleCreateUser = async ({ name, username, employeeCode, role, status, password }) => {
    try {
      const resolvedPassword =
        String(password ?? "").trim() ||
        String(defaultUserPassword ?? "").trim() ||
        (await fetchDefaultResetPasswordAdmin());
      const payload = await createUserAdmin({
        name,
        username,
        employeeCode,
        role,
        status,
        password: resolvedPassword,
      });
      setDefaultUserPassword((prev) => prev || resolvedPassword);
      const user = payload?.user ?? {};
      const normalizedUsername = String(user?.username ?? username).trim().toLowerCase();
      if (normalizedUsername) {
        setUsers((prevUsers) => ({
          ...prevUsers,
          [normalizedUsername]: {
            name: user?.name ?? name,
            employeeCode: user?.employee_code ?? employeeCode ?? "",
            role: user?.role ?? role ?? "ผู้ใช้งาน",
            status: user?.status ?? status ?? "active",
          },
        }));
      }
      return { success: true, message: `เพิ่มผู้ใช้ ${normalizedUsername} เรียบร้อย` };
    } catch (error) {
      return { success: false, message: error?.message ?? "ไม่สามารถเพิ่มผู้ใช้ได้" };
    }
  };

  const patchUserState = (username, fields) => {
    setUsers((prevUsers) => ({
      ...prevUsers,
      [username]: { ...(prevUsers[username] ?? {}), ...fields },
    }));
  };

  const handleUpdateUserRole = async (username, role) => {
    try {
      await updateUserAdmin(username, { role });
      patchUserState(username, { role });
      return { success: true };
    } catch (error) {
      return { success: false, message: error?.message ?? "ไม่สามารถอัปเดตตำแหน่งได้" };
    }
  };

  const handleUpdateUserStatus = async (username, status) => {
    try {
      await updateUserAdmin(username, { status });
      patchUserState(username, { status });
      return { success: true };
    } catch (error) {
      return { success: false, message: error?.message ?? "ไม่สามารถอัปเดตสถานะได้" };
    }
  };

  const handleUpdateUserProfileByAdmin = async (username, payload) => {
    try {
      const response = await updateUserAdmin(username, payload);
      const user = response?.user ?? {};
      setUsers((prevUsers) => ({
        ...prevUsers,
        [username]: {
          ...(prevUsers[username] ?? {}),
          name: user?.name ?? payload?.name ?? prevUsers[username]?.name ?? username,
          employeeCode:
            user?.employee_code ?? payload?.employee_code ?? prevUsers[username]?.employeeCode ?? "",
          role: user?.role ?? prevUsers[username]?.role ?? "ผู้ใช้งาน",
          status: user?.status ?? prevUsers[username]?.status ?? "active",
        },
      }));
      return { success: true, message: `อัปเดตข้อมูลของ ${username} สำเร็จ` };
    } catch (error) {
      return { success: false, message: error?.message ?? "ไม่สามารถอัปเดตข้อมูลผู้ใช้ได้" };
    }
  };

  const saveEditorDraft = useCallback(async () => {
    try {
      const payload = await upsertCourseApi(editorDraft);
      const saved = normalizeExampleRecord(payload?.course ?? editorDraft);
      setExamples((prevExamples) => {
        const existingIndex = prevExamples.findIndex((example) => example.id === saved.id);
        if (existingIndex === -1) {
          return [saved, ...prevExamples];
        }
        return prevExamples.map((example) => (example.id === saved.id ? saved : example));
      });
      syncPrimaryCourseDrafts(saved);
      setSelectedContent((prev) => (prev?.id === saved.id ? saved : prev));
      return { success: true, message: "บันทึกเนื้อหาเรียบร้อยแล้ว" };
    } catch (error) {
      return { success: false, message: error?.message ?? "บันทึกไม่สำเร็จ" };
    }
  }, [editorDraft, syncPrimaryCourseDrafts]);

  const handleSubmitSubtopicAnswer = (courseId, subtopicId, answerResult) => {
    if (!currentUserKey) {
      return;
    }

    setLearningProgress((prevProgress) =>
      withSubmittedSubtopicAnswer({
        prevProgress,
        username: currentUserKey,
        courseId,
        subtopicId,
        answerResult,
      }),
    );

    void submitSubtopicAnswerApi(
      courseId,
      subtopicId,
      answerResult.id,
      answerResult.typedAnswer ?? "",
      Boolean(answerResult.isCorrect),
    ).catch(() => { });
  };

  const handleMarkSubtopicComplete = (courseId, subtopicId) => {
    if (!currentUserKey) {
      return;
    }

    setLearningProgress((prevProgress) =>
      withCompletedSubtopic({
        prevProgress,
        username: currentUserKey,
        courseId,
        subtopicId,
      }),
    );

    void markSubtopicCompleteApi(courseId, subtopicId).catch(() => { });

    const course = examples.find((e) => e.id === courseId || e.sourceId === courseId);
    if (course) {
      const subtopics = getSubtopicPages(course.content, course.title);
      if (subtopics.length > 0) {
        const existing = learningProgress[currentUserKey]?.[courseId]?.completedSubtopics ?? {};
        const afterCompleted = { ...existing, [subtopicId]: true };
        if (subtopics.every((s) => afterCompleted[s.id])) {
          void completeCourseApi(courseId).then(() => loadUserScoresFromApi()).catch(() => { });
        }
      }
    }
  };

  const learningStats = useMemo(
    () => ({ score: userTotalScore, skillScores: userSkillScores }),
    [userTotalScore, userSkillScores],
  );

  const loadLearningProgressFromApi = useCallback(async (username) => {
    try {
      const apiProgress = await fetchLearningProgressApi();
      setLearningProgress((prev) => ({
        ...prev,
        [username]: {
          ...(prev[username] ?? {}),
          ...apiProgress,
        },
      }));
    } catch {
      // keep existing local progress
    }
  }, []);

  const handleLoginFromBackend = async ({ username, password }) => {
    try {
      const payload = await loginAuth({ username, password });
      const profile = payload?.user ?? {};
      const normalizedUsername = String(profile?.username ?? username ?? "").trim().toLowerCase();
      if (!normalizedUsername) {
        return { success: false, message: "ไม่พบข้อมูลผู้ใช้" };
      }
      setUsers((prevUsers) => ({
        ...prevUsers,
        [normalizedUsername]: {
          ...(prevUsers[normalizedUsername] ?? {}),
          name: profile?.name ?? normalizedUsername,
          employeeCode: profile?.employee_code ?? prevUsers[normalizedUsername]?.employeeCode ?? "",
          role: profile?.role ?? "ผู้ใช้งาน",
          status: profile?.status ?? "active",
        },
      }));
      setCurrentPermissions(Array.isArray(profile?.permissions) ? profile.permissions : []);
      setCurrentUserKey(normalizedUsername);
      setAccessMessage("");
      setShowLogin(false);
      void loadLearningProgressFromApi(normalizedUsername);
      void loadUserScoresFromApi();
      void fetchAvatarApi().then((dataUrl) => {
        if (dataUrl) try { localStorage.setItem(`profile_avatar_${normalizedUsername}`, dataUrl); } catch { /* ignore */ }
      }).catch(() => { });
      return { success: true };
    } catch (error) {
      return { success: false, message: error?.message ?? "เข้าสู่ระบบไม่สำเร็จ" };
    }
  };

  const handleRegisterFromBackend = async ({ name, username, employeeCode, password }) => {
    try {
      await registerAuth({ name, username, employeeCode, password });
      return { success: true };
    } catch (error) {
      return { success: false, message: error?.message ?? "สมัครสมาชิกไม่สำเร็จ" };
    }
  };

  if (!authBootstrapped) {
    return (
      <main className="workspace-shell">
        <section className="workspace-content">
          <header className="content-header">
            <h1>กำลังตรวจสอบสิทธิ์ผู้ใช้</h1>
            <p>Loading...</p>
          </header>
        </section>
      </main>
    );
  }

  if (!currentUser && showLogin) {
    return (
      <LoginScreen
        onLogin={handleLoginFromBackend}
        onRegister={handleRegisterFromBackend}
        onCancel={() => setShowLogin(false)}
      />
    );
  }

  return (
    <div className="app-container">
      {appAlert && (
        <AlertModal
          title={appAlert.title}
          message={appAlert.message}
          onClose={() => setAppAlert(null)}
        />
      )}
      <WorkspaceTopbar
        currentUser={currentUser}
        username={currentUserKey}
        onGoHome={() => handleSelectTab("home")}
      />
      <main className="workspace-shell">
        <div className="sidebar-hover-trigger" aria-hidden="true" />
        <WorkspaceSidebar
          activeTab={activeTab}
          onSelectTab={handleSelectTab}
          onAuthAction={handleAuthAction}
          isAuthenticated={Boolean(currentUser)}
          canViewRestrictedTabs={Boolean(currentUser && (canManageUsers || canViewAllExamHistory || canViewSummary))}
          visibleTabKeys={visibleSidebarTabs}
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
            onChangePassword={handleChangePassword}
            examples={examples}
            currentUserProgress={learningProgress[currentUserKey] ?? {}}
            skillScores={userSkillScores}
          />
        ) : activeTab === "user-management" && !currentUser ? (
          <section className="workspace-content">
            <header className="content-header">
              <h1>จัดการ user</h1>
              <p>กรุณา Login ก่อนใช้งานหน้านี้</p>
            </header>
          </section>
        ) : activeTab === "user-management" && !canManageUsers ? (
          <section className="workspace-content">
            <header className="content-header">
              <h1>จัดการ user</h1>
              <p>คุณไม่มีสิทธิ์เข้าถึงหน้านี้</p>
            </header>
          </section>
        ) : activeTab === "user-management" ? (
          <UserManagementPage
            users={users}
            onUpdateUserRole={handleUpdateUserRole}
            onUpdateUserStatus={handleUpdateUserStatus}
            onUpdateUserProfile={handleUpdateUserProfileByAdmin}
            defaultPassword={defaultUserPassword}
            onUpdateDefaultPassword={handleUpdateDefaultPassword}
            onResetUserPassword={handleResetUserPassword}
            onCreateUser={handleCreateUser}
          />
        ) : activeTab === "leaderboard" ? (
          <LeaderboardPage />
        ) : activeTab === "summary" && !canViewSummary ? (
          <section className="workspace-content">
            <header className="content-header">
              <h1>สรุปผล</h1>
              <p>คุณไม่มีสิทธิ์เข้าถึงหน้านี้</p>
            </header>
          </section>
        ) : activeTab === "summary" ? (
          <SummaryPage
            lessonCount={examples.length}
            examCount={examBank.length}
            users={users}
            userTotalScore={userTotalScore}
            examples={examples}
            learningProgress={learningProgress}
          />
        ) : activeTab === "exam-history" && !currentUser ? (
          <section className="workspace-content">
            <header className="content-header">
              <h1>ประวัติการสอบ</h1>
              <p>กรุณา Login ก่อนใช้งานหน้านี้</p>
            </header>
          </section>
        ) : activeTab === "exam-history" && !canViewExamHistory ? (
          <section className="workspace-content">
            <header className="content-header">
              <h1>ประวัติการสอบ</h1>
              <p>คุณไม่มีสิทธิ์เข้าถึงหน้านี้</p>
            </header>
          </section>
        ) : activeTab === "exam-history" ? (
          <ExamHistoryPage mode={canViewAllExamHistory ? "management" : "self"} />
        ) : activeTab === "role-permission" && !currentUser ? (
          <section className="workspace-content">
            <header className="content-header">
              <h1>สิทธิ์การใช้งาน</h1>
              <p>กรุณา Login ก่อนใช้งานหน้านี้</p>
            </header>
          </section>
        ) : activeTab === "role-permission" && !canManageUsers ? (
          <section className="workspace-content">
            <header className="content-header">
              <h1>สิทธิ์การใช้งาน</h1>
              <p>คุณไม่มีสิทธิ์เข้าถึงหน้านี้</p>
            </header>
          </section>
        ) : activeTab === "role-permission" ? (
          <RolePermissionPage />
        ) : activeTab === "exam" ? (
          examView === "taking" ? (
            <ExamTakingPage
              draft={examDraft}
              onEndExam={endExam}
              orderMode={examOrderMode}
              durationSeconds={(examDraft.defaultTime ?? 0) * 60}
              onSaveAttempt={handleSaveAttempt}
            />
          ) : examView === "detail" ? (
            <ExamDetailPage
              exam={examDraft}
              onBack={() => setExamView("list")}
              onStartExam={startExam}
              userAttempts={currentExamAttempts}
              isLoggedIn={Boolean(currentUserKey)}
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
              onDeleteExam={handleDeleteExam}
            />
          ) : (
            <ExamPage
              examBank={examBank}
              onOpenEditor={openExamEditor}
              onEnterExam={openExam}
              onCreateExam={createExam}
              onUpdateExamStatus={updateExamStatus}
              currentUserKey={currentUserKey}
              hasManageAccess={canManageExams}
              canCreate={canManageExams}
            />
          )
        ) : activeTab === "content" ? (
          <ContentPage
            examples={examples}
            onOpenEditor={openContentEditor}
            onOpenDetail={openContentDetail}
            onCreateContent={createContent}
            onUpdateContentStatus={updateContentStatus}
            currentUserKey={currentUserKey}
            hasManageAccess={canManageContent}
            canCreate={canManageContent}
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
            isLoggedIn={Boolean(currentUserKey)}
          />
        ) : homeView === "study" ? (
          <StudyPage
            draft={studyDraft}
            onBack={() => setHomeView("lobby")}
            progress={(learningProgress[currentUserKey] ?? {})[studyDraft.sourceId] ?? {}}
            onMarkSubtopicComplete={handleMarkSubtopicComplete}
            onSubmitSubtopicAnswer={handleSubmitSubtopicAnswer}
            initialSubtopicId={initialStudySubtopicId}
          />
        ) : homeView === "editor" ? (
          <EditorPage
            draft={editorDraft}
            onBack={() => setHomeView("lobby")}
            onChangeDraft={updateEditorDraft}
            onSaveDraft={saveEditorDraft}
            onDeleteContent={handleDeleteContent}
            canPublish={canManageContent}
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
            currentUserKey={currentUserKey}
            canManageContent={canManageContent}
            canManageExams={canManageExams}
          />
        )}
      </main>
    </div>
  );
}
