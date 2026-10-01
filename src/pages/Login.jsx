// Login.jsx - username + password login page (INSPECT PRO platform screen)
import React, { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import "./Login.css";
import API_BASE from "../config/api";
import { SUB_CACHE_KEY, writeSubscriptionCache } from "../utils/subscriptionLock";

const BRAND = "/brand/inspect-pro";

// The approved "Scan ring" mark (same paths as public/brand/inspect-pro/mark*.svg).
function ScanRing({ ring = "#fff", className }) {
  return (
    <svg className={className} viewBox="0 0 124 124" aria-hidden="true">
      <g transform="translate(4,4)">
        <path d="M88 52 A36 36 0 1 1 52 16" fill="none" stroke={ring} strokeWidth="11" strokeLinecap="round" />
        <path className="lp-arc" d="M52 16 A36 36 0 0 1 88 52" fill="none" stroke="#0EA5A4" strokeWidth="11" strokeLinecap="round" />
        <path d="M80 80 L104 104" stroke={ring} strokeWidth="14" strokeLinecap="round" />
        <path className="lp-check" d="M33 53 L47 67 L73 39" fill="none" stroke="#0EA5A4" strokeWidth="9" strokeLinecap="round" strokeLinejoin="round" />
      </g>
    </svg>
  );
}

const Icon = {
  shield: <path d="M12 3l8 3v6c0 4.5-3.4 8.3-8 9-4.6-.7-8-4.5-8-9V6l8-3z M8.5 12l2.5 2.5 4.5-5" />,
  clipboard: <path d="M9 4h6v3H9z M7 5H5v16h14V5h-2 M8.5 13l2.5 2.5 4.5-5" />,
  route: <path d="M6 19a2 2 0 100-4 2 2 0 000 4z M18 9a2 2 0 100-4 2 2 0 000 4z M8 17h7a3 3 0 000-6H9a3 3 0 010-6h7" />,
  alert: <path d="M12 4l9 16H3l9-16z M12 10v4 M12 17h.01" />,
  truck: <path d="M3 6h11v10H3z M14 10h4l3 3v3h-7 M7 19a2 2 0 100-4 2 2 0 000 4z M17 19a2 2 0 100-4 2 2 0 000 4z" />,
  users: <path d="M9 11a3 3 0 100-6 3 3 0 000 6z M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6 M16 5.5a3 3 0 010 5.5 M21 20c0-2.6-1.6-4.8-4-5.6" />,
  user: <path d="M12 12a4 4 0 100-8 4 4 0 000 8z M4 21c0-4.4 3.6-8 8-8s8 3.6 8 8" />,
  lock: <path d="M6 11h12v10H6z M8 11V8a4 4 0 018 0v3 M12 15v2" />,
  eye: <path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z M12 15a3 3 0 100-6 3 3 0 000 6z" />,
  eyeOff: <path d="M3 3l18 18 M10.6 5.1A10.6 10.6 0 0112 5c6.4 0 10 7 10 7a17 17 0 01-3.2 4 M6.6 6.6C3.8 8.4 2 12 2 12s3.6 7 10 7c1.6 0 3-.4 4.3-1 M9.9 9.9a3 3 0 004.2 4.2" />,
  arrow: <path d="M5 12h14 M13 6l6 6-6 6" />,
};
function Ico({ name, className = "lp-ico" }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {Icon[name]}
    </svg>
  );
}

const FEATURES = [
  { icon: "shield", title: "HACCP & ISO 22000", text: "Food safety plans, CCP logs and verification records." },
  { icon: "clipboard", title: "Inspections & audits", text: "Branch checklists, internal audits and evidence." },
  { icon: "route", title: "Traceability", text: "From receiving to shelf: batch, origin and expiry." },
  { icon: "alert", title: "NCR & CAPA", text: "Close every finding with root cause and follow-up." },
  { icon: "truck", title: "Suppliers", text: "Evaluations, documents and approved supplier list." },
  { icon: "users", title: "Training & HSE", text: "Staff training, risk registers and health records." },
];

const TRUST = ["Role-based access", "Full audit trail", "Works offline", "English & Arabic"];

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
        if (data.token) localStorage.setItem("authToken", data.token);
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
            // نوع نشاط شركة الحساب — يثبّت أي نظام يفتح له (مواشي = النظام
            // الحالي، غيره = المحرّك العام). مخزّن هنا حتى يقرأه getActiveIndustry
            // بلا نداء إضافي.
            companyIndustry: data.user.company?.industry || "meat",
            // Which code module the company runs (src/companies/<module>/).
            companyModule: data.user.company?.module || "",
            companyName: data.user.company?.name || "",
            // null = platform account (super-admin). The in-app subscription
            // lock in App.jsx only ever judges an account by its OWN company.
            companyId: data.user.companyId || null,
            type: "named",
            loginAt: Date.now(),
          })
        );
        // The login response already carries the company's subscription
        // state — seed the lock's cache from it instead of a pre-login read.
        if (data.user.company?.id && !data.user.isSuperAdmin) {
          writeSubscriptionCache(data.user.company.id, data.user.company);
        } else {
          localStorage.removeItem(SUB_CACHE_KEY);
        }
        // مالك المنصّة (سوبر أدمن) ما إلوش شركة ثابتة بالتوكن — بيختارها كل
        // مرة من شاشة الكروت. الحساب العادي بيروح لنظام شركته: نشاط 'meat'
        // = الداشبورد الحالي، أي نشاط تاني = المحرّك العام.
        if (data.user.isSuperAdmin) {
          navigate("/select-company");
        } else if (data.user.company?.industry && data.user.company.industry !== "meat") {
          navigate("/company-app");
        } else {
          navigate("/named-dashboard");
        }
      } else {
        const errMap = {
          invalid_credentials: "Wrong username or password",
          account_disabled: "This account is disabled",
          too_many_attempts: "Too many attempts - wait 1 minute",
          company_disabled: "This company is disabled. Contact the platform administrator.",
          subscription_lapsed: "This company's subscription has ended. Contact the platform administrator.",
        };
        setError(errMap[data.error] || "Login failed");
      }
    } catch {
      setError("Could not connect to server");
    }

    setLoading(false);
  };

  return (
    <main className="lp" dir="ltr">
      <style>{LP_CSS}</style>

      <section className="lp-layout">
        <aside className="lp-side">
          <ScanRing className="lp-watermark" ring="rgba(255,255,255,0.07)" />

          <div className="lp-brand">
            <ScanRing className="lp-brand-mark" />
            <div>
              <div className="lp-word">
                INSPECT <span>PRO</span>
              </div>
              <div className="lp-tagline">FOOD SAFETY · QUALITY · COMPLIANCE</div>
            </div>
          </div>

          <div className="lp-hero">
            <h1 className="lp-title">
              Every check, record and audit — <em>in one trusted place.</em>
            </h1>
            <p className="lp-sub">
              The quality management system for food businesses: from receiving and production to branches,
              suppliers and certification audits.
            </p>
          </div>

          <ul className="lp-features">
            {FEATURES.map((f) => (
              <li key={f.title} className="lp-feature">
                <span className="lp-feature-ico"><Ico name={f.icon} /></span>
                <span>
                  <strong className="lp-feature-title">{f.title}</strong>
                  <span className="lp-feature-text">{f.text}</span>
                </span>
              </li>
            ))}
          </ul>

          <div className="lp-trust">
            {TRUST.map((t) => (
              <span key={t} className="lp-chip">
                <span className="lp-dot" />
                {t}
              </span>
            ))}
          </div>
        </aside>

        <section className="lp-card">
          <img className="lp-card-logo" src={`${BRAND}/logo-light.png`} alt="INSPECT PRO" />

          <div className="lp-card-head">
            <h2 className="lp-card-title">Welcome back</h2>
            <p className="lp-card-sub">Sign in with your company account to continue.</p>
          </div>

          <form onSubmit={handleSubmit} className="lp-form">
            <label className="lp-field">
              <span className="lp-label">Username</span>
              <span className="lp-input-wrap">
                <Ico name="user" className="lp-ico lp-input-ico" />
                <input
                  className="lp-input"
                  type="text"
                  autoFocus
                  autoComplete="username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Enter your username"
                />
              </span>
            </label>

            <label className="lp-field">
              <span className="lp-label">Password</span>
              <span className="lp-input-wrap">
                <Ico name="lock" className="lp-ico lp-input-ico" />
                <input
                  className="lp-input lp-input-pass"
                  type={showPass ? "text" : "password"}
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                />
                <button
                  type="button"
                  className="lp-show"
                  onClick={() => setShowPass((v) => !v)}
                  aria-label={showPass ? "Hide password" : "Show password"}
                  title={showPass ? "Hide password" : "Show password"}
                >
                  <Ico name={showPass ? "eyeOff" : "eye"} />
                </button>
              </span>
            </label>

            {error && <div className="lp-error" role="alert">{error}</div>}

            <button type="submit" disabled={loading} className="lp-submit">
              {loading ? (
                <>
                  <span className="lp-spin" /> Signing in...
                </>
              ) : (
                <>
                  Sign in <Ico name="arrow" />
                </>
              )}
            </button>
          </form>

          <div className="lp-secure">
            <Ico name="lock" /> Encrypted connection · your data stays with your company
          </div>

          <div className="lp-demo">
            <div>
              <strong className="lp-demo-title">New to INSPECT PRO?</strong>
              <span className="lp-demo-text">See how it works for your company.</span>
            </div>
            <button type="button" onClick={() => navigate("/demo")} className="lp-demo-btn">
              Request a free demo
            </button>
          </div>

          <div className="lp-footer">
            © {new Date().getFullYear()} INSPECT PRO · Built by Eng. Mohammed Abdullah
          </div>
        </section>
      </section>
    </main>
  );
}

// globals.css forces `#root * { font-size: 14px !important }`, so every size here
// is scoped under a doubled class (`.lp.lp`) with !important to out-rank it.
const LP_CSS = `
@import url('https://fonts.googleapis.com/css2?family=Montserrat:wght@600;700;800&display=swap');

#root .lp.lp {
  --navy: #0B1E3F; --teal: #0EA5A4; --teal-d: #0f766e;
  min-height: 100vh; box-sizing: border-box;
  padding: 24px clamp(16px, 3vw, 48px);
  display: grid; place-items: center;
  background:
    radial-gradient(900px 500px at 0% 0%, rgba(14,165,164,0.10), transparent 60%),
    radial-gradient(800px 500px at 100% 100%, rgba(11,30,63,0.08), transparent 60%),
    #f4f7fb;
  color: #0f172a;
  font-family: system-ui, -apple-system, "Segoe UI", sans-serif;
}
#root .lp.lp * { box-sizing: border-box; }
#root .lp.lp .lp-layout {
  width: min(1240px, 100%);
  display: grid; grid-template-columns: minmax(0, 1.2fr) minmax(400px, 0.8fr);
  border-radius: 20px; overflow: hidden;
  background: #fff;
  box-shadow: 0 30px 80px rgba(11,30,63,0.18), 0 2px 6px rgba(11,30,63,0.06);
}

/* ---------- brand side ---------- */
#root .lp.lp .lp-side {
  position: relative; overflow: hidden;
  padding: 40px clamp(24px, 4vw, 52px);
  display: flex; flex-direction: column; gap: 30px;
  color: #fff;
  background:
    radial-gradient(600px 300px at 100% 0%, rgba(14,165,164,0.35), transparent 65%),
    radial-gradient(500px 300px at 0% 100%, rgba(14,165,164,0.18), transparent 65%),
    linear-gradient(160deg, #0B1E3F 0%, #0d2a52 55%, #0c3550 100%);
}
#root .lp.lp .lp-watermark {
  position: absolute; width: 520px; height: 520px; right: -150px; bottom: -150px;
  pointer-events: none;
}
#root .lp.lp .lp-watermark .lp-arc, #root .lp.lp .lp-watermark .lp-check { stroke: rgba(14,165,164,0.14); }
#root .lp.lp .lp-brand { position: relative; display: flex; align-items: center; gap: 16px; }
#root .lp.lp .lp-brand-mark { width: 62px; height: 62px; flex-shrink: 0; }
#root .lp.lp .lp-brand-mark .lp-arc { animation: lp-pulse 2.8s ease-in-out infinite; }
#root .lp.lp .lp-word {
  font-family: Montserrat, system-ui, sans-serif; font-weight: 800;
  font-size: calc(30px * var(--app-fs, 1)) !important; letter-spacing: 0.02em; line-height: 1;
}
#root .lp.lp .lp-word span { color: var(--teal); font-size: inherit !important; }
#root .lp.lp .lp-tagline {
  margin-top: 8px; font-family: Montserrat, system-ui, sans-serif; font-weight: 600;
  font-size: calc(11px * var(--app-fs, 1)) !important; letter-spacing: 0.22em; color: #9fb3cf;
}
#root .lp.lp .lp-hero { position: relative; max-width: 620px; }
#root .lp.lp .lp-title {
  margin: 0; font-weight: 800; line-height: 1.15; letter-spacing: -0.01em;
  font-size: calc(32px * var(--app-fs, 1)) !important;
}
#root .lp.lp .lp-title em { font-style: normal; color: #5eead4; font-size: inherit !important; }
#root .lp.lp .lp-sub {
  margin: 14px 0 0; color: #c3d1e6; line-height: 1.6; font-weight: 500;
  font-size: calc(15px * var(--app-fs, 1)) !important;
}
#root .lp.lp .lp-features {
  position: relative; list-style: none; margin: 0; padding: 0;
  display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px;
}
#root .lp.lp .lp-feature {
  display: flex; gap: 12px; align-items: flex-start;
  padding: 14px; border-radius: 12px;
  background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.10);
  transition: background .2s, border-color .2s, transform .2s;
}
#root .lp.lp .lp-feature:hover { background: rgba(255,255,255,0.09); border-color: rgba(94,234,212,0.35); transform: translateY(-2px); }
#root .lp.lp .lp-feature-ico {
  width: 38px; height: 38px; flex-shrink: 0; border-radius: 10px;
  display: grid; place-items: center;
  background: rgba(14,165,164,0.18); color: #5eead4;
}
#root .lp.lp .lp-ico { width: 20px; height: 20px; display: block; flex-shrink: 0; }
#root .lp.lp .lp-feature-title { display: block; font-weight: 700; color: #fff; }
#root .lp.lp .lp-feature-text {
  display: block; margin-top: 3px; color: #a9bad3; line-height: 1.45;
  font-size: calc(12.5px * var(--app-fs, 1)) !important;
}
#root .lp.lp .lp-trust { position: relative; display: flex; flex-wrap: wrap; gap: 8px; margin-top: auto; }
#root .lp.lp .lp-chip {
  display: inline-flex; align-items: center; gap: 7px;
  padding: 7px 12px; border-radius: 999px;
  background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.12);
  color: #dbe6f5; font-weight: 600; font-size: calc(12.5px * var(--app-fs, 1)) !important;
}
#root .lp.lp .lp-dot { width: 7px; height: 7px; border-radius: 50%; background: #2dd4bf; box-shadow: 0 0 0 3px rgba(45,212,191,0.2); }

/* ---------- sign-in card ---------- */
#root .lp.lp .lp-card {
  padding: 40px clamp(24px, 3.4vw, 48px);
  display: flex; flex-direction: column; justify-content: center;
}
#root .lp.lp .lp-card-logo { display: none; width: min(240px, 80%); height: auto; margin-bottom: 26px; }
#root .lp.lp .lp-card-head { margin-bottom: 24px; }
#root .lp.lp .lp-card-title { margin: 0; font-weight: 800; color: var(--navy); font-size: calc(26px * var(--app-fs, 1)) !important; }
#root .lp.lp .lp-card-sub { margin: 6px 0 0; color: #64748b; font-weight: 500; }
#root .lp.lp .lp-form { display: grid; gap: 18px; }
#root .lp.lp .lp-field { display: grid; gap: 8px; }
#root .lp.lp .lp-label { color: #334155; font-weight: 700; }
#root .lp.lp .lp-input-wrap { position: relative; display: block; }
#root .lp.lp .lp-input-ico { position: absolute; left: 15px; top: 50%; transform: translateY(-50%); color: #94a3b8; pointer-events: none; }
#root .lp.lp .lp-input {
  width: 100%; min-height: 54px; margin: 0;
  padding: 14px 16px 14px 46px; border-radius: 12px;
  border: 1.5px solid #dbe4ef; background: #f8fafc; color: #0f172a;
  font-family: inherit; font-weight: 600; box-shadow: none;
  font-size: calc(15px * var(--app-fs, 1)) !important;
  transition: border-color .15s, box-shadow .15s, background .15s;
}
#root .lp.lp .lp-input-pass { padding-right: 56px; }
#root .lp.lp .lp-input:focus { outline: none; border-color: var(--teal); background: #fff; box-shadow: 0 0 0 4px rgba(14,165,164,0.16); }
#root .lp.lp .lp-input-wrap:focus-within .lp-input-ico { color: var(--teal); }
#root .lp.lp .lp-show {
  position: absolute; right: 8px; top: 50%; transform: translateY(-50%);
  width: 40px; height: 40px; border-radius: 10px; border: none; background: transparent;
  color: #64748b; cursor: pointer; display: grid; place-items: center;
}
#root .lp.lp .lp-show:hover { background: #eef2f7; color: var(--teal-d); }
#root .lp.lp .lp-error {
  padding: 12px 14px; border-radius: 10px;
  background: #fef2f2; color: #991b1b; border: 1px solid #fecaca; font-weight: 700; line-height: 1.4;
}
#root .lp.lp .lp-submit {
  min-height: 56px; width: 100%; border-radius: 12px; border: none;
  display: inline-flex; align-items: center; justify-content: center; gap: 10px;
  background: linear-gradient(135deg, #0B1E3F, #0f766e 70%, #0EA5A4);
  background-size: 160% 100%; background-position: 0 0;
  color: #fff; cursor: pointer; font-weight: 800; font-family: inherit;
  font-size: calc(15px * var(--app-fs, 1)) !important;
  box-shadow: 0 14px 30px rgba(11,30,63,0.22);
  transition: transform .16s, box-shadow .16s, background-position .3s, opacity .16s;
}
#root .lp.lp .lp-submit:not(:disabled):hover { transform: translateY(-2px); background-position: 100% 0; box-shadow: 0 20px 40px rgba(14,165,164,0.30); }
#root .lp.lp .lp-submit:disabled { opacity: .75; cursor: not-allowed; }
#root .lp.lp .lp-submit .lp-ico { transition: transform .16s; }
#root .lp.lp .lp-submit:hover .lp-ico { transform: translateX(3px); }
#root .lp.lp .lp-spin {
  width: 18px; height: 18px; border-radius: 50%;
  border: 2.5px solid rgba(255,255,255,0.35); border-top-color: #fff;
  animation: lp-rot .8s linear infinite;
}
#root .lp.lp .lp-secure {
  margin-top: 14px; display: flex; align-items: center; justify-content: center; gap: 7px;
  color: #64748b; font-weight: 500; font-size: calc(12.5px * var(--app-fs, 1)) !important;
}
#root .lp.lp .lp-secure .lp-ico { width: 15px; height: 15px; color: var(--teal-d); }
#root .lp.lp .lp-demo {
  margin-top: 26px; padding: 16px; border-radius: 14px;
  background: linear-gradient(135deg, #f0fdfa, #ecfeff); border: 1px solid #ccfbf1;
  display: flex; align-items: center; justify-content: space-between; gap: 14px; flex-wrap: wrap;
}
#root .lp.lp .lp-demo-title { display: block; color: var(--navy); font-weight: 800; }
#root .lp.lp .lp-demo-text { display: block; margin-top: 2px; color: #475569; font-size: calc(12.5px * var(--app-fs, 1)) !important; }
#root .lp.lp .lp-demo-btn {
  min-height: 42px; padding: 0 16px; border-radius: 10px;
  border: 1.5px solid var(--teal-d); background: #fff; color: var(--teal-d);
  cursor: pointer; font-weight: 800; font-family: inherit; white-space: nowrap;
  transition: background .15s, color .15s;
}
#root .lp.lp .lp-demo-btn:hover { background: var(--teal-d); color: #fff; }
#root .lp.lp .lp-footer { margin-top: 24px; text-align: center; color: #94a3b8; font-weight: 500; font-size: calc(12px * var(--app-fs, 1)) !important; }

@keyframes lp-rot { to { transform: rotate(360deg); } }
@keyframes lp-pulse { 0%, 100% { opacity: 1; } 50% { opacity: .55; } }
@media (prefers-reduced-motion: reduce) {
  #root .lp.lp *, #root .lp.lp *::before { animation: none !important; transition: none !important; }
}

@media (max-width: 980px) {
  #root .lp.lp .lp-layout { grid-template-columns: 1fr; }
  #root .lp.lp .lp-card { order: -1; }
  #root .lp.lp .lp-card-logo { display: block; }
  #root .lp.lp .lp-features { grid-template-columns: 1fr; }
}
@media (max-width: 560px) {
  #root .lp.lp { padding: 12px; }
  #root .lp.lp .lp-side { padding: 28px 20px; }
  #root .lp.lp .lp-card { padding: 28px 20px; }
  #root .lp.lp .lp-title { font-size: calc(24px * var(--app-fs, 1)) !important; }
  #root .lp.lp .lp-word { font-size: calc(24px * var(--app-fs, 1)) !important; }
  #root .lp.lp .lp-features { display: none; }
}
`;

export default Login;
