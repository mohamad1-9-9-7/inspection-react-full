import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";

// Initial empty sample structure
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

// Inline styles
const styles = {
  container: {
    padding: "3rem",
    background: "#fff",
    borderRadius: "12px",
    margin: "2rem auto",
    maxWidth: "100%",      // changed here
    width: "95vw",         // added here
    direction: "rtl",
    fontFamily: "Cairo, sans-serif"
  },
  title: { color: "#2c3e50", marginBottom: "1.5rem" },
  section: { marginBottom: "1.5rem" },
  label: { fontWeight: "bold" },
  input: {
    width: "60%",
    padding: "10px",
    marginRight: "0.5rem",
    border: "1px solid #ccc",
    borderRadius: "6px"
  },
  select: {
    width: "60%",
    padding: "10px",
    marginTop: "0.5rem",
    border: "1px solid #ccc",
    borderRadius: "6px"
  },
  fieldset: {
    marginBottom: "2rem",
    padding: "1.5rem",
    border: "1px solid #ccc",
    borderRadius: "10px"
  },
  legend: { fontWeight: "bold", fontSize: "1.1rem" },
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))",
    gap: "1rem",
    marginTop: "1rem"
  },
  statusContainer: { display: "flex", alignItems: "center", gap: "1rem", marginTop: "0.5rem" },
  tableContainer: { overflowX: "auto" },
  table: { width: "100%", borderCollapse: "collapse", fontSize: "0.95rem" },
  th: { backgroundColor: "#f0f0f0", textAlign: "center" },
  tdInput: { width: "100%", padding: "6px", border: "1px solid #ccc", borderRadius: "4px" },
  addButton: { padding: "8px 16px", background: "#8e44ad", color: "#fff", border: "none", borderRadius: "6px", cursor: "pointer" },
  uploadButton: { padding: "8px 16px", background: "#d35400", color: "#fff", border: "none", borderRadius: "6px", cursor: "pointer", marginBottom: "1rem" },
  previewImage: { maxWidth: "200px", marginTop: "0.5rem", borderRadius: "6px" },
  formRow: { marginTop: "1.5rem", display: "flex", gap: "1rem", alignItems: "center" },
  half: { flex: 1 },
  saveButton: { padding: "10px 24px", background: "#27ae60", color: "#fff", border: "none", borderRadius: "8px", cursor: "pointer" },
  viewButton: { padding: "10px 24px", background: "#2980b9", color: "#fff", border: "none", borderRadius: "8px", cursor: "pointer", marginTop: "1rem" }
};

export default function QCSRawMaterialInspection() {
  const navigate = useNavigate();
  const fileInputRef = useRef(null);

  // State declarations
  const [samples, setSamples] = useState([initialSample]);
  const [reportTitle, setReportTitle] = useState("");
  const [shipmentType, setShipmentType] = useState("");
  const [shipmentStatus, setShipmentStatus] = useState("مرضي");
  const [inspectedBy, setInspectedBy] = useState("");
  const [verifiedBy, setVerifiedBy] = useState("");
  const [totalQuantity, setTotalQuantity] = useState("");
  const [totalWeight, setTotalWeight] = useState("");
  const [averageWeight, setAverageWeight] = useState("0");
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

  // Calculate average weight
  useEffect(() => {
    const q = parseFloat(totalQuantity);
    const w = parseFloat(totalWeight);
    if (q > 0 && w > 0) {
      setAverageWeight((w / q).toFixed(3));
    } else {
      setAverageWeight("0");
    }
  }, [totalQuantity, totalWeight]);

  // Handlers
  const handleSampleChange = (index, field, value) => {
    const updated = [...samples];
    updated[index][field] = value;
    setSamples(updated);
  };

  const handleGeneralChange = (field, value) => {
    setGeneralInfo(prev => ({ ...prev, [field]: value }));
  };

  const addSample = () => {
    setSamples(prev => [...prev, initialSample]);
  };

  const handleCertificateUpload = e => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setCertificateFile(reader.result);
      reader.readAsDataURL(file);
      setCertificateName(file.name);
    }
  };

  const triggerFileSelect = () => {
    fileInputRef.current?.click();
  };

  const handleSave = () => {
    if (!reportTitle.trim()) {
      alert("📝 الرجاء إدخال عنوان أو رقم التقرير.");
      return;
    }
    if (!shipmentType.trim()) {
      alert("📦 الرجاء اختيار نوع الشحنة.");
      return;
    }

    const allReports = JSON.parse(localStorage.getItem("qcs_raw_material_reports") || "[]");
    const newReport = {
      id: Date.now(),
      title: reportTitle,
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
      certificateName
    };

    allReports.push(newReport);
    localStorage.setItem("qcs_raw_material_reports", JSON.stringify(allReports));

    alert("✅ تم حفظ التقرير الجديد بنجاح");

    // Reset form
    setReportTitle("");
    setShipmentType("");
    setSamples([initialSample]);
    setInspectedBy("");
    setVerifiedBy("");
    setTotalQuantity("");
    setTotalWeight("");
    setAverageWeight("0");
    setCertificateFile(null);
    setCertificateName("");
  };

  return (
    <div style={styles.container}>
      <h2 style={styles.title}>📦 تقرير استلام شحنات - QCS</h2>

      {/* Report Title */}
      <div style={styles.section}>
        <label style={styles.label}>📌 عنوان التقرير (Report Title):</label>
        <input
          value={reportTitle}
          onChange={e => setReportTitle(e.target.value)}
          placeholder="مثال: شحنة رقم 3 - تاريخ 28/07"
          style={styles.input}
        />
      </div>

      {/* Shipment Type */}
      <div style={styles.section}>
        <label style={styles.label}>📦 نوع الشحنة (Shipment Type):</label>
        <select
          value={shipmentType}
          onChange={e => setShipmentType(e.target.value)}
          style={styles.select}
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
            ["📅 تاريخ التقرير (Report On)", "reportOn"],
            ["📥 تاريخ الاستلام (Sample Received On)", "receivedOn"],
            ["🔍 تاريخ الفحص (Inspection Date)", "inspectionDate"],
            ["🌡️ درجة الحرارة (Temperature)", "temperature"],
            ["🏷️ العلامة التجارية (Brand)", "brand"],
            ["🧾 رقم الفاتورة (Invoice No)", "invoiceNo"],
            ["🔬 درجة الحموضة (PH)", "ph"],
            ["🌍 بلد المنشأ (Origin)", "origin"],
            ["📦 رقم بوليصة الشحن (Air Way Bill No)", "airwayBill"],
            ["📡 جهاز التسجيل المحلي (Local Logger)", "localLogger"],
            ["🌐 جهاز التسجيل الدولي (International Logger)", "internationalLogger"]
          ].map(([label, field]) => (
            <div key={field}>
              <label>{label}:</label>
              {(field === "localLogger" || field === "internationalLogger") ? (
                <select
                  value={generalInfo[field]}
                  onChange={e => handleGeneralChange(field, e.target.value)}
                  style={styles.select}
                >
                  <option value="">-- اختر --</option>
                  <option value="YES">YES</option>
                  <option value="NO">NO</option>
                </select>
              ) : label.includes("تاريخ") ? (
                <input
                  type="date"
                  value={generalInfo[field]}
                  onChange={e => handleGeneralChange(field, e.target.value)}
                  style={styles.input}
                />
              ) : (
                <input
                  value={generalInfo[field]}
                  onChange={e => handleGeneralChange(field, e.target.value)}
                  style={styles.input}
                />
              )}
            </div>
          ))}
        </div>

        {/* Shipment Status */}
        <div style={{ marginTop: "1.5rem" }}>
          <label style={styles.label}>⚠️ حالة الشحنة (Shipment Status):</label>
          <div style={styles.statusContainer}>
            <select
              value={shipmentStatus}
              onChange={e => setShipmentStatus(e.target.value)}
              style={{
                padding: "8px",
                fontWeight: "bold",
                borderRadius: "6px",
                border: "1px solid #aaa",
                color:
                  shipmentStatus === "مرضي"
                    ? "#27ae60"
                    : shipmentStatus === "وسط"
                    ? "#e67e22"
                    : "#c0392b"
              }}
            >
              <option value="مرضي">✅ مرضي (Acceptable)</option>
              <option value="وسط">⚠️ وسط (Average)</option>
              <option value="تحت الوسط">❌ تحت الوسط (Below Average)</option>
            </select>
            <span
              style={{
                fontWeight: "bold",
                color:
                  shipmentStatus === "مرضي"
                    ? "#27ae60"
                    : shipmentStatus === "وسط"
                    ? "#e67e22"
                    : "#c0392b"
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
      <div style={styles.tableContainer}>
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
              <tr key={idx} style={{ textAlign: "center", borderBottom: "1px solid #ddd" }}>
                <td>{idx + 1}</td>
                {Object.keys(sample).map(key => (
                  <td key={key}>
                    <input
                      value={sample[key]}
                      onChange={e => handleSampleChange(idx, key, e.target.value)}
                      style={styles.tdInput}
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

      {/* Quantity & Weight */}
      <div style={styles.formRow}>
        <div style={styles.half}>
          <label style={styles.label}>📦 عدد الحبات الكلي:</label>
          <input
            type="number"
            value={totalQuantity}
            onChange={e => setTotalQuantity(e.target.value)}
            placeholder="مثال: 1000"
            style={styles.input}
          />
        </div>
        <div style={styles.half}>
          <label style={styles.label}>⚖️ وزن الشحنة الكلي (كجم):</label>
          <input
            type="number"
            value={totalWeight}
            onChange={e => setTotalWeight(e.target.value)}
            placeholder="مثال: 750"
            style={styles.input}
          />
        </div>
        <div style={styles.half}>
          <label style={styles.label}>🔢 متوسط وزن الحبة (كجم):</label>
          <input
            type="text"
            value={averageWeight}
            disabled
            style={{ ...styles.input, background: "#f5f5f5" }}
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
      <div style={{ display: "flex", justifyContent: "space-between", marginTop: "2rem", gap: "1rem" }}>
        <div style={styles.half}>
          <label style={styles.label}>👁️ تم الفحص بواسطة (Inspected By):</label>
          <input
            value={inspectedBy}
            onChange={e => setInspectedBy(e.target.value)}
            placeholder="اسم من قام بالفحص"
            style={styles.input}
          />
        </div>
        <div style={styles.half}>
          <label style={styles.label}>🔍 تم التحقق بواسطة (Verified By):</label>
          <input
            value={verifiedBy}
            onChange={e => setVerifiedBy(e.target.value)}
            placeholder="اسم من قام بالتحقق"
            style={styles.input}
          />
        </div>
      </div>

      {/* Save & View Buttons */}
      <div style={{ marginTop: "2rem" }}>
        <button onClick={handleSave} style={styles.saveButton}>
          💾 حفظ التقرير (Save Report)
        </button>
      </div>
      <div>
        <button
          onClick={() => navigate("/qcs-raw-material-view")}
          style={styles.viewButton}
        >
          📄 عرض التقارير المحفوظة (View Saved Reports)
        </button>
      </div>
    </div>
  );
}
