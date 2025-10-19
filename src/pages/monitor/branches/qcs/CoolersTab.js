// src/pages/monitor/branches/qcs/CoolersTab.jsx
import React, { useMemo, useState } from "react";

/* =========================
   API base (CRA + Vite safe)
========================= */
const API_BASE_DEFAULT = "https://inspection-server-4nvj.onrender.com";

const CRA_URL =
  (typeof process !== "undefined" &&
    process.env &&
    process.env.REACT_APP_API_URL)
    ? process.env.REACT_APP_API_URL
    : undefined;

let VITE_URL;
try { VITE_URL = import.meta.env?.VITE_API_URL; } catch {}

const API_BASE = (VITE_URL || CRA_URL || API_BASE_DEFAULT).replace(/\/$/, "");
const IS_SAME_ORIGIN = (() => {
  try { return new URL(API_BASE).origin === window.location.origin; }
  catch { return false; }
})();

/* ---- Config ---- */
const LOGO_FALLBACK = "/brand/al-mawashi.jpg";

/* ✅ نوع تقرير مستقل لهذا التبويب فقط */
const COOLERS_TYPE = "qcs-coolers";

/* ---- Time helpers (4AM → 8PM كل ساعتين) ---- */
function formatHour(h) {
  const suffix = h < 12 ? "AM" : "PM";
  const disp = h % 12 === 0 ? 12 : h % 12;
  return `${disp}:00 ${suffix}`;
}
function generateTimes(startHour = 4, endHour = 20, step = 2) {
  const out = [];
  for (let h = startHour; h <= endHour; h += step) out.push(formatHour(h));
  return out;
}
const TIMES = generateTimes();

/* ---- Defaults ---- */
const defaultTMPHeader = {
  documentTitle: "Temperature Control Record",
  documentNo: "FS-QM/REC/TMP",
  issueDate: "05/02/2020",
  revisionNo: "0",
  area: "QA",
  issuedBy: "MOHAMAD ABDULLAH",
  controllingOfficer: "Quality Controller",
  approvedBy: "Hussam O. Sarhan",
};

const makeDefaultCoolers = () =>
  Array(8)
    .fill(null)
    .map(() => ({
      temps: TIMES.reduce((acc, t) => {
        acc[t] = "";
        return acc;
      }, {}),
      remarks: "",
    }));

/* ✅ Default Loading Area object */
const makeDefaultLoadingArea = () => ({
  temps: TIMES.reduce((acc, t) => { acc[t] = ""; return acc; }, {}),
  remarks: "",
});

/* ---- Ranges + KPI ---- */
function coolerRange(index) {
  if (index === 7) return { min: -19, max: -14 }; // FREEZER (8)
  if (index === 2 || index === 3) return { min: 8, max: 12 }; // Production Room (3 & 4)
  return { min: 0, max: 5 }; // Others
}
function inCoolerRange(index, t) {
  const { min, max } = coolerRange(index);
  return t >= min && t <= max;
}
/* ✅ Loading Area range (≤ 16°C) */
function loadingAreaRange() {
  return { min: 0, max: 16 };
}
function inLoadingAreaRange(t) {
  const { min, max } = loadingAreaRange();
  return t >= min && t <= max;
}

function calcCoolersKPI(coolers) {
  const all = [];
  let outOfRange = 0;
  (coolers || []).forEach((c, ci) => {
    TIMES.forEach((t) => {
      const v = c?.temps?.[t];
      const n = Number(v);
      if (v !== "" && !Number.isNaN(n)) {
        all.push(n);
        if (!inCoolerRange(ci, n)) outOfRange += 1;
      }
    });
  });
  const avgNum = all.length ? all.reduce((a, b) => a + b, 0) / all.length : null;
  return {
    avg: avgNum === null ? "—" : avgNum.toFixed(2),
    min: all.length ? Math.min(...all) : "—",
    max: all.length ? Math.max(...all) : "—",
    outOfRange,
  };
}

/* ===== تنسيق التاريخ الذكي (يعرض DD/MM/YYYY) ===== */
function formatDMYSmart(value) {
  if (!value) return "";
  const s = String(value).trim();

  let m = s.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (m) return `${m[3]}/${m[2]}/${m[1]}`;

  m = s.match(/^(\d{4})-(\d{2})-(\d{2})[T\s].*$/);
  if (m) return `${m[3]}/${m[2]}/${m[1]}`;

  m = s.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (m) return s;

  const d = new Date(s);
  if (!isNaN(d)) {
    const dd = String(d.getDate()).padStart(2, "0");
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const yy = d.getFullYear();
    return `${dd}/${mm}/${yy}`;
  }
  return s;
}

/* ---- Small UI helpers ---- */
function RowKV({ label, value }) {
  return (
    <div style={{ display: "flex", borderBottom: "1px solid #000" }}>
      <div
        style={{
          padding: "6px 8px",
          borderInlineEnd: "1px solid #000",
          minWidth: 170,
          fontWeight: 700,
        }}
      >
        {label}
      </div>
      <div style={{ padding: "6px 8px", flex: 1 }}>{value}</div>
    </div>
  );
}

/* ✅ الهيدر بدون خانة التحقق */
function TMPEntryHeader({ header, logoUrl, reportDate, dateValue, onDateChange }) {
  const h = header || defaultTMPHeader;
  return (
    <div style={{ border: "1px solid #000", marginBottom: 12, background: "#fff" }}>
      <div style={{ display: "grid", gridTemplateColumns: "180px 1fr 1fr", alignItems: "stretch" }}>
        <div
          style={{
            borderInlineEnd: "1px solid #000",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 8,
          }}
        >
          <img
            src={logoUrl || LOGO_FALLBACK}
            alt="Al Mawashi"
            style={{ maxWidth: "100%", maxHeight: 80, objectFit: "contain" }}
            crossOrigin="anonymous"
          />
        </div>
        <div style={{ borderInlineEnd: "1px solid #000" }}>
          <RowKV label="Document Title:" value={h.documentTitle} />
          <RowKV label="Issue Date:" value={h.issueDate} />
          <RowKV label="Area:" value={h.area} />
          <RowKV label="Controlling Officer:" value={h.controllingOfficer} />
        </div>
        <div>
          <RowKV label="Document No:" value={h.documentNo} />
          <RowKV label="Revision No:" value={h.revisionNo} />
          <RowKV label="Issued by:" value={h.issuedBy} />
          <RowKV label="Approved by:" value={h.approvedBy} />
        </div>
      </div>

      <div style={{ borderTop: "1px solid #000" }}>
        <div style={{ textAlign: "center", fontWeight: 900, padding: "6px 8px", borderBottom: "1px solid #000" }}>
          TRANS EMIRATES LIVESTOCK MEAT TRADING LLC
        </div>
        <div style={{ textAlign: "center", fontWeight: 900, padding: "6px 8px", borderBottom: "1px solid #000" }}>
          TEMPERATURE CONTROL CHECKLIST (CCP)
        </div>

        <div style={{ padding: "8px 10px", lineHeight: 1.6 }}>
          <div>1) If the temp is +5°C or more, check product temperature — take corrective action.</div>
          <div>2) If the loading area is more than +16°C — take corrective action.</div>
          <div>3) If the preparation area is more than +10°C — take corrective action.</div>
          <div style={{ marginTop: 6, fontWeight: 700 }}>
            Corrective action: transfer the meat to another cold room and call maintenance to check and solve the
            problem.
          </div>
        </div>

        {/* Report Date */}
        <div style={{ borderTop: "1px solid #000" }}>
          <div style={{ display: "flex", alignItems: "center" }}>
            <div style={{ padding: "6px 8px", borderInlineEnd: "1px solid #000", minWidth: 170, fontWeight: 700 }}>
              Report Date:
            </div>
            <div style={{ padding: "6px 8px", flex: 1, display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
              <span style={{ fontWeight: 800 }}>{reportDate || "—"}</span>
              <input
                type="date"
                value={dateValue}
                onChange={onDateChange}
                style={{ padding: "6px 10px", borderRadius: 8, border: "1px solid #cbd5e1" }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function tempInputStyle(temp, coolerIndex) {
  const t = Number(temp);
  const base = {
    width: 80,
    padding: "6px 8px",
    borderRadius: 8,
    border: "1.7px solid #94a3b8",
    textAlign: "center",
    fontWeight: 600,
    color: "#111827",
    background: "#ffffff",
    transition: "all .18s",
  };
  if (Number.isNaN(t) || temp === "") return base;

  const { min, max } = coolerRange(coolerIndex);
  if (t < min || t > max) {
    return { ...base, background: "#fee2e2", borderColor: "#ef4444", color: "#991b1b", fontWeight: 700 };
  }
  const warnBand = coolerIndex === 7 ? 1 : coolerIndex === 2 || coolerIndex === 3 ? 1 : 2;
  if (t >= max - warnBand) {
    return { ...base, background: "#e0f2fe", borderColor: "#38bdf8", color: "#075985" };
  }
  return base;
}

/* ✅ نسخة خاصة بـ Loading Area */
function tempInputStyleLoading(temp) {
  const t = Number(temp);
  const base = {
    width: 80,
    padding: "6px 8px",
    borderRadius: 8,
    border: "1.7px solid #94a3b8",
    textAlign: "center",
    fontWeight: 600,
    color: "#111827",
    background: "#ffffff",
    transition: "all .18s",
  };
  if (Number.isNaN(t) || temp === "") return base;

  const { min, max } = loadingAreaRange();
  if (t < min || t > max) {
    return { ...base, background: "#fee2e2", borderColor: "#ef4444", color: "#991b1b", fontWeight: 700 };
  }
  const warnBand = 1;
  if (t >= max - warnBand) {
    return { ...base, background: "#e0f2fe", borderColor: "#38bdf8", color: "#075985" };
  }
  return base;
}

/* =========================
   Server helpers (COOLERS only)
========================= */
async function listReportsByType(type) {
  const res = await fetch(
    `${API_BASE}/api/reports?type=${encodeURIComponent(type)}`,
    { method: "GET", cache: "no-store", credentials: IS_SAME_ORIGIN ? "include" : "omit" }
  );
  if (!res.ok) return [];
  const json = await res.json().catch(() => null);
  return Array.isArray(json) ? json : json?.data || [];
}
async function fetchExistingByDate(dateStr) {
  const rows = await listReportsByType(COOLERS_TYPE);
  const found = rows.find(r => String(r?.payload?.reportDate || "") === String(dateStr));
  return found ? { id: found._id || found.id, payload: found.payload || {} } : null;
}

/* ================================================================== */
/*                          CoolersTab Component                       */
/* ================================================================== */
export default function CoolersTab(props) {
  const {
    coolers,
    setCoolers,
    tmpHeader,
    setTmpHeader,
    kpi,
    logoUrl,
  } = props || {};

  const [date, setDate] = useState(() => new Date().toISOString().split("T")[0]);

  /* ✅ اسم/توقيع المدير للتحقق (أسفل الصفحة) */
  const [verifiedByManager, setVerifiedByManager] = useState("");

  const useExternalCoolers = Array.isArray(coolers) && typeof setCoolers === "function";
  const useExternalHeader = tmpHeader && typeof setTmpHeader === "function";

  const [localCoolers, setLocalCoolers] = useState(makeDefaultCoolers());
  const [localHeader, setLocalHeader] = useState(defaultTMPHeader);

  const [loadingArea, setLoadingArea] = useState(makeDefaultLoadingArea());

  const dataCoolers = useExternalCoolers ? coolers : localCoolers;
  const updateCoolers = useExternalCoolers ? setCoolers : setLocalCoolers;

  const header = useExternalHeader ? tmpHeader : localHeader;
  const setHeader = useExternalHeader ? setTmpHeader : setLocalHeader;

  const computedKpi = useMemo(() => calcCoolersKPI(dataCoolers), [dataCoolers]);
  const safeKPI = kpi || computedKpi || { avg: "—", min: "—", max: "—", outOfRange: 0 };

  const handleCoolerChange = (index, time, value) => {
    updateCoolers((prev) => {
      const next = [...(prev || [])];
      const curr = next[index] || { temps: {}, remarks: "" };
      next[index] = { ...curr, temps: { ...curr.temps, [time]: value } };
      return next;
    });
  };
  const handleCoolerRemarksChange = (index, value) => {
    updateCoolers((prev) => {
      const next = [...(prev || [])];
      const curr = next[index] || { temps: {}, remarks: "" };
      next[index] = { ...curr, remarks: value };
      return next;
    });
  };

  const handleLoadingChange = (time, value) => {
    setLoadingArea((prev) => ({
      ...prev,
      temps: { ...(prev?.temps || {}), [time]: value },
    }));
  };
  const handleLoadingRemarksChange = (value) => {
    setLoadingArea((prev) => ({ ...prev, remarks: value }));
  };

  const [saving, setSaving] = useState(false);
  async function saveCoolersToServer() {
    try {
      setSaving(true);
      const existing = await fetchExistingByDate(date);

      const payload = {
        reportDate: date,
        coolers: dataCoolers,
        loadingArea,
        headers: { tmpHeader: header },
        verifiedByManager, // يبقى محفوظًا
      };

      const body = { reporter: "QCS/COOLERS", type: COOLERS_TYPE, payload };

      if (existing?.id) {
        const res = await fetch(`${API_BASE}/api/reports/${encodeURIComponent(existing.id)}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          credentials: IS_SAME_ORIGIN ? "include" : "omit",
          body: JSON.stringify(body),
        });
        if (!res.ok) throw new Error((await res.text().catch(() => "")) || "Failed to update coolers report");
      } else {
        const res = await fetch(`${API_BASE}/api/reports`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: IS_SAME_ORIGIN ? "include" : "omit",
          body: JSON.stringify(body),
        });
        if (!res.ok) throw new Error((await res.text().catch(() => "")) || "Failed to create coolers report");
      }

      alert(`✅ Coolers saved for ${date}. (type: ${COOLERS_TYPE})`);
    } catch (e) {
      alert(`❌ Failed to save: ${e.message || e}`);
    } finally {
      setSaving(false);
    }
  }

  const remarksInputStyle = {
    width: 260,
    padding: "6px 10px",
    borderRadius: 8,
    border: "1.7px solid #94a3b8",
    background: "#ffffff",
    color: "#111827",
    fontWeight: 600,
    transition: "all .18s",
  };
  const btnSave = {
    padding: "10px 16px",
    borderRadius: 10,
    cursor: "pointer",
    border: "none",
    fontWeight: 800,
    background: "#059669",
    color: "#fff",
  };

  return (
    <div>
      {/* Header */}
      <TMPEntryHeader
        header={header}
        logoUrl={logoUrl}
        reportDate={formatDMYSmart(date)}
        dateValue={date}
        onDateChange={(e) => setDate(e.target.value)}
      />

      {/* KPI */}
      <div
        style={{
          display: "flex",
          gap: "1rem",
          flexWrap: "wrap",
          justifyContent: "center",
          marginBottom: 16,
        }}
      >
        <div style={{ background: "#fff", borderRadius: 12, padding: "0.75rem 1.25rem", boxShadow: "0 2px 12px rgba(0,0,0,.06)", minWidth: 160, textAlign: "center" }}>
          <div style={{ color: "#7c3aed", fontWeight: 700 }}>Average Temp</div>
          <div style={{ fontSize: "1.25rem", fontWeight: 800, color: (kpi || {}).outOfRange > 0 ? "#b91c1c" : "#16a34a" }}>
            {(kpi || safeKPI).avg}<span style={{ fontSize: ".9em", color: "#475569" }}> °C</span>
          </div>
        </div>
        <div style={{ background: "#fff", borderRadius: 12, padding: "0.75rem 1.25rem", boxShadow: "0 2px 12px rgba(0,0,0,.06)", minWidth: 160, textAlign: "center" }}>
          <div style={{ color: "#b91c1c", fontWeight: 700 }}>Out of Range</div>
          <div style={{ fontSize: "1.25rem", fontWeight: 800 }}>{(kpi || safeKPI).outOfRange}</div>
        </div>
        <div style={{ background: "#fff", borderRadius: 12, padding: "0.75rem 1.25rem", boxShadow: "0 2px 12px rgba(0,0,0,.06)", minWidth: 160, textAlign: "center" }}>
          <div style={{ color: "#0ea5e9", fontWeight: 700 }}>Min / Max</div>
          <div style={{ fontSize: "1.1rem", fontWeight: 800 }}>
            <span style={{ color: "#0369a1" }}>{(kpi || safeKPI).min}</span>
            <span style={{ color: "#94a3b8" }}> / </span>
            <span style={{ color: "#b91c1c" }}>{(kpi || safeKPI).max}</span>
            <span style={{ fontSize: ".9em", color: "#475569" }}> °C</span>
          </div>
        </div>
      </div>

      <h4 style={{ color: "#2980b9", marginBottom: "1rem", textAlign: "center" }}>
        4 AM — 8 PM (every 2 hours)
      </h4>

      {(dataCoolers || []).map((cooler, i) => (
        <div
          key={i}
          style={{
            marginBottom: "1.2rem",
            padding: "1rem",
            backgroundColor: i % 2 === 0 ? "#ecf6fc" : "#d6eaf8",
            borderRadius: "10px",
            boxShadow: "inset 0 0 6px rgba(0, 131, 230, 0.15)",
          }}
        >
          <strong style={{ display: "block", marginBottom: "0.8rem", fontSize: "1.1rem" }}>
            {i === 7 ? "FREEZER" : i === 2 || i === 3 ? "Production Room" : `Cooler ${i + 1}`}
          </strong>

          <div
            style={{
              display: "flex",
              gap: "0.7rem",
              flexWrap: "wrap",
              justifyContent: "flex-start",
              alignItems: "flex-end",
            }}
          >
            {TIMES.map((time) => (
              <label
                key={time}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  fontSize: "0.93rem",
                  color: "#34495e",
                  minWidth: "78px",
                }}
              >
                <span style={{ marginBottom: "7px", fontWeight: "600" }}>{time}</span>
                <input
                  type="number"
                  value={cooler?.temps?.[time] ?? ""}
                  onChange={(e) => handleCoolerChange(i, time, e.target.value)}
                  style={tempInputStyle(cooler?.temps?.[time] ?? "", i)}
                  placeholder="°C"
                  min="-50"
                  max="50"
                  step="0.1"
                  title={`Allowed: ${(() => {
                    const r = coolerRange(i);
                    return `${r.min}°C .. ${r.max}°C`;
                  })()}`}
                />
              </label>
            ))}

            {/* Remarks */}
            <label style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 7, minWidth: 260 }}>
              <span style={{ fontWeight: 600 }}>Remarks</span>
              <input
                type="text"
                value={cooler?.remarks || ""}
                onChange={(e) => handleCoolerRemarksChange(i, e.target.value)}
                placeholder="Notes / observations"
                style={remarksInputStyle}
              />
            </label>
          </div>
        </div>
      ))}

      {/* ✅ Loading Area — سطر تحت الفريزر */}
      <div
        style={{
          marginBottom: "1.2rem",
          padding: "1rem",
          backgroundColor: "#fff7ed",
          borderRadius: "10px",
          boxShadow: "inset 0 0 6px rgba(245, 159, 11, 0.18)",
          border: "1px dashed #f59e0b",
        }}
      >
        <strong style={{ display: "block", marginBottom: "0.8rem", fontSize: "1.1rem", color: "#b45309" }}>
          Loading Area (≤ 16°C)
        </strong>

        <div
          style={{
            display: "flex",
            gap: "0.7rem",
            flexWrap: "wrap",
            justifyContent: "flex-start",
            alignItems: "flex-end",
          }}
        >
          {TIMES.map((time) => (
            <label
              key={time}
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                fontSize: "0.93rem",
                color: "#92400e",
                minWidth: "78px",
              }}
            >
              <span style={{ marginBottom: "7px", fontWeight: "600" }}>{time}</span>
              <input
                type="number"
                value={loadingArea?.temps?.[time] ?? ""}
                onChange={(e) => handleLoadingChange(time, e.target.value)}
                style={tempInputStyleLoading(loadingArea?.temps?.[time] ?? "")}
                placeholder="°C"
                min="-10"
                max="50"
                step="0.1"
                title={`Allowed: ${(() => {
                  const r = loadingAreaRange();
                  return `${r.min}°C .. ${r.max}°C`;
                })()}`}
              />
            </label>
          ))}

          {/* Remarks */}
          <label style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 7, minWidth: 260 }}>
            <span style={{ fontWeight: 600, color: "#92400e" }}>Remarks</span>
            <input
              type="text"
              value={loadingArea?.remarks || ""}
              onChange={(e) => handleLoadingRemarksChange(e.target.value)}
              placeholder="Notes / observations"
              style={remarksInputStyle}
            />
          </label>
        </div>
      </div>

      {/* ✅ الشريط السفلي: زر الحفظ + Verified by (Manager) على يمينه */}
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          gap: 12,
          flexWrap: "wrap",
          alignItems: "center",
          marginTop: 12,
        }}
      >
        <button onClick={saveCoolersToServer} disabled={saving} style={btnSave}>
          {saving ? "⏳ Saving..." : "💾 Save Coolers"}
        </button>

        <label style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontWeight: 700 }}>Verified by (Manager):</span>
          <input
            type="text"
            value={verifiedByManager}
            onChange={(e) => setVerifiedByManager(e.target.value)}
            placeholder="Manager name / signature"
            style={{ padding: "6px 10px", borderRadius: 8, border: "1px solid #cbd5e1", minWidth: 260, fontWeight: 700 }}
          />
        </label>
      </div>
    </div>
  );
}
