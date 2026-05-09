// src/pages/haccp and iso/ContinualImprovement/ContinualImprovementView.jsx
// Continual Improvement Log — list view with KPIs, filters, and timeline (ISO 10.2)

import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import API_BASE from "../../../config/api";
import HaccpLinkBadge from "../FSMSManual/HaccpLinkBadge";
import { useHaccpLang, HaccpLangToggle } from "../_shared/haccpI18n";

const TYPE = "continual_improvement";

const STATUS_COLOR = {
  Idea:       { bg: "#fef9c3", color: "#854d0e", label: "Idea" },
  Planned:    { bg: "#dbeafe", color: "#1e40af", label: "Planned" },
  InProgress: { bg: "#fed7aa", color: "#9a3412", label: "InProgress" },
  Completed:  { bg: "#dcfce7", color: "#166534", label: "Completed" },
  OnHold:     { bg: "#f1f5f9", color: "#64748b", label: "OnHold" },
  Cancelled:  { bg: "#fecaca", color: "#991b1b", label: "Cancelled" },
};

const PRIORITY_COLOR = {
  High:   { bg: "#fee2e2", color: "#991b1b" },
  Medium: { bg: "#fef3c7", color: "#854d0e" },
  Low:    { bg: "#e0e7ff", color: "#3730a3" },
};

const CATEGORY_COLOR = {
  FoodSafety:  "#dc2626",
  Quality:     "#0891b2",
  Cost:        "#7c3aed",
  Efficiency:  "#0d9488",
  Training:    "#d97706",
  Environment: "#16a34a",
};

const EFFECTIVE_COLOR = {
  Yes:     { bg: "#dcfce7", color: "#15803d" },
  Partial: { bg: "#fef9c3", color: "#854d0e" },
  No:      { bg: "#fecaca", color: "#991b1b" },
  Pending: { bg: "#f1f5f9", color: "#64748b" },
};

const S = {
  shell: {
    minHeight: "100vh", padding: "20px 16px",
    fontFamily: 'system-ui,-apple-system,"Segoe UI",sans-serif',
    background: "linear-gradient(180deg, #ecfdf5 0%, #f0fdfa 100%)",
    color: "#1f2937",
  },
  layout: { width: "100%", margin: "0 auto" },

  topbar: {
    display: "flex", justifyContent: "space-between", alignItems: "center",
    marginBottom: 14, flexWrap: "wrap", gap: 10,
    padding: "12px 16px",
    background: "rgba(255,255,255,0.92)",
    borderRadius: 14, border: "1px solid #86efac",
    boxShadow: "0 8px 24px rgba(22,163,74,0.10)",
  },
  title: { fontSize: 22, fontWeight: 950, color: "#14532d" },
  subtitle: { fontSize: 12, color: "#166534", marginTop: 4, fontWeight: 700 },

  kpiGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))", gap: 10, marginBottom: 14 },
  kpi: (color) => ({
    background: "#fff", borderRadius: 14, padding: "14px 16px",
    border: `1px solid ${color}33`,
    boxShadow: "0 6px 16px rgba(22,163,74,0.05)",
    borderInlineStart: `4px solid ${color}`,
  }),
  kpiVal: (color) => ({ fontSize: 28, fontWeight: 950, color, lineHeight: 1 }),
  kpiLabel: { fontSize: 11, fontWeight: 800, color: "#64748b", marginTop: 6, textTransform: "uppercase", letterSpacing: "0.07em" },

  toolbar: {
    display: "flex", gap: 8, marginBottom: 12, flexWrap: "wrap", alignItems: "center",
    padding: 10, background: "#fff", borderRadius: 14, border: "1px solid #bbf7d0",
  },
  select: {
    padding: "8px 12px", border: "1.5px solid #bbf7d0", borderRadius: 10,
    fontSize: 13, fontWeight: 700, background: "#fff", cursor: "pointer",
  },

  card: { background: "#fff", borderRadius: 14, padding: 16, marginBottom: 10, border: "1px solid #bbf7d0", boxShadow: "0 6px 16px rgba(22,163,74,0.06)" },
  rowHead: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 10 },
  meta: { fontSize: 12, color: "#64748b", fontWeight: 700, marginTop: 4 },
  badge: (c) => ({
    display: "inline-block", padding: "3px 10px", borderRadius: 999,
    fontSize: 11, fontWeight: 900,
    background: c.bg, color: c.color,
  }),

  /* Timeline */
  timeline: { display: "flex", alignItems: "center", gap: 0, marginTop: 12, padding: "12px 4px", background: "#f0fdf4", borderRadius: 10, border: "1px dashed #86efac" },
  tlStep: (active, color) => ({
    display: "flex", flexDirection: "column", alignItems: "center", flex: 1,
    position: "relative", minWidth: 0,
  }),
  tlDot: (active, color) => ({
    width: 24, height: 24, borderRadius: "50%",
    background: active ? color : "#fff",
    border: `2px solid ${active ? color : "#cbd5e1"}`,
    color: active ? "#fff" : "#cbd5e1",
    display: "flex", alignItems: "center", justifyContent: "center",
    fontSize: 12, fontWeight: 950, zIndex: 2,
    boxShadow: active ? `0 4px 10px ${color}55` : "none",
  }),
  tlLabel: (active) => ({
    fontSize: 10, fontWeight: 800,
    color: active ? "#14532d" : "#94a3b8",
    marginTop: 4, textAlign: "center", lineHeight: 1.2,
  }),
  tlConnector: (active, color) => ({
    position: "absolute", top: 12, height: 2,
    width: "100%", left: "50%",
    background: active ? color : "#cbd5e1",
    zIndex: 1,
  }),

  progressOuter: { width: "100%", height: 14, background: "#f0fdf4", borderRadius: 999, overflow: "hidden", border: "1px solid #bbf7d0", marginTop: 6 },
  progressInner: (pct) => ({
    width: `${Math.max(0, Math.min(100, pct))}%`,
    height: "100%",
    background: "linear-gradient(90deg, #22c55e, #16a34a)",
    transition: "width 0.4s ease",
    display: "flex", alignItems: "center", justifyContent: "flex-end",
    paddingInlineEnd: 6, color: "#fff", fontSize: 9, fontWeight: 900,
  }),

  detailBlock: { marginTop: 10, paddingTop: 10, borderTop: "1px dashed #bbf7d0" },
  miniTitle: { fontSize: 12, fontWeight: 900, color: "#14532d", marginBottom: 4 },
  miniText: { fontSize: 13, color: "#1f2937", whiteSpace: "pre-wrap", lineHeight: 1.5 },

  empty: { textAlign: "center", padding: 60, color: "#64748b", fontWeight: 700 },

  btn: (kind) => {
    const map = {
      primary:   { bg: "linear-gradient(180deg, #22c55e, #16a34a)", color: "#fff", border: "#15803d" },
      secondary: { bg: "#fff", color: "#14532d", border: "#bbf7d0" },
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

const TIMELINE_STEPS = [
  { key: "Suggested",  field: "suggestionDate" },
  { key: "Approved",   field: "decisionDate", requireDecision: "Approve" },
  { key: "Started",    field: "startDate" },
  { key: "Completed",  field: "actualEndDate" },
  { key: "Effective",  field: "evaluationDate", requireEffective: "Yes" },
];

function isStepActive(step, p) {
  if (step.requireDecision && p.decision !== step.requireDecision) return false;
  if (step.requireEffective && p.effective !== step.requireEffective) return false;
  return !!p[step.field];
}

export default function ContinualImprovementView() {
  const navigate = useNavigate();
  const { t, lang, toggle, dir } = useHaccpLang();
  const isAr = lang === "ar";

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [openId, setOpenId] = useState(null);
  const [statusFilter, setStatusFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [sourceFilter, setSourceFilter] = useState("all");

  async function load() {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/reports?type=${encodeURIComponent(TYPE)}`, { cache: "no-store" });
      const json = await res.json().catch(() => null);
      const arr = Array.isArray(json) ? json : json?.data || json?.items || [];
      arr.sort((a, b) => new Date(b?.payload?.suggestionDate || 0) - new Date(a?.payload?.suggestionDate || 0));
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
    let approved = 0, inProgress = 0, completed = 0, effective = 0;
    for (const rec of items) {
      const p = rec?.payload || {};
      if (p.decision === "Approve") approved++;
      if (p.status === "InProgress") inProgress++;
      if (p.status === "Completed") completed++;
      if (p.effective === "Yes") effective++;
    }
    return { total, approved, inProgress, completed, effective };
  }, [items]);

  const filtered = useMemo(() => {
    return items.filter((rec) => {
      const p = rec?.payload || {};
      if (statusFilter !== "all" && (p.status || "Idea") !== statusFilter) return false;
      if (categoryFilter !== "all" && p.category !== categoryFilter) return false;
      if (sourceFilter !== "all" && p.source !== sourceFilter) return false;
      return true;
    });
  }, [items, statusFilter, categoryFilter, sourceFilter]);

  return (
    <main style={{ ...S.shell, direction: dir }}>
      <div style={S.layout}>
        <div style={S.topbar}>
          <div>
            <div style={S.title}>{t("ciListTitle")}</div>
            <div style={S.subtitle}>{t("ciSubtitle")}</div>
            <HaccpLinkBadge clauses={["10.2"]} label={isAr ? "التحسين المستمر" : "Continual Improvement"} />
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <HaccpLangToggle lang={lang} toggle={toggle} />
            <button style={S.btn("secondary")} onClick={load} disabled={loading}>{loading ? "⏳" : t("refresh")}</button>
            <button style={S.btn("primary")} onClick={() => navigate("/haccp-iso/continual-improvement")}>{t("new")}</button>
            <button style={S.btn("secondary")} onClick={() => navigate("/haccp-iso")}>{t("backToHub")}</button>
          </div>
        </div>

        {/* KPIs */}
        <div style={S.kpiGrid}>
          <div style={S.kpi("#14532d")}>
            <div style={S.kpiVal("#14532d")}>{stats.total}</div>
            <div style={S.kpiLabel}>{t("ciKpiTotal")}</div>
          </div>
          <div style={S.kpi("#16a34a")}>
            <div style={S.kpiVal("#16a34a")}>{stats.approved}</div>
            <div style={S.kpiLabel}>{t("ciKpiApproved")}</div>
          </div>
          <div style={S.kpi("#d97706")}>
            <div style={S.kpiVal("#d97706")}>{stats.inProgress}</div>
            <div style={S.kpiLabel}>{t("ciKpiInProgress")}</div>
          </div>
          <div style={S.kpi("#0891b2")}>
            <div style={S.kpiVal("#0891b2")}>{stats.completed}</div>
            <div style={S.kpiLabel}>{t("ciKpiCompleted")}</div>
          </div>
          <div style={S.kpi("#7c3aed")}>
            <div style={S.kpiVal("#7c3aed")}>{stats.effective}</div>
            <div style={S.kpiLabel}>{t("ciKpiEffective")}</div>
          </div>
        </div>

        {/* Filters */}
        <div style={S.toolbar}>
          <select style={S.select} value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="all">{t("ciFilterAllStatuses")}</option>
            {Object.keys(STATUS_COLOR).map((k) => (
              <option key={k} value={k}>{t(`ciStatus${k}`)}</option>
            ))}
          </select>
          <select style={S.select} value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}>
            <option value="all">{t("ciFilterAllCategories")}</option>
            {Object.keys(CATEGORY_COLOR).map((k) => (
              <option key={k} value={k}>{t(`ciCategory${k}`)}</option>
            ))}
          </select>
          <select style={S.select} value={sourceFilter} onChange={(e) => setSourceFilter(e.target.value)}>
            <option value="all">{t("ciFilterAllSources")}</option>
            <option value="MRM">{t("ciSourceMRM")}</option>
            <option value="Audit">{t("ciSourceAudit")}</option>
            <option value="Complaint">{t("ciSourceComplaint")}</option>
            <option value="Employee">{t("ciSourceEmployee")}</option>
            <option value="Incident">{t("ciSourceIncident")}</option>
            <option value="Regulatory">{t("ciSourceRegulatory")}</option>
            <option value="Benchmark">{t("ciSourceBenchmark")}</option>
            <option value="Other">{t("ciSourceOther")}</option>
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
          const st = STATUS_COLOR[p.status || "Idea"] || STATUS_COLOR.Idea;
          const pr = PRIORITY_COLOR[p.priority] || PRIORITY_COLOR.Medium;
          const cat = CATEGORY_COLOR[p.category] || "#64748b";
          const eff = EFFECTIVE_COLOR[p.effective] || EFFECTIVE_COLOR.Pending;
          const progress = p.progress || 0;

          return (
            <div key={rec.id} style={S.card}>
              <div style={S.rowHead}>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div style={{ fontSize: 16, fontWeight: 950, color: "#14532d" }}>
                    🌱 {p.initiativeTitle || "—"}
                  </div>
                  <div style={S.meta}>
                    📅 {p.suggestionDate || "—"} • 👤 {p.proposedBy || "—"}
                    {p.owner && <> • 🚀 {p.owner}</>}
                  </div>
                  <div style={{ marginTop: 6, display: "flex", gap: 6, flexWrap: "wrap" }}>
                    <span style={S.badge({ bg: `${cat}22`, color: cat })}>
                      {t(`ciCategory${p.category || "FoodSafety"}`)}
                    </span>
                    <span style={S.badge({ bg: "#e0e7ff", color: "#3730a3" })}>
                      {t(`ciSource${p.source || "Employee"}`).split(" ").slice(1).join(" ") || t(`ciSource${p.source || "Employee"}`)}
                    </span>
                    <span style={S.badge(pr)}>
                      {t(`ciPriority${p.priority === "Medium" ? "Med" : p.priority || "Med"}`)}
                    </span>
                    <span style={S.badge(st)}>
                      {t(`ciStatus${p.status || "Idea"}`)}
                    </span>
                    {p.effective && p.effective !== "Pending" && (
                      <span style={S.badge(eff)}>
                        {t(`ciEffective${p.effective}`).split(" ")[0]}
                      </span>
                    )}
                  </div>

                  {/* Progress bar */}
                  {progress > 0 && p.status !== "Idea" && (
                    <div style={{ marginTop: 8 }}>
                      <div style={S.progressOuter}>
                        <div style={S.progressInner(progress)}>{progress}%</div>
                      </div>
                    </div>
                  )}
                </div>
                <div style={{ display: "flex", gap: 6 }}>
                  <button style={S.btn("secondary")} onClick={() => setOpenId(isOpen ? null : rec.id)}>
                    {isOpen ? t("collapse") : t("expand")}
                  </button>
                  <button style={S.btn("secondary")} onClick={() => navigate(`/haccp-iso/continual-improvement?edit=${rec.id}`)}>
                    {t("edit")}
                  </button>
                  <button style={S.btn("danger")} onClick={() => del(rec.id)}>{t("del")}</button>
                </div>
              </div>

              {/* Timeline (always visible) */}
              <div style={S.timeline}>
                {TIMELINE_STEPS.map((step, i) => {
                  const active = isStepActive(step, p);
                  const isLast = i === TIMELINE_STEPS.length - 1;
                  const nextActive = !isLast && isStepActive(TIMELINE_STEPS[i + 1], p);
                  return (
                    <div key={step.key} style={S.tlStep(active, "#16a34a")}>
                      {!isLast && <div style={S.tlConnector(active && nextActive, "#16a34a")} />}
                      <div style={S.tlDot(active, "#16a34a")}>
                        {active ? "✓" : i + 1}
                      </div>
                      <div style={S.tlLabel(active)}>
                        {t(`ciTimeline${step.key}`)}
                      </div>
                      <div style={{ fontSize: 9, color: "#94a3b8", fontWeight: 700, marginTop: 1 }}>
                        {p[step.field] || "—"}
                      </div>
                    </div>
                  );
                })}
              </div>

              {isOpen && (
                <div style={S.detailBlock}>
                  {p.description && (
                    <div style={{ marginBottom: 10 }}>
                      <div style={S.miniTitle}>{t("ciDescription")}</div>
                      <div style={S.miniText}>{p.description}</div>
                    </div>
                  )}

                  {(p.expectedBenefit || p.expectedCost) && (
                    <div style={{ display: "flex", gap: 16, marginBottom: 10, flexWrap: "wrap" }}>
                      {p.expectedBenefit && (
                        <div>
                          <div style={S.miniTitle}>{t("ciExpectedBenefit")}</div>
                          <div style={S.miniText}>{p.expectedBenefit}</div>
                        </div>
                      )}
                      {p.expectedCost && (
                        <div>
                          <div style={S.miniTitle}>{t("ciExpectedCost")}</div>
                          <div style={S.miniText}>{parseFloat(p.expectedCost).toLocaleString()} AED</div>
                        </div>
                      )}
                    </div>
                  )}

                  {p.decision && p.decision !== "Pending" && (
                    <div style={{ marginBottom: 10 }}>
                      <div style={S.miniTitle}>{t("ciDecision")}</div>
                      <div style={S.miniText}>
                        {t(`ciDecision${p.decision}`)}
                        {p.decisionDate && ` • ${p.decisionDate}`}
                        {p.decisionBy && ` • ${p.decisionBy}`}
                      </div>
                      {p.rejectionReason && <div style={S.miniText}>{p.rejectionReason}</div>}
                    </div>
                  )}

                  {p.implementationNotes && (
                    <div style={{ marginBottom: 10 }}>
                      <div style={S.miniTitle}>{t("ciImplementationNotes")}</div>
                      <div style={S.miniText}>{p.implementationNotes}</div>
                    </div>
                  )}

                  {p.resourcesUsed && (
                    <div style={{ marginBottom: 10 }}>
                      <div style={S.miniTitle}>{t("ciResourcesUsed")}</div>
                      <div style={S.miniText}>{p.resourcesUsed}</div>
                    </div>
                  )}

                  {p.actualResult && (
                    <div style={{ marginBottom: 10 }}>
                      <div style={S.miniTitle}>{t("ciActualResult")}</div>
                      <div style={S.miniText}>{p.actualResult}</div>
                    </div>
                  )}

                  {p.lessonsLearned && (
                    <div style={{ marginBottom: 10 }}>
                      <div style={S.miniTitle}>{t("ciLessonsLearned")}</div>
                      <div style={S.miniText}>{p.lessonsLearned}</div>
                    </div>
                  )}

                  {p.evaluatedBy && (
                    <div style={S.meta}>
                      ✓ {t("ciEvaluatedBy")}: {p.evaluatedBy}
                      {p.evaluationDate && ` • ${p.evaluationDate}`}
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
