// D:\inspection-react-full\src\pages\haccp and iso\Supplier Approval\SupplierEvaluationHub.jsx
import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import mawashiLogo from "../../../assets/almawashi-logo.jpg";
import "./SupplierApproval.css";
import HaccpLinkBadge from "../FSMSManual/HaccpLinkBadge";

/**
 * Supplier Evaluation — Parent / Hub Page
 * 1) إنشاء التقييم + توليد الرابط
 * 2) تتبّع الروابط المُرسلة (Sent / Submitted / Pending)
 * 3) عرض التقييمات التي تم إرسالها من قبل المورد (Submitted Results)
 */

const API_ROOT_DEFAULT = "https://inspection-server-4nvj.onrender.com";

function normalizeApiRoot(raw) {
  let s = String(raw || "").trim();
  if (!s) return API_ROOT_DEFAULT;
  s = s.replace(/\/+$/, "");
  s = s.replace(/\/api\/reports.*$/i, "");
  s = s.replace(/\/api\/?$/i, "");
  return s || API_ROOT_DEFAULT;
}

const API_BASE = normalizeApiRoot(
  (typeof window !== "undefined" && window.__QCS_API__) ||
    (typeof process !== "undefined" && process.env?.REACT_APP_API_URL) ||
    API_ROOT_DEFAULT
);

const TYPE = "supplier_self_assessment_form";

function isSubmittedRec(rec) {
  const p = rec?.payload || {};
  if (p?.meta?.submitted === true) return true;
  if (p?.public?.submittedAt) return true;
  const ans = p?.answers || {};
  if (typeof ans === "object" && Object.keys(ans).length > 0) {
    return Object.values(ans).some((v) => String(v || "").trim() !== "");
  }
  return false;
}

const sections = [
  {
    id: "create-card",
    title: "Create Evaluation + Generate Link",
    subtitle: "Create a new supplier evaluation and generate a public link",
    route: "/haccp-iso/supplier-evaluation/create",
    badge: "NEW",
  },
  {
    id: "sent-links",
    title: "Sent Links Tracker",
    subtitle: "Track sent links — pending vs. submitted, copy/open links, search & filter",
    route: "/haccp-iso/supplier-evaluation/sent-links",
    badge: "TRACK",
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
  padding: "30px 24px",
  background:
    "radial-gradient(circle at 12% 10%, rgba(34,211,238,0.22) 0, rgba(255,255,255,1) 42%, rgba(255,255,255,1) 100%)," +
    "radial-gradient(circle at 88% 12%, rgba(34,197,94,0.16) 0, rgba(255,255,255,0) 55%)," +
    "radial-gradient(circle at 50% 100%, rgba(59,130,246,0.16) 0, rgba(255,255,255,0) 58%)",
  fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
  color: "#071b2d",
  boxSizing: "border-box",
};

const layoutStyle = { maxWidth: "100%", width: "100%", margin: "0 auto" };

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

const companyNameStyle = { fontSize: "16px", fontWeight: 950, letterSpacing: "0.01em", margin: 0, lineHeight: 1.2 };
const companySubStyle = { fontSize: "14px", fontWeight: 750, opacity: 0.78, marginTop: "4px" };

const badgeStyle = {
  display: "inline-flex",
  alignItems: "center",
  gap: "8px",
  padding: "10px 14px",
  borderRadius: "999px",
  fontSize: "14px",
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

const titleStyle = { fontSize: "30px", fontWeight: 980, letterSpacing: "0.02em" };
const subtitleStyle = { fontSize: "15px", fontWeight: 750, opacity: 0.82, marginTop: "6px" };
const taglineStyle = { fontSize: "16px", fontWeight: 750, color: "#334155", maxWidth: "620px", margin: 0 };

const gridStyle = { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: "16px" };

const cardBaseStyle = {
  position: "relative",
  display: "flex",
  gap: "14px",
  padding: "20px 22px",
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
  width: "52px",
  height: "52px",
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
const cardTitleStyle = { fontSize: "18px", fontWeight: 950, marginBottom: "6px", color: "#071b2d" };
const cardSubStyle = { fontSize: "15px", color: "#334155", lineHeight: 1.5 };
const cardFooterStyle = { fontSize: "12px", fontWeight: 950, color: "#64748b", marginTop: "12px", letterSpacing: "0.10em" };

const smallTag = (tone) => {
  const map = {
    NEW: { bg: "rgba(34,197,94,0.12)", color: "#14532d" },
    TRACK: { bg: "rgba(99,102,241,0.14)", color: "#3730a3" },
    VIEW: { bg: "rgba(148,163,184,0.14)", color: "#334155" },
  };
  const c = map[tone] || map.VIEW;
  return {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "7px 12px",
    borderRadius: 999,
    fontSize: 12,
    fontWeight: 950,
    letterSpacing: "0.08em",
    border: "1px solid rgba(15,23,42,0.14)",
    background: c.bg,
    color: c.color,
  };
};

const kpiRowStyle = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
  gap: 12,
  marginBottom: 14,
};

const kpiCardStyle = (color) => ({
  background: "rgba(255,255,255,0.92)",
  borderRadius: 14,
  padding: "14px 16px",
  border: "1px solid rgba(15,23,42,0.14)",
  boxShadow: "0 8px 22px rgba(2,132,199,0.08)",
  display: "flex",
  flexDirection: "column",
  gap: 4,
  borderTop: `4px solid ${color}`,
});

const kpiLabelStyle = {
  fontSize: 11,
  fontWeight: 950,
  color: "#64748b",
  textTransform: "uppercase",
  letterSpacing: "0.08em",
};

const kpiValueStyle = (color) => ({ fontSize: 28, fontWeight: 980, color });

const arrowStyle = {
  position: "absolute",
  right: "16px",
  top: "50%",
  transform: "translateY(-50%)",
  opacity: 0.6,
};

const helpBox = {
  marginTop: 16,
  padding: "18px 22px",
  borderRadius: 18,
  border: "1px solid rgba(15,23,42,0.14)",
  background: "rgba(255,255,255,0.78)",
  boxShadow: "0 10px 24px rgba(2, 132, 199, 0.08)",
};

export default function SupplierEvaluationHub() {
  const navigate = useNavigate();
  const [hoverId, setHoverId] = useState(null);
  const [kpis, setKpis] = useState({ total: 0, submitted: 0, pending: 0, loading: true });

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const res = await fetch(`${API_BASE}/api/reports?type=${encodeURIComponent(TYPE)}`, { cache: "no-store" });
        const json = await res.json().catch(() => null);
        const arr = Array.isArray(json) ? json : json?.data || json?.items || [];
        const sent = arr.filter((r) => r?.payload?.public?.token);
        let submitted = 0;
        sent.forEach((r) => { if (isSubmittedRec(r)) submitted++; });
        if (alive) setKpis({ total: sent.length, submitted, pending: sent.length - submitted, loading: false });
      } catch {
        if (alive) setKpis((k) => ({ ...k, loading: false }));
      }
    })();
    return () => { alive = false; };
  }, []);

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
                padding: "11px 16px",
                borderRadius: 14,
                border: "1px solid rgba(15,23,42,0.16)",
                background: "rgba(255,255,255,0.92)",
                cursor: "pointer",
                fontWeight: 950,
                fontSize: 15,
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
            <HaccpLinkBadge clauses={["4.2", "8.2"]} label="Interested Parties + PRPs" />
          </div>
          <p style={taglineStyle}>
            Flow: Create evaluation → send public link → supplier submits → review under Submitted Results.
          </p>
        </header>

        {/* KPI Bar — Sent / Submitted / Pending */}
        <div style={kpiRowStyle}>
          <div
            style={{ ...kpiCardStyle("#0891b2"), cursor: "pointer" }}
            onClick={() => navigate("/haccp-iso/supplier-evaluation/sent-links")}
            title="عرض كل الروابط المُرسلة"
          >
            <div style={kpiLabelStyle}>📨 Total Sent</div>
            <div style={kpiValueStyle("#0369a1")}>{kpis.loading ? "…" : kpis.total}</div>
          </div>
          <div
            style={{ ...kpiCardStyle("#16a34a"), cursor: "pointer" }}
            onClick={() => navigate("/haccp-iso/supplier-evaluation/results")}
            title="عرض الردود المُستلمة"
          >
            <div style={kpiLabelStyle}>✅ Submitted</div>
            <div style={kpiValueStyle("#15803d")}>{kpis.loading ? "…" : kpis.submitted}</div>
          </div>
          <div
            style={{ ...kpiCardStyle("#d97706"), cursor: "pointer" }}
            onClick={() => navigate("/haccp-iso/supplier-evaluation/sent-links")}
            title="عرض الروابط المعلّقة (لم يتم الرد عليها)"
          >
            <div style={kpiLabelStyle}>⏳ Pending</div>
            <div style={kpiValueStyle("#a16207")}>{kpis.loading ? "…" : kpis.pending}</div>
          </div>
        </div>

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
          <div style={{ fontWeight: 980, fontSize: 17, color: "#071b2d" }}>How it works</div>
          <div style={{ marginTop: 10, color: "#334155", fontWeight: 750, fontSize: 15, lineHeight: 1.7 }}>
            1) Create evaluation and generate a public link. <br />
            2) Supplier opens link, fills answers, uploads attachments, then submits. <br />
            3) Review everything from <b>Submitted Results</b>.
          </div>
        </div>

        {/* Footer */}
        <div style={{ marginTop: 20, fontSize: 14, color: "#64748b", fontWeight: 800, textAlign: "center", opacity: 0.95 }}>
          © Al Mawashi — Quality & Food Safety System
        </div>
      </div>
    </main>
  );
}
