// src/pages/monitor/branches/sweets/ProductRejectionInput.jsx
// Product Rejection Report — input form (one record per rejected product).
//
// Several rejections can happen on one day, so the record is keyed with
// eventReportDate() (sweetsRecord.js) while payload.date stays the plain day.

import React, { useRef, useState } from "react";
import API_BASE from "../../../../config/api";
import { uploadImage, deleteImage } from "../../../../utils/imageUpload";
import { eventReportDate } from "./sweetsRecord";
import { Bi, bi } from "./bilingual";

const TYPE = "sweets_product_rejection";
const MAX_EXTRA_IMAGES = 8;

export const CATEGORIES = [
  "Nuts",
  "Sugar & Sweeteners",
  "Flour & Dry Goods",
  "Dairy & Cream",
  "Eggs",
  "Butter, Ghee & Oils",
  "Chocolate & Cocoa",
  "Fillings & Dates",
  "Flavours & Colours",
  "Finished Product",
  "Packaging Material",
  "Other",
];

export const REJECTION_REASONS = [
  "Expired",
  "Near Expiry",
  "Temperature Abuse",
  "Physical Damage",
  "Contamination",
  "Wrong Specification",
  "Label Missing",
  "Pest Damage",
  "Off Odour",
  "Abnormal Colour",
  "Improper Packaging",
  "Short Weight",
  "Rancid (nuts / fats)",
  "Moisture / Caking",
  "No COA / Aflatoxin Certificate",
  "Foreign Matter",
  "Other",
];

export const DISPOSITIONS = ["Returned to Supplier", "Destroyed", "Quarantine", "Downgraded"];

const UNITS = ["kg", "g", "pcs", "box", "carton", "bag", "litre"];

const today = () => {
  try { return new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Dubai" }); }
  catch { return new Date().toISOString().slice(0, 10); }
};

export default function ProductRejectionInput() {
  const [date, setDate] = useState(today());
  const [productName, setProductName] = useState("");
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [batchNo, setBatchNo] = useState("");
  const [supplier, setSupplier] = useState("");
  const [quantity, setQuantity] = useState("");
  const [unit, setUnit] = useState("kg");
  const [reason, setReason] = useState(REJECTION_REASONS[0]);
  const [disposition, setDisposition] = useState(DISPOSITIONS[0]);
  const [inspectedBy, setInspectedBy] = useState("");
  const [approvedBy, setApprovedBy] = useState("");
  const [notes, setNotes] = useState("");

  const [photos, setPhotos] = useState([]);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState({ kind: "", text: "" });
  const photosRef = useRef(null);

  function showMsg(kind, text, ms = 3000) {
    setMsg({ kind, text });
    if (ms) setTimeout(() => setMsg({ kind: "", text: "" }), ms);
  }

  async function addPhotos(fileList) {
    const files = Array.from(fileList || []).filter((f) => String(f.type || "").startsWith("image/"));
    if (!files.length) return;
    const remaining = MAX_EXTRA_IMAGES - photos.length;
    if (remaining <= 0) { showMsg("err", `Maximum ${MAX_EXTRA_IMAGES} photos. · الحد الأقصى ${MAX_EXTRA_IMAGES} صور.`); return; }
    try {
      setBusy(true);
      const urls = [];
      for (const f of files.slice(0, remaining)) {
        try { const u = await uploadImage(f, TYPE); if (u) urls.push(u); } catch { /* next file */ }
      }
      if (urls.length) {
        setPhotos((prev) => [...prev, ...urls].slice(0, MAX_EXTRA_IMAGES));
        showMsg("ok", `✅ ${urls.length} photo(s) uploaded. · تم رفع ${urls.length} صورة.`);
      } else {
        showMsg("err", "No photo could be uploaded. · تعذّر رفع الصور.");
      }
    } finally {
      setBusy(false);
      if (photosRef.current) photosRef.current.value = "";
    }
  }

  async function removePhotoAt(i) {
    const url = photos[i];
    setPhotos((prev) => prev.filter((_, idx) => idx !== i));
    if (url) { try { await deleteImage(url); } catch { /* already gone */ } }
  }

  function resetForm() {
    setDate(today());
    setProductName("");
    setCategory(CATEGORIES[0]);
    setBatchNo("");
    setSupplier("");
    setQuantity("");
    setUnit("kg");
    setReason(REJECTION_REASONS[0]);
    setDisposition(DISPOSITIONS[0]);
    setInspectedBy("");
    setApprovedBy("");
    setNotes("");
    setPhotos([]);
  }

  async function save() {
    if (!date) return showMsg("err", "Pick the date. · اختر التاريخ.");
    if (!productName.trim()) return showMsg("err", "Enter the product name. · أدخل اسم المنتج.");
    if (!(Number(quantity) > 0)) return showMsg("err", "Enter the rejected quantity. · أدخل الكمية المرفوضة.");
    if (!inspectedBy.trim()) return showMsg("err", "Enter the inspector's name. · أدخل اسم المفتش.");

    const payload = {
      date,
      reportDate: eventReportDate(date),
      productName: productName.trim(),
      category,
      batchNo: batchNo.trim(),
      supplier: supplier.trim(),
      quantity: Number(quantity) || 0,
      unit,
      reason,
      disposition,
      inspectedBy: inspectedBy.trim(),
      approvedBy: approvedBy.trim(),
      notes,
      photos,
      savedAt: Date.now(),
    };

    try {
      setBusy(true);
      showMsg("info", "Saving… · جارٍ الحفظ…", 0);
      const res = await fetch(`${API_BASE}/api/reports`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reporter: "sweets", type: TYPE, payload }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      showMsg("ok", "✅ Rejection report saved. · تم حفظ تقرير الرفض.");
      resetForm();
    } catch (e) {
      showMsg("err", `❌ Save failed · فشل الحفظ: ${e?.message || e}`);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={S.page}>
      <div style={S.card}>
        <h2 style={S.title}>🚫 <Bi en="Product Rejection Report" ar="تقرير رفض المنتج" /></h2>
        <div style={S.sub}><Bi en="Record the rejected product, why it was rejected and what was done with it." ar="سجّل المنتج المرفوض وسبب الرفض وما تم بشأنه." /></div>

        <div style={S.grid}>
          <Field label="Date *">
            <input type="date" style={S.input} value={date} onChange={(e) => setDate(e.target.value)} />
          </Field>
          <Field label="Product Name *">
            <input style={S.input} value={productName} onChange={(e) => setProductName(e.target.value)} placeholder="e.g. Pistachio baklava · مثال: بقلاوة فستق" />
          </Field>
          <Field label="Category">
            <select style={S.input} value={category} onChange={(e) => setCategory(e.target.value)}>
              {CATEGORIES.map((c) => <option key={c} value={c}>{bi(c)}</option>)}
            </select>
          </Field>
          <Field label="Batch / Lot No.">
            <input style={S.input} value={batchNo} onChange={(e) => setBatchNo(e.target.value)} placeholder="LOT-…" />
          </Field>
          <Field label="Supplier">
            <input style={S.input} value={supplier} onChange={(e) => setSupplier(e.target.value)} placeholder="Supplier name · اسم المورد" />
          </Field>
          <Field label="Qty Rejected *">
            <div style={{ display: "flex", gap: 6 }}>
              <input type="number" min="0" step="0.01" style={{ ...S.input, flex: 1 }} value={quantity} onChange={(e) => setQuantity(e.target.value)} />
              <select style={{ ...S.input, width: 92 }} value={unit} onChange={(e) => setUnit(e.target.value)}>
                {UNITS.map((u) => <option key={u} value={u}>{bi(u)}</option>)}
              </select>
            </div>
          </Field>
          <Field label="Rejection Reason *">
            <select style={S.input} value={reason} onChange={(e) => setReason(e.target.value)}>
              {REJECTION_REASONS.map((r) => <option key={r} value={r}>{bi(r)}</option>)}
            </select>
          </Field>
          <Field label="Disposition *">
            <select style={S.input} value={disposition} onChange={(e) => setDisposition(e.target.value)}>
              {DISPOSITIONS.map((d) => <option key={d} value={d}>{bi(d)}</option>)}
            </select>
          </Field>
          <Field label="Inspected By *">
            <input style={S.input} value={inspectedBy} onChange={(e) => setInspectedBy(e.target.value)} placeholder="Inspector name · اسم المفتش" />
          </Field>
          <Field label="Approved By">
            <input style={S.input} value={approvedBy} onChange={(e) => setApprovedBy(e.target.value)} placeholder="Supervisor / manager · المشرف / المدير" />
          </Field>
        </div>

        <label style={S.label}><Bi en="Notes" /></label>
        <textarea style={S.textarea} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="More detail on the reason or the product's condition… · تفاصيل إضافية عن السبب أو حالة المنتج…" />
      </div>

      <div style={S.card}>
        <h3 style={S.title}>📷 <Bi en="Product Photos" ar="صور المنتج" /></h3>
        <div style={S.sub}><Bi en={`Upload photos that show the reason for rejection (up to ${MAX_EXTRA_IMAGES}).`} ar={`ارفع صوراً توضح سبب الرفض (حتى ${MAX_EXTRA_IMAGES}).`} /></div>

        <input
          ref={photosRef}
          type="file"
          accept="image/*"
          multiple
          onChange={(e) => addPhotos(e.target.files)}
          disabled={busy || photos.length >= MAX_EXTRA_IMAGES}
          style={S.input}
        />
        <div style={S.hint}>{photos.length} / {MAX_EXTRA_IMAGES}</div>

        {photos.length > 0 && (
          <div style={S.imgGrid}>
            {photos.map((u, i) => (
              <div key={`${u}-${i}`} style={S.imgCard}>
                <a href={u} target="_blank" rel="noreferrer">
                  <img src={u} alt={`Rejection ${i + 1}`} style={S.imgPreview} />
                </a>
                <button type="button" onClick={() => removePhotoAt(i)} style={S.imgRemove} aria-label="Remove photo">✕</button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
        <button style={S.btnSecondary} onClick={resetForm} disabled={busy}><Bi en="Reset" /></button>
        <button style={S.btnPrimary} onClick={save} disabled={busy}>
          {busy ? <>⏳ <Bi en="Saving…" /></> : <>💾 <Bi en="Save" /></>}
        </button>
      </div>

      {msg.text && <div style={S.msg(msg.kind)}>{msg.text}</div>}
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div>
      <label style={S.label}><Bi en={label} /></label>
      {children}
    </div>
  );
}

const S = {
  page: { padding: 4 },
  card: { background: "#fff", border: "1px solid #e2e8f0", borderRadius: 14, padding: 16, marginBottom: 12, boxShadow: "0 6px 18px rgba(2,6,23,0.06)" },
  title: { fontSize: 18, fontWeight: 950, color: "#0f172a", margin: "0 0 6px" },
  sub: { fontSize: 13, color: "#64748b", fontWeight: 700, marginBottom: 12 },
  grid: { display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(min(100%,240px),1fr))", gap: 12 },
  label: { display: "block", fontSize: 12, fontWeight: 900, color: "#0f172a", marginBottom: 4, marginTop: 8 },
  input: { width: "100%", padding: "9px 11px", border: "1.5px solid #cbd5e1", borderRadius: 10, fontSize: 14, fontWeight: 600, fontFamily: "inherit", boxSizing: "border-box" },
  textarea: { width: "100%", padding: "10px 12px", border: "1.5px solid #cbd5e1", borderRadius: 10, fontSize: 14, fontWeight: 600, fontFamily: "inherit", minHeight: 70, resize: "vertical", boxSizing: "border-box" },
  btnPrimary: { background: "linear-gradient(135deg,#0f766e,#0891b2)", color: "#fff", border: "none", padding: "10px 20px", borderRadius: 999, cursor: "pointer", fontWeight: 900, fontSize: 14 },
  btnSecondary: { background: "#fff", color: "#0f172a", border: "1.5px solid #cbd5e1", padding: "10px 18px", borderRadius: 999, cursor: "pointer", fontWeight: 900, fontSize: 14 },
  imgGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(110px, 1fr))", gap: 10, marginTop: 8 },
  imgCard: { position: "relative", border: "1px solid #e2e8f0", borderRadius: 10, overflow: "hidden", background: "#f8fafc" },
  imgPreview: { width: "100%", height: 90, objectFit: "cover", display: "block" },
  imgRemove: { position: "absolute", top: 4, right: 4, background: "#ef4444", color: "#fff", border: "none", borderRadius: 999, width: 22, height: 22, fontWeight: 950, fontSize: 12, cursor: "pointer" },
  hint: { fontSize: 11, color: "#64748b", fontWeight: 700, marginTop: 4 },
  msg: (kind) => ({ marginTop: 10, padding: "8px 12px", borderRadius: 8, fontWeight: 800, fontSize: 13, background: kind === "ok" ? "#dcfce7" : kind === "err" ? "#fee2e2" : "#e0f2fe", color: kind === "ok" ? "#166534" : kind === "err" ? "#991b1b" : "#075985" }),
};
