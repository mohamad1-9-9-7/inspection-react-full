// src/pages/haccp and iso/HaccpIsoMenu.jsx
import React from "react";
import { useNavigate } from "react-router-dom";

/**
 * قائمة رئيسية لكل ما يخص ISO 22000 & HACCP
 * هذا الملف هو "الملف الأم" الذي سنربط منه لاحقًا جميع شاشات النظام
 */

const sections = [
  {
    id: "iso-docs",
    title: "ISO 22000:2018 Documents",
    subtitle: "Manual, procedures, forms & records",
    route: "/haccp-iso/iso-documents",
  },
  {
    id: "haccp-plan",
    title: "HACCP Plan & Hazard Analysis",
    subtitle: "Process flow diagrams, hazard analysis, CCPs",
    route: "/haccp-iso/haccp-plan",
  },
  {
    id: "prps",
    title: "PRPs & OPRPs",
    subtitle: "Cleaning, hygiene, maintenance, pest control, etc.",
    route: "/haccp-iso/prps-oprps",
  },
  {
    id: "audits",
    title: "Internal / External Audits",
    subtitle: "Audit reports, NCRs and CAPA follow-up",
    route: "/haccp-iso/audits",
  },
  {
    id: "training",
    title: "Training & Competence",
    subtitle: "Food safety, PIC, OHS 7.2/7.3 & refreshers",
    route: "/haccp-iso/training",
  },
  {
    id: "halal",
    title: "Halal & Certifications",
    subtitle: "Halal manual, scope, HCPs, certificates",
    route: "/haccp-iso/halal",
  },
  // 🆕 Product Details (نفس النمط)
  {
    id: "product-details",
    title: "Product Details & Specifications",
    subtitle: "Product specs, labels, shelf life, allergens & claims",
    route: "/haccp-iso/product-details",
  },
];

// أيقونة بسيطة لتمثيل المستندات / الأنظمة
function IconFolder() {
  return (
    <svg
      aria-hidden="true"
      width="32"
      height="32"
      viewBox="0 0 24 24"
      style={{ display: "block" }}
    >
      <path
        d="M3 6.75A1.75 1.75 0 0 1 4.75 5h4.086a1.75 1.75 0 0 1 1.237.513l1.414 1.414A1.75 1.75 0 0 0 12.724 7H19.25A1.75 1.75 0 0 1 21 8.75v8.5A1.75 1.75 0 0 1 19.25 19H4.75A1.75 1.75 0 0 1 3 17.25v-10.5Z"
        fill="currentColor"
        opacity="0.15"
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

// ==== ستايلات بسيطة كـ objects بدل <style> ==== //
const shellStyle = {
  minHeight: "100vh",
  padding: "24px",
  background:
    "radial-gradient(circle at top left, #eef2ff 0, #f9fafb 42%, #ffffff 100%)",
  fontFamily:
    'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
  color: "#0b1f4d",
};

const layoutStyle = {
  maxWidth: "1200px",
  margin: "0 auto",
};

const headerStyle = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: "16px",
  marginBottom: "24px",
  flexWrap: "wrap",
};

const titleStyle = {
  fontSize: "26px",
  fontWeight: 900,
  letterSpacing: "0.03em",
  textTransform: "uppercase",
};

const subtitleStyle = {
  fontSize: "13px",
  fontWeight: 600,
  opacity: 0.8,
};

const taglineStyle = {
  fontSize: "14px",
  fontWeight: 600,
  color: "#4b5563",
};

const gridStyle = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
  gap: "16px",
};

const cardStyle = {
  position: "relative",
  display: "flex",
  gap: "12px",
  padding: "16px 18px",
  borderRadius: "16px",
  background: "#ffffff",
  boxShadow: "0 10px 30px rgba(15, 23, 42, 0.08)",
  border: "1px solid rgba(148, 163, 184, 0.3)",
  cursor: "pointer",
};

const iconWrapStyle = {
  width: "44px",
  height: "44px",
  borderRadius: "999px",
  background: "#eef2ff",
  color: "#4f46e5",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  flexShrink: 0,
};

const cardBodyStyle = {
  flex: 1,
  minWidth: 0,
};

const cardTitleStyle = {
  fontSize: "15px",
  fontWeight: 800,
  marginBottom: "4px",
};

const cardSubStyle = {
  fontSize: "13px",
  color: "#4b5563",
  lineHeight: 1.4,
};

const cardFooterStyle = {
  fontSize: "11px",
  fontWeight: 700,
  color: "#6b7280",
  marginTop: "8px",
  textTransform: "uppercase",
  letterSpacing: "0.08em",
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

  const handleOpen = (item) => {
    if (!item.route) return;
    navigate(item.route);
  };

  return (
    <main style={shellStyle}>
      <div style={layoutStyle}>
        <header style={headerStyle}>
          <div>
            <div style={titleStyle}>ISO 22000 & HACCP Hub</div>
            <div style={subtitleStyle}>
              Trans Emirates Livestock Trading L.L.C. – Al Mawashi
            </div>
          </div>
          <p style={taglineStyle}>
            Central hub for manuals, plans, audits, training, halal and product
            documents.
          </p>
        </header>

        <section aria-label="ISO & HACCP sections">
          <div style={gridStyle}>
            {sections.map((item) => (
              <button
                key={item.id}
                type="button"
                style={cardStyle}
                onClick={() => handleOpen(item)}
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
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
