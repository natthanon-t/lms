import { useMemo, useState } from "react";

export default function AllowedUsernameInput({ onAdd, users = {}, excluded = [] }) {
  const [value, setValue] = useState("");
  const [open, setOpen] = useState(false);

  const suggestions = useMemo(() => {
    const q = value.trim().toLowerCase();
    if (!q) return [];
    return Object.entries(users)
      .filter(([u, info]) =>
        !excluded.includes(u) &&
        (u.includes(q) || String(info?.name ?? "").toLowerCase().includes(q))
      )
      .slice(0, 8);
  }, [value, users, excluded]);

  const commit = (username) => {
    if (username) { onAdd(username); }
    setValue("");
    setOpen(false);
  };

  return (
    <div className="allowed-user-input-row">
      <div className="allowed-user-autocomplete">
        <input
          type="text"
          value={value}
          onChange={(e) => { setValue(e.target.value); setOpen(true); }}
          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); commit(value.trim().toLowerCase()); } }}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          onFocus={() => { if (value.trim()) setOpen(true); }}
          placeholder="พิมพ์ username หรือชื่อ"
        />
        {open && suggestions.length > 0 && (
          <div className="allowed-user-suggestions">
            {suggestions.map(([u, info]) => (
              <div key={u} className="allowed-user-suggestion-item" onMouseDown={() => commit(u)}>
                <span className="suggestion-username">{u}</span>
                {info?.name && info.name !== u && (
                  <span className="suggestion-name"> — {info.name}</span>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
      <button type="button" className="create-content-button" onClick={() => commit(value.trim().toLowerCase())}>
        + เพิ่ม
      </button>
    </div>
  );
}
