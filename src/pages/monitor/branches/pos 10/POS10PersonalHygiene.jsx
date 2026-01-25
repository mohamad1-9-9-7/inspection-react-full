// src/pages/monitor/branches/pos 10/POS10PersonalHygiene.jsx
// Personal Hygiene input — POS 10
// يحفظ بنفس أسلوب التقارير عبر /api/reports مع تمييز الفرع (POS 10)

import React, { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";

const API_BASE =
  process.env.REACT_APP_API_URL || "https://inspection-server-4nvj.onrender.com";

const HYGIENE_COLUMNS = [
  "Nails",
  "Hair",
  "Not wearing Jewelry",
  "Wearing Clean Cloth/Hair Net/Hand Glove/Face masks/Shoe",
];

// (ملاحظة: أزلنا أعمدة Communicable/Open wounds من الجدول واستبدلناها بمنطق FIT + Reason)
const TYPE = "pos10_personal_hygiene";

const norm = (s) => String(s ?? "").trim();
const low = (s) => norm(s).toLowerCase();

export default function POS10PersonalHygiene() {
  const [searchParams] = useSearchParams();
  const branchFromURL = searchParams.get("branch");
  const branch = branchFromURL || "POS 10";

  // ✅ اسم الفرع/الوصف (ملحمة أبوظبي) بجانب POS 10
  const branchNameFromURL = searchParams.get("branchName");
  const branchLabel = useMemo(() => {
    const clean = String(branch || "").trim();
    const extra = String(branchNameFromURL || "").trim() || "Abu Dhabi Butchery";
    return `${clean} — ${extra}`;
  }, [branch, branchNameFromURL]);

  const [date, setDate] = useState("");
  const [entries, setEntries] = useState(
    Array.from({ length: 9 }, () => ({
      name: "",
      Nails: "",
      Hair: "",
      "Not wearing Jewelry": "",
      "Wearing Clean Cloth/Hair Net/Hand Glove/Face masks/Shoe": "",
      fitForFoodHandling: "",
      reasonCommunicableDisease: "",
      reasonOpenWound: "",
      reasonOther: "",
      remarks: "",
    }))
  );

  // ✅ Checked By = مشرف الفرع (PIC) | Verified by (QA) = كواليتي مستقل
  const [checkedBySupervisor, setCheckedBySupervisor] = useState("");
  const [verifiedByQA, setVerifiedByQA] = useState("");

  const [opMsg, setOpMsg] = useState("");

  // للتحقق من وجود تقرير لنفس التاريخ والفرع
  const [checkingDup, setCheckingDup] = useState(false);
  const [hasDuplicate, setHasDuplicate] = useState(false);

  const handleChange = (rowIndex, field, value) => {
    const updated = [...entries];
    updated[rowIndex][field] = value;
    setEntries(updated);
  };

  // دالة تتحقق من وجود تقرير محفوظ لنفس التاريخ لنفس الفرع
  const hasDuplicateForDate = async (d) => {
    if (!d) return false;
    try {
      const res = await fetch(
        `${API_BASE}/api/reports?type=${encodeURIComponent(TYPE)}`,
        { cache: "no-store" }
      );
      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const json = await res.json();
      const list =
        Array.isArray(json) ? json :
        Array.isArray(json?.data) ? json.data :
        Array.isArray(json?.items) ? json.items :
        Array.isArray(json?.rows) ? json.rows : [];

      return list.some((r) => {
        const p = r?.payload || {};
        const recBranch = p.branch || r.branch;
        const recDate = p.reportDate || p.header?.reportDate;
        return String(recBranch) === String(branch) && String(recDate) === String(d);
      });
    } catch (e) {
      console.warn("Duplicate check failed:", e);
      return false;
    }
  };

  // عندما يتغيّر التاريخ نتحقق تلقائيًا إن كان هناك تقرير لنفس اليوم
  useEffect(() => {
    let cancelled = false;
    if (!date) {
      setHasDuplicate(false);
      return;
    }

    (async () => {
      setCheckingDup(true);
      const exists = await hasDuplicateForDate(date);
      if (!cancelled) {
        setHasDuplicate(exists);
        setCheckingDup(false);
        if (exists) {
          setOpMsg(
            "⚠️ Report for this branch and date already exists. Please change the date or review the report from the reports screen.\n⚠️ تم العثور على تقرير محفوظ لنفس التاريخ لهذا الفرع. لا يمكن حفظ تقرير جديد. يرجى تغيير التاريخ أو مراجعة التقرير من شاشة التقارير."
          );
        } else {
          setOpMsg("");
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [date, branch]);

  // ✅ Validation واضح قبل الحفظ
  const validationErrors = useMemo(() => {
    const errs = [];

    if (!date) errs.push("Please select a date.");
    if (!norm(checkedBySupervisor)) errs.push("Checked By (Branch Supervisor - PIC) is required.");
    if (!norm(verifiedByQA)) errs.push("Verified by (QA) is required.");

    if (norm(checkedBySupervisor) && norm(verifiedByQA) && low(checkedBySupervisor) === low(verifiedByQA)) {
      errs.push("Verified by (QA) must be independent (cannot be the same as Checked By).");
    }

    if (hasDuplicate) {
      errs.push("Report for this branch and date already exists.");
    }

    entries.forEach((e, idx) => {
      if (!norm(e?.name)) return;

      if (!norm(e?.fitForFoodHandling)) {
        errs.push(`Row ${idx + 1}: Fit for Food Handling? (Yes/No) is required.`);
        return;
      }

      const isNo = low(e.fitForFoodHandling) === "no";
      if (isNo) {
        const cd = norm(e.reasonCommunicableDisease);
        const ow = norm(e.reasonOpenWound);
        const other = norm(e.reasonOther);
        const remarks = norm(e.remarks);

        if (!cd && !ow && !other) {
          errs.push(`Row ${idx + 1}: If Fit = No, select a reason (Communicable/Open wound) or write Other.`);
        }
        if (!remarks) {
          errs.push(`Row ${idx + 1}: If Fit = No, Remarks/Corrective Action is required (transfer/exclude/action).`);
        }
      }
    });

    return errs;
  }, [date, checkedBySupervisor, verifiedByQA, hasDuplicate, entries]);

  const handleSave = async () => {
    if (validationErrors.length) {
      alert("⚠️ Please fix:\n\n- " + validationErrors.join("\n- "));
      return;
    }

    try {
      setOpMsg("⏳ Saving...");

      const payload = {
        branch, // ✅ POS 10 (أو من الـ URL)
        branchLabel, // ✅ POS 10 — Abu Dhabi Butchery
        reportDate: date,
        area: "QA",

        // ✅ الأدوار كما طلبت
        checkedBySupervisor: norm(checkedBySupervisor),
        verifiedByQA: norm(verifiedByQA),

        // ✅ ملاحظات ثابتة
        checkedByNote:
          "Checked By was conducted by the branch supervisor who holds a valid PIC certificate.",
        electronicApprovalNote:
          "This report is electronically approved; no signature is required.",

        entries,
        savedAt: Date.now(),
      };

      const res = await fetch(`${API_BASE}/api/reports`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reporter: "pos10",
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

  const saveDisabled = checkingDup || hasDuplicate || validationErrors.length > 0;

  return (
    <div style={{ padding: "1rem", background: "#fff", borderRadius: 12 }}>
      {/* ===== ترويسة موحدة AL MAWASHI ===== */}
      <table
        style={{
          width: "100%",
          borderCollapse: "collapse",
          marginBottom: "0.5rem",
          fontSize: "0.9rem",
          border: "1px solid #9aa4ae",
          background: "#f8fbff",
        }}
      >
        <tbody>
          <tr>
            <td
              rowSpan={4}
              style={{
                border: "1px solid #9aa4ae",
                padding: "8px",
                width: 120,
                textAlign: "center",
              }}
            >
              <div style={{ fontWeight: 900, color: "#a00", lineHeight: 1.1 }}>
                AL
                <br />
                MAWASHI
              </div>
            </td>
            <td style={tdHeader2}>
              <b>Document Title:</b> Personal Hygiene Check List
            </td>
            <td style={tdHeader2}>
              <b>Document No:</b> FS-QM/REC/PH
            </td>
          </tr>
          <tr>
            <td style={tdHeader2}>
              <b>Issue Date:</b> 05/02/2020
            </td>
            <td style={tdHeader2}>
              <b>Revision No:</b> 0
            </td>
          </tr>
          <tr>
            <td style={tdHeader2}>
              <b>Area:</b> QA &nbsp;&nbsp;{" "}
              <span style={{ color: "#0f172a", fontWeight: 800 }}>{branchLabel}</span>
            </td>
            <td style={tdHeader2}>
              <b>Date:</b> {date || "—"}
            </td>
          </tr>
          <tr>
            <td style={tdHeader2}>
              <b>Controlling Officer:</b> Quality Controller
            </td>
            <td style={tdHeader2}>
              <b>Approved By:</b> Hussam O.Sarhan
            </td>
          </tr>
        </tbody>
      </table>

      <div
        style={{
          textAlign: "center",
          background: "#dde3e9",
          fontWeight: 700,
          padding: "6px 4px",
          border: "1px solid #9aa4ae",
          borderTop: "none",
          marginBottom: "0.75rem",
        }}
      >
        PERSONAL HYGIENE CHECKLIST — {branchLabel}
      </div>

      {/* ✅ ملاحظات ثابتة */}
      <div
        style={{
          marginBottom: "10px",
          padding: "10px",
          borderRadius: 10,
          border: "1px solid #cbd5e1",
          background: "#f8fafc",
          fontWeight: 700,
          color: "#0f172a",
          display: "grid",
          gap: 6,
        }}
      >
        <div>Note: Checked By was conducted by the branch supervisor who holds a valid PIC certificate.</div>
        <div>Note: Verified by must be QA (independent).</div>
        <div>Note: This report is electronically approved; no signature is required.</div>
      </div>

      {/* Date */}
      <div style={{ marginBottom: "0.5rem" }}>
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
      </div>

      {/* رسالة تكرار التاريخ */}
      {hasDuplicate && (
        <div
          style={{
            textAlign: "center",
            color: "#b91c1c",
            fontWeight: 600,
            marginBottom: "0.75rem",
            whiteSpace: "pre-line",
          }}
        >
          Report for this branch and date already exists. Please change the date
          or review the report from the reports screen.
          {"\n"}
          تم العثور على تقرير محفوظ لنفس التاريخ لهذا الفرع. لا يمكن حفظ تقرير جديد.
          يرجى تغيير التاريخ أو مراجعة التقرير من شاشة التقارير.
        </div>
      )}

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
            fontWeight: 800,
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
                    onChange={(e) => handleChange(i, "reasonCommunicableDisease", e.target.value)}
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
          fontWeight: 700,
          gap: "1rem",
          flexWrap: "wrap",
        }}
      >
        <label>
          Checked By (Branch Supervisor - PIC):{" "}
          <input
            type="text"
            required
            value={checkedBySupervisor}
            onChange={(e) => setCheckedBySupervisor(e.target.value)}
            style={footerInput}
          />
        </label>

        <label>
          Verified by (QA):{" "}
          <input
            type="text"
            required
            value={verifiedByQA}
            onChange={(e) => setVerifiedByQA(e.target.value)}
            style={{
              ...footerInput,
              borderColor:
                norm(checkedBySupervisor) && norm(verifiedByQA) && low(checkedBySupervisor) === low(verifiedByQA)
                  ? "#ef4444"
                  : "#aaa",
            }}
          />
        </label>
      </div>

      {/* Save */}
      <div style={{ textAlign: "center", marginTop: "1.5rem" }}>
        <button
          type="button"
          onClick={handleSave}
          disabled={saveDisabled}
          style={{
            padding: "10px 18px",
            background: saveDisabled
              ? "linear-gradient(180deg,#94a3b8,#64748b)"
              : "linear-gradient(180deg,#10b981,#059669)",
            color: "#fff",
            border: "none",
            borderRadius: "8px",
            cursor: saveDisabled ? "not-allowed" : "pointer",
            fontWeight: 800,
            opacity: saveDisabled ? 0.75 : 1,
          }}
        >
          {checkingDup ? "⏳ Checking..." : "💾 Save Report"}
        </button>
      </div>

      {opMsg && (
        <div style={{ marginTop: "1rem", fontWeight: "700", whiteSpace: "pre-line" }}>
          {opMsg}
        </div>
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
  minWidth: "220px",
};

const tdHeader2 = {
  border: "1px solid #9aa4ae",
  padding: "6px 8px",
  verticalAlign: "middle",
};
