// QCSRawMaterialForm.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  sendToServer,
  listReportsByType,
  postMeta,
  deriveUniqueKey,
  normStr,
  todayIso,
  toYMD,
  ymdToDMY,
  uploadImageToServer,
  makeClientId,
  deleteImage,
} from "./qcsRawApi";

/* ===== Helpers ===== */
const makeStableId = () =>
  (typeof crypto !== "undefined" && crypto.randomUUID)
    ? crypto.randomUUID()
    : `id_${Math.random().toString(36).slice(2)}_${Date.now().toString(36)}`;

/* ===== attributes & defaults ===== */
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
  const s = { id: makeStableId(), productName: "" };
  ATTRIBUTES.forEach((a) => (s[a.key] = a.default));
  return s;
};

const TYPES_LS_KEY = "qcs_shipment_types_v1";
const DEFAULT_TYPES = [
  "LAMB AUS","MUTTON AUS","LAMB S.A","MUTTON S.A","VACUUM","FROZEN",
  "PAK","KHZ","IND MUTTON","IND VEAL","FRESH LAMB","FRESH CHICKEN",
];
const uniq = (arr) => Array.from(new Set(arr.map((x) => normStr(x))));
const getLocalTypes = () => {
  try {
    const raw = localStorage.getItem(TYPES_LS_KEY);
    const arr = raw ? JSON.parse(raw) : [];
    return Array.isArray(arr) ? arr : [];
  } catch { return []; }
};
const saveLocalType = (name) => {
  try {
    const arr = uniq([...getLocalTypes(), name]);
    localStorage.setItem(TYPES_LS_KEY, JSON.stringify(arr));
  } catch {}
};

/* ===== styles بسيطة ===== */
const styles = {
  page: { minHeight: "100vh", background: "linear-gradient(180deg,#f8fafc 0%,#eef2ff 100%)" },
  hero: { position: "relative", height: 120, background: "linear-gradient(135deg,#4f46e5 0%,#7c3aed 35%,#0ea5e9 100%)" },
  containerWrap: { padding: "0 16px 32px" },
  container: {
    margin: "0 auto", marginTop: -60, padding: "1.25rem 1.5rem", background: "#fff", borderRadius: 14,
    width: "min(1200px,96vw)", direction: "ltr", fontFamily: "Inter,system-ui,-apple-system,Segoe UI,Roboto,Cairo,sans-serif",
    boxShadow: "0 10px 20px rgba(2,6,23,.08), 0 1px 2px rgba(2,6,23,.04)", border: "1px solid #e5e7eb",
  },
  titleWrap: { display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, marginBottom: 12 },
  title: { color: "#0f172a", margin: 0, fontSize: "1.35rem", fontWeight: 800 },
  badge: { fontSize: ".85rem", background: "#eef2ff", color: "#3730a3", padding: "6px 10px", borderRadius: 999, border: "1px solid #c7d2fe", fontWeight: 700 },
  section: { marginBottom: 16 },
  label: { fontWeight: 700, color: "#0f172a" },
  input: { width: "100%", padding: "10px 12px", border: "1px solid #bfdbfe", borderRadius: 10, outline: "none", background: "#fff", boxSizing: "border-box" },
  select: { width: "100%", padding: "10px 12px", border: "1px solid #bfdbfe", borderRadius: 10, outline: "none", background: "#fff", boxSizing: "border-box" },
  focused: { boxShadow: "0 0 0 4px rgba(59,130,246,.25)", borderColor: "#3b82f6" },
  fieldset: { marginBottom: 18, padding: 12, border: "1px solid #e5e7eb", borderRadius: 12, background: "#fafafa" },
  legend: { fontWeight: 800, fontSize: "1.02rem", color: "#111827" },
  grid: { display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(260px,1fr))", gap: 10, marginTop: 10 },
  row: { display: "flex", flexDirection: "column", gap: 6 },
  tableWrap: { overflowX: "auto", background: "#fff", border: "1px solid #000", borderRadius: 10 },
  table: { width: "100%", borderCollapse: "collapse", tableLayout: "fixed", fontSize: ".94rem", border: "1px solid #000" },
  th: { backgroundColor: "#f5f5f5", color: "#111827", textAlign: "center", position: "sticky", top: 0, zIndex: 1, padding: "8px 6px", whiteSpace: "nowrap", border: "1px solid #000" },
  td: { border: "1px solid #000", padding: "6px 6px", verticalAlign: "top", background: "#fff" },
  firstColCell: { border: "1px solid #000", padding: "6px 6px", fontWeight: 600, background: "#fafafa", minWidth: 200, whiteSpace: "nowrap" },
  tdInput: { width: "100%", minWidth: 140, display: "block", padding: "8px 10px", border: "1px solid #000", borderRadius: 10, outline: "none", background: "#fff", boxSizing: "border-box" },
  addButton: { padding: "8px 14px", background: "#4f46e5", color: "#fff", border: "1px solid #000", borderRadius: 10, cursor: "pointer", fontWeight: 700 },
  dangerButton: { padding: "8px 14px", background: "#dc2626", color: "#fff", border: "1px solid #000", borderRadius: 10, cursor: "pointer", fontWeight: 700 },
  uploadButton: { padding: "8px 14px", background: "#f59e0b", color: "#fff", border: "1px solid #000", borderRadius: 10, cursor: "pointer", marginBottom: 8, fontWeight: 700 },
  formRow3: { display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))", gap: 10, marginTop: 10 },
  saveButton: { padding: "10px 18px", background: "#16a34a", color: "#fff", border: "1px solid #000", borderRadius: 10, cursor: "pointer", fontWeight: 800 },
  saveButtonDisabled: { opacity: .6, cursor: "not-allowed" },
  viewButton: { padding: "10px 18px", background: "#2563eb", color: "#fff", border: "1px solid #000", borderRadius: 10, cursor: "pointer", fontWeight: 800 },
  toastWrap: { position: "fixed", left: 16, bottom: 16, zIndex: 1000, maxWidth: "92vw" },
  toast: { padding: "10px 14px", borderRadius: 12, boxShadow: "0 6px 16px rgba(0,0,0,.15)", fontWeight: 800, borderWidth: 1, borderStyle: "solid" },
};

/* ===== Locks & constants ===== */
const SAVE_COOLDOWN_MS = 1200;

export default function QCSRawMaterialForm() {
  const navigate = useNavigate();
  const certInputRef = useRef(null);
  const imagesInputRef = useRef(null);

  const [saveMsg, setSaveMsg] = useState("");
  const [toast, setToast] = useState({ type: null, msg: "" });
  const [isSaving, setIsSaving] = useState(false);

  const saveLockRef = useRef(false);
  const lastSaveTsRef = useRef(0);

  const [isUploadingCert, setIsUploadingCert] = useState(false);
  const [isUploadingImages, setIsUploadingImages] = useState(false);

  const [docMeta, setDocMeta] = useState({
    documentTitle: "Raw Material Inspection Report",
    documentNo: "FS-QM/REC/RMB",
    issueDate: "2020-02-10",
    revisionNo: "0",
    area: "QA",
  });

  // Samples with stable IDs
  const [samples, setSamples] = useState([newSample()]);
  const [shipmentType, setShipmentType] = useState("");
  const [shipmentTypes, setShipmentTypes] = useState(DEFAULT_TYPES);
  const [newType, setNewType] = useState("");

  const [shipmentStatus, setShipmentStatus] = useState("Acceptable");
  const [inspectedBy, setInspectedBy] = useState("");
  const [verifiedBy, setVerifiedBy] = useState("");
  const [totalQuantity, setTotalQuantity] = useState("");
  const [totalWeight, setTotalWeight] = useState("");
  const [averageWeight, setAverageWeight] = useState("");
  const [isFocusedName, setIsFocusedName] = useState(null);
  const [generalInfo, setGeneralInfo] = useState({
    reportOn: "",
    receivedOn: "",
    inspectionDate: "",
    temperature: "",
    brand: "",
    invoiceNo: "",
    supplierName: "",
    ph: "",
    origin: "",
    airwayBill: "",
    localLogger: "",
    internationalLogger: "",
  });

  // شهادة: رابط فقط
  const [certificateUrl, setCertificateUrl] = useState("");
  const [certificateName, setCertificateName] = useState("");

  // صور المنتجات: روابط فقط (منع التكرار)
  const [images, setImages] = useState([]);
  const [notes, setNotes] = useState("");

  // product lines with stable IDs
  const makeEmptyLine = () => ({ id: makeStableId(), name: "", qty: "", weight: "" });
  const [productLines, setProductLines] = useState([makeEmptyLine()]);

  const sanitizeNum = (v) => {
    const n = parseFloat(String(v ?? "").replace(",", ".").replace(/[^\d.\-]/g, ""));
    return Number.isFinite(n) && n >= 0 ? n : 0;
  };
  const totalQtyCalc = useMemo(
    () => productLines.reduce((acc, r) => acc + sanitizeNum(r.qty), 0),
    [productLines]
  );
  const totalWeightCalc = useMemo(
    () => productLines.reduce((acc, r) => acc + sanitizeNum(r.weight), 0),
    [productLines]
  );
  useEffect(() => {
    setTotalQuantity(totalQtyCalc > 0 ? String(totalQtyCalc) : "");
    setTotalWeight(totalWeightCalc > 0 ? String(totalWeightCalc) : "");
  }, [totalQtyCalc, totalWeightCalc]);

  // avgs
  const parseNum = (v) => {
    const n = parseFloat(String(v ?? "").replace(",", ".").replace(/[^\d.\-]/g, ""));
    return Number.isFinite(n) ? n : null;
  };
  const avgOf = (arr) => {
    const nums = arr.map(parseNum).filter((n) => n !== null);
    if (!nums.length) return "";
    const avg = nums.reduce((a, b) => a + b, 0) / nums.length;
    return avg.toFixed(2);
  };
  const avgTemp = useMemo(() => avgOf(samples.map((s) => s.temperature)), [samples]);
  const avgPh = useMemo(() => avgOf(samples.map((s) => s.ph)), [samples]);
  useEffect(() => {
    setGeneralInfo((prev) =>
      (prev.temperature === avgTemp && prev.ph === avgPh)
        ? prev
        : { ...prev, temperature: avgTemp, ph: avgPh }
    );
  }, [avgTemp, avgPh]);

  // title follows type
  useEffect(() => {
    const base = "Raw Material Inspection Report";
    setDocMeta((prev) => ({ ...prev, documentTitle: shipmentType ? `${base} - ${shipmentType}` : base }));
  }, [shipmentType]);

  // avg weight
  useEffect(() => {
    const q = parseFloat(totalQuantity);
    const w = parseFloat(totalWeight);
    setAverageWeight(q > 0 && w > 0 ? (w / q).toFixed(3) : "");
  }, [totalQuantity, totalWeight]);

  // types load
  useEffect(() => {
    (async () => {
      try {
        const serverList = (await listReportsByType("qcs_shipment_type"))
          .map((r) => normStr(r?.payload?.name))
          .filter(Boolean);
        setShipmentTypes(uniq([...DEFAULT_TYPES, ...serverList, ...getLocalTypes()]));
      } catch {
        setShipmentTypes(uniq([...DEFAULT_TYPES, ...getLocalTypes()]));
      }
    })();
  }, []);

  // ===== Samples ops (keep index updates but use stable keys) =====
  const setSampleValue = (index, key, value) =>
    setSamples((prev) => prev.map((s, i) => (i === index ? { ...s, [key]: value } : s)));
  const addSample = () => setSamples((prev) => [...prev, newSample()]);
  const removeSample = () => setSamples((prev) => (prev.length > 1 ? prev.slice(0, -1) : prev));
  const handleGeneralChange = (field, value) =>
    setGeneralInfo((prev) => ({ ...prev, [field]: value }));

  // certificate upload (no fallback)
  const handleCertificateUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setCertificateName(file.name);
    setIsUploadingCert(true);
    try {
      const url = await uploadImageToServer(file, "qcs_certificate");
      setCertificateUrl(url);
      showToast("success", "Certificate uploaded.");
    } catch {
      showToast("error", "Certificate upload failed.");
    } finally {
      setIsUploadingCert(false);
      if (certInputRef.current) certInputRef.current.value = "";
    }
  };
  const triggerCertSelect = () => certInputRef.current?.click();

  // images upload (multiple, URLs only) + prevent duplicates
  const handleImagesUpload = async (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    setIsUploadingImages(true);
    const uploaded = [];
    for (const f of files) {
      try {
        const url = await uploadImageToServer(f, "qcs_raw_images");
        uploaded.push(url);
      } catch (err) {
        console.warn("upload failed:", err);
      }
    }
    if (uploaded.length) {
      setImages((prev) => {
        const setPrev = new Set(prev);
        const toAdd = uploaded.filter((u) => !setPrev.has(u));
        return toAdd.length ? [...prev, ...toAdd] : prev;
      });
      showToast("success", `Uploaded ${uploaded.length} image(s).`);
    } else {
      showToast("error", "All uploads failed.");
    }
    setIsUploadingImages(false);
    if (imagesInputRef.current) imagesInputRef.current.value = "";
  };
  const triggerImagesSelect = () => imagesInputRef.current?.click();

  // DELETE handlers (certificate + single image)
  const handleDeleteCertificate = async () => {
    if (!certificateUrl) return;
    const ok = window.confirm("Remove the certificate?");
    if (!ok) return;
    try {
      setToast({ type: "info", msg: "Removing certificate…" });
      try {
        await deleteImage(certificateUrl);
      } catch (err) {
        console.warn("Storage delete failed; unlinking anyway.", err);
      }
      setCertificateUrl("");
      setCertificateName("");
      showToast("success", "Certificate removed.");
    } catch {
      showToast("error", "Failed to remove certificate.");
    }
  };

  const handleRemoveImage = async (index) => {
    const url = images[index];
    if (!url) return;
    const ok = window.confirm("Remove this image?");
    if (!ok) return;
    try {
      setToast({ type: "info", msg: "Removing image…" });
      try {
        await deleteImage(url);
      } catch (err) {
        console.warn("Storage delete failed; unlinking anyway.", err);
      }
      setImages((prev) => prev.filter((_, i) => i !== index));
      showToast("success", "Image removed.");
    } catch {
      showToast("error", "Failed to remove image.");
    }
  };

  // payload builder
  const buildReportPayload = (extra) => ({
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
    productLines,
    images,
    certificateUrl,
    certificateName,
    docMeta,
    notes,
    ...extra,
  });

  // ===== Sequence (Invoice-only) =====
  const [createdDate, setCreatedDate] = useState(toYMD(todayIso()));
  const [entrySequence, setEntrySequence] = useState(1);
  const [entryKey, setEntryKey] = useState("");
  useEffect(() => {
    let stop = false;
    const recalc = async () => {
      const idOk = (generalInfo.invoiceNo || "").trim() !== "";
      if (!shipmentType || !idOk || !createdDate) {
        setEntrySequence(1);
        setEntryKey("");
        return;
      }
      try {
        const { uniqueKey, sequence } = await deriveUniqueKey({
          shipmentType,
          airwayBill: "",
          invoiceNo: generalInfo.invoiceNo,
          createdDate,
        });
        if (!stop) { setEntrySequence(sequence); setEntryKey(uniqueKey); }
      } catch {
        if (!stop) { setEntrySequence(1); setEntryKey(""); }
      }
    };
    recalc();
    return () => { stop = true; };
  }, [shipmentType, generalInfo.invoiceNo, createdDate]);

  const inputProps = (name) => ({
    onFocus: () => setIsFocusedName(name),
    onBlur: () => setIsFocusedName(null),
    style: { ...styles.input, ...(isFocusedName === name ? styles.focused : {}) },
  });
  const selectProps = (name) => ({
    onFocus: () => setIsFocusedName(name),
    onBlur: () => setIsFocusedName(null),
    style: { ...styles.select, ...(isFocusedName === name ? styles.focused : {}) },
  });

  const showToast = (type, msg) => {
    setToast({ type, msg });
    window.clearTimeout(showToast._t);
    showToast._t = window.setTimeout(() => setToast({ type: null, msg: "" }), 2500);
  };
  const toastColors = (type) => (type === "success"
    ? { bg: "#ecfdf5", fg: "#065f46", bd: "#34d399" }
    : type === "error"
    ? { bg: "#fef2f2", fg: "#991b1b", bd: "#fca5a5" }
    : { bg: "#eff6ff", fg: "#1e3a8a", bd: "#93c5fd" });

  const handleAddType = async () => {
    const name = normStr(newType);
    if (!name) return;
    if (shipmentTypes.includes(name)) { setShipmentType(name); setNewType(""); return; }
    try {
      await postMeta("qcs_shipment_type", { name });
      setShipmentTypes((prev) => uniq([...prev, name]));
      setShipmentType(name);
      setNewType("");
      saveLocalType(name);
      showToast("success", "Shipment type saved to server.");
    } catch {
      saveLocalType(name);
      setShipmentTypes((prev) => uniq([...prev, name]));
      setShipmentType(name);
      setNewType("");
      showToast("error", "Server unreachable. Saved locally.");
    }
  };

  // product lines ops (by id)
  const updateLine = (id, field, value) =>
    setProductLines((prev) => prev.map((r) => (r.id === id ? { ...r, [field]: value } : r)));
  const addLine = () => setProductLines((prev) => [...prev, makeEmptyLine()]);
  const removeLine = (id) =>
    setProductLines((prev) => (prev.length > 1 ? prev.filter((r) => r.id !== id) : prev));

  // ======== SAVE (no deriveUniqueKey call here) ========
  const handleSave = async () => {
    if (saveLockRef.current) return;
    const now = Date.now();
    if (now - lastSaveTsRef.current < SAVE_COOLDOWN_MS) return;
    if (isSaving) return;

    if (isUploadingCert || isUploadingImages) {
      showToast("error", "Finish uploads before saving.");
      return;
    }

    if (!shipmentType.trim() || !generalInfo.invoiceNo.trim() || !createdDate) {
      alert("Please fill Shipment Type + Invoice No + Entry Date before saving.");
      return;
    }

    const ok = window.confirm("Confirm saving to external server?");
    if (!ok) {
      setSaveMsg("Save canceled.");
      showToast("info", "Save canceled.");
      return;
    }

    const createdAt = todayIso();
    const userDate = toYMD(createdDate);

    // 🟢 استخدم القيم المحسوبة مسبقًا لتسريع الحفظ
    const idPart = normStr(generalInfo.invoiceNo || "NA");
    const typePart = normStr(shipmentType || "NA");
    const baseKey = `${userDate}__${typePart}__${idPart}`;
    const sequence = entrySequence || 1;
    const uniqueKey = entryKey || (sequence > 1 ? `${baseKey}-${sequence}` : baseKey);

    try {
      saveLockRef.current = true;
      setIsSaving(true);
      setSaveMsg("Saving to server…");
      showToast("info", "Saving…");

      await sendToServer(
        buildReportPayload({ createdAt, createdDate: userDate, uniqueKey, sequence })
      );

      setSaveMsg("Saved successfully!");
      showToast("success", `Saved ✅ (${ymdToDMY(userDate)} · #${sequence})`);
      setEntrySequence(sequence);
      setEntryKey(uniqueKey);
      lastSaveTsRef.current = Date.now();
    } catch (e) {
      const msg = `Save failed: ${e?.message || e}`;
      setSaveMsg(msg);
      showToast("error", msg);
    } finally {
      setIsSaving(false);
      saveLockRef.current = false;
      window.clearTimeout(handleSave._t);
      handleSave._t = window.setTimeout(() => setSaveMsg(""), 2500);
    }
  };

  return (
    <div style={styles.page}>
      <div style={styles.hero} />
      <div style={styles.containerWrap}>
        <div style={styles.container}>
          <div style={styles.titleWrap}>
            <h2 style={styles.title}>📦 QCS Incoming Shipments Report</h2>
            <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
              <span style={styles.badge}>
                Manual Save Only{saveMsg ? <b> · {saveMsg}</b> : null}
              </span>
              <span style={{ ...styles.badge, background: "#e0f2fe", borderColor: "#7dd3fc", color: "#075985" }}>
                {ymdToDMY(createdDate)} · #{entrySequence}
              </span>
              {entryKey ? (
                <code style={{ fontSize: 12, color: "#334155" }}>Key: {entryKey}</code>
              ) : (
                <span style={{ fontSize: 12, color: "#64748b" }}>
                  سيظهر الرقم بعد إدخال Shipment Type و <b>Invoice</b>.
                </span>
              )}
            </div>
          </div>

          {/* Header meta */}
          <div style={{ marginBottom: 12 }}>
            <table style={{ width: "100%", borderCollapse: "collapse", tableLayout: "fixed", background: "#fff", border: "1px solid #e5e7eb", borderRadius: 12 }}>
              <tbody>
                <tr>
                  <th style={{ border: "1px solid #e5e7eb", background: "#f8fafc", textAlign: "right", padding: "10px 12px", width: 220, color: "#111827", fontWeight: 800 }}>Document Title</th>
                  <td style={{ border: "1px solid #e5e7eb", padding: "10px 12px" }} colSpan={2}>
                    <input {...inputProps("documentTitle")} value={docMeta.documentTitle} onChange={(e) => setDocMeta({ ...docMeta, documentTitle: e.target.value })} />
                  </td>
                  <th style={{ border: "1px solid #e5e7eb", background: "#f8fafc", textAlign: "right", padding: "10px 12px", width: 220, color: "#111827", fontWeight: 800 }}>Document No</th>
                  <td style={{ border: "1px solid #e5e7eb", padding: "10px 12px" }}>
                    <input {...inputProps("documentNo")} value={docMeta.documentNo} onChange={(e) => setDocMeta({ ...docMeta, documentNo: e.target.value })} />
                  </td>
                </tr>
                <tr>
                  <th style={{ border: "1px solid #e5e7eb", background: "#f8fafc", textAlign: "right", padding: "10px 12px", width: 220, color: "#111827", fontWeight: 800 }}>Issue Date</th>
                  <td style={{ border: "1px solid #e5e7eb", padding: "10px 12px" }}>
                    <input type="date" {...inputProps("issueDate")} value={docMeta.issueDate} onChange={(e) => setDocMeta({ ...docMeta, issueDate: e.target.value })} />
                  </td>
                  <th style={{ border: "1px solid #e5e7eb", background: "#f8fafc", textAlign: "right", padding: "10px 12px", width: 220, color: "#111827", fontWeight: 800 }}>Revision No</th>
                  <td style={{ border: "1px solid #e5e7eb", padding: "10px 12px" }}>
                    <input {...inputProps("revisionNo")} value={docMeta.revisionNo} onChange={(e) => setDocMeta({ ...docMeta, revisionNo: e.target.value })} />
                  </td>
                  <td />
                </tr>
                <tr>
                  <th style={{ border: "1px solid #e5e7eb", background: "#f8fafc", textAlign: "right", padding: "10px 12px", width: 220, color: "#111827", fontWeight: 800 }}>Area</th>
                  <td style={{ border: "1px solid #e5e7eb", padding: "10px 12px" }} colSpan={3}>
                    <input {...inputProps("area")} value={docMeta.area} onChange={(e) => setDocMeta({ ...docMeta, area: e.target.value })} />
                  </td>
                  <td />
                </tr>
              </tbody>
            </table>
          </div>

          {/* Entry Date + Sequence */}
          <div className="section" style={styles.section}>
            <label style={styles.label}>Entry Date & Daily No.:</label>
            <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap", marginTop: 6 }}>
              <input type="date" value={createdDate} onChange={(e) => setCreatedDate(e.target.value)} {...inputProps("createdDate")} />
              <div title="Daily auto-number" style={{ padding: "10px 12px", border: "1px solid #000", borderRadius: 10, fontWeight: 800, background: "#f8fafc" }}>
                {ymdToDMY(createdDate)} <span style={{ opacity: .7 }}>#</span>{entrySequence}
              </div>
            </div>
          </div>

          {/* Shipment Type */}
          <div style={styles.section}>
            <label style={styles.label}>Shipment Type:</label>
            <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr auto", gap: 8 }}>
              <select value={shipmentType} onChange={(e) => setShipmentType(e.target.value)} {...selectProps("shipmentType")}>
                <option value="">-- Select --</option>
                {shipmentTypes.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
              <input placeholder="Add new type…" value={newType} onChange={(e) => setNewType(e.target.value)} {...inputProps("newType")} />
              <button onClick={handleAddType} style={styles.addButton}>➕ Add Type</button>
            </div>
          </div>

          {/* General Information */}
          <fieldset style={styles.fieldset}>
            <legend style={styles.legend}>General Information</legend>
            <div style={styles.grid}>
              {[
                ["Report On","reportOn","date"],["Sample Received On","receivedOn","date"],["Inspection Date","inspectionDate","date"],
                ["Temperature","temperature","text"],["Brand","brand","text"],["Invoice No","invoiceNo","text"],["Supplier Name","supplierName","text"],
                ["PH","ph","text"],["Origin","origin","text"],["Air Way Bill No","airwayBill","text"],["Local Logger","localLogger","select"],
                ["International Logger","internationalLogger","select"],
              ].map(([label, field, type]) => (
                <div key={field} style={styles.row}>
                  <label style={styles.label}>{label}:</label>
                  {type === "select" ? (
                    <select value={generalInfo[field]} onChange={(e) => handleGeneralChange(field, e.target.value)} {...selectProps(field)}>
                      <option value="">-- Select --</option>
                      <option value="YES">YES</option>
                      <option value="NO">NO</option>
                    </select>
                  ) : type === "date" ? (
                    <input type="date" value={generalInfo[field]} onChange={(e) => handleGeneralChange(field, e.target.value)} {...inputProps(field)} />
                  ) : (
                    (() => {
                      const isAvg = field === "temperature" || field === "ph";
                      const value = field === "temperature" ? avgTemp : field === "ph" ? avgPh : generalInfo[field];
                      const style = { ...inputProps(field).style, ...(isAvg ? { background: "#f3f4f6", fontWeight: 700 } : {}) };
                      return <input value={value} onChange={isAvg ? undefined : (e) => handleGeneralChange(field, e.target.value)} readOnly={isAvg} style={style} />;
                    })()
                  )}
                </div>
              ))}
            </div>

            {/* Status */}
            <div style={{ marginTop: 10 }}>
              <label style={styles.label}>Shipment Status:</label>
              <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap", marginTop: 6 }}>
                <select
                  value={shipmentStatus}
                  onChange={(e) => setShipmentStatus(e.target.value)}
                  {...selectProps("shipmentStatus")}
                  style={{
                    ...selectProps("shipmentStatus").style,
                    fontWeight: 800,
                    color: shipmentStatus === "Acceptable" ? "#16a34a" : shipmentStatus === "Average" ? "#d97706" : "#dc2626"
                  }}
                >
                  <option value="Acceptable">✅ Acceptable</option>
                  <option value="Average">⚠️ Average</option>
                  <option value="Below Average">❌ Below Average</option>
                </select>
                <span style={{ fontWeight: 800, color: shipmentStatus === "Acceptable" ? "#16a34a" : shipmentStatus === "Average" ? "#d97706" : "#dc2626" }}>
                  {shipmentStatus}
                </span>
              </div>
            </div>
          </fieldset>

          {/* Samples Table */}
          <h4 style={styles.section}>Test Samples</h4>
          <div style={styles.tableWrap}>
            <table style={{ ...styles.table, minWidth: 240 + samples.length * 160 }}>
              <thead>
                <tr>
                  <th style={{ ...styles.th, minWidth: 200, textAlign: "left" }}>Attribute</th>
                  {samples.map((_, idx) => <th key={idx} style={styles.th}>Sample {idx + 1}</th>)}
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td style={styles.firstColCell}>PRODUCT NAME</td>
                  {samples.map((s, i) => (
                    <td key={s.id} style={styles.td}>
                      <input value={s.productName} onChange={(e) => setSampleValue(i, "productName", e.target.value)} style={styles.tdInput} />
                    </td>
                  ))}
                </tr>
                {ATTRIBUTES.map((attr) => (
                  <tr key={attr.key} style={["temperature","ph","slaughterDate","expiryDate"].includes(attr.key) ? { background: "#f8fafc" } : undefined}>
                    <td style={styles.firstColCell}>{attr.label}</td>
                    {samples.map((s, i) => (
                      <td key={`${attr.key}-${s.id}`} style={styles.td}>
                        <input value={s[attr.key]} onChange={(e) => setSampleValue(i, attr.key, e.target.value)} style={styles.tdInput} />
                      </td>
                    ))}
                  </tr>
                ))}
                <tr>
                  <td colSpan={1 + samples.length} style={{ padding: "0.7rem" }}>
                    <div style={{ display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap" }}>
                      <button onClick={addSample} style={styles.addButton}>➕ Add Sample (column)</button>
                      <button onClick={removeSample} style={styles.dangerButton} disabled={samples.length <= 1}>🗑 Remove Sample (column)</button>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Product Lines */}
          <div style={{ marginTop: 14 }}>
            <label style={styles.label}>Product Lines:</label>
            <div style={{ marginTop: 8 }}>
              {productLines.map((row) => (
                <div key={row.id} style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr auto", gap: 8, marginBottom: 8 }}>
                  <input placeholder="Product Name" value={row.name} onChange={(e) => updateLine(row.id, "name", e.target.value)} {...inputProps(`pl_name_${row.id}`)} />
                  <input type="number" min="0" step="1" placeholder="Qty (pcs)" value={row.qty} onChange={(e) => updateLine(row.id, "qty", e.target.value)} onWheel={(e) => e.currentTarget.blur()} {...inputProps(`pl_qty_${row.id}`)} />
                  <input type="number" min="0" step="0.001" placeholder="Weight (kg)" value={row.weight} onChange={(e) => updateLine(row.id, "weight", e.target.value)} onWheel={(e) => e.currentTarget.blur()} {...inputProps(`pl_weight_${row.id}`)} />
                  <button type="button" onClick={() => removeLine(row.id)} style={{ ...styles.dangerButton, padding: "8px 12px" }} disabled={productLines.length <= 1}>Remove</button>
                </div>
              ))}
              <button type="button" onClick={addLine} style={styles.addButton}>➕ Add Line</button>
            </div>
          </div>

          {/* Totals */}
          <div style={styles.formRow3}>
            <div>
              <label style={styles.label}>Total Quantity (pcs):</label>
              <input type="text" value={totalQuantity} readOnly style={{ ...styles.input, background: "#f3f4f6", color: "#111827", fontWeight: 700 }} />
            </div>
            <div>
              <label style={styles.label}>Total Weight (kg):</label>
              <input type="text" value={totalWeight} readOnly style={{ ...styles.input, background: "#f3f4f6", color: "#111827", fontWeight: 700 }} />
            </div>
            <div>
              <label style={styles.label}>Average Weight (kg/pc):</label>
              <input type="text" value={averageWeight} readOnly style={{ ...styles.input, background: "#f3f4f6", color: "#111827", fontWeight: 700 }} />
            </div>
          </div>

          {/* Notes */}
          <div style={{ marginTop: 10 }}>
            <label style={styles.label}>Notes:</label>
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={4} placeholder="Write any additional notes here..."
              style={{ ...styles.input, minHeight: 100, resize: "vertical", lineHeight: 1.5 }} />
          </div>

          {/* Uploads */}
          <div style={styles.section}>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <button type="button" onClick={triggerCertSelect} style={{ ...styles.uploadButton, opacity: isUploadingCert ? .6 : 1 }} disabled={isUploadingCert}>
                {isUploadingCert ? "⏳ Uploading…" : "📤 Upload Halal Certificate"}
              </button>
              <input type="file" accept="image/*,.pdf" ref={certInputRef} onChange={handleCertificateUpload} style={{ display: "none" }} />

              <button type="button" onClick={triggerImagesSelect} style={{ ...styles.uploadButton, opacity: isUploadingImages ? .6 : 1 }} disabled={isUploadingImages}>
                {isUploadingImages ? "⏳ Uploading…" : "📸 Upload Images"}
              </button>
              <input type="file" accept="image/*" multiple ref={imagesInputRef} onChange={handleImagesUpload} style={{ display: "none" }} />
            </div>

            {/* شهادة: رابط + زر حذف */}
            {certificateName && <div>{certificateName}</div>}
            {certificateUrl && (
              <div style={{ marginTop: 6, fontSize: 13, display: "flex", gap: 8, alignItems: "center" }}>
                <a href={certificateUrl} target="_blank" rel="noreferrer">🔗 Open Halal Certificate</a>
                <button
                  type="button"
                  onClick={handleDeleteCertificate}
                  style={{ background: "#ef4444", color: "#fff", border: "none", borderRadius: 8, padding: "4px 10px", fontWeight: 800, cursor: "pointer" }}
                  title="Delete certificate"
                >
                  ✕ Delete
                </button>
              </div>
            )}

            {/* صور: شبكة مع زر حذف لكل صورة */}
            {images.length > 0 && (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(140px,1fr))", gap: 8, marginTop: 8 }}>
                {images.map((src, i) => (
                  <div key={src} style={{ position: "relative", border: "1px solid #e5e7eb", borderRadius: 8, overflow: "hidden", background: "#f8fafc" }}>
                    <img
                      src={src}
                      alt={`img-${i}`}
                      style={{ width: "100%", height: 140, objectFit: "cover", display: "block" }}
                    />
                    <button
                      type="button"
                      onClick={() => handleRemoveImage(i)}
                      title="Remove"
                      style={{ position: "absolute", top: 6, right: 6, background: "#ef4444", color: "#fff", border: "none", borderRadius: 8, padding: "2px 8px", fontWeight: 800, cursor: "pointer" }}
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Signatures */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(240px,1fr))", gap: 10, marginTop: 10 }}>
            <div>
              <label style={styles.label}>Inspected By:</label>
              <input value={inspectedBy} onChange={(e) => setInspectedBy(e.target.value)} placeholder="Inspector name" {...inputProps("inspectedBy")} />
            </div>
            <div>
              <label style={styles.label}>Verified By:</label>
              <input value={verifiedBy} onChange={(e) => setVerifiedBy(e.target.value)} placeholder="Verifier name" {...inputProps("verifiedBy")} />
            </div>
          </div>

          {/* Actions */}
          <div style={{ marginTop: 16, display: "flex", gap: 10, flexWrap: "wrap" }}>
            <button
              onClick={handleSave}
              style={{ ...styles.saveButton, ...(isSaving || isUploadingCert || isUploadingImages ? styles.saveButtonDisabled : {}) }}
              disabled={isSaving || isUploadingCert || isUploadingImages}
              title={isUploadingCert || isUploadingImages ? "Wait for uploads to finish" : "Save report"}
            >
              {isSaving ? "⏳ Saving..." : "💾 Save Report"}
            </button>
            <button onClick={() => navigate("/qcs-raw-material-view")} style={styles.viewButton}>📄 View Reports</button>
          </div>
        </div>
      </div>

      {toast.type && (
        <div style={styles.toastWrap}>
          <div role="alert" style={{
            ...styles.toast,
            background: toastColors(toast.type).bg, color: toastColors(toast.type).fg, borderColor: toastColors(toast.type).bd,
          }}>
            {toast.msg}
          </div>
        </div>
      )}
    </div>
  );
}
