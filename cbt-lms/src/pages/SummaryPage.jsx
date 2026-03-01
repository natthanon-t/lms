import { useMemo } from "react";

export default function SummaryPage({
  lessonCount,
  examCount,
  users,
  learningStats,
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

    return { avgScore, avgCompletedCourses };
  }, [learnerCount, learnerUsernames, learningStats]);

  const handleExportCsv = () => {
    const escapeCsv = (value) => {
      const text = String(value ?? "");
      if (text.includes(",") || text.includes("\"") || text.includes("\n")) {
        return `"${text.replaceAll("\"", "\"\"")}"`;
      }
      return text;
    };

    const rows = [
      ["Section", "Field", "Value"],
      ["ภาพรวม", "บทเรียนทั้งหมด", lessonCount],
      ["ภาพรวม", "ข้อสอบทั้งหมด", examCount],
      ["ภาพรวม", "พนักงานที่ติดตาม", learnerCount],
      ["ภาพรวม", "คะแนนเฉลี่ยทีม", organizationSummary.avgScore],
      ["ภาพรวม", "ค่าเฉลี่ยคอร์สที่เรียนจบต่อคน", organizationSummary.avgCompletedCourses],
    ];

    const csvContent = rows.map((row) => row.map(escapeCsv).join(",")).join("\n");
    const blob = new Blob([`\uFEFF${csvContent}`], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    const date = new Date().toISOString().slice(0, 10);
    link.href = url;
    link.download = `summary-report-${date}.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  };

  return (
    <section className="workspace-content">
      <header className="content-header summary-header">
        <div>
          <h1>สรุปผล</h1>
          <p>ภาพรวมเพื่อวางแผนพัฒนาพนักงานขององค์กร</p>
        </div>
        <button type="button" className="enter-button summary-export-button" onClick={handleExportCsv}>
          Export CSV
        </button>
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
        <article className="metric-card">
          <h3>ค่าเฉลี่ยคอร์สที่เรียนจบต่อคน</h3>
          <p>{organizationSummary.avgCompletedCourses}</p>
        </article>
      </div>
    </section>
  );
}
