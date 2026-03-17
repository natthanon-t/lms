// ── Level system based on total score ─────────────────────────────────────────
// Thresholds are based on course completion + subtopic scores
export const LEVEL_DEFS = [
  { num: 1,  min: 0,     label: "พลทหารเน็ตคาเฟ่",                   color: "#64748b", bg: "#f1f5f9" },
  { num: 2,  min: 100,    label: "อัศวินแป้นพิมพ์สีลอก",              color: "#2f66da", bg: "#dbeafe" },
  { num: 3,  min: 300,   label: "องครักษ์การ์ดจอออนบอร์ด",           color: "#059669", bg: "#d1fae5" },
  { num: 4,  min: 600,   label: "มือปราบปลั๊กหลุด",                  color: "#0891b2", bg: "#cffafe" },
  { num: 5,  min: 1000,   label: "พยัคฆ์ร้ายสาย LAN",                 color: "#7c3aed", bg: "#ede9fe" },
  { num: 6,  min: 1600,   label: "เทพเจ้าสแกนไวรัสด้วยตาเปล่า",      color: "#d97706", bg: "#fef3c7" },
  { num: 7,  min: 2400,  label: "มหาอุปราชฟอร์แมตโลก",              color: "#dc2626", bg: "#fee2e2" },
  { num: 8,  min: 3200,  label: "จอมมารบลูสกรีน",                    color: "#be123c", bg: "#ffe4e6" },
  { num: 9,  min: 4200,  label: "มหาเทพสงครามไร้สาย",               color: "#9333ea", bg: "#f3e8ff" },
  { num: 10, min: 5500,  label: "องค์สัมมาสัมพุทธเจ้า 4.0",         color: "#b45309", bg: "#fef9c3" },
];

export function getLevel(score) {
  for (let i = LEVEL_DEFS.length - 1; i >= 0; i--) {
    if (score >= LEVEL_DEFS[i].min) return LEVEL_DEFS[i];
  }
  return LEVEL_DEFS[0];
}

// Returns progress (0–1) towards the next level. Returns 1 at max level.
export function getLevelProgress(score) {
  const idx = LEVEL_DEFS.findLastIndex((l) => score >= l.min);
  if (idx === LEVEL_DEFS.length - 1) return 1;
  const curr = LEVEL_DEFS[idx];
  const next = LEVEL_DEFS[idx + 1];
  return Math.min(1, (score - curr.min) / (next.min - curr.min));
}

// Points needed to reach the next level. Returns null at max level.
export function pointsToNext(score) {
  const idx = LEVEL_DEFS.findLastIndex((l) => score >= l.min);
  if (idx === LEVEL_DEFS.length - 1) return null;
  return LEVEL_DEFS[idx + 1].min - score;
}
