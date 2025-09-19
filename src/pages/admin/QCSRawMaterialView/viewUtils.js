// viewUtils.js

/* ========= Env / API roots ========= */
const API_ROOT_DEFAULT = "https://inspection-server-4nvj.onrender.com";

const fromWindow =
  typeof window !== "undefined" ? window.__QCS_API__ : undefined;

const fromProcess =
  typeof process !== "undefined"
    ? (process.env?.REACT_APP_API_URL || process.env?.VITE_API_URL)
    : undefined;

let fromVite;
try {
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

const isMongoId = (v) => typeof v === "string" && /^[a-f0-9]{24}$/i.test(v);

// 🔹 تطبيع UPPERCASE للمقارنة على مفاتيح العمل
const normU = (s) => String(s || "").trim().toUpperCase();

/* ===== تطبيع مساعد قوي (مضاف) ===== */
const strip = (s) => normU(s).replace(/[\s\-_/.,]/g, ""); // شدّدنا التطبيع

function sameText(a, b) {
  return strip(a) && strip(a) === strip(b);
}

function withinDays(dateA, dateB, maxDays = 3) {
  const toTs = (x) => {
    if (!x) return 0;
    const d = new Date(x);
    return Number.isFinite(d.getTime()) ? d.getTime() : 0;
  };
  const A = toTs(String(dateA).slice(0,10));
  const B = toTs(String(dateB).slice(0,10));
  if (!A || !B) return false;
  const diffDays = Math.abs(A - B) / 86400000;
  return diffDays <= maxDays;
}

// === Auth headers (اختياري: token/apiKey من localStorage.currentUser) ===
function getAuthHeaders() {
  try {
    const u = JSON.parse(localStorage.getItem("currentUser") || "{}");
    if (u?.token) return { Authorization: `Bearer ${u.token}` };
    if (u?.apiKey) return { "x-api-key": u.apiKey };
  } catch {}
  return {};
}

export const getDisplayId = (r) => {
  const awb = r?.generalInfo?.airwayBill;
  const inv = r?.generalInfo?.invoiceNo;
  if (!_sentinel(awb)) return _normalize(awb);
  if (!_sentinel(inv)) return _normalize(inv);
  return "No AWB / Invoice";
};

// ========= FIXED: getCreatedDate prioritizes all possible fields =========
export const getCreatedDate = (r) =>
  String(
    r?.createdDate ||
    r?.created_at ||
    r?.createdAt ||
    r?.date ||
    (r?.payload?.createdDate || r?.payload?.createdAt || r?.payload?.date) ||
    ""
  ).slice(0, 10);

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

/* ✅ دمج بدون أي اعتماد على serverId */
export const mergeUniqueById = (serverArr, localArr) => {
  const map = new Map();

  const makeKey = (r) => {
    const p  = r?.payload || r || {};
    const gi = p.generalInfo || r?.generalInfo || {};

    if (p.uniqueKey)               return `UK:${normU(p.uniqueKey)}`;
    if (gi.airwayBill)             return `AWB:${normU(gi.airwayBill)}`;
    if (gi.invoiceNo)              return `INV:${normU(gi.invoiceNo)}`;
    if (p.id)                      return `ID:${String(p.id)}`;
    return `TMP:${Math.random().toString(16).slice(2)}`;
  };

  const put = (r) => {
    const k = makeKey(r);
    const prev = map.get(k) || {};
    map.set(k, { ...prev, ...r }); // السيرفر سيغلب لأننا ندخله ثانيًا
  };

  (Array.isArray(localArr)  ? localArr  : []).forEach(put);
  (Array.isArray(serverArr) ? serverArr : []).forEach(put);

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
        .map((x) => (typeof x === "string" ? x : (x?.url || x?.data || "")))
        .filter(Boolean)
    : [];

// ========= FIXED: normalizeServerRecord =========
export const normalizeServerRecord = (rec) => {
  const p = rec?.payload || rec || {};
  const payloadId = p.id || p.payloadId || undefined;

  // نترك serverId إن وُجد لكن لن نعتمد عليه في الدمج
  const dbId = rec?._id || undefined;

  const createdAt =
    p.createdAt ||
    rec?.created_at ||
    rec?.createdAt ||
    p.date ||
    "";

  const createdDate =
    p.createdDate ||
    rec?.createdDate ||
    createdAt.slice(0, 10);

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

    certificateFile: p.certificateFile || "",
    certificateUrl: p.certificateUrl || "",
    certificateName: p.certificateName || "",

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
    headers: { Accept: "application/json", ...getAuthHeaders() },
    signal,
  });
  if (!res.ok) throw new Error(`Server ${res.status}`);
  const json = await res.json();
  const arr = Array.isArray(json) ? json : json?.data || [];
  return arr.map(normalizeServerRecord);
}

export async function fetchReportDetailsFromServer(reportId, signal) {
  const res = await fetch(`${API_BASE}/api/reports/${reportId}?type=qcs_raw_material`, {
    cache: "no-store",
    mode: "cors",
    credentials: IS_SAME_ORIGIN ? "include" : "omit",
    headers: { Accept: "application/json", ...getAuthHeaders() },
    signal,
  });
  if (!res.ok) throw new Error(`Server ${res.status}`);
  const json = await res.json();
  if (!json.ok || !json.data) return null;
  return normalizeServerRecord(json.data);
}

/* ========= Helper لطلبات JSON مع رفع أخطاء واضح ========= */
async function _requestJSON(url, opts = {}) {
  const res = await fetch(url, {
    credentials: IS_SAME_ORIGIN ? "include" : "omit",
    headers: { Accept: "application/json", ...getAuthHeaders(), ...(opts.headers || {}) },
    ...opts,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const t = data?.message || data?.error || (await res.text().catch(()=> ""));
    throw new Error(t || `HTTP ${res.status}`);
  }
  return data;
}

/* ========= UPSERT (PUT مع fallback إلى POST) ========= */
export async function upsertReportOnServer(record) {
  const reporter = getReporter();
  const type = "qcs_raw_material";
  const baseHeaders = { "Content-Type": "application/json", Accept: "application/json", ...getAuthHeaders() };

  // لا نستخدم أي id محلي في عنوان الطلب
  const { id, localId, serverId, ...clean } = record || {};

  // إبقاء منطق PUT/POST كما هو — لكن الدمج لا يعتمد على serverId
  const hasServerId = isMongoId(serverId);

  const putUrl  = `${API_BASE}/api/reports/${encodeURIComponent(serverId || "")}?type=${encodeURIComponent(type)}`;
  const postUrl = `${API_BASE}/api/reports`;

  const body = JSON.stringify({ reporter, type, payload: { ...clean, id } });

  async function doPost() {
    return _requestJSON(postUrl, { method: "POST", headers: baseHeaders, body });
  }

  async function doPut() {
    const r = await fetch(putUrl, {
      method: "PUT",
      headers: baseHeaders,
      credentials: IS_SAME_ORIGIN ? "include" : "omit",
      body,
    });
    if (r.status === 404) return doPost();
    const data = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(data?.message || data?.error || `PUT ${r.status}`);
    return data;
  }

  return hasServerId ? doPut() : doPost();
}

/* ========= DELETE (مفاتيح عمل + محاولة _id أولًا) ========= */

// ===== مفتاح عمل (بدون تاريخ داخل المفتاح) =====
export function buildBusinessKey(rec) {
  const p  = rec?.payload || rec || {};
  const gi = p.generalInfo || rec?.generalInfo || {};

  if (p.uniqueKey && !["", "NIL", "NA", "N/A", "NONE", "NULL", "-", "—", "0"].includes(String(p.uniqueKey).toUpperCase()))
    return String(p.uniqueKey);

  if (gi.airwayBill && !["", "NIL", "NA", "N/A", "NONE", "NULL", "-", "—", "0"].includes(String(gi.airwayBill).toUpperCase()))
    return `QCS:AWB:${strip(gi.airwayBill)}`;

  if (gi.invoiceNo && !["", "NIL", "NA", "N/A", "NONE", "NULL", "-", "—", "0"].includes(String(gi.invoiceNo).toUpperCase()))
    return `QCS:INV:${strip(gi.invoiceNo)}`;

  // ما منعيد التاريخ داخل المفتاح (هو سبب عدم التطابق)
  const supplier = gi.supplierName ? strip(gi.supplierName) : "UNK";
  const brand    = gi.brand        ? strip(gi.brand)        : "UNK";
  const seqPart  = p.sequence ? `:${String(p.sequence)}` : "";
  return `QCS:FB:${supplier}:${brand}${seqPart}`;
}

// ===== تطابق مرِن بين سجل السيرفر وسجل الواجهة =====
function matchByBusinessKey(target, rec) {
  const t  = target?.payload || target || {};
  const tt = t?.generalInfo  || {};
  const r  = rec?.payload    || rec    || {};
  const rr = r?.generalInfo  || {};

  // 1) uniqueKey إن وُجد في الطرفين
  if (t.uniqueKey && r.uniqueKey && sameText(t.uniqueKey, r.uniqueKey)) return true;

  // 2) AWB
  if (tt.airwayBill && rr.airwayBill && sameText(tt.airwayBill, rr.airwayBill)) return true;

  // 3) Invoice
  if (tt.invoiceNo && rr.invoiceNo && sameText(tt.invoiceNo, rr.invoiceNo)) return true;

  // 4) fallback مرِن: مورد + براند (+ سيكوينس إن وجد) + تاريخ ضمن ±3 أيام
  const supplierOk = tt.supplierName && rr.supplierName && sameText(tt.supplierName, rr.supplierName);
  const brandOk    = tt.brand        && rr.brand        && sameText(tt.brand,        rr.brand);
  const seqOk      = (t.sequence || r.sequence) ? String(t.sequence || "") === String(r.sequence || "") : true;

  // حاول تجميع التاريخ من عدة أماكن محتملة بكل طرف
  const tDate = t.createdDate || t.created_at || t.createdAt || t.date || target?.createdDate || target?.createdAt || target?.date || "";
  const rDate = r.createdDate || r.created_at || r.createdAt || r.date || rec?.createdDate    || rec?.createdAt    || rec?.date    || "";

  const dateOk = withinDays(tDate, rDate, 3);

  return Boolean(supplierOk && brandOk && seqOk && dateOk);
}

// ===== حذف من السيرفر (مع تجريب _id أولًا ثم المفاتيح) =====
async function _hitDelete(url, headers) {
  try {
    const res = await fetch(url, {
      method: "DELETE",
      mode: "cors",
      credentials: IS_SAME_ORIGIN ? "include" : "omit",
      headers,
    });
    return (res.ok || res.status === 404);
  } catch { return false; }
}

export async function deleteOnServer(record) {
  const base = `${API_BASE}/api/reports`;
  const headers = { Accept: "application/json", ...getAuthHeaders() };
  const typeQ = "qcs_raw_material";

  // 0) جرّب الحذف المباشر إذا توافر serverId صالح (كـ فرصة أولى فقط)
  const id = record?.serverId;
  if (id && /^[a-f0-9]{24}$/i.test(id)) {
    const urls = [
      `${base}/${id}`,
      `${base}/${id}?type=${encodeURIComponent(typeQ)}`,
      `${base}/${encodeURIComponent(typeQ)}/${id}`,
    ];
    for (const u of urls) if (await _hitDelete(u, headers)) return true;
    // لو فشل، نكمل للبحث بالمفاتيح
  }

  // 1) اسحب القائمة كاملة لهالنوع
  try {
    const res = await fetch(`${base}?type=${encodeURIComponent(typeQ)}`, {
      cache: "no-store",
      mode: "cors",
      credentials: IS_SAME_ORIGIN ? "include" : "omit",
      headers,
    });
    if (!res.ok) return false;

    const json = await res.json().catch(() => ({}));
    const arr = Array.isArray(json) ? json : (json?.data || []);

    // 2) دور على الهدف بتطابق مرِن
    const target = arr.find((srv) => matchByBusinessKey(srv, record));
    if (!target) return true; // ما لقيناه = اعتبره محذوف عمليًا

    const dbId = target?._id || target?.id;
    if (!dbId) return true;

    // 3) جرّب كل مسارات الحذف المعروفة
    const delUrls = [
      `${base}/${dbId}`,
      `${base}/${dbId}?type=${encodeURIComponent(typeQ)}`,
      `${base}/${encodeURIComponent(typeQ)}/${dbId}`,
    ];
    for (const u of delUrls) if (await _hitDelete(u, headers)) return true;

    return false;
  } catch {
    return false;
  }
}

/* ========= Images API (upload/delete) ========= */
export async function uploadImageViaServer(file, purpose = "qcs_raw_material") {
  const fd = new FormData();
  fd.append("file", file);
  fd.append("purpose", purpose);
  fd.append("compress", "true");
  fd.append("maxDim", "1280");
  fd.append("quality", "80");

  const res = await fetch(`${API_BASE}/api/images`, {
    method: "POST",
    body: fd,
    credentials: IS_SAME_ORIGIN ? "include" : "omit",
    headers: { ...getAuthHeaders() },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data?.ok || !(data.optimized_url || data.url)) {
    throw new Error(data?.error || "Upload failed");
  }
  return data.optimized_url || data.url;
}

/* ====== حذف الصور (مسارات مضمونة فقط) ====== */
async function _deleteImageCore(url) {
  if (!url) return true;

  // A) DELETE /api/images?url=...
  try {
    const res = await fetch(`${API_BASE}/api/images?url=${encodeURIComponent(url)}`, {
      method: "DELETE",
      mode: "cors",
      cache: "no-store",
      credentials: IS_SAME_ORIGIN ? "include" : "omit",
      headers: { Accept: "application/json", ...getAuthHeaders() },
    });
    // في بعض السيرفرات قد لا يرجع JSON — نكتفي بحالة 200/404
    if (res.ok || res.status === 404) return true;
    // حاول قراءة JSON إن وُجد
    const data = await res.json().catch(() => ({}));
    if (data?.ok) return true;
  } catch {}

  // B) POST /api/images/delete  { url }
  try {
    const res2 = await fetch(`${API_BASE}/api/images/delete`, {
      method: "POST",
      mode: "cors",
      cache: "no-store",
      credentials: IS_SAME_ORIGIN ? "include" : "omit",
      headers: { "Content-Type": "application/json", Accept: "application/json", ...getAuthHeaders() },
      body: JSON.stringify({ url }),
    });
    if (res2.ok || res2.status === 404) return true;
    const data2 = await res2.json().catch(() => ({}));
    if (data2?.ok) return true;
  } catch {}

  return false;
}

export async function deleteImageUrl(url) {
  return _deleteImageCore(url);
}

export async function deleteImagesMany(urls = []) {
  const unique = [...new Set(urls.filter(Boolean))];
  if (!unique.length) return { ok: true, deleted: 0, failed: 0 };
  const results = await Promise.allSettled(unique.map((u) => _deleteImageCore(u)));
  const deleted = results.filter((r) => r.status === "fulfilled" && r.value === true).length;
  const failed  = unique.length - deleted;
  return { ok: failed === 0, deleted, failed };
}

/* ========= توليد مفتاح فريد جديد (حسب التاريخ + النوع + رقم الشحنة) ========= */
const normStr = (s) => String(s || "").trim().toUpperCase().replace(/[\s\-_/.,]/g, "");
