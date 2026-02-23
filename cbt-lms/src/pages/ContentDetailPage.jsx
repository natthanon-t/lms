import { useMemo } from "react";
import TableOfContents from "../components/markdown/TableOfContents";
import { getSubtopicPages } from "../components/markdown/headingUtils";
import { getCourseSkillRewards } from "../services/skillRewardsService";

export default function ContentDetailPage({ contentItem, onBack, onEnterStudy }) {
  const subtopics = useMemo(
    () => getSubtopicPages(contentItem.content, contentItem.title),
    [contentItem.content, contentItem.title],
  );
  const rewards = getCourseSkillRewards(contentItem);
  const totalSkillPoints = rewards.reduce((sum, reward) => sum + reward.points, 0);

  return (
    <section className="workspace-content content-theme-exam">
      <header className="content-header editor-head">
        <div>
          <h1>{contentItem.title}</h1>
          <p>รายละเอียดคอร์สก่อนเข้าเรียน</p>
        </div>
        <button type="button" className="back-button" onClick={onBack}>
          กลับหน้ารายการเนื้อหา
        </button>
      </header>

      <div className="content-detail-grid">
        <article className="info-card content-detail-card">
          <img src={contentItem.image} alt={contentItem.title} className="content-detail-cover" />
          <p>
            <strong>ผู้สร้าง:</strong> {contentItem.creator ?? "ทีมผู้สอน"}
          </p>
          <p>
            <strong>รายละเอียด:</strong> {contentItem.description ?? "-"}
          </p>
          <p>
            <strong>หัวข้อย่อยทั้งหมด:</strong> {subtopics.length}
          </p>
          {rewards.length ? (
            <div className="course-skill-awards">
              <p className="course-skill-awards-title">
                เมื่อเรียนจบคอร์สนี้จะได้คะแนนทักษะรวม {totalSkillPoints} คะแนน
              </p>
              <ul className="course-skill-awards-list">
                {rewards.map((reward) => (
                  <li key={`${contentItem.id}-${reward.skill}`}>
                    {reward.skill} +{reward.points}
                  </li>
                ))}
              </ul>
              <div className="skill-tags">
                {rewards.map((reward) => (
                  <span key={`${contentItem.id}-tag-${reward.skill}`} className="skill-tag">
                    {reward.skill}
                  </span>
                ))}
              </div>
            </div>
          ) : null}
          <p>
            <strong>คะแนนจบคอร์ส:</strong> {contentItem.courseCompletionScore ?? 100}
          </p>
          <button type="button" className="enter-button" onClick={onEnterStudy}>
            เข้าเรียนเนื้อหานี้
          </button>
        </article>

        <TableOfContents
          content={contentItem.content}
          activeHeadingId=""
          onSelectHeading={() => {}}
        />
      </div>
    </section>
  );
}
