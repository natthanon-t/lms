// ── Level system based on total score ─────────────────────────────────────────
// Thresholds are based on course completion + subtopic scores
export const LEVEL_DEFS = [
  { num: 1, min: 0,    label: "มือใหม่",       color: "#64748b", bg: "#f1f5f9" },
  { num: 2, min: 50,   label: "ผู้เรียน",      color: "#2f66da", bg: "#dbeafe" },
  { num: 3, min: 150,  label: "มีทักษะ",       color: "#059669", bg: "#d1fae5" },
  { num: 4, min: 350,  label: "ผู้เชี่ยวชาญ",  color: "#d97706", bg: "#fef3c7" },
  { num: 5, min: 700,  label: "ปรมาจารย์",     color: "#dc2626", bg: "#fee2e2" },
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
