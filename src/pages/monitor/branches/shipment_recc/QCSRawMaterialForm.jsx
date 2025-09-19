// QCSRawMaterialForm.jsx
import React, { useEffect, useMemo, useRef, useReducer, useState } from "react";
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

/* ===== Helpers & Constants ===== */
const makeStableId = () =>
  (typeof crypto !== "undefined" && crypto.randomUUID)
    ? crypto.randomUUID()
    : `id_${Math.random().toString(36).slice(2)}_${Date.now().toString(36)}`;

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

// 🔴 الحقول الإلزامية
const REQUIRED_FIELDS = new Set([
  "reportOn",
  "receivedOn",
  "inspectionDate",
  "brand",
  "origin",
  "receivingAddress",
  "inspectedBy",
  "verifiedBy",
]);
const REQUIRED_LABELS = {
  reportOn: "Report On",
  receivedOn: "Sample Received On",
  inspectionDate: "Inspection Date",
  brand: "Brand",
  origin: "Origin",
  receivingAddress: "Receiving Address",
  inspectedBy: "Inspected By",
  verifiedBy: "Verified By",
};

const TYPES_LS_KEY = "qcs_shipment_types_v1";
const DEFAULT_TYPES = [
  "LAMB AUS","MUTTON AUS","LAMB S.A","MUTTON S.A","VACUUM","FROZEN",
  "PAK","KHZ","IND MUTTON","IND VEAL","FRESH LAMB","FRESH CHICKEN",
];
const BRANCHES = [
  "QCS",
  "POS 6","POS 7","POS 10","POS 11","POS 14","POS 15","POS 16","POS 17",
  "POS 18","POS 19","POS 21","POS 24","POS 25",
  "POS 26","POS 31","POS 34","POS 35","POS 36",
  "POS 37","POS 38","POS 41","POS 43",
];
const SAVE_COOLDOWN_MS = 1200;

/* ===== Styles (تم رفع z-index وتوضيح المدخلات) ===== */
const styles = {
  page: {
    minHeight: "100vh",
    background: "linear-gradient(180deg,#f8fafc 0%,#eef2ff 100%)",
    fontFamily: "Inter,Roboto,Cairo,sans-serif",
  },
  hero: {
    position: "relative",
    height: 120,
    background: "linear-gradient(135deg,#4f46e5 0%,#7c3aed 35%,#0ea5e9 100%)",
    boxShadow: "0 8px 20px rgba(60,30,230,0.10)",
    zIndex: 0,
  },
  containerWrap: { padding: "0 16px 32px" },
  container: {
    margin: "0 auto",
    marginTop: -60,
    padding: "1.5rem 2rem",
    background: "#fff",
    borderRadius: 18,
    width: "min(1200px,96vw)",
    direction: "ltr",
    boxShadow: "0 10px 24px rgba(60,30,230,.10), 0 1px 2px rgba(2,6,23,.04)",
    border: "1px solid #e5e7eb",
    position: "relative",
    zIndex: 1, // الكرت فوق الـ hero
  },
  titleWrap: { display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, marginBottom: 12 },
  title: { color: "#1e293b", margin: 0, fontSize: "1.7rem", fontWeight: 900, letterSpacing: ".5px" },
  badge: { fontSize: ".9rem", background: "#e0e7ff", color: "#3730a3", padding: "7px 16px", borderRadius: 999, border: "1px solid #c7d2fe", fontWeight: 700 },
  section: { marginBottom: 16 },
  label: { fontWeight: 800, color: "#334155", fontSize: "1rem" },

  // مدخلات أوضح
  input: {
    width: "100%",
    padding: "11px 13px",
    border: "1px solid #94a3b8",
    borderRadius: 10,
    outline: "none",
    background: "#ffffff",
    color: "#111827",
    minHeight: 42,
    boxSizing: "border-box",
    fontSize: "1rem",
  },
  select: {
    width: "100%",
    padding: "11px 13px",
    border: "1px solid #94a3b8",
    borderRadius: 10,
    outline: "none",
    background: "#ffffff",
    color: "#111827",
    minHeight: 42,
    boxSizing: "border-box",
    fontSize: "1rem",
  },

  focused: { boxShadow: "0 0 0 4px rgba(59,130,246,.20)", borderColor: "#6366f1" },
  fieldset: { marginBottom: 18, padding: 14, border: "1px solid #e5e7eb", borderRadius: 14, background: "#f8fafc" },
  legend: { fontWeight: 900, fontSize: "1.09rem", color: "#1e293b" },
  grid: { display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(270px,1fr))", gap: 12, marginTop: 10 },
  row: { display: "flex", flexDirection: "column", gap: 7 },
  tableWrap: { overflowX: "auto", background: "#fff", border: "1px solid #ddd", borderRadius: 12, marginTop: 8 },
  table: { width: "100%", borderCollapse: "collapse", tableLayout: "fixed", fontSize: ".97rem", border: "1px solid #ddd" },
  th: { backgroundColor: "#f3f4f6", color: "#1e293b", textAlign: "center", position: "sticky", top: 0, zIndex: 1, padding: "9px 7px", whiteSpace: "nowrap", border: "1px solid #ddd" },
  td: { border: "1px solid #ddd", padding: "7px 7px", verticalAlign: "top", background: "#fff" },
  firstColCell: { border: "1px solid #ddd", padding: "7px 8px", fontWeight: 700, background: "#f3f4f6", minWidth: 200, whiteSpace: "nowrap" },
  tdInput: { width: "100%", minWidth: 140, display: "block", padding: "9px 12px", border: "1px solid #bbb", borderRadius: 10, outline: "none", background: "#fff", boxSizing: "border-box" },
  addButton: { padding: "9px 16px", background: "#6366f1", color: "#fff", border: "1px solid #6366f1", borderRadius: 10, cursor: "pointer", fontWeight: 700, transition: "all .2s" },
  dangerButton: { padding: "9px 16px", background: "#ef4444", color: "#fff", border: "1px solid #ef4444", borderRadius: 10, cursor: "pointer", fontWeight: 700, transition: "all .2s" },
  uploadButton: { padding: "9px 16px", background: "#f59e0b", color: "#fff", border: "1px solid #f59e0b", borderRadius: 10, cursor: "pointer", marginBottom: 8, fontWeight: 700 },
  formRow3: { display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(240px,1fr))", gap: 12, marginTop: 10 },
  saveButton: { padding: "12px 22px", background: "#16a34a", color: "#fff", border: "1px solid #16a34a", borderRadius: 12, cursor: "pointer", fontWeight: 900, fontSize: "1rem", transition: "all .18s" },
  saveButtonDisabled: { opacity: .6, cursor: "not-allowed" },
  viewButton: { padding: "12px 22px", background: "#2563eb", color: "#fff", border: "1px solid #2563eb", borderRadius: 12, cursor: "pointer", fontWeight: 900, fontSize: "1rem", transition: "all .18s" },
  toastWrap: { position: "fixed", left: 16, bottom: 16, zIndex: 1000, maxWidth: "92vw" },
  toast: { padding: "11px 17px", borderRadius: 13, boxShadow: "0 6px 18px rgba(0,0,0,.10)", fontWeight: 900, borderWidth: 2, borderStyle: "solid", fontSize: "1rem" },
  dialogOverlay: { position: "fixed", top:0, left:0, width:"100vw",height:"100vh",background:"rgba(30,41,59,0.15)",zIndex:10000,display:"flex",alignItems:"center",justifyContent:"center" },
  dialogBox: { background:"#fff",padding:"2rem",borderRadius:18,boxShadow:"0 8px 24px rgba(60,30,230,0.18)",width:"min(95vw,350px)",textAlign:"center" }
};

/* ===== Reducers ===== */
const initialGeneralInfo = {
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
  receivingAddress: "",
};
function generalInfoReducer(state, action) {
  switch(action.type) {
    case "SET": return {...state, ...action.payload};
    case "UPDATE": return {...state, [action.field]: action.value};
    case "RESET": return {...initialGeneralInfo};
    default: return state;
  }
}
const initialDocMeta = {
  documentTitle: "Raw Material Inspection Report",
  documentNo: "FS-QM/REC/RMB",
  issueDate: "2020-02-10",
  revisionNo: "0",
  area: "QA",
};
function docMetaReducer(state, action) {
  switch(action.type) {
    case "SET": return {...state, ...action.payload};
    case "UPDATE": return {...state, [action.field]: action.value};
    default: return state;
  }
}

/* ===== Utils ===== */
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

/* ===== Confirm Dialog ===== */
function ConfirmDialog({ open, message, onConfirm, onCancel }) {
  if (!open) return null;
  return (
    <div style={styles.dialogOverlay}>
      <div style={styles.dialogBox}>
        <div style={{marginBottom:20,fontWeight:800,fontSize:"1.12rem"}}>{message}</div>
        <div style={{display:"flex",justifyContent:"center",gap:18}}>
          <button style={styles.saveButton} onClick={onConfirm}>نعم</button>
          <button style={styles.dangerButton} onClick={onCancel}>لا</button>
        </div>
      </div>
    </div>
  );
}

/* ===== Loader ===== */
function Loader({ show, text="جار التنفيذ..." }) {
  if (!show) return null;
  return (
    <div style={styles.dialogOverlay}>
      <div style={{...styles.dialogBox, width:200}}>
        <div className="loader" style={{marginBottom:14}}>
          <svg width="38" height="38" viewBox="0 0 38 38">
            <circle cx="19" cy="19" r="16" fill="none" stroke="#6366f1" strokeWidth="5" opacity=".2"/>
            <circle cx="19" cy="19" r="16" fill="none" stroke="#6366f1" strokeWidth="5" strokeDasharray="80" strokeDashoffset="60">
              <animateTransform attributeName="transform" type="rotate" from="0 19 19" to="360 19 19" dur="1s" repeatCount="indefinite"/>
            </circle>
          </svg>
        </div>
        <div style={{fontWeight:700,fontSize:"1.07rem"}}>{text}</div>
      </div>
    </div>
  );
}

/* ===== Main ===== */
export default function QCSRawMaterialForm() {
  const navigate = useNavigate();
  const certInputRef = useRef(null);
  const imagesInputRef = useRef(null);

  const [generalInfo, dispatchGeneralInfo] = useReducer(generalInfoReducer, initialGeneralInfo);
  const [docMeta, dispatchDocMeta] = useReducer(docMetaReducer, initialDocMeta);

  const [samples, setSamples] = useState([makeNewSample()]);
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
  const [certificateUrl, setCertificateUrl] = useState("");
  const [certificateName, setCertificateName] = useState("");
  const [images, setImages] = useState([]);
  const [notes, setNotes] = useState("");
  const [productLines, setProductLines] = useState([makeEmptyLine()]);
  const [createdDate, setCreatedDate] = useState(toYMD(todayIso()));
  const [entrySequence, setEntrySequence] = useState(1);
  const [entryKey, setEntryKey] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingCert, setIsUploadingCert] = useState(false);
  const [isUploadingImages, setIsUploadingImages] = useState(false);
  const [toast, setToast] = useState({ type: null, msg: "" });
  const [saveMsg, setSaveMsg] = useState("");
  const [confirmDialog, setConfirmDialog] = useState({open:false,type:"",onOk:null});
  const saveLockRef = useRef(false);
  const lastSaveTsRef = useRef(0);

  function makeNewSample() {
    const s = { id: makeStableId(), productName: "" };
    ATTRIBUTES.forEach(a => s[a.key] = a.default);
    return s;
  }
  function makeEmptyLine() {
    return { id: makeStableId(), name: "", qty: "", weight: "" };
  }
  function sanitizeNum(v) {
    const n = parseFloat(String(v ?? "").replace(",", ".").replace(/[^\d.\-]/g, ""));
    return Number.isFinite(n) && n >= 0 ? n : 0;
  }
  function avgOf(arr) {
    const nums = arr.map(v => {
      const n = parseFloat(String(v ?? "").replace(",", ".").replace(/[^\d.\-]/g, ""));
      return Number.isFinite(n) ? n : null;
    }).filter(n => n !== null);
    if (!nums.length) return "";
    const avg = nums.reduce((a, b) => a + b, 0) / nums.length;
    return avg.toFixed(2);
  }

  const totalQtyCalc = useMemo(() => productLines.reduce((acc, r) => acc + sanitizeNum(r.qty), 0), [productLines]);
  const totalWeightCalc = useMemo(() => productLines.reduce((acc, r) => acc + sanitizeNum(r.weight), 0), [productLines]);
  const avgTemp = useMemo(() => avgOf(samples.map((s) => s.temperature)), [samples]);
  const avgPh = useMemo(() => avgOf(samples.map((s) => s.ph)), [samples]);

  useEffect(() => {
    setTotalQuantity(totalQtyCalc > 0 ? String(totalQtyCalc) : "");
    setTotalWeight(totalWeightCalc > 0 ? String(totalWeightCalc) : "");
  }, [totalQtyCalc, totalWeightCalc]);

  useEffect(() => {
    dispatchGeneralInfo({
      type: "SET",
      payload: { temperature: avgTemp, ph: avgPh }
    });
  }, [avgTemp, avgPh]);

  useEffect(() => {
    const base = "Raw Material Inspection Report";
    dispatchDocMeta({ type: "UPDATE", field: "documentTitle", value: shipmentType ? `${base} - ${shipmentType}` : base });
  }, [shipmentType]);

  useEffect(() => {
    const q = parseFloat(totalQuantity);
    const w = parseFloat(totalWeight);
    setAverageWeight(q > 0 && w > 0 ? (w / q).toFixed(3) : "");
  }, [totalQuantity, totalWeight]);

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

  function showToast(type, msg) {
    setToast({ type, msg });
    window.clearTimeout(showToast._t);
    showToast._t = window.setTimeout(() => setToast({ type: null, msg: "" }), 2500);
  }
  function toastColors(type) {
    return type === "success"
      ? { bg: "#ecfdf5", fg: "#065f46", bd: "#34d399" }
      : type === "error"
        ? { bg: "#fef2f2", fg: "#991b1b", bd: "#fca5a5" }
        : { bg: "#eff6ff", fg: "#1e3a8a", bd: "#93c5fd" };
  }

  function openConfirm(type, message, onOk) {
    setConfirmDialog({ open:true, type, message, onOk });
  }
  function closeConfirm() {
    setConfirmDialog({ open:false });
  }

  function setSampleValue(index, key, value) {
    setSamples((prev) => prev.map((s, i) => (i === index ? { ...s, [key]: value } : s)));
  }
  function addSample() { setSamples((prev) => [...prev, makeNewSample()]); }
  function removeSample() { if (samples.length > 1) setSamples((prev) => prev.slice(0, -1)); }

  function handleGeneralChange(field, value) {
    dispatchGeneralInfo({ type: "UPDATE", field, value });
  }

  function handleCertificateUpload(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setCertificateName(file.name);
    setIsUploadingCert(true);
    uploadImageToServer(file, "qcs_certificate").then(url => {
      setCertificateUrl(url);
      showToast("success", "تم رفع الشهادة.");
    }).catch(() => {
      showToast("error", "فشل رفع الشهادة.");
    }).finally(() => {
      setIsUploadingCert(false);
      certInputRef.current.value = "";
    });
  }
  function triggerCertSelect() { certInputRef.current?.click(); }

  function handleImagesUpload(e) {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    setIsUploadingImages(true);
    Promise.all(files.map(f => uploadImageToServer(f, "qcs_raw_images").catch(() => null)))
      .then(uploaded => {
        const valid = uploaded.filter(Boolean);
        if (valid.length) {
          setImages(prev => {
            const setPrev = new Set(prev);
            const toAdd = valid.filter(u => !setPrev.has(u));
            return toAdd.length ? [...prev, ...toAdd] : prev;
          });
          showToast("success", `تم رفع ${valid.length} صورة.`);
        } else {
          showToast("error", "جميع عمليات الرفع فشلت.");
        }
      }).finally(() => {
        setIsUploadingImages(false);
        imagesInputRef.current.value = "";
      });
  }
  function triggerImagesSelect() { imagesInputRef.current?.click(); }

  function handleDeleteCertificate() {
    openConfirm("deleteCert", "هل تريد حذف شهادة الحلال؟", async () => {
      setConfirmDialog({ open:false });
      setIsSaving(true);
      try {
        await deleteImage(certificateUrl);
      } catch (err) {
        console.warn("Storage delete failed; unlinking anyway.", err);
      }
      setCertificateUrl("");
      setCertificateName("");
      showToast("success", "تم حذف الشهادة.");
      setIsSaving(false);
    });
  }

  function handleRemoveImage(index) {
    openConfirm("deleteImg", "هل تريد حذف هذه الصورة؟", async () => {
      setConfirmDialog({ open:false });
      setIsSaving(true);
      const url = images[index];
      try {
        await deleteImage(url);
      } catch (err) {
        console.warn("Storage delete failed; unlinking anyway.", err);
      }
      setImages(prev => prev.filter((_,i)=>i!==index));
      showToast("success", "تم حذف الصورة.");
      setIsSaving(false);
    });
  }

  function buildReportPayload(extra) {
    return {
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
    };
  }

  function updateLine(id, field, value) {
    setProductLines(prev => prev.map(r => r.id === id ? { ...r, [field]: value } : r));
  }
  function addLine() { setProductLines(prev => [...prev, makeEmptyLine()]); }
  function removeLine(id) { if (productLines.length > 1) setProductLines(prev => prev.filter(r => r.id !== id)); }

  function handleAddType() {
    const name = normStr(newType);
    if (!name) return;
    if (shipmentTypes.includes(name)) { setShipmentType(name); setNewType(""); return; }
    postMeta("qcs_shipment_type", { name }).then(() => {
      setShipmentTypes(prev => uniq([...prev, name]));
      setShipmentType(name);
      setNewType("");
      saveLocalType(name);
      showToast("success", "تم حفظ نوع الشحنة على السيرفر.");
    }).catch(() => {
      saveLocalType(name);
      setShipmentTypes(prev => uniq([...prev, name]));
      setShipmentType(name);
      setNewType("");
      showToast("error", "تعذر الوصول للسيرفر، تم الحفظ محلياً.");
    });
  }

  function validateBeforeSave() {
    if (!shipmentType.trim() || !generalInfo.invoiceNo.trim() || !createdDate) {
      showToast("error", "يرجى إدخال نوع الشحنة + رقم الفاتورة + تاريخ الإدخال.");
      return false;
    }
    // تحقق الحقول الإلزامية
    const missing = [];
    for (const f of REQUIRED_FIELDS) {
      if (f === "inspectedBy" && !inspectedBy.trim()) missing.push(REQUIRED_LABELS[f]);
      else if (f === "verifiedBy" && !verifiedBy.trim()) missing.push(REQUIRED_LABELS[f]);
      else if (!["inspectedBy","verifiedBy"].includes(f) && !String(generalInfo[f] ?? "").trim()) {
        missing.push(REQUIRED_LABELS[f]);
      }
    }
    if (missing.length) {
      showToast("error", `حقول إلزامية ناقصة: ${missing[0]}${missing.length>1?" …":""}`);
      return false;
    }

    if (isUploadingCert || isUploadingImages) {
      showToast("error", "يرجى انتظار انتهاء رفع الملفات قبل الحفظ.");
      return false;
    }
    if (samples.some(s => !s.productName.trim())) {
      showToast("error", "يرجى إدخال اسم المنتج في جميع العينات.");
      return false;
    }
    if (productLines.some(l => !l.name.trim())) {
      showToast("error", "يرجى إدخال اسم المنتج في جميع خطوط الإنتاج.");
      return false;
    }
    return true;
  }

  function handleSave() {
    if (saveLockRef.current) return;
    const now = Date.now();
    if (now - lastSaveTsRef.current < SAVE_COOLDOWN_MS) return;
    if (isSaving) return;
    if (!validateBeforeSave()) return;

    openConfirm("save", "تأكيد الحفظ على السيرفر الخارجي؟", async () => {
      setConfirmDialog({ open:false });
      setIsSaving(true);

      const createdAt = todayIso();
      const userDate = toYMD(createdDate);

      const idPart = normStr(generalInfo.invoiceNo || "NA");
      const typePart = normStr(shipmentType || "NA");
      const baseKey = `${userDate}__${typePart}__${idPart}`;
      const sequence = entrySequence || 1;
      const uniqueKey = entryKey || (sequence > 1 ? `${baseKey}-${sequence}` : baseKey);

      try {
        saveLockRef.current = true;
        setSaveMsg("جارٍ الحفظ...");
        showToast("info", "جارٍ الحفظ...");
        await sendToServer(
          buildReportPayload({ createdAt, createdDate: userDate, uniqueKey, sequence })
        );
        setSaveMsg("تم الحفظ بنجاح!");
        showToast("success", `تم الحفظ ✅ (${ymdToDMY(userDate)} · #${sequence})`);
        setEntrySequence(sequence);
        setEntryKey(uniqueKey);
        lastSaveTsRef.current = Date.now();
      } catch (e) {
        const msg = `فشل الحفظ: ${e?.message || e}`;
        setSaveMsg(msg);
        showToast("error", msg);
      } finally {
        setIsSaving(false);
        saveLockRef.current = false;
        window.clearTimeout(handleSave._t);
        handleSave._t = window.setTimeout(() => setSaveMsg(""), 2500);
      }
    });
  }

  /* === Render === */
  return (
    <div style={styles.page}>
      <Loader show={isSaving || isUploadingCert || isUploadingImages} text="جار التنفيذ..." />
      <ConfirmDialog
        open={confirmDialog.open}
        message={confirmDialog.message}
        onConfirm={confirmDialog.onOk}
        onCancel={closeConfirm}
      />
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
                <code style={{ fontSize: 13, color: "#334155", fontWeight:700 }}>Key: {entryKey}</code>
              ) : (
                <span style={{ fontSize: 13, color: "#64748b" }}>
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
                    <input {...inputProps("documentTitle")} value={docMeta.documentTitle} onChange={(e) => dispatchDocMeta({ type: "UPDATE", field: "documentTitle", value: e.target.value })} />
                  </td>
                  <th style={{ border: "1px solid #e5e7eb", background: "#f8fafc", textAlign: "right", padding: "10px 12px", width: 220, color: "#111827", fontWeight: 800 }}>Document No</th>
                  <td style={{ border: "1px solid #e5e7eb", padding: "10px 12px" }}>
                    <input {...inputProps("documentNo")} value={docMeta.documentNo} onChange={(e) => dispatchDocMeta({ type: "UPDATE", field: "documentNo", value: e.target.value })} />
                  </td>
                </tr>
                <tr>
                  <th style={{ border: "1px solid #e5e7eb", background: "#f8fafc", textAlign: "right", padding: "10px 12px", width: 220, color: "#111827", fontWeight: 800 }}>Issue Date</th>
                  <td style={{ border: "1px solid #e5e7eb", padding: "10px 12px" }}>
                    <input type="date" {...inputProps("issueDate")} value={docMeta.issueDate} onChange={(e) => dispatchDocMeta({ type: "UPDATE", field: "issueDate", value: e.target.value })} />
                  </td>
                  <th style={{ border: "1px solid #e5e7eb", background: "#f8fafc", textAlign: "right", padding: "10px 12px", width: 220, color: "#111827", fontWeight: 800 }}>Revision No</th>
                  <td style={{ border: "1px solid #e5e7eb", padding: "10px 12px" }}>
                    <input {...inputProps("revisionNo")} value={docMeta.revisionNo} onChange={(e) => dispatchDocMeta({ type: "UPDATE", field: "revisionNo", value: e.target.value })} />
                  </td>
                  <td />
                </tr>
                <tr>
                  <th style={{ border: "1px solid #e5e7eb", background: "#f8fafc", textAlign: "right", padding: "10px 12px", width: 220, color: "#111827", fontWeight: 800 }}>Area</th>
                  <td style={{ border: "1px solid #e5e7eb", padding: "10px 12px" }} colSpan={3}>
                    <input {...inputProps("area")} value={docMeta.area} onChange={(e) => dispatchDocMeta({ type: "UPDATE", field: "area", value: e.target.value })} />
                  </td>
                  <td />
                </tr>
              </tbody>
            </table>
          </div>

          {/* Entry Date + Sequence */}
          <div style={styles.section}>
            <label style={styles.label}>Entry Date & Daily No.:</label>
            <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap", marginTop: 6 }}>
              <input type="date" value={createdDate} onChange={(e) => setCreatedDate(e.target.value)} {...inputProps("createdDate")} required />
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
                ["Report On","reportOn","date"],
                ["Sample Received On","receivedOn","date"],
                ["Inspection Date","inspectionDate","date"],
                ["Temperature","temperature","text"],
                ["Brand","brand","text"],
                ["Invoice No","invoiceNo","text"],
                ["Supplier Name","supplierName","text"],
                ["PH","ph","text"],
                ["Origin","origin","text"],
                ["Receiving Address (عنوان الاستلام)","receivingAddress","branch"],
                ["Air Way Bill No","airwayBill","text"],
                ["Local Logger","localLogger","select"],
                ["International Logger","internationalLogger","select"],
              ].map(([label, field, type]) => {
                const isReq = REQUIRED_FIELDS.has(field);
                return (
                  <div key={field} style={styles.row}>
                    <label style={styles.label}>
                      {label}{isReq ? " *" : ""}
                    </label>
                    {type === "select" ? (
                      <select
                        value={generalInfo[field]}
                        onChange={(e) => handleGeneralChange(field, e.target.value)}
                        {...selectProps(field)}
                        required={isReq}
                      >
                        <option value="">-- Select --</option>
                        <option value="YES">YES</option>
                        <option value="NO">NO</option>
                      </select>
                    ) : type === "branch" ? (
                      <select
                        value={generalInfo[field]}
                        onChange={(e) => handleGeneralChange(field, e.target.value)}
                        {...selectProps(field)}
                        required={isReq}
                      >
                        <option value="">-- اختر الفرع --</option>
                        {BRANCHES.map((b) => (
                          <option key={b} value={b}>{b}</option>
                        ))}
                      </select>
                    ) : type === "date" ? (
                      <input
                        type="date"
                        value={generalInfo[field]}
                        onChange={(e) => handleGeneralChange(field, e.target.value)}
                        {...inputProps(field)}
                        required={isReq}
                      />
                    ) : (
                      (() => {
                        const isAvg = field === "temperature" || field === "ph";
                        const value = field === "temperature" ? avgTemp : field === "ph" ? avgPh : generalInfo[field];
                        const style = { ...inputProps(field).style, ...(isAvg ? { background: "#f8fafc", fontWeight: 700 } : {}) };
                        return (
                          <input
                            value={value}
                            onChange={isAvg ? undefined : (e) => handleGeneralChange(field, e.target.value)}
                            readOnly={isAvg}
                            style={style}
                            placeholder={isAvg ? "Auto (from samples)" : undefined}
                            required={isReq}
                          />
                        );
                      })()
                    )}
                  </div>
                );
              })}
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
                    fontWeight: 900,
                    color: shipmentStatus === "Acceptable" ? "#16a34a" : shipmentStatus === "Average" ? "#d97706" : "#dc2626"
                  }}
                >
                  <option value="Acceptable">✅ Acceptable</option>
                  <option value="Average">⚠️ Average</option>
                  <option value="Below Average">❌ Below Average</option>
                </select>
                <span style={{ fontWeight: 900, color: shipmentStatus === "Acceptable" ? "#16a34a" : shipmentStatus === "Average" ? "#d97706" : "#dc2626" }}>
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
                  <button type="button" onClick={() => removeLine(row.id)} style={{ ...styles.dangerButton, padding: "9px 14px" }} disabled={productLines.length <= 1}>Remove</button>
                </div>
              ))}
              <button type="button" onClick={addLine} style={styles.addButton}>➕ Add Line</button>
            </div>
          </div>

          {/* Totals */}
          <div style={styles.formRow3}>
            <div>
              <label style={styles.label}>Total Quantity (pcs):</label>
              <input type="text" value={totalQuantity} readOnly style={{ ...styles.input, background: "#f3f4f6", color: "#111827", fontWeight: 900 }} />
            </div>
            <div>
              <label style={styles.label}>Total Weight (kg):</label>
              <input type="text" value={totalWeight} readOnly style={{ ...styles.input, background: "#f3f4f6", color: "#111827", fontWeight: 900 }} />
            </div>
            <div>
              <label style={styles.label}>Average Weight (kg/pc):</label>
              <input type="text" value={averageWeight} readOnly style={{ ...styles.input, background: "#f3f4f6", color: "#111827", fontWeight: 900 }} />
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

            {/* شهادة */}
            {certificateName && <div>{certificateName}</div>}
            {certificateUrl && (
              <div style={{ marginTop: 6, fontSize: 13, display: "flex", gap: 8, alignItems: "center" }}>
                <a href={certificateUrl} target="_blank" rel="noreferrer" style={{ fontWeight:700 }}>🔗 Open Halal Certificate</a>
                <button
                  type="button"
                  onClick={handleDeleteCertificate}
                  style={{ background: "#ef4444", color: "#fff", border: "none", borderRadius: 8, padding: "5px 12px", fontWeight: 900, cursor: "pointer" }}
                  title="Delete certificate"
                >
                  ✕ Delete
                </button>
              </div>
            )}

            {/* صور */}
            {images.length > 0 && (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(140px,1fr))", gap: 10, marginTop: 10 }}>
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
                      style={{ position: "absolute", top: 6, right: 6, background: "#ef4444", color: "#fff", border: "none", borderRadius: 8, padding: "3px 10px", fontWeight: 900, cursor: "pointer" }}
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
              <label style={styles.label}>Inspected By *</label>
              <input value={inspectedBy} onChange={(e) => setInspectedBy(e.target.value)} placeholder="Inspector name" {...inputProps("inspectedBy")} required />
            </div>
            <div>
              <label style={styles.label}>Verified By *</label>
              <input value={verifiedBy} onChange={(e) => setVerifiedBy(e.target.value)} placeholder="Verifier name" {...inputProps("verifiedBy")} required />
            </div>
          </div>

          {/* Actions */}
          <div style={{ marginTop: 18, display: "flex", gap: 12, flexWrap: "wrap" }}>
            <button
              onClick={handleSave}
              style={{ ...styles.saveButton, ...(isSaving || isUploadingCert || isUploadingImages ? styles.saveButtonDisabled : {}) }}
              disabled={isSaving || isUploadingCert || isUploadingImages}
              title={isUploadingCert || isUploadingImages ? "انتظر انتهاء الرفع" : "حفظ التقرير"}
            >
              {isSaving ? "⏳ Saving..." : "💾 Save Report"}
            </button>
            <button onClick={() => navigate("/qcs-raw-material-view")} style={styles.viewButton}>📄 View Reports</button>
          </div>
        </div>
      </div>

      {/* Toast */}
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
