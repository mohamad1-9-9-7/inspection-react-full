// src/pages/ohc/OHCView.jsx
import React, { useEffect, useMemo, useState } from "react";

/* ========= API ========= */
const API_BASE = String(
  (typeof window !== "undefined" && window.__QCS_API__) ||
  (typeof import.meta !== "undefined" && import.meta.env?.VITE_API_URL) ||
  (typeof process !== "undefined" &&
    (process.env?.REACT_APP_API_URL || process.env?.VITE_API_URL || process.env?.RENDER_EXTERNAL_URL)) ||
  "https://inspection-server-4nvj.onrender.com"
).replace(/\/$/, "");

const TYPE = "ohc_certificate";

async function jsonFetch(url, opts = {}) {
  const res = await fetch(url, {
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    ...opts,
  });
  let data = null;
  try { data = await res.json(); } catch { data = null; }
  return { ok: res.ok, status: res.status, data };
}

const BRANCHES = [
  "QCS","POS 6","POS 7","POS 10","POS 11","POS 14","POS 15","POS 16",
  "POS 17","POS 19","POS 21","POS 24","POS 25","POS 37","POS 38","POS 42","POS 44","POS 45"
];

/* ========= Utils ========= */
function toIsoYMD(v) {
  const s = String(v || "").trim();
  if (!s) return "";
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;                      // YYYY-MM-DD
  const isoTime = s.match(/^(\d{4})-(\d{2})-(\d{2})T/);              // 2025-11-03T..
  if (isoTime) return `${isoTime[1]}-${isoTime[2]}-${isoTime[3]}`;
  const dmY = s.match(/^(\d{2})\/(\d{2})\/(\d{4})(?:\s+.*)?$/);      // DD/MM/YYYY
  if (dmY) return `${dmY[3]}-${dmY[2]}-${dmY[1]}`;
  const yMdSlashes = s.match(/^(\d{4})\/(\d{2})\/(\d{2})$/);         // YYYY/MM/DD
  if (yMdSlashes) return `${yMdSlashes[1]}-${yMdSlashes[2]}-${yMdSlashes[3]}`;
  return "";
}
function daysUntil(dateStr) {
  const iso = toIsoYMD(dateStr);
  if (!iso) return null;
  const today = new Date(); today.setHours(0,0,0,0);
  const exp = new Date(iso);
  if (isNaN(exp)) return null;
  const diff = Math.ceil((exp.getTime() - today.getTime()) / 86400000);
  return diff >= 0 ? diff : 0;
}
const getId = (r) =>
  r?.id || r?._id || r?.reportId || r?.payload?.id || r?.payload?._id || r?.payload?.reportId;

/* server list -> flat rows (aligned with latest entry fields) */
function extractReportsList(data) {
  let arr = [];
  if (Array.isArray(data)) arr = data;
  else if (Array.isArray(data?.items)) arr = data.items;
  else if (Array.isArray(data?.data?.items)) arr = data.data.items;
  else if (Array.isArray(data?.data)) arr = data.data;
  else if (Array.isArray(data?.results)) arr = data.results;
  else if (Array.isArray(data?.rows)) arr = data.rows;
  else if (Array.isArray(data?.list)) arr = data.list;

  arr = arr.filter((x) => (x?.type ? x.type === TYPE : true));

  return arr.map((x) => {
    const p = x.payload || {};
    // image could be saved as inline dataURL (imageData) or a URL (imageUrl)
    const image = p.imageData || p.imageUrl || "";
    return {
      _server: { id: getId(x) || x?.id || x?._id },
      name: p.name || "",
      nationality: p.nationality || "",
      job: p.job || "",
      issueDate: toIsoYMD(p.issueDate) || "",
      expiryDate: toIsoYMD(p.expiryDate) || "",
      result: p.result || "",
      branch: p.branch || "",
      image, // optional
    };
  });
}

/* ========= Component ========= */
export default function OHCView() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState({ type: "", text: "" });

  const [filter, setFilter] = useState("all");       // all | soon | expired
  const [branchFilter, setBranchFilter] = useState("all");

  // editing (aligned with entry file)
  const [editingIndex, setEditingIndex] = useState(null);
  const [edit, setEdit] = useState({
    name: "",
    nationality: "",
    job: "",
    issueDate: "",
    expiryDate: "",
    result: "",
    branch: "",
  });

  // Load from server
  async function load() {
    setLoading(true);
    setMsg({ type: "", text: "" });
    const { ok, status, data } = await jsonFetch(
      `${API_BASE}/api/reports?type=${encodeURIComponent(TYPE)}&limit=1000&sort=-createdAt`
    );
    setLoading(false);
    if (!ok) {
      setMsg({ type: "error", text: `Failed to load (HTTP ${status}). ${data?.message || ""}` });
      setRows([]);
      return;
    }
    setRows(extractReportsList(data));
  }

  useEffect(() => { load(); }, []);

  // Filters
  const filtered = useMemo(() => {
    return rows.filter((r) => {
      const d = daysUntil(r.expiryDate);
      if (filter === "soon" && !(d > 0 && d <= 30)) return false;
      if (filter === "expired" && d !== 0) return false;
      if (branchFilter !== "all" && r.branch !== branchFilter) return false;
      return true;
    });
  }, [rows, filter, branchFilter]);

  // Delete
  async function handleDelete(idx) {
    const row = filtered[idx];
    if (!row?._server?.id) return;
    if (!window.confirm(`Delete certificate for "${row.name}"?`)) return;

    setMsg({ type: "", text: "" });
    const { ok, status, data } = await jsonFetch(`${API_BASE}/api/reports/${row._server.id}`, { method: "DELETE" });
    if (!ok) {
      setMsg({ type: "error", text: `Delete failed (HTTP ${status}). ${data?.message || ""}` });
      return;
    }
    setMsg({ type: "ok", text: "Deleted successfully." });
    await load();
  }

  // Edit
  function startEdit(idx) {
    const row = filtered[idx];
    setEditingIndex(idx);
    setEdit({
      name: row.name || "",
      nationality: row.nationality || "",
      job: row.job || "",
      issueDate: row.issueDate || "",
      expiryDate: row.expiryDate || "",
      result: row.result || "",
      branch: row.branch || "",
    });
  }
  function cancelEdit() { setEditingIndex(null); }
  function setEditField(k, v) { setEdit((p) => ({ ...p, [k]: v })); }

  async function saveEdit() {
    const row = filtered[editingIndex];
    if (!row?._server?.id) return;

    // required (same as entry)
    const required = ["name","nationality","job","issueDate","expiryDate","result","branch"];
    for (const k of required) {
      if (!String(edit[k] || "").trim()) {
        setMsg({ type: "error", text: "Please complete all required fields." });
        return;
      }
    }

    const payload = { ...edit };
    const body = JSON.stringify({ payload });

    const { ok, status, data } = await jsonFetch(`${API_BASE}/api/reports/${row._server.id}`, {
      method: "PUT",
      body,
    });

    if (!ok) {
      setMsg({ type: "error", text: `Update failed (HTTP ${status}). ${data?.message || ""}` });
      return;
    }

    setMsg({ type: "ok", text: "Updated successfully." });
    setEditingIndex(null);
    await load();
  }

  return (
    <div style={{ padding: 24, background: "#fff", borderRadius: 12, direction: "ltr", fontFamily: "Inter, Tahoma, Arial, sans-serif", maxWidth: 1200, margin: "2rem auto", boxShadow: "0 4px 12px rgba(0,0,0,.06)" }}>
      <h2 style={{ marginBottom: 12, color: "#1f2937", fontWeight: 800 }}>📋 OHC Certificates</h2>

      {msg.text && (
        <div style={{
          margin: "10px 0",
          padding: "10px 12px",
          borderRadius: 8,
          background: msg.type === "ok" ? "#ecfdf5" : "#fef2f2",
          color: msg.type === "ok" ? "#065f46" : "#991b1b",
          border: `1px solid ${msg.type === "ok" ? "#a7f3d0" : "#fecaca"}`,
          fontWeight: 600,
        }}>
          {msg.text}
        </div>
      )}

      {/* Filters */}
      <div style={{ marginBottom: 16, display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
        <label style={{ fontWeight: 700 }}>Filter:</label>
        <select value={filter} onChange={(e)=>setFilter(e.target.value)} style={{ padding: 8, borderRadius: 6, border: "1px solid #cbd5e1" }}>
          <option value="all">All</option>
          <option value="soon">Expiring soon (≤30d)</option>
          <option value="expired">Expired</option>
        </select>

        <label style={{ fontWeight: 700, marginLeft: 10 }}>Branch:</label>
        <select value={branchFilter} onChange={(e)=>setBranchFilter(e.target.value)} style={{ padding: 8, borderRadius: 6, border: "1px solid #cbd5e1" }}>
          <option value="all">All branches</option>
          {BRANCHES.map((b)=> <option key={b} value={b}>{b}</option>)}
        </select>

        <button onClick={load} disabled={loading} style={{ marginLeft: "auto", padding: "8px 14px", background: "#0ea5e9", color: "#fff", border: 0, borderRadius: 8, fontWeight: 700, cursor: "pointer" }}>
          {loading ? "Refreshing..." : "↻ Refresh"}
        </button>
      </div>

      {/* Edit Panel */}
      {editingIndex !== null && (
        <div style={{ marginBottom: 24, padding: 16, border: "1px solid #e5e7eb", borderRadius: 10, background: "#f8fafc" }}>
          <h3 style={{ marginTop: 0 }}>Edit Certificate</h3>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 }}>
            <Field label="Name" value={edit.name} onChange={(v)=>setEditField("name", v)} />
            <Field label="Nationality" value={edit.nationality} onChange={(v)=>setEditField("nationality", v)} />
            <Field label="Occupation" value={edit.job} onChange={(v)=>setEditField("job", v)} />
            <DateField label="Certificate Issue Date" value={edit.issueDate} onChange={(v)=>setEditField("issueDate", v)} />
            <DateField label="Certificate Expiry Date" value={edit.expiryDate} onChange={(v)=>setEditField("expiryDate", v)} />
            <Select label="Result" value={edit.result} onChange={(v)=>setEditField("result", v)} options={[
              { value: "", label: "-- Select --" },
              { value: "FIT", label: "FIT" },
              { value: "UNFIT", label: "UNFIT" },
            ]} />
            <Select label="Branch" value={edit.branch} onChange={(v)=>setEditField("branch", v)} options={[
              { value: "", label: "-- Select Branch --" },
              ...BRANCHES.map((b)=>({ value: b, label: b }))
            ]} />
          </div>
          <div style={{ marginTop: 12, display: "flex", gap: 10 }}>
            <button onClick={saveEdit} style={{ padding: "8px 14px", background: "#16a34a", color: "#fff", border: 0, borderRadius: 8, fontWeight: 700, cursor: "pointer" }}>Save</button>
            <button onClick={cancelEdit} style={{ padding: "8px 14px", background: "#64748b", color: "#fff", border: 0, borderRadius: 8, fontWeight: 700, cursor: "pointer" }}>Cancel</button>
          </div>
        </div>
      )}

      {/* Table */}
      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14, minWidth: 1000 }}>
          <thead style={{ background: "#eef2f7" }}>
            <tr>
              {["#","Name","Nationality","Occupation","Issue Date","Expiry Date","Result","Days Left","Status","Branch","Image","Actions","Edit"].map(h=>(
                <th key={h} style={{ padding: 10, border: "1px solid #e5e7eb", textAlign: "center" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr><td colSpan={13} style={{ textAlign: "center", padding: 16 }}>No certificates match the current filters.</td></tr>
            ) : filtered.map((r, i) => {
              const d = daysUntil(r.expiryDate);
              const soon = d > 0 && d <= 30;
              const expired = d === 0;
              return (
                <tr key={i} style={{ textAlign: "center", background: soon ? "#fff7ed" : "transparent" }}>
                  <td style={{ padding: 8, border: "1px solid #e5e7eb" }}>{i + 1}</td>
                  <td style={{ padding: 8, border: "1px solid #e5e7eb" }}>{r.name}</td>
                  <td style={{ padding: 8, border: "1px solid #e5e7eb" }}>{r.nationality}</td>
                  <td style={{ padding: 8, border: "1px solid #e5e7eb" }}>{r.job}</td>
                  <td style={{ padding: 8, border: "1px solid #e5e7eb" }}>{toIsoYMD(r.issueDate)}</td>
                  <td style={{ padding: 8, border: "1px solid #e5e7eb", color: (soon || expired) ? "#b91c1c" : "#111827", fontWeight: (soon || expired) ? 700 : 500 }}>{toIsoYMD(r.expiryDate)}</td>
                  <td style={{ padding: 8, border: "1px solid #e5e7eb" }}>{r.result}</td>
                  <td style={{ padding: 8, border: "1px solid #e5e7eb" }}>{d ?? "-"}</td>
                  <td style={{ padding: 8, border: "1px solid #e5e7eb", color: expired ? "#b91c1c" : soon ? "#b45309" : "#065f46", fontWeight: 700 }}>
                    {expired ? "Expired" : soon ? "Expiring soon" : "OK"}
                  </td>
                  <td style={{ padding: 8, border: "1px solid #e5e7eb" }}>{r.branch || "-"}</td>
                  <td style={{ padding: 8, border: "1px solid #e5e7eb" }}>
                    {r.image ? (
                      <img src={r.image} alt="certificate" style={{ height: 48, objectFit: "cover", borderRadius: 6, border: "1px solid #e5e7eb" }} />
                    ) : "—"}
                  </td>
                  <td style={{ padding: 8, border: "1px solid #e5e7eb" }}>
                    <button
                      onClick={() => handleDelete(i)}
                      style={{ padding: "6px 10px", background: "#dc2626", color: "#fff", border: 0, borderRadius: 8, cursor: "pointer" }}
                    >Delete</button>
                  </td>
                  <td style={{ padding: 8, border: "1px solid #e5e7eb" }}>
                    <button
                      onClick={() => startEdit(i)}
                      style={{ padding: "6px 10px", background: "#2563eb", color: "#fff", border: 0, borderRadius: 8, cursor: "pointer" }}
                    >Edit</button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ========= Small UI helpers ========= */
function Field({ label, value, onChange }) {
  return (
    <label style={{ display: "flex", flexDirection: "column", gap: 6, fontWeight: 600, color: "#1f2937" }}>
      {label}
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={{ padding: 8, border: "1px solid #cbd5e1", borderRadius: 8 }}
      />
    </label>
  );
}

function DateField({ label, value, onChange }) {
  return (
    <label style={{ display: "flex", flexDirection: "column", gap: 6, fontWeight: 600, color: "#1f2937" }}>
      {label}
      <input
        type="date"
        value={toIsoYMD(value)}
        onChange={(e) => onChange(e.target.value)}
        style={{ padding: 8, border: "1px solid #cbd5e1", borderRadius: 8 }}
      />
    </label>
  );
}

function Select({ label, value, onChange, options }) {
  return (
    <label style={{ display: "flex", flexDirection: "column", gap: 6, fontWeight: 600, color: "#1f2937" }}>
      {label}
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={{ padding: 8, border: "1px solid #cbd5e1", borderRadius: 8 }}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}
