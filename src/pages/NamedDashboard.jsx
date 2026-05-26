// src/pages/NamedDashboard.jsx
// Dashboard for named-account users — shows tiles filtered by their permissions
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import logo from "../assets/almawashi-logo.jpg";
import API_BASE from "../config/api";

/* ── All roles with their routes ── */
const ALL_ROLES = [
  { id: "admin",            label: "Admin",                         route: "/admin",                  icon: "👑" },
  { id: "inspector",        label: "Inspector",                     route: "/inspection",             icon: "🔍" },
  { id: "supervisor",       label: "Supervisor",                    route: "/supervisor",             icon: "🛠️" },
  { id: "daily",            label: "Daily Monitor",                 route: "/monitor",                icon: "📅" },
  { id: "ohc",              label: "OHC",                           route: "/ohc",                    icon: "🩺" },
  { id: "returns",          label: "Returns",                       route: "/returns/menu",           icon: "♻️" },
  { id: "finalProduct",     label: "Final Product Report",          route: "/finished-product-entry", icon: "🏷️" },
  { id: "cars",             label: "Cars",                          route: "/cars",                   icon: "🚗" },
  { id: "maintenance",      label: "Maintenance Requests",          route: "/maintenance-home",       icon: "🔧" },
  { id: "qcsView",          label: "QCS Shipments (View)",          route: "/qcs-raw-material-view",  icon: "📦" },
  { id: "training",         label: "Training Certificates",         route: "/training-certificates",  icon: "🎓" },
  { id: "internalTraining", label: "Internal Training",             route: "/training",               icon: "🧑‍🏫" },
  { id: "iso",              label: "ISO 22000 & HACCP",             route: "/iso-haccp",              icon: "📘" },
  { id: "halalAudit",       label: "HALAL AUDIT",                   route: "/halal-audit",            icon: "📋" },
  { id: "hse",              label: "HSE",                           route: "/hse",                    icon: "🦺" },
  { id: "settings",         label: "Settings",                      route: "/settings",               icon: "⚙️" },
];

export default function NamedDashboard() {
  const navigate  = useNavigate();
  const [hovered, setHovered] = useState(null);

  /* Read current named user from localStorage */
  const currentUser = (() => {
    try { return JSON.parse(localStorage.getItem("currentUser") || "{}"); } catch { return {}; }
  })();

  const displayName = currentUser.displayName || currentUser.username || "User";
  const permissions = currentUser.permissions || [];
  const isFullAccess = permissions.includes("*") || permissions.length === 0;

  /* Filter tiles based on permissions */
  const visibleRoles = isFullAccess
    ? ALL_ROLES
    : ALL_ROLES.filter(r => permissions.includes(r.id));

  const handleLogout = async () => {
    try {
      await fetch(`${API_BASE}/api/auth/logout`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: currentUser.username }),
      });
    } catch { /* ignore */ }
    localStorage.removeItem("currentUser");
    navigate("/", { replace: true });
  };

  const handleTileClick = (role) => {
    navigate(role.route);
  };

  return (
    <div style={s.page}>
      {/* Background blobs */}
      <div style={{ ...s.blob, left: -200, top: -180, background: "radial-gradient(circle, rgba(34,211,238,.5), transparent 70%)" }} />
      <div style={{ ...s.blob, right: -240, top: -170, background: "radial-gradient(circle, rgba(124,58,237,.5), transparent 70%)" }} />

      {/* Top bar */}
      <div style={s.topBar}>
        {/* User info */}
        <div style={s.userChip}>
          <div style={s.avatar}>{displayName[0]?.toUpperCase() || "U"}</div>
          <div>
            <div style={s.userHello}>Welcome back 👋</div>
            <div style={s.userName}>{displayName}</div>
          </div>
        </div>

        {/* Actions */}
        <div style={{ display: "flex", gap: 10 }}>
          {(currentUser.isAdmin || permissions.includes("settings") || isFullAccess) && (
            <button
              onClick={() => navigate("/settings")}
              style={s.btnSecondary}
              title="Settings"
            >
              ⚙️ Settings
            </button>
          )}
          <button onClick={handleLogout} style={s.btnLogout}>
            🚪 Sign Out
          </button>
        </div>
      </div>

      {/* Main card */}
      <div style={s.card}>
        {/* Logo */}
        <div style={{ display: "flex", justifyContent: "center", marginBottom: 18 }}>
          <img
            src={logo}
            alt="Almawashi logo"
            style={{ width: 130, borderRadius: 16, boxShadow: "0 8px 24px rgba(0,0,0,.15)" }}
          />
        </div>

        <h2 style={s.cardTitle}>Your Dashboard</h2>
        <p style={s.cardSub}>
          {isFullAccess
            ? `Full access — ${ALL_ROLES.length} sections available`
            : `${visibleRoles.length} section${visibleRoles.length !== 1 ? "s" : ""} available`}
        </p>

        {/* Role tiles */}
        {visibleRoles.length === 0 ? (
          <div style={{ textAlign: "center", color: "#94a3b8", padding: "40px 0", fontWeight: 700 }}>
            No sections assigned. Contact your administrator.
          </div>
        ) : (
          <div style={s.grid}>
            {visibleRoles.map(role => (
              <button
                key={role.id}
                onClick={() => handleTileClick(role)}
                onMouseEnter={() => setHovered(role.id)}
                onMouseLeave={() => setHovered(null)}
                style={s.tile(hovered === role.id)}
              >
                <div style={s.tileIcon}>{role.icon}</div>
                <div style={s.tileLabel}>{role.label}</div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      <div style={s.footer}>Built by Eng. Mohammed Abdullah</div>
    </div>
  );
}

/* ─── Styles ─── */
const s = {
  page: {
    minHeight: "100vh",
    background: "linear-gradient(135deg, #0ea5e9 0%, #7c3aed 55%, #111827 100%)",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    padding: "0 1.2rem 3rem",
    fontFamily: "Cairo, ui-sans-serif, system-ui, sans-serif",
    position: "relative",
    overflow: "hidden",
  },
  blob: {
    position: "absolute",
    width: 500, height: 500,
    borderRadius: "50%",
    filter: "blur(40px)",
    opacity: 0.6,
    pointerEvents: "none",
  },
  topBar: {
    width: "100%",
    maxWidth: 1000,
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "18px 0 14px",
    zIndex: 2,
    flexWrap: "wrap",
    gap: 12,
  },
  userChip: {
    display: "flex", alignItems: "center", gap: 12,
    background: "rgba(255,255,255,0.15)",
    backdropFilter: "blur(10px)",
    border: "1px solid rgba(255,255,255,0.3)",
    borderRadius: 999,
    padding: "8px 18px 8px 8px",
    boxShadow: "0 6px 16px rgba(0,0,0,.18)",
  },
  avatar: {
    width: 36, height: 36, borderRadius: "50%",
    background: "linear-gradient(135deg,#f97316,#ec4899)",
    color: "#fff", fontWeight: 1000, fontSize: 16,
    display: "flex", alignItems: "center", justifyContent: "center",
    boxShadow: "0 4px 10px rgba(0,0,0,.2)",
  },
  userHello: { fontSize: 10, color: "rgba(255,255,255,.75)", fontWeight: 700 },
  userName:  { fontSize: 13, color: "#fff", fontWeight: 900 },
  btnSecondary: {
    padding: "9px 16px",
    background: "rgba(255,255,255,0.18)",
    backdropFilter: "blur(8px)",
    border: "1px solid rgba(255,255,255,.35)",
    borderRadius: 10, color: "#fff",
    fontWeight: 900, fontSize: 13, cursor: "pointer",
    fontFamily: "inherit",
    boxShadow: "0 4px 12px rgba(0,0,0,.15)",
  },
  btnLogout: {
    padding: "9px 16px",
    background: "rgba(220,38,38,0.25)",
    backdropFilter: "blur(8px)",
    border: "1px solid rgba(252,165,165,.4)",
    borderRadius: 10, color: "#fff",
    fontWeight: 900, fontSize: 13, cursor: "pointer",
    fontFamily: "inherit",
    boxShadow: "0 4px 12px rgba(220,38,38,.2)",
  },
  card: {
    width: "min(100%, 920px)",
    background: "rgba(255,255,255,0.88)",
    backdropFilter: "blur(14px)",
    border: "1px solid rgba(255,255,255,.65)",
    borderRadius: 24,
    padding: "28px 28px 32px",
    boxShadow: "0 20px 60px rgba(30,58,138,.25)",
    zIndex: 2,
    position: "relative",
  },
  cardTitle: {
    textAlign: "center", margin: "0 0 6px",
    fontWeight: 900, fontSize: 22, color: "#0f172a",
  },
  cardSub: {
    textAlign: "center", margin: "0 0 22px",
    color: "#475569", fontWeight: 700, fontSize: 13,
  },
  grid: {
    display: "flex",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: "1rem",
  },
  tile: (active) => ({
    width: 150, height: 150,
    borderRadius: 22,
    border: `2px solid ${active ? "rgba(37,99,235,.5)" : "rgba(255,255,255,.7)"}`,
    background: active
      ? "linear-gradient(180deg,rgba(219,234,254,.9),rgba(239,246,255,.8))"
      : "linear-gradient(180deg,rgba(255,255,255,.55),rgba(255,255,255,.32))",
    backdropFilter: "blur(8px)",
    display: "flex", flexDirection: "column",
    alignItems: "center", justifyContent: "center", gap: "0.5rem",
    cursor: "pointer",
    boxShadow: active
      ? "0 10px 28px rgba(37,99,235,.25)"
      : "0 8px 20px rgba(2,132,199,.18)",
    transform: active ? "translateY(-3px) scale(1.04)" : "translateY(0) scale(1)",
    transition: "all .2s ease",
    textAlign: "center",
    fontFamily: "inherit",
    color: "#0f172a",
  }),
  tileIcon:  { fontSize: "2.8rem", lineHeight: 1 },
  tileLabel: { fontSize: "0.88rem", fontWeight: 800, color: "#0f172a" },
  footer: {
    marginTop: 18, color: "rgba(255,255,255,.55)",
    fontSize: 12, fontWeight: 700, zIndex: 2,
  },
};
