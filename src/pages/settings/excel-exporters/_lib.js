// src/pages/settings/excel-exporters/_lib.js
// Shared helpers used by every per-type Excel exporter.
// Each exporter receives (wb: ExcelJS.Workbook, record, ctx) and adds ONE worksheet.

/* ─── Color tokens (match Al Mawashi report styling) ─── */
export const COLORS = {
  NAVY:        "1E3A5F",
  NAVY_DARK:   "0F2A4A",
  NAVY_LIGHT:  "2D5A8E",
  SKY:         "DBEAFE",
  SKY_LIGHT:   "EFF6FF",
  GRAY_BAND_1: "C0C0C0",
  GRAY_BAND_2: "D6D6D6",
  GRAY_HEAD:   "D9D9D9",
  GRAY_LIGHT:  "F3F4F6",
  GRAY_ALT:    "F8FAFF",
  WHITE:       "FFFFFF",
  GREEN:       "166534",
  GREEN_BG:    "DCFCE7",
  RED:         "B91C1C",
  RED_BG:      "FEE2E2",
  AMBER:       "92400E",
  AMBER_BG:    "FEF3C7",
  TEXT:        "0F172A",
  TEXT_MUTED:  "6B7280",
};

/* ─── Border helpers ─── */
export const BORDER_BLACK = {
  top:    { style: "thin", color: { argb: "000000" } },
  left:   { style: "thin", color: { argb: "000000" } },
  bottom: { style: "thin", color: { argb: "000000" } },
  right:  { style: "thin", color: { argb: "000000" } },
};
export const BORDER_NAVY = {
  top:    { style: "thin", color: { argb: COLORS.NAVY } },
  left:   { style: "thin", color: { argb: COLORS.NAVY } },
  bottom: { style: "thin", color: { argb: COLORS.NAVY } },
  right:  { style: "thin", color: { argb: COLORS.NAVY } },
};

/* ─── Style factories ─── */
export const fillSolid = (argb) => ({ type: "pattern", pattern: "solid", fgColor: { argb } });
export const center = { horizontal: "center", vertical: "middle", wrapText: true };
export const left   = { horizontal: "left",   vertical: "middle", wrapText: true };

/* ─── Generic helpers ─── */
export const safe = (v) => (v == null ? "" : v);
export const isFilledRow = (r = {}) => Object.values(r).some((v) => String(v ?? "").trim() !== "");
export function formatDMY(iso) {
  if (!iso) return "";
  const s = String(iso);
  const m = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (m) return `${m[3]}/${m[2]}/${m[1]}`;
  return s;
}
export function extractDate(rec) {
  const p = rec?.payload || {};
  return (
    p.reportDate || p.date || p?.header?.reportEntryDate || p?.meta?.entryDate ||
    rec?.created_at?.slice(0, 10) || ""
  );
}
/* Excel forbids these in sheet names: * ? : \ / [ ] (plus 31-char limit) */
const EXCEL_FORBIDDEN = /[*?:\\/\[\]]/g;
export function sanitizeSheetName(name) {
  return String(name).replace(EXCEL_FORBIDDEN, "-").slice(0, 31).trim() || "Sheet";
}
export function sheetNameFor(idx, rec) {
  // Get just the YYYY-MM-DD portion of whatever date we found (strip time if any).
  const raw = String(extractDate(rec));
  const datePart = raw.split("T")[0].split(" ")[0];
  const md = datePart.length >= 10 ? datePart.slice(5, 10) : (datePart || "no-date");
  return sanitizeSheetName(`${String(idx + 1).padStart(4, "0")} ${md}`);
}

/* ─── Render an Al Mawashi document header band ─── */
/* Produces 3-column grid: [logo column | left labels/values | right labels/values]
 * Followed by gray "TRANS EMIRATES LIVESTOCK MEAT TRADING LLC" band and
 * a darker "report title" band. */
export function addDocHeader(ws, opts) {
  const {
    documentTitle = "",
    documentNo    = "",
    issueDate     = "",
    revisionNo    = "",
    area          = "",
    issuedBy      = "MOHAMAD ABDULLAH",
    controllingOfficer = "Quality Controller",
    approvedBy    = "Hussam O. Sarhan",
    company       = "TRANS EMIRATES LIVESTOCK MEAT TRADING LLC",
    reportTitle   = "",
    reportDate    = "",
    totalCols     = 12,
  } = opts || {};

  const NC = Math.max(totalCols, 6);
  const LOGO_W  = 2;
  const LEFT_W  = Math.floor((NC - LOGO_W) / 2);
  const RIGHT_W = NC - LOGO_W - LEFT_W;

  let r = ws.lastRow ? ws.lastRow.number + 1 : 1;

  /* Header grid: 4 rows × 3 column blocks */
  const rows = [
    [["Document Title:", documentTitle], ["Document No:",  documentNo]],
    [["Issue Date:",     issueDate    ], ["Revision No:",  revisionNo]],
    [["Area:",           area         ], ["Issued By:",    issuedBy]],
    [["Controlling Officer:", controllingOfficer], ["Approved By:", approvedBy]],
  ];

  // Merge logo column across 4 rows
  ws.mergeCells(r, 1, r + 3, LOGO_W);
  const logoCell = ws.getCell(r, 1);
  logoCell.value = "AL MAWASHI";
  logoCell.alignment = { horizontal: "center", vertical: "middle" };
  logoCell.font = { bold: true, size: 14, color: { argb: COLORS.NAVY } };
  logoCell.fill = fillSolid(COLORS.SKY_LIGHT);
  logoCell.border = BORDER_BLACK;

  rows.forEach((rowPair, i) => {
    const rowIdx = r + i;
    // Left pair
    const lLabelCol = LOGO_W + 1;
    const lValueCol = LOGO_W + 2;
    const lValueEnd = LOGO_W + LEFT_W;
    ws.getCell(rowIdx, lLabelCol).value = rowPair[0][0];
    ws.getCell(rowIdx, lLabelCol).font = { bold: true };
    ws.getCell(rowIdx, lLabelCol).border = BORDER_BLACK;
    ws.getCell(rowIdx, lLabelCol).alignment = left;
    if (lValueEnd > lValueCol) ws.mergeCells(rowIdx, lValueCol, rowIdx, lValueEnd);
    ws.getCell(rowIdx, lValueCol).value = rowPair[0][1];
    ws.getCell(rowIdx, lValueCol).border = BORDER_BLACK;
    ws.getCell(rowIdx, lValueCol).alignment = left;
    // Right pair
    const rLabelCol = LOGO_W + LEFT_W + 1;
    const rValueCol = LOGO_W + LEFT_W + 2;
    const rValueEnd = NC;
    ws.getCell(rowIdx, rLabelCol).value = rowPair[1][0];
    ws.getCell(rowIdx, rLabelCol).font = { bold: true };
    ws.getCell(rowIdx, rLabelCol).border = BORDER_BLACK;
    ws.getCell(rowIdx, rLabelCol).alignment = left;
    if (rValueEnd > rValueCol) ws.mergeCells(rowIdx, rValueCol, rowIdx, rValueEnd);
    ws.getCell(rowIdx, rValueCol).value = rowPair[1][1];
    ws.getCell(rowIdx, rValueCol).border = BORDER_BLACK;
    ws.getCell(rowIdx, rValueCol).alignment = left;
    ws.getRow(rowIdx).height = 18;
  });

  r += 4;

  /* Company band */
  ws.mergeCells(r, 1, r, NC);
  const co = ws.getCell(r, 1);
  co.value = company;
  co.alignment = center;
  co.font = { bold: true, size: 12, color: { argb: COLORS.TEXT } };
  co.fill = fillSolid(COLORS.GRAY_BAND_1);
  co.border = BORDER_BLACK;
  ws.getRow(r).height = 22;
  r++;

  /* Report title band */
  if (reportTitle) {
    ws.mergeCells(r, 1, r, NC);
    const t = ws.getCell(r, 1);
    t.value = reportTitle;
    t.alignment = center;
    t.font = { bold: true, size: 13, color: { argb: COLORS.TEXT } };
    t.fill = fillSolid(COLORS.GRAY_BAND_2);
    t.border = BORDER_BLACK;
    ws.getRow(r).height = 24;
    r++;
  }

  /* Report date row (if provided) */
  if (reportDate) {
    ws.mergeCells(r, 1, r, NC);
    const d = ws.getCell(r, 1);
    d.value = `Report Date:  ${reportDate}`;
    d.alignment = { horizontal: "left", vertical: "middle", indent: 1 };
    d.font = { bold: true, size: 11 };
    d.fill = fillSolid(COLORS.GRAY_LIGHT);
    d.border = BORDER_BLACK;
    ws.getRow(r).height = 20;
    r++;
  }

  return r; // next available row
}

/* ─── Add a notes block (e.g. "1. If temp +5°C or more …") ─── */
export function addNotesBlock(ws, lines, totalCols) {
  let r = ws.lastRow ? ws.lastRow.number + 1 : 1;
  const NC = Math.max(totalCols, 4);
  lines.forEach((ln) => {
    ws.mergeCells(r, 1, r, NC);
    const c = ws.getCell(r, 1);
    c.value = ln;
    c.alignment = { horizontal: "left", vertical: "middle", indent: 1, wrapText: true };
    c.font = { size: 10 };
    c.border = BORDER_BLACK;
    ws.getRow(r).height = 18;
    r++;
  });
  return r;
}

/* ─── Footer block: Verified by / Checked by ─── */
export function addFooter(ws, opts, totalCols) {
  const { verifiedBy = "", checkedBy = "", revDate = "", revNo = "" } = opts || {};
  const NC = Math.max(totalCols, 4);
  let r = ws.lastRow ? ws.lastRow.number + 2 : 1; // leave a blank row above

  const entries = [
    ["Checked by:",  checkedBy],
    ["Verified by:", verifiedBy],
  ];
  if (revDate) entries.push(["Rev. Date:", revDate]);
  if (revNo)   entries.push(["Rev. No:",   revNo]);

  const cellsPer = Math.max(1, Math.floor(NC / entries.length));
  entries.forEach(([label, val], i) => {
    const c1 = i * cellsPer + 1;
    const c2 = i === entries.length - 1 ? NC : (i + 1) * cellsPer;
    ws.mergeCells(r, c1, r, c2);
    const cell = ws.getCell(r, c1);
    cell.value = `${label} ${val || ""}`;
    cell.alignment = { horizontal: "left", vertical: "middle", indent: 1 };
    cell.font = { bold: true, size: 11 };
    cell.fill = fillSolid(COLORS.GRAY_LIGHT);
    cell.border = BORDER_BLACK;
  });
  ws.getRow(r).height = 26;
  return r + 1;
}

/* ─── Helper: render a single horizontal table ─── */
/* cols: [{ key, label, width? }]  rows: [object]  opts: { headFill, rowAltFill, accent } */
export function addTable(ws, cols, rows, opts = {}) {
  const headFill   = opts.headFill   || COLORS.SKY;
  const headColor  = opts.headColor  || COLORS.NAVY;
  const altFill    = opts.altFill    || COLORS.GRAY_ALT;
  let r = ws.lastRow ? ws.lastRow.number + 1 : 1;

  cols.forEach((col, ci) => {
    const c = ws.getCell(r, ci + 1);
    c.value = col.label;
    c.font = { bold: true, color: { argb: headColor }, size: 11 };
    c.fill = fillSolid(headFill);
    c.alignment = center;
    c.border = BORDER_BLACK;
  });
  ws.getRow(r).height = opts.headHeight || 28;
  r++;

  if (!rows.length) {
    const c = ws.getCell(r, 1);
    c.value = "— No data —";
    c.alignment = center;
    c.font = { italic: true, color: { argb: COLORS.TEXT_MUTED } };
    if (cols.length > 1) ws.mergeCells(r, 1, r, cols.length);
    c.border = BORDER_BLACK;
    ws.getRow(r).height = 20;
    return r + 1;
  }

  rows.forEach((row, ri) => {
    const bg = ri % 2 === 0 ? COLORS.WHITE : altFill;
    cols.forEach((col, ci) => {
      let val = row[col.key];
      const c = ws.getCell(r, ci + 1);
      if (val === true)  val = "✓";
      if (val === false) val = "✗";
      c.value = val == null ? "" : val;
      c.alignment = col.align ? { ...center, horizontal: col.align } : center;
      c.font = { size: 10 };
      c.fill = fillSolid(bg);
      c.border = BORDER_BLACK;
      // Status coloring
      const s = String(val ?? "").trim();
      if (s === "√" || /^(pass|ok|yes|good|satisfactory)$/i.test(s)) {
        c.font = { bold: true, color: { argb: COLORS.GREEN } };
        c.fill = fillSolid(COLORS.GREEN_BG);
      } else if (s === "✗" || /^(fail|no|bad|unsatisfactory|reject)$/i.test(s)) {
        c.font = { bold: true, color: { argb: COLORS.RED } };
        c.fill = fillSolid(COLORS.RED_BG);
      }
    });
    ws.getRow(r).height = opts.rowHeight || 20;
    r++;
  });

  return r;
}

/* ─── Set column widths from a [{key,width}] spec ─── */
export function setColumns(ws, cols) {
  ws.columns = cols.map((c) => ({ key: c.key, width: c.width || 14 }));
}

/* ─── Apply page setup (landscape, fit width) ─── */
export function pageSetupLandscape(ws) {
  ws.views = [{ showGridLines: false }];
  ws.pageSetup = {
    paperSize: 9, orientation: "landscape",
    fitToPage: true, fitToWidth: 1, fitToHeight: 0,
    margins: { left: 0.4, right: 0.4, top: 0.4, bottom: 0.4, header: 0.2, footer: 0.2 },
  };
}
export function pageSetupPortrait(ws) {
  ws.views = [{ showGridLines: false }];
  ws.pageSetup = {
    paperSize: 9, orientation: "portrait",
    fitToPage: true, fitToWidth: 1, fitToHeight: 0,
    margins: { left: 0.4, right: 0.4, top: 0.4, bottom: 0.4, header: 0.2, footer: 0.2 },
  };
}

/* ─── Display helper for arbitrary values (text-safe, no [object Object]) ─── */
export function display(v) {
  if (v == null || v === "") return "";
  if (typeof v === "boolean") return v ? "✓" : "✗";
  if (typeof v === "number") return v;
  if (typeof v === "string") return v;
  if (Array.isArray(v)) {
    return v.map((x) => (typeof x === "object" && x !== null
      ? Object.entries(x).map(([k, vv]) => `${k}: ${vv ?? ""}`).join(" | ")
      : String(x ?? ""))).join("\n");
  }
  if (typeof v === "object") {
    return Object.entries(v).map(([k, vv]) => `${k}: ${vv ?? ""}`).join("\n");
  }
  return String(v);
}

/* ─── Prettify a snake_case or camelCase key ─── */
export function prettifyKey(key) {
  return String(key)
    .replace(/_/g, " ")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .trim();
}
