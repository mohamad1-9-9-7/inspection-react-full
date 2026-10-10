// src/pages/monitor/branches/qcs/StockRotationInput.jsx
// QCS — Stock Rotation Audit (FIFO / FEFO) — Input form

import React, { useRef, useState } from "react";
import { queuedMessage, saveReport } from "../../../../utils/reportOutbox";
import { dropKeptPhoto, isKeptPhoto, keepPhotoOrUpload } from "../../../../utils/offlineOutbox";

/* ===== API base ===== */
const API_BASE_DEFAULT = "https://inspection-server-4nvj.onrender.com";
const CRA = (typeof process !== "undefined" && process.env?.REACT_APP_API_URL) || undefined;
let VITE; try { VITE = import.meta.env?.VITE_API_URL; } catch {}
const API_BASE = String(VITE || CRA || API_BASE_DEFAULT).replace(/\/$/, "");
const IS_SAME_ORIGIN = (() => { try { return new URL(API_BASE).origin === window.location.origin; } catch { return false; } })();

const TYPE = "qcs_stock_rotation";
const MAX_EXTRA_IMAGES = 8;

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
  "Other",
];

const STORAGE_AREAS = [
  "Chiller",
  "Freezer",
  "Dry Store",
  "Display Fridge",
  "Display Freezer",
  "Other",
];

const ROTATION_METHODS = [
  "FIFO (First In First Out)",
  "FEFO (First Expired First Out)",
];

const COMPLIANCE_OPTIONS = [
  { value: "compliant", label: "✅ Compliant", color: "#16a34a" },
  { value: "minor", label: "⚠️ Minor non-conformity", color: "#f59e0b" },
  { value: "major", label: "❌ Major non-conformity", color: "#dc2626" },
];

/* Without a connection the photo is kept on the device (blob: URL) and
   uploaded when the record is sent. */
const uploadImage = (file) => keepPhotoOrUpload(file, uploadImageNow);
async function uploadImageNow(file) {
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
  if (isKeptPhoto(url)) return dropKeptPhoto(url);
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
  row4: { display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 8 },
  btnPrimary: { background: "linear-gradient(180deg, #22c55e, #16a34a)", color: "#fff", border: "1.5px solid #15803d", padding: "10px 18px", borderRadius: 999, cursor: "pointer", fontWeight: 900, fontSize: 14 },
  btnSecondary: { background: "#fff", color: "#0f172a", border: "1.5px solid #cbd5e1", padding: "10px 18px", borderRadius: 999, cursor: "pointer", fontWeight: 900, fontSize: 14 },
  btnDanger: { background: "#ef4444", color: "#fff", border: "none", borderRadius: 6, padding: "4px 10px", fontWeight: 800, fontSize: 12, cursor: "pointer" },
  btnSmall: { background: "#0ea5e9", color: "#fff", border: "none", borderRadius: 8, padding: "6px 12px", fontWeight: 800, fontSize: 12, cursor: "pointer" },
  imgGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(110px, 1fr))", gap: 10, marginTop: 8 },
  imgCard: { position: "relative", border: "1px solid #e2e8f0", borderRadius: 10, overflow: "hidden", background: "#f8fafc" },
  imgPreview: { width: "100%", height: 90, objectFit: "cover", display: "block" },
  imgRemove: { position: "absolute", top: 4, right: 4, background: "#ef4444", color: "#fff", border: "none", borderRadius: 999, width: 22, height: 22, fontWeight: 950, fontSize: 12, cursor: "pointer" },
  hint: { fontSize: 11, color: "#64748b", fontWeight: 700, marginTop: 4 },
  msg: (kind) => ({ marginTop: 10, padding: "8px 12px", borderRadius: 8, fontWeight: 800, fontSize: 13, background: kind === "ok" ? "#dcfce7" : kind === "err" ? "#fee2e2" : "#e0f2fe", color: kind === "ok" ? "#166534" : kind === "err" ? "#991b1b" : "#075985" }),
  itemCard: { background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 10, padding: 10, marginBottom: 8 },
  itemHead: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 },
  badge: (color) => ({ display: "inline-block", padding: "3px 9px", borderRadius: 999, background: `${color}22`, color, fontWeight: 900, fontSize: 11 }),
};

const today = () => {
  try { return new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Dubai" }); }
  catch {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  }
};

const newItem = () => ({
  id: Date.now() + Math.random(),
  productCode: "",
  productName: "",
  batchNo: "",
  productionDate: "",
  expiryDate: "",
  quantity: "",
  unit: "PC",
  daysToExpiry: "",
  positionCorrect: true,
  remarks: "",
});

function calcDaysToExpiry(expiryDate) {
  if (!expiryDate) return "";
  try {
    const exp = new Date(expiryDate);
    const now = new Date();
    const diff = Math.ceil((exp - now) / (1000 * 60 * 60 * 24));
    return String(diff);
  } catch { return ""; }
}

export default function StockRotationInput() {
  // Header
  const [date, setDate] = useState(today());
  const [location, setLocation] = useState("QCS Warehouse");
  const [storageArea, setStorageArea] = useState(STORAGE_AREAS[0]);
  const [rotationMethod, setRotationMethod] = useState(ROTATION_METHODS[1]); // FEFO default for meat
  const [auditTime, setAuditTime] = useState("");

  // Items audited
  const [items, setItems] = useState([]);

  // Compliance summary
  const [overallCompliance, setOverallCompliance] = useState("compliant");
  const [findings, setFindings] = useState("");
  const [correctiveActions, setCorrectiveActions] = useState("");
  const [nearExpiryQty, setNearExpiryQty] = useState("");
  const [expiredQty, setExpiredQty] = useState("");

  // Sign-off
  const [auditedBy, setAuditedBy] = useState("");
  const [verifiedBy, setVerifiedBy] = useState("");

  // Images
  const [extraImages, setExtraImages] = useState([]);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState({ kind: "", text: "" });

  const extrasRef = useRef(null);

  function showMsg(kind, text, ms = 2500) {
    setMsg({ kind, text });
    if (ms) setTimeout(() => setMsg({ kind: "", text: "" }), ms);
  }

  function updateItem(id, field, value) {
    setItems((prev) => prev.map((it) => {
      if (it.id !== id) return it;
      const next = { ...it, [field]: value };
      if (field === "expiryDate") next.daysToExpiry = calcDaysToExpiry(value);
      return next;
    }));
  }

  function removeItem(id) {
    setItems((prev) => prev.filter((it) => it.id !== id));
  }

  async function addExtraImages(fileList) {
    const files = Array.from(fileList || []).filter((f) => String(f.type || "").startsWith("image/"));
    if (!files.length) return;
    const remaining = MAX_EXTRA_IMAGES - extraImages.length;
    if (remaining <= 0) { showMsg("err", `Maximum ${MAX_EXTRA_IMAGES} photos`); return; }
    try {
      setBusy(true);
      const urls = [];
      for (const f of files.slice(0, remaining)) {
        try { const u = await uploadImage(f); if (u) urls.push(u); } catch {}
      }
      if (urls.length) {
        setExtraImages((prev) => [...prev, ...urls].slice(0, MAX_EXTRA_IMAGES));
        showMsg("ok", `✅ ${urls.length} photo(s) uploaded`);
      } else {
        showMsg("err", "No photo was uploaded");
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
    setStorageArea(STORAGE_AREAS[0]);
    setRotationMethod(ROTATION_METHODS[1]);
    setAuditTime("");
    setItems([]);
    setOverallCompliance("compliant");
    setFindings("");
    setCorrectiveActions("");
    setNearExpiryQty("");
    setExpiredQty("");
    setAuditedBy("");
    setVerifiedBy("");
    setExtraImages([]);
  }

  async function save() {
    if (!date) { showMsg("err", "Choose the date"); return; }
    if (!auditedBy.trim()) { showMsg("err", "Enter the auditor's name (Audited By)"); return; }
    if (items.length === 0) { showMsg("err", "Add at least one item to audit"); return; }

    const payload = {
      reportDate: date,
      auditTime,
      location,
      storageArea,
      rotationMethod,
      items: items.map((it) => ({
        productCode: it.productCode,
        productName: it.productName,
        batchNo: it.batchNo,
        productionDate: it.productionDate,
        expiryDate: it.expiryDate,
        daysToExpiry: it.daysToExpiry,
        quantity: Number(it.quantity) || 0,
        unit: it.unit,
        positionCorrect: !!it.positionCorrect,
        remarks: it.remarks,
      })),
      summary: {
        overallCompliance,
        nearExpiryQty: Number(nearExpiryQty) || 0,
        expiredQty: Number(expiredQty) || 0,
      },
      findings,
      correctiveActions,
      auditedBy,
      verifiedBy,
      images: { extras: extraImages },
      savedAt: Date.now(),
    };

    try {
      setBusy(true);
      showMsg("info", "Saving...");
      // Without a connection the record waits on this device and is sent
      // later (utils/reportOutbox.js); the form is cleared either way.
      const { queued } = await saveReport({ body: { reporter: "qcs", type: TYPE, payload }, label: "Stock Rotation" });
      showMsg("ok", queued ? queuedMessage("en") : "✅ Record saved");
      resetForm();
    } catch (e) {
      showMsg("err", "❌ Save failed: " + (e?.message || e));
    } finally {
      setBusy(false);
    }
  }

  // Quick stats
  const expiredCount = items.filter((it) => Number(it.daysToExpiry) < 0).length;
  const nearExpiryCount = items.filter((it) => {
    const d = Number(it.daysToExpiry);
    return d >= 0 && d <= 7;
  }).length;
  const wrongPositionCount = items.filter((it) => !it.positionCorrect).length;

  return (
    <div style={S.page} dir="ltr" lang="en">
      {/* ===== Audit Info ===== */}
      <div style={S.card}>
        <h2 style={S.title}>📦 Stock Rotation Audit (FIFO / FEFO)</h2>
        <div style={S.sub}>Check that stock is arranged by production / expiry date under FIFO or FEFO.</div>

        <div style={S.row3}>
          <div>
            <label style={S.label}>Date *</label>
            <input type="date" style={S.input} value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
          <div>
            <label style={S.label}>Location</label>
            <select style={S.input} value={location} onChange={(e) => setLocation(e.target.value)}>
              {LOCATIONS.map((loc) => <option key={loc} value={loc}>{loc}</option>)}
            </select>
          </div>
          <div>
            <label style={S.label}>Audit Time</label>
            <input type="time" style={S.input} value={auditTime} onChange={(e) => setAuditTime(e.target.value)} />
          </div>
        </div>

        <div style={S.row2}>
          <div>
            <label style={S.label}>Storage Area</label>
            <select style={S.input} value={storageArea} onChange={(e) => setStorageArea(e.target.value)}>
              {STORAGE_AREAS.map((a) => <option key={a} value={a}>{a}</option>)}
            </select>
          </div>
          <div>
            <label style={S.label}>Rotation Method</label>
            <select style={S.input} value={rotationMethod} onChange={(e) => setRotationMethod(e.target.value)}>
              {ROTATION_METHODS.map((m) => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>
        </div>
      </div>

      {/* ===== Items ===== */}
      <div style={S.card}>
        <div style={S.itemHead}>
          <h3 style={S.title}>📋 Audited Items</h3>
          <button type="button" style={S.btnSmall} onClick={() => setItems([...items, newItem()])}>
            + Add item
          </button>
        </div>

        {/* Quick stats */}
        {items.length > 0 && (
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 12 }}>
            <span style={S.badge("#0ea5e9")}>Items: {items.length}</span>
            {expiredCount > 0 && <span style={S.badge("#dc2626")}>Expired: {expiredCount}</span>}
            {nearExpiryCount > 0 && <span style={S.badge("#f59e0b")}>Near expiry (≤7 days): {nearExpiryCount}</span>}
            {wrongPositionCount > 0 && <span style={S.badge("#dc2626")}>Wrong position: {wrongPositionCount}</span>}
          </div>
        )}

        {items.length === 0 && (
          <div style={{ ...S.sub, fontStyle: "italic" }}>No items yet. Press "Add item" to record one.</div>
        )}

        {items.map((it, idx) => {
          const days = Number(it.daysToExpiry);
          const isExpired = !isNaN(days) && days < 0;
          const isNear = !isNaN(days) && days >= 0 && days <= 7;
          return (
            <div key={it.id} style={{ ...S.itemCard, borderLeft: `4px solid ${isExpired ? "#dc2626" : isNear ? "#f59e0b" : "#16a34a"}` }}>
              <div style={S.itemHead}>
                <span style={{ fontWeight: 900, fontSize: 13 }}>
                  Item #{idx + 1}
                  {isExpired && <span style={{ ...S.badge("#dc2626"), marginInlineStart: 8 }}>Expired</span>}
                  {isNear && <span style={{ ...S.badge("#f59e0b"), marginInlineStart: 8 }}>Near expiry</span>}
                  {!it.positionCorrect && <span style={{ ...S.badge("#dc2626"), marginInlineStart: 8 }}>Wrong position</span>}
                </span>
                <button type="button" style={S.btnDanger} onClick={() => removeItem(it.id)}>Remove</button>
              </div>

              <div style={S.row3}>
                <div>
                  <label style={S.label}>Item Code</label>
                  <input style={S.input} value={it.productCode} onChange={(e) => updateItem(it.id, "productCode", e.target.value)} placeholder="71001..." />
                </div>
                <div>
                  <label style={S.label}>Product Name</label>
                  <input style={S.input} value={it.productName} onChange={(e) => updateItem(it.id, "productName", e.target.value)} />
                </div>
                <div>
                  <label style={S.label}>Batch No.</label>
                  <input style={S.input} value={it.batchNo} onChange={(e) => updateItem(it.id, "batchNo", e.target.value)} />
                </div>
              </div>

              <div style={S.row3}>
                <div>
                  <label style={S.label}>Production Date</label>
                  <input type="date" style={S.input} value={it.productionDate} onChange={(e) => updateItem(it.id, "productionDate", e.target.value)} />
                </div>
                <div>
                  <label style={S.label}>Expiry Date</label>
                  <input type="date" style={S.input} value={it.expiryDate} onChange={(e) => updateItem(it.id, "expiryDate", e.target.value)} />
                </div>
                <div>
                  <label style={S.label}>Days to Expiry</label>
                  <input style={{ ...S.input, background: isExpired ? "#fee2e2" : isNear ? "#fef3c7" : "#dcfce7", fontWeight: 900 }} value={it.daysToExpiry} readOnly />
                </div>
              </div>

              <div style={S.row3}>
                <div>
                  <label style={S.label}>Quantity</label>
                  <input type="number" min="0" style={S.input} value={it.quantity} onChange={(e) => updateItem(it.id, "quantity", e.target.value)} />
                </div>
                <div>
                  <label style={S.label}>Unit</label>
                  <select style={S.input} value={it.unit} onChange={(e) => updateItem(it.id, "unit", e.target.value)}>
                    {["PC", "KG", "BOX", "PACK", "CARTON", "BAG"].map((u) => <option key={u} value={u}>{u}</option>)}
                  </select>
                </div>
                <div>
                  <label style={S.label}>Position Correct?</label>
                  <select
                    style={{ ...S.input, background: it.positionCorrect ? "#dcfce7" : "#fee2e2", fontWeight: 900 }}
                    value={it.positionCorrect ? "yes" : "no"}
                    onChange={(e) => updateItem(it.id, "positionCorrect", e.target.value === "yes")}
                  >
                    <option value="yes">✅ Yes</option>
                    <option value="no">❌ No</option>
                  </select>
                </div>
              </div>

              <label style={S.label}>Remarks</label>
              <input style={S.input} value={it.remarks} onChange={(e) => updateItem(it.id, "remarks", e.target.value)} placeholder="..." />
            </div>
          );
        })}
      </div>

      {/* ===== Compliance Summary ===== */}
      <div style={S.card}>
        <h3 style={S.title}>✅ Compliance Summary</h3>

        <label style={S.label}>Overall Compliance</label>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 4 }}>
          {COMPLIANCE_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => setOverallCompliance(opt.value)}
              style={{
                padding: "8px 16px",
                borderRadius: 999,
                border: `2px solid ${overallCompliance === opt.value ? opt.color : "#cbd5e1"}`,
                background: overallCompliance === opt.value ? opt.color : "#fff",
                color: overallCompliance === opt.value ? "#fff" : "#0f172a",
                fontWeight: 900,
                fontSize: 13,
                cursor: "pointer",
                fontFamily: "inherit",
              }}
            >
              {opt.label}
            </button>
          ))}
        </div>

        <div style={S.row2}>
          <div>
            <label style={S.label}>Near-Expiry Count</label>
            <input type="number" min="0" style={S.input} value={nearExpiryQty} onChange={(e) => setNearExpiryQty(e.target.value)} />
          </div>
          <div>
            <label style={S.label}>Expired Count</label>
            <input type="number" min="0" style={S.input} value={expiredQty} onChange={(e) => setExpiredQty(e.target.value)} />
          </div>
        </div>

        <label style={S.label}>Findings</label>
        <textarea style={S.textarea} value={findings} onChange={(e) => setFindings(e.target.value)} placeholder="e.g. older stock placed behind newer stock, an expired product found..." />

        <label style={S.label}>Corrective Actions</label>
        <textarea style={S.textarea} value={correctiveActions} onChange={(e) => setCorrectiveActions(e.target.value)} placeholder="e.g. re-arranged, expired products isolated, staff retrained..." />
      </div>

      {/* ===== Sign-off ===== */}
      <div style={S.card}>
        <h3 style={S.title}>✍️ Sign-off</h3>
        <div style={S.row2}>
          <div>
            <label style={S.label}>Audited By *</label>
            <input style={S.input} value={auditedBy} onChange={(e) => setAuditedBy(e.target.value)} placeholder="Employee name" />
          </div>
          <div>
            <label style={S.label}>Verified By</label>
            <input style={S.input} value={verifiedBy} onChange={(e) => setVerifiedBy(e.target.value)} placeholder="Supervisor name" />
          </div>
        </div>
      </div>

      {/* ===== Photos ===== */}
      <div style={S.card}>
        <h3 style={S.title}>📷 Audit Photos (optional)</h3>
        <div style={S.sub}>Shelves, expired items, arrangement, etc. (up to {MAX_EXTRA_IMAGES} photos)</div>

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
        <button style={S.btnSecondary} onClick={resetForm} disabled={busy}>Reset</button>
        <button style={S.btnPrimary} onClick={save} disabled={busy}>
          {busy ? "⏳ Saving..." : "💾 Save"}
        </button>
      </div>

      {msg.text && <div style={S.msg(msg.kind)}>{msg.text}</div>}
    </div>
  );
}
