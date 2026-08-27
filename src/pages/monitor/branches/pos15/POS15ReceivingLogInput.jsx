// src/pages/monitor/branches/pos15/POS15ReceivingLogInput.jsx
import React, { useMemo, useState } from "react";
import API_BASE from "../../../../config/api";
import useTakenDates from "../_shared/useTakenDates";
import { ItemCodeInput, ItemNameInput } from "../_shared/CodedProductField";



// نوع التقرير و الفرع (مكيّف لـ POS 15) — بدون أي ذكر لجهة خارجية
const TYPE   = "pos15_receiving_log_butchery";
const BRANCH = "POS 15";

// أعمدة C / NC — `hint` يحمل نص النموذج الورقي الكامل خلف عنوان قصير
const TICK_COLS = [
  { key: "vehicleClean",   label: "Vehicle clean",    w: 105 },
  { key: "handlerHygiene", label: "Handler hygiene",  w: 115, hint: "Food handler hygiene" },
  { key: "appearanceOK",   label: "Appearance",       w: 105, hint: "Normal colour, free from discoloration" },
  { key: "firmnessOK",     label: "Firmness",         w: 100, hint: "Firm rather than soft" },
  { key: "smellOK",        label: "Smell",            w: 95,  hint: "Normal smell — no rancid or strange smell" },
  { key: "packagingGood",  label: "Packaging intact", w: 125,
    hint: "Packaging of food is good and undamaged, clean and no signs of pest infestation" },
];

/* عمود واحد معرّف مرة واحدة يبني الترويسة والصفوف — بنفس ترتيب شاشة العرض
   وبنفس ترتيب POS 6 و POS 10: الكود واسم المنتج أولاً. */
const COLUMNS = [
  { key: "itemCode",        label: "Item Code",            w: 115, kind: "code" },
  { key: "foodItem",        label: "Food Item",            w: 200, kind: "product" },
  { key: "supplier",        label: "Name of the Supplier", w: 180 },
  { key: "netWeight",       label: "Net Weight (kg)",      w: 110, kind: "number", step: "0.01", placeholder: "kg" },
  { key: "vehicleTemp",     label: "Vehicle Temp (°C)",    w: 100, kind: "number", step: "0.1", placeholder: "°C" },
  { key: "foodTemp",        label: "Food Temp (°C)",       w: 100, kind: "number", step: "0.1", placeholder: "°C" },
  ...TICK_COLS.map((c) => ({ ...c, kind: "tick" })),
  { key: "countryOfOrigin", label: "Country of origin",    w: 135 },
  { key: "productionDate",  label: "Production Date",      w: 130, kind: "date" },
  { key: "expiryDate",      label: "Expiry Date",          w: 130, kind: "date" },
  { key: "invoiceNo",       label: "Invoice No.",          w: 120 },
  { key: "date",            label: "Received date",        w: 130, kind: "date" },
  { key: "time",            label: "Time",                 w: 90,  kind: "time" },
  { key: "receivedBy",      label: "Received by",          w: 130 },
  { key: "remarks",         label: "Remarks (if any)",     w: 200 },
];

function emptyRow() {
  return {
    // itemCode ⟷ foodItem: the catalog code that ties this line to the same
    // product everywhere else (QCS shipment, traceability, final product).
    date: "", time: "", supplier: "", itemCode: "", foodItem: "",
    netWeight: "", // ✅ جديد
    vehicleTemp: "", foodTemp: "",
    vehicleClean: "", handlerHygiene: "", appearanceOK: "", firmnessOK: "", smellOK: "", packagingGood: "",
    countryOfOrigin: "", productionDate: "", expiryDate: "", invoiceNo: "", remarks: "", receivedBy: "",
  };
}

export default function POS15ReceivingLogInput() {
  // تاريخ التقرير الهيدر
  const [reportDate, setReportDate] = useState(() => {
    try {
      return new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Dubai" });
    } catch {
      const d = new Date();
      return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
    }
  });

  // عدد الصفوف
  const ROW_COUNT = 15;
  const [rows, setRows] = useState(() => Array.from({ length: ROW_COUNT }, () => emptyRow()));

  // هيدر (أسماء عامة)
  const [formRef, setFormRef] = useState("FSMS/BR/F01A");
  const [classification] = useState("Official");

  // فوتر
  const [verifiedBy, setVerifiedBy] = useState("");

  const [saving, setSaving] = useState(false);

  // One report per day for this branch — the date index answers that from
  // metadata, so it costs one light request per screen instead of the archive.
  const { isTaken, markTaken, loading: datesLoading } = useTakenDates(TYPE);
  const dateTaken = Boolean(reportDate) && !datesLoading && isTaken(reportDate);

  // month text
  const monthText = useMemo(() => {
    const m = String(reportDate || "").match(/^(\d{4})-(\d{2})-\d{2}$/);
    return m ? `${m[2]}/${m[1]}` : "";
  }, [reportDate]);

  const gridStyle = useMemo(() => ({
    width: "max-content", minWidth: "100%",
    borderCollapse: "collapse", tableLayout: "fixed", fontSize: 13.5,
  }), []);
  const thCell = {
    border: "1px solid #1f3b70", padding: "14px 8px", height: 78, textAlign: "center",
    whiteSpace: "normal", overflowWrap: "anywhere", lineHeight: 1.4, fontSize: 12.5,
    fontWeight: 700, background: "#f5f8ff", color: "#0b1f4d",
  };
  const tdCell = {
    border: "1px solid #1f3b70", padding: "12px 8px", height: 56, textAlign: "center", verticalAlign: "middle",
  };
  // No nowrap/ellipsis here: a field that hides what was typed into it is not
  // a data-entry field. The column widths below give each value room instead.
  const inputStyle = {
    width: "100%", boxSizing: "border-box", border: "1px solid #c7d2fe", borderRadius: 6,
    padding: "9px 10px", minHeight: 40, fontSize: 13.5, fontFamily: "inherit", display: "block", minWidth: 0,
  };
  const btn = (bg) => ({
    background: bg, color: "#fff", border: "none", borderRadius: 10, padding: "10px 14px",
    fontWeight: 700, cursor: "pointer", boxShadow: "0 4px 12px rgba(0,0,0,.15)",
  });

  function updateRow(idx, key, val) {
    setRows((prev) => {
      const next = [...prev];
      next[idx] = { ...next[idx], [key]: val };
      return next;
    });
  }

  // Code and name are one unit — a catalog pick on either side rewrites both.
  function updateProduct(idx, { code, name }) {
    setRows((prev) => {
      const next = [...prev];
      next[idx] = { ...next[idx], itemCode: code, foodItem: name };
      return next;
    });
  }

  async function handleSave() {
    const entries = rows.filter((r) => Object.values(r).some((v) => String(v || "").trim() !== ""));
    if (entries.length === 0) { alert("لا يوجد بيانات للحفظ."); return; }

    // التحقق من التواريخ: تاريخ الانتهاء > تاريخ الإنتاج
    for (let i = 0; i < entries.length; i++) {
      const e = entries[i];
      if (e.productionDate && e.expiryDate && e.expiryDate <= e.productionDate) {
        alert(`⚠️ الصف ${i + 1}: تاريخ الصلاحية يجب أن يكون أكبر من تاريخ الإنتاج.`);
        return;
      }
    }

    if (datesLoading) { alert("⏳ جارٍ التحقق من التاريخ…"); return; }
    if (dateTaken) {
      alert("⛔ يوجد تقرير محفوظ لهذا التاريخ.\nاختر تاريخًا آخر أو عدّل التقرير الموجود.");
      return;
    }

    const payload = {
      branch: BRANCH, formRef, classification, reportDate, month: monthText,
      entries, verifiedBy, savedAt: Date.now(),
    };

    try {
      setSaving(true);
      const res = await fetch(`${API_BASE}/api/reports`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reporter: "pos15", type: TYPE, payload }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      markTaken(reportDate);
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
      {/* Header — بدون شعار أو اسم جهة */}
      <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:12 }}>
        <div style={{ flex:1 }}>
          <div style={{ fontWeight:800, fontSize:18 }}>Receiving Log</div>
          <div style={{ fontWeight:800, fontSize:16 }}>
            Butchery — {BRANCH}
          </div>
        </div>

        {/* Right meta */}
        <div style={{ display:"grid", gridTemplateColumns:"auto 170px", gap:6, alignItems:"center", fontSize:12 }}>
          <div>Form Ref. No :</div>
          <input value={formRef} onChange={(e)=>setFormRef(e.target.value)} style={{ ...inputStyle, borderColor:"#1f3b70" }} />

          <div>Classification :</div>
          <div style={{ border:"1px solid #1f3b70", padding:"4px 6px" }}>Official</div>

          <div>Date :</div>
          <input type="date" value={reportDate} onChange={(e)=>setReportDate(e.target.value)} style={{ ...inputStyle, borderColor: dateTaken ? "#b91c1c" : "#1f3b70" }} />
          {dateTaken && (
            <div style={{ gridColumn: "1 / -1", color: "#b91c1c", fontWeight: 800, fontSize: 12 }}>
              ⛔ يوجد تقرير محفوظ لهذا التاريخ — تقرير واحد لكل يوم.
            </div>
          )}
          {datesLoading && (
            <div style={{ gridColumn: "1 / -1", color: "#64748b", fontWeight: 700, fontSize: 12 }}>
              ⏳ جارٍ التحقق من توفر التاريخ…
            </div>
          )}
        </div>
      </div>

      {/* Legend strip */}
      <div style={{ border:"1px solid #1f3b70", borderBottom:"none" }}>
        <div style={{ ...thCell, background:"#e9f0ff" }}>
          LEGEND: (C) – Conform &nbsp;&nbsp; / &nbsp;&nbsp; (NC) – Non-Conform
        </div>
      </div>

      {/* Table */}
      <div style={{ overflowX:"auto" }}>
        <table style={gridStyle}>
          <colgroup>
            {COLUMNS.map((c) => <col key={c.key} style={{ width: c.w }} />)}
          </colgroup>
          <thead>
            <tr>
              {COLUMNS.map((c) => (
                <th key={c.key} style={thCell} title={c.hint || c.label}>{c.label}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r, idx) => (
              <tr key={idx}>
                {COLUMNS.map((c) => (
                  <td key={c.key} style={tdCell}>
                    {c.kind === "code" ? (
                      <ItemCodeInput code={r.itemCode || ""} name={r.foodItem || ""} onChange={(pair)=>updateProduct(idx, pair)} style={inputStyle} />
                    ) : c.kind === "product" ? (
                      <ItemNameInput code={r.itemCode || ""} name={r.foodItem || ""} onChange={(pair)=>updateProduct(idx, pair)} style={inputStyle} placeholder="Search code or product…" />
                    ) : c.kind === "tick" ? (
                      <select
                        value={r[c.key]}
                        onChange={(e)=>updateRow(idx, c.key, e.target.value)}
                        style={inputStyle}
                        title={c.hint ? `${c.hint} — C = Conform, NC = Non-Conform` : "C = Conform, NC = Non-Conform"}
                      >
                        <option value=""></option>
                        <option value="C">C</option>
                        <option value="NC">NC</option>
                      </select>
                    ) : (
                      <input
                        type={c.kind === "date" ? "date" : c.kind === "time" ? "time" : c.kind === "number" ? "number" : "text"}
                        step={c.step}
                        placeholder={c.placeholder}
                        value={r[c.key]}
                        onChange={(e)=>updateRow(idx, c.key, e.target.value)}
                        style={inputStyle}
                      />
                    )}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Notes */}
      <div style={{ marginTop:10, fontSize:11, color:"#0b1f4d" }}>
        <div style={{ fontWeight:700, marginBottom:4 }}>Organoleptic Checks*</div>
        <div>Appearance: Normal colour (Free from discoloration)</div>
        <div>Firmness: Firm rather than soft.</div>
        <div>Smell: Normal smell (No rancid or strange smell)</div>
        <div style={{ marginTop:8 }}>
          <strong>Note:</strong> For Chilled Food: Target ≤ 5°C (Critical Limit: 5°C; short deviations up to 15 minutes during transfer).&nbsp;
          For Frozen Food: Target ≤ -18°C (Critical limits: RTE Frozen ≤ -18°C, Raw Frozen ≤ -10°C).&nbsp;
          For Hot Food: Target ≥ 60°C (Critical Limit: 60°C).&nbsp;
          Dry food, Low Risk: Receive at cool, dry condition or ≤ 25°C, or as per product requirement.
        </div>
      </div>

      {/* Footer controls + Verified by */}
      <div style={{ display:"flex", gap:8, marginTop:12, flexWrap:"wrap" }}>
        <button onClick={handleSave} disabled={saving} style={btn("#2563eb")}>
          {saving ? "Saving…" : "Save Receiving Log"}
        </button>
      </div>

      <div style={{ marginTop:16 }}>
        <div style={{ display:"flex", alignItems:"center", gap:8, fontSize:12 }}>
          <strong>Verified by:</strong>
          <input
            value={verifiedBy}
            onChange={(e)=>setVerifiedBy(e.target.value)}
            placeholder=""
            style={{
              flex: "0 1 360px",
              border: "none",
              borderBottom: "2px solid #1f3b70",
              padding: "4px 6px",
              outline: "none",
              fontSize: 12,
              color: "#0b1f4d",
            }}
          />
        </div>
      </div>
    </div>
  );
}
