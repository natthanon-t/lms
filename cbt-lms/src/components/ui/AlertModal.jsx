/**
 * AlertModal — แทนที่ window.alert() ด้วย custom dialog
 *
 * Props:
 *   title   string — หัวข้อ (default: "แจ้งเตือน")
 *   message string — รายละเอียดข้อความ
 *   onClose () => void — callback เมื่อกดปิด
 */
export default function AlertModal({ title = "แจ้งเตือน", message, onClose }) {
  return (
    <div
      style={{
        position: "fixed", inset: 0, zIndex: 9999,
        background: "rgba(0,0,0,0.45)", backdropFilter: "blur(2px)",
        display: "flex", alignItems: "center", justifyContent: "center",
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: "#ffffff",
          borderRadius: "16px",
          width: "100%", maxWidth: "400px",
          padding: "2rem",
          display: "flex", flexDirection: "column", alignItems: "center",
          position: "relative",
          boxShadow: "0 10px 30px rgba(25, 40, 75, 0.15)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          style={{
            position: "absolute", top: "1rem", right: "1rem",
            background: "#f1f5ff", border: "none",
            width: "32px", height: "32px", borderRadius: "50%",
            display: "flex", alignItems: "center", justifyContent: "center",
            cursor: "pointer", color: "#45608f", fontSize: "1rem",
            transition: "background 0.2s",
          }}
          onMouseEnter={(e) => (e.currentTarget.style.background = "#e5edff")}
          onMouseLeave={(e) => (e.currentTarget.style.background = "#f1f5ff")}
        >
          ✕
        </button>

        <h2 style={{ margin: "0 0 0.75rem 0", color: "#1b2f56", fontSize: "1.5rem", fontWeight: 700 }}>
          {title}
        </h2>

        <p style={{ margin: "0 0 2rem 0", color: "#4B5563", fontSize: "1rem", textAlign: "center", lineHeight: 1.5 }}>
          {message}
        </p>

        <button
          type="button"
          onClick={onClose}
          style={{
            width: "100%",
            padding: "0.75rem",
            background: "#2f66da",
            border: "none",
            borderRadius: "10px",
            color: "#fff",
            fontWeight: 700,
            fontSize: "1rem",
            cursor: "pointer",
            transition: "background 0.2s",
          }}
          onMouseEnter={(e) => (e.currentTarget.style.background = "#2454b8")}
          onMouseLeave={(e) => (e.currentTarget.style.background = "#2f66da")}
        >
          ตกลง
        </button>
      </div>
    </div>
  );
}
