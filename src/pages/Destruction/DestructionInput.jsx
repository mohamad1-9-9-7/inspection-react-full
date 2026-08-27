// src/pages/Destruction/DestructionInput.jsx
//
// إدخال — سجل إعدام المواد / Material Destruction & Condemnation Register.
// Same shape and tooling as the Returns / ENOC Returns registers:
//   • server is the source of truth (POST/PUT /api/reports, type=destruction_record)
//   • images go to Cloudinary through /api/images (never base64 in the payload)
//   • product catalog comes from the shared Returns catalog (items.json + custom)
//   • localStorage is used only as a draft cache

import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import API_BASE from "../../config/api";
import {
  useProductCatalog,
  normalizeCode,
} from "../monitor/branches/_shared/ProductPicker";
import {
  TYPE,
  BRANCHES,
  OTHER,
  OTHER_BRANCH,
  REASONS,
  METHODS,
  QTY_TYPES,
  blankHeader,
  blankItem,
  computeTotals,
  fmt2,
  getToday,
  isCustomReason,
  itemReasons,
  lineValue,
  prepareItem,
  rowHasData,
  safeArr,
} from "./destructionOptions";

const DRAFT_KEY = "destruction_draft_v1";

/* ================= server helpers ================= */
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
  await fetch(`${API_BASE}/api/images?url=${encodeURIComponent(url)}`, {
    method: "DELETE",
  }).catch(() => {});
}

function getId(r) {
  return r?.id || r?._id || r?.payload?.id || r?.payload?._id;
}

/** Find an already-saved report for the same date (multi-per-day is not wanted here). */
async function findReportForDate(reportDate) {
  const target = String(reportDate || "").slice(0, 10);
  try {
    // Targeted read: the server matches the business date and returns just that
    // record. Fetching the type alone became limit=5000 on the way out, so the
    // whole archive travelled here to look up a single day.
    const res = await fetch(
      `${API_BASE}/api/reports?type=${encodeURIComponent(TYPE)}&reportDate=${encodeURIComponent(target)}`,
      { headers: { Accept: "application/json" }, cache: "no-store" }
    );
    if (!res.ok) return null;
    const data = await res.json().catch(() => null);
    const arr =
      (Array.isArray(data) && data) ||
      (Array.isArray(data?.items) && data.items) ||
      (Array.isArray(data?.reports) && data.reports) ||
      (Array.isArray(data?.data) && data.data) ||
      [];
    return (
      arr.find((r) => {
        const d = r?.payload?.reportDate || r?.reportDate || r?.date || "";
        return String(d).slice(0, 10) === target;
      }) || null
    );
  } catch {
    return null;
  }
}

async function createReport(payload) {
  const res = await fetch(`${API_BASE}/api/reports`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ reporter: "anonymous", type: TYPE, payload }),
  });
  if (!res.ok) throw new Error(`Server ${res.status}: ${await res.text()}`);
  return res.json();
}

/* PUT by id — never the generic PUT /api/reports, which upserts by (type,date). */
async function updateReportById(id, payload) {
  const res = await fetch(`${API_BASE}/api/reports/${encodeURIComponent(id)}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({ type: TYPE, payload }),
  });
  if (!res.ok) throw new Error(`Server ${res.status}: ${await res.text()}`);
  return res.json().catch(() => ({}));
}

/* ================= images modal ================= */
function ImageManagerModal({ open, row, onClose, onAddImages, onRemoveImage }) {
  const [previewSrc, setPreviewSrc] = useState("");
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef(null);

  useEffect(() => {
    if (!open) setPreviewSrc("");
    const onEsc = (e) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onEsc);
    return () => window.removeEventListener("keydown", onEsc);
  }, [open, onClose]);

  if (!open) return null;

  const handleFiles = async (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    setUploading(true);
    const urls = [];
    for (const f of files) {
      try {
        urls.push(await uploadViaServer(f));
      } catch (err) {
        console.error("upload failed:", err);
      }
    }
    if (urls.length) onAddImages(urls);
    e.target.value = "";
    setUploading(false);
  };

  return (
    <div style={galleryBack} onClick={onClose}>
      <div style={galleryCard} onClick={(e) => e.stopPropagation()}>
        <div style={galleryTop}>
          <div style={galleryTitle}>
            📷 Destruction Evidence {row?.productName ? `— ${row.productName}` : ""}
          </div>
          <button onClick={onClose} style={galleryClose}>
            ✕
          </button>
        </div>

        {previewSrc && (
          <div style={{ marginTop: 10, marginBottom: 8 }}>
            <img src={previewSrc} alt="preview" style={previewImg} />
          </div>
        )}

        <div style={galleryActions}>
          <button
            onClick={() => inputRef.current?.click()}
            style={btnBlue}
            disabled={uploading}
          >
            {uploading ? "Uploading..." : "Upload photos"}
          </button>
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            multiple
            onChange={handleFiles}
            style={{ display: "none" }}
          />
          <div style={{ fontSize: 13, color: "#334155", fontWeight: 700 }}>
            Attach before / after destruction photos as evidence.
          </div>
        </div>

        <div style={thumbsWrap}>
          {safeArr(row?.images).length === 0 ? (
            <div style={{ color: "#64748b", fontWeight: 800 }}>No photos yet.</div>
          ) : (
            row.images.map((src, i) => (
              <div key={i} style={thumbTile}>
                <img
                  src={src}
                  alt={`img-${i}`}
                  style={thumbImg}
                  onClick={() => setPreviewSrc(src)}
                />
                <button
                  title="Remove"
                  onClick={() => onRemoveImage(i)}
                  style={thumbRemove}
                  data-delete-action="true"
                >
                  ✕
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

/* ====================== PAGE ====================== */
export default function DestructionInput() {
  const navigate = useNavigate();
  const { allItems } = useProductCatalog();

  const [reportDate, setReportDate] = useState(getToday());
  const [header, setHeader] = useState(blankHeader());
  const [rows, setRows] = useState([blankItem()]);

  const [rowErrors, setRowErrors] = useState({});
  const [headerErrors, setHeaderErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState("");

  const flash = (msg, ms = 2500) => {
    setSaveMsg(msg);
    if (ms) setTimeout(() => setSaveMsg(""), ms);
  };

  /* ===== draft cache ===== */
  const hydratedRef = useRef(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(DRAFT_KEY);
      if (raw) {
        const data = JSON.parse(raw);
        if (typeof data?.reportDate === "string") setReportDate(data.reportDate);
        if (data?.header && typeof data.header === "object") {
          setHeader({ ...blankHeader(), ...data.header });
        }
        if (Array.isArray(data?.rows) && data.rows.length) setRows(data.rows);
        if (data?.rows || data?.header) flash("Draft loaded.", 1500);
      }
    } catch {
      /* ignore */
    } finally {
      hydratedRef.current = true;
    }
  }, []);

  useEffect(() => {
    if (!hydratedRef.current) return;
    const t = setTimeout(() => {
      try {
        localStorage.setItem(
          DRAFT_KEY,
          JSON.stringify({ reportDate, header, rows, ts: Date.now() })
        );
      } catch {
        /* ignore */
      }
    }, 250);
    return () => clearTimeout(t);
  }, [reportDate, header, rows]);

  const clearDraft = () => {
    try {
      localStorage.removeItem(DRAFT_KEY);
    } catch {
      /* ignore */
    }
    setHeader(blankHeader());
    setRows([blankItem()]);
    setRowErrors({});
    setHeaderErrors({});
    flash("Draft cleared.", 1500);
  };

  /* ===== catalog lookup ===== */
  const byCode = useMemo(() => {
    const m = new Map();
    for (const it of allItems) m.set(normalizeCode(it.item_code), it);
    return m;
  }, [allItems]);

  const byName = useMemo(() => {
    const m = new Map();
    for (const it of allItems) m.set(normalizeCode(it.description), it);
    return m;
  }, [allItems]);

  /* ===== row editing ===== */
  const setHeaderField = (field, value) =>
    setHeader((prev) => {
      const next = { ...prev, [field]: value };
      if (field === "branch" && value !== OTHER_BRANCH) next.customBranch = "";
      if (field === "method" && value !== OTHER) next.customMethod = "";
      return next;
    });

  const handleChange = (idx, field, value) => {
    setRows((prev) => {
      const next = [...prev];
      const cur = { ...next[idx], [field]: value };

      if (field === "qtyType" && value !== OTHER) cur.customQtyType = "";
      if (field === "method" && value !== OTHER) cur.customMethod = "";

      /* Catalog auto-fill, exactly like the Returns register */
      if (field === "itemCode") {
        const hit = byCode.get(normalizeCode(value));
        if (hit) cur.productName = hit.description;
      }
      if (field === "productName") {
        const hit = byName.get(normalizeCode(value));
        if (hit && !String(cur.itemCode || "").trim()) cur.itemCode = hit.item_code;
      }

      next[idx] = cur;
      return next;
    });
  };

  /* ===== reasons — one line may carry more than one =====
     The raw array is the editing state (it may hold one still-empty free-text
     slot); `itemReasons` is only the bridge for rows saved before this field
     existed. Empty slots are dropped by prepareItem on save. */
  const rowReasons = (row) => (Array.isArray(row?.reasons) ? row.reasons : itemReasons(row));

  const setReasons = (idx, next) =>
    setRows((prev) => {
      const list = [...prev];
      list[idx] = { ...list[idx], reasons: next };
      return list;
    });

  const addReason = (idx, value) => {
    const v = String(value || "").trim();
    if (!v) return;
    const cur = rowReasons(rows[idx]);
    if (v === OTHER) {
      /* "Other..." adds one empty free-text slot to fill in */
      if (cur.some(isCustomReason) || cur.includes("")) return;
      setReasons(idx, [...cur, ""]);
      return;
    }
    if (cur.includes(v)) return;
    setReasons(idx, [...cur, v]);
  };

  const removeReason = (idx, at) => {
    const cur = rowReasons(rows[idx]).slice();
    cur.splice(at, 1);
    setReasons(idx, cur);
  };

  const editCustomReason = (idx, at, value) => {
    const cur = rowReasons(rows[idx]).slice();
    cur[at] = value;
    setReasons(idx, cur);
  };

  const addRow = () => setRows((prev) => [...prev, blankItem()]);

  const duplicateRow = (idx) =>
    setRows((prev) => {
      const next = [...prev];
      next.splice(idx + 1, 0, { ...next[idx], images: [] });
      return next;
    });

  const removeRow = (idx) =>
    setRows((prev) => {
      const next = prev.filter((_, i) => i !== idx);
      return next.length ? next : [blankItem()];
    });

  /* ===== images ===== */
  const [imageModalOpen, setImageModalOpen] = useState(false);
  const [imageRowIndex, setImageRowIndex] = useState(-1);

  const addImagesToRow = (urls) => {
    if (imageRowIndex < 0) return;
    setRows((prev) =>
      prev.map((r, i) =>
        i === imageRowIndex ? { ...r, images: [...safeArr(r.images), ...urls] } : r
      )
    );
    flash("Photos added.", 1500);
  };

  const removeImageFromRow = async (imgIndex) => {
    if (imageRowIndex < 0) return;
    const url = rows?.[imageRowIndex]?.images?.[imgIndex];
    setRows((prev) =>
      prev.map((r, i) => {
        if (i !== imageRowIndex) return r;
        const next = safeArr(r.images).slice();
        next.splice(imgIndex, 1);
        return { ...r, images: next };
      })
    );
    await deleteImage(url);
    flash("Photo removed.", 1500);
  };

  /* ===== totals ===== */
  const filledRows = useMemo(() => rows.filter(rowHasData), [rows]);
  const totals = useMemo(() => computeTotals(filledRows), [filledRows]);

  /* ===== validation ===== */
  const validate = (items) => {
    const hErr = {};
    if (!String(header.branch || "").trim()) hErr.branch = true;
    if (header.branch === OTHER_BRANCH && !String(header.customBranch || "").trim())
      hErr.customBranch = true;
    if (!String(header.destructionDate || "").trim()) hErr.destructionDate = true;
    if (!String(header.performedBy || "").trim()) hErr.performedBy = true;
    if (!String(header.approvedBy || "").trim()) hErr.approvedBy = true;

    const rErr = {};
    items.forEach((r, idx) => {
      const bad =
        !String(r.productName || "").trim() ||
        !(Number(r.quantity) > 0) ||
        (r.qtyType === OTHER && !String(r.customQtyType || "").trim()) ||
        !itemReasons(r).length ||
        (r.method === OTHER && !String(r.customMethod || "").trim());
      if (bad) rErr[idx] = true;
    });

    const ok = !Object.keys(hErr).length && !Object.keys(rErr).length;
    return {
      ok,
      hErr,
      rErr,
      msg: ok
        ? ""
        : "Please complete the highlighted fields: Branch, Destruction Date, Destroyed By, Approved By, and for every line Product, Quantity (> 0) and at least one Reason.",
    };
  };

  /* ===== save ===== */
  const handleSave = async () => {
    if (saving) return;

    setRowErrors({});
    setHeaderErrors({});

    const items = rows.filter(rowHasData).map(prepareItem);
    if (!items.length) {
      flash("Nothing to save — add at least one destroyed item.");
      return;
    }

    const v = validate(items);
    if (!v.ok) {
      setRowErrors(v.rErr);
      setHeaderErrors(v.hErr);
      flash(v.msg, 5000);
      return;
    }

    const payload = {
      reportDate,
      header: {
        ...header,
        branch: String(header.branch || "").trim(),
        customBranch: String(header.customBranch || "").trim(),
      },
      items,
      totals: {
        lines: items.length,
        totalValue: computeTotals(items).totalValue,
        totalWeight: computeTotals(items).totalWeight,
      },
      savedAt: Date.now(),
    };

    try {
      setSaving(true);
      setSaveMsg("Checking report date...");
      const existing = await findReportForDate(reportDate);

      if (existing) {
        const id = getId(existing);
        const oldItems = safeArr(existing?.payload?.items);
        const append = window.confirm(
          `A destruction record already exists for ${reportDate} (${oldItems.length} line(s)).\n\n` +
            `OK  = append these ${items.length} line(s) to it.\n` +
            `Cancel = stop and change the date.`
        );
        if (!append) {
          setSaving(false);
          flash("Save cancelled — pick another date.", 3500);
          return;
        }
        if (!id) throw new Error("Existing report has no id.");

        setSaveMsg("Appending to the existing record...");
        const merged = [...oldItems, ...items];
        await updateReportById(id, {
          ...(existing.payload || {}),
          reportDate,
          header: existing?.payload?.header || payload.header,
          items: merged,
          totals: {
            lines: merged.length,
            totalValue: computeTotals(merged).totalValue,
            totalWeight: computeTotals(merged).totalWeight,
          },
          savedAt: Date.now(),
        });
        flash(`Appended. The record for ${reportDate} now has ${merged.length} line(s).`, 5000);
      } else {
        setSaveMsg("Saving to server...");
        const res = await createReport(payload);
        /* The server allocates the reference number and returns the stored row. */
        const refNo = res?.report?.payload?.refNo || res?.payload?.refNo;
        flash(
          refNo
            ? `Saved successfully. Reference: ${refNo}`
            : `Saved successfully. Ref: ${res?.report?.id || res?.id || "—"}`,
          6000
        );
      }

      try {
        localStorage.removeItem(DRAFT_KEY);
      } catch {
        /* ignore */
      }
      setRows([blankItem()]);
    } catch (err) {
      console.error(err);
      flash("Save failed. Please try again.", 4000);
    } finally {
      setSaving(false);
    }
  };

  /* ===== render helpers ===== */
  const inp = (idx) =>
    rowErrors?.[idx] ? { ...input, border: "2px solid #ef4444", background: "#fff1f2" } : input;

  const hInp = (field) =>
    headerErrors?.[field]
      ? { ...input, border: "2px solid #ef4444", background: "#fff1f2" }
      : input;

  return (
    <div style={pageWrap}>
      <datalist id="destr-item-codes">
        {allItems.slice(0, 4000).map((it) => (
          <option key={`c-${it.item_code}-${it.description}`} value={it.item_code}>
            {it.description}
          </option>
        ))}
      </datalist>
      <datalist id="destr-item-names">
        {allItems.slice(0, 4000).map((it) => (
          <option key={`n-${it.item_code}-${it.description}`} value={it.description} />
        ))}
      </datalist>

      <h2 style={pageTitle}>🗑️ Condemnation &amp; Disposal Record — سجل الإعدام والتخلص</h2>

      <div style={topBar}>
        <div style={datePill}>
          <span style={{ fontWeight: 900 }}>Report Date</span>
          <input
            type="date"
            value={reportDate}
            onChange={(e) => setReportDate(e.target.value)}
            style={dateInput}
          />
        </div>

        <div style={topButtons}>
          <button onClick={handleSave} disabled={saving} style={saving ? btnSaveDisabled : btnSave}>
            {saving ? "Saving..." : "💾 Save"}
          </button>
          <button onClick={() => navigate("/destruction/browse")} style={btnView}>
            📋 View Records
          </button>
          <button onClick={clearDraft} style={btnDark}>
            Clear Draft
          </button>
          <button onClick={() => navigate("/returns/menu")} style={btnGhost}>
            ⬅ Back
          </button>
        </div>
      </div>

      {saveMsg && <div style={msgBox}>{saveMsg}</div>}

      {/* ───────── Header / disposal certificate details ───────── */}
      <div style={card}>
        <div style={cardHead}>📄 Condemnation &amp; Disposal Details — بيانات الإعدام والتخلص</div>
        <div style={headerGrid}>
          <label style={fieldLbl}>
            <span>Branch / Location *</span>
            <select
              style={hInp("branch")}
              value={header.branch}
              onChange={(e) => setHeaderField("branch", e.target.value)}
            >
              <option value="">Select branch</option>
              {BRANCHES.map((b) => (
                <option key={b} value={b}>
                  {b}
                </option>
              ))}
            </select>
            {header.branch === OTHER_BRANCH && (
              <input
                style={{ ...hInp("customBranch"), marginTop: 8 }}
                placeholder="Enter branch name"
                value={header.customBranch}
                onChange={(e) => setHeaderField("customBranch", e.target.value)}
              />
            )}
          </label>

          <label style={fieldLbl}>
            <span>Disposal Date *</span>
            <input
              type="date"
              style={hInp("destructionDate")}
              value={header.destructionDate}
              onChange={(e) => setHeaderField("destructionDate", e.target.value)}
            />
          </label>

          <label style={fieldLbl}>
            <span>Disposal Site</span>
            <input
              style={input}
              placeholder="e.g. Al Qusais Municipality Landfill"
              value={header.location}
              onChange={(e) => setHeaderField("location", e.target.value)}
            />
          </label>

          <label style={fieldLbl}>
            <span>Default Method</span>
            <select
              style={input}
              value={header.method}
              onChange={(e) => setHeaderField("method", e.target.value)}
            >
              <option value="">Select method</option>
              {METHODS.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
            {header.method === OTHER && (
              <input
                style={{ ...input, marginTop: 8 }}
                placeholder="Enter method"
                value={header.customMethod}
                onChange={(e) => setHeaderField("customMethod", e.target.value)}
              />
            )}
          </label>

          <label style={fieldLbl}>
            <span>Disposal Company / Contractor</span>
            <input
              style={input}
              placeholder="Approved waste contractor"
              value={header.disposalCompany}
              onChange={(e) => setHeaderField("disposalCompany", e.target.value)}
            />
          </label>

          <label style={fieldLbl}>
            <span>Municipality / Receipt Ref.</span>
            <input
              style={input}
              placeholder="Certificate or receipt number"
              value={header.municipalityRef}
              onChange={(e) => setHeaderField("municipalityRef", e.target.value)}
            />
          </label>

          <label style={fieldLbl}>
            <span>Destroyed By *</span>
            <input
              style={hInp("performedBy")}
              placeholder="Name / designation"
              value={header.performedBy}
              onChange={(e) => setHeaderField("performedBy", e.target.value)}
            />
          </label>

          <label style={fieldLbl}>
            <span>Witnessed By</span>
            <input
              style={input}
              placeholder="Name / designation"
              value={header.witnessedBy}
              onChange={(e) => setHeaderField("witnessedBy", e.target.value)}
            />
          </label>

          <label style={fieldLbl}>
            <span>Approved By (QA) *</span>
            <input
              style={hInp("approvedBy")}
              placeholder="Name / designation"
              value={header.approvedBy}
              onChange={(e) => setHeaderField("approvedBy", e.target.value)}
            />
          </label>

          <label style={{ ...fieldLbl, gridColumn: "1 / -1" }}>
            <span>General Notes</span>
            <input
              style={input}
              placeholder="Any additional note about this destruction event"
              value={header.notes}
              onChange={(e) => setHeaderField("notes", e.target.value)}
            />
          </label>
        </div>
      </div>

      {/* ───────── Items ───────── */}
      <div style={tableWrap}>
        <table style={table}>
          <thead>
            <tr>
              <th style={{ ...th, width: 52 }}>SL</th>
              <th style={{ ...th, width: 108 }}>ITEM CODE</th>
              <th style={th}>PRODUCT *</th>
              <th style={{ ...th, width: 110 }}>BATCH / LOT</th>
              <th style={{ ...th, width: 130 }}>PROD. DATE</th>
              <th style={{ ...th, width: 130 }}>EXPIRY</th>
              <th style={{ ...th, width: 92 }}>QTY *</th>
              <th style={{ ...th, width: 96 }}>UNIT</th>
              <th style={{ ...th, width: 100 }}>UNIT COST</th>
              <th style={{ ...th, width: 104 }}>VALUE (AED)</th>
              <th style={{ ...th, width: 210 }}>REASON(S) *</th>
              <th style={{ ...th, width: 170 }}>METHOD</th>
              <th style={th}>REMARKS</th>
              <th style={{ ...th, width: 110 }}>PHOTOS</th>
              <th style={{ ...th, width: 92 }}>ROW</th>
            </tr>
          </thead>

          <tbody>
            {rows.map((row, idx) => (
              <tr key={idx} style={{ background: idx % 2 ? "#fdf7f7" : "#fff" }}>
                <td style={td}>
                  <div style={slPill}>{idx + 1}</div>
                </td>

                <td style={td}>
                  <input
                    style={inp(idx)}
                    list="destr-item-codes"
                    placeholder="Code"
                    value={row.itemCode}
                    onChange={(e) => handleChange(idx, "itemCode", e.target.value)}
                  />
                </td>

                <td style={td}>
                  <input
                    style={inp(idx)}
                    list="destr-item-names"
                    placeholder="Product / material"
                    value={row.productName}
                    onChange={(e) => handleChange(idx, "productName", e.target.value)}
                  />
                </td>

                <td style={td}>
                  <input
                    style={input}
                    placeholder="Batch"
                    value={row.batchNo}
                    onChange={(e) => handleChange(idx, "batchNo", e.target.value)}
                  />
                </td>

                <td style={td}>
                  <input
                    type="date"
                    style={input}
                    value={row.productionDate}
                    onChange={(e) => handleChange(idx, "productionDate", e.target.value)}
                  />
                </td>

                <td style={td}>
                  <input
                    type="date"
                    style={input}
                    value={row.expiry}
                    onChange={(e) => handleChange(idx, "expiry", e.target.value)}
                  />
                </td>

                <td style={td}>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    style={inp(idx)}
                    placeholder="Qty"
                    value={row.quantity}
                    onChange={(e) => handleChange(idx, "quantity", e.target.value)}
                  />
                </td>

                <td style={td}>
                  <select
                    style={inp(idx)}
                    value={row.qtyType}
                    onChange={(e) => handleChange(idx, "qtyType", e.target.value)}
                  >
                    {QTY_TYPES.map((q) => (
                      <option key={q} value={q}>
                        {q}
                      </option>
                    ))}
                  </select>
                  {row.qtyType === OTHER && (
                    <input
                      style={{ ...inp(idx), marginTop: 8 }}
                      placeholder="Unit"
                      value={row.customQtyType}
                      onChange={(e) => handleChange(idx, "customQtyType", e.target.value)}
                    />
                  )}
                </td>

                <td style={td}>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    style={input}
                    placeholder="0.00"
                    value={row.unitCost}
                    onChange={(e) => handleChange(idx, "unitCost", e.target.value)}
                  />
                </td>

                <td style={{ ...td, fontWeight: 900, color: "#7f1d1d" }}>
                  {fmt2(lineValue(row))}
                </td>

                <td style={{ ...td, textAlign: "left" }}>
                  {(() => {
                    const picked = rowReasons(row);
                    const taken = new Set(picked);
                    const hasCustom = picked.some((r) => r === "" || isCustomReason(r));
                    return (
                      <>
                        {picked.length > 0 && (
                          <div style={reasonChips}>
                            {picked.map((r, ri) =>
                              r === "" || isCustomReason(r) ? (
                                <div key={`c-${ri}`} style={reasonCustomWrap}>
                                  <input
                                    autoFocus={r === ""}
                                    style={reasonCustomInput}
                                    placeholder="Enter reason"
                                    value={r}
                                    onChange={(e) => editCustomReason(idx, ri, e.target.value)}
                                  />
                                  <button
                                    onClick={() => removeReason(idx, ri)}
                                    style={reasonChipX}
                                    title="Remove this reason"
                                  >
                                    ✕
                                  </button>
                                </div>
                              ) : (
                                <span key={`r-${ri}`} style={reasonChip}>
                                  <span style={{ lineHeight: 1.25 }}>{r}</span>
                                  <button
                                    onClick={() => removeReason(idx, ri)}
                                    style={reasonChipX}
                                    title="Remove this reason"
                                  >
                                    ✕
                                  </button>
                                </span>
                              )
                            )}
                          </div>
                        )}
                        <select
                          style={{ ...inp(idx), marginTop: picked.length ? 8 : 0 }}
                          value=""
                          onChange={(e) => {
                            addReason(idx, e.target.value);
                            e.target.value = "";
                          }}
                        >
                          <option value="">
                            {picked.length ? "+ Add another reason" : "Select reason"}
                          </option>
                          {REASONS.filter(
                            (r) => (r === OTHER ? !hasCustom : !taken.has(r))
                          ).map((r) => (
                            <option key={r} value={r}>
                              {r}
                            </option>
                          ))}
                        </select>
                      </>
                    );
                  })()}
                </td>

                <td style={td}>
                  <select
                    style={inp(idx)}
                    value={row.method}
                    onChange={(e) => handleChange(idx, "method", e.target.value)}
                  >
                    <option value="">Use default</option>
                    {METHODS.map((m) => (
                      <option key={m} value={m}>
                        {m}
                      </option>
                    ))}
                  </select>
                  {row.method === OTHER && (
                    <input
                      style={{ ...inp(idx), marginTop: 8 }}
                      placeholder="Enter method"
                      value={row.customMethod}
                      onChange={(e) => handleChange(idx, "customMethod", e.target.value)}
                    />
                  )}
                </td>

                <td style={td}>
                  <input
                    style={input}
                    placeholder="Remarks"
                    value={row.remarks}
                    onChange={(e) => handleChange(idx, "remarks", e.target.value)}
                  />
                </td>

                <td style={td}>
                  <button
                    onClick={() => {
                      setImageRowIndex(idx);
                      setImageModalOpen(true);
                    }}
                    style={btnImg}
                    title="Manage evidence photos"
                  >
                    📷 {safeArr(row.images).length}
                  </button>
                </td>

                <td style={td}>
                  <div style={{ display: "flex", gap: 6, justifyContent: "center" }}>
                    <button onClick={() => duplicateRow(idx)} style={btnMini} title="Duplicate row">
                      ⧉
                    </button>
                    <button
                      onClick={() => removeRow(idx)}
                      style={btnMiniDel}
                      title="Delete row"
                    >
                      ✖
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* ───────── Totals ───────── */}
      <div style={totalsBar}>
        <div style={totalChip}>
          <span style={totalLbl}>Lines</span>
          <span style={totalVal}>{totals.lines}</span>
        </div>
        <div style={totalChip}>
          <span style={totalLbl}>Total Weight (KG)</span>
          <span style={totalVal}>{fmt2(totals.totalWeight)}</span>
        </div>
        <div style={totalChip}>
          <span style={totalLbl}>Estimated Value (AED)</span>
          <span style={totalVal}>{fmt2(totals.totalValue)}</span>
        </div>
        {totals.byUnit.map(([unit, qty]) => (
          <div key={unit} style={totalChipGhost}>
            <span style={totalLbl}>{unit}</span>
            <span style={totalVal}>{fmt2(qty)}</span>
          </div>
        ))}
      </div>

      <div style={{ marginTop: 16, textAlign: "center" }}>
        <button onClick={addRow} style={btnAdd}>
          ➕ Add Item
        </button>
      </div>

      <ImageManagerModal
        open={imageModalOpen}
        row={imageRowIndex >= 0 ? rows?.[imageRowIndex] || {} : null}
        onClose={() => setImageModalOpen(false)}
        onAddImages={addImagesToRow}
        onRemoveImage={removeImageFromRow}
      />
    </div>
  );
}

/* ====================== STYLES ====================== */
const pageWrap = {
  fontFamily: "Cairo, system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif",
  padding: 16,
  background: "#faf6f6",
  minHeight: "100vh",
  width: "100%",
  boxSizing: "border-box",
};

const pageTitle = {
  textAlign: "center",
  color: "#7f1d1d",
  margin: "10px 0 16px",
  fontWeight: 900,
  letterSpacing: 0.2,
};

const topBar = {
  display: "flex",
  flexWrap: "wrap",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 12,
  marginBottom: 12,
};

const datePill = {
  display: "flex",
  alignItems: "center",
  gap: 10,
  background: "#b91c1c",
  color: "#fff",
  padding: "10px 12px",
  borderRadius: 12,
  boxShadow: "0 2px 10px rgba(185,28,28,.2)",
};

const dateInput = {
  background: "#fff",
  border: "none",
  borderRadius: 10,
  padding: "8px 10px",
  fontWeight: 800,
  color: "#111827",
};

const topButtons = {
  display: "flex",
  flexWrap: "wrap",
  alignItems: "center",
  justifyContent: "flex-end",
  gap: 10,
};

const msgBox = {
  fontWeight: 800,
  color: "#111827",
  background: "#fff",
  border: "1px solid #e5e7eb",
  padding: "10px 12px",
  borderRadius: 12,
  marginBottom: 12,
};

const card = {
  background: "#fff",
  border: "1px solid #f0d6d6",
  borderRadius: 14,
  boxShadow: "0 2px 12px rgba(0,0,0,.06)",
  overflow: "hidden",
  marginBottom: 14,
};

const cardHead = {
  background: "#fdeaea",
  borderBottom: "2px solid #f3c0c0",
  color: "#7f1d1d",
  fontWeight: 900,
  padding: "12px 14px",
};

const headerGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
  gap: 12,
  padding: 14,
};

const fieldLbl = {
  display: "flex",
  flexDirection: "column",
  gap: 6,
  fontWeight: 900,
  fontSize: 13,
  color: "#334155",
};

const tableWrap = { width: "100%", overflowX: "auto" };

const table = {
  width: "100%",
  minWidth: 1500,
  borderCollapse: "collapse",
  background: "#fff",
  borderRadius: 14,
  overflow: "hidden",
  boxShadow: "0 2px 16px rgba(0,0,0,.08)",
};

const th = {
  padding: "12px 8px",
  textAlign: "center",
  fontSize: 12.5,
  fontWeight: 900,
  color: "#7f1d1d",
  background: "#fdeaea",
  borderBottom: "2px solid #f3c0c0",
  wordBreak: "break-word",
};

const td = {
  padding: "10px 8px",
  textAlign: "center",
  verticalAlign: "middle",
  wordBreak: "break-word",
  borderLeft: "1px solid #f5eaea",
  borderRight: "1px solid #f5eaea",
  borderBottom: "1px solid #f5eaea",
};

const slPill = {
  display: "inline-grid",
  placeItems: "center",
  width: 30,
  height: 30,
  borderRadius: 999,
  background: "#7f1d1d",
  color: "#fff",
  fontWeight: 900,
  fontSize: 13,
};

const input = {
  width: "100%",
  boxSizing: "border-box",
  padding: "9px 10px",
  borderRadius: 10,
  border: "1.5px solid #e5b8b8",
  background: "#fffafa",
  fontSize: 13,
  fontWeight: 700,
  fontFamily: "inherit",
};

const totalsBar = {
  marginTop: 14,
  display: "flex",
  gap: 10,
  flexWrap: "wrap",
  alignItems: "center",
};

const totalChip = {
  display: "flex",
  flexDirection: "column",
  gap: 2,
  minWidth: 160,
  background: "#7f1d1d",
  color: "#fff",
  borderRadius: 12,
  padding: "10px 14px",
  boxShadow: "0 2px 10px rgba(127,29,29,.22)",
};

const totalChipGhost = {
  ...totalChip,
  background: "#fff",
  color: "#7f1d1d",
  border: "1px solid #f0d6d6",
  boxShadow: "0 2px 10px rgba(0,0,0,.05)",
  minWidth: 110,
};

const totalLbl = { fontSize: 12, fontWeight: 800, opacity: 0.9 };
const totalVal = { fontSize: 18, fontWeight: 900 };

/* buttons */
const btnBase = {
  border: "none",
  borderRadius: 12,
  fontWeight: 900,
  padding: "10px 14px",
  cursor: "pointer",
  color: "#fff",
  fontFamily: "inherit",
};

const btnSave = { ...btnBase, background: "#229954", boxShadow: "0 2px 8px rgba(34,153,84,.2)" };
const btnSaveDisabled = { ...btnSave, background: "#7fbf9f", cursor: "not-allowed" };
const btnView = { ...btnBase, background: "#b91c1c", boxShadow: "0 2px 8px rgba(185,28,28,.2)" };
const btnDark = { ...btnBase, background: "#0f172a" };
const btnBlue = { ...btnBase, background: "#2563eb" };

const btnGhost = {
  ...btnBase,
  background: "transparent",
  color: "#7f1d1d",
  border: "1px solid rgba(127,29,29,.45)",
};

const reasonChips = {
  display: "flex",
  flexWrap: "wrap",
  gap: 6,
};

const reasonChip = {
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
  maxWidth: "100%",
  padding: "5px 6px 5px 9px",
  borderRadius: 999,
  background: "#fdeaea",
  border: "1.5px solid #e5b8b8",
  color: "#7f1d1d",
  fontSize: 12,
  fontWeight: 800,
  textAlign: "left",
};

const reasonChipX = {
  border: "none",
  background: "#7f1d1d",
  color: "#fff",
  width: 18,
  height: 18,
  borderRadius: 999,
  fontSize: 11,
  fontWeight: 900,
  lineHeight: 1,
  cursor: "pointer",
  flexShrink: 0,
};

const reasonCustomWrap = {
  display: "flex",
  alignItems: "center",
  gap: 6,
  width: "100%",
};

const reasonCustomInput = {
  flex: 1,
  minWidth: 0,
  boxSizing: "border-box",
  padding: "7px 9px",
  borderRadius: 10,
  border: "1.5px solid #e5b8b8",
  background: "#fffafa",
  fontSize: 12.5,
  fontWeight: 700,
  fontFamily: "inherit",
};

const btnImg = {
  ...btnBase,
  width: "100%",
  background: "#2563eb",
  padding: "9px 8px",
  fontSize: 13,
};

const btnMini = {
  ...btnBase,
  background: "#475569",
  padding: "8px 10px",
  borderRadius: 10,
  fontSize: 13,
};

const btnMiniDel = { ...btnMini, background: "#c0392b" };

const btnAdd = {
  ...btnBase,
  background: "#7f1d1d",
  borderRadius: 14,
  fontSize: 14,
  padding: "12px 20px",
  boxShadow: "0 2px 8px rgba(127,29,29,.2)",
};

/* gallery modal */
const galleryBack = {
  position: "fixed",
  inset: 0,
  background: "rgba(15,23,42,.4)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  zIndex: 999,
};

const galleryCard = {
  width: "min(1100px, 96vw)",
  maxHeight: "84vh",
  overflow: "auto",
  background: "#fff",
  borderRadius: 14,
  border: "1px solid #e5e7eb",
  padding: "14px 16px",
  boxShadow: "0 12px 32px rgba(0,0,0,.25)",
  fontFamily: "Cairo, system-ui, sans-serif",
};

const galleryTop = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: 8,
};

const galleryTitle = { fontWeight: 900, fontSize: "1.05rem", color: "#7f1d1d" };

const galleryClose = {
  background: "transparent",
  border: "none",
  color: "#111",
  fontWeight: 900,
  cursor: "pointer",
  fontSize: 18,
};

const galleryActions = {
  display: "flex",
  alignItems: "center",
  gap: 10,
  marginTop: 10,
  marginBottom: 8,
  flexWrap: "wrap",
};

const previewImg = {
  maxWidth: "100%",
  maxHeight: "62vh",
  borderRadius: 12,
  boxShadow: "0 6px 18px rgba(0,0,0,.2)",
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
  cursor: "zoom-in",
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
  fontWeight: 900,
  cursor: "pointer",
};
