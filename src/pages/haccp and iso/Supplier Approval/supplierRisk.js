// Supplier risk classification → how often the supplier is re-evaluated.
//
// KEEP IN SYNC with D:\inspection-server\utils\supplierRisk.cjs — the server
// uses the same rule to raise "re-evaluation due" alerts.
//
// Base risk comes from what the supplier delivers (food is high, services /
// other low); the questionnaire result moves it one step: compliance below
// 60% → one level up, 90%+ → one level down. QA can override the level
// (payload.risk.level) with a reason; the override always wins.

export const RISK_LEVELS = ["low", "medium", "high"];

/** Months between evaluations per risk level. */
export const RISK_INTERVAL_MONTHS = { high: 6, medium: 12, low: 24 };

const TYPE_BASE = { food: 2, cleaning_chemicals: 1, packaging: 1, services: 0, other: 0 };

export const RISK_STYLE = {
  high: { bg: "#fee2e2", fg: "#991b1b", border: "#fca5a5" },
  medium: { bg: "#fef3c7", fg: "#92400e", border: "#fcd34d" },
  low: { bg: "#dcfce7", fg: "#166534", border: "#86efac" },
};

export const RISK_LABEL = {
  high: { en: "High risk", ar: "خطر عالٍ" },
  medium: { en: "Medium risk", ar: "خطر متوسط" },
  low: { en: "Low risk", ar: "خطر منخفض" },
};

/** YES out of answered (YES + NO); null when nothing was answered. */
export function compliancePctOf(counts) {
  const y = counts?.yesCount || 0;
  const n = counts?.noCount || 0;
  return y + n ? Math.round((y * 100) / (y + n)) : null;
}

/** The calculated level, before any QA override. */
export function computedRisk(supplierType, pct) {
  const st = String(supplierType || "").toLowerCase();
  // unknown type → treat as medium rather than guessing low
  let idx = st in TYPE_BASE ? TYPE_BASE[st] : 1;
  if (pct != null && pct < 60) idx += 1;
  else if (pct != null && pct >= 90) idx -= 1;
  return RISK_LEVELS[Math.min(2, Math.max(0, idx))];
}

/** { level, computed, overridden, reason, months } */
export function supplierRisk(payload, supplierType, pct) {
  const computed = computedRisk(supplierType, pct);
  const o = payload?.risk && typeof payload.risk === "object" ? payload.risk : null;
  const level = o && RISK_LEVELS.includes(o.level) ? o.level : computed;
  return {
    level,
    computed,
    overridden: !!o && RISK_LEVELS.includes(o.level) && o.level !== computed,
    reason: o?.reason || "",
    months: RISK_INTERVAL_MONTHS[level],
  };
}

/** Date the next evaluation is due (from the submission date), or null. */
export function nextEvaluationDate(submittedAt, months) {
  if (!submittedAt || !months) return null;
  const d = new Date(submittedAt);
  if (isNaN(d)) return null;
  d.setMonth(d.getMonth() + months);
  d.setHours(0, 0, 0, 0);
  return d;
}

/** Whole days from today until `date` (negative = overdue). */
export function daysUntil(date) {
  if (!date) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.round((date.getTime() - today.getTime()) / 864e5);
}
