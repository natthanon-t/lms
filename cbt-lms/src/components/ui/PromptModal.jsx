import { useState, useEffect, useRef } from "react";

/**
 * PromptModal — แทนที่ window.prompt() ด้วย custom dialog แบบมีช่องกรอก
 *
 * Props:
 *   title        string   — หัวข้อหลัก
 *   message      string   — ข้อความอธิบาย (optional)
 *   defaultValue string   — ค่าเริ่มต้นในช่องกรอก
 *   onConfirm    (value: string) => void — callback พร้อมค่าที่กรอกเมื่อกด "บันทึก"
 *   onCancel     () => void — callback เมื่อกด "ยกเลิก"
 *   placeholder  string   — placeholder ของช่องกรอก
 */
export default function PromptModal({
  title,
  message,
  defaultValue = "",
  onConfirm,
  onCancel,
  placeholder = "กรอกข้อความ...",
}) {
  const [inputValue, setInputValue] = useState(defaultValue);
  const inputRef = useRef(null);

  // Auto focus เมื่อเปิดขึ้นมา
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, []);

  const handleSubmit = (e) => {
    e.preventDefault();
    onConfirm(inputValue);
  };

  return (
    <div
      style={{
        position: "fixed", inset: 0, zIndex: 9999,
        background: "rgba(0,0,0,0.45)", backdropFilter: "blur(2px)",
        display: "flex", alignItems: "center", justifyContent: "center",
      }}
      onClick={onCancel}
    >
      <form
        style={{
          background: "#ffffff", // เปลี่ยนเป็นขาวเหมือน Card ในระบบ
          borderRadius: "16px",
          width: "100%", maxWidth: "440px",
          padding: "2rem",
          display: "flex", flexDirection: "column", alignItems: "center",
          position: "relative",
          boxShadow: "0 10px 30px rgba(25, 40, 75, 0.15)", // ปรับเงาให้เข้ากับระบบ
        }}
        onClick={(e) => e.stopPropagation()}
        onSubmit={handleSubmit}
      >
        {/* ปุ่ม ✕ มุมขวาบน */}
        <button
          type="button"
          onClick={onCancel}
          style={{
            position: "absolute", top: "1rem", right: "1rem",
            background: "#f1f5ff", border: "none", // ใช้สีโทนฟ้าอ่อนของระบบ
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

        {/* Message */}
        {message && (
          <p style={{ margin: "0 0 1.25rem 0", color: "#4B5563", fontSize: "0.95rem", textAlign: "center", lineHeight: 1.5 }}>
            {message}
          </p>
        )}

        {/* Input */}
        <input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          placeholder={placeholder}
          style={{
            width: "100%",
            padding: "0.75rem 1rem",
            marginBottom: "1.5rem",
            borderRadius: "10px", // เข้ากับระบบ
            border: "1px solid #b8c4e0", // สีขอบระบบ
            fontSize: "1rem",
            outline: "none",
            background: "#ffffff",
            color: "#1b2f56",
            transition: "border-color 0.2s, box-shadow 0.2s",
          }}
          onFocus={(e) => {
            e.target.style.borderColor = "#2f66da";
            e.target.style.boxShadow = "0 0 0 3px rgba(47, 102, 218, 0.15)";
          }}
          onBlur={(e) => {
            e.target.style.borderColor = "#b8c4e0";
            e.target.style.boxShadow = "none";
          }}
        />

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
            ยกเลิก
          </button>
          <button
            type="submit"
            style={{
              flex: 1,
              padding: "0.75rem",
              background: "#2f66da", // สีน้ำเงินหลักระบบ
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
            บันทึก
          </button>
        </div>
      </form>
    </div>
  );
}
