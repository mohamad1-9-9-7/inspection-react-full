import React, { useMemo, useState } from "react";

/**
 * LoadingLog.jsx
 * - إدخال فقط (يحفظ إلى localStorage)
 * - عربي / إنكليزي مدمج بالليبلات
 * - السجلات تُعرض من تبويب Reports.jsx
 */

const STORAGE_KEY = "cars_loading_inspection_v1";

const Bidi = ({ ar, en }) => (
  <span style={{ display: "inline-block", lineHeight: 1.2 }}>
    <bdi style={{ fontWeight: 800 }}>{ar}</bdi>
    <br />
    <span style={{ opacity: 0.85, fontSize: ".92em" }}>
      <bdi>{en}</bdi>
    </span>
  </span>
);

// عناصر الفحص البصري (عربي/إنكليزي)
const VI_PARAMS = [
  { id: "sealIntact", ar: "ختم الباب سليم / الباب مقفول", en: "Seal Intact / Door Locked" },
  { id: "containerClean", ar: "نظافة الحاوية", en: "Container Clean" },
  { id: "pestDetection", ar: "وجود آفات", en: "Pest Detection" },
  { id: "tempReader", ar: "قارئ الحرارة متاح", en: "Temperature Reader Available" },
  { id: "plasticCurtain", ar: "ستارة بلاستيكية", en: "Plastic Curtain" },
  { id: "badSmell", ar: "رائحة كريهة", en: "Bad Smell" },
  { id: "ppeA", ar: "معدات وقاية: قناع وجه وواقي أذرع", en: "PPE: Face Mask & Hand Sleeve" },
  { id: "ppeB", ar: "معدات وقاية: قفازات وغطاء حذاء", en: "PPE: Gloves – Shoe Cover" },
  { id: "ppeC", ar: "معدات وقاية: معقّم ومريول", en: "PPE: Sanitizer - Apron" },
];

const makeId = () =>
  (window.crypto?.randomUUID?.() || String(Date.now()) + Math.random().toString(16).slice(2));

function loadRows() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]"); } catch { return []; }
}
function saveRows(rows) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(rows)); } catch {}
}

export default function LoadingLog() {
  const [saved, setSaved] = useState(false);
  const [form, setForm] = useState({
    // 🧾 ترويسة المستند (Editable هنا – تُعرض لاحقًا Read-only)
    header: {
      documentTitle: "OUTBOUND CHECKLIST",
      documentNo: "FSM-QM/REC/OCL",
      issueDate: "05/02/2020",
      revisionNo: "0",
      area: "LOGISTIC",
      issuedBy: "MOHAMAD ABDULLAH",
      controllingOfficer: "LOGISTIC MANAGER",
      approvedBy: "HUSSAM O.SARHAN",
    },

    date: new Date().toISOString().split("T")[0],
    vehicleNo: "",
    driverName: "",
    location: "",
    timeStart: "",
    timeEnd: "",
    tempCheck: "",
    visual: VI_PARAMS.reduce((a, p) => ((a[p.id] = { value: "", remarks: "" }), a), {}),
    remarks: "",
    inspectedBy1: "",
    verifiedBy1: "",
    inspectedBy2: "",
    verifiedBy2: "",
  });

  const durationMin = useMemo(() => {
    if (!form.timeStart || !form.timeEnd) return "";
    const [sh, sm] = form.timeStart.split(":").map(Number);
    const [eh, em] = form.timeEnd.split(":").map(Number);
    let d = eh * 60 + em - (sh * 60 + sm);
    if (d < 0) d += 24 * 60;
    return `${d} دقيقة / min`;
  }, [form.timeStart, form.timeEnd]);

  const update = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const updateHeader = (k, v) => setForm((f) => ({ ...f, header: { ...f.header, [k]: v } }));
  const updateVisual = (id, field, value) =>
    setForm((f) => ({ ...f, visual: { ...f.visual, [id]: { ...f.visual[id], [field]: value } } }));

  const resetForm = () =>
    setForm({
      header: {
        documentTitle: "OUTBOUND CHECKLIST",
        documentNo: "FSM-QM/REC/OCL",
        issueDate: "05/02/2020",
        revisionNo: "0",
        area: "LOGISTIC",
        issuedBy: "MOHAMAD ABDULLAH",
        controllingOfficer: "LOGISTIC MANAGER",
        approvedBy: "HUSSAM O.SARHAN",
      },
      date: new Date().toISOString().split("T")[0],
      vehicleNo: "",
      driverName: "",
      location: "",
      timeStart: "",
      timeEnd: "",
      tempCheck: "",
      visual: VI_PARAMS.reduce((a, p) => ((a[p.id] = { value: "", remarks: "" }), a), {}),
      remarks: "",
      inspectedBy1: "",
      verifiedBy1: "",
      inspectedBy2: "",
      verifiedBy2: "",
    });

  const handleSubmit = (e) => {
    e.preventDefault();
    const record = { id: makeId(), createdAt: Date.now(), ...form };
    const next = [record, ...loadRows()];
    saveRows(next);
    setSaved(true);
    resetForm();
    setTimeout(() => setSaved(false), 1800);
  };

  /* ========== تنسيقك الأصلي ========== */
  const page = {
    direction: "rtl",
    fontFamily: "Cairo, system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif",
    padding: "1rem",
    color: "#0f172a",
  };
  const section = {
    background: "#fff",
    borderRadius: 16,
    padding: "1rem",
    marginBottom: 16,
    border: "1px solid #e7eef5",
    boxShadow: "0 6px 24px rgba(15,23,42,.04)",
  };
  const header = {
    margin: "0 0 12px",
    fontSize: "1.1rem",
    fontWeight: 900,
    color: "#0f172a",
    letterSpacing: ".2px",
  };
  const grid = { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(230px, 1fr))", gap: 12 };
  const gridWide = { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 12 };
  const label = { display: "grid", gap: 8 };
  const input = {
    padding: "11px 12px",
    borderRadius: 12,
    border: "1px solid #cbd5e1",
    background: "#fff",
    outline: "none",
    fontWeight: 600,
  };
  const hint = { color: "#64748b", fontSize: ".9rem" };
  const tableWrap = { overflowX: "auto", borderRadius: 12, border: "1px solid #e7eef5" };
  const table = { width: "100%", borderCollapse: "collapse" };
  const th = {
    padding: "12px 10px",
    background: "#f8fafc",
    borderBottom: "1px solid #e7eef5",
    textAlign: "center",
    fontWeight: 900,
    whiteSpace: "nowrap",
  };
  const td = {
    padding: "10px",
    borderBottom: "1px solid #eef2f7",
    textAlign: "center",
    verticalAlign: "middle",
  };
  const tdLeft = { ...td, textAlign: "right" };
  const radioGrp = { display: "flex", gap: 18, justifyContent: "center" };
  const btnRow = { display: "flex", gap: 10, flexWrap: "wrap", marginTop: 10 };
  const btn = {
    padding: "12px 16px",
    borderRadius: 12,
    border: "1px solid #e5e7eb",
    background: "#fff",
    cursor: "pointer",
    fontWeight: 900,
  };
  const btnPrimary = { ...btn, background: "#2563eb", borderColor: "#2563eb", color: "#fff" };
  const toast = {
    position: "fixed",
    right: 16,
    bottom: 16,
    background: "#16a34a",
    color: "#fff",
    padding: "10px 14px",
    borderRadius: 12,
    boxShadow: "0 8px 24px rgba(0,0,0,.12)",
    fontWeight: 800,
  };

  return (
    <div style={page}>
      <form onSubmit={handleSubmit} noValidate>

        {/* 🧾 0) ترويسة المستند */}
        <div style={section}>
          <h3 style={header}>🧾 <Bidi ar="ترويسة المستند" en="Document Header" /></h3>
          <div style={gridWide}>
            <label style={label}>
              <Bidi ar="عنوان المستند" en="Document Title" />
              <input value={form.header.documentTitle} onChange={(e) => updateHeader("documentTitle", e.target.value)} style={input} />
            </label>
            <label style={label}>
              <Bidi ar="رقم المستند" en="Document No" />
              <input value={form.header.documentNo} onChange={(e) => updateHeader("documentNo", e.target.value)} style={input} />
            </label>
            <label style={label}>
              <Bidi ar="تاريخ الإصدار" en="Issue Date" />
              <input value={form.header.issueDate} onChange={(e) => updateHeader("issueDate", e.target.value)} style={input} placeholder="DD/MM/YYYY" />
            </label>
            <label style={label}>
              <Bidi ar="رقم المراجعة" en="Revision No" />
              <input value={form.header.revisionNo} onChange={(e) => updateHeader("revisionNo", e.target.value)} style={input} />
            </label>
            <label style={label}>
              <Bidi ar="المنطقة" en="Area" />
              <input value={form.header.area} onChange={(e) => updateHeader("area", e.target.value)} style={input} />
            </label>
            <label style={label}>
              <Bidi ar="صُدر بواسطة" en="Issued By" />
              <input value={form.header.issuedBy} onChange={(e) => updateHeader("issuedBy", e.target.value)} style={input} />
            </label>
            <label style={label}>
              <Bidi ar="الضابط المسؤول" en="Controlling Officer" />
              <input value={form.header.controllingOfficer} onChange={(e) => updateHeader("controllingOfficer", e.target.value)} style={input} />
            </label>
            <label style={label}>
              <Bidi ar="تمّت الموافقة من قبل" en="Approved By" />
              <input value={form.header.approvedBy} onChange={(e) => updateHeader("approvedBy", e.target.value)} style={input} />
            </label>
          </div>
        </div>

        {/* 1) بيانات أساسية */}
        <div style={section}>
          <h3 style={header}>🚚 <Bidi ar="بيانات أساسية" en="Basic Information" /></h3>
          <div style={grid}>
            <label style={label}>
              <Bidi ar="التاريخ" en="Date" />
              <input type="date" value={form.date} onChange={(e) => update("date", e.target.value)} style={input} />
            </label>
            <label style={label}>
              <Bidi ar="رقم السيارة" en="Vehicle No" />
              <input value={form.vehicleNo} onChange={(e) => update("vehicleNo", e.target.value)} style={input} placeholder="DUB-12345" />
            </label>
            <label style={label}>
              <Bidi ar="اسم السائق" en="Driver Name" />
              <input value={form.driverName} onChange={(e) => update("driverName", e.target.value)} style={input} placeholder="Driver Name" />
            </label>
            <label style={label}>
              <Bidi ar="الموقع" en="Location" />
              <input value={form.location} onChange={(e) => update("location", e.target.value)} style={input} placeholder="Location" />
            </label>
          </div>
        </div>

        {/* 2) الأوقات والحرارة */}
        <div style={section}>
          <h3 style={header}>⏱️ <Bidi ar="الأوقات ودرجة الحرارة" en="Times & Temperature" /></h3>
          <div style={grid}>
            <label style={label}>
              <Bidi ar="وقت البدء" en="Time Start" />
              <input type="time" value={form.timeStart} onChange={(e) => update("timeStart", e.target.value)} style={input} />
            </label>
            <label style={label}>
              <Bidi ar="وقت الانتهاء" en="Time End" />
              <input type="time" value={form.timeEnd} onChange={(e) => update("timeEnd", e.target.value)} style={input} />
            </label>
            <label style={label}>
              <Bidi ar="فحص الحرارة (°C)" en="Temp Check (°C)" />
              <input type="number" step="0.1" value={form.tempCheck} onChange={(e) => update("tempCheck", e.target.value)} style={input} placeholder="مثال: 3.5" />
            </label>
            <div style={{ alignSelf: "end" }}>
              <div style={hint}>{durationMin ? `المدة: ${durationMin}` : <>&nbsp;</>}</div>
            </div>
          </div>
        </div>

        {/* 3) فحص بصري */}
        <div style={section}>
          <h3 style={header}>👁️‍🗨️ <Bidi ar="فحص بصري" en="Visual Inspection" /></h3>
          <div style={tableWrap}>
            <table style={table}>
              <thead>
                <tr>
                  <th style={{ ...th, textAlign: "right" }}><Bidi ar="المعيار" en="Parameters" /></th>
                  <th style={th}><Bidi ar="نعم" en="YES" /></th>
                  <th style={th}><Bidi ar="لا" en="NO" /></th>
                  <th style={th}><Bidi ar="ملاحظات" en="Remarks" /></th>
                </tr>
              </thead>
              <tbody>
                {VI_PARAMS.map((p) => {
                  const cur = form.visual[p.id];
                  return (
                    <tr key={p.id}>
                      <td style={tdLeft}>
                        <div><bdi style={{ fontWeight: 800 }}>{p.ar}</bdi></div>
                        <div style={{ opacity: 0.75, fontSize: ".92em" }}><bdi>{p.en}</bdi></div>
                      </td>
                      <td style={td}>
                        <div style={radioGrp}>
                          <label><input type="radio" name={`vi-${p.id}`} checked={cur.value === "yes"} onChange={() => updateVisual(p.id, "value", "yes")} /></label>
                        </div>
                      </td>
                      <td style={td}>
                        <div style={radioGrp}>
                          <label><input type="radio" name={`vi-${p.id}`} checked={cur.value === "no"} onChange={() => updateVisual(p.id, "value", "no")} /></label>
                        </div>
                      </td>
                      <td style={td}>
                        <input
                          style={{ ...input, minWidth: 220 }}
                          value={cur.remarks}
                          onChange={(e) => updateVisual(p.id, "remarks", e.target.value)}
                          placeholder="—"
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* 4) ملاحظات عامة */}
        <div style={section}>
          <h3 style={header}>📝 <Bidi ar="ملاحظات" en="Remarks" /></h3>
          <textarea
            style={{ ...input, minHeight: 90, resize: "vertical" }}
            value={form.remarks}
            onChange={(e) => update("remarks", e.target.value)}
            placeholder="—"
          />
        </div>

        {/* 5) التواقيع */}
        <div style={section}>
          <h3 style={header}>✍️ <Bidi ar="التواقيع" en="Signatures" /></h3>
          <div style={grid}>
            <label style={label}><Bidi ar="المفتش (1)" en="Inspected By (1)" /><input style={input} value={form.inspectedBy1} onChange={(e)=>update("inspectedBy1", e.target.value)} /></label>
            <label style={label}><Bidi ar="المصادِق (1)" en="Verified By (1)" /><input style={input} value={form.verifiedBy1} onChange={(e)=>update("verifiedBy1", e.target.value)} /></label>
            <label style={label}><Bidi ar="المفتش (2)" en="Inspected By (2)" /><input style={input} value={form.inspectedBy2} onChange={(e)=>update("inspectedBy2", e.target.value)} /></label>
            <label style={label}><Bidi ar="المصادِق (2)" en="Verified By (2)" /><input style={input} value={form.verifiedBy2} onChange={(e)=>update("verifiedBy2", e.target.value)} /></label>
          </div>
        </div>

        {/* أزرار */}
        <div style={btnRow}>
          <button type="submit" style={btnPrimary}>💾 <Bidi ar="حفظ السجل" en="Save Record" /></button>
          <button type="button" style={btn} onClick={resetForm}>🧹 <Bidi ar="تفريغ الحقول" en="Clear" /></button>
        </div>
      </form>

      {saved && <div style={toast}>✅ <bdi>تم الحفظ / Saved</bdi></div>}
    </div>
  );
}
