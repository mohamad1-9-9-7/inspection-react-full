// src/pages/ohc/OHCView.jsx
import React, { useEffect, useMemo, useState } from "react";

/* ========= API ========= */
const API_BASE = String(
  (typeof window !== "undefined" && window.__QCS_API__) ||
  (typeof import.meta !== "undefined" && import.meta.env?.VITE_API_URL) ||
  (typeof process !== "undefined" &&
    (process.env?.REACT_APP_API_URL ||
      process.env?.VITE_API_URL ||
      process.env?.RENDER_EXTERNAL_URL)) ||
  "https://inspection-server-4nvj.onrender.com"
).replace(/\/$/, "");

const TYPE = "ohc_certificate";

async function jsonFetch(url, opts = {}) {
  const res = await fetch(url, {
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    ...opts,
  });
  let data = null;
  try {
    data = await res.json();
  } catch {
    data = null;
  }
  return { ok: res.ok, status: res.status, data };
}

const BRANCHES = [
  "QCS",
  "POS 6",
  "POS 7",
  "POS 10",
  "POS 11",
  "POS 14",
  "POS 15",
  "POS 16",
  "POS 17",
  "POS 19",
  "POS 21",
  "POS 24",
  "POS 25",
  "POS 37",
  "POS 38",
  "POS 42",
  "POS 44",
  "POS 45",
];

/* ========= Utils ========= */
function toIsoYMD(v) {
  const s = String(v || "").trim();
  if (!s) return "";
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s; // YYYY-MM-DD
  const isoTime = s.match(/^(\d{4})-(\d{2})-(\d{2})T/); // 2025-11-03T..
  if (isoTime) return `${isoTime[1]}-${isoTime[2]}-${isoTime[3]}`;
  const dmY = s.match(/^(\d{2})\/(\d{2})\/(\d{4})(?:\s+.*)?$/); // DD/MM/YYYY
  if (dmY) return `${dmY[3]}-${dmY[2]}-${dmY[1]}`;
  const yMdSlashes = s.match(/^(\d{4})\/(\d{2})\/(\d{2})$/); // YYYY/MM/DD
  if (yMdSlashes) return `${yMdSlashes[1]}-${yMdSlashes[2]}-${yMdSlashes[3]}`;
  return "";
}
function daysUntil(dateStr) {
  const iso = toIsoYMD(dateStr);
  if (!iso) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const exp = new Date(iso);
  if (isNaN(exp)) return null;
  const diff = Math.ceil((exp.getTime() - today.getTime()) / 86400000);
  return diff >= 0 ? diff : 0;
}
const getId = (r) =>
  r?.id ||
  r?._id ||
  r?.reportId ||
  r?.payload?.id ||
  r?.payload?._id ||
  r?.payload?.reportId;

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
    const image = p.imageData || p.imageUrl || "";
    return {
      _server: {
        id: getId(x) || x?.id || x?._id,
        rawPayload: p,
      },
      appNo: p.appNo || "", // used as Employee Number
      name: p.name || "",
      nationality: p.nationality || "",
      job: p.job || "",
      issueDate: toIsoYMD(p.issueDate) || "",
      expiryDate: toIsoYMD(p.expiryDate) || "",
      result: p.result || "",
      branch: p.branch || "",
      image,
    };
  });
}

/* ========= Component ========= */
export default function OHCView() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState({ type: "", text: "" });

  const [filter, setFilter] = useState("all"); // all | soon | expired
  const [branchFilter, setBranchFilter] = useState("all");
  const [resultFilter, setResultFilter] = useState("all"); // all | FIT | UNFIT
  const [search, setSearch] = useState(""); // search by employeeNo/name/nationality/job/branch

  // editing (بدون تغيير رقم الموظف أو الصورة، وبدون Issue Date)
  const [editingIndex, setEditingIndex] = useState(null);
  const [edit, setEdit] = useState({
    name: "",
    nationality: "",
    job: "",
    expiryDate: "",
    result: "",
    branch: "",
  });

  // image modal
  const [modalImage, setModalImage] = useState(null); // { src, appNo, name, serverId }

  // Load from server
  async function load() {
    setLoading(true);
    setMsg({ type: "", text: "" });
    try {
      const { ok, status, data } = await jsonFetch(
        `${API_BASE}/api/reports?type=${encodeURIComponent(
          TYPE
        )}&limit=1000&sort=-createdAt`
      );
      if (!ok) {
        setMsg({
          type: "error",
          text: `Failed to load (HTTP ${status}). ${data?.message || ""}`,
        });
        setRows([]);
        return;
      }
      setRows(extractReportsList(data));
    } catch (err) {
      console.error("OHC load error:", err);
      setMsg({
        type: "error",
        text:
          "Network error while loading data. Please check your connection and try again.",
      });
      setRows([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  // Filters + search + result filter
  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return rows.filter((r) => {
      const d = daysUntil(r.expiryDate);

      if (filter === "soon" && !(d > 0 && d <= 30)) return false;
      if (filter === "expired" && d !== 0) return false;
      if (branchFilter !== "all" && r.branch !== branchFilter) return false;
      if (resultFilter !== "all" && r.result !== resultFilter) return false;

      if (term) {
        const haystack = `${r.appNo} ${r.name} ${r.nationality} ${r.job} ${r.branch}`.toLowerCase();
        if (!haystack.includes(term)) return false;
      }

      return true;
    });
  }, [rows, filter, branchFilter, resultFilter, search]);

  // Delete record
  async function handleDelete(idx) {
    const row = filtered[idx];
    if (!row?._server?.id) return;
    if (!window.confirm(`Delete certificate for "${row.name}"?`)) return;

    setMsg({ type: "", text: "" });
    try {
      const { ok, status, data } = await jsonFetch(
        `${API_BASE}/api/reports/${row._server.id}`,
        { method: "DELETE" }
      );
      if (!ok) {
        setMsg({
          type: "error",
          text: `Delete failed (HTTP ${status}). ${data?.message || ""}`,
        });
        return;
      }
      setMsg({ type: "ok", text: "Deleted successfully." });
      await load();
    } catch (err) {
      console.error("OHC delete error:", err);
      setMsg({
        type: "error",
        text: "Network error while deleting. Please try again.",
      });
    }
  }

  // Edit record
  function startEdit(idx) {
    const row = filtered[idx];
    setEditingIndex(idx);
    setEdit({
      name: row.name || "",
      nationality: row.nationality || "",
      job: row.job || "",
      expiryDate: row.expiryDate || "",
      result: row.result || "",
      branch: row.branch || "",
    });
    setMsg({ type: "", text: "" });
  }
  function cancelEdit() {
    setEditingIndex(null);
  }
  function setEditField(k, v) {
    setEdit((p) => ({ ...p, [k]: v }));
  }

  async function saveEdit() {
    const row = filtered[editingIndex];
    if (!row?._server?.id) return;

    const required = [
      "name",
      "nationality",
      "job",
      "expiryDate",
      "result",
      "branch",
    ];
    for (const k of required) {
      if (!String(edit[k] || "").trim()) {
        setMsg({
          type: "error",
          text: "Please complete all required fields.",
        });
        return;
      }
    }

    const expiryIso = toIsoYMD(edit.expiryDate);

    if (!expiryIso) {
      setMsg({
        type: "error",
        text: "Invalid expiry date format. Please re-select the date.",
      });
      return;
    }

    const todayStr = new Date().toISOString().slice(0, 10);
    if (expiryIso < todayStr) {
      const cont = window.confirm(
        "This OHC certificate appears to be expired already.\nDo you still want to save these changes?"
      );
      if (!cont) return;
    }

    const base = row._server.rawPayload || {};
    const payload = {
      ...base,
      name: edit.name,
      nationality: edit.nationality,
      job: edit.job,
      expiryDate: expiryIso,
      result: edit.result,
      branch: edit.branch,
    };

    try {
      const { ok, status, data } = await jsonFetch(
        `${API_BASE}/api/reports/${row._server.id}`,
        {
          method: "PUT",
          body: JSON.stringify({ payload }),
        }
      );

      if (!ok) {
        setMsg({
          type: "error",
          text: `Update failed (HTTP ${status}). ${data?.message || ""}`,
        });
        return;
      }

      setMsg({ type: "ok", text: "Updated successfully." });
      setEditingIndex(null);
      await load();
    } catch (err) {
      console.error("OHC update error:", err);
      setMsg({
        type: "error",
        text: "Network error while updating. Please try again.",
      });
    }
  }

  // ======= Image modal + remove image + download =======
  function openImage(r) {
    if (!r?.image) return;
    setModalImage({
      src: r.image,
      appNo: r.appNo || "",
      name: r.name || "",
      serverId: r._server?.id || null,
    });
  }

  function closeModal() {
    setModalImage(null);
  }

  async function handleDeleteImage(modal) {
    if (!modal?.serverId) return;
    const row = rows.find((r) => r._server?.id === modal.serverId);
    if (!row) return;

    if (
      !window.confirm(
        `Remove image for "${row.name}" (Employee Number: ${
          row.appNo || "N/A"
        })? This will keep the certificate data but delete the attached image.`
      )
    ) {
      return;
    }

    setMsg({ type: "", text: "" });

    const base = row._server.rawPayload || {};
    const payload = {
      ...base,
      imageData: "",
      imageUrl: "",
      imageName: "",
      imageType: "",
    };

    try {
      const { ok, status, data } = await jsonFetch(
        `${API_BASE}/api/reports/${row._server.id}`,
        {
          method: "PUT",
          body: JSON.stringify({ payload }),
        }
      );

      if (!ok) {
        setMsg({
          type: "error",
          text: `Image remove failed (HTTP ${status}). ${data?.message || ""}`,
        });
        return;
      }

      setMsg({ type: "ok", text: "Image removed successfully." });
      setModalImage(null);
      await load();
    } catch (err) {
      console.error("OHC image delete error:", err);
      setMsg({
        type: "error",
        text: "Network error while removing image. Please try again.",
      });
    }
  }

  const total = rows.length;
  const showing = filtered.length;

  return (
    <div
      style={{
        minHeight: "100vh",
        padding: "2.5rem 1.5rem",
        background:
          "radial-gradient(circle at top left, #0f766e 0%, #0f172a 40%, #020617 80%)",
        display: "flex",
        alignItems: "flex-start",
        justifyContent: "center",
        boxSizing: "border-box",
        fontFamily: "Inter, Tahoma, Arial, sans-serif",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 1300,
          background:
            "linear-gradient(135deg, rgba(15,23,42,0.96), rgba(15,23,42,0.94))",
          borderRadius: 26,
          padding: 2,
          boxShadow: "0 28px 70px rgba(15,23,42,0.8)",
          border: "1px solid rgba(148,163,184,0.55)",
        }}
      >
        <div
          style={{
            background:
              "radial-gradient(circle at top right, #ecfeff 0%, #f9fafb 40%, #e5e7eb 100%)",
            borderRadius: 24,
            padding: "1.75rem 1.75rem 1.75rem",
          }}
        >
          {/* Header */}
          <div
            style={{
              marginBottom: 18,
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-start",
              gap: 16,
              flexWrap: "wrap",
            }}
          >
            <div>
              <div
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  padding: "2px 10px",
                  borderRadius: 999,
                  fontSize: 11,
                  fontWeight: 600,
                  textTransform: "uppercase",
                  letterSpacing: 0.6,
                  background:
                    "linear-gradient(135deg, rgba(56,189,248,0.12), rgba(8,47,73,0.08))",
                  color: "#0369a1",
                  border: "1px solid rgba(56,189,248,0.7)",
                }}
              >
                <span
                  style={{
                    width: 6,
                    height: 6,
                    borderRadius: "999px",
                    background:
                      "radial-gradient(circle, #22c55e 0%, #15803d 60%, #052e16 100%)",
                  }}
                />
                OHC Certificates Register
              </div>
              <h2
                style={{
                  margin: "8px 0 4px",
                  color: "#0f172a",
                  fontWeight: 800,
                  fontSize: 22,
                  letterSpacing: 0.2,
                }}
              >
                📋 OHC Certificates Overview
              </h2>
              <div
                style={{
                  fontSize: 13,
                  color: "#4b5563",
                }}
              >
                Centralized view of employee OHC certificates with expiry
                tracking, branch filter and image attachments.
              </div>

              <div
                style={{
                  marginTop: 10,
                  display: "flex",
                  gap: 8,
                  fontSize: 12,
                  flexWrap: "wrap",
                }}
              >
                <span
                  style={{
                    padding: "3px 10px",
                    borderRadius: 999,
                    background: "rgba(22,163,74,0.08)",
                    color: "#166534",
                    fontWeight: 700,
                    border: "1px solid rgba(74,222,128,0.6)",
                  }}
                >
                  Total: {total}
                </span>
                <span
                  style={{
                    padding: "3px 10px",
                    borderRadius: 999,
                    background: "rgba(37,99,235,0.06)",
                    color: "#1d4ed8",
                    fontWeight: 700,
                    border: "1px solid rgba(129,140,248,0.6)",
                  }}
                >
                  Showing: {showing}
                </span>
              </div>
            </div>

            {/* Search box */}
            <div
              style={{
                minWidth: 260,
                maxWidth: 360,
                marginLeft: "auto",
              }}
            >
              <label
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: 4,
                  fontSize: 11,
                  fontWeight: 600,
                  color: "#0f172a",
                }}
              >
                Search
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    padding: "6px 10px",
                    borderRadius: 999,
                    border: "1px solid rgba(148,163,184,0.9)",
                    background:
                      "linear-gradient(135deg,#f9fafb,#f1f5f9,#e5e7eb)",
                  }}
                >
                  <span style={{ fontSize: 14, opacity: 0.8 }}>🔍</span>
                  <input
                    type="text"
                    placeholder="Employee No, Name, Nationality, Branch..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    style={{
                      flex: 1,
                      border: "none",
                      outline: "none",
                      background: "transparent",
                      fontSize: 13,
                    }}
                  />
                </div>
              </label>
            </div>
          </div>

          {msg.text && (
            <div
              style={{
                margin: "10px 0 16px",
                padding: "10px 12px",
                borderRadius: 12,
                background:
                  msg.type === "ok"
                    ? "linear-gradient(135deg,#ecfdf5,#dcfce7)"
                    : "linear-gradient(135deg,#fef2f2,#fee2e2)",
                color: msg.type === "ok" ? "#065f46" : "#991b1b",
                border: `1px solid ${
                  msg.type === "ok" ? "#22c55e" : "#fca5a5"
                }`,
                fontWeight: 600,
                display: "flex",
                alignItems: "center",
                gap: 8,
              }}
            >
              <span
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: 999,
                  background:
                    msg.type === "ok" ? "#16a34a" : "rgba(220,38,38,0.9)",
                  boxShadow:
                    msg.type === "ok"
                      ? "0 0 0 4px rgba(34,197,94,0.18)"
                      : "0 0 0 4px rgba(248,113,113,0.2)",
                }}
              />
              <span>{msg.text}</span>
            </div>
          )}

          {/* Filters row */}
          <div
            style={{
              marginBottom: 18,
              display: "flex",
              gap: 12,
              alignItems: "center",
              flexWrap: "wrap",
              background:
                "linear-gradient(135deg,rgba(15,23,42,0.02),rgba(8,47,73,0.03))",
              padding: 12,
              borderRadius: 16,
              border: "1px solid rgba(148,163,184,0.5)",
            }}
          >
            <div
              style={{
                fontSize: 11,
                textTransform: "uppercase",
                letterSpacing: 0.6,
                fontWeight: 700,
                color: "#0f172a",
                marginRight: 6,
              }}
            >
              Filters
            </div>

            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <span style={{ fontWeight: 700, fontSize: 13 }}>Expiry:</span>
              <select
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                style={{
                  padding: "6px 10px",
                  borderRadius: 999,
                  border: "1px solid #cbd5e1",
                  fontSize: 13,
                  background:
                    "linear-gradient(135deg,#ffffff,#f9fafb,#e5e7eb)",
                }}
              >
                <option value="all">All</option>
                <option value="soon">Expiring soon (≤30d)</option>
                <option value="expired">Expired</option>
              </select>
            </div>

            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <span style={{ fontWeight: 700, fontSize: 13 }}>Branch:</span>
              <select
                value={branchFilter}
                onChange={(e) => setBranchFilter(e.target.value)}
                style={{
                  padding: "6px 10px",
                  borderRadius: 999,
                  border: "1px solid #cbd5e1",
                  fontSize: 13,
                  background:
                    "linear-gradient(135deg,#ffffff,#f9fafb,#e5e7eb)",
                }}
              >
                <option value="all">All branches</option>
                {BRANCHES.map((b) => (
                  <option key={b} value={b}>
                    {b}
                  </option>
                ))}
              </select>
            </div>

            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <span style={{ fontWeight: 700, fontSize: 13 }}>Result:</span>
              <select
                value={resultFilter}
                onChange={(e) => setResultFilter(e.target.value)}
                style={{
                  padding: "6px 10px",
                  borderRadius: 999,
                  border: "1px solid #cbd5e1",
                  fontSize: 13,
                  background:
                    "linear-gradient(135deg,#ffffff,#f9fafb,#e5e7eb)",
                }}
              >
                <option value="all">All</option>
                <option value="FIT">FIT</option>
                <option value="UNFIT">UNFIT</option>
              </select>
            </div>

            <button
              onClick={load}
              disabled={loading}
              style={{
                marginLeft: "auto",
                padding: "8px 16px",
                background: loading
                  ? "linear-gradient(135deg,#38bdf8,#0ea5e9)"
                  : "linear-gradient(135deg,#38bdf8,#0ea5e9,#0369a1)",
                color: "#f9fafb",
                border: 0,
                borderRadius: 999,
                fontWeight: 700,
                fontSize: 13,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: 6,
                boxShadow: "0 10px 25px rgba(14,165,233,0.55)",
                opacity: loading ? 0.9 : 1,
              }}
            >
              {loading ? "Refreshing..." : "↻ Refresh"}
            </button>
          </div>

          {/* Edit Panel */}
          {editingIndex !== null && (
            <div
              style={{
                marginBottom: 24,
                padding: 16,
                border: "1px solid #e5e7eb",
                borderRadius: 16,
                background:
                  "linear-gradient(135deg,#f9fafb,#f3f4f6,#e5e7eb)",
              }}
            >
              <h3
                style={{
                  marginTop: 0,
                  marginBottom: 10,
                  fontSize: 16,
                  color: "#0f172a",
                }}
              >
                Edit Certificate{" "}
                <span
                  style={{
                    fontWeight: 400,
                    fontSize: 13,
                    color: "#4b5563",
                  }}
                >
                  {`(Employee Number: ${
                    filtered[editingIndex]?.appNo || "N/A"
                  })`}
                </span>
              </h3>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
                  gap: 12,
                }}
              >
                <Field
                  label="Name"
                  value={edit.name}
                  onChange={(v) => setEditField("name", v)}
                />
                <Field
                  label="Nationality"
                  value={edit.nationality}
                  onChange={(v) => setEditField("nationality", v)}
                />
                <Field
                  label="Occupation"
                  value={edit.job}
                  onChange={(v) => setEditField("job", v)}
                />
                <DateField
                  label="Certificate Expiry Date"
                  value={edit.expiryDate}
                  onChange={(v) => setEditField("expiryDate", v)}
                />
                <Select
                  label="Result"
                  value={edit.result}
                  onChange={(v) => setEditField("result", v)}
                  options={[
                    { value: "", label: "-- Select --" },
                    { value: "FIT", label: "FIT" },
                    { value: "UNFIT", label: "UNFIT" },
                  ]}
                />
                <Select
                  label="Branch"
                  value={edit.branch}
                  onChange={(v) => setEditField("branch", v)}
                  options={[
                    { value: "", label: "-- Select Branch --" },
                    ...BRANCHES.map((b) => ({ value: b, label: b })),
                  ]}
                />
              </div>
              <div style={{ marginTop: 12, display: "flex", gap: 10 }}>
                <button
                  onClick={saveEdit}
                  style={{
                    padding: "8px 16px",
                    background:
                      "linear-gradient(135deg,#22c55e,#16a34a,#15803d)",
                    color: "#fff",
                    border: 0,
                    borderRadius: 999,
                    fontWeight: 700,
                    cursor: "pointer",
                    fontSize: 13,
                    boxShadow: "0 10px 24px rgba(22,163,74,0.55)",
                  }}
                >
                  Save
                </button>
                <button
                  onClick={cancelEdit}
                  style={{
                    padding: "8px 16px",
                    background:
                      "linear-gradient(135deg,#94a3b8,#64748b,#475569)",
                    color: "#fff",
                    border: 0,
                    borderRadius: 999,
                    fontWeight: 700,
                    fontSize: 13,
                    cursor: "pointer",
                  }}
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* Table */}
          <div
            style={{
              overflowX: "auto",
              borderRadius: 18,
              border: "1px solid #e5e7eb",
              background:
                "linear-gradient(135deg,#ffffff,#f9fafb,#f3f4f6)",
            }}
          >
            <table
              style={{
                width: "100%",
                borderCollapse: "collapse",
                fontSize: 13,
                minWidth: 1100,
              }}
            >
              <thead>
                <tr
                  style={{
                    background:
                      "linear-gradient(135deg,#0f172a,#020617,#0f172a)",
                    color: "#e5e7eb",
                  }}
                >
                  {[
                    "#",
                    "Employee Number",
                    "Name",
                    "Nationality",
                    "Occupation",
                    "Expiry Date",
                    "Result",
                    "Days Left",
                    "Status",
                    "Branch",
                    "Image",
                    "Actions",
                    "Edit",
                  ].map((h) => (
                    <th
                      key={h}
                      style={{
                        padding: 10,
                        borderBottom: "1px solid #1f2937",
                        textAlign: "center",
                        fontWeight: 700,
                        whiteSpace: "nowrap",
                      }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td
                      colSpan={13}
                      style={{
                        textAlign: "center",
                        padding: 20,
                        color: "#6b7280",
                      }}
                    >
                      No certificates match the current filters/search.
                    </td>
                  </tr>
                ) : (
                  filtered.map((r, i) => {
                    const d = daysUntil(r.expiryDate);
                    const soon = d > 0 && d <= 30;
                    const expired = d === 0;

                    let rowBg = i % 2 === 0 ? "#ffffff" : "#f9fafb";
                    if (soon) rowBg = "#fff7ed";
                    if (expired) rowBg = "#fee2e2";

                    const resultBadgeStyle =
                      r.result === "FIT"
                        ? {
                            background: "#dcfce7",
                            color: "#166534",
                            borderColor: "#bbf7d0",
                          }
                        : r.result === "UNFIT"
                        ? {
                            background: "#fee2e2",
                            color: "#b91c1c",
                            borderColor: "#fecaca",
                          }
                        : {
                            background: "#e5e7eb",
                            color: "#374151",
                            borderColor: "#d1d5db",
                          };

                    const statusText = expired
                      ? "Expired"
                      : soon
                      ? "Expiring soon"
                      : "OK";
                    const statusColor = expired
                      ? "#b91c1c"
                      : soon
                      ? "#b45309"
                      : "#065f46";

                    return (
                      <tr
                        key={i}
                        style={{
                          textAlign: "center",
                          background: rowBg,
                        }}
                      >
                        <td
                          style={{
                            padding: 8,
                            borderTop: "1px solid #e5e7eb",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {i + 1}
                        </td>
                        <td
                          style={{
                            padding: 8,
                            borderTop: "1px solid #e5e7eb",
                            fontWeight: 700,
                            whiteSpace: "nowrap",
                          }}
                        >
                          {r.appNo || "—"}
                        </td>
                        <td
                          style={{
                            padding: 8,
                            borderTop: "1px solid #e5e7eb",
                          }}
                        >
                          {r.name}
                        </td>
                        <td
                          style={{
                            padding: 8,
                            borderTop: "1px solid #e5e7eb",
                          }}
                        >
                          {r.nationality}
                        </td>
                        <td
                          style={{
                            padding: 8,
                            borderTop: "1px solid #e5e7eb",
                          }}
                        >
                          {r.job}
                        </td>
                        <td
                          style={{
                            padding: 8,
                            borderTop: "1px solid #e5e7eb",
                            whiteSpace: "nowrap",
                          }}
                        >
                          <span
                            style={{
                              color: soon || expired ? "#b91c1c" : "#111827",
                              fontWeight: soon || expired ? 700 : 500,
                            }}
                          >
                            {toIsoYMD(r.expiryDate)}
                          </span>
                        </td>
                        <td
                          style={{
                            padding: 8,
                            borderTop: "1px solid #e5e7eb",
                          }}
                        >
                          <span
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              justifyContent: "center",
                              minWidth: 60,
                              padding: "2px 8px",
                              borderRadius: 999,
                              borderWidth: 1,
                              borderStyle: "solid",
                              fontSize: 11,
                              fontWeight: 700,
                              ...resultBadgeStyle,
                            }}
                          >
                            {r.result || "—"}
                          </span>
                        </td>
                        <td
                          style={{
                            padding: 8,
                            borderTop: "1px solid #e5e7eb",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {d ?? "-"}
                        </td>
                        <td
                          style={{
                            padding: 8,
                            borderTop: "1px solid #e5e7eb",
                          }}
                        >
                          <span
                            style={{
                              fontWeight: 700,
                              color: statusColor,
                            }}
                          >
                            {statusText}
                          </span>
                        </td>
                        <td
                          style={{
                            padding: 8,
                            borderTop: "1px solid #e5e7eb",
                          }}
                        >
                          {r.branch || "-"}
                        </td>
                        <td
                          style={{
                            padding: 8,
                            borderTop: "1px solid #e5e7eb",
                          }}
                        >
                          {r.image ? (
                            <img
                              src={r.image}
                              alt="certificate"
                              onClick={() => openImage(r)}
                              title="Click to view"
                              style={{
                                height: 48,
                                objectFit: "cover",
                                borderRadius: 6,
                                border: "1px solid #e5e7eb",
                                cursor: "pointer",
                                boxShadow:
                                  "0 6px 16px rgba(15,23,42,0.35)",
                              }}
                            />
                          ) : (
                            "—"
                          )}
                        </td>
                        <td
                          style={{
                            padding: 8,
                            borderTop: "1px solid #e5e7eb",
                            whiteSpace: "nowrap",
                          }}
                        >
                          <button
                            onClick={() => handleDelete(i)}
                            style={{
                              padding: "6px 12px",
                              background:
                                "linear-gradient(135deg,#ef4444,#b91c1c)",
                              color: "#fff",
                              border: 0,
                              borderRadius: 999,
                              cursor: "pointer",
                              fontSize: 11,
                              fontWeight: 700,
                            }}
                          >
                            Delete
                          </button>
                        </td>
                        <td
                          style={{
                            padding: 8,
                            borderTop: "1px solid #e5e7eb",
                            whiteSpace: "nowrap",
                          }}
                        >
                          <button
                            onClick={() => startEdit(i)}
                            style={{
                              padding: "6px 12px",
                              background:
                                "linear-gradient(135deg,#2563eb,#1d4ed8)",
                              color: "#fff",
                              border: 0,
                              borderRadius: 999,
                              cursor: "pointer",
                              fontSize: 11,
                              fontWeight: 700,
                            }}
                          >
                            Edit
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* ===== Image modal ===== */}
          {modalImage && (
            <div
              onClick={closeModal}
              style={{
                position: "fixed",
                top: 0,
                left: 0,
                width: "100%",
                height: "100%",
                background: "rgba(15,23,42,0.82)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                zIndex: 9999,
              }}
            >
              <div
                onClick={(e) => e.stopPropagation()}
                style={{
                  background:
                    "linear-gradient(135deg,#f9fafb,#e5e7eb,#d1d5db)",
                  borderRadius: 16,
                  padding: 16,
                  maxWidth: "90%",
                  maxHeight: "90%",
                  display: "flex",
                  flexDirection: "column",
                  boxShadow: "0 24px 60px rgba(15,23,42,0.85)",
                  border: "1px solid rgba(148,163,184,0.9)",
                }}
              >
                <div
                  style={{
                    marginBottom: 8,
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    gap: 8,
                  }}
                >
                  <div
                    style={{
                      fontWeight: 700,
                      fontSize: 15,
                      color: "#0f172a",
                    }}
                  >
                    {modalImage.name || "OHC Certificate"}{" "}
                    {modalImage.appNo
                      ? ` (Employee Number: ${modalImage.appNo})`
                      : ""}
                  </div>
                  <button
                    onClick={closeModal}
                    style={{
                      border: 0,
                      background: "transparent",
                      fontSize: 20,
                      fontWeight: 700,
                      cursor: "pointer",
                      lineHeight: 1,
                      color: "#111827",
                    }}
                  >
                    ×
                  </button>
                </div>

                <div
                  style={{
                    flex: 1,
                    overflow: "auto",
                    borderRadius: 10,
                    border: "1px solid #e5e7eb",
                    background: "#020617",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    padding: 8,
                  }}
                >
                  <img
                    src={modalImage.src}
                    alt="OHC certificate"
                    style={{
                      maxWidth: "100%",
                      maxHeight: "100%",
                      objectFit: "contain",
                      borderRadius: 8,
                    }}
                  />
                </div>

                <div
                  style={{
                    marginTop: 12,
                    display: "flex",
                    justifyContent: "flex-end",
                    gap: 10,
                  }}
                >
                  <a
                    href={modalImage.src}
                    download={`OHC-${modalImage.appNo || "certificate"}.jpg`}
                    style={{
                      textDecoration: "none",
                      padding: "8px 14px",
                      borderRadius: 999,
                      border: 0,
                      background:
                        "linear-gradient(135deg,#0ea5e9,#0369a1)",
                      color: "#fff",
                      fontWeight: 700,
                      fontSize: 13,
                      textAlign: "center",
                    }}
                  >
                    Download
                  </a>
                  <button
                    onClick={() => handleDeleteImage(modalImage)}
                    style={{
                      padding: "8px 14px",
                      borderRadius: 999,
                      border: 0,
                      background:
                        "linear-gradient(135deg,#ef4444,#b91c1c)",
                      color: "#fff",
                      fontWeight: 700,
                      fontSize: 13,
                      cursor: "pointer",
                    }}
                  >
                    Remove Image
                  </button>
                  <button
                    onClick={closeModal}
                    style={{
                      padding: "8px 14px",
                      borderRadius: 999,
                      border: 0,
                      background:
                        "linear-gradient(135deg,#94a3b8,#64748b)",
                      color: "#fff",
                      fontWeight: 700,
                      fontSize: 13,
                      cursor: "pointer",
                    }}
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ========= Small UI helpers ========= */
function Field({ label, value, onChange }) {
  return (
    <label
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 4,
        fontWeight: 600,
        color: "#1f2937",
        fontSize: 13,
      }}
    >
      {label}
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={{
          padding: 8,
          border: "1px solid #cbd5e1",
          borderRadius: 10,
          fontSize: 13,
          background:
            "linear-gradient(135deg,#ffffff,#f9fafb,#e5e7eb)",
        }}
      />
    </label>
  );
}

function DateField({ label, value, onChange }) {
  return (
    <label
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 4,
        fontWeight: 600,
        color: "#1f2937",
        fontSize: 13,
      }}
    >
      {label}
      <input
        type="date"
        value={toIsoYMD(value)}
        onChange={(e) => onChange(e.target.value)}
        style={{
          padding: 8,
          border: "1px solid #cbd5e1",
          borderRadius: 10,
          fontSize: 13,
          background:
            "linear-gradient(135deg,#ffffff,#f9fafb,#e5e7eb)",
        }}
      />
    </label>
  );
}

function Select({ label, value, onChange, options }) {
  return (
    <label
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 4,
        fontWeight: 600,
        color: "#1f2937",
        fontSize: 13,
      }}
    >
      {label}
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={{
          padding: 8,
          border: "1px solid #cbd5e1",
          borderRadius: 10,
          fontSize: 13,
          background:
            "linear-gradient(135deg,#ffffff,#f9fafb,#e5e7eb)",
        }}
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
