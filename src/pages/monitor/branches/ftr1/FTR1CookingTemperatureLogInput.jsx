// src/pages/monitor/branches/ftr1/FTR1CookingTemperatureLogInput.jsx
import React, { useEffect, useMemo, useState } from "react";
import API_BASE from "../../../../config/api";
import { useStaffDirectory } from "../_shared/staffRegistry";
import { useFtrSignatures, FtrSignatureBlock } from "./ftr1Signatures";
import { ItemCodeInput, ItemNameInput } from "../_shared/CodedProductField";

/* ===== Draft (localStorage) ===== */
const DRAFT_KEY = "ftr1_cooking_temp_log_draft_v2";
const loadDraft = () => {
  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
};

/* ===== API base ===== */


/* ===== ثوابت التقرير ===== */
const TYPE   = "ftr1_cooking_temperature_log";
const BRANCH = "FTR 1 Food Truck";
/* رقم المستند (المقترح الجديد) */
const DOC_NO = "FS-QM/REC/CTL"; // Cooking Temperature Log

/* قالب سطر — the report date is the sheet's (no date per row); the product is
   item code + name from the catalog. */
const emptyRow = () => ({
  timeOfCooking: "",
  itemCode: "",
  productName: "",
  coreTemp: "",
  holdTime: "",
  correctiveAction: "",
});

/* How long the CENTRE of the product stayed at its core temperature. */
const HOLD_OPTIONS = [
  { v: "", label: "—", sec: null },
  { v: "30s", label: "30 sec", sec: 30 },
  { v: "1m", label: "1 min", sec: 60 },
  { v: "2m", label: "2 min", sec: 120 },
  { v: "2m+", label: "More than 2 min", sec: 180 },
];
const holdSec = (v) => (HOLD_OPTIONS.find((o) => o.v === v) || {}).sec ?? null;
const holdLabel = (v) => (HOLD_OPTIONS.find((o) => o.v === v) || {}).label || v || "";

/* Safe = core 75 °C for 30 s, or core 70 °C for 2 min. */
function cookResult(r) {
  const tC = r.coreTemp === "" || r.coreTemp == null ? null : Number(r.coreTemp);
  const s = holdSec(r.holdTime);
  if (tC == null || Number.isNaN(tC)) return { key: "", label: "—", color: "#64748b", bg: "#f1f5f9" };
  if ((tC >= 75 && (s == null || s >= 30)) || (tC >= 70 && s != null && s >= 120))
    return { key: "pass", label: "Safe", color: "#166534", bg: "#dcfce7" };
  if (tC >= 70 && s == null) return { key: "hold", label: "Enter hold time", color: "#92400e", bg: "#fef3c7" };
  return { key: "fail", label: "Not safe", color: "#991b1b", bg: "#fee2e2" };
}

export default function FTR1CookingTemperatureLogInput() {
  // تاريخ عام للتقرير (اختياري للحفظ كميتا)
  const [reportDate, setReportDate] = useState(() => {
    const dft = loadDraft();
    if (dft.reportDate) return dft.reportDate;
    try {
      return new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Dubai" });
    } catch {
      const d = new Date();
      return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
    }
  });

  // فوتر
  // Created by / Checked By (employee numbers) + Verified by (QA) — one set
  // for the sheet; Checked By is stamped onto every row on save.
  const sig = useFtrSignatures(useStaffDirectory(), { verifiedKey: "verifiedBy" });

  // الصفوف (3 افتراضيًا)
  const [rows, setRows] = useState(() => {
    const d = loadDraft();
    return Array.isArray(d.rows) && d.rows.length ? d.rows : Array.from({ length: 3 }, () => emptyRow());
  });
  const [saving, setSaving] = useState(false);

  /* ✅ Auto-save draft */
  useEffect(() => {
    try {
      localStorage.setItem(
        DRAFT_KEY,
        JSON.stringify({ reportDate, rows, ts: Date.now() })
      );
    } catch {}
  }, [reportDate, rows]);

  /* ===== ستايلات ===== */
  const gridStyle = useMemo(() => ({
    width: "100%",
    borderCollapse: "collapse",
    tableLayout: "fixed",
    fontSize: 12,
  }), []);
  const thCell = {
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
    padding: "6px 4px",
    textAlign: "center",
    verticalAlign: "middle",
  };
  const inputStyle = {
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
    color: "#fff",
    border: "none",
    borderRadius: 10,
    padding: "10px 14px",
    fontWeight: 700,
    cursor: "pointer",
    boxShadow: "0 4px 12px rgba(0,0,0,.15)",
  });

  // عرض الأعمدة
  /* globals.css wipes <col> widths — widths sit on the header cells. */
  const thW = (w) => ({ ...thCell, width: w, minWidth: w, maxWidth: w });

  function updateRow(i, key, val) {
    setRows((prev) => {
      const next = [...prev];
      next[i] = { ...next[i], [key]: val };
      return next;
    });
  }

  const setProduct = (i, { code, name }) =>
    setRows((prev) => prev.map((r, j) => (j === i ? { ...r, itemCode: code, productName: name } : r)));

  function addRow() {
    setRows((prev) => [...prev, emptyRow()]);
  }

  async function handleSave() {
    const entries = rows.filter((r) =>
      Object.values(r).some((v) => String(v || "").trim() !== "")
    );
    if (!entries.length) return alert("لا يوجد بيانات للحفظ.");
    const rowErrors = [];
    entries.forEach((r) => {
      const i = rows.indexOf(r) + 1;
      if (!String(r.productName || "").trim()) rowErrors.push(`Row ${i}: choose the product (code or name).`);
      if (!String(r.timeOfCooking || "").trim()) rowErrors.push(`Row ${i}: enter the time of cooking.`);
      const res = cookResult(r);
      if (!res.key) rowErrors.push(`Row ${i}: enter the core temperature.`);
      if (res.key === "hold") rowErrors.push(`Row ${i}: core is 70–75 °C — enter how long it was held.`);
      if (res.key === "fail" && !String(r.correctiveAction || "").trim())
        rowErrors.push(`Row ${i}: limit not reached — write the corrective action (continue cooking and re-check).`);
    });
    if (rowErrors.length) return alert("⚠️ Please fix:\n\n- " + rowErrors.join("\n- "));
    if (sig.errors.length) return alert("⚠️ Please fix:\n\n- " + sig.errors.join("\n- "));
    const signed = sig.fields();

    const payload = {
      company: "Trans Emirates Livestock Trading L.L.C. (Al Mawashi)",
      documentTitle: "Cooking Temperature Log",
      documentNo: DOC_NO,
      branch: BRANCH,
      reportDate, // ميتاداتا اختيارية
      entries: entries.map((r) => ({
        date: reportDate, // the sheet's date (older viewer / Excel read it per row)
        timeOfCooking: r.timeOfCooking || "",
        itemCode: String(r.itemCode || "").trim(),
        productName: String(r.productName || "").trim(),
        // older viewer / Excel column
        foodName: [String(r.itemCode || "").trim(), String(r.productName || "").trim()].filter(Boolean).join(" — "),
        coreTemp: r.coreTemp || "",
        holdTime: holdLabel(r.holdTime),
        result: cookResult(r).key,
        correctiveAction: r.correctiveAction || "",
        checkedBy: signed.checkedBy,
      })),
      ...signed,
      savedAt: Date.now(),
    };

    try {
      setSaving(true);
      const res = await fetch(`${API_BASE}/api/reports`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reporter: "ftr1", type: TYPE, payload }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      try { localStorage.removeItem(DRAFT_KEY); } catch {}
      alert("✅ تم الحفظ بنجاح!");
    } catch (e) {
      console.error(e);
      alert("❌ فشل الحفظ. تحقق من السيرفر أو الشبكة.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div style={{ background:"#fff", border:"1px solid #dbe3f4", borderRadius:12, padding:16, color:"#0b1f4d" }}>
      {/* ===== Header (Al Mawashi مع مربع على اليسار) ===== */}
      <table style={{ width:"100%", borderCollapse:"collapse", marginBottom:"1rem", background:"#f7fbff" }}>
        <tbody>
          <tr>
            {/* مربع المواشي يغطي صفوف الترويسة */}
            <td rowSpan={5} style={tdBrand}>AL<br/>MAWASHI</td>

            <td style={tdHead}><strong>Document Title:</strong> Cooking Temperature Log</td>
            <td style={tdHead}><strong>Document No:</strong> {DOC_NO}</td>
          </tr>
          <tr>
            <td style={tdHead}><strong>Issue Date:</strong> 05/02/2020</td>
            <td style={tdHead}><strong>Revision No:</strong> 0</td>
          </tr>
          <tr>
            <td style={tdHead}><strong>Area:</strong> QA</td>
            <td style={tdHead}><strong>Issued by:</strong> MOHAMAD ABDULLAH</td>
          </tr>
          <tr>
            <td style={tdHead}><strong>Controlling Officer:</strong> Quality Controller</td>
            <td style={tdHead}><strong>Approved by:</strong> Hussam O. Sarhan</td>
          </tr>
          <tr>
            <td style={tdHead}><strong>Branch:</strong> {BRANCH}</td>
            <td style={tdHead}><strong>Company:</strong> Trans Emirates Livestock Trading L.L.C.</td>
          </tr>
        </tbody>
      </table>

      {/* تقرير تاريخ عام (اختياري) */}
      <div style={{ marginBottom: "0.8rem" }}>
        <label style={{ fontWeight: 700, marginRight: 8 }}>Report Date:</label>
        <input
          type="date"
          value={reportDate}
          onChange={(e)=>setReportDate(e.target.value)}
          style={{ ...inputStyle, maxWidth: 220 }}
        />
      </div>

      {/* ===== Table ===== */}
      <div style={{ overflowX:"auto" }}>
        <table style={gridStyle}>
          <thead>
            <tr>
              <th style={thW(120)}>Time of cooking</th>
              <th style={thW(140)}>Item code</th>
              <th style={thW(300)}>Product name</th>
              <th style={thW(120)}>Core temp (°C)</th>
              <th style={thW(150)}>Held at core temp</th>
              <th style={thW(120)}>Result</th>
              <th style={thW(260)}>Corrective action{"\n"}(if any)</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i}>
                <td style={tdCell}>
                  <input type="time" value={r.timeOfCooking} onChange={(e)=>updateRow(i,"timeOfCooking",e.target.value)} style={inputStyle} />
                </td>
                <td style={tdCell}>
                  <ItemCodeInput code={r.itemCode || ""} name={r.productName || ""} onChange={(pair) => setProduct(i, pair)} style={inputStyle} />
                </td>
                <td style={tdCell}>
                  <ItemNameInput code={r.itemCode || ""} name={r.productName || ""} onChange={(pair) => setProduct(i, pair)} style={inputStyle} placeholder="Search code or product…" />
                </td>
                <td style={tdCell}>
                  <input type="number" step="0.1" value={r.coreTemp} onChange={(e)=>updateRow(i,"coreTemp",e.target.value)} style={inputStyle} placeholder="°C" />
                </td>
                <td style={tdCell}>
                  <select value={r.holdTime} onChange={(e)=>updateRow(i,"holdTime",e.target.value)} style={inputStyle}>
                    {HOLD_OPTIONS.map((o) => <option key={o.v} value={o.v}>{o.label}</option>)}
                  </select>
                </td>
                <td style={tdCell}>
                  {(() => {
                    const res = cookResult(r);
                    return <span style={{ display: "inline-block", minWidth: 80, padding: "3px 10px", borderRadius: 999, background: res.bg, color: res.color, fontWeight: 800 }}>{res.label}</span>;
                  })()}
                </td>
                <td style={tdCell}>
                  <input type="text" value={r.correctiveAction} onChange={(e)=>updateRow(i,"correctiveAction",e.target.value)} style={inputStyle} placeholder="If temp not met…" />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* زر إضافة سطر */}
      <div style={{ display:"flex", justifyContent:"flex-start", marginTop:10 }}>
        <button onClick={addRow} style={btn("#16a34a")}>➕ Add Row</button>
      </div>

      {/* ===== Footer Notes (EN + AR) ===== */}
      <div style={{ marginTop:12, border:"1px solid #1f3b70", borderRadius:8, padding:"10px 12px", background:"#f9fbff", lineHeight:1.5 }}>
        <div style={{ fontWeight:800, marginBottom:4 }}>Direction / التوجيه:</div>
        <div style={{ fontSize:12 }}>
          <div>
            Record the time of cooking and the product (item code + name). When the product is cooked, insert a
            clean, calibrated probe into the centre of the thickest piece and record the core temperature, and how
            long the centre stayed at that temperature. If the limit is not reached, continue cooking, re-check and
            record the corrective action.
          </div>
          <div dir="rtl" style={{ marginTop:4 }}>
            سجّل وقت الطهي والمنتج (الكود + الاسم). بعد ما يستوي المنتج، أدخل ميزان حرارة نظيف ومُعاير بمنتصف أسمك
            قطعة وسجّل درجة الحرارة القلبية والمدة اللي ضلّ فيها قلب المنتج على هالدرجة. إذا ما وصل للحد، كمّل الطهي
            وأعد القياس وسجّل الإجراء التصحيحي.
          </div>
        </div>

        <div style={{ fontWeight:800, marginTop:10, marginBottom:4 }}>Limit / الحد:</div>
        <div style={{ fontSize:12 }}>
          Core (centre) temperature of <strong>75°C held for 30 seconds</strong>, or <strong>70°C held for 2 minutes</strong>.
          The time is how long the centre stays at that temperature once it is reached — not the total cooking time
          (fries, for example, cook for several minutes; what counts is the core temperature at the end).
          <div dir="rtl" style={{ marginTop:4 }}>
            درجة حرارة قلب المنتج <strong>75°م وتثبت 30 ثانية</strong>، أو <strong>70°م وتثبت دقيقتين</strong>.
            المدة هي الوقت اللي بيضل فيه قلب المنتج على هالدرجة بعد ما يوصلها — مش مدة الطهي كلها
            (البطاطا مثلاً بتنقلى كم دقيقة، والمهم حرارة قلبها بالآخر).
          </div>
        </div>

      </div>

      <FtrSignatureBlock sig={sig} />

      {/* أفعال */}
      <div style={{ display:"flex", gap:10, justifyContent:"flex-end", marginTop:14 }}>
        <button onClick={handleSave} disabled={saving} style={btn("#1d4ed8")}>
          {saving ? "Saving…" : "💾 Save to Server"}
        </button>
      </div>
    </div>
  );
}

/* ===== ستايلات خلايا الترويسة ===== */
const tdHead = {
  border: "1px solid #98a6c3",
  padding: "6px 8px",
  fontSize: "0.9rem",
  background: "#f2f6ff",
};
/* مربع AL MAWASHI */
const tdBrand = {
  width: 90,
  minWidth: 90,
  textAlign: "center",
  verticalAlign: "middle",
  color: "#b91c1c",
  fontWeight: 800,
  letterSpacing: 1,
  border: "1px solid #98a6c3",
  background: "#ffffff",
  fontSize: "0.9rem",
};
