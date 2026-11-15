// src/pages/haccp and iso/dmInspectionShared.js
// Municipality inspection visits — what the register and the entry form share:
// the record shape, the fixed lists and every visible string (EN / AR).
//
// Record (reports.type = "municipality_inspection", one row per visit):
//   municipality · branchName · inspectionDate · inspectionGrade · notes
//   images[] · pdfs[]                                   ← as before
//   visitType · outcome · inspectorName · referenceNo · fineAmount
//   findings[] = { id, text, action, owner, due, status: "open" | "closed", closedAt }
// The fields under the line are new and optional: an old record simply has
// none of them and shows as before.

export const TYPE = "municipality_inspection";

export const MUNICIPALITIES = ["Dubai Municipality", "Abu Dhabi Municipality", "Sharjah Municipality", "Ajman Municipality"];

/* The sites a visit can be logged against. Typing another name is allowed —
   this list only keeps the common ones spelled one way. */
export const BRANCHES = [
  "QCS", "Production", "Kitchen", "POS 6", "POS 7", "POS 10", "POS 11", "POS 14", "POS 15", "POS 16", "POS 17",
  "POS 19", "POS 21", "POS 24", "POS 25", "POS 26", "POS 37", "POS 38", "POS 42", "POS 44", "POS 45", "FTR 1", "FTR 2",
];

export const GRADES = ["A", "B", "C", "D", "E"];

export const VISIT_TYPES = [
  { id: "routine", en: "Routine", ar: "دورية" },
  { id: "followup", en: "Follow-up", ar: "متابعة" },
  { id: "complaint", en: "After a complaint", ar: "بعد شكوى" },
  { id: "licence", en: "Licence / permit", ar: "ترخيص / تصريح" },
  { id: "other", en: "Other", ar: "أخرى" },
];

export const OUTCOMES = [
  { id: "pass", en: "Passed", ar: "ناجح", tone: "green" },
  { id: "remarks", en: "Passed with remarks", ar: "ناجح مع ملاحظات", tone: "amber" },
  { id: "warning", en: "Warning", ar: "إنذار", tone: "amber" },
  { id: "fine", en: "Fine", ar: "مخالفة / غرامة", tone: "red" },
  { id: "closure", en: "Closure", ar: "إغلاق", tone: "red" },
];

export const listLabel = (list, id, lang) => {
  const x = list.find((o) => o.id === id);
  return x ? (lang === "ar" ? x.ar : x.en) : "";
};

export function todayDubai() {
  try { return new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Dubai" }); }
  catch { return new Date().toISOString().slice(0, 10); }
}

export const newId = () => `${Date.now()}_${Math.random().toString(16).slice(2)}`;

/** A date value as YYYY-MM-DD ("" when there is none). */
export function dayOf(v) {
  if (!v) return "";
  if (typeof v === "string" && /^\d{4}-\d{2}-\d{2}/.test(v)) return v.slice(0, 10);
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? "" : d.toISOString().slice(0, 10);
}

/** DD/MM/YYYY for the screen. */
export function showDate(v) {
  const d = dayOf(v);
  return d ? `${d.slice(8, 10)}/${d.slice(5, 7)}/${d.slice(0, 4)}` : "—";
}

function files(list, wantPdf) {
  const seen = new Set();
  return (Array.isArray(list) ? list : [])
    .map((x, i) => {
      if (!x) return null;
      const url = typeof x === "string" ? x : x.url || x.dataUrl || x.src || "";
      if (!url || seen.has(url)) return null;
      const mime = typeof x === "object" ? String(x.mime || x.type || "").toLowerCase() : "";
      const low = url.toLowerCase();
      const isPdf = mime === "application/pdf" || low.startsWith("data:application/pdf") || low.includes(".pdf");
      if (isPdf !== wantPdf) return null;
      seen.add(url);
      return { url, name: (typeof x === "object" && x.name) || `${wantPdf ? "PDF" : "Image"} ${i + 1}`, mime, size: (typeof x === "object" && x.size) || 0 };
    })
    .filter(Boolean);
}

/** A server row → the shape both screens work with. Old records included. */
export function normalizeVisit(raw) {
  const p = raw?.payload || raw || {};
  const pdfPool = []
    .concat(Array.isArray(p.pdfs) ? p.pdfs : [], Array.isArray(p.files) ? p.files : [], Array.isArray(p.attachments) ? p.attachments : [])
    .concat(p.pdf ? [p.pdf] : [], p.file ? [p.file] : []);
  return {
    id: raw?.id || raw?._id || null,
    payload: p,
    createdAt: raw?.createdAt || raw?.created_at || p.savedAt || null,
    municipality: p.municipality || "",
    branchName: p.branchName || p.branch || "",
    inspectionDate: dayOf(p.inspectionDate || p.date),
    inspectionGrade: String(p.inspectionGrade || p.grade || p.score || ""),
    visitType: p.visitType || "",
    outcome: p.outcome || "",
    inspectorName: p.inspectorName || "",
    referenceNo: p.referenceNo || "",
    fineAmount: p.fineAmount || "",
    notes: p.notes || "",
    findings: (Array.isArray(p.findings) ? p.findings : []).map((f) => ({
      id: f.id || newId(), text: f.text || "", action: f.action || "", owner: f.owner || "",
      due: dayOf(f.due), status: f.status === "closed" ? "closed" : "open", closedAt: f.closedAt || "",
    })),
    images: files(p.images, false),
    pdfs: files(pdfPool, true),
  };
}

export const openFindings = (v) => v.findings.filter((f) => f.status !== "closed");
export const overdueFindings = (v, today = todayDubai()) => openFindings(v).filter((f) => f.due && f.due < today);

/** Colour of a grade pill: letter grades and percentages. */
export function gradeTone(grade) {
  const g = String(grade || "").trim().toUpperCase();
  const n = parseFloat(g);
  if (g === "A" || n >= 90) return "green";
  if (g === "B" || n >= 75) return "blue";
  if (g === "C" || n >= 60) return "amber";
  if (g === "D" || g === "E" || n < 60) return "red";
  return "grey";
}

export const DM_T = {
  en: {
    title: "Municipality Inspections", titleNew: "New Municipality Visit", titleEdit: "Edit Municipality Visit",
    sub: "Every municipality visit: grade, outcome, findings and their corrective actions, with the visit papers.",
    subForm: "Log the visit, attach the inspector's report and list each finding with who fixes it and by when.",
    clause: "ISO 4.2",
    newVisit: "+ New visit", register: "Register", refresh: "Refresh", loading: "Loading…", exportCsv: "Export Excel (CSV)", print: "Print",
    // stats
    sVisits: "Visits shown", sYear: "Visits this year", sOpen: "Open findings", sOverdue: "Overdue findings", sLast: "Last visit",
    // filters
    search: "Search", searchPh: "Branch, grade, inspector, reference, notes…",
    municipality: "Municipality", branch: "Branch", outcome: "Outcome", from: "From", to: "To", sort: "Sort by", all: "All",
    sortNew: "Newest first", sortOld: "Oldest first", sortBranch: "Branch (A–Z)", sortOpen: "Most open findings",
    clear: "Clear filters", onlyOpen: "Only visits with open findings", onlyOverdue: "Only visits with overdue findings",
    shown: (a, b) => `${a} of ${b} visits`,
    none: "No visit matches the filters.", empty: "No municipality visit has been logged yet.",
    loadErr: "Could not load the visits.",
    // card + details
    grade: "Grade / score", visitType: "Visit type", inspector: "Inspector", reference: "Report / reference no.",
    fine: "Fine amount (AED)", date: "Visit date", notes: "Notes", images: "Photos", pdfs: "PDF files",
    nImages: (n) => `${n} photo${n !== 1 ? "s" : ""}`, nPdfs: (n) => `${n} PDF${n !== 1 ? "s" : ""}`,
    nOpen: (n) => `${n} open`, nOverdue: (n) => `${n} overdue`, allClosed: "All findings closed",
    findings: "Findings & corrective actions", noFindings: "No findings recorded for this visit.",
    fText: "Finding", fAction: "Corrective action", fOwner: "Responsible", fDue: "Due", fStatus: "Status",
    open: "Open", closed: "Closed", overdue: "Overdue", closeIt: "Mark closed", reopen: "Reopen",
    edit: "Edit", del: "Delete", delConfirm: "Delete this visit permanently? This cannot be undone.",
    deleted: "Visit deleted.", delErr: "Delete failed.", saveErr: "Could not save the change.",
    openTab: "Open", noFiles: "Nothing attached.",
    // form
    details: "Visit details", attach: "Visit papers",
    attachHint: "Photos are compressed and uploaded as you add them. PDF up to 10 MB each.",
    addImages: "+ Add photos", addPdfs: "+ Add PDFs", uploading: "Uploading…", remove: "Remove",
    noImages: "No photos yet.", noPdfs: "No PDF yet.",
    addFinding: "+ Add finding", findingsHint: "One row per remark of the inspector. Leave empty when the visit had none.",
    branchPh: "Pick or type the branch", gradePh: "A–E or a score, e.g. 92%", notesPh: "Anything worth remembering about this visit…",
    save: "Save visit", saveEdit: "Save changes", saving: "Saving…", cancel: "Cancel",
    saved: "Visit saved.", need: "This field is required.",
    upErr: "Upload failed. Try again with fewer or smaller files.", pdfBig: (n) => `${n} is larger than 10 MB and was skipped.`,
    notFound: "This visit no longer exists.",
  },
  ar: {
    title: "تفتيش البلدية", titleNew: "زيارة بلدية جديدة", titleEdit: "تعديل زيارة البلدية",
    sub: "كل زيارات البلدية: التقييم والنتيجة والملاحظات وإجراءاتها التصحيحية، مع أوراق الزيارة.",
    subForm: "سجّل الزيارة، أرفق تقرير المفتش، واكتب كل ملاحظة مع من يعالجها ومتى.",
    clause: "البند 4.2",
    newVisit: "+ زيارة جديدة", register: "السجل", refresh: "تحديث", loading: "جارٍ التحميل…", exportCsv: "تصدير Excel (CSV)", print: "طباعة",
    sVisits: "الزيارات المعروضة", sYear: "زيارات هذه السنة", sOpen: "ملاحظات مفتوحة", sOverdue: "ملاحظات متأخرة", sLast: "آخر زيارة",
    search: "بحث", searchPh: "الفرع، التقييم، المفتش، رقم التقرير، الملاحظات…",
    municipality: "البلدية", branch: "الفرع", outcome: "النتيجة", from: "من", to: "إلى", sort: "الترتيب", all: "الكل",
    sortNew: "الأحدث أولًا", sortOld: "الأقدم أولًا", sortBranch: "الفرع (أ–ي)", sortOpen: "الأكثر ملاحظات مفتوحة",
    clear: "مسح الفلاتر", onlyOpen: "الزيارات التي فيها ملاحظات مفتوحة فقط", onlyOverdue: "الزيارات التي فيها ملاحظات متأخرة فقط",
    shown: (a, b) => `${a} من ${b} زيارة`,
    none: "لا توجد زيارة مطابقة للفلاتر.", empty: "لم تُسجَّل أي زيارة بلدية بعد.",
    loadErr: "تعذّر تحميل الزيارات.",
    grade: "التقييم / الدرجة", visitType: "نوع الزيارة", inspector: "المفتش", reference: "رقم التقرير / المرجع",
    fine: "قيمة الغرامة (درهم)", date: "تاريخ الزيارة", notes: "ملاحظات عامة", images: "الصور", pdfs: "ملفات PDF",
    nImages: (n) => `${n} صورة`, nPdfs: (n) => `${n} PDF`,
    nOpen: (n) => `${n} مفتوحة`, nOverdue: (n) => `${n} متأخرة`, allClosed: "كل الملاحظات مغلقة",
    findings: "الملاحظات والإجراءات التصحيحية", noFindings: "لا توجد ملاحظات مسجّلة لهذه الزيارة.",
    fText: "الملاحظة", fAction: "الإجراء التصحيحي", fOwner: "المسؤول", fDue: "الاستحقاق", fStatus: "الحالة",
    open: "مفتوحة", closed: "مغلقة", overdue: "متأخرة", closeIt: "إغلاق", reopen: "إعادة فتح",
    edit: "تعديل", del: "حذف", delConfirm: "حذف هذه الزيارة نهائيًا؟ لا يمكن التراجع.",
    deleted: "تم حذف الزيارة.", delErr: "فشل الحذف.", saveErr: "تعذّر حفظ التغيير.",
    openTab: "فتح", noFiles: "لا مرفقات.",
    details: "بيانات الزيارة", attach: "أوراق الزيارة",
    attachHint: "الصور تُضغط وتُرفع فور إضافتها. حجم ملف PDF حتى 10 ميغابايت.",
    addImages: "+ إضافة صور", addPdfs: "+ إضافة PDF", uploading: "جارٍ الرفع…", remove: "إزالة",
    noImages: "لا صور بعد.", noPdfs: "لا ملف PDF بعد.",
    addFinding: "+ إضافة ملاحظة", findingsHint: "صف لكل ملاحظة ذكرها المفتش. اتركها فارغة إذا لم تكن هناك ملاحظات.",
    branchPh: "اختر الفرع أو اكتبه", gradePh: "من A إلى E أو درجة، مثل 92%", notesPh: "أي شيء يستحق التذكّر عن هذه الزيارة…",
    save: "حفظ الزيارة", saveEdit: "حفظ التعديلات", saving: "جارٍ الحفظ…", cancel: "إلغاء",
    saved: "تم حفظ الزيارة.", need: "هذا الحقل مطلوب.",
    upErr: "فشل الرفع. حاول بملفات أقل أو أصغر.", pdfBig: (n) => `${n} أكبر من 10 ميغابايت وتم تخطّيه.`,
    notFound: "هذه الزيارة لم تعد موجودة.",
  },
};
