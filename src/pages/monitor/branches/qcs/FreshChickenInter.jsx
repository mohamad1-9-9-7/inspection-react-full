// src/pages/monitor/branches/qcs/FreshChickenInter.jsx
import React, { useEffect, useMemo, useState } from "react";

/* ====== API (aligned with Returns.js) ====== */
const API_ROOT_DEFAULT = "https://inspection-server-4nvj.onrender.com";
const fromWindow = typeof window !== "undefined" ? window.__QCS_API__ : undefined;
const fromProcess =
  typeof process !== "undefined"
    ? (process.env?.REACT_APP_API_URL ||
        process.env?.VITE_API_URL ||
        process.env?.RENDER_EXTERNAL_URL)
    : undefined;
let fromVite;
try {
  fromVite =
    import.meta.env &&
    (import.meta.env.VITE_API_URL || import.meta.env.RENDER_EXTERNAL_URL);
} catch {
  fromVite = undefined;
}
const API_BASE = String(fromWindow || fromProcess || fromVite || API_ROOT_DEFAULT).replace(
  /\/$/,
  ""
);

/* ===== Document No (fixed) ===== */
const DOC_NO = "FS-QM/REC/FC-001";

/* ===== Product Catalog (Dropdown + Add new) ===== */
const PRODUCT_CATALOG_KEY = "qcs_fresh_chicken_products_catalog_v1";
const DEFAULT_PRODUCT_CATALOG = [
  "FRESH-CHICKEN-900",
  "FRESH-CHICKEN-1000",
  "FRESH-CHICKEN-700",
  "FRESH-CHICKEN-750",
  "FRESH-CHICKEN-950",
  "FRESH-CHICKEN-850",
  "FRESH-CHICKEN-1200",
  "FC-LIVER-500-GM",
  "FC-HEART-500-GM",
  "FC-BONE-1-KG",
  "FC-WINGS-500-GM",
  "FC-GIZZARD-500-GM",
  "CHICKEN BREAST FILLET",
  "WHOLE CHICKEN 1200 GR",
];

function normProduct(s) {
  return String(s ?? "").trim().replace(/\s+/g, " ");
}
function uniqMergeKeepOrder(base = [], extra = []) {
  const seen = new Set();
  const out = [];
  const push = (v) => {
    const vv = normProduct(v);
    if (!vv) return;
    const k = vv.toLowerCase();
    if (seen.has(k)) return;
    seen.add(k);
    out.push(vv);
  };
  base.forEach(push);
  extra.forEach(push);
  return out;
}

/* Images API: POST /api/images, DELETE /api/images?url=... */
async function uploadImageViaServer(file) {
  const fd = new FormData();
  fd.append("file", file);
  const url = `${API_BASE}/api/images`;
  const res = await fetch(url, { method: "POST", body: fd });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.ok || !(data.optimized_url || data.url)) {
    const txt =
      typeof data === "object"
        ? JSON.stringify(data)
        : await res.text().catch(() => "");
    throw new Error(`Upload failed ${res.status}: ${txt}`);
  }
  return { url: data.optimized_url || data.url };
}
async function deleteImageUrl(url) {
  if (!url) return true;
  const res = await fetch(
    `${API_BASE}/api/images?url=${encodeURIComponent(url)}`,
    { method: "DELETE" }
  );
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data?.ok)
    throw new Error(`Delete failed ${res.status}: ${data?.error || ""}`);
  return true;
}

/* Reports API: POST /api/reports with { reporter, type, payload } */
async function saveReportOnServer({ type, payload }) {
  const endpoint = `${API_BASE}/api/reports`;
  const res = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ reporter: "QC", type, payload }),
  });
  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new Error(`Save failed ${res.status}: ${txt}`);
  }
  return await res.json();
}

/* ====== Date helpers ====== */
function isValidISO(iso) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return false;
  const [y, m, d] = iso.split("-").map(Number);
  const dt = new Date(y, m - 1, d);
  return (
    dt.getFullYear() === y && dt.getMonth() === m - 1 && dt.getDate() === d
  );
}
function toDMYfromISO(iso) {
  if (!isValidISO(iso)) return iso;
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}

/* ====== Variants ====== */
const REPORT_TYPES = [
  { id: "mixed_parts", label: "Fresh Wings, Gizzard & Bones" },
  { id: "griller", label: "Fresh Full Chicken (Griller)" },
  { id: "liver", label: "Fresh Chicken Liver" },
];
const REPORT_TYPE_KEY = "pos_al_qusais_fresh_chicken_receiving";

/* ===== Fixed rows per variant ===== */
const ROWS_MIXED = [
  { key: "productName", label: "PRODUCT NAME" },
  { key: "sampleNo", label: "Sample No" },
  { key: "sizeGrade", label: "Size / Grade" },
  { key: "packingSize", label: "Packing Size" },
  { key: "sifNo", label: "SIF No" },
  { key: "lotNo", label: "Lot No." },
  { key: "productionDate", label: "Production Date" },
  { key: "expiryDate", label: "Expiry Date" },
  { key: "totalPiece", label: "Total Piece", type: "number" },
  { key: "pw350_400", label: "Piece Weight 350/400", type: "number" },
  { key: "pw300_350", label: "Piece Weight 300/350", type: "number" },
  { key: "pw250_300", label: "Piece Weight 250/300", type: "number" },
  { key: "pw200_250", label: "Piece Weight 200/250", type: "number" },
  { key: "pw150_200", label: "Piece Weight 150/200", type: "number" },
  { key: "pw100_150", label: "Piece Weight 100/150", type: "number" },
  { key: "pw100lt", label: "Piece Weight <100", type: "number" },
  { key: "temperature", label: "Temperature (°C)", type: "number" },
  { key: "fat", label: "Fat" },
  { key: "discolour", label: "Discolour %" },
  { key: "dehydration", label: "Dehydration" },
  { key: "whitePatches", label: "White Patches" },
  { key: "brokenCut", label: "Broken / Cut Pieces" },
  { key: "appearance", label: "Appearance" },
  { key: "parasites", label: "Parasites" },
  { key: "filth", label: "Filth" },
  { key: "boneCartilage", label: "Bone / Cartilage" },
  { key: "bloodSpot", label: "Blood Spot" },
  { key: "feather", label: "Feather" },
  { key: "skin", label: "Skin" },
  { key: "texture", label: "Texture" },
  { key: "badOdour", label: "Bad Odour" },
];
const ROWS_GRILLER = [
  { key: "productName", label: "PRODUCT NAME" },
  { key: "sampleNo", label: "Sample No" },
  { key: "sizeGrade", label: "Size / Grade" },
  { key: "packingSize", label: "Packing Size" },
  { key: "sifNo", label: "SIF No" },
  { key: "productionDate", label: "Production Date" },
  { key: "expiryDate", label: "Expiry Date" },
  { key: "ntWeight", label: "Net Weight", type: "number" },
  { key: "totalPiece", label: "Total Piece", type: "number" },
  { key: "pieceWeight1", label: "Piece Weight", type: "number" },
  { key: "pieceWeight2", label: "Piece Weight", type: "number" },
  { key: "pieceWeight3", label: "Piece Weight", type: "number" },
  { key: "pieceWeight4", label: "Piece Weight", type: "number" },
  { key: "pieceWeight5", label: "Piece Weight", type: "number" },
  { key: "temperature", label: "Temperature (°C)", type: "number" },
  { key: "fat", label: "Fat" },
  { key: "discolour", label: "Discolour %" },
  { key: "dehydration", label: "Dehydration" },
  { key: "odour", label: "Odour" },
  { key: "appearance", label: "Appearance" },
  { key: "parasites", label: "Parasites" },
  { key: "brokenLeg", label: "Broken Leg" },
  { key: "yellowishLegSkin", label: "Yellowish Leg/Skin" },
  { key: "bloodSpot", label: "Blood Spot" },
  { key: "darkGreySkinLeg", label: "Dark Grey Skin in Leg" },
  { key: "bruisesWingsSurface", label: "Bruises in Wings / Surface" },
  { key: "bruisesLegSurface", label: "Bruises in Leg / Surface" },
  { key: "featherSkin", label: "Feather and Skin" },
  { key: "brokenWings", label: "Broken Wings" },
  { key: "neckSkin", label: "Neck Skin" },
  { key: "brokenSkin", label: "Broken Skin" },
];
const ROWS_LIVER = [
  { key: "productName", label: "PRODUCT NAME" },
  { key: "sampleNo", label: "Sample No" },
  { key: "sizeGrade", label: "Size / Grade" },
  { key: "packingSize", label: "Packing Size" },
  { key: "sifNo", label: "SIF No" },
  { key: "lotNo", label: "Lot No." },
  { key: "productionDate", label: "Production Date" },
  { key: "expiryDate", label: "Expiry Date" },
  { key: "temperature", label: "Temperature (°C)", type: "number" },
  { key: "fat", label: "Fat" },
  { key: "discolour", label: "Discolour %" },
  { key: "dehydration", label: "Dehydration" },
  { key: "whitePatches", label: "White Patches" },
  { key: "brokenCut", label: "Broken / Cut Pieces" },
  { key: "appearance", label: "Appearance" },
  { key: "parasites", label: "Parasites" },
  { key: "filth", label: "Filth" },
  { key: "boneCartilage", label: "Bone / Cartilage" },
  { key: "bloodSpot", label: "Blood Spot" },
  { key: "feather", label: "Feather" },
  { key: "skin", label: "Skin" },
  { key: "texture", label: "Texture" },
  { key: "badOdour", label: "Bad Odour" },
];

/* ===== Default values ===== */
const DEFAULTS_MIXED = {
  fat: "NIL",
  discolour: "NIL",
  dehydration: "NIL",
  whitePatches: "NIL",
  brokenCut: "NIL",
  appearance: "OK",
  parasites: "NIL",
  filth: "NIL",
  boneCartilage: "NIL",
  bloodSpot: "NIL",
  feather: "NIL",
  skin: "NIL",
  texture: "OK",
  badOdour: "NIL",
};
const DEFAULTS_GRILLER = {
  fat: "OK",
  discolour: "NIL",
  dehydration: "NIL",
  odour: "NIL",
  appearance: "OK",
  parasites: "NIL",
  brokenLeg: "NIL",
  yellowishLegSkin: "NIL",
  bloodSpot: "NIL",
  darkGreySkinLeg: "NIL",
  bruisesWingsSurface: "NIL",
  bruisesLegSurface: "NIL",
  featherSkin: "NIL",
  brokenWings: "NIL",
  neckSkin: "NIL",
  brokenSkin: "NIL",
};
const DEFAULTS_LIVER = {
  sampleNo: "1",
  sizeGrade: "NIL",
  sifNo: "NIL",
  lotNo: "NIL",
  fat: "NIL",
  discolour: "NIL",
  dehydration: "NIL",
  whitePatches: "NIL",
  brokenCut: "NIL",
  appearance: "OK",
  parasites: "NIL",
  filth: "NIL",
  boneCartilage: "NIL",
  bloodSpot: "NIL",
  feather: "NIL",
  skin: "NIL",
  texture: "OK",
  badOdour: "NIL",
};
const rowsFor = (v) =>
  v === "griller" ? ROWS_GRILLER : v === "liver" ? ROWS_LIVER : ROWS_MIXED;
const defaultsFor = (v) =>
  v === "griller" ? DEFAULTS_GRILLER : v === "liver" ? DEFAULTS_LIVER : DEFAULTS_MIXED;

/* ======= Component ======= */
export default function FreshChickenInter() {
  const [header, setHeader] = useState({
    branchCode: "POS-ALQUSAIS",
    reportNo: "",
    sampleReceivedOn: "",
    inspectionDate: "",
    truckTemperature: "",
    brand: "",
    invoiceNumber: "",
    origin: "Locally Slaughtered",
    supplier: "",
    productName: "",
  });

  const [reportVariant, setReportVariant] = useState("mixed_parts");
  const defaultProductName = useMemo(() => {
    if (reportVariant === "griller") return "FRESH CHICKEN GRILLER";
    if (reportVariant === "liver") return "FRESH CHICKEN LIVER";
    return "FRESH CHICKEN GIZZARD, WINGS, WHOLE LEG, THIGHS AND BONES";
  }, [reportVariant]);

  /* ===== Product Catalog state (load + persist) ===== */
  const [productCatalog, setProductCatalog] = useState(DEFAULT_PRODUCT_CATALOG);
  const [newProduct, setNewProduct] = useState("");

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = window.localStorage.getItem(PRODUCT_CATALOG_KEY);
      const parsed = raw ? JSON.parse(raw) : [];
      const merged = uniqMergeKeepOrder(DEFAULT_PRODUCT_CATALOG, Array.isArray(parsed) ? parsed : []);
      setProductCatalog(merged);
    } catch {
      setProductCatalog(DEFAULT_PRODUCT_CATALOG);
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      window.localStorage.setItem(PRODUCT_CATALOG_KEY, JSON.stringify(productCatalog));
    } catch {}
  }, [productCatalog]);

  const productExists = (name) => {
    const v = normProduct(name).toLowerCase();
    return productCatalog.some((p) => String(p).toLowerCase() === v);
  };

  const addNewProductToCatalog = () => {
    const v = normProduct(newProduct);
    if (!v) return;
    if (productExists(v)) return;
    setProductCatalog((prev) => [...prev, v]);
    setNewProduct("");
    // auto select it in header
    setHeader((p) => ({ ...p, productName: v }));
  };

  const makeSampleCol = (variant, index) => {
    const rows = rowsFor(variant);
    const defs = defaultsFor(variant);
    const obj = { sampleId: index + 1 };
    rows.forEach((r) => {
      if (r.key === "sampleNo") obj[r.key] = String(index + 1);
      else if (r.key === "productName") obj[r.key] = "";
      else obj[r.key] = defs[r.key] ?? "";
    });
    return obj;
  };

  const [samplesByVariant, setSamplesByVariant] = useState({
    mixed_parts: [makeSampleCol("mixed_parts", 0)],
    griller: [makeSampleCol("griller", 0)],
    liver: [makeSampleCol("liver", 0)],
  });
  const currentSamples = samplesByVariant[reportVariant];
  const setCurrentSamples = (updater) =>
    setSamplesByVariant((prev) => ({
      ...prev,
      [reportVariant]:
        typeof updater === "function" ? updater(prev[reportVariant]) : updater,
    }));

  const [entryDates, setEntryDates] = useState({
    mixed_parts: "",
    griller: "",
    liver: "",
  });
  const setEntryDate = (variant, value) =>
    setEntryDates((p) => ({ ...p, [variant]: value }));

  const [images, setImages] = useState([]); // [{ url, name }]
  const [certs, setCerts] = useState([]); // [{ url, name }]

  /* ===== Break Up per-variant ===== */
  const [breakupByVariant, setBreakupByVariant] = useState({
    mixed_parts: [],
    griller: [],
    liver: [],
  });
  const currentBreakup = breakupByVariant[reportVariant];
  const setCurrentBreakup = (updater) =>
    setBreakupByVariant((prev) => ({
      ...prev,
      [reportVariant]:
        typeof updater === "function" ? updater(prev[reportVariant]) : updater,
    }));
  const addBreakupRow = () =>
    setCurrentBreakup((p) => [...p, { productName: "", packing: "", totalQty: "" }]);
  const setBreakupCell = (i, k, v) =>
    setCurrentBreakup((p) => {
      const n = [...p];
      n[i] = { ...n[i], [k]: v };
      return n;
    });
  const removeBreakupRow = (i) =>
    setCurrentBreakup((p) => p.filter((_, idx) => idx !== i));

  const [remarks, setRemarks] = useState("Overall quality found satisfactory");
  const [checkedBy, setCheckedBy] = useState("");
  const [verifiedBy, setVerifiedBy] = useState("");
  const [saving, setSaving] = useState(false);

  /* ====== Styles (EMBEDDED IN TAB) ====== */
  const COLORS = {
    ink: "#0b132b",
    line: "#0b132b",
    bg: "#f3f6fb",
    card: "#ffffff",
    blueBar: "#cfe3ff",
    greenBar: "#c6f1df",
    tabOn: "#0b132b",
    tabOff: "#eef2f7",
    gridHeader: "#eef6ff",
    ok: "#16a34a",
    warn: "#f59e0b",
    bad: "#dc2626",
  };

  // ⬇️ إصلاح: بدون position: fixed / inset: 0
  const page = {
    padding: 18,
    overflowY: "auto",
    background: COLORS.bg,
    fontFamily: "Inter, -apple-system, Segoe UI, Roboto, sans-serif",
    color: COLORS.ink,
  };
  const container = { width: "100%", maxWidth: "100%", margin: 0 };

  const sectionCard = {
    background: COLORS.card,
    border: `2px solid ${COLORS.line}`,
    borderRadius: 14,
    boxShadow: "0 8px 20px rgba(0,0,0,.05)",
    padding: 16,
    marginBottom: 16,
    overflow: "hidden",
  };
  const sectionBar = (color) => ({
    height: 10,
    borderRadius: 8,
    background: color,
    margin: "-6px -6px 12px -6px",
    border: `2px solid ${COLORS.line}`,
  });
  const sectionTitle = { margin: "0 0 12px", fontWeight: 900, fontSize: 18 };
  const label = {
    fontWeight: 900,
    fontSize: 13,
    marginBottom: 6,
    display: "block",
  };
  const input = {
    width: "100%",
    maxWidth: "100%",
    padding: "10px 12px",
    borderRadius: 10,
    border: `2px solid ${COLORS.line}`,
    background: COLORS.card,
    color: COLORS.ink,
    fontSize: 14,
    boxSizing: "border-box",
  };
  const grid = (n) => ({
    display: "grid",
    gridTemplateColumns: `repeat(${n}, minmax(0, 1fr))`,
    gap: 12,
  });
  const btn = {
    padding: "12px 18px",
    borderRadius: 10,
    border: `2px solid ${COLORS.line}`,
    background: COLORS.tabOn,
    color: "#fff",
    fontWeight: 900,
    cursor: "pointer",
  };
  const btnGhost = {
    padding: "12px 16px",
    borderRadius: 10,
    border: `2px dashed ${COLORS.line}`,
    background: COLORS.card,
    color: COLORS.ink,
    fontWeight: 800,
    cursor: "pointer",
  };
  const tabsWrap = {
    display: "grid",
    gridTemplateColumns: "repeat(3, 1fr)",
    gap: 10,
    width: "100%",
  };
  const tabBtn = (active) => ({
    width: "100%",
    padding: "14px 18px",
    borderRadius: 12,
    border: `2px solid ${COLORS.line}`,
    background: active ? COLORS.tabOn : COLORS.tabOff,
    color: active ? "#fff" : COLORS.ink,
    fontWeight: 900,
    cursor: "pointer",
  });
  const tableWrap = {
    overflowX: "auto",
    border: `2px solid ${COLORS.line}`,
    borderRadius: 12,
    background: COLORS.card,
  };
  const table = {
    width: "100%",
    borderCollapse: "separate",
    borderSpacing: 0,
    fontSize: 14,
    tableLayout: "fixed",
  };
  const th = {
    background: COLORS.gridHeader,
    borderBottom: `2px solid ${COLORS.line}`,
    borderRight: `2px solid ${COLORS.line}`,
    textAlign: "left",
    padding: 10,
    fontWeight: 900,
    position: "sticky",
    top: 0,
    zIndex: 1,
    whiteSpace: "nowrap",
  };
  const td = {
    borderTop: `2px solid ${COLORS.line}`,
    borderRight: `2px solid ${COLORS.line}`,
    padding: 8,
    verticalAlign: "top",
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
  };
  const tdAttr = {
    ...td,
    fontWeight: 900,
    background: "#fff",
    position: "sticky",
    left: 0,
    zIndex: 2,
    minWidth: 240,
  };

  /* ===== UI helpers ===== */
  const setH = (k, v) => setHeader((p) => ({ ...p, [k]: v }));
  const clampNonNegative = (val) => {
    const n = Number(val);
    if (!Number.isFinite(n)) return "";
    return n < 0 ? 0 : n;
  };
  const clampTemperature = (val) => {
    const n = Number(val);
    if (!Number.isFinite(n)) return "";
    return Math.min(15, Math.max(-5, n));
  };
  const setCell = (colIdx, key, value, type) =>
    setCurrentSamples((prev) => {
      const next = [...prev];
      const curr = { ...next[colIdx] };
      if (type === "number") {
        const v = /temp/i.test(key) ? clampTemperature(value) : clampNonNegative(value);
        curr[key] = v === "" ? "" : String(v);
      } else {
        curr[key] = value;
      }
      next[colIdx] = curr;
      return next;
    });
  const addSampleColumn = () =>
    setCurrentSamples((prev) => [...prev, makeSampleCol(reportVariant, prev.length)]);
  const removeLastSampleColumn = () =>
    setCurrentSamples((prev) => (prev.length > 1 ? prev.slice(0, -1) : prev));

  /* Attachments (Images & Certificates) */
  const doUploadList = async (fileList, dest = "images") => {
    const files = Array.from(fileList || []);
    if (!files.length) return;

    // Enforce: Certificates max 2 files
    if (dest === "certs") {
      const remaining = Math.max(0, 2 - certs.length);
      if (remaining <= 0) {
        alert("يسمح بملفين كحد أقصى لشهادات الحلال.");
        return;
      }
      const limited = files.slice(0, remaining);
      if (limited.length < files.length)
        alert("تم تجاوز الحد — أُضيف أول ملفين فقط لشهادات الحلال.");
      for (const file of limited) {
        try {
          const { url } = await uploadImageViaServer(file);
          if (url) setCerts((p) => [...p, { url, name: file.name }]);
        } catch {
          alert(`Upload failed: ${file?.name || ""}`);
        }
      }
      return;
    }

    // Images (no strict limit)
    for (const file of files) {
      try {
        const { url } = await uploadImageViaServer(file);
        if (url) setImages((p) => [...p, { url, name: file.name }]);
      } catch {
        alert(`Upload failed: ${file?.name || ""}`);
      }
    }
  };
  const onPickImages = async (e, to = "images") => {
    await doUploadList(e.target.files, to);
    e.target.value = "";
  };
  const onDeleteImg = async (url, from = "images") => {
    try {
      await deleteImageUrl(url);
    } catch {
    } finally {
      const setters = { images: setImages, certs: setCerts };
      const setFn = setters[from] || setImages;
      setFn((p) => p.filter((x) => x.url !== url));
    }
  };
  const prevent = (e) => {
    e.preventDefault();
    e.stopPropagation();
  };
  const onDropZone = (dest) => async (e) => {
    prevent(e);
    const dt = e.dataTransfer;
    if (dt && dt.files && dt.files.length) await doUploadList(dt.files, dest);
  };

  const tempBadge = useMemo(() => {
    const t = Number(header.truckTemperature);
    if (!Number.isFinite(t)) return null;
    if (t >= 0 && t <= 4.9) return { text: "Acceptable (0–4.9°C)", color: COLORS.ok };
    if (t >= 5 && t <= 7.9) return { text: "Warning (5–7.9°C)", color: COLORS.warn };
    if (t >= 8) return { text: "Not acceptable (≥8°C)", color: COLORS.bad };
    if (t < 0) return { text: "Below 0°C — check transport conditions", color: COLORS.warn };
    return null;
  }, [header.truckTemperature]);

  /* ===== Required-fields validation ===== */
  const validateBeforeSave = (variant) => {
    const missing = [];
    const invalid = [];

    const entryDateISO = (entryDates[variant] || "").trim();
    if (!isValidISO(entryDateISO)) missing.push(`Report Entry Date — Variant: ${variant}`);

    if (!isValidISO(header.sampleReceivedOn || "")) missing.push("Sample Received On (date)");
    if (!isValidISO(header.inspectionDate || "")) missing.push("Inspection Date (date)");

    if (header.truckTemperature === "" || !Number.isFinite(Number(header.truckTemperature))) {
      missing.push("Truck / Product Temperature (°C)");
    } else {
      const t = Number(header.truckTemperature);
      if (t < -5 || t > 15) invalid.push("Truck / Product Temperature must be between -5 and 15°C");
    }

    if (!(header.brand || "").trim()) missing.push("Brand");
    if (!(header.invoiceNumber || "").trim()) missing.push("Invoice Number");
    if (!(header.origin || "").trim()) missing.push("Origin");
    if (!(header.supplier || "").trim()) missing.push("Supplier");

    if (!((header.productName || "").trim() || (defaultProductName || "").trim())) {
      missing.push("PRODUCT NAME");
    }

    if (!(checkedBy || "").trim()) missing.push("CHECKED BY");
    if (!(verifiedBy || "").trim()) missing.push("VERIFIED BY");

    return { missing, invalid, entryDateISO };
  };

  /* Save */
  const onSaveVariant = async (variant) => {
    const { missing, invalid, entryDateISO } = validateBeforeSave(variant);
    if (missing.length || invalid.length) {
      const list = [
        ...(missing.length ? ["• Missing:", ...missing.map((m) => `  - ${m}`)] : []),
        ...(invalid.length ? ["• Invalid:", ...invalid.map((m) => `  - ${m}`)] : []),
      ].join("\n");
      alert(`Please complete required fields before saving:\n\n${list}`);
      return;
    }

    const rows = rowsFor(variant);
    const columns = samplesByVariant[variant];

    const ensuredHeader = {
      ...header,
      productName: (header.productName || "").trim() || defaultProductName,
    };

    const payload = {
      branchCode: ensuredHeader.branchCode,
      reportVariant: variant,
      header: { ...ensuredHeader, reportEntryDate: entryDateISO },
      samplesTable: {
        rows: rows.map((r) => ({ key: r.key, label: r.label, type: r.type || "text" })),
        columns,
      },
      breakup: breakupByVariant[variant],
      remarks,
      footer: { checkedBy, verifiedBy },
      images,
      certificates: certs,
      meta: {
        createdAt: new Date().toISOString(),
        createdBy: "QC",
        entryDate: entryDateISO,
        version: 1,
      },
    };

    try {
      setSaving(true);
      const res = await saveReportOnServer({ type: REPORT_TYPE_KEY, payload });
      setSaving(false);
      alert(`✅ Saved '${variant}' for ${toDMYfromISO(entryDateISO)}. ID: ${res?.id || res?._id || "N/A"}`);
    } catch (err) {
      setSaving(false);
      alert(String(err?.message || "Saving to server failed."));
    }
  };

  const rows = rowsFor(reportVariant);
  const saveDisabled = saving;

  const addBtnDisabled = !normProduct(newProduct) || productExists(newProduct);

  return (
    <div style={page} dir="ltr">
      <div style={container}>
        {/* datalist used by Header + table cells */}
        <datalist id="fresh-chicken-product-list">
          {productCatalog.map((p) => (
            <option value={p} key={p} />
          ))}
        </datalist>

        {/* ===== Banner ===== */}
        <div style={{ ...sectionCard, padding: 0 }}>
          <div style={sectionBar(COLORS.blueBar)} />
          <div style={{ display: "grid", gridTemplateColumns: "280px 1fr 1fr", borderBottom: `2px solid ${COLORS.line}` }}>
            <div style={{ borderRight: `2px solid ${COLORS.line}`, padding: 8, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <div style={{ fontWeight: 900, fontSize: 22, letterSpacing: 1 }}>AL MAWASHI</div>
            </div>

            {/* Middle column: add Document No under Document Title */}
            <div style={{ borderRight: `2px solid ${COLORS.line}` }}>
              <BannerRow title="Document Title" value="Raw Material Inspection Report [Fresh Chicken]" />
              <BannerRow title="Document No" value={DOC_NO} />
              <BannerRow title="Issue Date" value="05/05/2022" />
              <BannerRow title="Area" value="QA" />
              <BannerRow title="Controlling Officer" value="Online Quality Controller" />
            </div>

            {/* Right column: without Document No (to avoid duplication) */}
            <div>
              <BannerRow title="Revision No" value="0" />
              <BannerRow title="Issued By" value="MOHAMAD ABDULLAH" />
              <BannerRow title="Approved By" value="Hussam Sarhan" />
            </div>
          </div>
        </div>

        {/* ===== Variant & entry date / save ===== */}
        <div style={sectionCard}>
          <div style={sectionBar(COLORS.greenBar)} />
          <h3 style={sectionTitle}>Report Variant</h3>
          <div style={tabsWrap}>
            {REPORT_TYPES.map((t) => (
              <button
                key={t.id}
                onClick={() => setReportVariant(t.id)}
                style={tabBtn(reportVariant === t.id)}
                type="button"
              >
                {t.label}
              </button>
            ))}
          </div>

          <div style={{ marginTop: 12, display: "grid", gridTemplateColumns: "1fr auto", gap: 10 }}>
            <div>
              <label style={label}>Report Entry Date — Variant: {reportVariant}</label>
              <input
                type="date"
                style={input}
                value={entryDates[reportVariant] || ""}
                onChange={(e) => setEntryDate(reportVariant, e.target.value)}
              />
            </div>
            <div style={{ display: "flex", alignItems: "flex-end" }}>
              <button type="button" disabled={saveDisabled} onClick={() => onSaveVariant(reportVariant)} style={btn}>
                {saving ? "Saving…" : `Save ${reportVariant} report`}
              </button>
            </div>
          </div>
        </div>

        {/* ===== Header ===== */}
        <div style={sectionCard}>
          <div style={sectionBar(COLORS.blueBar)} />
          <h3 style={sectionTitle}>Header</h3>
          <div style={grid(5)}>
            <div>
              <label style={label}>Report No</label>
              <input style={input} value={header.reportNo} onChange={(e) => setH("reportNo", e.target.value)} placeholder="e.g., 1" />
            </div>
            <div>
              <label style={label}>Sample Received On</label>
              <input type="date" style={input} value={header.sampleReceivedOn} onChange={(e) => setH("sampleReceivedOn", e.target.value)} />
            </div>
            <div>
              <label style={label}>Inspection Date</label>
              <input type="date" style={input} value={header.inspectionDate} onChange={(e) => setH("inspectionDate", e.target.value)} />
            </div>
            <div>
              <label style={label}>Truck / Product Temperature (°C)</label>
              <input
                type="number"
                step="0.1"
                min={-5}
                max={15}
                style={input}
                value={header.truckTemperature}
                onChange={(e) => setH("truckTemperature", String(clampTemperature(e.target.value)))}
                placeholder="e.g., 4.6"
              />
              {tempBadge && (
                <div
                  style={{
                    marginTop: 6,
                    fontWeight: 800,
                    fontSize: 12,
                    display: "inline-block",
                    padding: "6px 10px",
                    borderRadius: 8,
                    border: `2px solid ${COLORS.line}`,
                    background: "#fff",
                    color: tempBadge.color,
                  }}
                >
                  {tempBadge.text}
                </div>
              )}
            </div>
            <div>
              <label style={label}>Brand</label>
              <input style={input} value={header.brand} onChange={(e) => setH("brand", e.target.value)} placeholder="e.g., AL AIN FARM (AL REEF)" />
            </div>
            <div>
              <label style={label}>Invoice Number</label>
              <input style={input} value={header.invoiceNumber} onChange={(e) => setH("invoiceNumber", e.target.value)} placeholder="e.g., KMP 20215" />
            </div>
            <div>
              <label style={label}>Origin</label>
              <input style={input} value={header.origin} onChange={(e) => setH("origin", e.target.value)} placeholder="Locally Slaughtered" />
            </div>
            <div>
              <label style={label}>Supplier</label>
              <input style={input} value={header.supplier} onChange={(e) => setH("supplier", e.target.value)} placeholder="e.g., KANZ AL MADAM" />
            </div>

            {/* ✅ PRODUCT NAME as dropdown (datalist) + add new */}
            <div style={{ gridColumn: "1 / -1" }}>
              <label style={label}>Product Name</label>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 360px", gap: 12, alignItems: "start" }}>
                {/* dropdown-like input */}
                <div>
                  <input
                    list="fresh-chicken-product-list"
                    style={input}
                    value={header.productName}
                    onChange={(e) => setH("productName", e.target.value)}
                    placeholder={defaultProductName}
                  />
                  <div style={{ fontSize: 12, opacity: 0.75, marginTop: 6 }}>
                    Click the field to pick from the list, or type to search.
                  </div>
                </div>

                {/* add new product */}
                <div style={{ border: `2px dashed ${COLORS.line}`, borderRadius: 12, padding: 12, background: "#fff" }}>
                  <div style={{ fontWeight: 900, marginBottom: 8 }}>Add new product</div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 10 }}>
                    <input
                      style={input}
                      value={newProduct}
                      onChange={(e) => setNewProduct(e.target.value)}
                      placeholder="Type new product name…"
                    />
                    <button
                      type="button"
                      onClick={addNewProductToCatalog}
                      disabled={addBtnDisabled}
                      style={{
                        ...btn,
                        opacity: addBtnDisabled ? 0.6 : 1,
                        cursor: addBtnDisabled ? "not-allowed" : "pointer",
                        padding: "10px 14px",
                      }}
                    >
                      Add
                    </button>
                  </div>
                  {normProduct(newProduct) && productExists(newProduct) && (
                    <div style={{ marginTop: 8, fontSize: 12, fontWeight: 800, color: COLORS.warn }}>
                      This product already exists in the list.
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ===== Samples Table ===== */}
        <div style={sectionCard}>
          <div style={sectionBar(COLORS.greenBar)} />
          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginBottom: 8 }}>
            <button type="button" style={btnGhost} onClick={addSampleColumn}>
              + Add Sample (column)
            </button>
            <button type="button" style={{ ...btnGhost, borderStyle: "solid" }} onClick={removeLastSampleColumn}>
              Remove Sample (column)
            </button>
          </div>

          <div style={tableWrap} dir="ltr">
            <table style={table}>
              <colgroup>
                <col style={{ width: 260 }} />
                {currentSamples.map((_, i) => (
                  <col key={i} style={{ width: 220 }} />
                ))}
              </colgroup>
              <thead>
                <tr>
                  <th style={{ ...th, left: 0, position: "sticky", zIndex: 2, borderRight: `2px solid ${COLORS.line}` }}>
                    Attribute
                  </th>
                  {currentSamples.map((s, i) => (
                    <th key={i} style={th}>{`Sample ${i + 1}`}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.key}>
                    <td style={tdAttr}>{row.label}</td>
                    {currentSamples.map((s, colIdx) => (
                      <td key={`${row.key}-${colIdx}`} style={td}>
                        {row.key === "productName" ? (
                          <input
                            list="fresh-chicken-product-list"
                            style={input}
                            value={s[row.key] ?? ""}
                            onChange={(e) => setCell(colIdx, row.key, e.target.value, "text")}
                            placeholder="Pick / type product…"
                          />
                        ) : row.type === "number" ? (
                          <input
                            type="number"
                            step="0.1"
                            style={input}
                            value={s[row.key] ?? ""}
                            onChange={(e) => setCell(colIdx, row.key, e.target.value, "number")}
                          />
                        ) : (
                          <input
                            style={input}
                            value={s[row.key] ?? ""}
                            onChange={(e) => setCell(colIdx, row.key, e.target.value, "text")}
                          />
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Remarks */}
        <div style={sectionCard}>
          <div style={sectionBar(COLORS.blueBar)} />
          <h3 style={sectionTitle}>Remarks / C.A</h3>
          <textarea
            rows={3}
            style={{ ...input, resize: "vertical", whiteSpace: "pre-wrap" }}
            value={remarks}
            onChange={(e) => setRemarks(e.target.value)}
          />
        </div>

        {/* Break Up */}
        <div style={sectionCard}>
          <div style={sectionBar(COLORS.greenBar)} />
          <h3 style={sectionTitle}>Break Up</h3>
          {currentBreakup.length === 0 && (
            <button type="button" style={btnGhost} onClick={addBreakupRow}>
              + Add Product Row
            </button>
          )}
          {currentBreakup.map((r, i) => (
            <div key={i} style={{ ...grid(4), marginBottom: 10, alignItems: "end" }}>
              <div>
                <label style={label}>Product Name</label>
                <input
                  style={input}
                  value={r.productName}
                  onChange={(e) => setBreakupCell(i, "productName", e.target.value)}
                  placeholder="e.g., FRESH CHICKEN WINGS"
                />
              </div>
              <div>
                <label style={label}>Packing</label>
                <input
                  style={input}
                  value={r.packing}
                  onChange={(e) => setBreakupCell(i, "packing", e.target.value)}
                  placeholder="e.g., 500 GM * 1 PLATE"
                />
              </div>

              {/* === Total Qty with KG suffix === */}
              <div>
                <label style={label}>Total Qty (KG)</label>
                <div style={{ position: "relative" }}>
                  <input
                    type="number"
                    min={0}
                    step="0.1"
                    style={{ ...input, paddingRight: 56 }}
                    value={r.totalQty}
                    onChange={(e) => setBreakupCell(i, "totalQty", e.target.value)}
                    placeholder="e.g., 8"
                  />
                  <span
                    style={{
                      position: "absolute",
                      right: 8,
                      top: "50%",
                      transform: "translateY(-50%)",
                      border: `2px solid ${COLORS.line}`,
                      background: "#fff",
                      padding: "4px 10px",
                      borderRadius: 8,
                      fontWeight: 900,
                      fontSize: 12,
                    }}
                  >
                    KG
                  </span>
                </div>
              </div>

              <div style={{ display: "flex", gap: 8 }}>
                <button type="button" style={btnGhost} onClick={addBreakupRow}>
                  + Add
                </button>
                <button type="button" style={{ ...btnGhost, borderStyle: "solid" }} onClick={() => removeBreakupRow(i)}>
                  Remove
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Attachments (Images & Certificates) */}
        <div style={sectionCard}>
          <div style={sectionBar(COLORS.blueBar)} />
          <h3 style={sectionTitle}>Attachments</h3>

          <div style={{ ...grid(2) }}>
            {/* Images */}
            <div
              onDragEnter={prevent}
              onDragOver={prevent}
              onDrop={onDropZone("images")}
              style={{
                padding: 14,
                border: `2px dashed ${COLORS.line}`,
                borderRadius: 12,
                background: "#fff",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                <strong>Product Images</strong>
                <label style={{ ...btnGhost, cursor: "pointer", margin: 0 }}>
                  Choose images
                  <input type="file" accept="image/*" multiple style={{ display: "none" }} onChange={(e) => onPickImages(e, "images")} />
                </label>
              </div>
              <div style={{ fontSize: 12, opacity: 0.8, marginBottom: 8 }}>
                Drag & drop images here or use “Choose images”.
              </div>
              <ThumbGrid items={images} onDelete={(url) => onDeleteImg(url, "images")} />
            </div>

            {/* Certificates (max 2) */}
            <div
              onDragEnter={prevent}
              onDragOver={prevent}
              onDrop={onDropZone("certs")}
              style={{
                padding: 14,
                border: `2px dashed ${COLORS.line}`,
                borderRadius: 12,
                background: "#fff",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                <strong>Certificates / Docs</strong>
                <label style={{ ...btnGhost, cursor: "pointer", margin: 0 }}>
                  Choose files
                  <input type="file" multiple style={{ display: "none" }} onChange={(e) => onPickImages(e, "certs")} />
                </label>
              </div>
              <div style={{ fontSize: 12, opacity: 0.8, marginBottom: 8 }}>
                Drag & drop files here or use “Choose files”.
              </div>
              <ThumbGrid items={certs} onDelete={(url) => onDeleteImg(url, "certs")} docMode />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div style={sectionCard}>
          <div style={sectionBar(COLORS.greenBar)} />
          <h3 style={sectionTitle}>Approval</h3>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div>
              <label style={label}>CHECKED BY:</label>
              <input style={input} value={checkedBy} onChange={(e) => setCheckedBy(e.target.value)} placeholder="Name / Signature" />
            </div>
            <div>
              <label style={label}>VERIFIED BY:</label>
              <input style={input} value={verifiedBy} onChange={(e) => setVerifiedBy(e.target.value)} placeholder="Name / Signature" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* Simple banner row */
function BannerRow({ title, value }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "220px 1fr", borderBottom: "2px solid #0b132b" }}>
      <div style={{ padding: 8, fontWeight: 900, background: "#e9eef9", borderRight: "2px solid #0b132b" }}>
        {title}:
      </div>
      <div style={{ padding: 8, fontWeight: 800, background: "#ffffff" }}>{value}</div>
    </div>
  );
}

/* Attachment preview grid */
function ThumbGrid({ items = [], onDelete, docMode = false }) {
  const grid = { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(120px, 1fr))", gap: 10 };
  const cell = {
    border: "2px solid #0b132b",
    borderRadius: 12,
    background: "#fff",
    overflow: "hidden",
    position: "relative",
    minHeight: 120,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: 6,
  };
  const delBtn = {
    position: "absolute",
    top: 6,
    left: 6,
    padding: "6px 10px",
    fontWeight: 900,
    borderRadius: 8,
    border: "2px solid #0b132b",
    background: "#fff",
    cursor: "pointer",
  };
  const nameTag = {
    position: "absolute",
    bottom: 0,
    right: 0,
    left: 0,
    background: "rgba(255,255,255,.9)",
    borderTop: "2px solid #0b132b",
    padding: "4px 6px",
    fontSize: 11,
    textAlign: "center",
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
    direction: "ltr",
  };

  return (
    <div style={grid}>
      {items.map((it, i) => (
        <div style={cell} key={it.url || i}>
          <button type="button" onClick={() => onDelete(it.url)} style={delBtn}>
            Delete
          </button>
          {docMode ? (
            <a href={it.url} target="_blank" rel="noreferrer" style={{ fontWeight: 800, textDecoration: "underline" }}>
              Open document
            </a>
          ) : (
            <img src={it.url} alt={it.name || `img-${i}`} style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain" }} />
          )}
          <div style={nameTag} title={it.name || ""}>
            {it.name || ""}
          </div>
        </div>
      ))}
      {items.length === 0 && (
        <div style={{ gridColumn: "1 / -1", fontSize: 12, opacity: 0.7, textAlign: "center" }}>
          No attachments yet.
        </div>
      )}
    </div>
  );
}
