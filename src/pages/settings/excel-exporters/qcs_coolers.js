// src/pages/settings/excel-exporters/qcs_coolers.js
// Mirrors src/pages/monitor/branches/qcs/CoolersView.jsx exactly.

import {
  COLORS, BORDER_BLACK, fillSolid, center, left,
  addDocHeader, addFooter, formatDMY, extractDate,
  pageSetupLandscape,
} from "./_lib";

const COOLER_TIMES = [
  "4:00 AM","6:00 AM","8:00 AM","10:00 AM","12:00 PM",
  "2:00 PM","4:00 PM","6:00 PM","8:00 PM",
];

function labelForCooler(i) {
  return i === 7 ? "FREEZER" : (i === 2 || i === 3) ? "Production Room" : `Cooler ${i + 1}`;
}

export default async function build(wb, record, ctx) {
  const { branchLabel, sheetName } = ctx;
  const p = record?.payload || {};
  const reportDate = formatDMY(extractDate(record));

  // 1 (cooler col) + 9 time cols + 1 remarks col = 11 cols
  const NC = COOLER_TIMES.length + 2;

  const ws = wb.addWorksheet(sheetName, { views: [{ showGridLines: false }] });
  pageSetupLandscape(ws);
  ws.columns = [
    { width: 16 }, // Cooler name
    ...COOLER_TIMES.map(() => ({ width: 11 })),
    { width: 30 }, // Remarks
  ];

  /* ─── Document header (matches TMPPrintHeader in view) ─── */
  addDocHeader(ws, {
    documentTitle: "Temperature Control Record",
    documentNo:    "FS-QM/REC/TMP",
    issueDate:     "05/02/2020",
    revisionNo:    "0",
    area:          "QA",
    issuedBy:      "MOHAMAD ABDULLAH",
    controllingOfficer: "Quality Controller",
    approvedBy:    "Hussam O. Sarhan",
    company:       "TRANS EMIRATES LIVESTOCK MEAT TRADING LLC",
    reportTitle:   "TEMPERATURE CONTROL CHECKLIST (CCP)",
    reportDate:    reportDate,
    totalCols:     NC,
  });

  /* ─── Instructions notes block ─── */
  let r = ws.lastRow.number + 1;
  const notes = [
    "1. If the temp is +5°C or more / Check product temperature – corrective action should be taken.",
    "2. If the loading area is more than +16°C – corrective action should be taken.",
    "3. If the preparation area is more than +10°C – corrective action should be taken.",
  ];
  notes.forEach((ln) => {
    ws.mergeCells(r, 1, r, NC);
    const c = ws.getCell(r, 1);
    c.value = ln;
    c.font = { size: 10 };
    c.alignment = { horizontal: "left", vertical: "middle", indent: 1, wrapText: true };
    c.border = BORDER_BLACK;
    ws.getRow(r).height = 18;
    r++;
  });
  // Corrective-action bold line
  ws.mergeCells(r, 1, r, NC);
  const ca = ws.getCell(r, 1);
  ca.value = "Corrective action: Transfer the meat to another cold room and call maintenance department to check and solve the problem.";
  ca.font = { bold: true, size: 10 };
  ca.alignment = { horizontal: "left", vertical: "middle", indent: 1, wrapText: true };
  ca.border = BORDER_BLACK;
  ws.getRow(r).height = 22;
  r++;

  /* ─── Table header: "Cooler" | times… | "Remarks" ─── */
  const headStyle = (cell) => {
    cell.font = { bold: true, size: 11, color: { argb: COLORS.TEXT } };
    cell.fill = fillSolid(COLORS.GRAY_HEAD);
    cell.alignment = center;
    cell.border = BORDER_BLACK;
  };
  ws.getCell(r, 1).value = "Cooler"; headStyle(ws.getCell(r, 1));
  COOLER_TIMES.forEach((t, i) => {
    const c = ws.getCell(r, i + 2);
    c.value = t;
    headStyle(c);
  });
  ws.getCell(r, NC).value = "Remarks"; headStyle(ws.getCell(r, NC));
  ws.getRow(r).height = 22;
  r++;

  /* ─── Data rows ─── */
  const coolers = Array.isArray(p.coolers) ? p.coolers : [];
  if (coolers.length === 0) {
    ws.mergeCells(r, 1, r, NC);
    const c = ws.getCell(r, 1);
    c.value = "No coolers data.";
    c.alignment = center;
    c.font = { italic: true, color: { argb: COLORS.TEXT_MUTED } };
    c.border = BORDER_BLACK;
    ws.getRow(r).height = 20;
    r++;
  } else {
    coolers.forEach((c, i) => {
      ws.getCell(r, 1).value = labelForCooler(i);
      ws.getCell(r, 1).font = { bold: true, size: 10 };
      ws.getCell(r, 1).alignment = left;
      ws.getCell(r, 1).border = BORDER_BLACK;
      COOLER_TIMES.forEach((t, ti) => {
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
      const rmk = ws.getCell(r, NC);
      rmk.value = c?.remarks || "";
      rmk.alignment = { ...left, wrapText: true };
      rmk.font = { size: 10 };
      rmk.border = BORDER_BLACK;
      ws.getRow(r).height = 20;
      r++;
    });
  }

  /* ─── Loading Area row ─── */
  if (p.loadingArea) {
    const la = p.loadingArea;
    ws.getCell(r, 1).value = "Loading Area";
    ws.getCell(r, 1).font = { bold: true, size: 10 };
    ws.getCell(r, 1).alignment = left;
    ws.getCell(r, 1).fill = fillSolid(COLORS.GRAY_LIGHT);
    ws.getCell(r, 1).border = BORDER_BLACK;
    COOLER_TIMES.forEach((t, ti) => {
      const raw = la?.temps?.[t];
      const cell = ws.getCell(r, ti + 2);
      if (raw === undefined || raw === null || raw === "") {
        cell.value = "—";
        cell.font = { color: { argb: COLORS.TEXT_MUTED }, size: 10 };
      } else {
        cell.value = `${String(raw).trim()}°C`;
        cell.font = { size: 10 };
        const n = parseFloat(raw);
        if (!isNaN(n) && n >= 16) {
          cell.font = { bold: true, color: { argb: COLORS.RED }, size: 10 };
          cell.fill = fillSolid(COLORS.RED_BG);
        }
      }
      cell.alignment = center;
      cell.fill = cell.fill || fillSolid(COLORS.GRAY_LIGHT);
      cell.border = BORDER_BLACK;
    });
    const rmk = ws.getCell(r, NC);
    rmk.value = la?.remarks || "";
    rmk.alignment = { ...left, wrapText: true };
    rmk.font = { size: 10 };
    rmk.fill = fillSolid(COLORS.GRAY_LIGHT);
    rmk.border = BORDER_BLACK;
    ws.getRow(r).height = 22;
    r++;
  }

  /* ─── Product Temperature Verification (Matching) ─── */
  const pvs = Array.isArray(p.productVerifications) ? p.productVerifications : [];
  if (pvs.length) {
    r += 1; // spacer

    ws.mergeCells(r, 1, r, NC);
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

    const labelForStorage = (key) => {
      if (key === "loading-area") return "Loading Area";
      const m = String(key || "").match(/^cooler-(\d+)$/);
      if (!m) return key || "";
      const i = Number(m[1]);
      return i === 7 ? "FREEZER" : (i === 2 || i === 3) ? "Production Room" : `Cooler ${i + 1}`;
    };
    const limitFor = (key) =>
      key === "cooler-7"
        ? { label: "≤ -18°C", pass: (n) => n <= -18 }
        : { label: "0 to 5°C", pass: (n) => n >= 0 && n <= 5 };
    const roomTempFor = (row) => {
      if (row.storageKey === "loading-area") return p?.loadingArea?.temps?.[row.time];
      const m = String(row.storageKey || "").match(/^cooler-(\d+)$/);
      if (!m) return undefined;
      return (Array.isArray(p.coolers) ? p.coolers : [])[Number(m[1])]?.temps?.[row.time];
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

  /* ─── Footer: Verified by manager ─── */
  r += 1;
  ws.mergeCells(r, 1, r, NC);
  const ftr = ws.getCell(r, 1);
  ftr.value = `Verified by:  ${p.verifiedByManager || "—"}`;
  ftr.alignment = { horizontal: "right", vertical: "middle", indent: 2 };
  ftr.font = { bold: true, size: 11 };
  ftr.fill = fillSolid(COLORS.GRAY_LIGHT);
  ftr.border = BORDER_BLACK;
  ws.getRow(r).height = 26;

  return ws;
}
