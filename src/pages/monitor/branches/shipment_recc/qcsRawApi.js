// qcsRawApi.js
/* =============================================================================
   🔗 API base (تقارير)
============================================================================= */
const API_ROOT_DEFAULT = "https://inspection-server-4nvj.onrender.com";
const API_ROOT =
  (typeof window !== "undefined" && window.__QCS_API__) ||
  (typeof process !== "undefined" &&
    process.env &&
    (process.env.REACT_APP_API_URL || process.env.VITE_API_URL)) ||
  API_ROOT_DEFAULT;

export const API_BASE = String(API_ROOT).replace(/\/$/, "");
export const REPORTS_URL = `${API_BASE}/api/reports`;

export const IS_SAME_ORIGIN = (() => {
  try {
    return new URL(API_BASE).origin === window.location.origin;
  } catch {
    return false;
  }
})();

/* =============================================================================
   🖼️ IMAGE API base (صور) — يمكن فصله عن سيرفر التقارير
============================================================================= */
export const IMAGE_API_BASE =
  (typeof window !== "undefined" && window.__QCS_IMAGE_API__) ||
  (typeof process !== "undefined" &&
    process.env &&
    (process.env.REACT_APP_IMAGE_API_URL || process.env.VITE_IMAGE_API_URL)) ||
  API_BASE;

/* =============================================================================
   🧰 Helpers
============================================================================= */
export function normStr(x) {
  return String(x ?? "").trim().toUpperCase();
}
export function todayIso() {
  return new Date().toISOString();
}
export function toYMD(iso) {
  return String(iso || "").slice(0, 10);
}
export function ymdToDMY(ymd) {
  if (!ymd) return "";
  const [y, m, d] = String(ymd).split("-");
  return `${d}/${m}/${y}`;
}
export function makeClientId() {
  return `cli_${Date.now().toString(36)}_${Math.random()
    .toString(36)
    .slice(2, 8)}`;
}
export function getReporter() {
  try {
    const raw = localStorage.getItem("currentUser");
    const user = raw ? JSON.parse(raw) : null;
    return user?.username || "anonymous";
  } catch {
    return "anonymous";
  }
}

/* =============================================================================
   📄 Reports API (UPSERT)
   - body موحّد: { reporter, type, payload }
   - PUT عند وجود payload._id (من السيرفر)، وإلا POST
   - Fallback: لو PUT رجع 404 → POST
============================================================================= */
async function requestJSON(url, opts = {}) {
  const res = await fetch(url, {
    credentials: IS_SAME_ORIGIN ? "include" : "omit",
    ...opts,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const t = (data && (data.message || data.error)) || (await res.text().catch(() => ""));
    throw new Error(t || `HTTP ${res.status}`);
  }
  return data;
}

/** حفظ/تحديث تقرير qcs_raw_material */
export async function sendToServer(payload) {
  const reporter = getReporter();
  const type = "qcs_raw_material";

  // لا نثق بأي id محلي؛ نعتمد فقط على _id القادم من السيرفر
  const { id, localId, ...clean } = payload || {};
  const hasServerId = !!clean?._id;

  // طلبات
  const makeBody = (doc) =>
    JSON.stringify({ reporter, type, payload: doc || {} });

  async function doPost(doc) {
    return requestJSON(REPORTS_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: makeBody(doc),
    });
  }
  async function doPut(doc) {
    const url = `${REPORTS_URL}/${encodeURIComponent(doc?._id || "")}?type=${encodeURIComponent(type)}`;
    const res = await fetch(url, {
      method: "PUT",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      credentials: IS_SAME_ORIGIN ? "include" : "omit",
      body: makeBody(doc),
    });

    // Fallback إلى POST إذا كان السجل غير موجود
    if (res.status === 404) return doPost(doc);

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      const t = (data && (data.message || data.error)) || (await res.text().catch(() => ""));
      throw new Error(t || `HTTP ${res.status}`);
    }
    return data;
  }

  return hasServerId ? doPut(clean) : doPost(clean);
}

/** حفظ meta (يبقى POST) */
export async function postMeta(metaType, payload) {
  const reporter = getReporter();
  return requestJSON(REPORTS_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({ reporter, type: metaType, payload }),
  });
}

/** جلب قائمة حسب النوع */
export async function listReportsByType(type) {
  try {
    const res = await fetch(`${REPORTS_URL}?type=${encodeURIComponent(type)}`, {
      cache: "no-store",
      credentials: IS_SAME_ORIGIN ? "include" : "omit",
      headers: { Accept: "application/json" },
    });
    if (!res.ok) return [];
    const json = await res.json();
    return Array.isArray(json) ? json : json?.data || [];
  } catch {
    return [];
  }
}

/** جلب كل تقارير المواد الخام (للاشتقاق) */
export async function fetchExistingRawMaterial() {
  try {
    const res = await fetch(`${REPORTS_URL}?type=qcs_raw_material`, {
      cache: "no-store",
      credentials: IS_SAME_ORIGIN ? "include" : "omit",
      headers: { Accept: "application/json" },
    });
    if (!res.ok) return [];
    const json = await res.json();
    return Array.isArray(json) ? json : json?.data || [];
  } catch {
    return [];
  }
}

/* =============================================================================
   🔑 Unique Key
============================================================================= */
export async function deriveUniqueKey({ shipmentType, airwayBill, invoiceNo, createdDate }) {
  const all = await fetchExistingRawMaterial();
  const idPart = normStr(airwayBill || invoiceNo || "NA");
  const typePart = normStr(shipmentType || "NA");
  const datePart = normStr(createdDate);

  const same = all.filter((r) => {
    const p = r?.payload || {};
    const pDate = normStr(p.createdDate || (p.date || "").slice(0, 10));
    const pType = normStr(p.shipmentType);
    const pId = normStr(p?.generalInfo?.airwayBill || p?.generalInfo?.invoiceNo || "NA");
    return pDate === datePart && pType === typePart && pId === idPart;
  });

  const sequence = same.length + 1;
  const baseKey = `${datePart}__${typePart}__${idPart}`;
  const uniqueKey = sequence > 1 ? `${baseKey}-${sequence}` : baseKey;
  return { uniqueKey, sequence };
}

/* =============================================================================
   📤 Image Upload + 🗑️ Delete
   - الرفع حصراً إلى IMAGE_API_BASE (ضغط تلقائي: 1280px / جودة 80%)
============================================================================= */
export async function uploadImageToServer(file, purpose = "qcs_raw_material") {
  const fd = new FormData();
  fd.append("file", file);
  fd.append("purpose", purpose);
  fd.append("compress", "true");
  fd.append("maxDim", "1280");
  fd.append("quality", "80");

  const res = await fetch(`${IMAGE_API_BASE}/api/images`, { method: "POST", body: fd });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data?.ok || !(data.optimized_url || data.url)) {
    throw new Error(data?.error || "Upload failed");
  }
  return data.optimized_url || data.url;
}

export async function deleteImage(url) {
  if (!url) throw new Error("No URL provided");
  const res = await fetch(
    `${IMAGE_API_BASE}/api/images?url=${encodeURIComponent(url)}`,
    { method: "DELETE" }
  );
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data?.ok) {
    throw new Error(data?.error || "Delete image failed");
  }
  return true;
}

export async function deleteImagesMany(urls = []) {
  const unique = [...new Set(urls.filter(Boolean))];
  if (!unique.length) return { ok: true, deleted: 0, failed: 0 };
  const results = await Promise.allSettled(unique.map((u) => deleteImage(u)));
  const deleted = results.filter((r) => r.status === "fulfilled").length;
  const failed = results.length - deleted;
  return { ok: failed === 0, deleted, failed };
}
