// src/pages/monitor/branches/_shared/useReportIndex.js
//
// 📅 شجرة التواريخ بلا تنزيل الأرشيف — فهرس خفيف + سجل واحد عند الطلب.
//
// The view screens all had the same shape: fetch every report of a type on
// mount, sort it, show a date tree, and display one record at a time. The date
// tree needs a date per record; it never needed the records. On the live data
// that meant Daily Cleanliness pulled 2,075 KB to render a list of 299 dates,
// and Personal Hygiene 994 KB for 300 — every time the page opened.
//
// This hook keeps the same behaviour and swaps what travels:
//   • mount      → listReportDates (?lite=1, metadata only, ~50 KB)
//   • click date → getReportById   (that one record)
//   • export all → loadAll()       (the full list, only when asked for)
//
// Records already opened are cached for the session, so clicking back and
// forth between two dates does not refetch either of them.

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  getReportById,
  getReportRowByDate,
  listReportDates,
  listReports,
  reportDateOf,
  reportId,
} from "./reportApi";

/* ── Caches that outlive the component ──────────────────────────────
   A viewer hub unmounts its panel on every tab switch, so a per-mount cache
   threw the index away each time: going Hygiene → Cleaning → Hygiene refetched
   the first index from scratch, and the screen sat on "⏳ Loading…" again for a
   list it had already downloaded. Keeping the index (and the records already
   opened) at module level makes a return visit instant, and the in-flight map
   collapses the duplicate request React StrictMode's double mount would fire.
   Short TTL — this is a viewer, so a minute-old index is fine, and `reload()`
   (the refresh button) always bypasses it. */
const INDEX_TTL = 60 * 1000;
const _indexCache = new Map();   // type → { rows, ts }
const _indexInflight = new Map();// type → Promise<rows>
const _recordCache = new Map();  // `${type}::${id|date}` → { row, ts }

function cachedIndex(type) {
  const hit = _indexCache.get(type);
  if (!hit) return null;
  if (Date.now() - hit.ts > INDEX_TTL) { _indexCache.delete(type); return null; }
  return hit.rows;
}

function fetchIndex(type) {
  if (_indexInflight.has(type)) return _indexInflight.get(type);
  const p = listReportDates(type)
    .then((rows) => { _indexCache.set(type, { rows, ts: Date.now() }); return rows; })
    .finally(() => _indexInflight.delete(type));
  _indexInflight.set(type, p);
  return p;
}

/** Drop everything cached for a type — after a save, or on an explicit refresh. */
export function invalidateReportIndex(type) {
  if (type) {
    _indexCache.delete(type);
    const prefix = `${type}::`;
    [..._recordCache.keys()].forEach((k) => { if (k.startsWith(prefix)) _recordCache.delete(k); });
  } else {
    _indexCache.clear();
    _recordCache.clear();
  }
}

/**
 * @param {string} type            report type
 * @param {object} [opts]
 * @param {boolean} [opts.autoOpenLatest=true]  open the newest record on load
 */
export default function useReportIndex(type, opts = {}) {
  const { autoOpenLatest = true } = opts;

  const [index, setIndex] = useState([]);       // lite rows, newest first
  const [selected, setSelected] = useState(null); // the full row on screen
  const [loading, setLoading] = useState(false);  // loading the index
  const [opening, setOpening] = useState(false);  // loading one record

  // The TYPE this hook has loaded, not a "have we loaded once" flag. A caller
  // that swaps `type` on a live instance — one viewer component driving several
  // sheets — would otherwise keep serving the first type's index forever.
  const loadedTypeRef = useRef(null);

  /* `load` is not rebuilt when the selection changes, so reading `selected`
     straight out of its closure gave it whatever was on screen the last time
     the callback was created — stale by exactly the edits a reload is meant to
     pick up. The ref is always current. */
  const selectedRef = useRef(null);
  selectedRef.current = selected;

  /** Newest first, by business date then by id (same-day records). */
  const sortIndex = useCallback((rows) => {
    return [...rows].sort((a, b) => {
      const da = Date.parse(reportDateOf(a)) || 0;
      const db = Date.parse(reportDateOf(b)) || 0;
      return db - da || Number(reportId(b) || 0) - Number(reportId(a) || 0);
    });
  }, []);

  /** Fetch one record — by id when the index gave us one, by date otherwise. */
  const open = useCallback(
    async (item) => {
      if (!item) return null;
      const id = reportId(item) || item.id;
      const key = `${type}::${String(id || reportDateOf(item))}`;

      const hit = _recordCache.get(key);
      // Same TTL as the index: a viewer may hold a record for a minute, never
      // past the point where somebody could have re-saved that sheet.
      if (hit && Date.now() - hit.ts <= INDEX_TTL) {
        setSelected(hit.row);
        return hit.row;
      }
      if (hit) _recordCache.delete(key);

      setOpening(true);
      try {
        let full = id ? await getReportById(id) : null;
        // A server that predates ?lite=1 returns the whole row already, and a
        // record whose id did not come through is still reachable by date.
        if (!full) full = item.payload ? item : await getReportRowByDate(type, reportDateOf(item));
        if (full) {
          _recordCache.set(key, { row: full, ts: Date.now() });
          setSelected(full);
        }
        return full;
      } finally {
        setOpening(false);
      }
    },
    [type]
  );

  /**
   * @param {object} [o]
   * @param {boolean} [o.fresh=true] skip the module cache and hit the server.
   *   A mount passes false, so returning to a tab paints from what is already
   *   in memory; the refresh button leaves it true.
   */
  const load = useCallback(async ({ fresh = true } = {}) => {
    const cached = fresh ? null : cachedIndex(type);
    setLoading(!cached);
    try {
      if (fresh) invalidateReportIndex(type);
      const rows = sortIndex(cached || (await fetchIndex(type)));
      setIndex(rows);

      // Keep the record on screen if it survived the reload, else fall back.
      const current = selectedRef.current;
      const currentId = String(reportId(current) || "");
      const still = currentId && rows.some((r) => String(reportId(r) || r.id) === currentId);
      if (still) {
        // It survived — but a `fresh` reload is exactly how a screen asks for
        // the version it just wrote, so re-read it rather than leaving the
        // pre-save copy on screen. The record cache was dropped above, so this
        // really does go back to the server.
        if (fresh) await open(current);
      } else {
        setSelected(null);
        if (autoOpenLatest && rows.length) await open(rows[0]);
      }
      return rows;
    } catch (e) {
      console.error(e);
      setIndex([]);
      return [];
    } finally {
      setLoading(false);
    }
  }, [type, sortIndex, open, autoOpenLatest]);

  /** Public refresh — always goes to the server. */
  const reload = useCallback(() => load({ fresh: true }), [load]);

  useEffect(() => {
    if (loadedTypeRef.current === type) return;
    loadedTypeRef.current = type;
    // Drop the record on screen first: it belongs to the previous type, and
    // rendering it under the new type's columns shows a row of dashes until
    // the new index lands.
    setSelected(null);
    setIndex([]);
    load({ fresh: false });
  }, [type, load]);

  /** The full list — for "export everything", never for rendering the tree. */
  const loadAll = useCallback(async () => listReports(type), [type]);

  /** Items in the shape DateTreeSidebar / CollapsibleDateTree expect. */
  const treeItems = useMemo(
    () =>
      index.map((r) => {
        const iso = reportDateOf(r);
        const d = new Date(iso);
        return {
          key: String(reportId(r) || r.id || iso),
          id: reportId(r) || r.id,
          dateISO: iso,
          label: Number.isNaN(d.getTime()) ? iso || "—" : d.toLocaleDateString("en-GB"),
          row: r,
        };
      }),
    [index]
  );

  /** Look an index row up from a tree item's key. */
  const rowForKey = useCallback(
    (key) => index.find((r) => String(reportId(r) || r.id || reportDateOf(r)) === String(key)) || null,
    [index]
  );

  return {
    index,
    treeItems,
    selected,
    setSelected,
    selectedKey: selected ? String(reportId(selected) || "") : "",
    loading,
    opening,
    open,
    rowForKey,
    reload,
    loadAll,
    count: index.length,
  };
}
