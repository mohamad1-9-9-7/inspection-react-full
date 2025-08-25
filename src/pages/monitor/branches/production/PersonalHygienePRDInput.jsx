import React, { useState } from "react";

const API_BASE = process.env.REACT_APP_API_URL || "https://inspection-server-4nvj.onrender.com";
const today = () => new Date().toISOString().slice(0,10);

const STATUS = ["OK","NG","NA"];

function Row({ idx, row, onChange, onRemove, canRemove }) {
  const set = (k,v)=> onChange(idx, { ...row, [k]: v });
  const setCheck = (k,v)=> onChange(idx, { ...row, checks: { ...row.checks, [k]: v } });

  return (
    <div className="row">
      <input className="in" placeholder="Employee Name" value={row.employee||""} onChange={e=>set("employee", e.target.value)} />
      <input className="in" placeholder="ID / Code" value={row.code||""} onChange={e=>set("code", e.target.value)} />
      <select className="in" value={row.checks.uniform} onChange={e=>setCheck("uniform", e.target.value)}>{STATUS.map(s=><option key={s}>{s}</option>)}</select>
      <select className="in" value={row.checks.hairnet} onChange={e=>setCheck("hairnet", e.target.value)}>{STATUS.map(s=><option key={s}>{s}</option>)}</select>
      <select className="in" value={row.checks.gloves} onChange={e=>setCheck("gloves", e.target.value)}>{STATUS.map(s=><option key={s}>{s}</option>)}</select>
      <select className="in" value={row.checks.handwash} onChange={e=>setCheck("handwash", e.target.value)}>{STATUS.map(s=><option key={s}>{s}</option>)}</select>
      <select className="in" value={row.checks.nails} onChange={e=>setCheck("nails", e.target.value)}>{STATUS.map(s=><option key={s}>{s}</option>)}</select>
      <select className="in" value={row.checks.jewelry} onChange={e=>setCheck("jewelry", e.target.value)}>{STATUS.map(s=><option key={s}>{s}</option>)}</select>
      <button className="btn danger" disabled={!canRemove} onClick={()=>onRemove(idx)}>−</button>
    </div>
  );
}

export default function PersonalHygienePRDInput() {
  const [reportDate, setReportDate] = useState(today());
  const [shift, setShift] = useState("Morning");
  const [supervisor, setSupervisor] = useState("");
  const [entries, setEntries] = useState([
    { employee:"", code:"", checks:{ uniform:"OK", hairnet:"OK", gloves:"OK", handwash:"OK", nails:"OK", jewelry:"OK" } }
  ]);
  const [saving, setSaving] = useState(false);
  const addRow = ()=> setEntries([...entries, { employee:"", code:"", checks:{ uniform:"OK", hairnet:"OK", gloves:"OK", handwash:"OK", nails:"OK", jewelry:"OK" } }]);
  const rmRow = (i)=> setEntries(entries.filter((_,ix)=>ix!==i));
  const chRow = (i, v)=> setEntries(entries.map((r,ix)=> ix===i ? v : r));

  async function save() {
    try {
      setSaving(true);
      const payload = {
        reporter: "anonymous",
        type: "prod_personal_hygiene",
        payload: { reportDate, shift, supervisor, entries, _clientSavedAt: Date.now() },
      };
      const attempts = [
        { url: `${API_BASE}/api/reports`, method: "PUT", body: JSON.stringify(payload) },
        { url: `${API_BASE}/api/reports/prod_personal_hygiene?reportDate=${encodeURIComponent(reportDate)}`, method: "PUT", body: JSON.stringify({ shift, supervisor, entries, _clientSavedAt: payload.payload._clientSavedAt }) }
      ];
      let ok = false, lastErr = null;
      for (const a of attempts) {
        try {
          const res = await fetch(a.url, { method: a.method, headers:{ "Content-Type":"application/json" }, body: a.body });
          if (res.ok) { ok = true; break; }
          lastErr = new Error(`HTTP ${res.status}`);
        } catch(e){ lastErr = e; }
      }
      if (!ok) throw lastErr || new Error("Save failed");
      alert("Saved ✓ Personal Hygiene (PRD)");
    } catch(e){ alert("Error saving: " + e.message); }
    finally { setSaving(false); }
  }

  return (
    <div className="wrap">
      <style>{`
        .wrap{ padding:16px; font-family:Inter, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif; }
        .card{ background:#fff; border:1px solid #e5e7eb; border-radius:16px; padding:14px; max-width:1200px; margin:0 auto; box-shadow:0 4px 18px rgba(0,0,0,.06); }
        .h{ font-weight:900; font-size:18px; margin:0 0 8px 0; }
        .row{ display:grid; grid-template-columns: 1.2fr .7fr repeat(6, .7fr) 44px; gap:8px; margin-top:8px; }
        .head{ font-size:12px; color:#64748b; font-weight:800; }
        .in{ padding:9px 10px; border:1px solid #e5e7eb; border-radius:10px; font-weight:700; }
        .grid2{ display:grid; grid-template-columns: 180px 180px 1fr; gap:8px; margin-bottom:8px; }
        .btn{ padding:10px 14px; border-radius:10px; border:1px solid #e5e7eb; background:#fff; font-weight:900; cursor:pointer; }
        .btn.primary{ background:#2563eb; color:#fff; border-color:transparent; }
        .btn.danger{ background:#fee2e2; color:#991b1b; border-color:#fecaca; }
        .actions{ display:flex; gap:8px; margin-top:12px; }
        .muted{ font-size:12px; color:#64748b; }
      `}</style>

      <div className="card">
        <div className="h">Personal Hygiene (PRD) — Input</div>
        <div className="grid2">
          <input className="in" type="date" value={reportDate} onChange={e=>setReportDate(e.target.value)} />
          <select className="in" value={shift} onChange={e=>setShift(e.target.value)}>
            <option>Morning</option><option>Evening</option><option>Night</option>
          </select>
          <input className="in" placeholder="Supervisor" value={supervisor} onChange={e=>setSupervisor(e.target.value)} />
        </div>

        <div className="row head" style={{marginTop:0}}>
          <div>Employee</div><div>ID</div>
          <div>Uniform</div><div>Hairnet/Beard</div><div>Gloves</div>
          <div>Handwash</div><div>Nails</div><div>No Jewelry</div><div></div>
        </div>

        {entries.map((row, idx)=>(
          <Row key={idx} idx={idx} row={row} onChange={chRow} onRemove={rmRow} canRemove={entries.length>1}/>
        ))}

        <div className="actions">
          <button className="btn" onClick={addRow}>+ Add Employee</button>
          <div style={{flex:1}} />
          <button className="btn primary" disabled={saving} onClick={save}>{saving ? "Saving..." : "Save"}</button>
        </div>
        <div className="muted">Type: prod_personal_hygiene</div>
      </div>
    </div>
  );
}
