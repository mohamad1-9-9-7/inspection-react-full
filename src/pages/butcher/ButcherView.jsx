// src/pages/butcher/ButcherView.jsx
//
// 📋 تقارير الجزار — مركز تقارير التقطيع الكامل (EN/AR).
// Butcher Reports — the complete cutting-report workstation.
//
// السيرفر مصدر الحقيقة: GET /api/reports?type=butcher_cut_log
// كل سجل = «عملية» تنفيذ وصفة تقطيع: مادة خام داخلة → منتجات نهائية + هدر،
// بأوزان فعلية وأوزان مستهدفة من الوصفة، ومسار (pathway) عند تعدّد المسارات،
// ورقم عملية مميّز لكل فرع (POS 10 — 00001)، وحالة مراجعة من لوحة المشرف.
//
// الصفحة تعطي كل ما يخصّ التقطيع في مكان واحد:
//   • فلاتر متعدّدة القيم: فرع · جزار · فئة · وصفة · مسار · مادة خام · منتج ·
//     حالة · رقم عملية · بحث حرّ · مدى تصافي · حدّ انحراف · أعلام جودة البيانات
//   • مؤشّرات حيّة مع مقارنة بالفترة السابقة
//   • ٦ تبويبات: نظرة عامة · العمليات · المنتجات · المسارات · التجميع · الملاحظات
//   • فرز على كل عمود بكل جدول
//   • تصدير: Excel بـ ١٢ ورقة · CSV للعمليات · PDF · طباعة التقرير كاملاً

import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { BRANCHES, nameOf } from "./butcherOptions";
import { useSettingsLang, LangToggle } from "../settings/_shared/settingsI18n";
import { canOpenButcherPage, NoAccess } from "./ButcherAccess";
import { BarChart, LineChart, Sparkline } from "./ButcherCharts";
import {
  C, Card, Chip, DeltaCell, EmptyBox, ErrorNote, KIT_CSS, MiniBar, MultiPicker,
  ReviewChip, S, Skeleton, SortTh, TableWrap, downloadExcel, downloadPdf,
  groupTree, inSet, kg, monthStart, pct, shiftDays, sortRows, todayStr, totalsOf,
  useButcherData, useNormalizedRows, wasteBreakdown, canSeeRow,
} from "./butcherReportKit";
import { useRowViewer } from "./butcherViewer";
import OdooMoves, {
  OdooNavbar, ODOO_SKIN_CSS, buildMoves, buildMovesAoa, MOVE_COLS,
} from "./ButcherOdooMoves";

/* ══════════════ ثابتات ══════════════ */

/* شريط طيّ عريض — عنوان قسم قابل للفتح والإغلاق */
const FOLD_BAR = {
  display: "flex", alignItems: "center", gap: 10, width: "100%",
  background: "#fff", border: "1px solid #dbe6f2", borderRadius: 14,
  padding: "11px 14px", fontWeight: 900, color: C.ink, cursor: "pointer",
  textAlign: "start",
};

const TABS = [
  { id: "moves",     icon: "📦", ar: "حركات المنتج", en: "Product Moves" },
  { id: "overview",  icon: "📈", ar: "نظرة عامة",  en: "Overview" },
  { id: "ops",       icon: "🧾", ar: "العمليات",   en: "Operations" },
  { id: "products",  icon: "🥩", ar: "المنتجات",   en: "Products" },
  { id: "pathways",  icon: "🔀", ar: "المسارات",   en: "Pathways" },
  { id: "breakdown", icon: "🧮", ar: "التجميع",    en: "Breakdown" },
  { id: "notes",     icon: "⚠️", ar: "الملاحظات",  en: "Notes" },
];

/* مستويات التجميع الحرّ — تُركَّب حتى ٣ طبقات */
const LEVELS = [
  { id: "",             ar: "— بلا —",      en: "— none —" },
  { id: "branchName",   ar: "الملحمة",      en: "Butchery" },
  { id: "employeeNo",   ar: "الجزار",       en: "Butcher" },
  { id: "bomKindName",  ar: "النوع",        en: "Type" },
  { id: "bomOriginName", ar: "المنشأ",      en: "Origin" },
  { id: "bomCatName",   ar: "الفئة",        en: "Category" },
  { id: "bomRef",       ar: "الوصفة",       en: "Recipe" },
  { id: "pathwayLabel", ar: "المسار",       en: "Pathway" },
  { id: "inputName",    ar: "المادة الخام", en: "Raw material" },
  { id: "day",          ar: "اليوم",        en: "Day" },
  { id: "reviewStatus", ar: "حالة المراجعة", en: "Review status" },
];

const PAGE_SIZES = [50, 100, 250, 1000];

/* ══════════════ أدوات محلّية ══════════════ */

const pad2 = (n) => String(n).padStart(2, "0");
const ymd = (d) => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;

/* الحساب بـ UTC عمداً: التوقيت المحلي + toISOString كان يزحّل يوماً كاملاً. */
const addDays = (str, n) => {
  const d = new Date(`${str}T00:00:00Z`);
  if (Number.isNaN(d.getTime())) return str;
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
};

const daysBetween = (a, b) => {
  const x = new Date(`${a}T00:00:00Z`);
  const y = new Date(`${b}T00:00:00Z`);
  if (Number.isNaN(x.getTime()) || Number.isNaN(y.getTime())) return 0;
  return Math.round((y - x) / 86400000);
};

/** أرقام بفواصل آلاف — الجداول الكبيرة بلا فواصل صعبة القراءة. */
const fmt = (n, d = 2) =>
  Number(n || 0).toLocaleString("en-US", { minimumFractionDigits: d, maximumFractionDigits: d });
const fmtInt = (n) => Number(n || 0).toLocaleString("en-US");

/** تغيّر نسبي بين فترتين — null إذا ما في أساس نقارن عليه. */
const relDelta = (cur, prev) => (prev > 0 ? ((cur - prev) / prev) * 100 : null);
/** فرق نقاط مئوية — للنِّسب (تصافي/هدر) المقارنة بالنقاط لا بالنسبة. */
const ppDelta = (cur, prev, hasPrev) => (hasPrev ? cur - prev : null);

/** تجميع عام لمجموعة صفوف حسب مفتاح، مع مجاميع وبيانات إضافية. */
function aggBy(list, keyFn, metaFn) {
  const m = new Map();
  list.forEach((r) => {
    const k = keyFn(r) || "—";
    if (!m.has(k)) m.set(k, []);
    m.get(k).push(r);
  });
  return [...m.entries()]
    .map(([key, sub]) => ({
      key, rows: sub, ...totalsOf(sub), ...(metaFn ? metaFn(sub, key) : null),
    }))
    .sort((a, b) => b.carcassKg - a.carcassKg);
}

/** تنزيل CSV بلا أي مكتبة — مع BOM حتى يفتح العربي صحيحاً في Excel. */
function downloadCsv(aoa, filename) {
  const esc = (v) => {
    const s = v === null || v === undefined ? "" : String(v);
    return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const csv = `﻿${aoa.map((r) => r.map(esc).join(",")).join("\r\n")}`;
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

/* ══════════════ تصميم الصفحة ══════════════ */

const VIEW_CSS = `
/* ── الترويسة البانورامية ── */
#root .bv-hero {
  position: relative; overflow: hidden; border-radius: 22px; padding: 18px 20px; color: #fff;
  background: linear-gradient(135deg,#0b3358 0%,#1f6fd0 54%,#0f766e 100%);
  box-shadow: 0 18px 42px rgba(11,51,88,.26); margin-bottom: 16px;
}
#root .bv-hero-glow {
  position: absolute; top: -180px; inset-inline-end: -90px; width: 380px; height: 380px;
  background: radial-gradient(circle,rgba(255,255,255,.24),transparent 62%); pointer-events: none;
}
#root .bv-hero-row { position: relative; display: flex; align-items: center; gap: 14px; flex-wrap: wrap; }
#root .bv-hero-icon {
  width: 54px; height: 54px; border-radius: 17px; display: grid; place-items: center; flex-shrink: 0;
  background: rgba(255,255,255,.16); border: 1px solid rgba(255,255,255,.30); font-size: 27px !important;
}
#root .bv-hero-title { font-size: 26px !important; font-weight: 900 !important; letter-spacing: .2px; }
#root .bv-hero-sub { font-size: 13px !important; font-weight: 700 !important; opacity: .88; margin-top: 3px; }
#root .bv-hero-strip { position: relative; display: flex; gap: 8px; flex-wrap: wrap; margin-top: 14px; }
#root .bv-hpill {
  background: rgba(255,255,255,.15); border: 1px solid rgba(255,255,255,.24); border-radius: 999px;
  padding: 5px 13px; font-weight: 800; font-size: 12.5px !important;
}
#root .bv-hbtn {
  background: rgba(255,255,255,.15); border: 1px solid rgba(255,255,255,.32); color: #fff;
  border-radius: 12px; padding: 8px 14px; font-weight: 800; cursor: pointer; font-family: inherit;
  white-space: nowrap; transition: background .15s ease, transform .15s ease;
}
#root .bv-hbtn:hover { background: rgba(255,255,255,.28); transform: translateY(-1px); }
#root .bv-hbtn:disabled { opacity: .45; cursor: not-allowed; transform: none; }
#root .bv-hbtn-solid { background: #fff; color: #10466f; border-color: #fff; }
#root .bv-hbtn-solid:hover { background: #eaf3ff; }

/* شريط التبويبات القديم استُبدل بشريط تطبيق Odoo — انظر <OdooNavbar/> */

/* ── بطاقات المؤشّرات ── */
#root .bv-stat {
  position: relative; overflow: hidden; background: #fff; border: 1px solid ${C.line};
  border-radius: 16px; padding: 14px 16px 12px; display: flex; flex-direction: column; gap: 3px;
}
#root .bv-stat::before {
  content: ""; position: absolute; inset-inline-start: 0; top: 0; bottom: 0; width: 5px;
  background: var(--bv-accent, ${C.blue});
}
#root .bv-stat::after {
  content: ""; position: absolute; inset-inline-end: -30px; top: -30px; width: 96px; height: 96px;
  border-radius: 50%; background: var(--bv-accent, ${C.blue}); opacity: .06;
}
#root .bv-statv { font-size: 25px !important; font-weight: 900 !important; color: var(--bv-accent, ${C.blue}); }
#root .bv-statu { font-size: 13px !important; font-weight: 800 !important; margin-inline-start: 4px; opacity: .75; }

/* ── شرائح الفلاتر الفعّالة ── */
#root .bv-fchips { display: flex; gap: 7px; flex-wrap: wrap; margin-top: 12px; }
#root .bv-fchip {
  display: inline-flex; align-items: center; gap: 7px; background: #eaf2fc; color: ${C.blueDk};
  border: 1px solid ${C.line2}; border-radius: 999px; padding: 4px 5px 4px 12px;
  font-weight: 800; font-size: 12.5px !important;
}
#root .bv-fchip button {
  border: none; background: #fff; color: ${C.muted}; border-radius: 999px; width: 21px; height: 21px;
  cursor: pointer; font-weight: 900; line-height: 1; font-family: inherit; flex-shrink: 0;
}
#root .bv-fchip button:hover { background: #fee2e2; color: ${C.red}; }

/* ── متفرقات ── */
#root .bv-flag {
  display: inline-flex; align-items: center; gap: 8px; border: 1px solid ${C.line2}; background: #fff;
  border-radius: 12px; padding: 9px 12px; font-weight: 800; cursor: pointer; color: ${C.ink2};
  font-family: inherit; white-space: nowrap;
}
#root .bv-flag.on { background: #eaf2fc; border-color: ${C.blue}; color: ${C.blueDk}; }
#root .bv-grid2 { display: grid; grid-template-columns: repeat(auto-fit,minmax(min(400px,100%),1fr)); gap: 16px; }
#root .bv-trow { cursor: pointer; }
#root .bv-exp {
  border: none; background: #eaf2fc; color: ${C.blueDk}; border-radius: 8px; width: 24px; height: 24px;
  font-weight: 900; cursor: pointer; font-family: inherit; line-height: 1; flex-shrink: 0;
}
#root .bv-best { background: #dcfce7; color: #166534; border-radius: 999px; padding: 2px 9px; font-weight: 900; }
#root .bv-printhead { display: none; }

@media (max-width: 820px) {
  #root .bv-hero { padding: 14px 14px; border-radius: 18px; }
  #root .bv-hero-title { font-size: 20px !important; }
  #root .bv-hero-icon { width: 44px; height: 44px; font-size: 22px !important; }
  #root .bv-hero .bk-actions { width: 100%; }
  #root .bv-hero .bk-actions > * { flex: 1 1 auto; text-align: center; }
  #root .bv-statv { font-size: 21px !important; }
  #root .bv-grid2 { grid-template-columns: 1fr; }
}
@media print {
  #root .bv-hero { background: #fff !important; color: ${C.ink} !important; box-shadow: none !important;
    border: 1px solid #bbb; }
  #root .bv-hero-glow, #root .bv-hero .bk-actions { display: none !important; }
  #root .bv-hpill { background: #f2f6fb !important; border-color: #ddd !important; color: ${C.ink} !important; }
  #root .bv-printhead { display: block !important; }
}
`;

/* ══════════════ مكوّنات صغيرة ══════════════ */

function StatCard({ icon, label, value, unit, color = C.blue, delta, deltaUnit = "%", hint, spark, invert }) {
  const d = Number(delta);
  const show = Number.isFinite(d) && Math.abs(d) >= 0.05;
  const up = d > 0;
  const good = invert ? !up : up;
  return (
    <div className="bv-stat bk-press" style={{ "--bv-accent": color }}>
      <span className="bk-lbl" style={{ color: C.muted, display: "flex", alignItems: "center", gap: 6 }}>
        <span aria-hidden="true">{icon}</span>{label}
      </span>
      <span className="bv-statv">
        {value}{unit ? <span className="bv-statu">{unit}</span> : null}
      </span>
      <span style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", minHeight: 16 }}>
        {show && (
          <span className="bk-lbl" style={{ color: good ? C.green : C.red }}>
            {up ? "▲" : "▼"} {Math.abs(d).toFixed(1)}{deltaUnit}
          </span>
        )}
        {hint ? <span className="bk-lbl" style={{ color: C.muted }}>{hint}</span> : null}
      </span>
      {spark && spark.length > 1 ? <Sparkline data={spark} color={color} height={26} /> : null}
    </div>
  );
}

/** رأس عمود قابل للفرز لجداول التجميع — يشارك نفس شكل SortTh. */
function AggTh({ label, col, sort, setSort, numeric }) {
  return (
    <SortTh
      label={label}
      col={col}
      sort={sort}
      numeric={numeric}
      onSort={(k) =>
        setSort((s) => ({ key: k, dir: s.key === k && s.dir === "desc" ? "asc" : "desc" }))
      }
    />
  );
}

/* ══════════════ الصفحة ══════════════ */

export default function ButcherView() {
  const navigate = useNavigate();
  const { t, isAr, dir, lang, toggle } = useSettingsLang();

  /* ── المدى الزمني ومقارنة الفترة السابقة ── */
  const [from, setFrom] = useState(shiftDays(-29));
  const [to, setTo] = useState(todayStr());
  const [compare, setCompare] = useState(true);

  const spanDays = useMemo(() => Math.max(1, daysBetween(from, to) + 1), [from, to]);
  const prevFrom = useMemo(() => addDays(from, -spanDays), [from, spanDays]);
  const prevTo = useMemo(() => addDays(from, -1), [from]);

  // نسحب نافذة المقارنة مع النافذة الحالية بطلب واحد، ونفصلها محلياً
  const { records, loading, error, truncated, reload, cfg, mrpCfg } =
    useButcherData({ from: compare ? prevFrom : from, to });
  const rawRows = useNormalizedRows(records, { cfg, mrpCfg, isAr });

  /* العمليات المحجورة (طلب تعديل مرفوع) والملغاة (وافق عليها المسؤول) ما
     بتبيّن هون ولا بتنحسب بأي رقم — هاد كل معنى الحجر. مشرف الملحمة
     بيشوف طلبه ويتابعه من لوحة المشرف، والمسؤول بيشوف كل شي. */
  const viewer = useRowViewer(isAr);
  const all = useMemo(
    () => rawRows.filter((r) => canSeeRow(r, viewer)),
    [rawRows, viewer]
  );

  /* ── الفلاتر ── */
  const [branches, setBranches] = useState([]);
  const [butchers, setButchers] = useState([]);
  const [kinds, setKinds] = useState([]);
  const [origins, setOrigins] = useState([]);
  const [cats, setCats] = useState([]);
  const [recipes, setRecipes] = useState([]);
  const [pathways, setPathways] = useState([]);
  const [inputs, setInputs] = useState([]);
  const [items, setItems] = useState([]);
  const [statuses, setStatuses] = useState([]);
  const [q, setQ] = useState("");
  const [opQ, setOpQ] = useState("");
  const [yieldMin, setYieldMin] = useState("");
  const [yieldMax, setYieldMax] = useState("");
  const [devPct, setDevPct] = useState(10);
  const [onlyDeviating, setOnlyDeviating] = useState(false);
  const [onlyUnaccounted, setOnlyUnaccounted] = useState(false);
  const [onlyPathway, setOnlyPathway] = useState(false);
  const [onlyNoOpNo, setOnlyNoOpNo] = useState(false);
  const [onlyBackdated, setOnlyBackdated] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  // الفلاتر والمؤشّرات مطويّة افتراضياً — الشاشة تفتح على الجداول مباشرة،
  // والمشرف يفتح اللي بده إياه بضغطة. الطباعة بتفتحهم دايماً.
  const [openFilters, setOpenFilters] = useState(false);
  const [openKpis, setOpenKpis] = useState(false);

  /* ── العرض ── */
  const [tab, setTab] = useState("moves");
  const [sort, setSort] = useState({ key: "day", dir: "desc" });
  const [prodSort, setProdSort] = useState({ key: "actual", dir: "desc" });
  const [aggSort, setAggSort] = useState({ key: "carcassKg", dir: "desc" });
  const [openIds, setOpenIds] = useState(() => new Set());
  const [limit, setLimit] = useState(100);
  const [lvl1, setLvl1] = useState("branchName");
  const [lvl2, setLvl2] = useState("employeeNo");
  const [lvl3, setLvl3] = useState("bomRef");
  const [openNodes, setOpenNodes] = useState(() => new Set());
  const [printAll, setPrintAll] = useState(false);

  const toggleSort = (key) =>
    setSort((s) => ({ key, dir: s.key === key && s.dir === "desc" ? "asc" : "desc" }));

  const toggleRow = (id) =>
    setOpenIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });

  const toggleNode = (id) =>
    setOpenNodes((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });

  /* ══ قوائم الفلاتر — مبنية من البيانات المحمّلة نفسها ══ */
  const scope = useMemo(
    () => all.filter((r) => (!from || r.day >= from) && (!to || r.day <= to)),
    [all, from, to]
  );

  const branchOpts = useMemo(() => {
    const seen = new Set(scope.map((r) => r.branchCode).filter(Boolean));
    const known = BRANCHES.filter((b) => seen.has(b.code))
      .map((b) => ({ value: b.code, label: `${b.icon || ""} ${nameOf(b, isAr)}`.trim() }));
    const extra = [...seen]
      .filter((code) => !BRANCHES.some((b) => b.code === code))
      .map((code) => ({ value: code, label: code }));
    return [...known, ...extra];
  }, [scope, isAr]);

  const butcherOpts = useMemo(() => {
    const m = new Map();
    scope.forEach((r) => { if (r.employeeNoRaw || r.employeeNo) m.set(r.employeeNoRaw || r.employeeNo, r.employeeNo); });
    return [...m.entries()]
      .map(([value, label]) => ({ value, label }))
      .sort((a, b) => String(a.label).localeCompare(String(b.label)));
  }, [scope]);

  const catOpts = useMemo(() => {
    const m = new Map();
    scope.forEach((r) => { if (r.bomCatName) m.set(r.bomCatId, r.bomCatName); });
    return [...m.entries()].map(([value, label]) => ({ value, label }));
  }, [scope]);

  /* النوع والمنشأ — تعريفات قوائم التقطيع، محفوظة كلقطة داخل كل سجل */
  const kindOpts = useMemo(() => {
    const m = new Map();
    scope.forEach((r) => { if (r.bomKindName) m.set(r.bomKindId || r.bomKindName, r.bomKindName); });
    return [...m.entries()].map(([value, label]) => ({ value, label }))
      .sort((a, b) => String(a.label).localeCompare(String(b.label)));
  }, [scope]);

  const originOpts = useMemo(() => {
    const m = new Map();
    scope.forEach((r) => { if (r.bomOriginName) m.set(r.bomOriginId || r.bomOriginName, r.bomOriginName); });
    return [...m.entries()].map(([value, label]) => ({ value, label }))
      .sort((a, b) => String(a.label).localeCompare(String(b.label)));
  }, [scope]);

  const recipeOpts = useMemo(
    () => [...new Set(scope.map((r) => r.bomRef).filter(Boolean))]
      .sort().map((v) => ({ value: v, label: v })),
    [scope]
  );

  const pathwayOpts = useMemo(() => {
    const m = new Map();
    scope.forEach((r) => { if (r.pathwayCode) m.set(r.pathwayCode, r.pathwayLabel || r.pathwayCode); });
    return [...m.entries()].map(([value, label]) => ({ value, label }))
      .sort((a, b) => String(a.value).localeCompare(String(b.value)));
  }, [scope]);

  const inputOpts = useMemo(() => {
    const m = new Map();
    scope.forEach((r) => {
      const k = r.inputItemId || r.inputName;
      if (k && k !== "—") m.set(k, r.inputSku ? `${r.inputName} · ${r.inputSku}` : r.inputName);
    });
    return [...m.entries()].map(([value, label]) => ({ value, label }))
      .sort((a, b) => String(a.label).localeCompare(String(b.label)));
  }, [scope]);

  const itemOpts = useMemo(() => {
    const m = new Map();
    scope.forEach((r) => r.cuts.forEach((c) => {
      const k = c.itemId || c.name;
      if (k) m.set(k, c.sku ? `${c.name} · ${c.sku}` : c.name);
    }));
    return [...m.entries()].map(([value, label]) => ({ value, label }))
      .sort((a, b) => String(a.label).localeCompare(String(b.label)));
  }, [scope]);

  const statusOpts = useMemo(() => ([
    { value: "pending",  label: t({ en: "Pending", ar: "قيد المراجعة" }) },
    { value: "approved", label: t({ en: "Approved", ar: "معتمد" }) },
    { value: "rejected", label: t({ en: "Rejected", ar: "مرفوض" }) },
  ]), [t]);

  /* ══ الفلترة ══ */
  const passes = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const opNeedle = opQ.trim().toLowerCase();
    const yMin = yieldMin === "" ? null : Number(yieldMin);
    const yMax = yieldMax === "" ? null : Number(yieldMax);
    const dev = Number(devPct) || 0;

    return (r) => {
      if (!inSet(branches, r.branchCode)) return false;
      if (!inSet(butchers, r.employeeNoRaw || r.employeeNo)) return false;
      if (!inSet(kinds, r.bomKindId || r.bomKindName)) return false;
      if (!inSet(origins, r.bomOriginId || r.bomOriginName)) return false;
      if (!inSet(cats, r.bomCatId)) return false;
      if (!inSet(recipes, r.bomRef)) return false;
      if (!inSet(pathways, r.pathwayCode)) return false;
      if (!inSet(inputs, r.inputItemId || r.inputName)) return false;
      if (!inSet(statuses, r.reviewStatus || "pending")) return false;
      if (items.length && !r.cuts.some((c) => items.includes(c.itemId || c.name))) return false;
      if (yMin !== null && r.yieldPct < yMin) return false;
      if (yMax !== null && r.yieldPct > yMax) return false;
      if (onlyPathway && !r.pathwayCode) return false;
      if (onlyNoOpNo && r.opNo) return false;
      if (onlyUnaccounted && !(Math.abs(r.unaccountedKg) > 0.005)) return false;
      if (onlyBackdated && (!r.entryDay || r.entryDay === r.day)) return false;
      if (onlyDeviating &&
        !r.cuts.some((c) => c.deltaPct !== null && Math.abs(c.deltaPct) > dev)) return false;
      if (opNeedle && !String(r.opNo || "").toLowerCase().includes(opNeedle)) return false;
      if (needle) {
        const hay = [
          r.opNo, r.employeeNo, r.employeeNoRaw, r.butcherName, r.bomRef, r.bomCatName,
          r.bomKindName, r.bomOriginName,
          r.pathwayCode, r.pathwayName, r.inputName, r.inputNameAlt, r.inputSku,
          r.branchName, r.branchCode, r.day, r.entryDay, r.review?.by, r.review?.reason,
          ...r.cuts.map((c) => `${c.name} ${c.nameAlt} ${c.sku}`),
        ].join(" ").toLowerCase();
        if (!hay.includes(needle)) return false;
      }
      return true;
    };
  }, [branches, butchers, kinds, origins, cats, recipes, pathways, inputs, items, statuses, q, opQ,
      yieldMin, yieldMax, devPct, onlyDeviating, onlyUnaccounted, onlyPathway,
      onlyNoOpNo, onlyBackdated]);

  const filtered = useMemo(() => scope.filter(passes), [scope, passes]);
  const rows = useMemo(() => sortRows(filtered, sort.key, sort.dir), [filtered, sort]);

  const prevRows = useMemo(
    () => (compare ? all.filter((r) => r.day >= prevFrom && r.day <= prevTo).filter(passes) : []),
    [compare, all, prevFrom, prevTo, passes]
  );

  /* أسطر «حركات المنتج» بشكل Odoo — تُبنى مرّة وتُستعمل بالشاشة وبتصدير Excel */
  const moves = useMemo(() => buildMoves(rows, { t, isAr }), [rows, t, isAr]);

  /* اسم المستخدم لشريط تطبيق Odoo — مجرّد عرض، والمصدر جلسة الدخول المخزّنة */
  const userName = useMemo(() => {
    try {
      const u = JSON.parse(localStorage.getItem("currentUser") || "{}");
      return u.name || u.fullName || u.username || "";
    } catch {
      return "";
    }
  }, []);

  const stats = useMemo(() => totalsOf(filtered), [filtered]);
  const prevStats = useMemo(() => totalsOf(prevRows), [prevRows]);
  const hasPrev = compare && prevRows.length > 0;

  /* ══ التجميعات ══ */
  const byDay = useMemo(
    () => aggBy(filtered, (r) => r.day).sort((a, b) => b.key.localeCompare(a.key)),
    [filtered]
  );
  const byDayAsc = useMemo(() => [...byDay].reverse(), [byDay]);

  const byButcher = useMemo(
    () => aggBy(filtered, (r) => r.employeeNo, (l) => ({
      empNo: l[0].employeeNoRaw,
      job: l[0].payload?.butcherJob || "",
      places: [...new Set(l.map((x) => x.branchName))].join(" · "),
    })),
    [filtered]
  );

  const byBranch = useMemo(
    () => aggBy(filtered, (r) => r.branchName, (l) => ({
      code: l[0].branchCode,
      people: new Set(l.map((x) => x.employeeNoRaw)).size,
    })),
    [filtered]
  );

  const byRecipe = useMemo(
    () => aggBy(filtered, (r) => r.bomRef || "—", (l) => ({
      cat: l[0].bomCatName || "—",
      input: l[0].inputName,
      paths: new Set(l.map((x) => x.pathwayCode).filter(Boolean)).size,
    })),
    [filtered]
  );

  const byInput = useMemo(
    () => aggBy(filtered, (r) => r.inputName || "—", (l) => ({ sku: l[0].inputSku || "" })),
    [filtered]
  );

  const byPathway = useMemo(
    () => aggBy(filtered.filter((r) => r.pathwayCode), (r) => `${r.bomRef}|${r.pathwayCode}`, (l) => ({
      ref: l[0].bomRef, code: l[0].pathwayCode, name: l[0].pathwayName,
      label: l[0].pathwayLabel,
    })),
    [filtered]
  );

  /* مقارنة المسارات داخل كل وصفة — أي مسار يعطي أعلى تصافي فعلياً */
  const pathwayCompare = useMemo(() => {
    const m = new Map();
    filtered.forEach((r) => {
      const ref = r.bomRef || "—";
      if (!m.has(ref)) m.set(ref, []);
      m.get(ref).push(r);
    });
    return [...m.entries()]
      .map(([ref, list]) => {
        const paths = aggBy(list, (r) => r.pathwayCode || "__none", (l, k) => ({
          code: k === "__none" ? "" : k,
          label: l[0].pathwayLabel || (k === "__none"
            ? t({ en: "No pathway", ar: "بلا مسار" })
            : k),
        })).sort((a, b) => b.yieldPct - a.yieldPct);
        const best = paths.length > 1 ? paths[0] : null;
        return { ref, cat: list[0].bomCatName || "", paths, best, totals: totalsOf(list) };
      })
      .filter((g) => g.paths.length > 1)
      .sort((a, b) => b.totals.carcassKg - a.totals.carcassKg);
  }, [filtered, t]);

  /* المنتجات مقابل أهداف الوصفة */
  const products = useMemo(() => {
    const m = new Map();
    filtered.forEach((r) => {
      r.cuts.forEach((c) => {
        const k = c.itemId || c.name;
        if (!m.has(k)) {
          m.set(k, {
            key: k, name: c.name, nameAlt: c.nameAlt, sku: c.sku, uom: c.uom,
            isWaste: c.isWaste, kind: c.kind, actual: 0, target: 0, n: 0, ops: new Set(),
          });
        }
        const g = m.get(k);
        g.actual += c.weightKg;
        g.target += c.targetKg;
        g.n += 1;
        g.ops.add(r.id);
      });
    });
    return [...m.values()].map((g) => ({
      ...g,
      opCount: g.ops.size,
      share: pct(g.actual, stats.baseKg),
      deltaPct: g.target > 0 ? ((g.actual - g.target) / g.target) * 100 : null,
    }));
  }, [filtered, stats.baseKg]);

  const productsSorted = useMemo(
    () => sortRows(products, prodSort.key, prodSort.dir),
    [products, prodSort]
  );

  const waste = useMemo(() => {
    const list = wasteBreakdown(filtered);
    const total = list.reduce((s, w) => s + w.kg, 0);
    return list.map((w) => ({
      ...w,
      shareOfWaste: pct(w.kg, total),
      shareOfRaw: pct(w.kg, stats.baseKg),
    }));
  }, [filtered, stats.baseKg]);

  /* شجرة التجميع الحرّ */
  const statusLabel = useMemo(() => ({
    approved: t({ en: "Approved", ar: "معتمد" }),
    rejected: t({ en: "Rejected", ar: "مرفوض" }),
    pending: t({ en: "Pending", ar: "قيد المراجعة" }),
  }), [t]);

  const tree = useMemo(() => {
    const defOf = (id) => {
      if (!id) return null;
      if (id === "reviewStatus") {
        return { key: (r) => r.reviewStatus || "pending", label: (r, k) => statusLabel[k] || k };
      }
      return { key: id, label: (r, k) => k };
    };
    const levels = [lvl1, lvl2, lvl3].map(defOf).filter(Boolean);
    if (!levels.length) return [];
    return groupTree(filtered, levels) || [];
  }, [filtered, lvl1, lvl2, lvl3, statusLabel]);

  /* ══ الملاحظات وجودة البيانات ══ */
  const issues = useMemo(() => {
    const out = [];
    const dev = Number(devPct) || 10;
    const staleDay = addDays(todayStr(), -3);
    const push = (r, kind, detail, tone, sev) =>
      out.push({
        day: r.day, opNo: r.opNo, who: r.employeeNo, branch: r.branchName,
        ref: r.bomRef || "—", kind, detail, tone, sev,
      });

    filtered.forEach((r) => {
      if (r.unaccountedKg > 0.005) {
        push(r, t({ en: "Unaccounted weight", ar: "فاقد غير مسجّل" }),
          `${fmt(r.unaccountedKg)} kg`, "amber", 2);
      }
      if (r.unaccountedKg < -0.005) {
        push(r, t({ en: "Output exceeds raw", ar: "النواتج أكبر من الخام" }),
          `${fmt(Math.abs(r.unaccountedKg))} kg`, "red", 3);
      }
      if (!(r.carcassKg > 0)) {
        push(r, t({ en: "No raw weight", ar: "بلا وزن مادة خام" }), "—", "amber", 2);
      }
      r.cuts.forEach((c) => {
        if (c.deltaPct !== null && Math.abs(c.deltaPct) > dev * 1.5) {
          push(r, t({ en: "Far off target", ar: "بعيد عن الهدف" }),
            `${c.name}: ${c.deltaPct > 0 ? "+" : ""}${c.deltaPct.toFixed(1)}%`, "red", 3);
        }
      });
      if (r.reviewStatus === "rejected") {
        push(r, t({ en: "Rejected", ar: "مرفوض" }), r.review?.reason || "—", "red", 3);
      }
      if ((r.reviewStatus || "pending") === "pending" && r.day < staleDay) {
        push(r, t({ en: "Pending over 3 days", ar: "معلّق أكثر من ٣ أيام" }), r.day, "amber", 2);
      }
      if (!r.opNo) {
        push(r, t({ en: "No operation number", ar: "بلا رقم عملية" }), "—", "grey", 1);
      }
      if (r.entryDay && r.entryDay !== r.day) {
        push(r, t({ en: "Backdated entry", ar: "إدخال بأثر رجعي" }),
          t({ en: `entered ${r.entryDay}`, ar: `أُدخل ${r.entryDay}` }), "grey", 1);
      }
    });
    return out.sort((a, b) => b.sev - a.sev || b.day.localeCompare(a.day));
  }, [filtered, devPct, t]);

  /* ══ الفلاتر الفعّالة كشرائح ══ */
  const chips = useMemo(() => {
    const L = (arr, opts) => arr.map((v) => opts.find((o) => o.value === v)?.label || v);
    const list = [];
    const add = (label, values, clear) => {
      if (values.length) list.push({ label, text: values.join(" · "), clear });
    };
    add(t({ en: "Butchery", ar: "الملحمة" }), L(branches, branchOpts), () => setBranches([]));
    add(t({ en: "Butcher", ar: "الجزار" }), L(butchers, butcherOpts), () => setButchers([]));
    add(t({ en: "Type", ar: "النوع" }), L(kinds, kindOpts), () => setKinds([]));
    add(t({ en: "Origin", ar: "المنشأ" }), L(origins, originOpts), () => setOrigins([]));
    add(t({ en: "Category", ar: "الفئة" }), L(cats, catOpts), () => setCats([]));
    add(t({ en: "Recipe", ar: "الوصفة" }), L(recipes, recipeOpts), () => setRecipes([]));
    add(t({ en: "Pathway", ar: "المسار" }), L(pathways, pathwayOpts), () => setPathways([]));
    add(t({ en: "Raw material", ar: "المادة الخام" }), L(inputs, inputOpts), () => setInputs([]));
    add(t({ en: "Product", ar: "المنتج" }), L(items, itemOpts), () => setItems([]));
    add(t({ en: "Status", ar: "الحالة" }), L(statuses, statusOpts), () => setStatuses([]));
    if (q.trim()) list.push({ label: t({ en: "Search", ar: "بحث" }), text: q.trim(), clear: () => setQ("") });
    if (opQ.trim()) list.push({ label: t({ en: "Operation no.", ar: "رقم العملية" }), text: opQ.trim(), clear: () => setOpQ("") });
    if (yieldMin !== "" || yieldMax !== "") {
      list.push({
        label: t({ en: "Yield %", ar: "التصافي ٪" }),
        text: `${yieldMin || 0} – ${yieldMax || 100}`,
        clear: () => { setYieldMin(""); setYieldMax(""); },
      });
    }
    if (onlyDeviating) list.push({ label: t({ en: "Deviating", ar: "منحرف" }), text: `> ${devPct}%`, clear: () => setOnlyDeviating(false) });
    if (onlyUnaccounted) list.push({ label: t({ en: "Unaccounted", ar: "فاقد غير مسجّل" }), text: "✓", clear: () => setOnlyUnaccounted(false) });
    if (onlyPathway) list.push({ label: t({ en: "Has pathway", ar: "له مسار" }), text: "✓", clear: () => setOnlyPathway(false) });
    if (onlyNoOpNo) list.push({ label: t({ en: "No operation no.", ar: "بلا رقم عملية" }), text: "✓", clear: () => setOnlyNoOpNo(false) });
    if (onlyBackdated) list.push({ label: t({ en: "Backdated", ar: "بأثر رجعي" }), text: "✓", clear: () => setOnlyBackdated(false) });
    return list;
  }, [t, branches, branchOpts, butchers, butcherOpts, kinds, kindOpts, origins, originOpts,
      cats, catOpts, recipes, recipeOpts,
      pathways, pathwayOpts, inputs, inputOpts, items, itemOpts, statuses, statusOpts,
      q, opQ, yieldMin, yieldMax, onlyDeviating, devPct, onlyUnaccounted, onlyPathway,
      onlyNoOpNo, onlyBackdated]);

  const resetFilters = () => {
    setBranches([]); setButchers([]); setKinds([]); setOrigins([]);
    setCats([]); setRecipes([]); setPathways([]);
    setInputs([]); setItems([]); setStatuses([]); setQ(""); setOpQ("");
    setYieldMin(""); setYieldMax(""); setOnlyDeviating(false); setOnlyUnaccounted(false);
    setOnlyPathway(false); setOnlyNoOpNo(false); setOnlyBackdated(false);
  };

  const resetAll = () => {
    resetFilters();
    setFrom(shiftDays(-29));
    setTo(todayStr());
  };

  const presets = useMemo(() => {
    const now = new Date();
    const y = now.getFullYear();
    const lastMonthEnd = ymd(new Date(y, now.getMonth(), 0));
    const lastMonthStart = `${lastMonthEnd.slice(0, 7)}-01`;
    return [
      { lbl: t({ en: "Today", ar: "اليوم" }), a: todayStr(), b: todayStr() },
      { lbl: t({ en: "Yesterday", ar: "أمس" }), a: shiftDays(-1), b: shiftDays(-1) },
      { lbl: t({ en: "7 days", ar: "٧ أيام" }), a: shiftDays(-6), b: todayStr() },
      { lbl: t({ en: "30 days", ar: "٣٠ يوم" }), a: shiftDays(-29), b: todayStr() },
      { lbl: t({ en: "This month", ar: "هذا الشهر" }), a: monthStart(), b: todayStr() },
      { lbl: t({ en: "Last month", ar: "الشهر الماضي" }), a: lastMonthStart, b: lastMonthEnd },
      { lbl: t({ en: "90 days", ar: "٩٠ يوم" }), a: shiftDays(-89), b: todayStr() },
      { lbl: t({ en: "This year", ar: "هذه السنة" }), a: `${y}-01-01`, b: todayStr() },
    ];
  }, [t]);

  /* ══════════════ التصدير ══════════════ */

  const kindName = (isWaste) =>
    (isWaste ? t({ en: "Waste", ar: "هدر" }) : t({ en: "Product", ar: "منتج" }));
  const statusName = (s) => statusLabel[s || "pending"] || s;

  const opsAoa = useMemo(() => {
    const head = [
      t({ en: "Operation no.", ar: "رقم العملية" }),
      t({ en: "Cut date", ar: "تاريخ التقطيع" }),
      t({ en: "Entry date", ar: "تاريخ الإدخال" }),
      t({ en: "Time", ar: "الوقت" }),
      t({ en: "Butcher", ar: "الجزار" }),
      t({ en: "Employee no.", ar: "الرقم الوظيفي" }),
      t({ en: "Butchery", ar: "الملحمة" }),
      t({ en: "Branch code", ar: "كود الفرع" }),
      t({ en: "Type", ar: "النوع" }),
      t({ en: "Origin", ar: "المنشأ" }),
      t({ en: "Category", ar: "الفئة" }),
      t({ en: "Recipe", ar: "الوصفة" }),
      t({ en: "Pathway code", ar: "كود المسار" }),
      t({ en: "Pathway", ar: "المسار" }),
      t({ en: "Raw material", ar: "المادة الخام" }),
      t({ en: "Raw code", ar: "كود الخام" }),
      t({ en: "Raw kg", ar: "وزن الخام" }),
      t({ en: "Pieces", ar: "عدد القطع" }),
      t({ en: "Products kg", ar: "النواتج" }),
      t({ en: "Waste kg", ar: "الهدر" }),
      t({ en: "Unaccounted kg", ar: "فاقد غير مسجّل" }),
      t({ en: "Yield %", ar: "التصافي ٪" }),
      t({ en: "Waste %", ar: "الهدر ٪" }),
      t({ en: "Duration (min)", ar: "الوقت (دقيقة)" }),
      t({ en: "Lines", ar: "عدد الأسطر" }),
      t({ en: "Status", ar: "الحالة" }),
      t({ en: "Reviewed by", ar: "روجع بواسطة" }),
      t({ en: "Reviewed at", ar: "تاريخ المراجعة" }),
      t({ en: "Reason", ar: "السبب" }),
    ];
    const body = rows.map((r) => [
      r.opNo || "", r.day, r.entryDay || "", r.time || "", r.employeeNo, r.employeeNoRaw,
      r.branchName, r.branchCode, r.bomKindName || "", r.bomOriginName || "",
      r.bomCatName || "", r.bomRef || "",
      r.pathwayCode || "", r.pathwayName || "", r.inputName, r.inputSku || "",
      +kg(r.carcassKg), r.pieceCount ?? "", +kg(r.cutsKg), +kg(r.wasteKg),
      +kg(r.unaccountedKg), +r.yieldPct.toFixed(1), +r.wastePct.toFixed(1),
      r.durationMin ?? "", r.cuts.length, statusName(r.reviewStatus),
      r.review?.by || "", r.review?.at ? String(r.review.at).slice(0, 16).replace("T", " ") : "",
      r.review?.reason || "",
    ]);
    return [head, ...body];
  }, [rows, t, statusLabel]); // eslint-disable-line react-hooks/exhaustive-deps

  const exportCsv = () =>
    downloadCsv(opsAoa, `butcher_operations_${from}_${to}.csv`);

  const exportExcel = async () => {
    /* ورقة ١ — الملخّص */
    const summary = [
      [t({ en: "Metric", ar: "المؤشّر" }), t({ en: "Value", ar: "القيمة" }),
       compare ? t({ en: "Previous period", ar: "الفترة السابقة" }) : ""],
      [t({ en: "Period", ar: "الفترة" }), `${from} → ${to}`, compare ? `${prevFrom} → ${prevTo}` : ""],
      [t({ en: "Operations", ar: "العمليات" }), stats.count, compare ? prevStats.count : ""],
      [t({ en: "Butchers", ar: "الجزارون" }), stats.butchers, compare ? prevStats.butchers : ""],
      [t({ en: "Butcheries", ar: "الملاحم" }), byBranch.length, ""],
      [t({ en: "Recipes used", ar: "وصفات مستعملة" }), stats.boms, compare ? prevStats.boms : ""],
      [t({ en: "Pathways used", ar: "مسارات مستعملة" }), byPathway.length, ""],
      [t({ en: "Raw material kg", ar: "المادة الخام" }), +kg(stats.carcassKg), compare ? +kg(prevStats.carcassKg) : ""],
      [t({ en: "Products kg", ar: "النواتج" }), +kg(stats.cutsKg), compare ? +kg(prevStats.cutsKg) : ""],
      [t({ en: "Waste kg", ar: "الهدر" }), +kg(stats.wasteKg), compare ? +kg(prevStats.wasteKg) : ""],
      [t({ en: "Unaccounted kg", ar: "فاقد غير مسجّل" }), +kg(stats.unaccountedKg), compare ? +kg(prevStats.unaccountedKg) : ""],
      [t({ en: "Net yield %", ar: "نسبة التصافي" }), +stats.yieldPct.toFixed(2), compare ? +prevStats.yieldPct.toFixed(2) : ""],
      [t({ en: "Waste %", ar: "نسبة الهدر" }), +stats.wastePct.toFixed(2), compare ? +prevStats.wastePct.toFixed(2) : ""],
      [t({ en: "Avg raw per operation", ar: "متوسط الخام للعملية" }), +kg(stats.avgCarcass), compare ? +kg(prevStats.avgCarcass) : ""],
      [t({ en: "Pieces", ar: "عدد القطع" }), stats.pieces, compare ? prevStats.pieces : ""],
      [t({ en: "Notes raised", ar: "الملاحظات" }), issues.length, ""],
    ];

    /* ورقة ٢ — أسطر التقطيع */
    const lines = [[
      t({ en: "Operation no.", ar: "رقم العملية" }), t({ en: "Cut date", ar: "تاريخ التقطيع" }),
      t({ en: "Butcher", ar: "الجزار" }), t({ en: "Butchery", ar: "الملحمة" }),
      t({ en: "Recipe type", ar: "نوع الوصفة" }), t({ en: "Recipe origin", ar: "منشأ الوصفة" }),
      t({ en: "Category", ar: "الفئة" }), t({ en: "Recipe", ar: "الوصفة" }),
      t({ en: "Pathway", ar: "المسار" }), t({ en: "Raw material", ar: "المادة الخام" }),
      t({ en: "Raw kg", ar: "وزن الخام" }), t({ en: "Product", ar: "المنتج" }),
      t({ en: "Code", ar: "الكود" }), t({ en: "Kind", ar: "النوع" }), t({ en: "UoM", ar: "الوحدة" }),
      t({ en: "Actual kg", ar: "الفعلي" }), t({ en: "Target kg", ar: "المستهدف" }),
      t({ en: "Delta %", ar: "الانحراف ٪" }), t({ en: "% of raw", ar: "٪ من الخام" }),
      t({ en: "Status", ar: "الحالة" }),
    ]];
    rows.forEach((r) => r.cuts.forEach((c) => lines.push([
      r.opNo || "", r.day, r.employeeNo, r.branchName,
      r.bomKindName || "", r.bomOriginName || "", r.bomCatName || "", r.bomRef || "",
      r.pathwayLabel || "", r.inputName, +kg(r.carcassKg), c.name, c.sku || "",
      kindName(c.isWaste), c.uom || "", +kg(c.weightKg), c.targetKg ? +kg(c.targetKg) : "",
      c.deltaPct === null ? "" : +c.deltaPct.toFixed(1),
      +pct(c.weightKg, r.baseKg).toFixed(1), statusName(r.reviewStatus),
    ])));

    const aggHead = (first) => [
      first, t({ en: "Operations", ar: "العمليات" }), t({ en: "Raw kg", ar: "الخام" }),
      t({ en: "Products kg", ar: "النواتج" }), t({ en: "Waste kg", ar: "الهدر" }),
      t({ en: "Unaccounted kg", ar: "فاقد" }), t({ en: "Yield %", ar: "التصافي ٪" }),
      t({ en: "Waste %", ar: "الهدر ٪" }),
    ];
    const aggRow = (g) => [
      g.count, +kg(g.carcassKg), +kg(g.cutsKg), +kg(g.wasteKg), +kg(g.unaccountedKg),
      +g.yieldPct.toFixed(1), +g.wastePct.toFixed(1),
    ];

    const daily = [[...aggHead(t({ en: "Date", ar: "التاريخ" })), t({ en: "Butchers", ar: "الجزارون" })]];
    byDay.forEach((g) => daily.push([g.key, ...aggRow(g), g.butchers]));

    const perButcher = [[
      ...aggHead(t({ en: "Butcher", ar: "الجزار" })),
      t({ en: "Employee no.", ar: "الرقم الوظيفي" }), t({ en: "Butcheries", ar: "الملاحم" }),
      t({ en: "Avg raw/op", ar: "متوسط الخام" }), t({ en: "Pieces", ar: "القطع" }),
    ]];
    byButcher.forEach((g) => perButcher.push([
      g.key, ...aggRow(g), g.empNo, g.places, +kg(g.avgCarcass), g.pieces,
    ]));

    const perBranch = [[
      ...aggHead(t({ en: "Butchery", ar: "الملحمة" })),
      t({ en: "Branch code", ar: "كود الفرع" }), t({ en: "Butchers", ar: "الجزارون" }),
    ]];
    byBranch.forEach((g) => perBranch.push([g.key, ...aggRow(g), g.code, g.people]));

    const perRecipe = [[
      ...aggHead(t({ en: "Recipe", ar: "الوصفة" })),
      t({ en: "Category", ar: "الفئة" }), t({ en: "Raw material", ar: "المادة الخام" }),
      t({ en: "Pathways", ar: "المسارات" }),
    ]];
    byRecipe.forEach((g) => perRecipe.push([g.key, ...aggRow(g), g.cat, g.input, g.paths]));

    const perPathway = [[
      t({ en: "Recipe", ar: "الوصفة" }), t({ en: "Pathway code", ar: "كود المسار" }),
      t({ en: "Pathway", ar: "المسار" }), t({ en: "Operations", ar: "العمليات" }),
      t({ en: "Raw kg", ar: "الخام" }), t({ en: "Products kg", ar: "النواتج" }),
      t({ en: "Waste kg", ar: "الهدر" }), t({ en: "Yield %", ar: "التصافي ٪" }),
      t({ en: "Waste %", ar: "الهدر ٪" }), t({ en: "vs best (pp)", ar: "الفرق عن الأفضل" }),
    ]];
    pathwayCompare.forEach((grp) => grp.paths.forEach((p) => perPathway.push([
      grp.ref, p.code || "—", p.label, p.count, +kg(p.carcassKg), +kg(p.cutsKg), +kg(p.wasteKg),
      +p.yieldPct.toFixed(1), +p.wastePct.toFixed(1),
      grp.best ? +(p.yieldPct - grp.best.yieldPct).toFixed(1) : "",
    ])));
    byPathway.forEach((g) => {
      if (!pathwayCompare.some((grp) => grp.ref === g.ref)) {
        perPathway.push([
          g.ref, g.code, g.label, g.count, +kg(g.carcassKg), +kg(g.cutsKg), +kg(g.wasteKg),
          +g.yieldPct.toFixed(1), +g.wastePct.toFixed(1), "",
        ]);
      }
    });

    const perInput = [[
      ...aggHead(t({ en: "Raw material", ar: "المادة الخام" })),
      t({ en: "Code", ar: "الكود" }), t({ en: "Pieces", ar: "القطع" }),
    ]];
    byInput.forEach((g) => perInput.push([g.key, ...aggRow(g), g.sku, g.pieces]));

    const prod = [[
      t({ en: "Product", ar: "المنتج" }), t({ en: "Code", ar: "الكود" }),
      t({ en: "Kind", ar: "النوع" }), t({ en: "Operations", ar: "العمليات" }),
      t({ en: "Lines", ar: "الأسطر" }), t({ en: "Actual kg", ar: "الفعلي" }),
      t({ en: "Target kg", ar: "المستهدف" }), t({ en: "Delta %", ar: "الانحراف ٪" }),
      t({ en: "% of raw", ar: "٪ من الخام" }),
    ]];
    productsSorted.forEach((p) => prod.push([
      p.name, p.sku || "", kindName(p.isWaste), p.opCount, p.n, +kg(p.actual),
      p.target ? +kg(p.target) : "", p.deltaPct === null ? "" : +p.deltaPct.toFixed(1),
      +p.share.toFixed(1),
    ]));

    const wasteSheet = [[
      t({ en: "Waste item", ar: "بند الهدر" }), t({ en: "Code", ar: "الكود" }),
      t({ en: "Lines", ar: "الأسطر" }), t({ en: "Kg", ar: "كجم" }),
      t({ en: "% of waste", ar: "٪ من الهدر" }), t({ en: "% of raw", ar: "٪ من الخام" }),
    ]];
    waste.forEach((w) => wasteSheet.push([
      w.name, w.sku || "", w.n, +kg(w.kg), +w.shareOfWaste.toFixed(1), +w.shareOfRaw.toFixed(1),
    ]));

    const notes = [[
      t({ en: "Date", ar: "التاريخ" }), t({ en: "Operation no.", ar: "رقم العملية" }),
      t({ en: "Butcher", ar: "الجزار" }), t({ en: "Butchery", ar: "الملحمة" }),
      t({ en: "Recipe", ar: "الوصفة" }), t({ en: "Issue", ar: "الملاحظة" }),
      t({ en: "Detail", ar: "التفصيل" }),
    ]];
    issues.forEach((x) => notes.push([x.day, x.opNo || "", x.who, x.branch, x.ref, x.kind, x.detail]));

    const filtersSheet = [[t({ en: "Filter", ar: "الفلتر" }), t({ en: "Value", ar: "القيمة" })]];
    filtersSheet.push([t({ en: "Period", ar: "الفترة" }), `${from} → ${to}`]);
    chips.forEach((c) => filtersSheet.push([c.label, c.text]));
    if (chips.length === 0) filtersSheet.push([t({ en: "Filters", ar: "الفلاتر" }), t({ en: "None", ar: "بلا" })]);
    filtersSheet.push([t({ en: "Exported at", ar: "وقت التصدير" }), new Date().toLocaleString("en-GB")]);

    await downloadExcel([
      { name: "Summary",     aoa: summary,     widths: [30, 20, 20] },
      // نفس أعمدة شاشة «حركات المنتج» الـ١٣ حرفياً — النسخة الورقية تطابق العرض
      { name: "Product Moves", aoa: buildMovesAoa(moves, { isAr }),
        widths: MOVE_COLS.map((c) => Math.round(c.w / 7)) },
      { name: "Operations",  aoa: opsAoa,      widths: [16, 12, 12, 8, 22, 12, 16, 12, 14, 14, 14, 16, 12, 20, 24, 12, 10, 8, 10, 10, 12, 9, 9, 12, 8, 14, 16, 16, 30] },
      { name: "Lines",       aoa: lines,       widths: [16, 12, 22, 16, 14, 14, 14, 16, 18, 24, 10, 26, 12, 10, 8, 10, 10, 10, 10, 14] },
      { name: "By date",     aoa: daily,       widths: [12, 11, 12, 12, 12, 12, 10, 10, 11] },
      { name: "By butcher",  aoa: perButcher,  widths: [24, 11, 12, 12, 12, 12, 10, 10, 14, 22, 12, 10] },
      { name: "By butchery", aoa: perBranch,   widths: [22, 11, 12, 12, 12, 12, 10, 10, 12, 11] },
      { name: "By recipe",   aoa: perRecipe,   widths: [20, 11, 12, 12, 12, 12, 10, 10, 16, 24, 10] },
      { name: "By pathway",  aoa: perPathway,  widths: [20, 14, 22, 11, 12, 12, 12, 10, 10, 12] },
      { name: "By raw",      aoa: perInput,    widths: [26, 11, 12, 12, 12, 12, 10, 10, 12, 9] },
      { name: "Products",    aoa: prod,        widths: [28, 12, 10, 11, 9, 12, 12, 11, 11] },
      { name: "Waste",       aoa: wasteSheet,  widths: [26, 12, 9, 12, 12, 12] },
      { name: "Notes",       aoa: notes,       widths: [12, 16, 22, 16, 16, 24, 34] },
      { name: "Filters",     aoa: filtersSheet, widths: [26, 60] },
    ], `butcher_reports_${from}_${to}.xlsx`);
  };

  const exportPdf = async () => {
    const blocks = [
      {
        title: "Summary",
        head: ["Metric", "Value", compare ? "Previous" : ""],
        rows: [
          ["Operations", fmtInt(stats.count), compare ? fmtInt(prevStats.count) : ""],
          ["Butchers", fmtInt(stats.butchers), compare ? fmtInt(prevStats.butchers) : ""],
          ["Butcheries", fmtInt(byBranch.length), ""],
          ["Recipes used", fmtInt(stats.boms), ""],
          ["Pathways used", fmtInt(byPathway.length), ""],
          ["Raw material (kg)", kg(stats.carcassKg), compare ? kg(prevStats.carcassKg) : ""],
          ["Products (kg)", kg(stats.cutsKg), compare ? kg(prevStats.cutsKg) : ""],
          ["Waste (kg)", kg(stats.wasteKg), compare ? kg(prevStats.wasteKg) : ""],
          ["Unaccounted (kg)", kg(stats.unaccountedKg), compare ? kg(prevStats.unaccountedKg) : ""],
          ["Net yield %", stats.yieldPct.toFixed(1), compare ? prevStats.yieldPct.toFixed(1) : ""],
          ["Waste %", stats.wastePct.toFixed(1), compare ? prevStats.wastePct.toFixed(1) : ""],
          ["Avg raw per operation (kg)", kg(stats.avgCarcass), compare ? kg(prevStats.avgCarcass) : ""],
        ],
        columnStyles: { 1: { halign: "right" }, 2: { halign: "right" } },
      },
      {
        title: "By date",
        head: ["Date", "Ops", "Raw kg", "Products", "Waste", "Yield %", "Waste %"],
        rows: byDay.map((g) => [g.key, g.count, kg(g.carcassKg), kg(g.cutsKg), kg(g.wasteKg),
          g.yieldPct.toFixed(1), g.wastePct.toFixed(1)]),
        columnStyles: { 1: { halign: "right" }, 2: { halign: "right" }, 3: { halign: "right" },
          4: { halign: "right" }, 5: { halign: "right" }, 6: { halign: "right" } },
      },
      {
        title: "By butcher",
        head: ["Butcher", "Emp no.", "Ops", "Raw kg", "Products", "Waste", "Yield %"],
        rows: byButcher.map((g) => [g.key, g.empNo, g.count, kg(g.carcassKg), kg(g.cutsKg),
          kg(g.wasteKg), g.yieldPct.toFixed(1)]),
        columnStyles: { 2: { halign: "right" }, 3: { halign: "right" }, 4: { halign: "right" },
          5: { halign: "right" }, 6: { halign: "right" } },
      },
      {
        title: "By butchery",
        head: ["Butchery", "Ops", "Raw kg", "Products", "Waste", "Yield %"],
        rows: byBranch.map((g) => [g.key, g.count, kg(g.carcassKg), kg(g.cutsKg), kg(g.wasteKg),
          g.yieldPct.toFixed(1)]),
        columnStyles: { 1: { halign: "right" }, 2: { halign: "right" }, 3: { halign: "right" },
          4: { halign: "right" }, 5: { halign: "right" } },
      },
      {
        title: "By recipe",
        head: ["Recipe", "Category", "Ops", "Raw kg", "Products", "Waste", "Yield %"],
        rows: byRecipe.map((g) => [g.key, g.cat, g.count, kg(g.carcassKg), kg(g.cutsKg),
          kg(g.wasteKg), g.yieldPct.toFixed(1)]),
        columnStyles: { 2: { halign: "right" }, 3: { halign: "right" }, 4: { halign: "right" },
          5: { halign: "right" }, 6: { halign: "right" } },
      },
    ];

    const pathRows = [];
    pathwayCompare.forEach((grp) => grp.paths.forEach((p) => pathRows.push([
      grp.ref, p.code || "-", p.count, kg(p.carcassKg), kg(p.cutsKg), kg(p.wasteKg),
      p.yieldPct.toFixed(1),
      grp.best ? `${(p.yieldPct - grp.best.yieldPct) > 0 ? "+" : ""}${(p.yieldPct - grp.best.yieldPct).toFixed(1)}` : "-",
    ])));
    byPathway.forEach((g) => {
      if (!pathwayCompare.some((grp) => grp.ref === g.ref)) {
        pathRows.push([g.ref, g.code, g.count, kg(g.carcassKg), kg(g.cutsKg), kg(g.wasteKg),
          g.yieldPct.toFixed(1), "-"]);
      }
    });
    if (pathRows.length) {
      blocks.push({
        title: "Pathways",
        head: ["Recipe", "Pathway", "Ops", "Raw kg", "Products", "Waste", "Yield %", "vs best"],
        rows: pathRows,
        columnStyles: { 2: { halign: "right" }, 3: { halign: "right" }, 4: { halign: "right" },
          5: { halign: "right" }, 6: { halign: "right" }, 7: { halign: "right" } },
      });
    }

    blocks.push({
      title: "Products vs recipe targets",
      head: ["Product", "Code", "Kind", "Ops", "Actual kg", "Target kg", "Delta %", "% of raw"],
      rows: productsSorted.map((p) => [
        p.name, p.sku || "-", p.isWaste ? "Waste" : "Product", p.opCount, kg(p.actual),
        p.target ? kg(p.target) : "-",
        p.deltaPct === null ? "-" : `${p.deltaPct > 0 ? "+" : ""}${p.deltaPct.toFixed(1)}`,
        p.share.toFixed(1),
      ]),
      columnStyles: { 3: { halign: "right" }, 4: { halign: "right" }, 5: { halign: "right" },
        6: { halign: "right" }, 7: { halign: "right" } },
    });

    blocks.push({
      title: "Operations",
      head: ["Op no.", "Date", "Butcher", "Butchery", "Type", "Origin", "Recipe", "Pathway",
        "Raw kg", "Products", "Waste", "Yield %", "Time", "Status"],
      rows: rows.slice(0, 600).map((r) => [
        r.opNo || "-", r.day, r.employeeNo, r.branchName,
        r.bomKindName || "-", r.bomOriginName || "-", r.bomRef || "-", r.pathwayCode || "-",
        kg(r.carcassKg), kg(r.cutsKg), kg(r.wasteKg), r.yieldPct.toFixed(1),
        r.durationMin || "-", r.reviewStatus || "pending",
      ]),
      columnStyles: { 8: { halign: "right" }, 9: { halign: "right" }, 10: { halign: "right" },
        11: { halign: "right" }, 12: { halign: "right" } },
    });

    if (issues.length) {
      blocks.push({
        title: "Notes & data quality",
        head: ["Date", "Op no.", "Butcher", "Recipe", "Issue", "Detail"],
        rows: issues.slice(0, 300).map((x) => [x.day, x.opNo || "-", x.who, x.ref, x.kind, x.detail]),
      });
    }

    await downloadPdf({
      title: "BUTCHER CUTTING REPORT",
      meta: [
        `Period: ${from} to ${to}`,
        branches.length ? `Butcheries: ${branches.join(", ")}` : "All butcheries",
        `Operations: ${stats.count}`,
        `Printed: ${new Date().toLocaleString("en-GB")}`,
      ],
      blocks,
      filename: `butcher_reports_${from}_${to}.pdf`,
    });
  };

  /* طباعة التقرير كاملاً — نعرض كل التبويبات مؤقّتاً ثم نرجع لحالتنا */
  const printFull = () => {
    setPrintAll(true);
    setTimeout(() => {
      window.print();
      setPrintAll(false);
    }, 150);
  };

  /* ══════════════ العرض ══════════════ */

  if (!canOpenButcherPage("butcher.view")) return <NoAccess page="butcher.view" />;

  const show = (id) => printAll || tab === id;
  const shownRows = printAll ? rows.slice(0, 400) : rows.slice(0, limit);
  const opCovered = filtered.filter((r) => r.opNo).length;

  const tabCounts = {
    moves: moves.length,
    ops: rows.length,
    products: products.length,
    pathways: byPathway.length,
    notes: issues.length,
  };

  return (
    <div dir={dir} className="bk bk-page odoo-skin" style={S.page}>
      <style>{`${KIT_CSS}
${VIEW_CSS}
${ODOO_SKIN_CSS}`}</style>
      {/* الصفحة كلها تملأ الشاشة — الهامش الوحيد هو حشوة الصفحة الجانبية */}
      <div style={{ ...S.wrap, maxWidth: "none" }}>

        {/* ══ شريط تطبيق Odoo — يستبدل شريط التبويبات القديم ══ */}
        <OdooNavbar
          brand={t({ en: "Butchery", ar: "التقطيع" })}
          items={TABS}
          value={tab}
          onChange={setTab}
          counts={tabCounts}
          onHome={() => navigate("/butcher")}
          isAr={isAr}
          t={t}
          userName={userName}
        />

        {/* ══ الترويسة ══ */}
        <header className="bv-hero">
          <span className="bv-hero-glow" aria-hidden="true" />
          <div className="bv-hero-row">
            <span className="bv-hero-icon" aria-hidden="true">📋</span>
            <div style={{ minWidth: 0, flex: 1 }}>
              <div className="bv-hero-title">{t({ en: "Butcher Reports", ar: "تقارير الجزار" })}</div>
              <div className="bv-hero-sub">
                {t({
                  en: "Every cutting operation — weights, yields, pathways and review status in one place.",
                  ar: "كل عملية تقطيع — الأوزان والتصافي والمسارات وحالة المراجعة بمكان واحد.",
                })}
              </div>
            </div>
            <div className="bk-actions bk-noprint" style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <LangToggle lang={lang} toggle={toggle} style={{ borderRadius: 12, padding: "8px 14px" }} />
              <button type="button" className="bv-hbtn" onClick={reload}>
                ↻ {t({ en: "Refresh", ar: "تحديث" })}
              </button>
              <button type="button" className="bv-hbtn" onClick={printFull}>
                🖨 {t({ en: "Print", ar: "طباعة" })}
              </button>
              <button type="button" className="bv-hbtn" onClick={exportCsv} disabled={!rows.length}>
                ⬇ CSV
              </button>
              <button type="button" className="bv-hbtn" onClick={exportPdf} disabled={!rows.length}>
                ⬇ PDF
              </button>
              <button type="button" className="bv-hbtn bv-hbtn-solid" onClick={exportExcel} disabled={!rows.length}>
                ⬇ Excel
              </button>
              <button type="button" className="bv-hbtn" onClick={() => navigate("/butcher", { replace: true })}>
                ← {t({ en: "Back", ar: "رجوع" })}
              </button>
            </div>
          </div>

          <div className="bv-hero-strip">
            <span className="bv-hpill">📅 {from} → {to}</span>
            <span className="bv-hpill">🧾 {fmtInt(rows.length)} {t({ en: "operations", ar: "عملية" })}</span>
            <span className="bv-hpill">👤 {fmtInt(stats.butchers)} {t({ en: "butchers", ar: "جزار" })}</span>
            <span className="bv-hpill">🏪 {fmtInt(byBranch.length)} {t({ en: "butcheries", ar: "ملحمة" })}</span>
            <span className="bv-hpill">📘 {fmtInt(stats.boms)} {t({ en: "recipes", ar: "وصفة" })}</span>
            {byPathway.length > 0 && (
              <span className="bv-hpill">🔀 {fmtInt(byPathway.length)} {t({ en: "pathways", ar: "مسار" })}</span>
            )}
            <span className="bv-hpill">
              🔢 {fmtInt(opCovered)}/{fmtInt(filtered.length)} {t({ en: "numbered", ar: "مرقّمة" })}
            </span>
          </div>
        </header>

        {/* ترويسة الطباعة — بديل الترويسة الملوّنة على الورق */}
        <div className="bv-printhead" style={{ marginBottom: 10 }}>
          <div style={{ fontWeight: 900, fontSize: 18 }}>
            {t({ en: "BUTCHER CUTTING REPORT", ar: "تقرير تقطيع الجزار" })}
          </div>
          <div style={{ color: C.muted, fontWeight: 700 }}>
            {from} → {to} · {fmtInt(rows.length)} {t({ en: "operations", ar: "عملية" })} ·{" "}
            {new Date().toLocaleString("en-GB")}
          </div>
        </div>

        {/* ══ الفلاتر ══ */}
        <Card
          className="bk-noprint"
          icon="🔎"
          title={t({ en: "Filters", ar: "الفلاتر" })}
          sub={chips.length
            ? t({ en: `${chips.length} filter(s) active`, ar: `${chips.length} فلتر مفعّل` })
            : t({ en: "Pick a period, then narrow by anything", ar: "اختر الفترة ثم ضيّق حسب أي شيء" })}
          actions={
            <div style={{ display: "flex", gap: 8, marginInlineStart: "auto", flexWrap: "wrap" }}>
              {openFilters && (
                <button
                  type="button"
                  className={`bv-flag ${showAdvanced ? "on" : ""}`}
                  onClick={() => setShowAdvanced((v) => !v)}
                >
                  ⚙️ {t({ en: "Advanced", ar: "فلاتر متقدّمة" })} {showAdvanced ? "▲" : "▼"}
                </button>
              )}
              {openFilters && (
                <button type="button" style={{ ...S.btn, ...S.btnSm }} onClick={resetAll}>
                  ✕ {t({ en: "Reset", ar: "تصفير" })}
                </button>
              )}
              <button
                type="button"
                style={{ ...S.btn, ...S.btnSm, ...(openFilters ? null : S.btnPrimary) }}
                onClick={() => setOpenFilters((v) => !v)}
              >
                {openFilters
                  ? `▲ ${t({ en: "Collapse", ar: "طيّ" })}`
                  : `▼ ${t({ en: "Open filters", ar: "فتح الفلاتر" })}`}
              </button>
            </div>
          }
        >
          {openFilters && (<>
          {/* الفترات الجاهزة */}
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 12 }}>
            {presets.map((p) => (
              <button
                key={p.lbl}
                type="button"
                style={{ ...S.btn, ...S.btnSm, ...(from === p.a && to === p.b ? S.btnPrimary : null) }}
                onClick={() => { setFrom(p.a); setTo(p.b); }}
              >
                {p.lbl}
              </button>
            ))}
          </div>

          {/* الصف الأساسي */}
          <div className="bk-tools" style={S.toolbar}>
            <label style={S.label}>
              <span className="bk-lbl" style={{ color: C.muted }}>{t({ en: "From", ar: "من" })}</span>
              <input type="date" value={from} max={to || undefined}
                onChange={(e) => setFrom(e.target.value)} style={S.input} />
            </label>
            <label style={S.label}>
              <span className="bk-lbl" style={{ color: C.muted }}>{t({ en: "To", ar: "إلى" })}</span>
              <input type="date" value={to} min={from || undefined}
                onChange={(e) => setTo(e.target.value)} style={S.input} />
            </label>
            <MultiPicker
              label={t({ en: "Butchery", ar: "الملحمة" })} t={t}
              options={branchOpts} value={branches} onChange={setBranches}
            />
            <MultiPicker
              label={t({ en: "Butcher", ar: "الجزار" })} t={t}
              options={butcherOpts} value={butchers} onChange={setButchers}
            />
            <MultiPicker
              label={t({ en: "Recipe", ar: "الوصفة" })} t={t}
              options={recipeOpts} value={recipes} onChange={setRecipes}
            />
            <MultiPicker
              label={t({ en: "Pathway", ar: "المسار" })} t={t}
              options={pathwayOpts} value={pathways} onChange={setPathways}
            />
            <label style={S.label}>
              <span className="bk-lbl" style={{ color: C.muted }}>
                {t({ en: "Search everything", ar: "بحث في كل شيء" })}
              </span>
              <input
                value={q} onChange={(e) => setQ(e.target.value)}
                placeholder={t({
                  en: "Butcher, recipe, product, code, reason…",
                  ar: "جزار، وصفة، منتج، كود، سبب…",
                })}
                style={S.input}
              />
            </label>
            <label style={S.label}>
              <span className="bk-lbl" style={{ color: C.muted }}>
                {t({ en: "Operation no.", ar: "رقم العملية" })}
              </span>
              <input
                value={opQ} onChange={(e) => setOpQ(e.target.value)}
                placeholder="POS 10 — 00001"
                style={S.input}
              />
            </label>
          </div>

          {/* الفلاتر المتقدّمة */}
          {showAdvanced && (
            <>
              <div className="bk-tools bk-rise" style={{ ...S.toolbar, marginTop: 12 }}>
                <MultiPicker
                  label={t({ en: "Type", ar: "النوع" })} t={t}
                  options={kindOpts} value={kinds} onChange={setKinds}
                />
                <MultiPicker
                  label={t({ en: "Origin", ar: "المنشأ" })} t={t}
                  options={originOpts} value={origins} onChange={setOrigins}
                />
                <MultiPicker
                  label={t({ en: "Category", ar: "الفئة" })} t={t}
                  options={catOpts} value={cats} onChange={setCats}
                />
                <MultiPicker
                  label={t({ en: "Raw material", ar: "المادة الخام" })} t={t}
                  options={inputOpts} value={inputs} onChange={setInputs}
                />
                <MultiPicker
                  label={t({ en: "Contains product", ar: "يحتوي منتج" })} t={t}
                  options={itemOpts} value={items} onChange={setItems}
                />
                <MultiPicker
                  label={t({ en: "Review status", ar: "حالة المراجعة" })} t={t}
                  options={statusOpts} value={statuses} onChange={setStatuses}
                />
                <label style={S.label}>
                  <span className="bk-lbl" style={{ color: C.muted }}>
                    {t({ en: "Yield % from", ar: "التصافي ٪ من" })}
                  </span>
                  <input type="number" min="0" max="100" value={yieldMin}
                    onChange={(e) => setYieldMin(e.target.value)} placeholder="0" style={S.input} />
                </label>
                <label style={S.label}>
                  <span className="bk-lbl" style={{ color: C.muted }}>
                    {t({ en: "Yield % to", ar: "التصافي ٪ إلى" })}
                  </span>
                  <input type="number" min="0" max="100" value={yieldMax}
                    onChange={(e) => setYieldMax(e.target.value)} placeholder="100" style={S.input} />
                </label>
                <label style={S.label}>
                  <span className="bk-lbl" style={{ color: C.muted }}>
                    {t({ en: "Deviation threshold %", ar: "حدّ الانحراف ٪" })}
                  </span>
                  <input type="number" min="1" max="100" value={devPct}
                    onChange={(e) => setDevPct(e.target.value)} style={S.input} />
                </label>
              </div>

              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 12 }}>
                {[
                  { on: onlyDeviating, set: setOnlyDeviating, icon: "⚠️",
                    lbl: t({ en: `Deviating > ${devPct}%`, ar: `منحرف أكثر من ${devPct}٪` }) },
                  { on: onlyUnaccounted, set: setOnlyUnaccounted, icon: "⚖️",
                    lbl: t({ en: "Unaccounted weight", ar: "فيه فاقد غير مسجّل" }) },
                  { on: onlyPathway, set: setOnlyPathway, icon: "🔀",
                    lbl: t({ en: "Has a pathway", ar: "له مسار" }) },
                  { on: onlyNoOpNo, set: setOnlyNoOpNo, icon: "🔢",
                    lbl: t({ en: "Missing operation no.", ar: "بلا رقم عملية" }) },
                  { on: onlyBackdated, set: setOnlyBackdated, icon: "🕗",
                    lbl: t({ en: "Backdated entry", ar: "إدخال بأثر رجعي" }) },
                  { on: compare, set: setCompare, icon: "📊",
                    lbl: t({ en: "Compare with previous period", ar: "قارن بالفترة السابقة" }) },
                ].map((f) => (
                  <button
                    key={f.lbl}
                    type="button"
                    className={`bv-flag ${f.on ? "on" : ""}`}
                    onClick={() => f.set((v) => !v)}
                  >
                    <span aria-hidden="true">{f.icon}</span>{f.lbl}
                    <span style={{ fontWeight: 900 }}>{f.on ? "✓" : ""}</span>
                  </button>
                ))}
              </div>
            </>
          )}

          {/* الشرائح الفعّالة */}
          {chips.length > 0 && (
            <div className="bv-fchips">
              {chips.map((c, i) => (
                <span key={`${c.label}${i}`} className="bv-fchip">
                  <span style={{ opacity: 0.72 }}>{c.label}:</span>
                  <b style={{ maxWidth: 260, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {c.text}
                  </b>
                  <button type="button" onClick={c.clear} title={t({ en: "Remove", ar: "إزالة" })}>✕</button>
                </span>
              ))}
              <button type="button" style={{ ...S.btn, ...S.btnSm }} onClick={resetFilters}>
                {t({ en: "Clear all filters", ar: "مسح كل الفلاتر" })}
              </button>
            </div>
          )}
          </>)}
        </Card>

        {/* ══ المؤشّرات ══ */}
        <button
          type="button"
          className="bk-noprint"
          style={FOLD_BAR}
          onClick={() => setOpenKpis((v) => !v)}
        >
          <span>📊 {t({ en: "Key figures", ar: "المؤشّرات" })}</span>
          <span style={{ color: C.muted, fontWeight: 800 }}>
            {openKpis
              ? t({ en: "hide", ar: "إخفاء" })
              : t({ en: `${fmtInt(rows.length)} operations · show`, ar: `${fmtInt(rows.length)} عملية · إظهار` })}
          </span>
          <span style={{ marginInlineStart: "auto" }}>{openKpis ? "▲" : "▼"}</span>
        </button>

        {(openKpis || printAll) && (
        <div className="bk-kpis" style={S.kpiGrid}>
          <StatCard
            icon="🧾" color={C.blue}
            label={t({ en: "Operations", ar: "العمليات" })}
            value={fmtInt(stats.count)}
            delta={relDelta(stats.count, prevStats.count)}
            hint={t({ en: `${fmtInt(opCovered)} numbered`, ar: `${fmtInt(opCovered)} مرقّمة` })}
            spark={byDayAsc.map((d) => d.count)}
          />
          <StatCard
            icon="🥩" color={C.blueDk}
            label={t({ en: "Raw material", ar: "المادة الخام" })}
            value={fmt(stats.carcassKg)} unit="kg"
            delta={relDelta(stats.carcassKg, prevStats.carcassKg)}
            hint={t({ en: `avg ${fmt(stats.avgCarcass)}`, ar: `متوسط ${fmt(stats.avgCarcass)}` })}
            spark={byDayAsc.map((d) => d.carcassKg)}
          />
          <StatCard
            icon="✅" color={C.teal}
            label={t({ en: "Products", ar: "النواتج" })}
            value={fmt(stats.cutsKg)} unit="kg"
            delta={relDelta(stats.cutsKg, prevStats.cutsKg)}
          />
          <StatCard
            icon="🗑️" color={C.amber} invert
            label={t({ en: "Waste", ar: "الهدر" })}
            value={fmt(stats.wasteKg)} unit="kg"
            delta={relDelta(stats.wasteKg, prevStats.wasteKg)}
          />
          <StatCard
            icon="📈" color={C.green}
            label={t({ en: "Net yield", ar: "نسبة التصافي" })}
            value={stats.yieldPct.toFixed(1)} unit="%"
            delta={ppDelta(stats.yieldPct, prevStats.yieldPct, hasPrev)} deltaUnit="pp"
            spark={byDayAsc.map((d) => d.yieldPct)}
          />
          <StatCard
            icon="📉" color={C.red} invert
            label={t({ en: "Waste %", ar: "نسبة الهدر" })}
            value={stats.wastePct.toFixed(1)} unit="%"
            delta={ppDelta(stats.wastePct, prevStats.wastePct, hasPrev)} deltaUnit="pp"
          />
          <StatCard
            icon="⚖️" color={C.amber} invert
            label={t({ en: "Unaccounted", ar: "فاقد غير مسجّل" })}
            value={fmt(stats.unaccountedKg)} unit="kg"
            hint={t({ en: `${pct(stats.unaccountedKg, stats.baseKg).toFixed(2)}% of raw`,
              ar: `${pct(stats.unaccountedKg, stats.baseKg).toFixed(2)}٪ من الخام` })}
          />
          <StatCard
            icon="👤" color={C.violet}
            label={t({ en: "Butchers", ar: "الجزارون" })}
            value={fmtInt(stats.butchers)}
            hint={t({ en: `${byBranch.length} butcheries`, ar: `${byBranch.length} ملحمة` })}
          />
          <StatCard
            icon="📘" color={C.ink2}
            label={t({ en: "Recipes used", ar: "وصفات مستعملة" })}
            value={fmtInt(stats.boms)}
            hint={byPathway.length
              ? t({ en: `${byPathway.length} pathways`, ar: `${byPathway.length} مسار` })
              : (stats.pieces ? t({ en: `${stats.pieces} pieces`, ar: `${stats.pieces} قطعة` }) : "")}
          />
          <StatCard
            icon="⏳" color={C.amber} invert
            label={t({ en: "Pending review", ar: "بانتظار المراجعة" })}
            value={fmtInt(filtered.filter((r) => (r.reviewStatus || "pending") === "pending").length)}
            hint={t({
              en: `${filtered.filter((r) => r.reviewStatus === "rejected").length} rejected`,
              ar: `${filtered.filter((r) => r.reviewStatus === "rejected").length} مرفوض`,
            })}
          />
        </div>
        )}

        <ErrorNote error={error} t={t} onRetry={reload} />

        {truncated && (
          <div style={{ ...S.card, background: "#fff7ed", borderColor: "#fcd9a4", color: "#8a5a12", fontWeight: 800 }}>
            ⚠️ {t({
              en: "This period holds more records than one page can load, so the oldest are missing. Narrow the range for complete figures.",
              ar: "هذه الفترة فيها سجلات أكثر مما يُحمَّل دفعة واحدة، فالأقدم غير محسوب. ضيّق المدى للحصول على أرقام كاملة.",
            })}
          </div>
        )}

        {loading ? (
          <Card><Skeleton rows={9} /></Card>
        ) : !rows.length ? (
          <Card>
            <EmptyBox>
              {t({
                en: "No cutting operation matches these filters.",
                ar: "ما في أي عملية تقطيع مطابقة لهذه الفلاتر.",
              })}
            </EmptyBox>
          </Card>
        ) : (
          <>
            {/* ══════════ حركات المنتج — عرض Odoo ══════════ */}
            {show("moves") && (
              <div className={printAll ? "bk-pagebreak" : ""}>
                <OdooMoves
                  moves={moves}
                  t={t}
                  isAr={isAr}
                  dateFrom={from}
                  dateTo={to}
                  chips={chips}
                  onExportCsv={downloadCsv}
                  onExportXlsx={downloadExcel}
                  printMode={printAll}
                />
              </div>
            )}

            {/* ══════════ نظرة عامة ══════════ */}
            {show("overview") && (
              <>
                <Card
                  icon="📈"
                  title={t({ en: "Daily yield trend", ar: "اتجاه التصافي اليومي" })}
                  sub={t({
                    en: "Net yield % per cutting day across the selected period.",
                    ar: "نسبة التصافي لكل يوم تقطيع خلال الفترة المختارة.",
                  })}
                >
                  {byDayAsc.length > 1 ? (
                    <LineChart
                      data={byDayAsc.map((d) => ({ label: d.key, value: d.yieldPct }))}
                      unit="%" color={C.green} height={200}
                      label={t({ en: "Daily net yield", ar: "التصافي اليومي" })}
                    />
                  ) : (
                    <EmptyBox>{t({ en: "Need at least two days.", ar: "بحاجة ليومين على الأقل." })}</EmptyBox>
                  )}
                </Card>

                <div className="bv-grid2">
                  <Card
                    icon="🏆"
                    title={t({ en: "Top butchers", ar: "أعلى الجزارين" })}
                    sub={t({ en: "By raw material handled (kg)", ar: "حسب المادة الخام المُقطَّعة (كجم)" })}
                  >
                    <BarChart
                      data={byButcher.slice(0, 8).map((g) => ({ label: g.key, value: g.carcassKg }))}
                      unit=" kg" color={C.blue}
                    />
                  </Card>
                  <Card
                    icon="🥩"
                    title={t({ en: "Top products", ar: "أعلى المنتجات" })}
                    sub={t({ en: "By actual weight produced (kg)", ar: "حسب الوزن الفعلي المُنتَج (كجم)" })}
                  >
                    <BarChart
                      data={[...products].filter((p) => !p.isWaste)
                        .sort((a, b) => b.actual - a.actual).slice(0, 8)
                        .map((p) => ({ label: p.name, value: p.actual }))}
                      unit=" kg" color={C.teal}
                    />
                  </Card>
                </div>

                <div className="bv-grid2">
                  <Card icon="🏪" title={t({ en: "By butchery", ar: "حسب الملحمة" })}>
                    <TableWrap minWidth={560}>
                      <thead>
                        <tr>
                          <AggTh label={t({ en: "Butchery", ar: "الملحمة" })} col="key" sort={aggSort} setSort={setAggSort} />
                          <AggTh label={t({ en: "Ops", ar: "العمليات" })} col="count" sort={aggSort} setSort={setAggSort} numeric />
                          <AggTh label={t({ en: "Raw kg", ar: "الخام" })} col="carcassKg" sort={aggSort} setSort={setAggSort} numeric />
                          <AggTh label={t({ en: "Waste kg", ar: "الهدر" })} col="wasteKg" sort={aggSort} setSort={setAggSort} numeric />
                          <AggTh label={t({ en: "Yield %", ar: "التصافي ٪" })} col="yieldPct" sort={aggSort} setSort={setAggSort} />
                        </tr>
                      </thead>
                      <tbody>
                        {sortRows(byBranch, aggSort.key, aggSort.dir).map((g) => (
                          <tr key={g.key}>
                            <td style={{ ...S.td, fontWeight: 900 }}>
                              {g.key}
                              <div className="bk-lbl" style={{ color: C.muted }}>
                                {g.code} · {g.people} {t({ en: "butchers", ar: "جزار" })}
                              </div>
                            </td>
                            <td style={{ ...S.td, ...S.tdNum }}>{fmtInt(g.count)}</td>
                            <td style={{ ...S.td, ...S.tdNum }}>{fmt(g.carcassKg)}</td>
                            <td style={{ ...S.td, ...S.tdNum, color: C.amber }}>{fmt(g.wasteKg)}</td>
                            <td style={S.td}>
                              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                                <MiniBar value={g.yieldPct} max={100} color={C.green} />
                                <b style={{ color: C.green, minWidth: 50 }}>{g.yieldPct.toFixed(1)}%</b>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </TableWrap>
                  </Card>

                  <Card icon="📘" title={t({ en: "By recipe", ar: "حسب الوصفة" })}>
                    <TableWrap minWidth={560}>
                      <thead>
                        <tr>
                          <th style={S.th}>{t({ en: "Recipe", ar: "الوصفة" })}</th>
                          <th style={{ ...S.th, textAlign: "end" }}>{t({ en: "Ops", ar: "العمليات" })}</th>
                          <th style={{ ...S.th, textAlign: "end" }}>{t({ en: "Raw kg", ar: "الخام" })}</th>
                          <th style={{ ...S.th, textAlign: "end" }}>{t({ en: "Paths", ar: "المسارات" })}</th>
                          <th style={S.th}>{t({ en: "Yield %", ar: "التصافي ٪" })}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {byRecipe.slice(0, 14).map((g) => (
                          <tr key={g.key}>
                            <td style={{ ...S.td, fontWeight: 900 }}>
                              <Chip>{g.key}</Chip>
                              <div className="bk-lbl" style={{ color: C.muted, marginTop: 4 }}>
                                {g.cat} · {g.input}
                              </div>
                            </td>
                            <td style={{ ...S.td, ...S.tdNum }}>{fmtInt(g.count)}</td>
                            <td style={{ ...S.td, ...S.tdNum }}>{fmt(g.carcassKg)}</td>
                            <td style={{ ...S.td, ...S.tdNum }}>{g.paths || "—"}</td>
                            <td style={S.td}>
                              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                                <MiniBar value={g.yieldPct} max={100} color={C.green} />
                                <b style={{ color: C.green, minWidth: 50 }}>{g.yieldPct.toFixed(1)}%</b>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </TableWrap>
                  </Card>
                </div>

                <Card
                  icon="📆"
                  title={t({ en: "By date", ar: "حسب التاريخ" })}
                  sub={t({ en: "Daily volume, waste and yield.", ar: "الحجم والهدر والتصافي اليومي." })}
                >
                  <TableWrap minWidth={720}>
                    <thead>
                      <tr>
                        <th style={S.th}>{t({ en: "Date", ar: "التاريخ" })}</th>
                        <th style={{ ...S.th, textAlign: "end" }}>{t({ en: "Ops", ar: "العمليات" })}</th>
                        <th style={{ ...S.th, textAlign: "end" }}>{t({ en: "Butchers", ar: "الجزارون" })}</th>
                        <th style={{ ...S.th, textAlign: "end" }}>{t({ en: "Raw kg", ar: "الخام" })}</th>
                        <th style={{ ...S.th, textAlign: "end" }}>{t({ en: "Products", ar: "النواتج" })}</th>
                        <th style={{ ...S.th, textAlign: "end" }}>{t({ en: "Waste", ar: "الهدر" })}</th>
                        <th style={S.th}>{t({ en: "Yield", ar: "التصافي" })}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {byDay.map((g) => (
                        <tr key={g.key}>
                          <td style={{ ...S.td, fontWeight: 900 }}>{g.key}</td>
                          <td style={{ ...S.td, ...S.tdNum }}>{fmtInt(g.count)}</td>
                          <td style={{ ...S.td, ...S.tdNum }}>{fmtInt(g.butchers)}</td>
                          <td style={{ ...S.td, ...S.tdNum }}>{fmt(g.carcassKg)}</td>
                          <td style={{ ...S.td, ...S.tdNum, color: C.teal }}>{fmt(g.cutsKg)}</td>
                          <td style={{ ...S.td, ...S.tdNum, color: C.amber }}>{fmt(g.wasteKg)}</td>
                          <td style={S.td}>
                            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                              <MiniBar value={g.yieldPct} max={100} color={C.green} />
                              <b style={{ color: C.green, minWidth: 50 }}>{g.yieldPct.toFixed(1)}%</b>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </TableWrap>
                </Card>
              </>
            )}

            {/* ══════════ العمليات ══════════ */}
            {show("ops") && (
              <Card
                className={printAll ? "bk-pagebreak" : ""}
                icon="🧾"
                title={t({ en: "Cutting operations", ar: "عمليات التقطيع" })}
                sub={t({
                  en: "Click a row to open its full breakdown — every product, target and delta.",
                  ar: "اضغط أي سطر لفتح تفاصيله كاملة — كل منتج وهدفه وانحرافه.",
                })}
                actions={
                  <div className="bk-noprint" style={{ display: "flex", gap: 8, marginInlineStart: "auto", flexWrap: "wrap", alignItems: "center" }}>
                    <button
                      type="button" style={{ ...S.btn, ...S.btnSm }}
                      onClick={() => setOpenIds(new Set(shownRows.map((r) => r.id)))}
                    >
                      ⤢ {t({ en: "Expand all", ar: "فتح الكل" })}
                    </button>
                    <button
                      type="button" style={{ ...S.btn, ...S.btnSm }}
                      onClick={() => setOpenIds(new Set())}
                    >
                      ⤡ {t({ en: "Collapse", ar: "طيّ الكل" })}
                    </button>
                    <select
                      value={limit} onChange={(e) => setLimit(Number(e.target.value))}
                      style={{ ...S.input, width: "auto" }}
                    >
                      {PAGE_SIZES.map((n) => (
                        <option key={n} value={n}>
                          {t({ en: `${n} rows`, ar: `${n} سطر` })}
                        </option>
                      ))}
                    </select>
                    <button type="button" style={{ ...S.btn, ...S.btnSm }} onClick={exportCsv}>
                      ⬇ CSV
                    </button>
                  </div>
                }
              >
                <TableWrap minWidth={1160}>
                  <thead>
                    <tr>
                      <SortTh label={t({ en: "Operation", ar: "العملية" })} col="opNo" sort={sort} onSort={toggleSort} />
                      <SortTh label={t({ en: "Cut date", ar: "تاريخ التقطيع" })} col="day" sort={sort} onSort={toggleSort} />
                      <SortTh label={t({ en: "Butcher", ar: "الجزار" })} col="employeeNo" sort={sort} onSort={toggleSort} />
                      <SortTh label={t({ en: "Butchery", ar: "الملحمة" })} col="branchName" sort={sort} onSort={toggleSort} />
                      <SortTh label={t({ en: "Recipe · Pathway", ar: "الوصفة · المسار" })} col="bomRef" sort={sort} onSort={toggleSort} />
                      <SortTh label={t({ en: "Raw material", ar: "المادة الخام" })} col="inputName" sort={sort} onSort={toggleSort} />
                      <SortTh label={t({ en: "Raw kg", ar: "الخام" })} col="carcassKg" sort={sort} onSort={toggleSort} numeric />
                      <SortTh label={t({ en: "Products", ar: "النواتج" })} col="cutsKg" sort={sort} onSort={toggleSort} numeric />
                      <SortTh label={t({ en: "Waste", ar: "الهدر" })} col="wasteKg" sort={sort} onSort={toggleSort} numeric />
                      <SortTh label={t({ en: "Yield %", ar: "التصافي ٪" })} col="yieldPct" sort={sort} onSort={toggleSort} numeric />
                      <SortTh label={t({ en: "Time (min)", ar: "الوقت (دقيقة)" })} col="durationMin" sort={sort} onSort={toggleSort} numeric />
                      <SortTh label={t({ en: "Status", ar: "الحالة" })} col="reviewStatus" sort={sort} onSort={toggleSort} />
                    </tr>
                  </thead>
                  <tbody>
                    {shownRows.map((r) => {
                      const open = printAll || openIds.has(r.id);
                      return (
                        <React.Fragment key={r.id}>
                          <tr className="bv-trow" onClick={() => toggleRow(r.id)}>
                            <td style={S.td}>
                              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                <span className="bv-exp bk-noprint" aria-hidden="true">{open ? "−" : "+"}</span>
                                {r.opNo
                                  ? <span style={S.opNo}>{r.opNo}</span>
                                  : <span className="bk-lbl" style={{ color: C.muted }}>—</span>}
                              </div>
                            </td>
                            <td style={S.td}>
                              <b>{r.day}</b>
                              <div className="bk-lbl" style={{ color: C.muted }}>
                                {r.time}
                                {r.entryDay && r.entryDay !== r.day
                                  ? ` · ${t({ en: "entered", ar: "أُدخل" })} ${r.entryDay}` : ""}
                              </div>
                            </td>
                            <td style={S.td}>
                              <b>{r.employeeNo}</b>
                              {r.payload?.butcherJob && (
                                <div className="bk-lbl" style={{ color: C.muted }}>{r.payload.butcherJob}</div>
                              )}
                            </td>
                            <td style={S.td}>
                              {r.branchName}
                              <div className="bk-lbl" style={{ color: C.muted }}>{r.branchCode}</div>
                            </td>
                            <td style={S.td}>
                              <Chip>{r.bomRef || "—"}</Chip>
                              {r.pathwayLabel && (
                                <div style={{ marginTop: 5 }}>
                                  <span className="bk-chip" style={{
                                    display: "inline-flex", alignItems: "center", gap: 5,
                                    background: "#f3eefe", color: C.violet, borderRadius: 999,
                                    padding: "3px 10px", fontWeight: 800, whiteSpace: "nowrap",
                                  }}>🔀 {r.pathwayLabel}</span>
                                </div>
                              )}
                              {(r.bomKindName || r.bomOriginName) && (
                                <div className="bk-lbl" style={{ color: C.muted, marginTop: 3 }}>
                                  {[r.bomKindName && `🐑 ${r.bomKindName}`,
                                    r.bomOriginName && `🌍 ${r.bomOriginName}`]
                                    .filter(Boolean).join(" · ")}
                                </div>
                              )}
                              {r.bomCatName && (
                                <div className="bk-lbl" style={{ color: C.muted, marginTop: 3 }}>{r.bomCatName}</div>
                              )}
                            </td>
                            <td style={S.td}>
                              {r.inputName}
                              {r.inputNameAlt && (
                                <div className="bk-lbl" style={{ color: C.muted }}>{r.inputNameAlt}</div>
                              )}
                              <div className="bk-lbl" style={{ color: C.muted }}>
                                {r.inputSku ? `${r.inputSku} · ` : ""}
                                {r.pieceCount !== null ? `${r.pieceCount} ${t({ en: "pcs", ar: "قطعة" })}` : ""}
                              </div>
                            </td>
                            <td style={{ ...S.td, ...S.tdNum }}>{fmt(r.carcassKg)}</td>
                            <td style={{ ...S.td, ...S.tdNum, color: C.teal }}>{fmt(r.cutsKg)}</td>
                            <td style={{ ...S.td, ...S.tdNum, color: C.amber }}>{fmt(r.wasteKg)}</td>
                            <td style={{ ...S.td, ...S.tdNum, color: C.green }}>{r.yieldPct.toFixed(1)}%</td>
                            <td style={{ ...S.td, ...S.tdNum }}>
                              {r.durationMin > 0
                                ? <b>{r.durationMin}</b>
                                : <span className="bk-lbl" style={{ color: C.muted }}>—</span>}
                            </td>
                            <td style={S.td}>
                              <ReviewChip status={r.reviewStatus} t={t} />
                              {r.unaccountedKg > 0.005 && (
                                <div style={{ marginTop: 5 }}>
                                  <Chip tone="amber">⚖️ {fmt(r.unaccountedKg)} kg</Chip>
                                </div>
                              )}
                            </td>
                          </tr>

                          {open && (
                            <tr>
                              <td colSpan={12} style={{ ...S.td, background: C.soft, padding: 0 }}>
                                <div style={{ padding: "14px 16px" }}>
                                  <TableWrap minWidth={620}>
                                    <thead>
                                      <tr>
                                        <th style={S.th}>{t({ en: "Product", ar: "المنتج" })}</th>
                                        <th style={S.th}>{t({ en: "Code", ar: "الكود" })}</th>
                                        <th style={S.th}>{t({ en: "Kind", ar: "النوع" })}</th>
                                        <th style={{ ...S.th, textAlign: "end" }}>{t({ en: "Actual", ar: "الفعلي" })}</th>
                                        <th style={{ ...S.th, textAlign: "end" }}>{t({ en: "Target", ar: "المستهدف" })}</th>
                                        <th style={{ ...S.th, textAlign: "end" }}>{t({ en: "Delta", ar: "الانحراف" })}</th>
                                        <th style={{ ...S.th, textAlign: "end" }}>{t({ en: "% of raw", ar: "٪ من الخام" })}</th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {r.cuts.map((c, i) => (
                                        <tr key={`${r.id}_${c.itemId}_${i}`}>
                                          <td style={S.td}>
                                            <b>{c.name}</b>
                                            {c.nameAlt && (
                                              <div className="bk-lbl" style={{ color: C.muted }}>{c.nameAlt}</div>
                                            )}
                                          </td>
                                          <td style={{ ...S.td, color: C.muted, fontWeight: 800 }}>{c.sku || "—"}</td>
                                          <td style={S.td}>
                                            {c.isWaste
                                              ? <Chip tone="amber">{t({ en: "waste", ar: "هدر" })}</Chip>
                                              : <Chip tone="green">{t({ en: "product", ar: "منتج" })}</Chip>}
                                          </td>
                                          <td style={{ ...S.td, ...S.tdNum }}>{fmt(c.weightKg)}</td>
                                          <td style={{ ...S.td, ...S.tdNum, color: C.muted }}>
                                            {c.targetKg ? fmt(c.targetKg) : "—"}
                                          </td>
                                          <td style={{ ...S.td, ...S.tdNum }}><DeltaCell value={c.deltaPct} /></td>
                                          <td style={{ ...S.td, ...S.tdNum }}>
                                            {pct(c.weightKg, r.baseKg).toFixed(1)}%
                                          </td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </TableWrap>

                                  <div style={{ display: "flex", gap: 14, flexWrap: "wrap", marginTop: 10 }}>
                                    {r.unaccountedKg > 0.005 && (
                                      <span className="bk-lbl" style={{ color: C.amber }}>
                                        ⚠️ {t({ en: "Unaccounted", ar: "فاقد غير مسجّل" })}: {fmt(r.unaccountedKg)} kg
                                      </span>
                                    )}
                                    {r.unaccountedKg < -0.005 && (
                                      <span className="bk-lbl" style={{ color: C.red }}>
                                        ⚠️ {t({ en: "Output exceeds raw", ar: "النواتج أكبر من الخام" })}: {fmt(Math.abs(r.unaccountedKg))} kg
                                      </span>
                                    )}
                                    {r.review?.at && (
                                      <span className="bk-lbl" style={{ color: C.muted }}>
                                        {t({ en: "Reviewed by", ar: "روجع بواسطة" })} {r.review.by || "—"} ·{" "}
                                        {String(r.review.at).slice(0, 16).replace("T", " ")}
                                      </span>
                                    )}
                                    {r.review?.reason && (
                                      <span className="bk-lbl" style={{ color: C.red }}>
                                        {t({ en: "Reason", ar: "السبب" })}: {r.review.reason}
                                      </span>
                                    )}
                                    {r.locked && (
                                      <span className="bk-lbl" style={{ color: C.muted }}>
                                        🔒 {t({ en: "Period locked", ar: "الفترة مقفلة" })}
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      );
                    })}
                  </tbody>
                </TableWrap>

                {rows.length > shownRows.length && (
                  <div className="bk-noprint" style={{ display: "flex", justifyContent: "center", gap: 10, marginTop: 12 }}>
                    <span className="bk-lbl" style={{ color: C.muted, alignSelf: "center" }}>
                      {t({
                        en: `Showing ${shownRows.length} of ${rows.length}`,
                        ar: `يعرض ${shownRows.length} من ${rows.length}`,
                      })}
                    </span>
                    <button
                      type="button" style={{ ...S.btn, ...S.btnSm, ...S.btnPrimary }}
                      onClick={() => setLimit((n) => n + 250)}
                    >
                      {t({ en: "Show more", ar: "عرض المزيد" })}
                    </button>
                  </div>
                )}
              </Card>
            )}

            {/* ══════════ المنتجات ══════════ */}
            {show("products") && (
              <>
                <Card
                  className={printAll ? "bk-pagebreak" : ""}
                  icon="🎯"
                  title={t({ en: "Products vs recipe targets", ar: "المنتجات مقابل أهداف الوصفة" })}
                  sub={t({
                    en: "Where actual cutting drifts from what the recipe expects — sort any column.",
                    ar: "وين التقطيع الفعلي بينحرف عن اللي بتتوقّعه الوصفة — كل عمود قابل للفرز.",
                  })}
                >
                  <TableWrap minWidth={900}>
                    <thead>
                      <tr>
                        <AggTh label={t({ en: "Product", ar: "المنتج" })} col="name" sort={prodSort} setSort={setProdSort} />
                        <AggTh label={t({ en: "Code", ar: "الكود" })} col="sku" sort={prodSort} setSort={setProdSort} />
                        <AggTh label={t({ en: "Ops", ar: "العمليات" })} col="opCount" sort={prodSort} setSort={setProdSort} numeric />
                        <AggTh label={t({ en: "Actual", ar: "الفعلي" })} col="actual" sort={prodSort} setSort={setProdSort} numeric />
                        <AggTh label={t({ en: "Target", ar: "المستهدف" })} col="target" sort={prodSort} setSort={setProdSort} numeric />
                        <AggTh label={t({ en: "Delta", ar: "الانحراف" })} col="deltaPct" sort={prodSort} setSort={setProdSort} numeric />
                        <AggTh label={t({ en: "Share of raw", ar: "الحصّة من الخام" })} col="share" sort={prodSort} setSort={setProdSort} />
                      </tr>
                    </thead>
                    <tbody>
                      {productsSorted.map((p) => (
                        <tr key={p.key}>
                          <td style={S.td}>
                            <b>{p.name}</b>{" "}
                            {p.isWaste && <Chip tone="amber">{t({ en: "waste", ar: "هدر" })}</Chip>}
                            {p.nameAlt && (
                              <div className="bk-lbl" style={{ color: C.muted }}>{p.nameAlt}</div>
                            )}
                          </td>
                          <td style={{ ...S.td, color: C.muted, fontWeight: 800 }}>{p.sku || "—"}</td>
                          <td style={{ ...S.td, ...S.tdNum }}>{fmtInt(p.opCount)}</td>
                          <td style={{ ...S.td, ...S.tdNum }}>{fmt(p.actual)}</td>
                          <td style={{ ...S.td, ...S.tdNum, color: C.muted }}>
                            {p.target ? fmt(p.target) : "—"}
                          </td>
                          <td style={{ ...S.td, ...S.tdNum }}><DeltaCell value={p.deltaPct} /></td>
                          <td style={S.td}>
                            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                              <MiniBar value={p.share} max={100} color={p.isWaste ? C.amber : C.teal} />
                              <b style={{ minWidth: 52 }}>{p.share.toFixed(1)}%</b>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </TableWrap>
                </Card>

                <Card
                  icon="🗑️"
                  title={t({ en: "Waste breakdown", ar: "تفصيل الهدر" })}
                  sub={t({
                    en: `${fmt(stats.wasteKg)} kg of waste — ${stats.wastePct.toFixed(1)}% of raw material.`,
                    ar: `${fmt(stats.wasteKg)} كجم هدر — ${stats.wastePct.toFixed(1)}٪ من المادة الخام.`,
                  })}
                >
                  {waste.length === 0 ? (
                    <EmptyBox>{t({ en: "No waste lines recorded.", ar: "ما في أسطر هدر مسجّلة." })}</EmptyBox>
                  ) : (
                    <TableWrap minWidth={640}>
                      <thead>
                        <tr>
                          <th style={S.th}>{t({ en: "Waste item", ar: "بند الهدر" })}</th>
                          <th style={S.th}>{t({ en: "Code", ar: "الكود" })}</th>
                          <th style={{ ...S.th, textAlign: "end" }}>{t({ en: "Lines", ar: "الأسطر" })}</th>
                          <th style={{ ...S.th, textAlign: "end" }}>{t({ en: "Kg", ar: "كجم" })}</th>
                          <th style={S.th}>{t({ en: "% of waste", ar: "٪ من الهدر" })}</th>
                          <th style={{ ...S.th, textAlign: "end" }}>{t({ en: "% of raw", ar: "٪ من الخام" })}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {waste.map((w, i) => (
                          <tr key={`${w.sku}${i}`}>
                            <td style={S.td}>
                              <b>{w.name}</b>
                              {w.nameAlt && <div className="bk-lbl" style={{ color: C.muted }}>{w.nameAlt}</div>}
                            </td>
                            <td style={{ ...S.td, color: C.muted, fontWeight: 800 }}>{w.sku || "—"}</td>
                            <td style={{ ...S.td, ...S.tdNum }}>{fmtInt(w.n)}</td>
                            <td style={{ ...S.td, ...S.tdNum, color: C.amber }}>{fmt(w.kg)}</td>
                            <td style={S.td}>
                              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                                <MiniBar value={w.shareOfWaste} max={100} color={C.amber} />
                                <b style={{ minWidth: 52 }}>{w.shareOfWaste.toFixed(1)}%</b>
                              </div>
                            </td>
                            <td style={{ ...S.td, ...S.tdNum }}>{w.shareOfRaw.toFixed(2)}%</td>
                          </tr>
                        ))}
                      </tbody>
                    </TableWrap>
                  )}
                </Card>

                <Card icon="🐄" title={t({ en: "By raw material", ar: "حسب المادة الخام" })}>
                  <TableWrap minWidth={720}>
                    <thead>
                      <tr>
                        <th style={S.th}>{t({ en: "Raw material", ar: "المادة الخام" })}</th>
                        <th style={{ ...S.th, textAlign: "end" }}>{t({ en: "Ops", ar: "العمليات" })}</th>
                        <th style={{ ...S.th, textAlign: "end" }}>{t({ en: "Raw kg", ar: "الخام" })}</th>
                        <th style={{ ...S.th, textAlign: "end" }}>{t({ en: "Products", ar: "النواتج" })}</th>
                        <th style={{ ...S.th, textAlign: "end" }}>{t({ en: "Waste", ar: "الهدر" })}</th>
                        <th style={S.th}>{t({ en: "Yield", ar: "التصافي" })}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {byInput.map((g) => (
                        <tr key={g.key}>
                          <td style={{ ...S.td, fontWeight: 900 }}>
                            {g.key}
                            {g.sku && <div className="bk-lbl" style={{ color: C.muted }}>{g.sku}</div>}
                          </td>
                          <td style={{ ...S.td, ...S.tdNum }}>{fmtInt(g.count)}</td>
                          <td style={{ ...S.td, ...S.tdNum }}>{fmt(g.carcassKg)}</td>
                          <td style={{ ...S.td, ...S.tdNum, color: C.teal }}>{fmt(g.cutsKg)}</td>
                          <td style={{ ...S.td, ...S.tdNum, color: C.amber }}>{fmt(g.wasteKg)}</td>
                          <td style={S.td}>
                            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                              <MiniBar value={g.yieldPct} max={100} color={C.green} />
                              <b style={{ color: C.green, minWidth: 50 }}>{g.yieldPct.toFixed(1)}%</b>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </TableWrap>
                </Card>
              </>
            )}

            {/* ══════════ المسارات ══════════ */}
            {show("pathways") && (
              <>
                <Card
                  className={printAll ? "bk-pagebreak" : ""}
                  icon="🔀"
                  title={t({ en: "Pathway comparison", ar: "مقارنة المسارات" })}
                  sub={t({
                    en: "Same recipe, different breakdowns — which pathway actually returns the most product.",
                    ar: "نفس الوصفة بتفكيك مختلف — أي مسار فعلياً بيرجّع أكثر ناتج.",
                  })}
                >
                  {pathwayCompare.length === 0 ? (
                    <EmptyBox>
                      {t({
                        en: "No recipe in this period was cut through more than one pathway.",
                        ar: "ما في وصفة بهذه الفترة انقطعت بأكثر من مسار واحد.",
                      })}
                    </EmptyBox>
                  ) : (
                    pathwayCompare.map((grp) => (
                      <div key={grp.ref} style={{ marginBottom: 18 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", marginBottom: 8 }}>
                          <Chip>{grp.ref}</Chip>
                          {grp.cat && <span className="bk-lbl" style={{ color: C.muted }}>{grp.cat}</span>}
                          <span className="bk-lbl" style={{ color: C.muted }}>
                            {fmtInt(grp.totals.count)} {t({ en: "operations", ar: "عملية" })} ·{" "}
                            {fmt(grp.totals.carcassKg)} kg
                          </span>
                        </div>
                        <TableWrap minWidth={760}>
                          <thead>
                            <tr>
                              <th style={S.th}>{t({ en: "Pathway", ar: "المسار" })}</th>
                              <th style={{ ...S.th, textAlign: "end" }}>{t({ en: "Ops", ar: "العمليات" })}</th>
                              <th style={{ ...S.th, textAlign: "end" }}>{t({ en: "Raw kg", ar: "الخام" })}</th>
                              <th style={{ ...S.th, textAlign: "end" }}>{t({ en: "Products", ar: "النواتج" })}</th>
                              <th style={{ ...S.th, textAlign: "end" }}>{t({ en: "Waste", ar: "الهدر" })}</th>
                              <th style={S.th}>{t({ en: "Yield", ar: "التصافي" })}</th>
                              <th style={{ ...S.th, textAlign: "end" }}>{t({ en: "vs best", ar: "الفرق عن الأفضل" })}</th>
                            </tr>
                          </thead>
                          <tbody>
                            {grp.paths.map((p) => {
                              const gap = grp.best ? p.yieldPct - grp.best.yieldPct : 0;
                              const isBest = grp.best && p.key === grp.best.key;
                              return (
                                <tr key={p.key}>
                                  <td style={S.td}>
                                    <b>{p.label}</b>{" "}
                                    {isBest && <span className="bv-best">★ {t({ en: "best", ar: "الأفضل" })}</span>}
                                    {p.code && (
                                      <div className="bk-lbl" style={{ color: C.muted }}>{p.code}</div>
                                    )}
                                  </td>
                                  <td style={{ ...S.td, ...S.tdNum }}>{fmtInt(p.count)}</td>
                                  <td style={{ ...S.td, ...S.tdNum }}>{fmt(p.carcassKg)}</td>
                                  <td style={{ ...S.td, ...S.tdNum, color: C.teal }}>{fmt(p.cutsKg)}</td>
                                  <td style={{ ...S.td, ...S.tdNum, color: C.amber }}>{fmt(p.wasteKg)}</td>
                                  <td style={S.td}>
                                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                                      <MiniBar value={p.yieldPct} max={100} color={isBest ? C.green : C.blue} />
                                      <b style={{ color: isBest ? C.green : C.ink, minWidth: 52 }}>
                                        {p.yieldPct.toFixed(1)}%
                                      </b>
                                    </div>
                                  </td>
                                  <td style={{ ...S.td, ...S.tdNum, color: isBest ? C.muted : C.red }}>
                                    {isBest ? "—" : `${gap.toFixed(1)} pp`}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </TableWrap>
                      </div>
                    ))
                  )}
                </Card>

                <Card
                  icon="🧭"
                  title={t({ en: "All pathways used", ar: "كل المسارات المستعملة" })}
                  sub={t({
                    en: "Every pathway that appears in the filtered operations.",
                    ar: "كل مسار ظهر ضمن العمليات المفلترة.",
                  })}
                >
                  {byPathway.length === 0 ? (
                    <EmptyBox>
                      {t({
                        en: "No operation in this period carries a pathway. Multi-pathway mode may be off.",
                        ar: "ما في عملية بهذه الفترة عليها مسار. يمكن وضع المسارات المتعددة مطفأ.",
                      })}
                    </EmptyBox>
                  ) : (
                    <TableWrap minWidth={760}>
                      <thead>
                        <tr>
                          <th style={S.th}>{t({ en: "Recipe", ar: "الوصفة" })}</th>
                          <th style={S.th}>{t({ en: "Pathway", ar: "المسار" })}</th>
                          <th style={{ ...S.th, textAlign: "end" }}>{t({ en: "Ops", ar: "العمليات" })}</th>
                          <th style={{ ...S.th, textAlign: "end" }}>{t({ en: "Raw kg", ar: "الخام" })}</th>
                          <th style={{ ...S.th, textAlign: "end" }}>{t({ en: "Products", ar: "النواتج" })}</th>
                          <th style={{ ...S.th, textAlign: "end" }}>{t({ en: "Waste", ar: "الهدر" })}</th>
                          <th style={S.th}>{t({ en: "Yield", ar: "التصافي" })}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {byPathway.map((g) => (
                          <tr key={g.key}>
                            <td style={S.td}><Chip>{g.ref || "—"}</Chip></td>
                            <td style={S.td}>
                              <b>{g.name || g.code}</b>
                              <div className="bk-lbl" style={{ color: C.violet }}>🔀 {g.code}</div>
                            </td>
                            <td style={{ ...S.td, ...S.tdNum }}>{fmtInt(g.count)}</td>
                            <td style={{ ...S.td, ...S.tdNum }}>{fmt(g.carcassKg)}</td>
                            <td style={{ ...S.td, ...S.tdNum, color: C.teal }}>{fmt(g.cutsKg)}</td>
                            <td style={{ ...S.td, ...S.tdNum, color: C.amber }}>{fmt(g.wasteKg)}</td>
                            <td style={S.td}>
                              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                                <MiniBar value={g.yieldPct} max={100} color={C.violet} />
                                <b style={{ minWidth: 52 }}>{g.yieldPct.toFixed(1)}%</b>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </TableWrap>
                  )}
                </Card>
              </>
            )}

            {/* ══════════ التجميع الحرّ ══════════ */}
            {show("breakdown") && (
              <Card
                className={printAll ? "bk-pagebreak" : ""}
                icon="🧮"
                title={t({ en: "Free breakdown", ar: "التجميع الحرّ" })}
                sub={t({
                  en: "Stack up to three levels — butchery → butcher → recipe, or any other order.",
                  ar: "ركّب حتى ٣ مستويات — ملحمة ← جزار ← وصفة، أو أي ترتيب تحبّه.",
                })}
                actions={
                  <div className="bk-noprint" style={{ display: "flex", gap: 8, marginInlineStart: "auto", flexWrap: "wrap" }}>
                    {[[lvl1, setLvl1], [lvl2, setLvl2], [lvl3, setLvl3]].map(([v, set], i) => (
                      <select
                        key={i} value={v} onChange={(e) => { set(e.target.value); setOpenNodes(new Set()); }}
                        style={{ ...S.input, width: "auto" }}
                      >
                        {LEVELS.map((l) => (
                          <option key={l.id || "none"} value={l.id}>
                            {i + 1}. {isAr ? l.ar : l.en}
                          </option>
                        ))}
                      </select>
                    ))}
                  </div>
                }
              >
                {tree.length === 0 ? (
                  <EmptyBox>{t({ en: "Pick at least one level.", ar: "اختر مستوى واحداً على الأقل." })}</EmptyBox>
                ) : (
                  <TableWrap minWidth={840}>
                    <thead>
                      <tr>
                        <th style={S.th}>{t({ en: "Group", ar: "المجموعة" })}</th>
                        <th style={{ ...S.th, textAlign: "end" }}>{t({ en: "Ops", ar: "العمليات" })}</th>
                        <th style={{ ...S.th, textAlign: "end" }}>{t({ en: "Raw kg", ar: "الخام" })}</th>
                        <th style={{ ...S.th, textAlign: "end" }}>{t({ en: "Products", ar: "النواتج" })}</th>
                        <th style={{ ...S.th, textAlign: "end" }}>{t({ en: "Waste", ar: "الهدر" })}</th>
                        <th style={{ ...S.th, textAlign: "end" }}>{t({ en: "Unaccounted", ar: "الفاقد" })}</th>
                        <th style={S.th}>{t({ en: "Yield", ar: "التصافي" })}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(function renderNodes(nodes, parent = "") {
                        return nodes.flatMap((n) => {
                          const id = `${parent}/${n.depth}:${n.key}`;
                          const kids = n.children || [];
                          const isOpen = printAll || openNodes.has(id);
                          const row = (
                            <tr
                              key={id}
                              className={kids.length ? "bv-trow" : ""}
                              onClick={kids.length ? () => toggleNode(id) : undefined}
                              style={n.depth === 0 ? { background: "#fbfdff" } : null}
                            >
                              <td style={{ ...S.td, paddingInlineStart: 12 + n.depth * 22 }}>
                                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                  {kids.length
                                    ? <span className="bv-exp bk-noprint">{isOpen ? "−" : "+"}</span>
                                    : <span style={{ color: C.line2, fontWeight: 900 }}>•</span>}
                                  <span style={{ fontWeight: n.depth === 0 ? 900 : 800 }}>{n.label}</span>
                                </div>
                              </td>
                              <td style={{ ...S.td, ...S.tdNum }}>{fmtInt(n.totals.count)}</td>
                              <td style={{ ...S.td, ...S.tdNum }}>{fmt(n.totals.carcassKg)}</td>
                              <td style={{ ...S.td, ...S.tdNum, color: C.teal }}>{fmt(n.totals.cutsKg)}</td>
                              <td style={{ ...S.td, ...S.tdNum, color: C.amber }}>{fmt(n.totals.wasteKg)}</td>
                              <td style={{ ...S.td, ...S.tdNum, color: C.muted }}>{fmt(n.totals.unaccountedKg)}</td>
                              <td style={S.td}>
                                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                                  <MiniBar value={n.totals.yieldPct} max={100} color={C.green} />
                                  <b style={{ color: C.green, minWidth: 52 }}>{n.totals.yieldPct.toFixed(1)}%</b>
                                </div>
                              </td>
                            </tr>
                          );
                          return isOpen && kids.length
                            ? [row, ...renderNodes(kids, id)]
                            : [row];
                        });
                      })(tree)}
                    </tbody>
                  </TableWrap>
                )}
              </Card>
            )}

            {/* ══════════ الملاحظات ══════════ */}
            {show("notes") && (
              <Card
                className={printAll ? "bk-pagebreak" : ""}
                icon="⚠️"
                title={t({ en: "Notes & data quality", ar: "الملاحظات وجودة البيانات" })}
                sub={t({
                  en: `${issues.length} item(s) worth a look across the filtered operations.`,
                  ar: `${issues.length} بند بحاجة نظرة ضمن العمليات المفلترة.`,
                })}
              >
                {issues.length === 0 ? (
                  <EmptyBox>
                    {t({ en: "Nothing flagged — the data looks clean.", ar: "ما في أي ملاحظة — البيانات نظيفة." })}
                  </EmptyBox>
                ) : (
                  <>
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 12 }}>
                      {[...new Map(issues.map((x) => [x.kind, x.tone])).entries()].map(([kind, tone]) => (
                        <Chip key={kind} tone={tone}>
                          {kind}: {issues.filter((x) => x.kind === kind).length}
                        </Chip>
                      ))}
                    </div>
                    <TableWrap minWidth={860}>
                      <thead>
                        <tr>
                          <th style={S.th}>{t({ en: "Date", ar: "التاريخ" })}</th>
                          <th style={S.th}>{t({ en: "Operation", ar: "العملية" })}</th>
                          <th style={S.th}>{t({ en: "Butcher", ar: "الجزار" })}</th>
                          <th style={S.th}>{t({ en: "Butchery", ar: "الملحمة" })}</th>
                          <th style={S.th}>{t({ en: "Recipe", ar: "الوصفة" })}</th>
                          <th style={S.th}>{t({ en: "Issue", ar: "الملاحظة" })}</th>
                          <th style={S.th}>{t({ en: "Detail", ar: "التفصيل" })}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {issues.slice(0, printAll ? 300 : 150).map((x, i) => (
                          <tr key={`${x.day}${x.kind}${i}`}>
                            <td style={S.td}>{x.day}</td>
                            <td style={S.td}>
                              {x.opNo ? <span style={S.opNo}>{x.opNo}</span> : <span style={{ color: C.muted }}>—</span>}
                            </td>
                            <td style={S.td}>{x.who}</td>
                            <td style={{ ...S.td, color: C.muted }}>{x.branch}</td>
                            <td style={S.td}>{x.ref}</td>
                            <td style={S.td}><Chip tone={x.tone}>{x.kind}</Chip></td>
                            <td style={{ ...S.td, fontWeight: 800 }}>{x.detail}</td>
                          </tr>
                        ))}
                      </tbody>
                    </TableWrap>
                    {issues.length > 150 && !printAll && (
                      <div className="bk-lbl" style={{ color: C.muted, textAlign: "center", marginTop: 10 }}>
                        {t({
                          en: `Showing the first 150 of ${issues.length} — export to Excel for the full list.`,
                          ar: `يعرض أول ١٥٠ من ${issues.length} — صدّر لـ Excel للقائمة الكاملة.`,
                        })}
                      </div>
                    )}
                  </>
                )}
              </Card>
            )}
          </>
        )}
      </div>
    </div>
  );
}
