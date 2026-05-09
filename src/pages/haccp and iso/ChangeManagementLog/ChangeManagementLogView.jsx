// src/pages/haccp and iso/ChangeManagementLog/ChangeManagementLogView.jsx
// FSMS Change Management Log — ISO 22000:2018 Clause 6.3 (Planning of Changes)
// Source: FSMS-RA-01 controlled document — TELT actual change history 2025
// Distinct from Continual Improvement (10.2): this captures FSMS-impacting structural changes
// (relocations, team changes, supplier list updates, calibration provider changes, IT system upgrades),
// each evaluated for FSMS impact, approved by Top Management, implemented and verified.

import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import API_BASE from "../../../config/api";
import HaccpLinkBadge from "../FSMSManual/HaccpLinkBadge";
import { useHaccpLang, HaccpLangToggle } from "../_shared/haccpI18n";

const TYPE = "fsms_change_management_log_item";

/* ─────────────────────────────────────────────────────────────
   Procedure overview — the 6 mandatory steps from FSMS-RA-01
   ───────────────────────────────────────────────────────────── */
const PROCEDURE_STEPS = [
  { step: 1, action: { ar: "تحديد ووصف التغيير المقترح",                  en: "Identify and describe proposed change" },
             responsible: { ar: "القسم المعني",                              en: "Concerned Department" } },
  { step: 2, action: { ar: "تقييم الأثر على FSMS وسلامة الغذاء",            en: "Evaluate impact on FSMS and food safety" },
             responsible: { ar: "فريق FSMS / مسؤول QA",                       en: "FSMS Team / QA in charge" } },
  { step: 3, action: { ar: "اعتماد التغيير قبل التنفيذ",                     en: "Approve change prior to implementation" },
             responsible: { ar: "الإدارة العليا",                              en: "Top Management" } },
  { step: 4, action: { ar: "تنفيذ التغيير تحت الإشراف",                       en: "Implement change under supervision" },
             responsible: { ar: "رئيس القسم",                                  en: "Department Head" } },
  { step: 5, action: { ar: "تحديث وثائق وسجلات FSMS",                         en: "Update FSMS documents and records" },
             responsible: { ar: "QA / مسؤول ضبط الوثائق",                      en: "QA / Document Controller" } },
  { step: 6, action: { ar: "التحقق من فعالية التغيير",                          en: "Verify effectiveness of change" },
             responsible: { ar: "فريق FSMS",                                   en: "FSMS Team" } },
];

/* ─────────────────────────────────────────────────────────────
   Status options — for ongoing changes UI
   ───────────────────────────────────────────────────────────── */
const STATUSES = [
  { v: "verified",     ar: "تم التحقق",       en: "Verified",     color: "#166534", bg: "#dcfce7" },
  { v: "implemented",  ar: "تم التنفيذ",      en: "Implemented",  color: "#1e40af", bg: "#dbeafe" },
  { v: "approved",     ar: "معتمد",            en: "Approved",     color: "#854d0e", bg: "#fef9c3" },
  { v: "in_review",    ar: "قيد المراجعة",   en: "In Review",    color: "#9a3412", bg: "#fed7aa" },
  { v: "rejected",     ar: "مرفوض",            en: "Rejected",     color: "#7f1d1d", bg: "#fee2e2" },
];

/* ─────────────────────────────────────────────────────────────
   Seed data — 9 actual changes from FSMS-RA-01 (2025)
   ───────────────────────────────────────────────────────────── */
const SEED_CHANGES = [
  {
    id: "chg-1", logNo: 1, date: "2025-07-10",
    description:        { ar: "تغيير أعضاء فريق سلامة الغذاء", en: "Food Safety Team members changed" },
    reason:             { ar: "إعادة الهيكلة التنظيمية",        en: "Organizational restructuring" },
    impact:             { ar: "تمت مراجعة خطة HACCP؛ وأُجري تدريب للأعضاء الجدد", en: "HACCP plan reviewed; training conducted for new members" },
    approvedBy:         "QA Manager",
    implementationDate: "2025-10-07",
    verification:       { ar: "تم التحقق – فعّال",               en: "Verified – effective" },
    status: "verified",
  },
  {
    id: "chg-2", logNo: 2, date: "2025-08-20",
    description:        { ar: "نقل منطقة الإنتاج من جبل علي إلى مستودع القصيص", en: "Production area shifted from Jebel Ali to Qusais Warehouse" },
    reason:             { ar: "نقل المنشأة لتحسين اللوجستيات والامتثال",        en: "Facility relocation for improved logistics and compliance" },
    impact:             { ar: "تمت مراجعة البنية التحتية و PRPs؛ وتم التحقق",     en: "Infrastructure and PRPs reviewed; validation done" },
    approvedBy:         "Operations Manager",
    implementationDate: "2025-08-25",
    verification:       { ar: "تم التحقق – مطابق",                                 en: "Verified – compliant" },
    status: "verified",
  },
  {
    id: "chg-3", logNo: 3, date: "2025-08-30",
    description:        { ar: "نقل المكتب الرئيسي إلى موقع جديد",   en: "Head Office relocated to new location" },
    reason:             { ar: "توسعات الأعمال",                       en: "Business expansion" },
    impact:             { ar: "لا أثر على سلامة الغذاء؛ تم تحديث الوثائق", en: "No impact on food safety; documents updated" },
    approvedBy:         "Admin Manager",
    implementationDate: "2025-08-30",
    verification:       { ar: "تم التحقق",                            en: "Verified" },
    status: "verified",
  },
  {
    id: "chg-4", logNo: 4, date: "2025-09-05",
    description:        { ar: "تغيير فريق تشغيل المستودع",                en: "Warehouse operation team changed" },
    reason:             { ar: "تحسين التوظيف والعمليات",                  en: "Staffing and operational improvement" },
    impact:             { ar: "تم استكمال التدريب التعريفي وتدريب سلامة الغذاء", en: "Orientation and food safety training completed" },
    approvedBy:         "QA Manager",
    implementationDate: "2025-09-10",
    verification:       { ar: "تم التحقق",                                 en: "Verified" },
    status: "verified",
  },
  {
    id: "chg-5", logNo: 5, date: "2025-06-20",
    description:        { ar: "إيقاف الذبح الحي مؤقتاً",                  en: "Live animal slaughtering temporarily stopped" },
    reason:             { ar: "تعديل تشغيلي",                              en: "Operational adjustment" },
    impact:             { ar: "تم تحديث خطة HACCP؛ وأُجريت مراجعة CCP",     en: "HACCP plan updated; CCP review conducted" },
    approvedBy:         "Production Manager",
    implementationDate: "2025-06-20",
    verification:       { ar: "تم التحقق",                                 en: "Verified" },
    status: "verified",
  },
  {
    id: "chg-6", logNo: 6, date: "2025-09-20",
    description:        { ar: "تحديث قائمة الموردين (موردون جدد للدجاج والضأن)", en: "Supplier list updated (new chicken & lamb suppliers)" },
    reason:             { ar: "اعتماد موردين جدد",                                en: "New supplier approval" },
    impact:             { ar: "تم استكمال تقييم الموردين؛ وتحديث السجلات",       en: "Supplier evaluation completed; records updated" },
    approvedBy:         "Procurement Manager",
    implementationDate: "2025-09-20",
    verification:       { ar: "تم التحقق",                                       en: "Verified" },
    status: "verified",
  },
  {
    id: "chg-7", logNo: 7, date: "2025-05-10",
    description:        { ar: "تغيير مزوّدي الخدمة (المعايرة، الإجراءات)", en: "Change of service providers (calibration, procedures)" },
    reason:             { ar: "كفاءة التكلفة والموثوقية",                       en: "Cost efficiency and reliability" },
    impact:             { ar: "تم اعتماد المزوّدين؛ ومراجعة شهادات الخدمة",     en: "Approved providers validated; service certificates reviewed" },
    approvedBy:         "QA Manager",
    implementationDate: "2025-05-10",
    verification:       { ar: "تم التحقق",                                       en: "Verified" },
    status: "verified",
  },
  {
    id: "chg-8", logNo: 8, date: "2025-07-10",
    description:        { ar: "استبدال شركة المعايرة",                                en: "Calibration company replaced" },
    reason:             { ar: "تحسين العقد والجودة",                                  en: "Contract and quality improvement" },
    impact:             { ar: "تم التحقق من المزوّد الجديد؛ وتحديث جدول المعايرة",      en: "New provider verified; calibration schedule updated" },
    approvedBy:         "Maintenance Supervisor",
    implementationDate: "2025-07-10",
    verification:       { ar: "تم التحقق",                                            en: "Verified" },
    status: "verified",
  },
  {
    id: "chg-9", logNo: 9, date: "2025-09-10",
    description:        { ar: "تحديث نظام تقنية المعلومات للتوثيق",       en: "IT system update for documentation" },
    reason:             { ar: "تحسين السجل الرقمي لـ FSMS",                  en: "FSMS digital record improvement" },
    impact:             { ar: "تم التحقق؛ تأمين النسخ الاحتياطي للبيانات",     en: "Validation done; data backup secured" },
    approvedBy:         "IT Manager",
    implementationDate: "2025-09-10",
    verification:       { ar: "تم التحقق",                                  en: "Verified" },
    status: "verified",
  },
];

/* ─────────────────────────────────────────────────────────────
   UI strings (bilingual)
   ───────────────────────────────────────────────────────────── */
const T = {
  pageTitle:    { ar: "🔄 سجل إدارة التغييرات — FSMS-RA-01", en: "🔄 Change Management Log — FSMS-RA-01" },
  pageSubtitle: { ar: "ISO 22000:2018 §6.3 — تخطيط التغييرات في FSMS",
                  en: "ISO 22000:2018 §6.3 — Planning of Changes in FSMS" },
  pageIntro: {
    ar: "البند 6.3 من ISO 22000:2018 يلزم بأن تكون أي تغييرات تؤثر على FSMS مخطّطة ومُقيَّمة ومعتمدة قبل التنفيذ. هذا السجل يُوثّق كل تغيير منذ النشأة (الإدارة، المنشأة، الموردين، المعايرة، تقنية المعلومات، الخ) مع مراجعة الإدارة وتحديث الوثائق ذات الصلة (HACCP Plan، PRPs، SOPs، قائمة الموردين). البيانات الأولية الـ9 المُحمّلة هي تغييرات حقيقية من 2025 لـ TELT/Al Mawashi مأخوذة من الوثيقة المضبوطة FSMS-RA-01.",
    en: "ISO 22000:2018 Clause 6.3 requires that any changes affecting the FSMS be planned, evaluated, and approved before implementation. This log documents every change (management, facility, suppliers, calibration, IT, etc.) with management review and updated related documents (HACCP Plan, PRPs, SOPs, Supplier List). The 9 pre-loaded entries are actual 2025 TELT/Al Mawashi changes, transcribed from the controlled document FSMS-RA-01.",
  },
  procedureTitle: { ar: "📋 إجراء التخطيط — 6 خطوات إلزامية", en: "📋 Planning Procedure — 6 mandatory steps" },
  back:         { ar: "← الرئيسية",                en: "← Hub" },
  add:          { ar: "+ تسجيل تغيير جديد",        en: "+ Log new change" },
  newTitle:     { ar: "➕ تسجيل تغيير جديد",       en: "➕ New change record" },
  editTitle:    { ar: "✏️ تعديل التغيير",          en: "✏️ Edit change" },
  search:       { ar: "🔍 بحث…",                   en: "🔍 Search…" },
  shown:        { ar: "المعروض:",                  en: "Showing:" },
  total:        { ar: "إجمالي التغييرات",          en: "Total Changes" },
  verifiedCount:{ ar: "تم التحقق",                  en: "Verified" },
  pending:      { ar: "غير مكتمل",                  en: "Pending" },
  fAll:         { ar: "كل الحالات",                 en: "All statuses" },
  logNo:        { ar: "رقم السجل",                  en: "Log No." },
  date:         { ar: "تاريخ التغيير",               en: "Change Date" },
  description:  { ar: "وصف التغيير",                en: "Description of Change" },
  descPh:       { ar: "ما الذي تغيّر؟…",            en: "What changed?…" },
  reason:       { ar: "سبب التغيير",                en: "Reason for Change" },
  reasonPh:     { ar: "لماذا تم هذا التغيير؟…",   en: "Why was this change made?…" },
  impact:       { ar: "أثر / تقييم المخاطر على FSMS", en: "Impact / Risk Assessment on FSMS" },
  impactPh:     { ar: "ما الأثر على HACCP/PRPs/الوثائق؟…", en: "What's the impact on HACCP/PRPs/documents?…" },
  approvedBy:   { ar: "اعتمده",                     en: "Approved By" },
  approvedByPh: { ar: "QA Manager / GM…",          en: "QA Manager / GM…" },
  implDate:     { ar: "تاريخ التنفيذ",               en: "Implementation Date" },
  verif:        { ar: "التحقق / الملاحظات",         en: "Verification / Remarks" },
  verifPh:      { ar: "نتيجة التحقق…",              en: "Verification result…" },
  status:       { ar: "الحالة",                      en: "Status" },
  save:         { ar: "💾 حفظ",                     en: "💾 Save" },
  cancel:       { ar: "إلغاء",                       en: "Cancel" },
  edit:         { ar: "تعديل",                       en: "Edit" },
  del:          { ar: "حذف",                         en: "Delete" },
  noResults:    { ar: "لا توجد سجلات مطابقة",        en: "No matching records" },
  enterDesc:    { ar: "اكتب وصف التغيير أولاً",      en: "Enter the change description first" },
  confirmDel:   { ar: "حذف هذا السجل؟",              en: "Delete this entry?" },
  procCols: {
    step: { ar: "خطوة", en: "Step" },
    action: { ar: "الإجراء", en: "Action" },
    resp: { ar: "المسؤول", en: "Responsible" },
  },
  cols: {
    no:    { ar: "#",     en: "#" },
    date:  { ar: "التاريخ", en: "Date" },
    desc:  { ar: "الوصف",  en: "Description" },
    reason:{ ar: "السبب",  en: "Reason" },
    impact:{ ar: "الأثر",  en: "Impact" },
    appr:  { ar: "المعتمد", en: "Approved" },
    impl:  { ar: "تاريخ التنفيذ", en: "Impl. Date" },
    verif: { ar: "التحقق",  en: "Verification" },
    status:{ ar: "الحالة",  en: "Status" },
    actions:{ ar: "أدوات", en: "Tools" },
  },
};

/* ─────────────────────────────────────────────────────────────
   Helpers
   ───────────────────────────────────────────────────────────── */
function todayISO() { return new Date().toISOString().slice(0, 10); }

function txt(v, lang) {
  if (v == null) return "";
  if (typeof v === "string") return v;
  if (typeof v === "object") return v[lang] ?? v.ar ?? v.en ?? "";
  return String(v);
}

function blank() {
  return {
    logNo: "",
    date: todayISO(),
    description: "",
    reason: "",
    impact: "",
    approvedBy: "",
    implementationDate: "",
    verification: "",
    status: "in_review",
  };
}

/* ─────────────────────────────────────────────────────────────
   Styles — purple/indigo palette (3rd FSMS clause family)
   ───────────────────────────────────────────────────────────── */
const S = {
  shell: {
    minHeight: "100vh", padding: "20px 16px",
    fontFamily: 'system-ui,-apple-system,"Segoe UI",sans-serif',
    background: "linear-gradient(180deg, #faf5ff 0%, #eef2ff 60%, #f8fafc 100%)",
    color: "#0f172a",
  },
  layout: { width: "100%", margin: "0 auto" },
  topbar: {
    display: "flex", justifyContent: "space-between", alignItems: "center",
    marginBottom: 14, flexWrap: "wrap", gap: 10,
    padding: "12px 16px",
    background: "rgba(255,255,255,0.92)",
    borderRadius: 14, border: "1px solid #ddd6fe",
    boxShadow: "0 8px 24px rgba(124,58,237,0.10)",
  },
  title: { fontSize: 22, fontWeight: 950, color: "#5b21b6", lineHeight: 1.2 },
  subtitle: { fontSize: 12, color: "#6d28d9", marginTop: 4, fontWeight: 700 },
  card: { background: "#fff", borderRadius: 14, padding: 18, marginBottom: 12, border: "1px solid #ddd6fe", boxShadow: "0 6px 16px rgba(124,58,237,0.06)" },
  intro: { background: "linear-gradient(135deg,#ede9fe,#fff)", borderRadius: 14, padding: 16, marginBottom: 14, borderInlineStart: "5px solid #7c3aed", fontSize: 14, lineHeight: 1.85, color: "#0f172a" },
  sectionTitle: { fontSize: 16, fontWeight: 950, color: "#5b21b6", marginBottom: 8 },
  table: { width: "100%", borderCollapse: "collapse", fontSize: 13 },
  th: { padding: "10px 12px", textAlign: "start", background: "#5b21b6", color: "#fff", fontWeight: 900, fontSize: 11, textTransform: "uppercase", letterSpacing: "0.05em", whiteSpace: "nowrap" },
  td: { padding: "10px 12px", borderTop: "1px solid #faf5ff", verticalAlign: "top" },
  input: { width: "100%", padding: "9px 11px", border: "1.5px solid #ddd6fe", borderRadius: 10, fontSize: 13, fontWeight: 600, fontFamily: "inherit", background: "#fff" },
  label: { display: "block", fontSize: 12, fontWeight: 900, color: "#5b21b6", marginBottom: 4, marginTop: 8 },

  kpiGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 10, marginBottom: 14 },
  kpi: (bg, color) => ({
    padding: "12px 14px", borderRadius: 12, background: bg, color,
    border: "1px solid rgba(0,0,0,0.06)", boxShadow: "0 4px 12px rgba(124,58,237,0.06)",
  }),

  statusBadge: (status) => {
    const item = STATUSES.find((s) => s.v === status) || STATUSES[2];
    return { padding: "3px 10px", borderRadius: 999, background: item.bg, color: item.color, fontWeight: 900, fontSize: 11, whiteSpace: "nowrap" };
  },

  btn: (kind) => {
    const map = {
      primary:   { bg: "linear-gradient(180deg, #8b5cf6, #7c3aed)", color: "#fff", border: "#6d28d9" },
      secondary: { bg: "#fff", color: "#5b21b6", border: "#ddd6fe" },
      success:   { bg: "linear-gradient(180deg, #22c55e, #16a34a)", color: "#fff", border: "#15803d" },
      danger:    { bg: "linear-gradient(180deg, #ef4444, #dc2626)", color: "#fff", border: "#b91c1c" },
      ghost:     { bg: "transparent", color: "#5b21b6", border: "#8b5cf6" },
    };
    const c = map[kind] || map.primary;
    return {
      background: c.bg, color: c.color, border: `1.5px solid ${c.border}`,
      padding: "8px 14px", borderRadius: 999, cursor: "pointer",
      fontWeight: 900, fontSize: 13, whiteSpace: "nowrap",
    };
  },
};

/* ─────────────────────────────────────────────────────────────
   Component
   ───────────────────────────────────────────────────────────── */
export default function ChangeManagementLogView() {
  const navigate = useNavigate();
  const { lang, toggle, dir } = useHaccpLang();
  const isAr = lang === "ar";
  const pick = (obj) => (obj?.[lang] ?? obj?.ar ?? obj?.en ?? "");

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [draft, setDraft] = useState(blank());
  const [showForm, setShowForm] = useState(false);

  const seededRef = useRef(false);

  /* Load from API. If the DB is empty on first load, persist the 9 seed
     changes once (so they become editable real records). After that,
     just render whatever's in the DB. */
  async function load() {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/reports?type=${encodeURIComponent(TYPE)}`, { cache: "no-store" });
      const json = await res.json().catch(() => null);
      const arr = Array.isArray(json) ? json : json?.data || json?.items || [];
      const fetched = arr
        .map((rec) => ({ _recordId: rec.id, ...(rec?.payload || {}) }))
        .filter((x) => x.id);

      if (fetched.length === 0 && !seededRef.current) {
        seededRef.current = true;
        for (const seed of SEED_CHANGES) {
          try { await persistItem({ ...seed }); } catch {}
        }
        const res2 = await fetch(`${API_BASE}/api/reports?type=${encodeURIComponent(TYPE)}`, { cache: "no-store" });
        const json2 = await res2.json().catch(() => null);
        const arr2 = Array.isArray(json2) ? json2 : json2?.data || json2?.items || [];
        const seededItems = arr2
          .map((rec) => ({ _recordId: rec.id, ...(rec?.payload || {}) }))
          .filter((x) => x.id);
        setItems(seededItems.length ? seededItems : SEED_CHANGES);
      } else {
        setItems(fetched);
      }
    } catch {
      setItems(SEED_CHANGES);
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => { load(); }, []);

  async function persistItem(item) {
    const url = item._recordId
      ? `${API_BASE}/api/reports/${encodeURIComponent(item._recordId)}`
      : `${API_BASE}/api/reports`;
    const method = item._recordId ? "PUT" : "POST";
    const { _recordId, ...payload } = item;
    payload.savedAt = Date.now();
    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reporter: payload.approvedBy || "admin", type: TYPE, payload }),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res;
  }

  async function deleteItem(recordId) {
    if (!recordId) return;
    await fetch(`${API_BASE}/api/reports/${encodeURIComponent(recordId)}`, { method: "DELETE" });
  }

  function startNew() {
    const next = Math.max(0, ...items.map((i) => Number(i.logNo) || 0)) + 1;
    setDraft({ ...blank(), logNo: next });
    setEditingId("__new__");
    setShowForm(true);
  }
  function startEdit(it) {
    setDraft({
      ...it,
      description:  typeof it.description  === "object" ? (it.description[lang]  ?? it.description.ar  ?? "") : it.description,
      reason:       typeof it.reason       === "object" ? (it.reason[lang]       ?? it.reason.ar       ?? "") : it.reason,
      impact:       typeof it.impact       === "object" ? (it.impact[lang]       ?? it.impact.ar       ?? "") : it.impact,
      verification: typeof it.verification === "object" ? (it.verification[lang] ?? it.verification.ar ?? "") : it.verification,
    });
    setEditingId(it.id);
    setShowForm(true);
  }

  async function save() {
    if (!String(draft.description).trim()) { alert(pick(T.enterDesc)); return; }
    try {
      if (editingId === "__new__") {
        const id = `chg_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
        await persistItem({ ...draft, id });
      } else {
        const existing = items.find((r) => r.id === editingId);
        await persistItem({ ...existing, ...draft, id: editingId });
      }
      await load();
      setShowForm(false);
      setEditingId(null);
    } catch (e) {
      alert("Save error: " + (e?.message || e));
    }
  }

  async function remove(it) {
    if (!window.confirm(pick(T.confirmDel))) return;
    try {
      await deleteItem(it._recordId);
      setItems((prev) => prev.filter((x) => x.id !== it.id));
    } catch (e) {
      alert("Delete error: " + (e?.message || e));
    }
  }

  const filtered = useMemo(() => {
    return items
      .filter((r) => {
        if (filter !== "all" && r.status !== filter) return false;
        if (search.trim()) {
          const s = search.toLowerCase();
          const hay = [r.description, r.reason, r.impact, r.approvedBy, r.verification, r.date]
            .map((v) => txt(v, lang)).join(" ").toLowerCase();
          if (!hay.includes(s)) return false;
        }
        return true;
      })
      .sort((a, b) => (Number(b.logNo) || 0) - (Number(a.logNo) || 0));
  }, [items, filter, search, lang]);

  const stats = useMemo(() => {
    const out = { total: items.length, verified: 0, pending: 0 };
    items.forEach((r) => {
      if (r.status === "verified") out.verified++;
      else out.pending++;
    });
    return out;
  }, [items]);

  const localizeStatus = (val) => {
    const item = STATUSES.find((s) => s.v === val);
    return item ? item[lang] : val;
  };

  return (
    <main style={{ ...S.shell, direction: dir }}>
      <div style={S.layout}>
        {/* Top bar */}
        <div style={S.topbar}>
          <div>
            <div style={S.title}>{pick(T.pageTitle)}</div>
            <div style={S.subtitle}>{pick(T.pageSubtitle)}</div>
            <HaccpLinkBadge clauses={["6.3"]} label={isAr ? "تخطيط التغييرات" : "Planning of Changes"} />
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <HaccpLangToggle lang={lang} toggle={toggle} />
            <button style={S.btn("primary")} onClick={startNew}>{pick(T.add)}</button>
            <button style={S.btn("secondary")} onClick={() => navigate("/haccp-iso")}>{pick(T.back)}</button>
          </div>
        </div>

        {/* Intro */}
        <div style={S.intro}>{pick(T.pageIntro)}</div>

        {/* Procedure */}
        <div style={S.card}>
          <div style={S.sectionTitle}>{pick(T.procedureTitle)}</div>
          <div style={{ overflowX: "auto" }}>
            <table style={S.table}>
              <thead>
                <tr>
                  <th style={{ ...S.th, width: 60, textAlign: "center" }}>{pick(T.procCols.step)}</th>
                  <th style={S.th}>{pick(T.procCols.action)}</th>
                  <th style={S.th}>{pick(T.procCols.resp)}</th>
                </tr>
              </thead>
              <tbody>
                {PROCEDURE_STEPS.map((p) => (
                  <tr key={p.step}>
                    <td style={{ ...S.td, textAlign: "center", fontWeight: 950, color: "#5b21b6", fontSize: 14 }}>{p.step}</td>
                    <td style={{ ...S.td, fontWeight: 700 }}>{txt(p.action, lang)}</td>
                    <td style={S.td}>{txt(p.responsible, lang)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* KPIs */}
        <div style={S.kpiGrid}>
          <div style={S.kpi("#ede9fe", "#5b21b6")}>
            <div style={{ fontSize: 11, fontWeight: 800, opacity: 0.85 }}>{pick(T.total)}</div>
            <div style={{ fontSize: 26, fontWeight: 950 }}>{stats.total}</div>
          </div>
          <div style={S.kpi("#dcfce7", "#166534")}>
            <div style={{ fontSize: 11, fontWeight: 800, opacity: 0.85 }}>✅ {pick(T.verifiedCount)}</div>
            <div style={{ fontSize: 26, fontWeight: 950 }}>{stats.verified}</div>
          </div>
          <div style={S.kpi("#fef9c3", "#854d0e")}>
            <div style={{ fontSize: 11, fontWeight: 800, opacity: 0.85 }}>⏳ {pick(T.pending)}</div>
            <div style={{ fontSize: 26, fontWeight: 950 }}>{stats.pending}</div>
          </div>
        </div>

        {/* Toolbar */}
        <div style={{ ...S.card, display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
          <input type="text" placeholder={pick(T.search)} value={search} onChange={(e) => setSearch(e.target.value)} style={{ ...S.input, maxWidth: 260 }} />
          <select value={filter} onChange={(e) => setFilter(e.target.value)} style={{ ...S.input, maxWidth: 200 }}>
            <option value="all">{pick(T.fAll)}</option>
            {STATUSES.map((s) => <option key={s.v} value={s.v}>{s[lang]}</option>)}
          </select>
          <span style={{ fontSize: 12, color: "#64748b", fontWeight: 700, marginInlineStart: "auto" }}>{pick(T.shown)} {filtered.length} / {items.length}</span>
        </div>

        {/* Form */}
        {showForm && (
          <div style={{ ...S.card, border: "2px solid #8b5cf6" }}>
            <div style={{ ...S.sectionTitle, color: "#5b21b6" }}>
              {editingId === "__new__" ? pick(T.newTitle) : pick(T.editTitle)}
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 10 }}>
              <div>
                <label style={S.label}>{pick(T.logNo)}</label>
                <input type="number" value={draft.logNo} onChange={(e) => setDraft({ ...draft, logNo: e.target.value })} style={S.input} />
              </div>
              <div>
                <label style={S.label}>{pick(T.date)}</label>
                <input type="date" value={draft.date} onChange={(e) => setDraft({ ...draft, date: e.target.value })} style={S.input} />
              </div>
              <div>
                <label style={S.label}>{pick(T.implDate)}</label>
                <input type="date" value={draft.implementationDate} onChange={(e) => setDraft({ ...draft, implementationDate: e.target.value })} style={S.input} />
              </div>
              <div>
                <label style={S.label}>{pick(T.approvedBy)}</label>
                <input type="text" value={draft.approvedBy} onChange={(e) => setDraft({ ...draft, approvedBy: e.target.value })} placeholder={pick(T.approvedByPh)} style={S.input} />
              </div>
              <div>
                <label style={S.label}>{pick(T.status)}</label>
                <select value={draft.status} onChange={(e) => setDraft({ ...draft, status: e.target.value })} style={S.input}>
                  {STATUSES.map((s) => <option key={s.v} value={s.v}>{s[lang]}</option>)}
                </select>
              </div>
            </div>

            <label style={S.label}>{pick(T.description)}</label>
            <textarea value={draft.description} onChange={(e) => setDraft({ ...draft, description: e.target.value })} placeholder={pick(T.descPh)} style={{ ...S.input, minHeight: 60 }} />

            <label style={S.label}>{pick(T.reason)}</label>
            <textarea value={draft.reason} onChange={(e) => setDraft({ ...draft, reason: e.target.value })} placeholder={pick(T.reasonPh)} style={{ ...S.input, minHeight: 60 }} />

            <label style={S.label}>{pick(T.impact)}</label>
            <textarea value={draft.impact} onChange={(e) => setDraft({ ...draft, impact: e.target.value })} placeholder={pick(T.impactPh)} style={{ ...S.input, minHeight: 60 }} />

            <label style={S.label}>{pick(T.verif)}</label>
            <textarea value={draft.verification} onChange={(e) => setDraft({ ...draft, verification: e.target.value })} placeholder={pick(T.verifPh)} style={{ ...S.input, minHeight: 60 }} />

            <div style={{ marginTop: 12, display: "flex", gap: 8 }}>
              <button style={S.btn("success")} onClick={save}>{pick(T.save)}</button>
              <button style={S.btn("secondary")} onClick={() => { setShowForm(false); setEditingId(null); }}>{pick(T.cancel)}</button>
            </div>
          </div>
        )}

        {/* Table */}
        <div style={{ ...S.card, padding: 0, overflow: "hidden" }}>
          <div style={{ overflowX: "auto" }}>
            <table style={S.table}>
              <thead>
                <tr>
                  <th style={{ ...S.th, width: 50, textAlign: "center" }}>{pick(T.cols.no)}</th>
                  <th style={S.th}>{pick(T.cols.date)}</th>
                  <th style={S.th}>{pick(T.cols.desc)}</th>
                  <th style={S.th}>{pick(T.cols.reason)}</th>
                  <th style={S.th}>{pick(T.cols.impact)}</th>
                  <th style={S.th}>{pick(T.cols.appr)}</th>
                  <th style={S.th}>{pick(T.cols.impl)}</th>
                  <th style={S.th}>{pick(T.cols.verif)}</th>
                  <th style={S.th}>{pick(T.cols.status)}</th>
                  <th style={{ ...S.th, textAlign: "center" }}>{pick(T.cols.actions)}</th>
                </tr>
              </thead>
              <tbody>
                {loading && (
                  <tr><td colSpan="10" style={{ ...S.td, textAlign: "center", padding: 30, color: "#64748b" }}>⏳</td></tr>
                )}
                {!loading && filtered.map((r) => (
                  <tr key={r.id}>
                    <td style={{ ...S.td, textAlign: "center", fontWeight: 950, color: "#5b21b6" }}>{r.logNo || "—"}</td>
                    <td style={{ ...S.td, fontSize: 12, fontWeight: 700, whiteSpace: "nowrap" }}>{r.date || "—"}</td>
                    <td style={{ ...S.td, fontWeight: 700, maxWidth: 220 }}>{txt(r.description, lang)}</td>
                    <td style={{ ...S.td, fontSize: 12, maxWidth: 180, color: "#475569" }}>{txt(r.reason, lang)}</td>
                    <td style={{ ...S.td, fontSize: 12, maxWidth: 220, color: "#475569" }}>{txt(r.impact, lang)}</td>
                    <td style={{ ...S.td, fontSize: 12, fontWeight: 700 }}>{r.approvedBy || "—"}</td>
                    <td style={{ ...S.td, fontSize: 12, whiteSpace: "nowrap" }}>{r.implementationDate || "—"}</td>
                    <td style={{ ...S.td, fontSize: 12, color: "#166534", fontWeight: 700 }}>{txt(r.verification, lang)}</td>
                    <td style={S.td}><span style={S.statusBadge(r.status)}>{localizeStatus(r.status)}</span></td>
                    <td style={{ ...S.td, textAlign: "center", whiteSpace: "nowrap" }}>
                      <button style={{ ...S.btn("secondary"), padding: "4px 10px", fontSize: 11 }} onClick={() => startEdit(r)}>{pick(T.edit)}</button>
                      <button style={{ ...S.btn("danger"), padding: "4px 10px", fontSize: 11, marginInlineStart: 4 }} onClick={() => remove(r)}>{pick(T.del)}</button>
                    </td>
                  </tr>
                ))}
                {!loading && filtered.length === 0 && (
                  <tr><td colSpan="10" style={{ ...S.td, textAlign: "center", padding: 30, color: "#64748b" }}>{pick(T.noResults)}</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div style={{ marginTop: 16, fontSize: 11, color: "#64748b", textAlign: "center", fontWeight: 700 }}>
          ISO 22000:2018 §6.3 · Source: FSMS-RA-01 controlled document · All changes reviewed by FSMS Team and approved by Top Management
        </div>
      </div>
    </main>
  );
}
