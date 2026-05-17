// src/pages/haccp and iso/CustomerComplaints/CustomerComplaintModals.jsx
// Popup modals for the Customer Complaints view:
//  - ImagePreviewModal  : full-screen attachment image preview
//  - ComplaintReportModal: full complaint report (all details, printable)
// Split out of CustomerComplaintView.jsx to keep that file maintainable.

import React, { useEffect, useState } from "react";
import { SEVERITY_COLOR, STATUS_COLOR, TYPE_LABELS, daysBetween } from "./customerComplaintShared";

/* ─────────────────────────────────────────────────────────────
   Full-screen image preview modal
   - Click image (or "1:1" button) toggles between fit-screen and actual-size
   - ESC closes
   - Locks body scroll while open
   ───────────────────────────────────────────────────────────── */
export function ImagePreviewModal({ src, onClose, S }) {
  const [actualSize, setActualSize] = useState(false);

  useEffect(() => {
    const onKey = (e) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose]);

  return (
    <div style={S.modalBackdrop} onClick={onClose} role="dialog" aria-modal="true">
      <div style={S.modalHeader} onClick={(e) => e.stopPropagation()}>
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); setActualSize((v) => !v); }}
          style={S.modalBtn}
          title={actualSize ? "Fit screen" : "Actual size"}
        >
          {actualSize ? "🔽 Fit" : "🔍 1:1"}
        </button>
        <button
          type="button"
          aria-label="Close"
          style={S.modalClose}
          onClick={(e) => { e.stopPropagation(); onClose(); }}
        >×</button>
      </div>
      <div
        style={{ ...S.modalBody, overflow: actualSize ? "auto" : "hidden" }}
        onClick={(e) => e.stopPropagation()}
      >
        <img
          src={src}
          alt="preview"
          style={actualSize ? S.modalImgActual : S.modalImgFit}
          onClick={() => setActualSize((v) => !v)}
        />
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   Full complaint report — popup modal (all details, printable)
   ───────────────────────────────────────────────────────────── */
const RS = {
  backdrop: {
    position: "fixed", inset: 0, background: "rgba(15,23,42,0.6)",
    zIndex: 9000, display: "flex", alignItems: "flex-start",
    justifyContent: "center", padding: "24px 14px", overflowY: "auto",
  },
  sheet: {
    background: "#fff", width: "100%", maxWidth: 920, borderRadius: 16,
    border: "1px solid #fed7aa", boxShadow: "0 24px 60px rgba(0,0,0,0.35)",
    display: "flex", flexDirection: "column", maxHeight: "92vh", overflow: "hidden",
  },
  head: {
    display: "flex", justifyContent: "space-between", alignItems: "flex-start",
    gap: 12, padding: "16px 18px", borderBottom: "2px solid #fed7aa",
    background: "linear-gradient(180deg,#fff7ed,#fff)", flexWrap: "wrap",
  },
  title: { fontSize: 18, fontWeight: 950, color: "#9a3412" },
  body: { padding: "8px 18px 18px", overflowY: "auto" },
  sectionTitle: {
    fontSize: 14, fontWeight: 950, color: "#9a3412",
    margin: "16px 0 8px", borderBottom: "2px solid #f97316", paddingBottom: 4,
  },
  grid: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "2px 18px" },
  row: { display: "flex", gap: 8, padding: "6px 0", borderBottom: "1px dashed #f1e3d3", fontSize: 13 },
  rowLabel: { fontWeight: 900, color: "#9a3412", minWidth: 130 },
  rowVal: { color: "#1e293b", fontWeight: 600, wordBreak: "break-word", flex: 1 },
  block: { marginBottom: 10 },
  blockLabel: { fontSize: 12, fontWeight: 900, color: "#9a3412", marginBottom: 4 },
  blockText: {
    fontSize: 13, color: "#1e293b", whiteSpace: "pre-wrap", lineHeight: 1.6,
    background: "#fffdf8", border: "1px solid #fde7cf", borderRadius: 8, padding: "8px 10px",
  },
};

function RRow({ label, children }) {
  return (
    <div style={RS.row}>
      <div style={RS.rowLabel}>{label}</div>
      <div style={RS.rowVal}>{children}</div>
    </div>
  );
}

function RBlock({ label, text }) {
  return (
    <div style={RS.block}>
      <div style={RS.blockLabel}>{label}</div>
      <div style={RS.blockText}>{text == null || text === "" ? "—" : text}</div>
    </div>
  );
}

export function ComplaintReportModal({ rec, onClose, onPreview, isAr, S }) {
  const p = rec?.payload || {};
  const images = Array.isArray(p.images) ? p.images : [];
  const pdfs = Array.isArray(p.pdfs) ? p.pdfs : [];
  const resolutionDays = p.status === "Closed" ? daysBetween(p.complaintDate, p.closureDate) : null;
  const sevColor = SEVERITY_COLOR[p.severity] || SEVERITY_COLOR.Low;
  const stColor = STATUS_COLOR[p.status] || STATUS_COLOR.Open;

  useEffect(() => {
    const onKey = (e) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose]);

  const L = (ar, en) => (isAr ? ar : en);
  const val = (v) => (v == null || v === "" ? "—" : v);

  return (
    <div style={RS.backdrop} onClick={onClose} role="dialog" aria-modal="true">
      <div className="cc-report-print" style={RS.sheet} onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div style={RS.head}>
          <div style={{ minWidth: 0 }}>
            <div style={RS.title}>{p.complaintNumber || "CC"} — {p.complaintDate || "—"}</div>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 6 }}>
              <span style={S.badge({ bg: "#fff7ed", color: "#9a3412", border: "#fed7aa" })}>
                {TYPE_LABELS[p.type] || p.type || "—"}
              </span>
              <span style={S.badge(sevColor)}>{p.severity || "—"}</span>
              <span style={S.badge(stColor)}>{p.status || "Open"}</span>
            </div>
          </div>
          <div className="cc-report-noprint" style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button type="button" style={S.btn("ghost")} onClick={() => window.print()}>
              🖨 {L("طباعة", "Print")}
            </button>
            <button type="button" style={S.btn("danger")} onClick={onClose}>
              ✕ {L("إغلاق", "Close")}
            </button>
          </div>
        </div>

        {/* Body */}
        <div style={RS.body}>
          <div style={RS.sectionTitle}>{L("بيانات الشكوى", "Complaint Details")}</div>
          <div style={RS.grid}>
            <RRow label={L("رقم الشكوى", "Complaint No.")}>{val(p.complaintNumber)}</RRow>
            <RRow label={L("التاريخ", "Date")}>{val(p.complaintDate)}</RRow>
            <RRow label={L("مقدّم الشكوى", "Complainant")}>{val(p.complainant)}</RRow>
            <RRow label={L("القناة", "Channel")}>{val(p.channel)}</RRow>
            <RRow label={L("المنتج", "Product")}>{val(p.product)}</RRow>
            <RRow label={L("الدفعة", "Batch")}>{val(p.batch)}</RRow>
            <RRow label={L("النوع", "Type")}>{TYPE_LABELS[p.type] || p.type || "—"}</RRow>
            <RRow label={L("الخطورة", "Severity")}>{val(p.severity)}</RRow>
            <RRow label={L("الحالة", "Status")}>{val(p.status)}</RRow>
            <RRow label={L("رضا العميل", "Customer Satisfied")}>
              {p.customerSatisfied === "Yes" ? L("نعم", "Yes")
                : p.customerSatisfied === "No" ? L("لا", "No")
                : L("قيد الانتظار", "Pending")}
            </RRow>
          </div>

          <div style={RS.sectionTitle}>{L("الوصف والتحليل", "Description & Analysis")}</div>
          <RBlock label={L("وصف الشكوى", "Complaint Description")} text={p.description} />
          <RBlock label={L("التحقيق", "Investigation")} text={p.investigation} />
          <RBlock label={L("السبب الجذري", "Root Cause")} text={p.rootCause} />
          <RBlock label={L("الإجراء التصحيحي (CAPA)", "Corrective Action (CAPA)")} text={p.capa} />

          <div style={RS.sectionTitle}>
            ✅ {L("التحقق من فعالية الإجراء التصحيحي", "CAPA Effectiveness Verification")}
          </div>
          <div style={RS.grid}>
            <RRow label={L("النتيجة", "Verdict")}>
              <span style={S.badge(
                p.effectivenessVerified === "Yes" ? { bg: "#dcfce7", color: "#166534" }
                : p.effectivenessVerified === "No" ? { bg: "#fecaca", color: "#991b1b" }
                : { bg: "#fef9c3", color: "#854d0e" }
              )}>
                {p.effectivenessVerified === "Yes" ? L("فعّال", "Effective")
                  : p.effectivenessVerified === "No" ? L("غير فعّال — تكررت المشكلة", "Not effective — recurred")
                  : L("قيد المراجعة", "Pending")}
              </span>
            </RRow>
            <RRow label={L("تاريخ التحقق", "Verified Date")}>{val(p.effectivenessVerifiedDate)}</RRow>
            <RRow label={L("تم التحقق بواسطة", "Verified By")}>{val(p.effectivenessVerifiedBy)}</RRow>
          </div>
          <RBlock label={L("ملاحظات الفعالية", "Effectiveness Notes")} text={p.effectivenessNotes} />

          <div style={RS.sectionTitle}>{L("الإغلاق", "Closure")}</div>
          <div style={RS.grid}>
            <RRow label={L("تاريخ الإغلاق", "Closure Date")}>{val(p.closureDate)}</RRow>
            <RRow label={L("أُغلقت بواسطة", "Closed By")}>{val(p.closedBy)}</RRow>
            <RRow label={L("زمن الإغلاق", "Resolution")}>
              {resolutionDays != null ? `${resolutionDays} ${L("يوم", "days")}` : "—"}
            </RRow>
          </div>

          <div style={RS.sectionTitle}>📎 {L("المرفقات", "Attachments")}</div>
          {pdfs.length === 0 && images.length === 0 && (
            <div style={{ color: "#94a3b8", fontWeight: 700, fontSize: 13 }}>—</div>
          )}
          {pdfs.length > 0 && (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 10 }}>
              {pdfs.map((pdf, i) => (
                <a
                  key={`${pdf.name}_${i}`}
                  href={pdf.url || pdf.dataUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={S.pdfTile}
                  title={pdf.name}
                >
                  <span style={{ fontSize: 18 }}>📄</span>
                  <span style={{ maxWidth: 180, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{pdf.name}</span>
                </a>
              ))}
            </div>
          )}
          {images.length > 0 && (
            <div style={S.attachGrid}>
              {images.map((img, i) => (
                <button
                  key={`${img.name}_${i}`}
                  type="button"
                  style={S.thumb}
                  onClick={() => onPreview(img.url || img.dataUrl)}
                  title={img.name}
                >
                  <img src={img.url || img.dataUrl} alt={img.name} style={S.thumbImg} />
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
