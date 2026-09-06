// src/pages/shared/EmailSendHistory.jsx
//
// "Who was this report e-mailed to, how many times, and did it go out?"
//
// EmailSendModal already writes an audit row to /api/email-history after every
// successful send. This panel is the read side of it, scoped to ONE record
// instead of the whole Email Center: pass the report type plus the record's
// reference (and/or its date) and it shows the send log for that record only.
//
// Two things it does deliberately:
//   * It filters client-side as well as server-side. A server that predates the
//     `report_ref` / `report_date` filters ignores unknown query params and
//     answers with every row of that type — without the local pass the panel
//     would claim a report was sent when it was a different one.
//   * It never blocks the page. The log is an audit convenience; if it fails,
//     it says so quietly and the report is still fully usable.

import React, { useCallback, useEffect, useMemo, useState } from "react";
import API_BASE from "../../config/api";

const METHOD_LABEL = {
  server:  { icon: "🚀", en: "Direct send" },
  outlook: { icon: "📧", en: "Outlook (.eml)" },
  gmail:   { icon: "✉️", en: "Gmail" },
  mailto:  { icon: "📮", en: "Mail client" },
  copy:    { icon: "📋", en: "Copied" },
};

const STATUS_STYLE = {
  sent:    { bg: "#ecfdf5", fg: "#065f46", bd: "#6ee7b7", en: "Sent",    ar: "أُرسل" },
  failed:  { bg: "#fef2f2", fg: "#991b1b", bd: "#fca5a5", en: "Failed",  ar: "فشل" },
  queued:  { bg: "#fffbeb", fg: "#92400e", bd: "#fcd34d", en: "Queued",  ar: "بالانتظار" },
  drafted: { bg: "#eff6ff", fg: "#1e40af", bd: "#93c5fd", en: "Drafted", ar: "مسودة" },
};

const asList = (v) => {
  if (Array.isArray(v)) return v.filter(Boolean).map(String);
  if (typeof v === "string" && v.trim()) {
    try {
      const parsed = JSON.parse(v);
      return Array.isArray(parsed) ? parsed.filter(Boolean).map(String) : [v];
    } catch {
      return [v];
    }
  }
  return [];
};

function stampOf(iso) {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return String(iso || "—");
  const p = (n) => String(n).padStart(2, "0");
  return `${p(d.getDate())}/${p(d.getMonth() + 1)}/${d.getFullYear()} · ${p(d.getHours())}:${p(d.getMinutes())}`;
}

/**
 * Props:
 *   reportType  — the config.reportType the send was logged under (required)
 *   reportRef   — this record's reference, e.g. "AM-NCR-000042"
 *   reportDate  — YYYY-MM-DD, used when the record has no reference yet
 *   refreshKey  — bump it after a send to re-read the log
 *   onSendClick — optional; renders a "Send now" button in the empty state
 */
export default function EmailSendHistory({
  reportType,
  reportRef,
  reportDate,
  refreshKey = 0,
  onSendClick,
}) {
  const [rows, setRows] = useState([]);
  const [state, setState] = useState("idle"); // idle | loading | ready | error
  const [open, setOpen] = useState(false);

  const load = useCallback(async () => {
    if (!reportType || (!reportRef && !reportDate)) {
      setRows([]);
      setState("ready");
      return;
    }
    setState("loading");
    try {
      const qs = new URLSearchParams({ report_type: reportType, limit: "200" });
      if (reportRef) qs.set("report_ref", reportRef);
      else if (reportDate) qs.set("report_date", reportDate);

      const res = await fetch(`${API_BASE}/api/email-history?${qs}`, { cache: "no-store" });
      if (!res.ok) throw new Error(String(res.status));
      const json = await res.json().catch(() => null);
      const all = Array.isArray(json?.logs) ? json.logs : [];

      /* Second pass, always — see the note at the top of the file. */
      const mine = all.filter((r) => {
        if (String(r.report_type || "") !== String(reportType)) return false;
        if (reportRef) return String(r.report_ref || "") === String(reportRef);
        return String(r.report_date || "").slice(0, 10) === String(reportDate).slice(0, 10);
      });

      setRows(mine);
      setState("ready");
    } catch (e) {
      console.warn("[EmailSendHistory]", e);
      setState("error");
    }
  }, [reportType, reportRef, reportDate]);

  useEffect(() => { load(); }, [load, refreshKey]);

  /* Everyone this report ever went to, in first-sent order. */
  const recipients = useMemo(() => {
    const seen = new Map();
    [...rows].reverse().forEach((r) => {
      asList(r.to_emails).forEach((e) => seen.set(e.toLowerCase(), { email: e, kind: "to" }));
      asList(r.cc_emails).forEach((e) => {
        if (!seen.has(e.toLowerCase())) seen.set(e.toLowerCase(), { email: e, kind: "cc" });
      });
    });
    return [...seen.values()];
  }, [rows]);

  const sentCount = rows.filter((r) => String(r.status || "sent") === "sent").length;
  const lastRow = rows[0];

  return (
    <div style={S.wrap}>
      <button type="button" style={S.head} onClick={() => setOpen((v) => !v)}>
        <span style={S.headIcon}>📨</span>
        <span style={{ flex: 1, minWidth: 0, textAlign: "start" }}>
          <span style={S.headTitle}>Email history</span>
          <span style={S.headSub}>
            {state === "loading"
              ? "Reading the log…"
              : state === "error"
              ? "Could not read the log"
              : rows.length === 0
              ? "Never sent — لم يُرسل بعد"
              : `Sent ${sentCount}×${
                  rows.length !== sentCount ? ` (${rows.length - sentCount} not delivered)` : ""
                } · last ${stampOf(lastRow?.sent_at)}`}
          </span>
        </span>
        <span style={S.count(rows.length)}>{rows.length}</span>
        <span style={{ color: "#94a3b8", fontSize: 12 }}>{open ? "▲" : "▼"}</span>
      </button>

      {open ? (
        <div style={S.body}>
          {state === "error" ? (
            <div style={S.empty}>
              The e-mail log could not be read. The report itself is unaffected.
              <button type="button" style={S.retry} onClick={load}>Retry</button>
            </div>
          ) : rows.length === 0 ? (
            <div style={S.empty}>
              This report has not been e-mailed yet.
              <div style={{ direction: "rtl", marginTop: 4 }}>لم يتم إرسال هذا التقرير بالبريد بعد.</div>
              {onSendClick ? (
                <button type="button" style={S.retry} onClick={onSendClick}>📧 Send it now</button>
              ) : null}
            </div>
          ) : (
            <>
              {recipients.length ? (
                <div style={S.people}>
                  <span style={S.peopleLbl}>Everyone who received it — من استلمه</span>
                  {recipients.map((r) => (
                    <span key={r.email} style={S.chip(r.kind)}>
                      {r.kind === "cc" ? "cc " : ""}{r.email}
                    </span>
                  ))}
                </div>
              ) : null}

              <div style={S.list}>
                {rows.map((r, i) => {
                  const st = STATUS_STYLE[String(r.status || "sent")] || STATUS_STYLE.sent;
                  const m = METHOD_LABEL[String(r.method || "outlook")] || METHOD_LABEL.outlook;
                  const to = asList(r.to_emails);
                  const cc = asList(r.cc_emails);
                  const bcc = asList(r.bcc_emails);
                  return (
                    <div key={r.id || i} style={S.row}>
                      <div style={S.rowTop}>
                        <span style={S.seq}>#{rows.length - i}</span>
                        <span style={S.when}>{stampOf(r.sent_at)}</span>
                        <span style={S.status(st)}>{st.en} · {st.ar}</span>
                        <span style={S.method}>{m.icon} {m.en}</span>
                        {Number(r.attachment_count) > 0 ? (
                          <span style={S.attach}>📎 {r.attachment_count}</span>
                        ) : null}
                        {r.sent_by ? <span style={S.by}>by {r.sent_by}</span> : null}
                      </div>
                      {r.subject ? <div style={S.subject}>{r.subject}</div> : null}
                      <div style={S.addr}>
                        <b>To:</b> {to.length ? to.join(", ") : "—"}
                        {cc.length ? <> · <b>Cc:</b> {cc.join(", ")}</> : null}
                        {bcc.length ? <> · <b>Bcc:</b> {bcc.length} hidden</> : null}
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      ) : null}
    </div>
  );
}

/* ===== styles ===== */
const S = {
  wrap: {
    border: "1px solid #e2e8f0",
    borderRadius: 12,
    background: "#fff",
    overflow: "hidden",
    marginBottom: 12,
  },
  head: {
    width: "100%",
    display: "flex",
    alignItems: "center",
    gap: 12,
    padding: "11px 14px",
    background: "linear-gradient(180deg,#f8fafc,#f1f5f9)",
    border: 0,
    borderBottom: "1px solid #e2e8f0",
    cursor: "pointer",
    fontFamily: "inherit",
    textAlign: "start",
  },
  headIcon: { fontSize: 18 },
  headTitle: { display: "block", fontSize: 14, fontWeight: 800, color: "#0f172a" },
  headSub: { display: "block", fontSize: 12, fontWeight: 600, color: "#64748b", marginTop: 2 },
  count: (n) => ({
    minWidth: 26,
    textAlign: "center",
    padding: "3px 9px",
    borderRadius: 999,
    fontSize: 12,
    fontWeight: 800,
    background: n ? "#dbeafe" : "#e2e8f0",
    color: n ? "#1e40af" : "#64748b",
  }),
  body: { padding: 14 },
  empty: {
    padding: "18px 14px",
    textAlign: "center",
    color: "#64748b",
    fontSize: 13,
    fontWeight: 600,
    border: "1px dashed #cbd5e1",
    borderRadius: 10,
  },
  retry: {
    display: "block",
    margin: "10px auto 0",
    border: "1px solid #cbd5e1",
    background: "#fff",
    borderRadius: 10,
    padding: "7px 14px",
    fontWeight: 800,
    fontSize: 13,
    cursor: "pointer",
    fontFamily: "inherit",
  },
  people: {
    display: "flex",
    flexWrap: "wrap",
    gap: 7,
    alignItems: "center",
    padding: "10px 12px",
    marginBottom: 12,
    background: "#f8fafc",
    border: "1px solid #e2e8f0",
    borderRadius: 10,
  },
  peopleLbl: { fontSize: 11, fontWeight: 800, color: "#94a3b8", marginInlineEnd: 4 },
  chip: (kind) => ({
    padding: "4px 10px",
    borderRadius: 999,
    fontSize: 12,
    fontWeight: 700,
    background: kind === "cc" ? "#f1f5f9" : "#e0f2fe",
    color: kind === "cc" ? "#475569" : "#075985",
    border: `1px solid ${kind === "cc" ? "#e2e8f0" : "#bae6fd"}`,
  }),
  list: { display: "grid", gap: 10 },
  row: { border: "1px solid #e2e8f0", borderRadius: 10, padding: "10px 12px", background: "#fff" },
  rowTop: { display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center" },
  seq: {
    padding: "2px 8px",
    borderRadius: 999,
    background: "#0f172a",
    color: "#fff",
    fontSize: 11,
    fontWeight: 800,
  },
  when: { fontSize: 13, fontWeight: 800, color: "#0f172a" },
  status: (st) => ({
    padding: "2px 9px",
    borderRadius: 999,
    fontSize: 11,
    fontWeight: 800,
    background: st.bg,
    color: st.fg,
    border: `1px solid ${st.bd}`,
  }),
  method: { fontSize: 12, fontWeight: 700, color: "#475569" },
  attach: { fontSize: 12, fontWeight: 700, color: "#475569" },
  by: { marginInlineStart: "auto", fontSize: 12, fontWeight: 700, color: "#94a3b8" },
  subject: { marginTop: 6, fontSize: 13, fontWeight: 700, color: "#334155" },
  addr: { marginTop: 4, fontSize: 12, color: "#64748b", wordBreak: "break-word" },
};
