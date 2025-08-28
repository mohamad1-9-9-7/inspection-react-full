// src/pages/monitor/branches/production/PersonalHygienePRDInput.jsx
import React, { useState } from "react";

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

// قائمة الأسماء الافتراضية (تظهر تلقائيًا)
const DEFAULT_NAMES = [
  "El Arbi Azar",
  "Mamdouh Salah Ali Rezk",
  "Mohammed Mahmoud Aletr",
  "Imran Khan",
  "Sherif Eid Mohamed Mahmoud",
  "Yousef Lmbarki",
  "MOHSEN HASAN HAIDAR",
  "Mohammed Asif",
  "MOHAMED NASR MOHAMED HASSAN",
  "Aimen Gharib",
  "Bakr Bakr Shaban Mohamed Elsayed",
  "Abdalla Shaaban Kamal Abdou",
  "Mohammed Khalid alahmad",
  "Aallaa AlDin Mohammed Ali Almaad",
  "Mohammad Salman",
];

const makeRow = (name = "") => ({
  name,
  Nails: "",
  Hair: "",
  "Not wearing Jewelry": "",
  "Wearing Clean Cloth/Hair Net/Hand Glove/Face masks/Shoe": "",
  "Communicable Disease": "",
  "Open wounds/sores & cut": "",
  remarks: "",
});

const today = () => new Date().toISOString().slice(0, 10);

export default function PersonalHygienePRDInput() {
  const [date, setDate] = useState(today());
  const [checkedBy, setCheckedBy] = useState("");
  const [verifiedBy, setVerifiedBy] = useState("");
  const [opMsg, setOpMsg] = useState("");

  // الأسماء الافتراضية بدل 9 صفوف فارغة
  const [entries, setEntries] = useState(DEFAULT_NAMES.map((n) => makeRow(n)));

  const handleChange = (rowIndex, field, value) => {
    const updated = [...entries];
    updated[rowIndex][field] = value;
    setEntries(updated);
  };

  const addRow = () => setEntries((prev) => [...prev, makeRow("")]);
  const removeRow = (idx) =>
    setEntries((prev) => (prev.length > 1 ? prev.filter((_, i) => i !== idx) : prev));

  const handleSave = async () => {
    if (!date) {
      alert("⚠️ Please select a date");
      return;
    }
    if (!checkedBy.trim() || !verifiedBy.trim()) {
      alert("⚠️ Checked By and Verified By are required");
      return;
    }

    // تجاهل الصفوف الفارغة تمامًا
    const cleaned = entries.filter(
      (e) =>
        String(e.name || "").trim() !== "" ||
        columns.some((c) => String(e[c] || "").trim() !== "") ||
        String(e.remarks || "").trim() !== ""
    );
    if (cleaned.length === 0) {
      alert("⚠️ أدخل اسمًا أو بيانات واحدة على الأقل.");
      return;
    }

    try {
      setOpMsg("⏳ Saving...");
      const payload = {
        branch: "Production",
        reportDate: date,
        entries: cleaned,
        checkedBy,
        verifiedBy,
        savedAt: Date.now(),
      };

      const res = await fetch(`${API_BASE}/api/reports`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reporter: "production",
          type: "prod_personal_hygiene",
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
      {/* أزرار سريعة */}
      <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
        <button onClick={addRow} style={btn} title="Add Row">
          + Add Row
        </button>
      </div>

      {/* Header info */}
      <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: "1rem" }}>
        <tbody>
          <tr>
            <td style={tdHeader}><strong>Document Title:</strong> Personal Hygiene Check List</td>
            <td style={tdHeader}><strong>Document No:</strong> FS-QM /REC/PH</td>
          </tr>
          <tr>
            <td style={tdHeader}><strong>Issue Date:</strong> 05/02/2020</td>
            <td style={tdHeader}><strong>Revision No:</strong> 0</td>
          </tr>
          <tr>
            <td style={tdHeader}><strong>Area:</strong> Production</td>
            <td style={tdHeader}><strong>Issued By:</strong> QA</td>
          </tr>
          {/* ✅ شيلنا Approved By من أعلى الترويسة وخليّنا Controlling Officer فقط */}
          <tr>
            <td style={tdHeader} colSpan={2}>
              <strong>Controlling Officer:</strong> Quality Controller
            </td>
          </tr>
        </tbody>
      </table>

      {/* Title */}
      <h3 style={{ textAlign: "center", background: "#e5e7eb", padding: "6px", marginBottom: "0.5rem" }}>
        AL MAWASHI — PRODUCTION
        <br />
        PERSONAL HYGIENE CHECKLIST (PRD)
      </h3>

      {/* Date */}
      <div style={{ marginBottom: "0.5rem" }}>
        <strong>Date:</strong>{" "}
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          style={{ padding: "4px 8px", borderRadius: "6px", border: "1px solid #ccc" }}
        />
      </div>

      {/* Table */}
      <table style={{ width: "100%", borderCollapse: "collapse", tableLayout: "fixed" }}>
        <thead>
          <tr style={{ background: "#2980b9", color: "#fff" }}>
            <th style={{ ...thStyle, width: "50px" }}>S.No</th>
            <th style={{ ...thStyle, width: "180px" }}>Employee Name</th>
            {columns.map((col, i) => (
              <th key={i} style={{ ...thStyle, width: "120px" }}>{col}</th>
            ))}
            <th style={{ ...thStyle, width: "250px" }}>Remarks and Corrective Actions</th>
            <th className="no-print" style={{ ...thStyle, width: "70px" }}>Actions</th>
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
                  style={{ ...inputStyle, width: "100%", maxWidth: "170px", overflow: "hidden", textOverflow: "ellipsis" }}
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
              <td className="no-print" style={{ ...tdStyle }}>
                <button onClick={() => removeRow(i)} style={btnDanger} title="Remove Row">− Remove</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Remarks footer */}
      <div style={{ marginTop: "1rem", fontWeight: "600" }}>REMARKS / CORRECTIVE ACTIONS:</div>

      {/* C / NC note */}
      <div style={{ marginTop: "0.5rem", fontSize: "0.9rem" }}>
        *(C – Conform &nbsp;&nbsp;&nbsp; N/C – Non Conform)
      </div>

      {/* Checked / Verified */}
      <div style={{ display: "flex", justifyContent: "space-between", marginTop: "1rem", fontWeight: 600 }}>
        <div>
          Checked By:{" "}
          <input
            type="text"
            required
            value={checkedBy}
            onChange={(e) => setCheckedBy(e.target.value)}
            style={footerInput}
          />
        </div>
        <div>
          Verified By:{" "}
          <input
            type="text"
            required
            value={verifiedBy}
            onChange={(e) => setVerifiedBy(e.target.value)}
            style={footerInput}
          />
        </div>
      </div>

      {/* Save */}
      <div style={{ textAlign: "center", marginTop: "1.5rem" }}>
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

const btn = {
  padding: "8px 12px",
  borderRadius: 8,
  border: "1px solid #e5e7eb",
  background: "#fff",
  cursor: "pointer",
  fontWeight: 700,
};

const btnDanger = {
  padding: "6px 10px",
  borderRadius: 6,
  border: "1px solid #fecaca",
  background: "#fee2e2",
  color: "#991b1b",
  cursor: "pointer",
  fontWeight: 700,
};
