// src/pages/butcher/butcherOptions.js
// خيارات وحدة الجزار — الافتراضيات فقط. القيم الفعلية تأتي من butcherConfig
// (لوحة الإعدادات) والتي تبدأ من هذه الافتراضيات ثم تُحفظ على السيرفر.
//
// ⚠️ نموذج الأكواد: الكود في قائمة المرتجعات مفتاحه (النوع × المنشأ × القطعة)
// وليس المنشأ وحده — عائلة الخروف الأسترالي 200xx، الإفريقي 220xx، العجل
// الأسترالي 11xxx، الجمل المحلي 2014x … لذلك مفتاح الكود هنا "animalId:originId".

import { INSPECTION_BRANCHES } from "../inspection/inspectionBranches";

export const TYPE = "butcher_cut_log";

/* ══════════ رقم العملية المرجعي ══════════
   السيرفر بيخصّص رقم فريد لكل فرع («QCS — 00009») ويحفظه بـpayload.refNo.
   العرض بكل الشاشات والتصديرات بيزيد عليه بادئة **INV-** وبيقصّر الشرطة الطويلة
   لشرطة عادية بلا مسافات، فيصير «INV-QCS-00009». كله بالعرض فقط — العدّاد
   وKEEP_REF بالسيرفر ما بينمسّوا، والسجلات القديمة بتظهر بنفس الشكل الجديد
   بلا أي ترحيل. */

export const OP_PREFIX = "INV-";

/** رقم العملية بشكله المعروض — "" إذا السجل بلا رقم بعد. */
export const opNoLabel = (refNo) => {
  const s = String(refNo || "").trim();
  if (!s) return "";
  // «QCS — 00010» → «QCS-00010» (شرطة طويلة أو قصيرة مع مسافاتها → شرطة واحدة)
  const flat = s.replace(/\s*[—–-]\s*/g, "-");
  return flat.startsWith(OP_PREFIX) ? flat : `${OP_PREFIX}${flat}`;
};

/* الملاحم/الفروع — من سجل الفروع الموحّد (لا نكرّر قائمة ثانية). */
export const BRANCHES = INSPECTION_BRANCHES.map((b) => ({
  code: b.code,
  ar: b.labelAr,
  en: b.labelEn,
  icon: b.icon,
}));

/* سجلّ المناشئ — مشترك، وكل نوع يختار منه ما يناسبه.
   فارغ عمداً: تُبنى القائمة بالكامل من لوحة الإعدادات (تبويب المناشئ). */
export const ORIGIN_LIST = [];

// الذبائح / المواد الخام — جذر الشجرة.
// min/max = المدى المعقول لوزن الذبيحة قبل التقطيع (كجم).
// origins = المناشئ المتاحة لهذا النوع.
// فارغ عمداً: تُبنى من لوحة الإعدادات (تبويب الذبائح).
export const ANIMALS = [];

/* ── الأكواد الافتراضية: "animalId:originId" → كود الصنف ──
   مأخوذة من public/data/items.json، ولم يُوضَع إلا ما تم التحقق منه فعلياً.
   الباقي يُملأ من لوحة الإعدادات (تبويب القطع/الأجزاء). */

// رسمة كل قطعة في ButcherIcons.jsx (مفتاحها نفس الـ id).
// kind: "product" منتج أساسي · "waste" هدر · "bone" عظم.
//   الهدر والعظم خانتان اثنتان فقط لكل ذبيحة — لا خانة هدر داخل كل منتج.
// weightOnly: مرادف قديم لـ kind ≠ product (يبقى للتوافق مع السجلات المحفوظة).
// refs: النسبة المرجعية من وزن الذبيحة لكل نوع.
// فارغ عمداً: تُبنى القطع بالكامل من لوحة الإعدادات (تبويب القطع والنِّسب).
// كل قطعة تُصنَّف kind = product | waste | bone — والهدر والعظم بيطلعوا
// خانتين منفصلتين في شاشة الإدخال، لا خانة هدر داخل كل منتج.
export const CUTS = [];

/* الأجزاء المفردة — كروت ما بعد اختيار المنشأ/الدرجة.
   عنصر واحد بـ whole:true = كرت "الذبيحة الكاملة" في الأعلى، والباقي أجزاء مفردة.
   فارغ عمداً: تُبنى من لوحة الإعدادات (تبويب الأجزاء). */
export const SHEEP_PIECES = [];

/* درجات اللحم بعد المنشأ — خطوة إضافية تظهر عند وجود درجات لـ(نوع × منشأ).
   فارغ عمداً: تُبنى من لوحة الإعدادات (تبويب الدرجات). */
export const GRADES = [];

/* ── تصنيف العنصر: منتج أساسي / هدر / عظم ──
   الفصل مقصود: شاشة الإدخال بتعرض المنتجات في شبكة، والهدر والعظم بخانتين
   منفصلتين تحتها — ولا خانة هدر داخل أي منتج. */
export const ITEM_KINDS = [
  { id: "product", ar: "منتج أساسي", en: "Main product" },
  { id: "waste",   ar: "هدر",        en: "Waste" },
  { id: "bone",    ar: "عظم",        en: "Bone" },
];

/** كروت المجاميع الافتراضية — تبقى للتوافق مع السجلات القديمة. */
export const SPECIAL_CUT_IDS = ["waste_total", "bone_total"];

/** تصنيف عنصر: من حقل kind، وإلا من weightOnly/الـ id للسجلات القديمة. */
export function itemKind(item) {
  if (typeof item === "string") {
    if (item === "waste_total") return "waste";
    if (item === "bone_total") return "bone";
    return "product";
  }
  const k = item?.kind;
  if (k === "waste" || k === "bone" || k === "product") return k;
  if (item?.weightOnly) return item?.id === "bone_total" ? "bone" : "waste";
  return itemKind(String(item?.id || ""));
}

export const isProductItem = (item) => itemKind(item) === "product";

/** هل العنصر خانة مجموع (هدر أو عظم) لا منتجاً؟ — يقبل id أو الكائن. */
export const isSpecialCut = (item) => itemKind(item) !== "product";

/** اسم عنصر حسب اللغة الحالية. */
/* الاسم حسب اللغة مع رجوع للّغة الأخرى — بلا هذا الرجوع يظهر الصنف فارغاً
   بالواجهة العربية إذا كان مسجّلاً بالإنجليزي فقط (وأغلب أصناف المنتجات كذلك). */
export const nameOf = (item, isAr) =>
  (isAr ? item?.ar : item?.en) || item?.ar || item?.en || "";

/** الاسم بالّلغة الأخرى — للعرض ثنائي اللغة تحت الاسم الأساسي (أو "" لو مكرّر). */
export const altNameOf = (item, isAr) => {
  const main = nameOf(item, isAr);
  const alt = (isAr ? item?.en : item?.ar) || "";
  return alt && alt !== main ? alt : "";
};

/** استخراج كود الملحمة من نص فرع الموظف في سجل الموظفين المشترك. */
export function branchCodeFromLabel(label) {
  if (!label) return "";
  const norm = String(label).toUpperCase().replace(/\s+/g, "");
  const hit = BRANCHES.find(
    (b) => norm.includes(String(b.code).toUpperCase().replace(/\s+/g, ""))
  );
  return hit ? hit.code : "";
}

/** مفتاح الكود الموحّد — مع الدرجة إن وُجدت. */
export const codeKey = (animalId, originId, gradeId) =>
  gradeId
    ? `${animalId || ""}:${originId || ""}:${gradeId}`
    : `${animalId || ""}:${originId || ""}`;
