// src/pages/CustomerReturnView.js
import React, { useEffect, useMemo, useRef, useState } from "react";

// API base
const API_BASE = process.env.REACT_APP_API_URL || "https://inspection-server-4nvj.onrender.com";

/* ========== Fetch (type=returns_customers) ========== */
async function fetchReports() {
  const res = await fetch(API_BASE + "/api/reports?type=returns_customers", { cache: "no-store" });
  if (!res.ok) throw new Error("Failed to fetch");
  const json = await res.json();
  return Array.isArray(json) ? json : (json && json.data ? json.data : []);
}

/* ========== Update via PUT (type=returns_customers) ========== */
async function saveReportToServer(reportDate, items) {
  const payload = {
    reporter: "anonymous",
    type: "returns_customers",
    payload: { reportDate, items, _clientSavedAt: Date.now() },
  };

  const attempts = [
    { url: `${API_BASE}/api/reports`, method: "PUT", body: JSON.stringify(payload) },
    {
      url: `${API_BASE}/api/reports/returns_customers?reportDate=${encodeURIComponent(reportDate)}`,
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

/* ========== Helpers for latest-by-day ========== */
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
function normalize(raw) {
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

/* ========== Action-change log (type=returns_customers_changes) ========== */
async function appendActionChange(reportDate, changeItem) {
  let existing = [];
  try {
    const res = await fetch(`${API_BASE}/api/reports?type=returns_customers_changes`, { cache: "no-store" });
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
    type: "returns_customers_changes",
    payload: { reportDate, items: merged, _clientSavedAt: Date.now() },
  };
  await fetch(`${API_BASE}/api/reports`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(upsertPayload),
  });
}

/* ========= Images manager modal (per-row) with compression ========= */
const MAX_IMAGES_PER_PRODUCT = 5;

// compress to max 1280px (longest) and ~80% quality, output JPEG dataURL
async function compressImage(file) {
  const fileDataURL = await new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result);
    r.onerror = reject;
    r.readAsDataURL(file);
  });

  const img = await new Promise((resolve, reject) => {
    const im = new Image();
    im.onload = () => resolve(im);
    im.onerror = reject;
    im.src = fileDataURL;
  });

  const maxSide = 1280;
  let { width, height } = img;
  const scale = Math.min(1, maxSide / Math.max(width, height));
  const w = Math.round(width * scale);
  const h = Math.round(height * scale);

  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  ctx.drawImage(img, 0, 0, w, h);
  const out = canvas.toDataURL("image/jpeg", 0.8);
  return out;
}

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
    const b64s = [];
    for (const f of allowed) {
      try {
        const b = await compressImage(f);
        b64s.push(b);
      } catch (err) {
        console.error("Compress failed, using original", err);
        const fb = await new Promise((resolve, reject) => {
          const r = new FileReader(); r.onload = () => resolve(r.result); r.onerror = reject; r.readAsDataURL(f);
        });
        b64s.push(fb);
      }
    }
    onAddImages(b64s);
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
            <img src={previewSrc} alt="preview" style={thumbBig} />
          </div>
        )}

        <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 10, marginBottom: 8 }}>
          <button onClick={handlePick} style={btnBlue} disabled={remaining === 0}>
            ⬆️ Upload images ({remaining} left)
          </button>
          <input ref={inputRef} type="file" accept="image/*" multiple onChange={handleFiles} style={{ display: "none" }} />
          <div style={{ fontSize: 13, color: "#334155" }}>Max {MAX_IMAGES_PER_PRODUCT} images per product. (auto-compressed)</div>
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

/* ========== Page ========== */
export default function CustomerReturnView() {
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

  async function reloadFromServer() {
    setServerErr("");
    setLoadingServer(true);
    try {
      const raw = await fetchReports();
      const normalized = normalize(raw).sort((a, b) =>
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
  }, []);

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
        const action = it.action === "Other..." ? it.customAction : it.action;
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
    productName: "",
    origin: "",
    customerName: "",
    quantity: "",
    qtyType: "",
    customQtyType: "",
    expiry: "",
    remarks: "",
    action: "Use in production",
    customAction: "",
    images: [],
  };

  const ACTIONS = [
    "Use in production",
    "Condemnation",
    "Use in kitchen",
    "Send to market",
    "Separated expired shelf",
    "Other...",
  ];

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
      productName: row.productName || "",
      origin: row.origin || "",
      customerName: row.customerName || "",
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
    return {
      productName: (row.productName || "").trim(),
      origin: (row.origin || "").trim(),
      customerName: (row.customerName || "").trim(),
      quantity: Number.isFinite(qtyNum) && qtyNum > 0 ? qtyNum : 0,
      qtyType: (row.customQtyType || "").trim() ? "Other" : (row.qtyType || "").trim(),
      customQtyType: (row.customQtyType || "").trim(),
      expiry: (row.expiry || "").trim(),
      remarks: (row.remarks || "").trim(),
      action: row.action || "",
      customAction: row.action === "Other..." ? (row.customAction || "").trim() : "",
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
    if (!editRowData.customerName?.trim()) {
      setOpMsg("❌ Enter customer name.");
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
        prevTxt = (currentItems[editRowIdx].action === "Other..." ? currentItems[editRowIdx].customAction : currentItems[editRowIdx].action) || "";
        const nextTxt = (prepared.action === "Other..." ? prepared.customAction : prepared.action) || "";
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
          to: (prepared.action === "Other..." ? prepared.customAction : prepared.action) || "",
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

  const addImagesToRow = async (b64s) => {
    if (!selectedReport || imageRowIndex < 0) return;
    try {
      const items = selectedReport.items || [];
      const row = items[imageRowIndex] || {};
      const cur = Array.isArray(row.images) ? row.images : [];
      const merged = [...cur, ...b64s].slice(0, MAX_IMAGES_PER_PRODUCT);
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
      cur.splice(imgIndex, 1);
      const newItems = items.map((r, i) => (i === imageRowIndex ? { ...r, images: cur } : r));
      setOpMsg("⏳ Removing image…");
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
      setOpMsg("⏳ Deleting report from server…");
      const res = await fetch(
        `${API_BASE}/api/reports?type=returns_customers&reportDate=${encodeURIComponent(d)}`,
        { method: "DELETE" }
      );
      const json = await res.json().catch(() => null);

      if (!res.ok) {
        throw new Error(json?.error || res.statusText);
      }
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
      doc.text("Customer Returns Report", marginX, y);
      y += 18;
      doc.setFontSize(12);
      doc.setFont("helvetica", "normal");
      doc.text(`Date: ${selectedReport.reportDate}`, marginX, y);
      y += 20;

      const headers = [
        "SL",
        "PRODUCT",
        "ORIGIN",
        "CUSTOMER",
        "QTY",
        "QTY TYPE",
        "EXPIRY",
        "REMARKS",
        "ACTION",
      ];
      const colWidths = [28, 120, 70, 120, 45, 65, 65, 120, 95];
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
          row.customerName || "",
          String(row.quantity ?? ""),
          row.qtyType === "Other" ? row.customQtyType || "" : row.qtyType || "",
          row.expiry || "",
          row.remarks || "",
          row.action === "Other..." ? row.customAction || "" : row.action || "",
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

      const fileName = `customer_returns_${selectedReport.reportDate}.pdf`;
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
      a.download = "customer_returns_all.json";
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      setOpMsg("✅ JSON exported.");
    } catch (e) {
      console.error(e);
      setOpMsg("❌ Failed to export JSON.");
    } finally {
      setTimeout(() => setOpMsg(""), 3000);
    }
  };

  const handleImportJSON = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const arr = JSON.parse(reader.result);
        if (!Array.isArray(arr)) throw new Error("Invalid JSON");
        // Save each day to server
        for (const r of arr) {
          const d = r?.reportDate;
          const items = Array.isArray(r?.items) ? r.items : [];
          if (!d) continue;
          await saveReportToServer(d, items);
        }
        await reloadFromServer();
        setOpMsg("✅ Imported and saved to server.");
      } catch (err) {
        console.error(err);
        setOpMsg("❌ Failed to import JSON.");
      } finally {
        e.target.value = "";
        setTimeout(() => setOpMsg(""), 3000);
      }
    };
    reader.onerror = () => {
      setOpMsg("❌ Failed to read file.");
      e.target.value = "";
      setTimeout(() => setOpMsg(""), 3000);
    };
    reader.readAsText(file);
  };

  // itemKey
  function itemKey(row) {
    return [
      (row?.productName || "").trim().toLowerCase(),
      (row?.origin || "").trim().toLowerCase(),
      (row?.customerName || "").trim().toLowerCase(),
      (row?.expiry || "").trim().toLowerCase(),
    ].join("|");
  }

  // Column width helpers for clearer layout
  const col = {
    sl: { width: 56, minWidth: 56, textAlign: "center" },
    product: { width: 180, minWidth: 180 },
    origin: { width: 110, minWidth: 110 },
    customer: { width: 180, minWidth: 180 },
    qty: { width: 80, minWidth: 80, textAlign: "center" },
    qtyType: { width: 110, minWidth: 110 },
    expiry: { width: 110, minWidth: 110, textAlign: "center" },
    remarks: { width: 220, minWidth: 220 },
    action: { width: 150, minWidth: 150 },
    images: { width: 110, minWidth: 110, textAlign: "center" },
    ops: { width: 86, minWidth: 86, textAlign: "center" },
  };

  return (
    <div style={{ fontFamily: "Cairo, sans-serif", direction: "rtl", padding: 16 }}>
      <div style={{ display: "flex", gap: 8, alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
        <div style={{ fontWeight: 900, fontSize: "1.2rem", color: "#111827" }}>👤 Customer Returns</div>
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={handleExportJSON} style={btnGray}>⬇️ Export JSON (all)</button>
          <button onClick={() => importInputRef.current?.click()} style={btnGray}>⬆️ Import JSON (save to server)</button>
          <button onClick={handleExportPDF} style={btnBlue}>🧾 Export PDF (selected day)</button>
        </div>
        <input type="file" accept="application/json" ref={importInputRef} style={{ display: "none" }} onChange={handleImportJSON} />
      </div>

      <div style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 10 }}>
        <div>From:</div>
        <input type="date" value={filterFrom} onChange={(e)=>setFilterFrom(e.target.value)} style={dateInp}/>
        <div>To:</div>
        <input type="date" value={filterTo} onChange={(e)=>setFilterTo(e.target.value)} style={dateInp}/>
        <div style={{ marginInlineStart: "auto", fontSize: 13, color: "#334155" }}>
          {loadingServer ? "⏳ Loading…" : serverErr ? serverErr : opMsg}
        </div>
      </div>

      {/* Year -> Month -> Day tree */}
      <div style={{ display: "flex", gap: 12 }}>
        <div style={{ minWidth: 260 }}>
          {hierarchy.map((y) => (
            <div key={y.year} style={treeSection}>
              <div style={treeYear} onClick={()=>setOpenYears(p=>({...p,[y.year]:!p[y.year]}))}>
                <span>{openYears[y.year] ? "▼" : "▶"}</span>
                <b style={{ marginInlineStart: 6 }}>{y.year}</b>
              </div>
              {openYears[y.year] && (
                <div>
                  {y.months.map((m) => {
                    const ym = `${y.year}-${m.month}`;
                    return (
                      <div key={ym} style={{ marginInlineStart: 18 }}>
                        <div style={treeMonth} onClick={()=>setOpenMonths(p=>({...p,[ym]:!p[ym]}))}>
                          <span>{openMonths[ym] ? "▼" : "▶"}</span>
                          <span style={{ marginInlineStart: 6 }}>{m.month}</span>
                        </div>
                        {openMonths[ym] && (
                          <div style={{ marginInlineStart: 18 }}>
                            {m.days.map((d) => (
                              <div
                                key={d}
                                style={{
                                  padding: "4px 6px",
                                  cursor: "pointer",
                                  borderRadius: 8,
                                  background: selectedDate === d ? "#e0f2fe" : "transparent",
                                  fontWeight: selectedDate === d ? 800 : 500,
                                }}
                                onClick={()=>setSelectedDate(d)}
                              >
                                {d}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Selected day */}
        <div style={{ flex: 1 }}>
          {!selectedReport ? (
            <div style={{ color: "#64748b" }}>No data in the selected period.</div>
          ) : (
            <div>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                <div style={{ fontWeight: 900, color: "#0f172a" }}>Date: {selectedReport.reportDate}</div>
                <button onClick={handleDeleteDay} style={btnDanger}>🗑️ Delete this day's report from server</button>
              </div>

              <div style={tableWrap}>
                <table style={table}>
                  <thead>
                    <tr>
                      <th style={{...th2, ...col.sl}}>SL</th>
                      <th style={{...th2, ...col.product}}>PRODUCT</th>
                      <th style={{...th2, ...col.origin}}>ORIGIN</th>
                      <th style={{...th2, ...col.customer}}>CUSTOMER</th>
                      <th style={{...th2, ...col.qty}}>QTY</th>
                      <th style={{...th2, ...col.qtyType}}>QTY TYPE</th>
                      <th style={{...th2, ...col.expiry}}>EXPIRY</th>
                      <th style={{...th2, ...col.remarks}}>REMARKS</th>
                      <th style={{...th2, ...col.action}}>ACTION</th>
                      <th style={{...th2, ...col.images}}>IMAGES</th>
                      <th style={{...th2, ...col.ops, borderRight: "none"}}></th>
                    </tr>
                  </thead>
                  <tbody>
                    {(selectedReport.items || []).map((row, i) => {
                      const rowBg = i % 2 === 0 ? "#ffffff" : "#f8fafc";
                      return (
                        <tr key={i} style={{ background: rowBg }}>
                          <td style={{...tdNum, ...col.sl}}>{i + 1}</td>
                          <td style={{...td2, ...col.product}} title={row.productName}>{row.productName}</td>
                          <td style={{...td2, ...col.origin}}>{row.origin}</td>
                          <td style={{...td2, ...col.customer}}>{row.customerName}</td>
                          <td style={{...tdNum, ...col.qty}} title={String(row.quantity)}>{row.quantity}</td>
                          <td style={{...td2, ...col.qtyType}}>
                            {row.qtyType === "Other" ? (row.customQtyType || "") : (row.qtyType || "")}
                          </td>
                          <td style={{...tdNum, ...col.expiry}}>{row.expiry}</td>
                          <td style={{...td2, ...col.remarks}}>{row.remarks}</td>
                          <td style={{...td2, ...col.action}}>
                            {row.action === "Other..." ? (row.customAction || "") : (row.action || "")}
                          </td>
                          <td style={{...td2, ...col.images}}>
                            <button onClick={()=>{ setImageRowIndex(i); setImageModalOpen(true); }} style={btnBlueSm}>
                              {Array.isArray(row.images) && row.images.length ? `View (${row.images.length})` : "Add / View"}
                            </button>
                          </td>
                          <td style={{...td2, ...col.ops, borderRight: "none"}}>
                            <button onClick={()=>startEditRow(i)} style={btnGraySm}>✏️</button>
                            <button onClick={()=>deleteRow(i)} style={btnDangerSm}>🗑️</button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Edit/Add Panel */}
              {editRowData && (
                <div style={editCard}>
                  <div style={{ fontWeight: 900, marginBottom: 8 }}>
                    {addingRow ? "➕ Add Row" : "✏️ Edit Row"}
                  </div>
                  <div style={formGrid}>
                    <input style={inp} placeholder="PRODUCT NAME" value={editRowData.productName} onChange={e=>setEditRowData(d=>({...d, productName:e.target.value}))}/>
                    <input style={inp} placeholder="ORIGIN" value={editRowData.origin} onChange={e=>setEditRowData(d=>({...d, origin:e.target.value}))}/>
                    <input style={inp} placeholder="CUSTOMER" value={editRowData.customerName} onChange={e=>setEditRowData(d=>({...d, customerName:e.target.value}))}/>
                    <input style={inp} placeholder="QUANTITY" inputMode="decimal" value={editRowData.quantity} onChange={e=>setEditRowData(d=>({...d, quantity:e.target.value.replace(/[^0-9.]/g,"")}))}/>
                    <input style={inp} placeholder="QTY TYPE (e.g., KG/PCS)" value={editRowData.qtyType} onChange={e=>setEditRowData(d=>({...d, qtyType:e.target.value}))}/>
                    <input style={inp} type="date" placeholder="EXPIRY" value={editRowData.expiry} onChange={e=>setEditRowData(d=>({...d, expiry:e.target.value}))}/>
                    <input style={inp} placeholder="REMARKS" value={editRowData.remarks} onChange={e=>setEditRowData(d=>({...d, remarks:e.target.value}))}/>
                    <input style={inp} placeholder="ACTION" value={editRowData.action} onChange={e=>setEditRowData(d=>({...d, action:e.target.value}))}/>
                    {editRowData.action === "Other..." && (
                      <input style={inp} placeholder="Custom action" value={editRowData.customAction} onChange={e=>setEditRowData(d=>({...d, customAction:e.target.value}))}/>
                    )}
                  </div>
                  <div style={{ display:"flex", gap:8, marginTop:8 }}>
                    <button onClick={saveRow} style={btnBlue}>💾 Save</button>
                    <button onClick={cancelEditRow} style={btnGray}>✖ Cancel</button>
                  </div>
                </div>
              )}

              {/* Images modal */}
              <ImageManagerModal
                open={imageModalOpen}
                row={(selectedReport.items || [])[imageRowIndex]}
                onClose={closeImages}
                remaining={Math.max(0, MAX_IMAGES_PER_PRODUCT - ((selectedReport.items || [])[imageRowIndex]?.images?.length || 0))}
                onAddImages={addImagesToRow}
                onRemoveImage={(imgIdx)=>removeImageFromRow(imgIdx)}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ====== Styles (view) ====== */
const tableWrap = {
  border: "1px solid #cbd5e1",
  borderRadius: 12,
  overflow: "auto",
  background: "#fff",
  boxShadow: "0 6px 18px rgba(0,0,0,.06)",
  maxWidth: "100%",
};

const table = {
  width: "100%",
  borderCollapse: "separate",
  borderSpacing: 0,
  tableLayout: "fixed",
};

const th2 = {
  position: "sticky",
  top: 0,
  zIndex: 2,
  padding: "10px 8px",
  fontSize: 12,
  fontWeight: 900,
  color: "#0f172a",
  background: "linear-gradient(180deg,#eef2ff,#e2e8f0)",
  borderBottom: "2px solid #94a3b8",
  borderRight: "1px solid #cbd5e1",
  textAlign: "start",
  whiteSpace: "nowrap",
};

const td2 = {
  padding: "10px 8px",
  fontSize: 12,
  color: "#0f172a",
  background: "transparent",
  borderBottom: "1px solid #e2e8f0",
  borderRight: "1px solid #e2e8f0",
  verticalAlign: "middle",
  textAlign: "start",
  wordBreak: "break-word",
};

const tdNum = {
  ...td2,
  textAlign: "center",
  fontVariantNumeric: "tabular-nums",
  fontFeatureSettings: '"tnum"',
};

const btnBlue = { background:"#2563eb", color:"#fff", border:"none", borderRadius:10, padding:"8px 14px", fontWeight:800, cursor:"pointer" };
const btnBlueSm = { ...btnBlue, padding:"6px 10px", fontSize:12 };
const btnDanger = { background:"#ef4444", color:"#fff", border:"none", borderRadius:10, padding:"8px 14px", fontWeight:800, cursor:"pointer" };
const btnDangerSm = { ...btnDanger, padding:"4px 8px" };
const btnGray = { background:"#e5e7eb", color:"#111827", border:"1px solid #d1d5db", borderRadius:10, padding:"8px 14px", fontWeight:800, cursor:"pointer" };
const btnGraySm = { ...btnGray, padding:"4px 8px" };

const editCard = { background:"#fff", border:"1px solid #e5e7eb", borderRadius:12, padding:12, marginTop:10, boxShadow:"0 4px 16px rgba(0,0,0,.05)" };
const formGrid = { display:"grid", gridTemplateColumns:"repeat(auto-fit, minmax(180px, 1fr))", gap:8 };
const inp = { padding:"8px 10px", borderRadius:8, border:"1px solid #cbd5e1", fontSize:12 };

const dateInp = { padding:"6px 10px", borderRadius:8, border:"1px solid #cbd5e1" };

const treeSection = { marginBottom: 8 };
const treeYear = { display:"flex", alignItems:"center", gap:6, cursor:"pointer", padding:"6px 8px", background:"#f1f5f9", borderRadius:8 };
const treeMonth = { display:"flex", alignItems:"center", gap:6, cursor:"pointer", padding:"4px 6px", background:"#f8fafc", borderRadius:8 };

const galleryBack = { position: "fixed", inset: 0, background: "rgba(15,23,42,.35)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 9999 };
const galleryCard = { width: "min(1200px, 96vw)", maxHeight: "90vh", overflow: "auto", background: "#fff", color: "#111", borderRadius: 14, border: "1px solid #e5e7eb", padding: "14px 16px", boxShadow: "0 12px 32px rgba(0,0,0,.25)" };
const galleryClose = { background: "transparent", border: "none", color: "#111", fontWeight: 900, cursor: "pointer", fontSize: 18 };
const thumbBig = { maxWidth: "100%", maxHeight: 700, borderRadius: 15, boxShadow: "0 6px 18px rgba(0,0,0,.2)" };
const thumbsWrap = { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))", gap: 10 };
const thumbTile = { position: "relative", border: "1px solid #e5e7eb", borderRadius: 10, overflow: "hidden", background: "#f8fafc", padding: 0 };
const thumbImg = { width: "100%", height: 120, objectFit: "cover", display: "block" };
const thumbRemove = { position:"absolute", top:4, right:4, background:"#ef4444", color:"#fff", border:"none", borderRadius:999, padding:"2px 6px", cursor:"pointer" };
