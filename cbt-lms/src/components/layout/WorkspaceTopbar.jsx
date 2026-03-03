import { useMemo } from "react";
import logoMark from "../../assets/logo.png";

const getAvatarColor = (username) => {
  let hash = 0;
  const str = String(username || "");
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  return `hsl(${Math.abs(hash) % 360}, 55%, 48%)`;
};

const getInitials = (name, username) => {
  const text = String(name || username || "?").trim();
  const words = text.split(/\s+/);
  if (words.length >= 2) return (words[0][0] + words[1][0]).toUpperCase();
  return text.slice(0, 2).toUpperCase();
};

export default function WorkspaceTopbar({ currentUser, username, onGoHome, onGoProfile }) {
  const handleLogoError = (event) => {
    if (event.currentTarget.dataset.fallbackApplied === "true") {
      return;
    }
    event.currentTarget.dataset.fallbackApplied = "true";
    event.currentTarget.src = "/logo.png";
  };

  const avatar = useMemo(() => {
    if (!username) return "";
    try { return localStorage.getItem(`profile_avatar_${username}`) ?? ""; } catch { return ""; }
  }, [username]);

  const avatarColor = getAvatarColor(username);
  const initials = getInitials(currentUser?.name, username);

  return (
    <header className="workspace-topbar">
      <button type="button" className="workspace-topbar-brand" onClick={onGoHome}>
        <img src={logoMark} alt="LMS logo" className="workspace-topbar-logo" onError={handleLogoError} />
        <div>
          <h1>LMS Panel</h1>
          <p>MANAGEMENT CONSOLE</p>
        </div>
      </button>

      <div className="workspace-topbar-user">
        <button
          type="button"
          className="topbar-avatar-circle"
          style={{ background: avatar ? "transparent" : avatarColor }}
          onClick={onGoProfile}
          title="ไปหน้าโปรไฟล์"
        >
          {avatar ? (
            <img src={avatar} alt="avatar" className="topbar-avatar-img" />
          ) : (
            <span className="topbar-avatar-initials">{initials}</span>
          )}
        </button>
        <div>
          <p>
            <strong>ผู้ใช้:</strong> {currentUser?.name ?? "Guest"}
          </p>
          <p>
            <strong>ตำแหน่ง:</strong> {currentUser?.role ?? "ผู้เยี่ยมชม"}
          </p>
        </div>
      </div>
    </header>
  );
}
