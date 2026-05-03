// src/pages/training/TrainingAnnualPlan.jsx
import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

/* ===================== API base ===================== */
const API_ROOT_DEFAULT = "https://inspection-server-4nvj.onrender.com";
const API_BASE = String(
  (typeof window !== "undefined" && window.__QCS_API__) ||
    (typeof import.meta !== "undefined" && import.meta.env?.VITE_API_URL) ||
    (typeof process !== "undefined" && process.env?.REACT_APP_API_URL) ||
    API_ROOT_DEFAULT
).replace(/\/$/, "");

const REPORTS_URL = `${API_BASE}/api/reports`;
const TYPE = "training_annual_plan";
const SESSION_TYPE = "training_session";

/* ===================== Helpers ===================== */
async function safeJson(res) {
  const text = await res.text();
  try { return text ? JSON.parse(text) : null; } catch { return text || null; }
}
function unwrapList(data) {
  return Array.isArray(data)
    ? data
    : Array.isArray(data?.items)
    ? data.items
    : Array.isArray(data?.data)
    ? data.data
    : Array.isArray(data?.reports)
    ? data.reports
    : [];
}
async function listReportsByType(type) {
  const res = await fetch(`${REPORTS_URL}?type=${encodeURIComponent(type)}`, {
    method: "GET", headers: { Accept: "application/json" },
  });
  if (!res.ok) {
    const d = await safeJson(res);
    throw new Error(d?.message || d?.error || `Failed (${res.status})`);
  }
  return unwrapList(await safeJson(res));
}
function planTimestamp(r) {
  const t = r?.payload?.updatedAt || r?.updated_at || r?.updatedAt || r?.created_at || r?.createdAt || r?.created || r?.timestamp;
  if (!t) return 0;
  const ms = new Date(t).getTime();
  return Number.isFinite(ms) ? ms : 0;
}
async function listPlans(year) {
  const arr = await listReportsByType(TYPE);
  const filtered = year == null ? arr : arr.filter((r) => Number(r?.payload?.year) === Number(year));
  // ✅ Most recent first
  return [...filtered].sort((a, b) => planTimestamp(b) - planTimestamp(a));
}
async function listSessions(year) {
  const arr = await listReportsByType(SESSION_TYPE);
  if (year == null) return arr;
  return arr.filter((r) => {
    const d = sessionDate(r);
    if (!d) return false;
    return d.getFullYear() === Number(year);
  });
}
function sessionDate(r) {
  const raw = r?.payload?.date || r?.payload?.reportDate || r?.created_at || r?.createdAt || r?.created || r?.timestamp;
  if (!raw) return null;
  const d = new Date(raw);
  if (isNaN(d.getTime())) return null;
  return d;
}
function sessionBranch(r) {
  return String(r?.branch || r?.payload?.branch || r?.payload?.BRANCH || "").trim();
}
function sessionModule(r) {
  return String(r?.payload?.moduleName || r?.payload?.module || "").trim();
}
function sessionTitle(r) {
  return String(r?.title || r?.payload?.title || r?.payload?.documentTitle || "").trim();
}
/* normalize for matching — lowercase, trim, collapse spaces */
function normalizeModule(s) {
  return String(s || "").toLowerCase().replace(/\s+/g, " ").trim();
}
function normalizeBranch(s) {
  return String(s || "").toUpperCase().replace(/\s+/g, " ").trim();
}
function fmtDate(d) {
  if (!d) return "";
  try {
    const dd = d instanceof Date ? d : new Date(d);
    if (isNaN(dd.getTime())) return "";
    return dd.toISOString().slice(0, 10);
  } catch { return ""; }
}
async function createPlan(body) {
  const res = await fetch(REPORTS_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const d = await safeJson(res);
    throw new Error(d?.message || d?.error || `Failed (${res.status})`);
  }
  return await safeJson(res);
}
async function updatePlan(id, body) {
  let res = await fetch(`${REPORTS_URL}/${encodeURIComponent(id)}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    res = await fetch(`${REPORTS_URL}/${encodeURIComponent(id)}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  }
  if (!res.ok) {
    const d = await safeJson(res);
    throw new Error(d?.message || d?.error || `Failed (${res.status})`);
  }
  return await safeJson(res);
}
function getId(r) {
  return r?.id || r?._id || r?.payload?.id || r?.payload?._id;
}

/* ===================== Modules & Branches ===================== */
const MODULES = [
  "Personnel Hygiene",
  "GHP / Cleaning & Sanitation",
  "Receiving",
  "Storage",
  "Time & Temperature / CCP",
  "HACCP Basics",
  "Allergen Control",
  "Cross Contamination Control",
  "Chemical Safety (Food + OHS)",
  "Pest Control Awareness",
  "Waste Management",
  "OHS: PPE & Safe Work",
  "OHS: Knife Safety",
  "OHS: Manual Handling",
  "OHS: Fire Safety & Emergency",
  "OHS: First Aid & Incident Reporting",
];

/* ✅ الأفرع الحقيقية فقط */
const BRANCHES = [
  { key: "QCS",                         label: "QCS",                  icon: "🏢", aliases: ["QCS"] },
  { key: "PRODUCTION",                  label: "PRODUCTION",           icon: "🏭", aliases: ["PRODUCTION", "PROD"] },
  { key: "WARQA KITCHEN",               label: "Warqa Kitchen",        icon: "🍳", aliases: ["WARQA", "WARQA KITCHEN", "AL WARQA", "AL WARQA KITCHEN", "POS 19", "POS19", "POS 19 - WARQA", "POS 19 WARQA", "POS 19 - WARQA KITCHEN", "POS 19 WARQA KITCHEN"] },
  { key: "POS 10 - Abu Dhabi Butchery", label: "POS 10 — Abu Dhabi",   icon: "🥩", aliases: ["POS 10", "POS10", "ABU DHABI", "POS 10 ABU DHABI"] },
  { key: "POS 11 - Al Ain Butchery",    label: "POS 11 — Al Ain",      icon: "🥩", aliases: ["POS 11", "POS11", "AL AIN", "POS 11 AL AIN"] },
  { key: "POS 15 - Al Barsha Butchery", label: "POS 15 — Al Barsha",   icon: "🥩", aliases: ["POS 15", "POS15", "AL BARSHA", "POS 15 AL BARSHA"] },
  { key: "FTR 1 - MUSHRIF food truck",  label: "FTR 1 — Mushrif",      icon: "🚚", aliases: ["FTR 1", "FTR1", "MUSHRIF", "FTR 1 MUSHRIF", "FOOD TRUCK 1"] },
  { key: "FTR 2 - Mamzar food truck",   label: "FTR 2 — Mamzar",       icon: "🚚", aliases: ["FTR 2", "FTR2", "MAMZAR", "AL MAMZAR", "FTR 2 MAMZAR", "FOOD TRUCK 2"] },
];

const MONTHS = [
  { i: 1,  short: "Jan", full: "January"   },
  { i: 2,  short: "Feb", full: "February"  },
  { i: 3,  short: "Mar", full: "March"     },
  { i: 4,  short: "Apr", full: "April"     },
  { i: 5,  short: "May", full: "May"       },
  { i: 6,  short: "Jun", full: "June"      },
  { i: 7,  short: "Jul", full: "July"      },
  { i: 8,  short: "Aug", full: "August"    },
  { i: 9,  short: "Sep", full: "September" },
  { i: 10, short: "Oct", full: "October"   },
  { i: 11, short: "Nov", full: "November"  },
  { i: 12, short: "Dec", full: "December"  },
];

/* ===================== Default Plan ===================== */
const DEFAULT_MONTHLY_FOCUS = {
  1:  ["Personnel Hygiene", "OHS: PPE & Safe Work"],
  2:  ["GHP / Cleaning & Sanitation"],
  3:  ["Receiving", "Storage"],
  4:  ["Time & Temperature / CCP"],
  5:  ["HACCP Basics"],
  6:  ["Allergen Control"],
  7:  ["Cross Contamination Control", "OHS: Knife Safety"],
  8:  ["Chemical Safety (Food + OHS)"],
  9:  ["Pest Control Awareness"],
  10: ["Waste Management", "OHS: Manual Handling"],
  11: ["OHS: Fire Safety & Emergency"],
  12: ["OHS: First Aid & Incident Reporting", "Personnel Hygiene"],
};

function buildEmptyMatrix() {
  const m = {};
  for (const b of BRANCHES) {
    m[b.key] = {};
    for (const mo of MONTHS) m[b.key][mo.i] = [];
  }
  return m;
}
function buildDefaultMatrix() {
  const m = {};
  for (const b of BRANCHES) {
    m[b.key] = {};
    for (const mo of MONTHS) m[b.key][mo.i] = [...(DEFAULT_MONTHLY_FOCUS[mo.i] || [])];
  }
  return m;
}

/* ===================== Design Tokens ===================== */
const C = {
  bg0:    "#0b1120",
  bg1:    "#1e293b",
  bg2:    "#0f172a",
  card:   "#ffffff",
  navy:   "#0f172a",
  ink:    "#0f172a",
  sub:    "#475569",
  muted:  "#94a3b8",
  line:   "#e2e8f0",
  line2:  "#cbd5e1",
  band:   "#f8fafc",
  band2:  "#f1f5f9",
  blue:   "#2563eb",
  blueBg: "#dbeafe",
  green:  "#059669",
  greenBg:"#d1fae5",
  amber:  "#d97706",
  amberBg:"#fef3c7",
  red:    "#dc2626",
  redBg:  "#fee2e2",
  purple: "#7c3aed",
  purpleBg:"#ede9fe",
  indigo: "#4f46e5",
};

const btn = (bg, color = "#fff", disabled = false) => ({
  background: disabled ? "#e5e7eb" : bg,
  color: disabled ? "#94a3b8" : color,
  border: "none",
  borderRadius: 10,
  padding: "10px 14px",
  fontWeight: 800,
  fontSize: 13,
  cursor: disabled ? "not-allowed" : "pointer",
  whiteSpace: "nowrap",
  letterSpacing: 0.2,
  transition: "transform .12s ease, box-shadow .12s ease, opacity .12s",
  boxShadow: disabled ? "none" : "0 4px 12px rgba(15,23,42,0.10)",
});

const inputSt = {
  border: `1px solid ${C.line}`,
  borderRadius: 10,
  padding: "9px 12px",
  fontSize: 13,
  color: C.ink,
  background: "#fff",
  outline: "none",
  fontFamily: "inherit",
  fontWeight: 700,
};

/* ===================== Component ===================== */
export default function TrainingAnnualPlan() {
  const navigate = useNavigate();

  const currentYear = new Date().getFullYear();
  const [year, setYear] = useState(currentYear);
  const [matrix, setMatrix] = useState(() => buildEmptyMatrix());
  const [planId, setPlanId] = useState(null);
  const [loading, setLoading] = useState(true);  // start in loading state to avoid flash
  const [saving, setSaving] = useState(false);
  const [info, setInfo] = useState("");
  const [err, setErr] = useState("");
  const [editor, setEditor] = useState(null); // { branch, month }
  const [sessions, setSessions] = useState([]); // actual delivered sessions
  const [showActual, setShowActual] = useState(true);
  const [duplicateCount, setDuplicateCount] = useState(0); // multiple saved plans for same year
  const [showUnmatched, setShowUnmatched] = useState(false);

  /* ---------- Load ---------- */
  async function loadAll(y) {
    setLoading(true);
    setErr("");
    setInfo("");
    setDuplicateCount(0);
    try {
      const [items, sess] = await Promise.all([listPlans(y), listSessions(y).catch(() => [])]);
      setSessions(Array.isArray(sess) ? sess : []);

      if (items.length > 0) {
        const r = items[0]; // already sorted: most recent first
        const dupes = items.length - 1;
        if (dupes > 0) setDuplicateCount(dupes);

        const m = r?.payload?.matrix;
        if (m && typeof m === "object") {
          const merged = buildEmptyMatrix();
          let seededBranches = 0;
          for (const b of BRANCHES) {
            // Does the saved plan have this branch with ANY non-empty month?
            const branchHasContent =
              m?.[b.key] &&
              typeof m[b.key] === "object" &&
              MONTHS.some((mo) => {
                const v = m[b.key]?.[mo.i] ?? m[b.key]?.[String(mo.i)];
                return Array.isArray(v) && v.length > 0;
              });

            if (branchHasContent) {
              // load saved data; missing months stay empty (user may have cleared them)
              for (const mo of MONTHS) {
                const v = m?.[b.key]?.[mo.i] ?? m?.[b.key]?.[String(mo.i)];
                merged[b.key][mo.i] = Array.isArray(v) ? v.filter(Boolean) : [];
              }
            } else {
              // ✅ branch is entirely empty (or missing) → seed with default monthly focus
              seededBranches += 1;
              for (const mo of MONTHS) {
                merged[b.key][mo.i] = [...(DEFAULT_MONTHLY_FOCUS[mo.i] || [])];
              }
            }
          }
          setMatrix(merged);
          setPlanId(getId(r));
          const ts = planTimestamp(r);
          const tsLabel = ts ? new Date(ts).toLocaleString() : "—";
          setInfo(
            `Loaded plan for ${y} (last update ${tsLabel}) · ${sess.length} actual session(s)` +
            (seededBranches > 0 ? ` · ${seededBranches} empty branch(es) auto-seeded with default — review & save.` : "")
          );
          return;
        }
      }
      setMatrix(buildDefaultMatrix());
      setPlanId(null);
      setInfo(`No saved plan for ${y} · ${sess.length} actual session(s) found. Showing default — edit and save.`);
    } catch (e) {
      setErr(String(e?.message || e));
    } finally {
      setLoading(false);
    }
  }

  /* ---------- Delete saved plan for this year ---------- */
  async function deleteSavedPlan() {
    if (!planId) {
      alert("No saved plan exists for this year on the server.");
      return;
    }
    const confirmText = window.prompt(
      `⚠ This will PERMANENTLY delete the saved Annual Training Plan for ${year} from the server.\n\n` +
      `Note: Actual training sessions (deliveries) are NOT deleted — only the planning matrix.\n\n` +
      `Type DELETE to confirm:`
    );
    if (confirmText !== "DELETE") {
      setInfo("Delete cancelled.");
      return;
    }
    setLoading(true);
    setErr("");
    try {
      // Delete the active plan + any duplicates
      const items = await listPlans(year);
      let ok = 0, fail = 0;
      for (const r of items) {
        const id = getId(r);
        if (!id) { fail += 1; continue; }
        try {
          const res = await fetch(`${REPORTS_URL}/${encodeURIComponent(id)}`, { method: "DELETE" });
          if (res.ok) ok += 1; else fail += 1;
        } catch { fail += 1; }
      }
      setPlanId(null);
      setDuplicateCount(0);
      setMatrix(buildEmptyMatrix());
      setInfo(`Deleted ${ok} plan version(s) for ${year}` + (fail ? ` · ${fail} failed` : "") + ". Showing empty matrix.");
    } catch (e) {
      setErr(String(e?.message || e));
    } finally {
      setLoading(false);
    }
  }

  /* ---------- Cleanup duplicates ---------- */
  async function cleanupDuplicates() {
    if (!window.confirm(
      "This year has multiple saved plans. The most recent one will be kept and the older ones deleted. Continue?"
    )) return;
    setLoading(true);
    setErr("");
    try {
      const items = await listPlans(year); // sorted, most recent first
      if (items.length <= 1) {
        setDuplicateCount(0);
        setInfo("No duplicates to clean.");
        return;
      }
      const keep = items[0];
      const toDelete = items.slice(1);
      let ok = 0, fail = 0;
      for (const r of toDelete) {
        const id = getId(r);
        if (!id) { fail += 1; continue; }
        try {
          const res = await fetch(`${REPORTS_URL}/${encodeURIComponent(id)}`, { method: "DELETE" });
          if (res.ok) ok += 1; else fail += 1;
        } catch { fail += 1; }
      }
      setPlanId(getId(keep));
      setDuplicateCount(0);
      setInfo(`Cleanup done · kept latest plan · deleted ${ok} duplicate(s)` + (fail ? ` · ${fail} failed` : ""));
    } catch (e) {
      setErr(String(e?.message || e));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAll(year);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [year]);

  /* ---------- Build delivery index from actual sessions ---------- *
   * Index: { [branchKey]: { [month]: { delivered: Map<moduleNorm, sessions[]>, all: sessions[] } } }
   * --------------------------------------------------------------- */
  const branchKeys = useMemo(() => BRANCHES.map((b) => b.key), []);
  const branchKeyByLower = useMemo(() => {
    const m = new Map();
    for (const b of BRANCHES) {
      m.set(normalizeBranch(b.key), b.key);
      for (const a of b.aliases || []) m.set(normalizeBranch(a), b.key);
    }
    return m;
  }, []);

  function matchBranchKey(rawBranch) {
    const n = normalizeBranch(rawBranch);
    if (!n) return null;
    if (branchKeyByLower.has(n)) return branchKeyByLower.get(n);
    // partial: any alias/key that the saved string starts with, OR contains
    for (const [alias, branchKey] of branchKeyByLower.entries()) {
      if (!alias) continue;
      if (n === alias) return branchKey;
      if (n.startsWith(alias + " ") || n.startsWith(alias + "-")) return branchKey;
      if (alias.startsWith(n + " ") || alias.startsWith(n + "-")) return branchKey;
      if (n.includes(" " + alias + " ") || n.includes(alias)) {
        // safer: only allow contains when alias is at least 4 chars to avoid false matches
        if (alias.length >= 4) return branchKey;
      }
    }
    return null;
  }

  const deliveryIndex = useMemo(() => {
    const idx = {};
    for (const b of branchKeys) {
      idx[b] = {};
      for (const mo of MONTHS) idx[b][mo.i] = { all: [], byModule: new Map() };
    }
    const unmatchedList = [];
    for (const s of sessions) {
      const rawBranch = sessionBranch(s);
      if (!rawBranch) { unmatchedList.push(s); continue; }
      const matchedKey = matchBranchKey(rawBranch);
      if (!matchedKey) { unmatchedList.push(s); continue; }
      const d = sessionDate(s);
      if (!d) continue;
      const month = d.getMonth() + 1;
      const mod = sessionModule(s);
      const cell = idx[matchedKey][month];
      cell.all.push(s);
      const key = normalizeModule(mod);
      if (!cell.byModule.has(key)) cell.byModule.set(key, []);
      cell.byModule.get(key).push(s);
    }
    idx.__unmatched = unmatchedList.length;
    idx.__unmatchedList = unmatchedList;
    return idx;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessions, branchKeys, branchKeyByLower]);

  /* ---------- Per-cell status ---------- */
  function cellStatus(branchKey, month) {
    const planned = matrix?.[branchKey]?.[month] || [];
    const actual = deliveryIndex?.[branchKey]?.[month] || { all: [], byModule: new Map() };
    const deliveredKeys = new Set(actual.byModule.keys());
    const plannedKeys = new Set(planned.map(normalizeModule));
    const delivered = planned.filter((p) => deliveredKeys.has(normalizeModule(p)));
    const missing = planned.filter((p) => !deliveredKeys.has(normalizeModule(p)));
    const extras = [];
    for (const [k, list] of actual.byModule.entries()) {
      if (!plannedKeys.has(k) && list[0]) {
        extras.push(sessionModule(list[0]) || "(unspecified module)");
      }
    }
    return {
      planned,
      delivered,
      missing,
      extras,
      sessionsAll: actual.all,
      sessionsByModule: actual.byModule,
    };
  }

  /* ---------- Save ---------- */
  async function handleSave() {
    setSaving(true);
    setErr("");
    setInfo("");
    try {
      const payload = { year: Number(year), matrix, updatedAt: new Date().toISOString() };
      const body = { type: TYPE, title: `Annual Training Plan ${year}`, branch: "ALL", payload };
      if (planId) {
        await updatePlan(planId, body);
        setInfo(`Plan for ${year} updated.`);
      } else {
        const created = await createPlan(body);
        const newId = getId(created);
        if (newId) setPlanId(newId);
        setInfo(`Plan for ${year} saved.`);
      }
    } catch (e) {
      setErr(String(e?.message || e));
    } finally {
      setSaving(false);
    }
  }

  /* ---------- Cell ops ---------- */
  function setCellModules(branch, month, modules) {
    setMatrix((prev) => {
      const next = { ...prev };
      next[branch] = { ...(prev[branch] || {}) };
      next[branch][month] = modules;
      return next;
    });
  }
  function toggleModuleInCell(branch, month, mod) {
    const cur = matrix?.[branch]?.[month] || [];
    const nxt = cur.includes(mod) ? cur.filter((x) => x !== mod) : [...cur, mod];
    setCellModules(branch, month, nxt);
  }
  function clearCell(branch, month) { setCellModules(branch, month, []); }
  function clearAll() {
    if (!window.confirm("Clear ALL cells in the matrix?")) return;
    setMatrix(buildEmptyMatrix());
  }
  function applyDefault() {
    if (!window.confirm("Apply default monthly focus to ALL branches? This overwrites the current plan.")) return;
    setMatrix(buildDefaultMatrix());
  }
  function fillEmptyWithDefault() {
    let changed = 0;
    setMatrix((prev) => {
      const next = {};
      for (const b of BRANCHES) {
        next[b.key] = {};
        for (const mo of MONTHS) {
          const cur = prev?.[b.key]?.[mo.i];
          if (Array.isArray(cur) && cur.length > 0) {
            next[b.key][mo.i] = cur;
          } else {
            next[b.key][mo.i] = [...(DEFAULT_MONTHLY_FOCUS[mo.i] || [])];
            changed += 1;
          }
        }
      }
      return next;
    });
    setInfo(`Filled ${changed} empty cell(s) with default modules — click Save to persist.`);
  }
  function copyMonthDown(month) {
    const opts = BRANCHES.map((b, i) => `${i + 1}) ${b.label}`).join("\n");
    const ans = window.prompt(`Copy ${MONTHS[month - 1].full} from which branch number?\n\n${opts}`, "1");
    const idx = Number(ans) - 1;
    if (!Number.isFinite(idx) || idx < 0 || idx >= BRANCHES.length) return;
    const src = matrix?.[BRANCHES[idx].key]?.[month] || [];
    setMatrix((prev) => {
      const next = { ...prev };
      for (const b of BRANCHES) {
        next[b.key] = { ...(prev[b.key] || {}) };
        next[b.key][month] = [...src];
      }
      return next;
    });
  }
  function copyBranchAcross(branchKey) {
    const ans = window.prompt(`Copy from which month (1-12)? It will overwrite all 12 months for this branch.`, "1");
    const m = Number(ans);
    if (!Number.isFinite(m) || m < 1 || m > 12) return;
    const src = matrix?.[branchKey]?.[m] || [];
    setMatrix((prev) => {
      const next = { ...prev };
      next[branchKey] = { ...(prev[branchKey] || {}) };
      for (const mo of MONTHS) next[branchKey][mo.i] = [...src];
      return next;
    });
  }

  function handlePrint() {
    setTimeout(() => window.print(), 80);
  }

  /* ---------- Stats (plan vs actual) ---------- */
  const stats = useMemo(() => {
    let plannedItems = 0, deliveredItems = 0, missingItems = 0, extraItems = 0;
    let cellsTotal = 0, cellsFilled = 0;
    let monthsPast = 0;
    const now = new Date();
    const isThisYear = Number(year) === now.getFullYear();

    for (const b of BRANCHES) {
      for (const mo of MONTHS) {
        cellsTotal += 1;
        const planned = matrix?.[b.key]?.[mo.i] || [];
        if (planned.length > 0) cellsFilled += 1;

        // only count missing for past/current months when in current year
        const isPastOrCurrent = !isThisYear || mo.i <= now.getMonth() + 1;
        if (isPastOrCurrent) monthsPast += 1;

        const st = cellStatus(b.key, mo.i);
        plannedItems += st.planned.length;
        deliveredItems += st.delivered.length;
        if (isPastOrCurrent) missingItems += st.missing.length;
        extraItems += st.extras.length;
      }
    }
    const coverage = plannedItems ? Math.round((deliveredItems / plannedItems) * 100) : 0;
    return {
      cellsTotal, cellsFilled,
      plannedItems, deliveredItems, missingItems, extraItems,
      coverage,
      sessionsCount: sessions.length,
    };
  }, [matrix, deliveryIndex, sessions, year]); // eslint-disable-line react-hooks/exhaustive-deps

  /* ===================== Styles ===================== */
  const pageStyle = {
    minHeight: "100vh",
    width: "100vw",
    maxWidth: "100%",
    background: `radial-gradient(1200px 600px at 10% -10%, rgba(99,102,241,0.35), transparent 60%),
                 radial-gradient(900px 500px at 110% 10%, rgba(14,165,233,0.30), transparent 60%),
                 linear-gradient(180deg, ${C.bg0} 0%, ${C.bg2} 100%)`,
    padding: "12px 14px 18px",
    boxSizing: "border-box",
    direction: "ltr",
    fontFamily: "Cairo, system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif",
    display: "flex",
    flexDirection: "column",
    gap: 12,
  };

  const cellModuleChip = (m) => {
    const isOHS = m.startsWith("OHS:");
    return {
      display: "inline-flex",
      alignItems: "center",
      gap: 4,
      padding: "3px 8px",
      borderRadius: 999,
      fontSize: 11,
      fontWeight: 800,
      background: isOHS ? "#fff7ed" : "#eef2ff",
      color: isOHS ? "#9a3412" : "#3730a3",
      border: `1px solid ${isOHS ? "#fed7aa" : "#c7d2fe"}`,
      whiteSpace: "nowrap",
      lineHeight: 1.4,
      maxWidth: "100%",
      overflow: "hidden",
      textOverflow: "ellipsis",
    };
  };

  const monthIsCurrent = (mi) => mi === new Date().getMonth() + 1 && Number(year) === currentYear;

  return (
    <div style={pageStyle}>
      {/* ========= Print CSS ========= */}
      <style>{`
        @media print {
          body { background: white !important; }
          .no-print { display: none !important; }
          .print-area { box-shadow: none !important; border: none !important; padding: 0 !important; background: white !important; }
          .plan-table { font-size: 10px !important; }
          .plan-table td, .plan-table th { padding: 4px !important; }
          @page { size: A3 landscape; margin: 8mm; }
        }
        .row-hover:hover .row-bar { opacity: 1 !important; }
        .cell-btn:hover {
          outline: 2px solid rgba(56,189,248,0.55);
          outline-offset: -3px;
          filter: brightness(1.02);
        }
      `}</style>

      {/* ========= TOP BAR (full width) ========= */}
      <div className="no-print" style={{
        background: "rgba(255,255,255,0.06)",
        border: "1px solid rgba(255,255,255,0.10)",
        borderRadius: 16,
        padding: "10px 14px",
        backdropFilter: "blur(10px)",
        display: "flex",
        gap: 12,
        alignItems: "center",
        flexWrap: "wrap",
        color: "#fff",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{
            width: 44, height: 44, borderRadius: 12,
            background: "linear-gradient(135deg,#06b6d4,#6366f1)",
            display: "grid", placeItems: "center", fontSize: 22,
            boxShadow: "0 8px 20px rgba(99,102,241,0.45)",
          }}>📅</div>
          <div>
            <div style={{ fontSize: 18, fontWeight: 1000, letterSpacing: 0.3 }}>
              Annual Training Plan
            </div>
            <div style={{ fontSize: 12, color: "#cbd5e1", fontWeight: 700 }}>
              Branches × Months · click any cell to edit modules
            </div>
          </div>
        </div>

        <div style={{ flex: 1 }} />

        {/* Year selector */}
        <div style={{
          display: "flex",
          alignItems: "center",
          gap: 4,
          background: "rgba(255,255,255,0.10)",
          padding: 4,
          borderRadius: 12,
          border: "1px solid rgba(255,255,255,0.15)",
        }}>
          <button
            onClick={() => setYear((y) => y - 1)}
            style={{ ...btn("rgba(255,255,255,0.10)", "#fff"), padding: "6px 10px", boxShadow: "none" }}
            title="Previous year"
          >‹</button>
          <select
            value={year}
            onChange={(e) => setYear(Number(e.target.value))}
            style={{ ...inputSt, fontWeight: 1000, fontSize: 14, padding: "6px 8px", color: C.ink, minWidth: 96 }}
          >
            {[currentYear - 1, currentYear, currentYear + 1, currentYear + 2].map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
          <button
            onClick={() => setYear((y) => y + 1)}
            style={{ ...btn("rgba(255,255,255,0.10)", "#fff"), padding: "6px 10px", boxShadow: "none" }}
            title="Next year"
          >›</button>
        </div>

        {/* Stats — plan vs actual */}
        <div style={{
          display: "flex", alignItems: "stretch", gap: 0,
          padding: 0,
          background: "rgba(255,255,255,0.08)",
          border: "1px solid rgba(255,255,255,0.12)",
          borderRadius: 12,
          fontSize: 11, fontWeight: 800,
          overflow: "hidden",
        }}>
          <StatBlock label="Planned" value={stats.plannedItems} color="#bfdbfe" />
          <StatBlock label="Delivered" value={stats.deliveredItems} color="#a7f3d0" />
          <StatBlock label="Missing" value={stats.missingItems} color="#fecaca" highlight={stats.missingItems > 0} />
          <StatBlock label="Extra" value={stats.extraItems} color="#fde68a" />
          <div style={{
            display: "flex", alignItems: "center", gap: 6,
            padding: "8px 14px",
            background: "linear-gradient(135deg,#10b981,#059669)",
            color: "#fff",
            fontWeight: 1000,
            fontSize: 13,
          }}>
            <span style={{ fontSize: 10, opacity: 0.85, letterSpacing: 0.5 }}>COVERAGE</span>
            <span>{stats.coverage}%</span>
          </div>
        </div>

        {/* Toggle: show actual */}
        <label style={{
          display: "flex", alignItems: "center", gap: 6,
          padding: "8px 12px",
          background: "rgba(255,255,255,0.08)",
          border: "1px solid rgba(255,255,255,0.12)",
          borderRadius: 12,
          fontSize: 11, fontWeight: 800,
          cursor: "pointer",
        }} title="Show / hide delivery status on cells">
          <input
            type="checkbox"
            checked={showActual}
            onChange={(e) => setShowActual(e.target.checked)}
            style={{ accentColor: "#10b981" }}
          />
          <span>Link to actual sessions</span>
        </label>

        <button onClick={applyDefault} style={btn("#f59e0b")} title="Apply default monthly focus to ALL cells (overwrites)">
          ✨ Apply Default
        </button>
        <button onClick={fillEmptyWithDefault} style={btn("#10b981")} title="Fill ONLY empty cells with default — keeps filled cells">
          🌱 Fill Empty
        </button>
        <button onClick={clearAll} style={btn("#fee2e2", C.red)}>🗑 Clear</button>
        <button
          onClick={() => loadAll(year)}
          style={btn("rgba(255,255,255,0.14)", "#fff")}
          title="Reload plan and actual sessions"
        >🔄 Refresh</button>
        <button onClick={handlePrint} style={btn(C.purple)}>🖨 Print</button>
        <button
          onClick={handleSave}
          disabled={saving || loading}
          style={btn("linear-gradient(135deg,#10b981,#059669)", "#fff", saving || loading)}
          title={`Saves to ${REPORTS_URL} as type "${TYPE}"`}
        >
          {saving ? "Saving…" : planId ? "💾 Update" : "💾 Save"}
        </button>
        <button onClick={() => navigate(-1)} style={btn("rgba(255,255,255,0.14)", "#fff")}>↩ Back</button>
      </div>

      {/* Save location hint */}
      <div className="no-print" style={{
        fontSize: 10,
        color: "rgba(255,255,255,0.55)",
        fontWeight: 700,
        marginTop: -6,
        paddingLeft: 4,
      }}>
        💾 Saved online to{" "}
        <code style={{ background: "rgba(255,255,255,0.10)", padding: "1px 6px", borderRadius: 4, color: "#a5b4fc" }}>
          {API_BASE}/api/reports
        </code>{" "}
        · type <code style={{ color: "#fcd34d" }}>{TYPE}</code>{" "}
        · year <code style={{ color: "#86efac" }}>{year}</code>
        {planId && <> · plan id <code style={{ color: "#fda4af" }}>{String(planId).slice(0, 8)}…</code></>}
      </div>

      {/* ========= Status line ========= */}
      {(info || err || loading || (deliveryIndex.__unmatched > 0) || duplicateCount > 0) && (
        <div className="no-print" style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {loading && (
            <div style={statusPill("rgba(59,130,246,0.18)", "#bfdbfe")}>⏳ Loading from server…</div>
          )}
          {info && !err && (
            <div style={statusPill("rgba(16,185,129,0.18)", "#a7f3d0")}>✓ {info}</div>
          )}
          {err && (
            <div style={statusPill("rgba(220,38,38,0.18)", "#fecaca")}>✗ {err}</div>
          )}
          {deliveryIndex.__unmatched > 0 && (
            <button
              onClick={() => setShowUnmatched(true)}
              style={{
                ...statusPill("rgba(245,158,11,0.18)", "#fde68a"),
                cursor: "pointer",
                border: "1px solid rgba(253,230,138,0.5)",
              }}
              title="Click to see which sessions couldn't be matched"
            >
              ⚠ {deliveryIndex.__unmatched} session(s) couldn't be linked — click to view
            </button>
          )}
          {duplicateCount > 0 && (
            <div
              style={{
                ...statusPill("rgba(245,158,11,0.22)", "#fde68a"),
                display: "flex", alignItems: "center", gap: 8,
              }}
              title="Multiple saved plans found for this year — older versions may override newer ones."
            >
              ⚠ {duplicateCount} duplicate plan version(s) found for {year} — newest is loaded.
              <button
                onClick={cleanupDuplicates}
                style={{
                  background: "#dc2626", color: "#fff", border: "none",
                  borderRadius: 8, padding: "4px 10px", fontWeight: 900, fontSize: 11,
                  cursor: "pointer",
                }}
              >🗑 Delete old versions</button>
            </div>
          )}
        </div>
      )}

      {/* ========= MATRIX (full width / fills the screen) ========= */}
      {/* relative wrapper so we can overlay a loader */}
      <div
        className="print-area"
        style={{
          flex: 1,
          minHeight: 0,
          position: "relative",
          background: C.card,
          borderRadius: 16,
          boxShadow: "0 20px 60px rgba(2,6,23,0.35)",
          border: `1px solid ${C.line}`,
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}
      >
        {loading && (
          <div className="no-print" style={{
            position: "absolute", inset: 0,
            background: "rgba(255,255,255,0.85)",
            backdropFilter: "blur(2px)",
            zIndex: 50,
            display: "grid", placeItems: "center",
            color: C.navy, fontWeight: 1000, fontSize: 14,
          }}>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
              <div style={{
                width: 36, height: 36, borderRadius: "50%",
                border: `3px solid ${C.line}`, borderTopColor: C.blue,
                animation: "spin 0.7s linear infinite",
              }} />
              <div>Loading plan & actual sessions…</div>
              <div style={{ fontSize: 11, color: C.sub, fontWeight: 700 }}>Fetching latest from server</div>
            </div>
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
          </div>
        )}
        {/* Header band */}
        <div style={{
          padding: "10px 14px",
          background: "linear-gradient(135deg,#0f172a,#1e293b)",
          color: "#fff",
          display: "flex",
          gap: 10,
          alignItems: "center",
          flexWrap: "wrap",
          borderBottom: `1px solid ${C.line}`,
        }}>
          <div style={{ fontWeight: 1000, fontSize: 15, letterSpacing: 0.3 }}>
            Annual Training Plan
          </div>
          <div style={{ fontSize: 13, color: "#cbd5e1", fontWeight: 800 }}>· {year}</div>
          <div style={{ flex: 1 }} />
          <div style={{ display: "flex", gap: 12, fontSize: 11, color: "#cbd5e1", fontWeight: 800, flexWrap: "wrap" }}>
            <span><span style={{ ...cellModuleChip("Personnel Hygiene"), padding: "1px 8px" }}>Food Safety</span></span>
            <span><span style={{ ...cellModuleChip("OHS:"), padding: "1px 8px" }}>OHS</span></span>
          </div>
        </div>

        {/* Table area — fills remaining height */}
        <div style={{ flex: 1, minHeight: 0, overflow: "auto" }}>
          <table className="plan-table" style={{
            width: "100%",
            height: "100%",
            borderCollapse: "separate",
            borderSpacing: 0,
            tableLayout: "fixed",
          }}>
            <colgroup>
              <col style={{ width: 200 }} />
              {MONTHS.map((mo) => (
                <col key={mo.i} />
              ))}
            </colgroup>
            <thead>
              <tr>
                <th style={{
                  ...thBase,
                  position: "sticky",
                  left: 0,
                  top: 0,
                  zIndex: 4,
                  textAlign: "left",
                  paddingLeft: 14,
                  background: "linear-gradient(180deg,#0f172a,#1e293b)",
                  borderRight: `2px solid ${C.line2}`,
                }}>Branch</th>
                {MONTHS.map((mo) => (
                  <th
                    key={mo.i}
                    style={{
                      ...thBase,
                      position: "sticky",
                      top: 0,
                      zIndex: 3,
                      background: monthIsCurrent(mo.i)
                        ? "linear-gradient(180deg,#1d4ed8,#1e3a8a)"
                        : "linear-gradient(180deg,#0f172a,#1e293b)",
                    }}
                  >
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
                      <span style={{ fontSize: 13, fontWeight: 1000, letterSpacing: 0.4 }}>{mo.short}</span>
                      <button
                        className="no-print"
                        onClick={() => copyMonthDown(mo.i)}
                        title="Copy this month from one branch to all"
                        style={{
                          ...btn("rgba(255,255,255,0.10)", "#fff"),
                          padding: "1px 7px",
                          fontSize: 10,
                          fontWeight: 700,
                          boxShadow: "none",
                        }}
                      >⇣ copy</button>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {BRANCHES.map((b, idx) => (
                <tr
                  key={b.key}
                  className="row-hover"
                  style={{ background: idx % 2 ? C.band : "#fff" }}
                >
                  <td style={{
                    ...tdBase,
                    position: "sticky",
                    left: 0,
                    background: idx % 2 ? C.band2 : "#fff",
                    borderRight: `2px solid ${C.line2}`,
                    zIndex: 2,
                    minWidth: 200,
                  }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 6 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
                        <div style={{
                          width: 32, height: 32, borderRadius: 10,
                          background: "linear-gradient(135deg,#0ea5e9,#6366f1)",
                          display: "grid", placeItems: "center", color: "#fff", fontSize: 16,
                          boxShadow: "0 4px 12px rgba(99,102,241,0.30)", flexShrink: 0,
                        }}>{b.icon}</div>
                        <div style={{ fontWeight: 1000, color: C.navy, fontSize: 13, lineHeight: 1.2, minWidth: 0 }}>
                          {b.label}
                        </div>
                      </div>
                      <button
                        className="row-bar no-print"
                        onClick={() => copyBranchAcross(b.key)}
                        title="Copy one month across all months for this branch"
                        style={{
                          ...btn("#fff", C.sub),
                          padding: "3px 7px",
                          fontSize: 10,
                          border: `1px solid ${C.line}`,
                          opacity: 0,
                          transition: "opacity .15s",
                          boxShadow: "none",
                        }}
                      >⇢ copy</button>
                    </div>
                  </td>

                  {MONTHS.map((mo) => {
                    const cell = matrix?.[b.key]?.[mo.i] || [];
                    const isEditing = editor && editor.branch === b.key && editor.month === mo.i;
                    const isCurrent = monthIsCurrent(mo.i);
                    const st = cellStatus(b.key, mo.i);
                    const monthIsPastOrCurrent =
                      Number(year) < currentYear ||
                      (Number(year) === currentYear && mo.i <= new Date().getMonth() + 1);

                    // determine cell-level status color/border
                    let statusBorder = `1px dashed ${cell.length === 0 ? C.line2 : "transparent"}`;
                    let statusBg = isEditing ? C.blueBg : (cell.length === 0 ? "transparent" : "#fff");
                    let statusBadge = null;

                    if (showActual) {
                      if (st.planned.length > 0 && st.missing.length === 0 && st.delivered.length === st.planned.length) {
                        // fully delivered
                        statusBorder = `2px solid #10b981`;
                        statusBg = isEditing ? C.blueBg : "#ecfdf5";
                        statusBadge = { text: "✓", color: "#fff", bg: "#10b981", title: "All planned trainings delivered" };
                      } else if (st.planned.length > 0 && st.delivered.length > 0 && st.missing.length > 0) {
                        // partial
                        statusBorder = `2px solid #f59e0b`;
                        statusBg = isEditing ? C.blueBg : "#fffbeb";
                        statusBadge = { text: `${st.delivered.length}/${st.planned.length}`, color: "#fff", bg: "#f59e0b", title: "Partially delivered" };
                      } else if (st.planned.length > 0 && st.missing.length > 0 && st.delivered.length === 0 && monthIsPastOrCurrent) {
                        // missing (only flag for past/current months)
                        statusBorder = `2px solid #dc2626`;
                        statusBg = isEditing ? C.blueBg : "#fef2f2";
                        statusBadge = { text: "✗", color: "#fff", bg: "#dc2626", title: "Planned but no session delivered" };
                      } else if (st.planned.length === 0 && st.extras.length > 0) {
                        // delivered but unplanned
                        statusBorder = `2px dashed #6366f1`;
                        statusBg = isEditing ? C.blueBg : "#eef2ff";
                        statusBadge = { text: "+", color: "#fff", bg: "#6366f1", title: "Delivered (unplanned)" };
                      }
                    }

                    if (isEditing) statusBorder = `2px solid ${C.blue}`;

                    return (
                      <td key={mo.i} style={{ ...tdBase, padding: 4, background: isCurrent ? "rgba(59,130,246,0.04)" : "transparent" }}>
                        <button
                          className="cell-btn"
                          onClick={() => setEditor({ branch: b.key, month: mo.i })}
                          style={{
                            position: "relative",
                            width: "100%",
                            height: "100%",
                            minHeight: 80,
                            display: "flex",
                            flexDirection: "column",
                            alignItems: "stretch",
                            justifyContent: (cell.length === 0 && st.extras.length === 0) ? "center" : "flex-start",
                            gap: 3,
                            padding: "6px 7px",
                            borderRadius: 10,
                            border: statusBorder,
                            background: statusBg,
                            cursor: "pointer",
                            transition: "all .12s",
                            textAlign: "left",
                          }}
                        >
                          {/* status badge top-right */}
                          {statusBadge && (
                            <span
                              title={statusBadge.title}
                              style={{
                                position: "absolute",
                                top: -7, right: -7,
                                background: statusBadge.bg,
                                color: statusBadge.color,
                                fontSize: 10,
                                fontWeight: 1000,
                                minWidth: 18, height: 18,
                                padding: "0 5px",
                                borderRadius: 999,
                                display: "grid", placeItems: "center",
                                boxShadow: "0 2px 6px rgba(0,0,0,0.2)",
                                border: "1.5px solid #fff",
                                zIndex: 1,
                                letterSpacing: 0,
                              }}
                            >{statusBadge.text}</span>
                          )}

                          {cell.length === 0 && st.extras.length === 0 ? (
                            <span style={{ color: C.muted, fontStyle: "italic", fontSize: 11, fontWeight: 700, textAlign: "center" }}>
                              + click to add
                            </span>
                          ) : (
                            <div style={{ display: "flex", flexWrap: "wrap", gap: 3 }}>
                              {cell.map((m) => {
                                const delivered = showActual && st.delivered.some((d) => normalizeModule(d) === normalizeModule(m));
                                return (
                                  <span
                                    key={m}
                                    style={{
                                      ...cellModuleChip(m),
                                      ...(showActual && delivered
                                        ? { background: "#dcfce7", color: "#14532d", borderColor: "#86efac" }
                                        : showActual && st.missing.some((mm) => normalizeModule(mm) === normalizeModule(m)) && monthIsPastOrCurrent
                                        ? { background: "#fee2e2", color: "#7f1d1d", borderColor: "#fca5a5", textDecoration: "line-through dotted" }
                                        : {}),
                                    }}
                                    title={
                                      delivered ? `${m} — delivered ✓`
                                      : showActual && st.missing.some((mm) => normalizeModule(mm) === normalizeModule(m)) && monthIsPastOrCurrent
                                      ? `${m} — planned, NOT delivered`
                                      : m
                                    }
                                  >
                                    {showActual && delivered ? "✓ " : ""}
                                    {m.length > 18 ? m.slice(0, 16) + "…" : m}
                                  </span>
                                );
                              })}
                              {showActual && st.extras.map((m) => (
                                <span
                                  key={"extra-" + m}
                                  style={{
                                    ...cellModuleChip(m),
                                    background: "#eef2ff",
                                    color: "#3730a3",
                                    borderColor: "#a5b4fc",
                                    borderStyle: "dashed",
                                  }}
                                  title={`${m} — delivered but NOT in plan`}
                                >
                                  + {m.length > 16 ? m.slice(0, 14) + "…" : m}
                                </span>
                              ))}
                            </div>
                          )}
                        </button>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Footer band — legend + quick stats */}
        <div style={{
          padding: "10px 14px",
          background: C.band,
          borderTop: `1px solid ${C.line}`,
          display: "flex",
          gap: 16,
          flexWrap: "wrap",
          alignItems: "center",
          fontSize: 11,
          color: C.sub,
          fontWeight: 700,
        }}>
          <span style={legendChip("#10b981", "#ecfdf5")}><b>✓</b> Fully delivered</span>
          <span style={legendChip("#f59e0b", "#fffbeb")}><b>⚡</b> Partial (some modules done)</span>
          <span style={legendChip("#dc2626", "#fef2f2")}><b>✗</b> Planned but missing</span>
          <span style={legendChip("#6366f1", "#eef2ff", true)}><b>+</b> Delivered (unplanned)</span>
          <span style={{ marginLeft: "auto", display: "flex", gap: 14 }}>
            <span>🗓 {sessions.length} actual session(s) in {year}</span>
            <span>Built by Eng. Mohammed Abdullah</span>
          </span>
        </div>
      </div>

      {/* ========= Editor Drawer ========= */}
      {editor && (
        <div
          className="no-print"
          onClick={(e) => { if (e.target === e.currentTarget) setEditor(null); }}
          style={{
            position: "fixed", inset: 0,
            background: "rgba(2,6,23,0.65)",
            backdropFilter: "blur(4px)",
            display: "flex",
            alignItems: "stretch",
            justifyContent: "flex-end",
            zIndex: 1000,
          }}
        >
          <div style={{
            width: "100%",
            maxWidth: 480,
            height: "100vh",
            background: "#fff",
            boxShadow: "-20px 0 60px rgba(0,0,0,0.4)",
            display: "flex",
            flexDirection: "column",
          }}>
            {/* Header */}
            <div style={{
              padding: "16px 18px",
              background: "linear-gradient(135deg,#0f172a,#1e293b)",
              color: "#fff",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              gap: 8,
            }}>
              <div>
                <div style={{ fontSize: 11, fontWeight: 800, color: "#94a3b8", letterSpacing: 0.4, textTransform: "uppercase" }}>
                  Edit Cell
                </div>
                <div style={{ fontWeight: 1000, fontSize: 16, marginTop: 2 }}>
                  {BRANCHES.find((x) => x.key === editor.branch)?.label || editor.branch}
                </div>
                <div style={{ fontSize: 13, color: "#cbd5e1", fontWeight: 800, marginTop: 1 }}>
                  {MONTHS[editor.month - 1].full} · {year}
                </div>
              </div>
              <button onClick={() => setEditor(null)} style={btn("rgba(255,255,255,0.14)", "#fff")}>✕</button>
            </div>

            {/* Quick actions */}
            <div style={{ padding: "10px 18px", display: "flex", gap: 6, flexWrap: "wrap", borderBottom: `1px solid ${C.line}` }}>
              <button onClick={() => clearCell(editor.branch, editor.month)} style={btn("#fee2e2", C.red)}>
                Clear cell
              </button>
              <button
                onClick={() => setCellModules(editor.branch, editor.month, [...(DEFAULT_MONTHLY_FOCUS[editor.month] || [])])}
                style={btn(C.amberBg, C.amber)}
                title="Use default focus for this month"
              >Use month default</button>
              <div style={{ flex: 1 }} />
              <button
                onClick={() => navigate("/training/sessions")}
                style={btn(C.purpleBg, C.purple)}
                title="Open Training Library"
              >📚 Sessions</button>
            </div>

            {/* ===== Actual sessions for this cell ===== */}
            {(() => {
              const st = cellStatus(editor.branch, editor.month);
              return (
                <div style={{
                  padding: "12px 18px",
                  borderBottom: `1px solid ${C.line}`,
                  background: "#f8fafc",
                }}>
                  <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 8 }}>
                    <span style={{ fontSize: 11, fontWeight: 800, color: C.sub, letterSpacing: 0.4, textTransform: "uppercase" }}>
                      Actual Sessions This Month
                    </span>
                    <span style={{
                      background: st.sessionsAll.length > 0 ? "#dcfce7" : "#f3f4f6",
                      color: st.sessionsAll.length > 0 ? "#14532d" : "#6b7280",
                      fontSize: 11, fontWeight: 1000,
                      padding: "2px 8px", borderRadius: 999,
                    }}>{st.sessionsAll.length}</span>
                  </div>

                  {/* Coverage summary for this cell */}
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 8 }}>
                    <MiniStat label="Planned" value={st.planned.length} bg="#dbeafe" fg="#1e40af" />
                    <MiniStat label="Delivered" value={st.delivered.length} bg="#dcfce7" fg="#14532d" />
                    <MiniStat label="Missing" value={st.missing.length} bg={st.missing.length ? "#fee2e2" : "#f3f4f6"} fg={st.missing.length ? "#7f1d1d" : "#6b7280"} />
                    <MiniStat label="Extra" value={st.extras.length} bg={st.extras.length ? "#ede9fe" : "#f3f4f6"} fg={st.extras.length ? "#5b21b6" : "#6b7280"} />
                  </div>

                  {/* Sessions list */}
                  {st.sessionsAll.length === 0 ? (
                    <div style={{ fontSize: 12, color: C.muted, fontStyle: "italic", padding: "6px 0" }}>
                      No sessions delivered for this branch in {MONTHS[editor.month - 1].full}.
                    </div>
                  ) : (
                    <div style={{ display: "grid", gap: 6, maxHeight: 180, overflow: "auto" }}>
                      {st.sessionsAll.map((s, i) => {
                        const mod = sessionModule(s) || "(unspecified)";
                        const ttl = sessionTitle(s);
                        const d = sessionDate(s);
                        const inPlan = st.planned.some((p) => normalizeModule(p) === normalizeModule(mod));
                        return (
                          <div key={getId(s) || i} style={{
                            border: `1px solid ${inPlan ? "#86efac" : "#c7d2fe"}`,
                            background: inPlan ? "#f0fdf4" : "#eef2ff",
                            borderRadius: 8,
                            padding: "6px 10px",
                            fontSize: 12,
                            display: "flex",
                            gap: 8,
                            alignItems: "center",
                            justifyContent: "space-between",
                          }}>
                            <div style={{ minWidth: 0, flex: 1 }}>
                              <div style={{ fontWeight: 900, color: inPlan ? "#14532d" : "#3730a3", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                {inPlan ? "✓" : "+"} {mod}
                              </div>
                              {ttl && (
                                <div style={{ fontSize: 11, color: C.sub, fontWeight: 700, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                  {ttl}
                                </div>
                              )}
                            </div>
                            <span style={{ fontSize: 10, fontWeight: 800, color: C.sub, whiteSpace: "nowrap" }}>
                              {fmtDate(d)}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {st.missing.length > 0 && (
                    <div style={{ marginTop: 8, padding: "6px 10px", background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 8, fontSize: 11, color: "#7f1d1d", fontWeight: 800 }}>
                      ⚠ Missing: {st.missing.join(" · ")}
                    </div>
                  )}
                </div>
              );
            })()}

            {/* Modules list */}
            <div style={{ flex: 1, minHeight: 0, overflow: "auto", padding: "12px 18px" }}>
              <div style={{ fontSize: 11, fontWeight: 800, color: C.sub, letterSpacing: 0.4, textTransform: "uppercase", marginBottom: 8 }}>
                Select Training Modules
              </div>
              <div style={{ display: "grid", gap: 6 }}>
                {MODULES.map((m) => {
                  const checked = (matrix?.[editor.branch]?.[editor.month] || []).includes(m);
                  const isOHS = m.startsWith("OHS:");
                  const stMod = cellStatus(editor.branch, editor.month);
                  const wasDelivered = stMod.sessionsByModule.has(normalizeModule(m));
                  return (
                    <label
                      key={m}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 10,
                        padding: "10px 12px",
                        borderRadius: 10,
                        border: `1px solid ${checked ? (isOHS ? "#fb923c" : C.blue) : C.line}`,
                        background: checked ? (isOHS ? "#fff7ed" : C.blueBg) : "#fff",
                        cursor: "pointer",
                        fontSize: 13,
                        fontWeight: checked ? 900 : 700,
                        color: C.ink,
                        transition: "all .12s",
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleModuleInCell(editor.branch, editor.month, m)}
                        style={{ width: 18, height: 18, accentColor: isOHS ? "#ea580c" : C.blue, flexShrink: 0 }}
                      />
                      <span style={{ flex: 1 }}>{m}</span>
                      {wasDelivered && (
                        <span style={{ fontSize: 9, fontWeight: 1000, color: "#fff", background: "#10b981", padding: "2px 7px", borderRadius: 999 }}
                          title="A session for this module was delivered this month">
                          ✓ DELIVERED
                        </span>
                      )}
                      {isOHS && (
                        <span style={{ fontSize: 9, fontWeight: 900, color: "#9a3412", background: "#ffedd5", padding: "2px 6px", borderRadius: 999 }}>
                          OHS
                        </span>
                      )}
                    </label>
                  );
                })}
              </div>
            </div>

            {/* Footer hint */}
            <div style={{
              padding: "10px 18px",
              borderTop: `1px solid ${C.line}`,
              background: C.band,
              fontSize: 11,
              color: C.sub,
              fontWeight: 700,
            }}>
              💡 Changes are kept locally — click <b style={{ color: C.green }}>Save</b> on top to persist online.
            </div>
          </div>
        </div>
      )}

      {/* ========= Unmatched Sessions Popup ========= */}
      {showUnmatched && (
        <div
          className="no-print"
          onClick={(e) => { if (e.target === e.currentTarget) setShowUnmatched(false); }}
          style={{
            position: "fixed", inset: 0,
            background: "rgba(2,6,23,0.65)",
            backdropFilter: "blur(4px)",
            display: "grid",
            placeItems: "center",
            zIndex: 1000,
            padding: 14,
          }}
        >
          <div style={{
            width: "100%", maxWidth: 640, maxHeight: "85vh",
            background: "#fff", borderRadius: 16,
            boxShadow: "0 20px 60px rgba(0,0,0,0.4)",
            display: "flex", flexDirection: "column", overflow: "hidden",
          }}>
            <div style={{
              padding: "14px 18px",
              background: "linear-gradient(135deg,#b45309,#d97706)",
              color: "#fff",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}>
              <div>
                <div style={{ fontSize: 11, fontWeight: 800, opacity: 0.85, letterSpacing: 0.4, textTransform: "uppercase" }}>
                  Unmatched Sessions
                </div>
                <div style={{ fontWeight: 1000, fontSize: 16, marginTop: 2 }}>
                  {deliveryIndex.__unmatched} session(s) couldn't be linked to any branch
                </div>
              </div>
              <button onClick={() => setShowUnmatched(false)} style={btn("rgba(255,255,255,0.18)", "#fff")}>✕</button>
            </div>

            <div style={{ padding: "14px 18px", flex: 1, overflow: "auto" }}>
              <div style={{ fontSize: 12, color: C.sub, fontWeight: 700, marginBottom: 10 }}>
                These trainings were saved with a branch name that doesn't match any of the 8 branches in this table.
                Either edit the session in the Training Library, or tell me the exact name and I'll add it as an alias.
              </div>
              <div style={{ display: "grid", gap: 8 }}>
                {(deliveryIndex.__unmatchedList || []).map((s, i) => {
                  const id = getId(s);
                  const branchName = sessionBranch(s) || "(empty branch)";
                  const mod = sessionModule(s) || "(no module)";
                  const ttl = sessionTitle(s);
                  const d = sessionDate(s);
                  return (
                    <div key={id || i} style={{
                      padding: "10px 12px",
                      borderRadius: 10,
                      border: "1px solid #fde68a",
                      background: "#fffbeb",
                      display: "flex",
                      flexDirection: "column",
                      gap: 4,
                    }}>
                      <div style={{ display: "flex", gap: 8, alignItems: "center", justifyContent: "space-between" }}>
                        <span style={{
                          fontSize: 11, fontWeight: 1000, color: "#92400e",
                          background: "#fef3c7", padding: "2px 8px", borderRadius: 999,
                          letterSpacing: 0.3,
                        }}>
                          BRANCH: "{branchName}"
                        </span>
                        <span style={{ fontSize: 10, fontWeight: 800, color: C.sub }}>
                          {fmtDate(d) || "no date"}
                        </span>
                      </div>
                      <div style={{ fontWeight: 900, color: C.ink, fontSize: 13 }}>
                        📚 {mod}
                      </div>
                      {ttl && (
                        <div style={{ fontSize: 11, color: C.sub, fontWeight: 700 }}>
                          {ttl}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            <div style={{
              padding: "12px 18px",
              borderTop: `1px solid ${C.line}`,
              background: C.band,
              display: "flex",
              gap: 8,
              alignItems: "center",
              flexWrap: "wrap",
            }}>
              <span style={{ fontSize: 11, color: C.sub, fontWeight: 700 }}>
                💡 Tip: Edit the session's branch name in the Training Library to fix the link.
              </span>
              <div style={{ flex: 1 }} />
              <button onClick={() => navigate("/training/sessions")} style={btn(C.purple)}>
                📚 Open Library
              </button>
              <button onClick={() => setShowUnmatched(false)} style={btn("#e2e8f0", "#334155")}>Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ===================== Helpers ===================== */
function statusPill(bg, color) {
  return {
    background: bg,
    color,
    border: `1px solid ${color}40`,
    padding: "6px 12px",
    borderRadius: 999,
    fontSize: 12,
    fontWeight: 800,
  };
}

function StatBlock({ label, value, color, highlight }) {
  return (
    <div style={{
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      padding: "6px 12px",
      borderRight: "1px solid rgba(255,255,255,0.10)",
      background: highlight ? "rgba(220,38,38,0.18)" : "transparent",
      minWidth: 64,
    }}>
      <span style={{ fontSize: 16, fontWeight: 1000, color, lineHeight: 1.1 }}>{value}</span>
      <span style={{ fontSize: 9, fontWeight: 800, color: "#cbd5e1", letterSpacing: 0.4, textTransform: "uppercase", marginTop: 2 }}>
        {label}
      </span>
    </div>
  );
}

function MiniStat({ label, value, bg, fg }) {
  return (
    <div style={{
      background: bg,
      color: fg,
      padding: "4px 10px",
      borderRadius: 8,
      fontSize: 11,
      fontWeight: 900,
      display: "flex",
      gap: 6,
      alignItems: "center",
    }}>
      <span style={{ fontSize: 13 }}>{value}</span>
      <span style={{ fontSize: 9, opacity: 0.85, textTransform: "uppercase", letterSpacing: 0.3 }}>{label}</span>
    </div>
  );
}

function legendChip(color, bg, dashed = false) {
  return {
    display: "inline-flex",
    gap: 6,
    alignItems: "center",
    padding: "4px 10px",
    borderRadius: 8,
    border: `${dashed ? "1.5px dashed" : "1.5px solid"} ${color}`,
    background: bg,
    color,
    fontWeight: 800,
    fontSize: 11,
  };
}

const thBase = {
  color: "#fff",
  fontWeight: 1000,
  fontSize: 12,
  padding: "10px 6px",
  textAlign: "center",
  letterSpacing: 0.3,
};
const tdBase = {
  padding: 6,
  borderBottom: `1px solid ${"#e2e8f0"}`,
  borderRight: `1px solid ${"#eef2f7"}`,
  verticalAlign: "stretch",
};
