import { useEffect, useMemo, useState } from "react";
import { fetchAnalyticsApi, fetchCourseLearnerApi } from "../services/analyticsApiService";
import { useAuth } from "../contexts/AuthContext";
import { useAppData } from "../contexts/AppDataContext";

const THAI_MONTHS = ["ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.", "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."];

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

// ── Chart 1: Daily Activity ────────────────────────────────────────────────────
function DailyActivityChart({ data }) {
  const W = 480, H = 220, ML = 36, MR = 48, MT = 16, MB = 50;
  const PW = W - ML - MR;
  const PH = H - MT - MB;
  if (!data?.length) return <p className="chart-empty">ไม่มีข้อมูล</p>;
  const passArr = data.map((d) => d.pass);
  const failArr = data.map((d) => d.fail);
  const maxBar = Math.max(...passArr, ...failArr, 1);
  const topVal = Math.ceil(maxBar * 1.3);
  const yBar = (v) => MT + PH - (v / topVal) * PH;
  const hBar = (v) => (v / topVal) * PH;
  const slotW = PW / data.length;
  const bW = 13;
  const passRates = data.map((d) => (d.pass + d.fail > 0 ? d.pass / (d.pass + d.fail) : 0));
  const ratePts = passRates.map((r, i) => [ML + (i + 0.5) * slotW, MT + PH * (1 - r)]);
  const rateD = ratePts.map(([x, y], i) => `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`).join(" ");

  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%">
      {[0, 0.5, 1].map((t) => {
        const y = MT + PH * (1 - t);
        return (
          <g key={t}>
            {t > 0 && <line x1={ML} y1={y} x2={ML + PW} y2={y} stroke="#eef2fc" strokeWidth="1" />}
            <text x={ML - 5} y={y + 4} textAnchor="end" fontSize="10" fill="#6b8ab8">{Math.round(t * topVal)}</text>
          </g>
        );
      })}
      {[0, 50, 100].map((pct) => (
        <text key={pct} x={ML + PW + 5} y={MT + PH * (1 - pct / 100) + 4} textAnchor="start" fontSize="10" fill="#f59e0b">{pct}%</text>
      ))}
      {data.map((item, i) => {
        const cx = ML + (i + 0.5) * slotW;
        return (
          <g key={item.day}>
            <rect x={cx - bW - 2} y={yBar(item.pass)} width={bW} height={hBar(item.pass)} rx="3" fill="#1f8d4e"><title>ผ่าน: {item.pass}</title></rect>
            <rect x={cx + 2} y={yBar(item.fail)} width={bW} height={hBar(item.fail)} rx="3" fill="#ef4444"><title>ไม่ผ่าน: {item.fail}</title></rect>
            <text x={cx} y={MT + PH + 14} textAnchor="middle" fontSize="11" fill="#45608f">{item.day}</text>
          </g>
        );
      })}
      <path d={rateD} fill="none" stroke="#f59e0b" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
      {ratePts.map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r="3.5" fill="#f59e0b" stroke="#fff" strokeWidth="1.5"><title>Pass Rate: {Math.round(passRates[i] * 100)}%</title></circle>
      ))}
      <line x1={ML} y1={MT} x2={ML} y2={MT + PH} stroke="#c8d6f0" strokeWidth="1" />
      <line x1={ML} y1={MT + PH} x2={ML + PW} y2={MT + PH} stroke="#c8d6f0" strokeWidth="1" />
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

// ── SVG label with truncation + ellipsis ──────────────────────────────────────
// x, cy: anchor point (right-aligned, vertically centred on bar)
// maxPx: available pixel width for text; fontSize: font size in px
function SvgLabel({ x, cy, maxPx, fontSize, fill, text }) {
  const approxCW = fontSize * 0.68; // rough char width for Thai/Latin mix
  const maxChars = Math.floor(maxPx / approxCW);
  const label = text.length <= maxChars ? text : `${text.slice(0, maxChars - 1)}…`;
  return (
    <text x={x} y={cy + fontSize * 0.38} textAnchor="end" fontSize={fontSize} fill={fill}>
      <title>{text}</title>
      {label}
    </text>
  );
}

// ── Chart 2: Top Course Creators ──────────────────────────────────────────────
function CourseCreatorsChart({ data }) {
  const W = 480, H = 190, ML = 120, MR = 60, MT = 10, MB = 16;
  const PW = W - ML - MR;
  if (!data?.length) return <p className="chart-empty">ไม่มีข้อมูล</p>;
  const maxCount = Math.max(...data.map((c) => c.count), 1);
  const BAR_H = 24, GAP = 10;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%">
      {data.map((item, i) => {
        const y = MT + i * (BAR_H + GAP);
        const bW = (item.count / maxCount) * PW;
        return (
          <g key={item.name}>
            <text x={ML - 8} y={y + BAR_H / 2 + 4} textAnchor="end" fontSize="11" fill="#1a2f57">{item.name}</text>
            <rect x={ML} y={y} width={bW} height={BAR_H} rx="4" fill="#3f8cff"><title>{item.name}: {item.count} คอร์ส</title></rect>
            <text x={ML + bW + 6} y={y + BAR_H / 2 + 4} textAnchor="start" fontSize="11" fontWeight="700" fill="#2454b8">{item.count} คอร์ส</text>
          </g>
        );
      })}
      <line
        x1={ML}
        y1={MT + data.length * BAR_H + (data.length - 1) * GAP + 6}
        x2={ML + PW}
        y2={MT + data.length * BAR_H + (data.length - 1) * GAP + 6}
        stroke="#c8d6f0"
        strokeWidth="1"
      />
    </svg>
  );
}

// ── Chart 3: Monthly Completions ──────────────────────────────────────────────
function MonthlyCompletionsChart({ data }) {
  const W = 480, H = 200, ML = 36, MR = 20, MT = 20, MB = 38;
  const PW = W - ML - MR;
  const PH = H - MT - MB;
  if (!data?.length) return <p className="chart-empty">ไม่มีข้อมูล</p>;
  const maxVal = Math.max(...data, 1) * 1.2;
  const n = data.length;
  const pts = data.map((v, i) => [ML + (i / (n - 1)) * PW, MT + PH - (v / maxVal) * PH]);
  const line = smoothPath(pts);
  const area = `${line} L${pts[n - 1][0].toFixed(1)},${(MT + PH).toFixed(1)} L${pts[0][0].toFixed(1)},${(MT + PH).toFixed(1)} Z`;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%">
      {[0, 0.5, 1].map((t) => {
        const y = MT + PH * (1 - t);
        return (
          <g key={t}>
            {t > 0 && <line x1={ML} y1={y} x2={ML + PW} y2={y} stroke="#eef2fc" strokeWidth="1" />}
            <text x={ML - 5} y={y + 4} textAnchor="end" fontSize="10" fill="#6b8ab8">{Math.round(t * maxVal)}</text>
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
          <title>{THAI_MONTHS[i]}: {data[i]} ครั้ง</title>
        </circle>
      ))}
      {THAI_MONTHS.map((m, i) => (
        <text key={m} x={ML + (i / (n - 1)) * PW} y={MT + PH + 16} textAnchor="middle" fontSize="9.5" fill="#6b8ab8">{m}</text>
      ))}
      <line x1={ML} y1={MT} x2={ML} y2={MT + PH} stroke="#c8d6f0" strokeWidth="1" />
      <line x1={ML} y1={MT + PH} x2={ML + PW} y2={MT + PH} stroke="#c8d6f0" strokeWidth="1" />
    </svg>
  );
}

// ── Chart 4: Course Status ─────────────────────────────────────────────────────
function CourseStatusChart({ data }) {
  const W = 680, ML = 175, MR = 50, MT = 16, LEGEND = 46;
  const BAR_H = 32, GAP = 10;
  const PW = W - ML - MR;
  if (!data?.length) return <p className="chart-empty">ไม่มีข้อมูล</p>;
  const H = MT + data.length * (BAR_H + GAP) - GAP + LEGEND + 10;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%">
      {data.map((item, i) => {
        const total = item.completed + item.inProgress + item.notStarted;
        if (total === 0) return null;
        const y = MT + i * (BAR_H + GAP);
        const cy = y + BAR_H / 2;
        const wC = (item.completed / total) * PW;
        const wI = (item.inProgress / total) * PW;
        const wN = PW - wC - wI;
        return (
          <g key={item.course}>
            <SvgLabel x={ML - 8} cy={cy} maxPx={ML - 12} fontSize={11} fill="#1a2f57" text={item.course} />
            <rect x={ML} y={y} width={wC} height={BAR_H} fill="#1f8d4e"><title>เสร็จสิ้น: {item.completed}</title></rect>
            <rect x={ML + wC} y={y} width={wI} height={BAR_H} fill="#2f66da"><title>กำลังเรียน: {item.inProgress}</title></rect>
            <rect x={ML + wC + wI} y={y} width={wN} height={BAR_H} fill="#c8d6f0"><title>ยังไม่เริ่ม: {item.notStarted}</title></rect>
            <text x={ML + PW + 6} y={cy + 4} fontSize="10" fill="#45608f">{total} คน</text>
          </g>
        );
      })}
      <rect x={ML} y={H - 26} width="14" height="14" rx="2" fill="#1f8d4e" />
      <text x={ML + 18} y={H - 13} fontSize="11" fill="#45608f">เสร็จสิ้น</text>
      <rect x={ML + 78} y={H - 26} width="14" height="14" rx="2" fill="#2f66da" />
      <text x={ML + 96} y={H - 13} fontSize="11" fill="#45608f">กำลังเรียน</text>
      <rect x={ML + 170} y={H - 26} width="14" height="14" rx="2" fill="#c8d6f0" />
      <text x={ML + 188} y={H - 13} fontSize="11" fill="#45608f">ยังไม่เริ่ม</text>
    </svg>
  );
}

// ── Chart 5: Top Enrollment ────────────────────────────────────────────────────
function TopEnrollmentChart({ data }) {
  const W = 700, ML = 185, MR = 80, MT = 16;
  const PW = W - ML - MR;
  if (!data?.length) return <p className="chart-empty">ไม่มีข้อมูล</p>;
  const maxCount = Math.max(...data.map((e) => e.count), 1);
  const BAR_H = 34, GAP = 10;
  const H = MT + data.length * (BAR_H + GAP) - GAP + 16;
  const COLORS = ["#2454b8", "#2f66da", "#3f8cff", "#60a5fa", "#93c5fd"];
  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%">
      {data.map((item, i) => {
        const y = MT + i * (BAR_H + GAP);
        const cy = y + BAR_H / 2;
        const bW = (item.count / maxCount) * PW;
        return (
          <g key={item.course}>
            <SvgLabel x={ML - 8} cy={cy} maxPx={ML - 12} fontSize={12} fill="#1a2f57" text={item.course} />
            <rect x={ML} y={y} width={bW} height={BAR_H} rx="5" fill={COLORS[i]}><title>{item.course}: {item.count} คน</title></rect>
            <text x={ML + bW + 8} y={cy + 5} textAnchor="start" fontSize="12" fontWeight="700" fill={COLORS[i]}>{item.count} คน</text>
          </g>
        );
      })}
    </svg>
  );
}

// ── Status badge ───────────────────────────────────────────────────────────────
const STATUS_MAP = {
  completed:   { label: "เสร็จสิ้น",   cls: "badge-completed" },
  in_progress: { label: "กำลังเรียน", cls: "badge-in-progress" },
  not_started: { label: "ยังไม่เริ่ม", cls: "badge-not-started" },
};
function StatusBadge({ status }) {
  const { label, cls } = STATUS_MAP[status] ?? { label: status, cls: "" };
  return <span className={`status-badge ${cls}`}>{label}</span>;
}

function formatDate(iso) {
  if (!iso) return "—";
  const d = new Date(iso);
  return isNaN(d) ? "—" : d.toLocaleString("th-TH", { dateStyle: "short", timeStyle: "short" });
}

// ── Main SummaryPage ──────────────────────────────────────────────────────────
export default function SummaryPage() {
  const { users } = useAuth();
  const { examples, examBank, userTotalScore } = useAppData();
  const lessonCount = examples.length;
  const examCount = examBank.length;
  const [analytics, setAnalytics] = useState(null);
  const [learners, setLearners] = useState([]);
  const [selectedCourseId, setSelectedCourseId] = useState("");
  const [loadingLearners, setLoadingLearners] = useState(false);
  const [learnerSearch, setLearnerSearch] = useState("");
  const [pageSize, setPageSize] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    fetchAnalyticsApi()
      .then((data) => setAnalytics(data))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!selectedCourseId) {
      setLearners([]);
      return;
    }
    setLoadingLearners(true);
    setCurrentPage(1);
    fetchCourseLearnerApi(selectedCourseId)
      .then((data) => setLearners(data?.learners ?? []))
      .catch(() => setLearners([]))
      .finally(() => setLoadingLearners(false));
  }, [selectedCourseId]);

  const safeExamples = Array.isArray(examples) ? examples : [];

  const learnerCount = useMemo(
    () =>
      Object.entries(users ?? {}).filter(([, profile]) => profile?.role !== "ผู้ดูแลระบบ").length,
    [users],
  );

  const organizationSummary = useMemo(
    () => ({ avgScore: userTotalScore, avgCompletedCourses: 0 }),
    [userTotalScore],
  );

  const filteredLearners = useMemo(() => {
    const keyword = learnerSearch.trim().toLowerCase();
    return keyword
      ? learners.filter(
          (r) =>
            r.name?.toLowerCase().includes(keyword) ||
            r.employeeCode?.toLowerCase().includes(keyword),
        )
      : learners;
  }, [learners, learnerSearch]);

  const handleExportCsv = () => {
    const esc = (value) => {
      const text = String(value ?? "");
      return text.includes(",") || text.includes("\"") || text.includes("\n")
        ? `"${text.replaceAll("\"", "\"\"")}"`
        : text;
    };
    const rows = [];

    // ── ภาพรวม ──
    rows.push(["หมวด", "ฟิลด์", "ค่า"]);
    rows.push(["ภาพรวม", "บทเรียนทั้งหมด", lessonCount]);
    rows.push(["ภาพรวม", "ข้อสอบทั้งหมด", examCount]);
    rows.push(["ภาพรวม", "พนักงานที่ติดตาม", learnerCount]);
    rows.push(["ภาพรวม", "คะแนนเฉลี่ยทีม", organizationSummary.avgScore]);

    // ── Daily Activity ──
    if (analytics?.dailyExamActivity?.length) {
      rows.push([]);
      rows.push(["Daily Activity", "วัน", "ผ่าน", "ไม่ผ่าน"]);
      analytics.dailyExamActivity.forEach((d) => rows.push(["", d.day, d.pass, d.fail]));
    }

    // ── ผู้สร้างคอร์ส ──
    if (analytics?.topCreators?.length) {
      rows.push([]);
      rows.push(["ผู้สร้างคอร์สสูงสุด", "ชื่อ", "จำนวนคอร์ส"]);
      analytics.topCreators.forEach((c) => rows.push(["", c.name, c.count]));
    }

    // ── คอร์สที่เรียนจบรายเดือน ──
    if (analytics?.monthlyCompletions?.length) {
      rows.push([]);
      rows.push(["คอร์สที่เรียนจบรายเดือน", "เดือน", "จำนวน"]);
      THAI_MONTHS.forEach((m, i) => rows.push(["", m, analytics.monthlyCompletions[i] ?? 0]));
    }

    // ── สถานะการเรียนรายคอร์ส ──
    if (analytics?.courseStatus?.length) {
      rows.push([]);
      rows.push(["สถานะการเรียนรายคอร์ส", "คอร์ส", "เสร็จสิ้น", "กำลังเรียน", "ยังไม่เริ่ม"]);
      analytics.courseStatus.forEach((c) =>
        rows.push(["", c.course, c.completed, c.inProgress, c.notStarted]),
      );
    }

    // ── คอร์สยอดนิยม ──
    if (analytics?.topEnrollment?.length) {
      rows.push([]);
      rows.push(["คอร์สยอดนิยม", "คอร์ส", "จำนวนผู้เรียน"]);
      analytics.topEnrollment.forEach((e) => rows.push(["", e.course, e.count]));
    }

    // ── สถานะการเรียนรายบุคคล (เฉพาะเมื่อเลือกคอร์ส) ──
    if (selectedCourseId && filteredLearners.length > 0) {
      const courseTitle =
        safeExamples.find((c) => c.id === selectedCourseId)?.title ?? selectedCourseId;
      const statusLabel = { completed: "เสร็จสิ้น", in_progress: "กำลังเรียน", not_started: "ยังไม่เริ่ม" };
      rows.push([]);
      rows.push([`สถานะการเรียนรายบุคคล — ${courseTitle}`]);
      rows.push(["รหัสพนักงาน", "ชื่อ-นามสกุล", "สถานะ", "ตอบคำถาม", "เวลาเริ่ม", "เวลาเสร็จ"]);
      filteredLearners.forEach((r) =>
        rows.push([
          r.employeeCode || "—",
          r.name,
          statusLabel[r.status] ?? r.status,
          r.answeredCount > 0 ? `${r.answeredCount} ครั้ง` : "—",
          formatDate(r.startedAt),
          formatDate(r.finishedAt),
        ]),
      );
    }

    const csvContent = rows.map((row) => row.map(esc).join(",")).join("\n");
    const blob = new Blob([`\uFEFF${csvContent}`], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `summary-report-${new Date().toISOString().slice(0, 10)}.csv`;
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
        <article className="metric-card"><h3>บทเรียนทั้งหมด</h3><p>{lessonCount}</p></article>
        <article className="metric-card"><h3>ข้อสอบทั้งหมด</h3><p>{examCount}</p></article>
        <article className="metric-card"><h3>พนักงานที่ติดตาม</h3><p>{learnerCount}</p></article>
        <article className="metric-card"><h3>คะแนนเฉลี่ยทีม</h3><p>{organizationSummary.avgScore}</p></article>
        <article className="metric-card"><h3>ค่าเฉลี่ยคอร์สที่เรียนจบต่อคน</h3><p>{organizationSummary.avgCompletedCourses}</p></article>
      </div>

      <div className="summary-chart-grid">
        <div className="chart-card">
          <h3 className="chart-card-title">Daily Activity (Pass / Failed)</h3>
          <p className="chart-card-sub">ผลการทำข้อสอบในรอบสัปดาห์นี้</p>
          <DailyActivityChart data={analytics?.dailyExamActivity} />
        </div>

        <div className="chart-card">
          <h3 className="chart-card-title">ผู้สร้างคอร์สสูงสุด</h3>
          <p className="chart-card-sub">อันดับผู้ที่สร้างคอร์สเยอะที่สุด</p>
          <CourseCreatorsChart data={analytics?.topCreators} />
        </div>

        <div className="chart-card">
          <h3 className="chart-card-title">คอร์สที่เรียนจบรายเดือน</h3>
          <p className="chart-card-sub">จำนวนคอร์สที่เรียนจบในแต่ละเดือน (ปีนี้)</p>
          <MonthlyCompletionsChart data={analytics?.monthlyCompletions} />
        </div>

        <div className="chart-card">
          <h3 className="chart-card-title">สถานะการเรียนรายคอร์ส</h3>
          <p className="chart-card-sub">สัดส่วนผู้เรียนในแต่ละสถานะ (Top 5)</p>
          <CourseStatusChart data={analytics?.courseStatus} />
        </div>

        <div className="chart-card chart-card-full">
          <h3 className="chart-card-title">คอร์สยอดนิยม (จำนวนผู้เรียน)</h3>
          <p className="chart-card-sub">5 คอร์สที่มีผู้เรียนสูงสุด</p>
          <TopEnrollmentChart data={analytics?.topEnrollment} />
        </div>
      </div>

      <div className="course-status-section">
        <div className="course-status-header">
          <div>
            <h2 className="chart-card-title">สถานะการเรียนรายบุคคล</h2>
            <p className="chart-card-sub">เลือกคอร์สเพื่อดูความคืบหน้าของแต่ละคน</p>
          </div>
          <select
            className="course-status-select"
            value={selectedCourseId}
            onChange={(e) => setSelectedCourseId(e.target.value)}
          >
            <option value="">— เลือกคอร์ส —</option>
            {safeExamples.map((c) => (
              <option key={c.id} value={c.id}>{c.title}</option>
            ))}
          </select>
        </div>

        {selectedCourseId ? (
          loadingLearners ? (
            <p className="chart-card-sub">กำลังโหลด...</p>
          ) : (() => {
            const totalPages = Math.max(1, Math.ceil(filteredLearners.length / pageSize));
            const safePage = Math.min(currentPage, totalPages);
            const pageRows = filteredLearners.slice((safePage - 1) * pageSize, safePage * pageSize);
            return (
              <>
                <div className="learner-table-controls">
                  <input
                    type="text"
                    className="learner-search-input"
                    placeholder="ค้นหาชื่อ / รหัสพนักงาน"
                    value={learnerSearch}
                    onChange={(e) => { setLearnerSearch(e.target.value); setCurrentPage(1); }}
                  />
                  <label className="learner-pagesize-label">
                    แสดง
                    <select
                      className="learner-pagesize-select"
                      value={pageSize}
                      onChange={(e) => { setPageSize(Number(e.target.value)); setCurrentPage(1); }}
                    >
                      {[10, 50, 100].map((n) => <option key={n} value={n}>{n}</option>)}
                    </select>
                    รายการ
                  </label>
                </div>
                <div className="course-status-table-wrap">
                  <table className="course-status-table">
                    <thead>
                      <tr>
                        <th>รหัสพนักงาน</th>
                        <th>ชื่อ-นามสกุล</th>
                        <th>สถานะ</th>
                        <th>ตอบคำถาม</th>
                        <th>เวลาเริ่ม</th>
                        <th>เวลาเสร็จ</th>
                      </tr>
                    </thead>
                    <tbody>
                      {pageRows.map((row) => (
                        <tr key={row.username}>
                          <td>{row.employeeCode || "—"}</td>
                          <td>{row.name}</td>
                          <td><StatusBadge status={row.status} /></td>
                          <td className="col-center">{row.answeredCount > 0 ? `${row.answeredCount} ครั้ง` : "—"}</td>
                          <td>{formatDate(row.startedAt)}</td>
                          <td>{formatDate(row.finishedAt)}</td>
                        </tr>
                      ))}
                      {pageRows.length === 0 && (
                        <tr><td colSpan="6" className="col-center">ไม่มีข้อมูล</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
                {totalPages > 1 && (
                  <div className="learner-pagination">
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                      <button
                        key={p}
                        type="button"
                        className={`page-btn${p === safePage ? " page-btn-active" : ""}`}
                        onClick={() => setCurrentPage(p)}
                      >
                        {p}
                      </button>
                    ))}
                  </div>
                )}
              </>
            );
          })()
        ) : null}
      </div>
    </section>
  );
}
