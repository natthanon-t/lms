import { useEffect, useMemo, useRef, useState } from "react";
import { parseMarkdownHeadings } from "./headingUtils";

export default function TableOfContents({
  content,
  activeHeadingId,
  onSelectHeading,
  title = "สารบัญหัวข้อ",
  editable = false,
  onMoveMainBefore,
  onMoveSubBefore,
  onSwapSubSections,
  onMoveSubToMain,
  onRenameHeading,
  onDeleteHeading,
  completedHeadingIds = [],
}) {
  const headings = useMemo(
    () => parseMarkdownHeadings(content).filter((heading) => heading.level <= 3),
    [content],
  );
  const [draggingItem, setDraggingItem] = useState(null);
  const [dropTarget, setDropTarget] = useState(null);
  const [dropMode, setDropMode] = useState(null); // "before" | "swap" | "into"
  const completedSet = useMemo(() => new Set(completedHeadingIds), [completedHeadingIds]);
  const activeItemRef = useRef(null);

  useEffect(() => {
    activeItemRef.current?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [activeHeadingId]);

  const onDragStart = (type, id) => {
    if (!editable) return;
    setDraggingItem({ type, id });
    setDropTarget(null);
    setDropMode(null);
  };

  const onDragEnd = () => {
    setDraggingItem(null);
    setDropTarget(null);
    setDropMode(null);
  };

  const onDragOverHandler = (event, itemType, headingId) => {
    if (!draggingItem) return;

    // sub ลาก → main: รองรับย้ายข้ามหัวข้อหลัก
    if (draggingItem.type === "sub" && itemType === "main") {
      event.preventDefault();
      setDropTarget(headingId);
      setDropMode("into");
      return;
    }

    // ลากชนิดเดียวกัน
    if (draggingItem.type === itemType && draggingItem.id !== headingId) {
      event.preventDefault();
      setDropTarget(headingId);
      if (draggingItem.type === "sub") {
        const rect = event.currentTarget.getBoundingClientRect();
        setDropMode(event.clientY < rect.top + rect.height / 2 ? "before" : "swap");
      } else {
        setDropMode("before");
      }
    }
  };

  const onDrop = (targetType, targetId) => {
    if (!editable || !draggingItem) {
      setDraggingItem(null);
      setDropTarget(null);
      setDropMode(null);
      return;
    }

    if (draggingItem.type === "sub" && targetType === "main") {
      onMoveSubToMain?.(draggingItem.id, targetId);
    } else if (draggingItem.type === "sub" && targetType === "sub" && draggingItem.id !== targetId) {
      if (dropMode === "swap") {
        onSwapSubSections?.(draggingItem.id, targetId);
      } else {
        onMoveSubBefore?.(draggingItem.id, targetId);
      }
    } else if (draggingItem.type === "main" && targetType === "main" && draggingItem.id !== targetId) {
      onMoveMainBefore?.(draggingItem.id, targetId);
    }

    setDraggingItem(null);
    setDropTarget(null);
    setDropMode(null);
  };

  const getDropClass = (headingId, itemType) => {
    if (dropTarget !== headingId) return "";
    if (dropMode === "before") return "drop-before";
    if (dropMode === "swap") return "drop-swap";
    if (dropMode === "into" && itemType === "main") return "drop-into";
    return "";
  };

  return (
    <aside className="toc-panel">
      <h3>{title}</h3>
      {editable ? <p className="toc-drag-help">ลากรายการที่มีสัญลักษณ์ `⋮⋮` เพื่อจัดเรียง</p> : null}
      {!headings.length ? (
        <p className="toc-empty">ยังไม่มีหัวข้อในเนื้อหา</p>
      ) : (
        <div className="toc-list">
          {headings.map((heading) => {
            if (heading.level === 1) {
              return (
                <div key={heading.id} className="toc-row">
                  <p className={`toc-heading-label toc-level-${heading.level}`}>{heading.text}</p>
                </div>
              );
            }

            const itemType = heading.level === 2 ? "main" : "sub";
            const dropClass = getDropClass(heading.id, itemType);

            return (
              <div
                key={heading.id}
                className={`toc-row ${dropClass} ${editable ? "draggable" : ""}`}
                draggable={editable}
                onDragStart={() => onDragStart(itemType, heading.id)}
                onDragEnd={onDragEnd}
                onDragOver={(event) => onDragOverHandler(event, itemType, heading.id)}
                onDragLeave={() => {
                  setDropTarget((prev) => (prev === heading.id ? null : prev));
                  setDropMode(null);
                }}
                onDrop={() => onDrop(itemType, heading.id)}
              >
                {editable ? <span className="drag-handle">⋮⋮</span> : null}
                {itemType === "sub" ? (
                  <button
                    ref={activeHeadingId === heading.id ? activeItemRef : null}
                    type="button"
                    className={`toc-item toc-level-${heading.level} ${activeHeadingId === heading.id ? "active" : ""}`}
                    onClick={() => onSelectHeading(heading.id)}
                  >
                    <span>{heading.text}</span>
                    {completedSet.has(heading.id) ? <span className="toc-complete-mark">✓</span> : null}
                  </button>
                ) : (
                  <p className={`toc-heading-label toc-level-${heading.level}`}>{heading.text}</p>
                )}
                {editable ? (
                  <>
                    <button
                      type="button"
                      className="toc-edit-button"
                      onClick={() => {
                        const nextTitle = window.prompt("แก้ชื่อหัวข้อ", heading.text);
                        if (!nextTitle || !nextTitle.trim()) {
                          return;
                        }
                        onRenameHeading?.(heading.id, nextTitle.trim());
                      }}
                    >
                      แก้ชื่อ
                    </button>
                    <button
                      type="button"
                      className="toc-delete-button"
                      onClick={() => {
                        const confirmed = window.confirm(`ลบหัวข้อ "${heading.text}" ใช่หรือไม่?`);
                        if (!confirmed) {
                          return;
                        }
                        onDeleteHeading?.(heading.id);
                      }}
                    >
                      ลบ
                    </button>
                  </>
                ) : null}
              </div>
            );
          })}
        </div>
      )}
    </aside>
  );
}
