// src/pages/NamedDashboard.jsx
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import logo from "../assets/almawashi-logo.jpg";
import API_BASE from "../config/api";
import { clearAppSession } from "../utils/authFetch";
import { confirmLogoutWithOutbox } from "../utils/offlineOutbox";
import { getActiveCompany, clearActiveCompany } from "../utils/companyContext";
import { useInventoryOfficer } from "./workforce/workforceAccess";
import { DM_CHECKED_URL, openExternal } from "../config/externalLinks";
import TodayFoodSafetyStrip from "./dashboard/TodayFoodSafetyStrip";

/* ══════════════════════════════════════════
   OPERATOR PICKER — who is working now?
══════════════════════════════════════════ */
function OperatorPicker({ employees, accountName, onConfirm }) {
  const [selected, setSelected] = useState("");
  const [custom,   setCustom]   = useState("");
  const [mode,     setMode]     = useState(employees.length > 0 ? "list" : "type");

  const handleConfirm = () => {
    const name = mode === "list" ? selected : custom.trim();
    if (!name) return;
    onConfirm(name);
  };

  return (
    <div style={op.overlay}>
      <div style={op.card}>
        {/* Icon */}
        <div style={op.iconWrap}>
          <span style={{ fontSize: 36 }}>👷</span>
        </div>

        <h2 style={op.title}>Who is working now?</h2>
        <p style={op.sub}>
          Account: <strong style={{ color: "#2563eb" }}>{accountName}</strong><br/>
          Select your name to log this session
        </p>

        {/* Toggle between list and type */}
        {employees.length > 0 && (
          <div style={op.modeToggle}>
            <button
              onClick={() => setMode("list")}
              style={{ ...op.modeBtn, ...(mode === "list" ? op.modeBtnActive : {}) }}
            >📋 Select from list</button>
            <button
              onClick={() => setMode("type")}
              style={{ ...op.modeBtn, ...(mode === "type" ? op.modeBtnActive : {}) }}
            >✏️ Type name</button>
          </div>
        )}

        {/* Employee list */}
        {mode === "list" && employees.length > 0 && (
          <div style={op.list}>
            {employees.map(name => (
              <button
                key={name}
                onClick={() => setSelected(name)}
                style={{
                  ...op.empBtn,
                  ...(selected === name ? op.empBtnActive : {}),
                }}
              >
                <span style={op.empAvatar}>
                  {name[0]?.toUpperCase()}
                </span>
                <span style={{ fontWeight: 800, fontSize: 16 }}>{name}</span>
                {selected === name && <span style={{ marginLeft: "auto", color: "#2563eb", fontSize: 20 }}>✓</span>}
              </button>
            ))}
          </div>
        )}

        {/* Manual input */}
        {mode === "type" && (
          <input
            autoFocus
            style={op.input}
            placeholder="Enter your name…"
            value={custom}
            onChange={e => setCustom(e.target.value)}
            onKeyDown={e => e.key === "Enter" && handleConfirm()}
          />
        )}

        <button
          onClick={handleConfirm}
          disabled={mode === "list" ? !selected : !custom.trim()}
          style={{
            ...op.confirmBtn,
            opacity: (mode === "list" ? !selected : !custom.trim()) ? 0.5 : 1,
            cursor: (mode === "list" ? !selected : !custom.trim()) ? "not-allowed" : "pointer",
          }}
        >
          ✅ Start Session
        </button>
      </div>
    </div>
  );
}

const op = {
  overlay: {
    position: "fixed", inset: 0,
    background: "rgba(0,0,0,.55)",
    backdropFilter: "blur(8px)",
    display: "flex", alignItems: "center", justifyContent: "center",
    zIndex: 9999, padding: "1rem",
  },
  card: {
    background: "#fff", borderRadius: 28,
    padding: "2.6rem 2.8rem",
    width: "min(460px, 96vw)",
    boxShadow: "0 30px 80px rgba(0,0,0,.3)",
    border: "1px solid #e2e8f0",
    textAlign: "center",
  },
  iconWrap: {
    width: 72, height: 72, borderRadius: "50%",
    background: "linear-gradient(135deg,#dbeafe,#ede9fe)",
    display: "flex", alignItems: "center", justifyContent: "center",
    margin: "0 auto 16px",
    border: "2px solid #c7d2fe",
  },
  title: { margin: "0 0 8px", fontWeight: 1000, fontSize: 24, color: "#0f172a" },
  sub:   { margin: "0 0 20px", color: "#64748b", fontSize: 15, lineHeight: 1.6 },
  modeToggle: {
    display: "flex", gap: 8, marginBottom: 16,
    background: "#f1f5f9", borderRadius: 12, padding: 4,
  },
  modeBtn: {
    flex: 1, padding: "9px 0",
    background: "none", border: "none",
    borderRadius: 9, fontWeight: 800, fontSize: 14,
    cursor: "pointer", fontFamily: "inherit", color: "#64748b",
    transition: "all .15s",
  },
  modeBtnActive: {
    background: "#fff", color: "#2563eb",
    boxShadow: "0 2px 8px rgba(0,0,0,.10)",
  },
  list: {
    display: "flex", flexDirection: "column", gap: 8,
    marginBottom: 20, maxHeight: 280, overflowY: "auto",
  },
  empBtn: {
    display: "flex", alignItems: "center", gap: 12,
    padding: "12px 16px", borderRadius: 14,
    background: "#f8fafc", border: "2px solid #e2e8f0",
    cursor: "pointer", fontFamily: "inherit",
    transition: "all .15s", textAlign: "left",
  },
  empBtnActive: {
    background: "#eff6ff", border: "2px solid #3b82f6",
    boxShadow: "0 4px 12px rgba(59,130,246,.2)",
  },
  empAvatar: {
    width: 36, height: 36, borderRadius: "50%",
    background: "linear-gradient(135deg,#7c3aed,#2563eb)",
    color: "#fff", fontWeight: 900, fontSize: 16,
    display: "flex", alignItems: "center", justifyContent: "center",
    flexShrink: 0,
  },
  input: {
    width: "100%", padding: "13px 16px",
    border: "2px solid #e2e8f0", borderRadius: 12,
    fontSize: 16, fontFamily: "inherit",
    boxSizing: "border-box", marginBottom: 20,
    outline: "none",
  },
  confirmBtn: {
    width: "100%", padding: "15px 0",
    background: "linear-gradient(135deg,#2563eb,#7c3aed)",
    color: "#fff", border: "none", borderRadius: 14,
    fontWeight: 900, fontSize: 18,
    fontFamily: "inherit",
    boxShadow: "0 8px 22px rgba(37,99,235,.35)",
    transition: "opacity .15s",
  },
};

/* ── Each role: label · route · icon · unique gradient ── */
const ALL_ROLES = [
  {
    id: "kpi", label: "KPI Dashboard", route: "/kpi", icon: "📈",
    grad: "linear-gradient(135deg,#0f766e,#14b8a6)",
    glow: "rgba(20,184,166,.45)",
  },
  {
    id: "inspector", label: "Inspector", route: "/inspection", icon: "🔍",
    grad: "linear-gradient(135deg,#3b82f6,#1d4ed8)",
    glow: "rgba(59,130,246,.45)",
  },
  {
    // "admin" = View reports — its doors live on /monitor now, so an
    // account holding only that section still needs this card.
    id: "daily", label: "Daily Monitor", route: "/monitor", icon: "📅", anyOf: ["admin"],
    grad: "linear-gradient(135deg,#06b6d4,#0284c7)",
    glow: "rgba(6,182,212,.45)",
  },
  {
    id: "ohc", label: "OHC", route: "/ohc", icon: "🩺",
    grad: "linear-gradient(135deg,#10b981,#059669)",
    glow: "rgba(16,185,129,.45)",
  },
  {
    id: "returns", label: "Returns", route: "/returns/menu", icon: "♻️",
    grad: "linear-gradient(135deg,#f97316,#ea580c)",
    glow: "rgba(249,115,22,.45)",
  },
  {
    id: "finalProduct", label: "Final Product", route: "/finished-product", icon: "🏷️",
    grad: "linear-gradient(135deg,#ec4899,#db2777)",
    glow: "rgba(236,72,153,.45)",
  },
  {
    id: "cars", label: "Cars", route: "/cars", icon: "🚗",
    grad: "linear-gradient(135deg,#64748b,#475569)",
    glow: "rgba(100,116,139,.45)",
  },
  {
    id: "maintenance", label: "Maintenance", route: "/maintenance-home", icon: "🔧",
    grad: "linear-gradient(135deg,#ef4444,#dc2626)",
    glow: "rgba(239,68,68,.45)",
  },
  {
    id: "qcsView", label: "QCS Shipments", route: "/qcs-raw-material-view", icon: "📦",
    grad: "linear-gradient(135deg,#6366f1,#4f46e5)",
    glow: "rgba(99,102,241,.45)",
  },
  {
    id: "training", label: "Training Certs", route: "/training-certificates", icon: "🎓",
    grad: "linear-gradient(135deg,#a855f7,#9333ea)",
    glow: "rgba(168,85,247,.45)",
  },
  {
    id: "internalTraining", label: "Internal Training", route: "/training", icon: "🧑‍🏫",
    grad: "linear-gradient(135deg,#2563eb,#1e40af)",
    glow: "rgba(37,99,235,.45)",
  },
  {
    id: "iso", label: "ISO & HACCP", route: "/iso-haccp", icon: "📘",
    grad: "linear-gradient(135deg,#0891b2,#0e7490)",
    glow: "rgba(8,145,178,.45)",
  },
  {
    id: "hse", label: "HSE", route: "/hse", icon: "🦺",
    grad: "linear-gradient(135deg,#eab308,#ca8a04)",
    glow: "rgba(234,179,8,.45)",
  },
  {
    // كرت واحد بيجمع الجزار والتصنيع — الظهور إذا كان عنده صلاحية أي وحدة منهم
    id: "inventory", label: "Inventory", route: "/inventory", icon: "📦",
    anyOf: ["butcher", "mrp", "workforce"],
    keywords: ["butcher", "manufacturing", "bom", "stock", "workforce", "مخزون", "جزار", "تصنيع", "قوى عاملة"],
    grad: "linear-gradient(135deg,#0891b2,#0e7490)",
    glow: "rgba(8,145,178,.45)",
  },
  {
    // 🧬 منظومة تتبع المنتج — كود واحد يعرض رحلة المنتج من الشحنة حتى العميل
    id: "productTrace", label: "Product Traceability", route: "/product-trace", icon: "🧬",
    keywords: ["trace", "traceability", "recall", "item code", "تتبع", "كود", "استدعاء"],
    grad: "linear-gradient(135deg,#7c3aed,#4f46e5)",
    glow: "rgba(124,58,237,.45)",
  },
  {
    id: "emailCenter", label: "Email Center", route: "/email-center", icon: "📨",
    grad: "linear-gradient(135deg,#1e40af,#7c3aed)",
    glow: "rgba(30,64,175,.45)",
  },
  {
    // 🏛️ بوابة تقارير بلدية دبي — رابط خارجي فقط (يفتح بتبويب جديد)
    id: "dmChecked", label: "Dubai Municipality", href: DM_CHECKED_URL, icon: "🏛️",
    keywords: ["dm", "dm checked", "municipality", "dubai", "بلدية", "بلدية دبي"],
    grad: "linear-gradient(135deg,#b91c1c,#7f1d1d)",
    glow: "rgba(185,28,28,.45)",
  },
  {
    id: "settings", label: "Settings", route: "/settings", icon: "⚙️",
    grad: "linear-gradient(135deg,#475569,#334155)",
    glow: "rgba(71,85,105,.45)",
  },
];

/* What each card opens — a real one-liner instead of a generic subtitle,
   and the area tag shown in the card's corner. */
const ROLE_INFO = {
  kpi:              { tag: "Management", desc: "Performance indicators and trends" },
  inspector:        { tag: "Operations", desc: "Branch inspections and audits" },
  daily:            { tag: "Operations", desc: "Daily reports from every branch" },
  ohc:              { tag: "Operations", desc: "Staff health certificates" },
  returns:          { tag: "Operations", desc: "Branch and customer returns" },
  finalProduct:     { tag: "Operations", desc: "Finished product checks" },
  cars:             { tag: "Management", desc: "Delivery vehicles" },
  maintenance:      { tag: "Management", desc: "Maintenance requests and repairs" },
  qcsView:          { tag: "Operations", desc: "Incoming shipments and raw material" },
  training:         { tag: "Quality",    desc: "Training certificates register" },
  internalTraining: { tag: "Quality",    desc: "Courses, quizzes and attendance" },
  iso:              { tag: "Quality",    desc: "FSMS manual, HACCP and documents" },
  hse:              { tag: "Quality",    desc: "Health, safety and risk register" },
  inventory:        { tag: "Operations", desc: "Butcher, manufacturing and workforce" },
  productTrace:     { tag: "Quality",    desc: "From shipment to customer by item code" },
  emailCenter:      { tag: "Management", desc: "Send and track report e-mails" },
  dmChecked:        { tag: "External",   desc: "Dubai Municipality portal — opens in a new tab" },
  settings:         { tag: "Management", desc: "Accounts, permissions and setup" },
};

/* globals.css forces every #root font-size with !important, so the inline
   fontSize values never applied — real sizes live here (doubled class beats
   `#root *`) and follow the Aa text-size slider via --app-fs. */
const fs = (px) => `calc(${px}px * var(--app-fs, 1)) !important`;
const ND_CSS = `
#root .ndx.ndx .ndx-eyebrow { font-size:${fs(12.5)}; }
#root .ndx.ndx .ndx-title { font-size:${fs(30)}; }
#root .ndx.ndx .ndx-sub { font-size:${fs(15)}; }
#root .ndx.ndx .ndx-date { font-size:${fs(14)}; }
#root .ndx.ndx .ndx-avatar { font-size:${fs(22)}; }
#root .ndx.ndx .ndx-umeta { font-size:${fs(12.5)}; }
#root .ndx.ndx .ndx-uname { font-size:${fs(17)}; }
#root .ndx.ndx .ndx-clock { font-size:${fs(22)}; font-variant-numeric:tabular-nums; }
#root .ndx.ndx .ndx-hbtn { font-size:${fs(14)}; }
#root .ndx.ndx .ndx-search input { font-size:${fs(15)}; }
#root .ndx.ndx .ndx-sicon { font-size:${fs(17)}; }
#root .ndx.ndx .ndx-clear { font-size:${fs(15)}; }
#root .ndx.ndx .ndx-chip { font-size:${fs(14)}; }
#root .ndx.ndx .ndx-icon { font-size:${fs(28)}; }
#root .ndx.ndx .ndx-tag { font-size:${fs(12)}; }
#root .ndx.ndx .ndx-ctitle { font-size:${fs(19)}; }
#root .ndx.ndx .ndx-csub { font-size:${fs(13.5)}; }
#root .ndx.ndx .ndx-cfoot { font-size:${fs(14)}; }
#root .ndx.ndx .ndx-foot { font-size:${fs(12)}; }
#root .ndx.ndx .named-card .ndx-arrow { transition:transform .16s ease; }
#root .ndx.ndx .named-card:hover .ndx-arrow { transform:translateX(4px); }
`;

/* greeting based on time */
function greeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

const nd = {
  page: {
    minHeight: "100vh",
    boxSizing: "border-box",
    display: "flex",
    flexDirection: "column",
    padding: "16px clamp(12px, 1.5vw, 24px) 14px",
    background: "linear-gradient(180deg, #f8fafc 0%, #eef7f4 44%, #f8fafc 100%)",
    color: "#0f172a",
    fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
  },
  /* full width, and the card grid takes whatever height is left */
  layout: {
    width: "100%",
    flex: 1,
    display: "flex",
    flexDirection: "column",
  },
  hero: {
    position: "relative",
    overflow: "hidden",
    borderRadius: 8,
    padding: "26px clamp(22px, 4vw, 54px)",
    background: "linear-gradient(135deg, rgba(15,23,42,0.96), rgba(15,118,110,0.94) 52%, rgba(8,145,178,0.92))",
    color: "#fff",
    border: "1px solid rgba(255,255,255,0.20)",
    boxShadow: "0 24px 64px rgba(15,23,42,0.22)",
  },
  heroInner: {
    position: "relative",
    display: "grid",
    gridTemplateColumns: "minmax(0, 1fr) auto",
    gap: 24,
    alignItems: "center",
  },
  brand: {
    display: "flex",
    alignItems: "center",
    gap: 16,
    minWidth: 0,
  },
  logo: {
    width: 76,
    height: 76,
    borderRadius: 8,
    objectFit: "cover",
    border: "1px solid rgba(255,255,255,0.34)",
    background: "#fff",
    boxShadow: "0 16px 30px rgba(0,0,0,0.25)",
    flexShrink: 0,
  },
  eyebrow: {
    margin: 0,
    fontWeight: 900,
    color: "rgba(255,255,255,0.78)",
    letterSpacing: "0.08em",
    textTransform: "uppercase",
  },
  title: {
    margin: "8px 0 0",
    fontWeight: 1000,
    lineHeight: 1.05,
    letterSpacing: 0,
  },
  subtitle: {
    margin: "12px 0 0",
    maxWidth: 980,
    color: "rgba(255,255,255,0.82)",
    lineHeight: 1.45,
    fontWeight: 700,
  },
  homeBadge: {
    display: "inline-flex",
    alignItems: "center",
    gap: 10,
    minHeight: 44,
    padding: "8px 14px",
    marginTop: 18,
    borderRadius: 8,
    color: "#ecfeff",
    background: "rgba(14,165,233,0.18)",
    border: "1px solid rgba(125,211,252,0.34)",
    fontWeight: 950,
    boxShadow: "0 12px 30px rgba(8,145,178,0.18)",
  },
  homePulse: {
    width: 12,
    height: 12,
    borderRadius: 999,
    background: "#22c55e",
    boxShadow: "0 0 18px rgba(34,197,94,0.82)",
  },
  heroActions: {
    display: "grid",
    gap: 12,
    minWidth: 360,
  },
  userPanel: {
    borderRadius: 8,
    padding: "16px 18px",
    background: "rgba(255,255,255,0.12)",
    border: "1px solid rgba(255,255,255,0.22)",
    backdropFilter: "blur(12px)",
  },
  userTop: {
    display: "flex",
    alignItems: "center",
    gap: 12,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 8,
    display: "grid",
    placeItems: "center",
    background: "rgba(255,255,255,0.18)",
    border: "1px solid rgba(255,255,255,0.24)",
    color: "#fff",
    fontWeight: 1000,
    flexShrink: 0,
  },
  userMeta: {
    color: "rgba(255,255,255,0.74)",
    fontWeight: 800,
    lineHeight: 1.3,
  },
  clock: {
    marginLeft: "auto",
    paddingLeft: 14,
    borderLeft: "1px solid rgba(255,255,255,0.24)",
    color: "#fff",
    fontWeight: 1000,
    lineHeight: 1,
  },
  clear: {
    border: "none",
    background: "none",
    color: "#94a3b8",
    cursor: "pointer",
    padding: "0 2px",
    fontFamily: "inherit",
  },
  userName: {
    marginTop: 4,
    color: "#fff",
    fontWeight: 1000,
    lineHeight: 1.2,
  },
  actionRow: {
    display: "flex",
    flexWrap: "wrap",
    gap: 10,
  },
  heroButton: (tone = "ghost") => ({
    minHeight: 52,
    padding: "10px 18px",
    borderRadius: 8,
    border: tone === "danger" ? "1px solid rgba(254,202,202,0.35)" : "1px solid rgba(255,255,255,0.24)",
    background: tone === "danger" ? "rgba(220,38,38,0.34)" : "rgba(255,255,255,0.13)",
    color: "#fff",
    fontWeight: 950,
    cursor: "pointer",
    fontFamily: "inherit",
  }),
  toolbar: {
    margin: "16px 0",
    display: "grid",
    gridTemplateColumns: "minmax(280px, 1fr) auto",
    gap: 14,
    alignItems: "center",
  },
  searchWrap: {
    display: "flex",
    alignItems: "center",
    gap: 12,
    padding: "12px 16px",
    borderRadius: 8,
    background: "#fff",
    border: "1px solid rgba(15,23,42,0.13)",
    boxShadow: "0 12px 28px rgba(15,23,42,0.08)",
  },
  searchInput: {
    width: "100%",
    minWidth: 0,
    border: "none",
    outline: "none",
    background: "transparent",
    color: "#0f172a",
    fontWeight: 800,
    fontFamily: "inherit",
  },
  summary: {
    display: "flex",
    flexWrap: "wrap",
    justifyContent: "flex-end",
    gap: 10,
  },
  chip: {
    minHeight: 52,
    display: "inline-flex",
    alignItems: "center",
    padding: "8px 16px",
    borderRadius: 8,
    background: "#fff",
    color: "#334155",
    border: "1px solid rgba(15,23,42,0.12)",
    boxShadow: "0 10px 20px rgba(15,23,42,0.07)",
    fontWeight: 950,
  },
  notice: {
    marginBottom: 16,
    padding: "14px 18px",
    borderRadius: 8,
    background: "#fffbeb",
    color: "#92400e",
    border: "1px solid #fde68a",
    fontWeight: 900,
    textAlign: "center",
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 260px), 1fr))",
    gap: 16,
  },
  card: (isHover, role) => ({
    position: "relative",
    minHeight: 150,
    display: "grid",
    gridTemplateRows: "auto 1fr auto",
    gap: 14,
    padding: "20px 22px 18px",
    borderRadius: 8,
    border: isHover ? "1px solid rgba(15,118,110,0.48)" : "1px solid rgba(15,23,42,0.12)",
    background: "#fff",
    color: "#0f172a",
    cursor: "pointer",
    textAlign: "left",
    boxShadow: isHover ? `0 24px 52px ${role.glow}` : "0 12px 30px rgba(15,23,42,0.08)",
    transform: isHover ? "translateY(-3px)" : "translateY(0)",
    transition: "transform .16s ease, box-shadow .16s ease, border-color .16s ease",
    overflow: "hidden",
    fontFamily: "inherit",
    animation: "namedCardIn .36s ease both",
  }),
  cardTop: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 14,
  },
  iconWrap: (role) => ({
    width: 60,
    height: 60,
    borderRadius: 8,
    display: "grid",
    placeItems: "center",
    color: "#fff",
    background: role.grad,
    boxShadow: `0 14px 26px ${role.glow}`,
    flexShrink: 0,
  }),
  icon: {
    lineHeight: 1,
  },
  roleTag: {
    padding: "7px 12px",
    borderRadius: 999,
    background: "#f1f5f9",
    color: "#475569",
    fontWeight: 900,
    whiteSpace: "nowrap",
  },
  cardTitle: {
    margin: 0,
    lineHeight: 1.2,
    fontWeight: 1000,
    color: "#0f172a",
  },
  cardSub: {
    marginTop: 10,
    lineHeight: 1.45,
    fontWeight: 700,
    color: "#64748b",
  },
  cardBottom: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 14,
    paddingTop: 12,
    borderTop: "1px solid rgba(15,23,42,0.09)",
    color: "#0f766e",
    fontWeight: 950,
  },
  empty: {
    padding: 34,
    borderRadius: 8,
    background: "#fff",
    border: "1px solid rgba(15,23,42,0.12)",
    boxShadow: "0 12px 30px rgba(15,23,42,0.08)",
    textAlign: "center",
    color: "#64748b",
    fontWeight: 850,
  },
  footer: {
    marginTop: 14,
    textAlign: "center",
    color: "#64748b",
    fontWeight: 800,
  },
};

export default function NamedDashboard() {
  const navigate = useNavigate();
  const [hovered, setHovered] = useState(null);
  const [time, setTime] = useState(new Date());
  const [query, setQuery] = useState("");

  useEffect(() => {
    const id = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  const currentUser = (() => {
    try { return JSON.parse(localStorage.getItem("currentUser") || "{}"); } catch { return {}; }
  })();

  const displayName = currentUser.displayName || currentUser.username || "User";
  const permissions = currentUser.permissions || [];
  const isFullAccess = permissions.includes("*") || permissions.length === 0;
  const isAdmin = !!currentUser.isAdmin;
  const isSuperAdmin = !!currentUser.isSuperAdmin;
  const employees = currentUser.employees || [];
  const activeCompany = isSuperAdmin ? getActiveCompany() : null;

  /* «مسؤول المخزون» — نفس القاعدة تحت: الكرت بابه الوحيد. */
  const { officer: invOfficer } = useInventoryOfficer();
  const visibleRoles = isFullAccess
    ? ALL_ROLES
    // anyOf = كرت مجمّع (مثل «المخزون») — يظهر إذا كان يملك أي وحدة بداخله
    : ALL_ROLES.filter(
        (r) =>
          permissions.includes(r.id) ||
          (invOfficer && r.id === "inventory") ||
          (Array.isArray(r.anyOf) && r.anyOf.some((x) => permissions.includes(x)))
      );

  const sessionKey = `operator_${currentUser.username}`;
  const [operator, setOperator] = useState(() => {
    if (isAdmin) return displayName;
    return sessionStorage.getItem(sessionKey) || null;
  });
  const [showPicker, setShowPicker] = useState(() => {
    if (isAdmin) return false;
    return !sessionStorage.getItem(sessionKey);
  });

  const handleOperatorConfirm = async (name) => {
    sessionStorage.setItem(sessionKey, name);
    setOperator(name);
    setShowPicker(false);
    try {
      await fetch(`${API_BASE}/api/auth/operator-start`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: currentUser.username, operator: name }),
      }).catch(() => {});
    } catch {}
  };

  const handleLogout = async () => {
    if (!confirmLogoutWithOutbox()) return;
    try {
      await fetch(`${API_BASE}/api/auth/logout`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: currentUser.username, operator }),
      });
    } catch {}
    clearAppSession();
    navigate("/", { replace: true });
  };

  const q = query.trim().toLowerCase();
  // البحث بيلاقي الكرت المجمّع كمان من اسم أي وحدة جوّاته (Butcher / Manufacturing)
  const filteredRoles = visibleRoles.filter(
    (role) =>
      !q ||
      role.label.toLowerCase().includes(q) ||
      (ROLE_INFO[role.id]?.desc || "").toLowerCase().includes(q) ||
      (role.keywords || []).some((k) => k.toLowerCase().includes(q))
  );
  const openRole = (role) => (role.href ? openExternal(role.href) : navigate(role.route));
  const onSearchKey = (e) => {
    if (e.key === "Enter" && filteredRoles.length === 1) openRole(filteredRoles[0]);
    if (e.key === "Escape") setQuery("");
  };
  const timeStr = time.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
  const dateStr = time.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" });

  const sessionNotice = (() => {
    if (currentUser.remember) return ""; // "Keep me signed in" — no 8-hour cut-off
    const loginAt = currentUser.loginAt || 0;
    const elapsed = Date.now() - loginAt;
    const remaining = 8 * 60 * 60 * 1000 - elapsed;
    const minsLeft = Math.floor((remaining % 3600000) / 60000);
    const hoursLeft = Math.floor(remaining / 3600000);
    return hoursLeft < 1 && minsLeft < 30 && minsLeft > 0
      ? `Session expires in ${minsLeft} minute${minsLeft !== 1 ? "s" : ""} - please save your work`
      : "";
  })();

  return (
    <main className="ndx ndx" style={nd.page}>
      <style>{ND_CSS}</style>
      {showPicker && (
        <OperatorPicker
          employees={employees}
          accountName={displayName}
          onConfirm={handleOperatorConfirm}
        />
      )}

      <style>{`
        @keyframes namedSweep {
          0% { transform: translateX(-18%); opacity: .45; }
          50% { opacity: .95; }
          100% { transform: translateX(118%); opacity: .45; }
        }
        @keyframes namedPulse {
          0%, 100% { transform: scale(1); opacity: 1; }
          50% { transform: scale(.72); opacity: .48; }
        }
        @keyframes namedCardIn {
          from { opacity: 0; filter: saturate(.72); }
          to { opacity: 1; filter: saturate(1); }
        }
        @keyframes namedGlowLine {
          0%, 100% { opacity: .38; transform: translateY(0); }
          50% { opacity: .92; transform: translateY(6px); }
        }
        .named-home-pulse {
          animation: namedPulse 2.1s ease-in-out infinite;
        }
        .named-card:nth-child(2n) {
          animation-delay: .04s;
        }
        .named-card:nth-child(3n) {
          animation-delay: .08s;
        }
        @media (max-width: 980px) {
          .named-hero-inner,
          .named-toolbar {
            grid-template-columns: 1fr !important;
          }
          .named-hero-actions,
          .named-summary {
            min-width: 0 !important;
            justify-content: flex-start !important;
          }
        }
      `}</style>

      <div style={nd.layout}>
        <section style={nd.hero}>
          <div
            aria-hidden="true"
            style={{
              position: "absolute",
              inset: 0,
              background:
                "radial-gradient(820px 260px at 12% 0%, rgba(45,212,191,0.28), transparent 62%)," +
                "radial-gradient(760px 300px at 90% 20%, rgba(125,211,252,0.22), transparent 60%)",
            }}
          />
          <div
            aria-hidden="true"
            style={{
              position: "absolute",
              left: "-22%",
              top: 0,
              width: "42%",
              height: 5,
              background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.9), transparent)",
              animation: "namedSweep 5.8s ease-in-out infinite",
            }}
          />
          <div
            aria-hidden="true"
            style={{
              position: "absolute",
              left: 0,
              bottom: 0,
              width: "100%",
              height: 6,
              background: "linear-gradient(90deg, #22c55e, #06b6d4, #f59e0b, #22c55e)",
              backgroundSize: "220% 100%",
              opacity: .86,
              animation: "namedGlowLine 2.8s ease-in-out infinite",
            }}
          />

          <div className="named-hero-inner" style={nd.heroInner}>
            <div style={nd.brand}>
              <img src={logo} alt="Al Mawashi" style={nd.logo} />
              <div style={{ minWidth: 0 }}>
                <p className="ndx-eyebrow" style={nd.eyebrow}>Al Mawashi QMS</p>
                <h1 className="ndx-title" style={nd.title}>{greeting()}, {operator || displayName}</h1>
                <p className="ndx-sub" style={nd.subtitle}>
                  {isFullAccess
                    ? `Full access · ${visibleRoles.length} sections`
                    : `${visibleRoles.length} section${visibleRoles.length !== 1 ? "s" : ""} available to you`}
                </p>
                <div className="ndx-date" style={nd.homeBadge}>
                  <span className="named-home-pulse" style={nd.homePulse} />
                  <span>{dateStr}</span>
                </div>
              </div>
            </div>

            <div className="named-hero-actions" style={nd.heroActions}>
              <div style={nd.userPanel}>
                <div style={nd.userTop}>
                  <div className="ndx-avatar" style={nd.avatar}>{(operator || displayName)[0]?.toUpperCase() || "U"}</div>
                  <div>
                    <div className="ndx-umeta" style={nd.userMeta}>
                      {isAdmin ? "👑 Admin · " : ""}Account: {displayName}
                    </div>
                    <div className="ndx-uname" style={nd.userName}>{operator || displayName}</div>
                  </div>
                  <div className="ndx-clock" style={nd.clock}>{timeStr}</div>
                </div>
              </div>

              <div style={nd.actionRow}>
                {operator && !isAdmin && (
                  <button
                    type="button"
                    className="ndx-hbtn"
                    style={nd.heroButton()}
                    onClick={() => { sessionStorage.removeItem(sessionKey); setOperator(null); setShowPicker(true); }}
                  >
                    🔄 Change operator
                  </button>
                )}
                {(currentUser.isAdmin || permissions.includes("settings") || isFullAccess) && (
                  <button type="button" className="ndx-hbtn" style={nd.heroButton()} onClick={() => navigate("/settings")}>
                    ⚙️ Settings
                  </button>
                )}
                {isSuperAdmin && (
                  <button
                    type="button"
                    className="ndx-hbtn"
                    style={nd.heroButton()}
                    title={activeCompany ? `Currently: ${activeCompany.name}` : ""}
                    onClick={() => { clearActiveCompany(); navigate("/select-company"); }}
                  >
                    🏢 {activeCompany ? activeCompany.name : "Switch company"}
                  </button>
                )}
                <button type="button" className="ndx-hbtn" style={nd.heroButton("danger")} onClick={handleLogout}>
                  🚪 Sign out
                </button>
              </div>
            </div>
          </div>
        </section>

        <TodayFoodSafetyStrip />

        <section className="named-toolbar" style={nd.toolbar}>
          <label className="ndx-search" style={nd.searchWrap}>
            <span className="ndx-sicon" aria-hidden="true">🔍</span>
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={onSearchKey}
              placeholder="Find a section…"
              style={nd.searchInput}
            />
            {query && (
              <button type="button" className="ndx-clear" style={nd.clear} aria-label="Clear search" onClick={() => setQuery("")}>
                ✕
              </button>
            )}
          </label>

          <div className="named-summary" style={nd.summary}>
            <div className="ndx-chip" style={nd.chip}>
              {q ? `${filteredRoles.length} of ${visibleRoles.length} sections` : `${visibleRoles.length} sections`}
            </div>
          </div>
        </section>

        {sessionNotice && <div style={nd.notice}>{sessionNotice}</div>}

        {filteredRoles.length === 0 ? (
          <div style={nd.empty}>
            <div style={{ fontWeight: 1000, marginBottom: 8 }}>No sections found</div>
            <div>{visibleRoles.length === 0 ? "Contact your administrator." : "Try another search term."}</div>
          </div>
        ) : (
          <section aria-label="Dashboard sections" style={nd.grid}>
            {filteredRoles.map((role) => {
              const isHover = hovered === role.id;
              return (
                <button
                  key={role.id}
                  className="named-card"
                  type="button"
                  onClick={() => openRole(role)}
                  onMouseEnter={() => setHovered(role.id)}
                  onMouseLeave={() => setHovered(null)}
                  onFocus={() => setHovered(role.id)}
                  onBlur={() => setHovered(null)}
                  style={nd.card(isHover, role)}
                >
                  <div style={nd.cardTop}>
                    <div style={nd.iconWrap(role)}>
                      <span className="ndx-icon" style={nd.icon}>{role.icon}</span>
                    </div>
                    <span className="ndx-tag" style={nd.roleTag}>{ROLE_INFO[role.id]?.tag || "Section"}</span>
                  </div>

                  <div>
                    <h2 className="ndx-ctitle" style={nd.cardTitle}>{role.label}</h2>
                    <div className="ndx-csub" style={nd.cardSub}>{ROLE_INFO[role.id]?.desc || ""}</div>
                  </div>

                  <div className="ndx-cfoot" style={nd.cardBottom}>
                    <span>{role.href ? "Open portal" : "Open"}</span>
                    <span className="ndx-arrow" aria-hidden="true">{role.href ? "↗" : "→"}</span>
                  </div>
                </button>
              );
            })}
          </section>
        )}

        <footer className="ndx-foot" style={nd.footer}>Built by Eng. Mohammed Abdullah</footer>
      </div>
    </main>
  );
}
