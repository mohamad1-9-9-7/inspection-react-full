import React, { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import VehicleDayCards from "./VehicleDayCards";
import { listTrips } from "../driverTripApi";
import { mapsLink } from "../carConstants";

/* ===================== API base (CRA + Vite safe) ===================== */
const API_BASE_DEFAULT = "https://inspection-server-4nvj.onrender.com";

const CRA_URL =
  (typeof process !== "undefined" &&
    process.env &&
    process.env.REACT_APP_API_URL)
    ? process.env.REACT_APP_API_URL
    : undefined;

let VITE_URL;
try { VITE_URL = import.meta.env?.VITE_API_URL; } catch {}

const API_BASE = String(VITE_URL || CRA_URL || API_BASE_DEFAULT).replace(/\/$/, "");
const REPORTS_URL = `${API_BASE}/api/reports`;

const IS_SAME_ORIGIN = (() => {
  try { return new URL(API_BASE).origin === window.location.origin; }
  catch { return false; }
})();

/* ===================== Server type (matches LoadingLog.jsx) ===================== */
const LOADING_TYPE = "cars_loading_inspection";

/* ===================== Server helpers ===================== */
async function listReportsByType(type) {
  const res = await fetch(`${REPORTS_URL}?type=${encodeURIComponent(type)}`, {
    method: "GET",
    cache: "no-store",
    credentials: IS_SAME_ORIGIN ? "include" : "omit",
    headers: { Accept: "application/json" },
  });
  if (!res.ok) throw new Error(`Failed to list reports for ${type}`);
  const json = await res.json().catch(() => null);
  return Array.isArray(json) ? json : (json?.data || []);
}

async function deleteReportById(id) {
  const res = await fetch(`${REPORTS_URL}/${encodeURIComponent(id)}`, {
    method: "DELETE",
    credentials: IS_SAME_ORIGIN ? "include" : "omit",
  });
  if (!res.ok && res.status !== 404) {
    const t = await res.text().catch(() => "");
    throw new Error(t || "Failed to delete");
  }
  return true;
}

async function createReport(row) {
  const body = {
    reporter: row?.reporter || "import",
    type: row?.type || LOADING_TYPE,
    payload: row?.payload ?? {},
  };
  const res = await fetch(REPORTS_URL, {
    method: "POST",
    credentials: IS_SAME_ORIGIN ? "include" : "omit",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const t = await res.text().catch(() => "");
    throw new Error(t || "Failed to create");
  }
  const json = await res.json().catch(() => null);
  return json;
}

/* ===================== Visual Inspection Params (English only) ===================== */
/* NEW safety controls + existing hygiene controls (same ids as input page) */
const VI_PARAMS = [
  // NEW safety controls
  { id: "trafficControlSpotter",  en: "TRAFFIC CONTROL / SPOTTER USED" },
  { id: "vehicleSecured",         en: "VEHICLE SECURED (HANDBRAKE + CHOCKS)" },
  { id: "loadSecured",            en: "LOAD SECURED (STRAPS + INSPECTION)" },
  { id: "areaSafe",               en: "AREA SAFE (LIGHTING/ANTI-SLIP/WALKWAY CLEAR)" },
  { id: "manualHandlingControls", en: "MANUAL HANDLING CONTROLS APPLIED" },

  // Existing hygiene controls
  { id: "floorSealingIntact", en: "FLOOR SEALING INTACT" },
  { id: "floorCleaning",      en: "FLOOR CLEANING" },
  { id: "pestActivites",      en: "PEST ACTIVITIES" }, // id as in input form
  { id: "plasticCurtain",     en: "PLASTIC CURTAIN AVAILABLE/ CLEANING" },
  { id: "badOdour",           en: "BAD ODOUR" },
  { id: "ppeAvailable",       en: "PPE AVAILABLE" },
];

/* ===================== Date helpers (English) ===================== */
const pad = (n) => String(n).padStart(2, "0");
const localTodayISO = () => {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};
const todayISO = localTodayISO();

const parseToISO = (s) => {
  if (!s || typeof s !== "string") return null;
  const t = s.trim();

  if (/^\d{4}-\d{1,2}-\d{1,2}$/.test(t)) {
    const [y, m, d] = t.split("-").map(Number);
    return { y: String(y), m: pad(m), d: pad(d), iso: `${y}-${pad(m)}-${pad(d)}`, raw: s };
  }
  if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(t)) {
    const [dd, mm, yyyy] = t.split("/").map(Number);
    return { y: String(yyyy), m: pad(mm), d: pad(dd), iso: `${yyyy}-${pad(mm)}-${pad(dd)}`, raw: s };
  }
  if (/^\d{4}\/\d{1,2}\/\d{1,2}$/.test(t)) {
    const [yyyy, mm, dd] = t.split("/").map(Number);
    return { y: String(yyyy), m: pad(mm), d: pad(dd), iso: `${yyyy}-${pad(mm)}-${pad(dd)}`, raw: s };
  }
  return null;
};

const displayDate = (iso, { weekday = true } = {}) => {
  if (!iso) return "";
  const [y, m, d] = iso.split("-").map(Number);
  const dt = new Date(y, m - 1, d);
  const opts = { year: "numeric", month: "long", day: "2-digit", ...(weekday && { weekday: "short" }) };
  const locale = "en-GB";
  return new Intl.DateTimeFormat(locale, opts).format(dt);
};
const relativeLabel = (iso) => {
  if (!iso) return "";
  if (iso === todayISO) return " (Today)";
  const t = new Date(todayISO);
  const y = new Date(t.getFullYear(), t.getMonth(), t.getDate() - 1);
  const yISO = `${y.getFullYear()}-${pad(y.getMonth() + 1)}-${pad(y.getDate())}`;
  return iso === yISO ? " (Yesterday)" : "";
};

/* ===================== YES/NO Normalizer (FIX) ===================== */
const normYesNo = (v) => {
  const s = String(v ?? "").trim().toLowerCase();
  if (s === "yes" || s === "y" || s === "true" || s === "1") return "yes";
  if (s === "no" || s === "n" || s === "false" || s === "0") return "no";
  return null;
};

const yesNoLabel = (v) => {
  const n = normYesNo(v);
  return n === "yes" ? "YES" : n === "no" ? "NO" : "—";
};

/* ===================== Theme Styles =====================
   Soft Sky. Under #root every element is forced to 14px !important
   (globals.css), so sizes here go through `#root .lr-app …` rules that win on
   specificity and keep following the Aa text-size slider (--app-fs). */
const FS = (px) => `calc(${px}px * var(--app-fs, 1)) !important`;
function ThemeStyles() {
  return (
    <style>{`
      .lr-app {
        --sky: #0284c7; --sky-2: #0ea5e9; --ink: #0f172a; --muted: #64748b; --line: #e2e8f0;
        color: var(--ink);
        -webkit-font-smoothing: antialiased;
      }
      .lr-app::before {
        content: ""; position: fixed; inset: 0; z-index: -1; pointer-events: none;
        background:
          radial-gradient(60vmax 40vmax at 0% 0%, rgba(14,165,233,.10), transparent 60%),
          radial-gradient(50vmax 40vmax at 100% 0%, rgba(99,102,241,.08), transparent 60%),
          linear-gradient(180deg, #f8fbff 0%, #eef4fb 100%);
      }
      #root .lr-app .lr-h1 { font-size: ${FS(22)}; font-weight: 900; letter-spacing: -.01em; }
      #root .lr-app .lr-sub { font-size: ${FS(13)}; color: var(--muted); font-weight: 600; }
      #root .lr-app .lr-h2 { font-size: ${FS(19)}; font-weight: 900; }
      #root .lr-app .lr-kpi-v, #root .lr-app .lr-kpi-v * { font-size: ${FS(26)}; font-weight: 900; line-height: 1.1; }
      #root .lr-app .lr-kpi-t { font-size: ${FS(12)}; font-weight: 800; letter-spacing: .06em; text-transform: uppercase; }
      #root .lr-app .lr-small, #root .lr-app .lr-small * { font-size: ${FS(12)}; }
      #root .lr-app .lr-day-main { font-size: ${FS(15)}; font-weight: 800; }

      .lr-card {
        background: #fff; border: 1px solid var(--line); border-radius: 16px;
        box-shadow: 0 1px 2px rgba(15,23,42,.04), 0 8px 24px rgba(2,132,199,.06);
      }
      .panel { background: #fff; border: 1px solid var(--line); border-radius: 16px; box-shadow: 0 8px 24px rgba(2,132,199,.06); }
      .panel-body { padding: 12px; }

      .lr-top {
        display: flex; align-items: center; gap: 14px; flex-wrap: wrap; padding: 14px 18px; margin-bottom: 16px;
        background: rgba(255,255,255,.95);
      }
      .lr-logo {
        width: 46px; height: 46px; border-radius: 14px; display: grid; place-items: center; font-size: 24px;
        background: linear-gradient(135deg, var(--sky-2), #2563eb); color: #fff; box-shadow: 0 10px 22px rgba(37,99,235,.28);
        flex-shrink: 0;
      }
      .lr-btn {
        display: inline-flex; align-items: center; gap: 6px; min-height: 38px; padding: 7px 14px; border-radius: 11px;
        border: 1px solid #cbd5e1; background: #fff; color: var(--ink); font-weight: 800; cursor: pointer; font-family: inherit;
        transition: background .15s, border-color .15s;
      }
      .lr-btn:hover:not(:disabled) { background: #f0f9ff; border-color: #7dd3fc; }
      .lr-btn:disabled { opacity: .5; cursor: not-allowed; }
      .lr-btn.pri { background: linear-gradient(180deg, var(--sky-2), var(--sky)); border-color: var(--sky); color: #fff; }
      .lr-btn.pri:hover:not(:disabled) { filter: brightness(1.06); background: linear-gradient(180deg, var(--sky-2), var(--sky)); }
      .lr-today { display: inline-flex; align-items: center; gap: 6px; padding: 4px 10px; border-radius: 999px;
        background: #fee2e2; color: #b91c1c; font-weight: 900; border: 1px solid #fecaca; }
      .lr-today i { width: 8px; height: 8px; border-radius: 999px; background: #ef4444; display: inline-block;
        animation: lrPulse 1.6s ease-in-out infinite; }
      @keyframes lrPulse { 50% { opacity: .35; } }

      .lr-split { display: grid; grid-template-columns: 300px minmax(0, 1fr); gap: 16px; align-items: start; }
      @media (max-width: 980px) { .lr-split { grid-template-columns: 1fr; } }
      .lr-side { display: flex; flex-direction: column; overflow: hidden; max-height: calc(100vh - 140px); }
      @media (max-width: 980px) { .lr-side { max-height: 50vh; } }
      .lr-side-scroll { overflow: auto; padding: 6px 8px 10px; }
      .lr-search { width: 100%; box-sizing: border-box; padding: 9px 12px; border-radius: 11px; border: 1px solid #cbd5e1;
        background: #f8fafc; font-weight: 600; outline: none; font-family: inherit; }
      .lr-search:focus { border-color: var(--sky-2); background: #fff; box-shadow: 0 0 0 3px rgba(14,165,233,.15); }

      .lr-tree-y, .lr-tree-m { width: 100%; display: flex; align-items: center; justify-content: space-between; gap: 8px;
        border: 0; background: transparent; cursor: pointer; font-family: inherit; color: var(--ink); text-align: left; }
      .lr-tree-y { padding: 9px 10px; border-radius: 10px; font-weight: 900; }
      .lr-tree-y:hover, .lr-tree-m:hover { background: #f0f9ff; }
      .lr-tree-m { padding: 7px 10px 7px 18px; border-radius: 9px; font-weight: 800; color: #334155; }
      .lr-tree-m.open { color: var(--sky); }
      .lr-count { padding: 1px 8px; border-radius: 999px; background: #f1f5f9; color: var(--muted); font-weight: 800; }

      .lr-day { display: flex; align-items: center; gap: 10px; padding: 7px 8px 7px 10px; margin: 2px 0 2px 14px;
        border-radius: 11px; cursor: pointer; border: 1px solid transparent; transition: background .12s, border-color .12s; }
      .lr-day:hover { background: #f8fafc; border-color: var(--line); }
      .lr-day.on { background: linear-gradient(90deg, #e0f2fe, #f0f9ff); border-color: #7dd3fc; box-shadow: inset 3px 0 0 var(--sky); }
      .lr-day-num { width: 38px; height: 38px; border-radius: 10px; display: grid; place-items: center; flex-shrink: 0;
        background: #fff; border: 1px solid var(--line); font-weight: 900; line-height: 1; }
      .lr-day.on .lr-day-num { background: var(--sky); border-color: var(--sky); color: #fff; }
      .lr-pill { display: inline-flex; align-items: center; gap: 4px; padding: 1px 8px; border-radius: 999px; font-weight: 800;
        background: #eef2ff; color: #3730a3; }
      .lr-pill.trip { background: #ecfeff; color: #155e75; }
      .lr-del { margin-left: auto; border: 1px solid #fecaca; background: #fff5f5; color: #b91c1c; border-radius: 9px;
        width: 30px; height: 30px; cursor: pointer; flex-shrink: 0; }
      .lr-del:hover { background: #fee2e2; }

      .lr-kpis { display: grid; grid-template-columns: repeat(auto-fit, minmax(170px, 1fr)); gap: 12px; margin: 0 0 16px; }
      .lr-kpi { padding: 14px 16px 14px 18px; position: relative; overflow: hidden; display: grid; gap: 6px; align-content: start; }
      .lr-kpi::before { content: ""; position: absolute; left: 0; top: 0; bottom: 0; width: 4px; background: var(--acc, var(--sky)); }
      .lr-kpi-icon { position: absolute; right: 12px; top: 10px; opacity: .9; }

      .lr-doc { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; padding: 10px 14px; margin-bottom: 14px; }
      .lr-chip { padding: 4px 10px; border-radius: 999px; background: #f1f5f9; border: 1px solid var(--line); font-weight: 700; color: #334155; }
      .lr-doc-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 10px; width: 100%;
        margin-top: 8px; padding-top: 10px; border-top: 1px dashed #cbd5e1; }
      .lr-doc-grid b { display: block; color: var(--muted); font-weight: 700; }

      .lr-sec-h { display: flex; align-items: center; gap: 10px; padding: 12px 16px; border-bottom: 1px solid var(--line);
        font-weight: 900; color: #0c4a6e; background: linear-gradient(180deg, #f0f9ff, #fff); border-radius: 16px 16px 0 0; }

      .lr-empty { text-align: center; color: var(--muted); padding: 56px 16px; }

      .lr-app *::-webkit-scrollbar { height: 10px; width: 10px; }
      .lr-app *::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 10px; }
      .lr-app *::-webkit-scrollbar-thumb:hover { background: #94a3b8; }

      .toast-wrap { position: fixed; right: 16px; top: 16px; display: grid; gap: 8px; z-index: 9999; }
      .toast { background: #0f172a; color: white; padding: 10px 14px; border-radius: 12px;
        box-shadow: 0 10px 20px rgba(2,6,23,.2); font-weight: 700; letter-spacing: .2px; }
      .toast.ok { background: #16a34a; }
      .toast.err { background: #dc2626; }
      .toast.info { background: #2563eb; }
    `}</style>
  );
}

function StatCard({ title, value, suffix = "", hint = "", icon = "", accent = "#0284c7" }) {
  return (
    <div className="lr-card lr-kpi" style={{ "--acc": accent }}>
      {icon && <span className="lr-kpi-icon">{icon}</span>}
      <div className="lr-kpi-t" style={{ color: accent }}>{title}</div>
      <div className="lr-kpi-v">
        {value}
        {suffix && value !== "—" ? <span style={{ fontWeight: 800, color: "#64748b" }}>{suffix}</span> : null}
      </div>
      {hint && <div className="lr-small" style={{ color: "#64748b", fontWeight: 600 }}>{hint}</div>}
    </div>
  );
}

/* ====================== Tiny charts (no libs) ====================== */
function GaugeCircle({ value = 72, size = 120, stroke = 12, color = "#5dade2", label = "" }) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const clamped = Math.max(0, Math.min(100, Number(value) || 0));
  const dash = (clamped / 100) * c;

  return (
    <div style={{ display: "grid", placeItems: "center" }}>
      <svg width={size} height={size} style={{ display: "block" }}>
        <circle cx={size / 2} cy={size / 2} r={r} stroke="#eee" strokeWidth={stroke} fill="none" />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={color}
          strokeWidth={stroke}
          fill="none"
          strokeDasharray={`${dash} ${c - dash}`}
          strokeLinecap="round"
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
        <text x="50%" y="50%" dominantBaseline="middle" textAnchor="middle" style={{ fontWeight: 800, fill: "#1f2937" }}>
          {Math.round(clamped)}%
        </text>
      </svg>
      {label && <div style={{ marginTop: 6, fontWeight: 700, color: "#1f2937" }}>{label}</div>}
    </div>
  );
}

function Sparkline({ points = [], width = 240, height = 60, stroke = "#7d3c98" }) {
  if (!points || points.length === 0) {
    return <div style={{ height, display: "grid", placeItems: "center", color: "#6b7280" }}>—</div>;
  }
  const max = Math.max(...points, 1);
  const min = Math.min(...points, 0);
  const range = Math.max(1, max - min);
  const step = points.length > 1 ? width / (points.length - 1) : width;

  const ys = points.map((v) => {
    const norm = (v - min) / range;
    return height - norm * height;
  });
  const d = ys.map((y, i) => `${i * step},${y}`).join(" ");

  return (
    <svg width={width} height={height} style={{ display: "block" }}>
      <polyline points={d} fill="none" stroke={stroke} strokeWidth="2" />
    </svg>
  );
}


/* ====================== KPIs helpers ====================== */
const toNum = (x) => {
  const n = Number(String(x ?? "").replace(/[^\d.\-]/g, ""));
  return isNaN(n) ? null : n;
};

const parseTimeToMinutes = (t) => {
  if (!t || typeof t !== "string") return null;
  const m = t.trim().match(/^(\d{1,2}):(\d{2})$/);
  if (!m) return null;
  const hh = Number(m[1]);
  const mm = Number(m[2]);
  if (isNaN(hh) || isNaN(mm)) return null;
  return hh * 60 + mm;
};

/* minutes between start and end, or null when either is missing */
const durationOf = (v) => {
  const s = parseTimeToMinutes(v.timeStart);
  const e = parseTimeToMinutes(v.timeEnd);
  return s == null || e == null ? null : e - s;
};

const formatMinutes = (mins) => {
  if (mins == null || isNaN(mins)) return "—";
  const m = Math.max(0, Math.round(mins));
  return `${m}`;
};

function computeDayKPIs(vehicles) {
  const count = vehicles.length;

  const temps = vehicles.map((v) => toNum(v.tempCheck)).filter((n) => n != null);
  const avgTemp = temps.length ? (temps.reduce((a, b) => a + b, 0) / temps.length) : null;

  const durations = vehicles
    .map((v) => {
      const s = parseTimeToMinutes(v.timeStart);
      const e = parseTimeToMinutes(v.timeEnd);
      if (s == null || e == null) return null;
      const d = e - s;
      return isNaN(d) ? null : Math.max(0, d);
    })
    .filter((n) => n != null);
  const avgDuration = durations.length ? durations.reduce((a, b) => a + b, 0) / durations.length : null;

  // ✅ FIX: normalize yes/no values
  let totalChecks = 0;
  let yesChecks = 0;
  vehicles.forEach((v) => {
    VI_PARAMS.forEach((p) => {
      const val = normYesNo(v[p.id]);
      if (val === "yes" || val === "no") {
        totalChecks += 1;
        if (val === "yes") yesChecks += 1;
      }
    });
  });
  const yesRate = totalChecks ? (yesChecks / totalChecks) * 100 : null;

  return { count, avgTemp, avgDuration, yesRate };
}

/* ====================== Driver trip → table row ======================
   A trip scanned on the driver's phone (DriverTrip.jsx) fills the same
   vehicles table as the outbound checklist: loading start / end = Time Start /
   Time End (never an arrival — that would turn the loading-duration KPI into
   trip length), loading temperature = Temp Check, and every destination with
   its arrival time / temperature. The eleven checks are not asked of the
   driver, so they stay "—" and do not count in the yes rate. */
function tripToRecord(tr) {
  const stops = Array.isArray(tr.destinations) ? tr.destinations : [];
  return {
    __docId: `trip:${tr.id || tr._outboxId}`,
    __rowIndex: 0,
    __trip: true,
    date: tr.reportDate || "",
    header: null,
    inspectedBy: "",
    verifiedBy: "",
    vehicleNo: tr.vehicleNo || "",
    driverName: tr.driverEmpNo ? `${tr.driverName || ""} (${tr.driverEmpNo})` : tr.driverName || "",
    timeStart: tr.loading?.time || "",
    timeEnd: tr.loading?.endTime || "",
    tempCheck: tr.loading?.temp ?? "",
    destination: stops
      .map((d) => (d.arrival
        ? `${d.name} (arr ${d.arrival.time || "—"}, ${d.arrival.temp ?? "—"}°C)`
        : `${d.name} (not arrived)`))
      .join(" · "),
    // every photo and location the driver took, labelled by where it was taken
    __photos: [
      ...(tr.loading?.photos || []).map((src) => ({ src, label: "Loading" })),
      ...stops.flatMap((d) => (d.arrival?.photos || []).map((src) => ({ src, label: d.name }))),
    ],
    __locs: [
      ...(tr.loading?.location ? [{ label: "Loading", loc: tr.loading.location }] : []),
      ...stops.filter((d) => d.arrival?.location).map((d) => ({ label: d.name, loc: d.arrival.location })),
    ],
    __tripRaw: tr, // the vehicle popup shows the whole trip
  };
}

/* ====================== Full-size photo viewer ====================== */
function PhotoViewer({ photos, index, onIndex, onClose }) {
  const n = photos.length;
  const go = (d) => onIndex((index + d + n) % n);
  useEffect(() => {
    // capture phase + stop: Esc closes the photo only, not the vehicle popup under it
    const onKey = (e) => {
      if (e.key === "Escape") { e.stopImmediatePropagation(); onClose(); }
      else if (e.key === "ArrowRight") onIndex((index + 1) % n);
      else if (e.key === "ArrowLeft") onIndex((index - 1 + n) % n);
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [index, n, onIndex, onClose]);
  const p = photos[index];
  const nav = {
    position: "absolute", top: "50%", transform: "translateY(-50%)", width: 48, height: 48, borderRadius: 999,
    border: "none", background: "rgba(255,255,255,.9)", fontSize: 22, fontWeight: 900, cursor: "pointer",
  };
  // into <body>, above the vehicle popup (the page wrapper is its own z-index:1 layer)
  return createPortal(
    <div
      onClick={onClose}
      style={{ position: "fixed", inset: 0, zIndex: 10000, background: "rgba(2,6,23,.82)", display: "grid", placeItems: "center", padding: 20, fontFamily: "Inter, system-ui, Arial", fontSize: 14 }}
    >
      <div onClick={(e) => e.stopPropagation()} style={{ position: "relative", maxWidth: "92vw", maxHeight: "88vh", textAlign: "center" }}>
        <img src={p.src} alt={p.label} style={{ maxWidth: "92vw", maxHeight: "78vh", borderRadius: 12, display: "block", margin: "0 auto" }} />
        <div style={{ color: "#fff", fontWeight: 800, marginTop: 10, display: "flex", gap: 12, justifyContent: "center", alignItems: "center" }}>
          <span>{p.label} · {index + 1} / {n}</span>
          <a href={p.src} target="_blank" rel="noreferrer" style={{ color: "#7dd3fc" }}>Open original ↗</a>
          <button type="button" onClick={onClose} style={{ padding: "4px 12px", borderRadius: 8, border: "none", fontWeight: 800, cursor: "pointer" }}>✕ Close</button>
        </div>
        {n > 1 && (
          <>
            <button type="button" onClick={() => go(-1)} style={{ ...nav, left: -10 }}>‹</button>
            <button type="button" onClick={() => go(1)} style={{ ...nav, right: -10 }}>›</button>
          </>
        )}
      </div>
    </div>,
    document.body
  );
}

/* ====================== Toast ====================== */
function useToasts() {
  const [toasts, setToasts] = useState([]);
  const idRef = useRef(1);

  const push = (text, type = "info", ttl = 3500) => {
    const id = idRef.current++;
    setToasts((t) => [...t, { id, text, type }]);
    setTimeout(() => {
      setToasts((t) => t.filter((x) => x.id !== id));
    }, ttl);
  };

  const api = {
    info: (t) => push(t, "info"),
    ok: (t) => push(t, "ok"),
    err: (t) => push(t, "err", 5000),
  };

  const UI = () => (
    <div className="toast-wrap">
      {toasts.map((t) => (
        <div key={t.id} className={`toast ${t.type}`}>{t.text}</div>
      ))}
    </div>
  );

  return { UI, ...api };
}

/* ====================== Page ====================== */
export default function LoadingReports() {
  const [docs, setDocs] = useState([]);
  const [trips, setTrips] = useState([]); // driver trips (DriverTrip.jsx), shown per day
  const [viewer, setViewer] = useState(null); // { photos: [{src,label}], index } — full-size photo
  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState(false);

  const [openYears, setOpenYears] = useState({});
  const [openMonths, setOpenMonths] = useState({});
  const [groupMode] = useState("month");
  const [selectedDayKey, setSelectedDayKey] = useState("");

  const [search, setSearch] = useState(""); // quick filter for days
  const fileRef = useRef();
  const { UI: Toasts, ok, err, info } = useToasts();

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [rows, tripRows] = await Promise.all([
        listReportsByType(LOADING_TYPE),
        listTrips().catch((e) => { console.warn("Driver trips load failed:", e); return []; }),
      ]);
      setDocs(Array.isArray(rows) ? rows : []);
      setTrips(tripRows);
      ok("Loaded from server");
    } catch (e) {
      console.error(e);
      err("Failed to fetch loading reports from server");
      setDocs([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Flatten: one record per vehicle row (keep docId + header at payload level)
  const records = useMemo(() => {
    return (docs || []).flatMap((row) => {
      const docId = row?._id || row?.id || String(Math.random());

      // ✅ FIX: support nesting payload.payload (some servers/exports wrap)
      const p = row?.payload?.payload ?? row?.payload ?? {};

      const dateISO = p?.reportDate || p?.date || "";
      const rowsArr = Array.isArray(p?.rows) ? p.rows : [];

      return rowsArr.map((r, idx) => {
        const rr = { ...(r || {}) };

        // ✅ FIX: normalize YES/NO for ALL VI fields (includes new safety controls)
        VI_PARAMS.forEach((param) => {
          const n = normYesNo(rr[param.id]);
          if (n) rr[param.id] = n;
        });

        return {
          __docId: docId,
          __rowIndex: idx,
          date: dateISO,
          header: p.header || null,
          inspectedBy: p.inspectedBy || "",
          verifiedBy: p.verifiedBy || "",
          ...rr,
        };
      });
    }).concat(trips.map(tripToRecord));
  }, [docs, trips]);

  const todaysCount = useMemo(
    () => records.filter((r) => parseToISO(r.date)?.iso === todayISO).length,
    [records]
  );

  /* ===== Build hierarchy and day index ===== */
  const { hierarchy, dayIndex, flatDays } = useMemo(() => {
    const years = new Map();
    const dayIndex = new Map();
    const flat = new Set();

    records.forEach((v) => {
      const p = parseToISO(v.date);
      if (!p) {
        const key = `raw:${v.date || "—"}`;
        if (!dayIndex.has(key)) dayIndex.set(key, []);
        dayIndex.get(key).push(v);
        flat.add(key);

        const y = "Unknown", m = "—";
        if (!years.has(y)) years.set(y, new Map());
        const months = years.get(y);
        if (!months.has(m)) months.set(m, new Set());
        months.get(m).add(key);
        return;
      }

      const key = `iso:${p.iso}`;
      if (!dayIndex.has(key)) dayIndex.set(key, []);
      dayIndex.get(key).push(v);
      flat.add(key);

      if (!years.has(p.y)) years.set(p.y, new Map());
      const months = years.get(p.y);
      if (!months.has(p.m)) months.set(p.m, new Set());
      months.get(p.m).add(key);
    });

    const sortedYears = [...years.keys()].sort((a, b) => b.localeCompare(a));
    const hierarchy = sortedYears.map((y) => {
      const months = years.get(y);
      const sortedMonths = [...months.keys()].sort((a, b) => b.localeCompare(a));
      const monthsArr = sortedMonths.map((m) => {
        const ks = [...months.get(m)];
        const iso = ks.filter((k) => k.startsWith("iso:")).sort((a, b) => b.slice(4).localeCompare(a.slice(4)));
        const raw = ks.filter((k) => k.startsWith("raw:"));
        return { year: y, month: m, dayKeys: [...iso, ...raw] };
      });
      return { year: y, months: monthsArr };
    });

    const flatDays = [...flat].sort((a, b) => {
      const aIso = a.startsWith("iso:") ? a.slice(4) : "";
      const bIso = b.startsWith("iso:") ? b.slice(4) : "";
      if (aIso && bIso) return bIso.localeCompare(aIso);
      if (aIso) return -1;
      if (bIso) return 1;
      return a.localeCompare(b);
    });

    return { hierarchy, dayIndex, flatDays };
  }, [records]);

  const tripsByDay = useMemo(() => {
    const m = new Map();
    trips.forEach((tr) => {
      const p = parseToISO(tr.reportDate);
      if (!p) return;
      const key = `iso:${p.iso}`;
      if (!m.has(key)) m.set(key, []);
      m.get(key).push(tr);
    });
    return m;
  }, [trips]);
  // Fallback selection
  useEffect(() => {
    if (selectedDayKey && dayIndex.has(selectedDayKey)) return;
    const fallback = groupMode === "day"
      ? flatDays[0]
      : hierarchy[0]?.months[0]?.dayKeys[0];
    setSelectedDayKey(fallback || "");
  }, [hierarchy, dayIndex, flatDays, selectedDayKey, groupMode]);

  const selectedVehicles = selectedDayKey ? dayIndex.get(selectedDayKey) || [] : [];
  const selectedIso = selectedDayKey?.startsWith("iso:") ? selectedDayKey.slice(4) : null;
  const selectedRaw = selectedDayKey?.startsWith("raw:") ? selectedDayKey.slice(4) : null;

  /* ===== Day header (show ONCE per day) ===== */
  const dayHeader = useMemo(() => {
    const first = selectedVehicles.find((v) => !v.__trip);
    return {
      header: first?.header || null,
      inspectedBy: first?.inspectedBy || "",
      verifiedBy: first?.verifiedBy || "",
    };
  }, [selectedVehicles]);

  /* ===== KPIs ===== */
  const dayKPIs = useMemo(() => computeDayKPIs(selectedVehicles), [selectedVehicles]);

  const sparkPoints = useMemo(() => {
    const lastKeys = flatDays.slice(0, 12).reverse();
    return lastKeys.map((k) => (dayIndex.get(k) || []).length);
  }, [flatDays, dayIndex]);

  /* ===== Delete all docs for a day ===== */
  const handleDeleteByDayKey = async (key) => {
    const isISO = key.startsWith("iso:");
    const label = isISO ? displayDate(key.slice(4)) : key.slice(4);

    // the day = its checklist sheet(s) AND the driver trips filed on it
    const vehicles = dayIndex.get(key) || [];
    const sheetIds = [...new Set(vehicles.filter(v => !v.__trip).map(v => v.__docId).filter(Boolean))];
    const tripIds = [...new Set(vehicles.filter(v => v.__trip).map(v => v.__tripRaw?.id).filter(Boolean))];
    const toDeleteIds = [...sheetIds, ...tripIds];
    if (!toDeleteIds.length) {
      info("Nothing saved on the server for this day yet");
      return;
    }
    const what = [
      sheetIds.length ? `${sheetIds.length} checklist sheet(s)` : "",
      tripIds.length ? `${tripIds.length} driver trip(s)` : "",
    ].filter(Boolean).join(" + ");
    if (!window.confirm(`Delete ${what} for: ${label}?\nThis cannot be undone.`)) return;

    try {
      for (const id of toDeleteIds) {
        await deleteReportById(id);
      }
      await fetchAll();
      if (selectedDayKey === key) setSelectedDayKey("");
      ok("Deleted from server");
    } catch (e) {
      console.error(e);
      err("Failed to delete from server");
    }
  };

  /* ===== Delete one driver trip (from the vehicle popup) ===== */
  const handleDeleteTrip = async (tr) => {
    if (!tr?.id) return;
    const who = `${tr.vehicleNo || ""}${tr.driverName ? ` · ${tr.driverName}` : ""}${tr.loading?.time ? ` · ${tr.loading.time}` : ""}`;
    if (!window.confirm(`Delete this driver trip (${who})?\nIts arrivals, photos and transfer notes go with it. This cannot be undone.`)) return;
    try {
      await deleteReportById(tr.id);
      await fetchAll();
      ok("Trip deleted");
    } catch (e) {
      console.error(e);
      err("Failed to delete the trip");
    }
  };

  /* ===== Export / Import / PDF ===== */
  const handleExportJSON = () => {
    try {
      const payload = {
        meta: {
          exportedAt: new Date().toISOString(),
          api: REPORTS_URL,
          type: LOADING_TYPE,
          count: (docs || []).length,
        },
        data: (docs || []).map((d) => ({
          reporter: d.reporter || "unknown",
          type: d.type || LOADING_TYPE,
          payload: d.payload || {},
          createdAt: d.createdAt || null,
          updatedAt: d.updatedAt || null,
        })),
      };
      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `loading_reports_${LOADING_TYPE}_${Date.now()}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      ok("Exported JSON");
    } catch (e) {
      console.error(e);
      err("Export failed");
    }
  };

  const handlePickImport = () => fileRef.current?.click();

  const handleImportFile = async (ev) => {
    const file = ev.target.files?.[0];
    ev.target.value = "";
    if (!file) return;

    setImporting(true);
    try {
      const text = await file.text();
      const parsed = JSON.parse(text);
      const arr = Array.isArray(parsed) ? parsed : (parsed?.data || []);
      if (!Array.isArray(arr) || arr.length === 0) {
        info("Nothing to import");
        setImporting(false);
        return;
      }

      let total = 0, saved = 0, skipped = 0, failed = 0;
      for (const row of arr) {
        total++;
        try {
          if ((row?.type || LOADING_TYPE) !== LOADING_TYPE) { skipped++; continue; }
          await createReport(row);
          saved++;
        } catch (e) {
          console.error(e);
          failed++;
        }
      }
      await fetchAll();
      ok(`Import done: saved=${saved}, skipped=${skipped}, failed=${failed}`);
    } catch (e) {
      console.error(e);
      err("Import failed: invalid JSON");
    } finally {
      setImporting(false);
    }
  };

  const handleExportPDF = () => {
    if (!selectedDayKey) return;

    const isISO = selectedDayKey.startsWith("iso:");
    const iso = isISO ? selectedDayKey.slice(4) : null;
    const dateLabel = isISO ? displayDate(iso, { weekday: false }) : selectedDayKey.slice(4);

    const esc = (s) =>
      String(s ?? "—")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");

    // ✅ FIX: use same label logic everywhere
    const yesNo = (v) => yesNoLabel(v);

    const k = dayKPIs || {};
    const yesRatePct = k.yesRate != null ? Math.round(k.yesRate) + "%" : "—";
    const avgTemp = k.avgTemp != null ? k.avgTemp.toFixed(1) : "—";
    const avgDur = k.avgDuration != null ? formatMinutes(k.avgDuration) : "—";
    const count = k.count ?? 0;

    const header = dayHeader?.header || {};
    const headerRows = `
      <tr><th>Document Title</th><td>${esc(header.documentTitle)}</td>
          <th>Document No</th><td>${esc(header.documentNo)}</td></tr>
      <tr><th>Issue Date</th><td>${esc(header.issueDate)}</td>
          <th>Revision No</th><td>${esc(header.revisionNo)}</td></tr>
      <tr><th>Area</th><td>${esc(header.area)}</td>
          <th>Issued By</th><td>${esc(header.issuedBy)}</td></tr>
      <tr><th>Controlling Officer</th><td>${esc(header.controllingOfficer)}</td>
          <th>Approved By</th><td>${esc(header.approvedBy)}</td></tr>
      <tr><th>Inspected By</th><td>${esc(dayHeader?.inspectedBy)}</td>
          <th>Verified By</th><td>${esc(dayHeader?.verifiedBy)}</td></tr>
    `;

    const viHeaders = VI_PARAMS.map((p) => `<th>${esc(p.en)}</th>`).join("");
    const rowsHtml = (selectedVehicles || [])
      .map((v) => {
        const dur = formatMinutes(durationOf(v));
        const checks = VI_PARAMS.map((p) => `<td>${yesNo(v[p.id])}</td>`).join("");
        return `
          <tr>
            <td>${esc(v.vehicleNo)}</td>
            <td>${esc(v.driverName)}</td>
            <td>${esc(v.timeStart)}</td>
            <td>${esc(v.timeEnd)}</td>
            <td>${esc(v.tempCheck)}</td>
            <td>${esc(dur)}</td>
            ${checks}
            <td>${esc(v.destination)}</td>
            <td>${(v.__locs || []).map((l) => `<a href="${esc(mapsLink(l.loc))}">${esc(l.label)}</a>`).join("<br/>") || "—"}</td>
          </tr>`;
      })
      .join("");

    const html = `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Loading Report - ${esc(dateLabel)}</title>
  <style>
    @page { size: A4 landscape; margin: 12mm; }
    * { box-sizing: border-box; font-family: Inter, Arial, sans-serif; }
    h1,h2 { margin: 0 0 8px; }
    .muted { color: #555; font-weight: 600; }
    .kpis { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; margin: 10px 0 14px; }
    .card { border: 1px solid #cbd5e1; padding: 8px 10px; border-radius: 8px; }
    .card .t { font-weight: 800; color: #334155; margin-bottom: 6px; }
    .card .v { font-size: 20px; font-weight: 900; color: #0f172a; }
    table { width: 100%; border-collapse: collapse; }
    thead th { background: #e2e8f0; }
    th, td { border: 1px solid #cbd5e1; padding: 6px 8px; text-align: center; font-size: 10px; }
    thead { display: table-header-group; }
    tr, td, th { break-inside: avoid; }
  </style>
</head>
<body>
  <h1>Loading Time Report</h1>
  <div class="muted">${esc(dateLabel)}</div>

  ${dayHeader?.header ? `
  <h2 style="margin-top:14px;">Document Header</h2>
  <table style="margin-bottom:10px;">
    <tbody>
      ${headerRows}
    </tbody>
  </table>` : ""}

  <div class="kpis">
    <div class="card"><div class="t">Vehicles</div><div class="v">${count}</div></div>
    <div class="card"><div class="t">Avg Temperature (°C)</div><div class="v">${esc(avgTemp)}</div></div>
    <div class="card"><div class="t">Avg Loading Duration (min)</div><div class="v">${esc(avgDur)}</div></div>
    <div class="card"><div class="t">Yes rate (all checks)</div><div class="v">${esc(yesRatePct)}</div></div>
  </div>

  <table>
    <thead>
      <tr>
        <th>Vehicle No</th>
        <th>Driver</th>
        <th>Time Start</th>
        <th>Time End</th>
        <th>Temp Check (°C)</th>
        <th>Duration (min)</th>
        ${viHeaders}
        <th>Destination</th>
        <th>Location</th>
      </tr>
    </thead>
    <tbody>
      ${rowsHtml || `<tr><td colspan="${8 + VI_PARAMS.length}">No vehicles for this day.</td></tr>`}
    </tbody>
  </table>

  <script>
    const go = () => { window.focus(); window.print(); setTimeout(()=>window.close(), 300); };
    window.onload = () => setTimeout(go, 200);
  </script>
</body>
</html>`;

    try {
      const w = window.open("", "_blank");
      if (!w) {
        err("Popup blocked by browser");
        return;
      }
      w.document.open();
      w.document.write(html);
      w.document.close();
      ok("PDF view opened");
    } catch (e) {
      console.error(e);
      err("Failed to open PDF window");
    }
  };

  /* ===== Styles (the rest lives in ThemeStyles) ===== */
  const pageWrap = {
    direction: "ltr",
    fontFamily: "Inter, ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Ubuntu, Cantarell, Noto Sans, Arial",
    minHeight: "100vh",
    padding: "16px clamp(12px, 2vw, 24px) 32px",
    color: "#0f172a",
    position: "relative",
    zIndex: 1,
  };
  const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  const monthName = (m) => MONTHS[Number(m) - 1] || m;

  /* the year and month of the day on screen stay open in the tree */
  useEffect(() => {
    if (!selectedDayKey?.startsWith("iso:")) return;
    const [y, m] = selectedDayKey.slice(4).split("-");
    setOpenYears((p) => (p[y] ? p : { ...p, [y]: true }));
    setOpenMonths((p) => (p[`${y}-${m}`] ? p : { ...p, [`${y}-${m}`]: true }));
  }, [selectedDayKey]);

  const [docOpen, setDocOpen] = useState(false);

  const safeDisplayDate = (maybeDate, opts) => {
    const p = parseToISO(maybeDate);
    return p ? displayDate(p.iso, opts) : (maybeDate || "—");
  };

  /* ===== Search / filter helpers ===== */
  const dayLabel = (k) => {
    const isISO = k.startsWith("iso:");
    if (isISO) {
      const iso = k.slice(4);
      return displayDate(iso, { weekday: false });
    }
    return k.slice(4);
  };

  const parseCountFilter = (txt) => {
    const s = (txt || "").trim();
    let m;
    if ((m = s.match(/^>=\s*(\d+)$/))) return { op: ">=", n: +m[1] };
    if ((m = s.match(/^>\s*(\d+)$/)))  return { op: ">",  n: +m[1] };
    if ((m = s.match(/^=\s*(\d+)$/)))  return { op: "=",  n: +m[1] };
    if ((m = s.match(/^<=\s*(\d+)$/))) return { op: "<=", n: +m[1] };
    if ((m = s.match(/^<\s*(\d+)$/)))  return { op: "<",  n: +m[1] };
    return null;
  };

  const filterPredicate = useMemo(() => {
    const s = (search || "").trim();
    if (!s) return () => true;

    const cmp = parseCountFilter(s);
    if (cmp) {
      return (k) => {
        const c = (dayIndex.get(k) || []).length;
        switch (cmp.op) {
          case ">=": return c >= cmp.n;
          case ">":  return c >  cmp.n;
          case "=":  return c === cmp.n;
          case "<=": return c <= cmp.n;
          case "<":  return c <  cmp.n;
          default: return true;
        }
      };
    }
    const low = s.toLowerCase();
    return (k) => dayLabel(k).toLowerCase().includes(low);
  }, [search, dayIndex]);

  const filteredFlat = useMemo(() => flatDays.filter(filterPredicate), [flatDays, filterPredicate]);

  /* ===== Sidebar pieces ===== */
  const DayRow = ({ k }) => {
    const isISO = k.startsWith("iso:");
    const iso = isISO ? k.slice(4) : null;
    const dt = iso ? new Date(+iso.slice(0, 4), +iso.slice(5, 7) - 1, +iso.slice(8, 10)) : null;
    const records = (dayIndex.get(k) || []).length;
    const trips = tripsByDay.get(k)?.length || 0;
    const sheets = records - trips;
    return (
      <div className={`lr-day${selectedDayKey === k ? " on" : ""}`} onClick={() => setSelectedDayKey(k)}>
        <div className="lr-day-num">{dt ? dt.getDate() : "?"}</div>
        <div style={{ minWidth: 0, display: "grid", gap: 3 }}>
          <div className="lr-day-main">
            {dt ? new Intl.DateTimeFormat("en-GB", { weekday: "short" }).format(dt) : k.slice(4)}
            {iso && relativeLabel(iso) && <span style={{ color: "#0284c7" }}>{relativeLabel(iso)}</span>}
          </div>
          <div className="lr-small" style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
            {sheets > 0 && <span className="lr-pill" title="Checklist vehicles">🧾 {sheets}</span>}
            {trips > 0 && <span className="lr-pill trip" title="Driver trips">📷 {trips}</span>}
          </div>
        </div>
        <button
          type="button"
          className="lr-del"
          title="Delete this day (server)"
          onClick={(e) => { e.stopPropagation(); handleDeleteByDayKey(k); }}
          data-delete-action="true"
        >
          🗑
        </button>
      </div>
    );
  };

  const YearMonthTree = () => (
    <>
      {hierarchy.map(({ year, months }) => {
        const yearCount = months.flatMap(({ dayKeys }) => dayKeys.filter(filterPredicate)).length;
        const yOpen = !!openYears[year];
        return (
          <div key={year} style={{ marginBottom: 4 }}>
            <button type="button" className="lr-tree-y" onClick={() => setOpenYears((p) => ({ ...p, [year]: !p[year] }))}>
              <span>{yOpen ? "▾" : "▸"} {year}</span>
              <span className="lr-count lr-small">{yearCount} days</span>
            </button>

            {yOpen && months.map(({ month, dayKeys }) => {
              const key = `${year}-${month}`;
              const mOpen = !!openMonths[key];
              const days = dayKeys.filter(filterPredicate);
              if (!days.length && search) return null;
              return (
                <div key={key}>
                  <button
                    type="button"
                    className={`lr-tree-m${mOpen ? " open" : ""}`}
                    onClick={() => setOpenMonths((p) => ({ ...p, [key]: !p[key] }))}
                  >
                    <span>{mOpen ? "▾" : "▸"} {monthName(month)}</span>
                    <span className="lr-count lr-small">{days.length}</span>
                  </button>
                  {mOpen && days.map((k) => <DayRow key={k} k={k} />)}
                </div>
              );
            })}
          </div>
        );
      })}
    </>
  );

  const FlatDayList = () => (
    <div>
      {filteredFlat.map((k) => <DayRow key={k} k={k} />)}
      {filteredFlat.length === 0 && <div className="lr-empty">No days</div>}
    </div>
  );

  const uniqueTrucks = new Set(selectedVehicles.map((v) => String(v.vehicleNo || "").replace(/\D/g, "") || v.__docId)).size;
  const selectedTripCount = selectedDayKey ? tripsByDay.get(selectedDayKey)?.length || 0 : 0;
  const docHeader = dayHeader.header;

  return (
    <div className="lr-app" style={pageWrap}>
      <ThemeStyles />
      <Toasts />
      {viewer && <PhotoViewer {...viewer} onIndex={(index) => setViewer({ ...viewer, index })} onClose={() => setViewer(null)} />}

      {/* ── Header bar ── */}
      <header className="lr-card lr-top">
        <div className="lr-logo">🚚</div>
        <div style={{ minWidth: 0 }}>
          <div className="lr-h1" style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
            Loading Reports
            {todaysCount > 0 && <span className="lr-today lr-small"><i /> {todaysCount} today</span>}
          </div>
          <div className="lr-sub">Outbound checklist and driver trips, day by day</div>
        </div>
        <div style={{ flex: 1 }} />
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button type="button" className="lr-btn" onClick={() => window.history.back()}>← Back</button>
          <button
            type="button"
            className="lr-btn pri"
            onClick={fetchAll}
            disabled={loading || importing}
            title={`API: ${REPORTS_URL}?type=${LOADING_TYPE}`}
          >
            {loading ? "Loading…" : "🔄 Refresh"}
          </button>
          <button type="button" className="lr-btn" onClick={handleExportPDF} disabled={!selectedDayKey || loading || importing} title="Export selected day to PDF (print window)">
            🖨️ PDF
          </button>
          <button type="button" className="lr-btn" onClick={handleExportJSON} disabled={loading || importing} title="Export current type as JSON">
            ⬇︎ Export
          </button>
          <button type="button" className="lr-btn" onClick={handlePickImport} disabled={loading || importing} title="Import JSON → save to server → refresh">
            ⬆︎ Import
          </button>
          <input type="file" accept="application/json" ref={fileRef} onChange={handleImportFile} style={{ display: "none" }} />
        </div>
      </header>

      {loading && hierarchy.length === 0 ? (
        <div className="lr-card lr-empty">Loading…</div>
      ) : hierarchy.length === 0 ? (
        <div className="lr-card lr-empty">No reports on the server yet.</div>
      ) : (
        <div className="lr-split">
          {/* ── Days ── */}
          <aside className="lr-card lr-side">
            <div style={{ padding: 10, borderBottom: "1px solid #e2e8f0" }}>
              <input
                className="lr-search"
                placeholder='Search… "2026", "October", or >=2'
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <div className="lr-side-scroll">
              {groupMode === "day" ? <FlatDayList /> : <YearMonthTree />}
            </div>
          </aside>

          {/* ── The day ── */}
          <main style={{ minWidth: 0 }}>
            {selectedDayKey ? (
              <>
                <div style={{ display: "flex", alignItems: "baseline", gap: 10, flexWrap: "wrap", margin: "2px 2px 12px" }}>
                  <div className="lr-h2">
                    {selectedIso ? displayDate(selectedIso) : selectedRaw}
                  </div>
                  {selectedIso && relativeLabel(selectedIso) && (
                    <span className="lr-pill trip lr-small">{relativeLabel(selectedIso).replace(/[()]/g, "").trim()}</span>
                  )}
                </div>

                {/* KPIs */}
                <div className="lr-kpis">
                  <StatCard title="Trucks" icon="🚚" accent="#0284c7" value={uniqueTrucks} hint={`${dayKPIs.count ?? 0} record(s) this day`} />
                  <StatCard title="Driver trips" icon="📷" accent="#0891b2" value={selectedTripCount} hint="Scanned on the phone" />
                  <StatCard
                    title="Avg temperature"
                    icon="🌡"
                    accent={dayKPIs.avgTemp != null && dayKPIs.avgTemp > 5 ? "#d97706" : "#2563eb"}
                    value={dayKPIs.avgTemp != null ? dayKPIs.avgTemp.toFixed(1) : "—"}
                    suffix=" °C"
                    hint="At loading"
                  />
                  <StatCard
                    title="Avg loading time"
                    icon="⏱"
                    accent="#7c3aed"
                    value={formatMinutes(dayKPIs.avgDuration)}
                    suffix=" min"
                    hint="Time end − time start"
                  />
                  <div className="lr-card lr-kpi" style={{ "--acc": "#16a34a", justifyItems: "center" }}>
                    <div className="lr-kpi-t" style={{ color: "#16a34a", justifySelf: "start" }}>Checks passed</div>
                    <GaugeCircle value={dayKPIs.yesRate != null ? dayKPIs.yesRate : 0} size={86} stroke={9} color="#22c55e" />
                  </div>
                  <div className="lr-card lr-kpi" style={{ "--acc": "#6366f1" }}>
                    <div className="lr-kpi-t" style={{ color: "#6366f1" }}>Last {sparkPoints.length || 0} days</div>
                    <Sparkline points={sparkPoints} width={180} height={52} stroke="#6366f1" />
                    <div className="lr-small" style={{ color: "#64748b", fontWeight: 600 }}>Records per day</div>
                  </div>
                </div>

                {/* Document control — one strip, details on demand */}
                {docHeader && (
                  <div className="lr-card lr-doc lr-small">
                    <span className="lr-chip">📄 {docHeader.documentTitle || "—"}</span>
                    <span className="lr-chip">No. {docHeader.documentNo || "—"}</span>
                    <span className="lr-chip">Rev {docHeader.revisionNo || "—"}</span>
                    {dayHeader.inspectedBy && <span className="lr-chip">Inspected: {dayHeader.inspectedBy}</span>}
                    {dayHeader.verifiedBy && <span className="lr-chip">Verified: {dayHeader.verifiedBy}</span>}
                    <button type="button" className="lr-btn" style={{ minHeight: 30, padding: "4px 10px" }} onClick={() => setDocOpen((v) => !v)}>
                      {docOpen ? "▴ Less" : "▾ Document control"}
                    </button>
                    {docOpen && (
                      <div className="lr-doc-grid">
                        {[
                          ["Issue date", safeDisplayDate(docHeader.issueDate, { weekday: false })],
                          ["Area", docHeader.area],
                          ["Issued by", docHeader.issuedBy],
                          ["Controlling officer", docHeader.controllingOfficer],
                          ["Approved by", docHeader.approvedBy],
                          ["Inspected by", dayHeader.inspectedBy],
                          ["Verified by", dayHeader.verifiedBy],
                        ].map(([k, v]) => (
                          <div key={k}><b>{k}</b>{v || "—"}</div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* One card per truck — a click opens everything about it for the day */}
                <section className="lr-card" style={{ marginBottom: 16 }}>
                  <div className="lr-sec-h">
                    🚚 Vehicles of the day
                    <span className="lr-small" style={{ color: "#64748b", fontWeight: 700 }}>· click a truck for its details</span>
                  </div>
                  <VehicleDayCards
                    vehicles={selectedVehicles}
                    viParams={VI_PARAMS}
                    normYesNo={normYesNo}
                    durationOf={durationOf}
                    onPhoto={(photos, index) => setViewer({ photos, index })}
                    onDeleteTrip={handleDeleteTrip}
                  />
                </section>
              </>
            ) : (
              <div className="lr-card lr-empty">Pick a day from the list.</div>
            )}
          </main>
        </div>
      )}
    </div>
  );
}
