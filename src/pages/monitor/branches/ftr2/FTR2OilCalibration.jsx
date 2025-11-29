// src/pages/monitor/branches/ftr2/FTR2OilCalibration.jsx
import React, { useEffect, useState } from "react";

const API_BASE =
  process.env.REACT_APP_API_URL || "https://inspection-server-4nvj.onrender.com";

// نوع التقرير
const TYPE = "ftr2_oil_calibration";

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

export default function FTR2OilCalibration() {
  // تاريخ التقرير (يوم المعايرة / القرار)
  const [reportDate, setReportDate] = useState("");

  const [entries, setEntries] = useState([
    { date: "", result: "", action: "", checkedBy: "", verifiedBy: "" },
  ]);
  const [opMsg, setOpMsg] = useState("");

  // حالة فحص تكرار التاريخ
  const [dateBusy, setDateBusy] = useState(false);   // جاري التحقق؟
  const [dateTaken, setDateTaken] = useState(false); // هل اليوم محجوز؟
  const [dateError, setDateError] = useState("");    // رسالة خطأ في التحقق

  const handleChange = (index, field, value) => {
    const updated = [...entries];
    updated[index][field] = value;
    setEntries(updated);
  };

  const addRow = () => {
    setEntries([
      ...entries,
      { date: "", result: "", action: "", checkedBy: "", verifiedBy: "" },
    ]);
  };

  /* ===================== التحقق من التكرار =====================
     عند تغيير reportDate:
     - نجلب تقارير TYPE=ftr2_oil_calibration
     - نفلتر محليًا على branch=FTR 2 + نفس اليوم
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
          return br === "ftr 2" && sameDay(rd, d);
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
    return () => {
      abort = true;
    };
  }, [reportDate]);

  const handleSave = async () => {
    // تحقق بسيط من وجود بيانات
    const hasData = entries.some((e) =>
      Object.values(e).some((v) => String(v || "").trim() !== "")
    );
    if (!hasData) {
      alert("⚠️ لا يوجد بيانات للحفظ.\n⚠️ No data to save.");
      return;
    }

    if (!reportDate) {
      alert(
        "⚠️ يرجى اختيار تاريخ التقرير.\n⚠️ Please select report date."
      );
      return;
    }

    // منع حفظ تقريرين لنفس اليوم لنفس الفرع
    if (dateTaken) {
      alert(
        "⛔ غير مسموح بحفظ أكثر من تقرير لنفس التاريخ ولنفس الفرع.\n" +
        "Not allowed to save more than one report for the same date and branch.\n\n" +
        "اختر تاريخًا آخر أو عدّل التقرير السابق من شاشة التقارير.\n" +
        "Please choose another date or edit the previous report from the reports screen."
      );
      return;
    }

    try {
      setOpMsg("⏳ Saving...");
      const payload = {
        branch: "FTR 2",
        reportDate: toISODate(reportDate), // تاريخ التقرير لاختبار التكرار
        entries,
        savedAt: Date.now(),
        // مفتاح فريد اختياري لو حبّيت تستخدمه في السيرفر
        unique_key: `ftr2_oil_calibration_${toISODate(reportDate)}`,
      };

      const res = await fetch(`${API_BASE}/api/reports`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reporter: "ftr2",
          type: TYPE,
          payload,
        }),
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setOpMsg("✅ Saved successfully!");
    } catch (err) {
      console.error(err);
      setOpMsg("❌ Failed to save.");
    } finally {
      setTimeout(() => setOpMsg(""), 4000);
    }
  };

  return (
    <div style={{ padding: "1.5rem", background: "#fff", borderRadius: 12 }}>
      {/* ========== Header Table (like official form) ========== */}
      <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: "1rem" }}>
        <tbody>
          <tr>
            <td style={cellStyle}><b>Document Title:</b> Oil Quality Monitoring Form</td>
            <td style={cellStyle}><b>Document Number:</b> FS-QM/REC/TR/1</td>
          </tr>
          <tr>
            <td style={cellStyle}><b>Issue Date:</b> 05/02/2020</td>
            <td style={cellStyle}><b>Revision No:</b> 0</td>
          </tr>
          <tr>
            <td style={cellStyle}><b>Area:</b> QA</td>
            <td style={cellStyle}><b>Issued By:</b> MOHAMAD ABDULLAH QC</td>
          </tr>
          <tr>
            <td style={cellStyle}><b>Controlling Officer:</b> QA</td>
            <td style={cellStyle}><b>Approved By:</b> Hussam O. Sarhan</td>
          </tr>
        </tbody>
      </table>

      <div
        style={{
          textAlign: "center",
          background: "#ecf0f1",
          padding: "0.6rem",
          fontWeight: "bold",
          marginBottom: "1.2rem",
        }}
      >
        AL MAWASHI BRAAI KITCHEN — (OIL QUALITY MONITORING FORM)
      </div>

      {/* Report Date */}
      <div style={{ marginBottom: "1rem", display: "flex", flexWrap: "wrap", gap: "1rem", alignItems: "center" }}>
        <div>
          <label style={{ fontWeight: 600, marginRight: 8 }}>📅 Report Date:</label>
          <input
            type="date"
            value={reportDate}
            onChange={(e) => setReportDate(e.target.value)}
            style={{ padding: "6px 10px", borderRadius: 8, border: "1px solid #ccc" }}
          />
          {reportDate && (
            <div style={{ marginTop: 4 }}>
              {dateBusy && (
                <span style={{ color: "#6b7280", fontWeight: 600 }}>
                  جارٍ التحقق من وجود تقرير لهذا التاريخ…
                </span>
              )}
              {!dateBusy && dateTaken && (
                <span style={{ color: "#b91c1c", fontWeight: 600 }}>
                  ⛔ يوجد تقرير محفوظ لهذا التاريخ (FTR 2)
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
            </div>
          )}
        </div>
      </div>

      {/* ========== Main Input Table ========== */}
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr style={{ background: "#16a085", color: "#fff" }}>
            <th style={thStyle}>Date</th>
            <th style={thStyle}>Evaluation Results</th>
            <th style={thStyle}>Corrective Action</th>
            <th style={thStyle}>Checked By</th>
            <th style={thStyle}>Verified By</th>
          </tr>
        </thead>
        <tbody>
          {entries.map((entry, i) => (
            <tr key={i}>
              <td style={tdStyle}>
                <input
                  type="date"
                  value={entry.date}
                  onChange={(e) => handleChange(i, "date", e.target.value)}
                  style={inputStyle}
                />
              </td>
              <td style={tdStyle}>
                <input
                  type="text"
                  value={entry.result}
                  onChange={(e) => handleChange(i, "result", e.target.value)}
                  style={{ ...inputStyle, width: "240px" }}
                  placeholder="Result"
                />
              </td>
              <td style={tdStyle}>
                <input
                  type="text"
                  value={entry.action}
                  onChange={(e) => handleChange(i, "action", e.target.value)}
                  style={{ ...inputStyle, width: "240px" }}
                  placeholder="Action"
                />
              </td>
              <td style={tdStyle}>
                <input
                  type="text"
                  value={entry.checkedBy}
                  onChange={(e) => handleChange(i, "checkedBy", e.target.value)}
                  style={{ ...inputStyle, width: "160px" }}
                  placeholder="Name"
                />
              </td>
              <td style={tdStyle}>
                <input
                  type="text"
                  value={entry.verifiedBy}
                  onChange={(e) => handleChange(i, "verifiedBy", e.target.value)}
                  style={{ ...inputStyle, width: "160px" }}
                  placeholder="Name"
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Buttons */}
      <div style={{ marginTop: "1rem" }}>
        <button
          onClick={addRow}
          style={{
            marginRight: "10px",
            padding: "8px 14px",
            background: "#f39c12",
            color: "#fff",
            border: "none",
            borderRadius: "6px",
            cursor: "pointer",
          }}
        >
          ➕ Add Row
        </button>
        <button
          onClick={handleSave}
          disabled={dateTaken}
          style={{
            padding: "10px 18px",
            background: "linear-gradient(180deg,#10b981,#059669)",
            color: "#fff",
            border: "none",
            borderRadius: "8px",
            cursor: dateTaken ? "not-allowed" : "pointer",
            fontWeight: 600,
            opacity: dateTaken ? 0.6 : 1,
          }}
        >
          💾 Save Report
        </button>
      </div>

      {opMsg && (
        <div style={{ marginTop: "1rem", fontWeight: "600" }}>{opMsg}</div>
      )}
    </div>
  );
}

const cellStyle = {
  border: "1px solid #333",
  padding: "6px 10px",
  fontSize: "0.95em",
};

const thStyle = {
  padding: "8px",
  border: "1px solid #ccc",
  textAlign: "center",
};

const tdStyle = {
  padding: "6px",
  border: "1px solid #ccc",
  textAlign: "center",
};

const inputStyle = {
  padding: "6px",
  borderRadius: "6px",
  border: "1px solid #aaa",
};
