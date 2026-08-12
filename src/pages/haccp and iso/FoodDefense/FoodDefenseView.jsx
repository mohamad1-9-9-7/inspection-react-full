// src/pages/haccp and iso/FoodDefense/FoodDefenseView.jsx
// Food Defense Plan (TACCP / VACCP) — FSMS-FD-01
// ISO 22000:2018 §8.5.1.5.2 + PAS 96:2017 + FSMA 21 CFR Part 121 + BRCGS Food Issue 9 §4.2
// Structure follows the FSMS Risk Register pattern: static plan document + live
// vulnerability assessment register persisted to /api/reports.

import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import API_BASE from "../../../config/api";
import HaccpLinkBadge from "../FSMSManual/HaccpLinkBadge";
import { useHaccpLang, HaccpLangToggle } from "../_shared/haccpI18n";
import { calcRiskScore, riskLevelLabel } from "../../hse/hseShared";
import {
  DOC_NO, DOC_REV, DOC_DATE,
  THREAT_CATEGORIES, FD_AREAS, FD_STATUS, FD_TEAM,
  SECURITY_CONTROLS, RESPONSE_STEPS, SEED_THREATS,
  areaLabel, categoryLabel, categoryIcon, statusMeta,
} from "./foodDefenseData";

const TYPE = "fsms_food_defense_item";

/* ─────────────────────────────────────────────────────────────
   UI dictionary
   ───────────────────────────────────────────────────────────── */
const T = {
  pageTitle:    { ar: "خطة الدفاع الغذائي (TACCP / VACCP)", en: "Food Defense Plan (TACCP / VACCP)" },
  pageSubtitle: { ar: `${DOC_NO} — الحماية من التلوث المتعمد والغش الغذائي`, en: `${DOC_NO} — Protection against intentional contamination & food fraud` },
  pageIntro: {
    ar: "تحدد هذه الخطة كيف تحمي الشركة منتجاتها من التلوث المتعمد والتخريب والغش الغذائي والاختراق السيبراني. تغطي تقييم التهديدات (TACCP) وتقييم قابلية التعرض للغش (VACCP) والضوابط الأمنية للموقع والعاملين والعمليات والمعلومات، وخطة الاستجابة للحوادث. تُراجَع الخطة سنوياً على الأقل، وبعد أي حادث أمني، أو عند أي تغيير في الموقع أو العمليات أو الموردين.",
    en: "This plan defines how the company protects its products from intentional contamination, sabotage, food fraud and cyber intrusion. It covers threat assessment (TACCP), vulnerability assessment for fraud (VACCP), security controls over site, people, operations and information, plus the incident response plan. It is reviewed at least annually, after any security incident, and on any change of site, process or suppliers.",
  },

  /* Section titles */
  sScope:      { ar: "1) الغرض والنطاق", en: "1) Purpose & scope" },
  sRefs:       { ar: "2) المراجع المعيارية", en: "2) Normative references" },
  sTeam:       { ar: "3) فريق الدفاع الغذائي", en: "3) Food Defense Team" },
  sMethod:     { ar: "4) منهجية تقييم التهديدات", en: "4) Threat assessment methodology" },
  sControls:   { ar: "5) الضوابط الأمنية المطبقة", en: "5) Applied security controls" },
  sRegister:   { ar: "6) سجل تقييم التهديدات ونقاط الضعف", en: "6) Threat & vulnerability assessment register" },
  sResponse:   { ar: "7) الاستجابة للحوادث", en: "7) Incident response" },
  sVerify:     { ar: "8) التحقق والمراجعة والتدريب", en: "8) Verification, review & training" },

  scopeBody: {
    ar: "تنطبق هذه الخطة على جميع مواقع الشركة وأنشطتها: الاستلام، التخزين المبرد والمجمد، التقطيع والتجهيز، التعبئة والوسم، التخزين النهائي، التحميل والنقل، المطبخ المركزي، عربات الطعام المتنقلة، ومنافذ البيع. وتشمل جميع العاملين الدائمين والمؤقتين والمتعاقدين والزوار والموردين وشركات النقل.",
    en: "This plan applies to all company sites and activities: receiving, chilled and frozen storage, cutting and processing, packaging and labelling, finished goods storage, loading and transport, the central kitchen, mobile food trucks and retail outlets. It covers all permanent and temporary staff, contractors, visitors, suppliers and transport companies.",
  },
  scopeObjective: {
    ar: "الهدف: منع أي فعل متعمد يهدف إلى إلحاق الضرر بالمنتج أو المستهلك أو السمعة، وكشفه مبكراً، والاستجابة له بفعالية.",
    en: "Objective: prevent, detect early and effectively respond to any deliberate act intended to harm the product, the consumer or the reputation.",
  },
  outOfScope: {
    ar: "خارج النطاق: المخاطر غير المتعمدة (البيولوجية والكيميائية والفيزيائية العرضية) — تُعالج في خطة HACCP وبرامج المتطلبات الأساسية (PRPs).",
    en: "Out of scope: unintentional hazards (accidental biological, chemical, physical) — these are handled in the HACCP plan and prerequisite programmes (PRPs).",
  },

  refs: {
    ar: [
      "ISO 22000:2018 — البند 8.5.1.5.2 (الدفاع الغذائي، اليقظة الحيوية والإرهاب البيولوجي)",
      "PAS 96:2017 — دليل حماية الغذاء والشراب من الهجمات المتعمدة",
      "FSMA — 21 CFR Part 121 (قاعدة التلويث المتعمد، الاستراتيجيات الوقائية المركزة)",
      "BRCGS Food Safety Issue 9 — البند 4.2 (أمن الموقع والدفاع الغذائي)",
      "Codex Alimentarius CXC 1-1969 — المبادئ العامة لصحة الأغذية",
      "قانون الغذاء لبلدية دبي واشتراطات هيئة أبوظبي للزراعة والسلامة الغذائية",
      "SOP 22 — منع الغش الغذائي / SOP 23 — إجراء الدفاع الغذائي",
    ],
    en: [
      "ISO 22000:2018 — clause 8.5.1.5.2 (food defence, biovigilance and bioterrorism)",
      "PAS 96:2017 — Guide to protecting and defending food and drink from deliberate attack",
      "FSMA — 21 CFR Part 121 (Intentional Adulteration rule, focused mitigation strategies)",
      "BRCGS Food Safety Issue 9 — clause 4.2 (site security and food defence)",
      "Codex Alimentarius CXC 1-1969 — General Principles of Food Hygiene",
      "Dubai Municipality Food Code and ADAFSA requirements",
      "SOP 22 — Food Fraud Prevention / SOP 23 — Food Defense Procedure",
    ],
  },

  teamCols: {
    role: { ar: "الدور", en: "Role" },
    who:  { ar: "الوظيفة", en: "Position" },
    resp: { ar: "المسؤوليات", en: "Responsibilities" },
  },

  methodBody: {
    ar: "يُقيَّم كل تهديد بضرب الاحتمالية (1–5) في الشدة (1–5) لإعطاء درجة من 1 إلى 25. الاحتمالية تعكس سهولة تنفيذ الفعل ودافع المهاجم وفرصة الوصول؛ والشدة تعكس أثر الفعل على صحة المستهلك والامتثال والسمعة. أي تهديد بدرجة 13 فأعلى يتطلب إجراءً إضافياً موثقاً بمهلة زمنية ومسؤول محدد.",
    en: "Each threat is scored by multiplying likelihood (1–5) by severity (1–5), giving 1 to 25. Likelihood reflects ease of execution, attacker motivation and opportunity of access; severity reflects the impact on consumer health, compliance and reputation. Any threat scoring 13 or above requires a documented additional action with an owner and a due date.",
  },
  methCols: { score: { ar: "الدرجة", en: "Score" }, level: { ar: "المستوى", en: "Level" }, action: { ar: "الإجراء المطلوب", en: "Required action" } },
  methLow:  { ar: "منخفض", en: "Low" },
  methMed:  { ar: "متوسط", en: "Medium" },
  methHigh: { ar: "عالٍ", en: "High" },
  methCrit: { ar: "حرج", en: "Critical" },
  methActLow:  { ar: "الضوابط الحالية كافية — مراجعة سنوية.", en: "Existing controls adequate — annual review." },
  methActMed:  { ar: "مراقبة وتحقق دوري من فعالية الضوابط.", en: "Monitor and periodically verify control effectiveness." },
  methActHigh: { ar: "إجراء إضافي إلزامي بمهلة محددة ومراجعة كل 6 أشهر.", en: "Mandatory additional action with a due date, reviewed every 6 months." },
  methActCrit: { ar: "تصعيد فوري للإدارة العليا، إجراء عاجل، ومراجعة ربع سنوية.", en: "Immediate escalation to top management, urgent action, quarterly review." },

  ctrlCols: {
    zone: { ar: "المجال", en: "Area" },
    ctrl: { ar: "الضوابط", en: "Controls" },
    resp: { ar: "المسؤول", en: "Responsible" },
    freq: { ar: "التكرار", en: "Frequency" },
  },

  verifyBody: {
    ar: [
      "مراجعة كاملة للخطة سنوياً على الأقل من قبل فريق الدفاع الغذائي، وتوثيق المراجعة.",
      "مراجعة استثنائية فورية بعد أي حادث أمني، أو تغيير في الموقع أو العمليات أو الموردين أو التشريعات.",
      "تدريب سنوي لجميع العاملين على الدفاع الغذائي وكيفية الإبلاغ عن السلوك المريب، مع سجل حضور واختبار فهم.",
      "اختبار عملي (Challenge test) سنوي: محاولة دخول محاكاة أو فحص مفاجئ لسلامة الأختام، وتوثيق النتيجة.",
      "تدقيق داخلي على ضوابط الدفاع الغذائي ضمن برنامج التدقيق الداخلي السنوي.",
      "عرض حالة الخطة ونتائج التقييم على اجتماع مراجعة الإدارة (MRM).",
      "حفظ جميع السجلات (الزوار، الأختام، جولات الأمن، التدريب، الحوادث) لمدة لا تقل عن 3 سنوات.",
    ],
    en: [
      "Full review of the plan at least annually by the Food Defense Team, documented.",
      "Immediate ad-hoc review after any security incident, or change of site, process, suppliers or legislation.",
      "Annual food defense training for all staff on how to report suspicious behaviour, with attendance record and comprehension check.",
      "Annual practical challenge test: a simulated entry attempt or unannounced seal-integrity check, with the result documented.",
      "Internal audit of food defense controls within the annual internal audit programme.",
      "Plan status and assessment results presented to the Management Review Meeting (MRM).",
      "All records (visitors, seals, security patrols, training, incidents) retained for at least 3 years.",
    ],
  },

  /* Register UI */
  add:      { ar: "＋ إضافة تهديد", en: "＋ Add threat" },
  back:     { ar: "← رجوع", en: "← Back" },
  print:    { ar: "🖨️ طباعة", en: "🖨️ Print" },
  loading:  { ar: "جارٍ التحميل…", en: "Loading…" },
  search:   { ar: "🔎 بحث…", en: "🔎 Search…" },
  total:    { ar: "إجمالي التهديدات", en: "Total threats" },
  critical: { ar: "حرج", en: "Critical" },
  high:     { ar: "عالٍ", en: "High" },
  medium:   { ar: "متوسط", en: "Medium" },
  low:      { ar: "منخفض", en: "Low" },
  openCnt:  { ar: "إجراءات مفتوحة", en: "Open actions" },

  cols: {
    area:     { ar: "المجال", en: "Area" },
    category: { ar: "نوع التهديد", en: "Threat type" },
    threat:   { ar: "وصف التهديد", en: "Threat description" },
    actor:    { ar: "المصدر المحتمل", en: "Likely actor" },
    ls:       { ar: "احتمالية × شدة", en: "L × S" },
    score:    { ar: "الدرجة", en: "Score" },
    existing: { ar: "الضوابط الحالية", en: "Existing controls" },
    action:   { ar: "إجراء إضافي", en: "Additional action" },
    owner:    { ar: "المسؤول", en: "Owner" },
    status:   { ar: "الحالة", en: "Status" },
    actions:  { ar: "إجراءات", en: "Actions" },
  },

  edit:        { ar: "تعديل", en: "Edit" },
  del:         { ar: "حذف", en: "Delete" },
  save:        { ar: "💾 حفظ", en: "💾 Save" },
  cancel:      { ar: "إلغاء", en: "Cancel" },
  formNew:     { ar: "تهديد جديد", en: "New threat" },
  formEdit:    { ar: "تعديل التهديد", en: "Edit threat" },
  noResults:   { ar: "لا توجد تهديدات مطابقة", en: "No threats match" },
  enterThreat: { ar: "اكتب وصف التهديد أولاً", en: "Enter the threat description first" },
  confirmDel:  { ar: "حذف هذا التهديد؟", en: "Delete this threat?" },
  resetSeed:   { ar: "🔄 استعادة التقييم الافتراضي (24)", en: "🔄 Reset to 24 seed threats" },
  resetConfirm:{ ar: "سيتم استبدال السجل الحالي بـ24 تهديداً افتراضياً. متابعة؟", en: "This will replace the current register with 24 seed threats. Continue?" },

  fAll:      { ar: "كل المستويات", en: "All levels" },
  fAllAreas: { ar: "كل المجالات", en: "All areas" },
  fAllCats:  { ar: "كل الأنواع", en: "All threat types" },
  fAllStat:  { ar: "كل الحالات", en: "All statuses" },
  ownerSearch:{ ar: "🔎 المسؤول…", en: "🔎 Owner…" },
  sortBy:    { ar: "ترتيب حسب", en: "Sort by" },
  sortScore: { ar: "الدرجة", en: "Score" },
  sortArea:  { ar: "المجال", en: "Area" },
  sortCategory: { ar: "النوع", en: "Type" },
  sortOwner: { ar: "المسؤول", en: "Owner" },
  sortStatus:{ ar: "الحالة", en: "Status" },
  sortAsc:   { ar: "↑ تصاعدي", en: "↑ Asc" },
  sortDesc:  { ar: "↓ تنازلي", en: "↓ Desc" },
  reset:     { ar: "↺ مسح الفلاتر", en: "↺ Clear filters" },
  exportCsv: { ar: "📊 تصدير CSV", en: "📊 Export CSV" },
  showing:   { ar: "معروض", en: "Showing" },

  fLikelihood: { ar: "الاحتمالية (1–5)", en: "Likelihood (1–5)" },
  fSeverity:   { ar: "الشدة (1–5)", en: "Severity (1–5)" },
  docRev:      { ar: "الإصدار", en: "Revision" },
  docDate:     { ar: "تاريخ الإصدار", en: "Issue date" },
  docReview:   { ar: "المراجعة القادمة", en: "Next review" },
  approvedBy:  { ar: "اعتماد: الإدارة العليا / قائد فريق سلامة الغذاء", en: "Approved by: Top Management / FSMS Team Leader" },
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
    area: FD_AREAS[0].v,
    category: THREAT_CATEGORIES[0].v,
    threat: "",
    actor: "",
    likelihood: 3,
    severity: 3,
    existing: "",
    action: "",
    owner: "",
    status: "open",
    reviewDate: todayISO(),
  };
}

/* ─────────────────────────────────────────────────────────────
   Styles — slate/indigo "security" palette, same shape as the
   other HACCP registers so print & layout stay consistent.
   ───────────────────────────────────────────────────────────── */
const S = {
  shell: {
    minHeight: "100vh", padding: "20px 16px",
    fontFamily: 'system-ui,-apple-system,"Segoe UI",sans-serif',
    background: "linear-gradient(180deg, #ecfeff 0%, #f0fdfa 55%, #f8fafc 100%)",
    color: "#0f172a",
  },
  layout: { width: "100%", margin: "0 auto" },
  topbar: {
    display: "flex", justifyContent: "space-between", alignItems: "center",
    marginBottom: 14, flexWrap: "wrap", gap: 10,
    padding: "12px 16px",
    background: "rgba(255,255,255,0.94)",
    borderRadius: 14, border: "1px solid #a5f3fc",
    boxShadow: "0 8px 24px rgba(8,145,178,0.10)",
  },
  title: { fontSize: 22, fontWeight: 950, color: "#155e75", lineHeight: 1.2 },
  subtitle: { fontSize: 12, color: "#0e7490", marginTop: 4, fontWeight: 700 },

  card: { background: "#fff", borderRadius: 14, padding: 18, marginBottom: 12, border: "1px solid #a5f3fc", boxShadow: "0 6px 16px rgba(8,145,178,0.06)" },
  intro: { background: "linear-gradient(135deg,#cffafe,#fff)", borderRadius: 14, padding: 16, marginBottom: 14, borderInlineStart: "5px solid #0e7490", fontSize: 14, lineHeight: 1.85, color: "#0f172a" },
  sectionTitle: { fontSize: 16, fontWeight: 950, color: "#155e75", marginBottom: 10 },
  body: { fontSize: 13, color: "#475569", lineHeight: 1.8, margin: "0 0 10px" },

  table: { width: "100%", borderCollapse: "collapse", fontSize: 13 },
  th: { padding: "10px 12px", textAlign: "start", background: "#155e75", color: "#fff", fontWeight: 900, fontSize: 11, textTransform: "uppercase", letterSpacing: "0.05em", whiteSpace: "nowrap" },
  td: { padding: "10px 12px", borderTop: "1px solid #ecfeff", verticalAlign: "top" },

  input: { width: "100%", padding: "9px 11px", border: "1.5px solid #a5f3fc", borderRadius: 10, fontSize: 13, fontWeight: 600, fontFamily: "inherit", background: "#fff" },
  label: { display: "block", fontSize: 12, fontWeight: 900, color: "#155e75", marginBottom: 4, marginTop: 8 },

  kpiGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 10, marginBottom: 14 },
  kpi: (bg, color) => ({
    padding: "12px 14px", borderRadius: 12,
    background: bg, color,
    border: "1px solid rgba(0,0,0,0.06)",
    boxShadow: "0 4px 12px rgba(8,145,178,0.06)",
  }),

  docBar: {
    display: "flex", gap: 14, flexWrap: "wrap",
    padding: "10px 14px", marginBottom: 12,
    background: "#fff", border: "1px solid #a5f3fc", borderRadius: 12,
    fontSize: 12, fontWeight: 800, color: "#155e75",
  },

  btn: (kind) => {
    const map = {
      primary:   { bg: "linear-gradient(180deg, #06b6d4, #0e7490)", color: "#fff", border: "#0e7490" },
      secondary: { bg: "#fff", color: "#155e75", border: "#a5f3fc" },
      success:   { bg: "linear-gradient(180deg, #22c55e, #16a34a)", color: "#fff", border: "#15803d" },
      danger:    { bg: "linear-gradient(180deg, #ef4444, #dc2626)", color: "#fff", border: "#b91c1c" },
      ghost:     { bg: "transparent", color: "#155e75", border: "#06b6d4" },
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
export default function FoodDefenseView() {
  const navigate = useNavigate();
  const { lang, toggle, dir } = useHaccpLang();
  const isAr = lang === "ar";
  const pick = (obj) => (obj?.[lang] ?? obj?.ar ?? obj?.en ?? "");

  const [threats, setThreats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [levelFilter, setLevelFilter] = useState("all");
  const [areaFilter, setAreaFilter] = useState("all");
  const [catFilter, setCatFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [ownerQuery, setOwnerQuery] = useState("");
  const [sortBy, setSortBy] = useState("score");
  const [sortDir, setSortDir] = useState("desc");
  const [editingId, setEditingId] = useState(null);
  const [draft, setDraft] = useState(blank());
  const [showForm, setShowForm] = useState(false);
  const [dupCount, setDupCount] = useState(0);

  /* ── Load: server first, seed only when the register is empty ── */
  async function load() {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/reports?type=${encodeURIComponent(TYPE)}`, { cache: "no-store" });
      const json = await res.json().catch(() => null);
      const arr = Array.isArray(json) ? json : json?.data || json?.items || [];
      const allItems = arr
        .map((rec) => ({ _recordId: rec.id, ...(rec?.payload || {}) }))
        .filter((x) => x.id);

      /* Dedup by `id` — keep the most recent */
      const byId = new Map();
      for (const it of allItems) {
        const existing = byId.get(it.id);
        if (!existing) { byId.set(it.id, it); continue; }
        if ((Number(it.savedAt) || 0) >= (Number(existing.savedAt) || 0)) byId.set(it.id, it);
      }
      const items = Array.from(byId.values());
      setDupCount(allItems.length - items.length);
      setThreats(items.length === 0 ? SEED_THREATS : items);
    } catch {
      setThreats(SEED_THREATS);
      setDupCount(0);
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => { load(); }, []);

  async function persist(item) {
    const url = item._recordId
      ? `${API_BASE}/api/reports/${encodeURIComponent(item._recordId)}`
      : `${API_BASE}/api/reports`;
    const method = item._recordId ? "PUT" : "POST";
    const { _recordId, ...payload } = item;
    payload.savedAt = Date.now();
    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reporter: payload.owner || "admin", type: TYPE, payload }),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res;
  }

  async function removeRecord(recordId) {
    if (!recordId) return;
    await fetch(`${API_BASE}/api/reports/${encodeURIComponent(recordId)}`, { method: "DELETE" });
  }

  async function cleanDuplicates() {
    const msg = isAr
      ? `سيتم حذف ${dupCount} نسخة مكررة من قاعدة البيانات (يبقى أحدث نسخة لكل تهديد). متابعة؟`
      : `This will delete ${dupCount} duplicate records from the database (keeping the most recent per threat). Continue?`;
    if (!window.confirm(msg)) return;
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/reports?type=${encodeURIComponent(TYPE)}`, { cache: "no-store" });
      const json = await res.json().catch(() => null);
      const arr = Array.isArray(json) ? json : json?.data || json?.items || [];
      const allItems = arr
        .map((rec) => ({ _recordId: rec.id, ...(rec?.payload || {}) }))
        .filter((x) => x.id);

      const groups = new Map();
      for (const it of allItems) {
        if (!groups.has(it.id)) groups.set(it.id, []);
        groups.get(it.id).push(it);
      }
      const toDelete = [];
      for (const [, group] of groups) {
        if (group.length <= 1) continue;
        group.sort((a, b) => (Number(b.savedAt) || 0) - (Number(a.savedAt) || 0));
        for (let i = 1; i < group.length; i++) if (group[i]._recordId) toDelete.push(group[i]._recordId);
      }
      for (const recId of toDelete) { try { await removeRecord(recId); } catch {} }
      await load();
      alert((isAr ? "تم حذف " : "Deleted ") + toDelete.length + (isAr ? " نسخة مكررة." : " duplicate records."));
    } catch (e) {
      alert("Cleanup error: " + (e?.message || e));
    } finally {
      setLoading(false);
    }
  }

  function startNew() { setDraft(blank()); setEditingId("__new__"); setShowForm(true); }

  function startEdit(t) {
    setDraft({
      ...t,
      threat:   typeof t.threat   === "object" ? (t.threat[lang]   ?? t.threat.ar   ?? "") : t.threat,
      actor:    typeof t.actor    === "object" ? (t.actor[lang]    ?? t.actor.ar    ?? "") : t.actor,
      existing: typeof t.existing === "object" ? (t.existing[lang] ?? t.existing.ar ?? "") : t.existing,
      action:   typeof t.action   === "object" ? (t.action[lang]   ?? t.action.ar   ?? "") : t.action,
    });
    setEditingId(t.id);
    setShowForm(true);
  }

  async function save() {
    if (!String(draft.threat).trim()) { alert(pick(T.enterThreat)); return; }
    try {
      if (editingId === "__new__") {
        const id = `fd_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
        await persist({ ...draft, id });
      } else {
        const existing = threats.find((t) => t.id === editingId);
        await persist({ ...existing, ...draft, id: editingId });
      }
      await load();
      setShowForm(false);
      setEditingId(null);
    } catch (e) {
      alert("Save error: " + (e?.message || e));
    }
  }

  async function remove(t) {
    if (!window.confirm(pick(T.confirmDel))) return;
    try {
      await removeRecord(t._recordId);
      setThreats((prev) => prev.filter((x) => x.id !== t.id));
    } catch (e) {
      alert("Delete error: " + (e?.message || e));
    }
  }

  async function resetToSeed() {
    if (!window.confirm(pick(T.resetConfirm))) return;
    setLoading(true);
    try {
      for (const t of threats) if (t._recordId) await removeRecord(t._recordId);
      for (const seed of SEED_THREATS) await persist({ ...seed });
      await load();
    } catch (e) {
      alert("Reset error: " + (e?.message || e));
    } finally {
      setLoading(false);
    }
  }

  const filtered = useMemo(() => {
    const list = threats.filter((t) => {
      const score = calcRiskScore(t.likelihood, t.severity);
      if (levelFilter === "critical" && score < 20) return false;
      if (levelFilter === "high" && (score < 13 || score >= 20)) return false;
      if (levelFilter === "medium" && (score < 6 || score >= 13)) return false;
      if (levelFilter === "low" && score >= 6) return false;
      if (areaFilter !== "all" && t.area !== areaFilter) return false;
      if (catFilter !== "all" && t.category !== catFilter) return false;
      if (statusFilter !== "all" && (t.status || "open") !== statusFilter) return false;
      if (ownerQuery.trim() && !String(t.owner || "").toLowerCase().includes(ownerQuery.trim().toLowerCase())) return false;
      if (search.trim()) {
        const s = search.toLowerCase();
        const hay = `${txt(t.threat, lang)} ${txt(t.actor, lang)} ${txt(t.existing, lang)} ${txt(t.action, lang)} ${areaLabel(t.area, lang)} ${categoryLabel(t.category, lang)} ${t.owner || ""}`.toLowerCase();
        if (!hay.includes(s)) return false;
      }
      return true;
    });

    const d = sortDir === "asc" ? 1 : -1;
    const cmp = (a, b) => {
      let av, bv;
      switch (sortBy) {
        case "area":     av = areaLabel(a.area, lang); bv = areaLabel(b.area, lang); break;
        case "category": av = categoryLabel(a.category, lang); bv = categoryLabel(b.category, lang); break;
        case "owner":    av = String(a.owner || ""); bv = String(b.owner || ""); break;
        case "status":   av = String(a.status || ""); bv = String(b.status || ""); break;
        case "score":
        default:
          av = calcRiskScore(a.likelihood, a.severity);
          bv = calcRiskScore(b.likelihood, b.severity);
      }
      if (typeof av === "string") return av.localeCompare(bv) * d;
      return (av - bv) * d;
    };
    return [...list].sort(cmp);
  }, [threats, levelFilter, areaFilter, catFilter, statusFilter, search, ownerQuery, sortBy, sortDir, lang]);

  function clearFilters() {
    setLevelFilter("all"); setAreaFilter("all"); setCatFilter("all"); setStatusFilter("all");
    setSearch(""); setOwnerQuery(""); setSortBy("score"); setSortDir("desc");
  }

  function exportCSV() {
    const esc = (v) => {
      const s = v == null ? "" : String(v);
      return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    };
    const headers = [
      "ID", "Area", "Threat Type", "Threat", "Likely Actor",
      "Likelihood", "Severity", "Score", "Level",
      "Existing Controls", "Additional Action", "Owner", "Status", "Next Review",
    ].map(esc).join(",");
    const rows = filtered.map((t) => {
      const score = calcRiskScore(t.likelihood, t.severity);
      return [
        t.id, areaLabel(t.area, "en"), categoryLabel(t.category, "en"),
        txt(t.threat, lang), txt(t.actor, lang),
        t.likelihood, t.severity, score, riskLevelLabel(score, "en").level,
        txt(t.existing, lang), txt(t.action, lang),
        t.owner || "", statusMeta(t.status).en, t.reviewDate || "",
      ].map(esc).join(",");
    });
    const csv = "﻿" + headers + "\n" + rows.join("\n");
    try {
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `food-defense-plan_${todayISO()}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 1500);
    } catch (e) {
      alert("Export failed: " + (e?.message || e));
    }
  }

  const stats = useMemo(() => {
    const out = { total: threats.length, critical: 0, high: 0, medium: 0, low: 0, open: 0 };
    threats.forEach((t) => {
      const score = calcRiskScore(t.likelihood, t.severity);
      if (score >= 20) out.critical++;
      else if (score >= 13) out.high++;
      else if (score >= 6) out.medium++;
      else out.low++;
      if ((t.status || "open") !== "controlled") out.open++;
    });
    return out;
  }, [threats]);

  const nextReview = useMemo(() => {
    const d = new Date(DOC_DATE);
    d.setFullYear(d.getFullYear() + 1);
    return d.toISOString().slice(0, 10);
  }, []);

  return (
    <main style={{ ...S.shell, direction: dir }}>
      <div style={S.layout}>
        {/* ── Top bar ── */}
        <div style={S.topbar}>
          <div>
            <div style={S.title}>🛡️ {pick(T.pageTitle)}</div>
            <div style={S.subtitle}>{pick(T.pageSubtitle)}</div>
            <HaccpLinkBadge
              clauses={["8.5", "8.2"]}
              label={isAr ? "الدفاع الغذائي واليقظة الحيوية" : "Food Defence & Biovigilance"}
            />
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <HaccpLangToggle lang={lang} toggle={toggle} />
            {dupCount > 0 && (
              <button
                style={{ ...S.btn("danger"), background: "linear-gradient(180deg, #f59e0b, #d97706)", borderColor: "#b45309" }}
                onClick={cleanDuplicates}
                title={isAr ? `حذف ${dupCount} نسخة مكررة` : `Delete ${dupCount} duplicate records`}
                data-delete-action="true"
              >
                🧹 {isAr ? `تنظيف ${dupCount} مكرر` : `Clean ${dupCount} duplicates`}
              </button>
            )}
            <button style={S.btn("ghost")} onClick={() => window.print()}>{pick(T.print)}</button>
            <button style={S.btn("ghost")} onClick={resetToSeed}>{pick(T.resetSeed)}</button>
            <button style={S.btn("primary")} onClick={startNew}>{pick(T.add)}</button>
            <button style={S.btn("secondary")} onClick={() => navigate("/haccp-iso")}>{pick(T.back)}</button>
          </div>
        </div>

        {/* ── Document control strip ── */}
        <div style={S.docBar}>
          <span>📄 {DOC_NO}</span>
          <span>{pick(T.docRev)}: {DOC_REV}</span>
          <span>{pick(T.docDate)}: {DOC_DATE}</span>
          <span>{pick(T.docReview)}: {nextReview}</span>
          <span style={{ opacity: 0.8 }}>{pick(T.approvedBy)}</span>
        </div>

        {/* ── Intro ── */}
        <div style={S.intro}>{pick(T.pageIntro)}</div>

        {/* ── 1) Scope ── */}
        <div style={S.card}>
          <div style={S.sectionTitle}>{pick(T.sScope)}</div>
          <p style={S.body}>{pick(T.scopeBody)}</p>
          <p style={{ ...S.body, fontWeight: 800, color: "#155e75" }}>{pick(T.scopeObjective)}</p>
          <p style={{ ...S.body, fontSize: 12.5, color: "#64748b", margin: 0 }}>{pick(T.outOfScope)}</p>
        </div>

        {/* ── 2) References ── */}
        <div style={S.card}>
          <div style={S.sectionTitle}>{pick(T.sRefs)}</div>
          <ul style={{ margin: 0, paddingInlineStart: 20, fontSize: 13, lineHeight: 1.9, color: "#475569" }}>
            {pick(T.refs).map((r, i) => <li key={i}>{r}</li>)}
          </ul>
        </div>

        {/* ── 3) Team ── */}
        <div style={S.card}>
          <div style={S.sectionTitle}>{pick(T.sTeam)}</div>
          <div style={{ overflowX: "auto" }}>
            <table style={S.table}>
              <thead>
                <tr>
                  <th style={S.th}>{pick(T.teamCols.role)}</th>
                  <th style={S.th}>{pick(T.teamCols.who)}</th>
                  <th style={S.th}>{pick(T.teamCols.resp)}</th>
                </tr>
              </thead>
              <tbody>
                {FD_TEAM.map((m, i) => (
                  <tr key={i} style={i % 2 ? { background: "#f8fafc" } : undefined}>
                    <td style={{ ...S.td, fontWeight: 900, color: "#155e75", whiteSpace: "nowrap" }}>{pick(m.role)}</td>
                    <td style={{ ...S.td, fontWeight: 700 }}>{pick(m.who)}</td>
                    <td style={S.td}>{pick(m.resp)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* ── 4) Methodology ── */}
        <div style={S.card}>
          <div style={S.sectionTitle}>{pick(T.sMethod)}</div>
          <p style={S.body}>{pick(T.methodBody)}</p>

          {/* Threat category legend */}
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, margin: "10px 0 14px" }}>
            {THREAT_CATEGORIES.map((c) => (
              <span
                key={c.v}
                style={{
                  display: "inline-flex", alignItems: "center", gap: 6,
                  padding: "5px 11px", borderRadius: 999,
                  background: "#ecfeff", border: "1px solid #a5f3fc",
                  fontSize: 11.5, fontWeight: 800, color: "#155e75",
                }}
              >
                {c.icon} {c[lang]}
              </span>
            ))}
          </div>

          <div style={{ overflowX: "auto" }}>
            <table style={S.table}>
              <thead>
                <tr>
                  <th style={S.th}>{pick(T.methCols.score)}</th>
                  <th style={S.th}>{pick(T.methCols.level)}</th>
                  <th style={S.th}>{pick(T.methCols.action)}</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td style={{ ...S.td, textAlign: "center", fontWeight: 800, background: "#dcfce7", color: "#166534" }}>1 – 5</td>
                  <td style={{ ...S.td, fontWeight: 800, color: "#166534" }}>{pick(T.methLow)}</td>
                  <td style={S.td}>{pick(T.methActLow)}</td>
                </tr>
                <tr>
                  <td style={{ ...S.td, textAlign: "center", fontWeight: 800, background: "#fef9c3", color: "#854d0e" }}>6 – 12</td>
                  <td style={{ ...S.td, fontWeight: 800, color: "#854d0e" }}>{pick(T.methMed)}</td>
                  <td style={S.td}>{pick(T.methActMed)}</td>
                </tr>
                <tr>
                  <td style={{ ...S.td, textAlign: "center", fontWeight: 800, background: "#fed7aa", color: "#9a3412" }}>13 – 19</td>
                  <td style={{ ...S.td, fontWeight: 800, color: "#9a3412" }}>{pick(T.methHigh)}</td>
                  <td style={S.td}>{pick(T.methActHigh)}</td>
                </tr>
                <tr>
                  <td style={{ ...S.td, textAlign: "center", fontWeight: 800, background: "#fee2e2", color: "#7f1d1d" }}>20 – 25</td>
                  <td style={{ ...S.td, fontWeight: 800, color: "#7f1d1d" }}>{pick(T.methCrit)}</td>
                  <td style={S.td}>{pick(T.methActCrit)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* ── 5) Security controls ── */}
        <div style={S.card}>
          <div style={S.sectionTitle}>{pick(T.sControls)}</div>
          <div style={{ overflowX: "auto" }}>
            <table style={S.table}>
              <thead>
                <tr>
                  <th style={{ ...S.th, width: 190 }}>{pick(T.ctrlCols.zone)}</th>
                  <th style={S.th}>{pick(T.ctrlCols.ctrl)}</th>
                  <th style={{ ...S.th, width: 170 }}>{pick(T.ctrlCols.resp)}</th>
                  <th style={{ ...S.th, width: 150 }}>{pick(T.ctrlCols.freq)}</th>
                </tr>
              </thead>
              <tbody>
                {SECURITY_CONTROLS.map((c, i) => (
                  <tr key={i} style={i % 2 ? { background: "#f8fafc" } : undefined}>
                    <td style={{ ...S.td, fontWeight: 900, color: "#155e75" }}>{pick(c.zone)}</td>
                    <td style={S.td}>
                      <ul style={{ margin: 0, paddingInlineStart: 18, lineHeight: 1.9 }}>
                        {pick(c.controls).map((line, j) => <li key={j}>{line}</li>)}
                      </ul>
                    </td>
                    <td style={{ ...S.td, fontWeight: 700 }}>{pick(c.resp)}</td>
                    <td style={{ ...S.td, fontWeight: 700 }}>{pick(c.freq)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* ── 6) Register ── */}
        <div style={{ ...S.sectionTitle, fontSize: 18, margin: "22px 2px 10px" }}>{pick(T.sRegister)}</div>

        {/* KPIs */}
        <div style={S.kpiGrid}>
          <div style={S.kpi("#cffafe", "#155e75")}>
            <div style={{ fontSize: 11, fontWeight: 800, opacity: 0.85 }}>{pick(T.total)}</div>
            <div style={{ fontSize: 26, fontWeight: 950 }}>{stats.total}</div>
          </div>
          <div style={S.kpi("#fee2e2", "#7f1d1d")}>
            <div style={{ fontSize: 11, fontWeight: 800, opacity: 0.85 }}>🔴 {pick(T.critical)}</div>
            <div style={{ fontSize: 26, fontWeight: 950 }}>{stats.critical}</div>
          </div>
          <div style={S.kpi("#fed7aa", "#9a3412")}>
            <div style={{ fontSize: 11, fontWeight: 800, opacity: 0.85 }}>🟠 {pick(T.high)}</div>
            <div style={{ fontSize: 26, fontWeight: 950 }}>{stats.high}</div>
          </div>
          <div style={S.kpi("#fef9c3", "#854d0e")}>
            <div style={{ fontSize: 11, fontWeight: 800, opacity: 0.85 }}>🟡 {pick(T.medium)}</div>
            <div style={{ fontSize: 26, fontWeight: 950 }}>{stats.medium}</div>
          </div>
          <div style={S.kpi("#dcfce7", "#166534")}>
            <div style={{ fontSize: 11, fontWeight: 800, opacity: 0.85 }}>🟢 {pick(T.low)}</div>
            <div style={{ fontSize: 26, fontWeight: 950 }}>{stats.low}</div>
          </div>
          <div style={S.kpi("#f1f5f9", "#334155")}>
            <div style={{ fontSize: 11, fontWeight: 800, opacity: 0.85 }}>📌 {pick(T.openCnt)}</div>
            <div style={{ fontSize: 26, fontWeight: 950 }}>{stats.open}</div>
          </div>
        </div>

        {/* Toolbar */}
        <div style={{ ...S.card, display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
          <input
            type="text"
            placeholder={pick(T.search)}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ ...S.input, flex: "1 1 200px", minWidth: 180, maxWidth: 280 }}
          />
          <select value={levelFilter} onChange={(e) => setLevelFilter(e.target.value)} style={{ ...S.input, maxWidth: 170 }}>
            <option value="all">{pick(T.fAll)}</option>
            <option value="critical">{pick(T.critical)}</option>
            <option value="high">{pick(T.high)}</option>
            <option value="medium">{pick(T.medium)}</option>
            <option value="low">{pick(T.low)}</option>
          </select>
          <select value={areaFilter} onChange={(e) => setAreaFilter(e.target.value)} style={{ ...S.input, maxWidth: 220 }}>
            <option value="all">{pick(T.fAllAreas)}</option>
            {FD_AREAS.map((a) => <option key={a.v} value={a.v}>{a[lang]}</option>)}
          </select>
          <select value={catFilter} onChange={(e) => setCatFilter(e.target.value)} style={{ ...S.input, maxWidth: 240 }}>
            <option value="all">{pick(T.fAllCats)}</option>
            {THREAT_CATEGORIES.map((c) => <option key={c.v} value={c.v}>{c[lang]}</option>)}
          </select>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} style={{ ...S.input, maxWidth: 170 }}>
            <option value="all">{pick(T.fAllStat)}</option>
            {FD_STATUS.map((s) => <option key={s.v} value={s.v}>{s[lang]}</option>)}
          </select>
          <input
            type="text"
            placeholder={pick(T.ownerSearch)}
            value={ownerQuery}
            onChange={(e) => setOwnerQuery(e.target.value)}
            style={{ ...S.input, flex: "0 1 180px", minWidth: 140, maxWidth: 200 }}
          />
          <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} style={{ ...S.input, maxWidth: 180 }} title={pick(T.sortBy)}>
            <option value="score">{pick(T.sortBy)}: {pick(T.sortScore)}</option>
            <option value="area">{pick(T.sortBy)}: {pick(T.sortArea)}</option>
            <option value="category">{pick(T.sortBy)}: {pick(T.sortCategory)}</option>
            <option value="owner">{pick(T.sortBy)}: {pick(T.sortOwner)}</option>
            <option value="status">{pick(T.sortBy)}: {pick(T.sortStatus)}</option>
          </select>
          <button style={S.btn("secondary")} onClick={() => setSortDir((d) => (d === "asc" ? "desc" : "asc"))}>
            {sortDir === "asc" ? pick(T.sortAsc) : pick(T.sortDesc)}
          </button>
          <button style={S.btn("ghost")} onClick={clearFilters}>{pick(T.reset)}</button>
          <button style={S.btn("success")} onClick={exportCSV}>{pick(T.exportCsv)}</button>
          <span style={{ fontSize: 12, fontWeight: 800, color: "#0e7490" }}>
            {pick(T.showing)}: {filtered.length} / {threats.length}
          </span>
        </div>

        {/* Add / edit form */}
        {showForm && (
          <div style={{ ...S.card, borderColor: "#06b6d4", borderWidth: 2 }}>
            <div style={S.sectionTitle}>{editingId === "__new__" ? pick(T.formNew) : pick(T.formEdit)}</div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 12 }}>
              <div>
                <label style={S.label}>{pick(T.cols.area)}</label>
                <select style={S.input} value={draft.area} onChange={(e) => setDraft({ ...draft, area: e.target.value })}>
                  {FD_AREAS.map((a) => <option key={a.v} value={a.v}>{a[lang]}</option>)}
                </select>
              </div>
              <div>
                <label style={S.label}>{pick(T.cols.category)}</label>
                <select style={S.input} value={draft.category} onChange={(e) => setDraft({ ...draft, category: e.target.value })}>
                  {THREAT_CATEGORIES.map((c) => <option key={c.v} value={c.v}>{c[lang]}</option>)}
                </select>
              </div>
              <div>
                <label style={S.label}>{pick(T.cols.owner)}</label>
                <input style={S.input} value={draft.owner || ""} onChange={(e) => setDraft({ ...draft, owner: e.target.value })} />
              </div>
              <div>
                <label style={S.label}>{pick(T.fLikelihood)}</label>
                <select style={S.input} value={draft.likelihood} onChange={(e) => setDraft({ ...draft, likelihood: Number(e.target.value) })}>
                  {[1, 2, 3, 4, 5].map((n) => <option key={n} value={n}>{n}</option>)}
                </select>
              </div>
              <div>
                <label style={S.label}>{pick(T.fSeverity)}</label>
                <select style={S.input} value={draft.severity} onChange={(e) => setDraft({ ...draft, severity: Number(e.target.value) })}>
                  {[1, 2, 3, 4, 5].map((n) => <option key={n} value={n}>{n}</option>)}
                </select>
              </div>
              <div>
                <label style={S.label}>{pick(T.cols.status)}</label>
                <select style={S.input} value={draft.status || "open"} onChange={(e) => setDraft({ ...draft, status: e.target.value })}>
                  {FD_STATUS.map((s) => <option key={s.v} value={s.v}>{s[lang]}</option>)}
                </select>
              </div>
              <div>
                <label style={S.label}>{pick(T.docReview)}</label>
                <input type="date" style={S.input} value={draft.reviewDate || ""} onChange={(e) => setDraft({ ...draft, reviewDate: e.target.value })} />
              </div>
              <div>
                <label style={S.label}>{pick(T.cols.actor)}</label>
                <input style={S.input} value={draft.actor || ""} onChange={(e) => setDraft({ ...draft, actor: e.target.value })} />
              </div>
            </div>

            <label style={S.label}>{pick(T.cols.threat)}</label>
            <textarea style={{ ...S.input, minHeight: 62 }} value={draft.threat || ""} onChange={(e) => setDraft({ ...draft, threat: e.target.value })} />

            <label style={S.label}>{pick(T.cols.existing)}</label>
            <textarea style={{ ...S.input, minHeight: 62 }} value={draft.existing || ""} onChange={(e) => setDraft({ ...draft, existing: e.target.value })} />

            <label style={S.label}>{pick(T.cols.action)}</label>
            <textarea style={{ ...S.input, minHeight: 62 }} value={draft.action || ""} onChange={(e) => setDraft({ ...draft, action: e.target.value })} />

            <div style={{ display: "flex", gap: 8, marginTop: 14, flexWrap: "wrap" }}>
              <button style={S.btn("success")} onClick={save}>{pick(T.save)}</button>
              <button style={S.btn("secondary")} onClick={() => { setShowForm(false); setEditingId(null); }}>{pick(T.cancel)}</button>
              <span style={{ marginInlineStart: "auto", fontSize: 13, fontWeight: 900, color: "#155e75", alignSelf: "center" }}>
                {pick(T.cols.score)}: {calcRiskScore(draft.likelihood, draft.severity)} — {riskLevelLabel(calcRiskScore(draft.likelihood, draft.severity), lang).level}
              </span>
            </div>
          </div>
        )}

        {/* Register table */}
        <div style={{ ...S.card, padding: 0, overflowX: "auto" }}>
          {loading ? (
            <div style={{ padding: 28, textAlign: "center", fontWeight: 800, color: "#0e7490" }}>{pick(T.loading)}</div>
          ) : filtered.length === 0 ? (
            <div style={{ padding: 28, textAlign: "center", fontWeight: 800, color: "#64748b" }}>{pick(T.noResults)}</div>
          ) : (
            <table style={S.table}>
              <thead>
                <tr>
                  <th style={S.th}>#</th>
                  <th style={S.th}>{pick(T.cols.area)}</th>
                  <th style={S.th}>{pick(T.cols.category)}</th>
                  <th style={{ ...S.th, minWidth: 240 }}>{pick(T.cols.threat)}</th>
                  <th style={S.th}>{pick(T.cols.actor)}</th>
                  <th style={S.th}>{pick(T.cols.ls)}</th>
                  <th style={S.th}>{pick(T.cols.score)}</th>
                  <th style={{ ...S.th, minWidth: 240 }}>{pick(T.cols.existing)}</th>
                  <th style={{ ...S.th, minWidth: 220 }}>{pick(T.cols.action)}</th>
                  <th style={S.th}>{pick(T.cols.owner)}</th>
                  <th style={S.th}>{pick(T.cols.status)}</th>
                  <th style={S.th}>{pick(T.cols.actions)}</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((t, i) => {
                  const score = calcRiskScore(t.likelihood, t.severity);
                  const lvl = riskLevelLabel(score, lang);
                  const st = statusMeta(t.status);
                  return (
                    <tr key={t.id} style={i % 2 ? { background: "#f8fafc" } : undefined}>
                      <td style={{ ...S.td, fontWeight: 800, color: "#64748b" }}>{i + 1}</td>
                      <td style={{ ...S.td, fontWeight: 800, color: "#155e75" }}>{areaLabel(t.area, lang)}</td>
                      <td style={{ ...S.td, whiteSpace: "nowrap" }}>{categoryIcon(t.category)} {categoryLabel(t.category, lang)}</td>
                      <td style={{ ...S.td, fontWeight: 700 }}>{txt(t.threat, lang)}</td>
                      <td style={S.td}>{txt(t.actor, lang)}</td>
                      <td style={{ ...S.td, textAlign: "center", whiteSpace: "nowrap", fontWeight: 800 }}>{t.likelihood} × {t.severity}</td>
                      <td style={{ ...S.td, textAlign: "center" }}>
                        <span style={{ display: "inline-block", minWidth: 64, padding: "4px 8px", borderRadius: 999, background: lvl.bg, color: lvl.color, fontWeight: 950, fontSize: 12 }}>
                          {score} · {lvl.level}
                        </span>
                      </td>
                      <td style={S.td}>{txt(t.existing, lang)}</td>
                      <td style={S.td}>{txt(t.action, lang)}</td>
                      <td style={{ ...S.td, fontWeight: 700 }}>{t.owner || "—"}</td>
                      <td style={S.td}>
                        <span style={{ display: "inline-block", padding: "4px 9px", borderRadius: 999, background: st.bg, color: st.color, fontWeight: 900, fontSize: 11.5, whiteSpace: "nowrap" }}>
                          {st[lang]}
                        </span>
                      </td>
                      <td style={{ ...S.td, whiteSpace: "nowrap" }}>
                        <button style={{ ...S.btn("secondary"), padding: "5px 10px", fontSize: 12 }} onClick={() => startEdit(t)}>{pick(T.edit)}</button>{" "}
                        <button style={{ ...S.btn("danger"), padding: "5px 10px", fontSize: 12 }} onClick={() => remove(t)} data-delete-action="true">{pick(T.del)}</button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* ── 7) Incident response ── */}
        <div style={S.card}>
          <div style={S.sectionTitle}>{pick(T.sResponse)}</div>
          <div style={{ display: "grid", gap: 10 }}>
            {RESPONSE_STEPS.map((s) => (
              <div
                key={s.n}
                style={{
                  display: "flex", gap: 12, alignItems: "flex-start",
                  padding: "12px 14px", borderRadius: 12,
                  background: "#f8fafc", border: "1px solid #e2e8f0",
                  borderInlineStart: "4px solid #0e7490",
                }}
              >
                <div style={{
                  minWidth: 30, height: 30, borderRadius: 999,
                  background: "linear-gradient(180deg,#06b6d4,#0e7490)", color: "#fff",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontWeight: 950, fontSize: 14, flexShrink: 0,
                }}>{s.n}</div>
                <div>
                  <div style={{ fontWeight: 950, color: "#155e75", fontSize: 14, marginBottom: 3 }}>{pick(s.title)}</div>
                  <div style={{ fontSize: 13, color: "#334155", lineHeight: 1.85 }}>{pick(s.body)}</div>
                </div>
              </div>
            ))}
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 12 }}>
            <button style={S.btn("ghost")} onClick={() => navigate("/haccp-iso/real-recall/view")}>
              🚨 {isAr ? "إجراء السحب الفعلي" : "Real Product Recall"}
            </button>
            <button style={S.btn("ghost")} onClick={() => navigate("/hse/evacuation-drills")}>
              🧯 {isAr ? "F-16 · تجارب الإخلاء" : "F-16 · Evacuation Drills"}
            </button>
            <button style={S.btn("ghost")} onClick={() => navigate("/haccp-iso/mock-recall/view")}>
              🔄 {isAr ? "تجربة التتبع" : "Mock Recall Drill"}
            </button>
            <button style={S.btn("ghost")} onClick={() => navigate("/haccp-iso/risk-register/view")}>
              🎯 {isAr ? "سجل مخاطر FSMS" : "FSMS Risk Register"}
            </button>
          </div>
        </div>

        {/* ── 8) Verification ── */}
        <div style={S.card}>
          <div style={S.sectionTitle}>{pick(T.sVerify)}</div>
          <ul style={{ margin: 0, paddingInlineStart: 20, fontSize: 13, lineHeight: 1.9, color: "#475569" }}>
            {pick(T.verifyBody).map((r, i) => <li key={i}>{r}</li>)}
          </ul>
        </div>

        <div style={{ height: 40 }} />
      </div>
    </main>
  );
}
