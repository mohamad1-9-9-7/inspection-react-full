// src/companies/exaltis/reports/ncr/ncrModel.js
// Non-conformance entry — constants, evidence upload and loading.
// (Split out of NonConformanceReportInput.jsx — the code is unchanged.)
import API_BASE from "../../../../config/api";
import { getReportRowByDate, reportId, payloadOf, getReportById } from "../../../../pages/monitor/branches/_shared/reportApi";

/* =========================
   API base → src/config/api.js (one source of truth)
========================= */

export const IS_SAME_ORIGIN = (() => {
  try {
    return new URL(API_BASE).origin === window.location.origin;
  } catch {
    return false;
  }
})();

/* ---- Defaults ---- */
export const LOGO_FALLBACK = "data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==";

export const DEFAULT_TYPE = "sweets_non_conformance";

export const DEFAULT_REPORTER = "sweets";

export const DEFAULT_HEADER_LINE = "";

export const MAX_EVIDENCE_IMAGES = 10;

export const STATUSES = [
  { key: "Open",        en: "Open",        ar: "مفتوح",      color: "#dc2626" },
  { key: "In Progress", en: "In Progress", ar: "قيد التنفيذ", color: "#d97706" },
  { key: "Closed",      en: "Closed",      ar: "مغلق",       color: "#059669" },
];

export const SOURCES = [
  { key: "inhouseQC",         en: "In-house QC",       ar: "فحص جودة داخلي" },
  { key: "customerComplaint", en: "Customer Complaint", ar: "شكوى عميل" },
  { key: "internalAudit",     en: "Internal Audit",     ar: "تدقيق داخلي" },
  { key: "externalAudit",     en: "External Audit",     ar: "تدقيق خارجي" },
];

/* =========================
   Images API
========================= */
export async function uploadViaServer(file) {
  const fd = new FormData();
  fd.append("file", file);
  const res = await fetch(`${API_BASE}/api/images`, {
    method: "POST",
    body: fd,
    credentials: IS_SAME_ORIGIN ? "include" : "omit",
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.ok || !(data.optimized_url || data.url)) {
    throw new Error(data?.error || "Upload failed");
  }
  return data.optimized_url || data.url;
}

export async function deleteImage(url) {
  if (!url) return;
  const res = await fetch(`${API_BASE}/api/images?url=${encodeURIComponent(url)}`, {
    method: "DELETE",
    credentials: IS_SAME_ORIGIN ? "include" : "omit",
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data?.ok) throw new Error(data?.error || "Delete image failed");
}

/* =========================
   Server helpers (NC only)
========================= */
export async function fetchExistingNCByDate(dateStr, type) {
  const row = await getReportRowByDate(type || DEFAULT_TYPE, dateStr);
  return row ? { id: reportId(row), payload: payloadOf(row) } : null;
}

export async function fetchExistingNCById(id) {
  if (!id) return null;
  const row = await getReportById(id);
  return row ? { id: reportId(row) || id, payload: payloadOf(row) } : null;
}

export function todayDubaiISO() {
  try {
    return new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Dubai" });
  } catch {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  }
}

export function isISODate(value) {
  return /^\d{4}-\d{2}-\d{2}$/.test(String(value || ""));
}
