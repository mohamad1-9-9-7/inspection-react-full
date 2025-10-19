// src/pages/monitor/branches/ftr1/FTR1ReceivingLog.jsx
import React, { useMemo, useState } from "react";

const API_BASE = String(
  (typeof window !== "undefined" && window.__QCS_API__) ||
  (typeof process !== "undefined" &&
    (process.env.REACT_APP_API_URL ||
     process.env.VITE_API_URL ||
     process.env.RENDER_EXTERNAL_URL)) ||
  "https://inspection-server-4nvj.onrender.com"
).replace(/\/$/, "");

// Report type & branch (FTR 1)
const TYPE   = "ftr1_receiving_log_butchery";
const BRANCH = "FTR 1";

// C / NC columns (Firmness REMOVED)
const TICK_COLS = [
  { key: "vehicleClean",   label: "Vehicle clean" },
  { key: "handlerHygiene", label: "Food handler hygiene" },
  { key: "appearanceOK",   label: "Appearance" },
  { key: "smellOK",        label: "Smell" },
  { key: "packagingGood",  label: "Packaging of food is good / undamaged / clean / no pests" },
];

function emptyRow() {
  return {
    supplier: "",
    foodItem: "",
    dmApprovalNo: "",
    vehicleTemp: "",
    foodTemp: "",
    vehicleClean: "",
    handlerHygiene: "",
    appearanceOK: "",
    smellOK: "",
    packagingGood: "",
    countryOfOrigin: "",
    productionDate: "",
    expiryDate: "",
    remarks: "",
    receivedBy: "",
    images: ["", "", "", ""],
  };
}

// اليوم بصيغة en-CA
function todayEnCA() {
  try {
    return new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Dubai" });
  } catch {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
  }
}

/* ===== Modal بسيطة ===== */
function Modal({ open, title, children, onClose, lock = false }) {
  if (!open) return null;
  return (
    <div
      role="dialog"
      aria-modal="true"
      onClick={(e) => { if (!lock && e.target === e.currentTarget) onClose?.(); }}
      style={{
        position: "fixed", inset: 0, background: "rgba(15,23,42,0.55)",
        display: "flex", alignItems: "center", justifyContent: "center", zIndex: 9999
      }}
    >
      <div
        style={{
          width: "min(92vw, 520px)", background: "#fff", borderRadius: 12, padding: 18,
          boxShadow: "0 16px 48px rgba(0,0,0,.25)", border: "1px solid #e5e7eb"
        }}
      >
        {title && <h3 style={{ margin: 0, marginBottom: 10, fontWeight: 800, color: "#0f172a" }}>{title}</h3>}
        <div style={{ color: "#111827", lineHeight: 1.5 }}>{children}</div>
        {!lock && (
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 14 }}>
            <button
              onClick={onClose}
              style={{
                background: "#2563eb", color: "#fff", border: "none",
                padding: "8px 14px", borderRadius: 8, fontWeight: 700, cursor: "pointer"
              }}
            >
              حسناً
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default function FTR1ReceivingLog() {
  // Header fields
  const [reportDate, setReportDate] = useState(() => todayEnCA());
  const [formRef, setFormRef] = useState("TELT/QC/RECLOG/01");
  const [classification] = useState("Official");
  const [invoiceNo, setInvoiceNo] = useState("");

  // rows (default 4)
  const INITIAL_ROWS = 4;
  const [rows, setRows] = useState(() => Array.from({ length: INITIAL_ROWS }, () => emptyRow()));

  // footer
  const [checkedBy, setCheckedBy]   = useState("");
  const [verifiedBy, setVerifiedBy] = useState("");
  const [saving, setSaving] = useState(false);

  // Modal state
  const [modal, setModal] = useState({ open: false, title: "", content: null, lock: false });
  const openModal = (title, content, { lock = false } = {}) =>
    setModal({ open: true, title, content, lock });
  const closeModal = () => setModal((m) => ({ ...m, open: false }));

  const monthText = useMemo(() => {
    const m = String(reportDate || "").match(/^(\d{4})-(\d{2})-\d{2}$/);
    return m ? `${m[2]}/${m[1]}` : "";
  }, [reportDate]);

  // ---- Styles ----
  const gridStyle = useMemo(() => ({
    width: "100%",
    borderCollapse: "separate",
    borderSpacing: 0,
    tableLayout: "fixed",
    fontSize: 12,
  }), []);

  const thCell = {
    position: "sticky",
    top: 0,
    zIndex: 1,
    border: "1px solid #1f3b70",
    padding: "6px 4px",
    textAlign: "center",
    whiteSpace: "pre-line",
    fontWeight: 700,
    background: "#f5f8ff",
    color: "#0b1f4d",
  };

  const tdCell = {
    border: "1px solid #1f3b70",
    padding: 4,
    textAlign: "center",
    verticalAlign: "middle",
    background: "#fff",
  };

  const inputStyle = {
    width: "100%",
    height: 30,
    boxSizing: "border-box",
    border: "1px solid #c7d2fe",
    borderRadius: 6,
    padding: "2px 6px",
  };

  const lineInputStyle = {
    flex: "0 1 360px",
    border: "none",
    borderBottom: "2px solid #1f3b70",
    padding: "4px 6px",
    outline: "none",
    fontSize: 12,
    color: "#0b1f4d",
  };

  const btn = (bg) => ({
    background: bg, color: "#fff", border: "none",
    borderRadius: 10, padding: "10px 14px", fontWeight: 700,
    cursor: "pointer", boxShadow: "0 4px 12px rgba(0,0,0,.15)",
    opacity: saving ? 0.8 : 1, pointerEvents: saving ? "none" : "auto"
  });

  const btnSm = (bg) => ({
    background: bg, color: "#fff", border: "none",
    borderRadius: 8, padding: "6px 10px", fontWeight: 700,
    cursor: "pointer",
  });

  const colDefs = useMemo(() => ([
    <col key="supplier" style={{ width: 180, minWidth: 160 }} />,
    <col key="food" style={{ width: 160, minWidth: 150 }} />,
    <col key="dm" style={{ width: 150, minWidth: 140 }} />,
    <col key="vehT" style={{ width: 90, minWidth: 90 }} />,
    <col key="foodT" style={{ width: 90, minWidth: 90 }} />,
    <col key="vehClean" style={{ width: 120, minWidth: 110 }} />,
    <col key="handler" style={{ width: 140, minWidth: 120 }} />,
    <col key="appearanceOK" style={{ width: 120, minWidth: 110 }} />,
    <col key="smellOK" style={{ width: 110, minWidth: 100 }} />,
    <col key="pack" style={{ width: 240, minWidth: 220 }} />,
    <col key="origin" style={{ width: 130, minWidth: 120 }} />,
    <col key="prod" style={{ width: 130, minWidth: 120 }} />,
    <col key="exp" style={{ width: 130, minWidth: 120 }} />,
    <col key="remarks" style={{ width: 180, minWidth: 160 }} />,
    <col key="received" style={{ width: 130, minWidth: 120 }} />,
    <col key="photos" style={{ width: 220, minWidth: 200 }} />,
    <col key="actions" style={{ width: 90, minWidth: 90 }} />,
  ]), []);

  function updateRow(idx, key, val) {
    setRows((prev) => {
      const next = [...prev];
      next[idx] = { ...next[idx], [key]: val };
      return next;
    });
  }

  const hasData = (r) =>
    Object.values({ ...r, images: undefined }).some((v) => String(v || "").trim() !== "") ||
    (r.images?.some(Boolean) ?? false);

  function addRow() { setRows((prev) => [...prev, emptyRow()]); }

  function removeRow(idx) {
    setRows((prev) => {
      if (prev.length === 1) return prev;
      const row = prev[idx];
      if (hasData(row) && !window.confirm("This row has data. Delete it?")) return prev;
      const next = [...prev];
      next.splice(idx, 1);
      return next;
    });
  }

  // صور
  const fileToBase64 = (file) =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });

  async function handleImageChange(rowIdx, slotIdx, file) {
    if (!file) return;
    try {
      const b64 = await fileToBase64(file);
      setRows((prev) => {
        const next = [...prev];
        const imgs = Array.isArray(next[rowIdx].images) ? [...next[rowIdx].images] : ["", "", "", ""];
        imgs[slotIdx] = b64;
        next[rowIdx] = { ...next[rowIdx], images: imgs };
        return next;
      });
    } catch (e) {
      openModal("خطأ", "فشل رفع الصورة.", { lock: false });
      console.error(e);
    }
  }

  function removeImage(rowIdx, slotIdx) {
    setRows((prev) => {
      const next = [...prev];
      const imgs = Array.isArray(next[rowIdx].images) ? [...next[rowIdx].images] : ["", "", "", ""];
      imgs[slotIdx] = "";
      next[rowIdx] = { ...next[rowIdx], images: imgs };
      return next;
    });
  }

  // تفريغ النموذج بعد النجاح
  function resetForm() {
    setRows(Array.from({ length: INITIAL_ROWS }, () => emptyRow()));
    setInvoiceNo("");
    setCheckedBy("");
    setVerifiedBy("");
    setReportDate(todayEnCA());
  }

  async function handleSave() {
    const entries = rows.filter(hasData);
    if (entries.length === 0) {
      openModal("تنبيه", "لا يوجد بيانات للحفظ.", { lock: false });
      return;
    }

    const payload = {
      branch: BRANCH,
      formRef,
      classification,
      reportDate,
      month: monthText,
      invoiceNo,
      entries,
      checkedBy,
      verifiedBy,
      savedAt: Date.now(),
    };

    try {
      setSaving(true);
      // نافذة الحفظ (مقفلة)
      openModal("جارٍ الحفظ…", (
        <div style={{ display:"flex", alignItems:"center", gap:10 }}>
          <span className="spinner" style={{
            width: 16, height: 16, border: "3px solid #dbeafe",
            borderTopColor: "#2563eb", borderRadius: "50%", display: "inline-block",
            animation: "spin 1s linear infinite"
          }} />
          <span>يرجى الانتظار</span>
        </div>
      ), { lock: true });

      const res = await fetch(`${API_BASE}/api/reports`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reporter: "ftr1", type: TYPE, payload }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      // تحديث النافذة إلى نجاح + إغلاق تلقائي
      openModal("تم الحفظ ✅", "تم حفظ التقرير بنجاح.", { lock: false });
      resetForm();
      // إغلاق تلقائي بعد ثانيتين
      setTimeout(() => closeModal(), 2000);
    } catch (e) {
      console.error(e);
      openModal("خطأ", "فشل الحفظ. تحقّق من السيرفر أو الشبكة.", { lock: false });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div style={{ background:"#fff", border:"1px solid #dbe3f4", borderRadius:12, padding:16, color:"#0b1f4d", position:"relative" }}>
      {/* Header */}
      <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:12 }}>
        <div style={{ flex:1 }}>
          <div style={{ fontWeight:800, fontSize:18 }}>Trans Emirates Livestock Trading LLC</div>
          <div style={{ fontWeight:800, fontSize:16 }}>
            Receiving Log <span style={{ fontWeight:600 }}>(Food Truck – FTR 1)</span>
          </div>
        </div>

        {/* Right meta */}
        <div
          style={{
            display:"grid",
            gridTemplateColumns:"auto 170px auto 170px auto 170px auto 170px",
            gap:6,
            alignItems:"center",
            fontSize:12
          }}
        >
          <div>Form Ref. No :</div>
          <input value={formRef} onChange={(e)=>setFormRef(e.target.value)} style={{ ...inputStyle, height:28, borderColor:"#1f3b70" }} />

          <div>Classification :</div>
          <div style={{ border:"1px solid #1f3b70", padding:"4px 6px", height:28, display:"flex", alignItems:"center" }}>{classification}</div>

          <div>Date :</div>
          <input type="date" value={reportDate} onChange={(e)=>setReportDate(e.target.value)} style={{ ...inputStyle, height:28, borderColor:"#1f3b70" }} />

          <div>Invoice No :</div>
          <input value={invoiceNo} onChange={(e)=>setInvoiceNo(e.target.value)} placeholder="e.g. 12345" style={{ ...inputStyle, height:28, borderColor:"#1f3b70" }} />
        </div>
      </div>

      {/* Legend */}
      <div style={{ border:"1px solid #1f3b70", borderBottom:"none" }}>
        <div style={{ ...thCell, position:"static", background:"#e9f0ff" }}>
          LEGEND: (C) – Compliant &nbsp;&nbsp; / &nbsp;&nbsp; (NC) – Non-Compliant
        </div>
      </div>

      {/* Table */}
      <div style={{ overflowX:"auto", width:"100%" }}>
        <table style={gridStyle}>
          <colgroup>{colDefs}</colgroup>
          <thead>
            <tr>
              <th style={thCell}>Name of the Supplier</th>
              <th style={thCell}>Food Item</th>
              <th style={thCell}>DM approval number of the delivery vehicle</th>
              <th style={thCell}>Vehicle Temp (°C)</th>
              <th style={thCell}>Food Temp (°C)</th>
              <th style={thCell}>Vehicle clean</th>
              <th style={thCell}>Food handler hygiene</th>
              <th style={thCell}>Appearance</th>
              <th style={thCell}>Smell</th>
              <th style={thCell}>Packaging of food is good and undamaged, clean and no signs of pest infestation</th>
              <th style={thCell}>Country of origin</th>
              <th style={thCell}>Production Date</th>
              <th style={thCell}>Expiry Date</th>
              <th style={thCell}>Remarks (if any)</th>
              <th style={thCell}>Received by</th>
              <th style={thCell}>Photos (up to 4)</th>
              <th style={thCell}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, idx) => (
              <tr key={idx}>
                <td style={tdCell}><input type="text" value={r.supplier} onChange={(e)=>updateRow(idx, "supplier", e.target.value)} style={inputStyle} /></td>
                <td style={tdCell}><input type="text" value={r.foodItem} onChange={(e)=>updateRow(idx, "foodItem", e.target.value)} style={inputStyle} /></td>
                <td style={tdCell}><input type="text" value={r.dmApprovalNo} onChange={(e)=>updateRow(idx, "dmApprovalNo", e.target.value)} style={inputStyle} /></td>
                <td style={tdCell}><input type="number" step="0.1" value={r.vehicleTemp} onChange={(e)=>updateRow(idx, "vehicleTemp", e.target.value)} style={inputStyle} placeholder="°C" /></td>
                <td style={tdCell}><input type="number" step="0.1" value={r.foodTemp} onChange={(e)=>updateRow(idx, "foodTemp", e.target.value)} style={inputStyle} placeholder="°C" /></td>

                {TICK_COLS.map((c) => (
                  <td key={c.key} style={tdCell}>
                    <select
                      value={r[c.key]}
                      onChange={(e)=>updateRow(idx, c.key, e.target.value)}
                      style={{ ...inputStyle, height:30 }}
                      title="C = Compliant, NC = Non-Compliant"
                    >
                      <option value=""></option>
                      <option value="C">C</option>
                      <option value="NC">NC</option>
                    </select>
                  </td>
                ))}

                <td style={tdCell}><input type="text" value={r.countryOfOrigin} onChange={(e)=>updateRow(idx, "countryOfOrigin", e.target.value)} style={inputStyle} /></td>
                <td style={tdCell}><input type="date" value={r.productionDate} onChange={(e)=>updateRow(idx, "productionDate", e.target.value)} style={inputStyle} /></td>
                <td style={tdCell}><input type="date" value={r.expiryDate} onChange={(e)=>updateRow(idx, "expiryDate", e.target.value)} style={inputStyle} /></td>
                <td style={tdCell}><input type="text" value={r.remarks} onChange={(e)=>updateRow(idx, "remarks", e.target.value)} style={inputStyle} /></td>
                <td style={tdCell}><input type="text" value={r.receivedBy} onChange={(e)=>updateRow(idx, "receivedBy", e.target.value)} style={inputStyle} /></td>

                {/* Photos */}
                <td style={{ ...tdCell, padding: 6 }}>
                  <div style={{ display:"flex", gap:6, overflowX:"auto" }}>
                    {[0,1,2,3].map((i) => {
                      const inputId = `file-${idx}-${i}`;
                      const hasImg = Boolean(r.images?.[i]);
                      return (
                        <div key={i} style={{ position:"relative", width:60, minWidth:60, height:60, borderRadius:6, overflow:"hidden", border: hasImg ? "1px solid #cbd5e1" : "1px dashed #cbd5e1", background:"#f8fafc" }}>
                          {hasImg ? (
                            <>
                              <label htmlFor={inputId} title="Replace" style={{ cursor:"pointer", display:"block", width:"100%", height:"100%" }}>
                                <img src={r.images[i]} alt={`row-${idx}-img-${i}`} style={{ width:"100%", height:"100%", objectFit:"cover" }} />
                              </label>
                              <button
                                type="button"
                                onClick={() => removeImage(idx, i)}
                                title="Remove"
                                style={{
                                  position:"absolute", top:2, right:2, width:18, height:18,
                                  border:"none", borderRadius:"50%", background:"#ef4444", color:"#fff",
                                  lineHeight:"18px", fontSize:12, cursor:"pointer"
                                }}
                              >×</button>
                              <input id={inputId} type="file" accept="image/*" style={{ display:"none" }}
                                onChange={(e)=>handleImageChange(idx, i, e.target.files?.[0])}/>
                            </>
                          ) : (
                            <>
                              <label htmlFor={inputId} style={{ cursor:"pointer", width:"100%", height:"100%", display:"flex", alignItems:"center", justifyContent:"center", color:"#6b7280", fontSize:12 }}>+ Upload</label>
                              <input id={inputId} type="file" accept="image/*" style={{ display:"none" }}
                                onChange={(e)=>handleImageChange(idx, i, e.target.files?.[0])}/>
                            </>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </td>

                {/* Actions */}
                <td style={tdCell}>
                  <button type="button" onClick={() => removeRow(idx)} title="Delete row" style={btnSm("#ef4444")}>
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Controls */}
      <div style={{ display:"flex", gap:8, marginTop:12, flexWrap:"wrap" }}>
        <button type="button" onClick={addRow} style={btn("#10b981")}>+ Add row</button>
        <button onClick={handleSave} disabled={saving} style={btn("#2563eb")}>
          {saving ? "Saving…" : "Save Receiving Log"}
        </button>
      </div>

      {/* Notes */}
      <div style={{ marginTop:10, fontSize:11, color:"#0b1f4d" }}>
        <div style={{ fontWeight:700, marginBottom:4 }}>Organoleptic Checks*</div>
        <div>Appearance: Normal colour (Free from discoloration)</div>
        <div>Smell: Normal smell (No rancid or strange smell)</div>
        <div style={{ marginTop:8 }}>
          <strong>Note:</strong> For Chilled Food: Target ≤ 5°C (Critical Limit: 5°C; short deviations up to 15 minutes during transfer).&nbsp;
          For Frozen Food: Target ≤ -18°C (Critical limits: RTE Frozen ≤ -18°C, Raw Frozen ≤ -10°C).&nbsp;
          For Hot Food: Target ≥ 60°C (Critical Limit: 60°C).&nbsp;
          Dry food, Low Risk: Receive at cool, dry condition or ≤ 25°C, or as per product requirement.
        </div>
      </div>

      {/* Footer */}
      <div style={{ marginTop:16 }}>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:16, alignItems:"center", fontSize:12 }}>
          <div style={{ display:"flex", alignItems:"center", gap:8 }}>
            <strong style={{ whiteSpace:"nowrap" }}>Checked by:</strong>
            <input value={checkedBy} onChange={(e)=>setCheckedBy(e.target.value)} placeholder="Name" aria-label="Checked by" style={lineInputStyle} />
          </div>
          <div style={{ display:"flex", alignItems:"center", gap:8, justifyContent:"flex-end" }}>
            <strong style={{ whiteSpace:"nowrap" }}>Verified by:</strong>
            <input value={verifiedBy} onChange={(e)=>setVerifiedBy(e.target.value)} placeholder="Name" aria-label="Verified by" style={lineInputStyle} />
          </div>
        </div>
      </div>

      {/* Modal (حاضر دائمًا عند الحاجة) */}
      <Modal open={modal.open} title={modal.title} onClose={closeModal} lock={modal.lock}>
        {modal.content}
      </Modal>

      {/* محرك دوران بسيط للـ spinner */}
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}
