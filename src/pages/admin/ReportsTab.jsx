import React, { useEffect, useState } from "react";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";

export default function ReportsTab() {
  const [reports, setReports] = useState([]);
  const [filterType, setFilterType] = useState("الكل");
  const [searchTerm, setSearchTerm] = useState("");
  const [visitDate, setVisitDate] = useState("");
  const [saveDate, setSaveDate] = useState("");
  const [openedReportIndex, setOpenedReportIndex] = useState(null);

  useEffect(() => {
    let savedReports;
    try {
      savedReports = JSON.parse(localStorage.getItem("reports")) || [];
    } catch {
      savedReports = [];
    }
    savedReports.sort((a, b) => new Date(b.date) - new Date(a.date)); // ترتيب تنازلي
    setReports(savedReports);
  }, []);

  const handleDeleteReport = (index) => {
    if (window.confirm("❗ هل أنت متأكد من حذف هذا التقرير؟")) {
      const updated = reports.filter((_, i) => i !== index);
      localStorage.setItem("reports", JSON.stringify(updated));
      setReports(updated);
    }
  };

  const exportToExcel = () => {
    const wsData = [
      ["التاريخ", "النوع", "الفرع", "النسبة"],
      ...reports.map((r) => [r.date, r.type, r.branchName, r.percentage + "%"]),
    ];
    const ws = XLSX.utils.aoa_to_sheet(wsData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Reports");
    XLSX.writeFile(wb, "inspection_reports.xlsx");
  };

  const exportToPDF = () => {
    html2canvas(document.querySelector("#report-list")).then((canvas) => {
      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF();
      const imgProps = pdf.getImageProperties(imgData);
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
      pdf.addImage(imgData, "PNG", 0, 0, pdfWidth, pdfHeight);
      pdf.save("inspection_reports.pdf");
    });
  };

  const filteredReports = reports.filter((r) => {
    const matchType = filterType === "الكل" || r.type === filterType;
    const matchSearch = r.branchName?.includes(searchTerm) || r.type?.includes(searchTerm);
    const matchVisitDate = !visitDate || r.visitDate === visitDate;
    const matchSaveDate = !saveDate || r.date.startsWith(saveDate);
    return matchType && matchSearch && matchVisitDate && matchSaveDate;
  });

  const totalReports = filteredReports.length;
  const avgPercentage = totalReports > 0
    ? (filteredReports.reduce((acc, r) => acc + (parseFloat(r.percentage) || 0), 0) / totalReports).toFixed(1)
    : 0;

  return (
    <div style={cardStyle}>
      <div style={{ marginBottom: "1rem" }}>
        🔍 نوع التفتيش:
        <select value={filterType} onChange={(e) => setFilterType(e.target.value)} style={inputStyle}>
          <option value="الكل">الكل</option>
          <option value="ISO 22000">ISO 22000</option>
          <option value="HACCP">HACCP</option>
          <option value="حلال">حلال</option>
          <option value="التفتيش الداخلي">التفتيش الداخلي</option>
        </select>

        🔎 بحث:
        <input type="text" placeholder="بحث بالفرع أو النوع" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} style={inputStyle} />

        📆 تاريخ الزيارة:
        <input type="date" value={visitDate} onChange={(e) => setVisitDate(e.target.value)} style={inputStyle} />

        📅 تاريخ الحفظ:
        <input type="date" value={saveDate} onChange={(e) => setSaveDate(e.target.value)} style={inputStyle} />

        <button onClick={exportToExcel} style={exportButtonStyle}>📥 Excel</button>
        <button onClick={exportToPDF} style={exportButtonStyle}>🖨️ PDF</button>
      </div>

      <div style={{ marginBottom: "1rem" }}>
        📊 عدد التقارير: {totalReports} | متوسط النسبة: {avgPercentage}%
      </div>

      <div id="report-list">
        {filteredReports.length === 0 ? (
          <p>لا توجد تقارير حالياً.</p>
        ) : (
          filteredReports.map((report, idx) => (
            <div
              key={idx}
              onClick={() => setOpenedReportIndex(openedReportIndex === idx ? null : idx)}
              style={{
                ...reportBoxStyle,
                backgroundColor: openedReportIndex === idx ? "#e8f5e9" : "#fff",
              }}
            >
              <h3>📁 {report.branchName || "فرع غير معروف"}</h3>
              <p>📅 تاريخ الحفظ: {new Date(report.date).toLocaleDateString("ar-EG")}</p>
              <p>📆 تاريخ الزيارة: {report.visitDate || "غير مسجل"}</p>
              <p>👨‍💼 مشرف: {report.supervisorName || "غير مذكور"}</p>
              <p>📌 نوع: {report.type}</p>
              <p>📈 نسبة: {report.percentage}%</p>
              <p>🧾 تقييم: <strong>{report.finalRating || "غير متاح"}</strong></p>

              {openedReportIndex === idx && (
                <>
                  <hr />
                  {Object.entries(report.answers || {}).length === 0 ? (
                    <p>📭 لا توجد أسئلة.</p>
                  ) : (
                    Object.entries(report.answers).map(([questionText, value]) => (
                      <div key={questionText} style={{ marginBottom: "1.5rem" }}>
                        <p><strong>السؤال:</strong> {questionText}</p>
                        <p><strong>الإجابة:</strong> {value === "yes" ? "نعم" : "لا"}</p>
                        {/* هنا قمنا بتعديل الوصول لمستوى الخطورة */}
                        {value === "no" && report.risks?.[questionText] && (
                          <p style={{ color: "red" }}>
                            <strong>الخطورة:</strong> {report.risks[questionText]}
                          </p>
                        )}
                        {report.comments?.[questionText] && (
                          <p><strong>📝 تعليق:</strong> {report.comments[questionText]}</p>
                        )}
                        {report.images?.[questionText] && (
                          <a href={report.images[questionText]} target="_blank" rel="noreferrer">
                            <img
                              src={report.images[questionText]}
                              alt="مرفق"
                              style={{ width: "200px", borderRadius: "8px", marginTop: "10px" }}
                            />
                          </a>
                        )}
                      </div>
                    ))
                  )}

                  {report.finalComment && (
                    <div style={{ backgroundColor: "#fef9e7", padding: "1rem", borderRadius: "8px", marginTop: "1rem" }}>
                      <strong>🗨️ تعليق:</strong>
                      <p>{report.finalComment}</p>
                    </div>
                  )}

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteReport(idx);
                    }}
                    style={deleteButtonStyle}
                  >
                    🗑️ حذف
                  </button>
                </>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}

// أنماط CSS داخلية
const cardStyle = {
  backgroundColor: "#fff",
  padding: "2rem",
  borderRadius: "12px",
  boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
};

const reportBoxStyle = {
  border: "1px solid #ccc",
  borderRadius: "10px",
  padding: "1rem",
  marginBottom: "1rem",
  cursor: "pointer",
};

const inputStyle = {
  padding: "0.5rem",
  borderRadius: "6px",
  margin: "0 0.5rem",
};

const deleteButtonStyle = {
  background: "#e74c3c",
  color: "white",
  border: "none",
  padding: "6px 12px",
  borderRadius: "6px",
  cursor: "pointer",
};

const exportButtonStyle = {
  backgroundColor: "#8e44ad",
  color: "white",
  border: "none",
  padding: "6px 12px",
  borderRadius: "6px",
  cursor: "pointer",
  marginInline: "0.5rem",
};
