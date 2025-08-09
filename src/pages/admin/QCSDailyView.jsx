import React, { useEffect, useState, useRef } from "react";

// === أوقات درجات الحرارة: كل ساعتين من 4AM إلى 8PM ===
const COOLER_TIMES = [
  "4:00 AM", "6:00 AM", "8:00 AM", "10:00 AM", "12:00 PM",
  "2:00 PM", "4:00 PM", "6:00 PM", "8:00 PM"
];

// === KPI Component لدرجات حرارة البرادات (0-5) ===
function CoolersKPI({ coolers }) {
  let allTemps = [];
  let outOfRange = 0;
  coolers.forEach(cooler => {
    COOLER_TIMES.forEach(time => {
      const v = cooler.temps[time];
      const t = Number(v);
      if (v !== "" && !isNaN(t)) {
        allTemps.push(t);
        if (t < 0 || t > 5) outOfRange += 1;
      }
    });
  });
  const avg = allTemps.length
    ? (allTemps.reduce((a, b) => a + b, 0) / allTemps.length).toFixed(2)
    : "—";
  const min = allTemps.length ? Math.min(...allTemps) : "—";
  const max = allTemps.length ? Math.max(...allTemps) : "—";
  return (
    <div style={{
      display: "flex", gap: "1.2rem", margin: "10px 0 25px 0",
      justifyContent: "flex-start", flexWrap: "wrap"
    }}>
      <div style={{
        background: "#fff", borderRadius: 8, padding: "9px 26px",
        fontWeight: "bold", color: "#512e5f", boxShadow: "0 2px 10px #e8daef33"
      }}>
        المتوسط:{" "}
        <span style={{ color: avg < 0 || avg > 5 ? "#c0392b" : "#229954", fontWeight: "bolder" }}>
          {avg}°C
        </span>
      </div>
      <div style={{
        background: "#fff", borderRadius: 8, padding: "9px 26px",
        fontWeight: "bold", color: "#c0392b", boxShadow: "0 2px 10px #fdecea"
      }}>
        خارج النطاق: <span style={{ fontWeight: "bolder" }}>{outOfRange}</span>
      </div>
      <div style={{
        background: "#fff", borderRadius: 8, padding: "9px 22px",
        fontWeight: "bold", color: "#884ea0", boxShadow: "0 2px 10px #f5eef8"
      }}>
        أقل / أعلى: <span style={{ color: "#2471a3" }}>{min}</span>
        <span style={{ color: "#999" }}> / </span>
        <span style={{ color: "#c0392b" }}>{max}</span>
        <span style={{ color: "#884ea0", fontWeight: "normal" }}>°C</span>
      </div>
    </div>
  );
}

// لون الخانة حسب القيمة (0-5)
function getTempCellStyle(temp) {
  const t = Number(temp);
  if (temp === "" || isNaN(t)) return { background: "#d6eaf8", color: "#2980b9" };
  if (t < 0 || t > 5) return { background: "#fdecea", color: "#c0392b", fontWeight: 700 };
  if (t >= 3) return { background: "#eaf6fb", color: "#2471a3", fontWeight: 600 };
  return { background: "#d6eaf8", color: "#2980b9" };
}

export default function QCSDailyView() {
  const [reports, setReports] = useState([]);
  const [selectedDate, setSelectedDate] = useState(null);
  const [activeTab, setActiveTab] = useState("coolers");
  const fileInputRef = useRef(null);

  useEffect(() => {
    const saved = JSON.parse(localStorage.getItem("qcs_reports") || "[]");
    setReports(saved);
    if (saved.length > 0) setSelectedDate(saved[0].date);
  }, []);

  const selectedReport = reports.find((r) => r.date === selectedDate);

  const handleDeleteReport = (dateToDelete) => {
    if (window.confirm(`هل أنت متأكد من حذف التقرير الخاص بتاريخ ${dateToDelete}؟`)) {
      const filteredReports = reports.filter(r => r.date !== dateToDelete);
      setReports(filteredReports);
      localStorage.setItem("qcs_reports", JSON.stringify(filteredReports));
      if (selectedDate === dateToDelete) {
        setSelectedDate(filteredReports.length > 0 ? filteredReports[0].date : null);
      }
    }
  };

  const handleExport = () => {
    const dataStr = JSON.stringify(reports, null, 2);
    const blob = new Blob([dataStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "qcs_reports_backup.json";
    a.click();
    URL.revokeObjectURL(url);
  };

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
        const mergedReports = [...reports, ...importedData];
        setReports(mergedReports);
        localStorage.setItem("qcs_reports", JSON.stringify(mergedReports));
        alert("تم استيراد التقارير بنجاح.");
      } catch {
        alert("فشل في قراءة الملف أو تنسيقه غير صالح.");
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  // أنماط الجدول للنظافة الشخصية ولجداول أخرى
  const thStyle = {
    padding: "8px",
    borderBottom: "2px solid #2980b9",
  };
  const tdStyle = {
    padding: "8px",
    borderBottom: "1px solid #ccc",
  };

  if (!selectedReport) {
    return (
      <div style={{ padding: "1rem", fontFamily: "Cairo, sans-serif", textAlign: "center" }}>
        <p>❗ لم يتم اختيار أي تقرير.</p>
      </div>
    );
  }

  return (
    <div style={{
      display: "flex",
      gap: "1rem",
      fontFamily: "Cairo, sans-serif",
      padding: "1rem"
    }}>
      {/* الشريط اليمين - قائمة التقارير */}
      <div style={{ flex: "0 0 250px", borderRight: "1px solid #ccc", paddingRight: "1rem" }}>
        <h3>📋 قائمة التقارير</h3>
        <ul style={{ listStyle: "none", padding: 0 }}>
          {reports.map((report) => (
            <li
              key={report.date}
              style={{
                marginBottom: "0.5rem",
                backgroundColor: selectedDate === report.date ? "#2980b9" : "#f0f0f0",
                color: selectedDate === report.date ? "white" : "black",
                borderRadius: "6px",
                padding: "8px",
                cursor: "pointer",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                fontWeight: selectedDate === report.date ? "bold" : "normal",
              }}
              onClick={() => setSelectedDate(report.date)}
            >
              <span>{report.date}</span>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleDeleteReport(report.date);
                }}
                style={{
                  backgroundColor: "#c0392b",
                  color: "white",
                  border: "none",
                  borderRadius: "4px",
                  padding: "4px 8px",
                  cursor: "pointer",
                  marginLeft: "6px",
                }}
                title="حذف التقرير"
              >
                حذف
              </button>
            </li>
          ))}
        </ul>

        {/* أزرار التصدير والاستيراد */}
        <div style={{ marginTop: "1.5rem", textAlign: "center" }}>
          <button
            onClick={handleExport}
            style={{
              marginBottom: "8px",
              padding: "8px 16px",
              backgroundColor: "#2980b9",
              color: "white",
              border: "none",
              borderRadius: "6px",
              cursor: "pointer",
              width: "100%",
              fontWeight: "bold",
            }}
          >
            ⬇️ تصدير التقارير
          </button>
          <button
            onClick={() => fileInputRef.current.click()}
            style={{
              padding: "8px 16px",
              backgroundColor: "#27ae60",
              color: "white",
              border: "none",
              borderRadius: "6px",
              cursor: "pointer",
              width: "100%",
              fontWeight: "bold",
            }}
          >
            ⬆️ استيراد التقارير
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="application/json"
            onChange={handleImport}
            style={{ display: "none" }}
          />
        </div>
      </div>

      {/* الطرف اليسار - التبويبات والمحتوى */}
      <div style={{ flex: 1, minWidth: 320, maxHeight: "calc(100vh - 3rem)", overflowY: "auto", paddingRight: "1rem" }}>

        {/* تبويبات */}
        <nav style={{ display: "flex", gap: "10px", marginBottom: "1.2rem" }}>
          {[
            { id: "coolers", label: "🧊 درجات حرارة البرادات" },
            { id: "personalHygiene", label: "🧼 النظافة الشخصية" },
            { id: "dailyCleanliness", label: "🧹 النظافة اليومية" },
            { id: "vehicleReport", label: "🚚 تقارير السيارات" },
          ].map(({ id, label }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              style={{
                padding: "9px 16px",
                borderRadius: "6px",
                border: activeTab === id ? "2px solid #2980b9" : "1px solid #ccc",
                backgroundColor: activeTab === id ? "#d6eaf8" : "#fff",
                cursor: "pointer",
                flex: 1,
                fontWeight: activeTab === id ? "bold" : "normal",
                fontSize: "1.09em"
              }}
            >
              {label}
            </button>
          ))}
        </nav>

        {/* محتوى التبويب */}
        {activeTab === "coolers" && (
          <>
            <h4 style={{ color: "#2980b9", margin: "0 0 10px 0" }}>🧊 درجات حرارة البرادات</h4>
            {/* KPIs bar */}
            <CoolersKPI coolers={selectedReport.coolers} />
            {selectedReport.coolers.map((cooler, i) => (
              <div
                key={i}
                style={{
                  marginBottom: "1.2rem",
                  background: i % 2 === 0 ? "#ecf6fc" : "#f8f3fa",
                  padding: "1.1rem 0.7rem",
                  borderRadius: "10px",
                  display: "flex",
                  alignItems: "center",
                  gap: "1rem",
                  boxShadow: "0 0 6px #d6eaf8aa",
                }}
              >
                <strong style={{ minWidth: "80px", color: "#34495e", fontWeight: "bold" }}>
                  براد {i + 1}:
                </strong>
                <div style={{ display: "flex", gap: "0.7rem", flexWrap: "wrap" }}>
                  {COOLER_TIMES.map((time) => (
                    <div
                      key={time}
                      style={{
                        minWidth: "62px",
                        padding: "7px 7px",
                        borderRadius: "8px",
                        textAlign: "center",
                        fontWeight: "600",
                        fontSize: ".99em",
                        boxShadow: "0 0 4px #d6eaf8",
                        ...getTempCellStyle(cooler.temps[time])
                      }}
                      title={`${time} — ${cooler.temps[time]}°C`}
                    >
                      <div style={{ fontSize: "0.85rem", marginBottom: "2px", color: "#512e5f", fontWeight: 600 }}>
                        {time}
                      </div>
                      <div>{cooler.temps[time] !== "" ? `${cooler.temps[time]}°C` : "-"}</div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </>
        )}

        {activeTab === "personalHygiene" && (
          <>
            <h4>🧼 النظافة الشخصية للموظفين</h4>
            {selectedReport.personalHygiene && selectedReport.personalHygiene.length > 0 ? (
              <table
                style={{
                  width: "100%",
                  borderCollapse: "collapse",
                  textAlign: "center",
                }}
              >
                <thead>
                  <tr style={{ backgroundColor: "#d6eaf8" }}>
                    <th style={thStyle}>#</th>
                    <th style={thStyle}>اسم الموظف</th>
                    <th style={thStyle}>الأظافر</th>
                    <th style={thStyle}>الشعر</th>
                    <th style={thStyle}>عدم ارتداء الحُلي</th>
                    <th style={thStyle}>ارتداء الملابس النظيفة</th>
                    <th style={thStyle}>الأمراض المعدية</th>
                    <th style={thStyle}>الجروح المفتوحة</th>
                    <th style={thStyle}>ملاحظات</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedReport.personalHygiene.map((emp, i) => (
                    <tr key={i} style={{ borderBottom: "1px solid #ccc" }}>
                      <td style={tdStyle}>{i + 1}</td>
                      <td style={tdStyle}>{emp.employName || "-"}</td>
                      <td style={tdStyle}>{emp.nails || "-"}</td>
                      <td style={tdStyle}>{emp.hair || "-"}</td>
                      <td style={tdStyle}>{emp.notWearingJewelries || "-"}</td>
                      <td style={tdStyle}>{emp.wearingCleanCloth || "-"}</td>
                      <td style={tdStyle}>{emp.communicableDisease || "-"}</td>
                      <td style={tdStyle}>{emp.openWounds || "-"}</td>
                      <td style={tdStyle}>{emp.remarks || "-"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <p>لا توجد بيانات للنظافة الشخصية</p>
            )}
          </>
        )}

        {activeTab === "dailyCleanliness" && (
          <>
            <h4>🧹 النظافة اليومية للمستودع</h4>
            {selectedReport.cleanlinessRows && selectedReport.cleanlinessRows.length > 0 ? (
              <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "center" }}>
                <thead>
                  <tr style={{ backgroundColor: "#d6eaf8" }}>
                    <th style={thStyle}>SI-No</th>
                    <th style={thStyle}>المجموعة<br /><span style={{ color: "#555", fontWeight: 400 }}>Group</span></th>
                    <th style={thStyle}>البند<br /><span style={{ color: "#555", fontWeight: 400 }}>Item</span></th>
                    <th style={thStyle}>C / NC</th>
                    <th style={thStyle}>ملاحظة<br /><span style={{ color: "#555", fontWeight: 400 }}>Observation</span></th>
                    <th style={thStyle}>تم الإبلاغ لـ<br /><span style={{ color: "#555", fontWeight: 400 }}>Informed to</span></th>
                    <th style={thStyle}>ملاحظات/إجراء تصحيحي<br /><span style={{ color: "#555", fontWeight: 400 }}>Remarks/CA</span></th>
                  </tr>
                </thead>
                <tbody>
                  {selectedReport.cleanlinessRows.map((row, i) => (
                    <tr key={i} style={{ borderBottom: "1px solid #eee" }}>
                      <td style={tdStyle}>{row.siNo}</td>
                      <td style={tdStyle}>
                        <b>{row.groupAr}</b>
                        <br />
                        <span style={{ color: "#777", fontSize: "0.95em" }}>{row.groupEn}</span>
                      </td>
                      <td style={tdStyle}>
                        {row.itemAr || "-"}
                        <br />
                        <span style={{ color: "#777", fontSize: "0.95em" }}>{row.itemEn || ""}</span>
                      </td>
                      <td style={tdStyle}>{row.result || "-"}</td>
                      <td style={tdStyle}>{row.observation || "-"}</td>
                      <td style={tdStyle}>{row.informed || "-"}</td>
                      <td style={tdStyle}>{row.remarks || "-"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <p>لا توجد بيانات للنظافة اليومية</p>
            )}
          </>
        )}

        {activeTab === "vehicleReport" && (
          <>
            <h4>🚚 تقارير السيارات</h4>
            {selectedReport.vehicleReport && selectedReport.vehicleReport.length > 0 ? (
              selectedReport.vehicleReport.map((vehicle, i) => (
                <div
                  key={i}
                  style={{
                    marginBottom: "1rem",
                    background: "#fef9e7",
                    padding: "1rem",
                    borderRadius: "8px",
                  }}
                >
                  <p>⏱️ وقت التحميل: {vehicle.startTime}</p>
                  <p>⏱️ الانتهاء: {vehicle.endTime}</p>
                  <p>🌡️ درجة الحرارة: {vehicle.temperature}°</p>
                  <p>🧼 نظافة: {vehicle.cleanliness ? "✅ نظيفة" : "❌ غير نظيفة"}</p>
                  <p>🚗 رقم اللوحة: {vehicle.plateNumber}</p>
                  <p>👨‍✈️ اسم السائق: {vehicle.driverName}</p>
                </div>
              ))
            ) : (
              <p>لا توجد بيانات للسيارات</p>
            )}
          </>
        )}
      </div>
    </div>
  );
}
