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
//
// شجرة المنتج — من الجذر حتى المنتج النهائي:
//   animals (الذبيحة/المادة الخام) → origins → grades → cuts/pieces (القطع)
//     → products (المنتجات النهائية، كل منتج تابع لقطعة أم عبر parentId)
// كل مستوى قابل للإضافة والتعديل والحذف من لوحة الإعدادات، وكل عنصر له كود
// من قائمة الأصناف (items.json) ونسبة مرجعية من أمّه.

import { useEffect, useState } from "react";
import API_BASE from "../../config/api";
import {
  ANIMALS, CUTS, GRADES, ORIGIN_LIST, SHEEP_PIECES, codeKey, itemKind,
} from "./butcherOptions";

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
  requireKnownCode: false,  // منع حفظ الإعدادات إذا فيه كود خارج قائمة الأصناف
  uniqueTemplateNo: true,   // منع تكرار رقم وصفة التقطيع
  showActualPct: true,      // إظهار النسبة الفعلية تحت كل خانة (من وزن الأم)
};

/* أنواع الشروط المخصّصة التي يقدر المستخدم يضيفها */
export const CUSTOM_RULE_TYPES = ["toggle", "number", "text"];

/* ترويسة التقرير الرسمية (ISO) — فارغة عمداً، المستخدم بيدخل كل شي بنفسه */
export const DEFAULT_REPORT = {
  companyEn: "",
  companyAr: "",
  docNo: "",
  revNo: "",
  issueDate: "",
  logoUrl: "",
  signatures: [],   // تُضاف خانات التواقيع من تبويب «ترويسة التقرير»
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
      kind: itemKind(c),
      codes: { ...(c.codes || {}) },
      refs: JSON.parse(JSON.stringify(c.refs || {})),
      enabled: true,
      custom: false,
    })),
    pieces: SHEEP_PIECES.map((p) => ({
      id: p.id, ar: p.ar, en: p.en, art: p.art, whole: !!p.whole,
      kind: itemKind(p),
      codes: { ...(p.codes || {}) },
      refs: JSON.parse(JSON.stringify(p.refs || {})),
      enabled: true,
      custom: false,
    })),
    grades: GRADES.map((g) => ({ ...g, enabled: true })),
    products: [],                       // المنتجات النهائية (تابعة لقطعة عبر parentId)
    templates: [],                      // وصفات/قوالب التقطيع — لكل واحدة رقم فريد
    customRules: [],                    // شروط أضافها المستخدم
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
    // قوائم يملكها المستخدم بالكامل — لا افتراضيات تُدمج فوقها
    products: Array.isArray(saved.products) ? saved.products : base.products,
    templates: Array.isArray(saved.templates) ? saved.templates : base.templates,
    customRules: Array.isArray(saved.customRules) ? saved.customRules : base.customRules,
    butchers: Array.isArray(saved.butchers) ? saved.butchers : base.butchers,
    report: {
      ...base.report,
      ...(saved.report || {}),
      // قائمة يملكها المستخدم — الفراغ يعني «بلا خانات توقيع»، لا رجوع لافتراضي
      signatures: Array.isArray(saved.report?.signatures)
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

/** كود الصنف — كود واحد لكل عنصر (`code`).
    مفاتيح (النوع × المنشأ × الدرجة) القديمة تبقى كاحتياط لأي إعدادات محفوظة سابقاً. */
export const cfgCode = (item, animalId, originId, gradeId) =>
  String(item?.code || "").trim() ||
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

/** بحث موحّد في القطع والأجزاء والمنتجات النهائية. */
export const cfgFind = (cfg, id) =>
  (cfg?.cuts || []).find((c) => c.id === id) ||
  (cfg?.pieces || []).find((p) => p.id === id) ||
  (cfg?.products || []).find((p) => p.id === id) ||
  null;

/* ══════════ شجرة المنتج: الجذر → القطعة → المنتج النهائي ══════════ */

/** المنتجات النهائية التابعة لقطعة أم (مفعّلة فقط)، مرتّبة. */
export function productsOf(cfg, parentId, animalId) {
  return sortByOrder(
    enabledOnly(cfg?.products).filter(
      (p) =>
        p.parentId === parentId &&
        (!animalId || !p.animalId || p.animalId === animalId)
    )
  );
}

/** كل المنتجات النهائية لنوع ذبيحة — بأي قطعة أم. */
export const productsForAnimal = (cfg, animalId) =>
  sortByOrder(
    enabledOnly(cfg?.products).filter((p) => !p.animalId || p.animalId === animalId)
  );

/** العنصر الأم لمنتج نهائي (قطعة أو جزء) — أو null. */
export const parentOf = (cfg, product) =>
  product?.parentId ? cfgFind(cfg, product.parentId) : null;

/** القطع المتاحة كأمّ لمنتج نهائي — منتجات أساسية فقط (لا هدر ولا عظم). */
export const parentOptions = (cfg) => {
  const cuts = enabledOnly(cfg?.cuts).filter((c) => itemKind(c) === "product");
  const pieces = enabledOnly(cfg?.pieces).filter(
    (p) => !p.whole && itemKind(p) === "product" && !cuts.some((c) => c.id === p.id)
  );
  return [...cuts, ...pieces];
};

/** تصنيف سطر محفوظ داخل تقرير: الحقل المحفوظ أولاً، ثم إعداد العنصر، ثم الـ id.
    لازم لأن القطع المخصّصة معرّفاتها custom_xxx فلا يكفي فحص الـ id وحده. */
export function rowKind(row, cfg) {
  const k = row?.kind;
  if (k === "product" || k === "waste" || k === "bone") return k;
  const meta = cfgFind(cfg, row?.cutId);
  return meta ? itemKind(meta) : itemKind(String(row?.cutId || ""));
}

/** هل هذا السطر هدر/عظم (لا منتجاً)؟ */
export const isRowSpecial = (row, cfg) => rowKind(row, cfg) !== "product";

/** تقسيم قائمة إلى منتجات أساسية / هدر / عظم. */
export function splitByKind(list) {
  const out = { product: [], waste: [], bone: [] };
  (list || []).forEach((it) => { out[itemKind(it)]?.push(it); });
  return out;
}

/* ══════════ وصفات (قوالب) التقطيع ══════════ */

/** أرقام الوصفات المكرّرة — Set بالأرقام التي ظهرت أكثر من مرة. */
export function duplicateTemplateNos(templates) {
  const seen = new Map();
  (templates || []).forEach((x) => {
    const no = String(x?.no || "").trim().toUpperCase();
    if (!no) return;
    seen.set(no, (seen.get(no) || 0) + 1);
  });
  return new Set([...seen.entries()].filter(([, n]) => n > 1).map(([no]) => no));
}

/** هل رقم الوصفة محجوز من وصفة ثانية؟ (skipId = الوصفة التي نحرّرها) */
export function isTemplateNoTaken(templates, no, skipId) {
  const key = String(no || "").trim().toUpperCase();
  if (!key) return false;
  return (templates || []).some(
    (x) => x.id !== skipId && String(x?.no || "").trim().toUpperCase() === key
  );
}

/** اقتراح رقم وصفة جديد غير مستعمل — CUT-001 ، CUT-002 … */
export function suggestTemplateNo(templates, prefix = "CUT") {
  const used = new Set(
    (templates || []).map((x) => String(x?.no || "").trim().toUpperCase())
  );
  for (let i = 1; i < 1000; i += 1) {
    const candidate = `${prefix}-${String(i).padStart(3, "0")}`;
    if (!used.has(candidate)) return candidate;
  }
  return `${prefix}-${Date.now().toString(36).toUpperCase()}`;
}

/* ══════════ الصور والرسمات ══════════ */

/** صورة مرفوعة لعنصر (تسبق الرسمة المدمجة) — أو "" */
export const imageOf = (item) => String(item?.imageUrl || "").trim();

/** معرّف الرسمة المدمجة — "" يعني بلا رسمة (أُزيلت من الإعدادات). */
export function artOf(item) {
  if (!item) return "";
  if (item.art === "" || item.art === "none") return "";
  return item.art || item.id || "";
}

/* ══════════ الشروط المخصّصة ══════════ */

/** قيمة شرط مخصّص حسب معرّفه (أو القيمة الافتراضية). */
export function customRule(cfg, id, fallback = null) {
  const r = (cfg?.customRules || []).find((x) => x.id === id && x.enabled !== false);
  return r ? r.value : fallback;
}

/* ══════════ الأكواد مقابل قائمة الأصناف ══════════ */

/** كل الأكواد المستعملة في الإعدادات — للتحقق مقابل items.json. */
export function allConfigCodes(cfg) {
  const out = [];
  ["cuts", "pieces", "products"].forEach((listKey) => {
    (cfg?.[listKey] || []).forEach((it) => {
      const name = it.ar || it.en || it.id;
      const flat = String(it.code || "").trim();
      if (flat) out.push({ listKey, id: it.id, name, key: "code", code: flat });
      // مفاتيح قديمة (نوع×منشأ) — تُفحص كمان إن وُجدت
      Object.entries(it.codes || {}).forEach(([key, code]) => {
        const v = String(code || "").trim();
        if (v) out.push({ listKey, id: it.id, name, key, code: v });
      });
    });
  });
  return out;
}
