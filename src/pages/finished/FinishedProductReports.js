// src/pages/finished/FinishedProductReports.js
// ---------------------------------------------------------------------------
// Finished Products — saved reports.
//
// WHY THIS WAS REBUILT
// --------------------
// The screen opened by downloading `?type=finished_products_report&limit=500` —
// every report WITH its full product list — and flattening the lot into one
// array before it could draw anything. Measured against live data:
//
//     221 reports · 34,335 product rows · 9,459,032 bytes · 4.5 s
//
// on EVERY open, for every user, just to learn which dates exist. The date tree
// was never slow; it was waiting behind 9.46 MB. Deleting a single row
// re-downloaded that same 9.46 MB to find the report the row belonged to.
//
// What travels now:
//     mount        → the lite index (id + business date, no payload) ≈ 44 KB
//     click a day  → that one report, then kept for the session
//     search all   → the full set, once, and only when the user asks for it
//
// Same information on screen; 213x less on the wire to get started.
// ---------------------------------------------------------------------------

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import * as XLSX from "xlsx-js-style";
import API_BASE from "../../config/api";
import {
  listReportDates,
  listReports,
  getReportById,
  reportDateOf,
  reportId,
} from "../monitor/branches/_shared/reportApi";
import { GLASS, SPECTRUM } from "../monitor/branches/_shared/branchViewKit";

const TYPE = "finished_products_report";
const PAGE_SIZE = 150;

/* ===================== Dates ===================== */

const pad2 = (v) => String(v).padStart(2, "0");
const isYMD = (s) => /^\d{4}-\d{2}-\d{2}$/.test(String(s || ""));

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

/** Accepts YYYY-MM-DD and DD/MM/YYYY — the sheet stores both. */
function parseAnyDate(s) {
  const t = String(s || "").trim();
  if (!t) return null;
  let m = t.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (m) return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  m = t.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})$/);
  if (m) return new Date(Number(m[3]), Number(m[2]) - 1, Number(m[1]));
  const d = new Date(t);
  return Number.isNaN(d.getTime()) ? null : d;
}

function formatDMY(v) {
  const d = parseAnyDate(v);
  return d ? `${pad2(d.getDate())}/${pad2(d.getMonth() + 1)}/${d.getFullYear()}` : String(v || "");
}

function daysBetween(fromV, toV) {
  const a = parseAnyDate(fromV);
  const b = parseAnyDate(toV);
  if (!a || !b) return "";
  const A = new Date(a.getFullYear(), a.getMonth(), a.getDate()).getTime();
  const B = new Date(b.getFullYear(), b.getMonth(), b.getDate()).getTime();
  return Math.round((B - A) / 86400000);
}

/** Shelf life left, judged from the report's OWN date — not from today, so an
    old report keeps reading the way it read on the day it was filed. */
function statusFromDates(reportDate, expiryDate) {
  const d = daysBetween(reportDate, expiryDate);
  if (d === "") return { days: "", label: "—", tone: "muted" };
  if (d < 0) return { days: d, label: "EXPIRED", tone: "danger" };
  if (d === 0) return { days: d, label: "EXPIRES TODAY", tone: "danger" };
  if (d <= 6) return { days: d, label: "NEAR EXPIRY", tone: "warn" };
  return { days: d, label: "OK", tone: "ok" };
}

/* ===================== Data ===================== */

/** One saved report, in the shape this screen works with. */
function shapeReport(row) {
  const payload = row?.payload && typeof row.payload === "object" ? row.payload : row || {};
  return {
    id: String(reportId(row) || row?.id || ""),
    reportDate: reportDateOf(row) || payload.reportDate || "",
    reportTitle: payload.reportTitle || "FINISHED PRODUCTS",
    checkedBy: payload.checkedBy || "",
    verifiedBy: payload.verifiedBy || "",
    products: Array.isArray(payload.products) ? payload.products : [],
  };
}

/** A report's products as flat rows, each carrying its parent's context. */
function rowsOf(rep) {
  return (rep?.products || []).map((p, i) => ({
    ...p,
    __reportId: rep.id,
    __index: i,
    reportDate: rep.reportDate,
    reportTitle: rep.reportTitle,
    checkedBy: rep.checkedBy,
    verifiedBy: rep.verifiedBy,
    __status: statusFromDates(rep.reportDate, p?.expiryDate),
  }));
}

async function deleteReportOnServer(id) {
  const res = await fetch(`${API_BASE}/api/reports/${encodeURIComponent(id)}`, { method: "DELETE" });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || data?.ok === false) throw new Error(data?.error || "Delete failed");
}

/* Deleting one line used to re-download every report to find the one it sat in.
   The report is already open on screen, so it is written back directly. */
async function saveReportProducts(rep, products) {
  const res = await fetch(`${API_BASE}/api/reports/${encodeURIComponent(rep.id)}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      payload: {
        reportTitle: rep.reportTitle,
        reportDate: rep.reportDate,
        products,
        checkedBy: rep.checkedBy || "",
        verifiedBy: rep.verifiedBy || "",
      },
    }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || data?.ok === false) throw new Error(data?.error || "Update failed");
}

/* ===================== Look ===================== */

const INK = "#0b1f4d";
const SUB = "#64748b";
const LINE = "rgba(148,163,184,0.30)";

const TONE = {
  danger: { bg: "#fee2e2", fg: "#991b1b", dot: "#ef4444" },
  warn: { bg: "#ffedd5", fg: "#9a3412", dot: "#f97316" },
  ok: { bg: "#dcfce7", fg: "#166534", dot: "#22c55e" },
  muted: { bg: "#f1f5f9", fg: "#475569", dot: "#94a3b8" },
};

/* globals.css forces `#root *` to 14px and `#root table *` to 12px with
   !important, so every size here has to be re-stated through a doubled class. */
const CSS = `
#root .fpr.fpr { color: ${INK}; }
#root .fpr.fpr .fpr-h1 { font-size: 20px !important; font-weight: 900 !important; letter-spacing: -.02em; }
#root .fpr.fpr .fpr-sub { font-size: 12.5px !important; color: ${SUB}; font-weight: 600; }
#root .fpr.fpr .fpr-kpi-v { font-size: 23px !important; font-weight: 900 !important; line-height: 1.1; }
#root .fpr.fpr .fpr-kpi-l { font-size: 10.5px !important; letter-spacing: .06em; text-transform: uppercase; color: ${SUB}; font-weight: 800; }
#root .fpr.fpr th { font-size: 10.5px !important; letter-spacing: .05em; text-transform: uppercase; }
#root .fpr.fpr td { font-size: 12.5px !important; }
#root .fpr.fpr table { border-collapse: separate; border-spacing: 0; }
#root .fpr.fpr tbody tr { transition: background .12s ease; }
#root .fpr.fpr tbody tr:hover { background: rgba(139,92,246,.07) !important; }
#root .fpr.fpr .fpr-mark { background: #fde68a; border-radius: 3px; padding: 0 1px; }
#root .fpr.fpr .fpr-kpi:hover { transform: translateY(-1px); }
#root .fpr.fpr .fpr-kpi { transition: transform .12s ease, box-shadow .12s ease; }
@media print {
  #root .fpr.fpr .fpr-noprint { display: none !important; }
  #root .fpr.fpr { background: #fff !important; box-shadow: none !important; }
}
`;

const glassCard = { ...GLASS.card, padding: 14 };

const btn = (bg, fg = "#fff") => ({
  background: bg,
  color: fg,
  border: bg === "#fff" ? `1px solid ${LINE}` : "none",
  borderRadius: 11,
  padding: "8px 14px",
  fontWeight: 800,
  fontSize: 12.5,
  cursor: "pointer",
  whiteSpace: "nowrap",
});

const field = {
  border: `1px solid ${LINE}`,
  borderRadius: 10,
  padding: "8px 11px",
  fontSize: 12.5,
  fontWeight: 600,
  background: "rgba(255,255,255,.92)",
  color: INK,
  outline: "none",
  minWidth: 0,
};

function Kpi({ label, value, tone = "muted", icon, onClick, active }) {
  const t = TONE[tone] || TONE.muted;
  return (
    <button
      type="button"
      className="fpr-kpi"
      onClick={onClick}
      disabled={!onClick}
      style={{
        ...glassCard,
        padding: "11px 14px",
        display: "flex",
        alignItems: "center",
        gap: 12,
        textAlign: "left",
        cursor: onClick ? "pointer" : "default",
        boxShadow: active ? `0 0 0 2px ${t.dot}` : glassCard.boxShadow,
        flex: "1 1 156px",
        minWidth: 156,
      }}
    >
      <span
        style={{
          width: 38, height: 38, borderRadius: 11, display: "grid", placeItems: "center",
          background: t.bg, color: t.fg, fontSize: 17, flex: "none",
        }}
      >
        {icon}
      </span>
      <span style={{ minWidth: 0 }}>
        <span className="fpr-kpi-v" style={{ display: "block", color: t.fg }}>{value}</span>
        <span className="fpr-kpi-l" style={{ display: "block" }}>{label}</span>
      </span>
    </button>
  );
}

function Pill({ tone = "muted", children, title }) {
  const t = TONE[tone] || TONE.muted;
  return (
    <span
      title={title}
      style={{
        display: "inline-flex", alignItems: "center", gap: 5,
        background: t.bg, color: t.fg, border: `1px solid ${t.dot}55`,
        borderRadius: 999, padding: "2px 9px", fontWeight: 800, fontSize: 11, whiteSpace: "nowrap",
      }}
    >
      <span style={{ width: 6, height: 6, borderRadius: 99, background: t.dot }} />
      {children}
    </span>
  );
}

/** Highlight the search term without a regex — the user can type "(". */
function Marked({ text, q }) {
  const s = String(text ?? "");
  const needle = String(q || "").trim();
  if (!needle) return s;
  const at = s.toLowerCase().indexOf(needle.toLowerCase());
  if (at < 0) return s;
  return (
    <>
      {s.slice(0, at)}
      <mark className="fpr-mark">{s.slice(at, at + needle.length)}</mark>
      {s.slice(at + needle.length)}
    </>
  );
}


/* ===================== Date tree =====================
   Purpose-built rather than the shared CollapsibleDateTree: that one renders a
   TIME level under every day, because the logs it was written for take several
   readings a day. Finished Products files exactly one report per day, so that
   level was always a single "🕓 —" button - one more click, and a dash where a
   time should be. Here the day itself is the target.

   Colour follows the app's own year → month → day spectrum. */

const TREE_COLLAPSE_KEY = "finishedReports.tree.collapsed.v2";

function loadCollapsed() {
  try {
    const raw = localStorage.getItem(TREE_COLLAPSE_KEY);
    return new Set(raw ? JSON.parse(raw) : []);
  } catch {
    return new Set();
  }
}

function DateTree({ nav, activeDate, onPick }) {
  const [collapsed, setCollapsed] = useState(loadCollapsed);
  const [q, setQ] = useState("");
  const seeded = useRef(false);

  useEffect(() => {
    try {
      localStorage.setItem(TREE_COLLAPSE_KEY, JSON.stringify(Array.from(collapsed)));
    } catch {
      /* ignore */
    }
  }, [collapsed]);

  /* First paint with data: if the user has no saved preference, show the newest
     year and month open and everything older folded away. */
  useEffect(() => {
    if (seeded.current || !nav.length) return;
    seeded.current = true;
    if (loadCollapsed().size) return;
    const shut = new Set();
    nav.forEach((y, yi) => {
      if (yi > 0) shut.add(`y:${y.year}`);
      y.months.forEach((m, mi) => {
        if (yi > 0 || mi > 0) shut.add(`m:${m.ym}`);
      });
    });
    setCollapsed(shut);
  }, [nav]);

  const toggle = (key) =>
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });

  /* Typing filters the tree and opens what survives, so a date months back is
     two keystrokes away instead of a scroll. */
  const needle = q.trim().toLowerCase();
  const view = useMemo(() => {
    if (!needle) return nav;
    return nav
      .map((y) => ({
        ...y,
        months: y.months
          .map((m) => ({
            ...m,
            days: m.days.filter(
              (d) =>
                d.date.includes(needle) ||
                formatDMY(d.date).includes(needle) ||
                m.month.toLowerCase().includes(needle) ||
                y.year.includes(needle)
            ),
          }))
          .filter((m) => m.days.length),
      }))
      .filter((y) => y.months.length);
  }, [nav, needle]);

  const rowBase = {
    width: "100%",
    display: "flex",
    alignItems: "center",
    gap: 8,
    border: "none",
    cursor: "pointer",
    fontWeight: 800,
    textAlign: "left",
  };

  const count = (n) => (
    <span
      style={{
        marginLeft: "auto",
        background: "rgba(255,255,255,.65)",
        borderRadius: 999,
        padding: "1px 7px",
        fontSize: 10.5,
        fontWeight: 900,
        color: "inherit",
      }}
    >
      {n}
    </span>
  );

  return (
    <div>
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Jump to a date…"
        style={{ ...field, width: "100%", marginBottom: 8, fontSize: 12 }}
      />

      {!view.length && (
        <div style={{ color: SUB, fontSize: 12, fontWeight: 600, padding: "10px 4px" }}>
          {needle ? "No date matches." : "No reports yet."}
        </div>
      )}

      {view.map((y) => {
        const yShut = collapsed.has(`y:${y.year}`) && !needle;
        const yDays = y.months.reduce((n, m) => n + m.days.length, 0);
        return (
          <div key={y.year} style={{ marginBottom: 6 }}>
            <button
              onClick={() => toggle(`y:${y.year}`)}
              style={{
                ...rowBase,
                background: SPECTRUM.year.bg,
                border: SPECTRUM.year.border,
                color: SPECTRUM.year.color,
                boxShadow: SPECTRUM.year.shadow,
                borderRadius: 10,
                padding: "7px 10px",
                fontSize: 13,
              }}
            >
              <span style={{ opacity: 0.7, fontSize: 10 }}>{yShut ? "▶" : "▼"}</span>
              {y.year}
              {count(yDays)}
            </button>

            {!yShut &&
              y.months.map((m) => {
                const mShut = collapsed.has(`m:${m.ym}`) && !needle;
                return (
                  <div key={m.ym} style={{ marginLeft: 10, marginTop: 5 }}>
                    <button
                      onClick={() => toggle(`m:${m.ym}`)}
                      style={{
                        ...rowBase,
                        background: SPECTRUM.month.bg,
                        border: SPECTRUM.month.border,
                        color: SPECTRUM.month.color,
                        boxShadow: SPECTRUM.month.shadow,
                        borderRadius: 9,
                        padding: "6px 9px",
                        fontSize: 12,
                      }}
                    >
                      <span style={{ opacity: 0.7, fontSize: 9 }}>{mShut ? "▶" : "▼"}</span>
                      {m.month}
                      {count(m.days.length)}
                    </button>

                    {!mShut && (
                      <div style={{ marginLeft: 10, marginTop: 4, display: "grid", gap: 4 }}>
                        {m.days.map((d) => {
                          const on = d.date === activeDate;
                          const skin = on ? SPECTRUM.dayActive : SPECTRUM.day;
                          return (
                            <button
                              key={d.date}
                              onClick={() => onPick(d)}
                              title={`Open ${formatDMY(d.date)}`}
                              style={{
                                ...rowBase,
                                background: skin.bg,
                                border: skin.border,
                                color: skin.color,
                                boxShadow: skin.shadow,
                                borderRadius: 9,
                                padding: "6px 10px",
                                fontSize: 12,
                                fontVariantNumeric: "tabular-nums",
                              }}
                            >
                              {on ? "●" : "○"} {formatDMY(d.date)}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
          </div>
        );
      })}
    </div>
  );
}

/* ===================== Page ===================== */

export default function FinishedProductReports() {
  const navigate = useNavigate();

  /* The index: one row per report, no payload. The tree is built from this,
     and it is the only thing fetched on mount. */
  const [index, setIndex] = useState([]);
  const [loadingIndex, setLoadingIndex] = useState(true);
  const [indexError, setIndexError] = useState("");

  /* Reports whose products have actually been fetched, keyed by id. */
  const [loaded, setLoaded] = useState(() => new Map());
  const [openingId, setOpeningId] = useState("");
  const [activeId, setActiveId] = useState("");

  /* "All dates" is opt-in — the only thing that pulls every payload. */
  const [scope, setScope] = useState("day"); // "day" | "all"
  const [loadingAll, setLoadingAll] = useState(false);

  const [search, setSearch] = useState("");
  const [dSearch, setDSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [customerFilter, setCustomerFilter] = useState("");
  const [unitFilter, setUnitFilter] = useState("");
  const [sortBy, setSortBy] = useState("date_desc");
  const [limit, setLimit] = useState(PAGE_SIZE);

  const [banner, setBanner] = useState(null);
  const [confirm, setConfirm] = useState(null);
  const [busy, setBusy] = useState(false);

  const say = useCallback((text, tone = "ok", ms = 2600) => {
    setBanner({ text, tone });
    if (ms) setTimeout(() => setBanner(null), ms);
  }, []);

  /* ---------- mount: the index only ---------- */
  const loadIndex = useCallback(async (opts = {}) => {
    setLoadingIndex(true);
    setIndexError("");
    try {
      const rows = await listReportDates(TYPE);
      const clean = (Array.isArray(rows) ? rows : [])
        .map((r) => ({ id: String(reportId(r) || r.id || ""), date: reportDateOf(r) || "" }))
        .filter((r) => r.id && isYMD(r.date))
        .sort((a, b) => b.date.localeCompare(a.date) || b.id.localeCompare(a.id));
      setIndex(clean);
      if (!opts.keepSelection && clean.length) setActiveId(clean[0].id);
      return clean;
    } catch (e) {
      setIndexError(e?.message || "Could not read the report index.");
      setIndex([]);
      return [];
    } finally {
      setLoadingIndex(false);
    }
  }, []);

  useEffect(() => { loadIndex(); }, [loadIndex]);

  useEffect(() => {
    const t = setTimeout(() => setDSearch(search.trim()), 250);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => {
    setLimit(PAGE_SIZE);
  }, [dSearch, statusFilter, customerFilter, unitFilter, sortBy, activeId, scope]);

  /* ---------- open one day, then keep it ---------- */
  const openReport = useCallback(async (id) => {
    const key = String(id || "");
    if (!key) return;
    setActiveId(key);
    setOpeningId(key);
    try {
      const raw = await getReportById(key);
      if (raw) setLoaded((prev) => new Map(prev).set(key, shapeReport(raw)));
    } catch (e) {
      say(e?.message || "Could not open that report.", "danger", 3500);
    } finally {
      setOpeningId("");
    }
  }, [say]);

  /* The first date is selected by loadIndex, and any date the user clicks that
     is not in hand yet is fetched here - once. */
  useEffect(() => {
    if (!activeId || loaded.has(activeId)) return;
    openReport(activeId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeId]);

  /* ---------- the whole archive, on request ---------- */
  const loadAll = useCallback(async () => {
    setLoadingAll(true);
    try {
      const rows = await listReports(TYPE, { limit: 5000 });
      const next = new Map();
      (Array.isArray(rows) ? rows : []).forEach((r) => {
        const rep = shapeReport(r);
        if (rep.id) next.set(rep.id, rep);
      });
      setLoaded(next);
      setScope("all");
      const total = Array.from(next.values()).reduce((n, r) => n + r.products.length, 0);
      say(`Loaded every date — ${next.size} reports, ${total.toLocaleString()} rows.`);
    } catch (e) {
      say(e?.message || "Could not load every date.", "danger", 3500);
    } finally {
      setLoadingAll(false);
    }
  }, [say]);

  /* ---------- the tree ---------- */
  const groupedNav = useMemo(() => {
    const years = new Map();
    for (const r of index) {
      const y = r.date.slice(0, 4);
      const ym = r.date.slice(0, 7);
      if (!years.has(y)) years.set(y, new Map());
      const months = years.get(y);
      if (!months.has(ym)) months.set(ym, new Map());
      const days = months.get(ym);
      if (!days.has(r.date)) days.set(r.date, []);
      days.get(r.date).push({ id: r.id, date: r.date, label: formatDMY(r.date) });
    }
    return Array.from(years.entries())
      .sort((a, b) => b[0].localeCompare(a[0]))
      .map(([year, months]) => ({
        year,
        months: Array.from(months.entries())
          .sort((a, b) => b[0].localeCompare(a[0]))
          .map(([ym, days]) => ({
            ym,
            month: MONTHS[Number(ym.slice(5, 7)) - 1] || ym,
            days: Array.from(days.entries())
              .sort((a, b) => b[0].localeCompare(a[0]))
              .map(([date, items]) => ({ date, items })),
          })),
      }));
  }, [index]);

  const activeDate = useMemo(
    () => index.find((r) => r.id === activeId)?.date || "",
    [index, activeId]
  );
  const activeReport = loaded.get(activeId) || null;

  /* ---------- rows on screen ---------- */
  const scopeRows = useMemo(() => {
    if (scope === "all") {
      const out = [];
      for (const rep of loaded.values()) out.push(...rowsOf(rep));
      return out;
    }
    return activeReport ? rowsOf(activeReport) : [];
  }, [scope, loaded, activeReport]);

  const customers = useMemo(
    () => Array.from(new Set(scopeRows.map((r) => (r.customer || "").trim()).filter(Boolean))).sort(),
    [scopeRows]
  );
  const units = useMemo(
    () => Array.from(new Set(scopeRows.map((r) => (r.unitOfMeasure || "").trim()).filter(Boolean))).sort(),
    [scopeRows]
  );

  const filtered = useMemo(() => {
    const q = dSearch.toLowerCase();
    let out = scopeRows;

    if (q) {
      out = out.filter((r) =>
        [r.product, r.customer, r.orderNo, r.remarks, r.reportDate, r.unitOfMeasure].some((v) =>
          String(v ?? "").toLowerCase().includes(q)
        )
      );
    }
    if (statusFilter !== "all") out = out.filter((r) => r.__status.tone === statusFilter);
    if (customerFilter) out = out.filter((r) => (r.customer || "").trim() === customerFilter);
    if (unitFilter) out = out.filter((r) => (r.unitOfMeasure || "").trim() === unitFilter);

    const qty = (r) => Number(r.quantity) || 0;
    const weight = (r) => (r.__status.tone === "danger" ? 2 : r.__status.tone === "warn" ? 1 : 0);
    const sorted = out.slice();
    switch (sortBy) {
      case "date_asc": sorted.sort((a, b) => String(a.reportDate).localeCompare(String(b.reportDate))); break;
      case "product_az": sorted.sort((a, b) => String(a.product || "").localeCompare(String(b.product || ""))); break;
      case "customer_az": sorted.sort((a, b) => String(a.customer || "").localeCompare(String(b.customer || ""))); break;
      case "qty_desc": sorted.sort((a, b) => qty(b) - qty(a)); break;
      case "qty_asc": sorted.sort((a, b) => qty(a) - qty(b)); break;
      case "issues": sorted.sort((a, b) => weight(b) - weight(a)); break;
      default: sorted.sort((a, b) => String(b.reportDate).localeCompare(String(a.reportDate)));
    }
    return sorted;
  }, [scopeRows, dSearch, statusFilter, customerFilter, unitFilter, sortBy]);

  const stats = useMemo(() => {
    let expired = 0;
    let near = 0;
    const byUnit = new Map();
    for (const r of filtered) {
      if (r.__status.tone === "danger") expired++;
      else if (r.__status.tone === "warn") near++;
      const u = (r.unitOfMeasure || "").trim() || "—";
      byUnit.set(u, (byUnit.get(u) || 0) + (Number(r.quantity) || 0));
    }
    return { expired, near, byUnit };
  }, [filtered]);

  const hasFilters =
    !!dSearch || statusFilter !== "all" || !!customerFilter || !!unitFilter || sortBy !== "date_desc";

  const clearFilters = () => {
    setSearch("");
    setStatusFilter("all");
    setCustomerFilter("");
    setUnitFilter("");
    setSortBy("date_desc");
  };

  const totalRowsLoaded = useMemo(
    () => Array.from(loaded.values()).reduce((n, r) => n + r.products.length, 0),
    [loaded]
  );

  /* ---------- export ---------- */
  const exportXLSX = () => {
    if (!filtered.length) return say("Nothing to export.", "warn");
    const head = [
      "Report Date", "Product", "Customer", "Order No", "Time",
      "Slaughter Date", "Expiry Date", "Shelf life (days)", "Status",
      "TEMP", "Quantity", "Unit", "Overall Condition", "Remarks",
      "Checked By", "Verified By",
    ];
    const body = filtered.map((r) => [
      formatDMY(r.reportDate), r.product || "", r.customer || "", r.orderNo || "", r.time || "",
      formatDMY(r.slaughterDate), formatDMY(r.expiryDate),
      r.__status.days === "" ? "" : r.__status.days, r.__status.label,
      r.temp ?? "", Number(r.quantity) || 0, r.unitOfMeasure || "",
      r.overallCondition || "", r.remarks || "", r.checkedBy || "", r.verifiedBy || "",
    ]);
    const ws = XLSX.utils.aoa_to_sheet([head, ...body]);
    ws["!cols"] = head.map((h, i) => ({
      wch: Math.min(38, Math.max(h.length + 2, ...body.map((row) => String(row[i] ?? "").length + 2))),
    }));
    ws["!freeze"] = { xSplit: 0, ySplit: 1 };
    for (let c = 0; c < head.length; c++) {
      const cell = ws[XLSX.utils.encode_cell({ r: 0, c })];
      if (cell) {
        cell.s = {
          font: { bold: true, color: { rgb: "FFFFFF" } },
          fill: { fgColor: { rgb: "4C1D95" } },
          alignment: { horizontal: "center", vertical: "center" },
        };
      }
    }
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Finished Products");
    XLSX.writeFile(wb, `finished-products_${scope === "all" ? "all-dates" : activeDate || "report"}.xlsx`);
    say(`Exported ${filtered.length} row(s).`);
  };

  /* ---------- delete ---------- */
  const doDelete = async () => {
    if (!confirm) return;
    setBusy(true);
    try {
      if (confirm.kind === "report") {
        await deleteReportOnServer(confirm.id);
        setLoaded((prev) => {
          const next = new Map(prev);
          next.delete(confirm.id);
          return next;
        });
        const rest = await loadIndex({ keepSelection: true });
        if (!rest.some((r) => r.id === confirm.id)) setActiveId(rest[0]?.id || "");
        say("Report deleted.");
      } else {
        const rep = loaded.get(confirm.id);
        if (!rep) throw new Error("That report is not open.");
        const products = rep.products.slice();
        products.splice(confirm.index, 1);
        await saveReportProducts(rep, products);
        setLoaded((prev) => new Map(prev).set(rep.id, { ...rep, products }));
        say("Row deleted.");
      }
    } catch (e) {
      say(e?.message || "Delete failed.", "danger", 3500);
    } finally {
      setBusy(false);
      setConfirm(null);
    }
  };

  /* ===================== render ===================== */
  return (
    <div className="fpr" style={{ ...GLASS.shell, minHeight: "100vh", padding: 16 }}>
      <style>{CSS}</style>

      <div style={{ ...glassCard, display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap", marginBottom: 12 }}>
        <div
          style={{
            width: 46, height: 46, borderRadius: 14, display: "grid", placeItems: "center",
            background: "linear-gradient(135deg,#8b5cf6,#0ea5e9)", color: "#fff", fontSize: 21, flex: "none",
          }}
        >
          📦
        </div>
        <div style={{ minWidth: 0, flex: 1 }}>
          <div className="fpr-h1">Finished Products — Reports</div>
          <div className="fpr-sub">
            {loadingIndex
              ? "Reading the index…"
              : `${index.length} report${index.length === 1 ? "" : "s"} on file` +
                (scope === "all"
                  ? ` · all dates loaded (${totalRowsLoaded.toLocaleString()} rows)`
                  : activeDate
                  ? ` · showing ${formatDMY(activeDate)}`
                  : "")}
          </div>
        </div>
        <div className="fpr-noprint" style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button style={btn("#fff", INK)} onClick={() => loadIndex({ keepSelection: true })}>↻ Refresh</button>
          <button style={btn("#fff", INK)} onClick={() => window.print()}>🖨 Print</button>
          <button style={btn("#0ea5e9")} onClick={exportXLSX}>⬇ Export Excel</button>
          <button
            style={btn("linear-gradient(135deg,#8b5cf6,#6366f1)")}
            onClick={() => navigate("/finished-product-entry")}
          >
            ＋ New Entry
          </button>
        </div>
      </div>

      {banner && (
        <div
          style={{
            ...glassCard, marginBottom: 12, padding: "10px 14px", fontWeight: 700, fontSize: 13,
            color: (TONE[banner.tone] || TONE.ok).fg, background: (TONE[banner.tone] || TONE.ok).bg,
          }}
        >
          {banner.text}
        </div>
      )}

      {indexError && (
        <div style={{ ...glassCard, marginBottom: 12, padding: "10px 14px", background: TONE.danger.bg, color: TONE.danger.fg, fontWeight: 700 }}>
          ⚠️ {indexError}
        </div>
      )}

      <div className="fpr-noprint" style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 12 }}>
        <Kpi label="Rows in view" value={filtered.length.toLocaleString()} tone="muted" icon="▦" />
        <Kpi
          label="Expired" value={stats.expired} tone="danger" icon="⛔"
          active={statusFilter === "danger"}
          onClick={() => setStatusFilter((s) => (s === "danger" ? "all" : "danger"))}
        />
        <Kpi
          label="Near expiry" value={stats.near} tone="warn" icon="⚠"
          active={statusFilter === "warn"}
          onClick={() => setStatusFilter((s) => (s === "warn" ? "all" : "warn"))}
        />
        {Array.from(stats.byUnit.entries())
          .sort((a, b) => b[1] - a[1])
          .slice(0, 2)
          .map(([unit, q]) => (
            <Kpi key={unit} label={`Total ${unit}`} value={Number(q.toFixed(2)).toLocaleString()} tone="ok" icon="⚖" />
          ))}
      </div>

      <div style={{ display: "flex", gap: 12, alignItems: "flex-start", flexWrap: "wrap" }}>
        <div
          className="fpr-noprint"
          style={{
            ...glassCard, width: 268, flex: "0 0 268px", padding: 10,
            position: "sticky", top: 12, maxHeight: "calc(100vh - 24px)", overflow: "auto",
          }}
        >
          <div style={{ fontWeight: 900, fontSize: 12, letterSpacing: ".05em", textTransform: "uppercase", color: SUB, padding: "2px 4px 10px" }}>
            📅 Dates
          </div>

          {loadingIndex ? (
            <div style={{ padding: 12, color: SUB, fontSize: 12.5, fontWeight: 600 }}>Loading…</div>
          ) : (
            <DateTree
              nav={groupedNav}
              activeDate={scope === "day" ? activeDate : ""}
              onPick={(d) => {
                setScope("day");
                const id = d?.items?.[0]?.id;
                if (id) setActiveId(String(id));
              }}
            />
          )}

          <div style={{ borderTop: `1px solid ${LINE}`, marginTop: 10, paddingTop: 10 }}>
            {scope === "all" ? (
              <button style={{ ...btn("#fff", INK), width: "100%" }} onClick={() => setScope("day")}>
                Back to one day
              </button>
            ) : (
              <button
                style={{ ...btn("#fff", INK), width: "100%" }}
                onClick={loadAll}
                disabled={loadingAll}
                title="Loads every report so search covers the whole archive"
              >
                {loadingAll ? "Loading every date…" : "🔎 Search all dates"}
              </button>
            )}
            <div style={{ fontSize: 10.5, color: SUB, marginTop: 6, lineHeight: 1.55, fontWeight: 600 }}>
              One day is loaded at a time. "All dates" fetches the whole archive — use it when you need
              to search across reports.
            </div>
          </div>
        </div>

        <div style={{ ...GLASS.content, flex: "1 1 560px", minWidth: 0 }}>
          <div className="fpr-noprint" style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center", marginBottom: 12 }}>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={scope === "all" ? "Search every date…" : "Search this day…"}
              style={{ ...field, flex: "1 1 200px" }}
            />
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} style={field}>
              <option value="all">All statuses</option>
              <option value="danger">Expired</option>
              <option value="warn">Near expiry</option>
              <option value="ok">OK</option>
            </select>
            <select value={customerFilter} onChange={(e) => setCustomerFilter(e.target.value)} style={field}>
              <option value="">All customers</option>
              {customers.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
            <select value={unitFilter} onChange={(e) => setUnitFilter(e.target.value)} style={field}>
              <option value="">All units</option>
              {units.map((u) => <option key={u} value={u}>{u}</option>)}
            </select>
            <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} style={field}>
              <option value="date_desc">Newest first</option>
              <option value="date_asc">Oldest first</option>
              <option value="product_az">Product A-Z</option>
              <option value="customer_az">Customer A-Z</option>
              <option value="qty_desc">Quantity high to low</option>
              <option value="qty_asc">Quantity low to high</option>
              <option value="issues">Issues first</option>
            </select>
            {hasFilters && <button style={btn("#fff", INK)} onClick={clearFilters}>✕ Clear</button>}
          </div>

          {scope === "day" && activeReport && (
            <div
              style={{
                display: "flex", gap: 14, flexWrap: "wrap", alignItems: "center",
                padding: "10px 12px", borderRadius: 12, marginBottom: 12,
                background: "linear-gradient(135deg, rgba(139,92,246,.10), rgba(14,165,233,.08))",
                border: `1px solid ${LINE}`,
              }}
            >
              <div style={{ fontWeight: 900, fontSize: 15 }}>{formatDMY(activeReport.reportDate)}</div>
              <div style={{ fontSize: 12, color: SUB, fontWeight: 700 }}>{activeReport.reportTitle}</div>
              <div style={{ flex: 1 }} />
              {activeReport.checkedBy && (
                <div style={{ fontSize: 11.5, color: SUB, fontWeight: 700 }}>
                  Checked by <b style={{ color: INK }}>{activeReport.checkedBy}</b>
                </div>
              )}
              {activeReport.verifiedBy && (
                <div style={{ fontSize: 11.5, color: SUB, fontWeight: 700 }}>
                  Verified by <b style={{ color: INK }}>{activeReport.verifiedBy}</b>
                </div>
              )}
              <button
                className="fpr-noprint"
                style={btn("#fee2e2", "#991b1b")}
                onClick={() => setConfirm({ kind: "report", id: activeReport.id, date: activeReport.reportDate })}
              >
                🗑 Delete report
              </button>
            </div>
          )}

          {openingId ? (
            <div style={{ padding: 40, textAlign: "center", color: SUB, fontWeight: 700 }}>Opening…</div>
          ) : !filtered.length ? (
            <div style={{ padding: 40, textAlign: "center", color: SUB, fontWeight: 700 }}>
              {scopeRows.length ? "No rows match these filters." : "Nothing to show — pick a date on the left."}
            </div>
          ) : (
            <>
              <div style={{ overflowX: "auto", borderRadius: 12, border: `1px solid ${LINE}` }}>
                <table style={{ width: "100%", minWidth: 1080 }}>
                  <thead>
                    <tr style={{ background: "rgba(139,92,246,.10)" }}>
                      {["#", "Product", "Customer", "Order No", "Slaughter", "Expiry", "Status", "Temp", "Qty", "Unit", "Remarks", ""].map((h, i) => (
                        <th
                          key={i}
                          style={{
                            textAlign: i === 0 ? "center" : "left",
                            padding: "10px 10px", fontWeight: 900, color: SUB,
                            borderBottom: `1px solid ${LINE}`, whiteSpace: "nowrap",
                          }}
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.slice(0, limit).map((r, i) => (
                      <tr key={`${r.__reportId}:${r.__index}`} style={{ background: i % 2 ? "rgba(248,250,252,.7)" : "transparent" }}>
                        <td style={{ padding: "8px 10px", textAlign: "center", color: SUB, fontWeight: 700 }}>{i + 1}</td>
                        <td style={{ padding: "8px 10px", fontWeight: 700 }}>
                          <Marked text={r.product} q={dSearch} />
                          {scope === "all" && (
                            <div style={{ fontSize: 10.5, color: SUB, fontWeight: 700 }}>{formatDMY(r.reportDate)}</div>
                          )}
                        </td>
                        <td style={{ padding: "8px 10px" }}><Marked text={r.customer} q={dSearch} /></td>
                        <td style={{ padding: "8px 10px", fontVariantNumeric: "tabular-nums" }}><Marked text={r.orderNo} q={dSearch} /></td>
                        <td style={{ padding: "8px 10px", fontVariantNumeric: "tabular-nums", color: SUB }}>{formatDMY(r.slaughterDate)}</td>
                        <td style={{ padding: "8px 10px", fontVariantNumeric: "tabular-nums" }}>{formatDMY(r.expiryDate)}</td>
                        <td style={{ padding: "8px 10px" }}>
                          <Pill
                            tone={r.__status.tone}
                            title={r.__status.days === "" ? "" : `${r.__status.days} day(s) from the report date`}
                          >
                            {r.__status.label}
                          </Pill>
                        </td>
                        <td style={{ padding: "8px 10px", fontVariantNumeric: "tabular-nums" }}>{r.temp ?? ""}</td>
                        <td style={{ padding: "8px 10px", fontVariantNumeric: "tabular-nums", fontWeight: 800 }}>{r.quantity ?? ""}</td>
                        <td style={{ padding: "8px 10px", color: SUB }}>{r.unitOfMeasure || ""}</td>
                        <td
                          style={{ padding: "8px 10px", color: SUB, maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}
                          title={r.remarks || ""}
                        >
                          <Marked text={r.remarks} q={dSearch} />
                        </td>
                        <td className="fpr-noprint" style={{ padding: "8px 10px", textAlign: "right" }}>
                          <button
                            title="Delete this row"
                            onClick={() => setConfirm({ kind: "row", id: r.__reportId, index: r.__index, product: r.product })}
                            style={{ ...btn("#fff", "#b91c1c"), padding: "4px 9px" }}
                          >
                            ✕
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {filtered.length > limit && (
                <div className="fpr-noprint" style={{ textAlign: "center", marginTop: 12 }}>
                  <button style={btn("#fff", INK)} onClick={() => setLimit((n) => n + PAGE_SIZE)}>
                    Show {Math.min(PAGE_SIZE, filtered.length - limit)} more — {filtered.length - limit} left
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {confirm && (
        <div
          style={{
            position: "fixed", inset: 0, background: "rgba(15,23,42,.42)",
            display: "grid", placeItems: "center", zIndex: 1000, padding: 16,
          }}
          onClick={() => !busy && setConfirm(null)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{ background: "#fff", borderRadius: 16, padding: "24px 26px", maxWidth: 430, boxShadow: "0 20px 50px rgba(0,0,0,.25)" }}
          >
            <div style={{ fontSize: 34, textAlign: "center" }}>🗑️</div>
            <div style={{ fontWeight: 900, fontSize: 16, textAlign: "center", margin: "8px 0" }}>
              {confirm.kind === "report" ? "Delete this whole report?" : "Delete this row?"}
            </div>
            <div style={{ color: SUB, fontSize: 13, textAlign: "center", lineHeight: 1.7, marginBottom: 18 }}>
              {confirm.kind === "report" ? (
                <>
                  The report for <b>{formatDMY(confirm.date)}</b> and every row in it will be removed
                  from the server. This cannot be undone.
                </>
              ) : (
                <>
                  <b>{confirm.product || "This row"}</b> will be removed from the report. This cannot
                  be undone.
                </>
              )}
            </div>
            <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
              <button style={btn("#fff", INK)} disabled={busy} onClick={() => setConfirm(null)}>
                Cancel
              </button>
              <button style={btn("#dc2626")} disabled={busy} onClick={doDelete}>
                {busy ? "Deleting…" : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
