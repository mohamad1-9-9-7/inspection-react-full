import React, { useState } from "react";

const API_BASE = process.env.REACT_APP_API_URL || "https://inspection-server-4nvj.onrender.com";
const today = () => new Date().toISOString().slice(0,10);

function Row({ idx, row, onChange, onRemove, canRemove }) {
  const set = (k,v)=> onChange(idx, { ...row, [k]: v });
  return (
    <div className="row">
      <input className="in" placeholder="Area/Room" value={row.area||""} onChange={e=>set("area", e.target.value)} />
      <input className="in" placeholder="Task (e.g., Floors, Tables)" value={row.task||""} onChange={e=>set("task", e.target.value)} />
      <input className="in" type="time" value={row.start||""} onChange={e=>set("start", e.target.value)} />
      <input className="in" type="time" value={row.end||""} onChange={e=>set("end", e.target.value)} />
      <input className="in" placeholder="Chemical" value={row.chemical||""} onChange={e=>set("chemical", e.target.value)} />
      <input className="in" placeholder="ppm/%" value={row.conc||""} onChange={e=>set("conc", e.target.value)} />
      <select className="in" value={row.status||"Done"} onChange={e=>set("status", e.target.value)}>
        <option>Done</option><option>Partial</option><option>Pending</option>
      </select>
      <input className="in" placeholder="Verified By" value={row.verifiedBy||""} onChange={e=>set("verifiedBy", e.target.value)} />
      <button className="btn danger" disabled={!canRemove} onClick={()=>onRemove(idx)}>−</button>
    </div>
  );
}

export default function CleaningChecklistPRDInput() {
  const [reportDate, setReportDate] = useState(today());
  const [shift, setShift] = useState("Morning");
  const [entries, setEntries] = useState([ { area:"", task:"", start:"", end:"", chemical:"", conc:"", status:"Done", verifiedBy:"" } ]);
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  const addRow = ()=> setEntries([...entries, { area:"", task:"", start:"", end:"", chemical:"", conc:"", status:"Done", verifiedBy:"" }]);
  const rmRow = (i)=> setEntries(entries.filter((_,ix)=>ix!==i));
  const chRow = (i, v)=> setEntries(entries.map((r,ix)=> ix===i ? v : r));

  async function save() {
    try {
      setSaving(true);
      const payload = {
        reporter: "anonymous",
        type: "prod_cleaning_checklist",
        payload: { reportDate, shift, entries, notes, _clientSavedAt: Date.now() },
      };
      const attempts = [
        { url: `${API_BASE}/api/reports`, method: "PUT", body: JSON.stringify(payload) },
        { url: `${API_BASE}/api/reports/prod_cleaning_checklist?reportDate=${encodeURIComponent(reportDate)}`, method: "PUT", body: JSON.stringify({ shift, entries, notes, _clientSavedAt: payload.payload._clientSavedAt }) }
      ];
      let ok=false, lastErr=null;
      for (const a of attempts) {
        try {
          const res = await fetch(a.url, { method:a.method, headers:{ "Content-Type":"application/json" }, body:a.body });
          if (res.ok){ ok=true; break; }
          lastErr = new Error(`HTTP ${res.status}`);
        } catch(e){ lastErr=e; }
      }
      if (!ok) throw lastErr || new Error("Save failed");
      alert("Saved ✓ Cleaning Checklist (PRD)");
    } catch(e){ alert("Error saving: " + e.message); }
    finally{ setSaving(false); }
  }

  return (
    <div className="wrap">
      <style>{`
        .wrap{ padding:16px; font-family:Inter, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif; }
        .card{ background:#fff; border:1px solid #e5e7eb; border-radius:16px; padding:14px; max-width:1200px; margin:0 auto; box-shadow:0 4px 18px rgba(0,0,0,.06); }
        .h{ font-weight:900; font-size:18px; margin:0 0 8px 0; }
        .grid2{ display:grid; grid-template-columns: 180px 180px 1fr; gap:8px; margin-bottom:8px; }
        .row{ display:grid; grid-template-columns: 1fr 1fr 120px 120px 1fr 100px 120px 1fr 44px; gap:8px; margin-top:8px; }
        .head{ font-size:12px; color:#64748b; font-weight:800; }
        .in{ padding:9px 10px; border:1px solid #e5e7eb; border-radius:10px; font-weight:700; }
        .btn{ padding:10px 14px; border-radius:10px; border:1px solid #e5e7eb; background:#fff; font-weight:900; cursor:pointer; }
        .btn.primary{ background:#2563eb; color:#fff; border-color:transparent; }
        .btn.danger{ background:#fee2e2; color:#991b1b; border-color:#fecaca; }
        .actions{ display:flex; gap:8px; margin-top:12px; }
        .muted{ font-size:12px; color:#64748b; }
      `}</style>

      <div className="card">
        <div className="h">CLEANING CHECKLIST (PRD) — Input</div>

        <div className="grid2">
          <input className="in" type="date" value={reportDate} onChange={e=>setReportDate(e.target.value)} />
          <select className="in" value={shift} onChange={e=>setShift(e.target.value)}>
            <option>Morning</option><option>Evening</option><option>Night</option>
          </select>
          <input className="in" placeholder="Notes / Comments" value={notes} onChange={e=>setNotes(e.target.value)} />
        </div>

        <div className="row head" style={{marginTop:0}}>
          <div>Area/Room</div><div>Task</div><div>Start</div><div>End</div>
          <div>Chemical</div><div>ppm/%</div><div>Status</div><div>Verified By</div><div></div>
        </div>

        {entries.map((row, idx)=>(
          <Row key={idx} idx={idx} row={row} onChange={chRow} onRemove={rmRow} canRemove={entries.length>1}/>
        ))}

        <div className="actions">
          <button className="btn" onClick={addRow}>+ Add Row</button>
          <div style={{flex:1}} />
          <button className="btn primary" disabled={saving} onClick={save}>{saving ? "Saving..." : "Save"}</button>
        </div>
        <div className="muted">Type: prod_cleaning_checklist</div>
      </div>
    </div>
  );
}
