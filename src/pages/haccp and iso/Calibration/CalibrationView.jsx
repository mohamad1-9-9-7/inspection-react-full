// src/pages/haccp and iso/Calibration/CalibrationView.jsx
// Calibration Log — Cleaner table layout with thumbnails + full-screen image preview.

import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import API_BASE from "../../../config/api";
import HaccpLinkBadge from "../FSMSManual/HaccpLinkBadge";
import { useHaccpLang, HaccpLangToggle } from "../_shared/haccpI18n";

const TYPE = "calibration_record";

const BRANCHES = [
  "Al Qusais Warehouse",
  "Al Mamzar Food Truck",
  "Supervisor Food Truck",
  "Al Barsha Butchery",
  "Abu Dhabi Butchery",
  "Al Ain Butchery",
];

const isImageUrl = (url, name) => {
  const s = String(url || name || "").toLowerCase();
  return /\.(jpg|jpeg|png|gif|webp|bmp|svg)(\?|$)/i.test(s) || s.includes("image");
};
const isPdfUrl = (url, name) => /\.pdf(\?|$)/i.test(String(url || name || ""));

const S = {
  shell: { minHeight: "100vh", padding: "20px 16px", fontFamily: 'system-ui,-apple-system,"Segoe UI",sans-serif', background: "linear-gradient(180deg, #ecfeff 0%, #f0fdfa 60%, #f8fafc 100%)" },
  layout: { width: "100%", margin: "0 auto", padding: "0 4px" },
  topbar: {
    display: "flex", justifyContent: "space-between", alignItems: "center",
    marginBottom: 14, flexWrap: "wrap", gap: 10,
    padding: "12px 16px",
    background: "rgba(255,255,255,0.92)", borderRadius: 14,
    border: "1px solid #cffafe", boxShadow: "0 8px 24px rgba(8,145,178,0.10)",
  },
  title: { fontSize: 22, fontWeight: 950, color: "#155e75", lineHeight: 1.2 },
  subtitle: { fontSize: 12, color: "#0e7490", marginTop: 4, fontWeight: 700 },
  card: { background: "#fff", borderRadius: 14, padding: 14, marginBottom: 10, border: "1px solid #cffafe", boxShadow: "0 6px 16px rgba(8,145,178,0.06)" },
  label: { display: "block", fontSize: 12, fontWeight: 900, color: "#155e75", marginBottom: 4 },
  filterInput: { padding: "8px 11px", border: "1.5px solid #cffafe", borderRadius: 10, fontSize: 13, fontWeight: 600, fontFamily: "inherit", background: "#fff", minWidth: 110 },

  btn: (kind) => {
    const map = {
      primary:   { bg: "linear-gradient(180deg, #06b6d4, #0891b2)", color: "#fff", border: "#0e7490" },
      secondary: { bg: "#fff", color: "#155e75", border: "#cffafe" },
      success:   { bg: "linear-gradient(180deg, #22c55e, #16a34a)", color: "#fff", border: "#15803d" },
      danger:    { bg: "linear-gradient(180deg, #ef4444, #dc2626)", color: "#fff", border: "#b91c1c" },
      ghost:     { bg: "#ecfeff", color: "#155e75", border: "#a5f3fc" },
    };
    const c = map[kind] || map.secondary;
    return { background: c.bg, color: c.color, border: `1.5px solid ${c.border}`, padding: "8px 14px", borderRadius: 999, cursor: "pointer", fontWeight: 900, fontSize: 13, whiteSpace: "nowrap" };
  },
  empty: { textAlign: "center", padding: 40, color: "#64748b", fontWeight: 700 },

  /* KPIs */
  kpiGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 10, marginBottom: 14 },
  kpiCard: (color, active) => ({
    background: "#fff", borderRadius: 14, padding: "14px 16px",
    border: active ? `2px solid ${color}` : `1px solid ${color}33`,
    borderInlineStart: `4px solid ${color}`,
    boxShadow: "0 6px 16px rgba(8,145,178,0.06)",
    cursor: "pointer", textAlign: "center",
  }),
  kpiVal: (color) => ({ fontSize: 26, fontWeight: 950, color }),
  kpiLabel: { fontSize: 10.5, fontWeight: 800, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.08em", marginTop: 4 },

  /* Compact, cleaner table */
  table: { width: "100%", borderCollapse: "collapse", fontSize: 13, background: "#fff", borderRadius: 12, overflow: "hidden" },
  th: { padding: "10px 12px", background: "#155e75", color: "#fff", textAlign: "start", fontWeight: 900, fontSize: 11, textTransform: "uppercase", letterSpacing: "0.05em", whiteSpace: "nowrap" },
  td: { padding: "10px 12px", borderTop: "1px solid #ecfeff", verticalAlign: "top" },

  pill: (color) => ({ display: "inline-block", padding: "3px 10px", borderRadius: 999, fontSize: 11, fontWeight: 900, color: "#fff", background: color, whiteSpace: "nowrap" }),

  /* Image thumbnails — small inline previews that open full-screen modal on click */
  thumbStrip: { display: "flex", gap: 4, flexWrap: "wrap", maxWidth: 240 },
  thumb: { width: 44, height: 44, borderRadius: 6, objectFit: "cover", cursor: "zoom-in", border: "1.5px solid #cffafe", background: "#f8fafc", display: "block" },
  pdfChip: {
    display: "inline-flex", alignItems: "center", gap: 4,
    padding: "4px 8px", borderRadius: 6, background: "#fef3c7",
    border: "1px solid #fde68a", color: "#854d0e",
    textDecoration: "none", fontSize: 11, fontWeight: 800,
  },
  thumbMore: {
    width: 44, height: 44, borderRadius: 6, background: "#155e75", color: "#fff",
    display: "flex", alignItems: "center", justifyContent: "center",
    fontSize: 12, fontWeight: 900, cursor: "pointer", border: "1.5px solid #0e7490",
  },

  /* Full-screen image modal */
  modalBackdrop: { position: "fixed", inset: 0, background: "rgba(0,0,0,0.95)", zIndex: 9999, fontFamily: "system-ui,-apple-system,'Segoe UI',sans-serif" },
  modalHeader: {
    position: "fixed", top: 0, left: 0, right: 0,
    background: "linear-gradient(180deg, rgba(15,23,42,0.92), rgba(15,23,42,0.55) 80%, transparent)",
    color: "#fff", padding: "14px 18px",
    display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10,
    zIndex: 10001,
  },
  modalNav: {
    position: "fixed", top: "50%", transform: "translateY(-50%)",
    width: 48, height: 48, borderRadius: "50%",
    background: "rgba(15,23,42,0.6)", color: "#fff", border: "1.5px solid rgba(255,255,255,0.3)",
    fontSize: 24, fontWeight: 900, cursor: "pointer", zIndex: 10002,
    display: "flex", alignItems: "center", justifyContent: "center",
  },
  modalBody: { position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", padding: 0 },
  modalImgFit: { maxWidth: "100vw", maxHeight: "100vh", width: "auto", height: "auto", objectFit: "contain", cursor: "zoom-in", display: "block" },
  modalImgActual: { width: "auto", height: "auto", maxWidth: "none", maxHeight: "none", cursor: "zoom-out", display: "block" },
  modalBtn: { background: "rgba(255,255,255,0.18)", border: "1px solid rgba(255,255,255,0.4)", color: "#fff", padding: "6px 12px", borderRadius: 8, cursor: "pointer", fontWeight: 800, fontSize: 13, whiteSpace: "nowrap" },
  modalClose: { background: "rgba(220,38,38,0.85)", border: "1px solid rgba(255,255,255,0.4)", color: "#fff", width: 36, height: 36, borderRadius: 8, cursor: "pointer", fontSize: 16, fontWeight: 900 },
};

function statusOfRec(record, t) {
  const today = Date.now();
  const next = record?.payload?.nextDueDate;
  if (!next) return { label: "—", color: "#64748b" };
  const tm = new Date(next).getTime();
  const days = Math.ceil((tm - today) / 86400000);
  if (days < 0)  return { label: t("overdueDays", { n: Math.abs(days) }), color: "#dc2626" };
  if (days < 30) return { label: t("dueInDays", { n: days }), color: "#d97706" };
  return { label: `${t("okStatus")} (${days}${t("days").charAt(0)})`, color: "#16a34a" };
}

export default function CalibrationView() {
  const navigate = useNavigate();
  const { t, lang, toggle, dir } = useHaccpLang();
  const isAr = lang === "ar";
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [branchFilter, setBranchFilter] = useState("all");
  const [search, setSearch] = useState("");
  /* Lightbox state: { images: [{url,name}, ...], index: 0 } */
  const [preview, setPreview] = useState(null);

  async function load() {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/reports?type=${encodeURIComponent(TYPE)}`, { cache: "no-store" });
      const json = await res.json().catch(() => null);
      const arr = Array.isArray(json) ? json : json?.data || json?.items || [];
      arr.sort((a, b) => new Date(a?.payload?.nextDueDate || "9999-12-31") - new Date(b?.payload?.nextDueDate || "9999-12-31"));
      setItems(arr);
    } catch { setItems([]); }
    finally { setLoading(false); }
  }
  useEffect(() => { load(); }, []);

  const branchFiltered = useMemo(() => {
    if (branchFilter === "all") return items;
    return items.filter((r) => (r?.payload?.branch || "") === branchFilter);
  }, [items, branchFilter]);

  const kpis = useMemo(() => {
    const today = Date.now();
    let overdue = 0, due30 = 0, ok = 0;
    branchFiltered.forEach((r) => {
      const next = r?.payload?.nextDueDate;
      if (!next) return;
      const days = Math.ceil((new Date(next).getTime() - today) / 86400000);
      if (days < 0) overdue++;
      else if (days < 30) due30++;
      else ok++;
    });
    return { total: branchFiltered.length, overdue, due30, ok };
  }, [branchFiltered]);

  const filtered = useMemo(() => {
    const today = Date.now();
    const q = search.trim().toLowerCase();
    return branchFiltered.filter((r) => {
      const p = r?.payload || {};
      if (filter !== "all") {
        const next = p.nextDueDate;
        if (!next) return false;
        const days = Math.ceil((new Date(next).getTime() - today) / 86400000);
        if (filter === "overdue" && days >= 0) return false;
        if (filter === "due30" && (days < 0 || days >= 30)) return false;
        if (filter === "ok" && days < 30) return false;
      }
      if (q) {
        const hay = [
          p.equipmentId, p.equipmentName, p.equipmentType, p.serialNumber,
          p.branch, p.location, p.calibratedBy, p.calibrationCertNo,
        ].map((v) => String(v || "").toLowerCase()).join(" ");
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [branchFiltered, filter, search]);

  async function del(id) {
    if (!window.confirm(t("confirmDelete"))) return;
    try {
      await fetch(`${API_BASE}/api/reports/${encodeURIComponent(id)}`, { method: "DELETE" });
      load();
    } catch (e) { alert(t("deleteError") + ": " + e.message); }
  }

  /* Open lightbox starting at a specific image index for the row */
  function openLightbox(images, index) {
    if (!images?.length) return;
    setPreview({ images, index: Math.max(0, Math.min(index, images.length - 1)) });
  }

  return (
    <main style={{ ...S.shell, direction: dir }}>
      <div style={S.layout}>
        <div style={S.topbar}>
          <div>
            <div style={S.title}>{t("calibListTitle")}</div>
            <div style={S.subtitle}>{isAr ? "معايرة خارجية معتمدة (سنوية)" : "External accredited calibration (annual)"}</div>
            <HaccpLinkBadge clauses={["8.7"]} label={isAr ? "ضبط المراقبة والقياس" : "Control of Monitoring & Measuring"} />
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <HaccpLangToggle lang={lang} toggle={toggle} />
            <button style={S.btn("secondary")} onClick={load} disabled={loading}>{loading ? "⏳" : t("refresh")}</button>
            <button style={S.btn("primary")} onClick={() => navigate("/haccp-iso/calibration")}>{t("new")}</button>
            <button style={S.btn("secondary")} onClick={() => navigate("/haccp-iso")}>{t("backToHub")}</button>
          </div>
        </div>

        {/* Filter toolbar — combined */}
        <div style={{ ...S.card, display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
          <input
            type="text"
            placeholder={isAr ? "🔍 بحث في الجهاز/الموقع/الشهادة…" : "🔍 Search equipment/location/cert…"}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ ...S.filterInput, flex: 1, minWidth: 220 }}
          />
          <select style={S.filterInput} value={branchFilter} onChange={(e) => setBranchFilter(e.target.value)}>
            <option value="all">{t("calibBranchAll")}</option>
            {BRANCHES.map((b) => <option key={b} value={b}>{b}</option>)}
          </select>
          <span style={{ fontSize: 12, color: "#64748b", fontWeight: 700, marginInlineStart: "auto" }}>
            {isAr ? "المعروض:" : "Showing:"} <strong style={{ color: "#155e75" }}>{filtered.length}</strong> / {branchFiltered.length}
          </span>
        </div>

        <div style={S.kpiGrid}>
          <div style={S.kpiCard("#0369a1", filter === "all")} onClick={() => setFilter("all")}>
            <div style={S.kpiVal("#0369a1")}>{kpis.total}</div>
            <div style={S.kpiLabel}>{t("calibTotal")}</div>
          </div>
          <div style={S.kpiCard("#dc2626", filter === "overdue")} onClick={() => setFilter(filter === "overdue" ? "all" : "overdue")}>
            <div style={S.kpiVal("#dc2626")}>{kpis.overdue}</div>
            <div style={S.kpiLabel}>🔴 {t("calibOverdue")}</div>
          </div>
          <div style={S.kpiCard("#d97706", filter === "due30")} onClick={() => setFilter(filter === "due30" ? "all" : "due30")}>
            <div style={S.kpiVal("#d97706")}>{kpis.due30}</div>
            <div style={S.kpiLabel}>⚠ {t("calibDue30")}</div>
          </div>
          <div style={S.kpiCard("#16a34a", filter === "ok")} onClick={() => setFilter(filter === "ok" ? "all" : "ok")}>
            <div style={S.kpiVal("#16a34a")}>{kpis.ok}</div>
            <div style={S.kpiLabel}>✓ {t("calibOk")}</div>
          </div>
        </div>

        {loading && <div style={S.empty}>{t("loading")}</div>}
        {!loading && filtered.length === 0 && <div style={S.empty}>{t("noRecords")}</div>}

        {filtered.length > 0 && (
          <div style={{ ...S.card, padding: 0, overflow: "hidden" }}>
            <div style={{ overflowX: "auto" }}>
              <table style={S.table}>
                <thead>
                  <tr>
                    <th style={S.th}>{isAr ? "الجهاز" : "Equipment"}</th>
                    <th style={S.th}>{isAr ? "الموقع" : "Location"}</th>
                    <th style={{ ...S.th, whiteSpace: "nowrap" }}>{isAr ? "آخر / التالي" : "Last / Next"}</th>
                    <th style={{ ...S.th, textAlign: "center" }}>{isAr ? "النتيجة" : "Result"}</th>
                    <th style={S.th}>{isAr ? "الحالة" : "Status"}</th>
                    <th style={S.th}>{isAr ? "المرفقات" : "Attachments"}</th>
                    <th style={{ ...S.th, textAlign: "center" }}>{isAr ? "أدوات" : "Tools"}</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((rec, i) => {
                    const p = rec?.payload || {};
                    const st = statusOfRec(rec, t);
                    const resultColor = p.result === "PASS" ? "#16a34a" : p.result === "ADJUSTED" ? "#d97706" : "#dc2626";
                    const urls = Array.isArray(p.fileUrls) ? p.fileUrls : [];
                    const names = Array.isArray(p.fileNames) ? p.fileNames : [];
                    const allFiles = urls.map((u, idx) => ({ url: u, name: names[idx] || "" }));
                    const images = allFiles.filter((f) => isImageUrl(f.url, f.name));
                    const pdfs = allFiles.filter((f) => isPdfUrl(f.url, f.name));
                    const others = allFiles.filter((f) => !isImageUrl(f.url, f.name) && !isPdfUrl(f.url, f.name));
                    return (
                      <tr key={rec.id} style={{ background: i % 2 ? "#f8fafc" : "#fff" }}>
                        <td style={{ ...S.td, maxWidth: 260 }}>
                          <div style={{ fontWeight: 950, color: "#155e75", fontSize: 13 }}>
                            {p.equipmentName || "—"}
                          </div>
                          <div style={{ fontSize: 11, color: "#64748b", marginTop: 2, fontWeight: 700 }}>
                            {[p.equipmentId, p.equipmentType].filter(Boolean).join(" · ")}
                          </div>
                          {p.serialNumber && (
                            <div style={{ fontSize: 10, color: "#94a3b8", fontWeight: 600 }}>S/N: {p.serialNumber}</div>
                          )}
                        </td>
                        <td style={{ ...S.td, fontSize: 12 }}>
                          <div style={{ fontWeight: 800, color: "#1e293b" }}>{p.branch || "—"}</div>
                          {p.location && <div style={{ fontSize: 11, color: "#64748b" }}>{p.location}</div>}
                        </td>
                        <td style={{ ...S.td, fontSize: 12, whiteSpace: "nowrap" }}>
                          <div style={{ color: "#64748b" }}>{p.lastCalibrationDate || "—"}</div>
                          <div style={{ fontWeight: 950, color: "#155e75", marginTop: 2 }}>↳ {p.nextDueDate || "—"}</div>
                        </td>
                        <td style={{ ...S.td, textAlign: "center" }}>
                          <span style={S.pill(resultColor)}>{p.result || "—"}</span>
                        </td>
                        <td style={S.td}>
                          <span style={S.pill(st.color)}>{st.label}</span>
                        </td>
                        <td style={S.td}>
                          {allFiles.length === 0 && <span style={{ color: "#94a3b8", fontSize: 12 }}>—</span>}
                          {images.length > 0 && (
                            <div style={S.thumbStrip}>
                              {images.slice(0, 4).map((f, idx) => (
                                <img
                                  key={f.url + idx}
                                  src={f.url}
                                  alt={f.name || `image-${idx + 1}`}
                                  style={S.thumb}
                                  onClick={() => openLightbox(images, idx)}
                                  title={f.name}
                                  loading="lazy"
                                />
                              ))}
                              {images.length > 4 && (
                                <div style={S.thumbMore} onClick={() => openLightbox(images, 4)} title={isAr ? "عرض الكل" : "View all"}>
                                  +{images.length - 4}
                                </div>
                              )}
                            </div>
                          )}
                          {pdfs.length > 0 && (
                            <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginTop: images.length > 0 ? 6 : 0 }}>
                              {pdfs.map((f, idx) => (
                                <a key={f.url + idx} href={f.url} target="_blank" rel="noreferrer" style={S.pdfChip} title={f.name}>
                                  📄 PDF
                                </a>
                              ))}
                            </div>
                          )}
                          {others.length > 0 && (
                            <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginTop: 6 }}>
                              {others.map((f, idx) => (
                                <a key={f.url + idx} href={f.url} target="_blank" rel="noreferrer" style={{ ...S.pdfChip, background: "#eff6ff", borderColor: "#bfdbfe", color: "#2563eb" }} title={f.name}>
                                  📎 {f.name?.slice(0, 12) || "File"}
                                </a>
                              ))}
                            </div>
                          )}
                        </td>
                        <td style={{ ...S.td, textAlign: "center", whiteSpace: "nowrap" }}>
                          <button style={{ ...S.btn("secondary"), padding: "4px 10px", fontSize: 11 }} onClick={() => navigate(`/haccp-iso/calibration?edit=${rec.id}`)}>
                            ✏️
                          </button>
                          <button style={{ ...S.btn("danger"), padding: "4px 10px", fontSize: 11, marginInlineStart: 4 }} onClick={() => del(rec.id)}>
                            🗑️
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Full-screen image preview modal with prev/next navigation */}
      {preview && (
        <ImagePreviewModal
          images={preview.images}
          index={preview.index}
          onClose={() => setPreview(null)}
          onIndex={(newIdx) => setPreview((p) => p ? { ...p, index: newIdx } : null)}
          S={S}
          isAr={isAr}
        />
      )}
    </main>
  );
}

/* ─────────────────────────────────────────────────────────────
   Full-screen image preview modal
   - Click image (or "1:1" button) toggles between fit-screen and actual-size
   - ESC closes; ←/→ navigates between images
   ───────────────────────────────────────────────────────────── */
function ImagePreviewModal({ images, index, onClose, onIndex, S, isAr }) {
  const [actualSize, setActualSize] = useState(false);
  const total = images.length;
  const current = images[index];

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") onClose();
      else if (e.key === "ArrowRight") onIndex((index + 1) % total);
      else if (e.key === "ArrowLeft") onIndex((index - 1 + total) % total);
    };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [index, total, onClose, onIndex]);

  /* Reset zoom when navigating */
  useEffect(() => { setActualSize(false); }, [index]);

  if (!current) return null;

  return (
    <div style={S.modalBackdrop} onClick={onClose} role="dialog" aria-modal="true">
      <div style={S.modalHeader} onClick={(e) => e.stopPropagation()}>
        <div style={{ minWidth: 0, flex: 1, color: "#fff" }}>
          <div style={{ fontWeight: 900, fontSize: 14 }}>
            {isAr ? "صورة" : "Image"} {index + 1} / {total}
          </div>
          <div style={{ opacity: 0.85, fontSize: 12, marginTop: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {current.name || ""}
          </div>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={(e) => { e.stopPropagation(); setActualSize((v) => !v); }} style={S.modalBtn} title={actualSize ? (isAr ? "ملاءمة الشاشة" : "Fit screen") : (isAr ? "الحجم الفعلي" : "Actual size")}>
            {actualSize ? "🔽 Fit" : "🔍 1:1"}
          </button>
          <a href={current.url} download={current.name || `image-${index + 1}.jpg`} style={{ ...S.modalBtn, textDecoration: "none" }} onClick={(e) => e.stopPropagation()}>
            ⬇ {isAr ? "تنزيل" : "Download"}
          </a>
          <button onClick={(e) => { e.stopPropagation(); onClose(); }} style={S.modalClose}>×</button>
        </div>
      </div>

      {/* Prev/Next buttons (only when more than one image) */}
      {total > 1 && (
        <>
          <button
            style={{ ...S.modalNav, insetInlineStart: 12 }}
            onClick={(e) => { e.stopPropagation(); onIndex((index - 1 + total) % total); }}
            aria-label="Previous"
          >‹</button>
          <button
            style={{ ...S.modalNav, insetInlineEnd: 12 }}
            onClick={(e) => { e.stopPropagation(); onIndex((index + 1) % total); }}
            aria-label="Next"
          >›</button>
        </>
      )}

      <div style={{ ...S.modalBody, overflow: actualSize ? "auto" : "hidden" }} onClick={(e) => e.stopPropagation()}>
        <img
          src={current.url}
          alt={current.name || ""}
          style={actualSize ? S.modalImgActual : S.modalImgFit}
          onClick={() => setActualSize((v) => !v)}
        />
      </div>
    </div>
  );
}
