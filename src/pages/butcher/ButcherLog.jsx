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
/** مفتاح خانة «عدد القطع» — لتلوين السطر اللي واقف عنده الجزار. */
const PIECE_KEY = "__pieces__";
/** تفضيل شكل شاشة الأوزان: auto | on | off — كاش جهاز فقط. */
const COMPACT_KEY = "butcher_compact_view";    // cache only — not a store
/** مسوّدة التسجيل الجاري — كاش جهاز فقط، والسيرفر بيضل مصدر الحقيقة.
    الجوال بيقفل الشاشة أو المتصفّح بيفرّغ التبويب وقت مكالمة، وبلاها كان
    الجزار يرجع يلاقي عشر أوزان راحت. بتنمسح لحظة ما ينحفظ السجل. */
const DRAFT_KEY = "butcher_draft";             // cache only — not a store
/** عمر المسوّدة — أطول من هيك يعني شغل يوم تاني، فما منعرضها. */
const DRAFT_TTL_MS = 12 * 60 * 60 * 1000;
/** تحت هالعرض الشاشة موبايل → الوضع المضغوط بينفتح لحاله. */
const NARROW_PX = 820;
/** تحت هالعرض ما في محل لزرّ لغة بكلمة — بيصير أيقونة. */
const TIGHT_PX = 520;

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
/* ═══ الوضع المضغوط (شاشة الأوزان على الموبايل) ═══
   كروت صغيرة بثلاثة أعمدة حتى تدخل كل المنتجات بشاشة وحدة. هالقواعد
   **بعد** الـmedia queries عن قصد: نفس التخصيص بالضبط (#root + كلاس)، فاللي
   بيجي أخيراً بيربح ولا بتدهسها قاعدة #root .bt * تبع الموبايل. */
/* ليستة المنتجات المضغوطة: سطر تحت سطر على الجوال، وعمودين على شاشة أوسع
   (تابلت بدّل يدوياً) — نفس السطر بيتمدّد بدل ما يضل نصّ الشاشة فاضي. */
#root .bt-gridsm { display: grid; gap: 6px; grid-template-columns: 1fr; }
@media (min-width: 821px) {
  #root .bt-gridsm { gap: 10px; grid-template-columns: 1fr 1fr; }
}
/* صورة المادة الخام كخلفية خفيفة للشاشة — الجزار بيعرف من أول نظرة شو
   عم يقطّع حتى وهو نازل بالليستة. طبقة ثابتة تحت المحتوى، بلا لمس. */
/* الخلفية بشدّتها الكاملة ٩٠٪ — بلا غسلة ولا تخفيف تشبّع، الصورة بتبيّن
   غامقة وواضحة متل ما هي. اللي بيحمي القراءة هو هالة الكتابة تحت (أقوى
   طبقات) — وإذا صورة معيّنة طلعت غامقة كتير، بدّلها من صفحة التعريفات. */
#root .bt-wm::before {
  content: ""; position: fixed; inset: 0; z-index: 0; pointer-events: none;
  background-image: var(--bt-wm); background-repeat: no-repeat;
  background-position: center 42%; background-size: min(88vw, 460px);
  opacity: .90;
}
#root .bt-wm > div { position: relative; z-index: 1; }
#root .bt-cname { font-size: 16px !important; line-height: 1.25 !important; }
#root .bt-wm .bt-cname, #root .bt-wm .bt-cbar, #root .bt-wm .bt-lbl,
#root .bt-wm .bt-name, #root .bt-wm .bt-q, #root .bt-wm .bt-chip,
#root .bt-wm .bt-sum, #root .bt-wm .bt-title, #root .bt-wm .bt-emp {
  text-shadow: 0 1px 2px #fff, 0 -1px 2px #fff, 1px 0 2px #fff, -1px 0 2px #fff,
               0 0 9px rgba(255,255,255,.98), 0 0 16px rgba(255,255,255,.9),
               0 0 24px rgba(255,255,255,.7);
}
#root .bt-cnum  { font-size: 21px !important; }
#root .bt-cbar  { font-size: 15px !important; }
#root .bt-tick  { font-size: 13px !important; }
#root .bt-tail  { font-size: 13px !important; }
/* رصيف الحفظ اللاصق: globals.css حاطط overflow-x:hidden على html/body/#root،
   و«hidden» بيحوّل المحور الثاني لـ auto فبيصير الصندوق حاوية تمرير — وهذا
   بيعطّل position:sticky لكل ما بداخله. منرجّعه visible لهالصفحة وحدها.
   ملاحظة: «clip» هون كان غلط — على html بينتقل للـviewport وبيقفل التمرير
   العمودي كلياً بـChromium، وصفحة ما بتمرق يعني خانة تحت الكيبورد ما في
   شي بيطلّعها. القصّ الأفقي محلّه .bt نفسه (عنصر عادي، القصّ فيه سليم). */
html:has(.bt), body:has(.bt), #root:has(.bt) { overflow-x: visible; }

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

/** رجّة قصيرة — إشارة لمس بدل رسالة، الجزار ماسك السكين وما بيقرأ. */
function buzz(ms) {
  try { navigator.vibrate?.(ms); } catch { /* ignore */ }
}

/* ═══ الذيل المشترك بأسماء الأصناف ═══
   وصفة وحدة بتطلع أسماؤها هيك: «LEG-BONE IN (LAMB AUSTRALIA)» و«RACK SADDLE
   (LAMB AUSTRALIA)»… نفس القوس مكرّر على كل سطر: بياخد نص عرض الجوال وبيقصّ
   الجزء اللي بيفرّق بين الأصناف. منشيله من السطور ومنعرضه مرّة وحدة بعنوان
   القسم — بس إذا كان فعلاً مشترك (سطرين على الأقل وأغلبية الليستة). */
function commonTail(names) {
  const count = new Map();
  names.forEach((n) => {
    const m = /\s*\([^()]*\)\s*$/.exec(String(n || ""));
    if (!m) return;
    const tail = m[0].trim();
    if (tail.length < 4) return;            // «(1)» مش ذيل وصفي
    count.set(tail, (count.get(tail) || 0) + 1);
  });
  let best = "";
  let hits = 0;
  count.forEach((c, k) => { if (c > hits) { hits = c; best = k; } });
  return hits >= 2 && hits >= names.length * 0.6 ? best : "";
}

/** شيل الذيل المشترك من اسم واحد — بيرجع كما هو إذا ما كان إله. */
function stripTail(name, tail) {
  const s = String(name || "");
  if (!tail || !s.endsWith(tail)) return s;
  return s.slice(0, -tail.length).trim() || s;
}

/** لاحقة وحدة القياس بآخر الاسم («– كجم» / «- KG») — ما بتميّز صنف عن صنف. */
const UNIT_TAIL =
  /\s*[-–—]\s*(kgs?|gms?|grams?|pcs?|pieces?|كجم|كغم|كغ|كيلو|غرام|جم|قطعة|قطع)\s*$/i;

/* ═══ أسماء العرض بسطور الوضع المضغوط ═══
   منشيل شغلتين بيتكرّروا على كل سطر وبياكلوا عرض الجوال: الذيل المشترك
   («(LAMB AUSTRALIA)») ولاحقة الوحدة («– كجم»). وإذا الشيل خلّى اسمين
   ينقرأوا نفس الشي، منرجع للأسماء الكاملة كلها — اسم ملتبس بالملحمة يعني
   وزن براس صنف غلط، وهاي ما بترجع. */
function shortenNames(names) {
  const tail = commonTail(names);
  const out = names.map((n) => stripTail(n, tail).replace(UNIT_TAIL, "").trim() || n);
  const keys = out.map((x) => x.toLowerCase());
  if (new Set(keys).size !== keys.length) return { tail: "", names };
  return { tail, names: out };
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

  /* 📱 الوضع المضغوط — شاشة الأوزان بس. كروت صغيرة بثلاثة أعمدة، كرت المادة
     الخام بينطوي بسطر، ولوحة الأرقام بتصير شريط واطي — الهدف إن الجزار يشوف
     كل منتجات الوصفة بشاشة الموبايل بلا ما ينزل. الكشك/التابلت بيضل بالكروت
     الكبيرة (الصورة كبيرة = الجزار اللي ما بيقرا بيتعرّف على الصنف). */
  const [compactPref, setCompactPref] = useState(() => {
    try { return localStorage.getItem(COMPACT_KEY) || "auto"; } catch { return "auto"; }
  });
  const [narrow, setNarrow] = useState(
    () => typeof window !== "undefined" && window.innerWidth <= NARROW_PX
  );
  /* شاشة ضيّقة جداً — زرّ اللغة بيصير أيقونة بدل كلمة. كان مخفيّاً كلياً،
     يعني الجزار على الجوال ما بيقدر يبدّل اللغة أبداً وهو أكتر واحد محتاجها. */
  const [tight, setTight] = useState(
    () => typeof window !== "undefined" && window.innerWidth <= TIGHT_PX
  );
  useEffect(() => {
    const onResize = () => {
      setNarrow(window.innerWidth <= NARROW_PX);
      setTight(window.innerWidth <= TIGHT_PX);
    };
    window.addEventListener("resize", onResize);
    /* تدوير الجهاز ما بيطلّع resize بكل المتصفّحات — الجوال بيدور بالجيب */
    window.addEventListener("orientationchange", onResize);
    return () => {
      window.removeEventListener("resize", onResize);
      window.removeEventListener("orientationchange", onResize);
    };
  }, []);
  const compact = compactPref === "on" ? true : compactPref === "off" ? false : narrow;
  const setCompact = (on) => {
    setCompactPref(on ? "on" : "off");
    try { localStorage.setItem(COMPACT_KEY, on ? "on" : "off"); } catch { /* ignore */ }
  };
  // كرت المادة الخام: مفتوح بالبداية، وبينطوي لسطر واحد بالوضع المضغوط
  const [rawOpen, setRawOpen] = useState(true);
  /* ارتفاع كيبورد الجهاز — 0 يعني مسكّر. أقل من ١٢٠ بكسل بيكون شريط
     متصفّح لا كيبورد، فما منحسبه حتى ما نزقّ الصفحة بلا سبب. */
  const [kbH, setKbH] = useState(0);
  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return undefined;
    const read = () => {
      const gap = Math.max(0, window.innerHeight - vv.height - vv.offsetTop);
      setKbH(gap > 120 ? Math.round(gap) : 0);
    };
    vv.addEventListener("resize", read);
    vv.addEventListener("scroll", read);
    read();
    return () => {
      vv.removeEventListener("resize", read);
      vv.removeEventListener("scroll", read);
    };
  }, []);

  /* بعد ما يفتح الكيبورد: إذا الخانة صارت تحته منزقّ الصفحة لحتى ترجع
     فوقه بهامش مريح. مؤجّلة ٣٢٠ms لأن الكيبورد بياخد وقت يطلع، وقبل ما
     يخلص ما بتكون قياساته صحيحة. */
  const keepAboveKeyboard = useCallback((el) => {
    if (!el) return;
    const settle = () => {
      const vv = window.visualViewport;
      const limit = (vv ? vv.height : window.innerHeight) - 14;
      const box = el.getBoundingClientRect();
      const under = box.bottom - limit;
      if (under > 0) window.scrollBy({ top: under + 12, behavior: "smooth" });
    };
    /* الوسط: بيشتغل بأي متصفّح ومع أي حاوية تمرير، وبيوقّع الخانة بنص
       الشاشة — يعني فوق الكيبورد بالأغلب. بعدها منعاير لو ضلّ ناقص. */
    try {
      el.scrollIntoView({ block: "center", behavior: "smooth" });
    } catch { el.scrollIntoView(); }
    /* مرّتين: وحدة بعد ما يستقرّ التمرير، وتانية بعد ما يخلص الكيبورد
       يطلع (بياخد وقته، وقبلها قياساته كذّابة). */
    window.setTimeout(settle, 360);
    window.setTimeout(settle, 700);
  }, []);

  /* الخانة اللي إيد الجزار واقفة عليها هلأ — بتتلوّن لحتى يخلّص منها.
     مربوطة بالـfocus الحقيقي لا بـactiveId: activeId بيضل معلّق بعد ما
     يترك الخانة (لوحة الأرقام بتعتمد عليه)، وهاي لازم تطفى لحظة ما يطلع. */
  const [focusId, setFocusId] = useState("");
  /* التنبيهات الثابتة (خام ناقص / عدد قطع / هدر / تطابق تام) كانت تطلع من
     أول ما تفتح الشاشة — يعني الجزار يشوف «أخطاء» قبل ما يبلّش. صارت
     مخفيّة، وما بتبيّن إلا لما يضغط «حفظ» وفي شي فعلاً ناقص. */
  const [showIssues, setShowIssues] = useState(false);
  /* رقم فوق الوزن المتاح: ما بينكتب ولا رقم — الخانة بتحمرّ ثانية وبترجع.
     n طابع وقت حتى تتكرّر الرسمة لو انرفض نفس الرقم مرّتين ورا بعض (بلاه
     الحالة ما بتتغيّر، فما في رسم جديد، والحرف المكتوب بيضل ظاهر بالـDOM). */
  const [capHit, setCapHit] = useState({ id: "", n: 0 });
  const capTimer = useRef(null);
  useEffect(() => () => { if (capTimer.current) clearTimeout(capTimer.current); }, []);

  /* ── 📥 مسوّدة التسجيل الجاري ──
     الجزار بيوزن عشر أصناف عالجوال، بتيجي مكالمة أو بتقفل الشاشة، والمتصفّح
     بيفرّغ التبويب — وكل الأوزان بتروح وهو ما بيعرف ليش. منكتب نسخة محلّية
     مع كل تعديل ومنعرض شريط «استئناف» أول ما يرجع. السيرفر بيضل مصدر
     الحقيقة: هاي مسوّدة ما قبل الحفظ، لا مخزن. */
  const [draft, setDraft] = useState(null);
  const clearDraft = useCallback(() => {
    setDraft(null);
    try { localStorage.removeItem(DRAFT_KEY); } catch { /* ignore */ }
  }, []);
  useEffect(() => {
    try {
      const raw = localStorage.getItem(DRAFT_KEY);
      if (!raw) return;
      const d = JSON.parse(raw);
      if (!d?.bomId || !(Date.now() - (Number(d.ts) || 0) < DRAFT_TTL_MS)) {
        localStorage.removeItem(DRAFT_KEY);
        return;
      }
      setDraft(d);
    } catch { /* ignore */ }
  }, []);

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

  /* «شاشة معروضة» = فيها قرار فعلي (خيارين فأكتر، أو خيار + كرت «بلا …»).
     خيار واحد بيتاخد لحاله بـresolveChain، فما بيظهر بشريط الخطوات كمان —
     وإلا الشريط بيعد خطوات الجزار ما بيشوفها أبداً. */
  const hasDecision = (p) => p.opts.length + (p.none > 0 ? 1 : 0) > 1;
  const hasKindStep = hasDecision(kindPick);
  const hasOriginStep = hasDecision(originPick);
  const hasCatStep = hasDecision(catPick);

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

  /* الذيل المشترك بأسماء الأصناف («(LAMB AUSTRALIA)» على كل سطر): بينشال من
     السطور وبينكتب مرّة وحدة بعنوان القسم. بالوضع المضغوط بس — عالكشك الكرت
     كبير والاسم كامل بيدخل بلا ما يقصّ. */
  const prodShort = useMemo(
    () => (compact ? shortenNames(productCuts.map((c) => nameOf(c, isAr))) : null),
    [compact, productCuts, isAr]
  );
  const wasteShort = useMemo(
    () => (compact ? shortenNames(wasteCuts.map((c) => nameOf(c, isAr))) : null),
    [compact, wasteCuts, isAr]
  );
  const prodTail = prodShort ? prodShort.tail : "";
  const wasteTail = wasteShort ? wasteShort.tail : "";

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

  /* خانات المادة الخام كلها متعبّاية؟ (الوزن + عدد القطع + تاريخ الانتهاء
     إن طلبتهنّ الوصفة) — بلاها ما منطوي الكرت ولا مرّة. */
  const rawDone = !rawMissing && !pieceMissing && !expiryMissing;
  /* الطيّ بإيد الجزار وبس: كان الكرت بينطوي لحاله أول ما يكتمل الخام وينتقل
     لمنتج — بس الأرقام كانت بتختفي من قدّامه وهو لسا بدّه يراجعها. بيضل
     مفتوحاً لحتى يضغط «طيّ»، وبيرجع يفتح لحاله بس إذا نقص شي إلزامي. */
  useEffect(() => {
    if (!rawDone || step !== "cuts") setRawOpen(true);
  }, [rawDone, step]);

  const canSave =
    filled.length > 0 && usedKg > 0 && !rawMissing && !overBlocks && !wasteMissing
    && !balanceOff && !pieceMissing && !expiryMissing && !pathwayPending;

  /* كتابة المسوّدة — مؤجّلة نص ثانية حتى ما نكتب عالقرص بكل ضغطة رقم. */
  useEffect(() => {
    if (step !== "cuts" || !bom?.id) return undefined;
    const id = setTimeout(() => {
      try {
        localStorage.setItem(DRAFT_KEY, JSON.stringify({
          v: 1, ts: Date.now(), bomId: bom.id, bomRef: bom.ref || "",
          empNo, branch, carcass, pieceCount, partialPiece, rawExpiry, cutDate, values,
        }));
      } catch { /* ignore */ }
    }, 500);
    return () => clearTimeout(id);
  }, [step, bom, empNo, branch, carcass, pieceCount, partialPiece, rawExpiry, cutDate, values]);

  /* مسوّدة تستاهل شريط «استئناف»: نفس الجزار، ووصفتها لسّا موجودة، وفيها
     شغل فعلي (وزن خام أو وزن صنف) — لا مسوّدة فاضية من شاشة انفتحت وانقفلت. */
  const resumable = useMemo(() => {
    if (!draft || !empNo) return null;
    if (String(draft.empNo || "") !== String(empNo).trim()) return null;
    /* ونفس الملحمة كمان: الأوزان تبع عملية بدأت بفرع معيّن، وعرضها بفرع تاني
       بيخلّي السجل ينحفظ على فرع ما صار فيه التقطيع. */
    if (String(draft.branch || "") !== String(branch || "")) return null;
    const b = allBoms.find((x) => x.id === draft.bomId);
    if (!b) return null;
    const any = num(draft.carcass) > 0
      || Object.values(draft.values || {}).some((v) => num(v?.w) > 0);
    return any ? { ...draft, bom: b } : null;
  }, [draft, empNo, branch, allBoms]);

  /* ------- الانتقالات ------- */

  /* شاشات التصفية اللي فعلاً انعرضت — «رجوع» بيرجع لآخر شاشة شافها الجزار
     لا لشاشة انتخطّت (وإلا بيرجع عليها وبتتخطّى لقدّام فوراً = زرّ ميّت). */
  const trail = useRef([]);

  /* ── تخطّي الشاشات اللي إلها خيار واحد ──
     شاشة بخيار واحد مش قرار: بتاخد لمسة من الجزار وبترجّع نفس النتيجة مهما
     عمل. منمشي بالسلسلة (نوع ← منشأ ← فئة)، منختار لحالنا كل بُعد ما فيه
     إلا خيار واحد ولا وصفة بلا تعريف عليه، ومنوقف عند أول شاشة فيها قرار
     حقيقي. تركيب فيه خيارات متعددة ما بيتغيّر عنده ولا شي. */
  const resolveChain = useCallback((fromDim, boms) => {
    const DIMS = ["kind", "origin", "category"];
    const picks = { kind: null, origin: null, category: null };
    let list = boms;
    for (let i = DIMS.indexOf(fromDim); i < DIMS.length; i += 1) {
      const d = DIMS[i];
      const p = bomFacetOptions(mrpCfg, list, d);
      if (!p.opts.length) continue;                    // بُعد بلا تعريفات — متخطّى أصلاً
      if (p.opts.length === 1 && !p.none) {            // خيار واحد → بلا شاشة
        picks[d] = p.opts[0].id;
        list = filterBomsByFacet(mrpCfg, list, d, picks[d]);
        continue;
      }
      return { step: d, picks };
    }
    return { step: "bom", picks };
  }, [mrpCfg]);

  /** ابدأ سلسلة التصفية من أولها (بعد الهوية، وبعد «تسجيل جديد»). */
  const goToFirstFilter = useCallback(() => {
    const r = resolveChain("kind", allBoms);
    setBomKind(r.picks.kind);
    setBomOrigin(r.picks.origin);
    setBomCat(r.picks.category);
    setBom(null);
    setBomSearch("");
    trail.current = ["emp"];
    setStep(r.step);
  }, [resolveChain, allBoms]);

  const startWithEmp = () => {
    const emp = empNo.trim();
    if (!emp || butcherBlocked) return;
    if (RULES.requireBranch !== false && !branch) return;
    try {
      localStorage.setItem(LAST_EMP_KEY, emp);
      localStorage.setItem(LAST_BRANCH_KEY, branch);
    } catch { /* ignore */ }
    setEmpNo(emp);
    goToFirstFilter();
    dayPlan.reload();
  };

  /* اختيار النوع → المنشأ (أو الفئة/الوصفات إذا ما في) */
  const pickKind = (id) => {
    const rest = filterBomsByFacet(mrpCfg, allBoms, "kind", id);
    const r = resolveChain("origin", rest);
    setBomKind(id);
    setBomOrigin(r.picks.origin);
    setBomCat(r.picks.category);
    setBom(null);
    setBomSearch("");
    trail.current.push("kind");
    setStep(r.step);
  };

  /* اختيار المنشأ → الفئة (أو الوصفات إذا ما في فئات) */
  const pickOrigin = (id) => {
    const rest = filterBomsByFacet(mrpCfg, bomsOfKind, "origin", id);
    const r = resolveChain("category", rest);
    setBomOrigin(id);
    setBomCat(r.picks.category);
    setBom(null);
    setBomSearch("");
    trail.current.push("origin");
    setStep(r.step);
  };

  /* اختيار فئة الوصفات → عرض وصفات هذه الفئة فقط */
  const pickCategory = (id) => {
    setBomCat(id);
    setBom(null);
    setBomSearch("");
    trail.current.push("category");
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
    setShowIssues(false);
    clearDraft();             // وصفة جديدة = المسوّدة القديمة ما عاد إلها معنى
    setEntryAt(new Date());   // لحظة بداية هالتسجيل، لا لحظة فتح الشاشة
    trail.current.push("bom");
    setStep("cuts");
  };

  /** استئناف مسوّدة — بترجّع الوصفة والأوزان متل ما تركهنّ بالضبط. */
  const resumeDraft = () => {
    const d = resumable;
    if (!d) return;
    setBom(d.bom);
    /* فتات المسار وشريط الخطوات بيقرأوا الأبعاد — منرجّعهنّ من الوصفة نفسها
       حتى يلاقي الجزار نفس السياق اللي ترك الشاشة عليه. */
    setBomKind(d.bom.kindId || null);
    setBomOrigin(d.bom.originId || null);
    setBomCat(d.bom.categoryId || null);
    setCarcass(d.carcass || "");
    setPieceCount(d.pieceCount || "");
    setPartialPiece(d.partialPiece === true);
    setRawExpiry(d.rawExpiry || "");
    setDurationMin("");
    setActiveId("");
    setValues(d.values && typeof d.values === "object" ? d.values : {});
    setCutDate(d.cutDate || todayStr());
    setError("");
    setShowIssues(false);
    setEntryAt(new Date());
    trail.current.push(step);
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

  /* أقصى وزن مسموح بخانة: الباقي من الخام + اللي بالخانة نفسها (لأنه
     جزء من المحسوب أصلاً). بلا وزن خام ما في سقف — الجزار لسا ما بلّش. */
  const capFor = useCallback((cutId) => {
    if (!(carcassKg > 0)) return Infinity;
    const mine = num(values[cutId]?.w);
    return Math.max(0, roundKg(carcassKg - usedKg + mine, RULES.roundTo));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [carcassKg, usedKg, values, RULES.roundTo]);

  /* خانة فاضية والباقي صفر → مقفولة: ما في وزن يتوزّع عليها أصلاً. */
  const capLocked = useCallback(
    (cutId) => carcassKg > 0 && !(num(values[cutId]?.w) > 0) && capFor(cutId) <= 0,
    [carcassKg, values, capFor]
  );

  const setVal = (cutId, key, v) => {
    if (error) setError("");   // رسالة فشل قديمة ما بتضل معلّقة بعد التعديل
    if (key === "w") {
      const cap = capFor(cutId);
      if (Number.isFinite(cap) && num(v) > cap) {
        /* بلا setValues: الرقم ما بينكتب. تغيير capHit بيعمل رسمة جديدة،
           وهي اللي بترجّع الخانة لقيمتها القديمة بالـDOM كمان. */
        buzz(55);   // الجزار عالجوال عينه عالميزان مش عالشاشة — الرجّة بتوصل أسرع
        setCapHit({ id: cutId, n: Date.now() });
        if (capTimer.current) clearTimeout(capTimer.current);
        capTimer.current = setTimeout(() => setCapHit({ id: "", n: 0 }), 900);
        return;
      }
    }
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
  /* شو ناقص بالضبط ووين محلّه. الترتيب = ترتيب الشاشة، فالجزار بينساق
     من فوق لتحت. sel فاضي يعني الغلط مش بخانة وحدة (مجموع/تطابق) فمنكتفي
     بالرسالة. */
  const saveProblem = () => {
    const M = (en, ar) => t({ en, ar });
    if (rawMissing) {
      return { sel: "[data-bt-need='raw']",
        msg: M("Enter the raw material weight first — every percentage is based on it.",
               "أدخل وزن المادة الخام أولاً — كل النسب مبنية عليه.") };
    }
    if (pieceMissing) {
      return { sel: "[data-bt-need='pieces']",
        msg: M("Number of pieces is required for this recipe.",
               "إدخال عدد القطع إلزامي لهالوصفة.") };
    }
    if (expiryMissing) {
      return { sel: "[data-bt-need='expiry']",
        msg: M("Enter the raw material expiry date from its label.",
               "أدخل تاريخ انتهاء المادة الخام من الملصق.") };
    }
    if (!(filled.length > 0) || !(usedKg > 0)) {
      return { sel: "[data-bt-w]:not([data-bt-need])",
        msg: M("Weigh at least one product before saving.",
               "وزّن منتجاً واحداً على الأقل قبل الحفظ.") };
    }
    if (wasteMissing) {
      return { sel: "[data-bt-waste]",
        msg: M("Waste weight is required.", "إدخال وزن الهدر إلزامي.") };
    }
    if (pathwayPending) {
      return { sel: "", msg: M("Weigh a product specific to one pathway to lock the routing.",
                               "وزّن منتجاً خاصاً بمسار واحد لتحديد المسار.") };
    }
    if (overBlocks) {
      return { sel: "", msg: isAr
        ? "المجموع أكبر من وزن المادة الخام بـ " + overKg.toFixed(2) + " كجم — صحّح الأوزان."
        : "Total exceeds the raw material weight by " + overKg.toFixed(2) + " kg — fix the weights." };
    }
    if (balanceOff) {
      return { sel: "", msg: isAr
        ? "هالوصفة بدها تطابق تام: ضلّ " + Math.abs(balanceDiff).toFixed(2) + " كجم."
        : "This recipe needs an exact balance: " + Math.abs(balanceDiff).toFixed(2) + " kg to go." };
    }
    return null;
  };

  /* الزرّ بيضل فعّال دايماً: إذا في نقص بيوصّل الجزار لمحلّه ويشرحه بدل
     ما يقعد رمادياً وهو ما بيعرف ليش. الحفظ نفسه محميّ بـcanSave. */
  const requestSave = () => {
    if (saving) return;
    const problem = saveProblem();
    if (problem) {
      setShowIssues(true);
      setError(problem.msg);
      const el = problem.sel ? document.querySelector(problem.sel) : null;
      if (el) {
        keepAboveKeyboard(el);
        try { el.focus({ preventScroll: true }); } catch { el.focus(); }
      }
      return;
    }
    setShowIssues(false);
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
      clearDraft();        // انحفظ (أو دخل صندوق الصادر) — المسوّدة خلص دورها
      buzz(40);            // رجّة تأكيد: الجزار حاسس بالحفظ بلا ما يقرأ
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
    setCarcass("");
    setPieceCount("");
    setPartialPiece(false);
    setRawExpiry("");
    setDurationMin("");
    setActiveId("");
    setValues({});
    setError("");
    setShowIssues(false);
    setSaved(null);
    goToFirstFilter();
  };

  /** رجوع خطوة — لآخر شاشة شافها الجزار فعلاً (الشاشات المتخطّاة مش بالمسار). */
  const back = () => {
    if (step === "cuts") {
      // اختيار وصفة بيصفّر الأوزان — فالرجوع بيضيّعها. منسأل قبل.
      if (filled.length > 0 && !window.confirm(t({
        en: "Go back? The weights you entered will be discarded.",
        ar: "رجوع؟ الأوزان اللي دخّلتها رح تنمسح.",
      }))) return;
      clearDraft();
    }
    if (step === "bom") setBomSearch("");
    const prev = trail.current.pop() || (step === "cuts" ? "bom" : "emp");
    /* الرجوع لشاشة تصفية بيلغي كل اللي بعدها — بلاها فتات المسار بيضل يعرض
       منشأً وفئةً وهو عم يختار النوع من جديد (خصوصاً لما ينكونوا انتخطّوا). */
    if (prev === "kind") { setBomKind(null); setBomOrigin(null); setBomCat(null); }
    if (prev === "origin") { setBomOrigin(null); setBomCat(null); }
    if (prev === "category") setBomCat(null);
    setBom(null);
    setShowIssues(false);
    setError("");
    setStep(prev);
  };

  const KG = t({ en: "kg", ar: "كجم" });

  // الكشك (بلا حساب) يمرّ دائماً — isItemAllowed ترجع true بلا قائمة تقييد
  if (!canOpenButcherPage("butcher.entry")) return <NoAccess page="butcher.entry" />;

  /* ------- العرض ------- */

  /* خلفية الشاشة = صورة آخر اختيار. الرسمة المدمجة SVG ما بتنفع كـ
     background-image، فإذا الاختيار بلا صورة مرفوعة منرجع للي قبله. */
  const pickedImg = (dim, id) => {
    if (!id || id === UNCAT) return "";
    const spec = BOM_FACETS[dim];
    const def = (mrpCfg?.[spec.key] || []).find((x) => x.id === id);
    return def?.imageUrl || "";
  };
  /* بلا useMemo عن قصد: منطق ثلاث مقارنات، والمكان هون بعد بوابة الصلاحية
     (return مبكّر) فأي hook هون بيكسر ترتيب الـhooks. */
  const wmUrl = step === "cuts"
    ? ((inputItem && imageOf(inputItem)) || "")
    /* من الأخصّ للأعمّ: الفئة ← المنشأ ← النوع */
    : (pickedImg("category", bomCat)
      || pickedImg("origin", bomOrigin)
      || pickedImg("kind", bomKind)
      || "");

  return (
    <div
      dir={dir}
      className={wmUrl ? "bt bt-wm" : "bt"}
      style={{
        ...S.page,
        ...(wmUrl ? { "--bt-wm": `url("${wmUrl}")` } : null),
        /* مساحة تحت بقدّ الكيبورد: بلاها آخر سطر بالشبكة ما إله وين ينزقّ
           فبيضل مخبّى تحته مهما عملنا scroll. */
        ...(kbH > 0 ? { paddingBottom: kbH + 40 } : null),
      }}
    >
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
              {tight ? (
                /* الجوال: أيقونة بس — الكلمة بتاكل الترويسة، وإخفاء الزرّ
                   كلياً (اللي كان) بيقفل اللغة بوجه اللي بيشتغل من الجيب. */
                <button
                  type="button"
                  onClick={toggle}
                  aria-label={isAr ? "Switch to English" : "التبديل إلى العربية"}
                  title={isAr ? "Switch to English" : "التبديل إلى العربية"}
                  style={S.langIcon}
                >
                  🌐
                </button>
              ) : (
                <LangToggle lang={lang} toggle={toggle} style={S.langBtn} />
              )}
            </span>
            {step === "emp" && isLoggedIn && (
              <button className="bt-small" style={S.chg} onClick={() => navigate("/butcher", { replace: true })}>
                {t({ en: "Back to section", ar: "رجوع للقسم" })}
              </button>
            )}
            {step !== "emp" && (
              <div className="bt-emp" style={S.emp}>
                {empNo}
                <button
                  className="bt-small"
                  style={S.chg}
                  onClick={() => { trail.current = []; setStep("emp"); }}
                >
                  {t({ en: "Change", ar: "تغيير" })}
                </button>
              </div>
            )}
          </div>
        </div>

        {step !== "emp" && step !== "done" && !(compact && step === "cuts") && (
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

        {/* ── خطة اليوم: هدف الملحمة والتقدّم عليه ──
             بشاشة الأوزان المضغوطة بتختفي: كل بكسل فوق الشبكة بيدفع منتجاً
             تحت حافة الشاشة، والخطة موجودة بكل الشاشات اللي قبلها. */}
        {step !== "emp" && !(compact && step === "cuts") && dayPlan.plan && dayPlan.progress && (
          <DayPlanBar
            plan={dayPlan.plan}
            progress={dayPlan.progress}
            branchName={branchObj ? nameOf(branchObj, isAr) : ""}
            KG={KG}
            t={t}
          />
        )}

        {step !== "emp" && step !== "done" && !(compact && step === "cuts") && totals && (
          <div className="bt-chip" style={S.totals}>
            {t({ en: "Today", ar: "اليوم" })}: {totals.count}{" "}
            {totals.count === 1
              ? t({ en: "carcass", ar: "ذبيحة" })
              : t({ en: "carcasses", ar: "ذبيحة" })} — {totals.kg.toFixed(2)} {KG}
          </div>
        )}

        {step !== "emp" && step !== "done" && !(compact && step === "cuts") && (
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

        {/* 📥 تسجيل ما خلص — الشاشة انقفلت عليه بالنص (مكالمة، قفل جهاز،
             متصفّح فرّغ التبويب). منعرضه بلا ما نفرضه: استئناف أو تجاهل. */}
        {resumable && step !== "emp" && step !== "cuts" && step !== "done" && (
          <div className="bt-sum bt-rise" style={S.draftBar}>
            <span style={{ flex: "1 1 170px", minWidth: 0 }}>
              📥 {t({ en: "You have an unfinished entry", ar: "عندك تسجيل ما خلّصته" })}
              {" — "}
              <b>{itemName(bomInputItem(mrpCfg, resumable.bom), isAr)}</b>
              {resumable.bomRef ? ` · ${resumable.bomRef}` : ""}
            </span>
            <button type="button" className="bt-small" style={S.draftGo} onClick={resumeDraft}>
              ↩ {t({ en: "Resume", ar: "استئناف" })}
            </button>
            <button type="button" className="bt-small" style={S.chg} onClick={clearDraft}>
              {t({ en: "Discard", ar: "تجاهل" })}
            </button>
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

            {/* تاريخ التقطيع — محلّه هون، بصفحة اختيار المادة الخام: بينتحدّد
                مرّة قبل ما يبلّش، وبتضل شاشة الأوزان للأوزان وبس. */}
            {compact && (
              <label style={{ ...S.rawField, ...S.rawFieldSm, marginBottom: 10 }}>
                <span style={{ ...S.rowArt, ...S.rowArtIcon }}>📅</span>
                <span className="bt-cname" style={{ ...S.rowBody, ...S.rowName }}>
                  {t({ en: "Cutting date", ar: "تاريخ التقطيع" })}
                </span>
                <input
                  className="bt-cnum"
                  type="date"
                  value={cutDate}
                  max={todayStr()}
                  disabled={RULES.allowBackdate !== true}
                  onChange={(e) => setCutDate(e.target.value)}
                  style={{
                    ...S.input,
                    ...S.rowInputWide,
                    ...(RULES.allowBackdate !== true ? { background: "#f1f6fb", color: "#6b8299" } : null),
                  }}
                />
              </label>
            )}
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
                      {/* صورة المادة الخام — الوصفة بتنعرف من الداخل إلها،
                          فصورته هي أوضح تعريف للوصفة عند جزار ما بيقرأ. */}
                      {inp?.imageUrl && <img src={inp.imageUrl} alt="" style={S.tileImg} />}
                      <span className="bt-name" style={S.name}>{itemName(inp, isAr)}</span>
                      <span className="bt-lbl" style={S.code}>{b.ref}</span>
                      {(tags.origin || tags.kind) && (
                        <span className="bt-lbl" style={S.altName}>
                          {[tags.kind && `🐑 ${tags.kind}`, tags.origin && `🌍 ${tags.origin}`]
                            .filter(Boolean).join(" · ")}
                        </span>
                      )}
                      <span className="bt-lbl" style={{ color: "#6b8299", fontWeight: 800 }}>
                        {multi
                          ? `🔀 ${outN} ${outN === 1
                              ? t({ en: "pathway", ar: "مسار" })
                              : t({ en: "pathways", ar: "مسار" })}`
                          : `${outN} ${outN === 1
                              ? t({ en: "final product", ar: "منتج نهائي" })
                              : t({ en: "final products", ar: "منتج نهائي" })}`}
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
            {/* ── المادة الخام مطويّة بسطر (الوضع المضغوط، بعد ما تكتمل) ──
                 كرت الخام لحاله بياكل ثلث شاشة الموبايل، وبعد ما ينكتب الوزن
                 ما بيتغيّر — فبيصير سطر معلومات، وبفتحه زر ✎ لأي تصحيح. */}
            {compact && !rawOpen ? (
              <div className="bt-cbar" style={S.rawLine}>
                <span style={{ ...S.rowArt, ...S.rawLineArt }}>
                  {inputItem && hasArt(inputItem) ? <ItemArt item={inputItem} /> : null}
                </span>
                {inputItem && (
                  <span style={S.rawLineName}>
                    {nameOf(inputItem, isAr) || itemName(inputItem, isAr)}
                  </span>
                )}
                <span style={{ whiteSpace: "nowrap" }}>
                  <b>{carcassKg.toFixed(2)}</b> {KG}
                </span>
                {needPieces && (
                  <span style={{ whiteSpace: "nowrap" }}>
                    · {partial
                      ? t({ en: "part", ar: "جزء" })
                      : `${pieceCountNum} ${t({ en: "pcs", ar: "قطعة" })}`}
                  </span>
                )}
                {needExpiry && rawExpiry && (
                  <span style={{ whiteSpace: "nowrap", ...(expiryPassed ? S.overText : null) }}>
                    · ⌛ {rawExpiry}
                  </span>
                )}
                <button
                  type="button"
                  className="bt-small"
                  style={{ ...S.chg, marginInlineStart: "auto" }}
                  onClick={() => { setRawOpen(true); setActiveId(RAW_KEY); }}
                >
                  ✎ {t({ en: "Edit", ar: "تعديل" })}
                </button>
              </div>
            ) : (
            /* ── وزن المادة الخام (يغذّي النسب المئوية للنواتج) ── */
            <div style={{ ...S.rawCard, ...(compact ? S.rawCardSm : null) }}>
              <div style={{ ...S.rawHead, ...(compact ? S.rawHeadSm : null) }}>
                <span className={compact ? "bt-cbar" : "bt-lbl"} style={{ color: "#6b8299", fontWeight: 800 }}>
                  {t({ en: "Raw material", ar: "المادة الخام" })}
                </span>
                {inputItem && !compact && (
                  <span className="bt-name" style={S.name}>{itemName(inputItem, isAr)}</span>
                )}
                {compact && rawDone && (
                  <button
                    type="button"
                    className="bt-small"
                    style={S.chg}
                    onClick={() => { setRawOpen(false); if (activeId === RAW_KEY) setActiveId(""); }}
                  >
                    ▲ {t({ en: "Collapse", ar: "طيّ" })}
                  </button>
                )}
              </div>
              {/* سطر المادة الخام: ضِعف ارتفاع سطر المنتج — هو أساس كل النسب
                  وأول شي بينوزن، فلازم يبيّن إنه مش سطراً من الليستة. */}
              <label style={{
                ...S.rawField,
                ...(compact ? { ...S.rawFieldSm, ...S.rawMainSm } : null),
                ...(compact && focusId === RAW_KEY ? { ...S.rowFocus, ...S.rowLift } : null),
              }}>
                {compact && (
                  <span style={{ ...S.rowArt, ...S.rawArtBig }}>
                    {inputItem && hasArt(inputItem) ? <ItemArt item={inputItem} /> : null}
                  </span>
                )}
                <span
                  className={compact ? "bt-cname" : "bt-lbl"}
                  style={compact ? { ...S.rowBody, ...S.rowName, ...S.rawNameSm } : S.lbl}
                >
                  {compact && inputItem
                    ? (nameOf(inputItem, isAr) || itemName(inputItem, isAr))
                    : t({ en: "Weight before cutting (kg)", ar: "الوزن قبل التقطيع (كجم)" })}
                </span>
                <input
                  className={compact ? "bt-cnum" : "bt-num"}
                  value={carcass}
                  onChange={(e) => setCarcass(cleanDecimal(e.target.value))}
                  onFocus={(e) => {
                    setActiveId(RAW_KEY); setFocusId(RAW_KEY);
                    keepAboveKeyboard(e.currentTarget);
                  }}
                  onBlur={() => setFocusId("")}
                  onKeyDown={focusNextWeight}
                  data-bt-w=""
                  data-bt-need="raw"
                  inputMode="decimal"
                  enterKeyHint="next"
                  autoComplete="off"
                  /* بيتقرأ مرّة وحدة وقت ما تتركّب الخانة: وصفة جديدة = الكيبورد
                     بيفتح فوراً على وزن الخام. استئناف مسوّدة = الوزن موجود
                     أصلاً، فما منفتح كيبورد فوق شغل جاهز. */
                  autoFocus={!carcass}
                  placeholder="0.00"
                  style={{
                    ...S.input,
                    ...(compact ? { ...S.rowInput, ...S.rawInputBig } : null),
                    /* الأحمر بس بعد ما يضغط «حفظ» — قبلها الخانة الفاضية
                       مش غلط، هي بداية الشغل. */
                    ...(showIssues && rawMissing ? S.inputBad : null),
                    ...(activeId === RAW_KEY ? S.inputActive : null),
                    ...(focusId === RAW_KEY ? S.inputFocus : null),
                  }}
                />
                {!compact && (
                  <span className="bt-lbl" style={S.hintSm}>
                    {t({
                      en: "Two decimals max (e.g. 10.25)",
                      ar: "خانتان عشريتان كحدّ أقصى (مثال: ١٠٫٢٥)",
                    })}
                  </span>
                )}
              </label>
              {needPieces && (
                <div style={{
                  ...S.rawField,
                  ...(compact ? { ...S.rawFieldSm, ...S.pieceRowSm } : null),
                  ...(compact && focusId === PIECE_KEY ? { ...S.rowFocus, ...S.rowLift } : null),
                }}>
                  {compact && <span style={{ ...S.rowArt, ...S.rowArtIcon }}>🔢</span>}
                  <span
                    className={compact ? "bt-cname" : "bt-lbl"}
                    style={compact ? { ...S.rowBody, ...S.rowName } : S.lbl}
                  >
                    {compact
                      ? t({ en: "Pcs", ar: "العدد" })
                      : t({ en: "Number of pieces", ar: "عدد القطع" })}
                  </span>
                  <input
                    className={compact ? "bt-cnum" : "bt-num"}
                    value={partial ? "" : pieceCount}
                    onChange={(e) => setPieceCount(cleanInt(e.target.value))}
                    onFocus={(e) => { setFocusId(PIECE_KEY); keepAboveKeyboard(e.currentTarget); }}
                    onBlur={() => setFocusId("")}
                    onKeyDown={focusNextWeight}
                    data-bt-w=""
                    data-bt-need="pieces"
                    inputMode="numeric"
                    enterKeyHint="next"
                    autoComplete="off"
                    disabled={partial}
                    placeholder={partial ? "—" : "0"}
                    style={{
                      ...S.input,
                      ...(compact ? S.rowInput : null),
                      ...(showIssues && pieceMissing ? S.inputBad : null),
                      ...(partial ? S.inputOff : null),
                      ...(focusId === PIECE_KEY ? S.inputFocus : null),
                    }}
                  />

                  {/* تجاوز الإلزامية: الداخل جزء من قطعة، فما في عدد قطع.
                      بالوضع المضغوط بيصير شارة صغيرة جوّا نفس السطر («جزء»)
                      بدل زرّ بعرض الكرت مع سطر شرح — الشرح صار بالـtitle. */}
                  <button
                    type="button"
                    title={t({
                      en: "Part of a carcass/cut — no piece count to record.",
                      ar: "جزء من ذبيحة أو قطعة — ما في عدد قطع يتسجّل.",
                    })}
                    onClick={() => {
                      setPartialPiece((v) => {
                        if (!v) setPieceCount("");     // تفعيل = ما في عدد
                        return !v;
                      });
                      if (error) setError("");
                    }}
                    className={compact ? "bt-cbar" : undefined}
                    style={{
                      ...S.partialBtn,
                      ...(compact ? S.partialBtnSm : null),
                      ...(partial ? S.partialBtnOn : null),
                    }}
                  >
                    <span style={{
                      ...S.partialBox,
                      ...(compact ? S.partialBoxSm : null),
                      ...(partial ? S.partialBoxOn : null),
                    }}>
                      {partial ? "✓" : ""}
                    </span>
                    <span style={{ textAlign: "start" }}>
                      {compact
                        ? t({ en: "Part", ar: "جزء" })
                        : t({ en: "Not a whole piece", ar: "ليست قطعة كاملة" })}
                      {!compact && (
                        <span className="bt-lbl" style={S.partialHint}>
                          {t({
                            en: "Part of a carcass/cut — no piece count to record.",
                            ar: "جزء من ذبيحة أو قطعة — ما في عدد قطع يتسجّل.",
                          })}
                        </span>
                      )}
                    </span>
                  </button>
                </div>
              )}

              {needExpiry && (
                <label style={{ ...S.rawField, ...(compact ? S.rawFieldSm : null) }}>
                  {compact && <span style={{ ...S.rowArt, ...S.rowArtIcon }}>📅</span>}
                  <span
                    className={compact ? "bt-cname" : "bt-lbl"}
                    style={compact ? { ...S.rowBody, ...S.rowName } : S.lbl}
                  >
                    {compact ? "" : "📅 "}{t({ en: "Raw material expiry date", ar: "تاريخ انتهاء المادة الخام" })}
                  </span>
                  <input
                    className={compact ? "bt-cnum" : "bt-cutnum"}
                    type="date"
                    data-bt-need="expiry"
                    value={rawExpiry}
                    onChange={(e) => { setRawExpiry(e.target.value); if (error) setError(""); }}
                    style={{
                      ...S.input,
                      ...(compact ? S.rowInputWide : null),
                      ...(showIssues && expiryMissing ? S.inputBad : null),
                      ...(expiryPassed ? { borderColor: "#e88", background: "#fff7f7" } : null),
                    }}
                  />
                  {(expiryPassed || !compact) && (
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
                  )}
                </label>
              )}

              {/* ── التواريخ: تاريخ التقطيع (يختاره الجزار) وتاريخ الإدخال (تلقائي) ──
                   بالوضع المضغوط الصفّ كله بينشال: التقطيع انتحدّد بصفحة اختيار
                   المادة الخام، وطابع الإدخال بينكتب لحاله وبيبيّن بشاشة «تم». */}
              {!compact && (
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
              )}
            </div>
            )}

            {/* ── شريط التقدّم: كم انوزن من الخام وكم ضلّ ──
                 مطفي بالوضع المضغوط: نفس الأرقام موجودة برصيف الحفظ الملتصق
                 تحت (المتبقي · التصافي · الموزون) بلا ما تاخد مكان فوق. */}
            {carcassKg > 0 && !compact && (
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
              <div className={compact ? "bt-cbar" : "bt-sum"} style={{
                ...S.emptyBox, textAlign: "start",
                /* بالمضغوط: حشوة ٢٦px فوق وتحت كانت تاكل سطرين منتجات */
                ...(compact ? { padding: "10px 12px", borderRadius: 14 } : null),
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
                  /* الشرح الطويل للكشك؛ على الجوال الجملة القصيرة بتكفي
                     وبتوفّر سطرين من الشبكة. */
                  <span>🔀 {(pathwayPending || compact)
                    ? t({ en: "Weigh a product specific to one pathway to lock the routing.", ar: "وزّن منتجاً خاصاً بمسار واحد لتحديد المسار." })
                    : t({ en: "Weigh the products — a distinguishing one selects the pathway; the rest lock.", ar: "وزّن المنتجات — المنتج المميِّز بيحدّد المسار وباقي المسارات بتتعطّل." })}
                  </span>
                )}
              </div>
            )}

            {/* ── المنتجات النهائية (قائمة موحّدة بلا تكرار) ── */}
            <div style={{ ...S.sectionBar, ...(compact ? S.sectionBarSm : null) }}>
              <span
                className={compact ? "bt-cbar" : "bt-name"}
                style={compact ? S.sectionTitleSm : { fontWeight: 900 }}
              >
                {/* بالمضغوط: الذيل المشترك محلّ الكلمتين. 🥩 بيقول إنها
                    المنتجات (متل 🦴 للهدر)، والذيل بيقول عيلة المنتجات —
                    وهالمعلومة هي الجديدة. الاثنين مع بعض ما بيدخلوا بسطر. */}
                🥩 {compact && prodTail
                  ? <span className="bt-tail" style={S.tailNote}>
                      {prodTail.replace(/^\(|\)$/g, "")}
                    </span>
                  : t({ en: "Final products", ar: "المنتجات النهائية" })}
              </span>
              <span
                className={compact ? "bt-cbar" : "bt-lbl"}
                style={{ ...S.countChip, ...(compact ? S.countChipSm : null) }}
              >
                {productCuts.filter((c) => num(values[c.itemId]?.w) > 0).length} / {productCuts.length}
                {compact ? "" : ` ${t({ en: "weighed", ar: "موزون" })}`}
              </span>
              {/* تفريغ الأوزان — كان بشريط المجاميع اللي انشال من الوضع
                  المضغوط، فبلاه ما بيبقى للجزار طريق يمسح غلطة بالجملة. */}
              {compact && filled.length > 0 && !isMultiPath && (
                <button
                  type="button"
                  className="bt-cbar"
                  style={{ ...S.chg, ...S.chgSm }}
                  onClick={clearWeights}
                  title={t({ en: "Clear weights", ar: "تفريغ الأوزان" })}
                >
                  ↺
                </button>
              )}
              {/* تبديل الشكل — المضغوط بيدخّل كل المنتجات بشاشة وحدة،
                  والكبير بيكبّر الصور لجزار بيتعرّف على الصنف بالصورة. */}
              <button
                type="button"
                className="bt-small"
                style={{
                  /* بالمضغوط العنوان هو اللي بياكل الفاضي (sectionTitleSm)،
                     فهامش auto هون بيدفع السطر يلفّ ويوكل سطر منتج. */
                  ...S.chg, ...(compact ? S.chgSm : null),
                  ...(compact ? null : { marginInlineStart: "auto" }),
                }}
                onClick={() => setCompact(!compact)}
                title={t({ en: "Switch card size", ar: "تبديل حجم الكروت" })}
              >
                {compact ? "⛶" : `▦ ${t({ en: "Compact", ar: "عرض مضغوط" })}`}
              </button>
            </div>
            <div className={compact ? "bt-gridsm" : undefined} style={compact ? undefined : S.grid}>
              {productCuts.map((c, i) => {
                const w = num(values[c.itemId]?.w);
                const info = isMultiPath ? chosenLineOf.get(c.itemId) : c;
                const target = targetKgOf({ targetQty: info ? info.targetQty : (isMultiPath ? 0 : c.targetQty) });
                return (
                  <ItemCard
                    key={c.itemId}
                    item={c}
                    disabled={itemLocked(c.itemId) || capLocked(c.itemId)}
                    value={values[c.itemId]?.w || ""}
                    onChange={(v) => setVal(c.itemId, "w", v)}
                    selected={activeId === c.itemId}
                    onSelect={() => setActiveId(c.itemId)}
                    code={c.sku}
                    label={prodShort ? prodShort.names[i] : ""}
                    pct={showPct && w > 0 && carcassKg > 0 ? pctOf(w) : null}
                    pctLabel={t({ en: "of raw", ar: "من الخام" })}
                    target={target > 0 ? target : null}
                    targetLabel={t({ en: "target", ar: "الهدف" })}
                    tone={targetTone(target, w)}
                    isAr={isAr}
                    t={t}
                    compact={compact}
                    focused={focusId === c.itemId}
                    capHit={capHit.id === c.itemId}
                    onFocusIn={(el) => { setFocusId(c.itemId); keepAboveKeyboard(el); }}
                    onFocusOut={() => setFocusId("")}
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
                <div style={{ ...S.sectionBar, ...(compact ? S.sectionBarSm : null) }}>
                  <span
                    className={compact ? "bt-cbar" : "bt-name"}
                    style={compact ? S.sectionTitleSm : { fontWeight: 900 }}
                  >
                    🦴 {compact && wasteTail
                      ? <span className="bt-tail" style={S.tailNote}>
                          {wasteTail.replace(/^\(|\)$/g, "")}
                        </span>
                      : t({ en: "Waste", ar: "الهدر" })}
                  </span>
                  <span
                    className={compact ? "bt-cbar" : "bt-lbl"}
                    style={{ ...S.countChip, ...(compact ? S.countChipSm : null) }}
                  >
                    {wasteCuts.filter((c) => num(values[c.itemId]?.w) > 0).length} / {wasteCuts.length}
                    {compact ? "" : ` ${t({ en: "weighed", ar: "موزون" })}`}
                  </span>
                </div>
                <div className={compact ? "bt-gridsm" : undefined} style={compact ? undefined : S.wasteRow}>
                  {wasteCuts.map((c, i) => {
                    const w = num(values[c.itemId]?.w);
                    return (
                      <ItemCard
                        key={c.itemId}
                        item={c}
                        disabled={itemLocked(c.itemId) || capLocked(c.itemId)}
                        value={values[c.itemId]?.w || ""}
                        onChange={(v) => setVal(c.itemId, "w", v)}
                        selected={activeId === c.itemId}
                        onSelect={() => setActiveId(c.itemId)}
                        code={c.sku}
                        label={wasteShort ? wasteShort.names[i] : ""}
                        pct={showPct && w > 0 && carcassKg > 0 ? pctOf(w) : null}
                        pctLabel={t({ en: "of raw", ar: "من الخام" })}
                        tone={S.wasteTone}
                        isAr={isAr}
                        t={t}
                        compact={compact}
                        focused={focusId === c.itemId}
                        capHit={capHit.id === c.itemId}
                        onFocusIn={(el) => { setFocusId(c.itemId); keepAboveKeyboard(el); }}
                        onFocusOut={() => setFocusId("")}
                        mark="waste"
                      />
                    );
                  })}
                </div>
              </>
            )}

            {!compact && (
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
            )}

            {/* النِّسب من وزن المادة الخام */}
            {!compact && (
            <div className="bt-sum" style={S.pctBar}>
              <span>
                {t({ en: "Net yield", ar: "نسبة التصافي" })}: <b>{netYieldPct.toFixed(1)}%</b>
              </span>
              <span>
                {t({ en: "Waste %", ar: "نسبة الهدر" })}: <b>{wastePct.toFixed(1)}%</b>
              </span>
            </div>
            )}

            {showIssues && exactBalance && (
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

            {/* تنبيهات «خام ناقص / عدد قطع / هدر» كانت تتكرّر حرفياً: مرّة هون
                ومرّة بصندوق الخطأ تحت اللي بيطلع من نفس الضغطة على «حفظ».
                صندوق الخطأ بيزيد عليها إنه بيوقّف المؤشّر عالخانة الناقصة،
                فخلّينا إيّاه لحاله وشلنا التكرار. */}
            {rawFar && (
              <div className="bt-sum" style={S.warn}>
                {isAr
                  ? `تأكّد من الوزن: الوزن القياسي لهالوصفة ${inputQty} كجم تقريباً.`
                  : `Check the weight: this recipe's standard input is about ${inputQty} kg.`}
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
            {activeId && !compact && (
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
            {/* الرصيف بيرتفع بمقدار الكيبورد: بلاها بيضل ملزوق بأسفل
                الشاشة الحقيقية — يعني مخبّى تحت الكيبورد وقت الكتابة. */}
            <div style={{
              ...S.saveDock,
              ...(compact ? S.saveDockSm : null),
              ...(kbH > 0 ? { transform: "translateY(-" + kbH + "px)" } : null),
            }}>
              {/* حلقة الوزن — جوّا الرصيف الملزوق، فبتلحق الجزار وين ما مشى
                  بلا ما تطلع فوق صورة ولا خانة، وبتضل واضحة مية بالمية. */}
              {compact && carcassKg > 0 && (
                <FloatRing used={usedKg} total={carcassKg} over={isOver} />
              )}
              <span style={compact ? S.dockBody : null}>
              {(carcassKg > 0 || filled.length > 0) && (
                <div
                  className={compact ? "bt-cbar" : "bt-small"}
                  style={{ ...S.dockLine, ...(compact ? S.dockLineSm : null) }}
                >
                  {/* بالمضغوط رموز بدل كلمات: الحلقة آخدة عرض والرصيف لازم
                      يضل سطراً واحداً حتى ما ياكل سطرين منتجات من فوقه. */}
                  <span style={{ whiteSpace: "nowrap" }}>
                    {/* «⚖» كان بيلخبط: ميزان ممكن يعني الموزون كمان. كلمة قصيرة
                        بتقول المقصود بالضبط وبتدخل بنفس السطر. */}
                    {compact
                      ? `${t({ en: "Left", ar: "الباقي" })} `
                      : t({ en: "Remaining: ", ar: "المتبقي: " })}
                    <b style={isOver ? S.overText : null}>{remainingKg.toFixed(2)}</b> {KG}
                  </span>
                  {!compact && (
                    <span>
                      {t({ en: "Net yield", ar: "التصافي" })}: <b>{netYieldPct.toFixed(1)}%</b>
                    </span>
                  )}
                  <span style={{ whiteSpace: "nowrap" }}>
                    {compact ? "✓ " : t({ en: "Weighed: ", ar: "الموزون: " })}<b>{cutCount}</b>
                    {wasteOnlyKg > 0 ? ` + ${t({ en: "waste", ar: "هدر" })}` : ""}
                  </span>
                </div>
              )}
              <button
                className="bt-btn"
                onClick={requestSave}
                disabled={saving}
                style={{
                  ...S.primary, ...(compact ? S.primarySm : null),
                  ...(saving ? S.disabled : null),
                  ...(!canSave && !saving ? S.primaryNeeds : null),
                }}
              >
                {saving
                  ? t({ en: "Saving…", ar: "جارٍ الحفظ…" })
                  : `${t({ en: "Save", ar: "حفظ" })} (${cutCount})`}
              </button>
              </span>
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
                {totals.count === 1
                  ? t({ en: "carcass", ar: "ذبيحة" })
                  : t({ en: "carcasses", ar: "ذبيحة" })} — {totals.kg.toFixed(2)} {KG}
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
          {progress.mine.count === 1
            ? t({ en: "carcass", ar: "ذبيحة" })
            : t({ en: "carcasses", ar: "ذبيحة" })} · {progress.mine.rawKg.toFixed(0)} {KG}
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
  selected, onSelect, compact, focused, onFocusIn, onFocusOut, mark, capHit, label,
}) {
  const active = num(value) > 0;
  const inputRef = useRef(null);

  /* لمسة على أي محل بالسطر بتفتح الكيبورد على خانة السطر — الجزار عالجوال
     كان لازم يصيب مربّع ٩٦px بإصبع مبلّل. لمسة جوّا الخانة نفسها ما منتدخّل
     فيها: هي لتحريك المؤشّر. */
  const focusInput = () => {
    const el = inputRef.current;
    if (!el || el.disabled || document.activeElement === el) return;
    el.focus();
    // select بعد ما يستقرّ الـfocus — إعادة الوزن بتصير كتابة فوق، لا مسح رقم رقم
    setTimeout(() => { try { el.select(); } catch { /* ignore */ } }, 0);
  };

  /* الوضع المضغوط: نفس الكرت بس مضجّع — صورة، اسم، خانة وزن، بصفّ واحد.
     ليستة تحت بعض: الجزار بيمشي بعينه عمودياً سطر سطر بدل ما يلفّ بشبكة،
     وارتفاع السطر ~٦٤px بدل ~٤٠٠ فبتدخل الوصفة كلها بشاشة الجوال. */
  if (compact) {
    return (
      <div
        className="bt-press"
        onClick={disabled ? undefined : focusInput}
        style={{
          ...S.cutRow, ...(active ? S.cutRowOn : null), ...(tone || null),
          /* التحديد الأزرق بينطفي وقت الوقوف بالخانة — الكهرماني هو حالة
             «عم أكتب هون» ولازم يكون هو الوحيد اللي بيبيّن. */
          ...(selected && !focused ? S.cutCardSel : null),
          ...(focused ? { ...S.rowFocus, ...S.rowLift } : null),
          ...(disabled ? { opacity: 0.55, pointerEvents: "none" } : null),
        }}
      >
        {/* علامة «تمّ» فوق زاوية الصورة لا بصفّ السطر: كانت تاخد ٣٢px من عرض
            الاسم، والاسم هو اللي بيفرّق بين صنف وصنف. */}
        <span style={S.rowArt}>
          {hasArt(item) ? <ItemArt item={item} /> : null}
          {active && <span className="bt-tick" style={S.rowTick} aria-hidden="true">✓</span>}
        </span>
        <span style={S.rowBody}>
          <span className="bt-cname" style={S.rowName}>{label || nameOf(item, isAr)}</span>
          {Number.isFinite(target) && target > 0 && (
            <span className="bt-cbar" style={S.targetSm}>
              🎯 {target.toFixed(2)}
              {active && ` (${num(value) >= target ? "+" : "−"}${Math.abs(num(value) - target).toFixed(2)})`}
            </span>
          )}
        </span>
        <input
          ref={inputRef}
          className="bt-cnum"
          value={value}
          onChange={(e) => onChange(cleanDecimal(e.target.value))}
          onFocus={(e) => { onSelect(); if (onFocusIn) onFocusIn(e.currentTarget); }}
          onBlur={onFocusOut}
          onKeyDown={focusNextWeight}
          data-bt-w=""
          data-bt-waste={mark === "waste" ? "" : undefined}
          inputMode="decimal"
          enterKeyHint="next"
          autoComplete="off"
          placeholder="0.00"
          disabled={disabled}
          aria-label={label || nameOf(item, isAr)}
          style={{
            ...S.cutInput, ...S.rowInput,
            ...(selected ? S.inputActive : null),
            ...(focused ? S.inputFocus : null),
            ...(capHit ? S.inputReject : null),
          }}
        />
      </div>
    );
  }

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
          ref={inputRef}
          onFocus={onSelect}
          onKeyDown={focusNextWeight}
          data-bt-w=""
          inputMode="decimal"
          enterKeyHint="next"
          autoComplete="off"
          placeholder="0.00"
          disabled={disabled}
          style={{
          ...S.cutInput,
          ...(selected ? S.inputActive : null),
          ...(capHit ? S.inputReject : null),
        }}
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
  // «١ recipes» كان بيطلع بالإنجليزي — العربي ما بيصرّف العدد، الإنجليزي بيصرّف
  const label = (n) => (isAr ? "وصفة" : n === 1 ? "recipe" : "recipes");

  return (
    <>
      <div className="bt-q" style={S.q}>{spec.icon} {title}</div>
      <div style={S.grid}>
        {pick.opts.map((o) => (
          <button key={o.id} className="bt-press" onClick={() => onPick(o.id)} style={S.tile}>
            {/* 📷 صورة النوع/المنشأ/الفئة — أغلب الجزارين ما بيقروا، فالصورة
                هي اللي بتعرّفهم على الخيار. بتنضاف من صفحة الـBOM. */}
            {o.imageUrl && (
              <img src={o.imageUrl} alt="" style={S.tileImg} />
            )}
            <span className="bt-name" style={S.name}>{nameOf(o, isAr) || o.id}</span>
            <span className="bt-lbl" style={{ color: "#6b8299", fontWeight: 800 }}>
              {o.count} {label(o.count)}
            </span>
          </button>
        ))}
        {pick.none > 0 && (
          <button className="bt-press" onClick={() => onPick(UNCAT)} style={S.tile}>
            <span className="bt-name" style={S.name}>{t({ en: spec.enNone, ar: spec.arNone })}</span>
            <span className="bt-lbl" style={{ color: "#6b8299", fontWeight: 800 }}>
              {pick.none} {label(pick.none)}
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
  const color = over ? "#dc2626" : ratio > 0.9 ? "#b45309" : "#14507f";

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

/* ═══ حلقة الوزن الطايفة (الموبايل) ═══
   نسخة مصغّرة من ProgressRing، ثابتة بزاوية الشاشة: بتقول كم انوزن من وزن
   المادة الخام وكم ضلّ، بلا ما تاخد سطراً من الشبكة ولا تحجب خانة. */
function FloatRing({ used, total, over }) {
  const r = 26;
  const c = 2 * Math.PI * r;
  const ratio = total > 0 ? Math.min(used / total, 1) : 0;
  const color = over ? "#dc2626" : ratio > 0.9 ? "#b45309" : "#14507f";

  return (
    <span style={S.floatRing} aria-hidden="true">
      <svg width="52" height="52" viewBox="0 0 64 64">
        <circle cx="32" cy="32" r={r} fill="none" stroke="#cddcec" strokeWidth="9" />
        <circle
          cx="32" cy="32" r={r} fill="none" stroke={color} strokeWidth="9"
          strokeLinecap="round" strokeDasharray={`${c * ratio} ${c}`}
          transform="rotate(-90 32 32)"
          style={{ transition: "stroke-dasharray .3s ease, stroke .2s ease" }}
        />
        <text x="32" y="38" textAnchor="middle" fontSize="18" fontWeight="900" fill={color}>
          {Math.round(ratio * 100)}%
        </text>
      </svg>
    </span>
  );
}

/** لون خلفية كرت المنتج حسب قربه من الوزن المستهدف من الوصفة (±10%). */
function targetTone(targetKg, actualKg) {
  if (!(targetKg > 0) || !(actualKg > 0)) return null;
  const diff = (actualKg - targetKg) / targetKg;
  /* شفافة ٥٠٪ متل باقي المستطيلات — الحدّ هو اللي بيحمل اللون بوضوح */
  if (diff < -0.1) return { background: "transparent", borderColor: "#b8860b" };  // أقل من الهدف
  if (diff > 0.1) return { background: "transparent", borderColor: "#b91c1c" };   // أكثر من الهدف
  return { background: "transparent", borderColor: "#15803d" };                   // ضمن المدى
}

/* ============================ الأنماط ============================ */
/* الأحجام النصّية في CSS أعلاه — هنا التخطيط والألوان فقط. */

const FONT = "Cairo, system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif";

const S = {
  page: {
    minHeight: "100vh", background: "#eef4fb", fontFamily: FONT, color: "#0f2740",
    padding: "18px 14px 40px",
    /* clip لا hidden: «hidden» بيحوّل الصندوق لحاوية تمرير فبيموت كل
       position:sticky جوّاته — ورصيف الحفظ كان بيضل تحت آخر الصفحة بدل ما
       ينلزق بأسفل الشاشة. «clip» بيقصّ الزيادة الأفقية بلا حاوية تمرير. */
    overflowX: "clip",
  },
  wrap: { maxWidth: "min(1100px, 100%)", margin: "0 auto" },
  wrapWide: { maxWidth: "100%" },   // شبكة القطع تملأ الصفحة
  header: { display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 10, marginBottom: 14 },
  headerRight: { display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" },
  title: { fontWeight: 900 },
  langBtn: { background: "#fff", border: "1px solid #cfe0f0", color: "#1f6fd0", fontSize: 18 },
  /* زرّ اللغة على الجوال — أيقونة بمربّع لمس كامل، بلا كلمة تضيّق الترويسة */
  langIcon: {
    width: 42, height: 42, borderRadius: 999, flex: "0 0 auto",
    border: "1px solid #cfe0f0", background: "#fff", color: "#1f6fd0",
    display: "grid", placeItems: "center", cursor: "pointer",
    fontFamily: FONT, lineHeight: 1, padding: 0,
  },
  /* شريط استئناف المسوّدة */
  draftBar: {
    display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap",
    background: "#fff7ed", border: "2px solid #fcd9a4", color: "#8a5a12",
    borderRadius: 14, padding: "10px 12px", marginBottom: 12, fontWeight: 800,
  },
  draftGo: {
    border: "none", background: "#b45309", color: "#fff", borderRadius: 10,
    padding: "8px 16px", fontFamily: FONT, fontWeight: 900, cursor: "pointer",
    flex: "0 0 auto",
  },
  emp: { display: "flex", alignItems: "center", gap: 8, fontWeight: 800 },
  chgSm: { padding: "4px 10px", borderRadius: 8 },
  countChipSm: { padding: "3px 10px", marginInlineStart: 0 },
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
    background: "transparent", border: "2px solid #2f5877", borderRadius: 12,
    padding: "10px 12px", fontWeight: 800, color: "#22415c", textAlign: "center", marginBottom: 12,
  },
  crumbs: { display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 14 },
  crumb: {
    background: "transparent", color: "#14507f", borderRadius: 999, padding: "7px 16px",
    fontWeight: 800, border: "2px solid #2f5877",
  },
  q: { fontWeight: 900, margin: "8px 0 10px", textAlign: "center" },

  // كروت كبيرة — الرسمة تملأ عرض الكرت
  grid: { display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(min(240px,100%),1fr))", gap: 18 },
  art: {
    width: "100%", maxWidth: "min(260px, 62vw)", aspectRatio: "1 / 1", margin: "0 auto",
    display: "block", borderRadius: 20, background: "#f5f9fd", padding: 6, boxSizing: "border-box",
  },
  tile: {
    background: "transparent", borderWidth: 3, borderStyle: "solid", borderColor: "#2f5877", borderRadius: 26,
    padding: "16px 14px 22px", display: "flex", flexDirection: "column",
    alignItems: "center", gap: 12, cursor: "pointer", fontFamily: FONT, color: "#0f2740",
  },
  cutCard: {
    position: "relative",
    background: "transparent", borderWidth: 3, borderStyle: "solid", borderColor: "#2f5877", borderRadius: 26,
    padding: "14px 16px 18px", display: "flex", flexDirection: "column",
    alignItems: "center", gap: 8, fontFamily: FONT, color: "#0f2740",
  },
  cutCardOn: { borderWidth: 3, borderStyle: "solid", borderColor: "#0d4c94", background: "transparent" },
  target: { fontWeight: 800, color: "#0f766e" },

  /* ── الوضع المضغوط: سطر لكل منتج (صورة · اسم · وزن) ── */
  cutRow: {
    display: "flex", alignItems: "center", gap: 10,
    background: "transparent", borderWidth: 2, borderStyle: "solid", borderColor: "#2f5877", borderRadius: 14,
    padding: "6px 10px", fontFamily: FONT, color: "#0f2740",
    transition: "transform .22s cubic-bezier(.34,1.4,.5,1), box-shadow .2s ease, background .2s ease",
  },
  cutRowOn: { borderColor: "#0d4c94", background: "transparent" },
  rowArt: {
    position: "relative",
    width: 44, height: 44, flex: "0 0 44px", borderRadius: 10, overflow: "hidden",
    display: "block", background: "#f5f9fd",
  },
  /* السطر الواقف عنده بيرتفع شوي: تكبير ٢٪ + ظلّ. transform ما بياخد
     مساحة بالتخطيط، فما بيزحّط ولا سطر ولا بيغيّر ارتفاع الشبكة — بس
     بيبيّن إنه هو المستهدف. (الصورة ما عاد تنبثق: كانت بتغطّي الاسم.) */
  rowLift: {
    transform: "scale(1.045)", zIndex: 6, position: "relative",
    willChange: "transform",
  },
  /* flex-basis صغير عن قصد: بلاه الاسم الطويل بيطلب عرضه الطبيعي (~٣٠٠px)
     فبينزل مربّع الوزن لسطر تاني ويصير السطر ١٦٨px بدل ٦٤ — تقليص الفليكس
     ما بيشتغل إلا بعد ما يفشل اللفّ، فمنمنعه يطلب عرضاً كبيراً من الأساس. */
  rowBody: { flex: "1 1 40px", minWidth: 0, display: "flex", flexDirection: "column", gap: 1 },
  rowName: {
    fontWeight: 900, textAlign: "start",
    display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical",
    overflow: "hidden", wordBreak: "break-word",
  },
  /* علامة «تمّ» بزاوية الصورة — بلا عرض من السطر، وبنفس المحل بكل سطر */
  /* علامة «تمّ» بزاوية الصورة — بلا عرض من السطر، وبنفس المحل بكل سطر.
     حجم الحرف من كلاس .bt-tick بالـCSS فوق: `#root .bt *` بيدهس أي inline. */
  rowTick: {
    position: "absolute", insetInlineEnd: 0, insetBlockEnd: 0,
    width: 22, height: 22, borderRadius: "50%", border: "2px solid #fff",
    background: "#047857", color: "#fff", display: "grid", placeItems: "center",
    fontWeight: 900, lineHeight: 1, boxSizing: "border-box",
  },
  rowInput: { flex: "0 0 96px", width: 96, padding: "8px 4px", borderRadius: 10, marginTop: 0 },
  /* التاريخ بده عرض أكبر من الرقم — نفس الارتفاع بالضبط */
  rowInputWide: { flex: "0 0 150px", width: 150, padding: "8px 4px", borderRadius: 10, marginTop: 0 },
  /* خانات المادة الخام بالوضع المضغوط: نفس سطر المنتج — اسم عاليسار وخانة
     ٩٦px عاليمين، فالجزار بيلاقي كل الخانات بنفس المكان وبنفس الحجم. */
  rawFieldSm: {
    transition: "transform .22s cubic-bezier(.34,1.4,.5,1), box-shadow .2s ease, background .2s ease",
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    gap: 10, maxWidth: "100%", flexWrap: "wrap",
    background: "transparent", borderWidth: 2, borderStyle: "solid", borderColor: "#2f5877",
    borderRadius: 14, padding: "6px 10px",
  },
  rawHeadSm: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 8 },
  /* سطر المادة الخام: ضِعف ارتفاع سطر المنتج (٦٤ → ١٢٨) بصورة وخانة أكبر */
  rawMainSm: { minHeight: 128, padding: "10px 12px", borderWidth: 3 },
  rawArtBig: { width: 60, height: 60, flex: "0 0 60px", borderRadius: 12 },
  rawInputBig: { flex: "0 0 96px", width: 96, padding: "16px 4px", borderRadius: 12 },
  /* اسم المادة الخام إله ٣ أسطر: السطر بضِعف الارتفاع فالمكان موجود، وبلاها
     كان الاسم الطويل ينقصّ لكلمة وحدة («AUS…»). */
  rawNameSm: { WebkitLineClamp: 4 },
  /* الخانة اللي واقف عندها الجزار — السطر كله بينصبغ لحتى يخلّص منها */
  /* borderColor لا border المختصرة: مزج الشكلين بيخلّي React لما يشيل الطويلة
     بين رسمتين يمسح لون الحدّ كلياً فيطلع الإطار بلا لون. كل حالات السطر
     (tone / محدَّد / موقوف عنده) بتستعمل borderColor وبس. */
  rowFocus: {
    borderColor: "#b45309", borderWidth: 3,
    /* تظليل فعلي: تدرّج كهرماني شبه صلب — باقي السطور شفافة، فهالسطر
       بيقرأ لحاله من بعيد وما بيضل الجزار يدوّر وين واقف. */
    background: "linear-gradient(180deg, #fdf0cf 0%, #f9dfa4 100%)",
    boxShadow: [
      "0 0 0 5px rgba(224,166,62,.38)",
      "0 14px 30px rgba(15,39,64,.28)",
      "inset 0 1px 0 rgba(255,255,255,.85)",
    ].join(", "),
  },
  /* الرفض: حدّ أحمر سميك بلا أي رسالة — الجزار بيفهم من اللون إنه الرقم
     أكبر من المتاح، وبيكمّل بلا ما ينقطع عليه سياق الإدخال. */
  inputReject: {
    borderColor: "#dc2626", borderWidth: 3, background: "#fff",
    boxShadow: "0 0 0 4px rgba(220,38,38,.22)",
  },
  inputFocus: {
    borderColor: "#b45309", borderWidth: 3, background: "#fff",
    boxShadow: "0 2px 6px rgba(15,39,64,.14)",
  },
  /* flexBasis/flexGrow لا المختصرة «flex»: الأساس partialBox عليه flexShrink،
     ولمّا يبدّل الجزار للكروت الكبيرة React بيشيل المختصرة والطويلة باقية —
     بيطلع تحذير «mixing shorthand» وبيصير سلوك الحدّ غير مضمون. */
  partialBoxSm: { width: 20, height: 20, borderRadius: 6, flexBasis: 20, flexGrow: 0 },
  /* سطر العدد: بلا لفّ — شارة «جزء» لازم تضل جنب الخانة، والاسم بيتقلّص */
  pieceRowSm: { flexWrap: "nowrap" },
  /* محل الصورة بسطر ما إله صنف (عدد القطع، تاريخ الانتهاء) — أيقونة بنفس
     المربّع، فالسطور بتضل مصطفّة على نفس الشبكة البصرية. */
  rowArtIcon: { display: "grid", placeItems: "center", background: "#f1f6fb" },
  /* width:auto مقصود: S.partialBtn عليه width:100% وهو اللي كان بينزّل الشارة
     لسطر لحالها تحت خانة العدد بدل ما تضل جنبها. */
  partialBtnSm: {
    padding: "6px 10px", borderRadius: 10, alignItems: "center", gap: 6,
    width: "auto", flex: "0 0 auto", whiteSpace: "nowrap",
  },
  targetSm: { fontWeight: 800, color: "#0f766e", lineHeight: 1.1 },
  /* الذيل المشترك بعنوان القسم — أهدأ وأصغر من العنوان، هو سياق لا عنوان */
  tailNote: { color: "#6b8299", fontWeight: 800 },
  /* عنوان القسم بالمضغوط بياخد الفاضي وبينقصّ بثلاث نقط بدل ما يلفّ لسطر
     تاني — كل سطر فوق الشبكة بيدفع منتجاً تحت حافة الشاشة. */
  /* flex-basis صفر مقصود: مع «auto» الفليكس بيقرّر اللفّ على عرض المحتوى
     الطبيعي فبتنزل الأزرار لسطر تاني قبل ما يتقلّص العنوان أصلاً. */
  sectionTitleSm: {
    fontWeight: 900, flex: "1 1 0%", minWidth: 0,
    overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
  },
  /* سطر المادة الخام المطويّ — بديل كرت كامل بيعادل ثلث شاشة الموبايل */
  rawLine: {
    display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap",
    background: "transparent", border: "2px solid #2f5877", borderRadius: 14,
    padding: "8px 12px", marginBottom: 10, fontWeight: 800, color: "#22415c",
  },
  rawLineArt: { width: 34, height: 34, flex: "0 0 34px", borderRadius: 8 },
  rawLineName: {
    color: "#0f2740", fontWeight: 900, minWidth: 0,
    overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: "45%",
  },
  rawCard: {
    background: "transparent", borderWidth: 2, borderStyle: "solid", borderColor: "#2f5877", borderRadius: 18,
    padding: "14px 16px", marginBottom: 16, display: "flex",
    flexDirection: "column", gap: 10,
  },
  rawCardSm: {
    padding: "8px 10px", marginBottom: 10, gap: 6, borderRadius: 14,
    background: "transparent", borderColor: "#7b98b3",
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
  /* صورة خيار النوع/المنشأ/الفئة — كبيرة عن قصد: هي بديل القراءة لا زينة
     جنبها، فلازم تبيّن من مسافة الميزان. */
  tileImg: {
    width: "100%", maxWidth: 240, aspectRatio: "4 / 3", objectFit: "cover",
    borderRadius: 18, display: "block", background: "#f2f7fc",
  },
  /* الهدر والعظم — صفّ منفصل بلون مختلف عن شبكة المنتجات */
  wasteRow: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit,minmax(min(240px,100%),1fr))",
    gap: 18,
    marginBottom: 4,
  },
  wasteTone: { background: "transparent", borderColor: "#a97e2a" },
  emptyBox: {
    gridColumn: "1 / -1", background: "transparent", border: "2px dashed #2f5877",
    borderRadius: 20, padding: "26px 18px", textAlign: "center",
    fontWeight: 800, color: "#6b8299",
  },
  name: { fontWeight: 900 },
  // الاسم بالّلغة الأخرى — أصغر وأهدأ، تحت الاسم الأساسي مباشرة
  altName: { color: "#6b8299", fontWeight: 700, textAlign: "center", lineHeight: 1.4 },
  field: { width: "100%", display: "flex", flexDirection: "column", gap: 4, marginTop: 4 },
  lbl: { fontWeight: 800, color: "#6b8299" },
  cutInput: {
    width: "100%", boxSizing: "border-box", borderWidth: 2, borderStyle: "solid", borderColor: "#cfe0f0", borderRadius: 12,
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
    background: "transparent", border: "1px solid #dbe6f2", borderRadius: 22,
    padding: 24, display: "flex", flexDirection: "column", gap: 14,
  },
  input: {
    width: "100%", boxSizing: "border-box", borderWidth: 2, borderStyle: "solid", borderColor: "#cfe0f0", borderRadius: 16,
    padding: "18px 14px", fontWeight: 900, textAlign: "center", fontFamily: FONT,
    color: "#0f2740", outline: "none",
  },
  select: {
    width: "100%", boxSizing: "border-box", borderWidth: 2, borderStyle: "solid", borderColor: "#cfe0f0", borderRadius: 16,
    padding: "16px 14px", fontWeight: 800, textAlign: "center", fontFamily: FONT,
    color: "#0f2740", outline: "none", background: "#fff",
  },
  primary: {
    border: "none", background: "#1f6fd0", color: "#fff", borderRadius: 16,
    padding: "18px 14px", fontWeight: 900, fontFamily: FONT, cursor: "pointer", width: "100%",
  },
  /* الرصيف بالوضع المضغوط: كل بكسل بياخده الرصيف بيخفي سطر منتج من فوقه */
  saveDockSm: {
    marginTop: 8, padding: "8px 10px", gap: 10,
    flexDirection: "row", alignItems: "center",
    /* خلفية صلبة: التدرّج الشفاف كان يخلّي أرقام الرصيف تنقرأ فوق صور
       السطور اللي بتمرق من تحته. */
    background: "#eef4fb", borderTop: "2px solid #dbe6f2",
    marginInline: -14, paddingInline: 14,
    boxShadow: "0 -8px 20px rgba(15,39,64,.10)",
  },
  /* سطر أرقام الرصيف بالمضغوط: سطر واحد ما بيلفّ — الحلقة آخدة عرض */
  dockLineSm: { flexWrap: "nowrap", gap: 10, justifyContent: "space-between" },
  primarySm: { padding: "12px 10px", borderRadius: 12 },
  /* حلقة الوزن جوّا الرصيف: معتمة بالكامل — كانت طايفة نص شفافة فوق
     صور السطور، والجزار ما عاد يقراها. الرصيف ملزوق فهي بتلحقه. */
  floatRing: { flex: "0 0 auto", display: "block", lineHeight: 0 },
  dockBody: { flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 6 },
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
    background: "transparent", border: "2px solid #2f5877", borderRadius: 18,
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
  /* كان مستعملاً بالـJSX وغير معرَّف هون إطلاقاً — يعني الوضع المضغوط كان
     ياخد هوامش الكشك: ٢٤px ضايعة فوق كل قسم بشاشة الجوال. */
  sectionBarSm: { margin: "10px 2px 6px", gap: 8 },
  countChip: {
    marginInlineStart: "auto", background: "transparent", border: "2px solid #2f5877",
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
    borderWidth: 2, borderStyle: "solid", borderColor: "#cfe0f0",
    background: "#fff", color: "#3c5a75",
    borderRadius: 14, padding: "11px 13px", fontFamily: FONT, fontWeight: 800,
    cursor: "pointer", textAlign: "start",
  },
  partialBtnOn: { borderColor: "#b45309", background: "#fffaf1", color: "#8a5a12" },
  partialBox: {
    width: 26, height: 26, borderRadius: 9, flexShrink: 0,
    borderWidth: 2, borderStyle: "solid", borderColor: "#cfe0f0",
    background: "#fff", color: "#fff",
    display: "grid", placeItems: "center", fontWeight: 900,
  },
  partialBoxOn: { borderColor: "#b45309", background: "#b45309" },
  partialHint: { display: "block", fontWeight: 700, color: "#8aa3b8", marginTop: 3 },
  /* «في شي ناقص»: مش رمادي مقفول — لونه بيقول «انتبه» وهو لسا بينضغط،
     والضغطة بتوصّل الجزار للخانة الناقصة بدل ما يقعد يحزّر ليش الزرّ ميّت. */
  primaryNeeds: { background: "#e0a63e", boxShadow: "0 8px 18px rgba(224,166,62,.30)" },
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
