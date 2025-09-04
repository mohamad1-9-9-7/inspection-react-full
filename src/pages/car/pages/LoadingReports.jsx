import React, { useEffect, useMemo, useRef, useState } from "react";

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
const VI_PARAMS = [
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

/* ===================== Theme Styles ===================== */
function ThemeStyles() {
  return (
    <style>{`
      .lr-app {
        --primary: #2563eb;
        --accent: #7c3aed;
        --text: #0f172a;
        --panel-bg: rgba(255,255,255,0.72);
        --panel-border: rgba(255,255,255,0.55);
        --panel-shadow: 0 10px 30px rgba(2,6,23,0.08), 0 2px 10px rgba(2,6,23,0.06);
        --ch: 16px;
        --clip-chamfer: polygon(
          var(--ch) 0,
          calc(100% - var(--ch)) 0,
          100% var(--ch),
          100% calc(100% - var(--ch)),
          calc(100% - var(--ch)) 100%,
          var(--ch) 100%,
          0 calc(100% - var(--ch)),
          0 var(--ch)
        );
        color: var(--text);
        -webkit-font-smoothing: antialiased;
        -moz-osx-font-smoothing: grayscale;
      }
      .lr-app::before {
        content: "";
        position: fixed;
        inset: -20vmax;
        z-index: 0;
        pointer-events: none;
        background:
          radial-gradient(40vmax 40vmax at 12% 18%, rgba(124,58,237,.20), transparent 60%),
          radial-gradient(45vmax 35vmax at 85% 12%, rgba(37,99,235,.20), transparent 60%),
          radial-gradient(40vmax 35vmax at 20% 90%, rgba(16,185,129,.20), transparent 60%),
          linear-gradient(180deg, #f8fafc 0%, #eef2ff 100%);
        filter: saturate(1.05) blur(0.2px);
        animation: auroraShift 14s ease-in-out infinite alternate;
      }
      @keyframes auroraShift {
        0%   { transform: translate3d(0,0,0) scale(1); }
        100% { transform: translate3d(2%, -2%, 0) scale(1.03); }
      }
      .panel {
        position: relative;
        clip-path: var(--clip-chamfer);
        background: var(--panel-bg);
        border: 1px solid var(--panel-border);
        box-shadow: var(--panel-shadow);
        overflow: clip;
        backdrop-filter: blur(8px);
        -webkit-backdrop-filter: blur(8px);
        transition: box-shadow .18s ease; /* no transform transition */
      }
      /* hover lift disabled */
      .panel:hover { 
        transform: none; 
        box-shadow: var(--panel-shadow);
      }
      .panel::before {
        content: "";
        position: absolute; inset: 0;
        clip-path: var(--clip-chamfer);
        padding: 1px;
        background: linear-gradient(135deg, rgba(37,99,235,.55), rgba(124,58,237,.55), rgba(16,185,129,.55));
        -webkit-mask: linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0);
        -webkit-mask-composite: xor;
                mask-composite: exclude;
        pointer-events: none;
        opacity: .55;
      }
      .panel-body { padding: 12px; }

      .lr-app table { width: 100%; border-collapse: separate; border-spacing: 0; }
      .lr-app thead th {
        background: linear-gradient(180deg, #eff6ff, #e7f0ff);
        color: #0b1324;
        border-bottom: 1px solid rgba(203,213,225,.9);
        font-weight: 800;
        padding: 10px 12px;
        position: sticky; top: 0; z-index: 1;
      }
      .lr-app tbody td {
        background: rgba(255,255,255,0.8);
        color: #0b1324;
        border-top: 1px solid rgba(226,232,240,.7);
        padding: 9px 8px;
        text-align: center;
      }
      .lr-app tbody tr:first-child td { border-top: none; }
      .lr-app table.detail-table th, .lr-app table.detail-table td {
        border: 1px solid #e2e8f0;
        padding: 8px 10px;
        text-align: left;
      }
      .lr-app table.detail-table thead th {
        background: #f1f5f9;
        font-weight: 700;
        color: #1f2937;
        padding: 10px 12px;
      }
      .lr-app table.detail-table tbody tr:hover td {
        background: #f8fafc;
      }

      .lr-app *::-webkit-scrollbar { height: 10px; width: 10px; }
      .lr-app *::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 10px; }
      .lr-app *::-webkit-scrollbar-thumb:hover { background: #94a3b8; }
      
      .toast-wrap {
        position: fixed; right: 16px; top: 16px;
        display: grid; gap: 8px; z-index: 9999;
      }
      .toast {
        background: #0f172a; color: white; padding: 10px 12px; border-radius: 10px;
        box-shadow: 0 10px 20px rgba(2,6,23,.2);
        font-weight: 700; letter-spacing: .2px;
      }
      .toast.ok { background: #16a34a; }
      .toast.err { background: #dc2626; }
      .toast.info { background: #2563eb; }
    `}</style>
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

function StatCard({ title, value, suffix = "", hint = "" }) {
  return (
    <div className="panel" style={{ padding: 14, borderRadius: 14, minWidth: 180, background: "rgba(255,255,255,0.85)" }}>
      <div style={{ fontWeight: 800, color: "#7c3aed", marginBottom: 6 }}>{title}</div>
      <div style={{ fontSize: "1.8em", fontWeight: 900, color: "#0f172a" }}>
        {value}
        {suffix}
      </div>
      {hint && <div style={{ color: "#6b7280", fontSize: ".9em", marginTop: 4 }}>{hint}</div>}
    </div>
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

  let totalChecks = 0;
  let yesChecks = 0;
  vehicles.forEach((v) => {
    VI_PARAMS.forEach((p) => {
      const val = v[p.id];
      if (val === "yes" || val === "no") {
        totalChecks += 1;
        if (val === "yes") yesChecks += 1;
      }
    });
  });
  const yesRate = totalChecks ? (yesChecks / totalChecks) * 100 : null;

  return { count, avgTemp, avgDuration, yesRate };
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
      const rows = await listReportsByType(LOADING_TYPE);
      setDocs(Array.isArray(rows) ? rows : []);
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
      const p = row?.payload || {};
      const dateISO = p?.reportDate || p?.date || "";
      const rowsArr = Array.isArray(p?.rows) ? p.rows : [];
      return rowsArr.map((r, idx) => ({
        __docId: docId,
        __rowIndex: idx,
        date: dateISO,
        header: p.header || null,
        inspectedBy: p.inspectedBy || "",
        verifiedBy: p.verifiedBy || "",
        ...r
      }));
    });
  }, [docs]);

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

    // ✅ fixed: clean comparator (no labels)
    const flatDays = [...flat].sort((a, b) => {
      const aIso = a.startsWith("iso:") ? a.slice(4) : "";
      const bIso = b.startsWith("iso:") ? b.slice(4) : "";
      if (aIso && bIso) return bIso.localeCompare(aIso); // latest first
      if (aIso) return -1;  // ISO dates before "raw"
      if (bIso) return 1;
      return a.localeCompare(b);
    });

    return { hierarchy, dayIndex, flatDays };
  }, [records]);

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
    const first = selectedVehicles[0];
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
    if (!window.confirm(`Delete all server records for: ${label}?`)) return;

    const vehicles = dayIndex.get(key) || [];
    const toDeleteIds = [...new Set(vehicles.map(v => v.__docId).filter(Boolean))];
    if (!toDeleteIds.length) return;

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
    ev.target.value = ""; // reset
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

    const yesNo = (v) => (v === "yes" ? "YES" : v === "no" ? "NO" : "—");

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
        const dur = formatMinutes(
          (parseTimeToMinutes(v.timeEnd) ?? 0) - (parseTimeToMinutes(v.timeStart) ?? 0)
        );
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
    th, td { border: 1px solid #cbd5e1; padding: 6px 8px; text-align: center; font-size: 11px; }
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
    <div class="card"><div class="t">Yes rate (visual checks)</div><div class="v">${esc(yesRatePct)}</div></div>
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
      </tr>
    </thead>
    <tbody>
      ${rowsHtml || `<tr><td colspan="${6 + VI_PARAMS.length}">No vehicles for this day.</td></tr>`}
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

  /* ===== Styles ===== */
  const pageWrap = {
    direction: "ltr",
    fontFamily: "Inter, ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Ubuntu, Cantarell, Noto Sans, Arial",
    background: "transparent",
    minHeight: "100vh",
    padding: "1.5rem",
    color: "#0f172a",
    position: "relative",
    zIndex: 1,
  };
  const titleStyle = { textAlign: "center", color: "#0f172a", fontWeight: 800, marginBottom: "1rem", letterSpacing: ".2px" };
  const badge = {
    marginInlineStart: 12, fontSize: "0.75em", color: "#b91c1c",
    background: "#fee2e2", borderRadius: 999, padding: "4px 10px",
    fontWeight: "bold", boxShadow: "0 2px 6px #fee2e2", verticalAlign: "text-top",
    display: "inline-flex", alignItems: "center", gap: 6,
  };
  const dot = { width: 8, height: 8, borderRadius: 999, background: "#ef4444", display: "inline-block" };

  const splitWrap = { display: "flex", alignItems: "flex-start", gap: 16, minHeight: 420 };
  const sidebarBox = { minWidth: 300, maxWidth: 360, maxHeight: "70vh", overflow: "auto" };
  const section = { marginBottom: 4 };
  const headerRow = {
    display: "flex", justifyContent: "space-between", padding: "10px 14px", cursor: "pointer",
    fontWeight: 800, color: "#0f172a", borderBottom: "1px solid #e5e7eb", background: "#eff6ff",
  };
  const subHeader = {
    display: "flex", justifyContent: "space-between", padding: "8px 14px", cursor: "pointer",
    color: "#0f172a", borderBottom: "1px dashed #e5e7eb", background: "#f0f9ff",
  };
  const dayRow = (active) => ({
    display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, padding: "8px 10px",
    cursor: "pointer", borderBottom: "1px dashed #e5e7eb", fontSize: "0.98em",
    background: active ? "#e0f2fe" : "rgba(255,255,255,0.85)", borderLeft: active ? "5px solid #3b82f6" : "none",
    color: "#0f172a",
  });
  const deleteBtn = { background: "#ef4444", color: "#fff", border: "none", borderRadius: 8, fontSize: 14, padding: "2px 10px", cursor: "pointer" };

  const searchBox = {
    display: "flex", gap: 8, padding: "10px 10px 0 10px", alignItems: "center",
  };
  const inputStyle = {
    flex: 1, padding: "8px 10px", borderRadius: 10, border: "1px solid #cbd5e1", outline: "none",
    fontWeight: 600, background: "rgba(255,255,255,.9)",
  };

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
  const YearMonthTree = () => (
    <>
      {hierarchy.map(({ year, months }) => {
        const yearDayKeys = months.flatMap(({ dayKeys }) => dayKeys.filter(filterPredicate));
        const yearCount = yearDayKeys.length;
        const yOpen = !!openYears[year];
        return (
          <div key={year} style={section}>
            <div
              style={{ ...headerRow, background: yOpen ? "#e0f2fe" : "#eff6ff" }}
              onClick={() => setOpenYears((p) => ({ ...p, [year]: !p[year] }))}
            >
              <span>📅 Year: {year}</span>
              <span style={{ fontWeight: 700 }}>{yearCount} day(s) {yOpen ? "▼" : "►"}</span>
            </div>

            {yOpen && (
              <div style={{ padding: "6px 0" }}>
                {months.map(({ month, dayKeys }) => {
                  const key = `${year}-${month}`;
                  const mOpen = !!openMonths[key];
                  const filteredDays = dayKeys.filter(filterPredicate);
                  return (
                    <div key={key} style={{ margin: "4px 0 6px" }}>
                      <div
                        style={{ ...subHeader, background: mOpen ? "#f0f9ff" : "rgba(255,255,255,0.85)" }}
                        onClick={() => setOpenMonths((p) => ({ ...p, [key]: !p[key] }))}
                      >
                        <span>🗓 Month: {month}</span>
                        <span>{filteredDays.length} day(s) {mOpen ? "▾" : "▸"}</span>
                      </div>

                      {mOpen && (
                        <div>
                          {filteredDays.map((k) => {
                            const isISO = k.startsWith("iso:");
                            const iso = isISO ? k.slice(4) : null;
                            const labelTxt = isISO ? (
                              <>
                                {displayDate(iso)} <small style={{ color: "#6b7280" }}>{relativeLabel(iso)}</small>
                              </>
                            ) : (
                              k.slice(4)
                            );
                            const active = selectedDayKey === k;
                            return (
                              <div key={k} style={dayRow(active)} onClick={() => setSelectedDayKey(k)}>
                                <div>📆 {labelTxt}</div>
                                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                  <b>{(dayIndex.get(k) || []).length}</b> <small>record(s)</small>
                                  <button
                                    title="Delete day (server)"
                                    style={deleteBtn}
                                    onClick={(e) => { e.stopPropagation(); handleDeleteByDayKey(k); }}
                                  >
                                    🗑
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                          {filteredDays.length === 0 && (
                            <div style={{ textAlign: "center", color: "#6b7280", padding: 8 }}>No days in filter</div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </>
  );

  const FlatDayList = () => (
    <div>
      {filteredFlat.map((k) => {
        const isISO = k.startsWith("iso:");
        const iso = isISO ? k.slice(4) : null;
        const labelTxt = isISO ? (
          <>
            {displayDate(iso)} <small style={{ color: "#6b7280" }}>{relativeLabel(iso)}</small>
          </>
        ) : (
          k.slice(4)
        );
        const active = selectedDayKey === k;
        return (
          <div key={k} style={dayRow(active)} onClick={() => setSelectedDayKey(k)}>
            <div>📆 {labelTxt}</div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <b>{(dayIndex.get(k) || []).length}</b> <small>record(s)</small>
              <button
                title="Delete day (server)"
                style={deleteBtn}
                onClick={(e) => { e.stopPropagation(); handleDeleteByDayKey(k); }}
              >
                🗑
              </button>
            </div>
          </div>
        );
      })}
      {filteredFlat.length === 0 && (
        <div style={{ textAlign: "center", color: "#6b7280", padding: 16 }}>No days</div>
      )}
    </div>
  );

  return (
    <div className="lr-app" style={pageWrap}>
      <ThemeStyles />
      <Toasts />

      <h3 style={titleStyle}>
        📄 Loading Time Reports
        {todaysCount > 0 && (
          <span style={badge}><span style={dot} /> {todaysCount} today</span>
        )}
      </h3>

      <div style={{ display: "flex", justifyContent: "center", gap: 8, marginBottom: 10, flexWrap: "wrap" }}>
        <button
          className="panel"
          onClick={fetchAll}
          style={{ padding: "8px 14px", fontWeight: 800, borderRadius: 12, background: "#fff" }}
          disabled={loading || importing}
          title={`API: ${REPORTS_URL}?type=${LOADING_TYPE}`}
        >
          {loading ? "… Loading" : "🔄 Refresh from Server"}
        </button>

        <button
          className="panel"
          onClick={handleExportJSON}
          style={{ padding: "8px 14px", fontWeight: 800, borderRadius: 12, background: "white" }}
          disabled={loading || importing}
          title="Export current type as JSON"
        >
          ⬇︎ Export JSON
        </button>

        <button
          className="panel"
          onClick={handleExportPDF}
          style={{ padding: "8px 14px", fontWeight: 800, borderRadius: 12, background: "white" }}
          disabled={!selectedDayKey || loading || importing}
          title="Export selected day to PDF (print window)"
        >
          🖨️ PDF
        </button>

        <button
          className="panel"
          onClick={handlePickImport}
          style={{ padding: "8px 14px", fontWeight: 800, borderRadius: 12, background: "white" }}
          disabled={loading || importing}
          title="Import JSON → save to server → refresh"
        >
          ⬆︎ Import JSON
        </button>
        <input
          type="file"
          accept="application/json"
          ref={fileRef}
          onChange={handleImportFile}
          style={{ display: "none" }}
        />
      </div>

      {(loading) ? (
        <p style={{ textAlign: "center", color: "#6b7280" }}>Loading…</p>
      ) : (hierarchy.length === 0) ? (
        <p style={{ textAlign: "center", color: "#6b7280" }}>No reports on server.</p>
      ) : (
        <div style={splitWrap}>
          {/* Sidebar (left) */}
          <div className="panel" style={sidebarBox}>
            <div style={searchBox}>
              <input
                placeholder='Search day… e.g. "2025", "June", or >=2'
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                style={inputStyle}
              />
            </div>
            <div className="panel-body" style={{ padding: 0 }}>
              {groupMode === "day" ? <FlatDayList /> : <YearMonthTree />}
            </div>
          </div>

          {/* Details (right) */}
          <div className="panel" style={{ flex: 1, minHeight: 320 }}>
            <div className="panel-body" style={{ padding: "22px 24px" }}>
              {selectedDayKey ? (
                <>
                  <div style={{ fontWeight: 800, color: "#0f172a", fontSize: "1.15em", marginBottom: 8 }}>
                    Day Details:{" "}
                    {selectedIso ? (
                      <>
                        {displayDate(selectedIso)}{" "}
                        <small style={{ color: "#6b7280" }}>{relativeLabel(selectedIso)}</small>
                      </>
                    ) : (
                      selectedRaw
                    )}
                  </div>

                  {/* ===== Document Header (ONCE per day) ===== */}
                  {dayHeader.header && (
                    <div className="panel" style={{ marginBottom: 16, overflow: "hidden" }}>
                      <div className="panel-body" style={{ background: "rgba(255,255,255,0.8)" }}>
                        <div style={{ fontWeight: 800, marginBottom: 6, color: "#0f172a" }}>
                          Document Header
                        </div>
                        <table className="detail-table">
                          <tbody>
                            <tr>
                              <th>Document Title</th><td>{dayHeader.header.documentTitle || "—"}</td>
                              <th>Document No</th><td>{dayHeader.header.documentNo || "—"}</td>
                            </tr>
                            <tr>
                              <th>Issue Date</th><td>{safeDisplayDate(dayHeader.header.issueDate, { weekday: false })}</td>
                              <th>Revision No</th><td>{dayHeader.header.revisionNo || "—"}</td>
                            </tr>
                            <tr>
                              <th>Area</th><td>{dayHeader.header.area || "—"}</td>
                              <th>Issued By</th><td>{dayHeader.header.issuedBy || "—"}</td>
                            </tr>
                            <tr>
                              <th>Controlling Officer</th><td>{dayHeader.header.controllingOfficer || "—"}</td>
                              <th>Approved By</th><td>{dayHeader.header.approvedBy || "—"}</td>
                            </tr>
                            <tr>
                              <th>Inspected By</th><td>{dayHeader.inspectedBy || "—"}</td>
                              <th>Verified By</th><td>{dayHeader.verifiedBy || "—"}</td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {/* KPIs */}
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(210px,1fr))", gap: 12, margin: "10px 0 16px" }}>
                    <StatCard title="Vehicles" value={dayKPIs.count ?? 0} hint="Records for this day" />
                    <StatCard
                      title="Avg Temperature (°C)"
                      value={dayKPIs.avgTemp != null ? dayKPIs.avgTemp.toFixed(1) : "—"}
                      hint="Temp Check"
                    />
                    <StatCard
                      title="Avg Loading Duration"
                      value={formatMinutes(dayKPIs.avgDuration)}
                      suffix=" min"
                      hint="(Time End - Time Start)"
                    />
                    <div className="panel" style={{ padding: 12, display: "grid", placeItems: "center" }}>
                      <GaugeCircle
                        value={dayKPIs.yesRate != null ? dayKPIs.yesRate : 0}
                        label="Yes rate (visual checks)"
                        color="#5dade2"
                      />
                    </div>
                    <div className="panel" style={{ padding: 12 }}>
                      <div style={{ fontWeight: 800, color: "#7c3aed", marginBottom: 6 }}>Last days history</div>
                      <Sparkline points={sparkPoints} />
                      <div style={{ color: "#6b7280", fontSize: ".88em", marginTop: 6 }}>
                        Trend of records/day for the last {sparkPoints.length || 0} day(s).
                      </div>
                    </div>
                  </div>

                  {/* Vehicles table (columns trimmed) */}
                  <div className="panel" style={{ overflow: "hidden", marginBottom: 16 }}>
                    <div style={{ background: "#dbeafe", padding: "10px 12px", fontWeight: 700, color: "#0f172a", borderBottom: "1px solid #b6c8e3" }}>
                      Daily Vehicles List ({selectedVehicles.length} vehicles)
                    </div>
                    <div className="panel-body" style={{ padding: 0 }}>
                      <table style={{ width: "100%", borderCollapse: "separate", borderSpacing: 0 }}>
                        <thead>
                          <tr>
                            <th>Vehicle No</th>
                            <th>Driver</th>
                            <th>Time Start</th>
                            <th>Time End</th>
                            <th>Temp Check (°C)</th>
                            <th>Duration (min)</th>
                            {VI_PARAMS.map(p => (
                              <th key={p.id}>{p.en}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {selectedVehicles.map((v) => (
                            <tr key={`${v.__docId}-${v.__rowIndex}`}>
                              <td>{v.vehicleNo || "—"}</td>
                              <td>{v.driverName || "—"}</td>
                              <td>{v.timeStart || "—"}</td>
                              <td>{v.timeEnd || "—"}</td>
                              <td>{v.tempCheck || "—"}</td>
                              <td>{formatMinutes((parseTimeToMinutes(v.timeEnd) ?? 0) - (parseTimeToMinutes(v.timeStart) ?? 0))}</td>
                              {VI_PARAMS.map(p => (
                                <td key={p.id}>
                                  <span style={{ color: v[p.id] === "yes" ? "#16a34a" : "#dc2626", fontWeight: 700 }}>
                                    {v[p.id] === "yes" ? "✅" : "❌"}
                                  </span>
                                </td>
                              ))}
                            </tr>
                          ))}
                          {selectedVehicles.length === 0 && (
                            <tr>
                              <td colSpan={6 + VI_PARAMS.length} style={{ textAlign: "center", color: "#6b7280", padding: 16 }}>No vehicles for this day.</td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </>
              ) : (
                <div style={{ textAlign: "center", color: "#6b7280", padding: "4rem 0" }}>
                  <p>Please select a day from the list on the left.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
