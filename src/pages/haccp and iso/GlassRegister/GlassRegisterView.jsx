// src/pages/haccp and iso/GlassRegister/GlassRegisterView.jsx
// Glass & Brittle Plastic — inventory list with KPIs, filters, alerts, inspection tracking

import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import API_BASE from "../../../config/api";
import HaccpLinkBadge from "../FSMSManual/HaccpLinkBadge";
import { useHaccpLang, HaccpLangToggle } from "../_shared/haccpI18n";

const TYPE = "glass_register_item";

const TYPE_COLOR = {
  Glass:          { bg: "#dbeafe", color: "#1e40af", icon: "🪟" },
  BrittlePlastic: { bg: "#cffafe", color: "#155e75", icon: "🧊" },
  Acrylic:        { bg: "#ede9fe", color: "#6b21a8", icon: "💎" },
  Ceramic:        { bg: "#fed7aa", color: "#9a3412", icon: "🏺" },
  Other:          { bg: "#f1f5f9", color: "#475569", icon: "📦" },
};

const RISK_COLOR = {
  High:   { bg: "#fee2e2", color: "#991b1b" },
  Medium: { bg: "#fef9c3", color: "#854d0e" },
  Low:    { bg: "#dcfce7", color: "#166534" },
};

const PROTECTION_COLOR = {
  Shatterproof: { bg: "#dcfce7", color: "#166534" },
  Shield:       { bg: "#dbeafe", color: "#1e40af" },
  Cover:        { bg: "#ddd6fe", color: "#5b21b6" },
  Enclosed:     { bg: "#cffafe", color: "#155e75" },
  None:         { bg: "#fecaca", color: "#991b1b" },
};

const CONDITION_COLOR = {
  Intact:   { bg: "#dcfce7", color: "#166534" },
  Cracked:  { bg: "#fef9c3", color: "#854d0e" },
  Broken:   { bg: "#fecaca", color: "#991b1b" },
  Removed:  { bg: "#f1f5f9", color: "#64748b" },
};

const S = {
  shell: { minHeight: "100vh", padding: "20px 16px", fontFamily: 'system-ui,-apple-system,"Segoe UI",sans-serif', background: "linear-gradient(180deg, #f8fafc 0%, #eff6ff 100%)", color: "#0f172a" },
  layout: { width: "100%", margin: "0 auto" },

  topbar: {
    display: "flex", justifyContent: "space-between", alignItems: "center",
    marginBottom: 14, flexWrap: "wrap", gap: 10,
    padding: "12px 16px",
    background: "rgba(255,255,255,0.92)",
    borderRadius: 14, border: "1px solid #bfdbfe",
    boxShadow: "0 8px 24px rgba(37,99,235,0.10)",
  },
  title: { fontSize: 22, fontWeight: 950, color: "#1e3a8a" },
  subtitle: { fontSize: 12, color: "#1d4ed8", marginTop: 4, fontWeight: 700 },

  kpiGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))", gap: 10, marginBottom: 14 },
  kpi: (color) => ({
    background: "#fff", borderRadius: 14, padding: "14px 16px",
    border: `1px solid ${color}33`,
    boxShadow: "0 6px 16px rgba(37,99,235,0.05)",
    borderInlineStart: `4px solid ${color}`,
  }),
  kpiVal: (color) => ({ fontSize: 28, fontWeight: 950, color, lineHeight: 1 }),
  kpiLabel: { fontSize: 11, fontWeight: 800, color: "#64748b", marginTop: 6, textTransform: "uppercase", letterSpacing: "0.07em" },

  alert: {
    background: "linear-gradient(135deg, #fee2e2, #fecaca)",
    border: "1.5px solid #ef4444",
    borderRadius: 12,
    padding: "12px 16px",
    marginBottom: 12,
    fontSize: 13, fontWeight: 800, color: "#7f1d1d",
    display: "flex", alignItems: "center", gap: 10,
  },

  toolbar: {
    display: "flex", gap: 8, marginBottom: 12, flexWrap: "wrap", alignItems: "center",
    padding: 10, background: "#fff", borderRadius: 14, border: "1px solid #bfdbfe",
  },
  search: { flex: "1 1 200px", minWidth: 180, padding: "9px 12px", border: "1.5px solid #bfdbfe", borderRadius: 10, fontSize: 13, fontWeight: 600, fontFamily: "inherit" },
  select: { padding: "8px 12px", border: "1.5px solid #bfdbfe", borderRadius: 10, fontSize: 13, fontWeight: 700, background: "#fff", cursor: "pointer" },

  tableWrap: { background: "#fff", borderRadius: 14, border: "1px solid #bfdbfe", overflow: "hidden", boxShadow: "0 6px 16px rgba(37,99,235,0.05)" },
  table: { width: "100%", borderCollapse: "collapse", fontSize: 12 },
  th: { padding: "10px 12px", textAlign: "start", background: "#1e3a8a", color: "#fff", fontWeight: 900, fontSize: 11, textTransform: "uppercase", letterSpacing: "0.05em", whiteSpace: "nowrap" },
  td: { padding: "10px 12px", borderTop: "1px solid #f1f5f9", verticalAlign: "middle" },

  badge: (c) => ({
    display: "inline-block", padding: "3px 10px", borderRadius: 999,
    fontSize: 10, fontWeight: 900, background: c.bg, color: c.color, whiteSpace: "nowrap",
  }),

  empty: { textAlign: "center", padding: 60, color: "#64748b", fontWeight: 700 },

  btn: (kind) => {
    const map = {
      primary:   { bg: "linear-gradient(180deg, #3b82f6, #2563eb)", color: "#fff", border: "#1d4ed8" },
      secondary: { bg: "#fff", color: "#1e3a8a", border: "#bfdbfe" },
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

function daysUntil(dateStr) {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return null;
  const now = new Date();
  return Math.round((d.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

export default function GlassRegisterView() {
  const navigate = useNavigate();
  const { t, lang, toggle, dir } = useHaccpLang();
  const isAr = lang === "ar";

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [branchFilter, setBranchFilter] = useState("all");
  const [zoneFilter, setZoneFilter] = useState("all");
  const [riskFilter, setRiskFilter] = useState("all");

  async function load() {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/reports?type=${encodeURIComponent(TYPE)}`, { cache: "no-store" });
      const json = await res.json().catch(() => null);
      const arr = Array.isArray(json) ? json : json?.data || json?.items || [];
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

  const branches = useMemo(() => {
    const set = new Set();
    items.forEach((rec) => { if (rec?.payload?.branch) set.add(rec.payload.branch); });
    return Array.from(set).sort();
  }, [items]);

  const stats = useMemo(() => {
    const total = items.length;
    let highRisk = 0, unprotected = 0, overdue = 0;
    const branchSet = new Set();
    for (const rec of items) {
      const p = rec?.payload || {};
      if (p.riskAssessment === "High") highRisk++;
      if (p.protection === "None") unprotected++;
      const due = daysUntil(p.nextInspection);
      if (due !== null && due < 0 && p.condition !== "Removed") overdue++;
      if (p.branch) branchSet.add(p.branch);
    }
    return { total, highRisk, unprotected, overdue, branches: branchSet.size };
  }, [items]);

  const alerts = useMemo(() => {
    let highRiskUnprotected = 0;
    let overdue = 0;
    for (const rec of items) {
      const p = rec?.payload || {};
      if (p.condition === "Removed") continue;
      if (p.riskAssessment === "High" && p.protection === "None") highRiskUnprotected++;
      const due = daysUntil(p.nextInspection);
      if (due !== null && due < 0) overdue++;
    }
    return { highRiskUnprotected, overdue };
  }, [items]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return items.filter((rec) => {
      const p = rec?.payload || {};
      if (typeFilter !== "all" && p.itemType !== typeFilter) return false;
      if (branchFilter !== "all" && p.branch !== branchFilter) return false;
      if (zoneFilter !== "all" && p.zone !== zoneFilter) return false;
      if (riskFilter !== "all" && p.riskAssessment !== riskFilter) return false;
      if (q) {
        const blob = `${p.itemName} ${p.itemCode || ""} ${p.location || ""} ${p.branch || ""} ${p.responsible || ""}`.toLowerCase();
        if (!blob.includes(q)) return false;
      }
      return true;
    }).sort((a, b) => {
      // sort: overdue first, then high risk, then by branch
      const ap = a.payload || {}, bp = b.payload || {};
      const aDue = daysUntil(ap.nextInspection);
      const bDue = daysUntil(bp.nextInspection);
      const aOver = aDue !== null && aDue < 0;
      const bOver = bDue !== null && bDue < 0;
      if (aOver !== bOver) return aOver ? -1 : 1;
      if ((ap.riskAssessment === "High") !== (bp.riskAssessment === "High")) {
        return ap.riskAssessment === "High" ? -1 : 1;
      }
      return String(ap.branch || "").localeCompare(String(bp.branch || ""));
    });
  }, [items, search, typeFilter, branchFilter, zoneFilter, riskFilter]);

  return (
    <main style={{ ...S.shell, direction: dir }}>
      <div style={S.layout}>
        <div style={S.topbar}>
          <div>
            <div style={S.title}>{t("grListTitle")}</div>
            <div style={S.subtitle}>{t("grSubtitle")}</div>
            <HaccpLinkBadge clauses={["8.2"]} label={isAr ? "PRP — الزجاج والبلاستيك الهش" : "PRP — Glass & Brittle Plastic"} />
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <HaccpLangToggle lang={lang} toggle={toggle} />
            <button style={S.btn("secondary")} onClick={load} disabled={loading}>{loading ? "⏳" : t("refresh")}</button>
            <button style={S.btn("primary")} onClick={() => navigate("/haccp-iso/glass-register")}>{t("new")}</button>
            <button style={S.btn("secondary")} onClick={() => navigate("/haccp-iso")}>{t("backToHub")}</button>
          </div>
        </div>

        {/* KPIs */}
        <div style={S.kpiGrid}>
          <div style={S.kpi("#1e3a8a")}>
            <div style={S.kpiVal("#1e3a8a")}>{stats.total}</div>
            <div style={S.kpiLabel}>{t("grKpiTotal")}</div>
          </div>
          <div style={S.kpi("#dc2626")}>
            <div style={S.kpiVal("#dc2626")}>{stats.highRisk}</div>
            <div style={S.kpiLabel}>{t("grKpiHighRisk")}</div>
          </div>
          <div style={S.kpi("#9a3412")}>
            <div style={S.kpiVal("#9a3412")}>{stats.unprotected}</div>
            <div style={S.kpiLabel}>{t("grKpiUnprotected")}</div>
          </div>
          <div style={S.kpi("#d97706")}>
            <div style={S.kpiVal("#d97706")}>{stats.overdue}</div>
            <div style={S.kpiLabel}>{t("grKpiOverdueInspection")}</div>
          </div>
          <div style={S.kpi("#0d9488")}>
            <div style={S.kpiVal("#0d9488")}>{stats.branches}</div>
            <div style={S.kpiLabel}>{t("grKpiBranches")}</div>
          </div>
        </div>

        {/* Alerts */}
        {alerts.highRiskUnprotected > 0 && (
          <div style={S.alert}>
            🚨 {t("grAlertHighRiskUnprotected", { n: alerts.highRiskUnprotected })}
          </div>
        )}
        {alerts.overdue > 0 && (
          <div style={{ ...S.alert, background: "linear-gradient(135deg, #fef3c7, #fde68a)", border: "1.5px solid #d97706", color: "#78350f" }}>
            ⏰ {t("grAlertOverdue", { n: alerts.overdue })}
          </div>
        )}

        {/* Toolbar */}
        <div style={S.toolbar}>
          <input style={S.search} placeholder={isAr ? "🔍 بحث..." : "🔍 Search..."} value={search} onChange={(e) => setSearch(e.target.value)} />
          <select style={S.select} value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
            <option value="all">{t("grFilterAllTypes")}</option>
            {Object.keys(TYPE_COLOR).map((k) => (
              <option key={k} value={k}>{t(`grType${k}`)}</option>
            ))}
          </select>
          <select style={S.select} value={branchFilter} onChange={(e) => setBranchFilter(e.target.value)}>
            <option value="all">{t("grFilterAllBranches")}</option>
            {branches.map((b) => <option key={b} value={b}>{b}</option>)}
          </select>
          <select style={S.select} value={zoneFilter} onChange={(e) => setZoneFilter(e.target.value)}>
            <option value="all">{t("grFilterAllZones")}</option>
            <option value="Production">{t("grZoneProduction")}</option>
            <option value="Storage">{t("grZoneStorage")}</option>
            <option value="Packaging">{t("grZonePackaging")}</option>
            <option value="Office">{t("grZoneOffice")}</option>
            <option value="Retail">{t("grZoneRetail")}</option>
            <option value="Other">{t("grZoneOther")}</option>
          </select>
          <select style={S.select} value={riskFilter} onChange={(e) => setRiskFilter(e.target.value)}>
            <option value="all">{t("grFilterAllRisks")}</option>
            <option value="High">{t("grRiskHigh")}</option>
            <option value="Medium">{t("grRiskMedium")}</option>
            <option value="Low">{t("grRiskLow")}</option>
          </select>
          <div style={{ marginInlineStart: "auto", fontSize: 12, color: "#64748b", fontWeight: 800 }}>
            {filtered.length} / {stats.total}
          </div>
        </div>

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
                    <th style={S.th}>{t("grColItem")}</th>
                    <th style={S.th}>{t("grColType")}</th>
                    <th style={S.th}>{t("grColBranch")}</th>
                    <th style={S.th}>{t("grColLocation")}</th>
                    <th style={{ ...S.th, textAlign: "center" }}>{t("grColQty")}</th>
                    <th style={S.th}>{t("grColRisk")}</th>
                    <th style={S.th}>{t("grColProtection")}</th>
                    <th style={S.th}>{t("grColCondition")}</th>
                    <th style={S.th}>{t("grColLastInspection")}</th>
                    <th style={{ ...S.th, textAlign: "center" }}>{t("grColActions")}</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((rec) => {
                    const p = rec?.payload || {};
                    const tMeta = TYPE_COLOR[p.itemType] || TYPE_COLOR.Other;
                    const rMeta = RISK_COLOR[p.riskAssessment] || RISK_COLOR.Medium;
                    const pMeta = PROTECTION_COLOR[p.protection] || PROTECTION_COLOR.Shield;
                    const cMeta = CONDITION_COLOR[p.condition] || CONDITION_COLOR.Intact;
                    const due = daysUntil(p.nextInspection);
                    const overdue = due !== null && due < 0;

                    return (
                      <tr key={rec.id}>
                        <td style={{ ...S.td, fontWeight: 900, color: "#0f172a" }}>
                          {p.itemName}
                          {p.itemCode && <div style={{ fontSize: 10, color: "#64748b", fontWeight: 700, marginTop: 2 }}>{p.itemCode}</div>}
                        </td>
                        <td style={S.td}>
                          <span style={S.badge(tMeta)}>{tMeta.icon} {p.itemType}</span>
                        </td>
                        <td style={{ ...S.td, fontWeight: 700 }}>{p.branch || "—"}</td>
                        <td style={{ ...S.td, fontSize: 11, color: "#475569" }}>
                          {p.location}
                          {p.zone && <div style={{ fontSize: 10, marginTop: 2 }}>{t(`grZone${p.zone}`)}</div>}
                        </td>
                        <td style={{ ...S.td, textAlign: "center", fontWeight: 900 }}>{p.quantity || 1}</td>
                        <td style={S.td}>
                          <span style={S.badge(rMeta)}>{p.riskAssessment}</span>
                        </td>
                        <td style={S.td}>
                          <span style={S.badge(pMeta)}>{p.protection}</span>
                        </td>
                        <td style={S.td}>
                          <span style={S.badge(cMeta)}>{t(`grCondition${p.condition || "Intact"}`)}</span>
                        </td>
                        <td style={{ ...S.td, fontSize: 11 }}>
                          <div style={{ fontWeight: 700, color: "#475569" }}>{p.lastInspection || "—"}</div>
                          {p.nextInspection && (
                            <div style={{ marginTop: 2 }}>
                              <span style={S.badge({
                                bg: overdue ? "#dc2626" : due <= 7 ? "#d97706" : "#dcfce7",
                                color: overdue || due <= 7 ? "#fff" : "#15803d",
                              })}>
                                {overdue
                                  ? (isAr ? `متأخر ${Math.abs(due)}ي` : `Overdue ${Math.abs(due)}d`)
                                  : (isAr ? `خلال ${due}ي` : `In ${due}d`)}
                              </span>
                            </div>
                          )}
                        </td>
                        <td style={{ ...S.td, textAlign: "center", whiteSpace: "nowrap" }}>
                          <button
                            style={{ ...S.btn("secondary"), padding: "5px 10px", fontSize: 11 }}
                            onClick={() => navigate(`/haccp-iso/glass-register?edit=${rec.id}`)}
                          >
                            ✏️
                          </button>
                          <button
                            style={{ ...S.btn("danger"), padding: "5px 10px", fontSize: 11, marginInlineStart: 4 }}
                            onClick={() => del(rec.id)}
                          >
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
    </main>
  );
}
