import { useMemo } from "react";
import { getSubtopicPages } from "../components/markdown/headingUtils";
import { getCourseSkillRewards } from "../services/skillRewardsService";

export default function SummaryPage({
  lessonCount,
  examCount,
  users,
  learningStats,
  examples,
  learningProgress,
}) {
  const learnerUsernames = useMemo(
    () =>
      Object.entries(users ?? {})
        .filter(([, profile]) => profile?.role !== "ผู้ดูแลระบบ")
        .map(([username]) => username),
    [users],
  );

  const learnerCount = learnerUsernames.length;

  const organizationSummary = useMemo(() => {
    const safeExamples = Array.isArray(examples) ? examples : [];
    const safeProgress = learningProgress ?? {};

    const avgScore =
      learnerCount > 0
        ? Math.round(
            learnerUsernames.reduce((sum, username) => sum + Number(learningStats?.[username]?.score ?? 0), 0) /
              learnerCount,
          )
        : 0;

    const avgCompletedCourses =
      learnerCount > 0
        ? Math.round(
            (learnerUsernames.reduce(
              (sum, username) => sum + Number(learningStats?.[username]?.completedCourses ?? 0),
              0,
            ) /
              learnerCount) *
              10,
          ) / 10
        : 0;

    const courseCompletionRows = safeExamples
      .map((course) => {
        const subtopics = getSubtopicPages(course.content, course.title);
        if (!subtopics.length || learnerCount === 0) {
          return {
            courseId: course.id,
            title: course.title,
            completionRate: 0,
          };
        }

        const completedLearners = learnerUsernames.filter((username) => {
          const completedSubtopics = safeProgress?.[username]?.[course.id]?.completedSubtopics ?? {};
          return subtopics.every((subtopic) => Boolean(completedSubtopics[subtopic.id]));
        }).length;

        return {
          courseId: course.id,
          title: course.title,
          completionRate: Math.round((completedLearners / learnerCount) * 100),
        };
      })
      .sort((a, b) => a.completionRate - b.completionRate);

    const weakestCourses = courseCompletionRows.slice(0, 3);

    const skillUniverse = Array.from(
      new Set(safeExamples.flatMap((course) => getCourseSkillRewards(course).map((reward) => reward.skill))),
    );

    const skillGaps = skillUniverse
      .map((skill) => {
        const maxPoints = safeExamples.reduce((sum, course) => {
          const reward = getCourseSkillRewards(course).find((entry) => entry.skill === skill);
          return reward ? sum + reward.points : sum;
        }, 0);

        const avgCurrent =
          learnerCount > 0
            ? learnerUsernames.reduce(
                (sum, username) => sum + Number(learningStats?.[username]?.skillScores?.[skill] ?? 0),
                0,
              ) / learnerCount
            : 0;

        const avgProgressPercent = maxPoints > 0 ? Math.round((avgCurrent / maxPoints) * 100) : 0;
        const recommendedCourses = safeExamples
          .filter((course) => getCourseSkillRewards(course).some((reward) => reward.skill === skill))
          .map((course) => course.title)
          .slice(0, 2);

        return {
          skill,
          avgProgressPercent,
          recommendedCourses,
        };
      })
      .sort((a, b) => a.avgProgressPercent - b.avgProgressPercent);

    const topSkillGaps = skillGaps.slice(0, 5);

    return {
      avgScore,
      avgCompletedCourses,
      weakestCourses,
      topSkillGaps,
    };
  }, [examples, learnerCount, learnerUsernames, learningProgress, learningStats]);

  return (
    <section className="workspace-content">
      <header className="content-header">
        <h1>สรุปผล</h1>
        <p>ภาพรวมเพื่อวางแผนพัฒนาพนักงานขององค์กร</p>
      </header>

      <div className="metric-grid">
        <article className="metric-card">
          <h3>บทเรียนทั้งหมด</h3>
          <p>{lessonCount}</p>
        </article>
        <article className="metric-card">
          <h3>ข้อสอบทั้งหมด</h3>
          <p>{examCount}</p>
        </article>
        <article className="metric-card">
          <h3>พนักงานที่ติดตาม</h3>
          <p>{learnerCount}</p>
        </article>
        <article className="metric-card">
          <h3>คะแนนเฉลี่ยทีม</h3>
          <p>{organizationSummary.avgScore}</p>
        </article>
      </div>

      <div className="summary-grid">
        <article className="info-card">
          <h3>คอร์สที่ควรเร่งพัฒนา</h3>
          {organizationSummary.weakestCourses.length ? (
            <div className="summary-list">
              {organizationSummary.weakestCourses.map((course) => (
                <div key={course.courseId} className="summary-row">
                  <div className="summary-row-head">
                    <p>{course.title}</p>
                    <p>{course.completionRate}%</p>
                  </div>
                  <div className="domain-result-bar">
                    <div className="domain-result-fill" style={{ width: `${course.completionRate}%` }} />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="toc-empty">ยังไม่มีข้อมูลความคืบหน้าคอร์ส</p>
          )}
          <p className="summary-note">
            ค่าเฉลี่ยคอร์สที่เรียนจบต่อคน: <strong>{organizationSummary.avgCompletedCourses}</strong>
          </p>
        </article>

        <article className="info-card">
          <h3>ทักษะที่ทีมยังอ่อน</h3>
          {organizationSummary.topSkillGaps.length ? (
            <div className="summary-list">
              {organizationSummary.topSkillGaps.map((entry) => (
                <div key={entry.skill} className="summary-row">
                  <div className="summary-row-head">
                    <p>{entry.skill}</p>
                    <p>{entry.avgProgressPercent}%</p>
                  </div>
                  <div className="domain-result-bar">
                    <div className="domain-result-fill" style={{ width: `${entry.avgProgressPercent}%` }} />
                  </div>
                  <p className="summary-note">
                    แนะนำคอร์ส: {entry.recommendedCourses.length ? entry.recommendedCourses.join(", ") : "-"}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <p className="toc-empty">ยังไม่มีข้อมูลทักษะ</p>
          )}
        </article>
      </div>
    </section>
  );
}
