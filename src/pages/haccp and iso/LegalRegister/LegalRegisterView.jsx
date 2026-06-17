import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import API_BASE from "../../../config/api";
import HaccpLinkBadge from "../FSMSManual/HaccpLinkBadge";

const TYPE = "legal_register";

const STATUS = {
  Compliant: { color: "#16a34a", bg: "#dcfce7" },
  "Action Needed": { color: "#dc2626", bg: "#fee2e2" },
  "Under Review": { color: "#d97706", bg: "#fef3c7" },
  "Not Applicable": { color: "#64748b", bg: "#f1f5f9" },
};

const S = {
  shell: {
    minHeight: "100vh",
    padding: "24px clamp(18px, 3vw, 48px) 48px",
    background: "linear-gradient(180deg, #f8fafc 0%, #eef7f4 44%, #f8fafc 100%)",
    color: "#0f172a",
    fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
  },
  layout: { width: "min(1760px, 100%)", margin: "0 auto" },
  hero: {
    position: "relative",
    overflow: "hidden",
    display: "grid",
    gridTemplateColumns: "minmax(0, 1fr) auto",
    gap: 24,
    alignItems: "center",
    minHeight: 220,
    padding: "30px clamp(22px, 4vw, 56px)",
    borderRadius: 8,
    background: "linear-gradient(135deg, rgba(15,23,42,0.96), rgba(15,118,110,0.94) 52%, rgba(8,145,178,0.92))",
    color: "#fff",
    border: "1px solid rgba(255,255,255,0.20)",
    boxShadow: "0 24px 64px rgba(15,23,42,0.22)",
    marginBottom: 18,
  },
  eyebrow: { color: "rgba(255,255,255,0.78)", fontWeight: 950, letterSpacing: ".08em", textTransform: "uppercase" },
  title: { color: "#fff", fontWeight: 1000, lineHeight: 1.05, marginTop: 14 },
  subtitle: { color: "rgba(255,255,255,0.78)", fontWeight: 800, lineHeight: 1.45, marginTop: 12, maxWidth: 920 },
  heroStats: { display: "grid", gridTemplateColumns: "repeat(2, minmax(150px, 1fr))", gap: 12, minWidth: "min(430px, 42vw)" },
  heroStat: {
    minHeight: 116,
    padding: 18,
    borderRadius: 8,
    background: "rgba(255,255,255,0.13)",
    border: "1px solid rgba(255,255,255,0.22)",
    backdropFilter: "blur(12px)",
  },
  heroStatLabel: { display: "block", color: "rgba(255,255,255,0.76)", fontWeight: 900, textTransform: "uppercase", letterSpacing: ".08em" },
  heroStatVal: { display: "block", marginTop: 14, color: "#fff", fontWeight: 1000, lineHeight: ".95" },
  toolbar: { display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap", marginBottom: 16 },
  actions: { display: "flex", gap: 10, flexWrap: "wrap" },
  btn: (kind = "secondary") => {
    const styles = {
      primary: { background: "#0f766e", color: "#fff", border: "#0f766e" },
      secondary: { background: "#fff", color: "#334155", border: "rgba(15,23,42,0.14)" },
      danger: { background: "#dc2626", color: "#fff", border: "#dc2626" },
    };
    const c = styles[kind] || styles.secondary;
    return {
      minHeight: 52,
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      gap: 8,
      padding: "10px 18px",
      borderRadius: 8,
      border: `1px solid ${c.border}`,
      background: c.background,
      color: c.color,
      fontWeight: 950,
      cursor: "pointer",
      fontFamily: "inherit",
      boxShadow: kind === "primary" ? "0 14px 28px rgba(15,118,110,0.22)" : "0 10px 20px rgba(15,23,42,0.07)",
    };
  },
  filters: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
    gap: 12,
    marginBottom: 18,
  },
  input: {
    width: "100%",
    minHeight: 54,
    padding: "10px 14px",
    borderRadius: 8,
    border: "1px solid rgba(15,23,42,0.16)",
    background: "#fff",
    color: "#0f172a",
    fontWeight: 850,
    fontFamily: "inherit",
    outline: "none",
  },
  grid: { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(430px, 1fr))", gap: 16 },
  card: {
    position: "relative",
    overflow: "hidden",
    background: "#fff",
    border: "1px solid rgba(15,23,42,0.12)",
    borderRadius: 8,
    boxShadow: "0 12px 30px rgba(15,23,42,0.08)",
    padding: 22,
  },
  cardAccent: (color) => ({
    position: "absolute",
    inset: "0 auto 0 0",
    width: 6,
    background: `linear-gradient(180deg, ${color}, #0891b2)`,
  }),
  cardHead: { display: "flex", justifyContent: "space-between", gap: 12, alignItems: "flex-start", marginLeft: 4 },
  cardTitle: { color: "#0f172a", fontWeight: 1000, lineHeight: 1.15 },
  meta: { color: "#64748b", fontWeight: 850, lineHeight: 1.35, marginTop: 8 },
  badge: (info) => ({
    display: "inline-flex",
    alignItems: "center",
    minHeight: 34,
    padding: "5px 12px",
    borderRadius: 8,
    background: info.bg,
    color: info.color,
    fontWeight: 950,
    whiteSpace: "nowrap",
  }),
  detail: { marginTop: 16, paddingTop: 14, borderTop: "1px dashed rgba(15,23,42,0.16)" },
  label: { color: "#0f766e", fontWeight: 1000, marginBottom: 5 },
  text: { color: "#1e293b", fontWeight: 760, lineHeight: 1.5, whiteSpace: "pre-wrap" },
  miniGrid: { display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 12, marginTop: 14 },
  empty: {
    minHeight: 220,
    display: "grid",
    placeItems: "center",
    background: "#fff",
    border: "1px dashed rgba(15,23,42,0.22)",
    borderRadius: 8,
    color: "#64748b",
    fontWeight: 850,
    textAlign: "center",
    padding: 28,
  },
};

function norm(value) {
  return String(value || "").toLowerCase();
}

function isOverdue(date) {
  if (!date) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return new Date(date) < today;
}

export default function LegalRegisterView() {
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("all");
  const [category, setCategory] = useState("all");

  async function load() {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/reports?type=${encodeURIComponent(TYPE)}`, { cache: "no-store" });
      const json = await res.json().catch(() => null);
      const arr = Array.isArray(json) ? json : json?.data || json?.items || [];
      arr.sort((a, b) => new Date(a?.payload?.nextReviewDate || "2999-12-31") - new Date(b?.payload?.nextReviewDate || "2999-12-31"));
      setItems(arr);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  async function del(id) {
    if (!window.confirm("Delete this legal requirement?")) return;
    try {
      await fetch(`${API_BASE}/api/reports/${encodeURIComponent(id)}`, { method: "DELETE" });
      load();
    } catch (error) {
      alert(`Delete failed: ${error?.message || error}`);
    }
  }

  const categories = useMemo(() => {
    return Array.from(new Set(items.map((rec) => rec?.payload?.category).filter(Boolean))).sort();
  }, [items]);

  const stats = useMemo(() => {
    const total = items.length;
    const action = items.filter((rec) => rec?.payload?.status === "Action Needed").length;
    const review = items.filter((rec) => rec?.payload?.status === "Under Review").length;
    const overdue = items.filter((rec) => isOverdue(rec?.payload?.nextReviewDate)).length;
    return { total, action, review, overdue };
  }, [items]);

  const filtered = useMemo(() => {
    const q = norm(query);
    return items.filter((rec) => {
      const p = rec?.payload || {};
      const haystack = [
        p.requirementTitle,
        p.sourceAuthority,
        p.referenceNumber,
        p.category,
        p.applicableArea,
        p.requirementSummary,
        p.responsibleOwner,
        p.complianceEvidence,
      ].map(norm).join(" ");
      return (!q || haystack.includes(q))
        && (status === "all" || p.status === status)
        && (category === "all" || p.category === category);
    });
  }, [items, query, status, category]);

  return (
    <main style={S.shell}>
      <style>{`
        input::placeholder {
          color: #94a3b8;
          font-style: italic;
          font-weight: 700;
        }
        @media (max-width: 920px) {
          .legal-view-hero {
            grid-template-columns: 1fr !important;
          }
          .legal-view-stats {
            min-width: 0 !important;
          }
        }
      `}</style>
      <div style={S.layout}>
        <section className="legal-view-hero" style={S.hero}>
          <div>
            <div style={S.eyebrow}>ISO 22000 Compliance Control</div>
            <div style={S.title}>Legal Register</div>
            <div style={S.subtitle}>
              Live register of statutory, regulatory, standard, customer, and internal compliance requirements with evidence and review ownership.
            </div>
          </div>
          <div className="legal-view-stats" style={S.heroStats}>
            <div style={S.heroStat}>
              <span style={S.heroStatLabel}>Requirements</span>
              <strong style={S.heroStatVal}>{stats.total}</strong>
            </div>
            <div style={S.heroStat}>
              <span style={S.heroStatLabel}>Needs Attention</span>
              <strong style={S.heroStatVal}>{stats.action + stats.review + stats.overdue}</strong>
            </div>
          </div>
        </section>

        <div style={S.toolbar}>
          <HaccpLinkBadge clauses={["4.2", "8.5.1", "9.1"]} label="Legal & Regulatory Requirements" />
          <div style={S.actions}>
            <button style={S.btn("primary")} onClick={() => navigate("/haccp-iso/legal-register")}>Add Requirement</button>
            <button style={S.btn("secondary")} onClick={() => navigate("/haccp-iso")}>Back to HACCP / ISO</button>
          </div>
        </div>

        <section style={S.filters}>
          <input style={S.input} value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search by authority, clause, area, evidence, owner..." />
          <select style={S.input} value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="all">All statuses</option>
            {Object.keys(STATUS).map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
          <select style={S.input} value={category} onChange={(e) => setCategory(e.target.value)}>
            <option value="all">All categories</option>
            {categories.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </section>

        {loading ? (
          <div style={S.empty}>Loading legal register...</div>
        ) : filtered.length === 0 ? (
          <div style={S.empty}>
            No legal requirements found. Add the first requirement to start the live compliance register.
          </div>
        ) : (
          <section style={S.grid}>
            {filtered.map((rec) => {
              const p = rec?.payload || {};
              const info = STATUS[p.status] || STATUS["Under Review"];
              const overdue = isOverdue(p.nextReviewDate);
              const cardInfo = overdue ? STATUS["Action Needed"] : info;
              return (
                <article key={rec.id || rec._id} style={S.card}>
                  <div style={S.cardAccent(cardInfo.color)} />
                  <div style={S.cardHead}>
                    <div>
                      <div style={S.cardTitle}>{p.requirementTitle || "Untitled requirement"}</div>
                      <div style={S.meta}>{p.sourceAuthority || "No authority"} {p.referenceNumber ? `- ${p.referenceNumber}` : ""}</div>
                      <div style={S.meta}>{p.category || "Uncategorized"} / {p.applicableArea || "All areas"}</div>
                    </div>
                    <span style={S.badge(cardInfo)}>{overdue ? "Review Overdue" : (p.status || "Under Review")}</span>
                  </div>

                  <div style={S.detail}>
                    <div style={S.label}>Requirement Summary</div>
                    <div style={S.text}>{p.requirementSummary || "No summary recorded."}</div>
                  </div>

                  <div style={S.miniGrid}>
                    <div>
                      <div style={S.label}>Owner</div>
                      <div style={S.text}>{p.responsibleOwner || "-"}</div>
                    </div>
                    <div>
                      <div style={S.label}>Next Review</div>
                      <div style={S.text}>{p.nextReviewDate || "-"}</div>
                    </div>
                    <div>
                      <div style={S.label}>Evidence</div>
                      <div style={S.text}>{p.complianceEvidence || "-"}</div>
                    </div>
                    <div>
                      <div style={S.label}>Evidence Location</div>
                      <div style={S.text}>{p.evidenceLocation || "-"}</div>
                    </div>
                  </div>

                  {p.actionRequired && (
                    <div style={S.detail}>
                      <div style={S.label}>Action Required</div>
                      <div style={S.text}>{p.actionRequired}</div>
                    </div>
                  )}

                  <div style={{ ...S.actions, marginTop: 18 }}>
                    <button style={S.btn("secondary")} onClick={() => navigate(`/haccp-iso/legal-register?edit=${encodeURIComponent(rec.id || rec._id)}`)}>Edit</button>
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
