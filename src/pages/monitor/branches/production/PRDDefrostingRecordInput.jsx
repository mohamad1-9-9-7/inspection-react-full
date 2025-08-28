// src/pages/monitor/branches/production/PRDDefrostingRecordInput.jsx
import React, { useState } from "react";

const API_BASE =
  (typeof import.meta !== "undefined" && import.meta.env?.VITE_API_URL) ||
  (typeof process !== "undefined" && process.env?.REACT_APP_API_URL) ||
  "https://inspection-server-4nvj.onrender.com";

const TYPE = "prod_defrosting_record";
const today = () => new Date().toISOString().slice(0, 10);

/* ─── Helpers ──────────────────────────────────────────────────────────────── */
function toIsoYMD(value) {
  const s = String(value || "").trim();
  if (!s) return today();
  const normalized = /^\d{4}-\d{2}$/.test(s) ? `${s}-01` : s;
  const d = new Date(normalized);
  if (Number.isNaN(d.getTime())) return today();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${dd}`;
}

/* ─── Row Component ───────────────────────────────────────────────────────── */
function Row({ idx, row, onChange, onRemove, canRemove }) {
  const set = (k, v) => onChange(idx, { ...row, [k]: v });
  return (
    <div className="t-row">
      <input className="cell in" value={row.rawMaterial || ""} onChange={(e) => set("rawMaterial", e.target.value)} />
      <input className="cell in" value={row.quantity || ""} onChange={(e) => set("quantity", e.target.value)} />
      <input className="cell in" value={row.brand || ""} onChange={(e) => set("brand", e.target.value)} />
      <input className="cell in" type="date" value={row.rmProdDate || ""} onChange={(e) => set("rmProdDate", e.target.value)} />
      <input className="cell in" type="date" value={row.rmExpDate || ""} onChange={(e) => set("rmExpDate", e.target.value)} />
      <input className="cell in" type="date" value={row.defStartDate || ""} onChange={(e) => set("defStartDate", e.target.value)} />
      <input className="cell in" type="time" value={row.defStartTime || ""} onChange={(e) => set("defStartTime", e.target.value)} />
      <input className="cell in" value={row.startTemp || ""} onChange={(e) => set("startTemp", e.target.value)} />
      <input className="cell in" type="date" value={row.defEndDate || ""} onChange={(e) => set("defEndDate", e.target.value)} />
      <input className="cell in" type="time" value={row.defEndTime || ""} onChange={(e) => set("defEndTime", e.target.value)} />
      <input className="cell in" value={row.endTemp || ""} onChange={(e) => set("endTemp", e.target.value)} />
      <input className="cell in" value={row.defrostTemp || ""} onChange={(e) => set("defrostTemp", e.target.value)} />
      <input className="cell in" value={row.remarks || ""} onChange={(e) => set("remarks", e.target.value)} />
      <button
        className="cell btn danger no-print"
        title="Remove row"
        disabled={!canRemove}
        onClick={() => onRemove(idx)}
      >
        −
      </button>
    </div>
  );
}

/* ─── Main ────────────────────────────────────────────────────────────────── */
export default function PRDDefrostingRecordInput() {
  // ✅ قيم الترويسة ثابتة وغير قابلة للتعديل
  const ISSUE_DATE_TEXT = "05/05/2022";
  const docNo = "TELT /PROD/ DR";
  const revisionNo = "0";
  const area = "PRODUCTION";
  const issuedBy = "Suresh Sekar";
  const coveringOfficer = "Production Officer";
  const approvedBy = "Hussam O Sarhan";

  const [recordDate, setRecordDate] = useState(today()); // YYYY-MM-DD

  const [checkedBy, setCheckedBy] = useState("");
  const [verifiedBy, setVerifiedBy] = useState("");

  const [entries, setEntries] = useState(
    Array.from({ length: 16 }).map(() => ({
      rawMaterial: "",
      quantity: "",
      brand: "",
      rmProdDate: "",
      rmExpDate: "",
      defStartDate: "",
      defStartTime: "",
      startTemp: "",
      defEndDate: "",
      defEndTime: "",
      endTemp: "",
      defrostTemp: "",
      remarks: "",
    }))
  );
  const [saving, setSaving] = useState(false);

  const chRow = (i, v) => setEntries(entries.map((r, ix) => (ix === i ? v : r)));
  const addRow = () =>
    setEntries([
      ...entries,
      {
        rawMaterial: "",
        quantity: "",
        brand: "",
        rmProdDate: "",
        rmExpDate: "",
        defStartDate: "",
        defStartTime: "",
        startTemp: "",
        defEndDate: "",
        defEndTime: "",
        endTemp: "",
        defrostTemp: "",
        remarks: "",
      },
    ]);
  const rmRow = (i) => setEntries(entries.filter((_, ix) => ix !== i));

  const rowHasData = (r) =>
    [
      "rawMaterial",
      "quantity",
      "brand",
      "rmProdDate",
      "rmExpDate",
      "defStartDate",
      "defStartTime",
      "startTemp",
      "defEndDate",
      "defEndTime",
      "endTemp",
      "defrostTemp",
      "remarks",
    ].some((k) => String(r[k] ?? "").trim() !== "");

  async function save() {
    const reportDate = toIsoYMD(recordDate || ISSUE_DATE_TEXT); // YYYY-MM-DD ثابت
    const cleanEntries = entries.filter(rowHasData);

    if (cleanEntries.length === 0) {
      alert("يرجى إدخال صف واحد على الأقل قبل الحفظ.");
      return;
    }

    try {
      setSaving(true);

      const header = {
        documentTitle: "Defrosting Report",
        documentNo: docNo,
        revisionNo,
        issueDate: ISSUE_DATE_TEXT, // ✅ ثابت بالنص
        area,
        issuedBy,
        coveringOfficer,
        approvedBy,
        reportDate,
      };

      const payload = {
        reportDate,
        header,
        entries: cleanEntries,
        signatures: { checkedBy, verifiedBy },
        savedAt: Date.now(),
      };

      const base = String(API_BASE).replace(/\/$/, "");
      const res = await fetch(`${base}/api/reports`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reporter: "production", type: TYPE, payload }),
      });

      if (!res.ok) throw new Error(`HTTP ${res.status} ${await res.text().catch(() => "")}`);

      alert("Saved ✓ Defrosting Record (PRODUCTION)");
    } catch (e) {
      alert("Error saving: " + (e?.message || String(e)));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="wrap">
      <style>{`
        @media print { .no-print{ display:none !important; } body{ background:#fff; } }
        .wrap{ padding:16px; color:#111827; font-family: Inter, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif; }
        .sheet{ width:100%; background:#fff; margin:0 auto; border:1px solid #111; border-radius:4px; box-shadow:0 10px 24px rgba(0,0,0,.06); }

        .hdrTable, .brandTable, .noteTable{ width:100%; border-collapse:collapse; table-layout:fixed; }
        .hdrTable td, .brandTable td, .noteTable td{ border:1px solid #111; padding:6px 8px; font-size:12px; vertical-align:middle; }
        .logoCell{ width:220px; text-align:center; }
        .logoBlock{ display:flex; flex-direction:column; align-items:center; justify-content:center; height:70px; }
        .logoAR{ font-family: "Cairo", Tahoma, Arial, sans-serif; font-weight:900; font-size:26px; color:#c81e1e; line-height:1; }
        .logoEN{ font-weight:900; font-size:13px; letter-spacing:.6px; color:#111; margin-top:4px; }

        .lbl{ text-decoration:underline; font-weight:800; }
        .brandCellLeft{ width:220px; font-size:18px; font-weight:900; text-decoration:underline; }
        .brandCellRight{ text-align:center; font-weight:900; font-size:20px; }

        .tableWrap{ width:100%; overflow-x:auto; border-top:1px solid #111; }
        .table{ min-width: 1600px; border-left:1px solid #111; }
        .t-head, .t-row{ display:grid; grid-template-columns: 1.4fr .9fr 1.1fr 1.1fr 1.1fr 1.2fr 1fr .9fr 1.2fr 1fr .9fr 1.2fr 1.3fr 40px; align-items:stretch; }
        .t-head{ background:#e5e7eb; border-bottom:1px solid #111; font-size:12px; font-weight:900; text-align:center; }
        .t-head > div{ border-right:1px solid #111; padding:8px 6px; }
        .t-row{ border-bottom:1px solid #111; }
        .cell{ border-right:1px solid #111; padding:2px; display:flex; align-items:center; justify-content:center; }
        .in{ width:100%; padding:6px 8px; border:1px solid #cbd5e1; border-radius:2px; font-weight:700; font-size:12px; background:#fff; }

        .sigRow{ display:grid; grid-template-columns: 1fr 1fr; gap:8px; padding:10px; border-top:1px solid #111; }
        .sig{ border:1px solid #111; padding:10px; min-height:48px; display:flex; align-items:flex-end; gap:10px; }
        .sig label{ font-weight:800; }
        .sig input{ flex:1; border:none; border-bottom:1px solid #111; outline:none; font-weight:800; }

        .topActions.no-print{ display:flex; gap:8px; padding:10px; }
        .btn{ padding:8px 12px; border-radius:6px; border:1px solid #e5e7eb; background:#fff; font-weight:900; cursor:pointer; }
        .btn.primary{ background:#2563eb; color:#fff; border-color:#2563eb; }
        .btn.danger{ background:#fee2e2; color:#991b1b; border-color:#fecaca; }
      `}</style>

      {/* أزرار التحكم (لا تُطبع) */}
      <div className="topActions no-print">
        <button className="btn" onClick={addRow}>+ Add Row</button>
        <div style={{ flex: 1 }} />
        <button className="btn primary" disabled={saving} onClick={save}>
          {saving ? "Saving..." : "Save"}
        </button>
      </div>

      {/* الورقة */}
      <div className="sheet">
        {/* Header (ثابت) */}
        <table className="hdrTable">
          <tbody>
            <tr>
              <td className="logoCell" rowSpan={4}>
                <div className="logoBlock">
                  <div className="logoAR">المواشي</div>
                  <div className="logoEN">AL MAWASHI</div>
                </div>
              </td>
              <td>
                <span className="lbl">Document Title:</span> Defrosting Report
              </td>
              <td>
                <span className="lbl">Document No:</span> {docNo}
              </td>
            </tr>
            <tr>
              <td>
                <span className="lbl">Issue  Date:</span> {ISSUE_DATE_TEXT}
              </td>
              <td>
                <span className="lbl">Revision  No:</span> {revisionNo}
              </td>
            </tr>
            <tr>
              <td>
                <span className="lbl">Area:</span> {area}
              </td>
              <td>
                <span className="lbl">Issued  By:</span> {issuedBy}
              </td>
            </tr>
            <tr>
              <td>
                <span className="lbl">Controlling Officer:</span> {coveringOfficer}
              </td>
              <td>
                <span className="lbl">Approved  By :</span> {approvedBy}
              </td>
            </tr>
          </tbody>
        </table>

        {/* Date + Company */}
        <table className="brandTable" style={{ marginTop: -1 }}>
          <tbody>
            <tr>
              <td className="brandCellLeft">
                <span className="lbl">Date :</span>
                <input
                  className="monthInput"
                  type="date"
                  value={recordDate}
                  onChange={(e) => setRecordDate(e.target.value)}
                />
              </td>
              <td className="brandCellRight">TRANS EMIRATES LIVESTOCK TRADING LLC</td>
            </tr>
          </tbody>
        </table>

        {/* Note */}
        <table className="noteTable" style={{ marginTop: -1 }}>
          <tbody>
            <tr>
              <td style={{ fontSize: 11 }}>
                Should be defrosted under refrigerated condition, product temp should not exceed 5ºC.
                foods should be cooked within 72 hours from the time of the start thawing.
              </td>
            </tr>
          </tbody>
        </table>

        {/* Table */}
        <div className="tableWrap">
          <div className="table">
            <div className="t-head">
              <div>RAW MATERIAL</div>
              <div>QUANTITY</div>
              <div>BRAND</div>
              <div>RM PRODN DATE</div>
              <div>RM EXP DATE</div>
              <div>DEFROST START DATE</div>
              <div>START TIME</div>
              <div>DFRST START TEMP</div>
              <div>DEFROST END DATE</div>
              <div>END TIME</div>
              <div>END TEMP</div>
              <div>DEFROST TEMP (&gt; 5ºC)</div>
              <div>REMARKS</div>
              <div className="no-print"></div>
            </div>

            {entries.map((row, idx) => (
              <Row
                key={idx}
                idx={idx}
                row={row}
                onChange={chRow}
                onRemove={rmRow}
                canRemove={entries.length > 1}
              />
            ))}
          </div>
        </div>

        {/* Signatures */}
        <div className="sigRow">
          <div className="sig">
            <label>Checked By</label>
            <input value={checkedBy} onChange={(e) => setCheckedBy(e.target.value)} />
          </div>
          <div className="sig">
            <label>Verified By</label>
            <input value={verifiedBy} onChange={(e) => setVerifiedBy(e.target.value)} />
          </div>
        </div>
      </div>
    </div>
  );
}
