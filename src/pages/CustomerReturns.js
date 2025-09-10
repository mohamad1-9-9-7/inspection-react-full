// src/pages/CustomerReturns.js
import React, { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";

// API base
const API_BASE = process.env.REACT_APP_API_URL || "https://inspection-server-4nvj.onrender.com";

// Actions (English only, for storage/consistency)
const ACTIONS = [
  "Use in production",
  "Condemnation",
  "Use in kitchen",
  "Send to market",
  "Separated expired shelf",
  "Other..."
];

const QTY_TYPES = ["KG", "PCS", "أخرى / Other"];

// Password required (always)
const RETURNS_CREATE_PASSWORD = "9999";

function getToday() {
  return new Date().toISOString().slice(0, 10);
}

/* ===== Images API helpers ===== */
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
  const res = await fetch(`${API_BASE}/api/images?url=${encodeURIComponent(url)}`, {
    method: "DELETE",
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data?.ok) throw new Error(data?.error || "Delete image failed");
}

// Send one report to server (API only)
async function sendOneToServer({ reportDate, items }) {
  const res = await fetch(`${API_BASE}/api/reports`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      reporter: "anonymous",
      type: "returns_customers",
      payload: { reportDate, items }
    }),
  });
  if (!res.ok) {
    const t = await res.text();
    throw new Error(`Server ${res.status}: ${t}`);
  }
  return res.json();
}

/* ================= Password Modal ================= */
function PasswordModal({ show, onSubmit, onClose, error }) {
  const [password, setPassword] = useState("");
  useEffect(() => { if (show) setPassword(""); }, [show]);
  if (!show) return null;

  return (
    <div style={{
      position: "fixed", inset: 0, width: "100vw", height: "100vh",
      background: "rgba(44,62,80,0.24)", display: "flex",
      alignItems: "center", justifyContent: "center", zIndex: 2000, direction: "rtl",
    }}>
      <div style={{
        background: "#fff", padding: "2.2rem 2.5rem", borderRadius: "17px",
        minWidth: 320, boxShadow: "0 4px 32px #2c3e5077", textAlign: "center",
        position: "relative", fontFamily: "Cairo, sans-serif",
      }}>
        <button onClick={onClose} style={{
          position: "absolute", top: 10, left: 15, fontSize: 22,
          background: "transparent", border: "none", color: "#c0392b", cursor: "pointer",
        }}>✖</button>

        <div style={{ fontWeight: "bold", fontSize: "1.18em", color: "#2980b9", marginBottom: 14 }}>
          🔒 كلمة سر إنشاء مرتجعات الزبائن / Password required
        </div>

        <form onSubmit={(e) => { e.preventDefault(); onSubmit(password); }}>
          <input
            type="password"
            inputMode="numeric"
            pattern="[0-9]*"
            maxLength={4}
            autoComplete="off"
            autoCorrect="off"
            spellCheck={false}
            autoCapitalize="off"
            autoFocus
            placeholder="أدخل كلمة السر / Enter password"
            style={{
              width: "90%", padding: "11px", fontSize: "1.1em",
              border: "1.8px solid #b2babb", borderRadius: "10px",
              marginBottom: 16, background: "#f4f6f7",
            }}
            value={password}
            onChange={(e) => {
              const onlyDigits = e.target.value.replace(/\D/g, "").slice(0, 4);
              setPassword(onlyDigits);
            }}
            onKeyDown={(e) => e.stopPropagation()}
          />
          <button type="submit" style={{
            width: "100%", background: "#884ea0", color: "#fff", border: "none",
            padding: "11px 0", borderRadius: "8px", fontWeight: "bold",
            fontSize: "1.13rem", marginBottom: 10, cursor: "pointer",
            boxShadow: "0 2px 12px #d2b4de",
          }}>
            دخول / Sign in
          </button>
          {error && <div style={{ color: "#c0392b", fontWeight: "bold", marginTop: 5 }}>{error}</div>}
        </form>
      </div>
    </div>
  );
}

/* ===== Images Manager Modal ===== */
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

  const pick = () => inputRef.current?.click();

  const handleFiles = async (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    const urls = [];
    for (const f of files) {
      try { urls.push(await uploadViaServer(f)); }
      catch (err) { console.error("upload failed:", err); }
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
          <button onClick={pick} style={btnBlueModal}>⬆️ Upload images</button>
          <input
            ref={inputRef}
            type="file" accept="image/*" multiple
            onChange={handleFiles} style={{ display: "none" }}
          />
          <div style={{ fontSize: 13, color: "#334155" }}>Unlimited images per item (server compresses automatically).</div>
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

export default function CustomerReturns() {
  const navigate = useNavigate();

  // Password gate
  const [modalOpen, setModalOpen] = useState(true);
  const [modalError, setModalError] = useState("");
  const handleSubmitPassword = (val) => {
    if (val === RETURNS_CREATE_PASSWORD) {
      setModalOpen(false);
      setModalError("");
    } else {
      setModalError("❌ كلمة السر غير صحيحة! / Wrong password!");
    }
  };
  const handleCloseModal = () => {
    navigate("/returns-customers/browse", { replace: true });
  };

  // ========= Page content (after password) =========
  const [reportDate, setReportDate] = useState(getToday());
  const [rows, setRows] = useState([{
    productName: "", origin: "", customerName: "", quantity: "",
    qtyType: "KG", customQtyType: "", expiry: "", remarks: "",
    action: "", customAction: "", images: []
  }]);
  const [saveMsg, setSaveMsg] = useState("");

  // Images state
  const [imageModalOpen, setImageModalOpen] = useState(false);
  const [imageRowIndex, setImageRowIndex] = useState(-1);

  const addRow = () => {
    setRows((prev) => [...prev, {
      productName: "", origin: "", customerName: "", quantity: "",
      qtyType: "KG", customQtyType: "", expiry: "", remarks: "",
      action: "", customAction: "", images: []
    }]);
  };
  const removeRow = (index) => setRows(rows.filter((_, idx) => idx !== index));

  const handleChange = (idx, field, value) => {
    const updated = [...rows];
    updated[idx][field] = value;
    if (field === "qtyType" && value !== "أخرى / Other") updated[idx].customQtyType = "";
    if (field === "action" && value !== "Other...") updated[idx].customAction = "";
    setRows(updated);
  };

  // Images handlers
  const openImagesFor = (idx) => { setImageRowIndex(idx); setImageModalOpen(true); };
  const closeImages = () => setImageModalOpen(false);
  const addImagesToRow = async (urls) => {
    if (imageRowIndex < 0) return;
    setRows((prev) => prev.map((r, i) =>
      i === imageRowIndex ? { ...r, images: [...(r.images || []), ...urls] } : r
    ));
    setSaveMsg("✅ Images added.");
    setTimeout(() => setSaveMsg(""), 2000);
  };
  const removeImageFromRow = async (imgIndex) => {
    if (imageRowIndex < 0) return;
    try {
      const url = rows?.[imageRowIndex]?.images?.[imgIndex];
      if (url) { try { await deleteImage(url); } catch { /* ignore */ } }
      setRows((prev) => prev.map((r, i) => {
        if (i !== imageRowIndex) return r;
        const next = Array.isArray(r.images) ? [...r.images] : [];
        next.splice(imgIndex, 1);
        return { ...r, images: next };
      }));
      setSaveMsg("✅ Image removed.");
    } catch (e) {
      console.error(e);
      setSaveMsg("❌ Failed to remove image.");
    } finally {
      setTimeout(() => setSaveMsg(""), 2000);
    }
  };

  const handleSave = async () => {
    const filtered = rows
      .map((r) => ({
        ...r,
        productName: (r.productName || "").trim(),
        origin: (r.origin || "").trim(),
        customerName: (r.customerName || "").trim(),
        quantity: (r.quantity || "").toString().trim(),
        qtyType: (r.qtyType || "").trim(),
        customQtyType: (r.customQtyType || "").trim(),
        expiry: (r.expiry || "").trim(),
        remarks: (r.remarks || "").trim(),
        action: (r.action || "").trim(),
        customAction: (r.customAction || "").trim(),
        images: Array.isArray(r.images) ? r.images : [], // ✅ save images
      }))
      .filter(
        r =>
          r.productName || r.origin || r.customerName || r.quantity ||
          r.expiry || r.remarks || r.action || r.customAction || (r.images && r.images.length)
      );

    if (!filtered.length) {
      setSaveMsg("يجب إضافة بيانات على الأقل! / Please add at least one row.");
      setTimeout(() => setSaveMsg(""), 1700);
      return;
    }

    try {
      setSaveMsg("⏳ جاري الحفظ على السيرفر… / Saving to server…");
      await sendOneToServer({ reportDate, items: filtered });
      setSaveMsg("✅ تم الحفظ على السيرفر بنجاح! / Saved successfully.");
    } catch (err) {
      setSaveMsg("❌ فشل الحفظ على السيرفر. حاول مجددًا. / Save failed. Please try again.");
      console.error(err);
    } finally {
      setTimeout(() => setSaveMsg(""), 3500);
    }
  };

  if (modalOpen) {
    return (
      <PasswordModal
        show={modalOpen}
        onSubmit={handleSubmitPassword}
        onClose={handleCloseModal}
        error={modalError}
      />
    );
  }

  return (
    <div
      style={{
        fontFamily: "Cairo, sans-serif",
        padding: "2.5rem",
        background: "#f4f6fa",
        minHeight: "100vh",
        direction: "rtl"
      }}
    >
      <h2 style={{
        textAlign: "center",
        color: "#512e5f",
        marginBottom: "2.3rem",
        fontWeight: "bold"
      }}>
        👤 سجل مرتجعات الزبائن (Customer Returns)
      </h2>

      {/* ====== Report date ====== */}
      <div style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 14,
        marginBottom: 24,
        fontSize: "1.17em"
      }}>
        <span style={{
          background: "#884ea0",
          color: "#fff",
          padding: "9px 17px",
          borderRadius: 14,
          boxShadow: "0 2px 10px #e8daef44",
          display: "flex",
          alignItems: "center",
          gap: 9,
          fontWeight: "bold",
        }}>
          <span role="img" aria-label="calendar" style={{ fontSize: 22 }}>📅</span>
          تاريخ إعداد التقرير / Report Date:
          <input
            type="date"
            value={reportDate}
            onChange={e => setReportDate(e.target.value)}
            style={{
              marginRight: 10,
              background: "#fcf6ff",
              border: "none",
              borderRadius: 7,
              padding: "7px 14px",
              fontWeight: "bold",
              fontSize: "1em",
              color: "#512e5f",
              boxShadow: "0 1px 4px #e8daef44"
            }}
          />
        </span>
      </div>

      {/* Action buttons */}
      <div style={{
        display: "flex", justifyContent: "center", alignItems: "center",
        gap: "1.2rem", marginBottom: 20
      }}>
        <button onClick={handleSave}
          style={{
            background: "#229954",
            color: "#fff",
            border: "none",
            borderRadius: "14px",
            fontWeight: "bold",
            fontSize: "1.08em",
            padding: "10px 32px",
            cursor: "pointer",
            boxShadow: "0 2px 8px #d4efdf"
          }}>💾 حفظ / Save</button>
        <button onClick={() => navigate("/returns-customers/view")}
          style={{
            background: "#884ea0",
            color: "#fff",
            border: "none",
            borderRadius: "14px",
            fontWeight: "bold",
            fontSize: "1.08em",
            padding: "10px 32px",
            cursor: "pointer",
            boxShadow: "0 2px 8px #d2b4de"
          }}>📋 عرض التقارير / View Reports</button>
        {saveMsg && (
          <span style={{
            marginRight: 18, fontWeight: "bold",
            color: saveMsg.startsWith("✅") ? "#229954" : (saveMsg.startsWith("⏳") ? "#512e5f" : "#c0392b"),
            fontSize: "1.05em"
          }}>{saveMsg}</span>
        )}
      </div>

      {/* Table */}
      <div style={{ overflowX: "auto" }}>
        <table style={{
          width: "100%",
          background: "#fff",
          borderRadius: 16,
          boxShadow: "0 2px 16px #dcdcdc70",
          borderCollapse: "collapse",
          minWidth: 1400
        }}>
          <thead>
            <tr style={{ background: "#e8daef", color: "#512e5f" }}>
              <th style={th}>التسلسل / SL.NO</th>
              <th style={th}>اسم المنتج / PRODUCT NAME</th>
              <th style={th}>المنشأ / ORIGIN</th>
              <th style={th}>الزبون / CUSTOMER</th>
              <th style={th}>الكمية / QUANTITY</th>
              <th style={th}>نوع الكمية / QTY TYPE</th>
              <th style={th}>تاريخ الانتهاء / EXPIRY DATE</th>
              <th style={th}>ملاحظات / REMARKS</th>
              <th style={th}>الإجراء / ACTION</th>
              <th style={th}>الصور / IMAGES</th> {/* ✅ */}
              <th style={th}></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, idx) => (
              <tr key={idx} style={{ background: idx % 2 ? "#fcf3ff" : "#fff" }}>
                <td style={td}>{idx + 1}</td>
                <td style={td}>
                  <input style={input}
                    placeholder="اكتب اسم المنتج / Enter product name"
                    value={row.productName}
                    onChange={e => handleChange(idx, "productName", e.target.value)} />
                </td>
                <td style={td}>
                  <input style={input}
                    placeholder="المنشأ / Origin"
                    value={row.origin}
                    onChange={e => handleChange(idx, "origin", e.target.value)} />
                </td>
                <td style={td}>
                  <input style={input}
                    placeholder="اسم الزبون / Customer name"
                    value={row.customerName}
                    onChange={e => handleChange(idx, "customerName", e.target.value)} />
                </td>
                <td style={td}>
                  <input style={input}
                    placeholder="الكمية / Quantity"
                    inputMode="decimal"
                    value={row.quantity}
                    onChange={e => handleChange(idx, "quantity", e.target.value.replace(/[^0-9.]/g, ""))} />
                </td>
                <td style={td}>
                  <select style={input}
                    value={row.qtyType}
                    onChange={e => handleChange(idx, "qtyType", e.target.value)}>
                    {QTY_TYPES.map((t) => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                  {row.qtyType === "أخرى / Other" && (
                    <input style={{...input, marginTop: 6}}
                      placeholder="حدد النوع / Specify type"
                      value={row.customQtyType}
                      onChange={e => handleChange(idx, "customQtyType", e.target.value)} />
                  )}
                </td>
                <td style={td}>
                  <input style={input} type="date"
                    value={row.expiry}
                    onChange={e => handleChange(idx, "expiry", e.target.value)} />
                </td>
                <td style={td}>
                  <input style={input}
                    placeholder="ملاحظات / Remarks"
                    value={row.remarks}
                    onChange={e => handleChange(idx, "remarks", e.target.value)} />
                </td>
                <td style={td}>
                  <select style={input}
                    value={row.action}
                    onChange={e => handleChange(idx, "action", e.target.value)}>
                    <option value="">—</option>
                    {ACTIONS.map((a) => (
                      <option key={a} value={a}>{a}</option>
                    ))}
                  </select>
                  {row.action === "Other..." && (
                    <input style={{...input, marginTop: 6}}
                      placeholder="Specify action"
                      value={row.customAction}
                      onChange={e => handleChange(idx, "customAction", e.target.value)} />
                  )}
                </td>

                {/* ✅ Images cell */}
                <td style={td}>
                  <button
                    onClick={() => openImagesFor(idx)}
                    style={btnImg}
                    title="Manage images"
                  >
                    🖼️ Images ({Array.isArray(row.images) ? row.images.length : 0})
                  </button>
                </td>

                <td style={td}>
                  <button onClick={() => removeRow(idx)} style={btnDel}>🗑️</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div style={rowActions}>
        <button onClick={addRow} style={btnAdd}>➕ إضافة صف / Add row</button>
      </div>

      {/* Images Modal */}
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

/* ====== Styles ====== */
const th = { padding: "10px", border: "1px solid #eee", fontSize: 13, whiteSpace: "nowrap" };
const td = { padding: "8px", border: "1px solid #f1f1f1" };
const input = {
  width: "100%",
  padding: "8px 10px",
  borderRadius: 10,
  border: "1.6px solid #c9cddd",
  outline: "none",
  background: "#fbfbff",
  fontSize: 13
};
const rowActions = { display: "flex", justifyContent: "center", marginTop: 14 };
const btnAdd = {
  background: "#2563eb", color: "#fff", border: "none",
  padding: "10px 22px", borderRadius: 14, fontWeight: "bold",
  boxShadow: "0 2px 10px rgba(37,99,235,.25)", cursor: "pointer"
};
const btnDel = {
  background: "#ef4444", color: "#fff", border: "none",
  padding: "6px 10px", borderRadius: 10, fontWeight: 800,
  cursor: "pointer"
};
const btnImg = {
  background: "#2563eb", color: "#fff", border: "none",
  padding: "6px 12px", borderRadius: 10, fontWeight: 800,
  cursor: "pointer", boxShadow: "0 1px 6px #bfdbfe",
};

/* ====== Gallery modal styles ====== */
const galleryBack = {
  position: "fixed", inset: 0, background: "rgba(15,23,42,.35)",
  display: "flex", alignItems: "center", justifyContent: "center", zIndex: 999,
};
const galleryCard = {
  width: "min(1400px, 1000vw)", maxHeight: "80vh", overflow: "auto",
  background: "#fff", color: "#111", borderRadius: 14, border: "1px solid #e5e7eb",
  padding: "14px 16px", boxShadow: "0 12px 32px rgba(0,0,0,.25)",
};
const galleryClose = {
  background: "transparent", border: "none", color: "#111",
  fontWeight: 900, cursor: "pointer", fontSize: 18,
};
const btnBlueModal = {
  background: "#2563eb", color: "#fff", border: "none",
  borderRadius: 10, padding: "8px 14px", fontWeight: "bold",
  cursor: "pointer", boxShadow: "0 1px 6px #bfdbfe",
};
const thumbsWrap = {
  marginTop: 8, display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))", gap: 10,
};
const thumbTile = {
  position: "relative", border: "1px solid #e5e7eb",
  borderRadius: 10, overflow: "hidden", background: "#f8fafc",
};
const thumbImg = { width: "100%", height: 150, objectFit: "cover", display: "block" };
const thumbRemove = {
  position: "absolute", top: 6, right: 6, background: "#ef4444",
  color: "#fff", border: "none", borderRadius: 8, padding: "2px 8px",
  fontWeight: 800, cursor: "pointer",
};
