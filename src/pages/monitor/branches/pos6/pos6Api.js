// src/pages/monitor/branches/pos6/pos6Api.js
// One place for the POS 6 report types and the save path every form uses.

import { useCallback, useState } from "react";
import API_BASE from "../../../../config/api";
import { invalidateReportIndex } from "../_shared/useReportIndex";

export const BRANCH = "POS 6";
export const REPORTER = "pos6";

export const TYPES = {
  personalHygiene:     "pos6_personal_hygiene",
  cleaningChecklist:   "pos6_cleaning_checklist",
  equipmentInspection: "pos6_equipment_inspection",
  receivingLog:        "pos6_receiving_log_butchery",
  coolers:             "pos6_coolers_temperature",
};

/* Document control per sheet — the numbers printed in the paper form's header.
   The input screens used to carry them as literals, so the View tab (and the
   Excel backup built from the same payload) had no way to name the document a
   record belongs to: on screen the sheet said "FS-QM/REC/PH", in the archive it
   said nothing. One table, read by the input header AND the viewer, keeps the
   two spellings from drifting apart. The two sheets whose ref the branch can
   edit (equipment, receiving) still store the edited value in `payload.formRef`
   and that wins on the viewer. */
export const DOCS = {
  [TYPES.personalHygiene]:     { documentNo: "FS-QM/REC/PH", issueDate: "05/02/2020", revision: "0" },
  [TYPES.cleaningChecklist]:   { documentNo: "FF-QM/REC/CC", issueDate: "05/02/2020", revision: "0" },
  [TYPES.equipmentInspection]: { documentNo: "FSMS/BR/F17",  issueDate: "05/02/2020", revision: "0" },
  [TYPES.receivingLog]:        { documentNo: "FSMS/BR/F01A", issueDate: "05/02/2020", revision: "0" },
  [TYPES.coolers]:             { documentNo: "FSMS/BR/F04",  issueDate: "05/02/2020", revision: "0" },
};

/* The sanitizing rounds on the equipment sheet. The input writes the KEYS into
   `payload.slots` and the viewer has to turn them back into the times a reader
   recognises, so the pair lives here rather than being spelled out twice. A
   record that carries a round this list does not know still renders — the
   viewer falls back to the raw key as its heading. */
export const EQUIPMENT_SLOTS = [
  { key: "s_8_9_AM",  label: "8–9 AM" },
  { key: "s_12_1_PM", label: "12–1 PM" },
  { key: "s_4_5_PM",  label: "4–5 PM" },
  { key: "s_8_9_PM",  label: "8–9 PM" },
  { key: "s_12_1_AM", label: "12–1 AM" },
];

export const equipmentSlotLabel = (key) =>
  EQUIPMENT_SLOTS.find((s) => s.key === key)?.label || String(key || "");

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
 *
 * `match` picks among a day's records for the sheets that can have more than
 * one — the receiving log files one sheet per delivery, so re-saving the same
 * delivery must update it while a different delivery on the same day becomes
 * its own record. Without a matcher the first record of the day wins, which is
 * what the one-sheet-a-day forms want.
 */
async function findExisting(type, reportDate, match) {
  // `?reportDate=` is answered with LIMIT 1 — the newest sheet of the day and
  // nothing else. That is exactly what the one-sheet-a-day forms want, but a
  // matcher needs to see ALL of the day's records: with only the newest on
  // hand, re-saving the FIRST delivery of a busy day never found its own row
  // and filed a duplicate instead. `?from=&to=` on the same business date
  // returns every record of that day, so the matcher can do its job.
  const qs = typeof match === "function"
    ? new URLSearchParams({ type, from: reportDate, to: reportDate })
    : new URLSearchParams({ type, reportDate });
  const res = await fetch(`${API_BASE}/api/reports?${qs}`, { cache: "no-store" });
  if (!res.ok) return null;
  const json = await res.json().catch(() => null);
  const rows = Array.isArray(json) ? json : json?.data ?? json?.items ?? [];
  if (typeof match !== "function") return rows[0] || null;
  return rows.find((r) => { try { return match(r?.payload || {}); } catch { return false; } }) || null;
}

/**
 * Save a POS 6 form. Most of these are one-record-per-day sheets, so a second
 * save of the same day updates that record instead of filing a duplicate — done
 * via PUT /api/reports/:id, never the generic PUT, which matches on
 * (type, reportDate) and would collapse other records sharing the date.
 *
 * @param {object} [opts]
 * @param {function} [opts.match] payload → boolean; identifies which of the
 *   day's records this save belongs to (see findExisting).
 */
export function useSaveReport() {
  const [saving, setSaving] = useState(false);
  const [opMsg, setOpMsg] = useState("");

  const save = useCallback(async (type, payload, opts = {}) => {
    const body = { ...payload, savedAt: Date.now() };
    if (!body.reportDate) {
      setOpMsg("❌ reportDate is required");
      return false;
    }
    setSaving(true);
    setOpMsg("⏳");
    try {
      const existing = await findExisting(type, body.reportDate, opts.match);
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
      // The viewer keeps a short-lived index per type; the sheet just changed,
      // so drop it or the View tab would show the pre-save version.
      invalidateReportIndex(type);
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
