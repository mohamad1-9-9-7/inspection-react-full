import React, { useEffect, useMemo, useState } from "react";

/* ========== API ========== */
const API_BASE = String(
  (typeof window !== "undefined" && window.__QCS_API__) ||
    (typeof import.meta !== "undefined" && import.meta.env?.VITE_API_URL) ||
    (typeof process !== "undefined" && process.env?.REACT_APP_API_URL) ||
    "https://inspection-server-4nvj.onrender.com"
).replace(/\/$/, "");

const TYPE = "car_approvals";
const FIXED_DATE = "2000-01-01";

/* ✅ English only label helper */
const Txt = ({ children }) => <span>{children}</span>;

/* ===== Save (same style as input) ===== */
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
        headers: { "Content-Type": "application/json", Accept: "application/json" },
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

/* ===== Load (FIXED): always return ALL saved rows, not only the latest ===== */
async function loadApprovalsFromServer() {
  const attempts = [
    `${API_BASE}/api/reports?type=${encodeURIComponent(TYPE)}`,
    `${API_BASE}/api/reports`,
  ];

  for (const url of attempts) {
    try {
      const res = await fetch(url, { headers: { Accept: "application/json" } });
      if (!res.ok) continue;

      const data = await res.json().catch(() => ({}));
      const rows = data?.rows || data?.data || (Array.isArray(data) ? data : []);
      if (!Array.isArray(rows) || rows.length === 0) continue;

      // ✅ 1) filter our TYPE
      const onlyType = rows.filter((x) => x?.type === TYPE);

      // ✅ 2) prefer fixed-date records if they exist
      const onlyFixedDate = onlyType.filter((x) => {
        const rd = x?.payload?.reportDate || x?.payload?.payload?.reportDate || "";
        return rd === FIXED_DATE;
      });

      const source = onlyFixedDate.length ? onlyFixedDate : onlyType;

      // ✅ 3) combine items from ALL matching reports
      let all = [];
      for (const rec of source) {
        const payload = rec?.payload || rec?.payload?.payload || null;
        const items = payload?.items || payload?.payload?.items || [];
        if (Array.isArray(items) && items.length) all.push(...items);
      }

      // ✅ 4) normalize + remove duplicates (vehicleNo+tradeLicense+dates)
      const normalized = all.map(normalizeRow);

      const seen = new Set();
      const unique = [];
      for (const r of normalized) {
        const key = `${r.vehicleNo}__${r.tradeLicense}__${r.expiryDate}__${r.issueDate}`;
        if (seen.has(key)) continue;
        seen.add(key);
        unique.push(r);
      }

      return unique;
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

function rowMatchesQuery(r, q) {
  if (!q) return true;
  const needle = q.toLowerCase();
  const hay = [
    r.company,
    r.emirate,
    r.tradeLicense,
    r.vehicleNo,
    r.issueDate,
    r.expiryDate,
    r.permitType,
    r.foodType,
    r.remarks,
  ]
    .filter(Boolean)
    .join(" | ")
    .toLowerCase();
  return hay.includes(needle);
}

export default function ApprovalsView() {
  const [rows, setRows] = useState([]);
  const [draftRows, setDraftRows] = useState([]);
  const [editingIndex, setEditingIndex] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");

  // ✅ Search
  const [q, setQ] = useState("");

  // ✅ Modal state
  const [imgModal, setImgModal] = useState({ open: false, url: "", title: "" });

  const openImage = (url, title = "") => {
    if (!url) return;
    setImgModal({ open: true, url, title });
  };

  const closeImage = () => setImgModal({ open: false, url: "", title: "" });

  const refresh = async () => {
    try {
      setLoading(true);
      const items = await loadApprovalsFromServer();
      const clean = (Array.isArray(items) ? items : []).map(normalizeRow);
      setRows(clean);
      setDraftRows(clean);
      setEditingIndex(null);
    } catch (e) {
      console.error(e);
      setRows([]);
      setDraftRows([]);
      setEditingIndex(null);
      setMsg("❌ Failed to load from server.");
      setTimeout(() => setMsg(""), 2500);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refresh();
  }, []);

  // ✅ Close modal with ESC
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") closeImage();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const cols = useMemo(
    () => [
      { k: "company", t: <Txt>Company</Txt>, ico: "🏢" },
      { k: "emirate", t: <Txt>Emirate</Txt>, ico: "📍" },
      { k: "tradeLicense", t: <Txt>Trade License</Txt>, ico: "🧾" },
      { k: "vehicleNo", t: <Txt>Vehicle No</Txt>, ico: "🚚" },
      { k: "issueDate", t: <Txt>Issue Date</Txt>, ico: "📅" },
      { k: "expiryDate", t: <Txt>Expiry Date</Txt>, ico: "⏳" },
      { k: "permitType", t: <Txt>Permit Type</Txt>, ico: "✅" },
      { k: "foodType", t: <Txt>Food Type</Txt>, ico: "🥩" },
      { k: "daysLeft", t: <Txt>Days Left</Txt>, ico: "⏱️" },
      { k: "image", t: <Txt>Image</Txt>, ico: "🖼️" },
      { k: "remarks", t: <Txt>Remarks</Txt>, ico: "📝" },
      { k: "actions", t: <Txt>Action</Txt>, ico: "⚙️" },
    ],
    []
  );

  const setDraftVal = (i, key, value) => {
    setDraftRows((prev) => prev.map((r, idx) => (idx === i ? { ...r, [key]: value } : r)));
  };

  const startEdit = (i) => {
    setDraftRows(rows.map((r) => ({ ...r })));
    setEditingIndex(i);
  };

  const cancelEdit = () => {
    setDraftRows(rows.map((r) => ({ ...r })));
    setEditingIndex(null);
  };

  const saveEditRow = async () => {
    try {
      setSaving(true);
      setMsg("⏳ Saving changes…");

      const next = draftRows.map(normalizeRow);
      const filtered = next.filter((r) => r.vehicleNo || r.tradeLicense || r.company);

      await saveApprovalsToServer(filtered);

      setRows(filtered);
      setDraftRows(filtered);
      setEditingIndex(null);

      setMsg("✅ Updated.");
    } catch (e) {
      console.error(e);
      setMsg("❌ Failed to update.");
    } finally {
      setSaving(false);
      setTimeout(() => setMsg(""), 2500);
    }
  };

  const deleteRow = async (i) => {
    const ok = window.confirm("Delete this row?");
    if (!ok) return;

    try {
      setSaving(true);
      setMsg("⏳ Deleting…");

      const next = rows.filter((_, idx) => idx !== i);
      await saveApprovalsToServer(next);

      setRows(next);
      setDraftRows(next);
      setEditingIndex(null);

      setMsg("✅ Deleted.");
    } catch (e) {
      console.error(e);
      setMsg("❌ Failed to delete.");
    } finally {
      setSaving(false);
      setTimeout(() => setMsg(""), 2500);
    }
  };

  // ✅ Filtered rows (search)
  const filteredRows = useMemo(() => {
    const clean = rows.map(normalizeRow);
    const qq = String(q || "").trim();
    if (!qq) return clean;
    return clean.filter((r) => rowMatchesQuery(r, qq));
  }, [rows, q]);

  const s = styles;

  return (
    <div style={s.page}>
      {/* ✅ Modal */}
      {imgModal.open && (
        <div style={s.modalBackdrop} onClick={closeImage} role="presentation">
          <div style={s.modalCard} onClick={(e) => e.stopPropagation()} role="presentation">
            <div style={s.modalHead}>
              <div style={{ fontWeight: 950 }}>
                🖼️ Preview {imgModal.title ? `— ${imgModal.title}` : ""}
              </div>
              <button type="button" onClick={closeImage} style={s.btnDangerMini}>
                ✖ Close
              </button>
            </div>

            <div style={s.modalBody}>
              <img
                src={imgModal.url}
                alt="Approval"
                style={s.modalImg}
                onError={() => setMsg("❌ Failed to load image.")}
              />
            </div>
          </div>
        </div>
      )}

      {/* ✅ Professional Header */}
      <div style={s.topBar}>
        <div style={s.brand}>
          {/* ✅ Text logo (NOT image) */}
          <div style={s.textLogo} title="Al Mawashi">
            <span style={s.textLogoIcon}>🐄</span>
            <div style={{ display: "flex", flexDirection: "column", lineHeight: 1.05 }}>
              <span style={s.textLogoTop}>AL MAWASHI</span>
              <span style={s.textLogoBottom}>Quality System</span>
            </div>
          </div>

          <div style={s.brandDivider} />

          <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
            <div style={s.title}>Vehicle Approvals</div>
            <div style={s.subTitle}>
              {loading ? "Loading…" : `${filteredRows.length} record(s)`}{" "}
              {q?.trim() ? <span style={{ color: "#64748b" }}>• filtered</span> : null}
            </div>
          </div>
        </div>

        <div style={{ flex: 1 }} />

        {/* ✅ Search */}
        <div style={s.searchWrap}>
          <span style={s.searchIcon}>⌕</span>
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search vehicle / license / company / emirate / dates…"
            style={s.searchIn}
            disabled={saving}
          />
          {q ? (
            <button type="button" onClick={() => setQ("")} style={s.pill} disabled={saving}>
              Clear
            </button>
          ) : (
            <span style={s.searchHint}>CTRL + F</span>
          )}
        </div>

        {/* ✅ Actions */}
        <button type="button" onClick={() => window.history.back()} style={s.btn} disabled={saving}>
          ⬅ Back
        </button>

        <button type="button" onClick={refresh} style={s.btn} disabled={saving}>
          ↻ Refresh
        </button>
      </div>

      {loading ? (
        <div style={s.loading}>⏳ Loading…</div>
      ) : (
        <div style={s.card}>
          <div style={s.tableWrap}>
            <table style={s.table}>
              <thead>
                <tr>
                  <th style={s.thSticky}>#</th>
                  {cols.map((c) => (
                    <th key={c.k} style={s.th}>
                      <span style={s.thInner}>
                        <span style={s.thIco}>{c.ico}</span>
                        <span>{c.t}</span>
                      </span>
                    </th>
                  ))}
                </tr>
              </thead>

              <tbody>
                {filteredRows.length ? (
                  filteredRows.map((r, i) => {
                    // editing works on original rows index. We need the real index.
                    const realIndex = rows.findIndex((x) => {
                      const a = normalizeRow(x);
                      const b = normalizeRow(r);
                      const keyA = `${a.vehicleNo}__${a.tradeLicense}__${a.expiryDate}__${a.issueDate}`;
                      const keyB = `${b.vehicleNo}__${b.tradeLicense}__${b.expiryDate}__${b.issueDate}`;
                      return keyA === keyB;
                    });

                    const idx = realIndex >= 0 ? realIndex : i;
                    const isEditing = editingIndex === idx;
                    const rr = isEditing ? draftRows[idx] : r;
                    const left = daysRemaining(rr?.expiryDate);

                    return (
                      <tr key={`${rr.vehicleNo}-${rr.tradeLicense}-${rr.expiryDate}-${rr.issueDate}-${i}`}>
                        <td style={s.tdSticky}>{i + 1}</td>

                        <td style={s.td}>
                          {isEditing ? (
                            <input value={rr?.company || ""} onChange={(e) => setDraftVal(idx, "company", e.target.value)} style={s.in} />
                          ) : (
                            <span style={s.cellText}>{rr?.company || "-"}</span>
                          )}
                        </td>

                        <td style={s.td}>
                          {isEditing ? (
                            <input value={rr?.emirate || ""} onChange={(e) => setDraftVal(idx, "emirate", e.target.value)} style={s.in} />
                          ) : (
                            <span style={s.cellText}>{rr?.emirate || "-"}</span>
                          )}
                        </td>

                        <td style={s.td}>
                          {isEditing ? (
                            <input value={rr?.tradeLicense || ""} onChange={(e) => setDraftVal(idx, "tradeLicense", e.target.value)} style={s.in} />
                          ) : (
                            <span style={s.mono}>{rr?.tradeLicense || "-"}</span>
                          )}
                        </td>

                        <td style={s.td}>
                          {isEditing ? (
                            <input value={rr?.vehicleNo || ""} onChange={(e) => setDraftVal(idx, "vehicleNo", e.target.value)} style={s.in} />
                          ) : (
                            <span style={s.mono}>{rr?.vehicleNo || "-"}</span>
                          )}
                        </td>

                        <td style={s.td}>
                          {isEditing ? (
                            <input type="date" value={rr?.issueDate || ""} onChange={(e) => setDraftVal(idx, "issueDate", e.target.value)} style={s.in} />
                          ) : (
                            <span style={s.cellText}>{rr?.issueDate || "-"}</span>
                          )}
                        </td>

                        <td style={s.td}>
                          {isEditing ? (
                            <input type="date" value={rr?.expiryDate || ""} onChange={(e) => setDraftVal(idx, "expiryDate", e.target.value)} style={s.in} />
                          ) : (
                            <span style={s.cellText}>{rr?.expiryDate || "-"}</span>
                          )}
                        </td>

                        <td style={s.td}>
                          {isEditing ? (
                            <input value={rr?.permitType || ""} onChange={(e) => setDraftVal(idx, "permitType", e.target.value)} style={s.in} />
                          ) : (
                            <span style={s.cellText}>{rr?.permitType || "-"}</span>
                          )}
                        </td>

                        <td style={s.td}>
                          {isEditing ? (
                            <input value={rr?.foodType || ""} onChange={(e) => setDraftVal(idx, "foodType", e.target.value)} style={s.in} />
                          ) : (
                            <span style={s.cellText}>{rr?.foodType || "-"}</span>
                          )}
                        </td>

                        <td style={s.td}>
                          <span style={s.badge(left)}>{left == null ? "-" : left}</span>
                        </td>

                        <td style={s.td}>
                          {rr?.imageUrl ? (
                            <button
                              type="button"
                              onClick={() => openImage(rr.imageUrl, rr.vehicleNo || rr.tradeLicense || "")}
                              style={s.iconBtn}
                              disabled={saving}
                              title="View image"
                            >
                              <span style={s.iconBtnIco}>🖼️</span>
                              <span style={s.iconBtnTxt}>View</span>
                            </button>
                          ) : (
                            <span style={s.muted}>No image</span>
                          )}
                        </td>

                        <td style={s.td}>
                          {isEditing ? (
                            <input value={rr?.remarks || ""} onChange={(e) => setDraftVal(idx, "remarks", e.target.value)} style={s.in} />
                          ) : (
                            <span style={s.cellText}>{rr?.remarks || "-"}</span>
                          )}
                        </td>

                        <td style={s.td}>
                          {isEditing ? (
                            <div style={s.actions}>
                              <button type="button" onClick={saveEditRow} style={s.btnPrimary} disabled={saving}>
                                💾 Save
                              </button>
                              <button type="button" onClick={cancelEdit} style={s.btnGhost} disabled={saving}>
                                ✖ Cancel
                              </button>
                            </div>
                          ) : (
                            <div style={s.actions}>
                              <button type="button" onClick={() => startEdit(idx)} style={s.btnGhost} disabled={saving} title="Edit">
                                ✏ Edit
                              </button>
                              <button type="button" onClick={() => deleteRow(idx)} style={s.btnDanger} disabled={saving} title="Delete">
                                🗑 Delete
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={cols.length + 1} style={s.empty}>
                      No matching data.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {msg && <div style={s.msg}>{msg}</div>}
    </div>
  );
}

/* ========== styles (premium look) ========== */
const styles = {
  page: {
    direction: "ltr",
    padding: 16,
    minHeight: "100vh",
    background:
      "radial-gradient(1200px 700px at 12% 0%, rgba(59,130,246,.18), transparent 60%), radial-gradient(900px 520px at 88% 10%, rgba(168,85,247,.18), transparent 55%), radial-gradient(900px 600px at 50% 110%, rgba(16,185,129,.12), transparent 55%), linear-gradient(180deg,#0b1220 0%, #0b1220 140px, #f6f7fb 140px)",
  },

  topBar: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    flexWrap: "wrap",
    marginBottom: 12,
    padding: 12,
    borderRadius: 18,
    background: "rgba(255,255,255,.92)",
    border: "1px solid rgba(226,232,240,.95)",
    boxShadow: "0 18px 50px rgba(2,6,23,.14)",
    backdropFilter: "blur(10px)",
  },

  brand: { display: "flex", alignItems: "center", gap: 10, minWidth: 320 },
  brandDivider: { width: 1, height: 34, background: "rgba(148,163,184,.45)" },

  textLogo: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    padding: "8px 10px",
    borderRadius: 14,
    background: "linear-gradient(180deg,#ffffff,#f8fafc)",
    border: "1px solid rgba(226,232,240,.95)",
    boxShadow: "0 10px 24px rgba(15,23,42,.08)",
  },
  textLogoIcon: {
    width: 34,
    height: 34,
    borderRadius: 12,
    display: "grid",
    placeItems: "center",
    background: "linear-gradient(180deg, rgba(59,130,246,.14), rgba(168,85,247,.12))",
    border: "1px solid rgba(226,232,240,.95)",
    fontSize: 16,
  },
  textLogoTop: { fontWeight: 1000, letterSpacing: ".8px", color: "#0f172a", fontSize: 12 },
  textLogoBottom: { fontWeight: 800, letterSpacing: ".2px", color: "#64748b", fontSize: 11 },

  title: { fontWeight: 1000, color: "#0f172a", letterSpacing: ".2px", fontSize: 16 },
  subTitle: { fontWeight: 800, color: "#94a3b8", fontSize: 12 },

  searchWrap: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    background: "rgba(255,255,255,.92)",
    border: "1px solid rgba(226,232,240,.95)",
    borderRadius: 16,
    padding: "10px 12px",
    minWidth: 360,
    boxShadow: "0 14px 30px rgba(2,6,23,.10)",
  },
  searchIcon: { fontSize: 16, opacity: 0.65, fontWeight: 900 },
  searchIn: {
    border: "none",
    outline: "none",
    width: "100%",
    fontWeight: 900,
    color: "#0f172a",
    background: "transparent",
  },
  searchHint: {
    padding: "6px 10px",
    borderRadius: 999,
    background: "rgba(148,163,184,.18)",
    color: "#64748b",
    fontWeight: 800,
    fontSize: 12,
    border: "1px solid rgba(148,163,184,.25)",
  },
  pill: {
    border: "1px solid rgba(148,163,184,.4)",
    background: "linear-gradient(180deg,#fff,#f8fafc)",
    borderRadius: 999,
    padding: "7px 10px",
    fontWeight: 950,
    cursor: "pointer",
  },

  btn: {
    border: "1px solid rgba(148,163,184,.55)",
    background: "linear-gradient(180deg,#fff,#f7f9ff)",
    borderRadius: 16,
    padding: "10px 12px",
    fontWeight: 950,
    cursor: "pointer",
    boxShadow: "0 12px 24px rgba(2,6,23,.08)",
  },

  loading: { padding: 10, color: "#e2e8f0", fontWeight: 900 },

  card: {
    background: "rgba(255,255,255,.92)",
    borderRadius: 18,
    padding: 12,
    border: "1px solid rgba(226,232,240,.95)",
    boxShadow: "0 20px 60px rgba(2,6,23,.14)",
    backdropFilter: "blur(10px)",
  },

  tableWrap: {
    overflow: "auto",
    borderRadius: 16,
    border: "1px solid rgba(226,232,240,.95)",
    boxShadow: "inset 0 1px 0 rgba(255,255,255,.6)",
  },

  table: {
    width: "100%",
    borderCollapse: "separate",
    borderSpacing: 0,
    minWidth: 1300,
    tableLayout: "fixed",
    background: "linear-gradient(180deg,#ffffff, #fbfbff)",
  },

  thSticky: {
    position: "sticky",
    left: 0,
    zIndex: 3,
    padding: "12px 10px",
    textAlign: "center",
    fontWeight: 1000,
    borderBottom: "1px solid rgba(226,232,240,.95)",
    background: "linear-gradient(180deg,#0b1220,#0b1220)",
    color: "#fff",
    width: 56,
    whiteSpace: "nowrap",
  },

  th: {
    position: "sticky",
    top: 0,
    zIndex: 2,
    padding: "12px 10px",
    textAlign: "center",
    fontWeight: 1000,
    borderBottom: "1px solid rgba(226,232,240,.95)",
    background:
      "linear-gradient(180deg, rgba(15,23,42,.96), rgba(15,23,42,.92)), radial-gradient(700px 220px at 20% 0%, rgba(59,130,246,.22), transparent 60%)",
    color: "#fff",
    whiteSpace: "nowrap",
  },

  thInner: { display: "inline-flex", alignItems: "center", gap: 8, justifyContent: "center" },
  thIco: { opacity: 0.95 },

  tdSticky: {
    position: "sticky",
    left: 0,
    zIndex: 1,
    padding: "10px 8px",
    textAlign: "center",
    borderBottom: "1px solid rgba(226,232,240,.85)",
    background: "linear-gradient(180deg,#ffffff,#f8fafc)",
    fontWeight: 1000,
    color: "#0f172a",
  },

  td: {
    padding: "10px 8px",
    textAlign: "center",
    borderBottom: "1px solid rgba(226,232,240,.85)",
    background: "rgba(255,255,255,.75)",
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
    verticalAlign: "middle",
  },

  cellText: { fontWeight: 850, color: "#0f172a" },
  mono: {
    fontFamily:
      'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
    fontWeight: 950,
    color: "#0f172a",
  },
  muted: { color: "#64748b", fontWeight: 800, fontSize: 12 },

  in: {
    width: "100%",
    boxSizing: "border-box",
    padding: "10px 12px",
    borderRadius: 14,
    border: "1px solid rgba(226,232,240,.95)",
    background: "linear-gradient(180deg,#ffffff,#f8fafc)",
    outline: "none",
    fontWeight: 900,
    boxShadow: "0 10px 18px rgba(2,6,23,.06)",
  },

  actions: { display: "flex", gap: 8, justifyContent: "center", flexWrap: "wrap" },

  btnPrimary: {
    border: "1px solid rgba(22,163,74,.22)",
    background: "linear-gradient(180deg, rgba(34,197,94,1), rgba(22,163,74,1))",
    color: "#fff",
    borderRadius: 14,
    padding: "8px 10px",
    cursor: "pointer",
    fontWeight: 1000,
    boxShadow: "0 12px 22px rgba(22,163,74,.20)",
  },
  btnGhost: {
    border: "1px solid rgba(148,163,184,.55)",
    background: "linear-gradient(180deg,#fff,#f8fafc)",
    borderRadius: 14,
    padding: "8px 10px",
    cursor: "pointer",
    fontWeight: 950,
  },
  btnDanger: {
    border: "1px solid rgba(220,38,38,.20)",
    background: "linear-gradient(180deg, rgba(239,68,68,1), rgba(220,38,38,1))",
    color: "#fff",
    borderRadius: 14,
    padding: "8px 10px",
    cursor: "pointer",
    fontWeight: 1000,
    boxShadow: "0 12px 22px rgba(220,38,38,.20)",
  },

  iconBtn: {
    border: "1px solid rgba(148,163,184,.55)",
    background: "linear-gradient(180deg,#fff,#f8fafc)",
    borderRadius: 999,
    padding: "7px 12px",
    cursor: "pointer",
    fontWeight: 950,
    display: "inline-flex",
    alignItems: "center",
    gap: 8,
    boxShadow: "0 10px 18px rgba(2,6,23,.06)",
  },
  iconBtnIco: { fontSize: 14 },
  iconBtnTxt: { fontSize: 13 },

  msg: {
    marginTop: 10,
    fontWeight: 1000,
    padding: 12,
    borderRadius: 16,
    background: "rgba(255,255,255,.92)",
    border: "1px solid rgba(226,232,240,.95)",
    boxShadow: "0 16px 30px rgba(2,6,23,.10)",
  },

  badge: (n) => {
    const base = {
      padding: "7px 12px",
      borderRadius: 999,
      fontWeight: 1000,
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      minWidth: 64,
      border: "1px solid rgba(226,232,240,.9)",
      boxShadow: "0 10px 18px rgba(2,6,23,.06)",
    };
    if (n == null) return { ...base, background: "#f1f5f9", color: "#0f172a" };
    if (n < 0) return { ...base, background: "#fee2e2", color: "#991b1b" };
    if (n <= 30) return { ...base, background: "#ffedd5", color: "#9a3412" };
    return { ...base, background: "#dcfce7", color: "#166534" };
  },

  /* ✅ Modal styles */
  modalBackdrop: {
    position: "fixed",
    inset: 0,
    background: "rgba(2,6,23,.65)",
    zIndex: 9999,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: 14,
  },
  modalCard: {
    width: "min(980px, 96vw)",
    maxHeight: "90vh",
    background: "#fff",
    borderRadius: 18,
    boxShadow: "0 24px 90px rgba(0,0,0,.45)",
    overflow: "hidden",
    display: "flex",
    flexDirection: "column",
    border: "1px solid rgba(226,232,240,.95)",
  },
  modalHead: {
    padding: 12,
    borderBottom: "1px solid rgba(226,232,240,.95)",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
    background: "linear-gradient(180deg,#ffffff,#f8fafc)",
  },
  modalBody: {
    padding: 12,
    overflow: "auto",
    background:
      "radial-gradient(800px 500px at 40% 20%, rgba(59,130,246,.18), transparent 60%), #0b1220",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  modalImg: {
    maxWidth: "100%",
    maxHeight: "78vh",
    borderRadius: 14,
    background: "#fff",
    border: "1px solid rgba(226,232,240,.35)",
  },

  btnDangerMini: {
    border: "1px solid rgba(220,38,38,.25)",
    background: "linear-gradient(180deg, rgba(239,68,68,1), rgba(220,38,38,1))",
    color: "#fff",
    borderRadius: 14,
    padding: "8px 10px",
    cursor: "pointer",
    fontWeight: 1000,
  },

  empty: { padding: 14, color: "#64748b", textAlign: "center", fontWeight: 900 },
};
