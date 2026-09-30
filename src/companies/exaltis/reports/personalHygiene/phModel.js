// src/companies/exaltis/reports/personalHygiene/phModel.js
// Personal Hygiene — defaults, columns and row helpers.
// (Split out of PersonalHygieneTab.js — the code is unchanged.)
import API_BASE from "../../../../config/api";

export const IS_SAME_ORIGIN = (() => {
  try {
    return new URL(API_BASE).origin === window.location.origin;
  } catch {
    return false;
  }
})();

/* ---- Fallbacks ---- */
export const LOGO_FALLBACK = "data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==";

export const MIN_ROWS_FALLBACK = 21;

/* new Date().toISOString() is UTC — a UAE user (UTC+4) opening this tab
   between local midnight and ~4am would silently default to "yesterday". */
export function todayDubaiISO() {
  try {
    return new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Dubai" });
  } catch {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  }
}

export const defaultPHHeader = {
  documentTitle: "",
  documentNo: "",
  issueDate: "",
  revisionNo: "",
  area: "",
  issuedBy: "",
  controllingOfficer: "",
  approvedBy: "",
};

export const DEFAULT_SIGN_NAME = "";

export const defaultPHFooter = {
  checkedBy: DEFAULT_SIGN_NAME,
  verifiedBy: DEFAULT_SIGN_NAME,
};

/* ---- Table config ---- */
export const COLUMNS = [
  { key: "nails", label: "Nails" },
  { key: "hair", label: "Hair" },
  { key: "notWearingJewelries", label: "Not wearing Jewelry" },
  { key: "wearingCleanCloth", label: "Wearing Clean Cloth / Hair Net / Hand Glove / Face masks / Shoe" },
  { key: "communicableDisease", label: "Communicable Disease" },
  { key: "openWounds", label: "Open wounds/sores & cut" },
];

/* ---- Helpers ---- */
export function makeEmptyRow(name = "", employeeNo = "", active = false) {
  const row = { employeeNo, employName: name, remarks: "" };
  COLUMNS.forEach((c) => {
    row[c.key] = active ? "C" : "";
  });
  return row;
}

export const isBlankRow = (r) =>
  !String(r?.employName || "").trim() &&
  !String(r?.employeeNo || "").trim() &&
  !String(r?.remarks || "").trim() &&
  COLUMNS.every((c) => !String(r?.[c.key] || "").trim());

/** Rows for the whole staff directory, padded out to `min` blank rows. */
export function makeRowsFromStaff(staff, min = MIN_ROWS_FALLBACK) {
  const rows = (Array.isArray(staff) ? staff : []).map((s) => makeEmptyRow(s.name, s.empNo, true));
  while (rows.length < min) rows.push(makeEmptyRow("", "", false));
  return rows;
}

/** Normalises rows coming back from a saved report (older ones have no empNo). */
export function adoptRows(raw, min = MIN_ROWS_FALLBACK) {
  const list = Array.isArray(raw) ? raw : [];
  const rows = list.map((r) => {
    const row = makeEmptyRow(
      String(r?.employName ?? r?.employeeName ?? ""),
      String(r?.employeeNo ?? r?.empNo ?? ""),
      false
    );
    COLUMNS.forEach((c) => {
      row[c.key] = String(r?.[c.key] ?? "");
    });
    row.remarks = String(r?.remarks ?? "");
    return row;
  });
  while (rows.length < min) rows.push(makeEmptyRow("", "", false));
  return rows;
}

/* =========================
   Server helpers (PH only)
========================= */
export const PH_TYPE = "sweets-ph";
