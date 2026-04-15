import React, { useEffect, useState } from "react";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import Button from "../../components/Button";
import EmptyState from "../../components/EmptyState";

export default function ReportsTab() {
  const [reports, setReports]               = useState([]);
  const [filterType, setFilterType]         = useState("الكل");
  const [searchTerm, setSearchTerm]         = useState("");
  const [visitDate, setVisitDate]           = useState("");
  const [saveDate, setSaveDate]             = useState("");
  const [openedReportIndex, setOpenedReportIndex] = useState(null);

  useEffect(() => {
    let saved;
    try { saved = JSON.parse(localStorage.getItem("reports")) || []; }
    catch { saved = []; }
    saved.sort((a, b) => new Date(b.date) - new Date(a.date));
    setReports(saved);
  }, []);

  const handleDeleteReport = (index) => {
    if (!window.confirm("❗ هل أنت متأكد من حذف هذا التقرير؟")) return;
    const updated = reports.filter((_, i) => i !== index);
    localStorage.setItem("reports", JSON.stringify(updated));
    setReports(updated);
  };

  const exportToExcel = () => {
    const wsData = [
      ["التاريخ", "النوع", "الفرع", "النسبة"],
      ...reports.map(r => [r.date, r.type, r.branchName, r.percentage + "%"]),
    ];
    const ws = XLSX.utils.aoa_to_sheet(wsData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Reports");
    XLSX.writeFile(wb, "inspection_reports.xlsx");
  };

  const exportToPDF = () => {
    html2canvas(document.querySelector("#report-list")).then(canvas => {
      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF();
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
      pdf.addImage(imgData, "PNG", 0, 0, pdfWidth, pdfHeight);
      pdf.save("inspection_reports.pdf");
    });
  };

  const filteredReports = reports.filter(r => {
    const matchType      = filterType === "الكل" || r.type === filterType;
    const matchSearch    = r.branchName?.includes(searchTerm) || r.type?.includes(searchTerm);
    const matchVisitDate = !visitDate || r.visitDate === visitDate;
    const matchSaveDate  = !saveDate  || r.date?.startsWith(saveDate);
    return matchType && matchSearch && matchVisitDate && matchSaveDate;
  });

  const totalReports  = filteredReports.length;
  const avgPercentage = totalReports > 0
    ? (filteredReports.reduce((acc, r) => acc + (parseFloat(r.percentage) || 0), 0) / totalReports).toFixed(1)
    : 0;

  const pct = parseFloat(avgPercentage);
  const pctColor = pct >= 80 ? "var(--color-success)" : pct >= 60 ? "var(--color-warning)" : "var(--color-danger)";

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>

      {/* ── فلاتر ── */}
      <div className="qms-card" style={{ padding: "var(--space-4)" }}>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "var(--space-3)", alignItems: "flex-end" }}>

          {/* نوع التفتيش */}
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <label style={labelStyle}>🔍 نوع التفتيش</label>
            <select value={filterType} onChange={e => setFilterType(e.target.value)} className="qms-input" style={{ width: 160 }}>
              <option value="الكل">الكل</option>
              <option value="ISO 22000">ISO 22000</option>
              <option value="HACCP">HACCP</option>
              <option value="حلال">حلال</option>
              <option value="التفتيش الداخلي">التفتيش الداخلي</option>
            </select>
          </div>

          {/* بحث */}
          <div style={{ display: "flex", flexDirection: "column", gap: 4, flex: 1, minWidth: 160 }}>
            <label style={labelStyle}>🔎 بحث</label>
            <input
              className="qms-input"
              type="text"
              placeholder="بحث بالفرع أو النوع..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
          </div>

          {/* تاريخ الزيارة */}
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <label style={labelStyle}>📆 تاريخ الزيارة</label>
            <input className="qms-input" type="date" value={visitDate} onChange={e => setVisitDate(e.target.value)} style={{ width: 160 }} />
          </div>

          {/* تاريخ الحفظ */}
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <label style={labelStyle}>📅 تاريخ الحفظ</label>
            <input className="qms-input" type="date" value={saveDate} onChange={e => setSaveDate(e.target.value)} style={{ width: 160 }} />
          </div>

          {/* تصدير */}
          <div style={{ display: "flex", gap: "var(--space-2)", alignSelf: "flex-end" }}>
            <Button variant="success" size="sm" onClick={exportToExcel}>📥 Excel</Button>
            <Button variant="primary" size="sm" onClick={exportToPDF}>🖨️ PDF</Button>
          </div>
        </div>
      </div>

      {/* ── إحصائيات ── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: "var(--space-3)" }}>
        <div className="qms-card qms-card-sm" style={{ textAlign: "center" }}>
          <div style={statLabel}>إجمالي التقارير</div>
          <div style={statVal}>{totalReports}</div>
        </div>
        <div className="qms-card qms-card-sm" style={{ textAlign: "center" }}>
          <div style={statLabel}>متوسط النسبة</div>
          <div style={{ ...statVal, color: pctColor }}>{avgPercentage}%</div>
        </div>
      </div>

      {/* ── قائمة التقارير ── */}
      <div id="report-list">
        {filteredReports.length === 0 ? (
          <EmptyState icon="📋" message="لا توجد تقارير" sub="جرّب تغيير الفلاتر أو أضف تقارير جديدة" />
        ) : (
          filteredReports.map((report, idx) => {
            const isOpen = openedReportIndex === idx;
            const pctNum = parseFloat(report.percentage) || 0;
            const badgeClass = pctNum >= 80 ? "qms-badge-success" : pctNum >= 60 ? "qms-badge-warning" : "qms-badge-danger";

            return (
              <div
                key={idx}
                className="qms-card"
                style={{
                  marginBottom: "var(--space-3)",
                  padding: "var(--space-4)",
                  cursor: "pointer",
                  border: isOpen ? "1.5px solid var(--color-primary)" : "1px solid var(--border-color)",
                  transition: "border-color var(--transition-base), box-shadow var(--transition-base)",
                  boxShadow: isOpen ? "var(--shadow-md)" : "var(--shadow-sm)",
                }}
                onClick={() => setOpenedReportIndex(isOpen ? null : idx)}
              >
                {/* هيدر البطاقة */}
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "var(--space-2)" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "var(--space-3)" }}>
                    <span style={{ fontSize: 22 }}>📁</span>
                    <div>
                      <div style={{ fontWeight: "var(--font-weight-bold)", fontSize: "var(--font-size-base)", color: "var(--text-primary)" }}>
                        {report.branchName || "فرع غير معروف"}
                      </div>
                      <div style={{ fontSize: "var(--font-size-xs)", color: "var(--text-muted)", marginTop: 2 }}>
                        📌 {report.type || "-"} &nbsp;·&nbsp; 👨‍💼 {report.supervisorName || "غير مذكور"}
                      </div>
                    </div>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)" }}>
                    <span className={`qms-badge ${badgeClass}`}>{report.percentage}%</span>
                    <span style={{ fontSize: "var(--font-size-xs)", color: "var(--text-muted)" }}>
                      {new Date(report.date).toLocaleDateString("ar-EG")}
                    </span>
                    <span style={{ color: "var(--text-muted)", fontSize: 14, transition: "transform var(--transition-base)", transform: isOpen ? "rotate(180deg)" : "rotate(0deg)" }}>▼</span>
                  </div>
                </div>

                {/* تفاصيل مفتوحة */}
                {isOpen && (
                  <div style={{ marginTop: "var(--space-4)" }} onClick={e => e.stopPropagation()}>
                    <hr style={{ borderColor: "var(--border-color)", marginBottom: "var(--space-4)" }} />

                    {/* معلومات إضافية */}
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "var(--space-3)", marginBottom: "var(--space-4)" }}>
                      {[
                        ["📆 تاريخ الزيارة", report.visitDate || "غير مسجل"],
                        ["📈 النسبة", `${report.percentage}%`],
                        ["🧾 التقييم", report.finalRating || "غير متاح"],
                      ].map(([label, val]) => (
                        <div key={label} style={{ background: "var(--bg-card-hover)", borderRadius: "var(--radius-md)", padding: "var(--space-3)" }}>
                          <div style={{ fontSize: "var(--font-size-xs)", color: "var(--text-muted)", fontWeight: 700, marginBottom: 4 }}>{label}</div>
                          <div style={{ fontSize: "var(--font-size-sm)", fontWeight: 600, color: "var(--text-primary)" }}>{val}</div>
                        </div>
                      ))}
                    </div>

                    {/* الأسئلة */}
                    {Object.entries(report.answers || {}).length === 0 ? (
                      <p style={{ color: "var(--text-muted)", fontSize: "var(--font-size-sm)" }}>📭 لا توجد أسئلة.</p>
                    ) : (
                      Object.entries(report.answers).map(([qText, value]) => (
                        <div key={qText} style={{
                          marginBottom: "var(--space-3)",
                          padding: "var(--space-3)",
                          borderRadius: "var(--radius-md)",
                          background: value === "no" ? "var(--color-danger-light)" : "var(--bg-card-hover)",
                          border: `1px solid ${value === "no" ? "#fca5a5" : "var(--border-color)"}`,
                        }}>
                          <div style={{ fontWeight: 600, fontSize: "var(--font-size-sm)", marginBottom: 6, color: "var(--text-primary)" }}>
                            {qText}
                          </div>
                          <span className={`qms-badge ${value === "yes" ? "qms-badge-success" : "qms-badge-danger"}`}>
                            {value === "yes" ? "✔ نعم" : "✘ لا"}
                          </span>
                          {value === "no" && report.risks?.[qText] && (
                            <span className="qms-badge qms-badge-warning" style={{ marginInlineStart: 6 }}>
                              خطر: {report.risks[qText]}
                            </span>
                          )}
                          {report.comments?.[qText] && (
                            <p style={{ marginTop: 6, fontSize: "var(--font-size-xs)", color: "var(--text-secondary)" }}>
                              💬 {report.comments[qText]}
                            </p>
                          )}
                          {report.images?.[qText] && (
                            <a href={report.images[qText]} target="_blank" rel="noreferrer">
                              <img src={report.images[qText]} alt="مرفق" style={{ width: 120, borderRadius: "var(--radius-md)", marginTop: 8, display: "block" }} />
                            </a>
                          )}
                        </div>
                      ))
                    )}

                    {report.finalComment && (
                      <div style={{ background: "var(--color-warning-light)", padding: "var(--space-3)", borderRadius: "var(--radius-md)", marginTop: "var(--space-3)", border: "1px solid #fcd34d" }}>
                        <strong>🗨️ التعليق النهائي:</strong>
                        <p style={{ margin: "4px 0 0", fontSize: "var(--font-size-sm)" }}>{report.finalComment}</p>
                      </div>
                    )}

                    <div style={{ marginTop: "var(--space-4)" }}>
                      <Button variant="danger" size="sm" onClick={() => handleDeleteReport(idx)}>
                        🗑️ حذف التقرير
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

const labelStyle = {
  fontSize: "var(--font-size-xs)",
  fontWeight: 700,
  color: "var(--text-secondary)",
  marginBottom: 2,
};

const statLabel = {
  fontSize: "var(--font-size-xs)",
  fontWeight: 700,
  color: "var(--text-muted)",
  textTransform: "uppercase",
  letterSpacing: ".08em",
  marginBottom: 6,
};

const statVal = {
  fontSize: 28,
  fontWeight: 900,
  color: "var(--text-primary)",
  lineHeight: 1,
};
