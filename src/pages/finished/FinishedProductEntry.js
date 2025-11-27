import React, { useState, useRef, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import * as XLSX from "xlsx-js-style";

/* ========= API ========= */
const API_BASE = String(
  (typeof window !== "undefined" && window.__QCS_API__) ||
  (typeof import.meta !== "undefined" && import.meta.env?.VITE_API_URL) ||
  (typeof process !== "undefined" &&
    (process.env?.REACT_APP_API_URL || process.env?.VITE_API_URL || process.env?.RENDER_EXTERNAL_URL)) ||
  "https://inspection-server-4nvj.onrender.com"
).replace(/\/$/, "");

/* نوع التقرير على السيرفر */
const TYPE = "finished_products_report";

/* ===== Helpers: common fetch wrappers ===== */
async function jsonFetch(url, opts = {}) {
  const res = await fetch(url, opts);
  let data = null;
  try { data = await res.json(); } catch { data = null; }
  return { ok: res.ok, status: res.status, data };
}
function extractReportsList(data) {
  if (!data) return [];
  if (Array.isArray(data)) return data;
  if (Array.isArray(data.items)) return data.items;
  return [];
}
function normalizeServerItem(item) {
  const payload = item?.payload && typeof item.payload === "object" ? item.payload : item || {};
  return {
    id: item?.id || item?._id,
    reportDate: payload.reportDate || item?.reportDate || "",
    reportTitle: payload.reportTitle || item?.reportTitle || "",
    products: Array.isArray(payload.products) ? payload.products : [],
  };
}

/** ابحث عن تقرير بنفس التاريخ (حسب النوع) وأرجع {id, ...} إن وجد */
async function findReportByDate(reportDate) {
  const { ok, data } = await jsonFetch(`${API_BASE}/api/reports?type=${encodeURIComponent(TYPE)}`);
  if (!ok) return null;
  const list = extractReportsList(data).map(normalizeServerItem);
  return list.find(r => String(r.reportDate) === String(reportDate)) || null;
}

/** إنشاء تقرير جديد (POST) */
async function createReportOnServer(doc) {
  const body = { reporter: "finished_products", type: TYPE, payload: doc };
  const { ok, data, status } = await jsonFetch(`${API_BASE}/api/reports`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!ok) {
    const msg = data?.error || `Server save failed (${status})`;
    throw new Error(msg);
  }
  return data;
}

/** استبدال تقرير موجود (PUT) */
async function replaceReportOnServer(existingId, doc) {
  const { ok, data, status } = await jsonFetch(`${API_BASE}/api/reports/${encodeURIComponent(existingId)}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ payload: doc }),
  });
  if (!ok) {
    const msg = data?.error || `Update failed (${status})`;
    throw new Error(msg);
  }
  return data;
}

/** واجهة موحّدة للحفظ: POST → إن تكرّر التاريخ نعمل PUT لنفس اليوم */
async function saveReportToServerUpsert(doc) {
  try {
    return await createReportOnServer(doc);
  } catch (err) {
    const emsg = String(err?.message || "");
    const duplicate =
      emsg.includes("duplicate key value") ||
      emsg.includes("already exists") ||
      emsg.includes("ux_reports_type_reportdate");

    if (!duplicate) throw err;

    const existing = await findReportByDate(doc.reportDate);
    if (!existing || !existing.id) throw err;
    return await replaceReportOnServer(existing.id, doc);
  }
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
  if (isFrozenProduct(product)) return randTemp(-18.0, -16.0, 1);
  return randTemp(1.1, 4.8, 1);
}

/* ===== Date helpers (للتحقق فقط) ===== */
function pad2(x) { return String(x).padStart(2, "0"); }
function excelSerialToDMY(n) {
  const base = new Date(Date.UTC(1899, 11, 30));
  const ms = Number(n) * 86400000;
  const d = new Date(base.getTime() + ms);
  if (isNaN(d)) return "";
  return `${pad2(d.getUTCDate())}/${pad2(d.getUTCMonth() + 1)}/${d.getUTCFullYear()}`;
}
function toDMY(val) {
  if (val == null || val === "") return "";
  const s0 = toAsciiDigits(String(val).trim());
  if (/^\d+(\.\d+)?$/.test(s0) && Number(s0) > 59) return excelSerialToDMY(Number(s0));
  const s = s0.replace(/[.\- ]/g, "/");
  let m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
  if (m) {
    let a = Number(m[1]); let b = Number(m[2]); let yyyy = m[3];
    if (yyyy.length === 2) yyyy = Number(yyyy) < 50 ? `20${yyyy}` : `19${yyyy}`;
    if (b > 12 && a <= 12) [a, b] = [b, a];
    if (a >= 1 && a <= 31 && b >= 1 && b <= 12) return `${pad2(a)}/${pad2(b)}/${yyyy}`;
  }
  m = s.match(/^(\d{4})\/(\d{1,2})\/(\d{1,2})$/);
  if (m) {
    const yyyy = m[1]; const mm = Number(m[2]); const dd = Number(m[3]);
    if (dd >= 1 && dd <= 31 && mm >= 1 && mm <= 12) return `${pad2(dd)}/${pad2(mm)}/${yyyy}`;
  }
  const d = new Date(s0);
  if (!isNaN(d)) return `${pad2(d.getDate())}/${pad2(d.getMonth() + 1)}/${d.getFullYear()}`;
  return "";
}
function maskDateTyped(input) {
  const ascii = toAsciiDigits(String(input));
  const s = ascii.replace(/[^\d]/g, "");
  if (s.length <= 2) return s;
  if (s.length <= 4) return `${s.slice(0, 2)}/${s.slice(2)}`;
  return `${s.slice(0, 2)}/${s.slice(2, 4)}/${s.slice(4, 8)}`;
}
function parseDMY(s) {
  const t = toAsciiDigits(String(s || ""));
  const m = t.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!m) return null;
  const dd = Number(m[1]), mm = Number(m[2]), yyyy = Number(m[3]);
  const d = new Date(yyyy, mm - 1, dd);
  return d && d.getMonth() + 1 === mm && d.getDate() === dd ? d : null;
}
function cmpDMY(a, b) {
  const pa = parseDMY(a); const pb = parseDMY(b);
  if (!pa || !pb) return null;
  if (pa.getTime() < pb.getTime()) return -1;
  if (pa.getTime() > pb.getTime()) return 1;
  return 0;
}

/* === Utilities لزر Import Dates فقط (as-is) === */
function getExcelDisplayText(ws, r, c) {
  try {
    const addr = XLSX.utils.encode_cell({ r, c });
    const cell = ws[addr];
    const raw = (cell?.w ?? "").toString().trim();
    return raw;
  } catch { return ""; }
}
function findPSE(ws) {
  const ref = ws["!ref"];
  if (!ref) return { p: 0, s: 1, e: 2, headerRow: 0 };
  const range = XLSX.utils.decode_range(ref);
  let idxP = 0, idxS = 1, idxE = 2, headerRow = range.s.r;
  for (let r = range.s.r; r <= Math.min(range.s.r + 5, range.e.r); r++) {
    for (let c = range.s.c; c <= range.e.c; c++) {
      const cell = ws[XLSX.utils.encode_cell({ r, c })];
      const t = (cell?.w || cell?.v || "").toString().toLowerCase();
      if (t.includes("product")) { idxP = c; headerRow = r; }
      if (t.includes("slaughter") || t.includes("production")) { idxS = c; headerRow = r; }
      if (t.includes("expiry") || t.includes("expiration")) { idxE = c; headerRow = r; }
    }
  }
  return { p: idxP, s: idxS, e: idxE, headerRow };
}
function chooseQtyFromStockLike(rec) {
  const done = toNumOrEmpty(rec["Done"]);
  const rrq = toNumOrEmpty(rec["Real Reserved Quantity"] ?? rec["Real reserved quantity"]);
  const a = done === "" ? 0 : done;
  const b = rrq === "" ? 0 : rrq;
  const sum = a + b;
  return sum === 0 ? "" : String(sum);
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
    out.product  = String(record["Product"] ?? "");
    out.customer = String(record["Customer"] ?? "");
    out.orderNo  = toAsciiDigits(record["Order No"] ?? "");
    out.time     = toAsciiDigits(record["TIME"] ?? "");
    out.slaughterDate = String(record["Slaughter Date"] ?? "");
    out.expiryDate    = String(record["Expiry Date"] ?? "");
    const q = toNumOrEmpty(record["Quantity"]);
    out.quantity          = !q || q === 0 ? "" : String(q);
    out.temp              = toNumStr(record["TEMP"]) || "";
    out.unitOfMeasure     = String(record["Unit of Measure"] ?? "KG") || "KG";
    out.overallCondition  = "OK";
    out.remarks           = String(record["REMARKS"] ?? "");
    if (out.temp === "") out.temp = autoTempForProduct(out.product);
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
    out.temp = "";
    out.quantity = chooseQtyFromStockLike(record);
    out.unitOfMeasure =
      String(record["Unit of Measure"] ?? record["Unit of measure"] ?? "KG") || "KG";
    out.overallCondition = "OK";
    out.remarks = "";
    if (out.temp === "") out.temp = autoTempForProduct(out.product);
    return out;
  }

  return out;
}

/* ========= Main ========= */
export default function FinishedProductEntry() {
  const navigate = useNavigate();

  const [reportTitle] = useState("FINISHED PRODUCTS");
  const [reportDate, setReportDate] = useState("");
  const [rows, setRows] = useState([{ ...emptyRow }]);

  const [savedMsg, setSavedMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [importSummary, setImportSummary] = useState("");
  const [importMode, setImportMode] = useState("append");

  const fileRef = useRef(null);
  const datesFileRef = useRef(null);

  const [savingStage, setSavingStage] = useState("");

  // 🔹 New: footer fields
  const [checkedBy, setCheckedBy] = useState("");
  const [verifiedBy, setVerifiedBy] = useState("");

  const customerOptions = useMemo(() => {
    const set = new Set(rows.map((r) => (r.customer || "").trim()).filter(Boolean));
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [rows]);

  function getRowErrors(r) {
    const errs = {};
    if (!String(r.product).trim()) errs.product = "Required";
    if (!String(r.customer).trim()) errs.customer = "Required";
    if (!String(r.orderNo).trim()) errs.orderNo = "Required";
    const qOk = !(r.quantity === "" || isNaN(Number(r.quantity)));
    if (!qOk) errs.quantity = "Required (number)";
    const sd = toDMY(r.slaughterDate) || "";
    const ed = toDMY(r.expiryDate) || "";
    if (!sd) errs.slaughterDate = "Required (DD/MM/YYYY)";
    if (!ed) errs.expiryDate = "Required (DD/MM/YYYY)";
    if (sd && ed) {
      const cmp = cmpDMY(sd, ed);
      if (cmp !== null && cmp > 0) {
        errs.dateOrder = "Expiry must be after or same day as Slaughter";
      }
    }
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

  /* Drag & Drop */
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

  /* Change handlers */
  const handleChange = (idx, key, value) => {
    const updated = [...rows];
    let v = value;

    if (key === "slaughterDate" || key === "expiryDate") {
      v = maskDateTyped(toAsciiDigits(v).replace(/[.\- ]/g, "/"));
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

  /* Normalize before save */
  function normalizeRow(r) {
    const uom = ["KG", "BOX", "PLATE", "Piece"].includes(r.unitOfMeasure) ? r.unitOfMeasure : "KG";
    const temp = String(r.temp ?? "").trim();
    const norm = {
      product: String(r.product || "").trim(),
      customer: String(r.customer || "").trim(),
      orderNo: toAsciiDigits(r.orderNo || "").trim(),
      time: toAsciiDigits(r.time || "").trim(),
      slaughterDate: toDMY(r.slaughterDate || ""),
      expiryDate: toDMY(r.expiryDate || ""),
      temp: temp === "" ? "" : String(Number(toAsciiDigits(temp).replace(/,/g, ".")).toFixed(1)),
      quantity: String(toNumOrEmpty(r.quantity || "")),
      unitOfMeasure: uom,
      overallCondition: "OK",
      remarks: String(r.remarks || "").trim(),
    };
    return norm;
  }

  /* Save (server only) */
  const handleSave = async () => {
    setSavingStage("saving");
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
    }

    const cleanRows = rows.map(normalizeRow);
    const ymd = String(reportDate || "").slice(0, 10);

    const doc = {
      id: Date.now(),
      reportTitle: "FINISHED PRODUCTS",
      reportDate: ymd,
      reportSavedAt: new Date().toISOString(),
      products: cleanRows,
      // 🔹 New footer fields saved with report
      checkedBy: checkedBy.trim(),
      verifiedBy: verifiedBy.trim(),
    };

    try {
      const res = await saveReportToServerUpsert(doc);
      setSavingStage("done");
      setSavedMsg(`✅ Saved on server (ID: ${res?.id || res?._id || "OK"}) — افتح التقارير من زر "Saved Reports" بالأعلى`);
      setRows([{ ...emptyRow }]);
      setCheckedBy("");
      setVerifiedBy("");
      setTimeout(() => setSavingStage(""), 400);
    } catch (err) {
      setSavingStage("");
      setErrorMsg(`Failed to save on server: ${err?.message || "Unknown error"}`);
      setTimeout(() => setErrorMsg(""), 4000);
    }
  };

  /* Import (full rows) */
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
          if (!String(t.temp).trim()) t.temp = autoTempForProduct(t.product);
          return normalizeRow(t);
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

  /* 📥 Import Dates (2 cols) — as-is (نص الخلية كما يظهر في إكسل) */
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
        const prodCell = ws[XLSX.utils.encode_cell({ r, c: idxP })];
        const prodText = (prodCell?.w || prodCell?.v || "").toString().trim();

        const sdRaw = getExcelDisplayText(ws, r, idxS);
        const edRaw = getExcelDisplayText(ws, r, idxE);

        if (!prodText && !sdRaw && !edRaw) continue;

        const m = String(prodText).match(/\[(\d+)\]/);
        const code = m ? m[1] : "";
        if (!code) continue;

        scanned++;
        const prev = codeToDates.get(code) || { sd: "", ed: "" };

        codeToDates.set(code, {
          sd: sdRaw || prev.sd,
          ed: edRaw || prev.ed,
        });
      }

      if (codeToDates.size === 0) {
        setErrorMsg("No valid [CODE] rows found in the dates sheet.");
        setTimeout(() => setErrorMsg(""), 3000);
        return;
      }

      let updated = 0;
      const nextRows = rows.map((r) => {
        const m = String(r.product).match(/\[(\d+)\]/);
        const code = m ? m[1] : "";
        if (!code || !codeToDates.has(code)) return r;
        const { sd, ed } = codeToDates.get(code);

        const hasChange =
          (sd && sd !== String(r.slaughterDate || "")) ||
          (ed && ed !== String(r.expiryDate || ""));
        if (hasChange) updated++;

        return {
          ...r,
          slaughterDate: sd || r.slaughterDate,
          expiryDate: ed || r.expiryDate,
          overallCondition: "OK",
        };
      });

      setRows(nextRows);
      setImportSummary(`📥 Dates import: matched ${updated} row(s) / scanned ${scanned}.`);
      setTimeout(() => setImportSummary(""), 3500);
    } catch {
      setErrorMsg("Failed to import dates.");
      setTimeout(() => setErrorMsg(""), 3000);
    } finally {
      if (datesFileRef.current) datesFileRef.current.value = "";
    }
  };

  const viewRows = useMemo(() => rows.map((r, i) => ({ r, idx: i })), [rows]);

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
      <div style={{
        position: "sticky", top: 0, zIndex: 20, background: "#fff",
        paddingBottom: 10, marginBottom: 14, borderBottom: "1px solid #e5e7eb"
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", gap: 16, flexWrap: "wrap" }}>
          <div style={{ display: "grid", gap: 6 }}>
            <label style={labelStyle}>Report Date</label>
            <input type="date" value={reportDate} onChange={(e) => setReportDate(e.target.value)} style={metaInput} />
          </div>

          <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
            <label style={btnPurple} title="Import XLSX/XLS/CSV (full rows)">
              📥 Import File
              <input
                ref={fileRef}
                type="file"
                accept=".xlsx,.xls,.xlsm,.xlsb,.csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel,text/csv"
                style={{ display: "none" }}
                onChange={onPick}
              />
            </label>

            <label style={btnPurple} title="Import Slaughter/Expiry dates only (as-is)">
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
      </div>

      {importSummary && <div style={infoBanner}>{importSummary}</div>}
      {savedMsg && <div style={okBanner}>{savedMsg}</div>}
      {errorMsg && <div style={errBanner}>{errorMsg}</div>}

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
                  <td style={td}>
                    <div style={{ fontSize: 12, color: "#64748b" }}>{realIdx + 1}</div>
                    <div style={{ marginTop: 4, fontSize: 11, fontWeight: 800, color: rowStatus.color }}>
                      {rowStatus.label}
                    </div>
                  </td>

                  <td style={td}>
                    <input
                      value={r.product}
                      onChange={(e) => {
                        const updated = [...rows];
                        updated[realIdx].product = e.target.value;
                        if (!String(updated[realIdx].temp).trim()) {
                          updated[realIdx].temp = autoTempForProduct(updated[realIdx].product);
                        }
                        updated[realIdx].overallCondition = "OK";
                        setRows(updated);
                      }}
                      style={errStyle("product")}
                      placeholder="Product"
                    />
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

        <datalist id="customer-list">
          {customerOptions.map((c) => (
            <option key={c} value={c} />
          ))}
        </datalist>
      </div>

      {/* 🔹 New footer fields under the table */}
      <div style={{ display: "flex", gap: 16, marginTop: 18, flexWrap: "wrap" }}>
        <div style={{ minWidth: 240 }}>
          <label style={labelStyle}>Checked By</label>
          <input
            type="text"
            value={checkedBy}
            onChange={(e) => setCheckedBy(e.target.value)}
            style={metaInput}
            placeholder="Checked By"
          />
        </div>
        <div style={{ minWidth: 240 }}>
          <label style={labelStyle}>Verified By</label>
          <input
            type="text"
            value={verifiedBy}
            onChange={(e) => setVerifiedBy(e.target.value)}
            style={metaInput}
            placeholder="Verified By"
          />
        </div>
      </div>

      <div style={{ display: "flex", gap: 10, marginTop: 18, flexWrap: "wrap" }}>
        <button onClick={addRow} style={btnInfo}>➕ Add Row</button>
        <button onClick={handleSave} style={btnSuccessWide}>💾 Save Report</button>
      </div>

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
  border: "1px solid #6c0addff",
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

const saveOverlayBack = { position: "fixed", inset: 0, background: "rgba(0,0,0,.35)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 };
const saveOverlayCard = { minWidth: 240, textAlign: "center", background: "#ffffff", color: "#0f172a", fontWeight: 800, fontSize: "1.05rem", borderRadius: 14, border: "1px solid #e5e7eb", padding: "16px 20px", boxShadow: "0 12px 30px rgba(0,0,0,.25)" };
