// src/pages/Returns.js

import React, { useState } from "react";
import { useNavigate } from "react-router-dom";

// رابط الـ API (من متغيّر البيئة في CRA)
const API_BASE = process.env.REACT_APP_API_URL || "https://inspection-server-4nvj.onrender.com";

// قائمة الأفرع
const BRANCHES = [
  "QCS", "POS 6", "POS 7", "POS 10", "POS 11", "POS 14", "POS 15", "POS 16",
  "POS 17", "POS 19", "POS 21", "POS 24", "POS 25", "POS 37", "POS 38",
  "POS 42", "POS 44", "POS 45", "فرع آخر... / Other branch"
];

// خيارات الإجراء
const ACTIONS = [
  "Use in production / استخدام في الإنتاج",
  "Condemnation / إتلاف",
  "Use in kitchen / استخدام في المطبخ",
  "Send to market / إرسال للسوق",
  "إجراء آخر... / Other action"
];

const QTY_TYPES = ["KG", "PCS", "أخرى / Other"];

function getToday() {
  return new Date().toISOString().slice(0, 10);
}

// إرسال تقرير واحد للسيرفر (API Only)
async function sendOneToServer({ reportDate, items }) {
  const res = await fetch(`${API_BASE}/api/reports`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      reporter: "anonymous",
      type: "returns",
      payload: { reportDate, items }
    }),
  });
  if (!res.ok) {
    const t = await res.text();
    throw new Error(`Server ${res.status}: ${t}`);
  }
  return res.json();
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
    // إعادة ضبط الحقول المخصّصة عند اختيار خيار قياسي
    if (field === "butchery" && value !== "فرع آخر... / Other branch") updated[idx].customButchery = "";
    if (field === "action" && value !== "إجراء آخر... / Other action") updated[idx].customAction = "";
    if (field === "qtyType" && value !== "أخرى / Other") updated[idx].customQtyType = "";
    setRows(updated);
  };

  // حفظ عبر API فقط (بدون أي حفظ محلي/طابور/باندينغ)
  const handleSave = async () => {
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
      setSaveMsg("يجب إضافة بيانات على الأقل! / Please add at least one row.");
      setTimeout(() => setSaveMsg(""), 1700);
      return;
    }

    try {
      setSaveMsg("⏳ جاري الحفظ على السيرفر… / Saving to server…");
      await sendOneToServer({ reportDate, items: filtered });
      setSaveMsg("✅ تم الحفظ على السيرفر بنجاح! / Saved successfully.");
    } catch (err) {
      setSaveMsg("❌ فشل الحفظ على السيرفر. حاول مجددًا. / Save failed. Please try again.");
      console.error(err);
    } finally {
      setTimeout(() => setSaveMsg(""), 3500);
    }
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

      {/* ====== تاريخ اليوم ====== */}
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
          تاريخ إعداد التقرير / Report Date:
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
        <button onClick={handleSave}
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
          }}>💾 حفظ / Save</button>
        <button onClick={() => navigate("/returns/view")}
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
          }}>📋 عرض التقارير / View Reports</button>
        {saveMsg && (
          <span style={{
            marginRight: 18, fontWeight: "bold",
            color: saveMsg.startsWith("✅") ? "#229954" : (saveMsg.startsWith("⏳") ? "#512e5f" : "#c0392b"),
            fontSize: "1.05em"
          }}>{saveMsg}</span>
        )}
      </div>

      {/* جدول */}
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
              <th style={th}>التسلسل / SL.NO</th>
              <th style={th}>اسم المنتج / PRODUCT NAME</th>
              <th style={th}>المنشأ / ORIGIN</th>
              <th style={th}>الفرع / BUTCHERY</th>
              <th style={th}>الكمية / QUANTITY</th>
              <th style={th}>نوع الكمية / QTY TYPE</th>
              <th style={th}>تاريخ الانتهاء / EXPIRY DATE</th>
              <th style={th}>ملاحظات / REMARKS</th>
              <th style={th}>الإجراء / ACTION</th>
              <th style={th}></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, idx) => (
              <tr key={idx} style={{ background: idx % 2 ? "#fcf3ff" : "#fff" }}>
                <td style={td}>{idx + 1}</td>
                <td style={td}>
                  <input style={input}
                    placeholder="اكتب اسم المنتج / Enter product name"
                    value={row.productName}
                    onChange={e => handleChange(idx, "productName", e.target.value)} />
                </td>
                <td style={td}>
                  <input style={input}
                    placeholder="اكتب المنشأ / Enter origin"
                    value={row.origin}
                    onChange={e => handleChange(idx, "origin", e.target.value)} />
                </td>
                <td style={td}>
                  <select style={input}
                    value={row.butchery}
                    onChange={e => handleChange(idx, "butchery", e.target.value)}>
                    <option value="">{`اختر الفرع / Select branch`}</option>
                    {BRANCHES.map(b => (
                      <option key={b} value={b}>{b}</option>
                    ))}
                  </select>
                  {row.butchery === "فرع آخر... / Other branch" && (
                    <input style={{ ...input, marginTop: 6 }}
                      placeholder="اكتب اسم الفرع / Enter branch name"
                      value={row.customButchery}
                      onChange={e => handleChange(idx, "customButchery", e.target.value)} />
                  )}
                </td>
                <td style={td}>
                  <input type="number" min="0" style={input}
                    placeholder="ادخل الكمية / Enter quantity"
                    value={row.quantity}
                    onChange={e => handleChange(idx, "quantity", e.target.value)} />
                </td>
                <td style={td}>
                  <select style={input}
                    value={row.qtyType}
                    onChange={e => handleChange(idx, "qtyType", e.target.value)}>
                    {QTY_TYPES.map(q => (
                      <option key={q} value={q}>{q}</option>
                    ))}
                  </select>
                  {row.qtyType === "أخرى / Other" && (
                    <input style={{ ...input, marginTop: 6 }}
                      placeholder="اكتب النوع / Enter type"
                      value={row.customQtyType}
                      onChange={e => handleChange(idx, "customQtyType", e.target.value)} />
                  )}
                </td>
                <td style={td}>
                  <input type="date" style={input}
                    placeholder="YYYY-MM-DD"
                    value={row.expiry}
                    onChange={e => handleChange(idx, "expiry", e.target.value)} />
                </td>
                <td style={td}>
                  <input style={input}
                    placeholder="اكتب ملاحظات / Enter remarks"
                    value={row.remarks}
                    onChange={e => handleChange(idx, "remarks", e.target.value)} />
                </td>
                <td style={td}>
                  <select style={input}
                    value={row.action}
                    onChange={e => handleChange(idx, "action", e.target.value)}>
                    <option value="">{`اختر الإجراء / Select action`}</option>
                    {ACTIONS.map(a => (
                      <option key={a} value={a}>{a}</option>
                    ))}
                  </select>
                  {row.action === "إجراء آخر... / Other action" && (
                    <input style={{ ...input, marginTop: 6 }}
                      placeholder="اكتب الإجراء / Enter action"
                      value={row.customAction}
                      onChange={e => handleChange(idx, "customAction", e.target.value)} />
                  )}
                </td>
                <td style={td}>
                  {rows.length > 1 && (
                    <button onClick={() => removeRow(idx)}
                      style={{
                        background: "#c0392b", color: "#fff",
                        border: "none", borderRadius: 8,
                        fontWeight: "bold", fontSize: 20,
                        padding: "4px 12px", cursor: "pointer"
                      }}
                      title="حذف الصف / Delete row">✖</button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div style={{ marginTop: "2rem", textAlign: "center" }}>
        <button onClick={addRow}
          style={{
            background: "#512e5f", color: "#fff",
            border: "none", borderRadius: "14px",
            fontWeight: "bold", fontSize: "1.13em",
            padding: "12px 35px", cursor: "pointer",
            boxShadow: "0 2px 8px #d2b4de"
          }}>➕ إضافة صف جديد / Add new row</button>
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
