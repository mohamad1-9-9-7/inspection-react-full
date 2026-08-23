// src/pages/monitor/branches/pos6/pos6Api.js
// One place for the POS 6 report types and the save path every form uses.

import { useCallback, useState } from "react";
import API_BASE from "../../../../config/api";

export const BRANCH = "POS 6";
export const REPORTER = "pos6";

export const TYPES = {
  personalHygiene:     "pos6_personal_hygiene",
  cleaningChecklist:   "pos6_cleaning_checklist",
  equipmentInspection: "pos6_equipment_inspection",
  receivingLog:        "pos6_receiving_log_butchery",
  coolers:             "pos6_coolers_temperature",
};

/** Today in the branch's own timezone, as YYYY-MM-DD. */
export function todayISO() {
  try {
    return new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Dubai" });
  } catch {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
      d.getDate()
    ).padStart(2, "0")}`;
  }
}

/**
 * Find the record already filed for this type+date, if any.
 * `reportDate=` is a targeted read on the server (it resolves the same business
 * date the record was stored under), so this costs one indexed row — not the
 * whole table the way an unfiltered `?type=` read would.
 */
async function findExisting(type, reportDate) {
  const qs = new URLSearchParams({ type, reportDate });
  const res = await fetch(`${API_BASE}/api/reports?${qs}`, { cache: "no-store" });
  if (!res.ok) return null;
  const json = await res.json().catch(() => null);
  const rows = Array.isArray(json) ? json : json?.data ?? json?.items ?? [];
  return rows[0] || null;
}

/**
 * Save a POS 6 form. These are one-record-per-day sheets, so a second save of
 * the same day updates that record instead of filing a duplicate — done via
 * PUT /api/reports/:id, never the generic PUT, which matches on
 * (type, reportDate) and would collapse other records sharing the date.
 */
export function useSaveReport() {
  const [saving, setSaving] = useState(false);
  const [opMsg, setOpMsg] = useState("");

  const save = useCallback(async (type, payload) => {
    const body = { ...payload, savedAt: Date.now() };
    if (!body.reportDate) {
      setOpMsg("❌ reportDate is required");
      return false;
    }
    setSaving(true);
    setOpMsg("⏳");
    try {
      const existing = await findExisting(type, body.reportDate);
      const id = existing?.id ?? existing?._id;
      const res = await fetch(
        id ? `${API_BASE}/api/reports/${encodeURIComponent(id)}` : `${API_BASE}/api/reports`,
        {
          method: id ? "PUT" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ reporter: REPORTER, type, payload: body }),
        }
      );
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setOpMsg("✅");
      return true;
    } catch (e) {
      console.error("[POS 6] save failed:", e);
      setOpMsg("❌ " + (e?.message || e));
      return false;
    } finally {
      setSaving(false);
      setTimeout(() => setOpMsg(""), 4000);
    }
  }, []);

  return { saving, opMsg, save };
}
