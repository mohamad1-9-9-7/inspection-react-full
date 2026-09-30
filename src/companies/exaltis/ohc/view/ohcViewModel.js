// src/companies/exaltis/ohc/view/ohcViewModel.js
// OHC view — loading, status, sorting and CSV.
// (Split out of OHCView.jsx — the code is unchanged.)

/* ========= API ========= */


export const TYPE = "sweets_ohc_certificate";

/* ضغط الصور */
// Resize/quality now happen server-side in POST /api/images.

export async function jsonFetch(url, opts = {}) {
  const res = await fetch(url, {
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    ...opts,
  });
  let data = null;
  try {
    data = await res.json();
  } catch {
    data = null;
  }
  return { ok: res.ok, status: res.status, data };
}

export const BRANCHES = ["Main Branch"];

/* ========= Utils ========= */
export function toIsoYMD(v) {
  const s = String(v || "").trim();
  if (!s) return "";
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s; // YYYY-MM-DD
  const isoTime = s.match(/^(\d{4})-(\d{2})-(\d{2})T/); // 2025-11-03T..
  if (isoTime) return `${isoTime[1]}-${isoTime[2]}-${isoTime[3]}`;
  const dmY = s.match(/^(\d{2})\/(\d{2})\/(\d{4})(?:\s+.*)?$/); // DD/MM/YYYY
  if (dmY) return `${dmY[3]}-${dmY[2]}-${dmY[1]}`;
  const yMdSlashes = s.match(/^(\d{4})\/(\d{2})\/(\d{2})$/); // YYYY/MM/DD
  if (yMdSlashes) return `${yMdSlashes[1]}-${yMdSlashes[2]}-${yMdSlashes[3]}`;
  return "";
}

// تحويل آمن لتاريخ منتصف اليوم
export function parseDateOnly(s) {
  const iso = toIsoYMD(s);
  if (!iso) return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!m) return null;
  return new Date(
    parseInt(m[1], 10),
    parseInt(m[2], 10) - 1,
    parseInt(m[3], 10),
    12,
    0,
    0,
    0
  );
}

// عدد الأيام حتى تاريخ الانتهاء (سالب = منتهي بالفعل، 0 = اليوم، موجب = صالح)
export function daysUntil(dateStr) {
  const d = parseDateOnly(dateStr);
  if (!d) return null;
  const today = new Date();
  today.setHours(12, 0, 0, 0);
  return Math.round((d.getTime() - today.getTime()) / 86400000);
}

/* ========= Status helpers (smart sort by expiry) ========= */
export const EXPIRING_SOON_DAYS = 30;

export const EXPIRING_DAYS = 90;

export function getCertStatus(expiryDate) {
  const days = daysUntil(expiryDate);
  if (days === null) {
    return {
      key: "no_expiry",
      label: "No Expiry",
      days: null,
      bg: "linear-gradient(135deg,#9ca3af,#6b7280)",
      rowBg: "transparent",
    };
  }
  if (days < 0) {
    return {
      key: "expired",
      label: "Expired",
      days,
      bg: "linear-gradient(135deg,#ef4444,#b91c1c)",
      rowBg: "rgba(239,68,68,0.10)",
    };
  }
  if (days <= EXPIRING_SOON_DAYS) {
    return {
      key: "expiring_soon",
      label: "Expiring Soon",
      days,
      bg: "linear-gradient(135deg,#f97316,#c2410c)",
      rowBg: "rgba(249,115,22,0.10)",
    };
  }
  if (days <= EXPIRING_DAYS) {
    return {
      key: "expiring",
      label: "Expiring",
      days,
      bg: "linear-gradient(135deg,#facc15,#a16207)",
      rowBg: "rgba(250,204,21,0.10)",
    };
  }
  return {
    key: "valid",
    label: "Valid",
    days,
    bg: "linear-gradient(135deg,#22c55e,#15803d)",
    rowBg: "transparent",
  };
}

export const SORT_OPTIONS = [
  { value: "expiry_asc",  label: "Expiry: Soonest → Latest (Smart)" },
  { value: "expiry_desc", label: "Expiry: Latest → Soonest" },
  { value: "name_asc",    label: "Name (A → Z)" },
  { value: "name_desc",   label: "Name (Z → A)" },
  { value: "branch_asc",  label: "Branch (A → Z)" },
  { value: "appno_asc",   label: "Employee No (Asc)" },
  { value: "appno_desc",  label: "Employee No (Desc)" },
  { value: "job_asc",     label: "Occupation (A → Z)" },
  { value: "job_desc",    label: "Occupation (Z → A)" },
];

export const STATUS_FILTERS = [
  { value: "all",           label: "All",            color: "#1d4ed8" },
  { value: "expired",       label: "Expired",        color: "#b91c1c" },
  { value: "expiring_soon", label: "≤ 30 Days",      color: "#c2410c" },
  { value: "expiring",      label: "≤ 90 Days",      color: "#a16207" },
  { value: "valid",         label: "Valid",          color: "#15803d" },
  { value: "no_expiry",     label: "No Expiry",      color: "#6b7280" },
  { value: "outside_dubai", label: "📍 Outside Dubai", color: "#0369a1" },
  { value: "left_company",  label: "🚪 Left Company",  color: "#7c2d12" },
];

// HTML escape (للطباعة)
export function escapeHTML(v) {
  if (v === null || v === undefined) return "";
  return String(v)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

// CSV helpers
export function csvEscape(v) {
  if (v === null || v === undefined) return "";
  const s = String(v);
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

export function downloadCSV(filename, rowsArr) {
  const csv = rowsArr.map((r) => r.map(csvEscape).join(",")).join("\r\n");
  const blob = new Blob(["﻿" + csv], {
    type: "text/csv;charset=utf-8;",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export const getId = (r) =>
  r?.id ||
  r?._id ||
  r?.reportId ||
  r?.payload?.id ||
  r?.payload?._id ||
  r?.payload?.reportId;

/* server list -> flat rows (aligned with latest entry fields) */
export function extractReportsList(data) {
  let arr = [];
  if (Array.isArray(data)) arr = data;
  else if (Array.isArray(data?.items)) arr = data.items;
  else if (Array.isArray(data?.data?.items)) arr = data.data.items;
  else if (Array.isArray(data?.data)) arr = data.data;
  else if (Array.isArray(data?.results)) arr = data.results;
  else if (Array.isArray(data?.rows)) arr = data.rows;
  else if (Array.isArray(data?.list)) arr = data.list;

  arr = arr.filter((x) => (x?.type ? x.type === TYPE : true));

  return arr.map((x) => {
    const p = x.payload || {};
    const image = p.imageData || p.imageUrl || "";
    return {
      _server: {
        id: getId(x) || x?.id || x?._id,
        rawPayload: p,
      },
      appNo: p.appNo || "", // used as Employee Number
      name: p.name || "",
      nationality: p.nationality || "",
      job: p.job || "",
      issueDate: toIsoYMD(p.issueDate) || "",
      expiryDate: toIsoYMD(p.expiryDate) || "",
      result: p.result || "",
      branch: p.branch || "",
      // علامة "خارج دبي - معفى من OHC". موظف ممكن ينتقل للداخل لاحقاً.
      outsideDubai: p.outsideDubai === true,
      // علامة "ترك الشركة" - السجل محفوظ ومخفي من العرض الافتراضي
      leftCompany: p.leftCompany === true,
      image,
    };
  });
}
