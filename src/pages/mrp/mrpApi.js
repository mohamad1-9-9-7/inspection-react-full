// src/pages/mrp/mrpApi.js
//
// 🏭 وحدة التصنيع (MRP / BOM) — طبقة البيانات والحسابات.
// Manufacturing module data layer: items, BOMs, work orders, stock.
//
// التخزين على السيرفر (مصدر الحقيقة — لا تخزين محلي مستقل):
//   1) سجل إعدادات واحد     type = mrp_config      payload.reportDate = "config"
//      فيه: items · suppliers · operations · boms
//      يُحفظ بـ PUT /api/reports (upsert على type+reportDate) فيبقى سجل واحد.
//   2) أمر تصنيع لكل عملية   type = mrp_work_order  سجل مستقل لكل أمر
//   3) حركة مخزون يدوية      type = mrp_stock_move  سجل مستقل لكل حركة
//      (استلام/تسوية — أما الصرف والإنتاج فيُشتقّان من أوامر التصنيع)
//
// ⚠️ الأنواع متعددة السجلات تُحفظ بـ POST للجديد و PUT /api/reports/:id للقديم،
// لأن PUT العام يعمل upsert على (type, reportDate) فيدهس سجل اليوم نفسه.
//
// ⚠️⚠️ على السيرفر فهرس فريد على (type, payload->>'reportDate') لكل الأنواع.
// لذلك أوامر التصنيع وحركات المخزون تضع **مفتاحاً فريداً** في reportDate
// (رقم الأمر / معرّف الحركة) وتحفظ التاريخ الحقيقي في الحقل `date`.
// هذا بيسمح بعدة أوامر بنفس اليوم، وبيمنع تكرار رقم الأمر (409) بنفس الوقت.

import { useCallback, useEffect, useState } from "react";
import API_BASE from "../../config/api";

export const CONFIG_TYPE = "mrp_config";
export const WO_TYPE = "mrp_work_order";
export const MOVE_TYPE = "mrp_stock_move";

const CONFIG_KEY = "config";
const CACHE_KEY = "mrp_config_cache";   // كاش فقط لتسريع أول رسم
const EVT = "mrp_config_changed";

/* ══════════════ ثوابت ══════════════ */

export const UOMS = [
  { id: "KG", ar: "كجم", en: "Kg" },
  { id: "G", ar: "جرام", en: "Gram" },
  { id: "PCS", ar: "قطعة", en: "Piece" },
  { id: "BOX", ar: "كرتونة", en: "Box" },
  { id: "L", ar: "لتر", en: "Litre" },
  { id: "M", ar: "متر", en: "Metre" },
  { id: "HR", ar: "ساعة", en: "Hour" },
];

// أدوار الصنف داخل قوائم التفكيك/التقطيع — تعريف واحد يسهّل بناء الـ BOM.
// Raw = المادة الداخلة (ذبيحة) · Component = مكوّن/قطعة وسيطة
// · Finished = منتج ناتج نهائي · Waste = هدر/مخلّفات (عظم، دهن، فقد).
export const ITEM_TYPES = [
  { id: "raw", ar: "مادة خام (داخلة)", en: "Raw material (input)" },
  { id: "component", ar: "مكوّن / قطعة", en: "Component / cut" },
  { id: "finished", ar: "منتج نهائي (ناتج)", en: "Finished product (output)" },
  { id: "waste", ar: "هدر / مخلّفات", en: "Waste / scrap" },
];

export const WO_STATUS = [
  { id: "draft", ar: "مسودّة", en: "Draft", color: "#6b8299" },
  { id: "confirmed", ar: "قيد التصنيع", en: "In progress", color: "#b45309" },
  { id: "done", ar: "منتهي", en: "Done", color: "#047857" },
  { id: "cancelled", ar: "ملغى", en: "Cancelled", color: "#a12626" },
];

/* سياسة الاستهلاك — لما المستهلَك ≠ المخطّط عند إقفال أمر التصنيع. */
export const CONSUMPTION_POLICIES = [
  { id: "flexible", ar: "مرن", en: "Flexible",
    arSub: "اسمح بأي فرق بلا سؤال", enSub: "Allow any deviation silently" },
  { id: "warn", ar: "تحذير", en: "Warn",
    arSub: "اسأل قبل الإقفال إذا اختلف", enSub: "Ask before closing when it differs" },
  { id: "strict", ar: "صارم", en: "Strict",
    arSub: "امنع الإقفال إذا اختلف", enSub: "Block closing when it differs" },
];

/* نتيجة فحص الجودة على عملية. */
export const CHECK_RESULTS = [
  { id: "", ar: "—", en: "—" },
  { id: "pass", ar: "ناجح", en: "Pass", color: "#047857" },
  { id: "fail", ar: "راسب", en: "Fail", color: "#a12626" },
  { id: "na", ar: "لا ينطبق", en: "N/A", color: "#6b8299" },
];

export const num = (v, fallback = 0) => {
  const n = Number(String(v ?? "").replace(",", "."));
  return Number.isFinite(n) ? n : fallback;
};

export const money = (v, digits = 2) =>
  num(v).toLocaleString("en-US", { minimumFractionDigits: digits, maximumFractionDigits: digits });

export const nameOf = (x, isAr) => (isAr ? x?.ar : x?.en) || x?.ar || x?.en || "";

/** أدوار الصنف داخل الـBOM — مصفوفة (متوافقة مع `type` القديم كدور وحيد). */
export const rolesOf = (item) => {
  const r = Array.isArray(item?.roles) ? item.roles.filter(Boolean) : [];
  return r.length ? r : [item?.type || "raw"];
};
export const hasRole = (item, roleId) => rolesOf(item).includes(roleId);

export const freshId = (prefix) =>
  `${prefix}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 5)}`;

export const todayIso = () => new Date().toISOString().slice(0, 10);

function currentUser() {
  try {
    return JSON.parse(localStorage.getItem("currentUser") || "{}");
  } catch {
    return {};
  }
}
export const userName = () => currentUser().username || currentUser().name || "";

/* ══════════════ الإعدادات (items · suppliers · operations · boms) ══════════════ */

export function defaultConfig() {
  return {
    items: [],
    categories: [],        // فئات الأصناف (سجل الأصناف)
    bomCategories: [],      // فئات الوصفات (قوائم التقطيع) — مستقلّة عن فئات الأصناف
    suppliers: [],
    operations: [],
    boms: [],
    settings: {},          // إعدادات نظام الوحدة (مثال: تفعيل المسارات المتعددة)
    updatedAt: null,
    updatedBy: "",
  };
}

export function mergeConfig(saved) {
  const base = defaultConfig();
  if (!saved || typeof saved !== "object") return base;
  return {
    items: Array.isArray(saved.items) ? saved.items : base.items,
    categories: Array.isArray(saved.categories) ? saved.categories : base.categories,
    bomCategories: Array.isArray(saved.bomCategories) ? saved.bomCategories : base.bomCategories,
    suppliers: Array.isArray(saved.suppliers) ? saved.suppliers : base.suppliers,
    operations: Array.isArray(saved.operations) ? saved.operations : base.operations,
    boms: Array.isArray(saved.boms) ? saved.boms : base.boms,
    settings: (saved.settings && typeof saved.settings === "object") ? saved.settings : base.settings,
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

export async function fetchConfig() {
  const res = await fetch(
    `${API_BASE}/api/reports?type=${encodeURIComponent(CONFIG_TYPE)}&reportDate=${CONFIG_KEY}`,
    { headers: { Accept: "application/json" }, cache: "no-store" }
  );
  if (!res.ok) throw new Error(`Server ${res.status}`);
  const data = await res.json();
  const arr = rowsOf(data);
  const cfg = mergeConfig(arr[0]?.payload);
  writeCache(cfg);
  return cfg;
}

export async function saveConfig(cfg) {
  const payload = {
    ...cfg,
    reportDate: CONFIG_KEY,
    updatedAt: new Date().toISOString(),
    updatedBy: userName(),
  };
  const res = await fetch(`${API_BASE}/api/reports`, {
    method: "PUT",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({ reporter: userName() || "mrp", type: CONFIG_TYPE, payload }),
  });
  if (!res.ok) throw new Error(`Server ${res.status}: ${await res.text()}`);
  const saved = mergeConfig(payload);
  writeCache(saved);
  try { window.dispatchEvent(new CustomEvent(EVT, { detail: saved })); } catch { /* ignore */ }
  return saved;
}

/**
 * تعديل آمن للإعدادات عبر الأجهزة: **اقرأ آخر نسخة من السيرفر ثم عدّل ثم احفظ.**
 * هيك ما بيندهس تعديل جهاز تاني (مثلاً صنف أضافه غيرك) لأن كل عملية
 * بتنبني على أحدث حالة موجودة على السيرفر — مش على نسخة قديمة بالذاكرة.
 */
export async function mutateConfig(fn) {
  let base;
  try {
    base = await fetchConfig();               // حقيقة السيرفر
  } catch {
    base = readCache() || defaultConfig();    // بلا نت: أفضل ما عندنا
  }
  const next = JSON.parse(JSON.stringify(base));
  fn(next);
  return saveConfig(next);
}

/** أقل فاصل بين سحبتين ناتجتين عن الرجوع للتبويب — يمنع العاصفة عند التنقّل السريع. */
const FOCUS_REFETCH_MIN_MS = 60000;

/**
 * إعدادات التصنيع الحيّة — تبدأ من الكاش ثم تتحدّث من السيرفر.
 *
 * `refetchOnFocus`: تُترك مفعّلة لصفحات التحرير (سجل الأصناف · قوائم التقطيع)
 * حتى لا يُدهس تعديل جهاز آخر. أما الشاشات التي **تقرأ فقط** — كشك الجزار
 * والتقارير — فتمرّرها false: جهاز الكشك يُصغّر ويُفتح عشرات المرّات يومياً،
 * وكل مرّة كانت تعني سحب الإعدادات كاملة بلا فائدة.
 */
export function useMrpConfig({ refetchOnFocus = true } = {}) {
  const [cfg, setCfg] = useState(() => readCache() || defaultConfig());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const reload = useCallback(
    () =>
      fetchConfig()
        .then((c) => { setCfg(c); setError(""); return c; })
        .catch((e) => { setError(e?.message || "load failed"); return null; })
        .finally(() => setLoading(false)),
    []
  );

  useEffect(() => {
    let alive = true;
    let lastPull = 0;
    const pull = () => {
      lastPull = Date.now();
      return fetchConfig()
        .then((c) => { if (alive) { setCfg(c); setError(""); } })
        .catch((e) => { if (alive) setError(e?.message || "load failed"); })
        .finally(() => { if (alive) setLoading(false); });
    };

    pull();

    // نفس التبويب/الشاشة بعد الحفظ — بلا شبكة
    const onChange = (e) => { if (e?.detail) setCfg(e.detail); };
    // رجوع للتبويب → اسحب أحدث نسخة، لكن ليس أكثر من مرّة كل دقيقة
    const onFocus = () => {
      if (document.hidden) return;
      if (Date.now() - lastPull < FOCUS_REFETCH_MIN_MS) return;
      pull();
    };
    // تبويب آخر بنفس المتصفّح حدّث الكاش — قراءة محلية، بلا شبكة
    const onStorage = (e) => {
      if (e.key === CACHE_KEY) { const c = readCache(); if (c && alive) setCfg(c); }
    };

    window.addEventListener(EVT, onChange);
    window.addEventListener("storage", onStorage);
    if (refetchOnFocus) {
      window.addEventListener("focus", onFocus);
      document.addEventListener("visibilitychange", onFocus);
    }
    return () => {
      alive = false;
      window.removeEventListener(EVT, onChange);
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onFocus);
    };
  }, [refetchOnFocus]);

  return { cfg, setCfg, loading, error, reload };
}

/* ══════════════ سجلات متعددة (أوامر التصنيع · حركات المخزون) ══════════════ */

function rowsOf(data) {
  return (
    (Array.isArray(data) && data) ||
    (Array.isArray(data?.data) && data.data) ||
    (Array.isArray(data?.items) && data.items) ||
    (Array.isArray(data?.rows) && data.rows) ||
    []
  );
}

/** سجل السيرفر → كائن مسطّح مع _rid (معرّف السجل على السيرفر). */
const flatten = (r) => ({ ...(r.payload || {}), _rid: r.id ?? r._id ?? r.rid ?? null });

export async function fetchRecords(type) {
  const res = await fetch(`${API_BASE}/api/reports?type=${encodeURIComponent(type)}`, {
    headers: { Accept: "application/json" }, cache: "no-store",
  });
  if (!res.ok) throw new Error(`Server ${res.status}`);
  return rowsOf(await res.json()).map(flatten);
}

/**
 * حفظ سجل: POST للجديد و PUT /api/reports/:id للقديم.
 * لا تستعمل PUT العام هنا — بيدهس أي سجل بنفس (type, reportDate).
 */
export async function saveRecord(type, rec) {
  const payload = { ...rec, updatedAt: new Date().toISOString(), updatedBy: userName() };
  delete payload._rid;

  const isNew = !rec._rid;
  const url = isNew
    ? `${API_BASE}/api/reports`
    : `${API_BASE}/api/reports/${encodeURIComponent(rec._rid)}`;

  const res = await fetch(url, {
    method: isNew ? "POST" : "PUT",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({ reporter: userName() || "mrp", type, payload }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    const err = new Error(`Server ${res.status}: ${body}`);
    // الفهرس الفريد على (type, reportDate) — الرقم محجوز، جرّب رقماً غيره
    if (res.status === 409 || body.includes("DUPLICATE_REPORT_FOR_DATE")) err.code = "DUPLICATE";
    throw err;
  }

  const data = await res.json().catch(() => ({}));
  const rid = rec._rid || data?.report?.id || data?.data?.id || data?.id || null;
  return { ...payload, _rid: rid };
}

export async function deleteRecord(rid) {
  const res = await fetch(`${API_BASE}/api/reports/${encodeURIComponent(rid)}`, {
    method: "DELETE", headers: { Accept: "application/json" },
  });
  if (!res.ok) throw new Error(`Server ${res.status}`);
  return true;
}

/** قائمة سجلات حيّة لنوع معيّن. */
export function useRecords(type) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const reload = useCallback(() => {
    setLoading(true);
    return fetchRecords(type)
      .then((r) => { setRows(r); setError(""); return r; })
      .catch((e) => { setError(e?.message || "load failed"); return []; })
      .finally(() => setLoading(false));
  }, [type]);

  useEffect(() => { reload(); }, [reload]);

  return { rows, setRows, loading, error, reload };
}

/* ══════════════ مساعدات القراءة ══════════════ */

export const activeOnly = (list) => (list || []).filter((x) => x.active !== false);

export const itemById = (cfg, id) => (cfg?.items || []).find((x) => x.id === id) || null;
export const bomById = (cfg, id) => (cfg?.boms || []).find((x) => x.id === id) || null;
export const supplierById = (cfg, id) => (cfg?.suppliers || []).find((x) => x.id === id) || null;
export const categoryById = (cfg, id) => (cfg?.categories || []).find((x) => x.id === id) || null;
export const bomCategoryById = (cfg, id) => (cfg?.bomCategories || []).find((x) => x.id === id) || null;
export const opById = (cfg, id) => (cfg?.operations || []).find((x) => x.id === id) || null;

/** فئة الصنف كنص — من قائمة الفئات المُدارة، مع رجوع للنص القديم إن وُجد. */
export const categoryLabel = (cfg, item, isAr) => {
  const c = categoryById(cfg, item?.categoryId);
  return (c ? nameOf(c, isAr) : "") || item?.category || "";
};

/**
 * الاسم المعروض — يربط الكود بالاسم الإنجليزي مع وحدة القياس:
 *   [CODE] English name · UoM
 * يُحتسب تلقائياً كي يبقى الثلاثة متطابقين في كل مكان.
 */
export function displayNameOf(item) {
  if (!item) return "";
  const code = String(item.sku || "").trim();
  const name = String(item.en || item.ar || "").trim();
  const uom = String(item.uom || "").trim();
  const head = code ? (name ? `[${code}] ${name}` : `[${code}]`) : name;
  return uom ? `${head}${head ? " · " : ""}${uom}` : head;
}

/** قائمة المواد الفعّالة لمنتج — أول قائمة مفعّلة لهذا المنتج. */
export const bomForProduct = (cfg, productId) =>
  (cfg?.boms || []).find((b) => b.productId === productId && b.active !== false) || null;

/** قائمة تفكيك مفعّلة مادتها الداخلة هي هذا الصنف. */
export const disassemblyForInput = (cfg, itemId) =>
  (cfg?.boms || []).find(
    (b) => b.bomType === "disassembly" && b.inputId === itemId && b.active !== false
  ) || null;

/** كل مواضع استعمال الصنف داخل قوائم التفكيك — داخل/ناتج/هدر. */
export function whereUsedDisassembly(cfg, itemId) {
  return (cfg?.boms || []).filter(
    (b) =>
      b.bomType === "disassembly" &&
      (b.inputId === itemId ||
        (b.outputs || []).some((o) => o.itemId === itemId) ||
        (b.wastes || []).some((w) => w.itemId === itemId))
  );
}

/** عدد القوائم اللي بيظهر فيها الصنف — تفكيك + تصنيع (لعمود «مستعمل في»). */
export const usageCount = (cfg, itemId) =>
  whereUsedDisassembly(cfg, itemId).length + whereUsed(cfg, itemId).length;

export const itemLabel = (cfg, id, isAr) => {
  const it = itemById(cfg, id);
  if (!it) return id || "—";
  const n = nameOf(it, isAr) || it.sku || it.id;
  return it.sku ? `[${it.sku}] ${n}` : n;
};

/** كمية سطر بعد الهدر — لكل وحدة إنتاج واحدة من المنتج. */
export function lineQtyPerUnit(bom, line) {
  const per = num(line?.qty) / (num(bom?.qty, 1) || 1);
  return per * (1 + num(line?.scrapPct) / 100);
}

/** الكمية المطلوبة من سطر لإنتاج كمية معيّنة. */
export const lineQtyFor = (bom, line, produceQty) =>
  lineQtyPerUnit(bom, line) * num(produceQty, 0);

/**
 * تكلفة وحدة من صنف.
 * إذا كان له قائمة مواد مفعّلة تُحتسب من مكوّناته (متعدد المستويات)،
 * وإلا تُؤخذ تكلفته المعيارية. حارس ضد الدوران بمسار الزيارة.
 */
export function unitCost(cfg, itemId, seen = new Set()) {
  const item = itemById(cfg, itemId);
  if (!item) return 0;
  const bom = bomForProduct(cfg, itemId);
  if (!bom || seen.has(itemId) || item.costFromBom === false) return num(item.cost);
  const next = new Set(seen).add(itemId);
  const c = bomCost(cfg, bom, next);
  return c.unit || num(item.cost);
}

/** تكلفة قائمة مواد كاملة — مواد + تشغيل + تكاليف غير مباشرة. */
export function bomCost(cfg, bom, seen = new Set()) {
  if (!bom) return { material: 0, labor: 0, overhead: 0, total: 0, unit: 0, qty: 1 };

  const material = (bom.lines || []).reduce((s, l) => {
    const qty = num(l.qty) * (1 + num(l.scrapPct) / 100);
    return s + qty * unitCost(cfg, l.itemId, seen);
  }, 0);

  const labor = (bom.ops || []).reduce((s, o) => {
    const op = opById(cfg, o.opId);
    return s + (num(o.minutes) / 60) * num(o.costPerHour ?? op?.costPerHour);
  }, 0);

  const overhead = ((material + labor) * num(bom.overheadPct)) / 100;
  const total = material + labor + overhead;
  const qty = num(bom.qty, 1) || 1;

  return { material, labor, overhead, total, unit: total / qty, qty };
}

/**
 * تفكيك قائمة المواد لكل المستويات (Explosion).
 * يرجّع أسطراً مسطّحة فيها المستوى والكمية الكلية لإنتاج produceQty.
 */
export function explode(cfg, bom, produceQty = 1, level = 0, seen = new Set(), out = []) {
  if (!bom || level > 12) return out;
  (bom.lines || []).forEach((line) => {
    const qty = lineQtyFor(bom, line, produceQty);
    const child = itemById(cfg, line.itemId);
    const childBom = bomForProduct(cfg, line.itemId);
    const cyclic = seen.has(line.itemId);

    out.push({
      level,
      itemId: line.itemId,
      item: child,
      qty,
      uom: child?.uom || "",
      scrapPct: num(line.scrapPct),
      unitCost: unitCost(cfg, line.itemId),
      hasBom: !!childBom && !cyclic,
      cyclic,
      bomId: childBom?.id || "",
    });

    if (childBom && !cyclic) {
      explode(cfg, childBom, qty, level + 1, new Set(seen).add(line.itemId), out);
    }
  });
  return out;
}

/** المواد الخام النهائية فقط (أقل مستوى) — مجمّعة بالصنف. */
export function rawRequirements(cfg, bom, produceQty = 1) {
  const flat = explode(cfg, bom, produceQty);
  const map = new Map();
  flat
    .filter((r) => !r.hasBom)
    .forEach((r) => {
      const prev = map.get(r.itemId) || { ...r, qty: 0 };
      map.set(r.itemId, { ...prev, qty: prev.qty + r.qty });
    });
  return [...map.values()];
}

/**
 * أين يُستعمل هذا الصنف في قوائم **التصنيع** — مع حصّته من التكلفة.
 * (تقارير التكلفة بتعتمد عليها، فبتضل مقتصرة على قوائم التصنيع.)
 * لعدّ الاستعمال الكلي شامل التفكيك استعمل usageCount.
 */
export function whereUsed(cfg, itemId) {
  return (cfg?.boms || [])
    .filter((b) => b.bomType !== "disassembly" && (b.lines || []).some((l) => l.itemId === itemId))
    .map((b) => {
      const line = (b.lines || []).find((l) => l.itemId === itemId);
      const cost = bomCost(cfg, b);
      return {
        bom: b,
        product: itemById(cfg, b.productId),
        qtyPerUnit: lineQtyPerUnit(b, line),
        share: cost.total > 0
          ? ((num(line.qty) * (1 + num(line.scrapPct) / 100) * unitCost(cfg, itemId)) / cost.total) * 100
          : 0,
      };
    });
}

/** أثر تغيّر سعر مادة على تكاليف المنتجات — للتقارير. */
export function priceImpact(cfg, itemId, newCost) {
  const shadow = {
    ...cfg,
    items: (cfg.items || []).map((i) => (i.id === itemId ? { ...i, cost: num(newCost) } : i)),
  };
  return (cfg.boms || [])
    .filter((b) => explode(cfg, b, 1).some((r) => r.itemId === itemId))
    .map((b) => {
      const before = bomCost(cfg, b).unit;
      const after = bomCost(shadow, (shadow.boms || []).find((x) => x.id === b.id)).unit;
      return {
        bom: b,
        product: itemById(cfg, b.productId),
        before,
        after,
        diff: after - before,
        pct: before > 0 ? ((after - before) / before) * 100 : 0,
      };
    });
}

/* ══════════════ المخزون ══════════════ */

/**
 * الرصيد الحالي = رصيد افتتاحي + حركات يدوية
 *   + إنتاج أوامر التصنيع المنتهية − استهلاكها.
 * لا يوجد رصيد مخزّن قابل للانحراف — كله محسوب من الحركات.
 */
export function onHand(cfg, itemId, workOrders = [], moves = []) {
  const item = itemById(cfg, itemId);
  let qty = num(item?.openingQty);

  moves.forEach((m) => { if (m.itemId === itemId) qty += num(m.qty); });

  workOrders.forEach((wo) => {
    if (wo.status !== "done") return;
    if (wo.productId === itemId) qty += num(wo.qtyProduced);
    (wo.lines || []).forEach((l) => {
      if (l.itemId === itemId) qty -= num(l.qtyConsumed);
    });
    // المنتجات الثانوية تدخل المخزون كمان عند إقفال الأمر
    (wo.byproducts || []).forEach((b) => {
      if (b.itemId === itemId) qty += num(b.qtyProduced);
    });
  });

  return qty;
}

/** أصناف تحت حد إعادة الطلب. */
export function reorderAlerts(cfg, workOrders = [], moves = []) {
  return activeOnly(cfg?.items)
    .map((it) => ({
      item: it,
      qty: onHand(cfg, it.id, workOrders, moves),
      reorder: num(it.reorderLevel),
    }))
    .filter((r) => r.reorder > 0 && r.qty <= r.reorder)
    .sort((a, b) => a.qty - a.reorder - (b.qty - b.reorder));
}

/* ══════════════ أوامر التصنيع ══════════════ */

/** رقم أمر تصنيع جديد — WO-000001 حسب الموجود. */
export function nextWoNo(workOrders) {
  const max = (workOrders || []).reduce((m, w) => {
    const n = parseInt(String(w.no || "").replace(/\D/g, ""), 10);
    return Number.isFinite(n) && n > m ? n : m;
  }, 0);
  return `WO-${String(max + 1).padStart(6, "0")}`;
}

/** أسطر أمر التصنيع من قائمة المواد — لقطة بالكمية والتكلفة وقت الفتح. */
export function woLinesFromBom(cfg, bom, qtyPlanned) {
  return (bom?.lines || []).map((l) => {
    const required = lineQtyFor(bom, l, qtyPlanned);
    return {
      itemId: l.itemId,
      qtyRequired: required,
      qtyConsumed: required,           // الخصم الآلي — قابل للتعديل قبل الإقفال
      unitCost: unitCost(cfg, l.itemId),
      scrapPct: num(l.scrapPct),
    };
  });
}

export function woOpsFromBom(cfg, bom, qtyPlanned) {
  const per = num(bom?.qty, 1) || 1;
  return (bom?.ops || []).map((o) => {
    const op = opById(cfg, o.opId);
    return {
      opId: o.opId,
      minutes: (num(o.minutes) / per) * num(qtyPlanned, 0),
      costPerHour: num(o.costPerHour ?? op?.costPerHour),
      // ورقة العمل تُنسخ للأمر، والفحوصات تبدأ بلا نتيجة
      instructions: o.instructions || "",
      checks: (o.checks || []).map((c) => ({ id: c.id, text: c.text, result: "" })),
    };
  });
}

/** لقطة المنتجات الثانوية من قائمة المواد لكمية معيّنة. */
export function woByproductsFromBom(cfg, bom, qtyPlanned) {
  const per = num(bom?.qty, 1) || 1;
  return (bom?.byproducts || []).map((b) => {
    const expected = (num(b.qty) / per) * num(qtyPlanned, 0);
    return { itemId: b.itemId, qtyExpected: expected, qtyProduced: expected };
  });
}

/** هل قائمة المواد سارية بهذا التاريخ؟ (تواريخ فارغة = بلا حدّ) */
export function isBomEffective(bom, dateIso) {
  if (!bom) return false;
  const d = dateIso || todayIso();
  if (bom.effectiveFrom && d < bom.effectiveFrom) return false;
  if (bom.effectiveTo && d > bom.effectiveTo) return false;
  return true;
}

/** انحرافات الاستهلاك في أمر تصنيع — الأسطر التي المستهلَك فيها ≠ المطلوب. */
export function consumptionDeviations(wo) {
  return (wo?.lines || []).filter(
    (l) => Math.abs(num(l.qtyConsumed) - num(l.qtyRequired)) > 1e-6
  );
}

/** فحوصات جودة راسبة في أمر تصنيع (عبر كل العمليات). */
export function failedChecks(wo) {
  const out = [];
  (wo?.ops || []).forEach((o) => {
    (o.checks || []).forEach((c) => { if (c.result === "fail") out.push({ op: o, check: c }); });
  });
  return out;
}

/** تكلفة أمر تصنيع فعلية. */
export function woCost(wo) {
  const material = (wo?.lines || []).reduce(
    (s, l) => s + num(l.qtyConsumed) * num(l.unitCost), 0
  );
  const labor = (wo?.ops || []).reduce(
    (s, o) => s + (num(o.minutes) / 60) * num(o.costPerHour), 0
  );
  const extra = (wo?.extraCosts || []).reduce((s, x) => s + num(x.amount), 0);
  const total = material + labor + extra;
  const produced = num(wo?.qtyProduced);
  return { material, labor, extra, total, unit: produced > 0 ? total / produced : 0 };
}

/** التكلفة التقديرية من قائمة المواد لنفس الكمية. */
export function woPlannedCost(cfg, wo) {
  const bom = bomById(cfg, wo?.bomId);
  if (!bom) return { total: 0, unit: 0 };
  const c = bomCost(cfg, bom);
  const qty = num(wo?.qtyPlanned);
  return { total: c.unit * qty, unit: c.unit };
}
