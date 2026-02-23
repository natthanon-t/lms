import { useState } from "react";

const CONTENT_STATUS_OPTIONS = ["inprogress", "active", "inactive"];

const toStatusLabel = (status) => {
  if (status === "inprogress") {
    return "inprogress";
  }
  if (status === "inactive") {
    return "inactive";
  }
  return "active";
};

export default function ContentPage({
  examples,
  onOpenEditor,
  onOpenDetail,
  onCreateContent,
  onUpdateContentStatus,
  canManage = false,
}) {
  const [managingContentId, setManagingContentId] = useState("");

  return (
    <section className="workspace-content content-theme-exam">
      <header className="content-header">
        <h1>เนื้อหา</h1>
        <p>รายการบทเรียนสำหรับเข้าเรียนหรือแก้ไขเนื้อหา</p>
      </header>

      <div className="section-row">
        <p className="section-label">รายการคอร์ส</p>
        <button type="button" className="create-content-button" onClick={onCreateContent}>
          + สร้างเนื้อหา
        </button>
      </div>

      <div className="example-grid">
        {examples.map((example) => (
          <article key={example.id} className="example-card">
            <img src={example.image} alt={example.title} className="card-image" />
            <div className="example-head">
              <h3 className="example-title">{example.title}</h3>
              <div className="example-action-box">
                <span className={`content-status-badge ${example.status ?? "active"}`}>
                  {toStatusLabel(example.status)}
                </span>
                {canManage ? (
                  <button
                    type="button"
                    className="gear-button"
                    aria-label={`จัดการ ${example.title}`}
                    onClick={() =>
                      setManagingContentId((prevId) => (prevId === example.id ? "" : example.id))
                    }
                  >
                    ⚙
                  </button>
                ) : null}
              </div>
            </div>
            {canManage && managingContentId === example.id ? (
              <div className="content-manage-menu">
                <button
                  type="button"
                  className="manage-button"
                  onClick={() => {
                    onOpenEditor(example);
                    setManagingContentId("");
                  }}
                >
                  แก้ไขเนื้อหา
                </button>
                <label htmlFor={`status-${example.id}`}>สถานะ</label>
                <select
                  id={`status-${example.id}`}
                  value={example.status ?? "active"}
                  onChange={(event) => onUpdateContentStatus?.(example.id, event.target.value)}
                >
                  {CONTENT_STATUS_OPTIONS.map((status) => (
                    <option key={`${example.id}-${status}`} value={status}>
                      {status}
                    </option>
                  ))}
                </select>
              </div>
            ) : null}
            {example.skills?.length ? (
              <div className="skill-tags">
                {example.skills.map((skill) => (
                  <span key={`${example.id}-${skill}`} className="skill-tag">
                    {skill}
                  </span>
                ))}
              </div>
            ) : null}
            <button type="button" className="enter-button" onClick={() => onOpenDetail(example)}>
              ดูรายละเอียด
            </button>
          </article>
        ))}
      </div>
    </section>
  );
}
