// src/pages/hse/HSECAPATracker.jsx — F-20 bilingual

import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  pageStyle, containerStyle, headerBar, buttonGhost, buttonPrimary,
  cardStyle, inputStyle, labelStyle, HSE_COLORS, todayISO,
  apiList, apiSave, apiDelete, apiUpdate,
  tableStyle, thStyle, tdStyle, useHSELang, HSELangToggle,
} from "./hseShared";
import { HSEReportForm, HSEPanel, HSEField, useHSEValidation, validateHSE } from "./hseFormKit";

const TYPE = "capa_tracker";

const T = {
  title:    { ar: "📌 CAPA — الإجراءات التصحيحية والوقائية (F-20)", en: "📌 CAPA — Corrective & Preventive Actions (F-20)" },
  subtitle: { ar: "المستهدف: ≥ 90% نسبة الإغلاق · حالياً:", en: "Target: ≥ 90% closure rate · Current:" },
  back:     { ar: "← HSE", en: "← HSE" },
  list:     { ar: "📋 القائمة", en: "📋 List" },
  add:      { ar: "+ إضافة", en: "+ Add" },
  open:     { ar: "مفتوحة", en: "Open" },
  inProgress: { ar: "قيد التنفيذ", en: "In Progress" },
  closed:   { ar: "مغلقة", en: "Closed" },
  overdue:  { ar: "متأخرة", en: "Overdue" },
  closureRate: { ar: "نسبة الإغلاق", en: "Closure Rate" },
  capaNo: { ar: "رقم CAPA", en: "CAPA No." },
  openedDate: { ar: "تاريخ الفتح", en: "Opened Date" },
  type: { ar: "النوع", en: "Type" },
  tCorr: { ar: "🔧 تصحيحي", en: "🔧 Corrective" },
  tPrev: { ar: "🛡️ وقائي", en: "🛡️ Preventive" },
  source: { ar: "المصدر", en: "Source" },
  refNo: { ar: "رقم مرجع المصدر", en: "Source Ref. No." },
  category: { ar: "الفئة", en: "Category" },
  catPh: { ar: "Food Safety / OHS / Environment…", en: "Food Safety / OHS / Environment…" },
  priority: { ar: "الأولوية", en: "Priority" },
  pCrit:  { ar: "🔴 حرجة", en: "🔴 Critical" },
  pHigh:  { ar: "🟠 عالية", en: "🟠 High" },
  pMed:   { ar: "🟡 متوسطة", en: "🟡 Medium" },
  pLow:   { ar: "🟢 منخفضة", en: "🟢 Low" },
  status: { ar: "الحالة", en: "Status" },
  stOpen: { ar: "🆕 مفتوح", en: "🆕 Open" },
  stProg: { ar: "🔵 قيد التنفيذ", en: "🔵 In Progress" },
  stVerif:{ ar: "🟡 قيد التحقق", en: "🟡 Verifying" },
  stClosed:{ ar: "✅ مغلق", en: "✅ Closed" },
  responsibility: { ar: "المسؤول", en: "Responsibility" },
  targetDate: { ar: "الموعد المستهدف", en: "Target Date" },
  desc: { ar: "وصف المشكلة / الملاحظة", en: "Issue / Finding Description" },
  rootCause: { ar: "السبب الجذري", en: "Root Cause" },
  action: { ar: "الإجراء المطلوب", en: "Required Action" },
  progress: { ar: "ملاحظات تقدّم العمل", en: "Progress Notes" },
  closedDate: { ar: "تاريخ الإغلاق", en: "Closed Date" },
  closedBy: { ar: "أُغلق بواسطة", en: "Closed By" },
  verifiedBy: { ar: "تحقّق بواسطة", en: "Verified By" },
  effectiveness: { ar: "التحقق من الفعالية", en: "Effectiveness Check" },
  saveBtn: { ar: "💾 حفظ", en: "💾 Save" },
  cancel: { ar: "إلغاء", en: "Cancel" },
  needAction: { ar: "اكتب الإجراء المطلوب", en: "Enter the required action" },
  closer: { ar: "اسم من تحقّق من الإغلاق:", en: "Name of person verifying closure:" },
  confirmDel: { ar: "حذف؟", en: "Delete?" },
  fAll: { ar: "الكل", en: "All" },
  fActive: { ar: "النشطة (غير مغلقة)", en: "Active (not closed)" },
  fOverdue: { ar: "المتأخرة فقط", en: "Overdue only" },
  fHigh: { ar: "عالية الأولوية فقط", en: "High priority only" },
  fClosed: { ar: "المغلقة", en: "Closed" },
  edit: { ar: "تعديل", en: "Edit" },
  closeBtn: { ar: "إغلاق", en: "Close" },
  del: { ar: "حذف", en: "Delete" },
  noResults: { ar: "لا توجد عناصر بهذه الفلاتر", en: "No items match these filters" },
  overdueLabel: { ar: "متأخر!", en: "Overdue!" },
  cols: {
    no: { ar: "رقم", en: "No." },
    source: { ar: "المصدر", en: "Source" },
    action: { ar: "الإجراء", en: "Action" },
    resp: { ar: "المسؤول", en: "Responsibility" },
    target: { ar: "المستهدف", en: "Target" },
    priority: { ar: "الأولوية", en: "Priority" },
    status: { ar: "الحالة", en: "Status" },
    actions: { ar: "إجراءات", en: "Actions" },
  },
};

const SOURCES = [
  { v: "internal_audit", ar: "Audit / تدقيق داخلي",       en: "Audit / Internal" },
  { v: "external_audit", ar: "Audit / تدقيق خارجي",       en: "Audit / External" },
  { v: "govt_inspection",ar: "Government Inspection / تفتيش حكومي", en: "Government Inspection" },
  { v: "complaint",      ar: "Customer Complaint / شكوى عميل",       en: "Customer Complaint" },
  { v: "incident_invest",ar: "Incident Investigation / تحقيق حادث",   en: "Incident Investigation" },
  { v: "near_miss",      ar: "Near-miss / شبه حادث",                  en: "Near-miss" },
  { v: "risk_assess",    ar: "Risk Assessment / تقييم مخاطر",         en: "Risk Assessment" },
  { v: "mgmt_review",    ar: "Management Review / مراجعة إدارة",      en: "Management Review" },
  { v: "other",          ar: "أخرى",                                    en: "Other" },
];

const blank = () => ({
  capaNo: `CAPA-${Date.now().toString().slice(-6)}`,
  openedDate: todayISO(), source: SOURCES[0].v, sourceRefNo: "",
  type: "corrective", category: "", description: "", rootCause: "", action: "",
  responsibility: "", targetDate: "", priority: "medium", status: "open",
  progressNotes: "", effectivenessCheck: "",
  closedDate: "", closedBy: "", verifiedBy: "",
});

/* ── Rules: a CAPA needs an owner and a realistic deadline for its priority;
   closing needs a root cause, a dated close-out, an independent verifier and
   a written effectiveness check. ── */
const CAPA_CLOSED = (d) => d.status === "closed";
const CAPA_MAX_DAYS = { critical: 7, high: 30, medium: 60, low: 90 };
const sameCapaName = (a, b) => a && b && a.trim().toLowerCase() === b.trim().toLowerCase();

const CAPA_RULES = [
  { key: "openedDate", label: T.openedDate, type: "date", required: true, notFuture: true },
  { key: "type", label: T.type, required: true, oneOf: ["corrective", "preventive"] },
  { key: "source", label: T.source, required: true, oneOf: SOURCES.map((x) => x.v) },
  { key: "sourceRefNo", label: T.refNo, maxLength: 40,
    requiredIf: (d) => ["internal_audit", "external_audit", "govt_inspection", "incident_invest", "complaint"].includes(d.source),
    requiredMsg: { ar: "هذا المصدر له رقم مرجعي — اكتبه للربط", en: "This source has a reference number — enter it to link them" } },
  { key: "category", label: T.category, maxLength: 80 },
  { key: "priority", label: T.priority, required: true, oneOf: ["critical", "high", "medium", "low"] },
  { key: "status", label: T.status, required: true, oneOf: ["open", "in_progress", "verifying", "closed"] },
  { key: "responsibility", label: T.responsibility, required: true, minLength: 2, maxLength: 80 },
  { key: "targetDate", label: T.targetDate, type: "date", required: true, afterOrEqual: "openedDate",
    custom: (v, d) => {
      if (!v || !d.openedDate) return null;
      const max = CAPA_MAX_DAYS[d.priority] || 90;
      const days = (new Date(v) - new Date(d.openedDate)) / 86400000;
      return days > max
        ? { ar: `المهلة القصوى لهذه الأولوية ${max} يوماً`, en: `The maximum deadline for this priority is ${max} days` } : null;
    } },
  { key: "description", label: T.desc, required: true, minLength: 15, maxLength: 3000 },
  { key: "rootCause", label: T.rootCause, maxLength: 2000,
    requiredIf: (d) => d.type === "corrective" && d.status !== "open",
    requiredMsg: { ar: "الإجراء التصحيحي يحتاج سبباً جذرياً قبل التنفيذ", en: "A corrective action needs a root cause before work starts" } },
  { key: "action", label: T.action, required: true, minLength: 10, maxLength: 3000 },
  { key: "progressNotes", label: T.progress, maxLength: 3000,
    requiredIf: (d) => d.status === "verifying" || CAPA_CLOSED(d) },
  { key: "closedDate", label: T.closedDate, type: "date", requiredIf: CAPA_CLOSED, when: CAPA_CLOSED,
    notFuture: true, afterOrEqual: "openedDate" },
  { key: "closedBy", label: T.closedBy, requiredIf: CAPA_CLOSED, when: CAPA_CLOSED, maxLength: 80 },
  { key: "verifiedBy", label: T.verifiedBy, requiredIf: CAPA_CLOSED, when: CAPA_CLOSED, maxLength: 80,
    custom: (v, d) => sameCapaName(v, d.responsibility)
      ? { ar: "المتحقِّق يجب أن يكون غير المسؤول عن التنفيذ", en: "The verifier must not be the action owner" } : null },
  { key: "effectivenessCheck", label: T.effectiveness, requiredIf: CAPA_CLOSED, when: CAPA_CLOSED, minLength: 10, maxLength: 2000 },
];

const CAPA_STEPS = [
  { ar: "سجّل تاريخ الفتح، النوع (تصحيحي/وقائي)، والمصدر مع رقمه المرجعي (تدقيق، حادث، شكوى…).", en: "Record the opening date, the type (corrective/preventive) and the source with its reference no. (audit, incident, complaint…)." },
  { ar: "حدّد الأولوية والمسؤول والموعد المستهدف: حرجة ≤ 7 أيام، عالية ≤ 30، متوسطة ≤ 60، منخفضة ≤ 90.", en: "Set the priority, the owner and the target date: critical ≤ 7 days, high ≤ 30, medium ≤ 60, low ≤ 90." },
  { ar: "صِف المشكلة والإجراء المطلوب بوضوح؛ الإجراء التصحيحي يحتاج سبباً جذرياً قبل بدء التنفيذ.", en: "Describe the issue and the required action clearly; a corrective action needs a root cause before work starts." },
  { ar: "حدّث ملاحظات التقدّم أثناء العمل، وهي إلزامية عند «قيد التحقق».", en: "Update the progress notes as work goes on — they are required at “Verifying”." },
  { ar: "للإغلاق: تاريخ الإغلاق، من أغلق، متحقِّق مستقل عن المسؤول، ونتيجة التحقق من الفعالية.", en: "To close: the close date, who closed it, a verifier independent of the owner, and the effectiveness result." },
];

const CAPA_GUIDANCE = [
  { kind: "warn", ar: "المستهدف إغلاق 90% من الإجراءات في موعدها — المتأخر يظهر بالأحمر في القائمة.", en: "The target is 90 % closed on time — overdue items show in red in the list." },
  { kind: "tip",  ar: "التحقق من الفعالية يعني إثبات أن المشكلة لم تتكرر (فحص لاحق، سجلات، تدقيق).", en: "An effectiveness check proves the problem did not recur (follow-up check, records, audit)." },
];

export default function HSECAPATracker() {
  const navigate = useNavigate();
  const { lang, toggle, dir, pick } = useHSELang();
  const [items, setItems] = useState([]);
  const [tab, setTab] = useState("list");
  const [draft, setDraft] = useState(blank());
  const [editingId, setEditingId] = useState(null);
  const [filter, setFilter] = useState("active");
  const [saving, setSaving] = useState(false);
  const validation = useHSEValidation(CAPA_RULES, draft, lang);

  async function reload() {
    const arr = await apiList(TYPE);
    setItems(arr);
  }
  useEffect(() => { reload(); }, []);

  function startEdit(it) { setDraft({ ...blank(), ...it }); setEditingId(it.id); validation.reset(); setTab("new"); }
  async function save() {
    if (!validation.attempt()) return;
    setSaving(true);
    try {
      if (editingId) await apiUpdate(TYPE, editingId, draft);
      else await apiSave(TYPE, draft, draft.responsibility || "HSE");
      await reload();
      setDraft(blank()); setEditingId(null); validation.reset(); setTab("list");
    } catch (e) {
      alert((pick({ ar: "❌ خطأ بالحفظ: ", en: "❌ Save error: " })) + (e?.message || e));
    } finally {
      setSaving(false);
    }
  }
  async function quickClose(id) {
    // Quick-close may not skip the close-out rules (root cause, independent
    // verifier, effectiveness check) — open the record in the form instead.
    const it = items.find((x) => x.id === id);
    if (it && validateHSE(CAPA_RULES, { ...blank(), ...it, status: "closed", closedDate: todayISO(), closedBy: it.closedBy || "—", verifiedBy: it.verifiedBy || "—" }, lang).length) {
      alert(pick({ ar: "لا يمكن الإغلاق قبل استكمال السبب الجذري والتحقق من الفعالية — سيُفتح للتعديل.", en: "Cannot close until the root cause and effectiveness check are complete — opening it for editing." }));
      startEdit({ ...it, status: "closed", closedDate: it.closedDate || todayISO() });
      return;
    }
    const verifier = prompt(pick(T.closer));
    if (!verifier) return;
    if (it && sameCapaName(verifier, it.responsibility)) {
      alert(pick({ ar: "المتحقِّق يجب أن يكون غير المسؤول عن التنفيذ", en: "The verifier must not be the action owner" }));
      return;
    }
    try {
      await apiUpdate(TYPE, id, { status: "closed", closedDate: todayISO(), closedBy: verifier, verifiedBy: verifier }, verifier);
      await reload();
    } catch (e) {
      alert((pick({ ar: "❌ خطأ بالإغلاق: ", en: "❌ Close error: " })) + (e?.message || e));
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

  const filtered = useMemo(() => items.filter((it) => {
    if (filter === "active" && it.status === "closed") return false;
    if (filter === "overdue") {
      if (it.status === "closed" || !it.targetDate) return false;
      return new Date(it.targetDate) < new Date();
    }
    if (filter === "closed" && it.status !== "closed") return false;
    if (filter === "high" && it.priority !== "high") return false;
    return true;
  }), [items, filter]);

  const stats = useMemo(() => {
    const open = items.filter((i) => i.status === "open").length;
    const inProgress = items.filter((i) => i.status === "in_progress").length;
    const closed = items.filter((i) => i.status === "closed").length;
    const overdue = items.filter((i) => i.status !== "closed" && i.targetDate && new Date(i.targetDate) < new Date()).length;
    const closureRate = items.length > 0 ? Math.round((closed / items.length) * 100) : 0;
    return { open, inProgress, closed, overdue, closureRate };
  }, [items]);

  const priorityLabel = (p) => p === "critical" ? pick(T.pCrit) : p === "high" ? pick(T.pHigh) : p === "medium" ? pick(T.pMed) : pick(T.pLow);
  const statusLabel = (s) => s === "open" ? pick(T.stOpen) : s === "in_progress" ? pick(T.stProg) : s === "verifying" ? pick(T.stVerif) : pick(T.stClosed);

  return (
    <main style={pageStyle} dir={dir}>
      <div style={containerStyle}>
        <div style={headerBar}>
          <div>
            <div style={{ fontSize: 22, fontWeight: 950 }}>{pick(T.title)}</div>
            <div style={{ fontSize: 12, color: HSE_COLORS.primaryDark, marginTop: 4 }}>
              {pick(T.subtitle)} <b>{stats.closureRate}%</b>
            </div>
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <HSELangToggle lang={lang} toggle={toggle} />
            <button style={tab === "list" ? buttonPrimary : buttonGhost} onClick={() => { setTab("list"); setEditingId(null); }}>{pick(T.list)}</button>
            <button style={tab === "new" ? buttonPrimary : buttonGhost} onClick={() => { setDraft(blank()); setEditingId(null); validation.reset(); setTab("new"); }}>{pick(T.add)}</button>
            <button data-hse-back="1" style={buttonGhost} onClick={() => navigate("/hse")}>{pick(T.back)}</button>
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 10, marginBottom: 14 }}>
          <div style={{ ...cardStyle, padding: 12, background: "#fee2e2" }}>
            <div style={{ fontSize: 11, fontWeight: 800, color: "#7f1d1d" }}>{pick(T.open)}</div>
            <div style={{ fontSize: 24, fontWeight: 950, color: "#7f1d1d" }}>{stats.open}</div>
          </div>
          <div style={{ ...cardStyle, padding: 12, background: "#fef9c3" }}>
            <div style={{ fontSize: 11, fontWeight: 800, color: "#854d0e" }}>{pick(T.inProgress)}</div>
            <div style={{ fontSize: 24, fontWeight: 950, color: "#854d0e" }}>{stats.inProgress}</div>
          </div>
          <div style={{ ...cardStyle, padding: 12, background: "#dcfce7" }}>
            <div style={{ fontSize: 11, fontWeight: 800, color: "#166534" }}>{pick(T.closed)}</div>
            <div style={{ fontSize: 24, fontWeight: 950, color: "#166534" }}>{stats.closed}</div>
          </div>
          <div style={{ ...cardStyle, padding: 12, background: "#fed7aa" }}>
            <div style={{ fontSize: 11, fontWeight: 800, color: "#9a3412" }}>{pick(T.overdue)}</div>
            <div style={{ fontSize: 24, fontWeight: 950, color: "#9a3412" }}>{stats.overdue}</div>
          </div>
          <div style={{ ...cardStyle, padding: 12, background: stats.closureRate >= 90 ? "#dcfce7" : stats.closureRate >= 70 ? "#fef9c3" : "#fee2e2" }}>
            <div style={{ fontSize: 11, fontWeight: 800 }}>{pick(T.closureRate)}</div>
            <div style={{ fontSize: 24, fontWeight: 950 }}>{stats.closureRate}%</div>
          </div>
        </div>

        {tab === "new" && (() => {
          const set = (k, v) => setDraft((d) => ({ ...d, [k]: v }));
          const f = (k) => ({ k, value: draft[k], onChange: (v) => set(k, v), rule: validation.ruleFor(k), error: validation.errors[k], lang });
          return (
            <HSEReportForm
              lang={lang}
              dir={dir}
              title={{ ar: "الإجراءات التصحيحية والوقائية (CAPA)", en: "Corrective & Preventive Actions (CAPA)" }}
              docNo="F-20"
              accent={HSE_COLORS.primary}
              headerFields={[{ label: pick(T.capaNo), value: draft.capaNo }]}
              steps={CAPA_STEPS}
              guidance={CAPA_GUIDANCE}
              validation={validation}
              editing={!!editingId}
              saving={saving}
              onSave={save}
              onCancel={() => { setTab("list"); setEditingId(null); validation.reset(); }}
            >
              <HSEPanel title={lang === "ar" ? "بيانات الإجراء" : "Action details"}>
                <HSEField {...f("openedDate")} type="date" label={pick(T.openedDate)} />
                <HSEField {...f("type")} type="select" label={pick(T.type)} options={[
                  { v: "corrective", label: pick(T.tCorr) },
                  { v: "preventive", label: pick(T.tPrev) },
                ]} />
                <HSEField {...f("source")} type="select" label={pick(T.source)}
                  options={SOURCES.map((x) => ({ v: x.v, label: x[lang] }))} />
                <HSEField {...f("sourceRefNo")} label={pick(T.refNo)} placeholder="INC-123 / Audit-2025-Q1…" />
                <HSEField {...f("category")} label={pick(T.category)} placeholder={pick(T.catPh)} />
                <HSEField {...f("priority")} type="select" label={pick(T.priority)} options={[
                  { v: "critical", label: pick(T.pCrit) },
                  { v: "high", label: pick(T.pHigh) },
                  { v: "medium", label: pick(T.pMed) },
                  { v: "low", label: pick(T.pLow) },
                ]} />
                <HSEField {...f("status")} type="select" label={pick(T.status)} options={[
                  { v: "open", label: pick(T.stOpen) },
                  { v: "in_progress", label: pick(T.stProg) },
                  { v: "verifying", label: pick(T.stVerif) },
                  { v: "closed", label: pick(T.stClosed) },
                ]} />
                <HSEField {...f("responsibility")} label={pick(T.responsibility)} />
                <HSEField {...f("targetDate")} type="date" label={pick(T.targetDate)}
                  hint={lang === "ar" ? `الحد الأقصى ${CAPA_MAX_DAYS[draft.priority] || 90} يوماً من تاريخ الفتح` : `At most ${CAPA_MAX_DAYS[draft.priority] || 90} days from opening`} />
              </HSEPanel>

              <HSEPanel title={lang === "ar" ? "المشكلة والإجراء" : "Issue & action"}>
                <HSEField {...f("description")} type="textarea" full label={pick(T.desc)} />
                <HSEField {...f("rootCause")} type="textarea" full label={pick(T.rootCause)} />
                <HSEField {...f("action")} type="textarea" full label={pick(T.action)} />
                <HSEField {...f("progressNotes")} type="textarea" full label={pick(T.progress)} />
              </HSEPanel>

              {draft.status === "closed" && (
                <HSEPanel title={lang === "ar" ? "الإغلاق والتحقق" : "Close-out & verification"}>
                  <HSEField {...f("closedDate")} type="date" label={pick(T.closedDate)} />
                  <HSEField {...f("closedBy")} label={pick(T.closedBy)} />
                  <HSEField {...f("verifiedBy")} label={pick(T.verifiedBy)} />
                  <HSEField {...f("effectivenessCheck")} type="textarea" full label={pick(T.effectiveness)} />
                </HSEPanel>
              )}
            </HSEReportForm>
          );
        })()}

        {tab === "list" && (
          <>
            <div style={{ ...cardStyle, marginBottom: 14, display: "flex", gap: 10, flexWrap: "wrap" }}>
              <select value={filter} onChange={(e) => setFilter(e.target.value)} style={{ ...inputStyle, maxWidth: 240 }}>
                <option value="all">{pick(T.fAll)} ({items.length})</option>
                <option value="active">{pick(T.fActive)}</option>
                <option value="overdue">{pick(T.fOverdue)}</option>
                <option value="high">{pick(T.fHigh)}</option>
                <option value="closed">{pick(T.fClosed)}</option>
              </select>
            </div>

            <div style={{ overflowX: "auto" }}>
              <table style={tableStyle}>
                <thead>
                  <tr>
                    <th style={thStyle}>{pick(T.cols.no)}</th>
                    <th style={thStyle}>{pick(T.cols.source)}</th>
                    <th style={thStyle}>{pick(T.cols.action)}</th>
                    <th style={thStyle}>{pick(T.cols.resp)}</th>
                    <th style={thStyle}>{pick(T.cols.target)}</th>
                    <th style={thStyle}>{pick(T.cols.priority)}</th>
                    <th style={thStyle}>{pick(T.cols.status)}</th>
                    <th style={thStyle}>{pick(T.cols.actions)}</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((it) => {
                    const overdue = it.targetDate && it.status !== "closed" && new Date(it.targetDate) < new Date();
                    const src = SOURCES.find((s) => s.v === it.source);
                    return (
                      <tr key={it.id} style={{ background: overdue ? "#fee2e2" : "transparent" }}>
                        <td style={{ ...tdStyle, fontWeight: 800 }}>{it.capaNo}</td>
                        <td style={{ ...tdStyle, fontSize: 12 }}>{src ? src[lang] : it.source}<br /><small>{it.sourceRefNo}</small></td>
                        <td style={{ ...tdStyle, maxWidth: 280, fontSize: 12 }}>{it.action}</td>
                        <td style={tdStyle}>{it.responsibility}</td>
                        <td style={{ ...tdStyle, fontWeight: overdue ? 900 : 700, color: overdue ? "#7f1d1d" : "inherit" }}>
                          {it.targetDate || "—"}
                          {overdue && <div style={{ fontSize: 10, color: "#7f1d1d" }}>{pick(T.overdueLabel)}</div>}
                        </td>
                        <td style={tdStyle}>{priorityLabel(it.priority)}</td>
                        <td style={tdStyle}>{statusLabel(it.status)}</td>
                        <td style={tdStyle}>
                          <button style={{ ...buttonGhost, padding: "4px 10px", fontSize: 12 }} onClick={() => startEdit(it)}>{pick(T.edit)}</button>
                          {it.status !== "closed" && (
                            <button style={{ ...buttonGhost, padding: "4px 10px", fontSize: 12, marginInlineStart: 4, background: "#dcfce7", color: "#166534" }} onClick={() => quickClose(it.id)}>{pick(T.closeBtn)}</button>
                          )}
                          <button style={{ ...buttonGhost, padding: "4px 10px", fontSize: 12, color: "#b91c1c", marginInlineStart: 4 }} onClick={() => remove(it.id)}>{pick(T.del)}</button>
                        </td>
                      </tr>
                    );
                  })}
                  {filtered.length === 0 && (
                    <tr><td colSpan="8" style={{ ...tdStyle, textAlign: "center", padding: 30, color: "#64748b" }}>{pick(T.noResults)}</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </main>
  );
}
