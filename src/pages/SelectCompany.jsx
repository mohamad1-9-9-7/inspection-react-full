// src/pages/SelectCompany.jsx
// Platform-owner landing screen: one card per company, shown right after
// login for a super-admin account only. Picking one sets the active company
// context (utils/companyContext.js) that authFetch.js then attaches to every
// scoped API call, and sends the owner into the normal dashboard "as" that
// company. Regular accounts never see this screen — their company is fixed
// by their own login token, so App.jsx never routes them here.
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import API_BASE from "../config/api";
import logo from "../assets/almawashi-logo.jpg";
import { setActiveCompany } from "../utils/companyContext";
import { clearAppSession } from "../utils/authFetch";

const STATUS_META = {
  active:    { bg: "#d1fae5", text: "#065f46", label: "Active" },
  trial:     { bg: "#fef3c7", text: "#92400e", label: "Trial" },
  expired:   { bg: "#fee2e2", text: "#991b1b", label: "Expired" },
  suspended: { bg: "#f3f4f6", text: "#6b7280", label: "Suspended" },
};

export default function SelectCompany() {
  const navigate = useNavigate();
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  const currentUser = (() => {
    try { return JSON.parse(localStorage.getItem("currentUser") || "{}"); } catch { return {}; }
  })();

  useEffect(() => {
    // بوابة ثانية غير راوت App.jsx: أي حدا وصل هون بدون سوبر أدمن (رابط
    // مباشر، جلسة قديمة...) بيرجع عالداشبورد العادي فوراً.
    if (!currentUser.isSuperAdmin) {
      navigate("/named-dashboard", { replace: true });
      return;
    }
    (async () => {
      try {
        const r = await fetch(`${API_BASE}/api/companies`);
        const d = await r.json();
        if (d.ok) setCompanies(d.companies || []);
        else setErr("Could not load companies.");
      } catch {
        setErr("Could not connect to server.");
      }
      setLoading(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function enter(company) {
    setActiveCompany(company);
    // النشاط يقرّر أي نظام يفتح: 'meat' (أو غير محدّد) = داشبورد المواشي،
    // أي نشاط تاني = المحرّك العام المبني من قالب النشاط.
    const industry = company.industry || "meat";
    navigate(industry !== "meat" ? "/company-app" : "/named-dashboard");
  }

  function logout() {
    clearAppSession();
    navigate("/", { replace: true });
  }

  return (
    <main style={S.page}>
      <div style={S.layout}>
        <header style={S.header}>
          <img src={logo} alt="Al Mawashi" style={S.logo} />
          <div style={{ minWidth: 0 }}>
            <p style={S.eyebrow}>Al Mawashi QMS · Platform</p>
            <h1 style={S.title}>Choose a company</h1>
            <p style={S.subtitle}>
              You're signed in as the platform owner. Pick a company to work inside it —
              you can switch to another one anytime from the dashboard.
            </p>
          </div>
          <button type="button" style={S.logoutBtn} onClick={logout}>Back to Login</button>
        </header>

        {loading ? (
          <div style={S.empty}>Loading companies…</div>
        ) : err ? (
          <div style={{ ...S.empty, color: "#991b1b" }}>{err}</div>
        ) : companies.length === 0 ? (
          <div style={S.empty}>No companies yet. Add one from Settings → Companies.</div>
        ) : (
          <div style={S.grid}>
            {companies.map((c) => {
              const meta = STATUS_META[String(c.status || "active").toLowerCase()] || STATUS_META.active;
              return (
                <button
                  key={c.id}
                  type="button"
                  style={S.card}
                  onClick={() => enter(c)}
                >
                  <div style={S.cardTop}>
                    <div style={S.avatar}>{c.name?.[0]?.toUpperCase() || "?"}</div>
                    <span style={{ ...S.badge, background: meta.bg, color: meta.text }}>{meta.label}</span>
                  </div>
                  <div style={S.cardName}>{c.name}</div>
                  {c.plan_name && <div style={S.cardMeta}>Plan: {c.plan_name}</div>}
                  {c.contact_name && <div style={S.cardMeta}>{c.contact_name}</div>}
                  <div style={S.cardEnter}>Enter <span aria-hidden="true">→</span></div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}

const S = {
  page: {
    minHeight: "100vh",
    padding: "40px clamp(18px, 4vw, 64px)",
    background: "linear-gradient(180deg, #f8fafc 0%, #eef7f4 44%, #f8fafc 100%)",
    color: "#0f172a",
    fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
  },
  layout: { width: "min(1200px, 100%)", margin: "0 auto" },
  header: {
    display: "flex",
    alignItems: "flex-start",
    gap: 18,
    marginBottom: 36,
  },
  logo: { width: 62, height: 62, borderRadius: 8, objectFit: "cover", border: "1px solid #e2e8f0", flexShrink: 0 },
  eyebrow: { margin: 0, fontWeight: 900, color: "#0f766e", letterSpacing: "0.08em", textTransform: "uppercase" },
  title: { margin: "6px 0 0", fontWeight: 1000, fontSize: 28 },
  subtitle: { margin: "8px 0 0", color: "#64748b", fontWeight: 700, maxWidth: 640, lineHeight: 1.5 },
  logoutBtn: {
    marginInlineStart: "auto", flexShrink: 0,
    minHeight: 44, padding: "0 18px", borderRadius: 8,
    border: "1px solid rgba(15,23,42,0.12)", background: "#fff",
    color: "#334155", fontWeight: 900, cursor: "pointer",
  },
  empty: {
    padding: 40, textAlign: "center", borderRadius: 8,
    background: "#fff", border: "1px solid rgba(15,23,42,0.12)", color: "#64748b", fontWeight: 800,
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 280px), 1fr))",
    gap: 18,
  },
  card: {
    display: "grid", gap: 12, textAlign: "start",
    padding: "20px 22px", borderRadius: 8, cursor: "pointer",
    background: "#fff", border: "1px solid rgba(15,23,42,0.12)",
    boxShadow: "0 12px 30px rgba(15,23,42,0.08)",
    transition: "transform .16s ease, box-shadow .16s ease",
  },
  cardTop: { display: "flex", alignItems: "center", justifyContent: "space-between" },
  avatar: {
    width: 46, height: 46, borderRadius: 8, display: "grid", placeItems: "center",
    background: "linear-gradient(135deg,#0f766e,#0891b2)", color: "#fff", fontWeight: 1000, fontSize: 18,
  },
  badge: { fontSize: 12, fontWeight: 800, borderRadius: 999, padding: "3px 10px" },
  cardName: { fontWeight: 950, fontSize: 18, color: "#0f172a" },
  cardMeta: { fontSize: 13, color: "#64748b", fontWeight: 700 },
  cardEnter: { marginTop: 4, fontWeight: 900, color: "#0f766e" },
};
