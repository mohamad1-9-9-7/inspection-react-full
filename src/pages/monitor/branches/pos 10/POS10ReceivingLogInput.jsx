// src/pages/monitor/branches/pos 10/POS10ReceivingLogInput.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import API_BASE from "../../../../config/api";



// نوع التقرير و الفرع (مكيّف لـ POS 10)
const TYPE = "pos10_receiving_log_butchery";
const BRANCH = "POS 10";

// أعمدة C / NC
const TICK_COLS = [
  { key: "vehicleClean", label: "Vehicle clean" },
  { key: "handlerHygiene", label: "Food handler hygiene" },
  { key: "appearanceOK", label: "Appearance" },
  { key: "firmnessOK", label: "Firmness" },
  { key: "smellOK", label: "Bad Smell" },
  {
    key: "packagingGood",
    label:
      "Packaging of food is good / undamaged / clean / no pests",
  },
];

function emptyRow() {
  return {
    supplier: "",
    foodItem: "",
    vehicleTemp: "",
    foodTemp: "",
    quantity: "",            // ✅ عمود الكمية الجديد
    vehicleClean: "",
    handlerHygiene: "",
    appearanceOK: "",
    firmnessOK: "",
    smellOK: "",
    packagingGood: "",
    countryOfOrigin: "",
    productionDate: "",
    expiryDate: "",
    remarks: "",
  };
}

export default function POS10ReceivingLogInput() {
  // تاريخ التقرير الهيدر
  const [reportDate, setReportDate] = useState(() => {
    try {
      return new Date().toLocaleDateString("en-CA", {
        timeZone: "Asia/Dubai",
      });
    } catch {
      const d = new Date();
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(
        2,
        "0"
      )}-${String(d.getDate()).padStart(2, "0")}`;
    }
  });

  // حالة التحقق من التاريخ
  const [dateStatus, setDateStatus] = useState("idle"); // idle | checking | available | exists | error

  // 🧾 رقم الفاتورة في أعلى التقرير (إلزامي)
  const [invoiceNo, setInvoiceNo] = useState("");
  const [invoiceError, setInvoiceError] = useState("");
  const invoiceRef = useRef(null);

  // الصفوف (قابلة للإضافة / الحذف)
  const [rows, setRows] = useState(() =>
    Array.from({ length: 10 }, () => emptyRow())
  );

  // هيدر (Document No مربوط بهذا الحقل)
  const [formRef, setFormRef] = useState("FSMS/BR/F01A");

  // فوتر
  const [verifiedBy, setVerifiedBy] = useState("");
  const [receivedBy, setReceivedBy] = useState("");

  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState("");

  // month text
  const monthText = useMemo(() => {
    const m = String(reportDate || "").match(/^(\d{4})-(\d{2})-\d{2}$/);
    return m ? `${m[2]}/${m[1]}` : "";
  }, [reportDate]);

  const gridStyle = useMemo(
    () => ({
      width: "100%",
      borderCollapse: "collapse",
      tableLayout: "fixed",
      fontSize: 12,
    }),
    []
  );
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

  // ===== ترويسة المواشي + جدول المستند =====
  const topTable = {
    width: "100%",
    borderCollapse: "collapse",
    marginBottom: 10,
    fontSize: "0.9rem",
    border: "1px solid #9aa4ae",
    background: "#f8fbff",
  };
  const tdHeader = {
    border: "1px solid #9aa4ae",
    padding: "6px 8px",
    verticalAlign: "middle",
  };
  const bandTitle = {
    textAlign: "center",
    background: "#dde3e9",
    fontWeight: 700,
    padding: "6px 4px",
    border: "1px solid #9aa4ae",
    borderTop: "none",
    marginBottom: 10,
  };

  // ✅ تعريف الأعمدة
  const colDefs = useMemo(
    () => [
      <col key="supplier" style={{ width: 170 }} />,
      <col key="food" style={{ width: 160 }} />,
      <col key="vehT" style={{ width: 90 }} />,
      <col key="foodT" style={{ width: 90 }} />,
      <col key="qty" style={{ width: 110 }} />,          // ✅ عمود الكمية
      <col key="vehClean" style={{ width: 120 }} />,
      <col key="handler" style={{ width: 140 }} />,
      <col key="appearanceOK" style={{ width: 120 }} />,
      <col key="firmnessOK" style={{ width: 110 }} />,
      <col key="smellOK" style={{ width: 110 }} />,
      <col key="pack" style={{ width: 220 }} />,
      <col key="origin" style={{ width: 120 }} />,
      <col key="prod" style={{ width: 120 }} />,
      <col key="exp" style={{ width: 120 }} />,
      <col key="remarks" style={{ width: 200 }} />,
    ],
    []
  );

  function updateRow(idx, key, val) {
    setRows((prev) => {
      const next = [...prev];
      next[idx] = { ...next[idx], [key]: val };
      return next;
    });
  }

  // إضافة صف جديد
  function addRow() {
    setRows((prev) => [...prev, emptyRow()]);
  }

  // حذف صف
  function removeRow(idx) {
    setRows((prev) => {
      if (prev.length === 1) {
        // لا تترك الجدول فارغ، فقط نظّف الصف الوحيد
        return [emptyRow()];
      }
      return prev.filter((_, i) => i !== idx);
    });
  }

  // ===== التحقق من توفر التاريخ =====
  useEffect(() => {
    let ignore = false;

    async function checkDate() {
      if (!reportDate) {
        setDateStatus("idle");
        return;
      }
      setDateStatus("checking");
      try {
        const res = await fetch(
          `${API_BASE}/api/reports?type=${encodeURIComponent(TYPE)}`
        );
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = await res.json();
        const data = Array.isArray(json?.data) ? json.data : [];

        const exists = data.some((r) => {
          const d =
            (r && r.payload && r.payload.reportDate) ||
            (r && r.payload && r.payload.date);
          return String(d) === String(reportDate);
        });

        if (!ignore) {
          setDateStatus(exists ? "exists" : "available");
        }
      } catch (err) {
        console.error("Date check failed:", err);
        if (!ignore) {
          setDateStatus("error");
        }
      }
    }

    checkDate();
    return () => {
      ignore = true;
    };
  }, [reportDate]);

  const dateStatusText = (() => {
    if (!reportDate) return "";
    if (dateStatus === "checking") return "جاري التحقق من توفر التاريخ...";
    if (dateStatus === "available") return "التاريخ متاح لإدخال التقرير.";
    if (dateStatus === "exists")
      return "يوجد تقرير محفوظ بالفعل لهذا التاريخ.";
    if (dateStatus === "error")
      return "تعذر التحقق من التاريخ (تحقق من الاتصال بالسيرفر).";
    return "";
  })();

  const dateStatusColor =
    dateStatus === "available"
      ? "#065f46"
      : dateStatus === "exists"
      ? "#b91c1c"
      : "#92400e";

  const saveDisabled =
    saving ||
    !reportDate ||
    dateStatus === "exists" ||
    dateStatus === "checking";

  async function handleSave() {
    setSaveMsg("");

    if (!reportDate) {
      setSaveMsg("⚠️ يرجى اختيار التاريخ.");
      return;
    }

    if (dateStatus === "exists") {
      setSaveMsg(
        "⚠️ يوجد تقرير محفوظ لهذا التاريخ، لا يمكن حفظ تقرير جديد."
      );
      return;
    }

    // ✅ التحقق: رقم الفاتورة إلزامي
    if (!String(invoiceNo || "").trim()) {
      setInvoiceError("Invoice No is required.");
      if (invoiceRef.current) {
        invoiceRef.current.focus();
        invoiceRef.current.scrollIntoView({
          behavior: "smooth",
          block: "center",
        });
      }
      return;
    } else {
      setInvoiceError("");
    }

    const entries = rows.filter((r) =>
      Object.values(r).some((v) => String(v || "").trim() !== "")
    );
    if (entries.length === 0) {
      setSaveMsg("⚠️ لا يوجد بيانات للحفظ.");
      return;
    }

    const payload = {
      branch: BRANCH,
      formRef,
      reportDate,
      month: monthText,
      invoiceNo,
      entries,
      verifiedBy,
      receivedBy,
      savedAt: Date.now(),
    };

    try {
      setSaving(true);
      const res = await fetch(`${API_BASE}/api/reports`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reporter: "pos10",
          type: TYPE,
          payload,
        }),
      });

      let data = null;
      try {
        data = await res.json();
      } catch {
        data = null;
      }

      if (res.status === 409) {
        setSaveMsg(
          (data && data.message) ||
            "⚠️ يوجد تقرير محفوظ لهذا التاريخ، لا يمكن حفظ تقرير جديد."
        );
        return;
      }

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }

      setSaveMsg("✅ تم الحفظ بنجاح!");
    } catch (e) {
      console.error(e);
      setSaveMsg("❌ فشل الحفظ. تحقق من السيرفر أو الشبكة.");
    } finally {
      setSaving(false);
      setTimeout(() => setSaveMsg(""), 3500);
    }
  }

  const invoiceBorder = String(invoiceNo || "").trim()
    ? "#1f3b70"
    : invoiceError
    ? "#b91c1c"
    : "#1f3b70";

  return (
    <div
      style={{
        background: "#fff",
        border: "1px solid #dbe3f4",
        borderRadius: 12,
        padding: 16,
        color: "#0b1f4d",
      }}
    >
      {/* === ترويسة AL MAWASHI + جدول المستند === */}
      <table style={topTable}>
        <tbody>
          <tr>
            <td
              rowSpan={3}
              style={{ ...tdHeader, width: 120, textAlign: "center" }}
            >
              <div
                style={{
                  fontWeight: 900,
                  color: "#a00",
                  lineHeight: 1.1,
                }}
              >
                AL
                <br />
                MAWASHI
              </div>
            </td>
            <td style={tdHeader}>
              <b>Document Title:</b> Receiving Log (Butchery)
            </td>
            <td style={tdHeader}>
              <b>Document No:</b>{" "}
              <input
                value={formRef}
                onChange={(e) => setFormRef(e.target.value)}
                style={{
                  border: "1px solid #9aa4ae",
                  borderRadius: 6,
                  padding: "3px 6px",
                  width: "60%",
                }}
              />
            </td>
          </tr>
          <tr>
            <td style={tdHeader}>
              <b>Issue Date:</b> 05/02/2020
            </td>
            <td style={tdHeader}>
              <b>Revision No:</b> 0
            </td>
          </tr>
          <tr>
            <td style={tdHeader}>
              <b>Area:</b> {BRANCH}
            </td>
            <td style={tdHeader}>
              <b>Date:</b>{" "}
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: 4,
                }}
              >
                <input
                  type="date"
                  value={reportDate}
                  onChange={(e) => setReportDate(e.target.value)}
                  style={{
                    border: "1px solid #9aa4ae",
                    borderRadius: 6,
                    padding: "3px 6px",
                    width: "100%",
                    maxWidth: 180,
                  }}
                />
                {dateStatusText && (
                  <span
                    style={{
                      fontSize: 11,
                      fontWeight: 700,
                      color: dateStatusColor,
                    }}
                  >
                    {dateStatusText}
                  </span>
                )}
              </div>
            </td>
          </tr>
        </tbody>
      </table>
      <div style={bandTitle}>RECEIVING LOG — {BRANCH}</div>

      {/* شريط الميتا (فقط رقم الفاتورة) */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "auto 1fr",
          gap: 8,
          alignItems: "center",
          marginBottom: 12,
        }}
      >
        <div style={{ fontWeight: 700, color: "#0b1f4d" }}>
          Invoice No <span style={{ color: "#b91c1c" }}>*</span> :
        </div>
        <div style={{ display: "grid", gap: 4 }}>
          <input
            ref={invoiceRef}
            type="text"
            value={invoiceNo}
            onChange={(e) => {
              setInvoiceNo(e.target.value);
              if (invoiceError) setInvoiceError("");
            }}
            placeholder="Enter invoice number (required)"
            aria-invalid={!!invoiceError}
            aria-describedby={invoiceError ? "invoice-error" : undefined}
            style={{
              ...inputStyle,
              borderColor: invoiceBorder,
              minWidth: 220,
            }}
          />
          {invoiceError && (
            <div
              id="invoice-error"
              style={{
                color: "#b91c1c",
                fontWeight: 700,
                fontSize: 12,
              }}
            >
              {invoiceError}
            </div>
          )}
        </div>
      </div>

      {/* Legend strip */}
      <div style={{ border: "1px solid #1f3b70", borderBottom: "none" }}>
        <div style={{ ...thCell, background: "#e9f0ff" }}>
          LEGEND: (C) – Conform &nbsp;&nbsp; / &nbsp;&nbsp; (NC) – Non-Conform
        </div>
      </div>

      {/* Table */}
      <div style={{ overflowX: "auto" }}>
        <table style={gridStyle}>
          <colgroup>{colDefs}</colgroup>
          <thead>
            <tr>
              <th style={thCell}>Name of the Supplier</th>
              <th style={thCell}>Food Item</th>
              <th style={thCell}>Vehicle Temp (°C)</th>
              <th style={thCell}>Food Temp (°C)</th>
              <th style={thCell}>Quantity KG\PCS</th> {/* ✅ الهيدر الجديد */}
              <th style={thCell}>Vehicle clean</th>
              <th style={thCell}>Food handler hygiene</th>
              <th style={thCell}>Appearance</th>
              <th style={thCell}>Firmness</th>
              <th style={thCell}>Bad Smell</th>
              <th style={thCell}>
                Packaging of food is good and undamaged, clean and no
                signs of pest infestation
              </th>
              <th style={thCell}>Country of origin</th>
              <th style={thCell}>Production Date</th>
              <th style={thCell}>Expiry Date</th>
              <th style={thCell}>Remarks (if any)</th>
              <th style={thCell}>Delete</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, idx) => (
              <tr key={idx}>
                <td style={tdCell}>
                  <input
                    type="text"
                    value={r.supplier}
                    onChange={(e) =>
                      updateRow(idx, "supplier", e.target.value)
                    }
                    style={inputStyle}
                  />
                </td>
                <td style={tdCell}>
                  <input
                    type="text"
                    value={r.foodItem}
                    onChange={(e) =>
                      updateRow(idx, "foodItem", e.target.value)
                    }
                    style={inputStyle}
                  />
                </td>
                <td style={tdCell}>
                  <input
                    type="number"
                    step="0.1"
                    value={r.vehicleTemp}
                    onChange={(e) =>
                      updateRow(idx, "vehicleTemp", e.target.value)
                    }
                    style={inputStyle}
                    placeholder="°C"
                  />
                </td>
                <td style={tdCell}>
                  <input
                    type="number"
                    step="0.1"
                    value={r.foodTemp}
                    onChange={(e) =>
                      updateRow(idx, "foodTemp", e.target.value)
                    }
                    style={inputStyle}
                    placeholder="°C"
                  />
                </td>
                {/* ✅ خانة الكمية */}
                <td style={tdCell}>
                  <input
                    type="text"
                    value={r.quantity}
                    onChange={(e) =>
                      updateRow(idx, "quantity", e.target.value)
                    }
                    style={inputStyle}
                    placeholder="e.g., 10 KG / 5 PCS"
                  />
                </td>

                {/* C / NC */}
                {TICK_COLS.map((c) => (
                  <td key={c.key} style={tdCell}>
                    <select
                      value={r[c.key]}
                      onChange={(e) =>
                        updateRow(idx, c.key, e.target.value)
                      }
                      style={inputStyle}
                      title="C = Conform, NC = Non-Conform"
                    >
                      <option value=""></option>
                      <option value="C">C</option>
                      <option value="NC">NC</option>
                    </select>
                  </td>
                ))}

                <td style={tdCell}>
                  <input
                    type="text"
                    value={r.countryOfOrigin}
                    onChange={(e) =>
                      updateRow(idx, "countryOfOrigin", e.target.value)
                    }
                    style={inputStyle}
                  />
                </td>
                <td style={tdCell}>
                  <input
                    type="date"
                    value={r.productionDate}
                    onChange={(e) =>
                      updateRow(idx, "productionDate", e.target.value)
                    }
                    style={inputStyle}
                  />
                </td>
                <td style={tdCell}>
                  <input
                    type="date"
                    value={r.expiryDate}
                    onChange={(e) =>
                      updateRow(idx, "expiryDate", e.target.value)
                    }
                    style={inputStyle}
                  />
                </td>
                <td style={tdCell}>
                  <input
                    type="text"
                    value={r.remarks}
                    onChange={(e) =>
                      updateRow(idx, "remarks", e.target.value)
                    }
                    style={inputStyle}
                  />
                </td>
                <td style={tdCell}>
                  <button
                    type="button"
                    onClick={() => removeRow(idx)}
                    style={{
                      padding: "4px 8px",
                      borderRadius: 8,
                      border: "none",
                      background:
                        "linear-gradient(135deg,#ef4444,#b91c1c)",
                      color: "#fff",
                      fontSize: 11,
                      fontWeight: 700,
                      cursor: "pointer",
                    }}
                    title="Delete this row"
                   data-delete-action="true">
                    ✕
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* أزرار التحكم بعد الجدول (إضافة صفوف) */}
      <div
        style={{
          marginTop: 10,
          display: "flex",
          gap: 8,
          flexWrap: "wrap",
        }}
      >
        <button
          type="button"
          onClick={addRow}
          style={btn("#16a34a")}
        >
          + Add Row
        </button>
      </div>

      {/* Notes */}
      <div style={{ marginTop: 10, fontSize: 11, color: "#0b1f4d" }}>
        <div style={{ fontWeight: 700, marginBottom: 4 }}>
          Organoleptic Checks*
        </div>
        <div>Appearance: Normal colour (Free from discoloration)</div>
        <div>Firmness: Firm rather than soft.</div>
        <div>Smell: Normal smell (No rancid or strange smell)</div>
        <div style={{ marginTop: 8 }}>
          <strong>Note:</strong> For Chilled Food: Target ≤ 5°C
          (Critical Limit: 5°C; short deviations up to 15 minutes during
          transfer).&nbsp; For Frozen Food: Target ≤ -18°C (Critical
          limits: RTE Frozen ≤ -18°C, Raw Frozen ≤ -10°C).&nbsp; For
          Hot Food: Target ≥ 60°C (Critical Limit: 60°C).&nbsp; Dry
          food, Low Risk: Receive at cool, dry condition or ≤ 25°C, or
          as per product requirement.
        </div>
      </div>

      {/* Footer controls + Received / Verified by (مبدّل الترتيب) */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          gap: 8,
          marginTop: 16,
          flexWrap: "wrap",
          alignItems: "center",
        }}
      >
        {/* Received by أولاً */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            fontSize: 12,
          }}
        >
          <strong>Received by:</strong>
          <input
            value={receivedBy}
            onChange={(e) => setReceivedBy(e.target.value)}
            placeholder=""
            style={{
              flex: "0 1 300px",
              border: "none",
              borderBottom: "2px solid #1f3b70",
              padding: "4px 6px",
              outline: "none",
              fontSize: 12,
              color: "#0b1f4d",
            }}
          />
        </div>

        {/* Verified by ثانياً */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            fontSize: 12,
          }}
        >
          <strong>Verified by:</strong>
          <input
            value={verifiedBy}
            onChange={(e) => setVerifiedBy(e.target.value)}
            placeholder=""
            style={{
              flex: "0 1 300px",
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

      {/* Save */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          marginTop: 16,
          flexWrap: "wrap",
        }}
      >
        <button
          onClick={handleSave}
          disabled={saveDisabled}
          style={btn(saveDisabled ? "#9ca3af" : "#2563eb")}
        >
          {saving ? "Saving…" : "Save Receiving Log"}
        </button>

        {saveMsg && (
          <div
            style={{
              fontWeight: 800,
              color: saveMsg.startsWith("✅")
                ? "#065f46"
                : saveMsg.startsWith("❌")
                ? "#b91c1c"
                : "#92400e",
            }}
          >
            {saveMsg}
          </div>
        )}
      </div>
    </div>
  );
}
