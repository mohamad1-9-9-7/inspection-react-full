// src/pages/hse/HSESOPs.jsx
// الإجراءات التشغيلية القياسية — بتصميم صفحة SOP الخاصة بـ HACCP / ISO:
// شريط علوي زجاجي، بطاقات وثائق، ونافذة قراءة بحجم 75% من الشاشة. ثنائية اللغة.

import React, { useMemo, useRef, useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import { todayISO, useHSELang } from "./hseShared";
import { SOP_GROUPS } from "./hseSopData";
import { exportNodeToPdf, safeFileName, pdfStageStyle, PDF_UI } from "./hsePdf";
import mawashiLogo from "../../assets/almawashi-logo.jpg";

const T = {
  brandLine1:   { ar: "ترانس إميرتس لتجارة المواشي ذ.م.م", en: "TRANS EMIRATES LIVESTOCK TRADING L.L.C." },
  brandLine2:   { ar: "الأسماك والمواشي — نظام إدارة الصحة والسلامة والبيئة", en: "AL MAWASHI — HSE Management System" },
  badgeLabel:   { ar: "📘 وثائق مضبوطة", en: "📘 Controlled documents" },
  pageTitle:    { ar: "الإجراءات التشغيلية القياسية — SOPs", en: "Standard Operating Procedures — SOPs" },
  pageSubtitle: { ar: "33 إجراءً موزّعة على 5 مجموعات · مرقّمة بنظام موحّد SOP-FS / SOP-OHS / SOP-EM / SOP-EN / SOP-AD",
                  en: "33 procedures across 5 groups · numbered SOP-FS / SOP-OHS / SOP-EM / SOP-EN / SOP-AD" },
  tagline: {
    ar: "كل إجراء يتضمّن الهدف والنطاق والتعريفات والمسؤوليات والخطوات والسجلات والتكرار، إضافةً إلى التعامل مع الانحرافات وطريقة التحقق والمرجعية القانونية والمعيارية.",
    en: "Every procedure carries objective, scope, definitions, responsibilities, steps, records and frequency, plus deviation handling, the verification method and its legal and standard references.",
  },
  back:         { ar: "← مركز HSE", en: "← HSE hub" },
  search:       { ar: "ابحث برمز أو عنوان الإجراء…", en: "Search by code or procedure title…" },
  filterAll:    { ar: "الكل", en: "All" },
  statTotal:    { ar: "إجمالي الإجراءات", en: "Total procedures" },
  statGroups:   { ar: "المجموعات", en: "Groups" },
  statShowing:  { ar: "المعروض", en: "Showing" },
  viewDetails:  { ar: "عرض الوثيقة كاملة", en: "View full document" },
  noResults:    { ar: "لا يوجد إجراء مطابق لبحثك", en: "No procedure matches your search" },

  objective:      { ar: "الهدف", en: "Objective" },
  scope:          { ar: "النطاق", en: "Scope" },
  definitions:    { ar: "التعريفات", en: "Definitions" },
  responsibilities:{ ar: "المسؤوليات", en: "Responsibilities" },
  steps:          { ar: "الخطوات الرئيسية", en: "Key steps" },
  records:        { ar: "📁 السجلات المطلوبة", en: "📁 Required records" },
  freq:           { ar: "⏰ التكرار", en: "⏰ Frequency" },
  deviation:      { ar: "الانحرافات والإجراء التصحيحي", en: "Deviations and corrective action" },
  verification:   { ar: "التحقق والمراقبة", en: "Verification and monitoring" },
  refs:           { ar: "المرجعية القانونية والمعيارية", en: "Legal and standard references" },

  code:         { ar: "رمز الوثيقة", en: "Document code" },
  group:        { ar: "المجموعة", en: "Group" },
  close:        { ar: "إغلاق", en: "Close" },

  exportRegister: { ar: "📄 PDF — سجل الإجراءات", en: "📄 PDF — SOP register" },
  exportSop:      { ar: "📄 تصدير هذه الوثيقة", en: "📄 Export this document" },
  exporting:      { ar: "⏳ جارٍ التصدير…", en: "⏳ Exporting…" },

  pdfCompany:   { ar: "الأسماك والمواشي — قسم الصحة والسلامة والبيئة", en: "AL MAWASHI — Health, Safety & Environment Department" },
  pdfRegTitle:  { ar: "سجل الإجراءات التشغيلية القياسية (قائمة الوثائق المضبوطة)", en: "Standard Operating Procedures Register (Controlled Document List)" },
  pdfPrintedOn: { ar: "تاريخ الطباعة", en: "Printed on" },
  pdfCount:     { ar: "عدد الإجراءات", en: "Procedures listed" },
  pdfNo:        { ar: "م", en: "#" },
  pdfSopTitle:  { ar: "عنوان الإجراء", en: "Procedure title" },
};

/* ═══════════ أيقونات ═══════════ */
const IconDoc = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
    <path d="M14 2v6h6M16 13H8M16 17H8M10 9H8" />
  </svg>
);
const IconSearch = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2.4" strokeLinecap="round">
    <circle cx="11" cy="11" r="7" /><path d="M21 21l-4.3-4.3" />
  </svg>
);
const IconClose = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round">
    <path d="M18 6L6 18M6 6l12 12" />
  </svg>
);

const glassBtn = (accent = "#0369a1") => ({
  display: "inline-flex", alignItems: "center", gap: 6,
  padding: "8px 15px", borderRadius: 999, fontSize: 13, fontWeight: 900,
  color: accent, background: "rgba(34,211,238,0.10)",
  border: "1px solid rgba(34,211,238,0.32)", cursor: "pointer", whiteSpace: "nowrap",
});

const solidBtn = (bg = "#0f766e") => ({
  display: "inline-flex", alignItems: "center", gap: 6,
  padding: "9px 18px", borderRadius: 12, fontSize: 13.5, fontWeight: 900,
  color: "#fff", background: bg, border: `1px solid ${bg}`, cursor: "pointer", whiteSpace: "nowrap",
});

/** أقسام الوثيقة بالترتيب المعتمد */
function documentSections(item, pick) {
  return [
    { label: pick(T.objective), value: item.objective },
    { label: pick(T.scope), value: item.scope },
    { label: pick(T.definitions), value: item.definitions },
    { label: pick(T.responsibilities), value: item.responsibilities },
    { label: pick(T.steps), value: item.steps },
  ].filter((s) => s.value);
}

function closingSections(item, pick) {
  return [
    { label: pick(T.deviation), value: item.deviation },
    { label: pick(T.verification), value: item.verification },
    { label: pick(T.refs), value: item.refs },
  ].filter((s) => s.value);
}

/* ═══════════ بطاقة إجراء ═══════════ */
function SopCard({ item, group, pick, dir, hover, setHover, onOpen }) {
  const isHover = hover === item.code;
  return (
    <div
      role="button"
      tabIndex={0}
      onMouseEnter={() => setHover(item.code)}
      onMouseLeave={() => setHover(null)}
      onClick={onOpen}
      onKeyDown={(e) => { if (e.key === "Enter") onOpen(); }}
      style={{
        position: "relative", borderRadius: 18, overflow: "hidden",
        padding: "16px 18px", cursor: "pointer",
        background: "rgba(255,255,255,0.92)",
        border: `1px solid ${isHover ? "rgba(34,211,238,0.55)" : "rgba(15,23,42,0.14)"}`,
        boxShadow: isHover ? "0 20px 50px rgba(34,211,238,0.20)" : "0 10px 28px rgba(2,132,199,0.09)",
        transform: isHover ? "translateY(-4px)" : "translateY(0)",
        transition: "transform .18s ease, box-shadow .18s ease, border-color .18s ease",
        textAlign: dir === "rtl" ? "right" : "left",
      }}
    >
      <div aria-hidden="true" style={{
        position: "absolute", inset: 0, pointerEvents: "none",
        background: "radial-gradient(260px 180px at 0% 0%,rgba(34,211,238,0.12),transparent 60%),radial-gradient(220px 150px at 100% 100%,rgba(34,197,94,0.10),transparent 55%)",
        opacity: isHover ? 1 : 0.7, transition: "opacity .18s ease",
      }} />

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10, marginBottom: 10, position: "relative" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
          <div style={{
            width: 42, height: 42, borderRadius: 12, flexShrink: 0,
            background: "linear-gradient(135deg,rgba(34,211,238,0.18),rgba(34,197,94,0.12))",
            border: "1px solid rgba(34,211,238,0.34)",
            display: "flex", alignItems: "center", justifyContent: "center", color: "#0369a1",
          }}>
            <IconDoc />
          </div>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 11, fontWeight: 900, color: "#64748b", letterSpacing: "0.10em" }}>{item.code}</div>
            <div style={{ fontSize: 15, fontWeight: 950, color: "#071b2d", lineHeight: 1.25 }}>{pick(item.title)}</div>
          </div>
        </div>
        <span style={{
          fontSize: 10.5, fontWeight: 900, padding: "4px 10px", borderRadius: 999,
          whiteSpace: "nowrap", flexShrink: 0,
          background: group.bg, color: group.color, border: `1px solid ${group.color}33`,
        }}>
          {pick(group.short || group.title)}
        </span>
      </div>

      <div style={{ fontSize: 12.5, color: "#475569", lineHeight: 1.65, marginBottom: 12, fontWeight: 600, position: "relative" }}>
        {pick(item.desc)}
      </div>

      {item.freq && (
        <div style={{
          padding: "7px 11px", borderRadius: 10, position: "relative",
          background: "rgba(241,245,249,0.85)", border: "1px solid rgba(15,23,42,0.07)",
        }}>
          <div style={{ fontSize: 10, fontWeight: 800, color: "#94a3b8", letterSpacing: "0.06em" }}>{pick(T.freq)}</div>
          <div style={{ fontSize: 12.5, fontWeight: 900, color: "#1e293b", marginTop: 2 }}>{pick(item.freq)}</div>
        </div>
      )}

      <div style={{
        marginTop: 12, fontSize: 11, fontWeight: 900, color: "#0369a1",
        letterSpacing: "0.10em", display: "flex", alignItems: "center", gap: 5, position: "relative",
        opacity: isHover ? 1 : 0.45, transition: "opacity .18s ease",
      }}>
        <span>{pick(T.viewDetails)}</span>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
          style={{ transform: dir === "rtl" ? "scaleX(-1)" : "none" }}>
          <path d="M5 12h14M12 5l7 7-7 7" />
        </svg>
      </div>
    </div>
  );
}

/* ═══════════ نافذة الوثيقة — 75% من الشاشة ═══════════ */
function SopModal({ item, group, pick, dir, onClose, onExport, exporting }) {
  useEffect(() => {
    const handler = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    document.body.style.overflow = "hidden";
    return () => { window.removeEventListener("keydown", handler); document.body.style.overflow = ""; };
  }, [onClose]);

  const main = documentSections(item, pick);
  const closing = closingSections(item, pick);

  const Section = ({ n, label, value }) => (
    <section style={{ marginBottom: 20 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 9, marginBottom: 7 }}>
        <span style={{
          width: 24, height: 24, borderRadius: 7, flexShrink: 0,
          display: "flex", alignItems: "center", justifyContent: "center",
          background: "linear-gradient(135deg,rgba(34,211,238,0.22),rgba(34,197,94,0.16))",
          color: "#0c4a6e", fontSize: 12, fontWeight: 950,
        }}>{n}</span>
        <h3 style={{ margin: 0, fontSize: 15.5, fontWeight: 950, color: "#0c4a6e" }}>{label}</h3>
      </div>
      <p style={{ margin: 0, fontSize: 14.5, lineHeight: 2, fontWeight: 600, color: "#1e293b", whiteSpace: "pre-line" }}>
        {pick(value)}
      </p>
    </section>
  );

  return createPortal(
    <div
      onClick={onClose}
      style={{
        position: "fixed", inset: 0, zIndex: 4000,
        background: "rgba(7,27,45,0.55)", backdropFilter: "blur(6px)",
        display: "flex", alignItems: "center", justifyContent: "center", padding: 12,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        dir={dir}
        style={{
          width: "75vw", height: "75vh", minWidth: 340, minHeight: 420,
          background: "#fff", borderRadius: 18, overflow: "hidden",
          boxShadow: "0 30px 80px rgba(2,32,71,0.45)",
          display: "flex", flexDirection: "column",
          fontFamily: 'system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif',
          color: "#071b2d",
        }}
      >
        {/* ترويسة */}
        <div style={{
          display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 14,
          padding: "16px 22px", borderBottom: "1px solid rgba(15,23,42,0.12)",
          background: "linear-gradient(135deg,rgba(34,211,238,0.10),rgba(34,197,94,0.07))", flexShrink: 0,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, minWidth: 0 }}>
            <div style={{
              width: 46, height: 46, borderRadius: 12, flexShrink: 0,
              background: "linear-gradient(135deg,rgba(34,211,238,0.20),rgba(34,197,94,0.14))",
              border: "1px solid rgba(34,211,238,0.34)",
              display: "flex", alignItems: "center", justifyContent: "center", color: "#0369a1",
            }}>
              <IconDoc />
            </div>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 12, fontWeight: 900, color: "#64748b", letterSpacing: "0.08em" }}>{item.code}</div>
              <div style={{ fontSize: 19, fontWeight: 980, lineHeight: 1.2 }}>{pick(item.title)}</div>
              <span style={{
                display: "inline-block", marginTop: 6, fontSize: 10.5, fontWeight: 900,
                padding: "3px 10px", borderRadius: 999,
                background: group.bg, color: group.color, border: `1px solid ${group.color}33`,
              }}>
                {pick(group.short || group.title)}
              </span>
            </div>
          </div>
          <button onClick={onClose} title={pick(T.close)} style={{
            flexShrink: 0, width: 36, height: 36, borderRadius: 10,
            background: "rgba(15,23,42,0.06)", border: "1px solid rgba(15,23,42,0.12)",
            display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "#334155",
          }}>
            <IconClose />
          </button>
        </div>

        {/* الجسم */}
        <div style={{ flex: 1, overflowY: "auto", padding: "20px 24px" }}>
          {main.map((s, i) => <Section key={s.label} n={i + 1} label={s.label} value={s.value} />)}

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 12, marginBottom: 20 }}>
            {item.records && (
              <div style={{ border: "1px solid #e2e8f0", borderRadius: 12, padding: 14, background: "#f8fafc" }}>
                <div style={{ fontSize: 13, fontWeight: 950, color: "#7c3aed", marginBottom: 5 }}>{pick(T.records)}</div>
                <div style={{ fontSize: 13.5, fontWeight: 600, lineHeight: 1.85 }}>{pick(item.records)}</div>
              </div>
            )}
            {item.freq && (
              <div style={{ border: "1px solid #e2e8f0", borderRadius: 12, padding: 14, background: "#f8fafc" }}>
                <div style={{ fontSize: 13, fontWeight: 950, color: "#7c3aed", marginBottom: 5 }}>{pick(T.freq)}</div>
                <div style={{ fontSize: 13.5, fontWeight: 600, lineHeight: 1.85 }}>{pick(item.freq)}</div>
              </div>
            )}
          </div>

          {closing.map((s, i) => <Section key={s.label} n={main.length + i + 1} label={s.label} value={s.value} />)}
        </div>

        {/* التذييل */}
        <div style={{
          padding: "12px 22px", borderTop: "1px solid rgba(15,23,42,0.12)",
          background: "rgba(248,250,252,0.95)", display: "flex", justifyContent: "flex-end", gap: 8, flexShrink: 0,
        }}>
          <button style={{ ...solidBtn("#0f766e"), opacity: exporting ? 0.6 : 1 }} onClick={onExport} disabled={!!exporting}>
            {exporting ? pick(T.exporting) : pick(T.exportSop)}
          </button>
          <button style={{
            padding: "9px 28px", borderRadius: 12, fontSize: 13.5, fontWeight: 900, cursor: "pointer",
            background: "linear-gradient(135deg,rgba(34,211,238,0.18),rgba(34,197,94,0.12))",
            border: "1px solid rgba(34,211,238,0.38)", color: "#052336",
          }} onClick={onClose}>
            {pick(T.close)}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

/* ═══════════ الصفحة ═══════════ */
export default function HSESOPs() {
  const navigate = useNavigate();
  const { lang, setLang, dir, pick } = useHSELang();
  const [search, setSearch] = useState("");
  const [activeGroup, setActiveGroup] = useState("All");
  const [hover, setHover] = useState(null);
  const [selected, setSelected] = useState(null);
  const [exporting, setExporting] = useState("");
  const registerRef = useRef(null);
  const sopRef = useRef(null);

  const allItems = useMemo(
    () => SOP_GROUPS.flatMap((g) => g.items.map((it) => ({ item: it, group: g }))),
    []
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return allItems.filter(({ item, group }) => {
      if (activeGroup !== "All" && group.id !== activeGroup) return false;
      if (!q) return true;
      const hay = `${item.code} ${item.title.ar} ${item.title.en} ${item.desc.ar} ${item.desc.en}`.toLowerCase();
      return hay.includes(q);
    });
  }, [allItems, activeGroup, search]);

  async function exportPdf(kind) {
    setExporting(kind);
    try {
      await new Promise((r) => setTimeout(r, 60));
      if (kind === "register") {
        await exportNodeToPdf(registerRef.current, safeFileName("HSE_SOP_Register_" + todayISO()), { orientation: "l" });
      } else if (selected) {
        await exportNodeToPdf(sopRef.current, safeFileName(selected.item.code), { orientation: "p" });
      }
    } catch (e) {
      alert((pick({ ar: "❌ خطأ بالتصدير: ", en: "❌ Export error: " })) + (e?.message || e));
    } finally {
      setExporting("");
    }
  }

  return (
    <main style={{
      minHeight: "100vh", padding: "22px 16px", width: "100%",
      background:
        "radial-gradient(circle at 12% 10%, rgba(34,211,238,0.22) 0, rgba(255,255,255,1) 42%)," +
        "radial-gradient(circle at 88% 12%, rgba(34,197,94,0.16) 0, rgba(255,255,255,0) 55%)," +
        "radial-gradient(circle at 50% 100%, rgba(59,130,246,0.16) 0, rgba(255,255,255,0) 58%)",
      fontFamily: 'system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif',
      color: "#071b2d", direction: dir,
    }} dir={dir}>
      {selected && (
        <SopModal
          item={selected.item}
          group={selected.group}
          pick={pick}
          dir={dir}
          onClose={() => setSelected(null)}
          onExport={() => exportPdf("sop")}
          exporting={exporting === "sop"}
        />
      )}

      <div style={{ width: "100%", margin: 0 }}>
        {/* الشريط العلوي */}
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between", gap: 14,
          padding: "14px 16px", borderRadius: 18, marginBottom: 18, flexWrap: "wrap",
          background: "rgba(255,255,255,0.84)", border: "1px solid rgba(15,23,42,0.18)",
          boxShadow: "0 14px 40px rgba(2,132,199,0.12)", position: "relative", overflow: "hidden",
        }}>
          <div aria-hidden="true" style={{
            position: "absolute", inset: 0, pointerEvents: "none",
            background: "radial-gradient(800px 220px at 15% 0%,rgba(34,211,238,0.18),transparent 60%),radial-gradient(800px 220px at 85% 10%,rgba(34,197,94,0.14),transparent 60%)",
          }} />
          <div style={{ display: "flex", alignItems: "center", gap: 12, minWidth: 0, position: "relative" }}>
            <img src={mawashiLogo} alt="Al Mawashi" style={{
              width: 46, height: 46, borderRadius: 12, objectFit: "cover",
              border: "1px solid rgba(2,132,199,0.18)", background: "#fff",
            }} />
            <div>
              <div style={{ fontSize: 14, fontWeight: 950, lineHeight: 1.2 }}>{pick(T.brandLine1)}</div>
              <div style={{ fontSize: 12, fontWeight: 750, opacity: 0.78, marginTop: 4 }}>{pick(T.brandLine2)}</div>
            </div>
          </div>

          <div style={{ display: "flex", gap: 10, alignItems: "center", position: "relative", flexWrap: "wrap" }}>
            <div style={{ display: "flex", borderRadius: 999, overflow: "hidden", border: "1px solid rgba(34,211,238,0.40)" }}>
              {["en", "ar"].map((l) => (
                <button key={l} onClick={() => setLang(l)} style={{
                  padding: "7px 16px", fontSize: 13, fontWeight: 900, cursor: "pointer", border: "none",
                  background: lang === l ? "linear-gradient(135deg,rgba(34,211,238,0.30),rgba(34,197,94,0.20))" : "rgba(255,255,255,0.70)",
                  color: lang === l ? "#052336" : "#64748b",
                }}>
                  {l === "en" ? "EN" : "العربية"}
                </button>
              ))}
            </div>

            <button style={{ ...glassBtn("#0f766e"), opacity: exporting === "register" ? 0.6 : 1 }}
              onClick={() => exportPdf("register")} disabled={!!exporting}>
              {exporting === "register" ? pick(T.exporting) : pick(T.exportRegister)}
            </button>

            <button style={glassBtn()} onClick={() => navigate("/hse")}>{pick(T.back)}</button>

            <div style={{
              display: "inline-flex", alignItems: "center", gap: 8, padding: "9px 14px", borderRadius: 999,
              fontSize: 12, fontWeight: 900, color: "#052336",
              background: "linear-gradient(135deg,rgba(34,211,238,0.20),rgba(34,197,94,0.14))",
              border: "1px solid rgba(34,211,238,0.38)",
            }}>
              {pick(T.badgeLabel)}
            </div>
          </div>
        </div>

        {/* عنوان الصفحة */}
        <header style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", gap: 16, margin: "14px 0 18px", flexWrap: "wrap" }}>
          <div>
            <div style={{ fontSize: 26, fontWeight: 980, letterSpacing: "0.02em" }}>{pick(T.pageTitle)}</div>
            <div style={{ fontSize: 13, fontWeight: 750, opacity: 0.82, marginTop: 6 }}>{pick(T.pageSubtitle)}</div>
          </div>
          <p style={{ fontSize: 13, fontWeight: 700, color: "#334155", maxWidth: 480, margin: 0, lineHeight: 1.8 }}>{pick(T.tagline)}</p>
        </header>

        {/* الإحصاءات */}
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 18 }}>
          {[
            { label: pick(T.statTotal), value: allItems.length, color: "#0369a1" },
            { label: pick(T.statGroups), value: SOP_GROUPS.length, color: "#15803d" },
            { label: pick(T.statShowing), value: filtered.length, color: "#4c1d95" },
          ].map((s) => (
            <div key={s.label} style={{
              padding: "10px 18px", borderRadius: 14,
              background: "rgba(255,255,255,0.88)", border: "1px solid rgba(15,23,42,0.12)",
              boxShadow: "0 6px 18px rgba(2,132,199,0.08)",
            }}>
              <div style={{ fontSize: 22, fontWeight: 980, color: s.color }}>{s.value}</div>
              <div style={{ fontSize: 11, fontWeight: 800, color: "#64748b", letterSpacing: "0.06em" }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* أدوات البحث والتصفية */}
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 16, alignItems: "center" }}>
          <div style={{
            display: "flex", alignItems: "center", gap: 8, padding: "9px 14px", borderRadius: 12,
            background: "rgba(255,255,255,0.92)", border: "1px solid rgba(15,23,42,0.16)",
            boxShadow: "0 4px 12px rgba(2,132,199,0.06)", flex: 1, minWidth: 220, maxWidth: 360,
          }}>
            <IconSearch />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={pick(T.search)}
              style={{ border: "none", outline: "none", background: "transparent", fontSize: 14, fontWeight: 700, color: "#071b2d", flex: 1 }}
            />
          </div>
          {[{ id: "All", label: pick(T.filterAll), color: "#0369a1" },
            ...SOP_GROUPS.map((g) => ({ id: g.id, label: pick(g.short || g.title), color: g.color }))
          ].map((c) => {
            const active = activeGroup === c.id;
            return (
              <button key={c.id} onClick={() => setActiveGroup(c.id)} style={{
                padding: "8px 15px", borderRadius: 999, fontSize: 12.5, fontWeight: 900, cursor: "pointer",
                background: active ? c.color : "rgba(255,255,255,0.88)",
                color: active ? "#fff" : c.color,
                border: `1px solid ${active ? c.color : "rgba(15,23,42,0.14)"}`,
              }}>
                {c.label}
              </button>
            );
          })}
        </div>

        {/* البطاقات */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(330px, 1fr))", gap: 16 }}>
          {filtered.map(({ item, group }) => (
            <SopCard
              key={item.code}
              item={item}
              group={group}
              pick={pick}
              dir={dir}
              hover={hover}
              setHover={setHover}
              onOpen={() => setSelected({ item, group })}
            />
          ))}
        </div>
        {filtered.length === 0 && (
          <div style={{
            padding: 40, textAlign: "center", color: "#64748b", fontWeight: 800,
            background: "rgba(255,255,255,0.88)", borderRadius: 16, border: "1px solid rgba(15,23,42,0.12)",
          }}>
            {pick(T.noResults)}
          </div>
        )}

        {/* ── وثائق الـ PDF خارج #root ── */}
        {createPortal(
          <div ref={registerRef} style={pdfStageStyle(1400)} dir={dir}>
            <div style={{ display: "flex", alignItems: "center", gap: 14, borderBottom: "3px solid #0c4a6e", paddingBottom: 10 }}>
              <img src={mawashiLogo} alt="" style={{ height: 52 }} />
              <div style={{ flex: 1 }}>
                <div style={PDF_UI.h1}>{pick(T.pdfRegTitle)}</div>
                <div style={PDF_UI.sub}>{pick(T.pdfCompany)}</div>
              </div>
            </div>

            <table style={PDF_UI.metaTable}>
              <tbody>
                <tr>
                  <td style={PDF_UI.th}>{pick(T.pdfPrintedOn)}</td><td style={PDF_UI.td}>{todayISO()}</td>
                  <td style={PDF_UI.th}>{pick(T.pdfCount)}</td><td style={PDF_UI.td}>{allItems.length}</td>
                </tr>
              </tbody>
            </table>

            <table style={{ ...PDF_UI.table, marginTop: 10 }}>
              <thead>
                <tr>
                  <th style={{ ...PDF_UI.th, width: 28 }}>{pick(T.pdfNo)}</th>
                  <th style={{ ...PDF_UI.th, width: 96 }}>{pick(T.code)}</th>
                  <th style={{ ...PDF_UI.th, width: 260 }}>{pick(T.pdfSopTitle)}</th>
                  <th style={{ ...PDF_UI.th, width: 130 }}>{pick(T.group)}</th>
                  <th style={PDF_UI.th}>{pick(T.objective)}</th>
                  <th style={{ ...PDF_UI.th, width: 150 }}>{pick(T.freq)}</th>
                </tr>
              </thead>
              <tbody>
                {allItems.map(({ item, group }, i) => (
                  <tr key={item.code}>
                    <td style={{ ...PDF_UI.td, textAlign: "center" }}>{i + 1}</td>
                    <td style={{ ...PDF_UI.td, fontWeight: 700 }}>{item.code}</td>
                    <td style={PDF_UI.td}>{pick(item.title)}</td>
                    <td style={PDF_UI.td}>{pick(group.short || group.title)}</td>
                    <td style={PDF_UI.td}>{item.objective ? pick(item.objective) : "—"}</td>
                    <td style={PDF_UI.td}>{item.freq ? pick(item.freq) : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>,
          document.body
        )}

        {selected && createPortal(
          <div ref={sopRef} style={pdfStageStyle(900)} dir={dir}>
            <div style={{ display: "flex", alignItems: "center", gap: 14, borderBottom: "3px solid #0c4a6e", paddingBottom: 10 }}>
              <img src={mawashiLogo} alt="" style={{ height: 52 }} />
              <div style={{ flex: 1 }}>
                <div style={PDF_UI.h1}>{pick(selected.item.title)}</div>
                <div style={PDF_UI.sub}>{selected.item.code} · {pick(T.pdfCompany)}</div>
              </div>
            </div>

            <table style={PDF_UI.metaTable}>
              <tbody>
                <tr>
                  <td style={PDF_UI.th}>{pick(T.code)}</td><td style={PDF_UI.td}>{selected.item.code}</td>
                  <td style={PDF_UI.th}>{pick(T.group)}</td><td style={PDF_UI.td}>{pick(selected.group.short || selected.group.title)}</td>
                  <td style={PDF_UI.th}>{pick(T.pdfPrintedOn)}</td><td style={PDF_UI.td}>{todayISO()}</td>
                </tr>
              </tbody>
            </table>

            {[...documentSections(selected.item, pick),
              { label: pick(T.records), value: selected.item.records },
              { label: pick(T.freq), value: selected.item.freq },
              ...closingSections(selected.item, pick),
            ].filter((b) => b.value).map((b, i) => (
              <div key={i} style={{ marginTop: 12 }}>
                <div style={PDF_UI.sectionTitle}>{i + 1}. {b.label}</div>
                <div style={{ fontSize: 11, lineHeight: 1.8, whiteSpace: "pre-line" }}>{pick(b.value)}</div>
              </div>
            ))}
          </div>,
          document.body
        )}
      </div>
    </main>
  );
}
