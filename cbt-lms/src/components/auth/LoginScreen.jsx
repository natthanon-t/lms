import { useState } from "react";

export default function LoginScreen({ onLogin, onRegister, onCancel }) {
  const [name, setName] = useState("");
  const [user, setUser] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [mode, setMode] = useState("login");

  const switchMode = (nextMode) => {
    setMode(nextMode);
    setMessage("");
    setPassword("");
    if (nextMode === "login") {
      setName("");
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
    return message || "สมัครสมาชิกไม่สำเร็จ";
  };

  const handleSubmit = (event) => {
    event.preventDefault();

    if (!user.trim() || !password.trim()) {
      setMessage("กรุณากรอก username และ password");
      return;
    }

    if (mode === "register") {
      if (!name.trim()) {
        setMessage("กรุณากรอก name");
        return;
      }
      if (user.trim().length < 4) {
        setMessage("username ต้องมีอย่างน้อย 4 ตัวอักษร");
        return;
      }
      if (!/^[a-zA-Z0-9._-]+$/.test(user.trim())) {
        setMessage("username ใช้ได้เฉพาะ a-z, A-Z, 0-9, . _ -");
        return;
      }
      if (password.length < 8) {
        setMessage("รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร");
        return;
      }

      onRegister?.({ name: name.trim(), username: user.trim(), password })
        .then((result) => {
          if (!result?.success) {
            setMessage(getFriendlyRegisterError(result?.message));
            return;
          }
          setMessage("สมัครสมาชิกสำเร็จ กรุณาเข้าสู่ระบบ");
          setPassword("");
          setMode("login");
        })
        .catch(() => {
          setMessage("สมัครสมาชิกไม่สำเร็จ");
        });
      return;
    }
    onLogin?.({ username: user.trim(), password })
      .then((result) => {
        if (!result?.success) {
          setMessage(result?.message ?? "username หรือ password ไม่ถูกต้อง");
          return;
        }
        setMessage("");
      })
      .catch(() => {
        setMessage("username หรือ password ไม่ถูกต้อง");
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

          {message ? <p className="login-message">{message}</p> : null}
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
            <p>3. `password` อย่างน้อย 8 ตัวอักษร</p>
          </aside>
        ) : null}
      </div>
    </main>
  );
}
