// src/pages/haccp and iso/CCPMonitoring/CCPView.jsx
// عرض سجلات CCP مع KPI dashboard + فلاتر

import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import API_BASE from "../../../config/api";
import {
  useLang, LangToggle,
  ccpName, ccpHazard, ccpLimitDesc,
} from "./i18n";
import { useCCPCatalog } from "./useCCPCatalog";
import AttachmentsSection from "../MockRecall/AttachmentsSection";
import { generateMonthlyCCPReport } from "./generateMonthlyPDF";
import HaccpLinkBadge from "../FSMSManual/HaccpLinkBadge";

const TYPE = "ccp_monitoring_record";

export default function CCPView() {
  const navigate = useNavigate();
  const { t, lang, toggle, dir } = useLang();
  const { ccps } = useCCPCatalog();

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [yearFilter, setYearFilter] = useState("all");
  const [ccpFilter, setCcpFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [expandedId, setExpandedId] = useState(null);

  // 🆕 popup للتقرير الشهري
  const [pdfDialog, setPdfDialog] = useState(false);
  const now = new Date();
  const [pdfMonth, setPdfMonth] = useState(now.getMonth() + 1);
  const [pdfYear, setPdfYear] = useState(now.getFullYear());

  function generatePDF() {
    try {
      const result = generateMonthlyCCPReport({
        year: pdfYear, month: pdfMonth,
        records: items, ccps, lang,
      });
      setPdfDialog(false);
      alert(`✅ ${result.filename} (${result.total} records)`);
    } catch (e) {
      alert(`❌ ${e?.message || e}`);
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
      arr.sort((a, b) => {
        const da = a?.payload?.reportDate || a?.createdAt || "";
        const db = b?.payload?.reportDate || b?.createdAt || "";
        return da < db ? 1 : -1;
      });
      setItems(arr);
    } catch (e) { setErr(e?.message || String(e)); }
    finally { setLoading(false); }
  }

  useEffect(() => { load(); }, []);

  async function handleDelete(id) {
    if (!id) return;
    if (!window.confirm(t("confirmDelete"))) return;
    try {
      const res = await fetch(`${API_BASE}/api/reports/${encodeURIComponent(id)}`, { method: "DELETE" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setItems((prev) => prev.filter((it) => (it.id || it._id) !== id));
      alert(t("deleted"));
    } catch (e) { alert(`${e?.message || e}`); }
  }

  const years = useMemo(() => {
    const set = new Set();
    items.forEach((it) => {
      const d = it?.payload?.reportDate || "";
      if (d) set.add(d.slice(0, 4));
    });
    return ["all", ...Array.from(set).sort((a, b) => (a < b ? 1 : -1))];
  }, [items]);

  const filtered = useMemo(() => {
    return items.filter((it) => {
      const p = it?.payload || {};
      if (yearFilter !== "all" && (p.reportDate || "").slice(0, 4) !== yearFilter) return false;
      if (ccpFilter !== "all" && p.ccpId !== ccpFilter) return false;
      const within = p?.autoEval?.withinLimit;
      if (statusFilter === "deviation" && within !== false) return false;
      if (statusFilter === "compliant" && within !== true) return false;
      return true;
    });
  }, [items, yearFilter, ccpFilter, statusFilter]);

  /* ===== KPI ===== */
  const kpis = useMemo(() => {
    const total = filtered.length;
    let compliant = 0, deviation = 0, pending = 0, deviationsThisMonth = 0;
    const now = new Date();
    const thisMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    for (const it of filtered) {
      const w = it?.payload?.autoEval?.withinLimit;
      if (w === true) compliant++;
      else if (w === false) {
        deviation++;
        if ((it?.payload?.reportDate || "").startsWith(thisMonth)) deviationsThisMonth++;
      } else pending++;
    }
    const rate = total ? Math.round((compliant / total) * 100) : null;
    return { total, compliant, deviation, pending, deviationsThisMonth, rate };
  }, [filtered]);

  return (
    <div style={{ ...S.shell, direction: dir }}>
      <div style={S.header}>
        <div>
          <h1 style={{ margin: 0, fontSize: "1.5rem", fontWeight: 900 }}>{t("viewTitle")}</h1>
          <div style={{ opacity: 0.85, marginTop: 4, fontSize: "0.92rem" }}>{t("viewSubtitle")}</div>
          <HaccpLinkBadge clauses={["8.5", "8.6", "haccp-plan-receiving"]} label="Hazard Control & HACCP Plan" />
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
          <LangToggle lang={lang} toggle={toggle} />
          <button style={S.btnSecondary} onClick={() => setPdfDialog(true)}>
            📄 {lang === "ar" ? "تقرير شهري PDF" : "Monthly PDF"}
          </button>
          <button style={S.btnSecondary} onClick={() => navigate("/haccp-iso/ccp-monitoring/settings")}>
            {t("settings")}
          </button>
          <button style={S.btnSecondary} onClick={load} disabled={loading}>
            {loading ? t("refreshing") : t("refresh")}
          </button>
          <button style={S.btnPrimary} onClick={() => navigate("/haccp-iso/ccp-monitoring")}>
            {t("newRecord")}
          </button>
          <button style={S.btnSecondary} onClick={() => navigate(-1)}>{t("back")}</button>
        </div>
      </div>

      {/* KPI */}
      <div style={S.kpiRow}>
        <KPICard icon="📋" label={t("totalRecords")} value={kpis.total} accent="#1e40af" />
        <KPICard
          icon={kpis.rate !== null && kpis.rate >= 95 ? "✅" : "⚠️"}
          label={t("complianceRate")}
          value={kpis.rate !== null ? `${kpis.rate}%` : "—"}
          sub={`${kpis.compliant} ✓ · ${kpis.deviation} 🔴`}
          accent={kpis.rate !== null && kpis.rate >= 95 ? "#15803d" : "#a16207"}
          bad={kpis.rate !== null && kpis.rate < 80}
        />
        <KPICard icon="🔴" label={t("deviations")} value={kpis.deviation} accent="#b91c1c" bad={kpis.deviation > 0} />
        <KPICard icon="📅" label={t("deviationsThisMonth")} value={kpis.deviationsThisMonth} accent="#9a3412" />
        <KPICard icon="⏳" label={t("pendingActions")} value={kpis.pending} accent="#7c3aed" />
      </div>

      {/* Filters */}
      <div style={S.filtersBar}>
        <select style={S.select} value={yearFilter} onChange={(e) => setYearFilter(e.target.value)}>
          {years.map((y) => <option key={y} value={y}>{y === "all" ? t("allYears") : y}</option>)}
        </select>
        <select style={S.select} value={ccpFilter} onChange={(e) => setCcpFilter(e.target.value)}>
          <option value="all">{t("allCCPs")}</option>
          {ccps.map((c) => <option key={c.id} value={c.id}>{ccpName(c, lang)}</option>)}
        </select>
        <select style={S.select} value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
          <option value="all">{t("allStatus")}</option>
          <option value="deviation">{t("onlyDeviations")}</option>
          <option value="compliant">{t("onlyCompliant")}</option>
        </select>
        <span style={{ color: "#64748b", fontSize: "0.88rem", fontWeight: 700 }}>
          {filtered.length} {t("records")}
        </span>
      </div>

      {err && <div style={S.errBox}>❌ {err}</div>}

      {/* 🆕 Monthly PDF Dialog */}
      {pdfDialog && (
        <div style={{
          position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)",
          zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center",
        }} onClick={() => setPdfDialog(false)}>
          <div style={{
            background: "#fff", borderRadius: 14, padding: 24,
            minWidth: 360, boxShadow: "0 20px 50px rgba(0,0,0,0.3)",
            direction: dir, fontFamily: "system-ui,-apple-system,'Segoe UI',sans-serif",
          }} onClick={(e) => e.stopPropagation()}>
            <h3 style={{ margin: "0 0 14px", fontWeight: 900, color: "#0b1f4d" }}>
              📄 {lang === "ar" ? "اختر الشهر للتقرير" : "Select report month"}
            </h3>
            <div style={{ display: "flex", gap: 10, marginBottom: 14 }}>
              <select value={pdfMonth} onChange={(e) => setPdfMonth(Number(e.target.value))}
                style={{ padding: "9px 12px", border: "1.5px solid #d1d5db", borderRadius: 8, fontWeight: 700, flex: 1 }}>
                {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                  <option key={m} value={m}>
                    {new Date(2026, m - 1, 1).toLocaleString(lang === "ar" ? "ar-EG" : "en-US", { month: "long" })}
                  </option>
                ))}
              </select>
              <input type="number" min="2020" max="2100" value={pdfYear}
                onChange={(e) => setPdfYear(Number(e.target.value))}
                style={{ padding: "9px 12px", border: "1.5px solid #d1d5db", borderRadius: 8, fontWeight: 700, width: 100 }} />
            </div>
            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
              <button onClick={() => setPdfDialog(false)} style={{
                background: "#f1f5f9", color: "#0b1f4d", border: "1px solid #cbd5e1",
                padding: "10px 16px", borderRadius: 10, cursor: "pointer", fontWeight: 700,
              }}>
                {t("close")}
              </button>
              <button onClick={generatePDF} style={{
                background: "linear-gradient(180deg,#10b981,#059669)",
                color: "#fff", border: "none",
                padding: "10px 18px", borderRadius: 10, cursor: "pointer", fontWeight: 800,
              }}>
                📥 {lang === "ar" ? "تنزيل PDF" : "Download PDF"}
              </button>
            </div>
          </div>
        </div>
      )}

      {loading ? (
        <div style={S.empty}>{t("refreshing")}</div>
      ) : !filtered.length ? (
        <div style={S.empty}>
          {t("noResults")} <br />
          {yearFilter === "all" && ccpFilter === "all" && statusFilter === "all" && t("noResultsHint")}
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {filtered.map((it) => {
            const p = it?.payload || {};
            const id = it?.id || it?._id;
            const isExpanded = expandedId === id;
            const within = p?.autoEval?.withinLimit;
            const ccp = ccps.find(c => c.id === p.ccpId);
            const ccpDisplay = ccp ? ccpName(ccp, lang) : (p?.ccpSnapshot?.[lang === "ar" ? "nameAr" : "nameEn"] || p.ccpId);
            const limitDesc = ccp ? ccpLimitDesc(ccp, lang) : (p?.ccpSnapshot?.criticalLimit?.descEn || "");
            const statusColor = within === true ? "#15803d" : within === false ? "#b91c1c" : "#a16207";
            const statusLabel = within === true ? t("compliant") : within === false ? t("deviation_") : t("pending");
            return (
              <div key={id} style={S.card}>
                <div style={{ ...S.cardHead, cursor: "pointer" }} onClick={() => setExpandedId(isExpanded ? null : id)}>
                  <div style={{ display: "flex", alignItems: "center", gap: 12, flex: 1, minWidth: 0 }}>
                    <span style={{ ...S.statusPill, background: statusColor }}>{statusLabel}</span>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontWeight: 800, color: "#0b1f4d", fontSize: "1rem" }}>
                        🎯 {ccpDisplay}
                      </div>
                      <div style={{ fontSize: "0.85rem", color: "#64748b", fontWeight: 600 }}>
                        📅 {p.reportDate || "—"} · ⏰ {p.timeRecorded || "—"} · 🏭 {p.product?.branch || "—"}
                      </div>
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 10, alignItems: "center", flexShrink: 0 }}>
                    <Stat label={t("readingValue").replace(" *","")}
                      value={`${p.reading?.value ?? "—"}${p.ccpSnapshot?.criticalLimit?.unit || ""}`} />
                    <Stat label={t("criticalLimit")} value={limitDesc} />
                    <button onClick={(e) => { e.stopPropagation(); navigate(`/haccp-iso/ccp-monitoring?edit=${encodeURIComponent(id)}`); }}
                      style={{ background: "#fff7ed", color: "#9a3412", border: "1px solid #fdba74",
                        padding: "6px 12px", borderRadius: 8, cursor: "pointer", fontWeight: 800, fontSize: "0.82rem" }}>
                      {t("edit")}
                    </button>
                    <button onClick={(e) => { e.stopPropagation(); handleDelete(id); }}
                      style={{ background: "#fef2f2", color: "#991b1b", border: "1px solid #fca5a5",
                        padding: "6px 12px", borderRadius: 8, cursor: "pointer", fontWeight: 800, fontSize: "0.82rem" }}>
                      {t("deleteAction")}
                    </button>
                    <span style={{ color: "#64748b", fontSize: "1.2rem" }}>{isExpanded ? "▲" : "▼"}</span>
                  </div>
                </div>

                {isExpanded && (
                  <div style={S.cardBody}>
                    <DetailRow label={t("productName")} value={p.product?.name} />
                    <DetailRow label={t("batchNo")} value={p.product?.batch} />
                    <DetailRow label={t("ccpHazard")} value={ccp ? ccpHazard(ccp, lang) : (p?.ccpSnapshot?.[lang === "ar" ? "hazardAr" : "hazardEn"])} />
                    <DetailRow label={t("readingValue").replace(" *","")}
                      value={`${p.reading?.value ?? "—"}${p.ccpSnapshot?.criticalLimit?.unit || ""}`} />
                    <DetailRow label={t("criticalLimit")} value={limitDesc} />

                    {/* Deviation block */}
                    {within === false && (
                      <div style={S.deviationBox}>
                        <div style={S.subTitle}>⚠️ {t("deviation")}</div>
                        {p.deviation?.correctiveAction && (
                          <DetailRow label={t("correctiveAction").replace(" *","")} value={p.deviation.correctiveAction} />
                        )}
                        {p.deviation?.productStatus && (
                          <DetailRow label={t("productStatus")} value={t(`status${capitalize(p.deviation.productStatus)}`)} />
                        )}
                        {p.deviation?.finalReading && (
                          <DetailRow label={t("finalReading")}
                            value={`${p.deviation.finalReading}${p.ccpSnapshot?.criticalLimit?.unit || ""}`} />
                        )}
                      </div>
                    )}

                    {/* Attachments */}
                    {Array.isArray(p.attachments) && p.attachments.length > 0 && (
                      <div style={{ marginTop: 14 }}>
                        <div style={S.subTitle}>{t("attachments")} ({p.attachments.length})</div>
                        <AttachmentsSection
                          value={p.attachments}
                          onChange={() => {}}
                          t={t}
                          lang={lang}
                          dir={dir}
                        />
                      </div>
                    )}

                    {/* Sign-off */}
                    <div style={{ marginTop: 14, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                      <div>
                        <div style={S.subTitle}>✍️ {t("monitoredBy").replace(" *","")}</div>
                        <div style={S.text}>{p.signoff?.monitoredBy || "—"}</div>
                        {p.signoff?.monitoredBySignature && (
                          <img src={p.signoff.monitoredBySignature} alt="monitor signature" style={S.sigImg} />
                        )}
                      </div>
                      <div>
                        <div style={S.subTitle}>✍️ {t("verifiedBy")}</div>
                        <div style={S.text}>{p.signoff?.verifiedBy || "—"}</div>
                        {p.signoff?.verifiedBySignature && (
                          <img src={p.signoff.verifiedBySignature} alt="verifier signature" style={S.sigImg} />
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
    </div>
  );
}

function capitalize(s) { return String(s || "").charAt(0).toUpperCase() + String(s || "").slice(1); }

/* ===== Atoms ===== */
function KPICard({ icon, label, value, sub, accent = "#1e40af", bad }) {
  return (
    <div style={{
      flex: "1 1 180px", minWidth: 180,
      background: "#fff", border: "1px solid #e5e7eb",
      borderInlineStart: `4px solid ${bad ? "#ef4444" : accent}`,
      borderRadius: 12, padding: "12px 14px",
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

const S = {
  shell: {
    minHeight: "100vh", padding: "20px 18px",
    background: "linear-gradient(150deg,#eef2ff,#f8fafc 55%,#fef2f2)",
    fontFamily: "system-ui,-apple-system,'Segoe UI',sans-serif",
  },
  header: {
    background: "linear-gradient(135deg,#1e3a5f,#2d5a8e)",
    color: "#fff", padding: "18px 22px", borderRadius: 14,
    boxShadow: "0 6px 18px rgba(30,58,95,0.20)", marginBottom: 14,
    display: "flex", justifyContent: "space-between", alignItems: "center",
    gap: 12, flexWrap: "wrap",
  },
  kpiRow: { display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 14 },
  filtersBar: {
    background: "#fff", border: "1px solid #e5e7eb", borderRadius: 12,
    padding: 12, marginBottom: 14, display: "flex", gap: 10,
    flexWrap: "wrap", alignItems: "center",
  },
  select: {
    padding: "9px 12px", borderRadius: 8, border: "1.5px solid #e2e8f0",
    background: "#f8fafc", fontWeight: 700, fontSize: "0.92rem", minWidth: 140,
  },
  card: {
    background: "#fff", border: "1px solid #e5e7eb", borderRadius: 12,
    overflow: "hidden", boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
  },
  cardHead: { display: "flex", alignItems: "center", gap: 10, padding: "14px 16px" },
  cardBody: { padding: "12px 16px 16px", background: "#f8fafc", borderTop: "1px solid #e5e7eb" },
  statusPill: {
    color: "#fff", padding: "4px 12px", borderRadius: 999,
    fontWeight: 900, fontSize: "0.78rem", letterSpacing: 0.5,
    minWidth: 80, textAlign: "center",
  },
  subTitle: { fontWeight: 800, color: "#0b1f4d", fontSize: "0.92rem", marginBottom: 6 },
  text: {
    background: "#fff", border: "1px solid #e5e7eb", borderRadius: 8,
    padding: 10, fontSize: "0.9rem", color: "#1f2937",
  },
  sigImg: {
    maxWidth: 240, maxHeight: 80, objectFit: "contain",
    border: "1px solid #e5e7eb", borderRadius: 6,
    background: "#fff", padding: 4, marginTop: 6,
  },
  deviationBox: {
    marginTop: 12, padding: 12, borderRadius: 10,
    background: "linear-gradient(135deg,#fef2f2,#fee2e2)",
    border: "1.5px solid #fca5a5",
  },
  empty: {
    background: "#fff", padding: 40, textAlign: "center",
    borderRadius: 12, color: "#64748b", fontWeight: 700,
  },
  errBox: {
    background: "#fee2e2", border: "1px solid #fca5a5", color: "#991b1b",
    padding: 12, borderRadius: 10, marginBottom: 14, fontWeight: 700,
  },
  btnPrimary: {
    background: "rgba(255,255,255,0.18)", border: "1px solid rgba(255,255,255,0.4)",
    color: "#fff", padding: "9px 16px", borderRadius: 10,
    cursor: "pointer", fontWeight: 800, fontSize: "0.9rem",
  },
  btnSecondary: {
    background: "rgba(255,255,255,0.12)", border: "1px solid rgba(255,255,255,0.3)",
    color: "#fff", padding: "9px 14px", borderRadius: 10,
    cursor: "pointer", fontWeight: 700, fontSize: "0.88rem",
  },
};
