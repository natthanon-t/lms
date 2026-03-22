import { useMemo } from "react";

export const THAI_MONTHS = ["ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.", "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."];

// ── Catmull-Rom → cubic-bezier smooth path ────────────────────────────────────
export function smoothPath(pts) {
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

// ── SVG label with truncation + ellipsis ──────────────────────────────────────
export function SvgLabel({ x, cy, maxPx, fontSize, fill, text }) {
  const approxCW = fontSize * 0.68;
  const maxChars = Math.floor(maxPx / approxCW);
  const label = text.length <= maxChars ? text : `${text.slice(0, maxChars - 1)}…`;
  return (
    <text x={x} y={cy + fontSize * 0.38} textAnchor="end" fontSize={fontSize} fill={fill}>
      <title>{text}</title>
      {label}
    </text>
  );
}

// ── Chart 1: Daily Activity ────────────────────────────────────────────────────
export function DailyActivityChart({ data }) {
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

// ── Chart 2: Top Course Creators ──────────────────────────────────────────────
const CREATOR_RANK_STYLES = [
  { rankBg: "linear-gradient(135deg,#fbbf24,#f59e0b)", rankColor: "#78350f", avatarBg: "linear-gradient(135deg,#fcd34d,#f59e0b)" },
  { rankBg: "linear-gradient(135deg,#e2e8f0,#cbd5e1)", rankColor: "#1e293b", avatarBg: "linear-gradient(135deg,#e2e8f0,#94a3b8)" },
  { rankBg: "linear-gradient(135deg,#fed7aa,#fb923c)", rankColor: "#7c2d12", avatarBg: "linear-gradient(135deg,#fdba74,#f97316)" },
  { rankBg: "#eef3ff", rankColor: "#2454b8", avatarBg: "linear-gradient(135deg,#60a5fa,#2f66da)" },
  { rankBg: "#eef3ff", rankColor: "#2454b8", avatarBg: "linear-gradient(135deg,#60a5fa,#2f66da)" },
];

function getInitials(name = "") {
  return name.split(/\s+/).map((w) => w[0] ?? "").join("").slice(0, 2).toUpperCase() || "?";
}

export function CourseCreatorsChart({ data }) {
  if (!data?.length) return <p className="chart-empty">ไม่มีข้อมูล</p>;
  const maxCount = Math.max(...data.map((c) => c.count), 1);
  return (
    <div className="creator-list">
      {data.map((item, i) => {
        const s = CREATOR_RANK_STYLES[i] ?? CREATOR_RANK_STYLES[3];
        const pct = Math.round((item.count / maxCount) * 100);
        return (
          <div key={item.name} className="creator-row">
            <div className="creator-rank-badge" style={{ background: s.rankBg, color: s.rankColor }}>{i + 1}</div>
            <div className="creator-avatar" style={{ background: s.avatarBg }}>{getInitials(item.name)}</div>
            <div className="creator-info">
              <div className="creator-name-row">
                <span className="creator-name">{item.name}</span>
                <span className="creator-count">{item.count} คอร์ส</span>
              </div>
              <div className="creator-bar-track">
                <div className="creator-bar-fill" style={{ width: `${pct}%` }} />
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Chart 3: Monthly Completions ──────────────────────────────────────────────
export function MonthlyCompletionsChart({ data }) {
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
export function CourseStatusChart({ data }) {
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
const RANK_STYLES = [
  { color: "#b45309", bg: "#fef9ee", border: "#fde68a", badge: "linear-gradient(135deg,#fbbf24,#f59e0b)" },
  { color: "#475569", bg: "#f8fafc", border: "#e2e8f0", badge: "linear-gradient(135deg,#e2e8f0,#cbd5e1)" },
  { color: "#b45309", bg: "#fff7f0", border: "#fed7aa", badge: "linear-gradient(135deg,#fb923c,#f97316)" },
  { color: "#1d4ed8", bg: "#eff6ff", border: "#bfdbfe", badge: "linear-gradient(135deg,#60a5fa,#3b82f6)" },
  { color: "#1d4ed8", bg: "#f0f7ff", border: "#bfdbfe", badge: "linear-gradient(135deg,#93c5fd,#60a5fa)" },
];

export function TopEnrollmentChart({ data }) {
  if (!data?.length) return <p className="chart-empty">ไม่มีข้อมูล</p>;
  const maxCount = Math.max(...data.map((e) => e.count), 1);
  return (
    <div className="top-enrollment-grid">
      {data.map((item, i) => {
        const s = RANK_STYLES[i] ?? RANK_STYLES[4];
        const pct = Math.round((item.count / maxCount) * 100);
        return (
          <div key={item.course} className="top-enrollment-card" style={{ background: s.bg, borderColor: s.border }}>
            <div className="top-enrollment-rank-badge" style={{ background: s.badge }}>#{i + 1}</div>
            <p className="top-enrollment-name">{item.course}</p>
            <p className="top-enrollment-count" style={{ color: s.color }}>{item.count}<span> คน</span></p>
            <div className="top-enrollment-bar-track">
              <div className="top-enrollment-bar-fill" style={{ width: `${pct}%`, background: s.badge }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Status badge ───────────────────────────────────────────────────────────────
const STATUS_MAP = {
  completed:   { label: "เสร็จสิ้น",   cls: "badge-completed" },
  in_progress: { label: "กำลังเรียน", cls: "badge-in-progress" },
  not_started: { label: "ยังไม่เริ่ม", cls: "badge-not-started" },
};
export function StatusBadge({ status }) {
  const { label, cls } = STATUS_MAP[status] ?? { label: status, cls: "" };
  return <span className={`status-badge ${cls}`}>{label}</span>;
}

export function formatDate(iso) {
  if (!iso) return "—";
  const d = new Date(iso);
  return isNaN(d) ? "—" : d.toLocaleString("th-TH", { dateStyle: "short", timeStyle: "short" });
}

// ── Instructor: Avg Time per Subtopic chart ─────────────────────────────────
export function SubtopicTimeChart({ data }) {
  const W = 600, BAR_H = 28, GAP = 10, ML = 140, MR = 60, MT = 10;
  const PW = W - ML - MR;
  if (!data?.length) return <p className="chart-empty">ไม่มีข้อมูล</p>;
  const H = MT + data.length * (BAR_H + GAP) - GAP + 10;
  const maxVal = Math.max(...data.map((d) => d.avgMinutes), 1);
  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%">
      {data.map((item, i) => {
        const y = MT + i * (BAR_H + GAP);
        const bw = (item.avgMinutes / maxVal) * PW;
        const pct = item.avgMinutes / maxVal;
        const fill = pct > 0.7 ? "#ef4444" : pct > 0.4 ? "#f59e0b" : "#1f8d4e";
        return (
          <g key={item.name}>
            <text x={ML - 8} y={y + BAR_H / 2 + 4} textAnchor="end" fontSize="11" fill="#1a2f57">{item.name}</text>
            <rect x={ML} y={y} width={bw} height={BAR_H} rx="6" fill={fill} opacity="0.85">
              <title>{item.name}: เฉลี่ย {item.avgMinutes} นาที ({item.learners} คน)</title>
            </rect>
            <text x={ML + bw + 6} y={y + BAR_H / 2 + 4} fontSize="11" fill="#45608f" fontWeight="600">{item.avgMinutes} นาที</text>
          </g>
        );
      })}
    </svg>
  );
}

// ── Exam: Domain Avg Score chart ─────────────────────────────────────────────
export function DomainScoreChart({ data }) {
  const W = 600, BAR_H = 28, GAP = 10, ML = 140, MR = 60, MT = 10;
  const PW = W - ML - MR;
  if (!data?.length) return <p className="chart-empty">ไม่มีข้อมูล</p>;
  const H = MT + data.length * (BAR_H + GAP) - GAP + 10;
  const maxVal = 100;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%">
      {data.map((item, i) => {
        const y = MT + i * (BAR_H + GAP);
        const bw = (item.avgScore / maxVal) * PW;
        const fill = item.avgScore >= 70 ? "#1f8d4e" : item.avgScore >= 40 ? "#f59e0b" : "#ef4444";
        return (
          <g key={item.domain}>
            <text x={ML - 8} y={y + BAR_H / 2 + 4} textAnchor="end" fontSize="11" fill="#1a2f57">{item.domain}</text>
            <rect x={ML} y={y} width={bw} height={BAR_H} rx="6" fill={fill} opacity="0.85">
              <title>{item.domain}: เฉลี่ย {item.avgScore}% ({item.total} คำตอบ)</title>
            </rect>
            <text x={ML + bw + 6} y={y + BAR_H / 2 + 4} fontSize="11" fill="#45608f" fontWeight="600">{item.avgScore}%</text>
          </g>
        );
      })}
    </svg>
  );
}
