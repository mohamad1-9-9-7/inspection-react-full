// src/pages/monitor/branches/pos 10/POS10PersonalHygiene.jsx
// Personal Hygiene input — POS 10
// يحفظ بنفس أسلوب التقارير عبر /api/reports مع تمييز الفرع (POS 10)

import React, { useState } from "react";
import { useSearchParams } from "react-router-dom";

const API_BASE =
  process.env.REACT_APP_API_URL || "https://inspection-server-4nvj.onrender.com";

const columns = [
  "Nails",
  "Hair",
  "Not wearing Jewelry",
  "Wearing Clean Cloth/Hair Net/Hand Glove/Face masks/Shoe",
  "Communicable Disease",
  "Open wounds/sores & cut",
];

export default function POS10PersonalHygiene() {
  const [searchParams] = useSearchParams();
  const branchFromURL = searchParams.get("branch");
  const branch = branchFromURL || "POS 10";

  const [date, setDate] = useState("");
  const [entries, setEntries] = useState(
    Array.from({ length: 9 }, () => ({
      name: "",
      Nails: "",
      Hair: "",
      "Not wearing Jewelry": "",
      "Wearing Clean Cloth/Hair Net/Hand Glove/Face masks/Shoe": "",
      "Communicable Disease": "",
      "Open wounds/sores & cut": "",
      remarks: "",
    }))
  );
  const [checkedBy, setCheckedBy] = useState("");
  const [verifiedBy, setVerifiedBy] = useState("");
  const [opMsg, setOpMsg] = useState("");

  const handleChange = (rowIndex, field, value) => {
    const updated = [...entries];
    updated[rowIndex][field] = value;
    setEntries(updated);
  };

  const handleSave = async () => {
    if (!date) {
      alert("⚠️ Please select a date");
      return;
    }
    if (!checkedBy.trim() || !verifiedBy.trim()) {
      alert("⚠️ Checked By and Verified By are required");
      return;
    }
    try {
      setOpMsg("⏳ Saving...");
      const payload = {
        branch, // ✅ POS 10 (أو من الـ URL)
        reportDate: date,
        entries,
        checkedBy,
        verifiedBy,
        savedAt: Date.now(),
      };

      const res = await fetch(`${API_BASE}/api/reports`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reporter: "pos10",                // ✅ تمييز الفرع
          type: "pos10_personal_hygiene",   // ✅ نوع التقرير
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
    <div style={{ padding: "1rem", background: "#fff", borderRadius: 12 }}>
      {/* Header info */}
      <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: "1rem" }}>
        <tbody>
          <tr>
            <td style={tdHeader}>
              <strong>Document Title:</strong> Personal Hygiene Check List
            </td>
            <td style={tdHeader}>
              <strong>Document No:</strong> FS-QM /REC/PH
            </td>
          </tr>
          <tr>
            <td style={tdHeader}>
              <strong>Issue Date:</strong> 05/02/2020
            </td>
            <td style={tdHeader}>
              <strong>Revision No:</strong> 0
            </td>
          </tr>
          <tr>
            <td style={tdHeader}>
              <strong>Area:</strong> {branch}
            </td>
            <td style={tdHeader}>
              <strong>Issued By:</strong> MOHAMAD ABDULLAH QC
            </td>
          </tr>
          <tr>
            <td style={tdHeader}>
              <strong>Controlling Officer:</strong> Quality Controller
            </td>
            <td style={tdHeader}>
              <strong>Approved By:</strong> Hussam.O.Sarhan
            </td>
          </tr>
        </tbody>
      </table>

      {/* Title */}
      <h3
        style={{
          textAlign: "center",
          background: "#e5e7eb",
          padding: "6px",
          marginBottom: "0.5rem",
        }}
      >
        POS 10
        <br />
        PERSONAL HYGIENE CHECKLIST
      </h3>

      {/* Date */}
      <div style={{ marginBottom: "0.5rem" }}>
        <strong>Date:</strong>{" "}
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          style={{
            padding: "4px 8px",
            borderRadius: "6px",
            border: "1px solid #ccc",
          }}
        />
      </div>

      {/* Table */}
      <table
        style={{
          width: "100%",
          borderCollapse: "collapse",
          tableLayout: "fixed",
        }}
      >
        <thead>
          <tr style={{ background: "#2980b9", color: "#fff" }}>
            <th style={{ ...thStyle, width: "50px" }}>S.No</th>
            <th style={{ ...thStyle, width: "150px" }}>Employee Name</th>
            {columns.map((col, i) => (
              <th key={i} style={{ ...thStyle, width: "120px" }}>
                {col}
              </th>
            ))}
            <th style={{ ...thStyle, width: "250px" }}>Remarks and Corrective Actions</th>
          </tr>
        </thead>
        <tbody>
          {entries.map((entry, i) => (
            <tr key={i}>
              <td style={tdStyle}>{i + 1}</td>
              <td style={tdStyle}>
                <input
                  type="text"
                  value={entry.name}
                  onChange={(e) => handleChange(i, "name", e.target.value)}
                  style={{
                    ...inputStyle,
                    width: "100%",
                    maxWidth: "140px",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  }}
                />
              </td>
              {columns.map((col, cIndex) => (
                <td key={cIndex} style={tdStyle}>
                  <select
                    value={entry[col]}
                    onChange={(e) => handleChange(i, col, e.target.value)}
                    style={{ ...inputStyle, width: "100%" }}
                  >
                    <option value="">--</option>
                    <option value="C">C</option>
                    <option value="NC">NC</option>
                  </select>
                </td>
              ))}
              <td style={tdStyle}>
                <input
                  type="text"
                  value={entry.remarks}
                  onChange={(e) => handleChange(i, "remarks", e.target.value)}
                  style={{ ...inputStyle, width: "100%" }}
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Remarks footer */}
      <div style={{ marginTop: "1rem", fontWeight: "600" }}>
        REMARKS / CORRECTIVE ACTIONS:
      </div>

      {/* C / NC note */}
      <div style={{ marginTop: "0.5rem", fontSize: "0.9rem" }}>
        *(C – Conform &nbsp;&nbsp;&nbsp; N/C – Non Conform)
      </div>

      {/* Checked / Verified */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          marginTop: "1rem",
          fontWeight: 600,
          gap: "1rem",
          flexWrap: "wrap",
        }}
      >
        <label>
          Checked By:{" "}
          <input
            type="text"
            required
            value={checkedBy}
            onChange={(e) => setCheckedBy(e.target.value)}
            style={footerInput}
          />
        </label>
        <label>
          Verified By:{" "}
          <input
            type="text"
            required
            value={verifiedBy}
            onChange={(e) => setVerifiedBy(e.target.value)}
            style={footerInput}
          />
        </label>
      </div>

      {/* Save */}
      <div style={{ textAlign: "center", marginTop: "1.5rem" }}>
        <button
          type="button"
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

      {opMsg && (
        <div style={{ marginTop: "1rem", fontWeight: "600" }}>{opMsg}</div>
      )}
    </div>
  );
}

const thStyle = {
  padding: "6px",
  border: "1px solid #ccc",
  textAlign: "center",
  fontSize: "0.85rem",
};

const tdStyle = {
  padding: "6px",
  border: "1px solid #ccc",
  textAlign: "center",
};

const tdHeader = {
  border: "1px solid #ccc",
  padding: "4px 6px",
  fontSize: "0.85rem",
};

const inputStyle = {
  padding: "4px 6px",
  borderRadius: "4px",
  border: "1px solid #aaa",
  width: "100%",
};

const footerInput = {
  border: "1px solid #aaa",
  borderRadius: "6px",
  padding: "4px 6px",
  minWidth: "160px",
};
