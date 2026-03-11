import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { CONTENT_STATUS_OPTIONS, EXAM_STATUS_OPTIONS, EMPTY_EXAM_DRAFT } from "../constants/appConfig";
import {
  buildNewCourseRecord,
  normalizeExampleRecord,
  toCourseDraft,
} from "../services/courseService";
import { buildNewExamRecord, normalizeExamRecord, toExamTakingDraft } from "../services/examService";
import { ensureCoverImage } from "../services/imageService";
import { withCompletedSubtopic, withSubmittedSubtopicAnswer } from "../services/progressService";
import { getSubtopicPages } from "../components/markdown/headingUtils";
import {
  deleteExamApi,
  fetchExamApi,
  fetchExamAttemptsApi,
  fetchExamFullApi,
  fetchExamsApi,
  saveExamAttemptApi,
  updateExamStatusApi,
  upsertExamApi,
} from "../services/examApiService";
import { canManageOwnedItem, canViewItemByStatus } from "../services/accessControlService";
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
} from "../services/courseApiService";
import {
  changeProfilePassword,
  createUserAdmin,
  fetchDefaultResetPasswordAdmin,
  resetUserPasswordAdmin,
  updateProfile,
  updateProfileName,
  updateUserAdmin,
} from "../services/userApiService";
import { useAuth } from "./AuthContext";

const AppDataContext = createContext(null);

export function AppDataProvider({ children }) {
  const {
    currentUserKey,
    currentUser,
    canManageContent,
    canManageExams,
    defaultUserPassword,
    setDefaultUserPassword,
    setUsers,
    refreshUsersForAdmin,
    patchUserState,
  } = useAuth();

  const [examples, setExamples] = useState([]);
  const [examBank, setExamBank] = useState([]);
  const [learningProgress, setLearningProgress] = useState({});
  const [userSkillScores, setUserSkillScores] = useState({});
  const [userTotalScore, setUserTotalScore] = useState(0);
  const [editorDraft, setEditorDraft] = useState(() => toCourseDraft(normalizeExampleRecord({ id: "" })));
  const [studyDraft, setStudyDraft] = useState(() => toCourseDraft(normalizeExampleRecord({ id: "" })));
  const [examDraft, setExamDraft] = useState(EMPTY_EXAM_DRAFT);
  const [examEditorDraft, setExamEditorDraft] = useState(normalizeExamRecord(EMPTY_EXAM_DRAFT));
  const [currentExamAttempts, setCurrentExamAttempts] = useState([]);
  const [appAlert, setAppAlert] = useState(null);

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

  const syncPrimaryCourseDrafts = useCallback((course) => {
    if (!course) return;
    setEditorDraft(toCourseDraft(course));
    setStudyDraft(toCourseDraft(course));
  }, []);

  const loadExamples = useCallback(async () => {
    if (examples.length > 0) return;
    try {
      const apiCourses = await fetchCoursesApi();
      const list = apiCourses.map(normalizeExampleRecord);
      setExamples(list);
      syncPrimaryCourseDrafts(list[0]);
    } catch {
      // API unavailable
    }
  }, [examples.length, syncPrimaryCourseDrafts]);

  const loadExamCatalog = useCallback(async () => {
    if (examBank.length > 0) return;
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

  const loadUserScoresFromApi = useCallback(async () => {
    try {
      const { total, skills } = await fetchUserScoresApi();
      setUserTotalScore(total);
      setUserSkillScores(skills);
    } catch {
      // keep existing
    }
  }, []);

  const loadLearningProgressFromApi = useCallback(async (username) => {
    try {
      const apiProgress = await fetchLearningProgressApi();
      setLearningProgress((prev) => ({
        ...prev,
        [username]: { ...(prev[username] ?? {}), ...apiProgress },
      }));
    } catch {
      // keep existing
    }
  }, []);

  // Load scores when user changes
  useEffect(() => {
    if (currentUserKey) {
      void loadLearningProgressFromApi(currentUserKey);
      void loadUserScoresFromApi();
    }
  }, [currentUserKey, loadLearningProgressFromApi, loadUserScoresFromApi]);

  const learningStats = useMemo(
    () => ({ score: userTotalScore, skillScores: userSkillScores }),
    [userTotalScore, userSkillScores],
  );

  // ─── Content handlers ─────────────────────────────────────────────────────

  const openContentEditor = (item) => {
    if (!canManageContentItem(item)) return null;
    const nextItem = normalizeExampleRecord(item);
    setEditorDraft(toCourseDraft(nextItem));
    return nextItem;
  };

  const openExamEditor = async (item) => {
    if (!canManageExamItem(item)) return null;
    try {
      const fullExam = await fetchExamFullApi(item.id ?? item.sourceId);
      const nextItem = normalizeExamRecord(fullExam ?? item);
      const draft = { sourceId: nextItem.id ?? item?.id ?? "", ...nextItem };
      setExamEditorDraft(draft);
      return draft;
    } catch {
      const nextItem = normalizeExamRecord(item);
      const draft = { sourceId: nextItem.id ?? item?.id ?? "", ...nextItem };
      setExamEditorDraft(draft);
      return draft;
    }
  };

  const createExam = async () => {
    if (!currentUserKey) return null;
    const nextExam = buildNewExamRecord({
      now: Date.now(),
      creator: currentUser?.name,
      ownerUsername: currentUserKey,
    });
    setExamEditorDraft(nextExam);
    return nextExam;
  };

  const saveExamEditorDraft = async (nextDraft) => {
    const normalized = normalizeExamRecord({
      ...nextDraft,
      numberOfQuestions:
        Number(nextDraft.numberOfQuestions ?? 0) > 0
          ? Number(nextDraft.numberOfQuestions)
          : Array.isArray(nextDraft.questions) ? nextDraft.questions.length : 0,
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
      return { success: true };
    } catch (error) {
      setAppAlert({
        title: "ไม่สามารถบันทึกข้อสอบได้",
        message: error?.message ?? "เกิดข้อผิดพลาดในการเชื่อมต่อ กรุณาลองใหม่ในภายหลัง",
      });
      return { success: false };
    }
  };

  const openContentDetail = (item) => {
    if (!canViewContentItem(item)) return { blocked: true, message: "ไม่มีสิทธิ์เข้าถึงเนื้อหานี้" };
    return { blocked: false, content: normalizeExampleRecord(item) };
  };

  const prepareStudy = (item) => {
    if (!canViewContentItem(item)) return { blocked: true, message: "ไม่มีสิทธิ์เข้าถึงเนื้อหานี้" };
    const normalized = normalizeExampleRecord(item);
    const subtopics = getSubtopicPages(normalized.content, normalized.title);
    const completedSubtopics = (learningProgress[currentUserKey] ?? {})[normalized.id]?.completedSubtopics ?? {};
    const firstIncomplete = subtopics.find((s) => !completedSubtopics[s.id]);
    setStudyDraft(toCourseDraft(normalized));
    return { blocked: false, initialSubtopicId: firstIncomplete?.id ?? "" };
  };

  const openExam = async (item) => {
    try {
      const fullExam = await fetchExamApi(item.id ?? item.sourceId);
      if (!fullExam) throw new Error("exam not found");
      const draft = toExamTakingDraft(normalizeExamRecord(fullExam));
      setExamDraft(draft);
      setCurrentExamAttempts([]);
      if (currentUserKey) void loadCurrentExamAttempts(fullExam.id);
      return { success: true, examDraft: draft };
    } catch {
      return { success: false, message: "ไม่สามารถโหลดรายละเอียดข้อสอบได้" };
    }
  };

  const handleSaveAttempt = useCallback(
    async (result) => {
      if (!currentUserKey || !examDraft.sourceId) return;
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
        // noop
      }
    },
    [currentUserKey, examDraft.sourceId, loadCurrentExamAttempts],
  );

  const updateEditorDraft = (field, value) => {
    const nextValue =
      field === "image"
        ? ensureCoverImage(value, editorDraft.sourceId || editorDraft.id || `course-${Date.now()}`)
        : value;
    setEditorDraft((prev) => ({ ...prev, [field]: nextValue }));
    setExamples((prev) =>
      prev.map((example) =>
        example.id === editorDraft.sourceId ? { ...example, [field]: nextValue } : example,
      ),
    );
    setStudyDraft((prev) => {
      if (prev.sourceId !== editorDraft.sourceId) return prev;
      return { ...prev, [field]: nextValue };
    });
  };

  const createContent = async () => {
    if (!currentUserKey) return { success: false };
    const newContent = buildNewCourseRecord({
      now: Date.now(),
      courseIndex: examples.length + 1,
      creator: currentUser?.name,
      ownerUsername: currentUserKey,
    });
    try {
      const payload = await upsertCourseApi(newContent);
      const saved = normalizeExampleRecord(payload?.course ?? newContent);
      setExamples((prev) => [saved, ...prev]);
      setEditorDraft(toCourseDraft(saved));
      setStudyDraft(toCourseDraft(saved));
      return { success: true, saved };
    } catch (error) {
      setAppAlert({
        title: "ไม่สามารถสร้างเนื้อหาได้",
        message: error?.message ?? "เกิดข้อผิดพลาดในการเชื่อมต่อ กรุณาลองใหม่อีกครั้ง",
      });
      return { success: false };
    }
  };

  const updateContentStatus = async (contentId, nextStatus) => {
    const normalizedStatus = String(nextStatus ?? "").toLowerCase();
    if (!CONTENT_STATUS_OPTIONS.includes(normalizedStatus)) return;
    const targetContent = examples.find((e) => e.id === contentId);
    if (!canManageContentItem(targetContent)) return;
    try {
      await updateCourseStatusApi(contentId, normalizedStatus);
      setExamples((prev) =>
        prev.map((e) => (e.id === contentId ? { ...e, status: normalizedStatus } : e)),
      );
      setEditorDraft((prev) =>
        prev.sourceId === contentId ? { ...prev, status: normalizedStatus } : prev,
      );
      setStudyDraft((prev) =>
        prev.sourceId === contentId ? { ...prev, status: normalizedStatus } : prev,
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
    if (!EXAM_STATUS_OPTIONS.includes(normalizedStatus)) return;
    const targetExam = examBank.find((e) => e.id === examId);
    if (!canManageExamItem(targetExam)) return;
    setExamBank((prev) => prev.map((e) => (e.id === examId ? { ...e, status: normalizedStatus } : e)));
    setExamEditorDraft((prev) =>
      prev.id === examId || prev.sourceId === examId ? { ...prev, status: normalizedStatus } : prev,
    );
    setExamDraft((prev) => (prev.sourceId === examId ? { ...prev, status: normalizedStatus } : prev));
    void updateExamStatusApi(examId, normalizedStatus).catch(() => {});
  };

  const handleDeleteContent = async (contentId) => {
    const targetId = String(contentId ?? "").trim();
    if (!targetId) return { success: false, message: "ไม่พบเนื้อหาที่ต้องการลบ" };
    const targetContent = examples.find((e) => e.id === targetId);
    if (!canManageContentItem(targetContent)) return { success: false, message: "ไม่มีสิทธิ์ลบเนื้อหานี้" };
    try {
      await deleteCourseApi(targetId);
    } catch (error) {
      return { success: false, message: error?.message ?? "ไม่สามารถลบเนื้อหาได้" };
    }
    setExamples((prev) => prev.filter((e) => e.id !== targetId));
    return { success: true, message: "ลบเนื้อหาเรียบร้อย" };
  };

  const handleDeleteExam = async (examId) => {
    const targetId = String(examId ?? "").trim();
    if (!targetId) return { success: false, message: "ไม่พบข้อสอบที่ต้องการลบ" };
    const targetExam = examBank.find((e) => e.id === targetId);
    if (!canManageExamItem(targetExam)) return { success: false, message: "ไม่มีสิทธิ์ลบข้อสอบนี้" };
    try {
      await deleteExamApi(targetId);
    } catch {
      // continue with local removal
    }
    setExamBank((prev) => prev.filter((e) => e.id !== targetId));
    return { success: true, message: "ลบข้อสอบเรียบร้อย" };
  };

  const saveEditorDraft = useCallback(async () => {
    try {
      const payload = await upsertCourseApi(editorDraft);
      const saved = normalizeExampleRecord(payload?.course ?? editorDraft);
      setExamples((prev) => {
        const existingIndex = prev.findIndex((e) => e.id === saved.id);
        if (existingIndex === -1) return [saved, ...prev];
        return prev.map((e) => (e.id === saved.id ? saved : e));
      });
      syncPrimaryCourseDrafts(saved);
      return { success: true, message: "บันทึกเนื้อหาเรียบร้อยแล้ว" };
    } catch (error) {
      return { success: false, message: error?.message ?? "บันทึกไม่สำเร็จ" };
    }
  }, [editorDraft, syncPrimaryCourseDrafts]);

  const handleSubmitSubtopicAnswer = (courseId, subtopicId, answerResult) => {
    if (!currentUserKey) return;
    setLearningProgress((prev) =>
      withSubmittedSubtopicAnswer({ prevProgress: prev, username: currentUserKey, courseId, subtopicId, answerResult }),
    );
    void submitSubtopicAnswerApi(
      courseId, subtopicId,
      answerResult.id, answerResult.typedAnswer ?? "",
      Boolean(answerResult.isCorrect),
    ).catch(() => {});
  };

  const handleMarkSubtopicComplete = (courseId, subtopicId) => {
    if (!currentUserKey) return;
    setLearningProgress((prev) =>
      withCompletedSubtopic({ prevProgress: prev, username: currentUserKey, courseId, subtopicId }),
    );
    void markSubtopicCompleteApi(courseId, subtopicId).catch(() => {});
    const course = examples.find((e) => e.id === courseId || e.sourceId === courseId);
    if (course) {
      const subtopics = getSubtopicPages(course.content, course.title);
      if (subtopics.length > 0) {
        const existing = learningProgress[currentUserKey]?.[courseId]?.completedSubtopics ?? {};
        const afterCompleted = { ...existing, [subtopicId]: true };
        if (subtopics.every((s) => afterCompleted[s.id])) {
          void completeCourseApi(courseId).then(() => loadUserScoresFromApi()).catch(() => {});
        }
      }
    }
  };

  // ─── User/profile handlers ────────────────────────────────────────────────

  const handleSaveName = async (name) => {
    if (!currentUserKey) return { success: false, message: "ไม่พบผู้ใช้ที่ล็อกอิน" };
    try {
      const payload = await updateProfileName(name);
      const user = payload?.user ?? {};
      const username = String(user?.username ?? currentUserKey).trim().toLowerCase();
      setUsers((prev) => ({
        ...prev,
        [username]: {
          ...(prev[username] ?? {}),
          name: user?.name ?? name,
          employeeCode: user?.employee_code ?? prev[username]?.employeeCode ?? "",
          role: user?.role ?? prev[username]?.role ?? "ผู้ใช้งาน",
          status: user?.status ?? prev[username]?.status ?? "active",
        },
      }));
      return { success: true, message: "บันทึกชื่อเรียบร้อย" };
    } catch (error) {
      return { success: false, message: error?.message ?? "ไม่สามารถบันทึกชื่อได้" };
    }
  };

  const handleSaveProfile = async ({ name, employeeCode }) => {
    if (!currentUserKey) return { success: false, message: "ไม่พบผู้ใช้ที่ล็อกอิน" };
    try {
      const payload = await updateProfile({ name, employeeCode });
      const user = payload?.user ?? {};
      const username = String(user?.username ?? currentUserKey).trim().toLowerCase();
      setUsers((prev) => ({
        ...prev,
        [username]: {
          ...(prev[username] ?? {}),
          name: user?.name ?? name,
          employeeCode: user?.employee_code ?? employeeCode ?? prev[username]?.employeeCode ?? "",
          role: user?.role ?? prev[username]?.role ?? "ผู้ใช้งาน",
          status: user?.status ?? prev[username]?.status ?? "active",
        },
      }));
      return { success: true, message: "บันทึกข้อมูลเรียบร้อย" };
    } catch (error) {
      return { success: false, message: error?.message ?? "ไม่สามารถบันทึกข้อมูลได้" };
    }
  };

  const handleChangePassword = async (username, currentPassword, nextPassword) => {
    if (!username || username !== currentUserKey) return { success: false, message: "ไม่สามารถเปลี่ยนรหัสผ่านได้" };
    try {
      await changeProfilePassword(currentPassword, nextPassword);
      return { success: true, message: "เปลี่ยนรหัสผ่านเรียบร้อย" };
    } catch (error) {
      return { success: false, message: error?.message ?? "ไม่สามารถเปลี่ยนรหัสผ่านได้" };
    }
  };

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

  const handleCreateUser = async ({ name, username, employeeCode, role, status, password }) => {
    try {
      const resolvedPassword =
        String(password ?? "").trim() ||
        String(defaultUserPassword ?? "").trim() ||
        (await fetchDefaultResetPasswordAdmin());
      const payload = await createUserAdmin({ name, username, employeeCode, role, status, password: resolvedPassword });
      setDefaultUserPassword((prev) => prev || resolvedPassword);
      const user = payload?.user ?? {};
      const normalizedUsername = String(user?.username ?? username).trim().toLowerCase();
      if (normalizedUsername) {
        setUsers((prev) => ({
          ...prev,
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
      setUsers((prev) => ({
        ...prev,
        [username]: {
          ...(prev[username] ?? {}),
          name: user?.name ?? payload?.name ?? prev[username]?.name ?? username,
          employeeCode: user?.employee_code ?? payload?.employee_code ?? prev[username]?.employeeCode ?? "",
          role: user?.role ?? prev[username]?.role ?? "ผู้ใช้งาน",
          status: user?.status ?? prev[username]?.status ?? "active",
        },
      }));
      return { success: true, message: `อัปเดตข้อมูลของ ${username} สำเร็จ` };
    } catch (error) {
      return { success: false, message: error?.message ?? "ไม่สามารถอัปเดตข้อมูลผู้ใช้ได้" };
    }
  };

  const value = {
    examples,
    setExamples,
    examBank,
    setExamBank,
    learningProgress,
    setLearningProgress,
    userSkillScores,
    userTotalScore,
    editorDraft,
    setEditorDraft,
    studyDraft,
    setStudyDraft,
    examDraft,
    setExamDraft,
    examEditorDraft,
    setExamEditorDraft,
    currentExamAttempts,
    setCurrentExamAttempts,
    appAlert,
    setAppAlert,
    learningStats,
    // loaders
    loadExamples,
    loadExamCatalog,
    loadCurrentExamAttempts,
    loadUserScoresFromApi,
    loadLearningProgressFromApi,
    // content
    openContentEditor,
    openContentDetail,
    prepareStudy,
    createContent,
    updateEditorDraft,
    saveEditorDraft,
    updateContentStatus,
    handleDeleteContent,
    canManageContentItem,
    canViewContentItem,
    // exam
    openExamEditor,
    createExam,
    openExam,
    saveExamEditorDraft,
    updateExamStatus,
    handleDeleteExam,
    handleSaveAttempt,
    canManageExamItem,
    // study
    handleMarkSubtopicComplete,
    handleSubmitSubtopicAnswer,
    // user / profile
    handleSaveName,
    handleSaveProfile,
    handleChangePassword,
    handleResetUserPassword,
    handleCreateUser,
    handleUpdateUserRole,
    handleUpdateUserStatus,
    handleUpdateUserProfileByAdmin,
  };

  return <AppDataContext.Provider value={value}>{children}</AppDataContext.Provider>;
}

export function useAppData() {
  const ctx = useContext(AppDataContext);
  if (!ctx) throw new Error("useAppData must be used within AppDataProvider");
  return ctx;
}
