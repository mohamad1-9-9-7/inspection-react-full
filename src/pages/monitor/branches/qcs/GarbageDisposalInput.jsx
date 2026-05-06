// src/pages/monitor/branches/qcs/GarbageDisposalInput.jsx
// QCS — Garbage / Waste Disposal — Input form (simple info + invoice photo + extra images)

import React, { useRef, useState } from "react";

/* ===== API base ===== */
const API_BASE_DEFAULT = "https://inspection-server-4nvj.onrender.com";
const CRA = (typeof process !== "undefined" && process.env?.REACT_APP_API_URL) || undefined;
let VITE; try { VITE = import.meta.env?.VITE_API_URL; } catch {}
const API_BASE = String(VITE || CRA || API_BASE_DEFAULT).replace(/\/$/, "");
const IS_SAME_ORIGIN = (() => { try { return new URL(API_BASE).origin === window.location.origin; } catch { return false; } })();

const TYPE = "qcs_garbage_disposal";
const MAX_EXTRA_IMAGES = 8;

const WASTE_TYPES = [
  "General Waste / نفايات عامة",
  "Organic / عضوي",
  "Packaging / تعبئة وتغليف",
  "Cardboard / كرتون",
  "Plastic / بلاستيك",
  "Metal / معدن",
  "Hazardous / خطرة",
  "Other / أخرى",
];

const UNITS = ["kg", "bag", "ton", "container", "trip"];

const LOCATIONS = [
  "QCS Warehouse",
  "POS 10",
  "POS 11",
  "POS 15",
  "POS 19",
  "POS 24",
  "POS 26",
  "FTR 1 • Mushrif Park",
  "FTR 2 • Mamzar Park",
  "Production (PRD)",
  "OHC",
  "Other / أخرى",
];

async function uploadImage(file) {
  const fd = new FormData();
  fd.append("file", file);
  const res = await fetch(`${API_BASE}/api/images`, {
    method: "POST",
    body: fd,
    credentials: IS_SAME_ORIGIN ? "include" : "omit",
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.ok || !(data.optimized_url || data.url)) {
    throw new Error(data?.error || "Upload failed");
  }
  return data.optimized_url || data.url;
}

async function deleteImage(url) {
  if (!url) return;
  try {
    await fetch(`${API_BASE}/api/images?url=${encodeURIComponent(url)}`, {
      method: "DELETE",
      credentials: IS_SAME_ORIGIN ? "include" : "omit",
    });
  } catch {}
}

/* ===== Styles ===== */
const S = {
  page: { padding: 4 },
  card: { background: "#fff", border: "1px solid #e2e8f0", borderRadius: 14, padding: 16, marginBottom: 12, boxShadow: "0 6px 18px rgba(2,6,23,0.06)" },
  title: { fontSize: 18, fontWeight: 950, color: "#0f172a", margin: "0 0 6px" },
  sub: { fontSize: 13, color: "#64748b", fontWeight: 700, marginBottom: 12 },
  label: { display: "block", fontSize: 12, fontWeight: 900, color: "#0f172a", marginBottom: 4, marginTop: 8 },
  input: { width: "100%", padding: "9px 11px", border: "1.5px solid #cbd5e1", borderRadius: 10, fontSize: 14, fontWeight: 600, fontFamily: "inherit", boxSizing: "border-box" },
  textarea: { width: "100%", padding: "10px 12px", border: "1.5px solid #cbd5e1", borderRadius: 10, fontSize: 14, fontWeight: 600, fontFamily: "inherit", minHeight: 70, resize: "vertical", boxSizing: "border-box" },
  row2: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 },
  row3: { display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 },
  btnPrimary: { background: "linear-gradient(180deg, #22c55e, #16a34a)", color: "#fff", border: "1.5px solid #15803d", padding: "10px 18px", borderRadius: 999, cursor: "pointer", fontWeight: 900, fontSize: 14 },
  btnSecondary: { background: "#fff", color: "#0f172a", border: "1.5px solid #cbd5e1", padding: "10px 18px", borderRadius: 999, cursor: "pointer", fontWeight: 900, fontSize: 14 },
  btnDanger: { background: "#ef4444", color: "#fff", border: "none", borderRadius: 6, padding: "4px 10px", fontWeight: 800, fontSize: 12, cursor: "pointer" },
  imgGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(110px, 1fr))", gap: 10, marginTop: 8 },
  imgCard: { position: "relative", border: "1px solid #e2e8f0", borderRadius: 10, overflow: "hidden", background: "#f8fafc" },
  imgPreview: { width: "100%", height: 90, objectFit: "cover", display: "block" },
  imgRemove: { position: "absolute", top: 4, right: 4, background: "#ef4444", color: "#fff", border: "none", borderRadius: 999, width: 22, height: 22, fontWeight: 950, fontSize: 12, cursor: "pointer" },
  hint: { fontSize: 11, color: "#64748b", fontWeight: 700, marginTop: 4 },
  msg: (kind) => ({ marginTop: 10, padding: "8px 12px", borderRadius: 8, fontWeight: 800, fontSize: 13, background: kind === "ok" ? "#dcfce7" : kind === "err" ? "#fee2e2" : "#e0f2fe", color: kind === "ok" ? "#166534" : kind === "err" ? "#991b1b" : "#075985" }),
};

const today = () => {
  try { return new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Dubai" }); }
  catch {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  }
};

export default function GarbageDisposalInput() {
  const [date, setDate] = useState(today());
  const [location, setLocation] = useState("QCS Warehouse");
  const [wasteType, setWasteType] = useState(WASTE_TYPES[0]);
  const [quantity, setQuantity] = useState("");
  const [unit, setUnit] = useState("kg");
  const [vendorName, setVendorName] = useState("");
  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [invoiceAmount, setInvoiceAmount] = useState("");
  const [disposedBy, setDisposedBy] = useState("");
  const [supervisor, setSupervisor] = useState("");
  const [notes, setNotes] = useState("");

  const [invoiceImage, setInvoiceImage] = useState("");
  const [extraImages, setExtraImages] = useState([]);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState({ kind: "", text: "" });

  const invoiceRef = useRef(null);
  const extrasRef = useRef(null);

  function showMsg(kind, text, ms = 2500) {
    setMsg({ kind, text });
    if (ms) setTimeout(() => setMsg({ kind: "", text: "" }), ms);
  }

  async function pickInvoiceImage(file) {
    if (!file) return;
    if (!String(file.type || "").startsWith("image/")) {
      showMsg("err", "الملف لازم يكون صورة");
      return;
    }
    try {
      setBusy(true);
      if (invoiceImage) await deleteImage(invoiceImage);
      const url = await uploadImage(file);
      setInvoiceImage(url);
      showMsg("ok", "✅ تم رفع صورة الفاتورة");
    } catch (e) {
      showMsg("err", "فشل رفع الفاتورة: " + (e?.message || e));
    } finally {
      setBusy(false);
      if (invoiceRef.current) invoiceRef.current.value = "";
    }
  }

  async function clearInvoiceImage() {
    if (!invoiceImage) return;
    const url = invoiceImage;
    setInvoiceImage("");
    await deleteImage(url);
  }

  async function addExtraImages(fileList) {
    const files = Array.from(fileList || []).filter((f) => String(f.type || "").startsWith("image/"));
    if (!files.length) return;
    const remaining = MAX_EXTRA_IMAGES - extraImages.length;
    if (remaining <= 0) { showMsg("err", `الحد الأقصى ${MAX_EXTRA_IMAGES} صور`); return; }
    try {
      setBusy(true);
      const urls = [];
      for (const f of files.slice(0, remaining)) {
        try { const u = await uploadImage(f); if (u) urls.push(u); } catch {}
      }
      if (urls.length) {
        setExtraImages((prev) => [...prev, ...urls].slice(0, MAX_EXTRA_IMAGES));
        showMsg("ok", `✅ تم رفع ${urls.length} صورة`);
      } else {
        showMsg("err", "ما تم رفع أي صورة");
      }
    } finally {
      setBusy(false);
      if (extrasRef.current) extrasRef.current.value = "";
    }
  }

  async function removeExtraAt(i) {
    const url = extraImages[i];
    setExtraImages((prev) => prev.filter((_, idx) => idx !== i));
    if (url) await deleteImage(url);
  }

  function resetForm() {
    setDate(today());
    setLocation("QCS Warehouse");
    setWasteType(WASTE_TYPES[0]);
    setQuantity("");
    setUnit("kg");
    setVendorName("");
    setInvoiceNumber("");
    setInvoiceAmount("");
    setDisposedBy("");
    setSupervisor("");
    setNotes("");
    setInvoiceImage("");
    setExtraImages([]);
  }

  async function save() {
    if (!date) { showMsg("err", "اختر التاريخ"); return; }
    if (!quantity) { showMsg("err", "أدخل الكمية"); return; }
    if (!disposedBy.trim()) { showMsg("err", "أدخل اسم الشخص الذي قام بالتخلص"); return; }

    const payload = {
      reportDate: date,
      location,
      wasteType,
      quantity: Number(quantity) || 0,
      unit,
      vendor: { name: vendorName, invoiceNumber, invoiceAmount: Number(invoiceAmount) || 0 },
      disposedBy,
      supervisor,
      notes,
      images: { invoice: invoiceImage, extras: extraImages },
      savedAt: Date.now(),
    };

    try {
      setBusy(true);
      showMsg("info", "جاري الحفظ...");
      const res = await fetch(`${API_BASE}/api/reports`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: IS_SAME_ORIGIN ? "include" : "omit",
        body: JSON.stringify({ reporter: "qcs", type: TYPE, payload }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      showMsg("ok", "✅ تم حفظ السجل بنجاح");
      resetForm();
    } catch (e) {
      showMsg("err", "❌ فشل الحفظ: " + (e?.message || e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={S.page}>
      <div style={S.card}>
        <h2 style={S.title}>🗑️ سجل التخلص من النفايات / Garbage Disposal Log</h2>
        <div style={S.sub}>أدخل بيانات عملية التخلص من النفايات + صورة الفاتورة</div>

        <div style={S.row3}>
          <div>
            <label style={S.label}>التاريخ / Date *</label>
            <input type="date" style={S.input} value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
          <div>
            <label style={S.label}>الموقع / Location</label>
            <select style={S.input} value={location} onChange={(e) => setLocation(e.target.value)}>
              {LOCATIONS.map((loc) => <option key={loc} value={loc}>{loc}</option>)}
            </select>
          </div>
          <div>
            <label style={S.label}>نوع النفايات / Waste Type</label>
            <select style={S.input} value={wasteType} onChange={(e) => setWasteType(e.target.value)}>
              {WASTE_TYPES.map((w) => <option key={w} value={w}>{w}</option>)}
            </select>
          </div>
        </div>

        <div style={S.row3}>
          <div>
            <label style={S.label}>الكمية / Quantity *</label>
            <input type="number" min="0" step="0.01" style={S.input} value={quantity} onChange={(e) => setQuantity(e.target.value)} />
          </div>
          <div>
            <label style={S.label}>الوحدة / Unit</label>
            <select style={S.input} value={unit} onChange={(e) => setUnit(e.target.value)}>
              {UNITS.map((u) => <option key={u} value={u}>{u}</option>)}
            </select>
          </div>
          <div>
            <label style={S.label}>اسم الشركة / Vendor Name</label>
            <input style={S.input} value={vendorName} onChange={(e) => setVendorName(e.target.value)} placeholder="شركة جمع النفايات..." />
          </div>
        </div>

        <div style={S.row3}>
          <div>
            <label style={S.label}>رقم الفاتورة / Invoice No.</label>
            <input style={S.input} value={invoiceNumber} onChange={(e) => setInvoiceNumber(e.target.value)} placeholder="INV-..." />
          </div>
          <div>
            <label style={S.label}>قيمة الفاتورة / Invoice Amount (AED)</label>
            <input type="number" min="0" step="0.01" style={S.input} value={invoiceAmount} onChange={(e) => setInvoiceAmount(e.target.value)} />
          </div>
          <div>
            <label style={S.label}>قام بالتخلص / Disposed By *</label>
            <input style={S.input} value={disposedBy} onChange={(e) => setDisposedBy(e.target.value)} placeholder="اسم الموظف" />
          </div>
        </div>

        <label style={S.label}>المشرف / Supervisor</label>
        <input style={S.input} value={supervisor} onChange={(e) => setSupervisor(e.target.value)} placeholder="اسم المشرف" />

        <label style={S.label}>ملاحظات / Notes</label>
        <textarea style={S.textarea} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="ملاحظات إضافية..." />
      </div>

      <div style={S.card}>
        <h3 style={S.title}>📄 صورة الفاتورة / Invoice Photo</h3>
        <div style={S.sub}>ارفع صورة فاتورة شركة التخلص من النفايات</div>

        {!invoiceImage && (
          <input
            ref={invoiceRef}
            type="file"
            accept="image/*"
            onChange={(e) => pickInvoiceImage(e.target.files?.[0])}
            disabled={busy}
            style={S.input}
          />
        )}
        {invoiceImage && (
          <div style={{ ...S.imgCard, maxWidth: 320, marginTop: 6 }}>
            <a href={invoiceImage} target="_blank" rel="noreferrer">
              <img src={invoiceImage} alt="Invoice" style={{ ...S.imgPreview, height: 220 }} />
            </a>
            <button type="button" onClick={clearInvoiceImage} style={S.imgRemove} title="حذف">✕</button>
          </div>
        )}
      </div>

      <div style={S.card}>
        <h3 style={S.title}>📷 صور إضافية / Extra Photos (اختياري)</h3>
        <div style={S.sub}>صور للنفايات أو الحاويات قبل/بعد الاستلام (حتى {MAX_EXTRA_IMAGES} صور)</div>

        <input
          ref={extrasRef}
          type="file"
          accept="image/*"
          multiple
          onChange={(e) => addExtraImages(e.target.files)}
          disabled={busy || extraImages.length >= MAX_EXTRA_IMAGES}
          style={S.input}
        />
        <div style={S.hint}>{extraImages.length} / {MAX_EXTRA_IMAGES}</div>

        {extraImages.length > 0 && (
          <div style={S.imgGrid}>
            {extraImages.map((u, i) => (
              <div key={`${u}-${i}`} style={S.imgCard}>
                <a href={u} target="_blank" rel="noreferrer">
                  <img src={u} alt={`Extra ${i + 1}`} style={S.imgPreview} />
                </a>
                <button type="button" onClick={() => removeExtraAt(i)} style={S.imgRemove}>✕</button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
        <button style={S.btnSecondary} onClick={resetForm} disabled={busy}>إلغاء / Reset</button>
        <button style={S.btnPrimary} onClick={save} disabled={busy}>
          {busy ? "⏳ جاري..." : "💾 حفظ / Save"}
        </button>
      </div>

      {msg.text && <div style={S.msg(msg.kind)}>{msg.text}</div>}
    </div>
  );
}
