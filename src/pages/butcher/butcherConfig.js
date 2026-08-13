// src/pages/butcher/butcherConfig.js
//
// إعدادات وحدة الجزار — المنتجات (الذبائح/القطع/الأجزاء)، الأكواد، النِّسب، الشروط.
// Butcher module configuration.
//
// التخزين على السيرفر (مصدر الحقيقة): سجل واحد فقط
//   type = butcher_config ، payload.reportDate = "config"
// نستعمل PUT /api/reports لأنه upsert على (type, reportDate) — فيبقى سجل واحد.
// الـ localStorage كاش فقط لتسريع أول رسم، وبيتحدّث من السيرفر دائماً.
//
// نموذج الأكواد والنِّسب:
//   codes: { "animalId:originId": "20035", ... }   ← الكود يعتمد على النوع أيضاً
//   refs:  { animalId: { min, max }, ... }         ← النسبة المرجعية لكل نوع
// السجلات القديمة (codes مسطّحة بالمنشأ فقط، و ref واحدة) تُهاجَر تلقائياً للخروف.

import { useEffect, useState } from "react";
import API_BASE from "../../config/api";
import { ANIMALS, CUTS, GRADES, ORIGIN_LIST, SHEEP_PIECES, codeKey } from "./butcherOptions";

export const CONFIG_TYPE = "butcher_config";
const CONFIG_KEY = "config";
const CACHE_KEY = "butcher_config_cache"; // cache only — never a standalone store
const EVT = "butcher_config_changed";

/* ── الشروط الافتراضية ── */
export const DEFAULT_RULES = {
  blockOverCarcass: true,   // منع الحفظ إذا تجاوز المجموع وزن الذبيحة
  toleranceKg: 0.05,        // سماحية التقريب
  warnOutOfRange: true,     // تحذير عند وزن ذبيحة خارج المدى
  requireBranch: true,      // إلزام اختيار الملحمة قبل الدخول
  deviationPct: 5,          // انحراف التصافي الذي يُعتبر ملفتاً (نقاط مئوية)
  deviationVsTarget: false, // قياس الانحراف مقابل النسبة المرجعية بدل متوسط الفترة
  requireWaste: false,      // إلزام إدخال الهدر (منع الصفر)
  allowBackdate: false,     // السماح بتسجيل تاريخ سابق
  lockAfterDays: 0,         // قفل السجلات الأقدم من (0 = بلا قفل)
  roundTo: 0,               // تقريب الأوزان: 0 = بلا تقريب، 0.01، 0.05، 0.1
  restrictButchers: false,  // قبول الأرقام الوظيفية المسجّلة فقط
  onScreenKeypad: true,     // لوحة أرقام على الشاشة (كشك بقفازات) بدل كيبورد الجهاز
};

/* ترويسة التقرير الرسمية (ISO) */
export const DEFAULT_REPORT = {
  companyEn: "",
  companyAr: "",
  docNo: "",
  revNo: "",
  issueDate: "",
  logoUrl: "",
  signatures: [
    { en: "Prepared by", ar: "أُعدّ بواسطة" },
    { en: "Reviewed by", ar: "روجع بواسطة" },
    { en: "Approved by", ar: "اعتُمد بواسطة" },
  ],
};

/** ترحيل عنصر قديم: codes مسطّحة + ref واحدة ⇦ كانت للخروف. */
function migrateItem(it) {
  const out = { ...it };
  const codes = { ...(it.codes || {}) };
  Object.keys(codes).forEach((k) => {
    if (!k.includes(":")) {                    // "australian" → "sheep:australian"
      const v = codes[k];
      delete codes[k];
      if (v && !codes[codeKey("sheep", k)]) codes[codeKey("sheep", k)] = v;
    }
  });
  out.codes = codes;

  const refs = { ...(it.refs || {}) };
  if (it.ref && Number.isFinite(it.ref.min) && !refs.sheep) refs.sheep = { ...it.ref };
  out.refs = refs;
  delete out.ref;
  return out;
}

/** الإعدادات الافتراضية مبنية من ثوابت butcherOptions. */
export function defaultConfig() {
  return {
    animals: ANIMALS.map((a) => ({
      id: a.id, ar: a.ar, en: a.en, min: a.min, max: a.max,
      origins: [...(a.origins || [])],
      enabled: true,
    })),
    origins: ORIGIN_LIST.map((o) => ({ id: o.id, ar: o.ar, en: o.en, enabled: true })),
    cuts: CUTS.map((c) => ({
      id: c.id, ar: c.ar, en: c.en,
      weightOnly: !!c.weightOnly,
      codes: { ...(c.codes || {}) },
      refs: JSON.parse(JSON.stringify(c.refs || {})),
      enabled: true,
      custom: false,
    })),
    pieces: SHEEP_PIECES.map((p) => ({
      id: p.id, ar: p.ar, en: p.en, art: p.art, whole: !!p.whole,
      codes: { ...(p.codes || {}) },
      refs: JSON.parse(JSON.stringify(p.refs || {})),
      enabled: true,
      custom: false,
    })),
    grades: GRADES.map((g) => ({ ...g, enabled: true })),
    butchers: [],                       // سجل الجزارين (رقم · اسم · ملحمة · نشط)
    report: JSON.parse(JSON.stringify(DEFAULT_REPORT)),
    rules: { ...DEFAULT_RULES },
    updatedAt: null,
    updatedBy: "",
  };
}

/** دمج المحفوظ فوق الافتراضي: التعديلات بالـ id، والعناصر الجديدة تُضاف. */
function mergeList(defaults, saved, migrate) {
  if (!Array.isArray(saved)) return defaults;
  const prep = (x) => (migrate ? migrateItem(x) : x);

  const out = defaults.map((d) => {
    const s = saved.find((x) => x && x.id === d.id);
    if (!s) return d;
    const m = prep(s);
    return {
      ...d, ...m,
      codes: { ...(d.codes || {}), ...(m.codes || {}) },
      refs: { ...(d.refs || {}), ...(m.refs || {}) },
    };
  });

  saved.forEach((s) => {
    if (s && s.id && !out.some((d) => d.id === s.id)) out.push({ ...prep(s), custom: true });
  });
  return out;
}

export function mergeConfig(saved) {
  const base = defaultConfig();
  if (!saved || typeof saved !== "object") return base;
  return {
    animals: mergeList(base.animals, saved.animals, false),
    origins: mergeList(base.origins, saved.origins, false),
    cuts: mergeList(base.cuts, saved.cuts, true),
    pieces: mergeList(base.pieces, saved.pieces, true),
    grades: mergeList(base.grades, saved.grades, false),
    butchers: Array.isArray(saved.butchers) ? saved.butchers : base.butchers,
    report: {
      ...base.report,
      ...(saved.report || {}),
      signatures: Array.isArray(saved.report?.signatures) && saved.report.signatures.length
        ? saved.report.signatures
        : base.report.signatures,
    },
    rules: { ...base.rules, ...(saved.rules || {}) },
    updatedAt: saved.updatedAt || null,
    updatedBy: saved.updatedBy || "",
  };
}

function readCache() {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    return raw ? mergeConfig(JSON.parse(raw)) : null;
  } catch {
    return null;
  }
}

function writeCache(cfg) {
  try { localStorage.setItem(CACHE_KEY, JSON.stringify(cfg)); } catch { /* ignore */ }
}

/** جلب الإعدادات من السيرفر. */
export async function fetchConfig() {
  const res = await fetch(
    `${API_BASE}/api/reports?type=${encodeURIComponent(CONFIG_TYPE)}&reportDate=${CONFIG_KEY}`,
    { headers: { Accept: "application/json" }, cache: "no-store" }
  );
  if (!res.ok) throw new Error(`Server ${res.status}`);
  const data = await res.json();
  const arr =
    (Array.isArray(data) && data) ||
    (Array.isArray(data?.data) && data.data) ||
    (Array.isArray(data?.items) && data.items) ||
    [];
  const cfg = mergeConfig(arr[0]?.payload);
  writeCache(cfg);
  return cfg;
}

/** حفظ الإعدادات (upsert على السيرفر). */
export async function saveConfig(cfg, user = "") {
  const payload = {
    ...cfg,
    reportDate: CONFIG_KEY,
    updatedAt: new Date().toISOString(),
    updatedBy: user || cfg.updatedBy || "",
  };
  const res = await fetch(`${API_BASE}/api/reports`, {
    method: "PUT",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({ reporter: user || "settings", type: CONFIG_TYPE, payload }),
  });
  if (!res.ok) throw new Error(`Server ${res.status}: ${await res.text()}`);
  const saved = mergeConfig(payload);
  writeCache(saved);
  try { window.dispatchEvent(new CustomEvent(EVT, { detail: saved })); } catch { /* ignore */ }
  return saved;
}

/**
 * إعدادات الجزار الحيّة.
 * يبدأ بالكاش (أو الافتراضي) ثم يحدّث من السيرفر — فلا تنتظر الشاشة الشبكة.
 */
export function useButcherConfig() {
  const [cfg, setCfg] = useState(() => readCache() || defaultConfig());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    fetchConfig()
      .then((c) => { if (alive) setCfg(c); })
      .catch(() => { /* الافتراضي/الكاش كافٍ */ })
      .finally(() => { if (alive) setLoading(false); });

    const onChange = (e) => { if (e?.detail) setCfg(e.detail); };
    window.addEventListener(EVT, onChange);
    return () => { alive = false; window.removeEventListener(EVT, onChange); };
  }, []);

  return { cfg, loading, setCfg };
}

/* ── مساعدات القراءة ── */

export const enabledOnly = (list) => (list || []).filter((x) => x.enabled !== false);

/** المناشئ المتاحة لنوع معيّن (حسب إعداد النوع، وإلا كل المفعّل). */
export function originsForAnimal(cfg, animalId) {
  const all = enabledOnly(cfg?.origins);
  const animal = (cfg?.animals || []).find((a) => a.id === animalId);
  const allowed = animal?.origins;
  if (!Array.isArray(allowed) || allowed.length === 0) return all;
  return all.filter((o) => allowed.includes(o.id));
}

/** الدرجات المتاحة لـ(نوع × منشأ) — فارغة تعني لا خطوة درجة. */
export const gradesFor = (cfg, animalId, originId) =>
  enabledOnly(cfg?.grades).filter(
    (g) => g.animal === animalId && g.origin === originId
  );

/** كود الصنف: الدرجة أولاً ثم (النوع × المنشأ) ثم المفتاح القديم. */
export const cfgCode = (item, animalId, originId, gradeId) =>
  (gradeId && item?.codes?.[codeKey(animalId, originId, gradeId)]) ||
  item?.codes?.[codeKey(animalId, originId)] ||
  item?.codes?.[originId] ||
  "";

/** النسبة المرجعية لعنصر حسب النوع (أو null). */
export function cfgRef(item, animalId) {
  const r = item?.refs?.[animalId] || (animalId === "sheep" ? item?.ref : null);
  return r && Number.isFinite(Number(r.min)) && Number.isFinite(Number(r.max))
    ? { min: Number(r.min), max: Number(r.max) }
    : null;
}

/** كل خيارات القطع للفلاتر/الأعمدة — قطع + أجزاء مفردة، بلا تكرار المعرّفات. */
export const cutOptions = (cfg) => {
  const cuts = enabledOnly(cfg?.cuts);
  const pieces = enabledOnly(cfg?.pieces).filter(
    (p) => !p.whole && !cuts.some((c) => c.id === p.id)
  );
  return [...cuts, ...pieces];
};

/** جزّار مسجّل حسب رقمه الوظيفي (أو null). */
export const butcherByNo = (cfg, empNo) =>
  (cfg?.butchers || []).find(
    (b) => String(b.empNo || "").trim() === String(empNo || "").trim()
  ) || null;

/** اسم الجزار للعرض — الاسم المسجّل، وإلا الرقم نفسه. */
export function butcherLabel(cfg, empNo) {
  const b = butcherByNo(cfg, empNo);
  return b?.name ? `${b.name} (${empNo})` : String(empNo || "—");
}

/** ترتيب العناصر حسب حقل order (العناصر بلا ترتيب تبقى بمكانها). */
export const sortByOrder = (list) =>
  [...(list || [])].sort((a, b) => {
    const ao = Number.isFinite(a?.order) ? a.order : 9999;
    const bo = Number.isFinite(b?.order) ? b.order : 9999;
    return ao - bo;
  });

/** تقريب وزن حسب إعداد roundTo (0 = بلا تقريب). */
export function roundKg(value, roundTo) {
  const step = Number(roundTo) || 0;
  const v = Number(value) || 0;
  if (!step) return v;
  return Math.round(v / step) * step;
}

/** هل السجل مقفول للتعديل حسب lockAfterDays؟ */
export function isLocked(cfg, dayIso) {
  const days = Number(cfg?.rules?.lockAfterDays) || 0;
  if (!days || !dayIso) return false;
  const age = (Date.now() - new Date(`${dayIso}T00:00:00Z`).getTime()) / 86400000;
  return age > days;
}

/** بحث موحّد في القطع والأجزاء. */
export const cfgFind = (cfg, id) =>
  (cfg?.cuts || []).find((c) => c.id === id) ||
  (cfg?.pieces || []).find((p) => p.id === id) ||
  null;
