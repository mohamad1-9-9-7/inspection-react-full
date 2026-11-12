// src/pages/monitor/branches/ftr1/InspectorLinksPanel.jsx
//
// 🔍 Inspector QR — admins mint a QR sticker that lets an outside inspector
// read the last 7 days of this report without an account
// (server: routes/inspectorLinks.cjs, page: pages/public/InspectorWeek.jsx).
//
// The server keeps only a hash of the token, so the QR can be shown ONCE,
// right after it is made: print it then. A lost sticker = revoke + new one.
import React, { useCallback, useEffect, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import API_BASE from "../../../../config/api";
import { buildPublicUrl } from "../../../../config/publicOrigin";
import { getCurrentUser } from "../../../../utils/perms";

const fmt = (s) => (s ? new Date(s).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" }) : "—");
const statusOf = (l) =>
  l.revoked_at ? { text: "Revoked", color: "#991b1b", bg: "#fee2e2" }
    : new Date(l.expires_at) < new Date() ? { text: "Expired", color: "#92400e", bg: "#fef3c7" }
      : { text: "Active", color: "#166534", bg: "#dcfce7" };

export function canManageInspectorLinks() {
  const u = getCurrentUser() || {};
  return !!(u.isAdmin || u.isSuperAdmin);
}

export default function InspectorLinksPanel({ type, title }) {
  const [links, setLinks] = useState([]);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [label, setLabel] = useState("Truck sticker");
  const [validDays, setValidDays] = useState(180);
  const [fresh, setFresh] = useState(null); // { url, link } — the one-time QR

  const load = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/api/inspector-links?type=${encodeURIComponent(type)}`, { cache: "no-store" });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(j?.error || `HTTP ${res.status}`);
      setLinks(Array.isArray(j.links) ? j.links : []);
    } catch (e) {
      setMsg(`❌ Could not load links: ${e.message}`);
    }
  }, [type]);

  useEffect(() => { load(); }, [load]);

  const create = async () => {
    setBusy(true);
    setMsg("");
    try {
      const res = await fetch(`${API_BASE}/api/inspector-links`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type, label, validDays: Number(validDays) }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok || !j.token) throw new Error(j?.error || `HTTP ${res.status}`);
      setFresh({ url: buildPublicUrl(`/inspector/${j.token}`), link: j.link });
      load();
    } catch (e) {
      setMsg(`❌ Could not create the link: ${e.message}`);
    } finally {
      setBusy(false);
    }
  };

  const revoke = async (l) => {
    if (!window.confirm(`Revoke "${l.label || "this link"}"? The QR stops working immediately.`)) return;
    try {
      const res = await fetch(`${API_BASE}/api/inspector-links/${l.id}/revoke`, { method: "POST" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      load();
    } catch (e) {
      setMsg(`❌ Could not revoke: ${e.message}`);
    }
  };

  const printSticker = () => {
    const svg = document.getElementById("inspector-qr-svg");
    if (!svg || !fresh) return;
    const w = window.open("", "_blank", "noopener=no,width=480,height=640");
    if (!w) return;
    w.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>Inspector QR</title>
      <style>body{font-family:Arial,sans-serif;text-align:center;margin:24px}h2{margin:6px 0}p{color:#334155;margin:4px 0}</style>
      </head><body>
      <h2>🔍 Inspection — scan to view</h2>
      <p>${title.replace(/[<>&]/g, "")}</p>
      <div style="margin:14px auto;width:320px">${svg.outerHTML}</div>
      <p>Last 7 days · read-only · no login needed</p>
      <script>window.onload=function(){window.print()}<\/script>
      </body></html>`);
    w.document.close();
  };

  return (
    <div style={box}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
        <div>
          <div style={{ fontWeight: 900 }}>🔍 Inspector QR</div>
          <div style={{ color: "#64748b" }}>
            An inspector scans it and sees the last 7 days of this report — read-only, no account. Only you (admin) can make or revoke one.
          </div>
        </div>
      </div>

      {/* New link */}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center", marginTop: 10 }}>
        <input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Label (where the sticker goes)" style={{ ...field, minWidth: 220 }} maxLength={80} />
        <label style={{ display: "inline-flex", alignItems: "center", gap: 6, fontWeight: 600 }}>
          Valid for
          <select value={validDays} onChange={(e) => setValidDays(e.target.value)} style={field}>
            {[30, 90, 180, 365].map((d) => <option key={d} value={d}>{d} days</option>)}
          </select>
        </label>
        <button type="button" onClick={create} disabled={busy} style={primary}>{busy ? "Creating…" : "＋ Create QR"}</button>
      </div>

      {/* The one-time QR */}
      {fresh && (
        <div style={freshBox}>
          <div id="inspector-qr-wrap" style={{ background: "#fff", padding: 8, borderRadius: 12 }}>
            <QRCodeSVG id="inspector-qr-svg" value={fresh.url} size={190} level="M" includeMargin />
          </div>
          <div style={{ flex: 1, minWidth: 240 }}>
            <div style={{ fontWeight: 900, color: "#92400e" }}>⚠️ Print it now — this QR is shown only once.</div>
            <div style={{ color: "#475569", margin: "4px 0 10px" }}>
              The server keeps only a fingerprint of the link, so it cannot show it again. If the sticker is lost, revoke it below and create a new one.
              Expires {fmt(fresh.link?.expires_at)}.
            </div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <button type="button" onClick={printSticker} style={primary}>🖨️ Print sticker</button>
              <a href={fresh.url} target="_blank" rel="noopener noreferrer" style={ghost}>Open the inspector view</a>
              <button type="button" onClick={() => setFresh(null)} style={ghost}>Done</button>
            </div>
          </div>
        </div>
      )}

      {msg && <div style={{ marginTop: 8, fontWeight: 700, color: "#b91c1c" }}>{msg}</div>}

      {/* Existing links */}
      {links.length > 0 && (
        <div style={{ overflowX: "auto", marginTop: 12 }}>
          <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 640 }}>
            <thead>
              <tr>{["Label", "Status", "Created", "Expires", "Opened", ""].map((h) => <th key={h} style={th}>{h}</th>)}</tr>
            </thead>
            <tbody>
              {links.map((l) => {
                const s = statusOf(l);
                return (
                  <tr key={l.id}>
                    <td style={td}>{l.label || "—"}<div style={{ color: "#94a3b8" }}>by {l.created_by || "—"}</div></td>
                    <td style={td}><span style={{ padding: "3px 10px", borderRadius: 999, background: s.bg, color: s.color, fontWeight: 800 }}>{s.text}</span></td>
                    <td style={td}>{fmt(l.created_at)}</td>
                    <td style={td}>{fmt(l.expires_at)}</td>
                    <td style={td}>{l.open_count || 0}× <div style={{ color: "#94a3b8" }}>{l.last_opened_at ? `last ${fmt(l.last_opened_at)}` : "never"}</div></td>
                    <td style={td}>
                      {!l.revoked_at && <button type="button" onClick={() => revoke(l)} style={danger}>Revoke</button>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

const box = { border: "1px solid #a5f3fc", background: "#f0fdff", borderRadius: 12, padding: 12, marginBottom: 12 };
const field = { height: 36, boxSizing: "border-box", padding: "0 10px", borderRadius: 8, borderWidth: 1, borderStyle: "solid", borderColor: "#cbd5e1", background: "#fff" };
const primary = { padding: "8px 14px", borderRadius: 8, border: "none", background: "#0e7490", color: "#fff", fontWeight: 800, cursor: "pointer" };
const ghost = { padding: "8px 14px", borderRadius: 8, border: "1px solid #0e7490", background: "#fff", color: "#0e7490", fontWeight: 700, cursor: "pointer", textDecoration: "none" };
const danger = { padding: "6px 12px", borderRadius: 8, border: "1px solid #fecaca", background: "#fff", color: "#b91c1c", fontWeight: 700, cursor: "pointer" };
const freshBox = { display: "flex", gap: 14, flexWrap: "wrap", alignItems: "center", marginTop: 12, padding: 12, borderRadius: 12, background: "#fffbeb", border: "1px solid #fcd34d" };
const th = { textAlign: "left", padding: "8px", borderBottom: "1px solid #e2e8f0", color: "#475569" };
const td = { padding: "8px", borderBottom: "1px solid #f1f5f9", verticalAlign: "top" };
