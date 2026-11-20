// src/pages/monitor/branches/pos19/pos19_inputs/GlassItemsConditionChecklistInput.jsx
import React, { useMemo, useState } from "react";
import ReportHeader from "../_shared/AlMawashiHeader";
import useReportDateStatus from "../_shared/useReportDateStatus";
import {
  usePos19Day, savePos19Report, DayStatus, todayDubai,
  usePos19CheckedBy, CheckedByField, TickCell, tickAll, AllTickButton,
} from "../_shared/pos19EntryKit";

const TYPE    = "pos19_glass_items_condition";
const BRANCH  = "POS 19";
const FORM_REF = "FS-HACCP/POS19/GLS/03";

const LEGEND_COLS = [
  { key: "inGoodRepair", label: "In good repair and condition" },
  { key: "noBreakage",   label: "No signs of glass breakage" },
  { key: "cleanDry",     label: "Visibly clean and dry" },
];
const TICK_KEYS = LEGEND_COLS.map((c) => c.key);

function emptyRow() {
  return {
    glassItem: "",
    section: "",
    inGoodRepair: "",
    noBreakage: "",
    cleanDry: "",
    correctiveAction: "",
    checkedBy: "",
  };
}
const blankRows = () => Array.from({ length: 5 }, () => emptyRow());
const hasItem = (r) => !!String(r.glassItem || "").trim();

export default function GlassItemsConditionChecklistInput() {
  const [reportDate, setReportDate]       = useState(todayDubai);
  const [rows, setRows]                   = useState(blankRows);
  const [headerSection, setHeaderSection] = useState("");
  const [classification]                  = useState("Official");
  const [revDate, setRevDate]             = useState("");
  const [revNo, setRevNo]                 = useState("");
  const [verifiedBy, setVerifiedBy]       = useState("");
  const [saving, setSaving]               = useState(false);

  const sig = usePos19CheckedBy();
  const day = usePos19Day(TYPE, reportDate, {
    onLoad: (p) => {
      const list = Array.isArray(p.entries) ? p.entries.map((e) => ({ ...emptyRow(), ...e })) : [];
      setRows(list.length ? list : blankRows());
      setHeaderSection(p.section || "");
      setVerifiedBy(p.verifiedBy || "");
      setRevDate(p.revDate || "");
      setRevNo(p.revNo || "");
      // older sheets kept the checker on each row
      sig.load({ ...p, checkedBy: p.checkedBy || list.find((r) => r.checkedBy)?.checkedBy || "" });
    },
    onBlank: () => {
      setRows(blankRows());
      setHeaderSection(""); setVerifiedBy(""); setRevDate(""); setRevNo("");
      sig.reset();
    },
  });
  const dateStatus = useReportDateStatus(TYPE, reportDate, { editing: day.editing });

  const monthText = useMemo(() => {
    const m = String(reportDate || "").match(/^(\d{4})-(\d{2})-\d{2}$/);
    return m ? `${m[2]}/${m[1]}` : "";
  }, [reportDate]);

  const gridStyle = useMemo(() => ({
    width: "100%",
    borderCollapse: "collapse",
    tableLayout: "fixed",
    fontSize: 12,
  }), []);

  const thCell = {
    border: "1px solid #1f3b70",
    padding: "6px 4px",
    textAlign: "center",
    whiteSpace: "pre-line",
    fontWeight: 700,
    background: "#f5f8ff",
    color: "#0b1f4d",
  };
  const tdCell = {
    border: "1px solid #1f3b70",
    padding: "4px 4px",
    textAlign: "center",
    verticalAlign: "middle",
  };
  const inputStyle = {
    width: "100%",
    boxSizing: "border-box",
    border: "1px solid #c7d2fe",
    borderRadius: 6,
    padding: "4px 6px",
    display: "block",
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
    minWidth: 0,
  };
  const btnStyle = (bg) => ({
    background: bg, color: "#fff", border: "none",
    borderRadius: 10, padding: "10px 14px", fontWeight: 700,
    cursor: "pointer", boxShadow: "0 4px 12px rgba(0,0,0,.15)",
  });

  const colDefs = useMemo(() => ([
    <col key="glass"   style={{ width: 210 }} />,
    <col key="section" style={{ width: 160 }} />,
    ...LEGEND_COLS.map((_, i) => <col key={`lg${i}`} style={{ width: 150 }} />),
    <col key="ca"      style={{ width: 220 }} />,
    <col key="del"     style={{ width: 44 }} />,
  ]), []);

  function updateRow(idx, key, val) {
    setRows((prev) => {
      const next = [...prev];
      next[idx] = { ...next[idx], [key]: val };
      return next;
    });
  }
  const addRow = () => setRows((r) => [...r, emptyRow()]);
  const removeRow = (idx) => setRows((r) => (r.length > 1 ? r.filter((_, i) => i !== idx) : r));
  const markAll = () => setRows((r) => tickAll(r, TICK_KEYS, hasItem));

  async function handleSave() {
    const entries = rows.filter((r) =>
      Object.entries(r).some(([k, v]) => k !== "checkedBy" && String(v || "").trim() !== "")
    );
    if (entries.length === 0) { alert("لا يوجد بيانات للحفظ."); return; }
    if (sig.errors.length) { alert("⚠️ " + sig.errors.join("\n")); return; }
    const signed = sig.fields();

    setSaving(true);
    try {
      await savePos19Report({
        type: TYPE,
        day,
        dateStatus,
        label: `POS 19 Glass Items ${reportDate}`,
        payload: {
          branch: BRANCH,
          formRef: FORM_REF,
          classification,
          reportDate,
          month: monthText,
          section: headerSection,
          // the viewer reads the checker per row
          entries: entries.map((r) => ({ ...r, checkedBy: signed.checkedBy })),
          ...signed,
          verifiedBy,
          revDate,
          revNo,
        },
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div style={{ background:"#fff", border:"1px solid #dbe3f4", borderRadius:12, padding:16, color:"#0b1f4d" }}>
      <ReportHeader
        title="Glass Items Condition Monitoring Checklist (Weekly)"
        fields={[
          { label: "Form Ref", value: FORM_REF },
          { label: "Branch", value: BRANCH },
          { label: "Classification", value: classification },
          { label: "Report Date", type: "date", value: reportDate, onChange: setReportDate, note: dateStatus.note },
          { label: "Section", value: headerSection, onChange: setHeaderSection, placeholder: "e.g. Butchery" },
        ]}
      />

      {/* Critical info banner */}
      <div style={{ display:"flex", gap:10, alignItems:"flex-start", padding:"12px 14px", background:"#fffbeb", border:"1px solid #fde68a", borderLeft:"4px solid #f59e0b", borderRadius:8, color:"#78350f", fontSize:13, lineHeight:1.5, marginBottom:12 }}>
        <div style={{ fontSize:18, lineHeight:1 }}>⚠️</div>
        <div><strong>Critical (Foreign-Object Hazard):</strong> Any cracked, chipped, or broken glass / hard-plastic item in the food area must be reported <b>immediately</b>. Quarantine the surrounding area, inspect any exposed food, and replace the damaged item <b>before resuming work</b>. Document the incident in the corrective-action column.</div>
      </div>

      {/* Toolbar */}
      <div style={{ display:"flex", gap:8, marginBottom:10, flexWrap:"wrap", alignItems:"center" }}>
        <AllTickButton onClick={markAll} />
        <button type="button" onClick={addRow} style={btnStyle("#10b981")}>+ Add Row</button>
        <div style={{ flex:1 }} />
        <DayStatus day={day} />
      </div>

      {/* Legend */}
      <div style={{ border:"1px solid #1f3b70", borderBottom:"none" }}>
        <div style={{ ...thCell, background:"#e9f0ff" }}>
          LEGEND: (√) – Satisfactory & (✗) – Needs Improvement · tap a cell to change it
        </div>
      </div>

      {/* Table */}
      <div style={{ overflowX:"auto" }}>
        <table style={gridStyle}>
          <colgroup>{colDefs}</colgroup>
          <thead>
            <tr>
              <th style={thCell}>Glass Item</th>
              <th style={thCell}>Section</th>
              {LEGEND_COLS.map((c) => <th key={c.key} style={thCell}>{c.label}</th>)}
              <th style={thCell}>Corrective Action{"\n"}(if any)</th>
              <th style={thCell}>—</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, idx) => (
              <tr key={idx}>
                <td style={tdCell}>
                  <input type="text" value={r.glassItem} onChange={(e)=>updateRow(idx, "glassItem", e.target.value)} style={inputStyle} placeholder="e.g., Chiller door glass" />
                </td>
                <td style={tdCell}>
                  <input type="text" value={r.section} onChange={(e)=>updateRow(idx, "section", e.target.value)} style={inputStyle} placeholder="Area/zone" />
                </td>
                {LEGEND_COLS.map((c) => (
                  <td style={tdCell} key={c.key}>
                    <TickCell value={r[c.key]} onChange={(v)=>updateRow(idx, c.key, v)} />
                  </td>
                ))}
                <td style={tdCell}>
                  <input type="text" value={r.correctiveAction} onChange={(e)=>updateRow(idx, "correctiveAction", e.target.value)} style={inputStyle} placeholder="Action (if any)" />
                </td>
                <td style={tdCell}>
                  <button type="button" onClick={() => removeRow(idx)} title="Remove row" style={{ width:30, height:28, border:"1px solid #ef4444", background:"#fef2f2", color:"#b91c1c", borderRadius:6, fontWeight:800, cursor:"pointer" }}>×</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Footer */}
      <div style={{ marginTop:16 }}>
        <div style={{ marginBottom:10 }}><CheckedByField sig={sig} /></div>
        <div style={{ display:"flex", alignItems:"center", gap:8, fontSize:12 }}>
          <strong>Verified by:</strong>
          <input value={verifiedBy} onChange={(e)=>setVerifiedBy(e.target.value)} style={{ flex:"0 1 360px", border:"none", borderBottom:"2px solid #1f3b70", padding:"4px 6px", outline:"none", fontSize:12, color:"#0b1f4d" }} />
        </div>
        <div style={{ marginTop:8, fontSize:11, color:"#0b1f4d" }}>
          <strong>NOTE:</strong> Any glass items found defective or not within the standards should be removed from the section.
        </div>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12, marginTop:12, alignItems:"center", fontSize:12 }}>
          <div style={{ display:"flex", alignItems:"center", gap:8 }}>
            <span>Rev. Date:</span>
            <input value={revDate} onChange={(e)=>setRevDate(e.target.value)} style={inputStyle} placeholder="YYYY-MM-DD" />
          </div>
          <div style={{ display:"flex", alignItems:"center", gap:8 }}>
            <span>Rev. No:</span>
            <input value={revNo} onChange={(e)=>setRevNo(e.target.value)} style={inputStyle} />
          </div>
        </div>
      </div>

      {/* Save */}
      <div style={{ display:"flex", gap:8, marginTop:12, flexWrap:"wrap" }}>
        <button onClick={handleSave} disabled={saving || day.loading || dateStatus.blocked} style={btnStyle("#2563eb")}>
          {saving ? "Saving…" : day.editing ? "Update Glass Items Checklist" : "Save Glass Items Checklist"}
        </button>
      </div>
    </div>
  );
}
