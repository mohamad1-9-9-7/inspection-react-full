// src/pages/haccp and iso/Kitchen/MenuNutrition/syncPlan.js
// Reconcile the live catalogue against MENU_ROWS (the master menu table).
//
// Seeding alone is not enough: after the master table is edited, the database
// can hold rows that no longer exist in it, and rows whose descriptive fields
// went stale. This builds an explicit add / update / remove plan so the user
// sees exactly what will change before anything is written.

import { SEED_ITEMS } from "./menuData";
import { itemStatus } from "./nutritionCalc";

/**
 * Fields the master table owns. A sync may overwrite these, and never touches
 * per-100 g values, documentation, ingredients, notes or the calculation
 * snapshots — those belong to the user.
 */
export const MASTER_FIELDS = [
  "section",
  "day",
  "order",
  "nameEn",
  "nameAr",
  "servedWith",
  "servedWithAr",
  "weightRaw",
];

const norm = (v) => (v === null || v === undefined ? "" : String(v).trim());

/**
 * @param {Array} items current catalogue (from the server)
 * @param {Array} [seed] master rows; defaults to SEED_ITEMS
 * @returns {{ matched: number,
 *             toAdd: Array,
 *             toUpdate: Array<{item: Object, seed: Object, diffs: Array}>,
 *             orphans: Array<{item: Object, hasData: boolean}>,
 *             inSync: boolean }}
 */
export function buildSyncPlan(items, seed = SEED_ITEMS) {
  const byCode = new Map((items || []).map((it) => [it.code, it]));
  const seedCodes = new Set(seed.map((s) => s.code));

  const toAdd = seed.filter((s) => !byCode.has(s.code));

  const toUpdate = [];
  let matched = 0;
  for (const s of seed) {
    const cur = byCode.get(s.code);
    if (!cur) continue;
    matched += 1;
    const diffs = MASTER_FIELDS.filter((f) => norm(cur[f]) !== norm(s[f])).map((f) => ({
      field: f,
      from: norm(cur[f]),
      to: norm(s[f]),
    }));
    if (diffs.length) toUpdate.push({ item: cur, seed: s, diffs });
  }

  // Rows in the database that the master table no longer contains. Anything the
  // user typed values into is kept selected-off by default — it may be a dish
  // they added on purpose.
  const orphans = (items || [])
    .filter((it) => !seedCodes.has(it.code))
    .map((it) => ({ item: it, hasData: itemStatus(it).filled > 0 }));

  return {
    matched,
    toAdd,
    toUpdate,
    orphans,
    // Extra rows are not a problem in themselves — a dish added by hand is a
    // legitimate extra. Only missing and stale rows mean the catalogue is behind.
    inSync: !toAdd.length && !toUpdate.length,
  };
}

/** Merge the master-owned fields into an existing record. */
export function applyMasterFields(item, seedRow) {
  const next = { ...item };
  for (const f of MASTER_FIELDS) next[f] = seedRow[f];
  return next;
}

/** Codes that should be pre-selected for deletion (orphans with no data). */
export function defaultOrphanSelection(orphans) {
  return new Set(orphans.filter((o) => !o.hasData).map((o) => o.item.code));
}
