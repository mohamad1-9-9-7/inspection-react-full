// src/pages/settings/excel-exporters/_ftr_temp.js
// Shared FTR 1 / FTR 2 Temperature log builder — mirrors FTR1TemperatureView.jsx style.

import {
  COLORS, BORDER_BLACK, fillSolid, center, left,
  addDocHeader, addFooter, formatDMY, extractDate,
  pageSetupLandscape,
} from "./_lib";

const DEFAULT_TIMES = [
  "4:00 AM","6:00 AM","8:00 AM","10:00 AM","12:00 PM",
  "2:00 PM","4:00 PM","6:00 PM","8:00 PM",
];

export function makeFtrTempBuilder(branchLabel) {
  return async function build(wb, record, ctx) {
    const { sheetName } = ctx;
    const p = record?.payload || {};
    const times = (p.times || DEFAULT_TIMES).filter(
      (t) => String(t).toLowerCase() !== "corrective action"
    );
    const coolersRaw = (p.coolers || []).map((c, idx) => ({
      ...c,
      __idx: idx,
      __name: String(c?.name || c?.label || `Cooler ${idx + 1}`),
    }));

    const NC = times.length + 2;
    const ws = wb.addWorksheet(sheetName, { views: [{ showGridLines: false }] });
    pageSetupLandscape(ws);
    ws.columns = [
      { width: 16 },
      ...times.map(() => ({ width: 11 })),
      { width: 28 },
    ];

    addDocHeader(ws, {
      documentTitle: `Temperature Control Record — ${branchLabel}`,
      documentNo:    "FS-QM/REC/TMP",
      issueDate:     "05/02/2020",
      revisionNo:    "0",
      area:          "QA",
      issuedBy:      "MOHAMAD ABDULLAH",
      controllingOfficer: "Quality Controller",
      approvedBy:    "Hussam O. Sarhan",
      company:       "TRANS EMIRATES LIVESTOCK MEAT TRADING LLC",
      reportTitle:   `${branchLabel.toUpperCase()} — TEMPERATURE CONTROL CHECKLIST (CCP)`,
      reportDate:    formatDMY(p.date || p.reportDate || extractDate(record)),
      totalCols:     NC,
    });

    let r = ws.lastRow.number + 1;

    // Table header
    const head = ["Cooler", ...times, "Remarks"];
    head.forEach((h, ci) => {
      const c = ws.getCell(r, ci + 1);
      c.value = h;
      c.font = { bold: true, size: 11, color: { argb: COLORS.TEXT } };
      c.fill = fillSolid(COLORS.GRAY_HEAD);
      c.alignment = center;
      c.border = BORDER_BLACK;
    });
    ws.getRow(r).height = 22;
    r++;

    if (!coolersRaw.length) {
      ws.mergeCells(r, 1, r, NC);
      const c = ws.getCell(r, 1);
      c.value = "No coolers data.";
      c.font = { italic: true, color: { argb: COLORS.TEXT_MUTED } };
      c.alignment = center;
      c.border = BORDER_BLACK;
      ws.getRow(r).height = 20;
      r++;
    } else {
      coolersRaw.forEach((c) => {
        ws.getCell(r, 1).value = c.__name;
        ws.getCell(r, 1).font = { bold: true, size: 10 };
        ws.getCell(r, 1).alignment = left;
        ws.getCell(r, 1).border = BORDER_BLACK;
        times.forEach((t, ti) => {
          const raw = c?.temps?.[t];
          const cell = ws.getCell(r, ti + 2);
          if (raw === undefined || raw === null || raw === "") {
            cell.value = "—";
            cell.font = { color: { argb: COLORS.TEXT_MUTED }, size: 10 };
          } else {
            cell.value = `${String(raw).trim()}°C`;
            cell.font = { size: 10 };
            const n = parseFloat(raw);
            if (!isNaN(n) && n >= 5) {
              cell.font = { bold: true, color: { argb: COLORS.RED }, size: 10 };
              cell.fill = fillSolid(COLORS.RED_BG);
            }
          }
          cell.alignment = center;
          cell.border = BORDER_BLACK;
        });
        const rm = ws.getCell(r, NC);
        rm.value = c?.remarks || "";
        rm.font = { size: 10 };
        rm.alignment = { ...left, wrapText: true };
        rm.border = BORDER_BLACK;
        ws.getRow(r).height = 20;
        r++;
      });
    }

    /* ─── Product Temperature Verification (Matching) ─── */
    const pvs = Array.isArray(p.productVerifications) ? p.productVerifications : [];
    if (pvs.length) {
      // Ensure the matching table's extra columns have a sensible width
      [9, 10, 11].forEach((cIdx) => {
        const col = ws.getColumn(cIdx);
        if (!col.width) col.width = cIdx === 11 ? 24 : 11;
      });

      r += 1; // spacer
      ws.mergeCells(r, 1, r, 11);
      const tt = ws.getCell(r, 1);
      tt.value = "PRODUCT TEMPERATURE VERIFICATION (MATCHING)";
      tt.alignment = center;
      tt.font = { bold: true, size: 12, color: { argb: COLORS.TEXT } };
      tt.fill = fillSolid(COLORS.GRAY_BAND_2);
      tt.border = BORDER_BLACK;
      ws.getRow(r).height = 22;
      r++;

      const headM = (col, label) => {
        const c = ws.getCell(r, col);
        c.value = label;
        c.font = { bold: true, size: 10, color: { argb: COLORS.TEXT } };
        c.fill = fillSolid(COLORS.GRAY_HEAD);
        c.alignment = center;
        c.border = BORDER_BLACK;
      };
      headM(1, "Storage Area");
      headM(2, "Time");
      headM(3, "Code");
      ws.mergeCells(r, 4, r, 5);
      headM(4, "Product");
      headM(5, "");
      headM(6, "Country");
      headM(7, "Product °C");
      headM(8, "Room °C");
      headM(9, "Limit");
      headM(10, "Status");
      headM(11, "Remarks");
      ws.getRow(r).height = 22;
      r++;

      const isFreezerName = (n) => /freezer/i.test(String(n || ""));
      const unitIndexOf = (key) => {
        const m = String(key || "").match(/^unit-(\d+)$/);
        return m ? Number(m[1]) : -1;
      };
      const labelForStorage = (key) => {
        const i = unitIndexOf(key);
        return i >= 0 && coolersRaw[i] ? coolersRaw[i].__name : (key || "");
      };
      const limitFor = (key) => {
        const i = unitIndexOf(key);
        const frozen = i >= 0 && coolersRaw[i] ? isFreezerName(coolersRaw[i].__name) : false;
        return frozen
          ? { label: "≤ -18°C", pass: (n) => n <= -18 }
          : { label: "0 to 5°C", pass: (n) => n >= 0 && n <= 5 };
      };
      const roomTempFor = (row) => {
        const i = unitIndexOf(row.storageKey);
        return i >= 0 && coolersRaw[i] ? coolersRaw[i]?.temps?.[row.time] : undefined;
      };

      pvs.forEach((row, ri) => {
        const bg = ri % 2 === 0 ? COLORS.WHITE : COLORS.GRAY_ALT;
        const lim = limitFor(row.storageKey);
        const pt = row.productTemp;
        const n = Number(pt);
        let status = "Pending";
        if (pt !== "" && pt != null && !Number.isNaN(n)) status = lim.pass(n) ? "PASS" : "FAIL";
        const rt = roomTempFor(row);

        const put = (col, val, opts = {}) => {
          const c = ws.getCell(r, col);
          c.value = val == null || val === "" ? "" : val;
          c.alignment = opts.align ? { ...center, horizontal: opts.align } : center;
          c.font = { size: 10, ...(opts.font || {}) };
          c.fill = fillSolid(opts.fill || bg);
          c.border = BORDER_BLACK;
          return c;
        };

        put(1, labelForStorage(row.storageKey), { align: "left", font: { bold: true, size: 10 } });
        put(2, row.time || "");
        put(3, row.itemCode || "");
        ws.mergeCells(r, 4, r, 5);
        put(4, row.productName || "", { align: "left" });
        put(5, "");
        put(6, row.country || row.batchNo || "");
        put(7, pt === "" || pt == null ? "" : `${String(pt).trim()}°C`);
        put(8, rt === undefined || rt === null || rt === "" ? "—" : `${String(rt).trim()}°C`);
        put(9, lim.label);
        const sc = put(10, status);
        if (status === "PASS") { sc.font = { bold: true, color: { argb: COLORS.GREEN }, size: 10 }; sc.fill = fillSolid(COLORS.GREEN_BG); }
        else if (status === "FAIL") { sc.font = { bold: true, color: { argb: COLORS.RED }, size: 10 }; sc.fill = fillSolid(COLORS.RED_BG); }
        put(11, row.remarks || "", { align: "left" });
        ws.getRow(r).height = 20;
        r++;
      });
    }

    addFooter(ws, {
      checkedBy:  p.checkedBy || "",
      verifiedBy: p.verifiedByManager || p.verifiedBy || "",
    }, NC);
    return ws;
  };
}
