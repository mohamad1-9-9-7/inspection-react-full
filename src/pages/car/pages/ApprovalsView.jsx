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
  // Strip transient _uid before persisting
  const cleanItems = (items || []).map((r) => {
    const { _uid, ...rest } = r || {};
    return rest;
  });
  const payload = {
    reporter: "anonymous",
    type: TYPE,
    payload: { reportDate: FIXED_DATE, items: cleanItems, _clientSavedAt },
  };
  const attempts = [
    { url: `${API_BASE}/api/reports`, method: "PUT", body: JSON.stringify(payload) },
    {
      url: `${API_BASE}/api/reports/${TYPE}?reportDate=${encodeURIComponent(FIXED_DATE)}`,
      method: "PUT",
      body: JSON.stringify({ items: cleanItems, _clientSavedAt }),
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
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(str)) {
    const [d, m, y] = str.split("/").map(Number);
    const dt = new Date(y, m - 1, d);
    return isNaN(dt.getTime()) ? null : dt;
  }
  const dt = new Date(str);
  return isNaN(dt.getTime()) ? null : dt;
}

/** Always returns YYYY-MM-DD (required by <input type="date">) or "" if invalid */
function toIsoDate(s) {
  if (!s) return "";
  const dt = parseDateSmart(s);
  if (!dt) return "";
  const y = dt.getFullYear();
  const m = String(dt.getMonth() + 1).padStart(2, "0");
  const d = String(dt.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** Pretty date for read-only display: DD MMM YYYY (locale agnostic) */
function prettyDate(s) {
  if (!s) return "";
  const dt = parseDateSmart(s);
  if (!dt) return String(s);
  const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  return `${String(dt.getDate()).padStart(2, "0")} ${months[dt.getMonth()]} ${dt.getFullYear()}`;
}

function daysRemaining(expiryStr) {
  const dt = parseDateSmart(expiryStr);
  if (!dt) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  dt.setHours(0, 0, 0, 0);
  return Math.round((dt.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

/** Stable unique id for a row — kept across edits */
let _uidCounter = 0;
function genUid() {
  _uidCounter = (_uidCounter + 1) % 1_000_000;
  return `r_${Date.now().toString(36)}_${_uidCounter.toString(36)}`;
}

/** Convert array to CSV (with BOM for Excel UTF-8) */
function toCsv(headers, rows) {
  const esc = (v) => {
    const s = v == null ? "" : String(v);
    if (/[",\n\r]/.test(s)) return '"' + s.replace(/"/g, '""') + '"';
    return s;
  };
  const lines = [headers.map(esc).join(",")];
  for (const r of rows) lines.push(r.map(esc).join(","));
  return "﻿" + lines.join("\r\n");
}

function downloadBlob(content, filename, mime = "text/csv;charset=utf-8") {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}

const normalizeRow = (r) => {
  let imageUrls = [];
  if (Array.isArray(r?.imageUrls)) {
    imageUrls = r.imageUrls.filter(Boolean).map((u) => String(u).trim());
  } else if (r?.imageUrl) {
    imageUrls = [String(r.imageUrl).trim()].filter(Boolean);
  }
  return {
    _uid: r?._uid || genUid(),
    company: (r?.company || "").trim(),
    emirate: (r?.emirate || "").trim(),
    tradeLicense: (r?.tradeLicense || "").trim(),
    vehicleNo: (r?.vehicleNo || "").trim(),
    issueDate: toIsoDate(r?.issueDate || ""),   // always YYYY-MM-DD for date input
    expiryDate: toIsoDate(r?.expiryDate || ""), // always YYYY-MM-DD for date input
    permitType: (r?.permitType || "").trim(),
    foodType: (r?.foodType || "").trim(),
    remarks: (r?.remarks || "").trim(),
    imageUrls,
  };
};

/** Strip transient fields (_uid) before saving to server */
const stripForSave = (r) => {
  const { _uid, ...rest } = r || {};
  return rest;
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
  const [editingUid, setEditingUid] = useState(null);   // stable id, survives date edits
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");
  const [q, setQ] = useState("");
  const [imgModal, setImgModal] = useState({ open: false, url: "", title: "" });
  const [expiryFilter, setExpiryFilter] = useState("all"); // "all" | "expired" | "7d" | "30d" | "90d"
  const [bellOpen, setBellOpen] = useState(false);
  /* Pro tools */
  const [emirateFilter, setEmirateFilter] = useState("all");
  const [permitFilter, setPermitFilter] = useState("all");
  const [sortKey, setSortKey] = useState("expiryDate");
  const [sortDir, setSortDir] = useState("asc"); // asc | desc

  const openImage = (url, title = "") => { if (url) setImgModal({ open: true, url, title }); };
  const closeImage = () => setImgModal({ open: false, url: "", title: "" });

  const refresh = async () => {
    try {
      setLoading(true);
      const items = await loadApprovalsFromServer();
      const clean = (Array.isArray(items) ? items : []).map(normalizeRow);
      setRows(clean);
      setDraftRows(clean);
      setEditingUid(null);
    } catch (e) {
      console.error(e);
      setRows([]);
      setDraftRows([]);
      setEditingUid(null);
      setMsg("❌ Failed to load from server.");
      setTimeout(() => setMsg(""), 2500);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { refresh(); }, []);
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") {
        closeImage();
        setBellOpen(false);
        if (editingUid && !saving) cancelEdit();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editingUid, saving]);
  // Lock body scroll while edit modal is open
  useEffect(() => {
    if (editingUid) {
      const prev = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => { document.body.style.overflow = prev; };
    }
  }, [editingUid]);
  useEffect(() => {
    if (!bellOpen) return;
    const onClick = () => setBellOpen(false);
    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
  }, [bellOpen]);

  const cols = useMemo(() => [
    { k: "company",      t: "Company",        ico: "🏢", sortable: true },
    { k: "emirate",      t: "Emirate",        ico: "📍", sortable: true },
    { k: "tradeLicense", t: "Trade License",  ico: "🧾", sortable: true },
    { k: "vehicleNo",    t: "Vehicle No",     ico: "🚚", sortable: true },
    { k: "issueDate",    t: "Issue Date",     ico: "📅", sortable: true },
    { k: "expiryDate",   t: "Expiry Date",    ico: "⏳", sortable: true },
    { k: "permitType",   t: "Permit Type",    ico: "✅", sortable: true },
    { k: "foodType",     t: "Food Type",      ico: "🥩", sortable: true },
    { k: "daysLeft",     t: "Days Left",      ico: "⏱️", sortable: true },
    { k: "image",        t: "Images",         ico: "🖼️", sortable: false },
    { k: "remarks",      t: "Remarks",        ico: "📝", sortable: false },
    { k: "actions",      t: "Action",         ico: "⚙️", sortable: false },
  ], []);

  const setDraftValByUid = (uid, key, value) =>
    setDraftRows((prev) => prev.map((r) => (r._uid === uid ? { ...r, [key]: value } : r)));

  /* ✅ Add image during edit — uploads + persists immediately */
  const addImage = async (uid, file) => {
    if (!file) return;
    const row = rows.find((r) => r._uid === uid);
    const currentUrls = row?.imageUrls || [];
    if (currentUrls.length >= MAX_IMAGES) {
      setMsg(`❌ Max ${MAX_IMAGES} images per row.`);
      setTimeout(() => setMsg(""), 2500);
      return;
    }
    try {
      setSaving(true);
      setMsg("⏳ Uploading image…");
      const url = await uploadViaServer(file);
      const nextRows = rows.map((r) =>
        r._uid === uid ? { ...r, imageUrls: [...(r.imageUrls || []), url] } : r
      );
      await saveApprovalsToServer(nextRows);
      setRows(nextRows);
      setDraftRows((p) =>
        p.map((r) => (r._uid === uid ? { ...r, imageUrls: [...(r.imageUrls || []), url] } : r))
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
  const removeImage = async (uid, imgIdx) => {
    const row = rows.find((r) => r._uid === uid);
    const url = row?.imageUrls?.[imgIdx];
    if (!url) return;
    const ok = window.confirm("Remove this image?");
    if (!ok) return;
    try {
      setSaving(true);
      setMsg("⏳ Removing image…");
      await deleteImage(url);
      const nextRows = rows.map((r) =>
        r._uid === uid ? { ...r, imageUrls: (r.imageUrls || []).filter((_, ii) => ii !== imgIdx) } : r
      );
      await saveApprovalsToServer(nextRows);
      setRows(nextRows);
      setDraftRows((p) =>
        p.map((r) =>
          r._uid === uid ? { ...r, imageUrls: (r.imageUrls || []).filter((_, ii) => ii !== imgIdx) } : r
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
  const replaceImage = async (uid, imgIdx, file) => {
    if (!file) return;
    const row = rows.find((r) => r._uid === uid);
    const oldUrl = row?.imageUrls?.[imgIdx];
    if (!oldUrl) return;
    try {
      setSaving(true);
      setMsg("⏳ Replacing image…");
      const newUrl = await uploadViaServer(file);
      await deleteImage(oldUrl);
      const nextRows = rows.map((r) =>
        r._uid === uid ? {
          ...r,
          imageUrls: (r.imageUrls || []).map((u, ii) => (ii === imgIdx ? newUrl : u)),
        } : r
      );
      await saveApprovalsToServer(nextRows);
      setRows(nextRows);
      setDraftRows((p) =>
        p.map((r) =>
          r._uid === uid ? {
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

  const startEdit = (uid) => {
    // Reset draft to a fresh clone of current rows (preserve _uid)
    setDraftRows(rows.map((r) => ({ ...r })));
    setEditingUid(uid);
  };
  const cancelEdit = () => {
    setDraftRows(rows.map((r) => ({ ...r })));
    setEditingUid(null);
  };

  const saveEditRow = async () => {
    try {
      setSaving(true);
      setMsg("⏳ Saving changes…");
      // Preserve _uid through normalize (normalizeRow keeps it if present)
      const next = draftRows.map(normalizeRow);
      const filtered = next.filter((r) => r.vehicleNo || r.tradeLicense || r.company);
      await saveApprovalsToServer(filtered);
      setRows(filtered);
      setDraftRows(filtered);
      setEditingUid(null);
      setMsg("✅ Updated.");
    } catch (e) {
      console.error(e);
      setMsg("❌ Failed to update.");
    } finally {
      setSaving(false);
      setTimeout(() => setMsg(""), 2500);
    }
  };

  const deleteRow = async (uid) => {
    const ok = window.confirm("Delete this row?");
    if (!ok) return;
    try {
      setSaving(true);
      setMsg("⏳ Deleting…");
      const next = rows.filter((r) => r._uid !== uid);
      await saveApprovalsToServer(next);
      setRows(next);
      setDraftRows(next);
      setEditingUid(null);
      setMsg("✅ Deleted.");
    } catch (e) {
      console.error(e);
      setMsg("❌ Failed to delete.");
    } finally {
      setSaving(false);
      setTimeout(() => setMsg(""), 2500);
    }
  };

  /* ===== Add new blank row ===== */
  const addNewRow = () => {
    const newRow = normalizeRow({});
    setRows((p) => [newRow, ...p]);
    setDraftRows((p) => [newRow, ...p]);
    setEditingUid(newRow._uid);
  };

  /* ===== Export CSV ===== */
  const exportCsv = () => {
    const headers = [
      "Company", "Emirate", "Trade License", "Vehicle No",
      "Issue Date", "Expiry Date", "Permit Type", "Food Type",
      "Days Left", "Remarks", "Images",
    ];
    const data = filteredRows.map((r) => [
      r.company, r.emirate, r.tradeLicense, r.vehicleNo,
      prettyDate(r.issueDate), prettyDate(r.expiryDate), r.permitType, r.foodType,
      String(daysRemaining(r.expiryDate) ?? ""),
      r.remarks,
      (r.imageUrls || []).join(" | "),
    ]);
    const csv = toCsv(headers, data);
    const today = new Date().toISOString().slice(0, 10);
    downloadBlob(csv, `vehicle-approvals_${today}.csv`);
    setMsg(`✅ Exported ${data.length} record(s) to CSV.`);
    setTimeout(() => setMsg(""), 2500);
  };

  /* ===== Print ===== */
  const handlePrint = () => {
    window.print();
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

  /* Unique emirate / permit lists for filters */
  const emirateOptions = useMemo(() => {
    const set = new Set();
    rows.forEach((r) => { if (r.emirate) set.add(r.emirate); });
    return Array.from(set).sort();
  }, [rows]);
  const permitOptions = useMemo(() => {
    const set = new Set();
    rows.forEach((r) => { if (r.permitType) set.add(r.permitType); });
    return Array.from(set).sort();
  }, [rows]);

  const filteredRows = useMemo(() => {
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
    let out = rows.filter((r) =>
      passesExpiry(r) &&
      (emirateFilter === "all" || r.emirate === emirateFilter) &&
      (permitFilter === "all" || r.permitType === permitFilter) &&
      (qq ? rowMatchesQuery(r, qq) : true)
    );
    // sort
    if (sortKey) {
      const dir = sortDir === "asc" ? 1 : -1;
      out = [...out].sort((a, b) => {
        if (sortKey === "daysLeft") {
          const da = daysRemaining(a.expiryDate);
          const db = daysRemaining(b.expiryDate);
          const av = da == null ? Number.POSITIVE_INFINITY : da;
          const bv = db == null ? Number.POSITIVE_INFINITY : db;
          return (av - bv) * dir;
        }
        if (sortKey === "issueDate" || sortKey === "expiryDate") {
          const da = parseDateSmart(a[sortKey])?.getTime() ?? 0;
          const db = parseDateSmart(b[sortKey])?.getTime() ?? 0;
          return (da - db) * dir;
        }
        const av = String(a[sortKey] ?? "").toLowerCase();
        const bv = String(b[sortKey] ?? "").toLowerCase();
        return av.localeCompare(bv) * dir;
      });
    }
    return out;
  }, [rows, q, expiryFilter, emirateFilter, permitFilter, sortKey, sortDir]);

  const toggleSort = (key) => {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  };

  /* ===== KPI calculations ===== */
  const kpis = useMemo(() => {
    let active = 0, expired = 0, expiringSoon = 0, missingDate = 0;
    rows.forEach((r) => {
      const d = daysRemaining(r.expiryDate);
      if (d == null) { missingDate++; return; }
      if (d < 0) expired++;
      else if (d <= 30) expiringSoon++;
      else active++;
    });
    const emirates = new Set(rows.map((r) => r.emirate).filter(Boolean)).size;
    const companies = new Set(rows.map((r) => r.company).filter(Boolean)).size;
    const withImg = rows.filter((r) => (r.imageUrls || []).length > 0).length;
    const complianceRate = rows.length > 0 ? Math.round((active / rows.length) * 100) : 0;
    const imgCoverage = rows.length > 0 ? Math.round((withImg / rows.length) * 100) : 0;
    return {
      total: rows.length,
      active, expired, expiringSoon, missingDate,
      emirates, companies, withImg,
      complianceRate, imgCoverage,
    };
  }, [rows]);

  const s = styles;

  return (
    <div style={s.page}>
      <style>{`
        @keyframes av-pulse {
          0%, 100% { box-shadow: 0 0 0 0 rgba(220,38,38,.55); }
          50% { box-shadow: 0 0 0 6px rgba(220,38,38,0); }
        }
        @media print {
          .av-no-print { display: none !important; }
          body { background: #fff !important; }
        }
      `}</style>

      {/* ✅ Edit Modal — replaces inline editing */}
      {editingUid && (() => {
        const draft = draftRows.find((d) => d._uid === editingUid);
        if (!draft) return null;
        const imgUrls = draft.imageUrls || [];
        const left = daysRemaining(draft.expiryDate);
        const isNew = !rows.some((r) => r._uid === editingUid && (r.company || r.vehicleNo || r.tradeLicense));
        return (
          <div
            style={s.editBackdrop}
            onClick={(e) => { if (e.target === e.currentTarget && !saving) cancelEdit(); }}
            role="presentation"
          >
            <div style={s.editModal} onClick={(e) => e.stopPropagation()}>
              {/* Header */}
              <div style={s.editHead}>
                <div>
                  <div style={s.editTitle}>{isNew ? "➕ New Vehicle Approval" : "✏️ Edit Vehicle Approval"}</div>
                  <div style={s.editSubtitle}>
                    {draft.vehicleNo || draft.tradeLicense || draft.company || "Untitled record"}
                    {left != null && (
                      <>
                        {" • "}
                        <span style={{
                          color: left < 0 ? "#991b1b" : left <= 30 ? "#9a3412" : "#166534",
                          fontWeight: 1000,
                        }}>
                          {left < 0 ? `Expired ${Math.abs(left)} day(s) ago` : `${left} day(s) remaining`}
                        </span>
                      </>
                    )}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={cancelEdit}
                  disabled={saving}
                  style={s.editCloseX}
                  title="Close (Esc)"
                >✕</button>
              </div>

              {/* Body — scrollable */}
              <div style={s.editBody}>
                {/* Identification group */}
                <div style={s.editGroup}>
                  <div style={s.editGroupTitle}>🏢 Identification</div>
                  <div style={s.editGrid}>
                    <Field label="Company *">
                      <input
                        value={draft.company || ""}
                        onChange={(e) => setDraftValByUid(editingUid, "company", e.target.value)}
                        style={s.editInput}
                        placeholder="Company name"
                        autoFocus
                      />
                    </Field>
                    <Field label="Emirate">
                      <input
                        list="emirate-list-modal"
                        value={draft.emirate || ""}
                        onChange={(e) => setDraftValByUid(editingUid, "emirate", e.target.value)}
                        style={s.editInput}
                        placeholder="e.g. Dubai"
                      />
                      <datalist id="emirate-list-modal">
                        {["Abu Dhabi","Dubai","Sharjah","Ajman","Umm Al Quwain","Ras Al Khaimah","Fujairah"].map((em) =>
                          <option key={em} value={em} />)}
                      </datalist>
                    </Field>
                    <Field label="Trade License">
                      <input
                        value={draft.tradeLicense || ""}
                        onChange={(e) => setDraftValByUid(editingUid, "tradeLicense", e.target.value)}
                        style={{ ...s.editInput, fontFamily: 'ui-monospace, Menlo, monospace' }}
                        placeholder="Trade license No."
                      />
                    </Field>
                    <Field label="Vehicle No *">
                      <input
                        value={draft.vehicleNo || ""}
                        onChange={(e) => setDraftValByUid(editingUid, "vehicleNo", e.target.value)}
                        style={{ ...s.editInput, fontFamily: 'ui-monospace, Menlo, monospace' }}
                        placeholder="e.g. A 12345"
                      />
                    </Field>
                  </div>
                </div>

                {/* Dates group */}
                <div style={s.editGroup}>
                  <div style={s.editGroupTitle}>📅 Validity Period</div>
                  <div style={s.editGrid}>
                    <Field label="Issue Date">
                      <DateCell
                        value={draft.issueDate}
                        onChange={(v) => setDraftValByUid(editingUid, "issueDate", v)}
                        style={s.editInput}
                      />
                    </Field>
                    <Field label="Expiry Date">
                      <DateCell
                        value={draft.expiryDate}
                        onChange={(v) => setDraftValByUid(editingUid, "expiryDate", v)}
                        style={s.editInput}
                      />
                    </Field>
                  </div>
                </div>

                {/* Permit info */}
                <div style={s.editGroup}>
                  <div style={s.editGroupTitle}>✅ Permit Details</div>
                  <div style={s.editGrid}>
                    <Field label="Permit Type">
                      <input
                        value={draft.permitType || ""}
                        onChange={(e) => setDraftValByUid(editingUid, "permitType", e.target.value)}
                        style={s.editInput}
                        placeholder="e.g. Refrigerated transport"
                      />
                    </Field>
                    <Field label="Food Type">
                      <input
                        value={draft.foodType || ""}
                        onChange={(e) => setDraftValByUid(editingUid, "foodType", e.target.value)}
                        style={s.editInput}
                        placeholder="e.g. Chilled meat"
                      />
                    </Field>
                  </div>
                </div>

                {/* Images */}
                <div style={s.editGroup}>
                  <div style={s.editGroupTitle}>
                    🖼️ Images
                    <span style={{ marginInlineStart: 8, fontSize: 12, fontWeight: 800, color: "#64748b" }}>
                      ({imgUrls.length}/{MAX_IMAGES})
                    </span>
                  </div>
                  {imgUrls.length > 0 ? (
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))", gap: 10, marginBottom: 10 }}>
                      {imgUrls.map((url, ii) => (
                        <div key={ii} style={{ position: "relative", borderRadius: 12, overflow: "hidden", border: "1px solid rgba(226,232,240,.95)", background: "#fff", boxShadow: "0 6px 14px rgba(2,6,23,.08)" }}>
                          <button
                            type="button"
                            onClick={() => openImage(url, `Image ${ii + 1}`)}
                            style={{ background: "none", border: "none", padding: 0, cursor: "pointer", display: "block", width: "100%" }}
                            title="View"
                          >
                            <img src={url} alt={`#${ii + 1}`} style={{ width: "100%", height: 120, objectFit: "cover", display: "block" }} />
                          </button>
                          <div style={{ display: "flex", gap: 4, padding: 6, background: "#f8fafc" }}>
                            <label style={{ ...s.imgReplaceBtn, flex: 1, justifyContent: "center" }} title="Replace">
                              🔄
                              <input
                                type="file"
                                accept="image/*"
                                style={{ display: "none" }}
                                onChange={(e) => {
                                  const f = e.target.files?.[0];
                                  e.target.value = "";
                                  if (f) replaceImage(editingUid, ii, f);
                                }}
                                disabled={saving}
                              />
                            </label>
                            <button
                              type="button"
                              onClick={() => removeImage(editingUid, ii)}
                              style={{ ...s.imgDelBtn, flex: 1 }}
                              title="Remove"
                              disabled={saving}
                            >✕</button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div style={{ padding: 16, textAlign: "center", color: "#64748b", fontWeight: 800, background: "#f8fafc", borderRadius: 12, border: "1px dashed #cbd5e1", marginBottom: 10 }}>
                      No images uploaded yet
                    </div>
                  )}
                  {imgUrls.length < MAX_IMAGES && (
                    <label style={{ ...s.imgAddBtn, display: "flex", justifyContent: "center", padding: "12px 14px" }}>
                      ➕ Upload image
                      <input
                        type="file"
                        accept="image/*"
                        style={{ display: "none" }}
                        onChange={(e) => {
                          const f = e.target.files?.[0];
                          e.target.value = "";
                          if (f) addImage(editingUid, f);
                        }}
                        disabled={saving}
                      />
                    </label>
                  )}
                </div>

                {/* Remarks */}
                <div style={s.editGroup}>
                  <div style={s.editGroupTitle}>📝 Remarks</div>
                  <textarea
                    value={draft.remarks || ""}
                    onChange={(e) => setDraftValByUid(editingUid, "remarks", e.target.value)}
                    style={{ ...s.editInput, minHeight: 70, resize: "vertical", fontFamily: "inherit" }}
                    placeholder="Notes (optional)"
                  />
                </div>
              </div>

              {/* Footer */}
              <div style={s.editFoot}>
                <button type="button" onClick={cancelEdit} disabled={saving} style={s.btnGhost}>✖ Cancel</button>
                <button type="button" onClick={saveEditRow} disabled={saving} style={{ ...s.btnPrimary, minWidth: 140 }}>
                  {saving ? "⏳ Saving…" : "💾 Save Changes"}
                </button>
              </div>
            </div>
          </div>
        );
      })()}

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
      <div style={s.topBar} className="av-no-print">
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
        <button type="button" onClick={addNewRow} style={s.btnAdd} disabled={saving} title="Add new row">+ Add</button>
        <button type="button" onClick={exportCsv} style={s.btn} disabled={saving || filteredRows.length === 0} title="Export filtered to CSV">📊 Export CSV</button>
        <button type="button" onClick={handlePrint} style={s.btn} disabled={saving} title="Print">🖨️ Print</button>

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

      {/* ✅ KPI Dashboard */}
      <div style={s.kpiGrid} className="av-no-print">
        <KpiCard
          icon="🚚"
          label="Total Vehicles"
          value={kpis.total}
          color="#0f172a"
          bg="linear-gradient(135deg,#fff,#f1f5f9)"
        />
        <KpiCard
          icon="✅"
          label="Active (>30d)"
          value={kpis.active}
          color="#166534"
          bg="linear-gradient(135deg,#dcfce7,#f0fdf4)"
          hint={`${kpis.complianceRate}% compliance`}
        />
        <KpiCard
          icon="⏰"
          label="Expiring ≤30d"
          value={kpis.expiringSoon}
          color="#92400e"
          bg="linear-gradient(135deg,#fef3c7,#fffbeb)"
          hint="Renew soon"
          onClick={() => setExpiryFilter(expiryFilter === "30d" ? "all" : "30d")}
          active={expiryFilter === "30d"}
        />
        <KpiCard
          icon="🚨"
          label="Expired"
          value={kpis.expired}
          color="#991b1b"
          bg="linear-gradient(135deg,#fee2e2,#fef2f2)"
          hint={kpis.expired > 0 ? "Action required" : "All good"}
          onClick={() => setExpiryFilter(expiryFilter === "expired" ? "all" : "expired")}
          active={expiryFilter === "expired"}
        />
        <KpiCard
          icon="📍"
          label="Emirates"
          value={kpis.emirates}
          color="#1e40af"
          bg="linear-gradient(135deg,#dbeafe,#eff6ff)"
        />
        <KpiCard
          icon="🏢"
          label="Companies"
          value={kpis.companies}
          color="#5b21b6"
          bg="linear-gradient(135deg,#e9d5ff,#faf5ff)"
        />
        <KpiCard
          icon="🖼️"
          label="With Images"
          value={kpis.withImg}
          color="#0e7490"
          bg="linear-gradient(135deg,#cffafe,#ecfeff)"
          hint={`${kpis.imgCoverage}% coverage`}
        />
        {kpis.missingDate > 0 && (
          <KpiCard
            icon="❓"
            label="Missing Date"
            value={kpis.missingDate}
            color="#64748b"
            bg="linear-gradient(135deg,#f1f5f9,#f8fafc)"
            hint="Needs review"
          />
        )}
      </div>

      {/* ✅ Filters toolbar */}
      <div style={s.filtersBar} className="av-no-print">
        <span style={s.filterLabel}>🔎 Filters:</span>
        <select value={emirateFilter} onChange={(e) => setEmirateFilter(e.target.value)} style={s.select}>
          <option value="all">All emirates</option>
          {emirateOptions.map((em) => <option key={em} value={em}>{em}</option>)}
        </select>
        <select value={permitFilter} onChange={(e) => setPermitFilter(e.target.value)} style={s.select}>
          <option value="all">All permit types</option>
          {permitOptions.map((p) => <option key={p} value={p}>{p}</option>)}
        </select>
        <span style={s.filterLabel}>⇅ Sort:</span>
        <select value={sortKey} onChange={(e) => setSortKey(e.target.value)} style={s.select}>
          <option value="expiryDate">Expiry date</option>
          <option value="daysLeft">Days left</option>
          <option value="issueDate">Issue date</option>
          <option value="company">Company</option>
          <option value="emirate">Emirate</option>
          <option value="vehicleNo">Vehicle No</option>
        </select>
        <button type="button" onClick={() => setSortDir((d) => (d === "asc" ? "desc" : "asc"))} style={s.pill}>
          {sortDir === "asc" ? "↑ Asc" : "↓ Desc"}
        </button>
        {(emirateFilter !== "all" || permitFilter !== "all" || expiryFilter !== "all" || q) && (
          <button
            type="button"
            onClick={() => { setEmirateFilter("all"); setPermitFilter("all"); setExpiryFilter("all"); setQ(""); }}
            style={s.pillDanger}
          >✕ Clear all filters</button>
        )}
        <span style={{ flex: 1 }} />
        <span style={s.filterCount}>
          Showing <strong>{filteredRows.length}</strong> / {rows.length}
        </span>
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
                  {cols.map((c) => {
                    const isSorted = c.sortable && sortKey === c.k;
                    return (
                      <th
                        key={c.k}
                        style={{ ...s.th, cursor: c.sortable ? "pointer" : "default" }}
                        onClick={() => c.sortable && toggleSort(c.k)}
                        title={c.sortable ? "Click to sort" : undefined}
                      >
                        <span style={s.thInner}>
                          <span style={s.thIco}>{c.ico}</span>
                          <span>{c.t}</span>
                          {c.sortable && (
                            <span style={{ opacity: isSorted ? 1 : 0.35, fontSize: 11 }}>
                              {isSorted ? (sortDir === "asc" ? "▲" : "▼") : "▲▼"}
                            </span>
                          )}
                        </span>
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody>
                {filteredRows.length ? (
                  filteredRows.map((r, i) => {
                    const uid = r._uid;
                    const left = daysRemaining(r?.expiryDate);
                    const imgUrls = r?.imageUrls || [];

                    return (
                      <tr key={uid}>
                        <td style={s.tdSticky}>{i + 1}</td>
                        <td style={s.td}><span style={s.cellText}>{r?.company || "-"}</span></td>
                        <td style={s.td}><span style={s.cellText}>{r?.emirate || "-"}</span></td>
                        <td style={s.td}><span style={s.mono}>{r?.tradeLicense || "-"}</span></td>
                        <td style={s.td}><span style={s.mono}>{r?.vehicleNo || "-"}</span></td>
                        <td style={s.td}><span style={s.cellText}>{prettyDate(r?.issueDate) || "-"}</span></td>
                        <td style={s.td}><span style={s.cellText}>{prettyDate(r?.expiryDate) || "-"}</span></td>
                        <td style={s.td}><span style={s.cellText}>{r?.permitType || "-"}</span></td>
                        <td style={s.td}><span style={s.cellText}>{r?.foodType || "-"}</span></td>
                        <td style={s.td}>
                          <span style={s.badge(left)} title={left == null ? "No expiry date" : left < 0 ? `Expired ${Math.abs(left)} day(s) ago` : `${left} day(s) remaining`}>
                            {left == null ? "—" : left < 0 ? `${Math.abs(left)}d ago` : `${left}d`}
                          </span>
                        </td>
                        <td style={{ ...s.td, minWidth: 140 }}>
                          {imgUrls.length > 0 ? (
                            <div style={{ display: "flex", flexDirection: "column", gap: 5, alignItems: "center" }}>
                              {imgUrls.map((url, ii) => (
                                <button
                                  key={ii}
                                  type="button"
                                  onClick={() => openImage(url, `${r.vehicleNo || r.tradeLicense || ""} — Image ${ii + 1}`)}
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
                        <td style={s.td}><span style={s.cellText}>{r?.remarks || "-"}</span></td>
                        <td style={s.td}>
                          <div style={s.actions}>
                            <button type="button" onClick={() => startEdit(uid)} style={s.btnGhost} disabled={saving}>✏ Edit</button>
                            <button type="button" onClick={() => deleteRow(uid)} style={s.btnDanger} disabled={saving}>🗑 Delete</button>
                          </div>
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

/* ===== Field — label + body wrapper for the edit modal ===== */
function Field({ label, children }) {
  return (
    <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <span style={{ fontSize: 11, fontWeight: 950, letterSpacing: ".05em", textTransform: "uppercase", color: "#475569" }}>{label}</span>
      {children}
    </label>
  );
}

/* =====================================================================
 * DateCell — robust date editor for the table.
 * - Stores ISO (YYYY-MM-DD) in state, but echoes input value as-is so
 *   the browser's native date input never "fights" the user's typing.
 * - Has a 📝 toggle button to switch between native picker and a plain
 *   text input that accepts YYYY-MM-DD, DD-MM-YYYY, or DD/MM/YYYY.
 * - On blur (text mode), the value is normalized via toIsoDate.
 * ===================================================================== */
function DateCell({ value, onChange, style }) {
  const [textMode, setTextMode] = useState(false);
  const [textVal, setTextVal] = useState(value || "");

  // Keep textVal in sync if the parent's value changes (e.g. cancel edit)
  useEffect(() => { setTextVal(value || ""); }, [value]);

  const wrap = { position: "relative", display: "flex", gap: 4, alignItems: "stretch" };
  const inStyle = { ...style, flex: 1 };
  const toggleBtn = {
    border: "1px solid rgba(148,163,184,.55)",
    background: textMode ? "#e0e7ff" : "linear-gradient(180deg,#fff,#f8fafc)",
    borderRadius: 10,
    padding: "0 8px",
    fontSize: 12,
    cursor: "pointer",
    fontWeight: 900,
    color: textMode ? "#3730a3" : "#0f172a",
    minWidth: 30,
  };

  if (textMode) {
    return (
      <div style={wrap}>
        <input
          type="text"
          value={textVal}
          onChange={(e) => setTextVal(e.target.value)}
          onBlur={() => {
            const iso = toIsoDate(textVal);
            if (iso) {
              setTextVal(iso);
              onChange(iso);
            } else if (!textVal.trim()) {
              onChange("");
            }
            // else: keep typed string, don't update parent (avoid wiping it)
          }}
          placeholder="YYYY-MM-DD or DD/MM/YYYY"
          style={inStyle}
          dir="ltr"
        />
        <button
          type="button"
          onClick={() => setTextMode(false)}
          style={toggleBtn}
          title="Use date picker"
        >📅</button>
      </div>
    );
  }

  return (
    <div style={wrap}>
      <input
        type="date"
        value={value || ""}
        onChange={(e) => onChange(e.target.value)}
        style={inStyle}
        dir="ltr"
      />
      <button
        type="button"
        onClick={() => setTextMode(true)}
        style={toggleBtn}
        title="Type date manually"
      >📝</button>
    </div>
  );
}

/* ===== KPI Card component ===== */
function KpiCard({ icon, label, value, color, bg, hint, onClick, active }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!onClick}
      style={{
        background: active
          ? `linear-gradient(135deg, ${color}, ${color}dd)`
          : bg,
        color: active ? "#fff" : color,
        border: active ? `2px solid ${color}` : "1px solid rgba(226,232,240,.95)",
        borderRadius: 16,
        padding: "14px 16px",
        textAlign: "start",
        cursor: onClick ? "pointer" : "default",
        boxShadow: active ? `0 12px 24px ${color}55` : "0 8px 18px rgba(2,6,23,.08)",
        transition: "transform .15s ease, box-shadow .15s ease",
        display: "flex",
        flexDirection: "column",
        gap: 4,
        minWidth: 140,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <span style={{ fontSize: 22 }}>{icon}</span>
        <span style={{ fontSize: 11, fontWeight: 900, letterSpacing: ".05em", textTransform: "uppercase", opacity: active ? 0.95 : 0.7 }}>{label}</span>
      </div>
      <div style={{ fontSize: 26, fontWeight: 1000, lineHeight: 1.1 }}>{value}</div>
      {hint && <div style={{ fontSize: 11, fontWeight: 800, opacity: active ? 0.95 : 0.7 }}>{hint}</div>}
    </button>
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
  btnAdd: { border: "1px solid rgba(22,163,74,.40)", background: "linear-gradient(180deg, rgba(34,197,94,1), rgba(22,163,74,1))", color: "#fff", borderRadius: 16, padding: "10px 14px", fontWeight: 1000, cursor: "pointer", boxShadow: "0 12px 24px rgba(22,163,74,.30)" },
  kpiGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
    gap: 10,
    marginBottom: 12,
  },
  filtersBar: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    flexWrap: "wrap",
    padding: "10px 14px",
    borderRadius: 16,
    background: "rgba(255,255,255,.92)",
    border: "1px solid rgba(226,232,240,.95)",
    boxShadow: "0 10px 24px rgba(2,6,23,.08)",
    marginBottom: 10,
    backdropFilter: "blur(10px)",
  },
  filterLabel: {
    fontWeight: 1000,
    color: "#0f172a",
    fontSize: 12,
    letterSpacing: ".03em",
  },
  filterCount: {
    fontSize: 12,
    color: "#475569",
    fontWeight: 800,
  },
  select: {
    border: "1px solid rgba(148,163,184,.55)",
    background: "linear-gradient(180deg,#fff,#f8fafc)",
    borderRadius: 999,
    padding: "7px 12px",
    fontWeight: 900,
    fontSize: 12,
    color: "#0f172a",
    cursor: "pointer",
    outline: "none",
  },
  pillDanger: {
    border: "1px solid rgba(220,38,38,.4)",
    background: "linear-gradient(180deg,#fee2e2,#fef2f2)",
    color: "#991b1b",
    borderRadius: 999,
    padding: "7px 12px",
    fontWeight: 1000,
    fontSize: 12,
    cursor: "pointer",
  },
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

  /* ✅ Edit modal */
  editBackdrop: {
    position: "fixed", inset: 0, zIndex: 10000,
    background: "rgba(2,6,23,.55)",
    display: "flex", alignItems: "center", justifyContent: "center",
    padding: 16,
    backdropFilter: "blur(4px)",
  },
  editModal: {
    width: "min(820px, 96vw)", maxHeight: "92vh",
    background: "#fff", borderRadius: 20,
    display: "flex", flexDirection: "column",
    overflow: "hidden",
    boxShadow: "0 30px 80px rgba(0,0,0,.45)",
    border: "1px solid rgba(226,232,240,.95)",
  },
  editHead: {
    display: "flex", alignItems: "center", justifyContent: "space-between",
    gap: 10, padding: "16px 22px",
    background: "linear-gradient(180deg, #0b1220, #1e293b)",
    color: "#fff",
    borderBottom: "1px solid rgba(226,232,240,.12)",
  },
  editTitle: { fontSize: 17, fontWeight: 1000, letterSpacing: ".02em" },
  editSubtitle: { fontSize: 12, fontWeight: 800, opacity: 0.78, marginTop: 4 },
  editCloseX: {
    border: "1px solid rgba(255,255,255,.22)",
    background: "rgba(255,255,255,.08)", color: "#fff",
    borderRadius: 999, width: 36, height: 36,
    cursor: "pointer", fontWeight: 1000, fontSize: 16,
  },
  editBody: {
    padding: "18px 22px", overflowY: "auto", flex: 1,
    background: "linear-gradient(180deg, #f8fafc, #ffffff)",
  },
  editGroup: { marginBottom: 18 },
  editGroupTitle: {
    fontSize: 13, fontWeight: 1000, color: "#0f172a",
    marginBottom: 10, paddingBottom: 6,
    borderBottom: "2px dashed rgba(148,163,184,.35)",
  },
  editGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
    gap: 12,
  },
  editInput: {
    width: "100%", boxSizing: "border-box",
    padding: "10px 14px", borderRadius: 12,
    border: "1.5px solid #e2e8f0",
    background: "#fff", outline: "none",
    fontWeight: 800, fontSize: 14,
    color: "#0f172a",
    transition: "border-color .15s, box-shadow .15s",
  },
  editFoot: {
    display: "flex", justifyContent: "flex-end", gap: 10,
    padding: "14px 22px",
    background: "#f8fafc",
    borderTop: "1px solid rgba(226,232,240,.95)",
  },
};