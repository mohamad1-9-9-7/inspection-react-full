// src/pages/settings/excel-exporters/product_withdrawal.js
// Product Withdrawal record (ISO 22000:2018 §8.9.5 "Withdrawal").
// Mirrors src/pages/haccp and iso/ProductWithdrawal/ProductWithdrawalView.jsx —
// identification, distribution scope, trigger & reason, affected product,
// per-location stock-hold matrix with totals, hold/quarantine, notifications,
// disposition, cost, effectiveness verification, CAPA and closure.

import {
  COLORS, BORDER_BLACK, fillSolid, center, left,
  addDocHeader, addFooter, formatDMY, extractDate,
  pageSetupLandscape, display,
} from "./_lib";

const LEVEL_LABEL = {
  Warehouse: "Company warehouse only",
  Transit: "In transit / on the road",
  Branch: "Branches & outlets (not displayed)",
  Shelf: "On display shelf (not sold)",
  Wholesale: "Wholesale customers / distributors",
};

const CLASS_LABEL = {
  A: "Level A — potential health hazard",
  B: "Level B — quality / regulatory non-conformity",
  C: "Level C — administrative / labelling",
};

const SOURCE_LABEL = {
  InternalQC: "Internal inspection / QC",
  Lab: "Laboratory result",
  Supplier: "Supplier notification",
  Complaint: "Customer complaint",
  Authority: "Authority notification",
  Trace: "Traceability drill / Mock Recall",
  Other: "Other",
};

const REASON_LABEL = {
  Micro: "Microbiological contamination",
  Chemical: "Chemical contamination",
  Foreign: "Foreign body",
  Allergen: "Undeclared allergen",
  Label: "Labelling / declaration error",
  Temperature: "Temperature abuse / cold chain break",
  ShelfLife: "Shelf life / expiry",
  Halal: "Halal integrity breach",
  Packaging: "Packaging defect",
  Regulatory: "Regulatory non-conformance",
  Other: "Other",
};

const DISPOSITION_LABEL = {
  Pending: "Pending decision",
  Destroy: "Destroy",
  Rework: "Rework",
  Redirect: "Redirect (alternative use)",
  ReturnSupplier: "Return to supplier",
  Release: "Release after re-evaluation",
  Mixed: "Mixed",
};

const STATUS_LABEL = {
  Open: "Open",
  InProgress: "In progress",
  Secured: "Stock secured",
  Closed: "Closed",
};

const NOTIFY_LABEL = [
  ["Branches", "Branches & outlets"],
  ["Ops", "Operations & distribution"],
  ["Warehouse", "Warehouse"],
  ["Mgmt", "Top management"],
  ["Wholesale", "Wholesale customers / distributors"],
  ["Supplier", "Supplier"],
];

const TRISTATE = { yes: "Yes", partial: "Partial", no: "No" };

const ATTACHMENT_LABEL = {
  invoice: "Sales invoice",
  transfer: "Stock transfer note",
  crm: "CRM record / ticket",
  deliveryNote: "Delivery note (POD)",
  grn: "Goods receipt note (GRN)",
  returnNote: "Return note",
  holdLabel: "“HOLD” label photo",
  quarantine: "Quarantine area photo",
  branchConfirm: "Branch hold confirmation",
  circular: "Internal circular",
  productPhoto: "Product / defect photo",
  labReport: "Laboratory report",
  coa: "Certificate of analysis (COA)",
  supplierNotice: "Supplier notification",
  authorityLetter: "Authority correspondence",
  destructionCert: "Destruction certificate",
  other: "Other document",
};

const num = (v) => {
  const n = parseFloat(v);
  return isNaN(n) ? 0 : n;
};

/* Same maths as summarizeLocations() in ProductWithdrawalInput.jsx */
function totalsOf(locations) {
  const rows = Array.isArray(locations) ? locations : [];
  const t = rows.reduce(
    (a, l) => ({
      dispatched: a.dispatched + num(l.dispatched),
      held: a.held + num(l.held),
      returned: a.returned + num(l.returned),
      sold: a.sold + num(l.sold),
    }),
    { dispatched: 0, held: 0, returned: 0, sold: 0 }
  );
  const secured = t.held + t.returned;
  const rate = t.dispatched > 0 ? Math.min(100, (secured / t.dispatched) * 100) : null;
  const confirmed = rows.filter((l) => l.confirmed).length;
  return { ...t, secured, rate, confirmed, count: rows.length };
}

function secureHours(initDate, initTime, holdCompleted) {
  if (!initDate || !holdCompleted) return null;
  const start = new Date(`${initDate}T${initTime || "00:00"}`).getTime();
  const end = new Date(holdCompleted).getTime();
  if (isNaN(start) || isNaN(end)) return null;
  const h = (end - start) / 3600000;
  return h < 0 ? null : h;
}

/* Show ISO datetime as DD/MM/YYYY HH:MM */
function fmtDateTime(iso) {
  if (!iso) return "";
  const [d, t] = String(iso).split("T");
  const day = formatDMY(d);
  const time = t ? t.slice(0, 5) : "";
  return time ? `${day} ${time}` : day;
}

export default async function build(wb, record, ctx) {
  const { sheetName } = ctx;
  const p = record?.payload || {};
  const locations = Array.isArray(p.locations) ? p.locations : [];
  const t = totalsOf(locations);
  const unit = p.unit || "";
  const hrs = secureHours(p.initDate, p.initTime, p.holdCompleted);
  const escalated = p.consumerReached === "yes" || t.sold > 0;

  const NC = 8;
  const ws = wb.addWorksheet(sheetName, { views: [{ showGridLines: false }] });
  pageSetupLandscape(ws);
  ws.columns = [
    { width: 20 }, { width: 16 }, { width: 18 }, { width: 14 },
    { width: 18 }, { width: 14 }, { width: 18 }, { width: 16 },
  ];

  addDocHeader(ws, {
    documentTitle: "Product Withdrawal Record",
    documentNo:    "FS-HACCP/REC/WD",
    issueDate:     "01/01/2026",
    revisionNo:    "0",
    area:          "QA / FSMS",
    issuedBy:      "MOHAMAD ABDULLAH",
    controllingOfficer: "FSMS Team Leader",
    approvedBy:    "Hussam O. Sarhan",
    company:       "TRANS EMIRATES LIVESTOCK MEAT TRADING LLC",
    reportTitle:   "PRODUCT WITHDRAWAL RECORD — ISO 22000:2018 §8.9.5",
    reportDate:    formatDMY(p.initDate || extractDate(record)),
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
    c.alignment = center; c.border = BORDER_BLACK;
    ws.getRow(r).height = 22; r++;
  };

  /* label/value pairs across the 8-column grid: 1-2 | 3-4 || 5-6 | 7-8 */
  const pair = (l1, v1, l2, v2) => {
    [[1, 2, 3, 4, l1, v1], [5, 6, 7, 8, l2, v2]].forEach(([lc, lc2, vc, vc2, lbl, v]) => {
      ws.mergeCells(r, lc, r, lc2);
      ws.mergeCells(r, vc, r, vc2);
      const lcell = ws.getCell(r, lc);
      const vcell = ws.getCell(r, vc);
      if (lbl == null) {
        lcell.border = BORDER_BLACK; vcell.border = BORDER_BLACK;
        return;
      }
      lcell.value = lbl; lcell.font = lblFont; lcell.fill = lblFill;
      lcell.alignment = left; lcell.border = BORDER_BLACK;
      vcell.value = display(v); vcell.font = { size: 10 };
      vcell.alignment = left; vcell.border = BORDER_BLACK;
    });
    ws.getRow(r).height = 20; r++;
  };

  const wide = (label, val) => {
    ws.mergeCells(r, 1, r, 2);
    const l = ws.getCell(r, 1);
    l.value = label; l.font = lblFont; l.fill = lblFill;
    l.alignment = { ...left, wrapText: true }; l.border = BORDER_BLACK;
    ws.mergeCells(r, 3, r, NC);
    const v = ws.getCell(r, 3);
    v.value = display(val); v.font = { size: 10 };
    v.alignment = { ...left, wrapText: true }; v.border = BORDER_BLACK;
    const lines = String(val ?? "").split("\n").length;
    ws.getRow(r).height = Math.max(22, lines * 15); r++;
  };

  const banner = (text, argbBg, argbText) => {
    ws.mergeCells(r, 1, r, NC);
    const c = ws.getCell(r, 1);
    c.value = text;
    c.font = { bold: true, size: 10, color: { argb: argbText } };
    c.fill = fillSolid(argbBg);
    c.alignment = { ...left, wrapText: true }; c.border = BORDER_BLACK;
    ws.getRow(r).height = 22; r++;
  };

  /* ── 1. Identification ─────────────────────────────────────────────── */
  section("Withdrawal Identification");
  pair("Withdrawal No.", p.withdrawalNumber, "Initiation Date", formatDMY(p.initDate));
  pair("Initiation Time", p.initTime, "Initiated By", p.initiatedBy);
  pair("Decision Approved By", p.decisionBy, "Status", STATUS_LABEL[p.status] || p.status);

  /* ── 2. Distribution scope ─────────────────────────────────────────── */
  section("Distribution Scope");
  pair("Furthest point reached", LEVEL_LABEL[p.distributionLevel] || p.distributionLevel,
       "Reached end consumer", p.consumerReached === "yes" ? "YES" : "No");
  if (escalated) {
    banner(
      "ESCALATION REQUIRED — product reached the end consumer. This case exceeds withdrawal scope and must be handled as a Real Product Recall (§8.9.5)." +
      (p.recallRef ? ` Linked recall: ${p.recallRef}` : ""),
      COLORS.RED_BG, COLORS.RED
    );
  }

  /* ── 3. Level, trigger & reason ────────────────────────────────────── */
  section("Withdrawal Level, Trigger & Reason");
  pair("Withdrawal Level", CLASS_LABEL[p.withdrawalClass] || p.withdrawalClass,
       "Trigger Source", SOURCE_LABEL[p.source] || p.source);
  pair("Reason", REASON_LABEL[p.reason] || p.reason, null, null);
  wide("Reason Detail", p.reasonDetail);

  /* ── 4. Affected product ───────────────────────────────────────────── */
  section("Affected Product");
  pair("Product", p.product, "Item code", p.productCode);
  wide("Affected Batches / Lots", p.batches);
  pair("Production Dates", p.productionDates, "Expiry Range", p.expiryRange);
  pair("Pack size / type", p.packSize, "Traceability Ref.", p.traceRef);
  if (p.traceLink) {
    const tl = p.traceLink;
    const kind = tl.kind === "mock_recall" ? "Traceability drill / Mock Recall" : "Branch traceability log";
    const detail = [
      formatDMY(tl.date),
      tl.branch,
      tl.product,
      tl.batch ? `Lot ${tl.batch}` : "",
      tl.rowsCount ? `${tl.rowsCount} rows` : "",
      tl.tracedPct != null ? `${Number(tl.tracedPct).toFixed(1)}% traced` : "",
    ].filter(Boolean).join(" · ");
    wide("Linked Traceability Record", `${kind} — ${detail}`);
  }

  /* ── 5. Stock hold matrix ──────────────────────────────────────────── */
  section("Quantity Distribution & Stock Hold by Location");
  const cols = [
    "Location / Branch / Customer",
    `Dispatched (${unit})`,
    `Held on site (${unit})`,
    `Returned (${unit})`,
    `Sold / consumed (${unit})`,
    "Responsible",
    "Notified at",
    "Confirmed",
  ];
  cols.forEach((h, i) => {
    const c = ws.getCell(r, i + 1);
    c.value = h;
    c.font = { bold: true, size: 9.5, color: { argb: COLORS.WHITE } };
    c.fill = fillSolid(COLORS.NAVY_LIGHT);
    c.alignment = center; c.border = BORDER_BLACK;
  });
  ws.getRow(r).height = 26; r++;

  if (locations.length === 0) {
    ws.mergeCells(r, 1, r, NC);
    const c = ws.getCell(r, 1);
    c.value = "No locations recorded";
    c.font = { size: 10, italic: true, color: { argb: COLORS.TEXT_MUTED } };
    c.alignment = center; c.border = BORDER_BLACK;
    ws.getRow(r).height = 18; r++;
  } else {
    locations.forEach((l) => {
      const soldRow = num(l.sold) > 0;
      const vals = [
        l.location, l.dispatched, l.held, l.returned, l.sold,
        l.contact, fmtDateTime(l.notifiedAt), l.confirmed ? "✓" : "—",
      ];
      vals.forEach((v, i) => {
        const c = ws.getCell(r, i + 1);
        c.value = display(v);
        c.font = {
          size: 10,
          bold: i === 4 && soldRow,
          color: { argb: i === 4 && soldRow ? COLORS.RED : COLORS.TEXT },
        };
        c.alignment = i === 0 || i === 5 ? left : center;
        c.border = BORDER_BLACK;
        if (soldRow) c.fill = fillSolid(COLORS.RED_BG);
      });
      ws.getRow(r).height = 18; r++;
    });

    // Totals row
    const totalVals = [
      "TOTAL", t.dispatched, t.held, t.returned, t.sold,
      "", "", `${t.confirmed} / ${t.count}`,
    ];
    totalVals.forEach((v, i) => {
      const c = ws.getCell(r, i + 1);
      c.value = display(v);
      c.font = { bold: true, size: 10, color: { argb: i === 4 && t.sold > 0 ? COLORS.RED : COLORS.NAVY } };
      c.fill = fillSolid(COLORS.GRAY_HEAD);
      c.alignment = i === 0 ? left : center;
      c.border = BORDER_BLACK;
    });
    ws.getRow(r).height = 20; r++;
  }

  pair("Stock Secured Rate", t.rate != null ? `${t.rate.toFixed(1)}%  (target 100%)` : "",
       "Secured qty (held + returned)", `${t.secured} ${unit}`.trim());
  if (t.sold > 0) {
    banner(
      `WARNING — ${t.sold} ${unit} were sold or consumed. Escalate to a Real Product Recall and notify the authorities.`,
      COLORS.RED_BG, COLORS.RED
    );
  }

  /* ── 6. Hold & quarantine ──────────────────────────────────────────── */
  section("Hold & Quarantine");
  pair("Hold started", fmtDateTime(p.holdStart), "Securing completed", fmtDateTime(p.holdCompleted));
  pair("Hold / quarantine area", p.holdArea,
       "Time to secure stock", hrs != null ? `${hrs.toFixed(1)} h  (target ≤ 24 h)` : "");
  pair("“HOLD — DO NOT USE” label", TRISTATE[p.holdLabel] || p.holdLabel,
       "Physically segregated", TRISTATE[p.holdSegregated] || p.holdSegregated);
  pair("Blocked in sales / stock system", TRISTATE[p.holdSystemBlock] || p.holdSystemBlock, null, null);

  /* ── 7. Notifications ──────────────────────────────────────────────── */
  section("Notifications");
  ["Party", "Notified"].forEach((h, i) => {
    if (i === 0) ws.mergeCells(r, 1, r, 4); else ws.mergeCells(r, 5, r, NC);
    const c = ws.getCell(r, i === 0 ? 1 : 5);
    c.value = h;
    c.font = { bold: true, size: 10, color: { argb: COLORS.WHITE } };
    c.fill = fillSolid(COLORS.NAVY_LIGHT);
    c.alignment = center; c.border = BORDER_BLACK;
  });
  ws.getRow(r).height = 20; r++;
  const notified = p.notified || {};
  NOTIFY_LABEL.forEach(([k, label]) => {
    ws.mergeCells(r, 1, r, 4);
    ws.mergeCells(r, 5, r, NC);
    const l = ws.getCell(r, 1);
    l.value = label; l.font = { size: 10 }; l.alignment = left; l.border = BORDER_BLACK;
    const v = ws.getCell(r, 5);
    v.value = notified[k] ? "✓" : "—";
    v.font = { size: 10, bold: true, color: { argb: notified[k] ? COLORS.GREEN : COLORS.TEXT_MUTED } };
    v.alignment = center; v.border = BORDER_BLACK;
    ws.getRow(r).height = 18; r++;
  });
  pair("Authority notified", p.authorityNotified === "yes" ? "Yes" : "No",
       "Authority", p.authorityWhich);
  pair("Authority notified at", fmtDateTime(p.authorityAt),
       "Internal circular", p.noticeIssued === "yes" ? (p.noticeRef || "Issued") : "No");

  /* ── 8. Disposition ────────────────────────────────────────────────── */
  section("Disposition of Withdrawn Stock");
  pair("Disposition", DISPOSITION_LABEL[p.disposition] || p.disposition,
       "Destruction record ref.", p.destructionRef);
  if (p.dispositionDetails) wide("Disposition Details", p.dispositionDetails);

  /* ── 9. Cost ───────────────────────────────────────────────────────── */
  section("Withdrawal Cost");
  pair("Total Cost (AED)", p.cost, null, null);
  if (p.costBreakdown) wide("Cost Breakdown", p.costBreakdown);

  /* ── 10. Effectiveness verification ────────────────────────────────── */
  section("Withdrawal Effectiveness Verification");
  pair("Verified By", p.verifiedBy, "Verification Date", formatDMY(p.verificationDate));
  if (p.verificationNotes) wide("Verification Notes", p.verificationNotes);

  /* ── 11. CAPA ──────────────────────────────────────────────────────── */
  section("Root Cause & Actions (CAPA)");
  wide("Root Cause", p.rootCause);
  wide("Corrective Actions", p.correctiveActions);
  wide("Preventive Actions", p.preventiveActions);
  pair("Linked NCR / CAR", p.ncrRef, "Linked Recall No.", p.recallRef);

  /* ── 12. Supporting documents ──────────────────────────────────────── */
  const attachments = Array.isArray(p.attachments) ? p.attachments : [];
  section(`Supporting Documents (${attachments.length})`);
  if (attachments.length === 0) {
    ws.mergeCells(r, 1, r, NC);
    const c = ws.getCell(r, 1);
    c.value = "No supporting documents attached";
    c.font = { size: 10, italic: true, color: { argb: COLORS.TEXT_MUTED } };
    c.alignment = center; c.border = BORDER_BLACK;
    ws.getRow(r).height = 18; r++;
  } else {
    // header: Type | Ref No. | Description | Location | File | Uploaded | Link (2 cols)
    const attCols = ["Document Type", "Reference No.", "Description", "Location", "File", "Uploaded", "Link"];
    attCols.forEach((h, i) => {
      if (i === 6) ws.mergeCells(r, 7, r, 8);
      const c = ws.getCell(r, i + 1);
      c.value = h;
      c.font = { bold: true, size: 9.5, color: { argb: COLORS.WHITE } };
      c.fill = fillSolid(COLORS.NAVY_LIGHT);
      c.alignment = center; c.border = BORDER_BLACK;
    });
    ws.getRow(r).height = 22; r++;

    attachments.forEach((a) => {
      const vals = [
        ATTACHMENT_LABEL[a.category] || a.category || "",
        a.refNo || "",
        a.label || "",
        a.linkedLocation || "",
        a.fileName || "",
        String(a.uploadedAt || "").slice(0, 10),
      ];
      vals.forEach((v, i) => {
        const c = ws.getCell(r, i + 1);
        c.value = display(v);
        c.font = { size: 9.5 };
        c.alignment = i === 0 || i === 2 ? left : center;
        c.border = BORDER_BLACK;
      });
      // Clickable hyperlink to the hosted file so the backup stays usable.
      ws.mergeCells(r, 7, r, 8);
      const link = ws.getCell(r, 7);
      if (a.url) {
        link.value = { text: "Open file", hyperlink: a.url, tooltip: a.url };
        link.font = { size: 9.5, underline: true, color: { argb: "0563C1" } };
      } else {
        link.value = "—";
        link.font = { size: 9.5, color: { argb: COLORS.TEXT_MUTED } };
      }
      link.alignment = center;
      link.border = BORDER_BLACK;
      ws.getRow(r).height = 18; r++;
    });
  }

  /* ── 13. Closure ───────────────────────────────────────────────────── */
  section("Closure");
  pair("Status", STATUS_LABEL[p.status] || p.status, "Closure Date", formatDMY(p.closureDate));

  addFooter(ws, {
    checkedBy:  p.initiatedBy || "",
    verifiedBy: p.signedBy || p.verifiedBy || "",
  }, NC);
  return ws;
}
