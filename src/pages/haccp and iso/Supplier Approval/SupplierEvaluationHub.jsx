// D:\inspection-react-full\src\pages\haccp and iso\Supplier Approval\SupplierEvaluationHub.jsx
import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import mawashiLogo from "../../../assets/almawashi-logo.jpg";

/**
 * Supplier Evaluation — Parent / Hub Page
 * المطلوب: كرتين فقط:
 * 1) إنشاء التقييم + توليد الرابط
 * 2) عرض التقييمات التي تم إرسالها من قبل المورد (Submitted Results)
 */

const sections = [
  {
    id: "create-card",
    title: "Create Evaluation + Generate Link",
    subtitle: "Create a new supplier evaluation and generate a public link",
    route: "/haccp-iso/supplier-evaluation/create",
    badge: "NEW",
  },
  {
    id: "results",
    title: "Submitted Results",
    subtitle: "View evaluations submitted by suppliers (answers + attachments)",
    route: "/haccp-iso/supplier-evaluation/results",
    badge: "VIEW",
  },
];

/* ===== Simple Icon ===== */
function IconDoc() {
  return (
    <svg aria-hidden="true" width="30" height="30" viewBox="0 0 24 24" style={{ display: "block" }}>
      <path
        d="M7 3h7l3 3v15a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1Z"
        fill="currentColor"
        opacity="0.14"
      />
      <path
        d="M7 3h7l3 3v15a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1Z"
        stroke="currentColor"
        strokeWidth="1.6"
        fill="none"
      />
      <path d="M9 10h6M9 14h6M9 18h4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

/* ===== Styles (match your menu vibe) ===== */
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

const layoutStyle = { maxWidth: "1100px", margin: "0 auto" };

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

const brandLeftStyle = { display: "flex", alignItems: "center", gap: "12px", minWidth: 0 };
const logoStyle = {
  width: "46px",
  height: "46px",
  borderRadius: "12px",
  objectFit: "cover",
  border: "1px solid rgba(2, 132, 199, 0.18)",
  boxShadow: "0 8px 22px rgba(2, 132, 199, 0.14)",
  background: "#fff",
};

const companyNameStyle = { fontSize: "14px", fontWeight: 950, letterSpacing: "0.01em", margin: 0, lineHeight: 1.2 };
const companySubStyle = { fontSize: "12px", fontWeight: 750, opacity: 0.78, marginTop: "4px" };

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

const titleStyle = { fontSize: "26px", fontWeight: 980, letterSpacing: "0.02em" };
const subtitleStyle = { fontSize: "13px", fontWeight: 750, opacity: 0.82, marginTop: "6px" };
const taglineStyle = { fontSize: "14px", fontWeight: 750, color: "#334155", maxWidth: "520px", margin: 0 };

const gridStyle = { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "14px" };

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

const cardBodyStyle = { flex: 1, minWidth: 0 };
const cardTitleStyle = { fontSize: "15px", fontWeight: 950, marginBottom: "4px", color: "#071b2d" };
const cardSubStyle = { fontSize: "13px", color: "#334155", lineHeight: 1.45 };
const cardFooterStyle = { fontSize: "11px", fontWeight: 950, color: "#64748b", marginTop: "10px", letterSpacing: "0.10em" };

const smallTag = (tone) => ({
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  padding: "6px 10px",
  borderRadius: 999,
  fontSize: 11,
  fontWeight: 950,
  letterSpacing: "0.08em",
  border: "1px solid rgba(15,23,42,0.14)",
  background: tone === "NEW" ? "rgba(34,197,94,0.12)" : "rgba(148,163,184,0.14)",
  color: tone === "NEW" ? "#14532d" : "#334155",
});

const arrowStyle = {
  position: "absolute",
  right: "16px",
  top: "50%",
  transform: "translateY(-50%)",
  opacity: 0.6,
};

const helpBox = {
  marginTop: 14,
  padding: "14px 16px",
  borderRadius: 18,
  border: "1px solid rgba(15,23,42,0.14)",
  background: "rgba(255,255,255,0.78)",
  boxShadow: "0 10px 24px rgba(2, 132, 199, 0.08)",
};

export default function SupplierEvaluationHub() {
  const navigate = useNavigate();
  const [hoverId, setHoverId] = useState(null);

  const cardStyle = useMemo(() => {
    return (isHover) => ({
      ...cardBaseStyle,
      transform: isHover ? "translateY(-3px)" : "translateY(0)",
      background: isHover ? "linear-gradient(180deg, rgba(255,255,255,0.96), rgba(236,254,255,0.72))" : cardBaseStyle.background,
      boxShadow: isHover ? "0 18px 46px rgba(34,211,238,0.18)" : cardBaseStyle.boxShadow,
      borderColor: isHover ? "rgba(34,211,238,0.52)" : "rgba(15, 23, 42, 0.16)",
    });
  }, []);

  const handleOpen = (item) => item?.route && navigate(item.route);

  return (
    <main style={shellStyle}>
      <div style={layoutStyle}>
        {/* Top bar */}
        <div style={topBarStyle}>
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
              <div style={companySubStyle}>AL MAWASHI — Supplier Evaluation</div>
            </div>
          </div>

          <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
            <div style={badgeStyle}>✅ Supplier Evaluation Hub</div>
            <button
              type="button"
              onClick={() => navigate("/haccp-iso")}
              style={{
                padding: "10px 14px",
                borderRadius: 14,
                border: "1px solid rgba(15,23,42,0.16)",
                background: "rgba(255,255,255,0.92)",
                cursor: "pointer",
                fontWeight: 950,
              }}
            >
              ↩ Back
            </button>
          </div>
        </div>

        {/* Page header */}
        <header style={headerStyle}>
          <div>
            <div style={titleStyle}>Supplier Evaluation</div>
            <div style={subtitleStyle}>Create link for supplier + review submitted results.</div>
          </div>
          <p style={taglineStyle}>
            Flow: Create evaluation → send public link → supplier submits → review under Submitted Results.
          </p>
        </header>

        {/* Cards */}
        <section aria-label="Supplier evaluation sections">
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
                    <IconDoc />
                  </div>

                  <div style={{ ...cardBodyStyle, position: "relative" }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
                      <div style={cardTitleStyle}>{item.title}</div>
                      {!!item.badge && <span style={smallTag(item.badge)}>{item.badge}</span>}
                    </div>
                    <div style={cardSubStyle}>{item.subtitle}</div>
                    <div style={cardFooterStyle}>OPEN</div>
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

        {/* Quick guidance box */}
        <div style={helpBox}>
          <div style={{ fontWeight: 980, fontSize: 14, color: "#071b2d" }}>How it works</div>
          <div style={{ marginTop: 8, color: "#334155", fontWeight: 750, fontSize: 13, lineHeight: 1.6 }}>
            1) Create evaluation and generate a public link. <br />
            2) Supplier opens link, fills answers, uploads attachments, then submits. <br />
            3) Review everything from <b>Submitted Results</b>.
          </div>
        </div>

        {/* Footer */}
        <div style={{ marginTop: 18, fontSize: 12, color: "#64748b", fontWeight: 800, textAlign: "center", opacity: 0.95 }}>
          © Al Mawashi — Quality & Food Safety System
        </div>
      </div>
    </main>
  );
}
