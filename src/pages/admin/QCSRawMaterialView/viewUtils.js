// viewUtils.js
/* ========= Env / API roots ========= */
const API_ROOT_DEFAULT = "https://inspection-server-4nvj.onrender.com";

const fromWindow =
  typeof window !== "undefined" ? window.__QCS_API__ : undefined;

const fromProcess =
  typeof process !== "undefined"
    ? (process.env?.REACT_APP_API_URL || process.env?.VITE_API_URL)
    : undefined;

// Webpack-safe: لا نستخدم typeof import.meta — نصل لخاصية داخل try/catch
let fromVite;
try {
  // إذا البندلر ليس Vite، هذا سيُرمى أو يُصبح undefined بدون تحذير
  fromVite = import.meta.env && import.meta.env.VITE_API_URL;
} catch {
  fromVite = undefined;
}

const API_ROOT = fromWindow || fromProcess || fromVite || API_ROOT_DEFAULT;

export const API_BASE = String(API_ROOT).replace(/\/$/, "");

export const IS_SAME_ORIGIN = (() => {
  try { return new URL(API_BASE).origin === window.location.origin; }
  catch { return false; }
})();

/* ========= Constants ========= */
export const ATTRIBUTES = [
  { key: "temperature", label: "Product Temperature" },
  { key: "ph", label: "Product PH" },
  { key: "slaughterDate", label: "Slaughter Date" },
  { key: "expiryDate", label: "Expiry Date" },
  { key: "broken", label: "Broken / Cut Pieces" },
  { key: "appearance", label: "Appearance" },
  { key: "bloodClots", label: "Blood Clots" },
  { key: "colour", label: "Colour" },
  { key: "fatDiscoloration", label: "Fat Discoloration" },
  { key: "meatDamage", label: "Meat Damage" },
  { key: "foreignMatter", label: "Hair / Foreign Matter" },
  { key: "texture", label: "Texture" },
  { key: "testicles", label: "Testicles" },
  { key: "smell", label: "Smell" },
];

export const defaultDocMeta = {
  documentTitle: "Raw Material Inspection Report - Chilled Lamb",
  documentNo: "FS-QM/REC/RMB",
  issueDate: "2020-02-10",
  revisionNo: "0",
  area: "QA",
};

export const keyLabels = {
  reportOn: "Report On",
  receivedOn: "Sample Received On",
  inspectionDate: "Inspection Date",
  temperature: "Temperature",
  brand: "Brand",
  invoiceNo: "Invoice No",
  supplierName: "Supplier Name",
  ph: "PH",
  origin: "Origin",
  airwayBill: "Air Way Bill No",
  localLogger: "Local Logger",
  internationalLogger: "International Logger",
};

export const GENERAL_FIELDS_ORDER = [
  "reportOn","receivedOn","inspectionDate","temperature","brand",
  "invoiceNo","supplierName","ph","origin","airwayBill",
  "localLogger","internationalLogger",
];

export const monthNames = [
  "01 - January","02 - February","03 - March","04 - April","05 - May","06 - June",
  "07 - July","08 - August","09 - September","10 - October","11 - November","12 - December",
];

/* ========= Helpers ========= */
export const ymdInTZ = (d, tz="Asia/Riyadh") =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone: tz, year:"numeric", month:"2-digit", day:"2-digit"
  }).format(new Date(d || Date.now()));

const _normalize = (s) => String(s ?? "").trim();
const _sentinel = (s) => {
  const v = _normalize(s).toUpperCase();
  return !v || ["NIL","NA","N/A","NONE","NULL","-","—","0"].includes(v);
};

export const getDisplayId = (r) => {
  const awb = r?.generalInfo?.airwayBill;
  const inv = r?.generalInfo?.invoiceNo;
  if (!_sentinel(awb)) return _normalize(awb);
  if (!_sentinel(inv)) return _normalize(inv);
  return "No AWB / Invoice";
};

export const getCreatedDate = (r) =>
  (r?.createdDate && String(r.createdDate)) ||
  String((r?.createdAt || r?.date || "")).slice(0, 10);

export function groupByYMD(list) {
  const map = {};
  list.forEach((r) => {
    const d = getCreatedDate(r) || "0000-00-00";
    const [y, m, day] = d.split("-");
    map[y] ??= {}; map[y][m] ??= {}; map[y][m][day] ??= [];
    map[y][m][day].push(r);
  });
  return map;
}

/* ========= Local storage ========= */
const LS_KEY_REPORTS = "qcs_raw_material_reports";

export const loadFromLocal = () => {
  try { return JSON.parse(localStorage.getItem(LS_KEY_REPORTS) || "[]"); }
  catch { return []; }
};

export const saveToLocal = (list) => {
  try { localStorage.setItem(LS_KEY_REPORTS, JSON.stringify(list)); }
  catch {}
};

export const mergeUniqueById = (serverArr, localArr) => {
  const map = new Map();
  localArr.forEach((r) => map.set(r.id, r));
  serverArr.forEach((r) => {
    const prev = map.get(r.id) || {};
    map.set(r.id, { ...prev, ...r });
  });
  return Array.from(map.values());
};

/* ========= Reporter ========= */
export function getReporter() {
  try {
    const raw = localStorage.getItem("currentUser");
    const user = raw ? JSON.parse(raw) : null;
    return user?.username || "anonymous";
  } catch { return "anonymous"; }
}

/* ========= Server normalize ========= */
const normalizeImages = (imgs) =>
  Array.isArray(imgs)
    ? imgs
        // ندعم: string (رابط)، كائن {url}، كائن {data} (Base64 قديم)
        .map((x) => (typeof x === "string" ? x : (x?.url || x?.data || "")))
        .filter(Boolean)
    : [];

export const normalizeServerRecord = (rec) => {
  const p = rec?.payload || rec || {};
  const payloadId = p.id || p.payloadId || undefined;
  const dbId = rec?._id || rec?.id || undefined;

  const createdAt = p.createdAt || rec?.createdAt || p.date || "";
  const createdDate = p.createdDate || ymdInTZ(createdAt); // محلي

  return {
    id: payloadId || dbId || `${Date.now()}-${Math.random().toString(16).slice(2, 8)}`,
    serverId: dbId,

    shipmentType: p.shipmentType || "",
    status: p.status || "",
    generalInfo: p.generalInfo || {},
    date: p.date || rec?.createdAt || "",

    samples: Array.isArray(p.samples) ? p.samples : [],
    productLines: Array.isArray(p.productLines) ? p.productLines : [],

    inspectedBy: p.inspectedBy || "",
    verifiedBy: p.verifiedBy || "",

    totalQuantity: p.totalQuantity || "",
    totalWeight: p.totalWeight || "",
    averageWeight: p.averageWeight || "",

    // الشهادة: دعم الرابط الجديد مع الإبقاء على Base64 القديم
    certificateFile: p.certificateFile || "",   // legacy Base64
    certificateUrl: p.certificateUrl || "",     // ✅ جديد (رابط)
    certificateName: p.certificateName || "",

    // الصور: نحولها دائماً إلى مصفوفة روابط
    images: normalizeImages(p.images),

    docMeta: p.docMeta || {},
    notes: p.notes || "",

    createdAt,
    createdDate,
    uniqueKey: p.uniqueKey || undefined,
    sequence: p.sequence || undefined,
    updatedAt: rec?.updatedAt || undefined,
  };
};

/* ========= Server I/O ========= */
export async function fetchFromServer(signal) {
  const res = await fetch(`${API_BASE}/api/reports?type=qcs_raw_material`, {
    cache: "no-store",
    mode: "cors",
    credentials: IS_SAME_ORIGIN ? "include" : "omit",
    headers: { Accept: "application/json" },
    signal,
  });
  if (!res.ok) throw new Error(`Server ${res.status}`);
  const json = await res.json();
  const arr = Array.isArray(json) ? json : json?.data || [];
  return arr.map(normalizeServerRecord);
}

export async function upsertReportOnServer(record) {
  const reporter = getReporter();
  const headers = { "Content-Type": "application/json", Accept: "application/json" };
  const body = JSON.stringify({
    reporter,
    type: "qcs_raw_material",
    payload: { ...record, id: record.id },
  });

  if (record.serverId) {
    const urls = [
      `${API_BASE}/api/reports/${encodeURIComponent(record.serverId)}`,
      `${API_BASE}/api/reports/${encodeURIComponent(record.serverId)}?type=qcs_raw_material`,
      `${API_BASE}/api/reports/qcs_raw_material/${encodeURIComponent(record.serverId)}`,
    ];
    for (const u of urls) {
      try {
        const r = await fetch(u, { method: "PUT", headers, credentials: IS_SAME_ORIGIN ? "include" : "omit", body });
        if (r.ok) return true;
      } catch {}
    }
  }
  try {
    const r = await fetch(`${API_BASE}/api/reports`, {
      method: "POST", headers, credentials: IS_SAME_ORIGIN ? "include" : "omit", body,
    });
    return r.ok;
  } catch { return false; }
}

export async function deleteOnServer(record) {
  const base = `${API_BASE}/api/reports`;
  const apiDelete = async (url) => {
    try {
      const res = await fetch(url, { method: "DELETE", mode: "cors", credentials: IS_SAME_ORIGIN ? "include" : "omit" });
      if (res.ok || res.status === 404) return true;
    } catch {}
    return false;
  };

  if (record.serverId) {
    const urls = [
      `${base}/${encodeURIComponent(record.serverId)}`,
      `${base}/${encodeURIComponent(record.serverId)}?type=qcs_raw_material`,
      `${base}/qcs_raw_material/${encodeURIComponent(record.serverId)}`,
    ];
    for (const u of urls) if (await apiDelete(u)) return true;
  }

  try {
    const res = await fetch(`${base}?type=qcs_raw_material`, {
      cache: "no-store", mode: "cors", credentials: IS_SAME_ORIGIN ? "include" : "omit",
    });
    if (res.ok) {
      const json = await res.json();
      const arr = Array.isArray(json) ? json : json?.data || [];
      const norm = (s) => String(s || "").trim().toLowerCase();
      const target = arr.find((rec) => {
        const p = rec?.payload || {};
        return (
          (p.id && p.id === record.id) ||
          norm(p.generalInfo?.airwayBill) === norm(record.generalInfo?.airwayBill) ||
          norm(p.generalInfo?.invoiceNo) === norm(record.generalInfo?.invoiceNo)
        );
      });
      const dbId = target?._id || target?.id;
      if (dbId) {
        const urls2 = [
          `${base}/${encodeURIComponent(dbId)}`,
          `${base}/${encodeURIComponent(dbId)}?type=qcs_raw_material`,
          `${base}/qcs_raw_material/${encodeURIComponent(dbId)}`,
        ];
        for (const u of urls2) if (await apiDelete(u)) return true;
      }
    }
  } catch {}
  return false;
}

/* ========= Images API (upload/delete) ========= */
// نفس عقد MeatDailyView — رفع صورة وإرجاع الرابط (المضغوط إن وُجد)
export async function uploadImageViaServer(file, purpose = "qcs_raw_material") {
  const fd = new FormData();
  fd.append("file", file);
  fd.append("purpose", purpose);
  fd.append("compress", "true");
  fd.append("maxDim", "1280");
  fd.append("quality", "80");

  const res = await fetch(`${API_BASE}/api/images`, { method: "POST", body: fd });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data?.ok || !(data.optimized_url || data.url)) {
    throw new Error(data?.error || "Upload failed");
  }
  return data.optimized_url || data.url;
}

// حذف صورة واحدة من التخزين الخارجي (Cloudinary أو ما شابه)
export async function deleteImageUrl(url) {
  if (!url) return;
  const res = await fetch(`${API_BASE}/api/images?url=${encodeURIComponent(url)}`, {
    method: "DELETE",
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data?.ok) {
    throw new Error(data?.error || "Delete image failed");
  }
}

// مساعد لحذف مجموعة روابط (اختياري)
export async function deleteImagesMany(urls = []) {
  const unique = [...new Set(urls.filter(Boolean))];
  if (!unique.length) return { ok: true, deleted: 0, failed: 0 };
  const results = await Promise.allSettled(unique.map((u) => deleteImageUrl(u)));
  const deleted = results.filter((r) => r.status === "fulfilled").length;
  const failed = results.length - deleted;
  return { ok: failed === 0, deleted, failed };
}
