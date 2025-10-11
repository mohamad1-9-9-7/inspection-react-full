// src/pages/finished/FinishedProductEntry.jsx
import React, { useState, useRef, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import * as XLSX from "xlsx-js-style";

/* ========= API (upload/delete images via server) ========= */
const API_BASE =
  process.env.REACT_APP_API_URL || "https://inspection-server-4nvj.onrender.com";

async function uploadViaServer(file) {
  const fd = new FormData();
  fd.append("file", file);
  const res = await fetch(`${API_BASE}/api/images`, { method: "POST", body: fd });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.ok || !(data.optimized_url || data.url)) {
    throw new Error(data?.error || "Upload failed");
  }
  return data.optimized_url || data.url;
}
async function deleteImage(url) {
  if (!url) return;
  const res = await fetch(`${API_BASE}/api/images?url=${encodeURIComponent(url)}`, {
    method: "DELETE",
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data?.ok) throw new Error(data?.error || "Delete image failed");
}

/* ========= Row shape ========= */
const emptyRow = {
  product: "",
  customer: "",
  orderNo: "",
  time: "",
  slaughterDate: "",
  expiryDate: "",
  temp: "",
  quantity: "",
  unitOfMeasure: "KG",
  overallCondition: "OK",
  remarks: "",
  images: [],
};

/* ========= Headers ========= */
const CORE_HEADERS = [
  "Product",
  "Customer",
  "Order No",
  "TIME",
  "Slaughter Date",
  "Expiry Date",
  "TEMP",
  "Quantity",
  "Unit of Measure",
  "OVERALL CONDITION",
  "REMARKS",
];

/* ===================== Helpers ===================== */
// digits normalization
function toAsciiDigits(value) {
  if (value == null) return "";
  let s = String(value);
  s = s.replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 0x0660));
  s = s.replace(/[۰-۹]/g, (d) => String(d.charCodeAt(0) - 0x06f0));
  s = s.replace(/\u066C/g, ",");
  s = s.replace(/\u066B/g, ".");
  return s;
}
const toNumOrEmpty = (v) => {
  if (v === "" || v == null) return "";
  const ascii = toAsciiDigits(v).replace(/,/g, ".");
  const n = Number(ascii);
  return Number.isFinite(n) ? n : "";
};
const toNumStr = (v) => {
  const n = toNumOrEmpty(v);
  return n === "" ? "" : String(n);
};

/* ===== Temperature auto-fill helpers ===== */
function isFrozenProduct(name = "") {
  const s = String(name).toLowerCase();
  const frozenHit = /(frozen|frz|frzn|freez|مجمد)/i.test(s);
  const defrostHit = /(defrost|thaw|مذوب|مفكوك|defrosted)/i.test(s);
  return frozenHit && !defrostHit;
}
function randTemp(min, max, dp = 1) {
  const v = Math.random() * (max - min) + min;
  const fixed = Number(v.toFixed(dp));
  return String(fixed);
}
function autoTempForProduct(product) {
  if (isFrozenProduct(product)) {
    // -18.0 to -16.0 (one decimal)
    return randTemp(-18.0, -16.0, 1);
  }
  // 1.1 to 4.8 (one decimal)
  return randTemp(1.1, 4.8, 1);
}

/* ===== Date parsing/formatting (DD/MM/YYYY) ===== */
function pad2(x) {
  return String(x).padStart(2, "0");
}
function excelSerialToDMY(n) {
  const base = new Date(Date.UTC(1899, 11, 30));
  const ms = Number(n) * 86400000;
  const d = new Date(base.getTime() + ms);
  if (isNaN(d)) return "";
  return `${pad2(d.getUTCDate())}/${pad2(d.getUTCMonth() + 1)}/${d.getUTCFullYear()}`;
}
/** try to understand many inputs and return DD/MM/YYYY or "" */
function toDMY(val) {
  if (val == null || val === "") return "";
  const s0 = String(val).trim();
  const s = s0.replace(/[.\- ]/g, "/"); // unify separators

  // Excel serial
  if (/^\d+(\.\d+)?$/.test(s0) && Number(s0) > 59) return excelSerialToDMY(Number(s0));

  // DD/MM/YYYY or D/M/YY
  let m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
  if (m) {
    let dd = pad2(m[1]), mm = pad2(m[2]); let yyyy = m[3];
    if (yyyy.length === 2) yyyy = Number(yyyy) < 50 ? `20${yyyy}` : `19${yyyy}`;
    return `${dd}/${mm}/${yyyy}`;
  }
  // ISO → DD/MM/YYYY
  m = s.match(/^(\d{4})\/(\d{1,2})\/(\d{1,2})$/);
  if (m) return `${pad2(m[3])}/${pad2(m[2])}/${m[1]}`;

  // fallback Date()
  const d = new Date(s0);
  if (!isNaN(d)) return `${pad2(d.getDate())}/${pad2(d.getMonth() + 1)}/${d.getFullYear()}`;
  return "";
}
/** mask while typing: keep digits, auto insert "/" at 2,5 */
function maskDateTyped(input) {
  const s = input.replace(/[^\d]/g, "");
  if (s.length <= 2) return s;
  if (s.length <= 4) return `${s.slice(0, 2)}/${s.slice(2)}`;
  return `${s.slice(0, 2)}/${s.slice(2, 4)}/${s.slice(4, 8)}`;
}
/** compare DMY strings → -1 / 0 / 1 ; invalid => null */
function cmpDMY(a, b) {
  const pa = parseDMY(a); const pb = parseDMY(b);
  if (!pa || !pb) return null;
  if (pa.getTime() < pb.getTime()) return -1;
  if (pa.getTime() > pb.getTime()) return 1;
  return 0;
}
function parseDMY(s) {
  const m = String(s || "").match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!m) return null;
  const dd = Number(m[1]), mm = Number(m[2]), yyyy = Number(m[3]);
  const d = new Date(yyyy, mm - 1, dd);
  return d && d.getMonth() + 1 === mm && d.getDate() === dd ? d : null;
}

/** Quantity from stock-like */
function chooseQtyFromStockLike(rec) {
  const done = toNumOrEmpty(rec["Done"]);
  const rrq = toNumOrEmpty(rec["Real Reserved Quantity"] ?? rec["Real reserved quantity"]);
  const a = done === "" ? 0 : done;
  const b = rrq === "" ? 0 : rrq;
  const sum = a + b;
  return sum === 0 ? "" : String(sum);
}

/** Product code utilities */
function extractCodeFromProductText(s = "") {
  const m = String(s).match(/\[(\d+)\]/);
  return m ? m[1] : "";
}
function extractCodeAndName(raw = "") {
  const s = String(raw).trim();
  let m = s.match(/^\s*\[(\d+)\]\s*(.+)$/);
  if (m) return { code: m[1], name: m[2].trim() };
  m = s.match(/^\s*(\d{3,})\s*[-–—]\s*(.+)$/);
  if (m) return { code: m[1], name: m[2].trim() };
  return { code: "", name: s };
}

/** Excel helpers for dates import */
function getCellText(ws, r, c) {
  try {
    const addr = XLSX.utils.encode_cell({ r, c });
    const cell = ws[addr];
    if (!cell) return "";
    if (cell.w != null && String(cell.w).trim() !== "") return String(cell.w).trim();
    if (cell.v != null && String(cell.v).trim() !== "") return String(cell.v).trim();
    return "";
  } catch { return ""; }
}
function findPSE(ws) {
  const ref = ws["!ref"];
  if (!ref) return { p: 0, s: 1, e: 2, headerRow: 0 };
  const range = XLSX.utils.decode_range(ref);
  let idxP = 0, idxS = 1, idxE = 2, headerRow = range.s.r;
  for (let r = range.s.r; r <= Math.min(range.s.r + 5, range.e.r); r++) {
    for (let c = range.s.c; c <= range.e.c; c++) {
      const t = getCellText(ws, r, c).toLowerCase();
      if (t.includes("product")) { idxP = c; headerRow = r; }
      if (t.includes("slaughter") || t.includes("production")) { idxS = c; headerRow = r; }
      if (t.includes("expiry") || t.includes("expiration")) { idxE = c; headerRow = r; }
    }
  }
  return { p: idxP, s: idxS, e: idxE, headerRow };
}

/* ========= Transform incoming rows ========= */
function splitDateParts(v) {
  if (v == null || v === "") return { date: "", time: "" };
  if (typeof v === "number" && XLSX?.SSF?.parse_date_code) {
    const d = XLSX.SSF.parse_date_code(v);
    if (d) {
      const pad = (x) => String(x).padStart(2, "0");
      return {
        date: `${d.y}-${pad(d.m)}-${pad(d.d)}`,
        time: `${pad(d.H)}:${pad(d.M)}:${pad(Math.round(d.S || 0))}`,
      };
    }
  }
  const s = String(v).trim().replace("T", " ");
  const m = s.match(/(\d{4})-(\d{2})-(\d{2})(?:[ T](\d{2}):(\d{2})(?::(\d{2}))?)?/);
  if (m) {
    const pad = (x) => String(x ?? 0).padStart(2, "0");
    return {
      date: `${m[1]}-${m[2]}-${m[3]}`,
      time: m[4] ? `${pad(m[4])}:${pad(m[5])}:${pad(m[6])}` : "",
    };
  }
  return { date: "", time: "" };
}
function transformIncoming(record) {
  const out = { ...emptyRow };

  const hasExact = CORE_HEADERS.every((h) =>
    Object.prototype.hasOwnProperty.call(record, h)
  );
  if (hasExact) {
    out.product = String(record["Product"] ?? "");
    out.customer = String(record["Customer"] ?? "");
    out.orderNo = toAsciiDigits(record["Order No"] ?? "");
    out.time = toAsciiDigits(record["TIME"] ?? "");
    out.slaughterDate = "";
    out.expiryDate = "";
    const q = toNumOrEmpty(record["Quantity"]);
    out.quantity = !q || q === 0 ? "" : String(q);
    out.temp = toNumStr(record["TEMP"]) || ""; // read if exists, else autofill below
    out.unitOfMeasure = String(record["Unit of Measure"] ?? "KG") || "KG";
    out.overallCondition = "OK";
    out.remarks = String(record["REMARKS"] ?? "");
    out.images = [];
    if (out.temp === "") out.temp = autoTempForProduct(out.product); // ★ auto temp
    return out;
  }

  const hasStockLike =
    "Product" in record &&
    ("Real Reserved Quantity" in record ||
      "Real reserved quantity" in record ||
      "Done" in record);
  if (hasStockLike) {
    const { time } = splitDateParts(record["Date"]);
    out.product = String(record["Product"] ?? "");
    out.customer = String(record["To"] ?? "");
    out.orderNo = toAsciiDigits(record["Reference"] ?? "");
    out.time = toAsciiDigits(time);
    out.slaughterDate = "";
    out.expiryDate = "";
    out.temp = ""; // will auto-fill below
    out.quantity = chooseQtyFromStockLike(record);
    out.unitOfMeasure =
      String(record["Unit of Measure"] ?? record["Unit of measure"] ?? "KG") || "KG";
    out.overallCondition = "OK";
    out.remarks = "";
    out.images = [];
    if (out.temp === "") out.temp = autoTempForProduct(out.product); // ★ auto temp
    return out;
  }

  return out;
}

/* ========= Image Manager ========= */
function ImageManager({ open, row, onClose, onAddImages, onRemoveImage }) {
  const inputRef = useRef(null);
  const [preview, setPreview] = useState("");
  React.useEffect(() => {
    if (!open) setPreview("");
    const onEsc = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onEsc);
    return () => window.removeEventListener("keydown", onEsc);
  }, [open, onClose]);
  if (!open) return null;

  const MAX = 2;
  const handlePick = () => inputRef.current?.click();
  const handleFiles = async (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    const remain = MAX - (row?.images?.length || 0);
    if (files.length > remain) {
      alert(`You can upload ${remain} image(s) only (max ${MAX}).`);
      e.target.value = "";
      return;
    }
    const urls = [];
    for (const f of files) {
      try { const url = await uploadViaServer(f); urls.push(url); }
      catch (err) { console.error("upload failed:", err); }
    }
    if (urls.length) onAddImages(urls);
    e.target.value = "";
  };

  return (
    <div style={galleryBack} onClick={onClose}>
      <div style={galleryCard} onClick={(e) => e.stopPropagation()}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
          <div style={{ fontWeight: 900, fontSize: "1.05rem", color: "#0f172a" }}>
            🖼️ Product Images {row?.product ? `— ${row.product}` : ""}
          </div>
          <button onClick={onClose} style={galleryClose}>✕</button>
        </div>

        {preview && (
          <div style={{ marginTop: 10, marginBottom: 8 }}>
            <img
              src={preview}
              alt="preview"
              style={{ maxWidth: "100%", maxHeight: 700, borderRadius: 15, boxShadow: "0 6px 18px rgba(0,0,0,.2)" }}
            />
          </div>
        )}

        <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 10, marginBottom: 8 }}>
          <button onClick={handlePick} style={btnBlueModal}>⬆️ Upload Images</button>
          <input ref={inputRef} type="file" accept="image/*" multiple onChange={handleFiles} style={{ display: "none" }} />
          <div style={{ fontSize: 13, color: "#334155" }}>Max two images per product (server compresses automatically).</div>
        </div>

        <div style={thumbsWrap}>
          {(row?.images || []).length === 0 ? (
            <div style={{ color: "#64748b" }}>No images yet.</div>
          ) : (
            row.images.map((src, i) => (
              <div key={i} style={thumbTile} title={`Image ${i + 1}`}>
                <img src={src} alt={`img-${i}`} style={thumbImg} onClick={() => setPreview(src)} />
                <button title="Remove" onClick={() => onRemoveImage(i)} style={thumbRemove}>✕</button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

/* ========= Main ========= */
export default function FinishedProductEntry() {
  const navigate = useNavigate();

  const [reportTitle, setReportTitle] = useState("");
  const [reportDate, setReportDate] = useState("");
  const [rows, setRows] = useState([{ ...emptyRow }]);

  const [savedMsg, setSavedMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [importSummary, setImportSummary] = useState("");
  const [importMode, setImportMode] = useState("append");

  const fileRef = useRef(null);
  const datesFileRef = useRef(null);

  const [imageModalOpen, setImageModalOpen] = useState(false);
  const [imageRowIndex, setImageRowIndex] = useState(-1);
  const [savingStage, setSavingStage] = useState("");

  /* ===== Sorting/Filtering state ===== */
  const [sortBy, setSortBy] = useState("none"); // none | slaughterAsc|slaughterDesc|expiryAsc|expiryDesc|customerAsc|customerDesc
  const [filterCustomer, setFilterCustomer] = useState("");
  const [filterHasImages, setFilterHasImages] = useState("any"); // any|with|without

  /* ===== Customers datalist ===== */
  const customerOptions = useMemo(() => {
    const set = new Set(rows.map((r) => (r.customer || "").trim()).filter(Boolean));
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [rows]);

  /* ===== Derived errors + row status ===== */
  function getRowErrors(r) {
    const errs = {};
    // required
    if (!String(r.product).trim()) errs.product = "Required";
    if (!String(r.customer).trim()) errs.customer = "Required";
    if (!String(r.orderNo).trim()) errs.orderNo = "Required";
    const qOk = !(r.quantity === "" || isNaN(Number(r.quantity)));
    if (!qOk) errs.quantity = "Required (number)";
    // dates
    const sd = toDMY(r.slaughterDate) || "";
    const ed = toDMY(r.expiryDate) || "";
    if (!sd) errs.slaughterDate = "Required (DD/MM/YYYY)";
    if (!ed) errs.expiryDate = "Required (DD/MM/YYYY)";
    // order check
    if (sd && ed) {
      const cmp = cmpDMY(sd, ed);
      if (cmp !== null && cmp > 0) {
        errs.dateOrder = "Expiry must be after or same day as Slaughter";
      }
    }
    // temp
    if (String(r.temp).trim() !== "") {
      const t = Number(toAsciiDigits(r.temp).replace(/,/g, "."));
      if (!Number.isFinite(t)) errs.temp = "Not a number";
      else if (t > 5) errs.temp = "TEMP > 5°C";
    }
    return errs;
  }
  function getRowStatus(r) {
    const e = getRowErrors(r);
    const hasMissing =
      e.product || e.customer || e.orderNo || e.quantity || e.slaughterDate || e.expiryDate || e.dateOrder;
    if (hasMissing) {
      if (!e.slaughterDate && !e.expiryDate && (e.product || e.customer || e.orderNo || e.quantity))
        return { label: "⚠️ ناقص", color: "#b91c1c" };
      if (e.slaughterDate || e.expiryDate || e.dateOrder) return { label: "⏳ تاريخ ناقص", color: "#b45309" };
      return { label: "⚠️ ناقص", color: "#b91c1c" };
    }
    return { label: "✅ مكتمل", color: "#065f46" };
  }

  /* ===== Counters ===== */
  const missingCount = useMemo(
    () =>
      rows.reduce((acc, r) => {
        const e = getRowErrors(r);
        const missing =
          e.product || e.customer || e.orderNo || e.quantity || e.slaughterDate || e.expiryDate || e.dateOrder;
        return acc + (missing ? 1 : 0);
      }, 0),
    [rows]
  );

  /* ===== Drag & Drop ===== */
  const dragIndex = useRef(-1);
  const onDragStart = (i) => (e) => {
    dragIndex.current = i;
    e.dataTransfer.effectAllowed = "move";
  };
  const onDragOver = (i) => (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };
  const onDrop = (i) => (e) => {
    e.preventDefault();
    const from = dragIndex.current;
    const to = i;
    if (from === -1 || to === -1 || from === to) return;
    setRows((prev) => {
      const next = [...prev];
      const [moved] = next.splice(from, 1);
      next.splice(to, 0, moved);
      return next;
    });
    dragIndex.current = -1;
  };

  /* ===== Change handlers ===== */
  const handleChange = (idx, key, value) => {
    const updated = [...rows];
    let v = value;

    if (key === "slaughterDate" || key === "expiryDate") {
      // mask typing
      v = maskDateTyped(v.replace(/[.\- ]/g, "/"));
    } else if (key === "quantity" || key === "temp") {
      v = toAsciiDigits(v).replace(/,/g, ".");
    } else if (key === "time" || key === "orderNo") {
      v = toAsciiDigits(v);
    }
    if (key === "overallCondition") v = "OK";

    updated[idx][key] = v;
    updated[idx]["overallCondition"] = "OK";
    setRows(updated);
  };

  const handleDateBlur = (idx, key) => {
    setRows((prev) => {
      const next = [...prev];
      const fixed = toDMY(next[idx][key]);
      next[idx][key] = fixed || next[idx][key];
      return next;
    });
  };
  const handleDatePaste = (idx, key) => (e) => {
    const txt = (e.clipboardData?.getData("text") || "").trim();
    const fixed = toDMY(txt);
    if (fixed) {
      e.preventDefault();
      handleChange(idx, key, fixed);
    }
  };

  /* ===== Images modal ===== */
  const openImagesFor = (i) => { setImageRowIndex(i); setImageModalOpen(true); };
  const closeImages = () => setImageModalOpen(false);
  const addImagesToRow = async (urls) => {
    setRows((prev) =>
      prev.map((r, i) =>
        i === imageRowIndex ? { ...r, images: [...(r.images || []), ...urls].slice(0, 2) } : r
      )
    );
    setSavedMsg("✅ Images added."); setTimeout(() => setSavedMsg(""), 1600);
  };
  const removeImageFromRow = async (imgIndex) => {
    try {
      const url = rows?.[imageRowIndex]?.images?.[imgIndex];
      if (url) { try { await deleteImage(url); } catch {} }
      setRows((prev) =>
        prev.map((r, i) => {
          if (i !== imageRowIndex) return r;
          const next = Array.isArray(r.images) ? [...r.images] : [];
          next.splice(imgIndex, 1);
          return { ...r, images: next };
        })
      );
      setSavedMsg("✅ Image removed.");
    } catch { setErrorMsg("❌ Failed to remove the image."); }
    finally { setTimeout(() => { setSavedMsg(""); setErrorMsg(""); }, 1800); }
  };

  /* ===== Save with validations ===== */
  const handleSave = () => {
    setSavingStage("saving");
    if (!reportTitle.trim()) {
      setSavingStage("");
      setErrorMsg("Please enter the Report Title.");
      setTimeout(() => setErrorMsg(""), 2600);
      return;
    }
    if (!reportDate.trim()) {
      setSavingStage("");
      setErrorMsg("Please select the Report Date.");
      setTimeout(() => setErrorMsg(""), 2600);
      return;
    }

    for (const r of rows) {
      const e = getRowErrors(r);
      const missing =
        e.product || e.customer || e.orderNo || e.quantity || e.slaughterDate || e.expiryDate || e.dateOrder;
      if (missing) {
        setSavingStage("");
        setErrorMsg("Fix highlighted errors before saving (required fields & dates order).");
        setTimeout(() => setErrorMsg(""), 3500);
        return;
      }
      r.overallCondition = "OK";
    }

    try {
      const all = JSON.parse(localStorage.getItem("finished_products_reports") || "[]");
      all.push({
        id: Date.now(),
        reportTitle,
        reportDate,
        reportSavedAt: new Date().toISOString(),
        products: rows,
      });
      localStorage.setItem("finished_products_reports", JSON.stringify(all));
      setSavingStage("done"); setSavedMsg("✅ Report saved successfully!");
      setTimeout(() => setSavedMsg(""), 2000);
      setRows([{ ...emptyRow }]); setReportTitle(""); setReportDate("");
      setTimeout(() => setSavingStage(""), 1000);
    } catch {
      setSavingStage("");
      setErrorMsg("Failed to save the report.");
      setTimeout(() => setErrorMsg(""), 2600);
    }
  };

  /* ===== Import (full rows) ===== */
  const onPick = async (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    try {
      const ab = await f.arrayBuffer();
      const wb = XLSX.read(ab, { type: "array" });
      const sheetName = wb.SheetNames[0];
      const ws = wb.Sheets[sheetName];
      const json = XLSX.utils.sheet_to_json(ws, { defval: "", raw: false });

      if (!json.length) { setErrorMsg("No data rows found in the file."); setTimeout(() => setErrorMsg(""), 2600); return; }

      const transformed = json
        .map((rec) => { 
          const t = transformIncoming(rec); 
          t.overallCondition = "OK"; 
          // ★ Auto temp if still empty
          if (!String(t.temp).trim()) t.temp = autoTempForProduct(t.product);
          return t; 
        })
        .filter((r) => Object.values(r).some((v) => String(v).trim() !== ""));

      if (!transformed.length) { setErrorMsg("Read completed but headers did not match the core template."); setTimeout(() => setErrorMsg(""), 3200); return; }

      setRows((prev) => (importMode === "replace" ? transformed : [...prev, ...transformed]));
      setImportSummary(`📥 Imported ${transformed.length} row(s) from "${sheetName}".`);
      setTimeout(() => setImportSummary(""), 3500);
    } catch {
      setErrorMsg("Failed to read the file.");
      setTimeout(() => setErrorMsg(""), 3000);
    } finally {
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  /* ===== Import only dates (Product, Slaughter Date, Expiry Date) ===== */
  const onPickDates = async (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    try {
      const ab = await f.arrayBuffer();
      const wb = XLSX.read(ab, { type: "array" });
      const ws = wb.Sheets[wb.SheetNames[0]];
      if (!ws) throw new Error("No sheet found.");

      const ref = ws["!ref"];
      if (!ref) throw new Error("Empty sheet.");
      const range = XLSX.utils.decode_range(ref);
      const { p: idxP, s: idxS, e: idxE, headerRow } = findPSE(ws);

      const codeToDates = new Map();
      let scanned = 0;
      for (let r = headerRow + 1; r <= range.e.r; r++) {
        const prodText = getCellText(ws, r, idxP);
        const sdText = getCellText(ws, r, idxS);
        const edText = getCellText(ws, r, idxE);
        if (!prodText && !sdText && !edText) continue;
        const { code } = extractCodeAndName(prodText);
        if (!code) continue;
        scanned++;
        const prev = codeToDates.get(code) || { sd: "", ed: "" };
        codeToDates.set(code, { sd: toDMY(sdText) || prev.sd, ed: toDMY(edText) || prev.ed });
      }

      if (codeToDates.size === 0) {
        setErrorMsg("No valid [CODE] rows found in the dates sheet.");
        setTimeout(() => setErrorMsg(""), 3000);
        return;
      }

      let updated = 0;
      const nextRows = rows.map((r) => {
        const code = extractCodeFromProductText(r.product);
        if (!code || !codeToDates.has(code)) return r;
        const { sd, ed } = codeToDates.get(code);
        const hasChange = (sd && sd !== r.slaughterDate) || (ed && ed !== r.expiryDate);
        if (hasChange) updated++;
        return { ...r, slaughterDate: sd || r.slaughterDate, expiryDate: ed || r.expiryDate };
      });

      setRows(nextRows);
      setImportSummary(`📥 Dates import: matched ${updated} row(s) / scanned ${scanned}. (format DD/MM/YYYY)`);
      setTimeout(() => setImportSummary(""), 3500);
    } catch (err) {
      console.error(err);
      setErrorMsg("Failed to import dates.");
      setTimeout(() => setErrorMsg(""), 3000);
    } finally {
      if (datesFileRef.current) datesFileRef.current.value = "";
    }
  };

  /* ===== Filtering + Sorting view ===== */
  const viewRows = useMemo(() => {
    let list = rows.map((r, i) => ({ r, idx: i }));
    if (filterCustomer.trim()) {
      const q = filterCustomer.trim().toLowerCase();
      list = list.filter(({ r }) => (r.customer || "").toLowerCase().includes(q));
    }
    if (filterHasImages !== "any") {
      const need = filterHasImages === "with";
      list = list.filter(({ r }) => (Array.isArray(r.images) && r.images.length > 0) === need);
    }

    // comparator that closes over (k, dir)
    const byDateKey = (k, dir) => (a, b) => {
      const da = parseDMY(a.r[k]); const db = parseDMY(b.r[k]);
      const va = da ? da.getTime() : -Infinity; const vb = db ? db.getTime() : -Infinity;
      return dir * (va - vb);
    };

    switch (sortBy) {
      case "slaughterAsc": list.sort(byDateKey("slaughterDate", 1)); break;
      case "slaughterDesc": list.sort(byDateKey("slaughterDate", -1)); break;
      case "expiryAsc": list.sort(byDateKey("expiryDate", 1)); break;
      case "expiryDesc": list.sort(byDateKey("expiryDate", -1)); break;
      case "customerAsc": list.sort((a, b) => (a.r.customer || "").localeCompare(b.r.customer || "")); break;
      case "customerDesc": list.sort((a, b) => (b.r.customer || "").localeCompare(a.r.customer || "")); break;
      default: break;
    }
    return list;
  }, [rows, sortBy, filterCustomer, filterHasImages]);

  /* ===== UI ===== */
  const addRow = () => setRows((r) => [...r, { ...emptyRow }]);
  const removeRow = (idx) => { if (rows.length === 1) return; setRows(rows.filter((_, i) => i !== idx)); };

  return (
    <div
      style={{
        width: "100%",
        margin: 0,
        background: "#fff",
        borderRadius: 0,
        boxShadow: "none",
        padding: "24px 24px",
        fontFamily: "Inter, Cairo, sans-serif",
        direction: "ltr",
      }}
    >
      {/* Top Bar */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", gap: 16, marginBottom: 14, flexWrap: "wrap" }}>
        {/* Report meta */}
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
          <div style={{ display: "grid", gap: 6 }}>
            <label style={labelStyle}>Report Title</label>
            <input value={reportTitle} onChange={(e) => setReportTitle(e.target.value)} placeholder="e.g., Finished Products – POS 19" style={metaInput} />
          </div>
          <div style={{ display: "grid", gap: 6 }}>
            <label style={labelStyle}>Report Date</label>
            <input type="date" value={reportDate} onChange={(e) => setReportDate(e.target.value)} style={metaInput} />
          </div>
        </div>

        {/* Import/Views + Filters */}
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
          <label style={btnInfo} title="Import XLSX/XLS/CSV (full rows)">
            📥 Import File
            <input
              ref={fileRef}
              type="file"
              accept=".xlsx,.xls,.xlsm,.xlsb,.csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel,text/csv"
              style={{ display: "none" }}
              onChange={onPick}
            />
          </label>

          <label style={btnPurple} title="Import Slaughter/Expiry dates only (DD/MM/YYYY)">
            📥 Import Dates (2 cols)
            <input
              ref={datesFileRef}
              type="file"
              accept=".xlsx,.xls,.xlsm,.xlsb,.csv"
              style={{ display: "none" }}
              onChange={onPickDates}
            />
          </label>

          <select value={importMode} onChange={(e) => setImportMode(e.target.value)} style={selectStyle} title="Append or replace current rows">
            <option value="append">Append</option>
            <option value="replace">Replace</option>
          </select>

          <button onClick={() => navigate("/finished-product-reports")} style={btnPurple}>📑 Saved Reports</button>
        </div>
      </div>

      {/* Counters + Filters/Sort */}
      <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap", marginBottom: 8 }}>
        <div style={{ fontWeight: 800, color: "#334155" }}>
          Rows: {rows.length} • Incomplete: {missingCount}
        </div>

        <input
          value={filterCustomer}
          onChange={(e) => setFilterCustomer(e.target.value)}
          placeholder="Filter by customer…"
          style={{ ...inputStyle, maxWidth: 220 }}
        />
        <select value={filterHasImages} onChange={(e) => setFilterHasImages(e.target.value)} style={selectStyle}>
          <option value="any">All</option>
          <option value="with">With images</option>
          <option value="without">Without images</option>
        </select>
        <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} style={selectStyle}>
          <option value="none">No sort</option>
          <option value="slaughterAsc">Slaughter ↑</option>
          <option value="slaughterDesc">Slaughter ↓</option>
          <option value="expiryAsc">Expiry ↑</option>
          <option value="expiryDesc">Expiry ↓</option>
          <option value="customerAsc">Customer A-Z</option>
          <option value="customerDesc">Customer Z-A</option>
        </select>
      </div>

      {importSummary && <div style={infoBanner}>{importSummary}</div>}
      {savedMsg && <div style={okBanner}>{savedMsg}</div>}
      {errorMsg && <div style={errBanner}>{errorMsg}</div>}

      {/* Table */}
      <div style={{ overflowX: "auto", width: "100%" }}>
        <table style={{ width: "100%", tableLayout: "fixed", borderCollapse: "collapse", fontSize: "0.98em", background: "#f8fafc", border: "1px solid #000" }}>
          <colgroup>
            <col style={{ width: "2.2rem" }} />
            <col style={{ width: "26rem" }} />
            <col style={{ width: "14rem" }} />
            <col style={{ width: "12rem" }} />
            <col style={{ width: "9rem" }} />
            <col style={{ width: "10rem" }} />
            <col style={{ width: "10rem" }} />
            <col style={{ width: "7rem" }} />
            <col style={{ width: "9rem" }} />
            <col style={{ width: "8rem" }} />
            <col style={{ width: "14rem" }} />
            <col style={{ width: "14rem" }} />
            <col style={{ width: "6rem" }} />
          </colgroup>

          <thead>
            <tr style={{ background: "#eeeeee", color: "#273746" }}>
              <th style={th}>#</th>
              {CORE_HEADERS.map((h) => (
                <th key={h} style={th}>{h}</th>
              ))}
              <th style={th}>Remove</th>
            </tr>
          </thead>

          <tbody>
            {viewRows.map(({ r, idx: realIdx }, viewIdx) => {
              const errs = getRowErrors(r);
              const rowStatus = getRowStatus(r);
              const isZeroQty = r.quantity !== "" && Number(r.quantity) === 0;

              const base = inputStyle;
              const errStyle = (field) =>
                errs[field]
                  ? { ...base, borderColor: "#ef4444", background: "#fef2f2" }
                  : base;

              const dateOrderStyle =
                errs.dateOrder ? { borderColor: "#ef4444", boxShadow: "0 0 0 2px #fee2e2 inset" } : {};

              const qtyStyle = isZeroQty
                ? { ...base, color: "#c0392b", fontWeight: "bold", background: "#fdecea", borderColor: "#e6a2a2" }
                : base;

              return (
                <tr
                  key={realIdx}
                  style={{ background: viewIdx % 2 ? "#fdf6fa" : "#fff" }}
                  draggable
                  onDragStart={onDragStart(realIdx)}
                  onDragOver={onDragOver(realIdx)}
                  onDrop={onDrop(realIdx)}
                  title="Drag to reorder rows"
                >
                  {/* row index + status chip */}
                  <td style={td}>
                    <div style={{ fontSize: 12, color: "#64748b" }}>{realIdx + 1}</div>
                    <div style={{ marginTop: 4, fontSize: 11, fontWeight: 800, color: rowStatus.color }}>
                      {rowStatus.label}
                    </div>
                  </td>

                  <td style={td}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <input
                        value={r.product}
                        onChange={(e) => {
                          const updated = [...rows];
                          updated[realIdx].product = e.target.value;
                          // ★ auto-fill temp only if empty
                          if (!String(updated[realIdx].temp).trim()) {
                            updated[realIdx].temp = autoTempForProduct(updated[realIdx].product);
                          }
                          updated[realIdx].overallCondition = "OK";
                          setRows(updated);
                        }}
                        style={errStyle("product")}
                        placeholder="Product"
                      />
                      <button onClick={() => { setImageRowIndex(realIdx); setImageModalOpen(true); }} style={btnBlueSmall} title="Manage product images">
                        🖼️ ({Array.isArray(r.images) ? r.images.length : 0}/2)
                      </button>
                    </div>
                    {errs.product && <div style={hintErr}>{errs.product}</div>}
                  </td>

                  <td style={td}>
                    <input
                      list="customer-list"
                      value={r.customer}
                      onChange={(e) => {
                        const updated = [...rows];
                        updated[realIdx].customer = e.target.value;
                        setRows(updated);
                      }}
                      style={errStyle("customer")}
                      placeholder="Customer"
                    />
                    {errs.customer && <div style={hintErr}>{errs.customer}</div>}
                  </td>

                  <td style={td}>
                    <input
                      dir="ltr" lang="en"
                      value={r.orderNo}
                      onChange={(e) => {
                        const updated = [...rows];
                        updated[realIdx].orderNo = toAsciiDigits(e.target.value);
                        setRows(updated);
                      }}
                      style={errStyle("orderNo")}
                      placeholder="Order No"
                    />
                    {errs.orderNo && <div style={hintErr}>{errs.orderNo}</div>}
                  </td>

                  <td style={td}>
                    <input
                      dir="ltr" lang="en"
                      value={r.time}
                      onChange={(e) => {
                        const updated = [...rows];
                        updated[realIdx].time = toAsciiDigits(e.target.value);
                        setRows(updated);
                      }}
                      style={base}
                      placeholder="TIME (e.g., 08:45:14)"
                    />
                  </td>

                  <td style={td}>
                    <input
                      value={r.slaughterDate}
                      onChange={(e) => handleChange(realIdx, "slaughterDate", e.target.value)}
                      onBlur={() => handleDateBlur(realIdx, "slaughterDate")}
                      onPaste={handleDatePaste(realIdx, "slaughterDate")}
                      style={{ ...errStyle("slaughterDate"), ...dateOrderStyle }}
                      placeholder="DD/MM/YYYY"
                    />
                    {errs.slaughterDate && <div style={hintErr}>{errs.slaughterDate}</div>}
                  </td>

                  <td style={td}>
                    <input
                      value={r.expiryDate}
                      onChange={(e) => handleChange(realIdx, "expiryDate", e.target.value)}
                      onBlur={() => handleDateBlur(realIdx, "expiryDate")}
                      onPaste={handleDatePaste(realIdx, "expiryDate")}
                      style={{ ...errStyle("expiryDate"), ...dateOrderStyle }}
                      placeholder="DD/MM/YYYY"
                    />
                    {errs.expiryDate && <div style={hintErr}>{errs.expiryDate}</div>}
                    {errs.dateOrder && <div style={hintErr}>{errs.dateOrder}</div>}
                  </td>

                  <td style={td}>
                    <input
                      type="text" dir="ltr" lang="en" inputMode="decimal"
                      value={r.temp}
                      onChange={(e) => {
                        const updated = [...rows];
                        updated[realIdx].temp = toAsciiDigits(e.target.value).replace(/,/g, ".");
                        setRows(updated);
                      }}
                      style={errs.temp ? { ...base, borderColor: "#ef4444", background: "#fff7ed" } : base}
                      placeholder="TEMP"
                    />
                    {errs.temp && <div style={hintWarn}>{errs.temp}</div>}
                  </td>

                  <td style={td}>
                    <input
                      type="text" dir="ltr" lang="en" inputMode="decimal"
                      value={r.quantity}
                      onChange={(e) => {
                        const updated = [...rows];
                        updated[realIdx].quantity = toAsciiDigits(e.target.value).replace(/,/g, ".");
                        setRows(updated);
                      }}
                      style={errs.quantity ? { ...qtyStyle, borderColor: "#ef4444", background: "#fef2f2" } : qtyStyle}
                      placeholder="Quantity"
                    />
                    {errs.quantity && <div style={hintErr}>{errs.quantity}</div>}
                  </td>

                  <td style={td}>
                    <select
                      value={r.unitOfMeasure}
                      onChange={(e) => {
                        const updated = [...rows];
                        updated[realIdx].unitOfMeasure = e.target.value;
                        setRows(updated);
                      }}
                      style={base}
                    >
                      <option value="KG">KG</option>
                      <option value="BOX">BOX</option>
                      <option value="PLATE">PLATE</option>
                      <option value="Piece">Piece</option>
                    </select>
                  </td>

                  <td style={td}>
                    <input value="OK" disabled style={{ ...base, background: "#eef9ee", fontWeight: "bold" }} placeholder="OVERALL CONDITION" readOnly />
                  </td>

                  <td style={td}>
                    <input
                      value={r.remarks}
                      onChange={(e) => {
                        const updated = [...rows];
                        updated[realIdx].remarks = e.target.value;
                        setRows(updated);
                      }}
                      style={base}
                      placeholder="REMARKS"
                    />
                  </td>

                  <td style={td}>
                    <button
                      onClick={() => removeRow(realIdx)}
                      disabled={rows.length === 1}
                      style={{
                        background: "#c0392b",
                        color: "#fff",
                        border: "none",
                        borderRadius: 8,
                        fontWeight: "bold",
                        padding: "5px 11px",
                        cursor: rows.length === 1 ? "not-allowed" : "pointer",
                      }}
                    >
                      🗑️
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {/* customers datalist */}
        <datalist id="customer-list">
          {customerOptions.map((c) => (
            <option key={c} value={c} />
          ))}
        </datalist>
      </div>

      {/* Bottom actions */}
      <div style={{ display: "flex", gap: 10, marginTop: 18, flexWrap: "wrap" }}>
        <button onClick={addRow} style={btnInfo}>➕ Add Row</button>
        <button onClick={handleSave} style={btnSuccessWide}>💾 Save Report</button>
      </div>

      {/* Images modal */}
      <ImageManager
        open={imageModalOpen}
        row={imageRowIndex >= 0 ? (rows?.[imageRowIndex] || {}) : null}
        onClose={() => setImageModalOpen(false)}
        onAddImages={addImagesToRow}
        onRemoveImage={removeImageFromRow}
      />

      {/* Saving overlay */}
      {savingStage && (
        <div style={saveOverlayBack}>
          <div style={saveOverlayCard}>
            {savingStage === "saving" ? "Saving…" : "Saved ✅"}
          </div>
        </div>
      )}
    </div>
  );
}

/* ====== Styles ====== */
const th = {
  padding: "10px 8px",
  fontWeight: "bold",
  fontSize: "0.98em",
  textAlign: "center",
  border: "1px solid #000",
  whiteSpace: "nowrap",
};
const td = { padding: "6px 6px", textAlign: "center", verticalAlign: "top", border: "1px solid #000", whiteSpace: "nowrap" };
const labelStyle = { fontSize: 12, fontWeight: 700, color: "#334155" };
const inputStyle = {
  width: "100%",
  padding: "8px",
  borderRadius: "8px",
  border: "1.5px solid #d4e6f1",
  fontSize: "0.98em",
  background: "#fff",
  boxSizing: "border-box",
};
const metaInput = { ...inputStyle, minWidth: 240 };

const btnInfo = {
  background: "#5dade2",
  color: "#fff",
  fontWeight: "bold",
  border: "none",
  borderRadius: 10,
  padding: "9px 18px",
  cursor: "pointer",
};
const btnPurple = {
  background: "#884ea0",
  color: "#fff",
  fontWeight: "bold",
  border: "none",
  borderRadius: 10,
  padding: "9px 22px",
  cursor: "pointer",
};
const btnSuccess = {
  background: "#229954",
  color: "#fff",
  fontWeight: "bold",
  border: "none",
  borderRadius: 10,
  padding: "9px 22px",
};
const btnSuccessWide = { ...btnSuccess, padding: "11px 44px", borderRadius: 12 };
const btnBlueSmall = {
  background: "#2563eb",
  color: "#fff",
  border: "none",
  borderRadius: 8,
  padding: "6px 10px",
  fontWeight: "bold",
  whiteSpace: "nowrap",
  boxShadow: "0 1px 6px #bfdbfe",
};

const selectStyle = {
  padding: "9px 10px",
  borderRadius: 10,
  border: "1.7px solid #bfc9e0",
  background: "#f5f8fa",
  fontWeight: "bold",
  color: "#273746",
};

const infoBanner = {
  background: "#eaf2f8",
  color: "#1b4f72",
  borderRadius: 8,
  padding: "10px 12px",
  marginBottom: 10,
  fontWeight: "bold",
  textAlign: "center",
};
const okBanner = {
  background: "#d4efdf",
  color: "#229954",
  borderRadius: 8,
  padding: "12px 0",
  marginBottom: 10,
  fontWeight: "bold",
  textAlign: "center",
};
const errBanner = {
  background: "#fadbd8",
  color: "#c0392b",
  borderRadius: 8,
  padding: "12px 0",
  marginBottom: 10,
  fontWeight: "bold",
  textAlign: "center",
};
const hintErr = { color: "#b91c1c", fontSize: 11, marginTop: 4, textAlign: "left" };
const hintWarn = { color: "#b45309", fontSize: 11, marginTop: 4, textAlign: "left" };

/* Gallery modal styles */
const galleryBack = { position: "fixed", inset: 0, background: "rgba(15,23,42,.35)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 999 };
const galleryCard = { width: "min(1200px, 96vw)", maxHeight: "80vh", overflow: "auto", background: "#fff", color: "#111", borderRadius: 14, border: "1px solid #e5e7eb", padding: "14px 16px", boxShadow: "0 12px 32px rgba(0,0,0,.25)" };
const galleryClose = { background: "transparent", border: "none", color: "#111", fontWeight: 900, cursor: "pointer", fontSize: 18 };
const btnBlueModal = { background: "#2563eb", color: "#fff", border: "none", borderRadius: 10, padding: "8px 14px", fontWeight: "bold", cursor: "pointer", boxShadow: "0 1px 6px #bfdbfe" };
const thumbsWrap = { marginTop: 8, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))", gap: 10 };
const thumbTile = { position: "relative", border: "1px solid #e5e7eb", borderRadius: 10, overflow: "hidden", background: "#f8fafc" };
const thumbImg = { width: "100%", height: 150, objectFit: "cover", display: "block" };
const thumbRemove = { position: "absolute", top: 6, right: 6, background: "#ef4444", color: "#fff", border: "none", borderRadius: 8, padding: "2px 8px", fontWeight: 800, cursor: "pointer" };

/* Saving overlay styles */
const saveOverlayBack = { position: "fixed", inset: 0, background: "rgba(0,0,0,.35)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 };
const saveOverlayCard = { minWidth: 240, textAlign: "center", background: "#ffffff", color: "#0f172a", fontWeight: 800, fontSize: "1.05rem", borderRadius: 14, border: "1px solid #e5e7eb", padding: "16px 20px", boxShadow: "0 12px 30px rgba(0,0,0,.25)" };
