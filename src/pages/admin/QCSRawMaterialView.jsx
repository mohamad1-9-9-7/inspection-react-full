import React, { useEffect, useState, useRef } from "react"; 

// 👉 لو بدك استيراد ثابت:
// import jsPDF from "jspdf";
// import html2canvas from "html2canvas";
// (أنا عامل import ديناميكي بالأسفل لتخفيف الحمل)

export default function QCSRawMaterialView() {
  const [searchTerm, setSearchTerm] = useState("");
  const [reports, setReports] = useState([]);
  const [selectedReportId, setSelectedReportId] = useState(null);
  const [openTypes, setOpenTypes] = useState({});
  const [showCertificate, setShowCertificate] = useState(false);
  const fileInputRef = useRef(null);
  const restoreShowCertRef = useRef(false); 
  const printAreaRef = useRef(null);
  const mainRef = useRef(null);

  // ===== أعمدة العينات — متطابقة مع صفحة الإدخال =====
  const sampleColumns = [
    { key: "temperature", label: "درجة الحرارة (Temp)" },
    { key: "ph", label: "درجة الحموضة (PH)" },
    { key: "slaughterDate", label: "تاريخ الذبح (Slaughter Date)" },
    { key: "expiryDate", label: "تاريخ الانتهاء (Expiry Date)" },
    { key: "broken", label: "قطع مكسورة (Broken)" },
    { key: "appearance", label: "المظهر (Appearance)" },
    { key: "bloodClots", label: "تجلط دم (Blood Clots)" },
    { key: "colour", label: "اللون (Colour)" },
    { key: "fatDiscoloration", label: "شحوم متغيرة (Fat Discoloration)" },
    { key: "meatDamage", label: "تلف اللحم (Meat Damage)" },
    { key: "foreignMatter", label: "مواد غريبة (Foreign Matter)" },
    { key: "texture", label: "الملمس (Texture)" },
    { key: "testicles", label: "خصيتين (Testicles)" },
    { key: "smell", label: "رائحة كريهة (Smell)" }
  ];

  // ===== ستايل طباعة/تصدير: حدود سوداء + رؤوس ثابتة + نص واضح =====
  const printStyles = `
    @media print {
      .no-print { display: none !important; }
      aside { display: none !important; }
      main, .print-main, .print-unclip {
        max-height: none !important;
        overflow: visible !important;
        box-shadow: none !important;
        border: none !important;
      }
      [style*="overflow"], [style*="max-height"] {
        max-height: none !important;
        overflow: visible !important;
      }
      .print-area { visibility: visible !important; }
      html, body { height: auto !important; }
      body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }

      /* حدود سوداء واضحة لكل الجداول */
      table, thead, tbody, tfoot, tr, th, td { border: 1px solid #000 !important; }
      .headerTable th, .headerTable td { border: 1px solid #000 !important; background: #fff !important; }
      .samples thead th { background: #f5f5f5 !important; }

      /* رؤوس الجدول تظهر في كل صفحة */
      thead { display: table-header-group; }
      tfoot { display: table-footer-group; }

      /* تجنّب تقطيع الصفوف/الصور */
      tr { page-break-inside: avoid; }
      img { page-break-inside: avoid; max-width: 100% !important; }

      /* نص أسود واضح */
      * { color: #000 !important; }
    }
  `;

  // ===== ترويسة (عرض فقط) بحدود سوداء =====
  const headerStyles = {
    table: {
      width: "100%",
      borderCollapse: "collapse",
      tableLayout: "fixed",
      fontSize: "0.95rem",
      background: "#fff",
      border: "1px solid #000",
      borderRadius: "0"
    },
    th: {
      border: "1px solid #000",
      background: "#f8fafc",
      textAlign: "right",
      padding: "10px 12px",
      width: "220px",
      color: "#111827",
      fontWeight: 800
    },
    td: { border: "1px solid #000", padding: "10px 12px", background: "#fff" },
    spacerCol: { borderLeft: "1px solid #000", width: "10px" }
  };

  // ===== القيم الافتراضية للترويسة =====
  const defaultDocMeta = {
    documentTitle: "Raw Material Inspection Report Chilled lamb",
    documentNo: "FS-QM/REC/RMB",
    issueDate: "2020-02-10",
    revisionNo: "0",
    area: "QA"
  };

  // ===== تحميل التقارير =====
  useEffect(() => {
    const updateReports = () => {
      const saved = JSON.parse(localStorage.getItem("qcs_raw_material_reports") || "[]");
      saved.sort((a, b) => (b.id || 0) - (a.id || 0));
      setReports(saved);
      if (saved.length) setSelectedReportId(prev => prev ?? saved[0].id);
    };
    updateReports();
    window.addEventListener("focus", updateReports);
    window.addEventListener("storage", updateReports);
    return () => {
      window.removeEventListener("focus", updateReports);
      window.removeEventListener("storage", updateReports);
    };
  }, []);

  const filteredReports = reports.filter(r =>
    (r.generalInfo?.airwayBill || "").toLowerCase().includes(searchTerm.toLowerCase())
  );
  const selectedReport = filteredReports.find(r => r.id === selectedReportId) || null;

  const keyLabels = {
    reportOn: "تاريخ التقرير",
    receivedOn: "تاريخ الاستلام",
    inspectionDate: "تاريخ الفحص",
    temperature: "درجة الحرارة",
    brand: "العلامة التجارية",
    invoiceNo: "رقم الفاتورة",
    ph: "درجة الحموضة",
    origin: "بلد المنشأ",
    airwayBill: "رقم بوليصة الشحن",
    localLogger: "جهاز التسجيل المحلي",
    internationalLogger: "جهاز التسجيل الدولي"
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
        merged.sort((a, b) => (b.id || 0) - (a.id || 0));
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

  const toggleType = (type) => setOpenTypes(prev => ({ ...prev, [type]: !prev[type] }));

  // ===== تصدير مباشر إلى PDF (بدون نافذة الطباعة) =====
  const exportToPDF = async () => {
    if (!selectedReport) return alert("لا يوجد تقرير محدد للتصدير.");

    // افتح شهادة الحلال (الصورة) مؤقتًا لتظهر في الـ PDF
    restoreShowCertRef.current = showCertificate;
    setShowCertificate(true);

    // اسم الملف من رقم بوليصة الشحن أو تاريخ الإدخال
    const filename =
      (selectedReport?.generalInfo?.airwayBill && `QCS-${selectedReport.generalInfo.airwayBill}`) ||
      `QCS-Report-${(selectedReport?.date || "").replace(/[:/\\s]+/g, "_") || Date.now()}`;

    // فكّ قيود الارتفاع والتمرير مؤقتًا
    const mainEl = mainRef.current;
    const originalMainStyle = {
      maxHeight: mainEl?.style.maxHeight,
      overflowY: mainEl?.style.overflowY,
      boxShadow: mainEl?.style.boxShadow,
      border: mainEl?.style.border
    };
    if (mainEl) {
      mainEl.style.maxHeight = "none";
      mainEl.style.overflowY = "visible";
      mainEl.style.boxShadow = "none";
      mainEl.style.border = "none";
    }

    // انتظر إعادة الرسم
    await new Promise(r => setTimeout(r, 150));

    try {
      const [{ default: html2canvas }, { default: jsPDF }] = await Promise.all([
        import("html2canvas"),
        import("jspdf")
      ]);

      const target = printAreaRef.current;
      const scale = window.devicePixelRatio > 1 ? 2 : 1;
      const canvas = await html2canvas(target, {
        scale,
        useCORS: true,
        backgroundColor: "#ffffff",
        scrollX: 0,
        scrollY: -window.scrollY,
        windowWidth: document.documentElement.offsetWidth
      });

      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF("p", "mm", "a4");

      // حساب قياسات الصورة ضمن A4
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();

      const imgWidth = pageWidth; // ملء العرض
      const imgHeight = (canvas.height * imgWidth) / canvas.width;

      let heightLeft = imgHeight;
      let position = 0;

      // الصفحة الأولى
      pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight, undefined, "FAST");
      heightLeft -= pageHeight;

      // صفحات إضافية عند الحاجة (تقطيع الصورة الطويلة)
      while (heightLeft > 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight, undefined, "FAST");
        heightLeft -= pageHeight;
      }

      pdf.save(`${filename}.pdf`);
    } catch (err) {
      console.error(err);
      alert("تعذر إنشاء ملف الـ PDF. تأكد من تثبيت jspdf و html2canvas.");
    } finally {
      // رجّع الحالة الأصلية
      if (mainEl) {
        mainEl.style.maxHeight = originalMainStyle.maxHeight || "";
        mainEl.style.overflowY = originalMainStyle.overflowY || "";
        mainEl.style.boxShadow = originalMainStyle.boxShadow || "";
        mainEl.style.border = originalMainStyle.border || "";
      }
      setShowCertificate(restoreShowCertRef.current);
    }
  };

  const boxStyle = {
    flex: "1 1 240px",
    background: "#ffffff",
    padding: 12,
    borderRadius: 12,
    boxShadow: "0 2px 8px rgba(2,6,23,0.06)",
    border: "1px solid #000", // حدود سوداء واضحة
    fontWeight: 600,
    textAlign: "right",
    color: "#0f172a"
  };

  const renderInfoBox = (label, value) => (
    <div style={boxStyle}>
      <div style={{ fontWeight: "bold", marginBottom: 5, color: "#111827" }}>{label}</div>
      <div>{value || "-"}</div>
    </div>
  );

  const renderShipmentStatusBox = (status) => {
    const statusMap = {
      "مرضي": { text: "✅ مرضي", bg: "#fff", color: "#111827", bd: "#000" },
      "وسط": { text: "⚠️ وسط", bg: "#fff", color: "#111827", bd: "#000" },
      "تحت الوسط": { text: "❌ تحت الوسط", bg: "#fff", color: "#111827", bd: "#000" }
    };
    const { text, bg, color, bd } = statusMap[status] || { text: status, bg: "#fff", color: "#111827", bd: "#000" };
    return (
      <div style={{ ...boxStyle, background: bg, borderColor: bd }}>
        <div style={{ fontWeight: "bold", marginBottom: 5, color: "#111827" }}>حالة الشحنة (Shipment Status)</div>
        <span style={{ padding: "4px 10px", borderRadius: "0", backgroundColor: "#ffffff", color, fontWeight: "bold", display: "inline-block", border: `1px solid ${bd}` }}>
          {text}
        </span>
      </div>
    );
  };

  // ===== عنوان التقرير =====
  const reportTitle =
    (selectedReport?.generalInfo?.airwayBill && `📦 رقم بوليصة الشحن: ${selectedReport.generalInfo.airwayBill}`) ||
    "📋 تقرير استلام شحنة";

  // ===== ميتاداتا الترويسة =====
  const docMeta = selectedReport?.docMeta
    ? {
        documentTitle: selectedReport.docMeta.documentTitle || defaultDocMeta.documentTitle,
        documentNo: selectedReport.docMeta.documentNo || defaultDocMeta.documentNo,
        issueDate: selectedReport.docMeta.issueDate || defaultDocMeta.issueDate,
        revisionNo: selectedReport.docMeta.revisionNo || defaultDocMeta.revisionNo,
        area: selectedReport.docMeta.area || defaultDocMeta.area
      }
    : defaultDocMeta;

  return (
    <div style={{ display: "flex", fontFamily: "Cairo, system-ui, -apple-system, Segoe UI, Roboto, sans-serif", direction: "rtl", gap: "1rem", padding: "1rem", background: "linear-gradient(135deg, #f8fafc 0%, #eef2ff 100%)", minHeight: "100vh" }}>
      <style>{printStyles}</style>

      <aside className="no-print" style={{ flex: "0 0 300px", borderLeft: "1px solid #000", paddingLeft: "1rem", maxHeight: "80vh", overflowY: "auto", background: "#ffffff", borderRadius: 12, boxShadow: "0 2px 8px rgba(2,6,23,0.06)" }}>
        <h3 style={{ marginBottom: "1rem", color: "#111827", fontWeight: 800 }}>📦 تقارير حسب نوع الشحنة</h3>

        {/* زر التصدير المباشر PDF */}
        <button
          onClick={exportToPDF}
          disabled={!selectedReport}
          style={{
            width: "100%",
            padding: 10,
            background: !selectedReport ? "#93c5fd" : "#0ea5e9",
            color: "#fff",
            border: "1px solid #000",
            borderRadius: 10,
            fontWeight: 800,
            marginBottom: "10px",
            cursor: !selectedReport ? "not-allowed" : "pointer"
          }}
          title="تصدير التقرير كـ PDF مباشرة"
        >
          ⬇️ تصدير التقرير PDF (مباشر)
        </button>

        <input
          type="text"
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
          placeholder="🔍 ابحث برقم بوليصة الشحن"
          style={{ width: "100%", padding: 10, borderRadius: 10, border: "1px solid #000", marginBottom: "1rem" }}
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
                width: "100%",
                background: "#f3f4f6",
                padding: "10px 12px",
                fontWeight: 800,
                textAlign: "right",
                border: "1px solid #000",
                borderRadius: "10px",
                marginBottom: "0.5rem",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                cursor: "pointer",
                color: "#0f172a"
              }}
            >
              📦 {type}
              <span>{openTypes[type] ? "➖" : "➕"}</span>
            </button>

            {openTypes[type] && (
              <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
                {reportsInType.map(r => (
                  <li key={r.id} style={{ marginBottom: "0.5rem" }}>
                    <button
                      onClick={() => { setSelectedReportId(r.id); setShowCertificate(false); }}
                      title={`فتح تقرير ${r.generalInfo?.airwayBill || "بدون رقم شحنة"}`}
                      style={{
                        width: "100%",
                        padding: "10px 12px",
                        borderRadius: 10,
                        cursor: "pointer",
                        border: selectedReportId === r.id ? "2px solid #000" : "1px solid #000",
                        background: selectedReportId === r.id ? "#f5f5f5" : "#fff",
                        fontWeight: selectedReportId === r.id ? 800 : 600,
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        textAlign: "right",
                        color: "#0f172a"
                      }}
                    >
                      <span>
                        {r.generalInfo?.airwayBill || "بدون رقم شحنة"}{" "}
                        <span style={{ fontWeight: 800, fontSize: "0.85rem", color: "#0f172a" }}>
                          {r.status === "مرضي" ? "✅" : r.status === "وسط" ? "⚠️" : "❌"}
                        </span>
                      </span>
                      <button
                        onClick={e => { e.stopPropagation(); handleDelete(r.id); }}
                        style={{ background: "#dc2626", color: "#fff", border: "1px solid #000", borderRadius: 8, padding: "6px 10px", cursor: "pointer", fontWeight: 800 }}
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
          <button onClick={handleExport} style={{ padding: 10, background: "#111827", color: "#fff", border: "1px solid #000", borderRadius: 10, width: "100%", fontWeight: 800, marginBottom: 8 }}>
            ⬇️ تصدير التقارير (JSON)
          </button>
          <button onClick={() => fileInputRef.current.click()} style={{ padding: 10, background: "#16a34a", color: "#fff", border: "1px solid #000", borderRadius: 10, width: "100%", fontWeight: 800 }}>
            ⬆️ استيراد تقارير
          </button>
          <input ref={fileInputRef} type="file" accept="application/json" onChange={handleImport} style={{ display: "none" }} />
        </div>
      </aside>

      <main ref={mainRef} className="print-main" style={{ flex: 1, maxHeight: "80vh", overflowY: "auto", background: "#fff", borderRadius: 16, padding: "1rem", boxShadow: "0 10px 20px rgba(2,6,23,0.06), 0 1px 2px rgba(2,6,23,0.04)", border: "1px solid #000" }}>
        {!selectedReport ? (
          <p style={{ textAlign: "center", fontWeight: 800, color: "#dc2626", padding: "2rem" }}>❌ لم يتم اختيار تقرير.</p>
        ) : (
          <div className="print-area" ref={printAreaRef}>
            {/* ===== الترويسة ===== */}
            <div style={{ marginBottom: "10px" }}>
              <table className="headerTable" style={headerStyles.table}>
                <colgroup>
                  <col />
                  <col />
                  <col style={headerStyles.spacerCol} />
                  <col />
                  <col />
                </colgroup>
                <tbody>
                  <tr>
                    <th style={headerStyles.th}>Document Title</th>
                    <td style={headerStyles.td}>{docMeta.documentTitle}</td>
                    <td />
                    <th style={headerStyles.th}>Document No</th>
                    <td style={headerStyles.td}>{docMeta.documentNo}</td>
                  </tr>
                  <tr>
                    <th style={headerStyles.th}>Issue Date</th>
                    <td style={headerStyles.td}>{docMeta.issueDate}</td>
                    <td />
                    <th style={headerStyles.th}>Revision No</th>
                    <td style={headerStyles.td}>{docMeta.revisionNo}</td>
                  </tr>
                  <tr>
                    <th style={headerStyles.th}>Area</th>
                    <td style={headerStyles.td} colSpan={4}>{docMeta.area}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* عنوان التقرير */}
            <h3 style={{ margin: "0 0 1rem", color: "#111827", fontWeight: 800 }}>{reportTitle}</h3>

            {/* معلومات عامة */}
            <section style={{ marginBottom: "1.5rem", display: "flex", flexWrap: "wrap", gap: "1rem" }}>
              {Object.entries(selectedReport.generalInfo || {}).map(([k, v]) => (
                <div key={k} style={{ flex: "1 1 240px" }}>{renderInfoBox(`${keyLabels[k] || k} (${k})`, v)}</div>
              ))}
              {renderInfoBox("نوع الشحنة (Shipment Type)", selectedReport.shipmentType)}
              {renderShipmentStatusBox(selectedReport.status)}
              {renderInfoBox("تاريخ الإدخال (Entry Date)", selectedReport.date)}
              {/* تم إزالة عرضهما من هنا حسب طلبك */}
              {renderInfoBox("عدد الحبات الكلي (Total Quantity)", selectedReport.totalQuantity)}
              {renderInfoBox("وزن الشحنة الكلي (Total Weight, kg)", selectedReport.totalWeight)}
              {renderInfoBox("متوسط وزن الحبة (Average, kg)", selectedReport.averageWeight)}
            </section>

            {/* شهادة الحلال */}
            {selectedReport.certificateFile && (
              <div style={{ margin: "1.5rem 0" }}>
                <div style={{ fontWeight: 800, marginBottom: 6, color: "#111827" }}>
                  {selectedReport.certificateName}
                </div>
                {selectedReport.certificateFile.startsWith("data:image/") ? (
                  <img
                    src={selectedReport.certificateFile}
                    alt={selectedReport.certificateName || "شهادة الحلال"}
                    style={{ maxWidth: "350px", borderRadius: "0", boxShadow: "none", display: "block", border: "1px solid #000" }}
                  />
                ) : selectedReport.certificateFile.startsWith("data:application/pdf") ? (
                  <div style={{ padding: "8px 12px", border: "1px dashed #000", display: "inline-block" }}>
                    📄 ملف PDF مرفق: سيتم فتحه من الرابط عند العرض الإلكتروني — اسم الملف:
                    <strong> {selectedReport.certificateName}</strong>
                  </div>
                ) : null}
              </div>
            )}

            {/* عينات الفحص */}
            <section>
              <h4 style={{ marginBottom: "0.8rem", fontWeight: 800, color: "#111827", borderBottom: "2px solid #000", paddingBottom: "0.3rem" }}>
                عينات الفحص (Test Samples)
              </h4>
              <div className="print-unclip" style={{ overflowX: "auto", border: "1px solid #000" }}>
                <table className="samples" style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.95rem", minWidth: "900px" }}>
                  <thead>
                    <tr style={{ background: "#f5f5f5", textAlign: "center", fontWeight: 800 }}>
                      <th style={{ padding: "10px 6px", border: "1px solid #000", whiteSpace: "nowrap" }}>#</th>
                      {sampleColumns.map(col => (
                        <th key={col.key} style={{ padding: "10px 6px", border: "1px solid #000", whiteSpace: "nowrap" }}>
                          {col.label}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {selectedReport.samples?.map((sample, i) => (
                      <tr key={i} style={{ textAlign: "center" }}>
                        <td style={{ padding: "8px 6px", border: "1px solid #000" }}>{i + 1}</td>
                        {sampleColumns.map(col => (
                          <td key={col.key} style={{ padding: "8px 6px", border: "1px solid #000" }}>{sample?.[col.key] || "-"}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            {/* == قسم الملاحظات تحت جدول العينات (يقرأ من selectedReport.notes أو من selectedReport.generalInfo.notes) == */}
            <section style={{ marginTop: "1rem" }}>
              <h4 style={{ marginBottom: "0.5rem", fontWeight: 800, color: "#111827" }}>
                📝 الملاحظات (Notes)
              </h4>
              <div
                style={{
                  border: "1px solid #000",
                  borderRadius: "8px",
                  padding: "10px 12px",
                  minHeight: "6em",          // تقريباً 4 أسطر
                  whiteSpace: "pre-wrap",     // الحفاظ على أسطر الملاحظات
                  lineHeight: 1.6,
                  background: "#fff"
                }}
              >
                {(selectedReport?.notes ?? selectedReport?.generalInfo?.notes ?? "").trim() || "—"}
              </div>
            </section>

            {/* ===== الخانتين أسفل التقرير بعد جدول العينات ===== */}
            <section style={{ marginTop: "1.5rem", display: "flex", justifyContent: "space-between", gap: "1rem" }}>
              {selectedReport.inspectedBy && (
                <div style={{ flex: 1, display: "flex", justifyContent: "flex-start" }}>
                  {renderInfoBox("تم الفحص بواسطة (Inspected By)", selectedReport.inspectedBy)}
                </div>
              )}
              {selectedReport.verifiedBy && (
                <div style={{ flex: 1, display: "flex", justifyContent: "flex-end" }}>
                  {renderInfoBox("تم التحقق بواسطة (Verified By)", selectedReport.verifiedBy)}
                </div>
              )}
            </section>
          </div>
        )}
      </main>
    </div>
  );
}
