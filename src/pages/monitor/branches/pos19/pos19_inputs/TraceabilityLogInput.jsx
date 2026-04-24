// src/pages/monitor/branches/pos19/pos19_inputs/TraceabilityLogInput.jsx
import React, { useMemo, useState } from "react";
import ReportHeader from "../_shared/ReportHeader";

const API_BASE = String(
  (typeof window !== "undefined" && window.__QCS_API__) ||
  (typeof process !== "undefined" &&
    (process.env.REACT_APP_API_URL ||
     process.env.VITE_API_URL ||
     process.env.RENDER_EXTERNAL_URL)) ||
  "https://inspection-server-4nvj.onrender.com"
).replace(/\/$/, "");

const TYPE     = "pos19_traceability_log";
const BRANCH   = "POS 19";
const FORM_REF = "FS-HACCP/POS19/TRC/10";

function emptyRow() {
  return {
    date: "",
    productName: "",
    supplier: "",
    batchLotNo: "",
    productionDate: "",
    expiryDate: "",
    quantityReceived: "",
    quantityUsed: "",
    quantityDisposed: "",
    storageLocation: "",
    disposalReason: "",
    checkedBy: "",
  };
}

function btnStyle(bg) {
  return {
    background: bg, color: "#fff", border: "none",
    borderRadius: 10, padding: "10px 14px", fontWeight: 700,
    cursor: "pointer", boxShadow: "0 4px 12px rgba(0,0,0,.15)",
  };
}

export default function TraceabilityLogInput() {
  const [reportDate, setReportDate] = useState(() => {
    try { return new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Dubai" }); }
    catch { const d=new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`; }
  });
  const [section, setSection]       = useState("");
  const [rows, setRows]             = useState(() => Array.from({ length: 10 }, () => emptyRow()));
  const [verifiedBy, setVerifiedBy] = useState("");
  const [checkedBy, setCheckedBy]   = useState("");
  const [revDate, setRevDate]       = useState("");
  const [revNo, setRevNo]           = useState("");
  const [saving, setSaving]         = useState(false);

  const monthText = useMemo(() => {
    const m = String(reportDate || "").match(/^(\d{4})-(\d{2})-\d{2}$/);
    return m ? `${m[2]}/${m[1]}` : "";
  }, [reportDate]);

  const thCell = {
    border: "1px solid #1f3b70", padding: "6px 4px",
    textAlign: "center", whiteSpace: "pre-line",
    fontWeight: 700, background: "#f5f8ff", color: "#0b1f4d",
  };
  const tdCell = {
    border: "1px solid #1f3b70", padding: "6px 4px",
    textAlign: "center", verticalAlign: "middle",
  };
  const inputStyle = {
    width: "100%", boxSizing: "border-box",
    border: "1px solid #c7d2fe", borderRadius: 6,
    padding: "4px 6px", display: "block", minWidth: 0,
  };

  function updateRow(idx, key, val) {
    setRows(prev => {
      const next = [...prev];
      next[idx] = { ...next[idx], [key]: val };
      return next;
    });
  }
  function addRow()    { setRows(prev => [...prev, emptyRow()]); }
  function removeRow(i){ setRows(prev => prev.filter((_, idx) => idx !== i)); }

  const colDefs = useMemo(() => ([
    <col key="date"     style={{ width: 110 }} />,
    <col key="prod"     style={{ width: 160 }} />,
    <col key="supp"     style={{ width: 160 }} />,
    <col key="batch"    style={{ width: 130 }} />,
    <col key="prodDate" style={{ width: 110 }} />,
    <col key="expDate"  style={{ width: 110 }} />,
    <col key="qtyRec"   style={{ width: 90 }} />,
    <col key="qtyUsed"  style={{ width: 90 }} />,
    <col key="qtyDisp"  style={{ width: 90 }} />,
    <col key="storage"  style={{ width: 140 }} />,
    <col key="reason"   style={{ width: 160 }} />,
    <col key="chk"      style={{ width: 120 }} />,
    <col key="del"      style={{ width: 70 }} />,
  ]), []);

  async function handleSave() {
    if (!reportDate) { alert("الرجاء تحديد التاريخ"); return; }
    const entries = rows.filter(r =>
      Object.values(r).some(v => String(v || "").trim() !== "")
    );
    if (!entries.length) { alert("أضف على الأقل صفًا واحدًا"); return; }
    setSaving(true);
    const payload = {
      branch: BRANCH, formRef: FORM_REF, classification: "Official",
      section, reportDate, month: monthText, entries, checkedBy, verifiedBy, revDate, revNo,
      savedAt: Date.now(),
    };
    try {
      const res = await fetch(`${API_BASE}/api/reports`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reporter: "pos19", type: TYPE, payload }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      alert("✅ تم الحفظ بنجاح!");
    } catch (e) {
      console.error(e);
      alert("❌ فشل الحفظ. تحقق من السيرفر أو الشبكة.");
    } finally { setSaving(false); }
  }

  return (
    <div style={{ background:"#fff", border:"1px solid #dbe3f4", borderRadius:12, padding:16, color:"#0b1f4d" }}>
      <ReportHeader
        title="Traceability Log"
        fields={[
          { label: "Form Ref", value: FORM_REF },
          { label: "Branch", value: BRANCH },
          { label: "Classification", value: "Official" },
          { label: "Report Date", type: "date", value: reportDate, onChange: setReportDate },
          { label: "Section", value: section, onChange: setSection, placeholder: "e.g. Butchery" },
        ]}
      />

      {/* Title strip */}
      <div style={{ border:"1px solid #1f3b70", borderBottom:"none" }}>
        <div style={{ ...thCell, background:"#e9f0ff" }}>PRODUCT TRACEABILITY RECORD</div>
      </div>

      {/* Table */}
      <div style={{ overflowX:"auto" }}>
        <table style={{ width:"100%", borderCollapse:"collapse", tableLayout:"fixed", fontSize:12 }}>
          <colgroup>{colDefs}</colgroup>
          <thead>
            <tr>
              <th style={thCell}>Date</th>
              <th style={thCell}>Product{"\n"}Name</th>
              <th style={thCell}>Supplier</th>
              <th style={thCell}>Batch /{ "\n"}Lot No.</th>
              <th style={thCell}>Production{"\n"}Date</th>
              <th style={thCell}>Expiry{"\n"}Date</th>
              <th style={thCell}>Qty{"\n"}Received</th>
              <th style={thCell}>Qty{"\n"}Used</th>
              <th style={thCell}>Qty{"\n"}Disposed</th>
              <th style={thCell}>Storage{"\n"}Location</th>
              <th style={thCell}>Disposal{"\n"}Reason</th>
              <th style={thCell}>Checked{"\n"}by</th>
              <th style={thCell}>—</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i}>
                <td style={tdCell}><input type="date"   value={r.date}             onChange={e=>updateRow(i,"date",e.target.value)}             style={inputStyle} /></td>
                <td style={tdCell}><input type="text"   value={r.productName}      onChange={e=>updateRow(i,"productName",e.target.value)}      style={inputStyle} placeholder="Product" /></td>
                <td style={tdCell}><input type="text"   value={r.supplier}         onChange={e=>updateRow(i,"supplier",e.target.value)}         style={inputStyle} placeholder="Supplier" /></td>
                <td style={tdCell}><input type="text"   value={r.batchLotNo}       onChange={e=>updateRow(i,"batchLotNo",e.target.value)}       style={inputStyle} placeholder="Batch/Lot" /></td>
                <td style={tdCell}><input type="date"   value={r.productionDate}   onChange={e=>updateRow(i,"productionDate",e.target.value)}   style={inputStyle} /></td>
                <td style={tdCell}><input type="date"   value={r.expiryDate}       onChange={e=>updateRow(i,"expiryDate",e.target.value)}       style={inputStyle} /></td>
                <td style={tdCell}><input type="number" value={r.quantityReceived} onChange={e=>updateRow(i,"quantityReceived",e.target.value)} style={inputStyle} placeholder="kg/units" /></td>
                <td style={tdCell}><input type="number" value={r.quantityUsed}     onChange={e=>updateRow(i,"quantityUsed",e.target.value)}     style={inputStyle} placeholder="kg/units" /></td>
                <td style={tdCell}><input type="number" value={r.quantityDisposed} onChange={e=>updateRow(i,"quantityDisposed",e.target.value)} style={inputStyle} placeholder="kg/units" /></td>
                <td style={tdCell}><input type="text"   value={r.storageLocation}  onChange={e=>updateRow(i,"storageLocation",e.target.value)}  style={inputStyle} placeholder="Location" /></td>
                <td style={tdCell}><input type="text"   value={r.disposalReason}   onChange={e=>updateRow(i,"disposalReason",e.target.value)}   style={inputStyle} placeholder="If any" /></td>
                <td style={tdCell}><input type="text"   value={r.checkedBy}        onChange={e=>updateRow(i,"checkedBy",e.target.value)}        style={inputStyle} /></td>
                <td style={tdCell}><button onClick={()=>removeRow(i)} style={btnStyle("#dc2626")}>Del</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Controls */}
      <div style={{ display:"flex", gap:8, marginTop:12, flexWrap:"wrap" }}>
        <button onClick={addRow}      style={btnStyle("#0ea5e9")}>+ Add Row</button>
        <button onClick={handleSave} disabled={saving} style={btnStyle("#2563eb")}>
          {saving ? "Saving…" : "Save Traceability Log"}
        </button>
      </div>

      {/* Footer */}
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr 1fr", gap:12, marginTop:16, alignItems:"center", fontSize:12 }}>
        <div style={{ display:"flex", alignItems:"center", gap:8 }}>
          <span>Checked by:</span>
          <input value={checkedBy} onChange={e=>setCheckedBy(e.target.value)} style={inputStyle} />
        </div>
        <div style={{ display:"flex", alignItems:"center", gap:8 }}>
          <span>Verified by:</span>
          <input value={verifiedBy} onChange={e=>setVerifiedBy(e.target.value)} style={inputStyle} />
        </div>
        <div style={{ display:"flex", alignItems:"center", gap:8 }}>
          <span>Rev. Date:</span>
          <input value={revDate} onChange={e=>setRevDate(e.target.value)} style={inputStyle} placeholder="YYYY-MM-DD" />
        </div>
        <div style={{ display:"flex", alignItems:"center", gap:8 }}>
          <span>Rev. No:</span>
          <input value={revNo} onChange={e=>setRevNo(e.target.value)} style={inputStyle} />
        </div>
      </div>
    </div>
  );
}
