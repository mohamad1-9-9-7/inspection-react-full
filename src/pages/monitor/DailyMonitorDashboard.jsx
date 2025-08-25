// src/pages/DailyMonitorDashboard.js
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";

const branches = [
  "QCS",
  "PRODUCTION", // جديد: تبويب الإنتاج
  "POS 6", "POS 7", "POS 10", "POS 11", "POS 14",
  "POS 15", "POS 16", "POS 17",
  "POS 18",
  "POS 19", "POS 21", "POS 24", "POS 25",
  "POS 26",
  "POS 31",
  "POS 34",
  "POS 35",
  "POS 36",
  "POS 37", "POS 38",
  "POS 41",
  "POS 42",
  "POS 43",
  "POS 44", "POS 45",
  "FTR 1",
  "FTR 2",
];

const toSlug = (name) => name.trim().toLowerCase().replace(/\s+/g, "");

/* ==== Icons ==== */
const Svg = (p) => ({
  width: 22, height: 22, viewBox: "0 0 24 24",
  fill: "none", stroke: "currentColor", strokeWidth: 1.8,
  strokeLinecap: "round", strokeLinejoin: "round", ...p
});
const IconStore = () => (
  <svg {...Svg()}>
    <path d="M3 9l1-5h16l1 5" />
    <path d="M4 9h16v10H4z" />
    <path d="M9 13h6" />
  </svg>
);
const IconTruck = () => (
  <svg {...Svg()}>
    <path d="M3 7h10v8H3z" />
    <path d="M13 11h4l3 3v1h-7z" />
    <circle cx="7" cy="18" r="2" />
    <circle cx="18" cy="18" r="2" />
  </svg>
);
const IconShield = () => (
  <svg {...Svg()}>
    <path d="M12 22s7-3 7-10V6l-7-3-7 3v6c0 7 7 10 7 10z" />
    <path d="M9.5 12.5l2 2 3.5-3.5" />
  </svg>
);
/* جديد: أيقونة الإنتاج */
const IconProduction = () => (
  <svg {...Svg()}>
    {/* مبنى مصنع بسيط مع مدخنة */}
    <path d="M3 21V9l5 3V9l5 3V9l5 3v9H3z" />
    <path d="M3 21h18" />
    <path d="M7 21v-3M11 21v-3M15 21v-3M19 21v-3" />
    <path d="M17 6V3h2v4" />
  </svg>
);

export default function DailyMonitorDashboard() {
  const navigate = useNavigate();

  const [showPwd, setShowPwd] = useState(false);
  const [pendingBranch, setPendingBranch] = useState(null);
  const [pwd, setPwd] = useState("");
  const [pwdError, setPwdError] = useState("");

  const goBranch = (branch) => {
    if (branch === "FTR 2") navigate("/monitor/ftr2");
    else if (branch === "FTR 1") navigate("/monitor/ftr1");
    else navigate(`/monitor/${toSlug(branch)}`);
  };

  const handleBranchClick = (branch) => {
    setPendingBranch(branch);
    setPwd("");
    setPwdError("");
    setShowPwd(true);
  };

  const submitPwd = (e) => {
    e?.preventDefault();
    if (!pendingBranch) return;
    const expected = `${pendingBranch}123`; // مثال: QCS -> QCS123
    if (pwd === expected) {
      setShowPwd(false);
      goBranch(pendingBranch);
    } else {
      setPwdError("Incorrect password");
    }
  };

  return (
    <div
      style={{
        padding: 16,
        direction: "ltr",
        fontFamily:
          "Inter, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif",
      }}
    >
      <style>{`
        :root{
          --bg1:#6d28d9; --bg2:#2563eb;
          --panel:#ffffffee; --border:#e5e7eb;
          --text:#0f172a; --muted:#64748b;
          --ring:#2563eb; --ring-soft:rgba(37,99,235,.14);
        }
        body{
          background:
            radial-gradient(1100px 520px at -10% -20%, rgba(255,255,255,.25), transparent 55%),
            radial-gradient(900px 520px at 120% -10%, rgba(255,255,255,.18), transparent 60%),
            linear-gradient(135deg, var(--bg1) 0%, var(--bg2) 100%);
        }
        .shell{ max-width:1200px; margin:0 auto; }

        .hero{
          position:relative; color:#fff;
          background:linear-gradient(180deg, rgba(255,255,255,.25), rgba(255,255,255,.1));
          border:1px solid rgba(255,255,255,.45);
          border-radius:18px; padding:16px 18px;
          box-shadow: 0 10px 30px rgba(0,0,0,.12) inset, 0 6px 20px rgba(0,0,0,.08);
          backdrop-filter: blur(6px);
        }
        .hero h1{ margin:0; font-size:20px; font-weight:900; letter-spacing:.3px; }
        .brand{ position:absolute; right:18px; top:14px; text-align:right; font-weight:900; line-height:1.1; }
        .brand .name{ color:#ef4444; letter-spacing:.6px; font-size:16px; }
        .brand .sub{ color:#e5e7eb; font-size:11px; font-weight:800; opacity:.95; }

        .grid{
          margin-top:14px; background:var(--panel);
          border:1px solid var(--border); border-radius:16px;
          box-shadow:0 10px 30px rgba(0,0,0,.06); padding:14px;
        }
        .cards{
          display:grid; gap:14px;
          grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
        }

        .card{
          background:#fff; border:1px solid var(--border); border-radius:16px;
          padding:14px; display:grid; grid-template-columns:56px 1fr 16px; gap:12px; align-items:center;
          cursor:pointer; transition: transform .12s ease, box-shadow .2s ease, border-color .2s ease;
          box-shadow: 0 2px 8px rgba(0,0,0,.04);
          outline:none;
        }
        .card:hover, .card:focus-visible{ transform:translateY(-2px); border-color:var(--ring); box-shadow:0 10px 26px var(--ring-soft); }
        .tile{
          width:56px; height:56px; border-radius:14px; display:grid; place-items:center;
          color:#1e293b;
          background:linear-gradient(135deg, #eef2ff 0%, #ffffff 60%);
          border:1px solid #e2e8f0;
        }
        .tile.pos { background:linear-gradient(135deg, #ecfeff 0%, #ffffff 60%); color:#0369a1; border-color:#bae6fd; }
        .tile.ftr { background:linear-gradient(135deg, #fff7ed 0%, #ffffff 60%); color:#b45309; border-color:#fed7aa; }
        .tile.qcs { background:linear-gradient(135deg, #f0fdfa 0%, #ffffff 60%); color:#065f46; border-color:#a7f3d0; }
        /* جديد: شكل PRODUCTION */
        .tile.prod { background:linear-gradient(135deg, #fdf2f8 0%, #ffffff 60%); color:#be185d; border-color:#fbcfe8; }

        .title{ font-weight:900; color:var(--text); letter-spacing:.2px; }
        .badge{ font-size:12px; font-weight:800; color:#475569; background:#f1f5f9; border:1px solid #e2e8f0; padding:3px 8px; border-radius:999px; display:inline-flex; gap:6px; align-items:center; }
        .arrow{ color:#94a3b8; transition: transform .15s ease; }
        .card:hover .arrow{ transform: translateX(3px); color: var(--ring); }

        .backdrop{ position:fixed; inset:0; background:rgba(2,6,23,.45); display:grid; place-items:center; z-index:40; }
        .modal{
          width:100%; max-width:380px; background:#fff; border:1px solid var(--border); border-radius:16px; padding:18px;
          box-shadow: 0 30px 60px rgba(0,0,0,.25);
        }
        .modal h3{ margin:0 0 6px 0; font-weight:900; color:var(--text); }
        .modal p{ margin:0 0 10px 0; color:var(--muted); }
        .input{ width:100%; padding:10px 12px; border:1px solid var(--border); border-radius:10px; outline:none; font-weight:800; }
        .input:focus{ border-color: var(--ring); box-shadow: 0 0 0 4px var(--ring-soft); }
        .err{ color:#b91c1c; font-size:12px; font-weight:800; margin-top:6px; }
        .actions{ display:flex; gap:8px; justify-content:flex-end; margin-top:12px; }
        .btn{ padding:10px 14px; border-radius:10px; border:1px solid transparent; font-weight:900; cursor:pointer; }
        .btn.primary{ background:var(--ring); color:#fff; }
        .btn.ghost{ background:#fff; color:#text; border-color:var(--border); }
      `}</style>

      <div className="shell">
        {/* Header */}
        <div className="hero" role="banner" aria-label="Browse Daily Reports">
          <h1>Browse Daily Reports</h1>
          <div className="brand">
            <div className="name">AL MAWASHI</div>
            <div className="sub">Trans Emirates Livestock Trading L.L.C.</div>
          </div>
        </div>

        {/* Grid */}
        <section className="grid" aria-label="Branches list">
          <div className="cards">
            {branches.map((branch) => {
              const isQCS = branch === "QCS";
              const isFTR = branch.startsWith("FTR");
              const isProduction = branch === "PRODUCTION";
              const type = isQCS ? "QCS" : isFTR ? "FTR" : isProduction ? "PROD" : "POS";
              return (
                <div
                  key={branch}
                  className="card"
                  role="button"
                  tabIndex={0}
                  aria-label={`Open ${branch} report`}
                  onClick={() => handleBranchClick(branch)}
                  onKeyDown={(e) =>
                    (e.key === "Enter" || e.key === " ") &&
                    handleBranchClick(branch)
                  }
                >
                  <div
                    className={`tile ${
                      type === "POS" ? "pos" : type === "FTR" ? "ftr" : type === "QCS" ? "qcs" : "prod"
                    }`}
                  >
                    {type === "POS" && <IconStore />}
                    {type === "FTR" && <IconTruck />}
                    {type === "QCS" && <IconShield />}
                    {type === "PROD" && <IconProduction />}
                  </div>
                  <div>
                    <div className="title">{branch}</div>
                    {/* لا نعرض أي وصف لبطاقة QCS */}
                    {!isQCS && (
                      <div className="badge">
                        {type === "FTR" ? "FTR Branch" : isProduction ? "Production" : "Point of Sale"}
                      </div>
                    )}
                  </div>
                  <svg
                    className="arrow"
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M9 18l6-6-6-6" />
                  </svg>
                </div>
              );
            })}
          </div>
        </section>
      </div>

      {/* Password modal */}
      {showPwd && (
        <div className="backdrop" onClick={() => setShowPwd(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3>Enter Password</h3>
            <p>
              Branch: <strong>{pendingBranch}</strong>
            </p>
            <form onSubmit={submitPwd}>
              <input
                className="input"
                type="password"
                placeholder="Password"
                value={pwd}
                onChange={(e) => {
                  setPwd(e.target.value);
                  setPwdError("");
                }}
                autoFocus
              />
              {pwdError && <div className="err">{pwdError}</div>}
              <div className="actions">
                <button
                  type="button"
                  className="btn ghost"
                  onClick={() => setShowPwd(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="btn primary">
                  Continue
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
