// src/companies/exaltis/training/TrainingAnnualPlan.jsx
import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "./nav";
import { useGlobalLang } from "./TrainingSessionsList.helpers";
import API_BASE from "../../../config/api";
import { REPORTS_URL, TYPE, planTimestamp, listPlans, listSessions, createPlan, updatePlan, getId } from "./annualPlan/planApi";
import { sessionDate, sessionBranch, sessionModule, moduleMatchKey, normalizeBranch, BRANCHES, branchAliases, matchBranchFromList, makeDynamicBranch, MONTHS, DEFAULT_MONTHLY_FOCUS, buildEmptyMatrix, buildDefaultMatrix } from "./annualPlan/planModel";
import { statusPill } from "./annualPlan/planUi";
import { UnmatchedSessionsPopup } from "./annualPlan/UnmatchedSessionsPopup";
import { CellEditorDrawer } from "./annualPlan/CellEditorDrawer";
import { PlanTopBar } from "./annualPlan/PlanTopBar";
import { PlanPrintCss } from "./annualPlan/PlanPrintCss";
import { PlanMatrix } from "./annualPlan/PlanMatrix";

/* ===================== Component ===================== */
export default function TrainingAnnualPlan() {
  const navigate = useNavigate();
  const [globalLang] = useGlobalLang();

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
          for (const [branchKey, months] of Object.entries(m)) {
            if (merged[branchKey] || !months || typeof months !== "object") continue;
            merged[branchKey] = {};
            for (const mo of MONTHS) {
              const v = months?.[mo.i] ?? months?.[String(mo.i)];
              merged[branchKey][mo.i] = Array.isArray(v) ? v.filter(Boolean) : [];
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

  const displayBranches = useMemo(() => {
    const byKey = new Map(BRANCHES.map((b) => [b.key, b]));
    const addBranch = (rawBranch) => {
      const name = String(rawBranch || "").trim();
      if (!name) return;
      const existingKey = matchBranchFromList(name, Array.from(byKey.values()));
      if (existingKey) return;
      byKey.set(name, makeDynamicBranch(name));
    };

    for (const key of Object.keys(matrix || {})) addBranch(key);
    for (const s of sessions || []) addBranch(sessionBranch(s));
    return Array.from(byKey.values());
  }, [matrix, sessions]);

  /* ---------- Build delivery index from actual sessions ---------- *
   * Index: { [branchKey]: { [month]: { delivered: Map<moduleNorm, sessions[]>, all: sessions[] } } }
   * --------------------------------------------------------------- */
  const branchKeys = useMemo(() => displayBranches.map((b) => b.key), [displayBranches]);
  const branchKeyByLower = useMemo(() => {
    const m = new Map();
    for (const b of displayBranches) {
      for (const a of branchAliases(b)) m.set(normalizeBranch(a), b.key);
    }
    return m;
  }, [displayBranches]);

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
      const key = moduleMatchKey(mod);
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
    const plannedKeys = new Set(planned.map(moduleMatchKey));
    const delivered = planned.filter((p) => deliveredKeys.has(moduleMatchKey(p)));
    const missing = planned.filter((p) => !deliveredKeys.has(moduleMatchKey(p)));
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
  function buildDisplayMatrix(withDefaults = false) {
    const next = {};
    for (const b of displayBranches) {
      next[b.key] = {};
      for (const mo of MONTHS) {
        next[b.key][mo.i] = withDefaults ? [...(DEFAULT_MONTHLY_FOCUS[mo.i] || [])] : [];
      }
    }
    return next;
  }
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
    setMatrix(buildDisplayMatrix(false));
  }
  function applyDefault() {
    if (!window.confirm("Apply default monthly focus to ALL branches? This overwrites the current plan.")) return;
    setMatrix(buildDisplayMatrix(true));
  }
  function fillEmptyWithDefault() {
    let changed = 0;
    setMatrix((prev) => {
      const next = {};
      for (const b of displayBranches) {
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
    const opts = displayBranches.map((b, i) => `${i + 1}) ${b.label}`).join("\n");
    const ans = window.prompt(`Copy ${MONTHS[month - 1].full} from which branch number?\n\n${opts}`, "1");
    const idx = Number(ans) - 1;
    if (!Number.isFinite(idx) || idx < 0 || idx >= displayBranches.length) return;
    const src = matrix?.[displayBranches[idx].key]?.[month] || [];
    setMatrix((prev) => {
      const next = { ...prev };
      for (const b of displayBranches) {
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

    for (const b of displayBranches) {
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
  }, [matrix, deliveryIndex, sessions, year, displayBranches]); // eslint-disable-line react-hooks/exhaustive-deps

  /* ===================== Styles ===================== */
  const pageStyle = {
    minHeight: "100vh",
    width: "100vw",
    maxWidth: "100%",
    background: "linear-gradient(180deg,#f4f8f7 0%,#edf5f3 100%)",
    padding: "14px clamp(12px,2.4vw,28px) 22px",
    boxSizing: "border-box",
    direction: "ltr",
    fontFamily: "Cairo, Arial, sans-serif",
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
  const branchColWidth = 200;
  const monthColWidth = 112;
  const planRowHeight = 96;
  const tableMinWidth = branchColWidth + MONTHS.length * monthColWidth;

  return (
    <div className="training-annual-plan" style={pageStyle}>
      {/* ========= Print CSS ========= */}
      <PlanPrintCss />

      {/* ========= TOP BAR (full width) ========= */}
      <PlanTopBar setYear={setYear} year={year} currentYear={currentYear} stats={stats} showActual={showActual} setShowActual={setShowActual} applyDefault={applyDefault} fillEmptyWithDefault={fillEmptyWithDefault} clearAll={clearAll} loadAll={loadAll} handlePrint={handlePrint} handleSave={handleSave} saving={saving} loading={loading} planId={planId} navigate={navigate} />

      {/* Save location hint */}
      <div className="no-print" style={{
        fontSize: 10,
        color: "#000",
        fontWeight: 700,
        marginTop: -6,
        paddingLeft: 4,
      }}>
        💾 Saved online to{" "}
        <code style={{ background: "rgba(255,255,255,0.75)", padding: "1px 6px", borderRadius: 4, color: "#000" }}>
          {API_BASE}/api/reports
        </code>{" "}
        · type <code style={{ color: "#000" }}>{TYPE}</code>{" "}
        · year <code style={{ color: "#000" }}>{year}</code>
        {planId && <> · plan id <code style={{ color: "#000" }}>{String(planId).slice(0, 8)}…</code></>}
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
      <PlanMatrix loading={loading} year={year} cellModuleChip={cellModuleChip} tableMinWidth={tableMinWidth} branchColWidth={branchColWidth} monthColWidth={monthColWidth} monthIsCurrent={monthIsCurrent} copyMonthDown={copyMonthDown} displayBranches={displayBranches} planRowHeight={planRowHeight} copyBranchAcross={copyBranchAcross} matrix={matrix} editor={editor} cellStatus={cellStatus} currentYear={currentYear} showActual={showActual} setEditor={setEditor} globalLang={globalLang} sessions={sessions} />

      {/* ========= Editor Drawer ========= */}
      {editor && (
        <CellEditorDrawer setEditor={setEditor} displayBranches={displayBranches} editor={editor} year={year} clearCell={clearCell} setCellModules={setCellModules} navigate={navigate} cellStatus={cellStatus} matrix={matrix} toggleModuleInCell={toggleModuleInCell} globalLang={globalLang} />
      )}

      {/* ========= Unmatched Sessions Popup ========= */}
      {showUnmatched && (
        <UnmatchedSessionsPopup setShowUnmatched={setShowUnmatched} deliveryIndex={deliveryIndex} navigate={navigate} />
      )}
    </div>
  );
}

