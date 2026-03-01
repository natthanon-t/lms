import { useState } from "react";

export default function LoginScreen({ onLogin, onRegister, onCancel }) {
  const [name, setName] = useState("");
  const [user, setUser] = useState("");
  const [employeeCode, setEmployeeCode] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState("error");
  const [mode, setMode] = useState("login");

  const setError = (msg) => { setMessage(msg); setMessageType("error"); };
  const setSuccess = (msg) => { setMessage(msg); setMessageType("success"); };

  const switchMode = (nextMode) => {
    setMode(nextMode);
    setMessage("");
    setPassword("");
    if (nextMode === "login") {
      setName("");
      setEmployeeCode("");
    }
  };

  const formatEmployeeCode = (raw) => {
    const clean = raw.replace(/[^a-zA-Z0-9]/g, "").toUpperCase().slice(0, 10);
    if (clean.length <= 4) return clean;
    if (clean.length <= 6) return `${clean.slice(0, 4)}-${clean.slice(4)}`;
    return `${clean.slice(0, 4)}-${clean.slice(4, 6)}-${clean.slice(6)}`;
  };

  const handleEmployeeCodeChange = (event) => {
    const incoming = event.target.value;
    const formatted = formatEmployeeCode(incoming);
    // If user deleted a char but the dash snapped back (formatted === current),
    // remove one more alphanumeric so backspace through a dash actually works.
    if (incoming.length < employeeCode.length && formatted === employeeCode) {
      const shorter = employeeCode.replace(/[^a-zA-Z0-9]/g, "").slice(0, -1);
      setEmployeeCode(formatEmployeeCode(shorter));
    } else {
      setEmployeeCode(formatted);
    }
  };

  const getFriendlyRegisterError = (message) => {
    const text = String(message ?? "").toLowerCase();
    if (text.includes("username already exists")) {
      return "username นี้มีอยู่แล้ว";
    }
    if (text.includes("password must be at least")) {
      return "รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร";
    }
    if (text.includes("name, username and password are required")) {
      return "กรุณากรอก name, username และ password ให้ครบ";
    }
    if (text.includes("employee_code must be in format")) {
      return "รหัสพนักงานต้องอยู่ในรูปแบบ 2026-XX-XXXX";
    }
    return message || "สมัครสมาชิกไม่สำเร็จ";
  };

  const handleSubmit = (event) => {
    event.preventDefault();

    if (!user.trim() || !password.trim()) {
      setError("กรุณากรอก username และ password");
      return;
    }

    if (mode === "register") {
      if (!name.trim()) {
        setError("กรุณากรอก name");
        return;
      }
      if (user.trim().length < 4) {
        setError("username ต้องมีอย่างน้อย 4 ตัวอักษร");
        return;
      }
      if (!/^[a-zA-Z0-9._-]+$/.test(user.trim())) {
        setError("username ใช้ได้เฉพาะ a-z, A-Z, 0-9, . _ -");
        return;
      }
      if (!employeeCode.trim()) {
        setError("กรุณากรอกรหัสพนักงาน");
        return;
      }
      if (!/^2026-[A-Z0-9]{2}-[0-9]{4}$/i.test(employeeCode.trim())) {
        setError("รหัสพนักงานต้องอยู่ในรูปแบบ 2026-XX-XXXX");
        return;
      }
      if (password.length < 8) {
        setError("รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร");
        return;
      }

      onRegister?.({ name: name.trim(), username: user.trim(), employeeCode: employeeCode.trim().toUpperCase(), password })
        .then((result) => {
          if (!result?.success) {
            setError(getFriendlyRegisterError(result?.message));
            return;
          }
          setSuccess("สมัครสมาชิกสำเร็จ กรุณาเข้าสู่ระบบ");
          setPassword("");
          setMode("login");
        })
        .catch(() => {
          setError("สมัครสมาชิกไม่สำเร็จ");
        });
      return;
    }
    onLogin?.({ username: user.trim(), password })
      .then((result) => {
        if (!result?.success) {
          setError(result?.message ?? "username หรือ password ไม่ถูกต้อง");
          return;
        }
        setMessage("");
      })
      .catch(() => {
        setError("username หรือ password ไม่ถูกต้อง");
      });
  };

  return (
    <main className="login-page">
      <div className={`login-shell ${mode === "register" ? "register-mode" : ""}`}>
        <section className="login-card" aria-label="login form">
          <h1>{mode === "login" ? "Login" : "Register"}</h1>

          <form className="login-form" onSubmit={handleSubmit}>
            {mode === "register" ? (
              <>
                <label htmlFor="name">Name</label>
                <input
                  id="name"
                  name="name"
                  type="text"
                  autoComplete="name"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  placeholder="กรอก name"
                />

                <label htmlFor="employee-code">รหัสพนักงาน</label>
                <input
                  id="employee-code"
                  name="employee_code"
                  type="text"
                  autoComplete="off"
                  value={employeeCode}
                  onChange={handleEmployeeCodeChange}
                  placeholder="2026-XX-XXXX"
                  style={{ letterSpacing: "0.06em" }}
                />
              </>
            ) : null}

            <label htmlFor="user">Username</label>
            <input
              id="user"
              name="user"
              type="text"
              autoComplete="username"
              value={user}
              onChange={(event) => setUser(event.target.value)}
              placeholder="กรอก username"
            />

            <label htmlFor="password">Password</label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="กรอก password"
            />

            <button type="submit">{mode === "login" ? "เข้าสู่ระบบ" : "สมัครสมาชิก"}</button>
          </form>

          <p
            className="auth-toggle"
            role="button"
            tabIndex={0}
            onClick={() => switchMode(mode === "login" ? "register" : "login")}
            onKeyDown={(event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                switchMode(mode === "login" ? "register" : "login");
              }
            }}
          >
            {mode === "login" ? "Register" : "Login"}
          </p>

          {message ? (
            <p className={`login-message${messageType === "success" ? " login-message--success" : ""}`}>
              {message}
            </p>
          ) : null}
          {onCancel ? (
            <button type="button" className="back-home-button" onClick={onCancel}>
              กลับหน้าหลัก
            </button>
          ) : null}
        </section>

        {mode === "register" ? (
          <aside className="register-criteria-card">
            <h3>เกณฑ์การสมัครสมาชิก</h3>
            <p>1. `username` อย่างน้อย 4 ตัวอักษร</p>
            <p>2. `username` ใช้ได้เฉพาะ a-z, A-Z, 0-9, . _ -</p>
            <p>3. `รหัสพนักงาน` รูปแบบ 2026-XX-XXXX</p>
            <p>4. `password` อย่างน้อย 8 ตัวอักษร</p>
          </aside>
        ) : null}
      </div>
    </main>
  );
}
