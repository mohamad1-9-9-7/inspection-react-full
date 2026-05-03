// src/pages/hse/HSECAPATracker.jsx — F-20 bilingual

import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  pageStyle, containerStyle, headerBar, buttonGhost, buttonPrimary,
  cardStyle, inputStyle, labelStyle, HSE_COLORS, todayISO,
  loadLocal, appendLocal, deleteLocal, updateLocal,
  tableStyle, thStyle, tdStyle, useHSELang, HSELangToggle,
} from "./hseShared";

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
  tCorr: { ar: "🔧 تصحيحي (Corrective)", en: "🔧 Corrective" },
  tPrev: { ar: "🛡️ وقائي (Preventive)", en: "🛡️ Preventive" },
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
  rootCause: { ar: "السبب الجذري (Root Cause)", en: "Root Cause" },
  action: { ar: "الإجراء المطلوب", en: "Required Action" },
  progress: { ar: "ملاحظات تقدّم العمل", en: "Progress Notes" },
  closedDate: { ar: "تاريخ الإغلاق", en: "Closed Date" },
  closedBy: { ar: "أُغلق بواسطة", en: "Closed By" },
  verifiedBy: { ar: "تحقّق بواسطة", en: "Verified By" },
  effectiveness: { ar: "التحقق من الفعالية (Effectiveness Check)", en: "Effectiveness Check" },
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

export default function HSECAPATracker() {
  const navigate = useNavigate();
  const { lang, toggle, dir, pick } = useHSELang();
  const [items, setItems] = useState([]);
  const [tab, setTab] = useState("list");
  const [draft, setDraft] = useState(blank());
  const [editingId, setEditingId] = useState(null);
  const [filter, setFilter] = useState("active");

  useEffect(() => { setItems(loadLocal(TYPE)); }, []);

  function startEdit(it) { setDraft({ ...it }); setEditingId(it.id); setTab("new"); }
  function save() {
    if (!draft.action.trim()) { alert(pick(T.needAction)); return; }
    if (editingId) updateLocal(TYPE, editingId, draft);
    else appendLocal(TYPE, draft);
    setItems(loadLocal(TYPE));
    setDraft(blank()); setEditingId(null); setTab("list");
  }
  function quickClose(id) {
    const verifier = prompt(pick(T.closer));
    if (!verifier) return;
    updateLocal(TYPE, id, { status: "closed", closedDate: todayISO(), closedBy: verifier, verifiedBy: verifier });
    setItems(loadLocal(TYPE));
  }
  function remove(id) {
    if (!window.confirm(pick(T.confirmDel))) return;
    deleteLocal(TYPE, id); setItems(loadLocal(TYPE));
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
            <button style={tab === "new" ? buttonPrimary : buttonGhost} onClick={() => { setDraft(blank()); setEditingId(null); setTab("new"); }}>{pick(T.add)}</button>
            <button style={buttonGhost} onClick={() => navigate("/hse")}>{pick(T.back)}</button>
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

        {tab === "new" && (
          <div style={cardStyle}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 10 }}>
              <div><label style={labelStyle}>{pick(T.capaNo)}</label><input type="text" value={draft.capaNo} readOnly style={{ ...inputStyle, background: "#fef3c7", fontWeight: 800 }} /></div>
              <div><label style={labelStyle}>{pick(T.openedDate)}</label><input type="date" value={draft.openedDate} onChange={(e) => setDraft({ ...draft, openedDate: e.target.value })} style={inputStyle} /></div>
              <div>
                <label style={labelStyle}>{pick(T.type)}</label>
                <select value={draft.type} onChange={(e) => setDraft({ ...draft, type: e.target.value })} style={inputStyle}>
                  <option value="corrective">{pick(T.tCorr)}</option>
                  <option value="preventive">{pick(T.tPrev)}</option>
                </select>
              </div>
              <div>
                <label style={labelStyle}>{pick(T.source)}</label>
                <select value={draft.source} onChange={(e) => setDraft({ ...draft, source: e.target.value })} style={inputStyle}>
                  {SOURCES.map((s) => <option key={s.v} value={s.v}>{s[lang]}</option>)}
                </select>
              </div>
              <div>
                <label style={labelStyle}>{pick(T.refNo)}</label>
                <input type="text" value={draft.sourceRefNo} onChange={(e) => setDraft({ ...draft, sourceRefNo: e.target.value })} placeholder="INC-123 / Audit-2025-Q1…" style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>{pick(T.category)}</label>
                <input type="text" value={draft.category} onChange={(e) => setDraft({ ...draft, category: e.target.value })} placeholder={pick(T.catPh)} style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>{pick(T.priority)}</label>
                <select value={draft.priority} onChange={(e) => setDraft({ ...draft, priority: e.target.value })} style={inputStyle}>
                  <option value="critical">{pick(T.pCrit)}</option>
                  <option value="high">{pick(T.pHigh)}</option>
                  <option value="medium">{pick(T.pMed)}</option>
                  <option value="low">{pick(T.pLow)}</option>
                </select>
              </div>
              <div>
                <label style={labelStyle}>{pick(T.status)}</label>
                <select value={draft.status} onChange={(e) => setDraft({ ...draft, status: e.target.value })} style={inputStyle}>
                  <option value="open">{pick(T.stOpen)}</option>
                  <option value="in_progress">{pick(T.stProg)}</option>
                  <option value="verifying">{pick(T.stVerif)}</option>
                  <option value="closed">{pick(T.stClosed)}</option>
                </select>
              </div>
              <div><label style={labelStyle}>{pick(T.responsibility)}</label><input type="text" value={draft.responsibility} onChange={(e) => setDraft({ ...draft, responsibility: e.target.value })} style={inputStyle} /></div>
              <div><label style={labelStyle}>{pick(T.targetDate)}</label><input type="date" value={draft.targetDate} onChange={(e) => setDraft({ ...draft, targetDate: e.target.value })} style={inputStyle} /></div>
            </div>

            <div style={{ marginTop: 10 }}>
              <label style={labelStyle}>{pick(T.desc)}</label>
              <textarea value={draft.description} onChange={(e) => setDraft({ ...draft, description: e.target.value })} style={{ ...inputStyle, minHeight: 70 }} />
            </div>
            <div style={{ marginTop: 10 }}>
              <label style={labelStyle}>{pick(T.rootCause)}</label>
              <textarea value={draft.rootCause} onChange={(e) => setDraft({ ...draft, rootCause: e.target.value })} style={{ ...inputStyle, minHeight: 60 }} />
            </div>
            <div style={{ marginTop: 10 }}>
              <label style={labelStyle}>{pick(T.action)}</label>
              <textarea value={draft.action} onChange={(e) => setDraft({ ...draft, action: e.target.value })} style={{ ...inputStyle, minHeight: 70 }} />
            </div>
            <div style={{ marginTop: 10 }}>
              <label style={labelStyle}>{pick(T.progress)}</label>
              <textarea value={draft.progressNotes} onChange={(e) => setDraft({ ...draft, progressNotes: e.target.value })} style={{ ...inputStyle, minHeight: 60 }} />
            </div>
            {draft.status === "closed" && (
              <>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 10, marginTop: 10 }}>
                  <div><label style={labelStyle}>{pick(T.closedDate)}</label><input type="date" value={draft.closedDate} onChange={(e) => setDraft({ ...draft, closedDate: e.target.value })} style={inputStyle} /></div>
                  <div><label style={labelStyle}>{pick(T.closedBy)}</label><input type="text" value={draft.closedBy} onChange={(e) => setDraft({ ...draft, closedBy: e.target.value })} style={inputStyle} /></div>
                  <div><label style={labelStyle}>{pick(T.verifiedBy)}</label><input type="text" value={draft.verifiedBy} onChange={(e) => setDraft({ ...draft, verifiedBy: e.target.value })} style={inputStyle} /></div>
                </div>
                <div style={{ marginTop: 10 }}>
                  <label style={labelStyle}>{pick(T.effectiveness)}</label>
                  <textarea value={draft.effectivenessCheck} onChange={(e) => setDraft({ ...draft, effectivenessCheck: e.target.value })} style={{ ...inputStyle, minHeight: 60 }} />
                </div>
              </>
            )}

            <div style={{ marginTop: 14, display: "flex", gap: 10 }}>
              <button style={buttonPrimary} onClick={save}>{pick(T.saveBtn)}</button>
              <button style={buttonGhost} onClick={() => { setTab("list"); setEditingId(null); }}>{pick(T.cancel)}</button>
            </div>
          </div>
        )}

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
