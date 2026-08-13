// src/pages/butcher/butcherOptions.js
// خيارات وحدة الجزار — الافتراضيات فقط. القيم الفعلية تأتي من butcherConfig
// (لوحة الإعدادات) والتي تبدأ من هذه الافتراضيات ثم تُحفظ على السيرفر.
//
// ⚠️ نموذج الأكواد: الكود في قائمة المرتجعات مفتاحه (النوع × المنشأ × القطعة)
// وليس المنشأ وحده — عائلة الخروف الأسترالي 200xx، الإفريقي 220xx، العجل
// الأسترالي 11xxx، الجمل المحلي 2014x … لذلك مفتاح الكود هنا "animalId:originId".

import { INSPECTION_BRANCHES } from "../inspection/inspectionBranches";

export const TYPE = "butcher_cut_log";

/* الملاحم/الفروع — من سجل الفروع الموحّد (لا نكرّر قائمة ثانية). */
export const BRANCHES = INSPECTION_BRANCHES.map((b) => ({
  code: b.code,
  ar: b.labelAr,
  en: b.labelEn,
  icon: b.icon,
}));

/* سجلّ المناشئ — مشترك، وكل نوع يختار منه ما يناسبه. */
export const ORIGIN_LIST = [
  { id: "australian", ar: "أسترالي",  en: "Australian" },
  { id: "african",    ar: "أفريقي",   en: "African (S.A)" },
  { id: "indian",     ar: "هندي",     en: "Indian" },
  { id: "pakistani",  ar: "باكستاني", en: "Pakistani" },
  { id: "brazilian",  ar: "برازيلي",  en: "Brazilian" },
  { id: "newzealand", ar: "نيوزيلندي", en: "New Zealand" },
  { id: "dutch",      ar: "هولندي",   en: "Dutch" },
  { id: "local",      ar: "محلي",     en: "Local" },
];

// min/max = المدى المعقول لوزن الذبيحة قبل التقطيع (كجم).
// origins = المناشئ المتاحة لهذا النوع (تُعدَّل من لوحة الإعدادات).
export const ANIMALS = [
  { id: "sheep",  ar: "خروف",   en: "Sheep",  min: 10, max: 80,
    origins: ["australian", "african"] },
  { id: "veal",   ar: "عجل",    en: "Veal",   min: 40, max: 400,
    origins: ["australian", "indian", "dutch", "local"] },
  { id: "vacuum", ar: "فايكوم", en: "Vacuum", min: 1,  max: 120,
    origins: ["australian", "african"] },
  { id: "camel",  ar: "جمل",    en: "Camel",  min: 80, max: 700,
    origins: ["local"] },
];

/* ── الأكواد الافتراضية: "animalId:originId" → كود الصنف ──
   مأخوذة من public/data/items.json، ولم يُوضَع إلا ما تم التحقق منه فعلياً.
   الباقي يُملأ من لوحة الإعدادات (تبويب القطع/الأجزاء). */

// رسمة كل قطعة في ButcherIcons.jsx (مفتاحها نفس الـ id).
// weightOnly: كرت مجموع (هدر/عضم) — خانة وزن واحدة، ولا يُحسب ضمن القطع.
// refs: النسبة المرجعية من وزن الذبيحة لكل نوع.
export const CUTS = [
  { id: "shoulders", ar: "كتفين", en: "Shoulders",
    codes: { "sheep:australian": "20035", "sheep:african": "22035" },
    refs:  { sheep: { min: 19, max: 23 } } },
  { id: "legs", ar: "فخذين", en: "Legs",
    codes: { "sheep:australian": "20015", "sheep:african": "22015", "veal:indian": "20100" },
    refs:  { sheep: { min: 30, max: 34 } } },
  { id: "back", ar: "ظهر", en: "Back",
    codes: { "sheep:australian": "20052", "sheep:african": "22052" },
    refs:  { sheep: { min: 9, max: 12 } } },
  { id: "neck", ar: "رقبة", en: "Neck",
    codes: { "sheep:australian": "20040", "sheep:african": "22040" },
    refs:  { sheep: { min: 5, max: 8 } } },
  { id: "ribs", ar: "أضلاع", en: "Ribs",
    codes: { "sheep:australian": "20025", "sheep:african": "22025" },
    refs:  { sheep: { min: 7, max: 10 } } },
  { id: "head", ar: "راس", en: "Head",
    codes: { "sheep:australian": "10250" },
    refs:  {} },
  { id: "liver", ar: "كبدة", en: "Liver",
    codes: { "sheep:australian": "10210KG", "veal:australian": "11290", "camel:local": "20141" },
    refs:  {} },
  { id: "shanks", ar: "موزات", en: "Shanks",
    codes: { "sheep:australian": "20042", "sheep:african": "22042" },
    refs:  { sheep: { min: 3, max: 5 } } },
  { id: "waste_total", ar: "الهدر الكامل", en: "Total Waste", weightOnly: true,
    codes: { "sheep:australian": "20009", "sheep:african": "22009",
             "veal:australian": "11302", "camel:local": "20144" },
    refs:  { sheep: { min: 1, max: 4 } } },
  { id: "bone_total", ar: "العضم الكامل", en: "Total Bone", weightOnly: true,
    codes: { "sheep:australian": "20053", "sheep:african": "22053",
             "veal:australian": "11301", "camel:local": "20143" },
    refs:  { sheep: { min: 8, max: 14 } } },
];

/* كروت ما بعد اختيار المنشأ للخروف: خروف كامل + 6 قطع أساسية. */
export const SHEEP_PIECES = [
  { id: "whole", ar: "خروف كامل", en: "Whole Carcass", art: "sheep", whole: true,
    codes: {
      "sheep:australian": "20000",
      "sheep:australian:lamb": "20000",
      "sheep:australian:hogget": "34348",
      "sheep:australian:mutton": "21000",
      "sheep:african": "22000",
      "sheep:african:lamb": "22000",
      "sheep:african:mutton": "22100",
      "camel:local": "20140",
    },
    refs: {} },
  { id: "leg", ar: "فخذ", en: "Leg", art: "legs",
    codes: { "sheep:australian": "20015", "sheep:african": "22015" },
    refs: { sheep: { min: 15, max: 17 } } },
  { id: "shoulder", ar: "كتف", en: "Shoulder", art: "shoulders",
    codes: { "sheep:australian": "20035", "sheep:african": "22035" },
    refs: { sheep: { min: 9, max: 12 } } },
  { id: "back", ar: "ظهر", en: "Shortloin", art: "back",
    codes: { "sheep:australian": "20052", "sheep:african": "22052" },
    refs: { sheep: { min: 9, max: 12 } } },
  { id: "cage", ar: "قفص", en: "Rack Saddle", art: "ribs",
    codes: { "sheep:australian": "20025", "sheep:african": "22025" },
    refs: { sheep: { min: 7, max: 10 } } },
  { id: "flank", ar: "خاصرة", en: "Flank", art: "flank",
    codes: { "sheep:australian": "20045", "sheep:african": "22045" },
    refs: { sheep: { min: 7, max: 10 } } },
  { id: "neck", ar: "رقبة", en: "Neck", art: "neck",
    codes: { "sheep:australian": "20040", "sheep:african": "22040" },
    refs: { sheep: { min: 5, max: 8 } } },
];

/* درجات اللحم بعد المنشأ — تظهر كخطوة إضافية عند وجودها لـ(نوع × منشأ).
   الأسترالي: lamb أقل من سنة · hogget سنة–سنتين · mutton أكبر.
   لكل درجة كودها الخاص في قائمة المرتجعات (20000 / 34348 / 21000). */
export const GRADES = [
  { id: "lamb",   ar: "لامب",  en: "Lamb",   animal: "sheep", origin: "australian" },
  { id: "hogget", ar: "هوغيت", en: "Hogget", animal: "sheep", origin: "australian" },
  { id: "mutton", ar: "موتون", en: "Mutton", animal: "sheep", origin: "australian" },
];

/** كروت المجاميع — وزنها يُحتسب هدراً/عظماً لا قطعاً. */
export const SPECIAL_CUT_IDS = ["waste_total", "bone_total"];
export const isSpecialCut = (id) => SPECIAL_CUT_IDS.includes(id);

/** اسم عنصر حسب اللغة الحالية. */
export const nameOf = (item, isAr) => (isAr ? item?.ar : item?.en) || item?.ar || "";

/** مفتاح الكود الموحّد — مع الدرجة إن وُجدت. */
export const codeKey = (animalId, originId, gradeId) =>
  gradeId
    ? `${animalId || ""}:${originId || ""}:${gradeId}`
    : `${animalId || ""}:${originId || ""}`;
