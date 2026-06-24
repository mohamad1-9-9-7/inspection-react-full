// src/pages/haccp and iso/HaccpIsoMenu.jsx
import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import mawashiLogo from "../../assets/almawashi-logo.jpg";
import FloatingSettingsButton from "../../components/FloatingSettingsButton";
import { isItemAllowed } from "../../utils/sectionItems";

/**
 * Main hub for ISO 22000 & HACCP
 * Parent file to connect all system pages later
 */

const sections = [
  // 📕 HACCP Manual — Master Reference Document (always first)
  {
    id: "haccp-manual",
    title: "📕 HACCP Manual (Master Document)",
    subtitle: "Hazard analysis, CCPs, HACCP plan, product descriptions & full FSMS clauses",
    route: "/haccp-iso/haccp-manual",
    highlight: true,
  },

  // 📜 Food Safety Policy (ISO 5.2) — Top-level controlled document
  {
    id: "food-safety-policy",
    title: "📜 Food Safety Policy",
    subtitle: "ISO 5.2 — Controlled policy + employee acknowledgment evidence + print for posting",
    route: "/haccp-iso/food-safety-policy",
  },

  // 🎯 FSMS Risk Register (ISO 6.1) — Strategic + operational risks
  {
    id: "risk-register",
    title: "🎯 FSMS Risk Register",
    subtitle: "ISO 6.1 — 20 strategic + 15 operational risks (FSMS-RA-01): regulatory, supply chain, cyber, halal, receiving, cutting, cold storage, transport.",
    route: "/haccp-iso/risk-register/view",
  },

  // 💡 FSMS Opportunity Register (ISO 6.1) — companion to Risk
  {
    id: "opportunity-register",
    title: "💡 FSMS Opportunity Register",
    subtitle: "ISO 6.1 — Actions to address opportunities (companion to Risk). 18 pre-loaded from FSMS-RA-01: 7 external + 11 internal factors.",
    route: "/haccp-iso/opportunity-register/view",
  },

  // 🔄 FSMS Change Management Log (ISO 6.3) — Planning of Changes
  {
    id: "change-management",
    title: "🔄 Change Management Log",
    subtitle: "ISO 6.3 — Planning of Changes. 6-step procedure + 9 actual TELT changes from 2025 (relocations, suppliers, calibration, IT).",
    route: "/haccp-iso/change-management/view",
  },

  // 📊 HACCP / FSMS Linkage Dashboard
  {
    id: "haccp-dashboard",
    title: "📊 HACCP Linkage Dashboard",
    subtitle: "Live KPIs: CCP records, mock recalls, suppliers, audits, calibration & MRM status",
    route: "/haccp-iso/haccp-dashboard",
  },

  {
    id: "product-details",
    title: "Product Details & Specifications",
    subtitle: "Product specs, labels, shelf life, allergens & claims",
    route: "/haccp-iso/product-details",
  },

  {
    id: "licenses-contracts",
    title: "Licenses & Contracts",
    subtitle: "Company licenses, permits, contracts & expiry tracking",
    route: "/haccp-iso/licenses-contracts",
  },

  {
    id: "dm-inspection",
    title: "Dubai Municipality Inspection",
    subtitle: "DM inspection checklists, findings, photos & corrective actions",
    route: "/haccp-iso/dm-inspection",
  },

  {
    id: "supplier-evaluation",
    title: "Supplier Evaluation",
    subtitle: "Approved suppliers, evaluation scores, renewals & performance tracking",
    route: "/haccp-iso/supplier-evaluation",
  },

  // ✅ SOP & sSOP
  {
    id: "sop-ssop",
    title: "SOP & sSOP",
    subtitle: "Standard Operating Procedures & Sanitation SOPs — documents, versions & records",
    route: "/haccp-iso/sop-ssop",
  },

  // 📚 Document Master Register (ISO 7.5)
  {
    id: "document-register",
    title: "📚 Document Master Register",
    subtitle: "Central register of all controlled documents — versions, owners, review dates & retention",
    route: "/haccp-iso/document-register/view",
  },

  {
    id: "legal-register",
    title: "Legal Register",
    subtitle: "Live statutory, regulatory, ISO and customer requirements register with ownership, review dates and compliance evidence",
    route: "/haccp-iso/legal-register/view",
  },

  {
    id: "external-documents",
    title: "Master List of External Documents",
    subtitle: "Controlled list of external standards, regulations, customer specifications and authority references",
    route: "/haccp-iso/external-documents/view",
  },

  // 🪟 Glass & Brittle Plastic Register (Policy 2 + ISO 8.2 PRP)
  {
    id: "glass-register",
    title: "🪟 Glass & Brittle Plastic Register",
    subtitle: "Company-wide inventory of glass & brittle plastic items — risk, protection & inspection tracking",
    route: "/haccp-iso/glass-register/view",
  },

  // 🔄 Mock Recall / Traceability Drill
  {
    id: "mock-recall",
    title: "Mock Recall / Traceability Drill",
    subtitle: "Quarterly traceability drills — backward + forward trace, KPI & audit-ready logs",
    route: "/haccp-iso/mock-recall/view",
  },

  // 🚨 Real Product Recall (ISO 8.9.5)
  {
    id: "real-recall",
    title: "🚨 Real Product Recall",
    subtitle: "ISO 8.9.5 — Actual recall events with Class I/II/III, authority notification & cost tracking",
    route: "/haccp-iso/real-recall/view",
  },

  // 🎯 CCP Monitoring
  {
    id: "ccp-monitoring",
    title: "🎯 CCP Monitoring Log",
    subtitle: "Critical Control Points monitoring — readings, deviations, corrective actions",
    route: "/haccp-iso/ccp-monitoring/view",
  },

  // 🎯 FSMS Objectives (ISO 6.2)
  {
    id: "objectives",
    title: "🎯 FSMS Objectives",
    subtitle: "SMART objectives tracking — targets, live progress, owners & review status",
    route: "/haccp-iso/objectives/view",
  },

  // 📞 Customer Complaints (ISO 7.4 + 9.1.2)
  {
    id: "customer-complaints",
    title: "📞 Customer Complaints",
    subtitle: "Complaint logging, root cause (5-Whys), CAPA & bi-yearly trend analysis",
    route: "/haccp-iso/customer-complaints/view",
  },

  // 📢 FSMS Communication Matrix / Log (ISO 7.4)
  {
    id: "communication-log",
    title: "📢 FSMS Communication Matrix / Log",
    subtitle: "ISO 7.4 — internal & external communication matrix, 13 mandatory topics, follow-up and linkage records",
    route: "/haccp-iso/communication-log/view",
  },

  // 🌱 Continual Improvement Log (ISO 10.2)
  {
    id: "continual-improvement",
    title: "🌱 Continual Improvement Log",
    subtitle: "ISO 10.2 — Initiative tracking from idea → approval → implementation → effectiveness",
    route: "/haccp-iso/continual-improvement/view",
  },

  // 📋 Management Review Meeting
  {
    id: "mrm",
    title: "📋 Management Review Meeting (MRM)",
    subtitle: "MRM sessions — inputs, decisions, outputs, action items & sign-off",
    route: "/haccp-iso/mrm/view",
  },

  // 🔍 Internal Audit
  {
    id: "internal-audit",
    title: "🔍 Internal Audit",
    subtitle: "Audit plans, checklists, findings, NCs, CARs & verification",
    route: "/haccp-iso/internal-audit/view",
  },

  // 🌡️ Calibration Log
  {
    id: "calibration",
    title: "🌡️ Calibration Log",
    subtitle: "Equipment calibration records, due dates, alerts & traceability",
    route: "/haccp-iso/calibration/view",
  },

  // 🌡 Internal Calibration (daily/weekly in-house verification)
  {
    id: "internal-calibration",
    title: "🌡 Internal Calibration Log",
    subtitle: "Daily/weekly probe verification (ice-point, boiling, master-probe) — covers ALL branches incl. kitchen, food trucks & all POSes",
    route: "/haccp-iso/internal-calibration/view",
  },
];

// Simple icon
function IconFolder() {
  return (
    <svg aria-hidden="true" width="30" height="30" viewBox="0 0 24 24" style={{ display: "block" }}>
      <path
        d="M3 6.75A1.75 1.75 0 0 1 4.75 5h4.086a1.75 1.75 0 0 1 1.237.513l1.414 1.414A1.75 1.75 0 0 0 12.724 7H19.25A1.75 1.75 0 0 1 21 8.75v8.5A1.75 1.75 0 0 1 19.25 19H4.75A1.75 1.75 0 0 1 3 17.25v-10.5Z"
        fill="currentColor"
        opacity="0.14"
      />
      <path
        d="M4.75 5h4.086a1.75 1.75 0 0 1 1.237.513l1.414 1.414A1.75 1.75 0 0 0 12.724 7H19.25A1.75 1.75 0 0 1 21 8.75v8.5A1.75 1.75 0 0 1 19.25 19H4.75A1.75 1.75 0 0 1 3 17.25v-10.5A1.75 1.75 0 0 1 4.75 5Z"
        stroke="currentColor"
        strokeWidth="1.6"
        fill="none"
      />
    </svg>
  );
}

/* ===== Styles (Green + Cyan/Blue bright) ===== */
const shellStyle = {
  minHeight: "100vh",
  padding: "28px 18px",
  background:
    "radial-gradient(circle at 12% 10%, rgba(34,211,238,0.22) 0, rgba(255,255,255,1) 42%, rgba(255,255,255,1) 100%)," +
    "radial-gradient(circle at 88% 12%, rgba(34,197,94,0.16) 0, rgba(255,255,255,0) 55%)," +
    "radial-gradient(circle at 50% 100%, rgba(59,130,246,0.16) 0, rgba(255,255,255,0) 58%)",
  fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
  color: "#071b2d",
};

const layoutStyle = {
  maxWidth: "1100px",
  margin: "0 auto",
};

const topBarStyle = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: "14px",
  padding: "14px 16px",
  borderRadius: "18px",
  background: "rgba(255,255,255,0.84)",
  border: "1px solid rgba(15, 23, 42, 0.18)",
  boxShadow: "0 14px 40px rgba(2, 132, 199, 0.12)",
  backdropFilter: "blur(12px)",
  marginBottom: "18px",
  flexWrap: "wrap",
  position: "relative",
  overflow: "hidden",
};

const brandLeftStyle = {
  display: "flex",
  alignItems: "center",
  gap: "12px",
  minWidth: 0,
};

const logoStyle = {
  width: "46px",
  height: "46px",
  borderRadius: "12px",
  objectFit: "cover",
  border: "1px solid rgba(2, 132, 199, 0.18)",
  boxShadow: "0 8px 22px rgba(2, 132, 199, 0.14)",
  background: "#fff",
};

const companyNameStyle = {
  fontSize: "14px",
  fontWeight: 950,
  letterSpacing: "0.01em",
  margin: 0,
  lineHeight: 1.2,
};

const companySubStyle = {
  fontSize: "12px",
  fontWeight: 750,
  opacity: 0.78,
  marginTop: "4px",
};

const badgeStyle = {
  display: "inline-flex",
  alignItems: "center",
  gap: "8px",
  padding: "9px 12px",
  borderRadius: "999px",
  fontSize: "12px",
  fontWeight: 900,
  color: "#052336",
  background: "linear-gradient(135deg, rgba(34,211,238,0.20), rgba(34,197,94,0.14))",
  border: "1px solid rgba(34,211,238,0.38)",
  whiteSpace: "nowrap",
  boxShadow: "0 10px 22px rgba(34,211,238,0.14)",
};

const headerStyle = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-end",
  gap: "16px",
  margin: "14px 0 18px",
  flexWrap: "wrap",
};

const titleStyle = {
  fontSize: "26px",
  fontWeight: 980,
  letterSpacing: "0.02em",
};

const subtitleStyle = {
  fontSize: "13px",
  fontWeight: 750,
  opacity: 0.82,
  marginTop: "6px",
};

const taglineStyle = {
  fontSize: "14px",
  fontWeight: 750,
  color: "#334155",
  maxWidth: "520px",
  margin: 0,
};

const gridStyle = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
  gap: "14px",
};

const cardBaseStyle = {
  position: "relative",
  display: "flex",
  gap: "12px",
  padding: "16px 18px",
  borderRadius: "18px",
  background: "rgba(255,255,255,0.92)",
  border: "1px solid rgba(15, 23, 42, 0.16)",
  cursor: "pointer",
  textAlign: "left",
  transition: "transform .18s ease, box-shadow .18s ease, border-color .18s ease, background .18s ease",
  boxShadow: "0 12px 30px rgba(2, 132, 199, 0.10)",
  overflow: "hidden",
};

const iconWrapStyle = {
  width: "46px",
  height: "46px",
  borderRadius: "999px",
  background: "linear-gradient(135deg, rgba(34,211,238,0.18), rgba(34,197,94,0.12))",
  color: "#0369a1",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  flexShrink: 0,
  border: "1px solid rgba(34,211,238,0.34)",
  boxShadow: "0 10px 20px rgba(34,211,238,0.14)",
};

const cardBodyStyle = {
  flex: 1,
  minWidth: 0,
};

const cardTitleStyle = {
  fontSize: "15px",
  fontWeight: 950,
  marginBottom: "4px",
  color: "#071b2d",
};

const cardSubStyle = {
  fontSize: "13px",
  color: "#334155",
  lineHeight: 1.45,
};

const cardFooterStyle = {
  fontSize: "11px",
  fontWeight: 950,
  color: "#64748b",
  marginTop: "10px",
  textTransform: "uppercase",
  letterSpacing: "0.10em",
};

const arrowStyle = {
  position: "absolute",
  right: "16px",
  top: "50%",
  transform: "translateY(-50%)",
  opacity: 0.6,
};

function LegacyHaccpIsoMenu() {
  const navigate = useNavigate();
  const [hoverId, setHoverId] = useState(null);

  const cardStyle = useMemo(() => {
    return (isHover, highlight) => ({
      ...cardBaseStyle,
      transform: isHover ? "translateY(-3px)" : "translateY(0)",
      background: highlight
        ? (isHover
            ? "linear-gradient(180deg, rgba(255,255,255,0.98), rgba(255,247,237,0.85))"
            : "linear-gradient(180deg, rgba(255,255,255,0.96), rgba(255,251,235,0.7))")
        : (isHover
            ? "linear-gradient(180deg, rgba(255,255,255,0.96), rgba(236,254,255,0.72))"
            : cardBaseStyle.background),
      boxShadow: highlight
        ? (isHover ? "0 22px 54px rgba(245,158,11,0.28)" : "0 14px 32px rgba(245,158,11,0.18)")
        : (isHover ? "0 18px 46px rgba(34,211,238,0.18)" : cardBaseStyle.boxShadow),
      borderColor: highlight
        ? "rgba(245,158,11,0.55)"
        : (isHover ? "rgba(34,211,238,0.52)" : "rgba(15, 23, 42, 0.16)"),
      borderWidth: highlight ? 2 : 1,
    });
  }, []);

  const handleOpen = (item) => {
    if (!item.route) return;
    navigate(item.route);
  };

  return (
    <main style={shellStyle}>
      <FloatingSettingsButton />
      <div style={layoutStyle}>
        {/* Top bar */}
        <div style={topBarStyle}>
          {/* Decorative glow line */}
          <div
            style={{
              position: "absolute",
              inset: 0,
              pointerEvents: "none",
              background:
                "radial-gradient(800px 220px at 15% 0%, rgba(34,211,238,0.18), transparent 60%)," +
                "radial-gradient(800px 220px at 85% 10%, rgba(34,197,94,0.14), transparent 60%)",
              opacity: 0.9,
            }}
          />

          <div style={brandLeftStyle}>
            <img src={mawashiLogo} alt="Al Mawashi Logo" style={logoStyle} />
            <div style={{ minWidth: 0, position: "relative" }}>
              <div style={companyNameStyle}>TRANS EMIRATES LIVESTOCK TRADING L.L.C.</div>
              <div style={companySubStyle}>AL MAWASHI — Food Safety System</div>
            </div>
          </div>

          <div style={{ ...badgeStyle, position: "relative" }}>
            ✅ ISO 22000 & HACCP <span style={{ opacity: 0.7, fontWeight: 950 }}>Hub</span>
          </div>
        </div>

        {/* Page header */}
        <header style={headerStyle}>
          <div>
            <div style={titleStyle}>ISO 22000 & HACCP Hub</div>
            <div style={subtitleStyle}>Central access to plans, forms, records and product documents.</div>
          </div>
          <p style={taglineStyle}>Bright green + cyan theme — same system behavior. Pick a section to open its page.</p>
        </header>

        {/* Cards — filtered by per-user ISO permissions */}
        <section aria-label="ISO & HACCP sections">
          <div style={gridStyle}>
            {sections.filter(item => item.id === "product-details"
              ? isItemAllowed("iso", "product-details.entry") || isItemAllowed("iso", "product-details.view")
              : isItemAllowed("iso", item.id)
            ).map((item) => {
              const isHover = hoverId === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  style={cardStyle(isHover, item.highlight)}
                  onClick={() => handleOpen(item)}
                  onMouseEnter={() => setHoverId(item.id)}
                  onMouseLeave={() => setHoverId(null)}
                  title={item.title}
                >
                  {/* subtle corner glow */}
                  <div
                    aria-hidden="true"
                    style={{
                      position: "absolute",
                      inset: 0,
                      pointerEvents: "none",
                      background:
                        "radial-gradient(260px 180px at 0% 0%, rgba(34,211,238,0.14), transparent 60%)," +
                        "radial-gradient(240px 160px at 100% 100%, rgba(34,197,94,0.12), transparent 55%)",
                      opacity: isHover ? 1 : 0.7,
                      transition: "opacity .18s ease",
                    }}
                  />

                  <div
                    style={{
                      ...iconWrapStyle,
                      position: "relative",
                      ...(item.highlight && {
                        background: "linear-gradient(135deg, rgba(245,158,11,0.22), rgba(217,119,6,0.16))",
                        color: "#9a3412",
                        border: "1px solid rgba(245,158,11,0.45)",
                        boxShadow: "0 10px 22px rgba(245,158,11,0.18)",
                      }),
                    }}
                  >
                    <IconFolder />
                  </div>

                  <div style={{ ...cardBodyStyle, position: "relative" }}>
                    <div style={cardTitleStyle}>{item.title}</div>
                    <div style={cardSubStyle}>{item.subtitle}</div>
                    <div
                      style={{
                        ...cardFooterStyle,
                        ...(item.highlight && { color: "#b45309" }),
                      }}
                    >
                      {item.highlight ? "🏆 Master Document" : "Open section"}
                    </div>
                  </div>

                  <svg
                    style={{ ...arrowStyle, position: "absolute" }}
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <path d="M9 18l6-6-6-6" />
                  </svg>
                </button>
              );
            })}
          </div>
        </section>

        {/* Footer */}
        <div
          style={{
            marginTop: 18,
            fontSize: 12,
            color: "#64748b",
            fontWeight: 800,
            textAlign: "center",
            opacity: 0.95,
          }}
        >
          © Al Mawashi — Quality & Food Safety System
        </div>
      </div>
    </main>
  );
}

const categoryFilters = [
  { id: "all", label: "All" },
  { id: "governance", label: "Governance" },
  { id: "operations", label: "Operations" },
  { id: "records", label: "Records" },
  { id: "performance", label: "Performance" },
];

const categoryById = {
  "haccp-manual": "governance",
  "food-safety-policy": "governance",
  "risk-register": "governance",
  "opportunity-register": "governance",
  "change-management": "governance",
  "haccp-dashboard": "performance",
  "product-details": "operations",
  "licenses-contracts": "governance",
  "dm-inspection": "records",
  "supplier-evaluation": "operations",
  "sop-ssop": "operations",
  "document-register": "governance",
  "legal-register": "governance",
  "external-documents": "governance",
  "glass-register": "operations",
  "mock-recall": "records",
  "real-recall": "records",
  "ccp-monitoring": "operations",
  objectives: "performance",
  "customer-complaints": "records",
  "communication-log": "records",
  "continual-improvement": "performance",
  mrm: "performance",
  "internal-audit": "records",
  calibration: "operations",
  "internal-calibration": "operations",
};

const categoryLabel = {
  governance: "Governance",
  operations: "Operations",
  records: "Records",
  performance: "Performance",
};

const modern = {
  shell: {
    minHeight: "100vh",
    padding: "24px clamp(18px, 3vw, 48px) 48px",
    background: "linear-gradient(180deg, #f8fafc 0%, #eef7f4 44%, #f8fafc 100%)",
    fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    color: "#0f172a",
  },
  layout: {
    width: "min(1760px, 100%)",
    margin: "0 auto",
  },
  hero: {
    position: "relative",
    overflow: "hidden",
    borderRadius: 8,
    padding: "28px clamp(22px, 4vw, 56px)",
    background: "linear-gradient(135deg, rgba(15,23,42,0.96), rgba(15,118,110,0.94) 52%, rgba(8,145,178,0.92))",
    color: "#fff",
    border: "1px solid rgba(255,255,255,0.20)",
    boxShadow: "0 24px 64px rgba(15,23,42,0.22)",
  },
  heroInner: {
    position: "relative",
    display: "grid",
    gridTemplateColumns: "minmax(0, 1fr) auto",
    alignItems: "center",
    gap: 24,
  },
  brand: {
    display: "flex",
    alignItems: "center",
    gap: 16,
    minWidth: 0,
  },
  logo: {
    width: 76,
    height: 76,
    borderRadius: 8,
    objectFit: "cover",
    border: "1px solid rgba(255,255,255,0.34)",
    background: "#fff",
    boxShadow: "0 16px 30px rgba(0,0,0,0.25)",
    flexShrink: 0,
  },
  eyebrow: {
    margin: 0,
    fontWeight: 900,
    color: "rgba(255,255,255,0.78)",
    letterSpacing: "0.08em",
    textTransform: "uppercase",
  },
  title: {
    margin: "8px 0 0",
    fontWeight: 1000,
    lineHeight: 1.05,
    letterSpacing: 0,
  },
  subtitle: {
    margin: "12px 0 0",
    maxWidth: 980,
    color: "rgba(255,255,255,0.82)",
    lineHeight: 1.45,
    fontWeight: 700,
  },
  heroStats: {
    display: "grid",
    gridTemplateColumns: "repeat(2, minmax(150px, 1fr))",
    gap: 12,
    minWidth: 340,
  },
  stat: {
    borderRadius: 8,
    padding: "16px 18px",
    background: "rgba(255,255,255,0.12)",
    border: "1px solid rgba(255,255,255,0.22)",
    backdropFilter: "blur(12px)",
  },
  statValue: {
    fontWeight: 1000,
    lineHeight: 1,
  },
  statLabel: {
    marginTop: 8,
    color: "rgba(255,255,255,0.76)",
    fontWeight: 800,
  },
  toolbar: {
    margin: "22px 0",
    display: "grid",
    gridTemplateColumns: "minmax(280px, 1fr) auto",
    gap: 14,
    alignItems: "center",
  },
  searchWrap: {
    display: "flex",
    alignItems: "center",
    gap: 12,
    padding: "12px 16px",
    borderRadius: 8,
    background: "#fff",
    border: "1px solid rgba(15,23,42,0.13)",
    boxShadow: "0 12px 28px rgba(15,23,42,0.08)",
  },
  searchInput: {
    width: "100%",
    minWidth: 0,
    border: "none",
    outline: "none",
    background: "transparent",
    color: "#0f172a",
    fontWeight: 800,
    fontFamily: "inherit",
  },
  filters: {
    display: "flex",
    flexWrap: "wrap",
    justifyContent: "flex-end",
    gap: 10,
  },
  filterButton: (active) => ({
    minHeight: 52,
    padding: "10px 18px",
    borderRadius: 8,
    border: active ? "1px solid #0f766e" : "1px solid rgba(15,23,42,0.14)",
    background: active ? "#0f766e" : "#fff",
    color: active ? "#fff" : "#334155",
    fontWeight: 950,
    cursor: "pointer",
    boxShadow: active ? "0 14px 28px rgba(15,118,110,0.22)" : "0 10px 20px rgba(15,23,42,0.07)",
  }),
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 390px), 1fr))",
    gap: 18,
  },
  card: (isHover, highlight) => ({
    position: "relative",
    minHeight: 220,
    display: "grid",
    gridTemplateRows: "auto 1fr auto",
    gap: 18,
    padding: "24px 24px 22px",
    borderRadius: 8,
    border: highlight ? "2px solid rgba(245,158,11,0.56)" : isHover ? "1px solid rgba(15,118,110,0.48)" : "1px solid rgba(15,23,42,0.12)",
    background: highlight ? "linear-gradient(180deg, #fff7ed 0%, #ffffff 100%)" : "#ffffff",
    color: "#0f172a",
    cursor: "pointer",
    textAlign: "left",
    boxShadow: isHover ? "0 24px 52px rgba(15,23,42,0.16)" : "0 12px 30px rgba(15,23,42,0.08)",
    transform: isHover ? "translateY(-3px)" : "translateY(0)",
    transition: "transform .16s ease, box-shadow .16s ease, border-color .16s ease",
    overflow: "hidden",
    fontFamily: "inherit",
  }),
  cardTop: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 14,
  },
  iconWrap: (highlight) => ({
    width: 58,
    height: 58,
    borderRadius: 8,
    display: "grid",
    placeItems: "center",
    color: highlight ? "#b45309" : "#0f766e",
    background: highlight ? "#ffedd5" : "#ccfbf1",
    border: highlight ? "1px solid #fed7aa" : "1px solid #99f6e4",
    flexShrink: 0,
  }),
  pill: (highlight) => ({
    padding: "7px 12px",
    borderRadius: 999,
    background: highlight ? "#ffedd5" : "#f1f5f9",
    color: highlight ? "#9a3412" : "#475569",
    fontWeight: 900,
    whiteSpace: "nowrap",
  }),
  cardTitle: {
    margin: 0,
    lineHeight: 1.22,
    fontWeight: 1000,
    color: "#0f172a",
  },
  cardSub: {
    marginTop: 10,
    lineHeight: 1.5,
    fontWeight: 700,
    color: "#475569",
  },
  cardBottom: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 14,
    paddingTop: 16,
    borderTop: "1px solid rgba(15,23,42,0.09)",
    fontWeight: 950,
    color: "#0f766e",
  },
  empty: {
    padding: 28,
    borderRadius: 8,
    background: "#fff",
    border: "1px solid rgba(15,23,42,0.12)",
    color: "#64748b",
    fontWeight: 800,
    textAlign: "center",
  },
  footer: {
    marginTop: 26,
    textAlign: "center",
    color: "#64748b",
    fontWeight: 800,
  },
};

export default function HaccpIsoMenu() {
  const navigate = useNavigate();
  const [hoverId, setHoverId] = useState(null);
  const [query, setQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState("all");

  const allowedSections = useMemo(
    () => sections.filter((item) =>
      item.id === "product-details"
        ? isItemAllowed("iso", "product-details.entry") || isItemAllowed("iso", "product-details.view")
        : isItemAllowed("iso", item.id)
    ),
    []
  );

  const filteredSections = useMemo(() => {
    const q = query.trim().toLowerCase();
    return allowedSections.filter((item) => {
      const category = categoryById[item.id] || "records";
      const matchesCategory = activeCategory === "all" || category === activeCategory;
      const text = `${item.title} ${item.subtitle}`.toLowerCase();
      return matchesCategory && (!q || text.includes(q));
    });
  }, [activeCategory, allowedSections, query]);

  const handleOpen = (item) => {
    if (item.route) navigate(item.route);
  };

  return (
    <main style={modern.shell}>
      <FloatingSettingsButton />
      <style>{`
        @media (max-width: 980px) {
          .haccp-hero-inner,
          .haccp-toolbar {
            grid-template-columns: 1fr !important;
          }
          .haccp-hero-stats,
          .haccp-filters {
            min-width: 0 !important;
            justify-content: flex-start !important;
          }
        }
      `}</style>

      <div style={modern.layout}>
        <section style={modern.hero}>
          <div
            aria-hidden="true"
            style={{
              position: "absolute",
              inset: 0,
              background:
                "radial-gradient(820px 260px at 12% 0%, rgba(45,212,191,0.28), transparent 62%)," +
                "radial-gradient(760px 300px at 90% 20%, rgba(125,211,252,0.22), transparent 60%)",
            }}
          />

          <div className="haccp-hero-inner" style={modern.heroInner}>
            <div style={modern.brand}>
              <img src={mawashiLogo} alt="Al Mawashi Logo" style={modern.logo} />
              <div style={{ minWidth: 0 }}>
                <p style={modern.eyebrow}>TRANS EMIRATES LIVESTOCK TRADING L.L.C.</p>
                <h1 style={modern.title}>ISO 22000 & HACCP Command Center</h1>
                <p style={modern.subtitle}>
                  A clean operational hub for food safety documents, records, inspections, product files, and performance tracking.
                </p>
              </div>
            </div>

            <div className="haccp-hero-stats" style={modern.heroStats}>
              <div style={modern.stat}>
                <div style={modern.statValue}>{allowedSections.length}</div>
                <div style={modern.statLabel}>Modules</div>
              </div>
              <div style={modern.stat}>
                <div style={modern.statValue}>ISO</div>
                <div style={modern.statLabel}>22000 / HACCP</div>
              </div>
            </div>
          </div>
        </section>

        <section className="haccp-toolbar" style={modern.toolbar}>
          <label style={modern.searchWrap}>
            <span aria-hidden="true">Search</span>
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Find a module..."
              style={modern.searchInput}
            />
          </label>

          <div className="haccp-filters" style={modern.filters}>
            {categoryFilters.map((filter) => (
              <button
                key={filter.id}
                type="button"
                onClick={() => setActiveCategory(filter.id)}
                style={modern.filterButton(activeCategory === filter.id)}
              >
                {filter.label}
              </button>
            ))}
          </div>
        </section>

        <section aria-label="ISO & HACCP sections">
          {filteredSections.length ? (
            <div style={modern.grid}>
              {filteredSections.map((item) => {
                const isHover = hoverId === item.id;
                const category = categoryById[item.id] || "records";

                return (
                  <button
                    key={item.id}
                    type="button"
                    style={modern.card(isHover, item.highlight)}
                    onClick={() => handleOpen(item)}
                    onMouseEnter={() => setHoverId(item.id)}
                    onMouseLeave={() => setHoverId(null)}
                    onFocus={() => setHoverId(item.id)}
                    onBlur={() => setHoverId(null)}
                    title={item.title}
                  >
                    <div style={modern.cardTop}>
                      <div style={modern.iconWrap(item.highlight)}>
                        <IconFolder />
                      </div>
                      <span style={modern.pill(item.highlight)}>
                        {item.highlight ? "Master" : categoryLabel[category]}
                      </span>
                    </div>

                    <div>
                      <h2 style={modern.cardTitle}>{item.title}</h2>
                      <div style={modern.cardSub}>{item.subtitle}</div>
                    </div>

                    <div style={modern.cardBottom}>
                      <span>Open module</span>
                      <span aria-hidden="true">→</span>
                    </div>
                  </button>
                );
              })}
            </div>
          ) : (
            <div style={modern.empty}>No matching HACCP / ISO modules found.</div>
          )}
        </section>

        <div style={modern.footer}>© Al Mawashi — Quality & Food Safety System</div>
      </div>
    </main>
  );
}
