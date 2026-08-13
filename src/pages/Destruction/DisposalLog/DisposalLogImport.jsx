// src/pages/Destruction/DisposalLog/DisposalLogImport.jsx
//
// استيراد سجل الإعدام الشهري من أودو — Import the monthly Odoo Disposal Log.
//
// The store team exports this file from Odoo and prints it; QA imports it here
// so it can be reconciled against our own `destruction_record` register.
// It is stored on the server under its own type (`odoo_disposal_log`) — never
// merged into the condemnation records.
//
//   step 1  pick the .xlsx / .csv file
//   step 2  confirm sheet + header row + column mapping (auto-detected)
//   step 3  review branch mapping and the parsed preview
//   step 4  save the month to the server

import React, { useCallback, useMemo, useRef, useState } from "react";
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
  getRecordId,
  mappingIsComplete,
  monthLabel,
  monthLabelAr,
  recordPeriod,
  resolveOdooBranch,
  summarizeRows,
} from "./disposalLogOptions";

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

/* ============================================================
   component
   ============================================================ */
export default function DisposalLogImport() {
  const navigate = useNavigate();
  const fileRef = useRef(null);

  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [msg, setMsg] = useState("");

  const [fileName, setFileName] = useState("");
  const [sheets, setSheets] = useState([]); // [{ name, matrix }]
  const [sheetName, setSheetName] = useState("");
  const [headerRow, setHeaderRow] = useState(0);
  const [colMap, setColMap] = useState({});
  const [dayFirst, setDayFirst] = useState(false);
  const [branchOverrides, setBranchOverrides] = useState({});

  const [period, setPeriod] = useState("");
  const [periodTouched, setPeriodTouched] = useState(false);
  const [notes, setNotes] = useState("");
  const [saved, setSaved] = useState(null);

  const activeSheet = useMemo(
    () => sheets.find((s) => s.name === sheetName) || null,
    [sheets, sheetName]
  );
  const matrix = activeSheet?.matrix || [];
  const headers = matrix[headerRow] || [];

  const rows = useMemo(() => {
    if (!matrix.length || !mappingIsComplete(colMap)) return [];
    return buildRows(matrix, headerRow, colMap, { dayFirst, branchOverrides });
  }, [matrix, headerRow, colMap, dayFirst, branchOverrides]);

  const stats = useMemo(() => summarizeRows(rows), [rows]);

  /* Distinct Odoo locations found in the file → editable branch mapping */
  const locations = useMemo(() => {
    const m = new Map();
    for (const r of rows) {
      const key = r.locationRaw || "—";
      const g = m.get(key) || { raw: key, lines: 0, qty: 0, auto: resolveOdooBranch(key) };
      g.lines += 1;
      g.qty += Number(r.qty) || 0;
      m.set(key, g);
    }
    return Array.from(m.values()).sort((a, b) => b.lines - a.lines);
  }, [rows]);

  const effectivePeriod = periodTouched ? period : stats.period || period;
  const multiMonth = stats.months.length > 1;
  const badDates = rows.filter((r) => !r.date).length;

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
      setPeriodTouched(false);
      setMsg(`Loaded “${file.name}” — sheet “${best.name}”.`);
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
    }
  };

  const onPickHeaderRow = (idx) => {
    const i = Math.max(0, Number(idx) || 0);
    setHeaderRow(i);
    setColMap(autoMapColumns(matrix[i] || []));
  };

  const resetAll = () => {
    setSheets([]);
    setSheetName("");
    setFileName("");
    setColMap({});
    setBranchOverrides({});
    setPeriod("");
    setPeriodTouched(false);
    setNotes("");
    setMsg("");
    setError("");
    setSaved(null);
    if (fileRef.current) fileRef.current.value = "";
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

  const mappedCount = FIELDS.filter((f) => colMap?.[f.id] != null && colMap[f.id] !== "").length;
  const ready = mappingIsComplete(colMap) && rows.length > 0;

  /* ============================================================
     render
     ============================================================ */
  return (
    <div className="dli-page">
      <style>{CSS}</style>

      <div className="dli-shell">
        {/* ── hero ── */}
        <header className="dli-hero">
          <div>
            <div className="dli-kicker">AL MAWASHI QMS · RECONCILIATION</div>
            <h1>📥 Import Odoo Disposal Log</h1>
            <p dir="rtl">استيراد سجل الإعدام الشهري الصادر من نظام أودو</p>
          </div>
          <div className="dli-heroBtns">
            <button className="dli-btn dli-ghost" onClick={() => navigate("/disposal-log/browse")}>
              📊 Saved logs &amp; comparison
            </button>
            <button className="dli-btn dli-ghost" onClick={() => navigate("/returns/menu")}>
              ⬅ Back
            </button>
          </div>
        </header>

        {/* ── step 1: file ── */}
        <section className="dli-card">
          <div className="dli-cardHead">
            <span className="dli-step">1</span>
            <div>
              <h2>Choose the Odoo export</h2>
              <p dir="rtl">اختر ملف الإكسل الذي يصدّره فريق المتجر من أودو</p>
            </div>
          </div>

          <div
            className="dli-drop"
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              readFile(e.dataTransfer?.files?.[0]);
            }}
            onClick={() => fileRef.current?.click()}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && fileRef.current?.click()}
          >
            <div className="dli-dropIcon">📄</div>
            <div>
              <strong>{fileName || "Drop the .xlsx file here, or click to browse"}</strong>
              <div className="dli-muted">
                Accepts .xlsx / .xls / .csv — nothing is uploaded until you press Save.
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
            <div className={`dli-note ${error ? "dli-noteErr" : busy ? "dli-noteBusy" : "dli-noteOk"}`}>
              {error || busy || msg}
            </div>
          )}
        </section>

        {sheets.length > 0 && (
          <>
            {/* ── step 2: mapping ── */}
            <section className="dli-card">
              <div className="dli-cardHead">
                <span className="dli-step">2</span>
                <div>
                  <h2>Sheet &amp; column mapping</h2>
                  <p dir="rtl">تحديد الورقة والأعمدة — تم التعرف عليها تلقائياً، عدّلها إذا لزم</p>
                </div>
                <span className={`dli-badge ${ready ? "ok" : "warn"}`}>
                  {mappedCount}/{FIELDS.length} columns mapped
                </span>
              </div>

              <div className="dli-grid3">
                <label className="dli-field">
                  <span>Sheet — الورقة</span>
                  <select value={sheetName} onChange={(e) => onPickSheet(e.target.value)}>
                    {sheets.map((s) => (
                      <option key={s.name} value={s.name}>
                        {s.name} ({s.matrix.length} rows)
                      </option>
                    ))}
                  </select>
                </label>

                <label className="dli-field">
                  <span>Header row — صف العناوين</span>
                  <select value={headerRow} onChange={(e) => onPickHeaderRow(e.target.value)}>
                    {matrix.slice(0, 15).map((r, i) => (
                      <option key={i} value={i}>
                        Row {i + 1} — {r.filter(Boolean).slice(0, 4).join(" | ").slice(0, 60) || "(empty)"}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="dli-field">
                  <span>Date order — ترتيب التاريخ</span>
                  <select value={dayFirst ? "dmy" : "mdy"} onChange={(e) => setDayFirst(e.target.value === "dmy")}>
                    <option value="mdy">Month / Day / Year (Odoo default)</option>
                    <option value="dmy">Day / Month / Year</option>
                  </select>
                </label>
              </div>

              <div className="dli-grid4">
                {FIELDS.map((f) => (
                  <label key={f.id} className="dli-field">
                    <span>
                      {f.label} {f.required && <b className="dli-req">*</b>} — {f.ar}
                    </span>
                    <select
                      value={colMap?.[f.id] ?? ""}
                      onChange={(e) =>
                        setColMap((m) => ({
                          ...m,
                          [f.id]: e.target.value === "" ? undefined : Number(e.target.value),
                        }))
                      }
                      className={f.required && (colMap?.[f.id] == null) ? "dli-missing" : ""}
                    >
                      <option value="">— not in file —</option>
                      {headers.map((h, i) => (
                        <option key={i} value={i}>
                          {COL_LETTERS(i)} · {String(h ?? "").trim() || "(blank)"}
                        </option>
                      ))}
                    </select>
                  </label>
                ))}
              </div>
            </section>

            {/* ── step 3: review ── */}
            {ready && (
              <>
                <section className="dli-card">
                  <div className="dli-cardHead">
                    <span className="dli-step">3</span>
                    <div>
                      <h2>Review what was read</h2>
                      <p dir="rtl">مراجعة البيانات المقروءة قبل الحفظ</p>
                    </div>
                  </div>

                  <div className="dli-kpis">
                    <Kpi label="Lines" ar="عدد السطور" value={stats.lines} tone="slate" />
                    <Kpi
                      label="Total quantity"
                      ar="إجمالي الكمية"
                      value={stats.byUnit.map(([u, q]) => `${fmt3(q)} ${u}`).join(" · ") || "—"}
                      tone="red"
                      small
                    />
                    <Kpi label="Branches" ar="الفروع" value={stats.branches.length} tone="teal" />
                    <Kpi
                      label="Date range"
                      ar="الفترة"
                      value={stats.dateFrom ? `${stats.dateFrom} → ${stats.dateTo}` : "—"}
                      tone="blue"
                      small
                    />
                  </div>

                  {(multiMonth || badDates > 0) && (
                    <div className="dli-note dli-noteWarn">
                      {multiMonth && (
                        <div>
                          ⚠ The file spans more than one month ({stats.months.join(", ")}). It will be saved under{" "}
                          <b>{monthLabel(effectivePeriod)}</b>; the comparison still uses each row's own date.
                        </div>
                      )}
                      {badDates > 0 && <div>⚠ {badDates} row(s) have an unreadable date — check the date column / order.</div>}
                    </div>
                  )}

                  <h3 className="dli-subhead">
                    Branch mapping — ربط مواقع أودو بفروعنا
                    <small>Odoo location → our branch code, used for matching</small>
                  </h3>
                  <div className="dli-tableWrap">
                    <table className="dli-table">
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
                            <td>
                              <span className="dli-chip">{l.auto || "—"}</span>
                            </td>
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
                                  <option key={b} value={b}>
                                    {b}
                                  </option>
                                ))}
                              </select>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <h3 className="dli-subhead">
                    Preview — معاينة
                    <small>first 25 of {stats.lines} rows</small>
                  </h3>
                  <div className="dli-tableWrap">
                    <table className="dli-table">
                      <thead>
                        <tr>
                          <th>#</th>
                          <th>Date</th>
                          <th>Branch</th>
                          <th>Reference</th>
                          <th>Code</th>
                          <th>Product</th>
                          <th>Category</th>
                          <th className="num">Qty</th>
                          <th>Unit</th>
                        </tr>
                      </thead>
                      <tbody>
                        {rows.slice(0, 25).map((r, i) => (
                          <tr key={`${r.srcRow}-${i}`}>
                            <td className="num">{i + 1}</td>
                            <td className={r.date ? "" : "bad"}>{r.date || "unreadable"}</td>
                            <td>
                              <span className="dli-chip">{r.branch || "—"}</span>
                            </td>
                            <td className="mono">{r.reference}</td>
                            <td className="mono">{r.code}</td>
                            <td>{r.product}</td>
                            <td>{r.category}</td>
                            <td className="num">{fmt3(r.qty)}</td>
                            <td>{r.uom}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </section>

                {/* ── step 4: save ── */}
                <section className="dli-card">
                  <div className="dli-cardHead">
                    <span className="dli-step">4</span>
                    <div>
                      <h2>Save this month</h2>
                      <p dir="rtl">حفظ السجل على الخادم بشكل منفصل عن سجل الإعدام الخاص بنا</p>
                    </div>
                  </div>

                  <div className="dli-grid3">
                    <label className="dli-field">
                      <span>Month — الشهر</span>
                      <input
                        type="month"
                        value={effectivePeriod}
                        onChange={(e) => {
                          setPeriod(e.target.value);
                          setPeriodTouched(true);
                        }}
                      />
                      <small className="dli-muted">{monthLabelAr(effectivePeriod)}</small>
                    </label>
                    <label className="dli-field" style={{ gridColumn: "span 2" }}>
                      <span>Notes — ملاحظات</span>
                      <input
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        placeholder="e.g. printed and signed by the store team on 02/08"
                      />
                    </label>
                  </div>

                  <div className="dli-actions">
                    <button className="dli-btn dli-primary" onClick={handleSave} disabled={!!busy || !ready}>
                      {busy ? "Working…" : "💾 Save disposal log"}
                    </button>
                    <button className="dli-btn dli-ghostDark" onClick={resetAll} disabled={!!busy}>
                      Start over
                    </button>
                    {saved && (
                      <button className="dli-btn dli-ok" onClick={() => navigate("/disposal-log/browse")}>
                        📊 Open comparison →
                      </button>
                    )}
                  </div>

                  {(error || msg) && (
                    <div className={`dli-note ${error ? "dli-noteErr" : "dli-noteOk"}`}>{error || msg}</div>
                  )}
                </section>
              </>
            )}
          </>
        )}

        <div className="dli-footer">Built by Eng. Mohammed Abdullah</div>
      </div>
    </div>
  );
}

function Kpi({ label, ar, value, tone = "slate", small = false }) {
  return (
    <div className={`dli-kpi dli-tone-${tone}`}>
      <div className="dli-kpiLbl">{label}</div>
      <div className={small ? "dli-kpiValSm" : "dli-kpiVal"}>{value}</div>
      <div className="dli-kpiAr" dir="rtl">{ar}</div>
    </div>
  );
}

/* ============================================================
   styles
   ============================================================ */
const CSS = `
.dli-page{min-height:100vh;padding:14px clamp(10px,2.2vw,26px) 26px;
  background:linear-gradient(180deg,#f5f8fb 0%,#eef3f8 100%);
  color:#0f172a;font-family:Cairo,Arial,sans-serif;box-sizing:border-box}
.dli-shell{width:min(1280px,100%);margin:0 auto}
.dli-hero{display:flex;gap:16px;align-items:center;justify-content:space-between;flex-wrap:wrap;
  padding:16px clamp(14px,2vw,24px);border-radius:8px;color:#fff;
  background:linear-gradient(135deg,#7f1d1d 0%,#b91c1c 45%,#0f766e 130%);
  box-shadow:0 18px 40px rgba(15,23,42,.18)}
.dli-hero h1{margin:2px 0 0;font-size:19px;font-weight:1000;line-height:1.3}
.dli-hero p{margin:4px 0 0;font-size:13.5px;font-weight:700;color:rgba(255,255,255,.9)}
.dli-kicker{font-size:11px;font-weight:900;letter-spacing:.4px;opacity:.85}
.dli-heroBtns{display:flex;gap:8px;flex-wrap:wrap}
.dli-btn{border:0;border-radius:6px;padding:9px 14px;font-family:inherit;font-size:13.5px;
  font-weight:900;cursor:pointer;transition:transform .12s ease,filter .12s ease}
.dli-btn:hover:not(:disabled){transform:translateY(-1px);filter:brightness(1.05)}
.dli-btn:disabled{opacity:.55;cursor:not-allowed}
.dli-ghost{background:rgba(255,255,255,.16);color:#fff;border:1px solid rgba(255,255,255,.3)}
.dli-ghostDark{background:#e2e8f0;color:#0f172a}
.dli-primary{background:linear-gradient(135deg,#b91c1c,#7f1d1d);color:#fff}
.dli-ok{background:linear-gradient(135deg,#0f766e,#14b8a6);color:#fff}
.dli-card{margin-top:14px;background:#fff;border:1px solid #e2e8f0;border-radius:8px;
  padding:14px clamp(12px,1.6vw,18px);box-shadow:0 12px 28px rgba(15,23,42,.06)}
.dli-cardHead{display:flex;align-items:center;gap:12px;flex-wrap:wrap;margin-bottom:12px}
.dli-cardHead h2{margin:0;font-size:16px;font-weight:1000}
.dli-cardHead p{margin:2px 0 0;font-size:13px;font-weight:700;color:#64748b}
.dli-step{width:30px;height:30px;flex:0 0 auto;border-radius:8px;display:grid;place-items:center;
  background:linear-gradient(135deg,#0f766e,#14b8a6);color:#fff;font-weight:1000;font-size:15px}
.dli-badge{margin-inline-start:auto;border-radius:999px;padding:5px 11px;font-size:12px;font-weight:900}
.dli-badge.ok{background:#ecfdf5;color:#047857;border:1px solid #a7f3d0}
.dli-badge.warn{background:#fffbeb;color:#b45309;border:1px solid #fde68a}
.dli-drop{display:flex;align-items:center;gap:14px;padding:20px;border:2px dashed #cbd5e1;border-radius:8px;
  background:#f8fafc;cursor:pointer;transition:border-color .15s ease,background .15s ease}
.dli-drop:hover{border-color:#0f766e;background:#f0fdfa}
.dli-dropIcon{font-size:34px}
.dli-muted{color:#64748b;font-size:12.5px;font-weight:700;margin-top:3px}
.dli-note{margin-top:10px;border-radius:6px;padding:9px 12px;font-size:13px;font-weight:800;line-height:1.6}
.dli-noteOk{background:#ecfdf5;color:#065f46;border:1px solid #a7f3d0}
.dli-noteErr{background:#fef2f2;color:#991b1b;border:1px solid #fecaca}
.dli-noteBusy{background:#eff6ff;color:#1e40af;border:1px solid #bfdbfe}
.dli-noteWarn{background:#fffbeb;color:#92400e;border:1px solid #fde68a}
.dli-grid3{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px}
.dli-grid4{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px;margin-top:10px}
.dli-field{display:flex;flex-direction:column;gap:5px;min-width:0}
.dli-field>span{font-size:12.5px;font-weight:900;color:#334155}
.dli-field select,.dli-field input{width:100%;box-sizing:border-box;border:1px solid #cbd5e1;border-radius:6px;
  padding:8px 9px;font-family:inherit;font-size:13px;font-weight:700;background:#fff;color:#0f172a}
.dli-field select:focus,.dli-field input:focus{outline:2px solid #99f6e4;border-color:#0f766e}
.dli-field select.dli-missing{border-color:#ef4444;background:#fff1f2}
.dli-req{color:#dc2626}
.dli-kpis{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px;margin-bottom:12px}
.dli-kpi{border:1px solid #e2e8f0;border-radius:8px;padding:10px 12px;background:#fff}
.dli-kpiLbl{font-size:11.5px;font-weight:900;color:#64748b;text-transform:uppercase;letter-spacing:.3px}
.dli-kpiVal{font-size:24px;font-weight:1000;line-height:1.2;margin-top:2px}
.dli-kpiValSm{font-size:14px;font-weight:1000;line-height:1.35;margin-top:4px;word-break:break-word}
.dli-kpiAr{font-size:12px;font-weight:800;color:#94a3b8;margin-top:2px}
.dli-tone-slate{border-top:3px solid #64748b}
.dli-tone-red{border-top:3px solid #b91c1c}
.dli-tone-teal{border-top:3px solid #0f766e}
.dli-tone-blue{border-top:3px solid #2563eb}
.dli-subhead{margin:16px 0 8px;font-size:14px;font-weight:1000;display:flex;align-items:baseline;gap:10px;flex-wrap:wrap}
.dli-subhead small{font-size:12px;font-weight:700;color:#94a3b8}
.dli-tableWrap{overflow-x:auto;border:1px solid #e2e8f0;border-radius:8px;max-height:420px;overflow-y:auto}
.dli-table{width:100%;border-collapse:collapse;font-size:12.5px;white-space:nowrap}
.dli-table th{position:sticky;top:0;z-index:1;background:#0f766e;color:#fff;font-weight:900;
  padding:8px 10px;text-align:left;font-size:11.5px;letter-spacing:.3px}
.dli-table td{padding:6px 10px;border-top:1px solid #eef2f7;font-weight:700;color:#1e293b}
.dli-table tbody tr:nth-child(even){background:#f8fafc}
.dli-table .num{text-align:right;font-variant-numeric:tabular-nums}
.dli-table .mono{font-family:ui-monospace,Consolas,monospace;font-size:12px;color:#475569}
.dli-table td.bad{color:#b91c1c;font-weight:900}
.dli-table select{border:1px solid #cbd5e1;border-radius:5px;padding:4px 6px;font-family:inherit;
  font-size:12px;font-weight:800;background:#fff}
.dli-chip{display:inline-block;background:#ecfeff;color:#0e7490;border:1px solid #a5f3fc;
  border-radius:999px;padding:2px 9px;font-size:11.5px;font-weight:900}
.dli-actions{display:flex;gap:8px;flex-wrap:wrap;margin-top:6px}
.dli-footer{margin:20px 0 0;text-align:center;color:#94a3b8;font-size:12px;font-weight:800}
@media (max-width:1000px){
  .dli-grid4{grid-template-columns:repeat(2,minmax(0,1fr))}
  .dli-kpis{grid-template-columns:repeat(2,minmax(0,1fr))}
}
@media (max-width:680px){
  .dli-grid3,.dli-grid4,.dli-kpis{grid-template-columns:1fr}
  .dli-hero{flex-direction:column;align-items:flex-start}
}
`;
