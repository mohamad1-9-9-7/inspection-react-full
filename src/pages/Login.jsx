// Login.jsx — simple username + password login page
import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import './Login.css';
import logo from '../assets/almawashi-logo.jpg';
import API_BASE from '../config/api';

/* ─── Theme palettes ─── */
const LIGHT_THEME = {
  bgFrom: '#0ea5e9', bgMid: '#7c3aed', bgTo: '#111827',
};
const DARK_THEME = {
  bgFrom: '#020617', bgMid: '#1e1b4b', bgTo: '#000000',
};

/* ═══════════════════════════════════════════════════
   LOGIN PAGE
═══════════════════════════════════════════════════ */
function Login() {
  const navigate  = useNavigate();
  const location  = useLocation();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error,    setError]    = useState("");
  const [loading,  setLoading]  = useState(false);
  const [showPass, setShowPass] = useState(false);

  /* 🌓 Theme */
  const [theme, setTheme] = useState(() => {
    try { return localStorage.getItem("theme") || "light"; } catch { return "light"; }
  });
  const isDark = theme === "dark";
  const t = isDark ? DARK_THEME : LIGHT_THEME;
  useEffect(() => {
    try { localStorage.setItem("theme", theme); } catch {}
    document.documentElement.setAttribute("data-theme", theme);
  }, [theme]);

  if (location.pathname !== "/") return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) {
      setError("Please enter username and password");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`${API_BASE}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: username.trim(), password }),
      });
      if (res.status === 404) {
        setError("⚠️ Server not updated yet — deploy index.cjs first");
        setLoading(false);
        return;
      }
      const data = await res.json();
      if (data.ok && data.user) {
        localStorage.setItem("currentUser", JSON.stringify({
          username:        data.user.username,
          displayName:     data.user.displayName,
          role:            data.user.isAdmin ? "Admin" : "Staff",
          permissions:     data.user.permissions,
          employees:       data.user.employees       || [],
          crudPerms:       data.user.crudPerms        || {},
          allowedBranches: data.user.allowedBranches  || [], // [] = all branches
          isAdmin:         data.user.isAdmin,
          isSuperAdmin:    data.user.isSuperAdmin || false,
          type:            "named",
          loginAt:         Date.now(),   // ← session expiry anchor
        }));
        navigate("/named-dashboard");
      } else {
        const errMap = {
          invalid_credentials: "❌ Wrong username or password",
          account_disabled:    "🔒 This account is disabled",
          too_many_attempts:   "⏳ Too many attempts — wait 1 minute",
        };
        setError(errMap[data.error] || "❌ Login failed");
      }
    } catch {
      setError("❌ Could not connect to server");
    }
    setLoading(false);
  };

  const bg = `linear-gradient(135deg, ${t.bgFrom} 0%, ${t.bgMid} 55%, ${t.bgTo} 100%)`;

  return (
    <div style={{
      minHeight: "100vh",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      background: bg,
      fontFamily: "Cairo, 'Segoe UI', sans-serif",
      position: "relative",
      overflow: "hidden",
      padding: "1.5rem 1rem",
    }}>

      {/* ── animated blobs ── */}
      <style>{`
        .lp-blob{position:absolute;width:520px;height:520px;border-radius:999px;
          filter:blur(36px);opacity:.68;pointer-events:none;z-index:0;
          mix-blend-mode:screen;animation:lpFloat 18s ease-in-out infinite;}
        .lp-blob.b1{left:-200px;top:-180px;background:radial-gradient(circle at 30% 30%,
          rgba(34,211,238,.88),rgba(59,130,246,.14) 60%,transparent 72%);}
        .lp-blob.b2{right:-240px;top:-160px;background:radial-gradient(circle at 30% 30%,
          rgba(124,58,237,.88),rgba(236,72,153,.12) 60%,transparent 72%);animation-duration:21s;}
        .lp-blob.b3{left:22%;bottom:-260px;background:radial-gradient(circle at 30% 30%,
          rgba(34,197,94,.78),rgba(16,185,129,.12) 60%,transparent 72%);animation-duration:23s;}
        @keyframes lpFloat{
          0%  {transform:translate3d(0,0,0) scale(1)}
          50% {transform:translate3d(44px,-20px,0) scale(1.07)}
          100%{transform:translate3d(0,0,0) scale(1)}
        }
        .lp-input:focus{
          border-color:#7c3aed !important;
          box-shadow:0 0 0 3px rgba(124,58,237,.18) !important;
          outline:none;
        }
        .lp-btn:not(:disabled):hover  { opacity:.9; transform:translateY(-1px); }
        .lp-btn:not(:disabled):active { transform:scale(.97); }
      `}</style>
      <div className="lp-blob b1" />
      <div className="lp-blob b2" />
      <div className="lp-blob b3" />

      {/* ── Card ── */}
      <div style={{
        position: "relative", zIndex: 2,
        background: "rgba(255,255,255,0.94)",
        backdropFilter: "blur(16px)",
        borderRadius: 28,
        padding: "2.8rem 3rem",
        width: "min(430px, 95vw)",
        boxShadow: "0 30px 80px rgba(0,0,0,.24)",
        border: "1px solid rgba(255,255,255,.72)",
      }}>

        {/* Logo + heading */}
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <img
            src={logo}
            alt="Al Mawashi"
            style={{
              width: 80, height: 80, borderRadius: "50%",
              objectFit: "cover", marginBottom: 14,
              boxShadow: "0 8px 28px rgba(0,0,0,.18)",
            }}
          />
          <div style={{ fontWeight: 1000, fontSize: 22, color: "#0f172a", marginBottom: 4 }}>
            Al Mawashi Quality System
          </div>
          <div style={{ fontSize: 15, color: "#64748b", fontWeight: 700 }}>
            Sign in to your account
          </div>
        </div>

        <form onSubmit={handleSubmit}>

          {/* Username */}
          <div style={{ marginBottom: 18 }}>
            <label style={lpS.label}>Username</label>
            <input
              className="lp-input"
              type="text"
              autoFocus
              autoComplete="username"
              value={username}
              onChange={e => setUsername(e.target.value)}
              placeholder="Enter your username"
              style={lpS.input}
            />
          </div>

          {/* Password */}
          <div style={{ marginBottom: 24, position: "relative" }}>
            <label style={lpS.label}>Password</label>
            <input
              className="lp-input"
              type={showPass ? "text" : "password"}
              autoComplete="current-password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="Enter your password"
              style={{ ...lpS.input, paddingRight: 46 }}
            />
            <button
              type="button"
              tabIndex={-1}
              onClick={() => setShowPass(v => !v)}
              style={{
                position: "absolute", right: 13, bottom: 11,
                background: "none", border: "none",
                cursor: "pointer", fontSize: 19,
                color: "#94a3b8", padding: 2, lineHeight: 1,
              }}
            >
              {showPass ? "🙈" : "👁️"}
            </button>
          </div>

          {/* Error message */}
          {error && (
            <div style={{
              color: "#991b1b", fontWeight: 800, marginBottom: 18,
              fontSize: 15, background: "#fee2e2",
              padding: "10px 14px", borderRadius: 10,
              border: "1px solid #fca5a5",
            }}>
              {error}
            </div>
          )}

          {/* Submit button */}
          <button
            type="submit"
            disabled={loading}
            className="lp-btn"
            style={{
              width: "100%",
              background: loading
                ? "#a5b4fc"
                : "linear-gradient(135deg, #7c3aed, #2563eb)",
              color: "#fff", border: "none",
              padding: "15px 0", borderRadius: 14,
              fontWeight: 900, fontSize: 18,
              cursor: loading ? "not-allowed" : "pointer",
              boxShadow: "0 8px 22px rgba(124,58,237,.38)",
              fontFamily: "inherit",
              transition: "opacity .15s, transform .15s",
              letterSpacing: ".3px",
            }}
          >
            {loading ? "Signing in…" : "→  Sign In"}
          </button>
        </form>

        {/* Theme toggle */}
        <div style={{ textAlign: "center", marginTop: 22 }}>
          <button
            onClick={() => setTheme(prev => prev === "dark" ? "light" : "dark")}
            style={{
              background: "none", border: "none",
              color: "#94a3b8", fontSize: 13,
              cursor: "pointer", fontFamily: "inherit", fontWeight: 700,
            }}
          >
            {isDark ? "☀️ Light Mode" : "🌙 Dark Mode"}
          </button>
        </div>
      </div>

      {/* Footer */}
      <div style={{
        position: "absolute", bottom: 16, left: 0, right: 0,
        textAlign: "center",
        color: "rgba(255,255,255,.50)",
        fontSize: 13, fontWeight: 600, zIndex: 1,
      }}>
        Built by Eng. Mohammed Abdullah
      </div>
    </div>
  );
}

/* ─── Styles ─── */
const lpS = {
  label: {
    display: "block",
    fontSize: 14, fontWeight: 900,
    color: "#475569",
    textTransform: "uppercase",
    letterSpacing: ".05em",
    marginBottom: 7,
  },
  input: {
    width: "100%",
    padding: "13px 15px",
    border: "1.5px solid #e2e8f0",
    borderRadius: 12,
    fontSize: 16,
    background: "#f8fafc",
    fontFamily: "inherit",
    boxSizing: "border-box",
    color: "#0f172a",
    transition: "border-color .15s, box-shadow .15s",
  },
};

export default Login;
