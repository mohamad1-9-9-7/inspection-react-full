// src/pages/Destruction/DisposalLog/DisposalLogCompare.jsx
//
// مطابقة سجل إعدام أودو مع مرتجعات الفروع — day by day, product by product.
//
// Left  = the Odoo disposal file (type `odoo_disposal_log`, imported next door)
// Right = OUR three registers, each switchable on its own:
//           • branch returns      (`returns`)
//           • customer returns    (`returns_customers`)
//           • condemnation record (`destruction_record`)
//         keeping only the lines whose action means the product was
//         destroyed: Condemnation, Condemnation / Cooking, Disposed.
//         Odoo posts one voucher whichever door the product came back
//         through, so reading only one of the three leaves a gap that looks
//         like a discrepancy and is not one.
//
// The old comparison read our `destruction_record` register, which holds a
// handful of written-up condemnations — against a 900-line monthly file that
// made every single line look missing. The register that actually carries the
// destroyed stock is the daily returns report, so that is what this page
// reconciles, and it does it in the shape the question is asked in: one line
// per DAY per PRODUCT, with the difference spelled out on it.
//
// Nothing here writes to a report. The only write is the delete button, which
// removes an imported Odoo month.

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import API_BASE from "../../../config/api";
import {
  ACTION_META,
  CUSTOMER_RETURNS_CHANGES_TYPE,
  CUSTOMER_RETURNS_TYPE,
  DAY_STATUS,
  DAY_STATUS_META,
  DESTRUCTION_TYPE,
  DISPOSAL_ACTIONS,
  RETURNS_CHANGES_TYPE,
  RETURNS_TYPE,
  SOURCES,
  SOURCE_META,
  TYPE,
  buildChangeIndex,
  buildDailyComparison,
  buildMonthlyComparison,
  excludeSet,
  flattenCustomerReturns,
  flattenDestructionRecords,
  flattenReturnsRecords,
  fmt3,
  formatDMY,
  getRecordId,
  formatDMY as fmtDMY,
  monthKeyOf,
  monthLabel,
  monthLabelAr,
  NO_BRANCH_LABEL,
  num,
  recordPeriod,
  safeArr,
} from "./disposalLogOptions";
import {
  DLX_CSS,
  DateTree,
  EmptyState,
  Field,
  Kpi,
  Pill,
  SearchInput,
  Segmented,
  Toggle,
  downloadSheets,
  useCopy,
  useLocalPref,
} from "./disposalLogKit";
import MonthlyReconciliation from "./MonthlyReconciliation";
import ProductStory from "./ProductStory";

/* ============================================================
   server
   ============================================================ */
async function fetchLogs() {
  const res = await fetch(`${API_BASE}/api/reports?type=${encodeURIComponent(TYPE)}&limit=5000`, {
    cache: "no-store",
    headers: { Accept: "application/json" },
  });
  if (!res.ok) throw new Error(`Could not load the imported logs (${res.status})`);
  const json = await res.json().catch(() => []);
  return Array.isArray(json) ? json : json?.data ?? json?.items ?? [];
}

/* The window a month has to be read over.
   A line reported before the month can be condemned inside it, so the read
   starts `LOOKBACK_DAYS` earlier; anything whose disposal date lands outside
   the month is dropped by the flatteners. */
const LOOKBACK_DAYS = 60;

function monthWindow(period) {
  const m = String(period || "").match(/^(\d{4})-(\d{2})$/);
  if (!m) return null;
  const last = new Date(Date.UTC(Number(m[1]), Number(m[2]), 0)).getUTCDate();
  const start = new Date(`${period}-01T00:00:00Z`);
  start.setUTCDate(start.getUTCDate() - LOOKBACK_DAYS);
  return { from: start.toISOString().slice(0, 10), to: `${period}-${String(last).padStart(2, "0")}` };
}

/** One request per register per window — the server honours from/to. */
async function fetchTypeMonth(type, period) {
  const w = monthWindow(period);
  if (!w) return [];
  const { from, to } = w;
  const res = await fetch(
    `${API_BASE}/api/reports?type=${encodeURIComponent(type)}&from=${from}&to=${to}&limit=5000`,
    { cache: "no-store", headers: { Accept: "application/json" } }
  );
  if (!res.ok) throw new Error(`Could not load ${type} (${res.status})`);
  const json = await res.json().catch(() => []);
  return Array.isArray(json) ? json : json?.data ?? json?.items ?? [];
}

/* The condemnation register is a handful of records and dates itself by the
   destruction date inside the header, which the from/to filter does not see —
   so it is read whole and filtered in `flattenDestructionRecords`. */
async function fetchAllOfType(type) {
  const res = await fetch(`${API_BASE}/api/reports?type=${encodeURIComponent(type)}&limit=5000`, {
    cache: "no-store",
    headers: { Accept: "application/json" },
  });
  if (!res.ok) throw new Error(`Could not load ${type} (${res.status})`);
  const json = await res.json().catch(() => []);
  return Array.isArray(json) ? json : json?.data ?? json?.items ?? [];
}

/* Products the comparison must ignore, kept on the server so the whole team
   sees the same exclusions. One row: type + payload.reportDate = "config". */
const EXCLUDE_TYPE = "disposal_compare_config";
const EXCLUDE_KEY = "config";

/* One config row holds both the exclusion list and the review notes, so a
   single read arms the page and a single write saves either. */
async function loadCompareConfig() {
  const res = await fetch(`${API_BASE}/api/reports?type=${EXCLUDE_TYPE}&limit=50`, {
    cache: "no-store",
    headers: { Accept: "application/json" },
  });
  if (!res.ok) return [];
  const json = await res.json().catch(() => []);
  const rows = Array.isArray(json) ? json : json?.data ?? json?.items ?? [];
  const rec = rows.find((r) => String(r?.payload?.reportDate || "") === EXCLUDE_KEY) || rows[0];
  return {
    excluded: Array.isArray(rec?.payload?.excluded) ? rec.payload.excluded : [],
    reviewed: rec?.payload?.reviewed && typeof rec.payload.reviewed === "object" ? rec.payload.reviewed : {},
  };
}

async function saveCompareConfig({ excluded, reviewed }) {
  const res = await fetch(`${API_BASE}/api/reports`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      reporter: "disposal-compare",
      type: EXCLUDE_TYPE,
      payload: { reportDate: EXCLUDE_KEY, excluded, reviewed, savedAt: Date.now() },
    }),
  });
  if (!res.ok) throw new Error(`Could not save (${res.status})`);
}

function currentUserName() {
  try {
    const u = JSON.parse(localStorage.getItem("currentUser") || "{}");
    return u.displayName || u.username || "";
  } catch {
    return "";
  }
}

async function deleteLog(id) {
  const res = await fetch(`${API_BASE}/api/reports/${encodeURIComponent(id)}`, { method: "DELETE" });
  if (!res.ok) throw new Error(`Delete failed (${res.status})`);
}


/* ============================================================
   The month at a glance
   ============================================================
   29 pairs of bars, one per day: what Odoo destroyed against what our
   registers hold. It is here because the table can only ever show one day,
   and the shape of a month — the spike nobody filed, the week that matches
   perfectly — is the first thing anyone asks about. Clicking a day opens it.
   ============================================================ */
function DailyChart({ days, selected, onPick }) {
  const rows = safeArr(days);
  if (!rows.length) return null;

  const W = Math.max(560, rows.length * 34);
  const H = 132;
  const PAD_B = 20;
  const max = Math.max(
    1,
    ...rows.map((d) => Math.max(...d.byFam.map((f) => Math.max(f.odoo, f.mine)), 0))
  );
  const bw = (W - 12) / rows.length;

  return (
    <div className="dlx-chartWrap">
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" height={H} role="img"
        aria-label="Odoo against our registers, day by day">
        <line x1="0" y1={H - PAD_B} x2={W} y2={H - PAD_B} stroke="#e2e8f0" strokeWidth="1" />
        {rows.map((d, i) => {
          const odoo = d.byFam.reduce((s, f) => s + f.odoo, 0);
          const mine = d.byFam.reduce((s, f) => s + f.mine, 0);
          const hO = Math.max(1, ((H - PAD_B - 8) * odoo) / max);
          const hM = Math.max(1, ((H - PAD_B - 8) * mine) / max);
          const x = 6 + i * bw;
          const on = selected === d.date;
          return (
            <g key={d.date} onClick={() => onPick?.(d.date)} style={{ cursor: "pointer" }}>
              <title>{`${d.date} — Odoo ${fmt3(odoo)} · ours ${fmt3(mine)} · ${d.issues} issue(s)`}</title>
              {on && <rect x={x - 2} y="0" width={bw} height={H - PAD_B} fill="#ecfeff" />}
              <rect x={x + 1} y={H - PAD_B - hO} width={bw / 2 - 3} height={hO}
                fill={d.issues ? "#f59e0b" : "#94a3b8"} rx="2" />
              <rect x={x + bw / 2} y={H - PAD_B - hM} width={bw / 2 - 3} height={hM}
                fill="#0d9488" rx="2" />
              <text x={x + bw / 2 - 1} y={H - 6} textAnchor="middle" fontSize="9" fill="#64748b" fontWeight="700">
                {d.date.slice(8)}
              </text>
            </g>
          );
        })}
      </svg>
      <div className="dlx-legend">
        <Pill tone="slate">▮ Odoo</Pill>
        <Pill tone="teal">▮ Our registers</Pill>
        <Pill tone="amber">▮ Odoo, day has issues</Pill>
      </div>
    </div>
  );
}

const STATUS_TONE = {
  [DAY_STATUS.MATCH]: "green",
  [DAY_STATUS.QTY_DIFF]: "amber",
  [DAY_STATUS.ODOO_ONLY]: "red",
  [DAY_STATUS.RETURNS_ONLY]: "blue",
};

const signed = (n) => `${n > 0 ? "+" : ""}${fmt3(n)}`;

/* ============================================================
   component
   ============================================================ */
export default function DisposalLogCompare() {
  const navigate = useNavigate();
  const location = useLocation();

  /* Rows handed over by the import page ("compare before saving"). */
  const handoff = location.state?.rows && Array.isArray(location.state.rows) ? location.state.rows : null;
  const [useHandoff, setUseHandoff] = useState(!!handoff);

  const [logs, setLogs] = useState([]);
  const [selectedId, setSelectedId] = useState("");
  const [returns, setReturns] = useState([]);
  const [customerReturns, setCustomerReturns] = useState([]);
  const [condemnations, setCondemnations] = useState([]);
  const [changeLogs, setChangeLogs] = useState({ branch: [], customer: [] });
  const [excluded, setExcluded] = useState([]);
  const [reviewed, setReviewed] = useState({});
  const [showExcluded, setShowExcluded] = useState(false);
  const [unreviewedOnly, setUnreviewedOnly] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingReturns, setLoadingReturns] = useState(false);
  const [error, setError] = useState("");
  const [msg, setMsg] = useState("");
  const [confirm, setConfirm] = useState(null);

  /* controls */
  const [actions, setActions] = useLocalPref("disposalLog.cmp.actions", DISPOSAL_ACTIONS);
  const [sources, setSources] = useLocalPref("disposalLog.cmp.sources", SOURCES);
  const [sourceFilter, setSourceFilter] = useState("all");
  const [dayWindow, setDayWindow] = useLocalPref("disposalLog.cmp.dayWindow", 1);
  const [splitByBranch, setSplitByBranch] = useLocalPref("disposalLog.cmp.splitByBranch", false);
  const [tolerance, setTolerance] = useLocalPref("disposalLog.cmp.tolerance", 0.005);
  const [unitMode, setUnitMode] = useLocalPref("disposalLog.cmp.unitMode", "merge");
  const [useChangeDates, setUseChangeDates] = useLocalPref("disposalLog.cmp.useChangeDates", true);
  const [treeHidden, setTreeHidden] = useLocalPref("disposalLog.cmp.treeHidden", false);
  const [tolPct, setTolPct] = useLocalPref("disposalLog.cmp.tolPct", 0);
  /* The whole month first: does it add up per product / per branch? The
     day-by-day table is where a difference found there gets explained. */
  const [view, setView] = useLocalPref("disposalLog.cmp.view2", "month"); // month | days | products | branches | findings
  const [scope, setScope] = useState("day"); // day | week | all
  const [dayDiffOnly, setDayDiffOnly] = useLocalPref("disposalLog.cmp.dayDiffOnly", false);
  const [minGap, setMinGap] = useLocalPref("disposalLog.cmp.minGap", 0);
  const [daySort, setDaySort] = useLocalPref("disposalLog.cmp.daySort", "status");
  const [statusFilter, setStatusFilter] = useState("all");
  const [branchFilter, setBranchFilter] = useState("all");
  const [query, setQuery] = useState("");
  const [selectedDate, setSelectedDate] = useState("");
  const [expanded, setExpanded] = useState({});
  const [copied, copy] = useCopy();

  /* ── load the imported logs ── */
  const loadLogs = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const list = await fetchLogs();
      const sorted = safeArr(list).sort((a, b) =>
        String(recordPeriod(b)).localeCompare(String(recordPeriod(a)))
      );
      setLogs(sorted);
      setSelectedId((prev) => prev || getRecordId(sorted[0]) || "");
    } catch (e) {
      setError(e?.message || "Could not load the imported logs.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadLogs();
  }, [loadLogs]);

  useEffect(() => {
    loadCompareConfig()
      .then((cfg) => {
        setExcluded(cfg.excluded);
        setReviewed(cfg.reviewed);
      })
      .catch(() => {
        setExcluded([]);
        setReviewed({});
      });
  }, []);

  const selectedLog = useMemo(
    () => logs.find((r) => String(getRecordId(r)) === String(selectedId)) || null,
    [logs, selectedId]
  );

  const odooRows = useMemo(() => {
    if (useHandoff && handoff) return handoff;
    return safeArr(selectedLog?.payload?.rows);
  }, [useHandoff, handoff, selectedLog]);

  /* The month under comparison — from the handoff, the saved record, or the
     rows themselves, in that order. */
  const period = useMemo(() => {
    if (useHandoff && handoff) {
      return location.state?.period || monthKeyOf(handoff.find((r) => r.date)?.date || "");
    }
    return recordPeriod(selectedLog) || monthKeyOf(odooRows.find((r) => r.date)?.date || "");
  }, [useHandoff, handoff, location.state, selectedLog, odooRows]);

  /* ── load that month from all three of our registers ── */
  useEffect(() => {
    let alive = true;
    if (!period) {
      setReturns([]);
      setCustomerReturns([]);
      setCondemnations([]);
      return undefined;
    }
    setLoadingReturns(true);
    Promise.all([
      fetchTypeMonth(RETURNS_TYPE, period),
      fetchTypeMonth(CUSTOMER_RETURNS_TYPE, period),
      fetchAllOfType(DESTRUCTION_TYPE),
      fetchTypeMonth(RETURNS_CHANGES_TYPE, period),
      fetchTypeMonth(CUSTOMER_RETURNS_CHANGES_TYPE, period),
    ])
      .then(([a, b, c, d, e]) => {
        if (!alive) return;
        setReturns(safeArr(a));
        setCustomerReturns(safeArr(b));
        setCondemnations(safeArr(c));
        setChangeLogs({ branch: safeArr(d), customer: safeArr(e) });
      })
      .catch((e) => {
        if (alive) setError(e?.message || "Could not load our own registers.");
      })
      .finally(() => {
        if (alive) setLoadingReturns(false);
      });
    return () => {
      alive = false;
    };
  }, [period]);

  /* Each register flattened on its own, so a source can be switched off
     without re-reading anything. */
  const changeIndex = useMemo(
    () => ({
      branch: buildChangeIndex(changeLogs.branch),
      customer: buildChangeIndex(changeLogs.customer),
    }),
    [changeLogs]
  );

  const bySource = useMemo(
    () => ({
      branch: flattenReturnsRecords(returns, {
        period, actions, changeIndex: changeIndex.branch, useChangeDates,
      }),
      customer: flattenCustomerReturns(customerReturns, {
        period, actions, changeIndex: changeIndex.customer, useChangeDates,
      }),
      condemnation: flattenDestructionRecords(condemnations, { period }),
    }),
    [returns, customerReturns, condemnations, period, actions, changeIndex, useChangeDates]
  );

  const mineRows = useMemo(
    () => SOURCES.filter((k) => sources.includes(k)).flatMap((k) => bySource[k] || []),
    [bySource, sources]
  );

  const excludeKeys = useMemo(() => excludeSet(excluded), [excluded]);

  const cmp = useMemo(
    () => buildDailyComparison(odooRows, mineRows, {
      dayWindow, splitByBranch, tolerance, unitMode, exclude: excludeKeys,
    }),
    [odooRows, mineRows, dayWindow, splitByBranch, tolerance, unitMode, excludeKeys]
  );

  /* Arrow keys walk the tree and "/" jumps to the search box — a month is
     29 days and reaching for the mouse for each one is the slow way. */
  useEffect(() => {
    const onKey = (e) => {
      const typing = ["INPUT", "TEXTAREA", "SELECT"].includes(document.activeElement?.tagName);
      if (e.key === "/" && !typing) {
        e.preventDefault();
        document.querySelector(".dlx-search input")?.focus();
        return;
      }
      if (typing || view !== "days" || scope === "all") return;
      /* "n" jumps to the next day that still has a difference. */
      if (e.key === "n" || e.key === "N") {
        const next = cmp.days.find((d) => d.issues > 0 && d.date > selectedDate) || cmp.days.find((d) => d.issues > 0);
        if (next) {
          e.preventDefault();
          setSelectedDate(next.date);
        }
        return;
      }
      if (e.key !== "ArrowDown" && e.key !== "ArrowUp") return;
      const list = cmp.days.map((d) => d.date);
      const i = list.indexOf(selectedDate);
      if (i < 0) return;
      const next = list[e.key === "ArrowDown" ? Math.min(list.length - 1, i + 1) : Math.max(0, i - 1)];
      if (next) {
        e.preventDefault();
        setSelectedDate(next);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [cmp.days, selectedDate, view, scope]);

  /* ── the exclusion list ── */
  const [excludeBusy, setExcludeBusy] = useState(false);
  const persistConfig = useCallback(async (nextExcluded, nextReviewed) => {
    setExcluded(nextExcluded);
    setReviewed(nextReviewed);
    setExcludeBusy(true);
    try {
      await saveCompareConfig({ excluded: nextExcluded, reviewed: nextReviewed });
    } catch (e) {
      setError(e?.message || "Could not save.");
    } finally {
      setExcludeBusy(false);
    }
  }, []);
  const persistExcluded = useCallback(
    (next) => persistConfig(next, reviewed),
    [persistConfig, reviewed]
  );

  /* A discrepancy somebody has already looked into stops shouting. The note
     is kept beside the row so the next reader sees the explanation instead of
     re-investigating the same 0.4 kg. */
  const reviewKeyOf = (r) => `${r.date}|${r.codeKey}|${r.fam}`;
  const toggleReviewed = (r) => toggleReviewedKey(reviewKeyOf(r), `${r.code || r.product} on ${formatDMY(r.date)}`);
  const toggleReviewedKey = (k, label) => {
    if (reviewed[k]) {
      const next = { ...reviewed };
      delete next[k];
      persistConfig(excluded, next);
      return;
    }
    const note = window.prompt(
      `Mark ${label} as reviewed.\n\nWhy is this difference acceptable? (optional)`,
      ""
    );
    if (note === null) return;
    persistConfig(excluded, {
      ...reviewed,
      [k]: { note: String(note || "").trim(), by: currentUserName(), at: new Date().toISOString() },
    });
  };

  const excludeProduct = (row) => {
    const code = String(row?.code || "").trim();
    const product = String(row?.product || "").trim();
    if (!code && !product) return;
    if (excluded.some((e) => String(e.code) === code && String(e.product || "") === product)) return;
    persistExcluded([
      ...excluded,
      { code, product, at: new Date().toISOString(), by: currentUserName() },
    ]);
  };

  const unexcludeProduct = (entry) =>
    persistExcluded(excluded.filter((e) => !(String(e.code) === String(entry.code) && String(e.product || "") === String(entry.product || ""))));

  const dayIndex = useMemo(() => new Map(cmp.days.map((d) => [d.date, d])), [cmp.days]);

  useEffect(() => {
    if (!cmp.days.length) {
      setSelectedDate("");
      return;
    }
    setSelectedDate((prev) => (prev && dayIndex.has(prev) ? prev : cmp.days[0].date));
  }, [cmp.days, dayIndex]);

  const branchOptions = useMemo(
    () => Array.from(new Set(cmp.rows.flatMap((r) => r.branches))).filter(Boolean).sort(),
    [cmp.rows]
  );

  /* Same rows, read over the whole month. Day lags cannot create a gap here. */
  const month = useMemo(
    () => buildMonthlyComparison(odooRows, mineRows, { tolerance, tolPct, unitMode, exclude: excludeKeys }),
    [odooRows, mineRows, tolerance, tolPct, unitMode, excludeKeys]
  );

  /* A month line opens straight into its days. */
  const openDays = ({ query: q = "", branch = "" } = {}) => {
    setView("days");
    setScope("all");
    setStatusFilter("all");
    setUnreviewedOnly(false);
    setQuery(q);
    if (branch === NO_BRANCH_LABEL) {
      setBranchFilter("all");
      setSourceFilter("customer");
    } else {
      setBranchFilter(branch && branchOptions.includes(branch) ? branch : "all");
      setSourceFilter("all");
    }
  };

  /* The week (Mon–Sun) around the picked day, for the "This week" scope. */
  const weekRange = useMemo(() => {
    if (!selectedDate) return null;
    const d = new Date(`${selectedDate}T00:00:00Z`);
    if (Number.isNaN(d.getTime())) return null;
    d.setUTCDate(d.getUTCDate() - ((d.getUTCDay() + 6) % 7));
    const from = d.toISOString().slice(0, 10);
    d.setUTCDate(d.getUTCDate() + 6);
    return { from, to: d.toISOString().slice(0, 10) };
  }, [selectedDate]);

  /* Everything the scope (day / week / month) and the side filters let
     through — before the status filter, so the status chips can count it. */
  const scopedRows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return cmp.rows.filter((r) => {
      if (scope === "day" && selectedDate && r.date !== selectedDate) return false;
      if (scope === "week" && weekRange && (r.date < weekRange.from || r.date > weekRange.to)) return false;
      if (branchFilter !== "all" && !r.branches.includes(branchFilter)) return false;
      if (sourceFilter !== "all" && !r.sources.includes(sourceFilter)) return false;
      if (!q) return true;
      return `${r.code} ${r.product} ${r.branches.join(" ")} ${r.customers.join(" ")} ${r.category}`
        .toLowerCase()
        .includes(q);
    });
  }, [cmp.rows, scope, selectedDate, weekRange, branchFilter, sourceFilter, query]);

  const scopedCounts = useMemo(() => {
    const c = { all: scopedRows.length, unit: 0, shifted: 0 };
    for (const s of Object.values(DAY_STATUS)) c[s] = 0;
    for (const r of scopedRows) {
      c[r.status] += 1;
      if (r.unitMismatch) c.unit += 1;
      if (r.shiftDays) c.shifted += 1;
    }
    return c;
  }, [scopedRows]);

  const visibleRows = useMemo(() => {
    const order = {
      [DAY_STATUS.ODOO_ONLY]: 0,
      [DAY_STATUS.QTY_DIFF]: 1,
      [DAY_STATUS.RETURNS_ONLY]: 2,
      [DAY_STATUS.MATCH]: 3,
    };
    const byStatus = (a, b) => order[a.status] - order[b.status] || b.absDiff - a.absDiff;
    const sorters = {
      status: (a, b) => a.date.localeCompare(b.date) || byStatus(a, b),
      gap: (a, b) => b.absDiff - a.absDiff || a.date.localeCompare(b.date),
      code: (a, b) => String(a.code).localeCompare(String(b.code), undefined, { numeric: true }) || a.date.localeCompare(b.date),
      product: (a, b) => String(a.product).localeCompare(String(b.product)) || a.date.localeCompare(b.date),
      branch: (a, b) => String(a.branches[0] || "~").localeCompare(String(b.branches[0] || "~")) || a.date.localeCompare(b.date) || byStatus(a, b),
    };
    return scopedRows
      .filter((r) => {
        if (statusFilter === "unit") {
          if (!r.unitMismatch) return false;
        } else if (statusFilter === "shifted") {
          if (!r.shiftDays) return false;
        } else if (statusFilter !== "all" && r.status !== statusFilter) return false;
        if (dayDiffOnly && r.status === DAY_STATUS.MATCH) return false;
        if (minGap > 0 && r.status !== DAY_STATUS.MATCH && r.absDiff < minGap) return false;
        if (unreviewedOnly && (r.status === DAY_STATUS.MATCH || reviewed[`${r.date}|${r.codeKey}|${r.fam}`])) return false;
        return true;
      })
      .sort(sorters[daySort] || sorters.status);
  }, [scopedRows, statusFilter, dayDiffOnly, minGap, unreviewedOnly, reviewed, daySort]);

  /* For a line found on one side only: the nearest line of the same product
     found on the OTHER side only, outside the day window. Usually the same
     event dated further apart than the window allows — one click opens it. */
  const counterpartOf = useMemo(() => {
    const groupOf = (r) => String(r.key).split("||").slice(0, 3).join("||");
    const idx = new Map();
    for (const r of cmp.rows) {
      if (r.status !== DAY_STATUS.ODOO_ONLY && r.status !== DAY_STATUS.RETURNS_ONLY) continue;
      const k = `${groupOf(r)}##${r.status}`;
      if (!idx.has(k)) idx.set(k, []);
      idx.get(k).push(r);
    }
    const dayGap = (a, b) => Math.round((Date.parse(`${b}T00:00:00Z`) - Date.parse(`${a}T00:00:00Z`)) / 86400000);
    return (r) => {
      if (r.status !== DAY_STATUS.ODOO_ONLY && r.status !== DAY_STATUS.RETURNS_ONLY) return null;
      const other = r.status === DAY_STATUS.ODOO_ONLY ? DAY_STATUS.RETURNS_ONLY : DAY_STATUS.ODOO_ONLY;
      const list = idx.get(`${groupOf(r)}##${other}`);
      if (!list?.length) return null;
      let best = null;
      for (const c of list) {
        const g = dayGap(r.date, c.date);
        if (!best || Math.abs(g) < Math.abs(best.gap)) best = { row: c, gap: g };
      }
      return best;
    };
  }, [cmp.rows]);

  /* Days that still hold an open difference, for "next issue day". */
  const issueDays = useMemo(() => cmp.days.filter((d) => d.issues > 0).map((d) => d.date), [cmp.days]);
  const stepDay = (dir) => {
    const list = cmp.days.map((d) => d.date);
    const i = list.indexOf(selectedDate);
    const next = list[Math.max(0, Math.min(list.length - 1, (i < 0 ? 0 : i) + dir))];
    if (next) setSelectedDate(next);
  };
  const nextIssueDay = () => {
    if (!issueDays.length) return;
    const next = issueDays.find((d) => d > selectedDate) || issueDays[0];
    setSelectedDate(next);
    if (scope === "all") setScope("day");
  };

  /* One reason for every open difference on screen — the usual end of a
     review: "all of these are the Warqa kitchen transfer, known". */
  const reviewAllVisible = () => {
    const open = visibleRows.filter((r) => r.status !== DAY_STATUS.MATCH && !reviewed[reviewKeyOf(r)]);
    if (!open.length) return;
    const note = window.prompt(
      `Mark ${open.length} open difference(s) on screen as reviewed.\n\nOne reason for all of them (optional):`,
      ""
    );
    if (note === null) return;
    const stamp = { note: String(note || "").trim(), by: currentUserName(), at: new Date().toISOString() };
    const next = { ...reviewed };
    for (const r of open) next[reviewKeyOf(r)] = stamp;
    persistConfig(excluded, next);
  };

  const allExpanded = visibleRows.length > 0 && visibleRows.every((r) => expanded[r.key]);
  const toggleAllRows = () =>
    setExpanded(allExpanded ? {} : Object.fromEntries(visibleRows.map((r) => [r.key, true])));

  /* Totals for what is on screen, split by unit family. */
  const visibleFamTotals = useMemo(() => {
    const m = new Map();
    for (const r of visibleRows) {
      const g = m.get(r.fam) || { fam: r.fam, lines: 0, odoo: 0, mine: 0 };
      g.lines += 1;
      g.odoo += r.odooQty;
      g.mine += r.mineQty;
      m.set(r.fam, g);
    }
    return Array.from(m.values())
      .map((g) => ({ ...g, diff: g.mine - g.odoo }))
      .sort((a, b) => String(a.fam).localeCompare(String(b.fam)));
  }, [visibleRows]);

  /* "No difference" = the DIFFERENCE column is zero (within the quantity
     tolerance), however many days disagreed on the way there — how the days
     pair up is the user's call through the day window. */
  const [hideClean, setHideClean] = useLocalPref("disposalLog.cmp.hideClean", false);
  const isZero = useCallback((d) => Math.abs(num(d)) <= Math.max(cmp.tolerance, 0.0005), [cmp.tolerance]);
  const cleanProducts = useMemo(() => cmp.products.filter((p) => isZero(p.diff)).length, [cmp.products, isZero]);
  const cleanBranches = useMemo(() => cmp.branches.filter((b) => isZero(b.diff)).length, [cmp.branches, isZero]);

  const visibleProducts = useMemo(() => {
    const q = query.trim().toLowerCase();
    return cmp.products.filter((p) => {
      if (hideClean && isZero(p.diff)) return false;
      return !q || `${p.code} ${p.product}`.toLowerCase().includes(q);
    });
  }, [cmp.products, query, hideClean, isZero]);

  /* The day rows behind each product line, for its story. */
  const [storyOpen, setStoryOpen] = useState({});
  const rowsByProduct = useMemo(() => {
    const m = new Map();
    for (const r of cmp.rows) {
      const k = `${r.codeKey}||${r.fam}`;
      if (!m.has(k)) m.set(k, []);
      m.get(k).push(r);
    }
    return m;
  }, [cmp.rows]);

  const visibleBranches = useMemo(
    () => (hideClean ? cmp.branches.filter((b) => !isZero(b.diff)) : cmp.branches),
    [cmp.branches, hideClean, isZero]
  );

  const toggleRow = (key) => setExpanded((m) => ({ ...m, [key]: !m[key] }));
  const toggleAction = (a) =>
    setActions((list) => (list.includes(a) ? list.filter((x) => x !== a) : [...list, a]));
  const toggleSource = (k) =>
    setSources((list) => (list.includes(k) ? list.filter((x) => x !== k) : [...list, k]));


  /* ============================================================
     Findings — the conclusions, written out
     ============================================================
     A 650-line table answers "where is the difference"; nobody has time to
     read it into a sentence every month. These are the sentences, ranked by
     how much of the month each one explains, so the meeting starts from the
     three that matter instead of scrolling. Every finding is derived from
     the same rows on screen — change a switch and they change with it.
     ============================================================ */
  const findings = useMemo(() => {
    const out = [];
    const t = cmp.totals;
    if (!cmp.rows.length) return out;

    /* A branch that posts in Odoo and files nothing with us. */
    for (const b of cmp.branches) {
      if (b.rows < 5) continue;
      const missing = b.odooOnly / b.rows;
      if (missing >= 0.5) {
        out.push({
          weight: b.odooOnly * 10,
          tone: "red",
          title: `${b.branch} destroys in Odoo without a return`,
          detail: `${b.odooOnly} of ${b.rows} product lines for ${b.branch} exist only in the Odoo file. Either the site files its destructions somewhere else, or its returns are not reaching us.`,
        });
      }
      if (b.returnsOnly / b.rows >= 0.5 && b.rows >= 5) {
        out.push({
          weight: b.returnsOnly * 8,
          tone: "blue",
          title: `${b.branch} returns are not posted in Odoo`,
          detail: `${b.returnsOnly} of ${b.rows} product lines for ${b.branch} are in our registers only. The stock is still standing in Odoo.`,
        });
      }
    }

    /* Products that never appear on our side at all. */
    const ghosts = cmp.products
      .filter((p) => p.mineQty === 0 && p.odooQty > 0)
      .sort((a, b) => b.odooQty - a.odooQty)
      .slice(0, 5);
    if (ghosts.length) {
      out.push({
        weight: 60,
        tone: "amber",
        title: `${ghosts.length} product(s) destroyed in Odoo and never returned`,
        detail: ghosts.map((p) => `${p.code} ${p.product} (${fmt3(p.odooQty)} ${p.fam})`).join(" · ") +
          ". Consumables and portion packs usually belong on the exclusion list; anything else is a missing return.",
      });
    }

    /* Days where the two sides never meet. */
    const blindDays = cmp.days.filter((d) => d.rows >= 3 && d.match === 0);
    if (blindDays.length) {
      out.push({
        weight: blindDays.length * 6,
        tone: "red",
        title: `${blindDays.length} day(s) with nothing matching at all`,
        detail: `${blindDays.slice(0, 6).map((d) => formatDMY(d.date)).join(", ")}${blindDays.length > 6 ? "…" : ""}. A whole day that agrees on nothing is usually a date problem, not a stock problem — try widening the day window.`,
      });
    }

    /* The day window is doing real work — or would. */
    if (t.shifted) {
      out.push({
        weight: t.shifted * 2,
        tone: "violet",
        title: `${t.shifted} line(s) only match a day or two apart`,
        detail: `They are paired inside the ±${cmp.dayWindow} day window. That is the normal lag between a branch writing the return and the store clearing the voucher.`,
      });
    }
    if (t.datedByChange) {
      out.push({
        weight: t.datedByChange,
        tone: "blue",
        title: `${t.datedByChange} line(s) are dated by the day their action changed`,
        detail: "Their report is older; the destruction was decided later, which is the day Odoo posts.",
      });
    }

    /* Unit disagreements. */
    const unitClash = cmp.rows.filter((r) => r.unitMismatch).length;
    if (unitClash >= 3) {
      out.push({
        weight: unitClash,
        tone: "amber",
        title: `${unitClash} line(s) where the two systems use different units`,
        detail: "Odoo posts PLATE where the branch types KG or PCS for the same item. The quantities still line up, but the item master should agree on one unit.",
      });
    }

    /* The healthy answer, when it is the true one. */
    if (t.matchRate >= 90) {
      out.push({
        weight: 5,
        tone: "green",
        title: `${t.matchRate}% of the month reconciles`,
        detail: `${t.match} of ${t.rows} product lines agree on both sides.`,
      });
    }

    return out.sort((a, b) => b.weight - a.weight);
  }, [cmp]);

  /* ── export (mirrors what is on screen) ── */
  const exportExcel = async () => {
    const head = [
      "DATE", "OUR DATE", "SHIFT (days)", "DATED BY CHANGE", "BRANCH", "CUSTOMER", "REGISTER",
      "CODE", "PRODUCT", "CATEGORY", "UNIT", "ODOO QTY", "OUR QTY", "DIFFERENCE", "STATUS",
    ];
    const body = visibleRows.map((r) => [
      r.date, r.mineDate || "", r.shiftDays || 0, r.datedByChange || 0, r.branches.join(", "), r.customers.join(", "),
      r.sources.map((k) => SOURCE_META[k].label).join(" + "), r.code, r.product, r.category,
      r.units.join("/"), num(r.odooQty), num(r.mineQty), num(r.diff), DAY_STATUS_META[r.status].label,
    ]);
    const summary = [
      ["Odoo disposal log ⇄ branch returns"],
      ["Month", monthLabel(period)],
      ["Odoo file lines", cmp.totals.odooLines],
      ["Our disposal lines", cmp.totals.mineLines],
      ...SOURCES.map((k) => [`  · ${SOURCE_META[k].label}`, sources.includes(k) ? (bySource[k] || []).length : "off"]),
      ["Compared rows (day × product)", cmp.totals.rows],
      ["Matched", cmp.totals.match],
      ["Quantity differs", cmp.totals.qtyDiff],
      ["Only in Odoo", cmp.totals.odooOnly],
      ["Only in our registers", cmp.totals.returnsOnly],
      ["Paired across days", cmp.totals.shifted],
      ["Match rate %", cmp.totals.matchRate],
      ["Lines dated by an action change", cmp.totals.datedByChange],
      ["Source lines skipped (excluded products)", cmp.totals.excludedLines],
      ["Excluded products", excluded.map((e) => `${e.code} ${e.product}`).join(" | ")],
      [],
      ["UNIT FAMILY", "ODOO", "RETURNS", "DIFFERENCE"],
      ...cmp.totals.byFam.map((f) => [f.fam, f.odoo, f.mine, f.diff]),
    ];
    const products = [
      ["CODE", "PRODUCT", "UNIT FAMILY", "DAYS", "ODOO QTY", "RETURNS QTY", "DIFFERENCE", "MATCHED DAYS", "DAYS WITH ISSUES"],
      ...cmp.products.map((p) => [p.code, p.product, p.fam, p.days, p.odooQty, p.mineQty, p.diff, p.match, p.issues]),
    ];
    const branches = [
      ["BRANCH", "ROWS", "ODOO QTY", "RETURNS QTY", "DIFFERENCE", "MATCHED", "QTY DIFF", "ONLY ODOO", "ONLY RETURNS", "MATCH %"],
      ...cmp.branches.map((b) => [b.branch, b.rows, b.odooQty, b.mineQty, b.diff, b.match, b.qtyDiff, b.odooOnly, b.returnsOnly, b.matchRate]),
    ];
    const monthProducts = [
      ["CODE", "PRODUCT", "UNIT", "BRANCHES", "ODOO QTY", "OUR QTY", "DIFFERENCE", "DIFFERENCE %", "STATUS"],
      ...month.products.map((p) => [
        p.code, p.product, p.units.join("/"), p.branches.join(", "), num(p.odooQty), num(p.mineQty), num(p.diff),
        p.diffPct == null ? "" : Math.round(p.diffPct * 10) / 10,
        `${DAY_STATUS_META[p.status].label}${p.hiddenSplit ? " (branches differ)" : ""}`,
      ]),
    ];
    const monthBranches = [
      ["BRANCH", "PRODUCTS", "MATCHED", "QTY DIFF", "ONLY ODOO", "ONLY OURS", "MATCH %", "UNIT FAMILY", "ODOO", "OURS", "DIFFERENCE"],
      ...month.branches.flatMap((b) => b.byFam.map((f, i) => [
        i ? "" : b.branchLabel, i ? "" : b.products, i ? "" : b.match, i ? "" : b.qtyDiff, i ? "" : b.odooOnly,
        i ? "" : b.returnsOnly, i ? "" : b.matchRate, f.fam, num(f.odoo), num(f.mine), num(f.diff),
      ])),
    ];
    summary.splice(2, 0,
      ["Month match by product %", month.totals.product.matchRate],
      ["Month match by branch %", month.totals.branch.matchRate],
    );
    await downloadSheets(
      [
        { name: "Summary", aoa: summary },
        { name: "Month by product", aoa: monthProducts },
        { name: "Month by branch", aoa: monthBranches },
        { name: "Day x Product", aoa: [head, ...body] },
        { name: "Products", aoa: products },
        { name: "Branches", aoa: branches },
      ],
      `disposal-vs-returns-${period || "month"}.xlsx`
    );
  };

  const copyDay = () => {
    const lines = visibleRows.map(
      (r) => `${r.date}\t${r.code}\t${r.product}\todoo ${fmt3(r.odooQty)}\treturns ${fmt3(r.mineQty)}\tdiff ${signed(r.diff)}`
    );
    copy([`Disposal vs returns — ${scope === "day" ? selectedDate : monthLabel(period)}`, ...lines].join("\n"), "rows");
  };

  const removeLog = () => {
    if (!selectedLog) return;
    const p = recordPeriod(selectedLog);
    setConfirm({
      title: `Delete the imported Odoo log for ${monthLabel(p)}?`,
      body: "It is removed from the server for everyone. The returns reports are untouched, and the Excel file can be imported again.",
      onYes: async () => {
        try {
          await deleteLog(getRecordId(selectedLog));
          setSelectedId("");
          setMsg(`Deleted the imported log for ${monthLabel(p)}.`);
          await loadLogs();
        } catch (e) {
          setError(e?.message || "Delete failed.");
        }
      },
    });
  };

  const t = cmp.totals;
  const barParts = [
    { n: t.match, color: "#10b981", label: "matched" },
    { n: t.qtyDiff, color: "#f59e0b", label: "quantity differs" },
    { n: t.odooOnly, color: "#ef4444", label: "only in Odoo" },
    { n: t.returnsOnly, color: "#3b82f6", label: "only in returns" },
  ];
  const barTotal = Math.max(1, barParts.reduce((s, p) => s + p.n, 0));

  /* ============================================================
     render
     ============================================================ */
  return (
    <div className="dlx">
      <style>{DLX_CSS}</style>

      <div className="dlx-shell">
        <header className="dlx-hero">
          <div>
            <div className="dlx-kicker">AL MAWASHI QMS · DISPOSAL RECONCILIATION</div>
            <h1>⚖️ Odoo disposal ⇄ branch returns</h1>
            <p dir="rtl">
              مقارنة يومية لكل منتج بين ملف الإعدام من أودو وبين ما سجّلته الفروع كإعدام أو إعدام/طبخ أو تخلّص
            </p>
          </div>
          <div className="dlx-heroBtns">
            <button className="dlx-btn dlx-ghost" onClick={() => navigate("/disposal-log/import")}>📥 Import a file</button>
            <button className="dlx-btn dlx-ghost" onClick={() => navigate("/returns/menu")}>⬅ Back</button>
          </div>
        </header>

        {/* ── source + controls ── */}
        <section className="dlx-card">
          <div className="dlx-cardHead">
            <span className="dlx-step">A</span>
            <div>
              <h2>What is being compared</h2>
              <p dir="rtl">اختر شهر أودو المستورد — وتُقرأ مرتجعات نفس الشهر تلقائياً</p>
            </div>
            <div className="dlx-headRight">
              {handoff && (
                <Toggle
                  checked={useHandoff}
                  onChange={setUseHandoff}
                  label={`Unsaved import (${handoff.length} lines)`}
                  title="Compare the file you just parsed, before saving it"
                />
              )}
              <button className="dlx-btn dlx-soft" onClick={exportExcel} disabled={!cmp.rows.length}>⬇ Export Excel</button>
              <button className="dlx-btn dlx-soft" onClick={() => window.print()} disabled={!cmp.rows.length} title="Print what is on screen">🖨 Print</button>
              <button className="dlx-btn dlx-soft" onClick={copyDay} disabled={!visibleRows.length}>
                {copied === "rows" ? "✓ Copied" : "⧉ Copy"}
              </button>
              {selectedLog && !useHandoff && (
                <button className="dlx-btn dlx-danger" onClick={removeLog}>🗑 Delete this import</button>
              )}
            </div>
          </div>

          <div className="dlx-grid">
            <Field label="Imported Odoo month — الشهر المستورد">
              <select
                value={selectedId}
                onChange={(e) => {
                  setSelectedId(e.target.value);
                  setUseHandoff(false);
                }}
                disabled={useHandoff}
              >
                {logs.length === 0 && <option value="">— nothing imported yet —</option>}
                {logs.map((r) => (
                  <option key={getRecordId(r)} value={getRecordId(r)}>
                    {monthLabel(recordPeriod(r))} · {safeArr(r?.payload?.rows).length} lines
                    {r?.payload?.meta?.fileName ? ` · ${r.payload.meta.fileName}` : ""}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Pair across days — تسامح بالتاريخ">
              <select value={dayWindow} onChange={(e) => setDayWindow(Number(e.target.value))}>
                <option value={0}>Same day only</option>
                <option value={1}>± 1 day</option>
                <option value={2}>± 2 days</option>
                <option value={3}>± 3 days</option>
              </select>
            </Field>

            <Field label="Quantity tolerance — تسامح بالكمية">
              <select value={tolerance} onChange={(e) => setTolerance(Number(e.target.value))}>
                <option value={0.005}>Exact (0.005)</option>
                <option value={0.05}>± 0.05</option>
                <option value={0.1}>± 0.1</option>
                <option value={0.5}>± 0.5</option>
                <option value={1}>± 1</option>
              </select>
            </Field>

            <Field label="Units — الوحدات">
              <select value={unitMode} onChange={(e) => setUnitMode(e.target.value)}>
                <option value="merge">One line per product (units may differ)</option>
                <option value="family">Split weight from count</option>
              </select>
            </Field>

            <Field label="Grouping — التجميع">
              <select value={splitByBranch ? "branch" : "product"} onChange={(e) => setSplitByBranch(e.target.value === "branch")}>
                <option value="product">Day × product</option>
                <option value="branch">Day × branch × product</option>
              </select>
            </Field>
          </div>

          {/* Which of our registers are read. Switching one off re-runs the
              comparison on what is left, so a gap can be attributed. */}
          <div className="dlx-tools" style={{ marginTop: 10 }}>
            <span className="dlx-muted">Our registers:</span>
            {SOURCES.map((k) => {
              const meta = SOURCE_META[k];
              return (
                <Toggle
                  key={k}
                  checked={sources.includes(k)}
                  onChange={() => toggleSource(k)}
                  label={`${meta.mark} ${meta.label} — ${meta.ar} (${(bySource[k] || []).length})`}
                  title={`Count the ${meta.label.toLowerCase()} of this month`}
                />
              );
            })}
          </div>

          <div className="dlx-tools" style={{ marginTop: 10 }}>
            <span className="dlx-muted">Returns actions counted as destroyed:</span>
            {DISPOSAL_ACTIONS.map((a) => {
              const meta = ACTION_META[a] || {};
              const on = actions.includes(a);
              return (
                <Toggle
                  key={a}
                  checked={on}
                  onChange={() => toggleAction(a)}
                  label={`${meta.mark || ""} ${a} — ${meta.ar || ""}`}
                  title={`Count returns lines whose action is “${a}”`}
                />
              );
            })}
          </div>

          {/* The date a line is compared on. A branch writes the return on
              the day it came back and decides its fate later; Odoo posts the
              voucher on the day of the decision. The action-change log holds
              that day, so it is used by default. */}
          <div className="dlx-tools" style={{ marginTop: 10 }}>
            <Toggle
              checked={useChangeDates}
              onChange={setUseChangeDates}
              label="Date by the day the action was changed — تاريخ تغيير الإجراء"
              title="Use the action-change log (and any stamped action date) instead of the report date"
            />
            {cmp.totals.datedByChange > 0 && (
              <Pill tone="violet" title="Lines whose disposal date came from an action change, not the report date">
                ↻ {cmp.totals.datedByChange} line(s) dated by their change
              </Pill>
            )}
            <button
              className="dlx-btn dlx-soft"
              onClick={() => setShowExcluded((v) => !v)}
              title="Products left out of the comparison"
            >
              ⊘ Excluded products ({excluded.length})
            </button>
            {cmp.totals.excludedLines > 0 && (
              <Pill tone="slate">{cmp.totals.excludedLines} source line(s) skipped</Pill>
            )}
          </div>

          {showExcluded && (
            <div className="dlx-note dlx-noteWarn">
              <div style={{ marginBottom: 6 }}>
                Excluded products are dropped from BOTH sides — الأصناف المستثناة تُحذف من الطرفين
                {excludeBusy ? " · saving…" : ""}
              </div>
              {excluded.length === 0 ? (
                <span>Nothing is excluded. Use the ⊘ button on any line to leave that product out.</span>
              ) : (
                <div className="dlx-legend">
                  {excluded.map((e) => (
                    <Pill key={`${e.code}|${e.product}`} tone="slate" title={`Excluded ${e.at ? fmtDMY(String(e.at).slice(0, 10)) : ""}${e.by ? ` by ${e.by}` : ""}`}>
                      {e.code || "—"} · {e.product || "—"}
                      <button className="dlx-undo" onClick={() => unexcludeProduct(e)} title="Put this product back into the comparison">↩</button>
                    </Pill>
                  ))}
                </div>
              )}
            </div>
          )}

          {(error || msg) && <div className={`dlx-note ${error ? "dlx-noteErr" : "dlx-noteOk"}`}>{error || msg}</div>}
          {(loading || loadingReturns) && <div className="dlx-note dlx-noteBusy">Loading…</div>}
        </section>

        {/* ── headline ── */}
        {!loading && (odooRows.length > 0 || mineRows.length > 0) && (
          <section className="dlx-card">
            <div className="dlx-cardHead">
              <span className="dlx-step">B</span>
              <div>
                <h2>{monthLabel(period)} — headline</h2>
                <p dir="rtl">{monthLabelAr(period)} · النتيجة العامة قبل الدخول في التفاصيل</p>
              </div>
            </div>

            <div className="dlx-kpis">
              <Kpi
                label="Month match (products)"
                ar="مطابقة الشهر لكل صنف"
                value={`${month.totals.product.matchRate}%`}
                tone={month.totals.product.matchRate >= 80 ? "green" : month.totals.product.matchRate >= 60 ? "amber" : "red"}
                sub={`${month.totals.product.match} of ${month.totals.product.rows} products`}
              />
              <Kpi label="Match rate (by day)" ar="نسبة التطابق اليومي" value={`${t.matchRate}%`} tone={t.matchRate >= 80 ? "green" : t.matchRate >= 60 ? "amber" : "red"}
                sub={`${t.match} of ${t.rows} lines`} />
              <Kpi label="Quantity differs" ar="فرق بالكمية" value={t.qtyDiff} tone="amber" />
              <Kpi label="Only in Odoo" ar="في أودو فقط" value={t.odooOnly} tone="red" sub="destroyed but never returned" />
              <Kpi label="Only in returns" ar="في المرتجعات فقط" value={t.returnsOnly} tone="blue" sub="returned but never posted" />
              <Kpi label="Paired across days" ar="طوبق بفارق يوم" value={t.shifted} tone="slate" sub={dayWindow ? `within ±${dayWindow} day(s)` : "off"} />
              <Kpi
                label="Source lines"
                ar="السطور المصدر"
                value={`${t.odooLines} / ${t.mineLines}`}
                tone="teal"
                sub={`Odoo / ours · ${SOURCES.filter((k) => sources.includes(k))
                  .map((k) => `${SOURCE_META[k].mark}${(bySource[k] || []).length}`)
                  .join(" ")}`}
              />
            </div>

            <div className="dlx-bar" title={barParts.map((p) => `${p.label}: ${p.n}`).join(" · ")}>
              {barParts.map((p) => (
                <i key={p.label} style={{ width: `${(p.n / barTotal) * 100}%`, background: p.color }} />
              ))}
            </div>
            <div className="dlx-legend">
              {barParts.map((p) => (
                <Pill key={p.label} tone={p.color === "#10b981" ? "green" : p.color === "#f59e0b" ? "amber" : p.color === "#ef4444" ? "red" : "blue"}>
                  {p.n} {p.label}
                </Pill>
              ))}
              {t.byFam.map((f) => (
                <Pill key={f.fam} tone="slate" title="Odoo total vs returns total for this unit family">
                  {f.fam}: odoo {fmt3(f.odoo)} · returns {fmt3(f.mine)} · {signed(f.diff)}
                </Pill>
              ))}
            </div>
          </section>
        )}

        {/* ── the comparison itself ── */}
        <section className="dlx-card">
          <div className="dlx-cardHead">
            <span className="dlx-step">C</span>
            <div>
              {view === "month" ? (
                <>
                  <h2>The whole month — per product, per branch</h2>
                  <p dir="rtl">مطابقة الشهر كاملاً أولاً لكل صنف أو لكل فرع — ثم افتح أيام أي سطر مختلف بزر 📅</p>
                </>
              ) : (
                <>
                  <h2>Day by day, product by product</h2>
                  <p dir="rtl">الفرق لكل يوم ولكل منتج على حدة — اضغط أي سطر لرؤية مصدره من الجهتين</p>
                </>
              )}
            </div>
            <div className="dlx-headRight">
              <Segmented
                value={view}
                onChange={setView}
                options={[
                  { value: "month", label: "📆 Whole month — الشهر كاملاً" },
                  { value: "days", label: "Days" },
                  { value: "products", label: "Products by day" },
                  { value: "branches", label: "Branches by day" },
                  { value: "findings", label: `Findings${findings.length ? ` (${findings.length})` : ""}` },
                ]}
              />
            </div>
          </div>

          {view === "month" && (
            <MonthlyReconciliation
              month={month}
              period={period}
              tolPct={tolPct}
              onTolPct={setTolPct}
              reviewed={reviewed}
              onToggleReviewed={toggleReviewedKey}
              onExclude={excludeProduct}
              onOpenDays={openDays}
            />
          )}

          {view === "days" && (
            <>
              <div className="dlx-tools">
                <Segmented
                  value={scope}
                  onChange={setScope}
                  options={[
                    { value: "day", label: "One day" },
                    { value: "week", label: "This week" },
                    { value: "all", label: `All ${cmp.rows.length} lines` },
                  ]}
                />
                <SearchInput value={query} onChange={setQuery} placeholder="Product code or name…" hint="press /" />
                <select className="dlx-iconBtn" value={daySort} onChange={(e) => setDaySort(e.target.value)} title="Sort the table">
                  <option value="status">↕ Date, then worst first</option>
                  <option value="gap">↕ Biggest gap first</option>
                  <option value="code">↕ Product code</option>
                  <option value="product">↕ Product name</option>
                  <option value="branch">↕ Branch</option>
                </select>
                <select
                  className="dlx-iconBtn"
                  value={minGap}
                  onChange={(e) => setMinGap(Number(e.target.value))}
                  title="Hide differences smaller than this (matched lines are not affected)"
                >
                  <option value={0}>Gap: any size</option>
                  <option value={0.5}>Gap ≥ 0.5</option>
                  <option value={1}>Gap ≥ 1</option>
                  <option value={5}>Gap ≥ 5</option>
                  <option value={10}>Gap ≥ 10</option>
                  <option value={25}>Gap ≥ 25</option>
                </select>
                <select className="dlx-iconBtn" value={branchFilter} onChange={(e) => setBranchFilter(e.target.value)}>
                  <option value="all">All branches</option>
                  {branchOptions.map((b) => <option key={b} value={b}>{b}</option>)}
                </select>
                <select className="dlx-iconBtn" value={sourceFilter} onChange={(e) => setSourceFilter(e.target.value)} title="Which register the returns side came from">
                  <option value="all">Any register</option>
                  {SOURCES.map((k) => <option key={k} value={k}>{SOURCE_META[k].label}</option>)}
                </select>
                <Toggle
                  checked={dayDiffOnly}
                  onChange={setDayDiffOnly}
                  label="Differences only — المختلف فقط"
                  title="Hide matched lines (reviewed differences stay visible)"
                />
                <Toggle
                  checked={unreviewedOnly}
                  onChange={setUnreviewedOnly}
                  label="Open issues only"
                  title="Hide matched lines and anything already reviewed"
                />
                {(query || statusFilter !== "all" || branchFilter !== "all" || sourceFilter !== "all" || unreviewedOnly || dayDiffOnly || minGap > 0) && (
                  <button
                    className="dlx-btn dlx-soft"
                    onClick={() => {
                      setQuery(""); setStatusFilter("all"); setBranchFilter("all");
                      setSourceFilter("all"); setUnreviewedOnly(false); setDayDiffOnly(false); setMinGap(0);
                    }}
                  >
                    ✕ Clear filters
                  </button>
                )}
              </div>

              {/* Status chips: count what the scope holds, click to filter. */}
              <div className="dlx-tools">
                <div className="dlx-legend" style={{ margin: 0 }}>
                  {[
                    { k: "all", label: "All", n: scopedCounts.all, tone: "slate" },
                    { k: DAY_STATUS.MATCH, label: "Matched", n: scopedCounts[DAY_STATUS.MATCH], tone: "green" },
                    { k: DAY_STATUS.QTY_DIFF, label: "Quantity differs", n: scopedCounts[DAY_STATUS.QTY_DIFF], tone: "amber" },
                    { k: DAY_STATUS.ODOO_ONLY, label: "Only in Odoo", n: scopedCounts[DAY_STATUS.ODOO_ONLY], tone: "red" },
                    { k: DAY_STATUS.RETURNS_ONLY, label: "Only in ours", n: scopedCounts[DAY_STATUS.RETURNS_ONLY], tone: "blue" },
                    { k: "shifted", label: "Paired across days", n: scopedCounts.shifted, tone: "violet" },
                    { k: "unit", label: "≠ unit", n: scopedCounts.unit, tone: "violet" },
                  ].map((c) => (
                    <Pill
                      key={c.k}
                      tone={statusFilter === c.k ? c.tone : "slate"}
                      onClick={() => setStatusFilter(statusFilter === c.k && c.k !== "all" ? "all" : c.k)}
                      title={`Show ${c.label.toLowerCase()}`}
                    >
                      {statusFilter === c.k ? "● " : ""}{c.label} · {c.n}
                    </Pill>
                  ))}
                </div>
              </div>

              <DailyChart
                days={cmp.days}
                selected={selectedDate}
                onPick={(d) => { setSelectedDate(d); setScope("day"); }}
              />

              <div className={`dlx-split ${treeHidden ? "closed" : "open"}`}>
                <DateTree
                  dates={cmp.days.map((d) => d.date)}
                  selected={selectedDate}
                  onSelect={(d) => { setSelectedDate(d); setScope("day"); }}
                  hidden={treeHidden}
                  onToggleHidden={setTreeHidden}
                  title="Comparison days"
                  meta={(d) => {
                    const g = dayIndex.get(d);
                    if (!g) return { count: 0, tone: "slate" };
                    const tone = g.odooOnly ? "red" : g.qtyDiff ? "amber" : g.returnsOnly ? "blue" : "green";
                    return {
                      count: g.issues || g.rows,
                      tone,
                      hint: `${g.rows} product line(s) · ${g.match} matched · ${g.qtyDiff} qty diff · ${g.odooOnly} only Odoo · ${g.returnsOnly} only returns`,
                    };
                  }}
                  footer={
                    <div className="dlx-legend">
                      <Pill tone="green">clean day</Pill>
                      <Pill tone="amber">qty gap</Pill>
                      <Pill tone="red">missing</Pill>
                    </div>
                  }
                />

                <div className="dlx-panel">
                  <div className="dlx-panelHead">
                    {scope !== "all" && (
                      <span style={{ display: "inline-flex", gap: 4 }}>
                        <button className="dlx-iconBtn" onClick={() => stepDay(-1)} title="Previous day (↑)">◀</button>
                        <button className="dlx-iconBtn" onClick={() => stepDay(1)} title="Next day (↓)">▶</button>
                      </span>
                    )}
                    <h3>
                      {scope === "day"
                        ? selectedDate ? `${formatDMY(selectedDate)} — ${visibleRows.length} product line(s)` : "Pick a day"
                        : scope === "week" && weekRange
                          ? `Week ${formatDMY(weekRange.from)} → ${formatDMY(weekRange.to)} — ${visibleRows.length} product line(s)`
                          : `${monthLabel(period)} — ${visibleRows.length} product line(s)`}
                    </h3>
                    {scope === "day" && dayIndex.get(selectedDate) && (
                      <Pill
                        tone={dayIndex.get(selectedDate).issues ? "amber" : "green"}
                        title="Share of this day's product lines that agree on both sides"
                      >
                        {Math.round((dayIndex.get(selectedDate).match / Math.max(1, dayIndex.get(selectedDate).rows)) * 100)}% matched
                      </Pill>
                    )}
                    <button
                      className="dlx-btn dlx-soft"
                      onClick={nextIssueDay}
                      disabled={!issueDays.length}
                      title={`Jump to the next day that still has a difference (n) — ${issueDays.length} day(s) with issues`}
                    >
                      ⏭ Next issue day
                    </button>
                    <button className="dlx-btn dlx-soft" onClick={toggleAllRows} disabled={!visibleRows.length}>
                      {allExpanded ? "▴ Collapse all" : "▾ Expand all"}
                    </button>
                    <button
                      className="dlx-btn dlx-soft"
                      onClick={reviewAllVisible}
                      disabled={!visibleRows.some((r) => r.status !== DAY_STATUS.MATCH && !reviewed[reviewKeyOf(r)])}
                      title="Mark every open difference on screen as reviewed, with one reason"
                    >
                      ☑ Review all on screen
                    </button>
                    <div className="dlx-sp">
                      {scope === "day" && dayIndex.get(selectedDate)?.byFam.map((f) => (
                        <Pill key={f.fam} tone={Math.abs(f.diff) < 0.005 ? "green" : "amber"}>
                          {f.fam}: {fmt3(f.odoo)} → {fmt3(f.mine)} ({signed(f.diff)})
                        </Pill>
                      ))}
                    </div>
                  </div>

                  {visibleRows.length === 0 ? (
                    <EmptyState
                      icon="⚖️"
                      title={cmp.rows.length ? "Nothing matches these filters" : "Nothing to compare yet"}
                      hint={
                        cmp.rows.length
                          ? "Clear a filter, or pick another day from the tree."
                          : "Import an Odoo month first, then this page reads the returns of the same month by itself."
                      }
                    />
                  ) : (
                    <div className="dlx-tableWrap">
                      <table className="dlx-table">
                        <thead>
                          <tr>
                            <th />
                            <th>DATE</th>
                            <th>CODE</th>
                            <th>PRODUCT</th>
                            <th>BRANCH / CUSTOMER</th>
                            <th>REGISTER</th>
                            <th>UNIT</th>
                            <th className="num">ODOO</th>
                            <th className="num">RETURNS</th>
                            <th className="num">DIFFERENCE</th>
                            <th>STATUS</th>
                            <th />
                          </tr>
                        </thead>
                        <tbody>
                          {visibleRows.map((r) => {
                            const open = !!expanded[r.key];
                            const meta = DAY_STATUS_META[r.status];
                            return (
                              <React.Fragment key={r.key}>
                                <tr className={open ? "open" : ""}>
                                  <td>
                                    <button className="dlx-rowBtn" onClick={() => toggleRow(r.key)} title="Show the lines behind this figure">
                                      {open ? "▾" : "▸"}
                                    </button>
                                  </td>
                                  <td>
                                    {formatDMY(r.date)}
                                    {r.shiftDays ? (
                                      <Pill tone="violet" title={`Our entry is dated ${r.mineDate}`}>
                                        {r.shiftDays > 0 ? `+${r.shiftDays}d` : `${r.shiftDays}d`}
                                      </Pill>
                                    ) : null}
                                    {r.datedByChange ? (
                                      <Pill tone="blue" title="Dated by the day the action was changed, not the day of the report">↻</Pill>
                                    ) : null}
                                  </td>
                                  <td className="mono">{r.code || "—"}</td>
                                  <td className="wrap">{r.product}</td>
                                  <td className="wrap">
                                    {r.branches.map((b) => <Pill key={b} tone="teal">{b}</Pill>)}
                                    {r.customers.slice(0, 3).map((c) => <Pill key={c} tone="violet" title="Customer return">{c}</Pill>)}
                                    {r.customers.length > 3 && <Pill tone="violet">+{r.customers.length - 3}</Pill>}
                                    {!r.branches.length && !r.customers.length && "—"}
                                  </td>
                                  <td>
                                    {r.sources.length
                                      ? r.sources.map((k) => (
                                          <Pill key={k} tone={SOURCE_META[k].tone} title={SOURCE_META[k].label}>
                                            {SOURCE_META[k].mark}
                                          </Pill>
                                        ))
                                      : <span className="dlx-muted">—</span>}
                                  </td>
                                  <td>
                                    {r.units.join(" / ") || r.fam}
                                    {r.unitMismatch && <Pill tone="violet" title="The two systems use different unit names for this product">≠ unit</Pill>}
                                  </td>
                                  <td className="num">{fmt3(r.odooQty)}</td>
                                  <td className="num">{fmt3(r.mineQty)}</td>
                                  <td className={`num ${r.diff > 0 ? "pos" : r.diff < 0 ? "neg" : ""}`}>{signed(r.diff)}</td>
                                  <td>
                                    <Pill tone={STATUS_TONE[r.status]}>{meta.icon} {meta.label}</Pill>
                                    {(() => {
                                      const near = counterpartOf(r);
                                      if (!near || Math.abs(near.gap) > 10) return null;
                                      const side = near.row.status === DAY_STATUS.ODOO_ONLY ? "Odoo" : "ours";
                                      return (
                                        <Pill
                                          tone="violet"
                                          title={`The same product is ${side === "Odoo" ? "in Odoo" : "in our registers"} on ${formatDMY(near.row.date)} with nothing on the other side — probably the same event, dated ${Math.abs(near.gap)} day(s) apart. Click to open that day.`}
                                          onClick={() => { setSelectedDate(near.row.date); setScope("day"); }}
                                        >
                                          ↔ {side} {formatDMY(near.row.date).slice(0, 5)} ({near.gap > 0 ? "+" : ""}{near.gap}d) {fmt3(side === "Odoo" ? near.row.odooQty : near.row.mineQty)}
                                        </Pill>
                                      );
                                    })()}
                                    {reviewed[reviewKeyOf(r)] && (
                                      <Pill tone="green" title={reviewed[reviewKeyOf(r)].note || "Reviewed"}>
                                        ✓ reviewed
                                      </Pill>
                                    )}
                                  </td>
                                  <td style={{ whiteSpace: "nowrap" }}>
                                    {r.status !== DAY_STATUS.MATCH && (
                                      <button
                                        className={reviewed[reviewKeyOf(r)] ? "dlx-undo" : "dlx-iconBtn"}
                                        title={
                                          reviewed[reviewKeyOf(r)]
                                            ? `Reviewed${reviewed[reviewKeyOf(r)].by ? ` by ${reviewed[reviewKeyOf(r)].by}` : ""}${reviewed[reviewKeyOf(r)].note ? `: ${reviewed[reviewKeyOf(r)].note}` : ""} — click to reopen`
                                            : "Mark this difference as reviewed, with a reason"
                                        }
                                        onClick={() => toggleReviewed(r)}
                                      >
                                        {reviewed[reviewKeyOf(r)] ? "✓" : "☐"}
                                      </button>
                                    )}
                                    <button
                                      className="dlx-del"
                                      title={`Leave ${r.code || r.product} out of the comparison`}
                                      onClick={() => excludeProduct(r)}
                                    >
                                      ⊘
                                    </button>
                                  </td>
                                </tr>

                                {open && (
                                  <tr className="dlx-sub">
                                    <td colSpan={12}>
                                      <div style={{ display: "grid", gap: 10, gridTemplateColumns: "repeat(auto-fit,minmax(280px,1fr))" }}>
                                        <div>
                                          <strong style={{ fontSize: 12 }}>Odoo file — {r.odooLines.length} line(s)</strong>
                                          <table className="dlx-subTable">
                                            <thead>
                                              <tr><th>Date</th><th>Branch</th><th>Reference</th><th className="num">Qty</th><th>Unit</th></tr>
                                            </thead>
                                            <tbody>
                                              {r.odooLines.length === 0 ? (
                                                <tr><td colSpan={5}>Nothing in the Odoo file.</td></tr>
                                              ) : r.odooLines.map((l, i) => (
                                                <tr key={i}>
                                                  <td>{formatDMY(l.date)}</td>
                                                  <td>{l.branch || "—"}</td>
                                                  <td className="mono">{l.ref || "—"}</td>
                                                  <td className="num">{fmt3(l.qty)}</td>
                                                  <td>{l.uom}</td>
                                                </tr>
                                              ))}
                                            </tbody>
                                          </table>
                                        </div>
                                        <div>
                                          <strong style={{ fontSize: 12 }}>Our registers — {r.mineLines.length} line(s)</strong>
                                          <table className="dlx-subTable">
                                            <thead>
                                              <tr><th>Date</th><th>Register</th><th>Branch / customer</th><th>Action</th><th className="num">Qty</th><th>Unit</th><th>Remarks</th></tr>
                                            </thead>
                                            <tbody>
                                              {r.mineLines.length === 0 ? (
                                                <tr><td colSpan={7}>Nothing of ours records this product being destroyed.</td></tr>
                                              ) : r.mineLines.map((l, i) => (
                                                <tr key={i}>
                                                  <td title={
                                                    l.dateFrom === "report"
                                                      ? "The report's own date"
                                                      : `Action changed on this day — the report is dated ${formatDMY(l.reportDate)}`
                                                  }>
                                                    {formatDMY(l.date)}
                                                    {l.dateFrom !== "report" ? " ↻" : ""}
                                                  </td>
                                                  <td title={SOURCE_META[l.source]?.label}>
                                                    {SOURCE_META[l.source]?.mark} {SOURCE_META[l.source]?.label || l.source}
                                                  </td>
                                                  <td>{l.customer || l.branch || "—"}</td>
                                                  <td>{l.action}</td>
                                                  <td className="num">{fmt3(l.qty)}</td>
                                                  <td>{l.uom}</td>
                                                  <td>{l.remarks || "—"}</td>
                                                </tr>
                                              ))}
                                            </tbody>
                                          </table>
                                        </div>
                                      </div>
                                    </td>
                                  </tr>
                                )}
                              </React.Fragment>
                            );
                          })}
                        </tbody>
                        {/* One total line per unit family: adding kilos to
                            plates would produce a number that means nothing,
                            and this table always holds both. */}
                        <tfoot>
                          {visibleFamTotals.map((f) => (
                            <tr key={f.fam}>
                              <td colSpan={7}>
                                Total {f.fam} — {f.lines} product line(s)
                              </td>
                              <td className="num">{fmt3(f.odoo)}</td>
                              <td className="num">{fmt3(f.mine)}</td>
                              <td className={`num ${f.diff > 0 ? "pos" : f.diff < 0 ? "neg" : ""}`}>{signed(f.diff)}</td>
                              <td />
                              <td />
                            </tr>
                          ))}
                        </tfoot>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            </>
          )}

          {view === "products" && (
            <>
              <div className="dlx-tools">
                <SearchInput value={query} onChange={setQuery} placeholder="Product code or name…" />
                <Toggle
                  checked={hideClean}
                  onChange={setHideClean}
                  label={`Hide products with no difference — إخفاء المطابق (${cleanProducts})`}
                  title="Hide products whose month DIFFERENCE is 0, whatever the days show"
                />
                <span className="dlx-muted">
                  {visibleProducts.length} of {cmp.products.length} shown · sorted by the biggest gap over the whole month.
                </span>
              </div>
              <div className="dlx-tableWrap">
                <table className="dlx-table">
                  <thead>
                    <tr>
                      <th title="Story">📖</th>
                      <th>CODE</th><th>PRODUCT</th><th>UNIT</th><th className="num">DAYS</th>
                      <th className="num">ODOO</th><th className="num">RETURNS</th><th className="num">DIFFERENCE</th>
                      <th className="num">CLEAN DAYS</th>
                      <th />
                    </tr>
                  </thead>
                  <tbody>
                    {visibleProducts.map((p) => {
                      const hasStory = !isZero(p.diff) || p.issues > 0;
                      const open = hasStory && !!storyOpen[p.key];
                      return (
                      <React.Fragment key={p.key}>
                      <tr className={open ? "open" : ""}>
                        <td>
                          {hasStory && (
                            <button
                              className="dlx-rowBtn"
                              onClick={() => setStoryOpen((m) => ({ ...m, [p.key]: !m[p.key] }))}
                              title="Show this product's month story: what happened, where and when"
                            >
                              {open ? "▾" : "▸"} 📖
                            </button>
                          )}
                        </td>
                        <td className="mono">{p.code || "—"}</td>
                        <td className="wrap">{p.product}</td>
                        <td>{p.fam}</td>
                        <td className="num">{p.days}</td>
                        <td className="num">{fmt3(p.odooQty)}</td>
                        <td className="num">{fmt3(p.mineQty)}</td>
                        <td className={`num ${p.diff > 0 ? "pos" : p.diff < 0 ? "neg" : ""}`}>{signed(p.diff)}</td>
                        <td className="num">{p.match}/{p.days}</td>
                        <td>
                          <button className="dlx-del" title="Leave this product out of the comparison" onClick={() => excludeProduct(p)}>⊘</button>
                        </td>
                      </tr>
                      {open && (
                        <tr className="dlx-sub">
                          <td colSpan={10}>
                            <ProductStory
                              product={p}
                              rows={rowsByProduct.get(p.key) || []}
                              tolerance={cmp.tolerance}
                              onOpenDay={(d) => {
                                setView("days");
                                setScope("day");
                                setSelectedDate(d);
                                setQuery(p.code || p.product);
                                setStatusFilter("all");
                                setBranchFilter("all");
                                setSourceFilter("all");
                              }}
                            />
                          </td>
                        </tr>
                      )}
                      </React.Fragment>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </>
          )}

          {view === "findings" && (
            findings.length === 0 ? (
              <EmptyState icon="🔎" title="Nothing worth reporting yet" hint="Pick an imported month first, or loosen the filters." />
            ) : (
              <div className="dlx-findings">
                {findings.map((f, i) => (
                  <div key={i} className={`dlx-finding dlx-fi-${f.tone}`}>
                    <strong>{f.title}</strong>
                    <p>{f.detail}</p>
                  </div>
                ))}
                <div className="dlx-finding dlx-fi-slate">
                  <strong>How to read this page</strong>
                  <p>
                    Every line is one day and one product. “Only in Odoo” means the store destroyed
                    something no register of ours accounts for; “only in ours” means the opposite, and the
                    stock is still standing in Odoo. Differences of a day or two are normal and are paired
                    by the day window. Mark a line reviewed once you know why it differs, and exclude a
                    product outright when it is never meant to reconcile.
                  </p>
                </div>
              </div>
            )
          )}

          {view === "branches" && (
            <>
            <div className="dlx-tools">
              <Toggle
                checked={hideClean}
                onChange={setHideClean}
                label={`Hide branches with no difference — إخفاء المطابق (${cleanBranches})`}
                title="Hide branches whose month DIFFERENCE is 0, whatever the days show"
              />
              <span className="dlx-muted">{visibleBranches.length} of {cmp.branches.length} shown</span>
            </div>
            <div className="dlx-tableWrap">
              <table className="dlx-table">
                <thead>
                  <tr>
                    <th>BRANCH</th><th className="num">LINES</th><th className="num">ODOO</th><th className="num">RETURNS</th>
                    <th className="num">DIFFERENCE</th><th className="num">MATCHED</th><th className="num">QTY DIFF</th>
                    <th className="num">ONLY ODOO</th><th className="num">ONLY RETURNS</th><th className="num">MATCH %</th>
                  </tr>
                </thead>
                <tbody>
                  {visibleBranches.map((b) => (
                    <tr key={b.branch}>
                      <td><Pill tone="teal">{b.branch}</Pill></td>
                      <td className="num">{b.rows}</td>
                      <td className="num">{fmt3(b.odooQty)}</td>
                      <td className="num">{fmt3(b.mineQty)}</td>
                      <td className={`num ${b.diff > 0 ? "pos" : b.diff < 0 ? "neg" : ""}`}>{signed(b.diff)}</td>
                      <td className="num">{b.match}</td>
                      <td className="num">{b.qtyDiff}</td>
                      <td className="num">{b.odooOnly}</td>
                      <td className="num">{b.returnsOnly}</td>
                      <td className="num">{b.matchRate}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            </>
          )}
        </section>

        <div className="dlx-footer">Built by Eng. Mohammed Abdullah</div>
      </div>

      {confirm && (
        <div className="dlx-modalWrap" role="dialog" aria-modal="true">
          <div className="dlx-modal">
            <h4>{confirm.title}</h4>
            <p>{confirm.body}</p>
            <div className="dlx-modalBtns">
              <button className="dlx-btn dlx-soft" onClick={() => setConfirm(null)}>Cancel</button>
              <button
                className="dlx-btn dlx-danger"
                onClick={async () => {
                  const fn = confirm.onYes;
                  setConfirm(null);
                  await fn?.();
                }}
              >
                Yes, delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
