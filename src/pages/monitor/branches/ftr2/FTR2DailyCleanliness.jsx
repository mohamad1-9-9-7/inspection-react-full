// src/pages/monitor/branches/ftr2/FTR2DailyCleanliness.jsx
import React, { useEffect, useState } from "react";

const API_BASE =
  process.env.REACT_APP_API_URL || "https://inspection-server-4nvj.onrender.com";

// نوع التقرير لطلبات الـ API
const TYPE = "ftr2_daily_cleanliness";

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

// 🔹 تعريف الأقسام + البنود
const sections = [
  {
    title: "Food Truck Area",
    items: [
      "Walls/Floors/Doors",
      "Shelves/Containers/Racks",
      "Proper arrangement of Products",
      "Waste Basket",
      "Food storage Containers",
      "Trays",
      "Container",
      "Exhaust",
    ],
  },
  {
    title: "Hand Washing Area",
    items: ["Hand wash Sink", "Hand wash soap/tissue/Sanitizer available"],
  },
  {
    title: "Machine Cleanliness",
    items: [
      "Chiller Room 1",
      "Chiller Room 2",
      "Chiller Room 3",
      "Chiller Room 4",
      "Chiller Room 5",
      "Chiller Room 6",
      "Chiller Room 7",
      "Chiller Room 8",
      "Ice Machine",
    ],
  },
  {
    title: "Waste Disposal",
    items: ["Dust bin", "Collection of waste", "Disposal"],
  },
  {
    title: "Working Conditions & Cleanliness",
    items: ["Lights", "Fly Catchers", "Tap Water"],
  },
];

export default function FTR2DailyCleanliness() {
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [checkedBy, setCheckedBy] = useState("");
  const [verifiedBy, setVerifiedBy] = useState("");

  // تجهيز البيانات
  const [entries, setEntries] = useState(() =>
    sections.flatMap((sec, secIndex) => [
      { section: sec.title, secNo: secIndex + 1, isSection: true },
      ...sec.items.map((it, idx) => ({
        item: it,
        secNo: secIndex + 1,
        subLetter: String.fromCharCode(97 + idx), // a,b,c...
        status: "",
        observation: "",
        informed: "",
        remarks: "",
      })),
    ])
  );

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

  /* ===================== التحقق من التكرار =====================
     عند تغيير التاريخ:
     - نجلب تقارير TYPE=ftr2_daily_cleanliness
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
        // Targeted read: the server matches the business date and answers with
        // at most one row. Asking for the type alone became limit=5000 on the
        // way out, so the whole archive arrived with full payloads to answer a
        // yes/no question. TYPE already names the branch, so the branch
        // comparison goes with it.
        const res = await fetch(
          `${API_BASE}/api/reports?type=${encodeURIComponent(TYPE)}&reportDate=${encodeURIComponent(d)}`,
          { cache: "no-store" }
        );
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = await res.json();
        const arr = Array.isArray(json)
          ? json
          : json?.data || json?.items || json?.rows || [];

        const exists = arr.length > 0;

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
  }, [date]);

  const handleSave = async () => {
    if (!date)
      return alert(
        "⚠️ يرجى اختيار تاريخ التقرير.\n⚠️ Please select report date."
      );
    if (!time)
      return alert(
        "⚠️ يرجى إدخال الوقت.\n⚠️ Please enter time."
      );
    if (!checkedBy || !verifiedBy)
      return alert(
        "⚠️ Checked By و Verified By إلزاميان.\n⚠️ Checked By and Verified By are mandatory."
      );

    // منع حفظ تقريرين لنفس اليوم
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
        reportDate: toISODate(date),
        reportTime: time,
        checkedBy,
        verifiedBy,
        entries,
        savedAt: Date.now(),
        // مفتاح فريد اختياري لو حابب تستخدمه في السيرفر
        unique_key: `ftr2_daily_cleanliness_${toISODate(date)}`,
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
      {/* Header */}
      <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: "1rem" }}>
        <tbody>
          <tr>
            <td style={tdHeader}><strong>Document Title:</strong> Cleaning Checklist</td>
            <td style={tdHeader}><strong>Document No:</strong> FF-QM/REC/CC</td>
          </tr>
          <tr>
            <td style={tdHeader}><strong>Issue Date:</strong> 05/02/2020</td>
            <td style={tdHeader}><strong>Revision No:</strong> 0</td>
          </tr>
          <tr>
            <td style={tdHeader}><strong>Area:</strong> QA</td>
            <td style={tdHeader}><strong>Issued By:</strong> MOHAMAD ABDULLAH QC</td>
          </tr>
          <tr>
            <td style={tdHeader}><strong>Controlling Officer:</strong> Quality Controller</td>
            <td style={tdHeader}><strong>Approved By:</strong> Hussam O.Sarhan</td>
          </tr>
        </tbody>
      </table>

      {/* Title */}
      <h3 style={{ textAlign: "center", background: "#e5e7eb", padding: "6px", marginBottom: "1rem" }}>
        AL MAWASHI BRAAI MAMZAR <br />
        CLEANING CHECKLIST – FTR2
      </h3>

      {/* Date & Time */}
      <div
        style={{
          marginBottom: "1rem",
          display: "flex",
          gap: "2rem",
          justifyContent: "center",
          flexWrap: "wrap",
        }}
      >
        <div>
          <label style={{ fontWeight: 600, marginRight: 8 }}>📅 Date:</label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            style={{ padding: "6px 10px", borderRadius: 8, border: "1px solid #ccc" }}
          />
          {date && (
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
        <div>
          <label style={{ fontWeight: 600, marginRight: 8 }}>⏰ Time:</label>
          <input
            type="time"
            value={time}
            onChange={(e) => setTime(e.target.value)}
            style={{ padding: "6px 10px", borderRadius: 8, border: "1px solid #ccc" }}
          />
        </div>
      </div>

      {/* Table */}
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr style={{ background: "#2980b9", color: "#fff" }}>
            <th style={thStyle}>Sl-No</th>
            <th style={thStyle}>General Cleaning</th>
            <th style={thStyle}>C / NC</th>
            <th style={thStyle}>Observation</th>
            <th style={thStyle}>Informed To</th>
            <th style={thStyle}>Remarks & CA</th>
          </tr>
        </thead>
        <tbody>
          {entries.map((entry, i) => (
            <tr key={i}>
              <td style={tdStyle}>
                {entry.isSection ? entry.secNo : entry.subLetter}
              </td>
              <td style={{ ...tdStyle, fontWeight: entry.isSection ? 700 : 400 }}>
                {entry.section || entry.item}
              </td>
              <td style={tdStyle}>
                {!entry.isSection ? (
                  <select
                    value={entry.status}
                    onChange={(e) => handleChange(i, "status", e.target.value)}
                    style={inputStyle}
                  >
                    <option value="">--</option>
                    <option value="C">C</option>
                    <option value="NC">NC</option>
                  </select>
                ) : "—"}
              </td>
              <td style={tdStyle}>
                {!entry.isSection && (
                  <input
                    type="text"
                    value={entry.observation}
                    onChange={(e) => handleChange(i, "observation", e.target.value)}
                    style={inputStyle}
                    placeholder="Observation"
                  />
                )}
              </td>
              <td style={tdStyle}>
                {!entry.isSection && (
                  <input
                    type="text"
                    value={entry.informed}
                    onChange={(e) => handleChange(i, "informed", e.target.value)}
                    style={inputStyle}
                    placeholder="Informed To"
                  />
                )}
              </td>
              <td style={tdStyle}>
                {!entry.isSection && (
                  <input
                    type="text"
                    value={entry.remarks}
                    onChange={(e) => handleChange(i, "remarks", e.target.value)}
                    style={inputStyle}
                    placeholder="Remarks & CA"
                  />
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Footer */}
      <div style={{ marginTop: "1.5rem", fontWeight: 600 }}>REMARKS / CORRECTIVE ACTIONS:</div>
      <div style={{ marginTop: "0.5rem", fontSize: "0.9rem" }}>
        *(C = Conform &nbsp;&nbsp;&nbsp; N/C = Non Conform)
      </div>

      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          marginTop: "1rem",
          fontWeight: 600,
          flexWrap: "wrap",
          gap: "1rem",
        }}
      >
        <div>
          Checked By:{" "}
          <input
            type="text"
            value={checkedBy}
            onChange={(e) => setCheckedBy(e.target.value)}
            style={{ ...inputStyle, minWidth: "180px" }}
          />
        </div>
        <div>
          Verified By:{" "}
          <input
            type="text"
            value={verifiedBy}
            onChange={(e) => setVerifiedBy(e.target.value)}
            style={{ ...inputStyle, minWidth: "180px" }}
          />
        </div>
      </div>

      {/* Save */}
      <div style={{ textAlign: "center", marginTop: 20 }}>
        <button
          onClick={handleSave}
          disabled={dateTaken}
          style={{
            background: "linear-gradient(180deg,#10b981,#059669)",
            color: "#fff",
            border: "none",
            padding: "12px 22px",
            borderRadius: 12,
            cursor: dateTaken ? "not-allowed" : "pointer",
            fontWeight: 800,
            fontSize: "1rem",
            boxShadow: "0 6px 14px rgba(16,185,129,.3)",
            opacity: dateTaken ? 0.6 : 1,
          }}
        >
          💾 Save to Server
        </button>
        {opMsg && (
          <div
            style={{
              marginTop: 10,
              fontWeight: 700,
              color: opMsg.startsWith("❌") ? "#b91c1c" : "#065f46",
            }}
          >
            {opMsg}
          </div>
        )}
      </div>
    </div>
  );
}

const thStyle = { padding: "8px", border: "1px solid #ccc", textAlign: "center" };
const tdStyle = { padding: "6px", border: "1px solid #ccc", textAlign: "center" };
const inputStyle = { padding: "6px", borderRadius: "6px", border: "1px solid #aaa" };
const tdHeader = { border: "1px solid #ccc", padding: "4px 6px", fontSize: "0.85rem" };
