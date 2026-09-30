// src/companies/exaltis/reports/dailyLog/LogSheet.jsx
// Daily log engine — the printable sheet of one day's log.
// (Split out of SweetsDailyLog.jsx — the code is unchanged.)
import React, { useRef, useState } from "react";
import { reportDateOf, reportId } from "../../../../pages/monitor/branches/_shared/reportApi";
import { SweetsReportActions, excelFromNode, pdfFromNode, printNode } from "../_sweetsReportKit";
import { canEdit, canDelete } from "../../../../utils/perms";
import { REPORTS_URL, credentials, fmtDate, listText, statusOf, summarize } from "./logCore";
import { S, TONE, Hint } from "./logStyles";

/* ═════════════════════════ Saved sheet (read-only) ═════════════════════════ */
export function LogSheet({ schema, record, onBack, onEdit, onDeleted }) {
  const ref = useRef(null);
  const [busy, setBusy] = useState(false);
  const p = record.payload || {};
  const date = reportDateOf(record);
  const header = { ...(p.header || {}), reportDate: date };
  const s = summarize(schema, p);
  const file = `${schema.type}_${date}`;

  async function del() {
    if (!window.confirm(`Delete the ${schema.label} sheet of ${fmtDate(date)}?`)) return;
    setBusy(true);
    try {
      const res = await fetch(`${REPORTS_URL}/${encodeURIComponent(reportId(record))}`, { method: "DELETE", credentials });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      onDeleted();
    } catch (e) {
      alert(`Failed to delete: ${e.message || e}`);
      setBusy(false);
    }
  }
  const run = (fn) => async () => { setBusy(true); try { await fn(); } finally { setBusy(false); } };

  return (
    <div style={S.wrap}>
      <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 10, marginBottom: 12 }}>
        <button onClick={onBack} style={S.btn("#e2e8f0", "#334155")}>← All sheets</button>
        <SweetsReportActions
          busy={busy}
          onEdit={canEdit("daily") ? onEdit : undefined}
          onExcel={run(() => excelFromNode(ref.current, file, schema.label))}
          onPdf={run(() => pdfFromNode(ref.current, file))}
          onPrint={() => printNode(ref.current, `${schema.title} — ${fmtDate(date)}`)}
          onDelete={canDelete("daily") ? del : undefined}
        />
      </div>

      <div ref={ref} style={{ ...S.card, padding: "1.2rem" }}>
        <h2 style={{ ...S.h2, marginBottom: 10 }}>{schema.icon} {schema.title}</h2>
        <table style={{ borderCollapse: "collapse", width: "100%", marginBottom: 14 }}>
          <tbody>
            <tr>
              <th style={S.th}>Date</th><td style={S.tdView}>{fmtDate(date)}</td>
              {schema.header.map((f) => (
                <React.Fragment key={f.key}><th style={S.th}>{f.label}</th><td style={S.tdView}>{header[f.key] || "—"}</td></React.Fragment>
              ))}
            </tr>
            <tr>
              <th style={S.th}>Rows</th><td style={S.tdView}>{s.rows}</td>
              <th style={S.th}>Non-compliant</th><td style={{ ...S.tdView, color: s.fails ? "#b91c1c" : "#047857", fontWeight: 800 }}>{s.fails}</td>
              <th style={S.th}>To review</th><td style={{ ...S.tdView, color: s.warns ? "#b45309" : "#047857", fontWeight: 800 }}>{s.warns}</td>
              <td colSpan={2} style={S.tdView} />
            </tr>
          </tbody>
        </table>

        {schema.tables.map((t) => {
          const rows = p[t.key] || [];
          return (
            <div key={t.key} style={{ marginBottom: 16 }}>
              <h3 style={{ margin: "0 0 8px", fontSize: 15, fontWeight: 900, color: "#134e4a" }}>{t.title}</h3>
              <div style={{ overflowX: "auto" }}>
                <table style={{ borderCollapse: "collapse", width: "100%" }}>
                  <thead>
                    <tr>
                      <th style={S.th}>#</th>
                      {t.columns.map((c) => <th key={c.key} style={S.th}>{c.label}<Hint c={c} /></th>)}
                      <th style={S.th}>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((r, i) => {
                      const st = statusOf(t, r, header);
                      const tone = st && st.level !== "ok" ? TONE[st.level].bg : undefined;
                      return (
                        <tr key={i} style={{ background: tone }}>
                          <td style={{ ...S.tdView, color: "#94a3b8" }}>{i + 1}</td>
                          {t.columns.map((c) => (
                            <td key={c.key} style={S.tdView}>
                              {c.type === "list"
                                ? listText(c, r[c.key]).map((line, k) => <div key={k} style={{ whiteSpace: "nowrap" }}>{line}</div>)
                                : c.type === "date" ? (r[c.key] ? fmtDate(r[c.key]) : "") : (r[c.key] ?? "")}
                            </td>
                          ))}
                          <td style={S.tdView}>{st ? `${st.level === "ok" ? "✓" : st.level === "warn" ? "!" : "✕"} ${st.text}` : ""}</td>
                        </tr>
                      );
                    })}
                    {!rows.length && <tr><td colSpan={t.columns.length + 2} style={{ ...S.tdView, color: "#94a3b8" }}>No rows.</td></tr>}
                  </tbody>
                </table>
              </div>
            </div>
          );
        })}

        {p.notes && (
          <table style={{ borderCollapse: "collapse", width: "100%" }}>
            <tbody><tr><th style={{ ...S.th, width: 120 }}>Notes</th><td style={S.tdView}>{p.notes}</td></tr></tbody>
          </table>
        )}
      </div>
    </div>
  );
}
