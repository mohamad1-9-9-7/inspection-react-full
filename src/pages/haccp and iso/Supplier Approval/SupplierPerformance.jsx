// D:\inspection-react-full\src\pages\haccp and iso\Supplier Approval\SupplierPerformance.jsx
import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { IsoShell, ISO_UI } from "../../monitor/branches/_shared/branchViewKit";
import "./SupplierApproval.css";

/**
 * Supplier Performance — Scorecard & Trend Analysis
 * Design: ISO/HACCP look (IsoShell + ISO_UI) — same kit as POS 15 views.
 * Doc No: FS-QM/REC/SUP-PERF
 *
 * • Base suppliers pulled LIVE from the two QCS receiving modules:
 *     - استلام الشحنات  → qcs_supplier        (payload.name — supplier master)
 *     - استلام المكونات → qcs_rm_ingredients  (payload.entries[].supplier)
 * • Performance (6 quarterly scores + breakdown) editable, saved to
 *   /api/reports type "supplier_performance" (POST new / PUT :id existing).
 *
 * Scoring: Delivery 30% + Quality 30% + Rejection Rate 20% + Documentation 20%.
 */

/* ===== API base ===== */
const API_ROOT_DEFAULT = "https://inspection-server-4nvj.onrender.com";
function normalizeApiRoot(raw) {
  let s = String(raw || "").trim();
  if (!s) return API_ROOT_DEFAULT;
  s = s.replace(/\/+$/, "").replace(/\/api\/reports.*$/i, "").replace(/\/api\/?$/i, "");
  return s || API_ROOT_DEFAULT;
}
const API_BASE = normalizeApiRoot(
  (typeof window !== "undefined" && window.__QCS_API__) ||
    (typeof process !== "undefined" && process.env?.REACT_APP_API_URL) ||
    API_ROOT_DEFAULT
);

const PERF_TYPE = "supplier_performance";                 // مورّدو المنتجات (product suppliers)
const SERVICE_PERF_TYPE = "service_provider_performance"; // مورّدو الخدمات (service providers)
const SHIPMENT_SUPPLIER_TYPE = "qcs_supplier";   // استلام الشحنات — supplier master (payload.name)
const INGREDIENT_TYPE = "qcs_rm_ingredients";    // استلام المكونات — rows (payload.entries[].supplier)
const OWN_COMPANY_RE = /trans\s*emirates|mawashi/i; // our company must never be listed

// Service providers are managed manually (not discovered from receiving logs).
// These seed the Service Providers scorecard; they appear as "needs review"
// until the user enters scores, exactly like auto-discovered product suppliers.
const SERVICE_DEFAULTS = ["ETS", "SGS", "EMDAD", "TADWER", "Power Factor"];

const DOC_NO = "FS-QM/REC/SUP-PERF";
const DOC_REV = "01";
const ISSUE_DATE = "01 Jan 2026";

const QUARTERS = ["Q1 2025", "Q2 2025", "Q3 2025", "Q4 2025", "Q1 2026", "Q2 2026"];

const PALETTE = ["#0284c7", "#16a34a", "#7c3aed", "#0891b2", "#dc2626", "#d97706", "#0f766e", "#4f46e5", "#a16207", "#be185d", "#1d4ed8", "#047857"];
const colorFor = (name, idx) => PALETTE[idx % PALETTE.length];

/* ===== Helpers ===== */
const ACCEPT_THRESHOLD = 80; // minimum acceptance score

function gradeOf(score) {
  if (score >= 93) return { label: "A", color: "#15803d", bg: "#dcfce7" };
  if (score >= 90) return { label: "A-", color: "#166534", bg: "#e7f6ea" };
  if (score >= 87) return { label: "B+", color: "#0369a1", bg: "#e0f2fe" };
  if (score >= 83) return { label: "B", color: "#0e7490", bg: "#e6f6fb" };
  if (score >= 80) return { label: "B-", color: "#a16207", bg: "#fef3c7" };
  return { label: "C", color: "#b91c1c", bg: "#fee2e2" };
}

// Performance-based disposition — acceptance threshold = 80.
// Order matters: a failing score always wins; then a declining trend flags a
// review regardless of grade; otherwise the decision follows the score band.
function dispositionOf(score, trendKey) {
  if (score < ACCEPT_THRESHOLD) return { label: "Suspended", color: "#b91c1c", bg: "#fee2e2" };
  if (trendKey === "down") return { label: "Review", color: "#a16207", bg: "#fef3c7" };
  if (score < 83) return { label: "Conditional", color: "#a16207", bg: "#fef3c7" };
  if (score < 90) return { label: "Approved · Monitor", color: "#0369a1", bg: "#e0f2fe" };
  return { label: "Approved", color: "#15803d", bg: "#dcfce7" };
}
function trendOf(scores) {
  const clean = scores.filter((n) => typeof n === "number" && !Number.isNaN(n));
  if (clean.length < 2) return { label: "—", key: "stable", color: "#475569" };
  const delta = clean[clean.length - 1] - clean[0];
  if (delta >= 4) return { label: "Improving ↑", key: "up", color: "#15803d" };
  if (delta <= -3) return { label: "Declining ↓", key: "down", color: "#b91c1c" };
  return { label: "Stable →", key: "stable", color: "#475569" };
}
const avg = (a) => (a.length ? a.reduce((x, y) => x + y, 0) / a.length : 0);
const clamp = (n) => Math.max(0, Math.min(100, Math.round(Number(n) || 0)));
const defaultPerf = () => ({ scores: [85, 85, 85, 85, 85, 85], breakdown: { delivery: 85, quality: 85, rejection: 85, documentation: 85 }, source: "" });

/* ===== Sparkline ===== */
function Sparkline({ scores, color }) {
  const w = 96, h = 30;
  const min = Math.min(...scores) - 2, max = Math.max(...scores) + 2;
  const span = Math.max(1, max - min);
  const pts = scores.map((s, i) => `${((i / (scores.length - 1)) * w).toFixed(1)},${(h - ((s - min) / span) * h).toFixed(1)}`).join(" ");
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} style={{ display: "inline-block", verticalAlign: "middle" }}>
      <polyline points={pts} fill="none" stroke={color} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
      {scores.map((s, i) => (
        <circle key={i} cx={(i / (scores.length - 1)) * w} cy={h - ((s - min) / span) * h} r="1.8" fill={color} />
      ))}
    </svg>
  );
}

/* ===== Trend Line Chart — padR widened so "Q2 2026" never clips ===== */
function TrendChart({ suppliers, quarters, hidden }) {
  const W = 1200, H = 340, padL = 56, padR = 60, padT = 16, padB = 36;
  const plotW = W - padL - padR, plotH = H - padT - padB;
  const yMin = 74, yMax = 98, ySpan = yMax - yMin;
  const xAt = (i) => padL + (i / (quarters.length - 1)) * plotW;
  const yAt = (v) => padT + (1 - (Math.max(yMin, Math.min(yMax, v)) - yMin) / ySpan) * plotH;
  const yTicks = [78, 82, 86, 90, 94];
  return (
    <svg width="100%" viewBox={`0 0 ${W} ${H}`} style={{ display: "block", maxWidth: "100%" }}>
      {yTicks.map((t) => (
        <g key={t}>
          <line x1={padL} y1={yAt(t)} x2={W - padR} y2={yAt(t)} stroke="#e0f2fe" strokeWidth="1.5" />
          <text x={padL - 8} y={yAt(t) + 6} textAnchor="end" fontSize="20" fill="#0c4a6e" fontWeight="700">{t}</text>
        </g>
      ))}
      {quarters.map((q, i) => (
        <text key={q} x={xAt(i)} y={H - 8} textAnchor="middle" fontSize="20" fill="#0c4a6e" fontWeight="700">{q}</text>
      ))}
      {suppliers.map((s) => {
        if (hidden[s.name]) return null;
        const d = s.scores.map((v, i) => `${i === 0 ? "M" : "L"}${xAt(i).toFixed(1)},${yAt(v).toFixed(1)}`).join(" ");
        return (
          <g key={s.name}>
            <path d={d} fill="none" stroke={s.color} strokeWidth="2.6" strokeLinejoin="round" strokeLinecap="round" />
            {s.scores.map((v, i) => (
              <circle key={i} cx={xAt(i)} cy={yAt(v)} r="3" fill="#fff" stroke={s.color} strokeWidth="2" />
            ))}
          </g>
        );
      })}
    </svg>
  );
}

/* ===== Breakdown bars ===== */
function BreakdownBars({ data }) {
  const rows = [
    { label: "Delivery (30%)", value: data.delivery, color: "#0284c7" },
    { label: "Quality (30%)", value: data.quality, color: "#16a34a" },
    { label: "Rejection Rate (20%)", value: data.rejection, color: "#d97706" },
    { label: "Documentation (20%)", value: data.documentation, color: "#7c3aed" },
  ];
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {rows.map((r) => (
        <div key={r.label}>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 17, fontWeight: 800, marginBottom: 3 }}>
            <span style={{ color: "#0c4a6e" }}>{r.label}</span>
            <span style={{ color: r.color }}>{r.value}</span>
          </div>
          <div style={{ height: 12, borderRadius: 999, background: "#e0f2fe", overflow: "hidden" }}>
            <div style={{ width: `${r.value}%`, height: "100%", background: r.color, borderRadius: 999 }} />
          </div>
        </div>
      ))}
    </div>
  );
}

/* ===== Local UI pieces (ISO look) ===== */
const card = {
  background: "rgba(255,255,255,0.94)",
  border: "1px solid rgba(15,23,42,0.14)",
  borderRadius: 14,
  boxShadow: "0 10px 26px rgba(2,132,199,0.08)",
  padding: "16px 18px",
  marginBottom: 14,
};
const bigBtn = (kind) => ({ ...ISO_UI.btn(kind), fontSize: 18, padding: "10px 18px" });
const tblBtn = (kind) => ({ ...ISO_UI.btn(kind), fontSize: 18, padding: "8px 15px" });
const chip = (active) => ({
  padding: "9px 17px", borderRadius: 999, cursor: "pointer", fontWeight: 900, fontSize: 18,
  border: active ? "1.5px solid #0284c7" : "1px solid #cbd5e1",
  background: active ? "linear-gradient(180deg,#0ea5e9,#06b6d4)" : "#fff",
  color: active ? "#fff" : "#0c4a6e",
});
const thc = { ...ISO_UI.thCell, fontSize: 20, padding: "12px 8px" };
const tdc = { ...ISO_UI.tdCell, fontSize: 20, fontWeight: 700, padding: "11px 10px", color: "#0f172a" };

function NumInput({ value, onChange }) {
  return (
    <input
      type="number" min={0} max={100} value={value}
      onChange={(e) => onChange(e.target.value)}
      style={{ width: 76, padding: "9px 10px", borderRadius: 10, border: "1px solid #cbd5e1", fontSize: 17, fontWeight: 800, textAlign: "center", color: "#0f172a" }}
    />
  );
}

export default function SupplierPerformance() {
  const navigate = useNavigate();
  const [category, setCategory] = useState("product"); // "product" | "service"
  const [filter, setFilter] = useState("all");
  const [sortBy, setSortBy] = useState("score");
  const [hidden, setHidden] = useState({});
  const [detail, setDetail] = useState(null);

  const [perf, setPerf] = useState({});               // product-supplier performance
  const [servicePerf, setServicePerf] = useState({}); // service-provider performance
  const [discovered, setDiscovered] = useState([]);
  const [recId, setRecId] = useState(null);
  const [serviceRecId, setServiceRecId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState("");
  const [edit, setEdit] = useState(null);

  const isService = category === "service";
  // Active-category accessors — persist/edit/remove all target the current tab.
  const activePerf = isService ? servicePerf : perf;
  const setActivePerf = isService ? setServicePerf : setPerf;

  /* ---- Load saved performance + discover suppliers from the two QCS modules ---- */
  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);
      try {
        const r = await fetch(`${API_BASE}/api/reports?type=${encodeURIComponent(PERF_TYPE)}`, { cache: "no-store" });
        const j = await r.json().catch(() => null);
        const arr = Array.isArray(j) ? j : j?.data || j?.items || [];
        if (arr.length) {
          const rec = arr[arr.length - 1];
          if (alive) {
            setRecId(rec.id ?? rec._id ?? null);
            setPerf(rec?.payload?.suppliers || {});
          }
        }
      } catch { /* offline */ }

      try {
        const r = await fetch(`${API_BASE}/api/reports?type=${encodeURIComponent(SERVICE_PERF_TYPE)}`, { cache: "no-store" });
        const j = await r.json().catch(() => null);
        const arr = Array.isArray(j) ? j : j?.data || j?.items || [];
        if (arr.length) {
          const rec = arr[arr.length - 1];
          if (alive) {
            setServiceRecId(rec.id ?? rec._id ?? null);
            setServicePerf(rec?.payload?.suppliers || {});
          }
        }
      } catch { /* offline */ }

      const found = new Map();
      const addName = (raw, source) => {
        const name = String(raw || "").trim();
        if (!name || OWN_COMPANY_RE.test(name)) return;
        const key = name.toLowerCase();
        if (!found.has(key)) found.set(key, { name, source });
      };
      const fetchType = async (type) => {
        try {
          const r = await fetch(`${API_BASE}/api/reports?type=${encodeURIComponent(type)}`, { cache: "no-store" });
          const j = await r.json().catch(() => null);
          return Array.isArray(j) ? j : j?.data || j?.items || [];
        } catch { return []; }
      };
      const pullShipments = async () => {
        (await fetchType(SHIPMENT_SUPPLIER_TYPE)).forEach((rec) => addName(rec?.payload?.name, "Shipments"));
      };
      const pullIngredients = async () => {
        (await fetchType(INGREDIENT_TYPE)).forEach((rec) => {
          const entries = rec?.payload?.entries || rec?.payload?.rows || [];
          (Array.isArray(entries) ? entries : []).forEach((e) => addName(e?.supplier, "Ingredients"));
        });
      };
      await Promise.all([pullShipments(), pullIngredients()]);
      if (alive) {
        setDiscovered([...found.values()]);
        setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, []);

  /* ---- Merge (shared by both categories) ---- */
  const buildEnriched = (perfMap, discoveredList) => {
    const names = new Map();
    Object.keys(perfMap).forEach((n) => names.set(n.toLowerCase(), n));
    discoveredList.forEach((d) => { if (!names.has(d.name.toLowerCase())) names.set(d.name.toLowerCase(), d.name); });
    const srcMap = new Map(discoveredList.map((d) => [d.name.toLowerCase(), d.source]));
    return [...names.values()].filter((name) => !OWN_COMPANY_RE.test(name)).map((name, idx) => {
      const p = perfMap[name] || defaultPerf();
      const scores = (p.scores || []).map((n) => clamp(n));
      const latest = scores[scores.length - 1] ?? 0;
      const trend = trendOf(scores);
      return {
        name,
        color: colorFor(name, idx),
        scores,
        breakdown: p.breakdown || defaultPerf().breakdown,
        source: p.source || srcMap.get(name.toLowerCase()) || "Manual",
        hasData: !!perfMap[name],
        latest,
        grade: gradeOf(latest),
        trend,
        disposition: dispositionOf(latest, trend.key),
      };
    });
  };

  // Service providers are seeded manually (not from receiving logs).
  const serviceDiscovered = useMemo(() => SERVICE_DEFAULTS.map((name) => ({ name, source: "Service" })), []);

  const productEnriched = useMemo(() => buildEnriched(perf, discovered), [perf, discovered]);
  const serviceEnriched = useMemo(() => buildEnriched(servicePerf, serviceDiscovered), [servicePerf, serviceDiscovered]);
  const enriched = isService ? serviceEnriched : productEnriched;

  const kpis = useMemo(() => {
    const gradeA = enriched.filter((s) => s.grade.label.startsWith("A")).length;
    const gradeB = enriched.filter((s) => s.grade.label.startsWith("B")).length;
    const improving = enriched.filter((s) => s.trend.key === "up").length;
    return { total: enriched.length, gradeA, gradeB, improving, avgScore: enriched.length ? Math.round(avg(enriched.map((s) => s.latest)) * 10) / 10 : 0 };
  }, [enriched]);

  const rows = useMemo(() => {
    let list = [...enriched];
    if (filter === "A") list = list.filter((s) => s.grade.label.startsWith("A"));
    else if (filter === "B") list = list.filter((s) => s.grade.label.startsWith("B"));
    else if (filter === "improving") list = list.filter((s) => s.trend.key === "up");
    if (sortBy === "score") list.sort((a, b) => b.latest - a.latest);
    else if (sortBy === "name") list.sort((a, b) => a.name.localeCompare(b.name));
    else if (sortBy === "trend") {
      const order = { up: 0, stable: 1, down: 2 };
      list.sort((a, b) => order[a.trend.key] - order[b.trend.key]);
    }
    return list;
  }, [enriched, filter, sortBy]);

  const toggleHidden = (name) => setHidden((h) => ({ ...h, [name]: !h[name] }));

  // Chart shows ONLY evaluated suppliers — un-reviewed ones all sit on the
  // default 85 and stack into one flat line, which reads as wrong data.
  const charted = useMemo(() => enriched.filter((s) => s.hasData), [enriched]);
  const pendingCount = enriched.length - charted.length;

  /* ---- Persist (POST new / PUT :id) — targets the active category ---- */
  async function persist(nextPerf, cat = category) {
    const svc = cat === "service";
    const type = svc ? SERVICE_PERF_TYPE : PERF_TYPE;
    const curRecId = svc ? serviceRecId : recId;
    const setRec = svc ? setServiceRecId : setRecId;
    setSaving(true);
    setNotice("");
    const payload = { suppliers: nextPerf, savedAt: new Date().toISOString(), reportDate: new Date().toISOString().slice(0, 10) };
    try {
      let res;
      if (curRecId) {
        res = await fetch(`${API_BASE}/api/reports/${curRecId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ type, payload }),
        });
      } else {
        res = await fetch(`${API_BASE}/api/reports`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ reporter: "quality", type, payload }),
        });
      }
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const saved = await res.json().catch(() => null);
      const newId = saved?.report?.id ?? saved?.report?._id ?? saved?.id ?? null;
      if (newId) setRec(newId);
      setNotice("✅ Saved");
    } catch (e) {
      console.error(e);
      setNotice("❌ Save failed — check server/network");
    } finally {
      setSaving(false);
      setTimeout(() => setNotice(""), 3500);
    }
  }

  /* ---- Edit helpers ---- */
  const openEdit = (s) => setEdit({ origName: s.name, isNew: false, name: s.name, scores: [...s.scores], breakdown: { ...s.breakdown } });
  const openAdd = () => setEdit({ origName: null, isNew: true, name: "", scores: [85, 85, 85, 85, 85, 85], breakdown: { delivery: 85, quality: 85, rejection: 85, documentation: 85 } });

  function saveEdit() {
    const name = String(edit.name || "").trim();
    if (!name) { setNotice("⚠ Supplier name is required"); return; }
    const next = { ...activePerf };
    if (edit.origName && edit.origName !== name) delete next[edit.origName];
    next[name] = {
      scores: edit.scores.map(clamp),
      breakdown: {
        delivery: clamp(edit.breakdown.delivery),
        quality: clamp(edit.breakdown.quality),
        rejection: clamp(edit.breakdown.rejection),
        documentation: clamp(edit.breakdown.documentation),
      },
      source: activePerf[edit.origName]?.source || (isService ? "Service" : "Manual"),
    };
    setActivePerf(next);
    setEdit(null);
    persist(next, category);
  }

  function removeSupplier(name) {
    if (!window.confirm(`Remove performance data for "${name}"?`)) return;
    const next = { ...activePerf };
    delete next[name];
    setActivePerf(next);
    persist(next, category);
  }

  return (
    <IsoShell
      icon="📊"
      title="Supplier Performance"
      subtitle="Scorecard & Trend Analysis — ISO 22000:2018 Cl. 8.4 & 9.1"
      actions={
        <>
          {notice && <span style={{ fontWeight: 900, fontSize: 16, color: notice.startsWith("✅") ? "#15803d" : notice.startsWith("❌") ? "#b91c1c" : "#a16207" }}>{notice}</span>}
          {saving && <span style={{ fontWeight: 900, fontSize: 16, color: "#0284c7" }}>Saving…</span>}
          <button className="sp-noprint" style={bigBtn("success")} onClick={openAdd}>{isService ? "+ Add Service Provider" : "+ Add Supplier"}</button>
          <button className="sp-noprint" style={bigBtn("primary")} onClick={() => window.print()}>🖨 Print</button>
          <button className="sp-noprint" style={bigBtn("secondary")} onClick={() => navigate("/haccp-iso/supplier-evaluation")}>↩ Back</button>
        </>
      }
    >
      <style>{`@media print { .sp-noprint { display: none !important; } }`}</style>

      {/* Document control badges */}
      <div style={{ marginBottom: 12 }}>
        <span style={{ ...ISO_UI.metaBadge, fontSize: 18 }}>📄 Doc No: <b>{DOC_NO}</b></span>
        <span style={{ ...ISO_UI.metaBadge, fontSize: 18 }}>Rev: <b>{DOC_REV}</b></span>
        <span style={{ ...ISO_UI.metaBadge, fontSize: 18 }}>Issue Date: <b>{ISSUE_DATE}</b></span>
        {isService ? (
          <span style={{ ...ISO_UI.metaBadge, fontSize: 18 }}>Sources: <b>مورّدو الخدمات — Service Providers (Manual)</b></span>
        ) : (
          <span style={{ ...ISO_UI.metaBadge, fontSize: 18 }}>Sources: <b>استلام الشحنات + استلام المكونات (QCS)</b></span>
        )}
        {loading && <span style={{ ...ISO_UI.metaBadge, fontSize: 18, color: "#0284c7" }}>⏳ Loading suppliers…</span>}
      </div>

      {/* Category switch — Product Suppliers vs. Service Providers */}
      <div className="sp-noprint" style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center", marginBottom: 14 }}>
        <span style={{ fontSize: 18, fontWeight: 900, color: "#0c4a6e" }}>CATEGORY:</span>
        <button style={chip(!isService)} onClick={() => { setCategory("product"); setFilter("all"); }}>🏭 Product Suppliers</button>
        <button style={chip(isService)} onClick={() => { setCategory("service"); setFilter("all"); }}>🛠 Service Providers</button>
      </div>

      {/* KPI row */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 12, marginBottom: 14 }}>
        {[
          { label: "Total Suppliers", value: kpis.total, color: "#0284c7" },
          { label: "Grade A / A-", value: kpis.gradeA, color: "#16a34a" },
          { label: "Grade B+ / B", value: kpis.gradeB, color: "#0891b2" },
          { label: "Improving ↑", value: kpis.improving, color: "#15803d" },
          { label: "Avg Score", value: kpis.avgScore, color: "#7c3aed" },
        ].map((k) => (
          <div key={k.label} style={{ ...card, marginBottom: 0, textAlign: "center", padding: "14px 10px", borderTop: `4px solid ${k.color}` }}>
            <div style={{ fontSize: 34, fontWeight: 950, color: k.color, lineHeight: 1.1 }}>{k.value}</div>
            <div style={{ fontSize: 18, fontWeight: 800, color: "#0c4a6e", marginTop: 4 }}>{k.label}</div>
          </div>
        ))}
      </div>

      {/* Trend */}
      <div style={{ ...ISO_UI.band, fontSize: 20 }}>📈 Trend Analysis — Overall Score by Quarter (Evaluated Suppliers Only)</div>
      <div style={card}>
        {charted.length === 0 ? (
          <div style={{ padding: "34px 12px", textAlign: "center", color: "#0c4a6e", fontWeight: 800, fontSize: 19 }}>
            {loading
              ? "Loading…"
              : enriched.length === 0
                ? (isService
                    ? "No service providers yet — press “Add Service Provider” to add one."
                    : "No suppliers yet — add one, or record data in استلام الشحنات / استلام المكونات.")
                : `لا يوجد ${isService ? "مورّدو خدمات مقيَّمون" : "موردون مقيَّمون"} بعد — الكل (${enriched.length}) على الدرجة الافتراضية 85. اضغط Edit بجانب أي مورد وأدخل درجاته الفصلية ليظهر خطه هنا.`}
          </div>
        ) : (
          <>
            {pendingCount > 0 && (
              <div style={{ marginBottom: 10, fontSize: 18, fontWeight: 800, color: "#a16207", background: "#fef3c7", border: "1px solid #d9a441", borderRadius: 10, padding: "8px 14px", display: "inline-block" }}>
                ⚠ {pendingCount} suppliers still need review — shown in the table below, hidden from the chart until scored.
              </div>
            )}
            <TrendChart suppliers={charted} quarters={QUARTERS} hidden={hidden} />
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 10, borderTop: "1px solid #e0f2fe", paddingTop: 10 }}>
              {charted.map((s) => (
                <button
                  key={s.name}
                  type="button"
                  onClick={() => toggleHidden(s.name)}
                  style={{ display: "inline-flex", alignItems: "center", gap: 7, padding: "7px 14px", borderRadius: 999, border: "1px solid #cbd5e1", background: "#fff", cursor: "pointer", opacity: hidden[s.name] ? 0.35 : 1, fontWeight: 800, fontSize: 18, color: "#0c4a6e" }}
                >
                  <span style={{ width: 13, height: 13, borderRadius: 999, background: s.color, display: "inline-block" }} />
                  {s.name}
                </button>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Scorecard */}
      <div style={{ ...ISO_UI.band, fontSize: 20 }}>{isService ? "🛠 Service Provider Scorecard" : "🏭 Supplier Scorecard"}</div>
      <div style={card}>
        <div className="sp-noprint" style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center", marginBottom: 12 }}>
          <span style={{ fontSize: 18, fontWeight: 900, color: "#0c4a6e" }}>FILTER:</span>
          <button style={chip(filter === "all")} onClick={() => setFilter("all")}>All</button>
          <button style={chip(filter === "A")} onClick={() => setFilter("A")}>Grade A</button>
          <button style={chip(filter === "B")} onClick={() => setFilter("B")}>Grade B</button>
          <button style={chip(filter === "improving")} onClick={() => setFilter("improving")}>Improving ↑</button>
          <span style={{ fontSize: 18, fontWeight: 900, color: "#0c4a6e", marginLeft: 10 }}>SORT:</span>
          <button style={chip(sortBy === "score")} onClick={() => setSortBy("score")}>Score</button>
          <button style={chip(sortBy === "name")} onClick={() => setSortBy("name")}>Name</button>
          <button style={chip(sortBy === "trend")} onClick={() => setSortBy("trend")}>Trend</button>
        </div>

        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", tableLayout: "fixed", fontSize: 20 }}>
            <thead>
              <tr style={ISO_UI.theadRow}>
                <th style={{ ...thc, width: "4%" }}>#</th>
                <th style={{ ...thc, width: "22%", textAlign: "left", paddingLeft: 12 }}>Supplier</th>
                <th style={{ ...thc, width: "9%" }}>Source</th>
                <th style={{ ...thc, width: "6%" }}>Score</th>
                <th style={{ ...thc, width: "7%" }}>Grade</th>
                <th style={{ ...thc, width: "11%" }}>Trend</th>
                <th style={{ ...thc, width: "13%" }}>Decision</th>
                <th style={{ ...thc, width: "11%" }}>6-Quarter</th>
                <th style={{ ...thc, width: "17%" }} className="sp-noprint">Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((s, i) => (
                <tr key={s.name} style={{ background: i % 2 ? "#f0f9ff" : "#fff" }}>
                  <td style={{ ...tdc, color: "#64748b" }}>{i + 1}</td>
                  <td style={{ ...tdc, textAlign: "left", paddingLeft: 12, wordBreak: "break-word" }}>
                    <span style={{ display: "inline-flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                      <span style={{ width: 12, height: 12, borderRadius: 999, background: s.color, display: "inline-block" }} />
                      <b>{s.name}</b>
                      {!s.hasData && <span style={{ fontSize: 15, fontWeight: 800, color: "#a16207", background: "#fef3c7", border: "1px solid #d9a441", borderRadius: 999, padding: "2px 10px" }}>needs review</span>}
                    </span>
                  </td>
                  <td style={{ ...tdc, color: "#0c4a6e" }}>{s.source}</td>
                  <td style={{ ...tdc, fontWeight: 900 }}>{s.latest}</td>
                  <td style={tdc}>
                    <span style={{ display: "inline-block", padding: "4px 13px", borderRadius: 999, fontWeight: 900, fontSize: 20, color: s.grade.color, background: s.grade.bg, border: `1px solid ${s.grade.color}` }}>{s.grade.label}</span>
                  </td>
                  <td style={{ ...tdc, color: s.trend.color, fontWeight: 900, whiteSpace: "nowrap" }}>{s.trend.label}</td>
                  <td style={tdc}>
                    <span style={{ display: "inline-block", padding: "5px 12px", borderRadius: 999, fontWeight: 900, fontSize: 17, color: s.disposition.color, background: s.disposition.bg, border: `1px solid ${s.disposition.color}`, whiteSpace: "nowrap" }}>{s.disposition.label}</span>
                  </td>
                  <td style={tdc}><Sparkline scores={s.scores} color={s.color} /></td>
                  <td style={{ ...tdc, whiteSpace: "nowrap" }} className="sp-noprint">
                    <span style={{ display: "inline-flex", gap: 6 }}>
                      <button type="button" style={tblBtn("secondary")} onClick={() => setDetail(s)}>View</button>
                      <button type="button" style={tblBtn("violet")} onClick={() => openEdit(s)}>Edit</button>
                      <button type="button" style={tblBtn("danger")} onClick={() => removeSupplier(s.name)}>✕</button>
                    </span>
                  </td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr><td style={{ ...tdc, color: "#64748b" }} colSpan={9}>{loading ? "Loading…" : "No suppliers match this filter."}</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Disposition / Action Matrix */}
      <div style={{ ...ISO_UI.band, fontSize: 20 }}>⚖️ Disposition &amp; Action Rules — Acceptance Score ≥ {ACCEPT_THRESHOLD}</div>
      <div style={card}>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", tableLayout: "fixed", fontSize: 18 }}>
            <thead>
              <tr style={ISO_UI.theadRow}>
                <th style={{ ...thc, width: "16%" }}>Score / Grade</th>
                <th style={{ ...thc, width: "18%" }}>Decision</th>
                <th style={{ ...thc, width: "40%", textAlign: "left", paddingLeft: 12 }}>Required Action</th>
                <th style={{ ...thc, width: "26%" }}>Re-evaluation</th>
              </tr>
            </thead>
            <tbody>
              {[
                { band: "≥ 90 · A / A-", dec: dispositionOf(92, "up"), action: "Approved — continue normal supply.", re: "Annually" },
                { band: "83–89 · B+ / B", dec: dispositionOf(85, "stable"), action: "Approved with monitoring — no action unless declining.", re: "Every 6 months" },
                { band: "80–82 · B-", dec: dispositionOf(81, "stable"), action: "Conditional / Watch list — issue improvement notice + request corrective action (CAPA).", re: "Within 3 months" },
                { band: "< 80 · C", dec: dispositionOf(70, "stable"), action: "Suspended — stop new POs, raise NCR/CAPA, remove from ASL if no improvement in agreed period.", re: "After CAPA closure" },
                { band: "Any · Declining ↓", dec: { label: "Review", color: "#a16207", bg: "#fef3c7" }, action: "Flag for review regardless of grade — investigate downward trend.", re: "Immediate" },
              ].map((r, i) => (
                <tr key={r.band} style={{ background: i % 2 ? "#f0f9ff" : "#fff" }}>
                  <td style={{ ...tdc, fontWeight: 900 }}>{r.band}</td>
                  <td style={tdc}>
                    <span style={{ display: "inline-block", padding: "5px 12px", borderRadius: 999, fontWeight: 900, fontSize: 17, color: r.dec.color, background: r.dec.bg, border: `1px solid ${r.dec.color}`, whiteSpace: "nowrap" }}>{r.dec.label}</span>
                  </td>
                  <td style={{ ...tdc, textAlign: "left", paddingLeft: 12, fontWeight: 700, whiteSpace: "normal", wordBreak: "break-word" }}>{r.action}</td>
                  <td style={{ ...tdc, fontWeight: 800 }}>{r.re}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div style={{ marginTop: 10, fontSize: 16, fontWeight: 700, color: "#0c4a6e" }}>
          Ref procedure: <b>SOP 13 — Approved Suppliers (FSMS-QM/SUP §5.1)</b> · This scorecard is the linked record <b>{DOC_NO}</b>.
        </div>
      </div>

      {/* Methodology */}
      <div style={{ ...ISO_UI.band, fontSize: 20 }}>🧮 Scoring Methodology</div>
      <div style={{ ...card, fontSize: 18, fontWeight: 700, color: "#0c4a6e", lineHeight: 1.8 }}>
        Overall score = <b>Delivery 30%</b> + <b>Quality 30%</b> + <b>Rejection Rate 20%</b> + <b>Documentation 20%</b>.<br />
        Grades: <b>A ≥ 93</b> · <b>A- ≥ 90</b> · <b>B+ ≥ 87</b> · <b>B ≥ 83</b> · <b>B- ≥ 80</b> · <b>C &lt; 80</b>. <b style={{ color: "#b91c1c" }}>Minimum acceptance score = {ACCEPT_THRESHOLD}</b> (below 80 → Suspended). Trend compares Q1 2025 → Q2 2026 (≥ +4 improving, ≤ −3 declining).<br />
        Base suppliers auto-load from <b>استلام الشحنات</b> &amp; <b>استلام المكونات</b> (QCS). Rows marked <b style={{ color: "#a16207" }}>needs review</b> keep default scores until edited.
      </div>

      {/* Signatures */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <div style={{ ...card, marginBottom: 0 }}>
          <div style={{ fontSize: 18, fontWeight: 900, color: "#0284c7", marginBottom: 8 }}>PREPARED BY</div>
          <div style={{ fontSize: 18, fontWeight: 700, color: "#0c4a6e" }}>QA Officer — Name / Signature / Date</div>
        </div>
        <div style={{ ...card, marginBottom: 0 }}>
          <div style={{ fontSize: 18, fontWeight: 900, color: "#0284c7", marginBottom: 8 }}>REVIEWED BY</div>
          <div style={{ fontSize: 18, fontWeight: 700, color: "#0c4a6e" }}>Food Safety Team Leader — Name / Signature / Date</div>
        </div>
      </div>

      <div style={{ marginTop: 16, fontSize: 15, color: "#64748b", fontWeight: 800, textAlign: "center" }}>
        © Al Mawashi — Quality &amp; Food Safety System · {DOC_NO} Rev {DOC_REV}
      </div>

      {/* Detail modal */}
      {detail && (
        <div onClick={() => setDetail(null)} style={{ position: "fixed", inset: 0, background: "rgba(2,6,23,0.45)", display: "flex", alignItems: "center", justifyContent: "center", padding: 20, zIndex: 60 }}>
          <div onClick={(e) => e.stopPropagation()} style={{ width: "min(600px, 96vw)", maxHeight: "88vh", overflowY: "auto", background: "#fff", borderRadius: 16, border: "1px solid rgba(15,23,42,0.14)", boxShadow: "0 30px 80px rgba(2,6,23,0.35)", padding: 24 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, marginBottom: 10, borderBottom: "2px solid #e0f2fe", paddingBottom: 10 }}>
              <div style={{ display: "inline-flex", alignItems: "center", gap: 10 }}>
                <span style={{ width: 15, height: 15, borderRadius: 999, background: detail.color, display: "inline-block" }} />
                <div style={{ fontSize: 21, fontWeight: 950, color: "#071b2d" }}>{detail.name}</div>
              </div>
              <button type="button" onClick={() => setDetail(null)} style={{ border: "1px solid #cbd5e1", background: "#f0f9ff", borderRadius: 999, width: 38, height: 38, cursor: "pointer", fontSize: 19, fontWeight: 900, color: "#0c4a6e" }}>×</button>
            </div>
            <div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 16, flexWrap: "wrap" }}>
              <span style={{ padding: "5px 14px", borderRadius: 999, fontWeight: 900, fontSize: 17, color: detail.grade.color, background: detail.grade.bg, border: `1px solid ${detail.grade.color}` }}>Grade {detail.grade.label}</span>
              <span style={{ fontWeight: 900, fontSize: 18, color: "#071b2d" }}>Score {detail.latest}</span>
              <span style={{ color: detail.trend.color, fontWeight: 900, fontSize: 17 }}>{detail.trend.label}</span>
              <span style={{ fontSize: 16, fontWeight: 700, color: "#0c4a6e" }}>Source: {detail.source}</span>
            </div>
            <div style={{ fontSize: 15, fontWeight: 900, color: "#0284c7", textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: 10 }}>Latest Quarter Breakdown</div>
            <BreakdownBars data={detail.breakdown} />
            <div style={{ fontSize: 15, fontWeight: 900, color: "#0284c7", textTransform: "uppercase", letterSpacing: "0.04em", margin: "18px 0 10px" }}>Quarterly History</div>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 17 }}>
                <thead><tr style={ISO_UI.theadRow}>{QUARTERS.map((q) => <th key={q} style={{ ...thc, fontSize: 15, padding: "8px 6px" }}>{q}</th>)}</tr></thead>
                <tbody><tr>{detail.scores.map((v, i) => <td key={i} style={{ ...tdc, fontWeight: 900 }}>{v}</td>)}</tr></tbody>
              </table>
            </div>
            <div style={{ marginTop: 18, textAlign: "right" }}>
              <button style={bigBtn("violet")} onClick={() => { const s = detail; setDetail(null); openEdit(s); }}>Edit Performance</button>
            </div>
          </div>
        </div>
      )}

      {/* Edit / Add modal */}
      {edit && (
        <div onClick={() => setEdit(null)} style={{ position: "fixed", inset: 0, background: "rgba(2,6,23,0.5)", display: "flex", alignItems: "center", justifyContent: "center", padding: 20, zIndex: 70 }}>
          <div onClick={(e) => e.stopPropagation()} style={{ width: "min(680px, 97vw)", maxHeight: "90vh", overflowY: "auto", background: "#fff", borderRadius: 16, border: "1px solid rgba(15,23,42,0.14)", boxShadow: "0 30px 80px rgba(2,6,23,0.4)", padding: 24 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "2px solid #e0f2fe", paddingBottom: 10, marginBottom: 16 }}>
              <div style={{ fontSize: 21, fontWeight: 950, color: "#071b2d" }}>{edit.isNew ? (isService ? "➕ Add Service Provider" : "➕ Add Supplier") : "✏️ Edit Performance"}</div>
              <button type="button" onClick={() => setEdit(null)} style={{ border: "1px solid #cbd5e1", background: "#f0f9ff", borderRadius: 999, width: 38, height: 38, cursor: "pointer", fontSize: 19, fontWeight: 900, color: "#0c4a6e" }}>×</button>
            </div>

            <label style={{ display: "block", fontSize: 15, fontWeight: 900, color: "#0284c7", marginBottom: 6 }}>SUPPLIER NAME</label>
            <input
              type="text"
              value={edit.name}
              onChange={(e) => setEdit((p) => ({ ...p, name: e.target.value }))}
              placeholder={isService ? "e.g. ETS, SGS, EMDAD…" : "e.g. Dabbagh Foods LLC"}
              style={{ width: "100%", padding: "11px 14px", borderRadius: 12, border: "1px solid #cbd5e1", fontSize: 18, fontWeight: 700, boxSizing: "border-box", marginBottom: 18, color: "#0f172a" }}
            />

            <div style={{ fontSize: 15, fontWeight: 900, color: "#0284c7", textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: 8 }}>Quarterly Overall Scores</div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12, marginBottom: 18 }}>
              {QUARTERS.map((q, i) => (
                <div key={q} style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  <span style={{ fontSize: 15, fontWeight: 800, color: "#0c4a6e" }}>{q}</span>
                  <NumInput value={edit.scores[i]} onChange={(v) => setEdit((p) => { const sc = [...p.scores]; sc[i] = v; return { ...p, scores: sc }; })} />
                </div>
              ))}
            </div>

            <div style={{ fontSize: 15, fontWeight: 900, color: "#0284c7", textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: 8 }}>Latest Quarter Breakdown</div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 12, marginBottom: 20 }}>
              {[
                { key: "delivery", label: "Delivery (30%)" },
                { key: "quality", label: "Quality (30%)" },
                { key: "rejection", label: "Rejection Rate (20%)" },
                { key: "documentation", label: "Documentation (20%)" },
              ].map((f) => (
                <div key={f.key} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, border: "1px solid #e0f2fe", borderRadius: 12, padding: "9px 13px", background: "#f0f9ff" }}>
                  <span style={{ fontSize: 16, fontWeight: 800, color: "#0c4a6e" }}>{f.label}</span>
                  <NumInput value={edit.breakdown[f.key]} onChange={(v) => setEdit((p) => ({ ...p, breakdown: { ...p.breakdown, [f.key]: v } }))} />
                </div>
              ))}
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
              <button style={bigBtn("secondary")} onClick={() => setEdit(null)}>Cancel</button>
              <button style={bigBtn("success")} onClick={saveEdit} disabled={saving}>{saving ? "Saving…" : "💾 Save"}</button>
            </div>
          </div>
        </div>
      )}
    </IsoShell>
  );
}
