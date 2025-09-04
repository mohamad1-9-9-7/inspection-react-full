// src/pages/monitor/branches/ftr1/FTR1OilCalibration.jsx
import React, { useState } from "react";

const API_BASE =
  process.env.REACT_APP_API_URL || "https://inspection-server-4nvj.onrender.com";

export default function FTR1OilCalibration() {
  const [entries, setEntries] = useState([
    { date: "", result: "", action: "", checkedBy: "", verifiedBy: "" },
  ]);
  const [opMsg, setOpMsg] = useState("");

  const handleChange = (index, field, value) => {
    const updated = [...entries];
    updated[index][field] = value;
    setEntries(updated);
  };

  const addRow = () => {
    setEntries((prev) => [
      ...prev,
      { date: "", result: "", action: "", checkedBy: "", verifiedBy: "" },
    ]);
  };

  const handleSave = async () => {
    try {
      setOpMsg("⏳ Saving...");
      const payload = {
        branch: "FTR 1",
        entries,
        savedAt: Date.now(),
      };

      const res = await fetch(`${API_BASE}/api/reports`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reporter: "ftr1",
          type: "ftr1_oil_calibration",
          payload,
        }),
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setOpMsg("✅ Saved successfully!");
    } catch (err) {
      console.error(err);
      setOpMsg("❌ Failed to save.");
    } finally {
      setTimeout(() => setOpMsg(""), 4000);
    }
  };

  return (
    <div style={{ padding: "1.5rem", background: "#fff", borderRadius: 12 }}>
      {/* ========== Header Table (like official form) ========== */}
      <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: "1rem" }}>
        <tbody>
          <tr>
            <td style={cellStyle}><b>Document Title:</b> Oil Quality Monitoring Form</td>
            <td style={cellStyle}><b>Document Number:</b> FS-QM/REC/TR/1</td>
          </tr>
          <tr>
            <td style={cellStyle}><b>Issue Date:</b> 05/02/2020</td>
            <td style={cellStyle}><b>Revision No:</b> 0</td>
          </tr>
          <tr>
            <td style={cellStyle}><b>Area:</b> QA</td>
            <td style={cellStyle}><b>Issued By:</b> MOHAMAD ABDULLAH QC</td>
          </tr>
          <tr>
            <td style={cellStyle}><b>Controlling Officer:</b> QA</td>
            <td style={cellStyle}><b>Approved By:</b> Hussam O. Sarhan</td>
          </tr>
        </tbody>
      </table>

      <div
        style={{
          textAlign: "center",
          background: "#ecf0f1",
          padding: "0.6rem",
          fontWeight: "bold",
          marginBottom: "1.2rem",
        }}
      >
        AL MAWASHI BRAAI KITCHEN — (OIL QUALITY MONITORING FORM)
      </div>

      {/* ========== Main Input Table ========== */}
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr style={{ background: "#16a085", color: "#fff" }}>
            <th style={thStyle}>Date</th>
            <th style={thStyle}>Evaluation Results</th>
            <th style={thStyle}>Corrective Action</th>
            <th style={thStyle}>Checked By</th>
            <th style={thStyle}>Verified By</th>
          </tr>
        </thead>
        <tbody>
          {entries.map((entry, i) => (
            <tr key={i}>
              <td style={tdStyle}>
                <input
                  type="date"
                  value={entry.date}
                  onChange={(e) => handleChange(i, "date", e.target.value)}
                  style={inputStyle}
                />
              </td>
              <td style={tdStyle}>
                <input
                  type="text"
                  value={entry.result}
                  onChange={(e) => handleChange(i, "result", e.target.value)}
                  style={{ ...inputStyle, width: "240px" }}
                  placeholder="Result"
                />
              </td>
              <td style={tdStyle}>
                <input
                  type="text"
                  value={entry.action}
                  onChange={(e) => handleChange(i, "action", e.target.value)}
                  style={{ ...inputStyle, width: "240px" }}
                  placeholder="Action"
                />
              </td>
              <td style={tdStyle}>
                <input
                  type="text"
                  value={entry.checkedBy}
                  onChange={(e) => handleChange(i, "checkedBy", e.target.value)}
                  style={{ ...inputStyle, width: "160px" }}
                  placeholder="Name"
                />
              </td>
              <td style={tdStyle}>
                <input
                  type="text"
                  value={entry.verifiedBy}
                  onChange={(e) => handleChange(i, "verifiedBy", e.target.value)}
                  style={{ ...inputStyle, width: "160px" }}
                  placeholder="Name"
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Buttons */}
      <div style={{ marginTop: "1rem" }}>
        <button
          onClick={addRow}
          style={{
            marginRight: "10px",
            padding: "8px 14px",
            background: "#f39c12",
            color: "#fff",
            border: "none",
            borderRadius: "6px",
            cursor: "pointer",
          }}
        >
          ➕ Add Row
        </button>
        <button
          onClick={handleSave}
          style={{
            padding: "10px 18px",
            background: "linear-gradient(180deg,#10b981,#059669)",
            color: "#fff",
            border: "none",
            borderRadius: "8px",
            cursor: "pointer",
            fontWeight: 600,
          }}
        >
          💾 Save Report
        </button>
      </div>

      {opMsg && <div style={{ marginTop: "1rem", fontWeight: "600" }}>{opMsg}</div>}
    </div>
  );
}

const cellStyle = {
  border: "1px solid #333",
  padding: "6px 10px",
  fontSize: "0.95em",
};

const thStyle = {
  padding: "8px",
  border: "1px solid #ccc",
  textAlign: "center",
};

const tdStyle = {
  padding: "6px",
  border: "1px solid #ccc",
  textAlign: "center",
};

const inputStyle = {
  padding: "6px",
  borderRadius: "6px",
  border: "1px solid #aaa",
};
