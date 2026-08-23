// src/pages/monitor/branches/POS 11/POS11TraceabilityLogInput.jsx
import React, { useEffect, useMemo, useState } from "react";
import { REPORTS_URL } from "../shipment_recc/qcsRawApi";
import API_BASE from "../../../../config/api";
import { RAW_RECIPES, classifyRaw, ALL_FINALS } from "../_shared/traceabilityRecipes";

/* ===== API base ===== */


/* ===== ثابت التقرير ===== */
const TYPE   = "pos11_traceability_log";
const BRANCH = "POS 11";

/* ===== Batch ID generator ===== */
let __batchCounter = 1;
function genBatchId() {
  try {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    const n = String(__batchCounter++).padStart(3, "0");
    return `B-${y}${m}${dd}-${n}`;
  } catch {
    return `B-${Date.now()}`;
  }
}

/* ===== قوالب عناصر الإدخال/الإخراج ===== */
const emptyInput = () => ({
  rawName: "", origProdDate: "", origExpDate: "", openedDate: "", bestBefore: "",
  rawWeight: ""
});
const emptyOutput = () => ({
  finalName: "", finalProdDate: "", finalExpDate: "",
  finalWeight: ""
});

/* ===== Batch (سطر واحد) ===== */
function emptyBatch() {
  return {
    batchId: genBatchId(),
    inputs: [newInput()],
    outputs: [emptyOutput()],
  };
}

/* ===== Helpers: pick / pad2 / toYMD / fetch ===== */
const pad2 = (v) => String(v || "").padStart(2, "0");
const toYMD = (d) => {
  if (!d) return "";
  const x = new Date(d);
  if (isNaN(x)) return "";
  return `${x.getFullYear()}-${pad2(x.getMonth() + 1)}-${pad2(x.getDate())}`;
};

/* ===== قواعد تلقائية للمادة الخام =====
   Opened Date = تاريخ اليوم دائماً
   Best Before = تاريخ الفتح + يومين (صلاحية 3 أيام شاملة، مثال: 18/07 → 20/07) */
const SHELF_LIFE_DAYS = 2;
const todayYMD = () => {
  try { return new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Dubai" }); }
  catch { return toYMD(new Date()); }
};
const addDays = (ymd, n) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(ymd || ""))) return "";
  const [y, m, d] = ymd.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() + n);
  return `${dt.getUTCFullYear()}-${pad2(dt.getUTCMonth() + 1)}-${pad2(dt.getUTCDate())}`;
};
// صف مادة خام جديد مع تعبئة تلقائية لتاريخ الفتح والأفضل-قبل
const newInput = () => {
  const opened = todayYMD();
  return { ...emptyInput(), openedDate: opened, bestBefore: addDays(opened, SHELF_LIFE_DAYS) };
};
// حقول المادة الخام "الجوهرية" (لا تشمل التواريخ التلقائية) لتحديد إن كان الصف يحوي بيانات فعلية
const INPUT_SIGNIFICANT = ["rawName", "origProdDate", "origExpDate", "rawWeight"];
const inputHasData = (inp) => INPUT_SIGNIFICANT.some((k) => String(inp?.[k] || "").trim() !== "");
async function jsonFetch(url, opts = {}) {
  const { signal, ...rest } = opts || {};
  const res = await fetch(url, { headers: { Accept: "application/json" }, signal, ...rest });
  let data = null;
  try { data = await res.json(); } catch { data = null; }
  return { ok: res.ok, status: res.status, data };
}
const pick = (obj, paths, fallback = "") => {
  for (const p of paths) {
    let cur = obj;
    const parts = p.split(".");
    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      if (cur && Object.prototype.hasOwnProperty.call(cur, part)) {
        cur = cur[part];
      } else {
        cur = undefined;
        break;
      }
    }
    if (cur !== undefined && cur !== null && cur !== "") return cur;
  }
  return fallback;
};

/* ===== Date extraction for RAW ===== */
const MONTH_RE_1 = /^(\d{4})[\/\-](\d{1,2})$/;
const MONTH_RE_2 = /^(\d{1,2})[\/\-](\d{4})$/;
const DATE_RE =
  /(\d{4}[\/\-]\d{1,2}[\/\-]\d{1,2})|(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})|(\d{4}[\/\-]\d{1,2})|(\d{1,2}[\/\-]\d{4})/g;

const normDate = (v) => {
  if (!v) return "";
  const s = String(v).trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  const m1 = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})$/);
  if (m1) {
    let d = +m1[1], mn = +m1[2], y = +m1[3];
    if (y < 100) y += 2000;
    return `${y}-${pad2(mn)}-${pad2(d)}`;
  }
  let m = s.match(MONTH_RE_1);
  if (m) {
    const y = +m[1], mn = +m[2];
    return `${y}-${pad2(mn)}`;
  }
  m = s.match(MONTH_RE_2);
  if (m) {
    const mn = +m[1], y = +m[2];
    return `${y}-${pad2(mn)}`;
  }
  const asYMD = toYMD(s);
  return asYMD || "";
};

function extractAllDates(value) {
  if (!value) return [];
  const s = String(value);
  const seen = new Set();
  const out = [];
  const matches = s.match(DATE_RE) || [];
  for (const raw of matches) {
    const n = normDate(raw);
    if (n && !seen.has(n)) {
      seen.add(n);
      out.push(n);
    }
  }
  return out.sort();
}

function formatDateList(arr) {
  if (!arr || arr.length === 0) return "";
  if (arr.length === 1) return arr[0];
  return `${arr[0]} - ${arr[arr.length - 1]}`;
}

/* ===== Key normalizer + collectors ===== */
const _alias = (s) => String(s||"").toLowerCase().replace(/[\s_\-./]/g, "");
function _valuesByAliases(obj, aliases) {
  const out = [];
  if (!obj || typeof obj !== "object") return out;
  for (const [k, v] of Object.entries(obj)) {
    const nk = _alias(k);
    if (aliases.has(nk) && (typeof v === "string" || typeof v === "number")) out.push(String(v));
    if (v && typeof v === "object" && !Array.isArray(v)) {
      for (const [kk, vv] of Object.entries(v)) {
        const nnk = _alias(kk);
        if (aliases.has(nnk) && (typeof vv === "string" || typeof vv === "number")) out.push(String(vv));
      }
    }
  }
  return out;
}
const SLAUGHTER_KEYS = new Set([
  "slaughterdate","dateofslaughter","productiondate","manufacturedate","manufactureddate","mfgdate","mfd","proddate","dateofproduction"
]);
const EXPIRY_KEYS = new Set([
  "expirydate","expdate","expiry","bestbefore","bestbeforedate","bbd","useby","usebydate"
]);

function deriveSlaughterAndExpiry(payloadIn) {
  const payload = payloadIn || {};
  const header  = payload.header || payload;
  const gi      = payload.generalInfo || payload.info || {};

  const sDates = [];
  const eDates = [];

  [payload, header, gi].forEach((o) => {
    _valuesByAliases(o, SLAUGHTER_KEYS).forEach(v => extractAllDates(v).forEach(d => sDates.push(d)));
    _valuesByAliases(o, EXPIRY_KEYS).forEach(v => extractAllDates(v).forEach(d => eDates.push(d)));
  });

  const rows =
    payload.rows || payload.products || payload.items || payload.lines || payload.details || [];
  if (Array.isArray(rows)) {
    rows.forEach((r) => {
      _valuesByAliases(r, SLAUGHTER_KEYS).forEach(v => extractAllDates(v).forEach(d => sDates.push(d)));
      _valuesByAliases(r, EXPIRY_KEYS).forEach(v => extractAllDates(v).forEach(d => eDates.push(d)));
    });
  }
  const samples = Array.isArray(payload.samples) ? payload.samples : [];
  samples.forEach((s) => {
    _valuesByAliases(s, SLAUGHTER_KEYS).forEach(v => extractAllDates(v).forEach(d => sDates.push(d)));
    _valuesByAliases(s, EXPIRY_KEYS).forEach(v => extractAllDates(v).forEach(d => eDates.push(d)));
  });

  const uniqS = Array.from(new Set(sDates)).sort();
  const uniqE = Array.from(new Set(eDates)).sort();
  return {
    slaughterDate: formatDateList(uniqS),
    expiryDate:    formatDateList(uniqE),
  };
}

/* ===== استخراج منتجات الشحنة (اسم + تاريخ إنتاج + تاريخ انتهاء) ===== */
const isYMD = (s) => /^\d{4}-\d{2}-\d{2}$/.test(String(s || ""));
function extractProducts(payloadIn) {
  const p = payloadIn || {};
  const samples = Array.isArray(p.samples) ? p.samples : [];
  const out = [];
  samples.forEach((s) => {
    const name = String(s?.productName || "").trim();
    const prodDate = normDate(s?.slaughterDate ?? s?.productionDate ?? "");
    const expDate = normDate(s?.expiryDate ?? s?.bestBefore ?? "");
    if (!name && !prodDate && !expDate) return;
    out.push({
      name,
      prodDate: isYMD(prodDate) ? prodDate : "",
      expDate: isYMD(expDate) ? expDate : "",
    });
  });
  // احتياطي: إذا ما في samples، استخدم أسطر المنتجات (أسماء فقط)
  if (out.length === 0) {
    const lines = Array.isArray(p.productLines) ? p.productLines
                : Array.isArray(p.lines) ? p.lines : [];
    lines.forEach((l) => {
      const name = String(l?.name || l?.productName || "").trim();
      if (name) out.push({ name, prodDate: "", expDate: "" });
    });
  }
  return out;
}

/* ===== تطبيع سجل RAW (AWB, Shipment, Slaughter, Expiry, Invoice) ===== */
function normalizeRawForIndex(doc) {
  const payload = doc?.payload || doc || {};
  const header  = payload.header || payload;
  const gi      = payload.generalInfo || payload.info || {};

  const awb =
    pick(header, ["airWayBillNo","airWayBill","airwayBill","airway_bill","awb","AWB","airWaybillNo","airwayBillNo"]) ||
    pick(gi,     ["airWayBillNo","airWayBill","airwayBill","airway_bill","awb","AWB","airWaybillNo","airwayBillNo"]) ||
    pick(payload,["airWayBillNo","airWayBill","airwayBill","airway_bill","awb","AWB","airWaybillNo","airwayBillNo"]) ||
    pick(doc,    ["airWayBillNo","airWayBill","airwayBill","airway_bill","awb","AWB","airWaybillNo","airwayBillNo"]) ||
    "";

  const invoice =
    pick(header,  ["invoiceNo","invoiceNumber","invoice","invNo","billNo","billNumber","invoice no"]) ||
    pick(gi,      ["invoiceNo","invoiceNumber","invoice","invNo","billNo","billNumber","invoice no"]) ||
    pick(payload, ["invoiceNo","invoiceNumber","invoice","invNo","billNo","billNumber","invoice no"]) ||
    pick(doc,     ["invoiceNo","invoiceNumber","invoice","invNo","billNo","billNumber","invoice no"]) ||
    "";

  const shipment =
    pick(header, ["shipmentType","shipment","brandType","category","productGroup"]) ||
    pick(gi,     ["shipmentType","shipment"]) ||
    pick(payload,["shipmentType","shipment","brandType","category","productGroup"]) ||
    pick(doc,    ["shipmentType","shipment","brandType","category","productGroup"]) ||
    "";

  const { slaughterDate, expiryDate } = deriveSlaughterAndExpiry(payload);

  return {
    id: doc?.id || doc?._id || payload?.id || payload?._id || "",
    awb: String(awb || "").trim(),
    invoice: String(invoice || "").trim(),
    shipment: String(shipment || "").trim(),
    slaughterDate: String(slaughterDate || "").trim(),
    expiryDate: String(expiryDate || "").trim(),
    products: extractProducts(payload),
  };
}

/* ===== جلب وبناء فهرس RAW ===== */
async function fetchRawIndex({ signal } = {}) {
  const q = `${REPORTS_URL}?type=${encodeURIComponent("qcs_raw_material")}&limit=50`;
  const { ok, data } = await jsonFetch(q, { signal });
  if (!ok) return [];
  const items = Array.isArray(data) ? data : (data && (data.data || data.items || data.reports)) || [];
  return items.map(normalizeRawForIndex);
}

/* ===== أزرار مصغرة ===== */
const miniBtn = {
  border: "1px solid",
  borderRadius: 8,
  padding: "4px 6px",
  fontSize: 10,
  fontWeight: 700,
  cursor: "pointer",
};

export default function POS11TraceabilityLogInput() {
  /* ===== ترويسة ===== */
  const [section, setSection] = useState("");
  const [date, setDate] = useState(() => {
    try { return new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Dubai" }); }
    catch { const d=new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`; }
  });

  /* ===== بيانات: سطور = دفعات ===== */
  const [batches, setBatches] = useState(() => [emptyBatch()]);
  const [checkedBy, setCheckedBy]   = useState("");
  const [verifiedBy, setVerifiedBy] = useState("");
  const [saving, setSaving] = useState(false);

  /* ===== فحص وجود تقرير محفوظ لنفس اليوم (نفس الفرع/النوع) ===== */
  const [hasExistingForDate, setHasExistingForDate] = useState(false);
  const [checkingExisting, setCheckingExisting] = useState(false);

  useEffect(() => {
    let abort = false;
    async function checkExisting() {
      if (!date) { setHasExistingForDate(false); return; }
      setCheckingExisting(true);
      try {
        // Targeted read: the server matches the business date and returns at
        // most one row. Asking for the type alone became limit=5000 on the way
        // out, so every traceability log ever filed for this branch arrived in
        // full just to answer whether this day was already used. TYPE already
        // names the branch, so no branch comparison is needed either.
        const res = await fetch(
          `${API_BASE}/api/reports?type=${encodeURIComponent(TYPE)}&reportDate=${encodeURIComponent(date)}`,
          { cache: "no-store", headers: { Accept: "application/json" } }
        );
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        let json = null;
        try { json = await res.json(); } catch { json = null; }
        const arr = Array.isArray(json)
          ? json
          : json?.data || json?.items || json?.reports || json?.rows || [];
        const exists = (arr || []).length > 0;
        if (!abort) setHasExistingForDate(exists);
      } catch (e) {
        console.error("Failed to check existing traceability log", e);
        if (!abort) setHasExistingForDate(false);
      } finally {
        if (!abort) setCheckingExisting(false);
      }
    }
    checkExisting();
    return () => { abort = true; };
  }, [date]);

  /* ===== RAW index ===== */
  const [rawIndex, setRawIndex] = useState([]);
  const [rawQ, setRawQ] = useState("");
  const [showRawModal, setShowRawModal] = useState(false);
  const [activeBatch, setActiveBatch] = useState(null);
  const [pickShipment, setPickShipment] = useState(null); // الشحنة المختارة لعرض منتجاتها

  /* ===== نافذة المنتجات النهائية المقترحة من المادة الخام ===== */
  const [recipeBI, setRecipeBI] = useState(null);     // فهرس الدفعة
  const [recipeRaw, setRecipeRaw] = useState("");     // اسم المادة الخام المرجعية
  const [recipeCat, setRecipeCat] = useState(null);   // الصنف المختار (auto أو يدوي)
  const [recipeSel, setRecipeSel] = useState(() => new Set());
  const [recipeSearch, setRecipeSearch] = useState("");

  useEffect(() => {
    const ac = new AbortController();
    (async () => {
      try {
        const list = await fetchRawIndex({ signal: ac.signal });
        setRawIndex(list);
      } catch (e) {
        if (e?.name !== "AbortError") console.error(e);
      }
    })();
    return () => ac.abort();
  }, []);

  const filteredRaw = useMemo(() => {
    const q = String(rawQ || "").toLowerCase().trim();
    if (!q) return rawIndex;
    return rawIndex.filter(r => {
      const hay = [r.awb, r.invoice, r.shipment, r.slaughterDate, r.expiryDate].join(" ").toLowerCase();
      return hay.indexOf(q) !== -1;
    });
  }, [rawIndex, rawQ]);

  const openRawModal = (batchIndex) => { setActiveBatch(batchIndex); setRawQ(""); setPickShipment(null); setShowRawModal(true); };
  const closeRawModal = () => { setShowRawModal(false); setActiveBatch(null); setRawQ(""); setPickShipment(null); };

  // رقم الدفعة من الشحنة (AWB أو Invoice)
  const shipmentBatchId = (r) => {
    const awbIsNil = !r.awb || r.awb.trim().toUpperCase() === "NIL";
    return awbIsNil
      ? (r.invoice || `${r.shipment || "Shipment"}-${(r.slaughterDate || "").replaceAll(" ", "")}`)
      : (r.awb || `${r.shipment || "Shipment"}-${(r.slaughterDate || "").replaceAll(" ", "")}`);
  };

  // ربط الشحنة فقط (رقم الدفعة) — احتياطي عندما لا توجد منتجات
  const chooseRaw = (r) => {
    if (activeBatch === null || activeBatch === undefined) return;
    const val = shipmentBatchId(r);
    setBatches((prev) => {
      const next = [...prev];
      next[activeBatch] = { ...next[activeBatch], batchId: val };
      return next;
    });
    closeRawModal();
  };

  // اختيار الشحنة: منتج واحد → تعبئة مباشرة، أكثر → عرض قائمة المنتجات، بدون منتجات → رقم الدفعة فقط
  const pickRawShipment = (r) => {
    const products = Array.isArray(r.products) ? r.products : [];
    if (products.length > 1) { setPickShipment(r); return; }
    if (products.length === 1) { chooseProduct(r, products[0]); return; }
    chooseRaw(r);
  };

  // تعبئة صف مادة خام من منتج داخل شحنة (اسم + تاريخ إنتاج + تاريخ انتهاء) + ضبط رقم الدفعة
  const chooseProduct = (shipment, product) => {
    if (activeBatch === null || activeBatch === undefined) return;
    const bi = activeBatch;
    const rawName = product.name || "";
    setBatches((prev) => {
      const next = [...prev];
      const b = { ...next[bi] };
      // ضبط رقم الدفعة فقط إذا كان فارغاً أو ما زال القيمة الافتراضية المولّدة
      const cur = String(b.batchId || "").trim();
      if (!cur || /^B-\d{8}-\d{3}$/.test(cur)) b.batchId = shipmentBatchId(shipment);
      // تعبئة أول صف بدون بيانات جوهرية، وإلا إضافة صف جديد (مع تواريخ الفتح/الأفضل-قبل التلقائية)
      const filled = {
        ...newInput(),
        rawName,
        origProdDate: isYMD(product.prodDate) ? product.prodDate : "",
        origExpDate: isYMD(product.expDate) ? product.expDate : "",
      };
      const inputs = [...b.inputs];
      const emptyIdx = inputs.findIndex((inp) => !inputHasData(inp));
      if (emptyIdx >= 0) inputs[emptyIdx] = filled;
      else inputs.push(filled);
      b.inputs = inputs;
      next[bi] = b;
      return next;
    });
    closeRawModal();
    // فتح نافذة المنتجات النهائية فوراً بناءً على المادة الخام المرتبطة
    openRecipe(bi, rawName);
  };

  /* ===== المنتجات النهائية المقترحة من المادة الخام ===== */
  const openRecipe = (bi, rawName) => {
    setRecipeBI(bi);
    setRecipeRaw(String(rawName || ""));
    setRecipeCat(classifyRaw(rawName)); // تصنيف تلقائي (قد يكون null إذا لم يُتعرَّف عليه)
    setRecipeSel(new Set());
    setRecipeSearch("");
  };
  const closeRecipe = () => {
    setRecipeBI(null);
    setRecipeRaw("");
    setRecipeCat(null);
    setRecipeSel(new Set());
    setRecipeSearch("");
  };
  const toggleRecipeSel = (name) => {
    setRecipeSel((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  };
  // إضافة منتجات نهائية إلى مخرجات الدفعة (تاريخ إنتاج = اليوم، انتهاء = +يومين، الوزن يدوي)
  const addFinalsToBatch = (bi, names) => {
    const list = (Array.isArray(names) ? names : [names])
      .map((n) => String(n || "").trim())
      .filter(Boolean);
    if (bi === null || bi === undefined || !list.length) return;
    const today = todayYMD();
    const exp = addDays(today, SHELF_LIFE_DAYS);
    setBatches((prev) => {
      const next = [...prev];
      const b = { ...next[bi] };
      const outputs = [...b.outputs];
      const existing = new Set(
        outputs.map((o) => String(o.finalName || "").trim().toLowerCase()).filter(Boolean)
      );
      for (const nm of list) {
        if (existing.has(nm.toLowerCase())) continue;
        existing.add(nm.toLowerCase());
        const row = { finalName: nm, finalProdDate: today, finalExpDate: exp, finalWeight: "" };
        const emptyIdx = outputs.findIndex((o) =>
          Object.values(o).every((v) => String(v || "").trim() === "")
        );
        if (emptyIdx >= 0) outputs[emptyIdx] = row;
        else outputs.push(row);
      }
      b.outputs = outputs;
      next[bi] = b;
      return next;
    });
  };
  const confirmRecipe = () => {
    addFinalsToBatch(recipeBI, [...recipeSel]);
    closeRecipe();
  };

  const recipe = useMemo(
    () => (recipeCat ? RAW_RECIPES.find((r) => r.id === recipeCat) || null : null),
    [recipeCat]
  );
  const recipeExtra = useMemo(() => {
    const q = String(recipeSearch || "").toLowerCase().trim();
    const already = new Set((recipe?.finals || []).map((f) => f.toLowerCase()));
    return ALL_FINALS.filter(
      (f) => !already.has(f.toLowerCase()) && (!q || f.toLowerCase().includes(q))
    ).slice(0, 40);
  }, [recipe, recipeSearch]);

  /* ===== تنسيقات عامة ===== */
  const gridStyle = useMemo(() => ({
    width: "100%",
    borderCollapse: "collapse",
    tableLayout: "fixed",
    fontSize: 12,
  }), []);

  const thCell = {
    border: "1px solid #1f3b70",
    padding: "6px 4px",
    textAlign: "center",
    whiteSpace: "pre-line",
    fontWeight: 700,
    background: "#f5f8ff",
    color: "#0b1f4d",
  };
  const tdCell = {
    border: "1px solid #1f3b70",
    padding: "6px 4px",
    textAlign: "center",
    verticalAlign: "top",
  };
  const inputStyle = {
    width: "100%",
    boxSizing: "border-box",
    border: "1px solid #c7d2fe",
    borderRadius: 6,
    padding: "4px 6px",
    display: "block",
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
    minWidth: 0,
  };
  // خانات مقفولة تُعبَّأ بالربط فقط (اسم المادة الخام + تاريخ الإنتاج/الانتهاء الأصلي)
  const lockedStyle = {
    ...inputStyle,
    background: "#f1f5f9",
    borderColor: "#cbd5e1",
    color: "#334155",
    cursor: "not-allowed",
  };

  /* ===== ترويسة AL MAWASHI ===== */
  const topTable = {
    width: "100%",
    borderCollapse: "collapse",
    marginBottom: 10,
    fontSize: "0.9rem",
    border: "1px solid #9aa4ae",
    background: "#f8fbff",
  };
  const tdHeader = { border: "1px solid #9aa4ae", padding: "6px 8px", verticalAlign: "middle" };
  const bandTitle = {
    textAlign: "center",
    background: "#dde3e9",
    fontWeight: 700,
    padding: "6px 4px",
    border: "1px solid #9aa4ae",
    borderTop: "none",
    marginBottom: 10,
  };

  /* ===== colgroup ===== */
  const colDefs = useMemo(() => {
    const arr = [
      <col key="actions" style={{ width: 180 }} />,
      <col key="batchId" style={{ width: 260 }} />,
      <col key="inputs" style={{ width: 520 }} />,
      <col key="outputs" style={{ width: 520 }} />,
    ];
    return arr;
  }, []);

  /* ===== عمليات على مستوى الدفعات ===== */
  const addBatch    = () => setBatches((prev) => [...prev, emptyBatch()]);
  const deleteBatch = (bi) => setBatches((prev) => prev.filter((_, i) => i !== bi));
  const duplicateBatch = (bi) => setBatches((prev) => {
    const copy = JSON.parse(JSON.stringify(prev[bi]));
    copy.batchId = genBatchId();
    return [...prev.slice(0, bi+1), copy, ...prev.slice(bi+1)];
  });
  const updateBatchField = (bi, key, val) => {
    setBatches((prev) => {
      const next = [...prev];
      next[bi] = { ...next[bi], [key]: val };
      return next;
    });
  };

  /* ===== عمليات Inputs داخل الدفعة ===== */
  const addInput = (bi) => setBatches((prev) => {
    const next = [...prev];
    next[bi] = { ...next[bi], inputs: [...next[bi].inputs, newInput()] };
    return next;
  });
  const deleteInput = (bi, ii) => setBatches((prev) => {
    const next = [...prev];
    const arr = [...next[bi].inputs];
    arr.splice(ii, 1);
    next[bi] = { ...next[bi], inputs: arr.length ? arr : [newInput()] };
    return next;
  });
  const updateInputField = (bi, ii, key, val) => {
    setBatches((prev) => {
      const next = [...prev];
      const arr = [...next[bi].inputs];
      const row = { ...arr[ii], [key]: val };
      // تغيير تاريخ الفتح يعيد حساب الأفضل-قبل تلقائياً (+ يومين)
      if (key === "openedDate") {
        row.bestBefore = isYMD(val) ? addDays(val, SHELF_LIFE_DAYS) : "";
      }
      arr[ii] = row;
      next[bi] = { ...next[bi], inputs: arr };
      return next;
    });
  };

  /* ===== عمليات Outputs داخل الدفعة ===== */
  const addOutput = (bi) => setBatches((prev) => {
    const next = [...prev];
    next[bi] = { ...next[bi], outputs: [...next[bi].outputs, emptyOutput()] };
    return next;
  });
  const deleteOutput = (bi, oi) => setBatches((prev) => {
    const next = [...prev];
    const arr = [...next[bi].outputs];
    arr.splice(oi, 1);
    next[bi] = { ...next[bi], outputs: arr.length ? arr : [emptyOutput()] };
    return next;
  });
  const updateOutputField = (bi, oi, key, val) => {
    setBatches((prev) => {
      const next = [...prev];
      const arr = [...next[bi].outputs];
      arr[oi] = { ...arr[oi], [key]: val };
      next[bi] = { ...next[bi], outputs: arr };
      return next;
    });
  };

  /* ===== حفظ ===== */
  async function handleSave() {
    if (!date) { alert("الرجاء تحديد التاريخ."); return; }

    if (hasExistingForDate) {
      alert(
        "⚠️ يوجد تقرير محفوظ لنفس التاريخ لهذا الفرع.\n" +
        "A report is already saved for this date for this branch.\n" +
        "لا يمكن حفظ تقرير جديد لنفس اليوم. غيّر التاريخ أو راجع التقرير من شاشة التقارير."
      );
      return;
    }

    const hasAnyData = batches.some(b =>
      (b.inputs ?? []).some(inputHasData) ||
      (b.outputs ?? []).some(out => Object.values(out).some(v => String(v||"").trim() !== ""))
    );
    if (!hasAnyData) {
      alert("الرجاء تعبئة دفعة واحدة على الأقل بمادة أولية أو منتج نهائي قبل الحفظ.");
      return;
    }

    if (!checkedBy.trim()) { alert("حقل Checked by إلزامي."); return; }
    if (!verifiedBy.trim()) { alert("حقل Verified by إلزامي."); return; }

    setSaving(true);

    const entries = [];
    for (const b of batches) {
      const batchId = (b.batchId || "").trim();

      const inputs  = (b.inputs  ?? []).map(x => ({
        rawName: (x.rawName || "").trim(),
        origProdDate: (x.origProdDate || "").trim(),
        origExpDate: (x.origExpDate || "").trim(),
        openedDate: (x.openedDate || "").trim(),
        bestBefore: (x.bestBefore || "").trim(),
        rawWeight: (x.rawWeight || "").toString().trim(),
      }));
      const outputs = (b.outputs ?? []).map(x => ({
        finalName: (x.finalName || "").trim(),
        finalProdDate: (x.finalProdDate || "").trim(),
        finalExpDate: (x.finalExpDate || "").trim(),
        finalWeight: (x.finalWeight || "").toString().trim(),
      }));

      // التحقق من صحة التواريخ
      for (let i = 0; i < inputs.length; i++) {
        const inp = inputs[i];
        if (inp.origProdDate && inp.origExpDate && inp.origExpDate <= inp.origProdDate) {
          setSaving(false);
          alert(`⚠️ الدفعة "${batchId}" - المادة الخام ${i + 1}: تاريخ الصلاحية يجب أن يكون أكبر من تاريخ الإنتاج.`);
          return;
        }
      }
      for (let i = 0; i < outputs.length; i++) {
        const out = outputs[i];
        if (out.finalProdDate && out.finalExpDate && out.finalExpDate <= out.finalProdDate) {
          setSaving(false);
          alert(`⚠️ الدفعة "${batchId}" - المنتج النهائي ${i + 1}: تاريخ الصلاحية يجب أن يكون أكبر من تاريخ الإنتاج.`);
          return;
        }
      }

      // اعتبار الصف "مدخلاً" فقط عند وجود بيانات جوهرية (تجاهل التواريخ التلقائية)
      const sigInputs  = inputs.filter(inputHasData);
      const hasInputs  = sigInputs.length > 0;
      const hasOutputs = outputs.some(out => Object.values(out).some(v => v !== ""));

      if (hasInputs && hasOutputs) {
        for (const inp of sigInputs) {
          for (const out of outputs) {
            entries.push({ batchId, ...inp, ...out });
          }
        }
      } else if (hasInputs) {
        for (const inp of sigInputs) {
          entries.push({
            batchId, ...inp,
            finalName: "", finalProdDate: "", finalExpDate: "", finalWeight: ""
          });
        }
      } else if (hasOutputs) {
        for (const out of outputs) {
          entries.push({
            batchId,
            rawName: "", origProdDate: "", origExpDate: "", openedDate: "", bestBefore: "", rawWeight: "",
            ...out
          });
        }
      }
    }

    // ملاحظة: openedDate/bestBefore مستبعدة من مفاتيح "وجود بيانات" لأنها تُعبَّأ تلقائياً؛
    // الصف يُحفظ فقط إن حوى اسماً/تاريخاً جوهرياً (خام أو نهائي).
    const rowKeys = ["rawName","origProdDate","origExpDate","finalName","finalProdDate","finalExpDate"];
    const cleaned = entries.filter(r => rowKeys.some(k => (r[k] ?? "").toString().trim() !== ""));

    const payload = {
      branch: BRANCH,
      section: section.trim(),
      reportDate: date,
      entries: cleaned,
      checkedBy: checkedBy.trim(),
      verifiedBy: verifiedBy.trim(),
      savedAt: Date.now(),
      uiMode: "single-row-batch",
    };

    try {
      const res = await fetch(`${API_BASE}/api/reports`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reporter: "pos11", type: TYPE, payload }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      alert("✅ تم الحفظ بنجاح");
    } catch (e) {
      console.error(e);
      alert("❌ فشل الحفظ. تحقق من السيرفر أو الشبكة.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div style={{ background:"#fff", border:"1px solid #dbe3f4", borderRadius:12, padding:16, color:"#0b1f4d" }}>
      {/* === ترويسة AL MAWASHI (بدون تاريخ) === */}
      <table style={topTable}>
        <tbody>
          <tr>
            <td rowSpan={3} style={{ ...tdHeader, width:120, textAlign:"center" }}>
              <div style={{ fontWeight: 900, color: "#a00", lineHeight: 1.1 }}>
                AL<br/>MAWASHI
              </div>
            </td>
            <td style={tdHeader}><b>Document Title:</b> Traceability Log</td>
            <td style={tdHeader}><b>Document No:</b> FS-QM/REC/TL</td>
          </tr>
          <tr>
            <td style={tdHeader}><b>Issue Date:</b> 05/02/2020</td>
            <td style={tdHeader}><b>Revision No:</b> 0</td>
          </tr>
          <tr>
            <td style={tdHeader} colSpan={2}><b>Area:</b> {BRANCH}</td>
          </tr>
        </tbody>
      </table>
      <div style={bandTitle}>TRACEABILITY LOG — {BRANCH}</div>

      {/* Header (Section + Date) */}
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:12, gap:12 }}>
        <div style={{ fontWeight:800, fontSize:18 }}>Traceability Log – {BRANCH}</div>
        <div style={{ display:"grid", gridTemplateColumns:"auto 180px", gap:6, alignItems:"center", fontSize:12 }}>
          <div>Section :</div>
          <input value={section} onChange={(e)=>setSection(e.target.value)} style={{ ...inputStyle, borderColor:"#1f3b70" }} />
          <div>Date :</div>
          <input type="date" value={date} onChange={(e)=>setDate(e.target.value)} style={{ ...inputStyle, borderColor:"#1f3b70" }} />
        </div>
      </div>

      {hasExistingForDate && (
        <div style={{ marginBottom: 12, fontSize: 12, color: "#b91c1c", fontWeight: 700 }}>
          ⚠️ يوجد تقرير محفوظ لنفس التاريخ لهذا الفرع. لا يمكن حفظ تقرير جديد لنفس اليوم.
        </div>
      )}

      {/* Table */}
      <div style={{ overflowX:"auto" }}>
        <table style={gridStyle}>
          <colgroup>{colDefs}</colgroup>
          <thead>
            <tr>
              <th style={thCell}>Actions</th>
              <th style={thCell}>Batch / Lot ID</th>
              <th style={thCell}>Inputs (Raw Materials)</th>
              <th style={thCell}>Outputs (Final Products)</th>
            </tr>
          </thead>
          <tbody>
            {batches.map((b, bi) => (
              <tr key={bi}>
                {/* Actions */}
                <td style={{ ...tdCell, textAlign:"left" }}>
                  <div style={{ display:"grid", gap:6 }}>
                    <button
                      onClick={() => duplicateBatch(bi)}
                      style={{ ...miniBtn, background:"#eef2ff", borderColor:"#4f46e5", color:"#3730a3" }}
                      title="Duplicate batch (new Batch ID)"
                    >⎘ Duplicate batch</button>

                    <button
                      onClick={() => addInput(bi)}
                      style={{ ...miniBtn, background:"#f0fdf4", borderColor:"#16a34a", color:"#166534" }}
                      title="Add raw material row to this batch"
                    >+ Add RAW</button>

                    <button
                      onClick={() => addOutput(bi)}
                      style={{ ...miniBtn, background:"#ecfeff", borderColor:"#06b6d4", color:"#0e7490" }}
                      title="Add final product row to this batch"
                    >+ Add FINAL</button>

                    <button
                      onClick={() => deleteBatch(bi)}
                      style={{ ...miniBtn, background:"#fef2f2", borderColor:"#ef4444", color:"#b91c1c" }}
                      title="Delete batch"
>× Delete batch</button>
                  </div>
                </td>

                {/* Batch ID + RAW Modal trigger (بنفس العمود) */}
                <td style={{ ...tdCell, textAlign:"left" }}>
                  <div style={{ display:"grid", gap:6 }}>
                    <input
                      type="text"
                      placeholder="e.g., B-20251023-001 or AWB/Invoice"
                      value={b.batchId}
                      onChange={(e) => updateBatchField(bi, "batchId", e.target.value)}
                      style={inputStyle}
                    />
                    <button
                      onClick={() => openRawModal(bi)}
                      style={{ ...miniBtn, background:"#e2e8f0", borderColor:"#475569", color:"#0f172a" }}
                      title="Link from RAW: auto-fill raw material name + production/expiry dates"
                    >Link from RAW</button>
                  </div>
                </td>

                {/* Inputs */}
                <td style={{ ...tdCell, textAlign:"left" }}>
                  <div style={{ display:"grid", gap:8 }}>
                    {b.inputs.map((inp, ii) => (
                      <div key={ii} style={{ border:"1px dashed #c7d2fe", borderRadius:8, padding:8 }}>
                        <div style={{ display:"grid", gridTemplateColumns:"160px 1fr", gap:6, alignItems:"center", marginBottom:6 }}>
                          <label>Name <span style={{ color:"#94a3b8" }}>🔒</span></label>
                          <input
                            placeholder="يُعبّأ من الربط فقط / Fill via Link from RAW"
                            value={inp.rawName}
                            readOnly
                            title="يُعبّأ تلقائياً عند الربط من الشحنة"
                            style={lockedStyle}
                          />
                        </div>
                        <div style={{ display:"grid", gridTemplateColumns:"160px 1fr", gap:6, alignItems:"center" }}>
                          <label>Original Production Date <span style={{ color:"#94a3b8" }}>🔒</span></label>
                          <input type="date" value={inp.origProdDate} readOnly disabled title="يُعبّأ تلقائياً عند الربط" style={lockedStyle} />
                          <label>Original Expiry Date <span style={{ color:"#94a3b8" }}>🔒</span></label>
                          <input type="date" value={inp.origExpDate}  readOnly disabled title="يُعبّأ تلقائياً عند الربط" style={lockedStyle} />
                          <label>Opened Date</label>
                          <input type="date" value={inp.openedDate}    onChange={(e)=>updateInputField(bi, ii, "openedDate",    e.target.value)} style={inputStyle} />
                          <label>Best Before Date</label>
                          <input type="date" value={inp.bestBefore}    onChange={(e)=>updateInputField(bi, ii, "bestBefore",    e.target.value)} style={inputStyle} />
                          <label>Weight (kg)</label>
                          <input
                            type="number" step="0.01" min="0"
                            value={inp.rawWeight}
                            onChange={(e)=>updateInputField(bi, ii, "rawWeight", e.target.value)}
                            style={inputStyle}
                            placeholder="e.g., 2.50"
                          />
                        </div>
                        <div style={{ marginTop:6, display:"flex", justifyContent:"space-between", gap:6 }}>
                          <button
                            onClick={()=>openRecipe(bi, inp.rawName)}
                            style={{ ...miniBtn, background:"#ecfeff", borderColor:"#06b6d4", color:"#0e7490" }}
                            title="اختر المنتجات النهائية التي تُنتَج من هذه المادة الخام"
                          >➜ Final products / المنتجات النهائية</button>
                          <button
                            onClick={()=>deleteInput(bi, ii)}
                            style={{ ...miniBtn, background:"#fff7ed", borderColor:"#f97316", color:"#9a3412" }}
                            title="Remove this raw line"
>– Remove RAW</button>
                        </div>
                      </div>
                    ))}
                  </div>
                </td>

                {/* Outputs */}
                <td style={{ ...tdCell, textAlign:"left" }}>
                  <div style={{ display:"grid", gap:8 }}>
                    {b.outputs.map((out, oi) => (
                      <div key={oi} style={{ border:"1px dashed #bae6fd", borderRadius:8, padding:8 }}>
                        <div style={{ display:"grid", gridTemplateColumns:"160px 1fr", gap:6, alignItems:"center", marginBottom:6 }}>
                          <label>Final Product Name</label>
                          <input
                            placeholder="Final product name"
                            value={out.finalName}
                            onChange={(e)=>updateOutputField(bi, oi, "finalName", e.target.value)}
                            style={inputStyle}
                          />
                        </div>
                        <div style={{ display:"grid", gridTemplateColumns:"160px 1fr", gap:6, alignItems:"center" }}>
                          <label>Production Date</label>
                          <input type="date" value={out.finalProdDate} onChange={(e)=>updateOutputField(bi, oi, "finalProdDate", e.target.value)} style={inputStyle} />
                          <label>Expiry Date</label>
                          <input type="date" value={out.finalExpDate}  onChange={(e)=>updateOutputField(bi, oi, "finalExpDate",  e.target.value)} style={inputStyle} />
                          <label>Weight (kg)</label>
                          <input
                            type="number" step="0.01" min="0"
                            value={out.finalWeight}
                            onChange={(e)=>updateOutputField(bi, oi, "finalWeight", e.target.value)}
                            style={inputStyle}
                            placeholder="e.g., 1.20"
                          />
                        </div>
                        <div style={{ marginTop:6, textAlign:"right" }}>
                          <button
                            onClick={()=>deleteOutput(bi, oi)}
                            style={{ ...miniBtn, background:"#fff1f2", borderColor:"#fb7185", color:"#9f1239" }}
                            title="Remove this final line"
>– Remove FINAL</button>
                        </div>
                      </div>
                    ))}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Controls */}
      <div style={{ display:"flex", gap:8, marginTop:12, flexWrap:"wrap" }}>
        <button onClick={addBatch} style={btnStyle("#10b981")}>+ Add Batch (one-row)</button>
        <button
          onClick={handleSave}
          disabled={saving || hasExistingForDate || checkingExisting}
          style={btnStyle("#2563eb")}
        >
          {hasExistingForDate ? "Report exists for this date" : saving ? "Saving…" : "Save Log"}
        </button>
      </div>

      {/* Footer */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginTop: 16,
          gap: 12,
          width: "100%",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 260 }}>
          <span style={{ fontSize: 12 }}>Checked by:</span>
          <input
            value={checkedBy}
            onChange={(e) => setCheckedBy(e.target.value)}
            style={inputStyle}
            placeholder="Operator / Preparer"
          />
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 260 }}>
          <span style={{ fontSize: 12 }}>Verified by:</span>
          <input
            value={verifiedBy}
            onChange={(e) => setVerifiedBy(e.target.value)}
            style={inputStyle}
            placeholder="Supervisor / QA"
          />
        </div>
      </div>

      <div
        style={{
          marginTop: 12,
          paddingTop: 8,
          borderTop: "2px solid #1f3b70",
          fontSize: 12,
          color: "#0b1f4d",
          lineHeight: 1.6,
        }}
      >
        <strong style={{ color: "#0b1f4d" }}>Note:</strong>
        <span style={{ marginInlineStart: 4 }}>
          This form uses a single row per <b>Batch / Lot</b>, with dynamic inputs (raw materials) and outputs (final products).
          Data is flattened to the legacy <b>entries</b> format on save for backend compatibility.
        </span>
      </div>

      {/* ===== RAW Modal ===== */}
      {showRawModal && (
        <>
          <div
            onClick={closeRawModal}
            style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.35)", zIndex: 50 }}
          />
          <div
            role="dialog"
            aria-modal="true"
            style={{
              position: "fixed",
              top: "50%", left: "50%",
              transform: "translate(-50%, -50%)",
              width: "min(900px, 95vw)",
              maxHeight: "80vh",
              background: "#fff",
              borderRadius: 12,
              border: "1px solid #cbd5e1",
              boxShadow: "0 20px 60px rgba(0,0,0,0.25)",
              zIndex: 51,
              display: "flex",
              flexDirection: "column"
            }}
          >
            <div style={{ padding: "12px 16px", borderBottom: "1px solid #e2e8f0", display:"flex", alignItems:"center", justifyContent:"space-between", gap: 8 }}>
              <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                {pickShipment && (
                  <button
                    onClick={() => setPickShipment(null)}
                    style={{ ...miniBtn, background:"#e2e8f0", borderColor:"#475569", color:"#0f172a" }}
                    title="Back to shipments"
                  >← Back</button>
                )}
                <div style={{ fontWeight: 800, fontSize: 16 }}>
                  {pickShipment ? "Select product / اختر المنتج" : "Link from RAW"}
                </div>
              </div>
              <button onClick={closeRawModal} style={{ ...miniBtn, background:"#e2e8f0", borderColor:"#475569", color:"#0f172a" }}>Close</button>
            </div>

            {!pickShipment && (
              <div style={{ padding: 12, borderBottom: "1px solid #e2e8f0" }}>
                <input
                  placeholder="Search AWB / Invoice / Shipment / Slaughter Date / Expiry Date"
                  value={rawQ}
                  onChange={(e)=>setRawQ(e.target.value)}
                  style={{ width:"100%", border:"1px solid #94a3b8", borderRadius:8, padding:"8px 10px" }}
                />
              </div>
            )}

            {/* ==== الخطوة 2: منتجات الشحنة المختارة ==== */}
            {pickShipment ? (
              <div style={{ padding: 12, overflow: "auto" }}>
                <div style={{ fontSize: 12, color: "#475569", marginBottom: 8 }}>
                  <b>Shipment:</b> {pickShipment.shipment || "-"}
                  {"  ·  "}
                  <b>AWB:</b> {pickShipment.awb || "-"}
                  {(!pickShipment.awb || pickShipment.awb.trim().toUpperCase() === "NIL") && (
                    <> {"  ·  "}<b>Invoice:</b> {pickShipment.invoice || "-"}</>
                  )}
                </div>
                <div style={{ display:"grid", gap:8 }}>
                  {(pickShipment.products || []).map((prod, pi) => (
                    <div
                      key={pi}
                      onClick={() => chooseProduct(pickShipment, prod)}
                      style={{
                        display:"grid", gridTemplateColumns:"1fr auto", gap:8, alignItems:"center",
                        padding:"10px 12px", border:"1px solid #86efac", borderRadius:8,
                        background:"#f0fdf4", cursor:"pointer"
                      }}
                      title="Click to fill raw material (name + dates)"
                    >
                      <div style={{ fontSize:13, fontWeight:700, color:"#166534" }}>
                        {prod.name || "(no name)"}
                      </div>
                      <div style={{ fontSize:12, textAlign:"right", color:"#334155" }}>
                        <div><b>Prod:</b> {prod.prodDate || "-"}</div>
                        <div><b>Exp:</b> {prod.expDate || "-"}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
            <div style={{ padding: 12, overflow: "auto" }}>
              {filteredRaw.length === 0 ? (
                <div style={{ fontSize: 12, color: "#64748b" }}>No matches.</div>
              ) : (
                <div style={{ display:"grid", gap:8 }}>
                  {filteredRaw.map((r, idx) => {
                    const awbIsNil = !r.awb || r.awb.trim().toUpperCase() === "NIL";
                    const nProducts = Array.isArray(r.products) ? r.products.length : 0;
                    return (
                      <div
                        key={r.id || idx}
                        onClick={() => pickRawShipment(r)}
                        style={{
                          display:"grid",
                          gridTemplateColumns:"1fr auto",
                          gap:8,
                          alignItems:"center",
                          padding:"8px 10px",
                          border:"1px solid #cbd5e1",
                          borderRadius:8,
                          background:"#ffffff",
                          cursor:"pointer"
                        }}
                        title={nProducts > 1 ? "Click to choose a product from this shipment" : "Click to fill from this shipment"}
                      >
                        <div style={{ fontSize:12 }}>
                          <div><b>AWB:</b> {r.awb || "-"}</div>
                          {awbIsNil && <div><b>Invoice:</b> {r.invoice || "-"}</div>}
                          <div><b>Shipment:</b> {r.shipment || "-"}</div>
                          {nProducts > 0 && (
                            <div style={{ marginTop:4 }}>
                              <span style={{ display:"inline-block", background:"#eef2ff", color:"#3730a3", borderRadius:12, padding:"1px 8px", fontSize:11, fontWeight:700 }}>
                                {nProducts} product{nProducts > 1 ? "s" : ""} / منتج
                              </span>
                            </div>
                          )}
                        </div>
                        <div style={{ fontSize:12, textAlign:"right" }}>
                          <div><b>Slaughter Date:</b> {r.slaughterDate || "-"}</div>
                          <div><b>Expiry Date:</b> {r.expiryDate || "-"}</div>
                          {nProducts > 1 && (
                            <div style={{ marginTop:4, color:"#4f46e5", fontWeight:700 }}>Choose product →</div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
            )}
          </div>
        </>
      )}

      {/* ===== نافذة المنتجات النهائية المقترحة من المادة الخام ===== */}
      {recipeBI !== null && (
        <>
          <div
            onClick={closeRecipe}
            style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.35)", zIndex: 60 }}
          />
          <div
            role="dialog"
            aria-modal="true"
            style={{
              position: "fixed", top: "50%", left: "50%",
              transform: "translate(-50%, -50%)",
              width: "min(680px, 95vw)", maxHeight: "85vh",
              background: "#fff", borderRadius: 12, border: "1px solid #cbd5e1",
              boxShadow: "0 20px 60px rgba(0,0,0,0.25)", zIndex: 61,
              display: "flex", flexDirection: "column",
            }}
          >
            <div style={{ padding: "12px 16px", borderBottom: "1px solid #e2e8f0", display:"flex", alignItems:"center", justifyContent:"space-between", gap:8 }}>
              <div>
                <div style={{ fontWeight: 800, fontSize: 16 }}>Final products / المنتجات النهائية</div>
                <div style={{ fontSize: 12, color: "#475569" }}>
                  From: <b>{recipeRaw || "—"}</b>
                  {recipe ? <> · <span style={{ color:"#0e7490" }}>{recipe.label}</span></> : null}
                </div>
              </div>
              <button onClick={closeRecipe} style={{ ...miniBtn, background:"#e2e8f0", borderColor:"#475569", color:"#0f172a" }}>Close</button>
            </div>

            <div style={{ padding: 12, overflow: "auto" }}>
              {/* اختيار الصنف يدوياً (مفيد عند خطأ إدخال اسم المادة الخام مثل "PAK LEG") */}
              <div style={{ fontSize: 12, fontWeight: 700, color:"#475569", marginBottom: 6 }}>
                Category / الصنف
              </div>
              <div style={{ display:"flex", flexWrap:"wrap", gap:6, marginBottom: 12 }}>
                {RAW_RECIPES.map((c) => {
                  const on = recipeCat === c.id;
                  return (
                    <button
                      key={c.id}
                      onClick={() => { setRecipeCat(c.id); setRecipeSel(new Set()); }}
                      style={{
                        ...miniBtn, padding:"5px 10px", fontSize:11,
                        background: on ? "#0e7490" : "#f1f5f9",
                        borderColor: on ? "#0e7490" : "#cbd5e1",
                        color: on ? "#fff" : "#334155",
                      }}
                      title={c.label}
                    >{c.label}</button>
                  );
                })}
              </div>

              {!recipe && (
                <div style={{ fontSize: 12, color: "#92400e", background:"#fffbeb", border:"1px solid #fde68a", borderRadius:8, padding:"8px 10px", marginBottom:10 }}>
                  لم يتم التعرّف على المادة الخام تلقائياً. اختر الصنف من الأعلى (مثلاً «عجل») لعرض منتجاته، أو استخدم البحث بالأسفل.
                </div>
              )}

              {recipe && (
                <>
                  <div style={{ fontSize: 12, fontWeight: 700, color:"#0e7490", marginBottom: 6 }}>
                    Suggested (most used first) / المقترحة (الأكثر استخداماً)
                  </div>
                  <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill, minmax(200px, 1fr))", gap:6, marginBottom: 12 }}>
                    {recipe.finals.map((f) => {
                      const on = recipeSel.has(f);
                      return (
                        <label
                          key={f}
                          style={{
                            display:"flex", alignItems:"center", gap:8, cursor:"pointer",
                            padding:"7px 9px", borderRadius:8,
                            border:`1px solid ${on ? "#06b6d4" : "#cbd5e1"}`,
                            background: on ? "#ecfeff" : "#fff",
                          }}
                        >
                          <input type="checkbox" checked={on} onChange={()=>toggleRecipeSel(f)} />
                          <span style={{ fontSize:12, fontWeight:600 }}>{f}</span>
                        </label>
                      );
                    })}
                  </div>
                </>
              )}

              <div style={{ fontSize: 12, fontWeight: 700, color:"#475569", marginBottom: 6 }}>
                Add other product / إضافة منتج آخر
              </div>
              <input
                placeholder="Search all products / ابحث في كل المنتجات"
                value={recipeSearch}
                onChange={(e)=>setRecipeSearch(e.target.value)}
                style={{ width:"100%", border:"1px solid #94a3b8", borderRadius:8, padding:"8px 10px", marginBottom: 8 }}
              />
              <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill, minmax(200px, 1fr))", gap:6 }}>
                {recipeExtra.map((f) => {
                  const on = recipeSel.has(f);
                  return (
                    <label
                      key={f}
                      style={{
                        display:"flex", alignItems:"center", gap:8, cursor:"pointer",
                        padding:"7px 9px", borderRadius:8,
                        border:`1px solid ${on ? "#06b6d4" : "#e2e8f0"}`,
                        background: on ? "#ecfeff" : "#f8fafc",
                      }}
                    >
                      <input type="checkbox" checked={on} onChange={()=>toggleRecipeSel(f)} />
                      <span style={{ fontSize:12 }}>{f}</span>
                    </label>
                  );
                })}
                {recipeExtra.length === 0 && (
                  <div style={{ fontSize:12, color:"#94a3b8" }}>No matches / لا نتائج</div>
                )}
              </div>
            </div>

            <div style={{ padding: 12, borderTop: "1px solid #e2e8f0", display:"flex", justifyContent:"flex-end", gap:8 }}>
              <button onClick={closeRecipe} style={{ ...miniBtn, background:"#f1f5f9", borderColor:"#94a3b8", color:"#334155", padding:"8px 12px" }}>Cancel / إلغاء</button>
              <button
                onClick={confirmRecipe}
                disabled={recipeSel.size === 0}
                style={{ ...btnStyle("#06b6d4"), opacity: recipeSel.size === 0 ? 0.5 : 1 }}
              >
                Add {recipeSel.size > 0 ? `(${recipeSel.size})` : ""} / إضافة
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function btnStyle(bg) {
  return {
    background: bg,
    color: "#fff",
    border: "none",
    borderRadius: 10,
    padding: "10px 14px",
    fontWeight: 700,
    cursor: "pointer",
    boxShadow: "0 4px 12px rgba(0,0,0,.15)",
  };
}
