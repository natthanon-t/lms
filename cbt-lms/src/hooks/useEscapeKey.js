import { useEffect } from "react";

export function useEscapeKey(isOpen, onClose) {
  useEffect(() => {
    if (!isOpen) return undefined;
    const handler = (event) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [isOpen, onClose]);
}
