// src/pages/monitor/branches/ftr2/FTR2CookingTemperatureLogInput.jsx
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

/* ===== ثوابت التقرير (FTR2) ===== */
const TYPE   = "ftr2_cooking_temperature_log";
const BRANCH = "FTR 2 Food Truck";
/* رقم المستند */
const DOC_NO = "FS-QM/REC/CTL"; // Cooking Temperature Log

/* ===== Helpers للتاريخ ===== */
const toISODate = (s) => {
  try {
    if (!s) return "";
    const m = String(s).match(/^(\d{4}-\d{2}-\d{2})/);
    return m ? m[1] : "";
  } catch {
    return "";
  }
};
const sameDay = (a, b) => toISODate(a) === toISODate(b);

/* قالب سطر */
const emptyRow = () => ({
  date: "",
  timeOfCooking: "",
  foodName: "",
  coreTemp: "",
  holdTime: "",
  correctiveAction: "",
  checkedByRow: "",
});

export default function FTR2CookingTemperatureLogInput() {
  const [reportDate, setReportDate] = useState(() => {
    try {
      return new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Dubai" });
    } catch {
      const d = new Date();
      return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
    }
  });

  const [verifiedBy, setVerifiedBy] = useState("");

  // 3 أسطر افتراضيًا
  const [rows, setRows] = useState(() => Array.from({ length: 3 }, () => emptyRow()));
  const [saving, setSaving] = useState(false);

  // حالة فحص تكرار التاريخ
  const [dateBusy, setDateBusy] = useState(false);   // جاري التحقق؟
  const [dateTaken, setDateTaken] = useState(false); // هل اليوم محجوز؟
  const [dateError, setDateError] = useState("");    // رسالة خطأ في التحقق

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

  const colDefs = useMemo(() => ([
    <col key="date" style={{ width: 120 }} />,
    <col key="toc"  style={{ width: 140 }} />,
    <col key="food" style={{ width: 260 }} />,
    <col key="temp" style={{ width: 140 }} />,
    <col key="time" style={{ width: 140 }} />,
    <col key="ca"   style={{ width: 240 }} />,
    <col key="chk"  style={{ width: 160 }} />,
  ]), []);

  function updateRow(i, key, val) {
    setRows((prev) => {
      const next = [...prev];
      next[i] = { ...next[i], [key]: val };
      return next;
    });
  }
  function addRow() { setRows((prev) => [...prev, emptyRow()]); }

  /* ===================== التحقق من التكرار =====================
     عند تغيير reportDate:
     - نجلب تقارير TYPE=ftr2_cooking_temperature_log
     - نفلتر محليًا على branch=BRANCH + نفس اليوم
  ============================================================ */
  useEffect(() => {
    let abort = false;

    async function checkDuplicate() {
      const d = toISODate(reportDate);
      setDateError("");
      setDateTaken(false);

      if (!d) return; // لو التاريخ فاضي ما في حاجة نتحقق

      setDateBusy(true);
      try {
        const res = await fetch(
          `${API_BASE}/api/reports?type=${encodeURIComponent(TYPE)}`,
          { cache: "no-store" }
        );
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = await res.json();
        const arr = Array.isArray(json)
          ? json
          : json?.data || json?.items || json?.rows || [];

        const exists = arr.some((r) => {
          const p  = r?.payload ?? r;
          const br = String(p?.branch || "").toLowerCase().trim();
          const rd = p?.reportDate || r?.created_at;
          return br === BRANCH.toLowerCase() && sameDay(rd, d);
        });

        if (!abort) {
          setDateTaken(exists);
        }
      } catch (e) {
        if (!abort) {
          console.error(e);
          setDateError(
            "⚠️ فشل التحقق من وجود تقرير لهذا التاريخ. يمكن المتابعة لكن يُفضّل المراجعة لاحقًا."
          );
          setDateTaken(false); // لا نمنع الحفظ إذا فشل التحقق، فقط تحذير
        }
      } finally {
        if (!abort) setDateBusy(false);
      }
    }

    checkDuplicate();
    return () => { abort = true; };
  }, [reportDate]);

  async function handleSave() {
    const entries = rows.filter((r) =>
      Object.values(r).some((v) => String(v || "").trim() !== "")
    );
    if (!entries.length) return alert("لا يوجد بيانات للحفظ.\nNo data to save.");

    if (!reportDate) {
      alert("⚠️ يرجى اختيار تاريخ التقرير.\n⚠️ Please select a report date.");
      return;
    }

    if (!verifiedBy.trim()) {
      alert("⚠️ يرجى إدخال اسم الشخص الذي قام بالتحقق.\n⚠️ Please enter the name of the person who verified.");
      return;
    }

    // منع حفظ تقريرين لنفس التاريخ لنفس الفرع
    if (dateTaken) {
      alert(
        "⛔ غير مسموح بحفظ أكثر من تقرير لنفس التاريخ ولنفس الفرع.\n" +
        "Not allowed to save more than one report for the same date and branch.\n\n" +
        "اختر تاريخًا آخر أو عدّل التقرير السابق من شاشة التقارير.\n" +
        "Please choose another date or edit the previous report from the reports screen."
      );
      return;
    }

    const payload = {
      company: "Trans Emirates Livestock Trading L.L.C. (Al Mawashi)",
      documentTitle: "Cooking Temperature Log",
      documentNo: DOC_NO,
      branch: BRANCH,
      reportDate: toISODate(reportDate),
      entries: entries.map((r) => ({
        date: r.date || "",
        timeOfCooking: r.timeOfCooking || "",
        foodName: r.foodName || "",
        coreTemp: r.coreTemp || "",
        holdTime: r.holdTime || "",
        correctiveAction: r.correctiveAction || "",
        checkedBy: r.checkedByRow || "",
      })),
      verifiedBy,
      savedAt: Date.now(),
      // مفتاح فريد اختياري لو حابب تستخدمه في السيرفر
      unique_key: `ftr2_cooking_temperature_log_${toISODate(reportDate)}`,
    };

    try {
      setSaving(true);
      const res = await fetch(`${API_BASE}/api/reports`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reporter: "ftr2", type: TYPE, payload }), // reporter=ftr2
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      alert("✅ تم الحفظ بنجاح!\n✅ Saved successfully!");
      // بإمكانك هنا تصفير الحقول إذا رغبت
    } catch (e) {
      console.error(e);
      alert("❌ فشل الحفظ. تحقق من السيرفر أو الشبكة.\n❌ Failed to save. Please check the server or network.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div style={{ background:"#fff", border:"1px solid #dbe3f4", borderRadius:12, padding:16, color:"#0b1f4d" }}>
      {/* ===== Header (Al Mawashi) ===== */}
      <table style={{ width:"100%", borderCollapse:"collapse", marginBottom:"1rem", background:"#f7fbff" }}>
        <tbody>
          <tr>
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

      {/* Report Date + حالة التحقق */}
      <div style={{ marginBottom: "0.8rem", display:"flex", flexWrap:"wrap", gap:8, alignItems:"center" }}>
        <label style={{ fontWeight: 700 }}>Report Date:</label>
        <input
          type="date"
          value={reportDate}
          onChange={(e)=>setReportDate(e.target.value)}
          style={{ ...inputStyle, maxWidth: 220 }}
        />
        {reportDate && (
          <>
            {dateBusy && (
              <span style={{ color: "#6b7280", fontWeight: 600 }}>
                جارٍ التحقق من وجود تقرير لهذا التاريخ…
              </span>
            )}
            {!dateBusy && dateTaken && (
              <span style={{ color: "#b91c1c", fontWeight: 600 }}>
                ⛔ يوجد تقرير محفوظ لهذا التاريخ ({BRANCH})
              </span>
            )}
            {!dateBusy && !dateTaken && !dateError && (
              <span style={{ color: "#065f46", fontWeight: 600 }}>
                ✅ التاريخ متاح للحفظ
              </span>
            )}
            {dateError && (
              <span style={{ color: "#b45309", fontWeight: 600 }}>
                {dateError}
              </span>
            )}
          </>
        )}
      </div>

      {/* Table */}
      <div style={{ overflowX:"auto" }}>
        <table style={gridStyle}>
          <colgroup>{colDefs}</colgroup>
          <thead>
            <tr>
              <th style={thCell}>Date</th>
              <th style={thCell}>Time of cooking</th>
              <th style={thCell}>Name of the Food</th>
              <th style={thCell}>Core Temp (°C)</th>
              <th style={thCell}>Time</th>
              <th style={thCell}>Corrective Action{"\n"}(if any)</th>
              <th style={thCell}>Checked by</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i}>
                <td style={tdCell}>
                  <input type="date" value={r.date} onChange={(e)=>updateRow(i,"date",e.target.value)} style={inputStyle} />
                </td>
                <td style={tdCell}>
                  <input type="time" value={r.timeOfCooking} onChange={(e)=>updateRow(i,"timeOfCooking",e.target.value)} style={inputStyle} />
                </td>
                <td style={tdCell}>
                  <input type="text" value={r.foodName} onChange={(e)=>updateRow(i,"foodName",e.target.value)} style={inputStyle} placeholder="e.g., Chicken breast, beef stew…" />
                </td>
                <td style={tdCell}>
                  <input type="number" step="0.1" value={r.coreTemp} onChange={(e)=>updateRow(i,"coreTemp",e.target.value)} style={inputStyle} placeholder="°C" />
                </td>
                <td style={tdCell}>
                  <input type="text" value={r.holdTime} onChange={(e)=>updateRow(i,"holdTime",e.target.value)} style={inputStyle} placeholder="e.g., 15 min" />
                </td>
                <td style={tdCell}>
                  <input type="text" value={r.correctiveAction} onChange={(e)=>updateRow(i,"correctiveAction",e.target.value)} style={inputStyle} placeholder="If temp not met…" />
                </td>
                <td style={tdCell}>
                  <input type="text" value={r.checkedByRow} onChange={(e)=>updateRow(i,"checkedByRow",e.target.value)} style={inputStyle} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Add Row */}
      <div style={{ display:"flex", justifyContent:"flex-start", marginTop:10 }}>
        <button onClick={addRow} style={btn("#16a34a")}>➕ Add Row</button>
      </div>

      {/* Footer Notes */}
      <div style={{ marginTop:12, border:"1px solid #1f3b70", borderRadius:8, padding:"10px 12px", background:"#f9fbff", lineHeight:1.5 }}>
        <div style={{ fontWeight:800, marginBottom:4 }}>Direction / التوجيه:</div>
        <div style={{ fontSize:12 }}>
          <div>
            Record the date, time and food/dish name. Take the core temperature of the product and the time
            combination. Record the deviation and the corrective action taken if there is any. Put the
            name/signature of the person in charge of monitoring.
          </div>
          <div dir="rtl" style={{ marginTop:4 }}>
            دوّن التاريخ والوقت واسم الغذاء/الطبق. خذ درجة الحرارة القلبية للمنتج مع زمن الطهي/الاحتجاز.
            سجّل أي انحراف والإجراء التصحيحي المتخذ إن وجد. اكتب اسم/توقيع الشخص المسؤول عن المتابعة.
          </div>
        </div>

        <div style={{ fontWeight:800, marginTop:10, marginBottom:4 }}>Limit / الحد:</div>
        <div style={{ fontSize:12 }}>
          Cooking (core temperature of <strong>75°C for 30 sec</strong> / <strong>70°C for 2 minutes</strong>).
          <div dir="rtl" style={{ marginTop:4 }}>
            الطهي (درجة الحرارة القلبية <strong>75°م لمدة 30 ثانية</strong> / <strong>70°م لمدة دقيقتين</strong>).
          </div>
        </div>

        <div style={{ display:"grid", gridTemplateColumns:"220px 1fr", gap:8, marginTop:10, alignItems:"center" }}>
          <div style={{ fontWeight:800 }}>Verified by / تم التحقق بواسطة:</div>
          <input value={verifiedBy} onChange={(e)=>setVerifiedBy(e.target.value)} style={inputStyle} />
        </div>
      </div>

      {/* Actions */}
      <div style={{ display:"flex", gap:10, justifyContent:"flex-end", marginTop:14 }}>
        <button
          onClick={handleSave}
          disabled={saving || dateTaken}
          style={{
            ...btn("#1d4ed8"),
            cursor: (saving || dateTaken) ? "not-allowed" : "pointer",
            opacity: dateTaken ? 0.6 : 1,
          }}
        >
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
