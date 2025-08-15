import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";

// ✅ هيكل العينة الفارغة (لا تَستخدم نفس المرجع)
const initialSample = {
  temperature: "",
  ph: "",
  slaughterDate: "",
  expiryDate: "",
  broken: "",
  appearance: "",
  bloodClots: "",
  colour: "",
  fatDiscoloration: "",
  meatDamage: "",
  foreignMatter: "",
  texture: "",
  testicles: "",
  smell: ""
};

// دالة تُنشئ نسخة جديدة من عينة فارغة في كل مرة
const newEmptySample = () => ({ ...initialSample });

// 🎨 أنماط عصرية مع الحفاظ على RTL والميزات القديمة
const styles = {
  page: {
    minHeight: "100vh",
    background: "linear-gradient(135deg, #f8fafc 0%, #eef2ff 100%)",
    padding: "32px 16px"
  },
  container: {
    padding: "2rem",
    background: "#fff",
    borderRadius: "16px",
    margin: "0 auto",
    width: "min(1200px, 96vw)",
    direction: "rtl",
    fontFamily: "Cairo, system-ui, -apple-system, Segoe UI, Roboto, sans-serif",
    boxShadow:
      "0 10px 20px rgba(2, 6, 23, 0.06), 0 1px 2px rgba(2, 6, 23, 0.04)",
    border: "1px solid #e5e7eb"
  },
  titleWrap: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "1rem",
    marginBottom: "1.2rem"
  },
  title: {
    color: "#0f172a",
    margin: 0,
    fontSize: "1.5rem",
    fontWeight: 800,
    letterSpacing: "0.2px"
  },
  badge: {
    fontSize: "0.85rem",
    background: "#eef2ff",
    color: "#3730a3",
    padding: "6px 10px",
    borderRadius: "999px",
    border: "1px solid #c7d2fe",
    fontWeight: 700
  },
  section: { marginBottom: "1.25rem" },
  label: { fontWeight: 700, color: "#0f172a" },

  // ✅ لمسة سحرية: حدود زرقاء افتراضيًا + سلاسة بالفوكس
  input: {
    width: "100%",
    padding: "12px 14px",
    border: "1px solid #bfdbfe",           // أزرق فاتح
    borderRadius: "12px",
    outline: "none",
    transition: "box-shadow .15s ease, border-color .15s ease, transform .08s ease",
    background: "#fff"
  },
  select: {
    width: "100%",
    padding: "12px 14px",
    border: "1px solid #bfdbfe",           // أزرق فاتح
    borderRadius: "12px",
    outline: "none",
    transition: "box-shadow .15s ease, border-color .15s ease, transform .08s ease",
    background: "#fff"
  },
  focused: {
    boxShadow: "0 0 0 4px rgba(59,130,246,.25)", // هالة فوكس زرقاء لطيفة
    borderColor: "#3b82f6",
    transform: "translateY(-1px)"
  },

  fieldset: {
    marginBottom: "1.5rem",
    padding: "1.25rem",
    border: "1px solid #e5e7eb",
    borderRadius: "14px",
    background: "#fafafa"
  },
  legend: {
    fontWeight: 800,
    fontSize: "1.05rem",
    color: "#111827",
    padding: "0 .4rem"
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
    gap: "12px",
    marginTop: "12px"
  },
  row: { display: "flex", flexDirection: "column", gap: "6px" },
  statusContainer: {
    display: "flex",
    alignItems: "center",
    gap: "0.75rem",
    marginTop: "0.5rem",
    flexWrap: "wrap"
  },
  tableWrap: {
    overflowX: "auto",
    background: "#fff",
    border: "1px solid #e5e7eb",
    borderRadius: "12px"
  },
  table: {
    width: "100%",
    borderCollapse: "collapse",
    fontSize: "0.95rem"
  },
  th: {
    backgroundColor: "#f3f4f6",
    textAlign: "center",
    position: "sticky",
    top: 0,
    zIndex: 1,
    borderBottom: "1px solid #e5e7eb",
    padding: "10px 6px",
    whiteSpace: "nowrap"
  },
  td: { borderTop: "1px solid #f1f5f9", padding: "8px 6px" },

  // ✅ تكبير خانات العينات + حدود زرقاء + سلاسة
  tdInput: {
    width: "100%",
    minWidth: "120px",
    padding: "10px 12px",
    border: "1px solid #bfdbfe",           // أزرق فاتح
    borderRadius: "10px",
    outline: "none",
    transition: "box-shadow .15s ease, border-color .15s ease",
    background: "#fff"
  },

  actionsRow: {
    display: "flex",
    gap: "12px",
    flexWrap: "wrap",
    marginTop: "1rem"
  },
  addButton: {
    padding: "10px 16px",
    background: "#4f46e5",
    color: "#fff",
    border: "none",
    borderRadius: "10px",
    cursor: "pointer",
    fontWeight: 700
  },
  uploadButton: {
    padding: "10px 16px",
    background: "#f59e0b",
    color: "#fff",
    border: "none",
    borderRadius: "10px",
    cursor: "pointer",
    marginBottom: "0.75rem",
    fontWeight: 700
  },
  previewImage: { maxWidth: "200px", marginTop: "0.5rem", borderRadius: "8px" },
  formRow3: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
    gap: "12px",
    marginTop: "1rem"
  },
  saveButton: {
    padding: "12px 22px",
    background: "#16a34a",
    color: "#fff",
    border: "none",
    borderRadius: "12px",
    cursor: "pointer",
    fontWeight: 800
  },
  viewButton: {
    padding: "12px 22px",
    background: "#2563eb",
    color: "#fff",
    border: "none",
    borderRadius: "12px",
    cursor: "pointer",
    marginTop: "0.75rem",
    fontWeight: 800
  },
  headerWrap: { marginBottom: "12px" },
  headerTable: {
    width: "100%",
    borderCollapse: "collapse",
    tableLayout: "fixed",
    fontSize: "0.95rem",
    background: "#fff",
    border: "1px solid #e5e7eb",
    borderRadius: "12px",
    overflow: "hidden"
  },
  headerTh: {
    border: "1px solid #e5e7eb",
    background: "#f8fafc",
    textAlign: "right",
    padding: "10px 12px",
    width: "220px",
    color: "#111827",
    fontWeight: 800
  },
  headerTd: {
    border: "1px solid #e5e7eb",
    padding: "10px 12px",
    background: "#fff"
  },
  headerInput: {
    width: "100%",
    padding: "10px 12px",
    border: "1px solid #e5e7eb",
    borderRadius: 10,
    outline: "none"
  },
  headerRowSpacer: { borderLeft: "1px solid #e5e7eb", width: "10px" }
};

export default function QCSRawMaterialInspection() {
  const navigate = useNavigate();
  const fileInputRef = useRef(null);

  // ترويسة بقيم ثابتة قابلة للتعديل
  const [docMeta, setDocMeta] = useState({
    documentTitle: "Raw Material Inspection Report Chilled lamb",
    documentNo: "FS-QM/REC/RMB",
    issueDate: "2020-02-10",
    revisionNo: "0",
    area: "QA"
  });

  // ✅ الحقول والحالات
  const [samples, setSamples] = useState([newEmptySample()]);
  const [shipmentType, setShipmentType] = useState("");
  const [shipmentStatus, setShipmentStatus] = useState("مرضي");
  const [inspectedBy, setInspectedBy] = useState("");
  const [verifiedBy, setVerifiedBy] = useState("");
  const [totalQuantity, setTotalQuantity] = useState("");
  const [totalWeight, setTotalWeight] = useState("");
  const [averageWeight, setAverageWeight] = useState("0");
  const [isFocused, setIsFocused] = useState(null); // لإضافة لمسة focus عصرية
  const [generalInfo, setGeneralInfo] = useState({
    reportOn: "",
    receivedOn: "",
    inspectionDate: "",
    temperature: "",
    brand: "",
    invoiceNo: "",
    ph: "",
    origin: "",
    airwayBill: "",
    localLogger: "",
    internationalLogger: ""
  });
  const [certificateFile, setCertificateFile] = useState(null);
  const [certificateName, setCertificateName] = useState("");
  // 📝 ملاحظات
  const [notes, setNotes] = useState("");

  // 🔢 متوسط الوزن (ديناميكي)
  useEffect(() => {
    const q = parseFloat(totalQuantity);
    const w = parseFloat(totalWeight);
    setAverageWeight(q > 0 && w > 0 ? (w / q).toFixed(3) : "0");
  }, [totalQuantity, totalWeight]);

  // ✏️ Handlers (بشكل غير قابل للتغيير)
  const handleSampleChange = (index, field, value) => {
    setSamples(prev => prev.map((s, i) => (i === index ? { ...s, [field]: value } : s)));
  };

  const handleGeneralChange = (field, value) => {
    setGeneralInfo(prev => ({ ...prev, [field]: value }));
  };

  const addSample = () => setSamples(prev => [...prev, newEmptySample()]);

  const handleCertificateUpload = e => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => setCertificateFile(reader.result);
    reader.readAsDataURL(file);
    setCertificateName(file.name);
  };

  const triggerFileSelect = () => fileInputRef.current?.click();

  const handleSave = () => {
    if (!shipmentType.trim()) {
      alert("📦 الرجاء اختيار نوع الشحنة.");
      return;
    }

    const allReports = JSON.parse(localStorage.getItem("qcs_raw_material_reports") || "[]");
    const newReport = {
      id: Date.now(),
      shipmentType,
      status: shipmentStatus,
      generalInfo,
      date: new Date().toLocaleString(),
      samples,
      inspectedBy,
      verifiedBy,
      totalQuantity,
      totalWeight,
      averageWeight,
      certificateFile,
      certificateName,
      docMeta,
      notes // ✅ حفظ الملاحظات
    };

    allReports.push(newReport);
    localStorage.setItem("qcs_raw_material_reports", JSON.stringify(allReports));
    alert("✅ تم حفظ التقرير الجديد بنجاح");

    // reset (بدون حذف أي ميزة)
    setShipmentType("");
    setSamples([newEmptySample()]);
    setInspectedBy("");
    setVerifiedBy("");
    setTotalQuantity("");
    setTotalWeight("");
    setAverageWeight("0");
    setCertificateFile(null);
    setCertificateName("");
    setNotes(""); // ✅ تفريغ الملاحظات بعد الحفظ
  };

  // 🎯 أداة صغيرة لتجميع خصائص الإدخال مع اللمسة العصرية للفوكس
  const inputProps = name => ({
    onFocus: () => setIsFocused(name),
    onBlur: () => setIsFocused(null),
    style: {
      ...styles.input,
      ...(isFocused === name ? styles.focused : {})
    }
  });

  const selectProps = name => ({
    onFocus: () => setIsFocused(name),
    onBlur: () => setIsFocused(null),
    style: {
      ...styles.select,
      ...(isFocused === name ? styles.focused : {})
    }
  });

  return (
    <div style={styles.page}>
      <div style={styles.container}>
        <div style={styles.titleWrap}>
          <h2 style={styles.title}>📦 تقرير استلام شحنات - QCS</h2>
          <span style={styles.badge}>نسخة واجهة محسّنة</span>
        </div>

        {/* الترويسة كجدول قابل للتعديل */}
        <div style={styles.headerWrap}>
          <table style={styles.headerTable}>
            <colgroup>
              <col />
              <col />
              <col style={styles.headerRowSpacer} />
              <col />
              <col />
            </colgroup>
            <tbody>
              <tr>
                <th style={styles.headerTh}>Document Title</th>
                <td style={styles.headerTd}>
                  <input
                    {...inputProps("documentTitle")}
                    value={docMeta.documentTitle}
                    onChange={(e) => setDocMeta({ ...docMeta, documentTitle: e.target.value })}
                  />
                </td>
                <td />
                <th style={styles.headerTh}>Document No</th>
                <td style={styles.headerTd}>
                  <input
                    {...inputProps("documentNo")}
                    value={docMeta.documentNo}
                    onChange={(e) => setDocMeta({ ...docMeta, documentNo: e.target.value })}
                  />
                </td>
              </tr>
              <tr>
                <th style={styles.headerTh}>Issue Date</th>
                <td style={styles.headerTd}>
                  <input
                    type="date"
                    {...inputProps("issueDate")}
                    value={docMeta.issueDate}
                    onChange={(e) => setDocMeta({ ...docMeta, issueDate: e.target.value })}
                  />
                </td>
                <td />
                <th style={styles.headerTh}>Revision No</th>
                <td style={styles.headerTd}>
                  <input
                    {...inputProps("revisionNo")}
                    value={docMeta.revisionNo}
                    onChange={(e) => setDocMeta({ ...docMeta, revisionNo: e.target.value })}
                  />
                </td>
              </tr>
              <tr>
                <th style={styles.headerTh}>Area</th>
                <td style={styles.headerTd} colSpan={4}>
                  <input
                    {...inputProps("area")}
                    value={docMeta.area}
                    onChange={(e) => setDocMeta({ ...docMeta, area: e.target.value })}
                  />
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Shipment Type */}
        <div style={styles.section}>
          <label style={styles.label}>📦 نوع الشحنة (Shipment Type):</label>
          <select
            value={shipmentType}
            onChange={e => setShipmentType(e.target.value)}
            {...selectProps("shipmentType")}
          >
            <option value="">-- اختر نوع الشحنة --</option>
            <option value="LAMB AUS">LAMB AUS</option>
            <option value="MOUTTON AUS">MOUTTON AUS</option>
            <option value="LAMB S.A">LAMB S.A</option>
            <option value="MOUTTON S.A">MOUTTON S.A</option>
            <option value="VACUUM">VACUUM</option>
            <option value="FROZEN">FROZEN</option>
            <option value="PAK">PAK</option>
            <option value="KHZ">KHZ</option>
            <option value="IND MOUTTON">IND MOUTTON</option>
            <option value="IND VEAL">IND VEAL</option>
            <option value="FRESH LAMB">FRESH LAMB</option>
            <option value="FRSH CHICKEN">FRSH CHICKEN</option>
          </select>
        </div>

        {/* General Information */}
        <fieldset style={styles.fieldset}>
          <legend style={styles.legend}>📋 معلومات عامة عن التقرير (General Information)</legend>
          <div style={styles.grid}>
            {[
              ["📅 تاريخ التقرير (Report On)", "reportOn", "date"],
              ["📥 تاريخ الاستلام (Sample Received On)", "receivedOn", "date"],
              ["🔍 تاريخ الفحص (Inspection Date)", "inspectionDate", "date"],
              ["🌡️ درجة الحرارة (Temperature)", "temperature", "text"],
              ["🏷️ العلامة التجارية (Brand)", "brand", "text"],
              ["🧾 رقم الفاتورة (Invoice No)", "invoiceNo", "text"],
              ["🔬 درجة الحموضة (PH)", "ph", "text"],
              ["🌍 بلد المنشأ (Origin)", "origin", "text"],
              ["📦 رقم بوليصة الشحن (Air Way Bill No)", "airwayBill", "text"],
              ["📡 جهاز التسجيل المحلي (Local Logger)", "localLogger", "select"],
              ["🌐 جهاز التسجيل الدولي (International Logger)", "internationalLogger", "select"]
            ].map(([label, field, type]) => (
              <div key={field} style={styles.row}>
                <label>{label}:</label>
                {type === "select" ? (
                  <select
                    value={generalInfo[field]}
                    onChange={e => handleGeneralChange(field, e.target.value)}
                    {...selectProps(field)}
                  >
                    <option value="">-- اختر --</option>
                    <option value="YES">YES</option>
                    <option value="NO">NO</option>
                  </select>
                ) : type === "date" ? (
                  <input
                    type="date"
                    value={generalInfo[field]}
                    onChange={e => handleGeneralChange(field, e.target.value)}
                    {...inputProps(field)}
                  />
                ) : (
                  <input
                    value={generalInfo[field]}
                    onChange={e => handleGeneralChange(field, e.target.value)}
                    {...inputProps(field)}
                  />
                )}
              </div>
            ))}
          </div>

          {/* Shipment Status */}
          <div style={{ marginTop: "1rem" }}>
            <label style={styles.label}>⚠️ حالة الشحنة (Shipment Status):</label>
            <div style={styles.statusContainer}>
              <select
                value={shipmentStatus}
                onChange={e => setShipmentStatus(e.target.value)}
                {...selectProps("shipmentStatus")}
                style={{
                  ...selectProps("shipmentStatus").style,
                  fontWeight: 800,
                  color:
                    shipmentStatus === "مرضي"
                      ? "#16a34a"
                      : shipmentStatus === "وسط"
                      ? "#d97706"
                      : "#dc2626"
                }}
              >
                <option value="مرضي">✅ مرضي (Acceptable)</option>
                <option value="وسط">⚠️ وسط (Average)</option>
                <option value="تحت الوسط">❌ تحت الوسط (Below Average)</option>
              </select>
              <span
                style={{
                  fontWeight: 800,
                  color:
                    shipmentStatus === "مرضي"
                      ? "#16a34a"
                      : shipmentStatus === "وسط"
                      ? "#d97706"
                      : "#dc2626"
                }}
              >
                {shipmentStatus === "مرضي"
                  ? "مقبول / Acceptable"
                  : shipmentStatus === "وسط"
                  ? "متوسط / Average"
                  : "تحت المتوسط / Below Average"}
              </span>
            </div>
          </div>
        </fieldset>

        {/* Test Samples */}
        <h4 style={styles.section}>🧪 عينات الفحص (Test Samples)</h4>
        <div style={styles.tableWrap}>
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>#</th>
                <th style={styles.th}>درجة الحرارة (Temp)</th>
                <th style={styles.th}>PH</th>
                <th style={styles.th}>تاريخ الذبح (Slaughter Date)</th>
                <th style={styles.th}>تاريخ الانتهاء (Expiry)</th>
                <th style={styles.th}>قطع مكسورة (Broken)</th>
                <th style={styles.th}>المظهر (Appearance)</th>
                <th style={styles.th}>تجلط دم (Blood Clots)</th>
                <th style={styles.th}>اللون (Colour)</th>
                <th style={styles.th}>شحوم متغيرة (Fat Discoloration)</th>
                <th style={styles.th}>تلف اللحم (Meat Damage)</th>
                <th style={styles.th}>مواد غريبة (Foreign Matter)</th>
                <th style={styles.th}>الملمس (Texture)</th>
                <th style={styles.th}>خصيتين (Testicles)</th>
                <th style={styles.th}>رائحة كريهة (Smell)</th>
              </tr>
            </thead>
            <tbody>
              {samples.map((sample, idx) => (
                <tr key={idx} style={{ textAlign: "center" }}>
                  <td style={styles.td}>{idx + 1}</td>
                  {Object.keys(sample).map(key => (
                    <td key={key} style={styles.td}>
                      <input
                        value={sample[key]}
                        onChange={e => handleSampleChange(idx, key, e.target.value)}
                        style={styles.tdInput}
                        onFocus={(e) => {
                          e.currentTarget.style.boxShadow = "0 0 0 4px rgba(59,130,246,.20)";
                          e.currentTarget.style.borderColor = "#3b82f6";
                        }}
                        onBlur={(e) => {
                          e.currentTarget.style.boxShadow = "none";
                          e.currentTarget.style.borderColor = "#bfdbfe";
                        }}
                      />
                    </td>
                  ))}
                </tr>
              ))}
              <tr>
                <td colSpan={15} style={{ textAlign: "center", padding: "1rem" }}>
                  <button onClick={addSample} style={styles.addButton}>
                    ➕ إضافة عينة جديدة (Add Sample)
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* 📝 ملاحظات أسفل جدول العينات */}
        <div style={{ marginTop: "12px" }}>
          <label style={styles.label}>📝 ملاحظات (Notes):</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={4}
            placeholder="اكتب أي ملاحظات إضافية هنا..."
            style={{
              ...styles.input,
              minHeight: "110px",
              resize: "vertical",
              lineHeight: "1.6"
            }}
          />
        </div>

        {/* Quantity & Weight */}
        <div style={styles.formRow3}>
          <div>
            <label style={styles.label}>📦 عدد الحبات الكلي:</label>
            <input
              type="number"
              value={totalQuantity}
              onChange={e => setTotalQuantity(e.target.value)}
              placeholder="مثال: 1000"
              {...inputProps("totalQuantity")}
            />
          </div>
          <div>
            <label style={styles.label}>⚖️ وزن الشحنة الكلي (كجم):</label>
            <input
              type="number"
              value={totalWeight}
              onChange={e => setTotalWeight(e.target.value)}
              placeholder="مثال: 750"
              {...inputProps("totalWeight")}
            />
          </div>
          <div>
            <label style={styles.label}>🔢 متوسط وزن الحبة (كجم):</label>
            <input
              type="text"
              value={averageWeight}
              disabled
              style={{ ...styles.input, background: "#f3f4f6", color: "#111827" }}
            />
          </div>
        </div>

        {/* Halal Certificate Upload */}
        <div style={styles.section}>
          <button type="button" onClick={triggerFileSelect} style={styles.uploadButton}>
            📤 إضافة شهادة الحلال (Upload Halal Certificate)
          </button>
          <input
            type="file"
            accept="image/*,.pdf"
            ref={fileInputRef}
            onChange={handleCertificateUpload}
            style={{ display: "none" }}
          />
          {certificateName && <div>{certificateName}</div>}
          {certificateFile && (
            <img src={certificateFile} alt="Certificate Preview" style={styles.previewImage} />
          )}
        </div>

        {/* Verifications & Inspections */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: "12px", marginTop: "0.75rem" }}>
          <div>
            <label style={styles.label}>👁️ تم الفحص بواسطة (Inspected By):</label>
            <input
              value={inspectedBy}
              onChange={e => setInspectedBy(e.target.value)}
              placeholder="اسم من قام بالفحص"
              {...inputProps("inspectedBy")}
            />
          </div>
          <div>
            <label style={styles.label}>🔍 تم التحقق بواسطة (Verified By):</label>
            <input
              value={verifiedBy}
              onChange={e => setVerifiedBy(e.target.value)}
              placeholder="اسم من قام بالتحقق"
              {...inputProps("verifiedBy")}
            />
          </div>
        </div>

        {/* Save & View */}
        <div style={{ marginTop: "1.25rem", display: "flex", gap: "10px", flexWrap: "wrap" }}>
          <button onClick={handleSave} style={styles.saveButton}>
            💾 حفظ التقرير (Save Report)
          </button>
          <button onClick={() => navigate("/qcs-raw-material-view")} style={styles.viewButton}>
            📄 عرض التقارير المحفوظة (View Saved Reports)
          </button>
        </div>
      </div>
    </div>
  );
}
