// src/pages/hse/hseShared.js
// عناصر مشتركة لصفحات HSE — ألوان، استايل، helpers، ثوابت

import React, { useState, useEffect, useCallback } from "react";

/* ========== i18n (Bilingual EN / AR) ========== */
const LANG_KEY = "hse_lang";

export function useHSELang() {
  const [lang, setLang] = useState(() => {
    try { return localStorage.getItem(LANG_KEY) || "ar"; } catch { return "ar"; }
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

// Local storage helpers (used by HSE pages — works offline + syncs by type key)
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

/* Common page wrapper styles */
export const pageStyle = {
  minHeight: "100vh",
  padding: "20px 16px 60px",
  background: HSE_COLORS.bg + ", #fff7ed",
  fontFamily: "Cairo, system-ui, -apple-system, sans-serif",
  color: HSE_COLORS.textDark,
};

export const containerStyle = { maxWidth: 1100, margin: "0 auto" };

export const headerBar = {
  display: "flex", alignItems: "center", justifyContent: "space-between",
  gap: 12, padding: "12px 16px", borderRadius: 16,
  background: "rgba(255,255,255,0.92)",
  border: `1px solid ${HSE_COLORS.border}`,
  boxShadow: HSE_COLORS.shadow,
  marginBottom: 16, flexWrap: "wrap",
};

export const buttonPrimary = {
  padding: "10px 18px", borderRadius: 12,
  background: "linear-gradient(135deg, #f97316, #dc2626)",
  color: "#fff", border: "none", cursor: "pointer",
  fontWeight: 800, fontSize: 14,
  boxShadow: "0 8px 18px rgba(234,88,12,0.30)",
};

export const buttonGhost = {
  padding: "8px 14px", borderRadius: 10,
  background: "rgba(255,255,255,0.9)",
  color: HSE_COLORS.primaryDark,
  border: `1px solid ${HSE_COLORS.border}`,
  cursor: "pointer", fontWeight: 700, fontSize: 13,
};

export const inputStyle = {
  width: "100%", padding: "10px 12px",
  borderRadius: 10, border: `1px solid ${HSE_COLORS.border}`,
  background: "#fff", fontSize: 14, fontFamily: "inherit",
  outline: "none",
};

export const labelStyle = {
  display: "block", marginBottom: 6,
  fontSize: 13, fontWeight: 800, color: HSE_COLORS.primaryDark,
};

export const cardStyle = {
  background: HSE_COLORS.cardBg,
  border: `1px solid ${HSE_COLORS.border}`,
  borderRadius: 16, padding: 18,
  boxShadow: HSE_COLORS.shadow,
};

export const tableStyle = {
  width: "100%", borderCollapse: "collapse",
  background: "#fff", borderRadius: 12, overflow: "hidden",
  boxShadow: HSE_COLORS.shadow,
};

export const thStyle = {
  padding: "10px 12px", textAlign: "right",
  background: "linear-gradient(135deg, #fed7aa, #fef3c7)",
  color: HSE_COLORS.primaryDark, fontWeight: 900, fontSize: 13,
  borderBottom: `1px solid ${HSE_COLORS.border}`,
};

export const tdStyle = {
  padding: "9px 12px", borderBottom: "1px solid #fef3c7",
  fontSize: 13, color: HSE_COLORS.textDark,
};
