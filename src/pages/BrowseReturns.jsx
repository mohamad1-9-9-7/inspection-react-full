// src/pages/BrowseReturns.jsx
import React, { useEffect, useMemo, useState, useRef, useCallback } from "react";
import {
  FiSearch, FiX, FiDownload, FiPrinter, FiRefreshCw, FiLock,
  FiChevronDown, FiChevronRight, FiEye, FiSliders, FiBarChart2,
  FiCalendar, FiGrid, FiList, FiBookmark, FiTrendingUp, FiTrendingDown,
  FiCheck, FiInfo, FiActivity, FiPieChart, FiSave, FiTrash2,
  FiArrowRight, FiCopy, FiLayers, FiAlertTriangle, FiFileText,
  FiFilter, FiColumns, FiZap, FiHelpCircle, FiPackage, FiClock,
  FiTarget,
} from "react-icons/fi";

/* ============================================================
   API
   ============================================================ */
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

/* ============================================================
   Helpers — date / branch / action / qty
   ============================================================ */
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
function fmtNum(n, digits = 2) {
  if (n == null || isNaN(n)) return "0";
  const v = Math.round(Number(n) * Math.pow(10, digits)) / Math.pow(10, digits);
  return v.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: digits });
}
function fmtPct(n) {
  if (n == null || isNaN(n)) return "0%";
  return `${Math.round(Number(n))}%`;
}

/* ============================================================
   Power search — parse key:value tokens with quotes
   Supported keys (aliases in parens):
     code (itemcode)            substring match on itemCode
     name (product, productname) substring match on productName
     pos (butchery)             substring match on POS
     origin                     substring match on origin
     action                     substring match on action
     expiry                     substring match on expiry
     remarks                    substring match on remarks
     qty / quantity             numeric — supports >N, <N, >=N, <=N, =N
     qtytype / type             "kg" | "pcs"
     images                     "yes" | "no"
   Plain words are matched as substrings across all fields.
   ============================================================ */
function parseSearchQuery(q) {
  const out = { filters: [], terms: [] };
  if (!q || !q.trim()) return out;
  const re = /(\w+):(?:"([^"]*)"|(\S+))|"([^"]*)"|(\S+)/g;
  let m;
  while ((m = re.exec(q)) !== null) {
    if (m[1]) {
      const key = m[1].toLowerCase();
      const val = (m[2] != null ? m[2] : m[3]) || "";
      out.filters.push({ key, val });
    } else if (m[4] != null) {
      out.terms.push(m[4]);
    } else if (m[5] != null) {
      out.terms.push(m[5]);
    }
  }
  return out;
}

const KEY_ALIASES = {
  code: "code", itemcode: "code",
  name: "name", product: "name", productname: "name",
  pos: "pos", butchery: "pos",
  origin: "origin",
  action: "action",
  expiry: "expiry",
  remarks: "remarks",
  qty: "qty", quantity: "qty",
  qtytype: "qtytype", type: "qtytype",
  images: "images",
};

function rowMatchesPower(row, parsed) {
  if (!parsed) return true;
  const { filters, terms } = parsed;
  // Free text terms — all must match somewhere
  for (const t of terms) {
    const needle = t.toLowerCase();
    const hay = [
      row.itemCode, row.productName, row.origin, safeButchery(row),
      String(row.quantity ?? ""),
      (row.qtyType === "أخرى" || row.qtyType === "أخرى / Other") ? (row.customQtyType || "") : (row.qtyType || ""),
      row.expiry, row.remarks, actionText(row),
    ].some((v) => (v ?? "").toString().toLowerCase().includes(needle));
    if (!hay) return false;
  }
  // Structured filters
  for (const { key, val } of filters) {
    const aliased = KEY_ALIASES[key] || key;
    const v = (val || "").toLowerCase();
    if (aliased === "code") {
      if (!String(row.itemCode || "").toLowerCase().includes(v)) return false;
    } else if (aliased === "name") {
      if (!String(row.productName || "").toLowerCase().includes(v)) return false;
    } else if (aliased === "pos") {
      if (!String(safeButchery(row) || "").toLowerCase().includes(v)) return false;
    } else if (aliased === "origin") {
      if (!String(row.origin || "").toLowerCase().includes(v)) return false;
    } else if (aliased === "action") {
      if (!String(actionText(row) || "").toLowerCase().includes(v)) return false;
    } else if (aliased === "expiry") {
      if (!String(row.expiry || "").toLowerCase().includes(v)) return false;
    } else if (aliased === "remarks") {
      const r = String(row.remarks || "").toLowerCase();
      if (v === "empty") { if (r.trim() !== "") return false; }
      else if (v === "nonempty") { if (r.trim() === "") return false; }
      else if (!r.includes(v)) return false;
    } else if (aliased === "qty") {
      const n = Number(row.quantity || 0);
      const m = String(val).match(/^(>=|<=|>|<|=)?(-?\d+(?:\.\d+)?)$/);
      if (!m) return false;
      const op = m[1] || "=";
      const target = Number(m[2]);
      if (op === ">"  && !(n > target)) return false;
      if (op === ">=" && !(n >= target)) return false;
      if (op === "<"  && !(n < target)) return false;
      if (op === "<=" && !(n <= target)) return false;
      if (op === "="  && !(n === target)) return false;
    } else if (aliased === "qtytype") {
      const k = qtyKind(row);
      if (k !== v) return false;
    } else if (aliased === "images") {
      const has = Array.isArray(row.images) && row.images.length > 0;
      if (v === "yes" && !has) return false;
      if (v === "no" && has) return false;
    } else {
      return false; // unknown key
    }
  }
  return true;
}

/* ============================================================
   Local presets (filter snapshots) in localStorage
   ============================================================ */
const PRESETS_KEY = "browseReturns:presets:v1";
function loadPresets() {
  try { return JSON.parse(localStorage.getItem(PRESETS_KEY) || "[]"); }
  catch { return []; }
}
function savePresetsAll(arr) {
  try { localStorage.setItem(PRESETS_KEY, JSON.stringify(arr)); } catch {}
}

/* ============================================================
   Design tokens
   ============================================================ */
const T = {
  bg: "#f8fafc",
  bgAlt: "#f1f5f9",
  card: "#ffffff",
  cardAlt: "#fafafa",
  border: "#e2e8f0",
  borderS: "#f1f5f9",
  text: "#0f172a",
  textM: "#475569",
  textS: "#94a3b8",
  primary: "#4f46e5",
  primaryD: "#4338ca",
  primaryS: "#eef2ff",
  success: "#059669",
  successS: "#ecfdf5",
  danger: "#dc2626",
  dangerS: "#fef2f2",
  warning: "#d97706",
  warningS: "#fffbeb",
  info: "#0891b2",
  infoS: "#ecfeff",
  purple: "#7c3aed",
  purpleS: "#f5f3ff",
};

/* ============================================================
   Shared inline styles
   ============================================================ */
const sx = {
  page: {
    minHeight: "100vh",
    background: T.bg,
    color: T.text,
    fontFamily: "system-ui, -apple-system, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    padding: "20px 24px 40px",
    boxSizing: "border-box",
  },
  card: {
    background: T.card,
    border: `1px solid ${T.border}`,
    borderRadius: 14,
    boxShadow: "0 1px 2px rgba(15, 23, 42, 0.04)",
  },
  cardPad: { padding: 16 },
  h1: { fontSize: 22, fontWeight: 800, color: T.text, margin: 0, letterSpacing: "-0.01em" },
  h2: { fontSize: 16, fontWeight: 700, color: T.text, margin: 0 },
  h3: { fontSize: 13, fontWeight: 700, color: T.textM, margin: 0, textTransform: "uppercase", letterSpacing: "0.04em" },
  muted: { color: T.textM, fontSize: 13 },
  mutedS: { color: T.textS, fontSize: 12 },
  input: {
    border: `1px solid ${T.border}`, borderRadius: 8, padding: "8px 12px",
    fontSize: 14, color: T.text, background: T.card, outline: "none",
    transition: "border-color 0.15s, box-shadow 0.15s",
  },
  btn: {
    display: "inline-flex", alignItems: "center", gap: 6,
    border: `1px solid ${T.border}`, borderRadius: 8,
    background: T.card, color: T.text,
    padding: "8px 12px", fontSize: 13, fontWeight: 600,
    cursor: "pointer", transition: "background 0.15s, border-color 0.15s",
  },
  btnPri: {
    background: T.primary, color: "#fff", borderColor: T.primary,
  },
  btnGhost: {
    background: "transparent", border: "none", color: T.textM,
  },
  pill: {
    display: "inline-flex", alignItems: "center", gap: 6,
    padding: "4px 10px", borderRadius: 999, fontSize: 12, fontWeight: 600,
    background: T.bgAlt, color: T.textM, border: `1px solid ${T.border}`,
  },
  badge: {
    display: "inline-flex", alignItems: "center", gap: 4,
    padding: "2px 8px", borderRadius: 6, fontSize: 11, fontWeight: 700,
  },
  divider: { height: 1, background: T.border, border: "none", margin: "12px 0" },
};

/* ============================================================
   Reusable UI components
   ============================================================ */
function IconBtn({ icon: Icon, onClick, title, active = false, danger = false, disabled = false, children, style = {} }) {
  const bg = danger ? T.dangerS : active ? T.primaryS : T.card;
  const fg = danger ? T.danger : active ? T.primary : T.textM;
  const bd = danger ? "#fecaca" : active ? "#c7d2fe" : T.border;
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      disabled={disabled}
      style={{
        ...sx.btn,
        background: disabled ? T.bgAlt : bg,
        color: disabled ? T.textS : fg,
        borderColor: bd,
        cursor: disabled ? "not-allowed" : "pointer",
        ...style,
      }}
    >
      {Icon ? <Icon size={14} /> : null}
      {children}
    </button>
  );
}

function PrimaryBtn({ icon: Icon, onClick, disabled = false, children, style = {} }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      style={{
        ...sx.btn, ...sx.btnPri,
        opacity: disabled ? 0.5 : 1,
        cursor: disabled ? "not-allowed" : "pointer",
        ...style,
      }}
    >
      {Icon ? <Icon size={14} /> : null}
      {children}
    </button>
  );
}

function StatChip({ icon: Icon, label, value, sub, color = T.primary, bg = T.primaryS }) {
  return (
    <div style={{ ...sx.card, padding: "12px 14px", display: "flex", gap: 12, alignItems: "center", minWidth: 0 }}>
      <div style={{
        width: 38, height: 38, borderRadius: 10,
        background: bg, color, display: "grid", placeItems: "center", flexShrink: 0,
      }}>
        {Icon ? <Icon size={18} /> : null}
      </div>
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: T.textM, textTransform: "uppercase", letterSpacing: "0.04em" }}>{label}</div>
        <div style={{ fontSize: 20, fontWeight: 800, color: T.text, lineHeight: 1.15, marginTop: 2 }}>{value}</div>
        {sub ? <div style={{ ...sx.mutedS, marginTop: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={sub}>{sub}</div> : null}
      </div>
    </div>
  );
}

function FilterPill({ label, value, onRemove }) {
  return (
    <span style={{
      ...sx.pill, background: T.primaryS, color: T.primaryD, borderColor: "#c7d2fe",
    }}>
      <span style={{ fontWeight: 600, color: T.primaryD, opacity: 0.8 }}>{label}:</span>
      <span style={{ fontWeight: 700 }}>{value}</span>
      {onRemove ? (
        <button onClick={onRemove} style={{
          ...sx.btnGhost, padding: 0, marginLeft: 2, color: T.primaryD,
          display: "inline-flex", alignItems: "center", cursor: "pointer",
        }} title="Remove filter">
          <FiX size={12} />
        </button>
      ) : null}
    </span>
  );
}

function Skeleton({ height = 16, width = "100%", radius = 6, style = {} }) {
  return (
    <div style={{
      height, width, borderRadius: radius,
      background: "linear-gradient(90deg, #f1f5f9 0%, #e2e8f0 50%, #f1f5f9 100%)",
      backgroundSize: "200% 100%",
      animation: "shimmer 1.5s infinite",
      ...style,
    }} />
  );
}

function Tabs({ tabs, value, onChange }) {
  return (
    <div style={{
      display: "inline-flex", gap: 4, padding: 4,
      background: T.bgAlt, border: `1px solid ${T.border}`, borderRadius: 10,
    }}>
      {tabs.map((t) => {
        const active = t.value === value;
        return (
          <button
            key={t.value}
            onClick={() => onChange(t.value)}
            style={{
              display: "inline-flex", alignItems: "center", gap: 6,
              padding: "8px 14px", borderRadius: 7, fontSize: 13, fontWeight: 700,
              border: "none", cursor: "pointer",
              background: active ? T.card : "transparent",
              color: active ? T.primary : T.textM,
              boxShadow: active ? "0 1px 2px rgba(15,23,42,.06)" : "none",
              transition: "all .15s",
            }}
          >
            {t.icon ? <t.icon size={14} /> : null}
            {t.label}
            {t.badge != null && (
              <span style={{
                ...sx.badge, background: active ? T.primaryS : T.border,
                color: active ? T.primary : T.textM,
                marginLeft: 4,
              }}>{t.badge}</span>
            )}
          </button>
        );
      })}
    </div>
  );
}

/* Dropdown checkbox multi-select */
function MultiSelect({ label, options = [], selected = [], onChange, placeholder = "All", icon: Icon }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useEffect(() => {
    const onDoc = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);
  const toggle = (val) => {
    const set = new Set(selected);
    if (set.has(val)) set.delete(val); else set.add(val);
    onChange(Array.from(set));
  };
  const display = selected.length === 0 ? placeholder
    : selected.length === 1 ? selected[0]
    : `${selected.length} selected`;
  return (
    <div ref={ref} style={{ position: "relative", minWidth: 160 }}>
      <button
        onClick={() => setOpen((o) => !o)}
        style={{
          ...sx.btn, width: "100%", justifyContent: "space-between",
          background: selected.length ? T.primaryS : T.card,
          borderColor: selected.length ? "#c7d2fe" : T.border,
          color: selected.length ? T.primaryD : T.text,
        }}
      >
        <span style={{ display: "inline-flex", alignItems: "center", gap: 6, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {Icon ? <Icon size={13} /> : null}
          <span style={{ fontWeight: 700 }}>{label}:</span>
          <span style={{ fontWeight: 600, opacity: 0.85 }}>{display}</span>
        </span>
        <FiChevronDown size={14} />
      </button>
      {open && (
        <div style={{
          position: "absolute", top: "calc(100% + 4px)", left: 0,
          width: 280, maxHeight: 320, overflow: "auto", zIndex: 100,
          background: T.card, border: `1px solid ${T.border}`,
          borderRadius: 10, boxShadow: "0 10px 24px rgba(15,23,42,.12)", padding: 8,
        }}>
          <div style={{ display: "flex", gap: 6, marginBottom: 6 }}>
            <button onClick={() => onChange(options)} style={{ ...sx.btn, flex: 1, padding: "6px 8px", fontSize: 12 }}>Select all</button>
            <button onClick={() => onChange([])} style={{ ...sx.btn, flex: 1, padding: "6px 8px", fontSize: 12, color: T.danger, borderColor: "#fecaca" }}>Clear</button>
          </div>
          {options.length === 0 ? (
            <div style={{ ...sx.muted, padding: 10, textAlign: "center" }}>No options.</div>
          ) : options.map((opt, i) => {
            const checked = selected.includes(opt);
            return (
              <label key={i} style={{
                display: "flex", alignItems: "center", gap: 8,
                padding: "6px 8px", borderRadius: 6, cursor: "pointer",
                background: checked ? T.primaryS : "transparent",
              }}>
                <input type="checkbox" checked={checked} onChange={() => toggle(opt)} style={{ accentColor: T.primary }} />
                <span style={{ fontSize: 13, color: T.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={opt}>{opt || "—"}</span>
              </label>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* Inline SVG sparkline */
function Sparkline({ data = [], width = 280, height = 70, color = T.primary, fill = T.primaryS, showDots = true }) {
  if (!data.length) return <div style={{ ...sx.mutedS, textAlign: "center", padding: 20 }}>No data.</div>;
  const max = Math.max(...data.map((d) => d.value), 1);
  const min = 0;
  const padX = 8, padY = 8;
  const W = width - padX * 2, H = height - padY * 2;
  const stepX = data.length > 1 ? W / (data.length - 1) : 0;
  const points = data.map((d, i) => {
    const x = padX + i * stepX;
    const y = padY + H - ((d.value - min) / (max - min || 1)) * H;
    return [x, y];
  });
  const path = points.map(([x, y], i) => (i === 0 ? `M${x},${y}` : `L${x},${y}`)).join(" ");
  const areaPath = `${path} L${points[points.length - 1][0]},${padY + H} L${padX},${padY + H} Z`;
  return (
    <svg width={width} height={height} style={{ display: "block" }}>
      <path d={areaPath} fill={fill} />
      <path d={path} fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
      {showDots && points.map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r={2.5} fill={color}>
          <title>{`${data[i].label}: ${data[i].value}`}</title>
        </circle>
      ))}
    </svg>
  );
}

/* Horizontal bar list */
function HBarList({ items = [], color = T.primary, bg = T.primaryS, formatValue, max }) {
  if (!items.length) return <div style={{ ...sx.muted, textAlign: "center", padding: 16 }}>No data.</div>;
  const m = max != null ? max : Math.max(...items.map((it) => it.value), 1);
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {items.map((it, i) => {
        const pct = (it.value / m) * 100;
        return (
          <div key={i}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4, gap: 8 }}>
              <span style={{ fontSize: 13, color: T.text, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={it.label}>{it.label}</span>
              <span style={{ fontSize: 12, color: T.textM, fontWeight: 700, flexShrink: 0 }}>
                {formatValue ? formatValue(it.value) : it.value}
              </span>
            </div>
            <div style={{ height: 8, background: T.bgAlt, borderRadius: 4, overflow: "hidden" }}>
              <div style={{ width: `${pct}%`, height: "100%", background: color, borderRadius: 4, transition: "width .25s" }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* Compact donut for action share */
function MiniDonut({ percent = 0, label = "", color = T.primary, size = 80, count }) {
  const stroke = 10;
  const r = (size - stroke) / 2;
  const C = 2 * Math.PI * r;
  const dash = Math.max(0, Math.min(100, percent));
  const offset = C * (1 - dash / 100);
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
      <svg width={size} height={size} style={{ flexShrink: 0 }}>
        <circle cx={size / 2} cy={size / 2} r={r} stroke={T.bgAlt} strokeWidth={stroke} fill="none" />
        <circle cx={size / 2} cy={size / 2} r={r} stroke={color} strokeWidth={stroke} fill="none"
          strokeDasharray={`${C} ${C}`} strokeDashoffset={offset} strokeLinecap="round"
          transform={`rotate(-90 ${size / 2} ${size / 2})`} />
        <text x="50%" y="50%" dominantBaseline="middle" textAnchor="middle"
          style={{ fontSize: 14, fontWeight: 800, fill: T.text }}>{Math.round(percent)}%</text>
      </svg>
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: T.text }}>{label}</div>
        {count != null && <div style={sx.mutedS}>{count}</div>}
      </div>
    </div>
  );
}

/* ============================================================
   Pareto chart — vertical bars + cumulative %
   ============================================================ */
function ParetoChart({ items = [], color = T.primary, formatLabel = (s) => s, topN = 12 }) {
  if (!items || items.length === 0) {
    return <div style={{ ...sx.muted, textAlign: "center", padding: 30 }}>No data.</div>;
  }
  const sorted = [...items].sort((a, b) => b.value - a.value).slice(0, topN);
  const total = items.reduce((a, b) => a + b.value, 0) || 1;
  const max = sorted[0]?.value || 1;
  let cum = 0;
  const data = sorted.map((it) => {
    cum += it.value;
    return { ...it, percent: (it.value / total) * 100, cumulative: (cum / total) * 100 };
  });
  const at80 = data.findIndex((d) => d.cumulative >= 80);
  const at80Count = at80 < 0 ? data.length : at80 + 1;

  const W = Math.max(560, data.length * 56), H = 280;
  const padL = 36, padR = 36, padT = 16, padB = 80;
  const innerW = W - padL - padR, innerH = H - padT - padB;
  const stepX = innerW / data.length;
  const barW = Math.min(stepX * 0.7, 36);

  const linePoints = data.map((d, i) => [
    padL + i * stepX + stepX / 2,
    padT + innerH - (d.cumulative / 100) * innerH,
  ]);
  const linePath = linePoints.map(([x, y], i) => (i === 0 ? "M" : "L") + x + "," + y).join(" ");

  const eightyY = padT + innerH - (80 / 100) * innerH;

  return (
    <div style={{ overflowX: "auto" }}>
      <svg width={W} height={H} style={{ display: "block" }}>
        {/* Y-axis grid lines */}
        {[0, 25, 50, 75, 100].map((p) => {
          const y = padT + innerH - (p / 100) * innerH;
          return (
            <g key={p}>
              <line x1={padL} x2={padL + innerW} y1={y} y2={y} stroke={T.border} strokeWidth={0.5} />
              <text x={padL - 6} y={y + 3} textAnchor="end" style={{ fontSize: 10, fill: T.textS }}>{p}%</text>
            </g>
          );
        })}
        {/* 80% reference */}
        <line x1={padL} x2={padL + innerW} y1={eightyY} y2={eightyY} stroke={T.warning} strokeWidth={1.2} strokeDasharray="4 4" />
        <text x={padL + innerW + 4} y={eightyY + 3} style={{ fontSize: 10, fill: T.warning, fontWeight: 700 }}>80%</text>

        {/* Bars */}
        {data.map((d, i) => {
          const x = padL + i * stepX + (stepX - barW) / 2;
          const h = (d.value / max) * innerH * 0.95;
          const y = padT + innerH - h;
          const inEighty = i < at80Count;
          const fill = inEighty ? color : T.textS;
          return (
            <g key={i}>
              <rect x={x} y={y} width={barW} height={h} fill={fill} rx={3} opacity={0.85}>
                <title>{`${d.label}: ${d.value} (${Math.round(d.percent)}%, cum ${Math.round(d.cumulative)}%)`}</title>
              </rect>
              <text x={x + barW / 2} y={y - 4} textAnchor="middle" style={{ fontSize: 10, fill: T.textM, fontWeight: 700 }}>
                {d.value}
              </text>
              <text x={x + barW / 2} y={padT + innerH + 12} textAnchor="middle" transform={`rotate(-30 ${x + barW / 2} ${padT + innerH + 12})`} style={{ fontSize: 10, fill: T.textM }}>
                {formatLabel(d.label).slice(0, 14)}
              </text>
            </g>
          );
        })}

        {/* Cumulative line */}
        <path d={linePath} fill="none" stroke={T.danger} strokeWidth={2} />
        {linePoints.map(([x, y], i) => (
          <circle key={i} cx={x} cy={y} r={3.5} fill="#fff" stroke={T.danger} strokeWidth={2}>
            <title>{`cum ${Math.round(data[i].cumulative)}%`}</title>
          </circle>
        ))}
      </svg>
      <div style={{ ...sx.mutedS, marginTop: 4, textAlign: "center" }}>
        Top <strong style={{ color: T.text }}>{at80Count}</strong> of {items.length} = <strong style={{ color: T.danger }}>{Math.round(data[at80Count - 1]?.cumulative || 100)}%</strong> of returns
      </div>
    </div>
  );
}

/* ============================================================
   Day-of-week bars
   ============================================================ */
function DayOfWeekBars({ daily }) {
  if (!daily || daily.length === 0) {
    return <div style={{ ...sx.muted, textAlign: "center", padding: 20 }}>No data.</div>;
  }
  const sums = [0, 0, 0, 0, 0, 0, 0];
  const counts = [0, 0, 0, 0, 0, 0, 0];
  for (const d of daily) {
    const [y, m, dd] = d.date.split("-").map(Number);
    const dt = new Date(y, m - 1, dd);
    const dow = dt.getDay();
    sums[dow] += d.items;
    counts[dow] += 1;
  }
  const avgs = sums.map((s, i) => counts[i] ? s / counts[i] : 0);
  const max = Math.max(...avgs, 1);
  const labels = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const peak = avgs.indexOf(Math.max(...avgs));

  return (
    <div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 6, alignItems: "end", height: 130 }}>
        {avgs.map((v, i) => {
          const h = max > 0 ? (v / max) * 100 : 0;
          const isPeak = i === peak && v > 0;
          return (
            <div key={i} style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "flex-end", height: "100%", gap: 4 }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: isPeak ? T.danger : T.textM }} title={`${counts[i]} day(s)`}>
                {v ? v.toFixed(1) : "—"}
              </div>
              <div style={{
                width: "70%", height: `${h}%`, minHeight: v > 0 ? 4 : 0,
                background: isPeak ? T.danger : T.primary,
                borderRadius: "4px 4px 0 0",
                opacity: v > 0 ? 0.85 : 0.2,
              }} title={`${labels[i]}: avg ${v.toFixed(1)} items (${counts[i]} day${counts[i] !== 1 ? "s" : ""})`} />
            </div>
          );
        })}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 6, marginTop: 6 }}>
        {labels.map((l, i) => (
          <div key={i} style={{ textAlign: "center", fontSize: 11, fontWeight: 700, color: i === peak && avgs[i] > 0 ? T.danger : T.textM }}>{l}</div>
        ))}
      </div>
      {peak >= 0 && avgs[peak] > 0 && (
        <div style={{ ...sx.mutedS, marginTop: 8, textAlign: "center" }}>
          Peak: <strong style={{ color: T.danger }}>{labels[peak]}</strong> with avg <strong>{avgs[peak].toFixed(1)}</strong> items/day
        </div>
      )}
    </div>
  );
}

/* ============================================================
   Calendar heatmap (GitHub-style)
   ============================================================ */
function CalendarHeatmap({ daily, mode = "items", onPickDay, anomalies = new Set(), selectedDate }) {
  if (!daily || daily.length === 0) {
    return <div style={{ ...sx.muted, textAlign: "center", padding: 30 }}>No data in range.</div>;
  }
  const map = new Map(daily.map((d) => [d.date, d]));
  const sortedDates = daily.map((d) => d.date).sort();
  const startStr = sortedDates[0];
  const endStr = sortedDates[sortedDates.length - 1];

  const parseDate = (s) => {
    const [y, m, d] = s.split("-").map(Number);
    return new Date(y, m - 1, d);
  };
  const fmt = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

  const start = parseDate(startStr);
  const end = parseDate(endStr);
  start.setDate(start.getDate() - start.getDay());
  end.setDate(end.getDate() + (6 - end.getDay()));

  const weeks = [];
  const cur = new Date(start);
  while (cur <= end) {
    const week = [];
    for (let i = 0; i < 7; i++) {
      week.push(new Date(cur));
      cur.setDate(cur.getDate() + 1);
    }
    weeks.push(week);
  }

  const values = daily.map((d) => mode === "items" ? d.items : d.condCount);
  const max = Math.max(...values, 1);

  const palettes = {
    items: ["#f1f5f9", "#dbeafe", "#93c5fd", "#3b82f6", "#1d4ed8"],
    condemn: ["#f1f5f9", "#fee2e2", "#fca5a5", "#ef4444", "#991b1b"],
  };
  const pal = palettes[mode] || palettes.items;
  const colorFor = (v) => {
    if (v == null) return "#f8fafc";
    if (v === 0) return pal[0];
    const r = v / max;
    if (r < 0.25) return pal[1];
    if (r < 0.5) return pal[2];
    if (r < 0.75) return pal[3];
    return pal[4];
  };

  const cellSize = 14, gap = 3, leftLabelW = 28, topLabelH = 22;
  const widthSvg = leftLabelW + weeks.length * (cellSize + gap);
  const heightSvg = topLabelH + 7 * (cellSize + gap);

  const monthLabels = [];
  let lastMonth = -1;
  weeks.forEach((week, wi) => {
    const m = week[0].getMonth();
    if (m !== lastMonth) {
      monthLabels.push({ x: leftLabelW + wi * (cellSize + gap), label: week[0].toLocaleString("en", { month: "short" }), y: week[0].getFullYear() });
      lastMonth = m;
    }
  });

  const dayLabels = ["", "Mon", "", "Wed", "", "Fri", ""];

  return (
    <div style={{ overflowX: "auto" }}>
      <svg width={widthSvg} height={heightSvg} style={{ display: "block" }}>
        {monthLabels.map((m, i) => (
          <text key={i} x={m.x} y={14} style={{ fontSize: 11, fill: T.textM, fontWeight: 600 }}>{m.label}</text>
        ))}
        {dayLabels.map((d, i) => d && (
          <text key={i} x={0} y={topLabelH + i * (cellSize + gap) + cellSize - 2} style={{ fontSize: 10, fill: T.textS }}>{d}</text>
        ))}
        {weeks.map((week, wi) =>
          week.map((dt, di) => {
            const ds = fmt(dt);
            const data = map.get(ds);
            const inRange = ds >= startStr && ds <= endStr;
            const v = data ? (mode === "items" ? data.items : data.condCount) : null;
            const x = leftLabelW + wi * (cellSize + gap);
            const y = topLabelH + di * (cellSize + gap);
            const isAnom = anomalies.has(ds);
            const isSel = selectedDate === ds;
            return (
              <g key={`${wi}-${di}`}>
                <rect
                  x={x} y={y} width={cellSize} height={cellSize} rx={3}
                  fill={inRange ? colorFor(v) : "#fafafa"}
                  stroke={isSel ? T.primary : isAnom ? T.danger : "transparent"}
                  strokeWidth={isSel || isAnom ? 2 : 0}
                  style={{ cursor: data ? "pointer" : "default" }}
                  onClick={() => data && onPickDay && onPickDay(ds)}
                >
                  <title>
                    {ds}{data ? `\n${data.items} items · ${data.condCount} cond · ${data.kg} kg${isAnom ? "\n⚠ anomaly" : ""}` : "\nNo report"}
                  </title>
                </rect>
              </g>
            );
          })
        )}
      </svg>
      {/* Legend */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 10, fontSize: 11, color: T.textM }}>
        <span>Less</span>
        {pal.map((c, i) => <span key={i} style={{ width: 12, height: 12, borderRadius: 3, background: c, border: `1px solid ${T.border}` }} />)}
        <span>More</span>
        <span style={{ marginLeft: 16, display: "inline-flex", alignItems: "center", gap: 4 }}>
          <span style={{ width: 12, height: 12, borderRadius: 3, background: T.card, border: `2px solid ${T.danger}` }} />
          Anomaly
        </span>
      </div>
    </div>
  );
}

/* ============================================================
   Audit trail modal
   ============================================================ */
function AuditTrailModalInner({ open, onClose, item, trail }) {
  if (!open || !item) return null;
  const all = trail || [];
  return (
    <ModalShell open={open} onClose={onClose} title="Audit trail" width={620}>
      <div style={{ marginBottom: 14, padding: "10px 12px", background: T.cardAlt, borderRadius: 8, border: `1px solid ${T.border}` }}>
        <div style={{ fontWeight: 700, fontSize: 14, color: T.text }}>{item.productName || "—"}</div>
        <div style={{ ...sx.mutedS, marginTop: 4 }}>
          {[item.itemCode, item.origin, safeButchery(item), item.expiry ? `Exp: ${item.expiry}` : null].filter(Boolean).join(" · ") || "—"}
        </div>
      </div>
      {all.length === 0 ? (
        <div style={{ ...sx.muted, padding: 30, textAlign: "center" }}>
          <FiClock size={24} style={{ opacity: 0.3 }} />
          <div style={{ marginTop: 8 }}>No changes recorded for this item.</div>
        </div>
      ) : (
        <div style={{ position: "relative", paddingLeft: 22 }}>
          <div style={{ position: "absolute", left: 8, top: 8, bottom: 8, width: 2, background: T.border }} />
          {all.map((ch, i) => (
            <div key={i} style={{ position: "relative", marginBottom: 12, paddingLeft: 16 }}>
              <div style={{
                position: "absolute", left: -2, top: 6, width: 12, height: 12, borderRadius: 999,
                background: i === all.length - 1 ? T.primary : T.card,
                border: `2px solid ${T.primary}`,
              }} />
              <div style={{
                background: T.card, border: `1px solid ${T.border}`, borderRadius: 8, padding: "10px 12px",
              }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6, gap: 8, flexWrap: "wrap" }}>
                  <span style={{ ...sx.pill, background: T.primaryS, color: T.primaryD, borderColor: "#c7d2fe" }}>
                    <FiCalendar size={11} /> {ch.date}
                  </span>
                  <span style={sx.mutedS}>{formatChangeDate(ch)}</span>
                </div>
                <div style={{ fontSize: 13, lineHeight: 1.5 }}>
                  <span style={{ color: T.textM, textDecoration: "line-through" }}>{ch.from || "(empty)"}</span>
                  <span style={{ margin: "0 8px", color: T.primary, fontWeight: 700 }}>→</span>
                  <span style={{ fontWeight: 700, color: T.text }}>{ch.to || "(empty)"}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </ModalShell>
  );
}

/* ============================================================
   Product Insights modal — full 360° view of a single product
   ============================================================ */
function ProductInsightsModalInner({ open, onClose, returnsData, changeMapByDate, auditTrailByKey, initialCode, initialName }) {
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState(null);
  const [pFrom, setPFrom] = useState("");
  const [pTo, setPTo] = useState("");
  const inputRef = useRef(null);

  useEffect(() => {
    if (open) {
      if (initialName) {
        setSelected({ code: initialCode || "", name: initialName });
        setQuery("");
      } else {
        setSelected(null);
        setQuery("");
        setTimeout(() => inputRef.current?.focus(), 100);
      }
      setPFrom(""); setPTo("");
    }
  }, [open, initialCode, initialName]);

  // Reset date range when changing product
  useEffect(() => { setPFrom(""); setPTo(""); }, [selected?.code, selected?.name]);

  function setQuickRange(days) {
    const today = new Date();
    const to = today.toISOString().slice(0, 10);
    const fromD = new Date(today.getTime() - (days - 1) * 24 * 60 * 60 * 1000);
    setPFrom(fromD.toISOString().slice(0, 10));
    setPTo(to);
  }
  function clearRange() { setPFrom(""); setPTo(""); }
  const isRangeActive = !!(pFrom || pTo);

  const productList = useMemo(() => {
    if (!open) return [];
    const map = new Map();
    for (const rep of returnsData) {
      for (const it of (rep.items || [])) {
        const code = (it.itemCode || "").trim();
        const name = (it.productName || "").trim();
        if (!code && !name) continue;
        const key = `${code.toLowerCase()}||${name.toLowerCase()}`;
        if (!map.has(key)) map.set(key, { code, name, count: 0, dates: new Set() });
        const e = map.get(key);
        e.count += 1;
        e.dates.add(rep.reportDate);
      }
    }
    return Array.from(map.values()).sort((a, b) => b.count - a.count);
  }, [returnsData, open]);

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q || selected) return [];
    return productList.filter((p) =>
      p.code.toLowerCase().includes(q) || p.name.toLowerCase().includes(q)
    ).slice(0, 12);
  }, [query, productList, selected]);

  const insights = useMemo(() => {
    if (!selected || !open) return null;
    const codeN = (selected.code || "").trim().toLowerCase();
    const nameN = (selected.name || "").trim().toLowerCase();
    const occurrences = [];
    let returnsCount = 0, totalKg = 0, totalPcs = 0;
    let condCount = 0, condKg = 0;
    let useProd = 0, market = 0, marketKg = 0, disposed = 0, disposedKg = 0, sepExp = 0;
    const posMap = {}, originMap = {}, actionMap = {}, expiryMap = {};
    const dailyMap = new Map();
    const dailyKgMap = new Map();
    let totalAcrossAllTime = 0;
    for (const rep of returnsData) {
      const date = rep.reportDate;
      const inner = changeMapByDate.get(date) || new Map();
      const inRange = (!pFrom || date >= pFrom) && (!pTo || date <= pTo);
      for (const it of (rep.items || [])) {
        const c = (it.itemCode || "").trim().toLowerCase();
        const n = (it.productName || "").trim().toLowerCase();
        if (c !== codeN || n !== nameN) continue;
        totalAcrossAllTime += 1;
        if (!inRange) continue;
        returnsCount += 1;
        const q = Number(it.quantity || 0);
        if (isKgType(it.qtyType)) totalKg += q;
        else if (isPcsType(it.qtyType)) totalPcs += q;
        const ch = inner.get(itemKey(it));
        const act = ch?.to ?? actionText(it);
        if (act) actionMap[act] = (actionMap[act] || 0) + 1;
        if (isCondemnation(act)) {
          condCount += 1;
          if (isKgType(it.qtyType)) condKg += q;
        }
        if ((act || "").toLowerCase() === "use in production") useProd += 1;
        if ((act || "").toLowerCase() === "separated expired shelf") sepExp += 1;
        if (isSendToMarket(act)) {
          market += 1;
          if (isKgType(it.qtyType)) marketKg += q;
        }
        if (isDisposed(act)) {
          disposed += 1;
          if (isKgType(it.qtyType)) disposedKg += q;
        }
        const pos = safeButchery(it) || "—";
        const origin = it.origin || "—";
        posMap[pos] = (posMap[pos] || 0) + 1;
        originMap[origin] = (originMap[origin] || 0) + 1;
        if (it.expiry) expiryMap[it.expiry] = (expiryMap[it.expiry] || 0) + 1;
        dailyMap.set(date, (dailyMap.get(date) || 0) + 1);
        if (isKgType(it.qtyType)) dailyKgMap.set(date, (dailyKgMap.get(date) || 0) + q);
        occurrences.push({ ...it, date, currentAction: act, hasChange: !!ch && ch.to === actionText(it) });
      }
    }
    const audit = [];
    for (const [k, arr] of (auditTrailByKey || new Map()).entries()) {
      const parts = k.split("|");
      if ((parts[0] || "") === codeN && (parts[1] || "") === nameN) {
        for (const x of arr) {
          if ((!pFrom || x.date >= pFrom) && (!pTo || x.date <= pTo)) {
            audit.push({ ...x, fullKey: k });
          }
        }
      }
    }
    audit.sort((a, b) => (a.ts || 0) - (b.ts || 0));
    const dates = Array.from(dailyMap.keys()).sort();
    return {
      returnsCount,
      totalAcrossAllTime,
      totalKg: Math.round(totalKg * 100) / 100,
      totalPcs,
      condCount,
      condKg: Math.round(condKg * 100) / 100,
      useProd, sepExp,
      market, marketKg: Math.round(marketKg * 100) / 100,
      disposed, disposedKg: Math.round(disposedKg * 100) / 100,
      posTop: Object.entries(posMap).sort((a, b) => b[1] - a[1]).map(([label, value]) => ({ label, value })),
      originTop: Object.entries(originMap).sort((a, b) => b[1] - a[1]).map(([label, value]) => ({ label, value })),
      actionTop: Object.entries(actionMap).sort((a, b) => b[1] - a[1]).map(([label, value]) => ({ label, value })),
      expiryTop: Object.entries(expiryMap).sort((a, b) => b[1] - a[1]).slice(0, 6).map(([label, value]) => ({ label, value })),
      daily: dates.map((d) => ({ label: d, value: dailyMap.get(d) })),
      dailyKg: dates.map((d) => ({ label: d, value: Math.round((dailyKgMap.get(d) || 0) * 100) / 100 })),
      occurrences: occurrences.sort((a, b) => (b.date || "").localeCompare(a.date || "")),
      audit,
      firstSeen: dates[0],
      lastSeen: dates[dates.length - 1],
      uniqueDates: dates.length,
    };
  }, [selected, returnsData, changeMapByDate, auditTrailByKey, open, pFrom, pTo]);

  function exportProductCSV() {
    if (!insights || !selected) return;
    const head = ["DATE", "ITEM CODE", "PRODUCT", "ORIGIN", "POS", "QUANTITY", "QTY TYPE", "EXPIRY", "REMARKS", "CURRENT ACTION"];
    const rows = insights.occurrences.map((r) => [
      r.date, r.itemCode || "", r.productName || "", r.origin || "", safeButchery(r) || "",
      r.quantity ?? "", (r.qtyType === "أخرى" || r.qtyType === "أخرى / Other") ? (r.customQtyType || "") : (r.qtyType || ""),
      r.expiry || "", r.remarks || "", r.currentAction || "",
    ]);
    const csv = "﻿" + [head, ...rows].map((row) => row.map((v) => {
      const s = v == null ? "" : String(v);
      return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    }).join(",")).join("\r\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `product_${(selected.code || selected.name).slice(0, 30).replace(/[^a-z0-9]+/gi, "_")}.csv`;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  if (!open) return null;
  return (
    <ModalShell open={open} onClose={onClose} title="Product Insights" width={1200}>
      {/* Search */}
      <div style={{ position: "relative", marginBottom: 16 }}>
        <FiSearch size={14} color={T.textS} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)" }} />
        <input
          ref={inputRef}
          type="text"
          value={selected ? `${selected.code ? selected.code + " · " : ""}${selected.name}` : query}
          onChange={(e) => { setQuery(e.target.value); setSelected(null); }}
          placeholder="Search by item code or product name…"
          style={{ ...sx.input, paddingLeft: 36, paddingRight: 80, width: "100%", fontSize: 14 }}
          readOnly={!!selected}
        />
        {selected && (
          <button onClick={() => { setSelected(null); setQuery(""); setTimeout(() => inputRef.current?.focus(), 50); }} style={{
            position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)",
            ...sx.btn, padding: "6px 10px", fontSize: 12,
          }}>Change</button>
        )}
        {matches.length > 0 && (
          <div style={{
            position: "absolute", top: "calc(100% + 4px)", left: 0, right: 0, zIndex: 50,
            ...sx.card, padding: 6, maxHeight: 320, overflow: "auto",
            boxShadow: "0 12px 28px rgba(15,23,42,.18)",
          }}>
            {matches.map((m, i) => (
              <button key={i} onClick={() => { setSelected({ code: m.code, name: m.name }); setQuery(""); }} style={{
                width: "100%", textAlign: "left", padding: "8px 10px", borderRadius: 6,
                background: "transparent", border: "none", cursor: "pointer",
                display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8,
              }} onMouseOver={(e) => e.currentTarget.style.background = T.bgAlt}
                 onMouseOut={(e) => e.currentTarget.style.background = "transparent"}>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontWeight: 700, fontSize: 13, color: T.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {m.name || "—"}
                  </div>
                  <div style={{ ...sx.mutedS, marginTop: 2 }}>
                    {m.code ? <code style={{ fontFamily: "ui-monospace, monospace", color: T.primary }}>{m.code}</code> : <span style={{ color: T.textS }}>no code</span>}
                  </div>
                </div>
                <span style={{ ...sx.pill, background: T.primaryS, color: T.primaryD, borderColor: "#c7d2fe", fontSize: 11, flexShrink: 0 }}>
                  {m.count} occurrence{m.count !== 1 ? "s" : ""}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>

      {!selected ? (
        <div style={{ textAlign: "center", padding: 60, color: T.textM }}>
          <FiPackage size={36} style={{ opacity: 0.25 }} />
          <div style={{ marginTop: 12, fontWeight: 700, color: T.text }}>Search a product</div>
          <div style={{ ...sx.mutedS, marginTop: 4 }}>
            Type item code or product name to see full insights.
          </div>
          {productList.length > 0 && (
            <div style={{ marginTop: 20 }}>
              <div style={{ ...sx.h3, marginBottom: 8 }}>Most frequent products</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 4, maxWidth: 520, margin: "0 auto" }}>
                {productList.slice(0, 6).map((p, i) => (
                  <button key={i} onClick={() => setSelected({ code: p.code, name: p.name })} style={{
                    ...sx.btn, justifyContent: "space-between", padding: "8px 12px", textAlign: "left",
                  }}>
                    <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 360 }}>{p.name || p.code || "—"}</span>
                    <span style={{ ...sx.mutedS, fontWeight: 700 }}>{p.count}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : !insights || (insights.returnsCount === 0 && insights.totalAcrossAllTime === 0) ? (
        <div style={{ textAlign: "center", padding: 50, color: T.textM }}>
          <FiAlertTriangle size={28} style={{ opacity: 0.4 }} />
          <div style={{ marginTop: 10, fontWeight: 600 }}>No data found for this product.</div>
        </div>
      ) : insights.returnsCount === 0 ? (
        <div style={{ textAlign: "center", padding: 50, color: T.textM }}>
          <FiCalendar size={28} style={{ opacity: 0.4 }} />
          <div style={{ marginTop: 10, fontWeight: 700, color: T.text }}>No occurrences in this date range.</div>
          <div style={{ ...sx.mutedS, marginTop: 4 }}>
            This product has {insights.totalAcrossAllTime} occurrence{insights.totalAcrossAllTime !== 1 ? "s" : ""} outside the selected range.
          </div>
          <button onClick={clearRange} style={{
            ...sx.btn, marginTop: 14, padding: "8px 14px",
            background: T.primary, color: "#fff", borderColor: T.primary, fontWeight: 700,
          }}><FiX size={13} /> Clear date range</button>
        </div>
      ) : (
        <div>
          {/* Product header */}
          <div style={{
            ...sx.card, padding: "14px 16px", marginBottom: 12, background: T.cardAlt,
            borderColor: T.primary, borderWidth: 1, borderLeft: `4px solid ${T.primary}`,
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, flexWrap: "wrap" }}>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 18, fontWeight: 800, color: T.text }}>{selected.name || "—"}</div>
                <div style={{ display: "flex", gap: 8, marginTop: 6, flexWrap: "wrap" }}>
                  {selected.code && (
                    <span style={{ ...sx.pill, background: T.primaryS, color: T.primary, borderColor: "#c7d2fe" }}>
                      <code style={{ fontFamily: "ui-monospace, monospace" }}>{selected.code}</code>
                    </span>
                  )}
                  <span style={{ ...sx.pill }}>
                    {isRangeActive ? "First (range): " : "First: "}{insights.firstSeen || "—"}
                  </span>
                  <span style={{ ...sx.pill }}>
                    {isRangeActive ? "Last (range): " : "Last: "}{insights.lastSeen || "—"}
                  </span>
                  <span style={{ ...sx.pill }}>
                    {insights.uniqueDates} day{insights.uniqueDates !== 1 ? "s" : ""}
                  </span>
                  {isRangeActive && (
                    <span style={{ ...sx.pill, background: T.warningS, color: T.warning, borderColor: "#fde68a" }}>
                      <FiCalendar size={11} /> {insights.returnsCount} of {insights.totalAcrossAllTime} in range
                    </span>
                  )}
                </div>
              </div>
              <button onClick={exportProductCSV} style={{
                ...sx.btn, padding: "8px 12px", fontSize: 13,
              }}><FiDownload size={13} /> Export CSV</button>
            </div>
          </div>

          {/* ✅ Date range filter for this product */}
          <div style={{
            ...sx.card, padding: "10px 14px", marginBottom: 14,
            display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap",
            background: isRangeActive ? T.primaryS : T.card,
            borderColor: isRangeActive ? "#c7d2fe" : T.border,
          }}>
            <div style={{ display: "inline-flex", alignItems: "center", gap: 6, color: T.textM, fontWeight: 700, fontSize: 13 }}>
              <FiCalendar size={14} /> Date range:
            </div>
            <input
              type="date" value={pFrom} onChange={(e) => setPFrom(e.target.value)}
              style={{ ...sx.input, padding: "6px 10px", fontSize: 13 }}
            />
            <span style={{ color: T.textS }}>→</span>
            <input
              type="date" value={pTo} onChange={(e) => setPTo(e.target.value)}
              style={{ ...sx.input, padding: "6px 10px", fontSize: 13 }}
            />
            <button onClick={() => setQuickRange(7)} style={{ ...sx.btn, padding: "6px 10px", fontSize: 12 }}>7d</button>
            <button onClick={() => setQuickRange(30)} style={{ ...sx.btn, padding: "6px 10px", fontSize: 12 }}>30d</button>
            <button onClick={() => setQuickRange(90)} style={{ ...sx.btn, padding: "6px 10px", fontSize: 12 }}>90d</button>
            <button onClick={() => setQuickRange(365)} style={{ ...sx.btn, padding: "6px 10px", fontSize: 12 }}>1y</button>
            {isRangeActive && (
              <button onClick={clearRange} style={{
                ...sx.btn, padding: "6px 10px", fontSize: 12,
                background: T.dangerS, color: T.danger, borderColor: "#fecaca",
              }}><FiX size={12} /> Clear</button>
            )}
            {isRangeActive && (
              <span style={{ ...sx.mutedS, marginLeft: "auto", fontWeight: 700 }}>
                Filtering all stats, charts, audit trail & occurrences
              </span>
            )}
          </div>

          {/* Stat strip */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 10, marginBottom: 14 }}>
            <StatChip icon={FiPackage} label="Total returns" value={insights.returnsCount}
              sub={`${insights.totalKg} kg · ${insights.totalPcs} pcs`} />
            <StatChip icon={FiAlertTriangle} label="Condemned" value={insights.condCount}
              sub={`${insights.condKg} kg`} color={T.danger} bg={T.dangerS} />
            <StatChip icon={FiZap} label="Use in prod" value={insights.useProd}
              sub={`${insights.sepExp} sep. expired`} color={T.purple} bg={T.purpleS} />
            <StatChip icon={FiTrendingUp} label="Send to market" value={insights.market}
              sub={`${insights.marketKg} kg`} color={T.success} bg={T.successS} />
            <StatChip icon={FiTrash2} label="Disposed" value={insights.disposed}
              sub={`${insights.disposedKg} kg`} color={T.warning} bg={T.warningS} />
          </div>

          {/* Charts row 1 */}
          <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 2fr) minmax(0, 1fr)", gap: 12, marginBottom: 12 }}>
            <div style={{ ...sx.card, padding: 14 }}>
              <div style={{ ...sx.h3, marginBottom: 10 }}>Returns over time</div>
              {insights.daily.length > 0 ? (
                <div style={{ overflowX: "auto" }}>
                  <Sparkline data={insights.daily} width={Math.max(500, insights.daily.length * 22)} height={120} color={T.primary} fill={T.primaryS} />
                </div>
              ) : <div style={{ ...sx.muted, textAlign: "center", padding: 20 }}>No data.</div>}
            </div>
            <div style={{ ...sx.card, padding: 14 }}>
              <div style={{ ...sx.h3, marginBottom: 10 }}>By POS</div>
              <HBarList items={insights.posTop.slice(0, 6)} color={T.primary} />
            </div>
          </div>

          {/* Charts row 2 */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginBottom: 12 }}>
            <div style={{ ...sx.card, padding: 14 }}>
              <div style={{ ...sx.h3, marginBottom: 10 }}>By Origin</div>
              <HBarList items={insights.originTop.slice(0, 6)} color={T.success} />
            </div>
            <div style={{ ...sx.card, padding: 14 }}>
              <div style={{ ...sx.h3, marginBottom: 10 }}>By Action (latest)</div>
              <HBarList items={insights.actionTop.slice(0, 6)} color={T.danger} />
            </div>
            <div style={{ ...sx.card, padding: 14 }}>
              <div style={{ ...sx.h3, marginBottom: 10 }}>Top Expiry dates</div>
              {insights.expiryTop.length > 0 ? (
                <HBarList items={insights.expiryTop} color={T.warning} />
              ) : <div style={{ ...sx.muted, textAlign: "center", padding: 16 }}>No data.</div>}
            </div>
          </div>

          {/* Audit trail */}
          {insights.audit.length > 0 && (
            <div style={{ ...sx.card, padding: 14, marginBottom: 12 }}>
              <div style={{ ...sx.h3, marginBottom: 10, display: "flex", alignItems: "center", gap: 6 }}>
                <FiClock size={13} /> Audit trail · {insights.audit.length} change{insights.audit.length !== 1 ? "s" : ""}
              </div>
              <div style={{ position: "relative", paddingLeft: 22, maxHeight: 260, overflow: "auto" }}>
                <div style={{ position: "absolute", left: 8, top: 8, bottom: 8, width: 2, background: T.border }} />
                {insights.audit.map((ch, i) => (
                  <div key={i} style={{ position: "relative", marginBottom: 10, paddingLeft: 16 }}>
                    <div style={{
                      position: "absolute", left: -2, top: 6, width: 12, height: 12, borderRadius: 999,
                      background: i === insights.audit.length - 1 ? T.primary : T.card,
                      border: `2px solid ${T.primary}`,
                    }} />
                    <div style={{
                      background: T.card, border: `1px solid ${T.border}`, borderRadius: 8, padding: "8px 10px", fontSize: 12,
                    }}>
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4, gap: 8, flexWrap: "wrap" }}>
                        <span style={{ ...sx.pill, background: T.primaryS, color: T.primaryD, borderColor: "#c7d2fe", fontSize: 11 }}>
                          <FiCalendar size={10} /> {ch.date}
                        </span>
                        <span style={sx.mutedS}>{formatChangeDate(ch)}</span>
                      </div>
                      <div>
                        <span style={{ color: T.textM, textDecoration: "line-through" }}>{ch.from || "(empty)"}</span>
                        <span style={{ margin: "0 6px", color: T.primary, fontWeight: 700 }}>→</span>
                        <span style={{ fontWeight: 700, color: T.text }}>{ch.to || "(empty)"}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Occurrences table */}
          <div style={{ ...sx.card, padding: 14 }}>
            <div style={{ ...sx.h3, marginBottom: 10 }}>All occurrences · {insights.occurrences.length}</div>
            <div style={{ overflow: "auto", maxHeight: 360 }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                <thead>
                  <tr style={{ background: T.bgAlt }}>
                    {["Date", "POS", "Origin", "Qty", "Type", "Expiry", "Remarks", "Current Action"].map((h) => (
                      <th key={h} style={{
                        padding: "8px", textAlign: "left", fontSize: 10, fontWeight: 700,
                        color: T.textM, textTransform: "uppercase", letterSpacing: ".04em",
                        borderBottom: `1px solid ${T.border}`,
                        position: "sticky", top: 0, background: T.bgAlt, zIndex: 5,
                      }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {insights.occurrences.map((r, i) => {
                    const qtyType = (r.qtyType === "أخرى" || r.qtyType === "أخرى / Other") ? (r.customQtyType || "") : (r.qtyType || "");
                    return (
                      <tr key={i}>
                        <td style={{ padding: "8px", borderBottom: `1px solid ${T.borderS}`, fontWeight: 600 }}>{r.date}</td>
                        <td style={{ padding: "8px", borderBottom: `1px solid ${T.borderS}` }}>{safeButchery(r) || "—"}</td>
                        <td style={{ padding: "8px", borderBottom: `1px solid ${T.borderS}` }}>{r.origin || "—"}</td>
                        <td style={{ padding: "8px", borderBottom: `1px solid ${T.borderS}`, textAlign: "right", fontWeight: 600, fontVariantNumeric: "tabular-nums" }}>{r.quantity ?? ""}</td>
                        <td style={{ padding: "8px", borderBottom: `1px solid ${T.borderS}` }}>{qtyType}</td>
                        <td style={{ padding: "8px", borderBottom: `1px solid ${T.borderS}`, color: T.textM }}>{r.expiry || "—"}</td>
                        <td style={{ padding: "8px", borderBottom: `1px solid ${T.borderS}`, color: T.textM, maxWidth: 180, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={r.remarks}>{r.remarks || "—"}</td>
                        <td style={{ padding: "8px", borderBottom: `1px solid ${T.borderS}`, fontWeight: 600 }}>
                          {r.currentAction || "—"}
                          {r.hasChange && <span style={{ ...sx.pill, background: T.successS, color: T.success, borderColor: "#a7f3d0", marginLeft: 6, fontSize: 10 }}>changed</span>}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </ModalShell>
  );
}

/* ============================================================
   Modals
   ============================================================ */
function ModalShell({ open, onClose, title, children, width = 440 }) {
  useEffect(() => {
    if (!open) return;
    const onEsc = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onEsc);
    return () => window.removeEventListener("keydown", onEsc);
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div onClick={onClose} style={{
      position: "fixed", inset: 0, zIndex: 9999,
      background: "rgba(15,23,42,.5)", display: "flex",
      alignItems: "center", justifyContent: "center", padding: 16,
    }}>
      <div onClick={(e) => e.stopPropagation()} style={{
        ...sx.card, width: "100%", maxWidth: width, maxHeight: "90vh", overflow: "auto",
        boxShadow: "0 20px 50px rgba(15,23,42,.25)",
      }}>
        <div style={{
          display: "flex", justifyContent: "space-between", alignItems: "center",
          padding: "14px 18px", borderBottom: `1px solid ${T.border}`,
        }}>
          <div style={sx.h2}>{title}</div>
          <button onClick={onClose} style={{ ...sx.btnGhost, padding: 4, cursor: "pointer", color: T.textM }}>
            <FiX size={18} />
          </button>
        </div>
        <div style={{ padding: 18 }}>{children}</div>
      </div>
    </div>
  );
}

function PasswordModal({ show, onSubmit, onCancel, title = "Enter Password" }) {
  const [val, setVal] = useState("");
  const [err, setErr] = useState("");
  useEffect(() => { if (show) { setVal(""); setErr(""); } }, [show]);
  return (
    <ModalShell open={show} onClose={onCancel} title={title} width={380}>
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <input
          type="password" autoFocus value={val}
          onChange={(e) => setVal(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") onSubmit(val, setErr); }}
          placeholder="Enter password…"
          style={{ ...sx.input, padding: "10px 14px" }}
        />
        {err && <div style={{ color: T.danger, fontSize: 13, fontWeight: 600 }}>{err}</div>}
        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
          <IconBtn onClick={onCancel}>Cancel</IconBtn>
          <PrimaryBtn icon={FiLock} onClick={() => onSubmit(val, setErr)}>Confirm</PrimaryBtn>
        </div>
      </div>
    </ModalShell>
  );
}

function ImageViewerModal({ open, images = [], title = "", onClose }) {
  const [preview, setPreview] = useState(images[0] || "");
  useEffect(() => { if (open) setPreview(images[0] || ""); }, [open, images]);
  return (
    <ModalShell open={open} onClose={onClose} title={`Images${title ? ` — ${title}` : ""}`} width={1100}>
      {preview ? (
        <div style={{ marginBottom: 12 }}>
          <img src={preview} alt="preview" style={{
            width: "100%", maxHeight: "65vh", objectFit: "contain", borderRadius: 10,
            border: `1px solid ${T.border}`,
          }} />
        </div>
      ) : (
        <div style={{ ...sx.muted, textAlign: "center", padding: 30 }}>No images.</div>
      )}
      {images.length > 1 && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(110px, 1fr))", gap: 8 }}>
          {images.map((src, i) => (
            <button key={i} onClick={() => setPreview(src)} style={{
              border: `2px solid ${preview === src ? T.primary : T.border}`,
              borderRadius: 8, padding: 0, overflow: "hidden", cursor: "pointer", background: T.card,
            }}>
              <img src={src} alt={`thumb-${i}`} style={{ width: "100%", height: 90, objectFit: "cover", display: "block" }} />
            </button>
          ))}
        </div>
      )}
    </ModalShell>
  );
}

function PresetsModal({ open, onClose, presets, onApply, onDelete, onSave, currentSnapshot }) {
  const [name, setName] = useState("");
  return (
    <ModalShell open={open} onClose={onClose} title="Filter Presets" width={520}>
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <div>
          <div style={{ ...sx.h3, marginBottom: 8 }}>Save current filters</div>
          <div style={{ display: "flex", gap: 8 }}>
            <input
              value={name} onChange={(e) => setName(e.target.value)}
              placeholder="Preset name (e.g. Last 7 days · Beef)"
              style={{ ...sx.input, flex: 1 }}
            />
            <PrimaryBtn icon={FiSave} onClick={() => { if (!name.trim()) return; onSave(name.trim(), currentSnapshot); setName(""); }}>
              Save
            </PrimaryBtn>
          </div>
        </div>
        <hr style={sx.divider} />
        <div>
          <div style={{ ...sx.h3, marginBottom: 8 }}>Saved presets</div>
          {presets.length === 0 ? (
            <div style={{ ...sx.muted, textAlign: "center", padding: 16 }}>No presets yet.</div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {presets.map((p, i) => (
                <div key={i} style={{
                  display: "flex", justifyContent: "space-between", alignItems: "center",
                  padding: "10px 12px", border: `1px solid ${T.border}`, borderRadius: 8, background: T.cardAlt,
                }}>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontWeight: 700, color: T.text, fontSize: 14 }}>{p.name}</div>
                    <div style={{ ...sx.mutedS, marginTop: 2 }}>
                      {[
                        p.from || p.to ? `${p.from || "…"} → ${p.to || "…"}` : null,
                        p.posSel?.length ? `POS: ${p.posSel.length}` : null,
                        p.originSel?.length ? `Origin: ${p.originSel.length}` : null,
                        p.actionSel?.length ? `Action: ${p.actionSel.length}` : null,
                      ].filter(Boolean).join(" · ") || "Empty"}
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 6 }}>
                    <IconBtn icon={FiCheck} onClick={() => { onApply(p); onClose(); }} title="Apply">Apply</IconBtn>
                    <IconBtn icon={FiTrash2} onClick={() => onDelete(i)} danger title="Delete" />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </ModalShell>
  );
}

/* Inline toast — minimal */
function useToast() {
  const [items, setItems] = useState([]);
  const push = useCallback((msg, kind = "ok") => {
    const id = Date.now() + Math.random();
    setItems((p) => [...p, { id, msg, kind }]);
    setTimeout(() => setItems((p) => p.filter((t) => t.id !== id)), 3500);
  }, []);
  const Toaster = (
    <div style={{
      position: "fixed", top: 16, right: 16, zIndex: 10000,
      display: "flex", flexDirection: "column", gap: 8,
    }}>
      {items.map((t) => {
        const colors = {
          ok: { bg: T.successS, fg: T.success, bd: "#a7f3d0" },
          err: { bg: T.dangerS, fg: T.danger, bd: "#fecaca" },
          info: { bg: T.infoS, fg: T.info, bd: "#a5f3fc" },
        }[t.kind] || { bg: T.cardAlt, fg: T.text, bd: T.border };
        return (
          <div key={t.id} style={{
            background: colors.bg, color: colors.fg,
            border: `1px solid ${colors.bd}`, borderRadius: 10, padding: "10px 14px",
            fontWeight: 600, fontSize: 13, boxShadow: "0 4px 12px rgba(15,23,42,.08)",
            minWidth: 220, display: "flex", alignItems: "center", gap: 8,
          }}>
            {t.kind === "ok" ? <FiCheck size={16} /> : t.kind === "err" ? <FiAlertTriangle size={16} /> : <FiInfo size={16} />}
            {t.msg}
          </div>
        );
      })}
    </div>
  );
  return { push, Toaster };
}

/* ============================================================
   MAIN PAGE
   ============================================================ */
const ALL_COLUMNS = [
  { key: "sl",          label: "SL", sortable: false, always: true, width: 50 },
  { key: "itemCode",    label: "ITEM CODE", sortable: true,  width: 110 },
  { key: "productName", label: "PRODUCT NAME", sortable: true, width: 220 },
  { key: "origin",      label: "ORIGIN", sortable: true, width: 110 },
  { key: "pos",         label: "POS", sortable: true, width: 130 },
  { key: "quantity",    label: "QTY", sortable: true, width: 80 },
  { key: "qtyType",     label: "QTY TYPE", sortable: true, width: 90 },
  { key: "expiry",      label: "EXPIRY", sortable: true, width: 100 },
  { key: "remarks",     label: "REMARKS", sortable: true, width: 160 },
  { key: "action",      label: "ACTION", sortable: true, width: 200 },
];

export default function BrowseReturns() {
  /* --- Data --- */
  const [returnsData, setReturnsData] = useState([]);
  const [changesData, setChangesData] = useState([]);
  const [loadingServer, setLoadingServer] = useState(false);
  const [serverErr, setServerErr] = useState("");

  /* --- UI tab + view --- */
  const [tab, setTab] = useState("overview");

  /* --- Filters (shared) --- */
  const [filterFrom, setFilterFrom] = useState("");
  const [filterTo, setFilterTo] = useState("");
  const [posSel, setPosSel] = useState([]);
  const [originSel, setOriginSel] = useState([]);
  const [actionSel, setActionSel] = useState([]);
  const [qtySel, setQtySel] = useState("any");
  const [hasImages, setHasImages] = useState("any");
  const [remarksState, setRemarksState] = useState("any");

  /* --- Browse view --- */
  const [selectedDate, setSelectedDate] = useState("");
  const [openYears, setOpenYears] = useState({});
  const [openMonths, setOpenMonths] = useState({});
  const [search, setSearch] = useState("");
  const [searchScope, setSearchScope] = useState("day"); // "day" | "all"
  const [resPage, setResPage] = useState(1);
  const RES_PAGE_SIZE = 50;

  const [density, setDensity] = useState("comfy"); // "comfy" | "compact"
  const [groupBy, setGroupBy] = useState("none"); // "none" | "pos" | "origin" | "action"
  const [visibleCols, setVisibleCols] = useState(() => {
    const set = new Set(ALL_COLUMNS.map((c) => c.key));
    return set;
  });
  const [colsOpen, setColsOpen] = useState(false);

  /* --- Compare --- */
  const [cmpAFrom, setCmpAFrom] = useState("");
  const [cmpATo, setCmpATo] = useState("");
  const [cmpBFrom, setCmpBFrom] = useState("");
  const [cmpBTo, setCmpBTo] = useState("");

  /* --- Modals --- */
  const [pwModal, setPwModal] = useState(false);
  const [presetsModal, setPresetsModal] = useState(false);
  const [presets, setPresets] = useState(loadPresets());
  const [viewerOpen, setViewerOpen] = useState(false);
  const [viewerData, setViewerData] = useState({ title: "", images: [] });
  const [auditOpen, setAuditOpen] = useState(false);
  const [auditItem, setAuditItem] = useState(null);
  const [productOpen, setProductOpen] = useState(false);
  const [productInit, setProductInit] = useState({ code: "", name: "" });

  /* --- Heatmap mode --- */
  const [heatmapMode, setHeatmapMode] = useState("items"); // "items" | "condemn"

  /* --- Bulk selection (per-day) --- */
  const [selectedRows, setSelectedRows] = useState(() => new Set());
  const lastClickedRef = useRef(null);
  useEffect(() => { setSelectedRows(new Set()); lastClickedRef.current = null; }, [selectedDate]);

  /* --- Auto-refresh polling --- */
  const [autoRefresh, setAutoRefresh] = useState(() => {
    try { return localStorage.getItem("br:autoRefresh") !== "0"; } catch { return true; }
  });
  const [pendingFetch, setPendingFetch] = useState(null); // { returns, changes }
  const [newCount, setNewCount] = useState(0);

  /* --- Toast --- */
  const { push: toast, Toaster } = useToast();

  /* --- Sort --- */
  const [sort, setSort] = useState({ key: null, dir: null });

  /* ============================================================
     Fetch
     ============================================================ */
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
      setServerErr("Failed to fetch from server.");
    } finally {
      setLoadingServer(false);
    }
  }, [selectedDate]);

  useEffect(() => { reload(); /* eslint-disable-next-line */ }, []);

  /* ============================================================
     URL state sync — read on mount, write on filter change
     ============================================================ */
  const urlReadDone = useRef(false);
  useEffect(() => {
    if (urlReadDone.current) return;
    urlReadDone.current = true;
    try {
      const p = new URLSearchParams(window.location.search);
      const v = (k) => p.get(k);
      if (v("from")) setFilterFrom(v("from"));
      if (v("to")) setFilterTo(v("to"));
      if (v("pos")) setPosSel(v("pos").split(",").filter(Boolean));
      if (v("origin")) setOriginSel(v("origin").split(",").filter(Boolean));
      if (v("action")) setActionSel(v("action").split(",").filter(Boolean));
      if (v("qty")) setQtySel(v("qty"));
      if (v("img")) setHasImages(v("img"));
      if (v("rem")) setRemarksState(v("rem"));
      if (v("q")) setSearch(v("q"));
      if (v("qs")) setSearchScope(v("qs") === "all" ? "all" : "day");
      if (v("tab")) setTab(["overview", "browse", "compare"].includes(v("tab")) ? v("tab") : "overview");
      if (v("gb")) setGroupBy(["none", "pos", "origin", "action"].includes(v("gb")) ? v("gb") : "none");
      if (v("d")) setSelectedDate(v("d"));
    } catch {}
  }, []);

  useEffect(() => {
    if (!urlReadDone.current) return;
    try {
      const p = new URLSearchParams();
      if (filterFrom) p.set("from", filterFrom);
      if (filterTo) p.set("to", filterTo);
      if (posSel.length) p.set("pos", posSel.join(","));
      if (originSel.length) p.set("origin", originSel.join(","));
      if (actionSel.length) p.set("action", actionSel.join(","));
      if (qtySel !== "any") p.set("qty", qtySel);
      if (hasImages !== "any") p.set("img", hasImages);
      if (remarksState !== "any") p.set("rem", remarksState);
      if (search) p.set("q", search);
      if (searchScope !== "day") p.set("qs", searchScope);
      if (tab !== "overview") p.set("tab", tab);
      if (groupBy !== "none") p.set("gb", groupBy);
      if (selectedDate) p.set("d", selectedDate);
      const qs = p.toString();
      const path = window.location.pathname;
      const hash = window.location.hash || "";
      window.history.replaceState({}, "", qs ? `${path}?${qs}${hash}` : `${path}${hash}`);
    } catch {}
  }, [filterFrom, filterTo, posSel, originSel, actionSel, qtySel, hasImages, remarksState, search, searchScope, tab, groupBy, selectedDate]);

  function copyShareLink() {
    try {
      const url = window.location.href;
      navigator.clipboard?.writeText(url);
      toast("Link copied", "ok");
    } catch (e) {
      toast("Failed to copy", "err");
    }
  }

  /* --- Bulk selection handlers --- */
  function toggleRowSelect(idx) {
    setSelectedRows((s) => {
      const next = new Set(s);
      if (next.has(idx)) next.delete(idx); else next.add(idx);
      return next;
    });
    lastClickedRef.current = idx;
  }
  function toggleAllVisible(ids, allChecked) {
    setSelectedRows((s) => {
      const next = new Set(s);
      if (allChecked) ids.forEach((id) => next.delete(id));
      else ids.forEach((id) => next.add(id));
      return next;
    });
  }
  function rangeSelect(idx) {
    const last = lastClickedRef.current;
    if (last == null) { toggleRowSelect(idx); return; }
    const visibleIdx = sortedRows.map((r) => r.__i);
    const a = visibleIdx.indexOf(last);
    const b = visibleIdx.indexOf(idx);
    if (a < 0 || b < 0) { toggleRowSelect(idx); return; }
    const [from, to] = a < b ? [a, b] : [b, a];
    const range = visibleIdx.slice(from, to + 1);
    setSelectedRows((s) => {
      const next = new Set(s);
      range.forEach((i) => next.add(i));
      return next;
    });
    lastClickedRef.current = idx;
  }
  function clearSelection() { setSelectedRows(new Set()); lastClickedRef.current = null; }
  function selectAllVisibleRows() {
    setSelectedRows(new Set(sortedRows.map((r) => r.__i)));
  }

  /* Build TSV/CSV from selection */
  function buildSelectedRows() {
    if (!selectedReport) return [];
    return (selectedReport.items || [])
      .map((r, i) => ({ ...r, __i: i }))
      .filter((r) => selectedRows.has(r.__i));
  }
  function selectionToTSV() {
    const cols = visibleColumns.filter((c) => c.key !== "sl");
    const rows = buildSelectedRows();
    const head = cols.map((c) => c.label);
    const body = rows.map((r, i) => cols.map((c) => {
      if (c.key === "itemCode") return r.itemCode || "";
      if (c.key === "productName") return r.productName || "";
      if (c.key === "origin") return r.origin || "";
      if (c.key === "pos") return safeButchery(r) || "";
      if (c.key === "quantity") return r.quantity ?? "";
      if (c.key === "qtyType") return (r.qtyType === "أخرى" || r.qtyType === "أخرى / Other") ? (r.customQtyType || "") : (r.qtyType || "");
      if (c.key === "expiry") return r.expiry || "";
      if (c.key === "remarks") return r.remarks || "";
      if (c.key === "action") return actionText(r) || "";
      return "";
    }));
    return [head, ...body].map((row) => row.map((v) => String(v ?? "").replace(/\t/g, " ").replace(/\n/g, " ")).join("\t")).join("\n");
  }
  async function copySelectionTSV() {
    const tsv = selectionToTSV();
    try {
      await navigator.clipboard.writeText(tsv);
      toast(`${selectedRows.size} rows copied`, "ok");
    } catch {
      // Fallback
      const ta = document.createElement("textarea");
      ta.value = tsv; document.body.appendChild(ta); ta.select();
      try { document.execCommand("copy"); toast(`${selectedRows.size} rows copied`, "ok"); }
      catch { toast("Failed to copy", "err"); }
      document.body.removeChild(ta);
    }
  }
  function exportSelectionCSV() {
    if (!selectedReport) return;
    const cols = visibleColumns.filter((c) => c.key !== "sl");
    const rows = buildSelectedRows();
    const head = cols.map((c) => c.label);
    const body = rows.map((r) => cols.map((c) => {
      if (c.key === "itemCode") return r.itemCode || "";
      if (c.key === "productName") return r.productName || "";
      if (c.key === "origin") return r.origin || "";
      if (c.key === "pos") return safeButchery(r) || "";
      if (c.key === "quantity") return r.quantity ?? "";
      if (c.key === "qtyType") return (r.qtyType === "أخرى" || r.qtyType === "أخرى / Other") ? (r.customQtyType || "") : (r.qtyType || "");
      if (c.key === "expiry") return r.expiry || "";
      if (c.key === "remarks") return r.remarks || "";
      if (c.key === "action") return actionText(r) || "";
      return "";
    }));
    const csv = "﻿" + [head, ...body].map((row) => row.map(csvEscape).join(",")).join("\r\n");
    downloadFile(`returns_${selectedReport.reportDate}_selection.csv`, csv);
    toast(`${rows.length} rows exported`, "ok");
  }

  /* ============================================================
     Auto-refresh polling — silently fetch every 5min
     ============================================================ */
  useEffect(() => {
    try { localStorage.setItem("br:autoRefresh", autoRefresh ? "1" : "0"); } catch {}
  }, [autoRefresh]);

  useEffect(() => {
    if (!autoRefresh) return;
    let alive = true;
    const tick = async () => {
      try {
        const [r, c] = await Promise.all([fetchByType("returns"), fetchByType("returns_changes")]);
        if (!alive) return;
        const normalized = normalizeReturns(r);
        const currentTotal = returnsData.reduce((s, rep) => s + (rep.items?.length || 0), 0);
        const fetchedTotal = normalized.reduce((s, rep) => s + (rep.items?.length || 0), 0);
        const currentDates = new Set(returnsData.map((rep) => rep.reportDate));
        const newDates = normalized.filter((rep) => !currentDates.has(rep.reportDate)).length;
        const delta = fetchedTotal - currentTotal;
        if (delta > 0 || newDates > 0) {
          setNewCount(Math.max(delta, newDates));
          setPendingFetch({ returns: normalized, changes: c });
        }
      } catch {}
    };
    const id = setInterval(tick, 5 * 60 * 1000);
    return () => { alive = false; clearInterval(id); };
  }, [autoRefresh, returnsData]);

  function applyPendingFetch() {
    if (!pendingFetch) { reload(); return; }
    setReturnsData(pendingFetch.returns);
    setChangesData(pendingFetch.changes);
    setPendingFetch(null);
    setNewCount(0);
    toast("Updated", "ok");
  }

  /* ============================================================
     Keyboard shortcut: "/" focuses search
     ============================================================ */
  const searchInputRef = useRef(null);
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "/" && !["INPUT", "TEXTAREA"].includes(document.activeElement?.tagName)) {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  /* ============================================================
     Changes map
     ============================================================ */
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

  /* Full audit trail per item key — across all dates */
  const auditTrailByKey = useMemo(() => {
    const map = new Map();
    for (const rec of changesData) {
      const d = rec?.payload?.reportDate || rec?.reportDate || "";
      if (!d) continue;
      const items = Array.isArray(rec?.payload?.items) ? rec.payload.items : [];
      for (const ch of items) {
        const k = ch?.key;
        if (!k) continue;
        const ts = toTs(ch?.at) || 0;
        if (!map.has(k)) map.set(k, []);
        map.get(k).push({ date: d, from: ch.from, to: ch.to, at: ch.at, ts });
      }
    }
    for (const arr of map.values()) {
      arr.sort((a, b) => (a.ts || 0) - (b.ts || 0));
    }
    return map;
  }, [changesData]);

  /* ============================================================
     Filtered (date-range) reports
     ============================================================ */
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

  /* ============================================================
     Hierarchy (tree)
     ============================================================ */
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

  /* ============================================================
     Filter options
     ============================================================ */
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

  function clearAll() {
    clearAllFilters();
    setFilterFrom(""); setFilterTo("");
    setSearch(""); setSort({ key: null, dir: null });
  }

  function setQuickDays(days) {
    const today = new Date();
    const to = today.toISOString().slice(0, 10);
    const fromD = new Date(today.getTime() - (days - 1) * 24 * 60 * 60 * 1000);
    setFilterFrom(fromD.toISOString().slice(0, 10));
    setFilterTo(to);
  }

  /* ============================================================
     KPI computation
     ============================================================ */
  const kpi = useMemo(() => {
    let totalItems = 0, totalQtyKg = 0, totalQtyPcs = 0;
    const posCountItems = {}, posKg = {}, posPcs = {}, byActionLatest = {};
    const condemnationNames = {}, originCountItems = {};
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
        const origin = it.origin || "—";
        posCountItems[pos] = (posCountItems[pos] || 0) + 1;
        originCountItems[origin] = (originCountItems[origin] || 0) + 1;
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
    const topKg = pickMax(posKg);
    const actionTotal = Object.values(byActionLatest).reduce((a, b) => a + b, 0) || 1;

    const topPosByItems = Object.entries(posCountItems).sort((a, b) => b[1] - a[1]).slice(0, 5)
      .map(([label, value]) => ({ label, value }));
    const topPosByKg = Object.entries(posKg).sort((a, b) => b[1] - a[1]).slice(0, 5)
      .map(([label, value]) => ({ label, value: Math.round(value * 100) / 100 }));
    const topOrigins = Object.entries(originCountItems).sort((a, b) => b[1] - a[1]).slice(0, 5)
      .map(([label, value]) => ({ label, value }));
    const topActions = Object.entries(byActionLatest).sort((a, b) => b[1] - a[1]).slice(0, 6)
      .map(([label, value]) => ({ label, value, percent: Math.round(value * 100 / actionTotal) }));
    const topCondemn = Object.entries(condemnationNames).sort((a, b) => b[1] - a[1]).slice(0, 5)
      .map(([label, value]) => ({ label, value }));

    return {
      totalReports: filteredReportsAsc.length, totalItems, totalQtyKg, totalQtyPcs,
      topPos: pickMax(posCountItems),
      topPosByKg: { key: topKg.key, kg: Math.round(topKg.value * 100) / 100, percent: Math.round(topKg.value * 100 / (totalQtyKg || 1)) },
      condemnation: { count: condemnationCount, percent: Math.round(condemnationCount * 100 / actionTotal), kg: Math.round(condemnationKg * 100) / 100 },
      useProd: { count: useProdCount, percent: Math.round(useProdCount * 100 / actionTotal) },
      sepExpired: { count: sepExpiredCount, percent: Math.round(sepExpiredCount * 100 / actionTotal) },
      disposed: { count: disposedCount, percent: Math.round(disposedCount * 100 / actionTotal), kg: Math.round(disposedKg * 100) / 100 },
      marketKg: Math.round(marketKg * 100) / 100,
      actionTotal,
      topPosByItems, topPosByKg2: topPosByKg, topOrigins, topActions, topCondemn,
    };
    // eslint-disable-next-line
  }, [filteredReportsAsc, changeMapByDate, posSel, originSel, actionSel, qtySel, hasImages, remarksState]);

  /* ============================================================
     Daily metrics — items + condemnation per day (used by heatmap, sparkline, anomalies)
     ============================================================ */
  const dailyMetrics = useMemo(() => {
    return filteredReportsAsc.map((rep) => {
      const date = rep.reportDate;
      const inner = changeMapByDate.get(date) || new Map();
      let items = 0, condCount = 0, condKg = 0, kg = 0, pcs = 0;
      (rep.items || []).forEach((it) => {
        if (!rowPassesAdvanced(it)) return;
        items += 1;
        const q = Number(it.quantity || 0);
        if (isKgType(it.qtyType)) kg += q;
        else if (isPcsType(it.qtyType)) pcs += q;
        const ch = inner.get(itemKey(it));
        const act = ch?.to ?? actionText(it);
        if (isCondemnation(act)) {
          condCount += 1;
          if (isKgType(it.qtyType)) condKg += q;
        }
      });
      return { date, items, condCount, condKg: Math.round(condKg * 100) / 100, kg: Math.round(kg * 100) / 100, pcs };
    });
    // eslint-disable-next-line
  }, [filteredReportsAsc, changeMapByDate, posSel, originSel, actionSel, qtySel, hasImages, remarksState]);

  const timeSeries = useMemo(() => {
    return dailyMetrics.map((d) => ({ label: d.date, value: d.items }));
  }, [dailyMetrics]);

  /* ============================================================
     Pareto data — by Product / by POS / by Origin
     ============================================================ */
  const paretoData = useMemo(() => {
    const productMap = new Map();
    const posMap = new Map();
    filteredReportsAsc.forEach((rep) => {
      (rep.items || []).forEach((it) => {
        if (!rowPassesAdvanced(it)) return;
        const name = (it.productName || "—").trim();
        productMap.set(name, (productMap.get(name) || 0) + 1);
        const pos = safeButchery(it) || "—";
        posMap.set(pos, (posMap.get(pos) || 0) + 1);
      });
    });
    const toSorted = (m) => Array.from(m.entries())
      .map(([label, value]) => ({ label, value }))
      .sort((a, b) => b.value - a.value);
    return { byProduct: toSorted(productMap), byPos: toSorted(posMap) };
    // eslint-disable-next-line
  }, [filteredReportsAsc, posSel, originSel, actionSel, qtySel, hasImages, remarksState]);

  /* ============================================================
     Anomaly detection — flag days where items or condemnation > μ + 2σ
     ============================================================ */
  const anomalies = useMemo(() => {
    const n = dailyMetrics.length;
    if (n < 4) return { dates: new Set(), top: [], stats: null };
    const stat = (vals) => {
      const mean = vals.reduce((a, b) => a + b, 0) / n;
      const variance = vals.reduce((s, v) => s + (v - mean) ** 2, 0) / n;
      const sd = Math.sqrt(variance);
      return { mean, sd, threshold: mean + 2 * sd };
    };
    const itemsStat = stat(dailyMetrics.map((d) => d.items));
    const condStat = stat(dailyMetrics.map((d) => d.condCount));
    const flagged = [];
    const dates = new Set();
    for (const d of dailyMetrics) {
      const reasons = [];
      if (itemsStat.sd > 0 && d.items > itemsStat.threshold) {
        reasons.push({ kind: "items", value: d.items, mean: itemsStat.mean, sigma: ((d.items - itemsStat.mean) / itemsStat.sd) });
      }
      if (condStat.sd > 0 && d.condCount > condStat.threshold && d.condCount > 0) {
        reasons.push({ kind: "condemn", value: d.condCount, mean: condStat.mean, sigma: ((d.condCount - condStat.mean) / condStat.sd) });
      }
      if (reasons.length) {
        dates.add(d.date);
        flagged.push({ date: d.date, items: d.items, condCount: d.condCount, condKg: d.condKg, reasons });
      }
    }
    flagged.sort((a, b) => {
      const sa = Math.max(...a.reasons.map((r) => r.sigma));
      const sb = Math.max(...b.reasons.map((r) => r.sigma));
      return sb - sa;
    });
    return {
      dates,
      top: flagged.slice(0, 6),
      stats: {
        itemsMean: Math.round(itemsStat.mean * 10) / 10,
        itemsThreshold: Math.round(itemsStat.threshold * 10) / 10,
        condMean: Math.round(condStat.mean * 10) / 10,
        condThreshold: Math.round(condStat.threshold * 10) / 10,
      },
    };
  }, [dailyMetrics]);

  /* ============================================================
     Day search summary
     ============================================================ */
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
  function isPowerQuery(q) {
    return /(\w+):/i.test((q || "").trim());
  }
  function scoreRow(row, q) {
    const trimmed = (q || "").trim();
    if (!trimmed) return { score: 0, hits: [] };
    if (isPowerQuery(trimmed)) {
      const parsed = parseSearchQuery(trimmed);
      if (!rowMatchesPower(row, parsed)) return { score: 0, hits: [] };
      const hits = [...new Set([...parsed.filters.map((f) => f.key), ...parsed.terms.map(() => "term")])];
      return { score: 1 + parsed.filters.length * 2, hits };
    }
    const needle = trimmed.toLowerCase();
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
  function rowMatchesSearch(row, qRaw) {
    const q = (qRaw || "").trim();
    if (!q) return true;
    if (isPowerQuery(q)) {
      return rowMatchesPower(row, parseSearchQuery(q));
    }
    const needle = q.toLowerCase();
    return [
      row.itemCode, row.productName, row.origin, safeButchery(row),
      String(row.quantity ?? ""),
      (row.qtyType === "أخرى" || row.qtyType === "أخرى / Other") ? (row.customQtyType || "") : (row.qtyType || ""),
      row.expiry, row.remarks, actionText(row),
    ].some((v) => (v ?? "").toString().toLowerCase().includes(needle));
  }

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

  const sortedRows = useMemo(() => {
    if (!selectedReport) return [];
    let rows = (selectedReport.items || []).map((r, i) => ({ ...r, __i: i }));
    if (searchScope === "day") rows = rows.filter((r) => rowMatchesSearch(r, search));
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
    // eslint-disable-next-line
  }, [selectedReport, sort, search, searchScope, posSel, originSel, actionSel, qtySel, hasImages, remarksState]);

  /* ============================================================
     Selected day summary
     ============================================================ */
  const selectedSummary = useMemo(() => {
    if (!selectedReport) return null;
    const rows = sortedRows;
    let kg = 0, pcs = 0, other = 0;
    rows.forEach((it) => {
      const qty = Number(it.quantity || 0);
      if (isKgType(it.qtyType)) kg += qty;
      else if (isPcsType(it.qtyType)) pcs += qty;
      else other += qty;
    });
    return { count: rows.length, total: (selectedReport.items || []).length, kg, pcs, other };
  }, [selectedReport, sortedRows]);

  /* ============================================================
     Group-by data
     ============================================================ */
  const groupedRows = useMemo(() => {
    if (groupBy === "none" || !selectedReport) return null;
    const groups = new Map();
    sortedRows.forEach((row) => {
      let key;
      if (groupBy === "pos") key = safeButchery(row) || "—";
      else if (groupBy === "origin") key = row.origin || "—";
      else if (groupBy === "action") key = actionText(row) || "—";
      else key = "—";
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(row);
    });
    return Array.from(groups.entries())
      .sort((a, b) => b[1].length - a[1].length)
      .map(([k, rows]) => {
        let kg = 0, pcs = 0;
        rows.forEach((r) => {
          const q = Number(r.quantity || 0);
          if (isKgType(r.qtyType)) kg += q;
          else if (isPcsType(r.qtyType)) pcs += q;
        });
        return { key: k, rows, kg: Math.round(kg * 100) / 100, pcs };
      });
  }, [groupBy, sortedRows, selectedReport]);

  /* ============================================================
     Global search across reports
     ============================================================ */
  const globalIndex = useMemo(() => {
    const out = [];
    for (const rep of filteredReportsAsc)
      (rep.items || []).forEach((row, i) => out.push({ date: rep.reportDate, row, idx: i }));
    return out;
  }, [filteredReportsAsc]);

  const globalResults = useMemo(() => {
    const q = search.trim();
    if (!q || searchScope !== "all") return [];
    const scored = globalIndex
      .filter((r) => rowPassesAdvanced(r.row))
      .map((r) => { const s = scoreRow(r.row, q); return { ...r, score: s.score, hits: s.hits }; })
      .filter((r) => r.score > 0);
    scored.sort((a, b) => b.score !== a.score ? b.score - a.score : (b.date || "").localeCompare(a.date || ""));
    return scored;
    // eslint-disable-next-line
  }, [search, searchScope, globalIndex, posSel, originSel, actionSel, qtySel, hasImages, remarksState]);

  const totalPages = Math.max(1, Math.ceil(globalResults.length / RES_PAGE_SIZE));
  const pagedResults = useMemo(() => {
    const start = (resPage - 1) * RES_PAGE_SIZE;
    return globalResults.slice(start, start + RES_PAGE_SIZE);
  }, [globalResults, resPage]);

  /* ============================================================
     Compare data — period A vs B
     ============================================================ */
  function statsForRange(from, to) {
    let items = 0, kg = 0, pcs = 0, condCount = 0, condKg = 0, days = 0;
    const posMap = {}, actMap = {};
    const dailyArr = [];
    returnsData.forEach((rep) => {
      const d = rep.reportDate || "";
      if (from && d < from) return;
      if (to && d > to) return;
      days += 1;
      let dayCount = 0;
      (rep.items || []).forEach((it) => {
        if (!rowPassesAdvanced(it)) return;
        items += 1; dayCount += 1;
        const q = Number(it.quantity || 0);
        if (isKgType(it.qtyType)) kg += q;
        else if (isPcsType(it.qtyType)) pcs += q;
        const pos = safeButchery(it) || "—";
        const inner = changeMapByDate.get(d) || new Map();
        const ch = inner.get(itemKey(it));
        const act = ch?.to ?? actionText(it);
        posMap[pos] = (posMap[pos] || 0) + 1;
        if (act) actMap[act] = (actMap[act] || 0) + 1;
        if (isCondemnation(act)) {
          condCount += 1;
          if (isKgType(it.qtyType)) condKg += q;
        }
      });
      dailyArr.push({ label: d, value: dayCount });
    });
    return {
      items, kg: Math.round(kg * 100) / 100, pcs, condCount,
      condKg: Math.round(condKg * 100) / 100, days,
      avgPerDay: days ? Math.round((items / days) * 10) / 10 : 0,
      topPos: Object.entries(posMap).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([label, value]) => ({ label, value })),
      topAct: Object.entries(actMap).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([label, value]) => ({ label, value })),
      daily: dailyArr,
    };
  }
  const cmpA = useMemo(() => statsForRange(cmpAFrom, cmpATo),
    // eslint-disable-next-line
    [returnsData, changeMapByDate, cmpAFrom, cmpATo, posSel, originSel, actionSel, qtySel, hasImages, remarksState]);
  const cmpB = useMemo(() => statsForRange(cmpBFrom, cmpBTo),
    // eslint-disable-next-line
    [returnsData, changeMapByDate, cmpBFrom, cmpBTo, posSel, originSel, actionSel, qtySel, hasImages, remarksState]);

  /* ============================================================
     Highlight helper
     ============================================================ */
  function highlight(text, q) {
    if (!q || !q.trim()) return String(text ?? "");
    const escaped = q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const re = new RegExp(`(${escaped})`, "ig");
    const parts = String(text ?? "").split(re);
    return (
      <span>
        {parts.map((p, i) =>
          re.test(p)
            ? <mark key={i} style={{ background: "#fef3c7", color: "#78350f", borderRadius: 3, padding: "0 2px" }}>{p}</mark>
            : <span key={i}>{p}</span>
        )}
      </span>
    );
  }

  /* ============================================================
     PDF / XLSX / CSV export
     ============================================================ */
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
        doc.setFont("helvetica", "bold"); doc.setFontSize(16);
        doc.text("Returns Report", marginL, 36);
        doc.setFont("helvetica", "normal"); doc.setFontSize(11);
        doc.text(`Date: ${selectedReport.reportDate}`, marginL, 54);
        const rightX = pageWidth - marginR;
        doc.setFont("helvetica", "bold"); doc.setTextColor(180, 0, 0); doc.setFontSize(18);
        doc.text("AL MAWASHI", rightX, 30, { align: "right" });
        doc.setTextColor(0, 0, 0); doc.setFont("helvetica", "normal"); doc.setFontSize(10);
        doc.text("Trans Emirates Livestock Trading L.L.C.", rightX, 46, { align: "right" });
      };
      drawHeader();
      const changeMap = changeMapByDate.get(selectedReport?.reportDate || "") || new Map();
      const body = sortedRows.map((row, i) => {
        const pos = safeButchery(row);
        const qtyType = (row.qtyType === "أخرى" || row.qtyType === "أخرى / Other") ? row.customQtyType || "" : row.qtyType || "";
        const curr = actionTextSafe(row);
        let actionCell = curr || "";
        const k = itemKey(row);
        const ch = changeMap.get(k);
        if (ch && (ch.to ?? "") === (curr ?? "")) {
          const dateTxt = formatChangeDatePDF(ch);
          actionCell = `${(ch.from || "").trim()} to ${(ch.to || "").trim()}${dateTxt ? `\n${dateTxt}` : ""}`;
        }
        return [String(i + 1), row.productName || "", row.origin || "", pos || "", String(row.quantity ?? ""), qtyType, row.expiry || "", row.remarks || "", actionCell];
      });
      const frac = [0.05, 0.18, 0.09, 0.08, 0.06, 0.08, 0.08, 0.18, 0.20];
      const columnStyles = {};
      frac.forEach((f, idx) => (columnStyles[idx] = { cellWidth: Math.floor(avail * f) }));
      columnStyles[0].halign = "center"; columnStyles[4].halign = "center"; columnStyles[6].halign = "center";
      doc.autoTable({
        head: [["SL", "PRODUCT", "ORIGIN", "POS", "QTY", "QTY TYPE", "EXPIRY", "REMARKS", "ACTION"]],
        body, margin: { top: marginTop, left: marginL, right: marginR }, tableWidth: avail,
        styles: { font: "helvetica", fontSize: 10, cellPadding: 4, lineColor: [226, 232, 240], lineWidth: 0.5, halign: "left", valign: "middle", overflow: "linebreak", wordBreak: "break-word", minCellHeight: 16 },
        headStyles: { fillColor: [238, 242, 255], textColor: [15, 23, 42], fontStyle: "bold", halign: "center" },
        columnStyles,
        didDrawPage: () => drawHeader(),
      });
      doc.save(`returns_${selectedReport.reportDate}.pdf`);
      toast("PDF exported", "ok");
    } catch (e) {
      console.error(e);
      toast("Failed to generate PDF", "err");
    }
  };

  const PDF_XLSX_COLS = ["SL.NO", "ITEM CODE", "PRODUCT NAME", "ORIGIN", "POS", "QUANTITY", "QTY TYPE", "EXPIRY DATE", "REMARKS", "ACTION"];

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
        actionCell = `${(ch.from || "").trim()} to ${(ch.to || "").trim()}${dateTxt ? ` (${dateTxt})` : ""}`;
      }
      return [i + 1, row.itemCode || "", row.productName || "", row.origin || "", pos || "", Number(row.quantity ?? 0), qtyType || "", row.expiry || "", row.remarks || "", actionCell];
    });
  }

  function autosizeColumns(ws, data) {
    const colWidths = (data[0] || []).map((_, colIdx) => {
      let maxLen = 10;
      for (let r = 0; r < data.length; r++) {
        const len = (data[r][colIdx] == null ? 0 : String(data[r][colIdx])).length;
        if (len > maxLen) maxLen = len;
      }
      return { wch: Math.min(Math.max(maxLen + 2, 10), 60) };
    });
    ws["!cols"] = colWidths;
    ws["!freeze"] = { xSplit: 1, ySplit: 1 };
  }

  const handleExportXLSXSelected = async () => {
    if (!selectedReport) { toast("Select a date first", "err"); return; }
    try {
      const XLSX = await ensureXLSX();
      const wb = XLSX.utils.book_new();
      const data = [PDF_XLSX_COLS, ...buildRowsForReport(selectedReport, true)];
      const ws = XLSX.utils.aoa_to_sheet(data);
      autosizeColumns(ws, data);
      const label = (search || posSel.length || actionSel.length || originSel.length) ? "Filtered" : selectedReport.reportDate;
      XLSX.utils.book_append_sheet(wb, ws, label.slice(0, 31));
      XLSX.writeFile(wb, `returns_${selectedReport.reportDate}${search ? "_filtered" : ""}.xlsx`);
      toast("XLSX exported", "ok");
    } catch (e) { console.error(e); toast("Failed to export XLSX", "err"); }
  };

  const handleExportXLSXAllLocked = () => setPwModal(true);

  const handlePasswordSubmit = async (code, setErr) => {
    if (code !== "0585446473") { setErr("Incorrect password."); return; }
    setPwModal(false);
    try {
      const XLSX = await ensureXLSX();
      const wb = XLSX.utils.book_new();
      const all = [...returnsData].sort((a, b) => (a.reportDate || "").localeCompare(b.reportDate || ""));
      if (!all.length) { toast("No reports to export", "err"); return; }
      for (const rep of all) {
        const data = [PDF_XLSX_COLS, ...buildRowsForReport(rep, false)];
        const ws = XLSX.utils.aoa_to_sheet(data);
        autosizeColumns(ws, data);
        XLSX.utils.book_append_sheet(wb, ws, (rep.reportDate || "DAY").slice(0, 31));
      }
      XLSX.writeFile(wb, `returns_ALL_days.xlsx`);
      toast("All reports exported", "ok");
    } catch (e) { console.error(e); toast("Failed to export ALL", "err"); }
  };

  function csvEscape(v) {
    const s = v == null ? "" : String(v);
    if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
    return s;
  }
  function downloadFile(filename, content, mime = "text/csv;charset=utf-8") {
    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = filename;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }
  const handleExportCSV = () => {
    if (!selectedReport) { toast("Select a date first", "err"); return; }
    const rows = [PDF_XLSX_COLS, ...buildRowsForReport(selectedReport, true)];
    const csv = "﻿" + rows.map((r) => r.map(csvEscape).join(",")).join("\r\n");
    downloadFile(`returns_${selectedReport.reportDate}${search ? "_filtered" : ""}.csv`, csv);
    toast("CSV exported", "ok");
  };
  const handleExportSearchCSV = () => {
    if (!globalResults.length) { toast("No results to export", "err"); return; }
    const head = ["SL.NO", "DATE", "ITEM CODE", "PRODUCT NAME", "ORIGIN", "POS", "QUANTITY", "QTY TYPE", "EXPIRY", "REMARKS", "ACTION", "SCORE", "MATCH IN"];
    const rows = globalResults.map((r, i) => {
      const row = r.row;
      const pos = safeButchery(row);
      const qtyType = (row.qtyType === "أخرى" || row.qtyType === "أخرى / Other") ? (row.customQtyType || "") : (row.qtyType || "");
      return [i + 1, r.date, row.itemCode || "", row.productName || "", row.origin || "", pos || "", Number(row.quantity ?? 0), qtyType || "", row.expiry || "", row.remarks || "", actionText(row) || "", r.score, r.hits.join(", ")];
    });
    const csv = "﻿" + [head, ...rows].map((r) => r.map(csvEscape).join(",")).join("\r\n");
    downloadFile(`returns_search.csv`, csv);
    toast("Search CSV exported", "ok");
  };

  function exportSearchResultsXLSX() {
    if (!globalResults.length) { toast("No results to export", "err"); return; }
    (async () => {
      try {
        const XLSX = await ensureXLSX();
        const wb = XLSX.utils.book_new();
        const head = ["SL.NO", "DATE", "ITEM CODE", "PRODUCT NAME", "ORIGIN", "POS", "QUANTITY", "QTY TYPE", "EXPIRY", "REMARKS", "ACTION", "SCORE", "MATCH IN"];
        const rows = globalResults.map((r, i) => {
          const row = r.row;
          const pos = safeButchery(row);
          const qtyType = (row.qtyType === "أخرى" || row.qtyType === "أخرى / Other") ? (row.customQtyType || "") : (row.qtyType || "");
          return [i + 1, r.date, row.itemCode || "", row.productName || "", row.origin || "", pos || "", Number(row.quantity ?? 0), qtyType || "", row.expiry || "", row.remarks || "", actionText(row) || "", r.score, r.hits.join(", ")];
        });
        const data = [head, ...rows];
        const ws = XLSX.utils.aoa_to_sheet(data);
        autosizeColumns(ws, data);
        ws["!freeze"] = { xSplit: 1, ySplit: 1 };
        XLSX.utils.book_append_sheet(wb, ws, "Search_Results");
        XLSX.writeFile(wb, `returns_search_results.xlsx`);
        toast("Search XLSX exported", "ok");
      } catch (e) { console.error(e); toast("Failed to export search", "err"); }
    })();
  }

  /* ============================================================
     Print
     ============================================================ */
  const handlePrint = () => { window.print(); };

  /* ============================================================
     Image viewer
     ============================================================ */
  function openViewer(row) {
    const imgs = Array.isArray(row.images) ? row.images : [];
    if (!imgs.length) return;
    setViewerData({ title: row.productName || "Images", images: imgs });
    setViewerOpen(true);
  }

  /* ============================================================
     Presets
     ============================================================ */
  const currentSnapshot = {
    from: filterFrom, to: filterTo,
    posSel, originSel, actionSel, qtySel, hasImages, remarksState,
  };
  function applyPreset(p) {
    setFilterFrom(p.from || ""); setFilterTo(p.to || "");
    setPosSel(p.posSel || []); setOriginSel(p.originSel || []); setActionSel(p.actionSel || []);
    setQtySel(p.qtySel || "any"); setHasImages(p.hasImages || "any"); setRemarksState(p.remarksState || "any");
    toast(`Applied: ${p.name}`, "info");
  }
  function savePreset(name, snap) {
    const next = [...presets, { name, ...snap }];
    setPresets(next); savePresetsAll(next);
    toast(`Saved: ${name}`, "ok");
  }
  function deletePreset(idx) {
    const next = presets.filter((_, i) => i !== idx);
    setPresets(next); savePresetsAll(next);
  }

  /* ============================================================
     Active filter pills
     ============================================================ */
  const activeFilters = [];
  if (filterFrom) activeFilters.push({ label: "From", value: filterFrom, remove: () => setFilterFrom("") });
  if (filterTo) activeFilters.push({ label: "To", value: filterTo, remove: () => setFilterTo("") });
  posSel.forEach((p) => activeFilters.push({ label: "POS", value: p, remove: () => setPosSel(posSel.filter((x) => x !== p)) }));
  originSel.forEach((p) => activeFilters.push({ label: "Origin", value: p, remove: () => setOriginSel(originSel.filter((x) => x !== p)) }));
  actionSel.forEach((p) => activeFilters.push({ label: "Action", value: p, remove: () => setActionSel(actionSel.filter((x) => x !== p)) }));
  if (qtySel !== "any") activeFilters.push({ label: "Qty", value: qtySel.toUpperCase(), remove: () => setQtySel("any") });
  if (hasImages !== "any") activeFilters.push({ label: "Images", value: hasImages, remove: () => setHasImages("any") });
  if (remarksState !== "any") activeFilters.push({ label: "Remarks", value: remarksState, remove: () => setRemarksState("any") });

  /* ============================================================
     Compare metric helper
     ============================================================ */
  function diffPill(aVal, bVal, suffix = "") {
    if (!aVal && !bVal) return null;
    const diff = bVal - aVal;
    const pct = aVal ? Math.round((diff / aVal) * 100) : null;
    const up = diff > 0;
    const same = diff === 0;
    const color = same ? T.textM : up ? T.danger : T.success;
    const bg = same ? T.bgAlt : up ? T.dangerS : T.successS;
    return (
      <span style={{ ...sx.pill, background: bg, color, borderColor: bg }}>
        {same ? "—" : up ? <FiTrendingUp size={12} /> : <FiTrendingDown size={12} />}
        {same ? "No change" : `${diff > 0 ? "+" : ""}${fmtNum(diff)}${suffix}${pct != null ? ` (${pct > 0 ? "+" : ""}${pct}%)` : ""}`}
      </span>
    );
  }

  const changeMap = changeMapByDate.get(selectedReport?.reportDate || "") || new Map();

  /* ============================================================
     Render
     ============================================================ */
  function jumpToDay(d) {
    setSelectedDate(d);
    setSearchScope("day");
    const y = d.slice(0, 4), m = d.slice(5, 7);
    setOpenYears((p) => ({ ...p, [y]: true }));
    setOpenMonths((p) => ({ ...p, [`${y}-${m}`]: true }));
    setTab("browse");
  }

  const rowPad = density === "compact" ? "6px 8px" : "10px 10px";
  const visibleColumns = ALL_COLUMNS.filter((c) => c.always || visibleCols.has(c.key));

  return (
    <>
      {/* Print stylesheet */}
      <style>{`
        @keyframes shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }
        @keyframes pulse { 0%,100% { box-shadow: 0 0 0 0 rgba(5, 150, 105, .6); } 50% { box-shadow: 0 0 0 6px rgba(5, 150, 105, 0); } }
        @keyframes slideUp { from { transform: translateY(20px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
        @media print {
          body { background: #fff !important; }
          .br-noprint { display: none !important; }
          .br-print-only { display: block !important; }
          .br-page { padding: 0 !important; background: #fff !important; }
          .br-card { box-shadow: none !important; border: 1px solid #e5e7eb !important; }
          table { page-break-inside: auto; }
          tr { page-break-inside: avoid; page-break-after: auto; }
        }
        .br-print-only { display: none; }
        .br-tbl-row:hover { background: ${T.cardAlt}; }
        .br-tree-day:hover { background: ${T.primaryS}; }
      `}</style>

      <div className="br-page" style={sx.page}>
        {/* Header */}
        <div className="br-noprint" style={{
          ...sx.card, padding: "16px 20px", marginBottom: 16,
          display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, flexWrap: "wrap",
        }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{
                width: 36, height: 36, borderRadius: 10, background: T.primaryS,
                color: T.primary, display: "grid", placeItems: "center",
              }}><FiPackage size={18} /></div>
              <div>
                <h1 style={sx.h1}>Returns Browser</h1>
                <div style={sx.muted}>
                  Quick KPIs · charts · advanced filters · global search across reports
                </div>
              </div>
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontWeight: 800, fontSize: 14, color: T.danger, letterSpacing: ".5px" }}>AL MAWASHI</div>
              <div style={{ fontSize: 10, color: T.textM }}>Trans Emirates Livestock Trading L.L.C.</div>
            </div>
            {newCount > 0 && (
              <button onClick={applyPendingFetch} title="Apply pending updates" style={{
                ...sx.btn, background: T.success, color: "#fff", borderColor: T.success,
                fontWeight: 800, animation: "pulse 1.5s infinite",
              }}>
                <FiTrendingUp size={13} /> +{newCount} new
              </button>
            )}
            <IconBtn icon={FiPackage} onClick={() => { setProductInit({ code: "", name: "" }); setProductOpen(true); }} title="Open product insights">
              Product
            </IconBtn>
            <IconBtn icon={FiZap} onClick={() => setAutoRefresh((a) => !a)} active={autoRefresh}
              title={autoRefresh ? "Auto-refresh: ON (5 min)" : "Auto-refresh: OFF"}>
              Auto
            </IconBtn>
            <IconBtn icon={FiCopy} onClick={copyShareLink} title="Copy current view URL">Share</IconBtn>
            <IconBtn icon={FiRefreshCw} onClick={reload} disabled={loadingServer}>
              {loadingServer ? "Loading…" : "Refresh"}
            </IconBtn>
          </div>
        </div>

        {/* Server messages */}
        {serverErr && (
          <div className="br-noprint" style={{
            ...sx.card, padding: "10px 14px", marginBottom: 12, borderColor: "#fecaca",
            background: T.dangerS, color: T.danger, fontWeight: 600, fontSize: 13,
            display: "flex", alignItems: "center", gap: 8,
          }}>
            <FiAlertTriangle size={16} /> {serverErr}
          </div>
        )}

        {/* Filter bar */}
        <div className="br-noprint" style={{ ...sx.card, padding: 14, marginBottom: 12 }}>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 10, alignItems: "center" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <FiCalendar size={14} color={T.textM} />
              <input type="date" value={filterFrom} onChange={(e) => setFilterFrom(e.target.value)}
                style={{ ...sx.input, padding: "6px 10px", fontSize: 13 }} />
              <span style={{ color: T.textS }}>→</span>
              <input type="date" value={filterTo} onChange={(e) => setFilterTo(e.target.value)}
                style={{ ...sx.input, padding: "6px 10px", fontSize: 13 }} />
            </div>
            <IconBtn onClick={() => setQuickDays(7)}>7d</IconBtn>
            <IconBtn onClick={() => setQuickDays(30)}>30d</IconBtn>
            <IconBtn onClick={() => setQuickDays(90)}>90d</IconBtn>
            <div style={{ flex: 1, minWidth: 0 }} />
            <MultiSelect label="POS" options={posOpts} selected={posSel} onChange={setPosSel} icon={FiLayers} />
            <MultiSelect label="Origin" options={originOpts} selected={originSel} onChange={setOriginSel} />
            <MultiSelect label="Action" options={actionOpts} selected={actionSel} onChange={setActionSel} />
            <select value={qtySel} onChange={(e) => setQtySel(e.target.value)} style={{ ...sx.input, padding: "8px 10px", fontSize: 13 }}>
              <option value="any">Qty: Any</option>
              <option value="kg">Qty: KG</option>
              <option value="pcs">Qty: PCS</option>
              <option value="other">Qty: Other</option>
            </select>
            <select value={hasImages} onChange={(e) => setHasImages(e.target.value)} style={{ ...sx.input, padding: "8px 10px", fontSize: 13 }}>
              <option value="any">Images: Any</option>
              <option value="yes">With images</option>
              <option value="no">No images</option>
            </select>
            <select value={remarksState} onChange={(e) => setRemarksState(e.target.value)} style={{ ...sx.input, padding: "8px 10px", fontSize: 13 }}>
              <option value="any">Remarks: Any</option>
              <option value="empty">Empty</option>
              <option value="nonempty">Non-empty</option>
            </select>
            <IconBtn icon={FiBookmark} onClick={() => setPresetsModal(true)}>Presets</IconBtn>
            {(activeFilters.length > 0 || search) && (
              <IconBtn icon={FiX} onClick={clearAll} danger>Clear all</IconBtn>
            )}
          </div>

          {/* Active filter pills */}
          {activeFilters.length > 0 && (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 10, paddingTop: 10, borderTop: `1px dashed ${T.border}` }}>
              <span style={{ ...sx.mutedS, alignSelf: "center", marginRight: 4 }}>Active:</span>
              {activeFilters.map((f, i) => (
                <FilterPill key={i} label={f.label} value={f.value} onRemove={f.remove} />
              ))}
            </div>
          )}
        </div>

        {/* Tabs */}
        <div className="br-noprint" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12, gap: 12, flexWrap: "wrap" }}>
          <Tabs
            value={tab}
            onChange={setTab}
            tabs={[
              { value: "overview", label: "Overview", icon: FiBarChart2 },
              { value: "browse", label: "Browse", icon: FiList, badge: filteredReportsAsc.length },
              { value: "compare", label: "Compare", icon: FiActivity },
            ]}
          />
          <div style={{ ...sx.muted, display: "flex", alignItems: "center", gap: 6 }}>
            <FiInfo size={12} /> Press <kbd style={{
              background: T.bgAlt, border: `1px solid ${T.border}`, borderRadius: 4,
              padding: "1px 6px", fontSize: 11, fontFamily: "monospace",
            }}>/</kbd> to focus search
          </div>
        </div>

        {/* Loading skeleton */}
        {loadingServer && returnsData.length === 0 && (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 12, marginBottom: 12 }}>
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} style={{ ...sx.card, padding: 14 }}>
                <Skeleton height={12} width="60%" />
                <Skeleton height={24} width="40%" style={{ marginTop: 10 }} />
                <Skeleton height={12} width="80%" style={{ marginTop: 8 }} />
              </div>
            ))}
          </div>
        )}

        {/* ====== OVERVIEW TAB ====== */}
        {tab === "overview" && (
          <div>
            {/* Stat strip */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 12, marginBottom: 12 }}>
              <StatChip icon={FiFileText} label="Reports" value={kpi.totalReports}
                sub={filterFrom || filterTo ? `${filterFrom || "…"} → ${filterTo || "…"}` : "All time"} />
              <StatChip icon={FiPackage} label="Total items" value={fmtNum(kpi.totalItems, 0)}
                sub={`${fmtNum(kpi.totalQtyKg)} kg · ${fmtNum(kpi.totalQtyPcs, 0)} pcs`} color={T.info} bg={T.infoS} />
              <StatChip icon={FiAlertTriangle} label="Condemnation" value={`${kpi.condemnation.count} (${fmtPct(kpi.condemnation.percent)})`}
                sub={`${fmtNum(kpi.condemnation.kg)} kg`} color={T.danger} bg={T.dangerS} />
              <StatChip icon={FiZap} label="Use in production" value={`${kpi.useProd.count} (${fmtPct(kpi.useProd.percent)})`}
                sub="Latest action" color={T.purple} bg={T.purpleS} />
              <StatChip icon={FiLayers} label="Top POS" value={kpi.topPos.key || "—"}
                sub={`${kpi.topPos.value} items · ${kpi.topPosByKg.kg} kg`} color={T.warning} bg={T.warningS} />
            </div>

            {/* Heatmap + Anomalies */}
            <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 2fr) minmax(0, 1fr)", gap: 12, marginBottom: 12 }}>
              <div style={{ ...sx.card, padding: 16 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12, gap: 8, flexWrap: "wrap" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <FiCalendar size={16} color={T.primary} />
                    <h2 style={sx.h2}>Activity heatmap</h2>
                  </div>
                  <div style={{ display: "inline-flex", padding: 3, background: T.bgAlt, borderRadius: 8, border: `1px solid ${T.border}` }}>
                    <button onClick={() => setHeatmapMode("items")} style={{
                      border: "none", padding: "5px 10px", borderRadius: 6, fontSize: 12, fontWeight: 700, cursor: "pointer",
                      background: heatmapMode === "items" ? T.card : "transparent",
                      color: heatmapMode === "items" ? T.primary : T.textM,
                    }}>By items</button>
                    <button onClick={() => setHeatmapMode("condemn")} style={{
                      border: "none", padding: "5px 10px", borderRadius: 6, fontSize: 12, fontWeight: 700, cursor: "pointer",
                      background: heatmapMode === "condemn" ? T.card : "transparent",
                      color: heatmapMode === "condemn" ? T.danger : T.textM,
                    }}>By condemnation</button>
                  </div>
                </div>
                <CalendarHeatmap
                  daily={dailyMetrics}
                  mode={heatmapMode}
                  anomalies={anomalies.dates}
                  selectedDate={selectedDate}
                  onPickDay={(d) => { setSelectedDate(d); setTab("browse"); const y=d.slice(0,4),m=d.slice(5,7); setOpenYears(p=>({...p,[y]:true})); setOpenMonths(p=>({...p,[`${y}-${m}`]:true})); }}
                />
              </div>

              <div style={{ ...sx.card, padding: 16 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                  <FiTarget size={16} color={T.danger} />
                  <h2 style={sx.h2}>Anomalies</h2>
                  {anomalies.top.length > 0 && (
                    <span style={{ ...sx.pill, background: T.dangerS, color: T.danger, borderColor: "#fecaca", marginLeft: "auto" }}>
                      {anomalies.top.length} flagged
                    </span>
                  )}
                </div>
                {anomalies.stats && (
                  <div style={{ ...sx.mutedS, marginBottom: 8 }}>
                    Items μ {anomalies.stats.itemsMean} · threshold {anomalies.stats.itemsThreshold}
                    {" · "}Cond μ {anomalies.stats.condMean} · threshold {anomalies.stats.condThreshold}
                  </div>
                )}
                {anomalies.top.length === 0 ? (
                  <div style={{ ...sx.muted, textAlign: "center", padding: 16 }}>
                    {dailyMetrics.length < 4 ? "Need ≥4 days of data." : "No anomalies — within 2σ."}
                  </div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 6, maxHeight: 220, overflow: "auto" }}>
                    {anomalies.top.map((a, i) => {
                      const reasonLabels = a.reasons.map((r) =>
                        r.kind === "items"
                          ? `${r.value} items (${r.sigma.toFixed(1)}σ)`
                          : `${r.value} cond (${r.sigma.toFixed(1)}σ)`
                      ).join(" · ");
                      return (
                        <button key={i} onClick={() => { setSelectedDate(a.date); setTab("browse"); const y=a.date.slice(0,4),m=a.date.slice(5,7); setOpenYears(p=>({...p,[y]:true})); setOpenMonths(p=>({...p,[`${y}-${m}`]:true})); }} style={{
                          display: "flex", justifyContent: "space-between", alignItems: "center",
                          padding: "8px 10px", borderRadius: 8, border: `1px solid ${T.border}`,
                          background: T.cardAlt, cursor: "pointer", textAlign: "left",
                        }}>
                          <div>
                            <div style={{ fontWeight: 700, color: T.text, fontSize: 13 }}>{a.date}</div>
                            <div style={{ ...sx.mutedS }}>{reasonLabels}</div>
                          </div>
                          <FiArrowRight size={14} color={T.textM} />
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Charts row */}
            <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 2fr) minmax(0, 1fr)", gap: 12, marginBottom: 12 }}>
              {/* Time series */}
              <div style={{ ...sx.card, padding: 16 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                  <h2 style={sx.h2}>Items over time</h2>
                  <span style={sx.mutedS}>{timeSeries.length} day(s)</span>
                </div>
                {timeSeries.length === 0 ? (
                  <div style={{ ...sx.muted, textAlign: "center", padding: 30 }}>No data in range.</div>
                ) : (
                  <div style={{ overflowX: "auto" }}>
                    <Sparkline
                      data={timeSeries}
                      width={Math.max(560, timeSeries.length * 28)}
                      height={140}
                      color={T.primary}
                      fill={T.primaryS}
                    />
                    <div style={{ display: "flex", justifyContent: "space-between", marginTop: 4, ...sx.mutedS }}>
                      <span>{timeSeries[0]?.label}</span>
                      <span>{timeSeries[timeSeries.length - 1]?.label}</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Top condemnation */}
              <div style={{ ...sx.card, padding: 16 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
                  <FiAlertTriangle size={16} color={T.danger} />
                  <h2 style={sx.h2}>Top Condemnation</h2>
                </div>
                <HBarList
                  items={kpi.topCondemn}
                  color={T.danger}
                  bg={T.dangerS}
                  formatValue={(v) => `${v}`}
                />
              </div>
            </div>

            {/* Bars row */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 12, marginBottom: 12 }}>
              <div style={{ ...sx.card, padding: 16 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
                  <FiCalendar size={14} color={T.primary} />
                  <h2 style={sx.h2}>Day-of-week</h2>
                </div>
                <DayOfWeekBars daily={dailyMetrics} />
              </div>
              <div style={{ ...sx.card, padding: 16 }}>
                <h2 style={{ ...sx.h2, marginBottom: 12 }}>Top POS by items</h2>
                <HBarList items={kpi.topPosByItems} color={T.primary} />
              </div>
              <div style={{ ...sx.card, padding: 16 }}>
                <h2 style={{ ...sx.h2, marginBottom: 12 }}>Top POS by KG</h2>
                <HBarList items={kpi.topPosByKg2} color={T.info} formatValue={(v) => `${fmtNum(v)} kg`} />
              </div>
              <div style={{ ...sx.card, padding: 16 }}>
                <h2 style={{ ...sx.h2, marginBottom: 12 }}>Top Origins</h2>
                <HBarList items={kpi.topOrigins} color={T.success} />
              </div>
            </div>

            {/* Pareto */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
              <div style={{ ...sx.card, padding: 16 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                  <h2 style={sx.h2}>Pareto — by Product</h2>
                  <span style={{ ...sx.pill, fontSize: 11 }}>80/20 rule</span>
                </div>
                <ParetoChart items={paretoData.byProduct} color={T.primary} />
              </div>
              <div style={{ ...sx.card, padding: 16 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                  <h2 style={sx.h2}>Pareto — by POS</h2>
                  <span style={{ ...sx.pill, fontSize: 11 }}>80/20 rule</span>
                </div>
                <ParetoChart items={paretoData.byPos} color={T.warning} />
              </div>
            </div>

            {/* Action breakdown */}
            <div style={{ ...sx.card, padding: 16, marginBottom: 12 }}>
              <h2 style={{ ...sx.h2, marginBottom: 12 }}>Action breakdown (latest)</h2>
              {kpi.topActions.length === 0 ? (
                <div style={{ ...sx.muted, textAlign: "center", padding: 20 }}>No action data.</div>
              ) : (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 14 }}>
                  {kpi.topActions.map((a, i) => {
                    const palette = [T.primary, T.danger, T.warning, T.success, T.info, T.purple];
                    const color = palette[i % palette.length];
                    return (
                      <MiniDonut
                        key={a.label}
                        percent={a.percent}
                        label={a.label || "—"}
                        color={color}
                        count={`${a.value} items`}
                      />
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ====== BROWSE TAB ====== */}
        {tab === "browse" && (
          <>
            {/* Search bar */}
            <div className="br-noprint" style={{ ...sx.card, padding: 12, marginBottom: 12 }}>
              <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
                <div style={{
                  position: "relative", flex: 1, minWidth: 280,
                }}>
                  <FiSearch size={14} color={T.textS} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)" }} />
                  <input
                    ref={searchInputRef}
                    type="text" value={search} onChange={(e) => { setSearch(e.target.value); setResPage(1); }}
                    placeholder={searchScope === "day" ? "Search… or use pos:Abu action:condemnation qty:>10" : "Search ALL reports… or pos:X action:Y qty:>5"}
                    style={{ ...sx.input, paddingLeft: 36, paddingRight: 60, width: "100%", fontSize: 14 }}
                  />
                  {search && (
                    <button onClick={() => setSearch("")} style={{
                      position: "absolute", right: 36, top: "50%", transform: "translateY(-50%)",
                      ...sx.btnGhost, padding: 4, color: T.textM, cursor: "pointer",
                    }}><FiX size={14} /></button>
                  )}
                  <details style={{ position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)" }}>
                    <summary style={{ listStyle: "none", cursor: "pointer", padding: 4, color: isPowerQuery(search) ? T.primary : T.textM }} title="Power search syntax">
                      <FiHelpCircle size={16} />
                    </summary>
                    <div style={{
                      position: "absolute", right: 0, top: "calc(100% + 6px)", zIndex: 100,
                      ...sx.card, padding: 14, minWidth: 320,
                      boxShadow: "0 12px 28px rgba(15,23,42,.18)",
                    }}>
                      <div style={{ ...sx.h3, marginBottom: 8 }}>Power search</div>
                      <div style={{ ...sx.mutedS, marginBottom: 10 }}>
                        Combine free text with key:value tokens.
                      </div>
                      <div style={{ display: "grid", gridTemplateColumns: "auto 1fr", gap: "6px 10px", fontSize: 12 }}>
                        {[
                          ["code:1234", "Item code substring"],
                          ["name:beef", "Product name (also: product:)"],
                          ["pos:abu", "POS / butchery"],
                          ["origin:uae", "Origin"],
                          ["action:condemn", "Action"],
                          ["qty:>10", "Quantity (>, <, >=, <=, =)"],
                          ["type:kg", "kg | pcs"],
                          ["expiry:2026", "Expiry substring"],
                          ["remarks:nonempty", "empty | nonempty | text"],
                          ["images:yes", "yes | no"],
                          [`name:"ground beef"`, "Use quotes for spaces"],
                        ].map(([k, v], i) => (
                          <React.Fragment key={i}>
                            <code style={{ background: T.bgAlt, padding: "2px 6px", borderRadius: 4, fontFamily: "ui-monospace, monospace", color: T.primary, fontSize: 11 }}>{k}</code>
                            <span style={{ color: T.textM }}>{v}</span>
                          </React.Fragment>
                        ))}
                      </div>
                    </div>
                  </details>
                </div>
                <div style={{ display: "inline-flex", padding: 3, background: T.bgAlt, borderRadius: 8, border: `1px solid ${T.border}` }}>
                  <button onClick={() => setSearchScope("day")} style={{
                    border: "none", padding: "6px 12px", borderRadius: 6, fontSize: 12, fontWeight: 700, cursor: "pointer",
                    background: searchScope === "day" ? T.card : "transparent",
                    color: searchScope === "day" ? T.primary : T.textM,
                  }}>This day</button>
                  <button onClick={() => setSearchScope("all")} style={{
                    border: "none", padding: "6px 12px", borderRadius: 6, fontSize: 12, fontWeight: 700, cursor: "pointer",
                    background: searchScope === "all" ? T.card : "transparent",
                    color: searchScope === "all" ? T.primary : T.textM,
                  }}>All days</button>
                </div>
                {isPowerQuery(search) && (
                  <span style={{ ...sx.pill, background: T.primaryS, color: T.primary, borderColor: "#c7d2fe" }}>
                    <FiZap size={11} /> power
                  </span>
                )}
                {searchScope === "day" && search && selectedReport && (
                  <span style={{ ...sx.mutedS, fontWeight: 700 }}>
                    {sortedRows.length} / {(selectedReport.items || []).length} rows
                  </span>
                )}
                {searchScope === "all" && search && (
                  <span style={{ ...sx.mutedS, fontWeight: 700 }}>
                    {globalResults.length} match(es)
                  </span>
                )}
              </div>
            </div>

            {/* Global search results */}
            {searchScope === "all" && search.trim() && (
              <div style={{ ...sx.card, padding: 16, marginBottom: 12 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10, gap: 8, flexWrap: "wrap" }}>
                  <h2 style={sx.h2}>Search results · {globalResults.length}</h2>
                  <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                    {totalPages > 1 && (
                      <>
                        <IconBtn onClick={() => setResPage((p) => Math.max(1, p - 1))} disabled={resPage <= 1}>Prev</IconBtn>
                        <span style={sx.mutedS}>Page {resPage}/{totalPages}</span>
                        <IconBtn onClick={() => setResPage((p) => Math.min(totalPages, p + 1))} disabled={resPage >= totalPages}>Next</IconBtn>
                      </>
                    )}
                    <IconBtn icon={FiDownload} onClick={exportSearchResultsXLSX}>XLSX</IconBtn>
                    <IconBtn icon={FiDownload} onClick={handleExportSearchCSV}>CSV</IconBtn>
                  </div>
                </div>
                <div style={{ overflowX: "auto" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                    <thead>
                      <tr style={{ background: T.bgAlt }}>
                        {["#", "Date", "Code", "Product", "Origin", "POS", "Qty", "Type", "Expiry", "Action", "Match", "Score", ""].map((h) => (
                          <th key={h} style={{
                            padding: "10px 8px", textAlign: "left", fontSize: 11, fontWeight: 700,
                            color: T.textM, textTransform: "uppercase", letterSpacing: ".04em",
                            borderBottom: `1px solid ${T.border}`,
                          }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {pagedResults.length === 0 ? (
                        <tr><td colSpan={13} style={{ padding: 30, textAlign: "center", color: T.textM }}>No results.</td></tr>
                      ) : pagedResults.map((r, i) => {
                        const row = r.row;
                        const pos = safeButchery(row);
                        const qtyType = (row.qtyType === "أخرى" || row.qtyType === "أخرى / Other") ? (row.customQtyType || "") : (row.qtyType || "");
                        return (
                          <tr key={`${r.date}-${r.idx}-${i}`} className="br-tbl-row">
                            <td style={{ padding: "8px", borderBottom: `1px solid ${T.borderS}`, color: T.textS }}>{(resPage - 1) * RES_PAGE_SIZE + i + 1}</td>
                            <td style={{ padding: "8px", borderBottom: `1px solid ${T.borderS}`, fontWeight: 600 }}>{r.date}</td>
                            <td style={{ padding: "8px", borderBottom: `1px solid ${T.borderS}` }}>{highlight(row.itemCode || "", search)}</td>
                            <td style={{ padding: "8px", borderBottom: `1px solid ${T.borderS}` }}>
                              {highlight(row.productName || "", search)}
                              {Array.isArray(row.images) && row.images.length > 0 && (
                                <button onClick={() => openViewer(row)} style={{
                                  ...sx.btn, marginLeft: 6, padding: "2px 8px", fontSize: 11,
                                  background: T.primaryS, color: T.primary, borderColor: "#c7d2fe",
                                }}><FiEye size={11} /> {row.images.length}</button>
                              )}
                            </td>
                            <td style={{ padding: "8px", borderBottom: `1px solid ${T.borderS}` }}>{highlight(row.origin || "", search)}</td>
                            <td style={{ padding: "8px", borderBottom: `1px solid ${T.borderS}` }}>{highlight(pos || "", search)}</td>
                            <td style={{ padding: "8px", borderBottom: `1px solid ${T.borderS}`, textAlign: "right" }}>{row.quantity ?? ""}</td>
                            <td style={{ padding: "8px", borderBottom: `1px solid ${T.borderS}` }}>{qtyType}</td>
                            <td style={{ padding: "8px", borderBottom: `1px solid ${T.borderS}` }}>{row.expiry || ""}</td>
                            <td style={{ padding: "8px", borderBottom: `1px solid ${T.borderS}` }}>{highlight(actionText(row) || "", search)}</td>
                            <td style={{ padding: "8px", borderBottom: `1px solid ${T.borderS}`, ...sx.mutedS }}>{r.hits.join(", ") || "—"}</td>
                            <td style={{ padding: "8px", borderBottom: `1px solid ${T.borderS}`, fontWeight: 700, color: T.primary }}>{r.score}</td>
                            <td style={{ padding: "8px", borderBottom: `1px solid ${T.borderS}` }}>
                              <IconBtn icon={FiArrowRight} onClick={() => jumpToDay(r.date)}>Open</IconBtn>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Tree + Detail panel */}
            <div style={{ display: "grid", gridTemplateColumns: "minmax(260px, 300px) 1fr", gap: 12 }}>
              {/* Left tree */}
              <div className="br-noprint" style={{
                ...sx.card, maxHeight: "75vh", overflow: "auto", padding: 4,
              }}>
                {hierarchyAsc.length === 0 ? (
                  <div style={{ ...sx.muted, textAlign: "center", padding: 30 }}>
                    No reports for the selected period.
                  </div>
                ) : hierarchyAsc.map(({ year, months }) => {
                  const yOpen = !!openYears[year];
                  const yearCount = months.reduce((acc, mo) => acc + mo.days.length, 0);
                  return (
                    <div key={year}>
                      <div onClick={() => setOpenYears((p) => ({ ...p, [year]: !p[year] }))} style={{
                        display: "flex", justifyContent: "space-between", alignItems: "center",
                        padding: "10px 12px", cursor: "pointer", fontWeight: 700, color: T.text, fontSize: 13,
                        background: yOpen ? T.cardAlt : "transparent",
                      }}>
                        <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                          {yOpen ? <FiChevronDown size={14} /> : <FiChevronRight size={14} />}
                          Year {year}
                        </span>
                        <span style={{ ...sx.pill, fontSize: 11 }}>{yearCount}</span>
                      </div>
                      {yOpen && months.map(({ month, days }) => {
                        const key = `${year}-${month}`;
                        const mOpen = !!openMonths[key];
                        return (
                          <div key={key}>
                            <div onClick={() => setOpenMonths((p) => ({ ...p, [key]: !p[key] }))} style={{
                              display: "flex", justifyContent: "space-between", alignItems: "center",
                              padding: "8px 12px 8px 28px", cursor: "pointer", color: T.textM, fontSize: 13,
                            }}>
                              <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                                {mOpen ? <FiChevronDown size={12} /> : <FiChevronRight size={12} />}
                                Month {month}
                              </span>
                              <span style={sx.mutedS}>{days.length}</span>
                            </div>
                            {mOpen && days.map((d) => {
                              const isSelected = selectedDate === d;
                              const rep = filteredReportsAsc.find((r) => r.reportDate === d);
                              const cnt = rep?.items?.filter(rowPassesAdvanced).length || 0;
                              const isAnom = anomalies.dates.has(d);
                              return (
                                <div key={d} className="br-tree-day" onClick={() => setSelectedDate(d)} style={{
                                  display: "flex", justifyContent: "space-between", alignItems: "center",
                                  padding: "8px 12px 8px 44px", cursor: "pointer",
                                  background: isSelected ? T.primaryS : "transparent",
                                  borderLeft: isSelected ? `3px solid ${T.primary}` : "3px solid transparent",
                                  fontSize: 13, color: isSelected ? T.primaryD : T.text,
                                  fontWeight: isSelected ? 700 : 500,
                                }}>
                                  <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                                    {d}
                                    {isAnom && (
                                      <span title="Anomaly day" style={{
                                        width: 6, height: 6, borderRadius: 999, background: T.danger,
                                        display: "inline-block", flexShrink: 0,
                                      }} />
                                    )}
                                  </span>
                                  <span style={{ ...sx.mutedS, fontWeight: 700, color: isSelected ? T.primary : T.textS }}>{cnt}</span>
                                </div>
                              );
                            })}
                          </div>
                        );
                      })}
                    </div>
                  );
                })}
              </div>

              {/* Right detail panel */}
              <div className="br-card" style={{ ...sx.card }}>
                {!selectedReport ? (
                  <div style={{ textAlign: "center", padding: 80, color: T.textM, fontSize: 14 }}>
                    <FiCalendar size={32} style={{ opacity: 0.3 }} />
                    <div style={{ marginTop: 10 }}>Pick a date from the list to view its details.</div>
                  </div>
                ) : (
                  <>
                    {/* Detail header */}
                    <div className="br-noprint" style={{
                      display: "flex", justifyContent: "space-between", alignItems: "center",
                      padding: "12px 16px", borderBottom: `1px solid ${T.border}`, gap: 10, flexWrap: "wrap",
                    }}>
                      <div>
                        <div style={{ fontWeight: 800, color: T.text, fontSize: 15 }}>
                          {selectedReport.reportDate}
                        </div>
                        {selectedSummary && (
                          <div style={{ display: "flex", gap: 8, marginTop: 6, flexWrap: "wrap" }}>
                            <span style={{ ...sx.pill, background: T.primaryS, color: T.primaryD, borderColor: "#c7d2fe" }}>
                              {selectedSummary.count}{selectedSummary.count !== selectedSummary.total ? ` / ${selectedSummary.total}` : ""} items
                            </span>
                            {selectedSummary.kg > 0 && (
                              <span style={{ ...sx.pill, background: T.infoS, color: T.info, borderColor: "#a5f3fc" }}>
                                {fmtNum(selectedSummary.kg)} kg
                              </span>
                            )}
                            {selectedSummary.pcs > 0 && (
                              <span style={{ ...sx.pill, background: T.successS, color: T.success, borderColor: "#a7f3d0" }}>
                                {fmtNum(selectedSummary.pcs, 0)} pcs
                              </span>
                            )}
                            {selectedSummary.other > 0 && (
                              <span style={{ ...sx.pill, background: T.warningS, color: T.warning, borderColor: "#fde68a" }}>
                                {fmtNum(selectedSummary.other)} other
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                        {/* Group by */}
                        <select value={groupBy} onChange={(e) => setGroupBy(e.target.value)}
                          style={{ ...sx.input, padding: "8px 10px", fontSize: 13 }}>
                          <option value="none">Group: None</option>
                          <option value="pos">Group by POS</option>
                          <option value="origin">Group by Origin</option>
                          <option value="action">Group by Action</option>
                        </select>
                        {/* Density */}
                        <IconBtn icon={density === "compact" ? FiList : FiGrid}
                          onClick={() => setDensity((d) => d === "compact" ? "comfy" : "compact")}
                          title={`Density: ${density}`}>
                          {density === "compact" ? "Compact" : "Comfy"}
                        </IconBtn>
                        {/* Columns toggle */}
                        <div style={{ position: "relative" }}>
                          <IconBtn icon={FiColumns} onClick={() => setColsOpen((o) => !o)} active={colsOpen}>Columns</IconBtn>
                          {colsOpen && (
                            <div style={{
                              position: "absolute", top: "calc(100% + 4px)", right: 0, zIndex: 50,
                              ...sx.card, padding: 8, minWidth: 180,
                              boxShadow: "0 10px 24px rgba(15,23,42,.12)",
                            }}>
                              {ALL_COLUMNS.filter((c) => !c.always).map((c) => {
                                const checked = visibleCols.has(c.key);
                                return (
                                  <label key={c.key} style={{
                                    display: "flex", alignItems: "center", gap: 8, padding: "6px 8px",
                                    borderRadius: 6, cursor: "pointer", fontSize: 13,
                                  }}>
                                    <input type="checkbox" checked={checked} onChange={() => {
                                      const next = new Set(visibleCols);
                                      if (next.has(c.key)) next.delete(c.key); else next.add(c.key);
                                      setVisibleCols(next);
                                    }} style={{ accentColor: T.primary }} />
                                    {c.label}
                                  </label>
                                );
                              })}
                            </div>
                          )}
                        </div>
                        {/* Exports */}
                        <IconBtn icon={FiPrinter} onClick={handlePrint}>Print</IconBtn>
                        <IconBtn icon={FiDownload} onClick={handleExportPDF}>PDF</IconBtn>
                        <IconBtn icon={FiDownload} onClick={handleExportXLSXSelected}>XLSX</IconBtn>
                        <IconBtn icon={FiDownload} onClick={handleExportCSV}>CSV</IconBtn>
                        <IconBtn icon={FiLock} onClick={handleExportXLSXAllLocked}>XLSX (ALL)</IconBtn>
                      </div>
                    </div>

                    {/* Table */}
                    <div style={{ overflow: "auto", maxHeight: "65vh" }}>
                      {groupBy !== "none" && groupedRows ? (
                        groupedRows.map((g) => (
                          <div key={g.key} style={{ borderBottom: `2px solid ${T.border}` }}>
                            <div style={{
                              display: "flex", justifyContent: "space-between", alignItems: "center",
                              padding: "10px 16px", background: T.cardAlt, position: "sticky", top: 0, zIndex: 5,
                              borderBottom: `1px solid ${T.border}`,
                            }}>
                              <div style={{ fontWeight: 700, color: T.text, fontSize: 14 }}>{g.key}</div>
                              <div style={{ display: "flex", gap: 6 }}>
                                <span style={{ ...sx.pill, background: T.primaryS, color: T.primaryD, borderColor: "#c7d2fe" }}>{g.rows.length} items</span>
                                {g.kg > 0 && <span style={{ ...sx.pill, background: T.infoS, color: T.info, borderColor: "#a5f3fc" }}>{fmtNum(g.kg)} kg</span>}
                                {g.pcs > 0 && <span style={{ ...sx.pill, background: T.successS, color: T.success, borderColor: "#a7f3d0" }}>{g.pcs} pcs</span>}
                              </div>
                            </div>
                            <DataTable
                              rows={g.rows}
                              columns={visibleColumns}
                              changeMap={changeMap}
                              search={searchScope === "day" ? search : ""}
                              highlight={highlight}
                              openViewer={openViewer}
                              rowPad={rowPad}
                              sort={sort}
                              toggleSort={toggleSort}
                              showHeader={false}
                              auditTrailByKey={auditTrailByKey}
                              onOpenAudit={(row, t) => { setAuditItem({ row, trail: t }); setAuditOpen(true); }}
                              selectedRows={selectedRows}
                              onToggleSelect={toggleRowSelect}
                              onToggleAll={toggleAllVisible}
                              onRangeSelect={rangeSelect}
                              onOpenProduct={(code, name) => { setProductInit({ code, name }); setProductOpen(true); }}
                            />
                          </div>
                        ))
                      ) : (
                        <DataTable
                          rows={sortedRows}
                          columns={visibleColumns}
                          changeMap={changeMap}
                          search={searchScope === "day" ? search : ""}
                          highlight={highlight}
                          openViewer={openViewer}
                          rowPad={rowPad}
                          sort={sort}
                          toggleSort={toggleSort}
                          showHeader={true}
                          auditTrailByKey={auditTrailByKey}
                          onOpenAudit={(row, t) => { setAuditItem({ row, trail: t }); setAuditOpen(true); }}
                          selectedRows={selectedRows}
                          onToggleSelect={toggleRowSelect}
                          onToggleAll={toggleAllVisible}
                          onRangeSelect={rangeSelect}
                          onOpenProduct={(code, name) => { setProductInit({ code, name }); setProductOpen(true); }}
                        />
                      )}
                      {sortedRows.length === 0 && (
                        <div style={{ ...sx.muted, textAlign: "center", padding: 40 }}>
                          No rows match current filters.
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>
            </div>
          </>
        )}

        {/* ====== COMPARE TAB ====== */}
        {tab === "compare" && (
          <div>
            <div style={{ ...sx.card, padding: 16, marginBottom: 12 }}>
              <h2 style={{ ...sx.h2, marginBottom: 12 }}>Compare two periods</h2>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                <div>
                  <div style={{ ...sx.h3, marginBottom: 8, color: T.primary }}>Period A</div>
                  <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                    <input type="date" value={cmpAFrom} onChange={(e) => setCmpAFrom(e.target.value)} style={{ ...sx.input, padding: "6px 10px", fontSize: 13 }} />
                    <span style={{ color: T.textS }}>→</span>
                    <input type="date" value={cmpATo} onChange={(e) => setCmpATo(e.target.value)} style={{ ...sx.input, padding: "6px 10px", fontSize: 13 }} />
                  </div>
                </div>
                <div>
                  <div style={{ ...sx.h3, marginBottom: 8, color: T.success }}>Period B</div>
                  <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                    <input type="date" value={cmpBFrom} onChange={(e) => setCmpBFrom(e.target.value)} style={{ ...sx.input, padding: "6px 10px", fontSize: 13 }} />
                    <span style={{ color: T.textS }}>→</span>
                    <input type="date" value={cmpBTo} onChange={(e) => setCmpBTo(e.target.value)} style={{ ...sx.input, padding: "6px 10px", fontSize: 13 }} />
                  </div>
                </div>
              </div>
            </div>

            {(!cmpAFrom && !cmpATo && !cmpBFrom && !cmpBTo) ? (
              <div style={{ ...sx.card, padding: 40, textAlign: "center" }}>
                <FiActivity size={32} color={T.textS} />
                <div style={{ ...sx.muted, marginTop: 10 }}>Pick two date ranges to compare.</div>
              </div>
            ) : (
              <>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
                  {[{ key: "A", data: cmpA, color: T.primary, bg: T.primaryS },
                    { key: "B", data: cmpB, color: T.success, bg: T.successS }].map((p) => (
                    <div key={p.key} style={{ ...sx.card, padding: 16 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                        <h2 style={sx.h2}>Period {p.key}</h2>
                        <span style={{ ...sx.pill, background: p.bg, color: p.color, borderColor: p.bg }}>
                          {p.data.days} day(s)
                        </span>
                      </div>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                        <div><div style={sx.mutedS}>Items</div><div style={{ fontSize: 22, fontWeight: 800 }}>{fmtNum(p.data.items, 0)}</div></div>
                        <div><div style={sx.mutedS}>Avg/day</div><div style={{ fontSize: 22, fontWeight: 800 }}>{p.data.avgPerDay}</div></div>
                        <div><div style={sx.mutedS}>Total KG</div><div style={{ fontSize: 22, fontWeight: 800 }}>{fmtNum(p.data.kg)}</div></div>
                        <div><div style={sx.mutedS}>Condemnation</div><div style={{ fontSize: 22, fontWeight: 800, color: T.danger }}>{p.data.condCount}</div></div>
                      </div>
                      {p.data.daily.length > 0 && (
                        <div style={{ marginTop: 12, overflowX: "auto" }}>
                          <Sparkline data={p.data.daily} width={Math.max(360, p.data.daily.length * 22)} height={70} color={p.color} fill={p.bg} showDots={false} />
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                {/* Diff strip */}
                <div style={{ ...sx.card, padding: 16, marginBottom: 12 }}>
                  <h2 style={{ ...sx.h2, marginBottom: 10 }}>B vs A — Δ</h2>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 10 }}>
                    <div><div style={sx.mutedS}>Items</div>{diffPill(cmpA.items, cmpB.items)}</div>
                    <div><div style={sx.mutedS}>Avg / day</div>{diffPill(cmpA.avgPerDay, cmpB.avgPerDay)}</div>
                    <div><div style={sx.mutedS}>KG</div>{diffPill(cmpA.kg, cmpB.kg, " kg")}</div>
                    <div><div style={sx.mutedS}>PCS</div>{diffPill(cmpA.pcs, cmpB.pcs)}</div>
                    <div><div style={sx.mutedS}>Condemnation</div>{diffPill(cmpA.condCount, cmpB.condCount)}</div>
                    <div><div style={sx.mutedS}>Condemnation KG</div>{diffPill(cmpA.condKg, cmpB.condKg, " kg")}</div>
                  </div>
                </div>

                {/* Top breakdowns */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  <div style={{ ...sx.card, padding: 16 }}>
                    <h2 style={{ ...sx.h2, marginBottom: 10 }}>Top POS — A vs B</h2>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                      <div><div style={{ ...sx.mutedS, marginBottom: 6, color: T.primary }}>A</div><HBarList items={cmpA.topPos} color={T.primary} /></div>
                      <div><div style={{ ...sx.mutedS, marginBottom: 6, color: T.success }}>B</div><HBarList items={cmpB.topPos} color={T.success} /></div>
                    </div>
                  </div>
                  <div style={{ ...sx.card, padding: 16 }}>
                    <h2 style={{ ...sx.h2, marginBottom: 10 }}>Top Action — A vs B</h2>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                      <div><div style={{ ...sx.mutedS, marginBottom: 6, color: T.primary }}>A</div><HBarList items={cmpA.topAct} color={T.primary} /></div>
                      <div><div style={{ ...sx.mutedS, marginBottom: 6, color: T.success }}>B</div><HBarList items={cmpB.topAct} color={T.success} /></div>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {/* Modals */}
        <ImageViewerModal open={viewerOpen} images={viewerData.images} title={viewerData.title} onClose={() => setViewerOpen(false)} />
        <PasswordModal show={pwModal} title="Password required" onSubmit={handlePasswordSubmit} onCancel={() => setPwModal(false)} />
        <PresetsModal
          open={presetsModal}
          onClose={() => setPresetsModal(false)}
          presets={presets}
          onApply={applyPreset}
          onSave={savePreset}
          onDelete={deletePreset}
          currentSnapshot={currentSnapshot}
        />
        <AuditTrailModalInner
          open={auditOpen}
          onClose={() => setAuditOpen(false)}
          item={auditItem?.row}
          trail={auditItem?.trail || []}
        />
        <ProductInsightsModalInner
          open={productOpen}
          onClose={() => setProductOpen(false)}
          returnsData={returnsData}
          changeMapByDate={changeMapByDate}
          auditTrailByKey={auditTrailByKey}
          initialCode={productInit.code}
          initialName={productInit.name}
        />

        {/* Floating bulk action bar */}
        {selectedRows.size > 0 && tab === "browse" && (
          <div className="br-noprint" style={{
            position: "fixed", bottom: 20, left: "50%", transform: "translateX(-50%)",
            zIndex: 1000, animation: "slideUp .2s ease-out",
            background: T.text, color: "#fff",
            border: `1px solid ${T.text}`, borderRadius: 14,
            boxShadow: "0 12px 32px rgba(15,23,42,.3)",
            padding: "10px 14px", display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap",
            maxWidth: "calc(100vw - 32px)",
          }}>
            <div style={{
              display: "inline-flex", alignItems: "center", gap: 8,
              padding: "4px 10px", background: "rgba(255,255,255,.15)", borderRadius: 8,
              fontSize: 13, fontWeight: 700,
            }}>
              <FiCheck size={14} /> {selectedRows.size} selected
            </div>
            <div style={{ width: 1, height: 22, background: "rgba(255,255,255,.2)" }} />
            <button onClick={selectAllVisibleRows} style={{
              background: "transparent", border: "none", color: "#fff",
              padding: "6px 8px", fontSize: 12, fontWeight: 600, cursor: "pointer",
              display: "inline-flex", alignItems: "center", gap: 4,
            }}>Select all visible ({sortedRows.length})</button>
            <button onClick={copySelectionTSV} style={{
              background: T.primary, border: "none", color: "#fff",
              padding: "8px 12px", borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: "pointer",
              display: "inline-flex", alignItems: "center", gap: 6,
            }}><FiCopy size={13} /> Copy TSV</button>
            <button onClick={exportSelectionCSV} style={{
              background: "rgba(255,255,255,.15)", border: "none", color: "#fff",
              padding: "8px 12px", borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: "pointer",
              display: "inline-flex", alignItems: "center", gap: 6,
            }}><FiDownload size={13} /> CSV</button>
            <button onClick={clearSelection} style={{
              background: "transparent", border: "1px solid rgba(255,255,255,.2)", color: "#fff",
              padding: "8px 10px", borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: "pointer",
              display: "inline-flex", alignItems: "center", gap: 6,
            }}><FiX size={13} /> Clear</button>
          </div>
        )}

        {Toaster}
      </div>
    </>
  );
}

/* ============================================================
   DataTable — used by Browse tab
   ============================================================ */
function DataTable({ rows, columns, changeMap, search, highlight, openViewer, rowPad, sort, toggleSort, showHeader, auditTrailByKey, onOpenAudit, selectedRows, onToggleSelect, onToggleAll, onRangeSelect, onOpenProduct }) {
  const allChecked = showHeader && rows.length > 0 && rows.every((r) => selectedRows?.has(r.__i));
  const someChecked = showHeader && !allChecked && rows.some((r) => selectedRows?.has(r.__i));
  return (
    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
      {showHeader && (
        <thead>
          <tr style={{ background: T.bgAlt }}>
            {selectedRows && (
              <th style={{
                padding: "10px 8px", textAlign: "center", width: 36,
                borderBottom: `1px solid ${T.border}`, position: "sticky", top: 0, background: T.bgAlt, zIndex: 5,
              }}>
                <input
                  type="checkbox"
                  checked={allChecked}
                  ref={(el) => { if (el) el.indeterminate = someChecked; }}
                  onChange={() => onToggleAll && onToggleAll(rows.map((r) => r.__i), allChecked)}
                  style={{ accentColor: T.primary, cursor: "pointer" }}
                  title={allChecked ? "Deselect all visible" : "Select all visible"}
                />
              </th>
            )}
            {columns.map((c) => (
              <th key={c.key} style={{
                padding: "10px 8px", textAlign: c.key === "quantity" ? "right" : "left",
                fontSize: 11, fontWeight: 700, color: T.textM,
                textTransform: "uppercase", letterSpacing: ".04em",
                borderBottom: `1px solid ${T.border}`,
                position: "sticky", top: 0, background: T.bgAlt, zIndex: 5,
                minWidth: c.width,
              }}>
                {c.sortable ? (
                  <button onClick={() => toggleSort(c.key)} style={{
                    ...sx.btnGhost, padding: 0, fontSize: 11, fontWeight: 700,
                    color: sort.key === c.key ? T.primary : T.textM, cursor: "pointer",
                    display: "inline-flex", alignItems: "center", gap: 4, textTransform: "uppercase", letterSpacing: ".04em",
                  }}>
                    {c.label}
                    {sort.key === c.key && (sort.dir === "asc" ? "▲" : "▼")}
                  </button>
                ) : c.label}
              </th>
            ))}
          </tr>
        </thead>
      )}
      <tbody>
        {rows.map((row, i) => {
          const curr = actionText(row);
          const k = itemKey(row);
          const ch = changeMap.get(k);
          const showChange = ch && ch.to === curr;
          const trail = auditTrailByKey?.get(k) || [];
          const hasTrail = trail.length > 0;
          const isChecked = selectedRows?.has(row.__i);
          return (
            <tr key={row.__i ?? i} className="br-tbl-row" style={{ background: isChecked ? T.primaryS : undefined }}>
              {selectedRows && (
                <td style={{
                  padding: rowPad, borderBottom: `1px solid ${T.borderS}`, textAlign: "center", verticalAlign: "top",
                }}>
                  <input
                    type="checkbox"
                    checked={!!isChecked}
                    onClick={(e) => {
                      if (e.shiftKey && onRangeSelect) {
                        e.preventDefault();
                        onRangeSelect(row.__i);
                      } else if (onToggleSelect) {
                        onToggleSelect(row.__i);
                      }
                    }}
                    onChange={() => {}}
                    style={{ accentColor: T.primary, cursor: "pointer" }}
                  />
                </td>
              )}
              {columns.map((c) => {
                const tdStyle = {
                  padding: rowPad, borderBottom: `1px solid ${T.borderS}`,
                  textAlign: c.key === "quantity" ? "right" : "left",
                  color: T.text, verticalAlign: "top",
                };
                if (c.key === "sl") return <td key={c.key} style={{ ...tdStyle, color: T.textS, fontVariantNumeric: "tabular-nums" }}>{i + 1}</td>;
                if (c.key === "itemCode") return <td key={c.key} style={{ ...tdStyle, fontFamily: "ui-monospace, monospace", fontSize: 12 }}>{search ? highlight(row.itemCode || "", search) : (row.itemCode || "")}</td>;
                if (c.key === "productName") return (
                  <td key={c.key} style={tdStyle}>
                    {onOpenProduct ? (
                      <button onClick={() => onOpenProduct(row.itemCode || "", row.productName || "")} title="Open product insights" style={{
                        background: "transparent", border: "none", padding: 0, cursor: "pointer",
                        textAlign: "left", color: T.text, fontWeight: 600, fontSize: "inherit", fontFamily: "inherit",
                        textDecoration: "underline", textDecorationStyle: "dotted", textUnderlineOffset: 2, textDecorationColor: T.textS,
                      }}>
                        {search ? highlight(row.productName || "", search) : row.productName}
                      </button>
                    ) : (
                      <span style={{ fontWeight: 600 }}>{search ? highlight(row.productName || "", search) : row.productName}</span>
                    )}
                    {Array.isArray(row.images) && row.images.length > 0 && (
                      <button onClick={() => openViewer(row)} style={{
                        ...sx.btn, marginLeft: 6, padding: "2px 8px", fontSize: 11,
                        background: T.primaryS, color: T.primary, borderColor: "#c7d2fe",
                      }}><FiEye size={11} /> {row.images.length}</button>
                    )}
                  </td>
                );
                if (c.key === "origin") return <td key={c.key} style={tdStyle}>{search ? highlight(row.origin || "", search) : row.origin}</td>;
                if (c.key === "pos") return <td key={c.key} style={tdStyle}>{search ? highlight(safeButchery(row) || "", search) : safeButchery(row)}</td>;
                if (c.key === "quantity") return <td key={c.key} style={{ ...tdStyle, fontVariantNumeric: "tabular-nums", fontWeight: 600 }}>{row.quantity}</td>;
                if (c.key === "qtyType") return <td key={c.key} style={tdStyle}>
                  <span style={{ ...sx.pill, fontSize: 11 }}>{(row.qtyType === "أخرى" || row.qtyType === "أخرى / Other") ? row.customQtyType : row.qtyType || ""}</span>
                </td>;
                if (c.key === "expiry") return <td key={c.key} style={{ ...tdStyle, fontVariantNumeric: "tabular-nums", color: T.textM }}>{row.expiry}</td>;
                if (c.key === "remarks") return <td key={c.key} style={{ ...tdStyle, color: T.textM, fontSize: 12 }}>{search ? highlight(row.remarks || "", search) : row.remarks}</td>;
                if (c.key === "action") return (
                  <td key={c.key} style={{ ...tdStyle, background: showChange ? T.successS : "transparent" }}>
                    {showChange ? (
                      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                        <div style={{ fontSize: 12 }}>
                          <span style={{ color: T.textM, textDecoration: "line-through" }}>{ch.from}</span>
                          <span style={{ margin: "0 6px", color: T.textS }}>→</span>
                          <span style={{ fontWeight: 700, color: T.text }}>{ch.to}</span>
                        </div>
                        <div style={{ display: "flex", gap: 4, alignItems: "center", flexWrap: "wrap" }}>
                          <span style={{ ...sx.pill, fontSize: 10, padding: "2px 8px", background: T.success, color: "#fff", borderColor: T.success }}>Changed</span>
                          {formatChangeDate(ch) && <span style={sx.mutedS}>{formatChangeDate(ch)}</span>}
                          {hasTrail && onOpenAudit && (
                            <button onClick={() => onOpenAudit(row, trail)} title={`${trail.length} change(s) total`} style={{
                              ...sx.btn, padding: "1px 6px", fontSize: 10,
                              background: T.primaryS, color: T.primary, borderColor: "#c7d2fe",
                            }}><FiClock size={10} /> {trail.length}</button>
                          )}
                        </div>
                      </div>
                    ) : (
                      <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                        <span>{search ? highlight(curr || "", search) : curr}</span>
                        {hasTrail && onOpenAudit && (
                          <button onClick={() => onOpenAudit(row, trail)} title={`${trail.length} change(s)`} style={{
                            ...sx.btn, padding: "1px 6px", fontSize: 10,
                            background: T.primaryS, color: T.primary, borderColor: "#c7d2fe",
                          }}><FiClock size={10} /> {trail.length}</button>
                        )}
                      </div>
                    )}
                  </td>
                );
                return <td key={c.key} style={tdStyle}></td>;
              })}
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
