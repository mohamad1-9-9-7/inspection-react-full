// src/pages/email-center/EmailCenter.jsx
// Email Center — two tabs: Audit History (compliance) + Analytics (insights).
// Reads from /api/email-history and /api/email-history/stats.

import React, { useEffect, useState, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import API_BASE from "../../config/api";
import { useSettingsLang, LangToggle } from "../settings/_shared/settingsI18n";
import { getClassification, CLASSIFICATIONS } from "../shared/emailReportSettings";
import EmailSettingsPanel from "../shared/EmailSettingsPanel";

/* ── Small helpers ── */
const fmtDateTime = (iso) => iso ? new Date(iso).toLocaleString("en-GB", {
  day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit",
}) : "—";
const fmtDate = (iso) => iso ? new Date(iso).toLocaleDateString("en-GB", {
  day: "2-digit", month: "short", year: "numeric",
}) : "—";
const todayIso = () => new Date().toISOString().slice(0, 10);
const minusDays = (n) => {
  const d = new Date(); d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
};

/* ── Style tokens ── */
const ec = {
  page: {
    minHeight: "100vh",
    background: "linear-gradient(160deg, #f1f5f9 0%, #e0f2fe 100%)",
    fontFamily: "Cairo, 'Segoe UI', sans-serif",
    padding: "24px 16px",
  },
  wide: { maxWidth: 1400, margin: "0 auto" },
  hero: {
    background: "linear-gradient(135deg, #0c4a6e 0%, #1e40af 50%, #6d28d9 100%)",
    color: "#fff", borderRadius: 18, padding: "24px 28px", marginBottom: 18,
    boxShadow: "0 12px 32px rgba(12,74,110,.22)",
  },
  heroTitle: { fontSize: 24, fontWeight: 900, margin: 0 },
  heroSub:   { fontSize: 13, opacity: .85, marginTop: 4 },
  card: { background: "#fff", borderRadius: 14, border: "1px solid #e2e8f0",
    boxShadow: "0 2px 10px rgba(0,0,0,.05)", overflow: "hidden" },
  tabsBar: { display: "flex", gap: 6, padding: "12px 14px 0", borderBottom: "1px solid #e2e8f0",
    background: "#fff", borderRadius: "14px 14px 0 0", flexWrap: "wrap" },
  tab: (active) => ({
    padding: "10px 18px", border: "none", cursor: "pointer",
    fontFamily: "inherit", fontWeight: 800, fontSize: 14,
    background: active ? "#dbeafe" : "transparent",
    color: active ? "#1e40af" : "#64748b",
    borderRadius: "10px 10px 0 0",
    borderBottom: `3px solid ${active ? "#3b82f6" : "transparent"}`,
  }),
  input: {
    padding: "9px 12px", border: "1.5px solid #e2e8f0", borderRadius: 8,
    fontSize: 14, color: "#1e293b", fontFamily: "inherit", background: "#f8fafc",
  },
  btnPrimary: {
    padding: "9px 16px", background: "linear-gradient(135deg,#3b82f6,#1d4ed8)",
    color: "#fff", border: "none", borderRadius: 8,
    fontWeight: 800, fontSize: 13, cursor: "pointer", fontFamily: "inherit",
  },
  btnSecondary: {
    padding: "9px 16px", background: "#f1f5f9", color: "#475569",
    border: "1.5px solid #e2e8f0", borderRadius: 8,
    fontWeight: 800, fontSize: 13, cursor: "pointer", fontFamily: "inherit",
  },
  table: { width: "100%", borderCollapse: "collapse", fontSize: 13 },
  th: { background: "#f8fafc", padding: "10px 12px", fontWeight: 800,
    fontSize: 11, color: "#475569", textAlign: "start",
    borderBottom: "1.5px solid #e2e8f0", whiteSpace: "nowrap",
    textTransform: "uppercase", letterSpacing: ".04em" },
  td: { padding: "10px 12px", borderBottom: "1px solid #f1f5f9", color: "#1e293b" },
  pill: (color, bg) => ({
    display: "inline-block", padding: "2px 10px", borderRadius: 999,
    background: bg, color, border: `1px solid ${color}33`,
    fontSize: 11, fontWeight: 800, whiteSpace: "nowrap",
  }),
  empty: { padding: "48px 24px", textAlign: "center", color: "#94a3b8", fontSize: 14, fontWeight: 600 },
};

const METHOD_META = {
  outlook:  { icon: "📧", label: "Outlook",  color: "#1e40af", bg: "#dbeafe" },
  whatsapp: { icon: "💬", label: "WhatsApp", color: "#15803d", bg: "#dcfce7" },
  copy:     { icon: "📋", label: "Copy",     color: "#7c3aed", bg: "#ede9fe" },
};
const REPORT_TYPE_META = {
  returns:          { label: "Returns",          icon: "♻️" },
  customer_returns: { label: "Customer Returns", icon: "🛒" },
  qcs_non_conformance: { label: "Non-Conformance", icon: "🚫" },
  qcs_corrective_action: { label: "Corrective Action", icon: "🛠️" },
};

/* ════════════════════════════════════════════════════════════
   TAB 1 — Audit History (filterable list)
═════════════════════════════════════════════════════════════ */
function HistoryTab() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState({
    search: "", report_type: "", classification: "", sent_by: "",
    from: minusDays(30), to: todayIso(),
  });
  const [detail, setDetail] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      Object.entries(filter).forEach(([k, v]) => { if (v) params.set(k, v); });
      params.set("limit", "500");
      const r = await fetch(`${API_BASE}/api/email-history?${params}`);
      const d = await r.json();
      if (d.ok) setLogs(d.logs || []);
    } catch { /* ignore */ }
    setLoading(false);
  }, [filter]);

  useEffect(() => { load(); }, [load]);

  /* Derived: unique senders + types from current logs (for filter dropdowns) */
  const uniqueSenders = useMemo(() =>
    Array.from(new Set(logs.map((l) => l.sent_by).filter(Boolean))), [logs]);
  const uniqueTypes = useMemo(() =>
    Array.from(new Set(logs.map((l) => l.report_type).filter(Boolean))), [logs]);

  function exportCsv() {
    const headers = ["Sent At", "Sender", "Type", "Subject", "Recipients", "Classification", "Method", "Attachments"];
    const rows = logs.map((l) => [
      fmtDateTime(l.sent_at),
      l.sent_by,
      l.report_type,
      l.subject,
      [...(l.to_emails || []), ...(l.cc_emails || []), ...(l.bcc_emails || [])].join("; "),
      l.classification,
      l.method,
      l.attachment_count,
    ]);
    const csv = [headers, ...rows].map((r) =>
      r.map((c) => `"${String(c ?? "").replace(/"/g, '""')}"`).join(",")
    ).join("\n");
    const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `email_history_${todayIso()}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  async function deleteLog(id) {
    if (!window.confirm("Delete this entry from the audit log?")) return;
    const r = await fetch(`${API_BASE}/api/email-history/${id}`, { method: "DELETE" });
    const d = await r.json();
    if (d.ok) setLogs((prev) => prev.filter((l) => l.id !== id));
  }

  return (
    <div style={{ padding: "20px 22px" }}>
      {/* Filters bar */}
      <div style={{ display: "grid",
        gridTemplateColumns: "1fr 1fr 1fr 1fr 1fr 1fr auto auto",
        gap: 8, marginBottom: 14, alignItems: "end" }}>
        <div>
          <label style={{ display: "block", fontSize: 11, fontWeight: 800, color: "#64748b", marginBottom: 3 }}>🔍 Search</label>
          <input style={ec.input} value={filter.search}
            placeholder="subject / recipient…"
            onChange={(e) => setFilter((f) => ({ ...f, search: e.target.value }))} />
        </div>
        <div>
          <label style={{ display: "block", fontSize: 11, fontWeight: 800, color: "#64748b", marginBottom: 3 }}>From</label>
          <input type="date" style={ec.input} value={filter.from}
            onChange={(e) => setFilter((f) => ({ ...f, from: e.target.value }))} />
        </div>
        <div>
          <label style={{ display: "block", fontSize: 11, fontWeight: 800, color: "#64748b", marginBottom: 3 }}>To</label>
          <input type="date" style={ec.input} value={filter.to}
            onChange={(e) => setFilter((f) => ({ ...f, to: e.target.value }))} />
        </div>
        <div>
          <label style={{ display: "block", fontSize: 11, fontWeight: 800, color: "#64748b", marginBottom: 3 }}>Type</label>
          <select style={ec.input} value={filter.report_type}
            onChange={(e) => setFilter((f) => ({ ...f, report_type: e.target.value }))}>
            <option value="">All</option>
            {uniqueTypes.map((t) => <option key={t} value={t}>{REPORT_TYPE_META[t]?.label || t}</option>)}
          </select>
        </div>
        <div>
          <label style={{ display: "block", fontSize: 11, fontWeight: 800, color: "#64748b", marginBottom: 3 }}>Class</label>
          <select style={ec.input} value={filter.classification}
            onChange={(e) => setFilter((f) => ({ ...f, classification: e.target.value }))}>
            <option value="">All</option>
            {CLASSIFICATIONS.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
          </select>
        </div>
        <div>
          <label style={{ display: "block", fontSize: 11, fontWeight: 800, color: "#64748b", marginBottom: 3 }}>Sender</label>
          <select style={ec.input} value={filter.sent_by}
            onChange={(e) => setFilter((f) => ({ ...f, sent_by: e.target.value }))}>
            <option value="">All</option>
            {uniqueSenders.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        <button onClick={load} style={ec.btnSecondary}>🔄 Refresh</button>
        <button onClick={exportCsv} disabled={logs.length === 0} style={ec.btnPrimary}>📥 CSV</button>
      </div>

      <div style={{ fontSize: 12, color: "#64748b", fontWeight: 700, marginBottom: 8 }}>
        📊 Showing <b style={{ color: "#1e40af" }}>{logs.length}</b> entries
      </div>

      {loading ? (
        <div style={ec.empty}>⏳ Loading audit log…</div>
      ) : logs.length === 0 ? (
        <div style={ec.empty}>📭 No emails logged in this range</div>
      ) : (
        <div style={{ overflowX: "auto", border: "1px solid #e2e8f0", borderRadius: 10 }}>
          <table style={ec.table}>
            <thead>
              <tr>
                <th style={ec.th}>When</th>
                <th style={ec.th}>Sender</th>
                <th style={ec.th}>Type</th>
                <th style={ec.th}>Subject</th>
                <th style={ec.th}>Recipients</th>
                <th style={ec.th}>Class</th>
                <th style={ec.th}>Via</th>
                <th style={ec.th}>📎</th>
                <th style={ec.th}></th>
              </tr>
            </thead>
            <tbody>
              {logs.map((l) => {
                const cls = getClassification(l.classification);
                const m = METHOD_META[l.method] || METHOD_META.outlook;
                const tm = REPORT_TYPE_META[l.report_type] || { label: l.report_type, icon: "📄" };
                const totalRcpt = (l.to_emails?.length || 0) + (l.cc_emails?.length || 0) + (l.bcc_emails?.length || 0);
                return (
                  <tr key={l.id}
                    onClick={() => setDetail(l)}
                    style={{ cursor: "pointer" }}
                    onMouseEnter={(e) => e.currentTarget.style.background = "#f8fafc"}
                    onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}>
                    <td style={{ ...ec.td, whiteSpace: "nowrap", fontSize: 12 }}>{fmtDateTime(l.sent_at)}</td>
                    <td style={{ ...ec.td, fontWeight: 700 }}>{l.sent_by || "—"}</td>
                    <td style={ec.td}>{tm.icon} {tm.label}</td>
                    <td style={{ ...ec.td, maxWidth: 280, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{l.subject}</td>
                    <td style={ec.td}>
                      <span style={{ fontWeight: 800, color: "#1e40af" }}>{totalRcpt}</span>
                      <span style={{ fontSize: 10, color: "#94a3b8", marginInlineStart: 4 }}>
                        ({l.to_emails?.length || 0} to · {l.cc_emails?.length || 0} cc)
                      </span>
                    </td>
                    <td style={ec.td}><span style={ec.pill(cls.color, cls.bg)}>{cls.label}</span></td>
                    <td style={ec.td}><span style={ec.pill(m.color, m.bg)}>{m.icon} {m.label}</span></td>
                    <td style={{ ...ec.td, textAlign: "center", fontWeight: 700 }}>{l.attachment_count}</td>
                    <td style={ec.td} onClick={(e) => e.stopPropagation()}>
                      <button onClick={() => deleteLog(l.id)} title="Delete"
                        style={{ background: "#fee2e2", color: "#991b1b", border: "none",
                          borderRadius: 6, padding: "4px 9px", fontWeight: 800, fontSize: 11, cursor: "pointer" }}>
                        🗑
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Detail modal */}
      {detail && <DetailModal log={detail} onClose={() => setDetail(null)} />}
    </div>
  );
}

function DetailModal({ log, onClose }) {
  const cls = getClassification(log.classification);
  const m = METHOD_META[log.method] || METHOD_META.outlook;
  return (
    <div onClick={onClose} style={{
      position: "fixed", inset: 0, background: "rgba(15,23,42,.55)",
      display: "flex", alignItems: "center", justifyContent: "center",
      zIndex: 9000, padding: 16, backdropFilter: "blur(6px)",
    }}>
      <div onClick={(e) => e.stopPropagation()} style={{
        background: "#fff", borderRadius: 16, padding: "26px 30px",
        width: "min(640px, 96vw)", maxHeight: "92vh", overflowY: "auto",
        fontFamily: "Cairo, sans-serif", boxShadow: "0 28px 64px rgba(0,0,0,.35)",
      }}>
        <h3 style={{ margin: "0 0 6px", fontSize: 18, color: "#0f172a" }}>📧 Email Detail</h3>
        <div style={{ fontSize: 12, color: "#64748b" }}>ID #{log.id}</div>

        <div style={{ marginTop: 16, display: "grid", gap: 12 }}>
          <Field label="Sent at" value={fmtDateTime(log.sent_at)} />
          <Field label="Sender"  value={log.sent_by || "—"} />
          <Field label="Subject" value={log.subject} />
          <Field label="Type"    value={log.report_type} />
          {log.report_date && <Field label="Report Date" value={fmtDate(log.report_date)} />}
          <div>
            <Label>Classification</Label>
            <span style={ec.pill(cls.color, cls.bg)}>{cls.label}</span>
          </div>
          <div>
            <Label>Method</Label>
            <span style={ec.pill(m.color, m.bg)}>{m.icon} {m.label}</span>
          </div>
          <Field label="Priority" value={log.priority} />
          <Field label="Attachments" value={String(log.attachment_count)} />

          {(log.to_emails || []).length > 0 && <RecipientList label="To"  emails={log.to_emails} color="#1e40af" bg="#dbeafe" />}
          {(log.cc_emails || []).length > 0 && <RecipientList label="CC"  emails={log.cc_emails} color="#0e7490" bg="#cffafe" />}
          {(log.bcc_emails || []).length > 0 && <RecipientList label="BCC" emails={log.bcc_emails} color="#7c3aed" bg="#ede9fe" />}

          {log.note && (
            <div>
              <Label>Note</Label>
              <div style={{ background: "#f8fafc", border: "1px solid #e2e8f0",
                borderRadius: 8, padding: "10px 12px", fontSize: 13, color: "#475569",
                whiteSpace: "pre-wrap" }}>{log.note}</div>
            </div>
          )}
        </div>

        <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 18 }}>
          <button onClick={onClose} style={ec.btnSecondary}>Close</button>
        </div>
      </div>
    </div>
  );
}

const Label = ({ children }) => (
  <div style={{ fontSize: 11, fontWeight: 800, color: "#64748b",
    textTransform: "uppercase", letterSpacing: ".06em", marginBottom: 4 }}>{children}</div>
);
const Field = ({ label, value }) => (
  <div>
    <Label>{label}</Label>
    <div style={{ fontSize: 14, color: "#0f172a", fontWeight: 700 }}>{value || "—"}</div>
  </div>
);
const RecipientList = ({ label, emails, color, bg }) => (
  <div>
    <Label>{label} ({emails.length})</Label>
    <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
      {emails.map((e, i) => (
        <span key={i} style={{ ...ec.pill(color, bg), fontSize: 11 }}>{e}</span>
      ))}
    </div>
  </div>
);

/* ════════════════════════════════════════════════════════════
   TAB 2 — Analytics (KPIs + breakdowns + trends)
═════════════════════════════════════════════════════════════ */
function AnalyticsTab() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [days, setDays] = useState(30);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch(`${API_BASE}/api/email-history/stats?days=${days}`);
      const d = await r.json();
      if (d.ok) setData(d);
    } catch { /* ignore */ }
    setLoading(false);
  }, [days]);

  useEffect(() => { load(); }, [load]);

  if (loading) return <div style={ec.empty}>⏳ Loading analytics…</div>;
  if (!data || Number(data.summary.total) === 0) {
    return <div style={ec.empty}>📊 No emails sent yet — analytics will populate as you send.</div>;
  }

  const s = data.summary;
  const maxTrend = Math.max(...data.dailyTrend.map((d) => d.count), 1);
  const maxType = Math.max(...data.byType.map((t) => t.count), 1);
  const totalMethods = (s.method_outlook || 0) + (s.method_whatsapp || 0) + (s.method_copy || 0);

  return (
    <div style={{ padding: "22px 24px" }}>
      {/* Period selector */}
      <div style={{ display: "flex", justifyContent: "space-between",
        alignItems: "center", marginBottom: 18, flexWrap: "wrap", gap: 10 }}>
        <div style={{ fontSize: 13, color: "#475569" }}>
          Period: <b style={{ color: "#0f172a" }}>Last {days} days</b>
        </div>
        <div style={{ display: "flex", gap: 6 }}>
          {[7, 30, 90, 180, 365].map((d) => (
            <button key={d} onClick={() => setDays(d)}
              style={{
                padding: "6px 14px",
                background: days === d ? "#1e40af" : "#fff",
                color: days === d ? "#fff" : "#475569",
                border: `1.5px solid ${days === d ? "#1e40af" : "#e2e8f0"}`,
                borderRadius: 999, cursor: "pointer", fontFamily: "inherit",
                fontWeight: 800, fontSize: 12,
              }}>
              {d}d
            </button>
          ))}
        </div>
      </div>

      {/* KPI cards */}
      <div style={{ display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
        gap: 14, marginBottom: 24 }}>
        <Kpi label="Total Sent"     value={s.recent}    sub={`${s.total} all-time`}  color="#1e40af" icon="📧" />
        <Kpi label="Today"          value={s.today}     color="#15803d" icon="📅" />
        <Kpi label="Recipients"     value={s.total_recipients_recent || 0} color="#7c3aed" icon="👥" />
        <Kpi label="Attachments"    value={s.total_attachments_recent || 0} color="#ea580c" icon="📎" />
        <Kpi label="Active Senders" value={s.unique_senders}    color="#0e7490" icon="👤" />
      </div>

      {/* Daily trend */}
      <div style={{ ...ec.card, padding: "18px 22px", marginBottom: 16 }}>
        <h4 style={{ margin: "0 0 14px", fontSize: 14, fontWeight: 900, color: "#0f172a",
          textTransform: "uppercase", letterSpacing: ".06em" }}>
          📈 Daily Trend
        </h4>
        {data.dailyTrend.length === 0 ? (
          <div style={ec.empty}>No data</div>
        ) : (
          <div style={{ display: "flex", gap: 4, alignItems: "flex-end",
            height: 140, padding: "10px 0", overflowX: "auto" }}>
            {data.dailyTrend.map((d) => {
              const pct = (d.count / maxTrend) * 100;
              return (
                <div key={d.day} title={`${d.day}: ${d.count}`}
                  style={{ minWidth: 22, flex: 1, display: "flex",
                    flexDirection: "column", alignItems: "center", justifyContent: "flex-end" }}>
                  <div style={{ fontSize: 10, fontWeight: 800, color: "#64748b", marginBottom: 3 }}>
                    {d.count}
                  </div>
                  <div style={{
                    width: "80%", maxWidth: 32,
                    height: `${pct}%`, minHeight: 4,
                    background: "linear-gradient(180deg, #3b82f6, #1e40af)",
                    borderRadius: "4px 4px 0 0",
                  }} />
                  <div style={{ fontSize: 9, color: "#94a3b8", marginTop: 4,
                    transform: "rotate(-50deg)", transformOrigin: "center", height: 30,
                    whiteSpace: "nowrap" }}>
                    {d.day.slice(5)}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Two-column: By Type + Top Recipients */}
      <div style={{ display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(360px, 1fr))",
        gap: 16, marginBottom: 16 }}>
        <Panel title="📊 By Report Type">
          {data.byType.map((t) => {
            const meta = REPORT_TYPE_META[t.report_type] || { label: t.report_type, icon: "📄" };
            return (
              <Bar key={t.report_type} label={`${meta.icon} ${meta.label}`}
                count={t.count} max={maxType} color="#3b82f6" />
            );
          })}
        </Panel>

        <Panel title="👥 Top Recipients">
          {data.topRecipients.length === 0 ? (
            <div style={ec.empty}>No recipient data</div>
          ) : data.topRecipients.map((r, i) => (
            <div key={r.email} style={{
              display: "flex", justifyContent: "space-between", padding: "8px 0",
              borderBottom: "1px solid #f1f5f9",
            }}>
              <span style={{ fontSize: 13, color: "#0f172a" }}>
                <b style={{ color: "#1e40af", marginInlineEnd: 6 }}>#{i + 1}</b>
                {r.email}
              </span>
              <span style={{ fontWeight: 900, color: "#1e40af", fontSize: 13 }}>{r.count}</span>
            </div>
          ))}
        </Panel>
      </div>

      <div style={{ display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(360px, 1fr))",
        gap: 16 }}>
        {/* Classification breakdown */}
        <Panel title="🔒 By Classification">
          {data.byClass.length === 0 ? (
            <div style={ec.empty}>No data</div>
          ) : data.byClass.map((c) => {
            const meta = getClassification(c.classification);
            return (
              <Bar key={c.classification} label={meta.label}
                count={c.count} max={data.byClass[0].count} color={meta.color} />
            );
          })}
        </Panel>

        {/* Method breakdown */}
        <Panel title="📤 By Send Method">
          {totalMethods === 0 ? <div style={ec.empty}>No data</div> : (
            <>
              <Bar label={`${METHOD_META.outlook.icon} ${METHOD_META.outlook.label}`} count={s.method_outlook || 0}  max={totalMethods} color="#1e40af" />
              <Bar label={`${METHOD_META.whatsapp.icon} ${METHOD_META.whatsapp.label}`} count={s.method_whatsapp || 0} max={totalMethods} color="#15803d" />
              <Bar label={`${METHOD_META.copy.icon} ${METHOD_META.copy.label}`}     count={s.method_copy || 0}     max={totalMethods} color="#7c3aed" />
            </>
          )}
        </Panel>

        {/* Top senders */}
        <Panel title="👤 Top Senders">
          {data.topSenders.length === 0 ? (
            <div style={ec.empty}>No sender data</div>
          ) : data.topSenders.map((r, i) => (
            <div key={r.sent_by} style={{
              display: "flex", justifyContent: "space-between", padding: "8px 0",
              borderBottom: "1px solid #f1f5f9",
            }}>
              <span style={{ fontSize: 13, color: "#0f172a" }}>
                <b style={{ color: "#7c3aed", marginInlineEnd: 6 }}>#{i + 1}</b>
                {r.sent_by}
              </span>
              <span style={{ fontWeight: 900, color: "#7c3aed", fontSize: 13 }}>{r.count}</span>
            </div>
          ))}
        </Panel>
      </div>
    </div>
  );
}

function Kpi({ label, value, sub, color, icon }) {
  return (
    <div style={{
      background: "#fff", borderRadius: 12, border: "1px solid #e2e8f0",
      padding: "16px 18px", boxShadow: "0 2px 8px rgba(0,0,0,.04)",
      position: "relative", overflow: "hidden",
    }}>
      <div style={{
        position: "absolute", top: 0, right: 0, fontSize: 60, opacity: .08,
        lineHeight: 1, color, pointerEvents: "none",
      }}>{icon}</div>
      <div style={{ fontSize: 11, fontWeight: 800, color: "#64748b",
        textTransform: "uppercase", letterSpacing: ".06em" }}>{label}</div>
      <div style={{ fontSize: 30, fontWeight: 900, color, marginTop: 4, lineHeight: 1 }}>{value ?? "—"}</div>
      {sub && <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 4 }}>{sub}</div>}
    </div>
  );
}

function Panel({ title, children }) {
  return (
    <div style={{ ...ec.card, padding: "18px 22px" }}>
      <h4 style={{ margin: "0 0 14px", fontSize: 14, fontWeight: 900, color: "#0f172a",
        textTransform: "uppercase", letterSpacing: ".06em" }}>{title}</h4>
      {children}
    </div>
  );
}

function Bar({ label, count, max, color }) {
  const pct = max > 0 ? (count / max) * 100 : 0;
  return (
    <div style={{ marginBottom: 10 }}>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, fontWeight: 700, color: "#475569", marginBottom: 4 }}>
        <span>{label}</span>
        <span style={{ color, fontWeight: 900 }}>{count}</span>
      </div>
      <div style={{ background: "#f1f5f9", borderRadius: 999, height: 8, overflow: "hidden" }}>
        <div style={{ width: `${pct}%`, height: "100%", background: color, borderRadius: 999, transition: "width .4s" }} />
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════ MAIN */
export default function EmailCenter() {
  const navigate = useNavigate();
  const { dir, lang, toggle } = useSettingsLang();
  const [tab, setTab] = useState("history");

  return (
    <div style={ec.page} dir={dir}>
      <div style={ec.wide}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14, gap: 10, flexWrap: "wrap" }}>
          <button onClick={() => navigate("/admin")} style={ec.btnSecondary}>← Back</button>
          <LangToggle lang={lang} toggle={toggle}
            style={{ background: "#0b1220", border: "1px solid #1e293b" }} />
        </div>

        <div style={ec.hero}>
          <h1 style={ec.heroTitle}>📨 Email Center</h1>
          <p style={ec.heroSub}>Settings · Audit trail · Analytics · ISO/BRCGS-ready compliance log</p>
        </div>

        <div style={ec.card}>
          <div style={ec.tabsBar}>
            <button style={ec.tab(tab === "settings")} onClick={() => setTab("settings")}>
              ⚙️ {lang === "ar" ? "الإعدادات" : "Settings"}
            </button>
            <button style={ec.tab(tab === "history")} onClick={() => setTab("history")}>
              📜 {lang === "ar" ? "سجل التدقيق" : "Audit History"}
            </button>
            <button style={ec.tab(tab === "analytics")} onClick={() => setTab("analytics")}>
              📊 {lang === "ar" ? "التحليلات" : "Analytics"}
            </button>
          </div>
          {tab === "settings"  && <EmailSettingsPanel open embedded onSaved={() => {}} onClose={() => setTab("history")} />}
          {tab === "history"   && <HistoryTab />}
          {tab === "analytics" && <AnalyticsTab />}
        </div>
      </div>
    </div>
  );
}
