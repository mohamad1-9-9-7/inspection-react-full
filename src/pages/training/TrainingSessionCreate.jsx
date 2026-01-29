// src/pages/training/TrainingSessionCreate.jsx
import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

/* ===================== API base (Vite + CRA + window override) ===================== */
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
function pad2(n) {
  return String(n ?? "").padStart(2, "0");
}
function todayISO() {
  const d = new Date();
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

async function safeJson(res) {
  const text = await res.text();
  try {
    return text ? JSON.parse(text) : null;
  } catch {
    return text || null;
  }
}

async function listReportsByType(type) {
  const url = `${REPORTS_URL}?type=${encodeURIComponent(type)}`;
  const res = await fetch(url, {
    method: "GET",
    headers: { Accept: "application/json" },
  });

  if (!res.ok) {
    const data = await safeJson(res);
    throw new Error(
      data?.message || data?.error || `Failed to list reports (${res.status})`
    );
  }

  const data = await safeJson(res);

  // Some servers return {items: []} or [] directly
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.items)) return data.items;
  if (Array.isArray(data?.data)) return data.data;
  return [];
}

async function createReport(body) {
  const res = await fetch(REPORTS_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const data = await safeJson(res);
    throw new Error(
      data?.message || data?.error || `Failed to create report (${res.status})`
    );
  }

  return await safeJson(res);
}

/* ===================== Defaults from your Excel ===================== */
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

/* ===================== Training Modules ===================== */
const MODULES = [
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
];

/* ===================== Branch options ===================== */
const BRANCHES = [
  "QCS",
  "POS 6",
  "POS 10",
  "POS 11",
  "POS 14",
  "POS 15",
  "POS 18",
  "POS 19",
  "POS 21",
  "POS 24",
  "POS 34",
  "POS 35",
  "POS 36",
  "FTR 1",
  "FTR 2",
];

/* ===================== Bilingual (EN/AR) Training Details Templates ✅ ===================== */
const DEFAULT_DETAILS_BI = `A) General food safety & hygiene requirements (site rules).
   أ) متطلبات السلامة الغذائية والنظافة العامة (قواعد الموقع).
B) Time/Temperature control basics and monitoring.
   ب) أساسيات التحكم بالوقت/الحرارة والمراقبة.
C) Date control: production/slaughter/expiry and FEFO.
   ج) التحكم بالتواريخ: إنتاج/ذبح/انتهاء وتطبيق FEFO.
D) Segregation: expired/hold/reject identification.
   د) العزل: تمييز منتهي/معلّق/مرفوض.
E) Cross contamination prevention (tools, surfaces, covering).
   هـ) منع التلوث المتبادل (أدوات، أسطح، تغطية).
F) Cleaning and sanitation basics (sequence and records).
   و) أساسيات التنظيف والتعقيم (التسلسل والسجلات).
G) Chemical storage & safe handling (SDS/PPE).
   ز) تخزين واستخدام المواد الكيميائية بأمان (SDS/PPE).
H) Personal hygiene & PPE compliance.
   ح) نظافة شخصية والالتزام بوسائل الوقاية.
I) Waste handling and housekeeping.
   ط) إدارة النفايات ونظافة الموقع.
J) Incident/NC reporting and corrective action.
   ي) الإبلاغ عن الحوادث/عدم المطابقة والإجراء التصحيحي.
K) Verification: supervisor/QA checks.
   ك) التحقق: تفتيش المشرف/QA.
L) Documentation: fill records correctly and on time.
   ل) التوثيق: تعبئة السجلات بشكل صحيح وفي الوقت المحدد.`;

const MODULE_DETAILS_BI = {
  "Personnel Hygiene": `A) Hand washing rules & frequency (when and how).
   أ) قواعد غسل اليدين وتكراره (متى وكيف).
B) PPE: gloves, mask, hairnet, apron (correct use).
   ب) معدات الوقاية: قفازات/كمامة/شبكة شعر/مريول (استخدام صحيح).
C) No jewelry / short nails / clean uniform.
   ج) منع المجوهرات/أظافر قصيرة/زي نظيف.
D) Illness reporting (fever/diarrhea) and exclusion rules.
   د) الإبلاغ عن المرض (حمى/إسهال) ومنع العمل عند المرض.
E) Wound management: waterproof dressing + glove.
   هـ) التعامل مع الجروح: ضماد مقاوم للماء + قفاز.
F) No eating/drinking/smoking in food areas.
   و) منع الأكل/الشرب/التدخين في مناطق الغذاء.
G) Hand sanitizer use & contact time (if applicable).
   ز) استخدام المعقم وزمن التماس (إن وجد).
H) Personal items storage (phones/bags) outside work area.
   ح) حفظ الأغراض الشخصية (موبايل/شنطة) خارج منطقة العمل.
I) Visitor/contractor hygiene rules.
   ط) قواعد نظافة الزوار/المقاولين.
J) Toilet hygiene & returning to work (hand wash mandatory).
   ي) نظافة الحمام والعودة للعمل (غسل اليدين إلزامي).
K) Cough/sneeze etiquette & contamination prevention.
   ك) آداب السعال/العطاس ومنع التلوث.
L) Daily hygiene checks + actions for non-compliance.
   ل) فحص يومي للنظافة + إجراء عند عدم الالتزام.`,

  "GHP / Cleaning & Sanitation": `A) Cleaning sequence: rinse → detergent → scrub → rinse → sanitize.
   أ) تسلسل التنظيف: شطف → منظف → فرك → شطف → تعقيم.
B) Chemical dilution & correct dosage (as per SOP/SDS).
   ب) تخفيف المواد الكيميائية والجرعة الصحيحة (حسب SOP/SDS).
C) Sanitizer contact time & verification.
   ج) زمن تلامس المعقم والتحقق منه.
D) Color coding tools/areas to prevent cross contamination.
   د) نظام الألوان للأدوات/المناطق لمنع التلوث المتبادل.
E) Cleaning schedule: frequency, responsible person, sign-off.
   هـ) جدول التنظيف: التكرار، المسؤول، التوقيع.
F) High-touch points cleaning (handles, switches, scales).
   و) تنظيف نقاط اللمس العالية (مقابض، مفاتيح، ميزان).
G) Spill management (raw meat juices): immediate clean + sanitize.
   ز) التعامل مع الانسكابات (عصارة لحم): تنظيف وتعقيم فوراً.
H) Waste bins cleaning, liners, and pest prevention.
   ح) تنظيف سلال النفايات والبطانات ومنع الآفات.
I) Tool storage: clean/dry/off-floor, dedicated racks.
   ط) حفظ الأدوات: نظيفة/جافة/بعيدة عن الأرض وعلى رفوف مخصصة.
J) Post-cleaning inspection & corrective action for failures.
   ي) تفتيش بعد التنظيف وإجراء تصحيحي عند الفشل.
K) Records: cleaning log, chemical log, verification log.
   ك) السجلات: سجل تنظيف/كيميائيات/تحقق.
L) Equipment cleaning after use (slicers, grinders, tables).
   ل) تنظيف المعدات بعد الاستخدام (سلايسر/مفرمة/طاولات).`,

  Receiving: `A) Temperature checks (product + vehicle/chiller) vs limits.
   أ) فحص الحرارة (المنتج + السيارة/المبرّد) حسب الحدود.
B) Date checks: production/slaughter (if applicable) & expiry.
   ب) فحص التواريخ: إنتاج/ذبح (إن وجد) والانتهاء.
C) Packaging integrity: seal, vacuum, leakage, damage.
   ج) سلامة التغليف: إغلاق/فاكيوم/تسريب/تلف.
D) Label verification: name, batch/lot, origin, halal (if required).
   د) التحقق من الملصق: اسم/دفعة/منشأ/حلال (إذا مطلوب).
E) Documents: invoice/COA/halal certificate (as applicable).
   هـ) المستندات: فاتورة/COA/شهادة حلال (حسب الحاجة).
F) Acceptance criteria and rejection/hold decision.
   و) معايير القبول وقرار الرفض/الحجز.
G) Segregation: accepted vs rejected/held items (HOLD tag).
   ز) فصل المقبول عن المرفوض/المحجوز (ملصق HOLD).
H) NC handling: inform QA, record, corrective action.
   ح) التعامل مع عدم المطابقة: إبلاغ QA، توثيق، إجراء تصحيحي.
I) Time control: move items quickly to chiller.
   ط) التحكم بالوقت: إدخال المنتجات للبراد بسرعة.
J) Cross contamination prevention during unloading (clean pallets).
   ي) منع التلوث أثناء التنزيل (طبالي نظيفة).
K) Receiving area hygiene and housekeeping.
   ك) نظافة منطقة الاستلام والترتيب.
L) Recording in receiving log & QA verification.
   ل) التسجيل في سجل الاستلام والتحقق من QA.`,

  Storage: `A) Chiller temperature monitoring & limits (typ. 0–5°C).
   أ) مراقبة حرارة البراد والحدود (عادة 0–5°C).
B) FEFO arrangement & stock rotation checks.
   ب) ترتيب FEFO وفحص تدوير المخزون.
C) Segregation: raw vs RTE; chemicals away from food.
   ج) العزل: نيء مقابل جاهز؛ الكيميائيات بعيداً عن الغذاء.
D) Covering products and preventing drip contamination.
   د) تغطية المنتجات ومنع تلوث التنقيط.
E) Correct stacking, airflow, off-floor storage.
   هـ) رص صحيح وتدفق هواء وحفظ بعيداً عن الأرض.
F) Expired/near-expiry identification, hold, disposal.
   و) تمييز منتهي/قريب الانتهاء، حجز، إعدام.
G) Traceability: batch/lot visibility & labeling.
   ز) التتبع: ظهور رقم الدفعة/اللوط واللابل.
H) Cleaning schedule for cold room & shelves.
   ح) جدول تنظيف غرفة التبريد والرفوف.
I) Pest prevention, door discipline, housekeeping.
   ط) منع الآفات والانضباط بالأبواب والترتيب.
J) In/Out handling to reduce door-open time.
   ي) إدخال/إخراج لتقليل وقت فتح الباب.
K) Corrective action for deviations (temp high, spill, damage).
   ك) إجراء تصحيحي للانحرافات (ارتفاع حرارة/انسكاب/تلف).
L) Documentation: storage log & verification.
   ل) التوثيق: سجل التخزين والتحقق.`,

  "Time & Temperature / CCP": `A) Danger Zone awareness (approx. 5–60°C).
   أ) معرفة منطقة الخطر (تقريباً 5–60°C).
B) Chilled holding requirements & monitoring frequency.
   ب) متطلبات الحفظ المبرد وتكرار المراقبة.
C) Hot holding requirements (>60°C) where applicable.
   ج) متطلبات الحفظ الساخن (>60°C) عند الحاجة.
D) CCP monitoring: who/when/how + critical limits.
   د) مراقبة CCP: من/متى/كيف + الحدود الحرجة.
E) Corrective action when limits exceeded (hold/evaluate/discard).
   هـ) إجراء تصحيحي عند تجاوز الحدود (حجز/تقييم/إعدام).
F) Thermometer calibration & verification records.
   و) معايرة الترمومتر وسجلات التحقق.
G) Display temperature monitoring and corrective actions.
   ز) مراقبة حرارة العرض والإجراءات التصحيحية.
H) Transport temperature monitoring (chiller vehicle).
   ح) مراقبة حرارة النقل (سيارة مبردة).
I) Thawing/cooling time control (if applicable).
   ط) التحكم بوقت الإذابة/التبريد (إن وجد).
J) Breakdown plan: backup, escalation, product protection.
   ي) خطة أعطال: بديل/تصعيد/حماية المنتج.
K) Record keeping & QA review.
   ك) حفظ السجلات ومراجعة QA.
L) Trend analysis and prevention for repeat deviations.
   ل) تحليل الاتجاهات ومنع تكرار الانحرافات.`,

  "HACCP Basics": `A) HACCP purpose: prevent hazards proactively.
   أ) هدف الهاسب: منع المخاطر بشكل استباقي.
B) Hazard types: biological/chemical/physical (meat examples).
   ب) أنواع المخاطر: ميكروبية/كيميائية/فيزيائية (أمثلة اللحوم).
C) PRP vs OPRP vs CCP (simple understanding).
   ج) الفرق بين PRP و OPRP و CCP (بشكل مبسط).
D) Critical limits and why they matter.
   د) الحدود الحرجة ولماذا هي مهمة.
E) Monitoring: method, frequency, responsibility.
   هـ) المراقبة: طريقة/تكرار/مسؤولية.
F) Corrective action steps for deviations.
   و) خطوات الإجراء التصحيحي عند الانحراف.
G) Verification activities (review, audits, checks).
   ز) أنشطة التحقق (مراجعة/تدقيق/تفتيش).
H) Records: evidence of control and compliance.
   ح) السجلات: دليل التحكم والالتزام.
I) Traceability basics & recall awareness.
   ط) أساسيات التتبع والاسترجاع.
J) Complaints/incidents escalation and documentation.
   ي) تصعيد الشكاوى/الحوادث وتوثيقها.
K) Roles and accountability in HACCP system.
   ك) الأدوار والمسؤوليات ضمن نظام الهاسب.
L) Continuous improvement from findings.
   ل) التحسين المستمر بناءً على النتائج.`,

  "Allergen Control": `A) Identify allergens present (milk, gluten, egg, etc.).
   أ) تحديد مسببات الحساسية (حليب/غلوتين/بيض...).
B) Prevent cross-contact: dedicated tools/areas if needed.
   ب) منع التلامس المتبادل: أدوات/مناطق مخصصة عند الحاجة.
C) Cleaning between allergen/non-allergen (method + verification).
   ج) تنظيف بين منتجات حساسية/بدون حساسية (طريقة + تحقق).
D) Labeling: allergen declaration accuracy.
   د) الملصقات: دقة الإفصاح عن الحساسية.
E) Storage segregation and sealed containers.
   هـ) عزل التخزين واستخدام عبوات محكمة.
F) Changeover procedure and workflow.
   و) إجراءات التحويل بين المنتجات وسير العمل.
G) What to do if label missing/incorrect (HOLD + inform QA).
   ز) ماذا نفعل إذا اللابل ناقص/خاطئ (حجز + إبلاغ QA).
H) Staff awareness of severity and symptoms.
   ح) وعي الموظفين بخطورة الأعراض.
I) Rework control (if applicable) and restrictions.
   ط) التحكم بإعادة التصنيع (إن وجد) والقيود.
J) Waste/cleanup after allergen spill.
   ي) تنظيف بعد انسكاب مادة مسببة للحساسية.
K) Records: allergen checklist + cleaning verification.
   ك) السجلات: قائمة حساسية + تحقق التنظيف.
L) NC and corrective actions for allergen failures.
   ل) عدم المطابقة والإجراء التصحيحي لحالات الحساسية.`,

  "Cross Contamination Control": `A) Separate raw vs RTE areas and tools.
   أ) فصل النيء عن الجاهز للأكل في المناطق والأدوات.
B) Hand hygiene between tasks (wash/change gloves).
   ب) نظافة اليدين بين المهام (غسل/تغيير قفازات).
C) Color coding knives/boards; dedicated equipment.
   ج) ترميز الألوان للسكاكين/الألواح؛ معدات مخصصة.
D) Prevent drip contamination in chiller (top-to-bottom rule).
   د) منع تلوث التنقيط في البراد (الأعلى للأسفل).
E) Clean/sanitize shared surfaces and contact points.
   هـ) تنظيف/تعقيم الأسطح المشتركة ونقاط التلامس.
F) Handling phones/money then returning to food handling.
   و) التعامل مع الهاتف/المال ثم العودة للعمل الغذائي.
G) Covering products; safe packaging practices.
   ز) تغطية المنتجات وممارسات تغليف آمنة.
H) Waste handling without contaminating food areas.
   ح) التعامل مع النفايات بدون تلويث مناطق الغذاء.
I) Workflow control: staff movement and zoning.
   ط) التحكم بسير العمل: حركة الموظفين وتقسيم المناطق.
J) Equipment cleaning after raw processing.
   ي) تنظيف المعدات بعد معالجة النيء.
K) Verification: hygiene checks / swabs (if applicable).
   ك) التحقق: فحوصات نظافة / مسحات (إن وجدت).
L) Documentation and corrective actions.
   ل) التوثيق والإجراءات التصحيحية.`,

  "Chemical Safety (Food + OHS)": `A) Chemical identification & labeling (no unlabeled bottles).
   أ) تعريف الكيميائيات ووضع لابل (ممنوع عبوات بدون لابل).
B) Storage in designated chemical cabinet (away from food).
   ب) تخزينها في خزانة مخصصة بعيداً عن الغذاء.
C) Dilution procedure, dosage control & measuring tools.
   ج) إجراءات التخفيف والتحكم بالجرعة وأدوات القياس.
D) SDS availability and key hazard understanding.
   د) توفر SDS وفهم المخاطر الأساسية.
E) PPE when handling chemicals (gloves/eye protection).
   هـ) معدات الوقاية عند الاستخدام (قفازات/نظارات).
F) Mixing chemicals prohibited unless SOP instructs.
   و) ممنوع خلط الكيميائيات إلا حسب SOP.
G) Spill response and first aid actions.
   ز) التعامل مع الانسكاب وإسعافات أولية.
H) Prevent chemical contamination of food/packaging.
   ح) منع تلوث الغذاء/التغليف بالكيميائيات.
I) Disposal of empty containers and chemical waste.
   ط) التخلص من العبوات الفارغة والنفايات الكيميائية.
J) Use only approved chemicals and correct purpose.
   ي) استخدام مواد معتمدة فقط وللغرض الصحيح.
K) Records: chemical/dilution/verification logs.
   ك) السجلات: كيميائيات/تخفيف/تحقق.
L) Corrective actions for misuse/non-compliance.
   ل) إجراء تصحيحي عند سوء الاستخدام/عدم الالتزام.`,

  "Pest Control Awareness": `A) Signs of pests (droppings, gnaw marks, insects).
   أ) علامات الآفات (فضلات/قضم/حشرات).
B) Keep doors closed and prevent entry points.
   ب) إبقاء الأبواب مغلقة ومنع نقاط الدخول.
C) Housekeeping: remove waste and clean spills immediately.
   ج) ترتيب ونظافة: إزالة النفايات وتنظيف الانسكابات فوراً.
D) Waste management to reduce attraction.
   د) إدارة النفايات لتقليل الجذب.
E) Storage discipline: off-floor, away from walls.
   هـ) انضباط التخزين: بعيد عن الأرض وعن الجدران.
F) Report sightings immediately and record.
   و) الإبلاغ الفوري وتوثيق المشاهدة.
G) Do not touch bait stations/traps.
   ز) عدم العبث بمصائد/طعوم مكافحة الآفات.
H) Vendor-only pesticide application rules.
   ح) تطبيق المبيدات فقط بواسطة الشركة المعتمدة.
I) Monitor and review pest control logs.
   ط) مراقبة ومراجعة سجلات الآفات.
J) Corrective actions after pest evidence found.
   ي) إجراءات تصحيحية عند وجود دليل آفات.
K) Prevent contamination during treatments.
   ك) منع التلوث أثناء المعالجات.
L) Documentation and follow-up verification.
   ل) التوثيق والتحقق والمتابعة.`,

  "Waste Management": `A) Segregate waste: food vs general vs hazardous (if any).
   أ) فصل النفايات: غذائية/عامة/خطرة (إن وجدت).
B) Covered bins with liners; frequent emptying.
   ب) سلال مغطاة مع بطانات وتفريغ متكرر.
C) Clean/disinfect bins and waste area.
   ج) تنظيف وتعقيم السلال ومنطقة النفايات.
D) Avoid overflow and control odor/leaks.
   د) منع الامتلاء الزائد والتحكم بالروائح/التسريب.
E) Safe disposal of condemned/expired items.
   هـ) التخلص الآمن من المنتجات المعدمة/المنتهية.
F) Prevent cross contamination during waste handling.
   و) منع التلوث المتبادل أثناء التعامل مع النفايات.
G) PPE for waste handling (gloves, shoes).
   ز) PPE للتعامل مع النفايات (قفازات/حذاء).
H) Pest prevention linked to waste discipline.
   ح) منع الآفات عبر الانضباط بالنفايات.
I) Collection schedule and responsibilities.
   ط) جدول جمع النفايات والمسؤوليات.
J) Spill control during waste transport.
   ي) التحكم بالانسكاب أثناء نقل النفايات.
K) Records (condemnation/waste log if required).
   ك) السجلات (سجل إعدام/نفايات إذا مطلوب).
L) Corrective actions and improvement.
   ل) إجراءات تصحيحية وتحسين.`,

  "OHS: PPE & Safe Work": `A) Required PPE by task (gloves, shoes, apron, etc.).
   أ) PPE المطلوب حسب المهمة (قفازات/حذاء/مريول...).
B) PPE inspection, cleaning, and replacement.
   ب) فحص PPE وتنظيفه واستبداله.
C) Slips/trips prevention: dry floors, signage.
   ج) منع الانزلاق/التعثر: أرضية جافة ولافتات.
D) Safe behavior: no running, awareness and communication.
   د) سلوك آمن: منع الركض والانتباه والتواصل.
E) Near-miss reporting (why/how).
   هـ) الإبلاغ عن الحوادث القريبة (لماذا/كيف).
F) Safe use of equipment and electrical safety basics.
   و) استخدام آمن للمعدات وأساسيات السلامة الكهربائية.
G) Keep emergency exits clear at all times.
   ز) إبقاء مخارج الطوارئ خالية دائماً.
H) Manual handling awareness and asking for help.
   ح) وعي المناولة اليدوية وطلب المساعدة.
I) Knife/sharp tools safe practice awareness.
   ط) ممارسات آمنة للسكاكين/الأدوات الحادة.
J) Incident reporting procedure (who/when).
   ي) إجراءات الإبلاغ عن الحوادث (من/متى).
K) First response basics and escalation.
   ك) أساسيات الاستجابة الأولى والتصعيد.
L) Documentation and corrective actions.
   ل) التوثيق والإجراءات التصحيحية.`,

  "OHS: Knife Safety": `A) Knife handling rules (carry/pass/store).
   أ) قواعد التعامل مع السكين (حمل/تسليم/تخزين).
B) Cut-resistant glove: when mandatory and correct use.
   ب) قفاز مقاوم للقطع: متى إلزامي وكيف يُستخدم.
C) Cutting technique: stable board, controlled movements.
   ج) أسلوب التقطيع: لوح ثابت وحركة مسيطر عليها.
D) Sharpening rules: authorized person and safe method.
   د) قواعد الشحذ: شخص مخول وطريقة آمنة.
E) Never leave knives in sinks or hidden places.
   هـ) ممنوع ترك السكاكين في المغسلة أو أماكن مخفية.
F) Cleaning knives safely to avoid injury.
   و) تنظيف السكاكين بطريقة آمنة لتجنب الإصابة.
G) First aid for cuts + immediate reporting.
   ز) إسعاف أولي للجروح + إبلاغ فوري.
H) PPE and safety shoes requirement.
   ح) PPE والحذاء الآمن.
I) Housekeeping in cutting area.
   ط) ترتيب ونظافة منطقة التقطيع.
J) Unsafe conditions reporting (slippery floor, damaged knife).
   ي) الإبلاغ عن المخاطر (أرضية زلقة/سكين تالف).
K) Supervision checks and compliance.
   ك) تفتيش المشرف والالتزام.
L) Documentation and corrective actions.
   ل) التوثيق والإجراءات التصحيحية.`,

  "OHS: Manual Handling": `A) Assess load, plan route, and keep path clear.
   أ) تقييم الحمولة وتخطيط المسار وإبقاء الطريق خالٍ.
B) Correct lifting: bend knees, keep back straight.
   ب) رفع صحيح: ثني الركب وإبقاء الظهر مستقيماً.
C) Keep load close; avoid twisting (pivot with feet).
   ج) إبقاء الحمل قريباً ومنع الالتفاف (تحريك القدمين).
D) Use trolleys/equipment and ask for help for heavy loads.
   د) استخدام عربات/معدات وطلب مساعدة للأحمال الثقيلة.
E) Safe stacking height and stability.
   هـ) رص آمن وارتفاع مناسب وثبات.
F) Breaks and job rotation to reduce strain.
   و) استراحات وتدوير مهام لتقليل الإجهاد.
G) Report pain/strain early.
   ز) الإبلاغ المبكر عن الألم/الإجهاد.
H) Cold room specific risks (slip, restricted movement).
   ح) مخاطر غرفة التبريد (انزلاق/حركة محدودة).
I) PPE: safety shoes and gloves.
   ط) PPE: حذاء أمان وقفازات.
J) Near-miss reporting and learning.
   ي) الإبلاغ عن الحوادث القريبة والتعلم منها.
K) Supervision and coaching on technique.
   ك) إشراف وتوجيه على الطريقة.
L) Documentation and corrective actions.
   ل) التوثيق والإجراءات التصحيحية.`,

  "OHS: Fire Safety & Emergency": `A) Fire basics and common causes in workplace.
   أ) أساسيات الحريق وأسبابه الشائعة في العمل.
B) Emergency exits, assembly point, and evacuation route.
   ب) مخارج الطوارئ ونقطة التجمع ومسار الإخلاء.
C) Extinguishers types and PASS method (basic).
   ج) أنواع الطفايات وطريقة PASS (مبسط).
D) Alarm response and evacuation discipline.
   د) الاستجابة للإنذار والانضباط بالإخلاء.
E) Do not block exits/extinguishers (no storage).
   هـ) ممنوع إغلاق المخارج/الطفايات (لا تخزين).
F) Electrical safety and overload prevention.
   و) سلامة الكهرباء ومنع التحميل الزائد.
G) Gas/flame equipment precautions (if applicable).
   ز) احتياطات معدات الغاز/اللهب (إن وجدت).
H) Emergency contacts and reporting.
   ح) أرقام الطوارئ والإبلاغ.
I) Drill participation and attendance.
   ط) المشاركة بتمارين الإخلاء والحضور.
J) First response: isolate, call help, protect people.
   ي) الاستجابة الأولى: عزل/طلب مساعدة/حماية الأشخاص.
K) Post-incident reporting and actions.
   ك) تقرير ما بعد الحادث والإجراءات.
L) Documentation and corrective actions from drills.
   ل) التوثيق والإجراءات التصحيحية من التمارين.`,

  "OHS: First Aid & Incident Reporting": `A) First aid limits and when to call emergency services.
   أ) حدود الإسعاف الأولي ومتى نطلب الإسعاف.
B) First aid box location and responsible persons.
   ب) مكان صندوق الإسعاف والمسؤولين.
C) Incident reporting steps (who/when/how).
   ج) خطوات الإبلاغ عن الحوادث (من/متى/كيف).
D) Cuts: stop bleeding, dress, record.
   د) الجروح: إيقاف النزف وتضميد وتوثيق.
E) Burns: cool with water, protect, report.
   هـ) الحروق: تبريد بالماء وحماية وإبلاغ.
F) Fainting/heat stress: safe positioning and escalation.
   و) إغماء/إجهاد حراري: وضعية آمنة وتصعيد.
G) Chemical exposure: rinse and follow SDS.
   ز) تعرض كيميائي: شطف واتباع SDS.
H) Near-miss definition and reporting importance.
   ح) تعريف near-miss وأهمية الإبلاغ.
I) Basic investigation: what happened and why.
   ط) تحقيق مبسط: ماذا حدث ولماذا.
J) Corrective/preventive actions assignment and follow-up.
   ي) تحديد إجراءات تصحيحية/وقائية والمتابعة.
K) Return-to-work restrictions if needed.
   ك) قيود العودة للعمل عند الحاجة.
L) Documentation and QA/HS review.
   ل) التوثيق ومراجعة QA/السلامة.`,

  __DEFAULT__: DEFAULT_DETAILS_BI,
};

function getDetailsTemplate(moduleName) {
  return MODULE_DETAILS_BI[moduleName] || MODULE_DETAILS_BI.__DEFAULT__;
}

/* ===================== Question Bank (AR/EN per module) ===================== */
const QUESTION_BANK = {
  "Personnel Hygiene": {
    en: [
      { q: "When must hands be washed?", options: ["Before & after handling food", "Once per day", "Only when visibly dirty"], correct: 0 },
      { q: "Are jewelry and watches allowed while handling food?", options: ["Yes, always", "No", "Only a ring"], correct: 1 },
      { q: "What should you do if you have a cut on your hand?", options: ["Continue normally", "Cover with waterproof dressing + glove", "Rinse with water only"], correct: 1 },
      { q: "Best method to prevent cross contamination is:", options: ["Use the same tools for everything", "Separate tools/surfaces and sanitize", "Leave food uncovered"], correct: 1 },
      { q: "PPE stands for:", options: ["Personal Protective Equipment", "Ready-to-eat product", "Storage procedure"], correct: 0 },
    ],
    ar: [
      { q: "متى يجب غسل اليدين؟", options: ["قبل وبعد التعامل مع الطعام", "مرة واحدة يوميًا", "فقط عند الاتساخ"], correct: 0 },
      { q: "هل يسمح بارتداء المجوهرات/الساعة أثناء العمل؟", options: ["نعم دائمًا", "لا", "فقط الخاتم"], correct: 1 },
      { q: "ماذا نفعل عند وجود جرح باليد؟", options: ["نستمر بدون شيء", "نغطيه بضماد مقاوم للماء + قفاز", "نغسله بالماء فقط"], correct: 1 },
      { q: "أفضل طريقة لمنع التلوث المتبادل؟", options: ["استخدام نفس الأدوات دائمًا", "فصل الأدوات/الأسطح وتعقيمها", "ترك الطعام مكشوف"], correct: 1 },
      { q: "معنى PPE هو:", options: ["معدات الوقاية الشخصية", "منتج جاهز للأكل", "إجراء تخزين"], correct: 0 },
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
};

function pickQuestionsForModule(moduleName) {
  const pack = QUESTION_BANK[moduleName];
  if (pack?.en?.length) return pack;
  return {
    en: [{ q: "This training module requires QA-defined questions.", options: ["OK"], correct: 0 }],
    ar: [{ q: "هذا القسم يحتاج أسئلة من QA.", options: ["موافق"], correct: 0 }],
  };
}

export default function TrainingSessionCreate() {
  const nav = useNavigate();
  const [saving, setSaving] = useState(false);

  const DEFAULT_MODULE = "Personnel Hygiene";

  const [date, setDate] = useState(todayISO());
  const [branch, setBranch] = useState("POS 15");
  const [moduleName, setModuleName] = useState(DEFAULT_MODULE);

  // ✅ per-module template (EN/AR) + track manual edits
  const [details, setDetails] = useState(getDetailsTemplate(DEFAULT_MODULE));
  const [detailsTouched, setDetailsTouched] = useState(false);

  const [objectives, setObjectives] = useState(DEFAULT_OBJECTIVES);

  const [conductedBy, setConductedBy] = useState("");
  const [verifiedBy, setVerifiedBy] = useState("");

  const uniqueKey = useMemo(
    () => `${branch}__${date}__${moduleName}`.toLowerCase(),
    [branch, date, moduleName]
  );

  const title = useMemo(
    () => `Training Record • ${moduleName} • ${branch} • ${date}`,
    [moduleName, branch, date]
  );

  const questionsPack = useMemo(
    () => pickQuestionsForModule(moduleName),
    [moduleName]
  );

  const validate = () => {
    if (!date) return "Please select a Date.";
    if (!branch) return "Please select a Branch.";
    if (!moduleName) return "Please select a Training Module.";
    if (!details || String(details).trim().length < 10)
      return "Training details are required.";
    if (!objectives || String(objectives).trim().length < 10)
      return "Training objectives are required.";
    return "";
  };

  const onSave = async () => {
    const err = validate();
    if (err) return alert(err);

    setSaving(true);
    try {
      const existing = await listReportsByType(TYPE);
      const found = Array.isArray(existing)
        ? existing.find(
            (r) =>
              (r?.payload?.uniqueKey || "").toLowerCase() === uniqueKey
          )
        : null;

      if (found) {
        alert(
          "Duplicate session found for the same Branch + Date + Module ✅\nPlease change date/branch/module."
        );
        setSaving(false);
        return;
      }

      const payload = {
        ...DEFAULT_DOC,
        date,
        branch,
        moduleName,
        title,
        uniqueKey,
        details,
        objectives,
        conductedBy,
        verifiedBy,
        participants: [],
        approvals: { qaVerifiedAt: null, approvedAt: null },
        questionsBank: questionsPack, // { en: [...], ar: [...] }
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

  /* ===================== UI (WIDER / BIGGER) ✅ ===================== */
  const page = {
    minHeight: "100vh",
    width: "100%",
    padding: "22px 22px 28px",
    boxSizing: "border-box",
    direction: "ltr",
    fontFamily:
      "Cairo, system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif",
    background: "linear-gradient(135deg, #0ea5e9 0%, #7c3aed 55%, #111827 100%)",
  };

  const glass = {
    background: "rgba(255,255,255,0.92)",
    border: "1px solid rgba(255,255,255,0.65)",
    borderRadius: 22,
    boxShadow: "0 20px 60px rgba(15,23,42,0.18)",
    backdropFilter: "blur(12px)",
  };

  const section = { ...glass, padding: 18 };

  const label = { fontWeight: 1100, color: "#0f172a", fontSize: 14 };

  const input = {
    width: "100%",
    padding: "14px 14px",
    borderRadius: 14,
    border: "1px solid #e5e7eb",
    outline: "none",
    background: "rgba(255,255,255,0.95)",
    fontWeight: 950,
    fontSize: 14,
    color: "#0f172a",
    boxSizing: "border-box",
  };

  const textarea = {
    width: "100%",
    padding: 14,
    borderRadius: 14,
    border: "1px solid #e5e7eb",
    outline: "none",
    background: "rgba(255,255,255,0.95)",
    fontWeight: 900,
    fontSize: 14,
    lineHeight: 1.55,
    color: "#0f172a",
    fontFamily: "inherit",
    boxSizing: "border-box",
    resize: "vertical",
    minHeight: 220,
  };

  const btnPrimary = (disabled) => ({
    padding: "12px 16px",
    borderRadius: 14,
    border: "1px solid rgba(255,255,255,0.85)",
    background: disabled
      ? "linear-gradient(135deg, #94a3b8, #64748b)"
      : "linear-gradient(135deg, #111827, #2563eb)",
    color: "#fff",
    cursor: disabled ? "not-allowed" : "pointer",
    fontWeight: 1200,
    boxShadow: "0 12px 28px rgba(37,99,235,0.22)",
    whiteSpace: "nowrap",
    fontSize: 13,
  });

  const btnGhost = {
    padding: "12px 16px",
    borderRadius: 14,
    border: "1px solid #e5e7eb",
    background: "#fff",
    cursor: "pointer",
    fontWeight: 1200,
    whiteSpace: "nowrap",
    fontSize: 13,
  };

  const btnMini = (disabled) => ({
    padding: "9px 12px",
    borderRadius: 12,
    border: "1px solid #e5e7eb",
    background: disabled ? "#f1f5f9" : "#fff",
    cursor: disabled ? "not-allowed" : "pointer",
    fontWeight: 1200,
    fontSize: 12,
    whiteSpace: "nowrap",
  });

  const pill = {
    display: "inline-flex",
    alignItems: "center",
    gap: 8,
    padding: "9px 12px",
    borderRadius: 999,
    background: "linear-gradient(135deg, #eef2ff, #ffffff)",
    border: "1px solid #e5e7eb",
    fontWeight: 1100,
    color: "#0f172a",
    fontSize: 12,
    overflowX: "auto",
    maxWidth: "100%",
  };

  const kpiWrap = {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
    gap: 12,
    marginTop: 12,
  };

  const kpiCard = {
    background:
      "linear-gradient(135deg, rgba(238,242,255,1), rgba(255,255,255,1))",
    border: "1px solid #e5e7eb",
    borderRadius: 18,
    padding: 16,
    boxShadow: "0 10px 24px rgba(15,23,42,0.08)",
  };

  const kpiLabel = { color: "#64748b", fontSize: 12, fontWeight: 1100 };
  const kpiValue = {
    color: "#0f172a",
    fontSize: 22,
    fontWeight: 1300,
    marginTop: 6,
  };

  return (
    <div style={page}>
      {/* Header */}
      <div style={{ ...glass, padding: 18, maxWidth: 1800, margin: "0 auto" }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            gap: 10,
            flexWrap: "wrap",
            alignItems: "center",
          }}
        >
          <div>
            <div style={{ fontSize: 22, fontWeight: 1300, color: "#0f172a" }}>
              ➕ Create Training Session
            </div>
            <div
              style={{
                marginTop: 6,
                color: "#64748b",
                fontSize: 13,
                fontWeight: 1100,
              }}
            >
              Select module → Save. Each module automatically attaches its own
              Question Bank (AR/EN) to the session.
            </div>
          </div>

          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button onClick={() => nav("/training")} style={btnGhost}>
              ↩ Back
            </button>
          </div>
        </div>

        {/* KPI dashboard */}
        <div style={kpiWrap}>
          <div style={kpiCard}>
            <div style={kpiLabel}>Session Title</div>
            <div style={{ ...kpiValue, fontSize: 16 }}>{title}</div>
          </div>
          <div style={kpiCard}>
            <div style={kpiLabel}>Duplicate Key</div>
            <div
              style={{
                ...kpiValue,
                fontSize: 14,
                fontFamily:
                  "ui-monospace, Menlo, Monaco, Consolas, 'Courier New', monospace",
              }}
            >
              {uniqueKey}
            </div>
          </div>
          <div style={kpiCard}>
            <div style={kpiLabel}>Questions (EN)</div>
            <div style={kpiValue}>{questionsPack?.en?.length || 0}</div>
          </div>
          <div style={kpiCard}>
            <div style={kpiLabel}>Questions (AR)</div>
            <div style={kpiValue}>{questionsPack?.ar?.length || 0}</div>
          </div>
        </div>

        <div style={{ marginTop: 10 }}>
          <div style={pill}>
            <span style={{ opacity: 0.8 }}>Module Details Template:</span>
            <b>{moduleName}</b>
            {detailsTouched ? (
              <span style={{ opacity: 0.7 }}>• edited</span>
            ) : (
              <span style={{ opacity: 0.7 }}>• auto</span>
            )}
          </div>
        </div>
      </div>

      {/* Body */}
      <div
        style={{
          maxWidth: 1800,
          margin: "14px auto 0",
          display: "grid",
          gap: 14,
        }}
      >
        {/* Meta section */}
        <div style={section}>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
              gap: 12,
            }}
          >
            <div style={{ display: "grid", gap: 8 }}>
              <div style={label}>Date</div>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                style={input}
              />
            </div>

            <div style={{ display: "grid", gap: 8 }}>
              <div style={label}>Branch</div>
              <select
                value={branch}
                onChange={(e) => setBranch(e.target.value)}
                style={input}
              >
                {BRANCHES.map((b) => (
                  <option key={b} value={b}>
                    {b}
                  </option>
                ))}
              </select>
            </div>

            <div style={{ display: "grid", gap: 8 }}>
              <div style={label}>Module</div>
              <select
                value={moduleName}
                onChange={(e) => {
                  const next = e.target.value;
                  setModuleName(next);

                  // ✅ auto-change details only if user didn't edit
                  if (!detailsTouched) {
                    setDetails(getDetailsTemplate(next));
                  }
                }}
                style={input}
              >
                {MODULES.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            </div>

            <div style={{ display: "grid", gap: 8 }}>
              <div style={label}>Conducted By</div>
              <input
                value={conductedBy}
                onChange={(e) => setConductedBy(e.target.value)}
                placeholder="Trainer name"
                style={input}
              />
            </div>

            <div style={{ display: "grid", gap: 8 }}>
              <div style={label}>Verified By</div>
              <input
                value={verifiedBy}
                onChange={(e) => setVerifiedBy(e.target.value)}
                placeholder="QA / Food Safety Team Leader"
                style={input}
              />
            </div>
          </div>

          <div
            style={{
              marginTop: 12,
              display: "flex",
              justifyContent: "space-between",
              gap: 10,
              flexWrap: "wrap",
              alignItems: "center",
            }}
          >
            <div style={{ display: "grid", gap: 6 }}>
              <div style={{ color: "#64748b", fontWeight: 1100, fontSize: 12 }}>
                Duplicate Prevention Key
              </div>
              <div style={pill}>
                <span style={{ opacity: 0.8 }}>uniqueKey:</span>
                <span
                  style={{
                    fontFamily:
                      "ui-monospace, Menlo, Monaco, Consolas, 'Courier New', monospace",
                  }}
                >
                  {uniqueKey}
                </span>
              </div>
            </div>

            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              <button
                onClick={onSave}
                disabled={saving}
                style={btnPrimary(saving)}
              >
                {saving ? "Saving..." : "💾 Save Session"}
              </button>
              <button onClick={() => nav("/training")} style={btnGhost}>
                Cancel
              </button>
            </div>
          </div>
        </div>

        {/* ✅ WIDER PANELS: Details FULL-WIDTH + Right cards below */}
        <div style={{ display: "grid", gap: 14 }}>
          {/* Details (FULL WIDTH) */}
          <div style={section}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                gap: 10,
                alignItems: "center",
                flexWrap: "wrap",
              }}
            >
              <div style={{ fontSize: 18, fontWeight: 1300, color: "#0f172a" }}>
                DETAIL OF TRAINING (A–L) — EN / AR
              </div>

              <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                <div style={{ color: "#64748b", fontWeight: 1100, fontSize: 12 }}>
                  {detailsTouched ? "Edited (won't auto-change)" : "Auto-filled per module"}
                </div>

                <button
                  style={btnMini(false)}
                  onClick={() => {
                    setDetails(getDetailsTemplate(moduleName));
                    setDetailsTouched(false);
                  }}
                  title="Reset details to the selected module template"
                >
                  ♻ Reset to Template
                </button>
              </div>
            </div>

            <div style={{ marginTop: 10 }}>
              <textarea
                value={details}
                onChange={(e) => {
                  setDetailsTouched(true);
                  setDetails(e.target.value);
                }}
                style={{ ...textarea, minHeight: 460 }}
              />
            </div>
          </div>

          {/* Objectives + Metadata (two wide cards) */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(420px, 1fr))",
              gap: 14,
            }}
          >
            <div style={section}>
              <div style={{ fontSize: 18, fontWeight: 1300, color: "#0f172a" }}>
                Objectives / Frequency / Evaluation
              </div>
              <div style={{ marginTop: 10 }}>
                <textarea
                  value={objectives}
                  onChange={(e) => setObjectives(e.target.value)}
                  style={{ ...textarea, minHeight: 260 }}
                />
              </div>
            </div>

            <div style={section}>
              <div style={{ fontSize: 18, fontWeight: 1300, color: "#0f172a" }}>
                Document Metadata
              </div>

              <div
                style={{
                  marginTop: 12,
                  display: "grid",
                  gap: 10,
                  color: "#0f172a",
                  fontWeight: 1100,
                  fontSize: 14,
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
                  <span style={{ color: "#64748b" }}>Document Number</span>
                  <span>{DEFAULT_DOC.documentNumber}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
                  <span style={{ color: "#64748b" }}>Issue Date</span>
                  <span>{DEFAULT_DOC.issueDate}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
                  <span style={{ color: "#64748b" }}>Revision</span>
                  <span>{DEFAULT_DOC.revisionNo}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
                  <span style={{ color: "#64748b" }}>Issued By</span>
                  <span>{DEFAULT_DOC.issuedBy}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
                  <span style={{ color: "#64748b" }}>Approved By</span>
                  <span>{DEFAULT_DOC.approvedBy}</span>
                </div>
              </div>

              <div style={{ marginTop: 12, color: "#64748b", fontSize: 12, fontWeight: 1000 }}>
                ✅ Questions are attached automatically per module (AR/EN). Quiz page will use them.
              </div>
            </div>
          </div>
        </div>

        <div style={{ textAlign: "left", color: "rgba(255,255,255,0.9)", fontWeight: 1000 }}>
          Built by Eng. Mohammed Abdullah
        </div>
      </div>
    </div>
  );
}
