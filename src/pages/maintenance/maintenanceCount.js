// src/pages/maintenance/maintenanceCount.js
// Lightweight badge counter for the main entry page.
// Kept separate from maintenanceShared.js on purpose: that module imports
// jsPDF/html2canvas, and we must NOT pull those into the Login bundle.
// Mirrors fetchMaintenance()'s dedupe so the count reflects the LATEST
// version of each request (e.g. after Maintenance fills "Date received").

const API_BASE =
  process.env.REACT_APP_API_URL || "https://inspection-server-4nvj.onrender.com";
const TYPE = "maintenance";

function toTs(x) {
  if (!x) return 0;
  if (typeof x === "number") return x;
  if (typeof x === "string" && /^[a-f0-9]{24}$/i.test(x)) {
    return parseInt(x.slice(0, 8), 16) * 1000;
  }
  const n = Date.parse(x);
  return Number.isFinite(n) ? n : 0;
}

/**
 * Count maintenance requests that have NOT been acknowledged yet
 * (no "Date received" filled in by the Maintenance dept).
 * Returns 0 on any failure (badge simply won't show).
 */
export async function countUnseenMaintenance() {
  let res;
  try {
    res = await fetch(`${API_BASE}/api/reports?type=${TYPE}`, { cache: "no-store" });
  } catch {
    return 0;
  }
  if (!res.ok) return 0;

  let data;
  try {
    data = await res.json();
  } catch {
    return 0;
  }

  const arr = Array.isArray(data) ? data : data?.data ?? [];
  const mapped = (arr || [])
    .filter((r) => r?.payload)
    .map((r) => {
      const p = r.payload || {};
      return {
        _id: r._id ?? r.id ?? null,
        _clientSavedAt: p._clientSavedAt,
        createdAt: p.createdAt || r.createdAt || r.created_at,
        requestNo: p.requestNo || "",
        dateReceived: p.dateReceived || "",
      };
    });

  // Keep only the newest record per request key (same logic as fetchMaintenance)
  const byKey = new Map();
  for (const rec of mapped) {
    const key = rec.requestNo || rec.createdAt || rec._id;
    const prev = byKey.get(key);
    if (!prev) {
      byKey.set(key, rec);
      continue;
    }
    const a = toTs(prev.createdAt) || toTs(prev._id) || toTs(prev._clientSavedAt);
    const b = toTs(rec.createdAt) || toTs(rec._id) || toTs(rec._clientSavedAt);
    byKey.set(key, b >= a ? rec : prev);
  }

  let count = 0;
  for (const rec of byKey.values()) {
    if (!String(rec.dateReceived || "").trim()) count += 1;
  }
  return count;
}
