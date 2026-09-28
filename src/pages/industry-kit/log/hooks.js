// src/pages/industry-kit/log/hooks.js
// Data hooks of the entry form. Each is ONE bounded, ranged request — never a
// report's whole history and never one request per day (each sheet carries
// its full payload, and every request can wake the database).

import { useEffect, useState } from "react";
import { reportDateOf } from "../../monitor/branches/_shared/reportApi";
import { listSheets } from "./api";
import { shiftISO, todayISO } from "./rows";

/* A column with `lookup: { from, days, pick(row) → { value, label, patch } }`
   suggests values recorded on recent sheets of another type of the SAME
   industry; picking one fills the row with its `patch`. */
export function useLookupOptions(col) {
  const [opts, setOpts] = useState([]);
  useEffect(() => {
    if (!col?.lookup) return undefined;
    const { from, days = 60, pick } = col.lookup;
    const ctl = new AbortController();
    listSheets(from, { from: shiftISO(todayISO(), -days), signal: ctl.signal })
      .then((rows) => {
        const seen = new Set();
        const out = [];
        rows.forEach((r) => (r.payload?.rows || []).forEach((x) => {
          const o = pick(x);
          if (!o || seen.has(o.value)) return;
          seen.add(o.value);
          out.push(o);
        }));
        if (!ctl.signal.aborted) setOpts(out);
      })
      .catch(() => { /* suggestions are optional */ });
    return () => ctl.abort();
  }, [col]);
  return opts;
}

/* Rows still open on earlier sheets (an unfinished thaw, an open
   non-conformity…): `openItems: { days, isOpen(row), label(row) }` on a table.
   One ranged read of the previous `days` days. */
export function useOpenItems(schema, date, active) {
  const [items, setItems] = useState([]);
  useEffect(() => {
    const tables = schema.tables.filter((t) => t.openItems);
    if (!active || !date || !tables.length) { setItems([]); return undefined; }
    const ctl = new AbortController();
    const days = Math.max(...tables.map((t) => t.openItems.days || 3));
    listSheets(schema.type, { from: shiftISO(date, -days), to: shiftISO(date, -1), signal: ctl.signal })
      .then((rows) => {
        if (ctl.signal.aborted) return;
        const out = [];
        rows.forEach((row) => {
          const day = reportDateOf(row);
          tables.forEach((t) => {
            if (day < shiftISO(date, -(t.openItems.days || 3))) return;
            (row.payload?.[t.key] || []).forEach((r) => {
              if (t.openItems.isOpen(r)) out.push({ day, text: t.openItems.label(r) });
            });
          });
        });
        setItems(out);
      })
      .catch(() => { if (!ctl.signal.aborted) setItems([]); });
    return () => ctl.abort();
  }, [schema, date, active]);
  return items;
}
