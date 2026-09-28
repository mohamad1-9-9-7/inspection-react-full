// qcsRawApi.js
import { saveReport } from "../../../../utils/reportOutbox";
import { dropKeptPhoto, isKeptPhoto, keepPhotoOrUpload } from "../../../../utils/offlineOutbox";
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

/** حفظ/تحديث تقرير qcs_raw_material.
    Returns { queued, report }: queued = no connection, the report waits on
    this device and is sent later (utils/reportOutbox.js). */
export async function sendToServer(payload) {
  const reporter = getReporter();
  const type = "qcs_raw_material";

  // لا نثق بأي id محلي؛ نعتمد فقط على _id القادم من السيرفر
  const { id, localId, ...clean } = payload || {};
  const body = { reporter, type, payload: clean };
  const label = `Raw Material ${clean.createdDate || ""}`.trim();

  if (clean?._id) {
    try {
      return await saveReport({ body, id: clean._id, label });
    } catch (e) {
      // Fallback إلى POST إذا كان السجل غير موجود
      if (e?.status !== 404) throw e;
    }
  }
  return saveReport({ body, label });
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
/* Without a connection the file is kept on the device (blob: URL) and
   uploaded when the report is sent. */
export const uploadImageToServer = (file, purpose = "qcs_raw_material") =>
  keepPhotoOrUpload(file, (f) => uploadImageToServerNow(f, purpose));
async function uploadImageToServerNow(file, purpose) {
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
  if (isKeptPhoto(url)) { await dropKeptPhoto(url); return true; }
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
