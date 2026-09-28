// src/pages/industry-kit/log/LogBrowser.jsx
// Saved sheets of one log type: period, month, "only with issues", free-text
// search and sort. The list loads ONE period, not the whole history — a daily
// log gains a sheet a day and each sheet carries its full payload; widening
// the period is one click.

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { reportDateOf, reportId } from "../../monitor/branches/_shared/reportApi";
import { StatusPill } from "./Cell";
import LogForm from "./LogForm";
import LogSheet from "./LogSheet";
import { listSheets } from "./api";
import { fmtDate, periodStart, summarize } from "./rows";
import { S } from "./styles";

const PERIODS = [
  { months: 3, label: "Last 3 months" },
  { months: 6, label: "Last 6 months" },
  { months: 12, label: "Last 12 months" },
  { months: 0, label: "All time" },
];
const SORTS = {
  newest: { label: "Newest first", cmp: (a, b) => reportDateOf(b.r).localeCompare(reportDateOf(a.r)) },
  oldest: { label: "Oldest first", cmp: (a, b) => reportDateOf(a.r).localeCompare(reportDateOf(b.r)) },
  issues: { label: "Most issues first", cmp: (a, b) => (b.s.fails - a.s.fails) || (b.s.warns - a.s.warns) || reportDateOf(b.r).localeCompare(reportDateOf(a.r)) },
};

export default function LogBrowser({ schema }) {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [month, setMonth] = useState("");
  const [onlyIssues, setOnlyIssues] = useState(false);
  const [sort, setSort] = useState("newest");
  const [period, setPeriod] = useState(3);
  const [openId, setOpenId] = useState(null);
  const [editing, setEditing] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      setRecords(await listSheets(schema.type, { from: periodStart(period) || undefined }));
    } catch {
      setError("Failed to load sheets. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [schema.type, period]);
  useEffect(() => { load(); }, [load]);

  const months = useMemo(() => [...new Set(records.map((r) => reportDateOf(r).slice(0, 7)).filter(Boolean))], [records]);
  const enriched = useMemo(
    () => records.map((r) => ({ r, s: summarize(schema, r.payload || {}), text: JSON.stringify(r.payload || {}).toLowerCase() })),
    [records, schema]
  );
  const q = search.trim().toLowerCase();
  const shown = enriched
    .filter(({ r, s, text }) => (!month || reportDateOf(r).startsWith(month)) && (!onlyIssues || s.fails || s.warns) && (!q || text.includes(q)))
    .sort(SORTS[sort].cmp);
  const filtered = !!(q || month || onlyIssues);

  const open = records.find((r) => reportId(r) === openId) || null;
  if (open && editing) {
    return <LogForm schema={schema} record={open} onCancel={() => setEditing(false)} onSaved={() => { setEditing(false); load(); }} />;
  }
  if (open) {
    return <LogSheet schema={schema} record={open} onBack={() => setOpenId(null)} onEdit={() => setEditing(true)} onDeleted={() => { setOpenId(null); load(); }} />;
  }

  const field = { ...S.input, background: "#fff" };
  return (
    <div style={S.wrap}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10, marginBottom: 14 }}>
        <div>
          <h2 style={S.h2}>{schema.icon} {schema.title}</h2>
          <p style={S.sub}>{records.length} sheet(s) · {PERIODS.find((p) => p.months === period)?.label}</p>
        </div>
        <button type="button" onClick={load} style={S.btn("#0891b2")}>↻ Refresh</button>
      </div>

      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 10 }}>
        <input style={{ ...field, flex: "1 1 260px" }} value={search} onChange={(e) => setSearch(e.target.value)} placeholder="🔍 Search anything — product, supplier, batch, area, name…" />
        <select style={{ ...field, flex: "0 0 160px" }} value={period} onChange={(e) => { setMonth(""); setPeriod(Number(e.target.value)); }} title="Which period to load from the server">
          {PERIODS.map((p) => <option key={p.months} value={p.months}>{p.label}</option>)}
        </select>
        <select style={{ ...field, flex: "0 0 150px" }} value={month} onChange={(e) => setMonth(e.target.value)}>
          <option value="">All months</option>
          {months.map((m) => <option key={m} value={m}>{m}</option>)}
        </select>
        <select style={{ ...field, flex: "0 0 170px" }} value={sort} onChange={(e) => setSort(e.target.value)}>
          {Object.entries(SORTS).map(([k, v]) => <option key={k} value={k}>Sort: {v.label}</option>)}
        </select>
        <label style={{ display: "flex", alignItems: "center", gap: 6, fontWeight: 800, fontSize: 13, color: "#334155" }}>
          <input type="checkbox" checked={onlyIssues} onChange={(e) => setOnlyIssues(e.target.checked)} /> Only with issues
        </label>
      </div>
      {!loading && !error && records.length > 0 && (
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12, color: "#64748b", fontWeight: 700, fontSize: 13 }}>
          Showing {shown.length} of {records.length}
          {filtered && (
            <button type="button" onClick={() => { setSearch(""); setMonth(""); setOnlyIssues(false); }} style={{ ...S.btn("#f1f5f9", "#334155"), padding: "4px 10px" }}>
              Clear filters
            </button>
          )}
        </div>
      )}

      {loading && <div style={{ ...S.empty, color: "#64748b" }}>⏳ Loading…</div>}
      {error && <div style={{ ...S.card, background: "#fef2f2", color: "#b91c1c", fontWeight: 700 }}>⚠️ {error}</div>}
      {!loading && !error && !shown.length && (
        <div style={S.empty}>
          {records.length ? "No sheet matches the filters." : period ? "No sheets in this period — choose a longer one above." : "No sheets saved yet."}
        </div>
      )}

      {!loading && !error && shown.map(({ r, s }) => {
        const h = r.payload?.header || {};
        return (
          <button key={reportId(r)} type="button" onClick={() => setOpenId(reportId(r))} style={{ ...S.card, display: "block", width: "100%", textAlign: "left", cursor: "pointer", padding: "0.9rem 1.1rem", fontFamily: "inherit" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
              <div>
                <div style={{ fontWeight: 900, fontSize: 16 }}>📅 {fmtDate(reportDateOf(r))}</div>
                <div style={{ color: "#64748b", fontWeight: 600, fontSize: 13, marginTop: 2 }}>
                  {[h.shift, h.checkedBy && `Checked: ${h.checkedBy}`, h.verifiedBy && `Verified: ${h.verifiedBy}`].filter(Boolean).join(" · ") || "—"}
                </div>
              </div>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                <StatusPill status={{ level: "ok", text: `${s.rows} rows` }} />
                {s.fails > 0 && <StatusPill status={{ level: "fail", text: `${s.fails} non-compliant` }} />}
                {s.warns > 0 && <StatusPill status={{ level: "warn", text: `${s.warns} to review` }} />}
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
}
