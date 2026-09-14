// src/pages/hse/HSERiskRegister.jsx
// سجل المخاطر التشغيلية — بنمط صفحات ISO / HACCP، عرض كامل الشاشة، ثنائي اللغة

import React, { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import {
  inputStyle, labelStyle, todayISO,
  apiList, apiSave, apiDelete, apiUpdate, apiUploadFile, calcRiskScore, riskLevelLabel,
  SITE_LOCATIONS, HAZARD_CATEGORIES, CONTROL_TYPES, localize,
  useHSELang, HSELangToggle,
} from "./hseShared";
import { SEED_RISKS, LOADING_RISKS, SEED_CATALOG } from "./hseRiskSeeds";
import { SOP_OPTIONS, findSop } from "./hseSopData";
import { exportNodeToPdf, safeFileName, pdfStageStyle, PDF_UI } from "./hsePdf";
import { ISO_UI, UI } from "./hseIsoUi";
import mawashiLogo from "../../assets/almawashi-logo.jpg";


const T = {
  pageTitle:    { ar: "⚠️ سجل المخاطر التشغيلية — Risk Register", en: "⚠️ Operational Risk Register" },
  pageSubtitle: { ar: "التقييم = الاحتمالية × الشدة (1-5 لكل منهما) → 1 إلى 25",
                  en: "Score = Likelihood × Severity (1–5 each) → 1 to 25" },
  pageIntro: {
    ar: "يُعدّ سجل المخاطر (Risk Register) الوثيقة الأهم في نظام إدارة HSE، لأنه الأساس الذي تُبنى عليه جميع السياسات وإجراءات التحكم. يجب أن يُحدَّث ميدانياً من قِبَل مدير HSE فور تعيينه، ويُراجَع سنوياً أو عند: إدخال معدات جديدة، تغيير عمليات، حادث كبير، أو ملاحظة تفتيش حكومي. السجل التالي يحتوي على 28 خطراً مُعرّفاً مسبقاً تغطي طبيعة عمل شركة استيراد وتخزين وتصنيع اللحوم المبردة والمجمدة، ويمكن إضافة المزيد عبر زر «إضافة خطر».",
    en: "The Risk Register is the most important document in an HSE management system — it's the foundation on which all policies and controls are built. It must be field-updated by the HSE Manager upon hire, and reviewed annually or when: new equipment is introduced, processes change, a major incident occurs, or a government inspection finding is raised. The following register contains 28 pre-identified risks covering the nature of an air-imported chilled & frozen meat company's operations. More can be added via the «Add Risk» button.",
  },
  methodologyTitle: { ar: "🧮 منهجية التقييم", en: "🧮 Assessment Methodology" },
  methodologyExplain: {
    ar: "يُحسب مستوى الخطورة (Risk Score) بضرب احتمالية الحدوث (Likelihood من 1 إلى 5) في شدة التأثير (Severity من 1 إلى 5). الاحتمالية: 1 = نادر جداً، 2 = نادر، 3 = ممكن، 4 = محتمل، 5 = شبه مؤكد. الشدة: 1 = لا أثر، 2 = إصابة طفيفة، 3 = إصابة متوسطة، 4 = إصابة شديدة/فقدان وقت، 5 = وفاة/كارثة. النتيجة تُحدّد المستوى والإجراء الواجب اتخاذه.",
    en: "Risk Score = Likelihood (1–5) × Severity (1–5). Likelihood: 1 = very rare, 2 = rare, 3 = possible, 4 = likely, 5 = almost certain. Severity: 1 = no impact, 2 = minor injury, 3 = moderate injury, 4 = severe injury/lost time, 5 = fatality/disaster. The result determines the level and required action.",
  },
  methCols: {
    score:  { ar: "النتيجة", en: "Score" },
    level:  { ar: "المستوى", en: "Level" },
    action: { ar: "الإجراء المطلوب", en: "Required Action" },
  },
  methLow:  { ar: "منخفض (Low)",     en: "Low" },
  methMed:  { ar: "متوسط (Medium)",   en: "Medium" },
  methHigh: { ar: "عالٍ (High)",       en: "High" },
  methCrit: { ar: "حرج (Critical)",    en: "Critical" },
  methActLow:  { ar: "قبول مع مراقبة دورية", en: "Accept with periodic monitoring" },
  methActMed:  { ar: "إجراءات تحكم مطلوبة ضمن 30 يوماً", en: "Control actions required within 30 days" },
  methActHigh: { ar: "إجراء فوري خلال 7 أيام + مراجعة من مدير HSE", en: "Immediate action within 7 days + HSE Manager review" },
  methActCrit: { ar: "إيقاف النشاط فوراً حتى معالجته", en: "Immediately stop activity until treated" },
  back:         { ar: "← HSE", en: "← HSE" },
  add:          { ar: "+ إضافة خطر", en: "+ Add Risk" },
  newTitle:     { ar: "➕ إضافة خطر جديد", en: "➕ Add new risk" },
  editTitle:    { ar: "✏️ تعديل الخطر", en: "✏️ Edit risk" },
  search:       { ar: "🔍 بحث…", en: "🔍 Search…" },
  shown:        { ar: "المعروض:", en: "Showing:" },
  fAll:         { ar: "كل المستويات", en: "All levels" },
  fCritical:    { ar: "حرج فقط", en: "Critical only" },
  fHigh:        { ar: "عالي فقط", en: "High only" },
  fMedium:      { ar: "متوسط فقط", en: "Medium only" },
  fLow:         { ar: "منخفض فقط", en: "Low only" },
  total:        { ar: "الإجمالي", en: "Total" },
  critical:     { ar: "حرج", en: "Critical" },
  high:         { ar: "عالي", en: "High" },
  medium:       { ar: "متوسط", en: "Medium" },
  low:          { ar: "منخفض", en: "Low" },
  area:         { ar: "المنطقة / الموقع", en: "Area / Location" },
  category:     { ar: "تصنيف الخطر", en: "Hazard category" },
  owner:        { ar: "المسؤول", en: "Owner" },
  ownerPh:      { ar: "HSE Manager / Site Officer...", en: "HSE Manager / Site Officer..." },
  likelihood:   { ar: "الاحتمالية (1-5)", en: "Likelihood (1–5)" },
  severity:     { ar: "الشدة (1-5)", en: "Severity (1–5)" },
  reviewDate:   { ar: "تاريخ المراجعة القادمة", en: "Next review date" },
  hazard:       { ar: "الخطر", en: "Hazard" },
  hazardPh:     { ar: "مثال: تسرب غاز الأمونيا", en: "e.g., Ammonia gas leak" },
  consequence:  { ar: "العواقب المحتملة", en: "Potential consequences" },
  controls:     { ar: "إجراءات التحكم", en: "Controls" },
  currentScore: { ar: "التقييم الحالي:", en: "Current score:" },
  save:         { ar: "💾 حفظ", en: "💾 Save" },
  cancel:       { ar: "إلغاء", en: "Cancel" },
  cols: {
    area: { ar: "المنطقة", en: "Area" },
    hazard: { ar: "الخطر", en: "Hazard" },
    score: { ar: "L × S", en: "L × S" },
    level: { ar: "المستوى", en: "Level" },
    controls: { ar: "التحكم", en: "Controls" },
    owner: { ar: "المسؤول", en: "Owner" },
    actions: { ar: "إجراءات", en: "Actions" },
  },
  edit: { ar: "تعديل", en: "Edit" },
  del:  { ar: "حذف", en: "Delete" },
  noResults: { ar: "لا توجد مخاطر بهذه الفلاتر", en: "No risks match these filters" },
  enterHazard: { ar: "اكتب وصف الخطر أولاً", en: "Enter the hazard description first" },
  confirmDel:  { ar: "حذف هذا الخطر؟", en: "Delete this risk?" },

  /* — الحقول المضافة — */
  controlType:   { ar: "نوع التحكم (هرم الضبط)", en: "Control type (hierarchy)" },
  residualTitle: { ar: "الخطر المتبقي بعد التحكم", en: "Residual risk after controls" },
  resLikelihood: { ar: "الاحتمالية المتبقية (1-5)", en: "Residual likelihood (1–5)" },
  resSeverity:   { ar: "الشدة المتبقية (1-5)", en: "Residual severity (1–5)" },
  notAssessed:   { ar: "غير مُقيّم", en: "Not assessed" },
  linkedSop:     { ar: "الإجراء المرتبط (SOP)", en: "Linked procedure (SOP)" },
  noSop:         { ar: "— بدون إجراء مرتبط —", en: "— no linked procedure —" },
  linkedForm:    { ar: "النموذج / السجل المرتبط", en: "Linked form / record" },
  linkedFormPh:  { ar: "مثال: F-29 محضر Toolbox", en: "e.g., F-29 Toolbox minutes" },
  attachments:   { ar: "المرفقات (دليل التطبيق)", en: "Attachments (implementation evidence)" },
  addFile:       { ar: "📎 إرفاق ملف", en: "📎 Attach file" },
  uploading:     { ar: "⏳ جارٍ الرفع…", en: "⏳ Uploading…" },
  removeFile:    { ar: "إزالة", en: "Remove" },
  reviewedBy:    { ar: "روجع بواسطة", en: "Reviewed by" },
  reviewedDate:  { ar: "تاريخ المراجعة", en: "Review date" },

  /* — ضبط الوثيقة والاعتماد — */
  docCardTitle:  { ar: "🗂️ ضبط الوثيقة والاعتماد", en: "🗂️ Document control & approval" },
  docCardHint: {
    ar: "هذه البيانات تظهر في ترويسة ملف الـ PDF وفي خانة التواقيع أسفله، وهي ما يطلبه المدقق ليعتبر تقييم المخاطر وثيقة مضبوطة.",
    en: "These fields appear in the PDF header and the signature block, and are what an auditor needs for the assessment to count as a controlled document.",
  },
  docNo:         { ar: "رقم الوثيقة", en: "Document No." },
  docRevision:   { ar: "رقم المراجعة", en: "Revision" },
  docIssueDate:  { ar: "تاريخ الإصدار", en: "Issue date" },
  docScope:      { ar: "نطاق التقييم", en: "Assessment scope" },
  docScopePh:    { ar: "مثال: عمليات التحميل والتفريغ — جميع المواقع", en: "e.g., Loading & unloading operations — all sites" },
  docPreparedBy: { ar: "أُعدّت بواسطة", en: "Prepared by" },
  docReviewedBy: { ar: "روجعت بواسطة", en: "Reviewed by" },
  docApprovedBy: { ar: "اعتُمدت بواسطة", en: "Approved by" },
  docApprovedOn: { ar: "تاريخ الاعتماد", en: "Approval date" },
  saveDoc:       { ar: "💾 حفظ بيانات الوثيقة", en: "💾 Save document details" },
  docSaved:      { ar: "✅ حُفظت بيانات الوثيقة", en: "✅ Document details saved" },
  exportPdf:     { ar: "📄 تصدير PDF", en: "📄 Export PDF" },
  exporting:     { ar: "⏳ جارٍ التصدير…", en: "⏳ Exporting…" },
  showDoc:       { ar: "🗂️ بيانات الوثيقة", en: "🗂️ Document details" },

  /* — عناوين وثيقة الـ PDF — */
  pdfTitle:      { ar: "تقييم المخاطر التشغيلية — سجل المخاطر", en: "Operational Risk Assessment — Risk Register" },
  pdfCompany:    { ar: "الأسماك والمواشي — قسم الصحة والسلامة والبيئة", en: "AL MAWASHI — Health, Safety & Environment Department" },
  pdfPrintedOn:  { ar: "تاريخ الطباعة", en: "Printed on" },
  pdfRows:       { ar: "عدد المخاطر", en: "Risks listed" },
  pdfInitial:    { ar: "التقييم قبل التحكم", en: "Initial risk" },
  pdfResidual:   { ar: "الخطر المتبقي", en: "Residual risk" },
  pdfRef:        { ar: "المرجع", en: "Reference" },
  pdfNo:         { ar: "م", en: "#" },
  pdfSign:       { ar: "التوقيع", en: "Signature" },
  pdfName:       { ar: "الاسم", en: "Name" },
  pdfDate:       { ar: "التاريخ", en: "Date" },
  pdfLegend:     { ar: "مفتاح التقييم: 1–5 منخفض · 6–12 متوسط · 13–19 عالٍ · 20–25 حرج", en: "Scoring key: 1–5 Low · 6–12 Medium · 13–19 High · 20–25 Critical" },
  /* — إصلاح السجل — */
  repairBtn:     { ar: "🧹 إصلاح السجل", en: "🧹 Repair register" },
  repairing:     { ar: "⏳ جارٍ الإصلاح…", en: "⏳ Repairing…" },
  repairNothing: { ar: "✅ السجل سليم: لا تكرار ولا سجلات بلغة واحدة.", en: "✅ Register is clean: no duplicates, no single-language rows." },
  repairConfirm: {
    ar: "سيتم دمج {dup} سجلاً مكرراً وإعادة النص ثنائي اللغة إلى {lang} خطراً.\nالبيانات التي عدّلتها (المسؤول، التقييم، تواريخ المراجعة) تُحفظ.\nهل تريد المتابعة؟",
    en: "This will merge {dup} duplicate records and restore bilingual text on {lang} risks.\nYour own edits (owner, scoring, review dates) are preserved.\nContinue?",
  },
  repairDone:    { ar: "✅ تم الإصلاح. عدد المخاطر الآن: ", en: "✅ Repaired. Risks now: " },
};

const DOC_TYPE = "risk_register_doc";

const blankDoc = () => ({
  docNo: "HSE-RA-01",
  revision: "01",
  issueDate: todayISO(),
  scope: "",
  preparedBy: "",
  reviewedBy: "",
  approvedBy: "",
  approvedDate: "",
});

const blank = () => ({
  id: "",
  area: SITE_LOCATIONS[0].v,
  hazard: "",
  consequence: "",
  likelihood: 3,
  severity: 3,
  controls: "",
  category: HAZARD_CATEGORIES[0].v,
  owner: "",
  status: "active",
  reviewDate: todayISO(),
  controlType: "administrative",
  residualLikelihood: 0,
  residualSeverity: 0,
  linkedSop: "",
  linkedForm: "",
  attachments: [],
  reviewedBy: "",
  reviewedDate: "",
  createdAt: new Date().toISOString(),
});

function plusMonthsISO(months) {
  const d = new Date();
  d.setMonth(d.getMonth() + months);
  return d.toISOString().slice(0, 10);
}

/** يكمل الحقول الافتراضية قبل حفظ خطر من القائمة الجاهزة */
function withSeedDefaults(seed) {
  return {
    status: "active",
    linkedForm: "",
    attachments: [],
    reviewedBy: "",
    reviewedDate: "",
    reviewDate: plusMonthsISO(12),
    createdAt: new Date().toISOString(),
    ...seed,
  };
}

/** الخطر المتبقي — يعيد null إذا لم يُقيَّم بعد */
function residualScoreOf(r) {
  const l = Number(r?.residualLikelihood) || 0;
  const sv = Number(r?.residualSeverity) || 0;
  if (!l || !sv) return null;
  return calcRiskScore(l, sv);
}

// resolve a stored value (string or {ar,en}) to the active language
function txt(v, lang) {
  if (v == null) return "";
  if (typeof v === "string") return v;
  if (typeof v === "object") return v[lang] ?? v.ar ?? v.en ?? "";
  return String(v);
}

const normTxt = (v) => String(v || "").replace(/\s+/g, " ").trim().toLowerCase();

/** يطابق سجلاً محفوظاً مع خطر من القوائم الجاهزة (بالعربية أو بالإنجليزية) */
function seedFor(record) {
  const h = record?.hazard;
  const keys = h && typeof h === "object" ? [h.ar, h.en] : [h];
  for (const seed of SEED_CATALOG) {
    for (const k of keys) {
      if (!k) continue;
      if (normTxt(k) === normTxt(seed.hazard.ar) || normTxt(k) === normTxt(seed.hazard.en)) return seed;
    }
  }
  return null;
}

/**
 * يبقي النص ثنائي اللغة عند الحفظ: يستبدل لغة العرض فقط
 * بدل أن يمسح الترجمة الأخرى كما كان يحدث سابقاً.
 */
function wrapLang(original, value, lang) {
  if (original && typeof original === "object") return { ...original, [lang]: value };
  return { [lang]: value };
}

export default function HSERiskRegister() {
  const navigate = useNavigate();
  const { lang, toggle, dir, pick } = useHSELang();
  const [risks, setRisks] = useState([]);
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [draft, setDraft] = useState(blank());
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [repairing, setRepairing] = useState(false);
  const [doc, setDoc] = useState(blankDoc());
  const [docId, setDocId] = useState(null);
  const [showDocCard, setShowDocCard] = useState(false);
  const [savingDoc, setSavingDoc] = useState(false);
  const [exporting, setExporting] = useState(false);
  const pdfRef = useRef(null);
  const bootedRef = useRef(false);

  async function reload() {
    const arr = await apiList("risk_register");
    if (!arr || arr.length === 0) {
      try {
        for (const seed of SEED_RISKS) await apiSave("risk_register", seed, "HSE_seed");
        for (const seed of LOADING_RISKS) await apiSave("risk_register", withSeedDefaults(seed), "HSE_seed");
        setRisks(await apiList("risk_register"));
        return;
      } catch (e) {
        console.warn("Risk Register seed failed, showing local SEED:", e?.message || e);
        setRisks([...SEED_RISKS, ...LOADING_RISKS.map((x) => ({ ...withSeedDefaults(x), id: x.seedKey }))]);
        return;
      }
    }
    // سجل قديم لا يحوي مخاطر التحميل والتفريغ → تُضاف مرة واحدة فقط
    const hasLoading = arr.some((r) => typeof r.seedKey === "string" && r.seedKey.startsWith("load-"));
    if (!hasLoading) {
      try {
        for (const seed of LOADING_RISKS) await apiSave("risk_register", withSeedDefaults(seed), "HSE_seed");
        setRisks(await apiList("risk_register"));
        return;
      } catch (e) {
        console.warn("Loading/unloading risks top-up failed:", e?.message || e);
      }
    }
    setRisks(arr);
  }

  // حارس ضد التشغيل المزدوج في وضع التطوير (StrictMode) — وإلا تُزرع النسخ مرتين
  useEffect(() => {
    if (bootedRef.current) return;
    bootedRef.current = true;
    reload();
  }, []);

  /* بيانات ضبط الوثيقة — سجل واحد على السيرفر، لا تخزين محلي */
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const arr = await apiList(DOC_TYPE);
        if (!alive || !arr || arr.length === 0) return;
        const rec = arr[0];
        setDocId(rec.id || null);
        setDoc({ ...blankDoc(), ...rec });
      } catch (e) {
        console.warn("Risk register doc-control load failed:", e?.message || e);
      }
    })();
    return () => { alive = false; };
  }, []);

  function startNew() { setDraft(blank()); setEditingId("__new__"); setShowForm(true); }

  function startEdit(r) {
    setDraft({
      ...r,
      origHazard: r.hazard,
      origConsequence: r.consequence,
      origControls: r.controls,
      hazard: txt(r.hazard, lang),
      consequence: txt(r.consequence, lang),
      controls: txt(r.controls, lang),
    });
    setEditingId(r.id);
    setShowForm(true);
  }

  async function save() {
    if (!String(draft.hazard).trim()) { alert(pick(T.enterHazard)); return; }
    setSaving(true);
    try {
      const { origHazard, origConsequence, origControls, ...rest } = draft;
      const payload = {
        ...rest,
        hazard: wrapLang(origHazard, draft.hazard, lang),
        consequence: wrapLang(origConsequence, draft.consequence, lang),
        controls: wrapLang(origControls, draft.controls, lang),
      };
      if (editingId === "__new__") {
        delete payload.id;
        await apiSave("risk_register", payload);
      } else {
        await apiUpdate("risk_register", editingId, payload);
      }
      await reload();
      setShowForm(false); setEditingId(null);
    } catch (e) {
      alert((pick({ ar: "❌ خطأ بالحفظ: ", en: "❌ Save error: " })) + (e?.message || e));
    } finally {
      setSaving(false);
    }
  }

  async function remove(id) {
    if (!window.confirm(pick(T.confirmDel))) return;
    try {
      await apiDelete(id);
      await reload();
    } catch (e) {
      alert((pick({ ar: "❌ خطأ بالحذف: ", en: "❌ Delete error: " })) + (e?.message || e));
    }
  }

  async function saveDoc() {
    setSavingDoc(true);
    try {
      const payload = {
        docNo: doc.docNo, revision: doc.revision, issueDate: doc.issueDate, scope: doc.scope,
        preparedBy: doc.preparedBy, reviewedBy: doc.reviewedBy,
        approvedBy: doc.approvedBy, approvedDate: doc.approvedDate,
      };
      if (docId) {
        await apiUpdate(DOC_TYPE, docId, payload, doc.approvedBy || doc.preparedBy || "HSE");
      } else {
        const saved = await apiSave(DOC_TYPE, payload, doc.approvedBy || doc.preparedBy || "HSE");
        if (saved?.id) setDocId(saved.id);
      }
      alert(pick(T.docSaved));
    } catch (e) {
      alert((pick({ ar: "❌ خطأ بالحفظ: ", en: "❌ Save error: " })) + (e?.message || e));
    } finally {
      setSavingDoc(false);
    }
  }

  async function attachFile(file) {
    if (!file) return;
    setUploading(true);
    try {
      const url = await apiUploadFile(file);
      setDraft((d) => ({ ...d, attachments: [...(d.attachments || []), { url, name: file.name }] }));
    } catch (e) {
      alert((pick({ ar: "❌ فشل رفع الملف: ", en: "❌ Upload failed: " })) + (e?.message || e));
    } finally {
      setUploading(false);
    }
  }

  async function exportPdf() {
    setExporting(true);
    try {
      await new Promise((r) => setTimeout(r, 60));
      await exportNodeToPdf(
        pdfRef.current,
        safeFileName((doc.docNo || "HSE-RA") + "_Rev" + (doc.revision || "01") + "_" + todayISO()),
        { orientation: "l" }
      );
    } catch (e) {
      alert((pick({ ar: "❌ خطأ بالتصدير: ", en: "❌ Export error: " })) + (e?.message || e));
    } finally {
      setExporting(false);
    }
  }

  /* ── إصلاح السجل: دمج المكرر وإعادة النص ثنائي اللغة ── */
  function groupRisks() {
    const groups = new Map();
    for (const r of risks) {
      if (!r.id) continue;
      const seed = seedFor(r);
      const key = seed
        ? "seed:" + (seed.seedKey || seed.id)
        : "free:" + String(r.area || "") + "|" + normTxt(txt(r.hazard, "ar") || txt(r.hazard, "en"));
      if (!groups.has(key)) groups.set(key, { seed, items: [] });
      groups.get(key).items.push(r);
    }
    return groups;
  }

  function mergeGroup(seed, items) {
    const richness = (r) =>
      (r.owner ? 4 : 0) + (r.updatedAt ? 2 : 0) + (r.reviewDate ? 1 : 0) +
      (r.linkedSop ? 1 : 0) + ((r.attachments || []).length ? 1 : 0);
    const sorted = [...items].sort((a, b) => richness(b) - richness(a));

    const first = (get) => {
      for (const r of sorted) {
        const v = get(r);
        if (v === undefined || v === null || v === "") continue;
        if (Array.isArray(v) && v.length === 0) continue;
        return v;
      }
      return undefined;
    };

    // نص: تعديل المستخدم يتقدّم، ثم النسخة ثنائية اللغة، ثم نص البذرة
    const textField = (key) => {
      const edited = sorted.find(
        (r) => typeof r[key] === "string" && r[key].trim() &&
          !(seed && (normTxt(r[key]) === normTxt(seed[key].ar) || normTxt(r[key]) === normTxt(seed[key].en)))
      );
      if (edited) return edited[key];
      const bilingual = sorted.find((r) => r[key] && typeof r[key] === "object");
      if (bilingual) return bilingual[key];
      if (seed) return seed[key];
      return first((r) => r[key]) || "";
    };

    // رقم: القيمة التي غيّرها المستخدم عن البذرة تتقدّم
    const numField = (key, fallback) => {
      const seedVal = seed ? Number(seed[key]) : 0;
      const changed = sorted.map((r) => Number(r[key])).find((v) => v && seedVal && v !== seedVal);
      if (changed) return changed;
      const any = sorted.map((r) => Number(r[key])).find((v) => v);
      return any || seedVal || fallback;
    };

    const out = {
      area: first((r) => r.area) || (seed && seed.area) || SITE_LOCATIONS[0].v,
      category: first((r) => r.category) || (seed && seed.category) || HAZARD_CATEGORIES[0].v,
      hazard: textField("hazard"),
      consequence: textField("consequence"),
      controls: textField("controls"),
      likelihood: numField("likelihood", 3),
      severity: numField("severity", 3),
      owner: first((r) => r.owner) || (seed && seed.owner) || "",
      status: first((r) => r.status) || "active",
      reviewDate: first((r) => r.reviewDate) || "",
      controlType: first((r) => r.controlType) || (seed && seed.controlType) || "",
      residualLikelihood: Number(first((r) => r.residualLikelihood)) || (seed && seed.residualLikelihood) || 0,
      residualSeverity: Number(first((r) => r.residualSeverity)) || (seed && seed.residualSeverity) || 0,
      linkedSop: first((r) => r.linkedSop) || (seed && seed.linkedSop) || "",
      linkedForm: first((r) => r.linkedForm) || "",
      attachments: first((r) => r.attachments) || [],
      reviewedBy: first((r) => r.reviewedBy) || "",
      reviewedDate: first((r) => r.reviewedDate) || "",
    };
    if (seed && seed.seedKey) out.seedKey = seed.seedKey;
    return { keep: sorted[0], drop: sorted.slice(1), payload: out };
  }

  async function repairRegister() {
    const groups = groupRisks();
    let dup = 0;
    let langFix = 0;
    for (const g of groups.values()) {
      dup += Math.max(0, g.items.length - 1);
      if (g.seed && g.items.some((r) => typeof r.hazard !== "object")) langFix += 1;
    }
    if (!dup && !langFix) { alert(pick(T.repairNothing)); return; }
    const msg = pick(T.repairConfirm).replace("{dup}", String(dup)).replace("{lang}", String(langFix));
    if (!window.confirm(msg)) return;

    setRepairing(true);
    try {
      for (const g of groups.values()) {
        const { keep, drop, payload } = mergeGroup(g.seed, g.items);
        await apiUpdate("risk_register", keep.id, payload);
        for (const extra of drop) {
          if (extra.id && extra.id !== keep.id) await apiDelete(extra.id);
        }
      }
      const fresh = await apiList("risk_register");
      setRisks(fresh);
      alert(pick(T.repairDone) + fresh.length);
    } catch (e) {
      alert((pick({ ar: "❌ خطأ بالإصلاح: ", en: "❌ Repair error: " })) + (e?.message || e));
    } finally {
      setRepairing(false);
    }
  }

  const filtered = useMemo(() => {
    return risks.filter((r) => {
      const score = calcRiskScore(r.likelihood, r.severity);
      if (filter === "critical" && score < 20) return false;
      if (filter === "high" && (score < 13 || score >= 20)) return false;
      if (filter === "medium" && (score < 6 || score >= 13)) return false;
      if (filter === "low" && score >= 6) return false;
      if (search.trim()) {
        const s = search.toLowerCase();
        const hay = `${txt(r.hazard, "ar")} ${txt(r.hazard, "en")} ${r.area} ${txt(r.controls, lang)}`.toLowerCase();
        if (!hay.includes(s)) return false;
      }
      return true;
    });
  }, [risks, filter, search, lang]);

  const stats = useMemo(() => {
    const out = { total: risks.length, critical: 0, high: 0, medium: 0, low: 0 };
    risks.forEach((r) => {
      const score = calcRiskScore(r.likelihood, r.severity);
      if (score >= 20) out.critical++;
      else if (score >= 13) out.high++;
      else if (score >= 6) out.medium++;
      else out.low++;
    });
    return out;
  }, [risks]);

  const busy = saving || repairing || exporting || savingDoc;

  return (
    <main style={UI.page} dir={dir}>
      <div style={UI.wrap}>
        <div style={ISO_UI.topBar}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <img src={mawashiLogo} alt="logo" style={{ width: 46, height: 46, borderRadius: 10, objectFit: "cover" }} />
            <div>
              <div style={ISO_UI.title}>{pick(T.pageTitle)}</div>
              <div style={ISO_UI.subtitle}>{pick(T.pageSubtitle)}</div>
            </div>
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
            <HSELangToggle lang={lang} toggle={toggle} />
            <button style={ISO_UI.btn("primary")} onClick={startNew}>{pick(T.add)}</button>
            <button style={ISO_UI.btn(showDocCard ? "primary" : "secondary")} onClick={() => setShowDocCard((v) => !v)}>{pick(T.showDoc)}</button>
            <button style={ISO_UI.btn("success", exporting)} onClick={exportPdf} disabled={busy}>
              {exporting ? pick(T.exporting) : pick(T.exportPdf)}
            </button>
            <button style={ISO_UI.btn("violet", repairing)} onClick={repairRegister} disabled={busy}>
              {repairing ? pick(T.repairing) : pick(T.repairBtn)}
            </button>
            <button style={ISO_UI.btn("secondary")} onClick={() => navigate("/hse")}>{pick(T.back)}</button>
          </div>
        </div>

        <div style={{ ...UI.card, borderInlineStart: "5px solid #0ea5e9" }}>
          <p style={{ fontSize: 14, lineHeight: 1.9, margin: 0, fontWeight: 600 }}>{pick(T.pageIntro)}</p>
        </div>

        {/* المنهجية */}
        <div style={UI.card}>
          <div style={UI.sectionTitle}>{pick(T.methodologyTitle)}</div>
          <p style={{ fontSize: 13, color: "#334155", lineHeight: 1.85, margin: "0 0 12px", fontWeight: 600 }}>{pick(T.methodologyExplain)}</p>
          <div style={{ overflowX: "auto" }}>
            <table style={UI.table}>
              <thead>
                <tr style={ISO_UI.theadRow}>
                  <th style={UI.th}>{pick(T.methCols.score)}</th>
                  <th style={UI.th}>{pick(T.methCols.level)}</th>
                  <th style={UI.th}>{pick(T.methCols.action)}</th>
                </tr>
              </thead>
              <tbody>
                <tr><td style={{ ...UI.td, textAlign: "center", fontWeight: 900, background: "#dcfce7", color: "#166534" }}>1 – 5</td>   <td style={{ ...UI.td, fontWeight: 900, color: "#166534" }}>{pick(T.methLow)}</td>   <td style={UI.td}>{pick(T.methActLow)}</td></tr>
                <tr><td style={{ ...UI.td, textAlign: "center", fontWeight: 900, background: "#fef9c3", color: "#854d0e" }}>6 – 12</td>  <td style={{ ...UI.td, fontWeight: 900, color: "#854d0e" }}>{pick(T.methMed)}</td>   <td style={UI.td}>{pick(T.methActMed)}</td></tr>
                <tr><td style={{ ...UI.td, textAlign: "center", fontWeight: 900, background: "#fed7aa", color: "#9a3412" }}>13 – 19</td> <td style={{ ...UI.td, fontWeight: 900, color: "#9a3412" }}>{pick(T.methHigh)}</td>  <td style={UI.td}>{pick(T.methActHigh)}</td></tr>
                <tr><td style={{ ...UI.td, textAlign: "center", fontWeight: 900, background: "#fee2e2", color: "#7f1d1d" }}>20 – 25</td> <td style={{ ...UI.td, fontWeight: 900, color: "#7f1d1d" }}>{pick(T.methCrit)}</td>  <td style={UI.td}>{pick(T.methActCrit)}</td></tr>
              </tbody>
            </table>
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 10, marginBottom: 14 }}>
          {[
            { label: pick(T.total), val: stats.total, bg: "#e0f2fe", color: "#0c4a6e" },
            { label: pick(T.critical), val: stats.critical, bg: "#fee2e2", color: "#7f1d1d" },
            { label: pick(T.high), val: stats.high, bg: "#fed7aa", color: "#9a3412" },
            { label: pick(T.medium), val: stats.medium, bg: "#fef9c3", color: "#854d0e" },
            { label: pick(T.low), val: stats.low, bg: "#dcfce7", color: "#166534" },
          ].map((s, i) => (
            <div key={i} style={{ padding: "12px 14px", borderRadius: 12, background: s.bg, color: s.color, border: "1px solid rgba(15,23,42,0.14)", boxShadow: "0 8px 20px rgba(2,132,199,0.08)" }}>
              <div style={{ fontSize: 12, fontWeight: 900, opacity: 0.9 }}>{s.label}</div>
              <div style={{ fontSize: 27, fontWeight: 950 }}>{s.val}</div>
            </div>
          ))}
        </div>

        {showDocCard && (
          <div style={{ ...UI.card, borderInlineStart: "5px solid #0c4a6e" }}>
            <div style={UI.sectionTitle}>{pick(T.docCardTitle)}</div>
            <p style={{ fontSize: 12.5, color: "#334155", lineHeight: 1.8, margin: "0 0 12px", fontWeight: 600 }}>{pick(T.docCardHint)}</p>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))", gap: 10 }}>
              <div>
                <label style={labelStyle}>{pick(T.docNo)}</label>
                <input type="text" value={doc.docNo} onChange={(e) => setDoc({ ...doc, docNo: e.target.value })} style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>{pick(T.docRevision)}</label>
                <input type="text" value={doc.revision} onChange={(e) => setDoc({ ...doc, revision: e.target.value })} style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>{pick(T.docIssueDate)}</label>
                <input type="date" value={doc.issueDate} onChange={(e) => setDoc({ ...doc, issueDate: e.target.value })} style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>{pick(T.docPreparedBy)}</label>
                <input type="text" value={doc.preparedBy} onChange={(e) => setDoc({ ...doc, preparedBy: e.target.value })} style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>{pick(T.docReviewedBy)}</label>
                <input type="text" value={doc.reviewedBy} onChange={(e) => setDoc({ ...doc, reviewedBy: e.target.value })} style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>{pick(T.docApprovedBy)}</label>
                <input type="text" value={doc.approvedBy} onChange={(e) => setDoc({ ...doc, approvedBy: e.target.value })} style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>{pick(T.docApprovedOn)}</label>
                <input type="date" value={doc.approvedDate} onChange={(e) => setDoc({ ...doc, approvedDate: e.target.value })} style={inputStyle} />
              </div>
            </div>
            <div style={{ marginTop: 10 }}>
              <label style={labelStyle}>{pick(T.docScope)}</label>
              <input type="text" value={doc.scope} onChange={(e) => setDoc({ ...doc, scope: e.target.value })} placeholder={pick(T.docScopePh)} style={inputStyle} />
            </div>
            <div style={{ marginTop: 12, display: "flex", gap: 8, flexWrap: "wrap" }}>
              <button style={ISO_UI.btn("primary", savingDoc)} onClick={saveDoc} disabled={busy}>
                {savingDoc ? pick({ ar: "⏳ جارٍ الحفظ…", en: "⏳ Saving…" }) : pick(T.saveDoc)}
              </button>
              <button style={ISO_UI.btn("success", exporting)} onClick={exportPdf} disabled={busy}>
                {exporting ? pick(T.exporting) : pick(T.exportPdf)}
              </button>
            </div>
          </div>
        )}

        <div style={{ ...UI.card, display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
          <input type="text" placeholder={pick(T.search)} value={search} onChange={(e) => setSearch(e.target.value)} style={{ ...inputStyle, maxWidth: 280 }} />
          <select value={filter} onChange={(e) => setFilter(e.target.value)} style={{ ...inputStyle, maxWidth: 210 }}>
            <option value="all">{pick(T.fAll)}</option>
            <option value="critical">{pick(T.fCritical)}</option>
            <option value="high">{pick(T.fHigh)}</option>
            <option value="medium">{pick(T.fMedium)}</option>
            <option value="low">{pick(T.fLow)}</option>
          </select>
          <span style={{ fontSize: 13, color: "#0c4a6e", fontWeight: 900 }}>{pick(T.shown)} {filtered.length} / {risks.length}</span>
        </div>

        {showForm && (
          <div style={{ ...UI.card, border: "2px solid #0ea5e9" }}>
            <div style={UI.sectionTitle}>
              {editingId === "__new__" ? pick(T.newTitle) : pick(T.editTitle)}
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 10 }}>
              <div>
                <label style={labelStyle}>{pick(T.area)}</label>
                <select value={draft.area} onChange={(e) => setDraft({ ...draft, area: e.target.value })} style={inputStyle}>
                  {SITE_LOCATIONS.map((s) => <option key={s.v} value={s.v}>{s[lang]}</option>)}
                </select>
              </div>
              <div>
                <label style={labelStyle}>{pick(T.category)}</label>
                <select value={draft.category} onChange={(e) => setDraft({ ...draft, category: e.target.value })} style={inputStyle}>
                  {HAZARD_CATEGORIES.map((c) => <option key={c.v} value={c.v}>{c[lang]}</option>)}
                </select>
              </div>
              <div>
                <label style={labelStyle}>{pick(T.owner)}</label>
                <input type="text" value={draft.owner} onChange={(e) => setDraft({ ...draft, owner: e.target.value })} placeholder={pick(T.ownerPh)} style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>{pick(T.likelihood)}</label>
                <input type="number" min="1" max="5" value={draft.likelihood} onChange={(e) => setDraft({ ...draft, likelihood: Number(e.target.value) || 1 })} style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>{pick(T.severity)}</label>
                <input type="number" min="1" max="5" value={draft.severity} onChange={(e) => setDraft({ ...draft, severity: Number(e.target.value) || 1 })} style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>{pick(T.reviewDate)}</label>
                <input type="date" value={draft.reviewDate || ""} onChange={(e) => setDraft({ ...draft, reviewDate: e.target.value })} style={inputStyle} />
              </div>
            </div>
            <div style={{ marginTop: 10 }}>
              <label style={labelStyle}>{pick(T.hazard)}</label>
              <input type="text" value={draft.hazard} onChange={(e) => setDraft({ ...draft, hazard: e.target.value })} placeholder={pick(T.hazardPh)} style={inputStyle} />
            </div>
            <div style={{ marginTop: 10 }}>
              <label style={labelStyle}>{pick(T.consequence)}</label>
              <textarea value={draft.consequence} onChange={(e) => setDraft({ ...draft, consequence: e.target.value })} style={{ ...inputStyle, minHeight: 60 }} />
            </div>
            <div style={{ marginTop: 10 }}>
              <label style={labelStyle}>{pick(T.controls)}</label>
              <textarea value={draft.controls} onChange={(e) => setDraft({ ...draft, controls: e.target.value })} style={{ ...inputStyle, minHeight: 90 }} />
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 10, marginTop: 10 }}>
              <div>
                <label style={labelStyle}>{pick(T.controlType)}</label>
                <select value={draft.controlType || "administrative"} onChange={(e) => setDraft({ ...draft, controlType: e.target.value })} style={inputStyle}>
                  {CONTROL_TYPES.map((c) => <option key={c.v} value={c.v}>{c[lang]}</option>)}
                </select>
              </div>
              <div>
                <label style={labelStyle}>{pick(T.linkedSop)}</label>
                <select value={draft.linkedSop || ""} onChange={(e) => setDraft({ ...draft, linkedSop: e.target.value })} style={inputStyle}>
                  <option value="">{pick(T.noSop)}</option>
                  {SOP_OPTIONS.map((o) => <option key={o.code} value={o.code}>{o.code} — {o.title[lang]}</option>)}
                </select>
              </div>
              <div>
                <label style={labelStyle}>{pick(T.linkedForm)}</label>
                <input type="text" value={draft.linkedForm || ""} onChange={(e) => setDraft({ ...draft, linkedForm: e.target.value })} placeholder={pick(T.linkedFormPh)} style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>{pick(T.resLikelihood)}</label>
                <input type="number" min="0" max="5" value={draft.residualLikelihood || 0} onChange={(e) => setDraft({ ...draft, residualLikelihood: Number(e.target.value) || 0 })} style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>{pick(T.resSeverity)}</label>
                <input type="number" min="0" max="5" value={draft.residualSeverity || 0} onChange={(e) => setDraft({ ...draft, residualSeverity: Number(e.target.value) || 0 })} style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>{pick(T.reviewedBy)}</label>
                <input type="text" value={draft.reviewedBy || ""} onChange={(e) => setDraft({ ...draft, reviewedBy: e.target.value })} style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>{pick(T.reviewedDate)}</label>
                <input type="date" value={draft.reviewedDate || ""} onChange={(e) => setDraft({ ...draft, reviewedDate: e.target.value })} style={inputStyle} />
              </div>
            </div>

            <div style={{ marginTop: 10 }}>
              <label style={labelStyle}>{pick(T.attachments)}</label>
              <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                <label style={{ ...ISO_UI.btn("secondary"), cursor: uploading ? "default" : "pointer", opacity: uploading ? 0.6 : 1 }}>
                  {uploading ? pick(T.uploading) : pick(T.addFile)}
                  <input
                    type="file"
                    style={{ display: "none" }}
                    disabled={uploading}
                    onChange={(e) => { const f = e.target.files && e.target.files[0]; e.target.value = ""; attachFile(f); }}
                  />
                </label>
                {(draft.attachments || []).map((a, i) => (
                  <span key={a.url + i} style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "5px 11px", borderRadius: 999, background: "#e0f2fe", border: "1px solid rgba(15,23,42,0.14)", fontSize: 12.5, fontWeight: 700 }}>
                    <a href={a.url} target="_blank" rel="noreferrer" style={{ color: "#0c4a6e", fontWeight: 800 }}>{a.name || "file"}</a>
                    <button
                      type="button"
                      onClick={() => setDraft({ ...draft, attachments: (draft.attachments || []).filter((_, j) => j !== i) })}
                      style={{ border: "none", background: "transparent", color: "#b91c1c", fontWeight: 900, cursor: "pointer" }}
                      title={pick(T.removeFile)}
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            </div>

            <div style={{ marginTop: 12, padding: 10, borderRadius: 10, background: "#e0f2fe", display: "flex", gap: 14, alignItems: "center", flexWrap: "wrap" }}>
              <span style={{ fontSize: 13, fontWeight: 900 }}>{pick(T.currentScore)}</span>
              <span style={{ padding: "4px 11px", borderRadius: 999, background: riskLevelLabel(calcRiskScore(draft.likelihood, draft.severity), lang).bg, color: riskLevelLabel(calcRiskScore(draft.likelihood, draft.severity), lang).color, fontWeight: 900 }}>
                {calcRiskScore(draft.likelihood, draft.severity)} — {riskLevelLabel(calcRiskScore(draft.likelihood, draft.severity), lang).level}
              </span>
              <span style={{ fontSize: 13, fontWeight: 900 }}>{pick(T.residualTitle)}:</span>
              {residualScoreOf(draft) === null ? (
                <span style={{ fontSize: 12.5, color: "#475569", fontWeight: 800 }}>{pick(T.notAssessed)}</span>
              ) : (
                <span style={{ padding: "4px 11px", borderRadius: 999, background: riskLevelLabel(residualScoreOf(draft), lang).bg, color: riskLevelLabel(residualScoreOf(draft), lang).color, fontWeight: 900 }}>
                  {residualScoreOf(draft)} — {riskLevelLabel(residualScoreOf(draft), lang).level}
                </span>
              )}
            </div>

            <div style={{ marginTop: 12, display: "flex", gap: 8 }}>
              <button style={ISO_UI.btn("success", saving)} onClick={save} disabled={busy}>
                {saving ? (pick({ ar: "⏳ جارٍ الحفظ…", en: "⏳ Saving…" })) : pick(T.save)}
              </button>
              <button style={ISO_UI.btn("secondary")} onClick={() => { setShowForm(false); setEditingId(null); }} disabled={busy}>{pick(T.cancel)}</button>
            </div>
          </div>
        )}

        <div style={{ ...UI.card, padding: 0, overflowX: "auto" }}>
          <table style={UI.table}>
            <thead>
              <tr style={ISO_UI.theadRow}>
                <th style={UI.th}>{pick(T.cols.area)}</th>
                <th style={UI.th}>{pick(T.cols.hazard)}</th>
                <th style={UI.th}>{pick(T.cols.score)}</th>
                <th style={UI.th}>{pick(T.cols.level)}</th>
                <th style={UI.th}>{pick(T.cols.controls)}</th>
                <th style={UI.th}>{pick(T.pdfResidual)}</th>
                <th style={UI.th}>{pick(T.cols.owner)}</th>
                <th style={UI.th}>{pick(T.cols.actions)}</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r) => {
                const score = calcRiskScore(r.likelihood, r.severity);
                const lvl = riskLevelLabel(score, lang);
                const res = residualScoreOf(r);
                const resLvl = res === null ? null : riskLevelLabel(res, lang);
                const areaItem = SITE_LOCATIONS.find((s) => s.v === r.area);
                const areaTxt = areaItem ? areaItem[lang] : r.area;
                return (
                  <tr key={r.id}>
                    <td style={{ ...UI.td, fontWeight: 800, whiteSpace: "nowrap" }}>{areaTxt}</td>
                    <td style={{ ...UI.td, fontWeight: 800, minWidth: 240 }}>
                      {txt(r.hazard, lang)}
                      {r.consequence && <div style={{ fontSize: 12, color: "#475569", marginTop: 4, fontWeight: 600 }}>↳ {txt(r.consequence, lang)}</div>}
                    </td>
                    <td style={{ ...UI.td, textAlign: "center", fontWeight: 900, whiteSpace: "nowrap" }}>{r.likelihood} × {r.severity} = {score}</td>
                    <td style={{ ...UI.td, textAlign: "center" }}>
                      <span style={{ padding: "3px 9px", borderRadius: 8, background: lvl.bg, color: lvl.color, fontWeight: 900, fontSize: 12 }}>
                        {lvl.level}
                      </span>
                    </td>
                    <td style={{ ...UI.td, minWidth: 320 }}>
                      {txt(r.controls, lang)}
                      <div style={{ marginTop: 6, display: "flex", gap: 5, flexWrap: "wrap" }}>
                        {r.controlType && <span style={UI.chip("#e0e7ff", "#3730a3")}>{localize(CONTROL_TYPES, r.controlType, lang)}</span>}
                        {r.linkedSop && <span style={UI.chip("#dcfce7", "#166534")}>{r.linkedSop}</span>}
                        {r.linkedForm && <span style={UI.chip("#fef9c3", "#854d0e")}>{r.linkedForm}</span>}
                        {(r.attachments || []).length > 0 && <span style={UI.chip("#fee2e2", "#7f1d1d")}>📎 {(r.attachments || []).length}</span>}
                      </div>
                    </td>
                    <td style={{ ...UI.td, textAlign: "center", whiteSpace: "nowrap" }}>
                      {res === null ? (
                        <span style={{ color: "#94a3b8", fontWeight: 800 }}>—</span>
                      ) : (
                        <span style={{ padding: "3px 9px", borderRadius: 8, background: resLvl.bg, color: resLvl.color, fontWeight: 900, fontSize: 12 }}>
                          {r.residualLikelihood} × {r.residualSeverity} = {res}
                        </span>
                      )}
                    </td>
                    <td style={{ ...UI.td, fontWeight: 800 }}>{r.owner}</td>
                    <td style={{ ...UI.td, textAlign: "center", whiteSpace: "nowrap" }}>
                      <button style={{ ...ISO_UI.btn("secondary"), padding: "5px 11px" }} onClick={() => startEdit(r)}>{pick(T.edit)}</button>
                      <button style={{ ...ISO_UI.btn("danger"), padding: "5px 11px", marginInlineStart: 5 }} onClick={() => remove(r.id)}>{pick(T.del)}</button>
                    </td>
                  </tr>
                );
              })}
              {filtered.length === 0 && (
                <tr><td colSpan="8" style={{ ...UI.td, textAlign: "center", padding: 30, color: "#64748b" }}>{pick(T.noResults)}</td></tr>
              )}
            </tbody>
          </table>
        </div>

        {/* وثيقة الـ PDF — تُرسم خارج #root عبر بوابة حتى لا تفرض عليها
            globals.css قاعدة `#root * { font-size: 14px !important }` */}
        {createPortal(
          <div ref={pdfRef} style={pdfStageStyle(1500)} dir={dir}>
            <div style={{ display: "flex", alignItems: "center", gap: 14, borderBottom: "3px solid #0c4a6e", paddingBottom: 10 }}>
              <img src={mawashiLogo} alt="" style={{ height: 52 }} />
              <div style={{ flex: 1 }}>
                <div style={PDF_UI.h1}>{pick(T.pdfTitle)}</div>
                <div style={PDF_UI.sub}>{pick(T.pdfCompany)}</div>
              </div>
            </div>

            <table style={PDF_UI.metaTable}>
              <tbody>
                <tr>
                  <td style={PDF_UI.th}>{pick(T.docNo)}</td><td style={PDF_UI.td}>{doc.docNo || "—"}</td>
                  <td style={PDF_UI.th}>{pick(T.docRevision)}</td><td style={PDF_UI.td}>{doc.revision || "—"}</td>
                  <td style={PDF_UI.th}>{pick(T.docIssueDate)}</td><td style={PDF_UI.td}>{doc.issueDate || "—"}</td>
                  <td style={PDF_UI.th}>{pick(T.pdfPrintedOn)}</td><td style={PDF_UI.td}>{todayISO()}</td>
                </tr>
                <tr>
                  <td style={PDF_UI.th}>{pick(T.docScope)}</td>
                  <td style={PDF_UI.td} colSpan={5}>{doc.scope || "—"}</td>
                  <td style={PDF_UI.th}>{pick(T.pdfRows)}</td><td style={PDF_UI.td}>{filtered.length}</td>
                </tr>
              </tbody>
            </table>

            <div style={{ fontSize: 10, color: "#4b5563", marginTop: 8 }}>{pick(T.pdfLegend)}</div>

            <table style={{ ...PDF_UI.table, marginTop: 8 }}>
              <thead>
                <tr>
                  <th style={{ ...PDF_UI.th, width: 26 }}>{pick(T.pdfNo)}</th>
                  <th style={{ ...PDF_UI.th, width: 116 }}>{pick(T.cols.area)}</th>
                  <th style={{ ...PDF_UI.th, width: 200 }}>{pick(T.hazard)}</th>
                  <th style={{ ...PDF_UI.th, width: 170 }}>{pick(T.consequence)}</th>
                  <th style={{ ...PDF_UI.th, width: 78 }}>{pick(T.pdfInitial)}</th>
                  <th style={{ ...PDF_UI.th, width: 96 }}>{pick(T.controlType)}</th>
                  <th style={PDF_UI.th}>{pick(T.controls)}</th>
                  <th style={{ ...PDF_UI.th, width: 104 }}>{pick(T.pdfRef)}</th>
                  <th style={{ ...PDF_UI.th, width: 78 }}>{pick(T.pdfResidual)}</th>
                  <th style={{ ...PDF_UI.th, width: 104 }}>{pick(T.owner)}</th>
                  <th style={{ ...PDF_UI.th, width: 74 }}>{pick(T.reviewDate)}</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((r, i) => {
                  const score = calcRiskScore(r.likelihood, r.severity);
                  const lvl = riskLevelLabel(score, lang);
                  const res = residualScoreOf(r);
                  const resLvl = res === null ? null : riskLevelLabel(res, lang);
                  const areaItem = SITE_LOCATIONS.find((x) => x.v === r.area);
                  const sop = findSop(r.linkedSop);
                  return (
                    <tr key={r.id || i}>
                      <td style={{ ...PDF_UI.td, textAlign: "center" }}>{i + 1}</td>
                      <td style={PDF_UI.td}>{areaItem ? areaItem[lang] : r.area}</td>
                      <td style={{ ...PDF_UI.td, fontWeight: 700 }}>{txt(r.hazard, lang)}</td>
                      <td style={PDF_UI.td}>{txt(r.consequence, lang)}</td>
                      <td style={{ ...PDF_UI.td, textAlign: "center", background: lvl.bg, color: lvl.color, fontWeight: 800 }}>
                        {r.likelihood} × {r.severity} = {score}
                        <div style={{ fontSize: 9 }}>{lvl.level}</div>
                      </td>
                      <td style={PDF_UI.td}>{localize(CONTROL_TYPES, r.controlType, lang) || "—"}</td>
                      <td style={PDF_UI.td}>{txt(r.controls, lang)}</td>
                      <td style={PDF_UI.td}>
                        {r.linkedSop ? <div style={{ fontWeight: 700 }}>{r.linkedSop}</div> : null}
                        {sop ? <div style={{ fontSize: 9, color: "#4b5563" }}>{sop.title[lang]}</div> : null}
                        {r.linkedForm ? <div style={{ marginTop: 3 }}>{r.linkedForm}</div> : null}
                        {!r.linkedSop && !r.linkedForm ? "—" : null}
                      </td>
                      <td style={{ ...PDF_UI.td, textAlign: "center", ...(resLvl ? { background: resLvl.bg, color: resLvl.color, fontWeight: 800 } : {}) }}>
                        {res === null ? "—" : (
                          <>
                            {r.residualLikelihood} × {r.residualSeverity} = {res}
                            <div style={{ fontSize: 9 }}>{resLvl.level}</div>
                          </>
                        )}
                      </td>
                      <td style={PDF_UI.td}>{r.owner || "—"}</td>
                      <td style={{ ...PDF_UI.td, textAlign: "center" }}>{r.reviewDate || "—"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            <table style={{ ...PDF_UI.metaTable, marginTop: 18 }}>
              <tbody>
                <tr>
                  {[
                    { label: pick(T.docPreparedBy), name: doc.preparedBy, date: doc.issueDate },
                    { label: pick(T.docReviewedBy), name: doc.reviewedBy, date: "" },
                    { label: pick(T.docApprovedBy), name: doc.approvedBy, date: doc.approvedDate },
                  ].map((b, i) => (
                    <td key={i} style={PDF_UI.signBox}>
                      <div style={{ fontWeight: 800, marginBottom: 6 }}>{b.label}</div>
                      <div>{pick(T.pdfName)}: {b.name || "________________________"}</div>
                      <div style={{ marginTop: 4 }}>{pick(T.pdfDate)}: {b.date || "____________"}</div>
                      <div style={{ marginTop: 12 }}>{pick(T.pdfSign)}: ____________________</div>
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>,
          document.body
        )}
      </div>
    </main>
  );
}
