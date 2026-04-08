// src/pages/admin/DailyReportsTab.jsx
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";

const branches = [
  "QCS", "POS 6", "POS 7", "POS 10", "POS 11", "POS 14",
  "POS 15", "POS 16", "POS 17", "Al Warqa Kitchen", "POS 21", "POS 24",
  "POS 25", "POS 26", "POS 37", "POS 38", "POS 42", "POS 44",
  "POS 45", "FTR 1", "FTR 2", "PRODUCTION",
];

const getType = (b) =>
  b === "QCS" ? "qcs" : b === "PRODUCTION" ? "prod" : b.startsWith("FTR") ? "ftr" : "pos";

const META = {
  qcs:  { color: "#0ea5e9", dark: "#e0f2fe", icon: "🛡️" },
  prod: { color: "#10b981", dark: "#d1fae5", icon: "🏭" },
  pos:  { color: "#3b82f6", dark: "#dbeafe", icon: "🏪" },
  ftr:  { color: "#f59e0b", dark: "#fef3c7", icon: "🚚" },
};

const getBadge = (branch, type) => {
  if (branch === "QCS")              return "Al Qusais Warehouse";
  if (branch === "POS 10")           return "Abu Dhabi Butchery";
  if (branch === "POS 11")           return "Al Ain Butchery";
  if (branch === "POS 15")           return "Al Barsha Butchery";
  if (branch === "POS 19")           return "Al Warqa Kitchen";
  if (branch === "Al Warqa Kitchen") return "Al Warqa Kitchen";
  if (branch === "POS 24")           return "Silicon Branch";
  if (branch === "POS 26")           return "Al Barsha South";
  if (type === "ftr")                return "FTR Branch";
  if (type === "prod")               return "Production";
  return "Point of Sale";
};

const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800;900&display=swap');

*,*::before,*::after{box-sizing:border-box;margin:0;padding:0;}
html,body{height:100%;}
body{
  font-family:'Plus Jakarta Sans',system-ui,sans-serif;
  background:linear-gradient(160deg,#f0f9ff 0%,#ecfdf5 50%,#f0f9ff 100%);
  color:#0f172a;
  -webkit-font-smoothing:antialiased;
  min-height:100vh;
}

.dr-root{
  position:relative;z-index:1;
  max-width:1240px;margin:0 auto;
  padding:24px 20px 60px;
}

/* ── header ── */
.dr-header{
  display:flex;align-items:center;justify-content:space-between;gap:16px;flex-wrap:wrap;
  background:#fff;
  border:1.5px solid #bae6fd;
  border-radius:20px;
  padding:22px 28px;
  margin-bottom:14px;
  box-shadow:0 4px 24px rgba(14,165,233,.10),0 1px 0 #e0f2fe inset;
}
.dr-pulse-row{display:flex;align-items:center;gap:8px;margin-bottom:9px;}
.dr-pulse-dot{
  width:7px;height:7px;border-radius:50%;
  background:#10b981;box-shadow:0 0 10px #10b981;
  animation:drpdot 2.2s ease-in-out infinite;
}
@keyframes drpdot{0%,100%{opacity:1;transform:scale(1)}50%{opacity:.35;transform:scale(.65)}}
.dr-pulse-label{font-size:10px;font-weight:700;letter-spacing:.2em;text-transform:uppercase;color:#10b981;}
.dr-h-title{font-size:22px;font-weight:900;color:#0c4a6e;letter-spacing:-.4px;line-height:1;}
.dr-h-date{font-size:11.5px;color:#7dd3fc;font-weight:600;margin-top:6px;}

.dr-brand{text-align:right;flex-shrink:0;}
.dr-brand-name{font-size:17px;font-weight:900;color:#0ea5e9;letter-spacing:.05em;}
.dr-brand-sub{font-size:9px;font-weight:700;color:#a7f3d0;letter-spacing:.07em;text-transform:uppercase;line-height:1.5;margin-top:4px;max-width:210px;}

/* ── topbar ── */
.dr-topbar{display:flex;align-items:center;justify-content:space-between;margin-bottom:12px;gap:12px;flex-wrap:wrap;}
.dr-section{font-size:10px;font-weight:800;color:#7dd3fc;text-transform:uppercase;letter-spacing:.18em;display:flex;align-items:center;gap:10px;}
.dr-section::after{content:'';width:48px;height:1px;background:#bae6fd;}
.dr-count{
  font-size:11px;font-weight:700;color:#0ea5e9;
  background:#f0f9ff;border:1.5px solid #bae6fd;
  border-radius:99px;padding:4px 14px;
  display:flex;align-items:center;gap:6px;
}
.dr-count-dot{width:6px;height:6px;border-radius:50%;background:#10b981;box-shadow:0 0 6px #10b981;}

/* ── grid ── */
.dr-grid{
  display:grid;
  grid-template-columns:repeat(auto-fill,minmax(196px,1fr));
  gap:10px;margin-bottom:20px;
}

/* ── card ── */
.dr-card{
  position:relative;overflow:hidden;
  height:72px;
  background:#fff;
  border:1.5px solid #e0f2fe;
  border-radius:14px;
  display:flex;align-items:center;gap:11px;
  padding:0 14px;
  cursor:pointer;outline:none;
  transition:transform .13s ease,border-color .18s,box-shadow .18s;
  box-shadow:0 2px 8px rgba(14,165,233,.06);
}
.dr-card::before{
  content:'';
  position:absolute;top:0;left:0;right:0;height:2.5px;
  background:var(--cc,#bae6fd);opacity:.6;
  border-radius:14px 14px 0 0;
}
.dr-card:hover,.dr-card:focus-visible{
  transform:translateY(-2px);
  border-color:var(--cc,#7dd3fc);
  box-shadow:0 8px 24px rgba(14,165,233,.14);
}

/* ── icon ── */
.dr-icon{
  width:40px;height:40px;flex-shrink:0;
  border-radius:10px;
  display:flex;align-items:center;justify-content:center;
  font-size:18px;line-height:1;
  background:var(--cd,#e0f2fe);
  border:1.5px solid rgba(14,165,233,.15);
}

/* ── card body ── */
.dr-card-body{flex:1;min-width:0;}
.dr-card-name{font-size:13px;font-weight:800;color:#0c4a6e;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;line-height:1;}
.dr-card-tag{font-size:9px;font-weight:700;letter-spacing:.09em;text-transform:uppercase;color:var(--cc,#38bdf8);margin-top:5px;opacity:.8;display:block;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}

/* ── arrow ── */
.dr-arrow{color:#bae6fd;flex-shrink:0;transition:color .14s,transform .14s;}
.dr-card:hover .dr-arrow,.dr-card:focus-visible .dr-arrow{color:var(--cc,#0ea5e9);transform:translateX(2px);}

/* ── QCS shipment button ── */
.dr-qcs-btn{display:flex;justify-content:center;padding:4px 0 8px;}
.dr-qcs-inner{
  display:inline-flex;align-items:center;gap:10px;
  background:linear-gradient(135deg,#0ea5e9,#38bdf8);
  color:#fff;
  border:none;border-radius:12px;
  padding:13px 28px;
  font-size:14px;font-weight:800;
  font-family:'Plus Jakarta Sans',sans-serif;
  cursor:pointer;outline:none;
  transition:opacity .15s,transform .12s,box-shadow .18s;
  box-shadow:0 4px 18px rgba(14,165,233,.3);
}
.dr-qcs-inner:hover{opacity:.9;transform:translateY(-1px);box-shadow:0 8px 28px rgba(14,165,233,.4);}
.dr-qcs-inner:active{transform:scale(.97);}

/* ── modal ── */
.dr-backdrop{
  position:fixed;inset:0;
  background:rgba(14,116,144,.25);
  backdrop-filter:blur(6px);
  display:grid;place-items:center;z-index:50;
  animation:drbfade .14s ease;
}
@keyframes drbfade{from{opacity:0;}}

.dr-modal{
  width:calc(100% - 32px);max-width:340px;
  background:#fff;
  border:1.5px solid #bae6fd;
  border-radius:20px;padding:24px;
  box-shadow:0 24px 60px rgba(14,165,233,.18);
  animation:drmup .17s ease;
}
@keyframes drmup{from{transform:translateY(14px);opacity:0;}}

.dr-modal-icon{
  width:42px;height:42px;border-radius:11px;
  display:flex;align-items:center;justify-content:center;
  font-size:20px;margin-bottom:12px;
  background:var(--cd,#e0f2fe);
  border:1.5px solid rgba(14,165,233,.2);
}
.dr-modal-title{font-size:16px;font-weight:900;color:#0c4a6e;margin-bottom:3px;direction:rtl;text-align:right;}
.dr-modal-sub{font-size:12px;color:#7dd3fc;margin-bottom:14px;direction:rtl;text-align:right;}
.dr-modal-sub b{color:var(--cc,#0ea5e9);font-weight:800;}

.dr-modal-input{
  width:100%;padding:11px 13px;
  background:#f0f9ff;
  border:1.5px solid #bae6fd;
  border-radius:9px;
  color:#0c4a6e;font-size:14px;font-weight:700;
  font-family:'Plus Jakarta Sans',sans-serif;
  outline:none;transition:border-color .15s,box-shadow .15s;
}
.dr-modal-input:focus{border-color:var(--cc,#0ea5e9);box-shadow:0 0 0 3px rgba(14,165,233,.12);}
.dr-modal-err{font-size:11px;font-weight:700;color:#f43f5e;margin-top:7px;display:flex;align-items:center;gap:5px;direction:rtl;}
.dr-modal-actions{display:flex;gap:8px;justify-content:flex-start;flex-direction:row-reverse;margin-top:14px;}

.dr-btn{padding:9px 16px;border-radius:9px;border:none;font-size:13px;font-weight:800;font-family:'Plus Jakarta Sans',sans-serif;cursor:pointer;transition:opacity .15s,transform .1s;}
.dr-btn:active{transform:scale(.96);}
.dr-btn-ghost{background:#f0f9ff;color:#7dd3fc;border:1.5px solid #bae6fd;}
.dr-btn-primary{background:var(--cc,#0ea5e9);color:#fff;font-weight:900;}
.dr-btn-primary:hover{opacity:.88;}

@media(max-width:640px){
  .dr-header{flex-direction:column;align-items:flex-start;gap:12px;}
  .dr-brand{text-align:left;}
  .dr-h-title{font-size:19px;}
  .dr-grid{grid-template-columns:repeat(auto-fill,minmax(160px,1fr));}
}
`;

export default function DailyReportsTab({
  dailyReports = [],
  setDailyReports,
  onOpenQCSReport,
  onOpenPOS19Report,
  onOpenQCSShipmentReport,
  onOpenFTR1Report,
  onOpenFTR2Report,
  onOpenProductionReport,
  onOpenPOS15Report,
  onOpenPOS10Report,
  onOpenPOS11Report,
  onOpenPOS26Report,
}) {
  const navigate = useNavigate();
  const [showPwd, setShowPwd]             = useState(false);
  const [pendingBranch, setPendingBranch] = useState(null);
  const [pwd, setPwd]                     = useState("");
  const [pwdError, setPwdError]           = useState("");
  const [dateStr, setDateStr]             = useState("");

  useEffect(() => {
    const fmt = () => setDateStr(new Date().toLocaleString("en-AE",{timeZone:"Asia/Dubai",weekday:"long",month:"long",day:"numeric",hour:"2-digit",minute:"2-digit"}));
    fmt(); const t=setInterval(fmt,30_000); return ()=>clearInterval(t);
  }, []);

  const openBranchAfterAuth = (branch) => {
    if (branch==="QCS")                  { onOpenQCSReport        ? onOpenQCSReport()        : navigate("/admin/monitor/branches/qcs/reports"); }
    else if (branch==="POS 10")          { onOpenPOS10Report      ? onOpenPOS10Report()      : navigate("/admin/pos10"); }
    else if (branch==="POS 11")          { onOpenPOS11Report      ? onOpenPOS11Report()      : navigate("/admin/pos11"); }
    else if (branch==="POS 15")          { onOpenPOS15Report      ? onOpenPOS15Report()      : navigate("/admin/pos15"); }
    else if (branch==="POS 19")          { onOpenPOS19Report      ? onOpenPOS19Report()      : navigate("/admin/pos19"); }
    else if (branch==="Al Warqa Kitchen"){ onOpenPOS19Report      ? onOpenPOS19Report()      : navigate("/admin/pos19"); }
    else if (branch==="POS 26")          { onOpenPOS26Report      ? onOpenPOS26Report()      : navigate("/admin/pos26"); }
    else if (branch==="FTR 1")           { onOpenFTR1Report       ? onOpenFTR1Report()       : navigate("/admin/ftr1"); }
    else if (branch==="FTR 2")           { onOpenFTR2Report       ? onOpenFTR2Report()       : navigate("/admin/ftr2"); }
    else if (branch==="PRODUCTION")      { onOpenProductionReport ? onOpenProductionReport() : navigate("/admin/production"); }
    else { alert("No report available for: "+branch); }
  };

  const open = (branch) => { setPendingBranch(branch); setPwd(""); setPwdError(""); setShowPwd(true); };

  const submit = (e) => {
    e?.preventDefault(); if (!pendingBranch) return;
    const expected =
      pendingBranch === "PRODUCTION"      ? "PRD123"    :
      pendingBranch === "Al Warqa Kitchen" ? "POS 19123" :
      `${pendingBranch}123`;
    if (pwd===expected) { setShowPwd(false); openBranchAfterAuth(pendingBranch); }
    else setPwdError("كلمة المرور غير صحيحة");
  };

  const modalType = pendingBranch ? getType(pendingBranch) : null;
  const m         = modalType ? META[modalType] : null;

  return (
    <>
      <style>{CSS}</style>
      <div className="dr-root">

        {/* Header */}
        <header className="dr-header">
          <div>
            <div className="dr-pulse-row">
              <div className="dr-pulse-dot"/>
              <span className="dr-pulse-label">Admin Panel — Live</span>
            </div>
            <div className="dr-h-title">Browse Daily Reports</div>
            <div className="dr-h-date">{dateStr}</div>
          </div>
          <div className="dr-brand">
            <div className="dr-brand-name">AL MAWASHI</div>
            <div className="dr-brand-sub">Trans Emirates Livestock Trading L.L.C.</div>
          </div>
        </header>

        {/* Topbar */}
        <div className="dr-topbar">
          <div className="dr-section">اختر الفرع</div>
          <div className="dr-count">
            <div className="dr-count-dot"/>
            عدد التقارير: {dailyReports.length}
          </div>
        </div>

        {/* Cards */}
        <div className="dr-grid">
          {branches.map(branch => {
            const type=getType(branch), meta=META[type];
            return (
              <div key={branch} className="dr-card" role="button" tabIndex={0}
                aria-label={`Open ${branch} report`}
                style={{"--cc":meta.color,"--cd":meta.dark}}
                onClick={()=>open(branch)}
                onKeyDown={e=>(e.key==="Enter"||e.key===" ")&&open(branch)}
              >
                <div className="dr-icon">{meta.icon}</div>
                <div className="dr-card-body">
                  <div className="dr-card-name">{branch}</div>
                  <span className="dr-card-tag">{getBadge(branch,type)}</span>
                </div>
                <svg className="dr-arrow" width="14" height="14" viewBox="0 0 24 24"
                  fill="none" stroke="currentColor" strokeWidth="2.5"
                  strokeLinecap="round" strokeLinejoin="round">
                  <path d="M9 18l6-6-6-6"/>
                </svg>
              </div>
            );
          })}
        </div>

        {/* QCS button */}
        <div className="dr-qcs-btn">
          <button className="dr-qcs-inner" onClick={onOpenQCSShipmentReport}>
            📦 تقرير استلام الشحنات — QCS
          </button>
        </div>

      </div>

      {/* Modal */}
      {showPwd && m && (
        <div className="dr-backdrop" style={{"--cc":m.color,"--cd":m.dark}} onClick={()=>setShowPwd(false)}>
          <div className="dr-modal" onClick={e=>e.stopPropagation()}>
            <div className="dr-modal-icon">{m.icon}</div>
            <div className="dr-modal-title">إدخال كلمة السر</div>
            <div className="dr-modal-sub">الفرع: <b>{pendingBranch}</b></div>
            <form onSubmit={submit}>
              <input className="dr-modal-input" type="password" placeholder="••••••••"
                value={pwd} onChange={e=>{setPwd(e.target.value);setPwdError("");}} autoFocus/>
              {pwdError && <div className="dr-modal-err">⚠ {pwdError}</div>}
              <div className="dr-modal-actions">
                <button type="button" className="dr-btn dr-btn-ghost" onClick={()=>setShowPwd(false)}>إلغاء</button>
                <button type="submit" className="dr-btn dr-btn-primary" style={{background:m.color}}>متابعة ←</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}