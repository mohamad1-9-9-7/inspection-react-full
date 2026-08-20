// src/pages/butcher/butcherReportKit.jsx
//
// 🎨 عُدّة تقارير الجزار — تصميم موحّد + طبقة بيانات واحدة.
// Shared design system + data layer for the butcher report pages.
//
// الصفحتان (عرض التقارير · التقرير الشامل) تبنيان عليها، فما في تكرار
// ولا اختلاف بالشكل. الموديل الجديد: كل سجل = تنفيذ وصفة تقطيع (BOM):
//   مادة خام داخلة → منتجات نهائية + هدر ، مع أوزان فعلية وأوزان مستهدفة.
// السجلات القديمة (ذبيحة/منشأ/درجة) تُقرأ كما هي بلا كسر.

import React, { useCallback, useEffect, useMemo, useState } from "react";
import API_BASE from "../../config/api";
import { BRANCHES, TYPE, isSpecialCut, nameOf } from "./butcherOptions";
import { butcherLabel, isLocked, useButcherConfig } from "./butcherConfig";
import { useMrpConfig } from "./butcherMrpBridge";

/* ══════════════ أدوات ══════════════ */

export const todayStr = () => new Date().toISOString().slice(0, 10);
export const shiftDays = (n) => {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
};
export const monthStart = () => `${new Date().toISOString().slice(0, 7)}-01`;

export const kg = (n) => (Number(n) || 0).toFixed(2);
export const pct = (part, whole) => (whole > 0 ? (part / whole) * 100 : 0);
export const num = (v) => Number(v) || 0;

export function toArray(data) {
  return (
    (Array.isArray(data) && data) ||
    (Array.isArray(data?.data) && data.data) ||
    (Array.isArray(data?.items) && data.items) ||
    (Array.isArray(data?.reports) && data.reports) ||
    []
  );
}

/* ══════════════ طبقة البيانات ══════════════ */

/* سقف السحب للتقارير — أقصى ما يقبله السيرفر. يُطبَّق بعد فلتر التاريخ،
   فهو سقف لنافذة المدى المختار لا لكل الجدول. إن بلغته النتيجة فالمدى
   يحوي أكثر مما رجع، فنُظهر تحذيراً بدل أن نقصّ الأقدم بصمت. */
export const REPORT_LIMIT = 5000;

/**
 * تحميل سجلات الجزار وتطبيعها لصفوف جاهزة للعرض.
 * كل صف = تنفيذ واحد (ذبيحة/وصفة) مع مصفوفة قطعه.
 */
export function useButcherData({ from = "", to = "" } = {}) {
  const { cfg } = useButcherConfig();
  const { cfg: mrpCfg } = useMrpConfig({ refetchOnFocus: false });
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  // بلغنا السقف؟ إذاً المدى أوسع مما يُرجَع، ولازم نقولها بدل القصّ الصامت
  const [truncated, setTruncated] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      // نطلب نافذة التاريخ من السيرفر بدل سحب كل السجلات وفلترتها بالمتصفّح.
      // خوادم أقدم تتجاهل from/to وترجّع الكل — والصفحة تفلتر محلياً على أي حال،
      // فالنتيجة صحيحة قبل نشر السيرفر وبعده، والفرق في حجم الطلب فقط.
      const range = [
        from ? `&from=${encodeURIComponent(from)}` : "",
        to ? `&to=${encodeURIComponent(to)}` : "",
      ].join("");
      const res = await fetch(
        `${API_BASE}/api/reports?type=${encodeURIComponent(TYPE)}&limit=${REPORT_LIMIT}${range}`,
        { headers: { Accept: "application/json" }, cache: "no-store" }
      );
      if (!res.ok) throw new Error(`Server ${res.status}`);
      const rows = toArray(await res.json());
      setRecords(rows);
      setTruncated(rows.length >= REPORT_LIMIT);
    } catch (e) {
      setError(e?.message || "Failed to load");
      setRecords([]);
      setTruncated(false);
    } finally {
      setLoading(false);
    }
  }, [from, to]);

  useEffect(() => { load(); }, [load]);

  return { records, loading, error, truncated, reload: load, cfg, mrpCfg };
}

/** اسم تعريف (منشأ/نوع) من قائمة إعدادات التصنيع. */
const defName = (list, id, isAr) => {
  const x = (list || []).find((y) => y.id === id);
  return x ? nameOf(x, isAr) || x.id : "";
};

/** اسم فئة الوصفة من إعدادات التصنيع. */
const bomCatName = (mrpCfg, id, isAr) => {
  const c = (mrpCfg?.bomCategories || []).find((x) => x.id === id);
  return c ? nameOf(c, isAr) || c.id : "";
};

/**
 * سجل خام → صف مُطبَّع. يدعم الموديلين:
 *   الجديد mode="bom"  → وصفة + مادة خام + نواتج/هدر بحقل kind
 *   القديم whole/pieces → ذبيحة + منشأ + قطع
 */
export function normalizeRecord(rec, { cfg, mrpCfg, isAr }) {
  const p = rec?.payload || {};
  const isBom = p.mode === "bom" || !!p.bomId;

  // تاريخ التقطيع هو تاريخ السجل، وتاريخ الإدخال منفصل
  const day = String(p.cutDate || p.date || p.reportDate || rec?.created_at || "").slice(0, 10);
  const entryDay = String(p.entryDate || p.savedAt || p.reportDate || "").slice(0, 10);
  const iso = p.entryAt || p.savedAt || p.reportDate || rec?.created_at;
  const d = iso ? new Date(iso) : null;
  const time = d && !Number.isNaN(d.getTime())
    ? d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })
    : "";

  const branchObj = BRANCHES.find((b) => b.code === p.branch) || null;

  // النوع/المنشأ: اللقطة المحفوظة أولاً، وإلا تعريف الوصفة الحالي (سجلات قديمة)
  const bomDef = p.bomId ? (mrpCfg?.boms || []).find((b) => b.id === p.bomId) || null : null;
  const kindId = p.bomKindId || bomDef?.kindId || "";
  const originId = p.bomOriginId || bomDef?.originId || "";

  const rawCuts = Array.isArray(p.cuts) && p.cuts.length
    ? p.cuts
    : [{ cutId: p.cutId, cut: p.cut, weightKg: p.weightKg, wasteBoneKg: p.wasteBoneKg }];

  const cuts = rawCuts.map((c) => {
    // الأسماء محفوظة وقت الإدخال — لقطة موثوقة، مع رجوع للّغة الأخرى
    const name = (isAr ? c.cut : c.cutEn) || c.cut || c.cutEn || "—";
    const alt = (isAr ? c.cutEn : c.cut) || "";
    const kind = c.kind || (isSpecialCut(c.cutId) ? "waste" : "product");
    const weightKg = num(c.weightKg);
    const targetKg = num(c.targetKg);
    return {
      itemId: c.itemId || c.cutId || "",
      name,
      nameAlt: alt && alt !== name ? alt : "",
      sku: c.sku || c.code || "",
      uom: c.uom || "KG",
      kind,
      isWaste: kind !== "product",
      weightKg,
      targetKg,
      // انحراف عن هدف الوصفة (٪) — يظهر فقط لما يكون في هدف
      deltaPct: targetKg > 0 ? ((weightKg - targetKg) / targetKg) * 100 : null,
    };
  });

  const carcassKg = num(p.carcassWeightKg);
  const cutsKg = cuts.reduce((s, c) => s + (c.isWaste ? 0 : c.weightKg), 0);
  const wasteKg = cuts.reduce((s, c) => s + num(c.wasteBoneKg) + (c.isWaste ? c.weightKg : 0), 0);
  // بلا وزن مادة خام (سجلات الأجزاء القديمة) الأساس = المُدخَل كلّه
  const baseKg = carcassKg > 0 ? carcassKg : cutsKg + wasteKg;
  const accounted = cutsKg + wasteKg;

  return {
    id: rec.id || rec._id || p.savedAt,
    rec, payload: p, isBom,
    day, entryDay, time,
    // رقم العملية المميّز — «POS 10 — 00001»، يخصّصه السيرفر لكل فرع على حدة.
    // السجلات القديمة (قبل التفعيل) بلا رقم — نعرضها بشرطة بدل فراغ.
    opNo: p.refNo || "",
    employeeNo: p.butcherName
      ? `${p.butcherName} (${p.employeeNo || "—"})`
      : butcherLabel(cfg, p.employeeNo),
    employeeNoRaw: String(p.employeeNo || ""),
    butcherName: p.butcherName || "",
    locked: isLocked(cfg, day),
    branchCode: p.branch || "",
    branchName: branchObj ? nameOf(branchObj, isAr) : (isAr ? p.branchAr : p.branchEn) || "—",
    // الوصفة والمادة الخام (الموديل الجديد)
    bomId: p.bomId || "",
    bomRef: p.bomRef || "",
    bomCatId: p.bomCategoryId || "",
    bomCatName: bomCatName(mrpCfg, p.bomCategoryId, isAr),
    // المنشأ والنوع — اللقطة المحفوظة أولاً، ثم التعريف الحالي للسجلات الأقدم
    bomOriginId: originId,
    bomOriginName: (isAr ? p.bomOriginAr : p.bomOriginEn) || p.bomOriginAr || p.bomOriginEn
      || defName(mrpCfg?.bomOrigins, originId, isAr),
    bomKindId: kindId,
    bomKindName: (isAr ? p.bomKindAr : p.bomKindEn) || p.bomKindAr || p.bomKindEn
      || defName(mrpCfg?.bomKinds, kindId, isAr),
    // المسار (وضع المسارات المتعددة) — لقطة محفوظة وقت التسجيل
    pathwayId: p.pathwayId || "",
    pathwayCode: p.pathwayCode || "",
    pathwayName: p.pathwayName || "",
    pathwayLabel: p.pathwayCode
      ? (p.pathwayName ? `${p.pathwayCode} · ${p.pathwayName}` : p.pathwayCode)
      : "",
    inputItemId: p.inputItemId || "",
    inputSku: p.inputSku || "",
    inputName: (isAr ? p.animal : p.animalEn) || p.animal || p.animalEn || "—",
    inputNameAlt: (() => {
      const main = (isAr ? p.animal : p.animalEn) || p.animal || p.animalEn || "";
      const alt = (isAr ? p.animalEn : p.animal) || "";
      return alt && alt !== main ? alt : "";
    })(),
    pieceCount: Number.isFinite(Number(p.pieceCount)) && p.pieceCount !== null
      ? Number(p.pieceCount) : null,
    // الأوزان
    carcassKg, cutsKg, wasteKg, baseKg, cuts,
    // الفاقد غير المسجّل = خام − (نواتج + هدر)
    unaccountedKg: carcassKg > 0 ? carcassKg - accounted : 0,
    yieldPct: pct(cutsKg, baseKg),
    wastePct: pct(wasteKg, baseKg),
    review: p.review || null,
    reviewStatus: p.review?.status || "",
  };
}

/** كل الصفوف المُطبَّعة مرتّبة (الأحدث أولاً). */
export function useNormalizedRows(records, { cfg, mrpCfg, isAr }) {
  return useMemo(
    () =>
      records
        .map((r) => normalizeRecord(r, { cfg, mrpCfg, isAr }))
        .sort((a, b) => `${b.day}${b.time}`.localeCompare(`${a.day}${a.time}`)),
    [records, cfg, mrpCfg, isAr]
  );
}

/** مجاميع مجموعة صفوف. */
export function totalsOf(rows) {
  const carcassKg = rows.reduce((s, r) => s + r.carcassKg, 0);
  const baseKg = rows.reduce((s, r) => s + r.baseKg, 0);
  const cutsKg = rows.reduce((s, r) => s + r.cutsKg, 0);
  const wasteKg = rows.reduce((s, r) => s + r.wasteKg, 0);
  const pieces = rows.reduce((s, r) => s + (r.pieceCount || 0), 0);
  return {
    count: rows.length,
    butchers: new Set(rows.map((r) => r.employeeNoRaw)).size,
    boms: new Set(rows.map((r) => r.bomRef).filter(Boolean)).size,
    carcassKg, cutsKg, wasteKg, baseKg, pieces,
    unaccountedKg: rows.reduce((s, r) => s + r.unaccountedKg, 0),
    yieldPct: pct(cutsKg, baseKg),
    wastePct: pct(wasteKg, baseKg),
    avgCarcass: rows.length ? carcassKg / rows.length : 0,
  };
}

/**
 * تجميع هرمي متعدّد المستويات (Branch → Butcher → Pathway → …).
 * `levels` = مصفوفة من { key, label } حيث key اسم حقل بالصف أو دالة (r)=>value.
 * يرجّع شجرة عقد: { key, label, level, totals, rows, children[] }.
 */
export function groupTree(rows, levels) {
  const build = (list, depth) => {
    if (depth >= levels.length) return null;
    const { key, label } = levels[depth];
    const get = typeof key === "function" ? key : (r) => r[key];
    const map = new Map();
    list.forEach((r) => {
      const raw = get(r);
      const k = raw === "" || raw === null || raw === undefined ? "—" : String(raw);
      if (!map.has(k)) map.set(k, []);
      map.get(k).push(r);
    });
    return [...map.entries()]
      .map(([k, sub]) => ({
        key: k,
        label: typeof label === "function" ? label(sub[0], k) : k,
        levelKey: typeof key === "function" ? `lvl${depth}` : key,
        depth,
        totals: totalsOf(sub),
        rows: sub,
        children: build(sub, depth + 1),
      }))
      .sort((a, b) => b.totals.carcassKg - a.totals.carcassKg);
  };
  return build(rows, 0);
}

/** تفصيل الهدر — تجميع أسطر الهدر عبر الصفوف حسب الصنف. */
export function wasteBreakdown(rows) {
  const map = new Map();
  rows.forEach((r) => {
    r.cuts.forEach((c) => {
      if (!c.isWaste || !(c.weightKg > 0)) return;
      const k = c.itemId || c.name;
      if (!map.has(k)) map.set(k, { name: c.name, nameAlt: c.nameAlt, sku: c.sku, kg: 0, n: 0 });
      const g = map.get(k);
      g.kg += c.weightKg;
      g.n += 1;
    });
  });
  return [...map.values()].sort((a, b) => b.kg - a.kg);
}

/** فلتر متعدّد القيم — إذا `sel` فاضية يمرّ الكل، وإلا لازم القيمة ضمنها. */
export const inSet = (sel, value) => !sel || sel.length === 0 || sel.includes(value);

/* ══════════════ التصميم ══════════════ */

export const FONT = "Cairo, system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif";

/** لوحة «Soft Sky» — فاتحة، هادئة، عالية التباين للقراءة. */
export const C = {
  ink: "#0f2740",
  ink2: "#3c5a75",
  muted: "#7b93a8",
  line: "#e3edf7",
  line2: "#d3e2f0",
  bg: "#eef4fb",
  card: "#ffffff",
  soft: "#f7fbff",
  blue: "#1f6fd0",
  blueDk: "#14507f",
  teal: "#0f766e",
  green: "#047857",
  amber: "#b45309",
  red: "#b91c1c",
  violet: "#6d28d9",
};

/** CSS مشترك — يتغلّب على `#root *{font-size:14px!important}` بكلاس أخصّ. */
export const KIT_CSS = `
#root .bk, #root .bk * { font-size: 15px !important; }
#root .bk table, #root .bk table * { font-size: 14px !important; }
#root .bk-title { font-size: 26px !important; font-weight: 900 !important; }
#root .bk-sub   { font-size: 13px !important; }
#root .bk-sec   { font-size: 17px !important; font-weight: 900 !important; }
#root .bk-num   { font-size: 26px !important; font-weight: 900 !important; }
#root .bk-lbl   { font-size: 12px !important; font-weight: 800 !important; }
#root .bk-chip  { font-size: 13px !important; }
#root .bk thead th { position: sticky; top: 0; z-index: 3; }
#root .bk tbody tr { transition: background .12s ease; }
#root .bk tbody tr:hover { background: #f2f8ff !important; }
#root .bk-press { transition: transform .12s ease, box-shadow .12s ease; }
#root .bk-press:hover { transform: translateY(-2px); box-shadow: 0 10px 26px rgba(15,39,64,.10); }
@keyframes bkShimmer { 0% { background-position: -400px 0 } 100% { background-position: 400px 0 } }
#root .bk-skel {
  height: 14px; border-radius: 7px;
  background: linear-gradient(90deg,#eef4fb 25%,#f7fbff 50%,#eef4fb 75%);
  background-size: 800px 100%; animation: bkShimmer 1.2s infinite linear;
}
@keyframes bkRise { from { opacity: 0; transform: translateY(10px) } to { opacity: 1; transform: none } }
#root .bk-rise { animation: bkRise .3s ease both; }
/* ═══ الموبايل: مساحات أضيق وأعمدة واحدة ═══ */
@media (max-width: 820px) {
  #root .bk, #root .bk * { font-size: 14px !important; }
  #root .bk table, #root .bk table * { font-size: 12.5px !important; }
  #root .bk-title { font-size: 20px !important; }
  #root .bk-num   { font-size: 21px !important; }
  #root .bk-sec   { font-size: 15px !important; }
  /* الصفحة والبطاقات: حشو أقل حتى لا تضيع المساحة */
  #root .bk-page { padding: 12px 10px 34px !important; }
  #root .bk-card { padding: 12px !important; border-radius: 14px !important; margin-bottom: 12px !important; }
  /* شريط الأدوات عمود واحد — وإلغاء أي امتداد عمودين */
  #root .bk-tools { grid-template-columns: 1fr !important; }
  #root .bk-tools > * { grid-column: auto !important; }
  /* أزرار الترويسة تملأ العرض بدل ما تنضغط */
  #root .bk-actions { width: 100%; }
  #root .bk-actions > * { flex: 1 1 auto; text-align: center; }
  /* المؤشّرات: عمودان */
  #root .bk-kpis { grid-template-columns: repeat(2,1fr) !important; }
  /* رأس البطاقة: العنوان فوق والأدوات تحته بعرض كامل */
  #root .bk-cardhead > *:last-child { margin-inline-start: 0 !important; width: 100%; }
  /* تمرير أنعم للجداول العريضة على اللمس */
  #root .bk-tablewrap { -webkit-overflow-scrolling: touch; }
}
@media (max-width: 460px) {
  #root .bk-kpis { grid-template-columns: 1fr !important; }
}
@media print {
  #root .bk-noprint { display: none !important; }
  #root .bk { background: #fff !important; padding: 0 !important; }
  #root .bk-card { box-shadow: none !important; border: 1px solid #ccc !important; }
  #root .bk-block { break-inside: avoid; }
  #root .bk-pagebreak { break-before: page; }
  @page { size: A4 landscape; margin: 10mm; }
}
`;

export const S = {
  page: {
    minHeight: "100vh", background: C.bg, fontFamily: FONT, color: C.ink,
    padding: "18px 16px 48px",
  },
  wrap: { maxWidth: 1500, margin: "0 auto" },

  /* ترويسة */
  head: {
    display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap",
    marginBottom: 16,
  },
  headIcon: {
    width: 52, height: 52, borderRadius: 16, display: "grid", placeItems: "center",
    background: "linear-gradient(135deg,#1f6fd0,#14507f)", color: "#fff", fontSize: 26,
    boxShadow: "0 10px 24px rgba(31,111,208,.30)", flexShrink: 0,
  },
  headText: { minWidth: 0, flex: 1 },
  sub: { color: C.muted, fontWeight: 700, marginTop: 2 },
  headActions: { display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" },

  /* بطاقات */
  card: {
    background: C.card, border: `1px solid ${C.line}`, borderRadius: 18,
    padding: 16, boxShadow: "0 2px 10px rgba(15,39,64,.04)", marginBottom: 16,
  },
  cardHead: {
    display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", marginBottom: 12,
  },
  cardIcon: { fontSize: 20 },
  cardTitle: { fontWeight: 900, color: C.blueDk, margin: 0 },
  cardSub: { color: C.muted, fontWeight: 700 },

  /* أزرار */
  btn: {
    border: `1px solid ${C.line2}`, background: "#fff", color: C.ink2,
    borderRadius: 12, padding: "10px 16px", fontWeight: 800, fontFamily: FONT,
    cursor: "pointer", whiteSpace: "nowrap",
  },
  btnPrimary: { background: C.blue, borderColor: C.blue, color: "#fff" },
  btnGhost: { background: "transparent" },
  btnSm: { padding: "7px 12px", borderRadius: 10 },

  /* حقول */
  input: {
    border: `1px solid ${C.line2}`, borderRadius: 12, padding: "10px 12px",
    fontFamily: FONT, fontWeight: 700, color: C.ink, background: "#fff",
    outline: "none", minWidth: 0, width: "100%", boxSizing: "border-box",
  },
  label: { display: "flex", flexDirection: "column", gap: 5, minWidth: 0 },

  /* مؤشرات */
  kpiGrid: {
    display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(min(180px,100%),1fr))",
    gap: 12, marginBottom: 16,
  },
  kpi: {
    background: C.card, border: `1px solid ${C.line}`, borderRadius: 16,
    padding: "14px 16px", display: "flex", flexDirection: "column", gap: 4,
    position: "relative", overflow: "hidden",
  },
  kpiBar: { position: "absolute", insetInlineStart: 0, top: 0, bottom: 0, width: 4 },

  /* جداول */
  tableWrap: {
    overflowX: "auto", border: `1px solid ${C.line}`, borderRadius: 14, background: "#fff",
  },
  table: { width: "100%", borderCollapse: "collapse", minWidth: 720 },
  th: {
    background: C.soft, color: C.blueDk, fontWeight: 900, textAlign: "start",
    padding: "12px 12px", borderBottom: `2px solid ${C.line2}`, whiteSpace: "nowrap",
  },
  td: { padding: "11px 12px", borderBottom: `1px solid ${C.line}`, verticalAlign: "middle" },
  tdNum: { textAlign: "end", fontVariantNumeric: "tabular-nums", fontWeight: 800 },

  /* عناصر صغيرة */
  chip: {
    display: "inline-flex", alignItems: "center", gap: 6, background: "#eaf2fc",
    color: C.blueDk, borderRadius: 999, padding: "4px 12px", fontWeight: 800,
    whiteSpace: "nowrap",
  },
  /* رقم العملية المميّز — «POS 10 — 00001» */
  opNo: {
    display: "inline-block", background: "#eef2ff", border: "1px solid #c7d2fe",
    color: "#3730a3", borderRadius: 8, padding: "2px 8px", fontWeight: 800,
    letterSpacing: ".3px", whiteSpace: "nowrap",
  },
  empty: {
    background: C.soft, border: `2px dashed ${C.line2}`, borderRadius: 16,
    padding: "40px 20px", textAlign: "center", fontWeight: 800, color: C.muted,
  },
  toolbar: {
    display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(min(180px,100%),1fr))",
    gap: 12, alignItems: "end",
  },
};

/* ══════════════ مكوّنات ══════════════ */

export function PageHead({ icon, title, sub, children }) {
  return (
    <div className="bk-noprint" style={S.head}>
      <span style={S.headIcon}>{icon}</span>
      <div style={S.headText}>
        <div className="bk-title">{title}</div>
        {sub ? <div className="bk-sub" style={S.sub}>{sub}</div> : null}
      </div>
      <div className="bk-actions" style={S.headActions}>{children}</div>
    </div>
  );
}

export function Card({ icon, title, sub, actions, children, style, className = "" }) {
  return (
    <section className={`bk-card bk-block ${className}`} style={{ ...S.card, ...style }}>
      {(title || actions) && (
        <div className="bk-cardhead" style={S.cardHead}>
          {icon ? <span style={S.cardIcon}>{icon}</span> : null}
          <div style={{ minWidth: 0, flex: 1 }}>
            {title ? <h2 className="bk-sec" style={S.cardTitle}>{title}</h2> : null}
            {sub ? <div className="bk-sub" style={S.cardSub}>{sub}</div> : null}
          </div>
          {actions}
        </div>
      )}
      {children}
    </section>
  );
}

/** مؤشّر رقمي مع شريط لوني وفرق اختياري عن الفترة السابقة. */
export function Kpi({ label, value, unit, color = C.blue, delta, hint }) {
  const up = Number(delta) > 0;
  const flat = delta === null || delta === undefined || Math.abs(Number(delta)) < 0.05;
  return (
    <div className="bk-press" style={S.kpi}>
      <span style={{ ...S.kpiBar, background: color }} />
      <span className="bk-lbl" style={{ color: C.muted }}>{label}</span>
      <span className="bk-num" style={{ color }}>
        {value}{unit ? <span style={{ fontSize: ".6em", marginInlineStart: 4 }}>{unit}</span> : null}
      </span>
      {!flat && (
        <span className="bk-lbl" style={{ color: up ? C.green : C.red }}>
          {up ? "▲" : "▼"} {Math.abs(Number(delta)).toFixed(1)}%
        </span>
      )}
      {hint ? <span className="bk-lbl" style={{ color: C.muted }}>{hint}</span> : null}
    </div>
  );
}

export function Chip({ children, tone }) {
  const tones = {
    green: { background: "#dcfce7", color: "#166534" },
    amber: { background: "#fef3c7", color: "#92400e" },
    red: { background: "#fee2e2", color: "#991b1b" },
    grey: { background: "#eef2f6", color: C.ink2 },
  };
  return <span className="bk-chip" style={{ ...S.chip, ...(tones[tone] || null) }}>{children}</span>;
}

export function EmptyBox({ children }) {
  return <div style={S.empty}>{children}</div>;
}

/**
 * ترجمة خطأ تقني لجملة يفهمها المستخدم — «Server 500» وحدها لا تقول شيئاً.
 * نُبقي النص التقني بالذيل ليساعد عند الإبلاغ عن المشكلة.
 */
export function explainError(err, t) {
  const raw = String(err?.message || err || "");
  const offline = typeof navigator !== "undefined" && navigator.onLine === false;

  if (offline) {
    return t({
      en: "No internet connection, so nothing could be loaded. Reconnect and try again.",
      ar: "ما في اتصال إنترنت، فما قدرنا نحمّل شي. رجّع الاتصال وجرّب كمان مرّة.",
    });
  }
  if (/Failed to fetch|NetworkError|Load failed/i.test(raw)) {
    return t({
      en: "Could not reach the server. It may be restarting — try again in a moment.",
      ar: "ما قدرنا نوصل للسيرفر. يمكن يكون عم يعيد التشغيل — جرّب بعد شوي.",
    });
  }
  if (/\b(401|403)\b/.test(raw)) {
    return t({
      en: "You are not allowed to read this data. Ask an administrator to grant access.",
      ar: "ما عندك صلاحية لقراءة هذه البيانات. راجع المدير لمنحك الصلاحية.",
    });
  }
  if (/\b5\d\d\b/.test(raw)) {
    return t({
      en: "The server hit an error while loading. Try again; if it repeats, report it.",
      ar: "صار خطأ بالسيرفر أثناء التحميل. جرّب كمان مرّة، وإذا تكرّر بلّغ عنه.",
    });
  }
  return t({ en: "Could not load the data.", ar: "تعذّر تحميل البيانات." });
}

/** شريط خطأ ظاهر — لا نترك الشاشة فاضية بلا تفسير. */
export function ErrorNote({ error, t, onRetry, tone = "red" }) {
  if (!error) return null;
  const red = tone === "red";
  return (
    <div
      role="alert"
      style={{
        ...S.card,
        background: red ? "#fff5f5" : "#fff7ed",
        borderColor: red ? "#f3c9c9" : "#fcd9a4",
        color: red ? C.red : "#8a5a12",
        fontWeight: 800, lineHeight: 1.7,
        display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap",
      }}
    >
      <span>⚠️ {explainError(error, t)}</span>
      <code style={{ opacity: 0.65, fontWeight: 700, fontSize: ".85em" }}>
        {String(error?.message || error || "")}
      </code>
      {onRetry && (
        <button
          type="button"
          style={{ ...S.btn, ...S.btnSm, marginInlineStart: "auto" }}
          onClick={onRetry}
        >
          ↻ {t({ en: "Try again", ar: "إعادة المحاولة" })}
        </button>
      )}
    </div>
  );
}

/** غلاف جدول — يمرّر أفقياً على الشاشات الضيّقة بدل ما يكسر التخطيط. */
export function TableWrap({ children, minWidth }) {
  return (
    <div className="bk-tablewrap" style={S.tableWrap}>
      <table style={{ ...S.table, ...(minWidth ? { minWidth } : null) }}>{children}</table>
    </div>
  );
}

export function Skeleton({ rows = 6 }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10, padding: 8 }}>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="bk-skel" style={{ width: `${92 - i * 6}%` }} />
      ))}
    </div>
  );
}

/** خلية انحراف عن الهدف — لون حسب البُعد. */
export function DeltaCell({ value }) {
  if (value === null || value === undefined || !Number.isFinite(value)) {
    return <span style={{ color: C.muted }}>—</span>;
  }
  const a = Math.abs(value);
  const color = a <= 5 ? C.green : a <= 10 ? C.amber : C.red;
  return (
    <span style={{ color, fontWeight: 900 }}>
      {value > 0 ? "+" : ""}{value.toFixed(1)}%
    </span>
  );
}

/** شريط نسبة أفقي مضغوط داخل الجداول. */
export function MiniBar({ value, max, color = C.blue }) {
  const w = max > 0 ? Math.max(2, Math.min(100, (value / max) * 100)) : 0;
  return (
    <span style={{
      display: "block", height: 8, borderRadius: 999, background: C.line, overflow: "hidden",
      minWidth: 60,
    }}>
      <span style={{ display: "block", height: "100%", width: `${w}%`, background: color }} />
    </span>
  );
}

/** رأس عمود قابل للفرز. */
export function SortTh({ label, col, sort, onSort, numeric }) {
  const on = sort.key === col;
  return (
    <th
      style={{ ...S.th, cursor: "pointer", ...(numeric ? { textAlign: "end" } : null) }}
      onClick={() => onSort(col)}
      title="Sort"
    >
      {label}{" "}
      <span style={{ color: on ? C.blue : C.line2 }}>{on ? (sort.dir === "asc" ? "▲" : "▼") : "⇅"}</span>
    </th>
  );
}

/** حالة المراجعة كشريحة ملوّنة. */
export function ReviewChip({ status, t }) {
  if (status === "approved") return <Chip tone="green">✓ {t({ en: "Approved", ar: "معتمد" })}</Chip>;
  if (status === "rejected") return <Chip tone="red">✕ {t({ en: "Rejected", ar: "مرفوض" })}</Chip>;
  return <Chip tone="grey">⏳ {t({ en: "Pending", ar: "قيد المراجعة" })}</Chip>;
}

/* ══════════════ تصدير ══════════════ */

/** تنزيل ورقة/أوراق Excel بلا تبعيات ثابتة (استيراد ديناميكي). */
export async function downloadExcel(sheets, filename) {
  const XLSX = await import("xlsx");
  const wb = XLSX.utils.book_new();
  sheets.forEach(({ name, aoa, widths }) => {
    const ws = XLSX.utils.aoa_to_sheet(aoa);
    if (widths) ws["!cols"] = widths.map((w) => ({ wch: w }));
    XLSX.utils.book_append_sheet(wb, ws, name.slice(0, 31));
  });
  XLSX.writeFile(wb, filename);
}

/**
 * تصدير PDF — جداول متعدّدة بترويسة وترقيم صفحات.
 * الاستيراد ديناميكي حتى لا تثقل jspdf الحزمة الأساسية.
 * ملاحظة: jsPDF بخطوطه المدمجة لا يرسم العربية، لذلك عناوين الـPDF إنجليزية
 * (نفس نهج الفواتير) — العربي يبقى على الشاشة وزر الطباعة.
 */
export async function downloadPdf({ title, meta = [], blocks = [], filename }) {
  const [pdfMod, tableMod] = await Promise.all([
    import("jspdf"),
    import("jspdf-autotable"),
  ]);
  // الحزمتان تصدّران default أحياناً و named أحياناً حسب الإصدار
  const JsPDF = pdfMod.default || pdfMod.jsPDF;
  const autoTable = tableMod.default || tableMod.autoTable || tableMod;

  const doc = new JsPDF({ orientation: "landscape", unit: "pt", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();

  doc.setFont("helvetica", "bold");
  doc.setFontSize(15);
  doc.text(title, pageW / 2, 34, { align: "center" });

  if (meta.length) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(110);
    doc.text(meta.join("   |   "), pageW / 2, 50, { align: "center" });
    doc.setTextColor(0);
  }

  let y = 64;
  blocks.forEach((b) => {
    if (!b.rows?.length) return;
    autoTable(doc, {
      head: [b.head],
      body: b.rows,
      startY: y,
      margin: { left: 24, right: 24 },
      styles: { fontSize: 7.5, cellPadding: 3, overflow: "linebreak" },
      headStyles: { fillColor: [31, 111, 208], textColor: 255, fontStyle: "bold" },
      alternateRowStyles: { fillColor: [246, 250, 255] },
      columnStyles: b.columnStyles || {},
      didDrawPage: () => {
        const p = doc.internal.getNumberOfPages();
        doc.setFontSize(8);
        doc.setTextColor(130);
        doc.text(
          `${b.title || ""}`,
          24,
          doc.internal.pageSize.getHeight() - 14
        );
        doc.text(
          `Page ${p}`,
          pageW - 24,
          doc.internal.pageSize.getHeight() - 14,
          { align: "right" }
        );
        doc.setTextColor(0);
      },
    });
    y = (doc.lastAutoTable?.finalY ?? y) + 22;
    // لا نبدأ جدولاً جديداً بذيل الصفحة
    if (y > doc.internal.pageSize.getHeight() - 90) {
      doc.addPage();
      y = 40;
    }
  });

  doc.save(filename);
}

/**
 * منتقي متعدّد القيم — زر يفتح قائمة بحث + خانات اختيار.
 * `options` = [{ value, label }] · `value` = مصفوفة القيم المختارة · `onChange(next)`.
 */
export function MultiPicker({ label, options, value = [], onChange, t, placeholder }) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const boxRef = React.useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const onDown = (e) => { if (boxRef.current && !boxRef.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  const shown = q.trim()
    ? options.filter((o) => String(o.label).toLowerCase().includes(q.trim().toLowerCase()))
    : options;
  const toggle = (v) =>
    onChange(value.includes(v) ? value.filter((x) => x !== v) : [...value, v]);

  const summary = value.length === 0
    ? (placeholder || t({ en: "All", ar: "الكل" }))
    : `${value.length} ${t({ en: "selected", ar: "مختار" })}`;

  return (
    <label style={S.label}>
      {label && <span className="bk-lbl" style={{ color: C.muted }}>{label}</span>}
      <div ref={boxRef} style={{ position: "relative", minWidth: 0 }}>
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          style={{ ...S.input, textAlign: "start", cursor: "pointer", display: "flex", alignItems: "center", gap: 8 }}
        >
          <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
            color: value.length ? C.ink : C.muted, fontWeight: 800 }}>{summary}</span>
          {value.length > 0 && (
            <span
              role="button"
              onClick={(e) => { e.stopPropagation(); onChange([]); }}
              style={{ color: C.muted, fontWeight: 900 }}
              title={t({ en: "Clear", ar: "مسح" })}
            >✕</span>
          )}
          <span style={{ color: C.muted }}>▾</span>
        </button>
        {open && (
          <div style={{
            position: "absolute", zIndex: 60, insetInlineStart: 0, top: "calc(100% + 4px)",
            width: "min(320px, 86vw)", background: "#fff", border: `1px solid ${C.line2}`,
            borderRadius: 12, boxShadow: "0 18px 40px rgba(15,39,64,.20)", overflow: "hidden",
          }}>
            <div style={{ padding: 8, borderBottom: `1px solid ${C.line}` }}>
              <input
                autoFocus value={q} onChange={(e) => setQ(e.target.value)}
                placeholder={t({ en: "Search…", ar: "بحث…" })}
                style={{ ...S.input, padding: "8px 10px" }}
              />
            </div>
            <div style={{ maxHeight: 260, overflowY: "auto" }}>
              {shown.length === 0 ? (
                <div className="bk-lbl" style={{ padding: 12, color: C.muted }}>
                  {t({ en: "No match", ar: "لا يوجد مطابق" })}
                </div>
              ) : shown.map((o) => {
                const on = value.includes(o.value);
                return (
                  <button
                    key={o.value} type="button" onClick={() => toggle(o.value)}
                    style={{
                      display: "flex", alignItems: "center", gap: 10, width: "100%",
                      textAlign: "start", border: "none", background: on ? "#eaf2fc" : "transparent",
                      padding: "9px 12px", cursor: "pointer", fontFamily: FONT, color: C.ink,
                      fontWeight: 700, borderBottom: `1px solid ${C.soft}`,
                    }}
                  >
                    <span style={{
                      width: 18, height: 18, borderRadius: 5, flexShrink: 0,
                      border: `2px solid ${on ? C.blue : C.line2}`, background: on ? C.blue : "#fff",
                      color: "#fff", display: "grid", placeItems: "center", fontSize: 12,
                    }}>{on ? "✓" : ""}</span>
                    <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis" }}>{o.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </label>
  );
}

/** فرز عام يحترم النصوص والأرقام. */
export function sortRows(rows, key, dir) {
  const s = [...rows].sort((a, b) => {
    const av = a[key];
    const bv = b[key];
    if (typeof av === "number" && typeof bv === "number") return av - bv;
    return String(av ?? "").localeCompare(String(bv ?? ""), undefined, { numeric: true });
  });
  return dir === "desc" ? s.reverse() : s;
}
