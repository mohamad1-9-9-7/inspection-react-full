// src/pages/monitor/branches/ftr2/FTR2DailyCleanliness.jsx
import React, { useState } from "react";

const API_BASE =
  process.env.REACT_APP_API_URL || "https://inspection-server-4nvj.onrender.com";

// 🔹 تعريف الأقسام + البنود
const sections = [
  {
    title: "Food Truck Area",
    items: [
      "Walls/Floors/Doors",
      "Shelves/Containers/Racks",
      "Proper arrangement of Products",
      "Waste Basket",
      "Food storage Containers",
      "Trays",
      "Container",
      "Exhaust",
    ],
  },
  {
    title: "Hand Washing Area",
    items: ["Hand wash Sink", "Hand wash soap/tissue/Sanitizer available"],
  },
  {
    title: "Machine Cleanliness",
    items: [
      "Chiller Room 1",
      "Chiller Room 2",
      "Chiller Room 3",
      "Chiller Room 4",
      "Chiller Room 5",
      "Chiller Room 6",
      "Chiller Room 7",
      "Chiller Room 8",
      "Ice Machine",
    ],
  },
  {
    title: "Waste Disposal",
    items: ["Dust bin", "Collection of waste", "Disposal"],
  },
  {
    title: "Working Conditions & Cleanliness",
    items: ["Lights", "Fly Catchers", "Tap Water"],
  },
];

export default function FTR2DailyCleanliness() {
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [checkedBy, setCheckedBy] = useState("");
  const [verifiedBy, setVerifiedBy] = useState("");

  // تجهيز البيانات
  const [entries, setEntries] = useState(() =>
    sections.flatMap((sec, secIndex) => [
      { section: sec.title, secNo: secIndex + 1, isSection: true },
      ...sec.items.map((it, idx) => ({
        item: it,
        secNo: secIndex + 1,
        subLetter: String.fromCharCode(97 + idx), // a,b,c...
        status: "",
        observation: "",
        informed: "",
        remarks: "",
      })),
    ])
  );

  const [opMsg, setOpMsg] = useState("");

  const handleChange = (index, field, value) => {
    const updated = [...entries];
    updated[index][field] = value;
    setEntries(updated);
  };

  const handleSave = async () => {
    if (!date) return alert("⚠️ Please select report date.");
    if (!time) return alert("⚠️ Please enter Time.");
    if (!checkedBy || !verifiedBy)
      return alert("⚠️ Checked By and Verified By are mandatory.");

    try {
      setOpMsg("⏳ Saving...");
      const payload = {
        branch: "FTR 2",
        reportDate: date,
        reportTime: time,
        checkedBy,
        verifiedBy,
        entries,
        savedAt: Date.now(),
      };

      const res = await fetch(`${API_BASE}/api/reports`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reporter: "ftr2",
          type: "ftr2_daily_cleanliness",
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
      {/* Header */}
      <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: "1rem" }}>
        <tbody>
          <tr>
            <td style={tdHeader}><strong>Document Title:</strong> Cleaning Checklist</td>
            <td style={tdHeader}><strong>Document No:</strong> FF-QM/REC/CC</td>
          </tr>
          <tr>
            <td style={tdHeader}><strong>Issue Date:</strong> 05/02/2020</td>
            <td style={tdHeader}><strong>Revision No:</strong> 0</td>
          </tr>
          <tr>
            <td style={tdHeader}><strong>Area:</strong> QA</td>
            <td style={tdHeader}><strong>Issued By:</strong> MOHAMAD ABDULLAH QC</td>
          </tr>
          <tr>
            <td style={tdHeader}><strong>Controlling Officer:</strong> Quality Controller</td>
            <td style={tdHeader}><strong>Approved By:</strong> Hussam O.Sarhan</td>
          </tr>
        </tbody>
      </table>

      {/* Title */}
      <h3 style={{ textAlign: "center", background: "#e5e7eb", padding: "6px", marginBottom: "1rem" }}>
        AL MAWASHI BRAAI MAMZAR <br />
        CLEANING CHECKLIST – FTR2
      </h3>

      {/* Date & Time */}
      <div style={{ marginBottom: "1rem", display: "flex", gap: "2rem", justifyContent: "center" }}>
        <div>
          <label style={{ fontWeight: 600, marginRight: 8 }}>📅 Date:</label>
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)}
            style={{ padding: "6px 10px", borderRadius: 8, border: "1px solid #ccc" }}/>
        </div>
        <div>
          <label style={{ fontWeight: 600, marginRight: 8 }}>⏰ Time:</label>
          <input type="time" value={time} onChange={(e) => setTime(e.target.value)}
            style={{ padding: "6px 10px", borderRadius: 8, border: "1px solid #ccc" }}/>
        </div>
      </div>

      {/* Table */}
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr style={{ background: "#2980b9", color: "#fff" }}>
            <th style={thStyle}>Sl-No</th>
            <th style={thStyle}>General Cleaning</th>
            <th style={thStyle}>C / NC</th>
            <th style={thStyle}>Observation</th>
            <th style={thStyle}>Informed To</th>
            <th style={thStyle}>Remarks & CA</th>
          </tr>
        </thead>
        <tbody>
          {entries.map((entry, i) => (
            <tr key={i}>
              <td style={tdStyle}>
                {entry.isSection ? entry.secNo : entry.subLetter}
              </td>
              <td style={{ ...tdStyle, fontWeight: entry.isSection ? 700 : 400 }}>
                {entry.section || entry.item}
              </td>
              <td style={tdStyle}>
                {!entry.isSection ? (
                  <select
                    value={entry.status}
                    onChange={(e) => handleChange(i, "status", e.target.value)}
                    style={inputStyle}
                  >
                    <option value="">--</option>
                    <option value="C">C</option>
                    <option value="NC">NC</option>
                  </select>
                ) : "—"}
              </td>
              <td style={tdStyle}>
                {!entry.isSection && (
                  <input type="text" value={entry.observation}
                    onChange={(e) => handleChange(i, "observation", e.target.value)}
                    style={inputStyle} placeholder="Observation"/>
                )}
              </td>
              <td style={tdStyle}>
                {!entry.isSection && (
                  <input type="text" value={entry.informed}
                    onChange={(e) => handleChange(i, "informed", e.target.value)}
                    style={inputStyle} placeholder="Informed To"/>
                )}
              </td>
              <td style={tdStyle}>
                {!entry.isSection && (
                  <input type="text" value={entry.remarks}
                    onChange={(e) => handleChange(i, "remarks", e.target.value)}
                    style={inputStyle} placeholder="Remarks & CA"/>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Footer */}
      <div style={{ marginTop: "1.5rem", fontWeight: 600 }}>REMARKS / CORRECTIVE ACTIONS:</div>
      <div style={{ marginTop: "0.5rem", fontSize: "0.9rem" }}>
        *(C = Conform &nbsp;&nbsp;&nbsp; N/C = Non Conform)
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", marginTop: "1rem", fontWeight: 600 }}>
        <div>
          Checked By:{" "}
          <input type="text" value={checkedBy} onChange={(e) => setCheckedBy(e.target.value)}
            style={{ ...inputStyle, minWidth: "180px" }}/>
        </div>
        <div>
          Verified By:{" "}
          <input type="text" value={verifiedBy} onChange={(e) => setVerifiedBy(e.target.value)}
            style={{ ...inputStyle, minWidth: "180px" }}/>
        </div>
      </div>

      {/* Save */}
      <div style={{ textAlign: "center", marginTop: 20 }}>
        <button onClick={handleSave}
          style={{
            background: "linear-gradient(180deg,#10b981,#059669)",
            color: "#fff", border: "none", padding: "12px 22px",
            borderRadius: 12, cursor: "pointer", fontWeight: 800,
            fontSize: "1rem", boxShadow: "0 6px 14px rgba(16,185,129,.3)",
          }}>
          💾 Save to Server
        </button>
        {opMsg && (
          <div style={{
            marginTop: 10, fontWeight: 700,
            color: opMsg.startsWith("❌") ? "#b91c1c" : "#065f46",
          }}>
            {opMsg}
          </div>
        )}
      </div>
    </div>
  );
}

const thStyle = { padding: "8px", border: "1px solid #ccc", textAlign: "center" };
const tdStyle = { padding: "6px", border: "1px solid #ccc", textAlign: "center" };
const inputStyle = { padding: "6px", borderRadius: "6px", border: "1px solid #aaa" };
const tdHeader = { border: "1px solid #ccc", padding: "4px 6px", fontSize: "0.85rem" };
