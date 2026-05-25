// Lightweight POS-style pest control (vs the rich QCS one) — adapts branch label.

import {
  COLORS, BORDER_BLACK, fillSolid, center, left,
  addDocHeader, addFooter, formatDMY, extractDate,
  pageSetupPortrait, display,
} from "./_lib";

export function makePosPestBuilder(branchLabel) {
  return async function build(wb, record, ctx) {
    const { sheetName } = ctx;
    const p = record?.payload || {};
    const company = p.company || {};
    const stations = Array.isArray(p.stations) ? p.stations : [];
    const pests    = Array.isArray(p.pestsTargeted) ? p.pestsTargeted : [];

    const NC = 4;
    const ws = wb.addWorksheet(sheetName, { views: [{ showGridLines: false }] });
    pageSetupPortrait(ws);
    ws.columns = [{ width: 22 }, { width: 26 }, { width: 22 }, { width: 26 }];

    addDocHeader(ws, {
      documentTitle: `${branchLabel} Pest Control Service Report`,
      documentNo:    "FF-QM/REC/PEST",
      issueDate:     "05/02/2020",
      revisionNo:    "0",
      area:          "QA",
      issuedBy:      "MOHAMAD ABDULLAH",
      controllingOfficer: "Quality Controller",
      approvedBy:    "Hussam O. Sarhan",
      company:       "TRANS EMIRATES LIVESTOCK TRADING L.L.C.",
      reportTitle:   `${branchLabel.toUpperCase()} — PEST CONTROL SERVICE REPORT`,
      reportDate:    formatDMY(p.reportDate || extractDate(record)),
      totalCols:     NC,
    });

    let r = ws.lastRow.number + 1;
    const lblFont = { bold: true, size: 10, color: { argb: COLORS.NAVY } };
    const lblFill = fillSolid(COLORS.GRAY_LIGHT);
    const section = (title) => {
      ws.mergeCells(r, 1, r, NC);
      const c = ws.getCell(r, 1);
      c.value = title;
      c.font = { bold: true, size: 11, color: { argb: COLORS.WHITE } };
      c.fill = fillSolid(COLORS.NAVY);
      c.alignment = center;
      c.border = BORDER_BLACK;
      ws.getRow(r).height = 22;
      r++;
    };
    const pair = (l1, v1, l2, v2) => {
      [[1, 2, l1, v1], [3, 4, l2, v2]].forEach(([lc, vc, lbl, v]) => {
        if (lbl == null) return;
        ws.getCell(r, lc).value = lbl;
        ws.getCell(r, lc).font = lblFont; ws.getCell(r, lc).fill = lblFill;
        ws.getCell(r, lc).alignment = left; ws.getCell(r, lc).border = BORDER_BLACK;
        ws.getCell(r, vc).value = display(v);
        ws.getCell(r, vc).font = { size: 10 }; ws.getCell(r, vc).alignment = left;
        ws.getCell(r, vc).border = BORDER_BLACK;
      });
      ws.getRow(r).height = 20; r++;
    };
    const wide = (label, val) => {
      ws.getCell(r, 1).value = label;
      ws.getCell(r, 1).font = lblFont; ws.getCell(r, 1).fill = lblFill;
      ws.getCell(r, 1).alignment = left; ws.getCell(r, 1).border = BORDER_BLACK;
      ws.mergeCells(r, 2, r, NC);
      const v = ws.getCell(r, 2);
      v.value = display(val); v.font = { size: 10 };
      v.alignment = { ...left, wrapText: true };
      v.border = BORDER_BLACK;
      const lines = String(val ?? "").split("\n").length;
      ws.getRow(r).height = Math.max(22, lines * 16);
      r++;
    };

    section("Service Information");
    pair("Date",       formatDMY(p.reportDate), "Location",   p.location);
    pair("Visit Type", p.visitType,             "Next Visit", formatDMY(p.nextVisitDate));
    pair("Technician", p.technician,            "Inspector",  p.inspector);

    section("Service Company");
    pair("Company Name", company.name,    "Service Report No.", company.serviceReportNo);
    pair("Contact",      company.contact, "Phone",              company.phone);
    if (company.address) wide("Address", company.address);

    if (pests.length) {
      section("Pests Targeted");
      ws.mergeCells(r, 1, r, NC);
      const c = ws.getCell(r, 1);
      c.value = pests.join(", ");
      c.font = { size: 10 };
      c.alignment = { ...left, wrapText: true };
      c.border = BORDER_BLACK;
      ws.getRow(r).height = 22;
      r++;
    }
    if (p.chemicalsUsed) { section("Chemicals Used"); wide("Chemicals", p.chemicalsUsed); }
    if (p.findings)        { section("Findings"); wide("Findings", p.findings); }
    if (p.correctiveActions) { section("Corrective Actions"); wide("Corrective Actions", p.correctiveActions); }

    if (stations.length) {
      section(`Bait Stations (${stations.length})`);
      const sCols = ["Station #", "Location", "Status", "Activity", "Bait Type", "Remarks"];
      const widerNC = Math.max(NC, sCols.length);
      if (widerNC > NC) {
        ws.columns = [...ws.columns, ...Array(widerNC - NC).fill({ width: 16 })];
      }
      sCols.forEach((h, i) => {
        const c = ws.getCell(r, i + 1);
        c.value = h;
        c.font = { bold: true, size: 10, color: { argb: COLORS.NAVY } };
        c.fill = fillSolid(COLORS.GRAY_HEAD);
        c.alignment = center;
        c.border = BORDER_BLACK;
      });
      ws.getRow(r).height = 22;
      r++;
      stations.forEach((st, i) => {
        const bg = i % 2 === 0 ? COLORS.WHITE : COLORS.GRAY_ALT;
        const vals = [st?.number || (i + 1), st?.location || "", st?.status || "", st?.activity || "", st?.baitType || "", st?.remarks || ""];
        vals.forEach((v, ci) => {
          const c = ws.getCell(r, ci + 1);
          c.value = v;
          c.font = { size: 10 };
          c.fill = fillSolid(bg);
          c.alignment = ci === 5 ? { ...left, wrapText: true } : center;
          c.border = BORDER_BLACK;
        });
        ws.getRow(r).height = 20;
        r++;
      });
    }

    addFooter(ws, { checkedBy: p.technician || "", verifiedBy: p.inspector || "" }, NC);
    return ws;
  };
}
