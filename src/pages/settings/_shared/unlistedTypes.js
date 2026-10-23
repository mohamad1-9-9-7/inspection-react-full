// src/pages/settings/_shared/unlistedTypes.js
// 🗃️ Safety net for the backups: report types that hold data on the server
// but are missing from reportTypeCatalog.js.
//
// The catalog is the only list the backups walk, so a type nobody added there
// was silently left out of every backup (Oct 2026 audit: branch certificates,
// the QCS brand/origin/shipment-type lookups and a few old single records).
// `GET /api/reports/summary` already returns every type that has rows for the
// caller's company, with counts, in one query — whatever it names that the
// catalog does not know lands in an "Other (unlisted types)" folder, so the
// backup covers the database even when the catalog falls behind.

import API_BASE from "../../../config/api";
import { describeReportType, isKnownType, UNLISTED_CARD_ID } from "../reportTypeCatalog";

export const UNLISTED_BRANCH_ID = "UNLISTED";

/**
 * Types with data on the server that the catalog does not list.
 * Never throws — an old server or a failed request just means no extras.
 * @returns {Promise<Array<{type: string, label: string, count: number}>>}
 */
export async function fetchUnlistedTypes() {
  try {
    const res = await fetch(`${API_BASE}/api/reports/summary`, { cache: "no-store" });
    if (!res.ok) return [];
    const json = await res.json().catch(() => null);
    const rows = Array.isArray(json) ? json : json?.data || [];
    return rows
      .filter((r) => r?.type && Number(r.count) > 0 && !isKnownType(r.type))
      .map((r) => ({ type: String(r.type), label: describeReportType(r.type).label, count: Number(r.count) }))
      .sort((a, b) => a.label.localeCompare(b.label));
  } catch {
    return [];
  }
}

/** The unlisted types as a catalog-shaped branch, so the backup tree,
    folder paths and file numbering treat it like any other branch. */
export function unlistedBranch(list) {
  if (!list || !list.length) return null;
  return {
    id: UNLISTED_BRANCH_ID,
    card: UNLISTED_CARD_ID,
    label: "Other (unlisted types)",
    emoji: "🗃️",
    accent: "#64748b",
    types: list.map(({ type, label }) => [type, `${label} (${type})`]),
  };
}
