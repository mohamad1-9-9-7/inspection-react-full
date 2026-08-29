// src/pages/butcher/ButcherSupervisor.jsx
//
// لوحة المشرف — كروت الجزارين الفعليين مع فلاتر، وشو اشتغل كل واحد، وقبول تقاريره.
// Supervisor board: butcher cards, filters, per-report acceptance.
//
// ⛔ ما في «رفض»: بعد ما تنقطّع الذبيحة ما بيرجع الرفض يفيد بشي — القرار الوحيد
// هو القبول. القبول نوعان: عادي (ضمن النسبة المعيارية) أو **مع توضيح** لما
// النسبة الفعلية تطلع خارج التسامح — والتوضيح إلزامي وبينحفظ مع المراجعة.
//
// حالة المراجعة تُحفظ داخل payload.review للسجل نفسه:
//   review = { status: "approved", by, at, reason, override, deviations, tolPct }
// غياب review = بانتظار المراجعة. (status: "rejected" ممكن يكون بسجلات قديمة —
// منعرضه ولا منولّده.)
//
// ملاحظة تقنية: butcher_cut_log نوع متعدّد السجلات باليوم، فالتحديث لازم يكون
// على PATCH /api/reports/:id (لا PUT العام الذي يدهس حسب (type, reportDate)).

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import API_BASE from "../../config/api";
import { BRANCHES, TYPE, nameOf } from "./butcherOptions";
import { butcherLabel, useButcherConfig } from "./butcherConfig";
import { useMrpConfig } from "./butcherMrpBridge";
import {
  CR_ACTIONS, CR_KINDS, CR_STATUS, canSeeRow, crHistory, crStatusText,
  downloadExcel, isCancelled, isHidden, isQuarantined, normalizeRecord,
} from "./butcherReportKit";
import { useRowViewer } from "./butcherViewer";
import CuttingCard, { CARD_CSS, CuttingCardPrint } from "./ButcherCuttingCard";
import {
  fetchPlans, fetchTodayProgressByBranch, progressPct, savePlan,
} from "./butcherDayPlan";
import { useSettingsLang, LangToggle } from "../settings/_shared/settingsI18n";
import { canOpenButcherPage, NoAccess } from "./ButcherAccess";
import { can, getCurrentUser } from "../../utils/perms";
// 👥 القوى العاملة — نطاق المشرف: ملاحمه هو وبس (كل الجواب بـuseRowViewer).
import { siteLabel } from "../workforce/workforceConfig";

const CSS = `
/* ── الخطوط: شاشة بتتقرا من بعيد بالملحمة، فالأساس أكبر من الافتراضي ── */
#root .bs, #root .bs * { font-size: 17px !important; }
#root .bs-title  { font-size: 30px !important; }
#root .bs-sub    { font-size: 15px !important; }
#root .bs-kpi    { font-size: 30px !important; }
#root .bs-name   { font-size: 20px !important; }
#root .bs-cname  { font-size: 18px !important; line-height: 1.35 !important; }
#root .bs-stat   { font-size: 20px !important; }
#root .bs-chip   { font-size: 13px !important; }
#root .bs-small  { font-size: 13.5px !important; }
@media (max-width: 1100px) {
  #root .bs, #root .bs * { font-size: 16px !important; }
  #root .bs-title { font-size: 25px !important; }
  #root .bs-kpi   { font-size: 26px !important; }
  #root .bs-name  { font-size: 19px !important; }
}
@media (max-width: 820px) {
  #root .bs, #root .bs * { font-size: 15px !important; }
  #root .bs-title { font-size: 22px !important; }
  #root .bs-kpi   { font-size: 24px !important; }
  #root .bs-cname { font-size: 16px !important; }
  #root .bs-stat  { font-size: 18px !important; }
}

/* ── الهيكل ── */
#root .bs-shell { max-width: 1440px; margin: 0 auto; display: flex; flex-direction: column; gap: 14px; }
#root .bs-panel {
  background: #fff; border: 1px solid #dbe6f2; border-radius: 18px; padding: 16px;
  box-shadow: 0 8px 24px rgba(15,39,64,.05);
}
#root .bs-panel-head {
  display: flex; align-items: flex-start; justify-content: space-between;
  gap: 12px; flex-wrap: wrap; margin-bottom: 12px;
}
#root .bs-acts { display: flex; gap: 8px; flex-wrap: wrap; align-items: center; }

/* ── الترويسة ── */
#root .bs-hero {
  border-radius: 22px; padding: 18px 20px; color: #fff;
  background: linear-gradient(135deg,#0b3358,#1f6fd0 55%,#0f766e);
  box-shadow: 0 16px 40px rgba(11,51,88,.22);
  display: flex; align-items: center; justify-content: space-between; gap: 14px; flex-wrap: wrap;
}
#root .bs-hero .bs-sub { color: rgba(255,255,255,.86); }
#root .bs-hero-badge {
  display: inline-flex; align-items: center; gap: 7px; margin-top: 8px;
  background: rgba(255,255,255,.16); border: 1px solid rgba(255,255,255,.3);
  border-radius: 999px; padding: 4px 13px; font-weight: 800;
}
#root .bs-hbtn {
  border: 1px solid rgba(255,255,255,.4); background: rgba(255,255,255,.13); color: #fff;
  border-radius: 12px; padding: 10px 16px; font-weight: 800; font-family: inherit;
  cursor: pointer; white-space: nowrap; transition: background .15s ease;
}
#root .bs-hbtn:hover:not(:disabled) { background: rgba(255,255,255,.26); }
#root .bs-hbtn:disabled { opacity: .55; cursor: not-allowed; }
#root .bs-hbtn.solid { background: #fff; color: #14507f; border-color: #fff; }

/* ── المؤشرات ── */
#root .bs-kpis {
  display: grid; gap: 12px;
  grid-template-columns: repeat(auto-fit, minmax(min(168px,100%), 1fr));
}
#root .bs-kpi-box {
  background: #fff; border: 1px solid #dbe6f2; border-radius: 16px; padding: 14px 16px;
  display: flex; align-items: center; gap: 12px; min-width: 0;
  box-shadow: 0 8px 22px rgba(15,39,64,.05);
}
#root .bs-kpi-ic {
  width: 44px; height: 44px; border-radius: 13px; flex: 0 0 auto;
  display: grid; place-items: center; font-size: 21px !important;
}
#root .bs-kpi-txt { min-width: 0; }
#root button.bs-kpi-box { cursor: pointer; text-align: start; font-family: inherit; }
#root button.bs-kpi-box:hover { border-color: #bcd6ef; box-shadow: 0 12px 28px rgba(15,39,64,.09); }

/* ── كروت الجزارين ── */
#root .bs-cards {
  display: grid; gap: 14px;
  grid-template-columns: repeat(auto-fill, minmax(min(360px,100%), 1fr));
}
#root .bs-card {
  background: #fff; border: 1px solid #dbe6f2; border-radius: 18px; padding: 16px;
  display: flex; flex-direction: column; gap: 12px; min-width: 0;
  box-shadow: 0 8px 22px rgba(15,39,64,.05);
  transition: box-shadow .16s ease, border-color .16s ease, transform .16s ease;
}
#root .bs-card:hover { border-color: #bcd6ef; box-shadow: 0 16px 34px rgba(15,39,64,.10); transform: translateY(-2px); }
#root .bs-card.hot { border-color: #fdba74; }
#root .bs-card-head { display: flex; align-items: center; gap: 12px; min-width: 0; }
#root .bs-card-id { min-width: 0; flex: 1; }
#root .bs-card-chips { display: flex; gap: 6px; flex-wrap: wrap; }
#root .bs-card-stats { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; }
#root .bs-card-foot { display: flex; gap: 8px; flex-wrap: wrap; align-items: center; margin-top: auto; }
#root .bs-bar { display: flex; height: 9px; border-radius: 999px; overflow: hidden; background: #eef4fb; }
#root .bs-bar i { display: block; height: 100%; }

/* ── كرت الطلبات ── */
#root .bs-reqs { display: flex; flex-direction: column; gap: 10px; }
#root .bs-req {
  border: 1px solid #fed7aa; background: #fff7ed; border-radius: 16px; padding: 14px;
  display: grid; gap: 12px; grid-template-columns: minmax(0,1fr) auto; align-items: start;
}
#root .bs-req.done { border-color: #e2e8f0; background: #f8fafc; }
/* عمود قرار ضيّق: الشارة وزرّين تحت بعض. لولا الحدّ الأعلى، صف الأزرار
   بياخد نص عرض الكرت وبيضغط نصّ الطلب على عمود رفيع. */
#root .bs-req-side {
  display: flex; flex-direction: column; align-items: stretch; gap: 8px;
  min-width: 168px; max-width: 232px;
}
#root .bs-req-side > span { text-align: center; }
#root .bs-req-side > button { width: 100%; }
@media (max-width: 760px) {
  #root .bs-req { grid-template-columns: minmax(0,1fr); }
  #root .bs-req-side { flex-direction: row; flex-wrap: wrap; max-width: none; }
  #root .bs-req-side > button { width: auto; }
  #root .bs-card-stats { grid-template-columns: repeat(2, 1fr); }
}

/* ── سجل العملية ── */
#root .bs-tl { display: flex; flex-direction: column; gap: 0; margin-top: 8px; }
#root .bs-tl-item {
  display: grid; grid-template-columns: 26px minmax(0,1fr); gap: 10px;
  padding-bottom: 12px; position: relative;
}
#root .bs-tl-item:not(:last-child)::before {
  content: ""; position: absolute; inset-inline-start: 12px; top: 26px; bottom: 0;
  width: 2px; background: #e2e8f0;
}
#root .bs-tl-dot {
  width: 26px; height: 26px; border-radius: 50%; display: grid; place-items: center;
  background: #fff; border: 2px solid #e2e8f0; font-size: 12px !important; z-index: 1;
}

#root .bs-row { transition: box-shadow .16s ease, border-color .16s ease, background .16s ease; }
#root .bs-row:hover { border-color: #bcd6ef; background: #fbfdff; box-shadow: 0 12px 28px rgba(15,39,64,.09); }
@keyframes bsRise { from { opacity: 0; transform: translateY(10px) } to { opacity: 1; transform: none } }
#root .bs-rise { animation: bsRise .24s ease both; }
`;

const STATUS = {
  pending:  { ar: "بانتظار المراجعة", en: "Pending",  bg: "#fff7ed", fg: "#b45309", bd: "#fcd9a4" },
  approved: { ar: "مقبول",            en: "Approved", bg: "#ecfdf5", fg: "#047857", bd: "#a7f3d0" },
  // سجلات قديمة فقط — ما عاد في زر رفض بالنظام
  rejected: { ar: "مرفوض (قديم)",      en: "Rejected (legacy)", bg: "#fef2f2", fg: "#b91c1c", bd: "#fecaca" },
};

const todayStr = () => new Date().toISOString().slice(0, 10);

function shiftDays(days) {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString().slice(0, 10);
}

function currentUser() {
  try {
    return JSON.parse(localStorage.getItem("currentUser") || "{}");
  } catch {
    return {};
  }
}

function toArray(data) {
  return (
    (Array.isArray(data) && data) ||
    (Array.isArray(data?.data) && data.data) ||
    (Array.isArray(data?.items) && data.items) ||
    (Array.isArray(data?.reports) && data.reports) ||
    []
  );
}

const pct = (part, whole) => (whole > 0 ? (part / whole) * 100 : 0);

/** أول حرفين من الاسم — بديل الصورة الشخصية. */
function initials(name, empNo) {
  const s = String(name || "").trim();
  if (!s) return String(empNo || "?").slice(0, 2);
  const parts = s.split(/\s+/).filter(Boolean);
  return (parts[0][0] + (parts[1]?.[0] || "")).toUpperCase();
}

/* ============================ الصفحة ============================ */

export default function ButcherSupervisor() {
  const navigate = useNavigate();
  const { t, isAr, dir, lang, toggle } = useSettingsLang();
  const { cfg } = useButcherConfig();
  const { cfg: mrpCfg } = useMrpConfig({ refetchOnFocus: false });

  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState(null);

  /* الفلاتر */
  const [period, setPeriod] = useState("today");   // today | 7d | 30d | custom
  const [from, setFrom] = useState(todayStr());
  const [to, setTo] = useState(todayStr());
  const [branch, setBranch] = useState("");
  const [status, setStatus] = useState("");        // "" | pending | approved | rejected(قديم)
  const [stdOnly, setStdOnly] = useState(false);   // عرض الشغل خارج التسامح المعياري فقط
  const [crOnly, setCrOnly] = useState(false);     // الطلبات المفتوحة فقط
  const [query, setQuery] = useState("");
  const [sortKey, setSortKey] = useState("pending"); // pending | kg | count | name

  /* البطاقة المفتوحة + نافذة التوضيح */
  const [openEmp, setOpenEmp] = useState(null);
  const [justifying, setJustifying] = useState(null); // قبول استثنائي: { id, row }
  const [queue, setQueue] = useState(false);       // طابور المراجعة لكل الجزارين
  const [requesting, setRequesting] = useState(null); // رفع طلب: الصف
  const [deciding, setDeciding] = useState(null);     // قرار المسؤول: الصف
  const [focusId, setFocusId] = useState("");         // فتح عملية وحدة من كرت الطلبات
  const [scanning, setScanning] = useState(false);    // فحص شامل عن طلبات قديمة
  const [scannedAt, setScannedAt] = useState("");     // وقت آخر فحص شامل
  const [exporting, setExporting] = useState(false);

  /* ── 👥 مين عم يتفرّج؟ ───────────────────────────────────────────────
     مشرف البرشا ما إله شغل بأرقام أبوظبي. لمّا يكون الحساب مربوط بموظف من
     «القوى العاملة»، اللوحة بتنحصر بملاحمه هو — الفلترة على `branchCode`
     تبع السجل نفسه، لأن كل سجل تقطيع بيحمل ملحمته وقت التسجيل (والنقل ما
     بيعيد كتابة السجلات القديمة، فتاريخ الشغل بيضل صح).

     الأدمن ومسؤول المخزون بيشوفوا الكل، والحساب غير المربوط بيشوف الكل متل
     قبل — نفس قاعدة باقي شاشات الجزار. */
  const viewer = useRowViewer(isAr);
  const { isFull, isOfficer: officer, canRequestFor, canDecide } = viewer;

  const canReview = isFull || can("butcher", "edit") || can("butcher", "write");

  const scopeSites = viewer.siteScope;
  const scoped = scopeSites.length > 0;

  /* قائمة الملاحم بالفلتر — ملاحمه وبس لما يكون محصوراً. */
  const branchChoices = useMemo(
    () => (scoped ? BRANCHES.filter((b) => scopeSites.includes(b.code)) : BRANCHES),
    [scoped, scopeSites]
  );

  /* لو كان فلتر الملحمة على وحدة برّا نطاقه (رجوع لتبويب محفوظ مثلاً) — منفكّه. */
  useEffect(() => {
    if (scoped && branch && !scopeSites.includes(branch)) setBranch("");
  }, [scoped, scopeSites, branch]);

  /* ── تحميل السجلات ── */
  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      // نافذة الفلتر فقط — الخوادم الأقدم تتجاهل from/to وترجّع الكل، والفلترة
      // المحلية تحت تضبط النتيجة في الحالتين
      const range = [
        from ? `&from=${encodeURIComponent(from)}` : "",
        to ? `&to=${encodeURIComponent(to)}` : "",
      ].join("");
      const res = await fetch(
        `${API_BASE}/api/reports?type=${encodeURIComponent(TYPE)}&limit=5000${range}`,
        { headers: { Accept: "application/json" }, cache: "no-store" }
      );
      if (!res.ok) throw new Error(`Server ${res.status}`);
      setRecords(toArray(await res.json()));
      // تحميل جديد = نافذة جديدة، فنتيجة الفحص الشامل القديمة ما عادت تمثّلها
      setScannedAt("");
    } catch (e) {
      setError(e?.message || t({ en: "Failed to load data", ar: "تعذّر تحميل البيانات" }));
      setRecords([]);
    } finally {
      setLoading(false);
    }
  }, [t, from, to]);

  useEffect(() => { load(); }, [load]);

  /* الفترة السريعة تضبط from/to */
  useEffect(() => {
    if (period === "today") { setFrom(todayStr()); setTo(todayStr()); }
    if (period === "7d") { setFrom(shiftDays(6)); setTo(todayStr()); }
    if (period === "30d") { setFrom(shiftDays(29)); setTo(todayStr()); }
  }, [period]);

  /* ── تحويل كل سجل لشكل جاهز للعرض (نفس تطبيع عُدّة التقارير) ── */
  const entries = useMemo(
    () =>
      records.map((rec) => {
        const r = normalizeRecord(rec, { cfg, mrpCfg, isAr });
        return {
          ...r,
          empNo: r.employeeNoRaw,
          butcherJob: r.payload.butcherJob || "",
          // اسم مختصر للسياق: الوصفة أو المادة الخام
          productsKg: r.cutsKg,
          reviewStatus: r.reviewStatus || "pending",
        };
      }),
    [records, cfg, mrpCfg, isAr]
  );

  /* ── تطبيق الفلاتر ── */
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return entries.filter((e) => {
      // نطاق الحساب أولاً — قبل أي فلتر بيقدر المستخدم يفكّه من الشاشة.
      if (scoped && !scopeSites.includes(e.branchCode)) return false;
      /* المحجور (طلب مرفوع) بيبيّن لمشرف ملحمته وللمسؤول وبس؛ الملغى نهائياً
         للمسؤول والأدمن وبس. غيرهم ما بيشوفوا ولا واحد منهم. */
      if (!canSeeRow(e, viewer)) return false;
      if (from && e.day && e.day < from) return false;
      if (to && e.day && e.day > to) return false;
      if (branch && e.branchCode !== branch) return false;
      if (status && e.reviewStatus !== status) return false;
      if (stdOnly && !(e.stdCheck?.on && !e.stdCheck.pass)) return false;
      if (crOnly && !isQuarantined(e)) return false;
      if (q && !`${e.empNo} ${e.butcherName} ${e.branchName}`.toLowerCase().includes(q)) {
        return false;
      }
      return true;
    });
  }, [entries, viewer, scoped, scopeSites, from, to, branch, status, stdOnly, crOnly, query]);

  /* الصفوف اللي بتنحسب فعلاً — المحجور والملغى برّا كل رقم ومجموع. */
  const live = useMemo(() => filtered.filter((e) => !isHidden(e)), [filtered]);

  /* ── تجميع حسب الجزّار: كرت لكل واحد ── */
  const butchers = useMemo(() => {
    const map = new Map();

    filtered.forEach((e) => {
      const key = e.empNo || "—";
      if (!map.has(key)) {
        map.set(key, {
          empNo: key,
          name: e.butcherName || butcherLabel(cfg, key),
          job: e.butcherJob || "",
          branches: new Set(),
          rows: [],
          kg: 0, productsKg: 0, wasteKg: 0, baseKg: 0,
          pending: 0, approved: 0, rejected: 0, stdOff: 0,
          live: 0, held: 0, crOpen: 0, cancelled: 0,
          lastAt: "",
        });
      }
      const b = map.get(key);
      /* الصف بينضاف للقائمة دايماً. الملغى وحده ما بينحسب بأي وزن ولا تصافي
         ولا عدّاد — نفس قاعدة الـKPI. اللي عليه طلب مفتوح بينحسب متل غيره
         وبينعدّ كمان بـcrOpen حتى تبيّن شارته على الكرت. */
      b.rows.push(e);
      if (e.branchName && e.branchName !== "—") b.branches.add(e.branchName);
      if (isHidden(e)) { b.held += 1; b.cancelled += 1; return; }
      if (isQuarantined(e)) b.crOpen += 1;
      b.live += 1;
      b.productsKg += e.productsKg;
      b.wasteKg += e.wasteKg;
      b.baseKg += e.baseKg;
      b.kg += e.productsKg + e.wasteKg;
      b[e.reviewStatus] += 1;
      // انحراف عن النسبة المعيارية — عدّاد يظهر على كرت الجزّار
      if (e.stdCheck?.on && !e.stdCheck.pass) b.stdOff += 1;
      const stamp = `${e.day} ${e.time}`;
      if (stamp > b.lastAt) b.lastAt = stamp;
      if (!b.job && e.butcherJob) b.job = e.butcherJob;
    });

    const list = [...map.values()].map((b) => ({
      ...b,
      branchList: [...b.branches],
      count: b.live,
      yieldPct: pct(b.productsKg, b.baseKg),
      wastePct: pct(b.wasteKg, b.baseKg),
      rows: b.rows.sort((x, y) => `${y.day} ${y.time}`.localeCompare(`${x.day} ${x.time}`)),
    }));

    return list.sort((a, b) => {
      if (sortKey === "std") return b.stdOff - a.stdOff || b.pending - a.pending;
      if (sortKey === "kg") return b.kg - a.kg;
      if (sortKey === "count") return b.count - a.count;
      if (sortKey === "name") return String(a.name).localeCompare(String(b.name));
      // الافتراضي: الأكثر انتظاراً للمراجعة أولاً
      if (b.pending !== a.pending) return b.pending - a.pending;
      return b.kg - a.kg;
    });
  }, [filtered, cfg, sortKey]);

  /* مؤشرات أعلى الصفحة — من `live`: الملغى وحده برّا كل رقم. العملية اللي
     عليها طلب مفتوح بتضل محسوبة (معلّمة)، وعدّادها بكرت الطلبات فوق. */
  const kpi = useMemo(() => ({
    butchers: butchers.length,
    carcasses: live.length,
    kg: live.reduce((s, e) => s + e.productsKg + e.wasteKg, 0),
    pending: live.filter((e) => e.reviewStatus === "pending").length,
    stdOff: live.filter((e) => e.stdCheck?.on && !e.stdCheck.pass).length,
  }), [butchers, live, filtered]);

  /* ── 📋 كرت الطلبات المنفصل ────────────────────────────────────────
     مصدره `entries` لا `filtered`: طلب مرفوع على عملية من قبل أسبوع لازم
     يضل بادّ للمسؤول حتى لو الفلتر مضبوط على اليوم — الفلاتر للتصفّح، مش
     مصفاة تخفي شغل مستنّي قرار. اللي بيضل مطبَّق: نطاق الحساب والرؤية. */
  const visible = useMemo(
    () => entries.filter(
      (e) => (!scoped || scopeSites.includes(e.branchCode)) && canSeeRow(e, viewer)
    ),
    [entries, scoped, scopeSites, viewer]
  );

  const openRequests = useMemo(
    () => visible
      .filter(isQuarantined)
      .sort((a, b) => String(a.changeRequest?.at || "").localeCompare(String(b.changeRequest?.at || ""))),
    [visible]
  );

  const decidedRequests = useMemo(
    () => visible
      .filter((e) => isCancelled(e) || e.crStatus === "rejected")
      .sort((a, b) =>
        String(b.changeRequest?.decidedAt || "").localeCompare(String(a.changeRequest?.decidedAt || ""))),
    [visible]
  );

  /* فحص شامل — الصفحة بتحمّل نافذة الفلتر وبس، فطلب على عملية قديمة ممكن
     يكون برّا التحميل أصلاً. الزر بيسحب آخر ٩٠ يوم مرّة وحدة وبيدمج
     **السجلات اللي عليها طلب** فقط — الباقي بينرمى، فما بتكبر الذاكرة ولا
     بتتشوّه أرقام الفترة المعروضة (الفلترة على التاريخ بتضل شغّالة). */
  const scanRequests = useCallback(async () => {
    if (scanning) return;
    setScanning(true);
    setError("");
    try {
      const wide = new Date();
      wide.setDate(wide.getDate() - 90);
      const res = await fetch(
        `${API_BASE}/api/reports?type=${encodeURIComponent(TYPE)}&limit=5000` +
        `&from=${wide.toISOString().slice(0, 10)}&to=${todayStr()}`,
        { headers: { Accept: "application/json" }, cache: "no-store" }
      );
      if (!res.ok) throw new Error(`Server ${res.status}`);
      const withCr = toArray(await res.json()).filter((r) => r?.payload?.changeRequest);
      setRecords((prev) => {
        const seen = new Set(prev.map((r) => r.id ?? r._id));
        const extra = withCr.filter((r) => !seen.has(r.id ?? r._id));
        return extra.length ? [...prev, ...extra] : prev;
      });
      setScannedAt(new Date().toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" }));
    } catch (e) {
      setError(e?.message || t({ en: "Scan failed", ar: "تعذّر الفحص" }));
    } finally {
      setScanning(false);
    }
  }, [scanning, t]);

  /* ── حفظ المراجعة (قبول — عادي أو مع توضيح) ── */
  const saveReview = useCallback(async (entry, nextStatus, reason = "") => {
    if (!canReview || busyId) return;
    // قبول شغل خارج التسامح المعياري ممنوع بلا سبب مكتوب — حارس أخير خلف الواجهة
    const outOfTol = nextStatus === "approved" && entry.stdCheck?.on && !entry.stdCheck.pass;
    if (outOfTol && !String(reason || "").trim()) return;
    setBusyId(entry.id);
    setError("");
    try {
      const review = {
        status: nextStatus,
        by: currentUser().username || currentUser().name || "supervisor",
        /* اسم الشخص جنب اسم الحساب: في حسابات مسمّاة باسم الملحمة («POS 15»)،
           واسم الملحمة ما بيجاوب «مين قبِلها». الاسم بيتقرا من القوى العاملة
           إذا الحساب مربوط، وإلا من اسم العرض تبع الحساب. */
        byName: viewer.identity?.name || viewer.displayName || currentUser().username || "",
        at: new Date().toISOString(),
        reason: outOfTol ? String(reason || "").trim() : "",
        // قبول استثنائي: السبب إلزامي، ومعه لقطة الانحرافات وقت القبول
        override: outOfTol || undefined,
        deviations: outOfTol
          ? entry.stdCheck.off.map((c) => ({
              itemId: c.itemId, name: c.name, sku: c.sku,
              actualPct: Number(c.actualPct.toFixed(2)),
              stdPct: Number(c.stdPct.toFixed(2)),
              deltaPts: Number(c.stdDeltaPts.toFixed(2)),
            }))
          : undefined,
        tolPct: outOfTol ? entry.stdCheck.tolPct : undefined,
      };
      // PATCH على معرّف السجل — الـ PUT العام يدهس حسب (type, reportDate)
      const res = await fetch(`${API_BASE}/api/reports/${encodeURIComponent(entry.id)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({ payload: { ...entry.payload, review } }),
      });
      if (!res.ok) throw new Error(`Server ${res.status}: ${await res.text()}`);

      // حدّث النسخة المحلية بلا إعادة تحميل كامل
      setRecords((prev) =>
        prev.map((r) =>
          (r.id ?? r._id) === entry.id
            ? { ...r, payload: { ...(r.payload || {}), review } }
            : r
        )
      );
    } catch (e) {
      setError(e?.message || t({ en: "Review failed", ar: "تعذّر حفظ المراجعة" }));
    } finally {
      setBusyId(null);
    }
  }, [canReview, busyId, t]);

  /* ── طلبات التعديل/الإلغاء ──────────────────────────────────────────
     الجزار خربط بالأرقام → مشرف ملحمته بيرفع طلب، والعملية بتنحجر فوراً.
     القرار النهائي (تثبيت الإلغاء أو رجوعها) بيد مسؤول المخزون وحده.

     منكتب بنفس مسار المراجعة: PATCH على معرّف السجل — الـPUT العام بيدهس
     حسب (type, reportDate) وهاد النوع بيحمل أكتر من سجل باليوم. */
  const saveChangeRequest = useCallback(async (entry, next) => {
    if (busyId) return;
    setBusyId(entry.id);
    setError("");
    try {
      const res = await fetch(`${API_BASE}/api/reports/${encodeURIComponent(entry.id)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({ payload: { ...entry.payload, changeRequest: next } }),
      });
      if (!res.ok) throw new Error(`Server ${res.status}: ${await res.text()}`);

      setRecords((prev) =>
        prev.map((r) =>
          (r.id ?? r._id) === entry.id
            ? { ...r, payload: { ...(r.payload || {}), changeRequest: next } }
            : r
        )
      );
    } catch (e) {
      setError(e?.message || t({ en: "Request failed", ar: "تعذّر حفظ الطلب" }));
    } finally {
      setBusyId(null);
    }
  }, [busyId, t]);

  /* ── 📜 سجل الحركات ──
     كل حركة بتنضاف لآخر السجل بدل ما تدهس اللي قبلها. الحالة لحالها ما
     بتحكي القصة: عملية ملغاة اليوم ممكن تكون انطلبت وانرجعت وانطلبت من
     جديد — والمدقّق بيسأل عن هالتسلسل بالذات. */
  const priorHistory = (entry) => {
    const cr = entry.changeRequest;
    if (Array.isArray(cr?.history) && cr.history.length) return cr.history;
    /* أول كتابة على سجل قديم: منحفظ قصته المبنيّة من الحقول المسطّحة حتى
       ما تضيع لما ينكتب فوقها. */
    return crHistory(entry).map((h) => ({ ...h }));
  };

  const withEvent = (entry, next, event) => ({
    ...next,
    history: [...priorHistory(entry), event],
  });

  const me = () => ({
    by: viewer.username,
    byName: viewer.identity ? viewer.identity.name : viewer.displayName,
  });

  /** رفع الطلب — مشرف الملحمة نفسها وبس. */
  const raiseRequest = (entry, kind, reason) => {
    const at = new Date().toISOString();
    const who = me();
    return saveChangeRequest(entry, withEvent(entry, {
      status: "open",
      kind,
      reason: String(reason || "").trim(),
      ...who,
      bySite: entry.branchCode || "",
      at,
      /* قرار قديم على نفس العملية بينمسح من الحقول المسطّحة — القصة محفوظة
         بالسجل، والحقول لازم تمثّل الطلب المفتوح الحالي وبس. */
      decidedBy: "", decidedByName: "", decidedAt: "", decisionNote: "",
    }, { action: "requested", at, ...who, kind, note: String(reason || "").trim() }));
  };

  /** إلغاء مباشر — الأدمن ومسؤول المخزون ما بيرفعوا طلب لحالهم وبعدين
      يبتّوا فيه. الطلب والقرار بينكتبوا بنفس اللحظة وباسمهم، فالسجل بيضل
      كامل: مين ألغى، ليش، وإيمتى. */
  const cancelDirect = (entry, kind, reason) => {
    const at = new Date().toISOString();
    const who = me();
    const note = String(reason || "").trim();
    return saveChangeRequest(entry, withEvent(entry, {
      status: "approved",
      kind,
      reason: note,
      ...who,
      bySite: entry.branchCode || "",
      at,
      direct: true,
      decidedBy: who.by,
      decidedByName: who.byName,
      decidedAt: at,
      decisionNote: "",
    }, { action: "cancelled", at, ...who, kind, note }));
  };

  /** قرار المسؤول — تثبيت الإلغاء أو رجوع العملية طبيعية. */
  const decideRequest = (entry, decision, note) => {
    const at = new Date().toISOString();
    const who = me();
    const txt = String(note || "").trim();
    /* «رفض» على طلب مفتوح = رجوع العملية طبيعية. «رفض» على عملية ملغاة
       أصلاً = إرجاعها. نفس الحقل، وبس السطر بالسجل بيفرّق. */
    const wasCancelled = entry.crStatus === "approved";
    const action = decision === "approved"
      ? "cancelled"
      : (wasCancelled ? "restored" : "rejected");
    return saveChangeRequest(entry, withEvent(entry, {
      ...(entry.changeRequest || {}),
      status: decision,                   // approved | rejected
      decidedBy: who.by,
      decidedByName: who.byName,
      decidedAt: at,
      decisionNote: txt,
    }, { action, at, ...who, kind: entry.changeRequest?.kind || "", note: txt }));
  };

  /* ⛔ ما في «قبول الكل» ولا «قبول المعروض» — انشالوا عن قصد بطلب المشرف:
     كل تقرير بينفتح، بينقرا، وبينقبل لحاله. زر واحد بيعتمد عشر عمليات
     بيخلّي التوقيع أرخص من قراءة الأرقام، وهاد بالضبط اللي المراجعة موجودة
     تمنعه. القبول السريع صار عبر «قائمة المراجعة» — وحدة ورا التانية. */

  /* تصدير سجل المراجعة — دليل تدقيق جاهز: كل تقرير معروض + أسطر الانحراف */
  const exportExcel = async () => {
    // التصدير من `live`: عملية محجورة أو ملغاة ما بتطلع بأي تقرير رسمي.
    if (exporting || !live.length) return;
    setExporting(true);
    try {
      const stamp = new Date().toLocaleString("en-GB");
      const head = [
        "Date", "Time", "Operation no", "Butcher", "Emp no", "Butchery", "Recipe",
        "Pathway", "Raw material", "Raw kg", "Products kg", "Waste kg", "Yield %", "Time (min)",
        "Standard check", "Tolerance ±", "Off-standard lines", "Review", "Reviewed by",
        "Reviewed at", "Reason", "Accepted with justification",
        // الطلب المفتوح ما بيشيل الصف من التقرير — بيظهر معلّم، فالمدقّق
        // بيشوف الرقم وبيشوف إنه في طلب إلغاء عم يستنّى قرار عليه.
        "Cancellation request", "Request reason", "Requested by",
      ];
      const rows = live
        .slice()
        .sort((a, b) => `${b.day} ${b.time}`.localeCompare(`${a.day} ${a.time}`))
        .map((r) => [
          r.day, r.time, r.opNo || "", r.butcherName || "", r.empNo || "",
          r.branchName || "", r.bomRef || "", r.pathwayLabel || "", r.inputName || "",
          Number(r.carcassKg.toFixed(2)), Number(r.productsKg.toFixed(2)),
          Number(r.wasteKg.toFixed(2)), Number(r.yieldPct.toFixed(1)), r.durationMin || "",
          r.stdCheck?.on ? (r.stdCheck.pass ? "Within tolerance" : "OUTSIDE") : "—",
          r.stdCheck?.on ? r.stdCheck.tolPct : "",
          r.stdCheck?.on ? r.stdCheck.off.length : "",
          r.reviewStatus,
          r.review?.byName || r.review?.by || "",
          r.review?.at ? new Date(r.review.at).toLocaleString("en-GB") : "",
          r.review?.reason || "", r.review?.override ? "YES" : "",
          isQuarantined(r) ? "PENDING OFFICER" : "",
          isQuarantined(r) ? (r.changeRequest?.reason || "") : "",
          isQuarantined(r) ? (r.changeRequest?.byName || r.changeRequest?.by || "") : "",
        ]);

      const devHead = [
        "Date", "Operation no", "Butcher", "Butchery", "Recipe", "Item", "SKU",
        "Weight kg", "Actual %", "Standard %", "Deviation (points)", "Tolerance ±",
      ];
      const devs = [];
      live.forEach((r) => {
        (r.stdCheck?.off || []).forEach((c) => devs.push([
          r.day, r.opNo || "", r.butcherName || "", r.branchName || "", r.bomRef || "",
          c.name, c.sku || "", Number(c.weightKg.toFixed(2)),
          Number(c.actualPct.toFixed(1)), Number(c.stdPct.toFixed(1)),
          Number(c.stdDeltaPts.toFixed(1)), r.stdCheck.tolPct,
        ]));
      });

      await downloadExcel([
        {
          name: "Review log",
          aoa: [["Supervisor review log", `${from} → ${to}`, `Exported ${stamp}`], [], head, ...rows],
          widths: [12, 8, 16, 22, 10, 18, 12, 20, 26, 11, 12, 11, 10, 11, 16, 12, 12, 12, 18, 18, 40, 12, 18, 40, 18],
        },
        {
          name: "Deviations",
          aoa: [["Off-standard lines", `${from} → ${to}`], [], devHead, ...devs],
          widths: [12, 16, 22, 18, 12, 30, 12, 11, 11, 12, 16, 12],
        },
      ], `supervisor_review_${from}_${to}.xlsx`);
    } catch (e) {
      setError(e?.message || t({ en: "Export failed", ar: "تعذّر التصدير" }));
    } finally {
      setExporting(false);
    }
  };

  /* قبول تقرير واحد — خارج التسامح المعياري بيمرّ عبر نافذة السبب الإلزامي */
  const approveOne = (row) => {
    // حزام أمان: الزر مقفول أصلاً على المحجور، بس القبول ممكن ينندَه من مكان تاني.
    if (isHidden(row) || isQuarantined(row)) return;
    if (row.stdCheck?.on && !row.stdCheck.pass) {
      setJustifying({ id: row.id, row });
      return;
    }
    saveReview(row, "approved");
  };

  /* صفوف طابور المراجعة — المعلّق ضمن الفلتر الحالي، الأقدم أولاً.
     اللي عليه طلب إلغاء مفتوح ما بيدخل الطابور: قبوله موقوف لحد ما يقرّر
     مسؤول المخزون، فمكانه كرت الطلبات لا طابور المراجعة. */
  const queueRows = live
    .filter((e) => e.reviewStatus === "pending" && !isQuarantined(e))
    .slice()
    .sort((a, b) => `${a.day} ${a.time}`.localeCompare(`${b.day} ${b.time}`));

  if (!canOpenButcherPage("butcher.supervisor")) return <NoAccess page="butcher.supervisor" />;

  /* «مرفوض» ما عاد يُنتَج — العدّ هون بس ليقرّر إذا منعرض الخيار بالفلتر.
     محصور بنطاق الحساب متل غيره: ما منسرّب حتى عدد من ملحمة مش تبعه. */
  const legacyRejected = entries.filter(
    (e) => e.reviewStatus === "rejected" && (!scoped || scopeSites.includes(e.branchCode))
  ).length;

  /* العملية المفتوحة من كرت الطلبات — منجيبها من القائمة الحيّة بالـid لا
     من نسخة محفوظة بالحالة: بعد القرار بتتحدّث بالكرت بلا ما نسكّر النافذة. */
  const focusRow = focusId ? visible.find((e) => e.id === focusId) || null : null;

  const filtersOn = !!branch || !!status || stdOnly || crOnly || !!query.trim()
    || period !== "today" || sortKey !== "pending";

  const KG = t({ en: "kg", ar: "كجم" });
  const openButcher = butchers.find((b) => b.empNo === openEmp) || null;

  return (
    <div dir={dir} className="bs" style={S.page}>
      <style>{CSS}</style>
      <div className="bs-shell">

        {/* ── الترويسة ── */}
        <div className="bs-hero">
          <div style={{ minWidth: 0 }}>
            <div className="bs-title" style={{ fontWeight: 900 }}>
              🧑‍🍳 {t({ en: "Supervisor Board", ar: "لوحة المشرف" })}
            </div>
            <div className="bs-sub" style={{ fontWeight: 700, marginTop: 3 }}>
              {t({
                en: "What every butcher worked on — reviewed one report at a time",
                ar: "شو اشتغل كل جزّار — مراجعة تقرير تقرير",
              })}
            </div>
            {scoped && (
              <div className="bs-hero-badge bs-small">
                🔒 {t({ en: "Your butcheries only", ar: "ملاحمك إنت وبس" })}
                {": "}
                {scopeSites.map((c) => siteLabel(viewer.wf, c, isAr)).join(" · ")}
              </div>
            )}
          </div>
          <div className="bs-acts">
            <LangToggle lang={lang} toggle={toggle} />
            <button
              type="button"
              className="bs-hbtn"
              onClick={exportExcel}
              disabled={exporting || !live.length}
            >
              {exporting ? t({ en: "Exporting…", ar: "جارٍ التصدير…" }) : `⤓ ${t({ en: "Excel", ar: "إكسل" })}`}
            </button>
            <button type="button" className="bs-hbtn" onClick={load} disabled={loading}>
              {loading ? t({ en: "Loading…", ar: "جارٍ التحميل…" }) : `↻ ${t({ en: "Refresh", ar: "تحديث" })}`}
            </button>
            <button type="button" className="bs-hbtn solid" onClick={() => navigate("/butcher", { replace: true })}>
              {t({ en: "Back", ar: "رجوع" })}
            </button>
          </div>
        </div>

        {!canReview && (
          <div style={S.noteBar}>
            👁️ {t({
              en: "View only — accepting reports needs edit rights on the Butcher section.",
              ar: "عرض فقط — قبول التقارير بحاجة صلاحية تعديل على قسم الجزار.",
            })}
          </div>
        )}
        {error && <div style={S.errorBar}>⚠️ {error}</div>}

        {/* ── المؤشرات ── المعلّق وطلبات الإلغاء أزرار: بتوصّل لشغلها مباشرة */}
        <div className="bs-kpis">
          <Kpi icon="👷" label={t({ en: "Butchers", ar: "الجزارون" })} value={kpi.butchers} tone="#1f6fd0" />
          <Kpi icon="🥩" label={t({ en: "Operations", ar: "عمليات" })} value={kpi.carcasses} tone="#0f766e" />
          <Kpi icon="⚖️" label={`${t({ en: "Total", ar: "الإجمالي" })} ${KG}`} value={kpi.kg.toFixed(1)} tone="#7c3aed" />
          <Kpi
            icon="⏳" label={t({ en: "Pending review", ar: "بانتظار المراجعة" })}
            value={kpi.pending} tone="#b45309"
            onClick={canReview && kpi.pending > 0 ? () => setQueue(true) : null}
            hint={canReview && kpi.pending > 0
              ? t({ en: "Open the review list", ar: "افتح قائمة المراجعة" })
              : ""}
          />
          <Kpi
            icon="⚠️" label={t({ en: "Off standard", ar: "خارج المعياري" })}
            value={kpi.stdOff} tone="#b91c1c"
            onClick={kpi.stdOff > 0 ? () => { setStdOnly(true); setStatus(""); } : null}
          />
          <Kpi
            icon="🚩" label={t({ en: "Cancellation requests", ar: "طلبات الإلغاء" })}
            value={openRequests.length} tone="#9a3412"
            onClick={openRequests.length
              ? () => document.getElementById("bs-requests")
                  ?.scrollIntoView({ behavior: "smooth", block: "start" })
              : null}
            hint={t({ en: "Go to the requests card", ar: "روح لكرت الطلبات" })}
          />
        </div>

        {/* ── ⏳ كرت الطلبات: شغل مستنّي قرار مسؤول المخزون ──
            كرت منفصل عن كروت الجزارين عن قصد — الطلب مش «تقرير تاني»، هو
            قرار مستنّي، ومكانه فوق حتى ما ينتظر حدا يدوّر عليه. */}
        {(canDecide || openRequests.length > 0 || decidedRequests.length > 0) && (
        <RequestsPanel
          open={openRequests}
          decided={decidedRequests}
          t={t} isAr={isAr} KG={KG}
          canDecide={canDecide}
          busyId={busyId}
          onDecide={(r) => setDeciding(r)}
          onOpenRow={(r) => setFocusId(r.id)}
          onScan={scanRequests}
          scanning={scanning}
          scannedAt={scannedAt}
        />
        )}

        {/* ── خطة اليوم: هدف كل ملحمة والإنجاز عليه ── */}
        <DayPlanPanel t={t} isAr={isAr} canEdit={canReview} KG={KG} />

        {/* ── الفلاتر ── */}
        <div className="bs-panel">
          <div className="bs-panel-head">
            <div style={{ minWidth: 0 }}>
              <div className="bs-name" style={{ fontWeight: 900 }}>
                🔎 {t({ en: "Browse", ar: "تصفّح" })}
              </div>
              <div className="bs-small" style={S.cardMeta}>
                {t({
                  en: "Filters change what you browse — they never change a decision that is waiting.",
                  ar: "الفلاتر بتغيّر اللي عم تتصفّحه — ما بتمسّ أي قرار مستنّي.",
                })}
              </div>
            </div>
            <div className="bs-acts">
              <button
                type="button"
                disabled={!filtersOn}
                onClick={() => {
                  setBranch(""); setStatus(""); setStdOnly(false); setCrOnly(false); setQuery("");
                  setPeriod("today"); setSortKey("pending");
                }}
                style={{ ...S.btn, ...S.btnSm, ...(filtersOn ? null : S.btnOff) }}
              >
                ↺ {t({ en: "Clear filters", ar: "مسح الفلاتر" })}
              </button>
            </div>
          </div>
          <div style={S.chipRow}>
            {[
              { id: "today", ar: "اليوم", en: "Today" },
              { id: "7d", ar: "٧ أيام", en: "7 days" },
              { id: "30d", ar: "٣٠ يوم", en: "30 days" },
              { id: "custom", ar: "مدى مخصّص", en: "Custom" },
            ].map((x) => (
              <button
                key={x.id}
                type="button"
                onClick={() => setPeriod(x.id)}
                style={{ ...S.chipBtn, ...(period === x.id ? S.chipBtnOn : null) }}
              >
                {t(x)}
              </button>
            ))}
          </div>

          <div style={S.filterGrid}>
            {period === "custom" && (
              <>
                <Field label={t({ en: "From", ar: "من" })}>
                  <input type="date" value={from} max={todayStr()}
                    onChange={(e) => setFrom(e.target.value)} style={S.input} />
                </Field>
                <Field label={t({ en: "To", ar: "إلى" })}>
                  <input type="date" value={to} max={todayStr()}
                    onChange={(e) => setTo(e.target.value)} style={S.input} />
                </Field>
              </>
            )}
            <Field label={t({ en: "Butchery", ar: "الملحمة" })}>
              <select value={branch} onChange={(e) => setBranch(e.target.value)} style={S.input}>
                <option value="">
                  {scoped
                    ? t({ en: "All mine", ar: "كل ملاحمي" })
                    : t({ en: "All", ar: "الكل" })}
                </option>
                {branchChoices.map((b) => (
                  <option key={b.code} value={b.code}>{nameOf(b, isAr)}</option>
                ))}
              </select>
            </Field>
            <Field label={t({ en: "Review status", ar: "حالة المراجعة" })}>
              <select value={status} onChange={(e) => setStatus(e.target.value)} style={S.input}>
                <option value="">{t({ en: "All", ar: "الكل" })}</option>
                {Object.entries(STATUS)
                  // «مرفوض» ما عاد يُنتَج — منعرضه بس إذا في سجلات قديمة مرفوضة
                  .filter(([id]) => id !== "rejected" || legacyRejected > 0)
                  .map(([id, x]) => (
                    <option key={id} value={id}>{isAr ? x.ar : x.en}</option>
                  ))}
              </select>
            </Field>
            <Field label={t({ en: "Standard yield", ar: "النسبة المعيارية" })}>
              <button
                type="button"
                onClick={() => setStdOnly((v) => !v)}
                style={{ ...S.input, ...S.stdFilterBtn, ...(stdOnly ? S.stdFilterBtnOn : null) }}
              >
                {stdOnly
                  ? "⚠️ " + t({ en: "Off standard only", ar: "خارج المعياري فقط" })
                  : t({ en: "All reports", ar: "كل التقارير" })}
              </button>
            </Field>
            {/* طلبات التعديل المفتوحة — مدخل المسؤول للبتّ فيها، وطريق المشرف
                ليتابع طلبه. بيظهر بس لما يكون في طلب فعلاً. */}
            {openRequests.length > 0 && (
              <Field label={t({ en: "Change requests", ar: "طلبات التعديل" })}>
                <button
                  type="button"
                  onClick={() => setCrOnly((v) => !v)}
                  style={{ ...S.input, ...S.stdFilterBtn, ...(crOnly ? S.stdFilterBtnOn : null) }}
                >
                  {crOnly
                    ? "⏳ " + t({ en: "Open requests only", ar: "الطلبات المفتوحة فقط" })
                    : `⏳ ${openRequests.length} ${t({ en: "open", ar: "مفتوح" })}`}
                </button>
              </Field>
            )}
            <Field label={t({ en: "Search butcher", ar: "بحث عن جزّار" })}>
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={t({ en: "name or number…", ar: "اسم أو رقم…" })}
                style={S.input}
              />
            </Field>
            <Field label={t({ en: "Sort by", ar: "الترتيب" })}>
              <select value={sortKey} onChange={(e) => setSortKey(e.target.value)} style={S.input}>
                <option value="pending">{t({ en: "Pending first", ar: "المعلّق أولاً" })}</option>
                <option value="std">{t({ en: "Most off standard", ar: "الأكثر انحرافاً" })}</option>
                <option value="kg">{t({ en: "Most kg", ar: "الأكثر كيلو" })}</option>
                <option value="count">{t({ en: "Most carcasses", ar: "الأكثر ذبائح" })}</option>
                <option value="name">{t({ en: "Name", ar: "الاسم" })}</option>
              </select>
            </Field>
          </div>
        </div>

        {/* ── كروت الجزارين ──
            كرت لكل جزّار بشبكة تتأقلم مع العرض. ما في «قبول الكل» ولا
            «قبول المعروض» عن قصد: كل تقرير بينفتح وبينقبل لحاله — المراجعة
            بالجملة كانت بتخلّي التوقيع أرخص من قراءة الأرقام. */}
        {loading && (
          <div className="bs-cards">
            {[0, 1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="bs-card" style={S.skeleton}>
                <div className="bs-card-head">
                  <div style={{ ...S.skLine, width: 52, height: 52, borderRadius: 16 }} />
                  <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 8 }}>
                    <div style={{ ...S.skLine, width: "60%", height: 18 }} />
                    <div style={{ ...S.skLine, width: "80%" }} />
                  </div>
                </div>
                <div style={{ ...S.skLine, height: 52 }} />
                <div style={{ ...S.skLine, height: 40 }} />
              </div>
            ))}
          </div>
        )}

        {!loading && butchers.length === 0 && (
          <div style={S.emptyBox}>
            {t({
              en: "No butcher activity for the selected filters.",
              ar: "لا يوجد نشاط لأي جزّار ضمن الفلاتر المختارة.",
            })}
          </div>
        )}

        <div className="bs-cards">
          {butchers.map((b) => (
            <div key={b.empNo} className={`bs-card bs-rise${b.crOpen > 0 ? " hot" : ""}`}>
              {/* الهوية */}
              <div className="bs-card-head">
                <span style={S.avatar}>{initials(b.name, b.empNo)}</span>
                <div className="bs-card-id">
                  <div className="bs-cname" style={S.cardName} title={b.name}>{b.name}</div>
                  <div className="bs-small" style={S.cardMeta}>
                    #{b.empNo}{b.job ? ` · ${b.job}` : ""}
                  </div>
                  <div className="bs-small" style={S.cardMeta}>
                    🏪 {b.branchList.join(" · ") || "—"}
                  </div>
                </div>
              </div>

              {/* الحالات */}
              <div className="bs-card-chips">
                {b.pending > 0 && <StatusChip id="pending" n={b.pending} isAr={isAr} />}
                {b.approved > 0 && <StatusChip id="approved" n={b.approved} isAr={isAr} />}
                {b.rejected > 0 && <StatusChip id="rejected" n={b.rejected} isAr={isAr} />}
                {b.stdOff > 0 && (
                  <span className="bs-chip" style={{ ...S.chip, ...S.stdVerdictBad }}>
                    ⚠️ {t({ en: "Off standard", ar: "خارج المعياري" })} · {b.stdOff}
                  </span>
                )}
                {b.crOpen > 0 && (
                  <span
                    className="bs-chip"
                    style={{
                      ...S.chip, background: CR_STATUS.open.bg,
                      color: CR_STATUS.open.fg, border: `1px solid ${CR_STATUS.open.bd}`,
                    }}
                  >
                    ⏳ {t({ en: "Cancellation requested", ar: "طلب إلغاء" })} · {b.crOpen}
                  </span>
                )}
                {b.cancelled > 0 && (
                  <span
                    className="bs-chip"
                    style={{
                      ...S.chip, background: CR_STATUS.approved.bg,
                      color: CR_STATUS.approved.fg, border: `1px solid ${CR_STATUS.approved.bd}`,
                    }}
                  >
                    🚫 {t({ en: "Cancelled", ar: "ملغاة" })} · {b.cancelled}
                  </span>
                )}
              </div>

              {/* الأرقام */}
              <div className="bs-card-stats">
                <Stat label={t({ en: "Operations", ar: "عمليات" })} value={b.count} />
                <Stat label={KG} value={b.kg.toFixed(1)} />
                <Stat label={t({ en: "Yield", ar: "التصافي" })} value={`${b.yieldPct.toFixed(1)}%`} tone="#0f766e" />
                <Stat label={t({ en: "Waste", ar: "الهدر" })} value={`${b.wastePct.toFixed(1)}%`} tone="#b45309" />
              </div>
              <div className="bs-bar" title={t({ en: "Products vs waste", ar: "النواتج مقابل الهدر" })}>
                <i style={{ width: `${Math.min(b.yieldPct, 100)}%`, background: "#2f8f83" }} />
                <i style={{ width: `${Math.min(b.wastePct, 100)}%`, background: "#e0a63e" }} />
              </div>

              {/* التذييل */}
              <div className="bs-card-foot">
                <span className="bs-small" style={{ ...S.cardMeta, marginInlineEnd: "auto" }}>
                  🕒 {b.lastAt || "—"}
                </span>
                <button
                  type="button"
                  style={{ ...S.btn, ...S.btnPrimary }}
                  onClick={() => setOpenEmp(b.empNo)}
                >
                  🧾 {t({ en: "Open work", ar: "شو اشتغل" })} ({b.count})
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── كرت «شو اشتغل»: بطاقة التقطيع + المراجعة ── */}
      {openButcher && (
        <WorkModal
          title={{ avatar: initials(openButcher.name, openButcher.empNo), main: openButcher.name }}
          subtitle={`#${openButcher.empNo}${openButcher.job ? ` · ${openButcher.job}` : ""} · ${
            openButcher.branchList.join(" · ") || "—"
          } · ${openButcher.count} ${t({ en: "reports", ar: "تقرير" })} · ${openButcher.kg.toFixed(1)} ${KG}`}
          rows={openButcher.rows}
          t={t} isAr={isAr} dir={dir} KG={KG}
          canReview={canReview}
          busyId={busyId}
          canRequestFor={canRequestFor}
          canDecide={canDecide}
          onRequest={(r) => setRequesting(r)}
          onDecide={(r) => setDeciding(r)}
          onClose={() => setOpenEmp(null)}
          onApprove={approveOne}
        />
      )}

      {/* ── طابور المراجعة: كل المعلّق ضمن الفلتر الحالي ── */}
      {queue && (
        <WorkModal
          title={{ avatar: "📋", main: t({ en: "Review queue", ar: "طابور المراجعة" }) }}
          subtitle={t({
            en: "Every pending report in the current filter — grouped by butcher and day",
            ar: "كل التقارير المعلّقة ضمن الفلتر الحالي — مجمّعة حسب الجزّار واليوم",
          })}
          rows={queueRows}
          defaultView="review"
          t={t} isAr={isAr} dir={dir} KG={KG}
          canReview={canReview}
          busyId={busyId}
          canRequestFor={canRequestFor}
          canDecide={canDecide}
          onRequest={(r) => setRequesting(r)}
          onDecide={(r) => setDeciding(r)}
          onClose={() => setQueue(false)}
          onApprove={approveOne}
        />
      )}

      {/* ── عملية وحدة مفتوحة من كرت الطلبات — نفس نافذة «شو اشتغل» ── */}
      {focusRow && (
        <WorkModal
          title={{ avatar: "⏳", main: focusRow.opNo || focusRow.inputName }}
          subtitle={`${focusRow.butcherName || "—"} · #${focusRow.empNo} · ${focusRow.branchName} · ${focusRow.day} ${focusRow.time}`}
          rows={[focusRow]}
          defaultView="review"
          t={t} isAr={isAr} dir={dir} KG={KG}
          canReview={canReview}
          busyId={busyId}
          canRequestFor={canRequestFor}
          canDecide={canDecide}
          onRequest={(r) => setRequesting(r)}
          onDecide={(r) => setDeciding(r)}
          onClose={() => setFocusId("")}
          onApprove={approveOne}
        />
      )}

      {/* ── رفع طلب تعديل/إلغاء — مشرف الملحمة نفسها وبس ── */}
      {requesting && (
        <RequestModal
          t={t} isAr={isAr} dir={dir}
          row={requesting}
          /* المسؤول/الأدمن ما بيرفع طلب لحاله وبعدين يبتّ فيه — بيلغي مباشرة */
          direct={!canRequestFor(requesting.branchCode) && canDecide}
          busy={busyId === requesting.id}
          onClose={() => setRequesting(null)}
          onSubmit={async (kind, reason) => {
            if (!canRequestFor(requesting.branchCode) && canDecide) {
              await cancelDirect(requesting, kind, reason);
            } else {
              await raiseRequest(requesting, kind, reason);
            }
            setRequesting(null);
          }}
        />
      )}

      {/* ── قرار مسؤول المخزون على طلب مرفوع ── */}
      {deciding && (
        <DecideModal
          t={t} isAr={isAr} dir={dir}
          row={deciding}
          busy={busyId === deciding.id}
          onClose={() => setDeciding(null)}
          onDecide={async (decision, note) => {
            await decideRequest(deciding, decision, note);
            setDeciding(null);
          }}
        />
      )}

      {/* ── نافذة القبول الاستثنائي: انحراف عن النسبة المعيارية + سبب إلزامي ── */}
      {justifying && (
        <JustifyModal
          t={t} isAr={isAr} dir={dir}
          row={justifying.row}
          busy={busyId === justifying.id}
          onCancel={() => setJustifying(null)}
          onConfirm={async (reason) => {
            await saveReview(justifying.row, "approved", reason);
            setJustifying(null);
          }}
        />
      )}

    </div>
  );
}

/* ============================ مكوّنات ============================ */

/** مؤشّر: أيقونة + رقم + عنوان. مع onClick بيصير زر بيوصّل لشغله. */
function Kpi({ icon, label, value, tone, onClick, hint }) {
  const inner = (
    <>
      <span className="bs-kpi-ic" style={{ background: `${tone}14`, color: tone }}>{icon}</span>
      <span className="bs-kpi-txt">
        <span className="bs-kpi" style={{ ...S.kpiValue, color: tone, display: "block" }}>{value}</span>
        <span className="bs-small" style={{ ...S.kpiLabel, display: "block" }}>{label}</span>
      </span>
    </>
  );
  if (!onClick) return <div className="bs-kpi-box">{inner}</div>;
  return (
    <button type="button" className="bs-kpi-box" onClick={onClick} title={hint || ""}>
      {inner}
    </button>
  );
}

function Stat({ label, value, tone }) {
  return (
    <div style={S.statBox} title={`${label}: ${value}`}>
      <div className="bs-stat" style={{ ...S.statValue, ...(tone ? { color: tone } : null) }}>
        {value}
      </div>
      <div className="bs-small" style={S.statLabel}>{label}</div>
    </div>
  );
}

function StatusChip({ id, n, isAr, big }) {
  // حالة غير معروفة (سجل قديم) ما بتكسر الشاشة — بترجع لـ«بانتظار المراجعة»
  const s = STATUS[id] || STATUS.pending;
  return (
    <span
      className="bs-chip"
      style={{
        ...S.chip,
        background: s.bg, color: s.fg, border: `1px solid ${s.bd}`,
        ...(big ? { padding: "6px 14px" } : null),
      }}
    >
      {isAr ? s.ar : s.en}{typeof n === "number" ? ` · ${n}` : ""}
    </span>
  );
}

function Field({ label, children }) {
  return (
    <label style={{ display: "flex", flexDirection: "column", gap: 5, minWidth: 0 }}>
      <span className="bs-small" style={S.fieldLabel}>{label}</span>
      {children}
    </label>
  );
}

/* ══════════════ كرت «شو اشتغل» — مساحة عمل المشرف ══════════════
   نافذة واحدة بتخدم حالتين: شغل جزّار واحد، أو طابور المراجعة لكل الجزارين.
   عرضان لنفس الشغل:
     🧾 «بطاقة التقطيع» — نفس البطاقة المصمَّمة بصفحة الجزار (CuttingCard المشتركة)،
        قابلة للطباعة A4 أفقي بلا ما نخترع تصميم تاني.
     📋 «المراجعة» — صندوق لكل تنفيذ مع جدول القطع والمقارنة المعيارية وزر القبول.
   التجميع دايماً: يوم × جزّار (نفس وحدة البطاقة الورقية). */

/** تجميع الصفوف بمجموعات (جزّار × يوم) — الأحدث أولاً. */
function groupByButcherDay(rows) {
  const map = new Map();
  rows.forEach((r) => {
    const emp = r.empNo || r.employeeNoRaw || "—";
    const key = `${emp}__${r.day || "—"}`;
    if (!map.has(key)) {
      map.set(key, {
        key, day: r.day || "—", empNo: emp,
        name: r.butcherName || r.employeeNo || "",
        branchName: r.branchName || "",
        rows: [],
      });
    }
    map.get(key).rows.push(r);
  });
  return [...map.values()]
    .map((g) => {
      const rowsSorted = g.rows.slice()
        .sort((a, b) => String(a.time).localeCompare(String(b.time)));
      return {
        ...g,
        rows: rowsSorted,
        kg: rowsSorted.reduce((s, r) => s + r.productsKg + r.wasteKg, 0),
        rawKg: rowsSorted.reduce((s, r) => s + r.carcassKg, 0),
        pending: rowsSorted.filter((r) => r.reviewStatus === "pending").length,
        off: rowsSorted.filter((r) => stdBlocked(r)).length,
      };
    })
    .sort((a, b) => String(b.day).localeCompare(String(a.day))
      || String(a.name).localeCompare(String(b.name)));
}

function WorkModal({
  title, subtitle, rows, t, isAr, dir, KG, canReview, busyId, defaultView = "card",
  canRequestFor, canDecide, onRequest, onDecide,
  onClose, onApprove,
}) {
  const [view, setView] = useState(defaultView);   // card | review
  const [only, setOnly] = useState("all");    // all | pending | off
  const [printJob, setPrintJob] = useState(null);

  // Esc بيسكّر النافذة — الشغل السريع بلا فأرة
  useEffect(() => {
    const onKey = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const shown = useMemo(
    () => rows.filter((r) => {
      /* الملغى برّا عدّادات الفلترة (tot) — فلازم يكون برّا نتيجتها كمان،
         وإلا الشارة بتقول ٣ والقائمة بتعرض ٤. */
      if (only === "pending") return r.reviewStatus === "pending" && !isCancelled(r);
      if (only === "off") return stdBlocked(r) && !isCancelled(r);
      return true;
    }),
    [rows, only]
  );
  const groups = useMemo(() => groupByButcherDay(shown), [shown]);
  // مجموعات اليوم الكاملة (بلا تصفية) — البطاقة وثيقة يوم، مش نتيجة فلتر
  const fullByKey = useMemo(() => {
    const m = new Map();
    // بطاقة التقطيع وثيقة شغل: الملغى ما بيطلع عليها ولا بينحسب بمجاميعها
    groupByButcherDay(rows.filter((r) => !isCancelled(r))).forEach((g) => m.set(g.key, g));
    return m;
  }, [rows]);
  const fullOf = (g) => fullByKey.get(g.key) || g;

  /* مجاميع النافذة — من الحيّ وحده. الملغى بيضل بالقائمة معلّم، بس ما
     بينحسب بكيلو ولا بعدّاد: نفس قاعدة كل الشاشات. */
  const tot = useMemo(() => {
    const liveRows = rows.filter((r) => !isCancelled(r));
    return {
      count: liveRows.length,
      pending: liveRows.filter((r) => r.reviewStatus === "pending").length,
      off: liveRows.filter((r) => stdBlocked(r)).length,
      kg: liveRows.reduce((s, r) => s + r.productsKg + r.wasteKg, 0),
      rawKg: liveRows.reduce((s, r) => s + r.carcassKg, 0),
      cancelled: rows.length - liveRows.length,
    };
  }, [rows]);

  const TABS = [
    { id: "card", ic: "🧾", ar: "بطاقة التقطيع", en: "Cutting card" },
    { id: "review", ic: "📋", ar: "المراجعة", en: "Review" },
  ];
  const FILTERS = [
    { id: "all", ar: "الكل", en: "All", n: rows.length },
    { id: "pending", ar: "بانتظار المراجعة", en: "Pending", n: tot.pending },
    { id: "off", ar: "خارج المعياري", en: "Off standard", n: tot.off },
  ];

  return (
    <div style={S.overlay} onClick={onClose}>
      <div dir={dir} className="bs-rise" style={S.wideModal} onClick={(e) => e.stopPropagation()}>
        <style>{CARD_CSS}</style>

        {/* ── الترويسة ── */}
        <div style={S.modalHead}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, minWidth: 0 }}>
            <span style={S.avatar}>{title.avatar}</span>
            <div style={{ minWidth: 0 }}>
              <div className="bs-name" style={S.cardName}>{title.main}</div>
              <div className="bs-small" style={S.cardMeta}>{subtitle}</div>
            </div>
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
            {tot.pending > 0 && <StatusChip id="pending" n={tot.pending} isAr={isAr} />}
            {tot.off > 0 && (
              <span className="bs-chip" style={{ ...S.chip, ...S.stdVerdictBad }}>
                ⚠️ {t({ en: "Off standard", ar: "خارج المعياري" })} · {tot.off}
              </span>
            )}
            <button type="button" style={S.btn} onClick={onClose}>
              ✕ {t({ en: "Close", ar: "إغلاق" })}
            </button>
          </div>
        </div>

        {/* ── شريط الأدوات: العرض · التصفية · القبول بالجملة ── */}
        <div style={S.modalTools}>
          <div style={S.segment}>
            {TABS.map((x) => (
              <button
                key={x.id}
                type="button"
                onClick={() => setView(x.id)}
                style={{ ...S.segBtn, ...(view === x.id ? S.segBtnOn : null) }}
              >
                {x.ic} {t(x)}
              </button>
            ))}
          </div>

          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {FILTERS.map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => setOnly(f.id)}
                disabled={f.n === 0 && f.id !== "all"}
                style={{
                  ...S.chipBtn,
                  padding: "6px 14px",
                  ...(only === f.id ? S.chipBtnOn : null),
                  ...(f.n === 0 && f.id !== "all" ? S.btnOff : null),
                }}
              >
                {t(f)} · {f.n}
              </button>
            ))}
          </div>

          <span style={{ flex: 1 }} />

          <span className="bs-small" style={S.cardMeta}>
            {tot.rawKg > 0 && <>{t({ en: "Raw", ar: "خام" })} <b>{tot.rawKg.toFixed(1)}</b> {KG} · </>}
            {t({ en: "Recorded", ar: "مسجّل" })} <b>{tot.kg.toFixed(1)}</b> {KG}
          </span>

        </div>

        {/* ── الجسم ── */}
        <div style={S.modalBody}>
          {groups.length === 0 && (
            <div style={S.emptyBox}>
              {t({ en: "Nothing matches this filter.", ar: "ما في شي مطابق لهالتصفية." })}
            </div>
          )}

          {groups.map((g) => (
            <div key={g.key} style={S.groupWrap}>
              {/* شريط المجموعة: يوم × جزّار */}
              <div style={S.groupHead}>
                <div style={{ minWidth: 0 }}>
                  <b>📅 {g.day}</b>
                  <span className="bs-small" style={{ ...S.cardMeta, display: "block" }}>
                    {g.name || "—"}{g.empNo ? ` · #${g.empNo}` : ""} · {g.branchName || "—"}
                  </span>
                </div>
                <span className="bs-small" style={S.cardMeta}>
                  {g.rows.length} {t({ en: "operation(s)", ar: "تنفيذ" })} · {g.kg.toFixed(1)} {KG}
                </span>
                {g.pending > 0 && <StatusChip id="pending" n={g.pending} isAr={isAr} />}
                {g.off > 0 && (
                  <span className="bs-chip" style={{ ...S.chip, ...S.stdVerdictBad }}>
                    ⚠️ {g.off}
                  </span>
                )}
                <span style={{ flex: 1 }} />
                {view === "card" && fullOf(g).rows.length !== g.rows.length && (
                  <span className="bs-small" style={S.cardMeta}>
                    {t({
                      en: "The card shows the full day",
                      ar: "البطاقة بتعرض اليوم كامل",
                    })} ({fullOf(g).rows.length})
                  </span>
                )}
                <button
                  type="button"
                  style={{ ...S.btn, ...S.btnSm }}
                  onClick={() => setPrintJob({
                    rows: fullOf(g).rows, day: g.day, isAr,
                    butcherName: g.name, employeeNo: g.empNo, branchName: g.branchName,
                  })}
                >
                  🖨️ {t({ en: "Print card", ar: "طباعة البطاقة" })}
                </button>
              </div>

              {view === "card" ? (
                <CuttingCard
                  rows={fullOf(g).rows}
                  day={g.day}
                  isAr={isAr}
                  butcherName={g.name}
                  employeeNo={g.empNo}
                  branchName={g.branchName}
                />
              ) : (
                g.rows.map((r) => (
                  <ReportBox
                    key={r.id}
                    r={r} t={t} isAr={isAr} KG={KG}
                    canReview={canReview} busyId={busyId}
                    canRequestFor={canRequestFor} canDecide={canDecide}
                    onRequest={onRequest} onDecide={onDecide}
                    onApprove={onApprove}
                  />
                ))
              )}
            </div>
          ))}
        </div>

        {/* نسخة الطباعة تعيش خارج #root — بطاقة اليوم وحدها على الورق */}
        <CuttingCardPrint job={printJob} onDone={() => setPrintJob(null)} />
      </div>
    </div>
  );
}

/* ══════════════ 📜 سجل العملية ══════════════
   خط زمني قصير: مين عمل شو وإيمتى وليش. بيطلع بكرت الطلبات وبصندوق
   المراجعة — نفس المكوّن بالمكانين حتى ما تختلف القصة حسب الشاشة. */

function CrTimeline({ row, t, isAr }) {
  const items = crHistory(row);
  if (!items.length) return null;

  const tone = {
    requested: { bg: "#fff7ed", bd: "#fdba74", fg: "#9a3412" },
    cancelled: { bg: "#fef2f2", bd: "#fca5a5", fg: "#991b1b" },
    restored:  { bg: "#ecfdf5", bd: "#6ee7b7", fg: "#047857" },
    rejected:  { bg: "#f1f5f9", bd: "#cbd5e1", fg: "#475569" },
  };

  return (
    <div className="bs-tl">
      {items.map((h, i) => {
        const meta = CR_ACTIONS[h.action] || CR_ACTIONS.requested;
        const c = tone[h.action] || tone.rejected;
        return (
          <div className="bs-tl-item" key={`${h.at}-${i}`}>
            <span className="bs-tl-dot" style={{ borderColor: c.bd, background: c.bg }}>
              {meta.icon}
            </span>
            <div style={{ minWidth: 0 }}>
              <div className="bs-small" style={{ fontWeight: 900, color: c.fg }}>
                {isAr ? meta.ar : meta.en}
                {h.kind && h.action === "requested"
                  ? ` · ${isAr ? CR_KINDS[h.kind]?.ar : CR_KINDS[h.kind]?.en}`
                  : ""}
              </div>
              <div className="bs-small" style={S.cardMeta}>
                👤 {h.byName || h.by || "—"}
                {h.at ? ` · 🕒 ${String(h.at).slice(0, 16).replace("T", " ")}` : ""}
              </div>
              {h.note && (
                <div className="bs-small" style={{ marginTop: 3, lineHeight: 1.6 }}>«{h.note}»</div>
              )}
            </div>
          </div>
        );
      })}
      <div className="bs-small" style={{ ...S.cardMeta, fontWeight: 800 }}>
        {t({
          en: "Every action is kept — the record itself is never deleted.",
          ar: "كل حركة محفوظة — السجل نفسه ما بينحذف أبداً.",
        })}
      </div>
    </div>
  );
}

/* ══════════════ ⏳ كرت الطلبات المستنّية قرار المخزون ══════════════
 *
 * ليش كرت لحاله ومش فلتر:
 *   الطلب مش تقرير تاني بين التقارير — هو **شغل واقف عند حدا تاني**. لما
 *   كان مجرّد خيار جوّا الفلاتر، مسؤول المخزون لازم يعرف إنه في طلب حتى
 *   يفتح الفلتر ويدوّر عليه، والمشرف يرفع طلب وما بيعرف وين راح.
 *
 * القائمة ما بتتبع فلاتر الصفحة (التاريخ/الملحمة/البحث) عن قصد: قرار
 * مستنّي ما بيجوز يختفي لأن حدا غيّر مدى التصفّح. اللي بيضل مطبَّق نطاق
 * الحساب وحده. والطلبات الأقدم من نافذة التحميل بيجيبها زر «فحص شامل».
 */
function RequestsPanel({
  open, decided, t, isAr, KG, canDecide, busyId,
  onDecide, onOpenRow, onScan, scanning, scannedAt,
}) {
  const [tab, setTab] = useState("open");          // open | done
  const [openLog, setOpenLog] = useState(() => new Set());

  const list = tab === "open" ? open : decided;
  const toggleLog = (id) =>
    setOpenLog((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });

  const TABS = [
    { id: "open", ic: "⏳", ar: "مستنّي قرار", en: "Awaiting decision", n: open.length },
    { id: "done", ic: "📜", ar: "قرارات سابقة", en: "Decided", n: decided.length },
  ];

  return (
    <div id="bs-requests" className="bs-panel" style={open.length ? S.panelHot : null}>
      <div className="bs-panel-head">
        <div style={{ minWidth: 0 }}>
          <div className="bs-name" style={{ fontWeight: 900 }}>
            🚩 {t({ en: "Cancellation requests", ar: "طلبات الإلغاء" })}
          </div>
          <div className="bs-small" style={S.cardMeta}>
            {canDecide
              ? t({
                  en: "Raised by butchery supervisors. The record stays live and counted until you decide.",
                  ar: "رفعها مشرفو الملاحم. العملية بتضل شغّالة ومحسوبة لحد ما تقرّر إنت.",
                })
              : t({
                  en: "With the inventory officer. Your record stays live and counted until the decision.",
                  ar: "عند مسؤول المخزون. عمليتك بتضل شغّالة ومحسوبة لحد ما يجي القرار.",
                })}
            {scannedAt ? ` · 🔎 ${t({ en: "scanned", ar: "آخر فحص" })} ${scannedAt}` : ""}
          </div>
        </div>
        <div className="bs-acts">
          <div style={S.segment}>
            {TABS.map((x) => (
              <button
                key={x.id}
                type="button"
                onClick={() => setTab(x.id)}
                style={{ ...S.segBtn, ...(tab === x.id ? S.segBtnOn : null) }}
              >
                {x.ic} {t(x)} · {x.n}
              </button>
            ))}
          </div>
          <button
            type="button"
            style={{ ...S.btn, ...S.btnSm, ...(scanning ? S.btnOff : null) }}
            disabled={scanning}
            onClick={onScan}
            title={t({
              en: "The board loads the filtered date window only. This checks the last 90 days for requests on older records.",
              ar: "اللوحة بتحمّل مدى الفلتر وبس. هاد بيفحص آخر ٩٠ يوم عن طلبات على عمليات أقدم.",
            })}
          >
            {scanning
              ? t({ en: "Scanning…", ar: "جارٍ الفحص…" })
              : "🔎 " + t({ en: "Scan older", ar: "فحص شامل" })}
          </button>
        </div>
      </div>

      {list.length === 0 && (
        <div className="bs-small" style={{ ...S.cardMeta, fontWeight: 800 }}>
          {tab === "open"
            ? `✓ ${t({ en: "Nothing is waiting for a decision.", ar: "ما في ولا طلب مستنّي قرار." })}`
            : t({ en: "No decisions yet.", ar: "ما في قرارات بعد." })}
        </div>
      )}

      <div className="bs-reqs">
        {list.map((r) => {
          const cr = r.changeRequest || {};
          const meta = CR_STATUS[cr.status] || CR_STATUS.open;
          const waiting = cr.status === "open";
          const info = crStatusText(r, isAr);
          const logOpen = openLog.has(r.id);
          return (
            <div key={r.id} className={`bs-req bs-rise${waiting ? "" : " done"}`}>
              <div style={{ minWidth: 0 }}>
                <div className="bs-cname" style={S.cardName}>
                  {r.opNo ? `${r.opNo} · ` : ""}{r.inputName}
                  {r.bomRef ? ` · ${r.bomRef}` : ""}
                </div>
                <div className="bs-small" style={S.cardMeta}>
                  🕒 {r.day} {r.time} · 👤 {r.butcherName || "—"} #{r.empNo} · 🏪 {r.branchName}
                  {" · "}⚖️ {(r.productsKg + r.wasteKg).toFixed(1)} {KG}
                </div>
                <div className="bs-small" style={{ marginTop: 6, fontWeight: 900, color: meta.fg }}>
                  {isAr ? CR_KINDS[cr.kind]?.ar : CR_KINDS[cr.kind]?.en}
                  {" — "}{cr.byName || cr.by || "—"}
                  {cr.at ? ` · ${String(cr.at).slice(0, 16).replace("T", " ")}` : ""}
                </div>
                {cr.reason && (
                  <div className="bs-small" style={{ marginTop: 2, lineHeight: 1.6 }}>«{cr.reason}»</div>
                )}

                <button
                  type="button"
                  style={{ ...S.linkBtn, marginTop: 8 }}
                  onClick={() => toggleLog(r.id)}
                >
                  {logOpen ? "▲" : "▼"} 📜 {t({ en: "History", ar: "سجل العملية" })}
                </button>
                {logOpen && <CrTimeline row={r} t={t} isAr={isAr} />}
              </div>

              <div className="bs-req-side">
                <span
                  className="bs-chip"
                  style={{ ...S.chip, background: meta.bg, color: meta.fg, border: `1px solid ${meta.bd}` }}
                  title={info?.label || ""}
                >
                  {waiting ? "⏳ " : cr.status === "approved" ? "🚫 " : "↩︎ "}
                  {isAr ? meta.ar : meta.en}
                </span>
                <button type="button" style={{ ...S.btn, ...S.btnSm }} onClick={() => onOpenRow(r)}>
                  🧾 {t({ en: "Open the record", ar: "افتح العملية" })}
                </button>
                {canDecide && (
                  <button
                    type="button"
                    style={{
                      ...S.btn, ...S.btnSm,
                      ...(waiting ? S.btnOk : null),
                      ...(busyId === r.id ? S.btnOff : null),
                    }}
                    disabled={busyId === r.id}
                    onClick={() => onDecide(r)}
                  >
                    {waiting
                      ? "⚖️ " + t({ en: "Decide", ar: "البتّ بالطلب" })
                      : cr.status === "approved"
                        ? "↩︎ " + t({ en: "Restore", ar: "إرجاع" })
                        : "⚖️ " + t({ en: "Review", ar: "مراجعة" })}
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ══════════════ صندوق تنفيذ واحد بعرض المراجعة ══════════════ */

function ReportBox({
  r, t, isAr, KG, canReview, busyId, onApprove,
  canRequestFor, canDecide, onRequest, onDecide,
}) {
  const blocked = stdBlocked(r);
  const done = r.reviewStatus === "approved";

  const quarantined = isQuarantined(r);
  const cancelled = isCancelled(r);
  const cr = r.changeRequest;
  /* الطلب بيتقدّم مرّة وحدة: ما في طلب مفتوح، وما هي ملغاة أصلاً، والمشرف
     مشرف هالملحمة بالذات. مشرف البرشا للبرشا وبس.
     الأدمن ومسؤول المخزون: نفس الزر بس بيلغي مباشرة — صاحب القرار ما بيرفع
     طلب لحاله. */
  const mine = !!(canRequestFor && canRequestFor(r.branchCode));
  const direct = !mine && !!canDecide;
  const mayRequest = !quarantined && !cancelled && (mine || direct);

  return (
    <div style={{
      ...S.reportBox,
      ...(r.reviewStatus === "rejected" ? S.reportBoxBad : null),
      ...(blocked ? S.reportBoxWarn : null),
      ...(quarantined ? S.reportBoxCr : null),
      ...(isHidden(r) ? S.reportBoxHeld : null),
    }}>
      <div style={S.reportHead}>
        <div style={{ minWidth: 0 }}>
          <div style={S.reportTitle}>
            {r.inputName}
            {r.bomRef ? ` · ${r.bomRef}` : ""}
          </div>
          <div className="bs-small" style={S.cardMeta}>
            {r.opNo ? <b>{r.opNo}</b> : null}
            {r.opNo ? " · " : ""}
            🕒 {r.time || "—"} · {r.branchName}
            {r.pathwayLabel ? ` · 🛤️ ${r.pathwayLabel}` : ""}
            {r.bomKindName ? ` · 🐑 ${r.bomKindName}` : ""}
            {r.bomOriginName ? ` · 🌍 ${r.bomOriginName}` : ""}
            {r.bomCatName ? ` · 🏷️ ${r.bomCatName}` : ""}
            {r.entryDay && r.entryDay !== r.day
              ? ` · ${t({ en: "entered", ar: "أُدخل" })} ${r.entryDay}` : ""}
          </div>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
          {r.review?.override && (
            <span className="bs-chip" style={{ ...S.chip, ...S.stdVerdictBad }}>
              ⚠️ {t({ en: "Accepted with an explanation", ar: "قُبل مع توضيح" })}
            </span>
          )}
          {cr && (
            <span
              className="bs-chip"
              style={{
                ...S.chip,
                background: CR_STATUS[cr.status]?.bg,
                color: CR_STATUS[cr.status]?.fg,
                border: `1px solid ${CR_STATUS[cr.status]?.bd}`,
              }}
              title={cr.reason || ""}
            >
              {cr.status === "open" ? "⏳ " : cr.status === "approved" ? "🚫 " : "↩︎ "}
              {crStatusText(r, isAr)?.label}
            </span>
          )}
          <StatusChip id={r.reviewStatus} isAr={isAr} big />
        </div>
      </div>

      {/* سجل العملية — القصة كاملة: مين طلب، ليش، ومين قرّر شو */}
      {cr && (
        <div style={S.crBox}>
          <div style={{ fontWeight: 900 }}>
            📜 {t({ en: "Record history", ar: "سجل العملية" })}
          </div>
          <CrTimeline row={r} t={t} isAr={isAr} />
          {quarantined && (
            <div className="bs-small" style={{ fontWeight: 800 }}>
              ⏳ {t({
                en: "Still live: the record stays in every report and total, flagged, until the inventory officer decides. Acceptance is on hold.",
                ar: "لسّا شغّالة: العملية بتضل بكل التقارير والمجاميع، معلّمة بشارة، لحد ما يقرّر مسؤول المخزون. القبول موقوف بس.",
              })}
            </div>
          )}
          {cancelled && (
            <div className="bs-small" style={{ fontWeight: 800 }}>
              🚫 {t({
                en: "Cancelled: shown in the reports with this status, but outside every total and export.",
                ar: "ملغاة: بتبيّن بالتقارير بهالحالة، بس برّا كل مجموع وتصدير.",
              })}
            </div>
          )}
        </div>
      )}

      {/* أرقام التنفيذ */}
      <div style={S.reportStats}>
        {r.carcassKg > 0 && (
          <span>{t({ en: "Raw material", ar: "المادة الخام" })}: <b>{r.carcassKg.toFixed(2)}</b> {KG}</span>
        )}
        {r.rawExpiry && (
          <span>
            📅 {t({ en: "Raw expiry", ar: "انتهاء الخام" })}: <b>{r.rawExpiry}</b>
          </span>
        )}
        {r.pieceCount !== null && (
          <span>{t({ en: "Pieces", ar: "عدد القطع" })}: <b>{r.pieceCount}</b></span>
        )}
        {r.partialPiece && (
          <span>
            {t({ en: "Pieces", ar: "عدد القطع" })}:{" "}
            <b>{t({ en: "not a whole piece", ar: "ليست قطعة كاملة" })}</b>
          </span>
        )}
        <span>{t({ en: "Products", ar: "المنتجات" })}: <b>{r.productsKg.toFixed(2)}</b> {KG}</span>
        <span>{t({ en: "Waste", ar: "الهدر" })}: <b>{r.wasteKg.toFixed(2)}</b> {KG}</span>
        <span>{t({ en: "Yield", ar: "التصافي" })}: <b>{r.yieldPct.toFixed(1)}%</b></span>
        {r.durationMin > 0 && (
          <span>
            ⏱️ {t({ en: "Time", ar: "الوقت" })}: <b>{r.durationMin}</b>{" "}
            {t({ en: "min", ar: "دقيقة" })}
          </span>
        )}
        {r.unaccountedKg > 0.005 && (
          <span style={{ color: "#b45309", fontWeight: 900 }}>
            ⚠️ {t({ en: "Unaccounted", ar: "فاقد غير مسجّل" })}: <b>{r.unaccountedKg.toFixed(2)}</b> {KG}
          </span>
        )}
      </div>

      {/* حكم النسبة المعيارية */}
      <StdBanner r={r} t={t} />

      {/* جدول القطع — ومعه المقارنة المعيارية لما تكون مفعّلة */}
      <CutsTable r={r} t={t} isAr={isAr} KG={KG} />

      {r.review && r.review.status === "rejected" && r.review.reason && (
        <div style={S.reasonBox}>
          <b>{t({ en: "Rejection reason (legacy)", ar: "سبب الرفض (سجل قديم)" })}:</b> {r.review.reason}
        </div>
      )}
      {r.review && r.review.status === "approved" && r.review.reason && (
        <div style={{ ...S.reasonBox, background: "#fffaf1", borderColor: "#f3ce9a", color: "#8a5a12" }}>
          <b>
            ⚠️ {t({ en: "Accepted outside tolerance — explanation", ar: "قُبل خارج التسامح — التوضيح" })}:
          </b>{" "}
          {r.review.reason}
        </div>
      )}
      {r.review?.at && (
        <div className="bs-small" style={S.cardMeta}>
          {t({ en: "Reviewed by", ar: "روجع بواسطة" })}{" "}
          {r.review.byName || r.review.by || "—"} ·{" "}
          {new Date(r.review.at).toLocaleString(isAr ? "ar-EG" : "en-GB", {
            dateStyle: "short", timeStyle: "short",
          })}
        </div>
      )}

      {canReview && (
        <div style={S.reportBtns}>
          {mayRequest && (
            <button
              type="button"
              style={{ ...S.btn, ...S.btnWarn, ...(busyId === r.id ? S.btnOff : null) }}
              disabled={busyId === r.id}
              onClick={() => onRequest(r)}
              title={direct
                ? t({
                    en: "You decide directly — the record is cancelled the moment you confirm.",
                    ar: "القرار إلك مباشرة — العملية بتنلغى بلحظة التأكيد.",
                  })
                : t({
                    en: "The record stays live and flagged; the inventory officer decides.",
                    ar: "العملية بتضل شغّالة ومعلّمة، والقرار لمسؤول المخزون.",
                  })}
            >
              {direct
                ? "🚫 " + t({ en: "Cancel the record", ar: "إلغاء العملية" })
                : "✏️ " + t({ en: "Request cancellation", ar: "طلب تعديل / إلغاء" })}
            </button>
          )}
          {cancelled && canDecide && (
            <button
              type="button"
              style={{ ...S.btn, ...(busyId === r.id ? S.btnOff : null) }}
              disabled={busyId === r.id}
              onClick={() => onDecide(r)}
              title={t({
                en: "Put the record back into reports and totals.",
                ar: "رجّع العملية للتقارير والمجاميع.",
              })}
            >
              ↩︎ {t({ en: "Restore the record", ar: "إرجاع العملية" })}
            </button>
          )}
          {quarantined && canDecide && (
            <button
              type="button"
              style={{ ...S.btn, ...S.btnOk, ...(busyId === r.id ? S.btnOff : null) }}
              disabled={busyId === r.id}
              onClick={() => onDecide(r)}
            >
              ⚖️ {t({ en: "Decide the request", ar: "البتّ بالطلب" })}
            </button>
          )}
          <button
            type="button"
            style={{
              ...S.btn,
              ...(blocked ? S.btnWarn : S.btnOk),
              ...(busyId === r.id || done || isHidden(r) || quarantined ? S.btnOff : null),
            }}
            disabled={busyId === r.id || done || isHidden(r) || quarantined}
            onClick={() => onApprove(r)}
            title={quarantined
              ? t({
                  en: "A cancellation request is open — the inventory officer decides before this can be accepted.",
                  ar: "في طلب إلغاء مفتوح — لازم يقرّر مسؤول المخزون قبل ما تنقبل.",
                })
              : blocked
              ? t({
                  en: "Outside the standard tolerance — acceptance needs an explanation.",
                  ar: "خارج التسامح المعياري — القبول بده توضيح.",
                })
              : ""}
          >
            {blocked
              ? "⚠️ " + t({ en: "Accept with explanation", ar: "قبول مع توضيح" })
              : "✓ " + t({ en: "Accept", ar: "قبول" })}
          </button>
          {done && (
            <span className="bs-small" style={S.cardMeta}>
              {t({ en: "Already accepted.", ar: "مقبول مسبقاً." })}
            </span>
          )}
        </div>
      )}
    </div>
  );
}


/* ============================ خطة اليوم ============================ */
/* المشرف يحدّد هدف كل ملحمة لليوم (عدد ذبائح + وزن خام) ويشوف الإنجاز لحظياً.
   الهدف محفوظ على السيرفر بسجل واحد لكل (يوم × ملحمة). */
function DayPlanPanel({ t, isAr, canEdit, KG }) {
  const today = todayStr();
  const [plans, setPlans] = useState([]);
  const [progress, setProgress] = useState({});   // { branchCode: {count, rawKg} }
  const [busy, setBusy] = useState("");
  const [edit, setEdit] = useState(null);          // { branch, count, kg, note }
  const [loadErr, setLoadErr] = useState("");      // فشل قراءة الخطط/التقدّم
  const [saveErr, setSaveErr] = useState("");      // فشل حفظ الهدف

  const load = useCallback(async () => {
    // طلبان فقط: الخطط + تقدّم كل الملاحم دفعة واحدة
    try {
      const [all, per] = await Promise.all([
        fetchPlans(),
        fetchTodayProgressByBranch(today),
      ]);
      setPlans(all.filter((p) => p.date === today));
      setProgress(per);
      setLoadErr("");
    } catch (e) {
      // لا نعرض «ما في هدف» والتحميل فشل — الفرق بين الحالتين مهم للمشرف
      setLoadErr(e?.message || "load failed");
    }
  }, [today]);

  useEffect(() => { load(); }, [load]);

  /* الملاحم التي لها هدف اليوم — وإلا نعرض زر إضافة فقط */
  const planned = plans.filter((p) => Number(p.targetCount) > 0 || Number(p.targetKg) > 0);

  const submit = async () => {
    if (!edit?.branch) return;
    setBusy(edit.branch);
    setSaveErr("");
    try {
      await savePlan({
        date: today,
        branch: edit.branch,
        targetCount: edit.count,
        targetKg: edit.kg,
        note: edit.note,
        by: currentUser().username || currentUser().name || "supervisor",
      });
      setEdit(null);
      await load();
    } catch (e) {
      // نُبقي النافذة مفتوحة بالقيم كما هي حتى لا يُعيد المشرف الإدخال
      setSaveErr(e?.message || "save failed");
    } finally {
      setBusy("");
    }
  };

  return (
    <div style={S.planWrap}>
      <div style={S.planHead}>
        <span className="bs-name" style={{ fontWeight: 900 }}>
          🎯 {t({ en: "Today's plan", ar: "خطة اليوم" })}
        </span>
        {canEdit && (
          <button
            type="button"
            style={S.planAddBtn}
            onClick={() => setEdit({ branch: BRANCHES[0]?.code || "", count: "", kg: "", note: "" })}
          >
            ＋ {t({ en: "Set a target", ar: "تحديد هدف" })}
          </button>
        )}
      </div>

      {loadErr ? (
        <div className="bs-small" style={S.planError}>
          ⚠️ {t({
            en: "Could not load today's targets and progress, so this panel may be empty or stale.",
            ar: "ما قدرنا نحمّل أهداف اليوم والتقدّم، فهذه اللوحة يمكن تكون فاضية أو قديمة.",
          })}
          <button type="button" style={S.planEditBtn} onClick={load}>
            ↻ {t({ en: "Try again", ar: "إعادة المحاولة" })}
          </button>
        </div>
      ) : !planned.length ? (
        <div className="bs-small" style={S.planEmpty}>
          {t({
            en: "No target set for today — the kiosk shows no progress bar until you set one.",
            ar: "ما في هدف لليوم — شريط التقدّم ما بيظهر بالكشك حتى تحدّد هدفاً.",
          })}
        </div>
      ) : (
        <div style={S.planGrid}>
          {planned.map((p) => {
            const b = BRANCHES.find((x) => x.code === p.branch);
            const done = progress[p.branch] || { count: 0, rawKg: 0 };
            const rows = [
              {
                lbl: t({ en: "Carcasses", ar: "الذبائح" }),
                done: done.count, target: Number(p.targetCount) || 0,
                fmt: (v) => String(Math.round(v)),
              },
              {
                lbl: t({ en: "Raw kg", ar: "وزن الخام" }),
                done: done.rawKg, target: Number(p.targetKg) || 0,
                fmt: (v) => `${v.toFixed(0)} ${KG}`,
              },
            ].filter((r) => r.target > 0);
            const complete = rows.every((r) => r.done >= r.target);

            return (
              <div key={p.branch} style={{ ...S.planCard, ...(complete ? S.planCardDone : null) }}>
                <div style={S.planCardHead}>
                  <span style={{ fontWeight: 900 }}>{b ? nameOf(b, isAr) : p.branch}</span>
                  {complete
                    ? <span style={S.planOk}>✓ {t({ en: "Done", ar: "تحقّق" })}</span>
                    : canEdit && (
                      <button
                        type="button"
                        style={S.planEditBtn}
                        onClick={() => setEdit({
                          branch: p.branch, count: p.targetCount || "",
                          kg: p.targetKg || "", note: p.note || "",
                        })}
                      >
                        {t({ en: "Edit", ar: "تعديل" })}
                      </button>
                    )}
                </div>
                {rows.map((r) => {
                  const pctv = progressPct(r.done, r.target);
                  const ok = r.done >= r.target;
                  return (
                    <div key={r.lbl} style={S.planLine}>
                      <span className="bs-small" style={{ color: "#6b8299", fontWeight: 800, minWidth: 78 }}>
                        {r.lbl}
                      </span>
                      <span style={S.planTrack}>
                        <span style={{
                          ...S.planFill, width: `${pctv}%`,
                          background: ok ? "#047857" : "#1f6fd0",
                        }} />
                      </span>
                      <span className="bs-small" style={{ fontWeight: 900, color: ok ? "#047857" : "#14507f" }}>
                        {r.fmt(r.done)} / {r.fmt(r.target)}
                      </span>
                    </div>
                  );
                })}
                {p.note && <div className="bs-small" style={S.planNote}>📌 {p.note}</div>}
              </div>
            );
          })}
        </div>
      )}

      {/* نافذة تحديد الهدف */}
      {edit && (
        <div style={S.overlay} onClick={() => setEdit(null)}>
          <div className="bs-rise" style={S.smallModal} onClick={(e) => e.stopPropagation()}>
            <div className="bs-name" style={S.cardName}>
              🎯 {t({ en: "Set today's target", ar: "تحديد هدف اليوم" })}
            </div>
            <label style={S.planField}>
              <span className="bs-small" style={S.fieldLabel}>{t({ en: "Butchery", ar: "الملحمة" })}</span>
              <select
                style={S.planInput}
                value={edit.branch}
                onChange={(e) => setEdit({ ...edit, branch: e.target.value })}
              >
                {BRANCHES.map((b) => (
                  <option key={b.code} value={b.code}>{nameOf(b, isAr)}</option>
                ))}
              </select>
            </label>
            <label style={S.planField}>
              <span className="bs-small" style={S.fieldLabel}>
                {t({ en: "Carcasses target", ar: "هدف عدد الذبائح" })}
              </span>
              <input
                style={S.planInput} inputMode="numeric" placeholder="0"
                value={edit.count}
                onChange={(e) => setEdit({ ...edit, count: e.target.value.replace(/[^\d]/g, "") })}
              />
            </label>
            <label style={S.planField}>
              <span className="bs-small" style={S.fieldLabel}>
                {t({ en: "Raw weight target (kg)", ar: `هدف وزن الخام (${KG})` })}
              </span>
              <input
                style={S.planInput} inputMode="decimal" placeholder="0"
                value={edit.kg}
                onChange={(e) => setEdit({ ...edit, kg: e.target.value.replace(/[^\d.]/g, "") })}
              />
            </label>
            <label style={S.planField}>
              <span className="bs-small" style={S.fieldLabel}>
                {t({ en: "Note for the butchers (optional)", ar: "ملاحظة للجزارين (اختياري)" })}
              </span>
              <input
                style={S.planInput}
                value={edit.note}
                onChange={(e) => setEdit({ ...edit, note: e.target.value })}
              />
            </label>
            <div className="bs-small" style={{ color: "#6b8299", fontWeight: 700, lineHeight: 1.6 }}>
              {t({
                en: "Leave a target at 0 to hide that bar. The kiosk updates within two minutes.",
                ar: "خلّي الهدف صفر لإخفاء شريطه. الكشك بيتحدّث خلال دقيقتين.",
              })}
            </div>
            {saveErr && (
              <div className="bs-small" style={S.planError}>
                ⚠️ {t({
                  en: "The target was not saved. Your entries are still here — try again.",
                  ar: "الهدف ما انحفظ. اللي كتبته لسا موجود — جرّب كمان مرّة.",
                })}
                <code style={{ opacity: 0.7, fontWeight: 700 }}>{saveErr}</code>
              </div>
            )}
            <div style={S.modalBtns}>
              <button type="button" style={S.btn} onClick={() => setEdit(null)}>
                {t({ en: "Cancel", ar: "إلغاء" })}
              </button>
              <button
                type="button"
                style={{ ...S.btn, ...S.btnOk, ...(busy ? S.btnOff : null) }}
                disabled={!!busy || !edit.branch}
                onClick={submit}
              >
                {busy ? t({ en: "Saving…", ar: "جارٍ الحفظ…" }) : t({ en: "Save", ar: "حفظ" })}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ══════════ النسبة المعيارية: المقارنة والقبول الاستثنائي ══════════
   الوصفة (BOM) بتحدّد نسبة معيارية لكل ناتج/هدر من وزن الخام + تسامح ±.
   الجزار ما بيشوف ولا رقم منها — هون بس، بكرت المشرف.
   الشغل خارج التسامح ما بينقبل إلا بسبب مكتوب ينحفظ مع المراجعة. */

/** هل هذا التقرير محجوب القبول (مفعّل عليه المعياري وخارج التسامح)؟ */
const stdBlocked = (r) => r.stdCheck?.on === true && r.stdCheck.pass === false;

/** شريط الحكم المعياري — يظهر فقط لما تكون الخاصية مفعّلة على الوصفة. */
function StdBanner({ r, t }) {
  const sc = r.stdCheck;
  if (!sc?.on) return null;
  const off = sc.off.length;
  return (
    <div style={{ ...S.stdBanner, ...(off ? S.stdBannerBad : S.stdBannerOk) }}>
      <b>
        {off
          ? `⚠️ ${t({ en: "Outside the standard yield", ar: "خارج النسبة المعيارية" })} (${off})`
          : `✓ ${t({ en: "Within the standard yield", ar: "ضمن النسبة المعيارية" })}`}
      </b>
      <span className="bs-small">
        {t({ en: "Tolerance", ar: "التسامح" })}: ±{sc.tolPct.toFixed(1)}{" "}
        {t({ en: "points", ar: "نقطة" })}
        {sc.skipped > 0 && (
          <> · {sc.skipped} {t({ en: "line(s) not weighed — skipped", ar: "سطر ما انوزن — مستثنى" })}</>
        )}
      </span>
      {off > 0 && (
        <span className="bs-small" style={{ fontWeight: 800 }}>
          {t({ en: "Acceptance needs an explanation.", ar: "القبول بده توضيح." })}
        </span>
      )}
    </div>
  );
}

/**
 * جدول القطع — كل سطر بوزنه وحصّته الفعلية من الخام، ولما تكون النسبة المعيارية
 * مفعّلة بينضاف عليه أعمدة المقارنة (معياري · انحراف · حكم) بنفس الجدول
 * بدل جدولين منفصلين.
 */
function CutsTable({ r, t, isAr, KG }) {
  const [openAll, setOpenAll] = useState(false);
  const cuts = r.cuts || [];
  const std = r.stdCheck?.on === true;
  const LIMIT = 8;
  const shown = openAll || cuts.length <= LIMIT ? cuts : cuts.slice(0, LIMIT);

  if (!cuts.length) {
    return (
      <div className="bs-small" style={S.cardMeta}>
        {t({ en: "No lines recorded.", ar: "لا توجد أسطر مسجّلة." })}
      </div>
    );
  }

  return (
    <div style={S.stdBox}>
      <div style={{ overflowX: "auto" }}>
        <table style={S.stdTable}>
          <thead>
            <tr>
              <th style={{ ...S.stdTh, width: 34 }}>#</th>
              <th style={{ ...S.stdTh, textAlign: isAr ? "right" : "left" }}>
                {t({ en: "Item", ar: "الصنف" })}
              </th>
              <th style={S.stdTh}>{t({ en: "Weight", ar: "الوزن" })}</th>
              <th style={S.stdTh}>{t({ en: "Share of raw", ar: "٪ من الخام" })}</th>
              {std && <th style={S.stdTh}>🎯 {t({ en: "Standard %", ar: "المعيارية ٪" })}</th>}
              {std && <th style={S.stdTh}>{t({ en: "Deviation", ar: "الانحراف" })}</th>}
              {std && <th style={S.stdTh}>{t({ en: "Verdict", ar: "الحكم" })}</th>}
            </tr>
          </thead>
          <tbody>
            {shown.map((c, i) => (
              <tr key={`${c.itemId}_${i}`} style={c.stdChecked && !c.stdOk ? S.stdRowBad : null}>
                <td style={{ ...S.stdTd, color: "#8aa3b8", fontWeight: 900 }}>{i + 1}</td>
                <td style={{ ...S.stdTd, textAlign: isAr ? "right" : "left", fontWeight: 800 }} dir="auto">
                  {c.isWaste ? "◆ " : ""}{c.name}
                  {c.sku ? <span style={{ color: "#8aa3b8" }}> ({c.sku})</span> : null}
                  {c.isWaste && (
                    <span style={S.stdTag}>{t({ en: "waste", ar: "هدر" })}</span>
                  )}
                </td>
                <td style={{ ...S.stdTd, fontWeight: 900 }}>{c.weightKg.toFixed(2)} {KG}</td>
                <td style={S.stdTd}>
                  <span style={S.shareWrap}>
                    <span style={S.shareBar}>
                      <i style={{
                        ...S.shareFill,
                        width: `${Math.min(c.actualPct, 100)}%`,
                        background: c.isWaste ? "#e0a63e" : "#2f8f83",
                      }} />
                    </span>
                    <em style={S.shareVal}>{c.actualPct.toFixed(1)}%</em>
                  </span>
                </td>
                {std && (
                  <td style={S.stdTd}>{c.stdPct > 0 ? `${c.stdPct.toFixed(1)}%` : "—"}</td>
                )}
                {std && (
                  <td style={{
                    ...S.stdTd, fontWeight: 900,
                    color: !c.stdChecked ? "#8aa3b8" : c.stdOk ? "#047857" : "#b91c1c",
                  }}>
                    {c.stdChecked
                      ? `${c.stdDeltaPts > 0 ? "+" : ""}${c.stdDeltaPts.toFixed(1)}`
                      : "—"}
                  </td>
                )}
                {std && (
                  <td style={S.stdTd}>{c.stdChecked ? (c.stdOk ? "✓" : "✕") : "—"}</td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {cuts.length > LIMIT && (
        <button type="button" style={{ ...S.btn, ...S.btnSm, alignSelf: "flex-start" }}
          onClick={() => setOpenAll((v) => !v)}>
          {openAll
            ? t({ en: "Show less", ar: "عرض أقل" })
            : `${t({ en: "Show all lines", ar: "عرض كل الأسطر" })} (${cuts.length})`}
        </button>
      )}
    </div>
  );
}


/** نافذة القبول الاستثنائي — انحراف عن المعياري، والسبب إلزامي. */
function JustifyModal({ row, onCancel, onConfirm, busy, t, isAr, dir }) {
  const [reason, setReason] = useState("");
  const ok = reason.trim().length >= 3;
  const sc = row.stdCheck;

  return (
    <div style={S.overlay} onClick={onCancel}>
      <div dir={dir} className="bs-rise" style={S.smallModal} onClick={(e) => e.stopPropagation()}>
        <div className="bs-name" style={S.cardName}>
          ⚠️ {t({ en: "Accept with an explanation", ar: "قبول مع توضيح" })}
        </div>
        <div className="bs-small" style={S.cardMeta}>
          {row.inputName}{row.bomRef ? ` · ${row.bomRef}` : ""} · {row.day} {row.time} · #{row.empNo}
        </div>

        <div style={{ ...S.stdBox, ...S.stdBoxBad, marginTop: 12 }}>
          <div className="bs-small" style={{ fontWeight: 800, color: "#8a5a12", marginBottom: 8 }}>
            {t({
              en: `These lines fall outside the ±${sc.tolPct.toFixed(1)} point tolerance:`,
              ar: `هالأسطر خارج التسامح ±${sc.tolPct.toFixed(1)} نقطة:`,
            })}
          </div>
          {sc.off.map((c, i) => (
            <div key={`${c.itemId}_${i}`} className="bs-small" style={{ fontWeight: 800, marginTop: 4 }}>
              • {c.name}{c.sku ? ` (${c.sku})` : ""} — {t({ en: "actual", ar: "الفعلية" })}{" "}
              <b>{c.actualPct.toFixed(1)}%</b> {t({ en: "vs standard", ar: "مقابل المعيارية" })}{" "}
              <b>{c.stdPct.toFixed(1)}%</b>{" "}
              <span style={{ color: "#b91c1c" }}>
                ({c.stdDeltaPts > 0 ? "+" : ""}{c.stdDeltaPts.toFixed(1)})
              </span>
            </div>
          ))}
        </div>

        <label style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 12 }}>
          <span className="bs-small" style={S.fieldLabel}>
            {t({ en: "Explanation (required)", ar: "التوضيح (إلزامي)" })}
          </span>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={4}
            autoFocus
            placeholder={t({
              en: "e.g. carcass unusually fatty, customer order needed a different breakdown, bone-in cut kept whole…",
              ar: "مثلاً: الذبيحة دهنها عالي، طلب زبون بدّه تفكيك مختلف، القطعة انحفظت كاملة بعظمها…",
            })}
            style={S.textarea}
            dir={isAr ? "rtl" : "ltr"}
          />
          <span className="bs-small" style={S.cardMeta}>
            {t({
              en: "The explanation is stored with the review and shown on the report.",
              ar: "التوضيح بينحفظ مع المراجعة وبيظهر على التقرير.",
            })}
          </span>
        </label>

        <div style={{ display: "flex", gap: 8, marginTop: 14, justifyContent: "flex-end" }}>
          <button type="button" style={S.btn} onClick={onCancel}>
            {t({ en: "Cancel", ar: "إلغاء" })}
          </button>
          <button
            type="button"
            style={{ ...S.btn, ...S.btnWarn, ...(ok && !busy ? null : S.btnOff) }}
            disabled={!ok || busy}
            onClick={() => onConfirm(reason)}
          >
            {busy
              ? t({ en: "Saving…", ar: "جارٍ الحفظ…" })
              : t({ en: "Accept with explanation", ar: "قبول مع توضيح" })}
          </button>
        </div>
      </div>
    </div>
  );
}


/* ══════════════ رفع طلب تعديل/إلغاء ══════════════
   المشرف بيشوف بوضوح شو رح يصير قبل ما يضغط: العملية بتنحجر فوراً، والقرار
   النهائي مش إلو. السبب إلزامي — طلب بلا سبب ما بيقدر المسؤول يبتّ فيه. */

function RequestModal({ row, onClose, onSubmit, busy, t, isAr, dir, direct }) {
  const [kind, setKind] = useState("delete");
  const [reason, setReason] = useState("");
  const ok = reason.trim().length >= 5;

  return (
    <div style={S.overlay} onClick={onClose}>
      <div dir={dir} className="bs-rise" style={S.smallModal} onClick={(e) => e.stopPropagation()}>
        <div className="bs-name" style={S.cardName}>
          {direct
            ? "🚫 " + t({ en: "Cancel the record", ar: "إلغاء العملية" })
            : "✏️ " + t({ en: "Request cancellation", ar: "طلب تعديل / إلغاء" })}
        </div>
        <div className="bs-small" style={S.cardMeta}>
          {row.opNo ? `${row.opNo} · ` : ""}
          {row.inputName}{row.bomRef ? ` · ${row.bomRef}` : ""} · {row.day} {row.time}
          {" · "}#{row.empNo} · {row.branchName}
        </div>

        <div style={{ ...S.crBox, marginTop: 12 }}>
          {direct
            ? "🚫 " + t({
en: "You are the decision — confirming cancels the record right away: out of every total and export. It stays listed, marked cancelled in your name, and you can put it back later. Every action is written to the record history.",
ar: "القرار إلك — التأكيد بيلغي العملية فوراً: بتطلع من كل مجموع وتصدير، وبتضل بادّة بالتقارير معلّمة «ملغاة» باسمك. بتقدر ترجّعها بعدين، وكل حركة بتنكتب بسجل العملية.",
              })
            : "⏳ " + t({
                en: "The record stays live and counted, flagged for the inventory officer. Nothing is removed until the officer decides — and acceptance is on hold meanwhile.",
                ar: "العملية بتضل شغّالة ومحسوبة، معلّمة لمسؤول المخزون. ما بينشال شي لحد ما يقرّر — والقبول موقوف بهالفترة.",
              })}
        </div>

        <div style={{ display: "flex", gap: 8, marginTop: 12, flexWrap: "wrap" }}>
          {Object.entries(CR_KINDS).map(([id, meta]) => (
            <button
              key={id}
              type="button"
              onClick={() => setKind(id)}
              style={{ ...S.btn, ...(kind === id ? S.btnOk : null) }}
            >
              {kind === id ? "✓ " : ""}{isAr ? meta.ar : meta.en}
            </button>
          ))}
        </div>

        <label style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 12 }}>
          <span className="bs-small" style={S.fieldLabel}>
            {t({ en: "What went wrong? (required)", ar: "شو اللي صار غلط؟ (إلزامي)" })}
          </span>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={4}
            autoFocus
            placeholder={t({
              en: "e.g. the butcher entered 45 kg instead of 4.5, weights belong to another carcass, recorded twice…",
              ar: "مثلاً: الجزار كتب ٤٥ كيلو بدل ٤٫٥، الأوزان تبع ذبيحة تانية، انسجّلت مرتين…",
            })}
            style={S.textarea}
            dir={isAr ? "rtl" : "ltr"}
          />
        </label>

        <div style={{ display: "flex", gap: 8, marginTop: 14, justifyContent: "flex-end" }}>
          <button type="button" style={S.btn} onClick={onClose}>
            {t({ en: "Cancel", ar: "تراجع" })}
          </button>
          <button
            type="button"
            style={{ ...S.btn, ...S.btnWarn, ...(ok && !busy ? null : S.btnOff) }}
            disabled={!ok || busy}
            onClick={() => onSubmit(kind, reason)}
          >
            {busy
              ? t({ en: "Saving…", ar: "جارٍ الحفظ…" })
              : direct
                ? t({ en: "Cancel it now", ar: "ثبّت الإلغاء" })
                : t({ en: "Send to the inventory officer", ar: "إرسال لمسؤول المخزون" })}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ══════════════ قرار مسؤول المخزون ══════════════ */

function DecideModal({ row, onClose, onDecide, busy, t, isAr, dir }) {
  const [note, setNote] = useState("");
  const cr = row.changeRequest || {};
  /* ملغاة أصلاً؟ إذاً هالنافذة للإرجاع لا للبتّ — القرار انأخذ، واللي باقي
     هو التراجع عنه. نفس الحقل ونفس السجل، بس بلا زر «ثبّت الإلغاء». */
  const restoring = cr.status === "approved";

  return (
    <div style={S.overlay} onClick={onClose}>
      <div dir={dir} className="bs-rise" style={S.smallModal} onClick={(e) => e.stopPropagation()}>
        <div className="bs-name" style={S.cardName}>
          {restoring
            ? "↩︎ " + t({ en: "Restore the record", ar: "إرجاع العملية" })
            : "⚖️ " + t({ en: "Decide the request", ar: "البتّ بالطلب" })}
        </div>
        <div className="bs-small" style={S.cardMeta}>
          {row.opNo ? `${row.opNo} · ` : ""}
          {row.inputName}{row.bomRef ? ` · ${row.bomRef}` : ""} · {row.day} {row.time}
          {" · "}#{row.empNo} · {row.branchName}
        </div>

        <div style={{ ...S.crBox, marginTop: 12 }}>
          <div style={{ fontWeight: 900 }}>
            {isAr ? CR_KINDS[cr.kind]?.ar : CR_KINDS[cr.kind]?.en}
            {" — "}{cr.byName || cr.by || "—"}
          </div>
          {cr.reason && (
            <div className="bs-small" style={{ marginTop: 6, lineHeight: 1.7 }}>«{cr.reason}»</div>
          )}
        </div>

        <label style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 12 }}>
          <span className="bs-small" style={S.fieldLabel}>
            {t({ en: "Note (optional)", ar: "ملاحظة (اختيارية)" })}
          </span>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={3}
            style={S.textarea}
            dir={isAr ? "rtl" : "ltr"}
          />
        </label>

        <div className="bs-small" style={{ ...S.cardMeta, marginTop: 10, lineHeight: 1.7 }}>
          {t({
en: "Cancelling keeps the record listed and marked cancelled, with who asked and who decided — deleting it outright would break product traceability and leave a gap in the INV- counter.",
ar: "الإلغاء بيخلّي السجل ظاهر بالتقارير معلّم «ملغى» مع مين طلب ومين قرّر — الحذف الفعلي بيكسر تتبّع المنتج وبيخلّي فجوة بعدّاد INV-.",
          })}
        </div>

        <div style={{ display: "flex", gap: 8, marginTop: 14, justifyContent: "flex-end", flexWrap: "wrap" }}>
          <button type="button" style={S.btn} onClick={onClose}>
            {t({ en: "Close", ar: "إغلاق" })}
          </button>
          <button
            type="button"
            style={{ ...S.btn, ...(restoring ? S.btnOk : null), ...(busy ? S.btnOff : null) }}
            disabled={busy}
            onClick={() => onDecide("rejected", note)}
          >
            ↩︎ {restoring
              ? t({ en: "Put it back into the reports", ar: "رجّعها للتقارير" })
              : t({ en: "Reject — put it back", ar: "رفض — رجّعها" })}
          </button>
          {!restoring && (
            <button
              type="button"
              style={{ ...S.btn, ...S.btnWarn, ...(busy ? S.btnOff : null) }}
              disabled={busy}
              onClick={() => onDecide("approved", note)}
            >
              🚫 {busy
                ? t({ en: "Saving…", ar: "جارٍ الحفظ…" })
                : t({ en: "Approve — cancel it", ar: "موافقة — ثبّت الإلغاء" })}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}


/* ============================ الأنماط ============================ */

const FONT = "Cairo, system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif";

const S = {
  page: {
    minHeight: "100vh", background: "#eef4fb", fontFamily: FONT, color: "#0f2740",
    padding: "18px 14px 40px", overflowX: "hidden",
  },

  /* شارة النطاق — لون هادي، مش تحذير: هالحصر طبيعي مش خلل. */

  btn: {
    border: "1.5px solid #cfe0f0", background: "#fff", color: "#3c5a75",
    borderRadius: 12, padding: "12px 20px", fontWeight: 800, fontFamily: FONT,
    cursor: "pointer", whiteSpace: "nowrap",
  },
  btnPrimary: { background: "#1f6fd0", color: "#fff", border: "1px solid #1f6fd0" },
  btnOk: { background: "#047857", color: "#fff", border: "1px solid #047857" },
  btnOff: { opacity: 0.5, cursor: "not-allowed" },

  noteBar: {
    background: "#f3f8fd", border: "1px solid #cfe0f0", color: "#3c5a75",
    borderRadius: 12, padding: "10px 14px", fontWeight: 800,
  },
  errorBar: {
    background: "#fff1f1", border: "1px solid #f5c2c2", color: "#a12626",
    borderRadius: 12, padding: "10px 14px", fontWeight: 800,
  },

  kpiValue: { fontWeight: 900, lineHeight: 1.1 },
  kpiLabel: { color: "#6b8299", fontWeight: 800, marginTop: 6 },

  chipRow: { display: "flex", gap: 8, flexWrap: "wrap" },
  chipBtn: {
    border: "1px solid #cfe0f0", background: "#fff", color: "#14507f",
    borderRadius: 999, padding: "8px 18px", fontWeight: 800, fontFamily: FONT, cursor: "pointer",
  },
  chipBtnOn: { background: "#1f6fd0", color: "#fff", border: "1px solid #1f6fd0" },
  filterGrid: {
    display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(min(200px,100%),1fr))", gap: 12,
  },
  fieldLabel: { color: "#6b8299", fontWeight: 800 },
  input: {
    border: "1.5px solid #cfe0f0", borderRadius: 10, padding: "12px 13px",
    fontWeight: 700, fontFamily: FONT, color: "#0f2740", background: "#fff",
    outline: "none", width: "100%", boxSizing: "border-box",
  },
  textarea: {
    border: "1px solid #cfe0f0", borderRadius: 10, padding: "10px 12px",
    fontWeight: 700, fontFamily: FONT, color: "#0f2740", background: "#fff",
    outline: "none", width: "100%", boxSizing: "border-box", resize: "vertical",
  },

  /* قائمة الجزارين — سطر تحت سطر، مش شبكة كروت */
  avatar: {
    width: 52, height: 52, borderRadius: 16, flexShrink: 0,
    display: "grid", placeItems: "center", fontWeight: 900, color: "#fff",
    background: "linear-gradient(135deg,#1f6fd0,#0f766e)",
    boxShadow: "0 8px 18px rgba(31,111,208,.28)",
  },
  cardName: {
    fontWeight: 900, overflow: "hidden", wordBreak: "break-word",
    display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical",
  },
  cardMeta: { color: "#6b8299", fontWeight: 700, marginTop: 2 },
  chip: {
    borderRadius: 999, padding: "4px 11px", fontWeight: 900, whiteSpace: "nowrap",
    maxWidth: "100%", overflow: "hidden", textOverflow: "ellipsis",
  },

  statBox: {
    background: "#f7fbff", border: "1px solid #e6eff8", borderRadius: 12,
    padding: "7px 10px", textAlign: "center", minWidth: 64, overflow: "hidden",
  },
  statValue: {
    fontWeight: 900, color: "#14507f", lineHeight: 1.15,
    whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
  },
  statLabel: { color: "#6b8299", fontWeight: 800, marginTop: 3 },


  emptyBox: {
    background: "#fff", border: "2px dashed #cfe0f0", borderRadius: 18,
    padding: "34px 20px", textAlign: "center", fontWeight: 800, color: "#6b8299",
  },

  overlay: {
    position: "fixed", inset: 0, background: "rgba(15,39,64,.45)",
    display: "grid", placeItems: "center", padding: 16, zIndex: 80,
    backdropFilter: "blur(2px)",
  },
  smallModal: {
    background: "#fff", borderRadius: 20, width: "min(540px, 100%)",
    padding: 20, fontFamily: FONT, color: "#0f2740",
    boxShadow: "0 24px 60px rgba(15,39,64,.3)",
  },
  modalHead: {
    display: "flex", alignItems: "center", justifyContent: "space-between",
    gap: 12, padding: 16, background: "#fff", borderBottom: "1px solid #dbe6f2",
  },
  modalBody: {
    padding: 16, overflowY: "auto", display: "flex", flexDirection: "column", gap: 12,
  },
  modalBtns: { display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 14, flexWrap: "wrap" },

  /* ── خطة اليوم ── */
  planWrap: {
    background: "#fff", border: "1px solid #dbe6f2", borderRadius: 18,
    padding: 16, display: "flex", flexDirection: "column", gap: 12,
  },
  planHead: {
    display: "flex", alignItems: "center", justifyContent: "space-between",
    gap: 10, flexWrap: "wrap",
  },
  planAddBtn: {
    border: "1px solid #1f6fd0", background: "#1f6fd0", color: "#fff",
    borderRadius: 12, padding: "9px 16px", fontFamily: FONT, fontWeight: 800, cursor: "pointer",
  },
  planEditBtn: {
    border: "1px solid #cfe0f0", background: "#fff", color: "#1f6fd0",
    borderRadius: 10, padding: "5px 12px", fontFamily: FONT, fontWeight: 800, cursor: "pointer",
  },
  planError: {
    background: "#fff5f5", border: "1px solid #f3c9c9", color: "#a12626",
    borderRadius: 14, padding: "14px 16px", fontWeight: 800, lineHeight: 1.7,
    display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap",
  },
  planEmpty: {
    background: "#f7fbff", border: "2px dashed #cfe0f0", borderRadius: 14,
    padding: "20px 16px", textAlign: "center", fontWeight: 800, color: "#6b8299",
  },
  planGrid: {
    display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(min(280px,100%),1fr))",
    gap: 12,
  },
  planCard: {
    background: "#f9fcff", border: "1px solid #e3edf7", borderRadius: 14,
    padding: "12px 14px", display: "flex", flexDirection: "column", gap: 8,
  },
  planCardDone: { background: "#f6fffa", borderColor: "#a7f3d0" },
  planCardHead: {
    display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8,
  },
  planOk: { color: "#047857", fontWeight: 900 },
  planLine: { display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" },
  planTrack: {
    flex: 1, minWidth: 90, height: 12, borderRadius: 999,
    background: "#e6eef7", overflow: "hidden", display: "block",
  },
  planFill: { display: "block", height: "100%", borderRadius: 999, transition: "width .4s ease" },
  planNote: {
    color: "#8a5a12", fontWeight: 800, background: "#fff7ed",
    border: "1px solid #fcd9a4", borderRadius: 10, padding: "6px 10px",
  },
  planField: { display: "flex", flexDirection: "column", gap: 6, marginTop: 10 },
  planInput: {
    border: "1px solid #cfe0f0", borderRadius: 12, padding: "11px 12px",
    fontFamily: FONT, fontWeight: 700, color: "#0f2740", outline: "none", width: "100%",
    boxSizing: "border-box",
  },

  reportBox: {
    background: "#fff", border: "1px solid #dbe6f2", borderRadius: 16,
    padding: 14, display: "flex", flexDirection: "column", gap: 10,
  },
  reportBoxBad: { border: "1px solid #fecaca", background: "#fffafa" },
  reportHead: {
    display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12,
    flexWrap: "wrap",
  },
  reportTitle: { fontWeight: 900, color: "#14507f" },
  reportStats: {
    display: "flex", gap: 16, flexWrap: "wrap", fontWeight: 700, color: "#3c5a75",
    background: "#f7fbff", border: "1px solid #e6eff8", borderRadius: 12, padding: "10px 12px",
  },
  reasonBox: {
    background: "#fef2f2", border: "1px solid #fecaca", color: "#b91c1c",
    borderRadius: 12, padding: "10px 12px", fontWeight: 700, lineHeight: 1.6,
  },
  reportBtns: { display: "flex", gap: 8, flexWrap: "wrap" },

  /* النسبة المعيارية — جدول المقارنة بكرت المشرف */
  stdBox: {
    background: "#f8fbff", border: "1px solid #dbe6f2", borderRadius: 14,
    padding: "12px 14px", display: "flex", flexDirection: "column", gap: 10,
  },
  stdBoxBad: { background: "#fffaf1", borderColor: "#f3ce9a" },
  /* شارة «خارج المعياري» — تُلبَس فوق S.chip */
  stdVerdictBad: { background: "#fef2f2", color: "#b91c1c", border: "1px solid #fecaca" },
  stdTable: { width: "100%", borderCollapse: "collapse", minWidth: 520 },
  stdTh: {
    textAlign: "center", fontWeight: 900, color: "#6b8299", padding: "6px 8px",
    borderBottom: "1.5px solid #e6eff8", whiteSpace: "nowrap",
  },
  stdTd: {
    textAlign: "center", padding: "7px 8px", borderTop: "1px solid #eef4fa",
    color: "#3c5a75", fontWeight: 700, whiteSpace: "nowrap",
  },
  stdRowBad: { background: "#fff5f5" },
  stdTag: {
    marginInlineStart: 6, background: "#fffdf5", border: "1px solid #e8d9a8",
    color: "#8a6d1f", borderRadius: 999, padding: "1px 8px", fontWeight: 800,
  },
  btnWarn: { background: "#b45309", color: "#fff", border: "1px solid #b45309" },
  /* ── مساحة عمل «شو اشتغل» ── */
  wideModal: {
    background: "#eef4fb", borderRadius: 22, width: "min(1280px, 100%)",
    maxHeight: "94vh", display: "flex", flexDirection: "column",
    fontFamily: FONT, color: "#0f2740", overflow: "hidden",
    boxShadow: "0 24px 60px rgba(15,39,64,.3)",
  },
  modalTools: {
    display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap",
    padding: "10px 16px", background: "#f7fbff", borderBottom: "1px solid #dbe6f2",
  },
  segment: {
    display: "flex", background: "#e8f0f9", border: "1px solid #cfe0f0",
    borderRadius: 999, padding: 3, gap: 3,
  },
  segBtn: {
    border: "1px solid transparent", background: "transparent", color: "#14507f",
    borderRadius: 999, padding: "7px 16px", fontWeight: 900, fontFamily: FONT,
    cursor: "pointer", whiteSpace: "nowrap",
  },
  segBtnOn: {
    background: "#fff", color: "#1f6fd0", border: "1px solid #cfe0f0",
    boxShadow: "0 4px 12px rgba(15,39,64,.08)",
  },
  groupWrap: {
    display: "flex", flexDirection: "column", gap: 10,
    background: "#fff", border: "1px solid #dbe6f2", borderRadius: 18, padding: 14,
    boxShadow: "0 8px 22px rgba(15,39,64,.05)",
  },
  groupHead: {
    display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap",
    paddingBottom: 10, borderBottom: "1px dashed #dbe6f2",
  },
  reportBoxWarn: { border: "1px solid #f3ce9a", background: "#fffcf6" },
  /* عملية محجورة أو ملغاة — لون رمادي مطفي، مقصود إنها تبيّن «خارج الحساب». */
  reportBoxHeld: {
    border: "1px dashed #cbd5e1", background: "#f8fafc", opacity: 0.92,
  },
  /* الطلب المفتوح: الصف بيضل كامل وواضح — بس معلّم بإطار كهرماني حتى ما
     حدا يعتمد عليه وهو ما بيعرف إنه في طلب إلغاء عم يستنّى. */
  reportBoxCr: { border: "2px solid #fdba74", background: "#fffdf8" },

  /* ── كرت الطلبات المستنّية ── */
  crBox: {
    marginTop: 10, padding: "10px 12px", borderRadius: 12,
    background: "#fff7ed", border: "1px solid #fed7aa", color: "#7c2d12",
    fontWeight: 800, lineHeight: 1.7,
  },
  stdBanner: {
    display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center",
    borderRadius: 12, padding: "8px 12px", fontWeight: 800, border: "1px solid transparent",
  },
  stdBannerOk: { background: "#ecfdf5", color: "#047857", borderColor: "#a7f3d0" },
  stdBannerBad: { background: "#fffaf1", color: "#8a5a12", borderColor: "#f3ce9a" },
  shareWrap: { display: "flex", alignItems: "center", gap: 8, justifyContent: "center" },
  shareBar: {
    display: "inline-block", width: 78, height: 8, borderRadius: 999,
    background: "#e8f0f9", overflow: "hidden", flexShrink: 0,
  },
  shareFill: { display: "block", height: "100%", borderRadius: 999 },
  shareVal: { fontStyle: "normal", fontWeight: 900, color: "#3c5a75", minWidth: 46 },
  btnSm: { padding: "7px 13px", borderRadius: 10 },
  /* زر نصّي — لفتح/طيّ سجل العملية بلا ما يزاحم أزرار القرار */
  linkBtn: {
    border: "none", background: "none", padding: 0, color: "#14507f",
    fontWeight: 900, fontFamily: FONT, cursor: "pointer", textAlign: "start",
  },
  /* كرت فيه شغل مستنّي — إطار كهرماني بدل ما يضيع بين الكروت البيضا */
  panelHot: { border: "2px solid #fdba74", background: "#fffdf8" },
  skeleton: { gap: 10, pointerEvents: "none" },
  skLine: { height: 14, borderRadius: 8, background: "linear-gradient(90deg,#eef4fb,#e2ecf7,#eef4fb)" },
  stdFilterBtn: { cursor: "pointer", fontWeight: 900, textAlign: "start" },
  stdFilterBtnOn: { background: "#fffaf1", borderColor: "#f3ce9a", color: "#8a5a12" },
};
