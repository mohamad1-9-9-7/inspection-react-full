// src/pages/haccp and iso/CustomerComplaints/customerComplaintShared.js
// What the complaints register, the form and the trend report share: the
// fixed lists, their labels and colours, and the date helpers. One source so
// the three screens never disagree.
//
// Record (reports.type = "customer_complaint", one row per complaint):
//   complaintDate · complaintNumber · complainant · channel · product · batch
//   type · severity · description · investigation · rootCause · capa
//   status · closureDate · closedBy · customerSatisfied
//   effectivenessVerified / …Date / …By / …Notes · images[] · pdfs[]
//   branch · contact · capaOwner · capaDue        ← added later, optional

export const TYPE = "customer_complaint";

export const TYPES = ["BPC", "Foreign", "Allergen", "Quality", "Packaging", "Service", "Other"];
export const SEVERITIES = ["Low", "Medium", "High", "Critical"];
export const STATUSES = ["Open", "Investigation", "Closed"];
export const CHANNELS = ["Phone", "WhatsApp", "Email", "Walk-in", "Website", "Delivery app", "Social media"];

/* haccpI18n keys of each stored value — the value itself stays English in the record. */
export const TYPE_KEY = {
  BPC: "ccTypeBPC", Foreign: "ccTypeForeign", Allergen: "ccTypeAllergen", Quality: "ccTypeQuality",
  Packaging: "ccTypePackaging", Service: "ccTypeService", Other: "ccTypeOther",
};
export const SEVERITY_KEY = { Low: "ccSeverityLow", Medium: "ccSeverityMed", High: "ccSeverityHigh", Critical: "ccSeverityCritical" };
export const STATUS_KEY = { Open: "ccStatusOpen", Investigation: "ccStatusInvestigation", Closed: "ccStatusClosed" };

/* pill tones of the page kit */
export const SEVERITY_TONE = { Low: "green", Medium: "amber", High: "amber", Critical: "red" };
export const STATUS_TONE = { Open: "amber", Investigation: "blue", Closed: "green" };
export const SEVERITY_RANK = { Critical: 0, High: 1, Medium: 2, Low: 3 };

/** An open complaint older than this many days counts as overdue. */
export const OVERDUE_DAYS = 14;

/* ── kept for the trend report ── */
export const SEVERITY_COLOR = {
  Low:      { bg: "#dcfce7", color: "#166534", border: "#86efac" },
  Medium:   { bg: "#fef9c3", color: "#854d0e", border: "#fde047" },
  High:     { bg: "#fed7aa", color: "#9a3412", border: "#fdba74" },
  Critical: { bg: "#fecaca", color: "#991b1b", border: "#fca5a5" },
};

export const STATUS_COLOR = {
  Open:          { bg: "#fed7aa", color: "#9a3412" },
  Investigation: { bg: "#fef3c7", color: "#854d0e" },
  Closed:        { bg: "#dcfce7", color: "#166534" },
};

export const TYPE_LABELS = {
  BPC: "BPC", Foreign: "Foreign", Allergen: "Allergen", Quality: "Quality",
  Packaging: "Packaging", Service: "Service", Other: "Other",
};

export const TYPE_COLORS = {
  BPC: "#dc2626", Foreign: "#ea580c", Allergen: "#d97706",
  Quality: "#0891b2", Packaging: "#7c3aed", Service: "#0284c7", Other: "#64748b",
};

export function safeDate(s) {
  if (!s) return null;
  const d = new Date(s);
  return isNaN(d.getTime()) ? null : d;
}

export function daysBetween(a, b) {
  const da = safeDate(a), db = safeDate(b);
  if (!da || !db) return null;
  const ms = db.getTime() - da.getTime();
  return Math.max(0, Math.round(ms / (1000 * 60 * 60 * 24)));
}

/** Days an open complaint has been waiting (null once it is closed). */
export function openDays(p, today) {
  if (!p || p.status === "Closed") return null;
  return daysBetween(p.complaintDate, today);
}

export const isOverdue = (p, today) => {
  const d = openDays(p, today);
  return d != null && d > OVERDUE_DAYS;
};

/** The next CC-<year>-#### after every number already used that year. */
export function nextComplaintNumber(records, year) {
  const re = new RegExp(`^CC-${year}-(\\d+)$`);
  let max = 0;
  for (const rec of Array.isArray(records) ? records : []) {
    const m = re.exec(String(rec?.payload?.complaintNumber || "").trim());
    if (m) max = Math.max(max, parseInt(m[1], 10) || 0);
  }
  return `CC-${year}-${String(max + 1).padStart(4, "0")}`;
}

/** Attachments of a record as { url, name, size } (old records may carry dataUrl). */
export function filesOf(list) {
  return (Array.isArray(list) ? list : [])
    .map((x, i) => {
      const url = x?.url || x?.dataUrl || "";
      return url ? { url, name: x.name || `File ${i + 1}`, size: x.size || 0 } : null;
    })
    .filter(Boolean);
}
