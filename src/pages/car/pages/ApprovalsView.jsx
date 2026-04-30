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
const MAX_IMAGES = 5;

const Txt = ({ children }) => <span>{children}</span>;

/* Upload a file → returns URL */
async function uploadViaServer(file) {
  const fd = new FormData();
  fd.append("file", file);
  const res = await fetch(`${API_BASE}/api/images`, { method: "POST", body: fd });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.ok || !(data.optimized_url || data.url))
    throw new Error(data?.error || "Upload failed");
  return data.optimized_url || data.url;
}

/* Delete image from server (best-effort) */
async function deleteImage(url) {
  if (!url) return;
  try {
    await fetch(`${API_BASE}/api/images?url=${encodeURIComponent(url)}`, { method: "DELETE" });
  } catch {}
}

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
    } catch (e) { lastErr = e; }
  }
  throw lastErr || new Error("Save failed");
}

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
      const onlyType = rows.filter((x) => x?.type === TYPE);
      const onlyFixedDate = onlyType.filter((x) => {
        const rd = x?.payload?.reportDate || x?.payload?.payload?.reportDate || "";
        return rd === FIXED_DATE;
      });
      const source = onlyFixedDate.length ? onlyFixedDate : onlyType;
      let all = [];
      for (const rec of source) {
        const payload = rec?.payload || rec?.payload?.payload || null;
        const items = payload?.items || payload?.payload?.items || [];
        if (Array.isArray(items) && items.length) all.push(...items);
      }
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
  return Math.round((dt.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

const normalizeRow = (r) => {
  let imageUrls = [];
  if (Array.isArray(r?.imageUrls)) {
    imageUrls = r.imageUrls.filter(Boolean).map((u) => String(u).trim());
  } else if (r?.imageUrl) {
    imageUrls = [String(r.imageUrl).trim()].filter(Boolean);
  }
  return {
    company: (r?.company || "").trim(),
    emirate: (r?.emirate || "").trim(),
    tradeLicense: (r?.tradeLicense || "").trim(),
    vehicleNo: (r?.vehicleNo || "").trim(),
    issueDate: (r?.issueDate || "").trim(),
    expiryDate: (r?.expiryDate || "").trim(),
    permitType: (r?.permitType || "").trim(),
    foodType: (r?.foodType || "").trim(),
    remarks: (r?.remarks || "").trim(),
    imageUrls,
  };
};

function rowMatchesQuery(r, q) {
  if (!q) return true;
  const needle = q.toLowerCase();
  const hay = [
    r.company, r.emirate, r.tradeLicense, r.vehicleNo,
    r.issueDate, r.expiryDate, r.permitType, r.foodType, r.remarks,
  ].filter(Boolean).join(" | ").toLowerCase();
  return hay.includes(needle);
}

/* ✅ Download via blob (avoids CORS issues with direct download attr) */
async function downloadImage(url, filename) {
  try {
    const res = await fetch(url);
    const blob = await res.blob();
    const blobUrl = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = blobUrl;
    a.download = filename || "image";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(blobUrl), 5000);
  } catch {
    // fallback: open in new tab
    window.open(url, "_blank", "noopener,noreferrer");
  }
}

export default function ApprovalsView() {
  const [rows, setRows] = useState([]);
  const [draftRows, setDraftRows] = useState([]);
  const [editingIndex, setEditingIndex] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");
  const [q, setQ] = useState("");
  const [imgModal, setImgModal] = useState({ open: false, url: "", title: "" });
  const [expiryFilter, setExpiryFilter] = useState("all"); // "all" | "expired" | "7d" | "30d" | "90d"
  const [bellOpen, setBellOpen] = useState(false);

  const openImage = (url, title = "") => { if (url) setImgModal({ open: true, url, title }); };
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

  useEffect(() => { refresh(); }, []);
  useEffect(() => {
    const onKey = (e) => { if (e.key === "Escape") { closeImage(); setBellOpen(false); } };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
  useEffect(() => {
    if (!bellOpen) return;
    const onClick = () => setBellOpen(false);
    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
  }, [bellOpen]);

  const cols = useMemo(() => [
    { k: "company",      t: <Txt>Company</Txt>,       ico: "🏢" },
    { k: "emirate",      t: <Txt>Emirate</Txt>,       ico: "📍" },
    { k: "tradeLicense", t: <Txt>Trade License</Txt>, ico: "🧾" },
    { k: "vehicleNo",    t: <Txt>Vehicle No</Txt>,    ico: "🚚" },
    { k: "issueDate",    t: <Txt>Issue Date</Txt>,    ico: "📅" },
    { k: "expiryDate",   t: <Txt>Expiry Date</Txt>,   ico: "⏳" },
    { k: "permitType",   t: <Txt>Permit Type</Txt>,   ico: "✅" },
    { k: "foodType",     t: <Txt>Food Type</Txt>,     ico: "🥩" },
    { k: "daysLeft",     t: <Txt>Days Left</Txt>,     ico: "⏱️" },
    { k: "image",        t: <Txt>Images</Txt>,        ico: "🖼️" },
    { k: "remarks",      t: <Txt>Remarks</Txt>,       ico: "📝" },
    { k: "actions",      t: <Txt>Action</Txt>,        ico: "⚙️" },
  ], []);

  const setDraftVal = (i, key, value) =>
    setDraftRows((prev) => prev.map((r, idx) => (idx === i ? { ...r, [key]: value } : r)));

  /* ✅ Add image during edit — uploads + persists immediately */
  const addImage = async (idx, file) => {
    if (!file) return;
    const currentUrls = rows[idx]?.imageUrls || [];
    if (currentUrls.length >= MAX_IMAGES) {
      setMsg(`❌ Max ${MAX_IMAGES} images per row.`);
      setTimeout(() => setMsg(""), 2500);
      return;
    }
    try {
      setSaving(true);
      setMsg("⏳ Uploading image…");
      const url = await uploadViaServer(file);
      const nextRows = rows.map((r, i) =>
        i === idx ? { ...r, imageUrls: [...(r.imageUrls || []), url] } : r
      );
      await saveApprovalsToServer(nextRows);
      setRows(nextRows);
      setDraftRows((p) =>
        p.map((r, i) => (i === idx ? { ...r, imageUrls: [...(r.imageUrls || []), url] } : r))
      );
      setMsg("✅ Image added.");
    } catch (e) {
      console.error(e);
      setMsg("❌ Upload failed.");
    } finally {
      setSaving(false);
      setTimeout(() => setMsg(""), 2000);
    }
  };

  /* ✅ Remove image during edit — deletes from server + persists */
  const removeImage = async (idx, imgIdx) => {
    const url = rows?.[idx]?.imageUrls?.[imgIdx];
    if (!url) return;
    const ok = window.confirm("Remove this image?");
    if (!ok) return;
    try {
      setSaving(true);
      setMsg("⏳ Removing image…");
      await deleteImage(url);
      const nextRows = rows.map((r, i) =>
        i === idx ? { ...r, imageUrls: (r.imageUrls || []).filter((_, ii) => ii !== imgIdx) } : r
      );
      await saveApprovalsToServer(nextRows);
      setRows(nextRows);
      setDraftRows((p) =>
        p.map((r, i) =>
          i === idx ? { ...r, imageUrls: (r.imageUrls || []).filter((_, ii) => ii !== imgIdx) } : r
        )
      );
      setMsg("✅ Image removed.");
    } catch (e) {
      console.error(e);
      setMsg("❌ Failed to remove.");
    } finally {
      setSaving(false);
      setTimeout(() => setMsg(""), 2000);
    }
  };

  /* ✅ Replace image (delete old + upload new) */
  const replaceImage = async (idx, imgIdx, file) => {
    if (!file) return;
    const oldUrl = rows?.[idx]?.imageUrls?.[imgIdx];
    if (!oldUrl) return;
    try {
      setSaving(true);
      setMsg("⏳ Replacing image…");
      const newUrl = await uploadViaServer(file);
      await deleteImage(oldUrl);
      const nextRows = rows.map((r, i) =>
        i === idx ? {
          ...r,
          imageUrls: (r.imageUrls || []).map((u, ii) => (ii === imgIdx ? newUrl : u)),
        } : r
      );
      await saveApprovalsToServer(nextRows);
      setRows(nextRows);
      setDraftRows((p) =>
        p.map((r, i) =>
          i === idx ? {
            ...r,
            imageUrls: (r.imageUrls || []).map((u, ii) => (ii === imgIdx ? newUrl : u)),
          } : r
        )
      );
      setMsg("✅ Image replaced.");
    } catch (e) {
      console.error(e);
      setMsg("❌ Replace failed.");
    } finally {
      setSaving(false);
      setTimeout(() => setMsg(""), 2000);
    }
  };

  const startEdit = (i) => { setDraftRows(rows.map((r) => ({ ...r }))); setEditingIndex(i); };
  const cancelEdit = () => { setDraftRows(rows.map((r) => ({ ...r }))); setEditingIndex(null); };

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

  /* ✅ Expiry stats — counts per category */
  const expiryStats = useMemo(() => {
    const expired = [], days7 = [], days30 = [], days90 = [];
    for (const r of rows) {
      const d = daysRemaining(r.expiryDate);
      if (d == null) continue;
      if (d < 0) expired.push({ r, d });
      else if (d <= 7) days7.push({ r, d });
      else if (d <= 30) days30.push({ r, d });
      else if (d <= 90) days90.push({ r, d });
    }
    return { expired, days7, days30, days90, urgent: expired.length + days7.length };
  }, [rows]);

  /* ✅ Update document title with urgent count */
  useEffect(() => {
    const original = "Vehicle Approvals";
    const u = expiryStats.urgent;
    document.title = u > 0 ? `(${u} ⚠) ${original}` : original;
    return () => { document.title = original; };
  }, [expiryStats.urgent]);

  const filteredRows = useMemo(() => {
    const clean = rows.map(normalizeRow);
    const passesExpiry = (r) => {
      if (expiryFilter === "all") return true;
      const d = daysRemaining(r.expiryDate);
      if (d == null) return false;
      if (expiryFilter === "expired") return d < 0;
      if (expiryFilter === "7d") return d >= 0 && d <= 7;
      if (expiryFilter === "30d") return d >= 0 && d <= 30;
      if (expiryFilter === "90d") return d >= 0 && d <= 90;
      return true;
    };
    const qq = String(q || "").trim();
    return clean.filter((r) => passesExpiry(r) && (qq ? rowMatchesQuery(r, qq) : true));
  }, [rows, q, expiryFilter]);

  const s = styles;

  return (
    <div style={s.page}>
      <style>{`
        @keyframes av-pulse {
          0%, 100% { box-shadow: 0 0 0 0 rgba(220,38,38,.55); }
          50% { box-shadow: 0 0 0 6px rgba(220,38,38,0); }
        }
      `}</style>

      {/* ✅ Modal */}
      {imgModal.open && (
        <div style={s.modalBackdrop} onClick={closeImage} role="presentation">
          <div style={s.modalCard} onClick={(e) => e.stopPropagation()} role="presentation">

            {/* ✅ Modal Header with Download + Full Size buttons */}
            <div style={s.modalHead}>
              <div style={{ fontWeight: 950, color: "#0f172a" }}>
                🖼️ Preview {imgModal.title ? `— ${imgModal.title}` : ""}
              </div>

              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>

                {/* ✅ Open full size in new tab */}
                <a
                  href={imgModal.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={s.btnModalAction}
                  title="Open full size in new tab"
                >
                  🔍 Full Size
                </a>

                {/* ✅ Download via blob */}
                <button
                  type="button"
                  style={s.btnModalAction}
                  title="Download image"
                  onClick={() => {
                    const ext = imgModal.url.split("?")[0].split(".").pop() || "jpg";
                    const name = (imgModal.title || "image").replace(/[^a-zA-Z0-9_-]/g, "_");
                    downloadImage(imgModal.url, `${name}.${ext}`);
                  }}
                >
                  ⬇️ Download
                </button>

                <button type="button" onClick={closeImage} style={s.btnDangerMini}>
                  ✖ Close
                </button>
              </div>
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

      {/* Header */}
      <div style={s.topBar}>
        <div style={s.brand}>
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
            <button type="button" onClick={() => setQ("")} style={s.pill} disabled={saving}>Clear</button>
          ) : (
            <span style={s.searchHint}>CTRL + F</span>
          )}
        </div>
        <button type="button" onClick={() => window.history.back()} style={s.btn} disabled={saving}>⬅ Back</button>
        <button type="button" onClick={refresh} style={s.btn} disabled={saving}>↻ Refresh</button>

        {/* ✅ Bell with badge */}
        <div style={{ position: "relative" }} onClick={(e) => e.stopPropagation()}>
          <button
            type="button"
            onClick={() => setBellOpen((b) => !b)}
            style={{
              ...s.btn,
              padding: "10px 12px",
              ...(expiryStats.urgent > 0 ? { background: "linear-gradient(180deg,#fee2e2,#fecaca)", borderColor: "#dc2626" } : {}),
            }}
            title={expiryStats.urgent > 0 ? `${expiryStats.urgent} urgent` : "No urgent expiries"}
          >
            🔔 {expiryStats.urgent > 0 && (
              <span style={{
                background: "#dc2626", color: "#fff", borderRadius: 999,
                padding: "1px 7px", fontSize: 11, fontWeight: 1000, marginLeft: 4,
                animation: "av-pulse 1.5s infinite",
              }}>{expiryStats.urgent}</span>
            )}
          </button>
          {bellOpen && (
            <div style={s.bellPanel} onClick={(e) => e.stopPropagation()}>
              <div style={{ fontWeight: 1000, fontSize: 13, color: "#0f172a", marginBottom: 10 }}>
                Upcoming expiries
              </div>
              {[
                { key: "expired", label: "Expired", arr: expiryStats.expired, color: "#dc2626", bg: "#fee2e2" },
                { key: "days7", label: "Within 7 days", arr: expiryStats.days7, color: "#9a3412", bg: "#ffedd5" },
                { key: "days30", label: "Within 30 days", arr: expiryStats.days30, color: "#92400e", bg: "#fef3c7" },
                { key: "days90", label: "Within 90 days", arr: expiryStats.days90, color: "#1e40af", bg: "#dbeafe" },
              ].map((g) => (
                <div key={g.key} style={{ marginBottom: 10 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                    <span style={{ fontWeight: 900, color: g.color, fontSize: 12 }}>{g.label}</span>
                    <span style={{ background: g.bg, color: g.color, padding: "2px 8px", borderRadius: 999, fontSize: 11, fontWeight: 900 }}>
                      {g.arr.length}
                    </span>
                  </div>
                  {g.arr.length > 0 ? (
                    <div style={{ display: "flex", flexDirection: "column", gap: 4, maxHeight: 130, overflow: "auto" }}>
                      {g.arr.slice(0, 8).map((it, i) => (
                        <div key={i} style={{
                          display: "flex", justifyContent: "space-between", alignItems: "center",
                          padding: "6px 8px", background: "#f8fafc", borderRadius: 6, fontSize: 11,
                        }}>
                          <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 180 }}>
                            <strong>{it.r.vehicleNo || "—"}</strong>
                            {it.r.tradeLicense ? ` · ${it.r.tradeLicense}` : ""}
                          </span>
                          <span style={{ color: g.color, fontWeight: 900 }}>
                            {it.d < 0 ? `${Math.abs(it.d)}d ago` : `${it.d}d`}
                          </span>
                        </div>
                      ))}
                      {g.arr.length > 8 && (
                        <div style={{ fontSize: 10, color: "#64748b", textAlign: "center", padding: 4 }}>
                          + {g.arr.length - 8} more
                        </div>
                      )}
                    </div>
                  ) : (
                    <div style={{ fontSize: 11, color: "#94a3b8", padding: "4px 8px" }}>None</div>
                  )}
                </div>
              ))}
              <button
                type="button"
                onClick={() => { setBellOpen(false); }}
                style={{ ...s.pill, width: "100%", marginTop: 4 }}
              >Close</button>
            </div>
          )}
        </div>
      </div>

      {/* ✅ Expiry alert banner */}
      {(expiryStats.expired.length + expiryStats.days7.length + expiryStats.days30.length) > 0 && (
        <div style={s.banner}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, flex: 1, flexWrap: "wrap" }}>
            <span style={{ fontWeight: 1000, color: "#0f172a", fontSize: 13 }}>⚠ Expiry alerts:</span>

            {expiryStats.expired.length > 0 && (
              <button
                type="button"
                onClick={() => setExpiryFilter(expiryFilter === "expired" ? "all" : "expired")}
                style={s.bChip("#dc2626", "#fee2e2", expiryFilter === "expired")}
              >
                🚨 {expiryStats.expired.length} EXPIRED
              </button>
            )}
            {expiryStats.days7.length > 0 && (
              <button
                type="button"
                onClick={() => setExpiryFilter(expiryFilter === "7d" ? "all" : "7d")}
                style={s.bChip("#9a3412", "#ffedd5", expiryFilter === "7d")}
              >
                ⏰ {expiryStats.days7.length} within 7 days
              </button>
            )}
            {expiryStats.days30.length > 0 && (
              <button
                type="button"
                onClick={() => setExpiryFilter(expiryFilter === "30d" ? "all" : "30d")}
                style={s.bChip("#92400e", "#fef3c7", expiryFilter === "30d")}
              >
                📅 {expiryStats.days30.length} within 30 days
              </button>
            )}
            {expiryStats.days90.length > 0 && (
              <button
                type="button"
                onClick={() => setExpiryFilter(expiryFilter === "90d" ? "all" : "90d")}
                style={s.bChip("#1e40af", "#dbeafe", expiryFilter === "90d")}
              >
                📆 {expiryStats.days90.length} within 90 days
              </button>
            )}

            {expiryFilter !== "all" && (
              <button
                type="button"
                onClick={() => setExpiryFilter("all")}
                style={{ ...s.pill, marginLeft: 4 }}
              >
                ✕ Clear filter
              </button>
            )}
          </div>
        </div>
      )}

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
                    const realIndex = rows.findIndex((x) => {
                      const a = normalizeRow(x);
                      const b = normalizeRow(r);
                      return `${a.vehicleNo}__${a.tradeLicense}__${a.expiryDate}__${a.issueDate}` ===
                             `${b.vehicleNo}__${b.tradeLicense}__${b.expiryDate}__${b.issueDate}`;
                    });
                    const idx = realIndex >= 0 ? realIndex : i;
                    const isEditing = editingIndex === idx;
                    const rr = isEditing ? draftRows[idx] : r;
                    const left = daysRemaining(rr?.expiryDate);
                    const imgUrls = rr?.imageUrls || [];

                    return (
                      <tr key={`${rr.vehicleNo}-${rr.tradeLicense}-${rr.expiryDate}-${rr.issueDate}-${i}`}>
                        <td style={s.tdSticky}>{i + 1}</td>

                        <td style={s.td}>
                          {isEditing ? <input value={rr?.company || ""} onChange={(e) => setDraftVal(idx, "company", e.target.value)} style={s.in} /> : <span style={s.cellText}>{rr?.company || "-"}</span>}
                        </td>
                        <td style={s.td}>
                          {isEditing ? <input value={rr?.emirate || ""} onChange={(e) => setDraftVal(idx, "emirate", e.target.value)} style={s.in} /> : <span style={s.cellText}>{rr?.emirate || "-"}</span>}
                        </td>
                        <td style={s.td}>
                          {isEditing ? <input value={rr?.tradeLicense || ""} onChange={(e) => setDraftVal(idx, "tradeLicense", e.target.value)} style={s.in} /> : <span style={s.mono}>{rr?.tradeLicense || "-"}</span>}
                        </td>
                        <td style={s.td}>
                          {isEditing ? <input value={rr?.vehicleNo || ""} onChange={(e) => setDraftVal(idx, "vehicleNo", e.target.value)} style={s.in} /> : <span style={s.mono}>{rr?.vehicleNo || "-"}</span>}
                        </td>
                        <td style={s.td}>
                          {isEditing ? <input type="date" value={rr?.issueDate || ""} onChange={(e) => setDraftVal(idx, "issueDate", e.target.value)} style={s.in} /> : <span style={s.cellText}>{rr?.issueDate || "-"}</span>}
                        </td>
                        <td style={s.td}>
                          {isEditing ? <input type="date" value={rr?.expiryDate || ""} onChange={(e) => setDraftVal(idx, "expiryDate", e.target.value)} style={s.in} /> : <span style={s.cellText}>{rr?.expiryDate || "-"}</span>}
                        </td>
                        <td style={s.td}>
                          {isEditing ? <input value={rr?.permitType || ""} onChange={(e) => setDraftVal(idx, "permitType", e.target.value)} style={s.in} /> : <span style={s.cellText}>{rr?.permitType || "-"}</span>}
                        </td>
                        <td style={s.td}>
                          {isEditing ? <input value={rr?.foodType || ""} onChange={(e) => setDraftVal(idx, "foodType", e.target.value)} style={s.in} /> : <span style={s.cellText}>{rr?.foodType || "-"}</span>}
                        </td>

                        <td style={s.td}>
                          <span style={s.badge(left)}>{left == null ? "-" : left}</span>
                        </td>

                        <td style={{ ...s.td, minWidth: isEditing ? 220 : 140 }}>
                          {isEditing ? (
                            <div style={{ display: "flex", flexDirection: "column", gap: 6, alignItems: "stretch" }}>
                              {imgUrls.length > 0 ? imgUrls.map((url, ii) => (
                                <div key={ii} style={s.imgRow}>
                                  <button
                                    type="button"
                                    onClick={() => openImage(url, `Image ${ii + 1}`)}
                                    style={s.imgViewMini}
                                    title="View"
                                  >🖼️ {ii + 1}</button>
                                  <label style={s.imgReplaceBtn} title="Replace">
                                    🔄
                                    <input
                                      type="file"
                                      accept="image/*"
                                      style={{ display: "none" }}
                                      onChange={(e) => {
                                        const f = e.target.files?.[0];
                                        e.target.value = "";
                                        if (f) replaceImage(idx, ii, f);
                                      }}
                                      disabled={saving}
                                    />
                                  </label>
                                  <button
                                    type="button"
                                    onClick={() => removeImage(idx, ii)}
                                    style={s.imgDelBtn}
                                    title="Remove"
                                    disabled={saving}
                                  >✕</button>
                                </div>
                              )) : (
                                <span style={s.muted}>No images yet</span>
                              )}
                              {imgUrls.length < MAX_IMAGES ? (
                                <label style={s.imgAddBtn}>
                                  ➕ Add image
                                  <input
                                    type="file"
                                    accept="image/*"
                                    style={{ display: "none" }}
                                    onChange={(e) => {
                                      const f = e.target.files?.[0];
                                      e.target.value = "";
                                      if (f) addImage(idx, f);
                                    }}
                                    disabled={saving}
                                  />
                                </label>
                              ) : (
                                <div style={{ fontSize: 10, color: "#dc2626", fontWeight: 800, textAlign: "center" }}>
                                  Max {MAX_IMAGES} reached
                                </div>
                              )}
                              <div style={{ fontSize: 10, color: "#64748b", textAlign: "center" }}>
                                {imgUrls.length}/{MAX_IMAGES} images
                              </div>
                            </div>
                          ) : imgUrls.length > 0 ? (
                            <div style={{ display: "flex", flexDirection: "column", gap: 5, alignItems: "center" }}>
                              {imgUrls.map((url, ii) => (
                                <button
                                  key={ii}
                                  type="button"
                                  onClick={() => openImage(url, `${rr.vehicleNo || rr.tradeLicense || ""} — Image ${ii + 1}`)}
                                  style={s.iconBtn}
                                  disabled={saving}
                                  title={`View image ${ii + 1}`}
                                >
                                  <span style={s.iconBtnIco}>🖼️</span>
                                  <span style={s.iconBtnTxt}>Image {ii + 1}</span>
                                </button>
                              ))}
                            </div>
                          ) : (
                            <span style={s.muted}>No image</span>
                          )}
                        </td>

                        <td style={s.td}>
                          {isEditing ? <input value={rr?.remarks || ""} onChange={(e) => setDraftVal(idx, "remarks", e.target.value)} style={s.in} /> : <span style={s.cellText}>{rr?.remarks || "-"}</span>}
                        </td>

                        <td style={s.td}>
                          {isEditing ? (
                            <div style={s.actions}>
                              <button type="button" onClick={saveEditRow} style={s.btnPrimary} disabled={saving}>💾 Save</button>
                              <button type="button" onClick={cancelEdit} style={s.btnGhost} disabled={saving}>✖ Cancel</button>
                            </div>
                          ) : (
                            <div style={s.actions}>
                              <button type="button" onClick={() => startEdit(idx)} style={s.btnGhost} disabled={saving}>✏ Edit</button>
                              <button type="button" onClick={() => deleteRow(idx)} style={s.btnDanger} disabled={saving}>🗑 Delete</button>
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={cols.length + 1} style={s.empty}>No matching data.</td>
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

/* ========== styles ========== */
const styles = {
  page: {
    direction: "ltr", padding: 16, minHeight: "100vh",
    background: "radial-gradient(1200px 700px at 12% 0%, rgba(59,130,246,.18), transparent 60%), radial-gradient(900px 520px at 88% 10%, rgba(168,85,247,.18), transparent 55%), radial-gradient(900px 600px at 50% 110%, rgba(16,185,129,.12), transparent 55%), linear-gradient(180deg,#0b1220 0%, #0b1220 140px, #f6f7fb 140px)",
  },
  topBar: { position: "relative", zIndex: 1000, display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", marginBottom: 12, padding: 12, borderRadius: 18, background: "rgba(255,255,255,.92)", border: "1px solid rgba(226,232,240,.95)", boxShadow: "0 18px 50px rgba(2,6,23,.14)", backdropFilter: "blur(10px)" },
  brand: { display: "flex", alignItems: "center", gap: 10, minWidth: 320 },
  brandDivider: { width: 1, height: 34, background: "rgba(148,163,184,.45)" },
  textLogo: { display: "flex", alignItems: "center", gap: 10, padding: "8px 10px", borderRadius: 14, background: "linear-gradient(180deg,#ffffff,#f8fafc)", border: "1px solid rgba(226,232,240,.95)", boxShadow: "0 10px 24px rgba(15,23,42,.08)" },
  textLogoIcon: { width: 34, height: 34, borderRadius: 12, display: "grid", placeItems: "center", background: "linear-gradient(180deg, rgba(59,130,246,.14), rgba(168,85,247,.12))", border: "1px solid rgba(226,232,240,.95)", fontSize: 16 },
  textLogoTop: { fontWeight: 1000, letterSpacing: ".8px", color: "#0f172a", fontSize: 12 },
  textLogoBottom: { fontWeight: 800, letterSpacing: ".2px", color: "#64748b", fontSize: 11 },
  title: { fontWeight: 1000, color: "#0f172a", letterSpacing: ".2px", fontSize: 16 },
  subTitle: { fontWeight: 800, color: "#94a3b8", fontSize: 12 },
  searchWrap: { display: "flex", alignItems: "center", gap: 10, background: "rgba(255,255,255,.92)", border: "1px solid rgba(226,232,240,.95)", borderRadius: 16, padding: "10px 12px", minWidth: 360, boxShadow: "0 14px 30px rgba(2,6,23,.10)" },
  searchIcon: { fontSize: 16, opacity: 0.65, fontWeight: 900 },
  searchIn: { border: "none", outline: "none", width: "100%", fontWeight: 900, color: "#0f172a", background: "transparent" },
  searchHint: { padding: "6px 10px", borderRadius: 999, background: "rgba(148,163,184,.18)", color: "#64748b", fontWeight: 800, fontSize: 12, border: "1px solid rgba(148,163,184,.25)" },
  pill: { border: "1px solid rgba(148,163,184,.4)", background: "linear-gradient(180deg,#fff,#f8fafc)", borderRadius: 999, padding: "7px 10px", fontWeight: 950, cursor: "pointer" },
  btn: { border: "1px solid rgba(148,163,184,.55)", background: "linear-gradient(180deg,#fff,#f7f9ff)", borderRadius: 16, padding: "10px 12px", fontWeight: 950, cursor: "pointer", boxShadow: "0 12px 24px rgba(2,6,23,.08)" },
  loading: { padding: 10, color: "#e2e8f0", fontWeight: 900 },
  card: { background: "rgba(255,255,255,.92)", borderRadius: 18, padding: 12, border: "1px solid rgba(226,232,240,.95)", boxShadow: "0 20px 60px rgba(2,6,23,.14)", backdropFilter: "blur(10px)" },
  tableWrap: { overflow: "auto", borderRadius: 16, border: "1px solid rgba(226,232,240,.95)", boxShadow: "inset 0 1px 0 rgba(255,255,255,.6)" },
  table: { width: "100%", borderCollapse: "separate", borderSpacing: 0, minWidth: 1300, tableLayout: "fixed", background: "linear-gradient(180deg,#ffffff, #fbfbff)" },
  thSticky: { position: "sticky", left: 0, zIndex: 3, padding: "12px 10px", textAlign: "center", fontWeight: 1000, borderBottom: "1px solid rgba(226,232,240,.95)", background: "linear-gradient(180deg,#0b1220,#0b1220)", color: "#fff", width: 56, whiteSpace: "nowrap" },
  th: { position: "sticky", top: 0, zIndex: 2, padding: "12px 10px", textAlign: "center", fontWeight: 1000, borderBottom: "1px solid rgba(226,232,240,.95)", background: "linear-gradient(180deg, rgba(15,23,42,.96), rgba(15,23,42,.92)), radial-gradient(700px 220px at 20% 0%, rgba(59,130,246,.22), transparent 60%)", color: "#fff", whiteSpace: "nowrap" },
  thInner: { display: "inline-flex", alignItems: "center", gap: 8, justifyContent: "center" },
  thIco: { opacity: 0.95 },
  tdSticky: { position: "sticky", left: 0, zIndex: 1, padding: "10px 8px", textAlign: "center", borderBottom: "1px solid rgba(226,232,240,.85)", background: "linear-gradient(180deg,#ffffff,#f8fafc)", fontWeight: 1000, color: "#0f172a" },
  td: { padding: "10px 8px", textAlign: "center", borderBottom: "1px solid rgba(226,232,240,.85)", background: "rgba(255,255,255,.75)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", verticalAlign: "middle" },
  cellText: { fontWeight: 850, color: "#0f172a" },
  mono: { fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace', fontWeight: 950, color: "#0f172a" },
  muted: { color: "#64748b", fontWeight: 800, fontSize: 12 },
  in: { width: "100%", boxSizing: "border-box", padding: "10px 12px", borderRadius: 14, border: "1px solid rgba(226,232,240,.95)", background: "linear-gradient(180deg,#ffffff,#f8fafc)", outline: "none", fontWeight: 900, boxShadow: "0 10px 18px rgba(2,6,23,.06)" },
  actions: { display: "flex", gap: 8, justifyContent: "center", flexWrap: "wrap" },
  btnPrimary: { border: "1px solid rgba(22,163,74,.22)", background: "linear-gradient(180deg, rgba(34,197,94,1), rgba(22,163,74,1))", color: "#fff", borderRadius: 14, padding: "8px 10px", cursor: "pointer", fontWeight: 1000, boxShadow: "0 12px 22px rgba(22,163,74,.20)" },
  btnGhost: { border: "1px solid rgba(148,163,184,.55)", background: "linear-gradient(180deg,#fff,#f8fafc)", borderRadius: 14, padding: "8px 10px", cursor: "pointer", fontWeight: 950 },
  btnDanger: { border: "1px solid rgba(220,38,38,.20)", background: "linear-gradient(180deg, rgba(239,68,68,1), rgba(220,38,38,1))", color: "#fff", borderRadius: 14, padding: "8px 10px", cursor: "pointer", fontWeight: 1000, boxShadow: "0 12px 22px rgba(220,38,38,.20)" },
  iconBtn: { border: "1px solid rgba(148,163,184,.55)", background: "linear-gradient(180deg,#fff,#f8fafc)", borderRadius: 999, padding: "7px 12px", cursor: "pointer", fontWeight: 950, display: "inline-flex", alignItems: "center", gap: 8, boxShadow: "0 10px 18px rgba(2,6,23,.06)" },
  iconBtnIco: { fontSize: 14 },
  iconBtnTxt: { fontSize: 13 },
  msg: { marginTop: 10, fontWeight: 1000, padding: 12, borderRadius: 16, background: "rgba(255,255,255,.92)", border: "1px solid rgba(226,232,240,.95)", boxShadow: "0 16px 30px rgba(2,6,23,.10)" },
  badge: (n) => {
    const base = { padding: "7px 12px", borderRadius: 999, fontWeight: 1000, display: "inline-flex", alignItems: "center", justifyContent: "center", minWidth: 64, border: "1px solid rgba(226,232,240,.9)", boxShadow: "0 10px 18px rgba(2,6,23,.06)" };
    if (n == null) return { ...base, background: "#f1f5f9", color: "#0f172a" };
    if (n < 0)     return { ...base, background: "#fee2e2", color: "#991b1b" };
    if (n <= 30)   return { ...base, background: "#ffedd5", color: "#9a3412" };
    return           { ...base, background: "#dcfce7", color: "#166534" };
  },
  modalBackdrop: { position: "fixed", inset: 0, background: "rgba(2,6,23,.65)", zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center", padding: 14 },
  modalCard: { width: "min(980px, 96vw)", maxHeight: "90vh", background: "#fff", borderRadius: 18, boxShadow: "0 24px 90px rgba(0,0,0,.45)", overflow: "hidden", display: "flex", flexDirection: "column", border: "1px solid rgba(226,232,240,.95)" },
  modalHead: { padding: 12, borderBottom: "1px solid rgba(226,232,240,.95)", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, background: "linear-gradient(180deg,#ffffff,#f8fafc)" },
  modalBody: { padding: 12, overflow: "auto", background: "radial-gradient(800px 500px at 40% 20%, rgba(59,130,246,.18), transparent 60%), #0b1220", display: "flex", alignItems: "center", justifyContent: "center" },
  modalImg: { maxWidth: "100%", maxHeight: "78vh", borderRadius: 14, background: "#fff", border: "1px solid rgba(226,232,240,.35)" },

  /* ✅ NEW: modal action buttons (Full Size / Download) */
  btnModalAction: {
    textDecoration: "none",
    border: "1px solid rgba(148,163,184,.55)",
    background: "linear-gradient(180deg,#fff,#f8fafc)",
    borderRadius: 14,
    padding: "8px 12px",
    cursor: "pointer",
    fontWeight: 950,
    color: "#0f172a",
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    fontSize: 13,
    boxShadow: "0 10px 18px rgba(2,6,23,.06)",
  },

  btnDangerMini: { border: "1px solid rgba(220,38,38,.25)", background: "linear-gradient(180deg, rgba(239,68,68,1), rgba(220,38,38,1))", color: "#fff", borderRadius: 14, padding: "8px 10px", cursor: "pointer", fontWeight: 1000 },
  empty: { padding: 14, color: "#64748b", textAlign: "center", fontWeight: 900 },

  /* ✅ Banner + chips */
  banner: {
    display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap",
    marginBottom: 10, padding: "10px 14px", borderRadius: 16,
    background: "linear-gradient(180deg,#fffbeb,#fef3c7)",
    border: "1px solid #fde68a",
    boxShadow: "0 8px 20px rgba(146, 64, 14, .12)",
  },
  bChip: (color, bg, active) => ({
    border: `1px solid ${active ? color : "rgba(148,163,184,.4)"}`,
    background: active ? color : bg,
    color: active ? "#fff" : color,
    borderRadius: 999,
    padding: "6px 12px",
    fontWeight: 1000,
    cursor: "pointer",
    fontSize: 12,
    boxShadow: active ? `0 6px 14px ${color}40` : "none",
    display: "inline-flex", alignItems: "center", gap: 4,
  }),

  /* ✅ Bell panel */
  bellPanel: {
    position: "absolute", top: "calc(100% + 6px)", right: 0, zIndex: 9000,
    width: 320, maxHeight: 480, overflow: "auto",
    background: "#fff", border: "1px solid rgba(226,232,240,.95)", borderRadius: 14,
    boxShadow: "0 18px 48px rgba(2,6,23,.22)", padding: 14,
  },

  /* ✅ Image edit controls */
  imgRow: {
    display: "flex", alignItems: "center", gap: 4, justifyContent: "space-between",
    background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 10, padding: "4px 6px",
  },
  imgViewMini: {
    flex: 1, border: "1px solid rgba(148,163,184,.55)", background: "#fff",
    borderRadius: 8, padding: "4px 8px", cursor: "pointer", fontWeight: 900, fontSize: 11,
    display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 4,
  },
  imgReplaceBtn: {
    border: "1px solid rgba(59,130,246,.4)", background: "#eff6ff", color: "#1d4ed8",
    borderRadius: 8, padding: "4px 8px", cursor: "pointer", fontWeight: 900, fontSize: 12,
    display: "inline-flex", alignItems: "center", justifyContent: "center",
  },
  imgDelBtn: {
    border: "1px solid rgba(220,38,38,.3)", background: "#fee2e2", color: "#991b1b",
    borderRadius: 8, padding: "4px 8px", cursor: "pointer", fontWeight: 1000, fontSize: 12,
  },
  imgAddBtn: {
    border: "1px dashed #94a3b8", background: "linear-gradient(180deg,#f0f9ff,#e0f2fe)", color: "#0369a1",
    borderRadius: 10, padding: "8px 10px", cursor: "pointer", fontWeight: 900, fontSize: 12,
    textAlign: "center", display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 6,
  },
};