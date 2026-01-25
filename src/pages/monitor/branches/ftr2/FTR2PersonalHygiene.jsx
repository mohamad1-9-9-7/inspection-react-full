// src/pages/monitor/branches/ftr2/FTR2PersonalHygiene.jsx
import React, { useEffect, useMemo, useState } from "react";

const API_BASE =
  process.env.REACT_APP_API_URL || "https://inspection-server-4nvj.onrender.com";

const TYPE = "ftr2_personal_hygiene";

/* ✅ مثل تعديل مشرف:
   - عمود Fit for Food Handling? (Yes/No)
   - If No: Reason (Communicable disease Yes/No + Open wound Yes/No + Other)
   - إزالة NC من عمودين الحساسين (تم حذف أعمدة المرض/الجروح من الجدول)
   - Verified by (QA) مستقل + Validation
   - Area = QA ثابت
   - ملاحظة Checked By = مشرف الفرع (PIC)
*/
const HYGIENE_COLUMNS = [
  "Nails",
  "Hair",
  "Not wearing Jewelry",
  "Wearing Clean Cloth/Hair Net/Hand Glove/Face masks/Shoe",
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
const norm = (s) => String(s ?? "").trim();
const low = (s) => norm(s).toLowerCase();

export default function FTR2PersonalHygiene() {
  const [date, setDate] = useState("");
  const [entries, setEntries] = useState(
    Array.from({ length: 9 }, () => ({
      name: "",
      // hygiene columns
      Nails: "",
      Hair: "",
      "Not wearing Jewelry": "",
      "Wearing Clean Cloth/Hair Net/Hand Glove/Face masks/Shoe": "",
      // new fields
      fitForFoodHandling: "",
      reasonCommunicableDisease: "",
      reasonOpenWound: "",
      reasonOther: "",
      remarks: "",
    }))
  );

  const [checkedBy, setCheckedBy] = useState("");
  const [verifiedByQA, setVerifiedByQA] = useState("");
  const [opMsg, setOpMsg] = useState("");

  // حالة فحص تكرار التاريخ
  const [dateBusy, setDateBusy] = useState(false);
  const [dateTaken, setDateTaken] = useState(false);
  const [dateError, setDateError] = useState("");

  const handleChange = (rowIndex, field, value) => {
    const updated = [...entries];
    updated[rowIndex][field] = value;
    setEntries(updated);
  };

  /* ===================== التحقق من التكرار ===================== */
  useEffect(() => {
    let abort = false;

    async function checkDuplicate() {
      const d = toISODate(date);
      setDateError("");
      setDateTaken(false);

      if (!d) return;

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
          const b = low(p?.branch);
          const pd = p?.reportDate || r?.created_at;
          return b === low("FTR 2") && sameDay(pd, d);
        });

        if (!abort) setDateTaken(exists);
      } catch (e) {
        if (!abort) {
          console.error(e);
          setDateError(
            "⚠️ فشل التحقق من وجود تقرير لهذا اليوم. يمكن المتابعة لكن يُفضّل المراجعة لاحقًا."
          );
          setDateTaken(false);
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

  // ✅ Validation (مثل مشرف)
  const validationErrors = useMemo(() => {
    const errs = [];

    if (!toISODate(date)) errs.push("Please select a date.");

    if (!norm(checkedBy)) errs.push("Checked By is required.");
    if (!norm(verifiedByQA)) errs.push("Verified by (QA) is required.");

    if (norm(checkedBy) && norm(verifiedByQA) && low(checkedBy) === low(verifiedByQA)) {
      errs.push("Verified by (QA) must be independent (cannot be the same as Checked By).");
    }

    // منع حفظ تقريرين لنفس اليوم
    if (dateTaken) {
      errs.push("Not allowed to save more than one report for the same date and branch.");
    }

    // Unfit بدون إجراء تصحيحي/استبعاد
    entries.forEach((e, idx) => {
      const hasName = !!norm(e?.name);
      if (!hasName) return;

      const fit = norm(e?.fitForFoodHandling);
      if (!fit) {
        errs.push(`Row ${idx + 1}: Fit for Food Handling? is required.`);
        return;
      }

      const isNo = low(fit) === "no";
      if (isNo) {
        const cd = norm(e?.reasonCommunicableDisease);
        const ow = norm(e?.reasonOpenWound);
        const other = norm(e?.reasonOther);
        const remarks = norm(e?.remarks);

        if (!cd && !ow && !other) {
          errs.push(
            `Row ${idx + 1}: If Fit = No, you must select a reason (Communicable/Open wound) or write Other.`
          );
        }
        if (!remarks) {
          errs.push(
            `Row ${idx + 1}: If Fit = No, Remarks/Corrective Action is required (transfer/exclude/action).`
          );
        }
      }
    });

    return errs;
  }, [date, checkedBy, verifiedByQA, dateTaken, entries]);

  const handleSave = async () => {
    if (validationErrors.length) {
      alert("⚠️ Please fix:\n\n- " + validationErrors.join("\n- "));
      return;
    }

    try {
      setOpMsg("⏳ Saving...");

      const payload = {
        branch: "FTR 2",
        reportDate: toISODate(date),
        area: "QA",

        checkedBy: norm(checkedBy),
        verifiedByQA: norm(verifiedByQA),

        checkedByNote:
          "Checked By was conducted by the branch supervisor who holds a valid PIC certificate.",

        entries,
        savedAt: Date.now(),
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
          throw new Error("⛔ يوجد بالفعل تقرير لنفس اليوم (409 Conflict من السيرفر).");
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
      <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: "1rem" }}>
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
              <span style={{ color: "#065f46", fontWeight: 600 }}>✅ التاريخ متاح للحفظ</span>
            )}
            {dateError && (
              <span style={{ color: "#b45309", fontWeight: 600 }}>{dateError}</span>
            )}
          </>
        )}
      </div>

      {/* PIC note */}
      <div
        style={{
          marginBottom: "10px",
          padding: "10px",
          borderRadius: 10,
          border: "1px solid #cbd5e1",
          background: "#f8fafc",
          fontWeight: 600,
          color: "#0f172a",
        }}
      >
        Note: Checked By was conducted by the branch supervisor who holds a valid PIC certificate.
      </div>

      {/* Validation banner */}
      {validationErrors.length > 0 && (
        <div
          style={{
            background: "#fff7ed",
            border: "1px solid #fdba74",
            padding: "10px",
            borderRadius: 10,
            marginBottom: "10px",
            color: "#7c2d12",
            fontWeight: 700,
            whiteSpace: "pre-wrap",
          }}
        >
          ⚠️ Please fix before saving:
          {"\n"}- {validationErrors.join("\n- ")}
        </div>
      )}

      {/* Table */}
      <table style={{ width: "100%", borderCollapse: "collapse", tableLayout: "fixed" }}>
        <thead>
          <tr style={{ background: "#2980b9", color: "#fff" }}>
            <th style={{ ...thStyle, width: "50px" }}>S.No</th>
            <th style={{ ...thStyle, width: "150px" }}>Employee Name</th>

            {HYGIENE_COLUMNS.map((col, i) => (
              <th key={i} style={{ ...thStyle, width: "120px" }}>
                {col}
              </th>
            ))}

            <th style={{ ...thStyle, width: "150px" }}>
              Fit for Food Handling?
              <br />
              (Yes/No)
            </th>
            <th style={{ ...thStyle, width: "140px" }}>
              If No: Communicable disease
              <br />
              (Yes/No)
            </th>
            <th style={{ ...thStyle, width: "140px" }}>
              If No: Open wound
              <br />
              (Yes/No)
            </th>
            <th style={{ ...thStyle, width: "170px" }}>If No: Other (text)</th>

            <th style={{ ...thStyle, width: "250px" }}>Remarks and Corrective Actions</th>
          </tr>
        </thead>

        <tbody>
          {entries.map((entry, i) => {
            const isNo = low(entry?.fitForFoodHandling) === "no";
            return (
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
                      maxWidth: "140px",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                    }}
                  />
                </td>

                {HYGIENE_COLUMNS.map((col, cIndex) => (
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
                  <select
                    value={entry.fitForFoodHandling}
                    onChange={(e) => handleChange(i, "fitForFoodHandling", e.target.value)}
                    style={{
                      ...inputStyle,
                      width: "100%",
                      borderColor: isNo ? "#ef4444" : "#aaa",
                    }}
                  >
                    <option value="">--</option>
                    <option value="Yes">Yes</option>
                    <option value="No">No</option>
                  </select>
                </td>

                <td style={tdStyle}>
                  <select
                    value={entry.reasonCommunicableDisease}
                    onChange={(e) =>
                      handleChange(i, "reasonCommunicableDisease", e.target.value)
                    }
                    style={{ ...inputStyle, width: "100%" }}
                    disabled={!isNo}
                  >
                    <option value="">--</option>
                    <option value="Yes">Yes</option>
                    <option value="No">No</option>
                  </select>
                </td>

                <td style={tdStyle}>
                  <select
                    value={entry.reasonOpenWound}
                    onChange={(e) => handleChange(i, "reasonOpenWound", e.target.value)}
                    style={{ ...inputStyle, width: "100%" }}
                    disabled={!isNo}
                  >
                    <option value="">--</option>
                    <option value="Yes">Yes</option>
                    <option value="No">No</option>
                  </select>
                </td>

                <td style={tdStyle}>
                  <input
                    type="text"
                    value={entry.reasonOther}
                    onChange={(e) => handleChange(i, "reasonOther", e.target.value)}
                    style={{ ...inputStyle, width: "100%" }}
                    placeholder={isNo ? "Other reason..." : "—"}
                    disabled={!isNo}
                  />
                </td>

                <td style={tdStyle}>
                  <input
                    type="text"
                    value={entry.remarks}
                    onChange={(e) => handleChange(i, "remarks", e.target.value)}
                    style={{
                      ...inputStyle,
                      width: "100%",
                      borderColor: isNo && !norm(entry.remarks) ? "#ef4444" : "#aaa",
                    }}
                    placeholder={isNo ? "Corrective Action (transfer/exclude)..." : ""}
                  />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {/* Footer */}
      <div style={{ marginTop: "1rem", fontWeight: "600" }}>
        REMARKS / CORRECTIVE ACTIONS:
      </div>

      {/* Checked / Verified */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          marginTop: "1rem",
          fontWeight: 600,
          gap: "12px",
          flexWrap: "wrap",
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
          Verified by (QA):{" "}
          <input
            type="text"
            required
            value={verifiedByQA}
            onChange={(e) => setVerifiedByQA(e.target.value)}
            style={{
              ...footerInput,
              borderColor:
                norm(checkedBy) && norm(verifiedByQA) && low(checkedBy) === low(verifiedByQA)
                  ? "#ef4444"
                  : "#aaa",
            }}
          />
        </div>
      </div>

      {/* Save */}
      <div style={{ textAlign: "center", marginTop: "1.5rem" }}>
        <button
          onClick={handleSave}
          disabled={dateTaken || validationErrors.length > 0}
          style={{
            padding: "10px 18px",
            background:
              dateTaken || validationErrors.length
                ? "linear-gradient(180deg,#94a3b8,#64748b)"
                : "linear-gradient(180deg,#10b981,#059669)",
            color: "#fff",
            border: "none",
            borderRadius: "8px",
            cursor: dateTaken || validationErrors.length ? "not-allowed" : "pointer",
            fontWeight: 600,
            opacity: dateTaken || validationErrors.length ? 0.7 : 1,
          }}
          title={validationErrors.length ? "Fix validation errors first" : "Save"}
        >
          💾 Save Report
        </button>
      </div>

      {opMsg && <div style={{ marginTop: "1rem", fontWeight: "600" }}>{opMsg}</div>}
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
