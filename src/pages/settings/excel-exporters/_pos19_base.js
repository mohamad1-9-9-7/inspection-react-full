// src/pages/settings/excel-exporters/_pos19_base.js
// Shared builder for POS 19 reports — matches the styling used across the
// pos19/view pos 19/ exportXLSX functions (navy borders, sky headers).

import {
  COLORS, fillSolid, center, left,
  addDocHeader, addFooter, formatDMY, extractDate,
  pageSetupLandscape,
} from "./_lib";

const BORDER_NAVY = {
  top:    { style: "thin", color: { argb: "1F3B70" } },
  left:   { style: "thin", color: { argb: "1F3B70" } },
  bottom: { style: "thin", color: { argb: "1F3B70" } },
  right:  { style: "thin", color: { argb: "1F3B70" } },
};

const safe = (v) => v ?? "";

/**
 * Build a POS 19 sheet.
 *
 * @param {Workbook} wb
 * @param {Object}   record - DB record { id, payload, ... }
 * @param {Object}   ctx    - { sheetName, branchLabel, typeKey, typeLabel }
 * @param {Object}   opts   - per-type configuration
 *   {
 *     title:    string          // "Cooking Temperature Monitoring Record"
 *     formRef:  string          // "FSM-QM/REC/CR"
 *     subtitle: string?         // optional extra info line under the title
 *     columns:  [{ key, label, width? }]   // column definitions
 *     getRows:  (payload) => array<object>      // extract rows from payload
 *     rowFilter?: (row) => boolean              // optional skip filter
 *     cellWarn?:  ({ value, key, row }) => "red" | undefined  // color hints
 *     extraFooter?: (payload) => { checkedBy, verifiedBy, revDate, revNo }
 *   }
 */
export async function buildPos19Sheet(wb, record, ctx, opts) {
  const { sheetName } = ctx;
  const p = record?.payload || {};
  const rowsRaw = (typeof opts.getRows === "function" ? opts.getRows(p) : (p.entries || []));
  const rows = opts.rowFilter ? rowsRaw.filter(opts.rowFilter) : rowsRaw;

  const NC = Math.max(opts.columns.length, 4);
  const ws = wb.addWorksheet(sheetName, { views: [{ showGridLines: false }] });
  pageSetupLandscape(ws);
  ws.columns = opts.columns.map((c) => ({ width: c.width || 14 }));

  /* ─── Doc header ─── */
  addDocHeader(ws, {
    documentTitle: opts.title,
    documentNo:    opts.formRef,
    issueDate:     "05/02/2020",
    revisionNo:    "0",
    area:          p.area || "POS 19",
    issuedBy:      "MOHAMAD ABDULLAH",
    controllingOfficer: "Quality Controller",
    approvedBy:    "Hussam O. Sarhan",
    company:       "AL MAWASHI — BRAAI RESTAURANT LLC",
    reportTitle:   `POS 19  ·  ${opts.title.toUpperCase()}`,
    reportDate:    formatDMY(p.reportDate || extractDate(record)),
    totalCols:     NC,
  });

  let r = ws.lastRow.number + 1;

  /* ─── Subtitle ─── */
  if (opts.subtitle) {
    ws.mergeCells(r, 1, r, NC);
    const c = ws.getCell(r, 1);
    c.value = typeof opts.subtitle === "function" ? opts.subtitle(p) : opts.subtitle;
    c.font = { italic: true, size: 10, color: { argb: "1F3B70" } };
    c.fill = fillSolid("E9F0FF");
    c.alignment = center;
    c.border = BORDER_NAVY;
    ws.getRow(r).height = 20;
    r++;
  }

  /* ─── Column headers ─── */
  opts.columns.forEach((col, ci) => {
    const c = ws.getCell(r, ci + 1);
    c.value = col.label;
    c.font = { bold: true, size: 10, color: { argb: "0B1F4D" } };
    c.fill = fillSolid("DCE6F1");
    c.alignment = { ...center, wrapText: true };
    c.border = BORDER_NAVY;
  });
  ws.getRow(r).height = 32;
  r++;

  /* ─── Data rows ─── */
  if (!rows.length) {
    ws.mergeCells(r, 1, r, NC);
    const c = ws.getCell(r, 1);
    c.value = "No entries.";
    c.font = { italic: true, color: { argb: COLORS.TEXT_MUTED } };
    c.alignment = center;
    c.border = BORDER_NAVY;
    ws.getRow(r).height = 20;
    r++;
  } else {
    rows.forEach((row, i) => {
      const bg = i % 2 === 0 ? "FFFFFF" : "F8FAFF";
      opts.columns.forEach((col, ci) => {
        const v = typeof col.get === "function" ? col.get(row, p) : row[col.key];
        const c = ws.getCell(r, ci + 1);
        c.value = safe(v);
        c.font = { size: 10 };
        c.fill = fillSolid(bg);
        c.alignment = col.align
          ? { ...center, horizontal: col.align, wrapText: true }
          : { ...center, wrapText: true };
        c.border = BORDER_NAVY;
        // Optional warn hook
        if (typeof opts.cellWarn === "function") {
          const w = opts.cellWarn({ value: v, key: col.key, row });
          if (w === "red") {
            c.font = { bold: true, color: { argb: COLORS.RED }, size: 10 };
            c.fill = fillSolid(COLORS.RED_BG);
          } else if (w === "green") {
            c.font = { bold: true, color: { argb: COLORS.GREEN }, size: 10 };
            c.fill = fillSolid(COLORS.GREEN_BG);
          }
        }
      });
      ws.getRow(r).height = 22;
      r++;
    });
  }

  /* ─── Footer ─── */
  const f = typeof opts.extraFooter === "function" ? opts.extraFooter(p) : {};
  addFooter(ws, {
    checkedBy:  f.checkedBy  || p.checkedBy  || "",
    verifiedBy: f.verifiedBy || p.verifiedBy || "",
    revDate:    f.revDate    || p.revDate    || "",
    revNo:      f.revNo      || p.revNo      || "",
  }, NC);

  return ws;
}
