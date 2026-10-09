// src/pages/monitor/branches/qcs/employeeWarningCore.js
// -----------------------------------------------------------------------------
// Employee Warning / Notice (إنذار / تنبيه داخلي) — shared by the input and the
// viewer: levels, violation categories, EN/AR wording, the employee's warning
// history, the e-mail body, the English PDF (jsPDF cannot shape Arabic) and the
// printable sheet (browser print, so it follows the screen language).
// One language per screen: everything takes `lang` ("en" | "ar").
// -----------------------------------------------------------------------------

import API_BASE from "../../../../config/api";
import { thumbUrl } from "../../../../utils/imageUpload";
import { normalizeEmpNo, normalizeName } from "../_shared/staffRegistry";
import { getSettingsLang } from "../../../settings/_shared/settingsI18n";

export const TYPE = "qcs_employee_warning";

export const DOC_META = {
  docTitle: "Employee Warning / Notice",
  docTitleAr: "إنذار / تنبيه موظف",
  docNo: "AM/QA/EW/1",
  issueDate: "2026-10-09",
  area: "QA — All Sites",
  controllingOfficer: "QA",
  issuedBy: "MOHAMAD ABDULLAH",
  approvedBy: "Hussam O. Sarhan",
};

/* Ordered from mildest to most serious — the history uses the order to
   suggest the next step. */
export const LEVELS = [
  { id: "notice", en: "Notice (Advisory)",     ar: "تنبيه",            color: "#0284c7",
    consequence: "This is an advisory notice. Repeating the same violation will lead to a formal warning.",
    consequenceAr: "هذا تنبيه إرشادي. تكرار نفس المخالفة سيؤدي إلى إنذار رسمي." },
  { id: "verbal", en: "Verbal Warning",         ar: "إنذار شفهي",       color: "#d97706",
    consequence: "Repeating this violation will lead to a first written warning.",
    consequenceAr: "تكرار هذه المخالفة سيؤدي إلى إنذار كتابي أول." },
  { id: "first",  en: "First Written Warning",  ar: "إنذار كتابي أول",  color: "#ea580c",
    consequence: "Repeating this violation will lead to a second written warning and may affect your evaluation.",
    consequenceAr: "تكرار هذه المخالفة سيؤدي إلى إنذار كتابي ثانٍ وقد يؤثر على تقييمك." },
  { id: "second", en: "Second Written Warning", ar: "إنذار كتابي ثانٍ", color: "#dc2626",
    consequence: "Repeating this violation will lead to a final warning and disciplinary action.",
    consequenceAr: "تكرار هذه المخالفة سيؤدي إلى إنذار نهائي وإجراء تأديبي." },
  { id: "final",  en: "Final Warning",          ar: "إنذار نهائي",      color: "#7f1d1d",
    consequence: "Any further violation will be referred to management/HR for disciplinary action, which may include termination.",
    consequenceAr: "أي مخالفة أخرى ستُحال إلى الإدارة / الموارد البشرية لاتخاذ إجراء تأديبي قد يصل إلى إنهاء الخدمة." },
];
export const levelById = (id) => LEVELS.find((l) => l.id === id) || LEVELS[0];
export const levelIndex = (id) => Math.max(0, LEVELS.findIndex((l) => l.id === id));
export const levelName = (id, lang = "en") => (lang === "ar" ? levelById(id).ar : levelById(id).en);
export const defaultConsequence = (id, lang = "en") =>
  (lang === "ar" ? levelById(id).consequenceAr : levelById(id).consequence);

export const CATEGORIES = [
  { id: "hygiene",     en: "Personal Hygiene",         ar: "النظافة الشخصية" },
  { id: "uniform",     en: "Uniform / PPE",            ar: "الزي / معدات الوقاية" },
  { id: "food_safety", en: "Food Safety Procedure",    ar: "إجراءات سلامة الغذاء" },
  { id: "temperature", en: "Temperature Control",      ar: "التحكم بالحرارة" },
  { id: "cleaning",    en: "Cleaning & Sanitation",    ar: "التنظيف والتعقيم" },
  { id: "cross",       en: "Cross-Contamination",      ar: "التلوث الخلطي" },
  { id: "records",     en: "Records / Documentation",  ar: "السجلات / التوثيق" },
  { id: "hse",         en: "Health & Safety",          ar: "الصحة والسلامة" },
  { id: "attendance",  en: "Attendance / Punctuality", ar: "الحضور / الالتزام بالمواعيد" },
  { id: "conduct",     en: "Conduct / Behaviour",      ar: "السلوك" },
  { id: "other",       en: "Other",                    ar: "أخرى" },
];
export const catName = (id, lang = "en") => {
  const c = CATEGORIES.find((x) => x.id === id);
  return c ? (lang === "ar" ? c.ar : c.en) : id;
};
export const catEn = (id) => catName(id, "en");

export const SITES = [
  "QCS", "Production", "POS 6", "POS 10", "POS 11", "POS 15", "POS 19",
  "POS 24", "POS 26", "FTR 1", "FTR 2",
];

/* ═══════════════════════════ Wording ═══════════════════════════ */
const STR = {
  company:        { en: "AL MAWASHI", ar: "المواشي" },
  companyLegal:   { en: "Trans Emirates Livestock Trading L.L.C.", ar: "عبر الإمارات لتجارة المواشي ذ.م.م" },
  docNo:          { en: "Doc No", ar: "رقم الوثيقة" },
  area:           { en: "Area", ar: "المنطقة" },
  areaVal:        { en: "QA — All Sites", ar: "الجودة — جميع المواقع" },
  date:           { en: "Date", ar: "التاريخ" },
  empNo:          { en: "Employee No", ar: "الرقم الوظيفي" },
  empNoPh:        { en: "Type the employee number", ar: "اكتب الرقم الوظيفي" },
  empFound:       { en: "✓ Found in the employee register", ar: "✓ موجود في سجل الموظفين" },
  empMissing:     { en: "Not in the register — type the name", ar: "غير موجود في السجل — اكتب الاسم" },
  empName:        { en: "Employee Name *", ar: "اسم الموظف *" },
  empNamePh:      { en: "Filled from the number", ar: "يُعبّأ من الرقم الوظيفي" },
  employee:       { en: "Employee", ar: "الموظف" },
  position:       { en: "Position", ar: "الوظيفة" },
  positionPh:     { en: "e.g. Butcher", ar: "مثال: قصّاب" },
  site:           { en: "Site / Branch", ar: "الموقع / الفرع" },
  noHistory:      { en: "No earlier warnings for this employee.", ar: "لا توجد إنذارات سابقة لهذا الموظف." },
  activeN:        { en: "{n} active warning(s) in the last 12 months", ar: "{n} إنذار ساري خلال آخر 12 شهراً" },
  totalN:         { en: " ({n} in total)", ar: " (المجموع {n})" },
  suggested:      { en: " — suggested step: {x}", ar: " — الدرجة المقترحة: {x}" },
  level:          { en: "Warning level", ar: "درجة الإنذار" },
  violationType:  { en: "Type of violation *", ar: "نوع المخالفة *" },
  violation:      { en: "Violation", ar: "المخالفة" },
  incidentDate:   { en: "Incident date", ar: "تاريخ المخالفة" },
  time:           { en: "Time", ar: "الوقت" },
  incident:       { en: "Incident", ar: "المخالفة (التاريخ / الوقت)" },
  location:       { en: "Location / Area", ar: "المكان / القسم" },
  locationPh:     { en: "e.g. Chiller 2, cutting room", ar: "مثال: براد 2، غرفة التقطيع" },
  description:    { en: "Description of the violation", ar: "وصف المخالفة" },
  descriptionPh:  { en: "What happened, what was observed…", ar: "ماذا حدث، وماذا لوحظ…" },
  photos:         { en: "Photos of the violation", ar: "صور المخالفة" },
  addPhoto:       { en: "📷 Add photo", ar: "📷 إضافة صورة" },
  removePhoto:    { en: "Remove photo", ar: "حذف الصورة" },
  corrective:     { en: "Required corrective action", ar: "الإجراء التصحيحي المطلوب" },
  correctivePh:   { en: "What the employee must do / change…", ar: "ما يجب على الموظف فعله / تغييره…" },
  byDate:         { en: " (by {d})", ar: " (قبل {d})" },
  consequence:    { en: "Consequence of repetition", ar: "عاقبة التكرار" },
  improvementBy:  { en: "Improvement required by", ar: "مطلوب التحسن قبل" },
  previous:       { en: "Active warnings before this one", ar: "الإنذارات السارية قبل هذا الإنذار" },
  issuedBy:       { en: "Issued by", ar: "صادر عن" },
  issuedByReq:    { en: "Issued by *", ar: "صادر عن *" },
  fullName:       { en: "Full name", ar: "الاسم الكامل" },
  ack:            { en: "Employee acknowledgement", ar: "إقرار الموظف" },
  ackName:        { en: "Employee name", ar: "اسم الموظف" },
  refused:        { en: "Employee refused to sign", ar: "رفض الموظف التوقيع" },
  refusedShort:   { en: "Refused to sign", ar: "رفض التوقيع" },
  witness:        { en: "Witness", ar: "الشاهد" },
  approvedBy:     { en: "Approved by", ar: "اعتمده" },
  managerName:    { en: "Manager name", ar: "اسم المدير" },
  signature:      { en: "Signature", ar: "التوقيع" },
  issueBtn:       { en: "📝 Issue {x}", ar: "📝 إصدار {x}" },
  saving:         { en: "Saving…", ar: "جارٍ الحفظ…" },
  saved:          { en: "✅ Saved — print or e-mail it from the viewer", ar: "✅ تم الحفظ — اطبعه أو أرسله من صفحة العرض" },
  saveFailed:     { en: "❌ Failed to save", ar: "❌ فشل الحفظ" },
  errDate:        { en: "Please select the date.", ar: "يرجى اختيار التاريخ." },
  errName:        { en: "Please enter the employee name.", ar: "يرجى إدخال اسم الموظف." },
  errCat:         { en: "Please choose at least one violation type.", ar: "يرجى اختيار نوع مخالفة واحد على الأقل." },
  errDesc:        { en: "Please describe the violation.", ar: "يرجى كتابة وصف المخالفة." },
  errIssuer:      { en: "Please enter who is issuing the warning.", ar: "يرجى إدخال اسم مُصدر الإنذار." },
  errUploading:   { en: "Please wait for the photos to finish uploading.", ar: "يرجى الانتظار حتى ينتهي رفع الصور." },
  uploadFailed:   { en: "Photo upload failed: ", ar: "فشل رفع الصورة: " },
  ackText:        { en: "I acknowledge that I have received this warning and that its content was explained to me. My signature does not necessarily mean I agree with it.",
                    ar: "أقرّ باستلامي هذا الإنذار وأنه تم شرح مضمونه لي، ولا يعني توقيعي بالضرورة موافقتي عليه." },
  // viewer
  records:        { en: "⚠️ Employee Warnings — Records", ar: "⚠️ إنذارات الموظفين — السجلات" },
  all:            { en: "All", ar: "الكل" },
  searchPh:       { en: "🔍 Employee, no., violation, site…", ar: "🔍 موظف، رقم، مخالفة، فرع…" },
  allMonths:      { en: "All months", ar: "كل الأشهر" },
  noneFound:      { en: "No warnings found.", ar: "لا توجد إنذارات." },
  selectOne:      { en: "Select a warning from the list to view it.", ar: "اختر إنذاراً من القائمة لعرضه." },
  print:          { en: "🖨 Print", ar: "🖨 طباعة" },
  pdf:            { en: "⬇ PDF", ar: "⬇ PDF" },
  email:          { en: "📨 Email", ar: "📨 إيميل" },
  del:            { en: "🗑 Delete", ar: "🗑 حذف" },
  delConfirm:     { en: "Delete this warning? Its photos are deleted too.", ar: "حذف هذا الإنذار؟ ستُحذف صوره أيضاً." },
  delFailed:      { en: "Failed to delete.", ar: "فشل الحذف." },
  loadFailed:     { en: "Failed to load records.", ar: "فشل تحميل السجلات." },
  pdfFailed:      { en: "PDF failed: ", ar: "فشل إنشاء PDF: " },
  pdfNote:        { en: "", ar: "ملف PDF يصدر بالإنجليزية فقط." },
  others:         { en: "Other warnings for this employee ({n})", ar: "إنذارات أخرى لهذا الموظف ({n})" },
  none:           { en: "None.", ar: "لا يوجد." },
  photosN:        { en: "📷 Photos ({n})", ar: "📷 الصور ({n})" },
  popup:          { en: "Please allow pop-ups to print.", ar: "يرجى السماح بالنوافذ المنبثقة للطباعة." },
};

/** tr(lang, key, {n, x, d}) — fills the {placeholders}. */
export function tr(lang, key, vars = {}) {
  const e = STR[key];
  let s = e ? (lang === "ar" ? e.ar : e.en) : key;
  Object.entries(vars).forEach(([k, v]) => { s = s.split(`{${k}}`).join(String(v)); });
  return s;
}

export const dmy = (d) => {
  if (!d) return "—";
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(d));
  return m ? `${m[3]}/${m[2]}/${m[1]}` : String(d);
};

export const recId = (r) => r?._id || r?.id || null;

/* Same person = same employee number, or the same name when either side has
   no number. */
export function sameEmployee(a, b) {
  const na = normalizeEmpNo(a?.employeeNo), nb = normalizeEmpNo(b?.employeeNo);
  if (na && nb) return na === nb;
  const xa = normalizeName(a?.employeeName), xb = normalizeName(b?.employeeName);
  return !!xa && xa === xb;
}

export async function fetchWarnings(reporter = "qcs", type = TYPE, signal) {
  const res = await fetch(
    `${API_BASE}/api/reports?reporter=${encodeURIComponent(reporter)}&type=${encodeURIComponent(type)}`,
    { cache: "no-store", signal }
  );
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = await res.json();
  const arr = Array.isArray(data) ? data : (data.reports || data.data || []);
  return arr
    .map((r, i) => ({ ...r, _id: r._id || r.id || `rec-${i}` }))
    .sort((a, b) => String(b.payload?.date || "").localeCompare(String(a.payload?.date || ""))
      || (b.payload?.savedAt || 0) - (a.payload?.savedAt || 0));
}

/* Warnings older than this no longer count toward the next step. */
export const ACTIVE_MONTHS = 12;

export function isActive(p, today = new Date()) {
  if (!p?.date) return true;
  const d = new Date(p.date);
  const cut = new Date(today);
  cut.setMonth(cut.getMonth() - ACTIVE_MONTHS);
  return d >= cut;
}

/** The employee's other warnings (newest first) and the suggested next level. */
export function historyFor(records, who, excludeId = null) {
  const list = (records || []).filter((r) => recId(r) !== excludeId && sameEmployee(r.payload, who));
  const active = list.filter((r) => isActive(r.payload));
  const top = active.reduce((m, r) => Math.max(m, levelIndex(r.payload?.level)), -1);
  const suggested = LEVELS[Math.min(LEVELS.length - 1, top + 1)].id;
  return { list, active, suggested };
}

/** The consequence text: what was typed, else the level's default in `lang`. */
export const consequenceOf = (p, lang = "en") =>
  String(p?.consequence || "").trim() || defaultConsequence(p?.level, lang);

const correctiveTitle = (p, lang) =>
  tr(lang, "corrective") + (p?.improvementBy ? tr(lang, "byDate", { d: dmy(p.improvementBy) }) : "");

/* ═══════════════════════════ E-mail ══════════════════════════════
   Follows the app language (the e-mail window has no lang of its own). */

const esc = (s) => String(s ?? "").replace(/[<>&"]/g, (m) =>
  ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", "\"": "&quot;" }[m]));

export function warningSubject(p, lang = getSettingsLang()) {
  return `${levelName(p?.level, lang)} — ${p?.employeeName || tr(lang, "employee")}${p?.employeeNo ? ` (${p.employeeNo})` : ""}`;
}

export const detailRows = (p, lang = "en") => [
  [tr(lang, "date"), dmy(p?.date)],
  [tr(lang, "employee"), `${p?.employeeName || "—"}${p?.employeeNo ? ` · ${p.employeeNo}` : ""}`],
  [tr(lang, "position"), p?.position || "—"],
  [tr(lang, "site"), p?.site || "—"],
  [tr(lang, "level"), levelName(p?.level, lang)],
  [tr(lang, "violation"), (p?.categories || []).map((c) => catName(c, lang)).join(lang === "ar" ? "، " : ", ") || "—"],
  [tr(lang, "incident"), `${dmy(p?.incidentDate)}${p?.incidentTime ? ` ${p.incidentTime}` : ""}${p?.location ? ` · ${p.location}` : ""}`],
  [tr(lang, "previous"), String(p?.previousCount ?? 0)],
];

export function buildWarningText(p, opts = {}) {
  const lang = getSettingsLang();
  const intro = String(opts?.intro || "").trim();
  const note = String(opts?.note || "").trim();
  return [
    intro,
    levelName(p?.level, lang).toUpperCase(),
    ...detailRows(p, lang).map(([k, v]) => `${k}: ${v}`),
    "",
    `${tr(lang, "description")}:\n${p?.description || "—"}`,
    "",
    `${correctiveTitle(p, lang)}:\n${p?.correctiveAction || "—"}`,
    "",
    `${tr(lang, "consequence")}:\n${consequenceOf(p, lang)}`,
    (p?.photos || []).length ? `\n${tr(lang, "photosN", { n: p.photos.length })}` : "",
    note ? `\n${note}` : "",
  ].filter((x) => x !== "").join("\n");
}

export function buildWarningHtml(p, opts = {}) {
  const lang = getSettingsLang();
  const dir = lang === "ar" ? "rtl" : "ltr";
  const note = typeof opts === "string" ? opts : String(opts?.note || "");
  const intro = typeof opts === "string" ? "" : String(opts?.intro || "").trim();
  const lv = levelById(p?.level);
  const block = (s) => `<div dir="auto" style="white-space:pre-wrap;unicode-bidi:plaintext;text-align:start">${esc(s || "—")}</div>`;
  const rows = detailRows(p, lang).map(([k, v]) => `
    <tr>
      <td style="padding:7px 10px;border:1px solid #e2e8f0;background:#f8fafc;font-weight:700;width:190px">${esc(k)}</td>
      <td style="padding:7px 10px;border:1px solid #e2e8f0" dir="auto">${esc(v)}</td>
    </tr>`).join("");
  const photos = (p?.photos || []).filter(Boolean).map((u) =>
    `<a href="${esc(u)}"><img src="${esc(thumbUrl(u, 320))}" alt="" style="width:150px;height:110px;object-fit:cover;border-radius:8px;border:1px solid #e2e8f0;margin:0 6px 6px 0"/></a>`).join("");
  return `
  <div dir="${dir}" style="font-family:Segoe UI,Tahoma,Arial,sans-serif;color:#0f172a;font-size:14px;line-height:1.6;text-align:start">
    ${intro ? `<div dir="auto" style="white-space:pre-wrap;margin-bottom:12px">${esc(intro)}</div>` : ""}
    <div style="border-inline-start:6px solid ${lv.color};background:#fff7ed;padding:10px 14px;border-radius:8px;margin-bottom:12px">
      <div style="font-size:18px;font-weight:800;color:${lv.color}">${esc(levelName(p?.level, lang))}</div>
      <div style="color:#475569">${esc(tr(lang, "company"))} — ${esc(lang === "ar" ? DOC_META.docTitleAr : DOC_META.docTitle)} · ${esc(DOC_META.docNo)}</div>
    </div>
    <table style="border-collapse:collapse;width:100%;max-width:720px;margin-bottom:12px">${rows}</table>
    <h4 style="margin:12px 0 4px">${esc(tr(lang, "description"))}</h4>${block(p?.description)}
    <h4 style="margin:12px 0 4px">${esc(correctiveTitle(p, lang))}</h4>${block(p?.correctiveAction)}
    <h4 style="margin:12px 0 4px">${esc(tr(lang, "consequence"))}</h4>${block(consequenceOf(p, lang))}
    ${photos ? `<h4 style="margin:12px 0 6px">${esc(tr(lang, "photos"))}</h4><div>${photos}</div>` : ""}
    <p style="color:#475569;margin-top:12px">${esc(tr(lang, "issuedBy"))}: <b>${esc(p?.issuedBy?.name || "—")}</b>${p?.approvedBy?.name ? ` · ${esc(tr(lang, "approvedBy"))}: <b>${esc(p.approvedBy.name)}</b>` : ""}</p>
    ${note ? `<div dir="auto" style="white-space:pre-wrap;margin-top:10px">${esc(note)}</div>` : ""}
  </div>`;
}

/* ═══════════════════════════ PDF (English only) ══════════════════════════ */

async function loadScript(src, ready) {
  if (ready()) return;
  await new Promise((resolve, reject) => {
    const s = document.createElement("script");
    s.src = src; s.onload = resolve; s.onerror = () => reject(new Error(`Failed to load ${src}`));
    document.head.appendChild(s);
  });
}

async function urlToDataUrl(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error("image");
  const blob = await res.blob();
  return new Promise((resolve, reject) => {
    const fr = new FileReader();
    fr.onload = () => resolve(fr.result);
    fr.onerror = reject;
    fr.readAsDataURL(blob);
  });
}

export async function generateWarningPdf(p) {
  await loadScript("https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js", () => !!window.jspdf?.jsPDF);
  await loadScript("https://cdnjs.cloudflare.com/ajax/libs/jspdf-autotable/3.8.4/jspdf.plugin.autotable.min.js", () => !!window.jspdf?.jsPDF?.API?.autoTable);
  const doc = new window.jspdf.jsPDF({ unit: "pt", format: "a4", orientation: "portrait" });
  const mL = 40, mR = 40, W = doc.internal.pageSize.getWidth(), H = doc.internal.pageSize.getHeight();
  const lv = levelById(p?.level);

  const header = () => {
    doc.setFont("helvetica", "bold"); doc.setFontSize(16); doc.setTextColor(15, 23, 42);
    doc.text("AL MAWASHI", mL, 40);
    doc.setFont("helvetica", "normal"); doc.setFontSize(10); doc.setTextColor(71, 85, 105);
    doc.text("Trans Emirates Livestock Trading L.L.C.", mL, 56);
    doc.setFont("helvetica", "bold"); doc.setFontSize(14); doc.setTextColor(180, 0, 0);
    doc.text(lv.en.toUpperCase(), W - mR, 40, { align: "right" });
    doc.setFont("helvetica", "normal"); doc.setFontSize(9); doc.setTextColor(15, 23, 42);
    doc.text(`${DOC_META.docNo} · ${dmy(p?.date)}`, W - mR, 56, { align: "right" });
    doc.setDrawColor(203, 213, 225); doc.setLineWidth(0.6); doc.line(mL, 66, W - mR, 66);
  };
  header();

  const tbl = { styles: { font: "helvetica", fontSize: 10, cellPadding: 6, lineColor: [226, 232, 240], lineWidth: 0.4 },
    headStyles: { fillColor: [15, 61, 46], textColor: 255, fontStyle: "bold" },
    margin: { top: 80, left: mL, right: mR }, didDrawPage: header };

  doc.autoTable({ ...tbl, startY: 82, head: [["Field", "Details"]], body: detailRows(p, "en"),
    columnStyles: { 0: { cellWidth: 170, fontStyle: "bold", fillColor: [248, 250, 252] } } });
  doc.autoTable({ ...tbl, startY: doc.lastAutoTable.finalY + 12,
    head: [[tr("en", "description")]], body: [[p?.description || "-"]] });
  doc.autoTable({ ...tbl, startY: doc.lastAutoTable.finalY + 12,
    head: [[correctiveTitle(p, "en")]], body: [[p?.correctiveAction || "-"]] });
  doc.autoTable({ ...tbl, startY: doc.lastAutoTable.finalY + 12,
    head: [[tr("en", "consequence")]], body: [[consequenceOf(p, "en")]] });

  const ack = p?.employeeAck || {};
  doc.autoTable({ ...tbl, startY: doc.lastAutoTable.finalY + 12,
    head: [["Issued by", "Employee acknowledgement", "Witness", "Approved by"]],
    body: [[
      `${p?.issuedBy?.name || ""}\n${dmy(p?.issuedBy?.date)}`,
      ack.refused ? "Employee refused to sign" : `${ack.name || ""}\n${dmy(ack.date)}`,
      p?.witness?.name || "",
      `${p?.approvedBy?.name || ""}\n${dmy(p?.approvedBy?.date)}`,
    ]],
    bodyStyles: { minCellHeight: 46 } });

  const photos = (p?.photos || []).filter((u) => u && !String(u).startsWith("blob:"));
  if (photos.length) {
    let y = doc.lastAutoTable.finalY + 20, x = mL;
    const w = 160, h = 120;
    if (y + 16 + h > H - 40) { doc.addPage(); header(); y = 82; }
    doc.setFont("helvetica", "bold"); doc.setFontSize(11); doc.text("Photos of the violation", mL, y); y += 10;
    for (const u of photos.slice(0, 9)) {
      if (x + w > W - mR) { x = mL; y += h + 10; }
      if (y + h > H - 40) { doc.addPage(); header(); y = 82; x = mL; }
      try { doc.addImage(await urlToDataUrl(thumbUrl(u, 640)), "JPEG", x, y, w, h); }
      catch { doc.setDrawColor(203, 213, 225); doc.rect(x, y, w, h); }
      x += w + 10;
    }
  }

  const safe = (s) => String(s || "").replace(/[^\w-]+/g, "_");
  const filename = `warning_${safe(p?.employeeNo || p?.employeeName)}_${String(p?.date || "").replace(/-/g, "")}.pdf`;
  const blob = doc.output("blob");
  const base64 = (doc.output("datauristring").split(",")[1]) || "";
  return { blob, base64, filename };
}

/* ═══════════════════════════ Print sheet ═══════════════════════════
   Browser print, not jsPDF, so it can be Arabic (RTL) or English. */
export function printWarning(p, lang = "en") {
  const ar = lang === "ar";
  const lv = levelById(p?.level);
  const ack = p?.employeeAck || {};
  const box = (title, body) => `<div class="box"><div class="bt">${esc(title)}</div><div class="bb" dir="auto">${esc(body || "—")}</div></div>`;
  const sign = (title, name, date) => `<div class="sg"><div class="st">${esc(title)}</div><div class="sn">${esc(name || "")}</div><div class="sl">${esc(tr(lang, "signature"))}</div><div class="sd">${esc(tr(lang, "date"))}: ${esc(date ? dmy(date) : "")}</div></div>`;
  const photos = (p?.photos || []).filter((u) => u && !String(u).startsWith("blob:"))
    .map((u) => `<img src="${esc(thumbUrl(u, 640))}" alt=""/>`).join("");
  const html = `<!doctype html><html lang="${ar ? "ar" : "en"}" dir="${ar ? "rtl" : "ltr"}"><head><meta charset="utf-8"><title>${esc(warningSubject(p, lang))}</title>
<style>
  @page{size:A4;margin:14mm}
  body{font-family:${ar ? "Tahoma,'Segoe UI'" : "'Segoe UI'"},Arial,sans-serif;color:#0f172a;font-size:12px;margin:0}
  .hd{display:flex;justify-content:space-between;border-bottom:2px solid #0f3d2e;padding-bottom:8px;margin-bottom:10px}
  .co{font-size:18px;font-weight:800}.sub{color:#475569}
  .lv{font-size:17px;font-weight:800;color:${lv.color};text-align:end}
  table{width:100%;border-collapse:collapse;margin-bottom:10px}
  td{border:1px solid #cbd5e1;padding:6px 8px;vertical-align:top;text-align:start}
  td.k{background:#f1f5f9;font-weight:700;width:30%}
  .box{border:1px solid #cbd5e1;border-radius:6px;margin-bottom:8px;page-break-inside:avoid}
  .bt{background:#0f3d2e;color:#fff;font-weight:700;padding:5px 8px}
  .bb{padding:8px;white-space:pre-wrap;unicode-bidi:plaintext;text-align:start;min-height:28px}
  .ph{display:flex;flex-wrap:wrap;gap:6px}
  .ph img{width:31%;height:150px;object-fit:cover;border:1px solid #cbd5e1;border-radius:4px}
  .sgs{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin-top:14px;page-break-inside:avoid}
  .sg{border:1px solid #cbd5e1;border-radius:6px;padding:8px;min-height:90px}
  .st{font-weight:700;color:#475569;font-size:11px}
  .sn{font-weight:700;margin-top:4px;min-height:16px}
  .sl{border-top:1px dashed #94a3b8;margin-top:26px;font-size:10px;color:#64748b}
  .sd{font-size:10px;color:#64748b;margin-top:4px}
  .ack{font-size:11px;color:#475569;margin-top:10px}
</style></head><body>
<div class="hd"><div><div class="co">${esc(tr(lang, "company"))}</div><div class="sub">${esc(tr(lang, "companyLegal"))} · ${esc(ar ? DOC_META.docTitleAr : DOC_META.docTitle)} · ${esc(DOC_META.docNo)}</div></div>
<div><div class="lv">${esc(levelName(p?.level, lang))}</div><div class="sub" style="text-align:end">${esc(tr(lang, "date"))}: ${esc(dmy(p?.date))}</div></div></div>
<table>${detailRows(p, lang).map(([k, v]) => `<tr><td class="k">${esc(k)}</td><td dir="auto">${esc(v)}</td></tr>`).join("")}</table>
${box(tr(lang, "description"), p?.description)}
${box(correctiveTitle(p, lang), p?.correctiveAction)}
${box(tr(lang, "consequence"), consequenceOf(p, lang))}
${photos ? `<div class="box"><div class="bt">${esc(tr(lang, "photos"))}</div><div class="bb"><div class="ph">${photos}</div></div></div>` : ""}
<div class="ack">${esc(tr(lang, "ackText"))}</div>
<div class="sgs">
  ${sign(tr(lang, "issuedBy"), p?.issuedBy?.name, p?.issuedBy?.date)}
  ${sign(tr(lang, "employee"), ack.refused ? tr(lang, "refusedShort") : ack.name, ack.date)}
  ${sign(tr(lang, "witness"), p?.witness?.name, "")}
  ${sign(tr(lang, "approvedBy"), p?.approvedBy?.name, p?.approvedBy?.date)}
</div>
<script>window.onload=function(){var imgs=[].slice.call(document.images);Promise.all(imgs.map(function(i){return i.complete?0:new Promise(function(r){i.onload=i.onerror=r})})).then(function(){setTimeout(function(){window.print()},150)})}</script>
</body></html>`;
  const w = window.open("", "_blank");
  if (!w) { alert(tr(lang, "popup")); return; }
  w.document.open(); w.document.write(html); w.document.close();
}
