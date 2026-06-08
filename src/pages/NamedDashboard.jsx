// src/pages/NamedDashboard.jsx
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import logo from "../assets/almawashi-logo.jpg";
import API_BASE from "../config/api";

/* ══════════════════════════════════════════
   OPERATOR PICKER — who is working now?
══════════════════════════════════════════ */
function OperatorPicker({ employees, accountName, onConfirm }) {
  const [selected, setSelected] = useState("");
  const [custom,   setCustom]   = useState("");
  const [mode,     setMode]     = useState(employees.length > 0 ? "list" : "type");

  const handleConfirm = () => {
    const name = mode === "list" ? selected : custom.trim();
    if (!name) return;
    onConfirm(name);
  };

  return (
    <div style={op.overlay}>
      <div style={op.card}>
        {/* Icon */}
        <div style={op.iconWrap}>
          <span style={{ fontSize: 36 }}>👷</span>
        </div>

        <h2 style={op.title}>Who is working now?</h2>
        <p style={op.sub}>
          Account: <strong style={{ color: "#2563eb" }}>{accountName}</strong><br/>
          Select your name to log this session
        </p>

        {/* Toggle between list and type */}
        {employees.length > 0 && (
          <div style={op.modeToggle}>
            <button
              onClick={() => setMode("list")}
              style={{ ...op.modeBtn, ...(mode === "list" ? op.modeBtnActive : {}) }}
            >📋 Select from list</button>
            <button
              onClick={() => setMode("type")}
              style={{ ...op.modeBtn, ...(mode === "type" ? op.modeBtnActive : {}) }}
            >✏️ Type name</button>
          </div>
        )}

        {/* Employee list */}
        {mode === "list" && employees.length > 0 && (
          <div style={op.list}>
            {employees.map(name => (
              <button
                key={name}
                onClick={() => setSelected(name)}
                style={{
                  ...op.empBtn,
                  ...(selected === name ? op.empBtnActive : {}),
                }}
              >
                <span style={op.empAvatar}>
                  {name[0]?.toUpperCase()}
                </span>
                <span style={{ fontWeight: 800, fontSize: 16 }}>{name}</span>
                {selected === name && <span style={{ marginLeft: "auto", color: "#2563eb", fontSize: 20 }}>✓</span>}
              </button>
            ))}
          </div>
        )}

        {/* Manual input */}
        {mode === "type" && (
          <input
            autoFocus
            style={op.input}
            placeholder="Enter your name…"
            value={custom}
            onChange={e => setCustom(e.target.value)}
            onKeyDown={e => e.key === "Enter" && handleConfirm()}
          />
        )}

        <button
          onClick={handleConfirm}
          disabled={mode === "list" ? !selected : !custom.trim()}
          style={{
            ...op.confirmBtn,
            opacity: (mode === "list" ? !selected : !custom.trim()) ? 0.5 : 1,
            cursor: (mode === "list" ? !selected : !custom.trim()) ? "not-allowed" : "pointer",
          }}
        >
          ✅ Start Session
        </button>
      </div>
    </div>
  );
}

const op = {
  overlay: {
    position: "fixed", inset: 0,
    background: "rgba(0,0,0,.55)",
    backdropFilter: "blur(8px)",
    display: "flex", alignItems: "center", justifyContent: "center",
    zIndex: 9999, padding: "1rem",
  },
  card: {
    background: "#fff", borderRadius: 28,
    padding: "2.6rem 2.8rem",
    width: "min(460px, 96vw)",
    boxShadow: "0 30px 80px rgba(0,0,0,.3)",
    border: "1px solid #e2e8f0",
    textAlign: "center",
  },
  iconWrap: {
    width: 72, height: 72, borderRadius: "50%",
    background: "linear-gradient(135deg,#dbeafe,#ede9fe)",
    display: "flex", alignItems: "center", justifyContent: "center",
    margin: "0 auto 16px",
    border: "2px solid #c7d2fe",
  },
  title: { margin: "0 0 8px", fontWeight: 1000, fontSize: 24, color: "#0f172a" },
  sub:   { margin: "0 0 20px", color: "#64748b", fontSize: 15, lineHeight: 1.6 },
  modeToggle: {
    display: "flex", gap: 8, marginBottom: 16,
    background: "#f1f5f9", borderRadius: 12, padding: 4,
  },
  modeBtn: {
    flex: 1, padding: "9px 0",
    background: "none", border: "none",
    borderRadius: 9, fontWeight: 800, fontSize: 14,
    cursor: "pointer", fontFamily: "inherit", color: "#64748b",
    transition: "all .15s",
  },
  modeBtnActive: {
    background: "#fff", color: "#2563eb",
    boxShadow: "0 2px 8px rgba(0,0,0,.10)",
  },
  list: {
    display: "flex", flexDirection: "column", gap: 8,
    marginBottom: 20, maxHeight: 280, overflowY: "auto",
  },
  empBtn: {
    display: "flex", alignItems: "center", gap: 12,
    padding: "12px 16px", borderRadius: 14,
    background: "#f8fafc", border: "2px solid #e2e8f0",
    cursor: "pointer", fontFamily: "inherit",
    transition: "all .15s", textAlign: "left",
  },
  empBtnActive: {
    background: "#eff6ff", border: "2px solid #3b82f6",
    boxShadow: "0 4px 12px rgba(59,130,246,.2)",
  },
  empAvatar: {
    width: 36, height: 36, borderRadius: "50%",
    background: "linear-gradient(135deg,#7c3aed,#2563eb)",
    color: "#fff", fontWeight: 900, fontSize: 16,
    display: "flex", alignItems: "center", justifyContent: "center",
    flexShrink: 0,
  },
  input: {
    width: "100%", padding: "13px 16px",
    border: "2px solid #e2e8f0", borderRadius: 12,
    fontSize: 16, fontFamily: "inherit",
    boxSizing: "border-box", marginBottom: 20,
    outline: "none",
  },
  confirmBtn: {
    width: "100%", padding: "15px 0",
    background: "linear-gradient(135deg,#2563eb,#7c3aed)",
    color: "#fff", border: "none", borderRadius: 14,
    fontWeight: 900, fontSize: 18,
    fontFamily: "inherit",
    boxShadow: "0 8px 22px rgba(37,99,235,.35)",
    transition: "opacity .15s",
  },
};

/* ── Each role: label · route · icon · unique gradient ── */
const ALL_ROLES = [
  {
    id: "admin", label: "Admin", route: "/admin", icon: "👑",
    grad: "linear-gradient(135deg,#f59e0b,#d97706)",
    glow: "rgba(245,158,11,.45)",
  },
  {
    id: "inspector", label: "Inspector", route: "/inspection", icon: "🔍",
    grad: "linear-gradient(135deg,#3b82f6,#1d4ed8)",
    glow: "rgba(59,130,246,.45)",
  },
  {
    id: "supervisor", label: "Supervisor", route: "/supervisor", icon: "🛠️",
    grad: "linear-gradient(135deg,#8b5cf6,#6d28d9)",
    glow: "rgba(139,92,246,.45)",
  },
  {
    id: "daily", label: "Daily Monitor", route: "/monitor", icon: "📅",
    grad: "linear-gradient(135deg,#06b6d4,#0284c7)",
    glow: "rgba(6,182,212,.45)",
  },
  {
    id: "ohc", label: "OHC", route: "/ohc", icon: "🩺",
    grad: "linear-gradient(135deg,#10b981,#059669)",
    glow: "rgba(16,185,129,.45)",
  },
  {
    id: "returns", label: "Returns", route: "/returns/menu", icon: "♻️",
    grad: "linear-gradient(135deg,#f97316,#ea580c)",
    glow: "rgba(249,115,22,.45)",
  },
  {
    id: "finalProduct", label: "Final Product", route: "/finished-product-entry", icon: "🏷️",
    grad: "linear-gradient(135deg,#ec4899,#db2777)",
    glow: "rgba(236,72,153,.45)",
  },
  {
    id: "cars", label: "Cars", route: "/cars", icon: "🚗",
    grad: "linear-gradient(135deg,#64748b,#475569)",
    glow: "rgba(100,116,139,.45)",
  },
  {
    id: "maintenance", label: "Maintenance", route: "/maintenance-home", icon: "🔧",
    grad: "linear-gradient(135deg,#ef4444,#dc2626)",
    glow: "rgba(239,68,68,.45)",
  },
  {
    id: "qcsView", label: "QCS Shipments", route: "/qcs-raw-material-view", icon: "📦",
    grad: "linear-gradient(135deg,#6366f1,#4f46e5)",
    glow: "rgba(99,102,241,.45)",
  },
  {
    id: "training", label: "Training Certs", route: "/training-certificates", icon: "🎓",
    grad: "linear-gradient(135deg,#a855f7,#9333ea)",
    glow: "rgba(168,85,247,.45)",
  },
  {
    id: "internalTraining", label: "Internal Training", route: "/training", icon: "🧑‍🏫",
    grad: "linear-gradient(135deg,#2563eb,#1e40af)",
    glow: "rgba(37,99,235,.45)",
  },
  {
    id: "iso", label: "ISO & HACCP", route: "/iso-haccp", icon: "📘",
    grad: "linear-gradient(135deg,#0891b2,#0e7490)",
    glow: "rgba(8,145,178,.45)",
  },
  {
    id: "halalAudit", label: "HALAL Audit", route: "/halal-audit", icon: "📋",
    grad: "linear-gradient(135deg,#84cc16,#65a30d)",
    glow: "rgba(132,204,22,.45)",
  },
  {
    id: "hse", label: "HSE", route: "/hse", icon: "🦺",
    grad: "linear-gradient(135deg,#eab308,#ca8a04)",
    glow: "rgba(234,179,8,.45)",
  },
  {
    id: "emailCenter", label: "Email Center", route: "/email-center", icon: "📨",
    grad: "linear-gradient(135deg,#1e40af,#7c3aed)",
    glow: "rgba(30,64,175,.45)",
  },
  {
    id: "settings", label: "Settings", route: "/settings", icon: "⚙️",
    grad: "linear-gradient(135deg,#475569,#334155)",
    glow: "rgba(71,85,105,.45)",
  },
];

/* greeting based on time */
function greeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

export default function NamedDashboard() {
  const navigate    = useNavigate();
  const [hovered, setHovered] = useState(null);
  const [time, setTime]       = useState(new Date());

  useEffect(() => {
    const id = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  const currentUser = (() => {
    try { return JSON.parse(localStorage.getItem("currentUser") || "{}"); } catch { return {}; }
  })();

  const displayName  = currentUser.displayName || currentUser.username || "User";
  const permissions  = currentUser.permissions  || [];
  const isFullAccess = permissions.includes("*") || permissions.length === 0;
  const isAdmin      = !!currentUser.isAdmin;
  const employees    = currentUser.employees    || [];

  const visibleRoles = isFullAccess
    ? ALL_ROLES
    : ALL_ROLES.filter(r => permissions.includes(r.id));

  /* ── Operator session (who is working now) ──
     • Admin: skipped entirely (no tracking needed)
     • Non-admin: mandatory every new browser session, popup cannot be dismissed  */
  const sessionKey = `operator_${currentUser.username}`;
  const [operator, setOperator] = useState(() => {
    if (isAdmin) return displayName; // admin uses own display name
    return sessionStorage.getItem(sessionKey) || null;
  });
  const [showPicker, setShowPicker] = useState(() => {
    if (isAdmin) return false;       // admin never sees picker
    return !sessionStorage.getItem(sessionKey);
  });

  const handleOperatorConfirm = async (name) => {
    sessionStorage.setItem(sessionKey, name);
    setOperator(name);
    setShowPicker(false);
    // Log operator start to activity log
    try {
      await fetch(`${API_BASE}/api/auth/operator-start`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: currentUser.username, operator: name }),
      }).catch(() => {}); // optional endpoint — ignore if not deployed
    } catch { /* ignore */ }
  };

  const handleLogout = async () => {
    try {
      await fetch(`${API_BASE}/api/auth/logout`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: currentUser.username, operator }),
      });
    } catch { /* ignore */ }
    sessionStorage.removeItem(sessionKey);
    localStorage.removeItem("currentUser");
    navigate("/", { replace: true });
  };

  const timeStr = time.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
  const dateStr = time.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" });

  return (
    <div style={s.page}>
      {/* ── Operator picker popup ── */}
      {showPicker && (
        <OperatorPicker
          employees={employees}
          accountName={displayName}
          onConfirm={handleOperatorConfirm}
        />
      )}

      <style>{`
        /* blob animation */
        @keyframes ndFloat{
          0%  {transform:translate(0,0)   scale(1);}
          50% {transform:translate(40px,-24px) scale(1.08);}
          100%{transform:translate(0,0)   scale(1);}
        }
        /* tile hover */
        .nd-tile{transition:transform .22s ease,box-shadow .22s ease,filter .22s ease;}
        .nd-tile:hover{
          transform:translateY(-6px) scale(1.06) !important;
          filter:brightness(1.08);
        }
        .nd-tile:active{transform:scale(.96) !important;}
        /* button hover */
        .nd-btn{transition:all .18s ease;}
        .nd-btn:hover{opacity:.85;transform:translateY(-1px);}
        .nd-btn:active{transform:scale(.96);}
        /* shimmer on card */
        @keyframes ndShimmer{
          0%  {left:-100%;}
          100%{left:200%;}
        }
      `}</style>

      {/* ── blobs ── */}
      <div style={{...s.blob,
        left:-220, top:-200,
        background:"radial-gradient(circle,rgba(34,211,238,.55),transparent 68%)",
        animation:"ndFloat 18s ease-in-out infinite",
      }}/>
      <div style={{...s.blob,
        right:-240, top:-150,
        background:"radial-gradient(circle,rgba(124,58,237,.55),transparent 68%)",
        animation:"ndFloat 21s ease-in-out infinite reverse",
      }}/>
      <div style={{...s.blob,
        left:"30%", bottom:-240,
        background:"radial-gradient(circle,rgba(16,185,129,.45),transparent 68%)",
        animation:"ndFloat 24s ease-in-out infinite",
      }}/>

      {/* ════════════ TOP BAR ════════════ */}
      <header style={s.header}>

        {/* left: logo + name */}
        <div style={s.brandRow}>
          <img src={logo} alt="logo" style={s.brandLogo}/>
          <div>
            <div style={s.brandName}>Al Mawashi QMS</div>
            <div style={s.brandSub}>Quality Management System</div>
          </div>
        </div>

        {/* centre: clock */}
        <div style={s.clockBox}>
          <div style={s.clockTime}>{timeStr}</div>
          <div style={s.clockDate}>{dateStr}</div>
        </div>

        {/* right: user + actions */}
        <div style={{ display:"flex", alignItems:"center", gap:10, flexWrap:"wrap" }}>
          <div style={s.userChip}>
            <div style={s.avatar}>{(operator || displayName)[0]?.toUpperCase()||"U"}</div>
            <div>
              <div style={s.userHello}>{greeting()} · Account: {displayName}</div>
              <div style={s.userName}>
                {operator || displayName}
                {/* 🔄 Change operator — only for non-admin, requires re-selection */}
                {operator && !isAdmin && (
                  <button
                    onClick={() => { sessionStorage.removeItem(sessionKey); setOperator(null); setShowPicker(true); }}
                    title="Change operator"
                    style={{
                      marginLeft: 8, background: "none", border: "none",
                      color: "rgba(255,255,255,.65)", cursor: "pointer",
                      fontSize: 12, padding: 0, fontFamily: "inherit",
                    }}
                  >
                    🔄
                  </button>
                )}
                {/* Admin badge */}
                {isAdmin && (
                  <span style={{
                    marginLeft: 8, fontSize: 10, fontWeight: 900,
                    background: "rgba(245,158,11,.3)", color: "#fcd34d",
                    border: "1px solid rgba(245,158,11,.4)",
                    padding: "1px 6px", borderRadius: 999,
                  }}>
                    👑 Admin
                  </span>
                )}
              </div>
            </div>
          </div>
          {(currentUser.isAdmin || permissions.includes("settings") || isFullAccess) && (
            <button className="nd-btn" onClick={() => navigate("/settings")} style={s.btnSettings}>
              ⚙️
            </button>
          )}
          <button className="nd-btn" onClick={handleLogout} style={s.btnLogout}>
            🚪 Sign Out
          </button>
        </div>
      </header>

      {/* ════════════ MAIN ════════════ */}
      <main style={s.main}>

        {/* ── Session expiry notice ── */}
        {(() => {
          const loginAt = currentUser.loginAt || 0;
          const elapsed = Date.now() - loginAt;
          const remaining = 8 * 60 * 60 * 1000 - elapsed;
          const hoursLeft = Math.floor(remaining / 3600000);
          const minsLeft  = Math.floor((remaining % 3600000) / 60000);
          if (hoursLeft < 1 && minsLeft < 30 && minsLeft > 0) {
            return (
              <div style={{
                background: "rgba(251,191,36,.15)", border: "1px solid rgba(251,191,36,.4)",
                borderRadius: 10, padding: "8px 16px", marginBottom: 12,
                color: "#fcd34d", fontWeight: 800, fontSize: 13, textAlign: "center",
              }}>
                ⏰ Session expires in {minsLeft} minute{minsLeft !== 1 ? "s" : ""} — please save your work
              </div>
            );
          }
          return null;
        })()}

        {/* ── hero text ── */}
        <div style={s.hero}>
          <h1 style={s.heroTitle}>Your Dashboard</h1>
          <p style={s.heroSub}>
            {isFullAccess
              ? `⭐ Full Access — all ${ALL_ROLES.length} sections`
              : `${visibleRoles.length} section${visibleRoles.length !== 1 ? "s" : ""} available`}
          </p>
        </div>

        {/* ── tiles ── */}
        {visibleRoles.length === 0 ? (
          <div style={s.empty}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>🔒</div>
            <div style={{ fontWeight: 900, fontSize: 18 }}>No sections assigned</div>
            <div style={{ fontSize: 14, opacity: .7, marginTop: 6 }}>Contact your administrator</div>
          </div>
        ) : (
          <div style={s.grid}>
            {visibleRoles.map(role => (
              <button
                key={role.id}
                className="nd-tile"
                onClick={() => navigate(role.route)}
                onMouseEnter={() => setHovered(role.id)}
                onMouseLeave={() => setHovered(null)}
                style={{
                  ...s.tile,
                  background: role.grad,
                  boxShadow: hovered === role.id
                    ? `0 20px 50px ${role.glow}, 0 0 0 2px rgba(255,255,255,.25)`
                    : `0 8px 24px ${role.glow}`,
                }}
              >
                {/* shimmer strip */}
                <div style={s.tileShimmer}/>
                <div style={s.tileIconWrap}>
                  <span style={s.tileIcon}>{role.icon}</span>
                </div>
                <div style={s.tileLabel}>{role.label}</div>
              </button>
            ))}
          </div>
        )}
      </main>

      {/* footer */}
      <footer style={s.footer}>Built by Eng. Mohammed Abdullah</footer>
    </div>
  );
}

/* ─── Styles ─── */
const s = {
  page: {
    minHeight: "100vh",
    background: "linear-gradient(140deg,#0f172a 0%,#1e1b4b 45%,#0f172a 100%)",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    padding: "0 1.2rem 2.5rem",
    fontFamily: "Cairo,'Segoe UI',system-ui,sans-serif",
    position: "relative",
    overflow: "hidden",
  },

  blob: {
    position: "absolute",
    width: 520, height: 520,
    borderRadius: "50%",
    filter: "blur(42px)",
    opacity: .65,
    pointerEvents: "none",
    zIndex: 0,
    mixBlendMode: "screen",
  },

  /* ── header ── */
  header: {
    width: "100%",
    maxWidth: 1100,
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "18px 0 16px",
    zIndex: 2,
    flexWrap: "wrap",
    gap: 14,
    borderBottom: "1px solid rgba(255,255,255,.08)",
    marginBottom: 10,
  },

  brandRow: { display:"flex", alignItems:"center", gap:12 },
  brandLogo: {
    width: 46, height: 46, borderRadius: 12,
    objectFit: "cover",
    boxShadow: "0 6px 18px rgba(0,0,0,.4)",
    border: "2px solid rgba(255,255,255,.2)",
  },
  brandName: { fontWeight: 1000, fontSize: 16, color: "#f1f5f9", lineHeight: 1.1 },
  brandSub:  { fontWeight: 700,  fontSize: 11, color: "rgba(255,255,255,.5)", marginTop: 2 },

  clockBox: {
    textAlign: "center",
    background: "rgba(255,255,255,.06)",
    border: "1px solid rgba(255,255,255,.12)",
    borderRadius: 14,
    padding: "8px 20px",
    backdropFilter: "blur(8px)",
  },
  clockTime: { fontWeight: 1000, fontSize: 22, color: "#f1f5f9", letterSpacing: ".04em", lineHeight: 1 },
  clockDate: { fontSize: 12, color: "rgba(255,255,255,.5)", fontWeight: 700, marginTop: 3 },

  userChip: {
    display: "flex", alignItems: "center", gap: 10,
    background: "rgba(255,255,255,.1)",
    backdropFilter: "blur(12px)",
    border: "1px solid rgba(255,255,255,.18)",
    borderRadius: 999,
    padding: "7px 16px 7px 7px",
    boxShadow: "0 4px 14px rgba(0,0,0,.25)",
  },
  avatar: {
    width: 34, height: 34, borderRadius: "50%",
    background: "linear-gradient(135deg,#f97316,#ec4899)",
    color: "#fff", fontWeight: 1000, fontSize: 15,
    display: "flex", alignItems: "center", justifyContent: "center",
    boxShadow: "0 3px 10px rgba(0,0,0,.3)",
    flexShrink: 0,
  },
  userHello: { fontSize: 10, color: "rgba(255,255,255,.6)", fontWeight: 700 },
  userName:  { fontSize: 14, color: "#fff", fontWeight: 900 },

  btnSettings: {
    padding: "9px 14px",
    background: "rgba(255,255,255,.12)",
    backdropFilter: "blur(8px)",
    border: "1px solid rgba(255,255,255,.2)",
    borderRadius: 12, color: "#fff",
    fontSize: 18, cursor: "pointer",
    boxShadow: "0 4px 12px rgba(0,0,0,.2)",
  },
  btnLogout: {
    padding: "9px 18px",
    background: "rgba(220,38,38,.3)",
    backdropFilter: "blur(8px)",
    border: "1px solid rgba(252,165,165,.3)",
    borderRadius: 12, color: "#fff",
    fontWeight: 900, fontSize: 14,
    cursor: "pointer",
    fontFamily: "inherit",
    boxShadow: "0 4px 14px rgba(220,38,38,.25)",
  },

  /* ── main ── */
  main: {
    width: "100%",
    maxWidth: 1100,
    zIndex: 2,
    flex: 1,
  },

  hero: { textAlign: "center", marginBottom: 32, paddingTop: 16 },
  heroTitle: {
    margin: 0,
    fontWeight: 1000, fontSize: 32, color: "#f1f5f9",
    letterSpacing: "-.01em",
    textShadow: "0 4px 24px rgba(0,0,0,.4)",
  },
  heroSub: {
    margin: "8px 0 0",
    color: "rgba(255,255,255,.55)",
    fontWeight: 700, fontSize: 15,
  },

  /* ── grid ── */
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(160px,1fr))",
    gap: "1.1rem",
  },

  /* ── individual tile ── */
  tile: {
    position: "relative",
    overflow: "hidden",
    borderRadius: 22,
    border: "1.5px solid rgba(255,255,255,.22)",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    gap: "0.55rem",
    padding: "22px 10px 20px",
    cursor: "pointer",
    fontFamily: "Cairo,'Segoe UI',sans-serif",
    color: "#fff",
    minHeight: 150,
    textAlign: "center",
  },

  /* shimmer overlay */
  tileShimmer: {
    position: "absolute",
    top: 0, left: "-100%",
    width: "60%", height: "100%",
    background: "linear-gradient(90deg,transparent,rgba(255,255,255,.18),transparent)",
    transform: "skewX(-20deg)",
    pointerEvents: "none",
  },

  tileIconWrap: {
    width: 60, height: 60,
    borderRadius: 18,
    background: "rgba(255,255,255,.18)",
    backdropFilter: "blur(6px)",
    display: "flex", alignItems: "center", justifyContent: "center",
    boxShadow: "0 4px 14px rgba(0,0,0,.2)",
    border: "1.5px solid rgba(255,255,255,.25)",
    flexShrink: 0,
  },
  tileIcon:  { fontSize: "1.9rem", lineHeight: 1 },
  tileLabel: {
    fontWeight: 900, fontSize: "0.88rem",
    color: "#fff",
    textShadow: "0 1px 4px rgba(0,0,0,.35)",
    lineHeight: 1.3,
    maxWidth: 130,
  },

  empty: {
    textAlign: "center",
    color: "rgba(255,255,255,.7)",
    padding: "60px 0",
    fontFamily: "inherit",
  },

  footer: {
    color: "rgba(255,255,255,.3)",
    fontSize: 12, fontWeight: 700,
    marginTop: 20, zIndex: 2,
  },
};
