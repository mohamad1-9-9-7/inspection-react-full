// src/pages/monitor/branches/pos 10/POS10PersonalHygiene.jsx
// Personal Hygiene input — POS 10
// يحفظ بنفس أسلوب التقارير عبر /api/reports مع تمييز الفرع (POS 10)
//
// Quick entry: staff rows come from Settings → Staff Directory ("POS 10 ·
// Personal Hygiene"), every C/NC and Yes/No cell is one tap, "All OK" marks
// the named staff C + Fit = Yes, Checked By is the supervisor's employee
// number (name locked from the directory), and the date's saved report
// re-opens here for editing instead of blocking the save.

import React, { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useStaffDirectory, normalizeEmpNo, normalizeName } from "../_shared/staffRegistry";
import { useCheckedBy, CheckedByField } from "../pos19/_shared/pos19EntryKit";
import { useDayReport, DayStatus, CycleCell, fillEmpty, FillAllButton, todayDubai } from "../_shared/hygieneEntryKit";

const HYGIENE_COLUMNS = [
  "Nails",
  "Hair",
  "Not wearing Jewelry",
  "Wearing Clean Cloth/Hair Net/Hand Glove/Face masks/Shoe",
];

// (ملاحظة: أزلنا أعمدة Communicable/Open wounds من الجدول واستبدلناها بمنطق FIT + Reason)
const TYPE = "pos10_personal_hygiene";
const FORM_KEY = "pos10_personal_hygiene";
const START_ROWS = 9;

const YES_NO = ["", "Yes", "No"];
// For the "If No" reasons a Yes is the finding, so Yes reads red.
const REASON_TONES = { Yes: "bad", No: "good" };

const norm = (s) => String(s ?? "").trim();
const low = (s) => norm(s).toLowerCase();

const makeRow = (name = "", empNo = "") => ({
  empNo,
  name,
  Nails: "",
  Hair: "",
  "Not wearing Jewelry": "",
  "Wearing Clean Cloth/Hair Net/Hand Glove/Face masks/Shoe": "",
  fitForFoodHandling: "",
  reasonCommunicableDisease: "",
  reasonOpenWound: "",
  reasonOther: "",
  remarks: "",
});
const blankRows = () => Array.from({ length: START_ROWS }, () => makeRow());
const hasName = (r) => !!norm(r?.name);
const isBlankRow = (r) =>
  !hasName(r) &&
  !norm(r?.empNo) &&
  !norm(r?.remarks) &&
  !norm(r?.reasonOther) &&
  [...HYGIENE_COLUMNS, "fitForFoodHandling", "reasonCommunicableDisease", "reasonOpenWound"].every((k) => !norm(r?.[k]));

export default function POS10PersonalHygiene() {
  const [searchParams] = useSearchParams();
  const branchFromURL = searchParams.get("branch");
  const branch = branchFromURL || "POS 10";

  // ✅ اسم الفرع/الوصف (ملحمة أبوظبي) بجانب POS 10
  const branchNameFromURL = searchParams.get("branchName");
  const branchLabel = useMemo(() => {
    const clean = String(branch || "").trim();
    const extra = String(branchNameFromURL || "").trim() || "Abu Dhabi Butchery";
    return `${clean} — ${extra}`;
  }, [branch, branchNameFromURL]);

  const [date, setDate] = useState(todayDubai);
  const [entries, setEntries] = useState(blankRows);

  // ✅ Checked By = مشرف الفرع (PIC) — رقم وظيفي ← الاسم | Verified by (QA) = كواليتي مستقل
  const [verifiedByQA, setVerifiedByQA] = useState("");
  const [saving, setSaving] = useState(false);

  /* ===== Staff directory: `roster` = people assigned to this sheet ===== */
  const directory = useStaffDirectory(FORM_KEY);
  const { roster, staff: allStaff, loading: staffLoading, online: staffOnline, byNo, byName } = directory;
  const sig = useCheckedBy(directory);
  const checkedBySupervisor = sig.name;

  const rosterRows = () =>
    roster.length ? roster.map((s) => makeRow(s.name || "", s.empNo || "")) : blankRows();

  const day = useDayReport({
    type: TYPE,
    reporter: "pos10",
    date,
    onLoad: (p) => {
      const list = Array.isArray(p.entries) ? p.entries.map((e) => ({ ...makeRow(), ...e })) : [];
      setEntries(list.length ? list : rosterRows());
      setVerifiedByQA(p.verifiedByQA || p.verifiedBy || "");
      sig.load({
        checkedBy: p.checkedBySupervisor || p.checkedBy || "",
        checkedByEmpNo: p.checkedBySupervisorEmpNo || p.checkedByEmpNo || "",
      });
    },
    onBlank: () => {
      setEntries(rosterRows());
      setVerifiedByQA("");
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
      // Either identifier fills the other straight from the directory.
      if (field === "empNo") {
        const m = byNo.get(normalizeEmpNo(value));
        next[rowIndex] = m ? { ...row, empNo: value, name: m.name } : { ...row, empNo: value };
      } else if (field === "name") {
        const m = byName.get(normalizeName(value));
        next[rowIndex] = m ? { ...row, name: value, empNo: m.empNo } : { ...row, name: value };
      } else {
        next[rowIndex] = { ...row, [field]: value };
      }
      return next;
    });

  const addRow = () => setEntries((p) => [...p, makeRow()]);
  const removeRow = (i) => setEntries((p) => (p.length > 1 ? p.filter((_, idx) => idx !== i) : p));
  // "All OK": C on the four checks + Fit = Yes, for named staff; anything marked stays.
  const markAll = () =>
    setEntries((p) => fillEmpty(fillEmpty(p, HYGIENE_COLUMNS, "C", hasName), ["fitForFoodHandling"], "Yes", hasName));

  // ✅ Validation واضح قبل الحفظ
  const validationErrors = useMemo(() => {
    const errs = [];

    if (!date) errs.push("Please select a date.");
    sig.errors.forEach((e) => errs.push(e.replace(/^Checked by/, "Checked By (Branch Supervisor - PIC)")));
    if (!norm(verifiedByQA)) errs.push("Verified by (QA) is required.");

    if (norm(checkedBySupervisor) && norm(verifiedByQA) && low(checkedBySupervisor) === low(verifiedByQA)) {
      errs.push("Verified by (QA) must be independent (cannot be the same as Checked By).");
    }

    entries.forEach((e, idx) => {
      if (!norm(e?.name)) return;

      if (!norm(e?.fitForFoodHandling)) {
        errs.push(`Row ${idx + 1}: Fit for Food Handling? (Yes/No) is required.`);
        return;
      }

      const isNo = low(e.fitForFoodHandling) === "no";
      if (isNo) {
        const cd = norm(e.reasonCommunicableDisease);
        const ow = norm(e.reasonOpenWound);
        const other = norm(e.reasonOther);
        const remarks = norm(e.remarks);

        if (!cd && !ow && !other) {
          errs.push(`Row ${idx + 1}: If Fit = No, select a reason (Communicable/Open wound) or write Other.`);
        }
        if (!remarks) {
          errs.push(`Row ${idx + 1}: If Fit = No, Remarks/Corrective Action is required (transfer/exclude/action).`);
        }
      }
    });

    return errs;
  }, [date, sig.errors, checkedBySupervisor, verifiedByQA, entries]);

  const handleSave = async () => {
    if (validationErrors.length) {
      alert("⚠️ Please fix:\n\n- " + validationErrors.join("\n- "));
      return;
    }
    const filled = entries.filter((e) => !isBlankRow(e));
    if (!filled.length) {
      alert("⚠️ Add at least one employee.");
      return;
    }
    if (filled.some((e) => !hasName(e))) {
      alert("⚠️ Every filled row needs an employee name.");
      return;
    }

    const signed = sig.fields();
    setSaving(true);
    try {
      await day.save(
        {
          branch, // ✅ POS 10 (أو من الـ URL)
          branchLabel, // ✅ POS 10 — Abu Dhabi Butchery
          reportDate: date,
          area: "QA",

          // ✅ الأدوار كما طلبت
          checkedBySupervisor: signed.checkedBy,
          checkedBySupervisorEmpNo: signed.checkedByEmpNo,
          verifiedByQA: norm(verifiedByQA),

          // ✅ ملاحظات ثابتة
          checkedByNote:
            "Checked By was conducted by the branch supervisor who holds a valid PIC certificate.",
          electronicApprovalNote:
            "This report is electronically approved; no signature is required.",

          entries: filled,
        },
        `POS 10 Personal Hygiene ${date}`
      );
    } finally {
      setSaving(false);
    }
  };

  const saveDisabled = saving || day.loading || validationErrors.length > 0;

  return (
    <div style={{ padding: "1rem", background: "#fff", borderRadius: 12 }}>
      {/* ===== ترويسة موحدة AL MAWASHI ===== */}
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
            <td style={tdHeader2}>
              <b>Area:</b> QA &nbsp;&nbsp;{" "}
              <span style={{ color: "#0f172a", fontWeight: 800 }}>{branchLabel}</span>
            </td>
            <td style={tdHeader2}>
              <b>Date:</b> {date || "—"}
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
        PERSONAL HYGIENE CHECKLIST — {branchLabel}
      </div>

      {/* ✅ ملاحظات ثابتة */}
      <div
        style={{
          marginBottom: "10px",
          padding: "10px",
          borderRadius: 10,
          border: "1px solid #cbd5e1",
          background: "#f8fafc",
          fontWeight: 700,
          color: "#0f172a",
          display: "grid",
          gap: 6,
        }}
      >
        <div>Note: Checked By was conducted by the branch supervisor who holds a valid PIC certificate.</div>
        <div>Note: Verified by must be QA (independent).</div>
        <div>Note: This report is electronically approved; no signature is required.</div>
      </div>

      {/* Date */}
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
        <FillAllButton
          onClick={markAll}
          label="All OK (C + Fit Yes)"
          title="Mark every empty check C and Fit = Yes for the named staff (cells already marked stay)"
        />
        <button
          type="button"
          onClick={loadRoster}
          disabled={staffLoading || !roster.length}
          style={toolBtn}
          title="Fill the rows with the staff assigned to POS 10 in the Staff Directory"
        >
          👥 Load staff list{roster.length ? ` (${roster.length})` : ""}
        </button>
        <button type="button" onClick={addRow} style={toolBtn}>+ Add row</button>
      </div>
      {!staffLoading && roster.length === 0 && (
        <div style={hintBox}>
          👥 No staff assigned yet — add them in Settings → Staff Directory (form “POS 10 · Personal Hygiene”).
          You can still type names or employee numbers.
        </div>
      )}
      {!staffLoading && !staffOnline && <div style={hintBox}>📴 Offline — showing the last saved staff list.</div>}

      <datalist id="pos10-ph-empno">
        {allStaff.map((s) => <option key={`n-${s.empNo}`} value={s.empNo}>{s.name}</option>)}
      </datalist>
      <datalist id="pos10-ph-name">
        {allStaff.map((s) => <option key={`m-${s.empNo}`} value={s.name}>{s.empNo}</option>)}
      </datalist>

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
            fontWeight: 800,
            whiteSpace: "pre-wrap",
          }}
        >
          ⚠️ Please fix before saving:
          {"\n"}- {validationErrors.join("\n- ")}
        </div>
      )}

      {/* Table */}
      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", tableLayout: "fixed", minWidth: 1500 }}>
          <thead>
            <tr style={{ background: "#2980b9", color: "#fff" }}>
              <th style={{ ...thStyle, width: "50px" }}>S.No</th>
              <th style={{ ...thStyle, width: "90px" }}>Emp. No</th>
              <th style={{ ...thStyle, width: "170px" }}>Employee Name</th>

              {HYGIENE_COLUMNS.map((col, i) => (
                <th key={i} style={{ ...thStyle, width: "110px" }}>
                  {col}
                </th>
              ))}

              <th style={{ ...thStyle, width: "120px" }}>
                Fit for Food Handling?
                <br />
                (Yes/No)
              </th>
              <th style={{ ...thStyle, width: "120px" }}>
                If No: Communicable disease
                <br />
                (Yes/No)
              </th>
              <th style={{ ...thStyle, width: "120px" }}>
                If No: Open wound
                <br />
                (Yes/No)
              </th>
              <th style={{ ...thStyle, width: "170px" }}>If No: Other (text)</th>

              <th style={{ ...thStyle, width: "230px" }}>Remarks and Corrective Actions</th>
              <th style={{ ...thStyle, width: "44px" }} />
            </tr>
          </thead>

          <tbody>
            {entries.map((entry, i) => {
              const isNo = low(entry?.fitForFoodHandling) === "no";
              return (
                <tr key={i}>
                  <td style={tdStyle}>{i + 1}</td>

                  <td style={tdStyle}>
                    <input
                      type="text"
                      inputMode="numeric"
                      list="pos10-ph-empno"
                      placeholder="No."
                      value={entry.empNo || ""}
                      onChange={(e) => handleChange(i, "empNo", e.target.value)}
                      style={inputStyle}
                    />
                  </td>

                  <td style={tdStyle}>
                    <input
                      type="text"
                      list="pos10-ph-name"
                      value={entry.name}
                      onChange={(e) => handleChange(i, "name", e.target.value)}
                      style={{ ...inputStyle, overflow: "hidden", textOverflow: "ellipsis" }}
                    />
                  </td>

                  {HYGIENE_COLUMNS.map((col, cIndex) => (
                    <td key={cIndex} style={tdStyle}>
                      <CycleCell value={entry[col]} onChange={(v) => handleChange(i, col, v)} />
                    </td>
                  ))}

                  <td style={tdStyle}>
                    <CycleCell
                      value={entry.fitForFoodHandling}
                      cycle={YES_NO}
                      onChange={(v) => handleChange(i, "fitForFoodHandling", v)}
                      title="Tap: Yes → No → empty"
                    />
                  </td>

                  <td style={tdStyle}>
                    <CycleCell
                      value={entry.reasonCommunicableDisease}
                      cycle={YES_NO}
                      tones={REASON_TONES}
                      disabled={!isNo}
                      onChange={(v) => handleChange(i, "reasonCommunicableDisease", v)}
                    />
                  </td>

                  <td style={tdStyle}>
                    <CycleCell
                      value={entry.reasonOpenWound}
                      cycle={YES_NO}
                      tones={REASON_TONES}
                      disabled={!isNo}
                      onChange={(v) => handleChange(i, "reasonOpenWound", v)}
                    />
                  </td>

                  <td style={tdStyle}>
                    <input
                      type="text"
                      value={entry.reasonOther}
                      onChange={(e) => handleChange(i, "reasonOther", e.target.value)}
                      style={inputStyle}
                      placeholder={isNo ? "Other reason..." : "—"}
                      disabled={!isNo}
                    />
                  </td>

                  <td style={tdStyle}>
                    <input
                      type="text"
                      value={entry.remarks}
                      onChange={(e) => handleChange(i, "remarks", e.target.value)}
                      style={{
                        ...inputStyle,
                        borderColor: isNo && !norm(entry.remarks) ? "#ef4444" : "#aaa",
                      }}
                      placeholder={isNo ? "Corrective Action (transfer/exclude)..." : ""}
                    />
                  </td>

                  <td style={tdStyle}>
                    <button type="button" onClick={() => removeRow(i)} title="Remove row" style={rmBtn}>×</button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Footer */}
      <div style={{ marginTop: "1rem", fontWeight: "600" }}>
        REMARKS / CORRECTIVE ACTIONS:
      </div>
      <div style={{ marginTop: "0.5rem", fontSize: "0.9rem" }}>
        *(C – Conform &nbsp;&nbsp;&nbsp; NC – Non Conform) — tap a cell to change it
      </div>

      {/* Checked / Verified */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginTop: "1rem",
          fontWeight: 700,
          gap: "1rem",
          flexWrap: "wrap",
        }}
      >
        <CheckedByField sig={sig} label="Checked By (Branch Supervisor - PIC):" />

        <label>
          Verified by (QA):{" "}
          <input
            type="text"
            required
            value={verifiedByQA}
            onChange={(e) => setVerifiedByQA(e.target.value)}
            style={{
              ...footerInput,
              borderColor:
                norm(checkedBySupervisor) && norm(verifiedByQA) && low(checkedBySupervisor) === low(verifiedByQA)
                  ? "#ef4444"
                  : "#aaa",
            }}
          />
        </label>
      </div>

      {/* Save */}
      <div style={{ textAlign: "center", marginTop: "1.5rem" }}>
        <button
          type="button"
          onClick={handleSave}
          disabled={saveDisabled}
          style={{
            padding: "10px 18px",
            background: saveDisabled
              ? "linear-gradient(180deg,#94a3b8,#64748b)"
              : "linear-gradient(180deg,#10b981,#059669)",
            color: "#fff",
            border: "none",
            borderRadius: "8px",
            cursor: saveDisabled ? "not-allowed" : "pointer",
            fontWeight: 800,
            opacity: saveDisabled ? 0.75 : 1,
          }}
        >
          {saving ? "⏳ Saving..." : day.loading ? "⏳ Loading..." : day.editing ? "💾 Update Report" : "💾 Save Report"}
        </button>
      </div>

      {day.msg && !day.loading && (
        <div style={{ marginTop: "1rem", fontWeight: "700", whiteSpace: "pre-line", textAlign: "center" }}>
          {day.msg}
        </div>
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
  minWidth: "220px",
};

const tdHeader2 = {
  border: "1px solid #9aa4ae",
  padding: "6px 8px",
  verticalAlign: "middle",
};
