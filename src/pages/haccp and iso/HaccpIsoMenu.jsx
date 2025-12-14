// src/pages/haccp and iso/HaccpIsoMenu.jsx
import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import mawashiLogo from "../../assets/almawashi-logo.jpg";

/**
 * قائمة رئيسية لكل ما يخص ISO 22000 & HACCP
 * هذا الملف هو "الملف الأم" الذي سنربط منه لاحقًا جميع شاشات النظام
 */

const sections = [
  {
    id: "product-details",
    title: "Product Details & Specifications",
    subtitle: "Product specs, labels, shelf life, allergens & claims",
    route: "/haccp-iso/product-details",
  },

  // ✅ NEW CARD
  {
    id: "licenses-contracts",
    title: "Licenses & Contracts",
    subtitle: "Company licenses, permits, contracts & expiry tracking",
    route: "/haccp-iso/licenses-contracts",
  },
];

// أيقونة بسيطة
function IconFolder() {
  return (
    <svg
      aria-hidden="true"
      width="30"
      height="30"
      viewBox="0 0 24 24"
      style={{ display: "block" }}
    >
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

/* ===== Styles ===== */
const shellStyle = {
  minHeight: "100vh",
  padding: "28px 18px",
  background:
    "radial-gradient(circle at 12% 6%, rgba(99,102,241,0.15) 0, rgba(249,250,251,1) 38%, rgba(255,255,255,1) 100%)," +
    "radial-gradient(circle at 88% 18%, rgba(16,185,129,0.10) 0, rgba(255,255,255,0) 52%)," +
    "radial-gradient(circle at 50% 100%, rgba(59,130,246,0.10) 0, rgba(255,255,255,0) 55%)",
  fontFamily:
    'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
  color: "#0b1f4d",
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
  background: "rgba(255,255,255,0.82)",
  border: "1px solid rgba(30, 41, 59, 0.22)",
  boxShadow: "0 10px 30px rgba(15, 23, 42, 0.08)",
  backdropFilter: "blur(10px)",
  marginBottom: "18px",
  flexWrap: "wrap",
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
  border: "1px solid rgba(15, 23, 42, 0.14)",
  boxShadow: "0 6px 18px rgba(15, 23, 42, 0.10)",
  background: "#fff",
};

const companyNameStyle = {
  fontSize: "14px",
  fontWeight: 900,
  letterSpacing: "0.01em",
  margin: 0,
  lineHeight: 1.2,
};

const companySubStyle = {
  fontSize: "12px",
  fontWeight: 700,
  opacity: 0.75,
  marginTop: "4px",
};

const badgeStyle = {
  display: "inline-flex",
  alignItems: "center",
  gap: "8px",
  padding: "8px 10px",
  borderRadius: "999px",
  fontSize: "12px",
  fontWeight: 800,
  color: "#1f2a56",
  background: "rgba(99,102,241,0.10)",
  border: "1px solid rgba(99,102,241,0.32)",
  whiteSpace: "nowrap",
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
  fontWeight: 950,
  letterSpacing: "0.02em",
};

const subtitleStyle = {
  fontSize: "13px",
  fontWeight: 700,
  opacity: 0.8,
  marginTop: "6px",
};

const taglineStyle = {
  fontSize: "14px",
  fontWeight: 700,
  color: "#4b5563",
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
  background: "rgba(255,255,255,0.93)",
  border: "1px solid rgba(30, 41, 59, 0.20)",
  cursor: "pointer",
  textAlign: "left",
  transition: "transform .18s ease, box-shadow .18s ease, border-color .18s ease",
  boxShadow: "0 10px 26px rgba(15, 23, 42, 0.08)",
};

const iconWrapStyle = {
  width: "46px",
  height: "46px",
  borderRadius: "999px",
  background: "rgba(99,102,241,0.12)",
  color: "#4f46e5",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  flexShrink: 0,
  border: "1px solid rgba(99,102,241,0.30)",
};

const cardBodyStyle = {
  flex: 1,
  minWidth: 0,
};

const cardTitleStyle = {
  fontSize: "15px",
  fontWeight: 900,
  marginBottom: "4px",
  color: "#0b1f4d",
};

const cardSubStyle = {
  fontSize: "13px",
  color: "#4b5563",
  lineHeight: 1.45,
};

const cardFooterStyle = {
  fontSize: "11px",
  fontWeight: 900,
  color: "#6b7280",
  marginTop: "10px",
  textTransform: "uppercase",
  letterSpacing: "0.10em",
};

const arrowStyle = {
  position: "absolute",
  right: "16px",
  top: "50%",
  transform: "translateY(-50%)",
  opacity: 0.55,
};

export default function HaccpIsoMenu() {
  const navigate = useNavigate();
  const [hoverId, setHoverId] = useState(null);

  const cardStyle = useMemo(() => {
    return (isHover) => ({
      ...cardBaseStyle,
      transform: isHover ? "translateY(-2px)" : "translateY(0)",
      boxShadow: isHover
        ? "0 16px 38px rgba(15, 23, 42, 0.12)"
        : cardBaseStyle.boxShadow,
      borderColor: isHover ? "rgba(99,102,241,0.42)" : "rgba(30, 41, 59, 0.20)",
    });
  }, []);

  const handleOpen = (item) => {
    if (!item.route) return;
    navigate(item.route);
  };

  return (
    <main style={shellStyle}>
      <div style={layoutStyle}>
        {/* Top bar (logo + company name) */}
        <div style={topBarStyle}>
          <div style={brandLeftStyle}>
            <img src={mawashiLogo} alt="Al Mawashi Logo" style={logoStyle} />
            <div style={{ minWidth: 0 }}>
              <div style={companyNameStyle}>
                TRANS EMIRATES LIVESTOCK TRADING L.L.C.
              </div>
              <div style={companySubStyle}>AL MAWASHI — Food Safety System</div>
            </div>
          </div>

          <div style={badgeStyle}>
            ✅ ISO 22000 & HACCP
            <span style={{ opacity: 0.7, fontWeight: 900 }}>Hub</span>
          </div>
        </div>

        {/* Page header */}
        <header style={headerStyle}>
          <div>
            <div style={titleStyle}>ISO 22000 & HACCP Hub</div>
            <div style={subtitleStyle}>
              Central access to plans, forms, records and product documents.
            </div>
          </div>
          <p style={taglineStyle}>
            Lightweight, clean look — same system behavior. Pick a section to
            open its page.
          </p>
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
                  <div style={iconWrapStyle}>
                    <IconFolder />
                  </div>

                  <div style={cardBodyStyle}>
                    <div style={cardTitleStyle}>{item.title}</div>
                    <div style={cardSubStyle}>{item.subtitle}</div>
                    <div style={cardFooterStyle}>Open section</div>
                  </div>

                  <svg
                    style={arrowStyle}
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

        {/* Footer small note */}
        <div
          style={{
            marginTop: 18,
            fontSize: 12,
            color: "#6b7280",
            fontWeight: 700,
            textAlign: "center",
            opacity: 0.9,
          }}
        >
          © Al Mawashi — Quality & Food Safety System
        </div>
      </div>
    </main>
  );
}
