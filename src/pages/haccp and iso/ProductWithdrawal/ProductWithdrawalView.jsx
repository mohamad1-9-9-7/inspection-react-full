// src/pages/haccp and iso/ProductWithdrawal/ProductWithdrawalView.jsx
// Product Withdrawal records + KPI dashboard (ISO 8.9.5 "Withdrawal")
// Design mirrors MockRecallView — navy header, KPI row, collapsible cards.

import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import API_BASE from "../../../config/api";
import HaccpLinkBadge from "../FSMSManual/HaccpLinkBadge";
import { useHaccpLang, HaccpLangToggle } from "../_shared/haccpI18n";
import { TYPE, summarizeLocations, computeSecureHours, needsRecallEscalation } from "./productWithdrawalUtils";
import ProductWithdrawalTrendReportModal from "./ProductWithdrawalTrendReport";
import WithdrawalAttachments from "./WithdrawalAttachments";
import { traceLinkTitle } from "./TraceLinkPicker";

/* Plain (emoji-free) status labels for the coloured pill. */
const STATUS_SHORT = {
  ar: { Open: "مفتوح", InProgress: "قيد التنفيذ", Secured: "مؤمَّن", Closed: "مغلق" },
  en: { Open: "OPEN", InProgress: "IN PROGRESS", Secured: "SECURED", Closed: "CLOSED" },
};

const STATUS_COLOR = {
  Open:       "#b91c1c",
  InProgress: "#a16207",
  Secured:    "#1d4ed8",
  Closed:     "#15803d",
};

const CLASS_META = {
  A: { color: "#b91c1c", bg: "#fee2e2", label: "Level A" },
  B: { color: "#a16207", bg: "#fef3c7", label: "Level B" },
  C: { color: "#155e75", bg: "#cffafe", label: "Level C" },
};

const LEVEL_KEY = {
  Warehouse: "pwLevelWarehouse",
  Transit: "pwLevelTransit",
  Branch: "pwLevelBranch",
  Shelf: "pwLevelShelf",
  Wholesale: "pwLevelWholesale",
};

const REASON_KEY = {
  Micro: "pwReasonMicro",
  Chemical: "pwReasonChemical",
  Foreign: "pwReasonForeign",
  Allergen: "pwReasonAllergen",
  Label: "pwReasonLabel",
  Temperature: "pwReasonTemp",
  ShelfLife: "pwReasonShelfLife",
  Halal: "pwReasonHalal",
  Packaging: "pwReasonPackaging",
  Regulatory: "pwReasonRegulatory",
  Other: "pwReasonOther",
};

const SOURCE_KEY = {
  InternalQC: "pwSourceInternalQC",
  Lab: "pwSourceLab",
  Supplier: "pwSourceSupplier",
  Complaint: "pwSourceComplaint",
  Authority: "pwSourceAuthority",
  Trace: "pwSourceTrace",
  Other: "pwSourceOther",
};

const DISPOSITION_KEY = {
  Pending: "pwDispPending",
  Destroy: "pwDispDestroy",
  Rework: "pwDispRework",
  Redirect: "pwDispRedirect",
  ReturnSupplier: "pwDispReturnSupplier",
  Release: "pwDispRelease",
  Mixed: "pwDispMixed",
};

const NOTIFY_KEY = {
  Branches: "pwNotifyBranches",
  Ops: "pwNotifyOps",
  Warehouse: "pwNotifyWarehouse",
  Mgmt: "pwNotifyMgmt",
  Wholesale: "pwNotifyWholesale",
  Supplier: "pwNotifySupplier",
};

const TRISTATE_KEY = { yes: "pwYes", partial: "pwPartial", no: "pwNo" };

/* Records saved before totals were denormalised still recompute correctly. */
function statsOf(p) {
  const totals = summarizeLocations(p?.locations);
  const rate = typeof p?.accountedRate === "number" ? p.accountedRate : totals.accountedRate;
  return { totals, rate };
}

const rateColor = (r) =>
  r == null ? "#64748b" : r >= 100 ? "#15803d" : r >= 80 ? "#a16207" : "#b91c1c";

export default function ProductWithdrawalView() {
  const navigate = useNavigate();
  const { t, lang, toggle, dir } = useHaccpLang();
  const isAr = lang === "ar";

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [expandedId, setExpandedId] = useState(null);

  const [classFilter, setClassFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [reasonFilter, setReasonFilter] = useState("all");
  const [yearFilter, setYearFilter] = useState("all");
  const [query, setQuery] = useState("");
  const [trendOpen, setTrendOpen] = useState(false);

  async function load() {
    setLoading(true);
    setErr("");
    try {
      const res = await fetch(`${API_BASE}/api/reports?type=${encodeURIComponent(TYPE)}`, { cache: "no-store" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json().catch(() => null);
      const arr = Array.isArray(json) ? json : json?.data || json?.items || [];
      arr.sort((a, b) => {
        const da = a?.payload?.initDate || a?.createdAt || "";
        const db = b?.payload?.initDate || b?.createdAt || "";
        return da < db ? 1 : -1;
      });
      setItems(arr);
    } catch (e) {
      setErr(e?.message || String(e));
      setItems([]);
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => { load(); }, []);

  async function handleDelete(id) {
    if (!id) return;
    if (!window.confirm(t("confirmDelete"))) return;
    try {
      const res = await fetch(`${API_BASE}/api/reports/${encodeURIComponent(id)}`, { method: "DELETE" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setItems((prev) => prev.filter((it) => (it.id || it._id) !== id));
    } catch (e) {
      alert(t("deleteError") + ": " + (e?.message || e));
    }
  }

  const years = useMemo(() => {
    const set = new Set();
    items.forEach((it) => {
      const d = it?.payload?.initDate || "";
      if (d) set.add(d.slice(0, 4));
    });
    return ["all", ...Array.from(set).sort((a, b) => (a < b ? 1 : -1))];
  }, [items]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return items.filter((it) => {
      const p = it?.payload || {};
      if (yearFilter !== "all" && (p.initDate || "").slice(0, 4) !== yearFilter) return false;
      if (classFilter !== "all" && p.withdrawalClass !== classFilter) return false;
      if (statusFilter !== "all" && (p.status || "Open") !== statusFilter) return false;
      if (reasonFilter !== "all" && p.reason !== reasonFilter) return false;
      if (q) {
        const hay = `${p.withdrawalNumber || ""} ${p.product || ""} ${p.batches || ""}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [items, yearFilter, classFilter, statusFilter, reasonFilter, query]);

  /* ====== KPI Dashboard ====== */
  const kpis = useMemo(() => {
    let open = 0, closed = 0, escalated = 0, totalCost = 0;
    const rates = [];
    const secureHrs = [];
    for (const it of filtered) {
      const p = it?.payload || {};
      if ((p.status || "Open") === "Closed") closed++; else open++;
      if (needsRecallEscalation(p)) escalated++;
      if (p.cost) totalCost += parseFloat(p.cost) || 0;
      const { rate } = statsOf(p);
      if (rate != null) rates.push(rate);
      const h = computeSecureHours(p.initDate, p.initTime, p.holdCompleted);
      if (h != null) secureHrs.push(h);
    }
    const avg = (a) => (a.length ? a.reduce((s, n) => s + n, 0) / a.length : null);
    return {
      total: filtered.length,
      open, closed, escalated, totalCost,
      avgRate: avg(rates),
      avgSecure: avg(secureHrs),
      within24: secureHrs.filter((h) => h <= 24).length,
      secureN: secureHrs.length,
    };
  }, [filtered]);

  return (
    <div style={{ ...S.shell, direction: dir }}>
      {/* ===== Header ===== */}
      <div style={S.header}>
        <div>
          <h1 style={{ margin: 0, fontSize: "1.5rem", fontWeight: 900 }}>{t("pwListTitle")}</h1>
          <div style={{ opacity: 0.85, marginTop: 4, fontSize: "0.92rem" }}>{t("pwSubtitle")}</div>
          <HaccpLinkBadge clauses={["8.9.5"]} label={isAr ? "سحب المنتج" : "Withdrawal"} />
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
          <HaccpLangToggle lang={lang} toggle={toggle} />
          <button style={S.btnSecondary} onClick={() => setTrendOpen(true)} disabled={!items.length}>
            {t("pwTrend")}
          </button>
          <button style={S.btnSecondary} onClick={() => navigate("/haccp-iso/real-recall/view")}>
            {t("pwOpenRecall")}
          </button>
          <button style={S.btnSecondary} onClick={load} disabled={loading}>
            {loading ? "⏳" : t("refresh")}
          </button>
          <button style={S.btnPrimary} onClick={() => navigate("/haccp-iso/product-withdrawal")}>
            {t("new")}
          </button>
          <button style={S.btnSecondary} onClick={() => navigate("/haccp-iso")}>{t("backToHub")}</button>
        </div>
      </div>

      {/* ===== Scope note ===== */}
      <div style={S.infoBox}>ℹ️ {t("pwVsRecall")}</div>

      {/* ===== KPI Dashboard ===== */}
      <div style={S.kpiRow}>
        <KPICard
          icon="📦"
          label={t("pwTotal")}
          value={kpis.total}
          sub={yearFilter === "all" ? (isAr ? "كل السنوات" : "All years") : yearFilter}
          accent="#1e40af"
        />
        <KPICard
          icon={kpis.open > 0 ? "🟠" : "✅"}
          label={t("pwOpen")}
          value={kpis.open}
          sub={`${kpis.closed} ${isAr ? "مغلقة" : "closed"}`}
          accent={kpis.open > 0 ? "#a16207" : "#15803d"}
        />
        <KPICard
          icon={kpis.avgRate !== null && kpis.avgRate >= 100 ? "✅" : "⚠️"}
          label={t("pwAvgAccounted")}
          value={kpis.avgRate !== null ? `${kpis.avgRate.toFixed(1)}%` : "—"}
          sub={t("pwAccountedHint")}
          accent={rateColor(kpis.avgRate)}
          bad={kpis.avgRate !== null && kpis.avgRate < 80}
        />
        <KPICard
          icon="⏱️"
          label={t("pwTimeToSecure")}
          value={kpis.avgSecure !== null ? `${kpis.avgSecure.toFixed(1)} h` : "—"}
          sub={kpis.secureN ? `${kpis.within24}/${kpis.secureN} ${isAr ? "ضمن 24 ساعة" : "within 24 h"}` : t("pwTimeToSecureHint")}
          accent="#0891b2"
          bad={kpis.avgSecure !== null && kpis.avgSecure > 24}
        />
        <KPICard
          icon={kpis.escalated > 0 ? "🚨" : "🛡️"}
          label={t("pwEscalated")}
          value={kpis.escalated}
          sub={kpis.escalated > 0 ? (isAr ? "تجاوزت نطاق السحب" : "beyond withdrawal scope") : (isAr ? "لا شيء" : "none")}
          accent={kpis.escalated > 0 ? "#b91c1c" : "#15803d"}
          bad={kpis.escalated > 0}
        />
        <KPICard
          icon="💰"
          label={t("pwTotalCost")}
          value={kpis.totalCost ? kpis.totalCost.toLocaleString() : "—"}
          sub="AED"
          accent="#7c3aed"
        />
      </div>

      {/* ===== Filters ===== */}
      <div style={S.filtersBar}>
        <input
          style={{ ...S.select, minWidth: 220, flex: 1 }}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t("pwSearchPh")}
        />
        <select style={S.select} value={yearFilter} onChange={(e) => setYearFilter(e.target.value)}>
          {years.map((y) => (
            <option key={y} value={y}>{y === "all" ? (isAr ? "كل السنوات" : "All years") : y}</option>
          ))}
        </select>
        <select style={S.select} value={classFilter} onChange={(e) => setClassFilter(e.target.value)}>
          <option value="all">{t("pwFilterAllClasses")}</option>
          <option value="A">Level A</option>
          <option value="B">Level B</option>
          <option value="C">Level C</option>
        </select>
        <select style={S.select} value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
          <option value="all">{t("pwFilterAllStatuses")}</option>
          <option value="Open">{t("pwStatusOpen")}</option>
          <option value="InProgress">{t("pwStatusInProgress")}</option>
          <option value="Secured">{t("pwStatusSecured")}</option>
          <option value="Closed">{t("pwStatusClosed")}</option>
        </select>
        <select style={S.select} value={reasonFilter} onChange={(e) => setReasonFilter(e.target.value)}>
          <option value="all">{t("pwFilterAllReasons")}</option>
          {Object.entries(REASON_KEY).map(([k, tk]) => (
            <option key={k} value={k}>{t(tk)}</option>
          ))}
        </select>
        <span style={{ color: "#64748b", fontSize: "0.88rem", fontWeight: 700 }}>
          {filtered.length} / {items.length}
        </span>
      </div>

      {/* ===== List ===== */}
      {err && <div style={S.errorBox}>❌ {err}</div>}

      {loading ? (
        <div style={S.empty}>{t("loading")}</div>
      ) : !filtered.length ? (
        <div style={S.empty}>{t("noRecords")}</div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {filtered.map((it) => {
            const p = it?.payload || {};
            const id = it?.id || it?._id;
            const isExpanded = expandedId === id;
            const status = p.status || "Open";
            const cls = CLASS_META[p.withdrawalClass] || CLASS_META.B;
            const { totals, rate } = statsOf(p);
            const escalate = needsRecallEscalation(p);
            const hrs = computeSecureHours(p.initDate, p.initTime, p.holdCompleted);

            return (
              <div key={id} style={S.card}>
                <div
                  style={{ ...S.cardHead, cursor: "pointer" }}
                  onClick={() => setExpandedId(isExpanded ? null : id)}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 12, flex: 1, minWidth: 0 }}>
                    <span style={{ ...S.statusPill, background: STATUS_COLOR[status] || "#64748b" }}>
                      {(isAr ? STATUS_SHORT.ar : STATUS_SHORT.en)[status] || status}
                    </span>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontWeight: 800, color: "#0b1f4d", fontSize: "1rem" }}>
                        📦 {p.withdrawalNumber || "WD"} · {p.product || "—"}
                        {p.batches ? <span style={{ color: "#64748b", fontWeight: 700 }}> · Lot {p.batches}</span> : null}
                      </div>
                      <div style={{ fontSize: "0.85rem", color: "#64748b", fontWeight: 600, marginTop: 2 }}>
                        📅 {p.initDate || "—"}{p.initTime ? ` ${p.initTime}` : ""} · 👤 {p.initiatedBy || "—"}
                      </div>
                      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 6 }}>
                        <Chip bg={cls.bg} color={cls.color}>{cls.label}</Chip>
                        {p.distributionLevel && (
                          <Chip bg="#f1f5f9" color="#334155">📍 {t(LEVEL_KEY[p.distributionLevel] || "pwLevelWarehouse")}</Chip>
                        )}
                        {p.reason && (
                          <Chip bg="#ede9fe" color="#5b21b6">{t(REASON_KEY[p.reason] || "pwReasonOther")}</Chip>
                        )}
                        {hrs != null && (
                          <Chip
                            bg={hrs <= 24 ? "#dcfce7" : hrs <= 48 ? "#fef3c7" : "#fee2e2"}
                            color={hrs <= 24 ? "#166534" : hrs <= 48 ? "#854d0e" : "#991b1b"}
                          >
                            ⏱ {hrs.toFixed(1)}h
                          </Chip>
                        )}
                        {Array.isArray(p.attachments) && p.attachments.length > 0 && (
                          <Chip bg="#e0e7ff" color="#3730a3">📎 {p.attachments.length}</Chip>
                        )}
                        {escalate && (
                          <Chip bg="#fee2e2" color="#991b1b">
                            🚨 {t("pwEscalated")}{p.recallRef ? ` · ${p.recallRef}` : ""}
                          </Chip>
                        )}
                      </div>
                    </div>
                  </div>

                  <div style={{ display: "flex", gap: 10, alignItems: "center", flexShrink: 0, flexWrap: "wrap" }}>
                    <Stat
                      label={t("pwAccountedRate")}
                      value={rate != null ? `${rate.toFixed(1)}%` : "—"}
                      color={rateColor(rate)}
                    />
                    <Stat
                      label={t("pwLocDispatched")}
                      value={totals.dispatched ? `${totals.dispatched} ${p.unit || ""}` : "—"}
                    />
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); navigate(`/haccp-iso/product-withdrawal?edit=${encodeURIComponent(id)}`); }}
                      style={S.btnEdit}
                      title={t("edit")}
                    >
                      ✏️
                    </button>
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); handleDelete(id); }}
                      style={S.btnDelete}
                      title={t("del")}
                      data-delete-action="true"
                    >
                      🗑️
                    </button>
                    <span style={{ color: "#64748b", fontSize: "1.2rem" }}>{isExpanded ? "▲" : "▼"}</span>
                  </div>
                </div>

                {isExpanded && (
                  <div style={S.cardBody}>
                    {escalate && (
                      <div style={S.dangerBox}>
                        {t("pwEscalateWarn")}
                        <div style={{ marginTop: 8 }}>
                          <button
                            type="button"
                            style={S.linkBtn}
                            onClick={() => navigate("/haccp-iso/real-recall/view")}
                          >
                            {t("pwOpenRecall")}
                          </button>
                        </div>
                      </div>
                    )}

                    {/* ── Trigger & reason ── */}
                    <div style={S.subTitle}>{t("pwTriggerTitle")}</div>
                    <DetailRow label={t("pwSource")} value={p.source ? t(SOURCE_KEY[p.source] || "pwSourceOther") : ""} />
                    <DetailRow label={t("pwReason")} value={p.reason ? t(REASON_KEY[p.reason] || "pwReasonOther") : ""} />
                    <DetailRow label={t("pwDecisionBy")} value={p.decisionBy} />
                    {p.reasonDetail && <div style={{ ...S.text, marginTop: 8 }}>{p.reasonDetail}</div>}

                    {/* ── Affected product ── */}
                    <div style={{ ...S.subTitle, marginTop: 14 }}>{t("pwAffectedTitle")}</div>
                    <DetailRow label={t("pwBatches")} value={p.batches} />
                    <DetailRow label={t("pwProductionDates")} value={p.productionDates} />
                    <DetailRow label={t("pwExpiryRange")} value={p.expiryRange} />
                    <DetailRow label={t("pwProductCode")} value={p.productCode} />
                    <DetailRow label={t("pwPackSize")} value={p.packSize} />
                    <DetailRow label={t("pwTraceRef")} value={p.traceRef} />

                    {/* Linked traceability record */}
                    {p.traceLink && (
                      <div style={S.linkedCard}>
                        <div style={{ fontWeight: 800, color: "#0b1f4d", fontSize: "0.9rem" }}>
                          🔗 {traceLinkTitle(p.traceLink, t)}
                        </div>
                        <div style={{ fontSize: "0.8rem", color: "#64748b", fontWeight: 600, marginTop: 3 }}>
                          📅 {p.traceLink.date || "—"}
                          {p.traceLink.branch ? ` · 🏭 ${p.traceLink.branch}` : ""}
                          {p.traceLink.rowsCount ? ` · ${p.traceLink.rowsCount} ${t("pwTraceRows")}` : ""}
                          {p.traceLink.tracedPct != null ? ` · ${p.traceLink.tracedPct.toFixed(1)}%` : ""}
                        </div>
                        {p.traceLink.kind === "mock_recall" && (
                          <button
                            type="button"
                            style={{ ...S.btnEdit, marginTop: 8 }}
                            onClick={() => navigate("/haccp-iso/mock-recall/view")}
                          >
                            {t("pwOpenTrace")}
                          </button>
                        )}
                      </div>
                    )}

                    {/* ── Stock hold matrix ── */}
                    {Array.isArray(p.locations) && p.locations.length > 0 && (
                      <div style={{ marginTop: 14 }}>
                        <div style={S.subTitle}>📍 {t("pwLocationsTitle")}</div>
                        <div style={{ overflowX: "auto" }}>
                          <table style={S.miniTable}>
                            <thead>
                              <tr>
                                <th style={S.miniTh}>{t("pwLocLocation")}</th>
                                <th style={S.miniTh}>{t("pwLocDispatched")}</th>
                                <th style={S.miniTh}>{t("pwLocHeld")}</th>
                                <th style={S.miniTh}>{t("pwLocReturned")}</th>
                                <th style={S.miniTh}>{t("pwLocSold")}</th>
                                <th style={S.miniTh}>{t("pwLocContact")}</th>
                                <th style={S.miniTh}>{t("pwLocNotifiedAt")}</th>
                                <th style={S.miniTh}>✓</th>
                              </tr>
                            </thead>
                            <tbody>
                              {p.locations.map((l, i) => {
                                const sold = parseFloat(l.sold) || 0;
                                return (
                                  <tr key={l.uid || i} style={sold > 0 ? { background: "#fef2f2" } : undefined}>
                                    <td style={S.miniTd}>{l.location || "—"}</td>
                                    <td style={S.miniTd}>{l.dispatched || "—"}</td>
                                    <td style={S.miniTd}>{l.held || "—"}</td>
                                    <td style={S.miniTd}>{l.returned || "—"}</td>
                                    <td style={{ ...S.miniTd, color: sold > 0 ? "#b91c1c" : undefined, fontWeight: sold > 0 ? 900 : 600 }}>
                                      {l.sold || "—"}
                                    </td>
                                    <td style={S.miniTd}>{l.contact || "—"}</td>
                                    <td style={S.miniTd}>{(l.notifiedAt || "").replace("T", " ") || "—"}</td>
                                    <td style={{ ...S.miniTd, textAlign: "center" }}>{l.confirmed ? "✅" : "—"}</td>
                                  </tr>
                                );
                              })}
                              <tr style={{ background: "#f1f5f9", fontWeight: 900 }}>
                                <td style={S.miniTd}>{t("pwLocTotals")}</td>
                                <td style={S.miniTd}>{totals.dispatched}</td>
                                <td style={S.miniTd}>{totals.held}</td>
                                <td style={S.miniTd}>{totals.returned}</td>
                                <td style={{ ...S.miniTd, color: totals.sold > 0 ? "#b91c1c" : undefined }}>{totals.sold}</td>
                                <td style={S.miniTd} colSpan={3}>
                                  {totals.confirmedCount} / {totals.locationCount} ✓
                                </td>
                              </tr>
                            </tbody>
                          </table>
                        </div>

                        {rate != null && (
                          <div style={{ marginTop: 10, display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                            <span style={{ fontWeight: 800, color: "#0b1f4d", fontSize: "0.9rem" }}>
                              {t("pwAccountedRate")}:{" "}
                              <span style={{ color: rateColor(rate) }}>{rate.toFixed(1)}%</span>
                            </span>
                            <div style={S.barOuter}>
                              <div style={{ ...S.barInner, width: `${Math.min(100, rate)}%`, background: rateColor(rate) }} />
                            </div>
                            <span style={{ fontSize: "0.8rem", color: "#64748b", fontWeight: 600 }}>
                              {totals.secured} / {totals.dispatched} {p.unit || ""}
                            </span>
                          </div>
                        )}
                      </div>
                    )}

                    {/* ── Hold & quarantine ── */}
                    {(p.holdArea || p.holdStart || p.holdCompleted) && (
                      <div style={{ marginTop: 14 }}>
                        <div style={S.subTitle}>🔒 {t("pwHoldTitle")}</div>
                        <DetailRow label={t("pwHoldArea")} value={p.holdArea} />
                        <DetailRow label={t("pwHoldStart")} value={(p.holdStart || "").replace("T", " ")} />
                        <DetailRow label={t("pwHoldCompleted")} value={(p.holdCompleted || "").replace("T", " ")} />
                        {hrs != null && (
                          <DetailRow label={t("pwTimeToSecure")} value={`${hrs.toFixed(1)} h ${hrs <= 24 ? "✅" : "⚠️"}`} />
                        )}
                        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 8 }}>
                          {[["holdLabel", "pwHoldLabel"], ["holdSegregated", "pwHoldSegregated"], ["holdSystemBlock", "pwHoldSystemBlock"]].map(([k, tk]) => {
                            const v = p[k];
                            if (!v) return null;
                            const c = v === "yes" ? { bg: "#dcfce7", color: "#166534", mark: "✓" }
                                    : v === "partial" ? { bg: "#fef3c7", color: "#854d0e", mark: "◐" }
                                    : { bg: "#fee2e2", color: "#991b1b", mark: "✕" };
                            return (
                              <Chip key={k} bg={c.bg} color={c.color}>
                                {c.mark} {t(tk)} — {t(TRISTATE_KEY[v] || "pwNo")}
                              </Chip>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* ── Notifications ── */}
                    {p.notified && (
                      <div style={{ marginTop: 14 }}>
                        <div style={S.subTitle}>📢 {t("pwNotifyTitle")}</div>
                        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                          {Object.entries(p.notified).filter(([, v]) => v).map(([k]) => (
                            <Chip key={k} bg="#dbeafe" color="#1e40af">✓ {t(NOTIFY_KEY[k] || "pwNotifyOps")}</Chip>
                          ))}
                          {Object.values(p.notified).every((v) => !v) && (
                            <span style={{ fontSize: "0.85rem", color: "#94a3b8", fontStyle: "italic" }}>
                              {isAr ? "لم تُخطر أي جهة" : "No party notified"}
                            </span>
                          )}
                          {p.authorityNotified === "yes" && (
                            <Chip bg="#fce7f3" color="#9f1239">
                              🏛 {p.authorityWhich || t("pwAuthorityWhich")}
                              {p.authorityAt ? ` · ${p.authorityAt.replace("T", " ")}` : ""}
                            </Chip>
                          )}
                          {p.noticeIssued === "yes" && (
                            <Chip bg="#e0e7ff" color="#3730a3">📄 {p.noticeRef || t("pwNoticeIssued")}</Chip>
                          )}
                        </div>
                      </div>
                    )}

                    {/* ── Disposition ── */}
                    {p.disposition && (
                      <div style={{ marginTop: 14 }}>
                        <div style={S.subTitle}>♻️ {t("pwDispositionTitle")}</div>
                        <DetailRow label={t("pwDispositionTitle")} value={t(DISPOSITION_KEY[p.disposition] || "pwDispPending")} />
                        <DetailRow label={t("pwDestructionRef")} value={p.destructionRef} />
                        {p.dispositionDetails && <div style={{ ...S.text, marginTop: 8 }}>{p.dispositionDetails}</div>}
                      </div>
                    )}

                    {/* ── Cost ── */}
                    {(p.cost || p.costBreakdown) && (
                      <div style={{ marginTop: 14 }}>
                        <div style={S.subTitle}>💰 {t("pwCostTitle")}</div>
                        <DetailRow label={t("pwCost")} value={p.cost ? `${parseFloat(p.cost).toLocaleString()} AED` : ""} />
                        {p.costBreakdown && <div style={{ ...S.text, marginTop: 8 }}>{p.costBreakdown}</div>}
                      </div>
                    )}

                    {/* ── Verification ── */}
                    {(p.verifiedBy || p.verificationNotes || p.verificationDate) && (
                      <div style={{ marginTop: 14 }}>
                        <div style={S.subTitle}>🔎 {t("pwVerifyTitle")}</div>
                        <DetailRow label={t("pwVerifiedBy")} value={p.verifiedBy} />
                        <DetailRow label={t("pwVerificationDate")} value={p.verificationDate} />
                        {p.verificationNotes && <div style={{ ...S.text, marginTop: 8 }}>{p.verificationNotes}</div>}
                      </div>
                    )}

                    {/* ── CAPA ── */}
                    {(p.rootCause || p.correctiveActions || p.preventiveActions || p.ncrRef) && (
                      <div style={{ marginTop: 14 }}>
                        <div style={S.subTitle}>🛠️ {t("pwCAPATitle")}</div>
                        {p.rootCause && (
                          <>
                            <div style={S.microTitle}>{t("pwRootCause")}</div>
                            <div style={S.text}>{p.rootCause}</div>
                          </>
                        )}
                        {p.correctiveActions && (
                          <>
                            <div style={S.microTitle}>{t("pwCorrectiveActions")}</div>
                            <div style={S.text}>{p.correctiveActions}</div>
                          </>
                        )}
                        {p.preventiveActions && (
                          <>
                            <div style={S.microTitle}>{t("pwPreventiveActions")}</div>
                            <div style={S.text}>{p.preventiveActions}</div>
                          </>
                        )}
                        <DetailRow label={t("pwNcrRef")} value={p.ncrRef} />
                      </div>
                    )}

                    {/* ── Supporting documents ── */}
                    {Array.isArray(p.attachments) && p.attachments.length > 0 && (
                      <div style={{ marginTop: 14 }}>
                        <div style={S.subTitle}>
                          {t("pwAttTitle")} ({p.attachments.length})
                        </div>
                        <WithdrawalAttachments
                          value={p.attachments}
                          onChange={() => {}}
                          t={t}
                          lang={lang}
                          dir={dir}
                          readOnly
                        />
                      </div>
                    )}

                    {/* ── Closure ── */}
                    <div style={{ marginTop: 14 }}>
                      <div style={S.subTitle}>✍️ {t("pwStatusTitle")}</div>
                      <DetailRow label={t("pwStatus")} value={t(`pwStatus${status}`)} />
                      <DetailRow label={t("pwClosureDate")} value={p.closureDate} />
                      <DetailRow label={t("pwSignedBy")} value={p.signedBy} />
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {trendOpen && (
        <ProductWithdrawalTrendReportModal items={items} lang={lang} onClose={() => setTrendOpen(false)} />
      )}
    </div>
  );
}

/* ===== Atoms ===== */
function KPICard({ icon, label, value, sub, accent = "#1e40af", bad }) {
  return (
    <div style={{
      flex: "1 1 180px",
      minWidth: 180,
      background: "#fff",
      border: "1px solid #e5e7eb",
      borderInlineStart: `4px solid ${bad ? "#ef4444" : accent}`,
      borderRadius: 12,
      padding: "12px 14px",
      boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
        <span style={{ fontSize: 18 }}>{icon}</span>
        <span style={{ fontSize: "0.78rem", fontWeight: 700, color: "#64748b", textTransform: "uppercase" }}>{label}</span>
      </div>
      <div style={{ fontSize: "1.6rem", fontWeight: 900, color: bad ? "#b91c1c" : accent, lineHeight: 1.1, marginTop: 4 }}>{value}</div>
      {sub && <div style={{ fontSize: "0.78rem", color: "#64748b", fontWeight: 600 }}>{sub}</div>}
    </div>
  );
}

function Stat({ label, value, color }) {
  return (
    <div style={{ textAlign: "center" }}>
      <div style={{ fontSize: "0.7rem", color: "#64748b", fontWeight: 700, textTransform: "uppercase" }}>{label}</div>
      <div style={{ fontWeight: 900, color: color || "#0b1f4d", fontSize: "0.92rem" }}>{value}</div>
    </div>
  );
}

function Chip({ bg, color, children }) {
  return (
    <span style={{
      background: bg,
      color,
      padding: "2px 10px",
      borderRadius: 999,
      fontSize: "0.75rem",
      fontWeight: 800,
      whiteSpace: "nowrap",
    }}>{children}</span>
  );
}

function DetailRow({ label, value }) {
  if (value === undefined || value === null || value === "") return null;
  return (
    <div style={{ display: "flex", gap: 10, padding: "4px 0", borderBottom: "1px dashed #e5e7eb", fontSize: "0.9rem" }}>
      <span style={{ fontWeight: 700, color: "#475569", minWidth: 150 }}>{String(label).replace(" *", "")}:</span>
      <span style={{ color: "#0f172a" }}>{value}</span>
    </div>
  );
}

/* ===== Styles ===== */
const S = {
  shell: {
    minHeight: "100vh",
    padding: "20px 18px",
    background: "linear-gradient(150deg,#eef2ff,#f8fafc 55%,#ecfdf5)",
    fontFamily: "system-ui,-apple-system,'Segoe UI',sans-serif",
  },
  header: {
    background: "linear-gradient(135deg,#1e3a5f,#2d5a8e)",
    color: "#fff",
    padding: "18px 22px",
    borderRadius: 14,
    boxShadow: "0 6px 18px rgba(30,58,95,0.20)",
    marginBottom: 14,
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
    flexWrap: "wrap",
  },
  infoBox: {
    background: "#eff6ff",
    border: "1px solid #bfdbfe",
    color: "#1e3a8a",
    borderRadius: 12,
    padding: "10px 14px",
    marginBottom: 14,
    fontSize: "0.88rem",
    fontWeight: 700,
    lineHeight: 1.6,
  },
  kpiRow: { display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 14 },
  filtersBar: {
    background: "#fff",
    border: "1px solid #e5e7eb",
    borderRadius: 12,
    padding: 12,
    marginBottom: 14,
    display: "flex",
    gap: 10,
    flexWrap: "wrap",
    alignItems: "center",
  },
  select: {
    padding: "9px 12px",
    borderRadius: 8,
    border: "1.5px solid #e2e8f0",
    background: "#f8fafc",
    fontWeight: 700,
    fontSize: "0.92rem",
    minWidth: 140,
    fontFamily: "inherit",
  },
  card: {
    background: "#fff",
    border: "1px solid #e5e7eb",
    borderRadius: 12,
    overflow: "hidden",
    boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
  },
  cardHead: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    padding: "14px 16px",
  },
  cardBody: {
    padding: "12px 16px 16px",
    background: "#f8fafc",
    borderTop: "1px solid #e5e7eb",
  },
  statusPill: {
    color: "#fff",
    padding: "4px 12px",
    borderRadius: 999,
    fontWeight: 900,
    fontSize: "0.78rem",
    letterSpacing: 0.5,
    minWidth: 70,
    textAlign: "center",
    whiteSpace: "nowrap",
  },
  subTitle: {
    fontWeight: 800,
    color: "#0b1f4d",
    fontSize: "0.92rem",
    marginBottom: 6,
  },
  microTitle: {
    fontWeight: 700,
    color: "#475569",
    fontSize: "0.82rem",
    margin: "8px 0 4px",
  },
  linkedCard: {
    background: "#eef2ff",
    border: "1px solid #c7d2fe",
    borderRadius: 10,
    padding: "10px 12px",
    marginTop: 8,
  },
  text: {
    background: "#fff",
    border: "1px solid #e5e7eb",
    borderRadius: 8,
    padding: 10,
    fontSize: "0.9rem",
    color: "#1f2937",
    whiteSpace: "pre-wrap",
    lineHeight: 1.6,
  },
  miniTable: {
    width: "100%",
    borderCollapse: "collapse",
    background: "#fff",
    fontSize: "0.85rem",
    border: "1px solid #e5e7eb",
    minWidth: 720,
  },
  miniTh: {
    padding: "6px 8px",
    background: "#f1f5f9",
    fontWeight: 800,
    color: "#0b1f4d",
    border: "1px solid #e5e7eb",
    textAlign: "start",
    whiteSpace: "nowrap",
  },
  miniTd: {
    padding: "6px 8px",
    border: "1px solid #f1f5f9",
    color: "#1f2937",
    fontWeight: 600,
  },
  barOuter: {
    flex: "1 1 160px",
    minWidth: 120,
    height: 10,
    background: "#e2e8f0",
    borderRadius: 999,
    overflow: "hidden",
  },
  barInner: {
    height: "100%",
    borderRadius: 999,
    transition: "width .4s ease",
  },
  dangerBox: {
    background: "#fee2e2",
    border: "1px solid #fca5a5",
    color: "#991b1b",
    padding: 12,
    borderRadius: 10,
    marginBottom: 14,
    fontWeight: 700,
    fontSize: "0.88rem",
    lineHeight: 1.6,
  },
  linkBtn: {
    background: "#fff",
    color: "#991b1b",
    border: "1px solid #fca5a5",
    padding: "5px 12px",
    borderRadius: 8,
    fontWeight: 800,
    fontSize: "0.82rem",
    cursor: "pointer",
    fontFamily: "inherit",
  },
  empty: {
    background: "#fff",
    padding: 40,
    textAlign: "center",
    borderRadius: 12,
    color: "#64748b",
    fontWeight: 700,
  },
  errorBox: {
    background: "#fee2e2",
    border: "1px solid #fca5a5",
    color: "#991b1b",
    padding: 12,
    borderRadius: 10,
    marginBottom: 14,
    fontWeight: 700,
  },
  btnPrimary: {
    background: "rgba(255,255,255,0.18)",
    border: "1px solid rgba(255,255,255,0.4)",
    color: "#fff",
    padding: "9px 16px",
    borderRadius: 10,
    cursor: "pointer",
    fontWeight: 800,
    fontSize: "0.9rem",
  },
  btnSecondary: {
    background: "rgba(255,255,255,0.12)",
    border: "1px solid rgba(255,255,255,0.3)",
    color: "#fff",
    padding: "9px 14px",
    borderRadius: 10,
    cursor: "pointer",
    fontWeight: 700,
    fontSize: "0.88rem",
  },
  btnEdit: {
    background: "#fff7ed",
    color: "#9a3412",
    border: "1px solid #fdba74",
    padding: "6px 12px",
    borderRadius: 8,
    cursor: "pointer",
    fontWeight: 800,
    fontSize: "0.82rem",
  },
  btnDelete: {
    background: "#fef2f2",
    color: "#991b1b",
    border: "1px solid #fca5a5",
    padding: "6px 12px",
    borderRadius: 8,
    cursor: "pointer",
    fontWeight: 800,
    fontSize: "0.82rem",
  },
};
