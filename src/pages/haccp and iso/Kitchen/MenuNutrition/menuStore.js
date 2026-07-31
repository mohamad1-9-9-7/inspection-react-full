// src/pages/haccp and iso/Kitchen/MenuNutrition/menuStore.js
// Server access for the menu nutrition catalogue.
// One /api/reports record per menu item — the server is the source of truth.

import API_BASE from "../../../../config/api";
import { EMPTY_ITEM, sortItems } from "./menuData";

export const TYPE = "kitchen_menu_nutrition_item";

/** Postgres exposes `id`, the legacy Mongo layer exposed `_id`. */
export function recId(rec) {
  return rec?.id ?? rec?._id ?? null;
}

/** Flatten a report record into a UI item object. */
function toItem(rec) {
  const p = rec?.payload || {};
  return {
    ...EMPTY_ITEM,
    ...p,
    per100: p.per100 || {},
    doc: { ...EMPTY_ITEM.doc, ...(p.doc || {}) },
    serverId: recId(rec),
  };
}

/** Load the whole catalogue, sorted for display. */
export async function loadItems() {
  const res = await fetch(`${API_BASE}/api/reports?type=${encodeURIComponent(TYPE)}`, {
    cache: "no-store",
  });
  const json = await res.json().catch(() => null);
  const arr = Array.isArray(json) ? json : json?.data || json?.items || [];
  return sortItems(arr.map(toItem));
}

/**
 * Create or update one item.
 * New items POST; existing ones PUT /api/reports/:id — never the generic PUT,
 * which upserts by (type, reportDate) and would collapse the catalogue.
 */
export async function saveItem(item, reporter = "admin") {
  const { serverId, ...rest } = item;
  const payload = { ...rest, savedAt: Date.now() };

  const url = serverId
    ? `${API_BASE}/api/reports/${encodeURIComponent(serverId)}`
    : `${API_BASE}/api/reports`;

  const res = await fetch(url, {
    method: serverId ? "PUT" : "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ reporter, type: TYPE, payload }),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);

  const json = await res.json().catch(() => null);
  return recId(json) || recId(json?.data) || serverId;
}

export async function deleteItem(serverId) {
  const res = await fetch(`${API_BASE}/api/reports/${encodeURIComponent(serverId)}`, {
    method: "DELETE",
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
}

/** Insert several items sequentially (used by seeding / Excel import). */
export async function createMany(items, reporter = "admin") {
  let created = 0;
  for (const item of items) {
    // eslint-disable-next-line no-await-in-loop
    await saveItem({ ...item, serverId: null }, reporter);
    created += 1;
  }
  return created;
}
