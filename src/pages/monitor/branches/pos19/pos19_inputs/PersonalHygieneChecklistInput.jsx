// src/pages/monitor/branches/pos19/pos19_inputs/PersonalHygieneChecklistInput.jsx
// Staff rows come from Settings → Staff Directory (people assigned to the
// "POS 19 · Personal Hygiene" form), ticks are one tap each, "All √" fills the
// sheet, and the day's saved report re-opens here for editing.
import React, { useEffect, useMemo, useRef, useState } from "react";
import ReportHeader from "../_shared/AlMawashiHeader";
import useReportDateStatus from "../_shared/useReportDateStatus";
import {
  useStaffDirectory,
  normalizeEmpNo,
} from "../../_shared/staffRegistry";
import {
  useEmployeeFinder, nameForEmpNo, unknownEmpErrors, LockedName,
} from "../../_shared/hygieneEntryKit";
import {
  usePos19Day, savePos19Report, DayStatus, todayDubai,
  useCheckedBy, CheckedByField, TickCell, tickAll, AllTickButton,
  POS19_HYGIENE_FORM_KEY,
} from "../_shared/pos19EntryKit";

const TYPE     = "pos19_personal_hygiene";
const BRANCH   = "POS 19";
const FORM_REF = "FS-HACCP/POS19/HYG/05";

const COLS = [
  { key: "cleanUniform",    label: "Clean\nUniform" },
  { key: "cleanShoes",      label: "Clean\nShoes" },
  { key: "handwashGloves",  label: "Hand washing and\nwearing disposable\ngloves when handling\nhigh risk food" },
  { key: "hairCovered",     label: "Hair is short\nand clean\ncovered" },
  { key: "fingernails",     label: "Fingernail\nis clean\nand short" },
  { key: "mustacheShaved",  label: "Mustache/\nbeard properly\nshaved" },
  { key: "noJewelry",       label: "No\nJewelry" },
  { key: "noIllness",       label: "No Illness,\nNo Septic\nCuts, No Skin\nInfection" },
];
const COL_KEYS = COLS.map((c) => c.key);

function emptyRow(name = "", empNo = "") {
  const base = { staffName: name, empNo, correctiveAction: "" };
  COL_KEYS.forEach((k) => (base[k] = ""));
  return base;
}
const rowFromStaff = (s) => emptyRow(s?.name || "", s?.empNo || "");
const hasName = (r) => !!String(r?.staffName || "").trim();
const isBlankRow = (r) =>
  !hasName(r) && !String(r?.empNo || "").trim() && !String(r?.correctiveAction || "").trim() &&
  COL_KEYS.every((k) => !String(r?.[k] || "").trim());

/* saved entry ⇄ screen row */
const fromEntry = (e = {}) => {
  const r = emptyRow(e.name || e.staffName || "", e.empNo || "");
  COL_KEYS.forEach((k) => (r[k] = e[k] || ""));
  r.correctiveAction = e.remarks || e.correctiveAction || "";
  return r;
};
const toEntry = (r) => {
  const e = { name: r.staffName || "", empNo: r.empNo || "" };
  COL_KEYS.forEach((k) => (e[k] = r[k] || ""));
  e.remarks = r.correctiveAction || "";
  return e;
};

function btnStyle(bg) {
  return {
    background: bg, color: "#fff", border: "none",
    borderRadius: 10, padding: "10px 14px", fontWeight: 700,
    cursor: "pointer", boxShadow: "0 4px 12px rgba(0,0,0,.15)",
  };
}

export default function PersonalHygieneChecklistInput() {
  const [date, setDate]           = useState(todayDubai);
  const [section, setSection]     = useState("");
  const [rows, setRows]           = useState(() => Array.from({ length: 5 }, () => emptyRow()));
  const [verifiedBy, setVerifiedBy] = useState("");
  const [revDate, setRevDate]     = useState("");
  const [revNo, setRevNo]         = useState("");
  const [saving, setSaving]       = useState(false);

  const directory = useStaffDirectory(POS19_HYGIENE_FORM_KEY);
  const { roster, staff: allStaff, loading: staffLoading, online: staffOnline, byNo } = directory;
  // The name is locked: it comes only from the employee number.
  const findEmp = useEmployeeFinder(byNo);
  const sig = useCheckedBy(directory);

  const blankSheet = () => (roster.length ? roster.map(rowFromStaff) : Array.from({ length: 5 }, () => emptyRow()));

  const day = usePos19Day(TYPE, date, {
    onLoad: (p) => {
      const list = Array.isArray(p.entries) ? p.entries.map(fromEntry) : [];
      setRows(list.length ? list : blankSheet());
      setSection(p.section || "");
      setVerifiedBy(p.verifiedBy || "");
      setRevDate(p.revDate || "");
      setRevNo(p.revNo || "");
      sig.load(p);
    },
    onBlank: () => {
      setRows(blankSheet());
      setSection(""); setVerifiedBy(""); setRevDate(""); setRevNo("");
      sig.reset();
    },
  });
  const dateStatus = useReportDateStatus(TYPE, date, { editing: day.editing });

  /* Seed the sheet from the directory once — only while nothing is typed and
     no saved report was opened, so a late reply never wipes work. */
  const seededRef = useRef(false);
  useEffect(() => {
    if (seededRef.current || staffLoading || day.loading) return;
    seededRef.current = true;
    if (!roster.length || day.editing) return;
    setRows((prev) => (prev.every(isBlankRow) ? roster.map(rowFromStaff) : prev));
  }, [roster, staffLoading, day.loading, day.editing]);

  const loadRoster = () => {
    if (!roster.length) return;
    const typed = rows.some((r) => !isBlankRow(r) && !roster.some((s) => normalizeEmpNo(s.empNo) === normalizeEmpNo(r.empNo)));
    if (typed && !window.confirm("Replace the rows with the staff list from the directory?")) return;
    setRows(roster.map(rowFromStaff));
  };

  const gridStyle = useMemo(() => ({
    width: "100%", borderCollapse: "collapse", tableLayout: "fixed", fontSize: 12,
  }), []);

  const thCell = {
    border: "1px solid #1f3b70", padding: "6px 4px",
    textAlign: "center", whiteSpace: "pre-line",
    fontWeight: 700, background: "#f5f8ff", color: "#0b1f4d",
  };
  const tdCell = {
    border: "1px solid #1f3b70", padding: "4px 4px",
    textAlign: "center", verticalAlign: "middle",
  };
  const inputStyle = {
    width: "100%", boxSizing: "border-box",
    border: "1px solid #c7d2fe", borderRadius: 6,
    padding: "4px 6px", display: "block",
    overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", minWidth: 0,
  };

  function updateRow(i, key, val) {
    setRows((prev) => {
      const next = [...prev];
      const row = next[i] || emptyRow();
      // The name is locked to the employee number (unknown number → no name).
      if (key === "empNo") {
        next[i] = { ...row, empNo: val, staffName: nameForEmpNo(findEmp, val) };
      } else {
        next[i] = { ...row, [key]: val };
      }
      return next;
    });
  }
  function addRow()    { setRows((r) => [...r, emptyRow()]); }
  function deleteRow(i){ setRows((r) => (r.length > 1 ? r.filter((_, idx) => idx !== i) : r)); }
  const markAll = () => setRows((r) => tickAll(r, COL_KEYS, hasName));

  const colDefs = useMemo(() => {
    const arr = [
      <col key="del"   style={{ width: 44 }} />,
      <col key="empno" style={{ width: 90 }} />,
      <col key="name"  style={{ width: 180 }} />,
    ];
    COLS.forEach((_, i) => arr.push(<col key={`c${i}`} style={{ width: 96 }} />));
    arr.push(<col key="action" style={{ width: 190 }} />);
    return arr;
  }, []);

  async function handleSave() {
    if (!date) { alert("الرجاء تحديد التاريخ"); return; }
    const filled = rows.filter((r) => !isBlankRow(r));
    if (!filled.length) { alert("أضف على الأقل موظفًا واحدًا"); return; }
    const errs = [...sig.errors, ...unknownEmpErrors(filled, findEmp, staffLoading)];
    if (filled.some((r) => !hasName(r))) errs.push("Every filled row needs a staff name.");
    if (errs.length) { alert("⚠️ " + errs.join("\n")); return; }

    setSaving(true);
    try {
      await savePos19Report({
        type: TYPE,
        day,
        dateStatus,
        label: `POS 19 Personal Hygiene ${date}`,
        payload: {
          branch: BRANCH,
          formRef: FORM_REF,
          reportDate: date,
          entries: filled.map(toEntry),
          ...sig.fields(),
          verifiedBy,
          revDate,
          revNo,
          section,
        },
      });
    } finally {
      setSaving(false);
    }
  }

  const showRosterHint = !staffLoading && roster.length === 0;

  return (
    <div style={{ background:"#fff", border:"1px solid #dbe3f4", borderRadius:12, padding:16, color:"#0b1f4d" }}>
      <ReportHeader
        title="Personal Hygiene Checklist"
        fields={[
          { label: "Form Ref", value: FORM_REF },
          { label: "Branch", value: BRANCH },
          { label: "Classification", value: "Official" },
          { label: "Report Date", type: "date", value: date, onChange: setDate, note: dateStatus.note },
          { label: "Section", value: section, onChange: setSection, placeholder: "e.g. Butchery" },
        ]}
      />

      {/* Important info banner */}
      <div style={{ display:"flex", gap:10, alignItems:"flex-start", padding:"12px 14px", background:"#eff6ff", border:"1px solid #bfdbfe", borderLeft:"4px solid #3b82f6", borderRadius:8, color:"#1e40af", fontSize:13, lineHeight:1.5, marginBottom:12 }}>
        <div style={{ fontSize:18, lineHeight:1 }}>ℹ️</div>
        <div><strong>Important (PRP):</strong> All food handlers must <b>wash hands</b> before food handling, after toilet use, after touching face/hair, and between tasks. <b>No jewelry, exposed cuts/wounds, or work while ill</b> (vomiting, diarrhea, fever). Hair must be fully covered, nails trimmed and unpainted, and clean uniform worn.</div>
      </div>

      {/* Toolbar */}
      <div style={{ display:"flex", gap:8, marginBottom:10, flexWrap:"wrap", alignItems:"center" }}>
        <AllTickButton onClick={markAll} />
        <button onClick={loadRoster} disabled={staffLoading || !roster.length} style={btnStyle("#0ea5e9")} title="Fill the rows with the staff assigned to POS 19 in the Staff Directory">
          👥 Load staff list{roster.length ? ` (${roster.length})` : ""}
        </button>
        <button onClick={addRow} style={btnStyle("#10b981")}>+ Add Row</button>
        <div style={{ flex:1 }} />
        <DayStatus day={day} />
      </div>
      {showRosterHint && (
        <div style={{ fontSize:12, color:"#475569", background:"#f8fafc", border:"1px dashed #cbd5e1", borderRadius:8, padding:"6px 10px", marginBottom:8 }}>
          👥 No staff assigned yet — add them in Settings → Staff Directory (form “POS 19 · Personal Hygiene”). You can still type names or employee numbers.
        </div>
      )}
      {!staffLoading && !staffOnline && (
        <div style={{ fontSize:12, color:"#92400e", background:"#fffbeb", border:"1px solid #fde68a", borderRadius:8, padding:"6px 10px", marginBottom:8 }}>
          📴 Offline — showing the last saved staff list.
        </div>
      )}

      {/* Title band */}
      <div style={{ border:"1px solid #1f3b70", borderBottom:"none" }}>
        <div style={{ ...thCell, background:"#e9f0ff" }}>Good Hygiene Practices</div>
        <div style={{ fontSize: 11, textAlign: "center", padding: "6px 0", color: "#0b1f4d" }}>
          <strong>Tap a cell: (√) Satisfactory → (✗) Needs Improvement → empty</strong>
        </div>
      </div>

      <datalist id="pos19-ph-empno">
        {allStaff.map((s) => <option key={`n-${s.empNo}`} value={s.empNo}>{s.name}</option>)}
      </datalist>

      {/* Table */}
      <div style={{ overflowX:"auto" }}>
        <table style={gridStyle}>
          <colgroup>{colDefs}</colgroup>
          <thead>
            <tr>
              <th style={thCell}>—</th>
              <th style={thCell}>Emp. No</th>
              <th style={thCell}>Staff Name 🔒</th>
              {COLS.map((c) => <th key={c.key} style={thCell}>{c.label}</th>)}
              <th style={thCell}>Corrective Action</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i}>
                <td style={{ ...tdCell, padding:"2px" }}>
                  <button onClick={() => deleteRow(i)} title="Delete row" style={{ width:"32px", height:"28px", border:"1px solid #ef4444", background:"#fef2f2", color:"#b91c1c", borderRadius:6, fontWeight:800, cursor:"pointer" }}>×</button>
                </td>
                <td style={tdCell}>
                  <input type="text" inputMode="numeric" list="pos19-ph-empno" placeholder="No." value={r.empNo} onChange={(e) => updateRow(i, "empNo", e.target.value)} style={inputStyle} />
                </td>
                <td style={tdCell}>
                  <LockedName
                    name={r.staffName}
                    empNo={r.empNo}
                    unknown={!!String(r.empNo ?? "").trim() && !staffLoading && !findEmp(r.empNo)}
                  />
                </td>
                {COLS.map((c) => (
                  <td style={tdCell} key={c.key}>
                    <TickCell value={r[c.key]} onChange={(v) => updateRow(i, c.key, v)} />
                  </td>
                ))}
                <td style={tdCell}>
                  <input type="text" placeholder="Action" value={r.correctiveAction} onChange={(e) => updateRow(i, "correctiveAction", e.target.value)} style={inputStyle} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Footer */}
      <div style={{ display:"flex", gap:12, marginTop:16, alignItems:"center", flexWrap:"wrap", fontSize:12 }}>
        <CheckedByField sig={sig} />
        <div style={{ display:"flex", alignItems:"center", gap:8, minWidth:220 }}>
          <span>Verified by:</span>
          <input value={verifiedBy} onChange={(e)=>setVerifiedBy(e.target.value)} style={inputStyle} />
        </div>
        <div style={{ display:"flex", alignItems:"center", gap:8 }}>
          <span>Rev.Date:</span>
          <input value={revDate} onChange={(e)=>setRevDate(e.target.value)} style={{ ...inputStyle, width:120 }} placeholder="YYYY-MM-DD" />
        </div>
        <div style={{ display:"flex", alignItems:"center", gap:8 }}>
          <span>Rev.No:</span>
          <input value={revNo} onChange={(e)=>setRevNo(e.target.value)} style={{ ...inputStyle, width:70 }} />
        </div>
      </div>

      <div style={{ display:"flex", gap:8, marginTop:12, flexWrap:"wrap" }}>
        <button onClick={handleSave} disabled={saving || day.loading || dateStatus.blocked} style={btnStyle("#2563eb")}>
          {saving ? "Saving…" : day.editing ? "Update Checklist" : "Save Checklist"}
        </button>
      </div>
    </div>
  );
}
