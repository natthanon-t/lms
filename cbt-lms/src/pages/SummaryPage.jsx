import { useMemo } from "react";

// ── Mock chart data (ข้อมูลจำลอง) ────────────────────────────────────────────
const DAYS = ["จ.", "อ.", "พ.", "พฤ.", "ศ.", "ส.", "อา."];
const MOCK_PASS = [8, 12, 7, 15, 10, 6, 9];
const MOCK_FAIL = [3, 4, 2, 5, 3, 2, 4];

const MOCK_CREATORS = [
  { name: "สมชาย ใจดี", count: 8 },
  { name: "วรรณา ศรีสุข", count: 6 },
  { name: "ประยุทธ พิมลรัตน์", count: 5 },
  { name: "นันทิดา แก้วมณี", count: 4 },
  { name: "ธนาธร วงษ์ศิริ", count: 3 },
];

const MOCK_MONTHS = ["ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.", "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."];
const MOCK_MONTHLY = [5, 8, 12, 7, 15, 18, 22, 19, 14, 10, 8, 6];

const MOCK_STATUS = [
  { course: "React พื้นฐาน", completed: 12, inProgress: 8, notStarted: 5 },
  { course: "JavaScript ES6+", completed: 18, inProgress: 4, notStarted: 2 },
  { course: "UX/UI Design", completed: 7, inProgress: 10, notStarted: 8 },
  { course: "SQL ขั้นสูง", completed: 5, inProgress: 6, notStarted: 14 },
  { course: "Python Data", completed: 9, inProgress: 12, notStarted: 4 },
];

const MOCK_ENROLLMENT = [
  { course: "JavaScript ES6+", count: 28 },
  { course: "React พื้นฐาน", count: 24 },
  { course: "Python Data", count: 20 },
  { course: "UX/UI Design", count: 17 },
  { course: "SQL ขั้นสูง", count: 14 },
];

// ── Catmull-Rom → cubic-bezier smooth path ────────────────────────────────────
function smoothPath(pts) {
  if (pts.length < 2) return "";
  const n = pts.length;
  let d = `M${pts[0][0].toFixed(1)},${pts[0][1].toFixed(1)}`;
  for (let i = 0; i < n - 1; i++) {
    const p0 = pts[Math.max(0, i - 1)];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[Math.min(n - 1, i + 2)];
    const cp1x = (p1[0] + (p2[0] - p0[0]) / 6).toFixed(1);
    const cp1y = (p1[1] + (p2[1] - p0[1]) / 6).toFixed(1);
    const cp2x = (p2[0] - (p3[0] - p1[0]) / 6).toFixed(1);
    const cp2y = (p2[1] - (p3[1] - p1[1]) / 6).toFixed(1);
    d += ` C${cp1x},${cp1y} ${cp2x},${cp2y} ${p2[0].toFixed(1)},${p2[1].toFixed(1)}`;
  }
  return d;
}

// ── Chart 1: Daily Activity (grouped bar + pass-rate line) ────────────────────
function DailyActivityChart() {
  const W = 480, H = 220, ML = 36, MR = 48, MT = 16, MB = 50;
  const PW = W - ML - MR;
  const PH = H - MT - MB;
  const maxBar = Math.max(...MOCK_PASS, ...MOCK_FAIL);
  const topVal = Math.ceil(maxBar * 1.3);
  const yBar = (v) => MT + PH - (v / topVal) * PH;
  const hBar = (v) => (v / topVal) * PH;
  const slotW = PW / DAYS.length;
  const bW = 13;
  const passRates = MOCK_PASS.map((p, i) => p / (p + MOCK_FAIL[i]));
  const ratePts = passRates.map((r, i) => [ML + (i + 0.5) * slotW, MT + PH * (1 - r)]);
  const rateD = ratePts.map(([x, y], i) => `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`).join(" ");

  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%">
      {/* Horizontal grid */}
      {[0, 0.5, 1].map((t) => {
        const y = MT + PH * (1 - t);
        return (
          <g key={t}>
            {t > 0 && <line x1={ML} y1={y} x2={ML + PW} y2={y} stroke="#eef2fc" strokeWidth="1" />}
            <text x={ML - 5} y={y + 4} textAnchor="end" fontSize="10" fill="#6b8ab8">
              {Math.round(t * topVal)}
            </text>
          </g>
        );
      })}

      {/* Right axis — Pass Rate % */}
      {[0, 50, 100].map((pct) => (
        <text
          key={pct}
          x={ML + PW + 5}
          y={MT + PH * (1 - pct / 100) + 4}
          textAnchor="start"
          fontSize="10"
          fill="#f59e0b"
        >
          {pct}%
        </text>
      ))}

      {/* Bars per day */}
      {DAYS.map((day, i) => {
        const cx = ML + (i + 0.5) * slotW;
        return (
          <g key={day}>
            <rect x={cx - bW - 2} y={yBar(MOCK_PASS[i])} width={bW} height={hBar(MOCK_PASS[i])} rx="3" fill="#1f8d4e">
              <title>ผ่าน: {MOCK_PASS[i]}</title>
            </rect>
            <rect x={cx + 2} y={yBar(MOCK_FAIL[i])} width={bW} height={hBar(MOCK_FAIL[i])} rx="3" fill="#ef4444">
              <title>ไม่ผ่าน: {MOCK_FAIL[i]}</title>
            </rect>
            <text x={cx} y={MT + PH + 14} textAnchor="middle" fontSize="11" fill="#45608f">
              {day}
            </text>
          </g>
        );
      })}

      {/* Pass rate line + dots */}
      <path d={rateD} fill="none" stroke="#f59e0b" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
      {ratePts.map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r="3.5" fill="#f59e0b" stroke="#fff" strokeWidth="1.5">
          <title>Pass Rate: {Math.round(passRates[i] * 100)}%</title>
        </circle>
      ))}

      {/* Axes */}
      <line x1={ML} y1={MT} x2={ML} y2={MT + PH} stroke="#c8d6f0" strokeWidth="1" />
      <line x1={ML} y1={MT + PH} x2={ML + PW} y2={MT + PH} stroke="#c8d6f0" strokeWidth="1" />

      {/* Legend */}
      <rect x={ML} y={H - 16} width="12" height="12" rx="2" fill="#1f8d4e" />
      <text x={ML + 16} y={H - 5} fontSize="11" fill="#45608f">ผ่าน</text>
      <rect x={ML + 56} y={H - 16} width="12" height="12" rx="2" fill="#ef4444" />
      <text x={ML + 72} y={H - 5} fontSize="11" fill="#45608f">ไม่ผ่าน</text>
      <line x1={ML + 128} y1={H - 10} x2={ML + 140} y2={H - 10} stroke="#f59e0b" strokeWidth="2.5" />
      <circle cx={ML + 134} cy={H - 10} r="3.5" fill="#f59e0b" />
      <text x={ML + 144} y={H - 5} fontSize="11" fill="#45608f">Pass Rate</text>
    </svg>
  );
}

// ── Chart 2: Top Course Creators (horizontal bar) ─────────────────────────────
function CourseCreatorsChart() {
  const W = 480, H = 190, ML = 120, MR = 60, MT = 10, MB = 16;
  const PW = W - ML - MR;
  const maxCount = Math.max(...MOCK_CREATORS.map((c) => c.count));
  const BAR_H = 24, GAP = 10;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%">
      {MOCK_CREATORS.map((item, i) => {
        const y = MT + i * (BAR_H + GAP);
        const bW = (item.count / maxCount) * PW;
        return (
          <g key={item.name}>
            <text x={ML - 8} y={y + BAR_H / 2 + 4} textAnchor="end" fontSize="11" fill="#1a2f57">
              {item.name}
            </text>
            <rect x={ML} y={y} width={bW} height={BAR_H} rx="4" fill="#3f8cff">
              <title>{item.name}: {item.count} คอร์ส</title>
            </rect>
            <text x={ML + bW + 6} y={y + BAR_H / 2 + 4} textAnchor="start" fontSize="11" fontWeight="700" fill="#2454b8">
              {item.count} คอร์ส
            </text>
          </g>
        );
      })}

      <line
        x1={ML}
        y1={MT + MOCK_CREATORS.length * BAR_H + (MOCK_CREATORS.length - 1) * GAP + 6}
        x2={ML + PW}
        y2={MT + MOCK_CREATORS.length * BAR_H + (MOCK_CREATORS.length - 1) * GAP + 6}
        stroke="#c8d6f0"
        strokeWidth="1"
      />
    </svg>
  );
}

// ── Chart 3: Monthly Completions (smooth area line) ───────────────────────────
function MonthlyCompletionsChart() {
  const W = 480, H = 200, ML = 36, MR = 20, MT = 20, MB = 38;
  const PW = W - ML - MR;
  const PH = H - MT - MB;
  const maxVal = Math.max(...MOCK_MONTHLY) * 1.2;
  const n = MOCK_MONTHLY.length;

  const pts = MOCK_MONTHLY.map((v, i) => [
    ML + (i / (n - 1)) * PW,
    MT + PH - (v / maxVal) * PH,
  ]);

  const line = smoothPath(pts);
  const area = `${line} L${pts[n - 1][0].toFixed(1)},${(MT + PH).toFixed(1)} L${pts[0][0].toFixed(1)},${(MT + PH).toFixed(1)} Z`;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%">
      {/* Grid */}
      {[0, 0.5, 1].map((t) => {
        const y = MT + PH * (1 - t);
        return (
          <g key={t}>
            {t > 0 && <line x1={ML} y1={y} x2={ML + PW} y2={y} stroke="#eef2fc" strokeWidth="1" />}
            <text x={ML - 5} y={y + 4} textAnchor="end" fontSize="10" fill="#6b8ab8">
              {Math.round(t * maxVal)}
            </text>
          </g>
        );
      })}

      <defs>
        <linearGradient id="monthGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#3f8cff" stopOpacity="0.2" />
          <stop offset="100%" stopColor="#3f8cff" stopOpacity="0.02" />
        </linearGradient>
      </defs>

      <path d={area} fill="url(#monthGrad)" />
      <path d={line} fill="none" stroke="#3f8cff" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />

      {pts.map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r="3" fill="#3f8cff" stroke="#fff" strokeWidth="1.5">
          <title>{MOCK_MONTHS[i]}: {MOCK_MONTHLY[i]} คอร์ส</title>
        </circle>
      ))}

      {MOCK_MONTHS.map((m, i) => (
        <text key={m} x={ML + (i / (n - 1)) * PW} y={MT + PH + 16} textAnchor="middle" fontSize="9.5" fill="#6b8ab8">
          {m}
        </text>
      ))}

      <line x1={ML} y1={MT} x2={ML} y2={MT + PH} stroke="#c8d6f0" strokeWidth="1" />
      <line x1={ML} y1={MT + PH} x2={ML + PW} y2={MT + PH} stroke="#c8d6f0" strokeWidth="1" />
    </svg>
  );
}

// ── Chart 4: Course Status per Course (stacked horizontal bars) ───────────────
function CourseStatusChart() {
  const W = 680, H = 230, ML = 130, MR = 40, MT = 16, MB = 46;
  const PW = W - ML - MR;
  const BAR_H = 24, GAP = 10;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%">
      {MOCK_STATUS.map((item, i) => {
        const total = item.completed + item.inProgress + item.notStarted;
        const y = MT + i * (BAR_H + GAP);
        const wC = (item.completed / total) * PW;
        const wI = (item.inProgress / total) * PW;
        const wN = PW - wC - wI;
        return (
          <g key={item.course}>
            <text x={ML - 8} y={y + BAR_H / 2 + 4} textAnchor="end" fontSize="11" fill="#1a2f57">
              {item.course}
            </text>
            <rect x={ML} y={y} width={wC} height={BAR_H} rx="0" fill="#1f8d4e">
              <title>เสร็จสิ้น: {item.completed}</title>
            </rect>
            <rect x={ML + wC} y={y} width={wI} height={BAR_H} rx="0" fill="#2f66da">
              <title>กำลังเรียน: {item.inProgress}</title>
            </rect>
            <rect x={ML + wC + wI} y={y} width={wN} height={BAR_H} rx="0" fill="#c8d6f0">
              <title>ยังไม่เริ่ม: {item.notStarted}</title>
            </rect>
            <text x={ML + PW + 6} y={y + BAR_H / 2 + 4} fontSize="10" fill="#45608f">
              {total} คน
            </text>
          </g>
        );
      })}

      {/* Legend */}
      <rect x={ML} y={H - 26} width="14" height="14" rx="2" fill="#1f8d4e" />
      <text x={ML + 18} y={H - 13} fontSize="11" fill="#45608f">เสร็จสิ้น</text>
      <rect x={ML + 78} y={H - 26} width="14" height="14" rx="2" fill="#2f66da" />
      <text x={ML + 96} y={H - 13} fontSize="11" fill="#45608f">กำลังเรียน</text>
      <rect x={ML + 170} y={H - 26} width="14" height="14" rx="2" fill="#c8d6f0" />
      <text x={ML + 188} y={H - 13} fontSize="11" fill="#45608f">ยังไม่เริ่ม</text>
    </svg>
  );
}

// ── Chart 5: Top Courses by Enrollment (horizontal bar) ──────────────────────
function TopEnrollmentChart() {
  const W = 700, H = 200, ML = 145, MR = 80, MT = 16, MB = 20;
  const PW = W - ML - MR;
  const maxCount = Math.max(...MOCK_ENROLLMENT.map((e) => e.count));
  const BAR_H = 28, GAP = 10;
  const COLORS = ["#2454b8", "#2f66da", "#3f8cff", "#60a5fa", "#93c5fd"];

  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%">
      {MOCK_ENROLLMENT.map((item, i) => {
        const y = MT + i * (BAR_H + GAP);
        const bW = (item.count / maxCount) * PW;
        return (
          <g key={item.course}>
            <text x={ML - 8} y={y + BAR_H / 2 + 5} textAnchor="end" fontSize="12" fill="#1a2f57">
              {item.course}
            </text>
            <rect x={ML} y={y} width={bW} height={BAR_H} rx="5" fill={COLORS[i]}>
              <title>{item.course}: {item.count} คน</title>
            </rect>
            <text x={ML + bW + 8} y={y + BAR_H / 2 + 5} textAnchor="start" fontSize="12" fontWeight="700" fill={COLORS[i]}>
              {item.count} คน
            </text>
          </g>
        );
      })}
    </svg>
  );
}

// ── Main SummaryPage ──────────────────────────────────────────────────────────
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

      {/* ── Charts ── */}
      <div className="summary-chart-grid">
        <div className="chart-card">
          <h3 className="chart-card-title">Daily Activity (Pass / Failed)</h3>
          <p className="chart-card-sub">ผลการทำข้อสอบในรอบสัปดาห์นี้ (ข้อมูลจำลอง)</p>
          <DailyActivityChart />
        </div>

        <div className="chart-card">
          <h3 className="chart-card-title">ผู้สร้างคอร์สสูงสุด</h3>
          <p className="chart-card-sub">อันดับผู้ที่สร้างคอร์สเยอะที่สุด (ข้อมูลจำลอง)</p>
          <CourseCreatorsChart />
        </div>

        <div className="chart-card">
          <h3 className="chart-card-title">คอร์สที่เรียนจบรายเดือน</h3>
          <p className="chart-card-sub">จำนวนคอร์สที่เรียนจบในแต่ละเดือน (ข้อมูลจำลอง)</p>
          <MonthlyCompletionsChart />
        </div>

        <div className="chart-card">
          <h3 className="chart-card-title">สถานะการเรียนรายคอร์ส</h3>
          <p className="chart-card-sub">สัดส่วนผู้เรียนในแต่ละสถานะต่อคอร์ส (ข้อมูลจำลอง)</p>
          <CourseStatusChart />
        </div>

        <div className="chart-card chart-card-full">
          <h3 className="chart-card-title">คอร์สยอดนิยม (จำนวนผู้เรียน)</h3>
          <p className="chart-card-sub">5 คอร์สที่มีผู้เรียนสูงสุด (ข้อมูลจำลอง)</p>
          <TopEnrollmentChart />
        </div>
      </div>
    </section>
  );
}
