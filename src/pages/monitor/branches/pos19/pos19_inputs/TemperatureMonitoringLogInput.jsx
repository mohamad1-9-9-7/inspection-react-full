// src/pages/monitor/branches/pos19/pos19_inputs/TemperatureMonitoringLogInput.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { queuedMessage } from "../../../../../utils/reportOutbox";
import { getReportRowByDate, payloadOf } from "../../_shared/reportApi";
import { loadDay, quickIdsOf, saveBranchDay, stripSavedRows, stripSavedValue, isSheetFiled } from "../../_shared/branchTempDay";
import ReportHeader from "../_shared/AlMawashiHeader";
import useReportDateStatus from "../_shared/useReportDateStatus";
import API_BASE from "../../../../../config/api";
import CalibrationExpiryBadge, { useCalibrations } from "../../../../haccp and iso/Calibration/CalibrationExpiryBadge";
import { CALIB_LOGS } from "../../../../haccp and iso/Calibration/calibrationLink";

const CALIB_BRANCH = "Motor City";

/* ===== Draft (localStorage) ===== */
const DRAFT_KEY = "pos19_temperature_monitoring_draft_v2";
const loadDraft = () => {
  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
};


const TYPE     = "pos19_temperature_monitoring";
const BRANCH   = "POS 19";
const FORM_REF = "FS-HACCP/POS19/TMP/09";

// قراءات يومية — صباح / ظهر / مساء
const READINGS = [
  { key: "am", label: "Morning" },
  { key: "pm", label: "Midday" },
  { key: "ev", label: "Evening" },
];

const UNIT_TYPES = [
  { value: "chiller",  label: "Chiller",  limit: "≤ 5°C" },
  { value: "freezer",  label: "Freezer",  limit: "≤ -18°C" },
  { value: "ambient",  label: "Ambient",  limit: "≤ 25°C" },
];

function emptyRow() {
  const base = {
    equipment: "",
    unitType: "chiller",
    targetTemp: "≤ 5°C",
    correctiveAction: "",
    checkedBy: "",
  };
  READINGS.forEach(r => {
    base[`${r.key}_time`] = "";
    base[`${r.key}_temp`] = "";
  });
  return base;
}

function btnStyle(bg) {
  return {
    background: bg, color: "#fff", border: "none",
    borderRadius: 10, padding: "10px 14px", fontWeight: 700,
    cursor: "pointer", boxShadow: "0 4px 12px rgba(0,0,0,.15)",
  };
}

function isBreach(unitType, temp) {
  if (temp === "" || temp === undefined || temp === null) return false;
  const v = parseFloat(temp);
  if (isNaN(v)) return false;
  if (unitType === "chiller")  return v > 5;
  if (unitType === "freezer")  return v > -18;
  if (unitType === "ambient")  return v > 25;
  return false;
}

export default function TemperatureMonitoringLogInput() {
  const calibrations = useCalibrations();
  const [reportDate, setReportDate] = useState(() => {
    const dft = loadDraft();
    if (dft.reportDate) return dft.reportDate;
    try { return new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Dubai" }); }
    catch { const d=new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`; }
  });
  const [section, setSection]       = useState(() => loadDraft().section || "");
  const [rows, setRows]             = useState(() => {
    const d = loadDraft();
    return Array.isArray(d.rows) && d.rows.length ? d.rows : Array.from({ length: 5 }, () => emptyRow());
  });
  const [verifiedBy, setVerifiedBy] = useState(() => loadDraft().verifiedBy || "");
  const [checkedBy, setCheckedBy]   = useState(() => loadDraft().checkedBy || "");
  const [revDate, setRevDate]       = useState(() => loadDraft().revDate || "");
  const [revNo, setRevNo]           = useState(() => loadDraft().revNo || "");
  const [saving, setSaving]         = useState(false);

  /* 📱 Phone readings (QR on each unit) land on the day's record, so a date
     that already has one is OPENED here and saved as an update instead of
     being refused (_shared/branchTempDay). */
  const [editingDay, setEditingDay] = useState(false);
  const seenRef = useRef(new Set());
  // The saved record of the date on screen — its values are the server's, not
  // typed work, so they stay out of the draft and out of the next date.
  const savedRef = useRef(null);
  // The day's record holds phone readings only — not filed until the sheet is saved.
  const [phoneOnly, setPhoneOnly] = useState(false);
  const dateStatus = useReportDateStatus(TYPE, reportDate, { editing: editingDay });
  const dateNote = phoneOnly
    ? { text: "📱 Phone readings only — this day is NOT filed until you save the sheet", tone: "warn" }
    : dateStatus.note;

  useEffect(() => {
    let stop = false;
    setEditingDay(false);
    setPhoneOnly(false);
    seenRef.current = new Set();
    // A new date starts from what the user typed, never from the previous
    // day's saved readings (they used to make an empty day look filled in).
    const prevDay = savedRef.current;
    savedRef.current = null;
    if (prevDay) {
      setRows((prev) => stripSavedRows("pos19", prev, prevDay));
      setSection((prev) => stripSavedValue(prev, prevDay.section));
      setCheckedBy((prev) => stripSavedValue(prev, prevDay.checkedBy));
      setVerifiedBy((prev) => stripSavedValue(prev, prevDay.verifiedBy));
    }
    if (!reportDate) return undefined;
    getReportRowByDate(TYPE, reportDate)
      .then((row) => {
        if (stop || !row) return;
        const p = payloadOf(row) || {};
        seenRef.current = quickIdsOf(p);
        savedRef.current = p;
        setRows((prev) => {
          const { rows: next } = loadDay("pos19", prev.filter((r) => String(r.equipment || "").trim()), p);
          return next.length ? next.map((r) => ({ ...emptyRow(), ...r })) : prev;
        });
        setSection((prev) => prev || p.section || "");
        setCheckedBy((prev) => prev || p.checkedBy || "");
        setVerifiedBy((prev) => prev || p.verifiedBy || "");
        setEditingDay(true);
        setPhoneOnly(!isSheetFiled(p));
      })
      .catch(() => {});
    return () => { stop = true; };
  }, [reportDate]);

  /* ✅ Auto-save draft */
  useEffect(() => {
    try {
      localStorage.setItem(
        DRAFT_KEY,
        JSON.stringify({
          reportDate,
          section: stripSavedValue(section, savedRef.current?.section),
          rows: stripSavedRows("pos19", rows, savedRef.current),
          verifiedBy: stripSavedValue(verifiedBy, savedRef.current?.verifiedBy),
          checkedBy: stripSavedValue(checkedBy, savedRef.current?.checkedBy),
          revDate,
          revNo,
          ts: Date.now(),
        })
      );
    } catch {}
  }, [reportDate, section, rows, verifiedBy, checkedBy, revDate, revNo]);

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
    padding: "4px 6px", display: "block", minWidth: 0,
  };

  function updateRow(idx, key, val) {
    setRows(prev => {
      const next = [...prev];
      // إذا تغيّر unitType، حدّث targetTemp تلقائيًا
      if (key === "unitType") {
        const found = UNIT_TYPES.find(u => u.value === val);
        next[idx] = { ...next[idx], [key]: val, targetTemp: found ? found.limit : "" };
      } else {
        next[idx] = { ...next[idx], [key]: val };
      }
      return next;
    });
  }
  function addRow()    { setRows(prev => [...prev, emptyRow()]); }
  function removeRow(i){ setRows(prev => prev.filter((_, idx) => idx !== i)); }

  const colDefs = useMemo(() => {
    const arr = [
      <col key="equip"  style={{ width: 180 }} />,
      <col key="type"   style={{ width: 110 }} />,
      <col key="target" style={{ width: 100 }} />,
    ];
    READINGS.forEach((_, i) => {
      arr.push(<col key={`r${i}time`} style={{ width: 90 }} />);
      arr.push(<col key={`r${i}temp`} style={{ width: 90 }} />);
    });
    arr.push(<col key="ca"  style={{ width: 200 }} />);
    arr.push(<col key="chk" style={{ width: 120 }} />);
    arr.push(<col key="del" style={{ width: 70 }} />);
    return arr;
  }, []);

  async function handleSave() {
    if (!reportDate) { alert("الرجاء تحديد التاريخ"); return; }
    const entries = rows.filter(r => r.equipment.trim() !== "");
    if (!entries.length) { alert("أضف على الأقل صفًا واحدًا"); return; }

    for (const r of entries) {
      const hasBreach = READINGS.some(rd => isBreach(r.unitType, r[`${rd.key}_temp`]));
      if (hasBreach && !r.correctiveAction.trim()) {
        alert("يوجد صف تجاوز درجة الحرارة المحددة بدون Corrective Action.");
        return;
      }
    }

    setSaving(true);
    const payload = {
      branch: BRANCH, formRef: FORM_REF, classification: "Official",
      section, reportDate, entries, checkedBy, verifiedBy, revDate, revNo,
      savedAt: Date.now(),
    };
    try {
      // Without a connection the report waits on this device and is sent
      // later (utils/reportOutbox.js).
      // The day's record is updated when it exists (phone readings merged in).
      const r = await saveBranchDay({
        shape: "pos19", type: TYPE, reporter: "pos19", reportDate, payload,
        seenIds: seenRef.current, label: `POS 19 Temperature Monitoring ${reportDate}`,
      });
      seenRef.current = r.seenIds;
      savedRef.current = { ...payload, entries: Array.isArray(r.rows) ? r.rows : payload.entries };
      if (Array.isArray(r.rows)) setRows(r.rows.map((x) => ({ ...emptyRow(), ...x })));
      setEditingDay(true);
      setPhoneOnly(false);
      try { localStorage.removeItem(DRAFT_KEY); } catch {}
      alert(r.queued ? queuedMessage("ar") : r.updated ? "✅ تم الحفظ — تم تحديث تقرير هذا اليوم." : "✅ تم الحفظ بنجاح!");
      dateStatus.refresh();
    } catch (e) {
      console.error(e);
      alert("❌ فشل الحفظ. تحقق من السيرفر أو الشبكة.");
    } finally { setSaving(false); }
  }

  return (
    <div style={{ background:"#fff", border:"1px solid #dbe3f4", borderRadius:12, padding:16, color:"#0b1f4d" }}>
      <ReportHeader
        title="Temperature Monitoring Log"
        fields={[
          { label: "Form Ref", value: FORM_REF },
          { label: "Branch", value: BRANCH },
          { label: "Classification", value: "Official" },
          { label: "Report Date", type: "date", value: reportDate, onChange: setReportDate, note: dateNote },
          { label: "Section", value: section, onChange: setSection, placeholder: "e.g. Butchery" },
        ]}
      />

      {/* Critical info banner */}
      <div style={{ display:"flex", gap:10, alignItems:"flex-start", padding:"12px 14px", background:"#fffbeb", border:"1px solid #fde68a", borderLeft:"4px solid #f59e0b", borderRadius:8, color:"#78350f", fontSize:13, lineHeight:1.5, marginBottom:12 }}>
        <div style={{ fontSize:18, lineHeight:1 }}>⚠️</div>
        <div><strong>Critical Limit (CCP):</strong> Chiller <b>≤ 5°C</b> &nbsp;|&nbsp; Freezer <b>≤ -18°C</b> &nbsp;|&nbsp; Ambient store <b>≤ 25°C</b>. Check temperatures <b>at least twice per day</b> (morning &amp; evening). Out-of-limit readings require immediate corrective action — evaluate food safety, relocate stock, and call maintenance.</div>
      </div>

      {/* Limits strip */}
      <div style={{ border:"1px solid #1f3b70", borderBottom:"none" }}>
        <div style={{ ...thCell, background:"#e9f0ff" }}>
          Critical Limits: Chiller ≤ 5°C &nbsp;|&nbsp; Freezer ≤ -18°C &nbsp;|&nbsp; Ambient ≤ 25°C
        </div>
      </div>

      {/* Table */}
      <div style={{ overflowX:"auto" }}>
        <table style={{ width:"100%", borderCollapse:"collapse", tableLayout:"fixed", fontSize:12 }}>
          <colgroup>{colDefs}</colgroup>
          <thead>
            <tr>
              <th style={thCell} rowSpan={2}>Equipment /{ "\n"}Location</th>
              <th style={thCell} rowSpan={2}>Unit{"\n"}Type</th>
              <th style={thCell} rowSpan={2}>Target{"\n"}Temp</th>
              {READINGS.map(r => <th key={r.key} style={thCell} colSpan={2}>{r.label}</th>)}
              <th style={thCell} rowSpan={2}>Corrective{"\n"}Action</th>
              <th style={thCell} rowSpan={2}>Checked{"\n"}by</th>
              <th style={thCell} rowSpan={2}>—</th>
            </tr>
            <tr>
              {READINGS.map(r => (
                <React.Fragment key={r.key}>
                  <th style={thCell}>Time</th>
                  <th style={thCell}>Temp (°C)</th>
                </React.Fragment>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i}>
                <td style={tdCell}>
                  <input type="text" value={r.equipment} onChange={e=>updateRow(i,"equipment",e.target.value)} style={inputStyle} placeholder="e.g., Chiller 1" />
                  {String(r.equipment || "").trim() && (
                    <div style={{ marginTop: 4 }}>
                      <CalibrationExpiryBadge
                        records={calibrations}
                        branch={CALIB_BRANCH}
                        log={CALIB_LOGS[CALIB_BRANCH].log}
                        unitKey={r.equipment.trim()}
                        label={r.equipment.trim()}
                        style={{ whiteSpace: "normal" }}
                      />
                    </div>
                  )}
                </td>
                <td style={tdCell}>
                  <select value={r.unitType} onChange={e=>updateRow(i,"unitType",e.target.value)} style={inputStyle}>
                    {UNIT_TYPES.map(u => <option key={u.value} value={u.value}>{u.label}</option>)}
                  </select>
                </td>
                <td style={tdCell}><input type="text" value={r.targetTemp} onChange={e=>updateRow(i,"targetTemp",e.target.value)} style={inputStyle} /></td>
                {READINGS.map(rd => {
                  const breach = isBreach(r.unitType, r[`${rd.key}_temp`]);
                  return (
                    <React.Fragment key={rd.key}>
                      <td style={tdCell}><input type="time" value={r[`${rd.key}_time`]} onChange={e=>updateRow(i,`${rd.key}_time`,e.target.value)} style={inputStyle} /></td>
                      <td style={{ ...tdCell, background: breach ? "#fde8e8" : "" }}>
                        <input type="number" step="0.1" value={r[`${rd.key}_temp`]} onChange={e=>updateRow(i,`${rd.key}_temp`,e.target.value)} style={{ ...inputStyle, background: breach ? "#fde8e8" : "#fff" }} placeholder="°C" />
                      </td>
                    </React.Fragment>
                  );
                })}
                <td style={tdCell}><input type="text" value={r.correctiveAction} onChange={e=>updateRow(i,"correctiveAction",e.target.value)} style={inputStyle} placeholder="Action (if any)" /></td>
                <td style={tdCell}><input type="text" value={r.checkedBy} onChange={e=>updateRow(i,"checkedBy",e.target.value)} style={inputStyle} /></td>
                <td style={tdCell}><button onClick={()=>removeRow(i)} style={btnStyle("#dc2626")}>Del</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Controls */}
      <div style={{ display:"flex", gap:8, marginTop:12, flexWrap:"wrap" }}>
        <Link to="/monitor/branch-temp/pos19" style={{ ...btnStyle("#1d4ed8"), textDecoration: "none" }}>📱 Phone entry & QR</Link>
        <button onClick={addRow}      style={btnStyle("#0ea5e9")}>+ Add Row</button>
        <button onClick={handleSave} disabled={saving || dateStatus.blocked} style={btnStyle("#2563eb")}>
          {saving ? "Saving…" : dateStatus.blocked ? "🔒 محفوظ مسبقاً" : "Save Temperature Log"}
        </button>
      </div>

      {/* Footer */}
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr 1fr", gap:12, marginTop:16, alignItems:"center", fontSize:12 }}>
        <div style={{ display:"flex", alignItems:"center", gap:8 }}>
          <span>Checked by:</span>
          <input value={checkedBy} onChange={e=>setCheckedBy(e.target.value)} style={inputStyle} />
        </div>
        <div style={{ display:"flex", alignItems:"center", gap:8 }}>
          <span>Verified by:</span>
          <input value={verifiedBy} onChange={e=>setVerifiedBy(e.target.value)} style={inputStyle} />
        </div>
        <div style={{ display:"flex", alignItems:"center", gap:8 }}>
          <span>Rev. Date:</span>
          <input value={revDate} onChange={e=>setRevDate(e.target.value)} style={inputStyle} placeholder="YYYY-MM-DD" />
        </div>
        <div style={{ display:"flex", alignItems:"center", gap:8 }}>
          <span>Rev. No:</span>
          <input value={revNo} onChange={e=>setRevNo(e.target.value)} style={inputStyle} />
        </div>
      </div>
    </div>
  );
}
