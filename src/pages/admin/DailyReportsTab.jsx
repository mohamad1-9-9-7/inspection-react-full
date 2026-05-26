// src/pages/admin/DailyReportsTab.jsx
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Button from "../../components/Button";
import "./DailyReportsTab.css";

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
  const [dateStr, setDateStr] = useState("");

  useEffect(() => {
    const fmt = () => setDateStr(new Date().toLocaleString("en-AE",{timeZone:"Asia/Dubai",weekday:"long",month:"long",day:"numeric",hour:"2-digit",minute:"2-digit"}));
    fmt(); const t=setInterval(fmt,30_000); return ()=>clearInterval(t);
  }, []);

  /* ── Named-account branch access control (per-icon: Admin) ──
     allowedBranches may be { daily:[...], admin:[...] } (new) or [...] (legacy)
     "Al Warqa Kitchen" in this list is the same physical branch as "POS 19" in the selector. */
  const currentUser = (() => {
    try { return JSON.parse(localStorage.getItem("currentUser") || "{}"); } catch { return {}; }
  })();
  const isNamedAccount = currentUser.type === "named";
  const ab = currentUser.allowedBranches;
  const adminAllowed = Array.isArray(ab)
    ? ab
    : (ab && Array.isArray(ab.admin) ? ab.admin : []);

  const aliasForMatch = (b) => (b === "Al Warqa Kitchen" ? "POS 19" : b);
  const visibleBranches = (isNamedAccount && adminAllowed.length > 0)
    ? branches.filter(b => adminAllowed.includes(aliasForMatch(b)))
    : branches;

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

  /* Authentication happens at login — open the branch directly */
  const open = (branch) => openBranchAfterAuth(branch);

  return (
    <>
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
          <div className="dr-section">
            {isNamedAccount && adminAllowed.length > 0
              ? `الفروع المخصّصة لك (${visibleBranches.length}) / Your assigned branches`
              : "اختر الفرع"}
          </div>
          <div className="dr-count">
            <div className="dr-count-dot"/>
            عدد التقارير: {dailyReports.length}
          </div>
        </div>

        {/* Cards */}
        <div className="dr-grid">
          {visibleBranches.map(branch => {
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

          {visibleBranches.length === 0 && (
            <div style={{
              gridColumn: "1/-1", textAlign: "center",
              padding: "40px 16px", color: "#64748b",
              fontWeight: 700, fontSize: 15,
            }}>
              🔒 لا توجد فروع مخصّصة لهذا الحساب — راجع الإدارة
            </div>
          )}
        </div>

        {/* QCS button */}
        <div className="dr-qcs-btn">
          <Button variant="primary" size="lg" onClick={onOpenQCSShipmentReport}>
            📦 تقرير استلام الشحنات — QCS
          </Button>
        </div>

      </div>
    </>
  );
}