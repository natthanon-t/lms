import { useMemo, useState } from "react";
import { parseMarkdownHeadings } from "./headingUtils";

export default function TableOfContents({
  content,
  activeHeadingId,
  onSelectHeading,
  title = "สารบัญหัวข้อ",
  editable = false,
  onMoveMainBefore,
  onMoveSubBefore,
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
  const completedSet = useMemo(() => new Set(completedHeadingIds), [completedHeadingIds]);

  const onDragStart = (type, id) => {
    if (!editable) {
      return;
    }
    setDraggingItem({ type, id });
    setDropTarget(null);
  };

  const onDragEnd = () => {
    setDraggingItem(null);
    setDropTarget(null);
  };

  const onDrop = (targetType, targetId) => {
    if (!editable || !draggingItem || draggingItem.id === targetId || draggingItem.type !== targetType) {
      setDraggingItem(null);
      setDropTarget(null);
      return;
    }

    if (targetType === "main") {
      onMoveMainBefore?.(draggingItem.id, targetId);
    } else if (targetType === "sub") {
      onMoveSubBefore?.(draggingItem.id, targetId);
    }
    setDraggingItem(null);
    setDropTarget(null);
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
            const isDropTarget = dropTarget === heading.id;

            return (
              <div
                key={heading.id}
                className={`toc-row ${isDropTarget ? "drop-target" : ""} ${editable ? "draggable" : ""}`}
                draggable={editable}
                onDragStart={() => onDragStart(itemType, heading.id)}
                onDragEnd={onDragEnd}
                onDragOver={(event) => {
                  if (draggingItem?.type === itemType) {
                    event.preventDefault();
                    setDropTarget(heading.id);
                  }
                }}
                onDragLeave={() => setDropTarget((prev) => (prev === heading.id ? null : prev))}
                onDrop={() => onDrop(itemType, heading.id)}
              >
                {editable ? <span className="drag-handle">⋮⋮</span> : null}
                {itemType === "sub" ? (
                  <button
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
