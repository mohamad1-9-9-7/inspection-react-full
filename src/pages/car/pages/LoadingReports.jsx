// src/pages/LoadingReports.js
import React, { useEffect, useMemo, useState } from "react";

const STORAGE_KEY = "cars_loading_inspection_v1";

const VI_PARAMS = [
  { id: "sealIntact", ar: "ختم الباب سليم / الباب مقفول", en: "Is Seal Intact/Door Locked" },
  { id: "containerClean", ar: "نظافة الحاوية", en: "Container Clean" },
  { id: "pestDetection", ar: "وجود آفات", en: "Pest Detection" },
  { id: "tempReader", ar: "قارئ الحرارة متاح", en: "Temperature Reader Available" },
  { id: "plasticCurtain", ar: "ستارة بلاستيكية", en: "Plastic Curtain" },
  { id: "badSmell", ar: "رائحة كريهة", en: "Bad Smell" },
  { id: "ppeA", ar: "معدات وقاية: قناع وجه وواقي أذرع", en: "PPE: A) Face Mask & Hand sleeve" },
  { id: "ppeB", ar: "معدات وقاية: قفازات وغطاء حذاء", en: "PPE: B) Gloves – Shoe cover" },
  { id: "ppeC", ar: "معدات وقاية: معقّم ومريول", en: "PPE: C) Sanitizer - Apron" },
];

/* ===== أدوات تاريخ (محلي) ===== */
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

const displayDate = (iso, { weekday = true, numerals = "latn" } = {}) => {
  if (!iso) return "";
  const [y, m, d] = iso.split("-").map(Number);
  const dt = new Date(y, m - 1, d);
  const opts = { year: "numeric", month: "long", day: "2-digit", ...(weekday && { weekday: "short" }) };
  const locale = numerals === "arab" ? "ar-AE-u-nu-arab" : "ar-AE-u-nu-latn";
  return new Intl.DateTimeFormat(locale, opts).format(dt);
};
const relativeLabel = (iso) => {
  if (!iso) return "";
  if (iso === todayISO) return " (اليوم / Today)";
  const t = new Date(todayISO);
  const y = new Date(t.getFullYear(), t.getMonth(), t.getDate() - 1);
  const yISO = `${y.getFullYear()}-${pad(y.getMonth() + 1)}-${pad(y.getDate())}`;
  return iso === yISO ? " (أمس / Yesterday)" : "";
};

/* ============= Theme Styles (Aurora + Glass + Chamfer) ============= */
function ThemeStyles() {
  return (
    <style>{`
      .lr-app {
        /* ألوان ومتغيرات */
        --primary: #2563eb;
        --primary-600: #1d4ed8;
        --accent: #7c3aed;
        --accent-600: #6d28d9;
        --text: #0f172a;
        --muted: #64748b;

        --panel-bg: rgba(255,255,255,0.72);
        --panel-border: rgba(255,255,255,0.55);
        --panel-shadow: 0 10px 30px rgba(2,6,23,0.08), 0 2px 10px rgba(2,6,23,0.06);
        --ring: rgba(37,99,235,0.28);

        /* chamfer */
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

      /* خلفية Aurora */
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
      @media (prefers-reduced-motion: reduce) {
        .lr-app::before { animation: none; }
      }

      /* Panel زجاجي بحواف مشطوفة وحد متدرج */
      .panel {
        position: relative;
        clip-path: var(--clip-chamfer);
        background: var(--panel-bg);
        border: 1px solid var(--panel-border);
        box-shadow: var(--panel-shadow);
        overflow: clip;
        backdrop-filter: blur(8px);
        -webkit-backdrop-filter: blur(8px);
        transition: transform .22s ease, box-shadow .22s ease;
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
      .panel:hover { transform: translateY(-2px); box-shadow: 0 14px 36px rgba(2,6,23,0.12); }
      .panel-body { padding: 12px; }

      /* Tabs (محفوظه في الستايل لكن لن تُعرض) */
      .tablike {
        appearance: none;
        border: 1px solid rgba(148,163,184,.35);
        background: linear-gradient(180deg, #ffffff, #f7f9ff);
        color: var(--text);
        font-weight: 800;
        letter-spacing: .2px;
        padding: 10px 18px;
        border-radius: 999px;
        transition: transform .18s ease, box-shadow .18s ease, border-color .18s ease, background .18s ease;
        box-shadow: 0 1px 2px rgba(2,6,23,0.06);
        cursor: pointer;
        min-width: 140px;
      }
      .tablike.active {
        border-color: transparent;
        color: #fff;
        background: linear-gradient(135deg, var(--primary), var(--accent));
        box-shadow: 0 10px 28px rgba(37,99,235,.35), 0 2px 10px rgba(124,58,237,.25);
      }

      /* جدول أنيق */
      .lr-app table { width: 100%; border-collapse: separate; border-spacing: 0; }
      .lr-app thead th {
        background: linear-gradient(180deg, #eff6ff, #e7f0ff);
        color: #0b1324;
        border-bottom: 1px solid rgba(203,213,225,.9);
        font-weight: 800;
        padding: 10px 12px;
        position: sticky; top: 0; z-index: 1;
        clip-path: var(--clip-chamfer);
      }
      .lr-app tbody td {
        background: rgba(255,255,255,0.8);
        color: #0b1324;
        border-top: 1px solid rgba(226,232,240,.7);
        padding: 9px 8px;
        text-align: center;
      }

      /* Scrollbar لطيف */
      .lr-app *::-webkit-scrollbar { height: 10px; width: 10px; }
      .lr-app *::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 10px; }
      .lr-app *::-webkit-scrollbar-thumb:hover { background: #94a3b8; }
    `}</style>
  );
}

/* ====================== عناصر المؤشرات (بدون مكتبات) ====================== */
function GaugeCircle({ value = 72, size = 120, stroke = 12, color = "#884ea0", label = "" }) {
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
        <text x="50%" y="50%" dominantBaseline="middle" textAnchor="middle" style={{ fontWeight: 800, fill: "#512e5f" }}>
          {Math.round(clamped)}%
        </text>
      </svg>
      {label && <div style={{ marginTop: 6, fontWeight: 700, color: "#512e5f" }}>{label}</div>}
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
    <div
      className="panel"
      style={{
        padding: 14,
        borderRadius: 14,
        minWidth: 180,
        background: "rgba(255,255,255,0.85)",
      }}
    >
      <div style={{ fontWeight: 800, color: "#884ea0", marginBottom: 6 }}>{title}</div>
      <div style={{ fontSize: "1.8em", fontWeight: 900, color: "#0f172a" }}>
        {value}
        {suffix}
      </div>
      {hint && <div style={{ color: "#6b7280", fontSize: ".9em", marginTop: 4 }}>{hint}</div>}
    </div>
  );
}

/* ====================== أدوات حساب للـ KPIs السريعة ====================== */
const toNum = (x) => {
  const n = Number(String(x).replace(/[^\d.\-]/g, ""));
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
  // count
  const count = vehicles.length;

  // avg temp
  const temps = vehicles.map((v) => toNum(v.tempCheck)).filter((n) => n != null);
  const avgTemp = temps.length ? (temps.reduce((a, b) => a + b, 0) / temps.length) : null;

  // avg duration (timeEnd - timeStart) in minutes
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

  // visual yes-rate across all vehicles & all defined VI_PARAMS
  let totalChecks = 0;
  let yesChecks = 0;
  vehicles.forEach((v) => {
    VI_PARAMS.forEach((p) => {
      const val = v.visual?.[p.id]?.value;
      if (val === "yes" || val === "no") {
        totalChecks += 1;
        if (val === "yes") yesChecks += 1;
      }
    });
  });
  const yesRate = totalChecks ? (yesChecks / totalChecks) * 100 : null;

  return { count, avgTemp, avgDuration, yesRate };
}

/* ====================== المكوّن الرئيسي ====================== */
export default function LoadingReports() {
  const [records, setRecords] = useState([]);

  // فتح/طي للأقسام
  const [openYears, setOpenYears] = useState({});
  const [openMonths, setOpenMonths] = useState({}); // `${year}-${month}`

  // تبويب التجميع (سيبقى "month" افتراضيًا)
  const [groupMode, setGroupMode] = useState("month"); // 'year' | 'month' | 'day'

  // اليوم المحدد
  const [selectedDayKey, setSelectedDayKey] = useState("");

  useEffect(() => {
    try {
      const data = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
      setRecords(Array.isArray(data) ? data : []);
    } catch {
      setRecords([]);
    }
  }, []);

  // عدّاد سجلات اليوم
  const todaysCount = useMemo(
    () => records.filter((r) => parseToISO(r.date)?.iso === todayISO).length,
    [records]
  );

  /* ===== تجميع هرمي + فهرس سريع للأيام + قائمة يومية مسطّحة ===== */
  const { hierarchy, dayIndex, flatDays } = useMemo(() => {
    const years = new Map(); // y -> m -> Set(dayKey)
    const dayIndex = new Map(); // dayKey -> array of records
    const flat = new Set(); // all dayKeys

    records.forEach((v) => {
      const p = parseToISO(v.date);
      if (!p) {
        const key = `raw:${v.date || "—"}`;
        if (!dayIndex.has(key)) dayIndex.set(key, []);
        dayIndex.get(key).push(v);
        flat.add(key);

        const y = "غير معروف / Unknown", m = "—";
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

    const flatDays = [...flat]
      .sort((a, b) => {
        const aIso = a.startsWith("iso:") ? a.slice(4) : "";
        const bIso = b.startsWith("iso:") ? b.slice(4) : "";
        if (aIso && bIso) return bIso.localeCompare(aIso);
        if (aIso) return -1;
        if (bIso) return 1;
        return a.localeCompare(b);
      });

    return { hierarchy, dayIndex, flatDays };
  }, [records]);

  // fallback لاختيار يوم
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

  /* ===== KPIs المحسوبة لليوم المحدد + بيانات السباركلайн للأيام الأخيرة ===== */
  const dayKPIs = useMemo(() => computeDayKPIs(selectedVehicles), [selectedVehicles]);

  const sparkPoints = useMemo(() => {
    // آخر 12 يومًا (حسب الترتيب الحالي للـ flatDays - الأحدث أولًا)
    const lastKeys = flatDays.slice(0, 12).reverse(); // نعرض من الأقدم للأحدث
    return lastKeys.map((k) => (dayIndex.get(k) || []).length);
  }, [flatDays, dayIndex]);

  /* ===== حذف حسب اليوم ===== */
  const handleDeleteByDayKey = (key) => {
    const isISO = key.startsWith("iso:");
    const label = isISO ? displayDate(key.slice(4)) : key.slice(4);
    if (!window.confirm(`حذف جميع السجلات لهذا التاريخ؟\nDelete all records for: ${label}`)) return;

    const updated = records.filter((r) => {
      const p = parseToISO(r.date);
      if (isISO) return p?.iso !== key.slice(4);
      return !(p === null && (r.date || "—") === key.slice(4));
    });

    setRecords(updated);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));

    if (selectedDayKey === key) setSelectedDayKey("");
  };

  /* ===== أنماط عامة (تخطيط فقط) ===== */
  const pageWrap = {
    direction: "rtl",
    fontFamily: "Cairo, ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Ubuntu, Cantarell, Noto Sans, Arial, 'Apple Color Emoji','Segoe UI Emoji'",
    background: "transparent",
    minHeight: "100vh",
    padding: "1.5rem",
    color: "#0f172a",
    position: "relative",
    zIndex: 1,
  };
  const titleStyle = {
    textAlign: "center",
    color: "#0f172a",
    fontWeight: 800,
    marginBottom: "1rem",
    letterSpacing: ".2px",
  };
  const badge = {
    marginInlineStart: 12,
    fontSize: "0.75em",
    color: "#b91c1c",
    background: "#fee2e2",
    borderRadius: 999,
    padding: "4px 10px",
    fontWeight: "bold",
    boxShadow: "0 2px 6px #fee2e2",
    verticalAlign: "text-top",
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
  };
  const dot = { width: 8, height: 8, borderRadius: 999, background: "#ef4444", display: "inline-block" };

  // تخطيط عمودين
  const splitWrap = {
    display: "flex",
    alignItems: "flex-start",
    gap: 16,
    minHeight: 420,
  };
  const sidebarBox = {
    minWidth: 300,
    maxWidth: 360,
    maxHeight: "70vh",
    overflow: "auto",
  };
  const section = { marginBottom: 4 };
  const header = {
    display: "flex",
    justifyContent: "space-between",
    padding: "10px 14px",
    cursor: "pointer",
    fontWeight: 800,
    color: "#0f172a",
    borderBottom: "1px solid #e5e7eb",
    background: "#eff6ff",
  };
  const subHeader = {
    display: "flex",
    justifyContent: "space-between",
    padding: "8px 14px",
    cursor: "pointer",
    color: "#0f172a",
    borderBottom: "1px dashed #e5e7eb",
    background: "#f0f9ff",
  };
  const dayRow = (active) => ({
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 8,
    padding: "8px 10px",
    cursor: "pointer",
    borderBottom: "1px dashed #e5e7eb",
    fontSize: "0.98em",
    background: active ? "#e0f2fe" : "rgba(255,255,255,0.85)",
    borderRight: active ? "5px solid #3b82f6" : "none",
    color: "#0f172a",
  });
  const deleteBtn = {
    background: "#ef4444",
    color: "#fff",
    border: "none",
    borderRadius: 8,
    fontSize: 14,
    padding: "2px 10px",
    cursor: "pointer",
  };

  const infoGridBox = { marginBottom: "12px" };
  const infoInnerPanel = { padding: 12, background: "rgba(255,255,255,0.8)", borderRadius: 12, border: "1px solid #e5e7eb" };
  const infoGridTitle = { fontWeight: 800, marginBottom: 6, color: "#0f172a" };
  const infoGrid = { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 10, marginTop: 6 };
  const labelStyle = { fontWeight: "bold", display: "inline-block", minWidth: 160, color: "#0f172a" };
  const BidiLabel = ({ ar, en }) => (
    <span style={labelStyle}>
      <bdi>{ar}</bdi> / <bdi>{en}</bdi>:
    </span>
  );

  // جدول
  const excelTable = { width: "100%", borderCollapse: "separate", borderSpacing: 0, background: "transparent", marginTop: 12, borderRadius: 8, overflow: "hidden" };
  const thCell = { border: "1px solid #b6c8e3", padding: "10px 8px", textAlign: "center", fontWeight: "bold", fontSize: ".98em" };
  const tdCell = { border: "1px solid #b6c8e3", padding: "9px 8px", textAlign: "center", fontSize: ".98em", background: "rgba(255,255,255,0.8)", color: "#0f172a" };

  // (تعريفات التبويبات باقية لكن لن يتم عرض الأزرار)
  const tabsRow = { display: "flex", gap: 8, justifyContent: "center", flexWrap: "wrap" };
  const tabBtnClass = (on) => `tablike ${on ? "active" : ""}`;

  const safeDisplayDate = (maybeDate, opts) => {
    const p = parseToISO(maybeDate);
    return p ? displayDate(p.iso, opts) : (maybeDate || "—");
  };

  /* ===== مكونات فرعية ===== */
  const YearMonthTree = () => (
    <>
      {hierarchy.map(({ year, months }) => {
        const yearCount = months.reduce((s, mo) => s + mo.dayKeys.length, 0);
        const yOpen = !!openYears[year];
        return (
          <div key={year} style={section}>
            <div
              style={{ ...header, background: yOpen ? "#e0f2fe" : "#eff6ff" }}
              onClick={() => setOpenYears((p) => ({ ...p, [year]: !p[year] }))}
            >
              <span>📅 <bdi>سنة</bdi> / <bdi>Year</bdi>: {year}</span>
              <span style={{ fontWeight: 700 }}>{yearCount} <bdi>يوم</bdi> / <bdi>day(s)</bdi> {yOpen ? "▼" : "►"}</span>
            </div>

            {yOpen && (
              <div style={{ padding: "6px 0" }}>
                {months.map(({ month, dayKeys }) => {
                  const key = `${year}-${month}`;
                  const mOpen = !!openMonths[key];
                  return (
                    <div key={key} style={{ margin: "4px 0 6px" }}>
                      <div
                        style={{ ...subHeader, background: mOpen ? "#f0f9ff" : "rgba(255,255,255,0.85)" }}
                        onClick={() => setOpenMonths((p) => ({ ...p, [key]: !p[key] }))}
                      >
                        <span>🗓 <bdi>الشهر</bdi> / <bdi>Month</bdi>: {month}</span>
                        <span>{dayKeys.length} <bdi>يوم</bdi> / <bdi>day(s)</bdi> {mOpen ? "▾" : "▸"}</span>
                      </div>

                      {mOpen && (
                        <div>
                          {dayKeys.map((k) => {
                            const isISO = k.startsWith("iso:");
                            const iso = isISO ? k.slice(4) : null;
                            const label = isISO ? (
                              <>
                                {displayDate(iso)} <small style={{ color: "#6b7280" }}>{relativeLabel(iso)}</small>
                              </>
                            ) : (
                              k.slice(4)
                            );
                            const active = selectedDayKey === k;
                            return (
                              <div key={k} style={dayRow(active)} onClick={() => setSelectedDayKey(k)}>
                                <div>📆 {label}</div>
                                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                  <b>{(dayIndex.get(k) || []).length}</b> <small>سجل / record(s)</small>
                                  <button
                                    title="حذف يوم / Delete day"
                                    style={deleteBtn}
                                    onClick={(e) => { e.stopPropagation(); handleDeleteByDayKey(k); }}
                                  >
                                    🗑
                                  </button>
                                </div>
                              </div>
                            );
                          })}
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
      {flatDays.map((k) => {
        const isISO = k.startsWith("iso:");
        const iso = isISO ? k.slice(4) : null;
        const label = isISO ? (
          <>
            {displayDate(iso)} <small style={{ color: "#6b7280" }}>{relativeLabel(iso)}</small>
          </>
        ) : (
          k.slice(4)
        );
        const active = selectedDayKey === k;
        return (
          <div key={k} style={dayRow(active)} onClick={() => setSelectedDayKey(k)}>
            <div>📆 {label}</div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <b>{(dayIndex.get(k) || []).length}</b> <small>سجل / record(s)</small>
              <button
                title="حذف يوم / Delete day"
                style={deleteBtn}
                onClick={(e) => { e.stopPropagation(); handleDeleteByDayKey(k); }}
              >
                🗑
              </button>
            </div>
          </div>
        );
      })}
      {flatDays.length === 0 && (
        <div style={{ textAlign: "center", color: "#6b7280", padding: 16 }}>لا أيام / No days</div>
      )}
    </div>
  );

  return (
    <div className="lr-app" style={pageWrap}>
      <ThemeStyles />

      <h3 style={titleStyle}>
        📄 <bdi>تقارير أوقات التحميل</bdi> / <bdi>Loading Time Reports</bdi>
        {todaysCount > 0 && (
          <span style={badge}><span style={dot} /> {todaysCount} <bdi>اليوم</bdi> / <bdi>today</bdi></span>
        )}
      </h3>

      {/* ✅ تمت إزالة أزرار التبويب هنا فقط */}

      {hierarchy.length === 0 ? (
        <p style={{ textAlign: "center", color: "#6b7280" }}>لا توجد سجلات محفوظة حالياً.</p>
      ) : (
        <div style={splitWrap}>
          {/* الشريط الجانبي (يمين) */}
          <div className="panel" style={sidebarBox}>
            <div className="panel-body" style={{ padding: 0 }}>
              {groupMode === "day" ? <FlatDayList /> : <YearMonthTree />}
            </div>
          </div>

          {/* لوحة التفاصيل (يسار) */}
          <div className="panel" style={{ flex: 1, minHeight: 320 }}>
            <div className="panel-body" style={{ padding: "22px 24px" }}>
              {selectedDayKey ? (
                <>
                  <div style={{ fontWeight: 800, color: "#0f172a", fontSize: "1.15em", marginBottom: 8 }}>
                    <bdi>تفاصيل اليوم</bdi> / <bdi>Day Details</bdi>:{" "}
                    {selectedIso ? (
                      <>
                        {displayDate(selectedIso)}{" "}
                        <small style={{ color: "#6b7280" }}>{relativeLabel(selectedIso)}</small>
                      </>
                    ) : (
                      selectedRaw
                    )}
                  </div>

                  {/* ====== المؤشرات الجديدة (لا تغيّر أي ميزة قديمة) ====== */}
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(210px,1fr))", gap: 12, margin: "10px 0 16px" }}>
                    <StatCard
                      title="عدد المركبات / Vehicles"
                      value={dayKPIs.count ?? 0}
                      hint="سجلات هذا اليوم"
                    />
                    <StatCard
                      title="متوسط الحرارة (°C)"
                      value={dayKPIs.avgTemp != null ? dayKPIs.avgTemp.toFixed(1) : "—"}
                      hint="Temp Check"
                    />
                    <StatCard
                      title="متوسط مدة التحميل"
                      value={formatMinutes(dayKPIs.avgDuration)}
                      suffix=" دقيقة"
                      hint="(Time End - Time Start)"
                    />
                    <div className="panel" style={{ padding: 12, display: "grid", placeItems: "center" }}>
                      <GaugeCircle
                        value={dayKPIs.yesRate != null ? dayKPIs.yesRate : 0}
                        label="نسبة فحص بصري (Yes)"
                        color="#5dade2"
                      />
                    </div>
                    <div className="panel" style={{ padding: 12 }}>
                      <div style={{ fontWeight: 800, color: "#884ea0", marginBottom: 6 }}>سجلات آخر الأيام</div>
                      <Sparkline points={sparkPoints} />
                      <div style={{ color: "#6b7280", fontSize: ".88em", marginTop: 6 }}>
                        يوضح الاتجاه (عدد السجلات/اليوم) لآخر {sparkPoints.length || 0} يوم.
                      </div>
                    </div>
                  </div>
                  {/* ====== نهاية المؤشرات الجديدة ====== */}

                  {selectedVehicles.map((v) => (
                    <div key={v.id} style={{ borderTop: "1px solid #e5e7eb", paddingTop: 10, marginTop: 6 }}>
                      {/* رأس مركبة */}
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          background: "#dbeafe",
                          border: "1px solid #b6c8e3",
                          borderRadius: 10,
                          padding: "10px 12px",
                          fontWeight: 700,
                          color: "#0f172a",
                        }}
                      >
                        <span>🚗 <bdi>السيارة</bdi> / <bdi>Vehicle</bdi>: {v.vehicleNo || "بدون رقم / N/A"}</span>
                        <span><bdi>السائق</bdi> / <bdi>Driver</bdi>: {v.driverName || "—"}</span>
                      </div>

                      {/* ترويسة المستند */}
                      <div style={infoGridBox}>
                        <div className="panel" style={{ overflow: "hidden" }}>
                          <div className="panel-body" style={infoInnerPanel}>
                            <div style={infoGridTitle}><bdi>ترويسة المستند</bdi> / <bdi>Document Header</bdi></div>
                            <div style={infoGrid}>
                              <div><BidiLabel ar="عنوان المستند" en="Document Title" /> {v.header?.documentTitle || "—"}</div>
                              <div><BidiLabel ar="رقم المستند" en="Document No" /> {v.header?.documentNo || "—"}</div>
                              <div><BidiLabel ar="تاريخ الإصدار" en="Issue Date" /> {safeDisplayDate(v.header?.issueDate, { weekday: false })}</div>
                              <div><BidiLabel ar="رقم المراجعة" en="Revision No" /> {v.header?.revisionNo || "—"}</div>
                              <div><BidiLabel ar="المنطقة" en="Area" /> {v.header?.area || "—"}</div>
                              <div><BidiLabel ar="صُدر بواسطة" en="Issued By" /> {v.header?.issuedBy || "—"}</div>
                              <div><BidiLabel ar="الضابط المسؤول" en="Controlling Officer" /> {v.header?.controllingOfficer || "—"}</div>
                              <div><BidiLabel ar="تمّت الموافقة من قبل" en="Approved By" /> {v.header?.approvedBy || "—"}</div>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* بيانات عامة */}
                      <div style={infoGridBox}>
                        <div className="panel" style={{ overflow: "hidden" }}>
                          <div className="panel-body" style={infoInnerPanel}>
                            <div style={infoGrid}>
                              <div><BidiLabel ar="التاريخ" en="Date" /> {safeDisplayDate(v.date, { weekday: true })}</div>
                              <div><BidiLabel ar="الموقع" en="Location" /> {v.location || "—"}</div>
                              <div><BidiLabel ar="وقت البدء" en="Time Start" /> {v.timeStart || "—"}</div>
                              <div><BidiLabel ar="وقت الانتهاء" en="Time End" /> {v.timeEnd || "—"}</div>
                              <div><BidiLabel ar="فحص الحرارة (°C)" en="Temp Check (°C)" /> {v.tempCheck || "—"}</div>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* جدول الفحص البصري */}
                      <h4 style={{ marginTop: 12, color: "#0f172a" }}>
                        <bdi>الفحص البصري</bdi> / <bdi>Visual Inspection</bdi>
                      </h4>
                      <div className="panel" style={{ overflow: "hidden" }}>
                        <div className="panel-body" style={{ padding: 0 }}>
                          <table style={excelTable}>
                            <thead>
                              <tr>
                                <th style={thCell}><bdi>المعيار</bdi> / <bdi>Parameters</bdi></th>
                                <th style={thCell}><bdi>نعم</bdi> / <bdi>Yes</bdi></th>
                                <th style={thCell}><bdi>لا</bdi> / <bdi>No</bdi></th>
                                <th style={thCell}><bdi>ملاحظات</bdi> / <bdi>Remarks</bdi></th>
                              </tr>
                            </thead>
                            <tbody>
                              {VI_PARAMS.map((p) => {
                                const val = v.visual?.[p.id] || {};
                                return (
                                  <tr key={p.id}>
                                    <td style={{ ...tdCell }}>
                                      <div>{p.en}</div>
                                      <div style={{ fontSize: ".85em", color: "#374151" }}>{p.ar}</div>
                                    </td>
                                    <td style={tdCell}>{val.value === "yes" ? "✅" : ""}</td>
                                    <td style={tdCell}>{val.value === "no" ? "❌" : ""}</td>
                                    <td style={tdCell}>{val.remarks || ""}</td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      </div>

                      {/* ملاحظات وتواقيع */}
                      <div style={{ marginTop: 12 }}>
                        <BidiLabel ar="ملاحظات" en="Remarks" /> {v.remarks || "—"}
                      </div>
                      <div style={{ marginTop: 8 }}>
                        <BidiLabel ar="المفتش (1)" en="Inspected By (1)" /> {v.inspectedBy1 || "—"}
                        &nbsp; | &nbsp;
                        <BidiLabel ar="المصادِق (1)" en="Verified By (1)" /> {v.verifiedBy1 || "—"}
                      </div>
                      <div>
                        <BidiLabel ar="المفتش (2)" en="Inspected By (2)" /> {v.inspectedBy2 || "—"}
                        &nbsp; | &nbsp;
                        <BidiLabel ar="المصادِق (2)" en="Verified By (2)" /> {v.verifiedBy2 || "—"}
                      </div>
                    </div>
                  ))}
                </>
              ) : (
                <div style={{ textAlign: "center", color: "#6b7280", padding: 80, fontSize: "1.05em" }}>
                  اختر تاريخًا من القائمة اليمنى لعرض التفاصيل. <br /> Select a date from the right list to view details.
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
