// supplierEvaluation.js
//
// ✅ هل هذا المورّد مُقيَّم؟ — Is this supplier evaluated?
//
// ONE source of truth, by decision: the **Submitted Supplier Results** page
// under the HACCP/ISO card (`Supplier Approval/SupplierEvaluationResults.jsx`)
// — suppliers who opened the public link and sent the self-assessment back.
// The Supplier Performance scorecard is deliberately NOT counted: it is an
// internal score a colleague types in, so it marked suppliers as "evaluated"
// that never returned a questionnaire (TMP, for one).
//
// The submitted test is copied from that page verbatim so the tick and the list
// can never disagree:  public link  AND  submitted.
// (A record with answers but no public link — an internally filled draft — is
// hidden there, so it is not counted here either.)
//
// Nothing here writes. If the server cannot be reached the index is empty and
// the tick simply does not appear — the form keeps working.

import { useEffect, useMemo, useState } from "react";
import API_BASE from "../../../../config/api";

export const SELF_TYPE = "supplier_self_assessment_form";

/* ══════════════════════════════════════ Name matching

   The supplier master (`qcs_supplier`, what the dropdown shows) and the
   questionnaire are typed by different people, so the same company reads
   "REBOU AL  ETINAD MEAT TR LLC" in one and "Rebou Al Etimad Meat Trading LLC"
   in the other. Matching therefore works on the significant words only:
   punctuation, legal form and trade filler are dropped, and two names match
   when they share at least TWO significant words (or reduce to the same set).

   The bar is deliberately high: a missing tick is a small annoyance, a tick on
   a supplier who was never evaluated is a false quality record. */

const FILLER = new Set([
  "llc", "l", "c", "co", "company", "ltd", "limited", "est", "establishment",
  "wll", "fzc", "fze", "dmcc", "llp", "branch", "single", "owner", "sole",
  "proprietorship", "trading", "trade", "tr", "trd", "general", "international",
  "intl", "group", "enterprises", "enterprise", "industries", "industry",
  "factory", "services", "service", "materials", "material", "foodstuff",
  "foodstuffs", "food", "foods", "meat", "meats", "sale", "sales", "supply",
  "supplies", "uae", "dubai", "sharjah", "abu", "dhabi", "and", "the", "for",
  "of", "al",
]);

/** Lower case, punctuation out, spaces collapsed. */
export function normalizeSupplier(v) {
  return String(v ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9؀-ۿ]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** "almadam" and "al madam" are the same word once the article is off. */
const stripArticle = (w) => (w.length > 4 && w.startsWith("al") ? w.slice(2) : w);

/** The words that actually identify a company. */
export function significantWords(name) {
  return normalizeSupplier(name)
    .split(" ")
    .map(stripArticle)
    .filter((w) => w.length >= 3 && !FILLER.has(w));
}

/** One typo apart — "etimad" / "etinad" are the same supplier. */
function nearlyEqual(a, b) {
  if (a === b) return true;
  if (Math.min(a.length, b.length) < 5) return false;
  if (Math.abs(a.length - b.length) > 1) return false;
  // single edit (substitution, insertion or deletion)
  let i = 0, j = 0, edits = 0;
  while (i < a.length && j < b.length) {
    if (a[i] === b[j]) { i++; j++; continue; }
    if (++edits > 1) return false;
    if (a.length === b.length) { i++; j++; }
    else if (a.length > b.length) i++;
    else j++;
  }
  return edits + (a.length - i) + (b.length - j) <= 1;
}

/** How many identifying words two names share. */
export function sharedWordCount(aWords, bWords) {
  const used = new Set();
  let shared = 0;
  aWords.forEach((w) => {
    const hit = bWords.findIndex((x, idx) => !used.has(idx) && nearlyEqual(w, x));
    if (hit >= 0) { used.add(hit); shared++; }
  });
  return shared;
}

/** Same company? Two shared identifying words, or the same set of them. */
export function sameSupplier(a, b) {
  const na = normalizeSupplier(a);
  const nb = normalizeSupplier(b);
  if (!na || !nb) return false;
  if (na === nb) return true;

  const wa = significantWords(a);
  const wb = significantWords(b);
  if (!wa.length || !wb.length) return false;

  const shared = sharedWordCount(wa, wb);
  if (shared >= 2) return true;
  return shared === wa.length && shared === wb.length; // identical word sets
}

/* ══════════════════════════════════════ Server layer */

/** The page's own test: a public link that came back submitted. */
export function isSubmittedEvaluation(rec) {
  const p = rec?.payload || {};
  const isPublic = !!p?.public?.token || p?.public?.mode === "PUBLIC";
  const isSubmitted =
    p?.meta?.submitted === true ||
    !!p?.public?.submittedAt ||
    !!p?.public?.submission?.submittedAt;
  return isPublic && isSubmitted;
}

function submittedName(rec) {
  const p = rec?.payload || {};
  return String(
    p?.fields?.company_name ||
    p?.public?.submission?.fields?.company_name ||
    p?.public?.supplierName ||
    ""
  ).trim();
}

function submittedAt(rec) {
  const p = rec?.payload || {};
  return String(p?.public?.submittedAt || p?.public?.submission?.submittedAt || "").slice(0, 10);
}

/** Every supplier that returned the questionnaire: [{ name, date }]. */
export async function fetchEvaluatedSuppliers(signal) {
  try {
    const res = await fetch(
      `${API_BASE}/api/reports?type=${encodeURIComponent(SELF_TYPE)}`,
      { cache: "no-store", signal, headers: { Accept: "application/json" } }
    );
    if (!res.ok) return [];
    const json = await res.json().catch(() => null);
    const rows = Array.isArray(json) ? json : json?.data || json?.items || [];
    const out = [];
    const seen = new Set();
    rows.forEach((rec) => {
      if (!isSubmittedEvaluation(rec)) return;
      const name = submittedName(rec);
      const key = normalizeSupplier(name);
      if (!key || seen.has(key)) return;
      seen.add(key);
      out.push({ name, date: submittedAt(rec) });
    });
    return out;
  } catch {
    return [];
  }
}

/**
 * What to show beside a supplier name, or null when no questionnaire came back.
 * `matched` is the name as the evaluation page spells it, which is what makes a
 * loose match auditable on screen.
 */
export function supplierStatus(list, name) {
  if (!name) return null;
  const hit = (list || []).find((e) => sameSupplier(e.name, name));
  if (!hit) return null;
  const exact = normalizeSupplier(hit.name) === normalizeSupplier(name);
  return {
    evaluated: true,
    mark: "✅",
    label: "Evaluated",
    matched: hit.name,
    date: hit.date,
    detail: [exact ? "" : hit.name, hit.date ? `submitted ${hit.date}` : ""]
      .filter(Boolean)
      .join(" · "),
  };
}

/** Hook: reads the submitted evaluations once and answers per supplier name. */
export function useSupplierEvaluations() {
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const ctrl = new AbortController();
    let alive = true;
    fetchEvaluatedSuppliers(ctrl.signal).then((rows) => {
      if (!alive) return;
      setList(rows);
      setLoading(false);
    });
    return () => { alive = false; ctrl.abort(); };
  }, []);

  const statusOf = useMemo(() => (name) => supplierStatus(list, name), [list]);

  return { list, statusOf, loading };
}
