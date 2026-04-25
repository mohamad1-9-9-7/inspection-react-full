// src/pages/AdminDashboard.jsx
import React, { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import "./AdminDashboard.css";

import ReportsTab         from "./admin/ReportsTab";
import DailyReportsTab    from "./admin/DailyReportsTab";
import QCSRawMaterialView from "./admin/QCSRawMaterialView";
import KPIDashboard       from "./KPIDashboard";
import FTR1ReportView     from "./monitor/branches/ftr1/FTR1ReportView";
import FTR2ReportView     from "./monitor/branches/ftr2/FTR2ReportView";
import { resilientFetch } from "./monitor/branches/_shared/resilientFetch";

const API_BASE = process.env.REACT_APP_API_URL || "https://inspection-server-4nvj.onrender.com";

/**
 * Wake up the server before making bulk requests.
 * This avoids cascading 502s when Render free-tier is sleeping.
 */
let __serverWokenUp = false;
async function ensureServerAwake(onStatus) {
  if (__serverWokenUp) return true;
  try {
    if (onStatus) onStatus("⏳ Waking up server… (may take ~30 sec)");
    await resilientFetch(
      `${API_BASE}/api/reports?type=__ping__&limit=1`,
      { cache: "no-store" },
      {
        retries: 4,
        initialDelay: 2000,
        maxDelay: 10000,
        timeout: 45000,
        onAttempt: (attempt, err) => {
          if (err && onStatus) {
            onStatus(`⏳ Server starting up… attempt ${attempt}`);
          }
        },
      }
    );
    __serverWokenUp = true;
    if (onStatus) onStatus("");
    return true;
  } catch (e) {
    console.warn("[AdminDashboard] Server wake-up failed:", e);
    if (onStatus) onStatus("⚠️ Server unreachable — showing cached data");
    return false;
  }
}

async function fetchByType(type) {
  try {
    const res = await resilientFetch(
      `${API_BASE}/api/reports?type=${encodeURIComponent(type)}`,
      { cache: "no-store" },
      { retries: 2, initialDelay: 1500, timeout: 25000 }
    );
    if (!res.ok) {
      console.warn(`[AdminDashboard] fetch ${type}: HTTP ${res.status}`);
      return [];
    }
    const json = await res.json().catch(() => []);
    return Array.isArray(json) ? json : json?.data ?? [];
  } catch (e) {
    console.warn(`[AdminDashboard] fetch ${type} failed:`, e?.message || e);
    return []; // graceful empty instead of throwing
  }
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

  // Kick off all fetches in parallel — fetchByType now returns [] on error,
  // so we never throw and never spam 18 sequential failures.
  const allPromises = [];
  for (const [group, typeList] of Object.entries(TYPES_BY_GROUP)) {
    groups[group] = [...typeList];
    for (const type of typeList) {
      allPromises.push(
        fetchByType(type).then((arr) => {
          data[type]   = arr;
          counts[type] = arr.length;
        })
      );
    }
  }
  await Promise.all(allPromises);
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



const TABS = [
  { key: "dailyReports", label: "Daily Reports", icon: "🗓️" },
  { key: "reports",      label: "Reports",        icon: "📑" },
  { key: "qcsShipment",  label: "QCS Shipments",  icon: "📦" },
  { key: "kpi",          label: "KPI",            icon: "📈" },
];

// ── التبويب الافتراضي الذي يُفتح تلقائياً عند تحميل الصفحة ──
const DEFAULT_TAB = { key: "dailyReports", label: "Daily Reports", icon: "🗓️" };

export default function AdminDashboard() {
  const navigate     = useNavigate();
  const fileInputRef = useRef(null);

  const [reports, setReports]           = useState([]);
  const [dailyReports, setDailyReports] = useState([]);
  const [activeView, setActiveView]     = useState(DEFAULT_TAB.key);
  const [openTab, setOpenTab]           = useState(DEFAULT_TAB); // ← يفتح تلقائياً
  const [loading, setLoading]           = useState(false);
  const [opMsg, setOpMsg]               = useState("");
  const [lastSync, setLastSync]         = useState("");
  const [stats, setStats]               = useState({ daily:0, master:0, total:0 });
  const [dateStr, setDateStr]           = useState("");
  const [serverStatus, setServerStatus] = useState(""); // wakeup progress banner

  useEffect(() => {
    const fmt = () => setDateStr(new Date().toLocaleString("en-AE",{timeZone:"Asia/Dubai",weekday:"long",month:"long",day:"numeric",hour:"2-digit",minute:"2-digit"}));
    fmt(); const t=setInterval(fmt,30_000); return ()=>clearInterval(t);
  }, []);

  async function reloadFromServer() {
    setLoading(true); setOpMsg("");

    // 1) Wake up the server first (free-tier cold start) — prevents cascading 502s
    await ensureServerAwake(setServerStatus);

    try {
      // 2) All fetches return [] on failure (no throws), so Promise.all never rejects here
      const [r, d, allTypes] = await Promise.all([
        fetchByType("reports"),
        fetchByType("dailyReports"),
        fetchAllTypes(),
      ]);
      setReports(r);
      setDailyReports(d);
      setLastSync(new Date().toISOString());
      const { counts, groups } = allTypes || {};
      let dailyFromGroups = 0;
      Object.values(groups || {}).forEach((list) =>
        list.forEach((t) => { dailyFromGroups += counts[t] || 0; })
      );
      const masterReports = Array.isArray(r) ? r.length : 0;
      const metaDaily     = Array.isArray(d) ? d.length : 0;
      const dailyTotal    = dailyFromGroups + metaDaily;
      setStats({ daily: dailyTotal, master: masterReports, total: dailyTotal + masterReports });

      if (dailyTotal === 0 && masterReports === 0) {
        setOpMsg("⚠️ No data loaded — server may be unreachable. Try Refresh.");
      }
    } catch (e) {
      console.error("[AdminDashboard] reloadFromServer error:", e);
      setOpMsg("⚠️ Partial load. Some reports may be missing.");
    } finally {
      setLoading(false);
      setServerStatus("");
      setTimeout(() => setOpMsg(""), 4500);
    }
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

  function openTabView(tab) {
    setActiveView(tab.key);
    setOpenTab(tab);
  }

  function closeTabView() {
    setOpenTab(null);
  }

  const isErr = opMsg.startsWith("❌");

  const tabContent = (
    <>
      {activeView === "reports"      && <ReportsTab reports={reports} setReports={setReports} language="en"/>}
      {activeView === "dailyReports" && (
        <DailyReportsTab
          dailyReports={dailyReports} setDailyReports={setDailyReports}
          onOpenQCSReport={()          => navigate("/admin/monitor/branches/qcs/reports")}
          onOpenPOS19Report={()        => navigate("/admin/pos19")}
          onOpenPOS10Report={()        => navigate("/admin/pos10")}
          onOpenQCSShipmentReport={()  => openTabView({ key:"qcsShipment", label:"QCS Shipments", icon:"📦" })}
          onOpenFTR1Report={()         => openTabView({ key:"ftr1", label:"FTR1 Report", icon:"🏭" })}
          onOpenFTR2Report={()         => openTabView({ key:"ftr2", label:"FTR2 Report", icon:"🏭" })}
          onOpenProductionReport={()   => navigate("/admin/production")}
          language="en"
        />
      )}
      {activeView === "qcsShipment"  && <HideDeleteScope><QCSRawMaterialView language="en"/></HideDeleteScope>}
      {activeView === "kpi"          && <KPIDashboard/>}
      {activeView === "ftr1"         && <FTR1ReportView/>}
      {activeView === "ftr2"         && <FTR2ReportView language="en"/>}
    </>
  );

  return (
    <>
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
              {serverStatus && (
                <div style={{
                  background: "#fffbeb",
                  color: "#92400e",
                  border: "1px solid #fde68a",
                  padding: "4px 10px",
                  borderRadius: 6,
                  fontSize: 12,
                  fontWeight: 700,
                  marginTop: 4,
                }}>
                  {serverStatus}
                </div>
              )}
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
          {TABS.map(t => (
            <button
              key={t.key}
              className={`ad-tab ${activeView === t.key ? "active" : ""}`}
              onClick={() => openTabView(t)}
            >
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

        <div className="ad-footer">All rights reserved © Quality Management System</div>
      </div>

      {/* Full-Screen Tab Overlay */}
      {openTab && (
        <div className="ad-panel-overlay">
          <div className="ad-panel-topbar">
            <div className="ad-panel-topbar-title">
              <span>{openTab.icon}</span>
              <span>{openTab.label}</span>
            </div>
            <button className="ad-panel-close" onClick={closeTabView}>
              ✕ Close
            </button>
          </div>
          <div className="ad-panel-body">
            {tabContent}
          </div>
        </div>
      )}
    </>
  );
}