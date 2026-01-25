// src/pages/monitor/branches/ftr1/FTR1PersonalHygiene.jsx
import React, { useMemo, useState } from "react";

const API_BASE =
  process.env.REACT_APP_API_URL || "https://inspection-server-4nvj.onrender.com";

/**
 * ✅ FTR 1 = MUSH RIF PARK
 * ✅ Area = QA ثابت (موجود فقط في الهيدر + ضمن الـ payload)
 * ✅ الأعمدة الحساسة:
 *    Fit for Food Handling? (Yes/No)
 *    If No: Reason (Communicable disease Yes/No + Open wound Yes/No + Other)
 * ✅ منع الحفظ إذا Fit=No بدون Corrective Action
 * ✅ Verified by (QA) لازم مستقل عن Checked By
 * ✅ ملاحظة: Checked By من قبل مشرف الفرع الحاصل على شهادة PIC
 * ✅ حذف Area badge اللي كانت طالعة لحالها على الطرف
 */

const HYGIENE_COLUMNS = [
  "Nails",
  "Hair",
  "Not wearing Jewelry",
  "Wearing Clean Cloth/Hair Net/Hand Glove/Face masks/Shoe",
];

const YESNO = ["", "Yes", "No"];

const makeEmptyRow = () => ({
  name: "",
  Nails: "",
  Hair: "",
  "Not wearing Jewelry": "",
  "Wearing Clean Cloth/Hair Net/Hand Glove/Face masks/Shoe": "",

  fitForFoodHandling: "", // Yes/No
  reasonCommunicableDisease: "", // Yes/No (if No)
  reasonOpenWound: "", // Yes/No (if No)
  reasonOther: "", // text (if No)

  remarks: "", // Remarks and Corrective Actions (Required if fit = No)
});

function norm(s) {
  return String(s ?? "").trim();
}

export default function FTR1PersonalHygiene() {
  const [date, setDate] = useState("");
  const [entries, setEntries] = useState(Array.from({ length: 9 }, makeEmptyRow));
  const [checkedBy, setCheckedBy] = useState("");
  const [verifiedByQA, setVerifiedByQA] = useState("");
  const [opMsg, setOpMsg] = useState("");

  const handleChange = (rowIndex, field, value) => {
    const updated = [...entries];
    updated[rowIndex] = { ...updated[rowIndex], [field]: value };

    // ✅ إذا Fit = Yes امسح أسباب الـ No
    if (field === "fitForFoodHandling" && value === "Yes") {
      updated[rowIndex].reasonCommunicableDisease = "";
      updated[rowIndex].reasonOpenWound = "";
      updated[rowIndex].reasonOther = "";
    }

    setEntries(updated);
  };

  const validationErrors = useMemo(() => {
    const errs = [];

    if (!date) errs.push("Please select a date.");
    if (!norm(checkedBy)) errs.push("Checked By is required.");
    if (!norm(verifiedByQA)) errs.push("Verified by (QA) is required.");

    // ✅ لازم يكون QA مستقل (منع إذا نفس الشخص)
    if (norm(checkedBy) && norm(verifiedByQA)) {
      if (norm(checkedBy).toLowerCase() === norm(verifiedByQA).toLowerCase()) {
        errs.push(
          "Verified by (QA) must be independent (cannot be the same as Checked By)."
        );
      }
    }

    // ✅ تحقق على الصفوف اللي فيها اسم
    entries.forEach((r, idx) => {
      const hasName = !!norm(r.name);
      if (!hasName) return;

      if (!norm(r.fitForFoodHandling))
        errs.push(`Row ${idx + 1}: Fit for Food Handling? is required.`);

      if (norm(r.fitForFoodHandling) === "No") {
        const cd = norm(r.reasonCommunicableDisease);
        const ow = norm(r.reasonOpenWound);
        const other = norm(r.reasonOther);

        if (!(cd === "Yes" || ow === "Yes" || other))
          errs.push(
            `Row ${idx + 1}: If Fit is No, select a reason (Communicable disease / Open wound) or write Other.`
          );

        if (!norm(r.remarks))
          errs.push(
            `Row ${idx + 1}: Corrective Action is required when Fit is No (transfer/exclude/clinic).`
          );
      }
    });

    return errs;
  }, [date, checkedBy, verifiedByQA, entries]);

  const handleSave = async () => {
    if (validationErrors.length) {
      alert("⚠️ Please fix:\n\n- " + validationErrors.join("\n- "));
      return;
    }

    try {
      setOpMsg("⏳ Saving...");

      const payload = {
        branch: "FTR 1",
        reportDate: date,
        area: "QA",
        entries,
        checkedBy: norm(checkedBy),
        verifiedByQA: norm(verifiedByQA),

        // ✅ ملاحظة مطلوبة
        checkedByNote:
          "Checked By was conducted by the branch supervisor who holds a valid PIC certificate.",

        savedAt: Date.now(),
      };

      const res = await fetch(`${API_BASE}/api/reports`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reporter: "ftr1",
          type: "ftr1_personal_hygiene",
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
      <table
        style={{ width: "100%", borderCollapse: "collapse", marginBottom: "1rem" }}
      >
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
              <strong>Area:</strong> QA
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

      {/* Title (✅ مشرف) */}
      <h3
        style={{
          textAlign: "center",
          background: "#e5e7eb",
          padding: "6px",
          marginBottom: "0.5rem",
        }}
      >
        AL MAWASHI BRAAI MUSH RIF
        <br />
        PERSONAL HYGIENE CHECKLIST FTR-1
      </h3>

      {/* Date فقط (بدون Area badge) */}
      <div style={{ marginBottom: "0.75rem" }}>
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

      {/* ✅ PIC note */}
      <div
        style={{
          marginBottom: "10px",
          padding: "10px",
          borderRadius: 10,
          border: "1px solid #cbd5e1",
          background: "#f8fafc",
          fontWeight: 600,
          color: "#0f172a",
        }}
      >
        Note: Checked By was conducted by the branch supervisor who holds a valid PIC
        certificate.
      </div>

      {/* Validation banner */}
      {validationErrors.length > 0 && (
        <div
          style={{
            background: "#fff7ed",
            border: "1px solid #fdba74",
            padding: "10px",
            borderRadius: 10,
            marginBottom: "10px",
            color: "#7c2d12",
            fontWeight: 600,
            whiteSpace: "pre-wrap",
          }}
        >
          ⚠️ Please fix before saving:
          {"\n"}- {validationErrors.join("\n- ")}
        </div>
      )}

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
            <th style={{ ...thStyle, width: "160px" }}>Employee Name</th>

            {HYGIENE_COLUMNS.map((col, i) => (
              <th key={i} style={{ ...thStyle, width: "120px" }}>
                {col}
              </th>
            ))}

            <th style={{ ...thStyle, width: "150px" }}>
              Fit for Food Handling?
              <br />
              (Yes/No)
            </th>
            <th style={{ ...thStyle, width: "140px" }}>
              If No: Communicable disease
              <br />
              (Yes/No)
            </th>
            <th style={{ ...thStyle, width: "140px" }}>
              If No: Open wound
              <br />
              (Yes/No)
            </th>
            <th style={{ ...thStyle, width: "170px" }}>If No: Other (text)</th>

            <th style={{ ...thStyle, width: "260px" }}>
              Remarks and Corrective Actions
            </th>
          </tr>
        </thead>

        <tbody>
          {entries.map((entry, i) => {
            const fit = norm(entry.fitForFoodHandling);
            const isNo = fit === "No";

            return (
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
                      maxWidth: "150px",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                    }}
                  />
                </td>

                {/* ✅ نظافة عامة (C/NC) مثل ما هو */}
                {HYGIENE_COLUMNS.map((col, cIndex) => (
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

                {/* ✅ Fit Yes/No */}
                <td style={tdStyle}>
                  <select
                    value={entry.fitForFoodHandling}
                    onChange={(e) =>
                      handleChange(i, "fitForFoodHandling", e.target.value)
                    }
                    style={{
                      ...inputStyle,
                      width: "100%",
                      borderColor: fit ? "#aaa" : "#ef4444",
                    }}
                  >
                    {YESNO.map((v) => (
                      <option key={v} value={v}>
                        {v || "--"}
                      </option>
                    ))}
                  </select>
                </td>

                {/* ✅ If No reasons */}
                <td style={tdStyle}>
                  <select
                    value={entry.reasonCommunicableDisease}
                    onChange={(e) =>
                      handleChange(i, "reasonCommunicableDisease", e.target.value)
                    }
                    disabled={!isNo}
                    style={{
                      ...inputStyle,
                      width: "100%",
                      background: !isNo ? "#f8fafc" : "#fff",
                    }}
                  >
                    {YESNO.map((v) => (
                      <option key={v} value={v}>
                        {v || "--"}
                      </option>
                    ))}
                  </select>
                </td>

                <td style={tdStyle}>
                  <select
                    value={entry.reasonOpenWound}
                    onChange={(e) =>
                      handleChange(i, "reasonOpenWound", e.target.value)
                    }
                    disabled={!isNo}
                    style={{
                      ...inputStyle,
                      width: "100%",
                      background: !isNo ? "#f8fafc" : "#fff",
                    }}
                  >
                    {YESNO.map((v) => (
                      <option key={v} value={v}>
                        {v || "--"}
                      </option>
                    ))}
                  </select>
                </td>

                <td style={tdStyle}>
                  <input
                    type="text"
                    value={entry.reasonOther}
                    onChange={(e) => handleChange(i, "reasonOther", e.target.value)}
                    disabled={!isNo}
                    placeholder={!isNo ? "" : "Other reason..."}
                    style={{
                      ...inputStyle,
                      width: "100%",
                      background: !isNo ? "#f8fafc" : "#fff",
                    }}
                  />
                </td>

                {/* ✅ Corrective action required if No */}
                <td style={tdStyle}>
                  <input
                    type="text"
                    value={entry.remarks}
                    onChange={(e) => handleChange(i, "remarks", e.target.value)}
                    placeholder={
                      isNo ? "Required if Fit is No (transfer/exclude/clinic)" : ""
                    }
                    style={{
                      ...inputStyle,
                      width: "100%",
                      borderColor: isNo && !norm(entry.remarks) ? "#ef4444" : "#aaa",
                    }}
                  />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {/* Remarks footer */}
      <div style={{ marginTop: "1rem", fontWeight: "600" }}>
        REMARKS / CORRECTIVE ACTIONS:
      </div>

      {/* Checked / Verified */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          gap: "12px",
          flexWrap: "wrap",
          marginTop: "1rem",
          fontWeight: 600,
        }}
      >
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
          Verified by (QA):{" "}
          <input
            type="text"
            required
            value={verifiedByQA}
            onChange={(e) => setVerifiedByQA(e.target.value)}
            style={{
              ...footerInput,
              borderColor:
                norm(checkedBy) &&
                norm(verifiedByQA) &&
                norm(checkedBy).toLowerCase() === norm(verifiedByQA).toLowerCase()
                  ? "#ef4444"
                  : "#aaa",
            }}
          />
        </div>
      </div>

      {/* Save */}
      <div style={{ textAlign: "center", marginTop: "1.5rem" }}>
        <button
          onClick={handleSave}
          style={{
            padding: "10px 18px",
            background: validationErrors.length
              ? "linear-gradient(180deg,#94a3b8,#64748b)"
              : "linear-gradient(180deg,#10b981,#059669)",
            color: "#fff",
            border: "none",
            borderRadius: "8px",
            cursor: "pointer",
            fontWeight: 600,
            opacity: validationErrors.length ? 0.85 : 1,
          }}
          title={validationErrors.length ? "Fix validation errors first" : "Save"}
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
  minWidth: "180px",
};
