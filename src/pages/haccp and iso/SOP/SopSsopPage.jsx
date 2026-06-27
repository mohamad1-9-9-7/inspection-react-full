// src/pages/haccp and iso/SOP/SopSsopPage.jsx
import React, { useState, useMemo, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import mawashiLogo from "../../../assets/almawashi-logo.jpg";
import { sopsData, ssopsData, policiesData } from "./sopData";
import HaccpLinkBadge from "../FSMSManual/HaccpLinkBadge";
import API_BASE from "../../../config/api";
import SignaturePad from "../../../components/SignaturePad";

const TYPE_DOC_META = "document_metadata";
const TYPE_CHANGE_LOG = "fsms_change_management_log_item";
const TYPE_ACK = "sop_employee_acknowledgement";
const TYPE_TRAINING = "sop_training_evidence";
const TYPE_IMPLEMENTATION = "sop_implementation_evidence";

function toISODate(value) {
  if (!value) return "";
  if (/^\d{4}-\d{2}-\d{2}$/.test(String(value))) return value;
  const parts = String(value).split("/");
  if (parts.length === 3) {
    const [d, m, y] = parts;
    return `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
  }
  const dt = new Date(value);
  return Number.isNaN(dt.getTime()) ? "" : dt.toISOString().slice(0, 10);
}

function addYearsISO(value, years = 1) {
  const iso = toISODate(value);
  if (!iso) return "";
  const dt = new Date(iso);
  dt.setFullYear(dt.getFullYear() + years);
  return dt.toISOString().slice(0, 10);
}

function daysTo(value) {
  const iso = toISODate(value);
  if (!iso) return null;
  const target = new Date(`${iso}T00:00:00`);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return Math.ceil((target.getTime() - today.getTime()) / 86400000);
}

function reviewInfoFor(sop, meta) {
  const nextReview = meta?.nextReviewDate || addYearsISO(meta?.issueDate || sop.issueDate, 1);
  const diff = daysTo(nextReview);
  if (diff == null) return { nextReview, status: "active", label: "Review date not set" };
  if (diff < 0) return { nextReview, status: "overdue", label: `Overdue ${Math.abs(diff)} days` };
  if (diff <= 30) return { nextReview, status: "due", label: `Due in ${diff} days` };
  return { nextReview, status: "active", label: `Review ${nextReview}` };
}

async function fetchReportsByType(type) {
  try {
    const res = await fetch(`${API_BASE}/api/reports?type=${encodeURIComponent(type)}`, { cache: "no-store" });
    if (!res.ok) return [];
    const json = await res.json().catch(() => null);
    return Array.isArray(json) ? json : json?.data || json?.items || [];
  } catch {
    return [];
  }
}

function reportId(rec) {
  return rec?.id || rec?._id || rec?.recordId || rec?.payload?._recordId || "";
}

async function deleteReportById(id) {
  const res = await fetch(`${API_BASE}/api/reports/${encodeURIComponent(id)}`, { method: "DELETE" });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res;
}

async function postReport(type, payload, reporter = "admin") {
  const res = await fetch(`${API_BASE}/api/reports`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ reporter, type, payload: { ...payload, savedAt: Date.now() } }),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res;
}

async function putOrPostMetadata(existingId, payload, reporter = "admin") {
  const url = existingId ? `${API_BASE}/api/reports/${encodeURIComponent(existingId)}` : `${API_BASE}/api/reports`;
  const method = existingId ? "PUT" : "POST";
  const res = await fetch(url, {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ reporter, type: TYPE_DOC_META, payload: { ...payload, savedAt: Date.now() } }),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res;
}

async function nextChangeLogNo() {
  const arr = await fetchReportsByType(TYPE_CHANGE_LOG);
  return arr.reduce((max, rec) => Math.max(max, Number(rec?.payload?.logNo) || 0), 0) + 1;
}

function evidenceLinksFor(sop) {
  const links = [];
  const cat = sop.category;
  const title = `${sop.title} ${sop.number}`.toLowerCase();
  if (cat === "Hygiene" || cat === "Sanitation" || cat === "Pest Control" || cat === "Quality") {
    links.push(["Internal audit evidence", "/haccp-iso/internal-audit/view"]);
  }
  if (cat === "Temperature") links.push(["CCP monitoring", "/haccp-iso/ccp-monitoring/view"]);
  if (cat === "Recall" || cat === "Traceability" || title.includes("trace")) {
    links.push(["Mock recall / traceability", "/haccp-iso/mock-recall/view"]);
    links.push(["Real recall records", "/haccp-iso/real-recall/view"]);
  }
  if (cat === "Suppliers") links.push(["Supplier evaluation", "/haccp-iso/supplier-evaluation/results"]);
  if (cat === "Maintenance") {
    links.push(["Calibration records", "/haccp-iso/calibration/view"]);
    links.push(["Internal calibration", "/haccp-iso/internal-calibration/view"]);
  }
  if (cat === "Allergens") links.push(["Customer complaints / CAPA", "/haccp-iso/customer-complaints/view"]);
  if (!links.some(([, route]) => route === "/haccp-iso/internal-audit/view")) {
    links.push(["Internal audit evidence", "/haccp-iso/internal-audit/view"]);
  }
  links.push(["Document register", "/haccp-iso/document-register/view"]);
  return links;
}

// ─── Category colours ─────────────────────────────────────────────────────────
const categoryColors = {
  Hygiene:        { bg: "rgba(34,197,94,0.13)",  border: "rgba(34,197,94,0.40)",  text: "#15803d" },
  Sanitation:     { bg: "rgba(34,211,238,0.13)", border: "rgba(34,211,238,0.40)", text: "#0e7490" },
  "Pest Control": { bg: "rgba(251,191,36,0.13)", border: "rgba(251,191,36,0.40)", text: "#92400e" },
  Quality:        { bg: "rgba(168,85,247,0.13)", border: "rgba(168,85,247,0.40)", text: "#6b21a8" },
  Temperature:    { bg: "rgba(239,68,68,0.13)",  border: "rgba(239,68,68,0.40)",  text: "#991b1b" },
  Recall:         { bg: "rgba(249,115,22,0.13)", border: "rgba(249,115,22,0.40)", text: "#9a3412" },
  Traceability:   { bg: "rgba(59,130,246,0.13)", border: "rgba(59,130,246,0.40)", text: "#1d4ed8" },
  Allergens:      { bg: "rgba(236,72,153,0.13)", border: "rgba(236,72,153,0.40)", text: "#9d174d" },
  Suppliers:      { bg: "rgba(20,184,166,0.13)", border: "rgba(20,184,166,0.40)", text: "#0f766e" },
  Maintenance:    { bg: "rgba(100,116,139,0.13)", border: "rgba(100,116,139,0.40)", text: "#1e3a5f" },
  Policy:         { bg: "rgba(124,58,237,0.13)",  border: "rgba(124,58,237,0.40)",  text: "#4c1d95" },
};

const allCategories = ["All", ...Object.keys(categoryColors)];

// ─── UI text per language ─────────────────────────────────────────────────────
const UI = {
  en: {
    backToHub: "Back to Hub",
    badgeLabel: "📋 SOP & sSOP",
    pageTitle: "SOP & sSOP Documents",
    pageSubtitle: "Standard Operating Procedures — Document Set SOP 1–SOP 25 · Click any card to view full details",
    tagline: "Al Mawashi Food Safety Management System · ISO 22000:2018 & HACCP aligned",
    totalSOPs: "Total SOPs",
    showing: "Showing",
    categories: "Categories",
    docSet: "Document Set",
    searchPlaceholder: "Search SOPs…",
    viewFullDetails: "View Full Details",
    noMatch: "No SOPs match your search.",
    footer: "© Al Mawashi — Quality & Food Safety System · Document Set SOP 1–SOP 25",
    closeBtn: "Close",
    docNo: "Doc No.",
    facility: "Facility",
    preparedBy: "Prepared by",
    issueDate: "Issue Date",
    revision: "Revision",
    dir: "ltr",
    filterAll: "All",
    sopSectionTitle: "Standard Operating Procedures (SOP)",
    ssopSectionTitle: "Sanitation Standard Operating Procedures (sSOP)",
    ssopCount: "sSOP Documents",
    policySectionTitle: "Policies",
    policyCount: "Policy Documents",
  },
  ar: {
    backToHub: "العودة للرئيسية",
    badgeLabel: "📋 SOP & sSOP",
    pageTitle: "وثائق SOP & sSOP",
    pageSubtitle: "إجراءات التشغيل الموحدة — مجموعة وثائق SOP 1–SOP 25 · اضغط على أي بطاقة لعرض التفاصيل الكاملة",
    tagline: "نظام إدارة سلامة الأغذية لشركة المواشي · متوافق مع ISO 22000:2018 وHACCP",
    totalSOPs: "إجمالي SOPs",
    showing: "يعرض",
    categories: "الفئات",
    docSet: "مجموعة الوثائق",
    searchPlaceholder: "ابحث عن SOPs…",
    viewFullDetails: "عرض التفاصيل الكاملة",
    noMatch: "لا توجد SOPs تطابق بحثك.",
    footer: "© المواشي — نظام الجودة وسلامة الأغذية · مجموعة وثائق SOP 1–SOP 25",
    closeBtn: "إغلاق",
    docNo: "رقم الوثيقة",
    facility: "المنشأة",
    preparedBy: "أعده",
    issueDate: "تاريخ الإصدار",
    revision: "المراجعة",
    dir: "rtl",
    filterAll: "الكل",
    sopSectionTitle: "إجراءات التشغيل الموحدة (SOP)",
    ssopSectionTitle: "إجراءات التشغيل الموحدة للتعقيم (sSOP)",
    ssopCount: "وثائق sSOP",
    policySectionTitle: "السياسات",
    policyCount: "وثائق السياسات",
  },
};

// ─── Icons ────────────────────────────────────────────────────────────────────
function IconDoc() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" fill="currentColor" opacity="0.14" stroke="currentColor" strokeWidth="1.6" />
      <path d="M14 2v6h6" stroke="currentColor" strokeWidth="1.6" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      <line x1="8" y1="13" x2="16" y2="13" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <line x1="8" y1="17" x2="12" y2="17" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}
function IconBack({ rtl }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ transform: rtl ? "scaleX(-1)" : "none" }}>
      <path d="M15 18l-6-6 6-6" />
    </svg>
  );
}
function IconSearch() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" />
    </svg>
  );
}
function IconClose() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}

// ─── Modal ────────────────────────────────────────────────────────────────────
const auditInput = {
  width: "100%",
  padding: "9px 11px",
  borderRadius: 8,
  border: "1px solid #cbd5e1",
  fontSize: 13,
  fontWeight: 700,
  fontFamily: "inherit",
  boxSizing: "border-box",
};

const auditTextarea = {
  ...auditInput,
  minHeight: 76,
  resize: "vertical",
  lineHeight: 1.5,
};

function auditButton(kind = "primary") {
  const secondary = kind === "secondary";
  const danger = kind === "danger";
  return {
    padding: "8px 12px",
    borderRadius: 8,
    border: danger ? "1px solid #ef4444" : secondary ? "1px solid #cbd5e1" : "1px solid #0f766e",
    background: danger ? "#fff" : secondary ? "#fff" : "#0f766e",
    color: danger ? "#b91c1c" : secondary ? "#334155" : "#fff",
    fontSize: 12,
    fontWeight: 900,
    cursor: "pointer",
  };
}

function AuditPanel({ title, children, actionLabel, onAction }) {
  return (
    <section style={{ border: "1px solid #dbe4e2", borderRadius: 10, padding: 14, marginTop: 18, background: "#ffffff" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, marginBottom: 12, flexWrap: "wrap" }}>
        <h3 style={{ margin: 0, fontSize: 16, fontWeight: 950, color: "#0f766e" }}>{title}</h3>
        <button type="button" onClick={onAction} style={auditButton("primary")}>{actionLabel}</button>
      </div>
      {children}
    </section>
  );
}

function AuditGrid({ children }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))", gap: 10 }}>
      {children}
    </div>
  );
}

function AuditField({ label, children, wide }) {
  return (
    <label style={{ display: "block", gridColumn: wide ? "1 / -1" : "auto" }}>
      <div style={{ fontSize: 11, fontWeight: 950, color: "#475569", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 4 }}>
        {label}
      </div>
      {children}
    </label>
  );
}

function AuditInput({ label, value, onChange, type = "text" }) {
  return (
    <AuditField label={label}>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        lang={type === "date" ? "en-CA" : undefined}
        dir={type === "date" ? "ltr" : undefined}
        style={auditInput}
      />
    </AuditField>
  );
}

function MiniList({ records, render, onDelete, deletingId, emptyText = "No saved records yet." }) {
  if (!records.length) {
    return <div style={{ marginTop: 10, fontSize: 12, color: "#64748b", fontWeight: 800 }}>{emptyText}</div>;
  }
  return (
    <div style={{ display: "grid", gap: 6, marginTop: 10 }}>
      {records.slice(0, 8).map((rec) => {
        const rid = reportId(rec);
        const isDeleting = deletingId && deletingId === rid;
        return (
          <div key={rid || rec?.payload?.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, padding: "7px 9px", borderRadius: 8, background: "#f8fafc", border: "1px solid #e2e8f0", fontSize: 12, fontWeight: 800, color: "#334155" }}>
            <span style={{ minWidth: 0, overflowWrap: "anywhere" }}>{render(rec.payload || {})}</span>
            {onDelete && rid && (
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => onDelete(rec)}
                style={{ ...auditButton("danger"), padding: "5px 9px", flexShrink: 0, opacity: isDeleting ? 0.55 : 1 }}
              >
                {isDeleting ? "Deleting..." : "Delete"}
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
}

function SopModal({ sop, onClose, lang, navigate, onAuditChanged }) {
  const t = UI[lang];
  const isAr = lang === "ar";
  const catColor = categoryColors[sop.category] || categoryColors.Hygiene;
  const [loadingAudit, setLoadingAudit] = useState(true);
  const [metaRecord, setMetaRecord] = useState(null);
  const [ackRecords, setAckRecords] = useState([]);
  const [trainingRecords, setTrainingRecords] = useState([]);
  const [implementationRecords, setImplementationRecords] = useState([]);
  const [changeRecords, setChangeRecords] = useState([]);
  const [saving, setSaving] = useState("");
  const [deletingId, setDeletingId] = useState("");
  const modalBodyRef = useRef(null);
  const [revisionForm, setRevisionForm] = useState({
    reason: "",
    revisionBefore: sop.revision || "",
    revisionAfter: "",
    preparedBy: sop.preparedBy || "QA",
    reviewedBy: "Food Safety Team Leader",
    approvedBy: "Top Management",
    effectiveDate: new Date().toISOString().slice(0, 10),
    nextReviewDate: addYearsISO(new Date().toISOString().slice(0, 10), 1),
  });
  const [ackForm, setAckForm] = useState({
    employeeName: "",
    position: "",
    date: new Date().toISOString().slice(0, 10),
    signature: "",
  });
  const [trainingForm, setTrainingForm] = useState({
    trainingTitle: sop.title,
    trainer: "",
    date: new Date().toISOString().slice(0, 10),
    participants: "",
    result: "Completed",
    nextRefreshDate: addYearsISO(new Date().toISOString().slice(0, 10), 1),
  });
  const [implementationForm, setImplementationForm] = useState({
    evidenceType: "Internal audit / record review",
    evidenceRef: "",
    verifiedBy: "",
    date: new Date().toISOString().slice(0, 10),
    result: "Effective",
    notes: "",
  });

  async function loadAuditData() {
    setLoadingAudit(true);
    try {
      const [meta, ack, training, implementation, changes] = await Promise.all([
        fetchReportsByType(TYPE_DOC_META),
        fetchReportsByType(TYPE_ACK),
        fetchReportsByType(TYPE_TRAINING),
        fetchReportsByType(TYPE_IMPLEMENTATION),
        fetchReportsByType(TYPE_CHANGE_LOG),
      ]);
      const metaHit = meta.find((r) => r?.payload?.docNo === sop.docNo) || null;
      setMetaRecord(metaHit);
      setAckRecords(ack.filter((r) => r?.payload?.docNo === sop.docNo));
      setTrainingRecords(training.filter((r) => r?.payload?.docNo === sop.docNo));
      setImplementationRecords(implementation.filter((r) => r?.payload?.docNo === sop.docNo));
      setChangeRecords(changes.filter((r) => (
        r?.payload?.documentNo === sop.docNo ||
        r?.payload?.docNo === sop.docNo ||
        (r?.payload?.sourceModule === "SOP & sSOP" && String(r?.payload?.description || "").includes(sop.number))
      )));
      if (metaHit?.payload) {
        setRevisionForm((prev) => ({
          ...prev,
          revisionBefore: metaHit.payload.revision || sop.revision || prev.revisionBefore,
          nextReviewDate: metaHit.payload.nextReviewDate || prev.nextReviewDate,
          approvedBy: metaHit.payload.approvedBy || prev.approvedBy,
        }));
      }
    } catch {
      setMetaRecord(null);
      setAckRecords([]);
      setTrainingRecords([]);
      setImplementationRecords([]);
      setChangeRecords([]);
    } finally {
      setLoadingAudit(false);
    }
  }

  useEffect(() => { loadAuditData(); }, [sop.docNo]); // eslint-disable-line

  async function deleteAuditRecord(rec, label) {
    const id = reportId(rec);
    if (!id) {
      alert("Cannot delete this record because its server id is missing.");
      return;
    }
    if (!window.confirm(`Delete this ${label}?`)) return;
    setDeletingId(id);
    try {
      await deleteReportById(id);
      await loadAuditData();
      onAuditChanged?.();
    } catch (e) {
      alert("Delete error: " + (e?.message || e));
    } finally {
      setDeletingId("");
    }
  }

  async function saveRevisionTrail() {
    if (!revisionForm.reason.trim() || !revisionForm.revisionAfter.trim() || !revisionForm.approvedBy.trim()) {
      alert("Reason, revision after, and approved by are required.");
      return;
    }
    setSaving("revision");
    try {
      const metadataPayload = {
        ...(metaRecord?.payload || {}),
        docNo: sop.docNo,
        title: sop.title,
        titleAr: sop.titleAr,
        type: sop.id?.startsWith("ssop") ? "sSOP" : sop.category === "Policy" ? "Policy" : "SOP",
        category: sop.category,
        owner: sop.preparedBy,
        issueDate: revisionForm.effectiveDate,
        revision: revisionForm.revisionAfter,
        facility: sop.facility,
        status: "Active",
        nextReviewDate: revisionForm.nextReviewDate,
        approvedBy: revisionForm.approvedBy,
        storage: "FSMS portal / SOP & sSOP module / controlled PDF export",
        distribution: "QA / HACCP Team / Relevant Department Owners",
        retentionYears: 2,
        notes: `Revision updated from ${revisionForm.revisionBefore} to ${revisionForm.revisionAfter}. Reason: ${revisionForm.reason}`,
      };
      await putOrPostMetadata(reportId(metaRecord), metadataPayload, revisionForm.approvedBy);
      await postReport(TYPE_CHANGE_LOG, {
        id: `chg_sop_${Date.now()}`,
        logNo: await nextChangeLogNo(),
        date: revisionForm.effectiveDate,
        description: `${sop.number} ${sop.title} revision updated`,
        reason: revisionForm.reason,
        impact: `Controlled SOP/sSOP document update. Document ${sop.docNo}; revision ${revisionForm.revisionBefore} to ${revisionForm.revisionAfter}. Training/acknowledgement evidence to be retained where applicable.`,
        approvedBy: revisionForm.approvedBy,
        implementationDate: revisionForm.effectiveDate,
        verification: `Revision trail saved in SOP & sSOP module. Next review date: ${revisionForm.nextReviewDate}.`,
        status: "verified",
        sourceModule: "SOP & sSOP",
        documentNo: sop.docNo,
        revisionBefore: revisionForm.revisionBefore,
        revisionAfter: revisionForm.revisionAfter,
      }, revisionForm.approvedBy);
      await loadAuditData();
      onAuditChanged?.();
      alert("Revision trail saved and linked to Change Management Log.");
    } catch (e) {
      alert("Save error: " + (e?.message || e));
    } finally {
      setSaving("");
    }
  }

  async function saveAcknowledgement() {
    if (!ackForm.employeeName.trim() || !ackForm.position.trim() || !ackForm.date || !ackForm.signature) {
      alert("Employee name, position, date, and signature are required.");
      return;
    }
    setSaving("ack");
    try {
      await postReport(TYPE_ACK, {
        id: `sop_ack_${Date.now()}`,
        sopId: sop.id,
        docNo: sop.docNo,
        sopTitle: sop.title,
        revision: metaRecord?.payload?.revision || sop.revision,
        employeeName: ackForm.employeeName.trim(),
        position: ackForm.position.trim(),
        date: ackForm.date,
        signature: ackForm.signature,
        statement: "Employee read and understood this SOP/sSOP and acknowledges responsibility to follow it.",
      }, ackForm.employeeName);
      setAckForm({ employeeName: "", position: "", date: new Date().toISOString().slice(0, 10), signature: "" });
      await loadAuditData();
    } catch (e) {
      alert("Save error: " + (e?.message || e));
    } finally {
      setSaving("");
    }
  }

  async function saveTrainingEvidence() {
    if (!trainingForm.trainingTitle.trim() || !trainingForm.trainer.trim() || !trainingForm.date) {
      alert("Training title, trainer, and date are required.");
      return;
    }
    setSaving("training");
    try {
      await postReport(TYPE_TRAINING, {
        id: `sop_training_${Date.now()}`,
        sopId: sop.id,
        docNo: sop.docNo,
        sopTitle: sop.title,
        revision: metaRecord?.payload?.revision || sop.revision,
        ...trainingForm,
      }, trainingForm.trainer);
      setTrainingForm((prev) => ({ ...prev, trainer: "", participants: "" }));
      await loadAuditData();
    } catch (e) {
      alert("Save error: " + (e?.message || e));
    } finally {
      setSaving("");
    }
  }

  async function saveImplementationEvidence() {
    if (!implementationForm.evidenceRef.trim() || !implementationForm.verifiedBy.trim() || !implementationForm.date) {
      alert("Evidence reference, verified by, and date are required.");
      return;
    }
    setSaving("implementation");
    try {
      await postReport(TYPE_IMPLEMENTATION, {
        id: `sop_impl_${Date.now()}`,
        sopId: sop.id,
        docNo: sop.docNo,
        sopTitle: sop.title,
        revision: metaRecord?.payload?.revision || sop.revision,
        ...implementationForm,
      }, implementationForm.verifiedBy);
      setImplementationForm((prev) => ({ ...prev, evidenceRef: "", notes: "" }));
      await loadAuditData();
    } catch (e) {
      alert("Save error: " + (e?.message || e));
    } finally {
      setSaving("");
    }
  }

  async function exportControlledPdf() {
    setSaving("pdf");
    try {
      const node = modalBodyRef.current;
      if (!node) throw new Error("PDF content not ready.");
      const canvas = await html2canvas(node, { scale: 2, backgroundColor: "#ffffff", useCORS: true });
      const pdf = new jsPDF("p", "pt", "a4");
      const margin = 26;
      const pageW = pdf.internal.pageSize.getWidth();
      const pageH = pdf.internal.pageSize.getHeight();
      const imgW = pageW - margin * 2;
      const ratio = imgW / canvas.width;
      const sliceH = Math.floor((pageH - margin * 2) / ratio);
      let y = 0;
      let first = true;
      while (y < canvas.height) {
        const h = Math.min(sliceH, canvas.height - y);
        const slice = document.createElement("canvas");
        slice.width = canvas.width;
        slice.height = h;
        const ctx = slice.getContext("2d");
        ctx.fillStyle = "#fff";
        ctx.fillRect(0, 0, slice.width, slice.height);
        ctx.drawImage(canvas, 0, y, canvas.width, h, 0, 0, canvas.width, h);
        if (!first) pdf.addPage("a4", "p");
        pdf.addImage(slice.toDataURL("image/jpeg", 0.96), "JPEG", margin, margin, imgW, h * ratio);
        first = false;
        y += h;
      }
      pdf.save(`${sop.docNo.replace(/[^\w-]+/g, "_")}_Rev_${metaRecord?.payload?.revision || sop.revision}.pdf`);
    } catch (e) {
      alert("PDF export error: " + (e?.message || e));
    } finally {
      setSaving("");
    }
  }

  useEffect(() => {
    const handler = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, []);

  const metaFields = [
    { label: t.docNo,       value: sop.docNo },
    { label: t.facility,    value: isAr ? (sop.facilityAr || sop.facility) : sop.facility },
    { label: t.preparedBy,  value: sop.preparedBy },
    { label: t.issueDate,   value: sop.issueDate },
    { label: t.revision,    value: sop.revision },
  ];

  return (
    <div
      style={{
        position: "fixed", inset: 0, zIndex: 1000,
        background: "rgba(7,27,45,0.55)", backdropFilter: "blur(6px)",
        display: "flex", alignItems: "stretch", justifyContent: "stretch", padding: 0,
      }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div style={{
        width: "100%", height: "100%", borderRadius: 0,
        background: "#fff", display: "flex", flexDirection: "column", overflow: "hidden",
        direction: t.dir,
      }}>
        {/* Header */}
        <div style={{
          padding: "20px 40px 16px",
          background: "linear-gradient(135deg,rgba(34,211,238,0.10),rgba(34,197,94,0.07))",
          borderBottom: "1px solid rgba(15,23,42,0.08)", flexShrink: 0,
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "12px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "12px", minWidth: 0 }}>
              <div style={{
                width: "46px", height: "46px", borderRadius: "12px", flexShrink: 0,
                background: "linear-gradient(135deg,rgba(34,211,238,0.20),rgba(34,197,94,0.14))",
                border: "1px solid rgba(34,211,238,0.34)",
                display: "flex", alignItems: "center", justifyContent: "center", color: "#0369a1",
              }}>
                <IconDoc />
              </div>
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
                  <span style={{ fontSize: "12px", fontWeight: 900, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.10em" }}>
                    {sop.number}
                  </span>
                  <span style={{
                    fontSize: "10px", fontWeight: 900, padding: "3px 10px", borderRadius: "999px",
                    background: catColor.bg, border: `1px solid ${catColor.border}`, color: catColor.text,
                  }}>
                    {isAr ? (sop.categoryAr || sop.category) : sop.category}
                  </span>
                </div>
                <div style={{ fontSize: "22px", fontWeight: 980, color: "#071b2d", lineHeight: 1.25, marginTop: "4px" }}>
                  {isAr ? (sop.titleAr || sop.title) : sop.title}
                </div>
                <div style={{ fontSize: "13px", color: "#475569", marginTop: "3px" }}>
                  {isAr ? (sop.subtitleAr || sop.subtitle) : sop.subtitle}
                </div>
              </div>
            </div>
            <button onClick={onClose} style={{
              flexShrink: 0, width: "36px", height: "36px", borderRadius: "10px",
              background: "rgba(15,23,42,0.06)", border: "1px solid rgba(15,23,42,0.12)",
              cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "#334155",
            }} title="Close">
              <IconClose />
            </button>
          </div>

          {/* Meta pills */}
          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", marginTop: "14px" }}>
            {metaFields.map((m) => (
              <div key={m.label} style={{
                padding: "5px 12px", borderRadius: "10px",
                background: "rgba(241,245,249,0.90)", border: "1px solid rgba(15,23,42,0.08)",
                display: "flex", gap: "6px", alignItems: "baseline",
              }}>
                <span style={{ fontSize: "10px", fontWeight: 800, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.07em" }}>{m.label}</span>
                <span style={{ fontSize: "12px", fontWeight: 900, color: "#1e293b" }}>{m.value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Body */}
        <div ref={modalBodyRef} data-sop-modal-body={sop.id} style={{
          overflowY: "auto", padding: "28px 40px 40px", flex: 1,
          maxWidth: "1100px", width: "100%", alignSelf: "center", boxSizing: "border-box",
        }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 10, marginBottom: 18 }}>
            {[
              ["Review status", reviewInfoFor(sop, metaRecord?.payload).label],
              ["Acknowledgements", ackRecords.length],
              ["Training evidence", trainingRecords.length],
              ["Implementation evidence", implementationRecords.length],
            ].map(([label, value]) => (
              <div key={label} style={{ border: "1px solid #dbeafe", borderRadius: 8, padding: 10, background: "#f8fafc" }}>
                <div style={{ fontSize: 11, color: "#64748b", fontWeight: 900, textTransform: "uppercase" }}>{label}</div>
                <div style={{ fontSize: 18, color: "#0f172a", fontWeight: 950 }}>{loadingAudit ? "..." : value}</div>
              </div>
            ))}
          </div>

          {sop.sections.map((sec, i) => (
            <div key={i} style={{ marginBottom: "24px" }}>
              <div style={{
                fontSize: "24px", fontWeight: 950, color: "#0369a1",
                marginBottom: "10px", paddingBottom: "8px",
                borderBottom: "1px solid rgba(34,211,238,0.22)",
                display: "flex", alignItems: "center", gap: "10px",
              }}>
                <span style={{
                  width: "8px", height: "8px", borderRadius: "50%",
                  background: "linear-gradient(135deg,#22d3ee,#22c55e)",
                  display: "inline-block", flexShrink: 0,
                }} />
                {isAr ? (sec.headingAr || sec.heading) : sec.heading}
              </div>
              <div style={{
                fontSize: "20px", color: "#1e293b", lineHeight: 1.8,
                whiteSpace: "pre-line", paddingInlineStart: "18px",
              }}>
                {isAr ? (sec.contentAr || sec.content) : sec.content}
              </div>
            </div>
          ))}

          <AuditPanel
            title="Approval & Revision Trail"
            actionLabel={saving === "revision" ? "Saving..." : "Save revision trail"}
            onAction={saveRevisionTrail}
          >
            <AuditGrid>
              <AuditField label="Reason for amendment" wide>
                <textarea value={revisionForm.reason} onChange={(e) => setRevisionForm((p) => ({ ...p, reason: e.target.value }))} style={auditTextarea} />
              </AuditField>
              <AuditInput label="Revision before" value={revisionForm.revisionBefore} onChange={(v) => setRevisionForm((p) => ({ ...p, revisionBefore: v }))} />
              <AuditInput label="Revision after" value={revisionForm.revisionAfter} onChange={(v) => setRevisionForm((p) => ({ ...p, revisionAfter: v }))} />
              <AuditInput label="Prepared by" value={revisionForm.preparedBy} onChange={(v) => setRevisionForm((p) => ({ ...p, preparedBy: v }))} />
              <AuditInput label="Reviewed by" value={revisionForm.reviewedBy} onChange={(v) => setRevisionForm((p) => ({ ...p, reviewedBy: v }))} />
              <AuditInput label="Approved by" value={revisionForm.approvedBy} onChange={(v) => setRevisionForm((p) => ({ ...p, approvedBy: v }))} />
              <AuditInput label="Effective date" type="date" value={revisionForm.effectiveDate} onChange={(v) => setRevisionForm((p) => ({ ...p, effectiveDate: v }))} />
              <AuditInput label="Next review date" type="date" value={revisionForm.nextReviewDate} onChange={(v) => setRevisionForm((p) => ({ ...p, nextReviewDate: v }))} />
            </AuditGrid>
            <div style={{ marginTop: 12, fontSize: 11, fontWeight: 950, color: "#475569", textTransform: "uppercase" }}>Saved Document Register metadata</div>
            <MiniList
              records={metaRecord ? [metaRecord] : []}
              render={(p) => `Document Register - Rev ${p.revision || "-"} - Next review ${p.nextReviewDate || "-"}`}
              onDelete={(rec) => deleteAuditRecord(rec, "Document Register metadata record")}
              deletingId={deletingId}
              emptyText="No saved Document Register metadata for this SOP."
            />
            <div style={{ marginTop: 12, fontSize: 11, fontWeight: 950, color: "#475569", textTransform: "uppercase" }}>Saved Change Management entries</div>
            <MiniList
              records={changeRecords}
              render={(p) => `Change #${p.logNo || "-"} - ${p.date || "-"} - ${p.revisionBefore || "-"} to ${p.revisionAfter || "-"}`}
              onDelete={(rec) => deleteAuditRecord(rec, "Change Management entry")}
              deletingId={deletingId}
              emptyText="No saved Change Management entry for this SOP."
            />
          </AuditPanel>

          <AuditPanel
            title="Employee Acknowledgment"
            actionLabel={saving === "ack" ? "Saving..." : "Save acknowledgment"}
            onAction={saveAcknowledgement}
          >
            <AuditGrid>
              <AuditInput label="Employee name" value={ackForm.employeeName} onChange={(v) => setAckForm((p) => ({ ...p, employeeName: v }))} />
              <AuditInput label="Position" value={ackForm.position} onChange={(v) => setAckForm((p) => ({ ...p, position: v }))} />
              <AuditInput label="Date" type="date" value={ackForm.date} onChange={(v) => setAckForm((p) => ({ ...p, date: v }))} />
              <AuditField label="Signature" wide>
                <SignaturePad value={ackForm.signature} onChange={(v) => setAckForm((p) => ({ ...p, signature: v }))} width={420} height={110} label="Employee signature" />
              </AuditField>
            </AuditGrid>
            <MiniList
              records={ackRecords}
              render={(p) => `${p.employeeName} - ${p.position} - ${p.date}`}
              onDelete={(rec) => deleteAuditRecord(rec, "employee acknowledgment")}
              deletingId={deletingId}
              emptyText="No employee acknowledgments saved yet."
            />
          </AuditPanel>

          <AuditPanel
            title="Training Evidence Link"
            actionLabel={saving === "training" ? "Saving..." : "Save training evidence"}
            onAction={saveTrainingEvidence}
          >
            <AuditGrid>
              <AuditInput label="Training title" value={trainingForm.trainingTitle} onChange={(v) => setTrainingForm((p) => ({ ...p, trainingTitle: v }))} />
              <AuditInput label="Trainer" value={trainingForm.trainer} onChange={(v) => setTrainingForm((p) => ({ ...p, trainer: v }))} />
              <AuditInput label="Date" type="date" value={trainingForm.date} onChange={(v) => setTrainingForm((p) => ({ ...p, date: v }))} />
              <AuditInput label="Participants / count" value={trainingForm.participants} onChange={(v) => setTrainingForm((p) => ({ ...p, participants: v }))} />
              <AuditInput label="Result" value={trainingForm.result} onChange={(v) => setTrainingForm((p) => ({ ...p, result: v }))} />
              <AuditInput label="Next refresh date" type="date" value={trainingForm.nextRefreshDate} onChange={(v) => setTrainingForm((p) => ({ ...p, nextRefreshDate: v }))} />
            </AuditGrid>
            <MiniList
              records={trainingRecords}
              render={(p) => `${p.trainingTitle} - ${p.trainer} - ${p.date} - ${p.result}`}
              onDelete={(rec) => deleteAuditRecord(rec, "training evidence")}
              deletingId={deletingId}
              emptyText="No training evidence saved yet."
            />
          </AuditPanel>

          <AuditPanel
            title="Implementation Evidence"
            actionLabel={saving === "implementation" ? "Saving..." : "Save implementation evidence"}
            onAction={saveImplementationEvidence}
          >
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 12 }}>
              {evidenceLinksFor(sop).map(([label, route]) => (
                <button
                  key={route}
                  type="button"
                  onClick={() => {
                    onClose();
                    navigate(route);
                  }}
                  style={auditButton("secondary")}
                >
                  {label}
                </button>
              ))}
            </div>
            <AuditGrid>
              <AuditInput label="Evidence type" value={implementationForm.evidenceType} onChange={(v) => setImplementationForm((p) => ({ ...p, evidenceType: v }))} />
              <AuditInput label="Evidence reference" value={implementationForm.evidenceRef} onChange={(v) => setImplementationForm((p) => ({ ...p, evidenceRef: v }))} />
              <AuditInput label="Verified by" value={implementationForm.verifiedBy} onChange={(v) => setImplementationForm((p) => ({ ...p, verifiedBy: v }))} />
              <AuditInput label="Date" type="date" value={implementationForm.date} onChange={(v) => setImplementationForm((p) => ({ ...p, date: v }))} />
              <AuditInput label="Result" value={implementationForm.result} onChange={(v) => setImplementationForm((p) => ({ ...p, result: v }))} />
              <AuditField label="Notes" wide>
                <textarea value={implementationForm.notes} onChange={(e) => setImplementationForm((p) => ({ ...p, notes: e.target.value }))} style={auditTextarea} />
              </AuditField>
            </AuditGrid>
            <MiniList
              records={implementationRecords}
              render={(p) => `${p.evidenceType} - ${p.evidenceRef} - ${p.result} - ${p.date}`}
              onDelete={(rec) => deleteAuditRecord(rec, "implementation evidence")}
              deletingId={deletingId}
              emptyText="No implementation evidence saved yet."
            />
          </AuditPanel>
        </div>

        {/* Footer */}
        <div style={{
          padding: "12px 40px", borderTop: "1px solid rgba(15,23,42,0.08)",
          background: "rgba(248,250,252,0.95)", display: "flex", justifyContent: "flex-end", flexShrink: 0,
        }}>
          <button onClick={exportControlledPdf} style={{
            padding: "9px 18px", borderRadius: "12px", fontSize: "14px", fontWeight: 900,
            background: "#0f766e", border: "1px solid #0f766e", color: "#fff", cursor: "pointer", marginInlineEnd: 8,
          }}>
            {saving === "pdf" ? "Exporting..." : "Controlled PDF"}
          </button>
          <button onClick={onClose} style={{
            padding: "9px 28px", borderRadius: "12px", fontSize: "14px", fontWeight: 900,
            background: "linear-gradient(135deg,rgba(34,211,238,0.18),rgba(34,197,94,0.12))",
            border: "1px solid rgba(34,211,238,0.38)", color: "#052336", cursor: "pointer",
          }}>
            {t.closeBtn}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Reusable Card ────────────────────────────────────────────────────────────
function SopCard({ sop, isAr, t, hoverId, setHoverId, setSelectedSop, accent, meta }) {
  const isHover = hoverId === sop.id;
  const catColor = categoryColors[sop.category] || categoryColors.Hygiene;
  const review = reviewInfoFor(sop, meta);
  const reviewStyle = review.status === "overdue"
    ? { bg: "#fee2e2", color: "#991b1b", border: "#fecaca" }
    : review.status === "due"
    ? { bg: "#fef3c7", color: "#92400e", border: "#fde68a" }
    : { bg: "#dcfce7", color: "#166534", border: "#bbf7d0" };
  const hoverGlow = accent === "green"
    ? "0 20px 50px rgba(34,197,94,0.22)"
    : accent === "purple"
    ? "0 20px 50px rgba(124,58,237,0.22)"
    : "0 20px 50px rgba(34,211,238,0.20)";
  const hoverBorder = accent === "green"
    ? "rgba(34,197,94,0.55)"
    : accent === "purple"
    ? "rgba(124,58,237,0.55)"
    : "rgba(34,211,238,0.55)";
  const iconBg = accent === "green"
    ? "linear-gradient(135deg,rgba(34,197,94,0.20),rgba(20,184,166,0.14))"
    : accent === "purple"
    ? "linear-gradient(135deg,rgba(124,58,237,0.18),rgba(168,85,247,0.12))"
    : "linear-gradient(135deg,rgba(34,211,238,0.18),rgba(34,197,94,0.12))";
  const iconBorder = accent === "green"
    ? "1px solid rgba(34,197,94,0.38)"
    : accent === "purple"
    ? "1px solid rgba(124,58,237,0.38)"
    : "1px solid rgba(34,211,238,0.34)";
  const iconColor = accent === "green" ? "#15803d" : accent === "purple" ? "#4c1d95" : "#0369a1";
  const hintColor = accent === "green" ? "#15803d" : accent === "purple" ? "#4c1d95" : "#0369a1";

  return (
    <div
      style={{
        position: "relative", borderRadius: "18px",
        background: "rgba(255,255,255,0.92)", border: "1px solid rgba(15,23,42,0.14)",
        boxShadow: isHover ? hoverGlow : "0 10px 28px rgba(2,132,199,0.09)",
        borderColor: isHover ? hoverBorder : "rgba(15,23,42,0.14)",
        transition: "transform .18s ease, box-shadow .18s ease, border-color .18s ease",
        overflow: "hidden", padding: "16px 18px",
        cursor: "pointer", textAlign: isAr ? "right" : "left",
        transform: isHover ? "translateY(-4px)" : "translateY(0)",
      }}
      onMouseEnter={() => setHoverId(sop.id)}
      onMouseLeave={() => setHoverId(null)}
      onClick={() => setSelectedSop(sop)}
      role="button" tabIndex={0}
      onKeyDown={(e) => { if (e.key === "Enter") setSelectedSop(sop); }}
    >
      <div aria-hidden="true" style={{
        position: "absolute", inset: 0, pointerEvents: "none",
        background: accent === "green"
          ? "radial-gradient(260px 180px at 0% 0%,rgba(34,197,94,0.12),transparent 60%),radial-gradient(220px 150px at 100% 100%,rgba(20,184,166,0.10),transparent 55%)"
          : accent === "purple"
          ? "radial-gradient(260px 180px at 0% 0%,rgba(124,58,237,0.10),transparent 60%),radial-gradient(220px 150px at 100% 100%,rgba(168,85,247,0.08),transparent 55%)"
          : "radial-gradient(260px 180px at 0% 0%,rgba(34,211,238,0.12),transparent 60%),radial-gradient(220px 150px at 100% 100%,rgba(34,197,94,0.10),transparent 55%)",
        opacity: isHover ? 1 : 0.7, transition: "opacity .18s ease",
      }} />

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "10px", position: "relative" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <div style={{
            width: "42px", height: "42px", borderRadius: "12px", flexShrink: 0,
            background: iconBg, border: iconBorder,
            display: "flex", alignItems: "center", justifyContent: "center", color: iconColor,
          }}>
            <IconDoc />
          </div>
          <div>
            <div style={{ fontSize: "11px", fontWeight: 900, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.10em" }}>{sop.number}</div>
            <div style={{ fontSize: "15px", fontWeight: 950, color: "#071b2d", lineHeight: 1.25 }}>
              {isAr ? (sop.titleAr || sop.title) : sop.title}
            </div>
          </div>
        </div>
        <span style={{
          fontSize: "10px", fontWeight: 900, padding: "4px 10px", borderRadius: "999px",
          whiteSpace: "nowrap", flexShrink: 0,
          background: catColor.bg, border: `1px solid ${catColor.border}`, color: catColor.text,
        }}>
          {isAr ? (sop.categoryAr || sop.category) : sop.category}
        </span>
      </div>

      <div style={{
        display: "inline-flex",
        alignItems: "center",
        padding: "4px 9px",
        borderRadius: 999,
        background: reviewStyle.bg,
        color: reviewStyle.color,
        border: `1px solid ${reviewStyle.border}`,
        fontSize: 10,
        fontWeight: 950,
        marginBottom: 10,
        position: "relative",
      }}>
        {review.label}
      </div>

      <div style={{ fontSize: "12px", color: "#475569", lineHeight: 1.5, marginBottom: "12px", position: "relative" }}>
        {isAr ? (sop.subtitleAr || sop.subtitle) : sop.subtitle}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px 10px", position: "relative" }}>
        {[
          { label: t.docNo,      value: sop.docNo },
          { label: t.facility,   value: isAr ? (sop.facilityAr || sop.facility) : sop.facility },
          { label: t.preparedBy, value: sop.preparedBy },
          { label: t.issueDate,  value: sop.issueDate },
          { label: t.revision,   value: sop.revision },
        ].map((m) => (
          <div key={m.label} style={{
            padding: "6px 10px", borderRadius: "10px",
            background: "rgba(241,245,249,0.80)", border: "1px solid rgba(15,23,42,0.07)",
          }}>
            <div style={{ fontSize: "10px", fontWeight: 800, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.08em" }}>{m.label}</div>
            <div style={{ fontSize: "12px", fontWeight: 900, color: "#1e293b", marginTop: "2px" }}>{m.value}</div>
          </div>
        ))}
      </div>

      <div style={{
        marginTop: "12px", fontSize: "11px", fontWeight: 900, color: hintColor,
        textTransform: "uppercase", letterSpacing: "0.10em",
        display: "flex", alignItems: "center", gap: "4px", position: "relative",
        opacity: isHover ? 1 : 0.45, transition: "opacity .18s ease",
      }}>
        <span>{t.viewFullDetails}</span>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
          style={{ transform: isAr ? "scaleX(-1)" : "none" }}>
          <path d="M5 12h14M12 5l7 7-7 7" />
        </svg>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function SopSsopPage() {
  const navigate = useNavigate();
  const [lang, setLang] = useState("en");
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState("All");
  const [hoverId, setHoverId] = useState(null);
  const [selectedSop, setSelectedSop] = useState(null);
  const [docMeta, setDocMeta] = useState({});

  const t = UI[lang];
  const isAr = lang === "ar";

  const refreshDocMeta = useCallback(async () => {
    const records = await fetchReportsByType(TYPE_DOC_META);
    const map = {};
    records.forEach((r) => {
      if (r?.payload?.docNo) map[r.payload.docNo] = r.payload;
    });
    setDocMeta(map);
  }, []);

  useEffect(() => {
    refreshDocMeta();
  }, [refreshDocMeta]);

  const filtered = useMemo(() => {
    return sopsData.filter((s) => {
      const matchCat = activeCategory === "All" || s.category === activeCategory;
      const q = search.toLowerCase();
      const matchSearch =
        !q ||
        s.title.toLowerCase().includes(q) ||
        s.titleAr?.toLowerCase().includes(q) ||
        s.number.toLowerCase().includes(q) ||
        s.docNo.toLowerCase().includes(q) ||
        s.facility.toLowerCase().includes(q) ||
        s.category.toLowerCase().includes(q);
      return matchCat && matchSearch;
    });
  }, [search, activeCategory]);

  return (
    <main style={{
      minHeight: "100vh", padding: "28px 18px",
      background:
        "radial-gradient(circle at 12% 10%, rgba(34,211,238,0.22) 0, rgba(255,255,255,1) 42%)," +
        "radial-gradient(circle at 88% 12%, rgba(34,197,94,0.16) 0, rgba(255,255,255,0) 55%)," +
        "radial-gradient(circle at 50% 100%, rgba(59,130,246,0.16) 0, rgba(255,255,255,0) 58%)",
      fontFamily: 'system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif',
      color: "#071b2d", direction: t.dir,
    }}>
      {selectedSop && <SopModal sop={selectedSop} onClose={() => setSelectedSop(null)} lang={lang} navigate={navigate} onAuditChanged={refreshDocMeta} />}

      <div style={{ maxWidth: "1200px", margin: "0 auto" }}>
        {/* Top Bar */}
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          gap: "14px", padding: "14px 16px", borderRadius: "18px",
          background: "rgba(255,255,255,0.84)", border: "1px solid rgba(15,23,42,0.18)",
          boxShadow: "0 14px 40px rgba(2,132,199,0.12)", backdropFilter: "blur(12px)",
          marginBottom: "18px", flexWrap: "wrap", position: "relative", overflow: "hidden",
        }}>
          <div aria-hidden="true" style={{
            position: "absolute", inset: 0, pointerEvents: "none",
            background:
              "radial-gradient(800px 220px at 15% 0%,rgba(34,211,238,0.18),transparent 60%)," +
              "radial-gradient(800px 220px at 85% 10%,rgba(34,197,94,0.14),transparent 60%)",
            opacity: 0.9,
          }} />

          {/* Brand */}
          <div style={{ display: "flex", alignItems: "center", gap: "12px", minWidth: 0, position: "relative" }}>
            <img src={mawashiLogo} alt="Al Mawashi Logo" style={{
              width: "46px", height: "46px", borderRadius: "12px", objectFit: "cover",
              border: "1px solid rgba(2,132,199,0.18)", background: "#fff",
            }} />
            <div>
              <div style={{ fontSize: "14px", fontWeight: 950, lineHeight: 1.2 }}>TRANS EMIRATES LIVESTOCK TRADING L.L.C.</div>
              <div style={{ fontSize: "12px", fontWeight: 750, opacity: 0.78, marginTop: "4px" }}>AL MAWASHI — Food Safety System</div>
            </div>
          </div>

          {/* Right controls */}
          <div style={{ display: "flex", gap: "10px", alignItems: "center", position: "relative" }}>
            {/* Lang toggle */}
            <div style={{
              display: "flex", borderRadius: "999px", overflow: "hidden",
              border: "1px solid rgba(34,211,238,0.40)",
            }}>
              {["en", "ar"].map((l) => (
                <button key={l} onClick={() => setLang(l)} style={{
                  padding: "7px 16px", fontSize: "13px", fontWeight: 900, cursor: "pointer",
                  background: lang === l
                    ? "linear-gradient(135deg,rgba(34,211,238,0.30),rgba(34,197,94,0.20))"
                    : "rgba(255,255,255,0.70)",
                  border: "none", color: lang === l ? "#052336" : "#64748b",
                  transition: "all .15s ease",
                }}>
                  {l === "en" ? "EN" : "العربية"}
                </button>
              ))}
            </div>

            <button style={{
              display: "inline-flex", alignItems: "center", gap: "6px",
              padding: "8px 14px", borderRadius: "999px", fontSize: "13px", fontWeight: 800,
              color: "#0369a1", background: "rgba(34,211,238,0.10)",
              border: "1px solid rgba(34,211,238,0.30)", cursor: "pointer",
            }} onClick={() => navigate("/haccp-iso")}>
              <IconBack rtl={isAr} /> {t.backToHub}
            </button>

            <div style={{
              display: "inline-flex", alignItems: "center", gap: "8px",
              padding: "9px 12px", borderRadius: "999px", fontSize: "12px", fontWeight: 900,
              color: "#052336",
              background: "linear-gradient(135deg,rgba(34,211,238,0.20),rgba(34,197,94,0.14))",
              border: "1px solid rgba(34,211,238,0.38)",
            }}>
              {t.badgeLabel}
            </div>
          </div>
        </div>

        {/* Page Header */}
        <header style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", gap: "16px", margin: "14px 0 18px", flexWrap: "wrap" }}>
          <div>
            <div style={{ fontSize: "26px", fontWeight: 980, letterSpacing: "0.02em" }}>{t.pageTitle}</div>
            <div style={{ fontSize: "13px", fontWeight: 750, opacity: 0.82, marginTop: "6px" }}>{t.pageSubtitle}</div>
            <HaccpLinkBadge clauses={["7.5", "8.2"]} label="Documented Information + PRPs" />
          </div>
          <p style={{ fontSize: "13px", fontWeight: 750, color: "#334155", maxWidth: "400px", margin: 0 }}>{t.tagline}</p>
        </header>

        {/* Stats */}
        <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", marginBottom: "18px" }}>
          {[
            { label: t.totalSOPs, value: sopsData.length, color: "#0369a1" },
            { label: t.ssopCount, value: ssopsData.length, color: "#0e7490" },
            { label: t.showing,   value: filtered.length,  color: "#15803d" },
            { label: t.policyCount, value: policiesData.length, color: "#4c1d95" },
          ].map((s) => (
            <div key={s.label} style={{
              padding: "10px 16px", borderRadius: "14px",
              background: "rgba(255,255,255,0.88)", border: "1px solid rgba(15,23,42,0.12)",
              boxShadow: "0 6px 18px rgba(2,132,199,0.08)",
            }}>
              <div style={{ fontSize: "22px", fontWeight: 980, color: s.color }}>{s.value}</div>
              <div style={{ fontSize: "11px", fontWeight: 800, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.08em" }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Toolbar */}
        <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", marginBottom: "16px", alignItems: "center" }}>
          <div style={{
            display: "flex", alignItems: "center", gap: "8px", padding: "9px 14px", borderRadius: "12px",
            background: "rgba(255,255,255,0.92)", border: "1px solid rgba(15,23,42,0.16)",
            boxShadow: "0 4px 12px rgba(2,132,199,0.06)", flex: "1", minWidth: "220px", maxWidth: "340px",
          }}>
            <IconSearch />
            <input
              style={{ border: "none", outline: "none", background: "transparent", fontSize: "14px", fontWeight: 700, color: "#071b2d", flex: 1 }}
              placeholder={t.searchPlaceholder}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          {allCategories.map((cat) => {
            const active = activeCategory === cat;
            const label = cat === "All" ? t.filterAll : (isAr ? (sopsData.find(s => s.category === cat)?.categoryAr || cat) : cat);
            return (
              <button key={cat}
                style={{
                  padding: "8px 14px", borderRadius: "999px", fontSize: "12px", fontWeight: 900,
                  cursor: "pointer", transition: "all .15s ease",
                  background: active ? "linear-gradient(135deg,rgba(34,211,238,0.25),rgba(34,197,94,0.18))" : "rgba(255,255,255,0.80)",
                  border: active ? "1px solid rgba(34,211,238,0.55)" : "1px solid rgba(15,23,42,0.14)",
                  color: active ? "#052336" : "#334155",
                  boxShadow: active ? "0 6px 16px rgba(34,211,238,0.16)" : "none",
                }}
                onClick={() => setActiveCategory(cat)}
              >
                {label}
              </button>
            );
          })}
        </div>

        {/* ── SOP Grid ── */}
        <section aria-label="SOP documents">
          {/* Section header */}
          <div style={{
            display: "flex", alignItems: "center", gap: "12px",
            margin: "8px 0 14px", paddingBottom: "10px",
            borderBottom: "2px solid rgba(34,211,238,0.30)",
          }}>
            <div style={{
              padding: "5px 16px", borderRadius: "999px", fontSize: "13px", fontWeight: 900,
              background: "linear-gradient(135deg,rgba(34,211,238,0.22),rgba(34,197,94,0.15))",
              border: "1px solid rgba(34,211,238,0.45)", color: "#052336",
            }}>
              SOP
            </div>
            <div style={{ fontSize: "16px", fontWeight: 900, color: "#0369a1" }}>
              {t.sopSectionTitle}
            </div>
            <div style={{ fontSize: "12px", color: "#64748b", fontWeight: 800 }}>
              ({filtered.length} / {sopsData.length})
            </div>
          </div>

          {filtered.length === 0 ? (
            <div style={{ textAlign: "center", padding: "40px 0", color: "#64748b", fontWeight: 800 }}>{t.noMatch}</div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: "14px", marginBottom: "36px" }}>
              {filtered.map((sop) => <SopCard key={sop.id} sop={sop} isAr={isAr} t={t} hoverId={hoverId} setHoverId={setHoverId} setSelectedSop={setSelectedSop} meta={docMeta[sop.docNo]} />)}
            </div>
          )}
        </section>

        {/* ── sSOP Grid ── */}
        <section aria-label="sSOP documents">
          <div style={{
            display: "flex", alignItems: "center", gap: "12px",
            margin: "8px 0 14px", paddingBottom: "10px",
            borderBottom: "2px solid rgba(34,197,94,0.30)",
          }}>
            <div style={{
              padding: "5px 16px", borderRadius: "999px", fontSize: "13px", fontWeight: 900,
              background: "linear-gradient(135deg,rgba(34,197,94,0.22),rgba(20,184,166,0.15))",
              border: "1px solid rgba(34,197,94,0.45)", color: "#052336",
            }}>
              sSOP
            </div>
            <div style={{ fontSize: "16px", fontWeight: 900, color: "#15803d" }}>
              {t.ssopSectionTitle}
            </div>
            <div style={{ fontSize: "12px", color: "#64748b", fontWeight: 800 }}>
              ({ssopsData.length})
            </div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: "14px", marginBottom: "12px" }}>
            {ssopsData.map((sop) => <SopCard key={sop.id} sop={sop} isAr={isAr} t={t} hoverId={hoverId} setHoverId={setHoverId} setSelectedSop={setSelectedSop} accent="green" meta={docMeta[sop.docNo]} />)}
          </div>
        </section>

        {/* ── Policy Grid ── */}
        <section aria-label="Policy documents">
          <div style={{
            display: "flex", alignItems: "center", gap: "12px",
            margin: "8px 0 14px", paddingBottom: "10px",
            borderBottom: "2px solid rgba(124,58,237,0.30)",
          }}>
            <div style={{
              padding: "5px 16px", borderRadius: "999px", fontSize: "13px", fontWeight: 900,
              background: "linear-gradient(135deg,rgba(124,58,237,0.18),rgba(168,85,247,0.12))",
              border: "1px solid rgba(124,58,237,0.45)", color: "#4c1d95",
            }}>
              Policy
            </div>
            <div style={{ fontSize: "16px", fontWeight: 900, color: "#4c1d95" }}>
              {t.policySectionTitle}
            </div>
            <div style={{ fontSize: "12px", color: "#64748b", fontWeight: 800 }}>
              ({policiesData.length})
            </div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: "14px", marginBottom: "12px" }}>
            {policiesData.map((sop) => <SopCard key={sop.id} sop={sop} isAr={isAr} t={t} hoverId={hoverId} setHoverId={setHoverId} setSelectedSop={setSelectedSop} accent="purple" meta={docMeta[sop.docNo]} />)}
          </div>
        </section>

        <div style={{ marginTop: 24, fontSize: 12, color: "#64748b", fontWeight: 800, textAlign: "center", opacity: 0.95 }}>
          {t.footer}
        </div>
      </div>
    </main>
  );
}
