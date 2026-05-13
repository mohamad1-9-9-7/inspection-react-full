// src/pages/monitor/branches/pos19/pos19_inputs/CalibrationLogInput.jsx
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

const TYPE     = "pos19_calibration_log";
const BRANCH   = "POS 19";
const FORM_REF = "FS-HACCP/POS19/CAL/01";

const today = () => {
  try { return new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Dubai" }); }
  catch { const d=new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`; }
};

const EMPTY_ROW = () => ({
  thermometerId: "", thermometerType: "",
  testMethod: "Ice bath",
  referenceTemp: "0",
  reading: "",
  status: "",
  correctiveAction: "",
  calibratedBy: "",
  nextDueDate: "",
});

const TYPES        = ["Digital probe", "Infrared (IR)", "Dial / bimetal", "Data logger", "Other"];
const TEST_METHODS = ["Ice bath", "Boiling water", "Reference thermometer"];

const HELP = {
  thermometerId:   "Unique ID / serial number printed on the thermometer.",
  thermometerType: "Type of thermometer (digital probe, IR, dial, etc.).",
  testMethod:      "Method used: Ice bath (0°C), Boiling water (100°C at sea level), or reference thermometer.",
  referenceTemp:   "Expected reference temperature: 0°C for ice bath, ~100°C for boiling water.",
  reading:         "Actual temperature reading shown by the thermometer.",
  status:          "Pass if |reading − reference| ≤ 1°C, otherwise Fail.",
  correctiveAction:"What was done if the test failed (re-calibrate, remove from service, replace).",
  calibratedBy:    "Name of the person who performed the calibration check.",
  nextDueDate:     "Date for the next calibration check (typically weekly for probe thermometers).",
};

// Auto-compute pass/fail
function autoStatus(reading, reference) {
  const r = parseFloat(reading), ref = parseFloat(reference);
  if (isNaN(r) || isNaN(ref)) return "";
  return Math.abs(r - ref) <= 1 ? "Pass" : "Fail";
}

export default function CalibrationLogInput() {
  const [reportDate, setReportDate] = useState(today());
  const [entries, setEntries]       = useState([EMPTY_ROW(), EMPTY_ROW()]);
  const [checkedBy, setCheckedBy]   = useState("");
  const [verifiedBy, setVerifiedBy] = useState("");
  const [saving, setSaving]                 = useState(false);
  const [existingReport, setExistingReport] = useState(null);
  const [loadingExisting, setLoadingExisting] = useState(false);
  const [loadMsg, setLoadMsg] = useState("");
  const reqIdRef = useRef(0);

  const rowHasData = (r) => Object.values(r).some(v => String(v ?? "").trim() !== "" && v !== "Ice bath" && v !== "0");
  // include rows where the user actually entered an ID or reading
  const rowHasReal = (r) => String(r.thermometerId).trim() !== "" || String(r.reading).trim() !== "";

  const chRow = (i, key, val) => setEntries(p => {
    const n=[...p];
    n[i] = {...n[i], [key]: val};
    // Auto-update status if reading or reference change
    if (key === "reading" || key === "referenceTemp") {
      n[i].status = autoStatus(n[i].reading, n[i].referenceTemp);
    }
    if (key === "testMethod") {
      n[i].referenceTemp = val === "Boiling water" ? "100" : val === "Ice bath" ? "0" : n[i].referenceTemp;
      n[i].status = autoStatus(n[i].reading, n[i].referenceTemp);
    }
    return n;
  });
  const addRow = () => setEntries(p => [...p, EMPTY_ROW()]);
  const rmRow  = (i) => setEntries(p => p.length === 1 ? p : p.filter((_, idx) => idx !== i));
  const resetToBlank = () => { setEntries([EMPTY_ROW(), EMPTY_ROW()]); setCheckedBy(""); setVerifiedBy(""); setExistingReport(null); };

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
          setEntries(p.entries?.length ? p.entries.map(r => ({...EMPTY_ROW(), ...r})) : [EMPTY_ROW(), EMPTY_ROW()]);
          setCheckedBy(p.checkedBy || "");
          setVerifiedBy(p.verifiedBy || "");
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
    const cleanEntries = entries.filter(rowHasReal);
    if (!cleanEntries.length) { alert("Please fill at least one row before saving."); return; }
    setSaving(true);
    try {
      const payload = { branch: BRANCH, formRef: FORM_REF, reportDate, entries: cleanEntries, checkedBy, verifiedBy, savedAt: Date.now() };
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

  return (
    <div style={S.wrap}>
      <ReportHeader
        title="Thermometer Calibration Log"
        titleAr="سجل معايرة موازين الحرارة"
        subtitle="POS 19 — Cloud Kitchen"
        fields={[
          { label: "Form Ref",   value: FORM_REF },
          { label: "Branch",     value: BRANCH },
          { label: "Report Date", type: "date", value: reportDate, onChange: setReportDate },
        ]}
      />

      <div style={S.banner}>
        <div style={S.bannerIcon}>⚠️</div>
        <div>
          <strong>Acceptance Limit:</strong> Reading must be within <b>±1°C</b> of the reference value
          (Ice bath = 0°C, Boiling water = 100°C). Frequency: <b>weekly</b> for probe thermometers,
          <b> monthly</b> for IR / dial. Status auto-calculates from Reading vs. Reference.
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
            <col style={{width:130}}/><col style={{width:140}}/><col style={{width:150}}/>
            <col style={{width:90}}/><col style={{width:90}}/>
            <col style={{width:80}}/>
            <col style={{width:170}}/><col style={{width:130}}/><col style={{width:120}}/>
            <col style={{width:50}}/>
          </colgroup>
          <thead>
            <tr>
              <th style={S.th}>#</th>
              <th style={S.th} title={HELP.thermometerId}>Thermometer ID ⓘ</th>
              <th style={S.th} title={HELP.thermometerType}>Type ⓘ</th>
              <th style={S.th} title={HELP.testMethod}>Test Method ⓘ</th>
              <th style={S.th} title={HELP.referenceTemp}>Ref. °C ⓘ</th>
              <th style={S.th} title={HELP.reading}>Reading °C ⓘ</th>
              <th style={S.th} title={HELP.status}>Status ⓘ</th>
              <th style={S.th} title={HELP.correctiveAction}>Corrective Action ⓘ</th>
              <th style={S.th} title={HELP.calibratedBy}>Calibrated by ⓘ</th>
              <th style={S.th} title={HELP.nextDueDate}>Next Due ⓘ</th>
              <th style={S.th}>—</th>
            </tr>
          </thead>
          <tbody>
            {entries.map((r, i) => {
              const passing = r.status === "Pass";
              const failing = r.status === "Fail";
              return (
                <tr key={i}>
                  <td style={S.tdIdx}>{i+1}</td>
                  <td style={S.td}><input value={r.thermometerId} onChange={e=>chRow(i,"thermometerId",e.target.value)} style={S.input} title={HELP.thermometerId} placeholder="e.g., TH-001"/></td>
                  <td style={S.td}>
                    <select value={r.thermometerType} onChange={e=>chRow(i,"thermometerType",e.target.value)} style={S.input} title={HELP.thermometerType}>
                      <option value="">—</option>
                      {TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </td>
                  <td style={S.td}>
                    <select value={r.testMethod} onChange={e=>chRow(i,"testMethod",e.target.value)} style={S.input} title={HELP.testMethod}>
                      {TEST_METHODS.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </td>
                  <td style={S.td}><input type="number" step="0.1" value={r.referenceTemp} onChange={e=>chRow(i,"referenceTemp",e.target.value)} style={S.input} title={HELP.referenceTemp}/></td>
                  <td style={S.td}><input type="number" step="0.1" value={r.reading} onChange={e=>chRow(i,"reading",e.target.value)} style={{...S.input, ...(failing?S.warn:{})}} title={HELP.reading}/></td>
                  <td style={S.td}>
                    <span style={{
                      display:"inline-block", padding:"3px 10px", borderRadius:12,
                      fontWeight:800, fontSize:11,
                      background: passing ? "#dcfce7" : failing ? "#fee2e2" : "#f1f5f9",
                      color:      passing ? "#15803d" : failing ? "#b91c1c" : "#64748b",
                      border: passing ? "1px solid #86efac" : failing ? "1px solid #fca5a5" : "1px solid #e2e8f0",
                    }}>{r.status || "—"}</span>
                  </td>
                  <td style={S.td}><input value={r.correctiveAction} onChange={e=>chRow(i,"correctiveAction",e.target.value)} style={S.input} title={HELP.correctiveAction}/></td>
                  <td style={S.td}><input value={r.calibratedBy} onChange={e=>chRow(i,"calibratedBy",e.target.value)} style={S.input} title={HELP.calibratedBy}/></td>
                  <td style={S.td}><input type="date" value={r.nextDueDate} onChange={e=>chRow(i,"nextDueDate",e.target.value)} style={S.input} title={HELP.nextDueDate}/></td>
                  <td style={S.td}><button onClick={()=>rmRow(i)} style={S.btnDel} disabled={entries.length===1} type="button">×</button></td>
                </tr>
              );
            })}
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
