// src/pages/monitor/branches/qcs/CoolersTab.jsx
import React, { useEffect, useMemo, useState } from "react";
import ProductPicker from "../_shared/ProductPicker";
import { countValidMatches, MIN_MATCHES } from "../_shared/TemperatureMatchingReport";

/* ===== Draft (localStorage) ===== */
const DRAFT_KEY = "qcs_coolers_draft_v1";
const loadDraft = () => {
  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
};

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

/* Report type stored on the server */
const COOLERS_TYPE = "qcs-coolers";

/* ---- Time helpers (4AM -> 8PM, every 2 hours) ---- */
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
const DEFAULT_MATCH_TIME = TIMES[Math.floor(TIMES.length / 2)] || TIMES[0];

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

/* Default Loading Area object */
const makeDefaultLoadingArea = () => ({
  temps: TIMES.reduce((acc, t) => { acc[t] = ""; return acc; }, {}),
  remarks: "",
});

const storageLabel = (index) =>
  index === 7 ? "FREEZER" : index === 2 || index === 3 ? "Production Room" : `Cooler ${index + 1}`;

const makeStorageOptions = () => [
  ...Array(8).fill(null).map((_, index) => ({
    key: `cooler-${index}`,
    type: index === 7 ? "frozen" : "chilled",
    coolerIndex: index,
    label: storageLabel(index),
  })),
  { key: "loading-area", type: "chilled", coolerIndex: null, label: "Loading Area" },
];

const PRODUCT_VERIFICATION_OPTIONS = makeStorageOptions();
const optionForKey = (key) => PRODUCT_VERIFICATION_OPTIONS.find((x) => x.key === key);

const makeProductVerificationRow = (overrides = {}) => ({
  time: overrides.time || DEFAULT_MATCH_TIME,
  storageKey: overrides.storageKey || "cooler-0",
  itemCode: overrides.itemCode || "",
  productName: overrides.productName || "",
  productTemp: overrides.productTemp || "",
  country: overrides.country || overrides.batchNo || "",
  remarks: overrides.remarks || "",
});

const makeDefaultProductVerifications = () => [
  makeProductVerificationRow({ time: "4:00 AM", storageKey: "cooler-0" }),
  makeProductVerificationRow({ time: "12:00 PM", storageKey: "cooler-4" }),
  makeProductVerificationRow({ time: "6:00 PM", storageKey: "cooler-7" }),
];

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
/* Loading Area range (<= 16°C) */
function loadingAreaRange() {
  return { min: 0, max: 16 };
}
function inLoadingAreaRange(t) {
  const { min, max } = loadingAreaRange();
  return t >= min && t <= max;
}

function productTempLimit(type) {
  return type === "frozen"
    ? { label: "≤ -18°C", pass: (n) => n <= -18 }
    : { label: "0 to 5°C", pass: (n) => n >= 0 && n <= 5 };
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

/* ===== Date formatting (DD/MM/YYYY) ===== */
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

/* Document header (no manual title editing) */
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
          <div>1) If the temp is +5°C or more, check product temperature - take corrective action.</div>
          <div>2) If the loading area is more than +16°C - take corrective action.</div>
          <div>3) If the preparation area is more than +10°C - take corrective action.</div>
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

/* Loading Area input style */
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

  const [date, setDate] = useState(() => {
    const d = loadDraft();
    return d.date || new Date().toISOString().split("T")[0];
  });

  /* Manager verification name (signature line) */
  const [verifiedByManager, setVerifiedByManager] = useState(() => loadDraft().verifiedByManager || "");

  const useExternalCoolers = Array.isArray(coolers) && typeof setCoolers === "function";
  const useExternalHeader = tmpHeader && typeof setTmpHeader === "function";

  const [localCoolers, setLocalCoolers] = useState(() => {
    const d = loadDraft();
    return Array.isArray(d.localCoolers) && d.localCoolers.length ? d.localCoolers : makeDefaultCoolers();
  });
  const [localHeader, setLocalHeader] = useState(defaultTMPHeader);

  const [loadingArea, setLoadingArea] = useState(() => {
    const d = loadDraft();
    return d.loadingArea && typeof d.loadingArea === "object" ? d.loadingArea : makeDefaultLoadingArea();
  });
  const [productVerifications, setProductVerifications] = useState(() => {
    const d = loadDraft();
    return Array.isArray(d.productVerifications) && d.productVerifications.length
      ? d.productVerifications
      : makeDefaultProductVerifications();
  });

  const dataCoolers = useExternalCoolers ? coolers : localCoolers;
  const updateCoolers = useExternalCoolers ? setCoolers : setLocalCoolers;

  const header = useExternalHeader ? tmpHeader : localHeader;

  const computedKpi = useMemo(() => calcCoolersKPI(dataCoolers), [dataCoolers]);
  const safeKPI = kpi || computedKpi || { avg: "—", min: "—", max: "—", outOfRange: 0 };

  /* Auto-save draft to localStorage */
  useEffect(() => {
    try {
      localStorage.setItem(
        DRAFT_KEY,
        JSON.stringify({
          date,
          verifiedByManager,
          localCoolers: useExternalCoolers ? dataCoolers : localCoolers,
          loadingArea,
          productVerifications,
          ts: Date.now(),
        })
      );
    } catch {}
  }, [date, verifiedByManager, localCoolers, loadingArea, productVerifications, dataCoolers, useExternalCoolers]);

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

  /* ---- Product matching (now grouped per storage area) ---- */
  const getRoomTempForVerification = (row) => {
    const opt = optionForKey(row.storageKey);
    if (!opt) return "";
    if (opt.key === "loading-area") return loadingArea?.temps?.[row.time] ?? "";
    return dataCoolers?.[opt.coolerIndex]?.temps?.[row.time] ?? "";
  };

  const getProductVerificationStatus = (row) => {
    const opt = optionForKey(row.storageKey);
    const n = Number(row.productTemp);
    if (!opt || row.productTemp === "" || Number.isNaN(n)) {
      return { text: "Pending", color: "#475569", bg: "#f1f5f9", limit: opt ? productTempLimit(opt.type).label : "" };
    }
    const limit = productTempLimit(opt.type);
    return limit.pass(n)
      ? { text: "PASS", color: "#065f46", bg: "#dcfce7", limit: limit.label }
      : { text: "FAIL", color: "#991b1b", bg: "#fee2e2", limit: limit.label };
  };

  /* Group verifications by storage area, keeping each row's global index */
  const verificationsByStorage = useMemo(() => {
    const map = {};
    (productVerifications || []).forEach((row, idx) => {
      const key = row.storageKey || "cooler-0";
      (map[key] = map[key] || []).push({ row, idx });
    });
    return map;
  }, [productVerifications]);

  /* Matching KPI (pass / fail / pending) */
  const productKpi = useMemo(() => {
    let pass = 0, fail = 0, pending = 0;
    (productVerifications || []).forEach((row) => {
      const opt = optionForKey(row.storageKey);
      const n = Number(row.productTemp);
      if (!opt || row.productTemp === "" || Number.isNaN(n)) { pending += 1; return; }
      if (productTempLimit(opt.type).pass(n)) pass += 1; else fail += 1;
    });
    return { pass, fail, pending, total: pass + fail + pending };
  }, [productVerifications]);

  const updateProductVerification = (index, key, value) => {
    setProductVerifications((prev) => {
      const next = [...(prev || [])];
      next[index] = { ...makeProductVerificationRow(), ...(next[index] || {}), [key]: value };
      return next;
    });
  };

  const addProductVerificationFor = (storageKey) => {
    setProductVerifications((prev) => [
      ...(prev || []),
      makeProductVerificationRow({ storageKey, time: DEFAULT_MATCH_TIME }),
    ]);
  };

  const removeProductVerification = (index) => {
    setProductVerifications((prev) => (prev || []).filter((_, i) => i !== index));
  };

  /* Per-section live status (in-range summary) */
  const sectionStatus = (temps, isInRange) => {
    let filled = 0, out = 0;
    TIMES.forEach((t) => {
      const v = temps?.[t];
      const n = Number(v);
      if (v !== "" && v != null && !Number.isNaN(n)) { filled += 1; if (!isInRange(n)) out += 1; }
    });
    if (!filled) return { text: "No data", color: "#475569", bg: "#f1f5f9" };
    if (out) return { text: `${out} out of range`, color: "#991b1b", bg: "#fee2e2" };
    return { text: "All in range", color: "#065f46", bg: "#dcfce7" };
  };

  const [saving, setSaving] = useState(false);
  async function saveCoolersToServer() {
    const matchCount = countValidMatches(productVerifications);
    if (matchCount < MIN_MATCHES) {
      alert(`⚠️ At least ${MIN_MATCHES} product matches (product + temperature) are required before saving. You currently have ${matchCount}.`);
      return;
    }
    try {
      setSaving(true);
      const existing = await fetchExistingByDate(date);

      const payload = {
        reportDate: date,
        coolers: dataCoolers,
        loadingArea,
        productVerifications,
        headers: { tmpHeader: header },
        verifiedByManager,
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

      try { localStorage.removeItem(DRAFT_KEY); } catch {}
      alert(`✅ Coolers saved for ${date}.`);
    } catch (e) {
      alert(`❌ Failed to save: ${e.message || e}`);
    } finally {
      setSaving(false);
    }
  }

  /* ---- Styles ---- */
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
    padding: "11px 22px",
    borderRadius: 10,
    cursor: "pointer",
    border: "none",
    fontWeight: 800,
    background: "#059669",
    color: "#fff",
    boxShadow: "0 4px 14px rgba(5,150,105,.28)",
  };
  const sectionSubLabel = {
    fontSize: ".74rem",
    fontWeight: 800,
    color: "#64748b",
    textTransform: "uppercase",
    letterSpacing: ".4px",
    marginBottom: 8,
    display: "block",
  };
  const statusChip = (s) => ({
    display: "inline-flex",
    alignItems: "center",
    padding: "4px 12px",
    borderRadius: 999,
    background: s.bg,
    color: s.color,
    fontWeight: 900,
    fontSize: ".82rem",
    whiteSpace: "nowrap",
  });
  const rangeBadge = {
    padding: "3px 11px",
    borderRadius: 999,
    background: "#eef2ff",
    color: "#3730a3",
    fontWeight: 800,
    fontSize: ".78rem",
    border: "1px solid #c7d2fe",
    whiteSpace: "nowrap",
  };
  const addMatchBtn = (accent) => ({
    padding: "7px 14px",
    borderRadius: 8,
    border: `1.5px solid ${accent}`,
    background: "#fff",
    color: accent,
    fontWeight: 800,
    cursor: "pointer",
    fontSize: ".85rem",
    whiteSpace: "nowrap",
  });
  const mField = { display: "flex", flexDirection: "column", gap: 4 };
  const mLabel = {
    fontSize: ".7rem",
    fontWeight: 800,
    color: "#64748b",
    textTransform: "uppercase",
    letterSpacing: ".3px",
  };
  const mInput = {
    padding: "7px 9px",
    borderRadius: 8,
    border: "1px solid #cbd5e1",
    background: "#fff",
    color: "#0f172a",
    fontWeight: 700,
    boxSizing: "border-box",
  };
  const mReadOnly = {
    padding: "7px 9px",
    borderRadius: 8,
    border: "1px solid #cbd5e1",
    background: "#f8fafc",
    fontWeight: 800,
    textAlign: "center",
    boxSizing: "border-box",
  };
  const delBtn = {
    alignSelf: "flex-end",
    border: "1px solid #fecaca",
    background: "#fff",
    color: "#dc2626",
    borderRadius: 8,
    width: 36,
    height: 36,
    fontWeight: 900,
    cursor: "pointer",
    lineHeight: 1,
  };

  const accentFor = (i) => (i === 7 ? "#0ea5e9" : i === 2 || i === 3 ? "#7c3aed" : "#2563eb");

  /* ---- Inline product-match panel (scoped to one storage area) ---- */
  const renderMatchPanel = (storageKey, accent) => {
    const list = verificationsByStorage[storageKey] || [];
    return (
      <div style={{ marginTop: 14, borderTop: `1px dashed ${accent}66`, paddingTop: 12 }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 10,
            flexWrap: "wrap",
            marginBottom: list.length ? 10 : 6,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: "1rem" }}>🔗</span>
            <strong style={{ color: "#0f172a" }}>Product Match</strong>
            <span style={{ color: "#94a3b8", fontWeight: 700, fontSize: ".82rem" }}>
              {list.length ? `${list.length} check${list.length === 1 ? "" : "s"}` : "optional"}
            </span>
          </div>
          <button type="button" onClick={() => addProductVerificationFor(storageKey)} style={addMatchBtn(accent)}>
            + Add product
          </button>
        </div>

        {list.length === 0 ? (
          <div style={{ color: "#94a3b8", fontWeight: 600, fontSize: ".86rem", paddingBottom: 4 }}>
            No product matched yet — add a check to compare a product against the recorded temperature.
          </div>
        ) : (
          <div style={{ display: "grid", gap: 10 }}>
            {list.map(({ row, idx }, pos) => {
              const status = getProductVerificationStatus(row);
              const roomTemp = getRoomTempForVerification(row);
              return (
                <div
                  key={idx}
                  style={{
                    display: "flex",
                    flexWrap: "wrap",
                    alignItems: "flex-end",
                    gap: 10,
                    background: "#ffffff",
                    border: "1px solid #e2e8f0",
                    borderRadius: 10,
                    padding: "10px 12px",
                    boxShadow: "0 1px 4px rgba(15,23,42,.05)",
                  }}
                >
                  <span
                    style={{
                      alignSelf: "center",
                      minWidth: 24,
                      height: 24,
                      borderRadius: 999,
                      background: `${accent}1a`,
                      color: accent,
                      fontWeight: 900,
                      fontSize: ".8rem",
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    {pos + 1}
                  </span>

                  <label style={{ ...mField, width: 100 }}>
                    <span style={mLabel}>Time</span>
                    <select value={row.time} onChange={(e) => updateProductVerification(idx, "time", e.target.value)} style={mInput}>
                      {TIMES.map((time) => <option key={time} value={time}>{time}</option>)}
                    </select>
                  </label>

                  <label style={{ ...mField, flex: "1 1 220px", minWidth: 200 }}>
                    <span style={mLabel}>Product {row.itemCode ? `· ${row.itemCode}` : ""}</span>
                    <ProductPicker
                      value={row.productName}
                      itemCode={row.itemCode}
                      accent={accent}
                      placeholder="Search code or product…"
                      onPick={(it) => {
                        setProductVerifications((prev) => {
                          const next = [...(prev || [])];
                          next[idx] = {
                            ...makeProductVerificationRow(),
                            ...(next[idx] || {}),
                            productName: it.description,
                            itemCode: it.item_code,
                          };
                          return next;
                        });
                      }}
                    />
                  </label>

                  <label style={{ ...mField, width: 130 }}>
                    <span style={mLabel}>Country</span>
                    <input
                      value={row.country || row.batchNo || ""}
                      onChange={(e) => updateProductVerification(idx, "country", e.target.value)}
                      placeholder="Origin"
                      style={mInput}
                    />
                  </label>

                  <label style={{ ...mField, width: 92 }}>
                    <span style={mLabel}>Product °C</span>
                    <input
                      type="number"
                      step="0.1"
                      value={row.productTemp}
                      onChange={(e) => updateProductVerification(idx, "productTemp", e.target.value)}
                      placeholder="°C"
                      style={{ ...mInput, textAlign: "center", fontWeight: 900 }}
                    />
                  </label>

                  <div style={{ ...mField, width: 92 }}>
                    <span style={mLabel}>Room °C</span>
                    <div style={{ ...mReadOnly, color: roomTemp === "" ? "#94a3b8" : "#0f172a" }}>
                      {roomTemp === "" ? "—" : `${roomTemp}°C`}
                    </div>
                  </div>

                  <div style={{ ...mField, width: 92 }}>
                    <span style={mLabel}>Limit</span>
                    <div style={{ ...mReadOnly, color: "#475569", fontSize: ".82rem" }}>{status.limit || "—"}</div>
                  </div>

                  <div style={{ ...mField }}>
                    <span style={mLabel}>Status</span>
                    <span style={statusChip(status)}>{status.text}</span>
                  </div>

                  <label style={{ ...mField, flex: "1 1 200px", minWidth: 180 }}>
                    <span style={mLabel}>Remarks / Corrective</span>
                    <input
                      value={row.remarks}
                      onChange={(e) => updateProductVerification(idx, "remarks", e.target.value)}
                      placeholder={status.text === "FAIL" ? "Corrective action required" : "Remarks"}
                      style={mInput}
                    />
                  </label>

                  <button type="button" onClick={() => removeProductVerification(idx)} style={delBtn} title="Remove product check">
                    ✕
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  /* ---- Temperature time-grid (shared by coolers & loading area) ---- */
  const renderTempGrid = (temps, onChange, styleFn, color) => (
    <div style={{ display: "flex", gap: "0.7rem", flexWrap: "wrap", alignItems: "flex-end" }}>
      {TIMES.map((time) => (
        <label
          key={time}
          style={{ display: "flex", flexDirection: "column", alignItems: "center", fontSize: "0.92rem", color, minWidth: 78 }}
        >
          <span style={{ marginBottom: 7, fontWeight: 600 }}>{time}</span>
          <input
            type="number"
            value={temps?.[time] ?? ""}
            onChange={(e) => onChange(time, e.target.value)}
            style={styleFn(temps?.[time] ?? "")}
            placeholder="°C"
            min="-50"
            max="50"
            step="0.1"
          />
        </label>
      ))}
    </div>
  );

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
      <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap", justifyContent: "center", marginBottom: 16 }}>
        <div style={{ background: "#fff", borderRadius: 12, padding: "0.75rem 1.25rem", boxShadow: "0 2px 12px rgba(0,0,0,.06)", minWidth: 160, textAlign: "center" }}>
          <div style={{ color: "#7c3aed", fontWeight: 700 }}>Average Temp</div>
          <div style={{ fontSize: "1.25rem", fontWeight: 800, color: safeKPI.outOfRange > 0 ? "#b91c1c" : "#16a34a" }}>
            {safeKPI.avg}<span style={{ fontSize: ".9em", color: "#475569" }}> °C</span>
          </div>
        </div>
        <div style={{ background: "#fff", borderRadius: 12, padding: "0.75rem 1.25rem", boxShadow: "0 2px 12px rgba(0,0,0,.06)", minWidth: 160, textAlign: "center" }}>
          <div style={{ color: "#b91c1c", fontWeight: 700 }}>Out of Range</div>
          <div style={{ fontSize: "1.25rem", fontWeight: 800 }}>{safeKPI.outOfRange}</div>
        </div>
        <div style={{ background: "#fff", borderRadius: 12, padding: "0.75rem 1.25rem", boxShadow: "0 2px 12px rgba(0,0,0,.06)", minWidth: 160, textAlign: "center" }}>
          <div style={{ color: "#0ea5e9", fontWeight: 700 }}>Min / Max</div>
          <div style={{ fontSize: "1.1rem", fontWeight: 800 }}>
            <span style={{ color: "#0369a1" }}>{safeKPI.min}</span>
            <span style={{ color: "#94a3b8" }}> / </span>
            <span style={{ color: "#b91c1c" }}>{safeKPI.max}</span>
            <span style={{ fontSize: ".9em", color: "#475569" }}> °C</span>
          </div>
        </div>
        <div style={{ background: "#fff", borderRadius: 12, padding: "0.75rem 1.25rem", boxShadow: "0 2px 12px rgba(0,0,0,.06)", minWidth: 160, textAlign: "center" }}>
          <div style={{ color: "#0f766e", fontWeight: 700 }}>Product Match</div>
          <div style={{ fontSize: "1.1rem", fontWeight: 800 }}>
            <span style={{ color: "#16a34a" }}>{productKpi.pass} ✓</span>
            <span style={{ color: "#94a3b8" }}> · </span>
            <span style={{ color: productKpi.fail ? "#b91c1c" : "#94a3b8" }}>{productKpi.fail} ✗</span>
            {productKpi.pending ? <span style={{ color: "#64748b", fontSize: ".8em" }}> · {productKpi.pending} pending</span> : null}
          </div>
        </div>
      </div>

      {/* Section intro */}
      <div style={{ textAlign: "center", marginBottom: "1rem" }}>
        <h4 style={{ color: "#2980b9", margin: 0, fontWeight: 900 }}>
          Temperatures & Product Matching
        </h4>
        <div style={{ color: "#64748b", fontWeight: 600, marginTop: 4 }}>
          4 AM — 8 PM (every 2 hours) · record each storage temperature and match a product right beside it.
        </div>
      </div>

      {/* Coolers (each with its own inline product matching) */}
      {(dataCoolers || []).map((cooler, i) => {
        const accent = accentFor(i);
        const r = coolerRange(i);
        const status = sectionStatus(cooler?.temps, (n) => inCoolerRange(i, n));
        return (
          <div
            key={i}
            style={{
              marginBottom: "1.1rem",
              padding: "1rem 1.1rem",
              background: "#ffffff",
              borderRadius: 14,
              border: "1px solid #e2e8f0",
              borderLeft: `5px solid ${accent}`,
              boxShadow: "0 4px 16px rgba(2,132,199,.06)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, flexWrap: "wrap", marginBottom: ".85rem" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                <span style={{ fontSize: "1.15rem" }}>{i === 7 ? "❄️" : "🧊"}</span>
                <strong style={{ fontSize: "1.08rem", color: "#0f172a" }}>
                  {i === 7 ? "FREEZER" : i === 2 || i === 3 ? "Production Room" : `Cooler ${i + 1}`}
                </strong>
                <span style={rangeBadge}>{`${r.min}°C to ${r.max}°C`}</span>
              </div>
              <span style={statusChip(status)}>{status.text}</span>
            </div>

            <span style={sectionSubLabel}>Temperatures (°C)</span>
            {renderTempGrid(cooler?.temps, (time, val) => handleCoolerChange(i, time, val), (t) => tempInputStyle(t, i), "#34495e")}

            <label style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 6, marginTop: 12 }}>
              <span style={{ fontWeight: 600, color: "#475569" }}>Remarks</span>
              <input
                type="text"
                value={cooler?.remarks || ""}
                onChange={(e) => handleCoolerRemarksChange(i, e.target.value)}
                placeholder="Notes / observations"
                style={remarksInputStyle}
              />
            </label>

            {renderMatchPanel(`cooler-${i}`, accent)}
          </div>
        );
      })}

      {/* Loading Area (with its own inline product matching) */}
      {(() => {
        const accent = "#d97706";
        const status = sectionStatus(loadingArea?.temps, inLoadingAreaRange);
        return (
          <div
            style={{
              marginBottom: "1.1rem",
              padding: "1rem 1.1rem",
              background: "#fffbeb",
              borderRadius: 14,
              border: "1px solid #fde68a",
              borderLeft: `5px solid ${accent}`,
              boxShadow: "0 4px 16px rgba(217,119,6,.07)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, flexWrap: "wrap", marginBottom: ".85rem" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                <span style={{ fontSize: "1.15rem" }}>🚚</span>
                <strong style={{ fontSize: "1.08rem", color: "#b45309" }}>Loading Area</strong>
                <span style={{ ...rangeBadge, background: "#fef3c7", color: "#92400e", border: "1px solid #fcd34d" }}>≤ 16°C</span>
              </div>
              <span style={statusChip(status)}>{status.text}</span>
            </div>

            <span style={{ ...sectionSubLabel, color: "#a16207" }}>Temperatures (°C)</span>
            {renderTempGrid(loadingArea?.temps, handleLoadingChange, tempInputStyleLoading, "#92400e")}

            <label style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 6, marginTop: 12 }}>
              <span style={{ fontWeight: 600, color: "#92400e" }}>Remarks</span>
              <input
                type="text"
                value={loadingArea?.remarks || ""}
                onChange={(e) => handleLoadingRemarksChange(e.target.value)}
                placeholder="Notes / observations"
                style={remarksInputStyle}
              />
            </label>

            {renderMatchPanel("loading-area", accent)}
          </div>
        );
      })()}

      {/* Verification statement */}
      <div
        style={{
          marginTop: 8,
          marginBottom: 12,
          padding: "12px 14px",
          background: "#f1f5f9",
          borderRadius: 12,
          color: "#334155",
          fontWeight: 700,
          lineHeight: 1.6,
        }}
      >
        Verification statement: a product was checked from the same storage area and compared with the recorded room/cooler temperature.
      </div>

      <div style={{ display: "flex", justifyContent: "center", gap: 12, flexWrap: "wrap", alignItems: "center", marginTop: 12 }}>
        <button onClick={saveCoolersToServer} disabled={saving} style={btnSave}>
          {saving ? "⏳ Saving..." : "💾 Save Coolers"}
        </button>

        <label style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontWeight: 700 }}>Verified by:</span>
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
