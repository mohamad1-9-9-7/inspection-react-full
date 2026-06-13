// src/pages/monitor/branches/pos19/pos19_inputs/DryStoreTempHumidityInput.jsx
import React, { useMemo, useState } from "react";
import ReportHeader from "../_shared/ReportHeader";
import API_BASE from "../../../../../config/api";

const TYPE     = "pos19_dry_store_temp_humidity";
const BRANCH   = "POS 19";
const FORM_REF = "TELT/CK/QA/DR/1";

const DOC_META = {
  documentTitle: "Dry Storage Record",
  documentNo: "TELT/CK/QA/DR/1",
  issueDate: "01/08/2021",
  revisionNo: "2",
  area: "Kitchen",
  issuedBy: "Jaseem P",
  controllingOfficer: "CHEF",
  approvedBy: "Hussam O. Sarhan / Director",
  companyLine: "AL MAWASHI BRAAI RESTAURANT LLC",
  title: "DRY STORE TEMP & HUMIDITY MONITORING RECORD",
};

// HACCP common practice for dry storage:
//   Temp: ≤ 25°C (cool, dry conditions)
//   Humidity: ≤ 60% RH (to inhibit mould / pest activity)
const LIMITS = { tempMaxC: 25, humidityMaxPct: 60 };

function emptyRow() {
  return {
    date: "",
    tempAM: "", humidityAM: "",
    tempPM: "", humidityPM: "",
    stacked: "",       // Yes / No
    properLabel: "",   // Yes / No
    clean: "",         // Yes / No
    correctiveAction: "",
    monitoredBy: "",
  };
}

export default function DryStoreTempHumidityInput() {
  const [reportDate, setReportDate] = useState(() => {
    try { return new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Dubai" }); }
    catch { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; }
  });

  const ROW_COUNT = 15;
  const [rows, setRows] = useState(() => Array.from({ length: ROW_COUNT }, () => emptyRow()));
  const [saving, setSaving] = useState(false);

  const monthText = useMemo(() => {
    const m = String(reportDate || "").match(/^(\d{4})-(\d{2})-\d{2}$/);
    return m ? `${m[2]}/${m[1]}` : "";
  }, [reportDate]);

  const thCell = { border: "1px solid #1f3b70", padding: "6px 4px", textAlign: "center", whiteSpace: "pre-line", fontWeight: 700, background: "#f5f8ff", color: "#0b1f4d" };
  const tdCell = { border: "1px solid #1f3b70", padding: "6px 4px", textAlign: "center", verticalAlign: "middle" };
  const inputStyle = { width: "100%", boxSizing: "border-box", border: "1px solid #c7d2fe", borderRadius: 6, padding: "4px 6px", display: "block", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", minWidth: 0 };
  const btn = (bg) => ({ background: bg, color: "#fff", border: "none", borderRadius: 10, padding: "10px 14px", fontWeight: 700, cursor: "pointer", boxShadow: "0 4px 12px rgba(0,0,0,.15)" });

  function isOutOfLimit(val, kind) {
    const n = parseFloat(val);
    if (Number.isNaN(n)) return false;
    return kind === "temp" ? n > LIMITS.tempMaxC : n > LIMITS.humidityMaxPct;
  }

  function updateRow(idx, key, val) {
    setRows((prev) => {
      const next = [...prev];
      next[idx] = { ...next[idx], [key]: val };
      return next;
    });
  }

  function addRow() { setRows((prev) => [...prev, emptyRow()]); }

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
      limits: LIMITS,
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
        title="Dry Store — Temp & Humidity Monitoring Record"
        subtitle="Central Kitchen — Dry Storage Area"
        fields={[
          { label: "Document No", value: DOC_META.documentNo },
          { label: "Issue Date", value: DOC_META.issueDate },
          { label: "Revision No", value: DOC_META.revisionNo },
          { label: "Area", value: DOC_META.area },
          { label: "Issued By", value: DOC_META.issuedBy },
          { label: "Controlling Officer", value: DOC_META.controllingOfficer },
          { label: "Approved By", value: DOC_META.approvedBy },
          { label: "Branch", value: BRANCH },
          { label: "Report Month / Date", type: "date", value: reportDate, onChange: setReportDate },
        ]}
      />

      {/* Banner */}
      <div style={{
        textAlign: "center", padding: "10px 12px", marginBottom: 10,
        background: "#1e3a5f", color: "#fff", borderRadius: 8,
        fontWeight: 800, letterSpacing: 0.3,
      }}>
        <div style={{ fontSize: 13 }}>{DOC_META.companyLine}</div>
        <div style={{ fontSize: 15, marginTop: 4 }}>{DOC_META.title}</div>
      </div>

      {/* Limits banner */}
      <div style={{
        display: "flex", gap: 10, alignItems: "flex-start",
        padding: "12px 14px", background: "#fffbeb",
        border: "1px solid #fde68a", borderLeft: "4px solid #f59e0b",
        borderRadius: 8, color: "#78350f", fontSize: 13, lineHeight: 1.5, marginBottom: 12,
      }}>
        <div style={{ fontSize: 18, lineHeight: 1 }}>⚠️</div>
        <div>
          <strong>Acceptable Limits (HACCP — Dry Storage):</strong> Temperature <b>≤ 25°C</b>, Humidity <b>≤ 60% RH</b>.
          Items must be stacked off the floor, properly labelled (name + expiry), and the area kept clean and pest-free.
          Any deviation requires a corrective action entry.
        </div>
      </div>

      {/* Table */}
      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", tableLayout: "fixed", fontSize: 12 }}>
          <colgroup>
            <col style={{ width: 40 }} />
            <col style={{ width: 120 }} />
            <col style={{ width: 100 }} />
            <col style={{ width: 100 }} />
            <col style={{ width: 100 }} />
            <col style={{ width: 100 }} />
            <col style={{ width: 100 }} />
            <col style={{ width: 110 }} />
            <col style={{ width: 90 }} />
            <col style={{ width: 180 }} />
            <col style={{ width: 130 }} />
          </colgroup>
          <thead>
            <tr>
              <th style={thCell} rowSpan={2}>SL</th>
              <th style={thCell} rowSpan={2}>Date</th>
              <th style={thCell} colSpan={2}>8:00 AM</th>
              <th style={thCell} colSpan={2}>2:00 PM</th>
              <th style={thCell} rowSpan={2}>Items Stacked{"\n"}on Shelves</th>
              <th style={thCell} rowSpan={2}>Proper{"\n"}Labelling</th>
              <th style={thCell} rowSpan={2}>Clean</th>
              <th style={thCell} rowSpan={2}>Corrective Action</th>
              <th style={thCell} rowSpan={2}>Monitored By</th>
            </tr>
            <tr>
              <th style={thCell}>Temp (°C)</th>
              <th style={thCell}>Humidity (%)</th>
              <th style={thCell}>Temp (°C)</th>
              <th style={thCell}>Humidity (%)</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, idx) => {
              const flagAM_t = isOutOfLimit(r.tempAM, "temp");
              const flagAM_h = isOutOfLimit(r.humidityAM, "humidity");
              const flagPM_t = isOutOfLimit(r.tempPM, "temp");
              const flagPM_h = isOutOfLimit(r.humidityPM, "humidity");
              const fail = flagAM_t || flagAM_h || flagPM_t || flagPM_h ||
                r.stacked === "No" || r.properLabel === "No" || r.clean === "No";
              return (
                <tr key={idx} style={fail ? { background: "#fef2f2" } : undefined}>
                  <td style={{ ...tdCell, fontWeight: 700, background: "#f8fafc" }}>{idx + 1}</td>
                  <td style={tdCell}><input type="date" value={r.date} onChange={(e) => updateRow(idx, "date", e.target.value)} style={inputStyle} /></td>
                  <td style={{ ...tdCell, background: flagAM_t ? "#fde8e8" : "" }}><input type="number" step="0.1" value={r.tempAM} onChange={(e) => updateRow(idx, "tempAM", e.target.value)} style={inputStyle} placeholder="°C" /></td>
                  <td style={{ ...tdCell, background: flagAM_h ? "#fde8e8" : "" }}><input type="number" step="0.1" value={r.humidityAM} onChange={(e) => updateRow(idx, "humidityAM", e.target.value)} style={inputStyle} placeholder="%" /></td>
                  <td style={{ ...tdCell, background: flagPM_t ? "#fde8e8" : "" }}><input type="number" step="0.1" value={r.tempPM} onChange={(e) => updateRow(idx, "tempPM", e.target.value)} style={inputStyle} placeholder="°C" /></td>
                  <td style={{ ...tdCell, background: flagPM_h ? "#fde8e8" : "" }}><input type="number" step="0.1" value={r.humidityPM} onChange={(e) => updateRow(idx, "humidityPM", e.target.value)} style={inputStyle} placeholder="%" /></td>
                  <td style={tdCell}>
                    <select value={r.stacked} onChange={(e) => updateRow(idx, "stacked", e.target.value)} style={inputStyle}>
                      <option value=""></option>
                      <option value="Yes">Yes</option>
                      <option value="No">No</option>
                    </select>
                  </td>
                  <td style={tdCell}>
                    <select value={r.properLabel} onChange={(e) => updateRow(idx, "properLabel", e.target.value)} style={inputStyle}>
                      <option value=""></option>
                      <option value="Yes">Yes</option>
                      <option value="No">No</option>
                    </select>
                  </td>
                  <td style={tdCell}>
                    <select value={r.clean} onChange={(e) => updateRow(idx, "clean", e.target.value)} style={inputStyle}>
                      <option value=""></option>
                      <option value="Yes">Yes</option>
                      <option value="No">No</option>
                    </select>
                  </td>
                  <td style={tdCell}><input type="text" value={r.correctiveAction} onChange={(e) => updateRow(idx, "correctiveAction", e.target.value)} style={inputStyle} /></td>
                  <td style={tdCell}><input type="text" value={r.monitoredBy} onChange={(e) => updateRow(idx, "monitoredBy", e.target.value)} style={inputStyle} /></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div style={{ marginTop: 8 }}>
        <button onClick={addRow} style={{ ...btn("#0ea5e9"), padding: "6px 10px", fontSize: 12 }}>+ Add Row</button>
      </div>

      <div style={{ display: "flex", gap: 8, marginTop: 16, flexWrap: "wrap" }}>
        <button onClick={handleSave} disabled={saving} style={btn("#2563eb")}>
          {saving ? "Saving…" : "Save Dry Store Record"}
        </button>
      </div>
    </div>
  );
}
