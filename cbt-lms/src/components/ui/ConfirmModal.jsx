/**
 * ConfirmModal — แทนที่ window.confirm() ด้วย custom dialog
 *
 * Props:
 *   message   string   — ข้อความถามยืนยัน (รายละเอียด)
 *   title     string   — หัวข้อหลัก (default: "Are you sure?")
 *   onConfirm () => void — callback เมื่อกด "ยืนยัน"
 *   onCancel  () => void — callback เมื่อกด "ยกเลิก" หรือคลิก overlay
 *   confirmLabel string (optional) — ป้ายปุ่มยืนยัน (default: "Delete")
 *   cancelLabel  string (optional) — ป้ายปุ่มยกเลิก (default: "Cancel")
 *   confirmDanger bool (optional) — ทำให้ปุ่มยืนยันเป็นสีแดง (default: true สำหรับ modal ลบ)
 */
export default function ConfirmModal({
  message,
  title = "Are you sure?",
  onConfirm,
  onCancel,
  confirmLabel = "Delete",
  cancelLabel = "Cancel",
  confirmDanger = true,
}) {
  return (
    <div
      style={{
        position: "fixed", inset: 0, zIndex: 9999,
        background: "rgba(0,0,0,0.45)", backdropFilter: "blur(2px)",
        display: "flex", alignItems: "center", justifyContent: "center",
      }}
      onClick={onCancel}
    >
      <div
        style={{
          background: "#ffffff",
          borderRadius: "16px",
          width: "100%", maxWidth: "440px",
          padding: "2rem",
          display: "flex", flexDirection: "column", alignItems: "center",
          position: "relative",
          boxShadow: "0 10px 30px rgba(25, 40, 75, 0.15)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* ปุ่ม ✕ มุมขวาบน */}
        <button
          type="button"
          onClick={onCancel}
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

        {/* Title */}
        <h2 style={{ margin: "0 0 0.75rem 0", color: "#1b2f56", fontSize: "1.5rem", fontWeight: 700 }}>
          {title}
        </h2>

        {/* Message (Description) */}
        <p style={{ margin: "0 0 2rem 0", color: "#4B5563", fontSize: "0.95rem", textAlign: "center", lineHeight: 1.5 }}>
          {message}
        </p>

        {/* Buttons */}
        <div style={{ display: "flex", gap: "1rem", width: "100%" }}>
          <button
            type="button"
            onClick={onCancel}
            style={{
              flex: 1,
              padding: "0.75rem",
              background: "#ffffff",
              border: "1px solid #b8c4e0",
              borderRadius: "10px",
              color: "#1b2f56",
              fontWeight: 700,
              fontSize: "1rem",
              cursor: "pointer",
              transition: "background 0.2s",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = "#f1f5ff")}
            onMouseLeave={(e) => (e.currentTarget.style.background = "#ffffff")}
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            style={{
              flex: 1,
              padding: "0.75rem",
              background: confirmDanger ? "#d22f2f" : "#2f66da",
              border: "none",
              borderRadius: "10px",
              color: "#fff",
              fontWeight: 700,
              fontSize: "1rem",
              cursor: "pointer",
              transition: "background 0.2s",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = confirmDanger ? "#b32020" : "#2454b8")}
            onMouseLeave={(e) => (e.currentTarget.style.background = confirmDanger ? "#d22f2f" : "#2f66da")}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
