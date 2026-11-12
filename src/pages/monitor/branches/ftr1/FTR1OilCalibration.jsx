// src/pages/monitor/branches/ftr1/FTR1OilCalibration.jsx
//
// FTR 1 — Oil Quality Monitoring, measured with the Testo oil tester.
//   • one report date at the top (no date per row); one record per day — a
//     date that already has a record opens it and the save updates it
//   • a row per measurement: fryer, time, TPM %, oil °C → Good / Change soon /
//     Discard (ftr1Oil.js), action taken + corrective action
//   • "Change soon" needs a corrective action; "Discard" needs the oil changed
//   • saves through the offline outbox; FTR 1 signature block
//   • every row also keeps the old date / result / action text, so the
//     viewer's older layout and the Excel backup keep reading it
import React, { useEffect, useMemo, useRef, useState } from "react";
import { saveReport, queuedMessage } from "../../../../utils/reportOutbox";
import { getReportRowByDate, payloadOf, reportId } from "../_shared/reportApi";
import { useStaffDirectory } from "../_shared/staffRegistry";
import { useFtrSignatures, FtrSignatureBlock } from "./ftr1Signatures";
import {
  OIL_TYPE, TPM_LIMITS, OIL_TEMP_RANGE, FRYERS, ACTIONS, tpmStatus, legacyText,
} from "./ftr1Oil";

const todayDubai = () => {
  try { return new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Dubai" }); }
  catch { return new Date().toISOString().slice(0, 10); }
};
const nowHM = () => {
  try { return new Date().toLocaleTimeString("en-GB", { timeZone: "Asia/Dubai", hour: "2-digit", minute: "2-digit" }); }
  catch { return ""; }
};
const blankRow = (fryer = FRYERS[0]) => ({ fryer, time: nowHM(), tpm: "", oilTemp: "", action: "", correctiveAction: "" });
const filled = (v) => String(v ?? "").trim() !== "";
const numOrNull = (v) => (filled(v) && !Number.isNaN(Number(v)) ? Number(v) : null);

export default function FTR1OilCalibration() {
  const [reportDate, setReportDate] = useState(todayDubai);
  const [rows, setRows] = useState(() => FRYERS.map((f) => blankRow(f)));
  const [notes, setNotes] = useState("");
  const [recordId, setRecordId] = useState(null);
  const [dayBusy, setDayBusy] = useState(false);
  const [dayError, setDayError] = useState("");
  const [saving, setSaving] = useState(false);
  const [opMsg, setOpMsg] = useState("");

  const sig = useFtrSignatures(useStaffDirectory(), { verifiedKey: "verifiedBy" });
  const sigRef = useRef(sig);
  sigRef.current = sig;

  /* Open the day's record when the date changes. */
  useEffect(() => {
    let abort = false;
    setDayError("");
    setRecordId(null);
    if (!reportDate) return undefined;
    setDayBusy(true);
    getReportRowByDate(OIL_TYPE, reportDate)
      .then((row) => {
        if (abort) return;
        if (!row) {
          setRows(FRYERS.map((f) => blankRow(f)));
          setNotes("");
          return;
        }
        const p = payloadOf(row) || {};
        setRecordId(reportId(row));
        const saved = Array.isArray(p.readings) ? p.readings : [];
        setRows(saved.length ? saved.map((r) => ({ ...blankRow(r.fryer), ...r })) : FRYERS.map((f) => blankRow(f)));
        setNotes(p.notes || "");
        const s = sigRef.current;
        if (!s.creatorNo && !s.checkedNo) s.load(p);
      })
      .catch(() => { if (!abort) setDayError("⚠️ Could not check this day on the server — saving is blocked until it loads."); })
      .finally(() => { if (!abort) setDayBusy(false); });
    return () => { abort = true; };
  }, [reportDate]);

  const setCell = (i, k, v) => setRows((prev) => prev.map((r, j) => (j === i ? { ...r, [k]: v } : r)));
  const addRow = () => setRows((prev) => [...prev, blankRow(prev[prev.length - 1]?.fryer || FRYERS[0])]);
  const removeRow = (i) => setRows((prev) => (prev.length > 1 ? prev.filter((_, j) => j !== i) : prev));

  const used = rows.filter((r) => filled(r.tpm) || filled(r.oilTemp));
  const summary = useMemo(() => {
    const tpms = used.map((r) => numOrNull(r.tpm)).filter((v) => v != null);
    return {
      count: used.length,
      worst: tpms.length ? Math.max(...tpms) : null,
      warn: used.filter((r) => tpmStatus(r.tpm).key === "warn").length,
      discard: used.filter((r) => tpmStatus(r.tpm).key === "discard").length,
    };
  }, [used]);

  /* ---- validation ---- */
  const errors = [];
  if (!reportDate) errors.push("Choose the report date.");
  if (dayError) errors.push("The day could not be checked on the server — reload and try again.");
  if (!used.length) errors.push("Enter at least one Testo reading.");
  used.forEach((r) => {
    const i = rows.indexOf(r) + 1;
    const tpm = numOrNull(r.tpm);
    const t = numOrNull(r.oilTemp);
    if (!filled(r.fryer)) errors.push(`Row ${i}: choose the fryer.`);
    if (!filled(r.time)) errors.push(`Row ${i}: enter the time of the reading.`);
    if (tpm == null || tpm < 0 || tpm > 40) errors.push(`Row ${i}: TPM must be a number between 0 and 40 %.`);
    if (t == null || t < OIL_TEMP_RANGE.min || t > OIL_TEMP_RANGE.max)
      errors.push(`Row ${i}: oil temperature must be ${OIL_TEMP_RANGE.min}–${OIL_TEMP_RANGE.max} °C (the tester only reads hot oil).`);
    const st = tpmStatus(r.tpm).key;
    if (st === "discard" && r.action !== "changed") errors.push(`Row ${i}: TPM above ${TPM_LIMITS.discard}% — the oil must be changed (Action: Oil changed).`);
    if (st === "warn" && !filled(r.correctiveAction) && !r.action) errors.push(`Row ${i}: TPM ${TPM_LIMITS.warn}% or more — record the action / corrective action.`);
  });
  const allErrors = [...errors, ...sig.errors];

  const handleSave = async () => {
    if (allErrors.length) {
      alert("⚠️ Please fix:\n\n- " + allErrors.join("\n- "));
      return;
    }
    const signed = sig.fields();
    const readings = used.map((r) => ({
      fryer: String(r.fryer).trim(),
      time: r.time,
      tpm: numOrNull(r.tpm),
      oilTemp: numOrNull(r.oilTemp),
      status: tpmStatus(r.tpm).key,
      action: r.action,
      correctiveAction: String(r.correctiveAction || "").trim(),
    }));
    const payload = {
      branch: "FTR 1",
      reportDate,
      device: "Testo oil tester",
      limits: TPM_LIMITS,
      readings,
      notes: notes.trim(),
      // older viewer / Excel backup shape
      entries: readings.map((r) => ({ date: reportDate, ...legacyText(r), checkedBy: signed.checkedBy, verifiedBy: signed.verifiedBy })),
      ...signed,
      savedAt: Date.now(),
    };
    setSaving(true);
    setOpMsg("⏳ Saving...");
    try {
      const body = { reporter: "ftr1", type: OIL_TYPE, payload };
      const r = await saveReport(recordId ? { body, id: recordId, label: `FTR 1 Oil ${reportDate}` } : { body, label: `FTR 1 Oil ${reportDate}` });
      if (!recordId && !r.queued) {
        const row = await getReportRowByDate(OIL_TYPE, reportDate).catch(() => null);
        if (row) setRecordId(reportId(row));
      }
      setOpMsg(r.queued ? queuedMessage("en") : recordId ? "✅ Saved — the day's report was updated." : "✅ Saved successfully!");
    } catch (e) {
      console.error(e);
      setOpMsg(`❌ Failed to save. ${e?.message || ""}`);
    } finally {
      setSaving(false);
      setTimeout(() => setOpMsg(""), 5000);
    }
  };

  return (
    <div style={shell}>
      {/* Document header */}
      <table style={docTable}>
        <tbody>
          <tr>
            <td style={docCell}><b>Document Title:</b> Oil Quality Monitoring Form</td>
            <td style={docCell}><b>Document No:</b> FS-QM/REC/TR/1</td>
          </tr>
          <tr>
            <td style={docCell}><b>Issue Date:</b> 05/02/2020</td>
            <td style={docCell}><b>Revision No:</b> 1</td>
          </tr>
          <tr>
            <td style={docCell}><b>Area:</b> FTR 1 — Mushrif Park</td>
            <td style={docCell}><b>Issued By:</b> MOHAMAD ABDULLAH QC</td>
          </tr>
          <tr>
            <td style={docCell}><b>Controlling Officer:</b> QA</td>
            <td style={docCell}><b>Approved By:</b> Hussam O. Sarhan</td>
          </tr>
        </tbody>
      </table>

      <div style={band}>AL MAWASHI BRAAI KITCHEN — OIL QUALITY MONITORING (TESTO OIL TESTER)</div>

      {/* Date + day status */}
      <div style={dateRow}>
        <label style={{ fontWeight: 700 }}>📅 Date:</label>
        <input type="date" value={reportDate} onChange={(e) => setReportDate(e.target.value)} style={fieldInput} />
        {dayBusy && <span style={{ color: "#6b7280", fontWeight: 600 }}>Checking…</span>}
        {!dayBusy && dayError && <span style={{ color: "#b45309", fontWeight: 700 }}>{dayError}</span>}
        {!dayBusy && !dayError && reportDate && (
          recordId
            ? <span style={{ ...pill, background: "#dbeafe", color: "#1e40af" }}>📝 This day's report is open — saving updates it</span>
            : <span style={{ ...pill, background: "#dcfce7", color: "#166534" }}>✅ New report for this day</span>
        )}
      </div>

      {/* How to measure + limits */}
      <div style={rulesBox}>
        <div style={{ fontWeight: 800, marginBottom: 4 }}>How to measure (Testo oil tester)</div>
        <div>1. Measure in hot oil ({OIL_TEMP_RANGE.min}–{OIL_TEMP_RANGE.max} °C), with the fryer switched off or not frying, and no food in the basket.</div>
        <div>2. Dip the sensor between the minimum and maximum marks, move it gently, and wait until the reading is stable.</div>
        <div>3. Record the TPM % and the oil temperature shown, then wipe the sensor with a paper towel (never water).</div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 8 }}>
          <span style={{ ...pill, background: "#dcfce7", color: "#166534" }}>Good: below {TPM_LIMITS.warn}% TPM</span>
          <span style={{ ...pill, background: "#fef3c7", color: "#92400e" }}>Change soon: {TPM_LIMITS.warn}–{TPM_LIMITS.discard}% — filter / plan the change</span>
          <span style={{ ...pill, background: "#fee2e2", color: "#991b1b" }}>Discard: above {TPM_LIMITS.discard}% — change the oil now</span>
        </div>
      </div>

      {/* Summary */}
      <div style={tiles}>
        <Tile label="Readings" value={summary.count} />
        <Tile label="Highest TPM" value={summary.worst == null ? "—" : `${summary.worst}%`} tone={summary.worst == null ? "" : tpmStatus(summary.worst).key === "ok" ? "ok" : "bad"} />
        <Tile label="Change soon" value={summary.warn} tone={summary.warn ? "warn" : "ok"} />
        <Tile label="Discard" value={summary.discard} tone={summary.discard ? "bad" : "ok"} />
      </div>

      {/* Readings */}
      <div style={tableFrame}>
        <table style={grid}>
          <thead>
            <tr>
              <th style={thW(46)}>#</th>
              <th style={thW(150)}>Fryer</th>
              <th style={thW(110)}>Time</th>
              <th style={thW(120)}>TPM %</th>
              <th style={thW(120)}>Oil temp °C</th>
              <th style={thW(130)}>Result</th>
              <th style={thW(220)}>Action taken</th>
              <th style={thW(260)}>Corrective action / notes</th>
              <th style={thW(48)} aria-label="Remove row"></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => {
              const st = tpmStatus(r.tpm);
              const tBad = filled(r.oilTemp) && (Number(r.oilTemp) < OIL_TEMP_RANGE.min || Number(r.oilTemp) > OIL_TEMP_RANGE.max);
              return (
                <tr key={i} style={{ background: st.key === "discard" ? "#fff5f5" : i % 2 ? "#f8fafc" : "#fff" }}>
                  <td style={{ ...td, color: "#64748b", fontWeight: 700 }}>{i + 1}</td>
                  <td style={td}>
                    <input list="ftr1-fryers" value={r.fryer} onChange={(e) => setCell(i, "fryer", e.target.value)} style={cellInput} />
                  </td>
                  <td style={td}>
                    <input type="time" value={r.time} onChange={(e) => setCell(i, "time", e.target.value)} style={cellInput} />
                  </td>
                  <td style={td}>
                    <input type="number" inputMode="decimal" step="0.5" min="0" max="40" placeholder="e.g. 12.5"
                      value={r.tpm} onChange={(e) => setCell(i, "tpm", e.target.value)}
                      style={{ ...cellInput, textAlign: "center", fontWeight: 800, borderColor: st.key === "discard" ? "#ef4444" : st.key === "warn" ? "#f59e0b" : "#cbd5e1" }} />
                  </td>
                  <td style={td}>
                    <input type="number" inputMode="decimal" step="1" placeholder="e.g. 170"
                      value={r.oilTemp} onChange={(e) => setCell(i, "oilTemp", e.target.value)}
                      style={{ ...cellInput, textAlign: "center", borderColor: tBad ? "#ef4444" : "#cbd5e1" }} />
                  </td>
                  <td style={td}>
                    <span style={{ ...pill, display: "inline-block", minWidth: 96, textAlign: "center", background: st.bg, color: st.color }}>{st.label}</span>
                  </td>
                  <td style={td}>
                    <select value={r.action} onChange={(e) => setCell(i, "action", e.target.value)}
                      style={{ ...cellInput, borderColor: st.key === "discard" && r.action !== "changed" ? "#ef4444" : "#cbd5e1" }}>
                      {ACTIONS.map((a) => <option key={a.key} value={a.key}>{a.label}</option>)}
                    </select>
                  </td>
                  <td style={td}>
                    <input value={r.correctiveAction} onChange={(e) => setCell(i, "correctiveAction", e.target.value)}
                      placeholder={st.key && st.key !== "ok" ? "Required — what was done" : "Optional"}
                      style={{ ...cellInput, borderColor: st.key === "warn" && !r.action && !filled(r.correctiveAction) ? "#ef4444" : "#cbd5e1" }} />
                  </td>
                  <td style={td}>
                    <button type="button" onClick={() => removeRow(i)} disabled={rows.length <= 1} title="Remove row" style={removeBtn}>✖</button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        <datalist id="ftr1-fryers">{FRYERS.map((f) => <option key={f} value={f} />)}</datalist>
      </div>

      <button type="button" onClick={addRow} style={addBtn}>＋ Add reading</button>

      <div style={{ marginTop: 12 }}>
        <label style={{ fontWeight: 700, display: "block", marginBottom: 6 }}>General notes</label>
        <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} placeholder="Optional" style={{ ...cellInput, height: "auto", padding: 10, width: "100%" }} />
      </div>

      <FtrSignatureBlock sig={sig} />

      {allErrors.length > 0 && (
        <div style={errorBox}>
          ⚠️ Before saving:
          <ul style={{ margin: "6px 0 0", paddingInlineStart: 20 }}>{allErrors.map((e) => <li key={e}>{e}</li>)}</ul>
        </div>
      )}

      <div style={{ display: "flex", justifyContent: "flex-end", alignItems: "center", gap: 12, marginTop: 12 }}>
        {opMsg && <span style={{ fontWeight: 700, color: opMsg.startsWith("❌") ? "#b91c1c" : "#065f46" }}>{opMsg}</span>}
        <button onClick={handleSave} disabled={saving || dayBusy} style={{ ...saveBtn, opacity: allErrors.length || saving ? 0.75 : 1 }}>
          {saving ? "Saving…" : recordId ? "💾 Update day's report" : "💾 Save report"}
        </button>
      </div>
    </div>
  );
}

function Tile({ label, value, tone = "" }) {
  const map = { ok: ["#166534", "#f0fdf4"], bad: ["#b91c1c", "#fef2f2"], warn: ["#92400e", "#fffbeb"] };
  const [color, bg] = map[tone] || ["#0f172a", "#fff"];
  return (
    <div style={{ background: bg, border: "1px solid #e2e8f0", borderRadius: 12, padding: "8px 14px", minWidth: 120 }}>
      <div style={{ color: "#64748b", fontWeight: 600 }}>{label}</div>
      <div style={{ color, fontWeight: 900 }}>{value}</div>
    </div>
  );
}

/* ===== Styles ===== */
const shell = { padding: "1.25rem", background: "#fff", borderRadius: 14, boxShadow: "0 4px 18px rgba(15,23,42,.06)" };
const docTable = { width: "100%", borderCollapse: "collapse", marginBottom: 8 };
const docCell = { border: "1px solid #94a3b8", padding: "6px 10px", background: "#f8fafc" };
const band = { textAlign: "center", background: "#0f766e", color: "#fff", padding: "10px 6px", fontWeight: 800, borderRadius: 8, marginBottom: 10 };
const dateRow = { display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", margin: "6px 0 10px" };
const pill = { padding: "4px 12px", borderRadius: 999, fontWeight: 700 };
const rulesBox = { border: "1px solid #99f6e4", background: "#f0fdfa", borderRadius: 10, padding: "10px 12px", marginBottom: 12, lineHeight: 1.6 };
const tiles = { display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 12 };
const tableFrame = { width: "100%", overflowX: "auto", border: "1px solid #dbe3ee", borderRadius: 12 };
const grid = { width: "100%", minWidth: 1200, borderCollapse: "collapse" };
const thBase = { padding: "10px 8px", background: "#0f766e", color: "#fff", border: "1px solid #0d6b63", textAlign: "center", fontWeight: 700, verticalAlign: "middle" };
/* globals.css wipes <col> widths, so widths sit on the header cells. */
const thW = (w) => ({ ...thBase, width: w, minWidth: w, maxWidth: w });
const td = { padding: 8, height: 52, border: "1px solid #e2e8f0", textAlign: "center", verticalAlign: "middle" };
const fieldInput = { height: 36, boxSizing: "border-box", padding: "0 10px", borderRadius: 8, borderWidth: 1, borderStyle: "solid", borderColor: "#cbd5e1", background: "#fff" };
const cellInput = { ...fieldInput, display: "block", width: "100%" };
const removeBtn = { width: 32, height: 32, borderRadius: 8, border: "1px solid #fecaca", background: "#fff", color: "#ef4444", cursor: "pointer" };
const addBtn = { marginTop: 10, padding: "8px 14px", borderRadius: 8, border: "1px solid #0f766e", background: "#fff", color: "#0f766e", fontWeight: 800, cursor: "pointer" };
const errorBox = { marginTop: 12, background: "#fff7ed", border: "1px solid #fdba74", color: "#7c2d12", borderRadius: 10, padding: "10px 12px", fontWeight: 600 };
const saveBtn = { background: "linear-gradient(180deg,#10b981,#059669)", color: "#fff", border: "none", padding: "10px 18px", borderRadius: 10, cursor: "pointer", fontWeight: 800, boxShadow: "0 6px 14px rgba(16,185,129,.3)" };
