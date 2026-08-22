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

/* The business date of a record, in the SAME order the server's BUSINESS_DATE
   expression resolves it (routes/reports.cjs). The two must agree: when this
   function cannot read a date the server can, getReportRowByDate discards the
   row the server just handed it and falls through to a full-table scan — and
   when neither can read it, a save that should UPDATE inserts a DUPLICATE
   instead. Both were happening:

     • NCR keeps its date at payload.headRow.reportDate — the server knew that
       path, this function did not.
     • The FTR preloading sheets keep theirs at payload.header.date, which
       NEITHER knew.

   New paths are appended rather than reordered, so every record that already
   resolved keeps resolving to exactly the same date. The created_at fallbacks
   stay last: they are a guess, and any real business date must win over them.

   Deliberately NOT copied from the server: header.issueDate / header.month /
   header.dateIssued. Those are document-control fields — most forms carry a
   fixed "Issue Date: 05/02/2020" in their header — so reading them as the
   record's date would confidently return the wrong day. */
export function reportDateOf(row) {
  const p = payloadOf(row);
  const v =
    p.reportDate ||
    p.date ||
    p.header?.reportDate ||
    p.header?.reportEntryDate ||
    p.meta?.entryDate ||
    p.headRow?.reportDate ||
    p.header?.date ||
    p.cutDate ||
    p.entries?.[0]?.date ||
    row?.createdAt ||
    row?.created_at ||
    "";
  // The server compares LEFT(...,10); an ISO timestamp must match a plain
  // YYYY-MM-DD. Shorter and non-ISO values (e.g. "05/02/2020") pass through.
  return String(v).slice(0, 10);
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

/* Most recent record of a type — the data behind the forms' "load from last
   report" button. Two cheap calls (a metadata-only listing to find the newest
   id, then that one record) instead of downloading every payload of the type
   just to read the last one. */
export async function getLatestReport(type, params = {}) {
  const rows = await listReportDates(type, params);
  if (!rows.length) return null;

  const withDate = rows
    .map((r) => {
      const d = String(reportDateOf(r) || "").slice(0, 10);
      const t = Date.parse(d);
      return { row: r, date: d, t: Number.isFinite(t) ? t : -Infinity };
    })
    .filter((x) => x.date);
  if (!withDate.length) return null;

  // Newest business date wins; same-day records fall back to the highest id,
  // which is the most recently inserted one.
  withDate.sort((a, b) => b.t - a.t || Number(reportId(b.row)) - Number(reportId(a.row)));
  const best = withDate[0];

  const id = reportId(best.row);
  const full = id ? await getReportById(id, params) : null;
  const row = full || (await getReportRowByDate(type, best.date, params));
  return row ? { row, payload: payloadOf(row), reportDate: best.date } : null;
}

export async function getLatestPayload(type, params = {}) {
  const hit = await getLatestReport(type, params);
  return hit ? hit.payload : null;
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
