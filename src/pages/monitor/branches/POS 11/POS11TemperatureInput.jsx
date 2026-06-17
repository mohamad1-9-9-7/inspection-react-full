// src/pages/monitor/branches/POS 11/POS11TemperatureInput.jsx
import React, { useMemo, useState, useEffect, useCallback } from "react";
import TemperatureMatchingReport, { makePV, countValidMatches, MIN_MATCHES } from "../_shared/TemperatureMatchingReport";

const API_BASE =
  process.env.REACT_APP_API_URL || "https://inspection-server-4nvj.onrender.com";

/* ===== Draft (localStorage) ===== */
const DRAFT_KEY = "pos11_temperature_draft_v1";
const loadDraft = () => {
  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
};

// Times ("Corrective Action" kept in payload for compatibility, not shown as a column)
const times = ["8:00 AM", "12:00 PM", "4:00 PM", "8:00 PM", "Corrective Action"];
const gridTimes = times.filter((t) => t !== "Corrective Action");
const DEFAULT_MATCH_TIME = gridTimes[Math.floor(gridTimes.length / 2)] || gridTimes[0];

// POS 11 units
const defaultRows = [
  "Display Chiller 1",
  "Display Chiller 2",
  "Display Chiller 3",
  "Vertical Display Chiller",
  "Dairy Chiller",
  "Production Room",
  "Storage Chiller",
  "Horizontal Freezer",
  "Display Freezer",
];

// Row classifiers (used by KPI)
const isFreezer = (name = "") => /freezer/i.test(String(name).trim());
const isRoom = (name = "") => /production\s*room/i.test(String(name).trim());
const isChiller = (name = "") => /(cooler|chiller)/i.test(String(name).trim());

// KPI helper (chillers/coolers only, 0–5°C)
function calculateKPI(rows) {
  const all = [];
  let out = 0;
  for (const r of rows) {
    if (!isChiller(r.name) || isFreezer(r.name) || isRoom(r.name)) continue;
    for (const [key, v] of Object.entries(r.temps || {})) {
      if (key === "Corrective Action") continue;
      const n = Number(v);
      if (v !== "" && !isNaN(n)) {
        all.push(n);
        if (n < 0 || n > 5) out += 1;
      }
    }
  }
  const avg = all.length ? (all.reduce((a, b) => a + b, 0) / all.length).toFixed(2) : "—";
  const min = all.length ? Math.min(...all) : "—";
  const max = all.length ? Math.max(...all) : "—";
  return { avg, min, max, out };
}

/* ===== Date helpers ===== */
const toISODate = (s) => {
  try {
    if (!s) return "";
    const m = String(s).match(/^(\d{4}-\d{2}-\d{2})/);
    return m ? m[1] : "";
  } catch {
    return "";
  }
};
const sameDay = (a, b) => toISODate(a) === toISODate(b);

export default function POS11TemperatureInput() {
  const [coolers, setCoolers] = useState(() => {
    const d = loadDraft();
    return Array.isArray(d.coolers) && d.coolers.length
      ? d.coolers
      : Array.from({ length: defaultRows.length }, (_, i) => ({ name: defaultRows[i], temps: {}, remarks: "" }));
  });
  const [productVerifications, setProductVerifications] = useState(() => {
    const d = loadDraft();
    return Array.isArray(d.productVerifications) ? d.productVerifications : [];
  });
  const [reportDate, setReportDate] = useState(() => loadDraft().reportDate || "");
  const [checkedBy, setCheckedBy] = useState(() => loadDraft().checkedBy || "");
  const [verifiedBy, setVerifiedBy] = useState(() => loadDraft().verifiedBy || "");
  const [opMsg, setOpMsg] = useState("");

  // Duplicate-day check state
  const [dateBusy, setDateBusy] = useState(false);
  const [dateTaken, setDateTaken] = useState(false);
  const [dateError, setDateError] = useState("");

  const kpi = useMemo(() => calculateKPI(coolers), [coolers]);

  /* ✅ Auto-save draft */
  useEffect(() => {
    try {
      localStorage.setItem(
        DRAFT_KEY,
        JSON.stringify({ coolers, productVerifications, reportDate, checkedBy, verifiedBy, ts: Date.now() })
      );
    } catch {}
  }, [coolers, productVerifications, reportDate, checkedBy, verifiedBy]);

  const setTemp = (rowIdx, time, value) => {
    setCoolers((prev) => {
      const next = [...prev];
      next[rowIdx] = { ...next[rowIdx], temps: { ...next[rowIdx].temps, [time]: value } };
      return next;
    });
  };
  const setRemarks = (rowIdx, value) => {
    setCoolers((prev) => {
      const next = [...prev];
      next[rowIdx] = { ...next[rowIdx], remarks: value, temps: { ...next[rowIdx].temps, ["Corrective Action"]: value } };
      return next;
    });
  };

  /* ---- Product matching handlers ---- */
  const addPV = (storageKey) => setProductVerifications((prev) => [...prev, makePV(storageKey, DEFAULT_MATCH_TIME)]);
  const updatePV = (idx, key, value) =>
    setProductVerifications((prev) =>
      prev.map((r, i) => {
        if (i !== idx) return r;
        if (key === "__product") return { ...r, productName: value.description, itemCode: value.item_code };
        return { ...r, [key]: value };
      })
    );
  const removePV = (idx) => setProductVerifications((prev) => prev.filter((_, i) => i !== idx));

  /* ===================== Duplicate-day prevention ===================== */
  useEffect(() => {
    let abort = false;
    async function checkDuplicate() {
      const d = toISODate(reportDate);
      setDateError("");
      setDateTaken(false);
      if (!d) return;
      setDateBusy(true);
      try {
        const res = await fetch(`${API_BASE}/api/reports?type=pos11_temperature`, { cache: "no-store" });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = await res.json();
        const arr = Array.isArray(json) ? json : json?.data || json?.items || json?.rows || [];
        const exists = arr.some((r) => {
          const p = r?.payload ?? r;
          const b = (p?.branch || "").toLowerCase().trim();
          const pd = p?.date || p?.reportDate || r?.created_at;
          return b === "pos 11" && sameDay(pd, d);
        });
        if (!abort) setDateTaken(exists);
      } catch (e) {
        if (!abort) {
          setDateError("⚠️ Failed to check for an existing report for this day. Try again later.");
          setDateTaken(false);
        }
      } finally {
        if (!abort) setDateBusy(false);
      }
    }
    checkDuplicate();
    return () => { abort = true; };
  }, [reportDate]);

  /* ===== Save ===== */
  const handleSave = useCallback(async () => {
    if (!reportDate) { alert("⚠️ Please choose the report date first."); return; }
    if (!checkedBy.trim() || !verifiedBy.trim()) { alert("⚠️ Checked By and Verified By are required"); return; }
    const matchCount = countValidMatches(productVerifications);
    if (matchCount < MIN_MATCHES) {
      alert(`⚠️ At least ${MIN_MATCHES} product matches (product + temperature) are required before saving. You currently have ${matchCount}.`);
      return;
    }
    if (dateTaken) {
      alert("⛔ Only one report per day is allowed for this branch.\nChoose another date or edit the existing report.");
      return;
    }
    try {
      setOpMsg("⏳ Saving...");
      const payload = {
        branch: "POS 11",
        coolers,
        productVerifications,
        times,
        date: toISODate(reportDate),
        checkedBy,
        verifiedBy,
        savedAt: Date.now(),
        unique_key: `pos11_temperature_${toISODate(reportDate)}`,
      };
      const res = await fetch(`${API_BASE}/api/reports`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reporter: "pos11", type: "pos11_temperature", payload }),
      });
      if (!res.ok) {
        if (res.status === 409) throw new Error("⛔ A report already exists for this day (409 Conflict).");
        throw new Error(`HTTP ${res.status}`);
      }
      try { localStorage.removeItem(DRAFT_KEY); } catch {}
      setOpMsg("✅ Saved successfully!");
    } catch (e) {
      console.error(e);
      setOpMsg(`❌ Failed to save. ${e?.message || ""}`);
    } finally {
      setTimeout(() => setOpMsg(""), 4000);
    }
  }, [reportDate, checkedBy, verifiedBy, dateTaken, coolers, productVerifications]);

  /* ===== Progress indicator ===== */
  const getCompletionPercentage = () => {
    const totalFields = coolers.length * gridTimes.length;
    if (!totalFields) return 0;
    const filledFields = coolers.reduce((acc, c) => acc + gridTimes.filter((t) => (c.temps?.[t] ?? "") !== "").length, 0);
    return Math.round((filledFields / totalFields) * 100);
  };

  return (
    <div style={{ background: "linear-gradient(120deg, #f6f8fa 65%, #e8daef 100%)", padding: "1.5rem", borderRadius: "14px", boxShadow: "0 4px 18px #d2b4de44" }}>
      {/* Document header */}
      <table style={topTable}>
        <tbody>
          <tr>
            <td rowSpan={4} style={{ ...tdHeader, width: 140, textAlign: "center" }}>
              <div style={{ fontWeight: 900, color: "#a00", fontSize: 14, lineHeight: 1.2 }}>AL<br />MAWASHI</div>
            </td>
            <td style={tdHeader}><b>Document Title:</b> Temperature Control Record</td>
            <td style={tdHeader}><b>Document No:</b> FS-QM/REC/TMP</td>
          </tr>
          <tr>
            <td style={tdHeader}><b>Issue Date:</b> 05/02/2020</td>
            <td style={tdHeader}><b>Revision No:</b> 0</td>
          </tr>
          <tr>
            <td style={tdHeader}><b>Area:</b> POS 11</td>
            <td style={tdHeader}><b>Issued by:</b> MOHAMAD ABDULLAH</td>
          </tr>
          <tr>
            <td style={tdHeader}><b>Controlling Officer:</b> Quality Controller</td>
            <td style={tdHeader}><b>Approved by:</b> Hussam O. Sarhan</td>
          </tr>
        </tbody>
      </table>

      <div style={band1}>TRANS EMIRATES LIVESTOCK MEAT TRADING LLC</div>
      <div style={band2}>TEMPERATURE CONTROL CHECKLIST (CCP)</div>

      {/* Date */}
      <div style={{ margin: "8px 0 10px", display: "flex", justifyContent: "flex-end", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
        <label style={{ fontWeight: 600 }}>📅 Date:</label>
        <input type="date" value={reportDate} onChange={(e) => setReportDate(e.target.value)} style={{ padding: "6px 10px", borderRadius: 8, border: "1px solid #9aa4ae", background: "#fff" }} />
        {reportDate && (
          <>
            {dateBusy && <span style={{ color: "#6b7280", fontWeight: 600 }}>Checking…</span>}
            {!dateBusy && dateTaken && <span style={{ color: "#b91c1c", fontWeight: 700 }}>⛔ A report already exists for this day</span>}
            {!dateBusy && !dateTaken && !dateError && <span style={{ color: "#065f46", fontWeight: 700 }}>✅ Date available</span>}
            {dateError && <span style={{ color: "#b45309", fontWeight: 700 }}>{dateError}</span>}
          </>
        )}
      </div>

      {/* Progress */}
      <div style={{ width: "100%", height: 8, background: "#e5e7eb", borderRadius: 4, overflow: "hidden", marginBottom: 12 }}>
        <div style={{ width: `${getCompletionPercentage()}%`, height: "100%", background: "linear-gradient(90deg, #10b981, #059669)", transition: "width 0.3s ease" }} />
      </div>
      <div style={{ textAlign: "center", fontSize: "0.85rem", color: "#6b7280", marginBottom: 8 }}>📊 Progress: {getCompletionPercentage()}% Complete</div>

      {/* Instructions */}
      <div style={rulesBox}>
        <div>1. If the cooler temp is +5°C or more – corrective action should be taken.</div>
        <div>2. If the loading area is more than +16°C – corrective action should be taken.</div>
        <div>3. If the preparation area is more than +10°C – corrective action should be taken.</div>
        <div style={{ marginTop: 6 }}><b>Note (Freezers):</b> acceptable range -25°C to -12°C.</div>
        <div style={{ marginTop: 6 }}><b>Corrective action:</b> Transfer the meat to another cold room and call maintenance department to check and solve the problem.</div>
      </div>

      {/* Cards: temperatures + integrated product matching */}
      <div style={{ marginTop: 6 }}>
        <h4 style={{ color: "#2980b9", margin: "0 0 4px", fontWeight: 900, textAlign: "center" }}>Temperatures & Product Matching</h4>
        <TemperatureMatchingReport
          units={coolers}
          times={gridTimes}
          productVerifications={productVerifications}
          onTemp={setTemp}
          onRemarks={setRemarks}
          onAddPV={addPV}
          onUpdatePV={updatePV}
          onRemovePV={removePV}
        />
      </div>

      {/* KPI + Checked/Verified + Save */}
      <div style={{ display: "flex", justifyContent: "space-between", gap: 16, marginTop: 12, alignItems: "center", flexWrap: "wrap" }}>
        <div style={{ fontWeight: 700 }}>
          KPI — Avg: {kpi.avg}°C | Min: {kpi.min}°C | Max: {kpi.max}°C | Out-of-range: {kpi.out}
          <span style={{ marginInlineStart: 10, fontWeight: 600, color: "#374151" }}>(Chillers/Coolers only)</span>
        </div>

        <div style={{ display: "flex", gap: 16, alignItems: "center", flexWrap: "wrap" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ fontWeight: 700 }}>Checked By:-</span>
            <input value={checkedBy} onChange={(e) => setCheckedBy(e.target.value)} placeholder="Enter name" style={miniInput} />
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ fontWeight: 700 }}>Verified By:-</span>
            <input value={verifiedBy} onChange={(e) => setVerifiedBy(e.target.value)} placeholder="Enter name" style={miniInput} />
          </div>
          <button onClick={handleSave} style={{ ...saveBtn, opacity: dateTaken ? 0.6 : 1, pointerEvents: dateTaken ? "none" : "auto" }} title={dateTaken ? "Only one report per day is allowed" : "Save to Server"}>
            💾 Save to Server
          </button>
        </div>
      </div>

      {opMsg && (
        <div style={{ marginTop: 10, fontWeight: 700, color: opMsg.startsWith("❌") ? "#b91c1c" : "#065f46" }}>{opMsg}</div>
      )}
    </div>
  );
}

/* ==== Styles ==== */
const topTable = { width: "100%", borderCollapse: "collapse", marginBottom: "8px", fontSize: "0.9rem", border: "1px solid #9aa4ae", background: "#f8fbff" };
const tdHeader = { border: "1px solid #9aa4ae", padding: "6px 8px", verticalAlign: "middle" };
const band1 = { width: "100%", textAlign: "center", background: "#bfc7cf", color: "#2c3e50", fontWeight: 700, padding: "6px 4px", border: "1px solid #9aa4ae", borderTop: "none" };
const band2 = { width: "100%", textAlign: "center", background: "#dde3e9", color: "#2c3e50", fontWeight: 700, padding: "6px 4px", border: "1px solid #9aa4ae", borderTop: "none", marginBottom: "8px" };
const rulesBox = { border: "1px solid #9aa4ae", background: "#f1f5f9", padding: "8px 10px", fontSize: "0.92rem", marginBottom: "10px" };
const miniInput = { border: "1px solid #aaa", borderRadius: 6, padding: "4px 8px", minWidth: 160, background: "#fff" };
const saveBtn = { background: "linear-gradient(180deg,#10b981,#059669)", color: "#fff", border: "none", padding: "10px 18px", borderRadius: 10, cursor: "pointer", fontWeight: 800, fontSize: "0.95rem", boxShadow: "0 6px 14px rgba(16,185,129,.3)" };
