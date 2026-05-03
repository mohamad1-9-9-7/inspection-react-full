// src/pages/haccp and iso/MockRecall/MockRecallView.jsx
// عرض سجلات تمارين السحب الوهمي + KPI dashboard

import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import API_BASE from "../../../config/api";
import LinkedReportPopup from "./LinkedReportPopup";
import { useLang, LangToggle, getDrillShortLabel } from "./i18n";
import AttachmentsSection from "./AttachmentsSection";
import HaccpLinkBadge from "../FSMSManual/HaccpLinkBadge";

const TYPE = "mock_recall_drill";

function fmtDuration(mins) {
  if (mins === null || mins === undefined) return "—";
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return `${h}h ${m}m`;
}

function quarterOf(dateStr) {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return "";
  const q = Math.floor(d.getMonth() / 3) + 1;
  return `Q${q} ${d.getFullYear()}`;
}


function daysBetween(dateStr) {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return null;
  const now = new Date();
  return Math.floor((now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24));
}

export default function MockRecallView() {
  const navigate = useNavigate();
  const { t, lang, toggle, dir } = useLang();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  const [yearFilter, setYearFilter] = useState("all");
  const [resultFilter, setResultFilter] = useState("all"); // all | pass | fail | pending
  const [expandedId, setExpandedId] = useState(null);

  // 🆕 popup للتقرير المصدر
  const [popup, setPopup] = useState({ open: false, kind: null, summary: null });
  const openSource = (kind, summary) => setPopup({ open: true, kind, summary });
  const closeSource = () => setPopup({ open: false, kind: null, summary: null });

  // 🆕 حذف تمرين
  async function handleDelete(id) {
    if (!id) return;
    if (!window.confirm(t("confirmDelete"))) return;
    try {
      const res = await fetch(
        `${API_BASE}/api/reports/${encodeURIComponent(id)}`,
        { method: "DELETE" }
      );
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      // إزالة محلية من القائمة
      setItems((prev) => prev.filter((it) => (it.id || it._id) !== id));
      alert(t("deleted"));
    } catch (e) {
      alert(`${t("deleteFailed")}: ${e?.message || e}`);
    }
  }

  async function load() {
    setLoading(true);
    setErr("");
    try {
      const res = await fetch(
        `${API_BASE}/api/reports?type=${encodeURIComponent(TYPE)}`,
        { cache: "no-store" }
      );
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json().catch(() => null);
      const arr = Array.isArray(json) ? json : json?.data || [];
      // ترتيب من الأحدث للأقدم
      arr.sort((a, b) => {
        const da = a?.payload?.drillDate || a?.createdAt || "";
        const db = b?.payload?.drillDate || b?.createdAt || "";
        return da < db ? 1 : -1;
      });
      setItems(arr);
    } catch (e) {
      setErr(e?.message || String(e));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  const years = useMemo(() => {
    const set = new Set();
    items.forEach((it) => {
      const d = it?.payload?.drillDate || "";
      if (d) set.add(d.slice(0, 4));
    });
    return ["all", ...Array.from(set).sort((a, b) => (a < b ? 1 : -1))];
  }, [items]);

  const filtered = useMemo(() => {
    return items.filter((it) => {
      const p = it?.payload || {};
      if (yearFilter !== "all") {
        const y = (p.drillDate || "").slice(0, 4);
        if (y !== yearFilter) return false;
      }
      if (resultFilter !== "all") {
        const ov = p?.autoKpi?.overallPass;
        if (resultFilter === "pass" && ov !== true) return false;
        if (resultFilter === "fail" && ov !== false) return false;
        if (resultFilter === "pending" && (ov === true || ov === false)) return false;
      }
      return true;
    });
  }, [items, yearFilter, resultFilter]);

  /* ====== KPI Dashboard ====== */
  const kpis = useMemo(() => {
    const total = filtered.length;
    let passCount = 0, failCount = 0, pendingCount = 0;
    let totalDur = 0, durSamples = 0;
    let totalPct = 0, pctSamples = 0;
    let lastDate = null;

    for (const it of filtered) {
      const p = it?.payload || {};
      const k = p?.autoKpi || {};
      if (k.overallPass === true) passCount++;
      else if (k.overallPass === false) failCount++;
      else pendingCount++;

      if (typeof k.durationMinutes === "number") {
        totalDur += k.durationMinutes;
        durSamples++;
      }
      if (typeof k.tracedPct === "number") {
        totalPct += k.tracedPct;
        pctSamples++;
      }
      const d = p.drillDate || (it.createdAt || "").slice(0, 10);
      if (d && (!lastDate || d > lastDate)) lastDate = d;
    }

    return {
      total,
      passCount,
      failCount,
      pendingCount,
      passRate: total ? Math.round((passCount / total) * 100) : null,
      avgDuration: durSamples ? Math.round(totalDur / durSamples) : null,
      avgTracedPct: pctSamples ? totalPct / pctSamples : null,
      lastDate,
      daysSinceLast: daysBetween(lastDate),
    };
  }, [filtered]);

  /* ====== Render ====== */
  return (
    <div style={{ ...S.shell, direction: dir }}>
      <div style={S.header}>
        <div>
          <h1 style={{ margin: 0, fontSize: "1.5rem", fontWeight: 900 }}>
            {t("viewTitle")}
          </h1>
          <div style={{ opacity: 0.85, marginTop: 4, fontSize: "0.92rem" }}>
            {t("viewSubtitle")}
          </div>
          <HaccpLinkBadge clauses={["8.3", "8.9"]} label="Traceability + Withdrawal/Recall" />
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
          <LangToggle lang={lang} toggle={toggle} />
          <button style={S.btnSecondary} onClick={() => navigate("/haccp-iso/mock-recall/settings")}>
            {t("settings")}
          </button>
          <button style={S.btnSecondary} onClick={load} disabled={loading}>
            {loading ? t("refreshing") : t("refresh")}
          </button>
          <button style={S.btnPrimary} onClick={() => navigate("/haccp-iso/mock-recall")}>
            {t("newDrill")}
          </button>
          <button style={S.btnSecondary} onClick={() => navigate(-1)}>{t("back")}</button>
        </div>
      </div>

      {/* ===== KPI Dashboard ===== */}
      <div style={S.kpiRow}>
        <KPICard
          icon="📋"
          label={t("totalDrills")}
          value={kpis.total}
          sub={yearFilter === "all" ? t("allYears") : yearFilter}
          accent="#1e40af"
        />
        <KPICard
          icon={kpis.passRate !== null && kpis.passRate >= 80 ? "✅" : "⚠️"}
          label={t("successRate")}
          value={kpis.passRate !== null ? `${kpis.passRate}%` : "—"}
          sub={`${kpis.passCount} ${t("pass")} · ${kpis.failCount} ${t("fail")}`}
          accent={kpis.passRate !== null && kpis.passRate >= 80 ? "#15803d" : "#a16207"}
          bad={kpis.passRate !== null && kpis.passRate < 50}
        />
        <KPICard
          icon="⏱️"
          label={t("avgDuration")}
          value={fmtDuration(kpis.avgDuration)}
          sub={t("durLimit")}
          accent="#0891b2"
          bad={kpis.avgDuration !== null && kpis.avgDuration > 240}
        />
        <KPICard
          icon="📊"
          label={t("avgTrace")}
          value={kpis.avgTracedPct !== null ? `${kpis.avgTracedPct.toFixed(1)}%` : "—"}
          sub={t("pctLimit")}
          accent="#0f766e"
        />
        <KPICard
          icon={
            kpis.daysSinceLast !== null && kpis.daysSinceLast > 90 ? "🚨" :
            kpis.daysSinceLast !== null && kpis.daysSinceLast > 60 ? "⏳" : "📅"
          }
          label={t("sinceLastDrill")}
          value={kpis.daysSinceLast !== null ? `${kpis.daysSinceLast} ${t("days")}` : "—"}
          sub={kpis.lastDate || "—"}
          accent="#7c3aed"
          bad={kpis.daysSinceLast !== null && kpis.daysSinceLast > 90}
        />
      </div>

      {/* ===== Filters ===== */}
      <div style={S.filtersBar}>
        <select style={S.select}
          value={yearFilter}
          onChange={(e) => setYearFilter(e.target.value)}>
          {years.map((y) => (
            <option key={y} value={y}>{y === "all" ? t("allYears") : y}</option>
          ))}
        </select>
        <select style={S.select}
          value={resultFilter}
          onChange={(e) => setResultFilter(e.target.value)}>
          <option value="all">{t("allResults")}</option>
          <option value="pass">{t("onlyPass")}</option>
          <option value="fail">{t("onlyFail")}</option>
          <option value="pending">{t("onlyPending")}</option>
        </select>
        <span style={{ color: "#64748b", fontSize: "0.88rem", fontWeight: 700 }}>
          {filtered.length} {t("drills")}
        </span>
      </div>

      {/* ===== List ===== */}
      {err && <div style={S.errorBox}>❌ {err}</div>}

      {loading ? (
        <div style={S.empty}>{t("loading")}</div>
      ) : !filtered.length ? (
        <div style={S.empty}>
          {t("noResults")} <br />
          {yearFilter === "all" && resultFilter === "all" && t("noResultsHint")}
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {filtered.map((it) => {
            const p = it?.payload || {};
            const id = it?.id || it?._id;
            const overall = p?.autoKpi?.overallPass;
            const isExpanded = expandedId === id;
            const statusColor =
              overall === true ? "#15803d" :
              overall === false ? "#b91c1c" : "#a16207";
            const statusLabel =
              overall === true ? t("pass") :
              overall === false ? t("fail") : t("pending");
            return (
              <div key={id} style={S.card}>
                <div
                  style={{ ...S.cardHead, cursor: "pointer" }}
                  onClick={() => setExpandedId(isExpanded ? null : id)}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 12, flex: 1, minWidth: 0 }}>
                    <span style={{
                      ...S.statusPill,
                      background: statusColor,
                    }}>{statusLabel}</span>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontWeight: 800, color: "#0b1f4d", fontSize: "1rem" }}>
                        {p.linked?.finishedProduct ? (
                          <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); openSource("finished", p.linked.finishedProduct); }}
                            style={{
                              background: "none",
                              border: "none",
                              color: "#1e40af",
                              textDecoration: "underline",
                              fontWeight: 800,
                              fontSize: "1rem",
                              cursor: "pointer",
                              padding: 0,
                              fontFamily: "inherit",
                            }}
                            title="افتح تقرير المنتج النهائي"
                          >
                            🔗 {p.product?.name || "—"}
                          </button>
                        ) : (
                          p.product?.name || "—"
                        )}
                        {p.product?.batch ? ` · Lot ${p.product.batch}` : ""}
                      </div>
                      <div style={{ fontSize: "0.85rem", color: "#64748b", fontWeight: 600 }}>
                        📅 {p.drillDate || "—"} · {quarterOf(p.drillDate)} · 🏭 {p.product?.branch || "—"}
                        <span style={{
                          marginInlineStart: 8,
                          background: p.drillName === "traceability" ? "#ede9fe" : "#dbeafe",
                          color: p.drillName === "traceability" ? "#5b21b6" : "#1e40af",
                          padding: "2px 8px",
                          borderRadius: 999,
                          fontSize: "0.75rem",
                          fontWeight: 800,
                        }}>
                          {p.drillName === "traceability" ? "🧬" : "🔄"} {getDrillShortLabel(p.drillName, lang)}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 10, alignItems: "center", flexShrink: 0 }}>
                    <Stat label={t("qtyLabel")} value={fmtDuration(p.autoKpi?.durationMinutes)} />
                    <Stat label={t("traceLabel")} value={typeof p.autoKpi?.tracedPct === "number" ? `${p.autoKpi.tracedPct.toFixed(1)}%` : "—"} />
                    {/* 🆕 أزرار تعديل/حذف */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/haccp-iso/mock-recall?edit=${encodeURIComponent(id)}`);
                      }}
                      style={{
                        background: "#fff7ed",
                        color: "#9a3412",
                        border: "1px solid #fdba74",
                        padding: "6px 12px",
                        borderRadius: 8,
                        cursor: "pointer",
                        fontWeight: 800,
                        fontSize: "0.82rem",
                      }}
                      title={t("edit")}
                    >
                      {t("edit")}
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(id);
                      }}
                      style={{
                        background: "#fef2f2",
                        color: "#991b1b",
                        border: "1px solid #fca5a5",
                        padding: "6px 12px",
                        borderRadius: 8,
                        cursor: "pointer",
                        fontWeight: 800,
                        fontSize: "0.82rem",
                      }}
                      title={t("deleteAction")}
                    >
                      {t("deleteAction")}
                    </button>
                    <span style={{ color: "#64748b", fontSize: "1.2rem" }}>
                      {isExpanded ? "▲" : "▼"}
                    </span>
                  </div>
                </div>

                {isExpanded && (
                  <div style={S.cardBody}>
                    {/* 🔗 التقارير المرتبطة */}
                    {p.linked && (p.linked.shipment || p.linked.loadingLog || p.linked.finishedProduct) && (
                      <div style={{ marginBottom: 14 }}>
                        <div style={S.subTitle}>{t("linkedSourceTitle")}</div>
                        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 10 }}>
                          {/* Shipment */}
                          {p.linked.shipment && (
                            <LinkedSourceCard
                              icon="📦"
                              title={t("shipmentTitle")}
                              accent="#1d4ed8"
                              openLabel={t("openSource")}
                              onOpen={() => openSource("shipment", p.linked.shipment)}
                              fields={[
                                { label: t("grnRef"), value: p.linked.shipment.invoiceNo, highlight: true },
                                { label: t("supplier"), value: p.linked.shipment.supplier },
                                { label: t("drillType"), value: p.linked.shipment.shipmentType },
                                { label: t("dateReceived"), value: String(p.linked.shipment.receivedOn || "").slice(0, 10) },
                                { label: lang === "ar" ? "المنشأ" : "Origin", value: p.linked.shipment.origin },
                                { label: lang === "ar" ? "بوليصة الشحن" : "Airway Bill", value: p.linked.shipment.airwayBill },
                                { label: lang === "ar" ? "حرارة الشحنة" : "Shipment Temp", value: p.linked.shipment.temp !== "" && p.linked.shipment.temp !== undefined ? `${p.linked.shipment.temp}°C` : null },
                              ]}
                            />
                          )}

                          {/* Loading */}
                          {p.linked.loadingLog && (
                            <LinkedSourceCard
                              icon="🚚"
                              title={t("loadingTitle")}
                              accent="#0891b2"
                              openLabel={t("openSource")}
                              onOpen={() => openSource("loading", p.linked.loadingLog)}
                              fields={[
                                { label: t("vehicle"), value: p.linked.loadingLog.vehicleNo, highlight: true },
                                { label: t("driver"), value: p.linked.loadingLog.driver },
                                { label: t("drillDate"), value: String(p.linked.loadingLog.reportDate || "").slice(0, 10) },
                                { label: t("startTime"), value: p.linked.loadingLog.timeStart },
                                { label: t("endTime"), value: p.linked.loadingLog.timeEnd },
                                { label: lang === "ar" ? "حرارة الشاحنة" : "Truck Temp", value: p.linked.loadingLog.tempCheck !== "" && p.linked.loadingLog.tempCheck !== undefined ? `${p.linked.loadingLog.tempCheck}°C` : null, highlight: true },
                              ]}
                            />
                          )}

                          {/* 🆕 Coolers */}
                          {p.linked.coolers && (
                            <LinkedSourceCard
                              icon="🧊"
                              title={t("coolersTitle")}
                              accent="#06b6d4"
                              openLabel={t("openSource")}
                              onOpen={() => openSource("coolers", p.linked.coolers)}
                              fields={[
                                { label: t("drillDate"), value: String(p.linked.coolers.date || "").slice(0, 10), highlight: true },
                                { label: lang === "ar" ? "عدد البرّادات" : "Coolers Count", value: p.linked.coolers.rowsCount },
                                { label: lang === "ar" ? "دقّقه" : "Checked By", value: p.linked.coolers.checkedBy },
                                { label: lang === "ar" ? "اعتمده" : "Verified By", value: p.linked.coolers.verifiedBy },
                              ]}
                            />
                          )}

                          {/* 🆕 Branch Temperature */}
                          {p.linked.branchTemp && (
                            <LinkedSourceCard
                              icon="🌡️"
                              title={t("branchTempTitle")}
                              accent="#3b82f6"
                              openLabel={t("openSource")}
                              onOpen={() => openSource("branchTemp", p.linked.branchTemp)}
                              fields={[
                                { label: t("branch"), value: p.linked.branchTemp.branch, highlight: true },
                                { label: t("drillDate"), value: String(p.linked.branchTemp.date || "").slice(0, 10) },
                                { label: lang === "ar" ? "عدد القراءات" : "Records", value: p.linked.branchTemp.rowsCount },
                              ]}
                            />
                          )}

                          {/* 🆕 Truck Cleaning */}
                          {p.linked.truckCleaning && (
                            <LinkedSourceCard
                              icon="🧼"
                              title={t("truckCleaningTitle")}
                              accent="#9333ea"
                              openLabel={t("openSource")}
                              onOpen={() => openSource("truckCleaning", p.linked.truckCleaning)}
                              fields={[
                                { label: t("truckNo"), value: p.linked.truckCleaning.truckNo, highlight: true },
                                { label: t("drillDate"), value: String(p.linked.truckCleaning.date || "").slice(0, 10) },
                                { label: t("cleaningStatus"), value: p.linked.truckCleaning.cleaningRow?.cleaning },
                              ]}
                            />
                          )}

                          {/* Finished Product */}
                          {p.linked.finishedProduct && (
                            <LinkedSourceCard
                              icon="🏷️"
                              title={t("finishedTitle")}
                              accent="#15803d"
                              openLabel={t("openSource")}
                              onOpen={() => openSource("finished", p.linked.finishedProduct)}
                              fields={[
                                { label: t("productName").replace(" *",""), value: p.linked.finishedProduct.productRow?.product, highlight: true },
                                { label: t("customer"), value: p.linked.finishedProduct.productRow?.customer },
                                { label: lang === "ar" ? "رقم الطلب" : "Order No", value: p.linked.finishedProduct.productRow?.orderNo },
                                { label: t("drillDate"), value: String(p.linked.finishedProduct.reportDate || "").slice(0, 10) },
                                { label: lang === "ar" ? "تاريخ الذبح" : "Slaughter Date", value: p.linked.finishedProduct.productRow?.slaughterDate },
                                { label: lang === "ar" ? "الكمية" : "Quantity", value: p.linked.finishedProduct.productRow?.quantity ? `${p.linked.finishedProduct.productRow.quantity} ${p.linked.finishedProduct.productRow.unitOfMeasure || ""}` : null },
                                { label: lang === "ar" ? "درجة الحرارة" : "Temp", value: p.linked.finishedProduct.productRow?.temp ? `${p.linked.finishedProduct.productRow.temp}°C` : null },
                              ]}
                            />
                          )}
                        </div>
                      </div>
                    )}

                    <DetailRow label={t("drillType")} value={p.drillType} />
                    <DetailRow label={t("triggeredBy").replace(/\(.*\)/, "").trim()} value={p.triggeredBy} />
                    <DetailRow label={t("productionDate")} value={p.product?.productionDate} />
                    <DetailRow label={t("expiryDate")} value={p.product?.expiryDate} />
                    <DetailRow label={t("qtyProduced")} value={`${p.product?.qtyProduced || 0} ${p.product?.qtyUnit || ""}`} />
                    {p.product?.temp !== undefined && p.product?.temp !== "" && (
                      <DetailRow label={t("productTemp")} value={`${p.product.temp}°C`} />
                    )}
                    <DetailRow label={t("qtyTraced")} value={`${p.results?.qtyTraced || 0} ${p.product?.qtyUnit || ""}`} />
                    <DetailRow label={`${t("startTime")} → ${t("endTime")}`} value={`${p.timing?.startTime || "—"} → ${p.timing?.endTime || "—"}`} />

                    {/* Backward */}
                    {Array.isArray(p.backwardTrace) && p.backwardTrace.length > 0 && (
                      <div style={{ marginTop: 10 }}>
                        <div style={S.subTitle}>⬅️ Backward Trace</div>
                        <table style={S.miniTable}>
                          <thead>
                            <tr>
                              <th style={S.miniTh}>Material</th>
                              <th style={S.miniTh}>Supplier</th>
                              <th style={S.miniTh}>Lot</th>
                              <th style={S.miniTh}>Date</th>
                              <th style={S.miniTh}>Qty</th>
                              <th style={S.miniTh}>GRN / Invoice</th>
                            </tr>
                          </thead>
                          <tbody>
                            {p.backwardTrace.map((r, i) => {
                              // إذا الـ GRN يطابق الفاتورة المرتبطة، اعرضه كرابط
                              const linkedShip = p.linked?.shipment;
                              const isLinkedRow =
                                linkedShip &&
                                (r.grnRef === linkedShip.invoiceNo ||
                                  r.supplierLot === linkedShip.invoiceNo ||
                                  r.supplierLot === linkedShip.airwayBill);
                              return (
                                <tr key={i}>
                                  <td style={S.miniTd}>{r.material}</td>
                                  <td style={S.miniTd}>{r.supplier}</td>
                                  <td style={S.miniTd}>{r.supplierLot}</td>
                                  <td style={S.miniTd}>{r.dateReceived}</td>
                                  <td style={S.miniTd}>{r.qtyUsed} {r.qtyUnit}</td>
                                  <td style={S.miniTd}>
                                    {isLinkedRow ? (
                                      <button
                                        type="button"
                                        onClick={(e) => { e.stopPropagation(); openSource("shipment", linkedShip); }}
                                        style={S.linkBtn}
                                        title="افتح تقرير استلام الشحنة"
                                      >
                                        🔗 {r.grnRef}
                                      </button>
                                    ) : (
                                      r.grnRef
                                    )}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}

                    {/* Forward */}
                    {Array.isArray(p.forwardTrace) && p.forwardTrace.length > 0 && (
                      <div style={{ marginTop: 10 }}>
                        <div style={S.subTitle}>➡️ Forward Trace</div>
                        <table style={S.miniTable}>
                          <thead>
                            <tr>
                              <th style={S.miniTh}>Customer</th>
                              <th style={S.miniTh}>Date</th>
                              <th style={S.miniTh}>Qty</th>
                              <th style={S.miniTh}>Vehicle</th>
                              <th style={S.miniTh}>Driver</th>
                              <th style={S.miniTh}>POD</th>
                            </tr>
                          </thead>
                          <tbody>
                            {p.forwardTrace.map((r, i) => {
                              const linkedLoad = p.linked?.loadingLog;
                              const isLinkedRow =
                                linkedLoad &&
                                r.vehicle &&
                                String(r.vehicle).trim() === String(linkedLoad.vehicleNo || "").trim();
                              return (
                                <tr key={i}>
                                  <td style={S.miniTd}>{r.customer}</td>
                                  <td style={S.miniTd}>{r.dateDispatched}</td>
                                  <td style={S.miniTd}>{r.qtyShipped} {r.qtyUnit}</td>
                                  <td style={S.miniTd}>
                                    {isLinkedRow ? (
                                      <button
                                        type="button"
                                        onClick={(e) => { e.stopPropagation(); openSource("loading", linkedLoad); }}
                                        style={S.linkBtn}
                                        title="افتح تقرير تحميل السيارة"
                                      >
                                        🔗 {r.vehicle}
                                      </button>
                                    ) : (
                                      r.vehicle
                                    )}
                                  </td>
                                  <td style={S.miniTd}>{r.driver}</td>
                                  <td style={S.miniTd}>{r.podConfirmed ? "✅" : "—"}</td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}

                    {p.results?.gaps && (
                      <div style={{ marginTop: 10 }}>
                        <div style={S.subTitle}>🔍 Gaps / Findings</div>
                        <div style={S.text}>{p.results.gaps}</div>
                      </div>
                    )}
                    {p.results?.correctiveActions && (
                      <div style={{ marginTop: 10 }}>
                        <div style={S.subTitle}>🛠️ Corrective Actions</div>
                        <div style={S.text}>{p.results.correctiveActions}</div>
                      </div>
                    )}

                    {/* 📎 Attachments (read-only display) */}
                    {Array.isArray(p.attachments) && p.attachments.length > 0 && (
                      <div style={{ marginTop: 14 }}>
                        <div style={S.subTitle}>{t("attachments")} ({p.attachments.length})</div>
                        <AttachmentsSection
                          value={p.attachments}
                          onChange={() => {}}
                          t={t}
                          lang={lang}
                          dir={lang === "ar" ? "rtl" : "ltr"}
                        />
                      </div>
                    )}

                    {/* Signatures */}
                    <div style={{ marginTop: 14, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                      <div>
                        <div style={S.subTitle}>✍️ {t("conductedBy").replace(" *","")}</div>
                        <div style={S.text}>{p.signoff?.conductedBy || "—"}</div>
                        {p.signoff?.conductedBySignature && (
                          <img src={p.signoff.conductedBySignature}
                            alt="conducted by signature"
                            style={S.sigImg} />
                        )}
                      </div>
                      <div>
                        <div style={S.subTitle}>✍️ {t("verifiedBy")}</div>
                        <div style={S.text}>{p.signoff?.verifiedBy || "—"}</div>
                        {p.signoff?.verifiedBySignature && (
                          <img src={p.signoff.verifiedBySignature}
                            alt="verified by signature"
                            style={S.sigImg} />
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* 🆕 مودال التقرير المصدر */}
      <LinkedReportPopup
        open={popup.open}
        onClose={closeSource}
        kind={popup.kind}
        summary={popup.summary}
      />
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

function Stat({ label, value }) {
  return (
    <div style={{ textAlign: "center" }}>
      <div style={{ fontSize: "0.7rem", color: "#64748b", fontWeight: 700, textTransform: "uppercase" }}>{label}</div>
      <div style={{ fontWeight: 900, color: "#0b1f4d", fontSize: "0.92rem" }}>{value}</div>
    </div>
  );
}

function DetailRow({ label, value }) {
  if (!value) return null;
  return (
    <div style={{ display: "flex", gap: 10, padding: "4px 0", borderBottom: "1px dashed #e5e7eb", fontSize: "0.9rem" }}>
      <span style={{ fontWeight: 700, color: "#475569", minWidth: 130 }}>{label}:</span>
      <span style={{ color: "#0f172a" }}>{value}</span>
    </div>
  );
}

function LinkedSourceCard({ icon, title, accent, onOpen, fields, openLabel }) {
  return (
    <div style={{
      background: "#fff",
      border: "1px solid #e5e7eb",
      borderInlineStart: `4px solid ${accent}`,
      borderRadius: 10,
      padding: 12,
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
        <div style={{ fontWeight: 800, color: "#0b1f4d", fontSize: "0.95rem" }}>
          {icon} {title}
        </div>
        {onOpen && (
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onOpen(); }}
            style={{
              background: "#eef2ff",
              color: "#1e40af",
              border: "1px solid #c7d2fe",
              padding: "4px 10px",
              borderRadius: 8,
              fontWeight: 800,
              fontSize: "0.78rem",
              cursor: "pointer",
            }}
            title={openLabel || "🔗 Open Source"}
          >
            {openLabel || "🔗 Open Source"}
          </button>
        )}
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        {fields.filter((f) => f.value !== undefined && f.value !== null && f.value !== "").map((f, i) => (
          <div key={i} style={{ display: "flex", gap: 8, fontSize: "0.85rem", padding: "2px 0" }}>
            <span style={{ fontWeight: 700, color: "#64748b", minWidth: 110 }}>{f.label}:</span>
            <span style={{
              color: f.highlight ? accent : "#0f172a",
              fontWeight: f.highlight ? 800 : 600,
              fontFamily: f.highlight ? "monospace" : "inherit",
            }}>{f.value}</span>
          </div>
        ))}
      </div>
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
    direction: "rtl",
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
  },
  subTitle: {
    fontWeight: 800,
    color: "#0b1f4d",
    fontSize: "0.92rem",
    marginBottom: 6,
  },
  text: {
    background: "#fff",
    border: "1px solid #e5e7eb",
    borderRadius: 8,
    padding: 10,
    fontSize: "0.9rem",
    color: "#1f2937",
    whiteSpace: "pre-wrap",
  },
  miniTable: {
    width: "100%",
    borderCollapse: "collapse",
    background: "#fff",
    fontSize: "0.85rem",
    border: "1px solid #e5e7eb",
    borderRadius: 6,
    overflow: "hidden",
  },
  miniTh: {
    padding: "6px 8px",
    background: "#f1f5f9",
    fontWeight: 800,
    color: "#0b1f4d",
    border: "1px solid #e5e7eb",
    textAlign: "right",
  },
  miniTd: {
    padding: "6px 8px",
    border: "1px solid #f1f5f9",
    color: "#1f2937",
  },
  sigImg: {
    maxWidth: 240,
    maxHeight: 80,
    objectFit: "contain",
    border: "1px solid #e5e7eb",
    borderRadius: 6,
    background: "#fff",
    padding: 4,
    marginTop: 6,
  },
  linkBtn: {
    background: "#eef2ff",
    color: "#1e40af",
    border: "1px solid #c7d2fe",
    padding: "3px 8px",
    borderRadius: 6,
    fontWeight: 800,
    fontSize: "0.82rem",
    cursor: "pointer",
    fontFamily: "monospace",
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
};
