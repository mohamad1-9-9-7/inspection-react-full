// src/pages/car/pages/Cleaning.jsx
import React, { useMemo, useState } from "react";

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

async function sendToServer(path, { method = "GET", json } = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers: json ? { "Content-Type": "application/json" } : undefined,
    body: json ? JSON.stringify(json) : undefined,
    credentials: IS_SAME_ORIGIN ? "include" : "omit",
  });

  // إظهار رسالة الخطأ الحقيقية من السيرفر عند الفشل
  const raw = await res.text();
  let data;
  try { data = raw ? JSON.parse(raw) : null; } catch { data = { raw }; }

  if (!res.ok) {
    const msg = data?.error || data?.message || data?.raw || res.statusText;
    throw new Error(`HTTP ${res.status} – ${msg}`);
  }
  return data ?? {};
}

/* ================= Helpers ================= */
const pad2 = (n) => String(n).padStart(2, "0");
const todayYMD = () => {
  const d = new Date();
  return `${d.getFullYear()}-${pad2(d.getMonth()+1)}-${pad2(d.getDate())}`;
};

const STATUS = ["C", "N/C"];

/* القائمة الافتراضية لأرقام الشاحنات */
const DEFAULT_TRUCKS = [
  "25501","60314","98712","46361","61368","14298","49925",
  "80461","47013","82003","43593","69840","98714","69849"
];

const makeEmptyRow = () => ({
  truckNo: "",
  truckFloor: "C",
  airCurtain: "C",
  truckBody: "C",
  truckDoor: "C",
  railHook: "C",
  truckPallets: "C",
  truckCrates: "C",
  informedTo: "",
  remarks: "",
});

export default function Cleaning() {
  /* ====== Header (Editable except Issue Date) ====== */
  const [hdr, setHdr] = useState({
    documentTitle: "TRUCK DAILY CLEANING CHECKLIST",
    documentNo: "TELT/SAN/TDCL/1",
    issueDate: "2025-04-12",
    revisionNo: "1",
    area: "QA",
    issuedBy: "MOHAMAD ABDULLAH",
    controllingOfficer: "Online Quality Controller",
    approvedBy: "ALTAF KHAN",
  });

  /* ====== Body ====== */
  const [date, setDate] = useState(todayYMD());
  const [rows, setRows] = useState([makeEmptyRow()]);
  const [truckOptions, setTruckOptions] = useState(DEFAULT_TRUCKS);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");

  /* ====== Remarks block ====== */
  const [checkedBy, setCheckedBy] = useState("");
  const [verifiedBy, setVerifiedBy] = useState("");
  const [chemicalUsed, setChemicalUsed] = useState("All-purpose cleaner (Multi clean)");
  const [cleaningProcedure, setCleaningProcedure] = useState(
    "Remove all left-over material inside, clean the floor with a broom or brush to remove debris, apply Multi clean detergent, scrub inside the chiller vehicle with clean brush, use water pressure pump to clean with water, after cleaning disinfect the inside truck."
  );
  const [frequencyRemark, setFrequencyRemark] = useState("Frequency: Daily");

  const validRows = useMemo(
    () => rows.filter(r => String(r.truckNo||"").trim().length>0),
    [rows]
  );

  const isDuplicateTruck = (no, exceptIndex = -1) =>
    rows.some((r, i) => i !== exceptIndex && String(r.truckNo || "") === String(no || ""));

  const setCell = (i, key, val) => {
    if (key === "truckNo") {
      const v = String(val || "").trim();
      if (v && isDuplicateTruck(v, i)) {
        setMsg(`Truck No. "${v}" is already used for this date. Only one row per truck per day.`);
        return;
      }
    }
    setRows(prev => {
      const next = [...prev];
      next[i] = { ...next[i], [key]: val };
      return next;
    });
  };

  const addRow = () => setRows(r => [...r, makeEmptyRow()]);
  const removeRow = (i) => setRows(r => r.filter((_,idx)=>idx!==i));
  const clearAll = () => {
    setRows([makeEmptyRow()]);
    setCheckedBy(""); setVerifiedBy("");
    setMsg("");
  };

  function ensureTruckInList(v) {
    const s = String(v || "").trim();
    return truckOptions.includes(s);
  }
  function addTruckNumber(newNo) {
    const s = String(newNo || "").trim();
    if (!/^\d{3,}$/.test(s)) return false;
    if (!truckOptions.includes(s)) {
      setTruckOptions(prev => [...prev, s]);
    }
    return true;
  }

  async function onSave() {
    try {
      setMsg("");
      if (!date) { setMsg("Select date."); return; }
      if (validRows.length === 0) { setMsg("Add at least one truck."); return; }

      for (const r of validRows) {
        if (!ensureTruckInList(r.truckNo)) {
          setMsg(`Truck No. "${r.truckNo}" is not in the list. Please select from dropdown or add it.`);
          return;
        }
      }
      const seen = new Set();
      for (const r of validRows) {
        const no = String(r.truckNo || "").trim();
        if (seen.has(no)) {
          setMsg(`Truck No. "${no}" is duplicated for this date. Only one row per truck per day.`);
          return;
        }
        seen.add(no);
      }

      // ملاحظة مهمة: لا نضع "type" داخل الـ payload
      const payload = {
        date,
        meta: {
          documentTitle: hdr.documentTitle,
          documentNo: hdr.documentNo,
          revisionNo: hdr.revisionNo,
          area: hdr.area,
          issuedBy: hdr.issuedBy,
          controllingOfficer: hdr.controllingOfficer,
          approvedBy: hdr.approvedBy,
          issueDate: hdr.issueDate,
        },
        checkedBy,
        verifiedBy,
        chemicalUsed,
        cleaningProcedure,
        frequencyRemark,
        rows: validRows,
        createdAt: new Date().toISOString(),
      };

      setSaving(true);
      // الشكل الصحيح: { type, payload }
      const res = await sendToServer("/api/reports", {
        method: "POST",
        json: { type: "truck_daily_cleaning", payload }
      });

      try {
        const KEY = "truck_daily_cleaning_reports_v1";
        const list = JSON.parse(localStorage.getItem(KEY) || "[]");
        list.unshift({ ...(res||{}), localCopy: payload });
        localStorage.setItem(KEY, JSON.stringify(list));
      } catch {}

      setMsg("Saved successfully.");
      clearAll();
    } catch (e) {
      setMsg(String(e.message || e));
    } finally {
      setSaving(false);
    }
  }

  /* ===== styles ===== */
  const page = {
    padding:"16px",
    direction:"ltr",
    background:"#eef2f7",
    minHeight:"100vh"
  };

  // ✅ حدود سوداء واضحة + منع كسر الأعمدة
  const th = {
    border:"2px solid #000",
    padding:"12px",
    background:"#e7effc",
    fontWeight:800,
    overflow:"hidden",
    whiteSpace:"nowrap",
    textOverflow:"ellipsis",
  };
  const td = {
    border:"2px solid #000",
    padding:"10px 12px",
    background:"#ffffff",
    overflow:"hidden",
  };

  // حقول الخلايا: عرض كامل بدون ما يزيد عن الخلية
  const cellField = {
    width:"100%",
    maxWidth:"100%",
    display:"block",
    padding:"10px 12px",
    borderRadius:10,
    border:"1.5px solid #c9d3e6",
    background:"#fff",
    boxSizing:"border-box",
  };

  const headerWrap = {
    background:"#e9edf6",
    border:"1px solid #c9d3e6",
    borderRadius: 14,
    padding: 12,
    boxShadow: "0 6px 16px rgba(2,6,23,.06)",
  };
  const headerInput = {
    width:"100%", padding:"10px 12px", borderRadius:10,
    border:"1.5px solid #c9d3e6", background:"#ffffff",
    boxSizing:"border-box"
  };
  const headerGrid = {
    display:"grid",
    gridTemplateColumns:"1fr 1fr 1fr 1fr",
    gap:10
  };
  const titleH2 = { margin:"10px 0 6px", fontWeight:900, letterSpacing:.3 };

  const btn = {
    padding:"12px 18px",
    borderRadius:12,
    border:"none",
    cursor:"pointer",
    fontWeight:800,
    letterSpacing:.3,
    boxShadow:"0 4px 12px rgba(2,6,23,.08)"
  };
  const btnPrimary = { ...btn, background:"#4054ec", color:"#fff" };
  const btnGhost = {
    ...btn,
    background:"#ffffff",
    border:"1px solid #c9d3e6",
    color:"#0f172a"
  };
  const rowDeleteBtn = {
    ...btnGhost, padding:"8px 12px", borderRadius:10
  };

  return (
    <div style={page}>
      {/* ===== Header ===== */}
      <div style={headerWrap}>
        <div style={headerGrid}>
          <div>
            <label style={{fontWeight:800, fontSize:12}}>Document Title:</label>
            <input style={headerInput} value={hdr.documentTitle} onChange={e=>setHdr({...hdr, documentTitle:e.target.value})} />
          </div>
          <div>
            <label style={{fontWeight:800, fontSize:12}}>Document No.:</label>
            <input style={headerInput} value={hdr.documentNo} onChange={e=>setHdr({...hdr, documentNo:e.target.value})} />
          </div>
          <div>
            <label style={{fontWeight:800, fontSize:12}}>Issue Date:</label>
            <div style={{...headerInput, display:"flex", alignItems:"center", fontWeight:700}}>
              12/04/2025
            </div>
          </div>
          <div>
            <label style={{fontWeight:800, fontSize:12}}>Revision No.:</label>
            <input style={headerInput} value={hdr.revisionNo} onChange={e=>setHdr({...hdr, revisionNo:e.target.value})} />
          </div>

          <div>
            <label style={{fontWeight:800, fontSize:12}}>Area:</label>
            <input style={headerInput} value={hdr.area} onChange={e=>setHdr({...hdr, area:e.target.value})} />
          </div>
          <div>
            <label style={{fontWeight:800, fontSize:12}}>Issued By:</label>
            <input style={headerInput} value={hdr.issuedBy} onChange={e=>setHdr({...hdr, issuedBy:e.target.value})} />
          </div>
          <div>
            <label style={{fontWeight:800, fontSize:12}}>Controlling Officer:</label>
            <input style={headerInput} value={hdr.controllingOfficer} onChange={e=>setHdr({...hdr, controllingOfficer:e.target.value})} />
          </div>
          <div>
            <label style={{fontWeight:800, fontSize:12}}>Approved By:</label>
            <input style={headerInput} value={hdr.approvedBy} onChange={e=>setHdr({...hdr, approvedBy:e.target.value})} />
          </div>
        </div>
      </div>

      <h2 style={titleH2}>TRANS EMIRATES LIVESTOCK TRADING LLC</h2>
      <h3 style={{margin:"0 0 12px"}}>TRUCK DAILY CLEANING CHECKLIST</h3>

      {/* Date row */}
      <div style={{display:"grid", gridTemplateColumns:"80px 220px", gap:8, alignItems:"center", marginBottom:8}}>
        <label><b>Date:</b></label>
        <input type="date" value={date} onChange={e=>setDate(e.target.value)} style={{...cellField, padding:"8px 10px"}} />
      </div>

      {/* ===== Table ===== */}
      <div style={{marginTop:6, overflowX:"auto"}}>
        <table style={{borderCollapse:"collapse", minWidth:1100, width:"100%", tableLayout:"fixed"}}>
          <colgroup>
            <col style={{width:"11%"}} />
            <col style={{width:"9%"}} />
            <col style={{width:"9%"}} />
            <col style={{width:"9%"}} />
            <col style={{width:"9%"}} />
            <col style={{width:"9%"}} />
            <col style={{width:"9%"}} />
            <col style={{width:"9%"}} />
            <col style={{width:"13%"}} />
            <col style={{width:"13%"}} />
            <col style={{width:"10%"}} />
          </colgroup>
          <thead>
            <tr>
              {[
                "Truck No.","Truck floor","Air Curtain","Truck body","Truck door",
                "Rail/hook etc.","Truck pallets","Truck crates","Informed to","Remarks",""
              ].map(h=>(<th key={h} style={th}>{h}</th>))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i)=>(
              <tr key={i}>
                {/* Truck No. */}
                <td style={td}>
                  <TruckNoCell
                    value={r.truckNo}
                    options={truckOptions}
                    onChange={(v)=>setCell(i,"truckNo",v)}
                    onAdd={(v)=>addTruckNumber(v)}
                    datalistId={`truckNos-${i}`}
                    fieldStyle={cellField}
                  />
                </td>

                <td style={td}><Select val={r.truckFloor} onChange={v=>setCell(i,"truckFloor",v)} fieldStyle={cellField} /></td>
                <td style={td}><Select val={r.airCurtain} onChange={v=>setCell(i,"airCurtain",v)} fieldStyle={cellField} /></td>
                <td style={td}><Select val={r.truckBody} onChange={v=>setCell(i,"truckBody",v)} fieldStyle={cellField} /></td>
                <td style={td}><Select val={r.truckDoor} onChange={v=>setCell(i,"truckDoor",v)} fieldStyle={cellField} /></td>
                <td style={td}><Select val={r.railHook} onChange={v=>setCell(i,"railHook",v)} fieldStyle={cellField} /></td>
                <td style={td}><Select val={r.truckPallets} onChange={v=>setCell(i,"truckPallets",v)} fieldStyle={cellField} /></td>
                <td style={td}><Select val={r.truckCrates} onChange={v=>setCell(i,"truckCrates",v)} fieldStyle={cellField} /></td>

                <td style={td}><input value={r.informedTo} onChange={e=>setCell(i,"informedTo",e.target.value)} style={cellField} /></td>
                <td style={td}><input value={r.remarks} onChange={e=>setCell(i,"remarks",e.target.value)} style={cellField} /></td>
                <td style={{...td, whiteSpace:"nowrap"}}>
                  <button onClick={()=>removeRow(i)} style={rowDeleteBtn} title="Delete this row">🗑 Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* ===== Actions ===== */}
      <div style={{marginTop:14, display:"flex", gap:10, flexWrap:"wrap"}}>
        <button onClick={addRow} style={btnGhost}>＋ Add Row</button>
        <button onClick={onSave} disabled={saving} style={{...btnPrimary, opacity: saving ? .7 : 1}}>
          {saving ? "Saving…" : "Save Report"}
        </button>
        <button onClick={clearAll} style={btnGhost}>Clear</button>
      </div>

      {/* ===== Remarks block ===== */}
      <div style={{marginTop:18, border:"1px solid #c9d3e6", borderRadius:12, overflow:"hidden", background:"#e9edf6"}}>
        <div style={{padding:"10px 12px", borderBottom:"1px solid #c9d3e6", fontWeight:900}}>
          REMARKS/CORRECTIVE ACTIONS:
        </div>
        <div style={{display:"grid", gridTemplateColumns:"1fr 1fr", gap:12, padding:"12px", background:"#f6f8fc"}}>
          <div>
            <label style={{fontWeight:700}}>Checked By :</label>
            <input style={cellField} value={checkedBy} onChange={e=>setCheckedBy(e.target.value)} />
          </div>
          <div>
            <label style={{fontWeight:700}}>Verified By :</label>
            <input style={cellField} value={verifiedBy} onChange={e=>setVerifiedBy(e.target.value)} />
          </div>

          <div style={{gridColumn:"1 / -1"}}>
            <label style={{fontWeight:700}}>Chemical used:</label>
            <input style={cellField} value={chemicalUsed} onChange={e=>setChemicalUsed(e.target.value)} />
          </div>

          <div style={{gridColumn:"1 / -1"}}>
            <label style={{fontWeight:700}}>Cleaning Procedure:</label>
            <textarea rows={3} style={{...cellField, resize:"vertical"}} value={cleaningProcedure} onChange={e=>setCleaningProcedure(e.target.value)} />
          </div>

          <div style={{gridColumn:"1 / -1"}}>
            <label style={{fontWeight:700}}>Remark:</label>
            <input style={cellField} value={frequencyRemark} onChange={e=>setFrequencyRemark(e.target.value)} />
          </div>
        </div>
        <div style={{padding:"8px 12px", fontSize:12, opacity:.9, borderTop:"1px solid #c9d3e6", background:"#e9edf6"}}>
          *(C = Conform, N/C = Non-conform)
        </div>
      </div>

      {msg && <div style={{marginTop:12, color: msg.includes("not in the list") || msg.includes("duplicated") ? "#b00020" : "#0a7a2a", fontWeight:700}}>{msg}</div>}
    </div>
  );
}

/* ===== Truck No. cell ===== */
function TruckNoCell({ value, options, onChange, onAdd, datalistId, fieldStyle }) {
  const [text, setText] = useState(value || "");
  const [showAdd, setShowAdd] = useState(false);
  const [hint, setHint] = useState("");

  const matches = useMemo(()=>{
    const s = text.trim();
    if (!s) return options;
    return options.filter(o => o.includes(s));
  }, [text, options]);

  function handleChange(e) {
    const v = e.target.value.trim();
    setText(v);
    setShowAdd(false);
    setHint("");
    if (options.includes(v)) onChange && onChange(v);
  }

  function handleBlur() {
    const s = text.trim();
    if (!s) { onChange(""); setHint(""); setShowAdd(false); return; }
    if (options.includes(s)) { onChange(s); setHint(""); setShowAdd(false); }
    else { onChange(""); setHint(`"${s}" is not in the list.`); setShowAdd(true); }
  }

  function addNow() {
    const s = text.trim();
    if (!/^\d{3,}$/.test(s)) { setHint("Use digits only (min 3)."); return; }
    const ok = onAdd && onAdd(s);
    if (ok) { onChange(s); setHint(""); setShowAdd(false); }
  }

  return (
    <div>
      <input
        value={text}
        onChange={handleChange}
        onBlur={handleBlur}
        list={datalistId}
        placeholder="Type or select…"
        autoComplete="off"
        style={fieldStyle}
      />
      <datalist id={datalistId}>
        {matches.map(o => <option key={o} value={o} />)}
      </datalist>
      {showAdd && (
        <div style={{marginTop:6, display:"flex", gap:8, alignItems:"center", width:"100%", flexWrap:"wrap"}}>
          <button type="button" onClick={addNow} style={{padding:"8px 12px", borderRadius:10, border:"1px solid #c9d3e6", background:"#fff", cursor:"pointer", whiteSpace:"normal"}}>
            ➕ Add new truck number
          </button>
          {hint && <span style={{color:"#b00020", fontSize:12}}>{hint}</span>}
        </div>
      )}
    </div>
  );
}

function Select({ val, onChange, fieldStyle }) {
  return (
    <select
      value={val}
      onChange={e=>onChange(e.target.value)}
      style={{...fieldStyle, appearance:"auto"}}
    >
      {STATUS.map(s => <option key={s} value={s}>{s}</option>)}
    </select>
  );
}
