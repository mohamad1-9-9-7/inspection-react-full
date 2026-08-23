// src/pages/admin/DailyReportsTab.jsx
import React from "react";
import { useNavigate } from "react-router-dom";
import Button from "../../components/Button";
import { branchAllowed } from "../../utils/perms";
import "./DailyReportsTab.css";

/* Only branches that actually have a report page behind them. POS 7/14/16/17/
   21/24/25/26/37/38/42/44/45 were listed here but every one of them fell
   through to an `alert("No report available")` (POS 26 navigated to a route
   that does not exist), so they were dead tiles. */
const branches = [
  "QCS", "POS 6", "POS 10", "POS 11", "POS 15",
  "Al Warqa Kitchen", "FTR 1", "FTR 2", "PRODUCTION",
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
  if (type === "ftr")                return "FTR Branch";
  if (type === "prod")               return "Production";
  return "Point of Sale";
};


export default function DailyReportsTab({
  dateStr = "",
  onOpenQCSReport,
  onOpenPOS19Report,
  onOpenFTR1Report,
  onOpenFTR2Report,
  onOpenProductionReport,
  onOpenPOS15Report,
  onOpenPOS10Report,
  onOpenPOS6Report,
  onOpenPOS11Report,
}) {
  const navigate = useNavigate();

  /* Branch access control (perms.js is the single source of truth for
     allowedBranches — see src/utils/perms.js). "Al Warqa Kitchen" in this
     list is the same physical branch as "POS 19" in the selector. */
  const aliasForMatch = (b) => (b === "Al Warqa Kitchen" ? "POS 19" : b);
  const visibleBranches = branches.filter(b => branchAllowed("admin", aliasForMatch(b)));
  const isRestrictedToBranches = visibleBranches.length < branches.length;

  const openBranchAfterAuth = (branch) => {
    if (branch==="QCS")                  { onOpenQCSReport        ? onOpenQCSReport()        : navigate("/admin/monitor/branches/qcs/reports"); }
    else if (branch==="POS 10")          { onOpenPOS10Report      ? onOpenPOS10Report()      : navigate("/admin/pos10"); }
    else if (branch==="POS 6")           { onOpenPOS6Report       ? onOpenPOS6Report()       : navigate("/admin/pos6"); }
    else if (branch==="POS 11")          { onOpenPOS11Report      ? onOpenPOS11Report()      : navigate("/admin/pos11"); }
    else if (branch==="POS 15")          { onOpenPOS15Report      ? onOpenPOS15Report()      : navigate("/admin/pos15"); }
    else if (branch==="POS 19")          { onOpenPOS19Report      ? onOpenPOS19Report()      : navigate("/admin/pos19"); }
    else if (branch==="Al Warqa Kitchen"){ onOpenPOS19Report      ? onOpenPOS19Report()      : navigate("/admin/pos19"); }
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
          <div className="dr-header-copy">
            <div className="dr-pulse-row">
              <div className="dr-pulse-dot"/>
              <span className="dr-pulse-label">Admin Panel — Live</span>
            </div>
            <div className="dr-h-title">Browse Daily Reports</div>
            <div className="dr-h-date">{dateStr}</div>
          </div>
          <div className="dr-metrics">
            <div className="dr-metric">
              <span>Branches</span>
              <strong>{visibleBranches.length}</strong>
            </div>
          </div>
        </header>

        {/* Topbar */}
        <div className="dr-topbar">
          <div className="dr-section">
            {isRestrictedToBranches
              ? `Your assigned branches (${visibleBranches.length})`
              : "Select a branch"}
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
            <div className="dr-empty">
              No branches are assigned to this account. Please contact administration.
            </div>
          )}
        </div>


      </div>
    </>
  );
}
