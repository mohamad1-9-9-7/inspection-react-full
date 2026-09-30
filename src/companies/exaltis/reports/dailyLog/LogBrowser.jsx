// src/companies/exaltis/reports/dailyLog/LogBrowser.jsx
// Daily log engine — browse saved days by period.
// (Split out of SweetsDailyLog.jsx — the code is unchanged.)
import { useState, useCallback, useEffect, useMemo } from "react";
import { listReports, reportDateOf, reportId } from "../../../../pages/monitor/branches/_shared/reportApi";
import { fmtDate, summarize, PERIODS, periodStart } from "./logCore";
import { S, StatusPill } from "./logStyles";
import { LogSheet } from "./LogSheet";
import { LogForm } from "./LogForm";

export function LogBrowser({ schema }) {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [month, setMonth] = useState("");
  const [onlyIssues, setOnlyIssues] = useState(false);
  const [openId, setOpenId] = useState(null);
  const [editing, setEditing] = useState(false);
  const [period, setPeriod] = useState(3);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const from = periodStart(period);
      const rows = await listReports(schema.type, from ? { from } : {});
      setRecords(rows.sort((a, b) => reportDateOf(b).localeCompare(reportDateOf(a))));
    } catch {
      setError("Failed to load sheets. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [schema.type, period]);
  useEffect(() => { load(); }, [load]);

  const months = useMemo(() => [...new Set(records.map((r) => reportDateOf(r).slice(0, 7)).filter(Boolean))], [records]);
  const enriched = useMemo(() => records.map((r) => ({ r, s: summarize(schema, r.payload || {}), text: JSON.stringify(r.payload || {}).toLowerCase() })), [records, schema]);
  const q = search.trim().toLowerCase();
  const shown = enriched.filter(({ r, s, text }) =>
    (!month || reportDateOf(r).startsWith(month)) && (!onlyIssues || s.fails || s.warns) && (!q || text.includes(q)));

  const open = records.find((r) => reportId(r) === openId) || null;
  if (open && editing) {
    return <LogForm schema={schema} record={open} onCancel={() => setEditing(false)} onSaved={() => { setEditing(false); load(); }} />;
  }
  if (open) {
    return (
      <LogSheet
        schema={schema}
        record={open}
        onBack={() => setOpenId(null)}
        onEdit={() => setEditing(true)}
        onDeleted={() => { setOpenId(null); load(); }}
      />
    );
  }

  return (
    <div style={S.wrap}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10, marginBottom: 14 }}>
        <div>
          <h2 style={S.h2}>{schema.icon} {schema.title}</h2>
          <p style={S.sub}>{records.length} sheet(s) · {PERIODS.find((p) => p.months === period)?.label}</p>
        </div>
        <button onClick={load} style={S.btn("#0891b2")}>↻ Refresh</button>
      </div>

      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 14 }}>
        <input
          style={{ ...S.input, flex: "1 1 260px", background: "#fff" }}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="🔍 Search anything — product, supplier, lot / batch no., equipment…"
        />
        <select
          style={{ ...S.input, flex: "0 0 160px", background: "#fff" }}
          value={period}
          onChange={(e) => { setMonth(""); setPeriod(Number(e.target.value)); }}
          title="Which period to load from the server"
        >
          {PERIODS.map((p) => <option key={p.months} value={p.months}>{p.label}</option>)}
        </select>
        <select style={{ ...S.input, flex: "0 0 160px", background: "#fff" }} value={month} onChange={(e) => setMonth(e.target.value)}>
          <option value="">All months</option>
          {months.map((m) => <option key={m} value={m}>{m}</option>)}
        </select>
        <label style={{ display: "flex", alignItems: "center", gap: 6, fontWeight: 800, fontSize: 13, color: "#334155" }}>
          <input type="checkbox" checked={onlyIssues} onChange={(e) => setOnlyIssues(e.target.checked)} /> Only with issues
        </label>
      </div>

      {loading && <div style={{ textAlign: "center", padding: 40, color: "#64748b", fontWeight: 700 }}>⏳ Loading…</div>}
      {error && <div style={{ ...S.card, background: "#fef2f2", color: "#b91c1c", fontWeight: 700 }}>⚠️ {error}</div>}
      {!loading && !error && !shown.length && (
        <div style={{ textAlign: "center", padding: 40, color: "#94a3b8", fontWeight: 700 }}>{records.length
            ? "No sheet matches the filters."
            : period ? "No sheets in this period — choose a longer one above." : "No sheets saved yet."}</div>
      )}

      {!loading && !error && shown.map(({ r, s }) => {
        const h = r.payload?.header || {};
        return (
          <button key={reportId(r)} onClick={() => setOpenId(reportId(r))} style={{ ...S.card, display: "block", width: "100%", textAlign: "left", cursor: "pointer", padding: "0.9rem 1.1rem" }}>
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
