import { useState } from "react";

export default function LoginScreen({ onSuccess, onRegister, users }) {
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

  const handleSubmit = (event) => {
    event.preventDefault();

    if (!user.trim() || !password.trim()) {
      setMessage("กรุณากรอก user และ password");
      return;
    }

    if (mode === "register") {
      if (!name.trim()) {
        setMessage("กรุณากรอก name");
        return;
      }

      if (users[user.trim()]) {
        setMessage("user นี้มีอยู่แล้ว");
        return;
      }

      onRegister(name.trim(), user.trim(), password);
      setMessage("สมัครสมาชิกสำเร็จ กรุณาเข้าสู่ระบบ");
      setPassword("");
      setMode("login");
      return;
    }

    const foundUser = users[user.trim()];
    if (foundUser?.status === "inactive") {
      setMessage("บัญชีนี้ถูกปิดการใช้งาน (inactive)");
      return;
    }

    if (foundUser?.password === password) {
      setMessage("");
      onSuccess(user.trim());
      return;
    }

    setMessage("user หรือ password ไม่ถูกต้อง");
  };

  return (
    <main className="login-page">
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

          <label htmlFor="user">User</label>
          <input
            id="user"
            name="user"
            type="text"
            autoComplete="username"
            value={user}
            onChange={(event) => setUser(event.target.value)}
            placeholder="กรอก user"
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
      </section>
    </main>
  );
}
