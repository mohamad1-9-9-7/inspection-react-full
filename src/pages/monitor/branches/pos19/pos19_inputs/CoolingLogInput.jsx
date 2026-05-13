// src/pages/monitor/branches/pos19/pos19_inputs/CoolingLogInput.jsx
import React, { useEffect, useRef, useState } from "react";
import ReportHeader from "../_shared/ReportHeader";

const API_BASE = String(
  (typeof window !== "undefined" && window.__QCS_API__) ||
  (typeof process !== "undefined" &&
    (process.env.REACT_APP_API_URL ||
     process.env.VITE_API_URL ||
     process.env.RENDER_EXTERNAL_URL)) ||
  "https://inspection-server-4nvj.onrender.com"
).replace(/\/$/, "");

const TYPE     = "pos19_cooling_log";
const BRANCH   = "POS 19";
const FORM_REF = "FS-HACCP/POS19/CL/01";

const today = () => {
  try { return new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Dubai" }); }
  catch { const d=new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`; }
};

const EMPTY_ROW = () => ({
  foodItem: "", batchNo: "",
  cookedTime: "", cookedTemp: "",
  check2hTime: "", check2hTemp: "",
  check6hTime: "", check6hTemp: "",
  destination: "", correctiveAction: "",
});

const HELP = {
  foodItem:        "Name of the cooked food item being cooled.",
  batchNo:         "Batch / Lot number for traceability.",
  cookedTime:      "Time when cooking was completed (HH:MM, 24h).",
  cookedTemp:      "Internal temperature of the food right after cooking (target ≥ 60°C).",
  check2hTime:     "Time at the 2-hour check (should be within 2h from cooking finish).",
  check2hTemp:     "Temperature at the 2-hour check. CCP limit: must be ≤ 21°C.",
  check6hTime:     "Time at the 6-hour check (should be within 4h after the 2h check).",
  check6hTemp:     "Temperature at the 6-hour check. CCP limit: must be ≤ 5°C.",
  destination:     "Where the food was placed after cooling (e.g., Chiller 1, Freezer).",
  correctiveAction:"Action taken if cooling limits were not met (e.g., discard, reheat & reuse).",
};

export default function CoolingLogInput() {
  const [reportDate, setReportDate] = useState(today());
  const [entries, setEntries]       = useState([EMPTY_ROW(), EMPTY_ROW(), EMPTY_ROW()]);
  const [checkedBy, setCheckedBy]   = useState("");
  const [verifiedBy, setVerifiedBy] = useState("");
  const [section, setSection]       = useState("");
  const [saving, setSaving]                 = useState(false);
  const [existingReport, setExistingReport] = useState(null);
  const [loadingExisting, setLoadingExisting] = useState(false);
  const [loadMsg, setLoadMsg] = useState("");
  const reqIdRef = useRef(0);

  const rowHasData = (r) => Object.values(r).some(v => String(v ?? "").trim() !== "");
  const chRow  = (i, key, val) => setEntries(p => { const n=[...p]; n[i]={...n[i], [key]:val}; return n; });
  const addRow = () => setEntries(p => [...p, EMPTY_ROW()]);
  const rmRow  = (i) => setEntries(p => p.length === 1 ? p : p.filter((_, idx) => idx !== i));
  const resetToBlank = () => { setEntries([EMPTY_ROW(), EMPTY_ROW(), EMPTY_ROW()]); setCheckedBy(""); setVerifiedBy(""); setSection(""); setExistingReport(null); };

  useEffect(() => {
    if (!reportDate) return;
    const myReq = ++reqIdRef.current;
    (async () => {
      setLoadingExisting(true); setLoadMsg("");
      try {
        const res = await fetch(`${API_BASE}/api/reports?type=${TYPE}`, { cache: "no-store" });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        const arr = Array.isArray(data) ? data : data?.data ?? [];
        const matches = arr.filter(r => r?.payload?.branch === BRANCH && r?.payload?.reportDate === reportDate);
        if (myReq !== reqIdRef.current) return;
        if (matches.length) {
          matches.sort((a,b) => (b?.payload?.savedAt || 0) - (a?.payload?.savedAt || 0));
          const latest = matches[0];
          const p = latest?.payload || {};
          setEntries(p.entries?.length ? p.entries.map(r => ({...EMPTY_ROW(), ...r})) : [EMPTY_ROW(), EMPTY_ROW(), EMPTY_ROW()]);
          setCheckedBy(p.checkedBy || "");
          setVerifiedBy(p.verifiedBy || "");
          setSection(p.section || "");
          setExistingReport({ id: latest?._id || latest?.id || null, savedAt: p?.savedAt || 0 });
          setLoadMsg("📝 Loaded existing record — edit mode");
        } else {
          resetToBlank();
          setLoadMsg("✏️ New record");
          setTimeout(() => setLoadMsg(m => m === "✏️ New record" ? "" : m), 2500);
        }
      } catch (e) {
        if (myReq === reqIdRef.current) { setLoadMsg("⚠️ Failed to load"); setTimeout(() => setLoadMsg(""), 3500); }
      } finally {
        if (myReq === reqIdRef.current) setLoadingExisting(false);
      }
    })();
  }, [reportDate]);

  async function save() {
    const cleanEntries = entries.filter(rowHasData);
    if (!cleanEntries.length) { alert("Please fill at least one row before saving."); return; }
    setSaving(true);
    try {
      const payload = { branch: BRANCH, formRef: FORM_REF, reportDate, section, entries: cleanEntries, checkedBy, verifiedBy, savedAt: Date.now() };
      if (existingReport?.id) { try { await fetch(`${API_BASE}/api/reports/${encodeURIComponent(existingReport.id)}`, { method: "DELETE" }); } catch {} }
      const res = await fetch(`${API_BASE}/api/reports`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ reporter: "pos19", type: TYPE, payload }) });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const saved = await res.json().catch(() => null);
      setExistingReport({ id: saved?._id || saved?.id || existingReport?.id || null, savedAt: payload.savedAt });
      setLoadMsg(existingReport?.id ? "✅ Updated" : "✅ Saved");
      setTimeout(() => setLoadMsg(""), 2500);
    } catch (e) {
      alert("❌ Save failed: " + (e?.message || String(e)));
    } finally { setSaving(false); }
  }

  // Warning checks against CCP limits
  const isCookedLow  = (v) => v && parseFloat(v) < 60;
  const is2hHigh     = (v) => v && parseFloat(v) > 21;
  const is6hHigh     = (v) => v && parseFloat(v) > 5;

  return (
    <div style={S.wrap}>
      <ReportHeader
        title="Cooling Temperature Log"
        titleAr="سجل تبريد الطعام المطهي"
        subtitle="POS 19 — Cloud Kitchen"
        fields={[
          { label: "Form Ref",   value: FORM_REF },
          { label: "Branch",     value: BRANCH },
          { label: "Report Date", type: "date", value: reportDate, onChange: setReportDate },
          { label: "Section",    value: section, onChange: setSection, placeholder: "e.g. Hot kitchen" },
        ]}
      />

      <div style={S.banner}>
        <div style={S.bannerIcon}>⚠️</div>
        <div>
          <strong>Critical Limits (CCP):</strong> Cooked food must drop from <b>60°C → 21°C within 2 hours</b>,
          then from <b>21°C → 5°C within the next 4 hours</b>. Total cooling time <b>≤ 6 hours</b>.
          Out-of-limit batches must be discarded or corrective action recorded.
        </div>
      </div>

      <div style={S.actions}>
        <button onClick={addRow} style={S.btnGhost} type="button">+ Add Row</button>
        {existingReport?.id && (
          <button onClick={() => { if (window.confirm("Reset to a new blank record?")) resetToBlank(); }} style={S.btnGhost} type="button">🆕 New</button>
        )}
        <div style={{flex:1}} />
        {loadingExisting && <span style={S.statusLoad}>Loading…</span>}
        {!loadingExisting && loadMsg && <span style={existingReport?.id ? S.statusEdit : S.statusNew}>{loadMsg}</span>}
        <button onClick={save} disabled={saving || loadingExisting} style={S.btnPrimary} type="button">
          {saving ? "Saving…" : existingReport?.id ? "Update" : "Save"}
        </button>
      </div>

      <div style={S.tableWrap}>
        <table style={S.table}>
          <colgroup>
            <col style={{width:48}}/>
            <col style={{width:170}}/><col style={{width:110}}/>
            <col style={{width:100}}/><col style={{width:100}}/>
            <col style={{width:100}}/><col style={{width:100}}/>
            <col style={{width:100}}/><col style={{width:100}}/>
            <col style={{width:130}}/><col style={{width:170}}/>
            <col style={{width:50}}/>
          </colgroup>
          <thead>
            <tr>
              <th rowSpan={2} style={S.th}>#</th>
              <th rowSpan={2} style={S.th} title={HELP.foodItem}>Food Item ⓘ</th>
              <th rowSpan={2} style={S.th} title={HELP.batchNo}>Batch No ⓘ</th>
              <th colSpan={2} style={{...S.th, background:"#fee2e2"}}>Cooked (≥60°C)</th>
              <th colSpan={2} style={{...S.th, background:"#fef3c7"}}>2h Check (≤21°C)</th>
              <th colSpan={2} style={{...S.th, background:"#dcfce7"}}>6h Check (≤5°C)</th>
              <th rowSpan={2} style={S.th} title={HELP.destination}>Destination ⓘ</th>
              <th rowSpan={2} style={S.th} title={HELP.correctiveAction}>Corrective Action ⓘ</th>
              <th rowSpan={2} style={S.th}>—</th>
            </tr>
            <tr>
              <th style={S.th} title={HELP.cookedTime}>Time ⓘ</th>
              <th style={S.th} title={HELP.cookedTemp}>°C ⓘ</th>
              <th style={S.th} title={HELP.check2hTime}>Time ⓘ</th>
              <th style={S.th} title={HELP.check2hTemp}>°C ⓘ</th>
              <th style={S.th} title={HELP.check6hTime}>Time ⓘ</th>
              <th style={S.th} title={HELP.check6hTemp}>°C ⓘ</th>
            </tr>
          </thead>
          <tbody>
            {entries.map((r, i) => (
              <tr key={i}>
                <td style={S.tdIdx}>{i+1}</td>
                <td style={S.td}><input value={r.foodItem} onChange={e=>chRow(i,"foodItem",e.target.value)} style={S.input} title={HELP.foodItem} placeholder="e.g., Chicken Curry"/></td>
                <td style={S.td}><input value={r.batchNo}  onChange={e=>chRow(i,"batchNo",e.target.value)}  style={S.input} title={HELP.batchNo}/></td>
                <td style={S.td}><input type="time" value={r.cookedTime} onChange={e=>chRow(i,"cookedTime",e.target.value)} style={S.input} title={HELP.cookedTime}/></td>
                <td style={S.td}><input type="number" step="0.1" value={r.cookedTemp} onChange={e=>chRow(i,"cookedTemp",e.target.value)} style={{...S.input, ...(isCookedLow(r.cookedTemp)?S.warn:{})}} title={HELP.cookedTemp} placeholder="°C"/></td>
                <td style={S.td}><input type="time" value={r.check2hTime} onChange={e=>chRow(i,"check2hTime",e.target.value)} style={S.input} title={HELP.check2hTime}/></td>
                <td style={S.td}><input type="number" step="0.1" value={r.check2hTemp} onChange={e=>chRow(i,"check2hTemp",e.target.value)} style={{...S.input, ...(is2hHigh(r.check2hTemp)?S.warn:{})}} title={HELP.check2hTemp} placeholder="°C"/></td>
                <td style={S.td}><input type="time" value={r.check6hTime} onChange={e=>chRow(i,"check6hTime",e.target.value)} style={S.input} title={HELP.check6hTime}/></td>
                <td style={S.td}><input type="number" step="0.1" value={r.check6hTemp} onChange={e=>chRow(i,"check6hTemp",e.target.value)} style={{...S.input, ...(is6hHigh(r.check6hTemp)?S.warn:{})}} title={HELP.check6hTemp} placeholder="°C"/></td>
                <td style={S.td}><input value={r.destination} onChange={e=>chRow(i,"destination",e.target.value)} style={S.input} title={HELP.destination} placeholder="Chiller / Freezer"/></td>
                <td style={S.td}><input value={r.correctiveAction} onChange={e=>chRow(i,"correctiveAction",e.target.value)} style={S.input} title={HELP.correctiveAction} placeholder="If any"/></td>
                <td style={S.td}><button onClick={()=>rmRow(i)} style={S.btnDel} disabled={entries.length===1} type="button">×</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div style={S.sig}>
        <div style={S.sigBox}><label style={S.sigLabel}>Checked by</label><input value={checkedBy} onChange={e=>setCheckedBy(e.target.value)} style={S.sigInput} placeholder="Name / Signature"/></div>
        <div style={S.sigBox}><label style={S.sigLabel}>Verified by</label><input value={verifiedBy} onChange={e=>setVerifiedBy(e.target.value)} style={S.sigInput} placeholder="Name / Signature"/></div>
      </div>
    </div>
  );
}

const S = {
  wrap: { background:"#fff", border:"1px solid #dbe3f4", borderRadius:12, padding:16, color:"#0b1f4d" },
  banner: { display:"flex", gap:10, alignItems:"flex-start", padding:"12px 14px", background:"#fffbeb", border:"1px solid #fde68a", borderLeft:"4px solid #f59e0b", borderRadius:8, color:"#78350f", fontSize:13, lineHeight:1.5, marginBottom:12 },
  bannerIcon: { fontSize:18, lineHeight:1 },
  actions: { display:"flex", alignItems:"center", gap:8, marginBottom:10, flexWrap:"wrap" },
  btnGhost:   { background:"#fff", color:"#334155", border:"1px solid #e2e8f0", borderRadius:8, padding:"8px 14px", fontWeight:700, cursor:"pointer" },
  btnPrimary: { background:"linear-gradient(135deg,#2563eb,#3b82f6)", color:"#fff", border:"none", borderRadius:8, padding:"9px 18px", fontWeight:700, cursor:"pointer", boxShadow:"0 3px 10px rgba(59,130,246,.3)" },
  btnDel: { background:"#fef2f2", color:"#dc2626", border:"1px solid #fecaca", borderRadius:6, width:32, height:32, fontSize:18, fontWeight:800, cursor:"pointer" },
  statusLoad: { padding:"6px 10px", background:"#f1f5f9", color:"#475569", borderRadius:8, fontSize:12, fontWeight:700 },
  statusEdit: { padding:"6px 10px", background:"#fef3c7", color:"#92400e", borderRadius:8, fontSize:12, fontWeight:700 },
  statusNew:  { padding:"6px 10px", background:"#e0f2fe", color:"#075985", borderRadius:8, fontSize:12, fontWeight:700 },
  tableWrap: { overflowX:"auto", border:"1px solid #e2e8f0", borderRadius:10 },
  table: { width:"max-content", minWidth:"100%", borderCollapse:"collapse", fontSize:12 },
  th: { border:"1px solid #1f3b70", padding:"6px 5px", textAlign:"center", fontWeight:700, background:"#f5f8ff", color:"#0b1f4d", whiteSpace:"nowrap" },
  td: { border:"1px solid #cbd5e1", padding:"3px 4px", textAlign:"center", verticalAlign:"middle" },
  tdIdx: { border:"1px solid #cbd5e1", padding:"3px 4px", textAlign:"center", verticalAlign:"middle", fontWeight:700, background:"#f8fafc", color:"#64748b" },
  input: { width:"100%", boxSizing:"border-box", border:"1px solid #e2e8f0", borderRadius:5, padding:"5px 6px", fontSize:12, outline:"none" },
  warn:  { background:"#fef2f2", borderColor:"#fecaca", color:"#dc2626", fontWeight:700 },
  sig: { display:"grid", gridTemplateColumns:"1fr 1fr", gap:12, marginTop:14 },
  sigBox: { background:"#f8fafc", border:"1px solid #e2e8f0", borderRadius:8, padding:"10px 12px" },
  sigLabel: { display:"block", fontSize:11, fontWeight:800, color:"#64748b", textTransform:"uppercase", letterSpacing:".06em", marginBottom:5 },
  sigInput: { width:"100%", boxSizing:"border-box", border:"1px solid #e2e8f0", borderRadius:6, padding:"7px 10px", fontSize:13, outline:"none" },
};
