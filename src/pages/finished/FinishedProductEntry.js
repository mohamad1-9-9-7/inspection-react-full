// src/pages/finished/FinishedProductEntry.jsx

import React, { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import * as XLSX from "xlsx-js-style";

/** نموذج صف مطابق للأعمدة الأساسية */
const emptyRow = {
  product: "",
  customer: "",
  orderNo: "",
  time: "",
  slaughterDate: "",
  expiryDate: "",
  temp: "",
  quantity: "",
  unitOfMeasure: "KG",
  overallCondition: "",
  remarks: "",
};

/** أسماء الأعمدة الأساسية */
const CORE_HEADERS = [
  "Product",
  "Customer",
  "Order No",
  "TIME",
  "Slaughter Date",
  "Expiry Date",
  "TEMP",
  "Quantity",
  "Unit of Measure",
  "OVERALL CONDITION",
  "REMARKS",
];

const toNumStr = (v) => {
  if (v === "" || v == null) return "";
  const n = Number(v);
  return Number.isFinite(n) ? String(n) : "";
};

/** Excel serial date → yyyy-mm-dd */
function parseExcelDate(v) {
  if (typeof v === "number") {
    const d = XLSX.SSF.parse_date_code(v);
    if (d) {
      const y = String(d.y).padStart(4, "0");
      const m = String(d.m).padStart(2, "0");
      const dd = String(d.d).padStart(2, "0");
      return `${y}-${m}-${dd}`;
    }
  }
  return String(v ?? "");
}

/** تحويل قياسي 1:1 إذا كانت رؤوس الملف مطابقة للرؤوس الأساسية */
function transformIncoming(record) {
  const out = { ...emptyRow };
  const hasExact = CORE_HEADERS.every((h) => record.hasOwnProperty(h));
  if (hasExact) {
    out.product = String(record["Product"] ?? "");
    out.customer = String(record["Customer"] ?? "");
    out.orderNo = String(record["Order No"] ?? "");
    out.time = String(record["TIME"] ?? "");
    out.slaughterDate = parseExcelDate(record["Slaughter Date"]);
    out.expiryDate = parseExcelDate(record["Expiry Date"]);
    out.temp = toNumStr(record["TEMP"]);
    out.quantity = toNumStr(record["Quantity"]);
    out.unitOfMeasure = String(record["Unit of Measure"] ?? "KG") || "KG";
    out.overallCondition = String(record["OVERALL CONDITION"] ?? "");
    out.remarks = String(record["REMARKS"] ?? "");
  }
  return out;
}

export default function FinishedProductEntry() {
  const navigate = useNavigate();

  const [reportDate, setReportDate] = useState("");
  const [rows, setRows] = useState([{ ...emptyRow }]);
  const [savedMsg, setSavedMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [importSummary, setImportSummary] = useState("");
  const [importMode, setImportMode] = useState("append"); // append | replace
  const fileRef = useRef(null);

  const addRow = () => setRows((r) => [...r, { ...emptyRow }]);
  const removeRow = (idx) => {
    if (rows.length === 1) return;
    setRows(rows.filter((_, i) => i !== idx));
  };
  const handleChange = (idx, key, value) => {
    const updated = [...rows];
    updated[idx][key] = value;
    setRows(updated);
  };

  const handleSave = () => {
    for (const r of rows) {
      if (!r.product || !r.customer || !r.orderNo || !r.slaughterDate || (!r.quantity && r.quantity !== "0")) {
        setErrorMsg("يرجى تعبئة الحقول الأساسية: Product, Customer, Order No, Slaughter Date, Quantity");
        setTimeout(() => setErrorMsg(""), 2600);
        return;
      }
    }
    const all = JSON.parse(localStorage.getItem("finished_products_reports") || "[]");
    all.push({ id: Date.now(), reportDate, products: rows });
    localStorage.setItem("finished_products_reports", JSON.stringify(all));
    setSavedMsg("✅ تم حفظ التقرير بنجاح!");
    setTimeout(() => setSavedMsg(""), 2000);
    setRows([{ ...emptyRow }]);
    setReportDate("");
  };

  const downloadTemplate = () => {
    const ws = XLSX.utils.aoa_to_sheet([CORE_HEADERS, []]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Template");
    XLSX.writeFile(wb, "FinishedProduct_Template.xlsx");
  };

  const onPick = async (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    try {
      const ab = await f.arrayBuffer();
      const wb = XLSX.read(ab, { type: "array" });
      const sheetName = wb.SheetNames[0];
      const ws = wb.Sheets[sheetName];
      const json = XLSX.utils.sheet_to_json(ws, { defval: "", raw: true });
      if (!json.length) {
        setErrorMsg("لا توجد صفوف بيانات في الملف.");
        setTimeout(() => setErrorMsg(""), 2600);
        return;
      }
      const transformed = json
        .map((rec) => transformIncoming(rec))
        .filter((r) => Object.values(r).some((v) => String(v).trim() !== ""));
      if (!transformed.length) {
        setErrorMsg("تمت القراءة لكن الرؤوس لا تطابق القالب. زوّدني بالماب إن احتجت تخصيصًا.");
        setTimeout(() => setErrorMsg(""), 3200);
        return;
      }
      setRows((prev) => (importMode === "replace" ? transformed : [...prev, ...transformed]));
      setImportSummary(`📥 استيراد: ${transformed.length} صف من "${sheetName}".`);
      setTimeout(() => setImportSummary(""), 3500);
    } catch (err) {
      console.error(err);
      setErrorMsg("فشل قراءة الملف.");
      setTimeout(() => setErrorMsg(""), 3000);
    } finally {
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  return (
    <div
      style={{
        width: "100%",           // ⬅️ امتلاء العرض
        margin: 0,               // ⬅️ بدون هوامش خارجية
        background: "#fff",
        borderRadius: 0,         // ⬅️ إلغاء الحواف لتبدو صفحة كاملة
        boxShadow: "none",       // ⬅️ إلغاء الظل
        padding: "24px 24px",
        fontFamily: "Cairo, sans-serif",
        direction: "rtl",
      }}
    >
      {/* شريط علوي: استيراد وتنقل */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 16, marginBottom: 20 }}>
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
          <button
            onClick={downloadTemplate}
            style={{ background: "#2e86c1", color: "#fff", fontWeight: "bold", border: "none", borderRadius: 10, padding: "9px 18px", cursor: "pointer" }}
          >
            ⬇️ تنزيل قالب (Core Headers)
          </button>

          <label
            style={{ background: "#5dade2", color: "#fff", fontWeight: "bold", borderRadius: 10, padding: "9px 18px", cursor: "pointer" }}
            title="استيراد XLSX/XLS/CSV"
          >
            📥 استيراد ملف
            <input
              ref={fileRef}
              type="file"
              accept=".xlsx,.xls,.xlsm,.xlsb,.csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel,text/csv"
              style={{ display: "none" }}
              onChange={onPick}
            />
          </label>

          <select
            value={importMode}
            onChange={(e) => setImportMode(e.target.value)}
            style={{ padding: "9px 10px", borderRadius: 10, border: "1.7px solid #bfc9e0", background: "#f5f8fa", fontWeight: "bold", color: "#273746" }}
            title="طريقة الإدراج"
          >
            <option value="append">إضافة للصفوف الحالية</option>
            <option value="replace">استبدال الصفوف الحالية</option>
          </select>
        </div>

        <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
          <button
            onClick={() => navigate("/finished-product-reports")}
            style={{ background: "#884ea0", color: "#fff", fontWeight: "bold", border: "none", borderRadius: 10, padding: "9px 22px", cursor: "pointer" }}
          >
            📑 عرض التقارير المحفوظة
          </button>
          <button
            onClick={() => navigate("/finished-products-data")}
            style={{ background: "#229954", color: "#fff", fontWeight: "bold", border: "none", borderRadius: 10, padding: "9px 22px", cursor: "pointer" }}
          >
            🗃️ قاعدة بيانات المنتجات
          </button>
        </div>
      </div>

      {importSummary && (
        <div style={{ background: "#eaf2f8", color: "#1b4f72", borderRadius: 8, padding: "10px 12px", marginBottom: 14, fontWeight: "bold", textAlign: "center" }}>
          {importSummary}
        </div>
      )}

      <h2 style={{ color: "#273746", textAlign: "start", marginBottom: 16, fontWeight: "bold" }}>
        📝 Finished Product Entry (Full Width)
      </h2>

      {/* تاريخ التقرير */}
      <div style={{ marginBottom: 16, display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
        <label style={{ fontWeight: "bold", minWidth: 160 }}>تاريخ التقرير / Report Date:</label>
        <input
          type="text"
          value={reportDate}
          onChange={(e) => setReportDate(e.target.value)}
          placeholder="YYYY-MM-DD"
          style={{ padding: "9px 13px", borderRadius: 10, border: "1.7px solid #bfc9e0", background: "#f5f8fa", width: 240, direction: "ltr" }}
        />
      </div>

      {/* رسائل */}
      {savedMsg && (
        <div style={{ background: "#d4efdf", color: "#229954", borderRadius: 8, padding: "12px 0", marginBottom: 14, fontWeight: "bold", textAlign: "center" }}>
          {savedMsg}
        </div>
      )}
      {errorMsg && (
        <div style={{ background: "#fadbd8", color: "#c0392b", borderRadius: 8, padding: "12px 0", marginBottom: 14, fontWeight: "bold", textAlign: "center" }}>
          {errorMsg}
        </div>
      )}

      {/* الجدول — بالعرض الكامل، مع تمرير أفقي عند الضيق */}
      <div style={{ overflowX: "auto", width: "100%" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.98em", background: "#f8fafc" }}>
          <thead>
            <tr style={{ background: "#eeeeee", color: "#273746" }}>
              {CORE_HEADERS.map((h) => (
                <th key={h} style={th}>{h}</th>
              ))}
              <th style={th}>Remove</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, idx) => (
              <tr key={idx} style={{ background: idx % 2 ? "#fdf6fa" : "#fff" }}>
                <td style={td}><input value={r.product} onChange={(e) => handleChange(idx, "product", e.target.value)} style={inputStyle} placeholder="Product" /></td>
                <td style={td}><input value={r.customer} onChange={(e) => handleChange(idx, "customer", e.target.value)} style={inputStyle} placeholder="Customer" /></td>
                <td style={td}><input value={r.orderNo} onChange={(e) => handleChange(idx, "orderNo", e.target.value)} style={inputStyle} placeholder="Order No" /></td>
                <td style={td}><input value={r.time} onChange={(e) => handleChange(idx, "time", e.target.value)} style={inputStyle} placeholder="TIME (e.g., 08:45:14)" /></td>
                <td style={td}><input value={r.slaughterDate} onChange={(e) => handleChange(idx, "slaughterDate", e.target.value)} style={inputStyle} placeholder="YYYY-MM-DD" /></td>
                <td style={td}><input value={r.expiryDate} onChange={(e) => handleChange(idx, "expiryDate", e.target.value)} style={inputStyle} placeholder="YYYY-MM-DD (optional)" /></td>
                <td style={td}><input type="number" value={r.temp} onChange={(e) => handleChange(idx, "temp", e.target.value)} style={inputStyle} placeholder="TEMP" /></td>
                <td style={td}><input type="number" value={r.quantity} onChange={(e) => handleChange(idx, "quantity", e.target.value)} style={inputStyle} placeholder="Quantity" /></td>
                <td style={td}>
                  <select value={r.unitOfMeasure} onChange={(e) => handleChange(idx, "unitOfMeasure", e.target.value)} style={inputStyle}>
                    <option value="KG">KG</option>
                    <option value="BOX">BOX</option>
                    <option value="PLATE">PLATE</option>
                    <option value="Piece">Piece</option>
                  </select>
                </td>
                <td style={td}><input value={r.overallCondition} onChange={(e) => handleChange(idx, "overallCondition", e.target.value)} style={inputStyle} placeholder="OVERALL CONDITION" /></td>
                <td style={td}><input value={r.remarks} onChange={(e) => handleChange(idx, "remarks", e.target.value)} style={inputStyle} placeholder="REMARKS" /></td>
                <td style={td}>
                  <button
                    onClick={() => removeRow(idx)}
                    disabled={rows.length === 1}
                    style={{ background: "#c0392b", color: "#fff", border: "none", borderRadius: 8, fontWeight: "bold", padding: "5px 11px", cursor: rows.length === 1 ? "not-allowed" : "pointer" }}
                  >
                    🗑️
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* أزرار أسفل */}
      <div style={{ display: "flex", gap: 10, marginTop: 18, flexWrap: "wrap" }}>
        <button
          onClick={addRow}
          style={{ background: "#5dade2", color: "#fff", padding: "10px 28px", border: "none", borderRadius: 10, cursor: "pointer", fontWeight: "bold" }}
        >
          ➕ Add Row
        </button>
        <button
          onClick={handleSave}
          style={{ background: "#229954", color: "#fff", padding: "11px 44px", border: "none", borderRadius: 12, cursor: "pointer", fontWeight: "bold" }}
        >
          💾 Save Report
        </button>
      </div>
    </div>
  );
}

/* تنسيقات */
const th = { padding: "12px 8px", fontWeight: "bold", fontSize: "1.02em", textAlign: "center", borderBottom: "2px solid #ddd", whiteSpace: "nowrap" };
const td = { padding: "7px 6px", textAlign: "center" };
const inputStyle = { width: "100%", padding: "8px", borderRadius: "8px", border: "1.5px solid #d4e6f1", fontSize: "1em", background: "#fff" };
