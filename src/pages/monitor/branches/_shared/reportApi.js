import API_BASE from "../../../../config/api";

const REPORTS_URL = `${String(API_BASE).replace(/\/$/, "")}/api/reports`;

const isSameOrigin = (() => {
  try {
    if (typeof window === "undefined") return false;
    return new URL(API_BASE).origin === window.location.origin;
  } catch {
    return false;
  }
})();

const credentials = isSameOrigin ? "include" : "omit";

export function reportId(row) {
  return row?.id || row?._id || row?.payload?.id || row?.payload?._id || "";
}

export function payloadOf(row) {
  return row?.payload || row || {};
}

export function reportDateOf(row) {
  const p = payloadOf(row);
  return (
    p.reportDate ||
    p.date ||
    p.header?.reportDate ||
    p.header?.reportEntryDate ||
    p.meta?.entryDate ||
    row?.createdAt?.slice?.(0, 10) ||
    row?.created_at?.slice?.(0, 10) ||
    ""
  );
}

export async function listReports(type, params = {}) {
  const qs = new URLSearchParams();
  if (params.reporter) qs.set("reporter", params.reporter);
  qs.set("type", type);
  if (params.limit) qs.set("limit", String(params.limit));

  const res = await fetch(`${REPORTS_URL}?${qs.toString()}`, {
    method: "GET",
    cache: "no-store",
    credentials,
    headers: { Accept: "application/json" },
    signal: params.signal,
  });
  if (!res.ok) throw new Error(`Failed to list ${type} reports (${res.status})`);
  const json = await res.json().catch(() => null);
  return Array.isArray(json) ? json : json?.data || json?.items || [];
}

export async function getReportRowByDate(type, date, params = {}) {
  const rows = await listReports(type, params);
  return rows.find((row) => String(reportDateOf(row)).trim() === String(date).trim()) || null;
}

export async function getReportPayloadByDate(type, date, params = {}) {
  const row = await getReportRowByDate(type, date, params);
  return row ? payloadOf(row) : null;
}

export async function saveReport(type, payload, options = {}) {
  const res = await fetch(REPORTS_URL, {
    method: options.method || "PUT",
    credentials,
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({
      reporter: options.reporter || "admin-edit",
      type,
      payload,
    }),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(text || `Failed to save report (${res.status})`);
  }
  return res.json().catch(() => ({}));
}

export async function createReport(type, payload, options = {}) {
  return saveReport(type, payload, { ...options, method: "POST" });
}

export async function deleteReport(id) {
  if (!id) return true;
  const res = await fetch(`${REPORTS_URL}/${encodeURIComponent(id)}`, {
    method: "DELETE",
    credentials,
  });
  if (!res.ok && res.status !== 404) throw new Error(`Delete failed (${res.status})`);
  return true;
}

export async function deleteReportByDate(type, date, params = {}) {
  const row = await getReportRowByDate(type, date, params);
  return deleteReport(reportId(row));
}

export async function importReportPayloads(type, items, options = {}) {
  let ok = 0;
  let fail = 0;

  for (const item of items) {
    const payload = item?.payload || item;
    if (!payload || typeof payload !== "object") {
      fail += 1;
      continue;
    }
    try {
      await createReport(type, payload, { reporter: options.reporter || "admin-import" });
      ok += 1;
    } catch {
      fail += 1;
    }
  }

  return { ok, fail };
}

export function parseJsonImport(data) {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.items)) return data.items;
  if (Array.isArray(data?.data)) return data.data;
  return [];
}

export function downloadReportsJson(type, rows, filePrefix) {
  const payloads = rows.map((row) => row?.payload || row);
  const bundle = {
    type,
    exportedAt: new Date().toISOString(),
    count: payloads.length,
    items: payloads,
  };
  const blob = new Blob([JSON.stringify(bundle, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${filePrefix || type}_${new Date().toISOString().replace(/[:.]/g, "-")}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
