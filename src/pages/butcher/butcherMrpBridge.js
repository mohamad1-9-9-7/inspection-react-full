// src/pages/butcher/butcherMrpBridge.js
//
// 🌉 جسر الجزار ↔ التصنيع (MRP).
// Bridge between the butcher kiosk and the MRP item master / Cutting BOMs.
//
// الجزار ما عاد عنده شجرة منتجات خاصّة — مصدره صار **قوائم التقطيع (Cutting BOMs)**
// في وحدة الـMRP: كل قائمة تفكيك = وصفة (مادة خام داخلة → عدة منتجات نهائية + هدر).
// الجزار يختار الوصفة، يشوف المادة الخام، ويسجّل أوزان النواتج الفعلية.
//
// ⚠️ كل التعامل مع موديل الـMRP يمرّ من هنا فقط — لا يستورد ButcherLog داخليّة
// الـMRP مباشرة. مفتاح الربط بين العالمين: كود الصنف (item.sku).

import { bomKindById, bomOriginById, itemById, num } from "../mrp/mrpApi";

export { useMrpConfig } from "../mrp/mrpApi";

/** قوائم التقطيع الفعّالة (تفكيك: مادة خام → نواتج + هدر). */
export function activeCuttingBoms(mrpCfg) {
  return (mrpCfg?.boms || []).filter(
    (b) => b.bomType === "disassembly" && b.active !== false
  );
}

/** المادة الخام الداخلة لقائمة تقطيع — أو null. */
export const bomInputItem = (mrpCfg, bom) => itemById(mrpCfg, bom?.inputId);

/**
 * هل الوصفة تستعمل مسارات توزيع متعددة فعّالة؟
 * (مفتاح `multiPathways` على مستوى الوصفة + وجود مسار مفعّل واحد على الأقل.)
 */
export const bomIsMultiPath = (bom) =>
  bom?.multiPathways === true && (bom?.pathways || []).some((p) => p.active !== false);

/* ══════════════ النسبة المعيارية (Standard yield) ══════════════
   خاصية على مستوى الوصفة تُضبط من «التصنيع ← قوائم التقطيع». الجزار لا يراها
   إطلاقاً — الكشك يلتقطها بصمت داخل السجل، والمقارنة تُعرض بكرت المشرف فقط. */

/** هل الوصفة بتطلب تاريخ انتهاء المادة الخام؟ */
export const bomNeedsRawExpiry = (bom) => bom?.requireRawExpiry === true;

/** هل الوصفة مفعّل عليها فحص النسبة المعيارية؟ */
export const bomStdOn = (bom) => bom?.stdYield === true;

/** التسامح ± بالنقاط المئوية (صفر = تطابق تام). */
export const bomStdTol = (bom) => Math.abs(num(bom?.stdTolPct));

/** المسارات الفعّالة لوصفة — فاضية لو الوصفة مش متعددة المسارات. */
export const activePathwaysOf = (bom) =>
  bom?.multiPathways === true
    ? (bom?.pathways || []).filter((p) => p.active !== false)
    : [];

/**
 * المنشأ والنوع المعرَّفان على الوصفة — تعريفات المستخدم المحفوظة على السيرفر
 * ضمن إعدادات التصنيع. بيرجّعوا الكائن كامل (فيه ar/en) أو null.
 */
export const bomOriginOf = (mrpCfg, bom) => bomOriginById(mrpCfg, bom?.originId);
export const bomKindOf = (mrpCfg, bom) => bomKindById(mrpCfg, bom?.kindId);

/** نصوص المنشأ/النوع جاهزة للعرض بلغة الواجهة ("" إذا بلا تعريف). */
export function bomTags(mrpCfg, bom, isAr) {
  const label = (x) => (x ? (isAr ? x.ar : x.en) || x.ar || x.en || "" : "");
  return {
    origin: label(bomOriginOf(mrpCfg, bom)),
    kind: label(bomKindOf(mrpCfg, bom)),
  };
}

/** مُعرّف الفئة «بلا فئة» في شاشة الاختيار. */
export const UNCAT = "__uncat__";

/**
 * فئات الوصفات لشاشة اختيار الجزار — الفئات الفعّالة التي فيها وصفة واحدة على الأقل،
 * مع عدّاد، وعنصر «بلا فئة» إن وُجدت وصفات بلا فئة.
 */
export function bomCategoriesForPicker(mrpCfg) {
  const boms = activeCuttingBoms(mrpCfg);
  const cats = (mrpCfg?.bomCategories || []).filter((c) => c.active !== false);
  const list = cats
    .map((c) => ({ ...c, count: boms.filter((b) => b.categoryId === c.id).length }))
    .filter((c) => c.count > 0);
  const uncat = boms.filter(
    (b) => !b.categoryId || !cats.some((c) => c.id === b.categoryId)
  ).length;
  return { cats: list, uncat };
}

/* ══════════════ أبعاد التصفية قبل اختيار الوصفة ══════════════
   النوع 🐑 ← المنشأ 🌍 ← الفئة 🏷️ — ثلاثتها تعريفات يضيفها المستخدم من
   «التصنيع ← قوائم التقطيع» وتُحفظ على السيرفر. أي بُعد بلا تعريفات
   ترجع خياراته فاضية، فتتخطّاه شاشة الجزار وتبقى الرحلة القديمة كما هي. */

export const BOM_FACETS = {
  kind: {
    key: "bomKinds", field: "kindId", icon: "🐑",
    ar: "النوع", en: "Type", arNone: "بلا نوع", enNone: "No type",
  },
  origin: {
    key: "bomOrigins", field: "originId", icon: "🌍",
    ar: "المنشأ", en: "Origin", arNone: "بلا منشأ", enNone: "No origin",
  },
  category: {
    key: "bomCategories", field: "categoryId", icon: "🏷️",
    ar: "الفئة", en: "Category", arNone: "بلا فئة", enNone: "Uncategorized",
  },
};

/**
 * خيارات بُعد ضمن مجموعة وصفات: التعريفات الفعّالة اللي إلها وصفة واحدة
 * على الأقل (مع عدّاد)، وعدد الوصفات اللي بلا تعريف.
 * opts فاضية = ما في تعريفات لهالبُعد ⇒ الشاشة ما بتظهر.
 */
export function bomFacetOptions(mrpCfg, boms, dim) {
  const spec = BOM_FACETS[dim];
  const list = boms || [];
  const defs = (mrpCfg?.[spec.key] || []).filter((d) => d.active !== false);
  const opts = defs
    .map((d) => ({ ...d, count: list.filter((x) => x[spec.field] === d.id).length }))
    .filter((d) => d.count > 0);
  const none = list.filter(
    (x) => !x[spec.field] || !defs.some((d) => d.id === x[spec.field])
  ).length;
  return { opts, none };
}

/** تصفية وصفات ببُعد — فاضي/null = الكل ، UNCAT = بلا تعريف. */
export function filterBomsByFacet(mrpCfg, boms, dim, value) {
  const list = boms || [];
  if (!value) return list;
  const spec = BOM_FACETS[dim];
  const defs = mrpCfg?.[spec.key] || [];
  if (value === UNCAT) {
    return list.filter((x) => !x[spec.field] || !defs.some((d) => d.id === x[spec.field]));
  }
  return list.filter((x) => x[spec.field] === value);
}

/** اسم القيمة المختارة ببُعد — لشريط المسار أعلى الشاشة. */
export function facetValueName(mrpCfg, dim, value, isAr) {
  if (!value) return "";
  const spec = BOM_FACETS[dim];
  if (value === UNCAT) return isAr ? spec.arNone : spec.enNone;
  const d = (mrpCfg?.[spec.key] || []).find((x) => x.id === value);
  return d ? (isAr ? d.ar : d.en) || d.ar || d.en || d.id : "";
}

/** الوصفات ضمن فئة مختارة — null = الكل ، UNCAT = بلا فئة. */
export function bomsInCategory(mrpCfg, catId) {
  const boms = activeCuttingBoms(mrpCfg);
  if (!catId) return boms;
  if (catId === UNCAT) {
    const cats = mrpCfg?.bomCategories || [];
    return boms.filter((b) => !b.categoryId || !cats.some((c) => c.id === b.categoryId));
  }
  return boms.filter((b) => b.categoryId === catId);
}

/** الاسم المعروض لصنف: [SKU] الاسم — مع تفضيل لغة الواجهة. */
export function itemName(item, isAr) {
  if (!item) return "";
  const nm = (isAr ? item.ar : item.en) || item.ar || item.en || item.sku || item.id;
  return item.sku ? `[${item.sku}] ${nm}` : nm;
}

/**
 * أسطر قائمة (نواتج أو هدر) → عناصر جاهزة للعرض والوزن.
 * kind = "outputs" | "wastes". الأسطر بلا صنف معرّف تُهمَل.
 * targetQty = الوزن المستهدف من الوصفة (اختياري — قد يكون صفراً).
 */
export function bomLines(mrpCfg, bom, kind) {
  return (bom?.[kind] || [])
    .map((l) => {
      const it = itemById(mrpCfg, l.itemId);
      if (!it) return null;
      return {
        lineId: l.id,
        id: l.itemId,            // نستعمل معرّف الصنف مفتاحاً للوزن
        itemId: l.itemId,
        sku: it.sku || "",
        ar: it.ar || "",
        en: it.en || "",
        uom: it.uom || "",
        kind: kind === "wastes" ? "waste" : "product",
        targetQty: num(l.qty),
        required: l.required === true,   // منتج إلزامي — لازم الجزار يوزنه (Qty>0)
        // النسبة المعيارية من وزن الخام — تُنقل مع السطر لتُلتقط بالسجل، ولا
        // تُعرض أبداً بلوحة الجزار. مرجعها الوحيد كرت المشرف.
        stdPct: num(l.stdPct),
      };
    })
    .filter(Boolean);
}

/** كل أسطر الوصفة (نواتج + هدر) دفعة واحدة. */
export function bomAllLines(mrpCfg, bom) {
  return [...bomLines(mrpCfg, bom, "outputs"), ...bomLines(mrpCfg, bom, "wastes")];
}

/** بناء سطر عرض/وزن من معرّف صنف — للخانات الإضافية التي يضيفها الجزار يدوياً. */
export function toLine(mrpCfg, itemId, kind = "product") {
  const it = itemById(mrpCfg, itemId);
  if (!it) return null;
  return {
    lineId: `x_${itemId}`,
    id: itemId,
    itemId,
    sku: it.sku || "",
    ar: it.ar || "",
    en: it.en || "",
    uom: it.uom || "",
    kind,
    targetQty: 0,
    extra: true,
  };
}

/** معرّفات الأصناف المستعملة أصلاً بالوصفة (داخل + نواتج + هدر) — لمنع تكرارها عند إضافة خانة. */
export function bomUsedItemIds(bom) {
  const ids = new Set();
  if (bom?.inputId) ids.add(bom.inputId);
  (bom?.outputs || []).forEach((l) => l.itemId && ids.add(l.itemId));
  (bom?.wastes || []).forEach((l) => l.itemId && ids.add(l.itemId));
  return ids;
}

/** الأصناف المسموح إضافتها كخانة إضافية — منتجات نهائية/مكوّنات/هدر، عدا المستعملة أصلاً. */
export function extraItemChoices(mrpCfg, bom) {
  const used = bomUsedItemIds(bom);
  return (mrpCfg?.items || []).filter(
    (it) => it.active !== false && it.id !== bom?.inputId && !used.has(it.id)
  );
}
