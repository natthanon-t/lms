import { useEffect } from "react";
import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import "./App.css";
import LoginScreen from "./components/auth/LoginScreen";
import AlertModal from "./components/ui/AlertModal";
import WorkspaceSidebar from "./components/layout/WorkspaceSidebar";
import WorkspaceTopbar from "./components/layout/WorkspaceTopbar";
import ProtectedRoute from "./components/routing/ProtectedRoute";
import PermissionRoute from "./components/routing/PermissionRoute";
import ContentPage from "./pages/ContentPage";
import ContentDetailPage from "./pages/ContentDetailPage";
import EditorPage from "./pages/EditorPage";
import ExamPage from "./pages/ExamPage";
import ExamDetailPage from "./pages/ExamDetailPage";
import ExamEditorPage from "./pages/ExamEditorPage";
import ExamTakingPage from "./pages/ExamTakingPage";
import ExamResultPage from "./pages/ExamResultPage";
import ExamHistoryPage from "./pages/ExamHistoryPage";
import LeaderboardPage from "./pages/LeaderboardPage";
import LobbyPage from "./pages/LobbyPage";
import ProfilePage from "./pages/ProfilePage";
import RolePermissionPage from "./pages/RolePermissionPage";
import StudyPage from "./pages/StudyPage";
import SummaryPage from "./pages/SummaryPage";
import UserManagementPage from "./pages/UserManagementPage";
import { useAuth } from "./contexts/AuthContext";
import { useAppData } from "./contexts/AppDataContext";

export default function App() {
  const {
    currentUser,
    showLogin,
    setShowLogin,
    authBootstrapped,
    handleLoginFromBackend,
    handleRegisterFromBackend,
    handleAuthAction,
    visibleSidebarTabs,
    canManageUsers,
    canViewAllExamHistory,
    canViewSummary,
  } = useAuth();

  const {
    appAlert,
    setAppAlert,
    loadExamples,
    loadExamCatalog,
  } = useAppData();

  const location = useLocation();

  // Load data based on current route (concurrent)
  useEffect(() => {
    const path = location.pathname;
    const needsCourses = path === "/" || path.startsWith("/content");
    const needsExams = path === "/" || path.startsWith("/exam");
    if (needsCourses && needsExams) {
      void Promise.all([loadExamples(), loadExamCatalog()]);
    } else if (needsCourses) {
      void loadExamples();
    } else if (needsExams) {
      void loadExamCatalog();
    }
  }, [location.pathname, loadExamples, loadExamCatalog]);

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
      <WorkspaceTopbar />
      <main className="workspace-shell">
        <div className="sidebar-hover-trigger" aria-hidden="true" />
        <WorkspaceSidebar
          onAuthAction={handleAuthAction}
          isAuthenticated={Boolean(currentUser)}
          canViewRestrictedTabs={Boolean(currentUser && (canManageUsers || canViewAllExamHistory || canViewSummary))}
          visibleTabKeys={visibleSidebarTabs}
        />

        <Routes>
          <Route path="/" element={<LobbyPage />} />

          <Route path="/content" element={<ContentPage />} />
          <Route path="/content/:courseId" element={<ContentDetailPage />} />
          <Route
            path="/content/:courseId/study"
            element={
              <ProtectedRoute>
                <StudyPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/content/:courseId/edit"
            element={
              <ProtectedRoute>
                <PermissionRoute permission="content.manage" label="เนื้อหา">
                  <EditorPage />
                </PermissionRoute>
              </ProtectedRoute>
            }
          />

          <Route path="/exam" element={<ExamPage />} />
          <Route path="/exam/:examId" element={<ExamDetailPage />} />
          <Route
            path="/exam/:examId/take"
            element={
              <ProtectedRoute>
                <ExamTakingPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/exam/:examId/result"
            element={
              <ProtectedRoute>
                <ExamResultPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/exam/:examId/edit"
            element={
              <ProtectedRoute>
                <PermissionRoute permission="exam.manage" label="ข้อสอบ">
                  <ExamEditorPage />
                </PermissionRoute>
              </ProtectedRoute>
            }
          />

          <Route
            path="/profile"
            element={
              <ProtectedRoute>
                <ProfilePage />
              </ProtectedRoute>
            }
          />
          <Route path="/leaderboard" element={<LeaderboardPage />} />

          <Route
            path="/user-management"
            element={
              <ProtectedRoute>
                <PermissionRoute permission="management.users.manage" label="จัดการ User">
                  <UserManagementPage />
                </PermissionRoute>
              </ProtectedRoute>
            }
          />
          <Route
            path="/role-permission"
            element={
              <ProtectedRoute>
                <PermissionRoute permission="management.users.manage" label="สิทธิ์การใช้งาน">
                  <RolePermissionPage />
                </PermissionRoute>
              </ProtectedRoute>
            }
          />
          <Route
            path="/exam-history"
            element={
              <ProtectedRoute>
                <PermissionRoute
                  permissions={["system.exam_history.view", "management.exam_history.view"]}
                  label="ประวัติการสอบ"
                >
                  <ExamHistoryPage />
                </PermissionRoute>
              </ProtectedRoute>
            }
          />
          <Route
            path="/summary"
            element={
              <ProtectedRoute>
                <PermissionRoute permission="system.report.view" label="สรุปผล">
                  <SummaryPage />
                </PermissionRoute>
              </ProtectedRoute>
            }
          />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </div>
  );
}
