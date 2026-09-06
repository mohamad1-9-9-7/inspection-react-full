// src/pages/butcher/ButcherMyWork.jsx
//
// 👤 شغلي — الجزار يدخّل رقمه الوظيفي ويشوف شو اشتغل، بشاشة كشك بسيطة (EN/AR).
// "My work": a kiosk-simple, one-glance view of what this butcher cut.
//
// ── فلسفة التصميم (أعيد بناؤها من الصفر) ──
// • الجزار مش محلّل بيانات: رقم كبير واحد بالوسط (التصافي) وثلاثة أرقام حوله.
// • ألوان بثلاثة أدوار فقط: كحلي = الداخل ، أخضر = النواتج والتصافي ،
//   كهرماني = الهدر. ما في بنفسجي/أحمر/أزرق متفرّقين متل قبل.
// • اليوم يُختار من شريط أيام أفقي (اليوم · أمس · …) بدل أكورديون طويل.
// • تفاصيل التنفيذ = جدول قطع نظيف بشريط حصّة لكل قطعة، مش «شرائح» متراصّة.
// • بطاقة التقطيع الرسمية (CuttingCard) تبقى العرض البديل + الطباعة.

import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useSettingsLang, LangToggle } from "../settings/_shared/settingsI18n";
import { canOpenButcherPage, NoAccess } from "./ButcherAccess";
import {
  canSeeRow, crStatusText, explainError, isCancelled, kg, shiftDays, totalsOf,
  useButcherData, useNormalizedRows,
} from "./butcherReportKit";
import { useRowViewer } from "./butcherViewer";
// 🎯 سكور التنفيذ — بينحسب مرّة بأعلى الشاشة، والكروت بتقرا `r.score` جاهز
import { attachScores, avgScore, scoreTone } from "./butcherScore";
import CuttingCard, { CARD_CSS, CuttingCardPrint } from "./ButcherCuttingCard";
import { useOutbox } from "./butcherOutbox";
import ButcherPerformance from "./ButcherPerformance";
// 👥 القوى العاملة — الحساب المربوط (جزار أو مشرف) بيشوف شغله هو وبس.
import { accountIdentity, useWorkforce } from "../workforce/workforceConfig";
import { getCurrentUser } from "../../utils/perms";

const LAST_EMP_KEY = "butcher_last_emp";   // كاش فقط — نفس مفتاح شاشة التسجيل

/* ══════════════ اللوحة ══════════════
   ثلاثة أدوار لونيّة لا أكثر — كل شي غيرها حبر أو رمادي. */
const K = {
  ink: "#0f2740",
  ink2: "#3c5a75",
  mut: "#7b93a8",
  line: "#dde9f5",
  soft: "#f6fafe",
  page: "#eef4fb",
  raw: "#14507f",      // المادة الخام الداخلة
  good: "#0f766e",     // النواتج
  yield: "#047857",    // التصافي
  waste: "#b45309",    // الهدر
  okBg: "#ecfdf5", okBd: "#a7f3d0", okFg: "#047857",
  waitBg: "#fff7ed", waitBd: "#fcd9a4", waitFg: "#8a5a12",
};

/* أحجام الخط — تتغلّب على `#root *{font-size:14px!important}` بكلاس أخصّ */
const CSS = `
#root .mw, #root .mw * { font-size: 19px !important; }
#root .mw-title { font-size: 28px !important; }
#root .mw-hero  { font-size: 46px !important; }
#root .mw-num   { font-size: 38px !important; }
#root .mw-big   { font-size: 27px !important; }
#root .mw-day   { font-size: 22px !important; }
#root .mw-sm    { font-size: 16px !important; }
#root .mw-lbl   { font-size: 14px !important; }

#root .mw-press { transition: transform .12s ease, box-shadow .16s ease, border-color .16s ease; }
#root .mw-press:active { transform: scale(.985); }
#root .mw-press:hover { border-color: #bcd6ef; }
@keyframes mwRise { from { opacity: 0; transform: translateY(8px) } to { opacity: 1; transform: none } }
#root .mw-rise { animation: mwRise .24s ease both; }

/* ── اللوح الثلاثي ── المادة الخام بعمود على طرف الشاشة، وبضغطة بتفتح
   **جنبها** مساراتها، والمسار بيفتح جنبه تفاصيله. ما في شي بينفتح تحت
   السطر: كل مستوى عمود لحاله، فالعين بتقرا المسار من الطرف للداخل.
   الأعمدة بتنقلب لحالها بالعربي (grid بيتبع dir). */
#root .mw-board {
  display: grid; gap: 14px; align-items: start;
  grid-template-columns: minmax(270px, 360px) minmax(250px, 330px) minmax(300px, 1fr);
}
/* مسار واحد = عمود المسارات نسخة مكرّرة عن كرت المادة، فبينشال ويصير اللوح
   عمودين: المادة الخام ← تفاصيلها. */
#root .mw-board-2 { grid-template-columns: minmax(270px, 380px) minmax(320px, 1fr); }
#root .mw-pane { display: flex; flex-direction: column; gap: 10px; min-width: 0; }
#root .mw-paneHead {
  display: flex; align-items: center; gap: 8px; justify-content: space-between;
  padding: 0 4px 2px;
}
/* ── 🔒 القفل البلوري ── الشغل اللي لسّا بانتظار المشرف بيضل مكانه، بس
   وراء طبقة غباش: بتشوف إنّه موجود وما بتقدر تقرا رقم منه ولا تفتحه.
   بيوافق المشرف → بينزاح الغباش وبيصير كرت عادي بأرقامه. */
#root .mw-lock { position: relative; border-radius: 16px; }
#root .mw-lock > .mw-lockBody {
  filter: blur(7px); opacity: .5; pointer-events: none; user-select: none;
}
#root .mw-lockGlass {
  position: absolute; inset: 0; z-index: 1; border-radius: inherit;
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  gap: 6px; text-align: center; padding: 14px;
  background: linear-gradient(135deg, rgba(255,255,255,.66), rgba(255,247,232,.72));
  backdrop-filter: blur(7px) saturate(120%);
  -webkit-backdrop-filter: blur(7px) saturate(120%);
  border: 1px dashed #e0bd80; color: #8a5a12; font-weight: 900; line-height: 1.6;
}
/* ضغطة على شي مقفول: هزّة خفيفة — رسالة «ما بينفتح» بلا نافذة منبثقة */
@keyframes mwShake {
  10%, 90% { transform: translateX(-2px) } 30%, 70% { transform: translateX(3px) }
  50% { transform: translateX(-3px) }
}
#root .mw-shake { animation: mwShake .38s ease; }
/* غباش جوّا كرت عقدة — مساحته أصغر، فبدّه ارتفاع أدنى ليسع السطرين */
#root .mw-lock-sm { min-height: 84px; }
#root .mw-lock-sm > .mw-lockGlass { padding: 6px 8px; gap: 2px; }

/* سطر ناتج جوّا كرت العقدة — اسم · وزن · حصّة */
#root .mw-nodeCut {
  display: grid; grid-template-columns: minmax(0, 1fr) auto 42px;
  gap: 8px; align-items: center; padding: 4px 0;
}

/* أرقام مصغّرة جوّا كرت العقدة — عمودين، وبتنكسر لعمود واحد بالضيّق جداً */
#root .mw-mini { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 6px; }
@media (max-width: 380px) { #root .mw-mini { grid-template-columns: minmax(0, 1fr); } }
/* ≤1180: عمودين — المادة الخام على الطرف، والمسارات وتفاصيلها فوق بعض */
@media (max-width: 1180px) {
  #root .mw-board { grid-template-columns: minmax(240px, 320px) minmax(0, 1fr); }
  #root .mw-pane-master { grid-column: 1; grid-row: 1 / span 2; }
  #root .mw-pane-paths  { grid-column: 2; grid-row: 1; }
  #root .mw-pane-detail { grid-column: 2; grid-row: 2; }
  /* بلا عمود مسارات: صفّين ما إلهم لزوم */
  #root .mw-board-2 .mw-pane-master { grid-row: 1; }
  #root .mw-board-2 .mw-pane-detail { grid-column: 2; grid-row: 1; }
}
/* ≤820 (كشك/جوّال): عمود واحد بالترتيب نفسه */
@media (max-width: 820px) {
  #root .mw-board, #root .mw-board-2 { grid-template-columns: minmax(0, 1fr); }
  #root .mw-pane-master, #root .mw-pane-paths, #root .mw-pane-detail,
  #root .mw-board-2 .mw-pane-master, #root .mw-board-2 .mw-pane-detail {
    grid-column: 1; grid-row: auto;
  }
}

/* شريط الأيام — تمرير أفقي بلا شريط تمرير مرئي */
#root .mw-days { display: flex; gap: 10px; overflow-x: auto; padding: 4px 2px 10px; scrollbar-width: none; }
#root .mw-days::-webkit-scrollbar { display: none; }

@media (max-width: 820px) {
  #root .mw, #root .mw * { font-size: 17px !important; }
  #root .mw-title { font-size: 23px !important; }
  #root .mw-hero  { font-size: 38px !important; }
  #root .mw-num   { font-size: 30px !important; }
  #root .mw-big   { font-size: 22px !important; }
  #root .mw-day   { font-size: 19px !important; }
  #root .mw-sm    { font-size: 15px !important; }
  #root .mw-lbl   { font-size: 13px !important; }
  #root .mw-heroGrid { grid-template-columns: 1fr !important; }
}
@media (max-width: 460px) {
  #root .mw-trio { grid-template-columns: 1fr !important; }
}
`;

/* ══════════════ أدوات صغيرة ══════════════ */

const todayIso = () => new Date().toISOString().slice(0, 10);

/** اسم اليوم بالّلغة المختارة — يساعد الجزار يتعرّف على يومه بسرعة. */
const weekday = (iso, isAr) => {
  const d = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString(isAr ? "ar-EG" : "en-GB", { weekday: "long" });
};

/** «اليوم» / «أمس» / اسم اليوم — تسمية بشرية لشريط الأيام. */
function dayTag(iso, isAr, t) {
  if (iso === todayIso()) return t({ en: "Today", ar: "اليوم" });
  if (iso === shiftDays(-1)) return t({ en: "Yesterday", ar: "أمس" });
  return weekday(iso, isAr);
}

/* ── ✅ المعتمد وحده بينحسب ──
   التنفيذ لسّا «بانتظار المشرف» ممكن يترفض، فلو حسبناه بالتصافي والمجاميع
   بيطلع الجزار برقم بيتغيّر تحت إيده. القاعدة هون: **ما بينحسب ولا بتبيّن
   أوزانه** — بيضل ظاهر كسطر مقفول مكتوب عليه إنّه بانتظار الاعتماد، حتى
   ما يظن إنّ شغله ضاع. الملغى نفس الشي: ظاهر معلّم، برّا الحساب. */
const isApproved = (r) => r.reviewStatus === "approved";
const isWaiting = (r) => !isCancelled(r) && !isApproved(r);

/** مجاميع مجموعة صفوف + قائمة القطع المدموجة — من المعتمد وحده. */
function summarize(rows) {
  const list = (rows || []).slice()
    .sort((a, b) => String(b.time).localeCompare(String(a.time)));
  const counted = list.filter((r) => isApproved(r));

  const cuts = new Map();
  counted.forEach((r) => r.cuts.forEach((c) => {
    const k = c.itemId || c.name;
    if (!cuts.has(k)) cuts.set(k, { name: c.name, isWaste: c.isWaste, weightKg: 0 });
    cuts.get(k).weightKg += c.weightKg;
  }));

  return {
    rows: list,
    counted,
    approved: counted.length,
    waiting: list.filter((r) => isWaiting(r)).length,
    cancelled: list.filter((r) => isCancelled(r)).length,
    cutList: [...cuts.values()].sort((a, b) => b.weightKg - a.weightKg),
    // سكور العقدة = متوسّط موزون بالكيلو لتنفيذاتها المعتمدة
    score: avgScore(counted),
    durationMin: counted.reduce((sum, r) => sum + (Number(r.durationMin) || 0), 0),
    pieces: counted.reduce((sum, r) => sum + (Number(r.pieceCount) || 0), 0),
    ...totalsOf(counted),
    count: counted.length,
  };
}

/**
 * تجميع تنفيذات اليوم حسب **المادة الخام** — المستوى الأول باللوح.
 *
 * الجزار بيقطّع نفس الرقبة أربع مرّات بنص ساعة، فكانت تطلعله أربع كروت
 * متطابقة بالعنوان وبيدوّر بينهن على الفرق. صار: كرت واحد للمادة الخام،
 * أوزانه مجموع تنفيذاتها المعتمدة، والباقي بيتفرّع جنبه.
 *
 * المفتاح = كود الصنف (وإلا اسمه).
 */
function groupByInput(list) {
  const map = new Map();
  (list || []).forEach((r) => {
    const key = r.inputItemId || r.inputName || "—";
    if (!map.has(key)) {
      map.set(key, { key, name: r.inputName, sku: r.inputSku || "", rows: [] });
    }
    map.get(key).rows.push(r);
  });

  return [...map.values()]
    .map((g) => ({ ...g, ...summarize(g.rows) }))
    .sort((a, b) => String(b.rows[0]?.time || "").localeCompare(String(a.rows[0]?.time || "")));
}

/**
 * المستوى الثاني — **المسارات**: نفس المادة الخام ممكن تتقطّع بأكثر من
 * تفكيك (pathway). كل مسار عقدة لحالها بأوزانها وقطعها.
 * بوضع المسار الواحد (المسطّح) بيطلع مسار واحد اسمه «التقطيع القياسي».
 */
function pathwaysOf(rows, isAr) {
  const map = new Map();
  (rows || []).forEach((r) => {
    const key = r.pathwayId || r.pathwayCode || r.bomRef || "—";
    if (!map.has(key)) {
      map.set(key, {
        key,
        label: r.pathwayLabel || r.bomRef
          || (isAr ? "التقطيع القياسي" : "Standard breakdown"),
        code: r.pathwayCode || r.bomRef || "",
        name: r.pathwayName || "",
        rows: [],
      });
    }
    map.get(key).rows.push(r);
  });

  return [...map.values()]
    .map((p) => ({ ...p, ...summarize(p.rows) }))
    .sort((a, b) => b.carcassKg - a.carcassKg);
}

/** حلقة التصافي — الرقم الوحيد اللي لازم الجزار يشوفه من بعيد. */
function YieldRing({ pct, label, size = 168 }) {
  const v = Math.max(0, Math.min(100, Number(pct) || 0));
  const stroke = 16;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  return (
    <div style={{ display: "grid", placeItems: "center", position: "relative" }}>
      <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#e6f0f8" strokeWidth={stroke} />
        <circle
          cx={size / 2} cy={size / 2} r={r} fill="none"
          stroke={K.yield} strokeWidth={stroke} strokeLinecap="round"
          strokeDasharray={`${(v / 100) * c} ${c}`}
        />
      </svg>
      <div style={{ position: "absolute", textAlign: "center", lineHeight: 1.1 }}>
        <div className="mw-hero" style={{ fontWeight: 900, color: K.yield }}>
          {v.toFixed(0)}<span style={{ fontSize: ".45em" }}>%</span>
        </div>
        <div className="mw-lbl" style={{ color: K.mut, fontWeight: 800 }}>{label}</div>
      </div>
    </div>
  );
}

/** رقم كبير بخلفية هادئة — الخام / النواتج / الهدر. */
function Fact({ icon, label, value, unit, color }) {
  return (
    <div style={{ ...S.fact, borderTop: `4px solid ${color}` }}>
      <span className="mw-lbl" style={{ color: K.mut, fontWeight: 800 }}>
        {icon} {label}
      </span>
      <span className="mw-num" style={{ color, fontWeight: 900, lineHeight: 1.1 }}>
        {value}
        {unit ? <span style={{ fontSize: ".45em", marginInlineStart: 5 }}>{unit}</span> : null}
      </span>
    </div>
  );
}

/** شريط حصّة قطعة من وزن الخام. */
function ShareBar({ pct, tone }) {
  const v = Math.max(0, Math.min(100, Number(pct) || 0));
  return (
    <span style={S.bar}>
      <i style={{ ...S.barFill, width: `${v}%`, background: tone }} />
    </span>
  );
}

/* ══════════════ الصفحة ══════════════ */

export default function ButcherMyWork() {
  const navigate = useNavigate();
  const { t, isAr, dir, lang, toggle } = useSettingsLang();
  // سجلات لسّا بصندوق الصادر لن تظهر هنا — نوضّح ذلك بدل ما يستغرب الجزار
  const outbox = useOutbox();

  /* ── 👥 مين مسجّل دخول؟ ──
     الحساب المربوط بموظف من «القوى العاملة» — جزار كان أو مشرف — بيفتح على
     شغله هو مباشرة: بلا بوّابة رقم وبلا زر «تغيير الرقم». هالشاشة بتعرض أوزان
     وتصافي شخص باسمه، فحدا مربوط ما بيجوز يكتب رقم زميله ويتفرّج على شغله.
     (المشرف بيشوف شغل جزارينه من لوحة المشرف، مش من هون.)
     الحساب غير المربوط بيشوف الشاشة القديمة حرفياً. */
  const { wf: workforce, loading: wfLoading } = useWorkforce();
  const account = useMemo(() => getCurrentUser(), []);
  const identity = useMemo(
    () => accountIdentity(workforce, account?.username, isAr),
    [workforce, account, isAr]
  );
  const locked = !!identity;

  const [empInput, setEmpInput] = useState(() => {
    try { return localStorage.getItem(LAST_EMP_KEY) || ""; } catch { return ""; }
  });
  const [emp, setEmp] = useState("");          // الرقم المعتمد بعد الضغط
  /* نافذة السحب — ٣٠ يوم افتراضياً.
     الشاشة كانت تسحب ٩٠ يوم من **كل الملاحم** (بالـpayload كامل) وتفلتر
     بالمتصفّح على رقم واحد: أثقل طلب بالنظام لأقل فائدة، وعلى كشك بالملحمة.
     صار: نافذة أقصر افتراضياً + الرقم بينمرق للسيرفر + ما في سحب قبل ما
     نعرف الرقم. مين بدّه أبعد بيضغط ٩٠ بنفسه. */
  const [win, setWin] = useState(30);
  const [selDay, setSelDay] = useState("");    // اليوم المعروض
  const [mode, setMode] = useState("list");    // list = تفاصيل ، card = بطاقة التقطيع
  const [printJob, setPrintJob] = useState(null);

  /* الرقم بيتثبّت من السجل — وبيتحدّث لحاله لو المشرف عدّل عليه. */
  useEffect(() => {
    if (!identity) return;
    setEmp(identity.empNo);
    setEmpInput(identity.empNo);
  }, [identity]);

  /* ── السحب ── ما بينطلب إشي قبل ما نعرف الرقم، والرقم بينمرق للسيرفر. */
  const { records, loading, error, reload, cfg, mrpCfg } = useButcherData({
    from: shiftDays(-(win - 1)),
    employeeNo: emp,
    enabled: !!emp,
  });

  /* التطبيع بعد الفلترة لا قبلها: كنّا نطبّع سجلات كل الملاحم عشان نعرض
     واحد. الفلترة هون على السجل الخام (payload.employeeNo) لأنّ الاسم
     المطبَّع ما بينوجد إلا بعد التطبيع نفسه. */
  const mineRecords = useMemo(
    () => (emp
      ? records.filter((r) => String(r?.payload?.employeeNo ?? "").trim() === emp)
      : []),
    [records, emp]
  );
  const all = useNormalizedRows(mineRecords, { cfg, mrpCfg, isAr });

  /* الجزار بيشوف شغله كلّه — حتى الملغى منه، بشارة «ملغاة» واضحة. إخفاء
     عملية بلا أثر بيخلّي الواحد يشك بأرقامه؛ الأنضف إنها تبيّن بحالتها.
     بس **ما بتنحسب**: المجاميع والتصافي من الشغل الحيّ وحده. */
  const viewer = useRowViewer(isAr);
  /* السكور بينحسب على كل الصفوف المرئية مرّة وحدة — مراجع السرعة بدها
     المجموعة كاملة (وسيط الدقائق/كجم لكل مسار)، فما بينحسب جوّا الكرت. */
  const mine = useMemo(
    () => attachScores(all.filter((r) => canSeeRow(r, viewer))),
    [all, viewer],
  );
  /* المعتمد وحده بينحسب — الملغى والمنتظر ظاهرين، برّا كل رقم */
  const counted = useMemo(() => mine.filter((r) => isApproved(r)), [mine]);
  const waiting = useMemo(() => mine.filter((r) => isWaiting(r)).length, [mine]);

  const meRow = mine[0] || null;
  /* الاسم والفرع بيجوا من السجلات نفسها — فلو الفترة المختارة طلعت فاضية
     بيرجع الكرت يكتب «#934» بلا اسم ولا فرع. نحتفظ بآخر هويّة عرفناها
     لنفس الرقم، فيضل الجزار شايف اسمه وهو بيبدّل الفترات. */
  const lastMe = useRef({ emp: "", me: null });
  useEffect(() => {
    if (!emp) { lastMe.current = { emp: "", me: null }; return; }
    if (lastMe.current.emp !== emp) lastMe.current = { emp, me: null };
    if (meRow) lastMe.current = { emp, me: meRow };
  }, [emp, meRow]);
  const me = meRow || (lastMe.current.emp === emp ? lastMe.current.me : null);

  const totals = useMemo(() => totalsOf(counted), [counted]);

  /* تجميع حسب اليوم — الأحدث أولاً */
  const days = useMemo(() => {
    const map = new Map();
    mine.forEach((r) => {
      if (!map.has(r.day)) map.set(r.day, []);
      map.get(r.day).push(r);
    });
    return [...map.entries()]
      .map(([day, list]) => ({
        day,
        list: list.slice().sort((a, b) => String(b.time).localeCompare(String(a.time))),
        // المجاميع من المعتمد وحده — المنتظر والملغى ظاهرين، برّا الحساب
        ...summarize(list),
      }))
      .sort((a, b) => b.day.localeCompare(a.day));
  }, [mine]);

  /* افتح آخر يوم تلقائياً — الجزار يدخل فيلقى يومه أمامه بلا ضغطة زائدة */
  useEffect(() => {
    setSelDay((cur) =>
      cur && days.some((d) => d.day === cur) ? cur : (days[0]?.day || "")
    );
  }, [days]);

  const day = days.find((d) => d.day === selDay) || days[0] || null;

  /* خصائص البطاقة ليوم واحد — للعرض وللطباعة معاً */
  const cardProps = (d) => ({
    // بطاقة التقطيع وثيقة شغل — الملغى والمنتظر ما إلهن مكان عالورق:
    // ما ينطبع إلا اللي اعتمده المشرف
    rows: d.list.filter((r) => isApproved(r)),
    day: d.day,
    isAr,
    butcherName: me?.butcherName || "",
    employeeNo: emp,
    branchName: me?.branchName || "",
  });

  const start = () => {
    const v = empInput.trim();
    if (!v) return;
    try { localStorage.setItem(LAST_EMP_KEY, v); } catch { /* ignore */ }
    setEmp(v);
    setSelDay("");
  };

  const KG = t({ en: "kg", ar: "كجم" });

  const WINDOWS = [
    { d: 7,  ar: "٧ أيام",  en: "7 days" },
    { d: 30, ar: "٣٠ يوم",  en: "30 days" },
    { d: 90, ar: "٩٠ يوم",  en: "90 days" },
  ];

  if (!canOpenButcherPage("butcher.mywork")) return <NoAccess page="butcher.mywork" />;

  return (
    <div dir={dir} className="mw" style={S.page}>
      <style>{CSS + CARD_CSS}</style>
      <CuttingCardPrint job={printJob} onDone={() => setPrintJob(null)} />

      {/* الشاشة كلها بعرض الجهاز — اللوح وبطاقة التقطيع سوا. مقاس الورقة
          بالطباعة محكوم بنسخة `.cc-portal` وحدها، فتوسيع العرض هون ما
          بيأثّر على الـPDF. */}
      <div style={{ ...S.wrap, maxWidth: "none" }}>

        {/* ── الترويسة ── */}
        <div style={S.header}>
          <div className="mw-title" style={{ fontWeight: 900 }}>
            👤 {t({ en: "My work", ar: "شغلي" })}
          </div>
          <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
            <LangToggle lang={lang} toggle={toggle} style={S.smallBtn} />
            {emp && !locked && (
              <button className="mw-sm" style={S.smallBtn} onClick={() => { setEmp(""); setSelDay(""); }}>
                {t({ en: "Change number", ar: "تغيير الرقم" })}
              </button>
            )}
            <button className="mw-sm" style={S.smallBtn} onClick={() => navigate("/butcher", { replace: true })}>
              {t({ en: "Back", ar: "رجوع" })}
            </button>
          </div>
        </div>

        {/* ── فحص الحساب ── سجل القوى العاملة بيوصل بعد أول رسمة؛ لولا
            هالانتظار، الجزار المربوط بيشوف بوابة الرقم تلمع بوجهه ثانية
            وبعدين تختفي. */}
        {!emp && wfLoading && (
          <div style={S.card}>
            <div className="mw-sm" style={{ textAlign: "center", color: K.mut, fontWeight: 800 }}>
              {t({ en: "Opening your work…", ar: "جارٍ فتح شغلك…" })}
            </div>
          </div>
        )}

        {/* ── بوّابة الرقم الوظيفي ── */}
        {!emp && !locked && !wfLoading && (
          <div style={S.gate}>
            <div style={S.gateIcon}>🔪</div>
            <div className="mw-day" style={{ fontWeight: 900, textAlign: "center" }}>
              {t({ en: "Enter your employee number", ar: "أدخل رقمك الوظيفي" })}
            </div>
            <input
              className="mw-num"
              value={empInput}
              onChange={(e) => setEmpInput(e.target.value.replace(/\D/g, ""))}
              onKeyDown={(e) => e.key === "Enter" && start()}
              inputMode="numeric"
              autoFocus
              placeholder="0000"
              style={S.input}
            />
            <button
              className="mw-big"
              onClick={start}
              disabled={!empInput.trim()}
              style={{ ...S.primary, ...(empInput.trim() ? null : S.disabled) }}
            >
              {t({ en: "Show my work", ar: "اعرض شغلي" })}
            </button>
          </div>
        )}

        {emp && (
          <>
            {/* ── هويّة الجزار ── */}
            <div className="mw-rise" style={S.who}>
              <span style={S.avatar}>👤</span>
              <span style={{ minWidth: 0, flex: 1 }}>
                <span className="mw-day" style={{ fontWeight: 900, display: "block" }}>
                  {me?.butcherName || identity?.name || `#${emp}`}
                </span>
                <span className="mw-lbl" style={{ color: K.mut, fontWeight: 800 }}>
                  #{emp}{me?.branchName ? ` · ${me.branchName}` : ""}
                </span>
              </span>
              {!loading && !error && (
                <span className="mw-lbl" style={S.periodChip}>
                  {isAr ? `آخر ${win} يوم` : `last ${win} days`} · {totals.count}{" "}
                  {t({ en: "jobs", ar: "تنفيذ" })}
                </span>
              )}
            </div>

            {outbox.pending > 0 && (
              <div className="mw-sm" style={S.pendingNote}>
                📤 {outbox.pending}{" "}
                {t({
                  en: "record(s) still on this device — not uploaded yet, so they are not shown below.",
                  ar: "سجل لسّا على الجهاز — ما ترفع بعد، فما بيبيّن تحت.",
                })}{" "}
                {outbox.online && (
                  <button type="button" style={S.linkBtn} onClick={outbox.sync} disabled={outbox.syncing}>
                    {outbox.syncing
                      ? t({ en: "Syncing…", ar: "جارٍ المزامنة…" })
                      : t({ en: "Sync now", ar: "زامن الآن" })}
                  </button>
                )}
              </div>
            )}

            {/* ── 🏆 أدائي ── كرت مطويّ بأعلى الشاشة: نتيجتي وترتيبي
                بملحمتي وعلى مستوى كل الملاحم، والتفاصيل بضغطة. أرقام باقي
                الجزارين بتيجي مجمّعة من السيرفر (butcher-stats)، مش بسحب
                سجلاتهم على الكشك. */}
            <ButcherPerformance empNo={emp} t={t} isAr={isAr} KG={KG} />

            {/* ── مدى السحب ── فوق كل شي: هالفلاتر ما بتختفي لو الفترة طلعت
                فاضية، وإلا بيعلق الجزار بشاشة بلا أي طريقة يرجع فيها. */}
            <div style={S.winBar}>
              <span className="mw-lbl" style={{ color: K.mut, fontWeight: 800 }}>
                {t({ en: "Period", ar: "الفترة" })}
              </span>
              {WINDOWS.map((w) => (
                <button
                  key={w.d}
                  type="button"
                  className="mw-sm mw-press"
                  onClick={() => setWin(w.d)}
                  style={{ ...S.winBtn, ...(win === w.d ? S.winBtnOn : null) }}
                >
                  {t(w)}
                </button>
              ))}
            </div>

            {/* ⏳ شغل لسّا بانتظار المشرف — ظاهر ومقفول، وما بينحسب */}
            {!loading && !error && waiting > 0 && (
              <div className="mw-sm" style={S.waitNote}>
                🔒 {waiting}{" "}
                {t({
                  en: "job(s) are still waiting for the supervisor's approval — their weights and yield are hidden and are NOT counted in any total until they are approved.",
                  ar: "تنفيذ لسّا بانتظار موافقة المشرف — أوزانه وتصافيه مخفيّة و**ما بتنحسب** بأي مجموع لحدّ ما تنعتمد.",
                })}
              </div>
            )}

            {loading ? (
              <div style={S.card}>
                <div className="mw-sm" style={{ textAlign: "center", color: K.mut, fontWeight: 800 }}>
                  {t({ en: "Loading…", ar: "جارٍ التحميل…" })}
                </div>
              </div>
            ) : error ? (
              /* لا نقول «ما في سجلات» والتحميل فشل — السجلات موجودة ولم تصل */
              <div style={S.errorBox}>
                <div>⚠️ {explainError(error, t)}</div>
                <code style={{ opacity: 0.65, fontWeight: 700, fontSize: ".85em" }}>
                  {String(error)}
                </code>
                <button type="button" className="mw-sm" style={S.smallBtn} onClick={reload}>
                  ↻ {t({ en: "Try again", ar: "إعادة المحاولة" })}
                </button>
              </div>
            ) : !mine.length ? (
              /* فترة فاضية غير «ما في سجلات أبداً» — نسمّي الفترة بالرسالة
                 ونعطي طريق أوسع بضغطة، والفلاتر فوق ضلّت مكانها. */
              <div style={S.empty}>
                <div style={{ fontSize: "2.2em", marginBottom: 8 }}>🗒️</div>
                {isAr
                  ? `ما في سجلات تقطيع لهذا الرقم بآخر ${win} يوم.`
                  : `No cutting records for this number in the last ${win} days.`}
                {win < 90 && (
                  <div style={{ marginTop: 14 }}>
                    <button
                      type="button"
                      className="mw-sm mw-press"
                      style={S.smallBtn}
                      onClick={() => setWin(90)}
                    >
                      {t({ en: "Search the last 90 days", ar: "ابحث بآخر ٩٠ يوم" })}
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <>
                {/* ── شريط الأيام ── */}
                <div className="mw-lbl" style={S.sectionLbl}>
                  {t({ en: "Pick a day", ar: "اختر اليوم" })}
                </div>
                <div className="mw-days">
                  {days.map((d) => {
                    const on = d.day === selDay;
                    return (
                      <button
                        key={d.day}
                        type="button"
                        className="mw-press"
                        onClick={() => setSelDay(d.day)}
                        style={{ ...S.dayChip, ...(on ? S.dayChipOn : null) }}
                      >
                        <span className="mw-sm" style={{ fontWeight: 900 }}>
                          {dayTag(d.day, isAr, t)}
                        </span>
                        <span className="mw-lbl" style={{ opacity: on ? 0.85 : 0.7, fontWeight: 800 }}>
                          {d.day}
                        </span>
                        <span className="mw-lbl" style={{ fontWeight: 900 }}>
                          {d.count} {t({ en: "jobs", ar: "تنفيذ" })} · {kg(d.carcassKg)} {KG}
                          {d.waiting > 0 ? ` · 🔒 ${d.waiting}` : ""}
                        </span>
                      </button>
                    );
                  })}
                </div>

                {/* ── لوحة اليوم: التصافي بالوسط وثلاثة أرقام حوله ── */}
                {day && (
                  <div className="mw-rise" style={S.hero}>
                    <div className="mw-heroGrid" style={S.heroGrid}>
                      <YieldRing
                        pct={day.yieldPct}
                        label={t({ en: "Net yield", ar: "نسبة التصافي" })}
                      />
                      <div style={{ minWidth: 0 }}>
                        <div className="mw-day" style={{ fontWeight: 900, display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
                          <span>{dayTag(day.day, isAr, t)} · {day.day}</span>
                          {/* سكور اليوم — متوسّط موزون بالكيلو لتنفيذاته المعتمدة */}
                          {day.count > 0 && <ScoreChip value={day.score} t={t} big />}
                        </div>
                        <div className="mw-lbl" style={{ color: K.mut, fontWeight: 800, marginBottom: 12 }}>
                          {weekday(day.day, isAr)} · {day.count} {t({ en: "jobs", ar: "تنفيذ" })}
                        </div>
                        <div className="mw-trio" style={S.trio}>
                          <Fact icon="🥩" color={K.raw} label={t({ en: "Raw", ar: "الخام" })}
                            value={kg(day.carcassKg)} unit={KG} />
                          <Fact icon="✅" color={K.good} label={t({ en: "Products", ar: "النواتج" })}
                            value={kg(day.cutsKg)} unit={KG} />
                          <Fact icon="🦴" color={K.waste} label={t({ en: "Waste", ar: "الهدر" })}
                            value={kg(day.wasteKg)} unit={KG} />
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* ── شكل العرض + الطباعة ── */}
                {day && (
                  <div style={S.viewBar}>
                    <span style={S.seg}>
                      <button
                        type="button"
                        className="mw-sm"
                        onClick={() => setMode("list")}
                        style={{ ...S.segBtn, ...(mode === "list" ? S.segOn : null) }}
                      >
                        📋 {t({ en: "My jobs", ar: "تنفيذاتي" })}
                      </button>
                      <button
                        type="button"
                        className="mw-sm"
                        onClick={() => setMode("card")}
                        style={{ ...S.segBtn, ...(mode === "card" ? S.segOn : null) }}
                      >
                        🧾 {t({ en: "Cutting card", ar: "بطاقة التقطيع" })}
                      </button>
                    </span>
                    <button
                      type="button"
                      className="mw-sm"
                      style={S.printBtn}
                      onClick={() => setPrintJob(cardProps(day))}
                    >
                      🖨️ {t({ en: "Print card", ar: "طباعة البطاقة" })}
                    </button>
                  </div>
                )}

                {/* ── المحتوى ── */}
                {day && mode === "card" && (
                  <div className="mw-rise"><CuttingCard {...cardProps(day)} /></div>
                )}

                {day && mode === "list" && (
                  <CascadeBoard day={day} t={t} isAr={isAr} KG={KG} />
                )}

              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}

/* ══════════════ اللوح الثلاثي (المادة → المسار → التفاصيل) ══════════════
   المستوى الأول عمود على طرف الشاشة: المادة الخام. بضغطة بيفتح **جنبه**
   عمود مساراتها (طرق التفكيك)، والمسار بيفتح جنبه قطعه وتنفيذاته.
   ما في شي بينفتح تحت السطر: كل مستوى عمود، والعين بتمشي من الطرف للداخل.
   المعتمد وحده بيعطي أرقام؛ المنتظر بيطلع سطر مقفول، والملغى معلّم. */

function CascadeBoard({ day, t, isAr, KG }) {
  const groups = useMemo(() => groupByInput(day.list), [day.list]);
  const [gKey, setGKey] = useState("");
  const [pKey, setPKey] = useState("");

  /* يوم جديد: لو نفس المادة موجودة بتضل مختارة، وإلا بيرجع الاختيار فاضي.
     ومادة وحدة باليوم = ما في قرار: بتنفتح لحالها. */
  useEffect(() => {
    setGKey((cur) => {
      if (groups.length === 1) return groups[0].key;
      return groups.some((x) => x.key === cur) ? cur : "";
    });
  }, [groups]);

  const g = groups.find((x) => x.key === gKey) || null;
  const paths = useMemo(() => (g ? pathwaysOf(g.rows, isAr) : []), [g, isAr]);

  /* مسار واحد معتمد = ما في قرار يتاخد: بينفتح لحاله بدل ضغطة بلا معنى.
     المسار المقفول (بلا اعتماد) ما بينفتح لا بالضغط ولا لحاله. */
  useEffect(() => {
    setPKey((cur) => {
      if (paths.length === 1 && paths[0].approved > 0) return paths[0].key;
      return paths.some((x) => x.key === cur && x.approved > 0) ? cur : "";
    });
  }, [paths]);

  const p = paths.find((x) => x.key === pKey) || null;
  const arrow = isAr ? "‹" : "›";

  /* ── ما بنكرّر نفس الأرقام بعمودين ──
     مسار واحد = أرقامه هي أرقام المادة حرفياً، فعمود المسارات بيصير نسخة
     ثانية من الكرت اللي قبله. بهالحالة بينشال العمود، واللوح بيصير
     عمودين، واسم المسار بيتذكر بترويسة التفاصيل. عمود المسارات بيرجع
     يطلع بس لمّا يكون في **أكثر من مسار** — وقتها هو قرار حقيقي. */
  const manyPaths = paths.length > 1;
  const showPaths = !g || manyPaths;

  return (
    <div className={`mw-board mw-rise${showPaths ? "" : " mw-board-2"}`}>
      {/* ① المادة الخام */}
      <div className="mw-pane mw-pane-master">
        <PaneHead n="①" label={t({ en: "Raw material", ar: "المادة الخام" })} count={groups.length} />
        {groups.map((x) => (
          <NodeCard
            key={x.key}
            on={x.key === gKey}
            arrow={arrow}
            title={x.name}
            sub={[
              `${x.rows.length} ${t({ en: "jobs", ar: "تنفيذ" })}`,
              x.durationMin > 0 ? `⏱️ ${x.durationMin} ${t({ en: "min", ar: "دقيقة" })}` : "",
              x.pieces > 0 ? `${t({ en: "pieces", ar: "قطع" })} ${x.pieces}` : "",
            ].filter(Boolean).join(" · ")}
            node={x}
            t={t}
            KG={KG}
            /* مادة بمسار وحيد = هي آخر مستوى، فنواتجها بتنكتب جوّاها */
            showCuts={x.key === gKey && !manyPaths}
            stats={[
              { label: t({ en: "Raw", ar: "الخام" }), value: `${kg(x.carcassKg)} ${KG}`, tone: K.raw },
              { label: t({ en: "Yield", ar: "التصافي" }), value: `${x.yieldPct.toFixed(1)}%`, tone: K.yield },
              { label: t({ en: "Products", ar: "النواتج" }), value: `${kg(x.cutsKg)} ${KG}`, tone: K.good },
              { label: t({ en: "Waste", ar: "الهدر" }), value: `${kg(x.wasteKg)} ${KG}`, tone: K.waste },
            ]}
            onClick={() => setGKey((cur) => (cur === x.key ? "" : x.key))}
          />
        ))}
      </div>

      {/* ② المسارات — بس لمّا يكون فيه أكثر من مسار */}
      {showPaths && (
        <div className="mw-pane mw-pane-paths">
          <PaneHead
            n="②"
            label={t({ en: "Breakdown pathway", ar: "مسار التفكيك" })}
            count={g ? paths.length : null}
          />
          {!g ? (
            <div style={S.hintBox}>
              {t({
                en: "Pick a raw material to see how it was broken down.",
                ar: "اضغط مادة خام ليطلعوا مساراتها هون.",
              })}
            </div>
          ) : (
            paths.map((x) => {
              /* الأرقام هون **مقارنة**: قدّيش أخد هالمسار من خام المادة،
                 وشو تصافيه — مش تكرار لمجاميع الكرت اللي قبله. */
              const share = g.carcassKg > 0 ? (x.carcassKg / g.carcassKg) * 100 : 0;
              return (
                <NodeCard
                  key={x.key}
                  on={x.key === pKey}
                  arrow={arrow}
                  title={x.label}
                  sub={[
                    `${x.rows.length} ${t({ en: "jobs", ar: "تنفيذ" })}`,
                    `${kg(x.carcassKg)} ${KG}`,
                  ].join(" · ")}
                  node={x}
                  t={t}
                  KG={KG}
                  showCuts={x.key === pKey}
                  stats={[
                    {
                      label: t({ en: "Share of raw", ar: "من خام المادة" }),
                      value: `${share.toFixed(0)}%`,
                      tone: K.raw,
                    },
                    { label: t({ en: "Yield", ar: "التصافي" }), value: `${x.yieldPct.toFixed(1)}%`, tone: K.yield },
                  ]}
                  onClick={() => setPKey((cur) => (cur === x.key ? "" : x.key))}
                />
              );
            })
          )}
        </div>
      )}

      {/* ③ التفاصيل */}
      <div className="mw-pane mw-pane-detail">
        <PaneHead
          n={showPaths ? "③" : "②"}
          label={t({ en: "Details", ar: "التفاصيل" })}
          count={p ? p.rows.length : null}
        />
        {!p ? (
          <div style={S.hintBox}>
            {manyPaths
              ? t({
                  en: "Pick a pathway to see its products, waste and jobs.",
                  ar: "اضغط مسار لتطلع نواتجه وهدره وتنفيذاته.",
                })
              : t({
                  en: "Pick a raw material to see its products, waste and jobs.",
                  ar: "اضغط مادة خام لتطلع نواتجها وهدرها وتنفيذاتها.",
                })}
          </div>
        ) : (
          <PathDetail g={g} p={p} t={t} isAr={isAr} KG={KG} single={!manyPaths} />
        )}
      </div>
    </div>
  );
}

/** عنوان عمود — رقم المستوى واسمه وعدد عناصره. */
function PaneHead({ n, label, count }) {
  return (
    <div className="mw-paneHead">
      <span className="mw-lbl" style={S.paneTitle}>{n} {label}</span>
      {count !== null && count !== undefined && (
        <span className="mw-lbl" style={S.paneCount}>{count}</span>
      )}
    </div>
  );
}

/** كرت عقدة — نفس الشكل للمادة الخام وللمسار: عنوان وأرقام مصغّرة وحالة.
    ما فيه ولا تنفيذ معتمد = **مقفول**: ما بينفتح، وأرقامه وراء غباش بلوري
    مكتوب عليه راجع المشرف. أول ما يوافق المشرف بيصير كرت عادي بينفتح. */
function NodeCard({ on, arrow, title, sub, node, stats, t, KG, showCuts = false, onClick }) {
  const shut = node.approved === 0 && node.waiting > 0;   // مقفول لحدّ الاعتماد
  const [bump, setBump] = useState(false);                // هزّة عند الضغط عليه
  const edge = node.approved > 0 ? K.okFg : node.waiting > 0 ? K.waitFg : "#dc2626";

  const press = () => {
    if (!shut) { onClick(); return; }
    setBump(true);
    window.setTimeout(() => setBump(false), 420);
  };

  return (
    <button
      type="button"
      className={`mw-press${bump ? " mw-shake" : ""}`}
      onClick={press}
      aria-expanded={shut ? undefined : on}
      aria-disabled={shut || undefined}
      style={{
        ...S.node,
        borderInlineStartColor: edge,
        ...(on ? S.nodeOn : null),
        ...(shut ? S.nodeShut : null),
      }}
    >
      <span style={S.nodeTop}>
        <span style={{ minWidth: 0, flex: 1 }}>
          <span className="mw-day" style={{ fontWeight: 900, display: "block", lineHeight: 1.25 }}>
            {title}
          </span>
          {sub ? (
            <span className="mw-lbl" style={{ color: on ? "#cfe3f7" : K.mut, fontWeight: 800 }}>
              {sub}
            </span>
          ) : null}
        </span>
        <span className="mw-big" style={{ color: on ? "#fff" : K.mut, fontWeight: 900 }}>
          {shut ? "🔒" : arrow}
        </span>
      </span>

      {/* الأرقام — من المعتمد وحده، ووراء الغباش لو ما في معتمد */}
      <span className={shut ? "mw-lock mw-lock-sm" : undefined} style={{ display: "block" }}>
        <span className={shut ? "mw-lockBody" : undefined} style={{ display: "block" }}>
          <span className="mw-mini">
            {stats.map((s) => (
              <Mini key={s.label} label={s.label} value={s.value} tone={s.tone} on={on} />
            ))}
          </span>
        </span>
        {shut && (
          <span className="mw-lockGlass">
            <span className="mw-sm" style={{ fontWeight: 900 }}>
              🔒 {t({ en: "Waiting for the supervisor", ar: "بانتظار موافقة المشرف" })}
            </span>
            <span className="mw-lbl" style={{ fontWeight: 800 }}>
              {t({ en: "It opens once he approves it", ar: "يرجى مراجعة المشرف — بينفتح بعد موافقته" })}
            </span>
          </span>
        )}
      </span>

      {/* ── النواتج والهدر جوّا الكرت ──
          هاي الأرقام تبع هالعقدة بالذات، فمحلّها جوّاها لا بعمود التفاصيل:
          عمود التفاصيل للتنفيذات المفردة. بتطلع لمّا يكون الكرت مفتوح
          وهو **آخر مستوى** (مسار مختار، أو مادة بمسار وحيد). */}
      {showCuts && node.cutList.length > 0 && (
        <span style={{ ...S.nodeCuts, ...(on ? S.nodeCutsOn : null) }}>
          <span className="mw-lbl" style={{ color: on ? "#cfe3f7" : K.mut, fontWeight: 900 }}>
            {t({ en: "Products & waste", ar: "النواتج والهدر" })} · {node.cutList.length}
          </span>
          {node.cutList.map((c, i) => {
            const cutBase = node.carcassKg > 0 ? node.carcassKg : node.cutsKg + node.wasteKg;
            const share = cutBase > 0 ? (c.weightKg / cutBase) * 100 : 0;
            return (
              <span key={`${c.name}_${i}`} className="mw-nodeCut">
                <span className="mw-sm" style={{ fontWeight: 800, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis" }}>
                  {c.isWaste ? "🦴 " : "✅ "}{c.name}
                </span>
                <span className="mw-sm" style={{ fontWeight: 900, whiteSpace: "nowrap", color: on ? "#fff" : (c.isWaste ? K.waste : K.good) }}>
                  {kg(c.weightKg)} {KG}
                </span>
                <span className="mw-lbl" style={{ color: on ? "#cfe3f7" : K.mut, fontWeight: 900, textAlign: "end" }}>
                  {share.toFixed(0)}%
                </span>
              </span>
            );
          })}
        </span>
      )}

      <span style={S.nodeBadges}>
        {node.approved > 0 && <ScoreChip value={node.score} t={t} />}
        {node.approved > 0 && (
          <span className="mw-lbl" style={S.badgeOk}>✓ {node.approved}</span>
        )}
        {node.waiting > 0 && (
          <span className="mw-lbl" style={S.badgeWait}>🔒 {node.waiting}</span>
        )}
        {node.cancelled > 0 && (
          <span className="mw-lbl" style={S.badgeCancelled}>🚫 {node.cancelled}</span>
        )}
      </span>
    </button>
  );
}

/** 🎯 شارة السكور — رقم من ١٠٠ بلون نطاقه. بلا نسب معيارية بتطلع «—». */
function ScoreChip({ value, t, big = false }) {
  const c = scoreTone(value);
  return (
    <span
      className={big ? "mw-sm" : "mw-lbl"}
      style={{
        background: c.bg, border: `1px solid ${c.bd}`, color: c.fg,
        borderRadius: 999, padding: big ? "4px 14px" : "3px 12px",
        fontWeight: 900, whiteSpace: "nowrap",
      }}
      title={value === null
        ? t({ en: "This recipe has no standard percentages", ar: "هالوصفة ما إلها نسب معيارية" })
        : t({ en: "Cutting score out of 100", ar: "سكور التقطيع من ١٠٠" })}
    >
      🎯 {value === null ? "—" : value}
      {value === null ? "" : <span style={{ opacity: 0.7 }}>/100</span>}
    </span>
  );
}

/** رقم مصغّر جوّا كرت العقدة. */
function Mini({ label, value, tone, on }) {
  return (
    <span style={{ ...S.mini, ...(on ? S.miniOn : null) }}>
      <span className="mw-lbl" style={{ color: on ? "#cfe3f7" : K.mut, fontWeight: 800, display: "block" }}>
        {label}
      </span>
      <span className="mw-sm" style={{ color: on ? "#fff" : tone, fontWeight: 900 }}>{value}</span>
    </span>
  );
}

/** المستوى الأخير — **التنفيذات المفردة** للمسار المختار.
    مجموع نواتجه وهدره مكتوب جوّا كرت المسار نفسه، فما بينعاد هون. */
function PathDetail({ g, p, t, isAr, KG, single = false }) {
  const approvedRows = p.rows.filter((r) => isApproved(r));
  const waitingRows = p.rows.filter((r) => isWaiting(r));
  const cancelledRows = p.rows.filter((r) => isCancelled(r));
  const shown = [...approvedRows, ...cancelledRows];

  return (
    <div style={S.detailWrap}>
      <div style={S.detailTop}>
        <span className="mw-day" style={{ fontWeight: 900 }}>{g.name}</span>
        <span className="mw-lbl" style={{ color: K.mut, fontWeight: 800 }}>
          {/* مسار واحد = ما إله عمود، فاسمه بينذكر هون */}
          🛤️ {p.label}
          {single ? ` · ${t({ en: "single pathway", ar: "مسار وحيد" })}` : ""}
          {" · "}{p.approved} {t({ en: "approved job(s)", ar: "تنفيذ معتمد" })}
        </span>
      </div>
      {/* 🔒 المنتظر — ظاهر بلا أرقام، وواضح ليش */}
      {waitingRows.length > 0 && (
        <div style={S.detailPanel}>
          <div className="mw-lbl" style={S.detailPanelHead}>
            {t({ en: "Waiting for approval", ar: "بانتظار الاعتماد" })} · {waitingRows.length}
          </div>
          {waitingRows.map((r) => (
            <GlassLock key={r.id} t={t}>
              <JobCard r={r} t={t} isAr={isAr} KG={KG} nested />
            </GlassLock>
          ))}
        </div>
      )}

      {shown.length > 0 && (
        <div style={S.detailPanel}>
          <div className="mw-lbl" style={S.detailPanelHead}>
            {t({ en: "Jobs", ar: "التنفيذات" })} · {shown.length}
          </div>
          {shown.map((r, i) => (
            <JobCard
              key={r.id}
              r={r} t={t} isAr={isAr} KG={KG}
              nested n={i + 1} total={shown.length}
            />
          ))}
        </div>
      )}
    </div>
  );
}

/** القفل البلوري — الكرت الحقيقي وراء طبقة غباش.
    إخفاء التنفيذ بالكامل بيخلّي الجزار يظن إنّ شغله ضاع، وإظهار أرقامه
    بيعطيه رقم ممكن يترفض بكرة. فبيضل ظاهر وراء الغباش: بتعرف إنّه موجود
    وما بتقرا منه رقم، ولمّا يوافق المشرف بينزاح الغباش لحاله. */
function GlassLock({ t, children }) {
  return (
    <div className="mw-lock">
      <div className="mw-lockBody">{children}</div>
      <div className="mw-lockGlass">
        <span className="mw-day" style={{ fontWeight: 900 }}>
          🔒 {t({ en: "Waiting for the supervisor's approval", ar: "بانتظار موافقة المشرف" })}
        </span>
        <span className="mw-sm" style={{ fontWeight: 800 }}>
          {t({
            en: "Please ask your supervisor to review it — it opens with its numbers once he approves.",
            ar: "يرجى مراجعة المشرف للموافقة عليه — بينفتح بأرقامه بعد الاعتماد.",
          })}
        </span>
      </div>
    </div>
  );
}


/* ══════════════ كرت تنفيذ واحد ══════════════
   ترويسة فيها المادة الخام ورقم العملية والحالة، بعدين جدول القطع بشريط حصّة،
   وبآخره شريط الأرقام. بلا شرائح متراصّة ولا بانرات ملوّنة. */

function JobCard({ r, t, isAr, KG, nested = false, n = 0, total = 0 }) {
  const approved = r.reviewStatus === "approved";
  const rejected = r.reviewStatus === "rejected";   // سجلات قديمة فقط
  const cancelled = isCancelled(r);
  const base = r.carcassKg > 0 ? r.carcassKg : r.cutsKg + r.wasteKg;
  // حدّ التنفيذ بلون حالته — أخضر مقبول · كهرماني مستنّي · أحمر ملغى
  const edge = cancelled ? "#dc2626" : approved ? K.okFg : K.waitFg;

  return (
    <div style={{
      ...S.job,
      borderInlineStartColor: edge,
      ...(nested ? S.jobNested : null),
      ...(cancelled ? { opacity: 0.75 } : null),
    }}>
      {/* الترويسة — الاسم فوق، وتحته سطر واحد: معلومات التنفيذ على أوّله،
          ورقم العملية وحالته على آخره. الاتنين فوق، ما بينزلوا. */}
      <div style={S.jobHead}>
        <div style={S.jobTitleRow}>
          <span className="mw-day" style={{ fontWeight: 900, minWidth: 0, flex: 1 }}>
            {nested && n > 0 && (
              <span className="mw-lbl" style={{ ...S.opIndex, background: edge }}>
                {isAr ? `تنفيذ ${n}${total > 1 ? ` من ${total}` : ""}`
                      : `Job ${n}${total > 1 ? ` of ${total}` : ""}`}
              </span>
            )}
            {r.inputName}
          </span>

          {/* خانتين بأعلى طرف الكرت — الوزن والقطع: أوّل شي بتلمحه العين
              قبل ما تقرا التفاصيل، وفوق رقم العملية وحالته. */}
          <span style={S.jobBoxes}>
            <span style={S.jobBox}>
              <span className="mw-lbl" style={{ color: K.mut, fontWeight: 800 }}>
                {t({ en: "Weight", ar: "الوزن" })}
              </span>
              <span className="mw-sm" style={{ color: K.raw, fontWeight: 900 }}>
                {kg(r.carcassKg)} {KG}
              </span>
            </span>
            <span style={S.jobBox}>
              <span className="mw-lbl" style={{ color: K.mut, fontWeight: 800 }}>
                {t({ en: "Pieces", ar: "القطع" })}
              </span>
              <span className="mw-sm" style={{ color: K.ink, fontWeight: 900 }}>
                {r.pieceCount !== null
                  ? r.pieceCount
                  : r.partialPiece
                    ? t({ en: "part", ar: "جزء" })
                    : "—"}
              </span>
            </span>
          </span>
        </div>

        <div style={S.jobMeta}>
          <span className="mw-lbl" style={{ color: K.mut, fontWeight: 800, minWidth: 0 }}>
            🕒 {r.time || "—"}
            {r.bomRef ? ` · ${r.bomRef}` : ""}
            {r.pathwayCode ? ` · 🛤️ ${r.pathwayCode}` : ""}
            {r.durationMin > 0 ? ` · ⏱️ ${r.durationMin} ${t({ en: "min", ar: "دقيقة" })}` : ""}
            {r.rawExpiry ? ` · 📅 ${t({ en: "exp", ar: "ينتهي" })} ${r.rawExpiry}` : ""}
          </span>
          <span style={S.jobChips}>
            {/* السكور بيطلع للمعتمد وحده — المنتظر مقفول أصلاً */}
            {approved && <ScoreChip value={r.score} t={t} />}
            {r.opNo && <span className="mw-lbl" style={S.opNoChip}>{r.opNo}</span>}
            {/* طلب إلغاء مرفوع على هالعملية — شغلك لسّا محسوب، بس في طلب
                عند مسؤول المخزون. */}
            {r.crStatus && (
              <span
                className="mw-lbl"
                style={r.crStatus === "approved" ? S.badgeCancelled : S.badgeCr}
              >
                {r.crStatus === "approved" ? "🚫 " : r.crStatus === "open" ? "⏳ " : "↩︎ "}
                {crStatusText(r, isAr)?.label}
              </span>
            )}
            <span className="mw-lbl" style={approved ? S.badgeOk : rejected ? S.badgeOld : S.badgeWait}>
              {approved
                ? `✓ ${t({ en: "Approved", ar: "معتمد" })}`
                : rejected
                  ? `✕ ${t({ en: "Rejected", ar: "مرفوض" })}`
                  : `⏳ ${t({ en: "Waiting", ar: "بانتظار المشرف" })}`}
            </span>
          </span>
        </div>
      </div>

      {/* القطع */}
      {r.cuts.length > 0 && (
        <div style={S.cuts}>
          {r.cuts.map((c, i) => {
            const share = base > 0 ? (c.weightKg / base) * 100 : 0;
            return (
              <div key={`${c.itemId}_${i}`} style={S.cutRow}>
                <span className="mw-sm" style={{ fontWeight: 800, minWidth: 0 }}>
                  {c.isWaste ? "🦴 " : "✅ "}{c.name}
                </span>
                <span className="mw-sm" style={{ fontWeight: 900, whiteSpace: "nowrap" }}>
                  {kg(c.weightKg)} <span style={{ color: K.mut, fontWeight: 800 }}>{KG}</span>
                </span>
                <ShareBar pct={share} tone={c.isWaste ? K.waste : K.good} />
                <span className="mw-lbl" style={{ color: K.mut, fontWeight: 900, minWidth: 52, textAlign: "end" }}>
                  {share.toFixed(0)}%
                </span>
              </div>
            );
          })}
        </div>
      )}

      {/* ── خلاصة التنفيذ ── بأسفل الكرت: بتقرا القطع فوق، وبتطلع بالمجموع */}
      <div style={S.jobNums}>
        <span><span style={S.numLbl}>{t({ en: "Raw", ar: "الخام" })}</span>
          <b style={{ color: K.raw }}>{kg(r.carcassKg)}</b> {KG}</span>
        <span><span style={S.numLbl}>{t({ en: "Products", ar: "النواتج" })}</span>
          <b style={{ color: K.good }}>{kg(r.cutsKg)}</b> {KG}</span>
        <span><span style={S.numLbl}>{t({ en: "Waste", ar: "الهدر" })}</span>
          <b style={{ color: K.waste }}>{kg(r.wasteKg)}</b> {KG}</span>
        <span><span style={S.numLbl}>{t({ en: "Yield", ar: "التصافي" })}</span>
          <b style={{ color: K.yield }}>{r.yieldPct.toFixed(1)}%</b></span>
        {r.pieceCount !== null && (
          <span><span style={S.numLbl}>{t({ en: "Pieces", ar: "القطع" })}</span>
            <b>{r.pieceCount}</b></span>
        )}
        {r.partialPiece && (
          <span><span style={S.numLbl}>{t({ en: "Pieces", ar: "القطع" })}</span>
            <b>{t({ en: "not a whole piece", ar: "ليست قطعة كاملة" })}</b></span>
        )}
      </div>

      {/* ── ليش السكور هيك؟ ── رقم بلا سبب بيصير ضغط، مش تدريب: بنكتب
          أبعد سطر عن معياره حتى يعرف الجزار من وين يبلّش يحسّن. */}
      {approved && r.score !== null && r.scoreWorst && (
        <div className="mw-sm" style={S.scoreWhy}>
          🔎 {r.scoreWorst.name}{" "}
          {r.scoreWorst.deltaPts > 0
            ? t({ en: "is above standard by", ar: "أعلى من المعياري بـ" })
            : t({ en: "is below standard by", ar: "أقل من المعياري بـ" })}{" "}
          <b>{Math.abs(r.scoreWorst.deltaPts).toFixed(1)}</b>{" "}
          {t({ en: "pts", ar: "نقطة" })}
        </div>
      )}

      {/* ملاحظة المشرف (قبول استثنائي أو رفض قديم) */}
      {r.review?.reason && (
        <div className="mw-lbl" style={r.review.override ? S.noteWarn : S.noteOld}>
          {r.review.override
            ? `⚠️ ${t({ en: "Supervisor note", ar: "ملاحظة المشرف" })}: ${r.review.reason}`
            : `✕ ${r.review.reason}`}
        </div>
      )}
    </div>
  );
}

/* ============================ الأنماط ============================ */

const FONT = "Cairo, system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif";

const S = {
  page: {
    minHeight: "100vh", background: K.page, fontFamily: FONT, color: K.ink,
    padding: "18px 14px 48px",
  },
  wrap: { margin: "0 auto" },
  header: {
    display: "flex", alignItems: "center", justifyContent: "space-between",
    flexWrap: "wrap", gap: 10, marginBottom: 16,
  },
  smallBtn: {
    border: `1px solid ${K.line}`, background: "#fff", color: K.raw, borderRadius: 12,
    padding: "9px 16px", fontFamily: FONT, fontWeight: 800, cursor: "pointer",
  },
  winBar: {
    display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 6,
  },
  winBtn: {
    border: `1px solid ${K.line}`, background: "#fff", color: K.ink2,
    borderRadius: 999, padding: "7px 16px", fontFamily: FONT, fontWeight: 800, cursor: "pointer",
  },
  winBtnOn: { background: K.raw, color: "#fff", border: `1px solid ${K.raw}` },
  linkBtn: {
    border: "none", background: "transparent", color: K.raw,
    fontFamily: FONT, fontWeight: 900, cursor: "pointer", textDecoration: "underline", padding: 0,
  },

  /* بوّابة الرقم */
  gate: {
    background: "#fff", border: `1px solid ${K.line}`, borderRadius: 22,
    padding: "28px 22px", display: "flex", flexDirection: "column", gap: 16,
    maxWidth: 520, margin: "6vh auto 0",
    boxShadow: "0 14px 34px rgba(15,39,64,.07)",
  },
  gateIcon: { fontSize: 44, textAlign: "center", lineHeight: 1 },
  input: {
    width: "100%", boxSizing: "border-box", border: `2px solid ${K.line}`, borderRadius: 16,
    padding: "16px 14px", fontWeight: 900, textAlign: "center", fontFamily: FONT,
    color: K.ink, outline: "none", letterSpacing: 2,
  },
  primary: {
    border: "none", background: K.raw, color: "#fff", borderRadius: 16,
    padding: "16px 22px", fontWeight: 900, fontFamily: FONT, cursor: "pointer", width: "100%",
  },
  disabled: { background: "#c9d8e8", cursor: "not-allowed" },

  card: {
    background: "#fff", border: `1px solid ${K.line}`, borderRadius: 20, padding: 22,
  },

  /* هويّة الجزار */
  who: {
    display: "flex", alignItems: "center", gap: 14, background: "#fff",
    border: `1px solid ${K.line}`, borderRadius: 18, padding: "14px 18px", marginBottom: 14,
    flexWrap: "wrap",
  },
  avatar: {
    width: 54, height: 54, borderRadius: "50%", display: "grid", placeItems: "center",
    background: "#eaf2fc", fontSize: 28, flexShrink: 0,
  },
  periodChip: {
    background: K.soft, border: `1px solid ${K.line}`, color: K.ink2,
    borderRadius: 999, padding: "6px 14px", fontWeight: 900, whiteSpace: "nowrap",
  },

  sectionLbl: { fontWeight: 900, color: K.mut, margin: "6px 2px 2px" },

  /* شريط الأيام */
  dayChip: {
    flex: "0 0 auto", display: "flex", flexDirection: "column", gap: 2,
    background: "#fff", border: `2px solid ${K.line}`, borderRadius: 16,
    padding: "10px 16px", cursor: "pointer", fontFamily: FONT, color: K.ink,
    textAlign: "start", minWidth: 150,
  },
  dayChipOn: {
    background: K.raw, borderColor: K.raw, color: "#fff",
    boxShadow: "0 10px 22px rgba(20,80,127,.25)",
  },

  /* لوحة اليوم */
  hero: {
    background: "#fff", border: `1px solid ${K.line}`, borderRadius: 22,
    padding: "18px 20px", marginBottom: 14,
    boxShadow: "0 10px 26px rgba(15,39,64,.05)",
  },
  heroGrid: {
    display: "grid", gridTemplateColumns: "auto 1fr", gap: 22, alignItems: "center",
  },
  trio: { display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 10 },
  fact: {
    background: K.soft, border: `1px solid ${K.line}`, borderRadius: 14,
    padding: "10px 12px", display: "flex", flexDirection: "column", gap: 2, minWidth: 0,
  },

  /* شكل العرض */
  viewBar: {
    display: "flex", alignItems: "center", justifyContent: "space-between",
    gap: 10, flexWrap: "wrap", margin: "2px 0 12px",
  },
  seg: {
    display: "inline-flex", background: "#fff", border: `1px solid ${K.line}`,
    borderRadius: 14, padding: 4, gap: 4,
  },
  segBtn: {
    border: "none", background: "transparent", color: K.ink2, borderRadius: 11,
    padding: "9px 18px", fontFamily: FONT, fontWeight: 900, cursor: "pointer", whiteSpace: "nowrap",
  },
  segOn: { background: K.raw, color: "#fff" },
  printBtn: {
    border: `1px solid ${K.line}`, background: "#fff", color: K.raw, borderRadius: 14,
    padding: "10px 18px", fontFamily: FONT, fontWeight: 900, cursor: "pointer",
  },

  /* كرت التنفيذ */
  job: {
    background: "#fff", border: `1px solid ${K.line}`, borderRadius: 18,
    padding: "14px 16px", borderInlineStartWidth: 5, borderInlineStartStyle: "solid",
    display: "flex", flexDirection: "column", gap: 10,
  },
  /* الترويسة عمود: اسم المادة، وتحته سطر المعلومات والشارات */
  jobHead: { display: "flex", flexDirection: "column", gap: 6, minWidth: 0 },
  /* سبب السكور — سطر هادي تحت الأرقام */
  scoreWhy: {
    background: K.soft, border: `1px solid ${K.line}`, borderRadius: 12,
    padding: "8px 12px", color: K.ink2, fontWeight: 800,
  },
  /* سطر الاسم: الاسم على أوّله، وخانتَي الوزن والقطع على آخره */
  jobTitleRow: {
    display: "flex", alignItems: "flex-start", gap: 10, flexWrap: "wrap", minWidth: 0,
  },
  jobBoxes: { display: "flex", gap: 6, marginInlineStart: "auto", flexShrink: 0 },
  /* العنوان والقيمة بنفس السطر: «الوزن 10.00 kg» */
  jobBox: {
    display: "inline-flex", alignItems: "baseline", gap: 6, whiteSpace: "nowrap",
    background: K.soft, border: "1px solid #e6eff8", borderRadius: 12,
    padding: "5px 12px",
  },
  /* سطر واحد: معلومات التنفيذ على أوّله، والشارات مدفوعة لآخره */
  jobMeta: {
    display: "flex", alignItems: "center", justifyContent: "space-between",
    gap: 10, flexWrap: "wrap", minWidth: 0,
  },
  jobChips: {
    display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center",
    marginInlineStart: "auto",
  },
  jobNums: {
    display: "flex", gap: 18, flexWrap: "wrap", alignItems: "center",
    background: K.soft, border: `1px solid ${K.line}`, borderRadius: 14, padding: "10px 14px",
    fontWeight: 800, color: K.ink2,
  },
  numLbl: { color: K.mut, fontWeight: 800, marginInlineEnd: 6 },

  cuts: { display: "flex", flexDirection: "column", gap: 2 },
  cutRow: {
    display: "grid", gridTemplateColumns: "1fr auto 120px 52px", gap: 12,
    alignItems: "center", padding: "7px 4px", borderBottom: `1px solid ${K.soft}`,
  },
  bar: {
    display: "block", height: 10, borderRadius: 999, background: "#eaf1f8", overflow: "hidden",
  },
  barFill: { display: "block", height: "100%", borderRadius: 999 },

  opNoChip: {
    background: K.soft, border: `1px solid ${K.line}`, color: K.ink2,
    borderRadius: 9, padding: "3px 10px", fontWeight: 900, whiteSpace: "nowrap",
  },
  badgeOk: {
    background: K.okBg, border: `1px solid ${K.okBd}`, color: K.okFg,
    borderRadius: 999, padding: "3px 12px", fontWeight: 900, whiteSpace: "nowrap",
  },
  badgeWait: {
    background: K.waitBg, border: `1px solid ${K.waitBd}`, color: K.waitFg,
    borderRadius: 999, padding: "3px 12px", fontWeight: 900, whiteSpace: "nowrap",
  },
  /* الطلب المفتوح: كهرماني قوي — مش خطأ بشغل الجزار، بس لازم ينتبه إله. */
  badgeCr: {
    background: "#fff7ed", color: "#9a3412", border: "1px solid #fed7aa",
    borderRadius: 999, padding: "5px 12px", fontWeight: 900, whiteSpace: "nowrap",
  },
  /* ── اللوح الثلاثي ── */
  paneTitle: {
    color: K.ink2, fontWeight: 900, letterSpacing: ".3px", textTransform: "uppercase",
  },
  paneCount: {
    background: "#dfeaf6", color: K.ink2, borderRadius: 999,
    padding: "2px 10px", fontWeight: 900,
  },
  /* كرت عقدة — سطر بعمود: عنوان، أرقام مصغّرة، شارات حالة */
  node: {
    width: "100%", textAlign: "start", display: "flex", flexDirection: "column", gap: 8,
    background: "#fff", border: `1px solid ${K.line}`, borderRadius: 16,
    borderInlineStartWidth: 6, borderInlineStartStyle: "solid",
    padding: "12px 14px", cursor: "pointer", fontFamily: FONT, color: K.ink,
  },
  /* المختار — كحلي مليان: بيربط العمود بالّي فتحه جنبه */
  nodeOn: {
    background: K.raw, color: "#fff", borderColor: K.raw,
    boxShadow: "0 14px 34px rgba(20,80,127,.22)",
  },
  nodeTop: { display: "flex", alignItems: "flex-start", gap: 8 },
  nodeBadges: { display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" },
  mini: {
    background: K.soft, border: "1px solid #e6eff8", borderRadius: 12,
    padding: "5px 8px", minWidth: 0, overflow: "hidden",
  },
  miniOn: { background: "rgba(255,255,255,.14)", border: "1px solid rgba(255,255,255,.25)" },
  /* النواتج والهدر جوّا الكرت — لوح داخلي، بيتحوّل شفّاف لما يكون مختار */
  nodeCuts: {
    display: "flex", flexDirection: "column", gap: 2,
    background: K.soft, border: "1px solid #e6eff8", borderRadius: 12,
    padding: "8px 10px",
  },
  nodeCutsOn: {
    background: "rgba(255,255,255,.12)", border: "1px solid rgba(255,255,255,.22)",
  },
  /* عمود لسّا ما انفتح — بنقول شو الخطوة، ما بنسيبه فاضي */
  hintBox: {
    background: "#fff", border: `2px dashed ${K.line}`, borderRadius: 16,
    padding: "22px 16px", textAlign: "center", color: K.mut, fontWeight: 800,
  },
  detailWrap: { display: "flex", flexDirection: "column", gap: 10, minWidth: 0 },
  detailTop: {
    display: "flex", flexDirection: "column", gap: 2, padding: "0 4px",
  },
  /* 🔒 عقدة مقفولة — ما بتنفتح: خلفية كهرمانية هادية ومؤشّر ممنوع */
  nodeShut: {
    background: "#fffdf7", borderColor: "#f0d9ac", cursor: "not-allowed",
  },
  waitNote: {
    background: "#fffaf0", border: "1px solid #f0d9ac", color: "#8a5a12",
    borderRadius: 16, padding: "12px 16px", fontWeight: 800, lineHeight: 1.7,
    marginBottom: 10,
  },

  /* لوح التفاصيل — أغمق من الكرت الشامل، فالكروت البيضا اللي جوّاه بتنفصل */
  detailPanel: {
    display: "flex", flexDirection: "column", gap: 12,
    background: "#e4edf9", border: "1px solid #c9dcf1", borderRadius: 16,
    padding: 12, marginTop: 6,
  },
  detailPanelHead: {
    color: "#2c4f70", fontWeight: 900, letterSpacing: ".2px",
    textTransform: "uppercase", opacity: 0.85,
  },
  /* كرت تنفيذ جوّا اللوح — أبيض بظلّ وحدّ جانبي أعرض، ما بيذوب بالخلفية */
  jobNested: {
    boxShadow: "0 8px 20px rgba(15,39,64,.12)", borderColor: "#bcd6ef",
    borderInlineStartWidth: 8,
  },
  /* رقم التنفيذ — شارة ملوّنة بحالته قبل اسم المادة */
  opIndex: {
    display: "inline-block", color: "#fff", borderRadius: 999,
    padding: "3px 10px", fontWeight: 900, marginInlineEnd: 8,
    verticalAlign: "middle",
  },
  badgeCancelled: {
    background: "#fef2f2", color: "#991b1b", border: "1px solid #fecaca",
    borderRadius: 999, padding: "5px 12px", fontWeight: 900, whiteSpace: "nowrap",
  },
  badgeOld: {
    background: "#f3f5f7", border: "1px solid #dfe5ea", color: "#6b7785",
    borderRadius: 999, padding: "3px 12px", fontWeight: 900, whiteSpace: "nowrap",
  },
  noteWarn: {
    background: K.waitBg, border: `1px solid ${K.waitBd}`, color: K.waitFg,
    borderRadius: 12, padding: "9px 12px", fontWeight: 800, lineHeight: 1.6,
  },
  noteOld: {
    background: "#f7f8fa", border: "1px solid #e3e8ee", color: "#6b7785",
    borderRadius: 12, padding: "9px 12px", fontWeight: 800, lineHeight: 1.6,
  },

  empty: {
    background: "#fff", border: `2px dashed ${K.line}`, borderRadius: 20,
    padding: "40px 20px", textAlign: "center", fontWeight: 800, color: K.mut,
  },
  errorBox: {
    background: "#fff5f5", border: "1px solid #f3c9c9", color: "#a12626",
    borderRadius: 18, padding: "22px 18px", fontWeight: 800, lineHeight: 1.7,
    display: "flex", flexDirection: "column", gap: 10, alignItems: "center", textAlign: "center",
  },
  pendingNote: {
    background: K.waitBg, border: `1px solid ${K.waitBd}`, color: K.waitFg,
    borderRadius: 14, padding: "12px 16px", fontWeight: 800, lineHeight: 1.6, marginBottom: 14,
  },
};
