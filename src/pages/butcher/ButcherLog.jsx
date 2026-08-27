// src/pages/butcher/ButcherLog.jsx
//
// صفحة الجزار — تسجيل أوزان التقطيع / Butcher cut log (EN/AR).
//
// الخطوات (كشك لمس، كروت كبيرة):
//   الرقم الوظيفي + الملحمة → النوع → المنشأ → الفئة → وصفة التقطيع → الأوزان.
//   كل شاشة تصفية بتظهر فقط إذا في تعريفات لبُعدها، وإلا بتتخطّى تلقائياً.
//   شاشة الأوزان: وزن المادة الخام + خانة وزن لكل منتج نهائي ولكل صنف هدر.
//   وضع المسارات المتعددة: كل المسارات بنفس الشاشة، وأول منتج مميِّز يوزنه
//   الجزار بيحدّد المسار وباقي المسارات بتتعطّل.
//
// الشروط:
//   • وزن المادة الخام إلزامي — كل النسب مبنية عليه.
//   • مجموع (المنتجات + الهدر) لا يتجاوز وزن الخام → تحذير، ويمنع الحفظ
//     لما تكون الوصفة على «تطابق تام».
//   • وزن خام بعيد جداً عن الوزن القياسي للوصفة → تحذير فقط (warnOutOfRange).
//
// ملاحظات تقنية:
//   • الحفظ يمرّ بصندوق الصادر (butcherOutbox): يذهب للسيرفر فوراً، وإن كان
//     النت مقطوعاً ينتظر محلياً ويُرفع تلقائياً عند عودة الاتصال.
//   • السيرفر هو مصدر الحقيقة — كل ذبيحة سجل واحد فيه مصفوفة cuts عبر
//     POST /api/reports بنوع butcher_cut_log. الـ localStorage للكاش فقط.
//   • UNIQUE على (type, payload->>'reportDate') لكل الأنواع ما عدا maintenance،
//     لذلك reportDate = طابع وقت ISO فريد لكل تسجيل، مع حقل date لليوم،
//     وإعادة محاولة عند 409.
//   • أحجام الخطوط عبر <style> بكلاسات لا inline: globals.css فيه
//     `#root * { font-size:14px !important }` ويدهس أي fontSize inline.

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import ButcherArt, { ART_IDS } from "./ButcherIcons";
import { BRANCHES, altNameOf, branchCodeFromLabel, nameOf, opNoLabel } from "./butcherOptions";
import { artOf, butcherByNo, imageOf, roundKg, useButcherConfig } from "./butcherConfig";
import {
  useMrpConfig, bomInputItem, bomLines, itemName, UNCAT,
  activeCuttingBoms, BOM_FACETS, bomFacetOptions, filterBomsByFacet, facetValueName,
  bomIsMultiPath, activePathwaysOf, bomTags, bomOriginOf, bomKindOf,
  bomStdOn, bomStdTol, bomNeedsRawExpiry,
} from "./butcherMrpBridge";
import { saveOrQueue, useOutbox } from "./butcherOutbox";
import { progressPct, useDayPlan } from "./butcherDayPlan";
import { useSettingsLang, LangToggle } from "../settings/_shared/settingsI18n";
import { canOpenButcherPage, NoAccess } from "./ButcherAccess";
// سجل الموظفين المشترك (نفس المصدر الذي يستعمله رابط التدريب الداخلي) — قراءة فقط
import { EMPLOYEES } from "../ohc/OHCUpload";
// 👥 القوى العاملة — الجسر اللي بيخلّي الشاشة تعرف مين مسجّل دخول.
// الجزار المربوط بحساب ما بيكتب رقمه ولا بيختار ملحمته: بتنعبّى وبتنقفل.
import { accountIdentity, useWorkforce } from "../workforce/workforceConfig";
import { getCurrentUser } from "../../utils/perms";

const LAST_EMP_KEY = "butcher_last_emp";
/** مفتاح «وزن المادة الخام» بلوحة الأرقام. */
const RAW_KEY = "__raw__";       // cache only — not a store
const LAST_BRANCH_KEY = "butcher_last_branch"; // cache only — not a store

/* أحجام الخطوط — تتغلّب على `#root *` بفضل الكلاس (نفس التخصيص + ترتيب لاحق) */
const CSS = `
#root .bt, #root .bt * { font-size: 28px !important; }
#root .bt-title   { font-size: 34px !important; }
#root .bt-q       { font-size: 32px !important; }
#root .bt-emp     { font-size: 28px !important; }
#root .bt-chip    { font-size: 26px !important; }
#root .bt-name    { font-size: 32px !important; }
#root .bt-num     { font-size: 42px !important; }
#root .bt-cutnum  { font-size: 30px !important; }
#root .bt-lbl     { font-size: 24px !important; }
#root .bt-btn     { font-size: 32px !important; }
#root .bt-back    { font-size: 28px !important; }
#root .bt-sum     { font-size: 26px !important; }
#root .bt-small   { font-size: 22px !important; }
#root .bt-done    { font-size: 64px !important; }
#root .bt-toggle, #root .bt-toggle * { font-size: 20px !important; }
/* ═══ الموبايل: أحجام أصغر ومساحات أضيق ═══ */
@media (max-width: 820px) {
  #root .bt, #root .bt * { font-size: 20px !important; }
  #root .bt-title  { font-size: 24px !important; }
  #root .bt-q      { font-size: 22px !important; }
  #root .bt-name   { font-size: 22px !important; }
  #root .bt-num    { font-size: 32px !important; }
  #root .bt-cutnum { font-size: 24px !important; }
  #root .bt-lbl    { font-size: 17px !important; }
  #root .bt-btn    { font-size: 22px !important; }
  #root .bt-emp, #root .bt-chip, #root .bt-sum, #root .bt-back { font-size: 18px !important; }
  #root .bt-small  { font-size: 15px !important; }
  #root .bt-done   { font-size: 48px !important; }
  /* شريط الخطوات: أرقام فقط بلا أسماء */
  #root .bt-step-lbl { display: none !important; }
}
@media (max-width: 520px) {
  #root .bt-toggle { display: none; }   /* زر اللغة يضيّق الترويسة على الجوال */
}
/* رصيف الحفظ اللاصق: globals.css حاطط overflow-x:hidden على html/body/#root،
   و«hidden» بيحوّل المحور الثاني لـ auto فبيصير الصندوق حاوية تمرير — وهذا
   بيعطّل position:sticky لكل ما بداخله. «clip» بيقصّ الزيادة الأفقية نفسها
   بلا ما يعمل حاوية تمرير، فبيرجع اللصق يشتغل. مقيَّد بصفحة الجزار وحدها
   عبر :has(.bt) — وإن كان المتصفّح قديماً بتسقط القاعدة ويرجع الرصيف
   عنصراً عادياً بلا أي كسر. */
html:has(.bt), body:has(.bt), #root:has(.bt) { overflow-x: clip; }

/* حركات خفيفة */
#root .bt-press { transition: transform .12s ease, box-shadow .12s ease, border-color .15s ease; }
#root .bt-press:active { transform: scale(.97); }
@keyframes btPop { 0% { transform: scale(.6); opacity: 0 } 60% { transform: scale(1.12) } 100% { transform: scale(1); opacity: 1 } }
#root .bt-pop { animation: btPop .45s cubic-bezier(.22,1,.36,1) both; }
@keyframes btRise { from { opacity: 0; transform: translateY(14px) } to { opacity: 1; transform: none } }
#root .bt-rise { animation: btRise .28s ease both; }
`;

/** هل الصفحة مفتوحة من داخل الحساب (لا من جهاز الكشك)؟ */
function hasSession() {
  try {
    return !!localStorage.getItem("currentUser");
  } catch {
    return false;
  }
}

/* ============================ أدوات ============================ */

const todayStr = () => new Date().toISOString().slice(0, 10);

/** تاريخ ووقت للعرض — YYYY-MM-DD · HH:MM (بالتوقيت المحلي). */
function stampStr(d) {
  const p = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} · ${p(d.getHours())}:${p(d.getMinutes())}`;
}

/* الأرقام العربية/الفارسية والفواصل بكل أشكالها → صيغة يفهمها Number.
   لوحة مفاتيح الكشك بتكتب ٠١٢٣ لما تكون اللغة عربية، وبلا هالتحويل كان
   الوزن بينقرأ NaN فيصير صفراً بصمت — رقم مكتوب وما بينحسب أبداً. */
function normalizeDigits(v) {
  return String(v ?? "")
    .replace(/[\u0660-\u0669]/g, (d) => String(d.charCodeAt(0) - 0x0660))
    .replace(/[\u06F0-\u06F9]/g, (d) => String(d.charCodeAt(0) - 0x06f0))
    .replace(/\u066C/g, "")               // فاصل الآلاف العربي — يُحذف
    .replace(/[,\u060C\u066B]/g, ".");    // الفاصلة العشرية بكل أشكالها
}

/** رقم من إدخال المستخدم — يقبل الأرقام والفواصل العربية. */
function num(v) {
  const n = Number(normalizeDigits(v).trim());
  return Number.isFinite(n) && n > 0 ? n : 0;
}

/**
 * تنظيف خانة وزن: أرقام + فاصلة عشرية واحدة + **خانتان عشريتان كحدّ أقصى**.
 * الموازين بالملحمة بترجّع رقمين بعد الفاصلة، فـ10.25 مقبول و3.2454 بينقصّ
 * لـ3.24 وقت الكتابة — بلا ما نترك الجزار يسجّل دقّة وهمية.
 */
const KG_DECIMALS = 2;
function cleanDecimal(v, dp = KG_DECIMALS) {
  const s = normalizeDigits(v).replace(/[^\d.]/g, "");
  const dot = s.indexOf(".");
  if (dot < 0) return s;
  const frac = s.slice(dot + 1).replace(/\./g, "").slice(0, dp);
  return `${s.slice(0, dot)}.${frac}`;
}

/** تنظيف خانة عدد صحيح (عدد القطع): أرقام صحيحة فقط، بلا فاصلة ولا أصفار بادئة. */
const cleanInt = (v) =>
  normalizeDigits(v).replace(/[^\d]/g, "").replace(/^0+(?=\d)/, "");

/** Enter بخانة وزن → الخانة اللي بعدها — إدخال أسرع بلا لمس الشاشة. */
function focusNextWeight(e) {
  if (e.key !== "Enter") return;
  e.preventDefault();
  const all = [...document.querySelectorAll("input[data-bt-w]")].filter((el) => !el.disabled);
  const next = all[all.indexOf(e.currentTarget) + 1];
  if (next) { next.focus(); next.select?.(); } else e.currentTarget.blur();
}

/* ============================ الصفحة ============================ */

export default function ButcherLog() {
  const navigate = useNavigate();
  const { t, isAr, dir, lang, toggle } = useSettingsLang();
  const { cfg } = useButcherConfig();
  const { cfg: mrpCfg } = useMrpConfig({ refetchOnFocus: false });
  // صندوق الصادر — الحفظ يشتغل حتى لو النت مقطوع، ويزامن لحاله
  const outbox = useOutbox();
  const isLoggedIn = hasSession();

  /* الشروط من إعدادات الجزار — المنتجات صارت من قوائم التقطيع (MRP Cutting BOMs) */
  const RULES = cfg.rules;
  // إظهار النسبة الفعلية تحت كل خانة (نسبة الرقم من وزن المادة الخام)
  const showPct = RULES.showActualPct !== false;

  // emp | kind | origin | category | bom | cuts | done
  const [step, setStep] = useState("emp");
  const [empNo, setEmpNo] = useState("");
  const [branch, setBranch] = useState("");
  const [bomKind, setBomKind] = useState(null);     // النوع المختار (null=الكل، UNCAT=بلا نوع)
  const [bomOrigin, setBomOrigin] = useState(null); // المنشأ المختار (null=الكل، UNCAT=بلا منشأ)
  const [bomCat, setBomCat] = useState(null);   // الفئة المختارة (null=الكل، UNCAT=بلا فئة)
  const [bom, setBom] = useState(null);         // قائمة التقطيع المختارة
  const [carcass, setCarcass] = useState("");   // وزن المادة الخام قبل التقطيع
  const [pieceCount, setPieceCount] = useState(""); // عدد القطع (إن طلبته الوصفة)
  // «ليست قطعة كاملة»: الداخل جزء من ذبيحة/قطعة (نص فخذ، بواقي…) فعدّ القطع
  // ما إله معنى — بيرفع إلزامية العدد ويُحفظ كعلامة على السجل.
  const [partialPiece, setPartialPiece] = useState(false);
  // الوقت المستغرق للتقطيع — بالدقائق، يكتبه الجزار بنفسه بنافذة تطلع عند الحفظ
  // تاريخ انتهاء المادة الخام — من ملصق الذبيحة/القطعة الداخلة
  const [rawExpiry, setRawExpiry] = useState("");
  // الخانة النشطة للوحة الأرقام: "" = مقفولة ، RAW_KEY = وزن الخام ،
  // وإلا معرّف الصنف. لوحة الأرقام بتكتب بنفس دوال الإدخال بلا أي منطق جديد.
  const [activeId, setActiveId] = useState("");
  const [durationMin, setDurationMin] = useState("");
  const [askTime, setAskTime] = useState(false);
  const [values, setValues] = useState({});     // { itemId: { w } }
  const [bomSearch, setBomSearch] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [saved, setSaved] = useState(null);     // ملخّص آخر حفظ
  const [cutDate, setCutDate] = useState(todayStr());  // تاريخ التقطيع (يختاره الجزار)
  // تاريخ إدخال البيانات — لحظة بدء التسجيل، بيتحدّث لحظياً ويُثبَّت وقت الحفظ
  const [entryAt, setEntryAt] = useState(() => new Date());

  /* ── 👥 مين مسجّل دخول؟ ──────────────────────────────────────────────
     الحساب بينعمل بمركز الحسابات، وبينربط بموظف من «القوى العاملة». إذا
     الحساب مربوط بموظف نشط — **جزار كان أو مشرف** — النظام بيعرف اسمه ورقمه
     الوظيفي وملحمته من السجل، فما بيضل يكتبهم كل مرّة وما بيقدر يكتب رقم غيره.
     إذا مش مربوط (كشك مشترك مثلاً) بترجع الشاشة لسلوكها القديم حرفياً. */
  const { wf: workforce } = useWorkforce();
  const account = useMemo(() => getCurrentUser(), []);
  const identity = useMemo(
    () => accountIdentity(workforce, account?.username, isAr),
    [workforce, account, isAr]
  );
  const locked = !!identity;

  /* ملاحمه هو وبس — المشرف ممكن يغطّي أكتر من ملحمة، فبيختار من بينهنّ.
     استثناء واحد: النقل اللي لسّا ما بلّش — سجلّه بيقول ملحمة جديدة ما وصلها
     بعد، وهو فعلياً عم يشتغل بالقديمة، فبترجع القائمة كاملة لهالفترة. */
  const myBranches = useMemo(() => {
    const codes = identity?.sites || [];
    if (!identity || identity.pending || codes.length === 0) return BRANCHES;
    return BRANCHES.filter((b) => codes.includes(b.code));
  }, [identity]);

  useEffect(() => {
    /* الكاش المحلّي بيخدم الكشك المشترك بس. الحساب المربوط هويّته بتيجي من
       السجل، فما منعبّي فوقها رقم آخر جزار استعمل نفس الجهاز. */
    if (locked) return;
    try {
      const lastEmp = localStorage.getItem(LAST_EMP_KEY);
      const lastBranch = localStorage.getItem(LAST_BRANCH_KEY);
      if (lastEmp) setEmpNo(lastEmp);
      if (lastBranch) setBranch(lastBranch);
    } catch { /* ignore */ }
  }, [locked]);

  /* ساعة حيّة لتاريخ الإدخال — جهاز الكشك بيضل مفتوح طول الدوام، وبلا
     تحديث كان الحقل يعرض لحظة فتح الشاشة (ساعات قبل) لا لحظة التسجيل. */
  useEffect(() => {
    if (step !== "cuts") return undefined;
    const id = setInterval(() => setEntryAt(new Date()), 30000);
    return () => clearInterval(id);
  }, [step]);


  /* بطاقة الموظف: سجل الجزارين (الإعدادات) أولاً، ثم سجل الموظفين المشترك */
  const butcherRec = useMemo(() => butcherByNo(cfg, empNo), [cfg, empNo]);
  const dirRec = useMemo(() => EMPLOYEES[String(empNo || "").trim()] || null, [empNo]);

  const person = useMemo(() => {
    // سجل القوى العاملة أولاً: هو المصدر اللي بيقرّر مين هالحساب وبأي ملحمة.
    const name = identity?.name || butcherRec?.name || dirRec?.name || "";
    if (!name && !dirRec) return null;
    return {
      name,
      job: dirRec?.job || "",
      branchLabel: dirRec?.branch || "",
      /* اقتراح الملحمة — بس لما تكون وحدة لا لبس فيها. المشرف اللي بيغطّي
         أكتر من ملحمة بيختار بنفسه، فما منقترح عليه الأولى ومنقفلها. */
      branchCode:
        (!identity?.pending && identity?.sites?.length === 1 ? identity.site : "") ||
        butcherRec?.branch ||
        branchCodeFromLabel(dirRec?.branch),
    };
  }, [identity, butcherRec, dirRec]);

  /* «معروف» = مسجّل بسجل القوى العاملة، أو بسجل جزاري الإعدادات، أو بسجل
     الموظفين المشترك. القوى العاملة أقوى دليل — الحساب نفسه مربوط فيه. */
  const knownButcher =
    !!identity || (!!butcherRec && butcherRec.active !== false) || (!butcherRec && !!dirRec);
  const butcherBlocked = RULES.restrictButchers === true && !!empNo.trim() && !knownButcher;

  /* تعبئة الملحمة تلقائياً من سجل الموظف — بلا دهس اختيار المستخدم */
  const branchTouched = useRef(false);

  /* الحساب المربوط: الرقم والملحمة بينتعبّوا من السجل وبينقفلوا.
     أي تعديل بالقوى العاملة (نقل لملحمة ثانية مثلاً) بيوصل لهون لحاله. */
  useEffect(() => {
    if (!identity) return;
    setEmpNo(identity.empNo);
    // ملحمة وحدة = بتنعبّى وبتنقفل. أكتر من وحدة = بيختار هو، فما منفرض عليه
    // الأولى ومنخلّيه ياخد باله إنه لازم يختار.
    if (!identity.pending && identity.sites.length === 1) {
      branchTouched.current = true;
      setBranch(identity.sites[0]);
    }
  }, [identity]);
  useEffect(() => {
    if (branchTouched.current) return;
    if (!person?.branchCode || branch) return;
    setBranch(person.branchCode);
  }, [person, branch]);

  const branchObj = useMemo(
    () => BRANCHES.find((b) => b.code === branch) || null,
    [branch]
  );

  /* خطة اليوم لهذه الملحمة + تقدّم الجزار — طلب واحد يخدم الاثنين.
     لا نحمّل قبل ما يدخل الجزار حتى لا نسحب بيانات بلا داعٍ. */
  const dayPlan = useDayPlan({
    date: todayStr(),
    branch: step === "emp" ? "" : branch,
    employeeNo: step === "emp" ? "" : empNo,
  });
  // ملخّص الجزار اليوم — من نفس نتيجة الخطة بدل طلب ثانٍ بـ٥٠٠٠ سجل
  const totals = dayPlan.progress?.mine
    ? { count: dayPlan.progress.mine.count, kg: dayPlan.progress.mine.productsKg }
    : null;

  /* ── سلسلة التصفية قبل الوصفة: 🐑 النوع ← 🌍 المنشأ ← 🏷️ الفئة ──
     كل شاشة بتظهر فقط إذا في تعريفات لهالبُعد على الوصفات المتبقية؛
     وإلا بتتخطّى — فالتركيب القديم (بلا أنواع/مناشئ) بيضل نفسه تماماً. */
  const allBoms = useMemo(() => activeCuttingBoms(mrpCfg), [mrpCfg]);

  const kindPick = useMemo(() => bomFacetOptions(mrpCfg, allBoms, "kind"), [mrpCfg, allBoms]);
  const bomsOfKind = useMemo(
    () => filterBomsByFacet(mrpCfg, allBoms, "kind", bomKind),
    [mrpCfg, allBoms, bomKind]
  );
  const originPick = useMemo(
    () => bomFacetOptions(mrpCfg, bomsOfKind, "origin"),
    [mrpCfg, bomsOfKind]
  );
  const bomsOfOrigin = useMemo(
    () => filterBomsByFacet(mrpCfg, bomsOfKind, "origin", bomOrigin),
    [mrpCfg, bomsOfKind, bomOrigin]
  );
  const catPick = useMemo(
    () => bomFacetOptions(mrpCfg, bomsOfOrigin, "category"),
    [mrpCfg, bomsOfOrigin]
  );

  const hasKindStep = kindPick.opts.length > 0;
  const hasOriginStep = originPick.opts.length > 0;
  const hasCatStep = catPick.opts.length > 0;

  /* الوصفات المعروضة = بعد النوع والمنشأ والفئة */
  const shownBoms = useMemo(
    () => filterBomsByFacet(mrpCfg, bomsOfOrigin, "category", bomCat),
    [mrpCfg, bomsOfOrigin, bomCat]
  );

  /* أسماء الاختيارات — لشريط المسار أعلى الشاشة */
  const kindName = facetValueName(mrpCfg, "kind", bomKind, isAr);
  const originName = facetValueName(mrpCfg, "origin", bomOrigin, isAr);
  const bomCatName = facetValueName(mrpCfg, "category", bomCat, isAr);

  /* ── المادة الخام ونواتج الوصفة من قائمة التقطيع المختارة ── */
  const inputItem = useMemo(() => (bom ? bomInputItem(mrpCfg, bom) : null), [mrpCfg, bom]);

  /* المسارات المتعددة: كل المسارات تظهر بنفس الصفحة؛ الجزار يختار المسار
     ضمنياً بأول منتج بيوزنه، وباقي المسارات بتتعطّل. */
  const isMultiPath = bomIsMultiPath(bom);
  const activePathways = useMemo(() => activePathwaysOf(bom), [bom]);

  /* دمج منتجات/هدر كل المسارات في قائمة واحدة بلا تكرار (المفتاح itemId).
     المنتج اللي بأكثر من مسار بيظهر مرة وحدة. نبني خريطتين:
     - pathwaysOf  : انتماء كامل (أي مسار يُدرج الصنف) — للتعطيل والعرض.
     - shared: الأصناف المعلَّمة «مشترك/Any». التعليم مرّة بأي مسار بيخلّي الصنف
       يخصّ **كل المسارات** — بيضل متاح للوزن مهما كان التوجيه، وما بيميّز مسار أبداً.
     - distinguishOf: الأصناف المميِّزة للهويّة = كل الأسطر (نواتج + هدر) ما عدا
       المشتركة — لتحديد المسار.
       ملاحظة مهمة: لا نشترط Qty>0 هون. الكميّات اختيارية بالمحرّر (مسار كامل ممكن
       ينحفظ وكل كميّاته صفر)، فلو اشترطنا Qty>0 بتطلع الخريطة فاضية وما بيتحدّد
       ولا مسار أبداً — يعني ما بيقفل ولا منتج. الانتماء وحده كافٍ للتمييز،
       و«Any» هو الاستثناء الوحيد لأنه صنف مشترك بين المسارات بقصد. */
  const merged = useMemo(() => {
    const pathwaysOf = new Map();    // itemId → Set(pathwayId) — انتماء كامل
    const distinguishOf = new Map(); // itemId → Set(pathwayId) — مميِّز (بلا المشتركة)
    const shared = new Set();        // أصناف «مشترك/Any» — تخصّ كل المسارات
    const pm = new Map();            // itemId → سطر منتج (أول ظهور)
    const wm = new Map();            // itemId → سطر هدر
    if (isMultiPath) {
      const add = (map, itemId, pid) => {
        const set = map.get(itemId) || new Set();
        set.add(pid); map.set(itemId, set);
      };
      // تمريرة أولى: القوائم الموحّدة + الانتماء الكامل + جمع المشتركة
      activePathways.forEach((p) => {
        bomLines(mrpCfg, p, "outputs").forEach((l) => {
          add(pathwaysOf, l.itemId, p.id);
          if (!pm.has(l.itemId)) pm.set(l.itemId, l);
        });
        bomLines(mrpCfg, p, "wastes").forEach((l) => {
          add(pathwaysOf, l.itemId, p.id);
          if (!wm.has(l.itemId)) wm.set(l.itemId, l);
        });
        // علم «مشترك» عالمي: يكفي تعليمه بمسار واحد ليسري على الكل
        [...(p.outputs || []), ...(p.wastes || [])].forEach((raw) => {
          if (raw?.itemId && raw.any === true) shared.add(raw.itemId);
        });
      });
      // تمريرة ثانية: الهويّة من الأسطر الخام (بعد ما اكتملت قائمة المشتركة)
      activePathways.forEach((p) => {
        [...(p.outputs || []), ...(p.wastes || [])].forEach((raw) => {
          const id = raw?.itemId;
          if (!id || shared.has(id)) return;             // «مشترك» لا يميِّز إطلاقاً
          if (!pm.has(id) && !wm.has(id)) return;        // صنف مجهول بسجل الأصناف
          add(distinguishOf, id, p.id);
        });
      });
    }
    return { products: [...pm.values()], wastes: [...wm.values()], pathwaysOf, distinguishOf, shared };
  }, [isMultiPath, activePathways, mrpCfg]);

  /* المنتجات = نواتج الوصفة (مسطّح) أو الدمج (متعدد المسارات) */
  const productCuts = useMemo(
    () => (isMultiPath ? merged.products : bomLines(mrpCfg, bom, "outputs")),
    [isMultiPath, merged, mrpCfg, bom]
  );
  const wasteCuts = useMemo(
    () => (isMultiPath ? merged.wastes : bomLines(mrpCfg, bom, "wastes")),
    [isMultiPath, merged, mrpCfg, bom]
  );
  const ALL = useMemo(() => [...productCuts, ...wasteCuts], [productCuts, wasteCuts]);

  /* المسارات المرشّحة = تقاطع مجموعات المسارات لكل صنف مميِّز موزون.
     - صنف معلَّم «مشترك/Any» → ما بيضيّق التقاطع (بيضل الوضع مبهم).
     - صنف موجود بمسار واحد → التقاطع بينحصر فهذا هو المسار وباقيهم بيتقفلوا. */
  const candidateIds = useMemo(() => {
    const allIds = activePathways.map((p) => p.id);
    if (!isMultiPath) return allIds;
    let cand = null;
    ALL.forEach((c) => {
      if (!(num(values[c.itemId]?.w) > 0)) return;
      const set = merged.distinguishOf.get(c.itemId);
      if (!set || set.size === 0) return;   // صنف غير مميِّز — ما بيضيّق التقاطع
      cand = cand === null ? new Set(set) : new Set([...cand].filter((x) => set.has(x)));
    });
    return cand === null ? allIds : [...cand];
  }, [isMultiPath, activePathways, ALL, merged, values]);

  /* فكّ الغموض بالمطابقة التامّة:
     لو ضل أكتر من مرشّح (لأن مسار مجموعته جزء من مسار أكبر — مثلاً P4={فخذ بالعضم}
     جزء من P2={فخذ بالعضم، موزة}), منشوف إذا في مسار **مجموعته تطابق الموزون تماماً**:
     كل منتجاته غير المشتركة موزونة، وما في منتج موزون برّا مخرجاته → هو المقصود.
     مثال: الجزار نظّف الفخذ وباعه كما هو → يوزن 20015 لحاله → P4 معرَّف بهذا المنتج
     لحاله → ينعتمد ويُسمح بالحفظ. ولو كمّل ووزن الموزة بعدين، بيرجع التقاطع
     يحصر المسار على P2 تلقائياً (الكروت بتضل مفتوحة، ما منقفل عليه بدري). */
  const exactPathwayId = useMemo(() => {
    if (!isMultiPath || candidateIds.length <= 1) return "";
    const weighed = new Set(
      productCuts.filter((c) => num(values[c.itemId]?.w) > 0).map((c) => c.itemId)
    );
    if (!weighed.size) return "";
    const hits = candidateIds.filter((pid) => {
      const p = activePathways.find((x) => x.id === pid);
      if (!p) return false;
      const outs = (p.outputs || []).filter((l) => l?.itemId);
      const own = outs.filter((l) => !merged.shared.has(l.itemId)).map((l) => l.itemId);
      if (!own.length) return false;
      // كل منتجات المسار (غير المشتركة) موزونة؟
      if (!own.every((id) => weighed.has(id))) return false;
      // وما في منتج موزون خارج هالمسار؟ (المشترك مسموح دايماً)
      const all = new Set(outs.map((l) => l.itemId));
      return [...weighed].every((id) => all.has(id) || merged.shared.has(id));
    });
    return hits.length === 1 ? hits[0] : "";   // مطابقتان = غموض حقيقي، ما منحسم
  }, [isMultiPath, candidateIds, activePathways, productCuts, values, merged]);

  const chosenPathwayId = !isMultiPath
    ? ""
    : (candidateIds.length === 1 ? candidateIds[0] : exactPathwayId);
  const determined = isMultiPath && !!chosenPathwayId;
  const pathway = useMemo(
    () => (chosenPathwayId ? activePathways.find((p) => p.id === chosenPathwayId) || null : null),
    [chosenPathwayId, activePathways]
  );

  /* صنف معطّل = ما في تقاطع بين مساراته والمسارات المرشّحة (بيخصّ مسار آخر).
     الأصناف المشتركة «Any» ما بتتعطّل أبداً — هي تخصّ كل المسارات بالتعريف. */
  const itemLocked = useCallback(
    (itemId) => {
      if (!isMultiPath) return false;
      if (merged.shared.has(itemId)) return false;
      const set = merged.pathwaysOf.get(itemId) || new Set();
      return !candidateIds.some((id) => set.has(id));
    },
    [isMultiPath, merged, candidateIds]
  );

  /* أسطر المسار المحدَّد بالمفتاح itemId — تُعتمد للهدف و«مطلوب» بعد ما يتّضح المسار */
  const chosenLineOf = useMemo(() => {
    const m = new Map();
    if (determined) {
      const chosen = activePathways.find((p) => p.id === chosenPathwayId);
      [...bomLines(mrpCfg, chosen, "outputs"), ...bomLines(mrpCfg, chosen, "wastes")]
        .forEach((l) => m.set(l.itemId, l));
    }
    return m;
  }, [determined, chosenPathwayId, activePathways, mrpCfg]);

  /* مجاميع الشاشة الحالية — المفتاح itemId (كل صنف مرة وحدة) */
  const carcassKg = num(carcass);
  const filled = useMemo(
    () =>
      ALL.map((c) => ({
        cut: c,
        kind: c.kind,
        weightKg: num(values[c.itemId]?.w),
      })).filter((x) => x.weightKg > 0),
    [values, ALL]
  );
  const cutsKg = filled.reduce((s, x) => s + (x.kind === "product" ? x.weightKg : 0), 0);
  const wasteOnlyKg = filled.reduce((s, x) => s + (x.kind !== "product" ? x.weightKg : 0), 0);
  const wasteKg = wasteOnlyKg;
  const cutCount = filled.filter((x) => x.kind === "product").length;

  const usedKg = cutsKg + wasteKg;
  const remainingKg = carcassKg - usedKg;
  const overKg = usedKg - carcassKg;
  /* وزن المادة الخام أساس كل النسب — بلاه السجل بلا معنى (تصافي ٠٪)،
     فما منسمح بالحفظ قبل إدخاله. */
  const rawMissing = !(carcassKg > 0);
  /* شرط قابل للإطفاء من لوحة الإعدادات، مع سماحية تقريب قابلة للتعديل.
     بلا وزن خام ما منصرخ «تجاوز» — الرسالة الصحيحة «أدخل وزن الخام». */
  const isOver =
    RULES.blockOverCarcass !== false && !rawMissing
    && overKg > (Number(RULES.toleranceKg) || 0.05);

  /* النِّسب من وزن المادة الخام */
  const pctOf = useCallback(
    (v) => (carcassKg > 0 ? (v / carcassKg) * 100 : 0),
    [carcassKg]
  );
  const netYieldPct = pctOf(cutsKg);   // نسبة التصافي
  const wastePct = pctOf(wasteKg);     // نسبة الهدر

  /* الوزن المستهدف لسطر — منسوب لوزن المادة الخام الفعلي (من نسبة الوصفة) */
  const inputQty = num(bom?.inputQty);
  const targetKgOf = useCallback(
    (line) => {
      const tq = num(line?.targetQty);
      if (!(tq > 0)) return 0;
      return carcassKg > 0 && inputQty > 0 ? tq * (carcassKg / inputQty) : tq;
    },
    [carcassKg, inputQty]
  );

  /* تحذير ليّن: وزن الخام بعيد جداً عن الوزن القياسي بالوصفة — غالباً خطأ
     فاصلة عشرية (٢٥٠ بدل ٢٥). تحذير فقط، ما بيمنع الحفظ. */
  const rawFar =
    RULES.warnOutOfRange !== false && inputQty > 0 && carcassKg > 0
    && (carcassKg > inputQty * 3 || carcassKg < inputQty / 3);

  // الهدر إلزامي = لازم خانة الهدر تنعبّى إن وُجد صنف هدر في الوصفة
  const wasteMissing =
    RULES.requireWaste === true && wasteCuts.length > 0 && wasteOnlyKg <= 0;

  /* تطابق تام مطلوب لهالوصفة: الخام = النواتج + الهدر (بلا فاقد ولا زيادة) */
  const exactBalance = bom?.requireExactBalance === true;
  const balanceDiff = carcassKg - usedKg;             // + = ناقص ، − = زايد
  // epsilon زغير للفواصل العشرية فقط — التطابق تام
  const balanceOff = exactBalance && (carcassKg <= 0 || Math.abs(balanceDiff) > 1e-6);

  /* منع التجاوز فوق وزن الخام مربوط بالتطابق التام:
     - «التطابق التام» مفعّل → التجاوز ممنوع (لازم يساوي تماماً).
     - «التطابق التام» مطفي → التجاوز مسموح (لأسباب تشغيلية) ويبقى تحذير بصري فقط. */
  const overBlocks = isOver && exactBalance;

  /* عدد القطع — تطلبه بعض الوصفات فقط */
  const needPieces = bom?.requirePieceCount === true;
  const pieceCountNum = Math.floor(num(pieceCount));
  // «ليست قطعة كاملة» بتتجاوز الإلزامية — بس لما تكون الوصفة طالبة العدد أصلاً
  const partial = needPieces && partialPiece;
  const pieceMissing = needPieces && !partial && !(pieceCountNum > 0);

  /* تاريخ انتهاء المادة الخام — تطلبه بعض الوصفات فقط */
  const needExpiry = bomNeedsRawExpiry(bom);
  const expiryMissing = needExpiry && !rawExpiry;
  // تنبيه ليّن: التاريخ قبل يوم التقطيع = مادة منتهية — بنحذّر ولا بنمنع،
  // لأن القرار قرار المشرف مش قرار الشاشة.
  const expiryPassed = needExpiry && !!rawExpiry && rawExpiry < cutDate;

  /* المسار لسا مبهم: أوزان مُدخلة بس ما انحصر المسار بواحد (مشتركة فقط) */
  const pathwayPending = isMultiPath && filled.length > 0 && !determined;

  const canSave =
    filled.length > 0 && usedKg > 0 && !rawMissing && !overBlocks && !wasteMissing
    && !balanceOff && !pieceMissing && !expiryMissing && !pathwayPending;

  /* ------- الانتقالات ------- */

  const startWithEmp = () => {
    const emp = empNo.trim();
    if (!emp || butcherBlocked) return;
    if (RULES.requireBranch !== false && !branch) return;
    try {
      localStorage.setItem(LAST_EMP_KEY, emp);
      localStorage.setItem(LAST_BRANCH_KEY, branch);
    } catch { /* ignore */ }
    setEmpNo(emp);
    // ابدأ بأول شاشة تصفية متاحة (نوع ← منشأ ← فئة)، وإلا الوصفات مباشرة
    setBomKind(null);
    setBomOrigin(null);
    setBomCat(null);
    setStep(firstFilterStep());
    dayPlan.reload();
  };

  /** أول شاشة تصفية معروضة — بتتخطّى الأبعاد اللي ما إلها تعريفات. */
  const firstFilterStep = () =>
    hasKindStep ? "kind" : hasOriginStep ? "origin" : hasCatStep ? "category" : "bom";

  /* اختيار النوع → المنشأ (أو الفئة/الوصفات إذا ما في) */
  const pickKind = (id) => {
    const rest = filterBomsByFacet(mrpCfg, allBoms, "kind", id);
    setBomKind(id);
    setBomOrigin(null);
    setBomCat(null);
    setBom(null);
    setBomSearch("");
    if (bomFacetOptions(mrpCfg, rest, "origin").opts.length) { setStep("origin"); return; }
    setStep(bomFacetOptions(mrpCfg, rest, "category").opts.length ? "category" : "bom");
  };

  /* اختيار المنشأ → الفئة (أو الوصفات إذا ما في فئات) */
  const pickOrigin = (id) => {
    const rest = filterBomsByFacet(mrpCfg, bomsOfKind, "origin", id);
    setBomOrigin(id);
    setBomCat(null);
    setBom(null);
    setBomSearch("");
    setStep(bomFacetOptions(mrpCfg, rest, "category").opts.length ? "category" : "bom");
  };

  /* اختيار فئة الوصفات → عرض وصفات هذه الفئة فقط */
  const pickCategory = (id) => {
    setBomCat(id);
    setBom(null);
    setBomSearch("");
    setStep("bom");
  };

  /* اختيار وصفة التقطيع → صفحة الأوزان (المسارات المتعددة تظهر كلها بنفس الصفحة) */
  const pickBom = (b) => {
    setBom(b);
    setCarcass("");
    setPieceCount("");
    setPartialPiece(false);
    setRawExpiry("");
    setDurationMin("");
    setActiveId("");
    setValues({});
    setError("");
    setEntryAt(new Date());   // لحظة بداية هالتسجيل، لا لحظة فتح الشاشة
    setStep("cuts");
  };

  /* ── لوحة الأرقام: قراءة وكتابة الخانة النشطة ──
     كل شي بيمرق من نفس setCarcass/setVal ونفس cleanDecimal، فالقواعد
     (خانتان عشريتان، النِّسب، المسارات) ما بتتغيّر أبداً. */
  const activeItem = activeId && activeId !== RAW_KEY
    ? ALL.find((c) => c.itemId === activeId) || null
    : null;
  const activeValue = activeId === RAW_KEY ? carcass : (values[activeId]?.w || "");
  const writeActive = (next) => {
    const v = cleanDecimal(next);
    if (activeId === RAW_KEY) { setCarcass(v); if (error) setError(""); return; }
    if (activeId) setVal(activeId, "w", v);
  };
  const padKey = (k) => {
    const cur = String(activeValue ?? "");
    if (k === "back") return writeActive(cur.slice(0, -1));
    if (k === "clear") return writeActive("");
    if (k === ".") return writeActive(cur.includes(".") ? cur : `${cur || "0"}.`);
    return writeActive(cur + k);
  };
  /* «التالي» = أول خانة متاحة بعد الحالية وما إلها وزن — الجزار بيمشي بلمسة. */
  const padNext = () => {
    const chain = [RAW_KEY, ...ALL.filter((c) => !itemLocked(c.itemId)).map((c) => c.itemId)];
    const i = chain.indexOf(activeId);
    const after = chain.slice(i + 1);
    const empty = after.find((id) => (id === RAW_KEY ? !(carcassKg > 0) : !(num(values[id]?.w) > 0)));
    setActiveId(empty || after[0] || "");
  };

  const setVal = (cutId, key, v) => {
    if (error) setError("");   // رسالة فشل قديمة ما بتضل معلّقة بعد التعديل
    setValues((prev) => ({ ...prev, [cutId]: { ...prev[cutId], [key]: v } }));
  };

  /* تفريغ كل الأوزان — لفكّ تعطيل المسارات والبدء بمسار آخر.
     منسأل قبل، لأن ضغطة غلط بتمحي شغل الجزار كله. */
  const clearWeights = () => {
    if (filled.length > 0
      && !window.confirm(t({ en: "Clear all entered weights?", ar: "تفريغ كل الأوزان المُدخلة؟" }))
    ) return;
    setValues({});
    setError("");
  };

  /* زر الحفظ ما بيحفظ فوراً — بيسأل عن الوقت المستغرق أولاً */
  const requestSave = () => {
    if (!canSave || saving) return;
    setError("");
    setAskTime(true);
  };

  const save = async (mins) => {
    if (!canSave || saving) return;
    setSaving(true);
    setError("");
    try {
      const payload = {
        employeeNo: empNo,
        branch,                                   // كود الملحمة/الفرع
        branchAr: branchObj?.ar || "",
        branchEn: branchObj?.en || "",
        // ── الوصفة (قائمة التقطيع) والمادة الخام ──
        bomId: bom?.id || "",
        bomRef: bom?.ref || "",
        bomCategoryId: bom?.categoryId || "",
        // المنشأ والنوع — لقطة وقت التسجيل حتى لو تعدّلت الوصفة لاحقاً
        bomOriginId: bom?.originId || "",
        bomOriginAr: bomOriginOf(mrpCfg, bom)?.ar || "",
        bomOriginEn: bomOriginOf(mrpCfg, bom)?.en || "",
        bomKindId: bom?.kindId || "",
        bomKindAr: bomKindOf(mrpCfg, bom)?.ar || "",
        bomKindEn: bomKindOf(mrpCfg, bom)?.en || "",
        // ── المسار المختار (وضع المسارات المتعددة) ──
        pathwayId: pathway?.id || "",
        pathwayCode: pathway?.code || "",
        pathwayName: pathway?.name || "",
        inputItemId: bom?.inputId || "",
        inputSku: inputItem?.sku || "",
        animal: inputItem?.ar || "",              // توافق مع View/Summary القديمة
        animalEn: inputItem?.en || "",
        carcassWeightKg: carcassKg,               // وزن المادة الخام قبل التقطيع
        // عدد القطع (إن طلبته الوصفة) — و«جزء من قطعة» بتخلّيه بلا قيمة
        pieceCount: needPieces && !partial ? pieceCountNum : null,
        partialPiece: partial,
        // تاريخ انتهاء المادة الخام — يدوي من ملصق المادة الداخلة
        rawExpiryDate: needExpiry ? rawExpiry : "",
        // الوقت المستغرق بالتقطيع (دقائق صحيحة) — يدوي من الجزار وقت الحفظ
        durationMin: mins,
        mode: "bom",
        // ── لقطة النسبة المعيارية ── تُحفظ بصمت مع السجل حتى لو تعدّلت الوصفة
        // لاحقاً. لا تُعرض بهذه الشاشة إطلاقاً — مرجعها الوحيد كرت المشرف.
        stdYieldOn: bomStdOn(bom),
        stdTolPct: bomStdOn(bom) ? bomStdTol(bom) : 0,
        // كم سطر إله نسبة معيارية وما انوزن إطلاقاً — يُستثنى من المقارنة، بس
        // المشرف بيشوف عددهم حتى يعرف إنه الجدول ما بيغطّي الوصفة كاملة
        stdSkipped: (() => {
          if (!bomStdOn(bom)) return 0;
          const ref = isMultiPath ? (determined ? [...chosenLineOf.values()] : []) : ALL;
          return ref.filter(
            (l) => num(l.stdPct) > 0 && !(num(values[l.itemId]?.w) > 0)
          ).length;
        })(),
        cuts: filled.map((x) => ({
          itemId: x.cut.itemId,
          cutId: x.cut.itemId,          // توافق مع الشاشات القديمة
          cut: x.cut.ar,
          cutEn: x.cut.en,
          kind: x.kind,                 // product | waste
          code: x.cut.sku || "",
          sku: x.cut.sku || "",
          uom: x.cut.uom || "",
          weightKg: roundKg(x.weightKg, RULES.roundTo),
          targetKg: Number(targetKgOf(x.cut).toFixed(3)),
          // النسبة المعيارية للسطر — من المسار المحدَّد إن وُجد، وإلا من السطر الموحّد
          stdPct: bomStdOn(bom)
            ? num(((isMultiPath && chosenLineOf.get(x.cut.itemId)) || x.cut).stdPct)
            : 0,
          wasteBoneKg: 0,
          pctOfCarcass: Number(pctOf(x.weightKg).toFixed(2)),
        })),
        cutsTotalKg: Number(cutsKg.toFixed(3)),
        wasteBoneTotalKg: Number(wasteKg.toFixed(3)),
        netYieldPct: Number(netYieldPct.toFixed(2)),  // نسبة التصافي
        wastePct: Number(wastePct.toFixed(2)),        // نسبة الهدر
        wasteTotalKg: Number(wasteOnlyKg.toFixed(3)),
        boneTotalKg: 0,
        // تاريخ التقطيع — هو تاريخ السجل المعتمد بالتقارير
        date: RULES.allowBackdate === true ? cutDate : todayStr(),
        cutDate: RULES.allowBackdate === true ? cutDate : todayStr(),
        // تاريخ إدخال البيانات — لحظة الحفظ الفعلية
        entryDate: todayStr(),
        entryAt: new Date().toISOString(),
        butcherName: person?.name || "",
        butcherJob: person?.job || "",
        savedAt: new Date().toISOString(),
      };
      // يذهب للسيرفر فوراً، وإن كان النت مقطوعاً يدخل صندوق الصادر ويُزامن لاحقاً
      const res = await saveOrQueue(payload);
      setSaved({
        animal: itemName(inputItem, isAr),
        origin: bom?.ref || "",
        carcassKg, cutsKg, wasteKg, count: cutCount, netYieldPct, wastePct,
        pieceCount: needPieces && !partial ? pieceCountNum : null,
        partialPiece: partial,
        rawExpiry: needExpiry ? rawExpiry : "",
        durationMin: mins,
        cutDate: RULES.allowBackdate === true ? cutDate : todayStr(),
        entryStamp: stampStr(new Date()),
        queued: res.queued === true,
        refNo: opNoLabel(res.refNo),   // رقم العملية المميّز من السيرفر + بادئة INV-
      });
      setStep("done");
      dayPlan.reload();
    } catch (e) {
      setError(e?.message || t({ en: "Save failed", ar: "فشل الحفظ" }));
    } finally {
      setSaving(false);
    }
  };

  const newEntry = () => {
    setCutDate(todayStr());
    setEntryAt(new Date());
    setBomKind(null);
    setBomOrigin(null);
    setBomCat(null);
    setBom(null);
    setCarcass("");
    setPieceCount("");
    setPartialPiece(false);
    setRawExpiry("");
    setDurationMin("");
    setActiveId("");
    setValues({});
    setBomSearch("");
    setError("");
    setSaved(null);
    setStep(firstFilterStep());
  };

  /** رجوع خطوة — لأقرب شاشة تصفية معروضة قبل الحالية. */
  const back = () => {
    const beforeCat = hasOriginStep ? "origin" : hasKindStep ? "kind" : "emp";
    if (step === "kind") { setStep("emp"); return; }
    if (step === "origin") { setStep(hasKindStep ? "kind" : "emp"); return; }
    if (step === "category") { setStep(beforeCat); return; }
    if (step === "bom") { setBomSearch(""); setStep(hasCatStep ? "category" : beforeCat); return; }
    if (step === "cuts") {
      // اختيار وصفة بيصفّر الأوزان — فالرجوع بيضيّعها. منسأل قبل.
      if (filled.length > 0 && !window.confirm(t({
        en: "Go back? The weights you entered will be discarded.",
        ar: "رجوع؟ الأوزان اللي دخّلتها رح تنمسح.",
      }))) return;
      setStep("bom");
      return;
    }
  };

  const KG = t({ en: "kg", ar: "كجم" });

  // الكشك (بلا حساب) يمرّ دائماً — isItemAllowed ترجع true بلا قائمة تقييد
  if (!canOpenButcherPage("butcher.entry")) return <NoAccess page="butcher.entry" />;

  /* ------- العرض ------- */

  return (
    <div dir={dir} className="bt" style={S.page}>
      <style>{CSS}</style>
      <div style={{ ...S.wrap, ...(step === "cuts" ? S.wrapWide : null) }}>
        <div style={S.header}>
          <div className="bt-title" style={S.title}>
            🔪 {t({ en: "Butcher", ar: "الجزار" })}
          </div>
          <div style={S.headerRight}>
            {/* حالة الاتصال والمزامنة — تظهر فقط لما يكون في شي يستحق الانتباه */}
            {(!outbox.online || outbox.pending > 0) && (
              <button
                type="button"
                className="bt-small"
                onClick={outbox.sync}
                disabled={outbox.syncing || !outbox.online}
                style={{
                  ...S.syncChip,
                  ...(outbox.online ? S.syncPending : S.syncOffline),
                }}
                title={t({ en: "Sync now", ar: "زامن الآن" })}
              >
                {!outbox.online
                  ? `📴 ${t({ en: "Offline", ar: "بلا إنترنت" })}${outbox.pending ? ` · ${outbox.pending}` : ""}`
                  : outbox.syncing
                    ? `⏳ ${t({ en: "Syncing…", ar: "جارٍ المزامنة…" })}`
                    : `📤 ${outbox.pending} ${t({ en: "unsynced", ar: "غير مُزامن" })}`}
              </button>
            )}
            <span className="bt-toggle">
              <LangToggle lang={lang} toggle={toggle} style={S.langBtn} />
            </span>
            {step === "emp" && isLoggedIn && (
              <button className="bt-small" style={S.chg} onClick={() => navigate("/butcher", { replace: true })}>
                {t({ en: "Back to section", ar: "رجوع للقسم" })}
              </button>
            )}
            {step !== "emp" && (
              <div className="bt-emp" style={S.emp}>
                {empNo}
                <button className="bt-small" style={S.chg} onClick={() => setStep("emp")}>
                  {t({ en: "Change", ar: "تغيير" })}
                </button>
              </div>
            )}
          </div>
        </div>

        {step !== "emp" && step !== "done" && (
          <StepBar
            step={step}
            hasKind={hasKindStep} hasOrigin={hasOriginStep} hasCat={hasCatStep}
            t={t}
          />
        )}

        {/* تعذّر تحميل الخطة/التقدّم — نقولها بدل ما يختفي الشريط بلا سبب.
            التسجيل نفسه غير متأثّر، فنطمئن الجزار على ذلك صراحةً. */}
        {step !== "emp" && step !== "done" && dayPlan.error && (
          <div className="bt-sum" style={S.planWarn}>
            ⚠️ {t({
              en: "Today's figures could not be loaded, so the plan bar is out of date. Recording works normally.",
              ar: "ما قدرنا نحمّل أرقام اليوم، فشريط الخطة مش محدّث. التسجيل شغّال عادي.",
            })}{" "}
            <button type="button" className="bt-small" style={S.chg} onClick={dayPlan.reload}>
              ↻ {t({ en: "Try again", ar: "إعادة المحاولة" })}
            </button>
          </div>
        )}

        {/* ── خطة اليوم: هدف الملحمة والتقدّم عليه ── */}
        {step !== "emp" && dayPlan.plan && dayPlan.progress && (
          <DayPlanBar
            plan={dayPlan.plan}
            progress={dayPlan.progress}
            branchName={branchObj ? nameOf(branchObj, isAr) : ""}
            KG={KG}
            t={t}
          />
        )}

        {step !== "emp" && step !== "done" && totals && (
          <div className="bt-chip" style={S.totals}>
            {t({ en: "Today", ar: "اليوم" })}: {totals.count}{" "}
            {t({ en: "carcasses", ar: "ذبيحة" })} — {totals.kg.toFixed(2)} {KG}
          </div>
        )}

        {step !== "emp" && step !== "done" && (
          <div style={S.crumbs}>
            {locked && (
              <span className="bt-chip" style={S.crumb}>
                👤 {identity.name} · #{identity.empNo}
              </span>
            )}
            {branchObj && <span className="bt-chip" style={S.crumb}>{nameOf(branchObj, isAr)}</span>}
            {kindName && <span className="bt-chip" style={S.crumb}>🐑 {kindName}</span>}
            {originName && <span className="bt-chip" style={S.crumb}>🌍 {originName}</span>}
            {bomCatName && <span className="bt-chip" style={S.crumb}>{bomCatName}</span>}
            {bom && <span className="bt-chip" style={S.crumb}>{bom.ref}</span>}
            {pathway && (
              <span className="bt-chip" style={{ ...S.crumb, color: "#6d28d9" }}>
                🔀 {pathway.code}{pathway.name ? ` · ${pathway.name}` : ""}
              </span>
            )}
            {inputItem && <span className="bt-chip" style={S.crumb}>{itemName(inputItem, isAr)}</span>}
            {step === "cuts" && carcassKg > 0 && (
              <span className="bt-chip" style={S.crumb}>
                {t({ en: "Raw material", ar: "المادة الخام" })}: {carcassKg.toFixed(2)} {KG}
              </span>
            )}
          </div>
        )}

        {/* 1 — الهوية + الملحمة.
             حساب مربوط بموظف (جزار أو مشرف) → بطاقة جاهزة مقفولة
             (اسم · رقم وظيفي · ملحمة). غير مربوط (كشك مشترك) → نفس الشاشة
             القديمة حرفياً. */}
        {step === "emp" && locked && (
          <div style={S.card}>
            <div className="bt-q" style={S.q}>
              {t({ en: "Welcome", ar: "أهلاً" })}
            </div>

            <div className="bt-rise" style={S.person}>
              <span style={S.personAvatar}>👤</span>
              <span style={S.personBody}>
                <span className="bt-name" style={S.personName}>{identity.name}</span>
                <span className="bt-lbl" style={S.personJob}>
                  {t({ en: "Employee no.", ar: "الرقم الوظيفي" })}: {identity.empNo}
                  {identity.role === "supervisor" && ` · ${t({ en: "Supervisor", ar: "مشرف" })}`}
                  {identity.role === "manager" && ` · ${t({ en: "Area manager", ar: "مدير منطقة" })}`}
                </span>
                {branchObj && (
                  <span className="bt-lbl" style={S.personBranch}>
                    {nameOf(branchObj, isAr)}
                  </span>
                )}
              </span>
            </div>

            {identity.pending || identity.sites.length > 1 ? (
              <>
                <div className="bt-lbl" style={S.personHint}>
                  {identity.pending
                    ? t({
                        en: "Your transfer has not started yet — choose the butchery you are working in today.",
                        ar: "نقلك لسّا ما بلّش — اختر الملحمة اللي عم تشتغل فيها اليوم.",
                      })
                    : t({
                        en: "You cover more than one butchery — pick the one you are working in today.",
                        ar: "إنت مسؤول عن أكتر من ملحمة — اختر اللي عم تشتغل فيها اليوم.",
                      })}
                </div>
                <select
                  className="bt-cutnum"
                  value={branch}
                  onChange={(e) => { branchTouched.current = true; setBranch(e.target.value); }}
                  style={S.select}
                >
                  <option value="">{t({ en: "Select…", ar: "اختر…" })}</option>
                  {myBranches.map((b) => (
                    <option key={b.code} value={b.code}>{nameOf(b, isAr)}</option>
                  ))}
                </select>
              </>
            ) : (
              <div className="bt-lbl" style={S.personHint}>
                {identity.role === "butcher"
                  ? t({
                      en: "Your number and butchery come from the workforce registry. Ask your supervisor if anything here is wrong.",
                      ar: "رقمك وملحمتك بيجوا من سجل القوى العاملة. إذا في شي غلط هون راجع مشرفك.",
                    })
                  : t({
                      en: "Your number and butchery come from the workforce registry. Whatever you record here is stamped with your own number.",
                      ar: "رقمك وملحمتك بيجوا من سجل القوى العاملة. أي شي بتسجّله هون بينختم برقمك إنت.",
                    })}
              </div>
            )}

            <button
              className="bt-btn"
              onClick={startWithEmp}
              autoFocus
              disabled={RULES.requireBranch !== false && !branch}
              style={{
                ...S.primary,
                ...(RULES.requireBranch === false || branch ? null : S.disabled),
              }}
            >
              {t({ en: "Start", ar: "ابدأ" })}
            </button>
          </div>
        )}

        {step === "emp" && !locked && (
          <div style={S.card}>
            <div className="bt-q" style={S.q}>
              {t({ en: "Employee number", ar: "الرقم الوظيفي" })}
            </div>
            <input
              className="bt-num"
              value={empNo}
              onChange={(e) => setEmpNo(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && startWithEmp()}
              inputMode="numeric"
              autoFocus
              placeholder="0000"
              style={S.input}
            />
            {empNo.trim() && person && (
              <div className="bt-rise" style={S.person}>
                <span style={S.personAvatar}>👤</span>
                <span style={S.personBody}>
                  <span className="bt-name" style={S.personName}>{person.name || empNo}</span>
                  {person.job && (
                    <span className="bt-lbl" style={S.personJob}>{person.job}</span>
                  )}
                  {person.branchLabel && (
                    <span className="bt-lbl" style={S.personBranch}>{person.branchLabel}</span>
                  )}
                </span>
              </div>
            )}
            {empNo.trim() && !person && !butcherBlocked && (
              <div className="bt-lbl" style={S.personHint}>
                {t({
                  en: "Number not found in the employee register — you can still continue.",
                  ar: "الرقم غير موجود في سجل الموظفين — بتقدر تكمّل عادي.",
                })}
              </div>
            )}
            {butcherBlocked && (
              <div className="bt-sum" style={S.error}>
                {t({
                  en: "This employee number is not registered. Ask your supervisor to register it before you start.",
                  ar: "هذا الرقم الوظيفي غير مسجّل. راجع المشرف لتسجيله قبل ما تبدأ.",
                })}
              </div>
            )}

            <div className="bt-q" style={S.q}>
              {t({ en: "Butchery / Branch", ar: "الملحمة / الفرع" })}
            </div>
            <select
              className="bt-cutnum"
              value={branch}
              onChange={(e) => { branchTouched.current = true; setBranch(e.target.value); }}
              style={S.select}
            >
              <option value="">{t({ en: "Select…", ar: "اختر…" })}</option>
              {BRANCHES.map((b) => (
                <option key={b.code} value={b.code}>{nameOf(b, isAr)}</option>
              ))}
            </select>
            <button
              className="bt-btn"
              onClick={startWithEmp}
              disabled={!empNo.trim() || butcherBlocked || (RULES.requireBranch !== false && !branch)}
              style={{
                ...S.primary,
                ...(empNo.trim() && !butcherBlocked && (RULES.requireBranch === false || branch)
                  ? null : S.disabled),
              }}
            >
              {t({ en: "Enter", ar: "دخول" })}
            </button>
          </div>
        )}

        {/* 2أ — اختيار النوع (تعريف من قوائم التقطيع) */}
        {step === "kind" && (
          <FacetStep
            dim="kind" pick={kindPick} onPick={pickKind}
            title={t({ en: "Choose the type", ar: "اختر النوع" })}
            t={t} isAr={isAr}
          />
        )}

        {/* 2ب — اختيار المنشأ (ضمن النوع المختار) */}
        {step === "origin" && (
          <FacetStep
            dim="origin" pick={originPick} onPick={pickOrigin}
            title={t({ en: "Choose the origin", ar: "اختر المنشأ" })}
            t={t} isAr={isAr}
          />
        )}

        {/* 2ج — اختيار فئة الوصفات (آخر شاشة قبل الوصفات) */}
        {step === "category" && (
          <FacetStep
            dim="category" pick={catPick} onPick={pickCategory}
            title={t({ en: "Choose a category", ar: "اختر الفئة" })}
            t={t} isAr={isAr}
          />
        )}

        {/* 3 — اختيار وصفة التقطيع (Cutting BOM) */}
        {step === "bom" && (
          <>
            <div className="bt-q" style={S.q}>
              {t({ en: "Choose a cutting recipe", ar: "اختر وصفة التقطيع" })}
            </div>
            {!shownBoms.length && (
              <div className="bt-sum" style={S.emptyBox}>
                {t({
                  en: "No cutting recipes here — add them in Manufacturing → Cutting BOMs.",
                  ar: "لا توجد وصفات تقطيع هنا — ضيفها من التصنيع ← قوائم التقطيع (Cutting BOMs).",
                })}
              </div>
            )}
            {shownBoms.length > 3 && (
              <input
                className="bt-cutnum"
                value={bomSearch}
                onChange={(e) => setBomSearch(e.target.value)}
                placeholder={t({ en: "Search recipe / raw material…", ar: "بحث بالوصفة أو المادة الخام…" })}
                style={S.input}
              />
            )}
            <div style={S.grid}>
              {shownBoms
                .filter((b) => {
                  const q = bomSearch.trim().toLowerCase();
                  if (!q) return true;
                  const inp = bomInputItem(mrpCfg, b);
                  const tg = bomTags(mrpCfg, b, isAr);
                  return [b.ref, inp?.sku, inp?.ar, inp?.en, tg.origin, tg.kind]
                    .filter(Boolean).join(" ").toLowerCase().includes(q);
                })
                .map((b) => {
                  const inp = bomInputItem(mrpCfg, b);
                  const tags = bomTags(mrpCfg, b, isAr);
                  const multi = bomIsMultiPath(b);
                  const outN = multi
                    ? activePathwaysOf(b).length
                    : (b.outputs || []).length;
                  return (
                    <button key={b.id} className="bt-press" onClick={() => pickBom(b)} style={S.tile}>
                      <span className="bt-name" style={S.name}>{itemName(inp, isAr)}</span>
                      {altNameOf(inp, isAr) && (
                        <span className="bt-lbl" style={S.altName}>{altNameOf(inp, isAr)}</span>
                      )}
                      <span className="bt-lbl" style={S.code}>{b.ref}</span>
                      {(tags.origin || tags.kind) && (
                        <span className="bt-lbl" style={S.altName}>
                          {[tags.kind && `🐑 ${tags.kind}`, tags.origin && `🌍 ${tags.origin}`]
                            .filter(Boolean).join(" · ")}
                        </span>
                      )}
                      <span className="bt-lbl" style={{ color: "#6b8299", fontWeight: 800 }}>
                        {multi
                          ? `🔀 ${outN} ${t({ en: "pathways", ar: "مسار" })}`
                          : `${outN} ${t({ en: "final products", ar: "منتج نهائي" })}`}
                      </span>
                    </button>
                  );
                })}
            </div>
          </>
        )}

        {/* 3 — الأوزان: المادة الخام + النواتج بنفس الصفحة */}
        {step === "cuts" && (
          <>
            {/* ── وزن المادة الخام (يغذّي النسب المئوية للنواتج) ── */}
            <div style={S.rawCard}>
              <div style={S.rawHead}>
                <span className="bt-lbl" style={{ color: "#6b8299", fontWeight: 800 }}>
                  {t({ en: "Raw material", ar: "المادة الخام" })}
                </span>
                {inputItem && (
                  <>
                    <span className="bt-name" style={S.name}>{itemName(inputItem, isAr)}</span>
                    {altNameOf(inputItem, isAr) && (
                      <span className="bt-lbl" style={S.altName}>{altNameOf(inputItem, isAr)}</span>
                    )}
                  </>
                )}
              </div>
              <label style={S.rawField}>
                <span className="bt-lbl" style={S.lbl}>
                  {t({ en: "Weight before cutting (kg)", ar: "الوزن قبل التقطيع (كجم)" })}
                </span>
                <input
                  className="bt-num"
                  value={carcass}
                  onChange={(e) => setCarcass(cleanDecimal(e.target.value))}
                  onFocus={() => setActiveId(RAW_KEY)}
                  onKeyDown={focusNextWeight}
                  data-bt-w=""
                  inputMode="decimal"
                  autoFocus
                  placeholder="0.00"
                  style={{
                    ...S.input,
                    ...(rawMissing && filled.length > 0 ? S.inputBad : null),
                    ...(activeId === RAW_KEY ? S.inputActive : null),
                  }}
                />
                <span className="bt-lbl" style={S.hintSm}>
                  {t({
                    en: "Two decimals max (e.g. 10.25)",
                    ar: "خانتان عشريتان كحدّ أقصى (مثال: ١٠٫٢٥)",
                  })}
                </span>
              </label>
              {needPieces && (
                <div style={S.rawField}>
                  <span className="bt-lbl" style={S.lbl}>
                    {t({ en: "Number of pieces", ar: "عدد القطع" })}
                  </span>
                  <input
                    className="bt-num"
                    value={partial ? "" : pieceCount}
                    onChange={(e) => setPieceCount(cleanInt(e.target.value))}
                    onKeyDown={focusNextWeight}
                    data-bt-w=""
                    inputMode="numeric"
                    disabled={partial}
                    placeholder={partial ? "—" : "0"}
                    style={{
                      ...S.input,
                      ...(pieceMissing ? S.inputBad : null),
                      ...(partial ? S.inputOff : null),
                    }}
                  />

                  {/* تجاوز الإلزامية: الداخل جزء من قطعة، فما في عدد قطع */}
                  <button
                    type="button"
                    onClick={() => {
                      setPartialPiece((v) => {
                        if (!v) setPieceCount("");     // تفعيل = ما في عدد
                        return !v;
                      });
                      if (error) setError("");
                    }}
                    style={{ ...S.partialBtn, ...(partial ? S.partialBtnOn : null) }}
                  >
                    <span style={{ ...S.partialBox, ...(partial ? S.partialBoxOn : null) }}>
                      {partial ? "✓" : ""}
                    </span>
                    <span style={{ textAlign: "start" }}>
                      {t({ en: "Not a whole piece", ar: "ليست قطعة كاملة" })}
                      <span className="bt-lbl" style={S.partialHint}>
                        {t({
                          en: "Part of a carcass/cut — no piece count to record.",
                          ar: "جزء من ذبيحة أو قطعة — ما في عدد قطع يتسجّل.",
                        })}
                      </span>
                    </span>
                  </button>
                </div>
              )}

              {needExpiry && (
                <label style={S.rawField}>
                  <span className="bt-lbl" style={S.lbl}>
                    📅 {t({ en: "Raw material expiry date", ar: "تاريخ انتهاء المادة الخام" })}
                  </span>
                  <input
                    className="bt-cutnum"
                    type="date"
                    value={rawExpiry}
                    onChange={(e) => { setRawExpiry(e.target.value); if (error) setError(""); }}
                    style={{
                      ...S.input,
                      ...(expiryMissing ? S.inputBad : null),
                      ...(expiryPassed ? { borderColor: "#e88", background: "#fff7f7" } : null),
                    }}
                  />
                  <span className="bt-lbl" style={S.hintSm}>
                    {expiryPassed
                      ? t({
                          en: "⚠️ This date is before the cutting date — the raw material is expired.",
                          ar: "⚠️ هالتاريخ قبل تاريخ التقطيع — المادة الخام منتهية.",
                        })
                      : t({
                          en: "From the label on the incoming carcass/cut.",
                          ar: "من الملصق الموجود على الذبيحة/القطعة الداخلة.",
                        })}
                  </span>
                </label>
              )}

              {/* ── التواريخ: تاريخ التقطيع (يختاره الجزار) وتاريخ الإدخال (تلقائي) ── */}
              <div style={S.dateRow}>
                <label style={S.dateField}>
                  <span className="bt-lbl" style={S.lbl}>
                    {t({ en: "Cutting date", ar: "تاريخ التقطيع" })}
                  </span>
                  <input
                    className="bt-cutnum"
                    type="date"
                    value={cutDate}
                    max={todayStr()}
                    disabled={RULES.allowBackdate !== true}
                    onChange={(e) => setCutDate(e.target.value)}
                    style={{
                      ...S.select,
                      ...(RULES.allowBackdate !== true ? { background: "#f1f6fb", color: "#6b8299" } : null),
                    }}
                  />
                </label>
                <label style={S.dateField}>
                  <span className="bt-lbl" style={S.lbl}>
                    {t({ en: "Data entry date", ar: "تاريخ إدخال البيانات" })}
                  </span>
                  <span className="bt-cutnum" style={S.stamp}>{stampStr(entryAt)}</span>
                </label>
              </div>
            </div>

            {/* ── شريط التقدّم: كم انوزن من الخام وكم ضلّ ── */}
            {carcassKg > 0 && (
              <div style={S.progWrap}>
                <div style={S.progTop}>
                  <span className="bt-name" style={{ fontWeight: 900 }}>
                    {isOver
                      ? `⚠️ ${t({ en: "Over by", ar: "زايد" })} ${overKg.toFixed(2)} ${KG}`
                      : `${t({ en: "Remaining", ar: "ضلّ" })} ${remainingKg.toFixed(2)} ${KG}`}
                  </span>
                  <span className="bt-lbl" style={{ color: "#6b8299", fontWeight: 800 }}>
                    {usedKg.toFixed(2)} / {carcassKg.toFixed(2)} {KG}
                  </span>
                </div>
                <div style={S.progBar}>
                  <i style={{
                    ...S.progFill,
                    width: `${Math.min(100, carcassKg > 0 ? (cutsKg / carcassKg) * 100 : 0)}%`,
                    background: "#2f8f83",
                  }} />
                  <i style={{
                    ...S.progFill,
                    width: `${Math.min(100, carcassKg > 0 ? (wasteKg / carcassKg) * 100 : 0)}%`,
                    background: "#e0a63e",
                  }} />
                </div>
                <div style={S.progLegend}>
                  <span>🟩 {t({ en: "Products", ar: "النواتج" })} {cutsKg.toFixed(2)}</span>
                  <span>🟧 {t({ en: "Waste", ar: "الهدر" })} {wasteKg.toFixed(2)}</span>
                  <span>⬜ {t({ en: "Left", ar: "الباقي" })} {Math.max(0, remainingKg).toFixed(2)}</span>
                </div>
              </div>
            )}

            {/* بانر المسارات — التوجيه/الحالة (يظهر بوضع المسارات فقط) */}
            {isMultiPath && (
              <div className="bt-sum" style={{
                ...S.emptyBox, textAlign: "start",
                background: determined ? "#ecfdf5" : "#f7f5ff",
                borderColor: determined ? "#a7f3d0" : "#c9b8f2",
                color: determined ? "#047857" : "#4c1d95",
                display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap",
              }}>
                {determined ? (
                  <>
                    <b>✓ {t({ en: "Pathway", ar: "المسار" })}: {pathway?.code}{pathway?.name ? ` · ${pathway.name}` : ""}</b>
                    <button type="button" className="bt-small" style={S.chg} onClick={clearWeights}>
                      ↺ {t({ en: "change pathway", ar: "تغيير المسار" })}
                    </button>
                  </>
                ) : (
                  <span>🔀 {pathwayPending
                    ? t({ en: "Weigh a product specific to one pathway to lock the routing.", ar: "وزّن منتجاً خاصاً بمسار واحد لتحديد المسار." })
                    : t({ en: "Weigh the products — a distinguishing one selects the pathway; the rest lock.", ar: "وزّن المنتجات — المنتج المميِّز بيحدّد المسار وباقي المسارات بتتعطّل." })}
                  </span>
                )}
              </div>
            )}

            {/* ── المنتجات النهائية (قائمة موحّدة بلا تكرار) ── */}
            <div style={S.sectionBar}>
              <span className="bt-name" style={{ fontWeight: 900 }}>
                🥩 {t({ en: "Final products", ar: "المنتجات النهائية" })}
              </span>
              <span className="bt-lbl" style={S.countChip}>
                {productCuts.filter((c) => num(values[c.itemId]?.w) > 0).length} / {productCuts.length}{" "}
                {t({ en: "weighed", ar: "موزون" })}
              </span>
            </div>
            <div style={S.grid}>
              {productCuts.map((c) => {
                const w = num(values[c.itemId]?.w);
                const info = isMultiPath ? chosenLineOf.get(c.itemId) : c;
                const target = targetKgOf({ targetQty: info ? info.targetQty : (isMultiPath ? 0 : c.targetQty) });
                return (
                  <ItemCard
                    key={c.itemId}
                    item={c}
                    disabled={itemLocked(c.itemId)}
                    value={values[c.itemId]?.w || ""}
                    onChange={(v) => setVal(c.itemId, "w", v)}
                    selected={activeId === c.itemId}
                    onSelect={() => setActiveId(c.itemId)}
                    code={c.sku}
                    pct={showPct && w > 0 && carcassKg > 0 ? pctOf(w) : null}
                    pctLabel={t({ en: "of raw", ar: "من الخام" })}
                    target={target > 0 ? target : null}
                    targetLabel={t({ en: "target", ar: "الهدف" })}
                    tone={targetTone(target, w)}
                    isAr={isAr}
                    t={t}
                  />
                );
              })}
              {!productCuts.length && (
                <div className="bt-sum" style={S.emptyBox}>
                  {isMultiPath
                    ? t({ en: "This recipe has no active pathway — activate one in Manufacturing → Cutting BOMs.", ar: "هالوصفة ما فيها مسار مفعّل — فعّل واحد من التصنيع ← قوائم التقطيع." })
                    : t({ en: "This recipe has no final products — fix the BOM.", ar: "هالوصفة بلا منتجات نهائية — صحّح الوصفة." })}
                </div>
              )}
            </div>

            {/* ── الهدر (قائمة موحّدة بلا تكرار) ── */}
            {wasteCuts.length > 0 && (
              <>
                <div style={S.sectionBar}>
                  <span className="bt-name" style={{ fontWeight: 900 }}>
                    🦴 {t({ en: "Waste", ar: "الهدر" })}
                  </span>
                  <span className="bt-lbl" style={S.countChip}>
                    {wasteCuts.filter((c) => num(values[c.itemId]?.w) > 0).length} / {wasteCuts.length}{" "}
                    {t({ en: "weighed", ar: "موزون" })}
                  </span>
                </div>
                <div style={S.wasteRow}>
                  {wasteCuts.map((c) => {
                    const w = num(values[c.itemId]?.w);
                    return (
                      <ItemCard
                        key={c.itemId}
                        item={c}
                        disabled={itemLocked(c.itemId)}
                        value={values[c.itemId]?.w || ""}
                        onChange={(v) => setVal(c.itemId, "w", v)}
                        selected={activeId === c.itemId}
                        onSelect={() => setActiveId(c.itemId)}
                        code={c.sku}
                        pct={showPct && w > 0 && carcassKg > 0 ? pctOf(w) : null}
                        pctLabel={t({ en: "of raw", ar: "من الخام" })}
                        tone={S.wasteTone}
                        isAr={isAr}
                        t={t}
                      />
                    );
                  })}
                </div>
              </>
            )}

            <div className="bt-sum" style={{ ...S.sumBar, ...(isOver ? S.sumBarOver : null) }}>
              <ProgressRing used={usedKg} total={carcassKg} over={isOver} t={t} />
              <span>{t({ en: "Products", ar: "النواتج" })}: <b>{cutsKg.toFixed(2)}</b></span>
              <span>{t({ en: "Waste", ar: "الهدر" })}: <b>{wasteKg.toFixed(2)}</b></span>
              <span>{t({ en: "Raw material", ar: "المادة الخام" })}: <b>{carcassKg.toFixed(2)}</b></span>
              <span style={isOver ? S.overText : null}>
                {t({ en: "Remaining", ar: "المتبقي" })}: <b>{remainingKg.toFixed(2)}</b> {KG}
              </span>
              {/* تفريغ سريع — بوضع المسارات موجود ببانر المسار فوق */}
              {filled.length > 0 && !isMultiPath && (
                <button type="button" className="bt-small" style={S.chg} onClick={clearWeights}>
                  ↺ {t({ en: "Clear weights", ar: "تفريغ الأوزان" })}
                </button>
              )}
            </div>

            {/* النِّسب من وزن المادة الخام */}
            <div className="bt-sum" style={S.pctBar}>
              <span>
                {t({ en: "Net yield", ar: "نسبة التصافي" })}: <b>{netYieldPct.toFixed(1)}%</b>
              </span>
              <span>
                {t({ en: "Waste %", ar: "نسبة الهدر" })}: <b>{wastePct.toFixed(1)}%</b>
              </span>
            </div>

            {exactBalance && (
              <div className="bt-sum" style={{ ...S.pctBar, ...(balanceOff ? S.sumBarOver : null) }}>
                <span>🎯 {t({ en: "Exact balance required", ar: "مطلوب تطابق تام" })}</span>
                <span style={balanceOff ? S.overText : { color: "#166534", fontWeight: 900 }}>
                  {carcassKg <= 0
                    ? t({ en: "enter the raw material weight", ar: "أدخل وزن المادة الخام" })
                    : Math.abs(balanceDiff) <= 1e-6
                      ? `✓ ${t({ en: "matched", ar: "مطابق تماماً" })}`
                      : balanceDiff > 0
                        ? `${t({ en: "short by", ar: "ناقص" })} ${balanceDiff.toFixed(2)} ${KG}`
                        : `${t({ en: "over by", ar: "زايد" })} ${Math.abs(balanceDiff).toFixed(2)} ${KG}`}
                </span>
              </div>
            )}

            {rawMissing && filled.length > 0 && (
              <div className="bt-sum" style={S.warn}>
                {t({
                  en: "Enter the raw material weight — every percentage is based on it.",
                  ar: "أدخل وزن المادة الخام — كل النسب مبنية عليه.",
                })}
              </div>
            )}
            {rawFar && (
              <div className="bt-sum" style={S.warn}>
                {isAr
                  ? `تأكّد من الوزن: الوزن القياسي لهالوصفة ${inputQty} كجم تقريباً.`
                  : `Check the weight: this recipe's standard input is about ${inputQty} kg.`}
              </div>
            )}
            {pieceMissing && (
              <div className="bt-sum" style={S.warn}>
                {t({
                  en: "Number of pieces is required for this recipe.",
                  ar: "إدخال عدد القطع إلزامي لهالوصفة.",
                })}
              </div>
            )}
            {wasteMissing && (
              <div className="bt-sum" style={S.warn}>
                {t({
                  en: "Waste weight is required.",
                  ar: "إدخال وزن الهدر إلزامي.",
                })}
              </div>
            )}
            {isOver && (
              <div className="bt-sum" style={overBlocks ? S.error : S.warn}>
                {overBlocks
                  ? (isAr
                      ? `المجموع أكبر من وزن المادة الخام بـ ${overKg.toFixed(2)} كجم — صحّح الأوزان قبل الحفظ.`
                      : `Total exceeds the raw material weight by ${overKg.toFixed(2)} kg — fix the weights before saving.`)
                  : (isAr
                      ? `تنبيه: المجموع أكبر من وزن المادة الخام بـ ${overKg.toFixed(2)} كجم — مسموح الحفظ لأن التطابق التام غير مفعّل.`
                      : `Note: total exceeds the raw material weight by ${overKg.toFixed(2)} kg — saving is allowed because exact balance is off.`)}
              </div>
            )}
            {error && <div className="bt-sum" style={S.error}>{error}</div>}

            {/* ── لوحة الأرقام: إدخال بلمسة كبيرة بدل الكيبورد ── */}
            {activeId && (
              <NumPad
                t={t}
                title={activeId === RAW_KEY
                  ? t({ en: "Raw material weight", ar: "وزن المادة الخام" })
                  : (nameOf(activeItem, isAr) || "")}
                value={activeValue}
                onKey={padKey}
                onNext={padNext}
                onClose={() => setActiveId("")}
                KG={KG}
              />
            )}

            {/* رصيف الحفظ — ملتصق بأسفل الشاشة حتى ما يضيع تحت شبكة طويلة */}
            <div style={S.saveDock}>
              {(carcassKg > 0 || filled.length > 0) && (
                <div className="bt-small" style={S.dockLine}>
                  <span>
                    {t({ en: "Remaining", ar: "المتبقي" })}:{" "}
                    <b style={isOver ? S.overText : null}>{remainingKg.toFixed(2)}</b> {KG}
                  </span>
                  <span>
                    {t({ en: "Net yield", ar: "التصافي" })}: <b>{netYieldPct.toFixed(1)}%</b>
                  </span>
                  <span>
                    {t({ en: "Weighed", ar: "الموزون" })}: <b>{cutCount}</b>
                    {wasteOnlyKg > 0 ? ` + ${t({ en: "waste", ar: "هدر" })}` : ""}
                  </span>
                </div>
              )}
              <button
                className="bt-btn"
                onClick={requestSave}
                disabled={!canSave || saving}
                style={{ ...S.primary, ...(canSave && !saving ? null : S.disabled) }}
              >
                {saving
                  ? t({ en: "Saving…", ar: "جارٍ الحفظ…" })
                  : `${t({ en: "Save", ar: "حفظ" })} (${cutCount})`}
              </button>
            </div>
          </>
        )}

        {/* 6 — تم */}
        {step === "done" && saved && (
          <div style={S.card}>
            <div className="bt-done bt-pop" style={{ textAlign: "center" }}>
              {saved.queued ? "📥" : "✅"}
            </div>
            <div className="bt-q" style={S.q}>{saved.animal} — {saved.origin}</div>
            {/* رقم العملية المميّز — يخصّصه السيرفر لكل فرع على حدة */}
            {saved.refNo && (
              <div className="bt-sum" style={S.opNoBox}>
                <span style={{ fontWeight: 800, opacity: 0.75 }}>
                  {t({ en: "Operation no.", ar: "رقم العملية" })}
                </span>
                <b className="bt-q" style={{ letterSpacing: ".5px" }}>{saved.refNo}</b>
              </div>
            )}
            {/* حُفظ محلياً — لا يضيع، بينرفع لحاله لما يرجع النت */}
            {saved.queued && (
              <div className="bt-sum" style={S.queuedNote}>
                {t({
                  en: "Saved on this device — no internet right now. It will upload automatically once the connection is back.",
                  ar: "انحفظ على الجهاز — ما في إنترنت هلأ. رح يترفع لحاله أول ما يرجع الاتصال.",
                })}
              </div>
            )}
            <div>
              <div className="bt-sum" style={S.doneRow}>
                <span>{t({ en: "Cutting date", ar: "تاريخ التقطيع" })}</span>
                <b>{saved.cutDate}</b>
              </div>
              <div className="bt-sum" style={S.doneRow}>
                <span>{t({ en: "Data entry date", ar: "تاريخ إدخال البيانات" })}</span>
                <b>{saved.entryStamp}</b>
              </div>
              <div className="bt-sum" style={S.doneRow}>
                <span>{t({ en: "Raw material weight", ar: "وزن المادة الخام" })}</span>
                <b>{saved.carcassKg.toFixed(2)} {KG}</b>
              </div>
              {Number.isFinite(saved.pieceCount) && (
                <div className="bt-sum" style={S.doneRow}>
                  <span>{t({ en: "Number of pieces", ar: "عدد القطع" })}</span>
                  <b>{saved.pieceCount}</b>
                </div>
              )}
              {saved.partialPiece && (
                <div className="bt-sum" style={S.doneRow}>
                  <span>{t({ en: "Number of pieces", ar: "عدد القطع" })}</span>
                  <b>{t({ en: "Not a whole piece", ar: "ليست قطعة كاملة" })}</b>
                </div>
              )}
              {saved.rawExpiry && (
                <div className="bt-sum" style={S.doneRow}>
                  <span>📅 {t({ en: "Raw expiry", ar: "انتهاء المادة الخام" })}</span>
                  <b>{saved.rawExpiry}</b>
                </div>
              )}
              {saved.durationMin > 0 && (
                <div className="bt-sum" style={S.doneRow}>
                  <span>⏱️ {t({ en: "Time taken", ar: "الوقت المستغرق" })}</span>
                  <b>{saved.durationMin} {t({ en: "min", ar: "دقيقة" })}</b>
                </div>
              )}
              <div className="bt-sum" style={S.doneRow}>
                <span>{t({ en: "Total products", ar: "مجموع النواتج" })} ({saved.count})</span>
                <b>{saved.cutsKg.toFixed(2)} {KG}</b>
              </div>
              <div className="bt-sum" style={S.doneRow}>
                <span>{t({ en: "Waste", ar: "الهدر" })}</span>
                <b>{saved.wasteKg.toFixed(2)} {KG}</b>
              </div>
              <div className="bt-sum" style={S.doneRow}>
                <span>{t({ en: "Net yield", ar: "نسبة التصافي" })}</span>
                <b style={{ color: "#1f6fd0" }}>{saved.netYieldPct.toFixed(1)}%</b>
              </div>
              <div className="bt-sum" style={S.doneRow}>
                <span>{t({ en: "Waste & bone %", ar: "نسبة الهدر والعضم" })}</span>
                <b style={{ color: "#a16207" }}>{saved.wastePct.toFixed(1)}%</b>
              </div>
            </div>
            {totals && (
              <div className="bt-chip" style={S.totals}>
                {t({ en: "Today", ar: "اليوم" })}: {totals.count}{" "}
                {t({ en: "carcasses", ar: "ذبيحة" })} — {totals.kg.toFixed(2)} {KG}
              </div>
            )}
            <button className="bt-btn" onClick={newEntry} style={S.primary}>
              {t({ en: "New entry", ar: "تسجيل جديد" })}
            </button>
          </div>
        )}

        {["kind", "origin", "category", "bom", "cuts"].includes(step) && (
          <button className="bt-back" onClick={back} style={S.back}>
            {t({ en: "Back", ar: "رجوع" })}
          </button>
        )}
      </div>

      {/* ── آخر خطوة قبل الحفظ: الوقت المستغرق بالدقائق ── */}
      {askTime && (
        <TimeAskModal
          t={t}
          dir={dir}
          value={durationMin}
          busy={saving}
          onChange={(v) => setDurationMin(cleanInt(v))}
          onCancel={() => setAskTime(false)}
          onConfirm={async () => {
            const mins = Math.floor(num(durationMin));
            if (!(mins > 0)) return;
            setAskTime(false);
            await save(mins);
          }}
        />
      )}
    </div>
  );
}

/* ══════════════ نافذة الوقت المستغرق ══════════════
   الجزار بيكتب الوقت بنفسه بالدقائق (عدد صحيح) — ما في عدّاد تلقائي، لأن
   العملية بتتقطّع وبترجع وما بيصير نقيس بالساعة من فتح الشاشة لحفظها. */

function TimeAskModal({ t, dir, value, busy, onChange, onCancel, onConfirm }) {
  const mins = Math.floor(Number(value) || 0);
  const ok = mins > 0;
  // عرض مساعد: ٩٠ دقيقة = ساعة و٣٠ دقيقة
  const human = mins >= 60
    ? `${Math.floor(mins / 60)} ${t({ en: "h", ar: "ساعة" })} ${mins % 60 ? `${mins % 60} ${t({ en: "min", ar: "دقيقة" })}` : ""}`
    : "";

  return (
    <div style={S.overlay} onClick={busy ? undefined : onCancel}>
      <div dir={dir} className="bt-pop" style={S.askBox} onClick={(e) => e.stopPropagation()}>
        <div className="bt-name" style={S.askTitle}>
          ⏱️ {t({ en: "Time taken", ar: "الوقت المستغرق" })}
        </div>
        <div className="bt-small" style={S.askSub}>
          {t({
            en: "How many minutes did this cutting operation take? Whole minutes only.",
            ar: "كم دقيقة أخدت عملية التقطيع هاي؟ بالدقائق وأرقام صحيحة فقط.",
          })}
        </div>

        <input
          className="bt-num"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter" && ok && !busy) onConfirm(); }}
          inputMode="numeric"
          autoFocus
          placeholder="0"
          style={{ ...S.input, ...S.askInput }}
        />
        <div className="bt-small" style={S.askHint}>
          {t({ en: "minutes", ar: "دقيقة" })}{human ? ` · ${human}` : ""}
        </div>

        {/* اختصارات سريعة — لمسة وحدة بدل الكتابة */}
        <div style={S.askChips}>
          {[15, 30, 45, 60, 90, 120].map((m) => (
            <button
              key={m}
              type="button"
              className="bt-small"
              onClick={() => onChange(String(m))}
              style={{ ...S.askChip, ...(mins === m ? S.askChipOn : null) }}
            >
              {m}
            </button>
          ))}
        </div>

        <div style={S.askBtns}>
          <button className="bt-btn" onClick={onCancel} disabled={busy} style={S.askCancel}>
            {t({ en: "Back", ar: "رجوع" })}
          </button>
          <button
            className="bt-btn"
            onClick={onConfirm}
            disabled={!ok || busy}
            style={{ ...S.primary, ...(ok && !busy ? null : S.disabled) }}
          >
            {busy
              ? t({ en: "Saving…", ar: "جارٍ الحفظ…" })
              : t({ en: "Save", ar: "حفظ" })}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ============================ خطة اليوم ============================ */
/* هدف الملحمة اليوم مقابل المنجز — عدّاد التنفيذات ووزن المادة الخام.
   يظهر فقط لما يكون المشرف حدّد هدفاً، وإلا لا نزحم شاشة الجزار. */
function DayPlanBar({ plan, progress, branchName, KG, t }) {
  const bars = [
    {
      key: "count",
      label: t({ en: "Carcasses", ar: "الذبائح" }),
      done: progress.branch.count,
      target: Number(plan.targetCount) || 0,
      fmt: (v) => String(Math.round(v)),
    },
    {
      key: "kg",
      label: t({ en: "Raw weight", ar: "وزن الخام" }),
      done: progress.branch.rawKg,
      target: Number(plan.targetKg) || 0,
      fmt: (v) => `${v.toFixed(0)} ${KG}`,
    },
  ].filter((b) => b.target > 0);

  if (!bars.length) return null;
  const allDone = bars.every((b) => b.done >= b.target);

  return (
    <div className="bt-rise" style={{ ...S.planBox, ...(allDone ? S.planBoxDone : null) }}>
      <div style={S.planHead}>
        <span className="bt-sum" style={{ fontWeight: 900 }}>
          🎯 {t({ en: "Today's plan", ar: "خطة اليوم" })}
          {branchName ? ` — ${branchName}` : ""}
        </span>
        {allDone && (
          <span className="bt-chip" style={S.planDoneChip}>
            ✓ {t({ en: "Target reached", ar: "تحقّق الهدف" })}
          </span>
        )}
      </div>

      {bars.map((b) => {
        const p = progressPct(b.done, b.target);
        const done = b.done >= b.target;
        return (
          <div key={b.key} style={S.planRow}>
            <span className="bt-lbl" style={S.planLbl}>{b.label}</span>
            <span style={S.planTrack}>
              <span style={{
                ...S.planFill,
                width: `${p}%`,
                background: done ? "#047857" : "#1f6fd0",
              }} />
            </span>
            <span className="bt-sum" style={{ ...S.planNums, color: done ? "#047857" : "#14507f" }}>
              {b.fmt(b.done)} / {b.fmt(b.target)}
            </span>
          </div>
        );
      })}

      {progress.mine.count > 0 && (
        <div className="bt-lbl" style={S.planMine}>
          {t({ en: "Your share today", ar: "نصيبك اليوم" })}: {progress.mine.count}{" "}
          {t({ en: "carcasses", ar: "ذبيحة" })} · {progress.mine.rawKg.toFixed(0)} {KG}
        </div>
      )}
      {plan.note && (
        <div className="bt-lbl" style={S.planNote}>📌 {plan.note}</div>
      )}
    </div>
  );
}

/* ============================ رسمة / صورة عنصر ============================ */
/* صورة مرفوعة تسبق الرسمة المدمجة. أصناف الوصفات (MRP) بلا رسمة ولا صورة،
   و artOf ترجع الـid كاحتياط — لذلك نشترط رسمة **معروفة** فعلاً، وإلا لا نرسم
   المربّع أصلاً حتى لا يبقى صندوق رمادي فارغ فوق كل منتج. */
function hasArt(item) {
  return !!imageOf(item) || ART_IDS.includes(artOf(item));
}

function ItemArt({ item }) {
  const url = imageOf(item);
  if (url) return <img src={url} alt="" style={S.artImg} />;
  const art = artOf(item);
  return ART_IDS.includes(art) ? <ButcherArt id={art} /> : null;
}

/* ============================ كرت عنصر بخانة وزن واحدة ============================ */
/* خانة وزن واحدة فقط لكل عنصر — لا خانة هدر داخل المنتج.
   pct = النسبة الفعلية للرقم المُدخل من وزن المنتج الأصلي (الأم). */
function ItemCard({
  item, value, onChange, code, pct, pctLabel, tone, target, targetLabel, isAr, t, disabled,
  selected, onSelect,
}) {
  const active = num(value) > 0;
  return (
    <div
      className="bt-press"
      onClick={disabled ? undefined : onSelect}
      style={{
        ...S.cutCard, ...(active ? S.cutCardOn : null), ...(tone || null),
        ...(selected ? S.cutCardSel : null),
        ...(disabled ? { opacity: 0.55, pointerEvents: "none" } : null),
      }}
    >
      {/* علامة «تمّ» — الجزار بيشوف بلمحة شو خلّص */}
      {active && <span style={S.doneDot}>✓</span>}
      {hasArt(item) && <span style={S.art}><ItemArt item={item} /></span>}
      <span className="bt-name" style={S.name}>
        {nameOf(item, isAr)}
      </span>
      {/* الاسم بالّلغة الأخرى — الجزار يتعرّف على الصنف بأي لغة كُتب فيها */}
      {altNameOf(item, isAr) && (
        <span className="bt-lbl" style={S.altName}>{altNameOf(item, isAr)}</span>
      )}
      {code ? <span className="bt-lbl" style={S.code}>{code}</span> : null}
      <label style={S.field}>
        <span className="bt-lbl" style={S.lbl}>{t({ en: "Weight", ar: "الوزن" })}</span>
        <input
          className="bt-cutnum"
          value={value}
          onChange={(e) => onChange(cleanDecimal(e.target.value))}
          onFocus={onSelect}
          onKeyDown={focusNextWeight}
          data-bt-w=""
          inputMode="decimal"
          placeholder="0.00"
          disabled={disabled}
          style={{ ...S.cutInput, ...(selected ? S.inputActive : null) }}
        />
      </label>
      {Number.isFinite(pct) && pct > 0 && (
        <span className="bt-lbl" style={S.pct}>
          {pct.toFixed(1)}% {pctLabel}
        </span>
      )}
      {/* الوزن المستهدف من الوصفة — كان يُحسب ويلوّن الكرت بلا ما يُعرض رقمه */}
      {Number.isFinite(target) && target > 0 && (
        <span className="bt-lbl" style={S.target}>
          🎯 {targetLabel}: {target.toFixed(2)} {t({ en: "kg", ar: "كجم" })}
          {active && ` (${num(value) >= target ? "+" : "−"}${Math.abs(num(value) - target).toFixed(2)})`}
        </span>
      )}
    </div>
  );
}

/* ════════════════════ لوحة الأرقام (كشك) ════════════════════
   بديل الكيبورد لجزار على تابلت: أزرار كبيرة، رقم واضح، ومسح بلمسة.
   ما بتحمل أي منطق — بترجّع الضغطة للصفحة اللي بتكتبها بنفس دوال الإدخال. */

function NumPad({ t, title, value, onKey, onNext, onClose, KG }) {
  const keys = ["7", "8", "9", "4", "5", "6", "1", "2", "3", ".", "0", "back"];
  return (
    <div style={S.pad}>
      <div style={S.padHead}>
        <span className="bt-name" style={{ fontWeight: 900, minWidth: 0 }}>{title}</span>
        <span className="bt-num" style={S.padValue}>
          {value || "0"} <span style={{ fontSize: ".5em", color: "#8aa3b8" }}>{KG}</span>
        </span>
        <button type="button" className="bt-small" style={S.padX} onClick={onClose}>
          ✕ {t({ en: "Close", ar: "إغلاق" })}
        </button>
      </div>

      <div style={S.padGrid}>
        {keys.map((k) => (
          <button
            key={k}
            type="button"
            className="bt-press"
            onClick={() => onKey(k)}
            style={{ ...S.padKey, ...(k === "back" ? S.padKeyAlt : null) }}
          >
            {k === "back" ? "⌫" : k}
          </button>
        ))}
      </div>

      <div style={S.padBtns}>
        <button type="button" className="bt-press" style={S.padClear} onClick={() => onKey("clear")}>
          ↺ {t({ en: "Clear", ar: "تفريغ" })}
        </button>
        <button type="button" className="bt-press" style={S.padNext} onClick={onNext}>
          {t({ en: "Next", ar: "التالي" })} ➜
        </button>
      </div>
    </div>
  );
}

/* ============================ شريط الخطوات ============================ */

/* ==================== شاشة تصفية (نوع · منشأ · فئة) ====================
   نفس كروت الفئة القديمة بالضبط — بس معمَّمة على الأبعاد الثلاثة، مع كرت
   «بلا …» لما يكون في وصفات ما عليها تعريف بهالبُعد. */
function FacetStep({ dim, pick, onPick, title, t, isAr }) {
  const spec = BOM_FACETS[dim];
  const label = t({ en: "recipes", ar: "وصفة" });

  return (
    <>
      <div className="bt-q" style={S.q}>{spec.icon} {title}</div>
      <div style={S.grid}>
        {pick.opts.map((o) => (
          <button key={o.id} className="bt-press" onClick={() => onPick(o.id)} style={S.tile}>
            <span className="bt-name" style={S.name}>{nameOf(o, isAr) || o.id}</span>
            <span className="bt-lbl" style={{ color: "#6b8299", fontWeight: 800 }}>
              {o.count} {label}
            </span>
          </button>
        ))}
        {pick.none > 0 && (
          <button className="bt-press" onClick={() => onPick(UNCAT)} style={S.tile}>
            <span className="bt-name" style={S.name}>{t({ en: spec.enNone, ar: spec.arNone })}</span>
            <span className="bt-lbl" style={{ color: "#6b8299", fontWeight: 800 }}>
              {pick.none} {label}
            </span>
          </button>
        )}
      </div>
    </>
  );
}

function StepBar({ step, hasKind, hasOrigin, hasCat, t }) {
  const steps = [
    ...(hasKind ? [{ id: "kind", ar: "النوع", en: "Type" }] : []),
    ...(hasOrigin ? [{ id: "origin", ar: "المنشأ", en: "Origin" }] : []),
    ...(hasCat ? [{ id: "category", ar: "الفئة", en: "Category" }] : []),
    { id: "bom", ar: "الوصفة", en: "Recipe" },
    { id: "cuts", ar: "الأوزان", en: "Weights" },
  ];
  const at = steps.findIndex((x) => x.id === step);

  return (
    <div style={S.steps}>
      {steps.map((x, i) => {
        const done = at > i;
        const now = at === i;
        return (
          <React.Fragment key={x.id}>
            <div style={S.stepItem}>
              <span style={{
                ...S.stepDot,
                ...(done ? S.stepDotDone : null),
                ...(now ? S.stepDotNow : null),
              }}>
                {done ? "✓" : i + 1}
              </span>
              <span className="bt-lbl bt-step-lbl" style={{
                ...S.stepLbl,
                ...(now ? { color: "#1f6fd0", fontWeight: 900 } : null),
              }}>
                {t(x)}
              </span>
            </div>
            {i < steps.length - 1 && (
              <span style={{ ...S.stepLine, ...(done ? S.stepLineDone : null) }} />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}

/* ============================ حلقة التقدّم ============================ */

function ProgressRing({ used, total, over, t }) {
  const r = 34;
  const c = 2 * Math.PI * r;
  const ratio = total > 0 ? Math.min(used / total, 1) : 0;
  const color = over ? "#dc2626" : ratio > 0.9 ? "#d97706" : "#1f6fd0";

  return (
    <span style={S.ringWrap}>
      <svg width="92" height="92" viewBox="0 0 92 92">
        <circle cx="46" cy="46" r={r} fill="none" stroke="#e6eef7" strokeWidth="11" />
        <circle
          cx="46" cy="46" r={r} fill="none" stroke={color} strokeWidth="11"
          strokeLinecap="round" strokeDasharray={`${c * ratio} ${c}`}
          transform="rotate(-90 46 46)"
          style={{ transition: "stroke-dasharray .3s ease, stroke .2s ease" }}
        />
        <text x="46" y="52" textAnchor="middle" fontSize="20" fontWeight="900" fill={color}>
          {Math.round(ratio * 100)}%
        </text>
      </svg>
      <span className="bt-lbl" style={{ color: "#6b8299", fontWeight: 800 }}>
        {t({ en: "of raw", ar: "من الخام" })}
      </span>
    </span>
  );
}

/** لون خلفية كرت المنتج حسب قربه من الوزن المستهدف من الوصفة (±10%). */
function targetTone(targetKg, actualKg) {
  if (!(targetKg > 0) || !(actualKg > 0)) return null;
  const diff = (actualKg - targetKg) / targetKg;
  if (diff < -0.1) return { background: "#fffbeb", borderColor: "#fcd34d" };   // أقل من الهدف
  if (diff > 0.1) return { background: "#fef2f2", borderColor: "#fca5a5" };    // أكثر من الهدف
  return { background: "#f0fdf4", borderColor: "#86efac" };                     // ضمن المدى
}

/* ============================ الأنماط ============================ */
/* الأحجام النصّية في CSS أعلاه — هنا التخطيط والألوان فقط. */

const FONT = "Cairo, system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif";

const S = {
  page: {
    minHeight: "100vh", background: "#eef4fb", fontFamily: FONT, color: "#0f2740",
    padding: "18px 14px 40px", overflowX: "hidden",
  },
  wrap: { maxWidth: "min(1100px, 100%)", margin: "0 auto" },
  wrapWide: { maxWidth: "100%" },   // شبكة القطع تملأ الصفحة
  header: { display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 10, marginBottom: 14 },
  headerRight: { display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" },
  title: { fontWeight: 900 },
  langBtn: { background: "#fff", border: "1px solid #cfe0f0", color: "#1f6fd0", fontSize: 18 },
  emp: { display: "flex", alignItems: "center", gap: 8, fontWeight: 800 },
  chg: {
    border: "1px solid #cfe0f0", background: "#fff", color: "#1f6fd0",
    borderRadius: 10, padding: "7px 14px", fontFamily: FONT, fontWeight: 700, cursor: "pointer",
  },
  /* ── مؤشّر الاتصال وصندوق الصادر ── */
  syncChip: {
    borderRadius: 999, padding: "7px 16px", fontFamily: FONT, fontWeight: 800,
    cursor: "pointer", whiteSpace: "nowrap",
  },
  syncOffline: { border: "1px solid #f0c9c9", background: "#fff5f5", color: "#a12626" },
  syncPending: { border: "1px solid #fcd9a4", background: "#fff7ed", color: "#b45309" },
  queuedNote: {
    background: "#fff7ed", border: "1px solid #fcd9a4", color: "#8a5a12",
    borderRadius: 14, padding: "12px 14px", fontWeight: 800, lineHeight: 1.6,
    textAlign: "center",
  },
  /* رقم العملية المميّز بشاشة التأكيد */
  opNoBox: {
    display: "flex", flexDirection: "column", alignItems: "center", gap: 4,
    background: "#eef2ff", border: "1px solid #c7d2fe", color: "#3730a3",
    borderRadius: 14, padding: "12px 14px", textAlign: "center",
  },
  /* ── خطة اليوم ── */
  planBox: {
    background: "#fff", border: "2px solid #cfe0f0", borderRadius: 18,
    padding: "14px 16px", marginBottom: 12, display: "flex",
    flexDirection: "column", gap: 10,
  },
  planBoxDone: { borderColor: "#86efac", background: "#f6fffa" },
  planHead: {
    display: "flex", alignItems: "center", justifyContent: "space-between",
    gap: 10, flexWrap: "wrap",
  },
  planDoneChip: {
    background: "#dcfce7", color: "#166534", borderRadius: 999,
    padding: "4px 14px", fontWeight: 900,
  },
  planRow: { display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" },
  planLbl: { color: "#6b8299", fontWeight: 800, minWidth: 92 },
  planTrack: {
    flex: 1, minWidth: 140, height: 14, borderRadius: 999,
    background: "#e6eef7", overflow: "hidden", display: "block",
  },
  planFill: { display: "block", height: "100%", borderRadius: 999, transition: "width .4s ease" },
  planNums: { fontWeight: 900, whiteSpace: "nowrap", minWidth: 110, textAlign: "end" },
  planMine: { color: "#6b8299", fontWeight: 800 },
  planWarn: {
    background: "#fff7ed", border: "1px solid #fcd9a4", color: "#8a5a12",
    borderRadius: 14, padding: "12px 14px", fontWeight: 800, lineHeight: 1.7,
    marginBottom: 12, display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap",
  },
  planNote: {
    color: "#8a5a12", fontWeight: 800, background: "#fff7ed",
    border: "1px solid #fcd9a4", borderRadius: 12, padding: "8px 12px",
  },
  totals: {
    background: "#fff", border: "1px solid #dbe6f2", borderRadius: 12,
    padding: "10px 12px", fontWeight: 800, color: "#3c5a75", textAlign: "center", marginBottom: 12,
  },
  crumbs: { display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 14 },
  crumb: { background: "#dceaf8", color: "#14507f", borderRadius: 999, padding: "8px 18px", fontWeight: 800 },
  q: { fontWeight: 900, margin: "8px 0 10px", textAlign: "center" },

  // كروت كبيرة — الرسمة تملأ عرض الكرت
  grid: { display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(min(240px,100%),1fr))", gap: 18 },
  art: {
    width: "100%", maxWidth: "min(260px, 62vw)", aspectRatio: "1 / 1", margin: "0 auto",
    display: "block", borderRadius: 20, background: "#f5f9fd", padding: 6, boxSizing: "border-box",
  },
  tile: {
    background: "#fff", border: "3px solid #dbe6f2", borderRadius: 26,
    padding: "16px 14px 22px", display: "flex", flexDirection: "column",
    alignItems: "center", gap: 12, cursor: "pointer", fontFamily: FONT, color: "#0f2740",
  },
  cutCard: {
    position: "relative",
    background: "#fff", border: "3px solid #dbe6f2", borderRadius: 26,
    padding: "14px 16px 18px", display: "flex", flexDirection: "column",
    alignItems: "center", gap: 8, fontFamily: FONT, color: "#0f2740",
  },
  cutCardOn: { border: "3px solid #1f6fd0", background: "#f7fbff" },
  target: { fontWeight: 800, color: "#0f766e" },
  rawCard: {
    background: "#fff", border: "2px solid #cfe0f0", borderRadius: 18,
    padding: "14px 16px", marginBottom: 16, display: "flex",
    flexDirection: "column", gap: 10,
  },
  rawHead: {
    display: "flex", flexDirection: "column", gap: 2, alignItems: "center", textAlign: "center",
  },
  rawField: {
    display: "flex", flexDirection: "column", gap: 6, alignItems: "center",
    maxWidth: 360, width: "100%", margin: "0 auto",
  },
  dateRow: {
    display: "flex", gap: 14, flexWrap: "wrap", justifyContent: "center",
    borderTop: "1px solid #e6eef7", paddingTop: 12, marginTop: 2,
  },
  dateField: { display: "flex", flexDirection: "column", gap: 6, alignItems: "center" },
  stamp: {
    background: "#f1f6fb", border: "1px solid #dbe6f2", borderRadius: 12,
    padding: "12px 16px", fontWeight: 800, color: "#3c5a75", whiteSpace: "nowrap",
  },
  /* صورة مرفوعة بدل الرسمة المدمجة */
  artImg: {
    width: "100%", height: "100%", objectFit: "cover",
    borderRadius: 16, display: "block",
  },
  /* الهدر والعظم — صفّ منفصل بلون مختلف عن شبكة المنتجات */
  wasteRow: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit,minmax(min(240px,100%),1fr))",
    gap: 18,
    marginBottom: 4,
  },
  wasteTone: { background: "#fffdf5", borderColor: "#e8d9a8" },
  emptyBox: {
    gridColumn: "1 / -1", background: "#fff", border: "2px dashed #cfe0f0",
    borderRadius: 20, padding: "26px 18px", textAlign: "center",
    fontWeight: 800, color: "#6b8299",
  },
  name: { fontWeight: 900 },
  // الاسم بالّلغة الأخرى — أصغر وأهدأ، تحت الاسم الأساسي مباشرة
  altName: { color: "#6b8299", fontWeight: 700, textAlign: "center", lineHeight: 1.4 },
  field: { width: "100%", display: "flex", flexDirection: "column", gap: 4, marginTop: 4 },
  lbl: { fontWeight: 800, color: "#6b8299" },
  cutInput: {
    width: "100%", boxSizing: "border-box", border: "2px solid #cfe0f0", borderRadius: 12,
    padding: "12px 10px", fontWeight: 800, textAlign: "center", fontFamily: FONT,
    color: "#0f2740", outline: "none",
  },

  sumBar: {
    marginTop: 16, background: "#fff", border: "1px solid #dbe6f2", borderRadius: 14,
    padding: "14px", display: "flex", flexWrap: "wrap", gap: 16,
    justifyContent: "space-around", fontWeight: 700, color: "#3c5a75",
  },
  sumBarOver: { border: "2px solid #e88", background: "#fff7f7" },
  overText: { color: "#a12626", fontWeight: 900 },
  pctBar: {
    marginTop: 10, background: "#f7fbff", border: "1px solid #dbe6f2", borderRadius: 14,
    padding: "12px 14px", display: "flex", flexWrap: "wrap", gap: 16,
    justifyContent: "space-around", fontWeight: 800, color: "#14507f",
  },
  pct: { fontWeight: 800, color: "#1f6fd0" },
  code: {
    fontWeight: 800, color: "#6b8299", background: "#eef4fb",
    border: "1px solid #dbe6f2", borderRadius: 999, padding: "2px 12px",
  },


  card: {
    background: "#fff", border: "1px solid #dbe6f2", borderRadius: 22,
    padding: 24, display: "flex", flexDirection: "column", gap: 14,
  },
  input: {
    width: "100%", boxSizing: "border-box", border: "2px solid #cfe0f0", borderRadius: 16,
    padding: "18px 14px", fontWeight: 900, textAlign: "center", fontFamily: FONT,
    color: "#0f2740", outline: "none",
  },
  select: {
    width: "100%", boxSizing: "border-box", border: "2px solid #cfe0f0", borderRadius: 16,
    padding: "16px 14px", fontWeight: 800, textAlign: "center", fontFamily: FONT,
    color: "#0f2740", outline: "none", background: "#fff",
  },
  primary: {
    border: "none", background: "#1f6fd0", color: "#fff", borderRadius: 16,
    padding: "18px 14px", fontWeight: 900, fontFamily: FONT, cursor: "pointer", width: "100%",
  },
  /* رصيف الحفظ الملتصق بأسفل الشاشة — زر الحفظ دائماً بمتناول اليد */
  saveDock: {
    position: "sticky", bottom: 0, zIndex: 6, marginTop: 14, padding: "10px 0 8px",
    background: "linear-gradient(180deg, rgba(238,244,251,0) 0%, #eef4fb 34%, #eef4fb 100%)",
    display: "flex", flexDirection: "column", gap: 8,
  },
  dockLine: {
    display: "flex", flexWrap: "wrap", gap: 16, justifyContent: "center",
    fontWeight: 800, color: "#3c5a75",
  },
  inputBad: { borderColor: "#e88", background: "#fff7f7" },
  /* شريط التقدّم أعلى خطوة الأوزان */
  progWrap: {
    background: "#fff", border: "2px solid #dbe6f2", borderRadius: 18,
    padding: "12px 14px", marginBottom: 12, display: "flex", flexDirection: "column", gap: 8,
  },
  progTop: { display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", justifyContent: "space-between" },
  progBar: {
    display: "flex", height: 16, borderRadius: 999, overflow: "hidden",
    background: "#eef4fb", border: "1px solid #dbe6f2",
  },
  progFill: { display: "block", height: "100%" },
  progLegend: {
    display: "flex", gap: 16, flexWrap: "wrap", color: "#6b8299", fontWeight: 800,
  },
  /* عنوان قسم مع عدّاد الإنجاز */
  sectionBar: {
    display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap",
    margin: "16px 2px 8px",
  },
  countChip: {
    marginInlineStart: "auto", background: "#f4f9ff", border: "1px solid #cfe0f0",
    color: "#14507f", borderRadius: 999, padding: "5px 14px", fontWeight: 900,
  },
  /* الخانة النشطة — مربوطة بلوحة الأرقام */
  inputActive: {
    borderColor: "#1f6fd0", background: "#f4f9ff",
    boxShadow: "0 0 0 4px rgba(31,111,208,.14)",
  },
  cutCardSel: {
    borderColor: "#1f6fd0",
    boxShadow: "0 0 0 4px rgba(31,111,208,.14), 0 10px 24px rgba(15,39,64,.10)",
  },
  doneDot: {
    position: "absolute", insetInlineEnd: 10, insetBlockStart: 10,
    width: 26, height: 26, borderRadius: "50%", background: "#047857", color: "#fff",
    display: "grid", placeItems: "center", fontWeight: 900, fontSize: 15,
  },
  /* لوحة الأرقام */
  pad: {
    position: "sticky", bottom: 92, zIndex: 30,
    background: "#fff", border: "2px solid #cfe0f0", borderRadius: 20,
    padding: 12, marginTop: 14, display: "flex", flexDirection: "column", gap: 10,
    boxShadow: "0 -10px 34px rgba(15,39,64,.14)",
  },
  padHead: {
    display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap",
    borderBottom: "1px dashed #dbe6f2", paddingBottom: 8,
  },
  padValue: {
    marginInlineStart: "auto", fontWeight: 900, color: "#0f2740",
    background: "#f4f9ff", border: "1px solid #cfe0f0", borderRadius: 12,
    padding: "4px 16px", minWidth: 120, textAlign: "center",
  },
  padX: {
    border: "1px solid #cfe0f0", background: "#fff", color: "#3c5a75",
    borderRadius: 12, padding: "8px 14px", fontFamily: FONT, fontWeight: 800, cursor: "pointer",
  },
  padGrid: { display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 8 },
  padKey: {
    border: "2px solid #dbe6f2", background: "#f9fcff", color: "#0f2740",
    borderRadius: 16, padding: "16px 0", fontFamily: FONT, fontWeight: 900,
    fontSize: 26, cursor: "pointer",
  },
  padKeyAlt: { background: "#fff7ed", borderColor: "#fcd9a4", color: "#8a5a12" },
  padBtns: { display: "grid", gridTemplateColumns: "1fr 2fr", gap: 8 },
  padClear: {
    border: "2px solid #dbe6f2", background: "#fff", color: "#3c5a75", borderRadius: 16,
    padding: "14px 0", fontFamily: FONT, fontWeight: 900, cursor: "pointer",
  },
  padNext: {
    border: "none", background: "#1f6fd0", color: "#fff", borderRadius: 16,
    padding: "14px 0", fontFamily: FONT, fontWeight: 900, cursor: "pointer",
  },
  inputOff: { background: "#eef4fb", color: "#8aa3b8", borderColor: "#dbe6f2", cursor: "not-allowed" },
  hintSm: { color: "#8aa3b8", fontWeight: 700 },
  /* نافذة الوقت المستغرق */
  overlay: {
    position: "fixed", inset: 0, background: "rgba(15,39,64,.5)",
    display: "grid", placeItems: "center", padding: 16, zIndex: 90,
  },
  askBox: {
    background: "#fff", borderRadius: 22, width: "min(420px,100%)", padding: 22,
    fontFamily: FONT, color: "#0f2740", textAlign: "center",
    boxShadow: "0 24px 60px rgba(15,39,64,.32)",
    display: "flex", flexDirection: "column", gap: 10,
  },
  askTitle: { fontWeight: 900 },
  askSub: { color: "#6b8299", fontWeight: 700, lineHeight: 1.6 },
  askInput: { textAlign: "center", fontWeight: 900, letterSpacing: 1 },
  askHint: { color: "#8aa3b8", fontWeight: 800 },
  askChips: { display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "center" },
  askChip: {
    border: "2px solid #cfe0f0", background: "#fff", color: "#14507f",
    borderRadius: 999, padding: "8px 16px", fontWeight: 900, fontFamily: FONT, cursor: "pointer",
  },
  askChipOn: { background: "#1f6fd0", color: "#fff", borderColor: "#1f6fd0" },
  askBtns: { display: "flex", gap: 10, marginTop: 4 },
  askCancel: {
    flex: "0 0 auto", border: "1px solid #cfe0f0", background: "#fff", color: "#3c5a75",
    borderRadius: 16, padding: "18px 18px", fontWeight: 900, fontFamily: FONT, cursor: "pointer",
  },
  /* «ليست قطعة كاملة» — تجاوز إلزامية عدد القطع */
  partialBtn: {
    display: "flex", alignItems: "flex-start", gap: 10, width: "100%",
    border: "2px solid #cfe0f0", background: "#fff", color: "#3c5a75",
    borderRadius: 14, padding: "11px 13px", fontFamily: FONT, fontWeight: 800,
    cursor: "pointer", textAlign: "start",
  },
  partialBtnOn: { borderColor: "#b45309", background: "#fffaf1", color: "#8a5a12" },
  partialBox: {
    width: 26, height: 26, borderRadius: 9, flexShrink: 0,
    border: "2px solid #cfe0f0", background: "#fff", color: "#fff",
    display: "grid", placeItems: "center", fontWeight: 900,
  },
  partialBoxOn: { borderColor: "#b45309", background: "#b45309" },
  partialHint: { display: "block", fontWeight: 700, color: "#8aa3b8", marginTop: 3 },
  disabled: { background: "#a9c3dd", cursor: "not-allowed" },
  back: {
    marginTop: 16, width: "100%", border: "1px solid #cfe0f0", background: "#fff",
    color: "#3c5a75", borderRadius: 14, padding: "14px", fontWeight: 800,
    fontFamily: FONT, cursor: "pointer",
  },
  warn: {
    background: "#fff7ed", border: "2px solid #fdba74", color: "#9a3412",
    borderRadius: 12, padding: "12px 14px", fontWeight: 800, textAlign: "center",
  },
  error: {
    marginTop: 12, background: "#fdecec", border: "2px solid #f5c2c2", color: "#a12626",
    borderRadius: 12, padding: "12px 14px", fontWeight: 800, textAlign: "center",
  },
  person: {
    display: "flex", alignItems: "center", gap: 14,
    background: "linear-gradient(135deg,#f0f7ff,#eafaf1)",
    border: "2px solid #bfe3cf", borderRadius: 18, padding: "14px 16px",
  },
  personAvatar: {
    width: 58, height: 58, borderRadius: "50%", background: "#fff",
    border: "2px solid #dbe6f2", display: "grid", placeItems: "center",
    fontSize: 30, flex: "0 0 auto", lineHeight: 1,
  },
  personBody: { display: "flex", flexDirection: "column", gap: 2, minWidth: 0 },
  personName: { fontWeight: 900, color: "#14532d" },
  personJob: { fontWeight: 800, color: "#1f6fd0" },
  personBranch: { fontWeight: 700, color: "#6b8299" },
  personHint: { color: "#8aa3b8", fontWeight: 700, textAlign: "center" },

  steps: {
    display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap",
    background: "#fff", border: "1px solid #dbe6f2", borderRadius: 16,
    padding: "12px 14px", marginBottom: 12,
  },
  stepItem: { display: "flex", alignItems: "center", gap: 8 },
  stepDot: {
    width: 34, height: 34, borderRadius: "50%", display: "grid", placeItems: "center",
    background: "#eef4fb", color: "#8aa3b8", fontWeight: 900, flex: "0 0 auto",
  },
  stepDotDone: { background: "#dcfce7", color: "#166534" },
  stepDotNow: { background: "#1f6fd0", color: "#fff" },
  stepLbl: { color: "#8aa3b8", fontWeight: 800 },
  stepLine: { flex: 1, minWidth: 14, height: 3, background: "#e6eef7", borderRadius: 2 },
  stepLineDone: { background: "#86efac" },

  ringWrap: { display: "flex", flexDirection: "column", alignItems: "center", gap: 2 },

  doneRow: {
    display: "flex", justifyContent: "space-between", fontWeight: 700,
    padding: "10px 0", borderTop: "1px solid #f0f5fa",
  },
};
