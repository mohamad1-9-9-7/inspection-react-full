// src/companies/exaltis/reports/dailyLog/logHooks.js
// Daily log engine — data hooks: lot suggestions, lookup lists, open items, matrix products.
// (Split out of SweetsDailyLog.jsx — the code is unchanged.)
import { useState, useEffect } from "react";
import { listReports, reportDateOf, getReportRowByDate } from "../../../../pages/monitor/branches/_shared/reportApi";
import { loadAllergenMatrix } from "../allergenMatrixData";
import { shiftISO } from "./logCore";

/* ───────── raw-lot suggestions for "lots" columns ───────── */
export function useLotSuggestions(type, active) {
  const [lots, setLots] = useState([]);
  useEffect(() => {
    if (!active || !type) return undefined;
    const ctl = new AbortController();
    (async () => {
      try {
        const since = new Date(Date.now() - 45 * 864e5).toISOString().slice(0, 10);
        // Only the 45-day window — never the whole history of the log.
        const rows = await listReports(type, { from: since, signal: ctl.signal });
        const seen = new Set();
        const out = [];
        rows
          .filter((r) => reportDateOf(r) >= since)
          .sort((a, b) => reportDateOf(b).localeCompare(reportDateOf(a)))
          .forEach((r) => (r.payload?.rows || []).forEach((x) => {
            if (!x.lot || x.decision === "Rejected") return;
            const label = `${x.material || "Material"} · ${x.lot}`;
            if (seen.has(label)) return;
            seen.add(label);
            const unit = ["kg", "g", "L", "pcs"].includes(x.unit) ? x.unit : "kg";
            out.push({ label, material: x.material || "", lot: x.lot, unit });
          }));
        setLots(out);
      } catch { /* suggestions are optional */ }
    })();
    return () => ctl.abort();
  }, [type, active]);
  return lots;
}

/* ───────── lookup columns (pick a value recorded in another log) ─────────
   `lookup: { from, days, pick(row) → { value, label, patch } | null }` on a
   text column suggests values from recent sheets of another type; typing or
   picking one of them fills the row with its `patch`. */
export function useLookupOptions(col) {
  const [opts, setOpts] = useState([]);
  useEffect(() => {
    if (!col?.lookup) return undefined;
    const { from, days = 60, pick } = col.lookup;
    const ctl = new AbortController();
    (async () => {
      try {
        const since = new Date(Date.now() - days * 864e5).toISOString().slice(0, 10);
        const rows = await listReports(from, { from: since, signal: ctl.signal });
        const seen = new Set();
        const out = [];
        rows
          .filter((r) => reportDateOf(r) >= since)
          .sort((a, b) => reportDateOf(b).localeCompare(reportDateOf(a)))
          .forEach((r) => (r.payload?.rows || []).forEach((x) => {
            const o = pick(x);
            if (!o || seen.has(o.value)) return;
            seen.add(o.value);
            out.push(o);
          }));
        if (!ctl.signal.aborted) setOpts(out);
      } catch { /* suggestions are optional */ }
    })();
    return () => ctl.abort();
  }, [col]);
  return opts;
}

export function useOpenItems(schema, date, active) {
  const [items, setItems] = useState([]);
  useEffect(() => {
    const tables = schema.tables.filter((t) => t.openItems);
    if (!active || !date || !tables.length) { setItems([]); return undefined; }
    const ctl = new AbortController();
    const days = Math.max(...tables.map((t) => t.openItems.days || 3));
    const dates = Array.from({ length: days }, (_, i) => shiftISO(date, -(i + 1)));
    Promise.all(dates.map((d) => getReportRowByDate(schema.type, d, { signal: ctl.signal }).catch(() => null)))
      .then((rows) => {
        if (ctl.signal.aborted) return;
        const out = [];
        rows.forEach((row, i) => {
          if (!row) return;
          tables.forEach((t) => (row.payload?.[t.key] || []).forEach((r) => {
            if (i < (t.openItems.days || 3) && t.openItems.isOpen(r)) out.push({ day: dates[i], text: t.openItems.label(r) });
          }));
        });
        setItems(out);
      });
    return () => ctl.abort();
  }, [schema, date, active]);
  return items;
}

/* ───────── allergen matrix → production allergens ───────── */
// A column with `matrix: "<target key>"` suggests the matrix's products and,
// when the typed name matches one, fills the target column with its allergens.
export function useMatrixProducts(active) {
  const [products, setProducts] = useState([]);
  useEffect(() => {
    if (!active) return undefined;
    const ctl = new AbortController();
    loadAllergenMatrix(ctl.signal)
      .then((m) => { if (!ctl.signal.aborted) setProducts((m?.products || []).filter((p) => p.name)); })
      .catch(() => { /* matrix is optional */ });
    return () => ctl.abort();
  }, [active]);
  return products;
}
