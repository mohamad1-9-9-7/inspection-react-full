// src/companies/exaltis/training/admin/RefPreviewModal.jsx
// Training admin — reference preview.
// (Split out of TrainingAdmin.jsx — the code is unchanged.)
import React, { useRef } from "react";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import { companyLine } from "../brand";
import { getModuleName } from "../TrainingSessionsList.helpers";
import { t } from "./adminI18n";
import { REF_TYPE_ICONS } from "./adminModel";

/* ===================== REF PREVIEW MODAL ===================== */
export function RefPreviewModal({ refData, lang, onClose, onEdit }) {
  const { payload: p } = refData;
  const contentRef = useRef(null);
  const [viewLang, setViewLang] = React.useState("both"); // "en" | "ar" | "both"
  const [exporting, setExporting] = React.useState(false);

  const isAr = (t) => /[؀-ۿ]/.test(t);
  const isEnLabel = (t) => /^[A-Za-z]\)/.test(t.trim());
  const isArLabel = (t) => /^[؀-ۿ].{0,8}[):]/u.test(t.trim());

  const rawLines = (p.content || "").split("\n").map((l) => l.trim()).filter(Boolean);

  // Group lines into sections (each EN label A) starts a new section)
  const sections = React.useMemo(() => {
    const out = [];
    let current = null;
    for (const line of rawLines) {
      if (isEnLabel(line)) {
        if (current) out.push(current);
        current = { label: line, lines: [] };
      } else if (current) {
        current.lines.push(line);
      } else {
        out.push({ label: null, lines: [line] });
      }
    }
    if (current) out.push(current);
    return out;
  }, [rawLines]);

  // Filter sections by language
  const visible = React.useMemo(() => {
    if (viewLang === "both") return sections;
    return sections.map((s) => ({
      ...s,
      label: viewLang === "en" && !isAr(s.label || "") ? s.label : viewLang === "ar" && isAr(s.label || "") ? s.label : s.label,
      lines: s.lines.filter((l) => viewLang === "ar" ? isAr(l) : !isAr(l)),
    })).filter((s) => s.lines.length > 0 || (viewLang === "en" && !isAr(s.label || "")) || (viewLang === "ar" && isAr(s.label || "")));
  }, [sections, viewLang]);

  const SECTION_COLORS = [
    { bg: "#eff6ff", border: "#3b82f6", label: "#1d4ed8" },
    { bg: "#f0fdf4", border: "#22c55e", label: "#15803d" },
    { bg: "#fdf4ff", border: "#a855f7", label: "#7e22ce" },
    { bg: "#fff7ed", border: "#f97316", label: "#c2410c" },
    { bg: "#f0fdfa", border: "#14b8a6", label: "#0f766e" },
    { bg: "#fef2f2", border: "#ef4444", label: "#b91c1c" },
    { bg: "#fffbeb", border: "#f59e0b", label: "#b45309" },
    { bg: "#ecfdf5", border: "#10b981", label: "#047857" },
  ];

  async function exportPDF() {
    if (!contentRef.current) return;
    setExporting(true);
    try {
      const el = contentRef.current;
      const canvas = await html2canvas(el, {
        scale: 2, backgroundColor: "#ffffff", useCORS: true,
        scrollY: -window.scrollY, windowWidth: el.scrollWidth,
      });
      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
      const pdfW = pdf.internal.pageSize.getWidth();
      const pdfH = pdf.internal.pageSize.getHeight();
      const margin = 10;
      const usableW = pdfW - margin * 2;
      const imgH = (canvas.height * usableW) / canvas.width;
      let y = margin;
      let remaining = imgH;
      let srcY = 0;
      while (remaining > 0) {
        const pageH = Math.min(remaining, pdfH - margin * 2);
        const srcH = (pageH / imgH) * canvas.height;
        const pageCanvas = document.createElement("canvas");
        pageCanvas.width = canvas.width;
        pageCanvas.height = srcH;
        const ctx = pageCanvas.getContext("2d");
        ctx.drawImage(canvas, 0, srcY, canvas.width, srcH, 0, 0, canvas.width, srcH);
        const pageImg = pageCanvas.toDataURL("image/png");
        if (srcY > 0) pdf.addPage();
        pdf.addImage(pageImg, "PNG", margin, margin, usableW, pageH);
        y += pageH;
        srcY += srcH;
        remaining -= pageH;
      }
      const safeName = (p.title || "reference").replace(/[^a-zA-Z0-9؀-ۿ]/g, "_").slice(0, 50);
      pdf.save(`${safeName}.pdf`);
    } catch (e) {
      alert("PDF export failed: " + e.message);
    } finally {
      setExporting(false);
    }
  }

  // Close on ESC
  React.useEffect(() => {
    const fn = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", fn);
    return () => window.removeEventListener("keydown", fn);
  }, [onClose]);

  const typeColor = { Document: "#4338ca", SOP: "#0369a1", PDF: "#dc2626", Video: "#7c3aed", Link: "#059669", Policy: "#b45309" };
  const headerColor = typeColor[p.refType] || "#4338ca";

  return (
    <div
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      style={{
        position: "fixed", inset: 0, zIndex: 30000,
        background: "rgba(2,6,23,0.75)", backdropFilter: "blur(8px)",
        display: "flex", alignItems: "flex-start", justifyContent: "center",
        padding: "24px 16px", overflowY: "auto",
        fontFamily: "Cairo, 'Inter', system-ui, sans-serif",
      }}
    >
      <div style={{
        width: "100%", maxWidth: 860,
        background: "#fff", borderRadius: 20,
        boxShadow: "0 40px 120px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.1)",
        overflow: "hidden",
        animation: "slideUp 0.22s cubic-bezier(0.34,1.56,0.64,1)",
      }}>
        <style>{`@keyframes slideUp{from{opacity:0;transform:translateY(32px)}to{opacity:1;transform:translateY(0)}}`}</style>

        {/* ── Header ── */}
        <div style={{
          background: `linear-gradient(135deg, ${headerColor}ee 0%, ${headerColor}99 100%)`,
          padding: "22px 28px",
          position: "relative", overflow: "hidden",
        }}>
          {/* decorative circles */}
          <div style={{ position: "absolute", right: -40, top: -40, width: 200, height: 200, borderRadius: "50%", background: "rgba(255,255,255,0.07)", pointerEvents: "none" }} />
          <div style={{ position: "absolute", right: 60, bottom: -60, width: 150, height: 150, borderRadius: "50%", background: "rgba(255,255,255,0.05)", pointerEvents: "none" }} />

          <div style={{ display: "flex", gap: 16, alignItems: "flex-start", position: "relative" }}>
            {/* Icon box */}
            <div style={{ width: 56, height: 56, borderRadius: 14, background: "rgba(255,255,255,0.2)", backdropFilter: "blur(10px)", display: "grid", placeItems: "center", fontSize: 26, flexShrink: 0, border: "1px solid rgba(255,255,255,0.3)" }}>
              {REF_TYPE_ICONS[p.refType] || "📌"}
            </div>

            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ color: "rgba(255,255,255,0.7)", fontSize: 10, fontWeight: 700, letterSpacing: 2.5, textTransform: "uppercase", marginBottom: 4 }}>
                {companyLine("Training Reference")}
              </div>
              <div style={{ color: "#fff", fontSize: 20, fontWeight: 900, lineHeight: 1.2, letterSpacing: "-0.02em" }}>{p.title}</div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 8 }}>
                {p.module && (
                  <span style={{ background: "rgba(255,255,255,0.2)", color: "#fff", padding: "3px 10px", borderRadius: 999, fontSize: 11, fontWeight: 700, backdropFilter: "blur(4px)" }}>
                    📚 {getModuleName(p.module, lang)}
                  </span>
                )}
                {p.refType && (
                  <span style={{ background: "rgba(255,255,255,0.2)", color: "#fff", padding: "3px 10px", borderRadius: 999, fontSize: 11, fontWeight: 700 }}>
                    {REF_TYPE_ICONS[p.refType]} {p.refType}
                  </span>
                )}
                {p.addedAt && (
                  <span style={{ background: "rgba(255,255,255,0.15)", color: "rgba(255,255,255,0.85)", padding: "3px 10px", borderRadius: 999, fontSize: 11 }}>
                    📅 {p.addedAt}
                  </span>
                )}
              </div>
            </div>

            {/* Close */}
            <button onClick={onClose} style={{ width: 36, height: 36, borderRadius: "50%", background: "rgba(255,255,255,0.2)", border: "1px solid rgba(255,255,255,0.3)", color: "#fff", cursor: "pointer", display: "grid", placeItems: "center", fontSize: 16, flexShrink: 0 }}>✕</button>
          </div>

          {/* Language toggle */}
          <div style={{ display: "flex", gap: 6, marginTop: 14, position: "relative" }}>
            {[["both", lang === "ar" ? "EN + AR" : "EN + AR"], ["en", "English"], ["ar", "عربي"]].map(([val, lbl]) => (
              <button key={val} onClick={() => setViewLang(val)} style={{
                padding: "5px 14px", borderRadius: 999, fontSize: 12, fontWeight: 800, cursor: "pointer", border: "none",
                background: viewLang === val ? "#fff" : "rgba(255,255,255,0.2)",
                color: viewLang === val ? headerColor : "#fff",
                transition: "all 0.15s",
              }}>{lbl}</button>
            ))}
            <div style={{ flex: 1 }} />
            <div style={{ color: "rgba(255,255,255,0.6)", fontSize: 11, alignSelf: "center" }}>
              {rawLines.length} lines · {(p.content || "").length} chars
            </div>
          </div>
        </div>

        {/* ── URL bar ── */}
        {p.url && (
          <div style={{ padding: "10px 28px", background: "#f8fafc", borderBottom: "1px solid #e5e7eb", display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 14 }}>🔗</span>
            <a href={p.url} target="_blank" rel="noopener noreferrer" style={{ fontSize: 13, color: "#2563eb", textDecoration: "underline", wordBreak: "break-all" }}>{p.url}</a>
          </div>
        )}

        {/* ── Content body ── */}
        <div ref={contentRef} style={{ padding: "24px 28px", background: "#fafbfc", maxHeight: "55vh", overflowY: "auto" }}>
          {/* PDF header (hidden from view, shows in export) */}
          <div style={{ display: "none" }} className="pdf-header">
            <div style={{ textAlign: "center", marginBottom: 20, borderBottom: "2px solid #4338ca", paddingBottom: 16 }}>
              <div style={{ fontSize: 18, fontWeight: 900, color: "#0f172a" }}>{p.title}</div>
              {p.module && <div style={{ fontSize: 13, color: "#64748b", marginTop: 4 }}>{getModuleName(p.module, lang)} — {companyLine("Training Reference")}</div>}
            </div>
          </div>

          {visible.length === 0 && (
            <div style={{ textAlign: "center", color: "#94a3b8", padding: 40, fontSize: 14 }}>
              {lang === "ar" ? "لا يوجد محتوى في هذه اللغة" : "No content for this language"}
            </div>
          )}

          <div style={{ display: "grid", gap: 12 }}>
            {visible.map((section, si) => {
              const sc = SECTION_COLORS[si % SECTION_COLORS.length];
              const hasLabel = Boolean(section.label);
              return (
                <div key={si} style={{
                  background: sc.bg,
                  border: `1px solid ${sc.border}44`,
                  borderLeft: `4px solid ${sc.border}`,
                  borderRadius: 12,
                  padding: "14px 18px",
                  transition: "box-shadow 0.15s",
                }}>
                  {hasLabel && (
                    <div style={{
                      fontSize: 13.5, fontWeight: 900, color: sc.label,
                      marginBottom: section.lines.length > 0 ? 10 : 0,
                      direction: isAr(section.label) ? "rtl" : "ltr",
                      display: "flex", alignItems: "flex-start", gap: 8,
                    }}>
                      <span style={{ flexShrink: 0, width: 26, height: 26, borderRadius: "50%", background: sc.border, color: "#fff", display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 900, marginTop: 1 }}>
                        {String.fromCharCode(65 + si)}
                      </span>
                      <span>{section.label.replace(/^[A-Za-z]\)\s*/, "").replace(/^[أ-ي]\)\s*/, "")}</span>
                    </div>
                  )}
                  <div style={{ display: "grid", gap: 4 }}>
                    {section.lines.map((line, li) => {
                      const arabic = isAr(line);
                      const isSubLabel = isEnLabel(line) || isArLabel(line);
                      return (
                        <div key={li} style={{
                          fontSize: isSubLabel ? 12.5 : 12,
                          lineHeight: 1.65,
                          color: isSubLabel ? sc.label : "#374151",
                          fontWeight: isSubLabel ? 800 : 500,
                          direction: arabic ? "rtl" : "ltr",
                          paddingLeft: (!arabic && !isSubLabel) ? 8 : 0,
                          paddingRight: (arabic && !isSubLabel) ? 8 : 0,
                          borderLeft: (!arabic && !isSubLabel) ? `2px solid ${sc.border}44` : "none",
                          borderRight: (arabic && !isSubLabel) ? `2px solid ${sc.border}44` : "none",
                        }}>
                          {line}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* ── Footer actions ── */}
        <div style={{
          padding: "16px 28px",
          background: "#fff",
          borderTop: "1px solid #e5e7eb",
          display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center",
          justifyContent: "space-between",
        }}>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button
              onClick={exportPDF}
              disabled={exporting}
              style={{
                padding: "10px 20px", borderRadius: 10, border: "none", cursor: exporting ? "not-allowed" : "pointer",
                background: exporting ? "#94a3b8" : "linear-gradient(135deg,#dc2626,#b91c1c)",
                color: "#fff", fontWeight: 800, fontSize: 13, display: "flex", alignItems: "center", gap: 6,
                boxShadow: exporting ? "none" : "0 4px 14px rgba(220,38,38,0.4)",
                transition: "all 0.15s",
              }}
            >
              {exporting ? "⏳" : "📄"} {lang === "ar" ? (exporting ? "جارٍ التصدير…" : "تصدير PDF") : (exporting ? "Exporting…" : "Export PDF")}
            </button>
            <button
              onClick={() => {
                const w = window.open("", "_blank");
                if (!w) return;
                const lines = rawLines.map((l) => `<p dir="${isAr(l) ? "rtl" : "ltr"}" style="margin:4px 0;font-size:13px">${l}</p>`).join("");
                w.document.write(`<html><head><title>${p.title}</title><meta charset="utf-8"><style>@media print{@page{margin:15mm}}body{font-family:Cairo,Inter,system-ui,sans-serif;padding:20px;max-width:800px;margin:0 auto}h1{font-size:18px;color:#1e3a8a}h2{font-size:13px;color:#64748b}</style></head><body><h1>${p.title}</h1><h2>${p.module ? getModuleName(p.module, lang) : ""} — ${companyLine("Training Reference")}</h2><hr/>${lines}<script>window.onload=()=>window.print()</script></body></html>`);
                w.document.close();
              }}
              style={{ padding: "10px 18px", borderRadius: 10, border: "1px solid #e5e7eb", background: "#fff", color: "#374151", fontWeight: 800, fontSize: 13, cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}
            >
              🖨️ {lang === "ar" ? "طباعة" : "Print"}
            </button>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={onEdit} style={{ padding: "10px 18px", borderRadius: 10, border: "1px solid #e5e7eb", background: "#f8fafc", color: "#374151", fontWeight: 800, fontSize: 13, cursor: "pointer" }}>
              ✏️ {lang === "ar" ? "تعديل" : "Edit"}
            </button>
            <button onClick={onClose} style={{ padding: "10px 20px", borderRadius: 10, border: "none", background: "#0f172a", color: "#fff", fontWeight: 800, fontSize: 13, cursor: "pointer" }}>
              {lang === "ar" ? "إغلاق" : "Close"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
