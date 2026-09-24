// src/pages/complaints/complaintsCore.js
// -----------------------------------------------------------------------------
// Shared constants, API calls, and utilities for the Quality Complaints module.
// -----------------------------------------------------------------------------

import { useCallback, useEffect, useState } from "react";
import { API_BASE } from "../../config/api";
import { isAllocatedRef } from "../../utils/reportRef";

export const REPORT_TYPE = "qa_complaint";
export const MAX_IMAGES = 12;
export const RECIPIENTS_KEY_PREFIX = "qaComplaints_recipients_v1:";

export const BRANCHES = [
  "QCS", "POS 6", "POS 7", "POS 10", "POS 11", "POS 14", "POS 15",
  "POS 16", "POS 17", "POS 18", "POS 19", "POS 21", "POS 24", "POS 25",
  "POS 26", "POS 31", "POS 34", "POS 35", "POS 36", "POS 37", "POS 38",
  "POS 41", "POS 42", "POS 43", "POS 44", "POS 45", "POS 47", "POS 48",
  "FTR 1", "FTR 2", "KMC", "KPS", "W K C",
];

export const TARGETS = [
  { id: "branch",   ar: "شكوى إلى فرع",   en: "Branch Complaint",   icon: "🏬", tone: "#0ea5e9" },
  { id: "supplier", ar: "شكوى إلى مورد",  en: "Supplier Complaint", icon: "🚚", tone: "#7c3aed" },
];
export const targetById = (id) => TARGETS.find((t) => t.id === id) || TARGETS[0];

/* Built-in reasons. Admin-added reasons live in a server config record
   (see useComplaintCategories) and are merged on top of these at runtime. */
export const CATEGORIES = [
  { id: "EXPIRED",       ar: "منتج منتهي الصلاحية", en: "Expired product",           icon: "⛔", tone: "#dc2626" },
  { id: "NEAR_EXPIRY",   ar: "قرب انتهاء الصلاحية", en: "Near expiry",                icon: "⏳", tone: "#f97316" },
  { id: "CRITICAL",      ar: "منتج حرج (خطر جودة)", en: "Critical quality risk",       icon: "☣️", tone: "#b91c1c" },
  { id: "DAMAGE",        ar: "تلف / كسر تغليف",     en: "Damage / broken packaging",  icon: "📦", tone: "#ea580c" },
  { id: "BAD_SMELL",     ar: "رائحة غير طبيعية",    en: "Off odour",                  icon: "🤢", tone: "#7c2d12" },
  { id: "TEMPERATURE",   ar: "خلل درجة حرارة",     en: "Temperature abuse",           icon: "🌡️", tone: "#0891b2" },
  { id: "WRONG_ITEM",    ar: "أصناف غير مطابقة",    en: "Wrong / mismatched items",   icon: "🔀", tone: "#7c3aed" },
  { id: "OVER_QUANTITY", ar: "كمية مرتجعة زائدة",   en: "Excess returned quantity",   icon: "📈", tone: "#0f766e" },
  { id: "REPEATED",      ar: "تكرار المخالفة",     en: "Repeated non-conformity",     icon: "🔁", tone: "#c026d3" },
  { id: "HYGIENE",       ar: "مخالفة صحّية / نظافة", en: "Hygiene / sanitation",       icon: "🧼", tone: "#0f766e" },
  { id: "DOCUMENT",      ar: "نقص وثائق / بيانات",  en: "Missing documents / data",   icon: "📄", tone: "#475569" },
  { id: "OTHER",         ar: "سبب آخر",           en: "Other",                      icon: "💬", tone: "#64748b" },
];

/* Runtime registry of admin-added reasons. Kept at module scope so the pure
   `catById` keeps resolving custom ids everywhere (card chips, filter, email)
   once any page has loaded the config. */
let EXTRA_CATEGORIES = [];
export const getAllCategories = () => [...CATEGORIES, ...EXTRA_CATEGORIES];
export const catById = (id) => getAllCategories().find((c) => c.id === id) || null;

/* Build a category object from a free-typed Arabic reason. */
export function makeCustomCategory(ar) {
  const label = String(ar || "").trim();
  const id = "CUSTOM_" + Date.now().toString(36) + Math.random().toString(36).slice(2, 5);
  return { id, ar: label, en: label, icon: "🏷️", tone: "#0ea5e9", custom: true };
}

export const SEVERITY = [
  { id: "LOW",    ar: "منخفضة", en: "Low",    icon: "🟢", tone: "#22c55e" },
  { id: "MEDIUM", ar: "متوسطة", en: "Medium", icon: "🟡", tone: "#f59e0b" },
  { id: "HIGH",   ar: "عالية",  en: "High",   icon: "🔴", tone: "#ef4444" },
];
export const sevById = (id) => SEVERITY.find((s) => s.id === id) || SEVERITY[1];

export const STATUSES = [
  { id: "DRAFT",        ar: "مسودّة",     en: "Draft",         tone: "#64748b" },
  { id: "SENT",         ar: "أُرسلت",     en: "Sent",          tone: "#2563eb" },
  { id: "ACKNOWLEDGED", ar: "أقرّ الطرف", en: "Acknowledged",  tone: "#0f766e" },
  { id: "CLOSED",       ar: "مغلقة",      en: "Closed",        tone: "#334155" },
];
export const statusById = (id) => STATUSES.find((s) => s.id === id) || STATUSES[0];

export const QTY_UNITS = ["KG", "PCS", "BOX", "PLATE", "Other"];

/* ═══════════════════════════ Helpers ═════════════════════════════ */

export function todayISO() { return new Date().toISOString().slice(0, 10); }

export function dmy(iso) {
  return /^\d{4}-\d{2}-\d{2}$/.test(String(iso || ""))
    ? String(iso).split("-").reverse().join("/")
    : (iso || "—");
}

export const splitEmails = (s) =>
  String(s || "").split(/[,;\s]+/).map((x) => x.trim()).filter(Boolean);

export const rememberRecipients = (key, list) => {
  try { localStorage.setItem(RECIPIENTS_KEY_PREFIX + key, JSON.stringify(list)); } catch {}
};

export const recallRecipients = (key) => {
  try { return JSON.parse(localStorage.getItem(RECIPIENTS_KEY_PREFIX + key) || "[]"); }
  catch { return []; }
};

export const emptyItem = () => ({
  itemCode: "", productName: "", quantity: "", qtyUnit: "KG",
  customQtyUnit: "", expiry: "", remarks: "",
});

export const emptyComplaint = () => ({
  target: "branch",
  complaintDate: todayISO(),
  branch: "",
  customBranch: "",
  supplier: "",
  categories: [],
  severity: "MEDIUM",
  status: "DRAFT",
  subject: "",
  description: "",
  items: [emptyItem()],
  images: [],
  recipients: "",
  cc: "",
  notes: "",
});

/* On-screen ref before the server backfill runs */
export const complaintDerivedRef = (p) => {
  const d = String(p?.complaintDate || "").slice(0, 10).replace(/-/g, "");
  const tag = p?.target === "supplier"
    ? String(p?.supplier || "SUP").replace(/\s+/g, "").slice(0, 6).toUpperCase()
    : String(p?.branch || "OTH").replace(/\s+/g, "").slice(0, 6).toUpperCase();
  return d ? `~CMP-${d}-${tag}` : "~CMP";
};

export const complaintFromRecord = (rec) => {
  const p = rec?.payload || rec || {};
  const stored = typeof p.refNo === "string" ? p.refNo.trim() : "";
  return {
    id: rec?.id ?? rec?._id ?? null,
    refNo: isAllocatedRef(stored) ? stored : complaintDerivedRef(p),
    reportDate: p.reportDate || "",
    createdAt: rec?.createdAt || p?._clientSavedAt || null,
    sentAt: p?.sentAt || null,
    target: p.target === "supplier" ? "supplier" : "branch",
    complaintDate: p.complaintDate
      || (typeof p.reportDate === "string" && /^\d{4}-\d{2}-\d{2}$/.test(p.reportDate) ? p.reportDate : "")
      || todayISO(),
    branch: p.branch || "",
    customBranch: p.customBranch || "",
    supplier: p.supplier || "",
    categories: Array.isArray(p.categories) ? p.categories : [],
    severity: p.severity || "MEDIUM",
    status: p.status || "DRAFT",
    subject: p.subject || "",
    description: p.description || "",
    items: Array.isArray(p.items) && p.items.length ? p.items : [emptyItem()],
    images: Array.isArray(p.images) ? p.images : [],
    recipients: p.recipients || "",
    cc: p.cc || "",
    notes: p.notes || "",
  };
};

export const targetLabelOf = (c) => {
  if (!c) return "—";
  if (c.target === "supplier") return c.supplier || "Supplier";
  return c.branch === "OTHER" ? (c.customBranch || "Other branch") : (c.branch || "—");
};

export const targetKeyOf = (c) => {
  if (!c) return "";
  if (c.target === "supplier") return `SUP::${c.supplier || ""}`;
  return `BR::${c.branch === "OTHER" ? c.customBranch : c.branch}`;
};

/* ═══════════════════════════ Server calls ═════════════════════════════ */

/* The server wraps every /api/reports response in `{ok, data|report, …}`.
   Unwrap here so the pages see the raw row/rows without knowing about the envelope. */
export async function apiListComplaints() {
  const url = `${API_BASE}/api/reports?type=${REPORT_TYPE}&limit=5000`;
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = await res.json();
  const rows = Array.isArray(data)
    ? data
    : (data?.data || data?.reports || data?.rows || data?.items || []);
  return rows.map(complaintFromRecord);
}

export async function apiGetComplaint(id) {
  const num = Number(id);
  if (!Number.isFinite(num) || num <= 0) throw new Error("Bad id");
  const res = await fetch(`${API_BASE}/api/reports/${num}`, { cache: "no-store" });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = await res.json();
  const rec = data?.report || data?.data || data;
  return complaintFromRecord(rec);
}

function makeUniqueReportDate(complaintDate) {
  const stamp = Date.now();
  const rand = Math.random().toString(36).slice(2, 8);
  return `CMP-${complaintDate}-${stamp}-${rand}`;
}

export async function apiCreateComplaint(payload) {
  const body = {
    reporter: "anonymous",
    type: REPORT_TYPE,
    payload: {
      ...payload,
      reportDate: makeUniqueReportDate(payload.complaintDate || todayISO()),
      _clientSavedAt: Date.now(),
    },
  };
  const res = await fetch(`${API_BASE}/api/reports`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const json = await res.json().catch(() => null);
  if (!res.ok || (json && json.ok === false)) {
    throw new Error(json?.error || json?.message || `Save failed (${res.status})`);
  }
  return complaintFromRecord(json?.report || json?.data || json || {});
}

export async function apiUpdateComplaint(id, payload) {
  const num = Number(id);
  if (!Number.isFinite(num) || num <= 0) throw new Error("Bad id");
  const body = {
    reporter: "anonymous",
    type: REPORT_TYPE,
    payload: {
      ...payload,
      reportDate: payload.reportDate || makeUniqueReportDate(payload.complaintDate || todayISO()),
      _clientSavedAt: Date.now(),
    },
  };
  const res = await fetch(`${API_BASE}/api/reports/${num}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const json = await res.json().catch(() => null);
  if (!res.ok || (json && json.ok === false)) {
    throw new Error(json?.error || json?.message || `Update failed (${res.status})`);
  }
  return complaintFromRecord(json?.report || json?.data || json || {});
}

export async function apiDeleteComplaint(id) {
  const num = Number(id);
  if (!Number.isFinite(num) || num <= 0) throw new Error("Bad id");
  const res = await fetch(`${API_BASE}/api/reports/${num}`, { method: "DELETE" });
  if (!res.ok && res.status !== 204) throw new Error(`Delete failed (${res.status})`);
  return true;
}

/* ═══════════════════════════ Suppliers (from server) ═════════════════════════════ */

const SUP_TYPES = ["supplier_performance", "qcs_supplier"];
export async function fetchSuppliers() {
  const names = new Map();
  const add = (raw) => {
    const s = String(raw || "").trim();
    if (!s) return;
    const k = s.toLowerCase();
    if (!names.has(k)) names.set(k, s);
  };
  await Promise.all(SUP_TYPES.map(async (t) => {
    try {
      const r = await fetch(`${API_BASE}/api/reports?type=${t}&limit=5000`, { cache: "no-store" });
      if (!r.ok) return;
      const j = await r.json().catch(() => null);
      const rows = Array.isArray(j) ? j : (j?.reports || j?.rows || j?.items || j?.data || []);
      if (t === "supplier_performance") {
        rows.forEach((rec) => {
          const sup = rec?.payload?.suppliers || {};
          Object.keys(sup).forEach(add);
        });
      } else if (t === "qcs_supplier") {
        rows.forEach((rec) => add(rec?.payload?.name));
      }
    } catch { /* ignore */ }
  }));
  return Array.from(names.values()).sort((a, b) => a.localeCompare(b, "ar"));
}

const SUPPLIERS_CACHE_KEY = "qaComplaints_suppliers_v1";
const SUPPLIERS_TTL_MS = 10 * 60 * 1000;
export function useSuppliers() {
  const [list, setList] = useState(() => {
    try {
      const raw = sessionStorage.getItem(SUPPLIERS_CACHE_KEY);
      if (raw) {
        const { at, items } = JSON.parse(raw);
        if (Date.now() - at < SUPPLIERS_TTL_MS && Array.isArray(items)) return items;
      }
    } catch {}
    return [];
  });

  useEffect(() => {
    let alive = true;
    (async () => {
      const items = await fetchSuppliers();
      if (!alive) return;
      setList(items);
      try {
        sessionStorage.setItem(SUPPLIERS_CACHE_KEY, JSON.stringify({ at: Date.now(), items }));
      } catch {}
    })();
    return () => { alive = false; };
  }, []);

  return list;
}

/* ═══════════════════════════ Reasons config (custom categories) ═══════════════════════════ */
/* One singleton record. `PUT /api/reports` upserts by (type, payload.reportDate),
   so a fixed reportDate key gives a single row with no duplicate risk. */
export const CONFIG_TYPE = "qa_complaint_config";
export const CONFIG_KEY = "qa_complaint_config";

export async function apiLoadComplaintConfig() {
  /* Read via the type listing, not `?reportDate=`: the server's BUSINESS_DATE
     truncates reportDate to 10 chars, so the non-date CONFIG_KEY never matches
     that query. It IS a singleton (PUT upserts one row), so take the row that
     actually carries the reasons. */
  try {
    const res = await fetch(`${API_BASE}/api/reports?type=${CONFIG_TYPE}&limit=50`, { cache: "no-store" });
    if (!res.ok) return EXTRA_CATEGORIES;
    const data = await res.json();
    const rows = Array.isArray(data)
      ? data
      : (data?.data || data?.reports || data?.rows || data?.items || []);
    let extra = [];
    for (const rec of rows) {
      const p = rec?.payload || rec || {};
      if (Array.isArray(p.extraCategories)) { extra = p.extraCategories; break; }
    }
    EXTRA_CATEGORIES = extra;
    return EXTRA_CATEGORIES;
  } catch {
    return EXTRA_CATEGORIES;
  }
}

export async function apiSaveComplaintConfig(extra) {
  const next = Array.isArray(extra) ? extra : [];
  const body = {
    reporter: "anonymous",
    type: CONFIG_TYPE,
    payload: { extraCategories: next, reportDate: CONFIG_KEY, _clientSavedAt: Date.now() },
  };
  const res = await fetch(`${API_BASE}/api/reports`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const json = await res.json().catch(() => null);
  if (!res.ok || (json && json.ok === false)) {
    throw new Error(json?.error || json?.message || `Save failed (${res.status})`);
  }
  EXTRA_CATEGORIES = next;
  return next;
}

/* Loads the merged reason list and lets a page add/remove custom reasons.
   Adds persist to the server and stay in the module registry so `catById`
   resolves them across every complaints screen. */
export function useComplaintCategories() {
  const [extra, setExtra] = useState(EXTRA_CATEGORIES);

  useEffect(() => {
    let alive = true;
    apiLoadComplaintConfig().then((list) => { if (alive) setExtra(list); }).catch(() => {});
    return () => { alive = false; };
  }, []);

  const addCategory = useCallback(async (cat) => {
    const prev = EXTRA_CATEGORIES;
    const next = [...prev, cat];
    setExtra(next);
    try {
      await apiSaveComplaintConfig(next);
    } catch (e) {
      setExtra(prev);
      EXTRA_CATEGORIES = prev;
      throw e;
    }
  }, []);

  const removeCategory = useCallback(async (id) => {
    const prev = EXTRA_CATEGORIES;
    const next = prev.filter((c) => c.id !== id);
    setExtra(next);
    try {
      await apiSaveComplaintConfig(next);
    } catch (e) {
      setExtra(prev);
      EXTRA_CATEGORIES = prev;
      throw e;
    }
  }, []);

  return { categories: [...CATEGORIES, ...extra], extra, addCategory, removeCategory };
}
