// src/utils/dailyLogs.js
// The daily logs every site must file — ONE list, read by the KPI page
// (compliance %) and the home dashboard ("filed today" on the Daily Monitor
// card). Three logs per site: temperature · personal hygiene · cleaning.
// Weekly / monthly / on-demand forms are not here: they are not daily.
//
// `id` is the catalogue id (reportTypeCatalog BRANCHES); `perm` is the same
// branch as the permissions name it (allowedBranches lists).

export const DAILY_LOG_BRANCHES = [
  { id: "QCS",        perm: "QCS",        types: [["qcs-coolers", "temp"], ["qcs-ph", "hyg"], ["qcs-clean", "clean"]] },
  { id: "POS6",       perm: "POS 6",      types: [["pos6_coolers_temperature", "temp"], ["pos6_personal_hygiene", "hyg"], ["pos6_cleaning_checklist", "clean"]] },
  { id: "POS10",      perm: "POS 10",     types: [["pos10_temperature", "temp"], ["pos10_personal_hygiene", "hyg"], ["pos10_daily_cleanliness", "clean"]] },
  { id: "POS11",      perm: "POS 11",     types: [["pos11_temperature", "temp"], ["pos11_personal_hygiene", "hyg"], ["pos11_daily_cleanliness", "clean"]] },
  { id: "POS15",      perm: "POS 15",     types: [["pos15_temperature", "temp"], ["pos15_personal_hygiene", "hyg"], ["pos15_daily_cleanliness", "clean"]] },
  { id: "POS19",      perm: "POS 19",     types: [["pos19_temperature_monitoring", "temp"], ["pos19_personal_hygiene", "hyg"], ["pos19_daily_cleaning", "clean"]] },
  { id: "PRODUCTION", perm: "PRODUCTION", types: [["prod_personal_hygiene", "hyg"], ["prod_cleaning_checklist", "clean"]] },
  { id: "FTR1",       perm: "FTR 1",      types: [["ftr1_temperature", "temp"], ["ftr1_personal_hygiene", "hyg"], ["ftr1_daily_cleanliness", "clean"]] },
  { id: "FTR2",       perm: "FTR 2",      types: [["ftr2_temperature", "temp"], ["ftr2_personal_hygiene", "hyg"], ["ftr2_daily_cleanliness", "clean"]] },
];

/** Today's date in Dubai, YYYY-MM-DD — the business day the server counts by. */
export function todayDubai() {
  try { return new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Dubai" }); }
  catch { return new Date().toISOString().slice(0, 10); }
}

export function addDays(iso, n) {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}
