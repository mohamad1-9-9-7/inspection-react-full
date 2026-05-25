// src/pages/settings/excel-exporters/qcs_garbage_disposal.js
// Mirrors GarbageDisposalView (each record = one sheet, all fields)

import {
  COLORS, BORDER_BLACK, fillSolid, center, left,
  addDocHeader, addFooter, formatDMY, extractDate,
  pageSetupPortrait, display,
} from "./_lib";

function makeWasteBuilder(title, docNo) {
  return async function build(wb, record, ctx) {
    const { sheetName } = ctx;
    const p = record?.payload || {};
    const vendor = p.vendor || {};
    const images = p.images || {};
    const extras = Array.isArray(images.extras) ? images.extras : [];

    const NC = 4;
    const ws = wb.addWorksheet(sheetName, { views: [{ showGridLines: false }] });
    pageSetupPortrait(ws);
    ws.columns = [{ width: 24 }, { width: 26 }, { width: 24 }, { width: 26 }];

    addDocHeader(ws, {
      documentTitle: title,
      documentNo:    docNo,
      issueDate:     "05/02/2020",
      revisionNo:    "0",
      area:          "QA",
      issuedBy:      "MOHAMAD ABDULLAH",
      controllingOfficer: "Quality Controller",
      approvedBy:    "Hussam O. Sarhan",
      company:       "TRANS EMIRATES LIVESTOCK TRADING L.L.C.",
      reportTitle:   title.toUpperCase(),
      reportDate:    formatDMY(p.reportDate || extractDate(record)),
      totalCols:     NC,
    });

    let r = ws.lastRow.number + 1;
    const lblFont = { bold: true, size: 10, color: { argb: COLORS.NAVY } };
    const lblFill = fillSolid(COLORS.GRAY_LIGHT);

    function pair(l1, v1, l2, v2) {
      const items = [
        [1, 2, l1, v1],
        [3, 4, l2, v2],
      ];
      items.forEach(([lc, vc, lbl, v]) => {
        if (lbl == null) return;
        ws.getCell(r, lc).value = lbl;
        ws.getCell(r, lc).font = lblFont;
        ws.getCell(r, lc).fill = lblFill;
        ws.getCell(r, lc).alignment = left;
        ws.getCell(r, lc).border = BORDER_BLACK;
        ws.getCell(r, vc).value = display(v);
        ws.getCell(r, vc).font = { size: 10 };
        ws.getCell(r, vc).alignment = left;
        ws.getCell(r, vc).border = BORDER_BLACK;
      });
      ws.getRow(r).height = 20;
      r++;
    }
    function wide(label, val) {
      ws.getCell(r, 1).value = label;
      ws.getCell(r, 1).font = lblFont;
      ws.getCell(r, 1).fill = lblFill;
      ws.getCell(r, 1).alignment = left;
      ws.getCell(r, 1).border = BORDER_BLACK;
      ws.mergeCells(r, 2, r, NC);
      const v = ws.getCell(r, 2);
      v.value = display(val);
      v.font = { size: 10 };
      v.alignment = { ...left, wrapText: true };
      v.border = BORDER_BLACK;
      const lines = String(val ?? "").split("\n").length;
      ws.getRow(r).height = Math.max(22, lines * 16);
      r++;
    }
    function section(title) {
      ws.mergeCells(r, 1, r, NC);
      const c = ws.getCell(r, 1);
      c.value = title;
      c.font = { bold: true, size: 11, color: { argb: COLORS.WHITE } };
      c.fill = fillSolid(COLORS.NAVY);
      c.alignment = center;
      c.border = BORDER_BLACK;
      ws.getRow(r).height = 22;
      r++;
    }

    section("Disposal Details");
    pair("Report Date", formatDMY(p.reportDate), "Location", p.location);
    pair("Waste Type",  p.wasteType,             "Quantity", p.quantity ? `${p.quantity} ${p.unit || ""}` : "");
    pair("Disposed By", p.disposedBy,            "Supervisor", p.supervisor);

    section("Vendor / Invoice");
    pair("Vendor Name",     vendor.name,          "Invoice Number", vendor.invoiceNumber);
    pair("Invoice Amount",  vendor.invoiceAmount ? `${vendor.invoiceAmount} AED` : "", "VAT", vendor.vat);
    if (vendor.contact)   wide("Contact",     vendor.contact);
    if (vendor.address)   wide("Address",     vendor.address);

    if (p.notes) {
      section("Notes");
      wide("Notes", p.notes);
    }

    // Images section
    if (images.invoice || extras.length) {
      section("Attachments");
      if (images.invoice) {
        ws.getCell(r, 1).value = "Invoice Image";
        ws.getCell(r, 1).font = lblFont;
        ws.getCell(r, 1).fill = lblFill;
        ws.getCell(r, 1).alignment = left;
        ws.getCell(r, 1).border = BORDER_BLACK;
        ws.mergeCells(r, 2, r, NC);
        const v = ws.getCell(r, 2);
        v.value = { text: images.invoice, hyperlink: images.invoice };
        v.font = { color: { argb: "2563EB" }, underline: true, size: 10 };
        v.alignment = left;
        v.border = BORDER_BLACK;
        ws.getRow(r).height = 18;
        r++;
      }
      extras.forEach((u, i) => {
        ws.getCell(r, 1).value = `Image ${i + 1}`;
        ws.getCell(r, 1).font = lblFont;
        ws.getCell(r, 1).fill = lblFill;
        ws.getCell(r, 1).alignment = left;
        ws.getCell(r, 1).border = BORDER_BLACK;
        ws.mergeCells(r, 2, r, NC);
        const v = ws.getCell(r, 2);
        v.value = { text: u, hyperlink: u };
        v.font = { color: { argb: "2563EB" }, underline: true, size: 10 };
        v.alignment = left;
        v.border = BORDER_BLACK;
        ws.getRow(r).height = 18;
        r++;
      });
    }

    addFooter(ws, {
      checkedBy:  p.disposedBy || "",
      verifiedBy: p.supervisor || "",
    }, NC);
    return ws;
  };
}

export default makeWasteBuilder("Garbage / Waste Disposal Record", "FF-QM/REC/GWD");
export const meatWasteBuilder = makeWasteBuilder("Meat Waste Disposal Record", "FF-QM/REC/MWD");
