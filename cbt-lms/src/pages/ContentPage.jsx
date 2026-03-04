import StatusSelect from "../components/StatusSelect";
import { STATUS_OPTIONS, isItemOwner, canViewItemByStatus } from "../services/accessControlService";

export default function ContentPage({
  examples,
  onOpenEditor,
  onOpenDetail,
  onCreateContent,
  onUpdateContentStatus,
  currentUserKey = "",
  isAdmin = false,
  canCreate = false,
}) {
  const canManageExample = (example) => isAdmin || isItemOwner(example, currentUserKey);
  const visibleExamples = examples.filter((example) =>
    canViewItemByStatus({ item: example, currentUserKey, isAdmin }),
  );

  return (
    <section className="workspace-content content-theme-exam">
      <header className="content-header">
        <h1>เนื้อหา</h1>
        <p>รายการบทเรียนสำหรับเข้าเรียนหรือแก้ไขเนื้อหา</p>
      </header>

      {canCreate ? (
        <div className="section-row">
          <p className="section-label">รายการคอร์ส</p>
          <button type="button" className="create-content-button" onClick={onCreateContent}>
            + สร้างเนื้อหา
          </button>
        </div>
      ) : (
        <p className="section-label">รายการคอร์ส</p>
      )}

      <div className="example-grid">
        {visibleExamples.map((example) => (
          <article key={example.id} className="example-card">
            <img src={example.image} alt={example.title} className="card-image" />
            <div className="example-head">
              <h3 className="example-title">{example.title}</h3>
              <div className="example-action-box">
                {canManageExample(example) ? (
                  <StatusSelect
                    value={example.status ?? "active"}
                    options={STATUS_OPTIONS}
                    onChange={(status) => onUpdateContentStatus?.(example.id, status)}
                  />
                ) : null}
                {canManageExample(example) ? (
                  <button
                    type="button"
                    className="gear-button"
                    aria-label={`จัดการ ${example.title}`}
                    onClick={() => onOpenEditor(example)}
                  >
                    ⚙
                  </button>
                ) : null}
              </div>
            </div>
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
