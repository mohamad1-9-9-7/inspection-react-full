// src/pages/settings/DemoRequestsTab.jsx
// Platform Center → Demo Requests. Every request left on the public /demo
// page, with a sales status the owner moves along by hand and free notes.
//
// Server: GET /api/demo-requests, PATCH /api/demo-requests/:id,
// DELETE /api/demo-requests/:id (super-admin only). See
// docs/server/demo-requests/README.md.

import React, { useEffect, useMemo, useState } from "react";
import API_BASE from "../../config/api";
import { Button, ConfirmModal, StatusMessage, ui } from "./_shared/SettingsUIKit";
import { DEMO_ACTIVITIES, DEMO_EMIRATES } from "../DemoRequest";

export const DEMO_STATUSES = [
  { v: "new",       label: "New",             ar: "جديد",          color: "#2563eb", bg: "#dbeafe" },
  { v: "contacted", label: "Contacted",       ar: "تم التواصل",    color: "#7c3aed", bg: "#ede9fe" },
  { v: "demo_done", label: "Demo done",       ar: "تم العرض",      color: "#0891b2", bg: "#cffafe" },
  { v: "trial",     label: "On trial",        ar: "تجربة",         color: "#d97706", bg: "#fef3c7" },
  { v: "won",       label: "Won (customer)",  ar: "اشترك",         color: "#059669", bg: "#d1fae5" },
  { v: "lost",      label: "Lost",            ar: "مرفوض",         color: "#64748b", bg: "#f1f5f9" },
];
const statusMeta = (v) => DEMO_STATUSES.find((s) => s.v === v) || DEMO_STATUSES[0];
const activityLabel = (v) => DEMO_ACTIVITIES.find((a) => a.v === v)?.en || v || "—";
const emirateLabel = (v) => DEMO_EMIRATES.find((a) => a.v === v)?.en || v || "—";

/* Rows come back snake_case from Postgres; accept camelCase too. */
const norm = (r = {}) => ({
  id: r.id,
  createdAt: r.created_at || r.createdAt || "",
  status: r.status || "new",
  notes: r.notes || "",
  companyName: r.company_name || r.companyName || "",
  activity: r.activity || "",
  branches: r.branches || "",
  contactName: r.contact_name || r.contactName || "",
  jobTitle: r.job_title || r.jobTitle || "",
  phone: r.phone || "",
  email: r.email || "",
  emirate: r.emirate || "",
  message: r.message || "",
  source: r.source || "",
  referrer: r.referrer || "",
  lang: r.lang || "",
});

const fmtWhen = (iso) => {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("en-GB", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
};
const waLink = (phone) => {
  let d = String(phone || "").replace(/\D/g, "");
  if (d.startsWith("00")) d = d.slice(2);
  else if (d.startsWith("0")) d = "971" + d.slice(1); // local UAE number
  return d ? `https://wa.me/${d}` : "";
};
const csvCell = (v) => `"${String(v ?? "").replace(/"/g, '""')}"`;

async function readJson(res, fallback) {
  const j = await res.json().catch(() => ({}));
  if (!res.ok || j.ok === false) throw new Error(j.error || `${fallback} (${res.status})`);
  return j;
}

export default function DemoRequestsTab() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState(null);
  const [filter, setFilter] = useState("all");
  const [query, setQuery] = useState("");
  const [openId, setOpenId] = useState(null);
  const [notesDraft, setNotesDraft] = useState({});
  const [pendingDelete, setPendingDelete] = useState(null);

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/demo-requests`, { cache: "no-store" });
      if (res.status === 404) throw new Error("The server has no /api/demo-requests yet — deploy the server part first.");
      const j = await readJson(res, "Could not load demo requests");
      setRows((j.requests || j.data || []).map(norm));
      setMsg(null);
    } catch (e) {
      setMsg({ kind: "err", text: `❌ ${e.message}` });
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { load(); }, []);

  const patch = async (id, body, okText) => {
    try {
      const res = await fetch(`${API_BASE}/api/demo-requests/${encodeURIComponent(id)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const j = await readJson(res, "Update failed");
      const updated = j.request ? norm(j.request) : null;
      setRows((prev) => prev.map((r) => (r.id === id ? (updated || { ...r, ...body }) : r)));
      if (okText) setMsg({ kind: "ok", text: `✅ ${okText}` });
    } catch (e) {
      setMsg({ kind: "err", text: `❌ ${e.message}` });
    }
  };

  const remove = async (id) => {
    try {
      const res = await fetch(`${API_BASE}/api/demo-requests/${encodeURIComponent(id)}`, { method: "DELETE" });
      await readJson(res, "Delete failed");
      setRows((prev) => prev.filter((r) => r.id !== id));
      setMsg({ kind: "ok", text: "✅ Request deleted." });
    } catch (e) {
      setMsg({ kind: "err", text: `❌ ${e.message}` });
    }
  };

  const counts = useMemo(() => {
    const c = Object.fromEntries(DEMO_STATUSES.map((s) => [s.v, 0]));
    rows.forEach((r) => { c[r.status] = (c[r.status] || 0) + 1; });
    const monthStart = new Date(); monthStart.setDate(1); monthStart.setHours(0, 0, 0, 0);
    c.thisMonth = rows.filter((r) => new Date(r.createdAt) >= monthStart).length;
    const decided = c.won + c.lost;
    c.winRate = decided ? Math.round((c.won / decided) * 100) : null;
    return c;
  }, [rows]);

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows
      .filter((r) => filter === "all" || r.status === filter)
      .filter((r) => !q || [r.companyName, r.contactName, r.phone, r.email, r.notes, r.source]
        .some((v) => String(v).toLowerCase().includes(q)))
      .sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
  }, [rows, filter, query]);

  const exportCsv = () => {
    const head = ["Date", "Status", "Company", "Business type", "Branches", "Emirate", "Contact", "Job title", "Phone", "Email", "Message", "Source", "Notes"];
    const lines = shown.map((r) => [
      fmtWhen(r.createdAt), statusMeta(r.status).label, r.companyName, activityLabel(r.activity), r.branches,
      emirateLabel(r.emirate), r.contactName, r.jobTitle, r.phone, r.email, r.message, r.source, r.notes,
    ].map(csvCell).join(","));
    const blob = new Blob(["﻿" + [head.map(csvCell).join(","), ...lines].join("\n")], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `demo-requests-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  };

  const publicUrl = `${window.location.origin}/demo`;
  const copyLink = async () => {
    try { await navigator.clipboard.writeText(publicUrl); setMsg({ kind: "ok", text: `✅ Copied ${publicUrl}` }); }
    catch { setMsg({ kind: "info", text: publicUrl }); }
  };

  return (
    <div style={ui.page}>
      {/* The Platform Center header already names this tab — only the link and actions here. */}
      <div style={ui.toolbar}>
        <p style={{ ...ui.subtitle, margin: 0 }}>
          Public page: <b>{publicUrl}</b> — add <code>?src=linkedin</code> (or any name) to the link you
          share, to see which channel each request came from.
        </p>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <Button onClick={copyLink}>🔗 Copy public link</Button>
          <Button onClick={exportCsv} disabled={!shown.length}>⬇ CSV</Button>
          <Button tone="primary" onClick={load} disabled={loading}>↻ Refresh</Button>
        </div>
      </div>

      <StatusMessage message={msg} />

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))", gap: 10, marginBottom: 14 }}>
        <Stat label="Total" value={rows.length} color="#0f766e" />
        <Stat label="This month" value={counts.thisMonth} color="#0891b2" />
        <Stat label="New (not contacted)" value={counts.new} color="#2563eb" />
        <Stat label="Won" value={counts.won} color="#059669" />
        <Stat label="Win rate" value={counts.winRate == null ? "—" : `${counts.winRate}%`} color="#7c3aed" />
      </div>

      <div style={{ ...ui.toolbar, justifyContent: "flex-start" }}>
        <Chip on={filter === "all"} onClick={() => setFilter("all")} label={`All (${rows.length})`} />
        {DEMO_STATUSES.map((s) => (
          <Chip key={s.v} on={filter === s.v} onClick={() => setFilter(s.v)} label={`${s.label} (${counts[s.v] || 0})`} color={s.color} />
        ))}
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search company, name, phone, notes…"
          style={{ ...ui.input, flex: "1 1 220px", maxWidth: 360, minHeight: 38, marginInlineStart: "auto" }}
        />
      </div>

      {loading ? (
        <div style={{ ...ui.subtleCard, textAlign: "center", fontWeight: 800, color: "#64748b" }}>Loading…</div>
      ) : !shown.length ? (
        <div style={{ ...ui.subtleCard, textAlign: "center", fontWeight: 800, color: "#64748b" }}>
          {rows.length ? "No requests match this filter." : "No demo requests yet. Share the public link to start collecting them."}
        </div>
      ) : (
        <div style={{ display: "grid", gap: 10 }}>
          {shown.map((r) => {
            const st = statusMeta(r.status);
            const open = openId === r.id;
            const draft = notesDraft[r.id] ?? r.notes;
            const wa = waLink(r.phone);
            return (
              <div key={r.id} style={{ ...ui.card, marginBottom: 0, padding: 14, borderInlineStart: `4px solid ${st.color}` }}>
                <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
                  <div style={{ flex: "1 1 260px", minWidth: 0, cursor: "pointer" }} onClick={() => setOpenId(open ? null : r.id)}>
                    <div style={{ fontWeight: 1000, fontSize: 17 }}>
                      {r.companyName || "—"}
                      <span style={{ color: "#64748b", fontWeight: 700, fontSize: 13 }}>
                        {" "}· {activityLabel(r.activity)}{r.branches ? ` · ${r.branches} branches` : ""}{r.emirate ? ` · ${emirateLabel(r.emirate)}` : ""}
                      </span>
                    </div>
                    <div style={{ color: "#334155", fontWeight: 750, marginTop: 3 }}>
                      {r.contactName}{r.jobTitle ? ` — ${r.jobTitle}` : ""}
                      <span style={{ color: "#94a3b8" }}> · {fmtWhen(r.createdAt)}{r.source ? ` · via ${r.source}` : ""}</span>
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                    {r.phone && <a href={`tel:${r.phone}`} style={linkBtn}>📞 {r.phone}</a>}
                    {wa && <a href={wa} target="_blank" rel="noreferrer" style={{ ...linkBtn, color: "#15803d" }}>WhatsApp</a>}
                    {r.email && <a href={`mailto:${r.email}`} style={linkBtn}>✉️ Email</a>}
                    <select
                      value={r.status}
                      onChange={(e) => patch(r.id, { status: e.target.value }, `${r.companyName}: ${statusMeta(e.target.value).label}`)}
                      style={{ ...ui.input, width: "auto", minHeight: 38, fontWeight: 900, color: st.color, background: st.bg, borderColor: st.color }}
                    >
                      {DEMO_STATUSES.map((s) => <option key={s.v} value={s.v}>{s.label} · {s.ar}</option>)}
                    </select>
                    <Button tone="muted" style={{ minHeight: 38 }} onClick={() => setOpenId(open ? null : r.id)}>{open ? "▲" : "▼"}</Button>
                  </div>
                </div>

                {open && (
                  <div style={{ marginTop: 12, display: "grid", gap: 10 }}>
                    {r.message && (
                      <div style={{ ...ui.subtleCard, marginBottom: 0, whiteSpace: "pre-wrap", fontWeight: 700 }}>
                        <div style={{ color: "#64748b", fontSize: 12, fontWeight: 900, marginBottom: 4 }}>THEIR MESSAGE</div>
                        {r.message}
                      </div>
                    )}
                    <label style={{ display: "grid", gap: 6 }}>
                      <span style={{ fontWeight: 900, color: "#334155" }}>Follow-up notes</span>
                      <textarea
                        value={draft}
                        onChange={(e) => setNotesDraft((d) => ({ ...d, [r.id]: e.target.value }))}
                        placeholder="e.g. Called Sunday — wants a price for 3 branches, demo booked for Tuesday 11am"
                        style={{ ...ui.input, minHeight: 80, resize: "vertical" }}
                      />
                    </label>
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "space-between" }}>
                      <span style={{ color: "#94a3b8", fontWeight: 700, fontSize: 13, alignSelf: "center" }}>
                        {r.email || "no e-mail"}{r.referrer ? ` · came from ${r.referrer}` : ""}{r.lang ? ` · page in ${r.lang.toUpperCase()}` : ""}
                      </span>
                      <div style={{ display: "flex", gap: 8 }}>
                        <Button tone="danger" onClick={() => setPendingDelete(r)}>Delete</Button>
                        <Button tone="primary" disabled={draft === r.notes} onClick={() => patch(r.id, { notes: draft }, "Notes saved.")}>Save notes</Button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <ConfirmModal
        open={!!pendingDelete}
        title={`Delete the request from ${pendingDelete?.companyName || "this company"}?`}
        body="Use this for spam or duplicates. A company that said no is better kept as Lost, so it still counts in your win rate."
        confirmText="Delete"
        onCancel={() => setPendingDelete(null)}
        onConfirm={() => { const id = pendingDelete.id; setPendingDelete(null); remove(id); }}
      />
    </div>
  );
}

const linkBtn = {
  display: "inline-flex", alignItems: "center", gap: 6, minHeight: 38, padding: "6px 12px", borderRadius: 8,
  border: "1px solid rgba(15,23,42,.14)", background: "#fff", color: "#0f172a", fontWeight: 900,
  textDecoration: "none", whiteSpace: "nowrap",
};

function Stat({ label, value, color }) {
  return (
    <div style={{ ...ui.card, marginBottom: 0, padding: "12px 14px", borderTop: `3px solid ${color}` }}>
      <div style={{ fontSize: 24, fontWeight: 1000, color }}>{value}</div>
      <div style={{ color: "#64748b", fontWeight: 800, fontSize: 12.5 }}>{label}</div>
    </div>
  );
}

function Chip({ on, onClick, label, color = "#0f766e" }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        border: `1.5px solid ${on ? color : "rgba(15,23,42,.14)"}`, background: on ? color : "#fff",
        color: on ? "#fff" : "#334155", borderRadius: 999, padding: "6px 12px", fontWeight: 900,
        cursor: "pointer", fontFamily: "inherit", whiteSpace: "nowrap",
      }}
    >
      {label}
    </button>
  );
}
