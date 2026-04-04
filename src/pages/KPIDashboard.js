// src/pages/KPIDashboard.js
import React, { useState, useEffect, useRef, useMemo } from "react";
import CountUp from "react-countup";

const API_BASE =
  process.env.REACT_APP_API_URL || "https://inspection-server-4nvj.onrender.com";

async function fetchByType(type) {
  const res = await fetch(`${API_BASE}/api/reports?type=${encodeURIComponent(type)}`, { cache: "no-store" });
  if (!res.ok) throw new Error(`${res.status} while fetching ${type}`);
  const json = await res.json().catch(() => []);
  return Array.isArray(json) ? json : json?.data ?? [];
}

function pickDate(rec) {
  const cands = [rec?.payload?.reportDate, rec?.reportDate, rec?.date, rec?.createdAt].filter(Boolean);
  const d = cands[0]; if (!d) return "";
  const s = String(d);
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
  const ts = Date.parse(s);
  if (Number.isFinite(ts)) return new Date(ts).toISOString().slice(0, 10);
  if (/^[a-f0-9]{24}$/i.test(s)) { const ms = parseInt(s.slice(0,8),16)*1000; if (ms > 1_000_000_000_000) return new Date(ms).toISOString().slice(0,10); }
  return "";
}

const normalizeInspection = (raw) => raw.map(r => { const p = r?.payload||r||{}; return { ...p, percentage: Number(p.percentage??r?.percentage??0), date: pickDate(r) }; });
const normalizeQcsCoolers = (raw) => raw.map(r => { const p = r?.payload||r||{}; return { ...p, coolers: Array.isArray(p.coolers)?p.coolers:[], date: pickDate(r) }; });
const normalizeSimple     = (raw) => raw.map(r => ({ date: pickDate(r) })).filter(x => x.date);
const normalizeShipments  = (raw) => raw.map(r => { const p = r?.payload||r||{}; return { ...p, status: p.status||r?.status||"", shipmentType: p.shipmentType||r?.shipmentType||"غير محدد", productName: p.productName||p.name||r?.name||"", supplier: p.supplier||p.butchery||r?.supplier||"", butchery: p.butchery||"", remarks: p.remarks||"", date: pickDate(r) }; });
const normalizeLoading    = (raw) => raw.map(r => { const p = r?.payload||r||{}; return { ...p, date: pickDate(r), timeStart: p.timeStart||"", timeEnd: p.timeEnd||"", tempCheck: p.tempCheck??p.temp??"", visual: p.visual||{} }; });

function normalizeReturns(raw) {
  const stampOf = x => { if (!x) return 0; if (typeof x==="number") return x; const n=Date.parse(x); if (Number.isFinite(n)) return n; if (typeof x==="string"&&/^[a-f0-9]{24}$/i.test(x)) return parseInt(x.slice(0,8),16)*1000; return 0; };
  const entries = raw.map(rec => { const p=rec?.payload||rec||{}; return { reportDate: p.reportDate||rec?.reportDate||pickDate(rec)||"", items: Array.isArray(p.items)?p.items:[], _stamp: stampOf(rec?.updatedAt)||stampOf(rec?.createdAt)||stampOf(rec?._id)||stampOf(p._clientSavedAt) }; }).filter(e => e.reportDate);
  const latest = new Map();
  for (const e of entries) { const prev=latest.get(e.reportDate); latest.set(e.reportDate, !prev||e._stamp>=(prev._stamp||0)?e:prev); }
  return Array.from(latest.values()).map(({reportDate,items})=>({reportDate,items})).sort((a,b)=>b.reportDate.localeCompare(a.reportDate));
}

function numColor(val, type = "") {
  const v = Number(val);
  if (type==="temp")       return v<2?"#059669":v<7?"#d97706":"#dc2626";
  if (type==="percentage") return v>=80?"#059669":v>=50?"#d97706":"#dc2626";
  if (type==="good")       return "#2563eb";
  if (type==="warn")       return "#d97706";
  if (type==="bad")        return "#dc2626";
  return "#6b7280";
}

function numBg(val, type = "") {
  const v = Number(val);
  if (type==="temp")       return v<2?"#ecfdf5":v<7?"#fffbeb":"#fef2f2";
  if (type==="percentage") return v>=80?"#ecfdf5":v>=50?"#fffbeb":"#fef2f2";
  if (type==="good")       return "#eff6ff";
  if (type==="warn")       return "#fffbeb";
  if (type==="bad")        return "#fef2f2";
  return "#f9fafb";
}

const toMinutes = t => { if (!t||!/^\d{1,2}:\d{2}$/.test(t)) return null; const [h,m]=t.split(":").map(Number); return h*60+m; };

function BarChart({ data }) {
  const entries = Object.entries(data||{});
  if (!entries.length) return <div style={{color:"#9ca3af",textAlign:"center",padding:"16px 0",fontSize:13}}>لا توجد بيانات</div>;
  const max = Math.max(...entries.map(([,v])=>Number(v)),1);
  return (
    <div style={{display:"flex",flexDirection:"column",gap:10,padding:"8px 0"}}>
      {entries.map(([label,value])=>(
        <div key={label}>
          <div style={{fontSize:11,fontWeight:700,color:"#6b7280",marginBottom:4,textAlign:"right"}}>{label}</div>
          <div style={{background:"#e0e7ff",borderRadius:8,height:22,overflow:"hidden"}}>
            <div style={{width:`${(Number(value)/max)*100}%`,height:"100%",background:"linear-gradient(90deg,#6366f1,#a5b4fc)",borderRadius:8,display:"flex",alignItems:"center",justifyContent:"flex-end",paddingRight:10,minWidth:28,transition:"width .45s"}}>
              <span style={{color:"#fff",fontSize:11,fontWeight:800}}>{value}</span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function Modal({ show, onClose, title, children }) {
  if (!show) return null;
  return (
    <div style={{position:"fixed",inset:0,background:"rgba(15,23,42,.45)",backdropFilter:"blur(4px)",display:"grid",placeItems:"center",zIndex:1200}} onClick={onClose}>
      <div style={{background:"#fff",border:"1px solid #e2e8f0",borderRadius:20,padding:"24px 26px",width:"calc(100vw - 32px)",maxWidth:940,maxHeight:"85vh",overflowY:"auto",position:"relative",boxShadow:"0 24px 60px rgba(15,23,42,.18)"}} onClick={e=>e.stopPropagation()}>
        <button onClick={onClose} style={{position:"absolute",top:14,left:14,width:28,height:28,borderRadius:"50%",border:"none",background:"#fee2e2",color:"#dc2626",fontWeight:900,fontSize:16,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center"}}>✕</button>
        <div style={{fontWeight:900,color:"#4f46e5",fontSize:15,marginBottom:16,paddingRight:8}}>{title}</div>
        {children}
      </div>
    </div>
  );
}

function KPICard({ icon, label, value, colorType, suffix="", onClick }) {
  const numVal = parseFloat(value)||0;
  const color  = numColor(numVal, colorType);
  const bg     = numBg(numVal, colorType);
  const Wrapper = onClick ? "button" : "div";
  return (
    <Wrapper onClick={onClick} style={{background:"#fff",border:"1.5px solid #e2e8f0",borderRadius:16,padding:"20px 16px",textAlign:"center",display:"flex",flexDirection:"column",alignItems:"center",gap:8,cursor:onClick?"pointer":"default",transition:"transform .14s,box-shadow .18s,border-color .18s",outline:"none",fontFamily:"inherit",position:"relative",overflow:"hidden",boxShadow:"0 2px 8px rgba(15,23,42,.06)"}} className="kpi-card">
      <div style={{position:"absolute",top:0,left:0,right:0,height:3,borderRadius:"0 0 0 0",background:color,opacity:.7}}/>
      <div style={{width:48,height:48,borderRadius:12,background:bg,display:"flex",alignItems:"center",justifyContent:"center",fontSize:22}}>{icon}</div>
      <div style={{fontSize:10.5,fontWeight:700,textTransform:"uppercase",letterSpacing:".1em",color:"#94a3b8"}}>{label}</div>
      <div style={{fontSize:30,fontWeight:900,color,lineHeight:1,display:"flex",alignItems:"baseline",gap:2}}>
        <CountUp end={numVal} duration={1.1} decimals={Number.isInteger(numVal)?0:1} separator=","/>
        {suffix&&<span style={{fontSize:17,fontWeight:800}}>{suffix}</span>}
      </div>
      {onClick&&<div style={{fontSize:10,fontWeight:700,color:"#94a3b8",marginTop:2}}>انقر للتفاصيل 🔍</div>}
    </Wrapper>
  );
}

const TH = {padding:"11px 10px",textAlign:"center",fontSize:11,fontWeight:800,letterSpacing:".06em",textTransform:"uppercase",borderBottom:"2px solid #e2e8f0",color:"#64748b",whiteSpace:"nowrap",background:"#f8fafc"};
const TD = {padding:"10px 8px",textAlign:"center",fontSize:12,color:"#374151",borderBottom:"1px solid #f1f5f9"};

function ShipmentsTable({ rows, statusColor }) {
  if (!rows.length) return <div style={{textAlign:"center",color:"#9ca3af",padding:28,fontSize:13}}>لا يوجد بيانات في الفترة المحددة.</div>;
  return (
    <div style={{overflowX:"auto"}}>
      <table style={{width:"100%",borderCollapse:"collapse",minWidth:780,fontSize:12}}>
        <thead><tr>{["#","التاريخ","اسم الشحنة","النوع","الفرع/المورد","الحالة","ملاحظات"].map(h=><th key={h} style={TH}>{h}</th>)}</tr></thead>
        <tbody>{rows.map((row,i)=>(
          <tr key={i} style={{background:i%2?"#f8fafc":"#fff"}}>
            <td style={TD}>{i+1}</td>
            <td style={TD}>{row.date||"—"}</td>
            <td style={TD}>{row.productName||row.name||"—"}</td>
            <td style={TD}>{row.shipmentType||"—"}</td>
            <td style={TD}>{row.butchery||row.supplier||"—"}</td>
            <td style={{...TD,color:statusColor,fontWeight:800}}>{row.status}</td>
            <td style={TD}>{row.remarks||"—"}</td>
          </tr>
        ))}</tbody>
      </table>
    </div>
  );
}

const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800;900&display=swap');
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0;}
html,body{height:100%;}
body{font-family:'Plus Jakarta Sans',system-ui,sans-serif;background:#f1f5f9;color:#1e293b;-webkit-font-smoothing:antialiased;}

.kpi-root{position:relative;z-index:1;max-width:1280px;margin:0 auto;padding:24px 20px 60px;direction:rtl;}

.kpi-header{display:flex;align-items:center;justify-content:space-between;gap:16px;flex-wrap:wrap;background:#fff;border:1.5px solid #e2e8f0;border-radius:20px;padding:20px 28px;margin-bottom:18px;box-shadow:0 4px 24px rgba(15,23,42,.07);}
.kpi-h-title{font-size:20px;font-weight:900;color:#1e293b;display:flex;align-items:center;gap:10px;letter-spacing:-.3px;}
.kpi-h-sub{font-size:11.5px;color:#94a3b8;font-weight:500;margin-top:5px;}

.kpi-alert{background:#fef2f2;border:1.5px solid #fecaca;border-radius:12px;padding:14px 18px;margin-bottom:18px;font-size:13px;font-weight:700;color:#dc2626;display:flex;flex-direction:column;gap:5px;}

.kpi-filters{display:flex;align-items:center;gap:12px;flex-wrap:wrap;background:#fff;border:1.5px solid #e2e8f0;border-radius:14px;padding:12px 18px;margin-bottom:18px;box-shadow:0 2px 8px rgba(15,23,42,.04);}
.kpi-filter-label{font-size:11px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:.12em;white-space:nowrap;}
.kpi-date-input{padding:8px 12px;border-radius:9px;border:1.5px solid #e2e8f0;background:#f8fafc;color:#1e293b;font-size:12px;font-weight:600;font-family:'Plus Jakarta Sans',sans-serif;outline:none;transition:border-color .15s;}
.kpi-date-input:focus{border-color:#6366f1;}
.kpi-filter-sep{color:#cbd5e1;font-size:11px;}

.kpi-btn{display:inline-flex;align-items:center;gap:6px;padding:8px 14px;border-radius:9px;border:none;font-size:12px;font-weight:800;font-family:'Plus Jakarta Sans',sans-serif;cursor:pointer;transition:opacity .15s,transform .1s;}
.kpi-btn:active{transform:scale(.96);}
.kpi-btn:hover{opacity:.88;}
.kpi-btn-reset{background:#fef3c7;color:#92400e;border:1.5px solid #fde68a;}
.kpi-btn-export{background:linear-gradient(135deg,#6366f1,#818cf8);color:#fff;}
.kpi-btn-import{background:linear-gradient(135deg,#10b981,#34d399);color:#fff;}

.kpi-section{font-size:10px;font-weight:800;color:#94a3b8;text-transform:uppercase;letter-spacing:.2em;display:flex;align-items:center;gap:12px;margin:22px 0 12px;}
.kpi-section::before{content:'';flex:1;height:1px;background:#e2e8f0;}

.kpi-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:12px;}

.kpi-card:hover{transform:translateY(-3px)!important;border-color:#c7d2fe!important;box-shadow:0 12px 28px rgba(99,102,241,.12)!important;}

.kpi-wide{background:#fff;border:1.5px solid #e2e8f0;border-radius:16px;padding:20px 18px;box-shadow:0 2px 8px rgba(15,23,42,.04);}

.kpi-footer{margin-top:32px;text-align:center;font-size:11.5px;font-weight:600;color:#cbd5e1;}
.kpi-modal-err{font-size:11px;font-weight:700;color:#dc2626;margin-top:8px;text-align:center;}

@media(max-width:640px){.kpi-header{flex-direction:column;align-items:flex-start;}.kpi-grid{grid-template-columns:repeat(auto-fill,minmax(160px,1fr));}}
`;

export default function KPIDashboard() {
  const [inspection,     setInspection]     = useState([]);
  const [qcsCoolers,     setQcsCoolers]     = useState([]);
  const [qcsDailyAll,    setQcsDailyAll]    = useState([]);
  const [shipments,      setShipments]      = useState([]);
  const [loadingReports, setLoadingReports] = useState([]);
  const [returnsReports, setReturnsReports] = useState([]);
  const [fetching,  setFetching]  = useState(true);
  const [fetchErr,  setFetchErr]  = useState("");
  const [dateFrom,  setDateFrom]  = useState("");
  const [dateTo,    setDateTo]    = useState("");
  const [dateStr,   setDateStr]   = useState("");
  const [wasatOpen,          setWasatOpen]          = useState(false);
  const [tahtWasatOpen,      setTahtWasatOpen]      = useState(false);
  const [returnsDetailsOpen, setReturnsDetailsOpen] = useState(false);
  const [importError, setImportError] = useState("");
  const fileInputRef = useRef(null);

  useEffect(() => {
    const fmt = () => setDateStr(new Date().toLocaleDateString("ar-AE",{timeZone:"Asia/Dubai",weekday:"long",month:"long",day:"numeric"}));
    fmt(); const t=setInterval(fmt,60_000); return ()=>clearInterval(t);
  }, []);

  useEffect(() => {
    let alive=true;
    (async()=>{
      try {
        setFetching(true); setFetchErr("");
        const [rawInsp,rawCoolers,rawPH,rawClean,rawShip,rawLoad,rawRet] = await Promise.all([
          fetchByType("reports").catch(()=>[]),
          fetchByType("qcs-coolers").catch(()=>[]),
          fetchByType("qcs-ph").catch(()=>[]),
          fetchByType("qcs-clean").catch(()=>[]),
          fetchByType("qcs_raw_material_reports").catch(()=>[]),
          fetchByType("cars_loading_inspection_v1").catch(()=>[]),
          fetchByType("returns").catch(()=>[]),
        ]);
        if (!alive) return;
        const nCoolers=normalizeQcsCoolers(rawCoolers), nPH=normalizeSimple(rawPH), nClean=normalizeSimple(rawClean);
        setInspection(normalizeInspection(rawInsp));
        setQcsCoolers(nCoolers);
        setQcsDailyAll([...nCoolers.map(x=>({date:x.date,_src:"coolers"})),...nPH.map(x=>({date:x.date,_src:"ph"})),...nClean.map(x=>({date:x.date,_src:"clean"}))]);
        setShipments(normalizeShipments(rawShip));
        setLoadingReports(normalizeLoading(rawLoad));
        setReturnsReports(normalizeReturns(rawRet));
      } catch(e) { console.error(e); if(alive) setFetchErr("تعذر الجلب من السيرفر — تحقق من الاتصال."); }
      finally { if(alive) setFetching(false); }
    })();
    return ()=>{alive=false;};
  }, []);

  const inRange = d => (!dateFrom||d>=dateFrom)&&(!dateTo||d<=dateTo);
  const fInsp    = useMemo(()=>inspection.filter(r=>inRange(r.date||"")),    [inspection,dateFrom,dateTo]);
  const fCoolers = useMemo(()=>qcsCoolers.filter(r=>inRange(r.date||"")),     [qcsCoolers,dateFrom,dateTo]);
  const fDaily   = useMemo(()=>qcsDailyAll.filter(r=>inRange(r.date||"")),    [qcsDailyAll,dateFrom,dateTo]);
  const fShip    = useMemo(()=>shipments.filter(r=>inRange(r.date||"")),       [shipments,dateFrom,dateTo]);
  const fLoad    = useMemo(()=>loadingReports.filter(r=>inRange(r.date||"")),  [loadingReports,dateFrom,dateTo]);
  const fReturns = useMemo(()=>returnsReports.filter(r=>inRange(r.reportDate||"")), [returnsReports,dateFrom,dateTo]);

  const inspCount = fInsp.length;
  const inspAvg   = inspCount ? (fInsp.reduce((a,r)=>a+r.percentage,0)/inspCount).toFixed(1) : "0.0";
  const qcsDailyCount = fDaily.length;
  const coolerAvg = useMemo(()=>{ const temps=[]; fCoolers.forEach(rep=>(rep.coolers||[]).forEach(c=>Object.values(c?.temps||{}).forEach(v=>{const n=Number(v);if(!isNaN(n)&&v!=="")temps.push(n);}))); return temps.length?(temps.reduce((a,b)=>a+b,0)/temps.length).toFixed(1):"0.0"; },[fCoolers]);
  const shipCount    = fShip.length;
  const shipMardi    = fShip.filter(r=>r.status.trim()==="مرضي").length;
  const shipWasatArr = fShip.filter(r=>r.status.trim()==="وسط");
  const shipTahtArr  = fShip.filter(r=>r.status.trim()==="تحت الوسط");
  const shipTypes    = useMemo(()=>fShip.reduce((acc,r)=>{const t=r.shipmentType||"غير محدد";acc[t]=(acc[t]||0)+1;return acc;},{}), [fShip]);
  const loadCount    = fLoad.length;
  const loadDurs     = fLoad.map(r=>{const s=toMinutes(r.timeStart),e=toMinutes(r.timeEnd);return s!=null&&e!=null&&e>=s?e-s:null;}).filter(v=>v!=null);
  const loadAvgMin   = loadDurs.length?Math.round(loadDurs.reduce((a,b)=>a+b,0)/loadDurs.length):0;
  const loadTemps    = fLoad.map(r=>Number(r.tempCheck)).filter(v=>!isNaN(v));
  const loadAvgTemp  = loadTemps.length?(loadTemps.reduce((a,b)=>a+b,0)/loadTemps.length).toFixed(1):"0.0";
  const VI_KEYS = ["sealIntact","containerClean","pestDetection","tempReader","plasticCurtain","badSmell","ppeA","ppeB","ppeC"];
  const {viYes,viTotal} = useMemo(()=>{ let viYes=0,viTotal=0; fLoad.forEach(r=>VI_KEYS.forEach(k=>{if(r.visual?.[k]){viTotal++;if(r.visual[k].value==="yes")viYes++;}})); return {viYes,viTotal}; },[fLoad]);
  const viCompliance = viTotal?Math.round((viYes/viTotal)*100):0;
  const retCount = fReturns.length;
  const retItems = fReturns.reduce((a,r)=>a+(r.items?.length||0),0);
  const retQty   = fReturns.reduce((a,r)=>a+(r.items?.reduce((s,it)=>s+Number(it.quantity||0),0)||0),0);
  const byBranch = useMemo(()=>{ const acc={}; fReturns.forEach(rep=>(rep.items||[]).forEach(it=>{const b=it.butchery==="فرع آخر..."?it.customButchery:it.butchery;if(b)acc[b]=(acc[b]||0)+1;})); return Object.entries(acc).sort((a,b)=>b[1]-a[1]).slice(0,3); },[fReturns]);
  const byAction = useMemo(()=>{ const acc={}; fReturns.forEach(rep=>(rep.items||[]).forEach(it=>{const a=it.action==="إجراء آخر..."?it.customAction:it.action;if(a)acc[a]=(acc[a]||0)+1;})); return Object.entries(acc).sort((a,b)=>b[1]-a[1]).slice(0,3); },[fReturns]);
  const alerts = useMemo(()=>{ const out=[]; if(Number(inspAvg)<50) out.push("⚠️ متوسط نسبة التفتيش منخفض (أقل من 50%)"); if(Number(coolerAvg)>8) out.push("⚠️ متوسط حرارة البرادات مرتفع (أعلى من 8°C)"); if(shipTahtArr.length>shipMardi) out.push("⚠️ عدد الشحنات تحت الوسط أعلى من المرضية"); return out; },[inspAvg,coolerAvg,shipTahtArr,shipMardi]);

  function handleExport() {
    const obj={KPIs:{inspCount,inspAvg,qcsDailyCount,coolerAvg,shipCount,shipMardi,shipWasat:shipWasatArr.length,shipTaht:shipTahtArr.length,shipTypes,loadCount,loadAvgMin,loadAvgTemp,viCompliance,retCount,retItems,retQty,byBranch,byAction},dateFrom,dateTo,exportedAt:new Date().toISOString()};
    const a=document.createElement("a"); a.href=URL.createObjectURL(new Blob([JSON.stringify(obj,null,2)],{type:"application/json"})); a.download=`kpi_${new Date().toISOString().replace(/[:.]/g,"-")}.json`; a.click(); URL.revokeObjectURL(a.href);
  }
  function handleImport(e) {
    setImportError(""); const file=e.target.files?.[0]; if(!file) return;
    const reader=new FileReader();
    reader.onload=ev=>{ try { const data=JSON.parse(ev.target.result); if(!data?.KPIs) throw new Error("البنية غير صحيحة — مطلوب مفتاح KPIs"); alert(`✅ تم قراءة الملف — ${Object.keys(data.KPIs).length} مؤشر`); } catch(err) { setImportError(`❌ فشل الاستيراد: ${err.message}`); } };
    reader.readAsText(file); e.target.value="";
  }

  return (
    <>
      <style>{CSS}</style>
      <div className="kpi-root">

        <header className="kpi-header">
          <div>
            <div className="kpi-h-title">📈 لوحة مؤشرات الأداء</div>
            <div className="kpi-h-sub">{dateStr} · جميع البيانات من السيرفر مباشرة</div>
          </div>
          {fetching && <div style={{fontSize:12,fontWeight:700,color:"#6366f1",display:"flex",alignItems:"center",gap:7}}>⏳ جاري الجلب…</div>}
          {fetchErr  && <div style={{fontSize:12,fontWeight:700,color:"#dc2626"}}>⚠ {fetchErr}</div>}
        </header>

        {alerts.length>0 && <div className="kpi-alert">{alerts.map((a,i)=><div key={i}>{a}</div>)}</div>}

        <div className="kpi-filters">
          <span className="kpi-filter-label">فلترة حسب التاريخ</span>
          <span className="kpi-filter-sep">من</span>
          <input type="date" className="kpi-date-input" value={dateFrom} onChange={e=>setDateFrom(e.target.value)}/>
          <span className="kpi-filter-sep">إلى</span>
          <input type="date" className="kpi-date-input" value={dateTo}   onChange={e=>setDateTo(e.target.value)}/>
          {(dateFrom||dateTo)&&<button className="kpi-btn kpi-btn-reset" onClick={()=>{setDateFrom("");setDateTo("");}}>🧹 مسح</button>}
          <div style={{marginRight:"auto",display:"flex",gap:8,flexWrap:"wrap"}}>
            <button className="kpi-btn kpi-btn-export" onClick={handleExport}>⬇️ تصدير JSON</button>
            <button className="kpi-btn kpi-btn-import" onClick={()=>fileInputRef.current?.click()}>⬆️ استيراد JSON</button>
            <input ref={fileInputRef} type="file" accept="application/json" onChange={handleImport} style={{display:"none"}}/>
          </div>
        </div>
        {importError&&<div className="kpi-modal-err">{importError}</div>}

        <div className="kpi-section">تفتيش عام</div>
        <div className="kpi-grid">
          <KPICard icon="📑" label="عدد تقارير التفتيش" value={inspCount} colorType="good"/>
          <KPICard icon="📊" label="متوسط نسبة التفتيش" value={inspAvg}   colorType="percentage" suffix="%"/>
        </div>

        <div className="kpi-section">QCS اليومي</div>
        <div className="kpi-grid">
          <KPICard icon="🗓️" label="تقارير QCS اليومية"        value={qcsDailyCount} colorType="good"/>
          <KPICard icon="❄️" label="متوسط حرارة البرادات (QCS)" value={coolerAvg}     colorType="temp" suffix="°C"/>
        </div>

        <div className="kpi-section">شحنات QCS</div>
        <div className="kpi-grid">
          <KPICard icon="📦" label="إجمالي الشحنات"     value={shipCount}          colorType="good"/>
          <KPICard icon="✅" label="الشحنات المرضية"    value={shipMardi}          colorType="good"/>
          <KPICard icon="⚠️" label="الشحنات وسط"       value={shipWasatArr.length} colorType="warn" onClick={()=>setWasatOpen(true)}/>
          <KPICard icon="❌" label="الشحنات تحت الوسط" value={shipTahtArr.length}  colorType="bad"  onClick={()=>setTahtWasatOpen(true)}/>
        </div>
        <div style={{marginTop:12}}>
          <div className="kpi-wide">
            <div style={{fontSize:11,fontWeight:700,color:"#94a3b8",textTransform:"uppercase",letterSpacing:".1em",marginBottom:10}}>🏷️ الشحنات حسب النوع</div>
            <BarChart data={shipTypes}/>
          </div>
        </div>

        <div className="kpi-section">تحميل السيارات</div>
        <div className="kpi-grid">
          <KPICard icon="🚚" label="عدد تقارير التحميل"        value={loadCount}    colorType="good"/>
          <KPICard icon="⏱️" label="متوسط زمن التحميل (دقيقة)" value={loadAvgMin}   colorType="warn" suffix=" د"/>
          <KPICard icon="🌡️" label="متوسط حرارة التحميل"       value={loadAvgTemp}  colorType="temp" suffix="°C"/>
          <KPICard icon="👁️" label="توافق الفحص البصري"        value={viCompliance} colorType="percentage" suffix="%"/>
        </div>

        <div className="kpi-section">المرتجعات</div>
        <div className="kpi-grid">
          <KPICard icon="🛒" label="عدد تقارير المرتجعات" value={retCount} colorType="good"/>
          <KPICard icon="📋" label="إجمالي العناصر"        value={retItems} colorType="warn"/>
          <KPICard icon="🔢" label="إجمالي الكمية"         value={retQty}   colorType="warn"/>
          <div className="kpi-wide" style={{cursor:"pointer"}} onClick={()=>setReturnsDetailsOpen(true)}>
            <div style={{fontSize:11,fontWeight:700,color:"#94a3b8",textTransform:"uppercase",letterSpacing:".1em",marginBottom:10}}>🔍 أعلى الفروع والإجراءات</div>
            {byBranch.length>0&&<div style={{fontSize:12,color:"#6366f1",marginBottom:4}}>فرع: <b>{byBranch[0][0]}</b> ({byBranch[0][1]})</div>}
            {byAction.length>0&&<div style={{fontSize:12,color:"#dc2626"}}>إجراء: <b>{byAction[0][0]}</b> ({byAction[0][1]})</div>}
            <div style={{fontSize:10,color:"#94a3b8",marginTop:8,fontWeight:700}}>انقر لعرض كل التفاصيل ←</div>
          </div>
        </div>

        <div className="kpi-footer">جميع البيانات من السيرفر الخارجي · {dateStr}</div>
      </div>

      <Modal show={wasatOpen}          onClose={()=>setWasatOpen(false)}          title="تفاصيل الشحنات — وسط"><ShipmentsTable rows={shipWasatArr} statusColor="#d97706"/></Modal>
      <Modal show={tahtWasatOpen}      onClose={()=>setTahtWasatOpen(false)}      title="تفاصيل الشحنات — تحت الوسط"><ShipmentsTable rows={shipTahtArr} statusColor="#dc2626"/></Modal>
      <Modal show={returnsDetailsOpen} onClose={()=>setReturnsDetailsOpen(false)} title="تفاصيل تقارير المرتجعات">
        {!fReturns.length ? (
          <div style={{textAlign:"center",color:"#9ca3af",padding:28,fontSize:13}}>لا يوجد بيانات في الفترة المحددة.</div>
        ) : (
          <div style={{overflowX:"auto"}}>
            <table style={{width:"100%",borderCollapse:"collapse",minWidth:1000,fontSize:12}}>
              <thead><tr>{["#","التاريخ","المنتج","المنشأ","الفرع","الكمية","نوع الكمية","الانتهاء","ملاحظات","الإجراء"].map(h=><th key={h} style={TH}>{h}</th>)}</tr></thead>
              <tbody>{fReturns.flatMap((rep,ri)=>(rep.items||[]).map((row,ii)=>(
                <tr key={`${ri}-${ii}`} style={{background:(ri*100+ii)%2?"#f8fafc":"#fff"}}>
                  <td style={TD}>{ri+1}-{ii+1}</td>
                  <td style={TD}>{rep.reportDate||"—"}</td>
                  <td style={TD}>{row.productName||"—"}</td>
                  <td style={TD}>{row.origin||"—"}</td>
                  <td style={TD}>{row.butchery==="فرع آخر..."?row.customButchery:row.butchery}</td>
                  <td style={TD}>{row.quantity||"—"}</td>
                  <td style={TD}>{row.qtyType==="أخرى"?row.customQtyType:row.qtyType||"—"}</td>
                  <td style={TD}>{row.expiry||"—"}</td>
                  <td style={TD}>{row.remarks||"—"}</td>
                  <td style={TD}>{row.action==="إجراء آخر..."?row.customAction:row.action||"—"}</td>
                </tr>
              )))}</tbody>
            </table>
          </div>
        )}
      </Modal>
    </>
  );
}