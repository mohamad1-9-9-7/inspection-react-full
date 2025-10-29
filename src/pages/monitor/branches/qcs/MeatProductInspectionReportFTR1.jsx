// src/pages/monitor/branches/qcs/MeatProductInspectionReportFTR1.jsx
import React, { useMemo, useState } from "react";

/* ===== API base ===== */
const API_BASE = String(
  (typeof window !== "undefined" && window.__QCS_API__) ||
  (typeof process !== "undefined" &&
    (process.env.REACT_APP_API_URL ||
     process.env.VITE_API_URL ||
     process.env.RENDER_EXTERNAL_URL)) ||
  "https://inspection-server-4nvj.onrender.com"
).replace(/\/$/, "");

/* ===== Constants (FTR 1 • Mushrif only) ===== */
const TYPE = "ftr1_preloading_inspection";
const BRANCH = "FTR 1 Food Truck";
const FIXED_AREA = "MUSHRIF PARK";

/* ===== Styles ===== */
const sheet = {
  background: "#c8cfdaff",
  border: "1px solid #c7d2fe",
  borderRadius: 12,
  padding: 12,
  color: "#0b1f4d",
  fontSize: 12,
};
const th = {
  border: "1px solid #1f3b70",
  padding: "6px 4px",
  textAlign: "center",
  whiteSpace: "pre-line",
  fontWeight: 700,
  background: "#becff5ff",
  color: "#0b1f4d",
};
const td = {
  border: "1px solid #1f3b70",
  padding: "6px 4px",
  textAlign: "center",
  verticalAlign: "middle",
};
const rowHead = { ...td, fontWeight: 800, background: "#e3d6eaff" };
const baseInput = {
  width: "100%",
  boxSizing: "border-box",
  border: "1px solid #c7d2fe",
  borderRadius: 6,
  padding: "4px 6px",
  display: "block",
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
  minWidth: 0,
};
const btn = (bg) => ({
  background: bg,
  color: "#252323ff",
  border: "none",
  borderRadius: 10,
  padding: "8px 12px",
  fontWeight: 700,
  cursor: "pointer",
  boxShadow: "0 4px 12px rgba(0,0,0,.15)",
});
const photoWrap = { display: "flex", flexDirection: "column", alignItems: "center", gap: 6 };
const preview = { width: 90, height: 70, objectFit: "cover", borderRadius: 6, border: "1px solid #94a3b8" };
const photoBtn = { ...baseInput, padding: 4 };
const overlay = {
  position: "fixed", inset: 0, background: "rgba(0,0,0,.35)",
  display: "flex", alignItems: "center", justifyContent: "center", zIndex: 9999
};
const modal = {
  background: "#fff", padding: 16, borderRadius: 12, minWidth: 280,
  boxShadow: "0 12px 30px rgba(0,0,0,.2)", textAlign: "center"
};
const tag = (c,bg) => ({ display:"inline-block", padding:"4px 8px", borderRadius:8, fontWeight:800, color:c, background:bg });

/* ===== Helpers ===== */
function todayDubai() {
  try {
    return new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Dubai" });
  } catch {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
  }
}
function ensureObject(v) {
  if (!v) return {};
  if (typeof v === "string") { try { return JSON.parse(v); } catch { return {}; } }
  return v;
}
// ضغط صورة (الأطول ≈1280px, جودة 0.8)
async function fileToBase64Compressed(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("read_error"));
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        try {
          const maxSide = 1280;
          const { width, height } = img;
          const scale = Math.min(1, maxSide / Math.max(width, height));
          const w = Math.round(width * scale), h = Math.round(height * scale);
          const canvas = document.createElement("canvas");
          canvas.width = w; canvas.height = h;
          const ctx = canvas.getContext("2d");
          ctx.drawImage(img, 0, 0, w, h);
          resolve(canvas.toDataURL("image/jpeg", 0.8));
        } catch { resolve(reader.result); }
      };
      img.onerror = () => resolve(reader.result);
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}

function emptySample(no) {
  return {
    no,
    productName: "",
    area: FIXED_AREA,
    truckTemp: "",
    proDate: "",
    expDate: "",
    deliveryDate: "",
    quantity: "",
    colorCode: "",
    productTemp: "",
    labelling: "",
    appearance: "",
    color: "",
    brokenDamage: "",
    badSmell: "",
    overallCondition: "",
    remarks: "",
    photo1Base64: "",
    photo2Base64: "",
  };
}

/* يحول sample إلى عمود ضمن samplesTable.columns (توافق العارض) */
function sampleToColumn(sample) {
  const col = { no: sample.no, sampleId: sample.no };
  const KEYS = [
    "no","productName","area","truckTemp","proDate","expDate","deliveryDate","quantity",
    "colorCode","productTemp","labelling","appearance","color","brokenDamage","badSmell",
    "overallCondition","remarks"
  ];
  for (const k of KEYS) col[k] = sample[k] ?? "";
  col.photo1Base64 = sample.photo1Base64 || "";
  col.photo2Base64 = sample.photo2Base64 || "";
  return col;
}

export default function MeatProductInspectionReportFTR1() {
  // ترويسة
  const [reportDate, setReportDate] = useState(todayDubai());

  // اختيار اليوم + لون الخط
  const dayColorMap = useMemo(() => ({
    Monday:"blue", Tuesday:"yellow", Wednesday:"red", Thursday:"green",
    Friday:"cyan", Saturday:"pink", Sunday:"gray",
  }), []);
  const [reportDay, setReportDay] = useState("Saturday");
  const activeColor = dayColorMap[reportDay] || "#0b1f4d";

  // أعمدة (عينتين افتراضيًا)
  const initialSamples = () => [emptySample(1), emptySample(2)];
  const [samples, setSamples] = useState(initialSamples());
  function addSample() {
    const nextNo = (samples[samples.length - 1]?.no || 0) + 1;
    setSamples((s) => [...s, emptySample(nextNo)]);
  }
  function removeLast() {
    if (samples.length <= 1) return;
    setSamples((s) => s.slice(0, -1));
  }
  function setVal(colIdx, key, val) {
    setSamples((prev) => {
      const next = [...prev];
      next[colIdx] = { ...next[colIdx], [key]: val };
      return next;
    });
  }

  const coloredInput = (extra = {}) => ({ ...baseInput, color: activeColor, ...extra });

  // صور لكل منتج
  async function onPickPhoto(colIdx, key, file) {
    if (!file) return;
    const b64 = await fileToBase64Compressed(file);
    setVal(colIdx, key, b64);
  }

  // Modal + حالة حفظ
  const [saving, setSaving] = useState(false);
  const [modalState, setModalState] = useState({ open: false, text: "", kind: "info" });
  const closeModal = () => setModalState((m) => ({ ...m, open: false }));

  // تقرير واحد لكل يوم/فرع/موقع
  async function checkDuplicateForDay(dateStr) {
    try {
      const res = await fetch(`${API_BASE}/api/reports?type=${encodeURIComponent(TYPE)}`);
      const data = await res.json().catch(() => []);
      const items = Array.isArray(data) ? data :
        (Array.isArray(data?.items) ? data.items :
         (Array.isArray(data?.data) ? data.data : []));
      for (const it of items) {
        const p = ensureObject(it?.payload);
        const d = p?.header?.reportEntryDate || p?.header?.date || (it?.createdAt || "").slice(0,10);
        const site = p?.header?.site || "";
        const branch = p?.branchCode || p?.branch || "";
        if (d === dateStr && site === FIXED_AREA && branch === BRANCH) return true;
      }
      return false;
    } catch { return false; }
  }

  async function handleSave() {
    const anyChecked = samples.some((s) =>
      s.productName || s.productTemp || s.labelling || s.photo1Base64 || s.photo2Base64
    );
    if (!anyChecked) { alert("أدخل بيانات على الأقل لعيّنة واحدة."); return; }

    setSaving(true);
    setModalState({ open: true, text: "Saving… يرجى الانتظار", kind: "info" });

    // منع تكرار اليوم
    const duplicate = await checkDuplicateForDay(reportDate);
    if (duplicate) {
      setSaving(false);
      setModalState({ open: true, text: "⚠️ يوجد تقرير محفوظ لهذا اليوم لنفس الفرع/الموقع.", kind: "warn" });
      return;
    }

    // payload + samplesTable (لتوافق العارض FTR1PreloadingViewer)
    const columns = samples.map(sampleToColumn);
    const DEFAULT_ROWS_DEF = [
      { key:"no",label:"SAMPLE NO" }, { key:"productName",label:"PRODUCT NAME" },
      { key:"area",label:"AREA" }, { key:"truckTemp",label:"TRUCK TEMP",type:"number" },
      { key:"proDate",label:"PRO DATE" }, { key:"expDate",label:"EXP DATE" },
      { key:"deliveryDate",label:"DELIVERY  DATE" }, { key:"quantity",label:"QUANTITY" },
      { key:"colorCode",label:"COLOR CODE" }, { key:"productTemp",label:"PRODUCT  TEMP °C",type:"number" },
      { key:"labelling",label:"LABELLING" }, { key:"appearance",label:"APPEARANCE" },
      { key:"color",label:"COLOR" }, { key:"brokenDamage",label:"BROKEN/DAMAGE" },
      { key:"badSmell",label:"BAD SMELL" }, { key:"overallCondition",label:"OVERALL CONDITION" },
      { key:"remarks",label:"REMARKS" },
    ];

    const payload = {
      branchCode: BRANCH,
      branch: BRANCH,
      header: {
        date: reportDate,              // دعم قديم
        reportEntryDate: reportDate,   // ما يعتمده العارض
        dayOfWeek: reportDay,
        site: FIXED_AREA,
      },
      samples,                         // احتفاظ للتوافق
      samplesTable: { rows: DEFAULT_ROWS_DEF, columns },
      savedAt: Date.now(),
      reporterNote:
        "FTR1 • Mushrif Park • Pre-loading inspection (columns=samples -> samplesTable.columns) + photos per sample",
    };

    try {
      const res = await fetch(`${API_BASE}/api/reports`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reporter: "ftr1", type: TYPE, payload }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      // نجاح: أظهر نجاح + تصفير
      setModalState({ open: true, text: "✅ تم الحفظ بنجاح", kind: "success" });
      setSamples(initialSamples());
      setReportDate(todayDubai());
      setReportDay("Saturday");
    } catch (e) {
      console.error(e);
      setModalState({ open: true, text: "❌ فشل الحفظ. تحقق من الشبكة/الخادم.", kind: "error" });
    } finally {
      setSaving(false);
      setTimeout(() => setModalState((m) => ({ ...m, open: false })), 1500);
    }
  }

  const grid = { width: "100%", borderCollapse: "collapse", tableLayout: "fixed", fontSize: 12 };

  return (
    <div style={sheet}>
      {/* ترويسة المواشي + العنوان */}
      <div style={{ border: "1px solid #64748b", padding: 6, marginBottom: 6 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width:96, height:36, border:"1px solid #64748b",
                        display:"flex", alignItems:"center", justifyContent:"center",
                        fontWeight:800, fontSize:14 }} title="AL MAWASHI">
            Al Mawashi
          </div>
          <div style={{ flex: 1, textAlign: "center" }}>
            <div style={{ fontWeight: 900, fontSize: 13 }}>
              TRANS EMIRATES LIVESTOCK TRADING  LLC
            </div>
            <div style={{ fontWeight: 800, fontSize: 12 }}>
              MEAT PRODUCT INSPECTION REPORT — MUSHRIF PARK (FTR 1)
            </div>
          </div>
        </div>
      </div>

      {/* سطر التاريخ + اختيار اليوم */}
      <div style={{ border:"1px solid #64748b", padding:"6px 8px",
                    display:"flex", gap:10, alignItems:"center",
                    marginBottom:6, flexWrap:"wrap" }}>
        <div style={{ fontWeight: 700 }}>DATE:</div>
        <input type="date" value={reportDate}
               onChange={(e) => setReportDate(e.target.value)}
               style={Object.assign({}, baseInput, { color: activeColor, maxWidth: 180 })} />
        <select value={reportDay} onChange={(e) => setReportDay(e.target.value)}
                style={{ ...baseInput, maxWidth: 160 }} title="Day of Week">
          <option>Monday</option><option>Tuesday</option><option>Wednesday</option>
          <option>Thursday</option><option>Friday</option><option>Saturday</option><option>Sunday</option>
        </select>
        <span style={{ fontWeight: 700, color: activeColor }}>{reportDay}</span>
      </div>

      {/* الجدول: العمود الأيسر ثابت، والعينات أعمدة */}
      <div style={{ overflowX: "auto" }}>
        <table style={grid}>
          <colgroup>
            <col style={{ width: 210 }} />
            {samples.map((_, i) => (<col key={`c${i}`} style={{ width: 160 }} />))}
          </colgroup>

          <thead>
            <tr>
              <th style={th}></th>
              {samples.map((s, idx) => (<th key={idx} style={th}>{s.no}</th>))}
            </tr>
          </thead>

          <tbody>
            <tr>
              <td style={rowHead}>SAMPLE NO</td>
              {samples.map((s, i) => (
                <td key={i} style={td}>
                  <input type="number" value={s.no}
                         onChange={(e) => setVal(i, "no", Number(e.target.value || 0))}
                         style={baseInput} />
                </td>
              ))}
            </tr>

            <tr>
              <td style={rowHead}>PRODUCT NAME</td>
              {samples.map((s, i) => (
                <td key={i} style={td}>
                  <input value={s.productName}
                         onChange={(e) => setVal(i, "productName", e.target.value)}
                         style={baseInput} placeholder="LAMB TIKKA EXTRA" />
                </td>
              ))}
            </tr>

            <tr>
              <td style={rowHead}>AREA</td>
              {samples.map((s, i) => (
                <td key={i} style={td}>
                  <input value={FIXED_AREA} readOnly style={{ ...baseInput, background: "#f1f5f9" }} />
                </td>
              ))}
            </tr>

            <tr>
              <td style={rowHead}>TRUCK TEMP</td>
              {samples.map((s, i) => (
                <td key={i} style={td}>
                  <input type="number" step="0.1" value={s.truckTemp}
                         onChange={(e) => setVal(i, "truckTemp", e.target.value)}
                         style={baseInput} placeholder="°C" />
                </td>
              ))}
            </tr>

            {/* ملون حسب اليوم */}
            <tr>
              <td style={rowHead}>PRO DATE</td>
              {samples.map((s, i) => (
                <td key={i} style={td}>
                  <input type="date" value={s.proDate}
                         onChange={(e) => setVal(i, "proDate", e.target.value)}
                         style={{ ...baseInput, color: activeColor }} />
                </td>
              ))}
            </tr>

            <tr>
              <td style={rowHead}>EXP DATE</td>
              {samples.map((s, i) => (
                <td key={i} style={td}>
                  <input type="date" value={s.expDate}
                         onChange={(e) => setVal(i, "expDate", e.target.value)}
                         style={{ ...baseInput, color: activeColor }} />
                </td>
              ))}
            </tr>

            <tr>
              <td style={rowHead}>DELIVERY  DATE</td>
              {samples.map((s, i) => (
                <td key={i} style={td}>
                  <input type="date" value={s.deliveryDate}
                         onChange={(e) => setVal(i, "deliveryDate", e.target.value)}
                         style={{ ...baseInput, color: activeColor }} />
                </td>
              ))}
            </tr>

            <tr>
              <td style={rowHead}>QUANTITY</td>
              {samples.map((s, i) => (
                <td key={i} style={td}>
                  <input value={s.quantity}
                         onChange={(e) => setVal(i, "quantity", e.target.value)}
                         style={{ ...baseInput, color: activeColor }} placeholder="e.g., 6 BOX" />
                </td>
              ))}
            </tr>

            <tr>
              <td style={rowHead}>COLOR CODE</td>
              {samples.map((s, i) => (
                <td key={i} style={td}>
                  <input value={s.colorCode}
                         onChange={(e) => setVal(i, "colorCode", e.target.value)}
                         style={{ ...baseInput, color: activeColor }} placeholder="SATURDAY-PINK" />
                </td>
              ))}
            </tr>

            <tr>
              <td style={rowHead}>PRODUCT  TEMP °C</td>
              {samples.map((s, i) => (
                <td key={i} style={td}>
                  <input type="number" step="0.1" value={s.productTemp}
                         onChange={(e) => setVal(i, "productTemp", e.target.value)}
                         style={baseInput} placeholder="°C" />
                </td>
              ))}
            </tr>

            <tr>
              <td style={rowHead}>LABELLING</td>
              {samples.map((s, i) => (
                <td key={i} style={td}>
                  <select value={s.labelling}
                          onChange={(e) => setVal(i, "labelling", e.target.value)}
                          style={baseInput}>
                    <option value="">--</option><option>OK</option><option>NIL</option><option>NC</option>
                  </select>
                </td>
              ))}
            </tr>

            <tr>
              <td style={rowHead}>APPEARANCE</td>
              {samples.map((s, i) => (
                <td key={i} style={td}>
                  <select value={s.appearance}
                          onChange={(e) => setVal(i, "appearance", e.target.value)}
                          style={baseInput}>
                    <option value="">--</option><option>OK</option><option>NIL</option><option>NC</option>
                  </select>
                </td>
              ))}
            </tr>

            <tr>
              <td style={rowHead}>COLOR</td>
              {samples.map((s, i) => (
                <td key={i} style={td}>
                  <select value={s.color}
                          onChange={(e) => setVal(i, "color", e.target.value)}
                          style={baseInput}>
                    <option value="">--</option><option>OK</option><option>NIL</option><option>NC</option>
                  </select>
                </td>
              ))}
            </tr>

            <tr>
              <td style={rowHead}>BROKEN/DAMAGE</td>
              {samples.map((s, i) => (
                <td key={i} style={td}>
                  <select value={s.brokenDamage}
                          onChange={(e) => setVal(i, "brokenDamage", e.target.value)}
                          style={baseInput}>
                    <option value="">--</option><option>OK</option><option>NIL</option><option>NC</option>
                  </select>
                </td>
              ))}
            </tr>

            <tr>
              <td style={rowHead}>BAD SMELL</td>
              {samples.map((s, i) => (
                <td key={i} style={td}>
                  <select value={s.badSmell}
                          onChange={(e) => setVal(i, "badSmell", e.target.value)}
                          style={baseInput}>
                    <option value="">--</option><option>OK</option><option>NIL</option><option>NC</option>
                  </select>
                </td>
              ))}
            </tr>

            <tr>
              <td style={rowHead}>OVERALL CONDITION</td>
              {samples.map((s, i) => (
                <td key={i} style={td}>
                  <select value={s.overallCondition}
                          onChange={(e) => setVal(i, "overallCondition", e.target.value)}
                          style={baseInput}>
                    <option value="">--</option><option>OK</option><option>NIL</option><option>NC</option>
                  </select>
                </td>
              ))}
            </tr>

            <tr>
              <td style={rowHead}>REMARKS</td>
              {samples.map((s, i) => (
                <td key={i} style={td}>
                  <input value={s.remarks}
                         onChange={(e) => setVal(i, "remarks", e.target.value)}
                         style={baseInput} placeholder="Notes / observations" />
                </td>
              ))}
            </tr>
          </tbody>
        </table>

        {/* إدارة الأعمدة */}
        <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
          <button onClick={addSample} style={btn("#2563eb")}>+ Add Sample</button>
          <button onClick={removeLast} style={btn("#ef4444")}>− Remove Last</button>
        </div>
      </div>

      {/* صور أسفل الجدول: صورتان لكل منتج */}
      <div style={{ marginTop: 12, padding: 10, border: "1px dashed #64748b", borderRadius: 8, background: "#eef2ff" }}>
        <div style={{ fontWeight: 800, marginBottom: 8 }}>Photos (2 per product) — optional</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(170px, 1fr))", gap: 12 }}>
          {samples.map((s, i) => (
            <div key={`ph-${i}`} style={{ border: "1px solid #cbd5e1", borderRadius: 8, padding: 8, background: "#fff" }}>
              <div style={{ fontWeight: 800, marginBottom: 6, textAlign: "center" }}>Sample {s.no}</div>

              <div style={photoWrap}>
                {s.photo1Base64 ? <img alt="" src={s.photo1Base64} style={preview} /> :
                  <div style={{ ...preview, display:"flex", alignItems:"center", justifyContent:"center", color:"#64748b" }}>Photo 1</div>}
                <input type="file" accept="image/*" style={photoBtn}
                       onChange={(e) => onPickPhoto(i, "photo1Base64", e.target.files?.[0])}
                       title="Upload Photo 1" />
              </div>

              <div style={{ height: 8 }} />

              <div style={photoWrap}>
                {s.photo2Base64 ? <img alt="" src={s.photo2Base64} style={preview} /> :
                  <div style={{ ...preview, display:"flex", alignItems:"center", justifyContent:"center", color:"#64748b" }}>Photo 2</div>}
                <input type="file" accept="image/*" style={photoBtn}
                       onChange={(e) => onPickPhoto(i, "photo2Base64", e.target.files?.[0])}
                       title="Upload Photo 2" />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* إجراءات */}
      <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 14 }}>
        <button onClick={handleSave}
                style={{ ...btn("#2563eb"), opacity: saving ? 0.6 : 1, pointerEvents: saving ? "none" : "auto" }}>
          {saving ? "Saving…" : "💾 Save"}
        </button>
      </div>

      {/* Modal */}
      {modalState.open && (
        <div style={overlay} onClick={closeModal}>
          <div style={modal} onClick={(e) => e.stopPropagation()}>
            {modalState.kind === "info"    && <div style={tag("#1f2937","#e5e7eb")}>INFO</div>}
            {modalState.kind === "warn"    && <div style={tag("#7c2d12","#fed7aa")}>WARNING</div>}
            {modalState.kind === "success" && <div style={tag("#065f46","#a7f3d0")}>SUCCESS</div>}
            {modalState.kind === "error"   && <div style={tag("#7f1d1d","#fecaca")}>ERROR</div>}
            <div style={{ marginTop: 10, fontWeight: 800, color: "#0b1f4d" }}>{modalState.text}</div>
            <div style={{ marginTop: 12 }}>
              <button onClick={closeModal} style={btn("#e5e7eb")}>Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
