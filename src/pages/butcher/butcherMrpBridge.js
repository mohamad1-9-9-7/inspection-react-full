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

import { itemById, num } from "../mrp/mrpApi";

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

/** المسارات الفعّالة لوصفة — فاضية لو الوصفة مش متعددة المسارات. */
export const activePathwaysOf = (bom) =>
  bom?.multiPathways === true
    ? (bom?.pathways || []).filter((p) => p.active !== false)
    : [];

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
