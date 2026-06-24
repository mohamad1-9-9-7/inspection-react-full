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
import ExpiryWidget       from "../components/ExpiryWidget";
import API_BASE           from "../config/api";

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
          totalReportsCount={stats.daily}
          onOpenQCSReport={()          => navigate("/admin/monitor/branches/qcs/reports")}
          onOpenPOS19Report={()        => navigate("/admin/pos19")}
          onOpenPOS10Report={()        => navigate("/admin/pos10")}
          onOpenFTR1Report={()         => openTabView({ key:"ftr1", label:"FTR1 Report", icon:"🏭" })}
          onOpenFTR2Report={()         => openTabView({ key:"ftr2", label:"FTR2 Report", icon:"🏭" })}
          onOpenProductionReport={()   => navigate("/admin/production")}
          language="en"
        />
      )}
      {activeView === "kpi"  && <KPIDashboard/>}
      {activeView === "ftr1" && <FTR1ReportView/>}
      {activeView === "ftr2"         && <FTR2ReportView language="en"/>}
    </>
  );

  return (
    <div className="ad2-shell">
      <aside className="ad2-sidebar">
        <div className="ad2-brand">
          <div className="ad2-brand-mark">Q</div>
          <div>
            <strong>QMS Admin</strong>
            <span>Control Center</span>
          </div>
        </div>

        <div className="ad2-nav-label">Workspace</div>
        <nav className="ad2-nav" aria-label="Admin workspace">
          {TABS.map((tab) => (
            <button
              key={tab.key}
              className={`ad2-nav-item ${activeView === tab.key ? "active" : ""}`}
              onClick={() => openTabView(tab)}
            >
              <span className="ad2-nav-icon">{tab.icon}</span>
              <span>{tab.label}</span>
              <span className="ad2-nav-arrow">›</span>
            </button>
          ))}
        </nav>

        <div className="ad2-nav-label ad2-data-label">Data management</div>
        <div className="ad2-data-tools">
          <button onClick={handleExportAll}>⬇ Export all data</button>
          <button onClick={() => fileInputRef.current?.click()}>⬆ Import backup</button>
          <input ref={fileInputRef} type="file" accept="application/json" onChange={handleImport} hidden />
        </div>

        <div className="ad2-sidebar-foot">
          <span className={`ad2-status-dot ${loading ? "busy" : ""}`} />
          <div><strong>{loading ? "Synchronizing" : "System online"}</strong><span>Quality Management System</span></div>
        </div>
      </aside>

      <main className="ad2-main">
        <header className="ad2-topbar">
          <div className="ad2-page-copy">
            <span className="ad2-eyebrow">ADMINISTRATION</span>
            <h1>{openTab?.label || "Admin Dashboard"}</h1>
            <p>{dateStr} · Central QMS Control Panel</p>
          </div>
          <div className="ad2-top-actions">
            <div className="ad2-sync"><span>Last sync</span><strong>{formatDateTime(lastSync)}</strong></div>
            <button className="ad2-action ai" onClick={() => navigate("/ai-assistant")}>🤖 AI Assistant</button>
            <button className="ad2-action" onClick={reloadFromServer}>↻ Refresh</button>
            <button className="ad2-action logout" onClick={() => navigate("/")}>Logout</button>
          </div>
        </header>

        {(serverStatus || opMsg) && (
          <div className={`ad2-notice ${isErr ? "error" : ""}`}>
            <span>{isErr ? "!" : loading ? "…" : "✓"}</span>
            {serverStatus || opMsg}
          </div>
        )}

        <section className="ad2-metrics" aria-label="Report statistics">
          <article><div className="ad2-metric-icon teal">🗓️</div><div><span>Daily Reports</span><strong>{stats.daily}</strong><small>POS · QCS · FTR · Production</small></div></article>
          <article><div className="ad2-metric-icon blue">📑</div><div><span>Master Reports</span><strong>{stats.master}</strong><small>Consolidated and summary records</small></div></article>
          <article><div className="ad2-metric-icon green">✓</div><div><span>Total Records</span><strong>{stats.total}</strong><small>All records currently loaded</small></div></article>
        </section>

        <section className="ad2-expiry"><ExpiryWidget /></section>

        <section className="ad2-workspace">
          <div className="ad2-workspace-head">
            <div>
              <span>ACTIVE WORKSPACE</span>
              <h2>{openTab?.icon} {openTab?.label || "Daily Reports"}</h2>
            </div>
            {(activeView === "ftr1" || activeView === "ftr2") && (
              <button onClick={() => openTabView(DEFAULT_TAB)}>← Back to Daily Reports</button>
            )}
          </div>
          <div className="ad2-workspace-body">{tabContent}</div>
        </section>

        <footer className="ad2-footer">Quality Management System · Admin Control Center</footer>
      </main>
    </div>
  );
}
