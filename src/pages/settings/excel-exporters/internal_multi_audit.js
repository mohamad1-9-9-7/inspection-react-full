// src/pages/settings/excel-exporters/internal_multi_audit.js
// Mirrors InternalAuditReportsView.jsx — one record = ONE audit visit of ONE
// branch, so it gets its own sheet (and, in the Al Mawashi backup, its own file
// under a folder per branch).
//
// Findings table = the View's columns:
//   # | Non-conformance | Root cause | Corrective / preventive | Evidence |
//   Closure evidence | Risk | Status
// The two photo columns hold the PHOTOS themselves, embedded in the cell
// (ctx.images: url → { buffer } prepared by the backup before this runs).
// Each photo is clickable and opens the original. Without ctx.images (blank
// form, or a photo that failed to download) the cell lists the links instead.

import {
  COLORS, BORDER_BLACK, fillSolid, center, left,
  addDocHeader, addFooter, pageSetupLandscape, rowsOf, formatDMY,
} from "./_lib";
import {
  getRowClosedEvidenceImages, getBranchEvidenceForRow, getBranchEvidenceNoteForRow, getImageUrl,
} from "../../monitor/internalAuditEvidence";

const COLS = [
  { key: "n",      label: "#",                               width: 5 },
  { key: "nc",     label: "Non-conformance",                 width: 46 },
  { key: "root",   label: "Root cause",                      width: 42 },
  { key: "corr",   label: "Corrective / preventive action",  width: 50 },
  { key: "ev",     label: "Evidence",                        width: 46, photos: true },
  { key: "closed", label: "Closure evidence",                width: 46, photos: true },
  { key: "risk",   label: "Risk",                            width: 10 },
  { key: "status", label: "Status",                          width: 13 },
];
const NC = COLS.length;

/* Photo grid inside a cell. Excel caps a row at 409pt (~545px). */
const PX_PER_CHAR = 7;      // Calibri 11 — column width units → pixels
const EMU = 9525;           // one pixel in EMU
const PAD = 6;
const MAX_ROW_PT = 409;

function gridFor(n, colPx) {
  const per = n > 6 ? 3 : 2;
  const w = Math.floor((colPx - PAD * (per + 1)) / per);
  const h = Math.round(w * 0.75);
  const lines = Math.ceil(n / per);
  return { per, w, h, heightPx: lines * (h + PAD) + PAD };
}

/** Rough wrapped-text height so a long root cause is not cut off. */
function textHeightPx(text, widthChars) {
  const lines = String(text || "").split("\n")
    .reduce((s, ln) => s + Math.max(1, Math.ceil(ln.length / Math.max(8, widthChars * 1.15))), 0);
  return lines * 15 + 8;
}

const urlsOf = (list) => (Array.isArray(list) ? list : [list]).map(getImageUrl).filter(Boolean);

function riskStyle(risk) {
  const r = String(risk || "").toLowerCase();
  if (r === "high")   return { font: COLORS.RED,   fill: COLORS.RED_BG };
  if (r === "medium") return { font: COLORS.AMBER, fill: COLORS.AMBER_BG };
  if (r === "low")    return { font: COLORS.GREEN, fill: COLORS.GREEN_BG };
  return null;
}
function statusStyle(status) {
  const s = String(status || "").toLowerCase();
  if (s === "closed") return { font: COLORS.GREEN, fill: COLORS.GREEN_BG };
  if (s === "open")   return { font: COLORS.RED,   fill: COLORS.RED_BG };
  if (s)              return { font: COLORS.AMBER, fill: COLORS.AMBER_BG };
  return null;
}

/** The audit's branch, wherever this record kept it. */
export function auditBranchOf(record) {
  const p = record?.payload || {};
  return String(p.header?.branch || p.branch || record?.branch || "").trim();
}

export default async function build(wb, record, ctx = {}) {
  const p = record?.payload || {};
  const h = p.header || {};
  const f = p.footer || {};
  const table = rowsOf(p.table);
  const branch = auditBranchOf(record);
  const images = ctx.images instanceof Map ? ctx.images : null;

  const ws = wb.addWorksheet(ctx.sheetName || "Audit", { views: [{ showGridLines: false }] });
  pageSetupLandscape(ws);
  ws.columns = COLS.map((c) => ({ width: c.width }));

  addDocHeader(ws, {
    documentTitle: "Internal Multi-Branch Audit",
    documentNo:    h.documentNumber || "FS-QM/REC/CA/1",
    issueDate:     formatDMY(h.date || p.date || ""),
    revisionNo:    h.revisionNo || "00",
    area:          branch,
    issuedBy:      h.issuedBy || undefined,
    approvedBy:    h.approvedBy || undefined,
    reportTitle:   `INTERNAL AUDIT — ${branch || "—"}`,
    reportDate:    formatDMY(h.date || p.date || ""),
    totalCols:     NC,
  });

  /* Visit facts — the View's info block. */
  const closed = table.filter((r) => String(r?.status || "").toLowerCase() === "closed").length;
  const pct = table.length ? Math.round((closed / table.length) * 100) : 0;
  const facts = [
    ["Report", p.title || ""],
    ["Report No", h.reportNo || ""],
    ["Audit conducted by", h.auditConductedBy || ""],
    ["Branch supervisor", h.branchSupervisor || ""],
    ["Findings", `${table.length}  (closed ${closed} · ${pct}%)`],
  ];
  let r = ws.lastRow.number + 1;
  for (let i = 0; i < facts.length; i += 2) {
    const row = r;
    [facts[i], facts[i + 1]].forEach((pair, k) => {
      if (!pair) return;
      const r = row;
      const c1 = k === 0 ? 1 : 5;
      const c2 = k === 0 ? 4 : NC;
      const lab = ws.getCell(r, c1);
      lab.value = pair[0];
      lab.font = { bold: true, size: 10 };
      lab.fill = fillSolid(COLORS.GRAY_LIGHT);
      lab.border = BORDER_BLACK;
      lab.alignment = { ...left, indent: 1 };
      ws.mergeCells(r, c1 + 1, r, c2);
      const v = ws.getCell(r, c1 + 1);
      v.value = pair[1];
      v.border = BORDER_BLACK;
      v.alignment = { ...left, indent: 1 };
    });
    ws.getRow(r).height = 20;
    r++;
  }
  r++;

  /* Findings header */
  COLS.forEach((col, ci) => {
    const c = ws.getCell(r, ci + 1);
    c.value = col.label;
    c.font = { bold: true, color: { argb: COLORS.WHITE }, size: 10 };
    c.fill = fillSolid(COLORS.NAVY);
    c.alignment = center;
    c.border = BORDER_BLACK;
  });
  ws.getRow(r).height = 26;
  r++;

  if (!table.length) {
    ws.mergeCells(r, 1, r, NC);
    const c = ws.getCell(r, 1);
    c.value = "This report has no findings.";
    c.alignment = center;
    c.font = { italic: true, color: { argb: COLORS.TEXT_MUTED } };
    c.border = BORDER_BLACK;
    r++;
  }

  table.forEach((row, idx) => {
    const evidence = urlsOf(row.evidenceImgs);
    const closure = Array.from(new Set([
      ...getRowClosedEvidenceImages(row),
      ...getBranchEvidenceForRow(p, idx),
    ]));
    const branchNote = row.closedEvidenceNote || getBranchEvidenceNoteForRow(p, idx);
    const photoLists = { ev: evidence, closed: closure };

    const texts = {
      n: idx + 1,
      nc: row.nonConformance || "",
      root: row.rootCause || "",
      corr: row.corrective || "",
      risk: row.risk || "",
      status: row.status || "",
    };
    if (row.riskNotes) texts.risk = `${row.risk || ""}\n${row.riskNotes}`;

    let heightPx = 40;
    COLS.forEach((col, ci) => {
      const c = ws.getCell(r, ci + 1);
      c.border = BORDER_BLACK;
      c.fill = fillSolid(idx % 2 ? COLORS.GRAY_ALT : COLORS.WHITE);
      c.font = { size: 10 };
      if (!col.photos) {
        c.value = texts[col.key];
        c.alignment = ci >= 1 && ci <= 3 ? { ...left, vertical: "top", wrapText: true } : center;
        heightPx = Math.max(heightPx, textHeightPx(texts[col.key], col.width));
        return;
      }

      const urls = photoLists[col.key];
      const note = col.key === "closed" && branchNote ? `Branch note: ${branchNote}` : "";
      const placed = images ? urls.filter((u) => images.get(u)) : [];
      const missing = urls.filter((u) => !placed.includes(u));
      /* Links for photos that are not embedded, plus the branch note, sit in
         the cell text under the pictures. */
      const lines = [];
      if (!urls.length) lines.push("—");
      missing.forEach((u, i) => lines.push(`${i + 1}. ${u}`));
      if (note) lines.push(note);

      const colPx = col.width * PX_PER_CHAR;
      const g = gridFor(placed.length, colPx);
      const photoPx = placed.length ? g.heightPx : 0;
      const textPx = lines.length ? textHeightPx(lines.join("\n"), col.width) : 0;
      c.value = lines.join("\n");
      c.alignment = { horizontal: "left", vertical: "bottom", wrapText: true };
      if (missing.length && !placed.length && missing.length === 1) {
        c.value = { text: lines.join("\n"), hyperlink: missing[0] };
        c.font = { size: 10, color: { argb: "1D4ED8" }, underline: true };
      }
      heightPx = Math.max(heightPx, photoPx + textPx);

      placed.forEach((u, i) => {
        const img = images.get(u);
        const id = wb.addImage({ buffer: img.buffer, extension: img.extension || "jpeg" });
        const x = PAD + (i % g.per) * (g.w + PAD);
        const y = PAD + Math.floor(i / g.per) * (g.h + PAD);
        ws.addImage(id, {
          tl: { nativeCol: ci, nativeColOff: x * EMU, nativeRow: r - 1, nativeRowOff: y * EMU },
          ext: { width: g.w, height: g.h },
          editAs: "oneCell",
          hyperlinks: { hyperlink: u, tooltip: "Open the original photo" },
        });
      });
    });

    const rs = riskStyle(row.risk);
    if (rs) {
      const c = ws.getCell(r, 7);
      c.font = { bold: true, size: 10, color: { argb: rs.font } };
      c.fill = fillSolid(rs.fill);
    }
    const ss = statusStyle(row.status);
    if (ss) {
      const c = ws.getCell(r, 8);
      c.font = { bold: true, size: 10, color: { argb: ss.font } };
      c.fill = fillSolid(ss.fill);
    }
    ws.getRow(r).height = Math.min(MAX_ROW_PT, Math.round(heightPx * 0.75));
    r++;
  });

  /* Footer — next audit + its comment, then the sign-off line. */
  r++;
  const footer = [
    ["Next audit", f.nextAudit || ""],
    ["Comment for next audit", f.commentForNextAudit || ""],
  ];
  footer.forEach(([label, value]) => {
    const lab = ws.getCell(r, 1);
    ws.mergeCells(r, 1, r, 2);
    lab.value = label;
    lab.font = { bold: true, size: 10 };
    lab.fill = fillSolid(COLORS.GRAY_LIGHT);
    lab.border = BORDER_BLACK;
    lab.alignment = { ...left, vertical: "top", indent: 1 };
    ws.mergeCells(r, 3, r, NC);
    const v = ws.getCell(r, 3);
    v.value = value;
    v.border = BORDER_BLACK;
    v.alignment = { ...left, vertical: "top", wrapText: true };
    ws.getRow(r).height = Math.min(MAX_ROW_PT, Math.max(20, Math.round(textHeightPx(value, 230) * 0.75)));
    r++;
  });

  addFooter(ws, { checkedBy: h.auditConductedBy || "", verifiedBy: f.reviewedAndVerifiedBy || "" }, NC);
  return ws;
}
