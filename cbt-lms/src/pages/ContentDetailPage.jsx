import { useEffect, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import TableOfContents from "../components/markdown/TableOfContents";
import { getSubtopicPages } from "../components/markdown/headingUtils";
import { getCourseSkillRewards } from "../services/skillRewardsService";
import { normalizeExampleRecord } from "../services/courseService";
import { useAuth } from "../contexts/AuthContext";
import { useAppData } from "../contexts/AppDataContext";

export default function ContentDetailPage() {
  const { courseId } = useParams();
  const navigate = useNavigate();
  const { currentUserKey, canLearnContent } = useAuth();
  const { examples, prepareStudy, loadExamples } = useAppData();

  useEffect(() => {
    void loadExamples();
  }, [loadExamples]);

  const contentItem = useMemo(() => {
    const found = examples.find((e) => e.id === courseId);
    return found ? normalizeExampleRecord(found) : null;
  }, [examples, courseId]);

  const isLoggedIn = Boolean(currentUserKey);
  const canEnterStudy = isLoggedIn && canLearnContent;

  const subtopics = useMemo(
    () => (contentItem ? getSubtopicPages(contentItem.content, contentItem.title) : []),
    [contentItem],
  );
  const rewards = contentItem ? getCourseSkillRewards(contentItem) : [];
  const totalSkillPoints = rewards.reduce((sum, reward) => sum + reward.points, 0);

  if (!contentItem) {
    return (
      <section className="workspace-content">
        <header className="content-header">
          <h1>ไม่พบเนื้อหา</h1>
          <p>ไม่พบเนื้อหาที่ต้องการ</p>
        </header>
        <button type="button" className="back-button" onClick={() => navigate("/content")}>
          กลับหน้ารายการเนื้อหา
        </button>
      </section>
    );
  }

  const handleEnterStudy = () => {
    const result = prepareStudy(contentItem);
    if (result?.blocked) return;
    navigate(`/content/${courseId}/study`, { state: { initialSubtopicId: result.initialSubtopicId } });
  };

  return (
    <section className="workspace-content content-theme-exam content-detail-page">
      <header className="content-header editor-head">
        <div>
          <h1>{contentItem.title}</h1>
          <p>รายละเอียดคอร์สก่อนเข้าเรียน</p>
        </div>
        <button type="button" className="back-button" onClick={() => navigate("/content")}>
          กลับหน้ารายการเนื้อหา
        </button>
      </header>

      <div className="content-detail-grid">
        <article className="info-card content-detail-card content-detail-overview-card">
          <img src={contentItem.image} alt={contentItem.title} className="content-detail-cover" />
          <p className="content-meta-item">
            <strong>ผู้สร้าง:</strong> {contentItem.creator ?? "ทีมผู้สอน"}
          </p>
          <p className="content-meta-item">
            <strong>รายละเอียด:</strong> {contentItem.description ?? "-"}
          </p>
          <p className="content-meta-item">
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
          <p className="content-meta-item">
            <strong>คะแนนจบคอร์ส:</strong> {contentItem.courseCompletionScore ?? 100}
          </p>
          <button
            type="button"
            className="enter-button"
            onClick={canEnterStudy ? handleEnterStudy : undefined}
            disabled={!canEnterStudy}
            title={!isLoggedIn ? "กรุณา Login ก่อนเข้าเรียน" : !canLearnContent ? "คุณไม่มีสิทธิ์เรียนเนื้อหา" : ""}
          >
            {!isLoggedIn ? "กรุณา Login ก่อนเข้าเรียน" : !canLearnContent ? "ไม่มีสิทธิ์เรียนเนื้อหา" : "เข้าเรียนเนื้อหานี้"}
          </button>
        </article>

        <TableOfContents
          content={contentItem.content}
          activeHeadingId={null}
          onSelectHeading={() => {}}
        />
      </div>
    </section>
  );
}
