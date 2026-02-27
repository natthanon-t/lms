import logoMark from "../../assets/logo.png";

export default function WorkspaceTopbar({ currentUser, onGoHome }) {
  return (
    <header className="workspace-topbar">
      <button type="button" className="workspace-topbar-brand" onClick={onGoHome}>
        <img src={logoMark} alt="LMS logo" className="workspace-topbar-logo" />
        <div>
          <h1>LMS Panel</h1>
          <p>MANAGEMENT CONSOLE</p>
        </div>
      </button>

      <div className="workspace-topbar-user">
        <p>
          <strong>ผู้ใช้:</strong> {currentUser?.name ?? "Guest"}
        </p>
        <p>
          <strong>ตำแหน่ง:</strong> {currentUser?.role ?? "ผู้เยี่ยมชม"}
        </p>
      </div>
    </header>
  );
}
