// src/pages/AdminDashboard.jsx
import React, { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";

import ReportsTab         from "./admin/ReportsTab";
import DailyReportsTab    from "./admin/DailyReportsTab";
import QCSRawMaterialView from "./admin/QCSRawMaterialView";
import KPIDashboard       from "./KPIDashboard";
import FTR1ReportView     from "./monitor/branches/ftr1/FTR1ReportView";
import FTR2ReportView     from "./monitor/branches/ftr2/FTR2ReportView";

const API_BASE = process.env.REACT_APP_API_URL || "https://inspection-server-4nvj.onrender.com";

async function fetchByType(type) {
  const res = await fetch(`${API_BASE}/api/reports?type=${encodeURIComponent(type)}`, { cache: "no-store" });
  if (!res.ok) throw new Error(`Failed to fetch ${type}: ${res.status}`);
  const json = await res.json().catch(() => []);
  return Array.isArray(json) ? json : json?.data ?? [];
}

async function upsertOne(type, payload) {
  const res = await fetch(`${API_BASE}/api/reports`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ reporter: "admin", type, payload: { ...payload, _clientSavedAt: Date.now() } }),
  });
  if (!res.ok) { const t = await res.text().catch(() => ""); throw new Error(`PUT -> ${res.status} ${t}`); }
  try { return await res.json(); } catch { return { ok: true }; }
}

function HideDeleteScope({ children }) {
  const ref = useRef(null);
  useEffect(() => {
    const root = ref.current; if (!root) return;
    const hide = () => root.querySelectorAll("button,[role='button']").forEach(b => {
      const txt = (b.textContent||"").trim().toLowerCase(), title = (b.getAttribute("title")||"").toLowerCase();
      if (txt==="delete"||txt.includes("delete")||title.includes("delete")) b.style.display="none";
    });
    hide();
    const mo = new MutationObserver(hide);
    mo.observe(root, { childList:true, subtree:true, characterData:true });
    return () => mo.disconnect();
  }, []);
  return <div ref={ref}>{children}</div>;
}

const TYPES_BY_GROUP = {
  QCS:        ["qcs-coolers","qcs-ph","qcs-clean"],
  FTR1:       ["ftr1_temperature","ftr1_daily_cleanliness","ftr1_oil_calibration","ftr1_personal_hygiene"],
  FTR2:       ["ftr2_temperature","ftr2_daily_cleanliness","ftr2_oil_calibration","ftr2_personal_hygiene"],
  PRODUCTION: ["prod_cleaning_checklist","prod_personal_hygiene","prod_defrosting_record"],
};

async function fetchAllTypes() {
  const data={}, counts={}, groups={};
  for (const [group, typeList] of Object.entries(TYPES_BY_GROUP)) {
    groups[group]=[...typeList];
    for (const type of typeList) {
      try { const arr=await fetchByType(type); data[type]=arr; counts[type]=arr.length; }
      catch(e) { console.warn(e); data[type]=[]; counts[type]=0; }
    }
  }
  return { data, counts, groups };
}

function downloadJson(data, filename) {
  const a=document.createElement("a");
  a.href=URL.createObjectURL(new Blob([JSON.stringify(data,null,2)],{type:"application/json"}));
  a.download=filename; a.click(); URL.revokeObjectURL(a.href);
}

function formatDateTime(iso) {
  if (!iso) return "—";
  const d=new Date(iso); return isNaN(d)?"—":d.toLocaleString();
}

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

.ad-root{
  position:relative;z-index:1;
  max-width:1400px;margin:0 auto;
  padding:22px 20px 56px;
}

/* ── header ── */
.ad-header{
  display:flex;align-items:center;justify-content:space-between;gap:16px;flex-wrap:wrap;
  background:#fff;
  border:1.5px solid #bae6fd;
  border-radius:20px;
  padding:18px 26px;
  margin-bottom:14px;
  box-shadow:0 4px 24px rgba(14,165,233,.10),0 1px 0 #e0f2fe inset;
}
.ad-header-title{
  font-size:20px;font-weight:900;color:#0c4a6e;
  display:flex;align-items:center;gap:9px;letter-spacing:-.3px;
}
.ad-header-sub{font-size:11.5px;color:#7dd3fc;font-weight:600;margin-top:4px;}

.ad-header-right{display:flex;align-items:center;gap:10px;flex-wrap:wrap;}

.ad-sync-info{text-align:right;}
.ad-sync-text{font-size:11px;color:#94a3b8;font-weight:600;}
.ad-sync-loading{font-size:11px;font-weight:700;color:#38bdf8;margin-top:2px;}
.ad-sync-msg{font-size:11px;font-weight:700;margin-top:2px;}
.ad-sync-msg.ok {color:#10b981;}
.ad-sync-msg.err{color:#f43f5e;}

.ad-hbtn{
  display:inline-flex;align-items:center;gap:6px;
  padding:9px 16px;border-radius:10px;border:none;
  font-size:13px;font-weight:800;
  font-family:'Plus Jakarta Sans',sans-serif;
  cursor:pointer;transition:opacity .15s,transform .1s;
}
.ad-hbtn:active{transform:scale(.96);}
.ad-hbtn:hover{opacity:.88;}
.ad-hbtn-refresh{background:linear-gradient(135deg,#0ea5e9,#38bdf8);color:#fff;box-shadow:0 4px 14px rgba(14,165,233,.3);}
.ad-hbtn-logout {background:linear-gradient(135deg,#f43f5e,#fb7185);color:#fff;box-shadow:0 4px 14px rgba(244,63,94,.25);}

/* ── stats ── */
.ad-stats{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-bottom:14px;}

.ad-stat{
  background:#fff;
  border:1.5px solid #bae6fd;
  border-radius:16px;padding:16px 18px;
  box-shadow:0 2px 10px rgba(14,165,233,.08);
  position:relative;overflow:hidden;
}
.ad-stat::before{
  content:'';position:absolute;top:0;left:0;right:0;height:3px;
  background:linear-gradient(90deg,#38bdf8,#7dd3fc);border-radius:3px 3px 0 0;
}
.ad-stat-label{font-size:9.5px;font-weight:800;text-transform:uppercase;letter-spacing:.12em;color:#7dd3fc;margin-bottom:6px;}
.ad-stat-val  {font-size:28px;font-weight:900;color:#0c4a6e;line-height:1;margin-bottom:3px;}
.ad-stat-sub  {font-size:10px;color:#94a3b8;font-weight:500;}

.ad-stat-green{border-color:#a7f3d0;}
.ad-stat-green::before{background:linear-gradient(90deg,#10b981,#6ee7b7);}
.ad-stat-green .ad-stat-label{color:#6ee7b7;}
.ad-stat-green .ad-stat-val  {color:#064e3b;}
.ad-stat-green .ad-stat-sub  {color:#6ee7b7;}

/* ── tabs ── */
.ad-tabs{display:flex;gap:8px;flex-wrap:wrap;margin-bottom:14px;}

.ad-tab{
  display:inline-flex;align-items:center;gap:7px;
  padding:9px 18px;border-radius:10px;
  border:1.5px solid #e0f2fe;
  font-size:13px;font-weight:800;
  font-family:'Plus Jakarta Sans',sans-serif;
  cursor:pointer;transition:all .16s ease;
  background:#fff;color:#7dd3fc;
  outline:none;
  box-shadow:0 1px 4px rgba(14,165,233,.06);
}
.ad-tab:hover{border-color:#7dd3fc;color:#0ea5e9;background:#f0f9ff;}
.ad-tab.active{
  background:linear-gradient(135deg,#0ea5e9 0%,#38bdf8 100%);
  color:#fff;border-color:#0ea5e9;
  box-shadow:0 6px 18px rgba(14,165,233,.30);
}

/* ── tools bar ── */
.ad-tools{
  display:flex;align-items:center;justify-content:space-between;
  gap:12px;flex-wrap:wrap;
  background:#fff;
  border:1.5px solid #d1fae5;
  border-radius:14px;padding:11px 18px;
  margin-bottom:14px;
  box-shadow:0 2px 8px rgba(16,185,129,.07);
}
.ad-tools-btns{display:flex;gap:8px;flex-wrap:wrap;}

.ad-tool-btn{
  display:inline-flex;align-items:center;gap:6px;
  padding:8px 16px;border-radius:9px;border:none;
  font-size:12px;font-weight:800;
  font-family:'Plus Jakarta Sans',sans-serif;
  cursor:pointer;transition:opacity .15s,transform .1s;
}
.ad-tool-btn:active{transform:scale(.96);}
.ad-tool-btn:hover {opacity:.88;}
.ad-tool-btn-export{background:linear-gradient(135deg,#0ea5e9,#38bdf8);color:#fff;box-shadow:0 3px 10px rgba(14,165,233,.25);}
.ad-tool-btn-import{background:linear-gradient(135deg,#10b981,#34d399);color:#fff;box-shadow:0 3px 10px rgba(16,185,129,.25);}

.ad-tools-hint{font-size:11px;color:#a7f3d0;max-width:340px;line-height:1.5;}
.ad-tools-hint b{color:#10b981;}

/* ── content panel ── */
.ad-panel{
  background:#fff;
  border:1.5px solid #bae6fd;
  border-radius:18px;
  padding:20px 18px;
  min-height:66vh;
  box-shadow:0 8px 32px rgba(14,165,233,.08);
}

/* ── footer ── */
.ad-footer{
  margin-top:22px;text-align:center;
  font-size:11.5px;font-weight:700;
  color:#bae6fd;letter-spacing:.04em;
}

@media(max-width:640px){
  .ad-stats{grid-template-columns:1fr;}
  .ad-header{flex-direction:column;align-items:flex-start;}
  .ad-header-right{width:100%;justify-content:flex-start;}
}
`;

const TABS = [
  { key: "dailyReports", label: "Daily Reports", icon: "🗓️" },
  { key: "reports",      label: "Reports",        icon: "📑" },
  { key: "qcsShipment",  label: "QCS Shipments",  icon: "📦" },
  { key: "kpi",          label: "KPI",            icon: "📈" },
];

export default function AdminDashboard() {
  const navigate     = useNavigate();
  const fileInputRef = useRef(null);

  const [reports, setReports]           = useState([]);
  const [dailyReports, setDailyReports] = useState([]);
  const [activeView, setActiveView]     = useState("dailyReports");
  const [loading, setLoading]           = useState(false);
  const [opMsg, setOpMsg]               = useState("");
  const [lastSync, setLastSync]         = useState("");
  const [stats, setStats]               = useState({ daily:0, master:0, total:0 });
  const [dateStr, setDateStr]           = useState("");

  useEffect(() => {
    const fmt = () => setDateStr(new Date().toLocaleString("en-AE",{timeZone:"Asia/Dubai",weekday:"long",month:"long",day:"numeric",hour:"2-digit",minute:"2-digit"}));
    fmt(); const t=setInterval(fmt,30_000); return ()=>clearInterval(t);
  }, []);

  async function reloadFromServer() {
    setLoading(true); setOpMsg("");
    try {
      const [r,d,allTypes] = await Promise.all([fetchByType("reports"),fetchByType("dailyReports"),fetchAllTypes()]);
      setReports(r); setDailyReports(d);
      setLastSync(new Date().toISOString());
      const {counts,groups}=allTypes||{};
      let dailyFromGroups=0;
      Object.values(groups||{}).forEach(list=>list.forEach(t=>{dailyFromGroups+=counts[t]||0;}));
      const masterReports=Array.isArray(r)?r.length:0, metaDaily=Array.isArray(d)?d.length:0, dailyTotal=dailyFromGroups+metaDaily;
      setStats({daily:dailyTotal,master:masterReports,total:dailyTotal+masterReports});
    } catch(e) { console.error(e); setOpMsg("❌ Failed to load data from server."); }
    finally { setLoading(false); setTimeout(()=>setOpMsg(""),3500); }
  }

  useEffect(()=>{reloadFromServer();},[]);

  async function handleExportAll() {
    try {
      setOpMsg("Preparing export…"); setLoading(true);
      const {data,counts,groups}=await fetchAllTypes();
      const total=Object.values(counts).reduce((a,b)=>a+b,0);
      downloadJson({meta:{version:1,exportedAt:new Date().toISOString(),apiBase:API_BASE,totals:{...counts,__grandTotal:total},groups},data},`qms_all_${new Date().toISOString().replace(/[:.]/g,"-")}.json`);
      setOpMsg(`✅ Exported ${total} record(s).`);
    } catch(e) { console.error(e); setOpMsg("❌ Export failed."); }
    finally { setLoading(false); setTimeout(()=>setOpMsg(""),4000); }
  }

  async function multiTypeImport(parsed) {
    let queue=[];
    if (parsed&&!Array.isArray(parsed)) {
      if (parsed.data&&typeof parsed.data==="object") {
        for (const [type,arr] of Object.entries(parsed.data)) {
          if (!Array.isArray(arr)) continue;
          for (const item of arr) queue.push(item?.type&&item?.payload?{type:item.type,payload:item.payload}:{type,payload:item});
        }
      } else if (parsed.type&&Array.isArray(parsed.items)) {
        for (const item of parsed.items) queue.push(item?.type&&item?.payload?{type:item.type,payload:item.payload}:item?.payload?{type:parsed.type,payload:item.payload}:{type:parsed.type,payload:item});
      } else throw new Error("Unsupported JSON structure.");
    } else if (Array.isArray(parsed)) {
      for (const item of parsed) { if (item?.type&&item?.payload) queue.push({type:item.type,payload:item.payload}); else throw new Error("Array items need {type, payload}."); }
    } else throw new Error("Invalid JSON.");
    let ok=0; for (const rec of queue){await upsertOne(rec.type,rec.payload);ok++;} return ok;
  }

  async function handleImport(e) {
    const file=e.target.files?.[0]; if (!file) return;
    if (!window.confirm(`Import "${file.name}"?\nThis may overwrite existing records.`)){if(e?.target)e.target.value="";return;}
    try {
      setLoading(true); setOpMsg("Reading file…");
      const parsed=JSON.parse(await file.text());
      setOpMsg("Uploading…");
      const count=await multiTypeImport(parsed);
      await reloadFromServer(); setOpMsg(`✅ Imported ${count} item(s).`);
    } catch(err){console.error(err);setOpMsg("❌ Import failed. Check format.");}
    finally{setLoading(false);setTimeout(()=>setOpMsg(""),4000);if(e?.target)e.target.value="";}
  }

  const isErr = opMsg.startsWith("❌");

  return (
    <>
      <style>{CSS}</style>
      <div className="ad-root">

        {/* Header */}
        <header className="ad-header">
          <div>
            <div className="ad-header-title">📊 Admin Dashboard</div>
            <div className="ad-header-sub">{dateStr} · Central QMS Control Panel</div>
          </div>
          <div className="ad-header-right">
            <div className="ad-sync-info">
              <div className="ad-sync-text">Last sync: {formatDateTime(lastSync)}</div>
              {loading && <div className="ad-sync-loading">⏳ Loading…</div>}
              {opMsg   && <div className={`ad-sync-msg ${isErr?"err":"ok"}`}>{opMsg}</div>}
            </div>
            <button className="ad-hbtn ad-hbtn-refresh" onClick={reloadFromServer}>🔄 Refresh</button>
            <button className="ad-hbtn ad-hbtn-logout"  onClick={()=>navigate("/")}>🚪 Logout</button>
          </div>
        </header>

        {/* Stats */}
        <div className="ad-stats">
          <div className="ad-stat">
            <div className="ad-stat-label">Daily Reports</div>
            <div className="ad-stat-val">{stats.daily}</div>
            <div className="ad-stat-sub">POS · QCS · FTR · Production</div>
          </div>
          <div className="ad-stat">
            <div className="ad-stat-label">Master Reports</div>
            <div className="ad-stat-val">{stats.master}</div>
            <div className="ad-stat-sub">Consolidated / summary types</div>
          </div>
          <div className="ad-stat ad-stat-green">
            <div className="ad-stat-label">Total Records</div>
            <div className="ad-stat-val">{stats.total}</div>
            <div className="ad-stat-sub">All records currently loaded</div>
          </div>
        </div>

        {/* Tabs */}
        <div className="ad-tabs">
          {TABS.map(t=>(
            <button key={t.key} className={`ad-tab ${activeView===t.key?"active":""}`} onClick={()=>setActiveView(t.key)}>
              <span>{t.icon}</span><span>{t.label}</span>
            </button>
          ))}
        </div>

        {/* Tools */}
        <div className="ad-tools">
          <div className="ad-tools-btns">
            <button className="ad-tool-btn ad-tool-btn-export" onClick={handleExportAll}>⬇️ Export JSON (All)</button>
            <button className="ad-tool-btn ad-tool-btn-import" onClick={()=>fileInputRef.current?.click()}>⬆️ Import JSON</button>
            <input ref={fileInputRef} type="file" accept="application/json" onChange={handleImport} style={{display:"none"}}/>
          </div>
          <div className="ad-tools-hint">Use <b>Export</b> for full backups and <b>Import</b> to restore or migrate data.</div>
        </div>

        {/* Content */}
        <div className="ad-panel">
          {activeView==="reports"      && <ReportsTab reports={reports} setReports={setReports} language="en"/>}
          {activeView==="dailyReports" && (
            <DailyReportsTab
              dailyReports={dailyReports} setDailyReports={setDailyReports}
              onOpenQCSReport={()          => navigate("/admin/monitor/branches/qcs/reports")}
              onOpenPOS19Report={()        => navigate("/admin/pos19")}
              onOpenPOS10Report={()        => navigate("/admin/pos10")}
              onOpenQCSShipmentReport={()  => setActiveView("qcsShipment")}
              onOpenFTR1Report={()         => setActiveView("ftr1")}
              onOpenFTR2Report={()         => setActiveView("ftr2")}
              onOpenProductionReport={()   => navigate("/admin/production")}
              language="en"
            />
          )}
          {activeView==="qcsShipment" && <HideDeleteScope><QCSRawMaterialView language="en"/></HideDeleteScope>}
          {activeView==="kpi"         && <KPIDashboard/>}
          {activeView==="ftr1"        && <FTR1ReportView/>}
          {activeView==="ftr2"        && <FTR2ReportView language="en"/>}
        </div>

        <div className="ad-footer">All rights reserved © Quality Management System</div>
      </div>
    </>
  );
}