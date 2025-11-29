// src/pages/monitor/branches/ftr2/FTR2PersonalHygiene.jsx
import React, { useEffect, useState } from "react";

const API_BASE =
  process.env.REACT_APP_API_URL || "https://inspection-server-4nvj.onrender.com";

const TYPE = "ftr2_personal_hygiene";

const columns = [
  "Nails",
  "Hair",
  "Not wearing Jewelry",
  "Wearing Clean Cloth/Hair Net/Hand Glove/Face masks/Shoe",
  "Communicable Disease",
  "Open wounds/sores & cut",
];

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

export default function FTR2PersonalHygiene() {
  const [date, setDate] = useState("");
  const [entries, setEntries] = useState(
    Array.from({ length: 9 }, () => ({
      name: "",
      Nails: "",
      Hair: "",
      "Not wearing Jewelry": "",
      "Wearing Clean Cloth/Hair Net/Hand Glove/Face masks/Shoe": "",
      "Communicable Disease": "",
      "Open wounds/sores & cut": "",
      remarks: "",
    }))
  );
  const [checkedBy, setCheckedBy] = useState("");
  const [verifiedBy, setVerifiedBy] = useState("");
  const [opMsg, setOpMsg] = useState("");

  // حالة فحص تكرار التاريخ
  const [dateBusy, setDateBusy] = useState(false);   // جاري التحقق؟
  const [dateTaken, setDateTaken] = useState(false); // هل اليوم محجوز؟
  const [dateError, setDateError] = useState("");    // رسالة خطأ في التحقق

  const handleChange = (rowIndex, field, value) => {
    const updated = [...entries];
    updated[rowIndex][field] = value;
    setEntries(updated);
  };

  /* ===================== التحقق من التكرار =====================
     عند تغيير التاريخ:
     - نجلب تقارير TYPE=ftr2_personal_hygiene
     - نفلتر محليًا على branch=FTR 2 + نفس اليوم
  ============================================================ */
  useEffect(() => {
    let abort = false;

    async function checkDuplicate() {
      const d = toISODate(date);
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
          const p = r?.payload ?? r;
          const b = String(p?.branch || "").toLowerCase().trim();
          const pd = p?.reportDate || r?.created_at;
          return b === "ftr 2".toLowerCase() && sameDay(pd, d);
        });

        if (!abort) {
          setDateTaken(exists);
        }
      } catch (e) {
        if (!abort) {
          console.error(e);
          setDateError(
            "⚠️ فشل التحقق من وجود تقرير لهذا اليوم. يمكن المتابعة لكن يُفضّل المراجعة لاحقًا."
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
  }, [date]);

  const handleSave = async () => {
    if (!date) {
      alert("⚠️ Please select a date");
      return;
    }
    if (!checkedBy.trim() || !verifiedBy.trim()) {
      alert("⚠️ Checked By and Verified By are required");
      return;
    }

    // منع حفظ تقريرين لنفس اليوم
    if (dateTaken) {
      alert(
        "⛔ غير مسموح بحفظ أكثر من تقرير ليوم واحد لنفس الفرع.\nNot allowed to save more than one report for the same date and branch.\n\nاختر تاريخًا آخر أو عدّل التقرير السابق من شاشة التقارير.\nPlease choose another date or edit the previous report from the reports screen."
      );
      return;
    }

    try {
      setOpMsg("⏳ Saving...");
      const payload = {
        branch: "FTR 2",
        reportDate: toISODate(date),
        entries,
        checkedBy,
        verifiedBy,
        savedAt: Date.now(),
        // مفتاح فريد اختياري (لو السيرفر يدعمه)
        unique_key: `ftr2_personal_hygiene_${toISODate(date)}`,
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

      if (!res.ok) {
        if (res.status === 409) {
          throw new Error(
            "⛔ يوجد بالفعل تقرير لنفس اليوم (409 Conflict من السيرفر)."
          );
        }
        throw new Error(`HTTP ${res.status}`);
      }
      setOpMsg("✅ Saved successfully!");
    } catch (err) {
      console.error(err);
      setOpMsg(`❌ Failed to save. ${err?.message || ""}`);
    } finally {
      setTimeout(() => setOpMsg(""), 4000);
    }
  };

  return (
    <div style={{ padding: "1rem", background: "#fff", borderRadius: 12 }}>
      {/* Header info */}
      <table
        style={{
          width: "100%",
          borderCollapse: "collapse",
          marginBottom: "1rem",
        }}
      >
        <tbody>
          <tr>
            <td style={tdHeader}>
              <strong>Document Title:</strong> Personal Hygiene Check List
            </td>
            <td style={tdHeader}>
              <strong>Document No:</strong> FS-QM /REC/PH
            </td>
          </tr>
          <tr>
            <td style={tdHeader}>
              <strong>Issue Date:</strong> 05/02/2020
            </td>
            <td style={tdHeader}>
              <strong>Revision No:</strong> 0
            </td>
          </tr>
          <tr>
            <td style={tdHeader}>
              <strong>Area:</strong> QA
            </td>
            <td style={tdHeader}>
              <strong>Issued By:</strong> MOHAMAD ABDULLAH QC
            </td>
          </tr>
          <tr>
            <td style={tdHeader}>
              <strong>Controlling Officer:</strong> Quality Controller
            </td>
            <td style={tdHeader}>
              <strong>Approved By:</strong> Hussam.O.Sarhan
            </td>
          </tr>
        </tbody>
      </table>

      {/* Title */}
      <h3
        style={{
          textAlign: "center",
          background: "#e5e7eb",
          padding: "6px",
          marginBottom: "0.5rem",
        }}
      >
        AL MAWASHI BRAAI MAMZAR
        <br />
        PERSONAL HYGIENE CHECKLIST FTR-2
      </h3>

      {/* Date + حالة التحقق */}
      <div
        style={{
          marginBottom: "0.5rem",
          display: "flex",
          flexWrap: "wrap",
          gap: "0.5rem",
          alignItems: "center",
        }}
      >
        <strong>Date:</strong>{" "}
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          style={{
            padding: "4px 8px",
            borderRadius: "6px",
            border: "1px solid #ccc",
          }}
        />
        {date && (
          <>
            {dateBusy && (
              <span style={{ color: "#6b7280", fontWeight: 600 }}>
                جارٍ التحقق من وجود تقرير لهذا اليوم…
              </span>
            )}
            {!dateBusy && dateTaken && (
              <span style={{ color: "#b91c1c", fontWeight: 600 }}>
                ⛔ يوجد تقرير محفوظ لهذا اليوم (FTR 2)
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
      <table
        style={{
          width: "100%",
          borderCollapse: "collapse",
          tableLayout: "fixed",
        }}
      >
        <thead>
          <tr style={{ background: "#2980b9", color: "#fff" }}>
            <th style={{ ...thStyle, width: "50px" }}>S.No</th>
            <th style={{ ...thStyle, width: "150px" }}>Employee Name</th>
            {columns.map((col, i) => (
              <th key={i} style={{ ...thStyle, width: "120px" }}>
                {col}
              </th>
            ))}
            <th style={{ ...thStyle, width: "250px" }}>
              Remarks and Corrective Actions
            </th>
          </tr>
        </thead>
        <tbody>
          {entries.map((entry, i) => (
            <tr key={i}>
              <td style={tdStyle}>{i + 1}</td>
              <td style={tdStyle}>
                <input
                  type="text"
                  value={entry.name}
                  onChange={(e) => handleChange(i, "name", e.target.value)}
                  style={{
                    ...inputStyle,
                    width: "100%",
                    maxWidth: "140px", // ضبط عرض خانة الاسم
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  }}
                />
              </td>
              {columns.map((col, cIndex) => (
                <td key={cIndex} style={tdStyle}>
                  <select
                    value={entry[col]}
                    onChange={(e) => handleChange(i, col, e.target.value)}
                    style={{ ...inputStyle, width: "100%" }}
                  >
                    <option value="">--</option>
                    <option value="C">C</option>
                    <option value="NC">NC</option>
                  </select>
                </td>
              ))}
              <td style={tdStyle}>
                <input
                  type="text"
                  value={entry.remarks}
                  onChange={(e) =>
                    handleChange(i, "remarks", e.target.value)
                  }
                  style={{ ...inputStyle, width: "100%" }}
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Remarks footer */}
      <div style={{ marginTop: "1rem", fontWeight: "600" }}>
        REMARKS / CORRECTIVE ACTIONS:
      </div>

      {/* C / NC note */}
      <div style={{ marginTop: "0.5rem", fontSize: "0.9rem" }}>
        *(C – Conform &nbsp;&nbsp;&nbsp; N/C – Non Conform)
      </div>

      {/* Checked / Verified */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          marginTop: "1rem",
          fontWeight: 600,
        }}
      >
        <div>
          Checked By:{" "}
          <input
            type="text"
            required
            value={checkedBy}
            onChange={(e) => setCheckedBy(e.target.value)}
            style={footerInput}
          />
        </div>
        <div>
          Verified By:{" "}
          <input
            type="text"
            required
            value={verifiedBy}
            onChange={(e) => setVerifiedBy(e.target.value)}
            style={footerInput}
          />
        </div>
      </div>

      {/* Save */}
      <div style={{ textAlign: "center", marginTop: "1.5rem" }}>
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

const thStyle = {
  padding: "6px",
  border: "1px solid #ccc",
  textAlign: "center",
  fontSize: "0.85rem",
};

const tdStyle = {
  padding: "6px",
  border: "1px solid #ccc",
  textAlign: "center",
};

const tdHeader = {
  border: "1px solid #ccc",
  padding: "4px 6px",
  fontSize: "0.85rem",
};

const inputStyle = {
  padding: "4px 6px",
  borderRadius: "4px",
  border: "1px solid #aaa",
  width: "100%",
};

const footerInput = {
  border: "1px solid #aaa",
  borderRadius: "6px",
  padding: "4px 6px",
  minWidth: "160px",
};
