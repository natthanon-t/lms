import { useEffect, useRef, useState } from "react";

export default function StatusSelect({ value, options, onChange }) {
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    const handleOutside = (event) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, [open]);

  return (
    <div ref={wrapperRef} className="status-select-root">
      <button
        type="button"
        className={`content-status-badge status-select-trigger ${value ?? "active"}`}
        onClick={(event) => {
          event.stopPropagation();
          setOpen((prev) => !prev);
        }}
      >
        {value ?? "active"}
      </button>
      {open ? (
        <ul className="status-dropdown" role="listbox">
          {options.map((option) => (
            <li key={option} role="option" aria-selected={option === value}>
              <button
                type="button"
                className={`status-dropdown-item ${option}`}
                onClick={(event) => {
                  event.stopPropagation();
                  onChange?.(option);
                  setOpen(false);
                }}
              >
                {option}
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
