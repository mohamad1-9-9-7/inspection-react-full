// src/pages/monitor/branches/pos 10/POS10TemperatureInput.jsx
import React, { useMemo, useState, useEffect } from "react";

const API_BASE =
  process.env.REACT_APP_API_URL || "https://inspection-server-4nvj.onrender.com";

// الأوقات (نرسل "Corrective Action" في الـpayload للعرض، لكن لا نعرضه كعمود)
const times = [
  "8:00 AM",
  "11:00 AM",
  "2:00 PM",
  "5:00 PM",
  "8:00 PM",
  "10:00 PM",
  "Corrective Action",
];
const gridTimes = times.filter((t) => t !== "Corrective Action");

// ✅ الترتيب الجديد المطلوب
const defaultRows = [
  "Display Chiller 1",
  "Display Chiller 2",
  "Display Chiller 3",
  "Display Chiller 4",
  "Cheese Chiller",
  "Freezer 1",
  "Freezer 2",
  "Freezer 3",
  "Storage Chiller",
  "Production Room",
];

// Helpers لتصنيف الصف
const isFreezer = (name = "") => /freezer/i.test(String(name).trim());
const isRoom = (name = "") => /production\s*room/i.test(String(name).trim());
const isChiller = (name = "") => /(cooler|chiller)/i.test(String(name).trim());

// KPI helper (للمبرّدات/الشيلرات فقط 0–5°C)
function calculateKPI(rows) {
  const all = [];
  let out = 0;
  for (const r of rows) {
    // نحتسب فقط الشيلرات/المبرّدات ونستثني الفريزر وغرفة الإنتاج
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

/* ===== Helpers للتاريخ ===== */
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

export default function POS10TemperatureInput() {
  const [coolers, setCoolers] = useState(
    Array.from({ length: defaultRows.length }, (_, i) => ({
      name: defaultRows[i],
      temps: {},
      remarks: "",
    }))
  );
  const [reportDate, setReportDate] = useState("");
  const [checkedBy, setCheckedBy] = useState("");
  const [verifiedBy, setVerifiedBy] = useState("");
  const [opMsg, setOpMsg] = useState("");

  // حالة فحص التكرار
  const [dateBusy, setDateBusy] = useState(false);
  const [dateTaken, setDateTaken] = useState(false);
  const [dateError, setDateError] = useState("");

  const kpi = useMemo(() => calculateKPI(coolers), [coolers]);

  const baseInput = {
    width: "63px",
    padding: "6px 8px",
    borderRadius: "8px",
    border: "1.7px solid #2980b9",
    textAlign: "center",
    fontWeight: "600",
    color: "#2c3e50",
    fontSize: "1em",
    background: "#fafbff",
    transition: "all .18s",
  };

  // تلوين حسب نوع الصف:
  // - الشيلرات/المبرّدات: 0–5°C
  // - الفريزر: -25 إلى -12°C
  // - غرفة الإنتاج: 8–16°C (حسب طلبك)
  const tempInputStyle = (val, rowName) => {
    const t = Number(val);
    if (val === "" || isNaN(t)) return baseInput;

    if (isFreezer(rowName)) {
      if (t < -25 || t > -12)
        return { ...baseInput, background: "#fdecea", borderColor: "#e74c3c", color: "#c0392b", fontWeight: 700 };
      return { ...baseInput, background: "#eaf6fb", borderColor: "#3498db", color: "#2471a3" };
    } else if (isRoom(rowName)) {
      // Production Room: 8–16°C
      if (t < 8 || t > 16)
        return { ...baseInput, background: "#fdecea", borderColor: "#e74c3c", color: "#c0392b", fontWeight: 700 };
      if (t >= 14)
        return { ...baseInput, background: "#fff7ed", borderColor: "#f59e0b", color: "#92400e", fontWeight: 700 };
      return { ...baseInput, background: "#eaf6fb", borderColor: "#3498db", color: "#1f4f7a" };
    } else {
      // شيلرات/مبرّدات: 0–5°C
      if (t > 5 || t < 0)
        return { ...baseInput, background: "#fdecea", borderColor: "#e74c3c", color: "#c0392b", fontWeight: 700 };
      if (t >= 3)
        return { ...baseInput, background: "#eaf6fb", borderColor: "#3498db", color: "#2471a3" };
      return baseInput;
    }
  };

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
      next[rowIdx] = {
        ...next[rowIdx],
        remarks: value,
        temps: { ...next[rowIdx].temps, ["Corrective Action"]: value },
      };
      return next;
    });
  };

  /* ===================== منع تكرار اليوم ===================== */
  useEffect(() => {
    let abort = false;

    async function checkDuplicate() {
      const d = toISODate(reportDate);
      setDateError("");
      setDateTaken(false);
      if (!d) return;

      setDateBusy(true);
      try {
        const res = await fetch(`${API_BASE}/api/reports?type=pos10_temperature`, { cache: "no-store" });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = await res.json();
        const arr = Array.isArray(json) ? json : json?.data || json?.items || json?.rows || [];

        const exists = arr.some((r) => {
          const p = r?.payload ?? r;
          const b = (p?.branch || "").toLowerCase().trim();
          const pd = p?.date || p?.reportDate || r?.created_at;
          return b === "pos 10" && sameDay(pd, d);
        });

        if (!abort) setDateTaken(exists);
      } catch (e) {
        if (!abort) {
          setDateError("⚠️ فشل التحقق من وجود تقرير لهذا اليوم. حاول لاحقًا.");
          setDateTaken(false);
        }
      } finally {
        if (!abort) setDateBusy(false);
      }
    }

    checkDuplicate();
    return () => {
      abort = true;
    };
  }, [reportDate]);

  const handleSave = async () => {
    if (!reportDate) return alert("⚠️ الرجاء اختيار تاريخ التقرير أولًا");
    if (!checkedBy.trim() || !verifiedBy.trim())
      return alert("⚠️ Checked By and Verified By are required");

    if (dateTaken) {
      return alert("⛔ غير مسموح بحفظ أكثر من تقرير ليوم واحد لنفس الفرع.\nاختر تاريخًا آخر أو عدّل التقرير السابق.");
    }

    try {
      setOpMsg("⏳ Saving...");
      const payload = {
        branch: "POS 10",
        coolers,
        times, // قائمة الأوقات كاملة للتوافق مع العرض
        date: toISODate(reportDate),
        checkedBy,
        verifiedBy,
        savedAt: Date.now(),
        unique_key: `pos10_temperature_${toISODate(reportDate)}`,
      };
      const res = await fetch(`${API_BASE}/api/reports`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reporter: "pos10", type: "pos10_temperature", payload }),
      });
      if (!res.ok) {
        if (res.status === 409) {
          throw new Error("⛔ يوجد تقرير محفوظ لنفس اليوم (409 Conflict).");
        }
        throw new Error(`HTTP ${res.status}`);
      }
      setOpMsg("✅ Saved successfully!");
    } catch (e) {
      console.error(e);
      setOpMsg(`❌ Failed to save. ${e?.message || ""}`);
    } finally {
      setTimeout(() => setOpMsg(""), 4000);
    }
  };

  return (
    <div style={{ background: "linear-gradient(120deg, #f6f8fa 65%, #e8daef 100%)", padding: "1.5rem", borderRadius: "14px", boxShadow: "0 4px 18px #d2b4de44" }}>
      {/* ترويسة المستند */}
      <table style={topTable}>
        <tbody>
          <tr>
            <td rowSpan={4} style={{ ...tdHeader, width: 140, textAlign: "center" }}>
              <div style={{ fontWeight: 900, color: "#a00", fontSize: 14, lineHeight: 1.2 }}>
                AL<br />MAWASHI
              </div>
            </td>
            <td style={tdHeader}><b>Document Title:</b> Temperature Control Record</td>
            <td style={tdHeader}><b>Document No:</b> FS-QM/REC/TMP</td>
          </tr>
          <tr>
            <td style={tdHeader}><b>Issue Date:</b> 05/02/2020</td>
            <td style={tdHeader}><b>Revision No:</b> 0</td>
          </tr>
          <tr>
            <td style={tdHeader}><b>Area:</b> POS 10</td>
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

      {/* التاريخ */}
      <div style={{ margin: "8px 0 10px", display: "flex", justifyContent: "flex-end", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
        <label style={{ fontWeight: 600 }}>📅 Date:</label>
        <input
          type="date"
          value={reportDate}
          onChange={(e) => setReportDate(e.target.value)}
          style={{ padding: "6px 10px", borderRadius: 8, border: "1px solid #9aa4ae", background: "#fff" }}
        />
        {/* حالة التحقق */}
        {reportDate && (
          <>
            {dateBusy && <span style={{ color: "#6b7280", fontWeight: 600 }}>جارٍ التحقق…</span>}
            {!dateBusy && dateTaken && (
              <span style={{ color: "#b91c1c", fontWeight: 700 }}>⛔ يوجد تقرير محفوظ لهذا اليوم</span>
            )}
            {!dateBusy && !dateTaken && !dateError && (
              <span style={{ color: "#065f46", fontWeight: 700 }}>✅ التاريخ متاح</span>
            )}
            {dateError && <span style={{ color: "#b45309", fontWeight: 700 }}>{dateError}</span>}
          </>
        )}
      </div>

      {/* تعليمات */}
      <div style={rulesBox}>
        <div>1. If the cooler temp is +5°C or more – corrective action should be taken.</div>
        <div>2. If the loading area is more than +16°C – corrective action should be taken.</div>
        <div>3. If the preparation area is more than +10°C – corrective action should be taken.</div>
        <div style={{ marginTop: 6 }}>
          <b>Note (Freezers):</b> acceptable range -25°C to -12°C.
        </div>
        <div style={{ marginTop: 6 }}>
          <b>Corrective action:</b> Transfer the meat to another cold room and call maintenance department to check and solve the problem.
        </div>
      </div>

      {/* جدول الإدخال بالأوقات */}
      <table style={gridTable}>
        <thead>
          <tr>
            <th style={thCell}>Cooler/Freezer</th>
            {gridTimes.map((t) => (
              <th key={t} style={thCell}>{t}</th>
            ))}
            <th style={thCell}>Remarks</th>
          </tr>
        </thead>
        <tbody>
          {coolers.map((c, row) => (
            <tr key={row}>
              <td style={tdCellLeft}>
                <span style={{ fontWeight: 600 }}>{c.name}</span>
              </td>

              {gridTimes.map((t) => (
                <td key={t} style={tdCellCenter}>
                  <input
                    type="number"
                    value={c.temps?.[t] ?? ""}
                    onChange={(e) => setTemp(row, t, e.target.value)}
                    style={tempInputStyle(c.temps?.[t], c.name)}
                    placeholder="°C"
                    min="-40"
                    max="50"
                    step="0.1"
                  />
                </td>
              ))}

              <td style={tdCellLeft}>
                <input
                  type="text"
                  value={c.remarks}
                  onChange={(e) => setRemarks(row, e.target.value)}
                  placeholder="Write action / notes"
                  style={{ border: "1px solid #29b97dff", borderRadius: 8, padding: "6px 8px", minWidth: 220, fontWeight: 600 }}
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* KPI + Checked/Verified + Save */}
      <div style={{ display: "flex", justifyContent: "space-between", gap: 16, marginTop: 12, alignItems: "center", flexWrap: "wrap" }}>
        <div style={{ fontWeight: 700 }}>
          KPI — Avg: {kpi.avg}°C | Min: {kpi.min}°C | Max: {kpi.max}°C | Out-of-range: {kpi.out}
          <span style={{ marginInlineStart: 10, fontWeight: 600, color: "#374151" }}>
            (Chillers/Coolers only)
          </span>
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
          <button
            onClick={handleSave}
            style={{ ...saveBtn, opacity: dateTaken ? 0.6 : 1, pointerEvents: dateTaken ? "none" : "auto" }}
            title={dateTaken ? "غير مسموح بحفظ أكثر من تقرير لنفس اليوم" : "Save to Server"}
          >
            💾 Save to Server
          </button>
        </div>
      </div>

      {opMsg && (
        <div style={{ marginTop: 10, fontWeight: 700, color: opMsg.startsWith("❌") ? "#b91c1c" : "#065f46" }}>
          {opMsg}
        </div>
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
const gridTable = { width: "100%", borderCollapse: "collapse", border: "1px solid #9aa4ae", background: "#ffffff" };
const thCell = { border: "1px solid #9aa4ae", padding: "6px 8px", textAlign: "center", background: "#e0e6ed", fontWeight: 700, fontSize: "0.9rem", whiteSpace: "nowrap" };
const tdCellCenter = { border: "1px solid #9aa4ae", padding: "6px 8px", textAlign: "center" };
const tdCellLeft = { border: "1px solid #9aa4ae", padding: "6px 8px", textAlign: "left" };
const miniInput = { border: "1px solid #aaa", borderRadius: 6, padding: "4px 8px", minWidth: 160, background: "#fff" };
const saveBtn = { background: "linear-gradient(180deg,#10b981,#059669)", color: "#fff", border: "none", padding: "10px 18px", borderRadius: 10, cursor: "pointer", fontWeight: 800, fontSize: "0.95rem", boxShadow: "0 6px 14px rgba(16,185,129,.3)" };
