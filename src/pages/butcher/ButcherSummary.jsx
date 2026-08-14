// src/pages/butcher/ButcherSummary.jsx
//
// التقرير الشامل للتقطيع — صفحة مستقلة على النظام (لا تصدير Excel).
// SUMMARY REPORT OF ALL CUTTINGS FROM ALL TRANSACTIONS BY DATE.
//
// الأقسام: مؤشرات (مع مقارنة الفترة السابقة) · رسوم بيانية · حسب التاريخ ·
//          حسب القطعة مقابل المرجع · مصفوفة النوع × المنشأ · حسب الملحمة ·
//          أداء الجزارين (متوسط وثبات) · الانحرافات وجودة البيانات ·
//          تفاصيل المعاملات · التواقيع.
//
// المصدر: GET /api/reports?type=butcher_cut_log (السيرفر مصدر الحقيقة).

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import API_BASE from "../../config/api";
import { BRANCHES, TYPE, isSpecialCut, nameOf } from "./butcherOptions";
import { isRowSpecial } from "./butcherConfig";
import {
  butcherLabel, cfgFind, cfgRef, cutOptions, enabledOnly, useButcherConfig,
} from "./butcherConfig";
import { BarChart, LineChart, Sparkline, CHART_COLORS } from "./ButcherCharts";
import { useSettingsLang, LangToggle } from "../settings/_shared/settingsI18n";
import { canOpenButcherPage, NoAccess } from "./ButcherAccess";

/* globals.css فيه `#root * {font-size:14px!important}` و`#root table * {12px}` */
const CSS = `
#root .bs, #root .bs * { font-size: 15px !important; }
#root .bs table, #root .bs table * { font-size: 14px !important; }
#root .bs-title  { font-size: 22px !important; }
#root .bs-sub    { font-size: 13px !important; }
#root .bs-meta   { font-size: 13px !important; }
#root .bs-sec    { font-size: 17px !important; }
#root .bs-kpinum { font-size: 24px !important; }
#root .bs-kpilbl { font-size: 12px !important; }
#root .bs-delta  { font-size: 12px !important; }
#root .bs th { position: sticky; top: 0; z-index: 3; }
#root .bs tbody tr:hover { background: #eef6ff !important; }
@keyframes bsShimmer { 0% { background-position: -400px 0 } 100% { background-position: 400px 0 } }
#root .bs-skel {
  height: 14px; border-radius: 7px;
  background: linear-gradient(90deg,#eef4fb 25%,#f7fbff 50%,#eef4fb 75%);
  background-size: 800px 100%; animation: bsShimmer 1.2s infinite linear;
}
@media (max-width: 820px) {
  #root .bs, #root .bs * { font-size: 14px !important; }
  #root .bs table, #root .bs table * { font-size: 12px !important; }
  #root .bs-title  { font-size: 18px !important; }
  #root .bs-sec    { font-size: 15px !important; }
  #root .bs-kpinum { font-size: 20px !important; }
  #root .bs-sheet  { padding: 12px 10px !important; border-radius: 10px !important; }
}
@media print {
  #root .bs-noprint { display: none !important; }
  #root .bs { background: #fff !important; padding: 0 !important; }
  #root .bs-sheet { box-shadow: none !important; border: none !important; margin: 0 !important; }
  #root .bs-block { break-inside: avoid; }
  #root .bs-pagebreak { break-before: page; }
  @page { size: A4 landscape; margin: 10mm; }
}
`;

const todayStr = () => new Date().toISOString().slice(0, 10);
const shiftDays = (n) => {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
};
const monthStart = () => `${new Date().toISOString().slice(0, 7)}-01`;
const addDays = (iso, n) => {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
};
const daysBetween = (a, b) =>
  Math.round((new Date(`${b}T00:00:00Z`) - new Date(`${a}T00:00:00Z`)) / 86400000) + 1;

function toArray(data) {
  return (
    (Array.isArray(data) && data) ||
    (Array.isArray(data?.data) && data.data) ||
    (Array.isArray(data?.items) && data.items) ||
    (Array.isArray(data?.reports) && data.reports) ||
    []
  );
}

const kg = (n) => (Number(n) || 0).toFixed(2);
const pct = (part, whole) => (whole > 0 ? (part / whole) * 100 : 0);

/** انحراف معياري (عيّنة) — يقيس ثبات أداء الجزار. */
function stdev(values) {
  if (values.length < 2) return 0;
  const mean = values.reduce((s, v) => s + v, 0) / values.length;
  const varc = values.reduce((s, v) => s + (v - mean) ** 2, 0) / (values.length - 1);
  return Math.sqrt(varc);
}

/** التصافي المستهدف لنوع = مجموع منتصف مديات القطع (بلا كروت الهدر/العضم). */
function targetYield(cfg, animalId) {
  const list = (cfg?.cuts || []).filter((c) => !isSpecialCut(c));
  let sum = 0;
  list.forEach((c) => {
    const r = cfgRef(c, animalId);
    if (r) sum += (Number(r.min) + Number(r.max)) / 2;
  });
  return sum > 0 ? sum : null;
}

/** يحوّل سجلات السيرفر إلى معاملات مفلترة + كل التجميعات. */
function aggregate(records, filters, cfg, isAr) {
  const { from, to, branch, animalId } = filters;

  const txns = [];
  const used = new Set();
  const byDate = new Map();
  const byBranch = new Map();
  const byButcher = new Map();
  const byAnimal = new Map();
  const byOrigin = new Map();
  const byGrade = new Map();
  const matrix = new Map();       // `${animal}|${origin}` → مجاميع
  const cutTotals = new Map();    // cutId → { kg, waste, count }
  const cutAnimals = new Map();   // cutId → Map(animalId → kg)  لاختيار المرجع
  const dateCuts = new Map();     // day → { cutId: kg }

  records.forEach((rec) => {
    const p = rec?.payload || {};
    const day = String(p.date || p.reportDate || rec?.created_at || "").slice(0, 10);
    if (from && day < from) return;
    if (to && day > to) return;
    if (branch && p.branch !== branch) return;
    if (animalId && p.animalId !== animalId) return;

    const iso = p.savedAt || p.reportDate || rec?.created_at;
    const d = iso ? new Date(iso) : null;
    const time = d && !Number.isNaN(d.getTime())
      ? d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })
      : "";

    const branchObj = BRANCHES.find((b) => b.code === p.branch) || null;
    const animalObj = (cfg.animals || []).find((a) => a.id === p.animalId) || null;
    const originObj = (cfg.origins || []).find((o) => o.id === p.originId) || null;

    const rawCuts = Array.isArray(p.cuts) && p.cuts.length
      ? p.cuts
      : [{ cutId: p.cutId, weightKg: p.weightKg, wasteBoneKg: p.wasteBoneKg }];

    let cutsKg = 0;
    let wasteKg = 0;
    const cuts = rawCuts.map((c) => {
      const meta = cfgFind(cfg, c.cutId);
      const w = Number(c.weightKg) || 0;
      const waste = Number(c.wasteBoneKg) || 0;
      const special = isRowSpecial(c, cfg);
      if (special) wasteKg += w;
      else { cutsKg += w; if (c.cutId) used.add(c.cutId); }
      wasteKg += waste;

      if (c.cutId) {
        const ct = cutTotals.get(c.cutId) || { kg: 0, waste: 0, count: 0 };
        if (special) ct.waste += w;
        else ct.kg += w;
        ct.waste += waste;
        ct.count += 1;
        cutTotals.set(c.cutId, ct);

        if (!special) {
          const am = cutAnimals.get(c.cutId) || new Map();
          am.set(p.animalId || "", (am.get(p.animalId || "") || 0) + w);
          cutAnimals.set(c.cutId, am);

          const dc = dateCuts.get(day) || {};
          dc[c.cutId] = (dc[c.cutId] || 0) + w;
          dateCuts.set(day, dc);
        }
      }

      return {
        cutId: c.cutId,
        name: meta ? nameOf(meta, isAr) : c.cut || "—",
        code: c.code || "",
        special,
        weightKg: w,
        wasteBoneKg: waste,
      };
    });

    const carcassKg = Number(p.carcassWeightKg) || 0;
    const tx = {
      id: rec.id || rec._id || p.savedAt,
      day, time,
      employeeNo: p.employeeNo || "—",
      // الاسم المحفوظ وقت الإدخال أولاً، ثم سجل الجزارين في الإعدادات
      butcherName: p.butcherName
        ? `${p.butcherName} (${p.employeeNo || "—"})`
        : butcherLabel(cfg, p.employeeNo),
      butcherJob: p.butcherJob || "",
      branchCode: p.branch || "",
      branchName: branchObj ? nameOf(branchObj, isAr) : (isAr ? p.branchAr : p.branchEn) || "—",
      animalId: p.animalId || "",
      animalName: animalObj ? nameOf(animalObj, isAr) : p.animal || "—",
      originId: p.originId || "",
      originName: originObj ? nameOf(originObj, isAr) : p.origin || "—",
      gradeId: p.gradeId || "",
      gradeName: p.gradeId
        ? nameOf(
            (cfg.grades || []).find((g) => g.id === p.gradeId) || { ar: p.grade, en: p.gradeEn },
            isAr
          ) || p.grade || "—"
        : "—",
      mode: p.mode || (carcassKg > 0 ? "whole" : "pieces"),
      carcassKg, cutsKg, wasteKg,
      base: carcassKg > 0 ? carcassKg : cutsKg + wasteKg,
      cuts,
    };
    tx.yieldPct = pct(tx.cutsKg, tx.base);
    txns.push(tx);

    const bump = (map, key) => {
      const g = map.get(key) ||
        { key, count: 0, carcassKg: 0, cutsKg: 0, wasteKg: 0, base: 0, yields: [] };
      g.count += 1;
      g.carcassKg += tx.carcassKg;
      g.cutsKg += tx.cutsKg;
      g.wasteKg += tx.wasteKg;
      g.base += tx.base;
      g.yields.push(tx.yieldPct);
      map.set(key, g);
    };
    bump(byDate, day);
    bump(byBranch, tx.branchName);
    bump(byButcher, tx.butcherName);
    bump(byAnimal, tx.animalName);
    bump(byOrigin, tx.originName);
    bump(byGrade, tx.gradeName);
    bump(matrix, `${tx.animalName}|${tx.originName}`);
  });

  const finish = (map) =>
    [...map.values()]
      .map((g) => ({
        ...g,
        yieldPct: pct(g.cutsKg, g.base),
        wastePct: pct(g.wasteKg, g.base),
        avgYield: g.yields.length ? g.yields.reduce((s, v) => s + v, 0) / g.yields.length : 0,
        consistency: stdev(g.yields),
      }))
      .sort((a, b) => b.cutsKg - a.cutsKg);

  const cols = cutOptions(cfg).filter((c) => !isSpecialCut(c) && used.has(c.id));

  const dates = [...byDate.values()]
    .map((g) => ({ ...g, cuts: dateCuts.get(g.key) || {}, yieldPct: pct(g.cutsKg, g.base) }))
    .sort((a, b) => a.key.localeCompare(b.key));

  const totals = txns.reduce(
    (acc, tx) => {
      acc.count += 1;
      acc.carcassKg += tx.carcassKg;
      acc.cutsKg += tx.cutsKg;
      acc.wasteKg += tx.wasteKg;
      acc.base += tx.base;
      acc.whole += tx.mode === "whole" ? 1 : 0;
      acc.pieces += tx.mode === "pieces" ? 1 : 0;
      return acc;
    },
    { count: 0, carcassKg: 0, cutsKg: 0, wasteKg: 0, base: 0, whole: 0, pieces: 0 }
  );
  totals.butchers = byButcher.size;
  totals.branches = byBranch.size;
  totals.days = byDate.size;
  totals.yieldPct = pct(totals.cutsKg, totals.base);
  totals.wastePct = pct(totals.wasteKg, totals.base);
  totals.avgCarcass = totals.whole > 0 ? totals.carcassKg / totals.whole : 0;

  // القطع مع المرجع — المرجع يُؤخذ من النوع الأكثر مساهمة في تلك القطعة
  const cutRows = [...cutTotals.entries()]
    .map(([id, v]) => {
      const meta = cfgFind(cfg, id);
      const am = cutAnimals.get(id);
      const domAnimal = am
        ? [...am.entries()].sort((a, b) => b[1] - a[1])[0][0]
        : (animalId || "sheep");
      const ref = cfgRef(meta, domAnimal);
      const shareOfCuts = pct(v.kg, totals.cutsKg);
      const shareOfCarcass = pct(v.kg, totals.base);
      const state = !ref || !v.kg
        ? "idle"
        : shareOfCarcass < ref.min ? "low" : shareOfCarcass > ref.max ? "high" : "ok";
      return {
        id,
        name: meta ? nameOf(meta, isAr) : id,
        special: isSpecialCut(meta || id),
        kg: v.kg, waste: v.waste, count: v.count,
        shareOfCuts, shareOfCarcass, ref, state, domAnimal,
      };
    })
    .sort((a, b) => (b.kg + b.waste) - (a.kg + a.waste));

  // مصفوفة النوع × المنشأ
  const animalNames = [...new Set(txns.map((x) => x.animalName))];
  const originNames = [...new Set(txns.map((x) => x.originName))];
  const cell = (a, o) => matrix.get(`${a}|${o}`) || null;

  // الانحرافات: مقارنة كل معاملة بمتوسط نوعها في نفس الفترة
  const avgByAnimal = new Map();
  byAnimal.forEach((g, k) => avgByAnimal.set(k, pct(g.cutsKg, g.base)));

  return {
    txns: [...txns].sort((a, b) => `${b.day}${b.time}`.localeCompare(`${a.day}${a.time}`)),
    rawTxns: txns,
    cols, dates, cutRows, totals,
    branches: finish(byBranch),
    butchers: finish(byButcher),
    animals: finish(byAnimal),
    origins: finish(byOrigin),
    grades: finish(byGrade).filter((g) => g.key !== "—"),
    matrix: { animalNames, originNames, cell },
    avgByAnimal,
    dateTotals: {
      cuts: cols.reduce((acc, c) => {
        acc[c.id] = dates.reduce((s, d) => s + (d.cuts[c.id] || 0), 0);
        return acc;
      }, {}),
    },
  };
}

export default function ButcherSummary() {
  const navigate = useNavigate();
  const { t, isAr, dir, lang, toggle } = useSettingsLang();
  const { cfg } = useButcherConfig();

  const ANIMALS = useMemo(() => enabledOnly(cfg.animals), [cfg]);
  const RPT = cfg.report || {};

  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [from, setFrom] = useState(monthStart());
  const [to, setTo] = useState(todayStr());
  const [branch, setBranch] = useState("");
  const [animalId, setAnimalId] = useState("");
  const [showDetail, setShowDetail] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(
        `${API_BASE}/api/reports?type=${encodeURIComponent(TYPE)}&limit=5000`,
        { headers: { Accept: "application/json" }, cache: "no-store" }
      );
      if (!res.ok) throw new Error(`Server ${res.status}`);
      setRecords(toArray(await res.json()));
    } catch (e) {
      setError(e?.message || t({ en: "Failed to load data", ar: "تعذّر تحميل البيانات" }));
      setRecords([]);
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => { load(); }, [load]);

  const data = useMemo(
    () => aggregate(records, { from, to, branch, animalId }, cfg, isAr),
    [records, from, to, branch, animalId, cfg, isAr]
  );

  /* الفترة السابقة بنفس الطول — للمقارنة */
  const prev = useMemo(() => {
    if (!from || !to) return null;
    const len = daysBetween(from, to);
    if (!Number.isFinite(len) || len <= 0) return null;
    const pTo = addDays(from, -1);
    const pFrom = addDays(pTo, -(len - 1));
    return aggregate(records, { from: pFrom, to: pTo, branch, animalId }, cfg, isAr);
  }, [records, from, to, branch, animalId, cfg, isAr]);

  /* الانحرافات + أعلام جودة البيانات */
  const threshold = Number(cfg.rules?.deviationPct) || 5;
  const vsTarget = cfg.rules?.deviationVsTarget === true;
  const deviations = useMemo(() => {
    const out = [];
    data.rawTxns.forEach((tx) => {
      // المرجع: منتصف مدى «التصافي المستهدف» إن فُعِّل الخيار، وإلا متوسط الفترة
      const target = vsTarget ? targetYield(cfg, tx.animalId) : null;
      const avg = target !== null ? target : (data.avgByAnimal.get(tx.animalName) || 0);
      const diff = tx.yieldPct - avg;
      const flags = [];
      if (tx.yieldPct > 100.5) flags.push("impossible");
      if (tx.wasteKg === 0) flags.push("nowaste");
      if (!tx.branchCode) flags.push("nobranch");
      if (avg > 0 && Math.abs(diff) > threshold) flags.push(diff < 0 ? "low" : "high");
      if (flags.length) out.push({ ...tx, avg, diff, flags });
    });
    return out
      .sort((a, b) => Math.abs(b.diff) - Math.abs(a.diff))
      .slice(0, 40);
  }, [data, threshold, vsTarget, cfg]);

  /* بيانات الرسوم */
  const chartDaily = useMemo(
    () => data.dates.map((d) => ({ label: d.key, value: d.yieldPct })),
    [data.dates]
  );
  const chartCuts = useMemo(
    () => data.cutRows.filter((r) => !r.special && r.kg > 0)
      .slice(0, 10)
      .map((r) => ({ label: r.name, value: r.kg })),
    [data.cutRows]
  );
  const chartOrigins = useMemo(
    () => data.origins.map((o) => ({
      label: o.key,
      value: o.yieldPct,
      color: CHART_COLORS.teal,
    })),
    [data.origins]
  );

  const applyRange = (kind) => {
    if (kind === "today") { setFrom(todayStr()); setTo(todayStr()); }
    if (kind === "week") { setFrom(shiftDays(-6)); setTo(todayStr()); }
    if (kind === "month") { setFrom(monthStart()); setTo(todayStr()); }
    if (kind === "year") { setFrom(`${new Date().getFullYear()}-01-01`); setTo(todayStr()); }
    if (kind === "all") { setFrom(""); setTo(""); }
  };

  const RANGES = [
    { id: "today", ar: "اليوم", en: "Today" },
    { id: "week", ar: "آخر ٧ أيام", en: "Last 7 days" },
    { id: "month", ar: "هذا الشهر", en: "This month" },
    { id: "year", ar: "هذه السنة", en: "This year" },
    { id: "all", ar: "الكل", en: "All" },
  ];

  const branchObj = BRANCHES.find((b) => b.code === branch) || null;
  const animalObj = ANIMALS.find((a) => a.id === animalId) || null;
  const { cols, totals } = data;
  const ALL = t({ en: "All", ar: "الكل" });

  /* سلاسل صغيرة لبطاقات المؤشرات */
  const series = useMemo(() => ({
    count: data.dates.map((d) => d.count),
    carcass: data.dates.map((d) => d.carcassKg),
    cuts: data.dates.map((d) => d.cutsKg),
    waste: data.dates.map((d) => d.wasteKg),
    yield: data.dates.map((d) => d.yieldPct),
  }), [data.dates]);

  /* إحصاء التصافي اليومي — أعلى/أدنى/متوسط يوم */
  const dayYield = useMemo(() => {
    const vals = data.dates.map((d) => d.yieldPct).filter((v) => Number.isFinite(v));
    if (!vals.length) return { avg: 0, min: null, max: null };
    const avg = vals.reduce((s, v) => s + v, 0) / vals.length;
    const best = [...data.dates].sort((a, b) => b.yieldPct - a.yieldPct)[0];
    const worst = [...data.dates].sort((a, b) => a.yieldPct - b.yieldPct)[0];
    return { avg, min: worst, max: best };
  }, [data.dates]);

  // بعد كل الـ hooks — لا يجوز الخروج المبكّر قبلها
  if (!canOpenButcherPage("butcher.summary")) return <NoAccess page="butcher.summary" />;

  /* أفضل/أسوأ مصدر حسب التصافي */
  const bestOrigin = [...data.origins].sort((a, b) => b.yieldPct - a.yieldPct)[0] || null;
  const worstOrigin = [...data.origins].sort((a, b) => a.yieldPct - b.yieldPct)[0] || null;

  return (
    <div dir={dir} className="bs" style={S.page}>
      <style>{CSS}</style>

      {/* ── أدوات (لا تُطبع) ── */}
      <div className="bs-noprint" style={S.tools}>
        <div style={S.toolRow}>
          <LangToggle lang={lang} toggle={toggle} style={S.langBtn} />
          <button type="button" style={S.btn} onClick={load} disabled={loading}>
            {loading ? "…" : t({ en: "Refresh", ar: "تحديث" })}
          </button>
          <button type="button" style={{ ...S.btn, ...S.btnPrimary }} onClick={() => window.print()}>
            🖨️ {t({ en: "Print", ar: "طباعة" })}
          </button>
          <button type="button" style={S.btn} onClick={() => setShowDetail((v) => !v)}>
            {showDetail
              ? t({ en: "Hide transactions", ar: "إخفاء تفاصيل المعاملات" })
              : t({ en: "Show transactions", ar: "إظهار تفاصيل المعاملات" })}
          </button>
          <button type="button" style={S.btn} onClick={() => navigate("/butcher")}>
            {t({ en: "Back", ar: "رجوع" })}
          </button>
        </div>

        <div style={S.toolRow}>
          {RANGES.map((r) => (
            <button key={r.id} type="button" style={S.pill} onClick={() => applyRange(r.id)}>
              {nameOf(r, isAr)}
            </button>
          ))}
        </div>

        <div style={S.toolRow}>
          <label style={S.field}>
            <span style={S.label}>{t({ en: "From", ar: "من" })}</span>
            <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} style={S.input} />
          </label>
          <label style={S.field}>
            <span style={S.label}>{t({ en: "To", ar: "إلى" })}</span>
            <input type="date" value={to} onChange={(e) => setTo(e.target.value)} style={S.input} />
          </label>
          <label style={S.field}>
            <span style={S.label}>{t({ en: "Butchery", ar: "الملحمة" })}</span>
            <select value={branch} onChange={(e) => setBranch(e.target.value)} style={S.input}>
              <option value="">{ALL}</option>
              {BRANCHES.map((b) => (
                <option key={b.code} value={b.code}>{nameOf(b, isAr)}</option>
              ))}
            </select>
          </label>
          <label style={S.field}>
            <span style={S.label}>{t({ en: "Type", ar: "النوع" })}</span>
            <select value={animalId} onChange={(e) => setAnimalId(e.target.value)} style={S.input}>
              <option value="">{ALL}</option>
              {ANIMALS.map((a) => (
                <option key={a.id} value={a.id}>{nameOf(a, isAr)}</option>
              ))}
            </select>
          </label>
        </div>

        {error && <div style={S.error}>{error}</div>}
      </div>

      {/* ── ورقة التقرير ── */}
      <div className="bs-sheet" style={S.sheet}>
        <div style={S.head}>
          {(RPT.logoUrl || RPT.companyEn || RPT.companyAr) && (
            <div style={S.brand}>
              {RPT.logoUrl && <img src={RPT.logoUrl} alt="" style={S.logo} />}
              <div>
                {(isAr ? RPT.companyAr : RPT.companyEn) && (
                  <div style={S.company}>{isAr ? RPT.companyAr : RPT.companyEn}</div>
                )}
                {(isAr ? RPT.companyEn : RPT.companyAr) && (
                  <div className="bs-sub" style={S.companyAlt}>
                    {isAr ? RPT.companyEn : RPT.companyAr}
                  </div>
                )}
              </div>
            </div>
          )}
          <div className="bs-title" style={S.title}>
            {t({
              en: "SUMMARY REPORT OF ALL CUTTINGS FROM ALL TRANSACTIONS BY DATE",
              ar: "تقرير مجمّع لكل التقطيعات من كل المعاملات حسب التاريخ",
            })}
          </div>
          <div className="bs-sub" style={S.subTitle}>
            {isAr
              ? "SUMMARY REPORT OF ALL CUTTINGS FROM ALL TRANSACTIONS BY DATE"
              : "تقرير مجمّع لكل التقطيعات من كل المعاملات حسب التاريخ"}
          </div>
        </div>

        <div className="bs-meta" style={S.meta}>
          <span><b>{t({ en: "Period", ar: "الفترة" })}:</b>{" "}
            {from || t({ en: "start", ar: "البداية" })} → {to || t({ en: "today", ar: "اليوم" })}</span>
          <span><b>{t({ en: "Butchery", ar: "الملحمة" })}:</b>{" "}
            {branchObj ? nameOf(branchObj, isAr) : ALL}</span>
          <span><b>{t({ en: "Type", ar: "النوع" })}:</b>{" "}
            {animalObj ? nameOf(animalObj, isAr) : ALL}</span>
          <span><b>{t({ en: "Days covered", ar: "عدد الأيام" })}:</b> {totals.days}</span>
          {RPT.docNo && <span><b>{t({ en: "Doc. no", ar: "رقم الوثيقة" })}:</b> {RPT.docNo}</span>}
          {RPT.revNo && <span><b>{t({ en: "Rev.", ar: "المراجعة" })}:</b> {RPT.revNo}</span>}
          {RPT.issueDate && <span><b>{t({ en: "Issued", ar: "تاريخ الإصدار" })}:</b> {RPT.issueDate}</span>}
          <span><b>{t({ en: "Printed", ar: "تاريخ الطباعة" })}:</b>{" "}
            {new Date().toLocaleString("en-GB", { dateStyle: "short", timeStyle: "short" })}</span>
        </div>

        {/* ── مؤشرات عامة مع مقارنة الفترة السابقة ── */}
        <div className="bs-block" style={S.kpis}>
          <Kpi n={totals.count} l={t({ en: "Transactions", ar: "المعاملات" })}
            d={delta(totals.count, prev?.totals.count)} t={t} s={series.count} />
          <Kpi n={totals.whole} l={t({ en: "Whole carcasses", ar: "ذبائح كاملة" })} />
          <Kpi n={totals.pieces} l={t({ en: "Piece entries", ar: "قطع مفردة" })} />
          <Kpi n={kg(totals.carcassKg)} l={t({ en: "Carcass kg", ar: "وزن الذبائح" })}
            d={delta(totals.carcassKg, prev?.totals.carcassKg)} t={t} s={series.carcass} />
          <Kpi n={kg(totals.cutsKg)} l={t({ en: "Cuts kg", ar: "مجموع القطع" })} c="#1f6fd0"
            d={delta(totals.cutsKg, prev?.totals.cutsKg)} t={t} s={series.cuts} />
          <Kpi n={kg(totals.wasteKg)} l={t({ en: "Waste & bone kg", ar: "الهدر والعضم" })} c="#a16207"
            d={delta(totals.wasteKg, prev?.totals.wasteKg)} t={t} invert s={series.waste} />
          <Kpi n={`${totals.yieldPct.toFixed(1)}%`} l={t({ en: "Net yield", ar: "نسبة التصافي" })} c="#0f766e"
            d={delta(totals.yieldPct, prev?.totals.yieldPct)} t={t} s={series.yield} />
          <Kpi n={`${totals.wastePct.toFixed(1)}%`} l={t({ en: "Waste %", ar: "نسبة الهدر" })} c="#a16207"
            d={delta(totals.wastePct, prev?.totals.wastePct)} t={t} invert />
          <Kpi n={kg(totals.avgCarcass)} l={t({ en: "Avg carcass", ar: "متوسط الذبيحة" })} />
          <Kpi n={totals.butchers} l={t({ en: "Butchers", ar: "الجزارون" })} />
          <Kpi n={totals.branches} l={t({ en: "Butcheries", ar: "الملاحم" })} />
        </div>
        {prev && prev.totals.count > 0 && (
          <div className="bs-meta" style={S.prevNote}>
            {t({ en: "Compared with the previous period of equal length",
                 ar: "المقارنة مقابل الفترة السابقة بنفس الطول" })}
            {" — "}{prev.totals.count} {t({ en: "transactions", ar: "معاملة" })},{" "}
            {prev.totals.yieldPct.toFixed(1)}% {t({ en: "yield", ar: "تصافي" })}
          </div>
        )}

        {loading && (
          <div style={{ display: "flex", flexDirection: "column", gap: 10, padding: "12px 0" }}>
            {[...Array(6)].map((_, i) => (
              <div key={i} className="bs-skel" style={{ width: `${95 - i * 7}%` }} />
            ))}
          </div>
        )}
        {!loading && totals.count === 0 && (
          <div style={S.empty}>
            {t({ en: "No transactions in this period.", ar: "لا توجد معاملات في هذه الفترة." })}
          </div>
        )}

        {!loading && totals.count > 0 && (
          <>
            {/* ── رسوم بيانية ── */}
            <div className="bs-block" style={S.charts}>
              <div style={S.chartBox}>
                <div className="bs-sec" style={S.chartTitle}>
                  {t({ en: "Daily net yield", ar: "نسبة التصافي اليومية" })}
                </div>
                <LineChart data={chartDaily} unit="%" label="daily yield" />
              </div>
              <div style={S.chartBox}>
                <div className="bs-sec" style={S.chartTitle}>
                  {t({ en: "Top cuts by weight", ar: "أعلى القطع وزناً" })}
                </div>
                <BarChart data={chartCuts} unit=" kg" label="cuts" />
              </div>
              {data.origins.length > 1 && (
                <div style={S.chartBox}>
                  <div className="bs-sec" style={S.chartTitle}>
                    {t({ en: "Net yield by origin", ar: "نسبة التصافي حسب المنشأ" })}
                  </div>
                  <BarChart data={chartOrigins} unit="%" valueDigits={1} label="origins" />
                </div>
              )}
            </div>

            {/* ── 1) حسب التاريخ ── */}
            <Section n="1" title={t({ en: "Cuttings by date", ar: "التقطيعات حسب التاريخ" })}>
              <table style={S.table}>
                <thead>
                  <tr>
                    <th style={S.thSticky}>{t({ en: "DATE", ar: "التاريخ" })}</th>
                    <th style={S.th}>{t({ en: "TRANS.", ar: "المعاملات" })}</th>
                    <th style={S.th}>{t({ en: "CARCASS KG", ar: "وزن الذبائح" })}</th>
                    {cols.map((c) => <th key={c.id} style={S.th}>{nameOf(c, isAr)}</th>)}
                    <th style={S.th}>{t({ en: "TOTAL CUTS", ar: "مجموع القطع" })}</th>
                    <th style={S.th}>{t({ en: "WASTE & BONE", ar: "الهدر والعضم" })}</th>
                    <th style={S.th}>{t({ en: "NET YIELD %", ar: "٪ التصافي" })}</th>
                  </tr>
                </thead>
                <tbody>
                  {data.dates.map((d, i) => (
                    <tr key={d.key} style={i % 2 ? S.zebra : null}>
                      <td style={{ ...S.tdSticky, ...(i % 2 ? S.zebra : null) }}>{d.key}</td>
                      <td style={S.td}>{d.count}</td>
                      <td style={S.td}>{kg(d.carcassKg)}</td>
                      {cols.map((c) => (
                        <td key={c.id} style={S.td}>{d.cuts[c.id] ? kg(d.cuts[c.id]) : "—"}</td>
                      ))}
                      <td style={{ ...S.td, fontWeight: 800, color: "#1f6fd0" }}>{kg(d.cutsKg)}</td>
                      <td style={{ ...S.td, color: "#a16207" }}>{kg(d.wasteKg)}</td>
                      <td style={{ ...S.td, fontWeight: 800, color: "#0f766e" }}>
                        {d.yieldPct.toFixed(1)}%
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr>
                    <td style={S.tfootSticky}>{t({ en: "GRAND TOTAL", ar: "الإجمالي العام" })}</td>
                    <td style={S.tfoot}>{totals.count}</td>
                    <td style={S.tfoot}>{kg(totals.carcassKg)}</td>
                    {cols.map((c) => (
                      <td key={c.id} style={S.tfoot}>{kg(data.dateTotals.cuts[c.id])}</td>
                    ))}
                    <td style={{ ...S.tfoot, color: "#1f6fd0" }}>{kg(totals.cutsKg)}</td>
                    <td style={{ ...S.tfoot, color: "#a16207" }}>{kg(totals.wasteKg)}</td>
                    <td style={{ ...S.tfoot, color: "#0f766e" }}>{totals.yieldPct.toFixed(1)}%</td>
                  </tr>
                  <tr>
                    <td style={S.tfootSticky}>{t({ en: "% OF CUTS", ar: "٪ من القطع" })}</td>
                    <td style={S.tfootLight}>—</td>
                    <td style={S.tfootLight}>—</td>
                    {cols.map((c) => (
                      <td key={c.id} style={S.tfootLight}>
                        {pct(data.dateTotals.cuts[c.id], totals.cutsKg).toFixed(1)}%
                      </td>
                    ))}
                    <td style={S.tfootLight}>100%</td>
                    <td style={S.tfootLight}>—</td>
                    <td style={S.tfootLight}>—</td>
                  </tr>

                  {/* نسبة كل قطعة من وزن الذبيحة (لا من مجموع القطع) */}
                  <tr>
                    <td style={S.tfootSticky}>{t({ en: "% OF CARCASS", ar: "٪ من الذبيحة" })}</td>
                    <td style={S.tfootLight}>—</td>
                    <td style={S.tfootLight}>100%</td>
                    {cols.map((c) => (
                      <td key={c.id} style={S.tfootLight}>
                        {pct(data.dateTotals.cuts[c.id], totals.base).toFixed(1)}%
                      </td>
                    ))}
                    <td style={S.tfootLight}>{totals.yieldPct.toFixed(1)}%</td>
                    <td style={S.tfootLight}>{totals.wastePct.toFixed(1)}%</td>
                    <td style={S.tfootLight}>—</td>
                  </tr>

                  {/* متوسط المعاملة الواحدة */}
                  <tr>
                    <td style={S.tfootSticky}>{t({ en: "AVG / TRANSACTION", ar: "متوسط المعاملة" })}</td>
                    <td style={S.tfootLight}>1</td>
                    <td style={S.tfootLight}>{kg(totals.carcassKg / totals.count)}</td>
                    {cols.map((c) => (
                      <td key={c.id} style={S.tfootLight}>
                        {kg(data.dateTotals.cuts[c.id] / totals.count)}
                      </td>
                    ))}
                    <td style={S.tfootLight}>{kg(totals.cutsKg / totals.count)}</td>
                    <td style={S.tfootLight}>{kg(totals.wasteKg / totals.count)}</td>
                    <td style={S.tfootLight}>—</td>
                  </tr>

                  {/* متوسط اليوم الواحد */}
                  <tr>
                    <td style={S.tfootSticky}>{t({ en: "AVG / DAY", ar: "متوسط اليوم" })}</td>
                    <td style={S.tfootLight}>{(totals.count / (totals.days || 1)).toFixed(1)}</td>
                    <td style={S.tfootLight}>{kg(totals.carcassKg / (totals.days || 1))}</td>
                    {cols.map((c) => (
                      <td key={c.id} style={S.tfootLight}>
                        {kg(data.dateTotals.cuts[c.id] / (totals.days || 1))}
                      </td>
                    ))}
                    <td style={S.tfootLight}>{kg(totals.cutsKg / (totals.days || 1))}</td>
                    <td style={S.tfootLight}>{kg(totals.wasteKg / (totals.days || 1))}</td>
                    <td style={S.tfootLight}>{dayYield.avg.toFixed(1)}%</td>
                  </tr>
                </tfoot>
              </table>
              <div className="bs-meta" style={S.insight}>
                <span>
                  <b>{t({ en: "Days", ar: "الأيام" })}:</b> {totals.days}
                </span>
                <span>
                  <b>{t({ en: "Transactions / day", ar: "معاملات/يوم" })}:</b>{" "}
                  {(totals.count / (totals.days || 1)).toFixed(1)}
                </span>
                {dayYield.max && (
                  <span>
                    ✅ <b>{t({ en: "Best day", ar: "أفضل يوم" })}:</b> {dayYield.max.key}{" "}
                    ({dayYield.max.yieldPct.toFixed(1)}%)
                  </span>
                )}
                {dayYield.min && (
                  <span>
                    ⚠️ <b>{t({ en: "Lowest day", ar: "أدنى يوم" })}:</b> {dayYield.min.key}{" "}
                    ({dayYield.min.yieldPct.toFixed(1)}%)
                  </span>
                )}
                <span>
                  <b>{t({ en: "Avg daily yield", ar: "متوسط التصافي اليومي" })}:</b>{" "}
                  {dayYield.avg.toFixed(1)}%
                </span>
                <span>
                  <b>{t({ en: "Cuts : waste", ar: "نسبة القطع للهدر" })}:</b>{" "}
                  {totals.wasteKg > 0 ? `${(totals.cutsKg / totals.wasteKg).toFixed(1)} : 1` : "—"}
                </span>
              </div>
            </Section>

            {/* ── 2) حسب القطعة مقابل المرجع ── */}
            <Section n="2" title={t({ en: "By cut vs target ratios", ar: "حسب القطعة مقابل النِّسب المرجعية" })} pageBreak>
              <table style={S.table}>
                <thead>
                  <tr>
                    <th style={S.th}>{t({ en: "CUT", ar: "القطعة" })}</th>
                    <th style={S.th}>{t({ en: "ENTRIES", ar: "عدد الإدخالات" })}</th>
                    <th style={S.th}>{t({ en: "WEIGHT KG", ar: "الوزن" })}</th>
                    <th style={S.th}>{t({ en: "WASTE KG", ar: "الهدر والعضم" })}</th>
                    <th style={S.th}>{t({ en: "% OF CUTS", ar: "٪ من القطع" })}</th>
                    <th style={S.th}>{t({ en: "% OF CARCASS", ar: "٪ من الذبيحة" })}</th>
                    <th style={S.th}>{t({ en: "TARGET", ar: "المرجع" })}</th>
                    <th style={S.th}>{t({ en: "STATUS", ar: "الحالة" })}</th>
                  </tr>
                </thead>
                <tbody>
                  {data.cutRows.map((r, i) => (
                    <tr key={r.id} style={i % 2 ? S.zebra : null}>
                      <td style={{ ...S.td, fontWeight: 800, textAlign: "start" }}>{r.name}</td>
                      <td style={S.td}>{r.count}</td>
                      <td style={{ ...S.td, fontWeight: 800, color: "#1f6fd0" }}>
                        {r.special ? "—" : kg(r.kg)}
                      </td>
                      <td style={{ ...S.td, color: "#a16207" }}>{kg(r.waste)}</td>
                      <td style={S.td}>{r.special ? "—" : `${r.shareOfCuts.toFixed(1)}%`}</td>
                      <td style={S.td}>{r.special ? "—" : `${r.shareOfCarcass.toFixed(1)}%`}</td>
                      <td style={S.td}>{r.ref ? `${r.ref.min}–${r.ref.max}%` : "—"}</td>
                      <td style={{ ...S.td, ...STATE_STYLE[r.state] }}>
                        {r.state === "ok" ? `✓ ${t({ en: "Within", ar: "ضمن المدى" })}`
                          : r.state === "low" ? `↓ ${t({ en: "Below", ar: "أقل" })}`
                          : r.state === "high" ? `↑ ${t({ en: "Above", ar: "أعلى" })}`
                          : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr>
                    <td style={S.tfoot}>{t({ en: "TOTAL", ar: "الإجمالي" })}</td>
                    <td style={S.tfoot}>—</td>
                    <td style={{ ...S.tfoot, color: "#1f6fd0" }}>{kg(totals.cutsKg)}</td>
                    <td style={{ ...S.tfoot, color: "#a16207" }}>{kg(totals.wasteKg)}</td>
                    <td style={S.tfoot}>100%</td>
                    <td style={S.tfoot}>{totals.yieldPct.toFixed(1)}%</td>
                    <td style={S.tfoot}>—</td>
                    <td style={S.tfoot}>—</td>
                  </tr>
                </tfoot>
              </table>
            </Section>

            {/* ── 3) مصفوفة النوع × المنشأ ── */}
            <Section n="3" title={t({ en: "Type × origin matrix", ar: "مصفوفة النوع × المنشأ" })}>
              <table style={S.table}>
                <thead>
                  <tr>
                    <th style={S.thSticky}>{t({ en: "TYPE \\ ORIGIN", ar: "النوع \\ المنشأ" })}</th>
                    {data.matrix.originNames.map((o) => (
                      <th key={o} style={S.th}>{o}</th>
                    ))}
                    <th style={S.th}>{t({ en: "TOTAL", ar: "الإجمالي" })}</th>
                  </tr>
                </thead>
                <tbody>
                  {data.matrix.animalNames.map((a, i) => {
                    const rowTotal = data.animals.find((x) => x.key === a);
                    return (
                      <tr key={a} style={i % 2 ? S.zebra : null}>
                        <td style={{ ...S.tdSticky, ...(i % 2 ? S.zebra : null) }}>{a}</td>
                        {data.matrix.originNames.map((o) => {
                          const c = data.matrix.cell(a, o);
                          if (!c) return <td key={o} style={{ ...S.td, color: "#c7d6e5" }}>—</td>;
                          const y = pct(c.cutsKg, c.base);
                          return (
                            <td key={o} style={S.td}>
                              <div style={{ fontWeight: 800, color: "#1f6fd0" }}>{kg(c.cutsKg)}</div>
                              <div style={{ color: "#0f766e", fontWeight: 800 }}>{y.toFixed(1)}%</div>
                              <div style={{ color: "#8aa3b8" }}>{c.count} × </div>
                            </td>
                          );
                        })}
                        <td style={S.td}>
                          <div style={{ fontWeight: 800, color: "#1f6fd0" }}>{kg(rowTotal?.cutsKg || 0)}</div>
                          <div style={{ color: "#0f766e", fontWeight: 800 }}>
                            {(rowTotal?.yieldPct || 0).toFixed(1)}%
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr>
                    <td style={S.tfootSticky}>{t({ en: "TOTAL", ar: "الإجمالي" })}</td>
                    {data.matrix.originNames.map((o) => {
                      const g = data.origins.find((x) => x.key === o);
                      return (
                        <td key={o} style={S.tfoot}>
                          <div style={{ color: "#1f6fd0" }}>{kg(g?.cutsKg || 0)}</div>
                          <div style={{ color: "#0f766e" }}>{(g?.yieldPct || 0).toFixed(1)}%</div>
                        </td>
                      );
                    })}
                    <td style={S.tfoot}>
                      <div style={{ color: "#1f6fd0" }}>{kg(totals.cutsKg)}</div>
                      <div style={{ color: "#0f766e" }}>{totals.yieldPct.toFixed(1)}%</div>
                    </td>
                  </tr>
                </tfoot>
              </table>
              {bestOrigin && worstOrigin && bestOrigin.key !== worstOrigin.key && (
                <div className="bs-meta" style={S.insight}>
                  ✅ {t({ en: "Best yield", ar: "أعلى تصافي" })}: <b>{bestOrigin.key}</b>{" "}
                  ({bestOrigin.yieldPct.toFixed(1)}%) — ⚠️ {t({ en: "Lowest", ar: "أدنى" })}:{" "}
                  <b>{worstOrigin.key}</b> ({worstOrigin.yieldPct.toFixed(1)}%){" · "}
                  {t({ en: "difference", ar: "الفارق" })}{" "}
                  <b>{(bestOrigin.yieldPct - worstOrigin.yieldPct).toFixed(1)}</b>{" "}
                  {t({ en: "points", ar: "نقطة" })}
                </div>
              )}
            </Section>

            {/* ── 4) حسب الملحمة ── */}
            <Section n="4" title={t({ en: "By butchery", ar: "حسب الملحمة" })}>
              <GroupTable rows={data.branches} t={t} head={t({ en: "BUTCHERY", ar: "الملحمة" })} />
            </Section>

            {/* ── 5) أداء الجزارين ── */}
            <Section n="5" title={t({ en: "Butcher performance", ar: "أداء الجزارين" })} pageBreak>
              <table style={S.table}>
                <thead>
                  <tr>
                    <th style={S.th}>#</th>
                    <th style={S.th}>{t({ en: "EMPLOYEE NO.", ar: "الرقم الوظيفي" })}</th>
                    <th style={S.th}>{t({ en: "TRANS.", ar: "المعاملات" })}</th>
                    <th style={S.th}>{t({ en: "CARCASS KG", ar: "وزن الذبائح" })}</th>
                    <th style={S.th}>{t({ en: "CUTS KG", ar: "القطع" })}</th>
                    <th style={S.th}>{t({ en: "WASTE KG", ar: "الهدر والعضم" })}</th>
                    <th style={S.th}>{t({ en: "NET YIELD %", ar: "٪ التصافي" })}</th>
                    <th style={S.th}>{t({ en: "AVG / TRANS.", ar: "متوسط المعاملة" })}</th>
                    <th style={S.th}>{t({ en: "CONSISTENCY (σ)", ar: "ثبات الأداء (σ)" })}</th>
                  </tr>
                </thead>
                <tbody>
                  {[...data.butchers]
                    .sort((a, b) => b.yieldPct - a.yieldPct)
                    .map((g, i) => (
                      <tr key={g.key} style={i % 2 ? S.zebra : null}>
                        <td style={S.td}>{i + 1}</td>
                        <td style={{ ...S.td, fontWeight: 800 }}>{g.key}</td>
                        <td style={S.td}>{g.count}</td>
                        <td style={S.td}>{kg(g.carcassKg)}</td>
                        <td style={{ ...S.td, fontWeight: 800, color: "#1f6fd0" }}>{kg(g.cutsKg)}</td>
                        <td style={{ ...S.td, color: "#a16207" }}>{kg(g.wasteKg)}</td>
                        <td style={{ ...S.td, fontWeight: 800, color: "#0f766e" }}>
                          {g.yieldPct.toFixed(1)}%
                        </td>
                        <td style={S.td}>{g.avgYield.toFixed(1)}%</td>
                        <td style={{ ...S.td, ...consistencyStyle(g.consistency) }}>
                          {g.count > 1 ? `± ${g.consistency.toFixed(1)}` : "—"}
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
              <div className="bs-meta" style={S.note}>
                {t({
                  en: "σ is the spread of a butcher's yield across their transactions — the smaller, the more consistent. It needs at least two transactions.",
                  ar: "σ هو تشتّت تصافي الجزار بين معاملاته — كل ما صغر كان الأداء أثبت. يحتاج معاملتين على الأقل.",
                })}
              </div>
            </Section>

            {/* ── 6) الانحرافات وجودة البيانات ── */}
            <Section n="6"
              title={`${t({ en: "Deviations & data quality", ar: "الانحرافات وجودة البيانات" })} (${deviations.length})`}>
              {deviations.length === 0 ? (
                <div style={S.empty}>
                  ✅ {t({ en: "No deviations found.", ar: "لا توجد انحرافات." })}
                </div>
              ) : (
                <table style={S.table}>
                  <thead>
                    <tr>
                      <th style={S.th}>{t({ en: "DATE", ar: "التاريخ" })}</th>
                      <th style={S.th}>{t({ en: "EMP.", ar: "الرقم الوظيفي" })}</th>
                      <th style={S.th}>{t({ en: "BUTCHERY", ar: "الملحمة" })}</th>
                      <th style={S.th}>{t({ en: "TYPE", ar: "النوع" })}</th>
                      <th style={S.th}>{t({ en: "ORIGIN", ar: "المنشأ" })}</th>
                      <th style={S.th}>{t({ en: "GRADE", ar: "الدرجة" })}</th>
                      <th style={S.th}>{t({ en: "CARCASS", ar: "وزن الذبيحة" })}</th>
                      <th style={S.th}>{t({ en: "YIELD %", ar: "٪ التصافي" })}</th>
                      <th style={S.th}>
                        {vsTarget
                          ? t({ en: "TARGET", ar: "المستهدف" })
                          : t({ en: "TYPE AVG", ar: "متوسط النوع" })}
                      </th>
                      <th style={S.th}>{t({ en: "DIFF", ar: "الفارق" })}</th>
                      <th style={S.th}>{t({ en: "FLAGS", ar: "الملاحظات" })}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {deviations.map((x, i) => (
                      <tr key={x.id + i} style={i % 2 ? S.zebra : null}>
                        <td style={S.td}>{x.day}</td>
                        <td style={{ ...S.td, fontWeight: 800 }}>{x.butcherName}</td>
                        <td style={S.td}>{x.branchName}</td>
                        <td style={S.td}>{x.animalName}</td>
                        <td style={S.td}>{x.originName}</td>
                        <td style={S.td}>{x.carcassKg > 0 ? kg(x.carcassKg) : "—"}</td>
                        <td style={{ ...S.td, fontWeight: 800 }}>{x.yieldPct.toFixed(1)}%</td>
                        <td style={S.td}>{x.avg.toFixed(1)}%</td>
                        <td style={{
                          ...S.td, fontWeight: 900,
                          color: x.diff < 0 ? "#991b1b" : "#166534",
                        }}>
                          {x.diff > 0 ? "+" : ""}{x.diff.toFixed(1)}
                        </td>
                        <td style={{ ...S.td, textAlign: "start" }}>
                          {x.flags.map((f) => (
                            <span key={f} style={{ ...S.flag, ...FLAG_STYLE[f] }}>
                              {FLAG_LABEL[f] ? t(FLAG_LABEL[f]) : f}
                            </span>
                          ))}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
              <div className="bs-meta" style={S.note}>
                {isAr
                  ? `يُعتبر التصافي منحرفاً إذا ابتعد أكثر من ${threshold} نقاط عن ${
                      vsTarget ? "التصافي المستهدف المشتقّ من النِّسب المرجعية" : "متوسط نفس النوع في الفترة"
                    } — يُضبط من لوحة الإعدادات.`
                  : `A transaction is flagged when its yield is more than ${threshold} points away from the ${
                      vsTarget ? "target yield derived from the reference ratios" : "period average of the same animal type"
                    } — set in Settings.`}
              </div>
            </Section>

            {/* ── 7) حسب النوع والمنشأ (جداول) ── */}
            <Section n="7" title={t({ en: "By type & origin", ar: "حسب النوع والمنشأ" })}>
              <div style={S.twoCol}>
                <GroupTable rows={data.animals} t={t} head={t({ en: "TYPE", ar: "النوع" })} />
                <GroupTable rows={data.origins} t={t} head={t({ en: "ORIGIN", ar: "المنشأ" })} />
                {data.grades.length > 0 && (
                  <GroupTable rows={data.grades} t={t} head={t({ en: "GRADE", ar: "الدرجة" })} />
                )}
              </div>
            </Section>

            {/* ── 8) تفاصيل المعاملات ── */}
            {showDetail && (
              <Section n="8" title={t({ en: "Transaction details", ar: "تفاصيل المعاملات" })} pageBreak>
                <table style={S.table}>
                  <thead>
                    <tr>
                      <th style={S.th}>{t({ en: "DATE", ar: "التاريخ" })}</th>
                      <th style={S.th}>{t({ en: "TIME", ar: "الوقت" })}</th>
                      <th style={S.th}>{t({ en: "BUTCHERY", ar: "الملحمة" })}</th>
                      <th style={S.th}>{t({ en: "EMP.", ar: "الرقم الوظيفي" })}</th>
                      <th style={S.th}>{t({ en: "TYPE", ar: "النوع" })}</th>
                      <th style={S.th}>{t({ en: "ORIGIN", ar: "المنشأ" })}</th>
                      <th style={S.th}>{t({ en: "GRADE", ar: "الدرجة" })}</th>
                      <th style={S.th}>{t({ en: "CARCASS", ar: "وزن الذبيحة" })}</th>
                      <th style={S.th}>{t({ en: "CUTS", ar: "القطع" })}</th>
                      <th style={S.th}>{t({ en: "WASTE", ar: "الهدر والعضم" })}</th>
                      <th style={S.th}>{t({ en: "YIELD %", ar: "٪ التصافي" })}</th>
                      <th style={S.th}>{t({ en: "BREAKDOWN", ar: "التفصيل" })}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.txns.map((tx, i) => (
                      <tr key={tx.id} style={i % 2 ? S.zebra : null}>
                        <td style={S.td}>{tx.day}</td>
                        <td style={S.td}>{tx.time}</td>
                        <td style={S.td}>{tx.branchName}</td>
                        <td style={{ ...S.td, fontWeight: 800 }}>{tx.butcherName}</td>
                        <td style={S.td}>{tx.animalName}</td>
                        <td style={S.td}>{tx.originName}</td>
                        <td style={S.td}>{tx.gradeName}</td>
                        <td style={S.td}>{tx.carcassKg > 0 ? kg(tx.carcassKg) : "—"}</td>
                        <td style={{ ...S.td, color: "#1f6fd0", fontWeight: 800 }}>{kg(tx.cutsKg)}</td>
                        <td style={{ ...S.td, color: "#a16207" }}>{kg(tx.wasteKg)}</td>
                        <td style={{ ...S.td, color: "#0f766e", fontWeight: 800 }}>
                          {tx.yieldPct.toFixed(1)}%
                        </td>
                        <td style={{ ...S.td, textAlign: "start", whiteSpace: "normal", minWidth: 260 }}>
                          {tx.cuts.map((c, k) => (
                            <span key={`${c.cutId}-${k}`} style={S.cutChip}>
                              {c.name}{c.code ? ` (${c.code})` : ""} {kg(c.weightKg)}
                              {c.wasteBoneKg > 0 ? ` +${kg(c.wasteBoneKg)}` : ""}
                            </span>
                          ))}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </Section>
            )}

            {/* ── التواقيع ── */}
            <div className="bs-block" style={S.signRow}>
              {(RPT.signatures || []).map((s) => (
                <div key={s.en} style={S.signBox}>
                  <div style={S.signLine} />
                  <div className="bs-meta" style={S.signLbl}>{t(s)}</div>
                </div>
              ))}
            </div>
          </>
        )}

        <div className="bs-meta" style={S.footNote}>
          {t({
            en: "Waste & bone includes per-cut trimming plus the Total Waste / Total Bone entries. Net yield = total cuts ÷ carcass weight (or ÷ cuts + waste when no carcass weight was recorded). Target ratios are an internal guide, not a standard.",
            ar: "الهدر والعضم يشمل هدر كل قطعة إضافةً إلى مدخلات «الهدر الكامل» و«العضم الكامل». نسبة التصافي = مجموع القطع ÷ وزن الذبيحة (أو ÷ القطع + الهدر إذا لم يُسجَّل وزن ذبيحة). النِّسب المرجعية إرشادية داخلية وليست معياراً معتمداً.",
          })}
        </div>
      </div>
    </div>
  );
}

/* ═══════════════ مكوّنات ═══════════════ */

/** فرق النسبة المئوية عن الفترة السابقة (null إذا لا مقارنة). */
function delta(now, before) {
  if (before === undefined || before === null || !Number.isFinite(before) || before === 0) return null;
  return ((now - before) / Math.abs(before)) * 100;
}

function Kpi({ n, l, c, d, t, invert, s }) {
  const good = invert ? d < 0 : d > 0;
  return (
    <div style={S.kpi}>
      <div className="bs-kpinum" style={{ ...S.kpiNum, ...(c ? { color: c } : null) }}>{n}</div>
      <div className="bs-kpilbl" style={S.kpiLbl}>{l}</div>
      {Array.isArray(s) && s.length > 1 && <Sparkline data={s} />}
      {d !== null && d !== undefined && Number.isFinite(d) && (
        <div className="bs-delta" style={{
          ...S.kpiDelta,
          color: Math.abs(d) < 0.05 ? "#8aa3b8" : good ? "#166534" : "#991b1b",
        }}>
          {d > 0 ? "▲" : d < 0 ? "▼" : "="} {Math.abs(d).toFixed(1)}%{" "}
          <span style={{ color: "#8aa3b8" }}>{t({ en: "vs prev.", ar: "عن السابقة" })}</span>
        </div>
      )}
    </div>
  );
}

function Section({ n, title, children, pageBreak }) {
  return (
    <div className={`bs-block${pageBreak ? " bs-pagebreak" : ""}`} style={S.section}>
      <div className="bs-sec" style={S.secTitle}>
        <span style={S.secNum}>{n}</span> {title}
      </div>
      <div style={S.tableWrap}>{children}</div>
    </div>
  );
}

function GroupTable({ rows, head, t, rank }) {
  return (
    <table style={S.table}>
      <thead>
        <tr>
          {rank && <th style={S.th}>#</th>}
          <th style={S.th}>{head}</th>
          <th style={S.th}>{t({ en: "TRANS.", ar: "المعاملات" })}</th>
          <th style={S.th}>{t({ en: "CARCASS KG", ar: "وزن الذبائح" })}</th>
          <th style={S.th}>{t({ en: "CUTS KG", ar: "القطع" })}</th>
          <th style={S.th}>{t({ en: "WASTE KG", ar: "الهدر والعضم" })}</th>
          <th style={S.th}>{t({ en: "NET YIELD %", ar: "٪ التصافي" })}</th>
          <th style={S.th}>{t({ en: "WASTE %", ar: "٪ الهدر" })}</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((g, i) => (
          <tr key={g.key} style={i % 2 ? S.zebra : null}>
            {rank && <td style={S.td}>{i + 1}</td>}
            <td style={{ ...S.td, fontWeight: 800, textAlign: "start" }}>{g.key}</td>
            <td style={S.td}>{g.count}</td>
            <td style={S.td}>{kg(g.carcassKg)}</td>
            <td style={{ ...S.td, fontWeight: 800, color: "#1f6fd0" }}>{kg(g.cutsKg)}</td>
            <td style={{ ...S.td, color: "#a16207" }}>{kg(g.wasteKg)}</td>
            <td style={{ ...S.td, fontWeight: 800, color: "#0f766e" }}>{g.yieldPct.toFixed(1)}%</td>
            <td style={{ ...S.td, color: "#a16207" }}>{g.wastePct.toFixed(1)}%</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

const consistencyStyle = (sd) =>
  sd === 0 ? {} :
  sd <= 3 ? { background: "#dcfce7", color: "#166534", fontWeight: 900 } :
  sd <= 7 ? { background: "#fef9c3", color: "#854d0e", fontWeight: 900 } :
            { background: "#fee2e2", color: "#991b1b", fontWeight: 900 };

const STATE_STYLE = {
  ok: { background: "#dcfce7", color: "#166534", fontWeight: 900 },
  low: { background: "#fef9c3", color: "#854d0e", fontWeight: 900 },
  high: { background: "#fee2e2", color: "#991b1b", fontWeight: 900 },
  idle: {},
};

const FLAG_LABEL = {
  low: { en: "Yield below average", ar: "تصافي أقل من المتوسط" },
  high: { en: "Yield above average", ar: "تصافي أعلى من المتوسط" },
  impossible: { en: "Yield over 100%", ar: "تصافي فوق ١٠٠٪" },
  nowaste: { en: "No waste recorded", ar: "بلا هدر مسجّل" },
  nobranch: { en: "No butchery", ar: "بلا ملحمة" },
};

const FLAG_STYLE = {
  low: { background: "#fef9c3", color: "#854d0e" },
  high: { background: "#e0f2fe", color: "#075985" },
  impossible: { background: "#fee2e2", color: "#991b1b" },
  nowaste: { background: "#f3e8ff", color: "#6b21a8" },
  nobranch: { background: "#f1f5f9", color: "#334155" },
};

const FONT = "Cairo, system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif";

const S = {
  page: {
    minHeight: "100vh", background: "#eef4fb", fontFamily: FONT, color: "#0f2740",
    padding: "16px 14px 40px", overflowX: "hidden",
  },
  tools: { maxWidth: "100%", margin: "0 auto 14px", display: "flex", flexDirection: "column", gap: 10 },
  toolRow: { display: "flex", gap: 8, flexWrap: "wrap", alignItems: "flex-end" },
  langBtn: { background: "#fff", border: "1px solid #cfe0f0", color: "#1f6fd0" },
  btn: {
    border: "1px solid #cfe0f0", background: "#fff", color: "#3c5a75",
    borderRadius: 12, padding: "10px 16px", fontWeight: 700, fontFamily: FONT, cursor: "pointer",
  },
  btnPrimary: { background: "#1f6fd0", color: "#fff", border: "none" },
  pill: {
    border: "1px solid #cfe0f0", background: "#fff", color: "#14507f",
    borderRadius: 999, padding: "8px 18px", fontWeight: 800, fontFamily: FONT, cursor: "pointer",
  },
  field: { display: "flex", flexDirection: "column", gap: 5, minWidth: 0, flex: "1 1 160px" },
  label: { fontWeight: 800, color: "#6b8299" },
  input: {
    border: "1px solid #cfe0f0", borderRadius: 10, padding: "9px 10px",
    fontWeight: 700, fontFamily: FONT, color: "#0f2740", background: "#fff",
    outline: "none", width: "100%", boxSizing: "border-box",
  },
  error: {
    background: "#fdecec", border: "1px solid #f5c2c2", color: "#a12626",
    borderRadius: 12, padding: "10px 12px", fontWeight: 700, textAlign: "center",
  },

  sheet: {
    maxWidth: "100%", margin: "0 auto", background: "#fff",
    border: "1px solid #dbe6f2", borderRadius: 14, padding: "22px 20px",
    boxShadow: "0 10px 30px rgba(15,39,64,.07)",
  },
  brand: {
    display: "flex", alignItems: "center", justifyContent: "center",
    gap: 14, marginBottom: 10, flexWrap: "wrap",
  },
  logo: { height: 54, maxWidth: 220, objectFit: "contain" },
  company: { fontWeight: 900, color: "#0f2740" },
  companyAlt: { color: "#8aa3b8", fontWeight: 700 },
  head: { textAlign: "center", borderBottom: "3px double #14507f", paddingBottom: 12, marginBottom: 12 },
  title: { fontWeight: 900, color: "#14507f", letterSpacing: ".3px" },
  subTitle: { fontWeight: 700, color: "#8aa3b8", marginTop: 4 },
  meta: {
    display: "flex", flexWrap: "wrap", gap: "6px 22px",
    color: "#3c5a75", fontWeight: 600, marginBottom: 14,
    borderInlineStart: "4px solid #dceaf8", paddingInlineStart: 12,
  },

  kpis: {
    display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(min(132px,100%),1fr))",
    gap: 8, marginBottom: 8,
  },
  kpi: {
    background: "#f7fbff", border: "1px solid #dbe6f2", borderRadius: 10,
    padding: "10px 8px", textAlign: "center",
  },
  kpiNum: { fontWeight: 900, color: "#14507f" },
  kpiLbl: { fontWeight: 700, color: "#6b8299", marginTop: 2 },
  kpiDelta: { fontWeight: 800, marginTop: 3 },
  prevNote: { color: "#8aa3b8", fontWeight: 700, marginBottom: 16 },

  charts: {
    display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(min(430px,100%),1fr))",
    gap: 14, marginBottom: 20,
  },
  chartBox: { border: "1px solid #dbe6f2", borderRadius: 12, padding: 12, background: "#fff" },
  chartTitle: { fontWeight: 900, color: "#14507f", marginBottom: 6 },

  section: { marginBottom: 20 },
  secTitle: {
    fontWeight: 900, color: "#14507f", marginBottom: 8,
    display: "flex", alignItems: "center", gap: 8,
  },
  secNum: {
    background: "#14507f", color: "#fff", borderRadius: 8,
    minWidth: 26, height: 26, display: "inline-grid", placeItems: "center",
  },
  twoCol: { display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(min(380px,100%),1fr))", gap: 12 },
  insight: {
    marginTop: 8, background: "#f7fbff", border: "1px solid #dbe6f2",
    borderRadius: 10, padding: "10px 14px", fontWeight: 700, color: "#3c5a75",
    display: "flex", flexWrap: "wrap", gap: "6px 24px",
  },
  note: { marginTop: 8, color: "#8aa3b8", fontWeight: 600, lineHeight: 1.6 },

  tableWrap: {
    overflowX: "auto", WebkitOverflowScrolling: "touch",
    border: "1px solid #dbe6f2", borderRadius: 10,
  },
  table: { width: "100%", borderCollapse: "collapse", minWidth: 760 },
  th: {
    background: "#14507f", color: "#fff", fontWeight: 900,
    padding: "10px 9px", textAlign: "center", whiteSpace: "nowrap",
    border: "1px solid #0f3f66",
  },
  thSticky: {
    background: "#14507f", color: "#fff", fontWeight: 900,
    padding: "10px 9px", textAlign: "center", whiteSpace: "nowrap",
    border: "1px solid #0f3f66", position: "sticky", insetInlineStart: 0, zIndex: 2,
  },
  td: {
    padding: "8px 9px", fontWeight: 600, textAlign: "center",
    whiteSpace: "nowrap", border: "1px solid #e6eef7",
  },
  tdSticky: {
    padding: "8px 9px", fontWeight: 800, textAlign: "center", whiteSpace: "nowrap",
    border: "1px solid #e6eef7", position: "sticky", insetInlineStart: 0,
    background: "#fff", zIndex: 1,
  },
  zebra: { background: "#f7fbff" },
  tfoot: {
    padding: "10px 9px", fontWeight: 900, textAlign: "center", whiteSpace: "nowrap",
    background: "#dceaf8", border: "1px solid #bcd6ee",
  },
  tfootSticky: {
    padding: "10px 9px", fontWeight: 900, textAlign: "center", whiteSpace: "nowrap",
    background: "#dceaf8", border: "1px solid #bcd6ee",
    position: "sticky", insetInlineStart: 0, zIndex: 1,
  },
  tfootLight: {
    padding: "8px 9px", fontWeight: 700, textAlign: "center", whiteSpace: "nowrap",
    background: "#f2f8ff", border: "1px solid #d8e8f6", color: "#3c5a75",
  },
  cutChip: {
    display: "inline-block", background: "#f2f8ff", border: "1px solid #dbe6f2",
    borderRadius: 999, padding: "2px 10px", margin: "2px 3px", fontWeight: 700,
  },
  flag: {
    display: "inline-block", borderRadius: 999, padding: "2px 10px",
    margin: "2px 3px", fontWeight: 800,
  },
  empty: { padding: 30, textAlign: "center", color: "#6b8299", fontWeight: 700 },

  signRow: {
    display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(min(200px,100%),1fr))",
    gap: 26, marginTop: 30, marginBottom: 6,
  },
  signBox: { textAlign: "center" },
  signLine: { borderTop: "1.5px solid #9fb6cc", marginBottom: 6 },
  signLbl: { color: "#6b8299", fontWeight: 800 },

  footNote: { marginTop: 14, color: "#8aa3b8", fontWeight: 600, lineHeight: 1.6 },
};
