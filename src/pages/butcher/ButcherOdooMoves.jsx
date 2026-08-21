// src/pages/butcher/ButcherOdooMoves.jsx
//
// 📦 حركات المنتج — عرض تقارير التقطيع بنفس شكل Odoo (Inventory ▸ Product Moves).
// Product Moves — the butcher cutting reports rendered exactly like an Odoo list view.
//
// كل عملية تقطيع تتفكّك لأسطر «حركة» على طريقة Odoo:
//   • سطر استهلاك واحد   : المادة الخام   المخزون ← الإنتاج (Virtual Locations/Production)
//   • أسطر إنتاج متعدّدة  : المنتجات والهدر  الإنتاج ← المخزون
//
// كل سطر يحمل المعطيات الـ١٣ المطلوبة:
//   ١ رمز العملية · ٢ تاريخ التقطيع · ٣ الموقع · ٤ القصاب · ٥ المسار والوصفة ·
//   ٦ استهلك/أنتج · ٧ نوع المنتج · ٨ المنتج · ٩ الكمية · ١٠ وحدة القياس ·
//   ١١ النسبة الفعلية · ١٢ الحالة · ١٣ تدققت من قبل
//
// والشكل يتبع Odoo حرفياً: شريط التطبيق البنفسجي · لوحة تحكّم ببحث وشرائح (facets) ·
// قوائم Filters / Group By / Favorites · مرقّم صفحات · مبدّل عروض (قائمة/محوري) ·
// جدول بصفوف مجموعات قابلة للطيّ وسطر مجاميع، ونافذة سجل بشكل استمارة Odoo.

import React, { useEffect, useMemo, useRef, useState } from "react";

/* ══════════════ أدوات ══════════════ */

const n2 = (v) =>
  Number(v || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const n0 = (v) => Number(v || 0).toLocaleString("en-US");
const pctOf = (part, whole) => (whole > 0 ? (part / whole) * 100 : 0);

/** كود موقع على شكل Odoo: «POS10/Stock» — المسافات تُزال مثل Odoo تماماً. */
const stockLoc = (code, isAr) =>
  `${String(code || "WH").replace(/\s+/g, "")}/${isAr ? "المخزون" : "Stock"}`;
const prodLoc = (isAr) => (isAr ? "مواقع افتراضية/الإنتاج" : "Virtual Locations/Production");

/* ══════════════ بناء الحركات ══════════════ */

/**
 * تفكيك الصفوف المُطبَّعة إلى أسطر حركة على طريقة Odoo.
 * يرجّع مصفوفة مسطّحة — كل عنصر = سطر واحد بالجدول.
 */
export function buildMoves(rows, { t, isAr }) {
  const L = {
    raw:     t({ en: "Raw material", ar: "مادة خام" }),
    product: t({ en: "Finished product", ar: "منتج نهائي" }),
    waste:   t({ en: "Waste", ar: "هدر" }),
    bone:    t({ en: "Bone", ar: "عظم" }),
    consume: t({ en: "Consumed", ar: "استُهلك" }),
    produce: t({ en: "Produced", ar: "أُنتج" }),
    done:    t({ en: "Done", ar: "مكتملة" }),
    waiting: t({ en: "Waiting", ar: "قيد المراجعة" }),
    cancel:  t({ en: "Cancelled", ar: "مرفوضة" }),
  };

  const out = [];
  let seq = 0;

  rows.forEach((r) => {
    const review = r.review || {};
    const state =
      r.reviewStatus === "approved" ? "done"
        : r.reviewStatus === "rejected" ? "cancel"
          : "waiting";

    // مشترك بين كل أسطر العملية الواحدة — الأعمدة ١..٥ و ١٢..١٣
    const base = {
      rowId: r.id,
      row: r,
      ref: r.opNo || "",                                   // ١ رمز العملية
      date: r.day,                                         // ٢ تاريخ التقطيع
      time: r.time || "",
      entryDay: r.entryDay && r.entryDay !== r.day ? r.entryDay : "",
      sortKey: `${r.day}T${r.time || "00:00"}`,
      branchName: r.branchName,                            // ٣ الموقع
      branchCode: r.branchCode,
      butcher: r.employeeNo,                               // ٤ القصاب
      butcherJob: r.payload?.butcherJob || "",
      bomRef: r.bomRef || "",                              // ٥ الوصفة والمسار
      bomCat: r.bomCatName || "",
      pathwayCode: r.pathwayCode || "",
      pathwayName: r.pathwayName || "",
      pathwayLabel: r.pathwayLabel || "",
      bomKey: `${r.bomRef || "~"}${r.pathwayCode ? `/${r.pathwayCode}` : ""}`,
      state,                                               // ١٢ الحالة
      stateLabel: L[state],
      locked: !!r.locked,
      checkedBy: review.by || "",                          // ١٣ تدققت من قبل
      checkedAt: review.at ? String(review.at).slice(0, 16).replace("T", " ") : "",
      reason: review.reason || "",
      baseKg: r.baseKg,
      unaccountedKg: r.unaccountedKg,
      yieldPct: r.yieldPct,
    };

    const inQty = r.carcassKg > 0 ? r.carcassKg : r.baseKg;

    // سطر الاستهلاك — المخزون ← الإنتاج
    out.push({
      ...base,
      id: `${r.id}::in`,
      seq: seq++,
      dir: "consume",                                      // ٦ استهلك / أنتج
      dirLabel: L.consume,
      kind: "raw",                                         // ٧ نوع المنتج
      kindLabel: L.raw,
      product: r.inputName,                                // ٨ المنتج
      productAlt: r.inputNameAlt || "",
      sku: r.inputSku || "",
      qty: inQty,                                          // ٩ الكمية
      uom: "KG",                                           // ١٠ وحدة القياس
      pctActual: inQty > 0 ? 100 : 0,                      // ١١ النسبة الفعلية
      targetKg: 0,
      deltaPct: null,
      pieceCount: r.pieceCount,
      from: stockLoc(r.branchCode, isAr),
      to: prodLoc(isAr),
    });

    // أسطر الإنتاج — الإنتاج ← المخزون
    r.cuts.forEach((c, i) => {
      const kind = c.isWaste ? (c.kind === "bone" ? "bone" : "waste") : "product";
      out.push({
        ...base,
        id: `${r.id}::${c.itemId || c.name}::${i}`,
        seq: seq++,
        dir: "produce",
        dirLabel: L.produce,
        kind,
        kindLabel: L[kind],
        product: c.name,
        productAlt: c.nameAlt || "",
        sku: c.sku || "",
        qty: c.weightKg,
        uom: c.uom || "KG",
        pctActual: pctOf(c.weightKg, r.baseKg),
        targetKg: c.targetKg || 0,
        deltaPct: c.deltaPct,
        pieceCount: null,
        from: prodLoc(isAr),
        to: stockLoc(r.branchCode, isAr),
      });
    });
  });

  return out;
}

/* ══════════════ الأعمدة — مصدر واحد للجدول والفرز والتصدير ══════════════ */

export const MOVE_COLS = [
  { id: "date",    ar: "التاريخ",        en: "Date",            sort: "sortKey",    w: 128 },
  { id: "ref",     ar: "رمز العملية",    en: "Reference",       sort: "ref",        w: 150 },
  { id: "loc",     ar: "الموقع",         en: "Location",        sort: "branchName", w: 150 },
  { id: "butcher", ar: "القصاب",         en: "Butcher",         sort: "butcher",    w: 168 },
  { id: "bom",     ar: "المسار والوصفة", en: "BOM · Pathway",   sort: "bomKey",     w: 176 },
  { id: "move",    ar: "الحركة",         en: "Move",            sort: "dir",        w: 226 },
  { id: "ptype",   ar: "نوع المنتج",     en: "Product Type",    sort: "kind",       w: 124 },
  { id: "product", ar: "المنتج",         en: "Product",         sort: "product",    w: 268 },
  { id: "qty",     ar: "الكمية",         en: "Quantity Done",   sort: "qty",        w: 120, num: true },
  { id: "uom",     ar: "وحدة القياس",    en: "Unit of Measure", sort: "uom",        w: 112 },
  { id: "pct",     ar: "النسبة الفعلية", en: "Actual %",        sort: "pctActual",  w: 124, num: true },
  { id: "state",   ar: "الحالة",         en: "Status",          sort: "state",      w: 120 },
  { id: "by",      ar: "تدققت من قبل",   en: "Checked By",      sort: "checkedBy",  w: 162 },
];

/**
 * أسطر الحركات → مصفوفة تصدير بنفس أعمدة الشاشة تماماً.
 * تُستعمل من الشاشة (زر التصدير) ومن تصدير Excel الكامل للصفحة — مصدر واحد.
 */
export function buildMovesAoa(moves, { isAr, cols = MOVE_COLS } = {}) {
  const L = (o) => (isAr ? o.ar : o.en);
  const cell = (m, c) => {
    switch (c.id) {
      case "date":    return m.date + (m.time ? ` ${m.time}` : "");
      case "ref":     return m.ref || "—";
      case "loc":     return `${m.branchName}${m.branchCode ? ` (${m.branchCode})` : ""}`;
      case "butcher": return m.butcher;
      case "bom":     return `${m.bomRef || "—"}${m.pathwayCode ? ` / ${m.pathwayCode}` : ""}`;
      case "move":    return `${m.dirLabel}: ${m.from} → ${m.to}`;
      case "ptype":   return m.kindLabel;
      case "product": return `${m.sku ? `[${m.sku}] ` : ""}${m.product}`;
      case "qty":     return Number(m.qty.toFixed(3));
      case "uom":     return m.uom;
      case "pct":     return Number(m.pctActual.toFixed(2));
      case "state":   return m.stateLabel;
      case "by":      return m.checkedBy || "—";
      default:        return "";
    }
  };
  return [cols.map(L), ...moves.map((m) => cols.map((c) => cell(m, c)))];
}

/** مستويات التجميع — نفس منطق «Group By» بأودو. */
const GROUPS = [
  { id: "date",    ar: "تاريخ التقطيع", en: "Cut date",     get: (m) => m.date || "—" },
  { id: "ref",     ar: "رمز العملية",   en: "Reference",    get: (m) => m.ref || "—" },
  { id: "branch",  ar: "الموقع",        en: "Location",     get: (m) => m.branchName || "—" },
  { id: "butcher", ar: "القصاب",        en: "Butcher",      get: (m) => m.butcher || "—" },
  { id: "bom",     ar: "الوصفة",        en: "BOM",          get: (m) => m.bomRef || "—" },
  { id: "pathway", ar: "المسار",        en: "Pathway",      get: (m) => m.pathwayLabel || "—" },
  { id: "dir",     ar: "نوع الحركة",    en: "Move type",    get: (m) => m.dirLabel },
  { id: "kind",    ar: "نوع المنتج",    en: "Product type", get: (m) => m.kindLabel },
  { id: "product", ar: "المنتج",        en: "Product",      get: (m) => m.product || "—" },
  { id: "state",   ar: "الحالة",        en: "Status",       get: (m) => m.stateLabel },
];

/** الفلاتر — داخل المجموعة «أو»، وبين المجموعات «و» (سلوك Odoo نفسه). */
const FILTERS = [
  { id: "f_consume", cat: "move",  ar: "استُهلك",         en: "Consumed",     test: (m) => m.dir === "consume" },
  { id: "f_produce", cat: "move",  ar: "أُنتج",           en: "Produced",     test: (m) => m.dir === "produce" },
  { sep: true },
  { id: "f_raw",     cat: "kind",  ar: "مادة خام",        en: "Raw material", test: (m) => m.kind === "raw" },
  { id: "f_fin",     cat: "kind",  ar: "منتج نهائي",      en: "Finished",     test: (m) => m.kind === "product" },
  { id: "f_waste",   cat: "kind",  ar: "هدر",             en: "Waste",        test: (m) => m.kind === "waste" },
  { id: "f_bone",    cat: "kind",  ar: "عظم",             en: "Bone",         test: (m) => m.kind === "bone" },
  { sep: true },
  { id: "f_done",    cat: "state", ar: "مكتملة",          en: "Done",         test: (m) => m.state === "done" },
  { id: "f_wait",    cat: "state", ar: "قيد المراجعة",    en: "Waiting",      test: (m) => m.state === "waiting" },
  { id: "f_cancel",  cat: "state", ar: "مرفوضة",          en: "Cancelled",    test: (m) => m.state === "cancel" },
  { sep: true },
  { id: "f_dev",     cat: "flag",  ar: "انحراف عن الهدف", en: "Off target",   test: (m) => m.deltaPct !== null && Math.abs(m.deltaPct) > 10 },
  { id: "f_noref",   cat: "flag",  ar: "بلا رقم عملية",   en: "No reference", test: (m) => !m.ref },
  { id: "f_path",    cat: "flag",  ar: "له مسار",         en: "Has pathway",  test: (m) => !!m.pathwayCode },
  { id: "f_unacc",   cat: "flag",  ar: "فاقد غير مسجّل",  en: "Unaccounted",  test: (m) => Math.abs(m.unaccountedKg) > 0.005 },
];

/** حقول البحث — كل حقل يصير شريحة بحث مستقلة مثل Odoo. */
const SEARCH_FIELDS = [
  { id: "any",     ar: "أي حقل",      en: "Anything",  get: (m) => `${m.ref} ${m.product} ${m.productAlt} ${m.sku} ${m.butcher} ${m.branchName} ${m.bomRef} ${m.pathwayLabel} ${m.date} ${m.checkedBy}` },
  { id: "product", ar: "المنتج",      en: "Product",   get: (m) => `${m.product} ${m.productAlt} ${m.sku}` },
  { id: "ref",     ar: "رمز العملية", en: "Reference", get: (m) => m.ref },
  { id: "butcher", ar: "القصاب",      en: "Butcher",   get: (m) => m.butcher },
  { id: "branch",  ar: "الموقع",      en: "Location",  get: (m) => `${m.branchName} ${m.branchCode}` },
];

/** مفضّلات جاهزة — بحث محفوظ بضغطة واحدة. */
const FAVORITES = [
  { id: "fav_out",   ar: "النواتج فقط",          en: "Outputs only",       filters: ["f_produce"], group: [] },
  { id: "fav_waste", ar: "الهدر والعظم",         en: "Waste & bone",       filters: ["f_waste", "f_bone"], group: ["product"] },
  { id: "fav_wait",  ar: "بانتظار المراجعة",     en: "Awaiting review",    filters: ["f_wait"], group: ["ref"] },
  { id: "fav_dev",   ar: "انحرافات عن الوصفة",   en: "Recipe deviations",  filters: ["f_dev"], group: ["product"] },
  { id: "fav_day",   ar: "تجميع حسب اليوم",      en: "By cut date",        filters: [], group: ["date"] },
  { id: "fav_who",   ar: "تجميع حسب القصاب",     en: "By butcher",         filters: [], group: ["butcher", "kind"] },
];

const PAGE_SIZES = [20, 80, 200, 500];

/* ══════════════ أيقونات Odoo ══════════════ */

const Ico = {
  Apps: () => (
    <svg viewBox="0 0 16 16" width="15" height="15" fill="currentColor" aria-hidden="true">
      {[0, 6, 12].map((y) => [0, 6, 12].map((x) => (
        <rect key={`${x}_${y}`} x={x} y={y} width="3.2" height="3.2" rx=".6" />
      )))}
    </svg>
  ),
  Caret: () => (
    <svg viewBox="0 0 10 6" width="9" height="6" fill="currentColor" aria-hidden="true">
      <path d="M0 0h10L5 6z" />
    </svg>
  ),
  Filter: () => (
    <svg viewBox="0 0 16 16" width="13" height="13" fill="currentColor" aria-hidden="true">
      <path d="M1 2h14l-5.4 6.4V14L6.4 12.4V8.4z" />
    </svg>
  ),
  Group: () => (
    <svg viewBox="0 0 16 16" width="13" height="13" fill="currentColor" aria-hidden="true">
      <rect x="1" y="2" width="14" height="2" rx="1" />
      <rect x="4" y="7" width="11" height="2" rx="1" />
      <rect x="7" y="12" width="8" height="2" rx="1" />
    </svg>
  ),
  Star: () => (
    <svg viewBox="0 0 16 16" width="13" height="13" fill="currentColor" aria-hidden="true">
      <path d="M8 1l2.1 4.3 4.7.7-3.4 3.3.8 4.7L8 11.8 3.8 14l.8-4.7L1.2 6l4.7-.7z" />
    </svg>
  ),
  Search: () => (
    <svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true">
      <circle cx="6.8" cy="6.8" r="4.6" /><path d="M10.4 10.4L14 14" strokeLinecap="round" />
    </svg>
  ),
  Down: () => (
    <svg viewBox="0 0 16 16" width="15" height="15" fill="currentColor" aria-hidden="true">
      <path d="M7 1h2v7.2l2.6-2.6 1.4 1.4L8 12 3 7l1.4-1.4L7 8.2z" /><rect x="2" y="13" width="12" height="2" rx="1" />
    </svg>
  ),
  List: () => (
    <svg viewBox="0 0 16 16" width="14" height="14" fill="currentColor" aria-hidden="true">
      <rect x="1" y="2" width="14" height="2" /><rect x="1" y="7" width="14" height="2" /><rect x="1" y="12" width="14" height="2" />
    </svg>
  ),
  Pivot: () => (
    <svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.4" aria-hidden="true">
      <rect x="1.5" y="1.5" width="13" height="13" /><path d="M1.5 6h13M6 6v8.5" />
    </svg>
  ),
  prev: (rtl) => (
    <svg viewBox="0 0 16 16" width="13" height="13" fill="currentColor" aria-hidden="true"
      style={{ transform: rtl ? "scaleX(-1)" : "none" }}>
      <path d="M10.5 1.6L4 8l6.5 6.4 1.4-1.4L6.9 8l5-4.9z" />
    </svg>
  ),
  next: (rtl) => (
    <svg viewBox="0 0 16 16" width="13" height="13" fill="currentColor" aria-hidden="true"
      style={{ transform: rtl ? "scaleX(-1)" : "none" }}>
      <path d="M5.5 1.6L12 8l-6.5 6.4-1.4-1.4L9.1 8l-5-4.9z" />
    </svg>
  ),
  Cols: () => (
    <svg viewBox="0 0 16 16" width="13" height="13" fill="currentColor" aria-hidden="true">
      <rect x="1" y="2" width="3" height="12" rx="1" /><rect x="6.5" y="2" width="3" height="12" rx="1" />
      <rect x="12" y="2" width="3" height="12" rx="1" />
    </svg>
  ),
  Close: () => (
    <svg viewBox="0 0 16 16" width="13" height="13" fill="currentColor" aria-hidden="true">
      <path d="M12.7 4.7l-1.4-1.4L8 6.6 4.7 3.3 3.3 4.7 6.6 8l-3.3 3.3 1.4 1.4L8 9.4l3.3 3.3 1.4-1.4L9.4 8z" />
    </svg>
  ),
};

/* ══════════════ تصميم Odoo ══════════════ */

const PLUM = "#714B67";
const PLUM_DK = "#5c3d54";

export const ODOO_CSS = `
#root .odv, #root .odv * {
  font-family: Roboto, "Segoe UI", Cairo, system-ui, -apple-system, Arial, sans-serif;
  font-size: 13px !important; box-sizing: border-box;
}
#root .odv {
  /* بلا overflow:hidden — القوائم المنسدلة تخرج خارج حدود الإطار */
  background: #fff; border: 1px solid #d8d8d8; border-radius: 6px;
  color: #24292e; box-shadow: 0 1px 3px rgba(0,0,0,.08); margin-bottom: 16px;
}

/* ── شريط التطبيق ── */
#root .odv .odv-nav {
  display: flex; align-items: center; gap: 4px; background: ${PLUM}; color: #fff;
  padding: 0 10px; height: 46px; overflow-x: auto; scrollbar-width: none;
}
#root .odv .odv-nav::-webkit-scrollbar { display: none; }
#root .odv .odv-apps {
  background: transparent; border: none; color: #fff; cursor: pointer; padding: 8px 9px;
  border-radius: 4px; display: inline-flex; align-items: center; font-family: inherit;
}
#root .odv .odv-apps:hover { background: ${PLUM_DK}; }
#root .odv .odv-brand { font-size: 16px !important; font-weight: 700; padding: 0 10px 0 4px; white-space: nowrap; }
#root .odv .odv-mitem {
  background: transparent; border: none; color: rgba(255,255,255,.92); cursor: pointer;
  padding: 8px 11px; border-radius: 4px; white-space: nowrap; font-family: inherit; font-weight: 400;
}
#root .odv .odv-mitem:hover { background: ${PLUM_DK}; color: #fff; }
#root .odv .odv-mitem.on { background: ${PLUM_DK}; color: #fff; font-weight: 600; }
#root .odv .odv-mn {
  background: rgba(255,255,255,.22); border-radius: 999px; padding: 0 6px;
  margin-inline-start: 6px; font-size: 11px !important; font-weight: 700;
}
/* الشريط حين يُستعمل وحده فوق كل تبويبات الصفحة */
#root .odv.odv-appbar { padding: 0; margin-bottom: 12px; border: none; overflow: hidden; }
#root .odv .odv-navr { margin-inline-start: auto; display: flex; align-items: center; gap: 10px; padding-inline-start: 12px; }
#root .odv .odv-chip-n {
  position: relative; color: #fff; opacity: .92; display: inline-flex; align-items: center; gap: 3px;
}
#root .odv .odv-chip-n b {
  background: #f0ad4e; color: #fff; border-radius: 9px; padding: 0 5px;
  font-size: 10px !important; font-weight: 700;
}
#root .odv .odv-user { display: flex; align-items: center; gap: 7px; white-space: nowrap; }
#root .odv .odv-ava {
  width: 26px; height: 26px; border-radius: 50%; background: #8f6d84; color: #fff;
  display: grid; place-items: center; font-weight: 700; flex-shrink: 0;
}

/* ── لوحة التحكّم ── */
#root .odv .odv-cp { background: #fff; border-bottom: 1px solid #e0e0e0; padding: 8px 12px 6px; }
#root .odv .odv-cp-top { display: flex; align-items: flex-start; gap: 14px; flex-wrap: wrap; }
#root .odv .odv-title { font-size: 20px !important; font-weight: 400; color: #111; padding-top: 2px; }
#root .odv .odv-title small { display: block; font-size: 12px !important; color: #888; }

#root .odv .odv-searchbox {
  flex: 1 1 380px; min-width: 260px; max-width: 720px; margin-inline-start: auto;
  display: flex; align-items: center; flex-wrap: wrap; gap: 4px;
  border-bottom: 1px solid #ccc; padding: 3px 4px 4px;
}
#root .odv .odv-searchbox:focus-within { border-bottom-color: ${PLUM}; }
#root .odv .odv-facet {
  display: inline-flex; align-items: stretch; border: 1px solid ${PLUM}; border-radius: 3px;
  overflow: hidden; max-width: 320px;
}
#root .odv .odv-facet-k {
  background: ${PLUM}; color: #fff; padding: 2px 7px; font-size: 11px !important; font-weight: 500;
  display: inline-flex; align-items: center; gap: 4px; white-space: nowrap;
}
#root .odv .odv-facet-v {
  background: #fff; color: #333; padding: 2px 7px; font-size: 11px !important;
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
}
#root .odv .odv-facet-x {
  background: #fff; border: none; color: #999; cursor: pointer; padding: 0 5px 0 2px;
  display: inline-flex; align-items: center; font-family: inherit;
}
#root .odv .odv-facet-x:hover { color: #d9534f; }
#root .odv .odv-facet.ext { border-color: #b8a3b1; }
#root .odv .odv-facet.ext .odv-facet-k { background: #b8a3b1; }
#root .odv .odv-sinput {
  flex: 1 1 120px; min-width: 110px; border: none; outline: none; padding: 3px 4px;
  background: transparent; color: #333; font-family: inherit;
}
#root .odv .odv-sicon { color: #888; padding: 0 4px; display: inline-flex; }

#root .odv .odv-cp-bot {
  display: flex; align-items: center; gap: 6px; flex-wrap: wrap; margin-top: 6px; padding-top: 4px;
}
#root .odv .odv-tool {
  background: transparent; border: 1px solid transparent; color: #555; cursor: pointer;
  padding: 4px 9px; border-radius: 4px; display: inline-flex; align-items: center; gap: 5px;
  font-family: inherit; white-space: nowrap;
}
#root .odv .odv-tool:hover { background: #f2eef1; color: ${PLUM}; }
#root .odv .odv-tool.on { background: #f2eef1; color: ${PLUM}; border-color: #e0d4dc; }
#root .odv .odv-tool:disabled { opacity: .4; cursor: not-allowed; }
#root .odv .odv-spacer { flex: 1 1 auto; }
#root .odv .odv-pager { display: inline-flex; align-items: center; gap: 2px; color: #555; white-space: nowrap; }
#root .odv .odv-pager span { padding: 0 4px; }
#root .odv .odv-views { display: inline-flex; border: 1px solid #d5d5d5; border-radius: 4px; overflow: hidden; }
#root .odv .odv-vbtn {
  background: #fff; border: none; color: #666; cursor: pointer; padding: 5px 9px;
  display: inline-flex; align-items: center; font-family: inherit;
}
#root .odv .odv-vbtn + .odv-vbtn { border-inline-start: 1px solid #d5d5d5; }
#root .odv .odv-vbtn.on { background: ${PLUM}; color: #fff; }

/* ── القوائم المنسدلة ── */
#root .odv .odv-pop-wrap { position: relative; }
#root .odv .odv-pop {
  position: absolute; top: calc(100% + 4px); inset-inline-start: 0; z-index: 40; min-width: 226px;
  background: #fff; border: 1px solid #d5d5d5; border-radius: 4px; padding: 4px 0;
  box-shadow: 0 6px 18px rgba(0,0,0,.16); max-height: 340px; overflow: auto;
}
#root .odv .odv-pop.end { inset-inline-start: auto; inset-inline-end: 0; }
#root .odv .odv-prow {
  display: flex; align-items: center; gap: 8px; width: 100%; background: transparent; border: none;
  padding: 6px 12px; cursor: pointer; color: #333; font-family: inherit; text-align: start;
}
#root .odv .odv-prow:hover { background: #f4f0f3; }
#root .odv .odv-prow.on { color: ${PLUM}; font-weight: 600; background: #faf7f9; }
#root .odv .odv-prow .tick { width: 12px; flex-shrink: 0; color: ${PLUM}; }
#root .odv .odv-psep { height: 1px; background: #e6e6e6; margin: 4px 0; }
#root .odv .odv-plbl { padding: 5px 12px 3px; color: #999; font-size: 11px !important; font-weight: 600; text-transform: uppercase; }

/* ── الجدول ── */
/* منطقة الجدول تأخذ ما تبقّى من ارتفاع الشاشة — رأس ثابت وتمرير داخلي مثل Odoo */
#root .odv .odv-tw { overflow: auto; max-height: calc(100vh - 240px); min-height: 320px; }
#root .odv .odv-table { width: 100%; border-collapse: collapse; background: #fff; }
#root .odv .odv-table th, #root .odv .odv-table td { font-size: 13px !important; }
#root .odv .odv-table thead th {
  position: sticky; top: 0; z-index: 3; background: #fff; color: #4c4c4c; font-weight: 500;
  text-align: start; padding: 7px 8px; border-bottom: 1px solid #cfcfcf; white-space: nowrap;
  cursor: pointer; user-select: none;
}
#root .odv .odv-table thead th:hover { background: #f6f6f6; }
#root .odv .odv-table thead th.num, #root .odv .odv-table td.num { text-align: end; }
#root .odv .odv-table thead th .sc { color: ${PLUM}; margin-inline-start: 4px; font-size: 10px !important; }
#root .odv .odv-table tbody td {
  padding: 5px 8px; border-bottom: 1px solid #ededed; color: #333; vertical-align: middle;
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
}
#root .odv .odv-table tbody tr.odv-row:hover > td { background: #f4f0f3 !important; cursor: pointer; }
#root .odv .odv-table tbody tr.odv-row.sel > td { background: #f7f2f6 !important; }
#root .odv .odv-table tbody tr.odv-grow > td {
  background: #eee !important; font-weight: 600; color: #222; border-bottom: 1px solid #dcdcdc;
  padding: 6px 8px;
}
#root .odv .odv-table tbody tr.odv-grow:hover > td { background: #e6e6e6 !important; cursor: pointer; }
#root .odv .odv-table tfoot td {
  position: sticky; bottom: 0; background: #f7f7f7; border-top: 1px solid #cfcfcf;
  font-weight: 700; color: #222; padding: 6px 8px; white-space: nowrap;
}
#root .odv .odv-cbx { width: 30px; text-align: center !important; padding-inline: 6px !important; }
#root .odv .odv-cbx input { cursor: pointer; }
#root .odv .odv-caret { display: inline-block; width: 12px; color: #666; font-size: 11px !important; }
#root .odv .odv-sub { display: block; color: #9b9b9b; font-size: 11px !important; line-height: 1.35; }
#root .odv .odv-link { color: #017e84; font-weight: 500; }
#root .odv .odv-row:hover .odv-link { text-decoration: underline; }
#root .odv .odv-sku { color: #7d7d7d; }
#root .odv .odv-arrow { color: #9b9b9b; padding: 0 4px; }

/* ── وسوم وحالات ── */
#root .odv .odv-badge {
  display: inline-block; border-radius: 999px; padding: 1px 9px; font-size: 11px !important;
  font-weight: 600; color: #fff; white-space: nowrap;
}
#root .odv .odv-badge.done { background: #28a745; }
#root .odv .odv-badge.waiting { background: #f0ad4e; }
#root .odv .odv-badge.cancel { background: #d9534f; }
#root .odv .odv-tag {
  display: inline-block; border-radius: 3px; padding: 1px 7px; font-size: 11px !important;
  font-weight: 500; border: 1px solid; white-space: nowrap;
}
#root .odv .odv-tag.raw { color: #0c6b9e; border-color: #b6dcf0; background: #eaf5fb; }
#root .odv .odv-tag.product { color: #1f7a44; border-color: #b9e2c9; background: #ecf8f1; }
#root .odv .odv-tag.waste { color: #96580a; border-color: #f2ddb6; background: #fdf5e7; }
#root .odv .odv-tag.bone { color: #6d4c9c; border-color: #d9cbee; background: #f4eefb; }
#root .odv .odv-dir { display: inline-flex; align-items: center; gap: 5px; }
#root .odv .odv-dot { width: 7px; height: 7px; border-radius: 50%; flex-shrink: 0; }
#root .odv .odv-dot.consume { background: #d9534f; }
#root .odv .odv-dot.produce { background: #28a745; }
#root .odv .odv-warn { color: #d9534f; font-weight: 600; }
#root .odv .odv-ok { color: #28a745; font-weight: 600; }

/* ── شريط التحديد ── */
#root .odv .odv-selbar {
  display: flex; align-items: center; gap: 10px; flex-wrap: wrap;
  background: #f2eef1; border-bottom: 1px solid #e0d4dc; padding: 6px 12px; color: ${PLUM};
}
#root .odv .odv-selbar button {
  background: #fff; border: 1px solid #d5c6d0; color: ${PLUM}; border-radius: 4px;
  padding: 3px 10px; cursor: pointer; font-family: inherit; font-weight: 500;
}
#root .odv .odv-selbar button:hover { background: ${PLUM}; color: #fff; }

/* ── العرض المحوري ── */
#root .odv .odv-pv { padding: 12px; overflow: auto; }
#root .odv .odv-pv table { border-collapse: collapse; width: 100%; }
#root .odv .odv-pv th, #root .odv .odv-pv td {
  border: 1px solid #dcdcdc; padding: 6px 10px; font-size: 13px !important; white-space: nowrap;
}
#root .odv .odv-pv th { background: #f5f5f5; color: #444; font-weight: 600; }
#root .odv .odv-pv td.num { text-align: end; }
#root .odv .odv-pv tr.tot td, #root .odv .odv-pv tr.tot th { background: #f0eaee; font-weight: 700; }

/* ── نافذة السجل ── */
#root .odv .odv-mask {
  position: fixed; inset: 0; background: rgba(0,0,0,.45); z-index: 1200;
  display: grid; place-items: start center; padding: 24px 12px; overflow: auto;
}
#root .odv .odv-dlg {
  background: #fff; border-radius: 4px; width: min(980px,100%); box-shadow: 0 14px 40px rgba(0,0,0,.3);
  overflow: hidden;
}
#root .odv .odv-dlg-head {
  background: ${PLUM}; color: #fff; padding: 9px 14px; display: flex; align-items: center; gap: 10px;
}
#root .odv .odv-dlg-head b { font-size: 15px !important; font-weight: 600; }
#root .odv .odv-dlg-x {
  margin-inline-start: auto; background: transparent; border: none; color: #fff; cursor: pointer;
  padding: 4px 6px; border-radius: 4px; font-family: inherit;
}
#root .odv .odv-dlg-x:hover { background: ${PLUM_DK}; }
#root .odv .odv-sheet { padding: 16px 18px; }
#root .odv .odv-statusbar { display: flex; gap: 4px; justify-content: flex-end; margin-bottom: 10px; flex-wrap: wrap; }
#root .odv .odv-st {
  border: 1px solid #d5d5d5; border-radius: 3px; padding: 2px 12px; color: #999; background: #fff;
  font-size: 12px !important; font-weight: 500;
}
#root .odv .odv-st.on { background: ${PLUM}; border-color: ${PLUM}; color: #fff; }
#root .odv .odv-fh { font-size: 22px !important; font-weight: 600; color: #111; margin-bottom: 12px; }
#root .odv .odv-fg { display: grid; grid-template-columns: repeat(auto-fit,minmax(min(300px,100%),1fr)); gap: 4px 26px; }
#root .odv .odv-fr { display: flex; gap: 10px; padding: 4px 0; border-bottom: 1px dotted #ececec; }
#root .odv .odv-fr .k { color: #666; font-weight: 600; min-width: 118px; }
#root .odv .odv-fr .v { color: #111; font-weight: 500; }
#root .odv .odv-nb { margin-top: 16px; border-top: 1px solid #dcdcdc; padding-top: 10px; }
#root .odv .odv-nb-t { color: ${PLUM}; font-weight: 600; border-bottom: 2px solid ${PLUM}; display: inline-block; padding-bottom: 4px; }

@media (max-width: 900px) {
  #root .odv .odv-title { font-size: 17px !important; }
  #root .odv .odv-searchbox { margin-inline-start: 0; }
  #root .odv .odv-tw { max-height: none; }
}
@media print {
  #root .odv { border: none; box-shadow: none; }
  #root .odv .odv-nav, #root .odv .odv-cp-bot, #root .odv .odv-searchbox, #root .odv .odv-selbar { display: none !important; }
  #root .odv .odv-tw { max-height: none !important; overflow: visible !important; }
  #root .odv .odv-table thead th { position: static; }
  #root .odv .odv-table tfoot td { position: static; }
}
`;

/* ══════════════ قشرة Odoo لباقي التبويبات ══════════════ */

/**
 * كل تبويبات الصفحة (نظرة عامة · العمليات · المنتجات · المسارات · التجميع ·
 * الملاحظات) مبنيّة على بطاقات وجداول الـkit بأنماط سطرية (inline styles).
 * هذه القشرة تُلبسها شكل Odoo نفسه بلا إعادة كتابة أي تبويب: البطاقة تصير
 * «ورقة» بشريط عنوان رمادي، والجدول يصير قائمة Odoo ملتصقة بحواف الورقة،
 * والأزرار والحقول والشرائح تأخذ زوايا وألوان Odoo.
 * ملاحظة: `!important` مقصود — هو الوحيد الذي يتغلّب على الأنماط السطرية.
 */
export const ODOO_SKIN_CSS = `
/* ── خلفية التطبيق ── */
#root .odoo-skin { background: #f5f5f5 !important; }

/* ── الترويسة → لوحة تحكّم Odoo ── */
#root .odoo-skin .bv-hero {
  background: #fff !important; color: #24292e !important; border: 1px solid #d8d8d8 !important;
  border-radius: 4px !important; box-shadow: none !important; padding: 10px 14px !important;
}
#root .odoo-skin .bv-hero-glow { display: none !important; }
#root .odoo-skin .bv-hero-icon {
  background: #f2eef1 !important; border: 1px solid #e2d7de !important; color: ${PLUM} !important;
  width: 42px !important; height: 42px !important; border-radius: 4px !important;
  font-size: 21px !important;
}
#root .odoo-skin .bv-hero-title { color: #111 !important; font-size: 20px !important; font-weight: 500 !important; }
#root .odoo-skin .bv-hero-sub { color: #888 !important; font-weight: 400 !important; }
#root .odoo-skin .bv-hpill {
  background: #f7f7f7 !important; border: 1px solid #e3e3e3 !important; color: #5c5c5c !important;
  border-radius: 3px !important; font-weight: 500 !important; padding: 3px 9px !important;
}
/* كل أزرار الترويسة — بما فيها مبدّل اللغة الذي كان أبيض على خلفية ملوّنة */
#root .odoo-skin .bv-hero button {
  background: #fff !important; border: 1px solid #d5d5d5 !important; color: #555 !important;
  border-radius: 4px !important; font-weight: 500 !important; padding: 5px 12px !important;
  box-shadow: none !important; transform: none !important; backdrop-filter: none !important;
}
#root .odoo-skin .bv-hero button:hover { background: #f4f0f3 !important; color: ${PLUM} !important; }
#root .odoo-skin .bv-hero .bv-hbtn-solid {
  background: ${PLUM} !important; border-color: ${PLUM} !important; color: #fff !important;
}
#root .odoo-skin .bv-hero .bv-hbtn-solid:hover { background: ${PLUM_DK} !important; color: #fff !important; }

/* ── البطاقة → ورقة Odoo ── */
#root .odoo-skin .bk-card {
  border: 1px solid #d8d8d8 !important; border-radius: 4px !important; padding: 0 !important;
  box-shadow: 0 1px 2px rgba(0,0,0,.05) !important; margin-bottom: 12px !important;
  background: #fff !important;
}
#root .odoo-skin .bk-card, #root .odoo-skin .bk-card * { font-size: 13px !important; }
#root .odoo-skin .bk-cardhead {
  margin: 0 !important; padding: 8px 12px !important; background: #fafafa !important;
  border-bottom: 1px solid #e6e6e6 !important; border-radius: 3px 3px 0 0 !important;
}
#root .odoo-skin .bk-card .bk-sec { font-size: 14px !important; font-weight: 600 !important; color: #333 !important; }
#root .odoo-skin .bk-card .bk-sub { font-size: 11.5px !important; color: #8b8b8b !important; font-weight: 400 !important; }
#root .odoo-skin .bk-card .bk-lbl { font-size: 11px !important; font-weight: 600 !important; }
#root .odoo-skin .bk-card .bk-num { font-size: 21px !important; }
/* حشوة للمحتوى غير الجدولي — الجدول نفسه يبقى ملتصقاً بحواف الورقة */
#root .odoo-skin .bk-card > *:not(.bk-cardhead):not(.bk-tablewrap) { padding: 12px; }

/* ── الجدول → قائمة Odoo ── */
#root .odoo-skin .bk-tablewrap {
  border: none !important; border-radius: 0 !important; border-top: 1px solid #e6e6e6 !important;
}
#root .odoo-skin .bk-tablewrap table, #root .odoo-skin .bk-tablewrap table * { font-size: 13px !important; }
#root .odoo-skin .bk-tablewrap thead th {
  background: #fff !important; color: #4c4c4c !important; font-weight: 500 !important;
  padding: 7px 8px !important; border-bottom: 1px solid #cfcfcf !important;
}
#root .odoo-skin .bk-tablewrap tbody td {
  padding: 5px 8px !important; border-bottom: 1px solid #ededed !important;
}
#root .odoo-skin .bk-tablewrap tbody tr:hover { background: #f4f0f3 !important; }
#root .odoo-skin .bk-tablewrap tbody tr:hover > td { background: transparent !important; }

/* ── شرائح ووسوم ── */
#root .odoo-skin .bk-chip {
  border-radius: 3px !important; padding: 1px 7px !important; font-weight: 500 !important;
  font-size: 11px !important;
}
#root .odoo-skin .bv-fchip {
  background: #fff !important; border: 1px solid ${PLUM} !important; border-radius: 3px !important;
  color: #333 !important; padding: 1px 3px 1px 8px !important; font-weight: 500 !important;
}
#root .odoo-skin .bv-fchip button { border-radius: 3px !important; }

/* ── الأزرار والحقول داخل الأوراق ── */
#root .odoo-skin .bk-card button, #root .odoo-skin .bk-card select,
#root .odoo-skin .bk-card input:not([type="checkbox"]):not([type="radio"]) {
  border-radius: 4px !important; font-weight: 500 !important;
}
#root .odoo-skin .bk-card button { padding: 5px 12px !important; }
#root .odoo-skin .bk-card select,
#root .odoo-skin .bk-card input:not([type="checkbox"]):not([type="radio"]) {
  border: 1px solid #d5d5d5 !important; padding: 6px 10px !important;
}
#root .odoo-skin .bk-card select:focus,
#root .odoo-skin .bk-card input:not([type="checkbox"]):not([type="radio"]):focus {
  border-color: ${PLUM} !important;
}
#root .odoo-skin .bv-flag {
  border-radius: 4px !important; border-color: #d5d5d5 !important; font-weight: 500 !important;
  padding: 6px 10px !important;
}
#root .odoo-skin .bv-flag.on {
  background: #f2eef1 !important; border-color: ${PLUM} !important; color: ${PLUM} !important;
}
#root .odoo-skin .bv-exp {
  background: #f0ecef !important; color: ${PLUM} !important; border-radius: 3px !important;
  width: 18px !important; height: 18px !important;
}

/* ── بطاقات المؤشّرات ── */
#root .odoo-skin .bv-stat {
  border: 1px solid #d8d8d8 !important; border-radius: 4px !important; padding: 10px 12px !important;
  box-shadow: none !important; transform: none !important;
}
#root .odoo-skin .bv-stat, #root .odoo-skin .bv-stat * { font-size: 12px !important; }
#root .odoo-skin .bv-stat::before { width: 3px !important; }
#root .odoo-skin .bv-stat::after { display: none !important; }
#root .odoo-skin .bv-statv { font-size: 21px !important; font-weight: 700 !important; }
#root .odoo-skin .bv-statu { font-size: 12px !important; }

/* ── متفرقات ── */
#root .odoo-skin .bv-best { border-radius: 3px !important; font-weight: 600 !important; }
#root .odoo-skin .bk-press:hover { transform: none !important; box-shadow: none !important; }
`;

/* ══════════════ شريط تطبيق Odoo — يلبسه كل تبويبات الصفحة ══════════════ */

/**
 * شريط التطبيق البنفسجي: شبكة التطبيقات · اسم التطبيق · قائمة العروض (تبويبات
 * الصفحة) · المستخدم. هذا الشريط يستبدل شريط التبويبات القديم فيصير كل تبويب
 * بنفس هيكل Odoo تماماً.
 */
export function OdooNavbar({
  brand, items = [], value, onChange, counts, onHome, isAr, t, userName = "", extra,
}) {
  const L = (o) => (isAr ? o.ar : o.en);
  return (
    <div className="odv odv-appbar bk-noprint">
      <style>{ODOO_CSS}</style>
      <div className="odv-nav">
        <button
          type="button" className="odv-apps" onClick={onHome}
          title={t ? t({ en: "Apps", ar: "التطبيقات" }) : "Apps"}
        >
          <Ico.Apps />
        </button>
        <span className="odv-brand">{brand}</span>
        {items.map((it) => (
          <button
            key={it.id} type="button"
            className={`odv-mitem ${value === it.id ? "on" : ""}`}
            onClick={() => onChange?.(it.id)}
          >
            {L(it)}
            {counts?.[it.id] !== undefined && <span className="odv-mn">{n0(counts[it.id])}</span>}
          </button>
        ))}
        <div className="odv-navr">
          {extra}
          <span className="odv-user">
            <span className="odv-ava">{(userName || "?").trim().charAt(0).toUpperCase()}</span>
            {userName || (t ? t({ en: "User", ar: "مستخدم" }) : "User")}
          </span>
        </div>
      </div>
    </div>
  );
}

/* ══════════════ قائمة منسدلة ══════════════ */

function Dropdown({ id, open, setOpen, label, icon, end, children, disabled }) {
  const ref = useRef(null);
  useEffect(() => {
    if (open !== id) return undefined;
    const onDown = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(""); };
    const onEsc = (e) => { if (e.key === "Escape") setOpen(""); };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onEsc);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onEsc);
    };
  }, [open, id, setOpen]);

  return (
    <div className="odv-pop-wrap" ref={ref}>
      <button
        type="button" className={`odv-tool ${open === id ? "on" : ""}`} disabled={disabled}
        onClick={() => setOpen(open === id ? "" : id)}
      >
        {icon}{label}<Ico.Caret />
      </button>
      {open === id && <div className={`odv-pop ${end ? "end" : ""}`}>{children}</div>}
    </div>
  );
}

const PRow = ({ on, onClick, children }) => (
  <button type="button" className={`odv-prow ${on ? "on" : ""}`} onClick={onClick}>
    <span className="tick">{on ? "✓" : ""}</span>{children}
  </button>
);

/* ══════════════ العنصر الرئيسي ══════════════ */

/**
 * @param {object[]} moves     أسطر الحركة الجاهزة (buildMoves)
 * @param {function} t         مترجم {en,ar}
 * @param {object[]} chips     شرائح فلاتر الصفحة — تظهر بشريط البحث كـ facets
 * @param {function} onExportCsv (aoa, filename)
 * @param {function} onExportXlsx (sheets, filename)
 * @param {boolean}  printMode بلا ترقيم صفحات وكل المجموعات مفتوحة
 *
 * شريط تطبيق Odoo ليس هنا — الصفحة كلها تلبسه مرّة واحدة عبر <OdooNavbar/>.
 */
export default function OdooMoves({
  moves = [], t, isAr, dateFrom, dateTo, chips = [],
  onExportCsv, onExportXlsx, printMode = false,
}) {
  const [sort, setSort] = useState({ key: "sortKey", dir: "desc" });
  const [filters, setFilters] = useState([]);          // معرّفات الفلاتر المفعّلة
  const [group, setGroup] = useState([]);              // مستويات التجميع بالترتيب
  const [facets, setFacets] = useState([]);            // شرائح البحث النصّي
  const [term, setTerm] = useState("");
  const [pop, setPop] = useState("");                  // القائمة المفتوحة
  const [page, setPage] = useState(1);
  const [size, setSize] = useState(80);
  const [sel, setSel] = useState(() => new Set());
  const [closed, setClosed] = useState(() => new Set()); // مجموعات مطويّة
  const [hidden, setHidden] = useState(() => new Set());
  const [view, setView] = useState("list");
  const [pivotDim, setPivotDim] = useState("branch");
  const [rec, setRec] = useState(null);                // السجل المفتوح

  const L = (o) => (isAr ? o.ar : o.en);
  const cols = useMemo(() => MOVE_COLS.filter((c) => !hidden.has(c.id)), [hidden]);

  /* ── الفلترة: داخل المجموعة «أو»، بين المجموعات «و» ── */
  const list = useMemo(() => {
    let out = moves;
    const byCat = {};
    filters.forEach((id) => {
      const f = FILTERS.find((x) => x.id === id);
      if (!f) return;
      (byCat[f.cat] = byCat[f.cat] || []).push(f);
    });
    Object.values(byCat).forEach((group_) => {
      out = out.filter((m) => group_.some((f) => f.test(m)));
    });
    facets.forEach((f) => {
      const fld = SEARCH_FIELDS.find((x) => x.id === f.field) || SEARCH_FIELDS[0];
      const needle = f.value.toLowerCase();
      out = out.filter((m) => String(fld.get(m) || "").toLowerCase().includes(needle));
    });
    return out;
  }, [moves, filters, facets]);

  /* ── الفرز ── */
  const sorted = useMemo(() => {
    const { key, dir } = sort;
    const arr = [...list];
    arr.sort((a, b) => {
      const x = a[key]; const y = b[key];
      let c;
      if (typeof x === "number" && typeof y === "number") c = x - y;
      else c = String(x ?? "").localeCompare(String(y ?? ""), undefined, { numeric: true });
      if (c) return dir === "asc" ? c : -c;
      return a.seq - b.seq;               // ثبات: أسطر العملية الواحدة تبقى متتالية
    });
    return arr;
  }, [list, sort]);

  /* ── التجميع (شجرة بمستويات) ── */
  const tree = useMemo(() => {
    if (!group.length) return null;
    const build = (items, depth, path) => {
      const g = GROUPS.find((x) => x.id === group[depth]);
      if (!g) return null;
      const map = new Map();
      items.forEach((m) => {
        const k = String(g.get(m) ?? "—");
        if (!map.has(k)) map.set(k, []);
        map.get(k).push(m);
      });
      return [...map.entries()].map(([k, sub]) => ({
        id: `${path}/${g.id}:${k}`,
        label: k,
        depth,
        rows: sub,
        qty: sub.reduce((s, m) => s + m.qty, 0),
        outQty: sub.reduce((s, m) => s + (m.dir === "produce" ? m.qty : 0), 0),
        inQty: sub.reduce((s, m) => s + (m.dir === "consume" ? m.qty : 0), 0),
        children: depth + 1 < group.length ? build(sub, depth + 1, `${path}/${g.id}:${k}`) : null,
      })).sort((a, b) => b.qty - a.qty);
    };
    return build(sorted, 0, "");
  }, [sorted, group]);

  /* ── الترقيم (على الأسطر المسطّحة فقط، مثل Odoo) ── */
  const total = sorted.length;
  const pages = Math.max(1, Math.ceil(total / size));
  const cur = Math.min(page, pages);
  const paged = useMemo(
    () => (printMode || tree ? sorted : sorted.slice((cur - 1) * size, cur * size)),
    [sorted, cur, size, tree, printMode]
  );

  useEffect(() => { setPage(1); }, [filters, facets, size, group]);

  /* ── المجاميع ── */
  const sums = useMemo(() => {
    const src = tree ? sorted : paged;
    return {
      n: src.length,
      inQty: src.reduce((s, m) => s + (m.dir === "consume" ? m.qty : 0), 0),
      outQty: src.reduce((s, m) => s + (m.dir === "produce" && m.kind === "product" ? m.qty : 0), 0),
      wasteQty: src.reduce((s, m) => s + (m.dir === "produce" && m.kind !== "product" ? m.qty : 0), 0),
      ops: new Set(src.map((m) => m.rowId)).size,
    };
  }, [paged, sorted, tree]);

  /* ── الشرائح المعروضة بشريط البحث ── */
  const allFacets = useMemo(() => {
    const out = [];
    facets.forEach((f, i) => {
      const fld = SEARCH_FIELDS.find((x) => x.id === f.field) || SEARCH_FIELDS[0];
      out.push({
        key: `s${i}`, k: L(fld), v: f.value,
        clear: () => setFacets((p) => p.filter((_, j) => j !== i)),
      });
    });
    if (filters.length) {
      out.push({
        key: "flt", k: t({ en: "Filters", ar: "فلاتر" }),
        v: filters.map((id) => L(FILTERS.find((f) => f.id === id) || { ar: id, en: id })).join(" · "),
        clear: () => setFilters([]),
      });
    }
    if (group.length) {
      out.push({
        key: "grp", k: t({ en: "Group By", ar: "تجميع" }),
        v: group.map((id) => L(GROUPS.find((g) => g.id === id) || { ar: id, en: id })).join(" > "),
        clear: () => setGroup([]),
      });
    }
    return out;
  }, [facets, filters, group, isAr, t]); // eslint-disable-line react-hooks/exhaustive-deps

  /* ── تبديلات ── */
  const toggleSort = (key) =>
    setSort((s) => ({ key, dir: s.key === key && s.dir === "asc" ? "desc" : "asc" }));
  const toggleIn = (setter) => (v) =>
    setter((p) => (p.includes(v) ? p.filter((x) => x !== v) : [...p, v]));
  const toggleSet = (setter) => (v) =>
    setter((p) => { const n = new Set(p); if (n.has(v)) n.delete(v); else n.add(v); return n; });
  const toggleFilter = toggleIn(setFilters);
  const toggleGroup = toggleIn(setGroup);
  const toggleSel = toggleSet(setSel);
  const toggleClosed = toggleSet(setClosed);
  const toggleHidden = toggleSet(setHidden);

  const addFacet = (field) => {
    const v = term.trim();
    if (!v) return;
    setFacets((p) => [...p, { field, value: v }]);
    setTerm("");
  };

  const applyFav = (f) => {
    setFilters(f.filters); setGroup(f.group); setFacets([]); setPop("");
  };

  /* ── التصدير — نفس الأعمدة المعروضة تماماً ── */
  const aoa = useMemo(() => buildMovesAoa(sorted, { isAr, cols }), [sorted, cols, isAr]);

  const stamp = `${dateFrom || ""}_${dateTo || ""}`.replace(/[^0-9_-]/g, "");
  const doCsv = () => { onExportCsv?.(aoa, `product_moves_${stamp}.csv`); setPop(""); };
  const doXlsx = () => {
    onExportXlsx?.([{ name: "Product Moves", aoa, widths: cols.map((c) => Math.round(c.w / 7)) }],
      `product_moves_${stamp}.xlsx`);
    setPop("");
  };

  /* ── العرض المحوري ── */
  const pivot = useMemo(() => {
    if (view !== "pivot") return null;
    const g = GROUPS.find((x) => x.id === pivotDim) || GROUPS[2];
    const map = new Map();
    list.forEach((m) => {
      const k = String(g.get(m) ?? "—");
      if (!map.has(k)) map.set(k, { key: k, raw: 0, product: 0, waste: 0, bone: 0, n: 0, ops: new Set() });
      const c = map.get(k);
      c[m.kind] += m.qty;
      c.n += 1;
      c.ops.add(m.rowId);
    });
    const rowsP = [...map.values()]
      .map((c) => ({ ...c, ops: c.ops.size, yield: pctOf(c.product, c.raw || (c.product + c.waste + c.bone)) }))
      .sort((a, b) => (b.raw || b.product) - (a.raw || a.product));
    const tot = rowsP.reduce((s, c) => ({
      raw: s.raw + c.raw, product: s.product + c.product, waste: s.waste + c.waste,
      bone: s.bone + c.bone, ops: s.ops + c.ops,
    }), { raw: 0, product: 0, waste: 0, bone: 0, ops: 0 });
    return { label: L(g), rows: rowsP, tot: { ...tot, yield: pctOf(tot.product, tot.raw || (tot.product + tot.waste + tot.bone)) } };
  }, [view, pivotDim, list, isAr]); // eslint-disable-line react-hooks/exhaustive-deps

  /* ── خلية سطر ── */
  const renderCell = (m, c) => {
    switch (c.id) {
      case "date":
        return (
          <>
            {m.date}
            <span className="odv-sub">
              {m.time}{m.entryDay ? ` · ${t({ en: "entered", ar: "أُدخل" })} ${m.entryDay}` : ""}
            </span>
          </>
        );
      case "ref":
        return m.ref
          ? <span className="odv-link">{m.ref}</span>
          : <span style={{ color: "#bbb" }}>—</span>;
      case "loc":
        return (<>{m.branchName}<span className="odv-sub">{m.branchCode}</span></>);
      case "butcher":
        return (<>{m.butcher}{m.butcherJob ? <span className="odv-sub">{m.butcherJob}</span> : null}</>);
      case "bom":
        return (
          <>
            {m.bomRef || <span style={{ color: "#bbb" }}>—</span>}
            <span className="odv-sub">
              {m.pathwayLabel ? `🔀 ${m.pathwayLabel}` : (m.bomCat || "")}
            </span>
          </>
        );
      case "move":
        return (
          <>
            <span className="odv-dir">
              <span className={`odv-dot ${m.dir}`} />{m.dirLabel}
            </span>
            <span className="odv-sub">{m.from}<span className="odv-arrow">→</span>{m.to}</span>
          </>
        );
      case "ptype":
        return <span className={`odv-tag ${m.kind}`}>{m.kindLabel}</span>;
      case "product":
        return (
          <>
            {m.sku ? <span className="odv-sku">[{m.sku}] </span> : null}{m.product}
            {m.productAlt ? <span className="odv-sub">{m.productAlt}</span> : null}
          </>
        );
      case "qty":
        return (
          <>
            {n2(m.qty)}
            {m.targetKg > 0 && (
              <span className="odv-sub">
                {t({ en: "target", ar: "الهدف" })} {n2(m.targetKg)}
              </span>
            )}
            {m.pieceCount !== null && m.pieceCount !== undefined && (
              <span className="odv-sub">{n0(m.pieceCount)} {t({ en: "pcs", ar: "قطعة" })}</span>
            )}
          </>
        );
      case "uom":
        return m.uom;
      case "pct":
        return (
          <>
            {m.pctActual.toFixed(2)}%
            {m.deltaPct !== null && (
              <span className={`odv-sub ${Math.abs(m.deltaPct) > 10 ? "odv-warn" : "odv-ok"}`}>
                {m.deltaPct > 0 ? "▲" : "▼"} {Math.abs(m.deltaPct).toFixed(1)}%
              </span>
            )}
          </>
        );
      case "state":
        return (
          <>
            <span className={`odv-badge ${m.state}`}>{m.stateLabel}</span>
            {m.locked && <span className="odv-sub">🔒 {t({ en: "locked", ar: "مقفلة" })}</span>}
          </>
        );
      case "by":
        return m.checkedBy
          ? (<>{m.checkedBy}<span className="odv-sub">{m.checkedAt}</span></>)
          : <span style={{ color: "#bbb" }}>—</span>;
      default:
        return null;
    }
  };

  /* ── صفوف الجدول (مع أو بلا مجموعات) ── */
  // خلية اسم المجموعة تمتدّ حتى عمود الكمية، والباقي يحمل المجاميع.
  // الجمع دائماً = ١ (خانة الاختيار) + عدد الأعمدة، مهما أُخفي من أعمدة.
  const qtyIdx = cols.findIndex((c) => c.id === "qty");
  const labelSpan = Math.max(1, qtyIdx < 0 ? cols.length : qtyIdx);
  const tailCols = cols.slice(labelSpan);
  const bodyRows = [];
  const pushLeaf = (m, indent) => {
    bodyRows.push(
      <tr
        key={m.id}
        className={`odv-row ${sel.has(m.id) ? "sel" : ""}`}
        onClick={() => setRec(m.row)}
      >
        <td className="odv-cbx" onClick={(e) => e.stopPropagation()}>
          <input type="checkbox" checked={sel.has(m.id)} onChange={() => toggleSel(m.id)} />
        </td>
        {cols.map((c, i) => (
          <td
            key={c.id}
            className={c.num ? "num" : ""}
            style={i === 0 && indent ? { paddingInlineStart: 8 + indent * 16 } : undefined}
            title={c.id === "product" ? `${m.product}${m.productAlt ? ` — ${m.productAlt}` : ""}` : undefined}
          >
            {renderCell(m, c)}
          </td>
        ))}
      </tr>
    );
  };

  const pushGroup = (nodes) => {
    nodes.forEach((g) => {
      const open = printMode || !closed.has(g.id);
      bodyRows.push(
        <tr key={g.id} className="odv-grow" onClick={() => toggleClosed(g.id)}>
          <td className="odv-cbx">{open ? "▾" : "▸"}</td>
          <td colSpan={labelSpan}>
            <span style={{ paddingInlineStart: g.depth * 16 }}>
              {g.label} <span style={{ color: "#777", fontWeight: 500 }}>({n0(g.rows.length)})</span>
            </span>
          </td>
          {tailCols.map((c) => (
            <td key={c.id} className={c.num ? "num" : ""}>
              {c.id === "qty" ? n2(g.qty) : c.id === "uom" ? "KG" : ""}
            </td>
          ))}
        </tr>
      );
      if (!open) return;
      if (g.children) pushGroup(g.children);
      else g.rows.forEach((m) => pushLeaf(m, g.depth + 1));
    });
  };

  if (tree) pushGroup(tree); else paged.forEach((m) => pushLeaf(m, 0));

  const rtl = isAr;

  /* ══ الرسم ══ */
  return (
    <div className="odv">
      {/* لوحة التحكّم */}
      <div className="odv-cp">
        <div className="odv-cp-top">
          <div className="odv-title">
            {t({ en: "Product Moves", ar: "حركات المنتج" })}
            <small>{dateFrom} → {dateTo} · {n0(total)} {t({ en: "moves", ar: "حركة" })}</small>
          </div>

          <div className="odv-searchbox bk-noprint">
            {chips.map((c, i) => (
              <span className="odv-facet ext" key={`x${i}`} title={`${c.label}: ${c.text}`}>
                <span className="odv-facet-k">{c.label}</span>
                <span className="odv-facet-v">{c.text}</span>
                <button type="button" className="odv-facet-x" onClick={c.clear} aria-label="remove">
                  <Ico.Close />
                </button>
              </span>
            ))}
            {allFacets.map((f) => (
              <span className="odv-facet" key={f.key} title={`${f.k}: ${f.v}`}>
                <span className="odv-facet-k">{f.k}</span>
                <span className="odv-facet-v">{f.v}</span>
                <button type="button" className="odv-facet-x" onClick={f.clear} aria-label="remove">
                  <Ico.Close />
                </button>
              </span>
            ))}
            <div className="odv-pop-wrap" style={{ flex: "1 1 120px", display: "flex" }}>
              <input
                className="odv-sinput"
                value={term}
                placeholder={t({ en: "Search...", ar: "بحث..." })}
                onChange={(e) => { setTerm(e.target.value); setPop(e.target.value ? "search" : ""); }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") { addFacet("any"); setPop(""); }
                  if (e.key === "Escape") { setTerm(""); setPop(""); }
                  if (e.key === "Backspace" && !term && facets.length) {
                    setFacets((p) => p.slice(0, -1));
                  }
                }}
                onBlur={() => setPop((p) => (p === "search" ? "" : p))}
              />
              {pop === "search" && term.trim() && (
                <div className="odv-pop" style={{ top: "calc(100% + 6px)" }}>
                  {SEARCH_FIELDS.map((f) => (
                    <button
                      key={f.id} type="button" className="odv-prow"
                      onMouseDown={(e) => { e.preventDefault(); addFacet(f.id); setPop(""); }}
                    >
                      <span className="tick">›</span>
                      {t({ en: "Search", ar: "ابحث في" })} <b style={{ color: PLUM }}>{L(f)}</b>{" "}
                      {t({ en: "for", ar: "عن" })}: <i>{term.trim()}</i>
                    </button>
                  ))}
                </div>
              )}
            </div>
            <span className="odv-sicon"><Ico.Search /></span>
          </div>
        </div>

        <div className="odv-cp-bot bk-noprint">
          <Dropdown
            id="exp" open={pop} setOpen={setPop} icon={<Ico.Down />}
            label={t({ en: "Export", ar: "تصدير" })}
          >
            <div className="odv-plbl">{t({ en: "Export all filtered moves", ar: "تصدير كل الحركات المفلترة" })}</div>
            <PRow onClick={doCsv}>CSV — {n0(sorted.length)} {t({ en: "lines", ar: "سطر" })}</PRow>
            <PRow onClick={doXlsx}>Excel — {n0(sorted.length)} {t({ en: "lines", ar: "سطر" })}</PRow>
          </Dropdown>

          <span className="odv-spacer" />

          <Dropdown
            id="flt" open={pop} setOpen={setPop} icon={<Ico.Filter />}
            label={t({ en: "Filters", ar: "الفلاتر" })}
          >
            {FILTERS.map((f, i) => (
              f.sep
                ? <div className="odv-psep" key={`sep${i}`} />
                : <PRow key={f.id} on={filters.includes(f.id)} onClick={() => toggleFilter(f.id)}>
                  {L(f)}
                  <span style={{ marginInlineStart: "auto", color: "#999" }}>
                    {n0(moves.filter(f.test).length)}
                  </span>
                </PRow>
            ))}
            {filters.length > 0 && (
              <>
                <div className="odv-psep" />
                <PRow onClick={() => setFilters([])}>{t({ en: "Clear filters", ar: "مسح الفلاتر" })}</PRow>
              </>
            )}
          </Dropdown>

          <Dropdown
            id="grp" open={pop} setOpen={setPop} icon={<Ico.Group />}
            label={t({ en: "Group By", ar: "تجميع حسب" })}
          >
            {GROUPS.map((g) => (
              <PRow key={g.id} on={group.includes(g.id)} onClick={() => toggleGroup(g.id)}>
                {L(g)}
                {group.includes(g.id) && (
                  <span style={{ marginInlineStart: "auto", color: PLUM }}>{group.indexOf(g.id) + 1}</span>
                )}
              </PRow>
            ))}
            {group.length > 0 && (
              <>
                <div className="odv-psep" />
                <PRow onClick={() => setGroup([])}>{t({ en: "Ungroup", ar: "إلغاء التجميع" })}</PRow>
              </>
            )}
          </Dropdown>

          <Dropdown
            id="fav" open={pop} setOpen={setPop} icon={<Ico.Star />}
            label={t({ en: "Favorites", ar: "المفضّلة" })}
          >
            <div className="odv-plbl">{t({ en: "Saved searches", ar: "بحث محفوظ" })}</div>
            {FAVORITES.map((f) => (
              <PRow key={f.id} onClick={() => applyFav(f)}>{L(f)}</PRow>
            ))}
            <div className="odv-psep" />
            <PRow onClick={() => { setFilters([]); setGroup([]); setFacets([]); setPop(""); }}>
              {t({ en: "Reset search", ar: "إعادة ضبط البحث" })}
            </PRow>
          </Dropdown>

          <Dropdown
            id="col" open={pop} setOpen={setPop} icon={<Ico.Cols />} end
            label={t({ en: "Columns", ar: "الأعمدة" })}
          >
            <div className="odv-plbl">{t({ en: "Optional columns", ar: "أعمدة اختيارية" })}</div>
            {MOVE_COLS.map((c) => (
              <PRow key={c.id} on={!hidden.has(c.id)} onClick={() => toggleHidden(c.id)}>{L(c)}</PRow>
            ))}
          </Dropdown>

          {!tree && (
            <span className="odv-pager">
              <select
                value={size} onChange={(e) => setSize(Number(e.target.value))}
                style={{ border: "1px solid #d5d5d5", borderRadius: 4, padding: "3px 4px", fontFamily: "inherit" }}
                title={t({ en: "Rows per page", ar: "أسطر بالصفحة" })}
              >
                {PAGE_SIZES.map((n) => <option key={n} value={n}>{n}</option>)}
              </select>
              <span>
                {total ? `${(cur - 1) * size + 1}-${Math.min(cur * size, total)}` : 0} / {n0(total)}
              </span>
              <button
                type="button" className="odv-tool" disabled={cur <= 1}
                onClick={() => setPage(cur - 1)} aria-label="previous"
              >
                {Ico.prev(rtl)}
              </button>
              <button
                type="button" className="odv-tool" disabled={cur >= pages}
                onClick={() => setPage(cur + 1)} aria-label="next"
              >
                {Ico.next(rtl)}
              </button>
            </span>
          )}

          <span className="odv-views">
            <button
              type="button" className={`odv-vbtn ${view === "list" ? "on" : ""}`}
              onClick={() => setView("list")} title={t({ en: "List", ar: "قائمة" })}
            >
              <Ico.List />
            </button>
            <button
              type="button" className={`odv-vbtn ${view === "pivot" ? "on" : ""}`}
              onClick={() => setView("pivot")} title={t({ en: "Pivot", ar: "محوري" })}
            >
              <Ico.Pivot />
            </button>
          </span>
        </div>
      </div>

      {/* شريط التحديد */}
      {sel.size > 0 && (
        <div className="odv-selbar bk-noprint">
          <b>{n0(sel.size)}</b> {t({ en: "selected", ar: "سطر محدّد" })}
          <span style={{ color: "#7d6473" }}>
            {t({ en: "Total", ar: "الإجمالي" })}:{" "}
            {n2(sorted.filter((m) => sel.has(m.id)).reduce((s, m) => s + m.qty, 0))} KG
          </span>
          <button
            type="button"
            onClick={() => {
              const rowsSel = sorted.filter((m) => sel.has(m.id));
              const head = aoa[0];
              const idx = new Map(sorted.map((m, i) => [m.id, i + 1]));
              onExportCsv?.([head, ...rowsSel.map((m) => aoa[idx.get(m.id)])],
                `product_moves_selection.csv`);
            }}
          >
            ⬇ {t({ en: "Export selection", ar: "تصدير المحدّد" })}
          </button>
          <button type="button" onClick={() => setSel(new Set())}>
            ✕ {t({ en: "Clear", ar: "إلغاء التحديد" })}
          </button>
        </div>
      )}

      {/* الجدول أو المحوري */}
      {view === "pivot" && pivot ? (
        <div className="odv-pv">
          <div style={{ marginBottom: 10, display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            <b style={{ color: "#555" }}>{t({ en: "Rows", ar: "الصفوف" })}:</b>
            <select
              value={pivotDim} onChange={(e) => setPivotDim(e.target.value)}
              style={{ border: "1px solid #d5d5d5", borderRadius: 4, padding: "4px 8px", fontFamily: "inherit" }}
            >
              {GROUPS.map((g) => <option key={g.id} value={g.id}>{L(g)}</option>)}
            </select>
          </div>
          <table>
            <thead>
              <tr>
                <th>{pivot.label}</th>
                <th>{t({ en: "Operations", ar: "العمليات" })}</th>
                <th>{t({ en: "Raw consumed", ar: "الخام المستهلك" })}</th>
                <th>{t({ en: "Finished", ar: "المنتج النهائي" })}</th>
                <th>{t({ en: "Waste", ar: "الهدر" })}</th>
                <th>{t({ en: "Bone", ar: "العظم" })}</th>
                <th>{t({ en: "Yield %", ar: "التصافي ٪" })}</th>
              </tr>
            </thead>
            <tbody>
              {pivot.rows.map((r) => (
                <tr key={r.key}>
                  <th style={{ textAlign: "start" }}>{r.key}</th>
                  <td className="num">{n0(r.ops)}</td>
                  <td className="num">{n2(r.raw)}</td>
                  <td className="num">{n2(r.product)}</td>
                  <td className="num">{n2(r.waste)}</td>
                  <td className="num">{n2(r.bone)}</td>
                  <td className="num">{r.yield.toFixed(1)}%</td>
                </tr>
              ))}
              <tr className="tot">
                <th style={{ textAlign: "start" }}>{t({ en: "Total", ar: "الإجمالي" })}</th>
                <td className="num">{n0(pivot.tot.ops)}</td>
                <td className="num">{n2(pivot.tot.raw)}</td>
                <td className="num">{n2(pivot.tot.product)}</td>
                <td className="num">{n2(pivot.tot.waste)}</td>
                <td className="num">{n2(pivot.tot.bone)}</td>
                <td className="num">{pivot.tot.yield.toFixed(1)}%</td>
              </tr>
            </tbody>
          </table>
        </div>
      ) : (
        <div className="odv-tw">
          <table className="odv-table">
            <thead>
              <tr>
                <th className="odv-cbx">
                  <input
                    type="checkbox"
                    checked={paged.length > 0 && paged.every((m) => sel.has(m.id))}
                    onChange={(e) =>
                      setSel(e.target.checked ? new Set(paged.map((m) => m.id)) : new Set())}
                    aria-label="select all"
                  />
                </th>
                {cols.map((c) => (
                  <th
                    key={c.id} className={c.num ? "num" : ""} style={{ minWidth: c.w }}
                    onClick={() => toggleSort(c.sort)}
                  >
                    {L(c)}
                    <span className="sc">{sort.key === c.sort ? (sort.dir === "asc" ? "▲" : "▼") : ""}</span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {bodyRows.length ? bodyRows : (
                <tr>
                  <td colSpan={cols.length + 1} style={{ textAlign: "center", padding: 30, color: "#999" }}>
                    {t({ en: "No product move matches this search.", ar: "ما في أي حركة مطابقة لهذا البحث." })}
                  </td>
                </tr>
              )}
            </tbody>
            <tfoot>
              <tr>
                <td className="odv-cbx" />
                {cols.map((c, i) => {
                  if (c.id === "qty") {
                    return (
                      <td key={c.id} className="num">
                        <span style={{ color: "#1f7a44" }}>{n2(sums.outQty)}</span>
                        <span className="odv-sub">
                          {t({ en: "raw", ar: "خام" })} {n2(sums.inQty)} · {t({ en: "waste", ar: "هدر" })} {n2(sums.wasteQty)}
                        </span>
                      </td>
                    );
                  }
                  if (c.id === "pct") {
                    return (
                      <td key={c.id} className="num">
                        {pctOf(sums.outQty, sums.inQty || (sums.outQty + sums.wasteQty)).toFixed(2)}%
                        <span className="odv-sub">{t({ en: "net yield", ar: "التصافي الصافي" })}</span>
                      </td>
                    );
                  }
                  if (i === 0) {
                    return (
                      <td key={c.id}>
                        {n0(sums.n)} {t({ en: "lines", ar: "سطر" })} · {n0(sums.ops)} {t({ en: "ops", ar: "عملية" })}
                      </td>
                    );
                  }
                  if (c.id === "uom") return <td key={c.id}>KG</td>;
                  return <td key={c.id} className={c.num ? "num" : ""} />;
                })}
              </tr>
            </tfoot>
          </table>
        </div>
      )}

      {/* نافذة السجل — استمارة Odoo */}
      {rec && (
        <RecordDialog rec={rec} t={t} isAr={isAr} onClose={() => setRec(null)} />
      )}
    </div>
  );
}

/* ══════════════ نافذة السجل ══════════════ */

function RecordDialog({ rec, t, isAr, onClose }) {
  useEffect(() => {
    const onEsc = (e) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onEsc);
    return () => document.removeEventListener("keydown", onEsc);
  }, [onClose]);

  const st = rec.reviewStatus === "approved" ? "done"
    : rec.reviewStatus === "rejected" ? "cancel" : "waiting";
  const F = ({ k, v }) => (
    <div className="odv-fr"><span className="k">{k}</span><span className="v">{v || "—"}</span></div>
  );

  return (
    <div className="odv-mask bk-noprint" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="odv-dlg odv" role="dialog" aria-modal="true">
        <div className="odv-dlg-head">
          <b>{t({ en: "Cutting Operation", ar: "عملية تقطيع" })}</b>
          <span style={{ opacity: .85 }}>{rec.opNo || "—"}</span>
          <button type="button" className="odv-dlg-x" onClick={onClose} aria-label="close">✕</button>
        </div>

        <div className="odv-sheet">
          <div className="odv-statusbar">
            <span className={`odv-st ${st === "waiting" ? "on" : ""}`}>{t({ en: "Waiting", ar: "قيد المراجعة" })}</span>
            <span className={`odv-st ${st === "done" ? "on" : ""}`}>{t({ en: "Done", ar: "مكتملة" })}</span>
            <span className={`odv-st ${st === "cancel" ? "on" : ""}`}>{t({ en: "Cancelled", ar: "مرفوضة" })}</span>
          </div>

          <div className="odv-fh">{rec.opNo || t({ en: "Unnumbered operation", ar: "عملية بلا رقم" })}</div>

          <div className="odv-fg">
            <div>
              <F k={t({ en: "Cut date", ar: "تاريخ التقطيع" })} v={`${rec.day} ${rec.time || ""}`} />
              <F k={t({ en: "Location", ar: "الموقع" })} v={`${rec.branchName} (${rec.branchCode || "—"})`} />
              <F k={t({ en: "Butcher", ar: "القصاب" })} v={rec.employeeNo} />
              <F k={t({ en: "BOM", ar: "الوصفة" })} v={rec.bomRef} />
              <F k={t({ en: "Pathway", ar: "المسار" })} v={rec.pathwayLabel} />
              <F k={t({ en: "Category", ar: "الفئة" })} v={rec.bomCatName} />
            </div>
            <div>
              <F k={t({ en: "Raw material", ar: "المادة الخام" })}
                v={`${rec.inputSku ? `[${rec.inputSku}] ` : ""}${rec.inputName}`} />
              <F k={t({ en: "Consumed", ar: "المستهلك" })} v={`${n2(rec.carcassKg || rec.baseKg)} KG`} />
              <F k={t({ en: "Produced", ar: "النواتج" })} v={`${n2(rec.cutsKg)} KG`} />
              <F k={t({ en: "Waste", ar: "الهدر" })} v={`${n2(rec.wasteKg)} KG`} />
              <F k={t({ en: "Yield", ar: "التصافي" })} v={`${rec.yieldPct.toFixed(2)}%`} />
              <F k={t({ en: "Checked by", ar: "تدققت من قبل" })}
                v={rec.review?.by ? `${rec.review.by} · ${String(rec.review.at || "").slice(0, 16).replace("T", " ")}` : ""} />
            </div>
          </div>

          {Math.abs(rec.unaccountedKg) > 0.005 && (
            <div style={{ marginTop: 10, color: "#d9534f", fontWeight: 600 }}>
              ⚠️ {t({ en: "Unaccounted weight", ar: "فاقد غير مسجّل" })}: {n2(rec.unaccountedKg)} KG
            </div>
          )}
          {rec.review?.reason && (
            <div style={{ marginTop: 6, color: "#d9534f" }}>
              {t({ en: "Reason", ar: "السبب" })}: {rec.review.reason}
            </div>
          )}

          <div className="odv-nb">
            <span className="odv-nb-t">{t({ en: "Moves", ar: "الحركات" })}</span>
            <div className="odv-tw" style={{ maxHeight: 320, minHeight: 0, marginTop: 8 }}>
              <table className="odv-table">
                <thead>
                  <tr>
                    <th>{t({ en: "Product", ar: "المنتج" })}</th>
                    <th>{t({ en: "Product Type", ar: "نوع المنتج" })}</th>
                    <th className="num">{t({ en: "Quantity", ar: "الكمية" })}</th>
                    <th>{t({ en: "UoM", ar: "الوحدة" })}</th>
                    <th className="num">{t({ en: "Target", ar: "الهدف" })}</th>
                    <th className="num">{t({ en: "Actual %", ar: "النسبة الفعلية" })}</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="odv-row">
                    <td>{rec.inputSku ? <span className="odv-sku">[{rec.inputSku}] </span> : null}{rec.inputName}</td>
                    <td><span className="odv-tag raw">{t({ en: "Raw material", ar: "مادة خام" })}</span></td>
                    <td className="num">{n2(rec.carcassKg || rec.baseKg)}</td>
                    <td>KG</td>
                    <td className="num">—</td>
                    <td className="num">100.00%</td>
                  </tr>
                  {rec.cuts.map((c, i) => (
                    <tr className="odv-row" key={`${c.itemId || c.name}_${i}`}>
                      <td>{c.sku ? <span className="odv-sku">[{c.sku}] </span> : null}{c.name}</td>
                      <td>
                        <span className={`odv-tag ${c.isWaste ? (c.kind === "bone" ? "bone" : "waste") : "product"}`}>
                          {c.isWaste
                            ? (c.kind === "bone" ? t({ en: "Bone", ar: "عظم" }) : t({ en: "Waste", ar: "هدر" }))
                            : t({ en: "Finished product", ar: "منتج نهائي" })}
                        </span>
                      </td>
                      <td className="num">{n2(c.weightKg)}</td>
                      <td>{c.uom || "KG"}</td>
                      <td className="num">{c.targetKg ? n2(c.targetKg) : "—"}</td>
                      <td className="num">
                        {pctOf(c.weightKg, rec.baseKg).toFixed(2)}%
                        {c.deltaPct !== null && (
                          <span className={`odv-sub ${Math.abs(c.deltaPct) > 10 ? "odv-warn" : "odv-ok"}`}>
                            {c.deltaPct > 0 ? "▲" : "▼"} {Math.abs(c.deltaPct).toFixed(1)}%
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
