// src/pages/monitor/branches/qcs/ProductRejectionInput.jsx
// QCS — Product Rejection Report — Input form

import React, { useRef, useState } from "react";

const API_BASE_DEFAULT = "https://inspection-server-4nvj.onrender.com";
const CRA = (typeof process !== "undefined" && process.env?.REACT_APP_API_URL) || undefined;
let VITE; try { VITE = import.meta.env?.VITE_API_URL; } catch {}
const API_BASE = String(VITE || CRA || API_BASE_DEFAULT).replace(/\/$/, "");
const IS_SAME_ORIGIN = (() => { try { return new URL(API_BASE).origin === window.location.origin; } catch { return false; } })();

const TYPE = "qcs_product_rejection";
const MAX_EXTRA_IMAGES = 8;

const CATEGORIES = [
  "Meat / لحوم",
  "Poultry / دواجن",
  "Seafood / مأكولات بحرية",
  "Vegetables & Fruits / خضروات وفواكه",
  "Dairy / منتجات الألبان",
  "Dry Goods / مواد جافة",
  "Packaging Material / مواد تعبئة",
  "Ingredients / مكونات",
  "Other / أخرى",
];

const REJECTION_REASONS = [
  "Expired / منتهي الصلاحية",
  "Near Expiry / انتهاء صلاحية قريب جداً",
  "Temperature Abuse / إساءة التخزين الحراري",
  "Physical Damage / تلف مادي",
  "Contamination / تلوث",
  "Wrong Specification / مواصفات خاطئة",
  "Label Missing / ملصق مفقود",
  "Pest Damage / أضرار حشرات",
  "Off Odour / رائحة غير طبيعية",
  "Abnormal Colour / لون غير طبيعي",
  "Improper Packaging / تعبئة غير سليمة",
  "Short Weight / وزن ناقص",
  "Other / أخرى",
];

const DISPOSITIONS = [
  "Returned to Supplier / إعادة للمورد",
  "Destroyed / إتلاف",
  "Quarantine / عزل",
  "Downgraded / تخفيض الدرجة",
];

const UNITS = ["kg", "pcs", "box", "carton", "bag", "litre"];

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
  btnPrimary: { background: "linear-gradient(180deg, #dc2626, #b91c1c)", color: "#fff", border: "1.5px solid #991b1b", padding: "10px 18px", borderRadius: 999, cursor: "pointer", fontWeight: 900, fontSize: 14 },
  btnSecondary: { background: "#fff", color: "#0f172a", border: "1.5px solid #cbd5e1", padding: "10px 18px", borderRadius: 999, cursor: "pointer", fontWeight: 900, fontSize: 14 },
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

  function showMsg(kind, text, ms = 2500) {
    setMsg({ kind, text });
    if (ms) setTimeout(() => setMsg({ kind: "", text: "" }), ms);
  }

  async function addPhotos(fileList) {
    const files = Array.from(fileList || []).filter((f) => String(f.type || "").startsWith("image/"));
    if (!files.length) return;
    const remaining = MAX_EXTRA_IMAGES - photos.length;
    if (remaining <= 0) { showMsg("err", `الحد الأقصى ${MAX_EXTRA_IMAGES} صور`); return; }
    try {
      setBusy(true);
      const urls = [];
      for (const f of files.slice(0, remaining)) {
        try { const u = await uploadImage(f); if (u) urls.push(u); } catch {}
      }
      if (urls.length) {
        setPhotos((prev) => [...prev, ...urls].slice(0, MAX_EXTRA_IMAGES));
        showMsg("ok", `✅ تم رفع ${urls.length} صورة`);
      } else {
        showMsg("err", "ما تم رفع أي صورة");
      }
    } finally {
      setBusy(false);
      if (photosRef.current) photosRef.current.value = "";
    }
  }

  async function removePhotoAt(i) {
    const url = photos[i];
    setPhotos((prev) => prev.filter((_, idx) => idx !== i));
    if (url) await deleteImage(url);
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
    if (!date) { showMsg("err", "اختر التاريخ"); return; }
    if (!productName.trim()) { showMsg("err", "أدخل اسم المنتج"); return; }
    if (!quantity) { showMsg("err", "أدخل الكمية المرفوضة"); return; }
    if (!inspectedBy.trim()) { showMsg("err", "أدخل اسم المفتش"); return; }

    const payload = {
      reportDate: date,
      productName,
      category,
      batchNo,
      supplier,
      quantity: Number(quantity) || 0,
      unit,
      reason,
      disposition,
      inspectedBy,
      approvedBy,
      notes,
      photos,
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
      showMsg("ok", "✅ تم حفظ تقرير الرفض بنجاح");
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
        <h2 style={S.title}>🚫 تقرير رفض المنتجات / Product Rejection Report</h2>
        <div style={S.sub}>أدخل بيانات المنتج المرفوض وسبب الرفض والإجراء المتخذ</div>

        <div style={S.row3}>
          <div>
            <label style={S.label}>التاريخ / Date *</label>
            <input type="date" style={S.input} value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
          <div>
            <label style={S.label}>اسم المنتج / Product Name *</label>
            <input style={S.input} value={productName} onChange={(e) => setProductName(e.target.value)} placeholder="مثال: دجاج مبرد..." />
          </div>
          <div>
            <label style={S.label}>الفئة / Category</label>
            <select style={S.input} value={category} onChange={(e) => setCategory(e.target.value)}>
              {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
        </div>

        <div style={S.row3}>
          <div>
            <label style={S.label}>رقم الدفعة / Batch No.</label>
            <input style={S.input} value={batchNo} onChange={(e) => setBatchNo(e.target.value)} placeholder="LOT-..." />
          </div>
          <div>
            <label style={S.label}>المورد / Supplier</label>
            <input style={S.input} value={supplier} onChange={(e) => setSupplier(e.target.value)} placeholder="اسم المورد" />
          </div>
          <div>
            <label style={S.label}>الكمية المرفوضة / Qty Rejected *</label>
            <div style={{ display: "flex", gap: 6 }}>
              <input type="number" min="0" step="0.01" style={{ ...S.input, flex: 1 }} value={quantity} onChange={(e) => setQuantity(e.target.value)} />
              <select style={{ ...S.input, width: 90 }} value={unit} onChange={(e) => setUnit(e.target.value)}>
                {UNITS.map((u) => <option key={u} value={u}>{u}</option>)}
              </select>
            </div>
          </div>
        </div>

        <div style={S.row2}>
          <div>
            <label style={S.label}>سبب الرفض / Rejection Reason *</label>
            <select style={S.input} value={reason} onChange={(e) => setReason(e.target.value)}>
              {REJECTION_REASONS.map((r) => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>
          <div>
            <label style={S.label}>الإجراء المتخذ / Disposition *</label>
            <select style={S.input} value={disposition} onChange={(e) => setDisposition(e.target.value)}>
              {DISPOSITIONS.map((d) => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>
        </div>

        <div style={S.row2}>
          <div>
            <label style={S.label}>فحص بواسطة / Inspected By *</label>
            <input style={S.input} value={inspectedBy} onChange={(e) => setInspectedBy(e.target.value)} placeholder="اسم المفتش" />
          </div>
          <div>
            <label style={S.label}>اعتمد بواسطة / Approved By</label>
            <input style={S.input} value={approvedBy} onChange={(e) => setApprovedBy(e.target.value)} placeholder="اسم المشرف / المدير" />
          </div>
        </div>

        <label style={S.label}>ملاحظات / Notes</label>
        <textarea style={S.textarea} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="تفاصيل إضافية عن سبب الرفض أو الحالة..." />
      </div>

      <div style={S.card}>
        <h3 style={S.title}>📷 صور المنتج المرفوض / Product Photos</h3>
        <div style={S.sub}>ارفع صوراً توضح سبب الرفض (حتى {MAX_EXTRA_IMAGES} صور)</div>

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
                <button type="button" onClick={() => removePhotoAt(i)} style={S.imgRemove}>✕</button>
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
