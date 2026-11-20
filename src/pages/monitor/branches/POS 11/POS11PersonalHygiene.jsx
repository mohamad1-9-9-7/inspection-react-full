// src/pages/monitor/branches/POS 11/POS11PersonalHygiene.jsx
// Personal Hygiene input — POS 11 (Al Ain Butchery)
// يحفظ بنفس أسلوب التقارير عبر /api/reports مع تمييز الفرع (POS 11)
//
// Quick entry: staff rows come from Settings → Staff Directory ("POS 11 ·
// Personal Hygiene"), C/NC is one tap per cell with an "All C" button,
// Checked By is the supervisor's employee number (name locked from the
// directory), and the date's saved report re-opens here for editing.

import React, { useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useStaffDirectory, normalizeEmpNo } from "../_shared/staffRegistry";
import { useCheckedBy, CheckedByField } from "../pos19/_shared/pos19EntryKit";
import {
  useDayReport, DayStatus, CycleCell, fillEmpty, FillAllButton, todayDubai,
  useEmployeeFinder, nameForEmpNo, unknownEmpErrors, LockedName,
} from "../_shared/hygieneEntryKit";

const TYPE = "pos11_personal_hygiene";
const FORM_KEY = "pos11_personal_hygiene";
const START_ROWS = 9;

const columns = [
  "Nails",
  "Hair",
  "Not wearing Jewelry",
  "Wearing Clean Cloth/Hair Net/Hand Glove/Face masks/Shoe",
  "Communicable Disease",
  "Open wounds/sores & cut",
];

const makeRow = (name = "", empNo = "") => ({
  empNo,
  name,
  ...Object.fromEntries(columns.map((c) => [c, ""])),
  remarks: "",
});
const blankRows = () => Array.from({ length: START_ROWS }, () => makeRow());
const hasName = (r) => !!String(r?.name || "").trim();
const isBlankRow = (r) =>
  !hasName(r) &&
  !String(r?.empNo || "").trim() &&
  !String(r?.remarks || "").trim() &&
  columns.every((c) => !String(r?.[c] || "").trim());

export default function POS11PersonalHygiene() {
  const [searchParams] = useSearchParams();
  const branchFromURL = searchParams.get("branch");
  const branch = branchFromURL || "POS 11";

  const [date, setDate] = useState(todayDubai);
  const [entries, setEntries] = useState(blankRows);
  const [verifiedBy, setVerifiedBy] = useState("");
  const [saving, setSaving] = useState(false);

  /* ===== Staff directory: `roster` = people assigned to this sheet ===== */
  const directory = useStaffDirectory(FORM_KEY);
  const { roster, staff: allStaff, loading: staffLoading, online: staffOnline, byNo } = directory;
  // The name is locked: it comes only from the employee number.
  const findEmp = useEmployeeFinder(byNo);
  const sig = useCheckedBy(directory);

  const rosterRows = () =>
    roster.length ? roster.map((s) => makeRow(s.name || "", s.empNo || "")) : blankRows();

  const day = useDayReport({
    type: TYPE,
    reporter: "pos11",
    date,
    onLoad: (p) => {
      const list = Array.isArray(p.entries) ? p.entries.map((e) => ({ ...makeRow(), ...e })) : [];
      setEntries(list.length ? list : rosterRows());
      setVerifiedBy(p.verifiedBy || p.verifiedByQA || "");
      sig.load({ ...p, checkedBy: p.checkedBy || p.checkedBySupervisor || "" });
    },
    onBlank: () => {
      setEntries(rosterRows());
      setVerifiedBy("");
      sig.reset();
    },
  });

  /* Seed from the directory once — only while nothing is typed and no saved
     report was opened, so a late reply never wipes work in progress. */
  const seededRef = useRef(false);
  useEffect(() => {
    if (seededRef.current || staffLoading || day.loading) return;
    seededRef.current = true;
    if (!roster.length || day.editing) return;
    setEntries((prev) => (prev.every(isBlankRow) ? rosterRows() : prev));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roster, staffLoading, day.loading, day.editing]);

  const loadRoster = () => {
    if (!roster.length) return;
    const typed = entries.some(
      (e) => !isBlankRow(e) && !roster.some((s) => normalizeEmpNo(s.empNo) === normalizeEmpNo(e.empNo))
    );
    if (typed && !window.confirm("Replace the rows with the staff list from the directory?")) return;
    setEntries(rosterRows());
  };

  const handleChange = (rowIndex, field, value) =>
    setEntries((prev) => {
      const next = [...prev];
      const row = next[rowIndex] || makeRow();
      // The name is locked to the employee number (unknown number → no name).
      if (field === "empNo") {
        next[rowIndex] = { ...row, empNo: value, name: nameForEmpNo(findEmp, value) };
      } else {
        next[rowIndex] = { ...row, [field]: value };
      }
      return next;
    });

  const addRow = () => setEntries((p) => [...p, makeRow()]);
  const removeRow = (i) => setEntries((p) => (p.length > 1 ? p.filter((_, idx) => idx !== i) : p));
  const markAll = () => setEntries((p) => fillEmpty(p, columns, "C", hasName));

  const handleSave = async () => {
    const errs = [];
    if (!date) errs.push("Please select a date.");
    errs.push(...sig.errors);
    errs.push(...unknownEmpErrors(entries, findEmp, staffLoading));
    if (!verifiedBy.trim()) errs.push("Verified By is required.");
    const filled = entries.filter((e) => !isBlankRow(e));
    if (!filled.length) errs.push("Add at least one employee.");
    if (filled.some((e) => !hasName(e))) errs.push("Every filled row needs an employee name.");
    if (errs.length) {
      alert("⚠️ " + errs.join("\n"));
      return;
    }

    setSaving(true);
    try {
      await day.save(
        {
          branch, // ✅ POS 11 (أو من الـ URL)
          reportDate: date,
          entries: filled,
          ...sig.fields(),
          verifiedBy,
        },
        `POS 11 Personal Hygiene ${date}`
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ padding: "1rem", background: "#fff", borderRadius: 12 }}>
      {/* ===== ترويسة موحدة AL MAWASHI — بدون تاريخ داخل الترويسة ===== */}
      <table
        style={{
          width: "100%",
          borderCollapse: "collapse",
          marginBottom: "0.5rem",
          fontSize: "0.9rem",
          border: "1px solid #9aa4ae",
          background: "#f8fbff",
        }}
      >
        <tbody>
          <tr>
            <td
              rowSpan={4}
              style={{
                border: "1px solid #9aa4ae",
                padding: "8px",
                width: 120,
                textAlign: "center",
              }}
            >
              <div style={{ fontWeight: 900, color: "#a00", lineHeight: 1.1 }}>
                AL
                <br />
                MAWASHI
              </div>
            </td>
            <td style={tdHeader2}>
              <b>Document Title:</b> Personal Hygiene Check List
            </td>
            <td style={tdHeader2}>
              <b>Document No:</b> FS-QM/REC/PH
            </td>
          </tr>
          <tr>
            <td style={tdHeader2}>
              <b>Issue Date:</b> 05/02/2020
            </td>
            <td style={tdHeader2}>
              <b>Revision No:</b> 0
            </td>
          </tr>
          <tr>
            {/* ✅ إبقاء "Area" فقط ضمن الترويسة كبيان ثابت، بدون تاريخ */}
            <td style={tdHeader2} colSpan={2}>
              <b>Area:</b> {branch}
            </td>
          </tr>
          <tr>
            <td style={tdHeader2}>
              <b>Controlling Officer:</b> Quality Controller
            </td>
            <td style={tdHeader2}>
              <b>Approved By:</b> Hussam O.Sarhan
            </td>
          </tr>
        </tbody>
      </table>

      <div
        style={{
          textAlign: "center",
          background: "#dde3e9",
          fontWeight: 700,
          padding: "6px 4px",
          border: "1px solid #9aa4ae",
          borderTop: "none",
          marginBottom: "0.75rem",
        }}
      >
        PERSONAL HYGIENE CHECKLIST — {branch}
      </div>

      {/* ✅ Date خارج الترويسة */}
      <div style={{ marginBottom: "0.5rem", display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
        <strong>Date:</strong>
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
        <DayStatus day={day} />
      </div>

      {/* Toolbar */}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center", marginBottom: "0.5rem" }}>
        <FillAllButton onClick={markAll} label="All C" title="Mark every empty cell C for the named staff (NC stays)" />
        <button
          type="button"
          onClick={loadRoster}
          disabled={staffLoading || !roster.length}
          style={toolBtn}
          title="Fill the rows with the staff assigned to POS 11 in the Staff Directory"
        >
          👥 Load staff list{roster.length ? ` (${roster.length})` : ""}
        </button>
        <button type="button" onClick={addRow} style={toolBtn}>+ Add row</button>
      </div>
      {!staffLoading && roster.length === 0 && (
        <div style={hintBox}>
          👥 No staff assigned yet — add them in Settings → Staff Directory (form “POS 11 · Personal Hygiene”).
          You can still type names or employee numbers.
        </div>
      )}
      {!staffLoading && !staffOnline && <div style={hintBox}>📴 Offline — showing the last saved staff list.</div>}

      <datalist id="pos11-ph-empno">
        {allStaff.map((s) => <option key={`n-${s.empNo}`} value={s.empNo}>{s.name}</option>)}
      </datalist>

      {/* Table */}
      <div style={{ overflowX: "auto" }}>
        <table
          style={{
            width: "100%",
            borderCollapse: "collapse",
            tableLayout: "fixed",
            minWidth: 1100,
          }}
        >
          <thead>
            <tr style={{ background: "#2980b9", color: "#fff" }}>
              <th style={{ ...thStyle, width: "50px" }}>S.No</th>
              <th style={{ ...thStyle, width: "90px" }}>Emp. No</th>
              <th style={{ ...thStyle, width: "170px" }}>Employee Name 🔒</th>
              {columns.map((col, i) => (
                <th key={i} style={{ ...thStyle, width: "110px" }}>
                  {col}
                </th>
              ))}
              <th style={{ ...thStyle, width: "230px" }}>
                Remarks and Corrective Actions
              </th>
              <th style={{ ...thStyle, width: "44px" }} />
            </tr>
          </thead>
          <tbody>
            {entries.map((entry, i) => (
              <tr key={i}>
                <td style={tdStyle}>{i + 1}</td>
                <td style={tdStyle}>
                  <input
                    type="text"
                    inputMode="numeric"
                    list="pos11-ph-empno"
                    placeholder="No."
                    value={entry.empNo || ""}
                    onChange={(e) => handleChange(i, "empNo", e.target.value)}
                    style={inputStyle}
                  />
                </td>
                <td style={tdStyle}>
                  <LockedName
                    name={entry.name}
                    empNo={entry.empNo}
                    unknown={!!String(entry.empNo ?? "").trim() && !staffLoading && !findEmp(entry.empNo)}
                  />
                </td>
                {columns.map((col, cIndex) => (
                  <td key={cIndex} style={tdStyle}>
                    <CycleCell value={entry[col]} onChange={(v) => handleChange(i, col, v)} />
                  </td>
                ))}
                <td style={tdStyle}>
                  <input
                    type="text"
                    value={entry.remarks}
                    onChange={(e) => handleChange(i, "remarks", e.target.value)}
                    style={inputStyle}
                  />
                </td>
                <td style={tdStyle}>
                  <button type="button" onClick={() => removeRow(i)} title="Remove row" style={rmBtn}>×</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Remarks footer */}
      <div style={{ marginTop: "1rem", fontWeight: "600" }}>
        REMARKS / CORRECTIVE ACTIONS:
      </div>

      {/* C / NC note */}
      <div style={{ marginTop: "0.5rem", fontSize: "0.9rem" }}>
        *(C – Conform &nbsp;&nbsp;&nbsp; N/C – Non Conform) — tap a cell: C → NC → empty
      </div>

      {/* Checked / Verified */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginTop: "1rem",
          fontWeight: 600,
          gap: "1rem",
          flexWrap: "wrap",
        }}
      >
        <CheckedByField sig={sig} label="Checked By:" />
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
          disabled={saving || day.loading}
          style={{
            padding: "10px 18px",
            background: "linear-gradient(180deg,#10b981,#059669)",
            color: "#fff",
            border: "none",
            borderRadius: "8px",
            cursor: saving || day.loading ? "not-allowed" : "pointer",
            opacity: saving || day.loading ? 0.7 : 1,
            fontWeight: 600,
          }}
        >
          {saving ? "⏳ Saving..." : day.editing ? "💾 Update Report" : "💾 Save Report"}
        </button>
      </div>

      {day.msg && !day.loading && (
        <div style={{ marginTop: "1rem", fontWeight: "600", textAlign: "center" }}>{day.msg}</div>
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

const inputStyle = {
  padding: "4px 6px",
  borderRadius: "4px",
  border: "1px solid #aaa",
  width: "100%",
  boxSizing: "border-box",
};

const toolBtn = {
  padding: "8px 14px",
  background: "#fff",
  color: "#0f172a",
  border: "1px solid #cbd5e1",
  borderRadius: 8,
  fontWeight: 700,
  cursor: "pointer",
};

const hintBox = {
  fontSize: "0.85rem",
  color: "#475569",
  background: "#f8fafc",
  border: "1px dashed #cbd5e1",
  borderRadius: 8,
  padding: "6px 10px",
  marginBottom: "0.5rem",
};

const rmBtn = {
  width: 30,
  height: 28,
  border: "1px solid #ef4444",
  background: "#fef2f2",
  color: "#b91c1c",
  borderRadius: 6,
  fontWeight: 800,
  cursor: "pointer",
};

const footerInput = {
  border: "1px solid #aaa",
  borderRadius: "6px",
  padding: "4px 6px",
  minWidth: "160px",
};

// ترويسة موحدة (ثابتة بدون تاريخ)
const tdHeader2 = {
  border: "1px solid #9aa4ae",
  padding: "6px 8px",
  verticalAlign: "middle",
};
