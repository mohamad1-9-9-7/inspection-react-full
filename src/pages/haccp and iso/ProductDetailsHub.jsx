import React from "react";
import { useNavigate } from "react-router-dom";
import { isItemAllowed } from "../../utils/sectionItems";

const actions = [
  {
    id: "entry",
    icon: "📝",
    title: "Product Entry",
    subtitle: "Product entry",
    route: "/haccp-iso/product-details/input",
    color: "#0f766e",
    bg: "linear-gradient(135deg, #ccfbf1, #f0fdfa)",
  },
  {
    id: "view",
    icon: "📋",
    title: "View Products",
    subtitle: "Saved products",
    route: "/haccp-iso/product-details/view",
    color: "#2563eb",
    bg: "linear-gradient(135deg, #dbeafe, #eff6ff)",
  },
];

export default function ProductDetailsHub() {
  const navigate = useNavigate();
  const [hovered, setHovered] = React.useState(null);

  const visibleActions = actions.filter((a) =>
    isItemAllowed("iso", `product-details.${a.id}`)
  );

  return (
    <main style={styles.shell} dir="ltr">
      <style>{`
        @media (max-width: 760px) {
          .pd-hub-grid { grid-template-columns: 1fr !important; }
          .pd-hub-title { font-size: 30px !important; }
          .pd-hub-action { min-height: 190px !important; padding: 24px !important; }
        }
      `}</style>

      <header style={styles.header}>
        <button type="button" onClick={() => navigate("/haccp-iso")} style={styles.backButton}>
          Back
        </button>
        <div style={styles.brand}>
          <div style={styles.brandIcon}>📦</div>
          <div>
            <div style={styles.brandTop}>HACCP / ISO 22000</div>
            <div style={styles.brandSub}>Product Details & Specifications</div>
          </div>
        </div>
      </header>

      <section style={styles.hero}>
        <p style={styles.kicker}>Product Details</p>
        <h1 className="pd-hub-title" style={styles.title}>
          Product Details
        </h1>
      </section>

      <section className="pd-hub-grid" style={styles.grid}>
        {visibleActions.map((action) => {
          const isHovered = hovered === action.id;
          return (
            <button
              key={action.id}
              type="button"
              className="pd-hub-action"
              style={styles.action(action, isHovered)}
              onMouseEnter={() => setHovered(action.id)}
              onMouseLeave={() => setHovered(null)}
              onFocus={() => setHovered(action.id)}
              onBlur={() => setHovered(null)}
              onClick={() => navigate(action.route)}
            >
              <span style={styles.actionIcon(action.color)}>{action.icon}</span>
              <span style={styles.actionText}>
                <span style={{ ...styles.actionTitle, color: action.color }}>{action.title}</span>
                <span style={styles.actionSub}>{action.subtitle}</span>
              </span>
            </button>
          );
        })}
      </section>
    </main>
  );
}

const styles = {
  shell: {
    minHeight: "100vh",
    width: "100%",
    padding: "18px clamp(16px, 3vw, 42px) 42px",
    boxSizing: "border-box",
    background:
      "radial-gradient(900px 560px at 10% 8%, rgba(20,184,166,0.20), transparent 58%)," +
      "radial-gradient(820px 540px at 88% 16%, rgba(37,99,235,0.18), transparent 58%)," +
      "linear-gradient(180deg, #f8fafc 0%, #ffffff 100%)",
    color: "#0f172a",
    fontFamily: 'Cairo, ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
    overflowX: "hidden",
  },
  header: {
    minHeight: 68,
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 14,
    flexWrap: "wrap",
  },
  brand: {
    display: "flex",
    alignItems: "center",
    gap: 12,
  },
  brandIcon: {
    width: 48,
    height: 48,
    borderRadius: 16,
    display: "grid",
    placeItems: "center",
    fontSize: 24,
    background: "linear-gradient(135deg, #0f766e, #2563eb)",
    boxShadow: "0 16px 32px rgba(15,118,110,0.25)",
  },
  brandTop: {
    fontSize: 12,
    fontWeight: 1000,
    color: "#334155",
    letterSpacing: "0.08em",
  },
  brandSub: {
    marginTop: 2,
    fontSize: 13,
    fontWeight: 850,
    color: "#64748b",
  },
  backButton: {
    border: "1px solid rgba(15,23,42,0.12)",
    borderRadius: 999,
    background: "rgba(255,255,255,0.84)",
    color: "#0f172a",
    padding: "10px 18px",
    fontSize: 13,
    fontWeight: 900,
    cursor: "pointer",
    boxShadow: "0 12px 26px rgba(2,6,23,0.08)",
  },
  hero: {
    minHeight: "24vh",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    textAlign: "center",
  },
  kicker: {
    margin: 0,
    color: "#0f766e",
    fontSize: 14,
    fontWeight: 1000,
    letterSpacing: "0.12em",
    textTransform: "uppercase",
  },
  title: {
    margin: "10px 0 0",
    fontSize: 46,
    lineHeight: 1.05,
    fontWeight: 1000,
    color: "#0f172a",
    letterSpacing: 0,
  },
  grid: {
    width: "min(1180px, 100%)",
    margin: "0 auto",
    display: "grid",
    gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
    gap: 22,
  },
  action: (action, isHovered) => ({
    minHeight: 260,
    border: `2px solid ${isHovered ? action.color : "rgba(226,232,240,0.95)"}`,
    borderRadius: 8,
    background: action.bg,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    gap: 18,
    padding: 34,
    cursor: "pointer",
    fontFamily: "inherit",
    textAlign: "center",
    color: "#0f172a",
    boxShadow: isHovered
      ? `0 26px 56px ${action.color}33, 0 0 0 5px ${action.color}18`
      : "0 18px 42px rgba(2,6,23,0.10)",
    transform: isHovered ? "translateY(-4px)" : "translateY(0)",
    transition: "transform .18s ease, box-shadow .18s ease, border-color .18s ease",
  }),
  actionIcon: (color) => ({
    width: 92,
    height: 92,
    borderRadius: 8,
    display: "grid",
    placeItems: "center",
    background: "#fff",
    border: `2px solid ${color}30`,
    color,
    fontSize: 46,
    boxShadow: `0 18px 30px ${color}20`,
  }),
  actionText: {
    display: "flex",
    flexDirection: "column",
    gap: 7,
    alignItems: "center",
  },
  actionTitle: {
    fontSize: 24,
    lineHeight: 1.25,
    fontWeight: 1000,
  },
  actionSub: {
    fontSize: 14,
    fontWeight: 850,
    color: "#64748b",
  },
};
