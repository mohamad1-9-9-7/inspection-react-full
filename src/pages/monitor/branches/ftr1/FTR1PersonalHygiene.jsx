// src/pages/monitor/branches/ftr1/FTR1PersonalHygiene.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import CncToggle from "../_shared/CncToggle";
import CreatorBadge from "./CreatorBadge";
import { getCurrentUser } from "../../../../utils/perms";
import {
  COMPANY_DIRECTORY,
  normalizeEmpNo,
  useStaffDirectory,
} from "../_shared/staffRegistry";

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
 * ✅ Employee No.: typing it looks the person up (Staff Directory, then the
 *    company directory) and fills the name. The name is LOCKED — it can only
 *    come from a known employee number; an unknown number blocks the save.
 */

/** The registry entry this sheet reads (staffRegistry.STAFF_FORMS). */
const PH_FORM_KEY = "ftr1_personal_hygiene";
const COMPANY_BY_NO = new Map(COMPANY_DIRECTORY.map((d) => [normalizeEmpNo(d.empNo), d]));

const HYGIENE_COLUMNS = [
  "Nails",
  "Hair",
  "Not wearing Jewelry",
  "Wearing Clean Cloth/Hair Net/Hand Glove/Face masks/Shoe",
];

const YESNO = ["", "Yes", "No"];

const makeEmptyRow = () => ({
  empNo: "",
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

/** The logged-in account — recorded as the report's creator. */
function currentAccount() {
  const u = getCurrentUser() || {};
  return {
    name: norm(u.displayName || u.name || u.username),
    username: norm(u.username),
  };
}


export default function FTR1PersonalHygiene() {
  const [date, setDate] = useState("");
  const [entries, setEntries] = useState(Array.from({ length: 9 }, makeEmptyRow));
  const [checkedBy, setCheckedBy] = useState("");
  const [verifiedByQA, setVerifiedByQA] = useState("");
  const [opMsg, setOpMsg] = useState("");

  const { roster, loading: staffLoading, byNo } = useStaffDirectory(PH_FORM_KEY);
  const creator = useMemo(currentAccount, []);

  const findEmployee = (empNo) => {
    const key = normalizeEmpNo(empNo);
    if (!key) return null;
    return byNo.get(key) || COMPANY_BY_NO.get(key) || null;
  };

  // Pre-fill the sheet once with the people assigned to this form, as long as
  // nobody has typed into it yet.
  const seededRef = useRef(false);
  useEffect(() => {
    if (seededRef.current || staffLoading) return;
    seededRef.current = true;
    if (!roster.length) return;
    setEntries((prev) => {
      if (prev.some((r) => norm(r.empNo) || norm(r.name))) return prev;
      const rows = roster.map((s) => ({ ...makeEmptyRow(), empNo: s.empNo, name: s.name }));
      while (rows.length < prev.length) rows.push(makeEmptyRow());
      return rows;
    });
  }, [roster, staffLoading]);

  const addRow = () => setEntries((prev) => [...prev, makeEmptyRow()]);
  // Removing a draft line is editing the sheet, not deleting saved data — so
  // it is open to everyone and carries no data-delete-action.
  const removeRow = (rowIndex) =>
    setEntries((prev) => (prev.length > 1 ? prev.filter((_, i) => i !== rowIndex) : prev));

  const handleChange = (rowIndex, field, value) => {
    const updated = [...entries];
    updated[rowIndex] = { ...updated[rowIndex], [field]: value };

    // The name is locked: it comes only from the Employee No. An unknown
    // number leaves the name empty (and the row is flagged).
    if (field === "empNo") {
      const match = findEmployee(value);
      updated[rowIndex].name = match ? match.name : "";
    }

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
      if (!staffLoading && norm(r.empNo) && !findEmployee(r.empNo))
        errs.push(`Row ${idx + 1}: Employee No. "${norm(r.empNo)}" was not found in the Staff Directory.`);

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [date, checkedBy, verifiedByQA, entries, staffLoading, byNo]);

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
        // blank lines are left out of the saved sheet
        entries: entries.filter((r) => norm(r.empNo) || norm(r.name)),
        checkedBy: norm(checkedBy),
        verifiedByQA: norm(verifiedByQA),

        // the account that filled the sheet in (may differ from Checked By)
        createdBy: creator.name,
        createdByUser: creator.username,

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

      {/* Date + who is creating the report (the logged-in account — not
          necessarily the supervisor who signs Checked By) */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
          flexWrap: "wrap",
          marginBottom: "0.75rem",
        }}
      >
        <div>
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
        <CreatorBadge name={creator.name} />
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

      {/* Table — scrolls sideways inside its own frame instead of squeezing columns */}
      <div style={tableFrame}>
        <table style={tableStyle}>
          <colgroup>
            <col style={{ width: 52 }} />
            <col style={{ width: 120 }} />
            <col style={{ width: 210 }} />
            {HYGIENE_COLUMNS.map((col) => (
              <col key={col} style={{ width: col.startsWith("Wearing") ? 220 : 170 }} />
            ))}
            <col style={{ width: 130 }} />
            <col style={{ width: 130 }} />
            <col style={{ width: 130 }} />
            <col style={{ width: 180 }} />
            <col style={{ width: 260 }} />
            <col style={{ width: 52 }} />
          </colgroup>
          <thead>
            <tr>
              <th style={thStyle}>S.No</th>
              <th style={thStyle}>Employee No.</th>
              <th style={thStyle}>Employee Name 🔒</th>
              {HYGIENE_COLUMNS.map((col) => (
                <th key={col} style={thStyle}>{col}</th>
              ))}
              <th style={thStyle}>Fit for Food Handling?<br /><span style={thSub}>(Yes/No)</span></th>
              <th style={thStyle}>If No: Communicable disease<br /><span style={thSub}>(Yes/No)</span></th>
              <th style={thStyle}>If No: Open wound<br /><span style={thSub}>(Yes/No)</span></th>
              <th style={thStyle}>If No: Other</th>
              <th style={thStyle}>Remarks and Corrective Actions</th>
              <th style={thStyle} aria-label="Remove row"></th>
            </tr>
          </thead>

          <tbody>
            {entries.map((entry, i) => {
              const fit = norm(entry.fitForFoodHandling);
              const isNo = fit === "No";
              const unknownNo = !!norm(entry.empNo) && !staffLoading && !findEmployee(entry.empNo);
              const rowBg = i % 2 ? "#f8fafc" : "#fff";

              return (
                <tr key={i} style={{ background: rowBg }}>
                  <td style={{ ...tdStyle, color: "#64748b", fontWeight: 700 }}>{i + 1}</td>

                  <td style={tdStyle}>
                    <input
                      type="text"
                      inputMode="numeric"
                      placeholder="Emp. No."
                      value={entry.empNo || ""}
                      onChange={(e) => handleChange(i, "empNo", e.target.value)}
                      style={{
                        ...inputStyle,
                        textAlign: "center",
                        fontWeight: 700,
                        borderColor: unknownNo ? "#ef4444" : inputStyle.borderColor,
                        background: unknownNo ? "#fef2f2" : "#fff",
                      }}
                      title={unknownNo ? "Employee number not found in the Staff Directory" : ""}
                    />
                  </td>

                  {/* 🔒 Name is locked — filled only from the employee number */}
                  <td style={tdStyle}>
                    <input
                      type="text"
                      readOnly
                      tabIndex={-1}
                      value={entry.name}
                      placeholder={unknownNo ? "Not found" : "Enter Emp. No."}
                      title={entry.name || "Filled automatically from the employee number"}
                      style={{
                        ...inputStyle,
                        ...lockedStyle,
                        color: entry.name ? "#0f172a" : unknownNo ? "#dc2626" : "#94a3b8",
                      }}
                    />
                  </td>

                  {/* ✅ نظافة عامة (C/NC) — زرّين بدل القائمة */}
                  {HYGIENE_COLUMNS.map((col) => (
                    <td key={col} style={tdStyle}>
                      <CncToggle value={entry[col]} onChange={(v) => handleChange(i, col, v)} minWidth={0} />
                    </td>
                  ))}

                  {/* ✅ Fit Yes/No */}
                  <td style={tdStyle}>
                    <select
                      value={entry.fitForFoodHandling}
                      onChange={(e) => handleChange(i, "fitForFoodHandling", e.target.value)}
                      style={{
                        ...inputStyle,
                        borderColor: !fit && norm(entry.name) ? "#ef4444" : inputStyle.borderColor,
                      }}
                    >
                      {YESNO.map((v) => (
                        <option key={v} value={v}>{v || "--"}</option>
                      ))}
                    </select>
                  </td>

                  {/* ✅ If No reasons */}
                  {["reasonCommunicableDisease", "reasonOpenWound"].map((field) => (
                    <td key={field} style={tdStyle}>
                      <select
                        value={entry[field]}
                        onChange={(e) => handleChange(i, field, e.target.value)}
                        disabled={!isNo}
                        style={{ ...inputStyle, ...(!isNo ? disabledStyle : null) }}
                      >
                        {YESNO.map((v) => (
                          <option key={v} value={v}>{v || "--"}</option>
                        ))}
                      </select>
                    </td>
                  ))}

                  <td style={tdStyle}>
                    <input
                      type="text"
                      value={entry.reasonOther}
                      onChange={(e) => handleChange(i, "reasonOther", e.target.value)}
                      disabled={!isNo}
                      placeholder={!isNo ? "" : "Other reason..."}
                      style={{ ...inputStyle, ...(!isNo ? disabledStyle : null) }}
                    />
                  </td>

                  {/* ✅ Corrective action required if No */}
                  <td style={tdStyle}>
                    <input
                      type="text"
                      value={entry.remarks}
                      onChange={(e) => handleChange(i, "remarks", e.target.value)}
                      placeholder={isNo ? "Required: transfer / exclude / clinic" : ""}
                      style={{
                        ...inputStyle,
                        borderColor: isNo && !norm(entry.remarks) ? "#ef4444" : inputStyle.borderColor,
                      }}
                    />
                  </td>

                  <td style={tdStyle}>
                    <button
                      type="button"
                      title="Remove row"
                      onClick={() => removeRow(i)}
                      disabled={entries.length <= 1}
                      style={{
                        width: 32,
                        height: 32,
                        borderRadius: 8,
                        border: "1px solid #fecaca",
                        color: "#ef4444",
                        background: "#fff",
                        cursor: entries.length <= 1 ? "not-allowed" : "pointer",
                        opacity: entries.length <= 1 ? 0.4 : 1,
                      }}
                    >
                      ✖
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div style={{ marginTop: "0.5rem" }}>
        <button
          type="button"
          onClick={addRow}
          style={{
            padding: "6px 14px",
            borderRadius: 8,
            border: "1px solid #2980b9",
            color: "#2980b9",
            background: "#fff",
            fontWeight: 700,
            cursor: "pointer",
          }}
        >
          ＋ Add row
        </button>
      </div>

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
                  : "#cbd5e1",
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

const tableFrame = {
  width: "100%",
  overflowX: "auto",
  border: "1px solid #dbe3ee",
  borderRadius: 12,
  boxShadow: "0 1px 3px rgba(15,23,42,.06)",
};

const tableStyle = {
  width: "100%",
  minWidth: 1900,
  borderCollapse: "collapse",
  tableLayout: "fixed",
};

const thStyle = {
  padding: "10px 8px",
  background: "#2980b9",
  color: "#fff",
  border: "1px solid #2472a4",
  textAlign: "center",
  verticalAlign: "middle",
  fontWeight: 700,
  lineHeight: 1.3,
  whiteSpace: "normal",
  wordBreak: "break-word",
};

const thSub = { fontWeight: 500, opacity: 0.85 };

const tdStyle = {
  padding: "8px",
  height: 52,
  border: "1px solid #e2e8f0",
  textAlign: "center",
  verticalAlign: "middle",
};

const tdHeader = {
  border: "1px solid #ccc",
  padding: "6px 10px",
};

const inputStyle = {
  display: "block",
  width: "100%",
  height: 36,
  boxSizing: "border-box",
  padding: "0 10px",
  borderRadius: 8,
  borderWidth: 1,
  borderStyle: "solid",
  borderColor: "#cbd5e1",
  background: "#fff",
};

const lockedStyle = {
  background: "#f1f5f9",
  borderColor: "#e2e8f0",
  textAlign: "left",
  fontWeight: 600,
  cursor: "not-allowed",
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
};

const disabledStyle = {
  background: "#f1f5f9",
  borderColor: "#e2e8f0",
  cursor: "not-allowed",
};

const footerInput = {
  borderWidth: 1,
  borderStyle: "solid",
  borderColor: "#cbd5e1",
  borderRadius: 8,
  height: 36,
  boxSizing: "border-box",
  padding: "0 10px",
  minWidth: 220,
};
