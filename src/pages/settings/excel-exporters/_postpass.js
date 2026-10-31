// src/pages/settings/excel-exporters/_postpass.js
// Post-passes run over every finished worksheet of the Al Mawashi backup, the
// same way linkifySheet does: all 130-odd exporters gain them from one place
// and none of them has to change.
//
//   typeSheetCells  — dates and numbers written as text become real Excel
//                     dates / numbers, so a column sorts, filters and sums
//                     (average temperature, total KG) instead of sorting
//                     "10" before "9".
//   autoFilterSheet — the main table of a sheet gets Excel's filter/sort row
//                     and a frozen header, unless the exporter set one itself.
//
// Neither changes what a cell SHOWS: a date keeps the dd/mm/yyyy the sheet
// printed, a number keeps its decimals. The layout still mirrors the View.

const ISO_DAY   = /^(\d{4})-(\d{2})-(\d{2})$/;
const ISO_STAMP = /^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})(?::(\d{2}))?/;
const DMY_DAY   = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/;
/* No leading zeros (item codes, phone numbers, document numbers keep their
   text), at most 9 integer digits (barcodes stay text), optional decimals. */
const NUMBER    = /^-?(?:0|[1-9]\d{0,8})(?:\.(\d{1,4}))?$/;

function utcDate(y, m, d, hh = 0, mm = 0, ss = 0) {
  const Y = Number(y), M = Number(m), D = Number(d);
  if (Y < 1990 || Y > 2100 || M < 1 || M > 12 || D < 1 || D > 31) return null;
  const dt = new Date(Date.UTC(Y, M - 1, D, Number(hh), Number(mm), Number(ss)));
  // 31/02 rolls into March — that is not a date, leave the text alone.
  if (dt.getUTCMonth() !== M - 1) return null;
  return dt;
}

/**
 * What a text cell really is: { value, numFmt } or null to leave it as text.
 * Exported for the scratch verification script.
 */
export function typedValue(text) {
  const s = String(text).trim();
  if (!s || s.length > 25) return null;

  let m = s.match(ISO_DAY);
  if (m) {
    const d = utcDate(m[1], m[2], m[3]);
    return d ? { value: d, numFmt: "dd/mm/yyyy" } : null;
  }
  m = s.match(DMY_DAY);
  if (m) {
    const d = utcDate(m[3], m[2], m[1]);
    return d ? { value: d, numFmt: "dd/mm/yyyy" } : null;
  }
  m = s.match(ISO_STAMP);
  if (m && s.length <= 25) {
    // A stored timestamp is UTC; show it in UAE time, which is what the screens show.
    const t = new Date(s);
    if (Number.isNaN(t.getTime())) return null;
    const uae = new Date(t.getTime() + 4 * 3600 * 1000);
    return { value: uae, numFmt: "dd/mm/yyyy hh:mm" };
  }
  m = s.match(NUMBER);
  if (m) {
    const n = Number(s);
    if (!Number.isFinite(n)) return null;
    const dec = m[1] ? m[1].length : 0;
    return { value: n, numFmt: dec ? `0.${"0".repeat(dec)}` : "0" };
  }
  return null;
}

/**
 * Turn date/number text into real cells. Header bands are included on
 * purpose ("Issue Date: 05/02/2020" lives in its own value cell).
 */
export function typeSheetCells(ws, maxRows = 20000) {
  try {
    ws.eachRow({ includeEmpty: false }, (row, n) => {
      if (n > maxRows) return;
      row.eachCell({ includeEmpty: false }, (cell) => {
        if (typeof cell.value !== "string") return;
        if (cell.isMerged && cell.master !== cell) return; // only the master holds the value
        const t = typedValue(cell.value);
        if (!t) return;
        cell.value = t.value;
        if (!cell.numFmt || cell.numFmt === "General") cell.numFmt = t.numFmt;
      });
    });
  } catch {
    /* Cosmetics never fail an export. */
  }
}

/* ─── Filter row on the main table ─── */

function argbOf(cell) {
  const f = cell?.fill;
  return f && f.type === "pattern" ? String(f.fgColor?.argb || "").slice(-6).toUpperCase() : "";
}
const HEAD_FILLS = new Set(["1E3A5F", "0F2A4A", "2D5A8E", "DBEAFE", "D9D9D9", "C0C0C0"]);

/** A table header row: 3+ filled, bold, un-merged cells side by side. */
function headerSpan(ws, rowNo, maxCol) {
  const row = ws.getRow(rowNo);
  let first = 0, last = 0, count = 0;
  for (let c = 1; c <= maxCol; c++) {
    const cell = row.getCell(c);
    const has = cell.value != null && String(cell.value).trim() !== "";
    const isHead = has && !cell.isMerged && cell.font?.bold && HEAD_FILLS.has(argbOf(cell));
    if (isHead) {
      if (!first) first = c;
      last = c;
      count++;
    } else if (first) {
      break; // the header must be one contiguous run
    }
  }
  return count >= 3 ? { first, last } : null;
}

/** How many data rows follow the header before the table ends. */
function dataRowsBelow(ws, headRow, first, last, lastRow) {
  let n = 0;
  for (let r = headRow + 1; r <= lastRow; r++) {
    const row = ws.getRow(r);
    let filled = 0, merged = false, bold = 0;
    for (let c = first; c <= last; c++) {
      const cell = row.getCell(c);
      if (cell.isMerged) merged = true;
      if (cell.value != null && String(cell.value).trim() !== "") {
        filled++;
        if (cell.font?.bold && HEAD_FILLS.has(argbOf(cell))) bold++;
      }
    }
    // A merged band (footer, "No data", next section) or the next header ends it.
    if (merged || filled === 0 || bold >= 3) break;
    n++;
  }
  return n;
}

/**
 * Give the largest table on the sheet Excel's filter/sort buttons. Sheets that
 * already carry an autoFilter (the registers) are left alone; a table that
 * contains merged cells is skipped, since Excel refuses to sort across them.
 */
export function autoFilterSheet(ws) {
  try {
    if (ws.autoFilter) return;
    const lastRow = Math.min(ws.rowCount || 0, 20000);
    const maxCol = Math.min(ws.columnCount || 0, 60);
    if (lastRow < 3 || maxCol < 3) return;

    let best = null;
    for (let r = 1; r <= lastRow; r++) {
      const span = headerSpan(ws, r, maxCol);
      if (!span) continue;
      const rows = dataRowsBelow(ws, r, span.first, span.last, lastRow);
      if (rows >= 2 && (!best || rows > best.rows)) best = { head: r, rows, ...span };
    }
    if (!best) return;

    ws.autoFilter = {
      from: { row: best.head, column: best.first },
      to:   { row: best.head + best.rows, column: best.last },
    };
    /* Freeze above the header only when the table is the bulk of the sheet;
       on a document with a small table halfway down, a frozen pane would
       pin half the screen. */
    if (best.rows >= 10 && best.head <= 20) {
      const v = (ws.views && ws.views[0]) || {};
      ws.views = [{ ...v, state: "frozen", ySplit: best.head, showGridLines: v.showGridLines ?? false }];
    }
  } catch {
    /* Cosmetics never fail an export. */
  }
}

/** Both passes, in the order that matters: types first, then the filter. */
export function enhanceSheet(ws) {
  typeSheetCells(ws);
  autoFilterSheet(ws);
}
