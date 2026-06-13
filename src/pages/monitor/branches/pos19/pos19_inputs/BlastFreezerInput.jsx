// src/pages/monitor/branches/pos19/pos19_inputs/BlastFreezerInput.jsx
import React, { useMemo, useState } from "react";
import ReportHeader from "../_shared/ReportHeader";
import API_BASE from "../../../../../config/api";

const TYPE     = "pos19_blast_freezer_ccp";
const BRANCH   = "POS 19";
const FORM_REF = "TELT/CK/QA/BF/1";

const DOC_META = {
  documentTitle: "Blast Freezer / Chiller Monitoring Log (CCP)",
  documentNo: "TELT/CK/QA/BF/1",
  issueDate: "01/08/2021",
  revisionNo: "0",
  area: "CENTRAL KITCHEN",
  controllingOfficer: "CHEF",
  approvedBy: "Hussam O. Sarhan / Director",
  companyLine: "AL MAWASHI BRAAI RESTAURANT LLC",
  title: "BLAST FREEZER / CHILLER MONITORING LOG (CCP) – CENTRAL KITCHEN",
};

// CCP critical limits (matches company SOP FSM-QM/REC/CHR + TELT/CK/QA/BF/1)
const CCP_LIMITS = {
  chill:  { fromC: 60, toC: 5,   maxMinutes: 90,  cabinetMaxC: -25 },
  freeze: { fromC: 60, toC: -18, maxMinutes: 240, cabinetMaxC: -35 },
};

function diffMinutes(start, end) {
  if (!start || !end) return "";
  const [sh, sm] = start.split(":").map(Number);
  const [eh, em] = end.split(":").map(Number);
  if ([sh, sm, eh, em].some((n) => Number.isNaN(n))) return "";
  let mins = eh * 60 + em - (sh * 60 + sm);
  if (mins < 0) mins += 24 * 60; // crossed midnight
  return mins;
}

function evaluateCCP(row) {
  const cycle = row.cycleType || "";
  const lim = CCP_LIMITS[cycle === "Blast Freeze" ? "freeze" : cycle === "Blast Chill" ? "chill" : null];
  if (!lim) return { ok: null, reason: "" };
  const endT = parseFloat(row.endTemp);
  const dur = typeof row.totalMinutes === "number" ? row.totalMinutes : diffMinutes(row.startTime, row.endTime);
  const cab = parseFloat(row.cabinetTemp);
  const fails = [];
  if (!Number.isNaN(endT) && endT > lim.toC) fails.push(`end-temp > ${lim.toC}°C`);
  if (typeof dur === "number" && dur > lim.maxMinutes) fails.push(`time > ${lim.maxMinutes} min`);
  if (!Number.isNaN(cab) && cab > lim.cabinetMaxC) fails.push(`cabinet > ${lim.cabinetMaxC}°C`);
  return { ok: fails.length === 0, reason: fails.join("; ") };
}

function emptyRow() {
  return {
    cycleType: "",          // Blast Chill | Blast Freeze
    productName: "",
    batchNo: "",
    quantity: "",
    startTime: "",
    startTemp: "",
    endTime: "",
    endTemp: "",
    totalMinutes: "",       // auto-filled
    cabinetTemp: "",        // equipment running temperature
    equipmentId: "",
    ccpMet: "",             // Yes / No
    correctiveAction: "",
    operator: "",
    verifiedBy: "",
  };
}

export default function BlastFreezerInput() {
  const [reportDate, setReportDate] = useState(() => {
    try {
      return new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Dubai" });
    } catch {
      const d = new Date();
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    }
  });

  const ROW_COUNT = 8;
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
    <col key="sl"     style={{ width: 40 }} />,
    <col key="cycle"  style={{ width: 130 }} />,
    <col key="prod"   style={{ width: 180 }} />,
    <col key="batch"  style={{ width: 100 }} />,
    <col key="qty"    style={{ width: 90 }} />,
    <col key="st"     style={{ width: 80 }} />,
    <col key="stT"    style={{ width: 80 }} />,
    <col key="et"     style={{ width: 80 }} />,
    <col key="etT"    style={{ width: 80 }} />,
    <col key="dur"    style={{ width: 80 }} />,
    <col key="cab"    style={{ width: 90 }} />,
    <col key="equip"  style={{ width: 100 }} />,
    <col key="met"    style={{ width: 80 }} />,
    <col key="ca"     style={{ width: 150 }} />,
    <col key="op"     style={{ width: 110 }} />,
    <col key="ver"    style={{ width: 110 }} />,
  ]), []);

  function updateRow(idx, key, val) {
    setRows((prev) => {
      const next = [...prev];
      const updated = { ...next[idx], [key]: val };
      // auto-calc duration when times change
      if (key === "startTime" || key === "endTime") {
        const d = diffMinutes(
          key === "startTime" ? val : updated.startTime,
          key === "endTime"   ? val : updated.endTime,
        );
        updated.totalMinutes = d === "" ? "" : d;
      }
      // auto-evaluate CCP when relevant fields change
      if (["cycleType", "endTemp", "startTime", "endTime", "cabinetTemp"].includes(key)) {
        const { ok } = evaluateCCP(updated);
        if (ok === true) updated.ccpMet = "Yes";
        else if (ok === false) updated.ccpMet = "No";
      }
      next[idx] = updated;
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
      ccpLimits: CCP_LIMITS,
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
        title="Blast Freezer / Chiller Monitoring Log (CCP)"
        subtitle="HACCP-compliant rapid chilling / freezing record"
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

      {/* Banner */}
      <div style={{
        textAlign: "center", padding: "10px 12px", marginBottom: 10,
        background: "#1e3a5f", color: "#fff", borderRadius: 8,
        fontWeight: 800, letterSpacing: 0.3,
      }}>
        <div style={{ fontSize: 13 }}>{DOC_META.companyLine}</div>
        <div style={{ fontSize: 15, marginTop: 4 }}>{DOC_META.title}</div>
      </div>

      {/* CCP critical limits banner */}
      <div style={{
        display: "flex", gap: 10, alignItems: "flex-start",
        padding: "12px 14px", background: "#fffbeb",
        border: "1px solid #fde68a", borderLeft: "4px solid #f59e0b",
        borderRadius: 8, color: "#78350f", fontSize: 13, lineHeight: 1.5, marginBottom: 12,
      }}>
        <div style={{ fontSize: 18, lineHeight: 1 }}>⚠️</div>
        <div>
          <strong>CCP — Critical Limits (HACCP):</strong><br />
          • <b>Blast Chill</b>: from 60°C to <b>≤ 5°C</b> within <b>≤ 90 min</b>; cabinet temperature <b>≤ -25°C</b>.<br />
          • <b>Blast Freeze</b>: from 60°C to <b>≤ -18°C</b> within <b>≤ 240 min</b>; cabinet temperature <b>≤ -35°C</b>.<br />
          Any deviation requires immediate corrective action (re-blast, divert to discard, recall the lot).
        </div>
      </div>

      {/* Table */}
      <div style={{ overflowX: "auto" }}>
        <table style={gridStyle}>
          <colgroup>{colDefs}</colgroup>
          <thead>
            <tr>
              <th style={thCell}>SL</th>
              <th style={thCell}>Cycle Type</th>
              <th style={thCell}>Product Name</th>
              <th style={thCell}>Batch No</th>
              <th style={thCell}>Quantity</th>
              <th style={thCell}>Start Time</th>
              <th style={thCell}>Start Temp (°C)</th>
              <th style={thCell}>End Time</th>
              <th style={thCell}>End Temp (°C)</th>
              <th style={thCell}>Total (min)</th>
              <th style={thCell}>Cabinet Temp (°C)</th>
              <th style={thCell}>Equipment ID</th>
              <th style={thCell}>CCP Met</th>
              <th style={thCell}>Corrective Action</th>
              <th style={thCell}>Operator</th>
              <th style={thCell}>Verified By</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, idx) => {
              const fail = r.ccpMet === "No";
              return (
                <tr key={idx} style={fail ? { background: "#fef2f2" } : undefined}>
                  <td style={{ ...tdCell, fontWeight: 700, background: "#f8fafc" }}>{idx + 1}</td>
                  <td style={tdCell}>
                    <select value={r.cycleType} onChange={(e) => updateRow(idx, "cycleType", e.target.value)} style={inputStyle}>
                      <option value=""></option>
                      <option value="Blast Chill">Blast Chill</option>
                      <option value="Blast Freeze">Blast Freeze</option>
                    </select>
                  </td>
                  <td style={tdCell}><input type="text" value={r.productName} onChange={(e) => updateRow(idx, "productName", e.target.value)} style={inputStyle} /></td>
                  <td style={tdCell}><input type="text" value={r.batchNo} onChange={(e) => updateRow(idx, "batchNo", e.target.value)} style={inputStyle} /></td>
                  <td style={tdCell}><input type="text" value={r.quantity} onChange={(e) => updateRow(idx, "quantity", e.target.value)} style={inputStyle} placeholder="kg / pcs" /></td>
                  <td style={tdCell}><input type="time" value={r.startTime} onChange={(e) => updateRow(idx, "startTime", e.target.value)} style={inputStyle} /></td>
                  <td style={tdCell}><input type="number" step="0.1" value={r.startTemp} onChange={(e) => updateRow(idx, "startTemp", e.target.value)} style={inputStyle} placeholder="°C" /></td>
                  <td style={tdCell}><input type="time" value={r.endTime} onChange={(e) => updateRow(idx, "endTime", e.target.value)} style={inputStyle} /></td>
                  <td style={tdCell}><input type="number" step="0.1" value={r.endTemp} onChange={(e) => updateRow(idx, "endTemp", e.target.value)} style={inputStyle} placeholder="°C" /></td>
                  <td style={{ ...tdCell, background: "#f1f5f9", fontWeight: 700 }}>{r.totalMinutes === "" ? "—" : r.totalMinutes}</td>
                  <td style={tdCell}><input type="number" step="0.1" value={r.cabinetTemp} onChange={(e) => updateRow(idx, "cabinetTemp", e.target.value)} style={inputStyle} placeholder="°C" /></td>
                  <td style={tdCell}><input type="text" value={r.equipmentId} onChange={(e) => updateRow(idx, "equipmentId", e.target.value)} style={inputStyle} placeholder="BF-01" /></td>
                  <td style={{ ...tdCell, fontWeight: 700, color: r.ccpMet === "Yes" ? "#15803d" : r.ccpMet === "No" ? "#b91c1c" : "#475569" }}>
                    {r.ccpMet || "—"}
                  </td>
                  <td style={tdCell}><input type="text" value={r.correctiveAction} onChange={(e) => updateRow(idx, "correctiveAction", e.target.value)} style={inputStyle} /></td>
                  <td style={tdCell}><input type="text" value={r.operator} onChange={(e) => updateRow(idx, "operator", e.target.value)} style={inputStyle} /></td>
                  <td style={tdCell}><input type="text" value={r.verifiedBy} onChange={(e) => updateRow(idx, "verifiedBy", e.target.value)} style={inputStyle} /></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Add row */}
      <div style={{ marginTop: 8 }}>
        <button onClick={addRow} style={{ ...btn("#0ea5e9"), padding: "6px 10px", fontSize: 12 }}>+ Add Cycle</button>
      </div>

      {/* Footer notes */}
      <div style={{ marginTop: 14, padding: "10px 12px", background: "#f0f9ff", border: "1px solid #bae6fd", borderRadius: 8, fontSize: 12, color: "#0c4a6e" }}>
        <strong>Notes:</strong> Use a calibrated probe thermometer (sanitized between products). Insert the probe at the geometric centre of the thickest product piece for an accurate core temperature reading. If a cycle fails the CCP, the lot must be re-blasted, diverted, or discarded — never released to service.
      </div>

      {/* Save */}
      <div style={{ display: "flex", gap: 8, marginTop: 16, flexWrap: "wrap" }}>
        <button onClick={handleSave} disabled={saving} style={btn("#2563eb")}>
          {saving ? "Saving…" : "Save Blast Freezer / Chiller Log"}
        </button>
      </div>
    </div>
  );
}
