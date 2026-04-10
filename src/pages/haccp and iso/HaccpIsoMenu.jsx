// src/pages/haccp and iso/HaccpIsoMenu.jsx
import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import mawashiLogo from "../../assets/almawashi-logo.jpg";

/**
 * Main hub for ISO 22000 & HACCP
 * Parent file to connect all system pages later
 */

const sections = [
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

export default function HaccpIsoMenu() {
  const navigate = useNavigate();
  const [hoverId, setHoverId] = useState(null);

  const cardStyle = useMemo(() => {
    return (isHover) => ({
      ...cardBaseStyle,
      transform: isHover ? "translateY(-3px)" : "translateY(0)",
      background: isHover
        ? "linear-gradient(180deg, rgba(255,255,255,0.96), rgba(236,254,255,0.72))"
        : cardBaseStyle.background,
      boxShadow: isHover ? "0 18px 46px rgba(34,211,238,0.18)" : cardBaseStyle.boxShadow,
      borderColor: isHover ? "rgba(34,211,238,0.52)" : "rgba(15, 23, 42, 0.16)",
    });
  }, []);

  const handleOpen = (item) => {
    if (!item.route) return;
    navigate(item.route);
  };

  return (
    <main style={shellStyle}>
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

        {/* Cards */}
        <section aria-label="ISO & HACCP sections">
          <div style={gridStyle}>
            {sections.map((item) => {
              const isHover = hoverId === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  style={cardStyle(isHover)}
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

                  <div style={{ ...iconWrapStyle, position: "relative" }}>
                    <IconFolder />
                  </div>

                  <div style={{ ...cardBodyStyle, position: "relative" }}>
                    <div style={cardTitleStyle}>{item.title}</div>
                    <div style={cardSubStyle}>{item.subtitle}</div>
                    <div style={cardFooterStyle}>Open section</div>
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