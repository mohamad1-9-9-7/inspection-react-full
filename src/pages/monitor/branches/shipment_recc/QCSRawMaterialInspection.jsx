// src/pages/QCSRawMaterialInspection.jsx
import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";

/* =============================================================================
   🔗 API Base (external only) — no import.meta
============================================================================= */
const API_ROOT_DEFAULT = "https://inspection-server-4nvj.onrender.com";
const API_ROOT =
  (typeof window !== "undefined" && window.__QCS_API__) ||
  (typeof process !== "undefined" &&
    process.env &&
    process.env.REACT_APP_API_URL) ||
  API_ROOT_DEFAULT;

const API_BASE = String(API_ROOT).replace(/\/$/, "");
const REPORTS_URL = `${API_BASE}/api/reports`;

const IS_SAME_ORIGIN = (() => {
  try {
    return new URL(API_BASE).origin === window.location.origin;
  } catch {
    return false;
  }
})();

/* =============================================================================
   ✉️ Server helpers
============================================================================= */
function getReporter() {
  try {
    const raw = localStorage.getItem("currentUser");
    const user = raw ? JSON.parse(raw) : null;
    return user?.username || "anonymous";
  } catch {
    return "anonymous";
  }
}

const makeClientId = () =>
  `cli_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;

async function sendToServer(payload) {
  const reporter = getReporter();
  const res = await fetch(REPORTS_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    credentials: IS_SAME_ORIGIN ? "include" : "omit",
    body: JSON.stringify({ reporter, type: "qcs_raw_material", payload }),
  });
  if (!res.ok) {
    const t = await res.text().catch(() => "");
    throw new Error(t || `Server error ${res.status}`);
  }
  return res.json().catch(() => ({}));
}

async function checkDuplicateAirway(airwayBill) {
  if (!airwayBill) return false;
  try {
    const res = await fetch(`${REPORTS_URL}?type=qcs_raw_material`, {
      cache: "no-store",
      credentials: IS_SAME_ORIGIN ? "include" : "omit",
      headers: { Accept: "application/json" },
    });
    if (!res.ok) return false;
    const json = await res.json();
    const arr = Array.isArray(json) ? json : json?.data || [];
    const norm = (s) => String(s || "").trim().toLowerCase();
    return arr.some(
      (rec) => norm(rec?.payload?.generalInfo?.airwayBill) === norm(airwayBill)
    );
  } catch {
    return false;
  }
}

/* =============================================================================
   ✅ Transposed samples (rows = attributes, columns = samples)
============================================================================= */
const ATTRIBUTES = [
  { key: "temperature", label: "Product Temperature", default: "" },
  { key: "ph", label: "Product PH", default: "" },
  { key: "slaughterDate", label: "Slaughter Date", default: "" },
  { key: "expiryDate", label: "Expiry Date", default: "" },
  { key: "broken", label: "Broken / Cut Pieces", default: "NIL" },
  { key: "appearance", label: "Appearance", default: "OK" },
  { key: "bloodClots", label: "Blood Clots", default: "NIL" },
  { key: "colour", label: "Colour", default: "OK" },
  { key: "fatDiscoloration", label: "Fat Discoloration", default: "NIL" },
  { key: "meatDamage", label: "Meat Damage", default: "NIL" },
  { key: "foreignMatter", label: "Hair / Foreign Matter", default: "NIL" },
  { key: "texture", label: "Texture", default: "OK" },
  { key: "testicles", label: "Testicles", default: "NIL" },
  { key: "smell", label: "Smell", default: "NIL" },
];

const newSample = () => {
  const s = { productName: "CHILLED LAMB CARCASS" };
  ATTRIBUTES.forEach((a) => (s[a.key] = a.default));
  return s;
};

/* =============================================================================
   🎨 Styles — hero + strong table borders
============================================================================= */
const styles = {
  page: {
    minHeight: "100vh",
    background: "linear-gradient(180deg, #f8fafc 0%, #eef2ff 100%)",
  },
  hero: {
    position: "relative",
    height: 220,
    background:
      "linear-gradient(135deg, #4f46e5 0%, #7c3aed 35%, #0ea5e9 100%)",
    overflow: "hidden",
  },
  heroBlobA: {
    position: "absolute",
    width: 400,
    height: 400,
    left: -120,
    top: -180,
    borderRadius: "50%",
    background:
      "radial-gradient(closest-side, rgba(255,255,255,.25), rgba(255,255,255,0))",
    filter: "blur(2px)",
  },
  heroBlobB: {
    position: "absolute",
    width: 500,
    height: 300,
    right: -140,
    top: -120,
    borderRadius: "50%",
    background:
      "radial-gradient(closest-side, rgba(255,255,255,.18), rgba(255,255,255,0))",
    transform: "rotate(-15deg)",
  },
  heroWave: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: -1,
    width: "100%",
    height: 140,
    display: "block",
  },
  containerWrap: { padding: "0 16px 32px" },
  container: {
    margin: "0 auto",
    marginTop: -80,
    padding: "1.25rem 1.5rem",
    background: "#fff",
    borderRadius: "16px",
    width: "min(1200px, 96vw)",
    direction: "ltr",
    fontFamily:
      "Inter, system-ui, -apple-system, Segoe UI, Roboto, Cairo, sans-serif",
    boxShadow:
      "0 10px 20px rgba(2, 6, 23, 0.08), 0 1px 2px rgba(2, 6, 23, 0.04)",
    border: "1px solid #e5e7eb",
  },
  titleWrap: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "1rem",
    marginBottom: "1.2rem",
  },
  title: { color: "#0f172a", margin: 0, fontSize: "1.5rem", fontWeight: 800 },
  badge: {
    fontSize: "0.85rem",
    background: "#eef2ff",
    color: "#3730a3",
    padding: "6px 10px",
    borderRadius: "999px",
    border: "1px solid #c7d2fe",
    fontWeight: 700,
  },
  section: { marginBottom: "1.25rem" },
  label: { fontWeight: 700, color: "#0f172a" },

  input: {
    width: "100%",
    padding: "12px 14px",
    borderWidth: 1,
    borderStyle: "solid",
    borderColor: "#bfdbfe",
    borderRadius: "12px",
    outline: "none",
    transition:
      "box-shadow .15s ease, border-color .15s ease, transform .08s ease",
    background: "#fff",
    boxSizing: "border-box",
  },
  select: {
    width: "100%",
    padding: "12px 14px",
    borderWidth: 1,
    borderStyle: "solid",
    borderColor: "#bfdbfe",
    borderRadius: "12px",
    outline: "none",
    transition:
      "box-shadow .15s ease, border-color .15s ease, transform .08s ease",
    background: "#fff",
    boxSizing: "border-box",
  },
  focused: {
    boxShadow: "0 0 0 4px rgba(59,130,246,.25)",
    borderColor: "#3b82f6",
    transform: "translateY(-1px)",
  },

  fieldset: {
    marginBottom: "1.5rem",
    padding: "1.25rem",
    border: "1px solid #e5e7eb",
    borderRadius: "14px",
    background: "#fafafa",
  },
  legend: { fontWeight: 800, fontSize: "1.05rem", color: "#111827" },
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
    gap: "12px",
    marginTop: "12px",
  },
  row: { display: "flex", flexDirection: "column", gap: "6px" },
  statusContainer: {
    display: "flex",
    alignItems: "center",
    gap: "0.75rem",
    marginTop: "0.5rem",
    flexWrap: "wrap",
  },

  /* ==== Samples table: strong borders (#000) ==== */
  tableWrap: {
    overflowX: "auto",
    background: "#fff",
    border: "1px solid #000",
    borderRadius: "12px",
  },
  table: {
    width: "100%",
    borderCollapse: "collapse",
    tableLayout: "fixed",
    fontSize: "0.95rem",
    border: "1px solid #000",
  },
  th: {
    backgroundColor: "#f5f5f5",
    color: "#111827",
    textAlign: "center",
    position: "sticky",
    top: 0,
    zIndex: 1,
    padding: "10px 6px",
    whiteSpace: "nowrap",
    border: "1px solid #000",
  },
  td: {
    border: "1px solid #000",
    padding: "8px 6px",
    verticalAlign: "top",
    background: "#fff",
  },
  firstColCell: {
    border: "1px solid #000",
    padding: "8px 6px",
    fontWeight: 600,
    background: "#fafafa",
    minWidth: 220,
    whiteSpace: "nowrap",
  },
  tdInput: {
    width: "100%",
    minWidth: 140,
    display: "block",
    padding: "10px 12px",
    borderWidth: 1,
    borderStyle: "solid",
    borderColor: "#000",
    borderRadius: "10px",
    outline: "none",
    transition: "box-shadow .15s ease, border-color .15s ease",
    background: "#fff",
    boxSizing: "border-box",
  },

  actionsRow: {
    display: "flex",
    gap: "12px",
    flexWrap: "wrap",
    marginTop: "1rem",
  },
  addButton: {
    padding: "10px 16px",
    background: "#4f46e5",
    color: "#fff",
    border: "1px solid #000",
    borderRadius: "10px",
    cursor: "pointer",
    fontWeight: 700,
  },
  dangerButton: {
    padding: "10px 16px",
    background: "#dc2626",
    color: "#fff",
    border: "1px solid #000",
    borderRadius: "10px",
    cursor: "pointer",
    fontWeight: 700,
  },
  uploadButton: {
    padding: "10px 16px",
    background: "#f59e0b",
    color: "#fff",
    border: "1px solid #000",
    borderRadius: "10px",
    cursor: "pointer",
    marginBottom: "0.75rem",
    fontWeight: 700,
  },
  previewImage: { maxWidth: "200px", marginTop: "0.5rem", borderRadius: "8px" },
  previewGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
    gap: "8px",
    marginTop: "8px",
  },

  formRow3: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
    gap: "12px",
    marginTop: "1rem",
  },
  saveButton: {
    padding: "12px 22px",
    background: "#16a34a",
    color: "#fff",
    border: "1px solid #000",
    borderRadius: "12px",
    cursor: "pointer",
    fontWeight: 800,
  },
  saveButtonDisabled: { opacity: 0.6, cursor: "not-allowed" },
  viewButton: {
    padding: "12px 22px",
    background: "#2563eb",
    color: "#fff",
    border: "1px solid #000",
    borderRadius: "12px",
    cursor: "pointer",
    marginTop: "0.75rem",
    fontWeight: 800,
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
    overflow: "hidden",
  },
  headerTh: {
    border: "1px solid #e5e7eb",
    background: "#f8fafc",
    textAlign: "right",
    padding: "10px 12px",
    width: "220px",
    color: "#111827",
    fontWeight: 800,
  },
  headerTd: {
    border: "1px solid #e5e7eb",
    padding: "10px 12px",
    background: "#fff",
  },
  headerInput: {
    width: "100%",
    padding: "10px 12px",
    border: "1px solid #e5e7eb",
    borderRadius: 10,
    outline: "none",
    boxSizing: "border-box",
  },

  toastWrap: {
    position: "fixed",
    left: 16,
    bottom: 16,
    zIndex: 1000,
    maxWidth: "92vw",
  },
  toast: {
    padding: "10px 14px",
    borderRadius: 12,
    boxShadow: "0 6px 16px rgba(0,0,0,.15)",
    fontWeight: 800,
    borderWidth: 1,
    borderStyle: "solid",
  },
};

/* =============================================================================
   👇 Component
============================================================================= */
export default function QCSRawMaterialInspection() {
  const navigate = useNavigate();
  const certInputRef = useRef(null);
  const imagesInputRef = useRef(null);

  const [saveMsg, setSaveMsg] = useState("");
  const [toast, setToast] = useState({ type: null, msg: "" });
  const [isSaving, setIsSaving] = useState(false);

  const [docMeta, setDocMeta] = useState({
    documentTitle: "Raw Material Inspection Report - Chilled Lamb",
    documentNo: "FS-QM/REC/RMB",
    issueDate: "2020-02-10",
    revisionNo: "0",
    area: "QA",
  });

  const [samples, setSamples] = useState([newSample()]);
  const [shipmentType, setShipmentType] = useState("");
  const [shipmentStatus, setShipmentStatus] = useState("Acceptable");
  const [inspectedBy, setInspectedBy] = useState("");
  const [verifiedBy, setVerifiedBy] = useState("");
  const [totalQuantity, setTotalQuantity] = useState("");
  const [totalWeight, setTotalWeight] = useState("");
  const [averageWeight, setAverageWeight] = useState("0");
  const [isFocused, setIsFocused] = useState(null);
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
    internationalLogger: "",
  });
  const [certificateFile, setCertificateFile] = useState(null);
  const [certificateName, setCertificateName] = useState("");
  const [images, setImages] = useState([]);
  const [notes, setNotes] = useState("");

  useEffect(() => {
    const q = parseFloat(totalQuantity);
    const w = parseFloat(totalWeight);
    setAverageWeight(q > 0 && w > 0 ? (w / q).toFixed(3) : "0");
  }, [totalQuantity, totalWeight]);

  const setSampleValue = (index, key, value) => {
    setSamples((prev) =>
      prev.map((s, i) => (i === index ? { ...s, [key]: value } : s))
    );
  };
  const addSample = () => setSamples((prev) => [...prev, newSample()]);
  const removeSample = () =>
    setSamples((prev) => (prev.length > 1 ? prev.slice(0, -1) : prev));

  const handleGeneralChange = (field, value) =>
    setGeneralInfo((prev) => ({ ...prev, [field]: value }));

  const handleCertificateUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => setCertificateFile(String(reader.result || ""));
    reader.readAsDataURL(file);
    setCertificateName(file.name);
  };
  const triggerCertSelect = () => certInputRef.current?.click();

  const handleImagesUpload = (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    files.forEach((file) => {
      const reader = new FileReader();
      reader.onloadend = () =>
        setImages((prev) => [
          ...prev,
          { name: file.name, data: String(reader.result || "") },
        ]);
      reader.readAsDataURL(file);
    });
  };
  const triggerImagesSelect = () => imagesInputRef.current?.click();

  const buildReportPayload = () => ({
    clientId: makeClientId(),
    date: new Date().toISOString(),
    shipmentType,
    status: shipmentStatus,
    generalInfo,
    samples,
    inspectedBy,
    verifiedBy,
    totalQuantity,
    totalWeight,
    averageWeight,
    certificateFile,
    certificateName,
    images,
    docMeta,
    notes,
  });

  const showToast = (type, msg) => {
    setToast({ type, msg });
    window.clearTimeout(showToast._t);
    showToast._t = window.setTimeout(() => setToast({ type: null, msg: "" }), 3000);
  };

  const toastColors = (type) => {
    switch (type) {
      case "success":
        return { bg: "#ecfdf5", fg: "#065f46", bd: "#34d399" };
      case "error":
        return { bg: "#fef2f2", fg: "#991b1b", bd: "#fca5a5" };
      case "info":
      default:
        return { bg: "#eff6ff", fg: "#1e3a8a", bd: "#93c5fd" };
    }
  };

  const handleSave = async () => {
    if (isSaving) return;
    if (!shipmentType.trim()) {
      alert("Please choose Shipment Type before saving.");
      return;
    }
    const airway = (generalInfo.airwayBill || "").trim();
    if (airway) {
      const exists = await checkDuplicateAirway(airway);
      if (exists) {
        showToast("error", "Duplicate Air Way Bill detected.");
        setSaveMsg("Duplicate Air Way Bill.");
        return;
      }
    }

    const ok = window.confirm("Confirm saving to external server?");
    if (!ok) {
      setSaveMsg("Save canceled.");
      showToast("info", "Save canceled.");
      return;
    }

    try {
      setIsSaving(true);
      setSaveMsg("Saving to server…");
      showToast("info", "Saving…");
      await sendToServer(buildReportPayload());
      setSaveMsg("Saved successfully!");
      showToast("success", "Saved successfully ✅");
    } catch (e) {
      const msg = `Save failed: ${e?.message || e}`;
      setSaveMsg(msg);
      showToast("error", msg);
    } finally {
      setIsSaving(false);
      window.clearTimeout(handleSave._t);
      handleSave._t = window.setTimeout(() => setSaveMsg(""), 3000);
    }
  };

  const inputProps = (name) => ({
    onFocus: () => setIsFocused(name),
    onBlur: () => setIsFocused(null),
    style: { ...styles.input, ...(isFocused === name ? styles.focused : {}) },
  });
  const selectProps = (name) => ({
    onFocus: () => setIsFocused(name),
    onBlur: () => setIsFocused(null),
    style: { ...styles.select, ...(isFocused === name ? styles.focused : {}) },
  });

  // Ensure enough width; allow horizontal scroll
  const tableMinWidth = 240 /* first col */ + samples.length * 160;

  return (
    <div style={styles.page}>
      {/* Hero */}
      <div style={styles.hero} aria-hidden="true">
        <div style={styles.heroBlobA} />
        <div style={styles.heroBlobB} />
        <svg viewBox="0 0 1440 140" preserveAspectRatio="none" style={styles.heroWave}>
          <path
            fill="#ffffff"
            d="M0,64 C240,128 480,0 720,32 C960,64 1200,160 1440,96 L1440,140 L0,140 Z"
          />
        </svg>
      </div>

      <div style={styles.containerWrap}>
        <div style={styles.container}>
          <div style={styles.titleWrap}>
            <h2 style={styles.title}>📦 QCS Incoming Shipments Report</h2>
            <span style={styles.badge}>
              Manual Save Only{saveMsg ? <b> · {saveMsg}</b> : null}
            </span>
          </div>

          {/* Header (editable) */}
          <div style={styles.headerWrap}>
            <table style={styles.headerTable}>
              <colgroup>
                <col />
                <col />
                <col />
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
                      onChange={(e) =>
                        setDocMeta({ ...docMeta, documentTitle: e.target.value })
                      }
                    />
                  </td>
                  <th style={styles.headerTh}>Document No</th>
                  <td style={styles.headerTd}>
                    <input
                      {...inputProps("documentNo")}
                      value={docMeta.documentNo}
                      onChange={(e) =>
                        setDocMeta({ ...docMeta, documentNo: e.target.value })
                      }
                    />
                  </td>
                  <td />
                </tr>
                <tr>
                  <th style={styles.headerTh}>Issue Date</th>
                  <td style={styles.headerTd}>
                    <input
                      type="date"
                      {...inputProps("issueDate")}
                      value={docMeta.issueDate}
                      onChange={(e) =>
                        setDocMeta({ ...docMeta, issueDate: e.target.value })
                      }
                    />
                  </td>
                  <th style={styles.headerTh}>Revision No</th>
                  <td style={styles.headerTd}>
                    <input
                      {...inputProps("revisionNo")}
                      value={docMeta.revisionNo}
                      onChange={(e) =>
                        setDocMeta({ ...docMeta, revisionNo: e.target.value })
                      }
                    />
                  </td>
                  <td />
                </tr>
                <tr>
                  <th style={styles.headerTh}>Area</th>
                  <td style={styles.headerTd} colSpan={3}>
                    <input
                      {...inputProps("area")}
                      value={docMeta.area}
                      onChange={(e) =>
                        setDocMeta({ ...docMeta, area: e.target.value })
                      }
                    />
                  </td>
                  <td />
                </tr>
              </tbody>
            </table>
          </div>

          {/* Shipment Type */}
          <div style={styles.section}>
            <label style={styles.label}>Shipment Type:</label>
            <select
              value={shipmentType}
              onChange={(e) => setShipmentType(e.target.value)}
              {...selectProps("shipmentType")}
            >
              <option value="">-- Select --</option>
              <option value="LAMB AUS">LAMB AUS</option>
              <option value="MUTTON AUS">MUTTON AUS</option>
              <option value="LAMB S.A">LAMB S.A</option>
              <option value="MUTTON S.A">MUTTON S.A</option>
              <option value="VACUUM">VACUUM</option>
              <option value="FROZEN">FROZEN</option>
              <option value="PAK">PAK</option>
              <option value="KHZ">KHZ</option>
              <option value="IND MUTTON">IND MUTTON</option>
              <option value="IND VEAL">IND VEAL</option>
              <option value="FRESH LAMB">FRESH LAMB</option>
              <option value="FRESH CHICKEN">FRESH CHICKEN</option>
            </select>
          </div>

          {/* General Information */}
          <fieldset style={styles.fieldset}>
            <legend style={styles.legend}>General Information</legend>
            <div style={styles.grid}>
              {[
                ["Report On", "reportOn", "date"],
                ["Sample Received On", "receivedOn", "date"],
                ["Inspection Date", "inspectionDate", "date"],
                ["Temperature", "temperature", "text"],
                ["Brand", "brand", "text"],
                ["Invoice No", "invoiceNo", "text"],
                ["PH", "ph", "text"],
                ["Origin", "origin", "text"],
                ["Air Way Bill No", "airwayBill", "text"],
                ["Local Logger", "localLogger", "select"],
                ["International Logger", "internationalLogger", "select"],
              ].map(([label, field, type]) => (
                <div key={field} style={styles.row}>
                  <label style={styles.label}>{label}:</label>
                  {type === "select" ? (
                    <select
                      value={generalInfo[field]}
                      onChange={(e) => handleGeneralChange(field, e.target.value)}
                      {...selectProps(field)}
                    >
                      <option value="">-- Select --</option>
                      <option value="YES">YES</option>
                      <option value="NO">NO</option>
                    </select>
                  ) : type === "date" ? (
                    <input
                      type="date"
                      value={generalInfo[field]}
                      onChange={(e) => handleGeneralChange(field, e.target.value)}
                      {...inputProps(field)}
                    />
                  ) : (
                    <input
                      value={generalInfo[field]}
                      onChange={(e) => handleGeneralChange(field, e.target.value)}
                      {...inputProps(field)}
                    />
                  )}
                </div>
              ))}
            </div>

            {/* Status */}
            <div style={{ marginTop: "1rem" }}>
              <label style={styles.label}>Shipment Status:</label>
              <div style={styles.statusContainer}>
                <select
                  value={shipmentStatus}
                  onChange={(e) => setShipmentStatus(e.target.value)}
                  {...selectProps("shipmentStatus")}
                  style={{
                    ...selectProps("shipmentStatus").style,
                    fontWeight: 800,
                    color:
                      shipmentStatus === "Acceptable"
                        ? "#16a34a"
                        : shipmentStatus === "Average"
                        ? "#d97706"
                        : "#dc2626",
                  }}
                >
                  <option value="Acceptable">✅ Acceptable</option>
                  <option value="Average">⚠️ Average</option>
                  <option value="Below Average">❌ Below Average</option>
                </select>
                <span
                  style={{
                    fontWeight: 800,
                    color:
                      shipmentStatus === "Acceptable"
                        ? "#16a34a"
                        : shipmentStatus === "Average"
                        ? "#d97706"
                        : "#dc2626",
                  }}
                >
                  {shipmentStatus}
                </span>
              </div>
            </div>
          </fieldset>

          {/* Transposed Samples */}
          <h4 style={styles.section}>Test Samples</h4>
          <div style={styles.tableWrap}>
            <table style={{ ...styles.table, minWidth: tableMinWidth }}>
              <thead>
                <tr>
                  <th style={{ ...styles.th, minWidth: 220, textAlign: "left" }}>
                    Attribute
                  </th>
                  {samples.map((_, idx) => (
                    <th key={idx} style={styles.th}>
                      Sample {idx + 1}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {/* Product Name row */}
                <tr>
                  <td style={styles.firstColCell}>PRODUCT NAME</td>
                  {samples.map((s, i) => (
                    <td key={i} style={styles.td}>
                      <input
                        value={s.productName}
                        onChange={(e) =>
                          setSampleValue(i, "productName", e.target.value)
                        }
                        style={styles.tdInput}
                        onFocus={(e) => {
                          e.currentTarget.style.boxShadow =
                            "0 0 0 3px rgba(37,99,235,.25)";
                          e.currentTarget.style.borderColor = "#2563eb";
                        }}
                        onBlur={(e) => {
                          e.currentTarget.style.boxShadow = "none";
                          e.currentTarget.style.borderColor = "#000";
                        }}
                      />
                    </td>
                  ))}
                </tr>

                {ATTRIBUTES.map((attr) => (
                  <tr
                    key={attr.key}
                    style={
                      ["temperature", "ph", "slaughterDate", "expiryDate"].includes(
                        attr.key
                      )
                        ? { background: "#f8fafc" }
                        : undefined
                    }
                  >
                    <td style={styles.firstColCell}>{attr.label}</td>
                    {samples.map((s, i) => (
                      <td key={i} style={styles.td}>
                        <input
                          value={s[attr.key]}
                          onChange={(e) => setSampleValue(i, attr.key, e.target.value)}
                          style={styles.tdInput}
                          onFocus={(e) => {
                            e.currentTarget.style.boxShadow =
                              "0 0 0 3px rgba(37,99,235,.25)";
                            e.currentTarget.style.borderColor = "#2563eb";
                          }}
                          onBlur={(e) => {
                            e.currentTarget.style.boxShadow = "none";
                            e.currentTarget.style.borderColor = "#000";
                          }}
                        />
                      </td>
                    ))}
                  </tr>
                ))}

                {/* Add/Remove sample (columns) */}
                <tr>
                  <td
                    colSpan={1 + samples.length}
                    style={{ padding: "1rem" }}
                  >
                    <div
                      style={{
                        display: "flex",
                        gap: 10,
                        justifyContent: "center",
                        flexWrap: "wrap",
                      }}
                    >
                      <button onClick={addSample} style={styles.addButton}>
                        ➕ Add Sample (column)
                      </button>
                      <button
                        onClick={removeSample}
                        style={styles.dangerButton}
                        disabled={samples.length <= 1}
                        title={
                          samples.length <= 1
                            ? "At least one sample is required"
                            : "Remove last sample column"
                        }
                      >
                        🗑 Remove Sample (column)
                      </button>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Notes */}
          <div style={{ marginTop: 12 }}>
            <label style={styles.label}>Notes:</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={4}
              placeholder="Write any additional notes here..."
              style={{
                ...styles.input,
                minHeight: "110px",
                resize: "vertical",
                lineHeight: "1.6",
              }}
            />
          </div>

          {/* Quantity & Weights */}
          <div style={styles.formRow3}>
            <div>
              <label style={styles.label}>Total Quantity (pcs):</label>
              <input
                type="number"
                value={totalQuantity}
                onChange={(e) => setTotalQuantity(e.target.value)}
                placeholder="e.g., 1000"
                {...inputProps("totalQuantity")}
              />
            </div>
            <div>
              <label style={styles.label}>Total Weight (kg):</label>
              <input
                type="number"
                value={totalWeight}
                onChange={(e) => setTotalWeight(e.target.value)}
                placeholder="e.g., 750"
                {...inputProps("totalWeight")}
              />
            </div>
            <div>
              <label style={styles.label}>Average Weight (kg):</label>
              <input
                type="text"
                value={averageWeight}
                disabled
                style={{
                  ...styles.input,
                  background: "#f3f4f6",
                  color: "#111827",
                }}
              />
            </div>
          </div>

          {/* Uploads */}
          <div style={styles.section}>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <button type="button" onClick={triggerCertSelect} style={styles.uploadButton}>
                📤 Upload Halal Certificate
              </button>
              <input
                type="file"
                accept="image/*,.pdf"
                ref={certInputRef}
                onChange={handleCertificateUpload}
                style={{ display: "none" }}
              />

              <button type="button" onClick={triggerImagesSelect} style={styles.uploadButton}>
                📸 Upload Images
              </button>
              <input
                type="file"
                accept="image/*"
                multiple
                ref={imagesInputRef}
                onChange={handleImagesUpload}
                style={{ display: "none" }}
              />
            </div>

            {certificateName && <div>{certificateName}</div>}
            {certificateFile &&
              (String(certificateFile).startsWith("data:image/") ? (
                <img
                  src={certificateFile}
                  alt="Certificate Preview"
                  style={styles.previewImage}
                />
              ) : (
                <div style={{ marginTop: 6, fontSize: 13, color: "#374151" }}>
                  ✔️ PDF certificate uploaded (Base64 will be saved with the report)
                </div>
              ))}

            {images.length > 0 && (
              <div style={styles.previewGrid}>
                {images.map((img, i) => (
                  <img
                    key={`${img.name}-${i}`}
                    src={img.data}
                    alt={img.name}
                    style={{
                      width: "100%",
                      borderRadius: 8,
                      border: "1px solid #e5e7eb",
                    }}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Signatures */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
              gap: "12px",
              marginTop: "0.75rem",
            }}
          >
            <div>
              <label style={styles.label}>Inspected By:</label>
              <input
                value={inspectedBy}
                onChange={(e) => setInspectedBy(e.target.value)}
                placeholder="Inspector name"
                {...inputProps("inspectedBy")}
              />
            </div>
            <div>
              <label style={styles.label}>Verified By:</label>
              <input
                value={verifiedBy}
                onChange={(e) => setVerifiedBy(e.target.value)}
                placeholder="Verifier name"
                {...inputProps("verifiedBy")}
              />
            </div>
          </div>

          {/* Actions */}
          <div
            style={{
              marginTop: "1.25rem",
              display: "flex",
              gap: "10px",
              flexWrap: "wrap",
            }}
          >
            <button
              onClick={handleSave}
              style={{
                ...styles.saveButton,
                ...(isSaving ? styles.saveButtonDisabled : {}),
              }}
              disabled={isSaving}
              title={isSaving ? "Saving..." : "Save report"}
            >
              {isSaving ? "⏳ Saving..." : "💾 Save Report"}
            </button>
            <button
              onClick={() => navigate("/qcs-raw-material-view")}
              style={styles.viewButton}
            >
              📄 View Reports
            </button>
          </div>
        </div>
      </div>

      {/* Toast */}
      {toast.type && (
        <div style={styles.toastWrap}>
          <div
            role="alert"
            style={{
              ...styles.toast,
              background: toastColors(toast.type).bg,
              color: toastColors(toast.type).fg,
              borderColor: toastColors(toast.type).bd,
            }}
          >
            {toast.msg}
          </div>
        </div>
      )}
    </div>
  );
}
