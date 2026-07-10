// src/pages/haccp and iso/EmergencyPreparedness/EmergencyPreparednessView.jsx
// Emergency Preparedness & Response — Test / Drill Log (ISO 22000:2018 §8.4)
import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import API_BASE from "../../../config/api";
import HaccpLinkBadge from "../FSMSManual/HaccpLinkBadge";

const TYPE = "emergency_preparedness_test";

const RESULT = {
  Pass: { color: "#16a34a", bg: "#dcfce7" },
  "Pass with Observations": { color: "#d97706", bg: "#fef3c7" },
  Fail: { color: "#dc2626", bg: "#fee2e2" },
  Planned: { color: "#64748b", bg: "#f1f5f9" },
};

const S = {
  shell: { minHeight: "100vh", padding: "24px clamp(18px, 3vw, 48px) 48px", background: "linear-gradient(180deg, #f8fafc 0%, #eef7f4 44%, #f8fafc 100%)", color: "#0f172a", fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' },
  layout: { width: "min(1760px, 100%)", margin: "0 auto" },
  hero: { position: "relative", overflow: "hidden", display: "grid", gridTemplateColumns: "minmax(0, 1fr) auto", gap: 24, alignItems: "center", minHeight: 220, padding: "30px clamp(22px, 4vw, 56px)", borderRadius: 8, background: "linear-gradient(135deg, rgba(15,23,42,0.96), rgba(180,35,24,0.9) 55%, rgba(217,119,6,0.9))", color: "#fff", border: "1px solid rgba(255,255,255,0.20)", boxShadow: "0 24px 64px rgba(15,23,42,0.22)", marginBottom: 18 },
  eyebrow: { color: "rgba(255,255,255,0.82)", fontWeight: 950, letterSpacing: ".08em", textTransform: "uppercase" },
  title: { color: "#fff", fontWeight: 1000, lineHeight: 1.05, marginTop: 14, fontSize: 30 },
  subtitle: { color: "rgba(255,255,255,0.82)", fontWeight: 800, lineHeight: 1.45, marginTop: 12, maxWidth: 920 },
  heroStats: { display: "grid", gridTemplateColumns: "repeat(2, minmax(150px, 1fr))", gap: 12, minWidth: "min(430px, 42vw)" },
  heroStat: { minHeight: 116, padding: 18, borderRadius: 8, background: "rgba(255,255,255,0.13)", border: "1px solid rgba(255,255,255,0.22)", backdropFilter: "blur(12px)" },
  heroStatLabel: { display: "block", color: "rgba(255,255,255,0.82)", fontWeight: 900, textTransform: "uppercase", letterSpacing: ".08em", fontSize: 12 },
  heroStatVal: { display: "block", marginTop: 14, color: "#fff", fontWeight: 1000, lineHeight: ".95", fontSize: 34 },
  toolbar: { display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap", marginBottom: 16 },
  actions: { display: "flex", gap: 10, flexWrap: "wrap" },
  btn: (kind = "secondary") => {
    const styles = { primary: { background: "#b91c1c", color: "#fff", border: "#b91c1c" }, secondary: { background: "#fff", color: "#334155", border: "rgba(15,23,42,0.14)" }, danger: { background: "#dc2626", color: "#fff", border: "#dc2626" } };
    const c = styles[kind] || styles.secondary;
    return { minHeight: 52, display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 8, padding: "10px 18px", borderRadius: 8, border: `1px solid ${c.border}`, background: c.background, color: c.color, fontWeight: 950, cursor: "pointer", fontFamily: "inherit", boxShadow: kind === "primary" ? "0 14px 28px rgba(185,28,28,0.22)" : "0 10px 20px rgba(15,23,42,0.07)" };
  },
  filters: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 12, marginBottom: 18 },
  input: { width: "100%", minHeight: 54, padding: "10px 14px", borderRadius: 8, border: "1px solid rgba(15,23,42,0.16)", background: "#fff", color: "#0f172a", fontWeight: 850, fontFamily: "inherit", outline: "none" },
  grid: { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(430px, 1fr))", gap: 16 },
  card: { position: "relative", overflow: "hidden", background: "#fff", border: "1px solid rgba(15,23,42,0.12)", borderRadius: 8, boxShadow: "0 12px 30px rgba(15,23,42,0.08)", padding: 22 },
  cardAccent: (color) => ({ position: "absolute", inset: "0 auto 0 0", width: 6, background: `linear-gradient(180deg, ${color}, #d97706)` }),
  cardHead: { display: "flex", justifyContent: "space-between", gap: 12, alignItems: "flex-start", marginLeft: 4 },
  cardTitle: { color: "#0f172a", fontWeight: 1000, lineHeight: 1.15, fontSize: 17 },
  meta: { color: "#64748b", fontWeight: 850, lineHeight: 1.35, marginTop: 8, fontSize: 13 },
  badge: (info) => ({ display: "inline-flex", alignItems: "center", minHeight: 34, padding: "5px 12px", borderRadius: 8, background: info.bg, color: info.color, fontWeight: 950, whiteSpace: "nowrap" }),
  detail: { marginTop: 16, paddingTop: 14, borderTop: "1px dashed rgba(15,23,42,0.16)" },
  label: { color: "#b45309", fontWeight: 1000, marginBottom: 5, fontSize: 12, textTransform: "uppercase", letterSpacing: ".04em" },
  text: { color: "#1e293b", fontWeight: 760, lineHeight: 1.5, whiteSpace: "pre-wrap", fontSize: 14 },
  miniGrid: { display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 12, marginTop: 14 },
  empty: { minHeight: 220, display: "grid", placeItems: "center", background: "#fff", border: "1px dashed rgba(15,23,42,0.22)", borderRadius: 8, color: "#64748b", fontWeight: 850, textAlign: "center", padding: 28 },
};

const norm = (v) => String(v || "").toLowerCase();
function isOverdue(date) { if (!date) return false; const t = new Date(); t.setHours(0, 0, 0, 0); return new Date(date) < t; }

export default function EmergencyPreparednessView() {
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [result, setResult] = useState("all");
  const [scenario, setScenario] = useState("all");

  async function load() {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/reports?type=${encodeURIComponent(TYPE)}`, { cache: "no-store" });
      const json = await res.json().catch(() => null);
      const arr = Array.isArray(json) ? json : json?.data || json?.items || [];
      arr.sort((a, b) => new Date(b?.payload?.testDate || 0) - new Date(a?.payload?.testDate || 0));
      setItems(arr);
    } catch { setItems([]); } finally { setLoading(false); }
  }
  useEffect(() => { load(); }, []);

  async function del(id) {
    if (!window.confirm("Delete this emergency test record?")) return;
    try { await fetch(`${API_BASE}/api/reports/${encodeURIComponent(id)}`, { method: "DELETE" }); load(); }
    catch (e) { alert(`Delete failed: ${e?.message || e}`); }
  }

  const scenarios = useMemo(() => Array.from(new Set(items.map((r) => r?.payload?.scenario).filter(Boolean))).sort(), [items]);
  const stats = useMemo(() => {
    const total = items.length;
    const passed = items.filter((r) => r?.payload?.result === "Pass").length;
    const failed = items.filter((r) => r?.payload?.result === "Fail").length;
    const overdue = items.filter((r) => isOverdue(r?.payload?.nextTestDate)).length;
    return { total, passed, failed, overdue };
  }, [items]);

  const filtered = useMemo(() => {
    const q = norm(query);
    return items.filter((rec) => {
      const p = rec?.payload || {};
      const hay = [p.scenario, p.site, p.participants, p.objective, p.actionsTaken, p.weaknessesFound, p.correctiveActions, p.verifiedBy, p.reference].map(norm).join(" ");
      return (!q || hay.includes(q)) && (result === "all" || p.result === result) && (scenario === "all" || p.scenario === scenario);
    });
  }, [items, query, result, scenario]);

  return (
    <main style={S.shell}>
      <style>{`input::placeholder{color:#94a3b8;font-style:italic;font-weight:700}@media(max-width:920px){.ep-hero{grid-template-columns:1fr!important}.ep-stats{min-width:0!important}}`}</style>
      <div style={S.layout}>
        <section className="ep-hero" style={S.hero}>
          <div>
            <div style={S.eyebrow}>ISO 22000:2018 · Clause 8.4</div>
            <div style={S.title}>🚨 Emergency Preparedness & Response — Test Log</div>
            <div style={S.subtitle}>Records of emergency drills and actual incidents (power / cold-chain failure, contamination, equipment breakdown, pest, flood, fire) — response, result, weaknesses and corrective actions. Evidence that procedures are periodically tested.</div>
          </div>
          <div className="ep-stats" style={S.heroStats}>
            <div style={S.heroStat}><span style={S.heroStatLabel}>Tests / Incidents</span><strong style={S.heroStatVal}>{stats.total}</strong></div>
            <div style={S.heroStat}><span style={S.heroStatLabel}>Needs Attention</span><strong style={S.heroStatVal}>{stats.failed + stats.overdue}</strong></div>
          </div>
        </section>

        <div style={S.toolbar}>
          <HaccpLinkBadge clauses={["8.4", "8.4.2"]} label="Emergency Preparedness & Response" />
          <div style={S.actions}>
            <button style={S.btn("primary")} onClick={() => navigate("/haccp-iso/emergency-preparedness")}>Add Test / Incident</button>
            <button style={S.btn("secondary")} onClick={() => navigate("/haccp-iso")}>Back to HACCP / ISO</button>
          </div>
        </div>

        <section style={S.filters}>
          <input style={S.input} value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search scenario, site, participants, corrective action..." />
          <select style={S.input} value={result} onChange={(e) => setResult(e.target.value)}>
            <option value="all">All results</option>
            {Object.keys(RESULT).map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
          <select style={S.input} value={scenario} onChange={(e) => setScenario(e.target.value)}>
            <option value="all">All scenarios</option>
            {scenarios.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </section>

        {loading ? (
          <div style={S.empty}>Loading emergency test log...</div>
        ) : filtered.length === 0 ? (
          <div style={S.empty}>No emergency tests recorded yet. Add the first drill or incident to build the §8.4 evidence trail.</div>
        ) : (
          <section style={S.grid}>
            {filtered.map((rec) => {
              const p = rec?.payload || {};
              const info = RESULT[p.result] || RESULT.Planned;
              const overdue = isOverdue(p.nextTestDate);
              const cardInfo = overdue && p.result !== "Fail" ? RESULT["Pass with Observations"] : info;
              return (
                <article key={rec.id || rec._id} style={S.card}>
                  <div style={S.cardAccent(cardInfo.color)} />
                  <div style={S.cardHead}>
                    <div>
                      <div style={S.cardTitle}>{p.scenario || "Emergency test"}</div>
                      <div style={S.meta}>{p.reference ? `${p.reference} · ` : ""}{p.testType || "Drill"} · {p.testDate || "-"}</div>
                      <div style={S.meta}>{p.site || "All sites"}{p.responseTime ? ` · Response: ${p.responseTime}` : ""}</div>
                    </div>
                    <span style={S.badge(cardInfo)}>{overdue && p.result !== "Fail" ? "Retest Due" : (p.result || "Planned")}</span>
                  </div>

                  {p.objective && (
                    <div style={S.detail}><div style={S.label}>Objective</div><div style={S.text}>{p.objective}</div></div>
                  )}
                  {p.actionsTaken && (
                    <div style={S.detail}><div style={S.label}>Response Actions</div><div style={S.text}>{p.actionsTaken}</div></div>
                  )}

                  <div style={S.miniGrid}>
                    <div><div style={S.label}>Participants</div><div style={S.text}>{p.participants || "-"}</div></div>
                    <div><div style={S.label}>Verified By</div><div style={S.text}>{p.verifiedBy || "-"}</div></div>
                    <div><div style={S.label}>Weaknesses Found</div><div style={S.text}>{p.weaknessesFound || "None"}</div></div>
                    <div><div style={S.label}>Next Test Date</div><div style={S.text}>{p.nextTestDate || "-"}</div></div>
                  </div>

                  {p.correctiveActions && (
                    <div style={S.detail}><div style={S.label}>Corrective Actions</div><div style={S.text}>{p.correctiveActions}</div></div>
                  )}

                  <div style={{ ...S.actions, marginTop: 18 }}>
                    <button style={S.btn("secondary")} onClick={() => navigate(`/haccp-iso/emergency-preparedness?edit=${encodeURIComponent(rec.id || rec._id)}`)}>Edit</button>
                    <button style={S.btn("danger")} onClick={() => del(rec.id || rec._id)}>Delete</button>
                  </div>
                </article>
              );
            })}
          </section>
        )}
      </div>
    </main>
  );
}
