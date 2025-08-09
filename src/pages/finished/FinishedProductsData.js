// src/pages/finished/FinishedProductsData.js

import React, { useState, useEffect, useRef } from "react";

// الأعمدة الأساسية
const columns = [
  { key: "productName", label: "اسم المنتج" },
  { key: "productionDate", label: "تاريخ الإنتاج" },
  { key: "expiryDate", label: "تاريخ الانتهاء" },
  { key: "quantity", label: "الكمية" },
  { key: "remarks", label: "ملاحظات" }
];

// مفتاح التخزين المحلي
const STORAGE_KEY = "finished_products_data";

export default function FinishedProductsData() {
  const [rows, setRows] = useState([]);
  const [editIdx, setEditIdx] = useState(null);
  const [editRow, setEditRow] = useState({});
  const [newRow, setNewRow] = useState({
    productName: "",
    productionDate: "",
    expiryDate: "",
    quantity: "",
    remarks: "",
  });
  const fileInputRef = useRef();

  // جلب البيانات من التخزين المحلي
  useEffect(() => {
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
    setRows(stored);
  }, []);

  // حفظ في التخزين عند التغيير
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(rows));
  }, [rows]);

  // إضافة منتج جديد
  const handleAdd = () => {
    if (!newRow.productName) return alert("يرجى إدخال اسم المنتج");
    setRows([newRow, ...rows]);
    setNewRow({
      productName: "",
      productionDate: "",
      expiryDate: "",
      quantity: "",
      remarks: "",
    });
  };

  // حذف منتج
  const handleDelete = (idx) => {
    if (!window.confirm("تأكيد حذف المنتج؟")) return;
    const copy = [...rows];
    copy.splice(idx, 1);
    setRows(copy);
  };

  // بدء التعديل
  const handleEdit = (idx) => {
    setEditIdx(idx);
    setEditRow(rows[idx]);
  };

  // حفظ التعديل
  const handleSaveEdit = (idx) => {
    const copy = [...rows];
    copy[idx] = editRow;
    setRows(copy);
    setEditIdx(null);
    setEditRow({});
  };

  // لصق بيانات من الإكسل أو جدول
  const handlePaste = (e) => {
    const text = e.clipboardData.getData("text/plain");
    if (!text.includes("\t") && !text.includes("\n")) return;
    e.preventDefault();

    // تحويل النص إلى مصفوفة صفوف وأعمدة
    const lines = text.trim().split(/\r?\n/);
    const parsed = lines.map(line => line.split("\t"));
    // تجاهل الصفوف الفارغة
    const filtered = parsed.filter(arr => arr.filter(x => !!x).length > 0);
    if (filtered.length === 0) return;

    // التأكد من الأعمدة (يجب أن تكون بعدد الأعمدة أو أقل)
    let newRows = [];
    for (let arr of filtered) {
      let obj = {};
      columns.forEach((col, i) => obj[col.key] = arr[i] || "");
      newRows.push(obj);
    }
    setRows([...newRows, ...rows]);
  };

  // استيراد ملف إكسل أو CSV (اختياري)
  const handleImport = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = evt => {
      const text = evt.target.result;
      const lines = text.split(/\r?\n/);
      let parsedRows = [];
      for (let line of lines) {
        const arr = line.split(/\t|,/);
        if (arr.filter(x => !!x).length < 2) continue;
        let obj = {};
        columns.forEach((col, i) => obj[col.key] = arr[i] || "");
        parsedRows.push(obj);
      }
      setRows([...parsedRows, ...rows]);
    };
    reader.readAsText(file);
  };

  // تصدير إلى إكسل أو CSV
  const handleExport = () => {
    let data =
      columns.map(col => col.label).join(",") +
      "\n" +
      rows.map(row =>
        columns.map(col => `"${row[col.key] || ""}"`).join(",")
      ).join("\n");
    const blob = new Blob([data], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "finished_products_data.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div style={{
      maxWidth: 1200,
      margin: "2.2rem auto",
      background: "#fff",
      borderRadius: 16,
      boxShadow: "0 2px 16px #aab7b845",
      padding: "2.5rem 2.3rem",
      fontFamily: "Cairo, sans-serif",
      direction: "rtl"
    }}>
      <h2 style={{ color: "#512e5f", fontWeight: "bold", marginBottom: 25 }}>
        🗂️ قاعدة بيانات المنتج النهائي (Finished Products)
      </h2>

      <div style={{ marginBottom: 20 }}>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <input
            type="text"
            placeholder="اسم المنتج"
            value={newRow.productName}
            onChange={e => setNewRow(r => ({ ...r, productName: e.target.value }))}
            style={inputStyle}
          />
          <input
            type="date"
            placeholder="تاريخ الإنتاج"
            value={newRow.productionDate}
            onChange={e => setNewRow(r => ({ ...r, productionDate: e.target.value }))}
            style={inputStyle}
          />
          <input
            type="date"
            placeholder="تاريخ الانتهاء"
            value={newRow.expiryDate}
            onChange={e => setNewRow(r => ({ ...r, expiryDate: e.target.value }))}
            style={inputStyle}
          />
          <input
            type="number"
            placeholder="الكمية"
            value={newRow.quantity}
            onChange={e => setNewRow(r => ({ ...r, quantity: e.target.value }))}
            style={inputStyle}
          />
          <input
            type="text"
            placeholder="ملاحظات"
            value={newRow.remarks}
            onChange={e => setNewRow(r => ({ ...r, remarks: e.target.value }))}
            style={inputStyle}
          />
          <button onClick={handleAdd} style={btnStyle}>➕ إضافة</button>
        </div>
        <div style={{ marginTop: 12, color: "#8e44ad", fontSize: "0.97em" }}>
          <b>💡 تلميح:</b> يمكنك لصق جدول المنتجات مباشرة من الإكسل داخل الجدول أدناه!<br />
          أو يمكنك استيراد ملف CSV أو TXT:
          <button onClick={() => fileInputRef.current.click()} style={{
            ...btnStyle,
            background: "#229954",
            marginRight: 15
          }}>⬆️ استيراد</button>
          <input type="file" ref={fileInputRef} accept=".csv,.txt" onChange={handleImport} style={{ display: "none" }} />
          <button onClick={handleExport} style={{
            ...btnStyle,
            background: "#5dade2",
            marginRight: 7
          }}>⬇️ تصدير البيانات</button>
        </div>
      </div>

      <div style={{
        borderRadius: 14,
        boxShadow: "0 1px 8px #aab7b845",
        overflowX: "auto",
        background: "#fcf3ff"
      }}
        tabIndex={0}
        onPaste={handlePaste}
      >
        <table style={{
          width: "100%",
          borderCollapse: "collapse",
          fontSize: "1.04em",
          background: "#fcf3ff"
        }}>
          <thead>
            <tr style={{
              background: "#e8daef",
              color: "#512e5f",
              fontWeight: "bold",
              fontSize: "1.08em"
            }}>
              <th>#</th>
              {columns.map(col => <th key={col.key}>{col.label}</th>)}
              <th>إجراءات</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 &&
              <tr>
                <td colSpan={columns.length + 2} style={{ textAlign: "center", color: "#aaa", fontWeight: "bold", padding: 35 }}>لا توجد منتجات حتى الآن</td>
              </tr>
            }
            {rows.map((row, idx) => (
              <tr key={idx} style={{ background: idx % 2 ? "#fff" : "#f5eef8" }}>
                <td>{idx + 1}</td>
                {columns.map(col =>
                  <td key={col.key}>
                    {editIdx === idx
                      ? <input
                        value={editRow[col.key]}
                        onChange={e => setEditRow(r => ({ ...r, [col.key]: e.target.value }))}
                        style={inputStyle}
                        autoFocus={col.key === "productName"}
                      />
                      : row[col.key]}
                  </td>
                )}
                <td>
                  {editIdx === idx
                    ? <>
                      <button onClick={() => handleSaveEdit(idx)} style={{ ...btnStyle, background: "#229954" }}>💾 حفظ</button>
                      <button onClick={() => setEditIdx(null)} style={{ ...btnStyle, background: "#aaa" }}>إلغاء</button>
                    </>
                    : <>
                      <button onClick={() => handleEdit(idx)} style={btnStyle}>✏️</button>
                      <button onClick={() => handleDelete(idx)} style={{ ...btnStyle, background: "#e74c3c" }}>🗑️</button>
                    </>
                  }
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div style={{ color: "#8e44ad", marginTop: 25, textAlign: "center", fontSize: "1.05em" }}>
        كل البيانات تُحفظ تلقائيًا في المتصفح (LocalStorage) — تدعم النسخ واللصق من الإكسل والتصدير
      </div>
    </div>
  );
}

const inputStyle = {
  borderRadius: 10,
  border: "1.5px solid #b2babb",
  padding: "8px 10px",
  fontSize: "1em",
  minWidth: 110,
  background: "#fff",
  marginLeft: 6,
  marginBottom: 5,
};
const btnStyle = {
  background: "#884ea0",
  color: "#fff",
  border: "none",
  borderRadius: 8,
  padding: "9px 17px",
  fontWeight: "bold",
  fontSize: "1em",
  marginLeft: 5,
  cursor: "pointer",
  marginBottom: 5,
  transition: "background 0.18s"
};
