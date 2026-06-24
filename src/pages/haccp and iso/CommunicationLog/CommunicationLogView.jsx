// FSMS Communication Matrix / Log - list view (ISO 22000:2018 Clause 7.4)

import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import API_BASE from "../../../config/api";
import HaccpLinkBadge from "../FSMSManual/HaccpLinkBadge";
import { useHaccpLang, HaccpLangToggle } from "../_shared/haccpI18n";

const TYPE = "fsms_communication_log";

const TOPICS = [
  { v: "external_customer", en: "External - customer product / food safety information", ar: "خارجي - معلومات المنتج وسلامة الغذاء للعميل" },
  { v: "external_provider", en: "External - provider / contractor / supplier", ar: "خارجي - مورد / مقاول / مزود خدمة" },
  { v: "external_authority", en: "External - authority / regulator / laboratory", ar: "خارجي - جهة رسمية / مختبر" },
  { v: "a", en: "a) Products or new products", ar: "أ) المنتجات أو المنتجات الجديدة" },
  { v: "b", en: "b) Raw materials, ingredients and services", ar: "ب) المواد الخام والمكونات والخدمات" },
  { v: "c", en: "c) Production systems and equipment", ar: "ج) أنظمة الإنتاج والمعدات" },
  { v: "d", en: "d) Premises, equipment location, surrounding environment", ar: "د) مواقع الإنتاج وموقع المعدات والبيئة المحيطة" },
  { v: "e", en: "e) Cleaning and sanitation programmes", ar: "هـ) برامج التنظيف والتعقيم" },
  { v: "f", en: "f) Packaging, storage and distribution systems", ar: "و) أنظمة التعبئة والتخزين والتوزيع" },
  { v: "g", en: "g) Competencies / responsibilities / authorities", ar: "ز) الكفاءات أو المسؤوليات أو الصلاحيات" },
  { v: "h", en: "h) Statutory and regulatory requirements", ar: "ح) المتطلبات القانونية والتنظيمية" },
  { v: "i", en: "i) Food safety hazards and control measures", ar: "ط) مخاطر سلامة الغذاء وإجراءات التحكم" },
  { v: "j", en: "j) Customer, sector and other requirements", ar: "ي) متطلبات العملاء والقطاع وغيرها" },
  { v: "k", en: "k) Relevant enquiries from external parties", ar: "ك) الاستفسارات والمراسلات من الأطراف الخارجية" },
  { v: "l", en: "l) Complaints / alerts indicating food safety hazards", ar: "ل) الشكاوى أو التنبيهات التي تشير لمخاطر سلامة الغذاء" },
  { v: "m", en: "m) Other conditions impacting food safety", ar: "م) ظروف أخرى تؤثر على سلامة الغذاء" },
];

const MATRIX_ROWS = [
  { whatEn: "Food safety policy, objectives and FSMS updates", whatAr: "سياسة وأهداف وتحديثات FSMS", whenEn: "On issue / revision and during MRM", whenAr: "عند الإصدار/التعديل وخلال MRM", withEn: "All employees / FSMS team", withAr: "كل الموظفين / فريق FSMS", howEn: "Training, email, posted policy, meeting minutes", howAr: "تدريب، إيميل، سياسة معلقة، محاضر اجتماعات", whoEn: "FSMS Team Leader / QA", whoAr: "قائد FSMS / الجودة" },
  { whatEn: "Customer complaints and food safety alerts", whatAr: "شكاوى العملاء والتنبيهات المتعلقة بسلامة الغذاء", whenEn: "Immediately on receipt", whenAr: "فورا عند الاستلام", withEn: "QA, operations, customer, management", withAr: "الجودة، العمليات، العميل، الإدارة", howEn: "Customer Complaints module, email, call, action plan", howAr: "موديول شكاوى العملاء، إيميل، اتصال، خطة عمل", whoEn: "QA / Customer Service", whoAr: "الجودة / خدمة العملاء" },
  { whatEn: "Supplier, contractor or service provider food safety requirements", whatAr: "متطلبات سلامة الغذاء للموردين والمقاولين ومزودي الخدمات", whenEn: "Before approval, on change, or after issue", whenAr: "قبل الاعتماد، عند التغيير، أو بعد مشكلة", withEn: "Suppliers / contractors / procurement", withAr: "الموردون / المقاولون / المشتريات", howEn: "Email, evaluation form, specification, meeting", howAr: "إيميل، نموذج تقييم، مواصفة، اجتماع", whoEn: "Procurement / QA", whoAr: "المشتريات / الجودة" },
  { whatEn: "Regulatory, legal or authority communications", whatAr: "مراسلات الجهات الرسمية والمتطلبات القانونية", whenEn: "On receipt / before deadline", whenAr: "عند الاستلام / قبل الموعد النهائي", withEn: "Dubai Municipality, authorities, top management", withAr: "بلدية دبي، الجهات الرسمية، الإدارة", howEn: "Official letter, email, inspection report, legal register", howAr: "كتاب رسمي، إيميل، تقرير تفتيش، السجل القانوني", whoEn: "QA Manager / Management", whoAr: "مدير الجودة / الإدارة" },
  { whatEn: "Internal changes affecting products, materials, equipment, cleaning, storage or distribution", whatAr: "تغييرات داخلية تؤثر على المنتجات أو المواد أو المعدات أو التنظيف أو التخزين أو التوزيع", whenEn: "Before implementation", whenAr: "قبل التنفيذ", withEn: "FSMS team and affected departments", withAr: "فريق FSMS والأقسام المتأثرة", howEn: "Change Management Log, meeting, memo", howAr: "سجل إدارة التغيير، اجتماع، مذكرة", whoEn: "Department Head / FSMS Team Leader", whoAr: "رئيس القسم / قائد FSMS" },
  { whatEn: "Emergency or incident communication impacting food safety", whatAr: "تواصل الطوارئ أو الحوادث المؤثرة على سلامة الغذاء", whenEn: "Immediately", whenAr: "فورا", withEn: "HSE, QA, operations, logistics, management", withAr: "HSE، الجودة، العمليات، اللوجستيات، الإدارة", howEn: "Incident report, call tree, WhatsApp, MRM follow-up", howAr: "تقرير حادث، شجرة اتصال، واتساب، متابعة MRM", whoEn: "HSE / QA / Management", whoAr: "HSE / الجودة / الإدارة" },
];

const STATUS_COLOR = {
  Open: { bg: "#fef3c7", color: "#854d0e" },
  InProgress: { bg: "#dbeafe", color: "#1e40af" },
  Escalated: { bg: "#fee2e2", color: "#991b1b" },
  Closed: { bg: "#dcfce7", color: "#166534" },
};

const S = {
  shell: { minHeight: "100vh", padding: "20px 16px", fontFamily: 'system-ui,-apple-system,"Segoe UI",sans-serif', background: "linear-gradient(180deg,#eef7ff 0%,#f8fafc 100%)", color: "#0f172a" },
  layout: { width: "100%", margin: "0 auto", padding: "0 4px" },
  topbar: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14, flexWrap: "wrap", gap: 10, padding: "12px 16px", background: "rgba(255,255,255,0.94)", borderRadius: 14, border: "1px solid #bae6fd", boxShadow: "0 8px 24px rgba(2,132,199,0.10)" },
  title: { fontSize: 22, fontWeight: 950, color: "#075985", lineHeight: 1.2 },
  subtitle: { fontSize: 12, color: "#0369a1", marginTop: 4, fontWeight: 700 },
  card: { background: "#fff", borderRadius: 14, padding: 16, marginBottom: 10, border: "1px solid #bae6fd", boxShadow: "0 6px 16px rgba(2,132,199,0.06)" },
  sectionTitle: { fontSize: 15, fontWeight: 950, color: "#075985", margin: "0 0 10px" },
  kpiGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(170px,1fr))", gap: 10, marginBottom: 14 },
  kpi: (color) => ({ background: "#fff", borderRadius: 14, padding: "14px 16px", border: `1px solid ${color}33`, borderInlineStart: `4px solid ${color}`, boxShadow: "0 6px 16px rgba(2,132,199,0.05)" }),
  kpiVal: (color) => ({ fontSize: 28, fontWeight: 950, color, lineHeight: 1 }),
  kpiLabel: { fontSize: 11, fontWeight: 800, color: "#64748b", marginTop: 6, textTransform: "uppercase", letterSpacing: "0.07em" },
  toolbar: { display: "flex", gap: 8, marginBottom: 12, flexWrap: "wrap", alignItems: "center", padding: 10, background: "#fff", borderRadius: 14, border: "1px solid #bae6fd" },
  input: { padding: "8px 11px", border: "1.5px solid #bae6fd", borderRadius: 10, fontSize: 13, fontWeight: 600, fontFamily: "inherit", background: "#fff" },
  select: { padding: "8px 11px", border: "1.5px solid #bae6fd", borderRadius: 10, fontSize: 13, fontWeight: 700, fontFamily: "inherit", background: "#fff" },
  tableWrap: { overflowX: "auto" },
  table: { width: "100%", borderCollapse: "collapse", fontSize: 12.5 },
  th: { background: "#0ea5e9", color: "#fff", padding: "8px 10px", textAlign: "start", fontWeight: 900, border: "1px solid #0284c7" },
  td: { padding: "8px 10px", border: "1px solid #e2e8f0", verticalAlign: "top", fontWeight: 650 },
  rowHead: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 10 },
  meta: { fontSize: 12, color: "#64748b", fontWeight: 700, marginTop: 4 },
  badge: (c) => ({ display: "inline-block", padding: "3px 10px", borderRadius: 999, fontSize: 11, fontWeight: 900, background: c.bg, color: c.color }),
  detailBlock: { marginTop: 10, paddingTop: 10, borderTop: "1px dashed #bae6fd" },
  miniTitle: { fontSize: 12, fontWeight: 900, color: "#075985", marginBottom: 4 },
  miniText: { fontSize: 13, color: "#1f2937", whiteSpace: "pre-wrap", lineHeight: 1.55 },
  empty: { textAlign: "center", padding: 50, color: "#64748b", fontWeight: 700 },
  btn: (kind) => {
    const map = {
      primary: { bg: "linear-gradient(180deg,#0ea5e9,#0284c7)", color: "#fff", border: "#0369a1" },
      secondary: { bg: "#fff", color: "#075985", border: "#bae6fd" },
      danger: { bg: "linear-gradient(180deg,#ef4444,#dc2626)", color: "#fff", border: "#b91c1c" },
      ghost: { bg: "#f0f9ff", color: "#075985", border: "#bae6fd" },
    };
    const c = map[kind] || map.primary;
    return { background: c.bg, color: c.color, border: `1.5px solid ${c.border}`, padding: "8px 14px", borderRadius: 999, cursor: "pointer", fontWeight: 900, fontSize: 13, whiteSpace: "nowrap" };
  },
};

function escapeCSV(v) {
  const s = v == null ? "" : String(v);
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function downloadBlob(filename, mime, content) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1500);
}

function topicLabel(value, isAr) {
  const found = TOPICS.find((x) => x.v === value);
  return found ? (isAr ? found.ar : found.en) : value || "-";
}

function isOverdue(p) {
  if (p.status === "Closed" || p.responseRequired !== "Yes" || !p.dueDate) return false;
  const due = new Date(p.dueDate).getTime();
  return Number.isFinite(due) && due < Date.now();
}

export default function CommunicationLogView() {
  const navigate = useNavigate();
  const { t, lang, toggle, dir } = useHaccpLang();
  const isAr = lang === "ar";

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [openId, setOpenId] = useState(null);
  const [statusFilter, setStatusFilter] = useState("all");
  const [directionFilter, setDirectionFilter] = useState("all");
  const [topicFilter, setTopicFilter] = useState("all");
  const [search, setSearch] = useState("");

  async function load() {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/reports?type=${encodeURIComponent(TYPE)}`, { cache: "no-store" });
      const json = await res.json().catch(() => null);
      const arr = Array.isArray(json) ? json : json?.data || json?.items || [];
      arr.sort((a, b) => new Date(b?.payload?.communicationDate || 0) - new Date(a?.payload?.communicationDate || 0));
      setItems(arr);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  async function del(id) {
    if (!window.confirm(t("confirmDelete"))) return;
    try {
      await fetch(`${API_BASE}/api/reports/${encodeURIComponent(id)}`, { method: "DELETE" });
      load();
    } catch (e) {
      alert(t("deleteError") + ": " + e.message);
    }
  }

  const stats = useMemo(() => {
    const total = items.length;
    let internal = 0, external = 0, open = 0, overdue = 0, foodSafety = 0, escalated = 0;
    for (const rec of items) {
      const p = rec?.payload || {};
      if (p.direction === "External") external++; else internal++;
      if ((p.status || "Open") !== "Closed") open++;
      if (isOverdue(p)) overdue++;
      if (p.foodSafetyConcern === "Yes") foodSafety++;
      if (p.escalation === "Yes" || p.status === "Escalated") escalated++;
    }
    return { total, internal, external, open, overdue, foodSafety, escalated };
  }, [items]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return items.filter((rec) => {
      const p = rec?.payload || {};
      if (statusFilter !== "all" && (p.status || "Open") !== statusFilter) return false;
      if (directionFilter !== "all" && (p.direction || "Internal") !== directionFilter) return false;
      if (topicFilter !== "all" && p.topic !== topicFilter) return false;
      if (q) {
        const hay = [
          p.communicationNo, p.partyName, p.contactPerson, p.subject, p.messageSummary,
          p.responseSummary, p.communicator, p.linkedModule, p.linkedReference, p.notes,
        ].map((v) => String(v || "").toLowerCase()).join(" ");
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [items, statusFilter, directionFilter, topicFilter, search]);

  function exportCSV() {
    const headers = [
      "Communication No.", "Date", "Direction", "Party Category", "Party", "Contact Person",
      "Channel", "Topic", "Subject", "Message Summary", "Communicated By",
      "Response Required", "Due Date", "Response Summary", "Status", "Closed Date",
      "Verified By", "Linked Module", "Linked Reference", "Food Safety Concern", "FSMS Impact",
      "Escalation", "Notes",
    ];
    const rows = filtered.map((rec) => {
      const p = rec?.payload || {};
      return [
        p.communicationNo, p.communicationDate, p.direction, p.partyCategory, p.partyName, p.contactPerson,
        p.channel, topicLabel(p.topic, false), p.subject, p.messageSummary, p.communicator,
        p.responseRequired, p.dueDate, p.responseSummary, p.status, p.closedDate,
        p.verifiedBy, p.linkedModule, p.linkedReference, p.foodSafetyConcern, p.fsmsImpact,
        p.escalation, p.notes,
      ].map(escapeCSV).join(",");
    });
    downloadBlob(`fsms-communication-log_${new Date().toISOString().slice(0, 10)}.csv`, "text/csv;charset=utf-8;", "\uFEFF" + headers.map(escapeCSV).join(",") + "\n" + rows.join("\n"));
  }

  function exportJSON() {
    const data = filtered.map((rec) => ({ id: rec.id, ...(rec?.payload || {}) }));
    downloadBlob(`fsms-communication-log_${new Date().toISOString().slice(0, 10)}.json`, "application/json", JSON.stringify(data, null, 2));
  }

  return (
    <main style={{ ...S.shell, direction: dir }}>
      <div style={S.layout}>
        <div style={S.topbar}>
          <div>
            <div style={S.title}>{isAr ? "سجل ومصفوفة التواصل FSMS" : "FSMS Communication Matrix / Log"}</div>
            <div style={S.subtitle}>{isAr ? "تطبيق البند 7.4 - التواصل الداخلي والخارجي" : "Clause 7.4 - internal and external communication"}</div>
            <HaccpLinkBadge clauses={["7.4"]} label={isAr ? "التواصل" : "Communication"} />
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <HaccpLangToggle lang={lang} toggle={toggle} />
            <button style={S.btn("secondary")} onClick={load} disabled={loading}>{loading ? "..." : t("refresh")}</button>
            <button style={S.btn("ghost")} onClick={exportCSV} disabled={!filtered.length}>CSV</button>
            <button style={S.btn("ghost")} onClick={exportJSON} disabled={!filtered.length}>JSON</button>
            <button style={S.btn("primary")} onClick={() => navigate("/haccp-iso/communication-log")}>{t("new")}</button>
            <button style={S.btn("secondary")} onClick={() => navigate("/haccp-iso")}>{t("backToHub")}</button>
          </div>
        </div>

        <div style={S.kpiGrid}>
          <div style={S.kpi("#075985")}><div style={S.kpiVal("#075985")}>{stats.total}</div><div style={S.kpiLabel}>{isAr ? "إجمالي السجلات" : "Total Records"}</div></div>
          <div style={S.kpi("#0284c7")}><div style={S.kpiVal("#0284c7")}>{stats.internal}</div><div style={S.kpiLabel}>{isAr ? "داخلي" : "Internal"}</div></div>
          <div style={S.kpi("#7c3aed")}><div style={S.kpiVal("#7c3aed")}>{stats.external}</div><div style={S.kpiLabel}>{isAr ? "خارجي" : "External"}</div></div>
          <div style={S.kpi(stats.open ? "#a16207" : "#15803d")}><div style={S.kpiVal(stats.open ? "#a16207" : "#15803d")}>{stats.open}</div><div style={S.kpiLabel}>{isAr ? "مفتوح" : "Open"}</div></div>
          <div style={S.kpi(stats.overdue ? "#b91c1c" : "#15803d")}><div style={S.kpiVal(stats.overdue ? "#b91c1c" : "#15803d")}>{stats.overdue}</div><div style={S.kpiLabel}>{isAr ? "متأخر" : "Overdue"}</div></div>
          <div style={S.kpi(stats.foodSafety ? "#b91c1c" : "#15803d")}><div style={S.kpiVal(stats.foodSafety ? "#b91c1c" : "#15803d")}>{stats.foodSafety}</div><div style={S.kpiLabel}>{isAr ? "مؤشر خطر غذائي" : "Food Safety Concern"}</div></div>
        </div>

        <div style={S.card}>
          <div style={S.sectionTitle}>{isAr ? "مصفوفة التواصل المحددة للبند 7.4" : "Clause 7.4 Communication Matrix"}</div>
          <div style={S.tableWrap}>
            <table style={S.table}>
              <thead>
                <tr>
                  <th style={S.th}>{isAr ? "ماذا يتم التواصل به" : "What"}</th>
                  <th style={S.th}>{isAr ? "متى" : "When"}</th>
                  <th style={S.th}>{isAr ? "مع من" : "With Whom"}</th>
                  <th style={S.th}>{isAr ? "كيف" : "How"}</th>
                  <th style={S.th}>{isAr ? "المسؤول" : "Who"}</th>
                </tr>
              </thead>
              <tbody>
                {MATRIX_ROWS.map((r, i) => (
                  <tr key={i}>
                    <td style={S.td}>{isAr ? r.whatAr : r.whatEn}</td>
                    <td style={S.td}>{isAr ? r.whenAr : r.whenEn}</td>
                    <td style={S.td}>{isAr ? r.withAr : r.withEn}</td>
                    <td style={S.td}>{isAr ? r.howAr : r.howEn}</td>
                    <td style={S.td}>{isAr ? r.whoAr : r.whoEn}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div style={S.toolbar}>
          <input style={{ ...S.input, flex: 1, minWidth: 220 }} value={search} onChange={(e) => setSearch(e.target.value)} placeholder={isAr ? "بحث في الرقم، الطرف، الموضوع، المرجع..." : "Search no., party, subject, reference..."} />
          <select style={S.select} value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="all">{isAr ? "كل الحالات" : "All statuses"}</option>
            <option value="Open">{isAr ? "مفتوح" : "Open"}</option>
            <option value="InProgress">{isAr ? "قيد المتابعة" : "In progress"}</option>
            <option value="Escalated">{isAr ? "مصعّد" : "Escalated"}</option>
            <option value="Closed">{isAr ? "مغلق" : "Closed"}</option>
          </select>
          <select style={S.select} value={directionFilter} onChange={(e) => setDirectionFilter(e.target.value)}>
            <option value="all">{isAr ? "داخلي وخارجي" : "Internal & External"}</option>
            <option value="Internal">{isAr ? "داخلي" : "Internal"}</option>
            <option value="External">{isAr ? "خارجي" : "External"}</option>
          </select>
          <select style={S.select} value={topicFilter} onChange={(e) => setTopicFilter(e.target.value)}>
            <option value="all">{isAr ? "كل المواضيع" : "All topics"}</option>
            {TOPICS.map((x) => <option key={x.v} value={x.v}>{isAr ? x.ar : x.en}</option>)}
          </select>
          <span style={{ marginInlineStart: "auto", fontSize: 12, color: "#64748b", fontWeight: 800 }}>{filtered.length} / {stats.total}</span>
        </div>

        {loading && <div style={S.empty}>{t("loading")}</div>}
        {!loading && filtered.length === 0 && <div style={S.empty}>{t("noRecords")}</div>}

        {filtered.map((rec) => {
          const p = rec?.payload || {};
          const isOpen = openId === rec.id;
          const st = STATUS_COLOR[p.status || "Open"] || STATUS_COLOR.Open;
          return (
            <div key={rec.id} style={S.card}>
              <div style={S.rowHead}>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div style={{ fontSize: 16, fontWeight: 950, color: "#075985" }}>
                    {p.communicationNo || "COM"} - {p.subject || "-"}
                  </div>
                  <div style={S.meta}>
                    {p.communicationDate || "-"} - {p.direction || "Internal"} - {p.partyName || "-"}
                    {p.channel ? ` - ${p.channel}` : ""}
                    {p.linkedReference ? ` - ${p.linkedReference}` : ""}
                  </div>
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 6 }}>
                    <span style={S.badge(st)}>{p.status || "Open"}</span>
                    {isOverdue(p) && <span style={S.badge({ bg: "#fee2e2", color: "#991b1b" })}>{isAr ? "متأخر" : "Overdue"}</span>}
                    {p.foodSafetyConcern === "Yes" && <span style={S.badge({ bg: "#fee2e2", color: "#991b1b" })}>{isAr ? "خطر غذائي" : "Food safety"}</span>}
                    {p.escalation === "Yes" && <span style={S.badge({ bg: "#fef3c7", color: "#854d0e" })}>{isAr ? "تصعيد" : "Escalated"}</span>}
                    {p.linkedModule && p.linkedModule !== "None" && <span style={S.badge({ bg: "#e0f2fe", color: "#075985" })}>{p.linkedModule}</span>}
                  </div>
                </div>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                  <button style={S.btn("secondary")} onClick={() => setOpenId(isOpen ? null : rec.id)}>{isOpen ? t("collapse") : t("expand")}</button>
                  <button style={S.btn("secondary")} onClick={() => navigate(`/haccp-iso/communication-log?edit=${rec.id}`)}>{t("edit")}</button>
                  <button style={S.btn("danger")} onClick={() => del(rec.id)} data-delete-action="true">{t("del")}</button>
                </div>
              </div>

              {isOpen && (
                <div style={S.detailBlock}>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))", gap: 12 }}>
                    <div><div style={S.miniTitle}>{isAr ? "الموضوع" : "Topic"}</div><div style={S.miniText}>{topicLabel(p.topic, isAr)}</div></div>
                    <div><div style={S.miniTitle}>{isAr ? "فئة الطرف" : "Party Category"}</div><div style={S.miniText}>{p.partyCategory || "-"}</div></div>
                    <div><div style={S.miniTitle}>{isAr ? "المتواصل" : "Communicated By"}</div><div style={S.miniText}>{p.communicator || "-"}</div></div>
                    <div><div style={S.miniTitle}>{isAr ? "الاستحقاق" : "Due Date"}</div><div style={S.miniText}>{p.dueDate || "-"}</div></div>
                  </div>
                  {p.messageSummary && <div style={{ marginTop: 10 }}><div style={S.miniTitle}>{isAr ? "ملخص الرسالة" : "Message Summary"}</div><div style={S.miniText}>{p.messageSummary}</div></div>}
                  {p.responseSummary && <div style={{ marginTop: 10 }}><div style={S.miniTitle}>{isAr ? "ملخص الرد / المتابعة" : "Response / Follow-up"}</div><div style={S.miniText}>{p.responseSummary}</div></div>}
                  {(p.linkedReference || p.verifiedBy || p.notes) && (
                    <div style={{ marginTop: 10 }}>
                      <div style={S.miniTitle}>{isAr ? "الإغلاق والمرجع" : "Closure & Reference"}</div>
                      <div style={S.miniText}>
                        {p.closedDate ? `${isAr ? "تاريخ الإغلاق" : "Closed"}: ${p.closedDate}\n` : ""}
                        {p.verifiedBy ? `${isAr ? "تم التحقق بواسطة" : "Verified by"}: ${p.verifiedBy}\n` : ""}
                        {p.linkedReference ? `${isAr ? "المرجع" : "Reference"}: ${p.linkedReference}\n` : ""}
                        {p.notes || ""}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </main>
  );
}
