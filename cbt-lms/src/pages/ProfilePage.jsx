import { useEffect, useState } from "react";

export default function ProfilePage({ currentUser, username, onSaveName }) {
  const [name, setName] = useState(currentUser.name);
  const [message, setMessage] = useState("");

  useEffect(() => {
    setName(currentUser.name);
    setMessage("");
  }, [currentUser.name]);

  const handleSubmit = (event) => {
    event.preventDefault();

    const trimmedName = name.trim();
    if (!trimmedName) {
      setMessage("กรุณากรอกชื่อก่อนบันทึก");
      return;
    }

    onSaveName(trimmedName);
    setMessage("บันทึกชื่อเรียบร้อย");
  };

  return (
    <section className="workspace-content">
      <header className="content-header">
        <h1>โปรไฟล์</h1>
        <p>ข้อมูลผู้ใช้ที่กำลังเข้าสู่ระบบ</p>
      </header>

      <article className="info-card">
        <form className="profile-form" onSubmit={handleSubmit}>
          <label htmlFor="profile-name">ชื่อ</label>
          <input
            id="profile-name"
            type="text"
            value={name}
            onChange={(event) => setName(event.target.value)}
          />

          <p>
            <strong>Username:</strong> {username}
          </p>
          <p>
            <strong>ตำแหน่ง:</strong> {currentUser.role}
          </p>

          <button type="submit" className="enter-button">
            บันทึก
          </button>
        </form>

        {message ? <p className="profile-message">{message}</p> : null}
      </article>
    </section>
  );
}
