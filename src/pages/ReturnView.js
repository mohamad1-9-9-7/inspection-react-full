// src/pages/ReturnView.js
import React, { useEffect, useMemo, useState, useRef } from "react";

/* ========== Server API base (CRA style) ========== */
const API_BASE =
  process.env.REACT_APP_API_URL || "https://inspection-server-4nvj.onrender.com";

/* ===== Cloudinary via server (upload + delete) ===== */
async function uploadViaServer(file) {
  const fd = new FormData();
  fd.append("file", file);
  const res = await fetch(`${API_BASE}/api/images`, { method: "POST", body: fd });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.ok || !(data.optimized_url || data.url)) {
    throw new Error(data?.error || "Upload failed");
  }
  return data.optimized_url || data.url; // compressed URL if available
}
async function deleteImage(url) {
  if (!url) return;
  const res = await fetch(`${API_BASE}/api/images?url=${encodeURIComponent(url)}`, {
    method: "DELETE",
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data?.ok) throw new Error(data?.error || "Delete image failed");
}
async function deleteImagesMany(urls = []) {
  const unique = [...new Set((urls || []).filter(Boolean))];
  if (!unique.length) return { ok: true, deleted: 0, failed: 0 };
  const results = await Promise.allSettled(unique.map((u) => deleteImage(u)));
  const deleted = results.filter((r) => r.status === "fulfilled").length;
  return { ok: deleted === results.length, deleted, failed: results.length - deleted };
}
function collectImagesFromItems(items = []) {
  const all = [];
  for (const it of items) if (Array.isArray(it?.images)) for (const u of it.images) if (u) all.push(u);
  return [...new Set(all)];
}

async function fetchReturns() {
  const res = await fetch(API_BASE + "/api/reports?type=returns", { cache: "no-store" });
  if (!res.ok) throw new Error("Failed to fetch");
  const json = await res.json();
  return Array.isArray(json) ? json : (json && json.data ? json.data : []);
}

/* ========== Update a report on server (PUT only) ========== */
async function saveReportToServer(reportDate, items) {
  const payload = {
    reporter: "anonymous",
    type: "returns",
    payload: { reportDate, items, _clientSavedAt: Date.now() },
  };

  const attempts = [
    { url: `${API_BASE}/api/reports`, method: "PUT", body: JSON.stringify(payload) },
    {
      url: `${API_BASE}/api/reports/returns?reportDate=${encodeURIComponent(reportDate)}`,
      method: "PUT",
      body: JSON.stringify({ items, _clientSavedAt: payload.payload._clientSavedAt }),
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
      if (res.ok) {
        try {
          return await res.json();
        } catch {
          return { ok: true };
        }
      }
      lastErr = new Error(`${a.method} ${a.url} -> ${res.status} ${await res.text().catch(() => "")}`);
    } catch (e) {
      lastErr = e;
    }
  }
  throw lastErr || new Error("Save failed");
}

/* ========== Timestamps helpers for picking latest versions ========== */
function toTs(x) {
  if (!x) return null;
  if (typeof x === "number") return x;
  if (typeof x === "string" && /^[a-f0-9]{24}$/i.test(x)) {
    return parseInt(x.slice(0, 8), 16) * 1000;
  }
  const n = Date.parse(x);
  return Number.isFinite(n) ? n : null;
}
function newer(a, b) {
  const ta =
    toTs(a?.createdAt) ||
    toTs(a?.updatedAt) ||
    toTs(a?.timestamp) ||
    toTs(a?._id) ||
    toTs(a?.payload?._clientSavedAt) ||
    0;
  const tb =
    toTs(b?.createdAt) ||
    toTs(b?.updatedAt) ||
    toTs(b?.timestamp) ||
    toTs(b?._id) ||
    toTs(b?.payload?._clientSavedAt) ||
    0;
  return tb >= ta ? b : a;
}
function normalizeServerReturns(raw) {
  if (!Array.isArray(raw)) return [];
  const entries = raw
    .map((rec, idx) => {
      const payload = rec?.payload || rec || {};
      return {
        _idx: idx,
        createdAt: rec?.createdAt,
        updatedAt: rec?.updatedAt,
        timestamp: rec?.timestamp,
        _id: rec?._id,
        payload,
        reportDate: payload.reportDate || rec?.reportDate || "",
        items: Array.isArray(payload.items) ? payload.items : [],
      };
    })
    .filter((e) => e.reportDate);

  const latest = new Map();
  for (const e of entries) {
    const prev = latest.get(e.reportDate);
    latest.set(e.reportDate, prev ? newer(prev, e) : e);
  }

  return Array.from(latest.values())
    .map((e) => ({ reportDate: e.reportDate, items: e.items }))
    .sort((a, b) => (b.reportDate || "").localeCompare(a.reportDate || ""));
}

/* ========== Static lists ========== */
const ACTIONS = [
  "Use in production",
  "Condemnation",
  "Condemnation / Cooking",
  "Use in kitchen",
  "Send to market",
  "Disposed",
  "Separated expired shelf",
  "إجراء آخر...", // keep exact value for backward compatibility
];

/* Exact branches list you provided (value kept as-is for compatibility) */
const BRANCHES = [
  "QCS",
  "POS 6", "POS 7", "POS 10", "POS 11", "POS 14", "POS 15", "POS 16", "POS 17",
  "POS 18",
  "POS 19", "POS 21", "POS 24", "POS 25",
  "POS 26",
  "POS 31",
  "POS 34",
  "POS 35",
  "POS 36",
  "POS 37", "POS 38",
  "POS 41",
  "POS 42",
  "POS 43",
  "POS 44", "POS 45",
  "FTR 1",
  "FTR 2",
  "KMC",
  "KPS",
  "فرع آخر... / Other branch"
];

/* ========== Display/value helpers ========== */
function isOtherBranch(val) {
  const s = String(val || "").toLowerCase();
  return s.includes("other branch") || s.includes("فرع آخر");
}
function safeButchery(row) {
  return isOtherBranch(row?.butchery) ? row?.customButchery || "" : row?.butchery || "";
}
function actionText(row) {
  return row?.action === "إجراء آخر..." ? row?.customAction || "" : row?.action || "";
}
function itemKey(row) {
  return [
    (row?.itemCode || "").trim().toLowerCase(),
    (row?.productName || "").trim().toLowerCase(),
    (row?.origin || "").trim().toLowerCase(),
    (safeButchery(row) || "").trim().toLowerCase(),
    (row?.expiry || "").trim().toLowerCase(),
  ].join("|");
}

/* ========== Action-change log (type=returns_changes) on server ========== */
async function appendActionChange(reportDate, changeItem) {
  let existing = [];
  try {
    const res = await fetch(`${API_BASE}/api/reports?type=returns_changes`, { cache: "no-store" });
    if (res.ok) {
      const json = await res.json();
      const arr = Array.isArray(json) ? json : json?.data || [];
      const sameDay = arr.filter((r) => (r?.payload?.reportDate || r?.reportDate) === reportDate);
      if (sameDay.length) {
        sameDay.sort((a, b) =>
          (toTs(b?.updatedAt) || toTs(b?._id) || 0) - (toTs(a?.updatedAt) || toTs(a?._id) || 0)
        );
        const latest = sameDay[0];
        existing = Array.isArray(latest?.payload?.items) ? latest.payload.items : [];
      }
    }
  } catch { }
  const merged = [...existing, changeItem];
  const upsertPayload = {
    reporter: "anonymous",
    type: "returns_changes",
    payload: { reportDate, items: merged, _clientSavedAt: Date.now() },
  };
  await fetch(`${API_BASE}/api/reports`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(upsertPayload),
  });
}

/* ========= Images manager modal (per-row) ========= */
const MAX_IMAGES_PER_PRODUCT = 5;

function ImageManagerModal({ open, row, onClose, onAddImages, onRemoveImage, remaining }) {
  const [previewSrc, setPreviewSrc] = useState("");
  const inputRef = useRef(null);

  useEffect(() => {
    if (!open) setPreviewSrc("");
    const onEsc = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onEsc);
    return () => window.removeEventListener("keydown", onEsc);
  }, [open, onClose]);

  if (!open) return null;

  const handlePick = () => inputRef.current?.click();

  const handleFiles = async (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    const allowed = files.slice(0, remaining);

    const urls = [];
    for (const f of allowed) {
      try {
        const url = await uploadViaServer(f);
        urls.push(url);
      } catch (err) {
        console.error("upload failed:", err);
      }
    }
    if (urls.length) onAddImages(urls);
    e.target.value = "";
  };

  return (
    <div style={galleryBack} onClick={onClose}>
      <div style={galleryCard} onClick={(e) => e.stopPropagation()}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
          <div style={{ fontWeight: 900, fontSize: "1.05rem", color: "#0f172a" }}>
            🖼️ Product Images {row?.productName ? `— ${row.productName}` : ""}
          </div>
          <button onClick={onClose} style={galleryClose}>✕</button>
        </div>

        {previewSrc && (
          <div style={{ marginTop: 10, marginBottom: 8 }}>
            <img src={previewSrc} alt="preview" style={{ maxWidth: "100%", maxHeight: 700, borderRadius: 15, boxShadow: "0 6px 18px rgba(0,0,0,.2)" }} />
          </div>
        )}

        <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 10, marginBottom: 8 }}>
          <button onClick={handlePick} style={btnBlue} disabled={remaining === 0}>
            ⬆️ Upload images ({remaining} left)
          </button>
          <input ref={inputRef} type="file" accept="image/*" multiple onChange={handleFiles} style={{ display: "none" }} />
          <div style={{ fontSize: 13, color: "#334155" }}>Max {MAX_IMAGES_PER_PRODUCT} images per product.</div>
        </div>

        <div style={thumbsWrap}>
          {(row?.images || []).length === 0 ? (
            <div style={{ color: "#64748b" }}>No images yet.</div>
          ) : (
            row.images.map((src, i) => (
              <div key={i} style={thumbTile} title={`Image ${i + 1}`}>
                <img src={src} alt={`img-${i}`} style={thumbImg} onClick={() => setPreviewSrc(src)} />
                <button title="Remove" onClick={() => onRemoveImage(i)} style={thumbRemove}>✕</button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

export default function ReturnView() {
  const [reports, setReports] = useState([]);

  // Date filters
  const [filterFrom, setFilterFrom] = useState("");
  const [filterTo, setFilterTo] = useState("");

  // Selected date
  const [selectedDate, setSelectedDate] = useState("");

  // Tree open states
  const [openYears, setOpenYears] = useState({});
  const [openMonths, setOpenMonths] = useState({});

  // Status messages
  const [serverErr, setServerErr] = useState("");
  const [loadingServer, setLoadingServer] = useState(false);
  const [opMsg, setOpMsg] = useState("");

  // JSON import
  const importInputRef = useRef(null);

  // Row add/edit
  const [editRowIdx, setEditRowIdx] = useState(null);
  const [editRowData, setEditRowData] = useState(null);
  const [addingRow, setAddingRow] = useState(false);

  // Images modal state
  const [imageModalOpen, setImageModalOpen] = useState(false);
  const [imageRowIndex, setImageRowIndex] = useState(-1);

  /* ========== Load from server only ========== */
  async function reloadFromServer() {
    setServerErr("");
    setLoadingServer(true);
    try {
      const raw = await fetchReturns();
      const normalized = normalizeServerReturns(raw).sort((a, b) =>
        (b.reportDate || "").localeCompare(a.reportDate || "")
      );

      setReports(normalized);
      if (!selectedDate && normalized.length) setSelectedDate(normalized[0].reportDate);
    } catch (e) {
      setServerErr("Failed to fetch from server. (Server may be waking up).");
      console.error(e);
    } finally {
      setLoadingServer(false);
    }
  }

  useEffect(() => {
    reloadFromServer();
    // eslint-disable-next-line
  }, []);

  // Date helpers
  const parts = (dateStr) => {
    if (!dateStr || dateStr.length < 10) return { y: "", m: "", d: "" };
    return { y: dateStr.slice(0, 4), m: dateStr.slice(5, 7), d: dateStr.slice(8, 10) };
  };
  const monthKey = (dateStr) => {
    const p = parts(dateStr);
    const y = p.y, m = p.m;
    return y && m ? y + "-" + m : "";
  };
  const yearKey = (dateStr) => parts(dateStr).y || "";

  // Filter by date range
  const filteredReports = useMemo(() => {
    return reports.filter((r) => {
      const d = r.reportDate || "";
      if (filterFrom && d < filterFrom) return false;
      if (filterTo && d > filterTo) return false;
      return true;
    });
  }, [reports, filterFrom, filterTo]);

  // Keep selected date valid
  useEffect(() => {
    if (!filteredReports.length) {
      setSelectedDate("");
      return;
    }
    const stillExists = filteredReports.some((r) => r.reportDate === selectedDate);
    if (!stillExists) setSelectedDate(filteredReports[0].reportDate);
  }, [filteredReports, selectedDate]);

  // Selected report
  const selectedReportIndex = useMemo(
    () => filteredReports.findIndex((r) => r.reportDate === selectedDate),
    [filteredReports, selectedDate]
  );
  const selectedReport =
    selectedReportIndex >= 0 ? filteredReports[selectedReportIndex] : null;

  // KPIs
  const kpi = useMemo(() => {
    let totalItems = 0;
    let totalQty = 0;
    const byAction = {};
    filteredReports.forEach((rep) => {
      totalItems += (rep.items || []).length;
      (rep.items || []).forEach((it) => {
        totalQty += Number(it.quantity || 0);
        const action = it.action === "إجراء آخر..." ? it.customAction : it.action;
        if (action) byAction[action] = (byAction[action] || 0) + 1;
      });
    });
    return {
      totalReports: filteredReports.length,
      totalItems,
      totalQty,
      byAction,
    };
  }, [filteredReports]);

  const today = new Date().toISOString().slice(0, 10);
  const newReportsCount = filteredReports.filter((r) => r.reportDate === today).length;
  const showAlert = kpi.totalQty > 50 || filteredReports.length > 50;
  const alertMsg =
    kpi.totalQty > 50
      ? "⚠️ The total quantity of returns is very high!"
      : filteredReports.length > 50
      ? "⚠️ A large number of return reports in this period!"
      : "";

  // Hierarchical year → month → day
  const hierarchy = useMemo(() => {
    const years = new Map();
    filteredReports.forEach((rep) => {
      const y = yearKey(rep.reportDate);
      const mk = monthKey(rep.reportDate);
      const m = mk.slice(5, 7);
      if (!y || !m) return;
      if (!years.has(y)) years.set(y, new Map());
      const months = years.get(y);
      if (!months.has(m)) months.set(m, []);
      months.get(m).push(rep.reportDate);
    });
    years.forEach((months) => {
      months.forEach((days, m) => {
        days.sort((a, b) => b.localeCompare(a));
        months.set(m, days);
      });
    });
    const sortedYears = Array.from(years.keys()).sort((a, b) => b.localeCompare(a));
    return sortedYears.map((y) => {
      const months = years.get(y);
      const sortedMonths = Array.from(months.keys()).sort((a, b) => b.localeCompare(a));
      return { year: y, months: sortedMonths.map((m) => ({ month: m, days: months.get(m) })) };
    });
  }, [filteredReports]);

  /* ========== Row add/edit/delete logic ========== */
  const blankRow = {
    itemCode: "",
    productName: "",
    origin: "",
    butchery: "",
    customButchery: "",
    quantity: "",
    qtyType: "",
    customQtyType: "",
    expiry: "",
    remarks: "",
    action: ACTIONS[0],
    customAction: "",
    images: [],
  };

  const startAddRow = () => {
    if (!selectedReport) return;
    setAddingRow(true);
    setEditRowIdx((selectedReport.items || []).length);
    setEditRowData({ ...blankRow });
  };

  const startEditRow = (i) => {
    if (!selectedReport) return;
    const row = selectedReport.items[i];
    setAddingRow(false);
    setEditRowIdx(i);
    setEditRowData({
      itemCode: row.itemCode || "",
      productName: row.productName || "",
      origin: row.origin || "",
      butchery: row.butchery || "",
      customButchery: row.customButchery || "",
      quantity: row.quantity ?? "",
      qtyType: row.qtyType || "",
      customQtyType: row.customQtyType || "",
      expiry: row.expiry || "",
      remarks: row.remarks || "",
      action: row.action || "",
      customAction: row.customAction || "",
      images: Array.isArray(row.images) ? row.images : [],
    });
  };

  const cancelEditRow = () => {
    setAddingRow(false);
    setEditRowIdx(null);
    setEditRowData(null);
  };

  const prepareRowForSave = (row, existingImages = []) => {
    const qtyNum = Number(row.quantity);
    const customB = (row.customButchery || "").trim();
    const chosen = (row.butchery || "").trim();

    const butcheryLabel = (customB || isOtherBranch(chosen))
      ? "فرع آخر... / Other branch"
      : chosen;

    return {
      itemCode: (row.itemCode || "").trim(),
      productName: (row.productName || "").trim(),
      origin: (row.origin || "").trim(),
      butchery: butcheryLabel,
      customButchery: customB,
      quantity: Number.isFinite(qtyNum) && qtyNum > 0 ? qtyNum : 0,
      qtyType: (row.customQtyType || "").trim() ? "أخرى" : (row.qtyType || "").trim(),
      customQtyType: (row.customQtyType || "").trim(),
      expiry: (row.expiry || "").trim(),
      remarks: (row.remarks || "").trim(),
      action: row.action || "",
      customAction: row.action === "إجراء آخر..." ? (row.customAction || "").trim() : "",
      images: Array.isArray(row.images) ? row.images : existingImages,
    };
  };

  const saveRow = async () => {
    if (!selectedReport || editRowIdx === null || !editRowData) return;

    if (!editRowData.productName?.trim()) {
      setOpMsg("❌ Enter product name.");
      setTimeout(() => setOpMsg(""), 3000);
      return;
    }
    const qtyNum = Number(editRowData.quantity);
    if (!Number.isFinite(qtyNum) || qtyNum <= 0) {
      setOpMsg("❌ Enter a valid quantity (> 0).");
      setTimeout(() => setOpMsg(""), 3000);
      return;
    }
    if (isOtherBranch(editRowData.butchery) && !editRowData.customButchery?.trim()) {
      setOpMsg("❌ When choosing 'Other branch', please enter the branch name.");
      setTimeout(() => setOpMsg(""), 3500);
      return;
    }

    const currentItems = selectedReport.items || [];
    const existingImages = !addingRow && currentItems[editRowIdx] ? (currentItems[editRowIdx].images || []) : [];
    const prepared = prepareRowForSave(editRowData, existingImages);

    try {
      setOpMsg("⏳ Saving to server…");

      // Action-change log if changed
      let changedAction = false;
      let prevTxt = "";
      if (!addingRow && currentItems[editRowIdx]) {
        prevTxt = actionText(currentItems[editRowIdx]);
        const nextTxt = actionText(prepared);
        changedAction = prevTxt && prevTxt !== nextTxt;
      }

      let newItems;
      if (addingRow) newItems = [...currentItems, prepared];
      else newItems = currentItems.map((r, i) => (i === editRowIdx ? prepared : r));

      await saveReportToServer(selectedReport.reportDate, newItems);

      if (changedAction) {
        const changeItem = {
          key: itemKey(prepared),
          from: prevTxt,
          to: actionText(prepared),
          at: new Date().toISOString(),
        };
        await appendActionChange(selectedReport.reportDate, changeItem);
      }

      await reloadFromServer();
      cancelEditRow();
      setOpMsg("✅ Saved.");
    } catch (e) {
      console.error(e);
      setOpMsg("❌ Failed to save.");
    } finally {
      setTimeout(() => setOpMsg(""), 3000);
    }
  };

  const deleteRow = async (i) => {
    if (!selectedReport) return;
    const sure = window.confirm("Are you sure you want to delete this row?");
    if (!sure) return;

    try {
      setOpMsg("⏳ Deleting row images…");
      const row = (selectedReport.items || [])[i] || {};
      const urls = Array.isArray(row.images) ? row.images : [];
      await deleteImagesMany(urls);

      setOpMsg("⏳ Deleting row…");
      const currentItems = selectedReport.items || [];
      const newItems = currentItems.filter((_, idx) => idx !== i);
      await saveReportToServer(selectedReport.reportDate, newItems);
      await reloadFromServer();
      if (editRowIdx === i) cancelEditRow();
      setOpMsg("✅ Row deleted.");
    } catch (e) {
      console.error(e);
      setOpMsg("❌ Failed to delete row.");
    } finally {
      setTimeout(() => setOpMsg(""), 3000);
    }
  };

  /* ======= Images actions (persist directly) ======= */
  const openImagesFor = (i) => { setImageRowIndex(i); setImageModalOpen(true); };
  const closeImages = () => setImageModalOpen(false);

  const addImagesToRow = async (urls) => {
    if (!selectedReport || imageRowIndex < 0) return;
    try {
      const items = selectedReport.items || [];
      const row = items[imageRowIndex] || {};
      const cur = Array.isArray(row.images) ? row.images : [];
      const merged = [...cur, ...urls].slice(0, MAX_IMAGES_PER_PRODUCT);
      const newItems = items.map((r, i) => (i === imageRowIndex ? { ...r, images: merged } : r));
      setOpMsg("⏳ Updating images…");
      await saveReportToServer(selectedReport.reportDate, newItems);
      await reloadFromServer();
      setOpMsg("✅ Images updated.");
    } catch (e) {
      console.error(e);
      setOpMsg("❌ Failed to update images.");
    } finally {
      setTimeout(() => setOpMsg(""), 3000);
    }
  };

  const removeImageFromRow = async (imgIndex) => {
    if (!selectedReport || imageRowIndex < 0) return;
    try {
      const items = selectedReport.items || [];
      const row = items[imageRowIndex] || {};
      const cur = Array.isArray(row.images) ? [...row.images] : [];
      const url = cur[imgIndex];

      if (url) {
        setOpMsg("⏳ Removing image from storage…");
        try { await deleteImage(url); } catch (err) {
          console.warn("Storage delete failed; proceeding to unlink from report.", err);
        }
      }

      cur.splice(imgIndex, 1);
      const newItems = items.map((r, i) => (i === imageRowIndex ? { ...r, images: cur } : r));
      setOpMsg("⏳ Updating report…");
      await saveReportToServer(selectedReport.reportDate, newItems);
      await reloadFromServer();
      setOpMsg("✅ Image removed.");
    } catch (e) {
      console.error(e);
      setOpMsg("❌ Failed to remove image.");
    } finally {
      setTimeout(() => setOpMsg(""), 3000);
    }
  };

  /* ========== Delete selected day report from server ========== */
  const handleDeleteDay = async () => {
    if (!selectedReport) return;
    const d = selectedReport.reportDate;
    const sure = window.confirm(`Are you sure you want to permanently delete the report for ${d}?`);
    if (!sure) return;

    try {
      // 1) delete all images from storage
      const urls = collectImagesFromItems(selectedReport.items || []);
      setOpMsg("⏳ Deleting report images…");
      await deleteImagesMany(urls);

      // 2) delete report document
      setOpMsg("⏳ Deleting report from server…");
      const res = await fetch(
        `${API_BASE}/api/reports?type=returns&reportDate=${encodeURIComponent(d)}`,
        { method: "DELETE" }
      );
      const json = await res.json().catch(() => null);

      if (!res.ok) throw new Error(json?.error || res.statusText);

      if (json?.deleted === 0) {
        setOpMsg("ℹ️ Nothing to delete (it may already be deleted).");
      } else {
        await reloadFromServer();
        setSelectedDate("");
        setOpMsg("✅ Deleted this day's report from server.");
      }
    } catch (e) {
      console.error(e);
      setOpMsg("❌ Failed to delete report.");
    } finally {
      setTimeout(() => setOpMsg(""), 3000);
    }
  };

  /* ========== Export/Import JSON & PDF ========== */
  async function ensureJsPDF() {
    if (window.jspdf && window.jspdf.jsPDF) return window.jspdf.jsPDF;
    await new Promise((resolve, reject) => {
      const s = document.createElement("script");
      s.src = "https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js";
      s.onload = () => resolve();
      s.onerror = () => reject(new Error("Failed to load jsPDF"));
      document.head.appendChild(s);
    });
    return window.jspdf.jsPDF;
  }
  const handleExportPDF = async () => {
    if (!selectedReport) return;
    try {
      setOpMsg("⏳ Creating PDF…");
      const JsPDF = await ensureJsPDF();
      const doc = new JsPDF({ unit: "pt", format: "a4" });

      const marginX = 40;
      let y = 50;

      doc.setFont("helvetica", "bold");
      doc.setFontSize(16);
      doc.text("Returns Report", marginX, y);
      y += 18;
      doc.setFontSize(12);
      doc.setFont("helvetica", "normal");
      doc.text(`Date: ${selectedReport.reportDate}`, marginX, y);
      y += 20;

      // NOTE: PDF layout remains as before (without item code) to keep width stable
      const headers = [
        "SL",
        "PRODUCT",
        "ORIGIN",
        "BUTCHERY",
        "QTY",
        "QTY TYPE",
        "EXPIRY",
        "REMARKS",
        "ACTION",
      ];
      const colWidths = [28, 120, 70, 85, 45, 65, 65, 120, 95];
      const tableX = marginX;
      const rowH = 18;

      doc.setFillColor(219, 234, 254);
      doc.rect(tableX, y, colWidths.reduce((a, b) => a + b, 0), rowH, "F");
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);

      let x = tableX + 4;
      headers.forEach((h, idx) => {
        doc.text(h, x, y + 12);
        x += colWidths[idx];
      });
      y += rowH;

      doc.setFont("helvetica", "normal");

      const rows = selectedReport.items || [];
      rows.forEach((row, i) => {
        if (y > 780) {
          doc.addPage();
          y = 50;
        }
        const vals = [
          String(i + 1),
          row.productName || "",
          row.origin || "",
          safeButchery(row) || "",
          String(row.quantity ?? ""),
          row.qtyType === "أخرى" ? row.customQtyType || "" : row.qtyType || "",
          row.expiry || "",
          row.remarks || "",
          row.action === "إجراء آخر..." ? row.customAction || "" : row.action || "",
        ];
        doc.setDrawColor(182, 200, 227);
        doc.rect(tableX, y - 0.5, colWidths.reduce((a, b) => a + b, 0), rowH, "S");

        let xx = tableX + 4;
        vals.forEach((v, idx) => {
          const maxW = colWidths[idx] - 8;
          const text = doc.splitTextToSize(String(v), maxW);
          doc.text(text, xx, y + 12);
          xx += colWidths[idx];
        });
        y += rowH;
      });

      const fileName = `returns_${selectedReport.reportDate}.pdf`;
      doc.save(fileName);
      setOpMsg("✅ PDF created.");
    } catch (e) {
      console.error(e);
      setOpMsg("❌ Failed to create PDF (check connection).");
    } finally {
      setTimeout(() => setOpMsg(""), 3000);
    }
  };

  const handleExportJSON = () => {
    try {
      const blob = new Blob([JSON.stringify(reports, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "returns_all.json";
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      setOpMsg("✅ Exported all reports as JSON.");
    } catch (e) {
      console.error(e);
      setOpMsg("❌ Failed to export JSON.");
    } finally {
      setTimeout(() => setOpMsg(""), 3000);
    }
  };

  const handleImportClick = () => {
    if (importInputRef.current) importInputRef.current.click();
  };

  const handleImportJSON = async (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    try {
      setOpMsg("⏳ Importing JSON and saving to server…");
      const text = await file.text();
      const data = JSON.parse(text);
      if (!Array.isArray(data)) throw new Error("Invalid format: expected an array");
      for (const entry of data) {
        const d = entry && entry.reportDate;
        const items = entry && Array.isArray(entry.items) ? entry.items : [];
        if (!d) continue;
        await saveReportToServer(d, items);
      }
      await reloadFromServer();
      setOpMsg("✅ Import and save successful.");
    } catch (err) {
      console.error(err);
      setOpMsg("❌ Failed to import JSON. Check format.");
    } finally {
      if (importInputRef.current) importInputRef.current.value = "";
      setTimeout(() => setOpMsg(""), 4000);
    }
  };

  /* ======================== UI ======================== */
  const activeRow =
    selectedReport && imageRowIndex >= 0 ? selectedReport.items?.[imageRowIndex] : null;
  const remainingForActive =
    Math.max(0, MAX_IMAGES_PER_PRODUCT - (activeRow?.images?.length || 0));

  return (
    <div
      style={{
        fontFamily: "Cairo, sans-serif",
        padding: "2rem",
        background: "linear-gradient(180deg, #f7f2fb 0%, #f4f6fa 100%)",
        minHeight: "100vh",
        direction: "ltr",
        color: "#111",
      }}
    >
      <h2
        style={{
          textAlign: "center",
          color: "#1f2937",
          fontWeight: "bold",
          marginBottom: "1.2rem",
          letterSpacing: ".2px",
        }}
      >
        📋 All Saved Returns Reports
        {newReportsCount > 0 && (
          <span
            style={{
              marginLeft: 16,
              fontSize: "0.75em",
              color: "#b91c1c",
              background: "#fee2e2",
              borderRadius: "50%",
              padding: "4px 12px",
              fontWeight: "bold",
              verticalAlign: "top",
              boxShadow: "0 2px 6px #fee2e2",
            }}
          >
            🔴{newReportsCount}
          </span>
        )}
      </h2>

      {loadingServer && (
        <div style={{ textAlign: "center", marginBottom: 10, color: "#1f2937" }}>
          ⏳ Loading from server…
        </div>
      )}
      {serverErr && (
        <div style={{ textAlign: "center", marginBottom: 10, color: "#b91c1c" }}>
          {serverErr}
        </div>
      )}
      {opMsg && (
        <div
          style={{
            textAlign: "center",
            marginBottom: 10,
            color: opMsg.startsWith("❌") ? "#b91c1c" : "#065f46",
            fontWeight: 700,
          }}
        >
          {opMsg}
        </div>
      )}

      {/* KPIs */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
          gap: "1rem",
          marginBottom: 18,
        }}
      >
        <KpiCard title="Total Reports" value={kpi.totalReports} emoji="📦" accent="#111" />
        <KpiCard title="Total Items" value={kpi.totalItems} emoji="🔢" accent="#111" />
        <KpiCard title="Total Quantity" value={kpi.totalQty} accent="#111" />
        <KpiList title="Top Actions" entries={sortTop(kpi.byAction, 3)} color="#111" />
      </div>

      {showAlert && (
        <div
          style={{
            background: "#fff7ed",
            color: "#9a3412",
            border: "1.5px solid #f59e0b",
            fontWeight: "bold",
            borderRadius: 12,
            textAlign: "center",
            fontSize: "1.05em",
            marginBottom: 18,
            padding: "12px 10px",
            boxShadow: "0 2px 12px #fde68a",
          }}
        >
          {alertMsg}
        </div>
      )}

      {/* Controls + Export/Import */}
      <div
        style={{
          background: "#fff",
          borderRadius: 14,
          padding: "12px",
          marginBottom: 16,
          boxShadow: "0 2px 14px #e8daef66",
        }}
      >
        <div style={{ display: "flex", gap: 8, justifyContent: "center", flexWrap: "wrap" }}>
          <span style={{ fontWeight: 700 }}>Filter by report date:</span>
          <label>
            From:
            <input
              type="date"
              value={filterFrom}
              onChange={(e) => setFilterFrom(e.target.value)}
              style={dateInputStyle}
            />
          </label>
          <label>
            To:
            <input
              type="date"
              value={filterTo}
              onChange={(e) => setFilterTo(e.target.value)}
              style={dateInputStyle}
            />
          </label>
          {(filterFrom || filterTo) && (
            <button
              onClick={() => {
                setFilterFrom("");
                setFilterTo("");
              }}
              style={clearBtn}
            >
              🧹 Clear
            </button>
          )}

          <button onClick={handleExportJSON} style={jsonExportBtn}>
            ⬇️ Export JSON (all)
          </button>
          <button onClick={handleImportClick} style={jsonImportBtn}>
            ⬆️ Import JSON
          </button>
          <input
            ref={importInputRef}
            type="file"
            accept="application/json,.json"
            onChange={handleImportJSON}
            style={{ display: "none" }}
          />
        </div>
      </div>

      {/* Left (dates list) + Right (details) */}
      <div style={{ display: "flex", alignItems: "flex-start", gap: 16, minHeight: 420 }}>
        {/* Left */}
        <div style={leftTree}>
          {hierarchy.length === 0 && (
            <div style={{ textAlign: "center", padding: 60, color: "#6b7280", fontSize: "1.03em" }}>
              No saved return reports for the selected period.
            </div>
          )}

          {hierarchy.map(({ year, months }) => {
            const yOpen = !!openYears[year];
            const yearCount = months.reduce((acc, mo) => acc + mo.days.length, 0);
            return (
              <div key={year} style={treeSection}>
                <div
                  style={{ ...treeHeader, background: yOpen ? "#e0f2fe" : "#eff6ff", color: "#111" }}
                  onClick={() => setOpenYears((prev) => ({ ...prev, [year]: !prev[year] }))}
                >
                  <span>{yOpen ? "▼" : "►"} Year {year}</span>
                  <span style={{ color: "#111", fontWeight: 700 }}>{yearCount} day(s)</span>
                </div>

                {yOpen && (
                  <div style={{ padding: "6px 0 6px 0" }}>
                    {months.map(({ month, days }) => {
                      const key = year + "-" + month;
                      const mOpen = !!openMonths[key];
                      return (
                        <div key={key} style={{ margin: "4px 0 6px" }}>
                          <div
                            style={{
                              ...treeSubHeader,
                              background: mOpen ? "#f0f9ff" : "#ffffff",
                              color: "#111",
                            }}
                            onClick={() => setOpenMonths((prev) => ({ ...prev, [key]: !prev[key] }))}
                          >
                            <span>{mOpen ? "▾" : "▸"} Month {month}</span>
                            <span style={{ color: "#111" }}>{days.length} day(s)</span>
                          </div>

                          {mOpen && (
                            <div>
                              {days.map((d) => {
                                const isSelected = selectedDate === d;
                                return (
                                  <div
                                    key={d}
                                    style={{
                                      ...treeDay,
                                      background: isSelected ? "#e0f2fe" : "#fff",
                                      borderLeft: isSelected ? "5px solid #3b82f6" : "none",
                                      color: "#111",
                                    }}
                                    onClick={() => setSelectedDate(d)}
                                  >
                                    <div>📅 {d}</div>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Right */}
        <div style={rightPanel}>
          {selectedReport ? (
            <div>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  gap: 10,
                  marginBottom: 8,
                }}
              >
                <div style={{ fontWeight: "bold", color: "#111", fontSize: "1.2em" }}>
                  Returns Report Details ({selectedReport.reportDate})
                </div>
                <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                  <button
                    onClick={handleExportPDF}
                    style={{
                      background: "#111827",
                      color: "#fff",
                      border: "none",
                      borderRadius: 10,
                      padding: "8px 14px",
                      fontWeight: "bold",
                      cursor: "pointer",
                    }}
                  >
                    ⬇️ Export PDF
                  </button>
                  <button onClick={startAddRow} style={addRowBtn}>
                    ➕ Add Row
                  </button>
                  <button onClick={handleDeleteDay} style={deleteBtnMain}>
                    🗑️ Delete This Day Report
                  </button>
                </div>
              </div>

              <table style={detailTable}>
                <thead>
                  <tr style={{ background: "#dbeafe", color: "#111" }}>
                    <th style={th}>SL.NO</th>
                    <th style={th}>ITEM CODE</th>
                    <th style={th}>PRODUCT NAME</th>
                    <th style={th}>ORIGIN</th>
                    <th style={th}>BUTCHERY</th>
                    <th style={th}>QUANTITY</th>
                    <th style={th}>QTY TYPE</th>
                    <th style={th}>EXPIRY DATE</th>
                    <th style={th}>REMARKS</th>
                    <th style={th}>ACTION</th>
                    <th style={th}>ACTIONS</th>
                  </tr>
                </thead>
                <tbody>
                  {(selectedReport.items || []).map((row, i) => (
                    <tr key={i}>
                      <td style={td}>{i + 1}</td>

                      {/* ITEM CODE */}
                      <td style={td}>
                        {editRowIdx === i ? (
                          <input
                            style={{ ...cellInputStyle, minWidth: 120 }}
                            value={editRowData.itemCode}
                            onChange={(e) =>
                              setEditRowData((s) => ({ ...s, itemCode: e.target.value }))
                            }
                            placeholder="ITEM CODE"
                          />
                        ) : (
                          row.itemCode || ""
                        )}
                      </td>

                      {/* PRODUCT */}
                      <td style={td}>
                        {editRowIdx === i ? (
                          <input
                            style={cellInputStyle}
                            value={editRowData.productName}
                            onChange={(e) => setEditRowData((s) => ({ ...s, productName: e.target.value }))}
                            placeholder="PRODUCT NAME"
                          />
                        ) : (
                          row.productName
                        )}
                      </td>

                      {/* ORIGIN */}
                      <td style={td}>
                        {editRowIdx === i ? (
                          <input
                            style={cellInputStyle}
                            value={editRowData.origin}
                            onChange={(e) => setEditRowData((s) => ({ ...s, origin: e.target.value }))}
                            placeholder="ORIGIN"
                          />
                        ) : (
                          row.origin
                        )}
                      </td>

                      {/* BUTCHERY */}
                      <td style={td}>
                        {editRowIdx === i ? (
                          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", justifyContent: "center" }}>
                            <select
                              style={{ ...cellInputStyle, minWidth: 220 }}
                              value={editRowData.butchery}
                              onChange={(e) =>
                                setEditRowData((s) => ({ ...s, butchery: e.target.value }))
                              }
                            >
                              <option value="">— Select a branch —</option>
                              {BRANCHES.map((b) => (
                                <option key={b} value={b}>
                                  {isOtherBranch(b) ? "Other branch" : b}
                                </option>
                              ))}
                            </select>
                            {isOtherBranch(editRowData.butchery) && (
                              <input
                                style={{ ...cellInputStyle, minWidth: 220 }}
                                value={editRowData.customButchery}
                                onChange={(e) =>
                                  setEditRowData((s) => ({ ...s, customButchery: e.target.value }))
                                }
                                placeholder="Enter branch name"
                              />
                            )}
                          </div>
                        ) : (
                          safeButchery(row)
                        )}
                      </td>

                      {/* QUANTITY */}
                      <td style={td}>
                        {editRowIdx === i ? (
                          <input
                            style={{ ...cellInputStyle, minWidth: 100 }}
                            type="number"
                            min="0"
                            value={editRowData.quantity}
                            onChange={(e) => setEditRowData((s) => ({ ...s, quantity: e.target.value }))}
                            placeholder="QUANTITY"
                          />
                        ) : (
                          row.quantity
                        )}
                      </td>

                      {/* QTY TYPE */}
                      <td style={td}>
                        {editRowIdx === i ? (
                          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", justifyContent: "center" }}>
                            <input
                              style={{ ...cellInputStyle, minWidth: 120 }}
                              value={editRowData.qtyType}
                              onChange={(e) => setEditRowData((s) => ({ ...s, qtyType: e.target.value }))}
                              placeholder="QTY TYPE"
                            />
                            <input
                              style={{ ...cellInputStyle, minWidth: 160 }}
                              value={editRowData.customQtyType}
                              onChange={(e) =>
                                setEditRowData((s) => ({ ...s, customQtyType: e.target.value }))
                              }
                              placeholder='Custom QTY TYPE (enables "Other")'
                            />
                          </div>
                        ) : row.qtyType === "أخرى" ? (
                          row.customQtyType
                        ) : (
                          row.qtyType || ""
                        )}
                      </td>

                      {/* EXPIRY */}
                      <td style={td}>
                        {editRowIdx === i ? (
                          <input
                            style={cellInputStyle}
                            value={editRowData.expiry}
                            onChange={(e) => setEditRowData((s) => ({ ...s, expiry: e.target.value }))}
                            placeholder="YYYY-MM-DD"
                          />
                        ) : (
                          row.expiry
                        )}
                      </td>

                      {/* REMARKS */}
                      <td style={td}>
                        {editRowIdx === i ? (
                          <input
                            style={cellInputStyle}
                            value={editRowData.remarks}
                            onChange={(e) => setEditRowData((s) => ({ ...s, remarks: e.target.value }))}
                            placeholder="REMARKS"
                          />
                        ) : (
                          row.remarks
                        )}
                      </td>

                      {/* ACTION */}
                      <td style={td}>
                        {editRowIdx === i ? (
                          <div>
                            <select
                              value={editRowData.action}
                              onChange={(e) => setEditRowData((s) => ({ ...s, action: e.target.value }))}
                              style={cellInputStyle}
                            >
                              {ACTIONS.map((act) => (
                                <option value={act} key={act}>
                                  {act === "إجراء آخر..." ? "Other action..." : act}
                                </option>
                              ))}
                            </select>
                            {editRowData.action === "إجراء آخر..." && (
                              <input
                                value={editRowData.customAction}
                                onChange={(e) =>
                                  setEditRowData((s) => ({ ...s, customAction: e.target.value }))
                                }
                                placeholder="Specify action…"
                                style={{ ...cellInputStyle, marginTop: 6 }}
                              />
                            )}
                          </div>
                        ) : row.action === "إجراء آخر..." ? (
                          row.customAction
                        ) : (
                          row.action
                        )}
                      </td>

                      {/* ROW BUTTONS */}
                      <td style={td}>
                        {editRowIdx === i ? (
                          <div style={{ display: "flex", gap: 6, justifyContent: "center", flexWrap: "wrap" }}>
                            <button onClick={saveRow} style={saveBtn}>Save</button>
                            <button onClick={cancelEditRow} style={cancelBtn}>Cancel</button>
                            <button
                              onClick={() => openImagesFor(i)}
                              style={imageBtn}
                              title="Manage images"
                            >
                              🖼️ Images ({row.images?.length || 0}/{MAX_IMAGES_PER_PRODUCT})
                            </button>
                          </div>
                        ) : (
                          <div style={{ display: "flex", gap: 6, justifyContent: "center", flexWrap: "wrap" }}>
                            <button onClick={() => startEditRow(i)} style={editBtn}>✏️ Edit</button>
                            <button onClick={() => deleteRow(i)} style={rowDeleteBtn}>🗑️ Delete</button>
                            <button
                              onClick={() => openImagesFor(i)}
                              style={imageBtn}
                              title="Manage images"
                            >
                              🖼️ Images ({row.images?.length || 0}/{MAX_IMAGES_PER_PRODUCT})
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}

                  {/* New row when adding */}
                  {addingRow && editRowIdx === (selectedReport.items || []).length && (
                    <tr>
                      <td style={td}>{(selectedReport.items || []).length + 1}</td>

                      {/* ITEM CODE (new) */}
                      <td style={td}>
                        <input
                          style={{ ...cellInputStyle, minWidth: 120 }}
                          value={editRowData.itemCode}
                          onChange={(e) => setEditRowData((s) => ({ ...s, itemCode: e.target.value }))}
                          placeholder="ITEM CODE"
                        />
                      </td>

                      <td style={td}>
                        <input
                          style={cellInputStyle}
                          value={editRowData.productName}
                          onChange={(e) => setEditRowData((s) => ({ ...s, productName: e.target.value }))}
                          placeholder="PRODUCT NAME"
                        />
                      </td>
                      <td style={td}>
                        <input
                          style={cellInputStyle}
                          value={editRowData.origin}
                          onChange={(e) => setEditRowData((s) => ({ ...s, origin: e.target.value }))}
                          placeholder="ORIGIN"
                        />
                      </td>
                      <td style={td}>
                        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", justifyContent: "center" }}>
                          <select
                            style={{ ...cellInputStyle, minWidth: 220 }}
                            value={editRowData.butchery}
                            onChange={(e) =>
                              setEditRowData((s) => ({ ...s, butchery: e.target.value }))
                            }
                          >
                            <option value="">— Select a branch —</option>
                            {BRANCHES.map((b) => (
                              <option key={b} value={b}>
                                {isOtherBranch(b) ? "Other branch" : b}
                              </option>
                            ))}
                          </select>
                          {isOtherBranch(editRowData.butchery) && (
                            <input
                              style={{ ...cellInputStyle, minWidth: 220 }}
                              value={editRowData.customButchery}
                              onChange={(e) =>
                                setEditRowData((s) => ({ ...s, customButchery: e.target.value }))
                              }
                              placeholder="Enter branch name"
                            />
                          )}
                        </div>
                      </td>
                      <td style={td}>
                        <input
                          style={{ ...cellInputStyle, minWidth: 100 }}
                          type="number"
                          min="0"
                          value={editRowData.quantity}
                          onChange={(e) => setEditRowData((s) => ({ ...s, quantity: e.target.value }))}
                          placeholder="QUANTITY"
                        />
                      </td>
                      <td style={td}>
                        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", justifyContent: "center" }}>
                          <input
                            style={{ ...cellInputStyle, minWidth: 120 }}
                            value={editRowData.qtyType}
                            onChange={(e) => setEditRowData((s) => ({ ...s, qtyType: e.target.value }))}
                            placeholder="QTY TYPE"
                          />
                          <input
                            style={{ ...cellInputStyle, minWidth: 160 }}
                            value={editRowData.customQtyType}
                            onChange={(e) =>
                              setEditRowData((s) => ({ ...s, customQtyType: e.target.value }))
                            }
                            placeholder='Custom QTY TYPE (enables "Other")'
                          />
                        </div>
                      </td>
                      <td style={td}>
                        <input
                          style={cellInputStyle}
                          value={editRowData.expiry}
                          onChange={(e) => setEditRowData((s) => ({ ...s, expiry: e.target.value }))}
                          placeholder="YYYY-MM-DD"
                        />
                      </td>
                      <td style={td}>
                        <input
                          style={cellInputStyle}
                          value={editRowData.remarks}
                          onChange={(e) => setEditRowData((s) => ({ ...s, remarks: e.target.value }))}
                          placeholder="REMARKS"
                        />
                      </td>
                      <td style={td}>
                        <div>
                          <select
                            value={editRowData.action}
                            onChange={(e) => setEditRowData((s) => ({ ...s, action: e.target.value }))}
                            style={cellInputStyle}
                          >
                            {ACTIONS.map((act) => (
                              <option value={act} key={act}>
                                {act === "إجراء آخر..." ? "Other action..." : act}
                              </option>
                            ))}
                          </select>
                          {editRowData.action === "إجراء آخر..." && (
                            <input
                              value={editRowData.customAction}
                              onChange={(e) =>
                                setEditRowData((s) => ({ ...s, customAction: e.target.value }))
                              }
                              placeholder="Specify action…"
                              style={{ ...cellInputStyle, marginTop: 6 }}
                            />
                          )}
                        </div>
                      </td>
                      <td style={td}>
                        <div style={{ display: "flex", gap: 6, justifyContent: "center", flexWrap: "wrap" }}>
                          <button onClick={saveRow} style={saveBtn}>Save</button>
                          <button onClick={cancelEditRow} style={cancelBtn}>Cancel</button>
                          <button
                            onClick={() => openImagesFor(editRowIdx)}
                            style={imageBtn}
                            title="Manage images"
                          >
                            🖼️ Images ({editRowData.images?.length || 0}/{MAX_IMAGES_PER_PRODUCT})
                          </button>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          ) : (
            <div style={{ textAlign: "center", color: "#6b7280", padding: 80, fontSize: "1.05em" }}>
              Select a date from the list to view its details.
            </div>
          )}
        </div>
      </div>

      {/* Images modal */}
      <ImageManagerModal
        open={imageModalOpen}
        row={activeRow}
        onClose={closeImages}
        onAddImages={addImagesToRow}
        onRemoveImage={removeImageFromRow}
        remaining={remainingForActive}
      />
    </div>
  );
}

/* ========== Small components + styles ========== */
function KpiCard({ title, value, emoji, accent = "#111" }) {
  return (
    <div
      style={{
        background: "#fff",
        borderRadius: 16,
        padding: "1rem 1.2rem",
        textAlign: "center",
        boxShadow: "0 2px 12px #e8daef66",
        color: "#111",
      }}
    >
      {emoji && <div style={{ fontSize: 26, marginBottom: 6 }}>{emoji}</div>}
      <div style={{ fontWeight: "bold", marginBottom: 4 }}>{title}</div>
      <div style={{ fontSize: "1.7em", fontWeight: 800, color: accent }}>{value}</div>
    </div>
  );
}
function KpiList({ title, entries = [], color = "#111" }) {
  return (
    <div
      style={{
        background: "#fff",
        borderRadius: 16,
        padding: "1rem 1.2rem",
        boxShadow: "0 2px 12px #e8daef66",
        color: "#111",
      }}
    >
      <div style={{ fontWeight: "bold", marginBottom: 6 }}>{title}</div>
      {entries.length === 0 ? (
        <div style={{ color: "#6b7280" }}>—</div>
      ) : (
        entries.map(([k, v]) => (
          <div key={k} style={{ display: "flex", justifyContent: "space-between" }}>
            <span>{k}</span>
            <b style={{ color }}>{v}</b>
          </div>
        ))
      )}
    </div>
  );
}
function TabButton({ active, onClick, label }) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: "8px 16px",
        borderRadius: 12,
        border: "1px solid #bfdbfe",
        cursor: "pointer",
        fontWeight: 800,
        background: active ? "#60a5fa" : "#ffffff",
        color: active ? "#111" : "#111",
        boxShadow: active ? "0 2px 8px #bfdbfe" : "none",
        minWidth: 120,
      }}
    >
      {label}
    </button>
  );
}

/* Helpers / styles */
function sortTop(obj, n) {
  return Object.entries(obj)
    .sort((a, b) => b[1] - a[1])
    .slice(0, n);
}

const leftTree = {
  minWidth: 280,
  background: "#fff",
  borderRadius: 12,
  boxShadow: "0 1px 10px #e8daef66",
  padding: "6px 0",
  border: "1px solid #e5e7eb",
  maxHeight: "70vh",
  overflow: "auto",
  color: "#111",
};
const treeSection = { marginBottom: 4 };
const treeHeader = {
  display: "flex",
  justifyContent: "space-between",
  padding: "10px 14px",
  cursor: "pointer",
  fontWeight: 800,
  color: "#111",
  borderBottom: "1px solid #e5e7eb",
};
const treeSubHeader = {
  display: "flex",
  justifyContent: "space-between",
  padding: "8px 14px",
  cursor: "pointer",
  color: "#111",
  borderBottom: "1px dashed #e5e7eb",
};
const treeDay = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  padding: "8px 14px",
  cursor: "pointer",
  borderBottom: "1px dashed #e5e7eb",
  fontSize: "0.98em",
  color: "#111",
};

const rightPanel = {
  flex: 1,
  background: "#fff",
  borderRadius: 15,
  boxShadow: "0 1px 12px #e8daef44",
  minHeight: 320,
  padding: "25px 28px",
  marginLeft: 0,
  color: "#111",
};

const detailTable = {
  width: "100%",
  background: "#fff",
  borderRadius: 8,
  borderCollapse: "collapse",
  border: "1px solid #b6c8e3",
  marginTop: 6,
  minWidth: 950,
  color: "#111",
};
const th = {
  padding: "10px 8px",
  textAlign: "center",
  fontSize: "0.98em",
  fontWeight: "bold",
  border: "1px solid #b6c8e3",
  background: "#dbeafe",
  color: "#111",
};
const td = {
  padding: "9px 8px",
  textAlign: "center",
  minWidth: 90,
  border: "1px solid #b6c8e3",
  background: "#eef6ff",
  color: "#111",
};

const cellInputStyle = {
  padding: "6px 8px",
  borderRadius: 6,
  border: "1px solid #b6c8e3",
  background: "#eef6ff",
  color: "#111",
  minWidth: 140,
};

const dateInputStyle = {
  borderRadius: 8,
  border: "1.5px solid #93c5fd",
  background: "#eff6ff",
  padding: "7px 13px",
  fontSize: "1em",
  minWidth: 120,
  color: "#111",
};
const clearBtn = {
  background: "#3b82f6",
  color: "#fff",
  border: "none",
  borderRadius: 10,
  padding: "7px 18px",
  fontWeight: "bold",
  fontSize: "1em",
  cursor: "pointer",
  boxShadow: "0 1px 6px #bfdbfe",
};
const saveBtn = {
  marginLeft: 5,
  background: "#10b981",
  color: "#fff",
  border: "none",
  borderRadius: 6,
  padding: "2px 9px",
  fontWeight: "bold",
  cursor: "pointer",
};
const cancelBtn = {
  background: "#9ca3af",
  color: "#fff",
  border: "none",
  borderRadius: 6,
  padding: "2px 8px",
  marginLeft: 4,
  fontWeight: "bold",
  cursor: "pointer",
};
const editBtn = {
  background: "#3b82f6",
  color: "#fff",
  border: "none",
  borderRadius: 8,
  fontSize: 15,
  padding: "2px 8px",
  cursor: "pointer",
};
const imageBtn = {
  background: "#2563eb",
  color: "#fff",
  border: "none",
  borderRadius: 8,
  fontSize: 14,
  padding: "4px 10px",
  cursor: "pointer",
  boxShadow: "0 1px 6px #bfdbfe",
};
const deleteBtnMain = {
  background: "#dc2626",
  color: "#fff",
  border: "none",
  borderRadius: 10,
  padding: "8px 14px",
  fontWeight: "bold",
  cursor: "pointer",
  boxShadow: "0 1px 6px #fecaca",
};
const jsonExportBtn = {
  background: "#0f766e",
  color: "#fff",
  border: "none",
  borderRadius: 10,
  padding: "7px 18px",
  fontWeight: "bold",
  fontSize: "1em",
  cursor: "pointer",
  boxShadow: "0 1px 6px #99f6e4",
};
const jsonImportBtn = {
  background: "#7c3aed",
  color: "#fff",
  border: "none",
  borderRadius: 10,
  padding: "7px 18px",
  fontWeight: "bold",
  fontSize: "1em",
  cursor: "pointer",
  boxShadow: "0 1px 6px #c4b5fd",
};
const addRowBtn = {
  background: "#2563eb",
  color: "#fff",
  border: "none",
  borderRadius: 10,
  padding: "8px 14px",
  fontWeight: "bold",
  cursor: "pointer",
  boxShadow: "0 1px 6px #bfdbfe",
};
const rowDeleteBtn = {
  background: "#ef4444",
  color: "#fff",
  border: "none",
  borderRadius: 8,
  fontSize: 15,
  padding: "2px 8px",
  cursor: "pointer",
};

/* ====== Gallery modal styles ====== */
const galleryBack = {
  position: "fixed",
  inset: 0,
  background: "rgba(15,23,42,.35)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  zIndex: 999,
};
const galleryCard = {
  width: "min(1400px, 1000vw)",
  maxHeight: "400vh",
  overflow: "auto",
  background: "#fff",
  color: "#111",
  borderRadius: 14,
  border: "1px solid #e5e7eb",
  padding: "14px 16px",
  boxShadow: "0 12px 32px rgba(0,0,0,.25)",
};
const galleryClose = {
  background: "transparent",
  border: "none",
  color: "#111",
  fontWeight: 900,
  cursor: "pointer",
  fontSize: 18,
};
const btnBlue = {
  background: "#2563eb",
  color: "#fff",
  border: "none",
  borderRadius: 10,
  padding: "8px 14px",
  fontWeight: "bold",
  cursor: "pointer",
  boxShadow: "0 1px 6px #bfdbfe",
};
const thumbsWrap = {
  marginTop: 8,
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))",
  gap: 10,
};
const thumbTile = {
  position: "relative",
  border: "1px solid #e5e7eb",
  borderRadius: 10,
  overflow: "hidden",
  background: "#f8fafc",
};
const thumbImg = {
  width: "100%",
  height: 150,
  objectFit: "cover",
  display: "block",
};
const thumbRemove = {
  position: "absolute",
  top: 6,
  right: 6,
  background: "#ef4444",
  color: "#fff",
  border: "none",
  borderRadius: 8,
  padding: "2px 8px",
  fontWeight: 800,
  cursor: "pointer",
};
