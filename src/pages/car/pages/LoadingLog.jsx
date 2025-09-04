// src/pages/LoadingLog.jsx
import React, { useState } from "react";

/**
 * VISUAL INSPECTION (OUTBOUND CHECKLIST) — English-only
 * - Header kept as-is (Document Title/No/Issue/Revision + Area/Issued/Controlling/Approved)
 * - Multiple vehicles per single report date (rows you can add/remove)
 * - Saves to server: POST /api/reports  { reporter, type, payload }
 */

const API_BASE =
  (typeof import.meta !== "undefined" && import.meta.env?.VITE_API_URL) ||
  (typeof process !== "undefined" && process.env?.REACT_APP_API_URL) ||
  "https://inspection-server-4nvj.onrender.com";

const TYPE = "cars_loading_inspection";

async function saveToServer(payload) {
  const res = await fetch(`${API_BASE}/api/reports`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ reporter: "anonymous", type: TYPE, payload }),
  });
  if (!res.ok) throw new Error(`Server ${res.status}: ${await res.text()}`);
  return res.json();
}

const YESNO_FIELDS = [
  "floorSealingIntact",
  "floorCleaning",
  "pestActivites", // keep sheet spelling
  "plasticCurtain",
  "badOdour",
  "ppeAvailable",
];

const HEAD_DEFAULT = {
  documentTitle: "OUTBOUND CHECKLIST",
  documentNo: "FSM-QM/REC/OCL",
  issueDate: "24/04/2025",
  revisionNo: "1",
  area: "LOGISTIC",
  issuedBy: "MOHAMAD ABDULLAH",
  controllingOfficer: "LOGISTIC MANAGER",
  approvedBy: "ALTAF KHAN",
};

function newRow() {
  return {
    vehicleNo: "",
    driverName: "",
    timeStart: "",
    timeEnd: "",
    tempCheck: "",
    floorSealingIntact: "", // yes|no
    floorCleaning: "",
    pestActivites: "",
    plasticCurtain: "",
    badOdour: "",
    ppeAvailable: "",
    informedTo: "",
    remarks: "",
  };
}

export default function LoadingLog() {
  const [header, setHeader] = useState({ ...HEAD_DEFAULT });
  const [reportDate, setReportDate] = useState(new Date().toISOString().slice(0, 10));
  const [inspectedBy, setInspectedBy] = useState("");
  const [verifiedBy, setVerifiedBy] = useState("");
  const [rows, setRows] = useState([newRow()]);
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);

  const setHead = (k, v) => setHeader((h) => ({ ...h, [k]: v }));
  const setRow = (i, k, v) =>
    setRows((rs) => {
      const n = rs.slice();
      n[i] = { ...n[i], [k]: v };
      return n;
    });
  const addRow = () => setRows((rs) => [...rs, newRow()]);
  const removeRow = (i) => setRows((rs) => rs.filter((_, idx) => idx !== i));

  const handleSave = async (e) => {
    e.preventDefault();
    const cleanRows = rows.filter((r) => Object.values(r).some((v) => String(v || "").trim()));
    if (!cleanRows.length) {
      setMsg("Add at least one vehicle row.");
      setTimeout(() => setMsg(""), 2000);
      return;
    }
    try {
      setBusy(true);
      setMsg("Saving to server…");
      await saveToServer({
        id: crypto.randomUUID?.() || String(Date.now()),
        createdAt: Date.now(),
        header,
        reportDate,
        inspectedBy,
        verifiedBy,
        rows: cleanRows,
      });
      setMsg("Saved successfully.");
      setRows([newRow()]);
    } catch (err) {
      console.error(err);
      setMsg("Save failed. Please try again.");
    } finally {
      setBusy(false);
      setTimeout(() => setMsg(""), 3000);
    }
  };

  /* ===== Styled Components Objects ===== */
  const wrapStyle = {
    padding: "32px",
    fontFamily: "Arial, sans-serif",
    backgroundColor: "#f7f9fc",
    color: "#333",
    minHeight: "100vh",
    boxSizing: "border-box",
    direction: "ltr", // CHANGED: left-to-right direction
  };

  const cardStyle = {
    backgroundColor: "#ffffff",
    borderRadius: "12px",
    boxShadow: "0 10px 25px rgba(0, 0, 0, 0.08)",
    overflow: "hidden",
  };

  const sectionStyle = {
    padding: "16px 24px",
    borderBottom: "1px solid #e0e6ed",
  };

  const grid4Style = {
    display: "grid",
    gridTemplateColumns: "repeat(1, 1fr)",
    gap: "16px",
  };

  const grid2Style = {
    display: "grid",
    gridTemplateColumns: "repeat(1, 1fr)",
    gap: "24px",
  };

  const labelStyle = {
    fontSize: "13px",
    fontWeight: "600",
    color: "#1a202c",
    marginBottom: "4px",
  };

  const inputStyle = {
    width: "100%",
    padding: "10px 12px",
    fontSize: "14px",
    border: "1px solid #c0d0e0",
    borderRadius: "8px",
    backgroundColor: "#fefefe",
    transition: "border-color 0.2s",
    boxSizing: "border-box",
  };

  const inputFocusStyle = {
    outline: "none",
    borderColor: "#4a90e2",
    boxShadow: "0 0 0 2px rgba(74, 144, 226, 0.2)",
  };

  const titleStyle = {
    fontSize: "22px",
    fontWeight: "700",
    color: "#1a202c",
    textAlign: "left", // CHANGED: Align left
    padding: "8px 0",
    textTransform: "uppercase",
  };

  const tableWrapperStyle = {
    overflowX: "auto",
    padding: "0",
  };

  const tableStyle = {
    width: "100%",
    borderCollapse: "collapse",
    minWidth: "1200px",
  };

  const thStyle = {
    backgroundColor: "#f0f2f5",
    padding: "12px 8px",
    fontSize: "11px",
    fontWeight: "700",
    color: "#4a5568",
    textAlign: "left", // CHANGED: Align left
    textTransform: "uppercase",
    border: "1px solid #c0d0e0",
  };

  const tdStyle = {
    padding: "10px 8px",
    border: "1px solid #c0d0e0",
    textAlign: "left", // CHANGED: Align left
    verticalAlign: "middle",
    boxSizing: "border-box",
  };

  const radioGroupStyle = {
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    gap: "16px",
  };

  const radioLabelStyle = {
    fontSize: "13px",
    color: "#4a5568",
    display: "flex",
    alignItems: "center",
    gap: "4px",
  };

  const buttonStyle = {
    padding: "10px 20px",
    fontSize: "14px",
    fontWeight: "600",
    borderRadius: "8px",
    cursor: "pointer",
    border: "none",
    transition: "background-color 0.2s, box-shadow 0.2s",
  };

  const addButton = {
    ...buttonStyle,
    backgroundColor: "#e2e8f0",
    color: "#4a5568",
    border: "1px solid #cbd5e1",
  };

  const saveButton = {
    ...buttonStyle,
    backgroundColor: busy ? "#87b6f5" : "#4a90e2",
    color: "#fff",
    border: "1px solid #4a90e2",
    cursor: busy ? "not-allowed" : "pointer",
  };

  const removeBtnStyle = {
    backgroundColor: "transparent",
    border: "none",
    cursor: "pointer",
    color: "#e53e3e",
    fontSize: "18px",
    padding: "0",
  };
  
  const toolbarStyle = {
    display: "flex",
    justifyContent: "flex-end",
    alignItems: "center",
    gap: "12px",
    padding: "16px 24px",
  };

  /* Mobile adjustments for grids */
  const responsiveGrid4 = window.innerWidth <= 768 ? grid4Style : { ...grid4Style, gridTemplateColumns: "repeat(4, 1fr)" };
  const responsiveGrid2 = window.innerWidth <= 768 ? grid2Style : { ...grid2Style, gridTemplateColumns: "repeat(2, 1fr)" };

  return (
    <form onSubmit={handleSave} style={wrapStyle}>
      <div style={cardStyle}>
        {/* Header row 1 & 2 */}
        <div style={{ ...sectionStyle, backgroundColor: "#f0f2f5" }}>
          <div style={responsiveGrid4}>
            <div>
              <label style={labelStyle}>Document Title:</label>
              <input style={inputStyle} value={header.documentTitle} onChange={(e) => setHead("documentTitle", e.target.value)} />
            </div>
            <div>
              <label style={labelStyle}>Document No.:</label>
              <input style={inputStyle} value={header.documentNo} onChange={(e) => setHead("documentNo", e.target.value)} />
            </div>
            <div>
              <label style={labelStyle}>Issue Date:</label>
              <input style={inputStyle} placeholder="DD/MM/YYYY" value={header.issueDate} onChange={(e) => setHead("issueDate", e.target.value)} />
            </div>
            <div>
              <label style={labelStyle}>Revision No.:</label>
              <input style={inputStyle} value={header.revisionNo} onChange={(e) => setHead("revisionNo", e.target.value)} />
            </div>
          </div>
          <div style={{...responsiveGrid4, marginTop: "16px"}}>
            <div>
              <label style={labelStyle}>Area:</label>
              <input style={inputStyle} value={header.area} onChange={(e) => setHead("area", e.target.value)} />
            </div>
            <div>
              <label style={labelStyle}>Issued By:</label>
              <input style={inputStyle} value={header.issuedBy} onChange={(e) => setHead("issuedBy", e.target.value)} />
            </div>
            <div>
              <label style={labelStyle}>Controlling Officer:</label>
              <input style={inputStyle} value={header.controllingOfficer} onChange={(e) => setHead("controllingOfficer", e.target.value)} />
            </div>
            <div>
              <label style={labelStyle}>Approved By:</label>
              <input style={inputStyle} value={header.approvedBy} onChange={(e) => setHead("approvedBy", e.target.value)} />
            </div>
          </div>
        </div>

        {/* Title + Report date */}
        <div style={{ ...sectionStyle, display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "16px" }}>
          <div style={titleStyle}>VISUAL INSPECTION (OUTBOUND CHECKLIST)</div>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <label style={labelStyle}>Report Date:</label>
            <input type="date" style={{...inputStyle, width: "auto"}} value={reportDate} onChange={(e) => setReportDate(e.target.value)} />
          </div>
        </div>

        {/* Table */}
        <div style={tableWrapperStyle}>
          <table style={tableStyle}>
            <thead>
              <tr>
                {[
                  "VEHICLE NO",
                  "DRIVER NAME",
                  "TIME START",
                  "TIME END",
                  "TRUCK TEMPERATURE",
                  "FLOOR SEALING INTACT",
                  "FLOOR CLEANING",
                  "PEST ACTIVITES",
                  "PLASTIC CURTAIN AVAILABLE/ CLEANING",
                  "BAD ODOUR",
                  "PPE AVAILABLE",
                  "INFORMED TO",
                  "REMARKS",
                  "",
                ].map((h) => (
                  <th key={h} style={thStyle}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={i}>
                  <td style={tdStyle}><input style={inputStyle} value={r.vehicleNo} onChange={(e) => setRow(i, "vehicleNo", e.target.value)} /></td>
                  <td style={tdStyle}><input style={inputStyle} value={r.driverName} onChange={(e) => setRow(i, "driverName", e.target.value)} /></td>
                  <td style={tdStyle}><input type="time" style={inputStyle} value={r.timeStart} onChange={(e) => setRow(i, "timeStart", e.target.value)} /></td>
                  <td style={tdStyle}><input type="time" style={inputStyle} value={r.timeEnd} onChange={(e) => setRow(i, "timeEnd", e.target.value)} /></td>
                  <td style={tdStyle}><input type="number" step="0.1" style={inputStyle} value={r.tempCheck} onChange={(e) => setRow(i, "tempCheck", e.target.value)} /></td>

                  {YESNO_FIELDS.map((k) => (
                    <td key={k} style={tdStyle}>
                      <div style={radioGroupStyle}>
                        <label style={radioLabelStyle}><input type="radio" name={`${k}-${i}`} checked={r[k] === "yes"} onChange={() => setRow(i, k, "yes")} style={{accentColor: "#4a90e2"}}/> YES</label>
                        <label style={radioLabelStyle}><input type="radio" name={`${k}-${i}`} checked={r[k] === "no"} onChange={() => setRow(i, k, "no")} style={{accentColor: "#4a90e2"}}/> NO</label>
                      </div>
                    </td>
                  ))}

                  <td style={tdStyle}><input style={inputStyle} value={r.informedTo} onChange={(e) => setRow(i, "informedTo", e.target.value)} /></td>
                  <td style={tdStyle}><input style={inputStyle} value={r.remarks} onChange={(e) => setRow(i, "remarks", e.target.value)} /></td>
                  <td style={tdStyle}>
                    {rows.length > 1 && (
                      <button type="button" onClick={() => removeRow(i)} style={removeBtnStyle}>
                        ✖
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Signatures */}
        <div style={sectionStyle}>
          <div style={responsiveGrid2}>
            <div>
              <label style={labelStyle}>INSPECTED BY:</label>
              <input style={inputStyle} value={inspectedBy} onChange={(e) => setInspectedBy(e.target.value)} />
            </div>
            <div>
              <label style={labelStyle}>VERIFIED BY:</label>
              <input style={inputStyle} value={verifiedBy} onChange={(e) => setVerifiedBy(e.target.value)} />
            </div>
          </div>
        </div>

        {/* Toolbar */}
        <div style={toolbarStyle}>
          <button type="button" onClick={addRow} style={addButton}>
            ➕ Add Vehicle
          </button>
          <button type="submit" disabled={busy} style={saveButton}>
            {busy ? "Saving…" : "💾 Save Report"}
          </button>
          {msg && <strong style={{ marginLeft: "12px", color: "#4a5568", fontSize: "14px" }}>{msg}</strong>}
        </div>
      </div>
    </form>
  );
}