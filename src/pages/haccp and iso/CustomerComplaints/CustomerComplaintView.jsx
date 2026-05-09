// src/pages/haccp and iso/CustomerComplaints/CustomerComplaintView.jsx
// Customer Complaints — Professional list view with filters, KPIs, export, and attachment preview
// ISO 22000:2018 Clauses 7.4 (Communication) & 9.1.2 (Complaint analysis)

import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import API_BASE from "../../../config/api";
import HaccpLinkBadge from "../FSMSManual/HaccpLinkBadge";
import { useHaccpLang, HaccpLangToggle } from "../_shared/haccpI18n";

const TYPE = "customer_complaint";

/* ─────────────────────────────────────────────────────────────
   Visual maps
   ───────────────────────────────────────────────────────────── */
const SEVERITY_COLOR = {
  Low:      { bg: "#dcfce7", color: "#166534", border: "#86efac" },
  Medium:   { bg: "#fef9c3", color: "#854d0e", border: "#fde047" },
  High:     { bg: "#fed7aa", color: "#9a3412", border: "#fdba74" },
  Critical: { bg: "#fecaca", color: "#991b1b", border: "#fca5a5" },
};

const STATUS_COLOR = {
  Open:          { bg: "#fed7aa", color: "#9a3412" },
  Investigation: { bg: "#fef3c7", color: "#854d0e" },
  Closed:        { bg: "#dcfce7", color: "#166534" },
};

const TYPE_LABELS = {
  BPC: "BPC", Foreign: "Foreign", Allergen: "Allergen", Quality: "Quality",
  Packaging: "Packaging", Service: "Service", Other: "Other",
};

const TYPE_COLORS = {
  BPC: "#dc2626", Foreign: "#ea580c", Allergen: "#d97706",
  Quality: "#0891b2", Packaging: "#7c3aed", Service: "#0284c7", Other: "#64748b",
};

/* ─────────────────────────────────────────────────────────────
   Helpers
   ───────────────────────────────────────────────────────────── */
function safeDate(s) {
  if (!s) return null;
  const d = new Date(s);
  return isNaN(d.getTime()) ? null : d;
}

function daysBetween(a, b) {
  const da = safeDate(a), db = safeDate(b);
  if (!da || !db) return null;
  const ms = db.getTime() - da.getTime();
  return Math.max(0, Math.round(ms / (1000 * 60 * 60 * 24)));
}

function escapeCSV(v) {
  const s = v == null ? "" : String(v);
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function downloadBlob(filename, mime, content) {
  try {
    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1500);
  } catch (e) {
    alert("Export failed: " + (e?.message || e));
  }
}

function fmtPercent(n) {
  if (!isFinite(n)) return "0%";
  return `${Math.round(n)}%`;
}

/* ─────────────────────────────────────────────────────────────
   Styles
   ───────────────────────────────────────────────────────────── */
const S = {
  shell: { minHeight: "100vh", padding: "20px 16px", fontFamily: 'system-ui,-apple-system,"Segoe UI",sans-serif', background: "linear-gradient(180deg, #fff7ed 0%, #fffbeb 60%, #f8fafc 100%)" },
  layout: { width: "100%", margin: "0 auto", padding: "0 4px" },
  topbar: {
    display: "flex", justifyContent: "space-between", alignItems: "center",
    marginBottom: 14, flexWrap: "wrap", gap: 10,
    padding: "12px 16px",
    background: "rgba(255,255,255,0.92)",
    borderRadius: 14, border: "1px solid #fed7aa",
    boxShadow: "0 8px 24px rgba(234,88,12,0.10)",
  },
  title: { fontSize: 22, fontWeight: 950, color: "#9a3412", lineHeight: 1.2 },
  subtitle: { fontSize: 12, color: "#c2410c", marginTop: 4, fontWeight: 700 },
  card: { background: "#fff", borderRadius: 14, padding: 16, marginBottom: 10, border: "1px solid #fed7aa", boxShadow: "0 6px 16px rgba(234,88,12,0.06)" },

  btn: (kind) => {
    const map = {
      primary:   { bg: "linear-gradient(180deg, #f97316, #ea580c)", color: "#fff", border: "#c2410c" },
      secondary: { bg: "#fff", color: "#9a3412", border: "#fed7aa" },
      success:   { bg: "linear-gradient(180deg, #22c55e, #16a34a)", color: "#fff", border: "#15803d" },
      danger:    { bg: "linear-gradient(180deg, #ef4444, #dc2626)", color: "#fff", border: "#b91c1c" },
      ghost:     { bg: "#fff7ed", color: "#9a3412", border: "#fdba74" },
    };
    const c = map[kind] || map.primary;
    return { background: c.bg, color: c.color, border: `1.5px solid ${c.border}`, padding: "8px 14px", borderRadius: 999, cursor: "pointer", fontWeight: 900, fontSize: 13, whiteSpace: "nowrap" };
  },
  empty: { textAlign: "center", padding: 40, color: "#64748b", fontWeight: 700 },

  /* KPIs */
  kpiGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 10, marginBottom: 14 },
  kpi: (color) => ({
    background: "#fff", borderRadius: 14, padding: "14px 16px",
    border: `1px solid ${color}33`,
    boxShadow: "0 6px 16px rgba(234,88,12,0.06)",
    borderInlineStart: `4px solid ${color}`,
  }),
  kpiVal: (color) => ({ fontSize: 24, fontWeight: 950, color }),
  kpiLabel: { fontSize: 10.5, fontWeight: 800, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.08em", marginTop: 4 },

  /* Filter toolbar */
  toolbar: { display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center", marginBottom: 12 },
  filterInput: { padding: "8px 11px", border: "1.5px solid #fed7aa", borderRadius: 10, fontSize: 13, fontWeight: 600, fontFamily: "inherit", background: "#fff", minWidth: 110 },

  /* Filter chip pills */
  filters: { display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 12 },
  filterBtn: (active, color) => ({
    padding: "6px 14px",
    borderRadius: 999,
    border: `1.5px solid ${active ? color : "#fed7aa"}`,
    background: active ? color : "#fff",
    color: active ? "#fff" : "#9a3412",
    fontWeight: 900, fontSize: 12, cursor: "pointer",
  }),

  /* Card row */
  rowHead: { display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10 },
  meta: { fontSize: 12, color: "#64748b", fontWeight: 700, marginTop: 4 },
  badge: (c) => ({
    display: "inline-block", padding: "3px 10px", borderRadius: 999,
    fontSize: 11, fontWeight: 900, background: c.bg, color: c.color,
    border: c.border ? `1px solid ${c.border}` : "none",
  }),
  detailBlock: { marginTop: 10, paddingTop: 10, borderTop: "1px dashed #fed7aa" },
  miniTitle: { fontSize: 12, fontWeight: 900, color: "#9a3412", marginBottom: 4 },
  miniText: { fontSize: 13, color: "#1e293b", whiteSpace: "pre-wrap", lineHeight: 1.5 },

  /* Trend */
  trendBox: { display: "flex", alignItems: "flex-end", gap: 4, height: 100, padding: "8px 0" },
  trendBar: (pct, color) => ({
    flex: 1,
    height: `${Math.max(pct, 4)}%`,
    background: color,
    borderRadius: "4px 4px 0 0",
    minHeight: 4,
    position: "relative",
  }),
  trendLabel: { fontSize: 9, color: "#64748b", fontWeight: 700, textAlign: "center", marginTop: 4 },

  /* Attachments */
  attachGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))", gap: 10, marginTop: 6 },
  thumb: { position: "relative", borderRadius: 10, overflow: "hidden", border: "1.5px solid #fed7aa", background: "#fff", cursor: "pointer" },
  thumbImg: { width: "100%", height: 110, objectFit: "cover", display: "block" },
  pdfTile: { display: "flex", alignItems: "center", gap: 8, padding: "8px 10px", borderRadius: 10, border: "1.5px solid #fed7aa", background: "#fffbeb", textDecoration: "none", color: "#9a3412", fontSize: 12, fontWeight: 800 },

  /* Modal */
  /* Full-screen image preview modal */
  modalBackdrop: { position: "fixed", inset: 0, background: "rgba(0,0,0,0.95)", zIndex: 9999, fontFamily: "system-ui,-apple-system,'Segoe UI',sans-serif" },
  modalHeader: {
    position: "fixed", top: 0, left: 0, right: 0,
    background: "linear-gradient(180deg, rgba(15,23,42,0.92), rgba(15,23,42,0.55) 80%, transparent)",
    color: "#fff", padding: "14px 18px",
    display: "flex", justifyContent: "flex-end", alignItems: "center", gap: 8,
    zIndex: 10001,
  },
  modalBody: { position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", padding: 0 },
  modalImgFit: { maxWidth: "100vw", maxHeight: "100vh", width: "auto", height: "auto", objectFit: "contain", cursor: "zoom-in", display: "block" },
  modalImgActual: { width: "auto", height: "auto", maxWidth: "none", maxHeight: "none", cursor: "zoom-out", display: "block" },
  modalBtn: { background: "rgba(255,255,255,0.18)", border: "1px solid rgba(255,255,255,0.4)", color: "#fff", padding: "6px 12px", borderRadius: 8, cursor: "pointer", fontWeight: 800, fontSize: 13, whiteSpace: "nowrap" },
  modalClose: { background: "rgba(220,38,38,0.85)", border: "1px solid rgba(255,255,255,0.4)", color: "#fff", width: 36, height: 36, borderRadius: 8, cursor: "pointer", fontSize: 16, fontWeight: 900 },
};

/* ─────────────────────────────────────────────────────────────
   Component
   ───────────────────────────────────────────────────────────── */
export default function CustomerComplaintView() {
  const navigate = useNavigate();
  const { t, lang, toggle, dir } = useHaccpLang();
  const isAr = lang === "ar";

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [openId, setOpenId] = useState(null);
  const [previewSrc, setPreviewSrc] = useState(null);

  /* Filters */
  const [statusFilter, setStatusFilter] = useState("all");
  const [severityFilter, setSeverityFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  async function load() {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/reports?type=${encodeURIComponent(TYPE)}`, { cache: "no-store" });
      const json = await res.json().catch(() => null);
      const arr = Array.isArray(json) ? json : json?.data || json?.items || [];
      arr.sort((a, b) => new Date(b?.payload?.complaintDate || 0) - new Date(a?.payload?.complaintDate || 0));
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
    } catch (e) { alert(t("deleteError") + ": " + e.message); }
  }

  function clearFilters() {
    setStatusFilter("all");
    setSeverityFilter("all");
    setTypeFilter("all");
    setSearch("");
    setFromDate("");
    setToDate("");
  }

  /* Filtered items */
  const filtered = useMemo(() => {
    const fromDateObj = safeDate(fromDate);
    const toDateObj = safeDate(toDate);
    const q = search.trim().toLowerCase();

    return items.filter((rec) => {
      const p = rec?.payload || {};
      if (statusFilter !== "all" && (p.status || "Open") !== statusFilter) return false;
      if (severityFilter !== "all" && (p.severity || "Low") !== severityFilter) return false;
      if (typeFilter !== "all" && (p.type || "Other") !== typeFilter) return false;
      if (fromDateObj || toDateObj) {
        const d = safeDate(p.complaintDate);
        if (!d) return false;
        if (fromDateObj && d < fromDateObj) return false;
        if (toDateObj && d > toDateObj) return false;
      }
      if (q) {
        const hay = [
          p.complaintNumber, p.complainant, p.product, p.batch,
          p.description, p.investigation, p.rootCause, p.capa,
          p.channel, p.closedBy,
        ].map((v) => String(v || "").toLowerCase()).join(" ");
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [items, statusFilter, severityFilter, typeFilter, fromDate, toDate, search]);

  /* KPIs (computed on items, not filtered, so headline numbers stay stable) */
  const stats = useMemo(() => {
    const now = new Date();
    const monthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    let total = items.length, open = 0, closed = 0, criticalOpen = 0, mtd = 0;
    let satisfiedYes = 0, satisfiedDecided = 0;
    let resolutionDays = [];
    const complainantCounts = new Map();

    for (const rec of items) {
      const p = rec?.payload || {};
      if (p.status === "Closed") closed++; else open++;
      if ((p.status !== "Closed") && p.severity === "Critical") criticalOpen++;
      if ((p.complaintDate || "").startsWith(monthKey)) mtd++;
      if (p.customerSatisfied === "Yes") { satisfiedYes++; satisfiedDecided++; }
      else if (p.customerSatisfied === "No") { satisfiedDecided++; }
      if (p.status === "Closed" && p.closureDate && p.complaintDate) {
        const d = daysBetween(p.complaintDate, p.closureDate);
        if (d != null) resolutionDays.push(d);
      }
      const key = String(p.complainant || "").trim().toLowerCase();
      if (key) complainantCounts.set(key, (complainantCounts.get(key) || 0) + 1);
    }
    const repeatComplainants = Array.from(complainantCounts.values()).filter((n) => n > 1).length;
    const avgResolution = resolutionDays.length ? Math.round(resolutionDays.reduce((a, b) => a + b, 0) / resolutionDays.length) : null;
    const satisfactionRate = satisfiedDecided ? (satisfiedYes / satisfiedDecided) * 100 : null;
    const closureRate = total ? (closed / total) * 100 : 0;

    return { total, open, closed, criticalOpen, mtd, repeatComplainants, avgResolution, satisfactionRate, closureRate };
  }, [items]);

  /* 12-month trend */
  const trend = useMemo(() => {
    const now = new Date();
    const months = [];
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      months.push({ key, label: d.toLocaleDateString(isAr ? "ar" : "en", { month: "short" }), count: 0 });
    }
    for (const rec of items) {
      const p = rec?.payload || {};
      const d = p.complaintDate;
      if (!d) continue;
      const key = d.slice(0, 7);
      const m = months.find((x) => x.key === key);
      if (m) m.count++;
    }
    const max = Math.max(...months.map((m) => m.count), 1);
    return { months, max };
  }, [items, isAr]);

  /* Type breakdown */
  const byType = useMemo(() => {
    const counts = {};
    for (const rec of items) {
      const p = rec?.payload || {};
      const k = p.type || "Other";
      counts[k] = (counts[k] || 0) + 1;
    }
    const total = Object.values(counts).reduce((a, b) => a + b, 0) || 1;
    return Object.entries(counts).map(([type, count]) => ({
      type, count, pct: Math.round((count / total) * 100),
    })).sort((a, b) => b.count - a.count);
  }, [items]);

  /* Counts for chip filters (based on full items) */
  const counts = useMemo(() => {
    const out = { Open: 0, Investigation: 0, Closed: 0, Low: 0, Medium: 0, High: 0, Critical: 0 };
    for (const rec of items) {
      const p = rec?.payload || {};
      const st = p.status || "Open";
      if (out[st] != null) out[st]++;
      const sv = p.severity || "Low";
      if (out[sv] != null) out[sv]++;
    }
    return out;
  }, [items]);

  /* ── Export ─────────────────────────────────────────────── */
  function exportCSV() {
    const headers = [
      "Complaint No.", "Date", "Complainant", "Channel",
      "Product", "Batch", "Type", "Severity",
      "Description", "Investigation", "Root Cause", "CAPA",
      "Status", "Closure Date", "Closed By", "Customer Satisfied",
      "Resolution Days", "Image Count", "PDF Count",
    ];
    const rows = filtered.map((rec) => {
      const p = rec?.payload || {};
      const days = (p.status === "Closed") ? daysBetween(p.complaintDate, p.closureDate) : "";
      return [
        p.complaintNumber, p.complaintDate, p.complainant, p.channel,
        p.product, p.batch, p.type, p.severity,
        p.description, p.investigation, p.rootCause, p.capa,
        p.status, p.closureDate, p.closedBy, p.customerSatisfied,
        days != null ? days : "",
        Array.isArray(p.images) ? p.images.length : 0,
        Array.isArray(p.pdfs) ? p.pdfs.length : 0,
      ].map(escapeCSV).join(",");
    });
    const csv = "﻿" + headers.map(escapeCSV).join(",") + "\n" + rows.join("\n");
    downloadBlob(`customer-complaints_${new Date().toISOString().slice(0, 10)}.csv`, "text/csv;charset=utf-8;", csv);
  }

  function exportJSON() {
    const data = filtered.map((rec) => ({
      id: rec.id,
      ...(rec?.payload || {}),
      // Strip heavy attachment dataUrls from JSON export — they bloat the file
      images: Array.isArray(rec?.payload?.images) ? rec.payload.images.map(({ name, mime }) => ({ name, mime })) : [],
      pdfs: Array.isArray(rec?.payload?.pdfs) ? rec.payload.pdfs.map(({ name, mime, size }) => ({ name, mime, size })) : [],
    }));
    downloadBlob(`customer-complaints_${new Date().toISOString().slice(0, 10)}.json`, "application/json", JSON.stringify(data, null, 2));
  }

  function printAll() {
    window.print();
  }

  return (
    <main style={{ ...S.shell, direction: dir }}>
      <div style={S.layout}>
        {/* Top bar */}
        <div style={S.topbar}>
          <div>
            <div style={S.title}>{t("ccListTitle")}</div>
            <div style={S.subtitle}>{isAr ? "تحليل الشكاوى وفق ISO 22000:2018 — البندان 7.4 و 9.1.2" : "Complaint analysis per ISO 22000:2018 — Clauses 7.4 & 9.1.2"}</div>
            <HaccpLinkBadge clauses={["7.4", "9.1.2"]} label={isAr ? "التواصل + التحليل" : "Communication + Analysis"} />
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <HaccpLangToggle lang={lang} toggle={toggle} />
            <button style={S.btn("secondary")} onClick={load} disabled={loading}>{loading ? "⏳" : t("refresh")}</button>
            <button style={S.btn("ghost")} onClick={exportCSV} disabled={!filtered.length} title={isAr ? "تصدير CSV" : "Export CSV"}>📊 CSV</button>
            <button style={S.btn("ghost")} onClick={exportJSON} disabled={!filtered.length} title={isAr ? "تصدير JSON" : "Export JSON"}>📄 JSON</button>
            <button style={S.btn("ghost")} onClick={printAll} disabled={!filtered.length} title={isAr ? "طباعة" : "Print"}>🖨 {isAr ? "طباعة" : "Print"}</button>
            <button style={S.btn("primary")} onClick={() => navigate("/haccp-iso/customer-complaints")}>{t("new")}</button>
            <button style={S.btn("secondary")} onClick={() => navigate("/haccp-iso")}>{t("backToHub")}</button>
          </div>
        </div>

        {/* KPIs */}
        <div style={S.kpiGrid}>
          <div style={S.kpi("#9a3412")}>
            <div style={S.kpiVal("#9a3412")}>{stats.total}</div>
            <div style={S.kpiLabel}>{t("ccTotal")}</div>
          </div>
          <div style={S.kpi("#ea580c")}>
            <div style={S.kpiVal("#ea580c")}>{stats.open}</div>
            <div style={S.kpiLabel}>{t("ccOpen")}</div>
          </div>
          <div style={S.kpi("#16a34a")}>
            <div style={S.kpiVal("#16a34a")}>{stats.closed}</div>
            <div style={S.kpiLabel}>{t("ccClosed")} · {fmtPercent(stats.closureRate)}</div>
          </div>
          <div style={S.kpi("#dc2626")}>
            <div style={S.kpiVal("#dc2626")}>{stats.criticalOpen}</div>
            <div style={S.kpiLabel}>{t("ccCriticalOpen")}</div>
          </div>
          <div style={S.kpi("#0891b2")}>
            <div style={S.kpiVal("#0891b2")}>{stats.mtd}</div>
            <div style={S.kpiLabel}>{isAr ? "هذا الشهر" : "Month-to-Date"}</div>
          </div>
          <div style={S.kpi("#7c3aed")}>
            <div style={S.kpiVal("#7c3aed")}>{stats.avgResolution != null ? `${stats.avgResolution}d` : "—"}</div>
            <div style={S.kpiLabel}>{isAr ? "متوسط زمن الإغلاق" : "Avg Resolution"}</div>
          </div>
          <div style={S.kpi("#16a34a")}>
            <div style={S.kpiVal("#16a34a")}>{stats.satisfactionRate != null ? fmtPercent(stats.satisfactionRate) : "—"}</div>
            <div style={S.kpiLabel}>{isAr ? "رضا العميل" : "Satisfaction"}</div>
          </div>
          <div style={S.kpi("#854d0e")}>
            <div style={S.kpiVal("#854d0e")}>{stats.repeatComplainants}</div>
            <div style={S.kpiLabel}>{isAr ? "شكاوى متكررة" : "Repeat Complainants"}</div>
          </div>
        </div>

        {/* Trend + Type breakdown */}
        {items.length > 0 && (
          <div style={{ ...S.card, display: "grid", gridTemplateColumns: "2fr 1fr", gap: 16 }} className="cc-trend-row">
            <div>
              <div style={{ fontSize: 13, fontWeight: 950, color: "#9a3412", marginBottom: 8 }}>{t("ccTrendTitle")}</div>
              <div style={S.trendBox}>
                {trend.months.map((m) => (
                  <div key={m.key} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 0 }}>
                    <div style={{ flex: 1, width: "100%", display: "flex", alignItems: "flex-end" }}>
                      <div style={S.trendBar((m.count / trend.max) * 100, m.count > 0 ? "#ea580c" : "#fed7aa")}>
                        {m.count > 0 && (
                          <div style={{ position: "absolute", top: -16, left: "50%", transform: "translateX(-50%)", fontSize: 10, fontWeight: 900, color: "#9a3412" }}>
                            {m.count}
                          </div>
                        )}
                      </div>
                    </div>
                    <div style={S.trendLabel}>{m.label}</div>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <div style={{ fontSize: 13, fontWeight: 950, color: "#9a3412", marginBottom: 8 }}>{t("ccByTypeTitle")}</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {byType.map((b) => (
                  <div key={b.type} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <div style={{ width: 10, height: 10, borderRadius: "50%", background: TYPE_COLORS[b.type] || "#64748b" }} />
                    <div style={{ fontSize: 11, fontWeight: 700, color: "#1e293b", flex: 1 }}>{TYPE_LABELS[b.type] || b.type}</div>
                    <div style={{ flex: 1, height: 6, background: "#fff7ed", borderRadius: 999, overflow: "hidden" }}>
                      <div style={{ width: `${b.pct}%`, height: "100%", background: TYPE_COLORS[b.type] || "#64748b" }} />
                    </div>
                    <div style={{ fontSize: 11, fontWeight: 900, color: "#64748b", minWidth: 60, textAlign: "end" }}>{b.count} ({b.pct}%)</div>
                  </div>
                ))}
                {byType.length === 0 && <div style={{ fontSize: 11, color: "#94a3b8" }}>—</div>}
              </div>
            </div>
          </div>
        )}

        {/* Filter toolbar */}
        <div style={{ ...S.card, ...S.toolbar }}>
          <input
            type="text"
            placeholder={isAr ? "🔍 بحث في الوصف، رقم الشكوى، المنتج…" : "🔍 Search description, number, product…"}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ ...S.filterInput, flex: 1, minWidth: 220 }}
          />
          <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} style={S.filterInput}>
            <option value="all">{isAr ? "كل الأنواع" : "All types"}</option>
            {Object.keys(TYPE_LABELS).map((tp) => <option key={tp} value={tp}>{TYPE_LABELS[tp]}</option>)}
          </select>
          <select value={severityFilter} onChange={(e) => setSeverityFilter(e.target.value)} style={S.filterInput}>
            <option value="all">{isAr ? "كل الخطورة" : "All severity"}</option>
            <option value="Low">{t("ccSeverityLow")}</option>
            <option value="Medium">{t("ccSeverityMed")}</option>
            <option value="High">{t("ccSeverityHigh")}</option>
            <option value="Critical">{t("ccSeverityCritical")}</option>
          </select>
          <label style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11, color: "#9a3412", fontWeight: 800 }}>
            {isAr ? "من" : "From"}
            <input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} style={S.filterInput} />
          </label>
          <label style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11, color: "#9a3412", fontWeight: 800 }}>
            {isAr ? "إلى" : "To"}
            <input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} style={S.filterInput} />
          </label>
          <button style={S.btn("ghost")} onClick={clearFilters}>↺ {isAr ? "إعادة تعيين" : "Reset"}</button>
          <span style={{ fontSize: 12, color: "#64748b", fontWeight: 700, marginInlineStart: "auto" }}>
            {isAr ? "المعروض:" : "Showing:"} <strong style={{ color: "#9a3412" }}>{filtered.length}</strong> / {items.length}
          </span>
        </div>

        {/* Status chips */}
        <div style={S.filters}>
          <button style={S.filterBtn(statusFilter === "all", "#9a3412")} onClick={() => setStatusFilter("all")}>
            {isAr ? "الكل" : "All"} ({items.length})
          </button>
          <button style={S.filterBtn(statusFilter === "Open", "#ea580c")} onClick={() => setStatusFilter("Open")}>
            {t("ccStatusOpen")} ({counts.Open})
          </button>
          <button style={S.filterBtn(statusFilter === "Investigation", "#d97706")} onClick={() => setStatusFilter("Investigation")}>
            {t("ccStatusInvestigation")} ({counts.Investigation})
          </button>
          <button style={S.filterBtn(statusFilter === "Closed", "#16a34a")} onClick={() => setStatusFilter("Closed")}>
            {t("ccStatusClosed")} ({counts.Closed})
          </button>
        </div>

        {loading && <div style={S.empty}>{t("loading")}</div>}
        {!loading && filtered.length === 0 && (
          <div style={S.empty}>
            {items.length === 0 ? t("noRecords") : (isAr ? "لا توجد نتائج بهذه الفلاتر" : "No results match these filters")}
          </div>
        )}

        {filtered.map((rec) => {
          const p = rec?.payload || {};
          const isOpen = openId === rec.id;
          const sevColor = SEVERITY_COLOR[p.severity] || SEVERITY_COLOR.Low;
          const stColor = STATUS_COLOR[p.status] || STATUS_COLOR.Open;
          const images = Array.isArray(p.images) ? p.images : [];
          const pdfs = Array.isArray(p.pdfs) ? p.pdfs : [];
          const resolutionDays = p.status === "Closed" ? daysBetween(p.complaintDate, p.closureDate) : null;

          return (
            <div key={rec.id} style={S.card}>
              <div style={S.rowHead}>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div style={{ fontSize: 15, fontWeight: 950, color: "#9a3412" }}>
                    {p.complaintNumber || "CC"} — {p.complaintDate || "—"}
                  </div>
                  <div style={S.meta}>
                    👤 {p.complainant || "—"}
                    {p.product ? ` • 📦 ${p.product}` : ""}
                    {p.batch ? ` • Batch ${p.batch}` : ""}
                    {p.channel ? ` • 📞 ${p.channel}` : ""}
                  </div>
                  <div style={{ marginTop: 6, display: "flex", gap: 6, flexWrap: "wrap" }}>
                    <span style={S.badge({ bg: "#fff7ed", color: "#9a3412", border: "#fed7aa" })}>
                      {TYPE_LABELS[p.type] || p.type || "—"}
                    </span>
                    <span style={S.badge(sevColor)}>{p.severity || "—"}</span>
                    <span style={S.badge(stColor)}>{p.status || "Open"}</span>
                    {p.customerSatisfied === "Yes" && (
                      <span style={S.badge({ bg: "#dcfce7", color: "#166534" })}>😊 {t("ccCustomerSatisfiedYes")}</span>
                    )}
                    {p.customerSatisfied === "No" && (
                      <span style={S.badge({ bg: "#fecaca", color: "#991b1b" })}>😞 {t("ccCustomerSatisfiedNo")}</span>
                    )}
                    {resolutionDays != null && (
                      <span style={S.badge({ bg: "#ede9fe", color: "#5b21b6" })}>
                        ⏱ {resolutionDays}{isAr ? " يوم" : "d"}
                      </span>
                    )}
                    {images.length > 0 && (
                      <span style={S.badge({ bg: "#dbeafe", color: "#1e40af" })}>🖼 {images.length}</span>
                    )}
                    {pdfs.length > 0 && (
                      <span style={S.badge({ bg: "#fef3c7", color: "#854d0e" })}>📄 {pdfs.length}</span>
                    )}
                  </div>
                </div>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                  <button style={S.btn("secondary")} onClick={() => setOpenId(isOpen ? null : rec.id)}>
                    {isOpen ? t("collapse") : t("expand")}
                  </button>
                  <button style={S.btn("secondary")} onClick={() => navigate(`/haccp-iso/customer-complaints?edit=${rec.id}`)}>
                    {t("edit")}
                  </button>
                  <button style={S.btn("danger")} onClick={() => del(rec.id)}>{t("del")}</button>
                </div>
              </div>

              {isOpen && (
                <div style={S.detailBlock}>
                  {p.description && (
                    <div style={{ marginBottom: 10 }}>
                      <div style={S.miniTitle}>{t("ccDescription")}</div>
                      <div style={S.miniText}>{p.description}</div>
                    </div>
                  )}
                  {p.investigation && (
                    <div style={{ marginBottom: 10 }}>
                      <div style={S.miniTitle}>{t("ccInvestigation")}</div>
                      <div style={S.miniText}>{p.investigation}</div>
                    </div>
                  )}
                  {p.rootCause && (
                    <div style={{ marginBottom: 10 }}>
                      <div style={S.miniTitle}>{t("ccRootCause")}</div>
                      <div style={S.miniText}>{p.rootCause}</div>
                    </div>
                  )}
                  {p.capa && (
                    <div style={{ marginBottom: 10 }}>
                      <div style={S.miniTitle}>{t("ccCAPA")}</div>
                      <div style={S.miniText}>{p.capa}</div>
                    </div>
                  )}

                  {/* Attachments */}
                  {(images.length > 0 || pdfs.length > 0) && (
                    <div style={{ marginBottom: 10 }}>
                      <div style={S.miniTitle}>📎 {isAr ? "المرفقات" : "Attachments"}</div>

                      {pdfs.length > 0 && (
                        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 8 }}>
                          {pdfs.map((pdf, i) => (
                            <a
                              key={`${pdf.name}_${i}`}
                              href={pdf.dataUrl}
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
                              onClick={() => setPreviewSrc(img.dataUrl)}
                              title={img.name}
                            >
                              <img src={img.dataUrl} alt={img.name} style={S.thumbImg} />
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {(p.closureDate || p.closedBy) && (
                    <div style={S.meta}>
                      {p.closureDate && <>📅 {t("ccClosureDate")}: {p.closureDate} </>}
                      {p.closedBy && <>• 👤 {t("ccClosedBy")}: {p.closedBy}</>}
                      {resolutionDays != null && <> • ⏱ {isAr ? "زمن الإغلاق" : "Resolution"}: {resolutionDays}{isAr ? " يوم" : " days"}</>}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Full-screen image preview modal */}
      {previewSrc && (
        <ImagePreviewModal src={previewSrc} onClose={() => setPreviewSrc(null)} S={S} />
      )}

      {/* Print stylesheet */}
      <style>{`
        @media print {
          .cc-trend-row { display: none !important; }
          button { display: none !important; }
          body { background: #fff !important; }
        }
        @media (max-width: 720px) {
          .cc-trend-row { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </main>
  );
}

/* ─────────────────────────────────────────────────────────────
   Full-screen image preview modal
   - Click image (or "1:1" button) toggles between fit-screen and actual-size
   - ESC closes
   - Locks body scroll while open
   ───────────────────────────────────────────────────────────── */
function ImagePreviewModal({ src, onClose, S }) {
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
