// src/pages/monitor/branches/pos19/pos19_inputs/FinishedProductMonitoringInput.jsx
import React, { useMemo, useState } from "react";
import ReportHeader from "../_shared/ReportHeader";
import API_BASE from "../../../../../config/api";

const TYPE     = "pos19_finished_product_monitoring";
const BRANCH   = "POS 19";
const FORM_REF = "TELT/QA/FP/1";

const DOC_META = {
  documentTitle: "Finished Product Monitoring Checklist",
  documentNo: "TELT/QA/FP/1",
  issueDate: "05/02/2020",
  revisionNo: "0",
  area: "QA",
  issuedBy: "MOHAMAD ABDULLAH QA",
  controllingOfficer: "QC Assistant",
  approvedBy: "Hussam O. Sarhan / Director",
  companyLine: "TRANS EMIRATES LIVESTOCK TRADING LLC",
  title: "FINISHED PRODUCT MONITORING CHECKLIST – AL MAWASHI BRAAI",
};

function emptyRow() {
  return {
    productName: "",
    customerName: "",
    time: "",
    productionDate: "",
    expDate: "",
    temp: "",
    quantity: "",
    overallCondition: "",
    remarks: "",
  };
}

export default function FinishedProductMonitoringInput() {
  const [reportDate, setReportDate] = useState(() => {
    try {
      return new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Dubai" });
    } catch {
      const d = new Date();
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    }
  });

  const ROW_COUNT = 15;
  const [rows, setRows] = useState(() => Array.from({ length: ROW_COUNT }, () => emptyRow()));
  const [correctiveActions, setCorrectiveActions] = useState("");
  const [checkedBy, setCheckedBy] = useState("");
  const [verifiedBy, setVerifiedBy] = useState("");
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
    <col key="sl"      style={{ width: 50 }} />,
    <col key="prod"    style={{ width: 200 }} />,
    <col key="cust"    style={{ width: 180 }} />,
    <col key="time"    style={{ width: 100 }} />,
    <col key="pdate"   style={{ width: 130 }} />,
    <col key="edate"   style={{ width: 130 }} />,
    <col key="temp"    style={{ width: 90 }} />,
    <col key="qty"     style={{ width: 100 }} />,
    <col key="cond"    style={{ width: 140 }} />,
    <col key="rem"     style={{ width: 180 }} />,
  ]), []);

  function updateRow(idx, key, val) {
    setRows((prev) => {
      const next = [...prev];
      next[idx] = { ...next[idx], [key]: val };
      return next;
    });
  }

  async function handleSave() {
    const entries = rows.filter((r) =>
      Object.values(r).some((v) => String(v || "").trim() !== "")
    );
    if (entries.length === 0 && !correctiveActions.trim() && !checkedBy.trim() && !verifiedBy.trim()) {
      alert("لا يوجد بيانات للحفظ.");
      return;
    }
    const payload = {
      branch: BRANCH,
      formRef: FORM_REF,
      docMeta: DOC_META,
      reportDate,
      month: monthText,
      entries,
      correctiveActions,
      checkedBy,
      verifiedBy,
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

  function addRow() {
    setRows((prev) => [...prev, emptyRow()]);
  }

  return (
    <div style={{ background: "#fff", border: "1px solid #dbe3f4", borderRadius: 12, padding: 16, color: "#0b1f4d" }}>
      <ReportHeader
        title="Finished Product Monitoring Checklist"
        subtitle="Al Mawashi Braai"
        fields={[
          { label: "Document No", value: DOC_META.documentNo },
          { label: "Issue Date", value: DOC_META.issueDate },
          { label: "Revision No", value: DOC_META.revisionNo },
          { label: "Area", value: DOC_META.area },
          { label: "Issued By", value: DOC_META.issuedBy },
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

      {/* Table */}
      <div style={{ overflowX: "auto" }}>
        <table style={gridStyle}>
          <colgroup>{colDefs}</colgroup>
          <thead>
            <tr>
              <th style={thCell}>SL NO</th>
              <th style={thCell}>Product Name</th>
              <th style={thCell}>Customer Name</th>
              <th style={thCell}>Time</th>
              <th style={thCell}>Production Date</th>
              <th style={thCell}>Exp Date</th>
              <th style={thCell}>Temp (°C)</th>
              <th style={thCell}>Quantity</th>
              <th style={thCell}>Overall Condition</th>
              <th style={thCell}>Remarks</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, idx) => (
              <tr key={idx}>
                <td style={{ ...tdCell, fontWeight: 700, background: "#f8fafc" }}>{idx + 1}</td>
                <td style={tdCell}><input type="text" value={r.productName} onChange={(e) => updateRow(idx, "productName", e.target.value)} style={inputStyle} /></td>
                <td style={tdCell}><input type="text" value={r.customerName} onChange={(e) => updateRow(idx, "customerName", e.target.value)} style={inputStyle} /></td>
                <td style={tdCell}><input type="time" value={r.time} onChange={(e) => updateRow(idx, "time", e.target.value)} style={inputStyle} /></td>
                <td style={tdCell}><input type="date" value={r.productionDate} onChange={(e) => updateRow(idx, "productionDate", e.target.value)} style={inputStyle} /></td>
                <td style={tdCell}><input type="date" value={r.expDate} onChange={(e) => updateRow(idx, "expDate", e.target.value)} style={inputStyle} /></td>
                <td style={tdCell}><input type="number" step="0.1" value={r.temp} onChange={(e) => updateRow(idx, "temp", e.target.value)} style={inputStyle} placeholder="°C" /></td>
                <td style={tdCell}><input type="text" value={r.quantity} onChange={(e) => updateRow(idx, "quantity", e.target.value)} style={inputStyle} /></td>
                <td style={tdCell}>
                  <select value={r.overallCondition} onChange={(e) => updateRow(idx, "overallCondition", e.target.value)} style={inputStyle}>
                    <option value=""></option>
                    <option value="Acceptable">Acceptable</option>
                    <option value="Not Acceptable">Not Acceptable</option>
                  </select>
                </td>
                <td style={tdCell}><input type="text" value={r.remarks} onChange={(e) => updateRow(idx, "remarks", e.target.value)} style={inputStyle} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Add row */}
      <div style={{ marginTop: 8 }}>
        <button onClick={addRow} style={{ ...btn("#0ea5e9"), padding: "6px 10px", fontSize: 12 }}>+ Add Row</button>
      </div>

      {/* Remarks / Corrective Actions */}
      <div style={{ marginTop: 14 }}>
        <div style={{ fontWeight: 700, marginBottom: 6, fontSize: 13 }}>Remarks / Corrective Actions:</div>
        <textarea
          value={correctiveActions}
          onChange={(e) => setCorrectiveActions(e.target.value)}
          rows={3}
          style={{
            width: "100%", boxSizing: "border-box",
            border: "1px solid #c7d2fe", borderRadius: 8,
            padding: "8px 10px", fontSize: 13, color: "#0b1f4d", resize: "vertical",
          }}
        />
      </div>

      {/* Footer: Checked / Verified */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginTop: 14, fontSize: 13 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <strong>Checked By:</strong>
          <input value={checkedBy} onChange={(e) => setCheckedBy(e.target.value)} style={{ flex: 1, border: "none", borderBottom: "2px solid #1f3b70", padding: "4px 6px", outline: "none", fontSize: 13, color: "#0b1f4d" }} />
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <strong>Verified By:</strong>
          <input value={verifiedBy} onChange={(e) => setVerifiedBy(e.target.value)} style={{ flex: 1, border: "none", borderBottom: "2px solid #1f3b70", padding: "4px 6px", outline: "none", fontSize: 13, color: "#0b1f4d" }} />
        </div>
      </div>

      {/* Save */}
      <div style={{ display: "flex", gap: 8, marginTop: 16, flexWrap: "wrap" }}>
        <button onClick={handleSave} disabled={saving} style={btn("#2563eb")}>
          {saving ? "Saving…" : "Save Finished Product Checklist"}
        </button>
      </div>
    </div>
  );
}
