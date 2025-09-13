// src/pages/car/pages/CleaningReports.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";

/* ================= API base (CRA + Vite + window override) ================= */
const API_ROOT_DEFAULT = "https://inspection-server-4nvj.onrender.com";
const fromWindow =
  typeof window !== "undefined" ? window.__QCS_API__ : undefined;
const fromProcess =
  typeof process !== "undefined"
    ? (process.env?.REACT_APP_API_URL || process.env?.VITE_API_URL)
    : undefined;
let fromVite;
try { fromVite = import.meta.env && import.meta.env.VITE_API_URL; } catch { fromVite = undefined; }

const API_BASE = String(fromWindow || fromProcess || fromVite || API_ROOT_DEFAULT).replace(/\/$/, "");
const IS_SAME_ORIGIN = (() => {
  try { return new URL(API_BASE).origin === window.location.origin; }
  catch { return false; }
})();

/* ================ Fetch helper (يعرض رسالة الخطأ الحقيقية) ================ */
async function call(path, { method="GET", json } = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers: json ? { "Content-Type": "application/json" } : undefined,
    body: json ? JSON.stringify(json) : undefined,
    credentials: IS_SAME_ORIGIN ? "include" : "omit",
  });
  const raw = await res.text();
  let data; try { data = raw ? JSON.parse(raw) : null; } catch { data = { raw }; }
  if (!res.ok) {
    const msg = data?.error || data?.message || data?.raw || res.statusText || `HTTP ${res.status}`;
    throw new Error(`HTTP ${res.status} – ${msg}`);
  }
  return data ?? {};
}

/* ================= Utils ================= */
const MONTH_NAMES = ["01 - Jan","02 - Feb","03 - Mar","04 - Apr","05 - May","06 - Jun","07 - Jul","08 - Aug","09 - Sep","10 - Oct","11 - Nov","12 - Dec"];

function splitYMD(dateStr) {
  const m = String(dateStr || "").match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return { ok:false };
  return { y: m[1], m: m[2], d: m[3], ok:true };
}
function normalizeList(data) {
  if (Array.isArray(data)) return data;
  return data?.items || data?.rows || data?.data || [];
}
function getPayload(rec) {
  return rec?.payload || rec?.localCopy || {};
}
function getId(rec) {
  return rec?.id || rec?._id || rec?.uuid || rec?.key || null;
}
function getCreatedTs(rec, payload, dateStr) {
  const a = rec?.createdAt || rec?.created_at || null;
  const b = payload?.createdAt || payload?.created_at || null;
  const c = dateStr || payload?.date || null;
  const pick = a || b || c || 0;
  const t = new Date(pick).getTime();
  return Number.isFinite(t) ? t : 0;
}
function download(name, content, mime="application/json") {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = name; a.click();
  URL.revokeObjectURL(url);
}

/* ================= Component ================= */
export default function CleaningReports() {
  /* ===== styles ===== */
  const page = { padding:"12px", direction:"ltr", background:"#407dc6ff", minHeight:"100vh", fontFamily:"system-ui,-apple-system,Segoe UI,Roboto,Arial,sans-serif" };

  const layout = { display:"grid", gridTemplateColumns:"300px 1fr", gap:12 };
  const sidebar = { background:"#ffffff", border:"1px solid #12b997ff", borderRadius:14, padding:12, boxShadow:"0 6px 16px rgba(23, 2, 7, 0.06)" };

  const searchBox = { width:"100%", padding:"10px 12px", borderRadius:10, border:"1.5px solid #2d71efff", background:"#fff", boxSizing:"border-box" };

  const badge = { padding:"2px 8px", borderRadius:999, background:"#f1f5f9", fontSize:12, fontWeight:800 };

  // صفوف قابلة للطي/الفتح في الشجرة
  const rowToggle = (active)=>({
    display:"flex", justifyContent:"space-between", alignItems:"center",
    padding:"8px 10px", borderRadius:10, cursor:"pointer",
    border: active ? "2px solid #4054ec" : "1px solid #e5e7eb",
    background: active ? "#eef1ff" : "#fff",
    userSelect:"none"
  });
  const monthToggle = { fontWeight:800, fontSize:13, opacity:.9, padding:"6px 8px", borderRadius:8, cursor:"pointer", border:"1px solid #e5e7eb", background:"#fff" };
  const caret = (open)=> open ? "▾" : "▸";

  const headerCard = { background:"#ffffff", border:"1px solid #e5e7eb", borderRadius:14, padding:12, boxShadow:"0 6px 16px rgba(2,6,23,.06)" };

  // ترويسة 3 أعمدة × صفّين
  const headerGrid = {
    display:"grid",
    gridTemplateColumns:"repeat(3, 1fr)",
    gap:10,
    marginTop:6
  };
  const headBox = { border:"1px solid #010611ff", borderRadius:12, background:"#bcd0f0ff", overflow:"hidden" };
  const headLabel = { padding:"8px 10px", background:"#e2e8f0", fontWeight:800, borderBottom:"1px solid #cbd5e1" };
  const headValue = { padding:"10px 12px" };

  const kpiWrap = { display:"grid", gridTemplateColumns:"repeat(4, 1fr)", gap:12, marginTop:12 };
  const kpiBox = { border:"1px solid #e5e7eb", borderRadius:12, padding:"12px", background:"#fff" };

  const thStyle = { border:"2px solid #000", padding:"12px", background:"#c7d7fb", fontWeight:800, overflow:"hidden", whiteSpace:"nowrap", textOverflow:"ellipsis" };
  const tdStyle = { border:"2px solid #000", padding:"10px 12px", background:"#ffffff", overflow:"hidden" };
  const btn = { padding:"10px 14px", borderRadius:10, border:"1px solid #c9d3e6", background:"#fff", cursor:"pointer", fontWeight:700 };
  const btnPrimary = { ...btn, background:"#4054ec", color:"#fff", border:"none" };
  const btnDanger = { ...btn, background:"#dc2626", color:"#fff", border:"none" };
  const btnGhost = { ...btn, background:"#fff" };

  const signBar = { display:"grid", gridTemplateColumns:"1fr 1fr", gap:12, marginTop:12 };
  const signLeft = { borderTop:"1px solid #e5e7eb", paddingTop:10, textAlign:"left", fontWeight:800 };
  const signRight = { borderTop:"1px solid #e5e7eb", paddingTop:10, textAlign:"right", fontWeight:800 };

  /* ===== data ===== */
  const [list, setList] = useState([]);
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");
  const [selected, setSelected] = useState(null); // {y,m,d}

  // فتح/طيّ الشجرة (سنة -> شهور)
  const [openYears, setOpenYears] = useState(()=>new Set());      // افتراضيًا مطوي
  const [openMonths, setOpenMonths] = useState(()=>({}));         // map: year -> Set(months)

  // لا نحرّر — فقط حذف (نحتاج اختيار سجل ضمن اليوم)
  const [activeRecId, setActiveRecId] = useState(null);

  const mainRef = useRef(null);
  const fileRef = useRef(null);

  const toggleYear = (y) => {
    setOpenYears(prev => {
      const next = new Set(prev);
      next.has(y) ? next.delete(y) : next.add(y);
      return next;
    });
  };
  const toggleMonth = (y, m) => {
    setOpenMonths(prev => {
      const curr = new Set(prev[y] || []);
      curr.has(m) ? curr.delete(m) : curr.add(m);
      return { ...prev, [y]: curr };
    });
  };

  async function load() {
    try {
      setLoading(true); setMsg("");
      const data = await call(`/api/reports?type=truck_daily_cleaning`);
      const arr = normalizeList(data);
      setList(arr);
    } catch (e) {
      setMsg(String(e.message || e));
    } finally {
      setLoading(false);
    }
  }
  useEffect(()=>{ load(); }, []);

  /* ===== filter ===== */
  const filtered = useMemo(()=>{
    const t = q.trim().toLowerCase();
    if (!t) return list;
    return list.filter(rec => {
      const payload = getPayload(rec);
      const hay = JSON.stringify({ rec, payload }).toLowerCase();
      return hay.includes(t);
    });
  }, [q, list]);

  /* ===== build tree (Year -> Month -> Day) ===== */
  const tree = useMemo(()=>{
    const g = {};
    for (const rec of filtered) {
      const payload = getPayload(rec);
      const dateStr = payload.date || rec.date || "0000-00-00";
      const s = splitYMD(dateStr);
      const y = s.ok ? s.y : "0000";
      const m = s.ok ? s.m : "00";
      const d = s.ok ? s.d : "00";
      g[y] ||= {};
      g[y][m] ||= {};
      g[y][m][d] ||= [];
      g[y][m][d].push({ original: rec, payload, dateStr });
    }
    // sort each day group by createdAt ascending
    Object.values(g).forEach(months=>{
      Object.values(months).forEach(days=>{
        Object.keys(days).forEach(d=>{
          days[d].sort((a,b)=>{
            const ta = getCreatedTs(a.original, a.payload, a.dateStr);
            const tb = getCreatedTs(b.original, b.payload, b.dateStr);
            return ta - tb;
          });
        });
      });
    });
    return g;
  }, [filtered]);

  // اختر "آخر تقرير مُنشأ" كافتراضي
  useEffect(()=>{
    if (selected) return;
    let best = null, bestTs = -Infinity;
    for (const y of Object.keys(tree)) {
      for (const m of Object.keys(tree[y])) {
        for (const d of Object.keys(tree[y][m])) {
          const bucket = tree[y][m][d];
          const tsInDay = bucket.reduce((mx, r)=>Math.max(mx, getCreatedTs(r.original, r.payload, r.dateStr)), -Infinity);
          if (tsInDay > bestTs) { bestTs = tsInDay; best = { y, m, d }; }
        }
      }
    }
    if (best) setSelected(best);
  }, [tree, selected]);

  /* ===== aggregate selected day ===== */
  const dayData = useMemo(()=>{
    if (!selected) return null;
    const { y, m, d } = selected;
    const bucket = tree?.[y]?.[m]?.[d];
    if (!bucket || !bucket.length) return null;

    const allRows = [];
    for (const rec of bucket) {
      const rows = rec.payload?.rows || [];
      for (const r of rows) allRows.push(r);
    }

    const first = bucket[0]?.payload || {};
    const meta = first.meta || {};
    const checkedBy = first.checkedBy || "-";
    const verifiedBy = first.verifiedBy || "-";
    const chemicalUsed = first.chemicalUsed || "-";

    const fields = ["truckFloor","airCurtain","truckBody","truckDoor","railHook","truckPallets","truckCrates"];
    let totalChecks = 0, okChecks = 0;
    for (const r of allRows) {
      for (const f of fields) {
        if (r[f] != null) {
          totalChecks++;
          if (String(r[f]).toUpperCase() === "C") okChecks++;
        }
      }
    }
    const yesRate = totalChecks ? Math.round((okChecks/totalChecks)*100) : 0;

    const records = bucket.map(b => ({
      id: getId(b.original),
      createdAt: b.original?.createdAt || b.original?.created_at || null,
      payload: b.payload
    }));

    return {
      ymd: `${y}-${m}-${d}`,
      meta, checkedBy, verifiedBy, chemicalUsed,
      rows: allRows,
      counts: { vehicles: allRows.length, yesRate },
      records
    };
  }, [selected, tree]);

  // عيّن سجل افتراضي عند تغيّر يوم العرض
  useEffect(()=>{
    if (!dayData) { setActiveRecId(null); return; }
    if (dayData.records?.length === 1) setActiveRecId(dayData.records[0].id || null);
    else if (dayData.records?.length && !activeRecId) setActiveRecId(dayData.records[0].id || null);
  }, [dayData]); // eslint-disable-line

  const activeRecord = useMemo(()=>{
    if (!dayData || !activeRecId) return null;
    return dayData.records.find(r => (r.id === activeRecId)) || null;
  }, [dayData, activeRecId]);

  /* ===== actions ===== */
  async function handleExportPDF() {
    if (!window.confirm("Confirm exporting current view to PDF?")) return;
    try {
      const el = mainRef.current;
      if (!el) { window.print(); return; }

      // dynamic imports (تحتاج تثبيت html2canvas و jspdf)
      const html2canvasMod = await import("html2canvas");
      const jsPDFMod = await import("jspdf");
      const html2canvas = html2canvasMod.default || html2canvasMod;
      const jsPDF = jsPDFMod.jsPDF || jsPDFMod.default;

      const canvas = await html2canvas(el, { scale: 2, useCORS: true });
      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF({ orientation: "landscape", unit: "pt", format: "a4" });
      const pageW = pdf.internal.pageSize.getWidth();
      const pageH = pdf.internal.pageSize.getHeight();

      const imgW = pageW - 40;
      const partH = Math.floor((canvas.width * (pageH - 40)) / imgW);
      let sY = 0;
      while (sY < canvas.height) {
        const part = document.createElement("canvas");
        part.width = canvas.width;
        part.height = Math.min(partH, canvas.height - sY);
        const ctx = part.getContext("2d");
        ctx.drawImage(canvas, 0, sY, canvas.width, part.height, 0, 0, canvas.width, part.height);
        const partData = part.toDataURL("image/png");
        pdf.addImage(partData, "PNG", 20, 20, imgW, (part.height * imgW) / part.width);
        sY += partH;
        if (sY < canvas.height) pdf.addPage();
      }
      pdf.save(`truck-daily-cleaning_${dayData?.ymd || ""}.pdf`);
    } catch (e) {
      alert(`PDF export failed: ${String(e.message || e)}`);
    }
  }

  function handleExportJSONAll() {
    if (!window.confirm("Confirm exporting ALL loaded cleaning reports as JSON?")) return;
    const all = list.map(r => ({
      id: getId(r),
      type: r?.type || "truck_daily_cleaning",
      payload: getPayload(r),
      createdAt: r?.createdAt || r?.created_at || null,
      updatedAt: r?.updatedAt || r?.updated_at || null
    }));
    download(`truck-daily-cleaning_ALL.json`, JSON.stringify({ items: all }, null, 2));
  }

  async function handleImportJSONBulk(e) {
    const file = e?.target?.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const obj = JSON.parse(text);

      // استنباط قائمة السجلات
      let arr = [];
      if (Array.isArray(obj)) arr = obj;
      else if (Array.isArray(obj?.items)) arr = obj.items;
      else if (Array.isArray(obj?.rows)) arr = obj.rows;
      else if (obj?.type || obj?.payload) arr = [obj];
      else throw new Error("Unrecognized JSON shape for bulk import.");

      let ok = 0, fail = 0;
      for (const it of arr) {
        const body = it?.payload ? it : { type: "truck_daily_cleaning", payload: it };
        try {
          await call(`/api/reports`, { method:"POST", json: body });
          ok++;
        } catch {
          fail++;
        }
      }
      await load();
      alert(`Import finished. OK: ${ok}, Failed: ${fail}`);
    } catch (e2) {
      alert(`Import failed: ${String(e2.message || e2)}`);
    } finally {
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  async function handleDelete() {
    if (!activeRecord?.id) { alert("Select a record to delete from the dropdown."); return; }
    if (!window.confirm(`Confirm delete report: ${activeRecord.id}?`)) return;
    try {
      await call(`/api/reports/${encodeURIComponent(activeRecord.id)}`, { method:"DELETE" });
    } catch {
      await call(`/api/reports?id=${encodeURIComponent(activeRecord.id)}`, { method:"DELETE" });
    }
    await load();
    setActiveRecId(null);
    alert("Deleted.");
  }

  /* ===== render ===== */
  const yearKeys = useMemo(()=>Object.keys(tree).sort((a,b)=>a.localeCompare(b)), [tree]); // old -> new

  return (
    <div style={page}>
      <div style={{display:"flex", gap:8, marginBottom:10, flexWrap:"wrap"}}>
        <button onClick={load} disabled={loading} style={btnPrimary}>
          {loading ? "Loading..." : "Refresh from Server"}
        </button>

        {/* أزرار عامة شاملة */}
        <button onClick={handleExportPDF} style={btnGhost} title="Export current view to PDF">Export PDF</button>
        <button onClick={handleExportJSONAll} style={btnGhost} title="Export ALL cleaning reports as JSON">Export JSON (All)</button>
        <label style={{...btnGhost, display:"inline-block"}} title="Bulk Import JSON (array/items)">
          Import JSON (Bulk)
          <input ref={fileRef} onChange={handleImportJSONBulk} type="file" accept="application/json" style={{display:"none"}} />
        </label>

        <div style={{alignSelf:"center", color:"#b00020", fontWeight:700}}>{msg}</div>
      </div>

      <div style={layout}>
        {/* ===== Left: Sidebar (collapsible date tree) ===== */}
        <aside style={sidebar}>
          <input
            placeholder='Search day… e.g. "2025", "June", or ">=2"'
            value={q}
            onChange={e=>setQ(e.target.value)}
            style={searchBox}
          />

          {yearKeys.length === 0 && !loading && <p style={{marginTop:10}}>No data.</p>}

          {yearKeys.map((y)=>{
            const months = tree[y];
            const monthKeys = Object.keys(months).sort((a,b)=>a.localeCompare(b)); // 01..12
            let yearDays = 0;
            monthKeys.forEach(m=>{
              yearDays += Object.keys(months[m]).length;
            });
            const yOpen = openYears.has(y);

            return (
              <div key={y} style={{marginTop:12}}>
                {/* Year toggle */}
                <div onClick={()=>toggleYear(y)} style={rowToggle(false)}>
                  <span style={{fontWeight:900}}>{caret(yOpen)} Year: {y}</span>
                  <span style={{...badge, marginLeft:6}}>{yearDays} day(s)</span>
                </div>

                {/* Months (only if year open) */}
                {yOpen && (
                  <div style={{marginTop:8, marginLeft:6, display:"grid", gap:8}}>
                    {monthKeys.map((m)=>{
                      const days = months[m];
                      const dayKeys = Object.keys(days).sort((a,b)=>a.localeCompare(b));
                      const monthLabel = MONTH_NAMES[Number(m)-1] || m;
                      const mOpen = (openMonths[y] && openMonths[y].has(m)) || false;

                      return (
                        <div key={`${y}-${m}`}>
                          {/* Month toggle */}
                          <div onClick={()=>toggleMonth(y,m)} style={monthToggle}>
                            {caret(mOpen)} Month: {monthLabel} <span style={{...badge, marginLeft:8}}>{dayKeys.length} day(s)</span>
                          </div>

                          {/* Days (only if month open) */}
                          {mOpen && (
                            <div style={{display:"grid", gap:6, marginTop:6, marginLeft:6}}>
                              {dayKeys.map((d)=>{
                                const vehCount = days[d].reduce((acc, r)=>acc + ((r.payload?.rows||[]).length), 0);
                                const active = selected && selected.y===y && selected.m===m && selected.d===d;
                                return (
                                  <div
                                    key={`${y}-${m}-${d}`}
                                    onClick={()=>{ setSelected({y,m,d}); setActiveRecId(null); }}
                                    style={rowToggle(active)}
                                    title={`${vehCount} record(s)`}
                                  >
                                    <span>{new Date(`${y}-${m}-${d}T00:00:00`).toDateString()}</span>
                                    <span style={badge}>{vehCount} record(s)</span>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </aside>

        {/* ===== Right: Content (day details) ===== */}
        <main ref={mainRef}>
          {!dayData ? (
            <div style={headerCard}>Select a day from the left.</div>
          ) : (
            <>
              <div style={headerCard}>
                <h2 style={{margin:"0 0 8px"}}>
                  Day Details: {new Date(`${dayData.ymd}T00:00:00`).toDateString()}
                </h2>

                {/* Document Header: 3 × 2 */}
                <div style={headerGrid}>
                  <div style={headBox}>
                    <div style={headLabel}>Document Title</div>
                    <div style={headValue}>{dayData.meta.documentTitle || "TRUCK DAILY CLEANING CHECKLIST"}</div>
                  </div>
                  <div style={headBox}>
                    <div style={headLabel}>Document No</div>
                    <div style={headValue}>{dayData.meta.documentNo || "TELT/SAN/TDCL/1"}</div>
                  </div>
                  <div style={headBox}>
                    <div style={headLabel}>Issue Date</div>
                    <div style={headValue}>{dayData.meta.issueDate || "-"}</div>
                  </div>

                  <div style={headBox}>
                    <div style={headLabel}>Revision No</div>
                    <div style={headValue}>{dayData.meta.revisionNo || "1"}</div>
                  </div>
                  <div style={headBox}>
                    <div style={headLabel}>Area</div>
                    <div style={headValue}>{dayData.meta.area || "QA"}</div>
                  </div>
                  <div style={headBox}>
                    <div style={headLabel}>Controlling Officer</div>
                    <div style={headValue}>{dayData.meta.controllingOfficer || "-"}</div>
                  </div>
                </div>

                {/* KPIs */}
                <div style={kpiWrap}>
                  <div style={kpiBox}>
                    <div style={{fontWeight:800}}>Vehicles</div>
                    <div style={{fontSize:28, fontWeight:900}}>{dayData.counts.vehicles}</div>
                    <div style={{opacity:.75}}>Records for this day</div>
                  </div>

                  <div style={kpiBox}>
                    <div style={{fontWeight:800}}>Yes rate (visual checks)</div>
                    <div style={{display:"flex", alignItems:"center", gap:12, marginTop:8}}>
                      <div
                        style={{
                          width:64, height:64, borderRadius:"50%",
                          background: `conic-gradient(#4054ec ${dayData.counts.yesRate}%, #e5e7eb 0)`,
                          display:"grid", placeItems:"center", fontWeight:900
                        }}
                      >
                        <span style={{fontSize:12}}>{dayData.counts.yesRate}%</span>
                      </div>
                      <div style={{opacity:.75}}>C / total checks</div>
                    </div>
                  </div>

                  <div style={kpiBox}>
                    <div style={{fontWeight:800}}>Remark</div>
                    <div style={{opacity:.85}}>{dayData.meta.remark || "-"}</div>
                  </div>

                  <div style={kpiBox}>
                    <div style={{fontWeight:800}}>Chemical used</div>
                    <div style={{opacity:.85}}>{dayData.chemicalUsed || "-"}</div>
                  </div>
                </div>
              </div>

              {/* اختيار سجل ضمن اليوم + زر الحذف فقط */}
              {!!dayData.records?.length && (
                <div style={{marginTop:12, background:"#ffffff", border:"1px solid #e5e7eb", borderRadius:14, padding:12, boxShadow:"0 6px 16px rgba(2,6,23,.06)"}}>
                  <div style={{display:"flex", gap:8, alignItems:"center", flexWrap:"wrap"}}>
                    <div style={{fontWeight:800}}>Record to delete:</div>
                    <select
                      value={activeRecId || ""}
                      onChange={e=> setActiveRecId(e.target.value || null)}
                      style={{padding:"8px 10px", borderRadius:10, border:"1px solid #cbd5e1", minWidth:280}}
                    >
                      {(dayData.records || []).map(r=>{
                        const d = r.payload?.date || dayData.ymd;
                        const t = r.createdAt ? new Date(r.createdAt).toLocaleString() : "";
                        return (
                          <option key={r.id || Math.random()} value={r.id || ""}>
                            {`${r.id || "(no-id)"} • ${d} • ${t}`}
                          </option>
                        );
                      })}
                    </select>

                    <button onClick={handleDelete} disabled={!activeRecord} style={btnDanger} title="Delete selected record">Delete</button>
                  </div>
                </div>
              )}

              {/* Daily Vehicles List */}
              <div style={{marginTop:12, background:"#ffffff", border:"1px solid #e5e7eb", borderRadius:14, padding:12, boxShadow:"0 6px 16px rgba(2,6,23,.06)"}}>
                <div style={{display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:8}}>
                  <h3 style={{margin:0}}>Daily Vehicles List ({dayData.counts.vehicles} vehicles)</h3>
                  <div style={{display:"flex", gap:8}}>
                    <button onClick={load} disabled={loading} style={btn}>Refresh</button>
                  </div>
                </div>

                <div style={{overflowX:"auto"}}>
                  <table style={{borderCollapse:"collapse", minWidth:1100, width:"100%", tableLayout:"fixed"}}>
                    <thead>
                      <tr>
                        {[
                          "Vehicle No","Truck floor","Air Curtain","Truck body","Truck door",
                          "Rail/hook etc.","Truck pallets","Truck crates","Informed to","Remarks"
                        ].map(h=>(<th key={h} style={thStyle}>{h}</th>))}
                      </tr>
                    </thead>
                    <tbody>
                      {dayData.rows.map((r, i)=>(
                        <tr key={i}>
                          <td style={tdStyle}>{r.truckNo}</td>
                          <td style={tdStyle}>{emoji(r.truckFloor)}</td>
                          <td style={tdStyle}>{emoji(r.airCurtain)}</td>
                          <td style={tdStyle}>{emoji(r.truckBody)}</td>
                          <td style={tdStyle}>{emoji(r.truckDoor)}</td>
                          <td style={tdStyle}>{emoji(r.railHook)}</td>
                          <td style={tdStyle}>{emoji(r.truckPallets)}</td>
                          <td style={tdStyle}>{emoji(r.truckCrates)}</td>
                          <td style={tdStyle}>{r.informedTo || "-"}</td>
                          <td style={tdStyle}>{r.remarks || "-"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* التواقيع أسفل الجدول: يسار/يمين */}
                <div style={signBar}>
                  <div style={signLeft}>Inspected By: <b>{dayData.checkedBy || "-"}</b></div>
                  <div style={signRight}>Verified By: <b>{dayData.verifiedBy || "-"}</b></div>
                </div>
              </div>
            </>
          )}
        </main>
      </div>
    </div>
  );
}

/* ===== helpers ===== */
function emoji(val) {
  if (String(val||"").toUpperCase() === "C") return "C";
  if (String(val||"").toUpperCase() === "N/C") return "NC";
  return val || "-";
}
