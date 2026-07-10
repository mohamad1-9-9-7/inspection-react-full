// src/pages/haccp and iso/FSMSManual/FSMSManualView.jsx
// HACCP Manual — Main viewer (sidebar + content + edit)
// Edits are saved on the server (shared) — no local storage.

import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import mawashiLogo from "../../../assets/almawashi-logo.jpg";
import API_BASE from "../../../config/api";
import SignaturePad from "../../../components/SignaturePad";
import {
  FSMS_META,
  FSMS_CHAPTERS,
  FSMS_SECTIONS,
  FSMS_MODULE_LINKS,
} from "./fsmsContent";
import { FSMS_HACCP_SECTIONS } from "./fsmsHaccp";
import ProcessFlowGallery from "./ProcessFlowDiagram";
import { sopsData } from "../SOP/sopData";
import { useLang, LangToggle } from "./i18n";

/* Combined sections (clauses + HACCP-related) */
const ALL_SECTIONS = [...FSMS_SECTIONS, ...FSMS_HACCP_SECTIONS];

/* Server types */
const TYPE = "haccp_manual_overrides";
const TYPE_BOOKMARKS = "haccp_manual_bookmarks";
const TYPE_CHANGE_MANAGEMENT = "fsms_change_management_log_item";

const EXPORT_PAGE = { width: 794, minHeight: 1123 };

/* ===== Generic latest-payload fetcher ===== */
async function fetchLatestByType(type, key) {
  try {
    const res = await fetch(
      `${API_BASE}/api/reports?type=${encodeURIComponent(type)}`,
      { cache: "no-store" }
    );
    if (!res.ok) return null;
    const json = await res.json().catch(() => null);
    const arr = Array.isArray(json) ? json : json?.data || json?.items || [];
    if (!arr.length) return null;
    arr.sort((a, b) => (b?.payload?.savedAt || 0) - (a?.payload?.savedAt || 0));
    return arr[0]?.payload?.[key] ?? null;
  } catch {
    return null;
  }
}

async function saveByType(type, key, value) {
  const payload = { [key]: value, savedAt: Date.now() };
  const res = await fetch(`${API_BASE}/api/reports`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ reporter: "admin", type, payload }),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return payload;
}

const fetchOverrides       = () => fetchLatestByType(TYPE, "overrides").then((v) => v || {});
const saveOverridesToServer = (overrides) => saveByType(TYPE, "overrides", overrides);
const fetchBookmarks       = () => fetchLatestByType(TYPE_BOOKMARKS, "bookmarks").then((v) => v || []);
const saveBookmarksToServer = (bookmarks) => saveByType(TYPE_BOOKMARKS, "bookmarks", bookmarks);

async function fetchNextChangeLogNo() {
  try {
    const res = await fetch(`${API_BASE}/api/reports?type=${encodeURIComponent(TYPE_CHANGE_MANAGEMENT)}`, { cache: "no-store" });
    if (!res.ok) return 1;
    const json = await res.json().catch(() => null);
    const arr = Array.isArray(json) ? json : json?.data || json?.items || [];
    const max = arr.reduce((n, rec) => Math.max(n, Number(rec?.payload?.logNo) || 0), 0);
    return max + 1;
  } catch {
    return 1;
  }
}

async function saveManualChangeLog({ section, changeControl }) {
  const logNo = await fetchNextChangeLogNo();
  const now = new Date().toISOString();
  const payload = {
    id: `chg_manual_${Date.now()}`,
    logNo,
    date: changeControl.effectiveDate,
    description: `FSMS Manual section ${section.clause || section.id} updated: ${section.title}`,
    reason: changeControl.reason,
    impact: `Controlled document update for ${FSMS_META.referenceNumber}. Revision ${changeControl.revisionBefore} to ${changeControl.revisionAfter}. Affected section: ${section.clause || section.id}. Documented information updated through the HACCP Manual module by ${changeControl.changedBy}.`,
    approvedBy: changeControl.approvedBy,
    implementationDate: changeControl.effectiveDate,
    verification: `Manual override saved and controlled change trace generated on ${now.slice(0, 10)}. Change reason and revision details retained with the section override.`,
    status: "verified",
    sourceModule: "FSMS Manual",
    documentNo: FSMS_META.referenceNumber,
    revisionBefore: changeControl.revisionBefore,
    revisionAfter: changeControl.revisionAfter,
    changedBy: changeControl.changedBy,
    affectedSectionId: section.id,
    affectedClause: section.clause || section.id,
    savedAt: Date.now(),
  };
  const res = await fetch(`${API_BASE}/api/reports`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ reporter: changeControl.approvedBy || "admin", type: TYPE_CHANGE_MANAGEMENT, payload }),
  });
  if (!res.ok) throw new Error(`Change log HTTP ${res.status}`);
  return payload;
}

/* ===== Search highlight helper ===== */
function escapeRegExp(s) { return String(s).replace(/[.*+?^${}()|[\]\\]/g, "\\$&"); }
function HighlightedText({ text, query }) {
  if (!query || !text) return <>{text}</>;
  const q = query.trim();
  if (!q) return <>{text}</>;
  try {
    const re = new RegExp(`(${escapeRegExp(q)})`, "gi");
    const parts = String(text).split(re);
    return (
      <>
        {parts.map((p, i) =>
          p.toLowerCase() === q.toLowerCase() ? (
            <mark key={i} style={{ background: "#fde68a", color: "#854d0e", padding: "0 2px", borderRadius: 3, fontWeight: 900 }}>{p}</mark>
          ) : (
            <span key={i}>{p}</span>
          )
        )}
      </>
    );
  } catch {
    return <>{text}</>;
  }
}

/* ==================== STYLES ==================== */
const shellStyle = {
  minHeight: "100vh",
  background:
    "radial-gradient(1100px 380px at 100% -8%, rgba(15,118,110,0.07), transparent 60%)," +
    "linear-gradient(180deg,#f7f9fb 0%,#eef2f6 100%)",
  fontFamily: 'Cairo, Arial, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", "Tajawal", sans-serif',
  color: "#0f172a",
};

const layoutStyle = {
  width: "100%",
  margin: "0 auto",
  padding: "14px clamp(12px,2.4vw,28px) 22px",
  boxSizing: "border-box",
};

const topBarStyle = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 18,
  padding: "20px clamp(18px,2vw,28px)",
  borderRadius: 18,
  background: "linear-gradient(135deg,#0b2a30 0%,#0f766e 52%,#0891b2 100%)",
  color: "#fff",
  border: "1px solid rgba(255,255,255,0.10)",
  boxShadow: "0 22px 48px rgba(11,42,48,.30)",
  flexWrap: "wrap",
  marginBottom: 14,
  position: "relative",
  overflow: "hidden",
};

const titleStyle = { fontSize: 20, fontWeight: 1000, lineHeight: 1.2, color: "#fff", letterSpacing: ".01em" };
const subStyle = { fontSize: 13.5, fontWeight: 700, color: "rgba(255,255,255,.82)", marginTop: 5, lineHeight: 1.45 };

const docMetaStyle = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
  gap: 10,
  padding: 0,
  borderRadius: 0,
  background: "transparent",
  border: "0",
  marginBottom: 14,
};

const metaItem = { fontSize: 10, fontWeight: 900, color: "#0f766e", textTransform: "uppercase", letterSpacing: ".1em", marginBottom: 4 };
const metaVal = { fontSize: 13.5, fontWeight: 1000, color: "#0f172a" };

const containerStyle = {
  display: "grid",
  gridTemplateColumns: "minmax(290px, 340px) minmax(0, 1fr)",
  gap: 16,
  alignItems: "start",
};

const sidebarStyle = {
  background: "#fff",
  border: "1px solid #e6ebf1",
  borderRadius: 16,
  padding: 12,
  position: "sticky",
  top: 14,
  height: "calc(100vh - 190px)",
  overflowY: "auto",
  boxShadow: "0 12px 30px rgba(15,23,42,.06)",
};

const searchInputStyle = {
  width: "100%",
  padding: "11px 14px",
  borderRadius: 12,
  border: "1px solid #e2e8f0",
  background: "#f8fafc",
  fontSize: 13.5,
  fontWeight: 700,
  outline: "none",
  marginBottom: 12,
  boxSizing: "border-box",
};

const chapterStyle = (active) => ({
  padding: "10px 10px",
  borderRadius: 10,
  fontSize: 13,
  fontWeight: 1000,
  color: active ? "#0f766e" : "#0f172a",
  background: active ? "#f0fdfa" : "transparent",
  cursor: "pointer",
  display: "flex",
  alignItems: "center",
  gap: 8,
  marginTop: 4,
});

const chapterCountStyle = {
  fontSize: 10.5,
  fontWeight: 900,
  color: "#64748b",
  background: "#f1f5f9",
  border: "1px solid #e2e8f0",
  borderRadius: 999,
  padding: "1px 8px",
  minWidth: 22,
  textAlign: "center",
};

const sectionItemStyle = (active) => ({
  display: "flex",
  alignItems: "center",
  gap: 8,
  padding: "8px 10px 8px 12px",
  borderRadius: 10,
  fontSize: 12.5,
  fontWeight: 800,
  color: active ? "#0f766e" : "#475569",
  background: active ? "#ecfdf8" : "transparent",
  boxShadow: active ? "inset 3px 0 0 #0f766e" : "none",
  cursor: "pointer",
  marginTop: 2,
  transition: "background .15s ease, color .15s ease",
});

const clauseChipStyle = (active) => ({
  fontSize: 10.5,
  fontWeight: 900,
  color: active ? "#0f766e" : "#64748b",
  background: active ? "#ccfbf1" : "#f1f5f9",
  border: `1px solid ${active ? "#99f6e4" : "#e2e8f0"}`,
  borderRadius: 7,
  padding: "2px 6px",
  minWidth: 34,
  textAlign: "center",
  flexShrink: 0,
});

const contentStyle = {
  background: "#fff",
  border: "1px solid #e6ebf1",
  borderRadius: 16,
  padding: "26px clamp(20px,2.4vw,38px)",
  minHeight: 600,
  minWidth: 0,
  display: "flex",
  flexDirection: "column",
  boxShadow: "0 12px 30px rgba(15,23,42,.06)",
};

const sectionTitleStyle = { fontSize: 25, fontWeight: 1000, color: "#0f172a", marginBottom: 6, lineHeight: 1.22, letterSpacing: "-.01em" };
const clauseBadgeStyle = {
  display: "inline-block",
  padding: "4px 11px",
  borderRadius: 8,
  fontSize: 11,
  fontWeight: 1000,
  color: "#0f766e",
  background: "#f0fdfa",
  border: "1px solid #99f6e4",
  marginRight: 8,
};

const linkedBadgeStyle = {
  display: "inline-flex",
  alignItems: "center",
  gap: 5,
  padding: "4px 11px",
  borderRadius: 8,
  fontSize: 11,
  fontWeight: 1000,
  color: "#b45309",
  background: "linear-gradient(180deg,#fffbeb,#fef3c7)",
  border: "1px solid #fcd34d",
  marginRight: 8,
  textDecoration: "none",
  cursor: "pointer",
};

const editedBadgeStyle = {
  display: "inline-block",
  padding: "4px 11px",
  borderRadius: 8,
  fontSize: 11,
  fontWeight: 1000,
  color: "#854d0e",
  background: "#fffbeb",
  border: "1px solid #fde68a",
  marginRight: 8,
};

const bodyTextStyle = {
  whiteSpace: "pre-wrap",
  fontSize: 15,
  lineHeight: 1.85,
  color: "#334155",
  marginTop: 18,
  maxWidth: 960,
  fontWeight: 500,
};

const navStyle = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "stretch",
  gap: 12,
  marginTop: 26,
  paddingTop: 18,
  borderTop: "1px solid #eef2f6",
};

const navBtnStyle = (align) => ({
  display: "flex",
  flexDirection: "column",
  alignItems: align === "next" ? "flex-end" : "flex-start",
  gap: 3,
  flex: "1 1 0",
  maxWidth: "48%",
  padding: "11px 16px",
  borderRadius: 12,
  border: "1px solid #e6ebf1",
  background: "#f8fafc",
  color: "#0f172a",
  cursor: "pointer",
  fontFamily: "inherit",
  textAlign: align === "next" ? "right" : "left",
  minWidth: 0,
});

const tableWrap = { overflowX: "auto", marginTop: 14 };
const tableStyle = { width: "100%", borderCollapse: "collapse", fontSize: 13 };
const thStyle = {
  background: "linear-gradient(135deg,#123a49 0%,#0f766e 100%)",
  color: "#fff",
  padding: "9px 10px",
  textAlign: "start",
  fontWeight: 1000,
  border: "1px solid #0f766e",
};
const tdStyle = { padding: "9px 10px", border: "1px solid #e5ecea", verticalAlign: "top", color: "#334155", fontWeight: 650 };

const btnStyle = (variant = "primary") => {
  const map = {
    primary:   { bg: "linear-gradient(135deg,#0f766e,#14b8a6)", color: "#fff", border: "#0f766e" },
    secondary: { bg: "#fff", color: "#0f766e", border: "#dbe4e2" },
    warn:      { bg: "linear-gradient(180deg, #f59e0b, #d97706)", color: "#fff", border: "#b45309" },
    danger:    { bg: "linear-gradient(180deg, #ef4444, #dc2626)", color: "#fff", border: "#b91c1c" },
    success:   { bg: "linear-gradient(135deg,#16a34a,#0f766e)", color: "#fff", border: "#0f766e" },
  };
  const c = map[variant] || map.primary;
  return {
    background: c.bg,
    color: c.color,
    border: `1px solid ${c.border}`,
    padding: "8px 12px",
    borderRadius: 6,
    cursor: "pointer",
    fontWeight: 1000,
    fontSize: 13,
    whiteSpace: "nowrap",
    minHeight: 38,
    boxShadow: variant === "secondary" ? "0 10px 24px rgba(15,23,42,.05)" : "0 10px 20px rgba(15,23,42,.12)",
  };
};

const modalOverlay = {
  position: "fixed",
  inset: 0,
  background: "rgba(15,23,42,0.62)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  zIndex: 9999,
  padding: 16,
};

const modalCardStyle = {
  background: "#fff",
  borderRadius: 6,
  width: "100%",
  maxWidth: 720,
  maxHeight: "90vh",
  display: "flex",
  flexDirection: "column",
  overflow: "hidden",
  boxShadow: "0 24px 60px rgba(15,23,42,0.35)",
};

const fieldStyle = {
  width: "100%",
  padding: "9px 12px",
  borderRadius: 6,
  border: "1px solid #dbe4e2",
  fontSize: 13,
  fontWeight: 700,
  fontFamily: "inherit",
};

const labelStyle = {
  fontSize: 12,
  fontWeight: 1000,
  color: "#0f766e",
  display: "block",
  marginBottom: 4,
};

/* ==================== COMPONENTS ==================== */

function MetaBox({ t }) {
  const box = {
    minHeight: 40,
    border: "1px solid #e6ebf1",
    background: "#fff",
    borderRadius: 12,
    padding: "10px 14px",
    boxShadow: "0 6px 16px rgba(15,23,42,.05)",
    borderTop: "2px solid #0f766e",
  };
  return (
    <div style={docMetaStyle}>
      <div style={box}>
        <div style={metaItem}>{t("docNumber")}</div>
        <div style={metaVal}>{FSMS_META.referenceNumber}</div>
      </div>
      <div style={box}>
        <div style={metaItem}>{t("revision")}</div>
        <div style={metaVal}>Rev. {FSMS_META.revision}</div>
      </div>
      <div style={box}>
        <div style={metaItem}>{t("issueDate")}</div>
        <div style={metaVal}>{FSMS_META.date}</div>
      </div>
      <div style={box}>
        <div style={metaItem}>{t("standard")}</div>
        <div style={metaVal}>{FSMS_META.standard}</div>
      </div>
      <div style={box}>
        <div style={metaItem}>{t("company")}</div>
        <div style={metaVal}>{FSMS_META.brand}</div>
      </div>
    </div>
  );
}

function Sidebar({ activeId, onSelect, t, search, setSearch, bookmarks, lang }) {
  const [openChapters, setOpenChapters] = useState(() =>
    Object.fromEntries(FSMS_CHAPTERS.map((c) => [c.id, true]))
  );

  const filtered = useMemo(() => {
    if (!search.trim()) return ALL_SECTIONS;
    const q = search.toLowerCase();
    return ALL_SECTIONS.filter((s) => sectionSearchText(s).includes(q));
  }, [search]);

  function toggleChapter(id) {
    setOpenChapters((p) => ({ ...p, [id]: !p[id] }));
  }

  const bookmarkedSections = useMemo(
    () => ALL_SECTIONS.filter((s) => bookmarks.includes(s.id)),
    [bookmarks]
  );

  return (
    <aside className="fsms-manual-sidebar" style={sidebarStyle}>
      <input
        type="text"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder={t("searchPlaceholder")}
        style={searchInputStyle}
      />

      {/* Bookmarks group */}
      {bookmarkedSections.length > 0 && !search.trim() && (
        <>
          <div style={{
            fontSize: 11, fontWeight: 900, color: "#854d0e",
            padding: "8px 6px 4px", textTransform: "uppercase", letterSpacing: 0.5,
            display: "flex", alignItems: "center", gap: 6,
          }}>
            ⭐ {t("bookmarks")} ({bookmarkedSections.length})
          </div>
          {bookmarkedSections.map((s) => (
            <div
              key={"bm_" + s.id}
              onClick={() => onSelect(s.id)}
              style={{
                ...sectionItemStyle(activeId === s.id),
                background: activeId === s.id
                  ? "linear-gradient(90deg, #f59e0b, #d97706)"
                  : "rgba(254,243,199,0.6)",
                color: activeId === s.id ? "#fff" : "#854d0e",
                marginInlineStart: 12,
              }}
              title={lang === "ar" && s.titleAr ? s.titleAr : s.title}
            >
              ⭐ {s.clause ? `${s.clause} — ` : ""}
              {(lang === "ar" && s.titleAr ? s.titleAr : s.title).slice(0, 40)}
            </div>
          ))}
        </>
      )}

      <div style={{ fontSize: 11, fontWeight: 900, color: "#64748b", padding: "8px 6px 4px", textTransform: "uppercase", letterSpacing: 0.5 }}>
        {t("chapters")}
      </div>

      {FSMS_CHAPTERS.map((chap) => {
        const items = filtered.filter((s) => s.chapter === chap.id);
        if (search.trim() && items.length === 0) return null;
        const isOpen = openChapters[chap.id];
        const chapTitle = (lang === "ar" && chap.titleAr) ? chap.titleAr : chap.title;

        return (
          <div key={chap.id}>
            <div style={chapterStyle(false)} onClick={() => toggleChapter(chap.id)}>
              <span style={{ fontSize: 14 }}>{chap.icon}</span>
              <span style={{ flex: 1 }}>{chapTitle}</span>
              <span style={chapterCountStyle}>{items.length}</span>
              <span style={{ opacity: 0.45, fontSize: 10 }}>{isOpen ? "▼" : "▶"}</span>
            </div>
            {isOpen &&
              items.map((s, si) => {
                const active = activeId === s.id;
                const itemTitle = (lang === "ar" && s.titleAr) ? s.titleAr : s.title;
                const cl = s.clause || "";
                const chapAnnex = chap.annex ? (lang === "ar" ? chap.annexAr : chap.annex) : "";
                let label = itemTitle;
                if (cl && label.startsWith(cl)) {
                  label = label.slice(cl.length).replace(/^\s*[—-]?\s*/, "");
                }
                const shortLabel = label.length > 34 ? label.slice(0, 32) + "…" : label;
                return (
                  <div
                    key={s.id}
                    onClick={() => onSelect(s.id)}
                    style={sectionItemStyle(active)}
                    title={itemTitle}
                  >
                    {cl ? (
                      <span style={clauseChipStyle(active)}>{cl.length > 6 ? cl.slice(0, 6) : cl}</span>
                    ) : chapAnnex ? (
                      <span style={{ ...clauseChipStyle(active), minWidth: 34 }}>{chapAnnex}{si + 1}</span>
                    ) : (
                      <span style={{ ...clauseChipStyle(active), minWidth: 34 }}>§</span>
                    )}
                    {bookmarks.includes(s.id) && <span style={{ color: "#d97706", flexShrink: 0 }}>⭐</span>}
                    <span style={{ flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{shortLabel}</span>
                  </div>
                );
              })}
          </div>
        );
      })}

      {search.trim() && filtered.length === 0 && (
        <div style={{ padding: 14, color: "#94a3b8", fontSize: 12, textAlign: "center" }}>
          {t("noResults")}
        </div>
      )}
    </aside>
  );
}

/* Build a searchable text blob for a section (title, body, table cells,
   definitions, and the dynamic PRP/SOP list) so search covers table content. */
function tableSearchText(t) {
  if (!t) return "";
  const heads = Array.isArray(t.headers) ? t.headers.join(" ") : "";
  const rows = Array.isArray(t.rows) ? t.rows.map((r) => (Array.isArray(r) ? r.join(" ") : "")).join(" ") : "";
  return heads + " " + rows;
}
function sectionSearchText(s) {
  const parts = [s.title, s.titleAr, s.clause, s.body, s.bodyAr, tableSearchText(s.table), tableSearchText(s.tableAr)];
  if (Array.isArray(s.items)) parts.push(s.items.map((it) => (Array.isArray(it) ? it.join(" ") : "")).join(" "));
  if (Array.isArray(s.itemsAr)) parts.push(s.itemsAr.map((it) => (Array.isArray(it) ? it.join(" ") : "")).join(" "));
  if (s.prpSopTable) parts.push(sopsData.map((x) => `${x.number} ${x.title} ${x.titleAr || ""} ${x.docNo || ""}`).join(" "));
  return parts.filter(Boolean).join(" ").toLowerCase();
}

const sopBtnStyle = {
  background: "linear-gradient(90deg,#0ea5e9,#0284c7)", color: "#fff",
  border: "none", borderRadius: 6, padding: "5px 12px", fontSize: 12,
  fontWeight: 900, cursor: "pointer", whiteSpace: "nowrap",
};
const sopModalOverlay = {
  position: "fixed", inset: 0, background: "rgba(7,27,45,0.6)", backdropFilter: "blur(2px)",
  display: "flex", alignItems: "center", justifyContent: "center", zIndex: 99999, padding: 20,
};
const sopModalBox = {
  background: "#fff", borderRadius: 12, width: "min(760px, 96vw)", maxHeight: "88vh",
  display: "flex", flexDirection: "column", overflow: "hidden", boxShadow: "0 24px 70px rgba(2,32,54,0.45)",
};
const sopModalHeader = {
  background: "linear-gradient(90deg,#0f766e,#0e7490)", color: "#fff", padding: "14px 18px",
  display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12,
};
const sopModalClose = {
  background: "rgba(255,255,255,0.18)", color: "#fff", border: "none", borderRadius: 6,
  width: 30, height: 30, fontWeight: 1000, cursor: "pointer", flexShrink: 0, fontSize: 13,
};
const sopModalBody = { padding: "16px 20px", overflowY: "auto" };
const sopMetaRow = { display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 14 };
const sopMetaChip = {
  background: "#f1f5f9", color: "#334155", borderRadius: 20, padding: "3px 10px",
  fontSize: 12, fontWeight: 800,
};

function SopModal({ sop, lang, onClose }) {
  const ar = lang === "ar";
  useEffect(() => {
    const onKey = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);
  return (
    <div onClick={onClose} style={sopModalOverlay}>
      <div onClick={(e) => e.stopPropagation()} dir={ar ? "rtl" : "ltr"} style={sopModalBox}>
        <div style={sopModalHeader}>
          <div>
            <div style={{ fontSize: 12, fontWeight: 900, opacity: 0.9 }}>
              {sop.number}{sop.docNo ? ` · ${sop.docNo}` : ""}
            </div>
            <div style={{ fontSize: 17, fontWeight: 1000, marginTop: 2 }}>
              {ar && sop.titleAr ? sop.titleAr : sop.title}
            </div>
            {(sop.subtitle || sop.subtitleAr) && (
              <div style={{ fontSize: 12, opacity: 0.9, marginTop: 3 }}>
                {ar && sop.subtitleAr ? sop.subtitleAr : sop.subtitle}
              </div>
            )}
          </div>
          <button onClick={onClose} style={sopModalClose} aria-label="Close">✖</button>
        </div>
        <div style={sopModalBody}>
          <div style={sopMetaRow}>
            {sop.facility && <span style={sopMetaChip}>🏭 {ar && sop.facilityAr ? sop.facilityAr : sop.facility}</span>}
            {sop.revision && <span style={sopMetaChip}>Rev {sop.revision}</span>}
            {sop.issueDate && <span style={sopMetaChip}>📅 {sop.issueDate}</span>}
            {sop.category && <span style={sopMetaChip}>{ar && sop.categoryAr ? sop.categoryAr : sop.category}</span>}
          </div>
          {(sop.sections || []).map((sec, i) => (
            <div key={i} style={{ marginBottom: 12 }}>
              <div style={{ fontWeight: 1000, color: "#0f766e", fontSize: 13, marginBottom: 4 }}>
                {ar && sec.headingAr ? sec.headingAr : sec.heading}
              </div>
              <div style={{ fontSize: 13, color: "#1e293b", lineHeight: 1.7, whiteSpace: "pre-wrap" }}>
                {ar && sec.contentAr ? sec.contentAr : sec.content}
              </div>
            </div>
          ))}
          {!(sop.sections && sop.sections.length) && (
            <div style={{ fontSize: 13, color: "#64748b" }}>{ar ? "لا يوجد محتوى تفصيلي لهذا الإجراء." : "No detailed content available for this SOP."}</div>
          )}
        </div>
      </div>
    </div>
  );
}

function PrpSopTable({ lang }) {
  const [openSop, setOpenSop] = useState(null);
  const ar = lang === "ar";
  return (
    <div style={tableWrap}>
      <table style={tableStyle}>
        <thead>
          <tr>
            <th style={thStyle}>SOP</th>
            <th style={thStyle}>{ar ? "الإجراء" : "Procedure"}</th>
            <th style={thStyle}>{ar ? "رقم الوثيقة" : "Document No."}</th>
            <th style={thStyle}>{ar ? "الإجراء المرجعي" : "SOP"}</th>
          </tr>
        </thead>
        <tbody>
          {sopsData.map((sop, i) => (
            <tr key={sop.id} style={{ background: i % 2 ? "#f8fafc" : "#fff" }}>
              <td style={{ ...tdStyle, fontWeight: 900, whiteSpace: "nowrap" }}>{sop.number}</td>
              <td style={tdStyle}>{ar && sop.titleAr ? sop.titleAr : sop.title}</td>
              <td style={{ ...tdStyle, whiteSpace: "nowrap", color: "#64748b", fontSize: 12 }}>{sop.docNo || "—"}</td>
              <td style={{ ...tdStyle, textAlign: "center" }}>
                <button onClick={() => setOpenSop(sop)} style={sopBtnStyle} title={ar ? "افتح الإجراء في نافذة" : "Open SOP in a popup"}>
                  📄 {ar ? "افتح" : "Open"}
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {openSop && <SopModal sop={openSop} lang={lang} onClose={() => setOpenSop(null)} />}
    </div>
  );
}

function SectionTable({ table, tableAr, lang }) {
  const T = (lang === "ar" && tableAr && tableAr.headers && tableAr.rows) ? tableAr : table;
  if (!T || !T.headers || !T.rows) return null;
  return (
    <div style={tableWrap}>
      <table style={tableStyle}>
        <thead>
          <tr>
            {T.headers.map((h, i) => (
              <th key={i} style={thStyle}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {T.rows.map((row, ri) => (
            <tr key={ri} style={{ background: ri % 2 ? "#f8fafc" : "#fff" }}>
              {row.map((cell, ci) => (
                <td key={ci} style={tdStyle}>{cell}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ImageGallery({ images, lang }) {
  const [zoomImg, setZoomImg] = useState(null);
  if (!images?.length) return null;
  return (
    <>
      <div style={{
        marginTop: 14,
        display: "grid",
        gridTemplateColumns: images.length === 1 ? "1fr" : "repeat(auto-fit, minmax(260px, 1fr))",
        gap: 10,
      }}>
        {images.map((img, i) => (
          <figure key={i} style={{
            margin: 0,
            background: "#f8fafc",
            border: "1px solid #e2e8f0",
          borderRadius: 6,
            padding: 8,
            cursor: "zoom-in",
            transition: "transform .12s ease, box-shadow .12s ease",
          }}
          onMouseEnter={(e) => { e.currentTarget.style.boxShadow = "0 8px 22px rgba(2,132,199,0.18)"; }}
          onMouseLeave={(e) => { e.currentTarget.style.boxShadow = "none"; }}
          onClick={() => setZoomImg(img)}
          >
            <img
              src={img.src}
              alt={img.alt || ""}
              style={{ width: "100%", height: "auto", borderRadius: 6, display: "block" }}
              loading="lazy"
            />
            {(img.caption || img.captionAr) && (
              <figcaption style={{
                marginTop: 6, fontSize: 12, fontWeight: 800, color: "#475569", textAlign: "center",
              }}>
                {(lang === "ar" && img.captionAr) ? img.captionAr : img.caption}
              </figcaption>
            )}
          </figure>
        ))}
      </div>

      {zoomImg && (
        <div
          onClick={() => setZoomImg(null)}
          style={{
            position: "fixed", inset: 0, background: "rgba(7,27,45,0.92)",
            display: "flex", alignItems: "center", justifyContent: "center",
            zIndex: 99999, padding: 20, cursor: "zoom-out",
          }}
        >
          <img src={zoomImg.src} alt={zoomImg.alt || ""} style={{ maxWidth: "95%", maxHeight: "95vh", borderRadius: 8, boxShadow: "0 20px 60px rgba(0,0,0,0.6)" }} />
          <button
            onClick={(e) => { e.stopPropagation(); setZoomImg(null); }}
            style={{
              position: "fixed", top: 16, insetInlineEnd: 16,
              background: "#fff", color: "#0f766e",
              border: "1px solid #dbe4e2", borderRadius: 6,
              padding: "8px 12px", fontWeight: 1000, cursor: "pointer", fontSize: 14,
            }}
          >
            ✖ Close
          </button>
        </div>
      )}
    </>
  );
}

function DefinitionsList({ items, itemsAr, lang }) {
  const list = (lang === "ar" && Array.isArray(itemsAr) && itemsAr.length) ? itemsAr : items;
  if (!list?.length) return null;
  return (
    <dl style={{ marginTop: 14, display: "grid", gap: 10 }}>
      {list.map(([term, def], i) => (
        <div key={i} style={{
          padding: "10px 14px",
          background: "#f8fafc",
          borderInlineStart: "3px solid #0f766e",
          borderRadius: 6,
        }}>
          <dt style={{ fontWeight: 1000, color: "#0f766e", fontSize: 13, marginBottom: 4 }}>{term}</dt>
          <dd style={{ margin: 0, fontSize: 13, color: "#1e293b", lineHeight: 1.6 }}>{def}</dd>
        </div>
      ))}
    </dl>
  );
}

function SignatureBlocks({ signatures = [], compact = false, pinnedBottom = false }) {
  if (!Array.isArray(signatures) || !signatures.length) return null;
  return (
    <div style={{
      marginTop: pinnedBottom ? "auto" : (compact ? 12 : 18),
      paddingTop: compact ? 10 : 14,
      borderTop: "1px solid #e5ecea",
      display: "flex",
      flexDirection: "column",
      alignItems: "flex-end",
    }}>
      <div style={{
        fontSize: compact ? 10 : 12,
        fontWeight: 950,
        color: "#0f766e",
        marginBottom: 8,
        letterSpacing: 0,
        alignSelf: "stretch",
      }}>
        Controlled page signatures
      </div>
      <div style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "flex-end",
        gap: 10,
        width: "100%",
      }}>
        {signatures.map((sig) => (
          <div key={sig.id || `${sig.name}-${sig.signedAt}`} style={{
            border: "1px solid #dbe4e2",
            borderRadius: 6,
            padding: compact ? 8 : 10,
            background: "#f8fbfa",
            breakInside: "avoid",
            width: "min(100%, 320px)",
            textAlign: "right",
          }}>
            {sig.image && (
              <img
                src={sig.image}
                alt={`${sig.name || "Signer"} signature`}
                style={{
                  width: "100%",
                  maxHeight: compact ? 58 : 72,
                  objectFit: "contain",
                  background: "#fff",
                  border: "1px solid #e5ecea",
                  borderRadius: 6,
                  marginBottom: 7,
                }}
              />
            )}
            <div style={{ fontSize: compact ? 10 : 12, fontWeight: 950, color: "#0f172a" }}>{sig.name || "Signed"}</div>
            <div style={{ fontSize: compact ? 9 : 11, color: "#475569", fontWeight: 800 }}>{sig.role || "FSMS authorized user"}</div>
            <div style={{ fontSize: compact ? 9 : 11, color: "#64748b", marginTop: 4 }}>
              {sig.date || (sig.signedAt ? new Date(sig.signedAt).toLocaleString() : "")}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function EditModal({ section, onClose, onSave, onReset, t }) {
  const [title, setTitle] = useState(section.title);
  const [body, setBody] = useState(section.body || "");
  const [signatures, setSignatures] = useState(() => Array.isArray(section.signatures) ? section.signatures : []);
  const [changeReason, setChangeReason] = useState("");
  const [revisionBefore, setRevisionBefore] = useState(FSMS_META.revision || "");
  const [revisionAfter, setRevisionAfter] = useState("");
  const [approvedBy, setApprovedBy] = useState(FSMS_META.approved?.name || "");
  const [effectiveDate, setEffectiveDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [changedBy, setChangedBy] = useState("admin");
  const [sigName, setSigName] = useState("");
  const [sigRole, setSigRole] = useState("");
  const [sigDate, setSigDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [sigImage, setSigImage] = useState("");

  function validateChangeControl() {
    if (!changeReason.trim()) return { ok: false, message: "Reason for amendment is required before saving." };
    if (!revisionBefore.trim()) return { ok: false, message: "Revision before is required before saving." };
    if (!revisionAfter.trim()) return { ok: false, message: "Revision after is required before saving." };
    if (!approvedBy.trim()) return { ok: false, message: "Approved by is required before saving." };
    if (!effectiveDate) return { ok: false, message: "Effective date is required before saving." };
    if (!changedBy.trim()) return { ok: false, message: "Changed by is required before saving." };
    return { ok: true };
  }

  function validatePendingSignature() {
    if (!sigImage) return { ok: true };
    if (!sigName.trim()) return { ok: false, message: "Signer name is required before saving the signature." };
    if (!sigRole.trim()) return { ok: false, message: "Signer role is required before saving the signature." };
    if (!sigDate) return { ok: false, message: "Signature date is required before saving the signature." };
    return { ok: true };
  }

  function makePendingSignature() {
    if (!sigImage) return null;
    const now = new Date().toISOString();
    return {
      id: `sig-${Date.now()}`,
      name: sigName.trim(),
      role: sigRole.trim(),
      date: sigDate || now.slice(0, 10),
      signedAt: now,
      image: sigImage,
    };
  }

  function handleSave() {
    const changeValidation = validateChangeControl();
    if (!changeValidation.ok) {
      alert(changeValidation.message);
      return;
    }
    const validation = validatePendingSignature();
    if (!validation.ok) {
      alert(validation.message);
      return;
    }
    const pending = makePendingSignature();
    onSave({
      title,
      body,
      signatures: pending ? [...signatures, pending] : signatures,
      changeControl: {
        reason: changeReason.trim(),
        revisionBefore: revisionBefore.trim(),
        revisionAfter: revisionAfter.trim(),
        approvedBy: approvedBy.trim(),
        effectiveDate,
        changedBy: changedBy.trim(),
      },
    });
  }

  function addSignature() {
    if (!sigImage) {
      alert("Please draw a signature before adding it.");
      return;
    }
    const validation = validatePendingSignature();
    if (!validation.ok) {
      alert(validation.message);
      return;
    }
    const pending = makePendingSignature();
    setSignatures((prev) => [...prev, pending]);
    setSigImage("");
    setSigName("");
    setSigRole("");
  }

  function removeSignature(id) {
    setSignatures((prev) => prev.filter((sig) => sig.id !== id));
  }

  function handleResetClick() {
    onReset(section);
  }

  return (
    <div style={modalOverlay} onClick={onClose}>
      <div style={modalCardStyle} onClick={(e) => e.stopPropagation()}>
        <div style={{
          padding: "14px 18px",
          background: "linear-gradient(135deg,#123a49 0%,#0f766e 48%,#2aa8c4 100%)",
          color: "#fff",
          fontWeight: 1000,
          fontSize: 15,
        }}>
          {t("editTitle")} — {section.clause}
        </div>

        <div style={{ padding: 18, overflowY: "auto", flex: 1 }}>
          <div style={{ fontSize: 12, color: "#64748b", marginBottom: 12 }}>{t("editHint")}</div>

          <label style={labelStyle}>
            {t("titleLabel")}
          </label>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            style={{ ...fieldStyle, fontSize: 14, marginBottom: 14 }}
          />

          <label style={labelStyle}>
            {t("bodyLabel")}
          </label>
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            style={{
              width: "100%",
              minHeight: 320,
              padding: "10px 12px",
              borderRadius: 6,
              border: "1px solid #dbe4e2",
              fontSize: 13,
              lineHeight: 1.7,
              fontFamily: "inherit",
              resize: "vertical",
            }}
          />

          <div style={{
            marginTop: 16,
            padding: 14,
            borderRadius: 6,
            border: "1px solid #99f6e4",
            background: "linear-gradient(180deg,#f0fdfa,#ffffff)",
          }}>
            <div style={{ fontWeight: 1000, color: "#0f766e", marginBottom: 10 }}>
              Controlled change record
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 10 }}>
              <div style={{ gridColumn: "1 / -1" }}>
                <label style={labelStyle}>Reason for amendment</label>
                <textarea
                  value={changeReason}
                  onChange={(e) => setChangeReason(e.target.value)}
                  style={{ ...fieldStyle, minHeight: 74, resize: "vertical", lineHeight: 1.5 }}
                  placeholder="Why is this manual section being changed?"
                />
              </div>
              <div>
                <label style={labelStyle}>Revision before</label>
                <input value={revisionBefore} onChange={(e) => setRevisionBefore(e.target.value)} style={fieldStyle} placeholder="2.1" />
              </div>
              <div>
                <label style={labelStyle}>Revision after</label>
                <input value={revisionAfter} onChange={(e) => setRevisionAfter(e.target.value)} style={fieldStyle} placeholder="2.2" />
              </div>
              <div>
                <label style={labelStyle}>Approved by</label>
                <input value={approvedBy} onChange={(e) => setApprovedBy(e.target.value)} style={fieldStyle} placeholder="Authorized approver" />
              </div>
              <div>
                <label style={labelStyle}>Effective date</label>
                <input type="date" value={effectiveDate} onChange={(e) => setEffectiveDate(e.target.value)} lang="en-CA" dir="ltr" style={fieldStyle} />
              </div>
              <div>
                <label style={labelStyle}>Changed by</label>
                <input value={changedBy} onChange={(e) => setChangedBy(e.target.value)} style={fieldStyle} placeholder="admin" />
              </div>
            </div>
            <div style={{ marginTop: 8, fontSize: 12, color: "#0f766e", fontWeight: 900 }}>
              Saving this section will also create a verified record in Change Management Log.
            </div>
          </div>

          <div style={{
            marginTop: 16,
            padding: 14,
            borderRadius: 6,
            border: "1px solid #dbe4e2",
            background: "linear-gradient(180deg,#f8fbfa,#ffffff)",
          }}>
            <div style={{ fontWeight: 1000, color: "#0f766e", marginBottom: 10 }}>
              Add page signature
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 10, marginBottom: 12 }}>
              <div>
                <label style={labelStyle}>Signer name</label>
                <input value={sigName} onChange={(e) => setSigName(e.target.value)} style={fieldStyle} placeholder="Name" />
              </div>
              <div>
                <label style={labelStyle}>Role / position</label>
                <input value={sigRole} onChange={(e) => setSigRole(e.target.value)} style={fieldStyle} placeholder="Quality / Management" />
              </div>
              <div>
                <label style={labelStyle}>Date</label>
                <input type="date" value={sigDate} onChange={(e) => setSigDate(e.target.value)} lang="en-CA" dir="ltr" style={fieldStyle} />
              </div>
            </div>
            <SignaturePad
              value={sigImage}
              onChange={setSigImage}
              width={420}
              height={120}
              label="Signature"
            />
            <div style={{ marginTop: 10, display: "flex", justifyContent: "flex-end" }}>
              <button type="button" style={btnStyle("primary")} onClick={addSignature}>
                Add signature now
              </button>
            </div>
            {sigImage && (
              <div style={{ marginTop: 8, fontSize: 12, color: "#0f766e", fontWeight: 900 }}>
                Signature is ready. You can press Save directly and it will appear on this page.
              </div>
            )}
            <SignatureBlocks signatures={signatures} />
            {signatures.length > 0 && (
              <div style={{ display: "grid", gap: 6, marginTop: 10 }}>
                {signatures.map((sig) => (
                  <button
                    key={sig.id}
                    type="button"
                    style={{ ...btnStyle("danger"), justifySelf: "start", padding: "5px 10px", fontSize: 11 }}
                    onClick={() => removeSignature(sig.id)}
                  >
                    Remove {sig.name || "signature"}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        <div style={{
          padding: "12px 18px",
          borderTop: "1px solid #e2e8f0",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 8,
        }}>
          <div>
            {!!section.isEdited && (
              <button type="button" style={btnStyle("warn")} onClick={handleResetClick}>
                {t("reset")}
              </button>
            )}
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button style={btnStyle("secondary")} onClick={onClose}>{t("cancel")}</button>
            <button style={btnStyle("success")} onClick={handleSave}>{t("save")}</button>
          </div>
        </div>
      </div>
    </div>
  );
}

function SectionView({ section, override, onEdit, t, lang, search, isBookmarked, onToggleBookmark, onNavigate }) {
  const navigate = useNavigate();
  const isEdited = !!override;

  const idx = ALL_SECTIONS.findIndex((s) => s.id === section.id);
  const prevSection = idx > 0 ? ALL_SECTIONS[idx - 1] : null;
  const nextSection = idx >= 0 && idx < ALL_SECTIONS.length - 1 ? ALL_SECTIONS[idx + 1] : null;
  const navLabel = (s) => (lang === "ar" && s.titleAr ? s.titleAr : s.title);

  // Pick the right body for the chosen language
  const defaultBody = (lang === "ar" && section.bodyAr) ? section.bodyAr : (section.body || "");
  const display = {
    ...section,
    title: override?.title ?? ((lang === "ar" && section.titleAr) ? section.titleAr : section.title),
    body: override?.body ?? defaultBody,
    signatures: Array.isArray(override?.signatures) ? override.signatures : [],
  };

  const link = FSMS_MODULE_LINKS[section.clause] || FSMS_MODULE_LINKS[section.chapter];

  return (
    <article style={contentStyle}>
      {/* Title row */}
      <div style={{ display: "flex", alignItems: "flex-start", gap: 12, flexWrap: "wrap", paddingBottom: 18, borderBottom: "1px solid #eef2f6", marginBottom: 2 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <h2 style={sectionTitleStyle}>
            <HighlightedText text={display.title} query={search} />
          </h2>
          <div style={{ marginTop: 4, display: "flex", flexWrap: "wrap", alignItems: "center", gap: 4 }}>
            {section.clause && (
              <span style={clauseBadgeStyle}>{t("clause")} {section.clause}</span>
            )}
            {!section.clause && (() => {
              const ch = FSMS_CHAPTERS.find((c) => c.id === section.chapter);
              if (!ch?.annex) return null;
              return (
                <span style={clauseBadgeStyle}>
                  {lang === "ar" ? `ملحق ${ch.annexAr}` : `Annex ${ch.annex}`}
                </span>
              );
            })()}
            {link && (
              <span
                style={linkedBadgeStyle}
                onClick={() => navigate(link.route)}
                title={link.label}
              >
                {t("relatedModule")} {link.label} {t("openModule")}
              </span>
            )}
            {isEdited && <span style={editedBadgeStyle}>{t("edited")}</span>}
          </div>
        </div>
        <div style={{ display: "flex", gap: 6 }}>
          <button
            style={{
              ...btnStyle(isBookmarked ? "warn" : "secondary"),
              padding: "7px 12px",
            }}
            onClick={() => onToggleBookmark(section.id)}
            title={isBookmarked ? t("removeBookmark") : t("addBookmark")}
          >
            {isBookmarked ? "★" : "☆"}
          </button>
          <button style={btnStyle("primary")} onClick={() => onEdit(section)}>
            {t("edit")}
          </button>
        </div>
      </div>

      {/* Body */}
      {display.body && (
        <div style={bodyTextStyle}>
          <HighlightedText text={display.body} query={search} />
        </div>
      )}

      {/* Type-specific renders */}
      {section.type === "definitions" && <DefinitionsList items={section.items} itemsAr={section.itemsAr} lang={lang} />}
      {section.table && <SectionTable table={section.table} tableAr={section.tableAr} lang={lang} />}
      {section.prpSopTable && <PrpSopTable lang={lang} />}
      {section.processFlows && <ProcessFlowGallery flows={section.processFlows} lang={lang} />}
      {section.images && <ImageGallery images={section.images} lang={lang} />}
      <SignatureBlocks signatures={display.signatures} pinnedBottom />

      {onNavigate && (prevSection || nextSection) && (
        <nav style={navStyle}>
          {prevSection ? (
            <button type="button" style={navBtnStyle("prev")} onClick={() => onNavigate(prevSection.id)} title={navLabel(prevSection)}>
              <span style={{ fontSize: 11, fontWeight: 900, color: "#0f766e" }}>← {lang === "ar" ? "السابق" : "Previous"}</span>
              <span style={{ fontSize: 13, fontWeight: 900, color: "#0f172a", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: "100%" }}>
                {prevSection.clause ? `${prevSection.clause} · ` : ""}{navLabel(prevSection)}
              </span>
            </button>
          ) : <span />}
          {nextSection ? (
            <button type="button" style={navBtnStyle("next")} onClick={() => onNavigate(nextSection.id)} title={navLabel(nextSection)}>
              <span style={{ fontSize: 11, fontWeight: 900, color: "#0f766e" }}>{lang === "ar" ? "التالي" : "Next"} →</span>
              <span style={{ fontSize: 13, fontWeight: 900, color: "#0f172a", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: "100%" }}>
                {nextSection.clause ? `${nextSection.clause} · ` : ""}{navLabel(nextSection)}
              </span>
            </button>
          ) : <span />}
        </nav>
      )}
    </article>
  );
}

function getDisplaySection(section, override, lang) {
  const defaultBody = (lang === "ar" && section.bodyAr) ? section.bodyAr : (section.body || "");
  return {
    ...section,
    title: override?.title ?? ((lang === "ar" && section.titleAr) ? section.titleAr : section.title),
    body: override?.body ?? defaultBody,
    signatures: Array.isArray(override?.signatures) ? override.signatures : [],
  };
}

function ExportSection({ section, override, lang }) {
  const display = getDisplaySection(section, override, lang);
  return (
    <section
      data-export-section={section.id}
      style={{
        width: EXPORT_PAGE.width,
        minHeight: EXPORT_PAGE.minHeight,
        background: "#ffffff",
        color: "#0f172a",
        padding: "34px 38px",
        fontFamily: 'Arial, "Segoe UI", Tahoma, sans-serif',
        boxSizing: "border-box",
        border: "1px solid #e2e8f0",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <header style={{
        display: "grid",
        gridTemplateColumns: "64px 1fr",
        gap: 14,
        alignItems: "center",
        borderBottom: "3px solid #0f766e",
        paddingBottom: 12,
        marginBottom: 18,
      }}>
        <img src={mawashiLogo} alt="Al Mawashi" style={{ width: 58, height: 58, objectFit: "cover", borderRadius: 6 }} />
        <div>
          <div style={{ fontSize: 18, fontWeight: 900, color: "#0f172a" }}>{FSMS_META.title}</div>
          <div style={{ fontSize: 10, color: "#475569", marginTop: 4, fontWeight: 700 }}>
            {FSMS_META.referenceNumber} | Rev. {FSMS_META.revision} | {FSMS_META.date} | {FSMS_META.standard}
          </div>
        </div>
      </header>

      <div style={{
        display: "flex",
        gap: 8,
        alignItems: "center",
        marginBottom: 10,
        color: "#0f766e",
        fontSize: 11,
        fontWeight: 900,
      }}>
        <span style={{ border: "1px solid #99f6e4", background: "#f0fdfa", borderRadius: 999, padding: "4px 10px" }}>
          Clause {display.clause || display.id}
        </span>
        {override && (
          <span style={{ border: "1px solid #fde68a", background: "#fffbeb", color: "#92400e", borderRadius: 999, padding: "4px 10px" }}>
            Controlled override
          </span>
        )}
      </div>
      <h1 style={{ fontSize: 24, lineHeight: 1.2, color: "#0f172a", margin: "0 0 12px", fontWeight: 900 }}>
        {display.title}
      </h1>
      {display.body && (
        <div style={{ whiteSpace: "pre-wrap", fontSize: 12.2, lineHeight: 1.65, color: "#1f2937", marginBottom: 12 }}>
          {display.body}
        </div>
      )}
      {section.type === "definitions" && <DefinitionsList items={section.items} itemsAr={section.itemsAr} lang={lang} />}
      {section.table && <SectionTable table={section.table} tableAr={section.tableAr} lang={lang} />}
      {section.prpSopTable && <PrpSopTable lang={lang} />}
      {section.processFlows && <ProcessFlowGallery flows={section.processFlows} lang={lang} printMode />}
      {section.images?.length > 0 && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 10, marginTop: 14 }}>
          {section.images.map((img, i) => (
            <img key={i} src={img.src} alt={img.alt || ""} style={{ width: "100%", border: "1px solid #e2e8f0", borderRadius: 8 }} />
          ))}
        </div>
      )}
      <SignatureBlocks signatures={display.signatures} compact pinnedBottom />
      <footer style={{
        marginTop: 20,
        paddingTop: 10,
        borderTop: "1px solid #e2e8f0",
        display: "flex",
        justifyContent: "space-between",
        fontSize: 9,
        color: "#64748b",
        fontWeight: 700,
      }}>
        <span>Controlled FSMS Manual</span>
        <span>Printed/exported: {new Date().toLocaleString()}</span>
      </footer>
    </section>
  );
}

function ExportCanvas({ sections, overrides, lang, exportRootRef }) {
  return (
    <div
      ref={exportRootRef}
      aria-hidden="true"
      style={{
        position: "fixed",
        left: -12000,
        top: 0,
        width: EXPORT_PAGE.width,
        background: "#fff",
        zIndex: -1,
      }}
    >
      {sections.map((section) => (
        <ExportSection
          key={section.id}
          section={section}
          override={overrides[section.id]}
          lang={lang}
        />
      ))}
    </div>
  );
}

/* ==================== MAIN COMPONENT ==================== */
export default function FSMSManualView() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { lang, t, toggle, dir } = useLang();
  const exportRootRef = useRef(null);

  const initialSection = searchParams.get("section") || ALL_SECTIONS[0]?.id;
  const [activeId, setActiveId] = useState(initialSection);
  const [overrides, setOverrides] = useState({});
  const [bookmarks, setBookmarks] = useState([]);
  const [search, setSearch] = useState("");
  const [editingSection, setEditingSection] = useState(null);
  const [savingState, setSavingState] = useState(""); // "" | "saving" | "saved" | "error"
  const [exportSections, setExportSections] = useState([]);
  const [exporting, setExporting] = useState("");

  /* Load overrides + bookmarks from server on mount */
  useEffect(() => {
    let alive = true;
    fetchOverrides().then((ov) => { if (alive) setOverrides(ov); });
    fetchBookmarks().then((bm) => { if (alive) setBookmarks(Array.isArray(bm) ? bm : []); });
    return () => { alive = false; };
  }, []);

  async function toggleBookmark(sectionId) {
    const next = bookmarks.includes(sectionId)
      ? bookmarks.filter((id) => id !== sectionId)
      : [...bookmarks, sectionId];
    setSavingState("saving");
    try {
      await saveBookmarksToServer(next);
      setBookmarks(next);
      setSavingState("saved");
      setTimeout(() => setSavingState(""), 1500);
    } catch (e) {
      setSavingState("error");
      alert(t("saveError") + ": " + (e?.message || e));
    }
  }

  const activeSection = useMemo(
    () => ALL_SECTIONS.find((s) => s.id === activeId) || ALL_SECTIONS[0],
    [activeId]
  );

  /* Sync URL ?section=… */
  useEffect(() => {
    if (activeId && searchParams.get("section") !== activeId) {
      const sp = new URLSearchParams(searchParams);
      sp.set("section", activeId);
      setSearchParams(sp, { replace: true });
    }
  }, [activeId]); // eslint-disable-line

  function handleSelect(id) {
    setActiveId(id);
    /* Scroll content area to top */
    try { window.scrollTo({ top: 0, behavior: "smooth" }); } catch {}
  }

  function handleEdit(section) {
    const ov = overrides[section.id] || {};
    setEditingSection({
      ...section,
      title: ov.title ?? section.title,
      body: ov.body ?? section.body,
      signatures: Array.isArray(ov.signatures) ? ov.signatures : [],
      isEdited: !!overrides[section.id],
    });
  }

  async function handleSaveEdit({ title, body, signatures, changeControl }) {
    if (!editingSection) return;
    const original = ALL_SECTIONS.find((s) => s.id === editingSection.id);
    const next = { ...overrides };
    const cleanSignatures = Array.isArray(signatures) ? signatures.filter((sig) => sig?.image) : [];

    const isDifferent =
      title !== original.title || body !== (original.body ?? "") || cleanSignatures.length > 0;

    if (isDifferent) {
      next[editingSection.id] = {
        title,
        body,
        signatures: cleanSignatures,
        editedAt: new Date().toISOString(),
        changeControl,
      };
    } else {
      delete next[editingSection.id];
    }

    setSavingState("saving");
    try {
      await saveOverridesToServer(next);
      if (isDifferent && changeControl) {
        await saveManualChangeLog({ section: original || editingSection, changeControl });
      }
      setOverrides(next);
      setEditingSection(null);
      setSavingState("saved");
      setTimeout(() => setSavingState(""), 1800);
    } catch (e) {
      setSavingState("error");
      alert(t("saveError") + ": " + (e?.message || e));
    }
  }

  async function handleReset(section) {
    if (!window.confirm(t("confirmReset"))) return;
    const next = { ...overrides };
    delete next[section.id];
    setSavingState("saving");
    try {
      await saveOverridesToServer(next);
      setOverrides(next);
      setSavingState("saved");
      setTimeout(() => setSavingState(""), 1800);
    } catch (e) {
      setSavingState("error");
      alert(t("saveError") + ": " + (e?.message || e));
    }
  }

  async function appendNodeToPdf(pdf, node, isFirstPage) {
    const canvas = await html2canvas(node, {
      scale: 2,
      useCORS: true,
      allowTaint: true,
      backgroundColor: "#ffffff",
      logging: false,
      windowWidth: EXPORT_PAGE.width,
    });
    const pageW = pdf.internal.pageSize.getWidth();
    const pageH = pdf.internal.pageSize.getHeight();
    const margin = 22;
    const imgW = pageW - margin * 2;
    const ratio = imgW / canvas.width;
    const slicePxH = Math.floor((pageH - margin * 2) / ratio);
    let y = 0;
    let first = isFirstPage;

    while (y < canvas.height) {
      const h = Math.min(slicePxH, canvas.height - y);
      const slice = document.createElement("canvas");
      slice.width = canvas.width;
      slice.height = h;
      const ctx = slice.getContext("2d");
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, slice.width, slice.height);
      ctx.drawImage(canvas, 0, y, canvas.width, h, 0, 0, canvas.width, h);
      if (!first) pdf.addPage("a4", "p");
      pdf.addImage(slice.toDataURL("image/jpeg", 0.96), "JPEG", margin, margin, imgW, h * ratio);
      first = false;
      y += h;
    }
  }

  async function exportPdf(scope) {
    const sections = scope === "all" ? ALL_SECTIONS : [activeSection].filter(Boolean);
    if (!sections.length) return;
    setExporting(scope);
    setExportSections(sections);
    try {
      await new Promise((resolve) => setTimeout(resolve, 120));
      const root = exportRootRef.current;
      const nodes = sections
        .map((section) => root?.querySelector(`[data-export-section="${CSS.escape(section.id)}"]`))
        .filter(Boolean);
      if (!nodes.length) throw new Error("Export layout was not ready.");
      const pdf = new jsPDF("p", "pt", "a4");
      let first = true;
      for (const node of nodes) {
        await appendNodeToPdf(pdf, node, first);
        first = false;
      }
      const stamp = new Date().toISOString().slice(0, 10);
      const suffix = scope === "all" ? "FULL" : (activeSection?.id || "SECTION");
      pdf.save(`TELT-FSMS-MN-01_${suffix}_${stamp}.pdf`);
    } catch (e) {
      console.error("[FSMS PDF export]", e);
      alert(`PDF export failed: ${e?.message || e}`);
    } finally {
      setExporting("");
      setExportSections([]);
    }
  }

  return (
    <main style={{ ...shellStyle, direction: dir }}>
      <style>{`
        @media (max-width: 980px) {
          .fsms-manual-layout {
            grid-template-columns: 1fr !important;
          }
          .fsms-manual-sidebar {
            position: relative !important;
            top: auto !important;
            height: auto !important;
            max-height: 42vh;
          }
        }
        @media (min-width: 1500px) {
          .fsms-manual-layout {
            grid-template-columns: 360px minmax(0, 1fr) !important;
          }
        }
      `}</style>
      <div style={layoutStyle}>
        {/* Top bar */}
        <div style={topBarStyle}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <img
              src={mawashiLogo}
              alt="Al Mawashi Logo"
              style={{ width: 58, height: 58, borderRadius: 6, objectFit: "cover", border: "1px solid rgba(255,255,255,.5)", background: "#fff" }}
            />
            <div>
              <div style={titleStyle}>{t("pageTitle")}</div>
              <div style={subStyle}>{t("pageSubtitle")}</div>
            </div>
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
            {savingState === "saving" && (
              <span style={{ fontSize: 12, fontWeight: 900, color: "#ccfbf1" }}>{t("saving")}</span>
            )}
            {savingState === "saved" && (
              <span style={{ fontSize: 12, fontWeight: 800, color: "#15803d" }}>{t("saved")}</span>
            )}
            {savingState === "error" && (
              <span style={{ fontSize: 12, fontWeight: 800, color: "#b91c1c" }}>{t("saveError")}</span>
            )}
            <LangToggle lang={lang} toggle={toggle} />
            <button style={btnStyle("secondary")} onClick={() => window.print()}>
              {t("print")}
            </button>
            <button style={btnStyle("success")} onClick={() => exportPdf("section")} disabled={!!exporting}>
              {exporting === "section" ? "Exporting..." : "PDF section"}
            </button>
            <button style={btnStyle("primary")} onClick={() => exportPdf("all")} disabled={!!exporting}>
              {exporting === "all" ? "Exporting..." : "Full PDF"}
            </button>
            <button style={btnStyle("secondary")} onClick={() => navigate("/haccp-iso")}>
              {t("backToHub")}
            </button>
          </div>
        </div>

        {/* Doc meta strip */}
        <MetaBox t={t} />

        {/* Layout: Sidebar + Content */}
        <div className="fsms-manual-layout" style={containerStyle}>
          <Sidebar
            activeId={activeId}
            onSelect={handleSelect}
            t={t}
            search={search}
            setSearch={setSearch}
            bookmarks={bookmarks}
            lang={lang}
          />
          {activeSection ? (
            <SectionView
              section={activeSection}
              override={overrides[activeSection.id]}
              onEdit={handleEdit}
              t={t}
              lang={lang}
              search={search}
              isBookmarked={bookmarks.includes(activeSection.id)}
              onToggleBookmark={toggleBookmark}
              onNavigate={handleSelect}
            />
          ) : (
            <div style={contentStyle}>{t("selectSection")}</div>
          )}
        </div>

        {/* Footer */}
        <div style={{ marginTop: 14, fontSize: 12, color: "#64748b", textAlign: "center", fontWeight: 800 }}>
          © Al Mawashi — {t("masterDocument")} • {t("auditReady")}
        </div>
      </div>

      {/* Edit Modal */}
      {editingSection && (
        <EditModal
          section={editingSection}
          onClose={() => setEditingSection(null)}
          onSave={handleSaveEdit}
          onReset={handleReset}
          t={t}
        />
      )}
      {exportSections.length > 0 && (
        <ExportCanvas
          sections={exportSections}
          overrides={overrides}
          lang={lang}
          exportRootRef={exportRootRef}
        />
      )}
    </main>
  );
}
