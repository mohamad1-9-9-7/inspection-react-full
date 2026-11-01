// Suppliers seen in goods receiving ↔ evaluated suppliers.
//
// The server aggregates a year of receiving records into one row per typed
// supplier name (GET /api/supplier-receiving — routes/supplierDocs.cjs), so
// the page downloads a short list, not the receiving logs themselves.
//
// Receiving names are typed by hand at the branches: "KANZ AL MADAM",
// "KANZ ALMADAM", "KENZ ALMADAM", "GREEN VALLEY/KENZ ALMADAM", "trans
// emirates" (our own internal transfers)… so matching is fuzzy, and QA can
// fix what the fuzzy match gets wrong: ignore a name (internal / not a
// supplier) or link it to an evaluated supplier by hand. Those decisions are
// one config record on the server (type supplier_receiving_config).

import API_BASE from "../../../config/api";

export const RECEIVING_CONFIG_TYPE = "supplier_receiving_config";
const CONFIG_KEY = "config";

/* Words that say nothing about WHICH company it is. */
/* Legal form — never part of the name. */
const LEGAL = new Set([
  "llc", "l", "c", "lc", "co", "company", "trading", "trd", "trdg", "est", "establishment",
  "fze", "fzco", "fzllc", "fz", "ltd", "limited", "inc", "the", "and",
]);
/* Generic trade words — dropped too, unless that leaves almost nothing ("All Food"). */
const STOP = new Set([
  ...LEGAL, "general", "gen", "group", "intl", "international",
  "enterprises", "enterprise", "foodstuff", "foodstuffs", "food", "foods", "stuff", "meat", "meats",
  "poultry", "sal", "factory", "factories", "products", "industries", "industry",
  "frozen", "fresh", "chilled", "uae", "dubai", "branch",
]);

/** "Hamid & Kumar Enterprises L.L.C." → "hamidkumar" */
export function supplierKey(name) {
  const words = String(name || "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/l\.\s*l\.\s*c\.?/g, " llc ")
    .replace(/[^a-z0-9؀-ۿ]+/g, " ")
    .split(" ")
    .filter(Boolean);
  const strict = words.filter((w) => !STOP.has(w)).join("");
  return strict.length >= 5 ? strict : words.filter((w) => !LEGAL.has(w)).join("");
}

/* An origin typed in the supplier box ("aus", "brazilian beef") is not a supplier. */
const ORIGINS =
  /^(aus|aust|austr|austral|australi|australia|australian|brazil|brazili|brazilian|brazilion|brazilaian|braz|india|indian|pakistan|pakistani|pk|sa|nz|newzealand|argentina|argentinian|uruguay|kenya|kenyan|ethiopia|ethiopian|sudan|sudanese|somalia|somali|southafrica|local|uae|oman|jordan|turkey|turkish|spain|spanish|holland|dutch|france|french|usa|american|ukraine|poland|georgia|armenia|djibouti|romania)(beef|lamb|mutton|veal|chicken)?$/;
export const looksLikeOrigin = (key) => ORIGINS.test(key);

/** A typed name may hold several suppliers: "GREEN VALLEY/KENZ ALMADAM". */
export function splitNames(raw) {
  return String(raw || "")
    .split(/\s*[/|+،,]\s*|\s+-\s+/)
    .map((x) => x.trim())
    .filter(Boolean);
}

function levenshtein(a, b) {
  if (a === b) return 0;
  const m = a.length;
  const n = b.length;
  if (!m || !n) return m || n;
  let prev = Array.from({ length: n + 1 }, (_, j) => j);
  for (let i = 1; i <= m; i += 1) {
    const cur = [i];
    for (let j = 1; j <= n; j += 1) {
      cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    }
    prev = cur;
  }
  return prev[n];
}

/** Same company? Exact key, one key the start of the other, or ~1 typo per 7 letters. */
export function sameSupplier(a, b) {
  if (!a || !b) return false;
  if (a === b) return true;
  const [short, long] = a.length <= b.length ? [a, b] : [b, a];
  if (short.length >= 5 && long.startsWith(short)) return true;
  if (short.length < 5) return false;
  return levenshtein(a, b) <= Math.max(1, Math.floor(long.length / 7));
}

/* ───────── server ───────── */

export async function fetchReceivingSuppliers(days = 365, signal) {
  const res = await fetch(`${API_BASE}/api/supplier-receiving?days=${days}`, {
    signal,
    cache: "no-store",
    headers: { Accept: "application/json" },
  });
  const json = await res.json().catch(() => null);
  if (!res.ok || !json?.ok) throw new Error(json?.error || `Receiving read failed (${res.status})`);
  return Array.isArray(json.suppliers) ? json.suppliers : [];
}

export async function fetchReceivingConfig(signal) {
  try {
    const res = await fetch(`${API_BASE}/api/reports?type=${RECEIVING_CONFIG_TYPE}&limit=5`, {
      signal,
      cache: "no-store",
      headers: { Accept: "application/json" },
    });
    if (!res.ok) return { ignored: [], aliases: {} };
    const json = await res.json().catch(() => null);
    const rows = Array.isArray(json) ? json : json?.data || json?.items || [];
    const row = rows.find((r) => String(r?.payload?.reportDate || "") === CONFIG_KEY) || rows[0];
    const p = row?.payload || {};
    return {
      ignored: Array.isArray(p.ignored) ? p.ignored : [],
      aliases: p.aliases && typeof p.aliases === "object" ? p.aliases : {},
    };
  } catch {
    return { ignored: [], aliases: {} };
  }
}

/** PUT upserts on (type, reportDate) — always one config row. */
export async function saveReceivingConfig(cfg, user = "") {
  const payload = {
    reportDate: CONFIG_KEY,
    ignored: Array.from(new Set(cfg.ignored || [])),
    aliases: cfg.aliases || {},
    updatedAt: new Date().toISOString(),
    updatedBy: user,
  };
  const res = await fetch(`${API_BASE}/api/reports`, {
    method: "PUT",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({ reporter: user || "supplier-receiving", type: RECEIVING_CONFIG_TYPE, payload }),
  });
  if (!res.ok) throw new Error((await res.text().catch(() => "")) || `Save failed (${res.status})`);
  return { ignored: payload.ignored, aliases: payload.aliases };
}

/* ───────── matching ───────── */

/** Our own company shows up in receiving as internal transfers — never a supplier to evaluate. */
export function looksInternal(key, ownNames = []) {
  if (!key) return true;
  if (/^trans(emirates|em|emi)?/.test(key) || key.includes("mawashi") || key.includes("مواشي")) return true;
  return ownNames.some((n) => {
    const k = supplierKey(n);
    return k && sameSupplier(k, key);
  });
}

/**
 * @param receiving  rows from fetchReceivingSuppliers
 * @param evaluated  [{ id, name }] — the evaluated suppliers
 * @param cfg        { ignored: [key], aliases: { receivingKey: evaluatedId } }
 * @returns {
 *   byEvaluated: { [evaluatedId]: { deliveries, lastDate, branches[], names[] } },
 *   unevaluated: [{ key, name, deliveries, lastDate, firstDate, branches[] }],  // most deliveries first
 *   ignored:     [{ key, name, deliveries, lastDate, branches[], auto }],
 * }
 */
export function matchReceiving(receiving, evaluated, cfg = {}, ownNames = []) {
  const ignoredSet = new Set(cfg.ignored || []);
  const aliases = cfg.aliases || {};
  const evalKeys = evaluated.map((e) => ({ ...e, key: supplierKey(e.name) })).filter((e) => e.key);

  const byEvaluated = {};
  const pending = new Map(); // key → aggregated unevaluated row
  const ignored = new Map();

  const add = (bucket, row, extra = {}) => {
    const cur = bucket || { deliveries: 0, lastDate: "", firstDate: "", branches: new Set(), names: new Set(), keys: new Set(), ...extra };
    cur.deliveries += Number(row.deliveries) || 0;
    if (row.last_date > cur.lastDate) cur.lastDate = row.last_date;
    if (!cur.firstDate || (row.first_date && row.first_date < cur.firstDate)) cur.firstDate = row.first_date || cur.firstDate;
    (row.branches || []).forEach((b) => cur.branches.add(b));
    cur.names.add(row.part);
    cur.keys.add(row.key);
    return cur;
  };

  (receiving || []).forEach((r) => {
    splitNames(r.supplier).forEach((part) => {
      const key = supplierKey(part);
      if (!key) return;
      const row = { ...r, part, key };
      if (aliases[key]) {
        byEvaluated[aliases[key]] = add(byEvaluated[aliases[key]], row);
        return;
      }
      // "FANTCO(FAISAL AL NUSIF)": the name in brackets is often the real one
      const inner = supplierKey((/\(([^)]+)\)/.exec(part) || [])[1] || "");
      const hit = evalKeys.find((e) => sameSupplier(e.key, key) || (inner && sameSupplier(e.key, inner)));
      if (hit) {
        byEvaluated[hit.id] = add(byEvaluated[hit.id], row);
        return;
      }
      const auto = looksInternal(key, ownNames) || looksLikeOrigin(key);
      if (ignoredSet.has(key) || auto) {
        ignored.set(key, add(ignored.get(key), row, { key, auto: auto && !ignoredSet.has(key) }));
        return;
      }
      // group spelling variants of the same unknown supplier together
      const known = Array.from(pending.keys()).find((k) => sameSupplier(k, key));
      pending.set(known || key, add(pending.get(known || key), row, { key: known || key }));
    });
  });

  const finish = (x) => ({
    ...x,
    branches: Array.from(x.branches).sort(),
    names: Array.from(x.names),
    keys: Array.from(x.keys),
    name: Array.from(x.names).sort((a, b) => b.length - a.length)[0] || x.key,
  });
  Object.keys(byEvaluated).forEach((id) => {
    byEvaluated[id] = finish(byEvaluated[id]);
  });
  return {
    byEvaluated,
    unevaluated: Array.from(pending.values()).map(finish).sort((a, b) => b.deliveries - a.deliveries),
    ignored: Array.from(ignored.values()).map(finish).sort((a, b) => b.deliveries - a.deliveries),
  };
}
