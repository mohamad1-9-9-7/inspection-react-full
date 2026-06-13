// src/pages/monitor/branches/pos19/pos19_inputs/VegSanitationInput.jsx
import React, { useMemo, useState } from "react";
import ReportHeader from "../_shared/ReportHeader";
import API_BASE from "../../../../../config/api";

const TYPE     = "pos19_veg_sanitation_ccp";
const BRANCH   = "POS 19";
const FORM_REF = "TELT/CK/QA/SR/1";

const DOC_META = {
  documentTitle: "Sanitation Record",
  documentNo: "TELT/CK/QA/SR/1",
  issueDate: "01/08/2021",
  revisionNo: "0",
  area: "CENTRAL KITCHEN",
  controllingOfficer: "CHEF",
  approvedBy: "Hussam O. Sarhan / Director",
  companyLine: "AL MAWASHI BRAAI RESTAURANT LLC",
  title: "SANITATION RECORD (CCP) – CENTRAL KITCHEN",
};

const METHODOLOGY_NOTE =
  "Pre-Wash (Fruits & Veg wash with fresh water to remove dirt). " +
  "Disinfect (Soak Fruits & Veg in Peratek solution — contact time: hard skin 90 sec, soft skin 60 sec, leafy 3 min). " +
  "Drain the water. No rinsing required.";

function emptyRow() {
  return {
    date: "",
    time: "",
    productDetails: "",
    quantitySanitized: "",
    contactTime: "",
    peratekConc: "",
    remarks: "",
    verifiedBy: "",
  };
}

export default function VegSanitationInput() {
  const [reportDate, setReportDate] = useState(() => {
    try {
      return new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Dubai" });
    } catch {
      const d = new Date();
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    }
  });

  const ROW_COUNT = 12;
  const [rows, setRows] = useState(() => Array.from({ length: ROW_COUNT }, () => emptyRow()));
  const [saving, setSaving] = useState(false);

  const monthText = useMemo(() => {
    const m = String(reportDate || "").match(/^(\d{4})-(\d{2})-\d{2}$/);
    return m ? `${m[2]}/${m[1]}` : "";
  }, [reportDate]);

  const gridStyle = useMemo(() => ({
    width: "100%", borderCollapse: "collapse", tableLayout: "fixed", fontSize: 12,
  }), []);

  const thCell = {
    border: "1px solid #1f3b70", padding: "6px 4px",
    textAlign: "center", whiteSpace: "pre-line",
    fontWeight: 700, background: "#f5f8ff", color: "#0b1f4d",
  };
  const tdCell = {
    border: "1px solid #1f3b70", padding: "6px 4px",
    textAlign: "center", verticalAlign: "middle",
  };
  const inputStyle = {
    width: "100%", boxSizing: "border-box",
    border: "1px solid #c7d2fe", borderRadius: 6,
    padding: "4px 6px", display: "block",
    overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", minWidth: 0,
  };
  const btn = (bg) => ({
    background: bg, color: "#fff", border: "none",
    borderRadius: 10, padding: "10px 14px", fontWeight: 700,
    cursor: "pointer", boxShadow: "0 4px 12px rgba(0,0,0,.15)",
  });

  const colDefs = useMemo(() => ([
    <col key="sl"    style={{ width: 50 }} />,
    <col key="date"  style={{ width: 120 }} />,
    <col key="time"  style={{ width: 100 }} />,
    <col key="prod"  style={{ width: 220 }} />,
    <col key="qty"   style={{ width: 130 }} />,
    <col key="ct"    style={{ width: 110 }} />,
    <col key="conc"  style={{ width: 130 }} />,
    <col key="rem"   style={{ width: 180 }} />,
    <col key="ver"   style={{ width: 150 }} />,
  ]), []);

  function updateRow(idx, key, val) {
    setRows((prev) => {
      const next = [...prev];
      next[idx] = { ...next[idx], [key]: val };
      return next;
    });
  }

  function addRow() {
    setRows((prev) => [...prev, emptyRow()]);
  }

  async function handleSave() {
    const entries = rows.filter((r) =>
      Object.values(r).some((v) => String(v || "").trim() !== "")
    );
    if (entries.length === 0) {
      alert("لا يوجد بيانات للحفظ.");
      return;
    }
    const payload = {
      branch: BRANCH,
      formRef: FORM_REF,
      docMeta: DOC_META,
      methodologyNote: METHODOLOGY_NOTE,
      reportDate,
      month: monthText,
      entries,
      savedAt: Date.now(),
    };
    try {
      setSaving(true);
      const res = await fetch(`${API_BASE}/api/reports`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reporter: "pos19", type: TYPE, payload }),
      });
      if (res.status === 409) { alert("⚠️ يوجد تقرير محفوظ لنفس التاريخ. عدّل التقرير من شاشة العرض (View) أو غيّر التاريخ."); return; }
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      alert("✅ تم الحفظ بنجاح!");
    } catch (e) {
      console.error(e);
      alert("❌ فشل الحفظ. تحقق من السيرفر أو الشبكة.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div style={{ background: "#fff", border: "1px solid #dbe3f4", borderRadius: 12, padding: 16, color: "#0b1f4d" }}>
      <ReportHeader
        title="Sanitation Record (CCP)"
        subtitle="Fruits & Vegetables — Central Kitchen"
        fields={[
          { label: "Document No", value: DOC_META.documentNo },
          { label: "Issue Date", value: DOC_META.issueDate },
          { label: "Revision No", value: DOC_META.revisionNo },
          { label: "Area", value: DOC_META.area },
          { label: "Controlling Officer", value: DOC_META.controllingOfficer },
          { label: "Approved By", value: DOC_META.approvedBy },
          { label: "Branch", value: BRANCH },
          { label: "Report Date", type: "date", value: reportDate, onChange: setReportDate },
        ]}
      />

      {/* Company / report title banner */}
      <div style={{
        textAlign: "center", padding: "10px 12px", marginBottom: 10,
        background: "#1e3a5f", color: "#fff", borderRadius: 8,
        fontWeight: 800, letterSpacing: 0.3,
      }}>
        <div style={{ fontSize: 13 }}>{DOC_META.companyLine}</div>
        <div style={{ fontSize: 15, marginTop: 4 }}>{DOC_META.title}</div>
      </div>

      {/* CCP critical limit banner */}
      <div style={{
        display: "flex", gap: 10, alignItems: "flex-start",
        padding: "12px 14px", background: "#fffbeb",
        border: "1px solid #fde68a", borderLeft: "4px solid #f59e0b",
        borderRadius: 8, color: "#78350f", fontSize: 13, lineHeight: 1.5, marginBottom: 12,
      }}>
        <div style={{ fontSize: 18, lineHeight: 1 }}>⚠️</div>
        <div>
          <strong>CCP — Critical Limit:</strong> Peratek concentration must follow manufacturer instructions.
          Contact times: <b>hard-skin 90 sec</b>, <b>soft-skin 60 sec</b>, <b>leafy 3 min</b>.
          Any deviation requires re-sanitizing and a Corrective Action.
        </div>
      </div>

      {/* Table */}
      <div style={{ overflowX: "auto" }}>
        <table style={gridStyle}>
          <colgroup>{colDefs}</colgroup>
          <thead>
            <tr>
              <th style={thCell}>SL NO</th>
              <th style={thCell}>Date</th>
              <th style={thCell}>Time</th>
              <th style={thCell}>RM / Product Details</th>
              <th style={thCell}>Quantity Sanitized</th>
              <th style={thCell}>Contact Time</th>
              <th style={thCell}>Conc. of Peratek (ppm)</th>
              <th style={thCell}>Remarks / CA</th>
              <th style={thCell}>Verified By / Signature</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, idx) => (
              <tr key={idx}>
                <td style={{ ...tdCell, fontWeight: 700, background: "#f8fafc" }}>{idx + 1}</td>
                <td style={tdCell}><input type="date" value={r.date} onChange={(e) => updateRow(idx, "date", e.target.value)} style={inputStyle} /></td>
                <td style={tdCell}><input type="time" value={r.time} onChange={(e) => updateRow(idx, "time", e.target.value)} style={inputStyle} /></td>
                <td style={tdCell}><input type="text" value={r.productDetails} onChange={(e) => updateRow(idx, "productDetails", e.target.value)} style={inputStyle} placeholder="e.g., Lettuce, Tomato" /></td>
                <td style={tdCell}><input type="text" value={r.quantitySanitized} onChange={(e) => updateRow(idx, "quantitySanitized", e.target.value)} style={inputStyle} placeholder="kg / pcs" /></td>
                <td style={tdCell}>
                  <select value={r.contactTime} onChange={(e) => updateRow(idx, "contactTime", e.target.value)} style={inputStyle}>
                    <option value=""></option>
                    <option value="90 sec (hard-skin)">90 sec (hard-skin)</option>
                    <option value="60 sec (soft-skin)">60 sec (soft-skin)</option>
                    <option value="3 min (leafy)">3 min (leafy)</option>
                  </select>
                </td>
                <td style={tdCell}><input type="number" step="1" value={r.peratekConc} onChange={(e) => updateRow(idx, "peratekConc", e.target.value)} style={inputStyle} placeholder="ppm" /></td>
                <td style={tdCell}><input type="text" value={r.remarks} onChange={(e) => updateRow(idx, "remarks", e.target.value)} style={inputStyle} /></td>
                <td style={tdCell}><input type="text" value={r.verifiedBy} onChange={(e) => updateRow(idx, "verifiedBy", e.target.value)} style={inputStyle} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Add row */}
      <div style={{ marginTop: 8 }}>
        <button onClick={addRow} style={{ ...btn("#0ea5e9"), padding: "6px 10px", fontSize: 12 }}>+ Add Row</button>
      </div>

      {/* Methodology note */}
      <div style={{ marginTop: 14, padding: "10px 12px", background: "#f0f9ff", border: "1px solid #bae6fd", borderRadius: 8, fontSize: 12, color: "#0c4a6e" }}>
        <strong>Sanitizing Methodology:</strong> {METHODOLOGY_NOTE}
      </div>

      {/* Save */}
      <div style={{ display: "flex", gap: 8, marginTop: 16, flexWrap: "wrap" }}>
        <button onClick={handleSave} disabled={saving} style={btn("#2563eb")}>
          {saving ? "Saving…" : "Save Sanitation Record"}
        </button>
      </div>
    </div>
  );
}
