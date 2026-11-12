// src/pages/monitor/branches/ftr1/FTR1Temperature.jsx
//
// FTR 1 — Temperature Control Record (CCP), rebuilt on the QCS / POS sheet:
//   • one record per day: picking a date that already has a record OPENS it and
//     saving updates it (_shared/branchTempDay) — no duplicate days
//   • saves through the offline outbox (works with no signal, sends later)
//   • a card per storage unit with its own limits, status and remarks
//   • product temperature matching inside each card (min. 2 before saving)
//   • calibration expiry badge per unit (records under "Supervisor Food Truck")
//   • unit editor: add / rename / remove / chiller-or-freezer
//   • an out-of-range reading needs a corrective action before saving
//   • live KPI + the FTR 1 signature block (Created by / Checked By / QA)
//   • 📱 phone entry by QR sticker per unit (qcs/BranchTempQuick "ftr1"); phone
//     readings land in the same day record and merge into this sheet
//   • readings 1 PM – 10 PM, every 2 hours + closing at 10 PM (ftr1TempUnits GRID_TIMES)
import React, { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { queuedMessage } from "../../../../utils/reportOutbox";
import { loadDay, quickIdsOf, saveBranchDay, stripSavedRows, stripSavedList, isSheetFiled } from "../_shared/branchTempDay";
import { getLatestPayload, getReportRowByDate, payloadOf } from "../_shared/reportApi";
import TemperatureMatchingReport, { makePV, countValidMatches, MIN_MATCHES } from "../_shared/TemperatureMatchingReport";
import CalibrationExpiryBadge, { useCalibrations } from "../../../haccp and iso/Calibration/CalibrationExpiryBadge";
import { useStaffDirectory } from "../_shared/staffRegistry";
import { useFtrSignatures, FtrSignatureBlock } from "./ftr1Signatures";
import {
  TYPE, TIMES, GRID_TIMES, UNIT_TYPES, DEFAULT_UNITS,
  blankUnit, unitTypeOf, makeClassify, outOfRange, calcKPI,
} from "./ftr1TempUnits";

/** Calibration records name this site "Supervisor Food Truck" (مشرف = Mushrif). */
const CALIB_BRANCH = "Supervisor Food Truck";
const DEFAULT_MATCH_TIME = GRID_TIMES[Math.floor(GRID_TIMES.length / 2)];

/* ===== Draft (localStorage cache of unsaved typing only) ===== */
const DRAFT_KEY = "ftr1_temperature_draft_v2";
const loadDraft = () => {
  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
};

const todayDubai = () => {
  try {
    return new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Dubai" });
  } catch {
    return new Date().toISOString().slice(0, 10);
  }
};
const toISODate = (s) => (String(s || "").match(/^(\d{4}-\d{2}-\d{2})/) || [])[1] || "";

/** Unit list (names + types, no readings) taken from a saved record. */
const unitsFrom = (p) =>
  (Array.isArray(p?.coolers) ? p.coolers : [])
    .map((c, i, arr) => blankUnit(String(c?.name || `Unit ${i + 1}`), unitTypeOf(c, i, arr.length)));

export default function FTR1Temperature() {
  const calibrations = useCalibrations();
  const draft = useMemo(loadDraft, []);

  const [units, setUnits] = useState(() =>
    Array.isArray(draft.coolers) && draft.coolers.length
      ? draft.coolers
      : DEFAULT_UNITS.map((u) => blankUnit(u.name, u.type))
  );
  const [productVerifications, setProductVerifications] = useState(() =>
    Array.isArray(draft.productVerifications) ? draft.productVerifications : []
  );
  const [reportDate, setReportDate] = useState(() => draft.reportDate || todayDubai());
  const [editUnits, setEditUnits] = useState(false);
  const [opMsg, setOpMsg] = useState("");
  const [saving, setSaving] = useState(false);

  // Created by / Checked By (employee numbers) + Verified by (QA)
  const sig = useFtrSignatures(useStaffDirectory(), { verifiedKey: "verifiedBy" });
  const sigRef = useRef(sig);
  sigRef.current = sig;

  // Day state
  const [dateBusy, setDateBusy] = useState(false);
  const [dateError, setDateError] = useState("");
  const [editingDay, setEditingDay] = useState(false);
  const [phoneOnly, setPhoneOnly] = useState(false);
  const seenRef = useRef(new Set());
  const savedRef = useRef(null); // the open day's saved payload (kept out of the draft)

  const classify = useMemo(() => classifySafe(units), [units]);
  const kpi = useMemo(() => calcKPI(units), [units]);
  const outs = useMemo(() => outOfRange(units), [units]);

  /* First visit with no draft: start from the newest record's units, so a
     unit added or renamed once stays on the sheet the next day. */
  useEffect(() => {
    if (Array.isArray(draft.coolers) && draft.coolers.length) return;
    let alive = true;
    getLatestPayload(TYPE)
      .then((p) => {
        const list = unitsFrom(p);
        if (alive && list.length && !savedRef.current) setUnits(list);
      })
      .catch(() => {});
    return () => { alive = false; };
  }, [draft.coolers]);

  /* Draft cache — only what was typed, never the open day's saved values. */
  useEffect(() => {
    try {
      localStorage.setItem(DRAFT_KEY, JSON.stringify({
        coolers: stripSavedRows("grid", units, savedRef.current),
        productVerifications: stripSavedList(productVerifications, savedRef.current?.productVerifications),
        reportDate,
        ts: Date.now(),
      }));
    } catch {}
  }, [units, productVerifications, reportDate]);

  /* Open the day's record (if any) whenever the date changes. */
  useEffect(() => {
    let abort = false;
    const prevDay = savedRef.current;
    savedRef.current = null;
    if (prevDay) {
      setUnits((prev) => stripSavedRows("grid", prev, prevDay));
      setProductVerifications((prev) => stripSavedList(prev, prevDay.productVerifications));
    }
    const d = toISODate(reportDate);
    setDateError("");
    setEditingDay(false);
    setPhoneOnly(false);
    if (!d) return undefined;
    setDateBusy(true);
    getReportRowByDate(TYPE, d)
      .then((row) => {
        if (abort) return;
        if (!row) {
          seenRef.current = new Set();
          return;
        }
        const p = payloadOf(row) || {};
        setEditingDay(true);
        setPhoneOnly(!isSheetFiled(p));
        seenRef.current = quickIdsOf(p);
        savedRef.current = p;
        setUnits((prev) => {
          const { rows } = loadDay("grid", prev, p);
          return rows.length ? rows : prev;
        });
        setProductVerifications((prev) =>
          prev.length ? prev : Array.isArray(p.productVerifications) ? p.productVerifications : []
        );
        const s = sigRef.current;
        if (!s.creatorNo && !s.checkedNo) s.load(p);
      })
      .catch(() => {
        if (!abort) setDateError("⚠️ Could not check this day on the server — saving is blocked until it loads.");
      })
      .finally(() => { if (!abort) setDateBusy(false); });
    return () => { abort = true; };
  }, [reportDate]);

  /* ---- unit / reading handlers ---- */
  const setTemp = (i, time, value) =>
    setUnits((prev) => prev.map((u, k) => (k === i ? { ...u, temps: { ...u.temps, [time]: value } } : u)));
  const setRemarks = (i, value) =>
    setUnits((prev) => prev.map((u, k) =>
      k === i ? { ...u, remarks: value, temps: { ...u.temps, "Corrective Action": value } } : u));
  const renameUnit = (i, name) => setUnits((prev) => prev.map((u, k) => (k === i ? { ...u, name } : u)));
  const retypeUnit = (i, type) => setUnits((prev) => prev.map((u, k) => (k === i ? { ...u, type } : u)));
  const addUnit = (type) =>
    setUnits((prev) => {
      const n = prev.filter((u, i) => unitTypeOf(u, i, prev.length) === type).length + 1;
      return [...prev, blankUnit(type === "freezer" ? `FREEZER ${n}` : `Cooler ${n}`, type)];
    });
  const removeUnit = (i) => {
    const u = units[i];
    const hasData = GRID_TIMES.some((t) => String(u?.temps?.[t] ?? "").trim() !== "");
    if (hasData && !window.confirm(`"${u.name}" has readings on this sheet. Remove it anyway?`)) return;
    setUnits((prev) => prev.filter((_, k) => k !== i));
    // product matches are tied to their card by index ("unit-<i>")
    setProductVerifications((prev) =>
      prev
        .filter((r) => r.storageKey !== `unit-${i}`)
        .map((r) => {
          const m = String(r.storageKey || "").match(/^unit-(\d+)$/);
          return m && Number(m[1]) > i ? { ...r, storageKey: `unit-${Number(m[1]) - 1}` } : r;
        })
    );
  };

  /* ---- product matching ---- */
  const addPV = (storageKey) => setProductVerifications((prev) => [...prev, makePV(storageKey, DEFAULT_MATCH_TIME)]);
  const updatePV = (idx, key, value) =>
    setProductVerifications((prev) => prev.map((r, i) => {
      if (i !== idx) return r;
      if (key === "__product") return { ...r, productName: value.description, itemCode: value.item_code };
      return { ...r, [key]: value };
    }));
  const removePV = (idx) => setProductVerifications((prev) => prev.filter((_, i) => i !== idx));

  /* ---- validation ---- */
  const matchCount = countValidMatches(productVerifications);
  const sheetErrors = [];
  if (!toISODate(reportDate)) sheetErrors.push("Choose the report date.");
  if (dateError) sheetErrors.push("The day could not be checked on the server — reload and try again.");
  if (units.some((u) => !String(u.name || "").trim())) sheetErrors.push("Every unit needs a name.");
  if (kpi.readings === 0) sheetErrors.push("Enter at least one temperature reading.");
  units.forEach((u, i) => {
    if (outs.some((o) => o.index === i) && !String(u.remarks || "").trim())
      sheetErrors.push(`${u.name || `Unit ${i + 1}`}: out-of-range reading — write the corrective action in Remarks.`);
  });
  if (matchCount < MIN_MATCHES)
    sheetErrors.push(`Add at least ${MIN_MATCHES} product matches (product + temperature) — ${matchCount} so far.`);
  const errors = [...sheetErrors, ...sig.errors];

  const handleSave = async () => {
    if (errors.length) {
      alert("⚠️ Please fix:\n\n- " + errors.join("\n- "));
      return;
    }
    const d = toISODate(reportDate);
    const coolers = units.map((u, i) => ({ ...u, type: unitTypeOf(u, i, units.length) }));
    const payload = {
      branch: "FTR 1",
      coolers,
      productVerifications,
      times: TIMES,
      reportDate: d,
      date: d,
      kpi,
      ...sig.fields(),
      savedAt: Date.now(),
    };
    setSaving(true);
    setOpMsg("⏳ Saving...");
    try {
      const r = await saveBranchDay({
        shape: "grid", type: TYPE, reporter: "ftr1", reportDate: d, payload,
        seenIds: seenRef.current, label: `FTR 1 Temperature ${d}`,
      });
      seenRef.current = r.seenIds;
      savedRef.current = { ...payload, coolers: Array.isArray(r.rows) ? r.rows : coolers };
      if (Array.isArray(r.rows)) setUnits(r.rows);
      setEditingDay(true);
      setPhoneOnly(false);
      try { localStorage.removeItem(DRAFT_KEY); } catch {}
      setOpMsg(r.queued ? queuedMessage("en") : r.updated ? "✅ Saved — the day's report was updated." : "✅ Saved successfully!");
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
      <table style={topTable}>
        <tbody>
          <tr>
            <td rowSpan={4} style={{ ...tdHeader, width: 140, textAlign: "center" }}>
              <div style={{ fontWeight: 900, color: "#a00", lineHeight: 1.2 }}>AL<br />MAWASHI</div>
            </td>
            <td style={tdHeader}><b>Document Title:</b> Temperature Control Record</td>
            <td style={tdHeader}><b>Document No:</b> FS-QM/REC/TMP</td>
          </tr>
          <tr>
            <td style={tdHeader}><b>Issue Date:</b> 05/02/2020</td>
            <td style={tdHeader}><b>Revision No:</b> 0</td>
          </tr>
          <tr>
            <td style={tdHeader}><b>Area:</b> FTR 1 — Mushrif Park</td>
            <td style={tdHeader}><b>Issued by:</b> MOHAMAD ABDULLAH</td>
          </tr>
          <tr>
            <td style={tdHeader}><b>Controlling Officer:</b> Quality Controller</td>
            <td style={tdHeader}><b>Approved by:</b> Hussam O. Sarhan</td>
          </tr>
        </tbody>
      </table>

      <div style={band1}>TRANS EMIRATES LIVESTOCK MEAT TRADING LLC</div>
      <div style={band2}>TEMPERATURE CONTROL CHECKLIST (CCP) — FTR 1</div>

      {/* Date + day status */}
      <div style={dateRow}>
        <Link to="/monitor/branch-temp/ftr1" style={phoneLink}>📱 Phone entry & QR</Link>
        <label style={{ fontWeight: 700 }}>📅 Date:</label>
        <input type="date" value={reportDate} onChange={(e) => setReportDate(e.target.value)} style={dateInput} />
        {dateBusy && <span style={{ color: "#6b7280", fontWeight: 600 }}>Checking…</span>}
        {!dateBusy && dateError && <span style={{ color: "#b45309", fontWeight: 700 }}>{dateError}</span>}
        {!dateBusy && !dateError && toISODate(reportDate) && (
          editingDay
            ? phoneOnly
              ? <span style={{ ...pill, background: "#fef3c7", color: "#92400e" }}>📱 Phone readings only — not filed until you save</span>
              : <span style={{ ...pill, background: "#dbeafe", color: "#1e40af" }}>📝 This day's report is open — saving updates it</span>
            : <span style={{ ...pill, background: "#dcfce7", color: "#166534" }}>✅ New report for this day</span>
        )}
        <button type="button" onClick={() => setEditUnits((v) => !v)} style={{ ...ghostBtn, marginInlineStart: "auto" }}>
          ⚙️ {editUnits ? "Done" : "Edit units"}
        </button>
      </div>

      {/* Rules */}
      <div style={rulesBox}>
        <div>1. Chillers: 0°C to +5°C — at +5°C or more check the product temperature and take corrective action.</div>
        <div>2. Freezers: −20°C to −16°C.</div>
        <div>3. Loading area above +16°C or preparation area above +10°C — corrective action.</div>
        <div style={{ marginTop: 6 }}>
          <b>Corrective action:</b> transfer the meat to another cold room and call the maintenance department to check and solve the problem.
          Any red reading must have its corrective action written in the unit's Remarks.
        </div>
      </div>

      {/* Unit editor */}
      {editUnits && (
        <div style={editorBox}>
          <div style={{ fontWeight: 800, marginBottom: 8 }}>⚙️ Storage units on this sheet</div>
          {units.map((u, i) => (
            <div key={i} style={editorRow}>
              <span style={{ width: 26, color: "#64748b", fontWeight: 700 }}>{i + 1}</span>
              <input value={u.name} onChange={(e) => renameUnit(i, e.target.value)} placeholder="Unit name" style={{ ...fieldInput, flex: 1, minWidth: 160 }} />
              <select value={unitTypeOf(u, i, units.length)} onChange={(e) => retypeUnit(i, e.target.value)} style={fieldInput}>
                {Object.entries(UNIT_TYPES).map(([k, t]) => (
                  <option key={k} value={k}>{t.icon} {t.label} ({t.range.min}…{t.range.max}°C)</option>
                ))}
              </select>
              <button type="button" onClick={() => removeUnit(i)} disabled={units.length <= 1} style={removeBtn} title="Remove unit">✖</button>
            </div>
          ))}
          <div style={{ display: "flex", gap: 8, marginTop: 8, flexWrap: "wrap" }}>
            <button type="button" onClick={() => addUnit("chiller")} style={ghostBtn}>＋ 🧊 Chiller</button>
            <button type="button" onClick={() => addUnit("freezer")} style={ghostBtn}>＋ ❄️ Freezer</button>
          </div>
        </div>
      )}

      {/* KPI */}
      <div style={kpiRow}>
        <Kpi label="Readings" value={`${kpi.readings} / ${kpi.total}`} />
        <Kpi label="Out of range" value={kpi.out} tone={kpi.out ? "bad" : "ok"} />
        <Kpi label="Compliance" value={kpi.compliance == null ? "—" : `${kpi.compliance}%`} tone={kpi.compliance == null ? "" : kpi.compliance === 100 ? "ok" : "bad"} />
        <Kpi label="Min / Max" value={kpi.min == null ? "—" : `${kpi.min}° / ${kpi.max}°`} />
        <Kpi label="Product matches" value={`${matchCount} / ${MIN_MATCHES}`} tone={matchCount >= MIN_MATCHES ? "ok" : "bad"} />
      </div>

      {/* Cards: temperatures + product matching */}
      <TemperatureMatchingReport
        units={units}
        times={GRID_TIMES}
        classify={classify}
        unitBadge={(unit) => (
          <CalibrationExpiryBadge records={calibrations} branch={CALIB_BRANCH} log={TYPE} unitKey={unit?.name} label={unit?.name} />
        )}
        productVerifications={productVerifications}
        onTemp={setTemp}
        onRemarks={setRemarks}
        onAddPV={addPV}
        onUpdatePV={updatePV}
        onRemovePV={removePV}
      />

      <FtrSignatureBlock sig={sig} />

      {errors.length > 0 && (
        <div style={errorBox}>
          ⚠️ Before saving:
          <ul style={{ margin: "6px 0 0", paddingInlineStart: 20 }}>
            {errors.map((e) => <li key={e}>{e}</li>)}
          </ul>
        </div>
      )}

      <div style={{ display: "flex", justifyContent: "flex-end", alignItems: "center", gap: 12, marginTop: 12 }}>
        {opMsg && <span style={{ fontWeight: 700, color: opMsg.startsWith("❌") ? "#b91c1c" : "#065f46" }}>{opMsg}</span>}
        <button onClick={handleSave} disabled={saving || dateBusy} style={{ ...saveBtn, opacity: errors.length || saving ? 0.75 : 1 }}>
          {saving ? "Saving…" : editingDay ? "💾 Update day's report" : "💾 Save to Server"}
        </button>
      </div>
    </div>
  );
}

/* classify() must not throw while the unit list is being edited. */
function classifySafe(units) {
  const fn = makeClassify(units);
  return (name, i) => (units[i] ? fn(name, i) : { kind: "chiller", ...UNIT_TYPES.chiller });
}

function Kpi({ label, value, tone = "" }) {
  const color = tone === "ok" ? "#166534" : tone === "bad" ? "#b91c1c" : "#0f172a";
  const bg = tone === "ok" ? "#f0fdf4" : tone === "bad" ? "#fef2f2" : "#fff";
  return (
    <div style={{ background: bg, border: "1px solid #e2e8f0", borderRadius: 12, padding: "8px 14px", minWidth: 120 }}>
      <div style={{ color: "#64748b", fontWeight: 600 }}>{label}</div>
      <div style={{ color, fontWeight: 900 }}>{value}</div>
    </div>
  );
}

/* ===== Styles ===== */
const shell = { background: "#eef3f8", padding: "1.5rem", borderRadius: 14, boxShadow: "0 4px 18px #d2b4de44" };
const topTable = { width: "100%", borderCollapse: "collapse", marginBottom: 8, border: "1px solid #9aa4ae", background: "#f8fbff" };
const tdHeader = { border: "1px solid #9aa4ae", padding: "6px 8px", verticalAlign: "middle" };
const band1 = { textAlign: "center", background: "#bfc7cf", color: "#2c3e50", fontWeight: 700, padding: "6px 4px", border: "1px solid #9aa4ae", borderTop: "none" };
const band2 = { textAlign: "center", background: "#dde3e9", color: "#2c3e50", fontWeight: 700, padding: "6px 4px", border: "1px solid #9aa4ae", borderTop: "none", marginBottom: 8 };
const dateRow = { margin: "8px 0 10px", display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" };
const dateInput = { padding: "6px 10px", borderRadius: 8, border: "1px solid #9aa4ae", background: "#fff" };
const phoneLink = { background: "#2563eb", color: "#fff", borderRadius: 8, padding: "6px 12px", fontWeight: 800, textDecoration: "none" };
const pill = { padding: "4px 12px", borderRadius: 999, fontWeight: 700 };
const rulesBox = { border: "1px solid #9aa4ae", background: "#f1f5f9", padding: "8px 10px", marginBottom: 10, borderRadius: 8 };
const editorBox = { border: "1px solid #c7d2fe", background: "#fff", borderRadius: 12, padding: 12, marginBottom: 12 };
const editorRow = { display: "flex", alignItems: "center", gap: 8, marginBottom: 6, flexWrap: "wrap" };
const fieldInput = { height: 36, boxSizing: "border-box", padding: "0 10px", borderRadius: 8, borderWidth: 1, borderStyle: "solid", borderColor: "#cbd5e1", background: "#fff" };
const ghostBtn = { padding: "6px 12px", borderRadius: 8, border: "1px solid #2563eb", background: "#fff", color: "#2563eb", fontWeight: 700, cursor: "pointer" };
const removeBtn = { width: 34, height: 34, borderRadius: 8, border: "1px solid #fecaca", background: "#fff", color: "#ef4444", cursor: "pointer" };
const kpiRow = { display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 12 };
const errorBox = { marginTop: 12, background: "#fff7ed", border: "1px solid #fdba74", color: "#7c2d12", borderRadius: 10, padding: "10px 12px", fontWeight: 600 };
const saveBtn = { background: "linear-gradient(180deg,#10b981,#059669)", color: "#fff", border: "none", padding: "10px 18px", borderRadius: 10, cursor: "pointer", fontWeight: 800, boxShadow: "0 6px 14px rgba(16,185,129,.3)" };
