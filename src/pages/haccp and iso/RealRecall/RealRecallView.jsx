// src/pages/haccp and iso/RealRecall/RealRecallView.jsx
// Real Recall — list view + KPIs (ISO 8.9.5)

import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import API_BASE from "../../../config/api";
import HaccpLinkBadge from "../FSMSManual/HaccpLinkBadge";
import { useHaccpLang, HaccpLangToggle } from "../_shared/haccpI18n";

const TYPE = "real_recall";

const CLASS_COLOR = {
  I:   { bg: "#fee2e2", color: "#991b1b", border: "#fca5a5", label: "Class I" },
  II:  { bg: "#fed7aa", color: "#9a3412", border: "#fdba74", label: "Class II" },
  III: { bg: "#fef3c7", color: "#854d0e", border: "#fcd34d", label: "Class III" },
};

const STATUS_COLOR = {
  Active:    { bg: "#fecaca", color: "#991b1b" },
  Contained: { bg: "#fed7aa", color: "#9a3412" },
  Closed:    { bg: "#dcfce7", color: "#15803d" },
};

const S = {
  shell: {
    minHeight: "100vh", padding: "20px 16px",
    fontFamily: 'system-ui,-apple-system,"Segoe UI",sans-serif',
    background: "linear-gradient(180deg, #fef2f2 0%, #fff7ed 100%)",
    color: "#1f2937",
  },
  layout: { width: "100%", margin: "0 auto" },

  topbar: {
    display: "flex", justifyContent: "space-between", alignItems: "center",
    marginBottom: 14, flexWrap: "wrap", gap: 10,
    padding: "12px 16px",
    background: "rgba(255,255,255,0.92)",
    borderRadius: 14, border: "1px solid #fecaca",
    boxShadow: "0 8px 24px rgba(220,38,38,0.10)",
  },
  title: { fontSize: 22, fontWeight: 950, color: "#7f1d1d" },
  subtitle: { fontSize: 12, color: "#991b1b", marginTop: 4, fontWeight: 700 },

  kpiGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))", gap: 10, marginBottom: 14 },
  kpi: (color) => ({
    background: "#fff", borderRadius: 14, padding: "14px 16px",
    border: `1px solid ${color}33`,
    boxShadow: "0 6px 16px rgba(220,38,38,0.05)",
    borderInlineStart: `4px solid ${color}`,
  }),
  kpiVal: (color) => ({ fontSize: 28, fontWeight: 950, color, lineHeight: 1 }),
  kpiLabel: { fontSize: 11, fontWeight: 800, color: "#64748b", marginTop: 6, textTransform: "uppercase", letterSpacing: "0.07em" },

  toolbar: {
    display: "flex", gap: 8, marginBottom: 12, flexWrap: "wrap", alignItems: "center",
    padding: 10, background: "#fff", borderRadius: 14, border: "1px solid #fecaca",
  },
  select: {
    padding: "8px 12px", border: "1.5px solid #fecaca", borderRadius: 10,
    fontSize: 13, fontWeight: 700, background: "#fff", cursor: "pointer",
  },

  card: { background: "#fff", borderRadius: 14, padding: 16, marginBottom: 10, border: "1px solid #fecaca", boxShadow: "0 6px 16px rgba(220,38,38,0.06)" },
  rowHead: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 10 },
  meta: { fontSize: 12, color: "#64748b", fontWeight: 700, marginTop: 4 },
  badge: (c) => ({
    display: "inline-block", padding: "3px 10px", borderRadius: 999,
    fontSize: 11, fontWeight: 900,
    background: c.bg, color: c.color,
    border: c.border ? `1px solid ${c.border}` : "none",
  }),

  recoveryOuter: { width: "100%", height: 18, background: "#fff", borderRadius: 999, overflow: "hidden", border: "1px solid #fecaca", marginTop: 8 },
  recoveryInner: (pct) => ({
    width: `${Math.max(0, Math.min(100, pct))}%`,
    height: "100%",
    background: pct >= 90
      ? "linear-gradient(180deg, #22c55e, #16a34a)"
      : pct >= 60
      ? "linear-gradient(180deg, #eab308, #ca8a04)"
      : "linear-gradient(180deg, #ef4444, #dc2626)",
    transition: "width 0.4s ease",
    display: "flex", alignItems: "center", justifyContent: "flex-end",
    paddingInlineEnd: 8,
    color: "#fff", fontSize: 10, fontWeight: 900,
  }),

  detailBlock: { marginTop: 10, paddingTop: 10, borderTop: "1px dashed #fecaca" },
  miniTitle: { fontSize: 12, fontWeight: 900, color: "#7f1d1d", marginBottom: 4 },
  miniText: { fontSize: 13, color: "#1f2937", whiteSpace: "pre-wrap", lineHeight: 1.5 },

  empty: { textAlign: "center", padding: 60, color: "#64748b", fontWeight: 700 },

  btn: (kind) => {
    const map = {
      primary:   { bg: "linear-gradient(180deg, #ef4444, #dc2626)", color: "#fff", border: "#b91c1c" },
      secondary: { bg: "#fff", color: "#7f1d1d", border: "#fecaca" },
      danger:    { bg: "linear-gradient(180deg, #ef4444, #dc2626)", color: "#fff", border: "#b91c1c" },
    };
    const c = map[kind] || map.primary;
    return {
      background: c.bg, color: c.color, border: `1.5px solid ${c.border}`,
      padding: "8px 14px", borderRadius: 999, cursor: "pointer",
      fontWeight: 900, fontSize: 13, whiteSpace: "nowrap",
    };
  },
};

export default function RealRecallView() {
  const navigate = useNavigate();
  const { t, lang, toggle, dir } = useHaccpLang();
  const isAr = lang === "ar";

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [openId, setOpenId] = useState(null);
  const [classFilter, setClassFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  async function load() {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/reports?type=${encodeURIComponent(TYPE)}`, { cache: "no-store" });
      const json = await res.json().catch(() => null);
      const arr = Array.isArray(json) ? json : json?.data || json?.items || [];
      arr.sort((a, b) => new Date(b?.payload?.initDate || 0) - new Date(a?.payload?.initDate || 0));
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

  const stats = useMemo(() => {
    const total = items.length;
    let active = 0, closed = 0, totalCost = 0, recoveryRates = [];
    for (const rec of items) {
      const p = rec?.payload || {};
      if (p.status === "Closed") closed++;
      else active++;
      if (p.cost) totalCost += parseFloat(p.cost) || 0;
      const d = parseFloat(p.qtyDistributed);
      const r = parseFloat(p.qtyRecovered);
      if (d && !isNaN(d) && !isNaN(r)) recoveryRates.push((r / d) * 100);
    }
    const avgRec = recoveryRates.length > 0
      ? recoveryRates.reduce((a, b) => a + b, 0) / recoveryRates.length
      : null;
    return { total, active, closed, totalCost, avgRec };
  }, [items]);

  const filtered = useMemo(() => {
    return items.filter((rec) => {
      const p = rec?.payload || {};
      if (classFilter !== "all" && p.recallClass !== classFilter) return false;
      if (statusFilter !== "all" && (p.status || "Active") !== statusFilter) return false;
      return true;
    });
  }, [items, classFilter, statusFilter]);

  return (
    <main style={{ ...S.shell, direction: dir }}>
      <div style={S.layout}>
        <div style={S.topbar}>
          <div>
            <div style={S.title}>{t("rrListTitle")}</div>
            <div style={S.subtitle}>{t("rrSubtitle")}</div>
            <HaccpLinkBadge clauses={["8.9.5"]} label={isAr ? "السحب الفعلي" : "Withdrawal/Recall"} />
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <HaccpLangToggle lang={lang} toggle={toggle} />
            <button style={S.btn("secondary")} onClick={load} disabled={loading}>{loading ? "⏳" : t("refresh")}</button>
            <button style={S.btn("primary")} onClick={() => navigate("/haccp-iso/real-recall")}>{t("new")}</button>
            <button style={S.btn("secondary")} onClick={() => navigate("/haccp-iso")}>{t("backToHub")}</button>
          </div>
        </div>

        {/* KPIs */}
        <div style={S.kpiGrid}>
          <div style={S.kpi("#7f1d1d")}>
            <div style={S.kpiVal("#7f1d1d")}>{stats.total}</div>
            <div style={S.kpiLabel}>{t("rrTotal")}</div>
          </div>
          <div style={S.kpi("#dc2626")}>
            <div style={S.kpiVal("#dc2626")}>{stats.active}</div>
            <div style={S.kpiLabel}>{t("rrActive")}</div>
          </div>
          <div style={S.kpi("#16a34a")}>
            <div style={S.kpiVal("#16a34a")}>{stats.closed}</div>
            <div style={S.kpiLabel}>{t("rrClosed")}</div>
          </div>
          <div style={S.kpi("#0891b2")}>
            <div style={S.kpiVal("#0891b2")}>{stats.avgRec != null ? `${stats.avgRec.toFixed(1)}%` : "—"}</div>
            <div style={S.kpiLabel}>{t("rrAvgRecovery")}</div>
          </div>
          <div style={S.kpi("#7c3aed")}>
            <div style={S.kpiVal("#7c3aed")}>{stats.totalCost ? stats.totalCost.toLocaleString() : "—"}</div>
            <div style={S.kpiLabel}>{t("rrTotalCost")} (AED)</div>
          </div>
        </div>

        {/* Filters */}
        <div style={S.toolbar}>
          <select style={S.select} value={classFilter} onChange={(e) => setClassFilter(e.target.value)}>
            <option value="all">{t("rrFilterAllClasses")}</option>
            <option value="I">Class I</option>
            <option value="II">Class II</option>
            <option value="III">Class III</option>
          </select>
          <select style={S.select} value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="all">{t("rrFilterAllStatuses")}</option>
            <option value="Active">{t("rrStatusActive")}</option>
            <option value="Contained">{t("rrStatusContained")}</option>
            <option value="Closed">{t("rrStatusClosed")}</option>
          </select>
          <div style={{ marginInlineStart: "auto", fontSize: 12, color: "#64748b", fontWeight: 800 }}>
            {filtered.length} / {stats.total}
          </div>
        </div>

        {loading && <div style={S.empty}>{t("loading")}</div>}
        {!loading && filtered.length === 0 && <div style={S.empty}>{t("noRecords")}</div>}

        {filtered.map((rec) => {
          const p = rec?.payload || {};
          const isOpen = openId === rec.id;
          const cls = CLASS_COLOR[p.recallClass] || CLASS_COLOR.II;
          const st = STATUS_COLOR[p.status || "Active"] || STATUS_COLOR.Active;
          const d = parseFloat(p.qtyDistributed);
          const r = parseFloat(p.qtyRecovered);
          const rate = (d && !isNaN(d) && !isNaN(r)) ? (r / d) * 100 : null;

          return (
            <div key={rec.id} style={S.card}>
              <div style={S.rowHead}>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div style={{ fontSize: 16, fontWeight: 950, color: "#7f1d1d" }}>
                    🚨 {p.recallNumber || "RR"} — {p.affectedProduct || "—"}
                  </div>
                  <div style={S.meta}>
                    📅 {p.initDate || "—"} • 👤 {p.initiatedBy || "—"}
                    {p.signedBy && <> • ✓ {t("rrSignedBy")}: {p.signedBy}</>}
                  </div>
                  <div style={{ marginTop: 6, display: "flex", gap: 6, flexWrap: "wrap" }}>
                    <span style={S.badge(cls)}>{cls.label}</span>
                    <span style={S.badge(st)}>{t(`rrStatus${p.status || "Active"}`)}</span>
                    {p.publicNotice === "yes" && (
                      <span style={S.badge({ bg: "#fce7f3", color: "#9f1239" })}>📢 Public Notice</span>
                    )}
                  </div>
                  {rate !== null && (
                    <>
                      <div style={{ marginTop: 8, fontSize: 12, fontWeight: 800, color: "#1f2937" }}>
                        {t("rrRecoveryRate")}: <strong>{rate.toFixed(1)}%</strong>
                        <span style={{ color: "#64748b", fontWeight: 700 }}> ({r} / {d} {p.unit})</span>
                      </div>
                      <div style={S.recoveryOuter}>
                        <div style={S.recoveryInner(rate)}>
                          {rate >= 10 && `${rate.toFixed(0)}%`}
                        </div>
                      </div>
                    </>
                  )}
                </div>
                <div style={{ display: "flex", gap: 6 }}>
                  <button style={S.btn("secondary")} onClick={() => setOpenId(isOpen ? null : rec.id)}>
                    {isOpen ? t("collapse") : t("expand")}
                  </button>
                  <button style={S.btn("secondary")} onClick={() => navigate(`/haccp-iso/real-recall?edit=${rec.id}`)}>
                    {t("edit")}
                  </button>
                  <button style={S.btn("danger")} onClick={() => del(rec.id)}>{t("del")}</button>
                </div>
              </div>

              {isOpen && (
                <div style={S.detailBlock}>
                  {p.reasonDetail && (
                    <div style={{ marginBottom: 10 }}>
                      <div style={S.miniTitle}>{t("rrReasonDetail")}</div>
                      <div style={S.miniText}>{p.reasonDetail}</div>
                    </div>
                  )}
                  {p.affectedBatches && (
                    <div style={{ marginBottom: 10 }}>
                      <div style={S.miniTitle}>{t("rrAffectedBatches")}</div>
                      <div style={S.miniText}>{p.affectedBatches}</div>
                    </div>
                  )}
                  {(p.productionDates || p.expiryRange) && (
                    <div style={{ display: "flex", gap: 16, marginBottom: 10, flexWrap: "wrap" }}>
                      {p.productionDates && (
                        <div>
                          <div style={S.miniTitle}>{t("rrProductionDates")}</div>
                          <div style={S.miniText}>{p.productionDates}</div>
                        </div>
                      )}
                      {p.expiryRange && (
                        <div>
                          <div style={S.miniTitle}>{t("rrExpiryRange")}</div>
                          <div style={S.miniText}>{p.expiryRange}</div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Authorities */}
                  {p.authorities && (
                    <div style={{ marginBottom: 10 }}>
                      <div style={S.miniTitle}>{t("rrAuthoritiesTitle")}</div>
                      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                        {Object.entries(p.authorities).filter(([_, v]) => v).map(([k]) => (
                          <span key={k} style={S.badge({ bg: "#dbeafe", color: "#1e40af" })}>
                            ✓ {t(`rrAuth${k}`)}
                          </span>
                        ))}
                        {Object.values(p.authorities).every((v) => !v) && (
                          <span style={{ fontSize: 12, color: "#94a3b8", fontStyle: "italic" }}>
                            {isAr ? "لم تُخطر أي سلطة" : "No authorities notified"}
                          </span>
                        )}
                      </div>
                    </div>
                  )}

                  {p.disposition && (
                    <div style={{ marginBottom: 10 }}>
                      <div style={S.miniTitle}>{t("rrDispositionTitle")}: {t(`rrDisposition${p.disposition}`)}</div>
                      {p.dispositionDetails && <div style={S.miniText}>{p.dispositionDetails}</div>}
                    </div>
                  )}

                  {(p.cost || p.costBreakdown) && (
                    <div style={{ marginBottom: 10 }}>
                      <div style={S.miniTitle}>{t("rrCostTitle")}: {p.cost ? `${parseFloat(p.cost).toLocaleString()} AED` : "—"}</div>
                      {p.costBreakdown && <div style={S.miniText}>{p.costBreakdown}</div>}
                    </div>
                  )}

                  {p.rootCause && (
                    <div style={{ marginBottom: 10 }}>
                      <div style={S.miniTitle}>{t("rrRootCause")}</div>
                      <div style={S.miniText}>{p.rootCause}</div>
                    </div>
                  )}
                  {p.correctiveActions && (
                    <div style={{ marginBottom: 10 }}>
                      <div style={S.miniTitle}>{t("rrCorrectiveActions")}</div>
                      <div style={S.miniText}>{p.correctiveActions}</div>
                    </div>
                  )}
                  {p.preventiveActions && (
                    <div style={{ marginBottom: 10 }}>
                      <div style={S.miniTitle}>{t("rrPreventiveActions")}</div>
                      <div style={S.miniText}>{p.preventiveActions}</div>
                    </div>
                  )}

                  {p.closureDate && (
                    <div style={S.meta}>
                      📅 {t("rrClosureDate")}: {p.closureDate}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </main>
  );
}
