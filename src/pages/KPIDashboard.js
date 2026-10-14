// src/pages/KPIDashboard.js
// لوحة مؤشرات الأداء — أربعة أسئلة واضحة بدل ثلاثين رقم:
//   1. هل الفروع عم تسلّم سجلاتها اليومية؟   (الحرارة · النظافة الشخصية · النظافة)
//   2. كم من الشحنات انقبلت؟
//   3. كم قراءة حرارة طلعت برّا حدودها؟       (كل وحدة على حدودها هي، مش متوسط واحد)
//   4. كم صنف رجع؟
// كل رقم مقارن بالفترة اللي قبلها، وتحت: جدول الفروع، «بحاجة لانتباهك»، والتفاصيل.
//
// الكلفة: الصفحة القديمة كانت تسحب لحد 5000 تقرير كامل من أربع أنواع بكل فتحة.
// هلّق: طلب أعداد واحد (/api/reports/kpi-days — أعداد بلا payload)، ملخّص واحد،
// وتقارير الفترة المختارة بس للشحنات/البرادات/المرتجعات. تحميل السيارات ما بينجاب
// إلا إذا فتحت تبويبه. والنتائج بتنحفظ دقيقتين بالذاكرة فالتنقّل بين الفترات ما بيعيد الطلب.
import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import API_BASE from "../config/api";
import { BRANCHES as CATALOG_BRANCHES } from "./settings/reportTypeCatalog";
import { defsFromPayload, inRange as tempInRange } from "./monitor/branches/qcs/coolerDefs";

/* ============================================================
   السجلات اليومية المطلوبة من كل فرع
   ثلاث سجلات يومية لكل موقع — هي اللي بتنحسب منها نسبة الالتزام.
   باقي النماذج (أسبوعية/شهرية/عند الحاجة) ما بتدخل بالنسبة لأنها مش يومية.
============================================================ */
const KIND_LABEL = { temp: "الحرارة", hyg: "النظافة الشخصية", clean: "النظافة اليومية" };

const DAILY_LOGS = [
  { id: "QCS",        types: [["qcs-coolers", "temp"], ["qcs-ph", "hyg"], ["qcs-clean", "clean"]] },
  { id: "POS6",       types: [["pos6_coolers_temperature", "temp"], ["pos6_personal_hygiene", "hyg"], ["pos6_cleaning_checklist", "clean"]] },
  { id: "POS10",      types: [["pos10_temperature", "temp"], ["pos10_personal_hygiene", "hyg"], ["pos10_daily_cleanliness", "clean"]] },
  { id: "POS11",      types: [["pos11_temperature", "temp"], ["pos11_personal_hygiene", "hyg"], ["pos11_daily_cleanliness", "clean"]] },
  { id: "POS15",      types: [["pos15_temperature", "temp"], ["pos15_personal_hygiene", "hyg"], ["pos15_daily_cleanliness", "clean"]] },
  { id: "POS19",      types: [["pos19_temperature_monitoring", "temp"], ["pos19_personal_hygiene", "hyg"], ["pos19_daily_cleaning", "clean"]] },
  { id: "PRODUCTION", types: [["prod_personal_hygiene", "hyg"], ["prod_cleaning_checklist", "clean"]] },
  { id: "FTR1",       types: [["ftr1_temperature", "temp"], ["ftr1_personal_hygiene", "hyg"], ["ftr1_daily_cleanliness", "clean"]] },
  { id: "FTR2",       types: [["ftr2_temperature", "temp"], ["ftr2_personal_hygiene", "hyg"], ["ftr2_daily_cleanliness", "clean"]] },
].map((b) => {
  const cat = CATALOG_BRANCHES.find((c) => c.id === b.id) || {};
  return { ...b, name: cat.label || b.id, accent: cat.accent || "#2563eb" };
});

const ALL_DAILY_TYPES = DAILY_LOGS.flatMap((b) => b.types.map(([t]) => t));

/* فرع ما سلّم ولا سجل يومي من 30 يوم = متوقف، ما بيدخل بالنسبة العامة. */
const INACTIVE_AFTER_DAYS = 30;

/* الأهداف — الأخضر من هون وفوق، والأصفر لحد العتبة التانية. */
const TARGET = {
  compliance: { good: 95, warn: 80 },
  shipments:  { good: 90, warn: 75 },
};

/* ============================================================
   التواريخ — كلها نصوص YYYY-MM-DD بتوقيت دبي
============================================================ */
function todayDubai() {
  try { return new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Dubai" }); }
  catch { return new Date().toISOString().slice(0, 10); }
}
function addDays(iso, n) {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}
function daysBetween(a, b) {
  return Math.round((Date.parse(`${b}T00:00:00Z`) - Date.parse(`${a}T00:00:00Z`)) / 86_400_000);
}
function eachDay(from, to) {
  const out = [];
  for (let d = from; d <= to; d = addDays(d, 1)) out.push(d);
  return out;
}
function fmtDay(iso) {
  if (!iso) return "—";
  try {
    return new Date(`${iso}T00:00:00Z`).toLocaleDateString("ar-AE", { timeZone: "UTC", day: "numeric", month: "short" });
  } catch { return iso; }
}
function fmtRange(from, to) {
  return from === to ? fmtDay(from) : `${fmtDay(from)} — ${fmtDay(to)}`;
}

/** الفترات الجاهزة. «آخر 7 أيام» و«آخر 30 يوم» بتنتهي مبارح: يوم ما خلص بعد بيظلم النسبة. */
function presetRange(key, today) {
  const yest = addDays(today, -1);
  switch (key) {
    case "today": return { from: today, to: today };
    case "7d":    return { from: addDays(today, -7), to: yest };
    case "30d":   return { from: addDays(today, -30), to: yest };
    case "month": {
      const first = `${today.slice(0, 8)}01`;
      return { from: first, to: first === today ? today : yest };
    }
    case "lastMonth": {
      const firstThis = `${today.slice(0, 8)}01`;
      const lastPrev = addDays(firstThis, -1);
      return { from: `${lastPrev.slice(0, 8)}01`, to: lastPrev };
    }
    default: return { from: addDays(today, -7), to: yest };
  }
}
const PRESETS = [
  ["today", "اليوم"],
  ["7d", "آخر 7 أيام"],
  ["month", "هذا الشهر"],
  ["lastMonth", "الشهر الماضي"],
  ["30d", "آخر 30 يوم"],
];

/** تاريخ العمل للسجل — نفس ترتيب السيرفر، وأول 10 أحرف دايماً
    (الشحنات بتحفظ payload.date كطابع زمني كامل). */
function dayOf(rec) {
  const p = rec?.payload || {};
  const raw = p.cutDate || p.date || p.reportDate || p.header?.reportDate || p.header?.date ||
    rec?.reportDate || rec?.created_at || "";
  return String(raw).slice(0, 10);
}

/* ============================================================
   الجلب — مع ذاكرة قصيرة
============================================================ */
const CACHE_MS = 120_000;
const memo = new Map();

async function getRows(url) {
  const hit = memo.get(url);
  if (hit && Date.now() - hit.at < CACHE_MS) return hit.data;
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) {
    const err = new Error(String(res.status));
    err.status = res.status;
    throw err;
  }
  const json = await res.json().catch(() => []);
  const data = Array.isArray(json) ? json : json?.data ?? [];
  memo.set(url, { at: Date.now(), data });
  return data;
}

const rangeUrl = (type, from, to) =>
  `${API_BASE}/api/reports?type=${encodeURIComponent(type)}&from=${from}&to=${to}&limit=5000`;

/** حدود الوحدة بالعربي (defs طالعة من defsFromPayload، يعني مرتّبة). */
const rangeLabel = (def) => (def?.type === "ambient" && def.min <= 0 ? `حتى ${def.max}°` : `${def.min}° إلى ${def.max}°`);

/** أعداد السجلات اليومية لكل يوم: [{type, day, n}].
    السيرفر الجديد بيرد بطلب واحد؛ إذا لسا ما انرفع، منرجع لتواريخ كل نوع
    (dates=1 — تواريخ بلا payload، خفيفة) بأربع طلبات بنفس الوقت كحد أقصى. */
async function fetchDailyCounts(from, to) {
  try {
    return await getRows(
      `${API_BASE}/api/reports/kpi-days?types=${encodeURIComponent(ALL_DAILY_TYPES.join(","))}&from=${from}&to=${to}`
    );
  } catch (e) {
    if (e.status !== 404) throw e;
  }
  const out = [];
  const queue = [...ALL_DAILY_TYPES];
  const worker = async () => {
    while (queue.length) {
      const type = queue.shift();
      const rows = await getRows(
        `${API_BASE}/api/reports?type=${encodeURIComponent(type)}&dates=1&lite=1&limit=5000`
      ).catch(() => []);
      const byDay = new Map();
      rows.forEach((r) => {
        const d = String(r.reportDate || "").slice(0, 10);
        if (d >= from && d <= to) byDay.set(d, (byDay.get(d) || 0) + 1);
      });
      byDay.forEach((n, day) => out.push({ type, day, n }));
    }
  };
  await Promise.all([worker(), worker(), worker(), worker()]);
  return out;
}

/* ============================================================
   الحسابات
============================================================ */
function complianceOf(branch, doneSet, days) {
  const expected = days.length * branch.types.length;
  let done = 0;
  days.forEach((d) => branch.types.forEach(([t]) => { if (doneSet.has(`${t}|${d}`)) done += 1; }));
  return { expected, done, pct: expected ? Math.round((done / expected) * 100) : null };
}

const SHIP_OK = new Set(["acceptable", "مرضي"]);
const SHIP_AVG = new Set(["average", "وسط"]);
const SHIP_BAD = new Set(["below average", "تحت الوسط", "غير مرضي"]);
const shipStatus = (s) => {
  const v = String(s || "").trim().toLowerCase();
  if (SHIP_OK.has(v)) return "ok";
  if (SHIP_AVG.has(v)) return "avg";
  if (SHIP_BAD.has(v)) return "bad";
  return "";
};
function normShip(rec) {
  const p = rec?.payload || {};
  return {
    id: rec?.id,
    day: dayOf(rec),
    status: shipStatus(p.status || rec?.status),
    statusRaw: p.status || "",
    name: p.productName || p.name || p.generalInfo?.productName || "—",
    supplier: p.supplier || p.butchery || p.generalInfo?.supplierName || "—",
    kind: p.shipmentType || "غير محدد",
    remarks: p.remarks || "",
  };
}

/** كل قراءة حرارة بالبرادات مقابل حدود وحدتها بيوم التسجيل. */
function coolerReadings(rec) {
  const p = rec?.payload || {};
  const { coolerDefs, loadingDef } = defsFromPayload(p);
  const out = [];
  const take = (def, temps) => Object.entries(temps || {}).forEach(([time, v]) => {
    if (v === "" || v == null) return;
    const n = Number(v);
    if (!Number.isFinite(n)) return;
    out.push({ unit: def.label, def, time, value: n, ok: tempInRange(def, n) });
  });
  (Array.isArray(p.coolers) ? p.coolers : []).forEach((c, i) => take(coolerDefs[i], c?.temps));
  if (p.loadingArea) take(loadingDef, p.loadingArea.temps);
  return out;
}

function returnItems(rec) {
  const p = rec?.payload || {};
  const day = dayOf(rec);
  return (Array.isArray(p.items) ? p.items : []).map((it) => ({
    day,
    branch: (it.butchery === "فرع آخر..." ? it.customButchery : it.butchery) || "—",
    action: (it.action === "إجراء آخر..." ? it.customAction : it.action) || "—",
    product: it.productName || "—",
    qty: Number(it.quantity) || 0,
    unit: (it.qtyType === "أخرى" ? it.customQtyType : it.qtyType) || "",
  }));
}

function topCounts(list, key, n = 5) {
  const m = new Map();
  list.forEach((x) => m.set(x[key], (m.get(x[key]) || 0) + 1));
  return [...m.entries()].sort((a, b) => b[1] - a[1]).slice(0, n);
}

/* تحميل السيارات: سجل واحد فيه صف لكل سيارة. */
const VI_POSITIVE = ["trafficControlSpotter", "vehicleSecured", "loadSecured", "areaSafe", "manualHandlingControls", "floorSealingIntact", "floorCleaning", "plasticCurtain", "ppeAvailable"];
const VI_NEGATIVE = ["pestActivites", "badOdour"];
const toMinutes = (t) => {
  if (!t || !/^\d{1,2}:\d{2}$/.test(t)) return null;
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
};
function loadingRows(rec) {
  const p = rec?.payload || {};
  const day = dayOf(rec);
  const rows = Array.isArray(p.rows) ? p.rows : [];
  return rows.map((r) => ({ ...r, day }));
}

/* ============================================================
   الألوان والحالة
============================================================ */
const TONE = {
  good: { fg: "#047857", bg: "#ecfdf5", bd: "#a7f3d0" },
  warn: { fg: "#b45309", bg: "#fffbeb", bd: "#fde68a" },
  bad:  { fg: "#b91c1c", bg: "#fef2f2", bd: "#fecaca" },
  none: { fg: "#475569", bg: "#f8fafc", bd: "#e2e8f0" },
};
const toneByTarget = (pct, t) => (pct == null ? "none" : pct >= t.good ? "good" : pct >= t.warn ? "warn" : "bad");

/* ============================================================
   رسم خط بسيط (SVG، بلا مكتبات)
============================================================ */
function LineChart({ data, color = "#2563eb", unit = "", band }) {
  const pts = (data || []).filter((d) => Number.isFinite(d.value));
  if (pts.length < 2) return <div className="kp-empty">ما في بيانات كافية لرسم الاتجاه بهالفترة.</div>;
  const W = 640, H = 190, L = 40, R = 12, T = 12, B = 26;
  const iw = W - L - R, ih = H - T - B;
  const vals = pts.map((d) => d.value);
  let lo = Math.min(...vals, band ?? Infinity), hi = Math.max(...vals, band ?? -Infinity);
  if (unit === "%") { lo = Math.max(0, Math.min(lo, 50)); hi = 100; }
  if (hi - lo < 1) { hi += 1; lo -= 1; }
  const x = (i) => L + (i / (pts.length - 1)) * iw;
  const y = (v) => T + ih - ((v - lo) / (hi - lo)) * ih;
  const line = pts.map((d, i) => `${i ? "L" : "M"}${x(i).toFixed(1)} ${y(d.value).toFixed(1)}`).join(" ");
  const area = `${line} L${x(pts.length - 1).toFixed(1)} ${T + ih} L${L} ${T + ih} Z`;
  const ticks = [lo, (lo + hi) / 2, hi];
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="kp-svg" role="img">
      {ticks.map((t, i) => (
        <g key={i}>
          <line x1={L} x2={W - R} y1={y(t)} y2={y(t)} stroke="#e2e8f0" strokeDasharray="3 4" />
          <text x={L - 6} y={y(t) + 4} textAnchor="end" fill="#94a3b8">{Math.round(t)}{unit}</text>
        </g>
      ))}
      {band != null && <line x1={L} x2={W - R} y1={y(band)} y2={y(band)} stroke="#16a34a" strokeDasharray="6 4" strokeWidth="1.5" />}
      <path d={area} fill={color} opacity=".08" />
      <path d={line} fill="none" stroke={color} strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
      {pts.map((d, i) => (
        <circle key={d.date} cx={x(i)} cy={y(d.value)} r="3.5" fill="#fff" stroke={color} strokeWidth="2">
          <title>{`${fmtDay(d.date)}: ${d.value}${unit}`}</title>
        </circle>
      ))}
      <text x={W - R} y={H - 6} textAnchor="end" fill="#64748b">{fmtDay(pts[0].date)}</text>
      <text x={L} y={H - 6} textAnchor="start" fill="#64748b">{fmtDay(pts[pts.length - 1].date)}</text>
    </svg>
  );
}

/* ============================================================
   أجزاء الواجهة
============================================================ */
function Delta({ cur, prev, unit, higherIsBetter = true }) {
  if (cur == null || prev == null) return <span className="kp-delta mute">ما في فترة سابقة للمقارنة</span>;
  const diff = Math.round((cur - prev) * 10) / 10;
  if (diff === 0) return <span className="kp-delta mute">= نفس الفترة السابقة</span>;
  const better = higherIsBetter ? diff > 0 : diff < 0;
  return (
    <span className={`kp-delta ${better ? "up" : "down"}`}>
      {diff > 0 ? "▲" : "▼"} {Math.abs(diff)}{unit} عن الفترة السابقة
    </span>
  );
}

function KpiCard({ icon, title, value, unit, tone, sub, target, delta }) {
  const t = TONE[tone] || TONE.none;
  return (
    <div className="kp-kpi" style={{ borderColor: t.bd }}>
      <div className="kp-kpi-top">
        <span className="kp-kpi-ic" style={{ background: t.bg }}>{icon}</span>
        <span className="kp-kpi-title">{title}</span>
      </div>
      <div className="kp-kpi-val" style={{ color: t.fg }}>
        {value == null ? "—" : value}<small>{value == null ? "" : unit}</small>
      </div>
      <div className="kp-kpi-sub">{sub}</div>
      {delta}
      {target && <div className="kp-kpi-target">{target}</div>}
    </div>
  );
}

function Bar({ pct, tone }) {
  const t = TONE[tone] || TONE.none;
  return (
    <div className="kp-bar"><div style={{ width: `${Math.max(0, Math.min(100, pct || 0))}%`, background: t.fg }} /></div>
  );
}

/* ============================================================
   الصفحة
============================================================ */
export default function KPIDashboard() {
  const navigate = useNavigate();
  const today = todayDubai();

  const [preset, setPreset] = useState("7d");
  const [custom, setCustom] = useState(() => presetRange("7d", todayDubai()));
  // حقل تاريخ مفضّى بالفترة المخصصة = فترة غير صالحة، مش انهيار الصفحة.
  const isDay = (v) => /^\d{4}-\d{2}-\d{2}$/.test(v || "");
  const customOk = isDay(custom.from) && isDay(custom.to);
  const range = preset === "custom" && customOk ? custom : presetRange(preset === "custom" ? "7d" : preset, today);
  const { from, to } = range;
  const span = daysBetween(from, to) + 1;
  const prevTo = addDays(from, -1);
  const prevFrom = addDays(prevTo, -(Math.max(1, span) - 1));

  const [counts, setCounts] = useState([]);
  const [summary, setSummary] = useState([]);
  const [ships, setShips] = useState([]);
  const [coolers, setCoolers] = useState([]);
  const [returns, setReturns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [reloadKey, setReloadKey] = useState(0);

  const [tab, setTab] = useState("ships");
  const [loads, setLoads] = useState(null); // null = لسا ما انطلب

  const validRange = (preset !== "custom" || customOk) && from <= to && span <= 180;

  /* ── الطلبات الأساسية: 5 طلبات محدودة بالفترة ── */
  useEffect(() => {
    if (!validRange) return undefined;
    let alive = true;
    (async () => {
      setLoading(true); setError("");
      const end = to > today ? to : today; // نقاط «اليوم» بجدول الفروع دايماً
      const shipTo = addDays(to, 1);       // الشحنات بتحفظ طابع زمني كامل
      const results = await Promise.allSettled([
        fetchDailyCounts(prevFrom, end),
        getRows(`${API_BASE}/api/reports/summary`),
        getRows(rangeUrl("qcs_raw_material", prevFrom, shipTo)),
        getRows(rangeUrl("qcs-coolers", prevFrom, to)),
        getRows(rangeUrl("returns", prevFrom, to)),
      ]);
      if (!alive) return;
      const val = (i) => (results[i].status === "fulfilled" ? results[i].value : []);
      setCounts(val(0));
      setSummary(val(1));
      setShips(val(2).map(normShip).filter((s) => s.day >= prevFrom && s.day <= to));
      setCoolers(val(3));
      setReturns(val(4));
      const failed = results.filter((r) => r.status === "rejected").length;
      if (failed) setError(failed === results.length
        ? "تعذّر الاتصال بالسيرفر — تحقق من الإنترنت وجرّب «تحديث»."
        : "بعض البيانات ما وصلت — الأرقام الناقصة ظاهرة كـ «—».");
      setLoading(false);
    })();
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [from, to, reloadKey]);

  /* تحميل السيارات — بس لما ينفتح تبويبه */
  useEffect(() => { setLoads(null); }, [from, to, reloadKey]);
  useEffect(() => {
    if (tab !== "loading" || loads !== null || !validRange) return undefined;
    let alive = true;
    getRows(rangeUrl("cars_loading_inspection", from, to))
      .then((rows) => { if (alive) setLoads(rows.flatMap(loadingRows)); })
      .catch(() => { if (alive) setLoads([]); });
    return () => { alive = false; };
  }, [tab, loads, from, to, validRange]);

  /* ── الالتزام بالسجلات اليومية ── */
  const doneSet = useMemo(() => new Set(counts.filter((r) => r.n > 0).map((r) => `${r.type}|${String(r.day).slice(0, 10)}`)), [counts]);
  const lastByType = useMemo(() => {
    const m = {};
    summary.forEach((r) => { m[r.type] = r.latest_date ? String(r.latest_date).slice(0, 10) : ""; });
    return m;
  }, [summary]);

  // اليوم ما بيدخل بالنسبة إلا إذا الفترة هي اليوم نفسه — يوم ما خلص بيظلم النسبة.
  const scoreDays = (a, b) => eachDay(a, b).filter((d) => d < today || (a === today && b === today));
  const curDays = useMemo(() => scoreDays(from, to), [from, to, today]); // eslint-disable-line react-hooks/exhaustive-deps
  const prevDays = useMemo(() => scoreDays(prevFrom, prevTo), [prevFrom, prevTo, today]); // eslint-disable-line react-hooks/exhaustive-deps

  const branchRows = useMemo(() => DAILY_LOGS.map((b) => {
    const last = b.types.map(([t]) => lastByType[t] || "").sort().pop() || "";
    // الملخّص ما وصل؟ منعامل الكل كنشط بدل ما نخفي كل الفروع.
    const inactive = summary.length > 0 && (!last || daysBetween(last, today) > INACTIVE_AFTER_DAYS);
    const cur = complianceOf(b, doneSet, curDays);
    const prev = complianceOf(b, doneSet, prevDays);
    const todayState = b.types.map(([t, kind]) => ({ kind, done: doneSet.has(`${t}|${today}`) }));
    return { ...b, last, inactive, cur, prev, todayState };
  }), [doneSet, lastByType, summary.length, curDays, prevDays, today]);

  const active = branchRows.filter((b) => !b.inactive);
  const sumC = (key) => active.reduce((a, b) => ({ done: a.done + b[key].done, expected: a.expected + b[key].expected }), { done: 0, expected: 0 });
  const compCur = sumC("cur");
  const compPrev = sumC("prev");
  const compPct = compCur.expected ? Math.round((compCur.done / compCur.expected) * 100) : null;
  const compPrevPct = compPrev.expected ? Math.round((compPrev.done / compPrev.expected) * 100) : null;

  const compTrend = useMemo(() => curDays.map((d) => {
    let done = 0, exp = 0;
    active.forEach((b) => b.types.forEach(([t]) => { exp += 1; if (doneSet.has(`${t}|${d}`)) done += 1; }));
    return { date: d, value: exp ? Math.round((done / exp) * 100) : NaN };
  }), [curDays, active, doneSet]);

  /* ── الشحنات ── */
  const inCur = (d) => d >= from && d <= to;
  const inPrev = (d) => d >= prevFrom && d <= prevTo;
  const shipCur = ships.filter((s) => inCur(s.day));
  const shipPrev = ships.filter((s) => inPrev(s.day));
  const shipStats = (list) => {
    const rated = list.filter((s) => s.status);
    const ok = rated.filter((s) => s.status === "ok").length;
    return { total: list.length, rated: rated.length, ok, pct: rated.length ? Math.round((ok / rated.length) * 100) : null };
  };
  const sCur = shipStats(shipCur);
  const sPrev = shipStats(shipPrev);
  const shipIssues = shipCur.filter((s) => s.status === "avg" || s.status === "bad")
    .sort((a, b) => (a.status === b.status ? b.day.localeCompare(a.day) : a.status === "bad" ? -1 : 1));
  const shipTrend = useMemo(() => {
    const m = new Map();
    shipCur.forEach((s) => {
      if (!s.status) return;
      const c = m.get(s.day) || { ok: 0, n: 0 };
      c.n += 1; if (s.status === "ok") c.ok += 1;
      m.set(s.day, c);
    });
    return [...m.entries()].sort((a, b) => a[0].localeCompare(b[0])).map(([date, c]) => ({ date, value: Math.round((c.ok / c.n) * 100) }));
  }, [shipCur]); // eslint-disable-line react-hooks/exhaustive-deps

  /* ── البرادات ── */
  const readCur = useMemo(() => coolers.filter((r) => inCur(dayOf(r))).flatMap((r) => coolerReadings(r).map((x) => ({ ...x, day: dayOf(r) }))), [coolers, from, to]); // eslint-disable-line react-hooks/exhaustive-deps
  const readPrev = useMemo(() => coolers.filter((r) => inPrev(dayOf(r))).flatMap(coolerReadings), [coolers, prevFrom, prevTo]); // eslint-disable-line react-hooks/exhaustive-deps
  const outCur = readCur.filter((r) => !r.ok).length;
  const outPrev = readPrev.filter((r) => !r.ok).length;
  const unitRows = useMemo(() => {
    const m = new Map();
    readCur.forEach((r) => {
      const u = m.get(r.unit) || { unit: r.unit, def: r.def, n: 0, out: 0, min: Infinity, max: -Infinity, lastOut: null };
      u.n += 1; u.min = Math.min(u.min, r.value); u.max = Math.max(u.max, r.value);
      if (!r.ok) { u.out += 1; if (!u.lastOut || r.day > u.lastOut.day) u.lastOut = r; }
      m.set(r.unit, u);
    });
    return [...m.values()].sort((a, b) => b.out - a.out);
  }, [readCur]);
  const tempTone = !readCur.length ? "none" : outCur === 0 ? "good" : outCur / readCur.length <= 0.02 ? "warn" : "bad";

  /* ── المرتجعات ── */
  const retCur = useMemo(() => returns.filter((r) => inCur(dayOf(r))).flatMap(returnItems), [returns, from, to]); // eslint-disable-line react-hooks/exhaustive-deps
  const retPrev = useMemo(() => returns.filter((r) => inPrev(dayOf(r))).flatMap(returnItems), [returns, prevFrom, prevTo]); // eslint-disable-line react-hooks/exhaustive-deps
  const retTone = !retPrev.length ? "none" : retCur.length > retPrev.length * 1.2 ? "warn" : "good";

  /* ── بحاجة لانتباهك ── */
  const attention = useMemo(() => {
    const out = [];
    active.forEach((b) => {
      if (b.cur.pct != null && b.cur.pct < TARGET.compliance.warn) {
        out.push({ tone: "bad", text: `${b.name}: التزام ${b.cur.pct}٪ بالسجلات اليومية — ناقص ${b.cur.expected - b.cur.done} سجل بالفترة.` });
      }
    });
    const hourDubai = Number(new Date().toLocaleString("en-GB", { timeZone: "Asia/Dubai", hour: "2-digit", hour12: false }));
    if (hourDubai >= 12) {
      active.forEach((b) => {
        const missing = b.todayState.filter((s) => !s.done).map((s) => KIND_LABEL[s.kind]);
        if (missing.length) out.push({ tone: "warn", text: `${b.name}: ما انسلّم اليوم — ${missing.join("، ")}.` });
      });
    }
    unitRows.filter((u) => u.out > 0).slice(0, 4).forEach((u) => {
      out.push({
        tone: "bad",
        text: `${u.unit}: ${u.out} قراءة خارج الحد (${rangeLabel(u.def)})${u.lastOut ? ` — آخرها ${u.lastOut.value}° يوم ${fmtDay(u.lastOut.day)}` : ""}.`,
      });
    });
    shipIssues.filter((s) => s.status === "bad").slice(0, 3).forEach((s) => {
      out.push({ tone: "bad", text: `شحنة تحت الوسط: ${s.name} — ${s.supplier} (${fmtDay(s.day)}).` });
    });
    return out;
  }, [active, unitRows, shipIssues]);

  const inactive = branchRows.filter((b) => b.inactive);

  /* ============================================================
     العرض
  ============================================================ */
  const compTone = toneByTarget(compPct, TARGET.compliance);
  const shipTone = toneByTarget(sCur.pct, TARGET.shipments);

  return (
    <div className="kp kp" dir="rtl">
      <style>{CSS}</style>

      <header className="kp-head">
        <div>
          <h1 className="kp-h1">📈 مؤشرات الأداء</h1>
          <p className="kp-hsub">التزام الفروع وسلامة الغذاء · {fmtRange(from, to)}</p>
        </div>
        <div className="kp-head-actions">
          <button type="button" className="kp-btn" onClick={() => { memo.clear(); setReloadKey((k) => k + 1); }} disabled={loading}>
            {loading ? "⏳ جاري التحميل…" : "🔄 تحديث"}
          </button>
          <button type="button" className="kp-btn" onClick={() => navigate("/named-dashboard")}>🏠 الرئيسية</button>
        </div>
      </header>

      <section className="kp-period">
        <div className="kp-chips">
          {PRESETS.map(([k, label]) => (
            <button key={k} type="button" className={`kp-chip ${preset === k ? "on" : ""}`} onClick={() => setPreset(k)}>{label}</button>
          ))}
          <button type="button" className={`kp-chip ${preset === "custom" ? "on" : ""}`} onClick={() => { setCustom(range); setPreset("custom"); }}>📅 فترة مخصصة</button>
        </div>
        {preset === "custom" && (
          <div className="kp-custom">
            <label>من <input type="date" value={custom.from} max={today} onChange={(e) => setCustom((c) => ({ ...c, from: e.target.value }))} /></label>
            <label>إلى <input type="date" value={custom.to} max={today} onChange={(e) => setCustom((c) => ({ ...c, to: e.target.value }))} /></label>
            {!validRange && <span className="kp-err-inline">اختار فترة صحيحة (لحد 180 يوم).</span>}
          </div>
        )}
        <div className="kp-compare">مقارنة مع الفترة السابقة: {fmtRange(prevFrom, prevTo)}</div>
      </section>

      {error && <div className="kp-alert">{error}</div>}

      {/* ── المؤشرات الأربعة ── */}
      <section className="kp-kpis">
        <KpiCard
          icon="🗂️" title="التزام الفروع بالسجلات اليومية"
          value={compPct} unit="٪" tone={compTone}
          sub={compCur.expected ? `${compCur.done} من ${compCur.expected} سجل · ${active.length} فروع` : "ما في أيام مكتملة بهالفترة بعد"}
          target={`الهدف ${TARGET.compliance.good}٪ فأكثر · الحرارة والنظافة الشخصية والنظافة اليومية`}
          delta={<Delta cur={compPct} prev={compPrevPct} unit=" نقطة" />}
        />
        <KpiCard
          icon="📦" title="الشحنات المقبولة"
          value={sCur.pct} unit="٪" tone={shipTone}
          sub={sCur.total ? `${sCur.ok} من ${sCur.rated} شحنة مقبولة · ${shipIssues.length} وسط أو أقل` : "ما في شحنات بهالفترة"}
          target={`الهدف ${TARGET.shipments.good}٪ فأكثر`}
          delta={<Delta cur={sCur.pct} prev={sPrev.pct} unit=" نقطة" />}
        />
        <KpiCard
          icon="🌡️" title="قراءات حرارة خارج الحد (QCS)"
          value={readCur.length ? outCur : null} unit="" tone={tempTone}
          sub={readCur.length ? `من ${readCur.length} قراءة · كل وحدة على حدودها` : "ما في قراءات بهالفترة"}
          target="الهدف صفر"
          delta={<Delta cur={readCur.length ? outCur : null} prev={readPrev.length ? outPrev : null} unit="" higherIsBetter={false} />}
        />
        <KpiCard
          icon="♻️" title="أصناف مرتجعة من الفروع"
          value={returns.length || retCur.length ? retCur.length : null} unit="" tone={retTone}
          sub={retCur.length ? `أكثر إجراء: ${topCounts(retCur, "action", 1)[0]?.[0] || "—"}` : "ما في مرتجعات بهالفترة"}
          target="كل ما قلّ كان أحسن"
          delta={<Delta cur={retCur.length} prev={returns.length ? retPrev.length : null} unit="" higherIsBetter={false} />}
        />
      </section>

      {/* ── بحاجة لانتباهك ── */}
      <section className="kp-card">
        <h2 className="kp-h2">⚠️ بحاجة لانتباهك</h2>
        {loading ? <div className="kp-empty">جاري التحميل…</div> : attention.length === 0 ? (
          <div className="kp-ok">✅ ما في شي بيحتاج متابعة بهالفترة.</div>
        ) : (
          <ul className="kp-att">
            {attention.map((a, i) => (
              <li key={i} style={{ background: TONE[a.tone].bg, borderColor: TONE[a.tone].bd, color: TONE[a.tone].fg }}>{a.text}</li>
            ))}
          </ul>
        )}
      </section>

      {/* ── جدول الفروع ── */}
      <section className="kp-card">
        <h2 className="kp-h2">🏪 الفروع</h2>
        <p className="kp-note">نسبة السجلات اليومية اللي انسلّمت بالفترة، وحالة سجلات اليوم.</p>
        <div className="kp-tablewrap">
          <table className="kp-table">
            <thead>
              <tr><th>الفرع</th><th>الالتزام بالفترة</th><th>مقابل السابقة</th><th>سجلات اليوم</th><th>آخر سجل</th></tr>
            </thead>
            <tbody>
              {active.map((b) => {
                const tone = toneByTarget(b.cur.pct, TARGET.compliance);
                return (
                  <tr key={b.id}>
                    <td><span className="kp-dot" style={{ background: b.accent }} />{b.name}</td>
                    <td>
                      <div className="kp-comp">
                        <Bar pct={b.cur.pct} tone={tone} />
                        <b style={{ color: TONE[tone].fg }}>{b.cur.pct == null ? "—" : `${b.cur.pct}٪`}</b>
                        <span className="kp-mute">{b.cur.done}/{b.cur.expected}</span>
                      </div>
                    </td>
                    <td><Delta cur={b.cur.pct} prev={b.prev.pct} unit="" /></td>
                    <td>
                      <div className="kp-today">
                        {b.todayState.map((s) => (
                          <span key={s.kind} className={`kp-pill ${s.done ? "ok" : "no"}`}>{s.done ? "✓" : "✗"} {KIND_LABEL[s.kind]}</span>
                        ))}
                      </div>
                    </td>
                    <td>{fmtDay(b.last)}</td>
                  </tr>
                );
              })}
              {inactive.map((b) => (
                <tr key={b.id} className="kp-off">
                  <td><span className="kp-dot" style={{ background: "#cbd5e1" }} />{b.name}</td>
                  <td colSpan={3}>متوقف — ما في سجلات يومية من أكتر من {INACTIVE_AFTER_DAYS} يوم (ما بيدخل بالنسبة)</td>
                  <td>{fmtDay(b.last)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* ── الاتجاهات ── */}
      <section className="kp-two">
        <div className="kp-card">
          <h2 className="kp-h2">📅 الالتزام يوم بيوم</h2>
          <p className="kp-note">الخط الأخضر المتقطع = الهدف {TARGET.compliance.good}٪</p>
          <LineChart data={compTrend} color="#2563eb" unit="%" band={TARGET.compliance.good} />
        </div>
        <div className="kp-card">
          <h2 className="kp-h2">📦 الشحنات المقبولة يوم بيوم</h2>
          <p className="kp-note">الخط الأخضر المتقطع = الهدف {TARGET.shipments.good}٪</p>
          <LineChart data={shipTrend} color="#0d9488" unit="%" band={TARGET.shipments.good} />
        </div>
      </section>

      {/* ── التفاصيل ── */}
      <section className="kp-card">
        <div className="kp-tabs">
          {[["ships", "📦 الشحنات"], ["coolers", "🌡️ البرادات"], ["returns", "♻️ المرتجعات"], ["loading", "🚚 تحميل السيارات"]].map(([k, label]) => (
            <button key={k} type="button" className={`kp-tab ${tab === k ? "on" : ""}`} onClick={() => setTab(k)}>{label}</button>
          ))}
        </div>

        {tab === "ships" && (
          <>
            <p className="kp-note">{sCur.total} شحنة بالفترة · حسب النوع: {topCounts(shipCur, "kind", 6).map(([k, n]) => `${k} (${n})`).join(" · ") || "—"}</p>
            {shipIssues.length === 0 ? <div className="kp-ok">✅ كل الشحنات المقيّمة بهالفترة مقبولة.</div> : (
              <div className="kp-tablewrap">
                <table className="kp-table">
                  <thead><tr><th>التاريخ</th><th>المنتج</th><th>المورد / الفرع</th><th>النوع</th><th>التقييم</th><th>ملاحظات</th></tr></thead>
                  <tbody>
                    {shipIssues.map((s, i) => (
                      <tr key={s.id || i}>
                        <td>{fmtDay(s.day)}</td><td>{s.name}</td><td>{s.supplier}</td><td>{s.kind}</td>
                        <td><span className={`kp-pill ${s.status === "bad" ? "no" : "mid"}`}>{s.status === "bad" ? "تحت الوسط" : "وسط"}</span></td>
                        <td>{s.remarks || "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}

        {tab === "coolers" && (
          unitRows.length === 0 ? <div className="kp-empty">ما في قراءات برادات بهالفترة.</div> : (
            <div className="kp-tablewrap">
              <table className="kp-table">
                <thead><tr><th>الوحدة</th><th>الحد المسموح</th><th>القراءات</th><th>خارج الحد</th><th>أدنى · أعلى قراءة</th></tr></thead>
                <tbody>
                  {unitRows.map((u) => (
                    <tr key={u.unit}>
                      <td>{u.unit}</td>
                      <td>{rangeLabel(u.def)}</td>
                      <td>{u.n}</td>
                      <td><span className={`kp-pill ${u.out ? "no" : "ok"}`}>{u.out}</span></td>
                      <td>{u.min}° · {u.max}°</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        )}

        {tab === "returns" && (
          retCur.length === 0 ? <div className="kp-empty">ما في مرتجعات بهالفترة.</div> : (
            <div className="kp-three">
              {[["branch", "أكثر الفروع"], ["action", "الإجراءات"], ["product", "أكثر الأصناف"]].map(([key, title]) => (
                <div key={key} className="kp-mini">
                  <h3 className="kp-h3">{title}</h3>
                  {topCounts(retCur, key, 6).map(([label, n]) => {
                    const max = topCounts(retCur, key, 1)[0][1];
                    return (
                      <div key={label} className="kp-rank">
                        <span className="kp-rank-l" title={label}>{label}</span>
                        <div className="kp-bar"><div style={{ width: `${(n / max) * 100}%`, background: "#2563eb" }} /></div>
                        <b>{n}</b>
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          )
        )}

        {tab === "loading" && (() => {
          if (loads === null) return <div className="kp-empty">جاري التحميل…</div>;
          if (!loads.length) return <div className="kp-empty">ما في تقارير تحميل بهالفترة.</div>;
          const durs = loads.map((r) => {
            const s = toMinutes(r.timeStart), e = toMinutes(r.timeEnd);
            return s != null && e != null && e >= s ? e - s : null;
          }).filter((v) => v != null);
          const temps = loads.map((r) => Number(r.tempCheck)).filter((v, i) => loads[i].tempCheck !== "" && Number.isFinite(v));
          let yes = 0, tot = 0;
          loads.forEach((r) => {
            VI_POSITIVE.forEach((k) => { if (r[k] === "yes" || r[k] === "no") { tot += 1; if (r[k] === "yes") yes += 1; } });
            VI_NEGATIVE.forEach((k) => { if (r[k] === "yes" || r[k] === "no") { tot += 1; if (r[k] === "no") yes += 1; } });
          });
          const vi = tot ? Math.round((yes / tot) * 100) : null;
          return (
            <div className="kp-stats">
              <div><span>سيارات انحمّلت</span><b>{loads.length}</b></div>
              <div><span>متوسط زمن التحميل</span><b>{durs.length ? Math.round(durs.reduce((a, b) => a + b, 0) / durs.length) : "—"} دقيقة</b></div>
              <div><span>متوسط حرارة المنتج عند التحميل</span><b>{temps.length ? (temps.reduce((a, b) => a + b, 0) / temps.length).toFixed(1) : "—"}°</b></div>
              <div><span>بنود الفحص البصري السليمة</span><b style={{ color: TONE[toneByTarget(vi, { good: 95, warn: 80 })].fg }}>{vi == null ? "—" : `${vi}٪`}</b></div>
            </div>
          );
        })()}
      </section>
    </div>
  );
}

/* ============================================================
   الأنماط — globals.css بيفرض حجم الخط على كل #root بـ !important،
   فالأحجام هون بصنف مضاعف (.kp.kp) وبتلحق زر تكبير الخط (--app-fs).
============================================================ */
const fs = (px) => `calc(${px}px * var(--app-fs, 1)) !important`;
const CSS = `
#root .kp.kp { min-height:100vh; box-sizing:border-box; padding:16px clamp(12px,2vw,28px) 40px; color:#0f172a;
  background:linear-gradient(180deg,#f3f8ff 0%,#f6fafd 100%); display:flex; flex-direction:column; gap:14px; }
#root .kp.kp * { box-sizing:border-box; }
#root .kp.kp .kp-head { display:flex; align-items:center; justify-content:space-between; gap:12px; flex-wrap:wrap;
  background:#fff; border:1px solid #dde7f1; border-radius:16px; padding:14px 18px; }
#root .kp.kp .kp-h1 { margin:0; font-size:${fs(24)}; font-weight:900; }
#root .kp.kp .kp-hsub { margin:4px 0 0; font-size:${fs(14)}; font-weight:700; color:#64748b; }
#root .kp.kp .kp-head-actions { display:flex; gap:8px; flex-wrap:wrap; }
#root .kp.kp .kp-btn { font-size:${fs(14)}; font-weight:800; font-family:inherit; cursor:pointer; padding:9px 14px; border-radius:10px;
  border:1px solid #dbe7f3; background:#f8fbff; color:#1e293b; }
#root .kp.kp .kp-btn:hover:not(:disabled) { background:#eaf3ff; border-color:#bfdbfe; }
#root .kp.kp .kp-btn:disabled { opacity:.6; cursor:wait; }

#root .kp.kp .kp-period { background:#fff; border:1px solid #dde7f1; border-radius:16px; padding:12px 16px; display:flex; flex-direction:column; gap:10px; }
#root .kp.kp .kp-chips { display:flex; gap:8px; flex-wrap:wrap; }
#root .kp.kp .kp-chip { font-size:${fs(14)}; font-weight:800; font-family:inherit; cursor:pointer; padding:8px 14px; border-radius:999px;
  border:1px solid #dbe7f3; background:#fff; color:#334155; }
#root .kp.kp .kp-chip.on { background:#2563eb; border-color:#2563eb; color:#fff; }
#root .kp.kp .kp-custom { display:flex; gap:14px; align-items:center; flex-wrap:wrap; font-size:${fs(14)}; font-weight:700; color:#475569; }
#root .kp.kp .kp-custom input { margin-inline-start:6px; padding:7px 10px; border:1px solid #dbe7f3; border-radius:8px; font-size:${fs(14)}; font-family:inherit; }
#root .kp.kp .kp-compare { font-size:${fs(13)}; font-weight:700; color:#64748b; }
#root .kp.kp .kp-err-inline { color:#b91c1c; font-size:${fs(13)}; font-weight:800; }
#root .kp.kp .kp-alert { background:#fffbeb; border:1px solid #fde68a; color:#92400e; border-radius:12px; padding:10px 14px; font-size:${fs(14)}; font-weight:800; }

#root .kp.kp .kp-kpis { display:grid; grid-template-columns:repeat(auto-fit,minmax(240px,1fr)); gap:14px; }
#root .kp.kp .kp-kpi { background:#fff; border:1.5px solid #e2e8f0; border-radius:16px; padding:16px 18px; display:flex; flex-direction:column; gap:6px; }
#root .kp.kp .kp-kpi-top { display:flex; align-items:center; gap:10px; }
#root .kp.kp .kp-kpi-ic { width:40px; height:40px; border-radius:12px; display:grid; place-items:center; font-size:${fs(20)}; flex-shrink:0; }
#root .kp.kp .kp-kpi-title { font-size:${fs(15)}; font-weight:900; color:#334155; line-height:1.3; }
#root .kp.kp .kp-kpi-val { font-size:${fs(40)}; font-weight:900; line-height:1.05; margin-top:4px; font-variant-numeric:tabular-nums; }
#root .kp.kp .kp-kpi-val small { font-size:${fs(22)}; font-weight:900; margin-inline-start:2px; }
#root .kp.kp .kp-kpi-sub { font-size:${fs(13.5)}; font-weight:700; color:#475569; }
#root .kp.kp .kp-kpi-target { font-size:${fs(12)}; font-weight:700; color:#94a3b8; border-top:1px dashed #e2e8f0; padding-top:6px; margin-top:2px; }
#root .kp.kp .kp-delta { font-size:${fs(13)}; font-weight:800; }
#root .kp.kp .kp-delta.up { color:#047857; }
#root .kp.kp .kp-delta.down { color:#b91c1c; }
#root .kp.kp .kp-delta.mute { color:#94a3b8; }

#root .kp.kp .kp-card { background:#fff; border:1px solid #dde7f1; border-radius:16px; padding:16px 18px; min-width:0; }
#root .kp.kp .kp-h2 { margin:0 0 4px; font-size:${fs(18)}; font-weight:900; }
#root .kp.kp .kp-h3 { margin:0 0 8px; font-size:${fs(15)}; font-weight:900; color:#334155; }
#root .kp.kp .kp-note { margin:0 0 10px; font-size:${fs(13)}; font-weight:700; color:#64748b; }
#root .kp.kp .kp-empty { padding:24px; text-align:center; color:#94a3b8; font-size:${fs(14)}; font-weight:700; }
#root .kp.kp .kp-ok { padding:14px; border-radius:12px; background:#ecfdf5; color:#047857; font-size:${fs(14)}; font-weight:800; }
#root .kp.kp .kp-att { list-style:none; margin:8px 0 0; padding:0; display:flex; flex-direction:column; gap:8px; }
#root .kp.kp .kp-att li { border:1px solid; border-radius:10px; padding:9px 12px; font-size:${fs(14)}; font-weight:800; }

#root .kp.kp .kp-tablewrap { overflow-x:auto; }
#root .kp.kp .kp-table { width:100%; border-collapse:collapse; min-width:640px; }
#root .kp.kp .kp-table th { text-align:start; font-size:${fs(13)}; font-weight:900; color:#64748b; padding:10px; border-bottom:2px solid #e2e8f0; background:#f8fafc; white-space:nowrap; }
#root .kp.kp .kp-table td { font-size:${fs(14)}; font-weight:700; padding:10px; border-bottom:1px solid #f1f5f9; vertical-align:middle; }
#root .kp.kp .kp-table tr.kp-off td { color:#94a3b8; }
#root .kp.kp .kp-dot { display:inline-block; width:10px; height:10px; border-radius:50%; margin-inline-end:8px; }
#root .kp.kp .kp-comp { display:flex; align-items:center; gap:10px; min-width:220px; }
#root .kp.kp .kp-comp b { font-size:${fs(15)}; min-width:44px; }
#root .kp.kp .kp-mute { color:#94a3b8; font-size:${fs(12.5)}; }
#root .kp.kp .kp-bar { flex:1; height:10px; background:#eef2f7; border-radius:999px; overflow:hidden; min-width:60px; }
#root .kp.kp .kp-bar > div { height:100%; border-radius:999px; transition:width .4s ease; }
#root .kp.kp .kp-today { display:flex; gap:6px; flex-wrap:wrap; }
#root .kp.kp .kp-pill { display:inline-block; font-size:${fs(12.5)}; font-weight:800; padding:3px 9px; border-radius:999px; white-space:nowrap; }
#root .kp.kp .kp-pill.ok { background:#ecfdf5; color:#047857; }
#root .kp.kp .kp-pill.no { background:#fef2f2; color:#b91c1c; }
#root .kp.kp .kp-pill.mid { background:#fffbeb; color:#b45309; }

#root .kp.kp .kp-two { display:grid; grid-template-columns:repeat(auto-fit,minmax(min(100%,420px),1fr)); gap:14px; }
#root .kp.kp .kp-svg { width:100%; height:auto; display:block; }
#root .kp.kp .kp-svg text { font-size:11px !important; font-weight:700; font-family:inherit; }

#root .kp.kp .kp-tabs { display:flex; gap:6px; flex-wrap:wrap; border-bottom:1px solid #e2e8f0; margin-bottom:12px; padding-bottom:8px; }
#root .kp.kp .kp-tab { font-size:${fs(14)}; font-weight:800; font-family:inherit; cursor:pointer; padding:8px 14px; border-radius:10px; border:none; background:transparent; color:#475569; }
#root .kp.kp .kp-tab.on { background:#eaf3ff; color:#1d4ed8; }
#root .kp.kp .kp-three { display:grid; grid-template-columns:repeat(auto-fit,minmax(240px,1fr)); gap:14px; }
#root .kp.kp .kp-mini { border:1px solid #eef2f7; border-radius:12px; padding:12px; }
#root .kp.kp .kp-rank { display:grid; grid-template-columns:minmax(0,1.3fr) 1fr auto; align-items:center; gap:8px; margin-bottom:7px; }
#root .kp.kp .kp-rank-l { font-size:${fs(13)}; font-weight:700; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
#root .kp.kp .kp-rank b { font-size:${fs(13)}; }
#root .kp.kp .kp-stats { display:grid; grid-template-columns:repeat(auto-fit,minmax(200px,1fr)); gap:12px; }
#root .kp.kp .kp-stats > div { background:#f8fafc; border:1px solid #eef2f7; border-radius:12px; padding:12px 14px; display:flex; flex-direction:column; gap:4px; }
#root .kp.kp .kp-stats span { font-size:${fs(13)}; font-weight:700; color:#64748b; }
#root .kp.kp .kp-stats b { font-size:${fs(22)}; font-weight:900; }
`;
