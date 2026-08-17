// src/pages/hse/HSESOPs.jsx
// HSE Standard Operating Procedures — glassy card + full-screen modal design
// mirrored from the HACCP/ISO SOP page. Modal shows the written procedure only,
// with a controlled multi-page PDF export and browser print.

import React, { useState, useMemo, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import mawashiLogo from "../../assets/almawashi-logo.jpg";
import { hseSops, hseSopGroups, SOP_GROUP_META, groupColors } from "./hseSopData";
import { useHSELang } from "./hseShared";

// ── date helpers ──────────────────────────────────────────────────────────────
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
function reviewInfoFor(sop, isAr) {
  const nextReview = addYearsISO(sop.issueDate, 1);
  const diff = daysTo(nextReview);
  if (diff == null) return { nextReview, status: "active", label: isAr ? "تاريخ المراجعة غير محدد" : "Review date not set" };
  if (diff < 0) return { nextReview, status: "overdue", label: isAr ? `متأخرة ${Math.abs(diff)} يوم` : `Overdue ${Math.abs(diff)} days` };
  if (diff <= 30) return { nextReview, status: "due", label: isAr ? `تستحق خلال ${diff} يوم` : `Due in ${diff} days` };
  return { nextReview, status: "active", label: isAr ? `المراجعة ${nextReview}` : `Review ${nextReview}` };
}

// ── UI text ───────────────────────────────────────────────────────────────────
const UI = {
  en: {
    dir: "ltr",
    brandTop: "TRANS EMIRATES LIVESTOCK TRADING L.L.C.",
    brandSub: "AL MAWASHI — HSE Management System",
    badge: "📘 HSE SOPs",
    back: "Back to HSE",
    pageTitle: "HSE Standard Operating Procedures",
    pageSubtitle: "Food Safety, Occupational Safety, Emergency, Environment & Administration · click any card for full details",
    tagline: "Al Mawashi HSE System · ISO 22000 / ISO 45001 / ISO 14001 aligned",
    totalSOPs: "Total SOPs",
    groups: "Groups",
    showing: "Showing",
    search: "Search SOPs…",
    filterAll: "All",
    noMatch: "No SOPs match your search.",
    viewFullDetails: "View Full Details",
    docNo: "Doc No.", facility: "Facility", preparedBy: "Prepared by", issueDate: "Issue Date", revision: "Revision",
    close: "Close",
    controlledPdf: "Controlled PDF",
    printDoc: "Print",
    exporting: "Exporting…",
    footer: "© Al Mawashi — HSE Management System · Controlled SOP set",
  },
  ar: {
    dir: "rtl",
    brandTop: "ترانس إميرتس لتجارة المواشي ذ.م.م",
    brandSub: "المواشي — نظام إدارة الصحة والسلامة والبيئة (HSE)",
    badge: "📘 إجراءات HSE",
    back: "العودة إلى HSE",
    pageTitle: "الإجراءات التشغيلية القياسية لـ HSE",
    pageSubtitle: "سلامة الغذاء والسلامة المهنية والطوارئ والبيئة والإدارة · اضغط أي بطاقة لعرض التفاصيل الكاملة",
    tagline: "نظام HSE للمواشي · متوافق مع ISO 22000 / ISO 45001 / ISO 14001",
    totalSOPs: "إجمالي الإجراءات",
    groups: "المجموعات",
    showing: "المعروض",
    search: "ابحث في الإجراءات…",
    filterAll: "الكل",
    noMatch: "لا توجد إجراءات تطابق بحثك.",
    viewFullDetails: "عرض التفاصيل الكاملة",
    docNo: "رقم الوثيقة", facility: "المنشأة", preparedBy: "أعدّه", issueDate: "تاريخ الإصدار", revision: "المراجعة",
    close: "إغلاق",
    controlledPdf: "PDF محكوم",
    printDoc: "طباعة",
    exporting: "جارٍ التصدير…",
    footer: "© المواشي — نظام إدارة HSE · مجموعة إجراءات محكومة",
  },
};

// ── icons ─────────────────────────────────────────────────────────────────────
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

// ── Modal (written procedure only) ───────────────────────────────────────────
function SopModal({ sop, onClose, lang }) {
  const t = UI[lang];
  const isAr = lang === "ar";
  const gc = groupColors[sop.group] || groupColors.fs;
  const accent = SOP_GROUP_META[sop.group]?.color || "#0369a1";
  const [exporting, setExporting] = useState(false);
  const bodyRef = useRef(null);
  const printRef = useRef(null);

  useEffect(() => {
    const h = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", h);
    document.body.style.overflow = "hidden";
    return () => { window.removeEventListener("keydown", h); document.body.style.overflow = ""; };
  }, [onClose]);

  // Controlled multi-page PDF: capture the off-screen document node (company
  // header + doc-control table + title + all sections), then slice across A4 pages.
  async function exportPdf() {
    setExporting(true);
    try {
      const node = printRef.current;
      if (!node) throw new Error("PDF content not ready.");
      const canvas = await html2canvas(node, { scale: 2, backgroundColor: "#ffffff", useCORS: true });
      const pdf = new jsPDF("p", "pt", "a4");
      const margin = 26;
      const pageW = pdf.internal.pageSize.getWidth();
      const pageH = pdf.internal.pageSize.getHeight();
      const imgW = pageW - margin * 2;
      const ratio = imgW / canvas.width;
      const sliceH = Math.floor((pageH - margin * 2) / ratio);
      let y = 0, first = true;
      while (y < canvas.height) {
        const h = Math.min(sliceH, canvas.height - y);
        const slice = document.createElement("canvas");
        slice.width = canvas.width; slice.height = h;
        const ctx = slice.getContext("2d");
        ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, slice.width, slice.height);
        ctx.drawImage(canvas, 0, y, canvas.width, h, 0, 0, canvas.width, h);
        if (!first) pdf.addPage("a4", "p");
        pdf.addImage(slice.toDataURL("image/jpeg", 0.96), "JPEG", margin, margin, imgW, h * ratio);
        first = false; y += h;
      }
      pdf.save(`${sop.docNo.replace(/[^\w-]+/g, "_")}_Rev_${sop.revision}.pdf`);
    } catch (e) {
      alert("PDF export error: " + (e?.message || e));
    } finally {
      setExporting(false);
    }
  }

  const metaFields = [
    { label: t.docNo, value: sop.docNo },
    { label: t.facility, value: isAr ? sop.facilityAr : sop.facility },
    { label: t.preparedBy, value: sop.preparedBy },
    { label: t.issueDate, value: sop.issueDate },
    { label: t.revision, value: sop.revision },
  ];

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 1000, background: "rgba(7,27,45,0.55)", backdropFilter: "blur(6px)", display: "flex" }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={{ width: "100%", height: "100%", background: "#fff", display: "flex", flexDirection: "column", overflow: "hidden", direction: t.dir }}>
        {/* Header */}
        <div style={{ padding: "20px 40px 16px", background: `linear-gradient(135deg, ${gc.bg}, rgba(255,255,255,0.4))`, borderBottom: "1px solid rgba(15,23,42,0.08)", flexShrink: 0 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12, minWidth: 0 }}>
              <div style={{ width: 46, height: 46, borderRadius: 12, flexShrink: 0, background: gc.bg, border: `1px solid ${gc.border}`, display: "flex", alignItems: "center", justifyContent: "center", color: gc.text }}>
                <IconDoc />
              </div>
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                  <span style={{ fontSize: 12, fontWeight: 900, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.10em" }}>{sop.code}</span>
                  <span style={{ fontSize: 10, fontWeight: 900, padding: "3px 10px", borderRadius: 999, background: gc.bg, border: `1px solid ${gc.border}`, color: gc.text }}>
                    {isAr ? sop.categoryAr : sop.category}
                  </span>
                </div>
                <div style={{ fontSize: 22, fontWeight: 980, color: "#071b2d", lineHeight: 1.25, marginTop: 4 }}>{isAr ? sop.titleAr : sop.title}</div>
                <div style={{ fontSize: 13, color: "#475569", marginTop: 3 }}>{isAr ? sop.subtitleAr : sop.subtitle}</div>
              </div>
            </div>
            <button onClick={onClose} style={{ flexShrink: 0, width: 36, height: 36, borderRadius: 10, background: "rgba(15,23,42,0.06)", border: "1px solid rgba(15,23,42,0.12)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "#334155" }} title="Close">
              <IconClose />
            </button>
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 14 }}>
            {metaFields.map((m) => (
              <div key={m.label} style={{ padding: "5px 12px", borderRadius: 10, background: "rgba(241,245,249,0.90)", border: "1px solid rgba(15,23,42,0.08)", display: "flex", gap: 6, alignItems: "baseline" }}>
                <span style={{ fontSize: 10, fontWeight: 800, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.07em" }}>{m.label}</span>
                <span style={{ fontSize: 12, fontWeight: 900, color: "#1e293b" }}>{m.value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Body — written procedure sections only */}
        <div ref={bodyRef} style={{ overflowY: "auto", padding: "28px 40px 40px", flex: 1, maxWidth: 1100, width: "100%", alignSelf: "center", boxSizing: "border-box" }}>
          {sop.sections.map((sec, i) => (
            <div key={i} style={{ marginBottom: 24 }}>
              <div style={{ fontSize: 22, fontWeight: 950, color: accent, marginBottom: 10, paddingBottom: 8, borderBottom: `1px solid ${gc.border}`, display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ width: 8, height: 8, borderRadius: "50%", background: accent, display: "inline-block", flexShrink: 0 }} />
                {isAr ? (sec.headingAr || sec.heading) : sec.heading}
              </div>
              <div style={{ fontSize: 17, color: "#1e293b", lineHeight: 1.8, whiteSpace: "pre-line", paddingInlineStart: 18 }}>
                {isAr ? (sec.contentAr || sec.content) : sec.content}
              </div>
            </div>
          ))}
        </div>

        {/* Off-screen controlled document used for PDF export (company header + doc control + sections) */}
        <div aria-hidden="true" style={{ position: "fixed", left: -12000, top: 0, pointerEvents: "none" }}>
          <div ref={printRef} style={{ width: 780, background: "#fff", padding: 34, boxSizing: "border-box", direction: t.dir, fontFamily: 'Cairo, system-ui, -apple-system, "Segoe UI", sans-serif', color: "#0f172a" }}>
            {/* Company header */}
            <div style={{ display: "flex", alignItems: "center", gap: 14, borderBottom: `3px solid ${accent}`, paddingBottom: 12, marginBottom: 12 }}>
              <img src={mawashiLogo} alt="Al Mawashi" crossOrigin="anonymous" style={{ width: 62, height: 62, objectFit: "cover", borderRadius: 8, flexShrink: 0 }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 16, fontWeight: 950, lineHeight: 1.25 }}>{t.brandTop}</div>
                <div style={{ fontSize: 12, color: "#475569", marginTop: 2 }}>{t.brandSub}</div>
              </div>
              <div style={{ textAlign: isAr ? "left" : "right", flexShrink: 0 }}>
                <div style={{ fontSize: 15, fontWeight: 950, color: accent }}>{sop.code}</div>
                <div style={{ fontSize: 11, color: "#475569", marginTop: 2 }}>{sop.docNo}</div>
              </div>
            </div>

            {/* Title band */}
            <div style={{ background: gc.bg, border: `1px solid ${gc.border}`, borderRadius: 8, padding: "12px 14px", marginBottom: 12 }}>
              <div style={{ fontSize: 11, fontWeight: 900, color: gc.text, textTransform: "uppercase", letterSpacing: "0.08em" }}>{isAr ? sop.categoryAr : sop.category}</div>
              <div style={{ fontSize: 21, fontWeight: 950, color: "#0f172a", marginTop: 3 }}>{isAr ? sop.titleAr : sop.title}</div>
              <div style={{ fontSize: 12.5, color: "#475569", marginTop: 3 }}>{isAr ? sop.subtitleAr : sop.subtitle}</div>
            </div>

            {/* Document control */}
            <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: 18, fontSize: 12 }}>
              <tbody>
                {[
                  [t.docNo, sop.docNo, t.revision, sop.revision],
                  [t.facility, isAr ? sop.facilityAr : sop.facility, t.issueDate, sop.issueDate],
                  [t.preparedBy, sop.preparedBy, isAr ? "المراجعة القادمة" : "Next Review", addYearsISO(sop.issueDate, 1)],
                ].map((row, i) => (
                  <tr key={i}>
                    <td style={{ border: "1px solid #cbd5e1", padding: "7px 10px", background: "#f1f5f9", fontWeight: 900, color: "#475569", width: "18%" }}>{row[0]}</td>
                    <td style={{ border: "1px solid #cbd5e1", padding: "7px 10px", fontWeight: 800, width: "32%" }}>{row[1]}</td>
                    <td style={{ border: "1px solid #cbd5e1", padding: "7px 10px", background: "#f1f5f9", fontWeight: 900, color: "#475569", width: "18%" }}>{row[2]}</td>
                    <td style={{ border: "1px solid #cbd5e1", padding: "7px 10px", fontWeight: 800, width: "32%" }}>{row[3]}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Sections */}
            {sop.sections.map((sec, i) => (
              <div key={i} style={{ marginBottom: 16, breakInside: "avoid" }}>
                <div style={{ fontSize: 15, fontWeight: 950, color: accent, marginBottom: 6, paddingBottom: 5, borderBottom: `1px solid ${gc.border}` }}>
                  {isAr ? (sec.headingAr || sec.heading) : sec.heading}
                </div>
                <div style={{ fontSize: 12.5, color: "#1e293b", lineHeight: 1.7, whiteSpace: "pre-line" }}>
                  {isAr ? (sec.contentAr || sec.content) : sec.content}
                </div>
              </div>
            ))}

            <div style={{ marginTop: 16, paddingTop: 10, borderTop: "1px solid #e2e8f0", fontSize: 10.5, color: "#94a3b8", textAlign: "center" }}>
              {t.footer}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div style={{ padding: "12px 40px", borderTop: "1px solid rgba(15,23,42,0.08)", background: "rgba(248,250,252,0.95)", display: "flex", justifyContent: "flex-end", gap: 8, flexShrink: 0, flexWrap: "wrap" }}>
          <button onClick={() => window.print()} style={{ padding: "9px 18px", borderRadius: 12, fontSize: 14, fontWeight: 900, background: "#fff", border: "1px solid #cbd5e1", color: "#334155", cursor: "pointer" }}>
            {t.printDoc}
          </button>
          <button onClick={exportPdf} disabled={exporting} style={{ padding: "9px 18px", borderRadius: 12, fontSize: 14, fontWeight: 900, background: accent, border: `1px solid ${accent}`, color: "#fff", cursor: "pointer", opacity: exporting ? 0.7 : 1 }}>
            {exporting ? t.exporting : t.controlledPdf}
          </button>
          <button onClick={onClose} style={{ padding: "9px 28px", borderRadius: 12, fontSize: 14, fontWeight: 900, background: gc.bg, border: `1px solid ${gc.border}`, color: gc.text, cursor: "pointer" }}>
            {t.close}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Card ──────────────────────────────────────────────────────────────────────
function SopCard({ sop, isAr, t, hoverId, setHoverId, onOpen }) {
  const isHover = hoverId === sop.id;
  const gc = groupColors[sop.group] || groupColors.fs;
  const accent = SOP_GROUP_META[sop.group]?.color || "#0369a1";
  const review = reviewInfoFor(sop, isAr);
  const reviewStyle = review.status === "overdue"
    ? { bg: "#fee2e2", color: "#991b1b", border: "#fecaca" }
    : review.status === "due"
    ? { bg: "#fef3c7", color: "#92400e", border: "#fde68a" }
    : { bg: "#dcfce7", color: "#166534", border: "#bbf7d0" };

  return (
    <div
      style={{
        position: "relative", borderRadius: 18, background: "rgba(255,255,255,0.92)",
        border: `1px solid ${isHover ? gc.border : "rgba(15,23,42,0.14)"}`,
        boxShadow: isHover ? `0 20px 50px ${gc.bg}` : "0 10px 28px rgba(2,132,199,0.09)",
        transition: "transform .18s ease, box-shadow .18s ease, border-color .18s ease",
        overflow: "hidden", padding: "16px 18px", cursor: "pointer",
        textAlign: isAr ? "right" : "left", transform: isHover ? "translateY(-4px)" : "translateY(0)",
      }}
      onMouseEnter={() => setHoverId(sop.id)} onMouseLeave={() => setHoverId(null)}
      onClick={() => onOpen(sop)} role="button" tabIndex={0}
      onKeyDown={(e) => { if (e.key === "Enter") onOpen(sop); }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 42, height: 42, borderRadius: 12, flexShrink: 0, background: gc.bg, border: `1px solid ${gc.border}`, display: "flex", alignItems: "center", justifyContent: "center", color: gc.text }}>
            <IconDoc />
          </div>
          <div>
            <div style={{ fontSize: 11, fontWeight: 900, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.10em" }}>{sop.code}</div>
            <div style={{ fontSize: 15, fontWeight: 950, color: "#071b2d", lineHeight: 1.25 }}>{isAr ? sop.titleAr : sop.title}</div>
          </div>
        </div>
        <span style={{ fontSize: 10, fontWeight: 900, padding: "4px 10px", borderRadius: 999, whiteSpace: "nowrap", flexShrink: 0, background: gc.bg, border: `1px solid ${gc.border}`, color: gc.text }}>
          {isAr ? sop.categoryAr : sop.category}
        </span>
      </div>

      <div style={{ display: "inline-flex", alignItems: "center", padding: "4px 9px", borderRadius: 999, background: reviewStyle.bg, color: reviewStyle.color, border: `1px solid ${reviewStyle.border}`, fontSize: 10, fontWeight: 950, marginBottom: 10 }}>
        {review.label}
      </div>

      <div style={{ fontSize: 12, color: "#475569", lineHeight: 1.5, marginBottom: 12 }}>{isAr ? sop.subtitleAr : sop.subtitle}</div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px 10px" }}>
        {[
          { label: t.docNo, value: sop.docNo },
          { label: t.revision, value: sop.revision },
          { label: t.preparedBy, value: sop.preparedBy },
          { label: t.issueDate, value: sop.issueDate },
        ].map((m) => (
          <div key={m.label} style={{ padding: "6px 10px", borderRadius: 10, background: "rgba(241,245,249,0.80)", border: "1px solid rgba(15,23,42,0.07)" }}>
            <div style={{ fontSize: 10, fontWeight: 800, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.08em" }}>{m.label}</div>
            <div style={{ fontSize: 12, fontWeight: 900, color: "#1e293b", marginTop: 2 }}>{m.value}</div>
          </div>
        ))}
      </div>

      <div style={{ marginTop: 12, fontSize: 11, fontWeight: 900, color: accent, textTransform: "uppercase", letterSpacing: "0.10em", display: "flex", alignItems: "center", gap: 4, opacity: isHover ? 1 : 0.5, transition: "opacity .18s ease" }}>
        <span>{t.viewFullDetails}</span>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ transform: isAr ? "scaleX(-1)" : "none" }}>
          <path d="M5 12h14M12 5l7 7-7 7" />
        </svg>
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function HSESOPs() {
  const navigate = useNavigate();
  const { lang, setLang } = useHSELang();
  const t = UI[lang];
  const isAr = lang === "ar";
  const [search, setSearch] = useState("");
  const [activeGroup, setActiveGroup] = useState("all");
  const [hoverId, setHoverId] = useState(null);
  const [selected, setSelected] = useState(null);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return hseSops.filter((s) => {
      const matchGroup = activeGroup === "all" || s.group === activeGroup;
      const matchSearch = !q ||
        s.title.toLowerCase().includes(q) || (s.titleAr || "").includes(q) ||
        s.code.toLowerCase().includes(q) || s.docNo.toLowerCase().includes(q) ||
        s.category.toLowerCase().includes(q);
      return matchGroup && matchSearch;
    });
  }, [search, activeGroup]);

  const filteredGroups = hseSopGroups
    .map((g) => ({ ...g, items: g.items.filter((s) => filtered.includes(s)) }))
    .filter((g) => g.items.length);

  return (
    <main style={{
      minHeight: "100vh", padding: "28px 18px",
      background:
        "radial-gradient(circle at 12% 10%, rgba(251,146,60,0.20) 0, rgba(255,255,255,1) 42%)," +
        "radial-gradient(circle at 88% 12%, rgba(3,105,161,0.12) 0, rgba(255,255,255,0) 55%)," +
        "radial-gradient(circle at 50% 100%, rgba(124,58,237,0.10) 0, rgba(255,255,255,0) 58%)",
      fontFamily: 'Cairo, system-ui, -apple-system, "Segoe UI", sans-serif',
      color: "#071b2d", direction: t.dir,
    }}>
      {selected && <SopModal sop={selected} onClose={() => setSelected(null)} lang={lang} />}

      <div style={{ maxWidth: 1200, margin: "0 auto" }}>
        {/* Top bar */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 14, padding: "14px 16px", borderRadius: 18, background: "rgba(255,255,255,0.86)", border: "1px solid rgba(15,23,42,0.16)", boxShadow: "0 14px 40px rgba(234,88,12,0.12)", backdropFilter: "blur(12px)", marginBottom: 18, flexWrap: "wrap" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, minWidth: 0 }}>
            <img src={mawashiLogo} alt="Al Mawashi" style={{ width: 46, height: 46, borderRadius: 12, objectFit: "cover", border: "1px solid rgba(234,88,12,0.18)", background: "#fff" }} />
            <div>
              <div style={{ fontSize: 14, fontWeight: 950, lineHeight: 1.2 }}>{t.brandTop}</div>
              <div style={{ fontSize: 12, fontWeight: 750, opacity: 0.78, marginTop: 4 }}>{t.brandSub}</div>
            </div>
          </div>
          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            <div style={{ display: "flex", borderRadius: 999, overflow: "hidden", border: "1px solid rgba(234,88,12,0.40)" }}>
              {["en", "ar"].map((l) => (
                <button key={l} onClick={() => setLang(l)} style={{
                  padding: "7px 16px", fontSize: 13, fontWeight: 900, cursor: "pointer",
                  background: lang === l ? "linear-gradient(135deg,rgba(251,146,60,0.30),rgba(245,158,11,0.20))" : "rgba(255,255,255,0.70)",
                  border: "none", color: lang === l ? "#7c2d12" : "#64748b",
                }}>
                  {l === "en" ? "EN" : "العربية"}
                </button>
              ))}
            </div>
            <button style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "8px 14px", borderRadius: 999, fontSize: 13, fontWeight: 800, color: "#9a3412", background: "rgba(251,146,60,0.12)", border: "1px solid rgba(234,88,12,0.30)", cursor: "pointer" }} onClick={() => navigate("/hse")}>
              <IconBack rtl={isAr} /> {t.back}
            </button>
            <div style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "9px 12px", borderRadius: 999, fontSize: 12, fontWeight: 900, color: "#7c2d12", background: "linear-gradient(135deg,rgba(251,146,60,0.22),rgba(245,158,11,0.14))", border: "1px solid rgba(234,88,12,0.38)" }}>
              {t.badge}
            </div>
          </div>
        </div>

        {/* Header */}
        <header style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", gap: 16, margin: "14px 0 18px", flexWrap: "wrap" }}>
          <div>
            <div style={{ fontSize: 26, fontWeight: 980, letterSpacing: "0.02em" }}>{t.pageTitle}</div>
            <div style={{ fontSize: 13, fontWeight: 750, opacity: 0.82, marginTop: 6, maxWidth: 620 }}>{t.pageSubtitle}</div>
          </div>
          <p style={{ fontSize: 13, fontWeight: 750, color: "#334155", maxWidth: 380, margin: 0 }}>{t.tagline}</p>
        </header>

        {/* Stats */}
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 18 }}>
          {[
            { label: t.totalSOPs, value: hseSops.length, color: "#0369a1" },
            { label: t.groups, value: hseSopGroups.length, color: "#9a3412" },
            { label: t.showing, value: filtered.length, color: "#15803d" },
          ].map((s) => (
            <div key={s.label} style={{ padding: "10px 16px", borderRadius: 14, background: "rgba(255,255,255,0.88)", border: "1px solid rgba(15,23,42,0.12)", boxShadow: "0 6px 18px rgba(234,88,12,0.08)" }}>
              <div style={{ fontSize: 22, fontWeight: 980, color: s.color }}>{s.value}</div>
              <div style={{ fontSize: 11, fontWeight: 800, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.08em" }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Toolbar */}
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 16, alignItems: "center" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "9px 14px", borderRadius: 12, background: "rgba(255,255,255,0.92)", border: "1px solid rgba(15,23,42,0.16)", boxShadow: "0 4px 12px rgba(234,88,12,0.06)", flex: 1, minWidth: 220, maxWidth: 340 }}>
            <IconSearch />
            <input style={{ border: "none", outline: "none", background: "transparent", fontSize: 14, fontWeight: 700, color: "#071b2d", flex: 1 }} placeholder={t.search} value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          {[{ key: "all", label: t.filterAll, color: "#334155" }, ...hseSopGroups.map((g) => ({ key: g.key, label: isAr ? g.labelAr : g.label, color: g.color }))].map((c) => {
            const active = activeGroup === c.key;
            return (
              <button key={c.key} onClick={() => setActiveGroup(c.key)} style={{
                padding: "8px 14px", borderRadius: 999, fontSize: 12, fontWeight: 900, cursor: "pointer",
                background: active ? c.color : "rgba(255,255,255,0.80)",
                border: active ? `1px solid ${c.color}` : "1px solid rgba(15,23,42,0.14)",
                color: active ? "#fff" : "#334155",
                boxShadow: active ? `0 6px 16px ${c.color}33` : "none",
              }}>
                {c.label}
              </button>
            );
          })}
        </div>

        {/* Grouped grids */}
        {filteredGroups.length === 0 ? (
          <div style={{ textAlign: "center", padding: "40px 0", color: "#64748b", fontWeight: 800 }}>{t.noMatch}</div>
        ) : filteredGroups.map((g) => (
          <section key={g.key} aria-label={g.label} style={{ marginBottom: 30 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12, margin: "8px 0 14px", paddingBottom: 10, borderBottom: `2px solid ${g.color}44` }}>
              <div style={{ padding: "5px 16px", borderRadius: 999, fontSize: 13, fontWeight: 900, background: `${g.color}18`, border: `1px solid ${g.color}66`, color: g.color }}>
                {g.key.toUpperCase()}
              </div>
              <div style={{ fontSize: 16, fontWeight: 900, color: g.color }}>{isAr ? g.labelAr : g.label}</div>
              <div style={{ fontSize: 12, color: "#64748b", fontWeight: 800 }}>({g.items.length})</div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: 14 }}>
              {g.items.map((sop) => (
                <SopCard key={sop.id} sop={sop} isAr={isAr} t={t} hoverId={hoverId} setHoverId={setHoverId} onOpen={setSelected} />
              ))}
            </div>
          </section>
        ))}

        <div style={{ marginTop: 24, fontSize: 12, color: "#64748b", fontWeight: 800, textAlign: "center", opacity: 0.95 }}>{t.footer}</div>
      </div>
    </main>
  );
}
