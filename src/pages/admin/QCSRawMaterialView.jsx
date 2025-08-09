import React, { useEffect, useState, useRef } from "react";

export default function QCSRawMaterialView() {
  const [searchTerm, setSearchTerm] = useState("");
  const [reports, setReports] = useState([]);
  const [selectedReportId, setSelectedReportId] = useState(null);
  const [openTypes, setOpenTypes] = useState({});
  const [showCertificate, setShowCertificate] = useState(false);
  const fileInputRef = useRef(null);

  // تحديث التقارير عند فتح الصفحة أو الرجوع لها أو عند تغيير البيانات في لوكال ستورج
  useEffect(() => {
    const updateReports = () => {
      const saved = JSON.parse(localStorage.getItem("qcs_raw_material_reports") || "[]");
      setReports(saved);
      if (saved.length) setSelectedReportId(saved[0].id);
    };

    updateReports();

    // حتى يحدث عند الرجوع للصفحة أو الفوكس
    window.addEventListener("focus", updateReports);

    // في حال تم تعديل لوكال ستورج من صفحة ثانية
    window.addEventListener("storage", updateReports);

    return () => {
      window.removeEventListener("focus", updateReports);
      window.removeEventListener("storage", updateReports);
    };
  }, []);

  const filteredReports = reports.filter(r =>
    r.generalInfo?.airwayBill?.toLowerCase().includes(searchTerm.toLowerCase())
  );
  const selectedReport = filteredReports.find(r => r.id === selectedReportId);

  const keyLabels = {
    reportOn: "تاريخ التقرير", receivedOn: "تاريخ الاستلام", inspectionDate: "تاريخ الفحص",
    temperature: "درجة الحرارة", brand: "العلامة التجارية", invoiceNo: "رقم الفاتورة",
    ph: "درجة الحموضة", origin: "بلد المنشأ", airwayBill: "رقم بوليصة الشحن",
    localLogger: "جهاز التسجيل المحلي", internationalLogger: "جهاز التسجيل الدولي"
  };

  const handleDelete = id => {
    if (window.confirm("هل أنت متأكد من حذف هذا التقرير؟")) {
      const filtered = reports.filter(r => r.id !== id);
      setReports(filtered);
      localStorage.setItem("qcs_raw_material_reports", JSON.stringify(filtered));
      if (selectedReportId === id) setSelectedReportId(filtered[0]?.id || null);
    }
  };

  const handleExport = () => {
    const url = URL.createObjectURL(new Blob([JSON.stringify(reports, null, 2)], { type: "application/json" }));
    const a = Object.assign(document.createElement("a"), { href: url, download: "qcs_raw_material_reports_backup.json" });
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = e => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ({ target }) => {
      try {
        const data = JSON.parse(target.result);
        if (!Array.isArray(data)) return alert("ملف غير صالح: يجب أن يحتوي على مصفوفة تقارير.");
        const merged = [...reports, ...data];
        setReports(merged);
        localStorage.setItem("qcs_raw_material_reports", JSON.stringify(merged));
        alert("تم استيراد التقارير بنجاح.");
      } catch {
        alert("فشل في قراءة الملف أو تنسيقه غير صالح.");
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  const toggleType = (type) => {
    setOpenTypes(prev => ({ ...prev, [type]: !prev[type] }));
  };

  const boxStyle = {
    flex: "1 1 200px", background: "#f9f9f9", padding: 10, borderRadius: 5,
    boxShadow: "0 1px 3px rgba(0,0,0,0.1)", fontWeight: 600, textAlign: "right", color: "#444"
  };

  const renderInfoBox = (label, value) => (
    <div style={boxStyle}>
      <div style={{ fontWeight: "bold", marginBottom: 5, color: "#8e44ad" }}>{label}</div>
      <div>{value || "-"}</div>
    </div>
  );

  const renderShipmentStatusBox = (status) => {
    const statusMap = {
      "مرضي": { text: "✅ مرضي", bg: "#eafaf1", color: "#27ae60" },
      "وسط": { text: "⚠️ وسط", bg: "#fdf5e6", color: "#e67e22" },
      "تحت الوسط": { text: "❌ تحت الوسط", bg: "#fdecea", color: "#c0392b" }
    };

    const { text, bg, color } = statusMap[status] || { text: status, bg: "#eee", color: "#555" };

    return (
      <div style={boxStyle}>
        <div style={{ fontWeight: "bold", marginBottom: 5, color: "#8e44ad" }}>حالة الشحنة (Shipment Status)</div>
        <span style={{
          padding: "4px 10px",
          borderRadius: "12px",
          backgroundColor: bg,
          color,
          fontWeight: "bold",
          display: "inline-block"
        }}>
          {text}
        </span>
      </div>
    );
  };

  return (
    <div style={{ display: "flex", fontFamily: "Cairo, sans-serif", direction: "rtl", gap: "1rem", padding: "1rem" }}>
      
      <aside style={{ flex: "0 0 280px", borderLeft: "1px solid #ccc", paddingLeft: "1rem", maxHeight: "80vh", overflowY: "auto", background: "#fafafa" }}>
        <h3 style={{ marginBottom: "1rem", color: "#8e44ad", fontWeight: "bold" }}>📦 تقارير حسب نوع الشحنة</h3>

        <input
          type="text"
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
          placeholder="🔍 ابحث برقم بوليصة الشحن"
          style={{ width: "100%", padding: 8, borderRadius: 6, border: "1px solid #ccc", marginBottom: "1rem" }}
        />

        {Object.entries(
          filteredReports.reduce((acc, r) => {
            const type = r.shipmentType || "نوع غير محدد";
            if (!acc[type]) acc[type] = [];
            acc[type].push(r);
            return acc;
          }, {})
        ).map(([type, reportsInType]) => (
          <div key={type} style={{ marginBottom: "1.5rem" }}>
            <button
              onClick={() => toggleType(type)}
              style={{
                width: "100%", background: "#eee", padding: "8px 10px", fontWeight: "bold",
                textAlign: "right", border: "none", borderRadius: "6px", marginBottom: "0.5rem",
                display: "flex", justifyContent: "space-between", alignItems: "center", cursor: "pointer"
              }}
            >
              📦 {type}
              <span>{openTypes[type] ? "➖" : "➕"}</span>
            </button>

            {openTypes[type] && (
              <ul style={{ listStyle: "none", padding: 0 }}>
                {reportsInType.map(r => (
                  <li key={r.id} style={{ marginBottom: "0.5rem" }}>
                    <button
                      onClick={() => { setSelectedReportId(r.id); setShowCertificate(false); }}
                      title={`فتح تقرير ${r.generalInfo?.airwayBill || "بدون رقم شحنة"}`}
                      style={{
                        width: "100%", padding: "8px", borderRadius: 5, cursor: "pointer",
                        border: selectedReportId === r.id ? "2px solid #8e44ad" : "1px solid #ccc",
                        background: selectedReportId === r.id ? "#f0e6fb" : "#fff",
                        fontWeight: selectedReportId === r.id ? "bold" : "normal",
                        display: "flex", justifyContent: "space-between", alignItems: "center", textAlign: "right"
                      }}
                    >
                      <span>
                        {r.generalInfo?.airwayBill || "بدون رقم شحنة"}{" "}
                        <span style={{
                          fontWeight: "bold",
                          fontSize: "0.8rem",
                          color:
                            r.status === "مرضي" ? "#27ae60" :
                            r.status === "وسط" ? "#e67e22" :
                            "#c0392b"
                        }}>
                          {r.status === "مرضي" ? "✅" : r.status === "وسط" ? "⚠️" : "❌"}
                        </span>
                      </span>
                      <button
                        onClick={e => { e.stopPropagation(); handleDelete(r.id); }}
                        style={{ background: "#c0392b", color: "#fff", border: "none", borderRadius: 4, padding: "3px 8px", cursor: "pointer" }}
                      >
                        حذف
                      </button>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        ))}

        <div style={{ marginTop: "1.5rem", textAlign: "center" }}>
          <button onClick={handleExport} style={{ padding: 8, background: "#8e44ad", color: "#fff", border: "none", borderRadius: 5, width: "100%", fontWeight: "bold", marginBottom: 8 }}>
            ⬇️ تصدير التقارير
          </button>
          <button onClick={() => fileInputRef.current.click()} style={{ padding: 8, background: "#27ae60", color: "#fff", border: "none", borderRadius: 5, width: "100%", fontWeight: "bold" }}>
            ⬆️ استيراد تقارير
          </button>
          <input ref={fileInputRef} type="file" accept="application/json" onChange={handleImport} style={{ display: "none" }} />
        </div>
      </aside>

      <main style={{ flex: 1, maxHeight: "80vh", overflowY: "auto", background: "#fff", borderRadius: 6, padding: "1rem", boxShadow: "0 0 5px rgba(0,0,0,0.1)" }}>
        {!selectedReport ? (
          <p style={{ textAlign: "center", fontWeight: "bold", color: "#c0392b", padding: "2rem" }}>❌ لم يتم اختيار تقرير.</p>
        ) : (
          <>
            <h3 style={{ marginBottom: "1rem", color: "#8e44ad", fontWeight: "bold" }}>
              📋 تقرير استلام شحنة رقم: <span style={{ color: "#2c3e50" }}>{selectedReport.generalInfo?.airwayBill || "غير محدد"}</span>
            </h3>
            <section style={{ marginBottom: "1.5rem", display: "flex", flexWrap: "wrap", gap: "1rem" }}>
              {Object.entries(selectedReport.generalInfo || {}).map(([k, v]) =>
                renderInfoBox(`${keyLabels[k] || k} (${k})`, v)
              )}
              {renderInfoBox("نوع الشحنة (Shipment Type)", selectedReport.shipmentType)}
              {renderShipmentStatusBox(selectedReport.status)}
              {renderInfoBox("تاريخ الإدخال (Entry Date)", selectedReport.date)}
              {selectedReport.inspectedBy && renderInfoBox("تم الفحص بواسطة (Inspected By)", selectedReport.inspectedBy)}
              {selectedReport.verifiedBy && renderInfoBox("تم التحقق بواسطة (Verified By)", selectedReport.verifiedBy)}
            </section>

            {/* زر عرض شهادة الحلال */}
            {selectedReport.certificateFile && (
              <div style={{ margin: "1.5rem 0" }}>
                <button
                  onClick={() => setShowCertificate(v => !v)}
                  style={{
                    padding: "8px 20px",
                    background: "#d35400",
                    color: "#fff",
                    border: "none",
                    borderRadius: "8px",
                    fontWeight: "bold",
                    fontSize: "1rem",
                    marginBottom: "1rem",
                    cursor: "pointer"
                  }}
                >
                  {showCertificate ? "إغلاق شهادة الحلال" : "🕌 عرض شهادة الحلال"}
                </button>
                {showCertificate && (
                  <div>
                    <div style={{ fontWeight: "bold", marginBottom: 6, color: "#d35400" }}>
                      {selectedReport.certificateName}
                    </div>
                    {selectedReport.certificateFile.startsWith("data:image/") ? (
                      <img
                        src={selectedReport.certificateFile}
                        alt={selectedReport.certificateName || "شهادة الحلال"}
                        style={{ maxWidth: "350px", borderRadius: "10px", boxShadow: "0 2px 8px rgba(0,0,0,0.07)", display: "block" }}
                      />
                    )
                      : selectedReport.certificateFile.startsWith("data:application/pdf") ? (
                        <a
                          href={selectedReport.certificateFile}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{
                            display: "inline-block",
                            padding: "8px 20px",
                            background: "#8e44ad",
                            color: "#fff",
                            borderRadius: "8px",
                            fontWeight: "bold",
                            textDecoration: "none",
                            marginTop: "8px"
                          }}
                        >
                          📄 عرض شهادة الحلال (PDF)
                        </a>
                      ) : null
                    }
                  </div>
                )}
              </div>
            )}

            <section>
              <h4 style={{ marginBottom: "0.8rem", fontWeight: "bold", color: "#8e44ad", borderBottom: "2px solid #8e44ad", paddingBottom: "0.3rem" }}>
                عينات الفحص (Test Samples)
              </h4>
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.95rem", minWidth: "700px" }}>
                  <thead>
                    <tr style={{ background: "#f0f0f0", textAlign: "center", fontWeight: "bold" }}>
                      {[
                        "#", "درجة الحرارة (Temp)", "درجة الحموضة (PH)", "تاريخ الذبح (Slaughter Date)",
                        "تاريخ الانتهاء (Expiry Date)", "قطع مكسورة (Broken)", "المظهر (Appearance)",
                        "تجلط دم (Blood Clots)", "اللون (Colour)", "شحوم متغيرة (Fat Discoloration)",
                        "تلف اللحم (Meat Damage)", "مواد غريبة (Foreign Matter)", "الملمس (Texture)",
                        "خصيتين (Testicles)", "رائحة كريهة (Smell)"
                      ].map((h, i) => <th key={i} style={{ padding: "8px" }}>{h}</th>)}
                    </tr>
                  </thead>
                  <tbody>
                    {selectedReport.samples?.map((sample, i) => (
                      <tr key={i} style={{ textAlign: "center", borderBottom: "1px solid #ddd" }}>
                        <td style={{ padding: "6px" }}>{i + 1}</td>
                        {Object.values(sample).map((v, j) => (
                          <td key={j} style={{ padding: "6px" }}>{v || "-"}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          </>
        )}
      </main>
    </div>
  );
}
