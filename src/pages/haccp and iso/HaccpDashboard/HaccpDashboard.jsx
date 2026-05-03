// src/pages/haccp and iso/HaccpDashboard/HaccpDashboard.jsx
// HACCP Linkage Dashboard — live KPIs from all related modules

import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import API_BASE from "../../../config/api";
import mawashiLogo from "../../../assets/almawashi-logo.jpg";
import { useHaccpLang, HaccpLangToggle } from "../_shared/haccpI18n";

/* Report types from existing modules */
const TYPES = {
  ccp:        "ccp_monitoring_record",
  mockRecall: "mock_recall_drill",
  supplier:   "supplier_self_assessment_form",
  product:    "product_details",
  dm:         "municipality_inspection",
  mrm:        "mrm_record",
  audit:      "internal_audit_record",
  calib:      "calibration_record",
  licenses:   "licenses_contracts",
};

async function fetchType(type) {
  try {
    const res = await fetch(
      `${API_BASE}/api/reports?type=${encodeURIComponent(type)}`,
      { cache: "no-store" }
    );
    if (!res.ok) return [];
    const json = await res.json().catch(() => null);
    const arr = Array.isArray(json) ? json : json?.data || json?.items || [];
    return arr;
  } catch {
    return [];
  }
}

function startOfMonth() {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), 1).getTime();
}
function startOfYear() {
  return new Date(new Date().getFullYear(), 0, 1).getTime();
}
function daysSince(ts) {
  if (!ts) return null;
  return Math.floor((Date.now() - new Date(ts).getTime()) / 86400000);
}
function pickDate(rec) {
  return (
    rec?.payload?.savedAt ||
    rec?.payload?.reportDate ||
    rec?.payload?.drillDate ||
    rec?.payload?.date ||
    rec?.created_at ||
    rec?.createdAt ||
    null
  );
}

/* ===== STYLES ===== */
const S = {
  shell: {
    minHeight: "100vh",
    padding: "20px 16px",
    background:
      "radial-gradient(circle at 12% 10%, rgba(34,211,238,0.18) 0, rgba(255,255,255,1) 42%, rgba(255,255,255,1) 100%)," +
      "radial-gradient(circle at 88% 12%, rgba(34,197,94,0.14) 0, rgba(255,255,255,0) 55%)",
    fontFamily: 'system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif',
    color: "#071b2d",
  },
  layout: { width: "100%", margin: "0 auto", padding: "0 4px" },
  topBar: {
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
  },
  title: { fontSize: 22, fontWeight: 950 },
  subtitle: { fontSize: 12, fontWeight: 700, opacity: 0.78 },
  btn: (kind = "secondary") => {
    const map = {
      primary:   { bg: "linear-gradient(180deg, #0ea5e9, #06b6d4)", color: "#fff", border: "#0284c7" },
      secondary: { bg: "#fff", color: "#0c4a6e", border: "#cbd5e1" },
      success:   { bg: "linear-gradient(180deg, #22c55e, #16a34a)", color: "#fff", border: "#15803d" },
    };
    const c = map[kind] || map.secondary;
    return {
      background: c.bg, color: c.color, border: `1.5px solid ${c.border}`,
      padding: "7px 14px", borderRadius: 999, cursor: "pointer",
      fontWeight: 900, fontSize: 13,
    };
  },
  kpiRow: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
    gap: 12,
    marginBottom: 14,
  },
  card: {
    background: "rgba(255,255,255,0.96)",
    border: "1px solid rgba(15,23,42,0.14)",
    borderRadius: 16,
    padding: 16,
    boxShadow: "0 8px 22px rgba(2,132,199,0.08)",
  },
  kpiLabel: {
    fontSize: 11.5, fontWeight: 900, color: "#64748b",
    textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 4,
  },
  kpiValue: { fontSize: 32, fontWeight: 950, lineHeight: 1.1 },
  kpiSub: { fontSize: 12, fontWeight: 700, color: "#64748b", marginTop: 4 },
  clauseChip: {
    display: "inline-block", marginTop: 8,
    padding: "3px 8px", borderRadius: 999,
    background: "rgba(245,158,11,0.16)", border: "1px solid rgba(245,158,11,0.4)",
    color: "#854d0e", fontSize: 10.5, fontWeight: 950,
    cursor: "pointer", textDecoration: "none",
  },
  sectionHead: {
    fontSize: 16, fontWeight: 950, color: "#0c4a6e",
    margin: "16px 0 8px", display: "flex", alignItems: "center", gap: 8,
  },
  matrix: {
    display: "grid",
    gridTemplateColumns: "200px 1fr 120px 120px",
    gap: 0,
    border: "1px solid #e2e8f0",
    borderRadius: 10,
    overflow: "hidden",
  },
  matrixHead: {
    background: "#0ea5e9", color: "#fff",
    padding: "9px 12px", fontWeight: 900, fontSize: 12.5,
  },
  matrixCell: {
    padding: "10px 12px", borderTop: "1px solid #e2e8f0",
    fontSize: 13, fontWeight: 700, background: "#fff",
  },
  matrixCellAlt: {
    padding: "10px 12px", borderTop: "1px solid #e2e8f0",
    fontSize: 13, fontWeight: 700, background: "#f8fafc",
  },
  pill: (color) => ({
    display: "inline-block", padding: "2px 10px", borderRadius: 999,
    fontSize: 11, fontWeight: 950, color: "#fff", background: color,
  }),
};

function KPI({ icon, label, value, sub, accent = "#0369a1", clauses = [], onClauseClick }) {
  return (
    <div style={S.card}>
      <div style={S.kpiLabel}>{icon} {label}</div>
      <div style={{ ...S.kpiValue, color: accent }}>{value}</div>
      {sub && <div style={S.kpiSub}>{sub}</div>}
      {clauses?.length > 0 && (
        <div>
          {clauses.map((c) => (
            <span key={c} style={{ ...S.clauseChip, marginRight: 4 }}
              onClick={(e) => { e.stopPropagation(); onClauseClick?.(c); }}
              title="Open in HACCP Manual"
            >
              📕 {c}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

export default function HaccpDashboard() {
  const navigate = useNavigate();
  const { t, lang, toggle, dir } = useHaccpLang();
  const [data, setData] = useState({
    ccp: [], mockRecall: [], supplier: [], product: [], dm: [],
    mrm: [], audit: [], calib: [], licenses: [],
  });
  const [loading, setLoading] = useState(true);
  const [refreshedAt, setRefreshedAt] = useState(null);

  async function load() {
    setLoading(true);
    const [ccp, mockRecall, supplier, product, dm, mrm, audit, calib, licenses] =
      await Promise.all(Object.values(TYPES).map(fetchType));
    setData({ ccp, mockRecall, supplier, product, dm, mrm, audit, calib, licenses });
    setRefreshedAt(new Date());
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  const ccpStats = useMemo(() => {
    const list = data.ccp || [];
    const monthStart = startOfMonth();
    const ofMonth = list.filter((r) => new Date(pickDate(r) || 0).getTime() >= monthStart);
    const deviations = list.filter((r) => {
      const status = r?.payload?.status || r?.payload?.evaluation || "";
      return /deviation|fail|out/i.test(String(status));
    });
    return { total: list.length, ofMonth: ofMonth.length, deviations: deviations.length };
  }, [data.ccp]);

  const mockRecallStats = useMemo(() => {
    const list = data.mockRecall || [];
    const yearStart = startOfYear();
    const ofYear = list.filter((r) => new Date(pickDate(r) || 0).getTime() >= yearStart);
    const last = list.slice().sort((a, b) => new Date(pickDate(b) || 0) - new Date(pickDate(a) || 0))[0];
    return {
      total: list.length,
      ofYear: ofYear.length,
      lastDate: last ? pickDate(last) : null,
      lastDays: last ? daysSince(pickDate(last)) : null,
    };
  }, [data.mockRecall]);

  const dmStats = useMemo(() => {
    const list = data.dm || [];
    return { total: list.length };
  }, [data.dm]);

  const supplierStats = useMemo(() => {
    const list = data.supplier || [];
    return { total: list.length };
  }, [data.supplier]);

  const productStats = useMemo(() => ({ total: (data.product || []).length }), [data.product]);

  const mrmStats = useMemo(() => {
    const list = data.mrm || [];
    const last = list.slice().sort((a, b) => new Date(pickDate(b) || 0) - new Date(pickDate(a) || 0))[0];
    return {
      total: list.length,
      lastDate: last ? pickDate(last) : null,
      lastDays: last ? daysSince(pickDate(last)) : null,
    };
  }, [data.mrm]);

  const auditStats = useMemo(() => {
    const list = data.audit || [];
    const openNc = list.reduce((sum, r) => {
      const ncs = r?.payload?.findings || r?.payload?.ncs || [];
      const open = (Array.isArray(ncs) ? ncs : []).filter((f) => !f.closed && !f.resolved).length;
      return sum + open;
    }, 0);
    return { total: list.length, openNc };
  }, [data.audit]);

  const calibStats = useMemo(() => {
    const list = data.calib || [];
    const today = Date.now();
    const due30 = list.filter((r) => {
      const next = r?.payload?.nextDueDate;
      if (!next) return false;
      const t = new Date(next).getTime();
      return t - today < 30 * 86400000 && t > today;
    }).length;
    const overdue = list.filter((r) => {
      const next = r?.payload?.nextDueDate;
      return next && new Date(next).getTime() < today;
    }).length;
    return { total: list.length, due30, overdue };
  }, [data.calib]);

  function go(c) {
    navigate(`/haccp-iso/haccp-manual?section=${encodeURIComponent(c)}`);
  }

  /* Linkage matrix rows */
  const linkage = [
    { clauses: ["8.5", "8.6"],  module: "🎯 " + (lang === "ar" ? "مراقبة CCP" : "CCP Monitoring"),                  count: ccpStats.total,         status: ccpStats.deviations > 0 ? "warn" : "ok",  route: "/haccp-iso/ccp-monitoring/view" },
    { clauses: ["8.3", "8.9"],  module: "🔄 " + (lang === "ar" ? "السحب الوهمي / التتبع" : "Mock Recall / Traceability"), count: mockRecallStats.total,  status: mockRecallStats.lastDays !== null && mockRecallStats.lastDays > 100 ? "warn" : "ok", route: "/haccp-iso/mock-recall/view" },
    { clauses: ["4.2"],         module: "🤝 " + (lang === "ar" ? "تقييم الموردين" : "Supplier Evaluation"),         count: supplierStats.total,    status: "ok", route: "/haccp-iso/supplier-evaluation" },
    { clauses: ["8.5", "products"], module: "🥩 " + (lang === "ar" ? "تفاصيل المنتج" : "Product Details"),           count: productStats.total,     status: "ok", route: "/haccp-iso/product-details/view" },
    { clauses: ["4.2"],         module: "🏛️ " + (lang === "ar" ? "تفتيش البلدية" : "DM Inspection"),                  count: dmStats.total,          status: "ok", route: "/haccp-iso/dm-inspection/view" },
    { clauses: ["7.5", "8.2"],  module: "📑 SOP & sSOP",                                                              count: "—",                    status: "ok", route: "/haccp-iso/sop-ssop" },
    { clauses: ["9.3"],         module: "📋 " + (lang === "ar" ? "مراجعة الإدارة (MRM)" : "Management Review (MRM)"), count: mrmStats.total,         status: mrmStats.lastDays !== null && mrmStats.lastDays > 365 ? "warn" : "ok", route: "/haccp-iso/mrm/view" },
    { clauses: ["9.2"],         module: "🔍 " + (lang === "ar" ? "التدقيق الداخلي" : "Internal Audit"),               count: auditStats.total,       status: auditStats.openNc > 0 ? "warn" : "ok", route: "/haccp-iso/internal-audit/view" },
    { clauses: ["8.7"],         module: "🌡️ " + (lang === "ar" ? "المعايرة" : "Calibration"),                          count: calibStats.total,       status: (calibStats.overdue > 0) ? "bad" : (calibStats.due30 > 0 ? "warn" : "ok"), route: "/haccp-iso/calibration/view" },
    { clauses: ["4.4"],         module: "📜 " + (lang === "ar" ? "الرخص والعقود" : "Licenses & Contracts"),           count: (data.licenses || []).length, status: "ok", route: "/haccp-iso/licenses-contracts/view" },
  ];

  return (
    <main style={{ ...S.shell, direction: dir }}>
      <div style={S.layout}>
        <div style={S.topBar}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <img src={mawashiLogo} alt="logo" style={{ width: 46, height: 46, borderRadius: 10, objectFit: "cover" }} />
            <div>
              <div style={S.title}>{t("dashTitle")}</div>
              <div style={S.subtitle}>{t("dashSubtitle")}</div>
            </div>
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
            {refreshedAt && (
              <span style={{ fontSize: 11.5, fontWeight: 700, color: "#64748b" }}>
                ⏱️ {refreshedAt.toLocaleTimeString()}
              </span>
            )}
            <HaccpLangToggle lang={lang} toggle={toggle} />
            <button style={S.btn("secondary")} onClick={load} disabled={loading}>
              {loading ? t("loading") : t("refresh")}
            </button>
            <button style={S.btn("primary")} onClick={() => navigate("/haccp-iso/haccp-manual")}>
              {t("openManual")}
            </button>
            <button style={S.btn("secondary")} onClick={() => navigate("/haccp-iso")}>
              {t("backToHub")}
            </button>
          </div>
        </div>

        {/* KPI Grid */}
        <div style={S.kpiRow}>
          <KPI
            icon="🎯" label={t("kpiCcpTotal")} value={ccpStats.total}
            sub={t("kpiCcpSub", { m: ccpStats.ofMonth, d: ccpStats.deviations })}
            accent={ccpStats.deviations > 0 ? "#b91c1c" : "#15803d"}
            clauses={["8.5", "8.6"]} onClauseClick={go}
          />
          <KPI
            icon="🔄" label={t("kpiMockRecall")} value={mockRecallStats.total}
            sub={mockRecallStats.lastDays !== null ? t("kpiMockRecallSub", { n: mockRecallStats.lastDays }) : t("kpiMockRecallNone")}
            accent={mockRecallStats.lastDays !== null && mockRecallStats.lastDays > 100 ? "#a16207" : "#15803d"}
            clauses={["8.3", "8.9"]} onClauseClick={go}
          />
          <KPI
            icon="🤝" label={t("kpiSupplier")} value={supplierStats.total}
            sub={t("kpiSupplierSub")}
            accent="#0369a1"
            clauses={["4.2"]} onClauseClick={go}
          />
          <KPI
            icon="🏛️" label={t("kpiDM")} value={dmStats.total}
            sub={t("kpiDMSub")}
            accent="#7c3aed"
            clauses={["4.2"]} onClauseClick={go}
          />
          <KPI
            icon="📋" label={t("kpiMRM")} value={mrmStats.total}
            sub={mrmStats.lastDays !== null ? t("kpiMRMSub", { n: mrmStats.lastDays }) : t("kpiMRMNone")}
            accent={mrmStats.lastDays !== null && mrmStats.lastDays > 365 ? "#b91c1c" : "#15803d"}
            clauses={["9.3"]} onClauseClick={go}
          />
          <KPI
            icon="🔍" label={t("kpiAudit")} value={auditStats.total}
            sub={auditStats.openNc > 0 ? t("kpiAuditOpen", { n: auditStats.openNc }) : t("kpiAuditClosed")}
            accent={auditStats.openNc > 0 ? "#b91c1c" : "#15803d"}
            clauses={["9.2"]} onClauseClick={go}
          />
          <KPI
            icon="🌡️" label={t("kpiCalib")} value={calibStats.total}
            sub={
              calibStats.overdue > 0 ? t("kpiCalibOverdue", { n: calibStats.overdue }) :
              calibStats.due30 > 0   ? t("kpiCalibDue", { n: calibStats.due30 }) :
              t("kpiCalibOk")
            }
            accent={calibStats.overdue > 0 ? "#b91c1c" : (calibStats.due30 > 0 ? "#a16207" : "#15803d")}
            clauses={["8.7"]} onClauseClick={go}
          />
          <KPI
            icon="🥩" label={t("kpiProduct")} value={productStats.total}
            sub={t("kpiProductSub")}
            accent="#0369a1"
            clauses={["8.5", "products"]} onClauseClick={go}
          />
        </div>

        {/* Linkage Matrix */}
        <div style={S.sectionHead}>{t("matrixTitle")}</div>
        <div style={S.matrix}>
          <div style={{ ...S.matrixHead }}>{t("matrixClause")}</div>
          <div style={{ ...S.matrixHead }}>{t("matrixModule")}</div>
          <div style={{ ...S.matrixHead, textAlign: "center" }}>{t("matrixRecords")}</div>
          <div style={{ ...S.matrixHead, textAlign: "center" }}>{t("matrixStatus")}</div>

          {linkage.map((row, i) => {
            const cellBg = i % 2 ? S.matrixCellAlt : S.matrixCell;
            const statusColor =
              row.status === "bad"  ? "#dc2626" :
              row.status === "warn" ? "#d97706" :
              "#16a34a";
            const statusLabel =
              row.status === "bad"  ? t("statusBad") :
              row.status === "warn" ? t("statusWatch") :
              t("statusOk");
            return (
              <React.Fragment key={i}>
                <div style={cellBg}>
                  {row.clauses.map((c) => (
                    <span key={c} style={{ ...S.clauseChip, marginRight: 4 }} onClick={() => go(c)}>
                      📕 {c}
                    </span>
                  ))}
                </div>
                <div style={cellBg}>
                  <span
                    onClick={() => navigate(row.route)}
                    style={{ cursor: "pointer", textDecoration: "underline", textDecorationColor: "#cbd5e1" }}
                  >
                    {row.module}
                  </span>
                </div>
                <div style={{ ...cellBg, textAlign: "center", fontWeight: 950 }}>{row.count}</div>
                <div style={{ ...cellBg, textAlign: "center" }}>
                  <span style={S.pill(statusColor)}>{statusLabel}</span>
                </div>
              </React.Fragment>
            );
          })}
        </div>

        <div style={{ marginTop: 14, fontSize: 12, color: "#64748b", textAlign: "center", fontWeight: 800 }}>
          © Al Mawashi — HACCP Manual Linkage View
        </div>
      </div>
    </main>
  );
}
