// src/pages/training/TrainingSessionCreate.jsx
import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { FiArrowLeft, FiBookOpen, FiSave } from "react-icons/fi";
import logo from "../../assets/almawashi-logo.jpg";
import TrainingReferenceModal, { MODULE_DETAILS_BI } from './TrainingReferenceModal';

/* ===================== API base ===================== */
const API_ROOT_DEFAULT = "https://inspection-server-4nvj.onrender.com";
const API_BASE = String(
  (typeof window !== "undefined" && window.__QCS_API__) ||
    (typeof import.meta !== "undefined" && import.meta.env?.VITE_API_URL) ||
    (typeof process !== "undefined" && process.env?.REACT_APP_API_URL) ||
    API_ROOT_DEFAULT
).replace(/\/$/, "");

const REPORTS_URL = `${API_BASE}/api/reports`;
const TYPE = "training_session";

/* ===================== Helpers ===================== */
function pad2(n) { return String(n ?? "").padStart(2, "0"); }
function todayISO() {
  const d = new Date();
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}
async function safeJson(res) {
  const text = await res.text();
  try { return text ? JSON.parse(text) : null; } catch { return text || null; }
}
async function listReportsByType(type) {
  const res = await fetch(`${REPORTS_URL}?type=${encodeURIComponent(type)}`, {
    method: "GET", headers: { Accept: "application/json" },
  });
  if (!res.ok) { const d = await safeJson(res); throw new Error(d?.message || d?.error || `Failed (${res.status})`); }
  const data = await safeJson(res);
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.items)) return data.items;
  if (Array.isArray(data?.data)) return data.data;
  return [];
}
async function createReport(body) {
  const res = await fetch(REPORTS_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) { const d = await safeJson(res); throw new Error(d?.message || d?.error || `Failed (${res.status})`); }
  return await safeJson(res);
}

/* ===================== الخارق 1 Design Tokens ===================== */
const C = {
  navy:      "#0f172a",
  navyLight: "#6366f1",
  accent:    "#4f46e5",
  accentBg:  "#eef2ff",
  teal:      "#0d9488",
  tealBg:    "#f0fdfa",
  purple:    "#7c3aed",
  purpleBg:  "#f5f3ff",
  red:       "#dc2626",
  green:     "#16a34a",
  gray50:    "#f6f7fb",
  gray100:   "#f1f2f6",
  gray200:   "#e5e7eb",
  gray400:   "#9ca3af",
  gray700:   "#334155",
  white:     "#ffffff",
  border:    "#eceef3",
};

const pageShell = {
  minHeight: "100vh",
  width: "100%",
  background: "linear-gradient(180deg,#f4f8f7 0%,#edf5f3 100%)",
  padding: "14px clamp(12px,2.4vw,28px) 22px",
  boxSizing: "border-box",
  fontFamily: "Cairo, Arial, sans-serif",
  color: "#0f172a",
  direction: "ltr",
};

const glassPanel = {
  background: "#fff",
  border: "1px solid #dbe4e2",
  borderRadius: 6,
  boxShadow: "0 12px 30px rgba(15,23,42,.06)",
};

const actionBtn = (bg, disabled = false) => ({
  background: disabled ? C.gray200 : bg,
  color: disabled ? C.gray400 : C.white,
  border: "none", borderRadius: 5, padding: "9px 12px",
  fontWeight: 900, fontSize: 13, letterSpacing: 0,
  cursor: disabled ? "not-allowed" : "pointer",
  whiteSpace: "nowrap",
  boxShadow: disabled ? "none" : "0 10px 20px rgba(15,23,42,.14)",
  transition: "transform .12s ease, filter .12s ease",
  display: "inline-flex",
  alignItems: "center",
  gap: 8,
});

const inputSt = {
  width: "100%", boxSizing: "border-box",
  border: `1px solid #dbe4e2`, borderRadius: 6,
  padding: "10px 14px", fontSize: 14, color: C.gray700,
  background: C.white, outline: "none",
  fontFamily: "inherit",
  boxShadow: "0 1px 2px rgba(16,24,40,.03)",
  transition: "border-color .12s ease, box-shadow .12s ease",
};

const textareaSt = {
  ...inputSt,
  resize: "vertical", lineHeight: 1.6,
  minHeight: 200,
};

/* ===================== Defaults ===================== */
const DEFAULT_DOC = {
  documentTitle: "Training Record",
  documentNumber: "FS-QM/REC/TR/1",
  issueDate: "05/02/2020",
  revisionNo: "0",
  area: "QA",
  issuedBy: "MOHAMAD ABDULLAH",
  controllingOfficer: "QA",
  approvedBy: "Hussam O.Sarhan",
};

const DEFAULT_OBJECTIVES = `Training objectives: Ensure staff knowledge and compliance with food safety & hygiene requirements.
Training frequency: Induction (new joiners) + Bi-monthly refresher (every 2 months) + As needed (NCs, complaints/incidents, audit findings, or any change in procedures/requirements).
Evaluation: Quiz/Observation/Verbal Q&A • Passing: ≥80% or Satisfactory.
Training records must be reviewed & approved by QA / Food Safety Team Leader.`;

/* ===================== Modules & Branches ===================== */
export const MODULES = [
  "Personnel Hygiene",
  "GHP / Cleaning & Sanitation",
  "Receiving",
  "Storage",
  "Time & Temperature / CCP",
  "HACCP Basics",
  "Allergen Control",
  "Cross Contamination Control",
  "Chemical Safety (Food + OHS)",
  "Pest Control Awareness",
  "Waste Management",
  "OHS: PPE & Safe Work",
  "OHS: Knife Safety",
  "OHS: Manual Handling",
  "OHS: Fire Safety & Emergency",
  "OHS: First Aid & Incident Reporting",
  "TESTO OIL — Oil Quality Test",
  "Quality System Usage",
];

const BRANCHES = [
  "QCS",
  "PRODUCTION",
  "WARQA KITCHEN",
  "POS 6 - Sharjah Butchery",
  "POS 10 - Abu Dhabi Butchery",
  "POS 11 - Al Ain Butchery",
  "POS 14",
  "POS 15 - Al Barsha Butchery",
  "POS 18",
  "POS 16",
  "POS 38",
  "POS 41",
  "POS 34",
  "POS 35",
  "POS 36",
  "POS 37",
  "POS 43",
  "FTR 1 - MUSHRIF food truck",
  "FTR 2 - Mamzar food truck",
];

/* ===================== Levels (difficulty) ===================== */
// Reuses the per-question "difficulty" field managed in Training Admin
// (labelled "المستوى" there). "" = all levels.
export const LEVELS = [
  { value: "",       en: "All Levels",   ar: "كل المستويات" },
  { value: "Easy",   en: "Easy",         ar: "سهل / مبتدئ" },
  { value: "Medium", en: "Medium",       ar: "متوسط" },
  { value: "Hard",   en: "Hard",         ar: "صعب / متقدم" },
];

/* ===================== Training Details Templates ===================== */
function getDetailsTemplate(moduleName) {
  return MODULE_DETAILS_BI[moduleName] || MODULE_DETAILS_BI.__DEFAULT__;
}

function normalizeReports(data) {
  if (Array.isArray(data)) return data;
  const candidates = [data?.items, data?.reports, data?.data, data?.result, data?.rows];
  for (const c of candidates) if (Array.isArray(c)) return c;
  return [];
}

function uniqueStrings(list) {
  const seen = new Set();
  const out = [];
  for (const item of Array.isArray(list) ? list : []) {
    const value = String(item || "").trim();
    const key = value.toLowerCase();
    if (!value || seen.has(key)) continue;
    seen.add(key);
    out.push(value);
  }
  return out;
}

function questionsToBilingualPack(questions) {
  const arr = Array.isArray(questions) ? questions : [];
  return {
    en: arr.map((q) => ({
      q: q?.q_en || q?.q || "",
      options: Array.isArray(q?.options_en) ? q.options_en : (Array.isArray(q?.options) ? q.options : []),
      correct: Number.isFinite(Number(q?.correct)) ? Number(q.correct) : 0,
      difficulty: q?.difficulty || "",
    })),
    ar: arr.map((q) => ({
      q: q?.q_ar || q?.q || "",
      options: Array.isArray(q?.options_ar) ? q.options_ar : (Array.isArray(q?.options) ? q.options : []),
      correct: Number.isFinite(Number(q?.correct)) ? Number(q.correct) : 0,
      difficulty: q?.difficulty || "",
    })),
  };
}

async function loadAdminTrainingConfig() {
  const [configData, questionsData, refsData] = await Promise.all([
    listReportsByType("training_config").catch(() => []),
    listReportsByType("training_questions").catch(() => []),
    listReportsByType("training_reference").catch(() => []),
  ]);

  const config = normalizeReports(configData)[0]?.payload || {};
  const modules = uniqueStrings([...(config.modules || []), ...MODULES]);

  const questionBank = {};
  normalizeReports(questionsData).forEach((rec) => {
    const mod = String(rec?.payload?.module || "").trim();
    const qs = rec?.payload?.questions;
    if (mod && Array.isArray(qs) && qs.length) questionBank[mod] = questionsToBilingualPack(qs);
  });

  const detailsByModule = {};
  normalizeReports(refsData).forEach((rec) => {
    const payload = rec?.payload || {};
    const mod = String(payload.module || "").trim();
    const content = String(payload.content || "").trim();
    if (mod && content && !detailsByModule[mod]) detailsByModule[mod] = content;
  });

  return { modules: modules.length ? modules : MODULES, questionBank, detailsByModule };
}

/* ===================== Question Bank ===================== */
export const QUESTION_BANK = {
  "Personnel Hygiene": {
    en: [
      { q: "What is the ideal water temperature for effective handwashing?", options: ["Any temperature is fine", "Cold water only (below 15°C)", "Warm water (38–45°C)"], correct: 2 },
      { q: "Why are BLUE plasters used in food production?", options: ["They are cheaper", "Blue is rare in food — easy to detect if it falls off", "Blue kills bacteria"], correct: 1 },
      { q: "How long must a food handler wait after illness symptoms stop before returning to work?", options: ["24 hours", "At least 48 hours + medical clearance", "Only until they feel better"], correct: 1 },
      { q: "Hand sanitizer should be used:", options: ["Instead of handwashing to save time", "After proper handwashing as an additional step", "Only when soap is unavailable"], correct: 1 },
      { q: "After sneezing while handling food, you must:", options: ["Continue working after wiping with glove", "Step away → change mask → full handwash → change gloves", "Just change gloves"], correct: 1 },
      { q: "Gloves must be replaced:", options: ["Only when visibly torn", "Every hour or when torn/task changes — with handwash before wearing", "At the end of the shift only"], correct: 1 },
      { q: "A food handler with diarrhea must:", options: ["Continue working with extra gloves", "Report to supervisor and be excluded for ≥48 hrs after symptoms stop", "Just avoid handling ready-to-eat food"], correct: 1 },
      { q: "Nail polish is NOT allowed for food handlers because:", options: ["It is against fashion rules", "It can flake off into food and harbour bacteria", "It is expensive"], correct: 1 },
      { q: "Personal mobile phones in production areas are:", options: ["Allowed if kept in pocket", "Strictly forbidden — must be kept in lockers outside", "Allowed only for supervisors"], correct: 1 },
      { q: "Before entering the toilet, a food handler must:", options: ["Remove apron and discard gloves", "Keep apron on but wash hands inside", "Take off only gloves"], correct: 0 },
    ],
    ar: [
      { q: "ما هي درجة حرارة الماء المثالية لغسل اليدين الفعّال؟", options: ["أي درجة حرارة تكفي", "ماء بارد فقط (أقل من 15°C)", "ماء دافئ (38–45°C)"], correct: 2 },
      { q: "لماذا يُستخدم الضماد الأزرق في مناطق إنتاج الغذاء؟", options: ["أرخص ثمناً", "الأزرق نادر في الطعام — سهل الكشف إذا سقط", "اللون الأزرق يقتل البكتيريا"], correct: 1 },
      { q: "كم يجب أن ينتظر متداول الغذاء بعد توقف أعراض المرض قبل العودة؟", options: ["24 ساعة", "48 ساعة على الأقل + شهادة طبية", "فقط حتى يشعر بتحسن"], correct: 1 },
      { q: "معقم اليدين يُستخدم:", options: ["بدلاً عن الغسل لتوفير الوقت", "بعد الغسل الكامل كخطوة إضافية", "فقط عند عدم توفر الصابون"], correct: 1 },
      { q: "بعد العطاس أثناء العمل بالغذاء يجب:", options: ["الاستمرار بعد مسح القفاز", "ابتعد ← غيّر الكمامة ← اغسل اليدين ← غيّر القفازات", "تغيير القفازات فقط"], correct: 1 },
      { q: "يجب استبدال القفازات:", options: ["فقط عند التلف الظاهر", "كل ساعة أو عند التلف/تغيير المهمة مع غسل اليدين", "في نهاية الشفت فقط"], correct: 1 },
      { q: "متداول الغذاء الذي يعاني من إسهال يجب أن:", options: ["يستمر بالعمل مع قفازات إضافية", "يُبلّغ المشرف ويُستبعد ≥48 ساعة بعد التوقف", "يتجنب فقط الأطعمة الجاهزة"], correct: 1 },
      { q: "ممنوع طلاء الأظافر لمتداولي الغذاء لأنه:", options: ["يخالف قواعد المظهر", "قد يتقشر في الطعام ويحجب البكتيريا", "مكلف"], correct: 1 },
      { q: "الموبايل الشخصي في مناطق الإنتاج:", options: ["مسموح في الجيب", "ممنوع تماماً — يُحفظ في الخزانة خارجاً", "مسموح فقط للمشرفين"], correct: 1 },
      { q: "قبل دخول الحمام على متداول الغذاء:", options: ["خلع المريول ورمي القفازات", "الإبقاء على المريول وغسل اليدين داخلاً", "خلع القفازات فقط"], correct: 0 },
    ],
  },
  "GHP / Cleaning & Sanitation": {
    en: [
      { q: "What is the correct order for cleaning?", options: ["Rinse → detergent → scrub → rinse → sanitize", "Sanitize first", "Only rinse with water"], correct: 0 },
      { q: "Sanitizer contact time means:", options: ["Time needed on surface to work", "Time to dry hands", "Time to store chemical"], correct: 0 },
      { q: "Why is color coding used?", options: ["Decoration", "Reduce cross contamination", "Save money"], correct: 1 },
      { q: "What should be done after a spill of raw meat juices?", options: ["Ignore", "Clean + sanitize immediately", "Cover with paper only"], correct: 1 },
      { q: "Tools must be stored:", options: ["On the floor", "Clean, dry, and off the floor", "Inside chemical cabinet"], correct: 1 },
    ],
    ar: [
      { q: "ما هو التسلسل الصحيح للتنظيف؟", options: ["شطف→منظف→فرك→شطف→تعقيم", "تعقيم أولاً", "شطف بالماء فقط"], correct: 0 },
      { q: "زمن التماس للمعقم يعني:", options: ["الوقت اللازم ليعمل المعقم على السطح", "وقت تجفيف اليد", "وقت تخزين الكيميائي"], correct: 0 },
      { q: "لماذا نستخدم نظام الألوان للأدوات؟", options: ["للزينة", "لتقليل التلوث المتبادل", "لتقليل التكلفة"], correct: 1 },
      { q: "ماذا نفعل بعد انسكاب عصارة لحم نيء؟", options: ["لا شيء", "تنظيف وتعقيم فوراً", "تغطية بورق فقط"], correct: 1 },
      { q: "يجب حفظ الأدوات:", options: ["على الأرض", "نظيفة وجافة وبعيدة عن الأرض", "داخل خزانة المواد الكيميائية"], correct: 1 },
    ],
  },
  Receiving: {
    en: [
      { q: "Most important checks during receiving:", options: ["Color only", "Temperature + dates + condition", "Packaging only"], correct: 1 },
      { q: "If temperature is out of spec:", options: ["Accept", "Reject/hold & inform QA", "Sell quickly"], correct: 1 },
      { q: "Product label verification is:", options: ["Optional", "Mandatory", "Monthly only"], correct: 1 },
      { q: "If packaging is damaged:", options: ["Accept normally", "Hold/reject depending on risk", "Open and smell"], correct: 1 },
      { q: "FEFO means:", options: ["First Expire First Out", "First Enter First Out", "Freeze Everything For Output"], correct: 0 },
    ],
    ar: [
      { q: "أهم شيء عند الاستلام:", options: ["اللون فقط", "الحرارة + الصلاحية + الحالة", "التغليف فقط"], correct: 1 },
      { q: "إذا كانت الحرارة غير مطابقة:", options: ["نقبلها", "نرفض/نعزل ونبلغ QA", "نبيع بسرعة"], correct: 1 },
      { q: "التحقق من اللابل:", options: ["اختياري", "ضروري", "مرة بالشهر"], correct: 1 },
      { q: "عند وجود تلف في التغليف:", options: ["نستلم عادي", "نعزل/نرفض حسب الخطورة", "نفتح ونشم"], correct: 1 },
      { q: "معنى FEFO:", options: ["الأقرب انتهاء يُستخدم أولاً", "الأقدم دخولًا يُستخدم أولاً", "جمّد كل شيء"], correct: 0 },
    ],
  },
  Storage: {
    en: [
      { q: "FEFO system means:", options: ["Nearest expiry used first", "Oldest production used last", "No order"], correct: 0 },
      { q: "Expired products must be:", options: ["Kept on display", "Segregated/identified then disposed", "Moved to freezer"], correct: 1 },
      { q: "Chemicals can be stored with food:", options: ["Yes", "No", "Depends on quantity"], correct: 1 },
      { q: "Products inside chiller should be:", options: ["Uncovered", "Covered/protected", "Only covered in summer"], correct: 1 },
      { q: "Typical chilled storage temperature:", options: ["0–5°C", "10–15°C", "25°C"], correct: 0 },
    ],
    ar: [
      { q: "ما هو نظام FEFO؟", options: ["الأقرب انتهاء يُستخدم أولاً", "الأقدم إنتاجًا يُستخدم أخيراً", "لا يوجد ترتيب"], correct: 0 },
      { q: "المنتجات المنتهية يجب أن:", options: ["تبقى بالعرض", "تعزل وتحدد ثم إعدام", "تنقل للتجميد"], correct: 1 },
      { q: "هل يجوز تخزين الكيميائيات مع الأغذية؟", options: ["نعم", "لا", "حسب الكمية"], correct: 1 },
      { q: "يجب تغطية المنتجات داخل البراد:", options: ["لا داعي", "نعم لتجنب التلوث", "فقط في الصيف"], correct: 1 },
      { q: "درجة حرارة التخزين البارد عادة:", options: ["0-5°C", "10-15°C", "25°C"], correct: 0 },
    ],
  },
  "Time & Temperature / CCP": {
    en: [
      { q: "Danger Zone is approximately:", options: ["5–60°C", "0–2°C", "70–90°C"], correct: 0 },
      { q: "Chiller temperature must be monitored:", options: ["Only when complaint happens", "As per schedule (daily/shift)", "Once per month"], correct: 1 },
      { q: "Hot holding should be kept:", options: ["Below 40°C", "Above 60°C", "At room temperature"], correct: 1 },
      { q: "If CCP monitoring shows deviation:", options: ["Ignore", "Take corrective action + record", "Hide the record"], correct: 1 },
      { q: "Calibration of thermometer is:", options: ["Not needed", "Required & documented", "Optional"], correct: 1 },
    ],
    ar: [
      { q: "منطقة الخطر (Danger Zone) تقريبا:", options: ["5-60°C", "0-2°C", "70-90°C"], correct: 0 },
      { q: "مراقبة حرارة الثلاجة تكون:", options: ["فقط عند الشكوى", "حسب الجدول (يومي/شفت)", "مرة بالشهر"], correct: 1 },
      { q: "حفظ الطعام الساخن يجب أن يكون:", options: ["أقل من 40°C", "أعلى من 60°C", "حرارة الغرفة"], correct: 1 },
      { q: "عند وجود انحراف في CCP:", options: ["لا شيء", "تصحيح + توثيق", "إخفاء التسجيل"], correct: 1 },
      { q: "معايرة الترمومتر:", options: ["غير ضرورية", "ضرورية وموثقة", "اختيارية"], correct: 1 },
    ],
  },
  "HACCP Basics": {
    en: [
      { q: "HACCP is mainly about:", options: ["Reacting after incidents", "Preventing hazards proactively", "Only paperwork"], correct: 1 },
      { q: "CCP stands for:", options: ["Critical Control Point", "Cold Chain Procedure", "Customer Complaint Policy"], correct: 0 },
      { q: "Corrective action is taken when:", options: ["Limit is met", "Critical limit is exceeded", "No monitoring exists"], correct: 1 },
      { q: "Verification means:", options: ["Checking the system works", "Skipping records", "Only training"], correct: 0 },
      { q: "Records are important because:", options: ["No reason", "Evidence of control & compliance", "To fill storage"], correct: 1 },
    ],
    ar: [
      { q: "الهاسب يركز على:", options: ["ردة فعل بعد الحوادث", "الوقاية من المخاطر مسبقاً", "أوراق فقط"], correct: 1 },
      { q: "معنى CCP:", options: ["نقطة تحكم حرجة", "إجراء سلسلة تبريد", "سياسة شكاوى"], correct: 0 },
      { q: "الإجراء التصحيحي يُتخذ عندما:", options: ["الحد محقق", "تم تجاوز الحد الحرج", "لا يوجد مراقبة"], correct: 1 },
      { q: "التحقق (Verification) يعني:", options: ["تأكيد أن النظام يعمل", "تجاهل السجلات", "فقط تدريب"], correct: 0 },
      { q: "السجلات مهمة لأنها:", options: ["غير مهمة", "دليل على التحكم والالتزام", "لتعبئة الملفات"], correct: 1 },
    ],
  },
  "Allergen Control": {
    en: [
      { q: "Allergens must be:", options: ["Ignored", "Identified, labeled, and controlled", "Mixed with all foods"], correct: 1 },
      { q: "Best way to prevent allergen cross contact:", options: ["Same utensils", "Dedicated tools + cleaning", "Only gloves"], correct: 1 },
      { q: "If label is missing allergen info:", options: ["Sell anyway", "Hold product & inform QA", "Write by pen and continue"], correct: 1 },
      { q: "Cleaning between allergen/non-allergen runs is:", options: ["Not needed", "Mandatory", "Optional"], correct: 1 },
      { q: "Allergen training helps to prevent:", options: ["Only complaints", "Severe consumer reactions", "Temperature deviation"], correct: 1 },
    ],
    ar: [
      { q: "المسببات التحسسية يجب أن:", options: ["تُهمل", "تُحدد وتُوضع على لابل ويتم التحكم بها", "تُخلط مع كل الطعام"], correct: 1 },
      { q: "أفضل طريقة لمنع تلامس مسببات الحساسية:", options: ["نفس الأدوات", "أدوات مخصصة + تنظيف", "قفازات فقط"], correct: 1 },
      { q: "إذا كان اللابل ناقص معلومات الحساسية:", options: ["نبيع", "نعزل ونبلغ QA", "نكتب بالقلم ونكمل"], correct: 1 },
      { q: "التنظيف بين منتجات فيها حساسية وبدون:", options: ["غير ضروري", "ضروري", "اختياري"], correct: 1 },
      { q: "تدريب الحساسية يمنع:", options: ["فقط الشكاوى", "تفاعلات خطيرة للمستهلك", "انحراف الحرارة"], correct: 1 },
    ],
  },
  "Chemical Safety (Food + OHS)": {
    en: [
      { q: "Chemical containers must be:", options: ["Unlabeled", "Labeled and stored in designated area", "Stored above food"], correct: 1 },
      { q: "Mixing chemicals is:", options: ["Allowed anytime", "Not allowed unless instructed", "Recommended"], correct: 1 },
      { q: "What should you do after preparing chemical solution?", options: ["No record", "Follow dilution + record if required", "Increase dosage always"], correct: 1 },
      { q: "SDS stands for:", options: ["Safety Data Sheet", "Storage Daily System", "Sanitation Design Standard"], correct: 0 },
      { q: "PPE when handling chemicals:", options: ["No need", "Gloves/eye protection as per SDS", "Only apron"], correct: 1 },
    ],
    ar: [
      { q: "يجب أن تكون عبوات المواد الكيميائية:", options: ["بدون لابل", "موسومة ومخزنة في مكان مخصص", "فوق الغذاء"], correct: 1 },
      { q: "خلط المواد الكيميائية:", options: ["مسموح دائمًا", "ممنوع إلا حسب التعليمات", "مفضل"], correct: 1 },
      { q: "بعد تجهيز محلول كيميائي:", options: ["بدون سجل", "اتباع التخفيف وتوثيق إذا مطلوب", "زيادة الجرعة دائمًا"], correct: 1 },
      { q: "معنى SDS:", options: ["نشرة بيانات السلامة", "نظام تخزين يومي", "معيار تصميم التعقيم"], correct: 0 },
      { q: "معدات الوقاية عند التعامل مع الكيميائيات:", options: ["غير ضروري", "قفازات/نظارات حسب SDS", "مريول فقط"], correct: 1 },
    ],
  },
  "OHS: PPE & Safe Work": {
    en: [
      { q: "PPE should be:", options: ["Optional", "Worn as required and kept clean", "Shared without cleaning"], correct: 1 },
      { q: "Slips and trips are prevented by:", options: ["Wet floors", "Good housekeeping and dry floors", "Running"], correct: 1 },
      { q: "Near-miss must be:", options: ["Ignored", "Reported", "Hidden"], correct: 1 },
      { q: "Working with sharp tools requires:", options: ["No training", "Training + PPE", "Only speed"], correct: 1 },
      { q: "Emergency exits must be:", options: ["Blocked", "Clear at all times", "Used for storage"], correct: 1 },
    ],
    ar: [
      { q: "معدات الوقاية الشخصية يجب أن:", options: ["اختيارية", "تُلبس حسب المطلوب وتبقى نظيفة", "تُشارك بدون تنظيف"], correct: 1 },
      { q: "منع الانزلاق والسقوط يكون عبر:", options: ["أرضية مبللة", "نظافة المكان وتجفيف الأرضية", "الركض"], correct: 1 },
      { q: "الحوادث القريبة (Near-miss):", options: ["تُهمل", "تُبلّغ", "تُخفى"], correct: 1 },
      { q: "استخدام أدوات حادة يحتاج:", options: ["بدون تدريب", "تدريب + PPE", "سرعة فقط"], correct: 1 },
      { q: "مخارج الطوارئ يجب أن تكون:", options: ["مغلقة", "مفتوحة وخالية دائمًا", "تستخدم للتخزين"], correct: 1 },
    ],
  },
  "OHS: Manual Handling": {
    en: [
      { q: "Correct lifting technique includes:", options: ["Bend back", "Bend knees and keep load close", "Twist quickly"], correct: 1 },
      { q: "If load is too heavy:", options: ["Lift alone", "Ask for help / use equipment", "Throw it"], correct: 1 },
      { q: "Repetitive lifting risk can be reduced by:", options: ["No breaks", "Job rotation and breaks", "More speed"], correct: 1 },
      { q: "Manual handling injuries often affect:", options: ["Hair", "Back/shoulders", "Eyes"], correct: 1 },
      { q: "Before lifting, you should:", options: ["Check path and plan", "Close eyes", "Run"], correct: 0 },
    ],
    ar: [
      { q: "الطريقة الصحيحة للرفع تشمل:", options: ["ثني الظهر", "ثني الركب وحمل الحمولة قريبة", "لف بسرعة"], correct: 1 },
      { q: "إذا كانت الحمولة ثقيلة:", options: ["نرفع لوحدنا", "نطلب مساعدة/نستخدم معدات", "نرميها"], correct: 1 },
      { q: "تقليل مخاطر الرفع المتكرر يكون عبر:", options: ["بدون استراحة", "تدوير مهام واستراحات", "زيادة السرعة"], correct: 1 },
      { q: "إصابات المناولة اليدوية غالباً تصيب:", options: ["الشعر", "الظهر/الكتف", "العين"], correct: 1 },
      { q: "قبل الرفع يجب:", options: ["تحديد المسار والتخطيط", "إغماض العين", "الركض"], correct: 0 },
    ],
  },

  "TESTO OIL — Oil Quality Test": {
    en: [
      { q: "When should you test oil quality with TESTO 270?", options: ["Once a week", "Before service + every 2–3 hrs during frying", "Only when oil looks dark"], correct: 1 },
      { q: "What TPM% level requires IMMEDIATE oil discard?", options: [">15%", ">24%", ">27%"], correct: 2 },
      { q: "A RED reading on TESTO 270 means:", options: ["Oil is perfect", "Monitor more frequently", "Discard oil immediately — do NOT use"], correct: 2 },
      { q: "After using the TESTO probe you must:", options: ["Rinse in water and leave wet", "Wipe dry and store in its protective case", "Leave it resting in the fryer"], correct: 1 },
      { q: "TPM stands for:", options: ["Total Polar Material", "Temperature Per Minute", "Testo Product Manual"], correct: 0 },
    ],
    ar: [
      { q: "متى يجب قياس جودة الزيت بجهاز TESTO 270؟", options: ["مرة بالأسبوع", "قبل الخدمة + كل 2-3 ساعات أثناء القلي", "فقط عندما يبدو الزيت داكناً"], correct: 1 },
      { q: "أي نسبة TPM% تستوجب إعدام الزيت فوراً؟", options: [">15%", ">24%", ">27%"], correct: 2 },
      { q: "القراءة الحمراء على TESTO 270 تعني:", options: ["الزيت ممتاز", "يحتاج مراقبة بتكرار أكبر", "أعدم الزيت فوراً — ممنوع الاستخدام"], correct: 2 },
      { q: "بعد استخدام مجس TESTO يجب:", options: ["شطفه بالماء وتركه مبللاً", "تجفيفه وحفظه في حقيبته الواقية", "تركه في المقلاة"], correct: 1 },
      { q: "معنى TPM:", options: ["المواد القطبية الكلية", "درجة حرارة في الدقيقة", "دليل منتج Testo"], correct: 0 },
    ],
  },

  "Quality System Usage": {
    en: [
      { q: "Where do you view health certificates in the system?", options: ["Returns module", "Health Certificates section", "Meat Status page"], correct: 1 },
      { q: "A RED alert in the system means:", options: ["Everything is fine", "Immediate action required", "Monthly check due"], correct: 1 },
      { q: "Before navigating away from a data entry page you must:", options: ["Close the browser", "Save the data", "Print the page"], correct: 1 },
      { q: "Current stock, hold items, and near-expiry alerts are found in:", options: ["Meat Status section", "Certificates section", "Returns section"], correct: 0 },
      { q: "If you see a system error you should:", options: ["Fix system data manually", "Screenshot + contact QA/IT", "Ignore it and continue"], correct: 1 },
    ],
    ar: [
      { q: "أين تجد الشهادات الصحية في النظام؟", options: ["وحدة المرتجعات", "قسم الشهادات الصحية", "صفحة حالة اللحم"], correct: 1 },
      { q: "التنبيه الأحمر في النظام يعني:", options: ["كل شيء بخير", "إجراء فوري مطلوب", "فحص شهري مطلوب"], correct: 1 },
      { q: "قبل مغادرة صفحة إدخال البيانات يجب:", options: ["إغلاق المتصفح", "حفظ البيانات", "طباعة الصفحة"], correct: 1 },
      { q: "المخزون الحالي والمعزول وتنبيهات انتهاء الصلاحية تُشاهد في:", options: ["قسم حالة اللحم", "قسم الشهادات", "قسم المرتجعات"], correct: 0 },
      { q: "عند ظهور خطأ في النظام:", options: ["تعديل بيانات النظام يدوياً", "لقطة شاشة + تواصل مع QA/IT", "تجاهله والاستمرار"], correct: 1 },
    ],
  },
};

function pickQuestionsForModule(moduleName, liveBank = {}) {
  const pack = liveBank[moduleName] || QUESTION_BANK[moduleName];
  if (pack?.en?.length) return pack;
  return {
    en: [{ q: "This training module requires QA-defined questions.", options: ["OK"], correct: 0 }],
    ar: [{ q: "هذا القسم يحتاج أسئلة من QA.", options: ["موافق"], correct: 0 }],
  };
}



/* ===================== Sub-components (defined OUTSIDE to preserve focus) ===================== */
const InfoCard = ({ label, value, children }) => (
  <div style={{ background:"#fff", border:"1px solid #dbe4e2", borderRadius:6, padding:"12px 14px", boxShadow:"0 12px 30px rgba(15,23,42,.06)" }}>
    <div style={{ fontSize:10, color:"#0f766e", fontWeight:1000, letterSpacing:.5, textTransform:"uppercase", marginBottom:5 }}>{label}</div>
    {children || <div style={{ fontSize:13, fontWeight:700, color:"#1e3a5f" }}>{value || "—"}</div>}
  </div>
);

const Section = ({ children, style = {} }) => (
  <div style={{ background:"#ffffff", border:"1px solid #dbe4e2", borderRadius:6, padding:18, boxShadow:"0 12px 30px rgba(15,23,42,.06)", ...style }}>
    {children}
  </div>
);

const SectionTitle = ({ children }) => (
  <div style={{ fontWeight:1000, fontSize:15, color:"#0f172a", marginBottom:12, letterSpacing:.2 }}>{children}</div>
);

const FieldLabel = ({ children }) => (
  <div style={{ fontSize:12, fontWeight:900, color:"#334155", marginBottom:5, letterSpacing:.3, textTransform:"uppercase" }}>{children}</div>
);

/* ===================== Component ===================== */
export default function TrainingSessionCreate() {
  const nav = useNavigate();
  const [saving, setSaving] = useState(false);
  const [loadingConfig, setLoadingConfig] = useState(false);
  const [showReference, setShowReference] = useState(false);
  const [availableModules, setAvailableModules] = useState(MODULES);
  const [liveQuestionBank, setLiveQuestionBank] = useState({});
  const [liveDetailsByModule, setLiveDetailsByModule] = useState({});

  const DEFAULT_MODULE = "Personnel Hygiene";

  const [date, setDate]                       = useState(todayISO());
  const [branch, setBranch]                   = useState("POS 15 - Al Barsha Butchery");
  const [moduleName, setModuleName]           = useState(DEFAULT_MODULE);
  const [customModule, setCustomModule]       = useState("");
  const [useCustomModule, setUseCustomModule] = useState(false);
  const [details, setDetails]                 = useState(getDetailsTemplate(DEFAULT_MODULE));
  const [detailsTouched, setDetailsTouched]   = useState(false);
  const [objectives, setObjectives]           = useState(DEFAULT_OBJECTIVES);
  const [conductedBy, setConductedBy]         = useState("");
  const [verifiedBy, setVerifiedBy]           = useState("");
  const [level, setLevel]                     = useState(""); // all levels unless a difficulty is selected

  useEffect(() => {
    let alive = true;
    setLoadingConfig(true);
    loadAdminTrainingConfig()
      .then(({ modules, questionBank, detailsByModule }) => {
        if (!alive) return;
        setAvailableModules(modules);
        setLiveQuestionBank(questionBank);
        setLiveDetailsByModule(detailsByModule);

        if (!modules.some((m) => m === moduleName)) {
          const next = modules[0] || DEFAULT_MODULE;
          setModuleName(next);
          if (!detailsTouched) setDetails(detailsByModule[next] || getDetailsTemplate(next));
        } else if (!detailsTouched && detailsByModule[moduleName]) {
          setDetails(detailsByModule[moduleName]);
        }
      })
      .catch((e) => console.warn("Failed to load training admin config", e))
      .finally(() => {
        if (alive) setLoadingConfig(false);
      });
    return () => { alive = false; };
    // Load once; do not overwrite user edits after the initial sync.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const effectiveModule = useCustomModule && customModule.trim()
    ? customModule.trim()
    : moduleName;

  const uniqueKey = useMemo(
    () => `${branch}__${date}__${effectiveModule}`.toLowerCase(),
    [branch, date, effectiveModule]
  );
  const title = useMemo(
    () => `Training Record • ${effectiveModule} • ${branch} • ${date}`,
    [effectiveModule, branch, date]
  );
  const questionsPack = useMemo(
    () => pickQuestionsForModule(effectiveModule, liveQuestionBank),
    [effectiveModule, liveQuestionBank]
  );

  const validate = () => {
    if (!date)            return "Please select a Date.";
    if (!branch)          return "Please select a Branch.";
    if (!effectiveModule) return "Please select or enter a Training Module.";
    if (!details || String(details).trim().length < 10)    return "Training details are required.";
    if (!objectives || String(objectives).trim().length < 10) return "Training objectives are required.";
    return "";
  };

  const onSave = async () => {
    const err = validate();
    if (err) return alert(err);
    setSaving(true);
    try {
      const existing = await listReportsByType(TYPE);
      const found = Array.isArray(existing)
        ? existing.find((r) => (r?.payload?.uniqueKey || "").toLowerCase() === uniqueKey)
        : null;
      if (found) {
        alert("Duplicate session found for the same Branch + Date + Module ✅\nPlease change date/branch/module.");
        setSaving(false);
        return;
      }
      const payload = {
        ...DEFAULT_DOC,
        date, branch,
        moduleName: effectiveModule,
        level, // ✅ NEW: target level/difficulty for this session's quiz
        title, uniqueKey, details, objectives,
        conductedBy, verifiedBy,
        participants: [],
        approvals: { qaVerifiedAt: null, approvedAt: null },
        questionsBank: questionsPack,
      };
      await createReport({ type: TYPE, title, branch, payload });
      alert("Saved successfully ✅");
      nav("/training");
    } catch (e) {
      console.error(e);
      alert(String(e?.message || e));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={pageShell}>

      {/* ── Top bar ── */}
      <div style={{ maxWidth:1180, margin:"0 auto", padding:"18px clamp(16px,2vw,26px)", display:"flex", alignItems:"center", justifyContent:"space-between", gap:18, flexWrap:"wrap", borderRadius:6, background:"linear-gradient(135deg,#123a49 0%,#0f766e 48%,#2aa8c4 100%)", color:"#fff", boxShadow:"0 22px 50px rgba(15,23,42,.16)" }}>
        <div style={{ display:"flex", alignItems:"center", gap:14, minWidth:0 }}>
          <img src={logo} alt="Al Mawashi" style={{ width:58, height:58, objectFit:"cover", borderRadius:6, border:"1px solid rgba(255,255,255,.5)", background:"#fff", flex:"0 0 auto" }} />
          <div style={{ minWidth:0 }}>
            <div style={{ fontSize:12, lineHeight:1.3, fontWeight:900, opacity:.85, marginBottom:4 }}>AL MAWASHI QMS</div>
            <h1 style={{ margin:0, color:"#fff", fontWeight:1000, fontSize:16, lineHeight:1.35 }}>Create Training Session</h1>
            <div style={{ color:"rgba(255,255,255,.88)", fontSize:14, marginTop:4, fontWeight:700, lineHeight:1.45 }}>
              {loadingConfig ? "Loading Training Admin modules..." : "Training modules, question banks, references, and session records"}
            </div>
          </div>
        </div>
        <div style={{ marginLeft:"auto", display:"flex", gap:8, flexWrap:"wrap", alignItems:"stretch", justifyContent:"flex-end" }}>
          <button onClick={() => nav("/training")} style={{ ...actionBtn("rgba(255,255,255,.12)"), border:"1px solid rgba(255,255,255,.26)", boxShadow:"none" }}><FiArrowLeft size={15} /> Back</button>
          <button onClick={() => setShowReference(true)} style={{ ...actionBtn("rgba(255,255,255,.12)"), border:"1px solid rgba(255,255,255,.26)", boxShadow:"none" }}><FiBookOpen size={15} /> Reference</button>
          <button onClick={onSave} disabled={saving} style={actionBtn(saving ? C.gray400 : "#10b981", saving)}>
            <><FiSave size={15} /> {saving ? "Saving..." : "Save Session"}</>
          </button>
        </div>
      </div>

      {/* ── Body ── */}
      <div style={{ ...glassPanel, maxWidth:1180, margin:"14px auto 0", padding:18, display:"grid", gap:16 }}>

        {/* ── KPI cards ── */}
        <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(220px,1fr))", gap:10 }}>
          <InfoCard label="📋 Session Title"       value={title} />
          <InfoCard label="🔑 Unique Key"          value={uniqueKey} />
          <InfoCard label="❓ Questions EN"        value={`${questionsPack?.en?.length || 0} questions`} />
          <InfoCard label="❓ Questions AR"        value={`${questionsPack?.ar?.length || 0} questions`} />
        </div>

        {/* ── Meta fields ── */}
        <Section>
          <SectionTitle>Session Details</SectionTitle>
          <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(240px,1fr))", gap:14 }}>

            {/* Date */}
            <div>
              <FieldLabel>📅 Date</FieldLabel>
              <input type="date" value={date} onChange={e=>setDate(e.target.value)} style={inputSt} />
            </div>

            {/* Branch */}
            <div>
              <FieldLabel>🏢 Branch</FieldLabel>
              <select value={branch} onChange={e=>setBranch(e.target.value)} style={inputSt}>
                {BRANCHES.map(b => <option key={b} value={b}>{b}</option>)}
              </select>
            </div>

            {/* Module */}
            <div>
              <FieldLabel>📚 Module</FieldLabel>
              {!useCustomModule ? (
                <select
                  value={moduleName}
                  onChange={e => {
                    const next = e.target.value;
                    setModuleName(next);
                    if (!detailsTouched) setDetails(liveDetailsByModule[next] || getDetailsTemplate(next));
                  }}
                  style={inputSt}
                >
                  {availableModules.map(m => <option key={m} value={m}>{m}</option>)}
                </select>
              ) : (
                <input
                  value={customModule}
                  onChange={e => {
                    setCustomModule(e.target.value);
                    if (!detailsTouched) setDetails(getDetailsTemplate("__DEFAULT__"));
                  }}
                  placeholder="اكتب اسم التدريب الجديد…"
                  style={{ ...inputSt, borderColor:C.purple, outline:`2px solid ${C.purpleBg}` }}
                />
              )}
              <button
                onClick={() => {
                  setUseCustomModule(p => !p);
                  setCustomModule("");
                  if (!detailsTouched) setDetails(liveDetailsByModule[moduleName] || getDetailsTemplate(moduleName));
                }}
                style={{
                  marginTop:8, padding:"7px 12px", borderRadius:8,
                  border:`1px dashed ${C.purple}`,
                  background: useCustomModule ? C.purpleBg : "#faf5ff",
                  color:C.purple, fontWeight:700, fontSize:12,
                  cursor:"pointer", width:"100%", textAlign:"left",
                }}
              >
                {useCustomModule ? "← الرجوع للقائمة الأصلية" : "+ إضافة تدريب مخصص جديد"}
              </button>
            </div>

            {/* Level / Difficulty */}
            <div>
              <FieldLabel>📊 Level / المستوى</FieldLabel>
              <select value={level} onChange={e => setLevel(e.target.value)} style={inputSt}>
                {LEVELS.map(l => (
                  <option key={l.value || "all"} value={l.value}>{l.en} — {l.ar}</option>
                ))}
              </select>
              <div style={{ marginTop:6, fontSize:11, color:C.gray400 }}>
                {level
                  ? "سيظهر للمتدرّب 5 أسئلة من هذا المستوى."
                  : "كل المستويات — تظهر كل أسئلة الوحدة."}
              </div>
            </div>

            {/* Conducted By */}
            <div>
              <FieldLabel>👤 Conducted By</FieldLabel>
              <input value={conductedBy} onChange={e=>setConductedBy(e.target.value)} placeholder="Trainer name" style={inputSt} />
            </div>

            {/* Verified By */}
            <div>
              <FieldLabel>✅ Verified By</FieldLabel>
              <input value={verifiedBy} onChange={e=>setVerifiedBy(e.target.value)} placeholder="QA / Food Safety Team Leader" style={inputSt} />
            </div>
          </div>

          {/* Unique key pill */}
          <div style={{ marginTop:14, padding:"10px 14px", background:C.accentBg, border:`1px solid ${C.border}`, borderRadius:8, fontSize:12 }}>
            <span style={{ color:C.accent, fontWeight:700 }}>Duplicate Key: </span>
            <span style={{ fontFamily:"ui-monospace,monospace", color:C.navy }}>{uniqueKey}</span>
          </div>
        </Section>

        {/* ── Training Details ── */}
        <Section>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:12, flexWrap:"wrap", gap:8 }}>
            <SectionTitle>📝 Detail of Training (A–L) — EN / AR</SectionTitle>
            <div style={{ display:"flex", gap:8, alignItems:"center" }}>
              <span style={{ fontSize:11, color:C.gray400 }}>
                {useCustomModule ? "• custom module" : detailsTouched ? "• edited" : "• auto-filled"}
              </span>
              <button
                onClick={() => {
                  setDetails(useCustomModule ? getDetailsTemplate("__DEFAULT__") : (liveDetailsByModule[moduleName] || getDetailsTemplate(moduleName)));
                  setDetailsTouched(false);
                }}
                style={{ padding:"6px 12px", borderRadius:8, border:`1px solid ${C.border}`, background:C.gray50, color:C.navy, fontWeight:700, fontSize:12, cursor:"pointer" }}
              >
                ♻ Reset to Template
              </button>
            </div>
          </div>
          <textarea
            value={details}
            onChange={e => { setDetailsTouched(true); setDetails(e.target.value); }}
            style={{ ...textareaSt, minHeight:420 }}
          />
        </Section>

        {/* ── Objectives + Metadata ── */}
        <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(380px,1fr))", gap:16 }}>

          <Section>
            <SectionTitle>🎯 Objectives / Frequency / Evaluation</SectionTitle>
            <textarea
              value={objectives}
              onChange={e => setObjectives(e.target.value)}
              style={{ ...textareaSt, minHeight:240 }}
            />
          </Section>

          <Section>
            <SectionTitle>📄 Document Metadata</SectionTitle>
            <div style={{ display:"grid", gap:10 }}>
              {[
                ["Document Number", DEFAULT_DOC.documentNumber],
                ["Issue Date",      DEFAULT_DOC.issueDate],
                ["Revision No.",    DEFAULT_DOC.revisionNo],
                ["Issued By",       DEFAULT_DOC.issuedBy],
                ["Approved By",     DEFAULT_DOC.approvedBy],
              ].map(([k, v]) => (
                <div key={k} style={{ display:"flex", justifyContent:"space-between", gap:10, padding:"8px 0", borderBottom:`1px solid ${C.gray100}`, fontSize:13 }}>
                  <span style={{ color:C.gray400, fontWeight:600 }}>{k}</span>
                  <span style={{ color:C.navy, fontWeight:700 }}>{v}</span>
                </div>
              ))}
            </div>
            <div style={{ marginTop:14, padding:"10px 12px", background:C.tealBg, border:`1px solid #99f6e4`, borderRadius:8, fontSize:12, color:C.teal, fontWeight:600 }}>
              ✅ Questions (AR/EN) attached automatically per module. Quiz page will use them.
            </div>
          </Section>
        </div>

        {/* ── Footer ── */}
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", flexWrap:"wrap", gap:10, paddingTop:4 }}>
          <span style={{ fontSize:12, color:C.gray400 }}>Built by Eng. Mohammed Abdullah</span>
          <div style={{ display:"flex", gap:8 }}>
            <button onClick={() => nav("/training")} style={{ ...actionBtn(C.gray700), background:"transparent", color:C.gray700, border:`1px solid ${C.gray200}` }}>
              Cancel
            </button>
            <button onClick={() => setShowReference(true)} style={{ ...actionBtn("#0f766e"), boxShadow:"0 10px 20px rgba(15,118,110,.18)" }}><FiBookOpen size={15} /> Reference</button>
            <button onClick={onSave} disabled={saving} style={actionBtn(saving ? C.gray400 : "#10b981", saving)}>
              <><FiSave size={15} /> {saving ? "Saving..." : "Save Session"}</>
            </button>
          </div>
        </div>

      </div>

      <TrainingReferenceModal
        open={showReference}
        onClose={() => setShowReference(false)}
        moduleName={effectiveModule}
        branch={branch}
        date={date}
        details={details}
        objectives={objectives}
        conductedBy={conductedBy}
        quickCheckQuestions={((liveQuestionBank[effectiveModule] || QUESTION_BANK[effectiveModule])?.en || []).slice(0, 5).map(q => ({
          q_en: q.q, options_en: q.options, correct: q.correct,
        }))}
      />
    </div>
  );
}
