// src/companies/exaltis/ohc/upload/ohcUploadApi.js
// OHC upload — server calls.
// (Split out of OHCUpload.jsx — the code is unchanged.)
import API_BASE from "../../../../config/api";

/* ========= API ========= */


/* Server report type */
export const TYPE = "sweets_ohc_certificate";

/* ========= Helpers ========= */
export async function jsonFetch(url, opts = {}) {
  const res = await fetch(url, {
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    ...opts,
  });
  let data = null;
  try {
    data = await res.json();
  } catch {
    data = null;
  }
  return { ok: res.ok, status: res.status, data };
}

// Normalize server list
export function extractReportsList(data) {
  let arr = [];
  if (Array.isArray(data)) arr = data;
  else if (Array.isArray(data?.items)) arr = data.items;
  else if (Array.isArray(data?.data?.items)) arr = data.data.items;
  else if (Array.isArray(data?.data)) arr = data.data;
  else if (Array.isArray(data?.results)) arr = data.results;
  else if (Array.isArray(data?.rows)) arr = data.rows;
  else if (Array.isArray(data?.list)) arr = data.list;
  return arr
    .filter((x) => (x?.type ? x.type === TYPE : true))
    .map((x) => x.payload || x);
}

// Try to detect duplicates on server by appNo (two passes)
export async function appNoExistsOnServer(appNo) {
  const direct = await jsonFetch(
    `${API_BASE}/api/reports?type=${encodeURIComponent(
      TYPE
    )}&appNo=${encodeURIComponent(appNo)}&limit=1`
  );
  if (direct.ok) {
    const list = extractReportsList(direct.data);
    if (
      list.some(
        (p) => String(p?.appNo || "").trim() === String(appNo).trim()
      )
    )
      return true;
  }

  const wide = await jsonFetch(
    `${API_BASE}/api/reports?type=${encodeURIComponent(
      TYPE
    )}&limit=1000&sort=-createdAt`
  );
  if (wide.ok) {
    const list = extractReportsList(wide.data);
    return list.some(
      (p) => String(p?.appNo || "").trim() === String(appNo).trim()
    );
  }
  return false;
}
