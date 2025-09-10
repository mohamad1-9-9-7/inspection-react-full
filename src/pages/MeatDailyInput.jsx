// src/pages/MeatDailyInput.jsx
import React, { useState, useRef, useEffect } from "react";
import { Link } from "react-router-dom";

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

const baseRow = () => ({
  productName: "",
  quantity: "",
  qtyType: "KG",
  status: "Near Expiry",
  expiry: "",
  remarks: "",
  images: [], // ✅ دعم الصور داخل الإدخال
});

/* ========= Images manager modal ========= */
function ImageManagerModal({ open, row, onClose, onAddImages, onRemoveImage }) {
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

    const urls = [];
    for (const f of files) {
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
          <button onClick={handlePick} style={btnBlueModal}>⬆️ Upload images</button>
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            multiple
            onChange={handleFiles}
            style={{ display: "none" }}
          />
          <div style={{ fontSize: 13, color: "#334155" }}>Unlimited images per product (server compresses automatically).</div>
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

export default function MeatDailyInput() {
  const [reportDate, setReportDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [rows, setRows] = useState([baseRow()]);
  const [msg, setMsg] = useState("");

  /* ===== Password gate (small box) ===== */
  const [authed, setAuthed] = useState(false);
  const [pwd, setPwd] = useState("");
  const [err, setErr] = useState("");

  // صور: حالة المودال + أي صف مفتوح
  const [imageModalOpen, setImageModalOpen] = useState(false);
  const [imageRowIndex, setImageRowIndex] = useState(-1);

  const submitPwd = () => {
    if (pwd === "9999") {
      setAuthed(true);
      setPwd("");
      setErr("");
    } else setErr("Wrong password.");
  };
  const closeGate = () => {
    if (window.history.length > 1) window.history.back();
  };

  if (!authed) {
    return (
      <div style={auth.overlay}>
        <div style={auth.card} role="dialog" aria-modal="true" aria-labelledby="pw-title">
          <button style={auth.close} onClick={closeGate} aria-label="Close">×</button>
          <div id="pw-title" style={auth.title}>
            <span style={{ fontWeight: 900, color: "#1f2937" }}>Password required</span> 🔒
          </div>
          <input
            type="password"
            value={pwd}
            onChange={(e) => setPwd(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && submitPwd()}
            placeholder="Enter password"
            style={auth.input}
            autoFocus
          />
          <button onClick={submitPwd} style={auth.primary}>Sign in</button>
          {err && <div style={auth.err}>❌ {err}</div>}
        </div>
      </div>
    );
  }

  /* ===== page logic ===== */
  const addRow = () => setRows((p) => [...p, baseRow()]);
  const delRow = (idx) => setRows((p) => p.filter((_, i) => i !== idx));
  const setVal = (i, k, v) => setRows((p) => p.map((r, idx) => (idx === i ? { ...r, [k]: v } : r)));

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
      setMsg("✅ Saved successfully.");
    } catch (e) {
      console.error(e);
      setMsg("❌ Failed to save to server.");
    } finally {
      setTimeout(() => setMsg(""), 2500);
    }
  };

  const s = styles;

  return (
    <div style={s.page}>
      <h2 style={s.h2}>📝 Meat Daily Status — Input</h2>

      {/* Controls */}
      <div style={s.controlsBar}>
        <label style={s.controlsLabel}>
          <span style={{ marginInlineEnd: 8 }}>Report Date:</span>
          <input
            type="date"
            value={reportDate}
            onChange={(e) => setReportDate(e.target.value)}
            style={s.date}
            aria-label="Report Date"
          />
        </label>

        <Link to="/meat-daily/view" style={s.viewBtn} title="View meat daily reports">
          <span style={{ fontSize: 16 }}>📄</span>
          <span>View Reports</span>
        </Link>
      </div>

      {/* Table */}
      <div style={{ ...s.card, overflowX: "auto" }}>
        <table style={s.table}>
          <thead>
            <tr>
              <th style={s.th}>#</th>
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
                  <input
                    value={r.productName}
                    onChange={(e) => setVal(i, "productName", e.target.value)}
                    style={s.in}
                    aria-label="Product Name"
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
              <td colSpan={9} style={{ textAlign: "center", padding: 10 }}>
                <button onClick={addRow} style={s.btnAdd}>➕ Add new row</button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Bottom actions */}
      <div style={{ display: "flex", gap: 10 }}>
        <button onClick={handleSave} style={s.btnSave}>💾 Save</button>
        {msg && <div style={s.msg}>{msg}</div>}
      </div>

      {/* مودال إدارة الصور */}
      <ImageManagerModal
        open={imageModalOpen}
        row={imageRowIndex >= 0 ? (rows?.[imageRowIndex] || {}) : null}
        onClose={closeImages}
        onAddImages={addImagesToRow}
        onRemoveImage={removeImageFromRow}
      />
    </div>
  );
}

/* ========== styles ========== */
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
  h2: { margin: "0 0 12px", fontWeight: 900, color: "#111827" },
  controlsBar: {
    display: "flex", justifyContent: "center", alignItems: "center", gap: 12,
    background: "linear-gradient(180deg, rgba(255,255,255,.7), rgba(255,255,255,.5))",
    border: "1px solid #e5e7eb", borderRadius: 14, padding: "10px 14px",
    marginBottom: 12, boxShadow: "0 6px 18px rgba(0,0,0,.06)", backdropFilter: "blur(4px)",
  },
  controlsLabel: { display: "inline-flex", alignItems: "center", fontWeight: 800, color: "#0f172a" },
  viewBtn: {
    display: "inline-flex", alignItems: "center", gap: 8, textDecoration: "none",
    background: "#6d28d9", color: "#fff", border: "1px solid rgba(255,255,255,.45)",
    borderRadius: 999, padding: "9px 14px", fontWeight: 800,
    boxShadow: "0 8px 22px rgba(109,40,217,.28)",
  },
  card: { background: "#fff", borderRadius: 14, padding: 12, marginBottom: 12, boxShadow: "0 2px 12px rgba(0,0,0,.06)" },
  date: {
    borderRadius: 999, border: "1.5px solid #c7d2fe", background: "#eef2ff",
    padding: "8px 13px", fontSize: "1em", minWidth: 190, color: "#111",
  },
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
  btnSave: {
    background: "#16a34a", color: "#fff", border: "none", borderRadius: 12,
    padding: "10px 18px", fontWeight: "bold", cursor: "pointer",
    boxShadow: "0 6px 16px rgba(22,163,74,.25)",
  },
  btnBlue: {
    background: "#2563eb",
    color: "#fff",
    border: "none",
    borderRadius: 10,
    padding: "6px 12px",
    fontWeight: "bold",
    cursor: "pointer",
    boxShadow: "0 1px 6px #bfdbfe",
  },
  msg: { alignSelf: "center", fontWeight: 800 },
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
  maxHeight: "80vh",
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
const btnBlueModal = {
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

/* ===== auth (small box) styles ===== */
const auth = {
  overlay: {
    minHeight: "100vh",
    background: "#e5e7eb",
    display: "grid",
    placeItems: "center",
    padding: "1rem",
  },
  card: {
    width: "min(440px, 92vw)",
    background: "#ffffff",
    borderRadius: 14,
    padding: 16,
    color: "#0b1021",
    boxShadow: "0 18px 40px rgba(0,0,0,.25)",
    position: "relative",
  },
  close: {
    position: "absolute",
    left: 10,
    top: 10,
    width: 26,
    height: 26,
    borderRadius: 999,
    border: "none",
    background: "#fee2e2",
    color: "#b91c1c",
    fontWeight: 900,
    cursor: "pointer",
  },
  title: { textAlign: "center", marginBottom: 8, fontSize: 16, fontWeight: 800, color: "#1f2937" },
  input: {
    width: "100%",
    padding: "10px 12px",
    borderRadius: 10,
    border: "1px solid #c7d2fe",
    background: "#eef2ff",
    outline: "none",
  },
  primary: {
    width: "100%",
    marginTop: 10,
    padding: "12px 14px",
    border: "none",
    borderRadius: 10,
    fontWeight: 900,
    color: "#fff",
    background: "#6d28d9",
    cursor: "pointer",
    boxShadow: "0 10px 24px rgba(109,40,217,.28)",
  },
  err: { color: "#dc2626", fontWeight: 800, textAlign: "center", marginTop: 8 },
};
