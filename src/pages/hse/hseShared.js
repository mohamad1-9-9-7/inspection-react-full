// src/pages/hse/hseShared.js
// عناصر مشتركة لصفحات HSE — ألوان، استايل، helpers، ثوابت

import React, { useState, useEffect, useCallback } from "react";
import API_BASE from "../../config/api";

/* ========== i18n (Bilingual EN / AR) ========== */
const LANG_KEY = "hse_lang";

export function useHSELang() {
  const [lang, setLang] = useState(() => {
    try { return localStorage.getItem(LANG_KEY) || "en"; } catch { return "en"; }
  });
  useEffect(() => {
    try { localStorage.setItem(LANG_KEY, lang); } catch {}
  }, [lang]);
  const dir = lang === "ar" ? "rtl" : "ltr";
  const toggle = useCallback(() => setLang((l) => (l === "ar" ? "en" : "ar")), []);
  // helper: pick from {ar, en} object, fallback to ar then key
  const pick = useCallback(
    (dict) => (dict && typeof dict === "object" ? (dict[lang] ?? dict.ar ?? "") : dict),
    [lang]
  );
  return { lang, setLang, toggle, dir, pick };
}

/** تبديل اللغة — زرّ موحّد لكل صفحات HSE */
export function HSELangToggle({ lang, toggle, style }) {
  return (
    <button
      type="button"
      onClick={toggle}
      style={{
        padding: "7px 14px",
        borderRadius: 999,
        border: "1px solid rgba(120, 53, 15, 0.30)",
        background: "linear-gradient(135deg, #fed7aa, #fef3c7)",
        color: "#7c2d12",
        fontWeight: 900,
        fontSize: 12,
        cursor: "pointer",
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        boxShadow: "0 4px 12px rgba(234,88,12,0.18)",
        whiteSpace: "nowrap",
        ...style,
      }}
      aria-label="Toggle language"
      title={lang === "ar" ? "Switch to English" : "التبديل للعربية"}
    >
      🌐 {lang === "ar" ? "EN" : "AR"}
    </button>
  );
}

export const HSE_COLORS = {
  bg: "linear-gradient(135deg, rgba(251,146,60,0.16), rgba(255,237,213,0.40))",
  primary: "#ea580c",
  primaryDark: "#9a3412",
  border: "rgba(120, 53, 15, 0.18)",
  textDark: "#1f0f00",
  cardBg: "rgba(255,255,255,0.94)",
  shadow: "0 12px 30px rgba(234, 88, 12, 0.12)",
  badge: "rgba(254, 215, 170, 0.80)",
};

/* Bilingual constants — keep English as the value; Arabic shown via lang toggle */
export const SITE_LOCATIONS = [
  { v: "QCS — Al Qusais Cold Storage",                  ar: "QCS — مستودع تبريد القصيص",            en: "QCS — Al Qusais Cold Storage" },
  { v: "Production / Processing Line",                  ar: "خط الإنتاج / التصنيع",                  en: "Production / Processing Line" },
  { v: "Receiving Bay — Air Cargo Reception",           ar: "منطقة الاستلام — شحن جوي",              en: "Receiving Bay — Air Cargo Reception" },
  { v: "Dispatch Bay",                                  ar: "منطقة الشحن (Dispatch Bay)",            en: "Dispatch Bay" },
  { v: "Frozen Room (-18°C)",                           ar: "غرفة التجميد (-18°م)",                   en: "Frozen Room (-18°C)" },
  { v: "Chiller Room (0 to +4°C)",                      ar: "غرفة التبريد (0 إلى +4°م)",             en: "Chiller Room (0 to +4°C)" },
  { v: "Distribution Fleet (Refrigerated trucks)",      ar: "أسطول التوزيع (شاحنات مبرّدة)",         en: "Distribution Fleet (Refrigerated trucks)" },
  { v: "Office / Admin Area",                           ar: "المكاتب / الإدارة",                      en: "Office / Admin Area" },
  { v: "Other",                                         ar: "أخرى",                                   en: "Other" },
];

export const MEAT_PRODUCT_TYPES = [
  { v: "Chilled Beef",      ar: "لحم بقري مبرّد",      en: "Chilled Beef" },
  { v: "Frozen Beef",       ar: "لحم بقري مجمّد",      en: "Frozen Beef" },
  { v: "Chilled Lamb",      ar: "لحم ضأن مبرّد",        en: "Chilled Lamb" },
  { v: "Frozen Lamb",       ar: "لحم ضأن مجمّد",        en: "Frozen Lamb" },
  { v: "Chilled Veal",      ar: "لحم عجل مبرّد",        en: "Chilled Veal" },
  { v: "Frozen Veal",       ar: "لحم عجل مجمّد",        en: "Frozen Veal" },
  { v: "Chilled Goat",      ar: "لحم ماعز مبرّد",       en: "Chilled Goat" },
  { v: "Frozen Goat",       ar: "لحم ماعز مجمّد",       en: "Frozen Goat" },
  { v: "Chicken Chilled",   ar: "دجاج مبرّد",            en: "Chicken (Chilled)" },
  { v: "Chicken Frozen",    ar: "دجاج مجمّد",            en: "Chicken (Frozen)" },
  { v: "Processed Meat",    ar: "لحم مُجهّز / مُتبّل",   en: "Processed / Marinated Meat" },
  { v: "Other",             ar: "أخرى",                  en: "Other" },
];

export const HAZARD_CATEGORIES = [
  { v: "biological",      ar: "بيولوجي — ميكروبي (Salmonella/E.coli/Listeria)", en: "Biological — Microbiological (Salmonella/E.coli/Listeria)" },
  { v: "chemical",        ar: "كيميائي — مواد تنظيف / غازات تبريد",                en: "Chemical — Cleaning chemicals / Refrigerant gas" },
  { v: "physical",        ar: "ميكانيكي — قطوع / انزلاق / سقوط / رافعات",         en: "Physical — Cuts / Slips / Falling objects / Forklift" },
  { v: "coldchain",       ar: "سلسلة التبريد — انحراف حرارة",                       en: "Cold-chain — Temperature deviation" },
  { v: "fire",            ar: "حريق / كهرباء",                                       en: "Fire / Electrical" },
  { v: "ergonomic",       ar: "إرغونومي — رفع يدوي / حركات متكررة",                en: "Ergonomic — Manual lifting / Repetitive motion" },
  { v: "cold",            ar: "تعرض للبرودة — غرف التجميد",                         en: "Cold exposure — Frozen rooms" },
  { v: "cross",           ar: "تلوث متبادل",                                          en: "Cross-contamination" },
  { v: "pest",            ar: "حشرات / قوارض",                                       en: "Pest / Rodent" },
  { v: "env",             ar: "بيئي — نفايات / مياه / انبعاثات",                    en: "Environmental — Waste / Effluent / Emissions" },
];

/** Helper: convert legacy array of strings or new array of {v,ar,en} into options */
export function toOptions(arr, lang) {
  return arr.map((x) => {
    if (typeof x === "string") return { value: x, label: x };
    return { value: x.v, label: x[lang] || x.en || x.v };
  });
}

/** Helper: localize a stored value back to display text */
export function localize(arr, value, lang) {
  if (!Array.isArray(arr)) return value;
  for (const x of arr) {
    if (typeof x === "string") { if (x === value) return x; continue; }
    if (x.v === value) return x[lang] || x.en || x.v;
  }
  return value;
}

export const todayISO = () => new Date().toISOString().slice(0, 10);
export const nowHHMM = () => {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
};

// Local storage helpers (kept for cache fallback only — server is primary)
const STORAGE_PREFIX = "hse_";

export function loadLocal(type) {
  try {
    const raw = localStorage.getItem(STORAGE_PREFIX + type);
    if (!raw) return [];
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

export function saveLocal(type, items) {
  try {
    localStorage.setItem(STORAGE_PREFIX + type, JSON.stringify(items || []));
  } catch (e) {
    console.warn("HSE saveLocal error:", e);
  }
}

export function appendLocal(type, item) {
  const arr = loadLocal(type);
  const newItem = {
    id: item.id || `${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    createdAt: item.createdAt || new Date().toISOString(),
    ...item,
  };
  arr.unshift(newItem);
  saveLocal(type, arr);
  return newItem;
}

export function deleteLocal(type, id) {
  const arr = loadLocal(type).filter((x) => x.id !== id);
  saveLocal(type, arr);
}

export function updateLocal(type, id, patch) {
  const arr = loadLocal(type).map((x) => (x.id === id ? { ...x, ...patch, updatedAt: new Date().toISOString() } : x));
  saveLocal(type, arr);
}

/* ============================================================
   SERVER API HELPERS — primary persistence for HSE records
   نفس باترن HACCP/ISO: type=hse_<sub_type>, payload=record
   ============================================================ */

/** Convert short HSE type → full server type with prefix (e.g. "incident_reports" → "hse_incident_reports") */
function fullType(t) {
  if (!t) return "hse_unknown";
  return t.startsWith("hse_") ? t : `hse_${t}`;
}

/** Flatten server record { id, type, reporter, payload } → { id, ...payload } for UI consumption */
function flattenRecord(rec) {
  if (!rec) return null;
  const p = rec.payload || rec.data?.payload || {};
  return {
    id: rec.id || rec._id || p.id,
    ...p,
    createdAt: p.createdAt || rec.createdAt,
    updatedAt: p.updatedAt || rec.updatedAt,
  };
}

/** Load all records of a given HSE type from server, with localStorage fallback on network failure. */
export async function apiList(type) {
  const ft = fullType(type);
  try {
    const res = await fetch(`${API_BASE}/api/reports?type=${encodeURIComponent(ft)}`, { cache: "no-store" });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = await res.json().catch(() => null);
    const arr = Array.isArray(json) ? json : json?.data || json?.items || [];
    const out = arr.map(flattenRecord).filter(Boolean);
    // Sort newest-first by createdAt
    out.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
    // Refresh local cache
    saveLocal(type, out);
    return out;
  } catch (e) {
    console.warn(`HSE apiList(${ft}) failed, using cache:`, e?.message || e);
    return loadLocal(type);
  }
}

/** Load a single record by id. */
export async function apiGet(id) {
  if (!id) return null;
  try {
    const res = await fetch(`${API_BASE}/api/reports/${encodeURIComponent(id)}`, { cache: "no-store" });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = await res.json().catch(() => null);
    return flattenRecord(json?.data || json);
  } catch (e) {
    console.warn(`HSE apiGet(${id}) failed:`, e?.message || e);
    return null;
  }
}

/** Create a new HSE record on the server. Returns the saved record (flattened). */
export async function apiSave(type, item, reporter = "HSE") {
  const ft = fullType(type);
  const payload = {
    ...item,
    createdAt: item.createdAt || new Date().toISOString(),
  };
  const res = await fetch(`${API_BASE}/api/reports`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ type: ft, reporter, payload }),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const json = await res.json().catch(() => null);
  return flattenRecord(json?.data || json) || { id: null, ...payload };
}

/** Update an existing HSE record. */
export async function apiUpdate(type, id, patch, reporter = "HSE") {
  const ft = fullType(type);
  // Fetch current record first to merge payload (server PUT replaces full payload)
  const current = await apiGet(id);
  const merged = {
    ...(current || {}),
    ...patch,
    updatedAt: new Date().toISOString(),
  };
  delete merged.id;
  const res = await fetch(`${API_BASE}/api/reports/${encodeURIComponent(id)}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ type: ft, reporter, payload: merged }),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const json = await res.json().catch(() => null);
  return flattenRecord(json?.data || json) || { id, ...merged };
}

/** Delete a HSE record. */
export async function apiDelete(id) {
  if (!id) return;
  const res = await fetch(`${API_BASE}/api/reports/${encodeURIComponent(id)}`, {
    method: "DELETE",
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
}

/** Upload an image/file via the server. Returns the public URL. */
export async function apiUploadFile(file) {
  if (!file) throw new Error("No file");
  const fd = new FormData();
  fd.append("file", file);
  const res = await fetch(`${API_BASE}/api/images`, { method: "POST", body: fd });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.ok || !(data.optimized_url || data.url)) {
    throw new Error(data?.error || `Upload failed (HTTP ${res.status})`);
  }
  return data.optimized_url || data.url;
}

/** Delete a previously uploaded image/file by URL. */
export async function apiDeleteFile(url) {
  if (!url) return;
  const res = await fetch(`${API_BASE}/api/images?url=${encodeURIComponent(url)}`, {
    method: "DELETE",
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data?.ok) throw new Error(data?.error || "Delete file failed");
}

/** React hook: load + auto-refresh a HSE list, with create/update/delete helpers. */
export function useHSEList(type) {
  const [items, setItems] = useState(() => loadLocal(type));
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const arr = await apiList(type);
      setItems(arr);
    } catch (e) {
      setError(e?.message || String(e));
      setItems(loadLocal(type));
    } finally {
      setLoading(false);
    }
  }, [type]);

  useEffect(() => { reload(); }, [reload]);

  const add = useCallback(async (item, reporter) => {
    const saved = await apiSave(type, item, reporter);
    await reload();
    return saved;
  }, [type, reload]);

  const update = useCallback(async (id, patch, reporter) => {
    const saved = await apiUpdate(type, id, patch, reporter);
    await reload();
    return saved;
  }, [type, reload]);

  const remove = useCallback(async (id) => {
    await apiDelete(id);
    await reload();
  }, [reload]);

  return { items, loading, error, reload, add, update, remove, setItems };
}

/* Severity × Likelihood (1-5 each) → 1-25 */
export function calcRiskScore(likelihood, severity) {
  const l = Number(likelihood) || 0;
  const s = Number(severity) || 0;
  return l * s;
}

export function riskLevelLabel(score, lang) {
  const l = lang === "en" ? "en" : "ar";
  if (score >= 20) return { level: l === "ar" ? "حرج" : "Critical", color: "#7f1d1d", bg: "#fee2e2" };
  if (score >= 13) return { level: l === "ar" ? "عالٍ" : "High", color: "#9a3412", bg: "#fed7aa" };
  if (score >= 6)  return { level: l === "ar" ? "متوسط" : "Medium", color: "#854d0e", bg: "#fef9c3" };
  if (score >= 1)  return { level: l === "ar" ? "منخفض" : "Low", color: "#166534", bg: "#dcfce7" };
  return { level: "—", color: "#475569", bg: "#f1f5f9" };
}

/* ============================================================
   MODERN STYLES — HSE module (rounded, soft shadows, focus rings)
   ============================================================ */

export const pageStyle = {
  minHeight: "100vh",
  padding: "24px 18px 80px",
  background:
    "radial-gradient(circle at 10% 0%, rgba(251,146,60,0.16) 0, rgba(255,255,255,0) 40%)," +
    "radial-gradient(circle at 90% 100%, rgba(245,158,11,0.12) 0, rgba(255,255,255,0) 50%)," +
    "linear-gradient(180deg, #fff7ed 0%, #fffaf3 100%)",
  fontFamily: 'Cairo, system-ui, -apple-system, "Segoe UI", sans-serif',
  color: HSE_COLORS.textDark,
};

export const containerStyle = { maxWidth: 1180, margin: "0 auto" };

export const headerBar = {
  display: "flex", alignItems: "center", justifyContent: "space-between",
  gap: 14, padding: "16px 22px", borderRadius: 20,
  background: "rgba(255,255,255,0.96)",
  border: "1px solid rgba(120, 53, 15, 0.10)",
  boxShadow: "0 14px 36px rgba(234,88,12,0.10)",
  marginBottom: 18, flexWrap: "wrap",
  backdropFilter: "blur(6px)",
};

export const buttonPrimary = {
  padding: "10px 20px", borderRadius: 999,
  background: "linear-gradient(135deg, #f97316, #ea580c)",
  color: "#fff", border: "1px solid rgba(0,0,0,0)", cursor: "pointer",
  fontWeight: 800, fontSize: 13.5, letterSpacing: "0.01em",
  boxShadow: "0 8px 20px rgba(234,88,12,0.28)",
  transition: "transform .15s ease, box-shadow .15s ease, opacity .15s ease",
};

export const buttonGhost = {
  padding: "9px 16px", borderRadius: 999,
  background: "#fff",
  color: HSE_COLORS.primaryDark,
  border: "1px solid rgba(120, 53, 15, 0.16)",
  cursor: "pointer", fontWeight: 700, fontSize: 13,
  boxShadow: "0 2px 6px rgba(234,88,12,0.06)",
  transition: "background .15s, border-color .15s",
};

export const inputStyle = {
  width: "100%", padding: "11px 14px",
  borderRadius: 12, border: "1.5px solid #fed7aa",
  background: "#fffbf5", fontSize: 14, fontFamily: "inherit",
  color: HSE_COLORS.textDark,
  outline: "none",
  transition: "border-color .15s, box-shadow .15s, background .15s",
};

export const labelStyle = {
  display: "block", marginBottom: 6,
  fontSize: 12, fontWeight: 800, color: HSE_COLORS.primaryDark,
  letterSpacing: "0.02em",
};

export const cardStyle = {
  background: "#fff",
  border: "1px solid rgba(120, 53, 15, 0.10)",
  borderRadius: 18, padding: 22,
  boxShadow: "0 10px 30px rgba(234,88,12,0.08)",
};

/* ===== Modern table (alternating rows, hover highlight, no harsh borders) ===== */
export const tableStyle = {
  width: "100%", borderCollapse: "separate", borderSpacing: 0,
  background: "#fff",
  borderRadius: 16, overflow: "hidden",
  boxShadow: "0 8px 24px rgba(234,88,12,0.08)",
  border: "1px solid rgba(120, 53, 15, 0.08)",
};

export const thStyle = {
  padding: "14px 16px", textAlign: "start",
  background: "linear-gradient(135deg, #fff7ed, #ffedd5)",
  color: HSE_COLORS.primaryDark,
  fontWeight: 900, fontSize: 12,
  letterSpacing: "0.06em",
  textTransform: "uppercase",
  borderBottom: "1px solid #fed7aa",
  whiteSpace: "nowrap",
};

export const tdStyle = {
  padding: "13px 16px",
  borderBottom: "1px solid #fef3c7",
  fontSize: 13.5,
  color: HSE_COLORS.textDark,
  verticalAlign: "middle",
};
