// src/pages/haccp and iso/DocumentRegister/DocumentRegisterView.jsx
// Master Register of Controlled Documents (ISO 22000 Clause 7.5)
// — Aggregates SOPs/sSOPs/Policies/Manual + user metadata
// — KPIs, alerts, filters, search, CSV export, expandable rows

import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import API_BASE from "../../../config/api";
import HaccpLinkBadge from "../FSMSManual/HaccpLinkBadge";
import { useHaccpLang, HaccpLangToggle } from "../_shared/haccpI18n";
import {
  getAutoImportedDocs,
  mergeDocs,
  computeReviewStatus,
  DOC_TYPE_META,
  DOC_STATUS_META,
  docsToCSV,
  downloadCSV,
} from "./documentSources";

const META_TYPE = "document_metadata";

const S = {
  shell: {
    minHeight: "100vh",
    padding: "20px 16px",
    fontFamily: 'system-ui,-apple-system,"Segoe UI",sans-serif',
    background: "linear-gradient(180deg, #f8fafc 0%, #f1f5f9 100%)",
    color: "#0f172a",
  },
  layout: { width: "100%", margin: "0 auto" },

  topbar: {
    display: "flex", justifyContent: "space-between", alignItems: "center",
    marginBottom: 14, flexWrap: "wrap", gap: 10,
    padding: "12px 16px",
    background: "rgba(255,255,255,0.92)",
    borderRadius: 14,
    border: "1px solid #e2e8f0",
    boxShadow: "0 8px 24px rgba(15,23,42,0.06)",
  },
  title: { fontSize: 22, fontWeight: 950, color: "#0f172a", lineHeight: 1.2 },
  subtitle: { fontSize: 12, color: "#475569", marginTop: 4, fontWeight: 700 },

  btn: (kind) => {
    const map = {
      primary:   { bg: "linear-gradient(180deg, #0f766e, #0d9488)", color: "#fff", border: "#0f766e" },
      secondary: { bg: "#fff",                                      color: "#334155", border: "#cbd5e1" },
      success:   { bg: "linear-gradient(180deg, #22c55e, #16a34a)", color: "#fff", border: "#15803d" },
      danger:    { bg: "linear-gradient(180deg, #ef4444, #dc2626)", color: "#fff", border: "#b91c1c" },
      ghost:     { bg: "transparent",                               color: "#0f766e", border: "#0f766e" },
    };
    const c = map[kind] || map.primary;
    return {
      background: c.bg, color: c.color, border: `1.5px solid ${c.border}`,
      padding: "8px 14px", borderRadius: 999, cursor: "pointer",
      fontWeight: 900, fontSize: 13, whiteSpace: "nowrap",
    };
  },

  /* KPIs */
  kpiGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))", gap: 10, marginBottom: 12 },
  kpi: (color) => ({
    background: "#fff",
    borderRadius: 14,
    padding: "14px 16px",
    border: `1px solid ${color}33`,
    boxShadow: "0 6px 16px rgba(15,23,42,0.05)",
    borderLeft: `4px solid ${color}`,
  }),
  kpiVal: (color) => ({ fontSize: 28, fontWeight: 950, color, lineHeight: 1 }),
  kpiLabel: { fontSize: 11, fontWeight: 800, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.08em", marginTop: 6 },

  /* Alert banner */
  alert: {
    background: "linear-gradient(180deg, #fef3c7, #fde68a)",
    border: "1.5px solid #f59e0b",
    borderRadius: 12,
    padding: "12px 16px",
    marginBottom: 12,
    boxShadow: "0 6px 16px rgba(217,119,6,0.10)",
  },
  alertTitle: { fontSize: 14, fontWeight: 950, color: "#78350f", marginBottom: 8 },
  alertList: { listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 4 },
  alertRow: { fontSize: 12, color: "#78350f", fontWeight: 700, display: "flex", gap: 8, alignItems: "center" },
  alertOverdueRow: { fontSize: 12, color: "#7f1d1d", fontWeight: 800, display: "flex", gap: 8, alignItems: "center" },

  /* Toolbar */
  toolbar: {
    display: "flex", gap: 8, marginBottom: 12, flexWrap: "wrap", alignItems: "center",
    padding: 12, background: "#fff", borderRadius: 14, border: "1px solid #e2e8f0",
    boxShadow: "0 4px 12px rgba(15,23,42,0.04)",
  },
  search: {
    flex: "1 1 240px", minWidth: 200, padding: "9px 12px",
    border: "1.5px solid #cbd5e1", borderRadius: 10,
    fontSize: 13, fontWeight: 600, fontFamily: "inherit",
    background: "#fff",
  },
  select: {
    padding: "8px 12px", border: "1.5px solid #cbd5e1", borderRadius: 10,
    fontSize: 13, fontWeight: 700, fontFamily: "inherit", background: "#fff",
    cursor: "pointer",
  },

  /* Table */
  tableWrap: { background: "#fff", borderRadius: 14, border: "1px solid #e2e8f0", overflow: "hidden", boxShadow: "0 6px 16px rgba(15,23,42,0.05)" },
  table: { width: "100%", borderCollapse: "collapse", fontSize: 13 },
  th: {
    padding: "10px 12px",
    textAlign: "start",
    background: "#0f172a",
    color: "#fff",
    fontWeight: 900,
    fontSize: 12,
    textTransform: "uppercase",
    letterSpacing: "0.05em",
    whiteSpace: "nowrap",
    position: "sticky",
    top: 0,
  },
  td: { padding: "10px 12px", borderTop: "1px solid #f1f5f9", verticalAlign: "middle" },
  trBase: { background: "#fff", cursor: "pointer", transition: "background .15s ease" },
  trHover: { background: "#f8fafc" },
  trExpanded: { background: "#f0fdfa" },

  badge: (c) => ({
    display: "inline-block", padding: "3px 10px", borderRadius: 999,
    fontSize: 11, fontWeight: 900, background: c.bg, color: c.color,
    border: c.border ? `1px solid ${c.border}` : "none",
    whiteSpace: "nowrap",
  }),
  typeBadge: (color, icon) => ({
    display: "inline-flex", alignItems: "center", gap: 4,
    padding: "3px 10px", borderRadius: 999,
    fontSize: 11, fontWeight: 900,
    background: `${color}18`, color, border: `1px solid ${color}55`,
  }),

  empty: { textAlign: "center", padding: 60, color: "#64748b", fontWeight: 700 },

  /* Detail panel (expanded row) */
  detail: { padding: "14px 18px", background: "#f0fdfa", borderTop: "2px solid #0f766e" },
  detailGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 10, marginBottom: 10 },
  detailItem: {},
  detailLabel: { fontSize: 11, fontWeight: 900, color: "#0f766e", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 3 },
  detailValue: { fontSize: 13, color: "#0f172a", fontWeight: 700 },
  detailNotes: { marginTop: 8, padding: 10, background: "#fff", borderRadius: 8, border: "1px solid #ccfbf1", fontSize: 12, color: "#0f172a", whiteSpace: "pre-wrap", lineHeight: 1.5 },

  hint: { fontSize: 11, color: "#94a3b8", fontWeight: 700, fontStyle: "italic", marginTop: 6, textAlign: "center" },

  srcBadge: (kind) => {
    const map = {
      auto:   { bg: "#dbeafe", color: "#1e40af" },
      manual: { bg: "#fce7f3", color: "#9f1239" },
      merged: { bg: "#dcfce7", color: "#15803d" },
    };
    const c = map[kind] || map.auto;
    return { background: c.bg, color: c.color, padding: "2px 8px", borderRadius: 6, fontSize: 9, fontWeight: 900, textTransform: "uppercase", letterSpacing: "0.05em" };
  },
};

export default function DocumentRegisterView() {
  const navigate = useNavigate();
  const { t, lang, toggle, dir } = useHaccpLang();
  const isAr = lang === "ar";

  const [metaRecords, setMetaRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [openDocNo, setOpenDocNo] = useState(null);
  const [hoverRow, setHoverRow] = useState(null);

  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [ownerFilter, setOwnerFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  /* ─── Load metadata records from API ─── */
  async function load() {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/reports?type=${encodeURIComponent(META_TYPE)}`, { cache: "no-store" });
      const json = await res.json().catch(() => null);
      const arr = Array.isArray(json) ? json : json?.data || json?.items || [];
      setMetaRecords(arr);
    } catch {
      setMetaRecords([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  /* ─── Build merged documents list ─── */
  const allDocs = useMemo(() => {
    const auto = getAutoImportedDocs();
    return mergeDocs(auto, metaRecords);
  }, [metaRecords]);

  /* ─── Compute review status for each doc ─── */
  const docsWithStatus = useMemo(() => {
    return allDocs.map((d) => {
      const reviewInfo = computeReviewStatus(d);
      const effectiveStatus = d.status || (reviewInfo.label === "overdue" ? "Review" : "Active");
      return { ...d, _reviewInfo: reviewInfo, _effectiveStatus: effectiveStatus };
    });
  }, [allDocs]);

  /* ─── KPIs ─── */
  const kpis = useMemo(() => {
    let active = 0, due = 0, overdue = 0, obsolete = 0;
    for (const d of docsWithStatus) {
      if (d._effectiveStatus === "Obsolete") { obsolete++; continue; }
      if (d._reviewInfo.label === "overdue") overdue++;
      else if (d._reviewInfo.label === "due") due++;
      else active++;
    }
    return { total: docsWithStatus.length, active, due, overdue, obsolete };
  }, [docsWithStatus]);

  /* ─── Owners list (for filter dropdown) ─── */
  const owners = useMemo(() => {
    const set = new Set();
    docsWithStatus.forEach((d) => { if (d.owner) set.add(d.owner); });
    return Array.from(set).sort();
  }, [docsWithStatus]);

  /* ─── Alerts ─── */
  const alerts = useMemo(() => {
    const overdueList = docsWithStatus
      .filter((d) => d._reviewInfo.label === "overdue" && d._effectiveStatus !== "Obsolete")
      .sort((a, b) => (a._reviewInfo.daysToReview ?? 0) - (b._reviewInfo.daysToReview ?? 0));
    const dueList = docsWithStatus
      .filter((d) => d._reviewInfo.label === "due" && d._effectiveStatus !== "Obsolete")
      .sort((a, b) => (a._reviewInfo.daysToReview ?? 0) - (b._reviewInfo.daysToReview ?? 0));
    return { overdueList, dueList };
  }, [docsWithStatus]);

  /* ─── Filtering ─── */
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return docsWithStatus.filter((d) => {
      if (typeFilter !== "all" && d.type !== typeFilter) return false;
      if (ownerFilter !== "all" && d.owner !== ownerFilter) return false;
      if (statusFilter !== "all" && d._effectiveStatus !== statusFilter) return false;
      if (q) {
        const blob = `${d.docNo} ${d.title} ${d.titleAr || ""} ${d.owner || ""} ${d.category || ""} ${d.isoClause || ""}`.toLowerCase();
        if (!blob.includes(q)) return false;
      }
      return true;
    }).sort((a, b) => {
      // Sort: overdue first, then due, then by docNo
      const sa = a._reviewInfo.label === "overdue" ? 0 : a._reviewInfo.label === "due" ? 1 : 2;
      const sb = b._reviewInfo.label === "overdue" ? 0 : b._reviewInfo.label === "due" ? 1 : 2;
      if (sa !== sb) return sa - sb;
      return String(a.docNo || "").localeCompare(String(b.docNo || ""));
    });
  }, [docsWithStatus, search, typeFilter, ownerFilter, statusFilter]);

  /* ─── Actions ─── */
  function exportCsv() {
    const csv = docsToCSV(filtered);
    const stamp = new Date().toISOString().slice(0, 10);
    downloadCSV(`document-register-${stamp}.csv`, csv);
  }

  function openSourceDoc(d) {
    if (d.sopId) {
      navigate(`/haccp-iso/sop-ssop?focus=${encodeURIComponent(d.sopId)}`);
    } else if (d.type === "Manual") {
      navigate(`/haccp-iso/haccp-manual`);
    }
  }

  function srcLabel(d) {
    if (d._src === "manual") return { kind: "manual", label: t("drManualBadge") };
    if (d._hasMeta) return { kind: "merged", label: t("drMergedBadge") };
    return { kind: "auto", label: t("drSourceBadge") };
  }

  /* ─── Render ─── */
  return (
    <main style={{ ...S.shell, direction: dir }}>
      <div style={S.layout}>
        {/* Header */}
        <div style={S.topbar}>
          <div style={{ minWidth: 0, flex: 1 }}>
            <div style={S.title}>{t("drListTitle")}</div>
            <div style={S.subtitle}>{t("drSubtitle")}</div>
            <HaccpLinkBadge clauses={["7.5"]} label={lang === "ar" ? "المعلومات الموثقة" : "Documented Information"} />
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <HaccpLangToggle lang={lang} toggle={toggle} />
            <button style={S.btn("secondary")} onClick={load} disabled={loading}>{loading ? "⏳" : t("refresh")}</button>
            <button style={S.btn("ghost")} onClick={exportCsv}>{t("drExportCsv")}</button>
            <button style={S.btn("primary")} onClick={() => navigate("/haccp-iso/document-register")}>{t("new")}</button>
            <button style={S.btn("secondary")} onClick={() => navigate("/haccp-iso")}>{t("backToHub")}</button>
          </div>
        </div>

        {/* KPIs */}
        <div style={S.kpiGrid}>
          <div style={S.kpi("#0f172a")}>
            <div style={S.kpiVal("#0f172a")}>{kpis.total}</div>
            <div style={S.kpiLabel}>{t("drKpiTotal")}</div>
          </div>
          <div style={S.kpi("#16a34a")}>
            <div style={S.kpiVal("#16a34a")}>{kpis.active}</div>
            <div style={S.kpiLabel}>{t("drKpiActive")}</div>
          </div>
          <div style={S.kpi("#d97706")}>
            <div style={S.kpiVal("#d97706")}>{kpis.due}</div>
            <div style={S.kpiLabel}>{t("drKpiDue")}</div>
          </div>
          <div style={S.kpi("#dc2626")}>
            <div style={S.kpiVal("#dc2626")}>{kpis.overdue}</div>
            <div style={S.kpiLabel}>{t("drKpiOverdue")}</div>
          </div>
          <div style={S.kpi("#64748b")}>
            <div style={S.kpiVal("#64748b")}>{kpis.obsolete}</div>
            <div style={S.kpiLabel}>{t("drKpiObsolete")}</div>
          </div>
        </div>

        {/* Alert banner — only if there are due/overdue docs */}
        {(alerts.overdueList.length > 0 || alerts.dueList.length > 0) && (
          <div style={S.alert}>
            <div style={S.alertTitle}>{t("drAlertTitle")}</div>
            <ul style={S.alertList}>
              {alerts.overdueList.slice(0, 5).map((d) => (
                <li key={`o-${d.docNo}`} style={S.alertOverdueRow}>
                  🔴 <strong>{d.docNo}</strong> — {isAr ? (d.titleAr || d.title) : d.title}
                  <span style={{ marginInlineStart: "auto", padding: "1px 8px", background: "#dc2626", color: "#fff", borderRadius: 6, fontSize: 10 }}>
                    {t("drDaysAgo", { n: Math.abs(d._reviewInfo.daysToReview) })}
                  </span>
                </li>
              ))}
              {alerts.dueList.slice(0, 5).map((d) => (
                <li key={`d-${d.docNo}`} style={S.alertRow}>
                  ⚠️ <strong>{d.docNo}</strong> — {isAr ? (d.titleAr || d.title) : d.title}
                  <span style={{ marginInlineStart: "auto", padding: "1px 8px", background: "#d97706", color: "#fff", borderRadius: 6, fontSize: 10 }}>
                    {t("drDaysToReview", { n: d._reviewInfo.daysToReview })}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Toolbar */}
        <div style={S.toolbar}>
          <input
            style={S.search}
            placeholder={t("drSearchPh")}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <select style={S.select} value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
            <option value="all">{t("drFilterAll")}</option>
            {Object.keys(DOC_TYPE_META).map((k) => (
              <option key={k} value={k}>{t(DOC_TYPE_META[k].i18nKey)}</option>
            ))}
          </select>
          <select style={S.select} value={ownerFilter} onChange={(e) => setOwnerFilter(e.target.value)}>
            <option value="all">{t("drFilterAllOwners")}</option>
            {owners.map((o) => <option key={o} value={o}>{o}</option>)}
          </select>
          <select style={S.select} value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="all">{t("drFilterAllStatuses")}</option>
            {Object.keys(DOC_STATUS_META).map((k) => (
              <option key={k} value={k}>{t(DOC_STATUS_META[k].i18nKey)}</option>
            ))}
          </select>
          <div style={{ marginInlineStart: "auto", fontSize: 12, color: "#64748b", fontWeight: 800 }}>
            {filtered.length} / {kpis.total}
          </div>
        </div>

        {/* Table */}
        {loading ? (
          <div style={S.empty}>{t("loading")}</div>
        ) : filtered.length === 0 ? (
          <div style={S.empty}>{t("noRecords")}</div>
        ) : (
          <div style={S.tableWrap}>
            <div style={{ overflowX: "auto" }}>
              <table style={S.table}>
                <thead>
                  <tr>
                    <th style={S.th}>{t("drColDocNo")}</th>
                    <th style={S.th}>{t("drColTitle")}</th>
                    <th style={S.th}>{t("drColType")}</th>
                    <th style={{ ...S.th, textAlign: "center" }}>{t("drColRev")}</th>
                    <th style={S.th}>{t("drColIssue")}</th>
                    <th style={S.th}>{t("drColReview")}</th>
                    <th style={S.th}>{t("drColOwner")}</th>
                    <th style={S.th}>{t("drColStatus")}</th>
                    <th style={{ ...S.th, textAlign: "center" }}>{t("drColActions")}</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((d) => {
                    const isOpen = openDocNo === d.docNo;
                    const isHovered = hoverRow === d.docNo;
                    const tMeta = DOC_TYPE_META[d.type] || DOC_TYPE_META.Other;
                    const sMeta = DOC_STATUS_META[d._effectiveStatus] || DOC_STATUS_META.Active;
                    const ri = d._reviewInfo;
                    const reviewBadge = ri.label === "overdue"
                      ? { label: t("drDaysAgo", { n: Math.abs(ri.daysToReview) }), color: "#fff", bg: "#dc2626" }
                      : ri.label === "due"
                      ? { label: t("drDaysToReview", { n: ri.daysToReview }), color: "#fff", bg: "#d97706" }
                      : { label: ri.daysToReview != null ? t("drDaysToReview", { n: ri.daysToReview }) : "—", color: "#475569", bg: "#f1f5f9" };
                    const src = srcLabel(d);

                    return (
                      <React.Fragment key={d.docNo}>
                        <tr
                          style={{
                            ...S.trBase,
                            ...(isOpen ? S.trExpanded : isHovered ? S.trHover : {}),
                          }}
                          onMouseEnter={() => setHoverRow(d.docNo)}
                          onMouseLeave={() => setHoverRow(null)}
                          onClick={() => setOpenDocNo(isOpen ? null : d.docNo)}
                        >
                          <td style={{ ...S.td, fontWeight: 900, color: "#0f172a", whiteSpace: "nowrap" }}>
                            {d.docNo}
                            <div style={{ marginTop: 2 }}>
                              <span style={S.srcBadge(src.kind)}>{src.label}</span>
                            </div>
                          </td>
                          <td style={{ ...S.td, fontWeight: 700, color: "#1e293b" }}>
                            {isAr ? (d.titleAr || d.title) : d.title}
                            {d.isoClause && (
                              <div style={{ fontSize: 11, color: "#64748b", fontWeight: 700, marginTop: 2 }}>
                                ISO {d.isoClause}
                              </div>
                            )}
                          </td>
                          <td style={S.td}>
                            <span style={S.typeBadge(tMeta.color, tMeta.icon)}>
                              {tMeta.icon} {t(tMeta.i18nKey).replace(/^[^\s]+\s/, "")}
                            </span>
                          </td>
                          <td style={{ ...S.td, textAlign: "center", fontWeight: 900, color: "#0f172a" }}>
                            {d.revision || "—"}
                          </td>
                          <td style={{ ...S.td, fontWeight: 700, color: "#475569", whiteSpace: "nowrap" }}>
                            {d.issueDate || "—"}
                          </td>
                          <td style={S.td}>
                            <span style={S.badge({ bg: reviewBadge.bg, color: reviewBadge.color })}>
                              {reviewBadge.label}
                            </span>
                          </td>
                          <td style={{ ...S.td, fontWeight: 700, color: "#475569" }}>{d.owner || "—"}</td>
                          <td style={S.td}>
                            <span style={S.badge({ bg: sMeta.bg, color: sMeta.color })}>
                              {t(sMeta.i18nKey)}
                            </span>
                          </td>
                          <td style={{ ...S.td, textAlign: "center", whiteSpace: "nowrap" }}>
                            <button
                              style={{ ...S.btn("ghost"), padding: "5px 10px", fontSize: 11 }}
                              onClick={(e) => {
                                e.stopPropagation();
                                navigate(`/haccp-iso/document-register?docNo=${encodeURIComponent(d.docNo)}`);
                              }}
                              title={t("drEditMeta")}
                            >
                              ✏️
                            </button>
                          </td>
                        </tr>

                        {isOpen && (
                          <tr>
                            <td colSpan={9} style={{ padding: 0 }}>
                              <div style={S.detail}>
                                <div style={S.detailGrid}>
                                  {d.approvedBy && (
                                    <div style={S.detailItem}>
                                      <div style={S.detailLabel}>{t("drApprovedByLabel")}</div>
                                      <div style={S.detailValue}>{d.approvedBy}</div>
                                    </div>
                                  )}
                                  {d.distribution && (
                                    <div style={S.detailItem}>
                                      <div style={S.detailLabel}>{t("drDistributionLabel")}</div>
                                      <div style={S.detailValue}>{d.distribution}</div>
                                    </div>
                                  )}
                                  {d.retentionYears && (
                                    <div style={S.detailItem}>
                                      <div style={S.detailLabel}>{t("drRetentionLabel")}</div>
                                      <div style={S.detailValue}>{d.retentionYears} {t("drYearsUnit")}</div>
                                    </div>
                                  )}
                                  {d.storage && (
                                    <div style={S.detailItem}>
                                      <div style={S.detailLabel}>{t("drStorageLabel")}</div>
                                      <div style={S.detailValue}>{d.storage}</div>
                                    </div>
                                  )}
                                  {d.facility && (
                                    <div style={S.detailItem}>
                                      <div style={S.detailLabel}>{lang === "ar" ? "📍 المنشأة" : "📍 Facility"}</div>
                                      <div style={S.detailValue}>{d.facility}</div>
                                    </div>
                                  )}
                                  {d.replacedBy && (
                                    <div style={S.detailItem}>
                                      <div style={S.detailLabel}>{lang === "ar" ? "↪️ استبدلت بـ" : "↪️ Replaced by"}</div>
                                      <div style={S.detailValue}>{d.replacedBy}</div>
                                    </div>
                                  )}
                                </div>
                                {d.notes && (
                                  <div style={S.detailNotes}>{d.notes}</div>
                                )}
                                {!d._hasMeta && (
                                  <div style={{ ...S.detailNotes, color: "#94a3b8", fontStyle: "italic", textAlign: "center" }}>
                                    {t("drNoMetadata")}
                                  </div>
                                )}
                                <div style={{ display: "flex", gap: 8, marginTop: 10, flexWrap: "wrap" }}>
                                  {(d.sopId || d.type === "Manual") && (
                                    <button style={S.btn("primary")} onClick={(e) => { e.stopPropagation(); openSourceDoc(d); }}>
                                      {t("drViewSource")}
                                    </button>
                                  )}
                                  <button
                                    style={S.btn("ghost")}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      navigate(`/haccp-iso/document-register?docNo=${encodeURIComponent(d.docNo)}`);
                                    }}
                                  >
                                    {t("drEditMeta")}
                                  </button>
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div style={S.hint}>{t("drClickRowHint")}</div>
          </div>
        )}
      </div>
    </main>
  );
}
