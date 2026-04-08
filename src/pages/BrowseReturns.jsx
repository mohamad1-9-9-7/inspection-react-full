// src/pages/BrowseReturns.jsx
import React, { useEffect, useMemo, useState, useRef, useCallback } from "react";

/* ========== API ========== */
const API_BASE =
  process.env.REACT_APP_API_URL || "https://inspection-server-4nvj.onrender.com";

async function fetchByType(type) {
  const res = await fetch(`${API_BASE}/api/reports?type=${encodeURIComponent(type)}`, {
    cache: "no-store",
  });
  if (!res.ok) throw new Error("Failed to fetch " + type);
  const json = await res.json();
  return Array.isArray(json) ? json : json?.data ?? [];
}

/* ========== Normalization ========== */
function toTs(x) {
  if (!x) return null;
  if (typeof x === "number") return x;
  if (typeof x === "string" && /^[a-f0-9]{24}$/i.test(x))
    return parseInt(x.slice(0, 8), 16) * 1000;
  const n = Date.parse(x);
  return Number.isFinite(n) ? n : null;
}
function bestTs(rec) {
  return (
    toTs(rec?.createdAt) || toTs(rec?.updatedAt) || toTs(rec?.timestamp) ||
    toTs(rec?._id) || toTs(rec?.payload?._clientSavedAt) || 0
  );
}
function normalizeReturns(raw) {
  if (!Array.isArray(raw)) return [];
  const entries = raw
    .map((rec) => {
      const payload = rec?.payload || {};
      return {
        ts: bestTs(rec),
        reportDate: payload.reportDate || rec?.reportDate || "",
        items: Array.isArray(payload.items) ? payload.items : [],
      };
    })
    .filter((e) => e.reportDate);
  const byDate = new Map();
  for (const e of entries) {
    const prev = byDate.get(e.reportDate);
    if (!prev || e.ts > prev.ts) byDate.set(e.reportDate, e);
  }
  return Array.from(byDate.values());
}

/* ========== Branch / action helpers ========== */
function isOtherBranch(val) {
  const s = String(val || "").toLowerCase();
  return s.includes("other branch") || s.includes("فرع آخر");
}
function safeButchery(row) {
  return isOtherBranch(row?.butchery) ? row?.customButchery || "" : row?.butchery || "";
}
function actionText(row) {
  return row?.action === "إجراء آخر..." || row?.action === "Other..."
    ? row?.customAction || ""
    : row?.action || "";
}
function itemKey(row) {
  return [
    (row?.itemCode || "").trim().toLowerCase(),
    (row?.productName || "").trim().toLowerCase(),
    (row?.origin || "").trim().toLowerCase(),
    (safeButchery(row) || "").trim().toLowerCase(),
    (row?.expiry || "").trim().toLowerCase(),
  ].join("|");
}

function formatChangeDate(ch) {
  const t = ch?.ts || toTs(ch?.at);
  if (!t) return "";
  try {
    return new Intl.DateTimeFormat("en-GB", {
      timeZone: "Asia/Dubai", year: "numeric", month: "2-digit", day: "2-digit",
    }).format(new Date(t));
  } catch {
    const d = new Date(t);
    return `${String(d.getDate()).padStart(2,"0")}/${String(d.getMonth()+1).padStart(2,"0")}/${d.getFullYear()}`;
  }
}
function formatChangeDatePDF(ch) {
  const t = ch?.ts || toTs(ch?.at);
  if (!t) return "";
  const d = new Date(t);
  return `${String(d.getDate()).padStart(2,"0")}/${String(d.getMonth()+1).padStart(2,"0")}/${d.getFullYear()}`;
}

function isCondemnation(s) { return (s ?? "").toString().trim().toLowerCase() === "condemnation"; }
function isSendToMarket(s) { return (s ?? "").toString().trim().toLowerCase() === "send to market"; }
function isDisposed(s) {
  const v = (s ?? "").toString().trim().toLowerCase();
  return v === "disposed" || v === "desposed";
}
function isKgType(t) {
  const s = (t || "").toString().toLowerCase();
  return s.includes("kg") || s.includes("كيلو") || s.includes("كجم");
}
function isPcsType(t) {
  const s = (t || "").toString().toLowerCase();
  return s.includes("pcs") || s.includes("قطعة") || s.includes("حبة") || s.includes("pc");
}
function qtyKind(row) {
  if (isKgType(row?.qtyType)) return "kg";
  if (isPcsType(row?.qtyType)) return "pcs";
  return "other";
}

/* ========================================
   ✅ FIX: DonutCard with UNIQUE gradient ID
   ======================================== */
let _donutCounter = 0;

function DonutCard({
  percent = 0, label = "", subLabel = "", count = null,
  color = "#166534", centerText = null, extra = null, size = 140, stroke = 14,
}) {
  // unique ID per instance, stable across re-renders
  const uid = useRef(`dg_${++_donutCounter}`).current;

  const r = (size - stroke) / 2;
  const C = 2 * Math.PI * r;
  const dash = Math.max(0, Math.min(100, percent));
  const offset = C * (1 - dash / 100);

  return (
    <div style={{
      background: "rgba(255,255,255,0.85)",
      border: "1px solid rgba(255,255,255,0.6)",
      borderRadius: 16,
      boxShadow: "0 10px 26px rgba(13, 10, 44, 0.12)",
      padding: "16px 18px",
      display: "grid",
      placeItems: "center",
      gap: 8,
      minWidth: 230,
      backdropFilter: "blur(6px)",
    }}>
      <svg width={size} height={size} style={{ display: "block" }}>
        <defs>
          <linearGradient id={uid} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor={color} />
            <stop offset="100%" stopColor="#60a5fa" />
          </linearGradient>
        </defs>
        <circle cx={size/2} cy={size/2} r={r} stroke="#e5e7eb" strokeWidth={stroke} fill="none"/>
        <circle
          cx={size/2} cy={size/2} r={r}
          stroke={`url(#${uid})`} strokeWidth={stroke} fill="none"
          strokeDasharray={`${C} ${C}`} strokeDashoffset={offset}
          strokeLinecap="round"
          transform={`rotate(-90 ${size/2} ${size/2})`}
        />
        <text x="50%" y="50%" dominantBaseline="middle" textAnchor="middle"
          style={{ fontWeight: 900, fontSize: 24, fill: "#0f172a" }}>
          {centerText != null ? centerText : `${dash}%`}
        </text>
      </svg>
      <div style={{ fontWeight: 900, color: "#0f172a", textAlign: "center", maxWidth: 200,
        overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontSize: 16 }}
        title={label}>
        {label}
      </div>
      {subLabel ? (
        <div style={{ fontSize: 12, opacity: 0.8, textAlign: "center", maxWidth: 220, lineHeight: 1.25 }}
          title={subLabel}>{subLabel}</div>
      ) : null}
      {count != null && <div style={{ opacity: .85, fontWeight: 800, marginTop: 2 }}>{count}</div>}
      {extra}
    </div>
  );
}

/* ========== ✅ Password Modal (replaces window.prompt) ========== */
function PasswordModal({ show, onSubmit, onCancel, title = "Enter Password" }) {
  const [val, setVal] = useState("");
  const [err, setErr] = useState("");
  useEffect(() => { if (show) { setVal(""); setErr(""); } }, [show]);
  if (!show) return null;
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,.45)", display: "flex",
      alignItems: "center", justifyContent: "center", zIndex: 5000 }}>
      <div style={{ background: "#fff", borderRadius: 18, padding: "2rem 2.5rem", minWidth: 320, maxWidth: 400,
        textAlign: "center", boxShadow: "0 8px 32px rgba(0,0,0,.22)", fontFamily: "Cairo, sans-serif" }}>
        <div style={{ fontSize: 36, marginBottom: 8 }}>🔒</div>
        <div style={{ fontWeight: 900, fontSize: "1.1em", color: "#0f172a", marginBottom: 16 }}>{title}</div>
        <input
          type="password"
          autoFocus
          value={val}
          onChange={(e) => setVal(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") onSubmit(val, setErr); }}
          placeholder="Enter password…"
          style={{ width: "90%", padding: "10px 14px", borderRadius: 10, border: "1.5px solid #c7a8dc",
            background: "#f4f6f7", fontSize: "1.05em", marginBottom: 12 }}
        />
        {err && <div style={{ color: "#dc2626", fontWeight: 800, marginBottom: 8 }}>{err}</div>}
        <div style={{ display: "flex", gap: 12, justifyContent: "center" }}>
          <button onClick={onCancel} style={{ background: "#fff", color: "#374151", border: "1px solid #d1d5db",
            borderRadius: 12, fontWeight: 900, cursor: "pointer", padding: "10px 24px" }}>Cancel</button>
          <button onClick={() => onSubmit(val, setErr)} style={{ background: "#2563eb", color: "#fff",
            border: "none", borderRadius: 12, fontWeight: 900, cursor: "pointer", padding: "10px 24px" }}>Confirm</button>
        </div>
      </div>
    </div>
  );
}

/* ========== Image Viewer ========== */
const viewImgBtn = { marginLeft: 8, background: "#2563eb", color: "#fff", border: "none", borderRadius: 999,
  padding: "2px 8px", fontSize: 11, fontWeight: 800, cursor: "pointer", boxShadow: "0 1px 6px rgba(37,99,235,.35)" };
const viewerBack = { position: "fixed", inset: 0, background: "rgba(15,23,42,.35)", display: "flex",
  alignItems: "center", justifyContent: "center", zIndex: 9999 };
const viewerCard = { width: "min(1200px, 96vw)", maxHeight: "90vh", overflow: "auto", background: "#fff",
  color: "#111", borderRadius: 14, border: "1px solid #e5e7eb", padding: "14px 16px",
  boxShadow: "0 12px 32px rgba(0,0,0,.25)" };
const viewerClose = { background: "transparent", border: "none", color: "#111", fontWeight: 900, cursor: "pointer", fontSize: 18 };
const viewerBigImg = { width: "100%", height: "auto", maxHeight: "70vh", objectFit: "contain", borderRadius: 12,
  boxShadow: "0 6px 18px rgba(0,0,0,.2)" };
const viewerThumbsWrap = { marginTop: 8, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))", gap: 10 };
const viewerThumbTile = { position: "relative", border: "1px solid #e5e7eb", borderRadius: 10, overflow: "hidden",
  background: "#f8fafc", padding: 0, cursor: "pointer" };
const viewerThumbImg = { width: "100%", height: 120, objectFit: "cover", display: "block" };

function ImageViewerModal({ open, images = [], title = "", onClose }) {
  const [preview, setPreview] = React.useState(images[0] || "");
  React.useEffect(() => {
    if (open) setPreview(images[0] || "");
    const onEsc = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onEsc);
    return () => window.removeEventListener("keydown", onEsc);
  }, [open, images, onClose]);
  if (!open) return null;
  return (
    <div style={viewerBack} onClick={onClose}>
      <div style={viewerCard} onClick={(e) => e.stopPropagation()}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
          <div style={{ fontWeight: 900, fontSize: "1.05rem", color: "#0f172a" }}>
            🖼️ Product Images{title ? ` — ${title}` : ""}
          </div>
          <button onClick={onClose} style={viewerClose}>✕</button>
        </div>
        {preview ? (
          <div style={{ marginTop: 12, marginBottom: 10 }}>
            <img src={preview} alt="preview" style={viewerBigImg} />
          </div>
        ) : (
          <div style={{ marginTop: 12, marginBottom: 10, color: "#64748b" }}>No images.</div>
        )}
        <div style={viewerThumbsWrap}>
          {images.map((src, i) => (
            <button key={i} style={viewerThumbTile} onClick={() => setPreview(src)} title={`Image ${i + 1}`}>
              <img src={src} alt={`thumb-${i}`} style={viewerThumbImg} />
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ========== MultiSelect ========== */
function MultiSelect({ label, options = [], selected = [], onChange, placeholder = "All" }) {
  const toggle = (val) => {
    const set = new Set(selected);
    if (set.has(val)) set.delete(val); else set.add(val);
    onChange(Array.from(set));
  };
  const badge = selected.length === 0 ? placeholder : `${selected.length} selected`;
  return (
    <details style={{ position: "relative" }}>
      <summary style={{ listStyle: "none", cursor: "pointer", userSelect: "none", borderRadius: 12,
        border: "1.5px solid rgba(255,255,255,.8)", background: "rgba(255,255,255,.9)", padding: "8px 12px",
        display: "flex", gap: 8, alignItems: "center", boxShadow: "0 4px 10px rgba(0,0,0,.06)", minWidth: 200 }}>
        <span style={{ fontWeight: 800, color: "#0f172a" }}>{label}</span>
        <span style={{ marginLeft: "auto", background: "#eef2ff", border: "1px solid #c7d2fe", color: "#3730a3",
          borderRadius: 999, padding: "2px 8px", fontSize: 12, fontWeight: 800 }}>{badge}</span>
      </summary>
      <div style={{ position: "absolute", zIndex: 50, top: "calc(100% + 6px)", left: 0, width: 280,
        maxHeight: 260, overflow: "auto", background: "#fff", border: "1px solid #e5e7eb", borderRadius: 12,
        boxShadow: "0 18px 28px rgba(2,6,23,.18)", padding: 10 }}>
        <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
          <button onClick={() => onChange(options)} style={miniBtn}>Select all</button>
          <button onClick={() => onChange([])} style={{ ...miniBtn, background: "#fee2e2", borderColor: "#fecaca", color: "#991b1b" }}>Clear</button>
        </div>
        {options.length === 0 ? (
          <div style={{ color: "#64748b", padding: 8 }}>No options.</div>
        ) : options.map((opt, i) => (
          <label key={i} style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 4px", borderBottom: "1px dashed #f1f5f9" }}>
            <input type="checkbox" checked={selected.includes(opt)} onChange={() => toggle(opt)} />
            <span style={{ color: "#0f172a" }}>{opt || "—"}</span>
          </label>
        ))}
      </div>
    </details>
  );
}

const miniBtn = {
  background: "#eff6ff", border: "1px solid #bfdbfe", color: "#1e3a8a",
  borderRadius: 10, padding: "6px 10px", fontWeight: 800, cursor: "pointer",
};

/* ====================== MAIN PAGE ====================== */
export default function BrowseReturns() {
  const [returnsData, setReturnsData] = useState([]);
  const [changesData, setChangesData] = useState([]);
  const [filterFrom, setFilterFrom] = useState("");
  const [filterTo, setFilterTo] = useState("");
  const [selectedDate, setSelectedDate] = useState("");
  const [openYears, setOpenYears] = useState({});
  const [openMonths, setOpenMonths] = useState({});
  const [loadingServer, setLoadingServer] = useState(false);
  const [serverErr, setServerErr] = useState("");
  const [search, setSearch] = useState("");
  const [globalQ, setGlobalQ] = useState("");
  const [showResults, setShowResults] = useState(false);
  const [resPage, setResPage] = useState(1);
  const RES_PAGE_SIZE = 50;

  // ✅ Password modal state for "Export ALL XLSX"
  const [pwModal, setPwModal] = useState(false);

  const SEARCH_FIELDS = [
    "itemCode","productName","origin","butchery","customButchery",
    "quantity","qtyType","customQtyType","expiry","remarks","action","customAction"
  ];

  function normalizeField(row, key) {
    if (key === "butchery") return safeButchery(row);
    if (key === "qtyType")
      return (row.qtyType === "أخرى" || row.qtyType === "أخرى / Other") ? (row.customQtyType || "") : (row.qtyType || "");
    if (key === "action") return actionText(row);
    return row?.[key];
  }

  function scoreRow(row, q) {
    const needle = q.toLowerCase().trim();
    if (!needle) return { score: 0, hits: [] };
    let score = 0;
    const hits = [];
    for (const f of SEARCH_FIELDS) {
      const val = (normalizeField(row, f) ?? "").toString().toLowerCase();
      if (!val) continue;
      if (val === needle) { score += 3; hits.push(f); }
      else if (val.startsWith(needle)) { score += 2; hits.push(f); }
      else if (val.includes(needle)) { score += 1; hits.push(f); }
    }
    return { score, hits: Array.from(new Set(hits)) };
  }

  /* ========== Load ========== */
  const reload = useCallback(async () => {
    setServerErr("");
    setLoadingServer(true);
    try {
      const [rawReturns, rawChanges] = await Promise.all([
        fetchByType("returns"),
        fetchByType("returns_changes"),
      ]);
      const normalized = normalizeReturns(rawReturns);
      setReturnsData(normalized);
      setChangesData(rawChanges);

      if (!selectedDate && normalized.length) {
        const oldest = [...normalized].map((r) => r.reportDate).sort((a, b) => a.localeCompare(b))[0];
        setSelectedDate(oldest);
        const y = oldest.slice(0, 4), m = oldest.slice(5, 7);
        setOpenYears((p) => ({ ...p, [y]: true }));
        setOpenMonths((p) => ({ ...p, [`${y}-${m}`]: true }));
      }
    } catch (e) {
      console.error(e);
      setServerErr("Failed to fetch from server. (The server might be waking up).");
    } finally {
      setLoadingServer(false);
    }
  }, [selectedDate]);

  useEffect(() => { reload(); }, []); // eslint-disable-line

  /* changes map */
  const changeMapByDate = useMemo(() => {
    const map = new Map();
    for (const rec of changesData) {
      const d = rec?.payload?.reportDate || rec?.reportDate || "";
      if (!d) continue;
      const items = Array.isArray(rec?.payload?.items) ? rec.payload.items : [];
      if (!map.has(d)) map.set(d, new Map());
      const inner = map.get(d);
      for (const ch of items) {
        const k = ch?.key;
        if (!k) continue;
        const ts = toTs(ch?.at) || 0;
        const prev = inner.get(k);
        if (!prev || ts > prev.ts) inner.set(k, { from: ch.from, to: ch.to, at: ch.at, ts });
      }
    }
    return map;
  }, [changesData]);

  /* filter + sort asc */
  const filteredReportsAsc = useMemo(() => {
    const arr = returnsData.filter((r) => {
      const d = r.reportDate || "";
      if (filterFrom && d < filterFrom) return false;
      if (filterTo && d > filterTo) return false;
      return true;
    });
    arr.sort((a, b) => (a.reportDate || "").localeCompare(b.reportDate || ""));
    return arr;
  }, [returnsData, filterFrom, filterTo]);

  useEffect(() => {
    if (!filteredReportsAsc.length) { setSelectedDate(""); return; }
    const still = filteredReportsAsc.some((r) => r.reportDate === selectedDate);
    if (!still) {
      setSelectedDate(filteredReportsAsc[0].reportDate);
      const y = filteredReportsAsc[0].reportDate.slice(0, 4);
      const m = filteredReportsAsc[0].reportDate.slice(5, 7);
      setOpenYears((p) => ({ ...p, [y]: true }));
      setOpenMonths((p) => ({ ...p, [`${y}-${m}`]: true }));
    }
  }, [filteredReportsAsc, selectedDate]);

  const selectedReport = filteredReportsAsc.find((r) => r.reportDate === selectedDate) || null;

  /* hierarchy */
  const hierarchyAsc = useMemo(() => {
    const years = new Map();
    filteredReportsAsc.forEach((rep) => {
      const d = rep.reportDate;
      const y = d.slice(0, 4), m = d.slice(5, 7);
      if (!years.has(y)) years.set(y, new Map());
      const months = years.get(y);
      if (!months.has(m)) months.set(m, []);
      months.get(m).push(d);
    });
    years.forEach((months) => months.forEach((days) => days.sort((a, b) => a.localeCompare(b))));
    return Array.from(years.keys()).sort((a, b) => a.localeCompare(b)).map((y) => {
      const months = years.get(y);
      return {
        year: y,
        months: Array.from(months.keys()).sort((a, b) => a.localeCompare(b))
          .map((m) => ({ month: m, days: months.get(m) })),
      };
    });
  }, [filteredReportsAsc]);

  /* advanced filters */
  const [posSel, setPosSel] = useState([]);
  const [originSel, setOriginSel] = useState([]);
  const [actionSel, setActionSel] = useState([]);
  const [qtySel, setQtySel] = useState("any");
  const [hasImages, setHasImages] = useState("any");
  const [remarksState, setRemarksState] = useState("any");

  const { posOpts, originOpts, actionOpts } = useMemo(() => {
    const posSet = new Set(), originSet = new Set(), actionSet = new Set();
    for (const rep of filteredReportsAsc)
      for (const it of (rep.items || [])) {
        posSet.add(safeButchery(it) || "—");
        originSet.add(it.origin || "—");
        actionSet.add(actionText(it) || "—");
      }
    const sortFn = (a, b) => String(a || "").localeCompare(String(b || ""), undefined, { sensitivity: "base" });
    return {
      posOpts: Array.from(posSet).sort(sortFn),
      originOpts: Array.from(originSet).sort(sortFn),
      actionOpts: Array.from(actionSet).sort(sortFn),
    };
  }, [filteredReportsAsc]);

  function rowPassesAdvanced(row) {
    const pos = safeButchery(row) || "—";
    const origin = row.origin || "—";
    const action = actionText(row) || "—";
    if (posSel.length && !posSel.includes(pos)) return false;
    if (originSel.length && !originSel.includes(origin)) return false;
    if (actionSel.length && !actionSel.includes(action)) return false;
    if (qtySel !== "any" && qtyKind(row) !== qtySel) return false;
    if (hasImages !== "any") {
      const has = Array.isArray(row.images) && row.images.length > 0;
      if (hasImages === "yes" && !has) return false;
      if (hasImages === "no" && has) return false;
    }
    const rem = (row.remarks ?? "").toString().trim();
    if (remarksState === "empty" && rem.length !== 0) return false;
    if (remarksState === "nonempty" && rem.length === 0) return false;
    return true;
  }

  function clearAllFilters() {
    setPosSel([]); setOriginSel([]); setActionSel([]);
    setQtySel("any"); setHasImages("any"); setRemarksState("any");
  }

  function setQuickDays(days) {
    const today = new Date();
    const to = today.toISOString().slice(0, 10);
    const fromD = new Date(today.getTime() - (days - 1) * 24 * 60 * 60 * 1000);
    setFilterFrom(fromD.toISOString().slice(0, 10));
    setFilterTo(to);
  }

  /* KPIs */
  const kpi = useMemo(() => {
    let totalItems = 0, totalQtyKg = 0, totalQtyPcs = 0;
    const posCountItems = {}, posKg = {}, posPcs = {}, byActionLatest = {}, condemnationNames = {};
    let condemnationCount = 0, condemnationKg = 0, useProdCount = 0, sepExpiredCount = 0;
    let marketKg = 0, disposedCount = 0, disposedKg = 0;

    const latestActionFor = (date, row) => {
      const inner = changeMapByDate.get(date) || new Map();
      const ch = inner.get(itemKey(row));
      return ch?.to ?? actionText(row);
    };

    filteredReportsAsc.forEach((rep) => {
      const date = rep.reportDate;
      (rep.items || []).forEach((it) => {
        if (!rowPassesAdvanced(it)) return;
        totalItems += 1;
        const q = Number(it.quantity || 0);
        const pos = safeButchery(it) || "—";
        posCountItems[pos] = (posCountItems[pos] || 0) + 1;
        if (isKgType(it.qtyType)) { posKg[pos] = (posKg[pos] || 0) + q; totalQtyKg += q; }
        else if (isPcsType(it.qtyType)) { posPcs[pos] = (posPcs[pos] || 0) + q; totalQtyPcs += q; }

        const act = latestActionFor(date, it);
        if (act) byActionLatest[act] = (byActionLatest[act] || 0) + 1;
        if (isCondemnation(act)) {
          condemnationCount += 1;
          if (isKgType(it.qtyType)) condemnationKg += q;
          condemnationNames[(it.productName || "—").trim()] = (condemnationNames[(it.productName || "—").trim()] || 0) + 1;
        }
        if ((act || "").toLowerCase() === "use in production") useProdCount += 1;
        if ((act || "").toLowerCase() === "separated expired shelf") sepExpiredCount += 1;
        if (isSendToMarket(act) && isKgType(it.qtyType)) marketKg += q;
        if (isDisposed(act)) { disposedCount += 1; if (isKgType(it.qtyType)) disposedKg += q; }
      });
    });

    const pickMax = (obj) => {
      let bestK = "—", bestV = -Infinity;
      for (const [k, v] of Object.entries(obj)) if (v > bestV) { bestV = v; bestK = k; }
      return { key: bestK, value: bestV > 0 ? bestV : 0 };
    };
    const topKg = pickMax(posKg), topPcs = pickMax(posPcs);
    const actionTotal = Object.values(byActionLatest).reduce((a, b) => a + b, 0) || 1;

    return {
      totalReports: filteredReportsAsc.length, totalItems, totalQtyKg, totalQtyPcs,
      topPosByItems: pickMax(posCountItems),
      topPosByQtyKg: { key: topKg.key, kg: Math.round(topKg.value*1000)/1000, percent: Math.round(topKg.value*100/(totalQtyKg||1)) },
      topPosByQtyPcs: { key: topPcs.key, pcs: Math.round(topPcs.value*1000)/1000, percent: Math.round(topPcs.value*100/(totalQtyPcs||1)) },
      topCondemnList: Object.entries(condemnationNames).sort((a,b)=>b[1]-a[1]).slice(0,5).map(([name,count])=>({name,count})),
      condemnationShare: { count: condemnationCount, percent: Math.round(condemnationCount*100/actionTotal), kg: Math.round(condemnationKg*1000)/1000 },
      useProdShare: { count: useProdCount, percent: Math.round(useProdCount*100/actionTotal) },
      sepExpiredShare: { count: sepExpiredCount, percent: Math.round(sepExpiredCount*100/actionTotal) },
      disposedShare: { count: disposedCount, percent: Math.round(disposedCount*100/actionTotal) },
      disposedKg: Math.round(disposedKg*1000)/1000,
      marketKg: Math.round(marketKg*1000)/1000,
      topActions: Object.entries(byActionLatest)
        .filter(([n]) => !new Set(["condemnation","use in production","separated expired shelf","disposed","desposed"]).has((n||"").toLowerCase()))
        .sort((a,b)=>b[1]-a[1]).slice(0,3)
        .map(([name,count])=>({ name, count, percent: Math.round(count*100/actionTotal) })),
      actionTotal,
    };
  }, [filteredReportsAsc, changeMapByDate, posSel, originSel, actionSel, qtySel, hasImages, remarksState]); // eslint-disable-line

  /* ========== ✅ Summary for selected day ========== */
  const selectedSummary = useMemo(() => {
    if (!selectedReport) return null;
    const rows = (selectedReport.items || []).filter(rowPassesAdvanced); // eslint-disable-line
    let kg = 0, pcs = 0, other = 0;
    rows.forEach((it) => {
      const qty = Number(it.quantity || 0);
      if (isKgType(it.qtyType)) kg += qty;
      else if (isPcsType(it.qtyType)) pcs += qty;
      else other += qty;
    });
    return { count: rows.length, total: (selectedReport.items || []).length, kg, pcs, other };
  }, [selectedReport, posSel, originSel, actionSel, qtySel, hasImages, remarksState]); // eslint-disable-line

  /* ========== Sorting + search ========== */
  const [sort, setSort] = useState({ key: null, dir: null });

  function toggleSort(key) {
    setSort((prev) => {
      if (prev.key !== key) return { key, dir: "asc" };
      if (prev.dir === "asc") return { key, dir: "desc" };
      return { key: null, dir: null };
    });
  }

  function getCellValue(row, key) {
    switch (key) {
      case "itemCode":    return row.itemCode || "";
      case "productName": return row.productName || "";
      case "origin":      return row.origin || "";
      case "pos":         return safeButchery(row) || "";
      case "quantity":    return Number(row.quantity || 0);
      case "qtyType":     return (row.qtyType === "أخرى" || row.qtyType === "أخرى / Other") ? (row.customQtyType || "") : (row.qtyType || "");
      case "expiry":      return row.expiry || "";
      case "remarks":     return row.remarks || "";
      case "action":      return actionText(row) || "";
      default:            return "";
    }
  }

  function rowMatchesSearch(row, qRaw) {
    const q = (qRaw || "").trim().toLowerCase();
    if (!q) return true;
    return [
      row.itemCode, row.productName, row.origin, safeButchery(row),
      String(row.quantity ?? ""),
      (row.qtyType === "أخرى" || row.qtyType === "أخرى / Other") ? (row.customQtyType || "") : (row.qtyType || ""),
      row.expiry, row.remarks, actionText(row),
    ].some((v) => (v ?? "").toString().toLowerCase().includes(q));
  }

  const sortedRows = useMemo(() => {
    if (!selectedReport) return [];
    let rows = (selectedReport.items || []).map((r, i) => ({ ...r, __i: i }));
    rows = rows.filter((r) => rowMatchesSearch(r, search));
    rows = rows.filter((r) => rowPassesAdvanced(r));
    if (!sort.key || !sort.dir) return rows;
    const collator = new Intl.Collator(undefined, { numeric: true, sensitivity: "base" });
    rows.sort((a, b) => {
      const va = getCellValue(a, sort.key), vb = getCellValue(b, sort.key);
      let cmp = sort.key === "quantity" ? (va ?? 0) - (vb ?? 0) : collator.compare(String(va ?? ""), String(vb ?? ""));
      if (cmp === 0) cmp = a.__i - b.__i;
      return sort.dir === "desc" ? -cmp : cmp;
    });
    return rows;
  }, [selectedReport, sort, search, posSel, originSel, actionSel, qtySel, hasImages, remarksState]); // eslint-disable-line

  /* ========== ✅ Highlight helper (used in day table + global results) ========== */
  function highlight(text, q) {
    if (!q || !q.trim()) return String(text ?? "");
    const escaped = q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const re = new RegExp(`(${escaped})`, "ig");
    const parts = String(text ?? "").split(re);
    return (
      <span>
        {parts.map((p, i) =>
          re.test(p)
            ? <mark key={i} style={{ background: "#fef08a", color: "#713f12", borderRadius: 3 }}>{p}</mark>
            : <span key={i}>{p}</span>
        )}
      </span>
    );
  }

  /* ========== PDF ========== */
  async function ensureJsPDF() {
    if (window.jspdf && window.jspdf.jsPDF) return window.jspdf.jsPDF;
    await new Promise((resolve, reject) => {
      const s = document.createElement("script");
      s.src = "https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js";
      s.onload = resolve; s.onerror = () => reject(new Error("Failed to load jsPDF"));
      document.head.appendChild(s);
    });
    return window.jspdf.jsPDF;
  }
  async function ensureAutoTable() {
    if (window.jspdf?.jsPDF?.API?.autoTable) return;
    await new Promise((resolve, reject) => {
      const s = document.createElement("script");
      s.src = "https://cdnjs.cloudflare.com/ajax/libs/jspdf-autotable/3.8.4/jspdf.plugin.autotable.min.js";
      s.onload = resolve; s.onerror = () => reject(new Error("Failed to load jsPDF-AutoTable"));
      document.head.appendChild(s);
    });
  }

  const handleExportPDF = async () => {
    if (!selectedReport) return;
    try {
      const JsPDF = await ensureJsPDF();
      await ensureAutoTable();
      const isOther = (v) => v === "إجراء آخر..." || v === "Other...";
      const actionTextSafe = (row) => isOther(row?.action) ? row?.customAction || "" : row?.action || "";
      const doc = new JsPDF({ unit: "pt", format: "a4", orientation: "landscape" });
      const marginL = 20, marginR = 20, marginTop = 80;
      const pageWidth = doc.internal.pageSize.getWidth();
      const avail = pageWidth - marginL - marginR;
      const drawHeader = () => {
        doc.setFont("helvetica","bold"); doc.setFontSize(16);
        doc.text("Returns Report", marginL, 36);
        doc.setFont("helvetica","normal"); doc.setFontSize(11);
        doc.text(`Date: ${selectedReport.reportDate}`, marginL, 54);
        const rightX = pageWidth - marginR;
        doc.setFont("helvetica","bold"); doc.setTextColor(180,0,0); doc.setFontSize(18);
        doc.text("AL MAWASHI", rightX, 30, { align: "right" });
        doc.setTextColor(0,0,0); doc.setFont("helvetica","normal"); doc.setFontSize(10);
        doc.text("Trans Emirates Livestock Trading L.L.C.", rightX, 46, { align: "right" });
      };
      drawHeader();
      const changeMap = changeMapByDate.get(selectedReport?.reportDate || "") || new Map();
      // ✅ Use sortedRows (respects current search + filters)
      const body = sortedRows.map((row, i) => {
        const pos = safeButchery(row);
        const qtyType = (row.qtyType === "أخرى" || row.qtyType === "أخرى / Other") ? row.customQtyType || "" : row.qtyType || "";
        const curr = actionTextSafe(row);
        let actionCell = curr || "";
        const k = itemKey(row);
        const ch = changeMap.get(k);
        if (ch && (ch.to ?? "") === (curr ?? "")) {
          const dateTxt = formatChangeDatePDF(ch);
          actionCell = `${(ch.from||"").trim()} to ${(ch.to||"").trim()}${dateTxt ? `\n${dateTxt}` : ""}`;
        }
        return [String(i+1), row.productName||"", row.origin||"", pos||"", String(row.quantity??""), qtyType, row.expiry||"", row.remarks||"", actionCell];
      });
      const frac = [0.05,0.18,0.09,0.08,0.06,0.08,0.08,0.18,0.20];
      const columnStyles = {};
      frac.forEach((f,idx)=>(columnStyles[idx]={ cellWidth: Math.floor(avail*f) }));
      columnStyles[0].halign="center"; columnStyles[4].halign="center"; columnStyles[6].halign="center";
      columnStyles[7].halign="left"; columnStyles[8].halign="left";
      doc.autoTable({
        head: [["SL","PRODUCT","ORIGIN","POS","QTY","QTY TYPE","EXPIRY","REMARKS","ACTION"]],
        body, margin:{ top:marginTop, left:marginL, right:marginR }, tableWidth:avail,
        styles:{ font:"helvetica", fontSize:10, cellPadding:4, lineColor:[182,200,227], lineWidth:0.5, halign:"left", valign:"middle", overflow:"linebreak", wordBreak:"break-word", minCellHeight:16 },
        headStyles:{ fillColor:[219,234,254], textColor:[17,17,17], fontStyle:"bold", halign:"center" },
        columnStyles,
        didDrawPage: () => drawHeader(),
      });
      doc.save(`returns_${selectedReport.reportDate}.pdf`);
    } catch (e) {
      console.error(e);
      alert("❌ Failed to generate PDF. Please try again.");
    }
  };

  /* ========== XLSX ========== */
  async function ensureXLSX() {
    if (window.XLSX?.utils) return window.XLSX;
    await new Promise((resolve, reject) => {
      const s = document.createElement("script");
      s.src = "https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js";
      s.onload = resolve; s.onerror = () => reject(new Error("Failed to load XLSX"));
      document.head.appendChild(s);
    });
    return window.XLSX;
  }

  const columns = ["SL.NO","ITEM CODE","PRODUCT NAME","ORIGIN","POS","QUANTITY","QTY TYPE","EXPIRY DATE","REMARKS","ACTION"];

  function buildRowsForReport(rep, useFiltered = false) {
    const changeMap = changeMapByDate.get(rep?.reportDate || "") || new Map();
    const isOther = (v) => v === "إجراء آخر..." || v === "Other...";
    const actionTextSafe = (row) => isOther(row?.action) ? row?.customAction || "" : row?.action || "";
    const items = useFiltered ? sortedRows : (rep.items || []).filter(rowPassesAdvanced);
    return items.map((row, i) => {
      const pos = safeButchery(row);
      const qtyType = (row.qtyType === "أخرى" || row.qtyType === "أخرى / Other") ? row.customQtyType || "" : row.qtyType || "";
      const curr = actionTextSafe(row);
      const k = itemKey(row);
      const ch = changeMap.get(k);
      let actionCell = curr || "";
      if (ch && (ch.to ?? "") === (curr ?? "")) {
        const dateTxt = formatChangeDatePDF(ch);
        actionCell = `${(ch.from||"").trim()} to ${(ch.to||"").trim()}${dateTxt ? ` (${dateTxt})` : ""}`;
      }
      return [i+1, row.itemCode||"", row.productName||"", row.origin||"", pos||"", Number(row.quantity??0), qtyType||"", row.expiry||"", row.remarks||"", actionCell];
    });
  }

  function autosizeColumns(ws, data) {
    const colWidths = (data[0]||[]).map((_,colIdx) => {
      let maxLen = 10;
      for (let r = 0; r < data.length; r++) {
        const len = (data[r][colIdx]==null ? 0 : String(data[r][colIdx])).length;
        if (len > maxLen) maxLen = len;
      }
      return { wch: Math.min(Math.max(maxLen+2,10),60) };
    });
    ws["!cols"] = colWidths;
    ws["!freeze"] = { xSplit:1, ySplit:1 };
  }

  // ✅ Export selected day — uses sortedRows (filtered + searched)
  const handleExportXLSXSelected = async () => {
    if (!selectedReport) { alert("Select a date first."); return; }
    try {
      const XLSX = await ensureXLSX();
      const wb = XLSX.utils.book_new();
      const data = [columns, ...buildRowsForReport(selectedReport, true)];
      const ws = XLSX.utils.aoa_to_sheet(data);
      autosizeColumns(ws, data);
      const label = search || (posSel.length || actionSel.length || originSel.length) ? "Filtered" : selectedReport.reportDate;
      XLSX.utils.book_append_sheet(wb, ws, label.slice(0,31));
      XLSX.writeFile(wb, `returns_${selectedReport.reportDate}${search ? "_filtered" : ""}.xlsx`);
    } catch (e) { console.error(e); alert("❌ Failed to export XLSX."); }
  };

  // ✅ Export ALL — uses PasswordModal instead of window.prompt
  const handleExportXLSXAllLocked = () => setPwModal(true);

  const handlePasswordSubmit = async (code, setErr) => {
    if (code !== "0585446473") { setErr("❌ Incorrect password."); return; }
    setPwModal(false);
    try {
      const XLSX = await ensureXLSX();
      const wb = XLSX.utils.book_new();
      const all = [...returnsData].sort((a, b) => (a.reportDate || "").localeCompare(b.reportDate || ""));
      if (!all.length) { alert("No reports to export."); return; }
      for (const rep of all) {
        const data = [columns, ...buildRowsForReport(rep, false)];
        const ws = XLSX.utils.aoa_to_sheet(data);
        autosizeColumns(ws, data);
        XLSX.utils.book_append_sheet(wb, ws, (rep.reportDate || "DAY").slice(0,31));
      }
      XLSX.writeFile(wb, `returns_ALL_days.xlsx`);
    } catch (e) { console.error(e); alert("❌ Failed to export ALL XLSX."); }
  };

  /* ========== Global search ========== */
  const globalIndex = useMemo(() => {
    const out = [];
    for (const rep of filteredReportsAsc)
      (rep.items || []).forEach((row, i) => out.push({ date: rep.reportDate, row, idx: i }));
    return out;
  }, [filteredReportsAsc]);

  const globalResults = useMemo(() => {
    const q = globalQ.trim();
    if (!q) return [];
    const scored = globalIndex
      .filter((r) => rowPassesAdvanced(r.row))
      .map((r) => { const s = scoreRow(r.row, q); return { ...r, score: s.score, hits: s.hits }; })
      .filter((r) => r.score > 0);
    scored.sort((a, b) => b.score !== a.score ? b.score - a.score : (b.date || "").localeCompare(a.date || ""));
    return scored;
  }, [globalQ, globalIndex, posSel, originSel, actionSel, qtySel, hasImages, remarksState]); // eslint-disable-line

  const totalPages = Math.max(1, Math.ceil(globalResults.length / RES_PAGE_SIZE));
  const pagedResults = useMemo(() => {
    const start = (resPage - 1) * RES_PAGE_SIZE;
    return globalResults.slice(start, start + RES_PAGE_SIZE);
  }, [globalResults, resPage]);

  function jumpToDay(d) {
    setSelectedDate(d); setShowResults(false);
    const y = d.slice(0,4), m = d.slice(5,7);
    setOpenYears(p => ({...p,[y]:true}));
    setOpenMonths(p => ({...p,[`${y}-${m}`]:true}));
  }

  function exportSearchResultsXLSX() {
    if (!globalResults.length) return alert("No results to export.");
    (async () => {
      try {
        const XLSX = await ensureXLSX();
        const wb = XLSX.utils.book_new();
        const head = ["SL.NO","DATE","ITEM CODE","PRODUCT NAME","ORIGIN","POS","QUANTITY","QTY TYPE","EXPIRY","REMARKS","ACTION","SCORE","MATCH IN"];
        const rows = globalResults.map((r, i) => {
          const row = r.row;
          const pos = safeButchery(row);
          const qtyType = (row.qtyType === "أخرى" || row.qtyType === "أخرى / Other") ? (row.customQtyType || "") : (row.qtyType || "");
          return [i+1, r.date, row.itemCode||"", row.productName||"", row.origin||"", pos||"", Number(row.quantity??0), qtyType||"", row.expiry||"", row.remarks||"", actionText(row)||"", r.score, r.hits.join(", ")];
        });
        const data = [head, ...rows];
        const ws = XLSX.utils.aoa_to_sheet(data);
        autosizeColumns(ws, data);
        ws["!freeze"] = { xSplit:1, ySplit:1 };
        XLSX.utils.book_append_sheet(wb, ws, "Search_Results");
        XLSX.writeFile(wb, `returns_search_results.xlsx`);
      } catch(e) { console.error(e); alert("❌ Failed to export search results."); }
    })();
  }

  /* ========== Image viewer ========== */
  const [viewerOpen, setViewerOpen] = useState(false);
  const [viewerData, setViewerData] = useState({ title: "", images: [] });
  function openViewer(row) {
    const imgs = Array.isArray(row.images) ? row.images : [];
    if (!imgs.length) return;
    setViewerData({ title: row.productName || "Images", images: imgs });
    setViewerOpen(true);
  }

  const changeMap = changeMapByDate.get(selectedReport?.reportDate || "") || new Map();

  /* ========== Styles ========== */
  const bgWrap = { position: "fixed", inset: 0, zIndex: 0,
    background: "radial-gradient(1200px 600px at 100% -10%, #67e8f9 0%, transparent 60%), linear-gradient(135deg,#6d28d9 0%, #4f46e5 45%, #06b6d4 100%)" };
  const pageWrap = { position: "relative", zIndex: 1, fontFamily: "Cairo, sans-serif", padding: "2.2rem", minHeight: "100vh", direction: "ltr", color: "#111" };
  const hero = { background: "linear-gradient(180deg, rgba(255,255,255,.55), rgba(255,255,255,.35))", border: "1px solid rgba(255,255,255,.6)", borderRadius: 20, padding: "18px 22px", marginBottom: 16, boxShadow: "0 12px 28px rgba(16, 24, 40, 0.15)", backdropFilter: "blur(8px)", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 };
  const heroTitle = { fontWeight: 900, fontSize: "1.35rem", background: "linear-gradient(90deg,#fff 0%, #0ea5e9 60%, #22d3ee 100%)", WebkitBackgroundClip: "text", backgroundClip: "text", color: "transparent", letterSpacing: ".3px" };
  const heroSub = { fontWeight: 600, fontSize: "0.95rem", color: "#0f172a", opacity: 0.85 };
  const kpiBox = { background: "rgba(255,255,255,0.9)", border: "1px solid rgba(255,255,255,0.7)", borderRadius: 14, boxShadow: "0 2px 12px rgba(0,0,0,.08)", padding: "12px 14px", color: "#111", minWidth: 210, backdropFilter: "blur(6px)" };
  const dateInputStyle = { borderRadius: 10, border: "1.5px solid rgba(255,255,255,.8)", background: "rgba(255,255,255,.85)", padding: "8px 13px", fontSize: "1em", minWidth: 120, color: "#111", boxShadow: "0 4px 10px rgba(0,0,0,.06)" };
  const clearBtn = { background: "#3b82f6", color: "#fff", border: "none", borderRadius: 12, padding: "9px 18px", fontWeight: "bold", fontSize: "1em", cursor: "pointer", boxShadow: "0 6px 18px rgba(59,130,246,.25)" };
  const leftTree = { minWidth: 300, background: "rgba(255,255,255,.9)", borderRadius: 16, boxShadow: "0 10px 24px rgba(2,6,23,.12)", padding: "6px 0", border: "1px solid rgba(255,255,255,.7)", maxHeight: "70vh", overflow: "auto", color: "#111", backdropFilter: "blur(6px)" };
  const treeHeader = { display: "flex", justifyContent: "space-between", padding: "12px 16px", cursor: "pointer", fontWeight: 800, color: "#0f172a", borderBottom: "1px solid #e5e7eb" };
  const treeSubHeader = { display: "flex", justifyContent: "space-between", padding: "10px 16px", cursor: "pointer", color: "#0f172a", borderBottom: "1px dashed #e5e7eb" };
  const treeDay = (active) => ({ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 16px", cursor: "pointer", borderBottom: "1px dashed #e5e7eb", background: active ? "rgba(14,165,233,.15)" : "transparent", borderRight: active ? "5px solid #3b82f6" : "none", fontSize: "1em", color: "#0f172a" });
  const rightPanel = { flex: 1, background: "rgba(255,255,255,.9)", borderRadius: 18, boxShadow: "0 12px 28px rgba(2,6,23,.12)", minHeight: 320, padding: "24px 26px", color: "#111", border: "1px solid rgba(255,255,255,.7)", backdropFilter: "blur(6px)" };
  const table = { width: "100%", background: "#fff", borderRadius: 10, borderCollapse: "collapse", border: "1px solid #b6c8e3", marginTop: 8, minWidth: 920, color: "#111" };
  // ✅ Sticky header style
  const th = { padding: "12px 8px", textAlign: "center", fontSize: "0.98em", fontWeight: "bold", border: "1px solid #b6c8e3", background: "#e6f0ff", color: "#0f172a", userSelect: "none", position: "sticky", top: 0, zIndex: 10 };
  const thBtn = (active) => ({ display: "inline-flex", gap: 6, alignItems: "center", cursor: "pointer", padding: "4px 6px", borderRadius: 8, border: active ? "1px solid #93c5fd" : "1px solid transparent", background: active ? "#eef6ff" : "transparent" });
  const arrowS = (on, up) => ({ fontSize: 11, fontWeight: 900, color: on ? "#2563eb" : "#64748b", marginLeft: 2, position: "relative", top: up ? -1 : 1 });
  const td = { padding: "10px 8px", textAlign: "center", minWidth: 90, border: "1px solid #b6c8e3", background: "#f8fbff", color: "#0f172a" };
  const brandWrap = { textAlign: "right" };
  const listRow = { display: "grid", gridTemplateColumns: "28px 1fr auto", alignItems: "center", gap: 8, padding: "6px 2px", borderBottom: "1px dashed #e5e7eb" };
  const rankDot = { width: 26, height: 26, borderRadius: 999, display: "grid", placeItems: "center", background: "#ecfdf5", color: "#065f46", fontWeight: 800, border: "1px solid #a7f3d0", fontSize: 12 };
  const countChip = { background: "#eff6ff", color: "#1e3a8a", borderRadius: 999, padding: "2px 10px", fontSize: 12, fontWeight: 800, border: "1px solid #bfdbfe" };
  const searchWrap = { position: "relative", display: "flex", alignItems: "center", background: "rgba(255,255,255,.95)", border: "1.5px solid rgba(255,255,255,.8)", borderRadius: 14, padding: "6px 10px", boxShadow: "0 6px 14px rgba(0,0,0,.06)" };
  const searchInput = { ...dateInputStyle, minWidth: 280, padding: "10px 14px 10px 38px", border: "none", boxShadow: "none", background: "transparent" };
  const searchIcon = { position: "absolute", left: 12, fontSize: 16, opacity: 0.6 };
  const summaryChip = (color, bg) => ({ background: bg, color, border: `1.5px solid ${color}33`, borderRadius: 10, padding: "6px 14px", fontWeight: 700, fontSize: 14 });

  const SortHeader = ({ sortKey, label }) => {
    const active = sort.key === sortKey;
    return (
      <span style={thBtn(active)} onClick={() => toggleSort(sortKey)} title="Click to sort">
        <span>{label}</span>
        <span style={arrowS(active && sort.dir === "asc", true)}>▲</span>
        <span style={arrowS(active && sort.dir === "desc", false)}>▼</span>
      </span>
    );
  };

  return (
    <>
      <div style={bgWrap}>
        <svg style={{ position:"absolute",top:0,left:0,width:"100%",opacity:0.25 }} viewBox="0 0 1440 200" preserveAspectRatio="none">
          <path d="M0,64L60,64C120,64,240,64,360,85.3C480,107,600,149,720,149.3C840,149,960,107,1080,80C1200,53,1320,43,1380,37.3L1440,32L1440,0L1380,0C1320,0,1200,0,1080,0C960,0,840,0,720,0C600,0,480,0,360,0C240,0,120,0,60,0L0,0Z" fill="#ffffff"/>
        </svg>
        <svg style={{ position:"absolute",bottom:-2,left:0,width:"100%",opacity:0.22,transform:"scaleY(-1)" }} viewBox="0 0 1440 200" preserveAspectRatio="none">
          <path d="M0,128L60,122.7C120,117,240,107,360,112C480,117,600,139,720,149.3C840,160,960,160,1080,149.3C1200,139,1320,117,1380,106.7L1440,96L1440,200L1380,200C1320,200,1200,200,1080,200C960,200,840,200,720,200C600,200,480,200,360,200,240,200,120,200,60,200L0,200Z" fill="#ffffff"/>
        </svg>
      </div>

      <div style={pageWrap}>
        {/* Hero */}
        <div style={hero}>
          <div>
            <div style={heroTitle}>📂 Browse Returns Reports (View Only)</div>
            <div style={heroSub}>Quick KPIs, date filter, advanced filters, sleek search, and global search across all reports.</div>
          </div>
          <div style={brandWrap}>
            <div style={{ fontFamily:"Cairo, sans-serif", fontWeight:900, letterSpacing:"1px", fontSize:"18px", color:"#b91c1c" }}>AL MAWASHI</div>
            <div style={{ fontFamily:"Cairo, sans-serif", fontWeight:600, fontSize:"11px", color:"#0f172a", opacity:0.9 }}>Trans Emirates Livestock Trading L.L.C.</div>
          </div>
        </div>

        {/* KPI donuts */}
        <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit, minmax(230px, 1fr))", gap:14, marginBottom:16, alignItems:"stretch" }}>
          <DonutCard percent={100} centerText="ALL" label="Total items" subLabel="All items across selected range & filters" count={kpi.totalItems} color="#059669"/>
          <DonutCard percent={kpi.condemnationShare.percent} label="Condemnation" subLabel="Share of latest actions" count={`${kpi.condemnationShare.count}`} color="#f40146"/>
          <DonutCard percent={kpi.useProdShare.percent} label="Use in production" subLabel="Share of latest actions" count={`${kpi.useProdShare.count}`} color="#7c3aed"/>
          <DonutCard percent={kpi.sepExpiredShare.percent} label="Separated expired shelf" subLabel="Share of latest actions" count={`${kpi.sepExpiredShare.count}`} color="#2563eb"/>
          <DonutCard percent={kpi.disposedShare.percent} centerText={String(kpi.disposedKg)} label="Disposed (kg)" subLabel="Total weight (latest action)" count={`${kpi.disposedShare.count} items`} color="#dc2626"/>
          <DonutCard percent={100} centerText={String(kpi.condemnationShare.kg)} label="Condemnation (kg)" subLabel="Total weight" color="#22c55e" extra={<div style={{fontSize:12,opacity:.8}}>{kpi.condemnationShare.count} items</div>}/>
          <DonutCard percent={100} centerText={String(kpi.totalReports)} label="Total reports" subLabel="Reports in selected range" color="#0ea5e9"/>
          <DonutCard percent={100} centerText={String(Math.round(kpi.totalQtyKg*1000)/1000)} label="Total quantity (kg)" subLabel="Weight-based items only" color="#1d4ed8"/>
          <DonutCard percent={100} centerText={String(kpi.marketKg)} label="Send to market (kg)" subLabel="Latest action only — weight-based items" color="#0d9488"/>
          <DonutCard percent={100} centerText={String(Math.round(kpi.totalQtyPcs*1000)/1000)} label="Total quantity (pcs)" subLabel="Piece-based items only" color="#2563eb"/>
          <DonutCard percent={Math.round((kpi.topPosByItems.value*100)/(kpi.totalItems||1))} label={kpi.topPosByItems.key||"—"} subLabel="Top POS by item count" count={`${kpi.topPosByItems.value} items`} color="#b45309"/>
          <DonutCard percent={kpi.topPosByQtyKg.percent} label={kpi.topPosByQtyKg.key||"—"} subLabel="Top POS by total quantity (kg)" count={`${kpi.topPosByQtyKg.kg} kg`} color="#0e7490"/>
          <DonutCard percent={kpi.topPosByQtyPcs.percent} label={kpi.topPosByQtyPcs.key||"—"} subLabel="Top POS by total quantity (pcs)" count={`${kpi.topPosByQtyPcs.pcs} pcs`} color="#0284c7"/>

          <div style={kpiBox}>
            <div style={{ fontWeight:900, textAlign:"center", marginBottom:8 }}>Top 5 Condemnation</div>
            {kpi.topCondemnList.length ? (
              <ul style={{ listStyle:"none", margin:0, padding:0 }}>
                {kpi.topCondemnList.map((p,i) => (
                  <li key={i} style={listRow}>
                    <span style={rankDot}>{i+1}</span>
                    <span style={{ fontWeight:700, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }} title={p.name}>{p.name}</span>
                    <span style={countChip}>{p.count}</span>
                  </li>
                ))}
              </ul>
            ) : <div style={{ opacity:.75, textAlign:"center" }}>No items with Condemnation status.</div>}
          </div>

          {kpi.topActions.map((a,idx) => (
            <DonutCard key={a.name+idx} label={a.name} subLabel="Share of latest actions" count={a.count} percent={a.percent} color={["#16a34a","#a21caf","#b45309"][idx%3]}/>
          ))}
        </div>

        {loadingServer && <div style={{ textAlign:"center", marginBottom:10, color:"#0f172a", fontWeight:700 }}>⏳ Loading from server…</div>}
        {serverErr && <div style={{ textAlign:"center", marginBottom:10, color:"#b91c1c", fontWeight:700 }}>{serverErr}</div>}

        {/* Controls */}
        <div style={{ background:"rgba(255,255,255,.9)", border:"1px solid rgba(255,255,255,.7)", borderRadius:16, padding:"14px", marginBottom:16, boxShadow:"0 10px 24px rgba(2,6,23,.08)", backdropFilter:"blur(6px)" }}>
          <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit, minmax(260px, 1fr))", gap:12, alignItems:"center" }}>

            {/* Date range */}
            <div style={{ display:"flex", gap:8, alignItems:"center", flexWrap:"wrap" }}>
              <span style={{ fontWeight:800, color:"#0f172a" }}>Date:</span>
              <label>From: <input type="date" value={filterFrom} onChange={(e)=>setFilterFrom(e.target.value)} style={{...dateInputStyle,marginLeft:8}}/></label>
              <label>To: <input type="date" value={filterTo} onChange={(e)=>setFilterTo(e.target.value)} style={{...dateInputStyle,marginLeft:8}}/></label>
              <button onClick={()=>setQuickDays(7)} style={miniBtn}>Last 7 days</button>
              <button onClick={()=>setQuickDays(30)} style={miniBtn}>Last 30 days</button>
              {(filterFrom||filterTo) && <button onClick={()=>{setFilterFrom("");setFilterTo("");}} style={{...clearBtn,padding:"9px 12px"}}>🧹 Clear date</button>}
              {/* ✅ Refresh button */}
              <button onClick={reload} disabled={loadingServer} style={{ background:loadingServer?"#94a3b8":"#0369a1", color:"#fff", border:"none", borderRadius:12, padding:"9px 14px", fontWeight:"bold", cursor:loadingServer?"not-allowed":"pointer", boxShadow:"0 6px 14px rgba(3,105,161,.2)" }}>
                {loadingServer ? "⏳ Loading…" : "🔄 Refresh"}
              </button>
            </div>

            {/* Multi-select */}
            <div style={{ display:"flex", gap:12, flexWrap:"wrap" }}>
              <MultiSelect label="POS" options={posOpts} selected={posSel} onChange={setPosSel}/>
              <MultiSelect label="Origin" options={originOpts} selected={originSel} onChange={setOriginSel}/>
              <MultiSelect label="Action" options={actionOpts} selected={actionSel} onChange={setActionSel}/>
            </div>

            {/* Qty / Images / Remarks */}
            <div style={{ display:"flex", gap:10, alignItems:"center", flexWrap:"wrap" }}>
              {[
                { label:"Qty Type", val:qtySel, set:setQtySel, opts:[["any","Any"],["kg","KG"],["pcs","PCS"],["other","Other"]] },
                { label:"Has Images", val:hasImages, set:setHasImages, opts:[["any","Any"],["yes","Yes"],["no","No"]] },
                { label:"Remarks", val:remarksState, set:setRemarksState, opts:[["any","Any"],["empty","Empty only"],["nonempty","Has text"]] },
              ].map(({label,val,set,opts}) => (
                <div key={label} style={searchWrap}>
                  <span style={{ fontWeight:800, color:"#0f172a", marginRight:8 }}>{label}</span>
                  <select value={val} onChange={(e)=>set(e.target.value)} style={{...dateInputStyle,padding:"8px 12px",minWidth:130}}>
                    {opts.map(([v,l])=><option key={v} value={v}>{l}</option>)}
                  </select>
                </div>
              ))}
              <button onClick={clearAllFilters} style={{...clearBtn,background:"#ef4444"}}>✨ Clear all filters</button>
            </div>

            {/* Day search */}
            <div style={{ display:"flex", gap:8, alignItems:"center", flexWrap:"wrap" }}>
              <div style={searchWrap}>
                <span style={searchIcon}>🔎</span>
                <input type="text" value={search} onChange={(e)=>setSearch(e.target.value)}
                  placeholder="Search current day (code, name, origin, POS, action...)"
                  style={searchInput}/>
                {search && <button onClick={()=>setSearch("")} style={{...miniBtn,marginLeft:6}}>Clear</button>}
              </div>
              {search && selectedReport && (
                <span style={{ fontWeight:800, color:"#0f172a", fontSize:13 }}>
                  {sortedRows.length} / {(selectedReport.items||[]).length} rows
                </span>
              )}
            </div>

            {/* Global search */}
            <div style={{ display:"flex", gap:8, alignItems:"center", flexWrap:"wrap", borderTop:"1px dashed #e5e7eb", paddingTop:10 }}>
              <div style={{...searchWrap,minWidth:360,flex:1}}>
                <span style={searchIcon}>🌐</span>
                <input type="text" value={globalQ}
                  onChange={(e)=>{setGlobalQ(e.target.value);setResPage(1);}}
                  placeholder="Global search across ALL reports..."
                  style={{...searchInput,minWidth:360}}/>
                {globalQ && <button onClick={()=>{setGlobalQ("");setShowResults(false);setResPage(1);}} style={{...miniBtn,marginLeft:6}}>Clear</button>}
              </div>
              <button onClick={()=>setShowResults(true)} disabled={!globalQ.trim()}
                style={{ background:"#0ea5e9", color:"#fff", border:"none", borderRadius:12, padding:"10px 16px", fontWeight:"bold", cursor:"pointer" }}>
                🔎 Show Results
              </button>
              {showResults && (
                <>
                  <span style={{ fontWeight:800, color:"#0f172a" }}>
                    {globalResults.length} result(s){globalResults.length>RES_PAGE_SIZE ? ` – page ${resPage}/${totalPages}` : ""}
                  </span>
                  {totalPages>1 && (
                    <div style={{ display:"inline-flex", gap:8, alignItems:"center" }}>
                      <button onClick={()=>setResPage(p=>Math.max(1,p-1))} style={{...clearBtn,background:"#e5e7eb",color:"#111"}}>◀ Prev</button>
                      <button onClick={()=>setResPage(p=>Math.min(totalPages,p+1))} style={{...clearBtn,background:"#e5e7eb",color:"#111"}}>Next ▶</button>
                    </div>
                  )}
                  <button onClick={exportSearchResultsXLSX}
                    style={{ background:"#10b981", color:"#fff", border:"none", borderRadius:12, padding:"10px 16px", fontWeight:"bold", cursor:"pointer" }}>
                    ⬇️ Export Results
                  </button>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Global search results */}
        {showResults && (
          <div style={{ background:"rgba(255,255,255,.95)", border:"1px solid #e5e7eb", borderRadius:16, padding:16, marginBottom:16, boxShadow:"0 8px 20px rgba(2,6,23,.08)" }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:8 }}>
              <div style={{ fontWeight:900, fontSize:"1.05rem", color:"#0f172a" }}>🔎 Search Results ({globalResults.length})</div>
              <button onClick={()=>setShowResults(false)} style={{ background:"transparent", border:"1px solid #e5e7eb", borderRadius:10, padding:"6px 10px", fontWeight:800, cursor:"pointer" }}>Close</button>
            </div>
            <div style={{ overflowX:"auto" }}>
              <table style={{ width:"100%", borderCollapse:"collapse", minWidth:980, border:"1px solid #b6c8e3", background:"#fff", borderRadius:10 }}>
                <thead>
                  <tr>
                    {["SL","DATE","CODE","PRODUCT","ORIGIN","POS","QTY","QTY TYPE","EXPIRY","ACTION","MATCH IN","SCORE","ACTIONS"].map(h=>(
                      <th key={h} style={{ padding:"10px 8px", border:"1px solid #b6c8e3", background:"#e6f0ff", textAlign:"center", fontWeight:900, color:"#0f172a" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {pagedResults.map((r,i) => {
                    const row = r.row;
                    const pos = safeButchery(row);
                    const qtyType = (row.qtyType==="أخرى"||row.qtyType==="أخرى / Other") ? (row.customQtyType||"") : (row.qtyType||"");
                    return (
                      <tr key={`${r.date}-${r.idx}-${i}`}>
                        <td style={td}>{(resPage-1)*RES_PAGE_SIZE+i+1}</td>
                        <td style={td}>{r.date}</td>
                        <td style={td}>{highlight(row.itemCode||"", globalQ)}</td>
                        <td style={td}>
                          <span>{highlight(row.productName||"", globalQ)}</span>
                          {Array.isArray(row.images)&&row.images.length>0 && <button style={viewImgBtn} onClick={()=>openViewer(row)}>VIEW IMG ({row.images.length})</button>}
                        </td>
                        <td style={td}>{highlight(row.origin||"", globalQ)}</td>
                        <td style={td}>{highlight(pos||"", globalQ)}</td>
                        <td style={td}>{highlight(row.quantity??"", globalQ)}</td>
                        <td style={td}>{highlight(qtyType||"", globalQ)}</td>
                        <td style={td}>{highlight(row.expiry||"", globalQ)}</td>
                        <td style={td}>{highlight(actionText(row)||"", globalQ)}</td>
                        <td style={td}>{r.hits.length ? r.hits.join(", ") : "—"}</td>
                        <td style={td}>{r.score}</td>
                        <td style={{...td,minWidth:120}}>
                          <button onClick={()=>jumpToDay(r.date)} style={{...clearBtn,padding:"6px 10px",background:"#111827"}}>Open day</button>
                        </td>
                      </tr>
                    );
                  })}
                  {pagedResults.length===0 && <tr><td colSpan={13} style={{...td,textAlign:"center"}}>No results.</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Tree + Details */}
        <div style={{ display:"flex", alignItems:"flex-start", gap:16, minHeight:420 }}>
          {/* Left tree */}
          <div style={leftTree}>
            {hierarchyAsc.length===0 ? (
              <div style={{ textAlign:"center", padding:60, color:"#334155", fontSize:"1.03em" }}>No reports for the selected period.</div>
            ) : hierarchyAsc.map(({year, months}) => {
              const yOpen = !!openYears[year];
              const yearCount = months.reduce((acc,mo)=>acc+mo.days.length,0);
              return (
                <div key={year} style={{ marginBottom:4 }}>
                  <div style={{...treeHeader, background:yOpen?"rgba(224,242,254,.6)":"rgba(239,246,255,.7)"}}
                    onClick={()=>setOpenYears(p=>({...p,[year]:!p[year]}))}>
                    <span>{yOpen?"▼":"►"} Year {year}</span>
                    <span style={{ fontWeight:700 }}>{yearCount} days</span>
                  </div>
                  {yOpen && (
                    <div style={{ padding:"6px 0" }}>
                      {months.map(({month,days}) => {
                        const key = `${year}-${month}`;
                        const mOpen = !!openMonths[key];
                        return (
                          <div key={key} style={{ margin:"4px 0 6px" }}>
                            <div style={{...treeSubHeader,background:mOpen?"rgba(240,249,255,.8)":"#ffffff"}}
                              onClick={()=>setOpenMonths(p=>({...p,[key]:!p[key]}))}>
                              <span>{mOpen?"▾":"▸"} Month {month}</span>
                              <span>{days.length} days</span>
                            </div>
                            {mOpen && days.map((d) => {
                              const isSelected = selectedDate===d;
                              const rep = filteredReportsAsc.find(r=>r.reportDate===d);
                              return (
                                <div key={d} style={treeDay(isSelected)} onClick={()=>setSelectedDate(d)}>
                                  <div>📅 {d}</div>
                                  <div style={{ fontWeight:700 }}>{(rep?.items?.filter(rowPassesAdvanced).length||0)} items</div>
                                </div>
                              );
                            })}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Right details */}
          <div style={rightPanel}>
            {selectedReport ? (
              <div>
                {/* Header */}
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", gap:10, marginBottom:10, flexWrap:"wrap" }}>
                  <div style={{ fontWeight:"bold", color:"#0f172a", fontSize:"1.15em" }}>
                    Returns details ({selectedReport.reportDate})
                  </div>
                  <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
                    <button onClick={handleExportPDF} style={{ background:"#111827", color:"#fff", border:"none", borderRadius:12, padding:"9px 14px", fontWeight:"bold", cursor:"pointer" }}>⬇️ Export PDF</button>
                    {/* ✅ XLSX export label shows "Filtered" when search is active */}
                    <button onClick={handleExportXLSXSelected} style={{ background:"#2563eb", color:"#fff", border:"none", borderRadius:12, padding:"9px 14px", fontWeight:"bold", cursor:"pointer" }}>
                      ⬇️ XLSX {search ? "(Filtered)" : ""}
                    </button>
                    <button onClick={handleExportXLSXAllLocked} style={{ background:"#0f766e", color:"#fff", border:"none", borderRadius:12, padding:"9px 14px", fontWeight:"bold", cursor:"pointer" }}>🔒 XLSX (ALL)</button>
                  </div>
                </div>

                {/* ✅ Summary bar */}
                {selectedSummary && (
                  <div style={{ display:"flex", gap:12, flexWrap:"wrap", marginBottom:12, alignItems:"center" }}>
                    <div style={summaryChip("#512e5f","#f5eeff")}>📝 Items: <strong>{selectedSummary.count}</strong>{selectedSummary.count!==selectedSummary.total ? ` / ${selectedSummary.total}` : ""}</div>
                    {selectedSummary.kg>0 && <div style={summaryChip("#155e75","#ecfeff")}>⚖️ KG: <strong>{selectedSummary.kg.toFixed(2)}</strong></div>}
                    {selectedSummary.pcs>0 && <div style={summaryChip("#065f46","#ecfdf5")}>📦 PCS: <strong>{selectedSummary.pcs}</strong></div>}
                    {selectedSummary.other>0 && <div style={summaryChip("#7c2d12","#fff7ed")}>🔢 Other: <strong>{selectedSummary.other.toFixed(2)}</strong></div>}
                  </div>
                )}

                {/* Table wrapper with overflow for sticky header to work */}
                <div style={{ overflowX:"auto", maxHeight:"60vh", overflowY:"auto" }}>
                  <table style={table}>
                    <thead>
                      <tr>
                        <th style={th}><span style={{opacity:.8}}>SL.NO</span></th>
                        <th style={th}><SortHeader sortKey="itemCode" label="ITEM CODE"/></th>
                        <th style={th}><SortHeader sortKey="productName" label="PRODUCT NAME"/></th>
                        <th style={th}><SortHeader sortKey="origin" label="ORIGIN"/></th>
                        <th style={th}><SortHeader sortKey="pos" label="POS"/></th>
                        <th style={th}><SortHeader sortKey="quantity" label="QUANTITY"/></th>
                        <th style={th}><SortHeader sortKey="qtyType" label="QTY TYPE"/></th>
                        <th style={th}><SortHeader sortKey="expiry" label="EXPIRY DATE"/></th>
                        <th style={th}><SortHeader sortKey="remarks" label="REMARKS"/></th>
                        <th style={th}><SortHeader sortKey="action" label="ACTION"/></th>
                      </tr>
                    </thead>
                    <tbody>
                      {sortedRows.map((row, i) => {
                        const curr = actionText(row);
                        const k = itemKey(row);
                        const ch = changeMap.get(k);
                        const showChange = ch && ch.to === curr;
                        return (
                          <tr key={row.__i ?? i}>
                            <td style={td}>{i+1}</td>
                            {/* ✅ Highlighted cells when search is active */}
                            <td style={td}>{search ? highlight(row.itemCode||"", search) : (row.itemCode||"")}</td>
                            <td style={td}>
                              <span>{search ? highlight(row.productName||"", search) : row.productName}</span>
                              {Array.isArray(row.images)&&row.images.length>0 && (
                                <button style={viewImgBtn} onClick={()=>openViewer(row)}>VIEW IMG ({row.images.length})</button>
                              )}
                            </td>
                            <td style={td}>{search ? highlight(row.origin||"", search) : row.origin}</td>
                            <td style={td}>{search ? highlight(safeButchery(row)||"", search) : safeButchery(row)}</td>
                            <td style={td}>{search ? highlight(String(row.quantity??""), search) : row.quantity}</td>
                            <td style={td}>{(row.qtyType==="أخرى"||row.qtyType==="أخرى / Other") ? row.customQtyType : row.qtyType||""}</td>
                            <td style={td}>{row.expiry}</td>
                            <td style={td}>{search ? highlight(row.remarks||"", search) : row.remarks}</td>
                            <td style={{...td, background:showChange?"#e9fce9":td.background}}>
                              {showChange ? (
                                <div style={{ lineHeight:1.2 }}>
                                  <div><span style={{opacity:.8}}>{ch.from}</span><span style={{margin:"0 6px"}}>→</span><b>{ch.to}</b></div>
                                  <span style={{ display:"inline-block", marginTop:4, padding:"2px 8px", borderRadius:999, background:"#16a34a", color:"#fff", fontSize:12, fontWeight:700 }}>Changed</span>
                                  {formatChangeDate(ch) && <div style={{ marginTop:4, fontSize:12, opacity:.85 }}>🗓️ {formatChangeDate(ch)}</div>}
                                </div>
                              ) : (
                                search ? highlight(curr||"", search) : curr
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              <div style={{ textAlign:"center", color:"#334155", padding:80, fontSize:"1.05em" }}>
                Pick a date from the list to view its details.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modals */}
      <ImageViewerModal open={viewerOpen} images={viewerData.images} title={viewerData.title} onClose={()=>setViewerOpen(false)}/>

      {/* ✅ Password modal for Export ALL */}
      <PasswordModal
        show={pwModal}
        title="🔒 Password required to export ALL reports"
        onSubmit={handlePasswordSubmit}
        onCancel={()=>setPwModal(false)}
      />
    </>
  );
}