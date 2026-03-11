import { useAuth } from "../../contexts/AuthContext";

export default function ProtectedRoute({ children }) {
  const { currentUser, setShowLogin } = useAuth();

  if (!currentUser) {
    return (
      <section className="workspace-content">
        <header className="content-header">
          <h1>จำเป็นต้องเข้าสู่ระบบ</h1>
          <p>
            กรุณา{" "}
            <button
              type="button"
              style={{ background: "none", border: "none", color: "var(--color-primary, #2563eb)", cursor: "pointer", padding: 0, fontSize: "inherit", textDecoration: "underline" }}
              onClick={() => setShowLogin(true)}
            >
              เข้าสู่ระบบ
            </button>{" "}
            ก่อนใช้งานหน้านี้
          </p>
        </header>
      </section>
    );
  }

  return children;
}
