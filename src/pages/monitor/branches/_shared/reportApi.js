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

/* Report reads funnel through the global fetch wrapper in utils/authFetch.js,
   which already throttles bursts and retries 429s with the server's
   Retry-After. So a plain `fetch` here is automatically rate-limit resilient —
   no need to duplicate that logic in this module. */

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

/* The Date Tree only needs a date per record, not the record. `?lite=1` makes
   the server return metadata-only rows (id, dates, reporter — no payload), so
   the old reports no longer download up front; their dates show in the tree and
   the full record is pulled only when the user clicks one (getReportPayloadByDate).

   Deliberately NOT `?dates=1`: that variant filters `WHERE <business date> IS
   NOT NULL`, which silently DROPS every record whose date lives only in
   created_at or an unusual field — the tree then shows fewer rows than the
   total count. `?lite=1` applies no such filter and returns created_at, and
   reportDateOf below falls back to it, so every record gets a date and the tree
   matches the full total. limit=5000 covers every real type (a server that
   predates lite just returns full rows, still correct — only heavier). */
export async function listReportDates(type, params = {}) {
  const qs = new URLSearchParams();
  qs.set("type", type);
  qs.set("lite", "1");
  qs.set("limit", "5000");

  const res = await fetch(`${REPORTS_URL}?${qs.toString()}`, {
    method: "GET",
    cache: "no-store",
    credentials,
    headers: { Accept: "application/json" },
    signal: params.signal,
  });
  if (!res.ok) throw new Error(`Failed to list ${type} dates (${res.status})`);
  const json = await res.json().catch(() => null);
  const rows = Array.isArray(json) ? json : json?.data || json?.items || [];
  return rows.map((r) => ({
    id: reportId(r) || r.id || null,
    reportDate: reportDateOf(r),
    ...r,
  }));
}

/* Fetch one record by its numeric id (from listReportDates). One tiny query
   instead of re-downloading the whole table to find it. */
export async function getReportById(id, params = {}) {
  if (!id) return null;
  const res = await fetch(`${REPORTS_URL}/${encodeURIComponent(id)}`, {
    method: "GET",
    cache: "no-store",
    credentials,
    headers: { Accept: "application/json" },
    signal: params.signal,
  });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`Failed to load report ${id} (${res.status})`);
  const json = await res.json().catch(() => null);
  return json?.report || (Array.isArray(json?.data) ? json.data[0] : null) || null;
}

export async function getReportRowByDate(type, date, params = {}) {
  const want = String(date).trim();

  // Targeted read: the server answers `?type=&reportDate=` with just the one
  // record. This replaces the old "download the entire table and .find()"
  // path that doubled every screen's bandwidth and request count.
  const qs = new URLSearchParams();
  qs.set("type", type);
  qs.set("reportDate", want);
  try {
    const res = await fetch(`${REPORTS_URL}?${qs.toString()}`, {
      method: "GET",
      cache: "no-store",
      credentials,
      headers: { Accept: "application/json" },
      signal: params.signal,
    });
    if (res.ok) {
      const json = await res.json().catch(() => null);
      const rows = Array.isArray(json) ? json : json?.data || json?.items || [];
      const hit = rows.find((row) => String(reportDateOf(row)).trim() === want);
      // Fast path: the targeted query found it. On any miss we deliberately
      // fall through to the full scan below — reportDateOf understands more
      // date shapes than the server's matcher, so the scan is the correctness
      // backstop and guarantees this never misses an existing record.
      if (hit) return hit;
    }
  } catch {
    /* fall through to the full-list scan */
  }

  const rows = await listReports(type, params);
  return rows.find((row) => String(reportDateOf(row)).trim() === want) || null;
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
