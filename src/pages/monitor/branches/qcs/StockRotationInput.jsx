// src/pages/monitor/branches/qcs/StockRotationInput.jsx
// QCS — Stock Rotation Audit (FIFO / FEFO) — Input form

import React, { useRef, useState } from "react";

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
  "Other / أخرى",
];

const STORAGE_AREAS = [
  "Chiller / المبرد",
  "Freezer / الفريزر",
  "Dry Store / المخزن الجاف",
  "Display Fridge / ثلاجة العرض",
  "Display Freezer / فريزر العرض",
  "Other / أخرى",
];

const ROTATION_METHODS = [
  "FIFO (First In First Out) / الأقدم أولاً",
  "FEFO (First Expired First Out) / الأقرب انتهاءً أولاً",
];

const COMPLIANCE_OPTIONS = [
  { value: "compliant", label: "✅ مطابق / Compliant", color: "#16a34a" },
  { value: "minor", label: "⚠️ مخالفة طفيفة / Minor", color: "#f59e0b" },
  { value: "major", label: "❌ مخالفة جسيمة / Major", color: "#dc2626" },
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
    if (!date) { showMsg("err", "اختر التاريخ"); return; }
    if (!auditedBy.trim()) { showMsg("err", "أدخل اسم القائم بالتدقيق"); return; }
    if (items.length === 0) { showMsg("err", "أضف على الأقل صنفاً واحداً للتدقيق"); return; }

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

  // Quick stats
  const expiredCount = items.filter((it) => Number(it.daysToExpiry) < 0).length;
  const nearExpiryCount = items.filter((it) => {
    const d = Number(it.daysToExpiry);
    return d >= 0 && d <= 7;
  }).length;
  const wrongPositionCount = items.filter((it) => !it.positionCorrect).length;

  return (
    <div style={S.page}>
      {/* ===== Audit Info ===== */}
      <div style={S.card}>
        <h2 style={S.title}>📦 تدقيق دوران المخزون / Stock Rotation Audit (FIFO/FEFO)</h2>
        <div style={S.sub}>تدقيق ترتيب الأصناف وتواريخ الإنتاج/الانتهاء حسب نظام FIFO أو FEFO</div>

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
            <label style={S.label}>وقت التدقيق / Audit Time</label>
            <input type="time" style={S.input} value={auditTime} onChange={(e) => setAuditTime(e.target.value)} />
          </div>
        </div>

        <div style={S.row2}>
          <div>
            <label style={S.label}>منطقة التخزين / Storage Area</label>
            <select style={S.input} value={storageArea} onChange={(e) => setStorageArea(e.target.value)}>
              {STORAGE_AREAS.map((a) => <option key={a} value={a}>{a}</option>)}
            </select>
          </div>
          <div>
            <label style={S.label}>طريقة الدوران / Rotation Method</label>
            <select style={S.input} value={rotationMethod} onChange={(e) => setRotationMethod(e.target.value)}>
              {ROTATION_METHODS.map((m) => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>
        </div>
      </div>

      {/* ===== Items ===== */}
      <div style={S.card}>
        <div style={S.itemHead}>
          <h3 style={S.title}>📋 الأصناف المدققة / Audited Items</h3>
          <button type="button" style={S.btnSmall} onClick={() => setItems([...items, newItem()])}>
            + إضافة صنف
          </button>
        </div>

        {/* Quick stats */}
        {items.length > 0 && (
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 12 }}>
            <span style={S.badge("#0ea5e9")}>الأصناف: {items.length}</span>
            {expiredCount > 0 && <span style={S.badge("#dc2626")}>منتهية: {expiredCount}</span>}
            {nearExpiryCount > 0 && <span style={S.badge("#f59e0b")}>قريبة الانتهاء (≤7 أيام): {nearExpiryCount}</span>}
            {wrongPositionCount > 0 && <span style={S.badge("#dc2626")}>وضع خاطئ: {wrongPositionCount}</span>}
          </div>
        )}

        {items.length === 0 && (
          <div style={{ ...S.sub, fontStyle: "italic" }}>لم تتم إضافة أصناف بعد. اضغط "إضافة صنف" لتسجيل صنف للتدقيق.</div>
        )}

        {items.map((it, idx) => {
          const days = Number(it.daysToExpiry);
          const isExpired = !isNaN(days) && days < 0;
          const isNear = !isNaN(days) && days >= 0 && days <= 7;
          return (
            <div key={it.id} style={{ ...S.itemCard, borderLeft: `4px solid ${isExpired ? "#dc2626" : isNear ? "#f59e0b" : "#16a34a"}` }}>
              <div style={S.itemHead}>
                <span style={{ fontWeight: 900, fontSize: 13 }}>
                  صنف #{idx + 1}
                  {isExpired && <span style={{ ...S.badge("#dc2626"), marginInlineStart: 8 }}>منتهٍ</span>}
                  {isNear && <span style={{ ...S.badge("#f59e0b"), marginInlineStart: 8 }}>قريب الانتهاء</span>}
                  {!it.positionCorrect && <span style={{ ...S.badge("#dc2626"), marginInlineStart: 8 }}>وضع خاطئ</span>}
                </span>
                <button type="button" style={S.btnDanger} onClick={() => removeItem(it.id)}>حذف</button>
              </div>

              <div style={S.row3}>
                <div>
                  <label style={S.label}>كود الصنف / Code</label>
                  <input style={S.input} value={it.productCode} onChange={(e) => updateItem(it.id, "productCode", e.target.value)} placeholder="71001..." />
                </div>
                <div>
                  <label style={S.label}>اسم الصنف / Product Name</label>
                  <input style={S.input} value={it.productName} onChange={(e) => updateItem(it.id, "productName", e.target.value)} />
                </div>
                <div>
                  <label style={S.label}>رقم الدفعة / Batch No.</label>
                  <input style={S.input} value={it.batchNo} onChange={(e) => updateItem(it.id, "batchNo", e.target.value)} />
                </div>
              </div>

              <div style={S.row3}>
                <div>
                  <label style={S.label}>تاريخ الإنتاج / Production Date</label>
                  <input type="date" style={S.input} value={it.productionDate} onChange={(e) => updateItem(it.id, "productionDate", e.target.value)} />
                </div>
                <div>
                  <label style={S.label}>تاريخ الانتهاء / Expiry Date</label>
                  <input type="date" style={S.input} value={it.expiryDate} onChange={(e) => updateItem(it.id, "expiryDate", e.target.value)} />
                </div>
                <div>
                  <label style={S.label}>الأيام المتبقية / Days to Expiry</label>
                  <input style={{ ...S.input, background: isExpired ? "#fee2e2" : isNear ? "#fef3c7" : "#dcfce7", fontWeight: 900 }} value={it.daysToExpiry} readOnly />
                </div>
              </div>

              <div style={S.row3}>
                <div>
                  <label style={S.label}>الكمية / Quantity</label>
                  <input type="number" min="0" style={S.input} value={it.quantity} onChange={(e) => updateItem(it.id, "quantity", e.target.value)} />
                </div>
                <div>
                  <label style={S.label}>الوحدة / Unit</label>
                  <select style={S.input} value={it.unit} onChange={(e) => updateItem(it.id, "unit", e.target.value)}>
                    {["PC", "KG", "BOX", "PACK", "CARTON", "BAG"].map((u) => <option key={u} value={u}>{u}</option>)}
                  </select>
                </div>
                <div>
                  <label style={S.label}>الترتيب صحيح؟ / Position Correct?</label>
                  <select
                    style={{ ...S.input, background: it.positionCorrect ? "#dcfce7" : "#fee2e2", fontWeight: 900 }}
                    value={it.positionCorrect ? "yes" : "no"}
                    onChange={(e) => updateItem(it.id, "positionCorrect", e.target.value === "yes")}
                  >
                    <option value="yes">✅ نعم / Yes</option>
                    <option value="no">❌ لا / No</option>
                  </select>
                </div>
              </div>

              <label style={S.label}>ملاحظات / Remarks</label>
              <input style={S.input} value={it.remarks} onChange={(e) => updateItem(it.id, "remarks", e.target.value)} placeholder="..." />
            </div>
          );
        })}
      </div>

      {/* ===== Compliance Summary ===== */}
      <div style={S.card}>
        <h3 style={S.title}>✅ ملخص المطابقة / Compliance Summary</h3>

        <label style={S.label}>التقييم العام / Overall Compliance</label>
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
            <label style={S.label}>عدد الأصناف القريبة الانتهاء / Near-Expiry Count</label>
            <input type="number" min="0" style={S.input} value={nearExpiryQty} onChange={(e) => setNearExpiryQty(e.target.value)} />
          </div>
          <div>
            <label style={S.label}>عدد الأصناف المنتهية / Expired Count</label>
            <input type="number" min="0" style={S.input} value={expiredQty} onChange={(e) => setExpiredQty(e.target.value)} />
          </div>
        </div>

        <label style={S.label}>الملاحظات / Findings</label>
        <textarea style={S.textarea} value={findings} onChange={(e) => setFindings(e.target.value)} placeholder="الأصناف القديمة موضوعة خلف الجديدة، أو وجد منتج منتهٍ..." />

        <label style={S.label}>الإجراءات التصحيحية / Corrective Actions</label>
        <textarea style={S.textarea} value={correctiveActions} onChange={(e) => setCorrectiveActions(e.target.value)} placeholder="إعادة الترتيب، عزل المنتجات المنتهية، تدريب الموظفين..." />
      </div>

      {/* ===== Sign-off ===== */}
      <div style={S.card}>
        <h3 style={S.title}>✍️ التوقيع / Sign-off</h3>
        <div style={S.row2}>
          <div>
            <label style={S.label}>القائم بالتدقيق / Audited By *</label>
            <input style={S.input} value={auditedBy} onChange={(e) => setAuditedBy(e.target.value)} placeholder="اسم الموظف" />
          </div>
          <div>
            <label style={S.label}>المعتمد / Verified By</label>
            <input style={S.input} value={verifiedBy} onChange={(e) => setVerifiedBy(e.target.value)} placeholder="اسم المشرف" />
          </div>
        </div>
      </div>

      {/* ===== Photos ===== */}
      <div style={S.card}>
        <h3 style={S.title}>📷 صور التدقيق / Audit Photos (اختياري)</h3>
        <div style={S.sub}>صور للأرفف، الأصناف المنتهية، الترتيب، إلخ (حتى {MAX_EXTRA_IMAGES} صور)</div>

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
