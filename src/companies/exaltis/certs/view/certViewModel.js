// src/companies/exaltis/certs/view/certViewModel.js
// Certificates view — loading, status, sorting and CSV.
// (Split out of CertView.jsx — the code is unchanged.)

/* ========= API ========= */


/* Server report type */
export const TYPE = "sweets_training_certificate";

/* ========= Helpers ========= */
export async function jsonFetch(url, opts = {}) {
  // ندمج الهيدرز ونتأكد من Content-Type إذا في body
  const baseHeaders = { Accept: "application/json" };
  const userHeaders = opts.headers || {};
  const headers = { ...baseHeaders, ...userHeaders };

  const hasBody = opts.body !== undefined && opts.body !== null;
  const hasContentType = Object.keys(headers).some(
    (h) => h.toLowerCase() === "content-type"
  );

  if (hasBody && !hasContentType) {
    headers["Content-Type"] = "application/json";
  }

  const res = await fetch(url, {
    ...opts,
    headers,
  });

  let data = null;
  try {
    data = await res.json();
  } catch {
    data = null;
  }
  return { ok: res.ok, status: res.status, data };
}

/* الصور تُرفع على Cloudinary (نفس مسار صفحة الإدخال) — الضغط 1280px/جودة 80
   يتم على السيرفر، والسجل يحفظ الرابط فقط في imageUrl. */

// إرجاع لستة السجلات كما هي (مع id + payload)
export function extractReportsList(data) {
  let arr = [];
  if (Array.isArray(data)) arr = data;
  else if (Array.isArray(data?.items)) arr = data.items;
  else if (Array.isArray(data?.data?.items)) arr = data.data.items;
  else if (Array.isArray(data?.data)) arr = data.data;
  else if (Array.isArray(data?.results)) arr = data.results;
  else if (Array.isArray(data?.rows)) arr = data.rows;
  else if (Array.isArray(data?.list)) arr = data.list;
  return arr.filter((x) => (x?.type ? x.type === TYPE : true));
}

// جلب الـ id من السجل
export function getId(r) {
  return (
    r?.id ||
    r?._id ||
    r?.reportId ||
    r?.payload?.id ||
    r?.payload?._id ||
    undefined
  );
}

// أنواع الكورس
export const COURSE_OPTIONS = [
  { value: "", label: "-- Select Course Type --" },
  { value: "BFS", label: "Basic Food Safety (BFS)" },
  { value: "PIC", label: "Person In Charge (PIC)" },
  { value: "EFST", label: "EFST" },
  { value: "HACCP", label: "HACCP" },
  { value: "HALAL", label: "شهادة الحلال" },
  { value: "FIRST_AID", label: "الإسعافات الأولية" },
  { value: "EMERGENCY", label: "الطوارئ" },
  { value: "ISO22000_AUDIT", label: "التدقيق الداخلي ايزو 22000" },
  { value: "OTHER", label: "Other / Custom" },
];

/* ========= Status helpers (smart sort by expiry) ========= */
// عتبات الإنذار بالأيام
export const EXPIRING_SOON_DAYS = 30; // قريب جداً

export const EXPIRING_DAYS = 90;      // قريب

// تحويل تاريخ "YYYY-MM-DD" إلى Date في منتصف اليوم لتجنب فروقات التوقيت
export function parseDateOnly(s) {
  if (!s) return null;
  const str = String(s).slice(0, 10);
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(str);
  if (!m) {
    const d = new Date(str);
    return isNaN(d.getTime()) ? null : d;
  }
  const y = parseInt(m[1], 10);
  const mo = parseInt(m[2], 10) - 1;
  const da = parseInt(m[3], 10);
  return new Date(y, mo, da, 12, 0, 0, 0);
}

// عدد الأيام المتبقية لتاريخ الانتهاء (موجب = صالح، سالب = منتهي)
export function daysUntil(expiryDate) {
  const d = parseDateOnly(expiryDate);
  if (!d) return null;
  const today = new Date();
  today.setHours(12, 0, 0, 0);
  const diffMs = d.getTime() - today.getTime();
  return Math.round(diffMs / (1000 * 60 * 60 * 24));
}

// حالة الشهادة
export function getCertStatus(expiryDate) {
  const days = daysUntil(expiryDate);
  if (days === null) {
    return {
      key: "no_expiry",
      label: "No Expiry",
      days: null,
      bg: "linear-gradient(135deg,#9ca3af,#6b7280)",
      rowBg: "transparent",
      sortRank: 4,
    };
  }
  if (days < 0) {
    return {
      key: "expired",
      label: "Expired",
      days,
      bg: "linear-gradient(135deg,#ef4444,#b91c1c)",
      rowBg: "rgba(239,68,68,0.10)",
      sortRank: 0,
    };
  }
  if (days <= EXPIRING_SOON_DAYS) {
    return {
      key: "expiring_soon",
      label: "Expiring Soon",
      days,
      bg: "linear-gradient(135deg,#f97316,#c2410c)",
      rowBg: "rgba(249,115,22,0.10)",
      sortRank: 1,
    };
  }
  if (days <= EXPIRING_DAYS) {
    return {
      key: "expiring",
      label: "Expiring",
      days,
      bg: "linear-gradient(135deg,#facc15,#a16207)",
      rowBg: "rgba(250,204,21,0.10)",
      sortRank: 2,
    };
  }
  return {
    key: "valid",
    label: "Valid",
    days,
    bg: "linear-gradient(135deg,#22c55e,#15803d)",
    rowBg: "transparent",
    sortRank: 3,
  };
}

// خيارات الفرز
export const SORT_OPTIONS = [
  { value: "expiry_asc",  label: "Expiry: Soonest → Latest (Smart)" },
  { value: "expiry_desc", label: "Expiry: Latest → Soonest" },
  { value: "name_asc",    label: "Name (A → Z)" },
  { value: "name_desc",   label: "Name (Z → A)" },
  { value: "branch_asc",  label: "Branch (A → Z)" },
  { value: "saved_desc",  label: "Saved Date (Newest)" },
  { value: "saved_asc",   label: "Saved Date (Oldest)" },
];

// خيارات تصفية الحالة
export const STATUS_FILTERS = [
  { value: "all",           label: "All",            color: "#1d4ed8" },
  { value: "expired",       label: "Expired",        color: "#b91c1c" },
  { value: "expiring_soon", label: "≤ 30 Days",      color: "#c2410c" },
  { value: "expiring",      label: "≤ 90 Days",      color: "#a16207" },
  { value: "valid",         label: "Valid",          color: "#15803d" },
  { value: "no_expiry",     label: "No Expiry",      color: "#6b7280" },
  { value: "left_company",  label: "🚪 Left Company", color: "#7c2d12" },
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

export function downloadCSV(filename, rows) {
  const csv = rows.map((r) => r.map(csvEscape).join(",")).join("\r\n");
  const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
