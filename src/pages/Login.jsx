// Login.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import './Login.css';
import logo from '../assets/almawashi-logo.jpg';
import API_BASE from '../config/api';
import usePresence from '../hooks/usePresence';
import { countUnseenMaintenance } from './maintenance/maintenanceCount';

/* ─── Theme palettes (light / dark) ─── */
const LIGHT_THEME = {
  bgFrom: '#0ea5e9', bgMid: '#7c3aed', bgTo: '#111827',
  cardBg1: 'rgba(255,255,255,0.86)', cardBg2: 'rgba(255,255,255,0.78)',
  cardBorder: 'rgba(255,255,255,0.65)',
  cardText: '#0b1220', subText: '#334155',
  brand: '#fef2f2', brandSub: '#f1f5f9', footer: '#e5e7eb',
  tileBorder: 'rgba(255,255,255,0.7)',
  tileBg1: 'rgba(255,255,255,0.32)', tileBg2: 'rgba(255,255,255,0.18)',
  tileBgActive1: 'rgba(255,255,255,0.45)', tileBgActive2: 'rgba(255,255,255,0.28)',
  tileText: '#0b1220',
  widgetBg: 'rgba(255,255,255,0.18)', widgetBorder: 'rgba(255,255,255,0.35)',
  widgetText: '#f8fafc',
};

const DARK_THEME = {
  bgFrom: '#020617', bgMid: '#1e1b4b', bgTo: '#000000',
  cardBg1: 'rgba(17,24,39,0.82)', cardBg2: 'rgba(17,24,39,0.64)',
  cardBorder: 'rgba(148,163,184,0.18)',
  cardText: '#f1f5f9', subText: '#cbd5e1',
  brand: '#f1f5f9', brandSub: '#94a3b8', footer: '#94a3b8',
  tileBorder: 'rgba(148,163,184,0.35)',
  tileBg1: 'rgba(30,41,59,0.75)', tileBg2: 'rgba(15,23,42,0.60)',
  tileBgActive1: 'rgba(51,65,85,0.85)', tileBgActive2: 'rgba(30,41,59,0.70)',
  tileText: '#f1f5f9',
  widgetBg: 'rgba(17,24,39,0.55)', widgetBorder: 'rgba(148,163,184,0.25)',
  widgetText: '#e2e8f0',
};

// Roles (English only — keep routes/logic unchanged)
const roles = [
  { id: 'admin',        label: 'Admin',                    route: '/admin',                  icon: '👑' },
  { id: 'inspector',    label: 'Inspector',               route: '/inspection',             icon: '🔍' },
  { id: 'supervisor',   label: 'Supervisor',              route: '/supervisor',             icon: '🛠️' },
  { id: 'daily',        label: 'Daily Monitor',            route: '/monitor',                icon: '📅' },
  { id: 'ohc',          label: 'OHC',                      route: '/ohc',                    icon: '🩺' },

  { id: 'returns',      label: 'Returns',                 route: '/returns/menu',           icon: '♻️' }, // ✅ keep as-is
  { id: 'finalProduct', label: 'Final Product Report',     route: '/finished-product-entry', icon: '🏷️' },
  { id: 'cars',         label: 'Cars',                    route: '/cars',                   icon: '🚗' },
  { id: 'maintenance',  label: 'Maintenance Requests',     route: '/maintenance-home',       icon: '🔧' },

  { id: 'qcsView',      label: 'QCS Shipments (View)',      route: '/qcs-raw-material-view',  icon: '📦' },

  // Training Certificates (BFS / EFST / PIC)
  {
    id: 'training',
    label: 'Training Certificates (BFS / EFST OR PIC)',
    route: '/training-certificates',
    icon: '🎓'
  },

  // Internal Training (sessions + questions + results)
  {
    id: 'internalTraining',
    label: 'Internal Training',
    route: '/training',
    icon: '🧑‍🏫'
  },

  // ISO 22000 & HACCP
  {
    id: 'iso',
    label: 'ISO 22000 & HACCP',
    route: '/iso-haccp',
    icon: '📘'
  },

  // HALAL AUDIT
  {
    id: 'halalAudit',
    label: 'HALAL AUDIT',
    route: '/halal-audit',
    icon: '📋'
  },

  // 🦺 HSE — Health, Safety & Environment
  {
    id: 'hse',
    label: 'HSE',
    route: '/hse',
    icon: '🦺'
  },
];

function PasswordModal({ show, roleLabel, onSubmit, onClose, error, loading }) {
  const [password, setPassword] = useState("");

  React.useEffect(() => {
    if (show) setPassword("");
  }, [show]);

  if (!show) return null;
  return (
    <div style={{
      position: "fixed",
      inset: 0,
      background: "rgba(17,24,39,0.35)",
      display: "flex", alignItems: "center", justifyContent: "center",
      zIndex: 2000,
    }}>
      <div style={{
        background: "rgba(255,255,255,0.85)",
        backdropFilter: "blur(8px)",
        padding: "2.2rem 2.5rem",
        borderRadius: "18px",
        minWidth: 360,
        boxShadow: "0 8px 40px rgba(0,0,0,0.18)",
        textAlign: "center",
        position: "relative",
        border: "1px solid rgba(255,255,255,0.6)",
      }}>
        <button
          onClick={onClose}
          style={{
            position: "absolute", top: 10, left: 14,
            fontSize: 22, background: "transparent", border: "none", color: "#b91c1c",
            cursor: "pointer"
          }}
          title="Close"
        >✖</button>

        <div style={{ fontWeight: "bold", fontSize: "1.1em", color: "#1f2937", marginBottom: 12 }}>
          🔒 Password required to access:
        </div>
        <div style={{ fontWeight: 800, color: "#7c3aed", marginBottom: 16 }}>{roleLabel}</div>

        <form onSubmit={e => { e.preventDefault(); onSubmit(password); }}>
          <input
            type="password"
            autoFocus
            placeholder="Enter password"
            style={{
              width: "92%",
              padding: "12px",
              fontSize: "1.07em",
              border: "1.8px solid #c7d2fe",
              borderRadius: "12px",
              marginBottom: 14,
              background: "#eef2ff",
              outline: "none",
            }}
            value={password}
            onChange={e => setPassword(e.target.value)}
            onKeyDown={e => e.stopPropagation()}
          />
          <button
            type="submit"
            disabled={loading}
            style={{
              width: "100%",
              background: loading
                ? "#a5b4fc"
                : "linear-gradient(135deg, #7c3aed, #2563eb)",
              color: "#fff",
              border: "none",
              padding: "12px 0",
              borderRadius: "12px",
              fontWeight: "bold",
              fontSize: "1.06rem",
              marginBottom: 8,
              cursor: loading ? "not-allowed" : "pointer",
              boxShadow: "0 6px 18px rgba(124,58,237,0.35)"
            }}
          >
            {loading ? "Checking..." : "Sign in"}
          </button>
          {error && <div style={{ color: "#b91c1c", fontWeight: "bold", marginTop: 6 }}>{error}</div>}
        </form>

        <div style={{ marginTop: 8, fontSize: "0.93em", color: "#374151", opacity: 0.9 }}>
          Password is required for access.
        </div>
      </div>
    </div>
  );
}

function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const [hoveredRoleId, setHoveredRoleId] = useState(null);
  const [errorMsg, setErrorMsg] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedRole, setSelectedRole] = useState(null);
  const [modalError, setModalError] = useState("");
  const [modalLoading, setModalLoading] = useState(false);

  // 🔔 Maintenance requests not yet acknowledged (no "Date received")
  const [maintenanceUnseen, setMaintenanceUnseen] = useState(0);

  // 🌓 Theme state (persisted)
  const [theme, setTheme] = useState(() => {
    try { return localStorage.getItem("theme") || "light"; } catch { return "light"; }
  });
  const isDark = theme === "dark";
  const t = isDark ? DARK_THEME : LIGHT_THEME;
  useEffect(() => {
    try { localStorage.setItem("theme", theme); } catch {}
    document.documentElement.setAttribute("data-theme", theme);
  }, [theme]);

  // 👥 Presence (online users + daily visits)
  const presence = usePresence({ enabled: location.pathname === "/" });

  // 🔔 Refresh the maintenance badge on mount + whenever the tab regains focus
  useEffect(() => {
    let alive = true;
    const refresh = () =>
      countUnseenMaintenance()
        .then((n) => { if (alive) setMaintenanceUnseen(n); })
        .catch(() => {});
    refresh();
    const onFocus = () => { if (document.visibilityState !== "hidden") refresh(); };
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onFocus);
    return () => {
      alive = false;
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onFocus);
    };
  }, []);

  const handleRoleClick = (role) => {
    if (role.id === "kpi") {
      localStorage.setItem('currentUser', JSON.stringify({
        username: role.id,
        role: role.label,
      }));
      navigate(role.route);
      return;
    }
    setSelectedRole(role);
    setModalOpen(true);
    setModalError("");
  };

  const handleModalSubmit = async (password) => {
    if (modalLoading) return;
    setModalLoading(true);
    setModalError("");

    // كلمات المرور المحلية — fallback دائم
    const LOCAL_PASSWORDS = { returns:"0000", qcsView:"0000", iso:"802410", hse:"802410", maintenance:"0000", default:"9999" };
    const localExpected = LOCAL_PASSWORDS[selectedRole.id] ?? LOCAL_PASSWORDS.default;
    let success = password === localExpected;

    // لو كلمة المرور المحلية صحيحة، جرب تتحقق من السيرفر أيضاً (اختياري)
    // لو السيرفر ما رد أو فيه مشكلة — نكمل بالنتيجة المحلية
    if (success) {
      try {
        const ctrl = new AbortController();
        const timer = setTimeout(() => ctrl.abort(), 4000);
        const res = await fetch(`${API_BASE}/api/auth/verify-role`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ roleId: selectedRole.id, password }),
          signal: ctrl.signal,
        });
        clearTimeout(timer);
        const data = await res.json().catch(() => ({}));
        // لو السيرفر قال خطأ صريح → رفض (مش مجرد مشكلة اتصال)
        if (res.ok && data.success === false) success = false;
      } catch {
        // السيرفر ما رد — نكمل بالنتيجة المحلية (success = true)
      }
    }

    if (success) {
      setModalOpen(false);
      setErrorMsg("");
      localStorage.setItem('currentUser', JSON.stringify({
        username: selectedRole.id,
        role: selectedRole.label,
      }));
      navigate(selectedRole.route);
    } else {
      setModalError("❌ Wrong password!");
    }

    setModalLoading(false);
  };

  const handleModalClose = () => {
    if (modalLoading) return;
    setModalOpen(false);
    setModalError("");
    setSelectedRole(null);
  };

  if (location.pathname !== "/") {
    return null;
  }

  // ==== Styles shared with ReturnsMenu look ====
  const brandWrap = {
    position: "fixed",
    top: 12,
    right: 16,
    textAlign: "right",
    zIndex: 3,
    pointerEvents: "none",
  };
  const brandTitle = {
    fontFamily: "Cairo, sans-serif",
    fontWeight: 900,
    letterSpacing: "1px",
    fontSize: 18,
    color: t.brand,
    textShadow: "0 1px 8px rgba(0,0,0,0.25)"
  };
  const brandSub = {
    fontFamily: "Cairo, sans-serif",
    fontWeight: 600,
    fontSize: 11,
    color: t.brandSub,
    opacity: 0.9,
    textShadow: "0 1px 6px rgba(0,0,0,0.25)"
  };

  // Main card (keep same sizing/layout)
  const card = {
    width: "min(100%, 980px)",
    margin: "0 auto",
    padding: "28px 28px 30px",
    borderRadius: 22,
    background: `linear-gradient(180deg, ${t.cardBg1}, ${t.cardBg2})`,
    boxShadow: "0 20px 60px rgba(30,58,138,0.25)",
    border: `1px solid ${t.cardBorder}`,
    backdropFilter: "blur(8px)",
    position: "relative",
    zIndex: 2,
  };

  // Role tiles (keep same sizing/layout)
  const roleTile = (active) => ({
    width: 160,
    height: 160,
    borderRadius: 24,
    cursor: "pointer",
    border: `2px solid ${t.tileBorder}`,
    background: active
      ? `linear-gradient(180deg, ${t.tileBgActive1}, ${t.tileBgActive2})`
      : `linear-gradient(180deg, ${t.tileBg1}, ${t.tileBg2})`,
    display: "flex",
    flexDirection: "column",
    justifyContent: "center",
    alignItems: "center",
    gap: "0.55rem",
    color: t.tileText,
    fontWeight: 800,
    boxShadow: active
      ? "0 14px 30px rgba(2,132,199,0.30)"
      : "0 10px 24px rgba(2,132,199,0.22)",
    transition: "transform .2s ease, box-shadow .2s ease, background .25s ease",
    transform: active ? "translateY(-3px) scale(1.05)" : "translateY(0) scale(1)",
    textAlign: "center",
    userSelect: "none",
    position: "relative",
    overflow: "hidden",
  });

  return (
    <div
      className="login-container mx-bg"
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        gap: 24,
        padding: '4rem 1.2rem 3rem',
        fontFamily: 'Cairo, sans-serif',
        color: t.cardText,
        position: 'relative',
        overflow: 'hidden',
        background: `linear-gradient(135deg, ${t.bgFrom} 0%, ${t.bgMid} 55%, ${t.bgTo} 100%)`,
      }}
    >
      {/* ✅ CSS effects only (no layout changes) */}
      <style>{`
        .mx-bg{ position:relative; }
        .mx-blob{
          position:absolute;
          width: 540px;
          height: 540px;
          border-radius: 999px;
          filter: blur(34px);
          opacity: .72;
          pointer-events:none;
          z-index: 0;
          mix-blend-mode: screen;
          animation: mxFloat 18s ease-in-out infinite;
          transform: translate3d(0,0,0);
        }
        .mx-blob.b1{
          left:-200px; top:-180px;
          background: radial-gradient(circle at 30% 30%, rgba(34,211,238,.88), rgba(59,130,246,.16) 60%, transparent 72%);
        }
        .mx-blob.b2{
          right:-240px; top:-170px;
          background: radial-gradient(circle at 30% 30%, rgba(124,58,237,.88), rgba(236,72,153,.14) 60%, transparent 72%);
          animation-duration: 20s;
        }
        .mx-blob.b3{
          left:20%; bottom:-260px;
          background: radial-gradient(circle at 30% 30%, rgba(34,197,94,.80), rgba(16,185,129,.14) 60%, transparent 72%);
          animation-duration: 22s;
        }
        @keyframes mxFloat{
          0%{ transform: translate3d(0,0,0) scale(1); }
          50%{ transform: translate3d(46px, -22px, 0) scale(1.08); }
          100%{ transform: translate3d(0,0,0) scale(1); }
        }

        @keyframes mxPulse{
          0%   { transform: scale(1);   opacity: .9; }
          70%  { transform: scale(1.9); opacity: 0;  }
          100% { transform: scale(1.9); opacity: 0;  }
        }

        /* light noise */
        .mx-noise{
          position:absolute; inset:0;
          background-image:
            url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='140' height='140'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.85' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='140' height='140' filter='url(%23n)' opacity='.30'/%3E%3C/svg%3E");
          opacity:.10;
          mix-blend-mode: overlay;
          pointer-events:none;
          z-index: 0;
        }

        /* Glass + Neon for main card */
        .mx-card-glass{
          backdrop-filter: blur(14px);
          -webkit-backdrop-filter: blur(14px);
        }
        .mx-card-glass::before{
          content:"";
          position:absolute;
          inset:-2px;
          border-radius: 24px;
          background: conic-gradient(from 180deg,
            rgba(34,211,238,0),
            rgba(34,211,238,.55),
            rgba(124,58,237,.55),
            rgba(236,72,153,.42),
            rgba(34,211,238,0)
          );
          filter: blur(14px);
          opacity: .45;
          pointer-events:none;
          z-index: -1;
        }
        .mx-card-glass::after{
          content:"";
          position:absolute;
          inset:0;
          border-radius: 22px;
          background:
            radial-gradient(700px 260px at 10% 0%, rgba(255,255,255,.22), transparent 60%),
            radial-gradient(700px 260px at 90% 20%, rgba(255,255,255,.14), transparent 60%);
          opacity:.55;
          pointer-events:none;
        }

        /* Glass + Neon + Spotlight for role tiles */
        .mx-role-glass{
          border: 2px solid rgba(255,255,255,0.72) !important;
          backdrop-filter: blur(10px);
          -webkit-backdrop-filter: blur(10px);
        }
        .mx-role-glass::before{
          content:"";
          position:absolute;
          inset:-2px;
          border-radius: 26px;
          background: conic-gradient(from 180deg,
            rgba(34,211,238,0),
            rgba(34,211,238,.65),
            rgba(124,58,237,.65),
            rgba(236,72,153,.50),
            rgba(34,211,238,0)
          );
          filter: blur(12px);
          opacity: 0;
          transition: opacity .18s ease;
          pointer-events:none;
        }
        .mx-role-glass:hover::before{ opacity: .65; }

        /* Hover Spotlight */
        .mx-role-glass::after{
          content:"";
          position:absolute;
          inset:0;
          border-radius: 24px;
          background: radial-gradient(160px 160px at var(--mx-x, 50%) var(--mx-y, 45%),
            rgba(255,255,255,.34),
            rgba(255,255,255,.14) 35%,
            transparent 65%
          );
          opacity: 0;
          transition: opacity .16s ease;
          pointer-events:none;
        }
        .mx-role-glass:hover::after{ opacity: .9; }
      `}</style>

      {/* Animated background blobs */}
      <div className="mx-blob b1" />
      <div className="mx-blob b2" />
      <div className="mx-blob b3" />
      <div className="mx-noise" />

      {/* Top wave */}
      <svg
        viewBox="0 0 1440 320"
        style={{ position: "absolute", top: -60, left: 0, width: "140%", opacity: 0.15, zIndex: 0 }}
      >
        <path
          fill="#ffffff"
          d="M0,224L60,229.3C120,235,240,245,360,213.3C480,181,600,107,720,117.3C840,128,960,224,1080,224C1200,224,1320,128,1380,80L1440,32L1440,0L1380,0C1320,0,1200,0,1080,0C960,0,840,0,720,0C600,0,480,0,360,0C240,0,120,0,60,0L0,0Z"
        />
      </svg>

      {/* Bottom wave */}
      <svg
        viewBox="0 0 1440 320"
        style={{ position: "absolute", bottom: -90, right: -80, width: "150%", opacity: 0.12, zIndex: 0 }}
      >
        <path
          fill="#ffffff"
          d="M0,96L80,112C160,128,320,160,480,176C640,192,800,192,960,165.3C1120,139,1280,85,1360,58.7L1440,32L1440,320L1360,320C1280,320,1120,320,960,320C800,320,640,320,480,320C320,320,160,320,80,320L0,320Z"
        />
      </svg>

      {/* Brand text (top-right) */}
      <div style={brandWrap}>
        <div style={brandTitle}>AL MAWASHI</div>
        <div style={brandSub}>Trans Emirates Livestock Trading L.L.C.</div>
      </div>

      {/* 🌓 Theme toggle + 👥 Presence widget (top-left) */}
      <div
        style={{
          position: "fixed",
          top: 12,
          left: 16,
          zIndex: 3,
          display: "flex",
          alignItems: "center",
          gap: 10,
        }}
      >
        <button
          type="button"
          onClick={() => setTheme(isDark ? "light" : "dark")}
          title={isDark ? "Switch to light mode" : "Switch to dark mode"}
          style={{
            width: 40,
            height: 40,
            borderRadius: 999,
            border: `1px solid ${t.widgetBorder}`,
            background: t.widgetBg,
            color: t.widgetText,
            backdropFilter: "blur(10px)",
            WebkitBackdropFilter: "blur(10px)",
            cursor: "pointer",
            fontSize: 18,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            boxShadow: "0 6px 16px rgba(0,0,0,0.18)",
            transition: "transform .15s ease",
          }}
          onMouseEnter={(e) => (e.currentTarget.style.transform = "scale(1.08)")}
          onMouseLeave={(e) => (e.currentTarget.style.transform = "scale(1)")}
          aria-label="Toggle theme"
        >
          {isDark ? "☀️" : "🌙"}
        </button>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            padding: "8px 14px",
            borderRadius: 999,
            background: t.widgetBg,
            border: `1px solid ${t.widgetBorder}`,
            color: t.widgetText,
            backdropFilter: "blur(10px)",
            WebkitBackdropFilter: "blur(10px)",
            fontFamily: "Cairo, sans-serif",
            fontWeight: 700,
            fontSize: 12,
            boxShadow: "0 6px 16px rgba(0,0,0,0.18)",
            whiteSpace: "nowrap",
          }}
          title={presence.ok
            ? `متصل الآن: ${presence.online} • زيارات اليوم: ${presence.todayVisits}`
            : "لم يتم الاتصال بعدّاد الزوار"}
        >
          <span style={{ position: "relative", display: "inline-flex", alignItems: "center" }}>
            <span
              style={{
                width: 8, height: 8, borderRadius: "50%",
                background: presence.ok ? "#22c55e" : "#94a3b8",
                boxShadow: presence.ok ? "0 0 8px #22c55e" : "none",
                display: "inline-block",
              }}
            />
            {presence.ok && (
              <span
                style={{
                  position: "absolute", inset: -3,
                  borderRadius: "50%",
                  border: "2px solid rgba(34,197,94,.55)",
                  animation: "mxPulse 1.8s ease-out infinite",
                }}
              />
            )}
          </span>
          <span>👥 {presence.online}</span>
          <span style={{ opacity: 0.6 }}>·</span>
          <span>📅 {presence.todayVisits}</span>
        </div>
      </div>

      {/* Welcome card + roles grid */}
      <div style={card} className="mx-card-glass">
        {/* Logo */}
        <div style={{ display: "flex", justifyContent: "center", marginBottom: 18 }}>
          <img
            src={logo}
            alt="Almawashi logo"
            style={{
              width: 160,
              borderRadius: 18,
              boxShadow: "0 8px 26px rgba(0,0,0,0.17)",
              transition: "transform 0.2s ease",
            }}
            onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.03)'; }}
            onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)'; }}
          />
        </div>

        <h2 style={{
          textAlign: 'center',
          fontWeight: '900',
          marginBottom: 8,
          color: t.cardText,
          letterSpacing: ".2px"
        }}>
          Welcome — choose your role
        </h2>

        <div style={{ textAlign: "center", color: t.subText, marginBottom: 20, fontWeight: 600 }}>
          Quick role-based access
        </div>

        {errorMsg && (
          <div style={{
            margin: "0 auto 16px",
            color: "#fef2f2",
            background: "#b91c1c",
            borderRadius: 12,
            padding: "10px 18px",
            fontWeight: "bold",
            fontSize: "1.02em",
            boxShadow: "0 6px 14px rgba(185,28,28,0.35)",
            width: "fit-content",
            border: "1.5px solid #fecaca"
          }}>
            {errorMsg}
          </div>
        )}

        <div
          style={{
            display: 'flex',
            justifyContent: 'center',
            gap: '1.2rem',
            flexWrap: 'wrap',
            maxWidth: 900,
            margin: "0 auto",
          }}
        >
          {roles.map(role => (
            <button
              key={role.id}
              onClick={() => handleRoleClick(role)}
              onMouseEnter={() => setHoveredRoleId(role.id)}
              onMouseLeave={() => setHoveredRoleId(null)}
              onMouseMove={(e) => {
                // Hover spotlight (no layout changes)
                const rect = e.currentTarget.getBoundingClientRect();
                const x = ((e.clientX - rect.left) / rect.width) * 100;
                const y = ((e.clientY - rect.top) / rect.height) * 100;
                e.currentTarget.style.setProperty("--mx-x", `${x}%`);
                e.currentTarget.style.setProperty("--mx-y", `${y}%`);
              }}
              style={roleTile(hoveredRoleId === role.id)}
              className="mx-role-glass"
              title={role.id === "maintenance" && maintenanceUnseen > 0
                ? `${role.label} — ${maintenanceUnseen} طلب جديد بدون استلام / new unacknowledged`
                : role.label}
            >
              {role.id === "maintenance" && maintenanceUnseen > 0 && (
                <span
                  style={{
                    position: "absolute",
                    top: 8,
                    right: 8,
                    minWidth: 24,
                    height: 24,
                    padding: "0 7px",
                    borderRadius: 999,
                    background: "#dc2626",
                    color: "#fff",
                    fontSize: "0.8rem",
                    fontWeight: 900,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    boxShadow: "0 0 0 2px rgba(255,255,255,0.85), 0 4px 10px rgba(220,38,38,0.5)",
                    zIndex: 3,
                  }}
                  aria-label={`${maintenanceUnseen} طلبات صيانة بدون تاريخ استلام`}
                >
                  {maintenanceUnseen > 99 ? "99+" : maintenanceUnseen}
                </span>
              )}
              <div style={{ fontSize: "3rem", lineHeight: 1, position: "relative", zIndex: 1 }}>{role.icon}</div>
              <div style={{
                fontSize: "0.95rem",
                textAlign: "center",
                marginTop: "0.2rem",
                color: t.tileText,
                position: "relative",
                zIndex: 1
              }}>
                {role.label}
              </div>
            </button>
          ))}
        </div>

        {/* KPI + AI Assistant buttons (no password) */}
        <div style={{ display: "flex", justifyContent: "center", marginTop: 22, gap: 12, flexWrap: "wrap" }}>
          <button
            onClick={() => {
              localStorage.setItem('currentUser', JSON.stringify({
                username: 'kpi',
                role: 'KPI Dashboard',
              }));
              navigate('/kpi-login');
            }}
            onMouseEnter={() => setHoveredRoleId("kpi")}
            onMouseLeave={() => setHoveredRoleId(null)}
            style={{
              padding: "14px 26px",
              borderRadius: 14,
              background: hoveredRoleId === "kpi"
                ? "linear-gradient(135deg, #22d3ee, #3b82f6)"
                : "linear-gradient(135deg, #06b6d4, #2563eb)",
              color: "#fff",
              border: "2px solid rgba(255,255,255,0.9)",
              fontSize: "1.05rem",
              fontWeight: "900",
              boxShadow: "0 10px 24px rgba(37,99,235,0.35)",
              transition: "transform .2s ease, box-shadow .2s ease, background .25s ease",
              transform: hoveredRoleId === "kpi" ? "translateY(-2px)" : "translateY(0)",
              cursor: "pointer",
              letterSpacing: "0.3px"
            }}
          >
            📊 Open KPI Dashboard
          </button>

          {/* 🤖 AI Assistant — quick access from login (no password) */}
          <button
            onClick={() => {
              // Ensure a minimal "guest" session so ProtectedRoute lets the assistant load.
              try {
                if (!localStorage.getItem('currentUser')) {
                  localStorage.setItem('currentUser', JSON.stringify({
                    username: 'ai-guest',
                    role: 'AI Assistant',
                  }));
                }
              } catch {}
              navigate('/ai-assistant');
            }}
            onMouseEnter={() => setHoveredRoleId("ai")}
            onMouseLeave={() => setHoveredRoleId(null)}
            style={{
              padding: "14px 26px",
              borderRadius: 14,
              background: hoveredRoleId === "ai"
                ? "linear-gradient(135deg, #a78bfa, #7c3aed)"
                : "linear-gradient(135deg, #7c3aed, #4f46e5)",
              color: "#fff",
              border: "2px solid rgba(255,255,255,0.9)",
              fontSize: "1.05rem",
              fontWeight: "900",
              boxShadow: "0 10px 24px rgba(124,58,237,0.35)",
              transition: "transform .2s ease, box-shadow .2s ease, background .25s ease",
              transform: hoveredRoleId === "ai" ? "translateY(-2px)" : "translateY(0)",
              cursor: "pointer",
              letterSpacing: "0.3px",
              position: "relative",
            }}
            title="AI Assistant — quick help, summaries, and report guidance"
          >
            🤖 AI Assistant
            <span style={{
              position: "absolute",
              top: -7,
              insetInlineEnd: -7,
              background: "linear-gradient(135deg, #f97316, #ea580c)",
              color: "#fff",
              fontSize: 9,
              fontWeight: 1000,
              padding: "2px 7px",
              borderRadius: 999,
              letterSpacing: ".05em",
              boxShadow: "0 4px 10px rgba(249,115,22,.35)",
              textTransform: "uppercase",
            }}>NEW</span>
          </button>
        </div>
      </div>

      {/* Footer */}
      <div style={{
        position: "relative",
        zIndex: 1,
        textAlign: "left",
        paddingInline: "1rem",
        marginTop: 8,
        color: t.footer
      }}>
        Built by Eng. Mohammed Abdullah
      </div>

      <PasswordModal
        show={modalOpen}
        roleLabel={selectedRole?.label}
        onSubmit={handleModalSubmit}
        onClose={handleModalClose}
        error={modalError}
        loading={modalLoading}
      />
    </div>
  );
}

export default Login;