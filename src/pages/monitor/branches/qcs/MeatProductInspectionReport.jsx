// src/pages/monitor/branches/qcs/MeatProductInspectionReport.jsx
import React, { useEffect, useMemo, useState } from "react";

/* ===== API base ===== */
const API_BASE = String(
  (typeof window !== "undefined" && window.__QCS_API__) ||
    (typeof process !== "undefined" &&
      (process.env.REACT_APP_API_URL ||
        process.env.VITE_API_URL ||
        process.env.RENDER_EXTERNAL_URL)) ||
    "https://inspection-server-4nvj.onrender.com"
).replace(/\/$/, "");

/* ===== Constants (FTR 2 • Mamzar only) ===== */
const TYPE = "ftr2_preloading_inspection";
const BRANCH = "FTR 2 Food Truck";
const FIXED_AREA = "MAMZAR PARK";

/* ✅ Catalog scope on server (separate lists per page if you want) */
const CATALOG_SCOPE = "ftr2_preloading_products";

/* ===== Default Catalog in code (works even if server empty) ===== */
const DEFAULT_PRODUCT_CATALOG = {
  "99386": "BASIL & ROSEMARY SHISH TAWOOK FTR [3SKEWERS] - BOX",
  "99380": "BEEF ANGUS AUS RIBEYE STEAK FTR [250GRMS] - BOX",
  "99387": "BOLETUS CHICKEN CUBES FTR [3SKEWERS] - BOX",
  "71027": "CHICKEN HONEY FTR-BOX",
  "71022": "CHICKEN KABAB FTR - BOX",
  "99381": "CHICKEN STEAK WITH RED SAUCE FTR [250GRMS] - BOX",
  "99382": "CHICKEN STEAK WITH WHITE SAUCE FTR [250GRMS] - BOX",
  "71116": "DRY MEAT AL MAWASHI BEEF HUNTERS BILTONG [40GRMS] - PIECE",
  "71119": "DRY MEAT AL MAWASHI BEEF JAGVELD BILTONG [40GRMS] - PIECE",
  "71117": "DRY MEAT AL MAWASHI HUNTERS DRYWORS [30GRMS] - PIECE",
  "71118": "DRY MEAT AL MAWASHI SALAMI STICKS [30GRMS] - PIECE",
  "99231 plate": "EGGPLANT KABAB FTR PLATE - PLATE",
  "71070": "FATTOUSH FTR - PLATE",
  "99507": "HALABI KABAB FTR PLATE - PLATE",
  "71017-KG": "HAPPINES CUBES-KG",
  "71017": "HAPPINNES CUBES FTR-BOX",
  "71006": "IRANIAN KABAB - BOX",
  "71011": "IRAQI KABAB FTR - BOX",
  "71013": "IZMERLY KABAB FTR_BOX",
  "99508": "KHASHKHASH KABAB FTR PLATE - PLATE",
  "71015": "LAHMANGIYA BOMBS FTR-BOX",
  "71016": "LAHMANGIYA MARSMALLOW FTR-BOX",
  "71016-KG": "LAHMANGIYA MARSMALLOW-KG",
  "71015-KG": "LAMANGIYA BOMBS-KG",
  "71000": "LAMB CHOPS FTR - BOX (Tomahawk)",
  "99513": "LAMB FRENCH RACK [8PIECES] BRAAI KIT - BOX",
  "71001": "LAMB KABAB FTR - BOX",
  "71115": "LAMB KEBAB HOTDOG FTR [240GRMS] - PLATE",
  "99511": "LAMB KUFTA KABAB [480GRMS] BRAAI KIT - BOX",
  "71012": "LAMB LIVER FTR - BOX",
  "71004": "LAMB TIKKA EXTRA FTR - BOX",
  "71002": "LAMB TIKKA FTR - BOX",
  "71005": "LAMB TIKKA WITH YOGHURT - BOX",
  "71014": "Lamb French Rack - FTR",
  "71003": "MIX LAMB (KABAB&TIKKA) FTR - BOX",
  "71023": "MIX SHISH TAWOOK (RED & WHITE) FTR - BOX",
  "99385": "PEPERONI ROSSI SHISH TAWOOK FTR [3SKEWERS] - BOX",
  "71020": "SHISH TAWOOK RED FTR - BOX",
  "71021": "SHISH TAWOOK WHITE FTR - BOX",
  "99383": "THYME & LEMON SHISH TAWOOK FTR [3SKEWERS] - BOX",
  "99384": "THYME & ROSEMARY SHISH TAWOOK FTR [3SKEWERS] - BOX",
};

function normCode(v) {
  return String(v ?? "").trim();
}

/* ===== Rows definition (must match viewers) ===== */
const DEFAULT_ROWS_DEF = [
  { key: "no", label: "SAMPLE NO" },
  { key: "productName", label: "PRODUCT NAME" },
  { key: "area", label: "AREA" },
  { key: "truckTemp", label: "TRUCK TEMP", type: "number" },
  { key: "proDate", label: "PRO DATE" },
  { key: "expDate", label: "EXP DATE" },
  { key: "deliveryDate", label: "DELIVERY  DATE" },
  { key: "quantity", label: "QUANTITY" },
  { key: "colorCode", label: "COLOR CODE" },
  { key: "productTemp", label: "PRODUCT  TEMP °C", type: "number" },
  { key: "labelling", label: "LABELLING" },
  { key: "appearance", label: "APPEARANCE" },
  { key: "color", label: "COLOR" },
  { key: "brokenDamage", label: "BROKEN/DAMAGE" },
  { key: "badSmell", label: "BAD SMELL" },
  { key: "overallCondition", label: "OVERALL CONDITION" },
  { key: "remarks", label: "REMARKS" },
];

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
const overlay = {
  position: "fixed",
  inset: 0,
  background: "rgba(0,0,0,.35)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  zIndex: 9999,
};
const modal = {
  background: "#fff",
  padding: 16,
  borderRadius: 12,
  minWidth: 280,
  boxShadow: "0 12px 30px rgba(0,0,0,.2)",
  textAlign: "center",
};
const tag = (c, bg) => ({
  display: "inline-block",
  padding: "4px 8px",
  borderRadius: 8,
  fontWeight: 800,
  color: c,
  background: bg,
});

/* Helpers */
function todayDubai() {
  try {
    return new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Dubai" });
  } catch {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
      d.getDate()
    ).padStart(2, "0")}`;
  }
}

function ensureObject(v) {
  if (!v) return {};
  if (typeof v === "string") {
    try {
      return JSON.parse(v);
    } catch {
      return {};
    }
  }
  return v;
}

/* ✅ add days safely for YYYY-MM-DD (avoid timezone issues) */
function addDaysISO(ymd, days) {
  const s = String(ymd || "").trim();
  const m = s.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return "";
  const y = Number(m[1]);
  const mo = Number(m[2]);
  const d = Number(m[3]);
  const t = Date.UTC(y, mo - 1, d) + Number(days || 0) * 86400000;
  const dt = new Date(t);
  const yy = dt.getUTCFullYear();
  const mm = String(dt.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(dt.getUTCDate()).padStart(2, "0");
  return `${yy}-${mm}-${dd}`;
}

/* ✅ random product temp 1.1 → 3.4 */
function randProductTemp() {
  const v = 1.1 + Math.random() * (3.4 - 1.1);
  return v.toFixed(1);
}

/* === DEFAULTS + ✅ Dates defaults + ✅ Random product temp === */
function emptySample(no, baseProDate = todayDubai()) {
  const pro = baseProDate || todayDubai();
  return {
    no,
    productCode: "",
    productName: "",
    area: FIXED_AREA,

    // سيتم حقنه وقت الحفظ كقيمة واحدة للجميع
    truckTemp: "",

    proDate: pro,
    expDate: addDaysISO(pro, 2),
    deliveryDate: pro,

    quantity: "",
    colorCode: "",

    // ✅ auto random (editable)
    productTemp: randProductTemp(),

    labelling: "OK",
    appearance: "OK",
    color: "OK",
    brokenDamage: "NIL",
    badSmell: "NIL",
    overallCondition: "OK",
    remarks: "",
    photo1Base64: "",
    photo2Base64: "",
  };
}

/* يحول عنصر من samples إلى عمود في samplesTable.columns */
function sampleToColumn(sample) {
  const col = { no: sample.no, sampleId: sample.no };
  for (const r of DEFAULT_ROWS_DEF) {
    const k = r.key;
    col[k] = sample[k] ?? "";
  }
  col.productCode = sample.productCode || "";
  col.photo1Base64 = sample.photo1Base64 || "";
  col.photo2Base64 = sample.photo2Base64 || "";
  return col;
}

export default function MeatProductInspectionReport() {
  // ✅ catalog من السيرفر + merge مع default
  const [catalog, setCatalog] = useState(() => ({ ...DEFAULT_PRODUCT_CATALOG }));
  const [catalogLoading, setCatalogLoading] = useState(false);

  async function loadCatalogFromServer() {
    setCatalogLoading(true);
    try {
      const res = await fetch(
        `${API_BASE}/api/product-catalog?scope=${encodeURIComponent(CATALOG_SCOPE)}`
      );
      const data = await res.json().catch(() => ({}));
      const serverMap = data?.map && typeof data.map === "object" ? data.map : {};
      setCatalog({ ...DEFAULT_PRODUCT_CATALOG, ...serverMap });
    } catch {
      setCatalog({ ...DEFAULT_PRODUCT_CATALOG });
    } finally {
      setCatalogLoading(false);
    }
  }

  useEffect(() => {
    loadCatalogFromServer();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ترويسة
  const [reportDate, setReportDate] = useState(todayDubai());

  // اختيار اليوم + لون الخط
  const dayColorMap = useMemo(
    () => ({
      Monday: "blue",
      Tuesday: "yellow",
      Wednesday: "red",
      Thursday: "green",
      Friday: "cyan",
      Saturday: "pink",
      Sunday: "gray",
    }),
    []
  );
  const [reportDay, setReportDay] = useState("Saturday");
  const activeColor = dayColorMap[reportDay] || "#0b1f4d";
  const coloredInput = (extra = {}) => ({ ...baseInput, color: activeColor, ...extra });

  // ✅ TRUCK TEMP (one value for all products)
  const [truckTemp, setTruckTemp] = useState("");

  // أسماء المسؤولين (أسفل التقرير فقط)
  const [verifiedBy, setVerifiedBy] = useState("");
  const [matchedBy, setMatchedBy] = useState("");

  // الأعمدة (عينتين افتراضيًا)
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

  // ✅ PRO DATE change → auto update EXP(+2) + DELIVERY(=PRO) if still auto/empty
  function onChangeProDate(sampleIdx, newPro) {
    setSamples((prev) => {
      const next = [...prev];
      const cur = { ...(next[sampleIdx] || {}) };

      const oldPro = String(cur.proDate || "");
      const oldAutoExp = oldPro ? addDaysISO(oldPro, 2) : "";
      const shouldAutoExp = !cur.expDate || String(cur.expDate) === oldAutoExp;
      const shouldAutoDelivery = !cur.deliveryDate || String(cur.deliveryDate) === oldPro;

      cur.proDate = newPro;
      if (shouldAutoExp) cur.expDate = addDaysISO(newPro, 2);
      if (shouldAutoDelivery) cur.deliveryDate = newPro;

      next[sampleIdx] = cur;
      return next;
    });
  }

  // Modal + حالة الحفظ
  const [saving, setSaving] = useState(false);
  const [modalState, setModalState] = useState({ open: false, text: "", kind: "info" });
  const closeModal = () => setModalState((m) => ({ ...m, open: false }));

  // ✅ خانتين فوق الجدول لإضافة منتج غير موجود (على السيرفر)
  const [newProdCode, setNewProdCode] = useState("");
  const [newProdName, setNewProdName] = useState("");

  const codeNorm = normCode(newProdCode);
  const nameNorm = String(newProdName ?? "").trim();
  const canAddProduct = codeNorm && nameNorm && !catalog[codeNorm];

  async function addNewProductToServer() {
    const code = normCode(newProdCode);
    const name = String(newProdName ?? "").trim();

    if (!code || !name) {
      setModalState({ open: true, text: "⚠️ أدخل الكود + اسم المنتج.", kind: "warn" });
      return;
    }
    if (catalog[code]) {
      setModalState({ open: true, text: "⚠️ هذا الكود موجود مسبقًا (ممنوع تكرار).", kind: "warn" });
      return;
    }

    try {
      const res = await fetch(`${API_BASE}/api/product-catalog`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scope: CATALOG_SCOPE, code, name }),
      });

      if (res.status === 409) {
        setModalState({ open: true, text: "⚠️ الكود موجود مسبقًا على السيرفر.", kind: "warn" });
        return;
      }
      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      setCatalog((c) => ({ ...c, [code]: name }));
      setNewProdCode("");
      setNewProdName("");
      setModalState({ open: true, text: "✅ تم إضافة المنتج وحفظه على السيرفر.", kind: "success" });
      setTimeout(() => setModalState((m) => ({ ...m, open: false })), 1200);
    } catch (e) {
      console.error(e);
      setModalState({ open: true, text: "❌ فشل حفظ المنتج على السيرفر.", kind: "error" });
    }
  }

  // ✅ عند كتابة الكود: الاسم يظهر تلقائياً
  function onChangeProductCode(sampleIdx, raw) {
    const code = normCode(raw);
    const mapped = catalog[code];
    setSamples((prev) => {
      const next = [...prev];
      const cur = next[sampleIdx] || {};
      next[sampleIdx] = {
        ...cur,
        productCode: code,
        productName: mapped ? mapped : cur.productName,
      };
      if (mapped) next[sampleIdx].productName = mapped;
      return next;
    });
  }

  async function checkDuplicateForDay(dateStr) {
    try {
      const res = await fetch(`${API_BASE}/api/reports?type=${encodeURIComponent(TYPE)}`);
      const data = await res.json().catch(() => ({}));
      const items = Array.isArray(data)
        ? data
        : Array.isArray(data?.items)
        ? data.items
        : Array.isArray(data?.data)
        ? data.data
        : [];
      for (const it of items) {
        const p = ensureObject(it?.payload);
        const d = p?.header?.reportEntryDate || p?.header?.date || (it?.createdAt || "").slice(0, 10);
        const site = p?.header?.site || "";
        const branch = p?.branchCode || p?.branch || "";
        if (d === dateStr && site === FIXED_AREA && branch === BRANCH) return true;
      }
      return false;
    } catch {
      return false;
    }
  }

  async function handleSave() {
    const anyChecked = samples.some((s) => s.productCode || s.productName || s.productTemp || s.labelling);
    if (!anyChecked) {
      alert("أدخل بيانات على الأقل لعيّنة واحدة.");
      return;
    }

    setSaving(true);
    setModalState({ open: true, text: "Saving… يرجى الانتظار", kind: "info" });

    const duplicate = await checkDuplicateForDay(reportDate);
    if (duplicate) {
      setSaving(false);
      setModalState({ open: true, text: "⚠️ يوجد تقرير محفوظ لهذا اليوم لنفس الفرع/الموقع.", kind: "warn" });
      return;
    }

    // ✅ inject one truck temp into all products (for viewer compatibility)
    const samplesForSave = samples.map((s) => ({ ...s, truckTemp: truckTemp || "" }));
    const columns = samplesForSave.map(sampleToColumn);

    const payload = {
      branchCode: BRANCH,
      branch: BRANCH,
      header: { date: reportDate, reportEntryDate: reportDate, dayOfWeek: reportDay, site: FIXED_AREA },
      samples: samplesForSave,
      samplesTable: { rows: DEFAULT_ROWS_DEF, columns },
      signoff: { verifiedBy, matchedBy },
      savedAt: Date.now(),
      reporterNote: "FTR2 • Mamzar Park • truckTemp single + productTemp random default",
    };

    try {
      const res = await fetch(`${API_BASE}/api/reports`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reporter: "ftr2", type: TYPE, payload }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      setModalState({ open: true, text: "✅ تم الحفظ بنجاح", kind: "success" });
      setSamples(initialSamples());
      setTruckTemp("");
      setReportDate(todayDubai());
      setReportDay("Saturday");
      setVerifiedBy("");
      setMatchedBy("");
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
      {/* Header */}
      <div style={{ border: "1px solid #64748b", padding: 6, marginBottom: 6 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div
            style={{
              width: 96,
              height: 36,
              border: "1px solid #64748b",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontWeight: 800,
              fontSize: 14,
            }}
          >
            Al Mawashi
          </div>
          <div style={{ flex: 1, textAlign: "center" }}>
            <div style={{ fontWeight: 900, fontSize: 13 }}>TRANS EMIRATES LIVESTOCK TRADING  LLC</div>
            <div style={{ fontWeight: 800, fontSize: 12 }}>MEAT PRODUCT INSPECTION REPORT — MAMZAR PARK (FTR 2)</div>
          </div>
        </div>
      </div>

      {/* Date + Day */}
      <div
        style={{
          border: "1px solid #64748b",
          padding: "6px 8px",
          display: "flex",
          gap: 10,
          alignItems: "center",
          marginBottom: 6,
          flexWrap: "wrap",
        }}
      >
        <div style={{ fontWeight: 700 }}>DATE:</div>
        <input
          type="date"
          value={reportDate}
          onChange={(e) => setReportDate(e.target.value)}
          style={coloredInput({ maxWidth: 180 })}
        />
        <select value={reportDay} onChange={(e) => setReportDay(e.target.value)} style={{ ...baseInput, maxWidth: 160 }}>
          <option>Monday</option>
          <option>Tuesday</option>
          <option>Wednesday</option>
          <option>Thursday</option>
          <option>Friday</option>
          <option>Saturday</option>
          <option>Sunday</option>
        </select>
        <span style={{ fontWeight: 700, color: activeColor }}>{reportDay}</span>
      </div>

      {/* ✅ Add Missing Product (Server) */}
      <div
        style={{
          border: "1px solid #94a3b8",
          borderRadius: 10,
          padding: 10,
          background: "#f8fafc",
          marginBottom: 8,
          display: "flex",
          gap: 10,
          alignItems: "center",
          flexWrap: "wrap",
        }}
      >
        <div style={{ fontWeight: 900, color: "#0b1f4d" }}>
          Add Missing Product {catalogLoading ? "(Loading...)" : ""}
        </div>

        <input
          value={newProdCode}
          onChange={(e) => setNewProdCode(e.target.value)}
          style={{ ...baseInput, maxWidth: 170 }}
          placeholder="Product Code"
          list="ftr2_codes_list"
        />
        <input
          value={newProdName}
          onChange={(e) => setNewProdName(e.target.value)}
          style={{ ...baseInput, minWidth: 240, flex: 1 }}
          placeholder="Product Name"
        />

        <button onClick={addNewProductToServer} style={{ ...btn("#22c55e"), opacity: canAddProduct ? 1 : 0.55 }} disabled={!canAddProduct}>
          + Add
        </button>

        <button onClick={loadCatalogFromServer} style={btn("#e5e7eb")} title="Refresh from server">
          ↻ Refresh
        </button>

        <div style={{ marginLeft: "auto", fontWeight: 800, color: "#334155" }}>Catalog: {Object.keys(catalog).length}</div>
      </div>

      <datalist id="ftr2_codes_list">
        {Object.entries(catalog).map(([code, name]) => (
          <option key={code} value={code} label={name} />
        ))}
      </datalist>

      {/* Table */}
      <div style={{ overflowX: "auto" }}>
        <table style={grid}>
          <colgroup>
            <col style={{ width: 210 }} />
            {samples.map((_, i) => (
              <col key={`c${i}`} style={{ width: 180 }} />
            ))}
          </colgroup>

          <thead>
            <tr>
              <th style={th}></th>
              {samples.map((s, idx) => (
                <th key={idx} style={th}>
                  {s.no}
                </th>
              ))}
            </tr>
          </thead>

          <tbody>
            <tr>
              <td style={rowHead}>SAMPLE NO</td>
              {samples.map((s, i) => (
                <td key={i} style={td}>
                  <input type="number" value={s.no} onChange={(e) => setVal(i, "no", Number(e.target.value || 0))} style={baseInput} />
                </td>
              ))}
            </tr>

            {/* ✅ CODE -> auto NAME */}
            <tr>
              <td style={rowHead}>PRODUCT</td>
              {samples.map((s, i) => {
                const code = normCode(s.productCode);
                const mapped = catalog[code];
                const isKnown = Boolean(mapped);
                return (
                  <td key={i} style={td}>
                    <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                      <input
                        value={s.productCode}
                        onChange={(e) => onChangeProductCode(i, e.target.value)}
                        style={{ ...baseInput, maxWidth: 95 }}
                        placeholder="CODE"
                        list="ftr2_codes_list"
                      />
                      <input
                        value={s.productName}
                        onChange={(e) => setVal(i, "productName", e.target.value)}
                        style={{ ...baseInput, flex: 1, background: isKnown ? "#f1f5f9" : "#fff" }}
                        placeholder={isKnown ? "Auto" : "Name"}
                        readOnly={isKnown}
                      />
                    </div>
                  </td>
                );
              })}
            </tr>

            <tr>
              <td style={rowHead}>AREA</td>
              {samples.map((_, i) => (
                <td key={i} style={td}>
                  <input value={FIXED_AREA} readOnly style={{ ...baseInput, background: "#f1f5f9" }} />
                </td>
              ))}
            </tr>

            {/* ✅ TRUCK TEMP: one input for all columns */}
            <tr>
              <td style={rowHead}>TRUCK TEMP</td>
              <td style={td} colSpan={samples.length}>
                <input
                  type="number"
                  step="0.1"
                  value={truckTemp}
                  onChange={(e) => setTruckTemp(e.target.value)}
                  style={{ ...baseInput, maxWidth: 220, margin: "0 auto" }}
                  placeholder="°C (one value for all)"
                />
              </td>
            </tr>

            <tr>
              <td style={rowHead}>PRO DATE</td>
              {samples.map((s, i) => (
                <td key={i} style={td}>
                  <input type="date" value={s.proDate} onChange={(e) => onChangeProDate(i, e.target.value)} style={coloredInput()} />
                </td>
              ))}
            </tr>

            <tr>
              <td style={rowHead}>EXP DATE</td>
              {samples.map((s, i) => (
                <td key={i} style={td}>
                  <input type="date" value={s.expDate} onChange={(e) => setVal(i, "expDate", e.target.value)} style={coloredInput()} />
                </td>
              ))}
            </tr>

            <tr>
              <td style={rowHead}>DELIVERY DATE</td>
              {samples.map((s, i) => (
                <td key={i} style={td}>
                  <input type="date" value={s.deliveryDate} onChange={(e) => setVal(i, "deliveryDate", e.target.value)} style={coloredInput()} />
                </td>
              ))}
            </tr>

            <tr>
              <td style={rowHead}>QUANTITY</td>
              {samples.map((s, i) => (
                <td key={i} style={td}>
                  <input value={s.quantity} onChange={(e) => setVal(i, "quantity", e.target.value)} style={coloredInput()} placeholder="e.g., 6 BOX" />
                </td>
              ))}
            </tr>

            <tr>
              <td style={rowHead}>COLOR CODE</td>
              {samples.map((s, i) => (
                <td key={i} style={td}>
                  <input value={s.colorCode} onChange={(e) => setVal(i, "colorCode", e.target.value)} style={coloredInput()} placeholder="SATURDAY-PINK" />
                </td>
              ))}
            </tr>

            <tr>
              <td style={rowHead}>PRODUCT TEMP °C</td>
              {samples.map((s, i) => (
                <td key={i} style={td}>
                  <input
                    type="number"
                    step="0.1"
                    value={s.productTemp}
                    onChange={(e) => setVal(i, "productTemp", e.target.value)}
                    style={baseInput}
                    placeholder="°C"
                  />
                </td>
              ))}
            </tr>

            <tr>
              <td style={rowHead}>LABELLING</td>
              {samples.map((s, i) => (
                <td key={i} style={td}>
                  <select value={s.labelling} onChange={(e) => setVal(i, "labelling", e.target.value)} style={baseInput}>
                    <option value="">--</option>
                    <option>OK</option>
                    <option>NIL</option>
                    <option>NC</option>
                  </select>
                </td>
              ))}
            </tr>

            <tr>
              <td style={rowHead}>APPEARANCE</td>
              {samples.map((s, i) => (
                <td key={i} style={td}>
                  <select value={s.appearance} onChange={(e) => setVal(i, "appearance", e.target.value)} style={baseInput}>
                    <option value="">--</option>
                    <option>OK</option>
                    <option>NIL</option>
                    <option>NC</option>
                  </select>
                </td>
              ))}
            </tr>

            <tr>
              <td style={rowHead}>COLOR</td>
              {samples.map((s, i) => (
                <td key={i} style={td}>
                  <select value={s.color} onChange={(e) => setVal(i, "color", e.target.value)} style={baseInput}>
                    <option value="">--</option>
                    <option>OK</option>
                    <option>NIL</option>
                    <option>NC</option>
                  </select>
                </td>
              ))}
            </tr>

            <tr>
              <td style={rowHead}>BROKEN/DAMAGE</td>
              {samples.map((s, i) => (
                <td key={i} style={td}>
                  <select value={s.brokenDamage} onChange={(e) => setVal(i, "brokenDamage", e.target.value)} style={baseInput}>
                    <option value="">--</option>
                    <option>OK</option>
                    <option>NIL</option>
                    <option>NC</option>
                  </select>
                </td>
              ))}
            </tr>

            <tr>
              <td style={rowHead}>BAD SMELL</td>
              {samples.map((s, i) => (
                <td key={i} style={td}>
                  <select value={s.badSmell} onChange={(e) => setVal(i, "badSmell", e.target.value)} style={baseInput}>
                    <option value="">--</option>
                    <option>OK</option>
                    <option>NIL</option>
                    <option>NC</option>
                  </select>
                </td>
              ))}
            </tr>

            <tr>
              <td style={rowHead}>OVERALL CONDITION</td>
              {samples.map((s, i) => (
                <td key={i} style={td}>
                  <select value={s.overallCondition} onChange={(e) => setVal(i, "overallCondition", e.target.value)} style={baseInput}>
                    <option value="">--</option>
                    <option>OK</option>
                    <option>NIL</option>
                    <option>NC</option>
                  </select>
                </td>
              ))}
            </tr>

            <tr>
              <td style={rowHead}>REMARKS</td>
              {samples.map((s, i) => (
                <td key={i} style={td}>
                  <input value={s.remarks} onChange={(e) => setVal(i, "remarks", e.target.value)} style={baseInput} placeholder="Notes / observations" />
                </td>
              ))}
            </tr>
          </tbody>
        </table>

        <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
          <button onClick={addSample} style={btn("#2563eb")}>
            + Add Sample
          </button>
          <button onClick={removeLast} style={btn("#ef4444")}>
            − Remove Last
          </button>
        </div>
      </div>

      {/* Signoff */}
      <div style={{ marginTop: 12, padding: 8, border: "1px solid #94a3b8", borderRadius: 8, background: "#f8fafc" }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ fontWeight: 800, whiteSpace: "nowrap" }}>Verified by:</div>
            <input value={verifiedBy} onChange={(e) => setVerifiedBy(e.target.value)} style={{ ...baseInput, maxWidth: 220 }} placeholder="Name" />
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ fontWeight: 800, whiteSpace: "nowrap" }}>Checked by:</div>
            <input value={matchedBy} onChange={(e) => setMatchedBy(e.target.value)} style={{ ...baseInput, maxWidth: 220 }} placeholder="Name" />
          </div>
        </div>
      </div>

      {/* Save */}
      <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 14 }}>
        <button
          onClick={handleSave}
          style={{
            ...btn("#2563eb"),
            opacity: saving ? 0.6 : 1,
            pointerEvents: saving ? "none" : "auto",
          }}
        >
          {saving ? "Saving…" : "💾 Save"}
        </button>
      </div>

      {/* Modal */}
      {modalState.open && (
        <div style={overlay} onClick={closeModal}>
          <div style={modal} onClick={(e) => e.stopPropagation()}>
            {modalState.kind === "info" && <div style={tag("#1f2937", "#e5e7eb")}>INFO</div>}
            {modalState.kind === "warn" && <div style={tag("#7c2d12", "#fed7aa")}>WARNING</div>}
            {modalState.kind === "success" && <div style={tag("#065f46", "#a7f3d0")}>SUCCESS</div>}
            {modalState.kind === "error" && <div style={tag("#7f1d1d", "#fecaca")}>ERROR</div>}
            <div style={{ marginTop: 10, fontWeight: 800, color: "#0b1f4d" }}>{modalState.text}</div>
            <div style={{ marginTop: 12 }}>
              <button onClick={closeModal} style={btn("#e5e7eb")}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
