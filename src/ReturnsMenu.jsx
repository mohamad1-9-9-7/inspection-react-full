// src/ReturnsMenu.jsx
import React from "react";
import { Link } from "react-router-dom";

export default function ReturnsMenu() {
  return (
    <div
      className="ret-page"
      dir="ltr"
      style={{ fontFamily: "Cairo, sans-serif" }}
    >
      <style>{`
        .ret-page{
          min-height:100vh; color:#fff;
          background:
            radial-gradient(900px 500px at 100% -10%, rgba(34,211,238,.25), transparent 60%),
            radial-gradient(700px 400px at -5% 105%, rgba(186,230,253,.22), transparent 60%),
            linear-gradient(135deg,#5b21b6 0%,#6d28d9 30%,#3b82f6 70%,#22d3ee 100%);
          display:grid; place-items:center; padding:5rem 1.2rem 2rem; position:relative; overflow:hidden;
        }
        .brand{position:fixed; top:10px; right:16px; text-align:right; z-index:20; pointer-events:none;}
        .brand__title{font-weight:900; letter-spacing:1px; font-size:18px; color:#fef2f2; text-shadow:0 1px 0 rgba(0,0,0,.15);}
        .brand__sub{font-weight:600; font-size:11px; color:#e5e7eb; opacity:.95; text-shadow:0 1px 0 rgba(0,0,0,.18);}
        .hero{
          width:min(980px,100%); aspect-ratio:16/9; border-radius:22px; position:relative;
          background:linear-gradient(160deg,rgba(255,255,255,.12),rgba(255,255,255,.06));
          box-shadow:0 24px 60px rgba(0,0,0,.25), inset 0 0 0 1px rgba(255,255,255,.15);
          overflow:hidden; backdrop-filter:blur(6px); animation:fadeIn .5s ease both;
        }
        @keyframes fadeIn{from{opacity:0; transform:translateY(6px)} to{opacity:1; transform:translateY(0)}}
        .wave{position:absolute; left:0; right:0; width:100%}
        .wave--top{top:-6%; opacity:.55} .wave--mid{top:10%; opacity:.45} .wave--bottom{bottom:-8%; opacity:.35}
        .content{position:absolute; inset:0; display:grid; place-items:center; padding:clamp(1rem,3vw,2rem); text-align:center;}
        .title{font-weight:900; font-size:clamp(1.2rem,3.8vw,2.1rem); text-shadow:0 2px 10px rgba(0,0,0,.25); margin:0;}
        .actions{display:flex; gap:1rem; flex-wrap:wrap; justify-content:center; margin-top:1rem;}
        .btn{
          appearance:none; border:none; padding:1rem 1.8rem; border-radius:999px; font-weight:800; font-size:1rem; cursor:pointer;
          text-decoration:none; color:#0b1021; background:#fff; box-shadow:0 10px 24px rgba(0,0,0,.22);
          transition:transform .18s ease, box-shadow .18s ease, filter .18s ease; display:inline-flex; align-items:center; justify-content:center; gap:.6rem;
        }
        .btn:hover{transform:translateY(-3px); box-shadow:0 16px 34px rgba(0,0,0,.28)}
        .btn--primary{color:#111827; background:linear-gradient(90deg,#fce7f3,#fde68a); border:1px solid rgba(255,255,255,.65)}
        .btn--ghost{color:#fff; background:linear-gradient(90deg,rgba(255,255,255,.12),rgba(255,255,255,.08)); border:1px solid rgba(255,255,255,.45); backdrop-filter:blur(4px)}
        .btn__icon{font-size:1.8rem; line-height:1; transform:translateY(-1px)}
      `}</style>

      {/* Brand */}
      <div className="brand">
        <div className="brand__title">AL MAWASHI</div>
        <div className="brand__sub">Trans Emirates Livestock Trading L.L.C.</div>
      </div>

      {/* Hero */}
      <section className="hero" aria-label="Returns menu">
        {/* Waves */}
        <svg
          className="wave wave--top"
          viewBox="0 0 1440 320"
          preserveAspectRatio="none"
        >
          <path
            fill="#a78bfa"
            d="M0,96L40,85.3C80,75,160,53,240,80C320,107,400,181,480,202.7C560,224,640,192,720,165.3C800,139,880,117,960,122.7C1040,128,1120,160,1200,181.3C1280,203,1360,213,1400,218.7L1440,224L1440,0L1400,0C1360,0,1280,0,1200,0C1120,0,1040,0,960,0C880,0,800,0,720,0C640,0,560,0,480,0,400,0,320,0,240,0,160,0,80,0,40,0L0,0Z"
          />
        </svg>
        <svg
          className="wave wave--mid"
          viewBox="0 0 1440 320"
          preserveAspectRatio="none"
        >
          <path
            fill="#7dd3fc"
            d="M0,160L80,165.3C160,171,320,181,480,165.3C640,149,800,107,960,106.7C1120,107,1280,149,1360,170.7L1440,192L1440,0L1360,0C1280,0,1120,0,960,0C800,0,640,0,480,0C320,0,160,0,80,0L0,0Z"
          />
        </svg>
        <svg
          className="wave wave--bottom"
          viewBox="0 0 1440 320"
          preserveAspectRatio="none"
        >
          <path
            fill="#60a5fa"
            d="M0,288L60,272C120,256,240,224,360,213.3C480,203,600,213,720,197.3C840,181,960,139,1080,106.7C1200,75,1320,53,1380,42.7L1440,32L1440,320L1380,320C1320,320,1200,320,1080,320C960,320,840,320,720,320C600,320,480,320,360,320C240,320,120,320,60,320L0,320Z"
          />
        </svg>

        {/* Content */}
        <div className="content">
          <h1 className="title">Returns & Daily Meat Status</h1>

          <div className="actions" role="group" aria-label="Actions">
            {/* LEFT: Browse */}
            <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              <Link to="/returns/browse" className="btn btn--ghost">
                <span className="btn__icon">📂</span>
                <span>Browse Returns Reports</span>
              </Link>

              <Link to="/meat-daily/browse" className="btn btn--ghost">
                <span className="btn__icon">📊</span>
                <span>Browse Meat Daily</span>
              </Link>

              <Link to="/returns-customers/browse" className="btn btn--ghost">
                <span className="btn__icon">👤</span>
                <span>Browse Customer Returns</span>
              </Link>

              <Link to="/inventory-daily/browse" className="btn btn--ghost">
                <span className="btn__icon">📦</span>
                <span>Browse Inventory Daily</span>
              </Link>

              {/* ✅ صار مربوط بالصفحة الجديدة (View Only) */}
              <Link to="/enoc-returns/browse-view" className="btn btn--ghost">
                <span className="btn__icon">⛽</span>
                <span>Browse ENOC Returns</span>
              </Link>
            </div>

            {/* RIGHT: Create */}
            <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              <Link to="/returns" className="btn btn--primary" aria-label="Create returns report">
                <span className="btn__icon">📝</span>
                <span>Create Returns Report</span>
              </Link>

              <Link to="/meat-daily/input" className="btn btn--primary" aria-label="Create meat daily report">
                <span className="btn__icon">🧾</span>
                <span>Create Meat Daily Report</span>
              </Link>

              <Link to="/returns-customers/new" className="btn btn--primary" aria-label="Create customer returns report">
                <span className="btn__icon">✍️</span>
                <span>Create Customer Returns</span>
              </Link>

              <Link to="/inventory-daily/input" className="btn btn--primary" aria-label="Create inventory daily report">
                <span className="btn__icon">🧮</span>
                <span>Create Inventory Daily Report</span>
              </Link>

              <Link to="/enoc-returns/input" className="btn btn--primary" aria-label="Create ENOC returns report">
                <span className="btn__icon">⛽</span>
                <span>Create ENOC Returns Report</span>
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
