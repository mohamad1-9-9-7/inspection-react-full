// Login.jsx - username + password login page
import React, { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import "./Login.css";
import logo from "../assets/almawashi-logo.jpg";
import API_BASE from "../config/api";

function Login() {
  const navigate = useNavigate();
  const location = useLocation();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPass, setShowPass] = useState(false);

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
        setError("Server not updated yet - deploy index.cjs first");
        setLoading(false);
        return;
      }

      const data = await res.json();

      if (data.ok && data.user) {
        localStorage.setItem(
          "currentUser",
          JSON.stringify({
            username: data.user.username,
            displayName: data.user.displayName,
            role: data.user.isAdmin ? "Admin" : "Staff",
            permissions: data.user.permissions,
            employees: data.user.employees || [],
            crudPerms: data.user.crudPerms || {},
            allowedBranches: data.user.allowedBranches || [],
            isAdmin: data.user.isAdmin,
            isSuperAdmin: data.user.isSuperAdmin || false,
            type: "named",
            loginAt: Date.now(),
          })
        );
        navigate("/named-dashboard");
      } else {
        const errMap = {
          invalid_credentials: "Wrong username or password",
          account_disabled: "This account is disabled",
          too_many_attempts: "Too many attempts - wait 1 minute",
        };
        setError(errMap[data.error] || "Login failed");
      }
    } catch {
      setError("Could not connect to server");
    }

    setLoading(false);
  };

  return (
    <main style={S.shell}>
      <style>{`
        @media (max-width: 980px) {
          .login-modern-layout { grid-template-columns: 1fr !important; }
          .login-modern-side { min-height: auto !important; }
        }
        .login-modern-input:focus {
          border-color: #0f766e !important;
          box-shadow: 0 0 0 4px rgba(15, 118, 110, 0.18) !important;
          background: #fff !important;
          outline: none;
        }
        .login-modern-button:not(:disabled):hover {
          transform: translateY(-2px);
          box-shadow: 0 24px 44px rgba(15, 118, 110, 0.30) !important;
        }
        .login-modern-button:not(:disabled):active {
          transform: translateY(0);
        }
      `}</style>

      <section className="login-modern-layout" style={S.layout}>
        <aside className="login-modern-side" style={S.side}>
          <div style={S.sideGlow} aria-hidden="true" />
          <div style={S.brandRow}>
            <img src={logo} alt="Al Mawashi" style={S.logo} />
            <div style={{ minWidth: 0 }}>
              <div style={S.company}>TRANS EMIRATES LIVESTOCK TRADING L.L.C.</div>
              <div style={S.companySub}>AL MAWASHI - Quality Management System</div>
            </div>
          </div>

          <div style={S.heroText}>
            <p style={S.eyebrow}>InspectPro QMS</p>
            <h1 style={S.title}>Secure access for inspection, HACCP, ISO, and operations records.</h1>
            <p style={S.subtitle}>
              Sign in once to reach your assigned dashboards, branches, registers, reports, and approval tools.
            </p>
          </div>

          <div style={S.stats}>
            <div style={S.stat}>
              <strong>ISO</strong>
              <span>22000 / HACCP</span>
            </div>
            <div style={S.stat}>
              <strong>QMS</strong>
              <span>Live operations</span>
            </div>
          </div>
        </aside>

        <section style={S.card}>
          <div style={S.cardHeader}>
            <div style={S.cardMark}>IP</div>
            <div>
              <h2 style={S.cardTitle}>Sign in</h2>
              <p style={S.cardSub}>Use your system account to continue.</p>
            </div>
          </div>

          <form onSubmit={handleSubmit} style={S.form}>
            <label style={S.field}>
              <span style={S.label}>Username</span>
              <input
                className="login-modern-input"
                type="text"
                autoFocus
                autoComplete="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter your username"
                style={S.input}
              />
            </label>

            <label style={S.field}>
              <span style={S.label}>Password</span>
              <div style={S.passwordWrap}>
                <input
                  className="login-modern-input"
                  type={showPass ? "text" : "password"}
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  style={{ ...S.input, paddingRight: 104 }}
                />
                <button
                  type="button"
                  onClick={() => setShowPass((v) => !v)}
                  style={S.showButton}
                >
                  {showPass ? "Hide" : "Show"}
                </button>
              </div>
            </label>

            {error && <div style={S.error}>{error}</div>}

            <button
              type="submit"
              disabled={loading}
              className="login-modern-button"
              style={{
                ...S.submit,
                opacity: loading ? 0.72 : 1,
                cursor: loading ? "not-allowed" : "pointer",
              }}
            >
              {loading ? "Signing in..." : "Sign In"}
            </button>
          </form>

          <div style={S.footer}>Built by Eng. Mohammed Abdullah</div>
        </section>
      </section>
    </main>
  );
}

const S = {
  shell: {
    minHeight: "100vh",
    padding: "24px clamp(16px, 3vw, 48px)",
    background: "linear-gradient(180deg, #f8fafc 0%, #eef7f4 44%, #f8fafc 100%)",
    color: "#0f172a",
    fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    display: "grid",
    placeItems: "center",
  },
  layout: {
    width: "min(1320px, 100%)",
    display: "grid",
    gridTemplateColumns: "minmax(0, 1.15fr) minmax(420px, 0.85fr)",
    gap: 22,
    alignItems: "stretch",
  },
  side: {
    position: "relative",
    overflow: "hidden",
    minHeight: 650,
    borderRadius: 8,
    padding: "34px clamp(24px, 4vw, 56px)",
    background: "linear-gradient(135deg, rgba(15,23,42,0.96), rgba(15,118,110,0.94) 52%, rgba(8,145,178,0.92))",
    color: "#fff",
    border: "1px solid rgba(255,255,255,0.20)",
    boxShadow: "0 24px 64px rgba(15,23,42,0.22)",
    display: "flex",
    flexDirection: "column",
    justifyContent: "space-between",
    gap: 36,
  },
  sideGlow: {
    position: "absolute",
    inset: 0,
    background:
      "radial-gradient(820px 260px at 12% 0%, rgba(45,212,191,0.28), transparent 62%)," +
      "radial-gradient(760px 300px at 90% 20%, rgba(125,211,252,0.22), transparent 60%)",
    pointerEvents: "none",
  },
  brandRow: {
    position: "relative",
    display: "flex",
    alignItems: "center",
    gap: 16,
  },
  logo: {
    width: 78,
    height: 78,
    borderRadius: 8,
    objectFit: "cover",
    border: "1px solid rgba(255,255,255,0.34)",
    background: "#fff",
    boxShadow: "0 16px 30px rgba(0,0,0,0.25)",
    flexShrink: 0,
  },
  company: {
    fontWeight: 1000,
    color: "rgba(255,255,255,0.92)",
    letterSpacing: "0.03em",
    lineHeight: 1.2,
  },
  companySub: {
    marginTop: 6,
    fontWeight: 800,
    color: "rgba(255,255,255,0.72)",
    lineHeight: 1.3,
  },
  heroText: {
    position: "relative",
    maxWidth: 820,
  },
  eyebrow: {
    margin: 0,
    fontWeight: 900,
    color: "rgba(255,255,255,0.78)",
    letterSpacing: "0.08em",
    textTransform: "uppercase",
  },
  title: {
    margin: "12px 0 0",
    fontWeight: 1000,
    lineHeight: 1.08,
    letterSpacing: 0,
  },
  subtitle: {
    margin: "18px 0 0",
    color: "rgba(255,255,255,0.82)",
    lineHeight: 1.5,
    fontWeight: 700,
  },
  stats: {
    position: "relative",
    display: "grid",
    gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
    gap: 12,
  },
  stat: {
    borderRadius: 8,
    padding: "18px 20px",
    background: "rgba(255,255,255,0.12)",
    border: "1px solid rgba(255,255,255,0.22)",
    backdropFilter: "blur(12px)",
    display: "flex",
    flexDirection: "column",
    gap: 8,
  },
  card: {
    borderRadius: 8,
    background: "#fff",
    border: "1px solid rgba(15,23,42,0.12)",
    boxShadow: "0 22px 54px rgba(15,23,42,0.14)",
    padding: "34px clamp(22px, 3vw, 42px)",
    display: "flex",
    flexDirection: "column",
    justifyContent: "center",
    minHeight: 650,
  },
  cardHeader: {
    display: "flex",
    alignItems: "center",
    gap: 16,
    marginBottom: 34,
  },
  cardMark: {
    width: 64,
    height: 64,
    borderRadius: 8,
    display: "grid",
    placeItems: "center",
    background: "#ccfbf1",
    color: "#0f766e",
    border: "1px solid #99f6e4",
    fontWeight: 1000,
    flexShrink: 0,
  },
  cardTitle: {
    margin: 0,
    fontWeight: 1000,
    lineHeight: 1.1,
  },
  cardSub: {
    margin: "8px 0 0",
    color: "#64748b",
    fontWeight: 800,
    lineHeight: 1.35,
  },
  form: {
    display: "grid",
    gap: 22,
  },
  field: {
    display: "grid",
    gap: 9,
  },
  label: {
    color: "#334155",
    fontWeight: 950,
  },
  input: {
    width: "100%",
    minHeight: 58,
    padding: "14px 16px",
    borderRadius: 8,
    border: "1.5px solid #dbe4ef",
    background: "#f8fafc",
    color: "#0f172a",
    fontFamily: "inherit",
    fontWeight: 800,
    boxSizing: "border-box",
    transition: "border-color .15s, box-shadow .15s, background .15s",
  },
  passwordWrap: {
    position: "relative",
  },
  showButton: {
    position: "absolute",
    right: 10,
    top: "50%",
    transform: "translateY(-50%)",
    minWidth: 80,
    minHeight: 40,
    borderRadius: 8,
    border: "1px solid rgba(15,23,42,0.12)",
    background: "#fff",
    color: "#0f766e",
    cursor: "pointer",
    fontWeight: 950,
  },
  error: {
    padding: "13px 15px",
    borderRadius: 8,
    background: "#fef2f2",
    color: "#991b1b",
    border: "1px solid #fecaca",
    fontWeight: 900,
    lineHeight: 1.35,
  },
  submit: {
    minHeight: 62,
    width: "100%",
    borderRadius: 8,
    border: "none",
    background: "linear-gradient(135deg, #0f766e, #0891b2)",
    color: "#fff",
    cursor: "pointer",
    fontWeight: 1000,
    fontFamily: "inherit",
    boxShadow: "0 18px 34px rgba(15,118,110,0.24)",
    transition: "transform .16s ease, box-shadow .16s ease, opacity .16s ease",
  },
  footer: {
    marginTop: 24,
    color: "#94a3b8",
    fontWeight: 800,
    textAlign: "center",
  },
};

export default Login;
