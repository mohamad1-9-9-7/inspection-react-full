// src/pages/monitor/branches/qcs/MeatWasteDisposalView.jsx
// QCS — Meat Waste Disposal — ISO/HACCP look + inline edit + smart export
//   • تصميم مطابق لصفحات ISO & HACCP (IsoShell / ISO_UI / شجرة التواريخ)
//   • تعديل كامل للسجل (رأس السجل + بنود الهدر + الصور) وحفظ عبر PUT /api/reports/:id
//   • تصدير ذكي: عدد أشهر / نطاق تاريخ / المحدد فقط، بصيغ PDF · Excel · CSV · JSON
//   • تحليلات ذكية (نوع اللحم / السبب / طريقة التخلص / الشهر / الموقع)

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { addFullPageImage, pdfSafeText } from "./pdfImageUtils";
import {
  DateTreeSidebar,
  EmptyState,
  formatDMY,
  ISO_UI,
  IsoShell,
  monthLabel,
  SidebarLayout,
  toISODate,
  useLightbox,
} from "../_shared/branchViewKit";
import { deleteReport, downloadReportsJson, listReports, REPORTS_MAX_LIMIT, reportId } from "../_shared/reportApi";
import { uploadImageToServer } from "../shipment_recc/qcsRawApi";
import { canDelete, canEdit } from "../../../../utils/perms";
import API_BASE from "../../../../config/api";

const TYPE = "qcs_meat_waste_disposal";
const REPORTER = "qcs";
const MAX_IMAGES_PER_ENTRY = 10;

/* ── Document control (نفس ترويسة سجلات ISO) ───────────────────────────── */
const DOC = {
  title: "Meat Waste Disposal Record",
  no: "FF-QM/REC/MWD",
  issueDate: "05/02/2020",
  revisionNo: "0",
  area: "QA",
  issuedBy: "MOHAMAD ABDULLAH",
  approvedBy: "Hussam O. Sarhan",
  officer: "Quality Controller",
  company: "TRANS EMIRATES LIVESTOCK TRADING L.L.C.",
};

const MEAT_TYPES = ["Chicken", "Beef", "Mutton", "Lamb", "Camel", "Mixed", "Other"];
const REASONS = ["Expired", "Spoiled", "Contaminated", "Damaged Packaging", "Failed Inspection", "Temperature Abuse", "Customer Return", "Other"];
const DISPOSAL_METHODS = ["Incineration", "Burial", "Sent to Disposal Vendor", "Municipality Pickup", "Internal Dumpster", "Other"];
const LOCATIONS = [
  "QCS Warehouse", "POS 10", "POS 11", "POS 15", "POS 19", "POS 24", "POS 26",
  "FTR 1 • Mushrif Park", "FTR 2 • Mamzar Park", "Production (PRD)", "OHC", "Other",
];

/* ── Helpers ───────────────────────────────────────────────────────────── */
const num = (v) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};
const entriesOf = (rec) => (Array.isArray(rec?.payload?.entries) ? rec.payload.entries : []);
const dateOf = (rec) => String(rec?.payload?.reportDate || "");
const monthOf = (rec) => dateOf(rec).slice(0, 7);
const recKg = (rec) => {
  const declared = num(rec?.payload?.totals?.totalKg);
  return declared || entriesOf(rec).reduce((s, e) => s + num(e.quantityKg), 0);
};
const kg = (n) => `${num(n).toFixed(2)} kg`;
const monthTitle = (ym) => {
  const m = String(ym || "").match(/^(\d{4})-(\d{2})$/);
  return m ? `${monthLabel(m[2])} ${m[1]}` : "Undated";
};
/** أول يوم في الشهر بعد الرجوع (n − 1) شهراً — أي "آخر n أشهر" شاملة الشهر الحالي */
const monthsBackStart = (n) => {
  const now = new Date();
  const back = Math.max(1, Math.min(60, Number(n) || 1)) - 1;
  return toISODate(new Date(now.getFullYear(), now.getMonth() - back, 1));
};

function computeStats(records) {
  const byMeat = new Map();
  const byReason = new Map();
  const byMethod = new Map();
  const byLocation = new Map();
  const byMonth = new Map();
  let totalKg = 0;
  let entryCount = 0;

  const bump = (map, key, weight) => {
    const k = String(key || "").trim() || "—";
    const cur = map.get(k) || { kg: 0, count: 0 };
    cur.kg += weight;
    cur.count += 1;
    map.set(k, cur);
  };

  records.forEach((rec) => {
    const p = rec?.payload || {};
    const total = recKg(rec);
    totalKg += total;
    bump(byMonth, monthOf(rec), total);
    bump(byLocation, p.location, total);
    entriesOf(rec).forEach((e) => {
      entryCount += 1;
      const w = num(e.quantityKg);
      bump(byMeat, e.meatType, w);
      bump(byReason, e.reason, w);
      bump(byMethod, e.disposalMethod, w);
    });
  });

  const rank = (map) =>
    [...map.entries()].map(([key, v]) => ({ key, ...v })).sort((a, b) => b.kg - a.kg || b.count - a.count);

  return {
    records: records.length,
    entryCount,
    totalKg,
    avgKg: records.length ? totalKg / records.length : 0,
    byMeat: rank(byMeat),
    byReason: rank(byReason),
    byMethod: rank(byMethod),
    byLocation: rank(byLocation),
    byMonth: [...byMonth.entries()]
      .map(([key, v]) => ({ key, ...v }))
      .sort((a, b) => String(a.key).localeCompare(String(b.key))),
  };
}

const emptyEntry = () => ({
  meatType: MEAT_TYPES[0],
  quantityKg: "",
  reason: REASONS[0],
  reasonDetails: "",
  disposalMethod: DISPOSAL_METHODS[0],
  productCode: "",
  batchNo: "",
  notes: "",
  images: [],
});

/* ── Styles (ISO palette) ──────────────────────────────────────────────── */
const SKY = [14, 165, 233];
const NAVY = [12, 74, 110];
const LIGHT = [224, 242, 254];
const GREYL = [241, 245, 249];

const ST = {
  panel: { background: "#fff", border: "1px solid rgba(15,23,42,0.14)", borderRadius: 14, padding: 12, marginBottom: 12, boxShadow: "0 8px 24px rgba(2,132,199,0.07)" },
  recordCard: { background: "#fff", border: "1px solid rgba(15,23,42,0.16)", borderRadius: 14, padding: 12, marginBottom: 14, boxShadow: "0 10px 26px rgba(2,132,199,0.09)" },
  toolbar: { display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" },
  input: { padding: "8px 10px", border: "1.5px solid #cbd5e1", borderRadius: 10, fontSize: 13, fontWeight: 700, fontFamily: "inherit", color: "#0c4a6e", background: "#fff", minWidth: 140 },
  chip: (on) => ({
    padding: "6px 13px", borderRadius: 999, cursor: "pointer", fontWeight: 800, fontSize: 12.5,
    border: `1.5px solid ${on ? "#0284c7" : "#cbd5e1"}`,
    background: on ? "linear-gradient(180deg,#0ea5e9,#06b6d4)" : "#fff",
    color: on ? "#fff" : "#0c4a6e",
  }),
  kpiGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(140px,1fr))", gap: 10, marginBottom: 12 },
  kpi: (color) => ({ background: "#fff", border: `1px solid ${color}33`, borderTop: `4px solid ${color}`, borderRadius: 12, padding: "10px 12px", textAlign: "center", boxShadow: "0 6px 16px rgba(2,132,199,0.07)" }),
  kpiLabel: { fontSize: 10.5, fontWeight: 900, color: "#64748b", textTransform: "uppercase", letterSpacing: 0.4 },
  kpiValue: (color) => ({ fontSize: 23, fontWeight: 950, marginTop: 3, color }),
  table: { width: "100%", borderCollapse: "collapse", fontSize: 12.5, background: "#fff" },
  th: { ...ISO_UI.thCell, fontSize: 11.5, padding: "7px 5px" },
  td: { ...ISO_UI.tdCell, fontSize: 12.5, padding: "6px 5px" },
  tdLeft: { ...ISO_UI.tdCell, fontSize: 12.5, padding: "6px 8px", textAlign: "left" },
  cellInput: { width: "100%", border: "1px solid #cbd5e1", borderRadius: 6, padding: "5px 6px", fontSize: 12.5, fontFamily: "inherit", boxSizing: "border-box" },
  badge: ISO_UI.metaBadge,
  band: ISO_UI.band,
  monthBand: { background: "linear-gradient(90deg,#0ea5e9,#06b6d4)", color: "#fff", borderRadius: 10, padding: "8px 14px", fontWeight: 900, fontSize: 14.5, margin: "16px 0 10px", display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 8 },
  thumb: { width: 46, height: 46, objectFit: "cover", borderRadius: 6, border: "1px solid #cbd5e1", cursor: "zoom-in", display: "block" },
  sectionTitle: { fontWeight: 900, fontSize: 13.5, color: "#0c4a6e", margin: "0 0 8px" },
  bar: (pct, color) => ({ height: 8, borderRadius: 999, background: color, width: `${Math.max(3, pct)}%` }),
  overlay: { position: "fixed", inset: 0, background: "rgba(2,6,23,0.6)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 9998, padding: 16 },
  modal: { background: "#fff", borderRadius: 16, padding: 22, width: 560, maxWidth: "96vw", maxHeight: "92vh", overflowY: "auto", boxShadow: "0 24px 72px rgba(2,6,23,0.32)" },
  label: { display: "block", fontSize: 11, fontWeight: 900, color: "#64748b", textTransform: "uppercase", marginBottom: 4 },
  radioRow: { display: "flex", alignItems: "center", gap: 8, padding: "7px 9px", borderRadius: 9, cursor: "pointer", marginBottom: 5, border: "1.5px solid transparent" },
  radioRowOn: { border: "1.5px solid #0ea5e9", background: "#f0f9ff" },
};

/* =======================================================================
   PDF (ISO look)
   ======================================================================= */
function pdfDocHeader(doc, startY, subtitle) {
  const pw = doc.internal.pageSize.getWidth();
  const M = 10;
  const lbl = { fontStyle: "bold", fillColor: GREYL, textColor: NAVY };

  autoTable(doc, {
    startY,
    theme: "grid",
    styles: { fontSize: 7.2, cellPadding: 1.6, font: "helvetica", textColor: [15, 23, 42], lineColor: [148, 163, 184], lineWidth: 0.2 },
    body: [
      [{ content: "Document Title:", styles: lbl }, DOC.title, { content: "Document No:", styles: lbl }, DOC.no, { content: "Issue Date:", styles: lbl }, DOC.issueDate],
      [{ content: "Revision No:", styles: lbl }, DOC.revisionNo, { content: "Area:", styles: lbl }, DOC.area, { content: "Controlling Officer:", styles: lbl }, DOC.officer],
      [{ content: "Issued by:", styles: lbl }, DOC.issuedBy, { content: "Approved by:", styles: lbl }, DOC.approvedBy, { content: "Generated:", styles: lbl }, new Date().toLocaleString("en-GB")],
    ],
    margin: { left: M, right: M },
  });

  let y = doc.lastAutoTable.finalY + 3;

  doc.setFillColor(...NAVY);
  doc.rect(M, y, pw - M * 2, 7, "F");
  doc.setTextColor(255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.text(DOC.company, pw / 2, y + 4.8, { align: "center" });
  y += 7;

  doc.setFillColor(...LIGHT);
  doc.rect(M, y, pw - M * 2, 9, "F");
  doc.setTextColor(...NAVY);
  doc.setFontSize(11);
  doc.text("MEAT WASTE DISPOSAL RECORD", pw / 2, y + 6, { align: "center" });
  y += 11;

  if (subtitle) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(71, 85, 105);
    doc.text(subtitle, pw / 2, y, { align: "center" });
    y += 5;
  }
  return y;
}

function pdfKpiRow(doc, y, stats) {
  const pw = doc.internal.pageSize.getWidth();
  const M = 10;
  const boxes = [
    { label: "Records", val: String(stats.records), c: [3, 105, 161] },
    { label: "Entries", val: String(stats.entryCount), c: [147, 51, 234] },
    { label: "Total Quantity (kg)", val: stats.totalKg.toFixed(2), c: [185, 28, 28] },
    { label: "Avg per Record (kg)", val: stats.avgKg.toFixed(2), c: [22, 163, 74] },
  ];
  const bw = (pw - M * 2 - 6) / 4;
  boxes.forEach((b, i) => {
    const x = M + i * (bw + 2);
    doc.setFillColor(...b.c);
    doc.roundedRect(x, y, bw, 15, 2, 2, "F");
    doc.setTextColor(255);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(6.4);
    doc.text(b.label, x + bw / 2, y + 5.4, { align: "center" });
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11.5);
    doc.text(b.val, x + bw / 2, y + 12, { align: "center" });
  });
  return y + 19;
}

function pdfBreakdown(doc, y, title, rows, totalKg) {
  if (!rows.length) return y;
  autoTable(doc, {
    startY: y,
    theme: "grid",
    head: [[{ content: title, colSpan: 4, styles: { fillColor: NAVY, textColor: 255, halign: "left", fontSize: 8 } }], ["Item", "Entries", "Quantity (kg)", "Share"]],
    body: rows.map((r) => [
      pdfSafeText(r.key),
      String(r.count),
      r.kg.toFixed(2),
      totalKg > 0 ? `${((r.kg / totalKg) * 100).toFixed(1)}%` : "—",
    ]),
    styles: { fontSize: 7.6, cellPadding: 1.8, font: "helvetica", lineColor: [148, 163, 184], lineWidth: 0.2 },
    headStyles: { fillColor: SKY, textColor: 255, fontStyle: "bold", fontSize: 7.6 },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    columnStyles: { 1: { halign: "center", cellWidth: 20 }, 2: { halign: "center", cellWidth: 28 }, 3: { halign: "center", cellWidth: 20 } },
    margin: { left: 10, right: 10 },
  });
  return doc.lastAutoTable.finalY + 4;
}

async function buildMeatWastePDF(records, opts = {}) {
  const { includeImages = true, includeSummary = true, groupByMonth = false, scopeLabel = "" } = opts;
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  const pw = doc.internal.pageSize.getWidth();
  const ph = doc.internal.pageSize.getHeight();
  const M = 10;

  const stats = computeStats(records);
  let y = pdfDocHeader(doc, 8, scopeLabel);

  if (includeSummary) {
    y = pdfKpiRow(doc, y, stats);
    y = pdfBreakdown(doc, y, "Breakdown by Meat Type", stats.byMeat, stats.totalKg);
    if (y > ph - 45) { doc.addPage(); y = M; }
    y = pdfBreakdown(doc, y, "Breakdown by Reason", stats.byReason, stats.totalKg);
    if (y > ph - 45) { doc.addPage(); y = M; }
    y = pdfBreakdown(doc, y, "Breakdown by Disposal Method", stats.byMethod, stats.totalKg);
    if (stats.byMonth.length > 1) {
      if (y > ph - 45) { doc.addPage(); y = M; }
      y = pdfBreakdown(doc, y, "Monthly Distribution", stats.byMonth.map((m) => ({ ...m, key: monthTitle(m.key) })), stats.totalKg);
    }
    doc.addPage();
    y = M;
  }

  const groups = groupByMonth
    ? [...records.reduce((map, rec) => {
        const k = monthOf(rec) || "—";
        if (!map.has(k)) map.set(k, []);
        map.get(k).push(rec);
        return map;
      }, new Map()).entries()].sort((a, b) => String(b[0]).localeCompare(String(a[0])))
    : [["", records]];

  let counter = 0;
  for (const [gKey, gRecords] of groups) {
    if (groupByMonth) {
      if (y > ph - 30) { doc.addPage(); y = M; }
      const gKg = gRecords.reduce((s, r) => s + recKg(r), 0);
      doc.setFillColor(...SKY);
      doc.rect(M, y, pw - M * 2, 8, "F");
      doc.setTextColor(255);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9);
      doc.text(`${monthTitle(gKey)}  —  ${gRecords.length} record(s)  |  ${gKg.toFixed(2)} kg`, M + 3, y + 5.5);
      y += 11;
    }

    for (const rec of gRecords) {
      counter += 1;
      const p = rec?.payload || {};
      const entries = entriesOf(rec);
      const total = recKg(rec);
      if (y > ph - 42) { doc.addPage(); y = M; }

      const meta = `#${counter}   |   Date: ${formatDMY(p.reportDate) || "—"}   |   Location: ${pdfSafeText(p.location) || "—"}   |   Disposed by: ${pdfSafeText(p.disposedBy) || "—"}   |   Witness: ${pdfSafeText(p.witness) || "—"}   |   Supervisor: ${pdfSafeText(p.supervisor) || "—"}   |   Total: ${total.toFixed(2)} kg`;

      autoTable(doc, {
        startY: y,
        theme: "grid",
        head: [
          [{ content: meta, colSpan: 9, styles: { fillColor: LIGHT, textColor: NAVY, fontStyle: "bold", fontSize: 7.6, halign: "left", cellPadding: { top: 2.4, bottom: 2.4, left: 3, right: 3 } } }],
          ["#", "Meat Type", "Qty (kg)", "Reason", "Reason Details", "Disposal Method", "Product Code", "Batch No", "Notes"],
        ],
        body: entries.length
          ? entries.map((e, j) => [
              j + 1,
              pdfSafeText(e.meatType),
              e.quantityKg != null && e.quantityKg !== "" ? num(e.quantityKg).toFixed(2) : "—",
              pdfSafeText(e.reason),
              pdfSafeText(e.reasonDetails),
              pdfSafeText(e.disposalMethod),
              pdfSafeText(e.productCode),
              pdfSafeText(e.batchNo),
              pdfSafeText(e.notes),
            ])
          : [[{ content: "No entries recorded", colSpan: 9, styles: { halign: "center", textColor: [148, 163, 184] } }]],
        foot: entries.length
          ? [[{ content: "TOTAL", colSpan: 2, styles: { halign: "right" } }, { content: total.toFixed(2), styles: { halign: "center" } }, { content: "", colSpan: 6 }]]
          : undefined,
        styles: { fontSize: 7.6, cellPadding: 1.9, font: "helvetica", overflow: "linebreak", lineColor: [148, 163, 184], lineWidth: 0.2 },
        headStyles: { fillColor: SKY, textColor: 255, fontStyle: "bold", fontSize: 7.6, halign: "center" },
        footStyles: { fillColor: GREYL, textColor: NAVY, fontStyle: "bold", fontSize: 7.6 },
        alternateRowStyles: { fillColor: [248, 250, 252] },
        columnStyles: {
          0: { halign: "center", cellWidth: 8 },
          1: { halign: "center", cellWidth: 24 },
          2: { halign: "center", cellWidth: 18 },
          3: { halign: "center", cellWidth: 30 },
          5: { halign: "center", cellWidth: 34 },
          6: { halign: "center", cellWidth: 26 },
          7: { halign: "center", cellWidth: 24 },
        },
        margin: { left: M, right: M },
      });
      y = doc.lastAutoTable.finalY + 2;

      if (p.generalNotes) {
        doc.setFont("helvetica", "italic");
        doc.setFontSize(7.2);
        doc.setTextColor(71, 85, 105);
        const lines = doc.splitTextToSize(`General Notes: ${pdfSafeText(p.generalNotes)}`, pw - M * 2);
        if (y + lines.length * 3.6 > ph - 12) { doc.addPage(); y = M; }
        doc.text(lines, M + 1, y + 3);
        y += lines.length * 3.6 + 3;
      }

      if (includeImages) {
        const imgs = entries.flatMap((e, entryIndex) =>
          (e.images || []).filter(Boolean).map((src, imgIndex) => ({ src, entryIndex, imgIndex, entry: e }))
        );
        for (const img of imgs) {
          doc.addPage();
          try {
            await addFullPageImage(doc, img.src, {
              title: `Attachment ${counter}.${img.entryIndex + 1}.${img.imgIndex + 1}`,
              subtitle: `${formatDMY(p.reportDate)} | ${pdfSafeText(p.location)} | Entry #${img.entryIndex + 1} | ${pdfSafeText(img.entry.meatType)} | ${num(img.entry.quantityKg).toFixed(2)} kg | ${pdfSafeText(img.entry.reason)} | Batch: ${pdfSafeText(img.entry.batchNo)} | Code: ${pdfSafeText(img.entry.productCode)}`,
              accent: SKY,
            });
          } catch {
            doc.setTextColor(...NAVY);
            doc.setFont("helvetica", "bold");
            doc.setFontSize(10);
            doc.text("Failed to load attachment image.", M, M + 12);
            doc.setFont("helvetica", "normal");
            doc.setFontSize(7);
            doc.text(String(img.src).slice(0, 140), M, M + 20);
          }
        }
        // بعد صفحات الصور: أجبر السجل التالي على بدء صفحة جديدة بدون صفحة فارغة زائدة
        if (imgs.length) y = ph;
      }

      y += 4;
    }
  }

  const np = doc.internal.getNumberOfPages();
  for (let i = 1; i <= np; i++) {
    doc.setPage(i);
    doc.setDrawColor(203, 213, 225);
    doc.setLineWidth(0.2);
    doc.line(M, ph - 8, pw - M, ph - 8);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(6.8);
    doc.setTextColor(120, 130, 145);
    doc.text(`${DOC.no}  |  ${DOC.title}  |  AL MAWASHI — QCS`, M, ph - 4.5);
    doc.text(`Page ${i} of ${np}`, pw - M, ph - 4.5, { align: "right" });
  }
  return doc;
}

/* =======================================================================
   Excel / CSV
   ======================================================================= */
async function loadExcelJS() {
  try {
    const m = await import("exceljs/dist/exceljs.min.js");
    return m?.default ?? m;
  } catch (_) {
    const m2 = await import("exceljs");
    return m2?.default ?? m2;
  }
}

const XL_BORDER = {
  top: { style: "thin", color: { argb: "FF94A3B8" } },
  left: { style: "thin", color: { argb: "FF94A3B8" } },
  bottom: { style: "thin", color: { argb: "FF94A3B8" } },
  right: { style: "thin", color: { argb: "FF94A3B8" } },
};
const xlFill = (argb) => ({ type: "pattern", pattern: "solid", fgColor: { argb } });

async function exportMeatWasteXlsx(records, opts = {}) {
  const ExcelJS = await loadExcelJS();
  const { saveAs } = await import("file-saver");
  const stats = computeStats(records);
  const wb = new ExcelJS.Workbook();

  /* Sheet 1 — Records (سطر لكل بند) */
  const ws = wb.addWorksheet("Records", { views: [{ showGridLines: false, state: "frozen", ySplit: 8 }] });
  ws.columns = [
    { width: 13 }, { width: 20 }, { width: 18 }, { width: 16 }, { width: 16 },
    { width: 6 }, { width: 14 }, { width: 11 }, { width: 20 }, { width: 26 },
    { width: 22 }, { width: 16 }, { width: 16 }, { width: 22 }, { width: 9 },
  ];
  const NC = 15;

  ws.mergeCells(1, 1, 1, NC);
  const t1 = ws.getCell(1, 1);
  t1.value = `${DOC.company} — ${DOC.title}`;
  t1.font = { bold: true, size: 13, color: { argb: "FFFFFFFF" } };
  t1.fill = xlFill("FF0C4A6E");
  t1.alignment = { horizontal: "center", vertical: "middle" };
  ws.getRow(1).height = 26;

  const docRows = [
    [`Document No: ${DOC.no}`, `Issue Date: ${DOC.issueDate}`, `Revision No: ${DOC.revisionNo}`],
    [`Area: ${DOC.area}`, `Issued by: ${DOC.issuedBy}`, `Approved by: ${DOC.approvedBy}`],
    [`Controlling Officer: ${DOC.officer}`, `Scope: ${opts.scopeLabel || "All records"}`, `Generated: ${new Date().toLocaleString("en-GB")}`],
  ];
  docRows.forEach((cells, i) => {
    const r = 2 + i;
    [[1, 5], [6, 10], [11, NC]].forEach(([a, b], j) => {
      ws.mergeCells(r, a, r, b);
      const c = ws.getCell(r, a);
      c.value = cells[j];
      c.font = { bold: true, size: 9.5, color: { argb: "FF0C4A6E" } };
      c.fill = xlFill("FFF1F5F9");
      c.alignment = { horizontal: "left", vertical: "middle" };
      c.border = XL_BORDER;
    });
    ws.getRow(r).height = 17;
  });

  ws.mergeCells(5, 1, 5, NC);
  const t2 = ws.getCell(5, 1);
  t2.value = `Records: ${stats.records}   |   Entries: ${stats.entryCount}   |   Total: ${stats.totalKg.toFixed(2)} kg   |   Avg/Record: ${stats.avgKg.toFixed(2)} kg`;
  t2.font = { bold: true, size: 11, color: { argb: "FF0C4A6E" } };
  t2.fill = xlFill("FFE0F2FE");
  t2.alignment = { horizontal: "center", vertical: "middle" };
  ws.getRow(5).height = 22;

  const HEADERS = [
    "Report Date", "Location", "Disposed By", "Witness", "Supervisor",
    "Entry #", "Meat Type", "Qty (kg)", "Reason", "Reason Details",
    "Disposal Method", "Product Code", "Batch No", "Entry Notes", "Photos",
  ];
  const hr = ws.getRow(7);
  hr.values = HEADERS;
  hr.height = 26;
  hr.eachCell((cell) => {
    cell.font = { bold: true, size: 10, color: { argb: "FFFFFFFF" } };
    cell.fill = xlFill("FF0EA5E9");
    cell.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
    cell.border = XL_BORDER;
  });

  let r = 8;
  records.forEach((rec, ri) => {
    const p = rec?.payload || {};
    const entries = entriesOf(rec);
    const rows = entries.length ? entries : [null];
    rows.forEach((e, j) => {
      const row = ws.getRow(r);
      row.values = [
        formatDMY(p.reportDate) || "",
        p.location || "",
        p.disposedBy || "",
        p.witness || "",
        p.supervisor || "",
        e ? j + 1 : "",
        e?.meatType || "",
        e ? num(e.quantityKg) : "",
        e?.reason || "",
        e?.reasonDetails || "",
        e?.disposalMethod || "",
        e?.productCode || "",
        e?.batchNo || "",
        e?.notes || "",
        e?.images?.length || 0,
      ];
      row.eachCell((cell, col) => {
        cell.font = { size: 10 };
        cell.alignment = { horizontal: col === 10 || col === 14 ? "left" : "center", vertical: "middle", wrapText: true };
        cell.border = XL_BORDER;
        if (ri % 2) cell.fill = xlFill("FFF8FAFC");
      });
      ws.getRow(r).height = 20;
      r += 1;
    });

    if (p.generalNotes) {
      ws.mergeCells(r, 1, r, NC);
      const c = ws.getCell(r, 1);
      c.value = `General Notes: ${p.generalNotes}`;
      c.font = { italic: true, size: 9.5, color: { argb: "FF475569" } };
      c.alignment = { horizontal: "left", vertical: "middle", wrapText: true };
      c.border = XL_BORDER;
      r += 1;
    }

    ws.mergeCells(r, 1, r, NC);
    const tot = ws.getCell(r, 1);
    tot.value = `Record total — ${formatDMY(p.reportDate) || "—"} : ${recKg(rec).toFixed(2)} kg (${entries.length} entries)`;
    tot.font = { bold: true, size: 10, color: { argb: "FF0C4A6E" } };
    tot.fill = xlFill("FFF1F5F9");
    tot.alignment = { horizontal: "right", vertical: "middle" };
    tot.border = XL_BORDER;
    r += 2;
  });

  /* Sheet 2 — Summary */
  const ss = wb.addWorksheet("Summary", { views: [{ showGridLines: false }] });
  ss.columns = [{ width: 34 }, { width: 14 }, { width: 16 }, { width: 12 }];
  ss.mergeCells(1, 1, 1, 4);
  const st = ss.getCell(1, 1);
  st.value = `Meat Waste Analytics — ${opts.scopeLabel || "All records"}`;
  st.font = { bold: true, size: 12, color: { argb: "FFFFFFFF" } };
  st.fill = xlFill("FF0C4A6E");
  st.alignment = { horizontal: "center", vertical: "middle" };
  ss.getRow(1).height = 24;

  let sr = 3;
  const block = (title, rows) => {
    if (!rows.length) return;
    ss.mergeCells(sr, 1, sr, 4);
    const c = ss.getCell(sr, 1);
    c.value = title;
    c.font = { bold: true, size: 11, color: { argb: "FFFFFFFF" } };
    c.fill = xlFill("FF0EA5E9");
    c.alignment = { horizontal: "left", vertical: "middle" };
    c.border = XL_BORDER;
    ss.getRow(sr).height = 20;
    sr += 1;

    const head = ss.getRow(sr);
    head.values = ["Item", "Entries", "Quantity (kg)", "Share"];
    head.eachCell((cell) => {
      cell.font = { bold: true, size: 10, color: { argb: "FF0C4A6E" } };
      cell.fill = xlFill("FFE0F2FE");
      cell.alignment = { horizontal: "center", vertical: "middle" };
      cell.border = XL_BORDER;
    });
    sr += 1;

    rows.forEach((x) => {
      const row = ss.getRow(sr);
      row.values = [x.key, x.count, Number(x.kg.toFixed(2)), stats.totalKg > 0 ? `${((x.kg / stats.totalKg) * 100).toFixed(1)}%` : "—"];
      row.eachCell((cell, col) => {
        cell.font = { size: 10 };
        cell.alignment = { horizontal: col === 1 ? "left" : "center", vertical: "middle" };
        cell.border = XL_BORDER;
      });
      sr += 1;
    });
    sr += 1;
  };

  block("KPIs", [
    { key: "Total Records", count: stats.records, kg: stats.totalKg },
    { key: "Total Entries", count: stats.entryCount, kg: stats.totalKg },
    { key: "Average per Record", count: stats.records, kg: stats.avgKg },
  ]);
  block("By Meat Type", stats.byMeat);
  block("By Reason", stats.byReason);
  block("By Disposal Method", stats.byMethod);
  block("By Location", stats.byLocation);
  block("By Month", stats.byMonth.map((m) => ({ ...m, key: monthTitle(m.key) })));

  const buf = await wb.xlsx.writeBuffer({ useStyles: true, useSharedStrings: true });
  saveAs(
    new Blob([buf], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }),
    `QCS_MeatWaste_${new Date().toISOString().slice(0, 10)}.xlsx`
  );
}

function exportMeatWasteCsv(records) {
  const headers = [
    "Report Date", "Location", "Disposed By", "Witness", "Supervisor", "General Notes",
    "Entry #", "Meat Type", "Qty (kg)", "Reason", "Reason Details",
    "Disposal Method", "Product Code", "Batch No", "Entry Notes", "Photos",
  ];
  const lines = [headers];
  records.forEach((rec) => {
    const p = rec?.payload || {};
    const entries = entriesOf(rec);
    (entries.length ? entries : [null]).forEach((e, j) => {
      lines.push([
        p.reportDate || "", p.location || "", p.disposedBy || "", p.witness || "", p.supervisor || "", p.generalNotes || "",
        e ? j + 1 : "", e?.meatType || "", e ? num(e.quantityKg).toFixed(2) : "", e?.reason || "", e?.reasonDetails || "",
        e?.disposalMethod || "", e?.productCode || "", e?.batchNo || "", e?.notes || "", (e?.images || []).join(" | "),
      ]);
    });
  });
  const csv = "﻿" + lines.map((r) => r.map((v) => `"${String(v ?? "").replace(/"/g, '""')}"`).join(",")).join("\r\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `QCS_MeatWaste_${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(a.href);
}

/* =======================================================================
   Component
   ======================================================================= */
export default function MeatWasteDisposalView() {
  const { openImage, lightbox } = useLightbox();

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  // Smart filters
  const [search, setSearch] = useState("");
  const [dateKey, setDateKey] = useState("");
  const [quickRange, setQuickRange] = useState("all"); // all | 1 | 3 | 6 | 12
  const [meatFilter, setMeatFilter] = useState("all");
  const [reasonFilter, setReasonFilter] = useState("all");
  const [methodFilter, setMethodFilter] = useState("all");
  const [locationFilter, setLocationFilter] = useState("all");
  const [sortBy, setSortBy] = useState("date_desc");
  const [groupMonths, setGroupMonths] = useState(false);
  const [showStats, setShowStats] = useState(false);

  // Selection (for "selected only" export)
  const [selected, setSelected] = useState(() => new Set());

  // Inline edit
  const [editingId, setEditingId] = useState("");
  const [draft, setDraft] = useState(null);
  const [saving, setSaving] = useState(false);
  const [uploadingKey, setUploadingKey] = useState("");
  const fileRefs = useRef({});

  // Export
  const [exportOpen, setExportOpen] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [ex, setEx] = useState({
    scope: "months",
    months: 3,
    from: "",
    to: "",
    format: "pdf",
    includeImages: true,
    includeSummary: true,
    groupByMonth: true,
  });

  const load = useCallback(async () => {
    setLoading(true);
    setErr("");
    try {
      const arr = await listReports(TYPE, { limit: REPORTS_MAX_LIMIT });
      arr.sort((a, b) => String(dateOf(b)).localeCompare(String(dateOf(a))));
      setItems(arr);
    } catch (e) {
      setItems([]);
      setErr(e?.message || "Failed to load records.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  /* ── Options built from real data ── */
  const opt = useMemo(() => {
    const meat = new Set();
    const reason = new Set();
    const method = new Set();
    const location = new Set();
    items.forEach((r) => {
      if (r?.payload?.location) location.add(r.payload.location);
      entriesOf(r).forEach((e) => {
        if (e.meatType) meat.add(e.meatType);
        if (e.reason) reason.add(e.reason);
        if (e.disposalMethod) method.add(e.disposalMethod);
      });
    });
    return {
      meat: [...meat].sort(),
      reason: [...reason].sort(),
      method: [...method].sort(),
      location: [...location].sort(),
    };
  }, [items]);

  const rangeStart = quickRange === "all" ? "" : monthsBackStart(Number(quickRange));

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const out = items.filter((rec) => {
      const p = rec?.payload || {};
      const entries = entriesOf(rec);
      const d = dateOf(rec);

      if (dateKey && d !== dateKey) return false;
      if (rangeStart && d && d < rangeStart) return false;
      if (locationFilter !== "all" && p.location !== locationFilter) return false;
      if (meatFilter !== "all" && !entries.some((e) => e.meatType === meatFilter)) return false;
      if (reasonFilter !== "all" && !entries.some((e) => e.reason === reasonFilter)) return false;
      if (methodFilter !== "all" && !entries.some((e) => e.disposalMethod === methodFilter)) return false;

      if (!q) return true;
      const hay = [
        p.reportDate, p.location, p.disposedBy, p.witness, p.supervisor, p.generalNotes,
        ...entries.flatMap((e) => [e.meatType, e.reason, e.reasonDetails, e.disposalMethod, e.productCode, e.batchNo, e.notes]),
      ].map((x) => String(x || "").toLowerCase()).join(" ");
      return hay.includes(q);
    });

    const sorted = [...out];
    if (sortBy === "date_asc") sorted.sort((a, b) => String(dateOf(a)).localeCompare(String(dateOf(b))));
    else if (sortBy === "kg_desc") sorted.sort((a, b) => recKg(b) - recKg(a));
    else if (sortBy === "kg_asc") sorted.sort((a, b) => recKg(a) - recKg(b));
    else sorted.sort((a, b) => String(dateOf(b)).localeCompare(String(dateOf(a))));
    return sorted;
  }, [items, search, dateKey, rangeStart, meatFilter, reasonFilter, methodFilter, locationFilter, sortBy]);

  const stats = useMemo(() => computeStats(filtered), [filtered]);

  const treeItems = useMemo(() => {
    const map = new Map();
    items.forEach((rec) => {
      const d = dateOf(rec);
      if (!/^\d{4}-\d{2}-\d{2}$/.test(d)) return;
      map.set(d, (map.get(d) || 0) + 1);
    });
    return [...map.entries()]
      .sort((a, b) => b[0].localeCompare(a[0]))
      .map(([d, n]) => ({ key: d, dateISO: d, label: `${formatDMY(d)} (${n})`, data: d }));
  }, [items]);

  const grouped = useMemo(() => {
    if (!groupMonths) return [["", filtered]];
    const map = new Map();
    filtered.forEach((rec) => {
      const k = monthOf(rec) || "—";
      if (!map.has(k)) map.set(k, []);
      map.get(k).push(rec);
    });
    return [...map.entries()].sort((a, b) => String(b[0]).localeCompare(String(a[0])));
  }, [filtered, groupMonths]);

  const filtersActive =
    !!search || !!dateKey || quickRange !== "all" || meatFilter !== "all" ||
    reasonFilter !== "all" || methodFilter !== "all" || locationFilter !== "all";

  function clearFilters() {
    setSearch(""); setDateKey(""); setQuickRange("all");
    setMeatFilter("all"); setReasonFilter("all"); setMethodFilter("all"); setLocationFilter("all");
  }

  /* ── Selection ── */
  const toggleSelect = (id) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  const selectAllFiltered = () => setSelected(new Set(filtered.map((r) => reportId(r)).filter(Boolean)));
  const clearSelection = () => setSelected(new Set());

  /* ── Delete ── */
  async function del(rec) {
    const id = reportId(rec);
    if (!id) return alert("⚠️ Missing record id.");
    if (!window.confirm(`Delete the record of ${formatDMY(dateOf(rec))} permanently?`)) return;
    try {
      await deleteReport(id);
      setSelected((prev) => { const n = new Set(prev); n.delete(id); return n; });
      if (editingId === id) { setEditingId(""); setDraft(null); }
      await load();
    } catch (e) {
      alert("❌ Delete failed: " + (e?.message || e));
    }
  }

  /* ── Edit ── */
  function startEdit(rec) {
    const p = rec?.payload || {};
    setEditingId(reportId(rec));
    setDraft({
      reportDate: p.reportDate || "",
      location: p.location || "",
      disposedBy: p.disposedBy || "",
      witness: p.witness || "",
      supervisor: p.supervisor || "",
      generalNotes: p.generalNotes || "",
      entries: (Array.isArray(p.entries) ? p.entries : []).map((e) => ({
        meatType: e.meatType || MEAT_TYPES[0],
        quantityKg: e.quantityKg ?? "",
        reason: e.reason || REASONS[0],
        reasonDetails: e.reasonDetails || "",
        disposalMethod: e.disposalMethod || DISPOSAL_METHODS[0],
        productCode: e.productCode || "",
        batchNo: e.batchNo || "",
        notes: e.notes || "",
        images: Array.isArray(e.images) ? [...e.images] : [],
      })),
    });
  }

  function cancelEdit() {
    if (saving) return;
    setEditingId("");
    setDraft(null);
  }

  const setDraftField = (key, value) => setDraft((d) => ({ ...d, [key]: value }));
  const setEntryField = (idx, key, value) =>
    setDraft((d) => ({ ...d, entries: d.entries.map((e, i) => (i === idx ? { ...e, [key]: value } : e)) }));
  const addEntryRow = () => setDraft((d) => ({ ...d, entries: [...d.entries, emptyEntry()] }));
  const removeEntryRow = (idx) => {
    if (!window.confirm(`Remove entry #${idx + 1}?`)) return;
    setDraft((d) => ({ ...d, entries: d.entries.filter((_, i) => i !== idx) }));
  };

  async function addImages(idx, fileList) {
    const files = Array.from(fileList || []).filter((f) => String(f.type || "").startsWith("image/"));
    if (!files.length) return;
    const current = draft?.entries?.[idx]?.images || [];
    const remaining = MAX_IMAGES_PER_ENTRY - current.length;
    if (remaining <= 0) { alert(`Maximum ${MAX_IMAGES_PER_ENTRY} images per entry.`); return; }
    setUploadingKey(`${editingId}:${idx}`);
    try {
      const urls = [];
      for (const f of files.slice(0, remaining)) {
        try {
          const u = await uploadImageToServer(f, "qcs_meat_waste");
          if (u) urls.push(u);
        } catch (e) {
          console.warn("upload failed", e);
        }
      }
      if (!urls.length) alert("❌ No image uploaded.");
      else setEntryField(idx, "images", [...current, ...urls].slice(0, MAX_IMAGES_PER_ENTRY));
    } finally {
      setUploadingKey("");
      const ref = fileRefs.current[idx];
      if (ref) ref.value = "";
    }
  }

  function removeImage(idx, imgIdx) {
    setDraft((d) => ({
      ...d,
      entries: d.entries.map((e, i) => (i === idx ? { ...e, images: e.images.filter((_, j) => j !== imgIdx) } : e)),
    }));
  }

  async function saveEdit(rec) {
    if (!draft) return;
    if (!draft.reportDate) return alert("⚠️ Report date is required.");
    if (!String(draft.disposedBy || "").trim()) return alert("⚠️ 'Disposed By' is required.");
    if (!draft.entries.length) return alert("⚠️ Add at least one entry.");
    if (draft.entries.some((e) => e.quantityKg === "" || e.quantityKg == null))
      return alert("⚠️ Enter a quantity for every entry.");

    const id = reportId(rec);
    if (!id) return alert("⚠️ Missing record id — cannot update.");

    const entries = draft.entries.map((e) => ({
      meatType: e.meatType,
      quantityKg: num(e.quantityKg),
      reason: e.reason,
      reasonDetails: e.reasonDetails,
      disposalMethod: e.disposalMethod,
      productCode: e.productCode,
      batchNo: e.batchNo,
      notes: e.notes,
      images: e.images || [],
    }));
    const totalKg = entries.reduce((s, e) => s + num(e.quantityKg), 0);

    // multi-per-day type ⇒ update by id (PUT /api/reports/:id) وليس الـ upsert العام
    const payload = {
      ...(rec?.payload || {}),
      reportDate: draft.reportDate,
      location: draft.location,
      disposedBy: draft.disposedBy,
      witness: draft.witness,
      supervisor: draft.supervisor,
      generalNotes: draft.generalNotes,
      entries,
      totals: { totalKg, entryCount: entries.length },
      updatedAt: Date.now(),
    };

    setSaving(true);
    try {
      const res = await fetch(`${String(API_BASE).replace(/\/$/, "")}/api/reports/${encodeURIComponent(id)}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reporter: REPORTER, type: TYPE, payload }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setEditingId("");
      setDraft(null);
      await load();
      alert("✅ Changes saved.");
    } catch (e) {
      alert("❌ Saving failed: " + (e?.message || e));
    } finally {
      setSaving(false);
    }
  }

  /* ── Export ── */
  const exportRecords = useMemo(() => {
    if (ex.scope === "selected") return items.filter((r) => selected.has(reportId(r)));
    if (ex.scope === "months") {
      const start = monthsBackStart(ex.months);
      return items.filter((r) => { const d = dateOf(r); return d && d >= start; });
    }
    if (ex.scope === "range") {
      return items.filter((r) => {
        const d = dateOf(r);
        return (!ex.from || d >= ex.from) && (!ex.to || d <= ex.to);
      });
    }
    return filtered; // "filtered"
  }, [ex.scope, ex.months, ex.from, ex.to, items, filtered, selected]);

  const exportSorted = useMemo(
    () => [...exportRecords].sort((a, b) => String(dateOf(b)).localeCompare(String(dateOf(a)))),
    [exportRecords]
  );
  const exportStats = useMemo(() => computeStats(exportSorted), [exportSorted]);

  const scopeLabel = useMemo(() => {
    if (ex.scope === "months") {
      const start = monthsBackStart(ex.months);
      return `Last ${ex.months} month(s) — ${formatDMY(start)} → ${formatDMY(toISODate(new Date()))}`;
    }
    if (ex.scope === "range") return `Date range — ${ex.from ? formatDMY(ex.from) : "start"} → ${ex.to ? formatDMY(ex.to) : "today"}`;
    if (ex.scope === "selected") return `Selected records (${selected.size})`;
    return `Currently displayed records${filtersActive ? " (filtered)" : ""}`;
  }, [ex.scope, ex.months, ex.from, ex.to, selected.size, filtersActive]);

  async function runExport() {
    if (!exportSorted.length) { alert("⚠️ No records match the selected export scope."); return; }
    setExporting(true);
    try {
      if (ex.format === "pdf") {
        const doc = await buildMeatWastePDF(exportSorted, {
          includeImages: ex.includeImages,
          includeSummary: ex.includeSummary,
          groupByMonth: ex.groupByMonth,
          scopeLabel,
        });
        doc.save(`QCS_MeatWaste_${new Date().toISOString().slice(0, 10)}.pdf`);
      } else if (ex.format === "xlsx") {
        await exportMeatWasteXlsx(exportSorted, { scopeLabel });
      } else if (ex.format === "csv") {
        exportMeatWasteCsv(exportSorted);
      } else {
        downloadReportsJson(TYPE, exportSorted, "QCS_MeatWaste_Disposal");
      }
      setExportOpen(false);
    } catch (e) {
      console.error(e);
      alert("❌ Export failed: " + (e?.message || e));
    } finally {
      setExporting(false);
    }
  }

  async function exportSingle(rec) {
    setExporting(true);
    try {
      const doc = await buildMeatWastePDF([rec], {
        includeImages: true,
        includeSummary: false,
        groupByMonth: false,
        scopeLabel: `Single record — ${formatDMY(dateOf(rec))} | ${rec?.payload?.location || "—"}`,
      });
      doc.save(`QCS_MeatWaste_${dateOf(rec) || "record"}.pdf`);
    } catch (e) {
      alert("❌ Export failed: " + (e?.message || e));
    } finally {
      setExporting(false);
    }
  }

  /* ── Render helpers ── */
  const renderBreakdown = (title, rows, color) => (
    <div style={{ flex: "1 1 240px", minWidth: 230 }}>
      <div style={ST.sectionTitle}>{title}</div>
      {rows.length === 0 && <div style={{ color: "#94a3b8", fontSize: 12.5, fontWeight: 700 }}>—</div>}
      {rows.slice(0, 8).map((rw) => {
        const pct = stats.totalKg > 0 ? (rw.kg / stats.totalKg) * 100 : 0;
        return (
          <div key={rw.key} style={{ marginBottom: 7 }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, fontWeight: 800, color: "#0f172a" }}>
              <span>{rw.key}</span>
              <span style={{ color: "#475569" }}>{rw.kg.toFixed(2)} kg · {pct.toFixed(1)}%</span>
            </div>
            <div style={{ background: "#e2e8f0", borderRadius: 999, marginTop: 3 }}>
              <div style={ST.bar(pct, color)} />
            </div>
          </div>
        );
      })}
    </div>
  );

  function renderRecord(rec, index) {
    const id = reportId(rec);
    const p = rec?.payload || {};
    const isEditing = editingId === id;
    const entries = isEditing ? draft?.entries || [] : entriesOf(rec);
    const total = isEditing
      ? entries.reduce((s, e) => s + num(e.quantityKg), 0)
      : recKg(rec);

    return (
      <div key={id || index} style={ST.recordCard}>
        {/* Record top bar */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8, marginBottom: 10 }}>
          <label style={{ display: "flex", alignItems: "center", gap: 8, fontWeight: 900, fontSize: 15, color: "#0c4a6e", cursor: "pointer" }}>
            <input type="checkbox" checked={selected.has(id)} onChange={() => toggleSelect(id)} style={{ width: 16, height: 16 }} />
            🥩 {formatDMY(dateOf(rec)) || "—"} — {p.location || "—"}
          </label>
          <div style={{ display: "flex", gap: 7, flexWrap: "wrap" }}>
            {!isEditing && (
              <>
                <button style={ISO_UI.btn("secondary")} onClick={() => exportSingle(rec)} disabled={exporting}>
                  {exporting ? "…" : "PDF"}
                </button>
                {canEdit("daily") && (
                  <button style={ISO_UI.btn("violet")} onClick={() => startEdit(rec)}>✏️ Edit</button>
                )}
                {canDelete("daily") && (
                  <button style={ISO_UI.btn("danger")} onClick={() => del(rec)} data-delete-action="true">Delete</button>
                )}
              </>
            )}
            {isEditing && (
              <>
                <button style={ISO_UI.btn("success", saving)} onClick={() => saveEdit(rec)} disabled={saving}>
                  {saving ? "Saving…" : "💾 Save Changes"}
                </button>
                <button style={ISO_UI.btn("secondary", saving)} onClick={cancelEdit} disabled={saving}>Cancel</button>
              </>
            )}
          </div>
        </div>

        {/* Meta badges (ISO document style) */}
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 8 }}>
          <span style={ST.badge}><strong>Document No:</strong> {DOC.no}</span>
          <span style={ST.badge}><strong>Revision:</strong> {DOC.revisionNo}</span>
          <span style={ST.badge}><strong>Entries:</strong> {entries.length}</span>
          <span style={{ ...ST.badge, background: "#e0f2fe", fontWeight: 900 }}><strong>Total:</strong> {kg(total)}</span>
        </div>

        {/* Header fields */}
        {!isEditing ? (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 10 }}>
            <span style={ST.badge}><strong>Report Date:</strong> {formatDMY(p.reportDate) || "—"}</span>
            <span style={ST.badge}><strong>Location:</strong> {p.location || "—"}</span>
            <span style={ST.badge}><strong>Disposed by:</strong> {p.disposedBy || "—"}</span>
            <span style={ST.badge}><strong>Witness:</strong> {p.witness || "—"}</span>
            <span style={ST.badge}><strong>Supervisor:</strong> {p.supervisor || "—"}</span>
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", gap: 10, marginBottom: 10 }}>
            <div>
              <span style={ST.label}>Report Date *</span>
              <input type="date" style={{ ...ST.input, width: "100%" }} value={draft.reportDate} onChange={(e) => setDraftField("reportDate", e.target.value)} />
            </div>
            <div>
              <span style={ST.label}>Location</span>
              <select style={{ ...ST.input, width: "100%" }} value={draft.location} onChange={(e) => setDraftField("location", e.target.value)}>
                {[...new Set([draft.location, ...LOCATIONS].filter(Boolean))].map((l) => <option key={l} value={l}>{l}</option>)}
              </select>
            </div>
            <div>
              <span style={ST.label}>Disposed By *</span>
              <input style={{ ...ST.input, width: "100%" }} value={draft.disposedBy} onChange={(e) => setDraftField("disposedBy", e.target.value)} />
            </div>
            <div>
              <span style={ST.label}>Witness</span>
              <input style={{ ...ST.input, width: "100%" }} value={draft.witness} onChange={(e) => setDraftField("witness", e.target.value)} />
            </div>
            <div>
              <span style={ST.label}>Supervisor</span>
              <input style={{ ...ST.input, width: "100%" }} value={draft.supervisor} onChange={(e) => setDraftField("supervisor", e.target.value)} />
            </div>
            <div>
              <span style={ST.label}>Total (auto)</span>
              <input readOnly value={total.toFixed(2)} style={{ ...ST.input, width: "100%", background: "#f1f5f9", fontWeight: 950 }} />
            </div>
          </div>
        )}

        {/* Entries table */}
        <div style={{ overflowX: "auto" }}>
          <table style={ST.table}>
            <thead>
              <tr style={ISO_UI.theadRow}>
                <th style={{ ...ST.th, width: 34 }}>#</th>
                <th style={{ ...ST.th, minWidth: 110 }}>Meat Type</th>
                <th style={{ ...ST.th, minWidth: 80 }}>Qty (kg)</th>
                <th style={{ ...ST.th, minWidth: 120 }}>Reason</th>
                <th style={{ ...ST.th, minWidth: 150 }}>Reason Details</th>
                <th style={{ ...ST.th, minWidth: 140 }}>Disposal Method</th>
                <th style={{ ...ST.th, minWidth: 110 }}>Product Code</th>
                <th style={{ ...ST.th, minWidth: 100 }}>Batch No</th>
                <th style={{ ...ST.th, minWidth: 130 }}>Notes</th>
                <th style={{ ...ST.th, minWidth: 120 }}>Photos</th>
                {isEditing && <th style={{ ...ST.th, width: 52 }}>—</th>}
              </tr>
            </thead>
            <tbody>
              {entries.length === 0 && (
                <tr>
                  <td style={{ ...ST.td, color: "#94a3b8", fontWeight: 700 }} colSpan={isEditing ? 11 : 10}>No entries recorded.</td>
                </tr>
              )}
              {entries.map((e, j) => (
                <tr key={j} style={{ background: j % 2 ? "#f8fafc" : "#fff" }}>
                  <td style={ST.td}>{j + 1}</td>
                  <td style={ST.td}>
                    {!isEditing ? (e.meatType || "—") : (
                      <select style={ST.cellInput} value={e.meatType} onChange={(ev) => setEntryField(j, "meatType", ev.target.value)}>
                        {[...new Set([e.meatType, ...MEAT_TYPES].filter(Boolean))].map((t) => <option key={t} value={t}>{t}</option>)}
                      </select>
                    )}
                  </td>
                  <td style={{ ...ST.td, fontWeight: 900, color: "#b91c1c" }}>
                    {!isEditing ? num(e.quantityKg).toFixed(2) : (
                      <input type="number" min="0" step="0.01" style={ST.cellInput} value={e.quantityKg} onChange={(ev) => setEntryField(j, "quantityKg", ev.target.value)} />
                    )}
                  </td>
                  <td style={ST.td}>
                    {!isEditing ? (e.reason || "—") : (
                      <select style={ST.cellInput} value={e.reason} onChange={(ev) => setEntryField(j, "reason", ev.target.value)}>
                        {[...new Set([e.reason, ...REASONS].filter(Boolean))].map((t) => <option key={t} value={t}>{t}</option>)}
                      </select>
                    )}
                  </td>
                  <td style={ST.tdLeft}>
                    {!isEditing ? (e.reasonDetails || "—") : (
                      <input style={ST.cellInput} value={e.reasonDetails} onChange={(ev) => setEntryField(j, "reasonDetails", ev.target.value)} />
                    )}
                  </td>
                  <td style={ST.td}>
                    {!isEditing ? (e.disposalMethod || "—") : (
                      <select style={ST.cellInput} value={e.disposalMethod} onChange={(ev) => setEntryField(j, "disposalMethod", ev.target.value)}>
                        {[...new Set([e.disposalMethod, ...DISPOSAL_METHODS].filter(Boolean))].map((t) => <option key={t} value={t}>{t}</option>)}
                      </select>
                    )}
                  </td>
                  <td style={ST.td}>
                    {!isEditing ? (e.productCode || "—") : (
                      <input style={ST.cellInput} value={e.productCode} onChange={(ev) => setEntryField(j, "productCode", ev.target.value)} />
                    )}
                  </td>
                  <td style={ST.td}>
                    {!isEditing ? (e.batchNo || "—") : (
                      <input style={ST.cellInput} value={e.batchNo} onChange={(ev) => setEntryField(j, "batchNo", ev.target.value)} />
                    )}
                  </td>
                  <td style={ST.tdLeft}>
                    {!isEditing ? (e.notes || "—") : (
                      <input style={ST.cellInput} value={e.notes} onChange={(ev) => setEntryField(j, "notes", ev.target.value)} />
                    )}
                  </td>
                  <td style={ST.td}>
                    <div style={{ display: "flex", gap: 4, flexWrap: "wrap", justifyContent: "center" }}>
                      {(e.images || []).map((u, k) => (
                        <div key={`${u}-${k}`} style={{ position: "relative" }}>
                          <img src={u} alt={`Attachment ${k + 1}`} style={ST.thumb} onClick={() => openImage(u, e.images)} />
                          {isEditing && (
                            <button
                              onClick={() => removeImage(j, k)}
                              title="Remove photo"
                              style={{ position: "absolute", top: -6, right: -6, width: 18, height: 18, borderRadius: "50%", border: "none", background: "#ef4444", color: "#fff", fontSize: 11, fontWeight: 900, cursor: "pointer", lineHeight: 1 }}
                            >
                              ×
                            </button>
                          )}
                        </div>
                      ))}
                      {!isEditing && !(e.images || []).length && <span style={{ color: "#94a3b8" }}>—</span>}
                    </div>
                    {isEditing && (
                      <div style={{ marginTop: 5 }}>
                        <input
                          ref={(r) => { fileRefs.current[j] = r; }}
                          type="file"
                          accept="image/*"
                          multiple
                          disabled={uploadingKey === `${editingId}:${j}` || (e.images || []).length >= MAX_IMAGES_PER_ENTRY}
                          onChange={(ev) => addImages(j, ev.target.files)}
                          style={{ fontSize: 10.5, width: 118 }}
                        />
                        <div style={{ fontSize: 10, color: "#64748b", fontWeight: 700 }}>
                          {uploadingKey === `${editingId}:${j}` ? "Uploading…" : `${(e.images || []).length} / ${MAX_IMAGES_PER_ENTRY}`}
                        </div>
                      </div>
                    )}
                  </td>
                  {isEditing && (
                    <td style={ST.td}>
                      <button onClick={() => removeEntryRow(j)} style={{ ...ISO_UI.btn("danger"), padding: "4px 9px", fontSize: 11 }} data-delete-action="true">🗑</button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <td style={{ ...ST.td, textAlign: "right", fontWeight: 900, background: "#f1f5f9", color: "#0c4a6e" }} colSpan={2}>TOTAL</td>
                <td style={{ ...ST.td, fontWeight: 950, background: "#f1f5f9", color: "#b91c1c" }}>{total.toFixed(2)}</td>
                <td style={{ ...ST.td, background: "#f1f5f9" }} colSpan={isEditing ? 8 : 7} />
              </tr>
            </tfoot>
          </table>
        </div>

        {isEditing && (
          <div style={{ marginTop: 8 }}>
            <button style={ISO_UI.btn("success")} onClick={addEntryRow}>+ Add Entry</button>
          </div>
        )}

        {/* General notes */}
        <div style={{ marginTop: 10 }}>
          <span style={ST.label}>General Notes</span>
          {!isEditing ? (
            <div style={{ fontSize: 13, fontWeight: 700, color: p.generalNotes ? "#334155" : "#94a3b8" }}>{p.generalNotes || "—"}</div>
          ) : (
            <textarea
              style={{ ...ST.input, width: "100%", minHeight: 56, resize: "vertical", fontWeight: 600 }}
              value={draft.generalNotes}
              onChange={(e) => setDraftField("generalNotes", e.target.value)}
            />
          )}
        </div>

        {/* Signatures line (ISO footer look) */}
        {!isEditing && (
          <div style={{ marginTop: 12, paddingTop: 8, borderTop: "2px solid #e0f2fe", display: "flex", gap: 18, flexWrap: "wrap", fontSize: 12.5, color: "#0c4a6e" }}>
            <div><strong>Disposed by:</strong> <span style={{ borderBottom: "1.5px solid #bae6fd", paddingInline: 10 }}>{p.disposedBy || "—"}</span></div>
            <div><strong>Witness:</strong> <span style={{ borderBottom: "1.5px solid #bae6fd", paddingInline: 10 }}>{p.witness || "—"}</span></div>
            <div><strong>Supervisor:</strong> <span style={{ borderBottom: "1.5px solid #bae6fd", paddingInline: 10 }}>{p.supervisor || "—"}</span></div>
          </div>
        )}
      </div>
    );
  }

  /* ── Page ── */
  return (
    <IsoShell
      icon="🥩"
      title="Meat Waste Disposal Records"
      subtitle={`${DOC.no} — ${DOC.title} | QCS · view, edit, analyze & smart-export`}
      actions={
        <>
          <button style={ISO_UI.btn(showStats ? "primary" : "secondary")} onClick={() => setShowStats((v) => !v)}>
            📊 {showStats ? "Hide Analytics" : "Analytics"}
          </button>
          <button style={ISO_UI.btn(groupMonths ? "primary" : "secondary")} onClick={() => setGroupMonths((v) => !v)}>
            🗂 {groupMonths ? "Ungroup" : "Group by Month"}
          </button>
          <button style={ISO_UI.btn("violet")} onClick={() => setExportOpen(true)}>⬇️ Smart Export</button>
          <button style={ISO_UI.btn("secondary", loading)} onClick={load} disabled={loading}>
            {loading ? "Loading…" : "🔄 Refresh"}
          </button>
        </>
      }
    >
      <SidebarLayout
        sidebarWidth={272}
        sidebar={
          <DateTreeSidebar
            items={treeItems}
            activeKey={dateKey}
            onPick={(it) => setDateKey((cur) => (cur === it.data ? "" : it.data))}
            loading={loading && !items.length}
            title="📅 Disposal Dates"
            emptyText="No records yet."
            topSlot={
              <div style={{ marginBottom: 10 }}>
                <button style={{ ...ISO_UI.btn(dateKey ? "primary" : "secondary"), width: "100%" }} onClick={() => setDateKey("")}>
                  {dateKey ? `📌 ${formatDMY(dateKey)} — show all` : "All dates"}
                </button>
              </div>
            }
          />
        }
      >
        {/* KPIs */}
        <div style={ST.kpiGrid}>
          <div style={ST.kpi("#0369a1")}>
            <div style={ST.kpiLabel}>Records</div>
            <div style={ST.kpiValue("#0369a1")}>{stats.records}</div>
          </div>
          <div style={ST.kpi("#9333ea")}>
            <div style={ST.kpiLabel}>Entries</div>
            <div style={ST.kpiValue("#9333ea")}>{stats.entryCount}</div>
          </div>
          <div style={ST.kpi("#dc2626")}>
            <div style={ST.kpiLabel}>Total Quantity</div>
            <div style={ST.kpiValue("#dc2626")}>{stats.totalKg.toFixed(2)}</div>
          </div>
          <div style={ST.kpi("#16a34a")}>
            <div style={ST.kpiLabel}>Avg / Record</div>
            <div style={ST.kpiValue("#16a34a")}>{stats.avgKg.toFixed(2)}</div>
          </div>
          <div style={ST.kpi("#0891b2")}>
            <div style={ST.kpiLabel}>Top Meat Type</div>
            <div style={{ ...ST.kpiValue("#0891b2"), fontSize: 16 }}>{stats.byMeat[0]?.key || "—"}</div>
          </div>
          <div style={ST.kpi("#d97706")}>
            <div style={ST.kpiLabel}>Top Reason</div>
            <div style={{ ...ST.kpiValue("#d97706"), fontSize: 16 }}>{stats.byReason[0]?.key || "—"}</div>
          </div>
        </div>

        {/* Smart filter toolbar */}
        <div style={ST.panel}>
          <div style={{ ...ST.toolbar, marginBottom: 8 }}>
            <input
              style={{ ...ST.input, flex: "1 1 260px", minWidth: 200 }}
              placeholder="🔎 Search: meat, reason, batch, code, person, notes…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <select style={ST.input} value={meatFilter} onChange={(e) => setMeatFilter(e.target.value)}>
              <option value="all">All meat types</option>
              {opt.meat.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
            <select style={ST.input} value={reasonFilter} onChange={(e) => setReasonFilter(e.target.value)}>
              <option value="all">All reasons</option>
              {opt.reason.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
            <select style={ST.input} value={methodFilter} onChange={(e) => setMethodFilter(e.target.value)}>
              <option value="all">All methods</option>
              {opt.method.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
            <select style={ST.input} value={locationFilter} onChange={(e) => setLocationFilter(e.target.value)}>
              <option value="all">All locations</option>
              {opt.location.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
            <select style={ST.input} value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
              <option value="date_desc">Sort: Newest first</option>
              <option value="date_asc">Sort: Oldest first</option>
              <option value="kg_desc">Sort: Quantity (high → low)</option>
              <option value="kg_asc">Sort: Quantity (low → high)</option>
            </select>
          </div>

          <div style={ST.toolbar}>
            <span style={{ fontSize: 11.5, fontWeight: 900, color: "#64748b", textTransform: "uppercase" }}>Period:</span>
            {[["all", "All time"], ["1", "This month"], ["3", "Last 3 months"], ["6", "Last 6 months"], ["12", "Last 12 months"]].map(([v, l]) => (
              <button key={v} style={ST.chip(quickRange === v)} onClick={() => setQuickRange(v)}>{l}</button>
            ))}
            {filtersActive && <button style={ISO_UI.btn("secondary")} onClick={clearFilters}>✕ Clear filters</button>}
            <span style={{ marginInlineStart: "auto", display: "flex", gap: 7, alignItems: "center", flexWrap: "wrap" }}>
              <span style={{ fontSize: 12, fontWeight: 800, color: "#0c4a6e" }}>Selected: {selected.size}</span>
              <button style={ISO_UI.btn("secondary", !filtered.length)} onClick={selectAllFiltered} disabled={!filtered.length}>Select displayed</button>
              <button style={ISO_UI.btn("secondary", !selected.size)} onClick={clearSelection} disabled={!selected.size}>Clear selection</button>
            </span>
          </div>
        </div>

        {/* Analytics */}
        {showStats && (
          <div style={ST.panel}>
            <div style={ST.band}>📊 Analytics — {stats.records} record(s) · {stats.entryCount} entries · {stats.totalKg.toFixed(2)} kg</div>
            <div style={{ display: "flex", gap: 18, flexWrap: "wrap" }}>
              {renderBreakdown("By Meat Type", stats.byMeat, "linear-gradient(90deg,#0ea5e9,#06b6d4)")}
              {renderBreakdown("By Reason", stats.byReason, "linear-gradient(90deg,#f59e0b,#d97706)")}
              {renderBreakdown("By Disposal Method", stats.byMethod, "linear-gradient(90deg,#22c55e,#16a34a)")}
              {renderBreakdown("By Location", stats.byLocation, "linear-gradient(90deg,#8b5cf6,#7c3aed)")}
            </div>
            {stats.byMonth.length > 0 && (
              <div style={{ marginTop: 14 }}>
                <div style={ST.sectionTitle}>Monthly Trend</div>
                <div style={{ display: "flex", alignItems: "flex-end", gap: 8, overflowX: "auto", paddingBottom: 6 }}>
                  {stats.byMonth.map((m) => {
                    const max = Math.max(...stats.byMonth.map((x) => x.kg), 1);
                    const h = Math.max(6, (m.kg / max) * 110);
                    return (
                      <div key={m.key} style={{ textAlign: "center", minWidth: 62 }}>
                        <div style={{ fontSize: 10.5, fontWeight: 900, color: "#b91c1c" }}>{m.kg.toFixed(0)}</div>
                        <div style={{ height: h, background: "linear-gradient(180deg,#0ea5e9,#0284c7)", borderRadius: "6px 6px 0 0" }} />
                        <div style={{ fontSize: 10, fontWeight: 800, color: "#475569", marginTop: 3 }}>{monthTitle(m.key).slice(0, 3)} {m.key.slice(2, 4)}</div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* List */}
        {loading && <div style={{ padding: 20, fontWeight: 800, color: "#0c4a6e" }}>⏳ Loading…</div>}
        {!loading && err && <div style={{ padding: 14, color: "#b91c1c", fontWeight: 800 }}>{err}</div>}
        {!loading && !err && filtered.length === 0 && (
          <EmptyState text={items.length === 0 ? "No meat waste records yet." : "No records match the current filters."} />
        )}

        {!loading && !err && grouped.map(([gKey, gRecords]) => (
          <React.Fragment key={gKey || "all"}>
            {groupMonths && (
              <div style={ST.monthBand}>
                <span>🗂 {monthTitle(gKey)}</span>
                <span>{gRecords.length} record(s) · {gRecords.reduce((s, r) => s + recKg(r), 0).toFixed(2)} kg</span>
              </div>
            )}
            {gRecords.map((rec, i) => renderRecord(rec, i))}
          </React.Fragment>
        ))}
      </SidebarLayout>

      {lightbox}

      {/* Smart export modal */}
      {exportOpen && (
        <div style={ST.overlay} onClick={(e) => { if (e.target === e.currentTarget && !exporting) setExportOpen(false); }}>
          <div style={ST.modal}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
              <h3 style={{ margin: 0, fontSize: 17, fontWeight: 950, color: "#0c4a6e" }}>⬇️ Smart Export</h3>
              {!exporting && (
                <button onClick={() => setExportOpen(false)} style={{ background: "none", border: "none", fontSize: 22, cursor: "pointer", color: "#94a3b8", lineHeight: 1 }}>✕</button>
              )}
            </div>

            {/* Scope */}
            <span style={ST.label}>Export scope</span>

            <label style={{ ...ST.radioRow, ...(ex.scope === "months" ? ST.radioRowOn : {}) }}>
              <input type="radio" name="mw_scope" checked={ex.scope === "months"} onChange={() => setEx((s) => ({ ...s, scope: "months" }))} />
              <span style={{ fontWeight: 800, fontSize: 13, color: "#0f172a" }}>Last</span>
              <input
                type="number"
                min="1"
                max="60"
                value={ex.months}
                onChange={(e) => setEx((s) => ({ ...s, months: Math.max(1, Math.min(60, Number(e.target.value) || 1)), scope: "months" }))}
                style={{ ...ST.input, width: 74, minWidth: 0, padding: "5px 8px" }}
              />
              <span style={{ fontWeight: 800, fontSize: 13, color: "#0f172a" }}>month(s)</span>
            </label>
            {ex.scope === "months" && (
              <div style={{ ...ST.toolbar, paddingInlineStart: 26, marginBottom: 8 }}>
                {[1, 2, 3, 6, 12, 24].map((n) => (
                  <button key={n} style={ST.chip(Number(ex.months) === n)} onClick={() => setEx((s) => ({ ...s, months: n }))}>{n}M</button>
                ))}
              </div>
            )}

            <label style={{ ...ST.radioRow, ...(ex.scope === "range" ? ST.radioRowOn : {}) }}>
              <input type="radio" name="mw_scope" checked={ex.scope === "range"} onChange={() => setEx((s) => ({ ...s, scope: "range" }))} />
              <span style={{ fontWeight: 800, fontSize: 13, color: "#0f172a" }}>Custom date range</span>
            </label>
            {ex.scope === "range" && (
              <div style={{ display: "flex", gap: 10, paddingInlineStart: 26, marginBottom: 8, flexWrap: "wrap" }}>
                <div>
                  <span style={ST.label}>From</span>
                  <input type="date" value={ex.from} onChange={(e) => setEx((s) => ({ ...s, from: e.target.value }))} style={ST.input} />
                </div>
                <div>
                  <span style={ST.label}>To</span>
                  <input type="date" value={ex.to} onChange={(e) => setEx((s) => ({ ...s, to: e.target.value }))} style={ST.input} />
                </div>
              </div>
            )}

            <label style={{ ...ST.radioRow, ...(ex.scope === "filtered" ? ST.radioRowOn : {}) }}>
              <input type="radio" name="mw_scope" checked={ex.scope === "filtered"} onChange={() => setEx((s) => ({ ...s, scope: "filtered" }))} />
              <span style={{ fontWeight: 800, fontSize: 13, color: "#0f172a" }}>Currently displayed ({filtered.length})</span>
            </label>

            <label style={{ ...ST.radioRow, ...(ex.scope === "selected" ? ST.radioRowOn : {}), opacity: selected.size ? 1 : 0.55 }}>
              <input type="radio" name="mw_scope" checked={ex.scope === "selected"} disabled={!selected.size} onChange={() => setEx((s) => ({ ...s, scope: "selected" }))} />
              <span style={{ fontWeight: 800, fontSize: 13, color: "#0f172a" }}>Selected records only ({selected.size})</span>
            </label>

            {/* Format */}
            <div style={{ marginTop: 14 }}>
              <span style={ST.label}>Format</span>
              <div style={ST.toolbar}>
                {[["pdf", "📄 PDF (ISO layout)"], ["xlsx", "📊 Excel"], ["csv", "🧾 CSV"], ["json", "🗄 JSON"]].map(([v, l]) => (
                  <button key={v} style={ST.chip(ex.format === v)} onClick={() => setEx((s) => ({ ...s, format: v }))}>{l}</button>
                ))}
              </div>
            </div>

            {/* PDF options */}
            {ex.format === "pdf" && (
              <div style={{ marginTop: 12, background: "#f8fafc", border: "1.5px solid #e2e8f0", borderRadius: 10, padding: 10 }}>
                <label style={{ display: "flex", gap: 9, alignItems: "flex-start", marginBottom: 8, cursor: "pointer" }}>
                  <input type="checkbox" checked={ex.includeSummary} onChange={(e) => setEx((s) => ({ ...s, includeSummary: e.target.checked }))} style={{ width: 16, height: 16, marginTop: 2 }} />
                  <span style={{ fontSize: 12.5, fontWeight: 800, color: "#0f172a" }}>Include analytics summary<br />
                    <span style={{ fontWeight: 600, color: "#64748b", fontSize: 11.5 }}>KPIs + breakdown by meat type, reason, method and month.</span>
                  </span>
                </label>
                <label style={{ display: "flex", gap: 9, alignItems: "flex-start", marginBottom: 8, cursor: "pointer" }}>
                  <input type="checkbox" checked={ex.groupByMonth} onChange={(e) => setEx((s) => ({ ...s, groupByMonth: e.target.checked }))} style={{ width: 16, height: 16, marginTop: 2 }} />
                  <span style={{ fontSize: 12.5, fontWeight: 800, color: "#0f172a" }}>Group records by month</span>
                </label>
                <label style={{ display: "flex", gap: 9, alignItems: "flex-start", cursor: "pointer" }}>
                  <input type="checkbox" checked={ex.includeImages} onChange={(e) => setEx((s) => ({ ...s, includeImages: e.target.checked }))} style={{ width: 16, height: 16, marginTop: 2 }} />
                  <span style={{ fontSize: 12.5, fontWeight: 800, color: "#0f172a" }}>Include attachment photos<br />
                    <span style={{ fontWeight: 600, color: "#64748b", fontSize: 11.5 }}>Adds one full page per photo — slower export.</span>
                  </span>
                </label>
              </div>
            )}

            {/* Live preview of scope */}
            <div style={{ marginTop: 14, background: "#e0f2fe", borderRadius: 10, padding: "10px 12px", fontSize: 12.5, fontWeight: 800, color: "#0c4a6e" }}>
              {scopeLabel}
              <div style={{ marginTop: 4, fontWeight: 900 }}>
                {exportSorted.length} record(s) · {exportStats.entryCount} entries · {exportStats.totalKg.toFixed(2)} kg
              </div>
            </div>

            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 16 }}>
              <button style={ISO_UI.btn("secondary", exporting)} onClick={() => setExportOpen(false)} disabled={exporting}>Cancel</button>
              <button style={ISO_UI.btn("primary", exporting || !exportSorted.length)} onClick={runExport} disabled={exporting || !exportSorted.length}>
                {exporting ? "Exporting…" : `Export ${exportSorted.length} record(s)`}
              </button>
            </div>
          </div>
        </div>
      )}
    </IsoShell>
  );
}
