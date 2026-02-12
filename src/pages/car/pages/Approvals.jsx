import React, { useMemo, useState } from "react";
import { Link } from "react-router-dom";

/* ========== API ========== */
const API_BASE =
  (typeof window !== "undefined" && window.__QCS_API__) ||
  (typeof import.meta !== "undefined" && import.meta.env?.VITE_API_URL) ||
  process.env.REACT_APP_API_URL ||
  "https://inspection-server-4nvj.onrender.com";

const TYPE = "car_approvals";
const FIXED_DATE = "2000-01-01";

/* ✅ Defaults */
const DEFAULT_COMPANY = "TRANS EMIRATES LIVESTOCK TRADING LLC";

/* ✅ Emirates dropdown options */
const EMIRATES = [
  "",
  "Dubai",
  "Abu Dhabi",
  "Sharjah",
  "Ajman",
  "Umm Al Quwain",
  "Ras Al Khaimah",
  "Fujairah",
  "Al Ain",
];

/* ===== Upload/Delete images via your existing server endpoints ===== */
async function uploadViaServer(file) {
  const fd = new FormData();
  fd.append("file", file);
  const res = await fetch(`${API_BASE}/api/images`, { method: "POST", body: fd });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.ok || !(data.optimized_url || data.url)) {
    throw new Error(data?.error || "Upload failed");
  }
  return data.optimized_url || data.url;
}

async function deleteImage(url) {
  if (!url) return;
  const res = await fetch(`${API_BASE}/api/images?url=${encodeURIComponent(url)}`, {
    method: "DELETE",
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data?.ok) {
    throw new Error(data?.error || "Delete image failed");
  }
}

/* ===== Save approvals (single fixed file) ===== */
async function saveApprovalsToServer(items) {
  const _clientSavedAt = Date.now();

  const payload = {
    reporter: "anonymous",
    type: TYPE,
    payload: { reportDate: FIXED_DATE, items, _clientSavedAt },
  };

  const attempts = [
    { url: `${API_BASE}/api/reports`, method: "PUT", body: JSON.stringify(payload) },
    {
      url: `${API_BASE}/api/reports/${TYPE}?reportDate=${encodeURIComponent(FIXED_DATE)}`,
      method: "PUT",
      body: JSON.stringify({ items, _clientSavedAt }),
    },
  ];

  let lastErr = null;
  for (const a of attempts) {
    try {
      const res = await fetch(a.url, {
        method: a.method,
        headers: { "Content-Type": "application/json" },
        body: a.body,
      });
      if (res.ok) return await res.json().catch(() => ({ ok: true }));
      lastErr = new Error(`${a.method} ${a.url} -> ${res.status}`);
    } catch (e) {
      lastErr = e;
    }
  }
  throw lastErr || new Error("Save failed");
}

/* ✅ Load ALL approvals for merge (does NOT render anything) */
async function loadAllApprovalsForMerge() {
  const attempts = [
    `${API_BASE}/api/reports?type=${encodeURIComponent(TYPE)}`,
    `${API_BASE}/api/reports`,
  ];

  for (const url of attempts) {
    try {
      const res = await fetch(url);
      if (!res.ok) continue;

      const data = await res.json().catch(() => ({}));
      const rows = data?.rows || data?.data || (Array.isArray(data) ? data : []);
      if (!Array.isArray(rows) || rows.length === 0) return [];

      const onlyType = rows.filter((x) => x?.type === TYPE);

      const onlyFixed = onlyType.filter((x) => {
        const rd = x?.payload?.reportDate || x?.payload?.payload?.reportDate || "";
        return rd === FIXED_DATE;
      });

      const source = onlyFixed.length ? onlyFixed : onlyType;
      if (!source.length) return [];

      let all = [];
      for (const rec of source) {
        const payload = rec?.payload || rec?.payload?.payload || null;
        const items = payload?.items || payload?.payload?.items || [];
        if (Array.isArray(items) && items.length) all.push(...items);
      }

      return Array.isArray(all) ? all : [];
    } catch {}
  }

  return [];
}

/* ===== Helpers ===== */
function parseDateSmart(s) {
  if (!s) return null;
  const str = String(s).trim();

  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
    const [y, m, d] = str.split("-").map(Number);
    const dt = new Date(y, m - 1, d);
    return isNaN(dt.getTime()) ? null : dt;
  }
  if (/^\d{2}-\d{2}-\d{4}$/.test(str)) {
    const [d, m, y] = str.split("-").map(Number);
    const dt = new Date(y, m - 1, d);
    return isNaN(dt.getTime()) ? null : dt;
  }

  const dt = new Date(str);
  return isNaN(dt.getTime()) ? null : dt;
}

function daysRemaining(expiryStr) {
  const dt = parseDateSmart(expiryStr);
  if (!dt) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  dt.setHours(0, 0, 0, 0);
  const diffMs = dt.getTime() - today.getTime();
  return Math.round(diffMs / (1000 * 60 * 60 * 24));
}

const normalizeRow = (r) => ({
  company: (r?.company || "").trim(),
  emirate: (r?.emirate || "").trim(),
  tradeLicense: (r?.tradeLicense || "").trim(),
  vehicleNo: (r?.vehicleNo || "").trim(),
  issueDate: (r?.issueDate || "").trim(),
  expiryDate: (r?.expiryDate || "").trim(),
  permitType: (r?.permitType || "").trim(),
  foodType: (r?.foodType || "").trim(),
  remarks: (r?.remarks || "").trim(),
  imageUrl: (r?.imageUrl || "").trim(),
});

function dedupeRows(list) {
  const seen = new Set();
  const out = [];
  for (const r of list) {
    const key = `${r.vehicleNo}__${r.tradeLicense}__${r.issueDate}__${r.expiryDate}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(r);
  }
  return out;
}

const baseRow = () => ({
  company: DEFAULT_COMPANY, // ✅ auto-filled but editable
  emirate: "", // ✅ chosen from dropdown
  tradeLicense: "",
  vehicleNo: "",
  issueDate: "",
  expiryDate: "",
  permitType: "",
  foodType: "",
  remarks: "",
  imageUrl: "",
});

export default function Approvals() {
  const [rows, setRows] = useState([baseRow()]);
  const [msg, setMsg] = useState("");
  const [saving, setSaving] = useState(false);

  const addRow = () => setRows((p) => [...p, baseRow()]);

  const delRow = async (idx) => {
    const url = rows?.[idx]?.imageUrl;
    if (url) {
      try {
        await deleteImage(url);
      } catch {}
    }
    setRows((p) => p.filter((_, i) => i !== idx));
  };

  const setVal = (i, k, v) =>
    setRows((p) => p.map((r, idx) => (idx === i ? { ...r, [k]: v } : r)));

  const pickAndUploadImage = async (i, file) => {
    if (!file) return;

    try {
      setMsg("⏳ Uploading image…");

      const old = rows?.[i]?.imageUrl;
      if (old) {
        try {
          await deleteImage(old);
        } catch {}
      }

      const url = await uploadViaServer(file);
      setVal(i, "imageUrl", url);
      setMsg("✅ Image uploaded.");
    } catch (e) {
      console.error(e);
      setMsg("❌ Image upload failed.");
    } finally {
      setTimeout(() => setMsg(""), 2000);
    }
  };

  const removeImageOnly = async (i) => {
    const url = rows?.[i]?.imageUrl;
    if (!url) return;

    try {
      setMsg("⏳ Removing image…");
      try {
        await deleteImage(url);
      } catch {}
      setVal(i, "imageUrl", "");
      setMsg("✅ Image removed.");
    } catch (e) {
      console.error(e);
      setMsg("❌ Failed to remove image.");
    } finally {
      setTimeout(() => setMsg(""), 2000);
    }
  };

  /* ✅ Merge old + new then save all */
  const handleSave = async () => {
    const newClean = rows
      .map(normalizeRow)
      .filter((r) => r.vehicleNo || r.tradeLicense || r.company);

    if (!newClean.length) return setMsg("❌ Add at least one row.");

    try {
      setSaving(true);
      setMsg("⏳ Saving to server…");

      const existing = (await loadAllApprovalsForMerge()).map(normalizeRow);

      const merged = dedupeRows([...existing, ...newClean]).filter(
        (r) => r.vehicleNo || r.tradeLicense || r.company
      );

      await saveApprovalsToServer(merged);

      setMsg(`✅ Saved. Total approvals: ${merged.length}`);
    } catch (e) {
      console.error(e);
      setMsg("❌ Failed to save to server.");
    } finally {
      setSaving(false);
      setTimeout(() => setMsg(""), 2500);
    }
  };

  const cols = useMemo(
    () => [
      { k: "company", t: "Company" },
      { k: "emirate", t: "Emirate" },
      { k: "tradeLicense", t: "Trade License" },
      { k: "vehicleNo", t: "Vehicle No" },
      { k: "issueDate", t: "Issue Date" },
      { k: "expiryDate", t: "Expiry Date" },
      { k: "permitType", t: "Permit Type" },
      { k: "foodType", t: "Food Type" },
      { k: "daysLeft", t: "Days Left" },
      { k: "image", t: "Image" },
      { k: "remarks", t: "Remarks" },
      { k: "actions", t: "Action" },
    ],
    []
  );

  const s = styles;

  return (
    <div style={{ direction: "ltr", padding: 12 }}>
      <div style={s.head}>
        <div style={s.title}>✅ Vehicle Approvals Input</div>

        <div style={{ flex: 1 }} />

        <Link to="/car/approvals-view" style={s.btnLink}>
          📄 View Page
        </Link>

        <button onClick={addRow} style={s.btn} type="button">
          ➕ Add row
        </button>

        <button onClick={handleSave} style={s.btnSave} type="button" disabled={saving}>
          💾 {saving ? "Saving…" : "Save to server"}
        </button>
      </div>

      <div style={{ ...s.card, overflowX: "auto" }}>
        <table style={s.table}>
          <thead>
            <tr>
              <th style={s.th}>#</th>
              {cols.map((c) => (
                <th key={c.k} style={s.th}>
                  {c.t}
                </th>
              ))}
            </tr>
          </thead>

          <tbody>
            {rows.map((r, i) => {
              const left = daysRemaining(r.expiryDate);
              return (
                <tr key={i}>
                  <td style={s.td}>{i + 1}</td>

                  {/* ✅ Company auto-filled but editable */}
                  <td style={s.td}>
                    <input
                      value={r.company}
                      onChange={(e) => setVal(i, "company", e.target.value)}
                      style={s.in}
                      placeholder={DEFAULT_COMPANY}
                    />
                  </td>

                  {/* ✅ Emirate dropdown */}
                  <td style={s.td}>
                    <select
                      value={r.emirate}
                      onChange={(e) => setVal(i, "emirate", e.target.value)}
                      style={s.sel}
                    >
                      {EMIRATES.map((x) => (
                        <option key={x || "__empty"} value={x}>
                          {x || "Select emirate"}
                        </option>
                      ))}
                    </select>
                  </td>

                  <td style={s.td}>
                    <input value={r.tradeLicense} onChange={(e) => setVal(i, "tradeLicense", e.target.value)} style={s.in} />
                  </td>

                  <td style={s.td}>
                    <input value={r.vehicleNo} onChange={(e) => setVal(i, "vehicleNo", e.target.value)} style={s.in} />
                  </td>

                  <td style={s.td}>
                    <input type="date" value={r.issueDate} onChange={(e) => setVal(i, "issueDate", e.target.value)} style={s.in} />
                  </td>

                  <td style={s.td}>
                    <input type="date" value={r.expiryDate} onChange={(e) => setVal(i, "expiryDate", e.target.value)} style={s.in} />
                  </td>

                  <td style={s.td}>
                    <input value={r.permitType} onChange={(e) => setVal(i, "permitType", e.target.value)} style={s.in} />
                  </td>

                  <td style={s.td}>
                    <input value={r.foodType} onChange={(e) => setVal(i, "foodType", e.target.value)} style={s.in} />
                  </td>

                  <td style={s.td}>
                    <span style={s.badge(left)}>{left == null ? "-" : left}</span>
                  </td>

                  <td style={s.td}>
                    <div style={{ display: "grid", gap: 6 }}>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => {
                          const f = e.target.files?.[0];
                          e.target.value = "";
                          if (f) pickAndUploadImage(i, f);
                        }}
                      />
                      {r.imageUrl ? (
                        <div style={{ display: "flex", gap: 8, alignItems: "center", justifyContent: "center" }}>
                          <span style={{ fontSize: 12, color: "#111827" }}>Uploaded</span>
                          <button type="button" onClick={() => removeImageOnly(i)} style={s.btnDanger}>
                            Remove image
                          </button>
                        </div>
                      ) : (
                        <div style={{ fontSize: 12, color: "#64748b" }}>No image</div>
                      )}
                    </div>
                  </td>

                  <td style={s.td}>
                    <input value={r.remarks} onChange={(e) => setVal(i, "remarks", e.target.value)} style={s.in} />
                  </td>

                  <td style={s.td}>
                    <button type="button" onClick={() => delRow(i)} style={s.btnDanger}>
                      🗑️ Delete
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {msg && <div style={s.msg}>{msg}</div>}

      <div style={{ marginTop: 8, fontSize: 12, color: "#64748b" }}>
        Input-only page: saved data is not loaded here (but it is merged on Save).
      </div>
    </div>
  );
}

/* ========== styles ========== */
const styles = {
  head: { display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 10 },
  title: { fontWeight: 900, color: "#1d4ed8", letterSpacing: ".2px" },
  card: { background: "#fff", borderRadius: 14, padding: 12, boxShadow: "0 2px 12px rgba(0,0,0,.06)" },
  table: { width: "100%", borderCollapse: "collapse", border: "1px solid #c7d2fe", minWidth: 1200, tableLayout: "fixed" },
  th: { padding: "10px 8px", textAlign: "center", fontWeight: 900, border: "1px solid #c7d2fe", background: "#efe7ff", color: "#0f172a", whiteSpace: "nowrap" },
  td: { padding: "8px 6px", textAlign: "center", border: "1px solid #c7d2fe", background: "#f7f7ff", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", verticalAlign: "middle" },
  in: { width: "100%", boxSizing: "border-box", padding: "8px 10px", borderRadius: 10, border: "1px solid #c7d2fe", background: "#eef2ff", overflow: "hidden", textOverflow: "ellipsis" },
  sel: { width: "100%", boxSizing: "border-box", padding: "8px 10px", borderRadius: 10, border: "1px solid #c7d2fe", background: "#eef2ff" },
  btn: { border: "1px solid rgba(148,163,184,.5)", background: "linear-gradient(180deg,#fff,#f7f9ff)", borderRadius: 12, padding: "10px 12px", fontWeight: 900, cursor: "pointer" },
  btnLink: {
    textDecoration: "none",
    border: "1px solid rgba(148,163,184,.5)",
    background: "linear-gradient(180deg,#fff,#f7f9ff)",
    borderRadius: 12,
    padding: "10px 12px",
    fontWeight: 900,
    cursor: "pointer",
    color: "#111827",
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
  },
  btnSave: { border: "none", background: "#16a34a", color: "#fff", borderRadius: 12, padding: "10px 14px", fontWeight: 900, cursor: "pointer", boxShadow: "0 6px 16px rgba(22,163,74,.25)" },
  btnDanger: { border: "none", background: "#dc2626", color: "#fff", borderRadius: 10, padding: "6px 10px", cursor: "pointer", fontWeight: 900 },
  msg: { marginTop: 10, fontWeight: 900 },
  badge: (n) => {
    if (n == null) return { padding: "6px 10px", borderRadius: 999, background: "#f1f5f9", fontWeight: 900, display: "inline-block" };
    if (n < 0) return { padding: "6px 10px", borderRadius: 999, background: "#fee2e2", color: "#991b1b", fontWeight: 900, display: "inline-block" };
    if (n <= 30) return { padding: "6px 10px", borderRadius: 999, background: "#ffedd5", color: "#9a3412", fontWeight: 900, display: "inline-block" };
    return { padding: "6px 10px", borderRadius: 999, background: "#dcfce7", color: "#166534", fontWeight: 900, display: "inline-block" };
  },
};
