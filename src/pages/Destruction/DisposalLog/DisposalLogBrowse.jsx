// src/pages/Destruction/DisposalLog/DisposalLogBrowse.jsx
//
// مقارنة سجل الإعدام — Odoo Disposal Log ⇄ our Condemnation Register.
//
// Left side  = what the store team exported from Odoo  (type `odoo_disposal_log`)
// Right side = what we condemned ourselves             (type `destruction_record`)
//
// The page reconciles a whole month: per branch, per product code, per unit, and
// classifies every line as matched / quantity differs / only in Odoo / only in
// our records. Nothing is written back — this is a read + export view.

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import API_BASE from "../../../config/api";
import {
  DESTRUCTION_TYPE,
  STATUS,
  STATUS_META,
  TYPE,
  buildComparison,
  flattenDestructionRecords,
  fmt3,
  formatDMY,
  getRecordId,
  monthLabel,
  monthLabelAr,
  recordPeriod,
  safeArr,
} from "./disposalLogOptions";

/* ============================================================
   server
   ============================================================ */
async function fetchType(type) {
  const res = await fetch(`${API_BASE}/api/reports?type=${encodeURIComponent(type)}&limit=5000`, {
    cache: "no-store",
    headers: { Accept: "application/json" },
  });
  if (!res.ok) throw new Error(`Failed to load ${type} (${res.status})`);
  const json = await res.json().catch(() => []);
  return Array.isArray(json) ? json : json?.data ?? json?.items ?? [];
}

async function deleteReport(id) {
  const res = await fetch(`${API_BASE}/api/reports/${encodeURIComponent(id)}`, { method: "DELETE" });
  if (!res.ok) throw new Error(`Delete failed (${res.status})`);
}

/* ============================================================
   component
   ============================================================ */
export default function DisposalLogBrowse() {
  const navigate = useNavigate();

  const [logs, setLogs] = useState([]);
  const [destructions, setDestructions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedId, setSelectedId] = useState("");

  const [mode, setMode] = useState("month"); // month | day
  const [tolerance, setTolerance] = useState(0.005);
  const [statusFilter, setStatusFilter] = useState("all");
  const [branchFilter, setBranchFilter] = useState("all");
  const [query, setQuery] = useState("");
  const [expanded, setExpanded] = useState({});
  const [tab, setTab] = useState("lines"); // lines | branches

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [a, b] = await Promise.all([fetchType(TYPE), fetchType(DESTRUCTION_TYPE)]);
      const sorted = safeArr(a).sort((x, y) => String(recordPeriod(y)).localeCompare(String(recordPeriod(x))));
      setLogs(sorted);
      setDestructions(safeArr(b));
      setSelectedId((prev) => prev || getRecordId(sorted[0]) || "");
    } catch (e) {
      console.error(e);
      setError(e?.message || "Could not load data from the server.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const selected = useMemo(
    () => logs.find((r) => String(getRecordId(r)) === String(selectedId)) || null,
    [logs, selectedId]
  );
  const period = recordPeriod(selected);
  const odooRows = useMemo(() => safeArr(selected?.payload?.rows), [selected]);

  const mineRows = useMemo(
    () => flattenDestructionRecords(destructions, { period }),
    [destructions, period]
  );

  const cmp = useMemo(
    () => buildComparison(odooRows, mineRows, { mode, tolerance }),
    [odooRows, mineRows, mode, tolerance]
  );

  const branches = useMemo(
    () => Array.from(new Set(cmp.rows.map((r) => r.branch))).sort(),
    [cmp.rows]
  );

  const visibleRows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return cmp.rows.filter((r) => {
      if (statusFilter !== "all" && r.status !== statusFilter) return false;
      if (branchFilter !== "all" && r.branch !== branchFilter) return false;
      if (!q) return true;
      return `${r.code} ${r.product} ${r.branch} ${r.category}`.toLowerCase().includes(q);
    });
  }, [cmp.rows, statusFilter, branchFilter, query]);

  const toggle = (key) => setExpanded((m) => ({ ...m, [key]: !m[key] }));

  /* ── delete ── */
  const handleDelete = async (rec) => {
    const p = recordPeriod(rec);
    if (!window.confirm(`Delete the imported Odoo log for ${monthLabel(p)}?\n\nحذف سجل ${monthLabelAr(p)} المستورد؟`)) return;
    try {
      await deleteReport(getRecordId(rec));
      setSelectedId("");
      await load();
    } catch (e) {
      alert(e?.message || "Delete failed.");
    }
  };

  /* ── excel export (mirrors this view) ── */
  const exportExcel = async () => {
    if (!selected) return;
    try {
      const XLSX = await import("xlsx-js-style").catch(() => import("xlsx"));
      const wb = XLSX.utils.book_new();

      const summary = [
        ["ODOO DISPOSAL LOG — RECONCILIATION / مطابقة سجل الإعدام"],
        [],
        ["Month", monthLabel(period)],
        ["Imported file", selected?.payload?.meta?.fileName || ""],
        ["Imported by", selected?.payload?.meta?.importedBy || ""],
        ["Imported at", String(selected?.payload?.meta?.importedAt || "").slice(0, 19).replace("T", " ")],
        ["Match level", mode === "day" ? "Branch + product + date" : "Branch + product (whole month)"],
        [],
        ["", "Odoo file", "Our register", "Difference"],
        ["Source lines", cmp.totals.odooLines, cmp.totals.mineLines, ""],
        ["Total quantity", Number(cmp.totals.odooQty.toFixed(3)), Number(cmp.totals.mineQty.toFixed(3)), Number(cmp.totals.diff.toFixed(3))],
        [],
        ["Compared lines", cmp.totals.rows],
        ["Matched", cmp.totals.match],
        ["Quantity differs", cmp.totals.qtyDiff],
        ["Only in Odoo file", cmp.totals.odooOnly],
        ["Only in our records", cmp.totals.mineOnly],
        ["Match rate %", cmp.totals.matchRate],
      ];
      XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(summary), "Summary");

      const branchAoa = [
        ["Branch", "Compared lines", "Odoo qty", "Our qty", "Difference", "Matched", "Qty differs", "Only Odoo", "Only ours", "Coverage %"],
        ...cmp.branches.map((b) => [
          b.branch, b.lines,
          Number(b.odooQty.toFixed(3)), Number(b.mineQty.toFixed(3)), Number(b.diff.toFixed(3)),
          b.match, b.qtyDiff, b.odooOnly, b.mineOnly, b.coverage,
        ]),
      ];
      XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(branchAoa), "By branch");

      const linesAoa = [
        ["Status", "Branch", ...(mode === "day" ? ["Date"] : []), "Code", "Product", "Category",
          "Units", "Odoo qty", "Our qty", "Difference", "Odoo lines", "Our lines", "Odoo dates", "Odoo refs", "Our dates", "Our reasons"],
        ...visibleRows.map((r) => [
          STATUS_META[r.status].label,
          r.branch,
          ...(mode === "day" ? [r.bucket] : []),
          r.code,
          r.product,
          r.category,
          r.units.map((u) => u.unit).join(" / "),
          Number(r.odooQty.toFixed(3)),
          Number(r.mineQty.toFixed(3)),
          Number(r.diff.toFixed(3)),
          r.odooLines,
          r.mineLines,
          Array.from(new Set(r.odooDetails.map((d) => d.date))).join(", "),
          Array.from(new Set(r.odooDetails.map((d) => d.ref).filter(Boolean))).join(", "),
          Array.from(new Set(r.mineDetails.map((d) => d.date))).join(", "),
          Array.from(new Set(r.mineDetails.map((d) => d.reason).filter(Boolean))).join(", "),
        ]),
      ];
      XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(linesAoa), "Comparison");

      const rawAoa = [
        ["Date", "Odoo location", "Branch", "Reference", "Code", "Product", "Category", "Unit", "Qty", "Remarks"],
        ...odooRows.map((r) => [
          r.date, r.locationRaw, r.branch, r.reference, r.code, r.product, r.category, r.uom, Number(Number(r.qty).toFixed(3)), r.remarks,
        ]),
      ];
      XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(rawAoa), "Odoo raw");

      XLSX.writeFile(wb, `Disposal-Log-Reconciliation-${period || "month"}.xlsx`);
    } catch (e) {
      console.error(e);
      alert("Excel export failed.");
    }
  };

  /* ============================================================
     render
     ============================================================ */
  return (
    <div className="dlb-page">
      <style>{CSS}</style>
      <div className="dlb-shell">
        <header className="dlb-hero">
          <div>
            <div className="dlb-kicker">AL MAWASHI QMS · RECONCILIATION</div>
            <h1>⚖️ Disposal Log vs. Our Condemnations</h1>
            <p dir="rtl">مقارنة سجل الإعدام الشهري (أودو) مع سجل الإعدام الخاص بنا</p>
          </div>
          <div className="dlb-heroBtns">
            <button className="dlb-btn dlb-ghost" onClick={() => navigate("/disposal-log/import")}>
              📥 Import a month
            </button>
            <button className="dlb-btn dlb-ghost" onClick={load} disabled={loading}>
              {loading ? "Loading…" : "↻ Refresh"}
            </button>
            <button className="dlb-btn dlb-ghost" onClick={() => navigate("/returns/menu")}>
              ⬅ Back
            </button>
          </div>
        </header>

        {error && <div className="dlb-note err">{error}</div>}

        {/* ── saved months ── */}
        <section className="dlb-card">
          <h2 className="dlb-h2">
            Imported months — الأشهر المستوردة <small>{logs.length} saved</small>
          </h2>
          {loading && !logs.length ? (
            <div className="dlb-empty">Loading…</div>
          ) : !logs.length ? (
            <div className="dlb-empty">
              No Odoo disposal log imported yet.{" "}
              <button className="dlb-link" onClick={() => navigate("/disposal-log/import")}>
                Import the first month →
              </button>
            </div>
          ) : (
            <div className="dlb-months">
              {logs.map((rec) => {
                const p = recordPeriod(rec);
                const st = rec?.payload?.stats || {};
                const active = String(getRecordId(rec)) === String(selectedId);
                return (
                  <button
                    key={getRecordId(rec)}
                    className={`dlb-month ${active ? "active" : ""}`}
                    onClick={() => setSelectedId(getRecordId(rec))}
                  >
                    <div className="dlb-monthTop">
                      <strong>{monthLabel(p)}</strong>
                      <span dir="rtl">{monthLabelAr(p)}</span>
                    </div>
                    <div className="dlb-monthMeta">
                      {st.lines || 0} lines ·{" "}
                      {safeArr(st.byUnit).map(([u, q]) => `${fmt3(q)} ${u}`).join(" · ") || "—"}
                    </div>
                    <div className="dlb-monthFile" title={rec?.payload?.meta?.fileName || ""}>
                      📄 {rec?.payload?.meta?.fileName || "—"}
                    </div>
                    <span
                      className="dlb-del"
                      role="button"
                      tabIndex={0}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(rec);
                      }}
                      onKeyDown={(e) => e.key === "Enter" && handleDelete(rec)}
                      title="Delete this import"
                    >
                      🗑
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </section>

        {selected && (
          <>
            {/* ── KPI band ── */}
            <section className="dlb-kpis">
              <div className="dlb-kpi odoo">
                <div className="dlb-kpiLbl">Odoo file — ملف أودو</div>
                <div className="dlb-kpiVal">{fmt3(cmp.totals.odooQty)}</div>
                <div className="dlb-kpiSub">{cmp.totals.odooLines} source lines</div>
              </div>
              <div className="dlb-kpi mine">
                <div className="dlb-kpiLbl">Our register — سجلنا</div>
                <div className="dlb-kpiVal">{fmt3(cmp.totals.mineQty)}</div>
                <div className="dlb-kpiSub">{cmp.totals.mineLines} condemned lines</div>
              </div>
              <div className={`dlb-kpi ${Math.abs(cmp.totals.diff) < 0.005 ? "good" : "warn"}`}>
                <div className="dlb-kpiLbl">Difference — الفرق</div>
                <div className="dlb-kpiVal">
                  {cmp.totals.diff > 0 ? "+" : ""}
                  {fmt3(cmp.totals.diff)}
                </div>
                <div className="dlb-kpiSub">ours − Odoo</div>
              </div>
              <div className="dlb-kpi rate">
                <div className="dlb-kpiLbl">Match rate — نسبة التطابق</div>
                <div className="dlb-kpiVal">{cmp.totals.matchRate}%</div>
                <div className="dlb-kpiSub">{cmp.totals.match} of {cmp.totals.rows} lines</div>
              </div>
            </section>

            <section className="dlb-statusRow">
              {[
                [STATUS.MATCH, cmp.totals.match],
                [STATUS.QTY_DIFF, cmp.totals.qtyDiff],
                [STATUS.ODOO_ONLY, cmp.totals.odooOnly],
                [STATUS.MINE_ONLY, cmp.totals.mineOnly],
              ].map(([s, n]) => {
                const m = STATUS_META[s];
                return (
                  <button
                    key={s}
                    className={`dlb-statusCard ${statusFilter === s ? "on" : ""}`}
                    style={{ background: m.bg, borderColor: m.border, color: m.color }}
                    onClick={() => setStatusFilter((cur) => (cur === s ? "all" : s))}
                  >
                    <span className="dlb-statusIcon">{m.icon}</span>
                    <span className="dlb-statusN">{n}</span>
                    <span className="dlb-statusL">{m.label}</span>
                    <span className="dlb-statusAr" dir="rtl">{m.ar}</span>
                  </button>
                );
              })}
            </section>

            {/* ── toolbar ── */}
            <section className="dlb-card">
              <div className="dlb-toolbar">
                <div className="dlb-tabs">
                  <button className={tab === "lines" ? "on" : ""} onClick={() => setTab("lines")}>
                    📋 Line by line
                  </button>
                  <button className={tab === "branches" ? "on" : ""} onClick={() => setTab("branches")}>
                    🏬 By branch
                  </button>
                </div>

                <label className="dlb-ctl">
                  <span>Match level</span>
                  <select value={mode} onChange={(e) => setMode(e.target.value)}>
                    <option value="month">Whole month</option>
                    <option value="day">Same day</option>
                  </select>
                </label>

                <label className="dlb-ctl">
                  <span>Tolerance</span>
                  <input
                    type="number"
                    step="0.001"
                    min="0"
                    value={tolerance}
                    onChange={(e) => setTolerance(Number(e.target.value) || 0)}
                  />
                </label>

                <label className="dlb-ctl">
                  <span>Branch</span>
                  <select value={branchFilter} onChange={(e) => setBranchFilter(e.target.value)}>
                    <option value="all">All ({branches.length})</option>
                    {branches.map((b) => (
                      <option key={b} value={b}>{b}</option>
                    ))}
                  </select>
                </label>

                <label className="dlb-ctl grow">
                  <span>Search</span>
                  <input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="code, product, branch…"
                  />
                </label>

                <button className="dlb-btn dlb-primary" onClick={exportExcel}>⬇ Excel</button>
                <button className="dlb-btn dlb-ghostDark" onClick={() => window.print()}>🖨 Print</button>
              </div>

              <div className="dlb-metaLine">
                <b>{monthLabel(period)}</b> · file “{selected?.payload?.meta?.fileName || "—"}”
                {selected?.payload?.meta?.importedBy ? ` · imported by ${selected.payload.meta.importedBy}` : ""}
                {selected?.payload?.meta?.notes ? ` · ${selected.payload.meta.notes}` : ""}
                {!mineRows.length && (
                  <span className="dlb-warnInline">
                    {" "}⚠ No condemnation record exists in our register for this month.
                  </span>
                )}
              </div>
            </section>

            {/* ── branch table ── */}
            {tab === "branches" && (
              <section className="dlb-card">
                <div className="dlb-tableWrap">
                  <table className="dlb-table">
                    <thead>
                      <tr>
                        <th>Branch</th>
                        <th className="num">Odoo qty</th>
                        <th className="num">Our qty</th>
                        <th className="num">Difference</th>
                        <th className="num">Matched</th>
                        <th className="num">Qty differs</th>
                        <th className="num">Only Odoo</th>
                        <th className="num">Only ours</th>
                        <th className="num">Covered %</th>
                      </tr>
                    </thead>
                    <tbody>
                      {cmp.branches.map((b) => (
                        <tr key={b.branch}>
                          <td><span className="dlb-chip">{b.branch}</span></td>
                          <td className="num">{fmt3(b.odooQty)}</td>
                          <td className="num">{fmt3(b.mineQty)}</td>
                          <td className={`num ${Math.abs(b.diff) < 0.005 ? "" : "diff"}`}>
                            {b.diff > 0 ? "+" : ""}{fmt3(b.diff)}
                          </td>
                          <td className="num">{b.match}</td>
                          <td className="num">{b.qtyDiff}</td>
                          <td className="num bad">{b.odooOnly}</td>
                          <td className="num">{b.mineOnly}</td>
                          <td className="num">
                            <div className="dlb-bar">
                              <div className="dlb-barFill" style={{ width: `${b.coverage}%` }} />
                              <span>{b.coverage}%</span>
                            </div>
                          </td>
                        </tr>
                      ))}
                      {!cmp.branches.length && (
                        <tr><td colSpan={9} className="dlb-empty">Nothing to compare.</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </section>
            )}

            {/* ── line table ── */}
            {tab === "lines" && (
              <section className="dlb-card">
                <div className="dlb-resultLine">
                  Showing <b>{visibleRows.length}</b> of {cmp.rows.length} compared lines
                  {statusFilter !== "all" && (
                    <button className="dlb-link" onClick={() => setStatusFilter("all")}>clear status filter ✕</button>
                  )}
                </div>
                <div className="dlb-tableWrap tall">
                  <table className="dlb-table">
                    <thead>
                      <tr>
                        <th style={{ width: 28 }} />
                        <th>Status</th>
                        <th>Branch</th>
                        {mode === "day" && <th>Date</th>}
                        <th>Code</th>
                        <th>Product</th>
                        <th>Unit</th>
                        <th className="num">Odoo</th>
                        <th className="num">Ours</th>
                        <th className="num">Diff</th>
                      </tr>
                    </thead>
                    <tbody>
                      {visibleRows.map((r) => {
                        const m = STATUS_META[r.status];
                        const open = !!expanded[r.key];
                        return (
                          <React.Fragment key={r.key}>
                            <tr className={open ? "open" : ""} onClick={() => toggle(r.key)}>
                              <td className="exp">{open ? "▾" : "▸"}</td>
                              <td>
                                <span className="dlb-pill" style={{ background: m.bg, color: m.color, borderColor: m.border }}>
                                  {m.icon} {m.label}
                                </span>
                              </td>
                              <td><span className="dlb-chip">{r.branch}</span></td>
                              {mode === "day" && <td>{formatDMY(r.bucket)}</td>}
                              <td className="mono">{r.code || "—"}</td>
                              <td className="prod">
                                {r.product || "—"}
                                {r.matchedBy === "name" && <span className="dlb-tagSm" title="Matched by product name, not by code">name-match</span>}
                                {r.unitMismatch && <span className="dlb-tagSm warn" title="The two systems used different units">unit ≠</span>}
                              </td>
                              <td>{r.units.map((u) => u.unit).join(" / ")}</td>
                              <td className="num">{r.odooQty ? fmt3(r.odooQty) : "—"}</td>
                              <td className="num">{r.mineQty ? fmt3(r.mineQty) : "—"}</td>
                              <td className={`num ${Math.abs(r.diff) < 0.005 ? "" : "diff"}`}>
                                {r.diff > 0 ? "+" : ""}{fmt3(r.diff)}
                              </td>
                            </tr>
                            {open && (
                              <tr className="detail">
                                <td colSpan={mode === "day" ? 10 : 9}>
                                  <div className="dlb-detailGrid">
                                    <div>
                                      <h4>📄 Odoo file — {r.odooDetails.length} line(s)</h4>
                                      {r.odooDetails.length ? (
                                        <table className="dlb-mini">
                                          <thead>
                                            <tr><th>Date</th><th>Reference</th><th className="num">Qty</th><th>Unit</th></tr>
                                          </thead>
                                          <tbody>
                                            {r.odooDetails.map((d, i) => (
                                              <tr key={i}>
                                                <td>{formatDMY(d.date)}</td>
                                                <td className="mono">{d.ref || "—"}</td>
                                                <td className="num">{fmt3(d.qty)}</td>
                                                <td>{d.uom}</td>
                                              </tr>
                                            ))}
                                          </tbody>
                                        </table>
                                      ) : (
                                        <div className="dlb-none">Not present in the Odoo export.</div>
                                      )}
                                    </div>
                                    <div>
                                      <h4>🗑 Our condemnation register — {r.mineDetails.length} line(s)</h4>
                                      {r.mineDetails.length ? (
                                        <table className="dlb-mini">
                                          <thead>
                                            <tr><th>Date</th><th>Reason</th><th className="num">Qty</th><th>Unit</th><th className="num">Photos</th></tr>
                                          </thead>
                                          <tbody>
                                            {r.mineDetails.map((d, i) => (
                                              <tr key={i}>
                                                <td>{formatDMY(d.date)}</td>
                                                <td>{d.reason || "—"}</td>
                                                <td className="num">{fmt3(d.qty)}</td>
                                                <td>{d.uom}</td>
                                                <td className="num">{d.images || 0}</td>
                                              </tr>
                                            ))}
                                          </tbody>
                                        </table>
                                      ) : (
                                        <div className="dlb-none">
                                          Not condemned in our system — لم يُسجَّل لدينا.
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                  {r.units.length > 1 && (
                                    <div className="dlb-unitNote">
                                      Per unit:{" "}
                                      {r.units.map((u) => `${u.unit}: Odoo ${fmt3(u.odoo)} / ours ${fmt3(u.mine)}`).join(" · ")}
                                    </div>
                                  )}
                                </td>
                              </tr>
                            )}
                          </React.Fragment>
                        );
                      })}
                      {!visibleRows.length && (
                        <tr>
                          <td colSpan={mode === "day" ? 10 : 9} className="dlb-empty">
                            No line matches the current filters.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </section>
            )}
          </>
        )}

        <div className="dlb-footer">Built by Eng. Mohammed Abdullah</div>
      </div>
    </div>
  );
}

/* ============================================================
   styles
   ============================================================ */
const CSS = `
.dlb-page{min-height:100vh;padding:14px clamp(10px,2.2vw,26px) 26px;
  background:linear-gradient(180deg,#f5f8fb 0%,#eef3f8 100%);
  color:#0f172a;font-family:Cairo,Arial,sans-serif;box-sizing:border-box}
.dlb-shell{width:min(1440px,100%);margin:0 auto}
.dlb-hero{display:flex;gap:16px;align-items:center;justify-content:space-between;flex-wrap:wrap;
  padding:16px clamp(14px,2vw,24px);border-radius:8px;color:#fff;
  background:linear-gradient(135deg,#0f172a 0%,#155e75 45%,#0f766e 100%);
  box-shadow:0 18px 40px rgba(15,23,42,.2)}
.dlb-hero h1{margin:2px 0 0;font-size:19px;font-weight:1000;line-height:1.3}
.dlb-hero p{margin:4px 0 0;font-size:13.5px;font-weight:700;color:rgba(255,255,255,.9)}
.dlb-kicker{font-size:11px;font-weight:900;letter-spacing:.4px;opacity:.85}
.dlb-heroBtns{display:flex;gap:8px;flex-wrap:wrap}
.dlb-btn{border:0;border-radius:6px;padding:9px 14px;font-family:inherit;font-size:13.5px;
  font-weight:900;cursor:pointer;transition:transform .12s ease,filter .12s ease}
.dlb-btn:hover:not(:disabled){transform:translateY(-1px);filter:brightness(1.06)}
.dlb-btn:disabled{opacity:.55;cursor:not-allowed}
.dlb-ghost{background:rgba(255,255,255,.16);color:#fff;border:1px solid rgba(255,255,255,.3)}
.dlb-ghostDark{background:#e2e8f0;color:#0f172a}
.dlb-primary{background:linear-gradient(135deg,#0f766e,#14b8a6);color:#fff}
.dlb-card{margin-top:12px;background:#fff;border:1px solid #e2e8f0;border-radius:8px;
  padding:12px clamp(10px,1.5vw,16px);box-shadow:0 12px 28px rgba(15,23,42,.06)}
.dlb-h2{margin:0 0 10px;font-size:15px;font-weight:1000;display:flex;align-items:baseline;gap:10px}
.dlb-h2 small{font-size:12px;font-weight:800;color:#94a3b8}
.dlb-note{margin-top:12px;border-radius:6px;padding:9px 12px;font-size:13px;font-weight:800}
.dlb-note.err{background:#fef2f2;color:#991b1b;border:1px solid #fecaca}
.dlb-empty{padding:18px;text-align:center;color:#64748b;font-size:13.5px;font-weight:800}
.dlb-link{border:0;background:none;color:#0f766e;font-family:inherit;font-size:13px;font-weight:900;
  cursor:pointer;text-decoration:underline;padding:0 6px}

.dlb-months{display:grid;grid-template-columns:repeat(auto-fill,minmax(215px,1fr));gap:10px}
.dlb-month{position:relative;text-align:left;border:1px solid #e2e8f0;border-radius:8px;padding:10px 12px;
  background:#fff;cursor:pointer;font-family:inherit;transition:border-color .14s ease,box-shadow .14s ease}
.dlb-month:hover{border-color:#5eead4;box-shadow:0 8px 20px rgba(15,23,42,.08)}
.dlb-month.active{border-color:#0f766e;box-shadow:0 0 0 2px #99f6e4 inset;background:#f0fdfa}
.dlb-monthTop{display:flex;justify-content:space-between;gap:8px;font-size:14px;font-weight:1000;color:#0f172a}
.dlb-monthTop span{color:#64748b;font-size:12.5px;font-weight:800}
.dlb-monthMeta{margin-top:4px;font-size:12px;font-weight:800;color:#0f766e}
.dlb-monthFile{margin-top:3px;font-size:11.5px;font-weight:700;color:#94a3b8;overflow:hidden;
  text-overflow:ellipsis;white-space:nowrap}
.dlb-del{position:absolute;top:6px;right:8px;font-size:13px;opacity:.35;cursor:pointer}
.dlb-del:hover{opacity:1}

.dlb-kpis{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px;margin-top:12px}
.dlb-kpi{background:#fff;border:1px solid #e2e8f0;border-radius:8px;padding:11px 13px;
  box-shadow:0 10px 24px rgba(15,23,42,.05)}
.dlb-kpiLbl{font-size:11.5px;font-weight:900;color:#64748b}
.dlb-kpiVal{font-size:26px;font-weight:1000;line-height:1.15;margin-top:2px;font-variant-numeric:tabular-nums}
.dlb-kpiSub{font-size:11.5px;font-weight:800;color:#94a3b8;margin-top:2px}
.dlb-kpi.odoo{border-top:3px solid #b91c1c}
.dlb-kpi.mine{border-top:3px solid #0f766e}
.dlb-kpi.good{border-top:3px solid #16a34a}
.dlb-kpi.good .dlb-kpiVal{color:#15803d}
.dlb-kpi.warn{border-top:3px solid #d97706}
.dlb-kpi.warn .dlb-kpiVal{color:#b45309}
.dlb-kpi.rate{border-top:3px solid #2563eb}

.dlb-statusRow{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px;margin-top:10px}
.dlb-statusCard{display:grid;grid-template-columns:auto 1fr;grid-template-rows:auto auto;gap:2px 10px;
  align-items:center;border:1px solid;border-radius:8px;padding:9px 12px;cursor:pointer;
  font-family:inherit;text-align:left;transition:transform .12s ease}
.dlb-statusCard:hover{transform:translateY(-1px)}
.dlb-statusCard.on{box-shadow:0 0 0 2px currentColor inset}
.dlb-statusIcon{grid-row:span 2;font-size:20px;font-weight:1000}
.dlb-statusN{font-size:20px;font-weight:1000;line-height:1}
.dlb-statusL{font-size:12px;font-weight:900;grid-column:2}
.dlb-statusAr{display:none}

.dlb-toolbar{display:flex;gap:8px;align-items:flex-end;flex-wrap:wrap}
.dlb-tabs{display:flex;gap:4px;background:#f1f5f9;border-radius:6px;padding:3px}
.dlb-tabs button{border:0;background:transparent;border-radius:5px;padding:7px 12px;font-family:inherit;
  font-size:13px;font-weight:900;color:#475569;cursor:pointer}
.dlb-tabs button.on{background:#fff;color:#0f766e;box-shadow:0 2px 6px rgba(15,23,42,.1)}
.dlb-ctl{display:flex;flex-direction:column;gap:4px}
.dlb-ctl.grow{flex:1;min-width:160px}
.dlb-ctl>span{font-size:11.5px;font-weight:900;color:#64748b}
.dlb-ctl select,.dlb-ctl input{border:1px solid #cbd5e1;border-radius:6px;padding:7px 9px;
  font-family:inherit;font-size:13px;font-weight:800;background:#fff;color:#0f172a;min-width:110px}
.dlb-ctl.grow input{width:100%;box-sizing:border-box}
.dlb-metaLine{margin-top:9px;font-size:12.5px;font-weight:800;color:#64748b}
.dlb-warnInline{color:#b45309}
.dlb-resultLine{font-size:12.5px;font-weight:800;color:#64748b;margin-bottom:8px}

.dlb-tableWrap{overflow:auto;border:1px solid #e2e8f0;border-radius:8px}
.dlb-tableWrap.tall{max-height:640px}
.dlb-table{width:100%;border-collapse:collapse;font-size:12.5px}
.dlb-table th{position:sticky;top:0;z-index:2;background:#0f172a;color:#fff;font-weight:900;
  padding:8px 10px;text-align:left;font-size:11.5px;white-space:nowrap}
.dlb-table td{padding:6px 10px;border-top:1px solid #eef2f7;font-weight:700;color:#1e293b;vertical-align:top}
.dlb-table tbody tr:not(.detail):hover{background:#f0fdfa;cursor:pointer}
.dlb-table tr.open td{background:#f0fdfa}
.dlb-table .num{text-align:right;font-variant-numeric:tabular-nums;white-space:nowrap}
.dlb-table .mono{font-family:ui-monospace,Consolas,monospace;font-size:12px;color:#475569}
.dlb-table .prod{min-width:220px;white-space:normal}
.dlb-table .exp{color:#94a3b8;font-weight:900}
.dlb-table .diff{color:#b45309;font-weight:1000}
.dlb-table .bad{color:#b91c1c;font-weight:900}
.dlb-pill{display:inline-block;border:1px solid;border-radius:999px;padding:2px 9px;font-size:11px;
  font-weight:900;white-space:nowrap}
.dlb-chip{display:inline-block;background:#ecfeff;color:#0e7490;border:1px solid #a5f3fc;
  border-radius:999px;padding:2px 9px;font-size:11.5px;font-weight:900;white-space:nowrap}
.dlb-tagSm{display:inline-block;margin-inline-start:6px;background:#f1f5f9;color:#475569;border-radius:4px;
  padding:1px 6px;font-size:10.5px;font-weight:900}
.dlb-tagSm.warn{background:#fffbeb;color:#b45309}
.dlb-bar{position:relative;height:16px;background:#f1f5f9;border-radius:4px;overflow:hidden;min-width:70px}
.dlb-barFill{position:absolute;inset:0 auto 0 0;background:linear-gradient(90deg,#14b8a6,#0f766e)}
.dlb-bar span{position:relative;display:block;text-align:center;font-size:10.5px;font-weight:1000;
  line-height:16px;color:#0f172a}

.dlb-table tr.detail td{background:#f8fafc;padding:10px 14px}
.dlb-table tr.detail:hover{background:#f8fafc;cursor:default}
.dlb-detailGrid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:14px}
.dlb-detailGrid h4{margin:0 0 6px;font-size:12.5px;font-weight:1000;color:#334155}
.dlb-mini{width:100%;border-collapse:collapse;font-size:12px;background:#fff;
  border:1px solid #e2e8f0;border-radius:6px;overflow:hidden}
.dlb-mini th{background:#e2e8f0;color:#334155;padding:5px 8px;text-align:left;font-size:11px;font-weight:900;position:static}
.dlb-mini td{padding:4px 8px;border-top:1px solid #f1f5f9;font-weight:700}
.dlb-mini .num{text-align:right}
.dlb-none{padding:8px 10px;background:#fff;border:1px dashed #cbd5e1;border-radius:6px;
  font-size:12px;font-weight:800;color:#64748b}
.dlb-unitNote{margin-top:8px;font-size:11.5px;font-weight:800;color:#64748b}
.dlb-footer{margin:20px 0 0;text-align:center;color:#94a3b8;font-size:12px;font-weight:800}

@media (max-width:1000px){
  .dlb-kpis,.dlb-statusRow{grid-template-columns:repeat(2,minmax(0,1fr))}
  .dlb-detailGrid{grid-template-columns:1fr}
}
@media (max-width:640px){
  .dlb-kpis,.dlb-statusRow{grid-template-columns:1fr}
  .dlb-hero{flex-direction:column;align-items:flex-start}
}
@media print{
  .dlb-hero,.dlb-heroBtns,.dlb-toolbar,.dlb-months,.dlb-del{display:none !important}
  .dlb-page{background:#fff;padding:0}
  .dlb-card{box-shadow:none;border:0}
  .dlb-tableWrap,.dlb-tableWrap.tall{max-height:none;overflow:visible;border:1px solid #cbd5e1}
}
`;
