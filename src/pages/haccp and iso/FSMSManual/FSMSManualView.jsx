// src/pages/haccp and iso/FSMSManual/FSMSManualView.jsx
// HACCP Manual — Main viewer (sidebar + content + edit)
// Edits are saved on the server (shared) — no local storage.

import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import mawashiLogo from "../../../assets/almawashi-logo.jpg";
import API_BASE from "../../../config/api";
import {
  FSMS_META,
  FSMS_CHAPTERS,
  FSMS_SECTIONS,
  FSMS_MODULE_LINKS,
} from "./fsmsContent";
import { FSMS_HACCP_SECTIONS } from "./fsmsHaccp";
import { useLang, LangToggle } from "./i18n";

/* Combined sections (clauses + HACCP-related) */
const ALL_SECTIONS = [...FSMS_SECTIONS, ...FSMS_HACCP_SECTIONS];

/* Server types */
const TYPE = "haccp_manual_overrides";
const TYPE_BOOKMARKS = "haccp_manual_bookmarks";

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
          re.test(p) && p.toLowerCase() === q.toLowerCase() ? (
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
    "radial-gradient(circle at 12% 10%, rgba(34,211,238,0.18) 0, rgba(255,255,255,1) 42%, rgba(255,255,255,1) 100%)," +
    "radial-gradient(circle at 88% 12%, rgba(34,197,94,0.14) 0, rgba(255,255,255,0) 55%)",
  fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", "Tajawal", sans-serif',
  color: "#071b2d",
};

const layoutStyle = {
  width: "100%",
  margin: "0 auto",
  padding: "14px 18px",
};

const topBarStyle = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 12,
  padding: "12px 14px",
  borderRadius: 14,
  background: "rgba(255,255,255,0.92)",
  border: "1px solid rgba(15,23,42,0.16)",
  boxShadow: "0 12px 32px rgba(2,132,199,0.10)",
  flexWrap: "wrap",
  marginBottom: 14,
};

const titleStyle = { fontSize: 22, fontWeight: 950, lineHeight: 1.2 };
const subStyle = { fontSize: 12, fontWeight: 700, opacity: 0.78, marginTop: 2 };

const docMetaStyle = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))",
  gap: 8,
  padding: "10px 12px",
  borderRadius: 12,
  background: "linear-gradient(180deg, rgba(34,211,238,0.10), rgba(34,197,94,0.06))",
  border: "1px solid rgba(34,211,238,0.32)",
  marginBottom: 12,
};

const metaItem = { fontSize: 12, fontWeight: 700, color: "#0c4a6e" };
const metaVal = { fontSize: 13, fontWeight: 950, color: "#071b2d" };

const containerStyle = {
  display: "grid",
  gridTemplateColumns: "320px 1fr",
  gap: 14,
  alignItems: "start",
};

const sidebarStyle = {
  background: "rgba(255,255,255,0.96)",
  border: "1px solid rgba(15,23,42,0.14)",
  borderRadius: 14,
  padding: 12,
  position: "sticky",
  top: 14,
  height: "calc(100vh - 200px)",
  overflowY: "auto",
  boxShadow: "0 6px 18px rgba(2,132,199,0.08)",
};

const searchInputStyle = {
  width: "100%",
  padding: "8px 10px",
  borderRadius: 10,
  border: "1.5px solid #cbd5e1",
  fontSize: 13,
  fontWeight: 600,
  outline: "none",
  marginBottom: 10,
};

const chapterStyle = (active) => ({
  padding: "8px 10px",
  borderRadius: 8,
  fontSize: 13,
  fontWeight: 800,
  color: active ? "#0369a1" : "#1e293b",
  background: active ? "rgba(34,211,238,0.14)" : "transparent",
  cursor: "pointer",
  display: "flex",
  alignItems: "center",
  gap: 8,
  marginTop: 2,
});

const sectionItemStyle = (active) => ({
  padding: "6px 10px 6px 24px",
  borderRadius: 6,
  fontSize: 12,
  fontWeight: 700,
  color: active ? "#fff" : "#334155",
  background: active ? "linear-gradient(90deg, #0ea5e9, #06b6d4)" : "transparent",
  cursor: "pointer",
  marginTop: 1,
  transition: "background .15s ease",
});

const contentStyle = {
  background: "rgba(255,255,255,0.98)",
  border: "1px solid rgba(15,23,42,0.14)",
  borderRadius: 14,
  padding: 22,
  minHeight: 600,
  boxShadow: "0 6px 18px rgba(2,132,199,0.08)",
};

const sectionTitleStyle = { fontSize: 22, fontWeight: 950, color: "#071b2d", marginBottom: 6 };
const clauseBadgeStyle = {
  display: "inline-block",
  padding: "3px 10px",
  borderRadius: 999,
  fontSize: 11,
  fontWeight: 900,
  color: "#0c4a6e",
  background: "rgba(34,211,238,0.16)",
  border: "1px solid rgba(34,211,238,0.4)",
  marginRight: 8,
};

const linkedBadgeStyle = {
  display: "inline-block",
  padding: "3px 10px",
  borderRadius: 999,
  fontSize: 11,
  fontWeight: 900,
  color: "#166534",
  background: "rgba(34,197,94,0.14)",
  border: "1px solid rgba(34,197,94,0.4)",
  marginRight: 8,
  textDecoration: "none",
  cursor: "pointer",
};

const editedBadgeStyle = {
  display: "inline-block",
  padding: "3px 10px",
  borderRadius: 999,
  fontSize: 11,
  fontWeight: 900,
  color: "#854d0e",
  background: "rgba(234,179,8,0.18)",
  border: "1px solid rgba(234,179,8,0.4)",
  marginRight: 8,
};

const bodyTextStyle = {
  whiteSpace: "pre-wrap",
  fontSize: 14,
  lineHeight: 1.75,
  color: "#1e293b",
  marginTop: 12,
};

const tableWrap = { overflowX: "auto", marginTop: 14 };
const tableStyle = { width: "100%", borderCollapse: "collapse", fontSize: 13 };
const thStyle = {
  background: "linear-gradient(180deg, #0ea5e9, #06b6d4)",
  color: "#fff",
  padding: "9px 10px",
  textAlign: "start",
  fontWeight: 900,
  border: "1px solid #0284c7",
};
const tdStyle = { padding: "8px 10px", border: "1px solid #e2e8f0", verticalAlign: "top" };

const btnStyle = (variant = "primary") => {
  const map = {
    primary:   { bg: "linear-gradient(180deg, #0ea5e9, #06b6d4)", color: "#fff", border: "#0284c7" },
    secondary: { bg: "#fff", color: "#0c4a6e", border: "#cbd5e1" },
    warn:      { bg: "linear-gradient(180deg, #f59e0b, #d97706)", color: "#fff", border: "#b45309" },
    danger:    { bg: "linear-gradient(180deg, #ef4444, #dc2626)", color: "#fff", border: "#b91c1c" },
    success:   { bg: "linear-gradient(180deg, #22c55e, #16a34a)", color: "#fff", border: "#15803d" },
  };
  const c = map[variant] || map.primary;
  return {
    background: c.bg,
    color: c.color,
    border: `1.5px solid ${c.border}`,
    padding: "7px 14px",
    borderRadius: 999,
    cursor: "pointer",
    fontWeight: 900,
    fontSize: 13,
    whiteSpace: "nowrap",
  };
};

const modalOverlay = {
  position: "fixed",
  inset: 0,
  background: "rgba(7,27,45,0.55)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  zIndex: 9999,
  padding: 16,
};

const modalCardStyle = {
  background: "#fff",
  borderRadius: 16,
  width: "100%",
  maxWidth: 720,
  maxHeight: "90vh",
  display: "flex",
  flexDirection: "column",
  overflow: "hidden",
  boxShadow: "0 24px 60px rgba(0,0,0,0.35)",
};

/* ==================== COMPONENTS ==================== */

function MetaBox({ t }) {
  return (
    <div style={docMetaStyle}>
      <div>
        <div style={metaItem}>{t("docNumber")}</div>
        <div style={metaVal}>{FSMS_META.referenceNumber}</div>
      </div>
      <div>
        <div style={metaItem}>{t("revision")}</div>
        <div style={metaVal}>Rev. {FSMS_META.revision}</div>
      </div>
      <div>
        <div style={metaItem}>{t("issueDate")}</div>
        <div style={metaVal}>{FSMS_META.date}</div>
      </div>
      <div>
        <div style={metaItem}>{t("standard")}</div>
        <div style={metaVal}>{FSMS_META.standard}</div>
      </div>
      <div>
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
    return ALL_SECTIONS.filter(
      (s) =>
        (s.title || "").toLowerCase().includes(q) ||
        (s.titleAr || "").toLowerCase().includes(q) ||
        (s.clause || "").toLowerCase().includes(q) ||
        (s.body || "").toLowerCase().includes(q) ||
        (s.bodyAr || "").toLowerCase().includes(q)
    );
  }, [search]);

  function toggleChapter(id) {
    setOpenChapters((p) => ({ ...p, [id]: !p[id] }));
  }

  const bookmarkedSections = useMemo(
    () => ALL_SECTIONS.filter((s) => bookmarks.includes(s.id)),
    [bookmarks]
  );

  return (
    <aside style={sidebarStyle}>
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
              <span style={{ opacity: 0.5, fontSize: 10 }}>{isOpen ? "▼" : "▶"}</span>
            </div>
            {isOpen &&
              items.map((s) => {
                const itemTitle = (lang === "ar" && s.titleAr) ? s.titleAr : s.title;
                return (
                  <div
                    key={s.id}
                    onClick={() => onSelect(s.id)}
                    style={sectionItemStyle(activeId === s.id)}
                    title={itemTitle}
                  >
                    {bookmarks.includes(s.id) && <span style={{ marginInlineEnd: 4, color: "#d97706" }}>⭐</span>}
                    {s.clause ? `${s.clause} — ` : ""}
                    {itemTitle.length > 42 ? itemTitle.slice(0, 40) + "…" : itemTitle}
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
            borderRadius: 10,
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
              background: "#fff", color: "#0c4a6e",
              border: "1.5px solid #cbd5e1", borderRadius: 999,
              padding: "8px 14px", fontWeight: 950, cursor: "pointer", fontSize: 14,
            }}
          >
            ✖ Close
          </button>
        </div>
      )}
    </>
  );
}

function DefinitionsList({ items }) {
  if (!items?.length) return null;
  return (
    <dl style={{ marginTop: 14, display: "grid", gap: 10 }}>
      {items.map(([term, def], i) => (
        <div key={i} style={{
          padding: "10px 14px",
          background: "#f8fafc",
          borderInlineStart: "3px solid #0ea5e9",
          borderRadius: 8,
        }}>
          <dt style={{ fontWeight: 950, color: "#0369a1", fontSize: 13, marginBottom: 4 }}>{term}</dt>
          <dd style={{ margin: 0, fontSize: 13, color: "#1e293b", lineHeight: 1.6 }}>{def}</dd>
        </div>
      ))}
    </dl>
  );
}

function EditModal({ section, onClose, onSave, t }) {
  const [title, setTitle] = useState(section.title);
  const [body, setBody] = useState(section.body || "");

  function handleSave() {
    onSave({ title, body });
  }

  return (
    <div style={modalOverlay} onClick={onClose}>
      <div style={modalCardStyle} onClick={(e) => e.stopPropagation()}>
        <div style={{
          padding: "14px 18px",
          background: "linear-gradient(180deg, #0ea5e9, #06b6d4)",
          color: "#fff",
          fontWeight: 950,
          fontSize: 15,
        }}>
          {t("editTitle")} — {section.clause}
        </div>

        <div style={{ padding: 18, overflowY: "auto", flex: 1 }}>
          <div style={{ fontSize: 12, color: "#64748b", marginBottom: 12 }}>{t("editHint")}</div>

          <label style={{ fontSize: 12, fontWeight: 900, color: "#0c4a6e", display: "block", marginBottom: 4 }}>
            {t("titleLabel")}
          </label>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            style={{
              width: "100%",
              padding: "9px 12px",
              borderRadius: 10,
              border: "1.5px solid #cbd5e1",
              fontSize: 14,
              fontWeight: 700,
              marginBottom: 14,
            }}
          />

          <label style={{ fontSize: 12, fontWeight: 900, color: "#0c4a6e", display: "block", marginBottom: 4 }}>
            {t("bodyLabel")}
          </label>
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            style={{
              width: "100%",
              minHeight: 320,
              padding: "10px 12px",
              borderRadius: 10,
              border: "1.5px solid #cbd5e1",
              fontSize: 13,
              lineHeight: 1.7,
              fontFamily: "inherit",
              resize: "vertical",
            }}
          />
        </div>

        <div style={{
          padding: "12px 18px",
          borderTop: "1px solid #e2e8f0",
          display: "flex",
          justifyContent: "flex-end",
          gap: 8,
        }}>
          <button style={btnStyle("secondary")} onClick={onClose}>{t("cancel")}</button>
          <button style={btnStyle("success")} onClick={handleSave}>{t("save")}</button>
        </div>
      </div>
    </div>
  );
}

function SectionView({ section, override, onEdit, onReset, t, lang, search, isBookmarked, onToggleBookmark }) {
  const navigate = useNavigate();
  const isEdited = !!override;

  // Pick the right body for the chosen language
  const defaultBody = (lang === "ar" && section.bodyAr) ? section.bodyAr : (section.body || "");
  const display = {
    ...section,
    title: override?.title ?? ((lang === "ar" && section.titleAr) ? section.titleAr : section.title),
    body: override?.body ?? defaultBody,
  };

  const link = FSMS_MODULE_LINKS[section.clause] || FSMS_MODULE_LINKS[section.chapter];

  return (
    <article style={contentStyle}>
      {/* Title row */}
      <div style={{ display: "flex", alignItems: "flex-start", gap: 12, flexWrap: "wrap" }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <h2 style={sectionTitleStyle}>
            <HighlightedText text={display.title} query={search} />
          </h2>
          <div style={{ marginTop: 4, display: "flex", flexWrap: "wrap", alignItems: "center", gap: 4 }}>
            {section.clause && (
              <span style={clauseBadgeStyle}>{t("clause")} {section.clause}</span>
            )}
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
          {isEdited && (
            <button style={btnStyle("warn")} onClick={() => onReset(section)}>
              {t("reset")}
            </button>
          )}
        </div>
      </div>

      {/* Body */}
      {display.body && (
        <div style={bodyTextStyle}>
          <HighlightedText text={display.body} query={search} />
        </div>
      )}

      {/* Type-specific renders */}
      {section.type === "definitions" && <DefinitionsList items={section.items} />}
      {section.table && <SectionTable table={section.table} tableAr={section.tableAr} lang={lang} />}
      {section.images && <ImageGallery images={section.images} lang={lang} />}
    </article>
  );
}

/* ==================== MAIN COMPONENT ==================== */
export default function FSMSManualView() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { lang, t, toggle, dir } = useLang();

  const initialSection = searchParams.get("section") || ALL_SECTIONS[0]?.id;
  const [activeId, setActiveId] = useState(initialSection);
  const [overrides, setOverrides] = useState({});
  const [bookmarks, setBookmarks] = useState([]);
  const [search, setSearch] = useState("");
  const [editingSection, setEditingSection] = useState(null);
  const [savingState, setSavingState] = useState(""); // "" | "saving" | "saved" | "error"

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
    });
  }

  async function handleSaveEdit({ title, body }) {
    if (!editingSection) return;
    const original = ALL_SECTIONS.find((s) => s.id === editingSection.id);
    const next = { ...overrides };

    const isDifferent =
      title !== original.title || body !== (original.body ?? "");

    if (isDifferent) {
      next[editingSection.id] = {
        title,
        body,
        editedAt: new Date().toISOString(),
      };
    } else {
      delete next[editingSection.id];
    }

    setSavingState("saving");
    try {
      await saveOverridesToServer(next);
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

  return (
    <main style={{ ...shellStyle, direction: dir }}>
      <div style={layoutStyle}>
        {/* Top bar */}
        <div style={topBarStyle}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <img
              src={mawashiLogo}
              alt="Al Mawashi Logo"
              style={{ width: 48, height: 48, borderRadius: 10, objectFit: "cover", border: "1px solid #cbd5e1" }}
            />
            <div>
              <div style={titleStyle}>{t("pageTitle")}</div>
              <div style={subStyle}>{t("pageSubtitle")}</div>
            </div>
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
            {savingState === "saving" && (
              <span style={{ fontSize: 12, fontWeight: 800, color: "#0c4a6e" }}>{t("saving")}</span>
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
            <button style={btnStyle("secondary")} onClick={() => navigate("/haccp-iso")}>
              {t("backToHub")}
            </button>
          </div>
        </div>

        {/* Doc meta strip */}
        <MetaBox t={t} />

        {/* Layout: Sidebar + Content */}
        <div style={containerStyle}>
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
              onReset={handleReset}
              t={t}
              lang={lang}
              search={search}
              isBookmarked={bookmarks.includes(activeSection.id)}
              onToggleBookmark={toggleBookmark}
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
          t={t}
        />
      )}
    </main>
  );
}
