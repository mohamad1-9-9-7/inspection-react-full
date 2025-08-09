// src/pages/Returns.js

import React, { useState } from "react";
import { useNavigate } from "react-router-dom";

// قائمة الأفرع
const BRANCHES = [
  "QCS", "POS 6", "POS 7", "POS 10", "POS 11", "POS 14", "POS 15", "POS 16",
  "POS 17", "POS 19", "POS 21", "POS 24", "POS 25", "POS 37", "POS 38",
  "POS 42", "POS 44", "POS 45", "فرع آخر..."
];

// خيارات الإجراء
const ACTIONS = [
  "Use in production",
  "Condemnation",
  "Use in kitchen",
  "Send to market",
  "إجراء آخر..."
];

const QTY_TYPES = [
  "KG",
  "PCS",
  "أخرى"
];

function getToday() {
  return new Date().toISOString().slice(0, 10);
}

export default function Returns() {
  const navigate = useNavigate();
  const [reportDate, setReportDate] = useState(getToday());
  const [rows, setRows] = useState([
    {
      productName: "",
      origin: "",
      butchery: "",
      customButchery: "",
      quantity: "",
      qtyType: "KG",
      customQtyType: "",
      expiry: "",
      remarks: "",
      action: "",
      customAction: ""
    }
  ]);
  const [saveMsg, setSaveMsg] = useState("");

  // إضافة صف جديد
  const addRow = () => {
    setRows([
      ...rows,
      {
        productName: "",
        origin: "",
        butchery: "",
        customButchery: "",
        quantity: "",
        qtyType: "KG",
        customQtyType: "",
        expiry: "",
        remarks: "",
        action: "",
        customAction: ""
      }
    ]);
  };

  // حذف صف
  const removeRow = (index) => {
    setRows(rows.filter((_, idx) => idx !== index));
  };

  // تعديل قيمة ضمن صف
  const handleChange = (idx, field, value) => {
    const updated = [...rows];
    updated[idx][field] = value;
    // Reset custom fields if not chosen
    if (field === "butchery" && value !== "فرع آخر...") updated[idx].customButchery = "";
    if (field === "action" && value !== "إجراء آخر...") updated[idx].customAction = "";
    if (field === "qtyType" && value !== "أخرى") updated[idx].customQtyType = "";
    setRows(updated);
  };

  // زر الحفظ (يحفظ كل تقرير على حدة وفق التاريخ)
  const handleSave = () => {
    // حذف الصفوف الفارغة بالكامل
    const filtered = rows.filter(
      r =>
        r.productName.trim() ||
        r.origin.trim() ||
        r.butchery.trim() ||
        r.customButchery.trim() ||
        r.quantity ||
        r.expiry ||
        r.remarks.trim() ||
        r.action.trim() ||
        r.customAction.trim()
    );
    if (!filtered.length) {
      setSaveMsg("يجب إضافة بيانات على الأقل!");
      setTimeout(() => setSaveMsg(""), 1700);
      return;
    }
    // جلب تقارير سابقة
    let existing = [];
    try {
      existing = JSON.parse(localStorage.getItem("returns_reports") || "[]");
    } catch { existing = []; }
    // تحديث أو إضافة التقرير حسب التاريخ
    const foundIdx = existing.findIndex(r => r.reportDate === reportDate);
    if (foundIdx > -1) {
      // تحديث العناصر لذلك اليوم (استبدال)
      existing[foundIdx].items = filtered;
    } else {
      // إضافة تقرير جديد
      existing.push({
        reportDate,
        items: filtered
      });
    }
    localStorage.setItem("returns_reports", JSON.stringify(existing));
    setSaveMsg("✅ تم الحفظ بنجاح!");
    setTimeout(() => setSaveMsg(""), 2000);
    // إبقاء الجدول أو إعادة ضبطه
    // setRows([{...}])
  };

  return (
    <div
      style={{
        fontFamily: "Cairo, sans-serif",
        padding: "2.5rem",
        background: "#f4f6fa",
        minHeight: "100vh",
        direction: "rtl"
      }}
    >
      <h2 style={{
        textAlign: "center",
        color: "#512e5f",
        marginBottom: "2.3rem",
        fontWeight: "bold"
      }}>
        🛒 سجل المرتجعات (Returns Register)
      </h2>

      {/* ====== تاريخ اليوم أعلى الصفحة ====== */}
      <div style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 14,
        marginBottom: 24,
        fontSize: "1.17em"
      }}>
        <span style={{
          background: "#884ea0",
          color: "#fff",
          padding: "9px 17px",
          borderRadius: 14,
          boxShadow: "0 2px 10px #e8daef44",
          display: "flex",
          alignItems: "center",
          gap: 9,
          fontWeight: "bold",
        }}>
          <span role="img" aria-label="calendar" style={{ fontSize: 22 }}>📅</span>
          تاريخ إعداد التقرير:
          <input
            type="date"
            value={reportDate}
            onChange={e => setReportDate(e.target.value)}
            style={{
              marginRight: 10,
              background: "#fcf6ff",
              border: "none",
              borderRadius: 7,
              padding: "7px 14px",
              fontWeight: "bold",
              fontSize: "1em",
              color: "#512e5f",
              boxShadow: "0 1px 4px #e8daef44"
            }}
          />
        </span>
      </div>

      {/* أزرار العمليات */}
      <div style={{
        display: "flex", justifyContent: "center", alignItems: "center",
        gap: "1.2rem", marginBottom: 20
      }}>
        <button
          onClick={handleSave}
          style={{
            background: "#229954",
            color: "#fff",
            border: "none",
            borderRadius: "14px",
            fontWeight: "bold",
            fontSize: "1.08em",
            padding: "10px 32px",
            cursor: "pointer",
            boxShadow: "0 2px 8px #d4efdf"
          }}
        >💾 حفظ</button>
        <button
          onClick={() => navigate("/returns-view")}
          style={{
            background: "#884ea0",
            color: "#fff",
            border: "none",
            borderRadius: "14px",
            fontWeight: "bold",
            fontSize: "1.08em",
            padding: "10px 32px",
            cursor: "pointer",
            boxShadow: "0 2px 8px #d2b4de"
          }}
        >📋 عرض التقارير المحفوظة</button>
        {saveMsg && (
          <span style={{
            marginRight: 18, fontWeight: "bold",
            color: saveMsg.startsWith("✅") ? "#229954" : "#c0392b",
            fontSize: "1.05em"
          }}>{saveMsg}</span>
        )}
      </div>

      <div style={{ overflowX: "auto" }}>
        <table style={{
          width: "100%",
          background: "#fff",
          borderRadius: 16,
          boxShadow: "0 2px 16px #dcdcdc70",
          borderCollapse: "collapse",
          minWidth: 1300
        }}>
          <thead>
            <tr style={{ background: "#e8daef", color: "#512e5f" }}>
              <th style={th}>SL.NO</th>
              <th style={th}>PRODUCT NAME</th>
              <th style={th}>ORIGIN</th>
              <th style={th}>BUTCHERY</th>
              <th style={th}>QUANTITY</th>
              <th style={th}>QTY TYPE</th>
              <th style={th}>EXPIRY DATE</th>
              <th style={th}>REMARKS</th>
              <th style={th}>ACTION</th>
              <th style={th}></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, idx) => (
              <tr key={idx} style={{ background: idx % 2 ? "#fcf3ff" : "#fff" }}>
                <td style={td}>{idx + 1}</td>
                <td style={td}>
                  <input
                    style={input}
                    value={row.productName}
                    onChange={e => handleChange(idx, "productName", e.target.value)}
                  />
                </td>
                <td style={td}>
                  <input
                    style={input}
                    value={row.origin}
                    onChange={e => handleChange(idx, "origin", e.target.value)}
                  />
                </td>
                <td style={td}>
                  <select
                    style={input}
                    value={row.butchery}
                    onChange={e => handleChange(idx, "butchery", e.target.value)}
                  >
                    <option value="">اختر الفرع</option>
                    {BRANCHES.map(b => (
                      <option key={b} value={b}>{b}</option>
                    ))}
                  </select>
                  {/* حقل فرع مخصص إذا اختار "فرع آخر..." */}
                  {row.butchery === "فرع آخر..." && (
                    <input
                      style={{ ...input, marginTop: 6 }}
                      placeholder="اكتب اسم الفرع..."
                      value={row.customButchery}
                      onChange={e => handleChange(idx, "customButchery", e.target.value)}
                    />
                  )}
                </td>
                <td style={td}>
                  <input
                    type="number"
                    min="0"
                    style={input}
                    value={row.quantity}
                    onChange={e => handleChange(idx, "quantity", e.target.value)}
                  />
                </td>
                <td style={td}>
                  <select
                    style={input}
                    value={row.qtyType}
                    onChange={e => handleChange(idx, "qtyType", e.target.value)}
                  >
                    {QTY_TYPES.map(q => (
                      <option key={q} value={q}>{q}</option>
                    ))}
                  </select>
                  {row.qtyType === "أخرى" && (
                    <input
                      style={{ ...input, marginTop: 6 }}
                      placeholder="اكتب النوع..."
                      value={row.customQtyType}
                      onChange={e => handleChange(idx, "customQtyType", e.target.value)}
                    />
                  )}
                </td>
                <td style={td}>
                  <input
                    type="date"
                    style={input}
                    value={row.expiry}
                    onChange={e => handleChange(idx, "expiry", e.target.value)}
                  />
                </td>
                <td style={td}>
                  <input
                    style={input}
                    value={row.remarks}
                    onChange={e => handleChange(idx, "remarks", e.target.value)}
                  />
                </td>
                <td style={td}>
                  <select
                    style={input}
                    value={row.action}
                    onChange={e => handleChange(idx, "action", e.target.value)}
                  >
                    <option value="">اختر الإجراء</option>
                    {ACTIONS.map(a => (
                      <option key={a} value={a}>{a}</option>
                    ))}
                  </select>
                  {/* حقل إجراء مخصص إذا اختار "إجراء آخر..." */}
                  {row.action === "إجراء آخر..." && (
                    <input
                      style={{ ...input, marginTop: 6 }}
                      placeholder="اكتب الإجراء..."
                      value={row.customAction}
                      onChange={e => handleChange(idx, "customAction", e.target.value)}
                    />
                  )}
                </td>
                <td style={td}>
                  {rows.length > 1 && (
                    <button
                      onClick={() => removeRow(idx)}
                      style={{
                        background: "#c0392b",
                        color: "#fff",
                        border: "none",
                        borderRadius: 8,
                        fontWeight: "bold",
                        fontSize: 20,
                        padding: "4px 12px",
                        cursor: "pointer"
                      }}
                      title="حذف الصف"
                    >✖</button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div style={{ marginTop: "2rem", textAlign: "center" }}>
        <button
          onClick={addRow}
          style={{
            background: "#512e5f",
            color: "#fff",
            border: "none",
            borderRadius: "14px",
            fontWeight: "bold",
            fontSize: "1.13em",
            padding: "12px 35px",
            cursor: "pointer",
            boxShadow: "0 2px 8px #d2b4de"
          }}
        >➕ إضافة صف جديد</button>
      </div>
    </div>
  );
}

const th = {
  padding: "13px 7px",
  textAlign: "center",
  fontSize: "1.09em",
  fontWeight: "bold",
  borderBottom: "2px solid #c7a8dc"
};

const td = {
  padding: "10px 6px",
  textAlign: "center",
  minWidth: 110
};

const input = {
  padding: "7px 8px",
  borderRadius: 7,
  border: "1.5px solid #c7a8dc",
  background: "#fcf6ff",
  fontSize: "1em",
  minWidth: 90
};
