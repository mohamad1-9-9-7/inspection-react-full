// src/pages/monitor/branches/_shared/useTakenDates.js
//
// "Is a report already filed for this date?" — answered without downloading the
// archive to find out.
//
// The screens that asked this used to fetch `?type=X` with no date and no
// `lite`, which authFetch turns into `limit=5000`, so the server answered with
// `SELECT *` — every record of that type, full payloads — and the client then
// ran `.some()` over it. On a receiving log that is megabytes, and it ran again
// on every change of the report date.
//
// This pulls the metadata index once per screen (`lite=1`: id, type, dates, no
// payload) and answers from a Set after that, so changing the date costs
// nothing.

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { listReportDates } from "./reportApi";

/**
 * @param {string} type report type on the server
 * @returns {{
 *   isTaken: (date: string) => boolean,
 *   markTaken: (date: string) => void,
 *   unmarkTaken: (date: string) => void,
 *   loading: boolean,
 *   failed: boolean,
 * }}
 */
export default function useTakenDates(type) {
  const [dates, setDates] = useState(() => new Set());
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const alive = useRef(true);

  useEffect(() => {
    alive.current = true;
    const controller = new AbortController();
    setLoading(true);
    setFailed(false);

    listReportDates(type, { signal: controller.signal })
      .then((rows) => {
        if (!alive.current) return;
        setDates(new Set(rows.map((r) => String(r.reportDate || "").trim()).filter(Boolean)));
        setLoading(false);
      })
      .catch((e) => {
        if (!alive.current || e?.name === "AbortError") return;
        // A failed probe must never block data entry — the screen falls back to
        // "unknown" and the save path still runs its own checks.
        console.warn(`[useTakenDates] ${type}:`, e?.message || e);
        setFailed(true);
        setLoading(false);
      });

    return () => {
      alive.current = false;
      controller.abort();
    };
  }, [type]);

  const isTaken = useCallback((date) => dates.has(String(date || "").trim()), [dates]);

  const markTaken = useCallback((date) => {
    const d = String(date || "").trim();
    if (!d) return;
    setDates((prev) => (prev.has(d) ? prev : new Set(prev).add(d)));
  }, []);

  const unmarkTaken = useCallback((date) => {
    const d = String(date || "").trim();
    setDates((prev) => {
      if (!prev.has(d)) return prev;
      const next = new Set(prev);
      next.delete(d);
      return next;
    });
  }, []);

  return useMemo(
    () => ({ isTaken, markTaken, unmarkTaken, loading, failed }),
    [isTaken, markTaken, unmarkTaken, loading, failed]
  );
}
