// src/pages/monitor/branches/production/CleaningChecklistPRDInput.jsx
import React, { useState } from "react";

/* ===== API base (CRA + Vite) ===== */
const API_BASE =
  (typeof import.meta !== "undefined" && import.meta.env?.VITE_API_URL) ||
  (typeof process !== "undefined" && process.env?.REACT_APP_API_URL) ||
  "https://inspection-server-4nvj.onrender.com";

/* ================== الهيدر/الفوتر ================== */
const HEAD_DEFAULT = {
  documentTitle: "Cleaning Checklist",
  documentNo: "FF -QM/REC/CC",
  issueDate: "05/02/2020",
  revisionNo: "0",
  area: "QA",
  issuedBy: "MOHAMAD ABDULLAH",
  controllingOfficer: "Quality Controller",
  approvedBy: "Hussam O.Sarhan",
};
const FOOT_DEFAULT = { checkedBy: "", verifiedBy: "" };

/* ================== التمبلت الصحيح ================== */
const TPL = [
  { no: 1, title: "Hand Washing Area", items: [
    { t: "Hand wash Sink", c: "bh-20 (General purpose) 10 ml/litr/Multi clean" },
    { t: "Hand wash soap available upon the request", c: "" },
    { t: "Tissue available", c: "" },
    { t: "Hair Net available", c: "" },
    { t: "Face Masks available", c: "" },
  ]},
  { no: 2, title: "Meat  Cutting Room", items: [
    { t: "Cutting Tables", c: "bh-30(surface sanitizer)30ml/bottle" },
    { t: "Walls/Floors", c: "bh-20 (General purpose) 10 ml/litr/Multi clean" },
    { t: "Cutting Board", c: "bh-30(surface sanitizer)30ml/bottle" },
    { t: "Drainage", c: "bh-20 (General purpose) 10 ml/litr/Multi clean" },
    { t: "Cutting Knife", c: "bh-30(surface sanitizer)30ml/bottle" },
    { t: "Waste Basket", c: "bh-20 (General purpose) 10 ml/litr/Multi clean" },
    { t: "weighing scales", c: "bh-30(surface sanitizer)30ml/bottle" },
    { t: "Red crates", c: "bh-20 (General purpose) 10 ml/litr/Multi clean" },
    { t: "Door", c: "bh-20 (General purpose) 10 ml/litr/Multi clean" },
  ]},
  { no: 3, title: "Chiller Room 3", items: [
    { t: "Floors", c: "bh-20 (General purpose) 10 ml/litr/Multi clean" },
    { t: "Drainage", c: "bh-20 (General purpose) 10 ml/litr/Multi clean" },
    { t: "Trolley & Racks", c: "bh-20 (General purpose) 10 ml/litr/Multi clean" },
    { t: "Proper arrangement of Products", c: "" },
    { t: "Door", c: "bh-20 (General purpose) 10 ml/litr/Multi clean" },
  ]},
  { no: 4, title: "Chiller Room 4", items: [
    { t: "Floors", c: "bh-20 (General purpose) 10 ml/litr/Multi clean" },
    { t: "Trolley & Racks", c: "bh-20 (General purpose) 10 ml/litr/Multi clean" },
    { t: "Drainage", c: "bh-20 (General purpose) 10 ml/litr/Multi clean" },
    { t: "Proper arrangement of Products", c: "" },
    { t: "Door", c: "bh-20 (General purpose) 10 ml/litr/Multi clean" },
  ]},
  { no: 5, title: "Chiller Room 1", items: [
    { t: "Floors", c: "bh-20 (General purpose) 10 ml/litr/Multi clean" },
    { t: "Trolley & Racks", c: "bh-20 (General purpose) 10 ml/litr/Multi clean" },
    { t: "Drainage", c: "bh-20 (General purpose) 10 ml/litr/Multi clean" },
    { t: "Proper arrangement of Products", c: "" },
    { t: "Door", c: "bh-20 (General purpose) 10 ml/litr/Multi clean" },
  ]},
  { no: 7, title: "Machine Cleanliness", items: [
    { t: "Sausage Machine", c: "bh-20/multi clean & bh-30(surface sanitizer)30ml/bottle" },
    { t: "Mincer", c: "bh-20/multi clean & bh-30(surface sanitizer)30ml/bottle" },
    { t: "Wrapping Machine", c: "bh-20/multi clean & bh-30(surface sanitizer)30ml/bottle" },
    { t: "Bone saw Machine", c: "bh-20/multi clean & bh-30(surface sanitizer)30ml/bottle" },
  ]},
  { no: 8, title: "Packing Store", items: [
    { t: "Master Carton Stacking", c: "" },
    { t: "Polythene bags", c: "" },
    { t: "Floors", c: "bh-20 (General purpose) 10 ml/litr/Multi clean" },
  ]},
  { no: 9, title: "Waste Disposal", items: [
    { t: "Collection of waste", c: "" },
    { t: "Disposal", c: "" },
  ]},
  { no: 10, title: "Working Conditions & Cleanliness", items: [
    { t: "Lights", c: "" },
    { t: "Fly Catchers", c: "" },
    { t: "Floor/wall", c: "bh-20 (General purpose) 10 ml/litr/Multi clean" },
    { t: "Painting and Plastering", c: "" },
    { t: "Weighing Balance", c: "bh-20 (General purpose) 10 ml/litr/Multi clean" },
    { t: "Tap Water", c: "" },
  ]},
];

/* صف جديد حر */
const emptyRow = () => ({
  isSection: false,
  letter: "",
  general: "",
  chemical: "",
  cnc: "",          // C | N\C
  doneBy: "",
  remarks: "",
});

/* بناء صفوف من التمبلت */
function buildDefaultRows() {
  const out = [];
  TPL.forEach((sec) => {
    out.push({ isSection: true, sectionNo: sec.no, section: sec.title });
    sec.items.forEach((it, idx) => {
      out.push({
        ...emptyRow(),
        letter: String.fromCharCode(97 + idx) + ")",
        general: it.t,
        chemical: it.c || "",
      });
    });
  });
  return out;
}

/* =============== الأنماط (مطابقة FTR2) =============== */
const th = (w) => ({
  padding: "6px",
  border: "1px solid #ccc",
  textAlign: "center",
  fontSize: "0.85rem",
  width: w,
});
const tdCenter = () => ({ padding: "6px", border: "1px solid #ccc", textAlign: "center" });
const tdLeft = () => ({ padding: "6px", border: "1px solid #ccc", textAlign: "left" });
const tdHeader = { border: "1px solid #ccc", padding: "4px 6px", fontSize: "0.85rem" };
const inp = { padding: "6px", borderRadius: 6, border: "1px solid #aaa", width: "100%", boxSizing: "border-box" };
const sel = { ...inp, background: "#fff" };
const btnSave = { background: "linear-gradient(180deg,#10b981,#059669)", color: "#fff", border: "none", padding: "12px 22px", borderRadius: 12, cursor: "pointer", fontWeight: 800 };

/* ================== المكوّن ================== */
export default function CleaningChecklistPRDInput() {
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [rows] = useState(buildDefaultRows()); // أسطر ثابتة
  const [header] = useState(HEAD_DEFAULT);
  const [footer, setFooter] = useState(FOOT_DEFAULT);
  const [saving, setSaving] = useState(false);
  const [opMsg, setOpMsg] = useState("");

  const onCell = (i, k, v) =>
    setRowsStateError(); // مكان حفظ الأسطر ثابت—لا تعديل للبنية (نعدّل القيم فقط عبر onChange أدناه)

  // لأننا ثبتنا rows كقيمة ثابتة، نحتاج محدثًا داخليًا للقيم فقط:
  const [rowsState, setRowsState] = useState(() => buildDefaultRows());
  const setRows = (fn) => setRowsState((prev) => fn(prev));
  const onVal = (i, k, v) => setRows((p) => { const a = [...p]; a[i] = { ...a[i], [k]: v }; return a; });

  async function saveToServer() {
    try {
      setSaving(true);
      setOpMsg("⏳ Saving...");
      const payload = {
        reportDate: date,
        entries: rowsState,
        header,
        footer,
        savedAt: Date.now(),
      };
      const res = await fetch(`${API_BASE.replace(/\/$/, "")}/api/reports`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reporter: "production", type: "prod_cleaning_checklist", payload }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setOpMsg("✅ Saved ✓ Cleaning Checklist (PRD)");
    } catch (e) {
      setOpMsg("❌ Error: " + (e?.message || e));
    } finally {
      setSaving(false);
      setTimeout(() => setOpMsg(""), 4000);
    }
  }

  return (
    <div style={{ padding: "1rem", background: "#fff", borderRadius: 12 }}>
      {/* Header */}
      <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: "0.6rem" }}>
        <tbody>
          <tr>
            <td style={tdHeader}><strong>Document Title:</strong> {header.documentTitle}</td>
            <td style={tdHeader}><strong>Document No:</strong> {header.documentNo}</td>
          </tr>
          <tr>
            <td style={tdHeader}><strong>Issue Date:</strong> {header.issueDate}</td>
            <td style={tdHeader}><strong>Revision No:</strong> {header.revisionNo}</td>
          </tr>
          <tr>
            <td style={tdHeader}><strong>Area:</strong> {header.area}</td>
            <td style={tdHeader}><strong>Issued By:</strong> {header.issuedBy}</td>
          </tr>
          <tr>
            <td style={tdHeader}><strong>Controlling Officer:</strong> {header.controllingOfficer}</td>
            <td style={tdHeader}><strong>Approved By:</strong> {header.approvedBy}</td>
          </tr>
        </tbody>
      </table>

      <h3 style={{ textAlign: "center", background: "#e5e7eb", padding: 6, marginBottom: 8 }}>
        TRANS EMIRATES LIVESTOCK TRADING LLC
        <br />
        CLEANING CHECKLIST
      </h3>

      {/* Date فقط */}
      <div style={{ display: "flex", gap: 12, alignItems: "center", justifyContent: "flex-end", flexWrap: "wrap", marginBottom: 8 }}>
        <label style={{ fontWeight: 800 }}>
          Date:{" "}
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} style={{ padding: "6px 10px", borderRadius: 8, border: "1px solid #cbd5e1" }} />
        </label>
      </div>

      {/* Table */}
      <table style={{ width: "100%", borderCollapse: "collapse", tableLayout: "fixed" }}>
        <thead>
          <tr style={{ background: "#2980b9", color: "#fff" }}>
            <th style={th(70)}>SI-No</th>
            <th style={th(360)}>General Cleaning</th>
            <th style={th(280)}>Chemical &amp; Concentration</th>
            <th style={th(80)}>C/NC</th>
            <th style={th(180)}>Done By:</th>
            <th style={th(300)}>Remarks &amp; CA</th>
          </tr>
        </thead>
        <tbody>
          {rowsState.map((r, i) => {
            if (r.isSection) {
              return (
                <tr key={`sec-${i}`} style={{ background: "#f3f4f6", fontWeight: 800 }}>
                  <td style={tdCenter()}>{r.sectionNo}</td>
                  <td style={{ ...tdLeft(), fontWeight: 800 }}>{r.section}</td>
                  <td style={tdCenter()}>—</td>
                  <td style={tdCenter()}>—</td>
                  <td style={tdCenter()}>—</td>
                  <td style={tdCenter()}>—</td>
                </tr>
              );
            }
            return (
              <tr key={i}>
                <td style={tdCenter()}>{r.letter || "—"}</td>
                <td style={tdLeft()}>
                  <div style={{ width: "100%", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }} title={r.general || ""}>
                    {r.general || ""}
                  </div>
                </td>
                <td style={tdLeft()}>
                  <input value={r.chemical || ""} onChange={(e) => onVal(i, "chemical", e.target.value)} style={inp} />
                </td>
                <td style={tdCenter()}>
                  <select value={r.cnc || ""} onChange={(e) => onVal(i, "cnc", e.target.value)} style={sel}>
                    <option value=""></option>
                    <option value="C">C</option>
                    <option value={"N\\C"}>N\C</option>
                  </select>
                </td>
                <td style={tdLeft()}>
                  <input value={r.doneBy || ""} onChange={(e) => onVal(i, "doneBy", e.target.value)} style={inp} />
                </td>
                <td style={tdLeft()}>
                  <input value={r.remarks || ""} onChange={(e) => onVal(i, "remarks", e.target.value)} style={inp} />
                </td>
              </tr>
            );
          })}
          {rowsState.length === 0 && (
            <tr>
              <td colSpan={6} style={{ ...tdCenter(), color: "#6b7280" }}>
                No rows.
              </td>
            </tr>
          )}
        </tbody>
      </table>

      {/* Footer */}
      <div style={{ marginTop: "1rem", fontWeight: 900 }}>REMARKS/CORRECTIVE ACTIONS:</div>
      <div style={{ display: "flex", justifyContent: "space-between", marginTop: "1rem", fontWeight: 700, gap: 12, flexWrap: "wrap" }}>
        <div>CHECKED BY:{" "}
          <input type="text" value={footer.checkedBy} onChange={(e) => setFooter((f) => ({ ...f, checkedBy: e.target.value }))} style={{ ...inp, minWidth: 180 }} />
        </div>
        <div>VERIFIED BY:{" "}
          <input type="text" value={footer.verifiedBy} onChange={(e) => setFooter((f) => ({ ...f, verifiedBy: e.target.value }))} style={{ ...inp, minWidth: 180 }} />
        </div>
      </div>
      <div style={{ marginTop: "0.4rem", fontSize: "0.9rem" }}>
        Remark:-Frequency-Daily &nbsp;&nbsp;&nbsp; *(C = Conform &nbsp;&nbsp; N / C = Non Conform)
      </div>

      {/* Save */}
      <div style={{ textAlign: "center", marginTop: 16 }}>
        <button onClick={saveToServer} disabled={saving} style={btnSave}>
          {saving ? "⏳ Saving..." : "💾 Save Report"}
        </button>
        {opMsg && (
          <div style={{ marginTop: 10, fontWeight: 700, color: opMsg.startsWith("❌") ? "#b91c1c" : "#065f46" }}>
            {opMsg}
          </div>
        )}
      </div>
    </div>
  );
}

/* helper to keep rows immutable structure warning-free */
function setRowsStateError() {
  // متروك عمداً لمنع استخدام onCell القديم بعد تثبيت الأسطر
}
