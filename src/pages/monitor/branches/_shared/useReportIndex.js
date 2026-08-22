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

  const cacheRef = useRef(new Map());
  const autoOpenedRef = useRef(false);

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
      const key = String(id || reportDateOf(item));

      const cached = cacheRef.current.get(key);
      if (cached) {
        setSelected(cached);
        return cached;
      }

      setOpening(true);
      try {
        let full = id ? await getReportById(id) : null;
        // A server that predates ?lite=1 returns the whole row already, and a
        // record whose id did not come through is still reachable by date.
        if (!full) full = item.payload ? item : await getReportRowByDate(type, reportDateOf(item));
        if (full) {
          cacheRef.current.set(key, full);
          setSelected(full);
        }
        return full;
      } finally {
        setOpening(false);
      }
    },
    [type]
  );

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      const rows = sortIndex(await listReportDates(type));
      cacheRef.current.clear();
      setIndex(rows);

      // Keep the record on screen if it survived the reload, else fall back.
      const currentId = String(reportId(selected) || "");
      const still = currentId && rows.some((r) => String(reportId(r) || r.id) === currentId);
      if (!still) {
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
    // `selected` is read but must not retrigger the load.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [type, sortIndex, open, autoOpenLatest]);

  useEffect(() => {
    if (autoOpenedRef.current) return;
    autoOpenedRef.current = true;
    reload();
  }, [reload]);

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
