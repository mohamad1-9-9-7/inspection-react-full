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

// Draft (local autosave) keys
const DRAFT_KEY = "customer_returns_draft_v1";
const DRAFT_DATE_KEY = "customer_returns_draft_date_v1";

function getToday() {
  return new Date().toISOString().slice(0, 10);
}

function makeEmptyRow() {
  return {
    productName: "", origin: "", customerName: "",
    carNumber: "", driverName: "",
    quantity: "",
    qtyType: "KG", customQtyType: "", expiry: "", remarks: "",
    action: "", customAction: "", images: []
  };
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

  // ✅ Restore draft date from localStorage (fallback to today)
  const [reportDate, setReportDate] = useState(() => {
    try {
      return localStorage.getItem(DRAFT_DATE_KEY) || getToday();
    } catch {
      return getToday();
    }
  });

  // ✅ Restore draft rows from localStorage
  const [rows, setRows] = useState(() => {
    try {
      const raw = localStorage.getItem(DRAFT_KEY);
      const parsed = raw ? JSON.parse(raw) : null;
      if (Array.isArray(parsed) && parsed.length) return parsed;
    } catch {
      // ignore
    }
    return [makeEmptyRow()];
  });

  const [saveMsg, setSaveMsg] = useState("");

  // ✅ Track whether there are unsaved changes
  const [isDirty, setIsDirty] = useState(false);
  const savedRowsRef = useRef(null); // snapshot of last-saved rows

  // ✅ Auto-save draft to localStorage on every rows/date change
  useEffect(() => {
    try {
      localStorage.setItem(DRAFT_KEY, JSON.stringify(rows));
      localStorage.setItem(DRAFT_DATE_KEY, reportDate);
    } catch {
      // ignore
    }
    if (savedRowsRef.current !== null) {
      setIsDirty(JSON.stringify(rows) !== JSON.stringify(savedRowsRef.current));
    } else {
      // If we restored a draft on first mount, mark as dirty so user knows
      const hasContent = rows.some((r) =>
        r.productName || r.origin || r.customerName || r.carNumber || r.driverName ||
        r.quantity || r.expiry || r.remarks || r.action || r.customAction || (r.images && r.images.length)
      );
      if (hasContent) setIsDirty(true);
    }
  }, [rows, reportDate]);

  // ✅ Warn before leaving page if unsaved changes
  useEffect(() => {
    const handleBeforeUnload = (e) => {
      if (isDirty) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [isDirty]);

  // Images state
  const [imageModalOpen, setImageModalOpen] = useState(false);
  const [imageRowIndex, setImageRowIndex] = useState(-1);

  const addRow = () => {
    setRows((prev) => [...prev, makeEmptyRow()]);
  };

  // Manual: clear the local draft
  const clearDraft = () => {
    if (!window.confirm("هل تريد مسح المسودة المحفوظة محلياً؟ / Clear the locally-saved draft?")) return;
    try {
      localStorage.removeItem(DRAFT_KEY);
      localStorage.removeItem(DRAFT_DATE_KEY);
    } catch { /* ignore */ }
    setRows([makeEmptyRow()]);
    setReportDate(getToday());
    savedRowsRef.current = null;
    setIsDirty(false);
    setSaveMsg("✅ تم مسح المسودة. / Draft cleared.");
    setTimeout(() => setSaveMsg(""), 2000);
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
        carNumber: (r.carNumber || "").trim(),
        driverName: (r.driverName || "").trim(),
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
          r.productName || r.origin || r.customerName || r.carNumber || r.driverName || r.quantity ||
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

      // ✅ Mark as saved → clear dirty flag
      savedRowsRef.current = JSON.parse(JSON.stringify(rows));
      setIsDirty(false);

      // ✅ Clear draft from localStorage after successful server save
      try {
        localStorage.removeItem(DRAFT_KEY);
        localStorage.removeItem(DRAFT_DATE_KEY);
      } catch { /* ignore */ }

      setSaveMsg("✅ تم الحفظ على السيرفر بنجاح! / Saved successfully.");
    } catch (err) {
      setSaveMsg("❌ فشل الحفظ على السيرفر. المسودة محفوظة محلياً. / Save failed. Draft is kept locally.");
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
        padding: "2.2rem",
        background:
          "radial-gradient(1200px 600px at 100% -10%, #f5d0fe 0%, transparent 60%), linear-gradient(135deg, #f8f5ff 0%, #f0f4ff 50%, #fdf4ff 100%)",
        minHeight: "100vh",
        direction: "rtl"
      }}
    >
      {/* Hero header */}
      <div style={{
        background: "linear-gradient(180deg, rgba(255,255,255,.85), rgba(255,255,255,.65))",
        border: "1px solid rgba(255,255,255,.7)",
        borderRadius: 20,
        padding: "18px 24px",
        marginBottom: 18,
        boxShadow: "0 12px 28px rgba(81, 46, 95, 0.15)",
        backdropFilter: "blur(8px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 16,
        flexWrap: "wrap",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{
            width: 48, height: 48, borderRadius: 14,
            background: "linear-gradient(135deg, #884ea0, #c084fc)",
            display: "grid", placeItems: "center",
            boxShadow: "0 6px 18px rgba(136, 78, 160, .35)",
            fontSize: 24,
          }}>👤</div>
          <div>
            <div style={{
              fontWeight: 900, fontSize: "1.35rem",
              background: "linear-gradient(90deg, #512e5f, #884ea0)",
              WebkitBackgroundClip: "text", backgroundClip: "text", color: "transparent",
            }}>
              سجل مرتجعات الزبائن
            </div>
            <div style={{ fontSize: 13, color: "#64748b", fontWeight: 600, marginTop: 2 }}>
              Customer Returns — record returned items per customer & delivery
            </div>
          </div>
        </div>
        <div style={{ textAlign: "left" }}>
          <div style={{ fontWeight: 800, fontSize: 14, color: "#b91c1c", letterSpacing: ".5px" }}>AL MAWASHI</div>
          <div style={{ fontSize: 10, color: "#64748b" }}>Trans Emirates Livestock Trading L.L.C.</div>
        </div>
      </div>

      {/* ✅ Unsaved-changes banner */}
      {isDirty && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12,
            background: "linear-gradient(180deg, #fef9c3, #fef08a)",
            border: "1.5px solid #fde047",
            borderRadius: 12,
            padding: "10px 16px",
            marginBottom: 14,
            color: "#854d0e",
            fontWeight: 700,
            fontSize: 14,
            boxShadow: "0 4px 14px rgba(250, 204, 21, .25)",
            flexWrap: "wrap",
          }}
        >
          <span>
            ⚠️ يوجد تغييرات غير محفوظة — المسودة محفوظة محلياً تلقائياً
            <span style={{ marginInlineStart: 10, opacity: 0.85, fontSize: 12, fontWeight: 600 }}>
              (Unsaved changes — draft auto-saved locally)
            </span>
          </span>
          <button
            onClick={clearDraft}
            style={{
              background: "#fff",
              color: "#854d0e",
              border: "1.5px solid #facc15",
              borderRadius: 10,
              padding: "5px 12px",
              fontWeight: 800,
              cursor: "pointer",
              fontSize: 12,
              boxShadow: "0 2px 6px rgba(250,204,21,.25)",
            }}
            title="مسح المسودة المحفوظة محلياً"
          >
            🧹 مسح المسودة / Clear draft
          </button>
        </div>
      )}

      {/* ====== Report date ====== */}
      <div style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 14,
        marginBottom: 18,
        fontSize: "1.05em"
      }}>
        <span style={{
          background: "linear-gradient(135deg, #884ea0, #a855f7)",
          color: "#fff",
          padding: "10px 18px",
          borderRadius: 14,
          boxShadow: "0 6px 18px rgba(136, 78, 160, .35)",
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
              background: "rgba(255,255,255,.95)",
              border: "none",
              borderRadius: 9,
              padding: "8px 14px",
              fontWeight: "bold",
              fontSize: "1em",
              color: "#512e5f",
              boxShadow: "0 1px 4px rgba(0,0,0,.08)"
            }}
          />
        </span>
      </div>

      {/* Action buttons */}
      <div style={{
        display: "flex", justifyContent: "center", alignItems: "center",
        gap: "1rem", marginBottom: 18, flexWrap: "wrap"
      }}>
        <button onClick={handleSave}
          style={{
            background: "linear-gradient(135deg, #16a34a, #22c55e)",
            color: "#fff",
            border: "none",
            borderRadius: "14px",
            fontWeight: "bold",
            fontSize: "1.05em",
            padding: "10px 28px",
            cursor: "pointer",
            boxShadow: "0 6px 18px rgba(34,197,94,.35)",
            transition: "transform .15s, box-shadow .15s",
          }}
          onMouseEnter={(e) => { e.currentTarget.style.transform = "translateY(-1px)"; }}
          onMouseLeave={(e) => { e.currentTarget.style.transform = "translateY(0)"; }}
        >💾 حفظ / Save</button>
        <button onClick={() => navigate("/returns-customers/view")}
          style={{
            background: "linear-gradient(135deg, #884ea0, #a855f7)",
            color: "#fff",
            border: "none",
            borderRadius: "14px",
            fontWeight: "bold",
            fontSize: "1.05em",
            padding: "10px 28px",
            cursor: "pointer",
            boxShadow: "0 6px 18px rgba(136,78,160,.35)",
            transition: "transform .15s, box-shadow .15s",
          }}
          onMouseEnter={(e) => { e.currentTarget.style.transform = "translateY(-1px)"; }}
          onMouseLeave={(e) => { e.currentTarget.style.transform = "translateY(0)"; }}
        >📋 عرض التقارير / View Reports</button>
        {saveMsg && (
          <span style={{
            marginRight: 12, fontWeight: "bold",
            padding: "8px 14px", borderRadius: 12,
            background: saveMsg.startsWith("✅") ? "#dcfce7" : (saveMsg.startsWith("⏳") ? "#ede9fe" : "#fee2e2"),
            color: saveMsg.startsWith("✅") ? "#166534" : (saveMsg.startsWith("⏳") ? "#5b21b6" : "#991b1b"),
            fontSize: "0.95em",
            border: `1px solid ${saveMsg.startsWith("✅") ? "#86efac" : (saveMsg.startsWith("⏳") ? "#c4b5fd" : "#fecaca")}`,
          }}>{saveMsg}</span>
        )}
      </div>

      {/* Table */}
      <div style={{
        background: "rgba(255,255,255,.85)",
        borderRadius: 18,
        boxShadow: "0 12px 28px rgba(81, 46, 95, 0.10)",
        border: "1px solid rgba(255,255,255,.7)",
        backdropFilter: "blur(6px)",
        padding: 12,
        overflowX: "auto"
      }}>
        <table style={{
          width: "100%",
          background: "#fff",
          borderRadius: 14,
          overflow: "hidden",
          borderCollapse: "collapse",
          minWidth: 1600
        }}>
          <thead>
            <tr style={{ background: "linear-gradient(180deg, #f3e8ff, #e9d5ff)", color: "#512e5f" }}>
              <th style={th}>التسلسل / SL.NO</th>
              <th style={th}>اسم المنتج / PRODUCT NAME</th>
              <th style={th}>المنشأ / ORIGIN</th>
              <th style={th}>الزبون / CUSTOMER</th>
              <th style={th}>🚚 رقم السيارة / CAR NUMBER</th>
              <th style={th}>👨‍✈️ اسم السائق / DRIVER NAME</th>
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
              <tr key={idx} style={{ background: idx % 2 ? "#faf5ff" : "#fff", transition: "background .15s" }}>
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
                    placeholder="رقم السيارة / Car number"
                    value={row.carNumber || ""}
                    onChange={e => handleChange(idx, "carNumber", e.target.value)} />
                </td>
                <td style={td}>
                  <input style={input}
                    placeholder="اسم السائق / Driver name"
                    value={row.driverName || ""}
                    onChange={e => handleChange(idx, "driverName", e.target.value)} />
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
const th = {
  padding: "12px 10px",
  borderBottom: "2px solid #d8b4fe",
  fontSize: 12,
  fontWeight: 800,
  whiteSpace: "nowrap",
  textAlign: "center",
  letterSpacing: ".3px",
};
const td = {
  padding: "8px 9px",
  borderBottom: "1px solid #f3e8ff",
};
const input = {
  width: "100%",
  padding: "9px 11px",
  borderRadius: 10,
  border: "1.5px solid #d8b4fe",
  outline: "none",
  background: "#fdfaff",
  fontSize: 13,
  transition: "border-color .15s, box-shadow .15s, background .15s",
};
const rowActions = { display: "flex", justifyContent: "center", marginTop: 16 };
const btnAdd = {
  background: "linear-gradient(135deg, #2563eb, #3b82f6)",
  color: "#fff", border: "none",
  padding: "11px 26px", borderRadius: 14, fontWeight: "bold",
  boxShadow: "0 6px 18px rgba(37,99,235,.30)", cursor: "pointer",
  fontSize: "1.02em",
  transition: "transform .15s, box-shadow .15s",
};
const btnDel = {
  background: "linear-gradient(135deg, #ef4444, #f87171)",
  color: "#fff", border: "none",
  padding: "7px 12px", borderRadius: 10, fontWeight: 800,
  cursor: "pointer",
  boxShadow: "0 4px 10px rgba(239,68,68,.25)",
};
const btnImg = {
  background: "linear-gradient(135deg, #2563eb, #60a5fa)",
  color: "#fff", border: "none",
  padding: "7px 13px", borderRadius: 10, fontWeight: 800,
  cursor: "pointer",
  boxShadow: "0 4px 10px rgba(37,99,235,.25)",
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
