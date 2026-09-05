// src/pages/MeatDailyInput.jsx
import React, { useState, useRef, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ItemCodeInput,
  ItemNameInput,
} from "./monitor/branches/_shared/CodedProductField";

/* ========== API ========== */
const API_BASE =
  process.env.REACT_APP_API_URL || "https://inspection-server-4nvj.onrender.com";

/* رفع صورة للسيرفر -> يرجّع رابط Cloudinary (المضغوط إن وُجد) */
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

/* حذف صورة من التخزين عبر السيرفر (Cloudinary) */
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

async function saveDayToServer(reportDate, items) {
  const payload = {
    reporter: "anonymous",
    type: "meat_daily",
    payload: { reportDate, items, _clientSavedAt: Date.now() },
  };

  const attempts = [
    { url: `${API_BASE}/api/reports`, method: "PUT", body: JSON.stringify(payload) },
    {
      url: `${API_BASE}/api/reports/meat_daily?reportDate=${encodeURIComponent(reportDate)}`,
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
      if (res.ok) return await res.json().catch(() => ({ ok: true }));
      lastErr = new Error(`${a.method} ${a.url} -> ${res.status}`);
    } catch (e) {
      lastErr = e;
    }
  }
  throw lastErr || new Error("Save failed");
}

/* ========== Helpers ========== */
const STATUS = ["Near Expiry", "Expired", "Color change", "Found smell", "OK"];
const QTY_TYPES = ["KG", "PCS", "PLT"];

/* لون لكل حالة — على الجوال البطاقة نفسها تحمل اللون فيُقرأ الوضع بنظرة.
   One colour per status: on a phone the card itself carries it, so the state
   of a line reads at a glance without opening anything. */
const STATUS_TONE = {
  "Near Expiry":  { bg: "#fef3c7", fg: "#92400e", edge: "#f59e0b" },
  Expired:        { bg: "#fee2e2", fg: "#991b1b", edge: "#ef4444" },
  "Color change": { bg: "#ffe4e6", fg: "#9f1239", edge: "#fb7185" },
  "Found smell":  { bg: "#ede9fe", fg: "#5b21b6", edge: "#8b5cf6" },
  OK:             { bg: "#dcfce7", fg: "#166534", edge: "#22c55e" },
};
const toneOf = (s) => STATUS_TONE[s] || { bg: "#eef2ff", fg: "#1e293b", edge: "#c7d2fe" };

const baseRow = () => ({
  // كود المنتج من الكتالوج — بدونه لا يستطيع تتبّع المنتج ربط هذا السجل
  // بالشحنة الواردة ولا بسجل استلام الفرع.
  // The catalog item code: without it Product Traceability cannot tie this
  // line to the incoming shipment or to the branch receiving log — a name
  // typed by hand only matches when it happens to be spelled identically.
  itemCode: "",
  productName: "",
  quantity: "",
  qtyType: "KG",
  status: "Near Expiry",
  expiry: "",
  remarks: "",
  images: [], // ✅ دعم الصور داخل الإدخال
});

/* شاشة الجوال تُرسم كبطاقات، وشاشة المكتب تبقى جدولاً كما هي.
   Phones get one card per line; desktop keeps the original table. The break
   point is where ten columns stop fitting without a horizontal drag. */
const MOBILE_Q = "(max-width: 820px)";
function useIsMobile() {
  const [mobile, setMobile] = useState(
    () => typeof window !== "undefined" && window.matchMedia(MOBILE_Q).matches
  );
  useEffect(() => {
    const mq = window.matchMedia(MOBILE_Q);
    const on = (e) => setMobile(e.matches);
    if (mq.addEventListener) mq.addEventListener("change", on);
    else mq.addListener(on);
    return () => {
      if (mq.removeEventListener) mq.removeEventListener("change", on);
      else mq.removeListener(on);
    };
  }, []);
  return mobile;
}

/* ========= Images manager modal ========= */
function ImageManagerModal({ open, row, onClose, onAddImages, onRemoveImage, mobile }) {
  const [previewSrc, setPreviewSrc] = useState("");
  const [busy, setBusy] = useState("");
  const pickRef = useRef(null);
  const camRef = useRef(null);

  useEffect(() => {
    if (!open) { setPreviewSrc(""); setBusy(""); }
    const onEsc = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onEsc);
    return () => window.removeEventListener("keydown", onEsc);
  }, [open, onClose]);

  /* قفل تمرير الصفحة خلف المعرض — بدونه يتحرك ما تحت النافذة على الجوال */
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, [open]);

  if (!open) return null;

  const handleFiles = async (e) => {
    const files = Array.from(e.target.files || []);
    e.target.value = "";
    if (!files.length) return;

    const urls = [];
    for (let i = 0; i < files.length; i++) {
      setBusy(`⏳ Uploading ${i + 1} / ${files.length}…`);
      try {
        urls.push(await uploadViaServer(files[i]));
      } catch (err) {
        console.error("upload failed:", err);
      }
    }
    setBusy("");
    if (urls.length) onAddImages(urls);
  };

  return (
    <div className="mdi-modal-back" onClick={onClose}>
      <div
        className={`mdi-modal-card${mobile ? " is-mobile" : ""}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mdi-modal-head">
          <div className="mdi-modal-title">
            🖼️ Product Images{row?.productName ? ` — ${row.productName}` : ""}
          </div>
          <button onClick={onClose} className="mdi-modal-close" aria-label="Close">✕</button>
        </div>

        <div className="mdi-modal-body">
          {previewSrc && (
            <div className="mdi-preview">
              <img src={previewSrc} alt="preview" />
              <button className="mdi-preview-close" onClick={() => setPreviewSrc("")}>
                ✕ Close preview
              </button>
            </div>
          )}

          <div className="mdi-upload-row">
            {/* الكاميرا أولاً — على الجوال هي الطريقة الطبيعية لتوثيق الصنف */}
            <button className="mdi-btn mdi-btn-blue" onClick={() => camRef.current?.click()}>
              📷 Take photo
            </button>
            <button className="mdi-btn mdi-btn-ghost" onClick={() => pickRef.current?.click()}>
              🖼️ From gallery
            </button>
            <input
              ref={camRef}
              type="file"
              accept="image/*"
              capture="environment"
              onChange={handleFiles}
              style={{ display: "none" }}
            />
            <input
              ref={pickRef}
              type="file"
              accept="image/*"
              multiple
              onChange={handleFiles}
              style={{ display: "none" }}
            />
          </div>

          <div className="mdi-hint">
            {busy || "Unlimited images per product (server compresses automatically)."}
          </div>

          <div className="mdi-thumbs">
            {(row?.images || []).length === 0 ? (
              <div className="mdi-empty">No images yet.</div>
            ) : (
              row.images.map((src, i) => (
                <div key={i} className="mdi-thumb" title={`Image ${i + 1}`}>
                  <img src={src} alt={`img-${i}`} onClick={() => setPreviewSrc(src)} />
                  <button
                    title="Remove"
                    aria-label="Remove image"
                    onClick={() => onRemoveImage(i)}
                    className="mdi-thumb-x"
                  >
                    ✕
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function MeatDailyInput() {
  const navigate = useNavigate();
  const mobile = useIsMobile();
  const [reportDate, setReportDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [rows, setRows] = useState([baseRow()]);
  const [msg, setMsg] = useState("");
  const [emailAfterSave, setEmailAfterSave] = useState(true);

  /* Authentication handled at app login — no per-page gate */

  // صور: حالة المودال + أي صف مفتوح
  const [imageModalOpen, setImageModalOpen] = useState(false);
  const [imageRowIndex, setImageRowIndex] = useState(-1);

  /* ===== page logic ===== */
  const addRow = () => setRows((p) => [...p, baseRow()]);
  /* آخر صف لا يُحذف بل يُفرَّغ — الشاشة لا تبقى فارغة بلا مدخل */
  const delRow = (idx) =>
    setRows((p) => (p.length <= 1 ? [baseRow()] : p.filter((_, i) => i !== idx)));
  const setVal = (i, k, v) => setRows((p) => p.map((r, idx) => (idx === i ? { ...r, [k]: v } : r)));

  /** Code and name are one pair: picking either side fills the other, so the
   *  two can never drift apart on the same row. */
  const setProduct = (i, { code, name }) =>
    setRows((p) =>
      p.map((r, idx) => (idx === i ? { ...r, itemCode: code ?? "", productName: name ?? "" } : r))
    );

  // فتح/إغلاق مدير الصور
  const openImagesFor = (i) => { setImageRowIndex(i); setImageModalOpen(true); };
  const closeImages = () => setImageModalOpen(false);

  // إضافة روابط صور (بعد رفعها) للصف المفتوح
  const addImagesToRow = async (urls) => {
    if (imageRowIndex < 0) return;
    setRows((prev) => prev.map((r, i) =>
      i === imageRowIndex ? { ...r, images: [...(r.images || []), ...urls] } : r
    ));
    setMsg("✅ Images added.");
    setTimeout(() => setMsg(""), 2000);
  };

  // إزالة صورة واحدة من الصف مع محاولة حذفها من التخزين
  const removeImageFromRow = async (imgIndex) => {
    if (imageRowIndex < 0) return;
    try {
      const url = rows?.[imageRowIndex]?.images?.[imgIndex];
      if (url) {
        try { await deleteImage(url); }
        catch (e) { console.warn("Storage delete failed; un-linking anyway."); }
      }
      setRows((prev) => prev.map((r, i) => {
        if (i !== imageRowIndex) return r;
        const next = Array.isArray(r.images) ? [...r.images] : [];
        next.splice(imgIndex, 1);
        return { ...r, images: next };
      }));
      setMsg("✅ Image removed.");
    } catch (e) {
      console.error(e);
      setMsg("❌ Failed to remove image.");
    } finally {
      setTimeout(() => setMsg(""), 2000);
    }
  };

  const handleSave = async () => {
    if (!reportDate) return setMsg("❌ Please enter the report date.");

    const cleaned = rows
      .map((r) => ({
        ...r,
        itemCode: (r.itemCode || "").trim(),
        productName: (r.productName || "").trim(),
        qtyType: (r.qtyType || "").trim(),
        status: (r.status || "").trim(),
        expiry: (r.expiry || "").trim(),
        remarks: (r.remarks || "").trim(),
        quantity: Number(r.quantity || 0),
        images: Array.isArray(r.images) ? r.images : [], // ✅ احفظ الصور
      }))
      .filter((r) => r.productName && r.quantity > 0);

    if (!cleaned.length) return setMsg("❌ Add at least one valid row.");

    try {
      setMsg("⏳ Saving…");
      await saveDayToServer(reportDate, cleaned);
      if (emailAfterSave) {
        /* Hand off to the Browse page for this day with the send modal open.
           It owns the full email flow (PDF, template, recipients, send). */
        setMsg("✅ Saved. Opening email…");
        navigate(`/meat-daily/browse?tab=browse&d=${encodeURIComponent(reportDate)}&email=1`);
        return;
      }
      setMsg("✅ Saved successfully.");
    } catch (e) {
      console.error(e);
      setMsg("❌ Failed to save to server.");
    } finally {
      setTimeout(() => setMsg(""), 2500);
    }
  };

  const s = styles;
  /* عدّاد الأصناف الجاهزة للحفظ — على الجوال البطاقات لا تُرى دفعةً واحدة */
  const ready = rows.filter((r) => (r.productName || "").trim() && Number(r.quantity) > 0).length;

  /* ===== بطاقة صنف واحد (الجوال) ===== */
  const renderCard = (r, i) => {
    const tone = toneOf(r.status);
    const imgCount = Array.isArray(r.images) ? r.images.length : 0;
    return (
      <div className="mdi-card" key={i} style={{ borderInlineStartColor: tone.edge }}>
        <div className="mdi-card-head">
          <span className="mdi-num">{i + 1}</span>
          <span className="mdi-card-name">{r.productName || "New item"}</span>
          <button className="mdi-x" onClick={() => delRow(i)} title="Delete row" aria-label="Delete row">
            🗑️
          </button>
        </div>

        <div className="mdi-grid">
          <label className="mdi-f span2">
            <span className="mdi-lbl">Product name</span>
            <ItemNameInput
              code={r.itemCode || ""}
              name={r.productName || ""}
              onChange={(pair) => setProduct(i, pair)}
              className="mdi-in"
              style={CODED_FIELD_STYLE}
              placeholder="Search code or product…"
            />
          </label>

          <label className="mdi-f">
            <span className="mdi-lbl">Item code</span>
            <ItemCodeInput
              code={r.itemCode || ""}
              name={r.productName || ""}
              onChange={(pair) => setProduct(i, pair)}
              className="mdi-in"
              style={CODED_FIELD_STYLE}
              placeholder="Code"
              title="كود المنتج من الكتالوج / Item code from the product catalog"
            />
          </label>

          <label className="mdi-f">
            <span className="mdi-lbl">Quantity</span>
            <div className="mdi-qty">
              <input
                type="number"
                inputMode="decimal"
                min="0"
                value={r.quantity}
                onChange={(e) => setVal(i, "quantity", e.target.value)}
                className="mdi-in"
                placeholder="0"
                aria-label="Quantity"
              />
              <select
                value={r.qtyType}
                onChange={(e) => setVal(i, "qtyType", e.target.value)}
                className="mdi-in mdi-unit"
                aria-label="Quantity Type"
              >
                {QTY_TYPES.map((x) => (
                  <option key={x} value={x}>{x}</option>
                ))}
              </select>
            </div>
          </label>

          <label className="mdi-f">
            <span className="mdi-lbl">Status</span>
            <select
              value={r.status}
              onChange={(e) => setVal(i, "status", e.target.value)}
              className="mdi-in"
              style={{ background: tone.bg, color: tone.fg, fontWeight: 800 }}
              aria-label="Status"
            >
              {STATUS.map((x) => (
                <option key={x} value={x}>{x}</option>
              ))}
            </select>
          </label>

          <label className="mdi-f">
            <span className="mdi-lbl">Expiry date</span>
            <input
              type="date"
              value={r.expiry}
              onChange={(e) => setVal(i, "expiry", e.target.value)}
              className="mdi-in"
              aria-label="Expiry Date"
            />
          </label>

          <label className="mdi-f span2">
            <span className="mdi-lbl">Remarks</span>
            <input
              value={r.remarks}
              onChange={(e) => setVal(i, "remarks", e.target.value)}
              className="mdi-in"
              placeholder="Optional note…"
              aria-label="Remarks"
            />
          </label>

          <div className="mdi-f span2">
            <button
              onClick={() => openImagesFor(i)}
              className={`mdi-btn mdi-photos${imgCount ? " has" : ""}`}
              title="Manage images"
            >
              📷 {imgCount ? `Photos (${imgCount})` : "Add photos"}
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="mdi" style={{ ...s.page, ...(mobile ? s.pageMobile : null) }}>
      <style>{MDI_CSS}</style>

      <h2 className="mdi-title" style={s.h2}>📝 Meat Daily Status — Input</h2>

      {/* Controls */}
      <div className="mdi-controls">
        <label className="mdi-f mdi-date-f">
          <span className="mdi-lbl">Report date</span>
          <input
            type="date"
            value={reportDate}
            onChange={(e) => setReportDate(e.target.value)}
            className="mdi-in"
            aria-label="Report Date"
          />
        </label>

        <Link to="/meat-daily/view" className="mdi-view-btn" title="View meat daily reports">
          <span>📄</span>
          <span>View Reports</span>
        </Link>
      </div>

      {mobile ? (
        /* ===== الجوال: بطاقة لكل صنف ===== */
        <div className="mdi-cards">
          {rows.map(renderCard)}
          <button onClick={addRow} className="mdi-btn mdi-add">➕ Add new item</button>
        </div>
      ) : (
        /* ===== المكتب: الجدول كما هو ===== */
        <div style={{ ...s.card, overflowX: "auto" }}>
          <table style={s.table}>
            <thead>
              <tr>
                <th style={s.th}>#</th>
                <th style={s.th}>ITEM CODE</th>
                <th style={s.th}>PRODUCT NAME</th>
                <th style={s.th}>QUANTITY</th>
                <th style={s.th}>QTY TYPE</th>
                <th style={s.th}>STATUS</th>
                <th style={s.th}>EXPIRY DATE</th>
                <th style={s.th}>REMARKS</th>
                <th style={s.th}>IMAGES</th>{/* ✅ عمود الصور */}
                <th style={s.th}></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={i}>
                  <td style={s.td}>{i + 1}</td>
                  <td style={s.td}>
                    <ItemCodeInput
                      code={r.itemCode || ""}
                      name={r.productName || ""}
                      onChange={(pair) => setProduct(i, pair)}
                      style={s.in}
                      placeholder="Code"
                      title="كود المنتج من الكتالوج / Item code from the product catalog"
                    />
                  </td>
                  <td style={s.td}>
                    <ItemNameInput
                      code={r.itemCode || ""}
                      name={r.productName || ""}
                      onChange={(pair) => setProduct(i, pair)}
                      style={s.in}
                      placeholder="Search code or product…"
                    />
                  </td>
                  <td style={s.td}>
                    <input
                      type="number"
                      min="0"
                      value={r.quantity}
                      onChange={(e) => setVal(i, "quantity", e.target.value)}
                      style={s.in}
                      aria-label="Quantity"
                    />
                  </td>
                  <td style={s.td}>
                    <select
                      value={r.qtyType}
                      onChange={(e) => setVal(i, "qtyType", e.target.value)}
                      style={s.sel}
                      aria-label="Quantity Type"
                    >
                      {QTY_TYPES.map((x) => (
                        <option key={x} value={x}>{x}</option>
                      ))}
                    </select>
                  </td>
                  <td style={s.td}>
                    <select
                      value={r.status}
                      onChange={(e) => setVal(i, "status", e.target.value)}
                      style={s.sel}
                      aria-label="Status"
                    >
                      {STATUS.map((x) => (
                        <option key={x} value={x}>{x}</option>
                      ))}
                    </select>
                  </td>
                  <td style={s.td}>
                    <input
                      type="date"
                      value={r.expiry}
                      onChange={(e) => setVal(i, "expiry", e.target.value)}
                      style={s.in}
                      aria-label="Expiry Date"
                    />
                  </td>
                  <td style={s.td}>
                    <input
                      value={r.remarks}
                      onChange={(e) => setVal(i, "remarks", e.target.value)}
                      style={s.in}
                      aria-label="Remarks"
                    />
                  </td>

                  {/* زر إدارة الصور لكل صف */}
                  <td style={s.td}>
                    <button
                      onClick={() => openImagesFor(i)}
                      style={s.btnBlue}
                      title="Manage images"
                    >
                      🖼️ Images ({Array.isArray(r.images) ? r.images.length : 0})
                    </button>
                  </td>

                  <td style={s.td}>
                    <button onClick={() => delRow(i)} style={s.btnDel} title="Delete row">🗑️</button>
                  </td>
                </tr>
              ))}
              <tr>
                <td colSpan={10} style={{ textAlign: "center", padding: 10 }}>
                  <button onClick={addRow} style={s.btnAdd}>➕ Add new row</button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      )}

      {/* الحفظ — على الجوال شريط ملتصق بأسفل الشاشة يبقى في متناول الإبهام */}
      <div className={mobile ? "mdi-dock" : "mdi-actions"}>
        <label className="mdi-email" title="After saving, open the email send window for this report">
          <input
            type="checkbox"
            checked={emailAfterSave}
            onChange={(e) => setEmailAfterSave(e.target.checked)}
          />
          <span>📧 Email after save</span>
        </label>
        <button onClick={handleSave} className="mdi-btn mdi-save">
          💾 Save{mobile && ready ? ` (${ready})` : ""}
        </button>
      </div>

      {msg && <div className={mobile ? "mdi-toast" : "mdi-msg"}>{msg}</div>}

      {/* مودال إدارة الصور */}
      <ImageManagerModal
        open={imageModalOpen}
        row={imageRowIndex >= 0 ? (rows?.[imageRowIndex] || {}) : null}
        onClose={closeImages}
        onAddImages={addImagesToRow}
        onRemoveImage={removeImageFromRow}
        mobile={mobile}
      />
    </div>
  );
}

/* ItemCodeInput / ItemNameInput يدمجان ستايلهما الداخلي مع ما نمرّره،
   والقياسات كلها تأتي من الكلاس أدناه. */
const CODED_FIELD_STYLE = { fontWeight: 700, letterSpacing: 0 };

/* ==========================================================================
   ورقة أنماط خاصة بهذه الصفحة — page-scoped stylesheet.

   globals.css يفرض `#root * { font-size: 14px !important }` ويثبّت كل حقل
   على 14px داخل الجوال، وهو بالضبط المقاس الذي يجعل iOS Safari يقرّب الشاشة
   عند لمس الحقل. الكلاس المضاعف (`#root .mdi.mdi`) يتفوّق على تلك القاعدة،
   فتجلس الحقول على 16px وتتوقّف الصفحة عن القفز مع كل لمسة.

   وقاعدة `:has()` تستبدل `overflow-x:hidden` العام بـ `clip` في هذه الصفحة
   وحدها؛ بدونها لا يلتصق شريط الحفظ السفلي أبداً.
   ========================================================================== */
const MDI_CSS = `
html:has(.mdi), body:has(.mdi), #root:has(.mdi) { overflow-x: clip; }

#root .mdi.mdi .mdi-title { font-size: 20px !important; }
#root .mdi.mdi .mdi-lbl {
  font-size: 12px !important;
  font-weight: 800;
  color: #475569;
  text-transform: uppercase;
  letter-spacing: .04em;
}
/* 16px بالضبط: أي مقاس أصغر يجعل iOS Safari يقرّب الشاشة عند لمس الحقل.
   بالكلاس وحده لا بالوسم، حتى لا يتضخّم جدول شاشة المكتب. */
#root .mdi.mdi .mdi-in { font-size: 16px !important; }
#root .mdi.mdi .mdi-btn { font-size: 15px !important; }

/* ---- الحقول ---- */
#root .mdi.mdi .mdi-f { display: flex; flex-direction: column; gap: 5px; min-width: 0; }
#root .mdi.mdi .mdi-in {
  width: 100%;
  box-sizing: border-box;
  min-height: 44px;
  padding: 9px 12px;
  border: 1.5px solid #c7d2fe;
  border-radius: 12px;
  background: #f8faff;
  color: #0f172a;
  font-family: inherit;
  appearance: none;
  -webkit-appearance: none;
}
#root .mdi.mdi select.mdi-in {
  background-image: linear-gradient(45deg, transparent 50%, #64748b 50%),
                    linear-gradient(135deg, #64748b 50%, transparent 50%);
  background-position: right 14px center, right 8px center;
  background-size: 6px 6px, 6px 6px;
  background-repeat: no-repeat;
  padding-right: 30px;
}
/* GlobalDatePicker يرسم أيقونة تقويمه على يمين الحقل — نُفسح لها المكان */
#root .mdi.mdi input[type="date"].mdi-in { padding-right: 30px; }
#root .mdi.mdi .mdi-in:focus {
  outline: none;
  border-color: #6366f1;
  box-shadow: 0 0 0 3px rgba(99,102,241,.18);
}
#root .mdi.mdi .mdi-qty { display: flex; gap: 6px; }
#root .mdi.mdi .mdi-qty .mdi-in:first-child { flex: 1 1 auto; }
#root .mdi.mdi .mdi-unit { flex: 0 0 86px; font-weight: 800; }

/* ---- شريط التحكم ---- */
#root .mdi.mdi .mdi-controls {
  display: flex;
  align-items: flex-end;
  gap: 10px;
  background: rgba(255,255,255,.72);
  border: 1px solid #e5e7eb;
  border-radius: 16px;
  padding: 12px 14px;
  margin-bottom: 12px;
  box-shadow: 0 6px 18px rgba(0,0,0,.06);
}
#root .mdi.mdi .mdi-date-f { flex: 1 1 220px; max-width: 320px; }
#root .mdi.mdi .mdi-view-btn {
  display: inline-flex; align-items: center; justify-content: center; gap: 8px;
  min-height: 44px; padding: 0 16px;
  text-decoration: none; white-space: nowrap;
  background: #6d28d9; color: #fff; border-radius: 999px; font-weight: 800;
  box-shadow: 0 8px 22px rgba(109,40,217,.28);
}

/* ---- بطاقات الجوال ---- */
#root .mdi.mdi .mdi-cards { display: flex; flex-direction: column; gap: 12px; }
#root .mdi.mdi .mdi-card {
  background: #fff;
  border: 1px solid #e5e7eb;
  border-inline-start: 5px solid #c7d2fe;
  border-radius: 16px;
  padding: 12px;
  box-shadow: 0 4px 14px rgba(15,23,42,.07);
}
#root .mdi.mdi .mdi-card-head { display: flex; align-items: center; gap: 8px; margin-bottom: 10px; }
#root .mdi.mdi .mdi-num {
  flex: 0 0 auto;
  min-width: 26px; height: 26px; line-height: 26px; text-align: center;
  border-radius: 999px; background: #eef2ff; color: #4338ca;
  font-weight: 900; font-size: 13px !important;
}
#root .mdi.mdi .mdi-card-name {
  flex: 1 1 auto; min-width: 0;
  font-weight: 800; color: #0f172a; font-size: 15px !important;
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
}
#root .mdi.mdi .mdi-x {
  flex: 0 0 auto;
  width: 40px; height: 40px;
  border: 1px solid #fecaca; border-radius: 12px;
  background: #fef2f2; cursor: pointer; font-size: 16px !important;
}
#root .mdi.mdi .mdi-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
#root .mdi.mdi .mdi-grid .span2 { grid-column: 1 / -1; }

/* ---- الأزرار ---- */
#root .mdi.mdi .mdi-btn {
  min-height: 46px;
  padding: 0 18px;
  border: none; border-radius: 14px;
  font-weight: 800; cursor: pointer;
  display: inline-flex; align-items: center; justify-content: center; gap: 8px;
}
#root .mdi.mdi .mdi-photos {
  width: 100%; background: #eff6ff; color: #1d4ed8; border: 1.5px dashed #93c5fd;
}
#root .mdi.mdi .mdi-photos.has { background: #dbeafe; border-style: solid; }
#root .mdi.mdi .mdi-add {
  width: 100%; background: #6d28d9; color: #fff;
  box-shadow: 0 6px 16px rgba(109,40,217,.28);
}
#root .mdi.mdi .mdi-save {
  background: #16a34a; color: #fff; box-shadow: 0 6px 16px rgba(22,163,74,.25);
}
#root .mdi.mdi .mdi-btn-blue { background: #2563eb; color: #fff; }
#root .mdi.mdi .mdi-btn-ghost { background: #fff; color: #1e293b; border: 1.5px solid #cbd5e1; }

/* ---- صف الحفظ / الشريط السفلي ---- */
#root .mdi.mdi .mdi-actions { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; margin-top: 12px; }
#root .mdi.mdi .mdi-email {
  display: inline-flex; align-items: center; gap: 8px; cursor: pointer;
  font-weight: 800; color: #0f172a; background: rgba(255,255,255,.8);
  border: 1px solid #c7d2fe; border-radius: 999px; padding: 8px 14px;
  user-select: none; white-space: nowrap;
}
#root .mdi.mdi .mdi-email input { width: 20px; height: 20px; accent-color: #16a34a; }
#root .mdi.mdi .mdi-msg { margin-top: 10px; font-weight: 800; }

#root .mdi.mdi .mdi-dock {
  position: sticky;
  bottom: 0;
  z-index: 40;
  display: flex; align-items: center; gap: 10px;
  margin: 12px -12px 0;
  padding: 10px 12px calc(10px + env(safe-area-inset-bottom));
  background: rgba(255,255,255,.94);
  backdrop-filter: blur(8px);
  border-top: 1px solid #e2e8f0;
  box-shadow: 0 -6px 20px rgba(15,23,42,.10);
}
#root .mdi.mdi .mdi-dock .mdi-email {
  flex: 1 1 auto; min-width: 0; justify-content: center; padding: 8px 10px;
  font-size: 13px !important;
}
#root .mdi.mdi .mdi-dock .mdi-save { flex: 0 0 auto; }
#root .mdi.mdi .mdi-toast {
  position: fixed;
  left: 50%; transform: translateX(-50%);
  bottom: calc(86px + env(safe-area-inset-bottom));
  z-index: 60;
  background: #0f172a; color: #fff; font-weight: 800;
  padding: 10px 16px; border-radius: 999px;
  box-shadow: 0 10px 26px rgba(15,23,42,.35);
  max-width: 90vw; text-align: center;
}

/* ---- نافذة الصور ---- */
#root .mdi.mdi .mdi-modal-back {
  position: fixed; inset: 0; z-index: 999;
  background: rgba(15,23,42,.45);
  display: flex; align-items: center; justify-content: center;
  padding: 16px;
}
#root .mdi.mdi .mdi-modal-back:has(.is-mobile) { padding: 0; }
#root .mdi.mdi .mdi-modal-card {
  width: min(1000px, 100%); max-height: 86vh;
  display: flex; flex-direction: column;
  background: #fff; border-radius: 16px; border: 1px solid #e5e7eb;
  box-shadow: 0 12px 32px rgba(0,0,0,.25); overflow: hidden;
}
#root .mdi.mdi .mdi-modal-card.is-mobile {
  width: 100%; max-width: 100%; height: 100%; max-height: 100%; border-radius: 0;
}
#root .mdi.mdi .mdi-modal-head {
  display: flex; align-items: center; gap: 8px;
  padding: 12px 14px; border-bottom: 1px solid #e5e7eb; background: #f8fafc;
  padding-top: calc(12px + env(safe-area-inset-top));
}
#root .mdi.mdi .mdi-modal-title {
  flex: 1 1 auto; min-width: 0; font-weight: 900; color: #0f172a;
  font-size: 15px !important;
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
}
#root .mdi.mdi .mdi-modal-close {
  flex: 0 0 auto; width: 40px; height: 40px;
  border: 1px solid #e2e8f0; border-radius: 12px; background: #fff;
  font-weight: 900; font-size: 16px !important; cursor: pointer;
}
#root .mdi.mdi .mdi-modal-body {
  flex: 1 1 auto; overflow: auto;
  -webkit-overflow-scrolling: touch;
  padding: 12px 14px calc(16px + env(safe-area-inset-bottom));
}
#root .mdi.mdi .mdi-upload-row { display: flex; gap: 8px; flex-wrap: wrap; }
#root .mdi.mdi .mdi-upload-row .mdi-btn { flex: 1 1 150px; }
#root .mdi.mdi .mdi-hint { margin: 8px 0 4px; color: #475569; font-weight: 700; }
#root .mdi.mdi .mdi-empty { color: #64748b; padding: 10px 0; }
#root .mdi.mdi .mdi-preview { margin-bottom: 10px; text-align: center; }
#root .mdi.mdi .mdi-preview img {
  max-width: 100%; max-height: 55vh; border-radius: 14px;
  box-shadow: 0 6px 18px rgba(0,0,0,.2);
}
#root .mdi.mdi .mdi-preview-close {
  display: block; margin: 8px auto 0; min-height: 40px; padding: 0 16px;
  border: 1px solid #cbd5e1; border-radius: 999px; background: #fff;
  font-weight: 800; cursor: pointer;
}
#root .mdi.mdi .mdi-thumbs {
  margin-top: 10px; display: grid; gap: 10px;
  grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
}
#root .mdi.mdi .mdi-thumb {
  position: relative; border: 1px solid #e5e7eb; border-radius: 12px;
  overflow: hidden; background: #f8fafc;
}
#root .mdi.mdi .mdi-thumb img {
  width: 100%; height: 130px; object-fit: cover; display: block; cursor: zoom-in;
}
#root .mdi.mdi .mdi-thumb-x {
  position: absolute; top: 6px; right: 6px;
  width: 32px; height: 32px;
  background: rgba(239,68,68,.95); color: #fff; border: none; border-radius: 10px;
  font-weight: 900; cursor: pointer;
}

/* ---- تعديلات الشاشات الصغيرة ---- */
@media (max-width: 820px) {
  #root .mdi.mdi .mdi-controls { flex-wrap: wrap; }
  #root .mdi.mdi .mdi-date-f { flex: 1 1 100%; max-width: none; }
  #root .mdi.mdi .mdi-view-btn { flex: 1 1 100%; }
  #root .mdi.mdi .mdi-thumbs { grid-template-columns: repeat(auto-fill, minmax(104px, 1fr)); }
  #root .mdi.mdi .mdi-thumb img { height: 112px; }
}
@media (max-width: 380px) {
  #root .mdi.mdi .mdi-grid { grid-template-columns: 1fr; }
  #root .mdi.mdi .mdi-grid .span2 { grid-column: auto; }
  #root .mdi.mdi .mdi-dock .mdi-email span { display: none; }
}
`;

/* ========== styles — الجدول المكتبي كما كان ========== */
const styles = {
  page: {
    fontFamily: "Cairo, sans-serif",
    padding: "1.2rem",
    direction: "ltr",
    background:
      "linear-gradient(135deg, rgba(59,130,246,0.08) 0%, rgba(16,185,129,0.08) 50%, rgba(147,51,234,0.08) 100%)",
    minHeight: "100vh",
    color: "#111",
    position: "relative",
  },
  /* الحشوة السفلية صفر: شريط الحفظ الملتصق يملأ أسفل الشاشة */
  pageMobile: { padding: "12px 12px 0" },
  h2: { margin: "0 0 12px", fontWeight: 900, color: "#111827" },
  card: { background: "#fff", borderRadius: 14, padding: 12, marginBottom: 12, boxShadow: "0 2px 12px rgba(0,0,0,.06)" },
  table: {
    width: "100%", borderCollapse: "collapse", border: "1px solid #c7d2fe",
    minWidth: 900, tableLayout: "fixed",
  },
  th: {
    padding: "10px 8px", textAlign: "center", fontWeight: "bold",
    border: "1px solid #c7d2fe", background: "#efe7ff", color: "#0f172a", whiteSpace: "nowrap",
  },
  td: {
    padding: "8px 6px", textAlign: "center", border: "1px solid #c7d2fe",
    background: "#f7f7ff", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
    verticalAlign: "middle",
  },
  in: {
    width: "100%", maxWidth: "100%", boxSizing: "border-box",
    padding: "8px 10px", borderRadius: 10, border: "1px solid #c7d2fe", background: "#eef2ff",
    overflow: "hidden", textOverflow: "ellipsis",
  },
  sel: {
    width: "100%", maxWidth: "100%", boxSizing: "border-box",
    padding: "8px 10px", borderRadius: 10, border: "1px solid #c7d2fe", background: "#eef2ff",
  },
  btnAdd: {
    background: "#6d28d9", color: "#fff", border: "none", borderRadius: 12,
    padding: "9px 16px", fontWeight: "bold", cursor: "pointer",
    boxShadow: "0 6px 16px rgba(109,40,217,.28)",
  },
  btnDel: {
    background: "#dc2626", color: "#fff", border: "none", borderRadius: 10,
    padding: "6px 10px", cursor: "pointer",
  },
  btnBlue: {
    background: "#2563eb", color: "#fff", border: "none", borderRadius: 10,
    padding: "6px 12px", fontWeight: "bold", cursor: "pointer",
    boxShadow: "0 1px 6px #bfdbfe",
  },
};
