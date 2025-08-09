import React, { useEffect, useState, useRef } from "react";

export default function OHCView() {
  const [reports, setReports] = useState([]);
  const [editingIndex, setEditingIndex] = useState(null);
  const [editFormData, setEditFormData] = useState({
    name: "",
    nationality: "",
    job: "",
    branch: "",
    issueDate: "",
    expiryDate: "",
    result: "",
  });
  const [filter, setFilter] = useState("all");
  const [branchFilter, setBranchFilter] = useState("all");
  const fileInputRef = useRef(null);

  const branches = [
    "QCS", "POS 6", "POS 7", "POS 10", "POS 11", "POS 14", "POS 15", "POS 16",
    "POS 17", "POS 19", "POS 21", "POS 24", "POS 25", "POS 37", "POS 38",
    "POS 42", "POS 44", "POS 45",
  ];

  useEffect(() => {
    const saved = JSON.parse(localStorage.getItem("ohc_reports") || "[]");
    setReports(saved);
  }, []);

  // تحويل التواريخ وحساب الأيام المتبقية (مثل ما هو موجود)

  const convertToISODate = (dateStr) => {
    if (!dateStr) return null;
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return dateStr;
    const parts = dateStr.split("/");
    if (parts.length !== 3) return null;
    const [dd, mm, yyyy] = parts;
    if (dd.length !== 2 || mm.length !== 2 || yyyy.length !== 4) return null;
    return `${yyyy}-${mm}-${dd}`;
  };

  const parseDate = (dateStr) => {
    const isoStr = convertToISODate(dateStr);
    if (!isoStr) return null;
    const d = new Date(isoStr);
    return isNaN(d) ? null : d;
  };

  const getDaysUntilExpiry = (dateStr) => {
    const today = new Date();
    const expiry = parseDate(dateStr);
    if (!expiry) return null;
    const diffTime = expiry.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays >= 0 ? diffDays : 0;
  };

  // دالة حذف التقرير
  const handleDelete = (index) => {
    const updated = reports.filter((_, i) => i !== index);
    setReports(updated);
    localStorage.setItem("ohc_reports", JSON.stringify(updated));
    if (editingIndex === index) setEditingIndex(null);
  };

  const handleEditClick = (index) => {
    setEditingIndex(index);
    setEditFormData(reports[index]);
  };

  const handleEditChange = (field, value) => {
    setEditFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleEditSave = () => {
    const updated = [...reports];
    updated[editingIndex] = editFormData;
    setReports(updated);
    localStorage.setItem("ohc_reports", JSON.stringify(updated));
    setEditingIndex(null);
  };

  const handleCancelEdit = () => setEditingIndex(null);

  // دالة تصدير التقارير JSON
  const handleExport = () => {
    const dataStr = JSON.stringify(reports, null, 2);
    const blob = new Blob([dataStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = "ohc_reports_backup.json";
    a.click();
    URL.revokeObjectURL(url);
  };

  // دالة استيراد التقارير JSON
  const handleImport = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const importedData = JSON.parse(event.target.result);
        if (!Array.isArray(importedData)) {
          alert("ملف غير صالح: يجب أن يحتوي على مصفوفة تقارير.");
          return;
        }
        // دمج مع التقارير الحالية
        const mergedReports = [...reports, ...importedData];
        setReports(mergedReports);
        localStorage.setItem("ohc_reports", JSON.stringify(mergedReports));
        alert("تم استيراد التقارير بنجاح.");
      } catch {
        alert("فشل في قراءة الملف أو تنسيقه غير صالح.");
      }
    };
    reader.readAsText(file);
    e.target.value = ""; // للسماح بإعادة تحميل نفس الملف لاحقاً
  };

  const filteredReports = reports.filter(report => {
    const daysLeft = getDaysUntilExpiry(report.expiryDate);

    if (filter === "soon" && !(daysLeft > 0 && daysLeft <= 30)) return false;
    if (filter === "expired" && daysLeft !== 0) return false;
    if (branchFilter !== "all" && report.branch !== branchFilter) return false;
    return true;
  });

  return (
    <div style={{ padding: 32, background: "#fff", borderRadius: 12, direction: "rtl", fontFamily: "Cairo, sans-serif" }}>
      <h2 style={{ marginBottom: 16, color: "#2c3e50", fontWeight: "bold" }}>📋 تقارير الفحص الطبي - OHC</h2>

      {/* أزرار التصدير والاستيراد */}
      <div style={{ marginBottom: 16 }}>
        <button
          onClick={handleExport}
          style={{ marginRight: 12, padding: "8px 16px", backgroundColor: "#2980b9", color: "white", border: "none", borderRadius: 6, cursor: "pointer" }}
        >
          ⬇️ تصدير التقارير (JSON)
        </button>
        <button
          onClick={() => fileInputRef.current.click()}
          style={{ padding: "8px 16px", backgroundColor: "#27ae60", color: "white", border: "none", borderRadius: 6, cursor: "pointer" }}
        >
          ⬆️ استيراد التقارير (JSON)
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="application/json"
          onChange={handleImport}
          style={{ display: "none" }}
        />
      </div>

      {/* الفلاتر */}
      <div style={{ marginBottom: 16, display: "flex", gap: 16, alignItems: "center" }}>
        <label htmlFor="filterSelect" style={{ fontWeight: "bold" }}>تصفية:</label>
        <select
          id="filterSelect"
          value={filter}
          onChange={e => setFilter(e.target.value)}
          style={{ padding: "6px 12px", borderRadius: 6, border: "1px solid #ccc", cursor: "pointer", fontSize: 16 }}
        >
          <option value="all">كل التقارير</option>
          <option value="soon">انتهاء صلاحية قريب</option>
          <option value="expired">منتهية الصلاحية</option>
        </select>

        <label htmlFor="branchFilter" style={{ fontWeight: "bold" }}>فرع:</label>
        <select
          id="branchFilter"
          value={branchFilter}
          onChange={e => setBranchFilter(e.target.value)}
          style={{ padding: "6px 12px", borderRadius: 6, border: "1px solid #ccc", cursor: "pointer", fontSize: 16 }}
        >
          <option value="all">كل الفروع</option>
          {branches.map(branch => <option key={branch} value={branch}>{branch}</option>)}
        </select>
      </div>

      {/* تحرير التقرير */}
      {editingIndex !== null && (
        <div style={{ marginBottom: 32, padding: 16, border: "1px solid #ddd", borderRadius: 8, backgroundColor: "#f9f9f9" }}>
          <h3>تعديل التقرير رقم {editingIndex + 1}</h3>
          {Object.entries(editFormData).map(([key, value]) => {
            if (key === "result") {
              return (
                <div key={key} style={{ marginBottom: 16 }}>
                  <label style={{ fontWeight: "bold" }}>نتيجة الفحص:</label>
                  <select
                    value={value}
                    onChange={e => handleEditChange(key, e.target.value)}
                    style={{ width: "100%", padding: 8, borderRadius: 6, border: "1px solid #ccc" }}
                  >
                    <option value="">-- اختر النتيجة --</option>
                    <option value="سليم">سليم</option>
                  </select>
                </div>
              );
            }
            if (key === "issueDate" || key === "expiryDate") {
              return (
                <div key={key} style={{ marginBottom: 16 }}>
                  <label style={{ fontWeight: "bold" }}>{key === "issueDate" ? "تاريخ الإصدار" : "تاريخ الانتهاء"}:</label>
                  <input
                    type="date"
                    value={value}
                    onChange={e => handleEditChange(key, e.target.value)}
                    style={{ width: "100%", padding: 8, borderRadius: 6, border: "1px solid #ccc" }}
                  />
                </div>
              );
            }
            if (key === "branch") {
              return (
                <div key={key} style={{ marginBottom: 16 }}>
                  <label style={{ fontWeight: "bold" }}>الفرع:</label>
                  <select
                    value={value}
                    onChange={e => handleEditChange(key, e.target.value)}
                    style={{ width: "100%", padding: 8, borderRadius: 6, border: "1px solid #ccc" }}
                  >
                    <option value="">-- اختر الفرع --</option>
                    {branches.map(branch => <option key={branch} value={branch}>{branch}</option>)}
                  </select>
                </div>
              );
            }
            return (
              <div key={key} style={{ marginBottom: 16 }}>
                <label style={{ fontWeight: "bold" }}>
                  {key === "name" ? "الاسم" :
                   key === "nationality" ? "الجنسية" :
                   key === "job" ? "المهنة الحالية" :
                   key}:
                </label>
                <input
                  type="text"
                  value={value}
                  onChange={e => handleEditChange(key, e.target.value)}
                  style={{ width: "100%", padding: 8, borderRadius: 6, border: "1px solid #ccc" }}
                />
              </div>
            );
          })}
          <button
            onClick={handleEditSave}
            style={{ marginRight: 16, padding: "8px 16px", backgroundColor: "#27ae60", color: "white", border: "none", borderRadius: 6, cursor: "pointer" }}
          >
            حفظ
          </button>
          <button
            onClick={handleCancelEdit}
            style={{ padding: "8px 16px", backgroundColor: "#7f8c8d", color: "white", border: "none", borderRadius: 6, cursor: "pointer" }}
          >
            إلغاء
          </button>
        </div>
      )}

      {/* الجدول */}
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 16 }}>
        <thead style={{ background: "#ecf0f1" }}>
          <tr>
            <th style={{ padding: 10, border: "1px solid #ddd" }}>#</th>
            <th style={{ padding: 10, border: "1px solid #ddd" }}>الاسم</th>
            <th style={{ padding: 10, border: "1px solid #ddd" }}>الجنسية</th>
            <th style={{ padding: 10, border: "1px solid #ddd" }}>المهنة الحالية</th>
            <th style={{ padding: 10, border: "1px solid #ddd" }}>الفرع</th>
            <th style={{ padding: 10, border: "1px solid #ddd" }}>تاريخ الإصدار</th>
            <th style={{ padding: 10, border: "1px solid #ddd", color: "red" }}>تاريخ الانتهاء</th>
            <th style={{ padding: 10, border: "1px solid #ddd" }}>نتيجة الفحص</th>
            <th style={{ padding: 10, border: "1px solid #ddd" }}>الأيام المتبقية</th>
            <th style={{ padding: 10, border: "1px solid #ddd" }}>الحالة</th>
            <th style={{ padding: 10, border: "1px solid #ddd" }}>إجراءات</th>
            <th style={{ padding: 10, border: "1px solid #ddd" }}>تعديل</th>
          </tr>
        </thead>
        <tbody>
          {filteredReports.length === 0 ? (
            <tr>
              <td colSpan="12" style={{ textAlign: "center", padding: 16, fontSize: 18 }}>
                لا توجد تقارير تطابق الفلتر المحدد.
              </td>
            </tr>
          ) : (
            filteredReports.map((report, index) => {
              const daysLeft = getDaysUntilExpiry(report.expiryDate);
              const isSoon = daysLeft > 0 && daysLeft <= 30;
              const isExpired = daysLeft === 0;

              return (
                <tr key={index} style={{ textAlign: "center", borderBottom: "1px solid #ccc", backgroundColor: isSoon ? "#ffe6e6" : "transparent" }}>
                  <td style={{ padding: 8, border: "1px solid #ddd" }}>{index + 1}</td>
                  <td style={{ padding: 8, border: "1px solid #ddd" }}>{report.name}</td>
                  <td style={{ padding: 8, border: "1px solid #ddd" }}>{report.nationality}</td>
                  <td style={{ padding: 8, border: "1px solid #ddd" }}>{report.job}</td>
                  <td style={{ padding: 8, border: "1px solid #ddd" }}>{report.branch || "-"}</td>
                  <td style={{ padding: 8, border: "1px solid #ddd" }}>{report.issueDate}</td>
                  <td style={{ padding: 8, border: "1px solid #ddd", color: isSoon || isExpired ? "#e74c3c" : "black", fontWeight: isSoon || isExpired ? "bold" : "normal" }}>
                    {report.expiryDate}
                  </td>
                  <td style={{ padding: 8, border: "1px solid #ddd" }}>{report.result}</td>
                  <td style={{ padding: 8, border: "1px solid #ddd" }}>{daysLeft !== null ? `${daysLeft} يوم` : "-"}</td>
                  <td style={{ padding: 8, border: "1px solid #ddd", color: isExpired ? "#c0392b" : "#d35400", fontWeight: "bold" }}>
                    {isExpired ? "منتهي الصلاحية" : isSoon ? "انتهاء صلاحية قريب" : "-"}
                  </td>
                  <td style={{ padding: 8, border: "1px solid #ddd" }}>
                    <button
                      onClick={() => {
                        if (window.confirm(`هل أنت متأكد من حذف التقرير رقم ${index + 1}؟`)) handleDelete(index);
                      }}
                      style={{ padding: "6px 12px", backgroundColor: "#c0392b", color: "white", border: "none", borderRadius: 6, cursor: "pointer", fontSize: 14 }}
                    >
                      حذف
                    </button>
                  </td>
                  <td style={{ padding: 8, border: "1px solid #ddd" }}>
                    <button
                      onClick={() => handleEditClick(index)}
                      style={{ padding: "6px 12px", backgroundColor: "#2980b9", color: "white", border: "none", borderRadius: 6, cursor: "pointer", fontSize: 14 }}
                    >
                      تعديل
                    </button>
                  </td>
                </tr>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );
}
