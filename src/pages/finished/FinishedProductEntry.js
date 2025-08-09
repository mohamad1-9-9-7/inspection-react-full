// src/pages/finished/FinishedProductEntry.jsx

import React, { useState } from "react";
import { useNavigate } from "react-router-dom";

// نموذج واحد لسطر منتج جديد
const emptyProductRow = {
  product: "",
  customer: "",
  orderNo: "",
  time: "",
  slaughterDate: "",
  expiryDate: "",
  temp: "",
  quantity: "",
  unit: "KG",
  condition: "",
  remarks: "",
};

export default function FinishedProductEntry() {
  const navigate = useNavigate();
  const [reportDate, setReportDate] = useState("");
  const [rows, setRows] = useState([{ ...emptyProductRow }]);
  const [savedMsg, setSavedMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  // إضافة صف جديد
  const addRow = () => setRows([...rows, { ...emptyProductRow }]);

  // حذف صف معين
  const removeRow = (idx) => {
    if (rows.length === 1) return;
    setRows(rows.filter((_, i) => i !== idx));
  };

  // تعديل البيانات داخل الجدول
  const handleChange = (idx, key, value) => {
    const updated = [...rows];
    updated[idx][key] = value;
    setRows(updated);
  };

  // حفظ التقرير في localStorage
  const handleSave = () => {
    for (let row of rows) {
      if (
        !row.product ||
        !row.customer ||
        !row.orderNo ||
        !row.slaughterDate ||
        !row.expiryDate ||
        !row.temp ||
        !row.quantity
      ) {
        setErrorMsg("يرجى تعبئة جميع الحقول الأساسية لكل منتج!");
        setTimeout(() => setErrorMsg(""), 2500);
        return;
      }
    }
    const allReports = JSON.parse(localStorage.getItem("finished_products_reports") || "[]");
    allReports.push({
      id: Date.now(),
      reportDate,
      products: rows,
    });
    localStorage.setItem("finished_products_reports", JSON.stringify(allReports));
    setSavedMsg("✅ تم حفظ التقرير بنجاح!");
    setTimeout(() => setSavedMsg(""), 2000);
    setRows([{ ...emptyProductRow }]);
    setReportDate("");
  };

  return (
    <div
      style={{
        maxWidth: 1100,
        margin: "40px auto",
        background: "#fff",
        borderRadius: 16,
        boxShadow: "0 4px 18px #bfc9e066",
        padding: "32px 26px",
        fontFamily: "Cairo, sans-serif",
        direction: "rtl",
      }}
    >
      {/* ===== أزرار التنقل أعلى الصفحة ===== */}
      <div style={{ display: "flex", justifyContent: "flex-end", gap: "16px", marginBottom: 20 }}>
        <button
          onClick={() => navigate("/finished-product-reports")}
          style={{
            background: "#884ea0",
            color: "#fff",
            fontWeight: "bold",
            border: "none",
            borderRadius: 12,
            padding: "9px 22px",
            fontSize: "1em",
            cursor: "pointer",
            boxShadow: "0 2px 10px #e8daef77",
            letterSpacing: "0.5px",
          }}
        >
          📑 عرض التقارير المحفوظة / View Reports
        </button>
        <button
          onClick={() => navigate("/finished-products-data")}
          style={{
            background: "#229954",
            color: "#fff",
            fontWeight: "bold",
            border: "none",
            borderRadius: 12,
            padding: "9px 22px",
            fontSize: "1em",
            cursor: "pointer",
            boxShadow: "0 2px 10px #d4efdf99",
            letterSpacing: "0.5px",
          }}
        >
          🗃️ قاعدة بيانات المنتجات / Products Database
        </button>
      </div>

      <h2
        style={{
          color: "#273746",
          textAlign: "center",
          marginBottom: 30,
          fontWeight: "bold",
        }}
      >
        📝 إدخال تقرير المنتج النهائي<br />
        <span style={{ color: "#616a6b", fontWeight: 500, fontSize: "1rem" }}>
          Finished Product Entry
        </span>
      </h2>

      {/* تاريخ التقرير */}
      <div style={{ marginBottom: 16, display: "flex", alignItems: "center", gap: 15 }}>
        <label style={{ fontWeight: "bold", minWidth: 140 }}>تاريخ التقرير / Report Date:</label>
        <input
          type="text"
          value={reportDate}
          onChange={e => setReportDate(e.target.value)}
          style={{
            padding: "9px 13px",
            borderRadius: 10,
            border: "1.7px solid #bfc9e0",
            fontSize: "1.02em",
            background: "#f5f8fa",
            width: 220,
            direction: "ltr",
          }}
          placeholder="مثال: 2025-08-06 or 06/08/2025"
        />
      </div>

      {/* رسائل */}
      {savedMsg && (
        <div
          style={{
            background: "#d4efdf",
            color: "#229954",
            borderRadius: 11,
            padding: "12px 0",
            marginBottom: 17,
            fontWeight: "bold",
            textAlign: "center",
          }}
        >
          {savedMsg}
        </div>
      )}
      {errorMsg && (
        <div
          style={{
            background: "#fadbd8",
            color: "#c0392b",
            borderRadius: 11,
            padding: "12px 0",
            marginBottom: 17,
            fontWeight: "bold",
            textAlign: "center",
          }}
        >
          {errorMsg}
        </div>
      )}

      <div style={{ overflowX: "auto" }}>
        <table
          style={{
            width: "100%",
            borderCollapse: "collapse",
            fontSize: "1em",
            background: "#f8fafc",
            borderRadius: 14,
            marginBottom: 20,
          }}
        >
          <thead>
            <tr style={{ background: "#a9cce3", color: "#273746" }}>
              <th style={th}>المنتج<br />Product</th>
              <th style={th}>العميل<br />Customer</th>
              <th style={th}>رقم الطلب<br />Order No</th>
              <th style={th}>الوقت<br />Time</th>
              <th style={th}>تاريخ الذبح<br />Slaughter Date</th>
              <th style={th}>تاريخ الانتهاء<br />Expiry Date</th>
              <th style={th}>درجة الحرارة<br />Temp</th>
              <th style={th}>الكمية<br />Quantity</th>
              <th style={th}>الوحدة<br />Unit</th>
              <th style={th}>الحالة العامة<br />Overall Condition</th>
              <th style={th}>ملاحظات<br />Remarks</th>
              <th style={th}>إزالة<br />Remove</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, idx) => (
              <tr key={idx} style={{ background: idx % 2 ? "#fdf6fa" : "#fff" }}>
                <td style={td}>
                  <input
                    value={row.product}
                    onChange={e => handleChange(idx, "product", e.target.value)}
                    style={inputStyle}
                    placeholder="اسم المنتج / Product Name"
                  />
                </td>
                <td style={td}>
                  <input
                    value={row.customer}
                    onChange={e => handleChange(idx, "customer", e.target.value)}
                    style={inputStyle}
                    placeholder="اسم العميل / Customer"
                  />
                </td>
                <td style={td}>
                  <input
                    value={row.orderNo}
                    onChange={e => handleChange(idx, "orderNo", e.target.value)}
                    style={inputStyle}
                    placeholder="رقم الطلب / Order No"
                  />
                </td>
                <td style={td}>
                  <input
                    value={row.time}
                    onChange={e => handleChange(idx, "time", e.target.value)}
                    style={inputStyle}
                    placeholder="الوقت / Time (مثال: 3:28 AM)"
                  />
                </td>
                <td style={td}>
                  <input
                    value={row.slaughterDate}
                    onChange={e => handleChange(idx, "slaughterDate", e.target.value)}
                    style={inputStyle}
                    placeholder="تاريخ الذبح / Slaughter Date"
                  />
                </td>
                <td style={td}>
                  <input
                    value={row.expiryDate}
                    onChange={e => handleChange(idx, "expiryDate", e.target.value)}
                    style={inputStyle}
                    placeholder="تاريخ الانتهاء / Expiry Date"
                  />
                </td>
                <td style={td}>
                  <input
                    type="number"
                    value={row.temp}
                    onChange={e => handleChange(idx, "temp", e.target.value)}
                    style={inputStyle}
                    placeholder="الحرارة / Temp"
                  />
                </td>
                <td style={td}>
                  <input
                    type="number"
                    value={row.quantity}
                    onChange={e => handleChange(idx, "quantity", e.target.value)}
                    style={inputStyle}
                    placeholder="الكمية / Quantity"
                  />
                </td>
                <td style={td}>
                  <select
                    value={row.unit}
                    onChange={e => handleChange(idx, "unit", e.target.value)}
                    style={inputStyle}
                  >
                    <option value="KG">KG</option>
                    <option value="Piece">Piece</option>
                  </select>
                </td>
                <td style={td}>
                  <input
                    value={row.condition}
                    onChange={e => handleChange(idx, "condition", e.target.value)}
                    style={inputStyle}
                    placeholder="مثال: OK / Example: OK"
                  />
                </td>
                <td style={td}>
                  <input
                    value={row.remarks}
                    onChange={e => handleChange(idx, "remarks", e.target.value)}
                    style={inputStyle}
                    placeholder="ملاحظات / Remarks"
                  />
                </td>
                <td style={td}>
                  <button
                    onClick={() => removeRow(idx)}
                    disabled={rows.length === 1}
                    style={{
                      background: "#c0392b",
                      color: "#fff",
                      border: "none",
                      borderRadius: 8,
                      fontWeight: "bold",
                      padding: "5px 11px",
                      cursor: rows.length === 1 ? "not-allowed" : "pointer",
                    }}
                  >
                    🗑️
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* إضافة صف جديد */}
      <button
        onClick={addRow}
        style={{
          background: "#5dade2",
          color: "#fff",
          padding: "10px 28px",
          fontSize: "1.08em",
          border: "none",
          borderRadius: 12,
          marginBottom: 24,
          marginRight: 10,
          cursor: "pointer",
          fontWeight: "bold",
          boxShadow: "0 2px 10px #aed6f133",
        }}
      >
        ➕ إضافة منتج جديد / Add New Product
      </button>

      {/* زر الحفظ */}
      <button
        onClick={handleSave}
        style={{
          background: "#229954",
          color: "#fff",
          padding: "11px 44px",
          fontSize: "1.22em",
          border: "none",
          borderRadius: 16,
          marginRight: 15,
          fontWeight: "bold",
          cursor: "pointer",
          boxShadow: "0 2px 14px #d4efdf99",
          letterSpacing: "1px",
        }}
      >
        💾 حفظ التقرير / Save Report
      </button>
    </div>
  );
}

// أنماط الأعمدة
const th = {
  padding: "13px 8px",
  fontWeight: "bold",
  fontSize: "1.04em",
  textAlign: "center",
  borderBottom: "2px solid #aed6f1",
};
const td = {
  padding: "7px 5px",
  textAlign: "center",
};
const inputStyle = {
  width: "97%",
  padding: "8px",
  borderRadius: "8px",
  border: "1.5px solid #d4e6f1",
  fontSize: "1em",
  background: "#fff",
};
