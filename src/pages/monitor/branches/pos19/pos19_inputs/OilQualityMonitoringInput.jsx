// src/pages/monitor/branches/pos19/pos19_inputs/OilQualityMonitoringInput.jsx
import React, { useMemo, useState } from "react";
import ReportHeader from "../_shared/AlMawashiHeader";
import useReportDateStatus from "../_shared/useReportDateStatus";
import {
  usePos19Day, savePos19Report, DayStatus, todayDubai,
  usePos19CheckedBy, CheckedByField,
} from "../_shared/pos19EntryKit";


const TYPE     = "pos19_oil_quality_monitoring";
const BRANCH   = "POS 19";
const FORM_REF = "FS-HACCP/POS19/OIL/04";

const inputStyle = {
  width: "100%", boxSizing: "border-box",
  border: "1px solid #c7d2fe", borderRadius: 6,
  padding: "4px 6px", display: "block", minWidth: 0,
};
const thCell = {
  border: "1px solid #1f3b70", padding: "6px 4px",
  textAlign: "center", whiteSpace: "pre-line",
  fontWeight: 700, background: "#f5f8ff", color: "#0b1f4d",
};
const tdCell = {
  border: "1px solid #1f3b70", padding: "6px 4px",
  textAlign: "center", verticalAlign: "middle",
};

function btnStyle(bg) {
  return {
    background: bg, color: "#fff", border: "none",
    borderRadius: 10, padding: "10px 14px", fontWeight: 700,
    cursor: "pointer", boxShadow: "0 4px 12px rgba(0,0,0,.15)",
  };
}

const EMPTY = { result: "", action: "" };

export default function OilQualityMonitoringInput() {
  const [reportDate, setReportDate] = useState(todayDubai);

  const [row, setRow]               = useState(EMPTY);
  const [section, setSection]       = useState("");
  const [verifiedBy, setVerifiedBy] = useState("");
  const [revDate, setRevDate]       = useState("");
  const [revNo, setRevNo]           = useState("");
  const [saving, setSaving]         = useState(false);

  const sig = usePos19CheckedBy();
  const day = usePos19Day(TYPE, reportDate, {
    onLoad: (p) => {
      const e = (Array.isArray(p.entries) && p.entries[0]) || {};
      setRow({ result: e.result || "", action: e.action || "" });
      setSection(p.section || "");
      setVerifiedBy(p.verifiedBy || "");
      setRevDate(p.revDate || "");
      setRevNo(p.revNo || "");
      // older sheets kept the checker on the row
      sig.load({ ...p, checkedBy: p.checkedBy || e.checkedBy || "" });
    },
    onBlank: () => {
      setRow(EMPTY);
      setSection(""); setVerifiedBy(""); setRevDate(""); setRevNo("");
      sig.reset();
    },
  });
  const dateStatus = useReportDateStatus(TYPE, reportDate, { editing: day.editing });

  const gridStyle = useMemo(() => ({
    width: "100%", borderCollapse: "collapse", tableLayout: "fixed", fontSize: 12,
  }), []);

  const colDefs = useMemo(() => ([
    <col key="res"  style={{ width: 480 }} />,
    <col key="act"  style={{ width: 420 }} />,
  ]), []);

  function updateRow(key, val) {
    setRow((p) => ({ ...p, [key]: val }));
  }

  async function handleSave() {
    if (!reportDate) { alert("الرجاء تحديد التاريخ أعلى الصفحة"); return; }
    if (sig.errors.length) { alert("⚠️ " + sig.errors.join("\n")); return; }
    const signed = sig.fields();
    setSaving(true);
    try {
      await savePos19Report({
        type: TYPE,
        day,
        dateStatus,
        label: `POS 19 Oil Quality ${reportDate}`,
        payload: {
          branch: BRANCH,
          formRef: FORM_REF,
          classification: "Official",
          section: section || "",
          reportDate,
          entries: [{
            result:    row.result || "",
            action:    row.action || "",
            // the viewer reads the checker on the row
            checkedBy: signed.checkedBy,
          }],
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
        title="Oil Quality Monitoring Form"
        fields={[
          { label: "Form Ref", value: FORM_REF },
          { label: "Branch", value: BRANCH },
          { label: "Classification", value: "Official" },
          { label: "Report Date", type: "date", value: reportDate, onChange: setReportDate, note: dateStatus.note },
          { label: "Section", value: section, onChange: setSection, placeholder: "e.g. Butchery" },
        ]}
      />

      {/* Critical info banner */}
      <div style={{ display:"flex", gap:10, alignItems:"flex-start", padding:"12px 14px", background:"#fffbeb", border:"1px solid #fde68a", borderLeft:"4px solid #f59e0b", borderRadius:8, color:"#78350f", fontSize:13, lineHeight:1.5, marginBottom:12 }}>
        <div style={{ fontSize:18, lineHeight:1 }}>⚠️</div>
        <div><strong>Critical Limit:</strong> Discard frying oil when Total Polar Materials (TPM) <b>&gt; 24%</b>, or when oil shows excessive darkening, persistent foaming, or off-odor / off-taste. <b>Filter oil daily</b> and check quality at least once per shift. Never top up old oil with fresh oil to mask deterioration.</div>
      </div>

      {/* Table */}
      <div style={{ border:"1px solid #1f3b70", borderBottom:"none" }}>
        <div style={{ ...thCell, background:"#e9f0ff" }}>RECORD</div>
      </div>
      <div style={{ overflowX:"auto" }}>
        <table style={gridStyle}>
          <colgroup>{colDefs}</colgroup>
          <thead>
            <tr>
              <th style={thCell}>Evaluation Results</th>
              <th style={thCell}>Corrective Action</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style={tdCell}><input type="text" placeholder="Evaluation results" value={row.result} onChange={(e)=>updateRow("result", e.target.value)} style={inputStyle} /></td>
              <td style={tdCell}><input type="text" placeholder="Corrective action" value={row.action} onChange={(e)=>updateRow("action", e.target.value)} style={inputStyle} /></td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Footer */}
      <div style={{ marginTop:16 }}><CheckedByField sig={sig} /></div>
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:12, marginTop:12, alignItems:"center", fontSize:12 }}>
        <div style={{ display:"flex", alignItems:"center", gap:8 }}>
          <span>Verified by:</span>
          <input value={verifiedBy} onChange={(e)=>setVerifiedBy(e.target.value)} style={inputStyle} />
        </div>
        <div style={{ display:"flex", alignItems:"center", gap:8 }}>
          <span>Rev. Date:</span>
          <input value={revDate} onChange={(e)=>setRevDate(e.target.value)} style={inputStyle} placeholder="YYYY-MM-DD" />
        </div>
        <div style={{ display:"flex", alignItems:"center", gap:8 }}>
          <span>Rev. No:</span>
          <input value={revNo} onChange={(e)=>setRevNo(e.target.value)} style={inputStyle} />
        </div>
      </div>

      {/* Controls */}
      <div style={{ display:"flex", gap:8, marginTop:12, flexWrap:"wrap", alignItems:"center" }}>
        <button onClick={handleSave} disabled={saving || day.loading || dateStatus.blocked} style={btnStyle("#2563eb")}>
          {saving ? "Saving…" : day.editing ? "Update Oil Quality" : "Save Oil Quality"}
        </button>
        <DayStatus day={day} />
      </div>
    </div>
  );
}
