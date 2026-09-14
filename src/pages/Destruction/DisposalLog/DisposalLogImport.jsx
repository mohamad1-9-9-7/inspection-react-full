// src/pages/Destruction/DisposalLog/DisposalLogImport.jsx
//
// استيراد سجل الإعدام من أودو — Import the Odoo Disposal Log.
//
// The store team exports this file from Odoo and prints it; QA imports it here
// so it can be reconciled against what the branches actually returned for
// destruction. It is stored on the server under its own type
// (`odoo_disposal_log`) — never merged into the returns or condemnation data.
//
//   step 1  pick the .xlsx / .csv file
//   step 2  confirm sheet + header row + column mapping (auto-detected)
//   step 3  WALK the file the way the returns browser is walked: a date tree
//           on the left, that day's lines on the right, with search, filters,
//           sorting, per-line and per-day delete, and an audit pass that
//           flags duplicates, unreadable dates and unmapped branches
//   step 4  save the month, then jump straight into the comparison
//
// Deleting here removes a line from THIS import only — the file on disk is
// never touched, and nothing is written to the server until Save.

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import API_BASE from "../../../config/api";
import { BRANCHES, OTHER_BRANCH } from "../destructionOptions";
import {
  TYPE,
  FIELDS,
  autoMapColumns,
  buildRows,
  detectHeaderRow,
  fmt3,
  formatDMY,
  getRecordId,
  mappingIsComplete,
  monthLabel,
  monthLabelAr,
  normalizeUom,
  num,
  recordPeriod,
  resolveOdooBranch,
  safeArr,
  summarizeRows,
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

/* ============================================================
   server
   ============================================================ */
async function fetchLogs() {
  const res = await fetch(`${API_BASE}/api/reports?type=${encodeURIComponent(TYPE)}&limit=5000`, {
    cache: "no-store",
    headers: { Accept: "application/json" },
  });
  if (!res.ok) throw new Error(`Server ${res.status}`);
  const json = await res.json().catch(() => []);
  return Array.isArray(json) ? json : json?.data ?? json?.items ?? [];
}

async function createLog(payload) {
  const res = await fetch(`${API_BASE}/api/reports`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ reporter: "anonymous", type: TYPE, payload }),
  });
  if (!res.ok) throw new Error(`Server ${res.status}: ${await res.text()}`);
  return res.json().catch(() => ({}));
}

/* PUT by id — never the generic PUT /api/reports (it upserts by type+date). */
async function updateLog(id, payload) {
  const res = await fetch(`${API_BASE}/api/reports/${encodeURIComponent(id)}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({ type: TYPE, payload }),
  });
  if (!res.ok) throw new Error(`Server ${res.status}: ${await res.text()}`);
  return res.json().catch(() => ({}));
}

async function deleteLog(id) {
  const res = await fetch(`${API_BASE}/api/reports/${encodeURIComponent(id)}`, { method: "DELETE" });
  if (!res.ok) throw new Error(`Delete failed (${res.status})`);
}

function currentUserName() {
  try {
    const u = JSON.parse(localStorage.getItem("currentUser") || "{}");
    return u.displayName || u.username || "";
  } catch {
    return "";
  }
}

const COL_LETTERS = (n) => {
  let s = "";
  let x = n;
  while (x >= 0) {
    s = String.fromCharCode(65 + (x % 26)) + s;
    x = Math.floor(x / 26) - 1;
  }
  return s;
};

/* A line the importer should look at twice before saving the month. */
function auditRow(r, dupKeys) {
  const flags = [];
  if (!r.date) flags.push({ id: "date", label: "Unreadable date", tone: "red" });
  if (!num(r.qty)) flags.push({ id: "qty", label: "Zero quantity", tone: "amber" });
  if (!r.code) flags.push({ id: "code", label: "No product code", tone: "amber" });
  if (dupKeys.has(dupKeyOf(r))) flags.push({ id: "dup", label: "Duplicate line", tone: "violet" });
  return flags;
}
const dupKeyOf = (r) => `${r.date}|${r.branch}|${r.code}|${r.uom}|${num(r.qty).toFixed(3)}|${r.reference}`;

/* ============================================================
   component
   ============================================================ */
export default function DisposalLogImport() {
  const navigate = useNavigate();
  const fileRef = useRef(null);

  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [msg, setMsg] = useState("");
  const [dragHot, setDragHot] = useState(false);

  const [fileName, setFileName] = useState("");
  const [sheets, setSheets] = useState([]); // [{ name, matrix }]
  const [sheetName, setSheetName] = useState("");
  const [headerRow, setHeaderRow] = useState(0);
  const [colMap, setColMap] = useState({});
  const [dayFirst, setDayFirst] = useState(false);
  const [branchOverrides, setBranchOverrides] = useState({});
  const [showMapping, setShowMapping] = useState(false);

  const [period, setPeriod] = useState("");
  const [periodTouched, setPeriodTouched] = useState(false);
  const [notes, setNotes] = useState("");
  const [saved, setSaved] = useState(null);

  /* explorer state */
  const [dropped, setDropped] = useState(() => new Set()); // srcRow numbers removed from this import
  const [selectedDate, setSelectedDate] = useState("");
  const [scope, setScope] = useState("day"); // day | all
  const [query, setQuery] = useState("");
  const [branchFilter, setBranchFilter] = useState("all");
  const [unitFilter, setUnitFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [issuesOnly, setIssuesOnly] = useState(false);
  const [sort, setSort] = useState({ col: "srcRow", dir: "asc" });
  const [treeHidden, setTreeHidden] = useLocalPref("disposalLog.import.treeHidden", false);
  const [copied, copy] = useCopy();

  /* saved months, so a wrong import can be deleted from here */
  const [savedLogs, setSavedLogs] = useState([]);
  const [confirm, setConfirm] = useState(null); // { title, body, onYes }

  const refreshSaved = useCallback(async () => {
    try {
      const list = await fetchLogs();
      setSavedLogs(
        safeArr(list).sort((a, b) => String(recordPeriod(b)).localeCompare(String(recordPeriod(a))))
      );
    } catch {
      /* the list is a convenience; a failure here must not block an import */
    }
  }, []);

  useEffect(() => {
    refreshSaved();
  }, [refreshSaved]);

  const activeSheet = useMemo(() => sheets.find((s) => s.name === sheetName) || null, [sheets, sheetName]);
  const matrix = activeSheet?.matrix || [];
  const headers = matrix[headerRow] || [];

  const parsedRows = useMemo(() => {
    if (!matrix.length || !mappingIsComplete(colMap)) return [];
    return buildRows(matrix, headerRow, colMap, { dayFirst, branchOverrides });
  }, [matrix, headerRow, colMap, dayFirst, branchOverrides]);

  /* Lines that survived the delete button — everything downstream uses these. */
  const rows = useMemo(() => parsedRows.filter((r) => !dropped.has(r.srcRow)), [parsedRows, dropped]);

  const dupKeys = useMemo(() => {
    const seen = new Map();
    const dups = new Set();
    for (const r of rows) {
      const k = dupKeyOf(r);
      if (seen.has(k)) dups.add(k);
      else seen.set(k, 1);
    }
    return dups;
  }, [rows]);

  const stats = useMemo(() => summarizeRows(rows), [rows]);

  const days = useMemo(() => {
    const m = new Map();
    for (const r of rows) {
      const d = r.date || "";
      if (!d) continue;
      const g = m.get(d) || { date: d, lines: 0, byUnit: new Map(), branches: new Set(), issues: 0 };
      g.lines += 1;
      g.byUnit.set(r.uom, num(g.byUnit.get(r.uom)) + num(r.qty));
      if (r.branch) g.branches.add(r.branch);
      if (auditRow(r, dupKeys).length) g.issues += 1;
      m.set(d, g);
    }
    return Array.from(m.values()).sort((a, b) => a.date.localeCompare(b.date));
  }, [rows, dupKeys]);

  const dayIndex = useMemo(() => new Map(days.map((d) => [d.date, d])), [days]);
  const undated = useMemo(() => rows.filter((r) => !r.date), [rows]);

  useEffect(() => {
    if (!days.length) {
      setSelectedDate("");
      return;
    }
    setSelectedDate((prev) => (prev && dayIndex.has(prev) ? prev : days[0].date));
  }, [days, dayIndex]);

  /* distinct filter options */
  const branchOptions = useMemo(
    () => Array.from(new Set(rows.map((r) => r.branch).filter(Boolean))).sort(),
    [rows]
  );
  const unitOptions = useMemo(
    () => Array.from(new Set(rows.map((r) => r.uom).filter(Boolean))).sort(),
    [rows]
  );
  const categoryOptions = useMemo(
    () => Array.from(new Set(rows.map((r) => r.category).filter(Boolean))).sort(),
    [rows]
  );

  const viewRows = useMemo(() => {
    const q = query.trim().toLowerCase();
    let list = rows.filter((r) => {
      if (scope === "day" && selectedDate && r.date !== selectedDate) return false;
      if (branchFilter !== "all" && r.branch !== branchFilter) return false;
      if (unitFilter !== "all" && r.uom !== unitFilter) return false;
      if (categoryFilter !== "all" && r.category !== categoryFilter) return false;
      if (issuesOnly && !auditRow(r, dupKeys).length) return false;
      if (!q) return true;
      return `${r.code} ${r.product} ${r.branch} ${r.reference} ${r.category} ${r.remarks}`.toLowerCase().includes(q);
    });

    const dir = sort.dir === "desc" ? -1 : 1;
    const val = (r) => {
      switch (sort.col) {
        case "qty": return num(r.qty);
        case "date": return r.date || "";
        case "branch": return r.branch || "";
        case "product": return r.product || "";
        case "code": return r.code || "";
        case "category": return r.category || "";
        default: return r.srcRow;
      }
    };
    list = [...list].sort((a, b) => {
      const x = val(a);
      const y = val(b);
      if (typeof x === "number" && typeof y === "number") return (x - y) * dir;
      return String(x).localeCompare(String(y)) * dir;
    });
    return list;
  }, [rows, scope, selectedDate, branchFilter, unitFilter, categoryFilter, issuesOnly, query, sort, dupKeys]);

  const viewTotals = useMemo(() => {
    const byUnit = new Map();
    viewRows.forEach((r) => byUnit.set(r.uom, num(byUnit.get(r.uom)) + num(r.qty)));
    return Array.from(byUnit.entries()).sort((a, b) => b[1] - a[1]);
  }, [viewRows]);

  const issueCount = useMemo(() => rows.filter((r) => auditRow(r, dupKeys).length).length, [rows, dupKeys]);

  const locations = useMemo(() => {
    const m = new Map();
    for (const r of rows) {
      const key = r.locationRaw || "—";
      const g = m.get(key) || { raw: key, lines: 0, qty: 0, auto: resolveOdooBranch(key) };
      g.lines += 1;
      g.qty += num(r.qty);
      m.set(key, g);
    }
    return Array.from(m.values()).sort((a, b) => b.lines - a.lines);
  }, [rows]);

  const unmapped = useMemo(
    () => locations.filter((l) => !BRANCHES.includes(branchOverrides[l.raw] || l.auto)),
    [locations, branchOverrides]
  );

  const effectivePeriod = periodTouched ? period : stats.period || period;
  const multiMonth = stats.months.length > 1;

  /* ── file handling ─────────────────────────────────────── */
  const readFile = useCallback(async (file) => {
    if (!file) return;
    setError("");
    setMsg("");
    setSaved(null);
    setBusy("Reading file…");
    try {
      const XLSX = await import("xlsx");
      const buf = await file.arrayBuffer();
      const wb = XLSX.read(buf, { type: "array" });
      const parsed = wb.SheetNames.map((name) => ({
        name,
        matrix: XLSX.utils.sheet_to_json(wb.Sheets[name], {
          header: 1,
          raw: true,
          defval: "",
          blankrows: false,
        }),
      })).filter((s) => s.matrix.length);

      if (!parsed.length) throw new Error("The workbook has no readable sheets.");

      /* Pick the sheet whose header row matches the most known columns. */
      let best = parsed[0];
      let bestScore = -1;
      for (const s of parsed) {
        const hr = detectHeaderRow(s.matrix);
        const score = hr < 0 ? 0 : Object.keys(autoMapColumns(s.matrix[hr] || [])).length;
        if (score > bestScore) {
          bestScore = score;
          best = s;
        }
      }
      const hr = Math.max(0, detectHeaderRow(best.matrix));

      setFileName(file.name);
      setSheets(parsed);
      setSheetName(best.name);
      setHeaderRow(hr);
      setColMap(autoMapColumns(best.matrix[hr] || []));
      setBranchOverrides({});
      setDropped(new Set());
      setPeriodTouched(false);
      setQuery("");
      setBranchFilter("all");
      setUnitFilter("all");
      setCategoryFilter("all");
      setIssuesOnly(false);
      setShowMapping(false);
      setMsg(`Loaded “${file.name}” — sheet “${best.name}”, ${best.matrix.length - hr - 1} data rows.`);
    } catch (e) {
      console.error(e);
      setError(e?.message || "Could not read the file.");
      setSheets([]);
      setFileName("");
    } finally {
      setBusy("");
    }
  }, []);

  const onPickSheet = (name) => {
    const s = sheets.find((x) => x.name === name);
    setSheetName(name);
    if (s) {
      const hr = Math.max(0, detectHeaderRow(s.matrix));
      setHeaderRow(hr);
      setColMap(autoMapColumns(s.matrix[hr] || []));
      setDropped(new Set());
    }
  };

  const onPickHeaderRow = (idx) => {
    const i = Math.max(0, Number(idx) || 0);
    setHeaderRow(i);
    setColMap(autoMapColumns(matrix[i] || []));
    setDropped(new Set());
  };

  const resetAll = () => {
    setSheets([]);
    setSheetName("");
    setFileName("");
    setColMap({});
    setBranchOverrides({});
    setDropped(new Set());
    setPeriod("");
    setPeriodTouched(false);
    setNotes("");
    setMsg("");
    setError("");
    setSaved(null);
    if (fileRef.current) fileRef.current.value = "";
  };

  /* ── delete tools ──────────────────────────────────────── */
  const dropRow = (srcRow) => setDropped((s) => new Set(s).add(srcRow));
  const restoreRow = (srcRow) =>
    setDropped((s) => {
      const n = new Set(s);
      n.delete(srcRow);
      return n;
    });
  const restoreAll = () => setDropped(new Set());

  const dropVisible = () => {
    const victims = viewRows.map((r) => r.srcRow);
    if (!victims.length) return;
    setConfirm({
      title: `Remove ${victims.length} line(s) from this import?`,
      body: "They stay in the Excel file — they are only left out of what gets saved. You can restore them with Undo.",
      onYes: () => setDropped((s) => new Set([...s, ...victims])),
    });
  };

  const dropDay = (date) => {
    const victims = rows.filter((r) => r.date === date).map((r) => r.srcRow);
    if (!victims.length) return;
    setConfirm({
      title: `Remove all ${victims.length} line(s) of ${formatDMY(date)}?`,
      body: "The whole day is left out of what gets saved. Undo restores it.",
      onYes: () => setDropped((s) => new Set([...s, ...victims])),
    });
  };

  const deleteSavedMonth = (rec) => {
    const p = recordPeriod(rec);
    setConfirm({
      title: `Delete the saved log for ${monthLabel(p)}?`,
      body: "This removes the imported month from the server for everyone. The Excel file is untouched, so it can be imported again.",
      onYes: async () => {
        try {
          setBusy("Deleting…");
          await deleteLog(getRecordId(rec));
          await refreshSaved();
          setMsg(`Deleted the saved log for ${monthLabel(p)}.`);
        } catch (e) {
          setError(e?.message || "Delete failed.");
        } finally {
          setBusy("");
        }
      },
    });
  };

  /* ── export / copy ─────────────────────────────────────── */
  const exportView = async () => {
    if (!viewRows.length) return;
    const head = ["DATE", "BRANCH", "ODOO LOCATION", "REFERENCE", "CODE", "PRODUCT", "CATEGORY", "QTY", "UNIT", "REMARKS"];
    const aoa = [head, ...viewRows.map((r) => [
      r.date, r.branch, r.locationRaw, r.reference, r.code, r.product, r.category, num(r.qty), r.uom, r.remarks,
    ])];
    const sheetsOut = [{ name: scope === "day" ? selectedDate || "Day" : "All lines", aoa }];
    await downloadSheets(sheetsOut, `disposal-log-${scope === "day" ? selectedDate : effectivePeriod || "export"}.xlsx`);
  };

  const copyDay = () => {
    const lines = viewRows.map(
      (r) => `${r.date}\t${r.branch}\t${r.code}\t${r.product}\t${fmt3(r.qty)} ${r.uom}`
    );
    copy([`Odoo disposal — ${scope === "day" ? selectedDate : "all days"}`, ...lines].join("\n"), "day");
  };

  /* ── save ──────────────────────────────────────────────── */
  const handleSave = async () => {
    setError("");
    setMsg("");
    if (!rows.length) {
      setError("Nothing to save — map the required columns first.");
      return;
    }
    if (!/^\d{4}-\d{2}$/.test(effectivePeriod)) {
      setError("Pick a valid month (YYYY-MM) for this log.");
      return;
    }

    setBusy("Saving…");
    try {
      const existing = await fetchLogs().catch(() => []);
      const dup = existing.find((r) => recordPeriod(r) === effectivePeriod);
      if (dup) {
        const ok = window.confirm(
          `A disposal log for ${monthLabel(effectivePeriod)} already exists ` +
            `(${dup?.payload?.stats?.lines ?? "?"} lines).\n\n` +
            `Replace it with this import?\n\nاستبدال السجل الموجود بهذا الملف؟`
        );
        if (!ok) {
          setBusy("");
          setMsg("Import cancelled — the existing month was kept.");
          return;
        }
      }

      const payload = {
        reportDate: `${effectivePeriod}-01`,
        meta: {
          period: effectivePeriod,
          periodLabel: monthLabel(effectivePeriod),
          fileName,
          sheetName,
          notes: notes.trim(),
          importedBy: currentUserName(),
          importedAt: new Date().toISOString(),
          dayFirst,
          headerRow,
          columnMap: colMap,
          columnHeaders: headers.map((h) => String(h ?? "")),
          branchOverrides,
          droppedLines: parsedRows.length - rows.length,
          source: "Odoo",
        },
        stats: {
          lines: stats.lines,
          totalQty: stats.totalQty,
          byUnit: stats.byUnit,
          dateFrom: stats.dateFrom,
          dateTo: stats.dateTo,
          branches: stats.branches.map((b) => ({ branch: b.branch, lines: b.lines, qty: b.qty, units: b.units })),
          categories: stats.categories,
        },
        rows,
        savedAt: Date.now(),
      };

      const res = dup ? await updateLog(getRecordId(dup), payload) : await createLog(payload);
      setSaved({ period: effectivePeriod, replaced: !!dup, id: getRecordId(dup) || getRecordId(res) });
      await refreshSaved();
      setMsg(
        `${dup ? "Replaced" : "Saved"} — ${monthLabel(effectivePeriod)} · ${stats.lines} lines stored on the server.`
      );
    } catch (e) {
      console.error(e);
      setError(e?.message || "Save failed. Please try again.");
    } finally {
      setBusy("");
    }
  };

  const goCompare = () => {
    navigate("/disposal-log/compare", {
      state: {
        rows,
        period: effectivePeriod,
        fileName,
      },
    });
  };

  const mappedCount = FIELDS.filter((f) => colMap?.[f.id] != null && colMap[f.id] !== "").length;
  const ready = mappingIsComplete(colMap) && rows.length > 0;
  const selDay = dayIndex.get(selectedDate);

  const sortBy = (col) =>
    setSort((s) => ({ col, dir: s.col === col && s.dir === "asc" ? "desc" : "asc" }));
  const sortMark = (col) => (sort.col === col ? (sort.dir === "asc" ? " ▲" : " ▼") : "");

  /* ============================================================
     render
     ============================================================ */
  return (
    <div className="dlx">
      <style>{DLX_CSS}</style>

      <div className="dlx-shell">
        {/* ── hero ── */}
        <header className="dlx-hero">
          <div>
            <div className="dlx-kicker">AL MAWASHI QMS · DISPOSAL RECONCILIATION</div>
            <h1>📥 Import Odoo Disposal Log</h1>
            <p dir="rtl">استيراد سجل الإعدام من أودو — ثم مطابقته مع مرتجعات الفروع يوماً بيوم</p>
          </div>
          <div className="dlx-heroBtns">
            <button className="dlx-btn dlx-ghost" onClick={() => navigate("/disposal-log/compare")}>
              ⚖️ Comparison
            </button>
            <button className="dlx-btn dlx-ghost" onClick={() => navigate("/returns/menu")}>
              ⬅ Back
            </button>
          </div>
        </header>

        {/* ── step 1: file ── */}
        <section className="dlx-card">
          <div className="dlx-cardHead">
            <span className="dlx-step">1</span>
            <div>
              <h2>Choose the Odoo export</h2>
              <p dir="rtl">اختر ملف الإكسل الذي يصدّره فريق المتجر من أودو</p>
            </div>
            {fileName && (
              <div className="dlx-headRight">
                <Pill tone="teal">📄 {fileName}</Pill>
                <button className="dlx-btn dlx-soft" onClick={resetAll}>🗑 Clear file</button>
              </div>
            )}
          </div>

          <div
            className={`dlx-drop${dragHot ? " hot" : ""}`}
            onDragOver={(e) => {
              e.preventDefault();
              setDragHot(true);
            }}
            onDragLeave={() => setDragHot(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragHot(false);
              readFile(e.dataTransfer?.files?.[0]);
            }}
            onClick={() => fileRef.current?.click()}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && fileRef.current?.click()}
          >
            <div className="dlx-dropIcon">📄</div>
            <div>
              <strong>{fileName || "Drop the .xlsx file here, or click to browse"}</strong>
              <div className="dlx-muted">
                .xlsx / .xls / .csv — the file is read in your browser and nothing is uploaded until you press Save.
              </div>
            </div>
            <input
              ref={fileRef}
              type="file"
              accept=".xlsx,.xls,.csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
              style={{ display: "none" }}
              onChange={(e) => readFile(e.target.files?.[0])}
            />
          </div>

          {(busy || msg || error) && (
            <div className={`dlx-note ${error ? "dlx-noteErr" : busy ? "dlx-noteBusy" : "dlx-noteOk"}`}>
              {error || busy || msg}
            </div>
          )}

          {/* saved months — with the delete button asked for */}
          {savedLogs.length > 0 && (
            <>
              <div className="dlx-tools" style={{ marginTop: 12 }}>
                <strong style={{ fontSize: 13 }}>Already on the server</strong>
                <span className="dlx-muted" dir="rtl">الأشهر المحفوظة — يمكن حذف أي شهر مستورد بالخطأ</span>
              </div>
              <div className="dlx-tools">
                {savedLogs.map((rec) => {
                  const p = recordPeriod(rec);
                  return (
                    <span key={getRecordId(rec)} className="dlx-pill dlx-pill-slate">
                      {monthLabel(p)} · {rec?.payload?.stats?.lines ?? "?"} lines
                      <button
                        type="button"
                        className="dlx-del"
                        title={`Delete ${monthLabel(p)}`}
                        onClick={() => deleteSavedMonth(rec)}
                      >
                        ✖
                      </button>
                    </span>
                  );
                })}
              </div>
            </>
          )}
        </section>

        {sheets.length > 0 && (
          <>
            {/* ── step 2: mapping (folded away once it is right) ── */}
            <section className="dlx-card">
              <div className="dlx-cardHead">
                <span className="dlx-step">2</span>
                <div>
                  <h2>Sheet &amp; column mapping</h2>
                  <p dir="rtl">تحديد الورقة والأعمدة — تم التعرف عليها تلقائياً</p>
                </div>
                <div className="dlx-headRight">
                  <Pill tone={ready ? "green" : "amber"}>{mappedCount}/{FIELDS.length} columns mapped</Pill>
                  <Pill tone="slate">Sheet: {sheetName}</Pill>
                  <button className="dlx-btn dlx-soft" onClick={() => setShowMapping((v) => !v)}>
                    {showMapping ? "Hide" : "Adjust"}
                  </button>
                </div>
              </div>

              {showMapping && (
                <>
                  <div className="dlx-grid">
                    <Field label="Sheet — الورقة">
                      <select value={sheetName} onChange={(e) => onPickSheet(e.target.value)}>
                        {sheets.map((s) => (
                          <option key={s.name} value={s.name}>
                            {s.name} ({s.matrix.length} rows)
                          </option>
                        ))}
                      </select>
                    </Field>
                    <Field label="Header row — صف العناوين">
                      <select value={headerRow} onChange={(e) => onPickHeaderRow(e.target.value)}>
                        {matrix.slice(0, 15).map((r, i) => (
                          <option key={i} value={i}>
                            Row {i + 1} — {r.filter(Boolean).slice(0, 4).join(" | ").slice(0, 60) || "(empty)"}
                          </option>
                        ))}
                      </select>
                    </Field>
                    <Field label="Date order — ترتيب التاريخ">
                      <select value={dayFirst ? "dmy" : "mdy"} onChange={(e) => setDayFirst(e.target.value === "dmy")}>
                        <option value="mdy">Month / Day / Year (Odoo default)</option>
                        <option value="dmy">Day / Month / Year</option>
                      </select>
                    </Field>
                  </div>

                  <div className="dlx-grid" style={{ marginTop: 10 }}>
                    {FIELDS.map((f) => (
                      <Field key={f.id} label={`${f.label}${f.required ? " *" : ""} — ${f.ar}`}>
                        <select
                          value={colMap?.[f.id] ?? ""}
                          className={f.required && colMap?.[f.id] == null ? "bad" : ""}
                          onChange={(e) =>
                            setColMap((m) => ({
                              ...m,
                              [f.id]: e.target.value === "" ? undefined : Number(e.target.value),
                            }))
                          }
                        >
                          <option value="">— not in file —</option>
                          {headers.map((h, i) => (
                            <option key={i} value={i}>
                              {COL_LETTERS(i)} · {String(h ?? "").trim() || "(blank)"}
                            </option>
                          ))}
                        </select>
                      </Field>
                    ))}
                  </div>

                  <h3 className="dlx-cardHead" style={{ marginTop: 14, marginBottom: 6 }}>
                    <span style={{ fontSize: 14, fontWeight: 900 }}>Branch mapping — ربط مواقع أودو بفروعنا</span>
                  </h3>
                  <div className="dlx-tableWrap" style={{ maxHeight: 300 }}>
                    <table className="dlx-table">
                      <thead>
                        <tr>
                          <th>Odoo location</th>
                          <th className="num">Lines</th>
                          <th className="num">Qty</th>
                          <th>Auto</th>
                          <th>Our branch</th>
                        </tr>
                      </thead>
                      <tbody>
                        {locations.map((l) => (
                          <tr key={l.raw}>
                            <td className="mono">{l.raw}</td>
                            <td className="num">{l.lines}</td>
                            <td className="num">{fmt3(l.qty)}</td>
                            <td><Pill tone="teal">{l.auto || "—"}</Pill></td>
                            <td>
                              <select
                                value={branchOverrides[l.raw] ?? ""}
                                onChange={(e) =>
                                  setBranchOverrides((m) => {
                                    const next = { ...m };
                                    if (!e.target.value) delete next[l.raw];
                                    else next[l.raw] = e.target.value;
                                    return next;
                                  })
                                }
                              >
                                <option value="">Auto ({l.auto || "—"})</option>
                                {BRANCHES.filter((b) => b !== OTHER_BRANCH).map((b) => (
                                  <option key={b} value={b}>{b}</option>
                                ))}
                              </select>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </section>

            {/* ── step 3: walk the file ── */}
            {ready && (
              <section className="dlx-card">
                <div className="dlx-cardHead">
                  <span className="dlx-step">3</span>
                  <div>
                    <h2>Walk the file</h2>
                    <p dir="rtl">تصفّح الملف يوماً بيوم — نفس طريقة عرض المرتجعات</p>
                  </div>
                  <div className="dlx-headRight">
                    {dropped.size > 0 && (
                      <button className="dlx-undo" onClick={restoreAll}>
                        ↩ Undo {dropped.size} deleted line(s)
                      </button>
                    )}
                    <button className="dlx-btn dlx-soft" onClick={exportView}>⬇ Export view</button>
                    <button className="dlx-btn dlx-soft" onClick={copyDay}>
                      {copied === "day" ? "✓ Copied" : "⧉ Copy"}
                    </button>
                  </div>
                </div>

                <div className="dlx-kpis">
                  <Kpi label="Lines" ar="عدد السطور" value={stats.lines} tone="slate"
                    sub={dropped.size ? `${dropped.size} removed` : null} />
                  <Kpi label="Days" ar="عدد الأيام" value={days.length} tone="teal"
                    sub={stats.dateFrom ? `${formatDMY(stats.dateFrom)} → ${formatDMY(stats.dateTo)}` : null} />
                  <Kpi label="Branches" ar="الفروع" value={stats.branches.length} tone="blue"
                    sub={unmapped.length ? `${unmapped.length} unmapped` : "all mapped"} />
                  <Kpi label="Quantity" ar="الكمية" value={stats.byUnit.map(([u, q]) => `${fmt3(q)} ${u}`).join(" · ") || "—"} tone="red" />
                  <Kpi label="Flagged" ar="تحتاج مراجعة" value={issueCount} tone={issueCount ? "amber" : "green"}
                    sub={issueCount ? "duplicates / dates / zeros" : "nothing to review"} />
                </div>

                {(multiMonth || undated.length > 0 || unmapped.length > 0) && (
                  <div className="dlx-note dlx-noteWarn">
                    {multiMonth && (
                      <div>
                        ⚠ The file spans more than one month ({stats.months.join(", ")}). It is saved under{" "}
                        <b>{monthLabel(effectivePeriod)}</b>; every comparison still uses each line's own date.
                      </div>
                    )}
                    {undated.length > 0 && (
                      <div>⚠ {undated.length} line(s) have an unreadable date — they cannot be placed on a day. Check the date column or its order in step 2.</div>
                    )}
                    {unmapped.length > 0 && (
                      <div>⚠ {unmapped.length} Odoo location(s) do not match a branch in our list: {unmapped.map((u) => u.raw).join(", ")}. Map them in step 2 or they will only ever match by product.</div>
                    )}
                  </div>
                )}

                {/* toolbar */}
                <div className="dlx-tools">
                  <Segmented
                    value={scope}
                    onChange={setScope}
                    options={[
                      { value: "day", label: "One day" },
                      { value: "all", label: `All ${rows.length} lines` },
                    ]}
                  />
                  <SearchInput value={query} onChange={setQuery} placeholder="Code, product, reference, branch…" />
                  <select className="dlx-iconBtn" value={branchFilter} onChange={(e) => setBranchFilter(e.target.value)} title="Branch">
                    <option value="all">All branches</option>
                    {branchOptions.map((b) => <option key={b} value={b}>{b}</option>)}
                  </select>
                  <select className="dlx-iconBtn" value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)} title="Category">
                    <option value="all">All categories</option>
                    {categoryOptions.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                  <select className="dlx-iconBtn" value={unitFilter} onChange={(e) => setUnitFilter(e.target.value)} title="Unit">
                    <option value="all">All units</option>
                    {unitOptions.map((u) => <option key={u} value={u}>{u}</option>)}
                  </select>
                  <Toggle checked={issuesOnly} onChange={setIssuesOnly} label="Flagged only" title="Only lines the audit pass marked" />
                  {(query || branchFilter !== "all" || categoryFilter !== "all" || unitFilter !== "all" || issuesOnly) && (
                    <button className="dlx-btn dlx-soft" onClick={() => {
                      setQuery(""); setBranchFilter("all"); setCategoryFilter("all"); setUnitFilter("all"); setIssuesOnly(false);
                    }}>✕ Clear filters</button>
                  )}
                </div>

                <div className={`dlx-split ${treeHidden ? "closed" : "open"}`}>
                  <DateTree
                    dates={days.map((d) => d.date)}
                    selected={selectedDate}
                    onSelect={(d) => { setSelectedDate(d); setScope("day"); }}
                    hidden={treeHidden}
                    onToggleHidden={setTreeHidden}
                    title="File dates"
                    meta={(d) => {
                      const g = dayIndex.get(d);
                      return {
                        count: g?.lines ?? 0,
                        tone: !g ? "slate" : g.issues ? "amber" : "green",
                        hint: g
                          ? `${g.lines} line(s) · ${g.branches.size} branch(es)${g.issues ? ` · ${g.issues} flagged` : ""}`
                          : d,
                      };
                    }}
                  />

                  <div className="dlx-panel">
                    <div className="dlx-panelHead">
                      <h3>
                        {scope === "day"
                          ? selectedDate ? `${formatDMY(selectedDate)} — ${viewRows.length} line(s)` : "Pick a day"
                          : `All days — ${viewRows.length} line(s)`}
                      </h3>
                      <div className="dlx-sp">
                        {viewTotals.map(([u, q]) => (
                          <Pill key={u} tone="teal">{fmt3(q)} {u}</Pill>
                        ))}
                        {selDay && scope === "day" && (
                          <button className="dlx-del" onClick={() => dropDay(selectedDate)} title="Remove this whole day from the import">
                            🗑 Delete day
                          </button>
                        )}
                        {viewRows.length > 0 && (
                          <button className="dlx-del" onClick={dropVisible} title="Remove every line currently shown">
                            🗑 Delete shown
                          </button>
                        )}
                      </div>
                    </div>

                    {viewRows.length === 0 ? (
                      <EmptyState icon="🔍" title="Nothing to show here" hint="Clear a filter, or pick another day from the tree." />
                    ) : (
                      <div className="dlx-tableWrap">
                        <table className="dlx-table">
                          <thead>
                            <tr>
                              <th className="num sortable" onClick={() => sortBy("srcRow")}>#{sortMark("srcRow")}</th>
                              <th className="sortable" onClick={() => sortBy("date")}>DATE{sortMark("date")}</th>
                              <th className="sortable" onClick={() => sortBy("branch")}>BRANCH{sortMark("branch")}</th>
                              <th>REFERENCE</th>
                              <th className="sortable" onClick={() => sortBy("code")}>CODE{sortMark("code")}</th>
                              <th className="sortable" onClick={() => sortBy("product")}>PRODUCT{sortMark("product")}</th>
                              <th className="sortable" onClick={() => sortBy("category")}>CATEGORY{sortMark("category")}</th>
                              <th className="num sortable" onClick={() => sortBy("qty")}>QTY{sortMark("qty")}</th>
                              <th>UNIT</th>
                              <th>FLAGS</th>
                              <th />
                            </tr>
                          </thead>
                          <tbody>
                            {viewRows.map((r) => {
                              const flags = auditRow(r, dupKeys);
                              return (
                                <tr key={r.srcRow}>
                                  <td className="num mono">{r.srcRow}</td>
                                  <td className={r.date ? "" : "bad"}>{r.date ? formatDMY(r.date) : "unreadable"}</td>
                                  <td><Pill tone="teal">{r.branch || "—"}</Pill></td>
                                  <td className="mono">{r.reference || "—"}</td>
                                  <td className="mono">{r.code || "—"}</td>
                                  <td className="wrap">{r.product}</td>
                                  <td>{r.category || "—"}</td>
                                  <td className="num">{fmt3(r.qty)}</td>
                                  <td>{normalizeUom(r.uom)}</td>
                                  <td>
                                    {flags.length ? flags.map((f) => (
                                      <Pill key={f.id} tone={f.tone} title={f.label}>{f.label}</Pill>
                                    )) : <span className="dlx-muted">—</span>}
                                  </td>
                                  <td>
                                    <button className="dlx-del" title="Remove this line from the import" onClick={() => dropRow(r.srcRow)}>✖</button>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                          <tfoot>
                            <tr>
                              <td colSpan={7}>Total — {viewRows.length} line(s)</td>
                              <td className="num">{fmt3(viewRows.reduce((s, r) => s + num(r.qty), 0))}</td>
                              <td colSpan={3}>{viewTotals.map(([u, q]) => `${fmt3(q)} ${u}`).join(" · ")}</td>
                            </tr>
                          </tfoot>
                        </table>
                      </div>
                    )}

                    {/* what was deleted, and the way back */}
                    {dropped.size > 0 && (
                      <div className="dlx-note dlx-noteWarn" style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                        <span>🗑 {dropped.size} line(s) left out of this import:</span>
                        {parsedRows
                          .filter((r) => dropped.has(r.srcRow))
                          .slice(0, 12)
                          .map((r) => (
                            <button key={r.srcRow} className="dlx-undo" onClick={() => restoreRow(r.srcRow)} title="Restore this line">
                              ↩ row {r.srcRow} · {r.code || r.product?.slice(0, 14)}
                            </button>
                          ))}
                        {dropped.size > 12 && <span>…</span>}
                        <button className="dlx-undo" onClick={restoreAll}>↩ Restore all</button>
                      </div>
                    )}
                  </div>
                </div>
              </section>
            )}

            {/* ── step 4: save ── */}
            {ready && (
              <section className="dlx-card">
                <div className="dlx-cardHead">
                  <span className="dlx-step">4</span>
                  <div>
                    <h2>Save &amp; compare</h2>
                    <p dir="rtl">حفظ الشهر على الخادم ثم الانتقال إلى المقارنة مع المرتجعات</p>
                  </div>
                </div>

                <div className="dlx-grid">
                  <Field label="Month — الشهر">
                    <input
                      type="month"
                      value={effectivePeriod}
                      onChange={(e) => {
                        setPeriod(e.target.value);
                        setPeriodTouched(true);
                      }}
                    />
                  </Field>
                  <Field label="Notes — ملاحظات" wide>
                    <input
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="e.g. printed and signed by the store team on 02/08"
                    />
                  </Field>
                </div>
                <div className="dlx-muted" dir="rtl" style={{ marginTop: 4 }}>
                  {monthLabelAr(effectivePeriod)} — {rows.length} سطراً سيتم حفظها
                </div>

                <div className="dlx-tools" style={{ marginTop: 12 }}>
                  <button className="dlx-btn dlx-primary" onClick={handleSave} disabled={!!busy || !ready}>
                    {busy ? "Working…" : "💾 Save disposal log"}
                  </button>
                  <button className="dlx-btn dlx-soft" onClick={goCompare} disabled={!rows.length}>
                    ⚖️ Compare with returns now
                  </button>
                  <button className="dlx-btn dlx-soft" onClick={resetAll} disabled={!!busy}>Start over</button>
                  {saved && (
                    <button className="dlx-btn dlx-primary" onClick={() => navigate("/disposal-log/compare")}>
                      📊 Open the saved comparison →
                    </button>
                  )}
                </div>

                {(error || msg) && (
                  <div className={`dlx-note ${error ? "dlx-noteErr" : "dlx-noteOk"}`}>{error || msg}</div>
                )}
              </section>
            )}
          </>
        )}

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
