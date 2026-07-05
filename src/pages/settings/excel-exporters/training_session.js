// src/pages/settings/excel-exporters/training_session.js
// Training Session record — one report = one sheet.
// Mirrors the Training module: session header, objectives, participants roster
// (with quiz result/score) and the session's question bank.
// Reports are keyed by module NAME; `level` = per-question difficulty target.

import {
  COLORS, BORDER_BLACK, fillSolid, center, left,
  addDocHeader, addFooter, formatDMY, extractDate,
  pageSetupLandscape, display,
} from "./_lib";

const PART_COLS = [
  { key: "slNo",        label: "SL",          width: 6  },
  { key: "name",        label: "Name",        width: 28, align: "left" },
  { key: "designation", label: "Designation", width: 22, align: "left" },
  { key: "result",      label: "Result",      width: 12 },
  { key: "score",       label: "Score",       width: 10 },
  { key: "lastQuizAt",  label: "Last Quiz",   width: 16 },
];

export default async function build(wb, record, ctx) {
  const { sheetName } = ctx;
  const p = record?.payload || {};
  const participants = Array.isArray(p.participants) ? p.participants : [];
  const bank = p.questionsBank || {};
  const questions = Array.isArray(bank.en) ? bank.en
                  : Array.isArray(bank) ? bank
                  : Array.isArray(bank.ar) ? bank.ar : [];

  const NC = 6;
  const ws = wb.addWorksheet(sheetName, { views: [{ showGridLines: false }] });
  pageSetupLandscape(ws);
  ws.columns = PART_COLS.map((c) => ({ width: c.width }));

  addDocHeader(ws, {
    documentTitle: p.documentTitle || "Training Record",
    documentNo:    p.documentNumber || "FS-QM/REC/TR/1",
    issueDate:     p.issueDate     || "05/02/2020",
    revisionNo:    p.revisionNo    || "0",
    area:          p.area          || "QA",
    issuedBy:      p.issuedBy       || "MOHAMAD ABDULLAH",
    controllingOfficer: p.controllingOfficer || "QA",
    approvedBy:    p.approvedBy     || "Hussam O. Sarhan",
    company:       "TRANS EMIRATES LIVESTOCK TRADING L.L.C.",
    reportTitle:   `TRAINING SESSION — ${p.moduleName || p.title || ""}`.trim(),
    reportDate:    formatDMY(p.date || extractDate(record)),
    totalCols:     NC,
  });

  let r = ws.lastRow.number + 1;
  const lblFont = { bold: true, size: 10, color: { argb: COLORS.NAVY } };
  const lblFill = fillSolid(COLORS.GRAY_LIGHT);

  const section = (title, fill = COLORS.NAVY) => {
    ws.mergeCells(r, 1, r, NC);
    const c = ws.getCell(r, 1);
    c.value = title;
    c.font = { bold: true, size: 11, color: { argb: COLORS.WHITE } };
    c.fill = fillSolid(fill); c.alignment = center; c.border = BORDER_BLACK;
    ws.getRow(r).height = 22; r++;
  };
  // 2 pairs across 6 cols: [1]l1 [2-3]v1 [4]l2 [5-6]v2
  const kv2 = (l1, v1, l2, v2) => {
    ws.getCell(r, 1).value = l1;
    ws.getCell(r, 1).font = lblFont; ws.getCell(r, 1).fill = lblFill; ws.getCell(r, 1).alignment = left; ws.getCell(r, 1).border = BORDER_BLACK;
    ws.mergeCells(r, 2, r, 3);
    ws.getCell(r, 2).value = display(v1); ws.getCell(r, 2).font = { size: 10 }; ws.getCell(r, 2).alignment = left; ws.getCell(r, 2).border = BORDER_BLACK;
    if (l2 != null) {
      ws.getCell(r, 4).value = l2;
      ws.getCell(r, 4).font = lblFont; ws.getCell(r, 4).fill = lblFill; ws.getCell(r, 4).alignment = left; ws.getCell(r, 4).border = BORDER_BLACK;
      ws.mergeCells(r, 5, r, 6);
      ws.getCell(r, 5).value = display(v2); ws.getCell(r, 5).font = { size: 10 }; ws.getCell(r, 5).alignment = left; ws.getCell(r, 5).border = BORDER_BLACK;
    } else {
      ws.mergeCells(r, 4, r, 6);
      ws.getCell(r, 4).border = BORDER_BLACK;
    }
    ws.getRow(r).height = 20; r++;
  };
  const wide = (label, val) => {
    ws.getCell(r, 1).value = label;
    ws.getCell(r, 1).font = lblFont; ws.getCell(r, 1).fill = lblFill; ws.getCell(r, 1).alignment = { ...left, wrapText: true }; ws.getCell(r, 1).border = BORDER_BLACK;
    ws.mergeCells(r, 2, r, NC);
    const v = ws.getCell(r, 2);
    v.value = display(val); v.font = { size: 10 }; v.alignment = { ...left, wrapText: true }; v.border = BORDER_BLACK;
    const lines = String(val ?? "").split("\n").length;
    ws.getRow(r).height = Math.max(22, lines * 15); r++;
  };

  section("Session Details");
  kv2("Module", p.moduleName, "Level / Difficulty", p.level);
  kv2("Title", p.title, "Date", formatDMY(p.date));
  kv2("Branch", p.branch, "Unique Key", p.uniqueKey);
  kv2("Conducted By", p.conductedBy, "Verified By", p.verifiedBy);
  if (p.objectives) { section("Objectives", COLORS.NAVY_LIGHT); wide("Objectives", p.objectives); }
  if (p.details)    { section("Content / Details", COLORS.NAVY_LIGHT); wide("Details", p.details); }

  section(`Participants (${participants.length})`, COLORS.NAVY_LIGHT);
  PART_COLS.forEach((col, ci) => {
    const c = ws.getCell(r, ci + 1);
    c.value = col.label; c.font = { bold: true, color: { argb: COLORS.WHITE }, size: 10 };
    c.fill = fillSolid(COLORS.NAVY); c.alignment = center; c.border = BORDER_BLACK;
  });
  ws.getRow(r).height = 22; r++;
  if (!participants.length) {
    ws.mergeCells(r, 1, r, NC);
    const c = ws.getCell(r, 1);
    c.value = "— No participants —"; c.alignment = center;
    c.font = { italic: true, color: { argb: COLORS.TEXT_MUTED } }; c.border = BORDER_BLACK;
    ws.getRow(r).height = 20; r++;
  } else {
    participants.forEach((part, pi) => {
      const bg = pi % 2 === 0 ? COLORS.WHITE : COLORS.GRAY_ALT;
      PART_COLS.forEach((col, ci) => {
        const c = ws.getCell(r, ci + 1);
        let v = part[col.key];
        if (col.key === "lastQuizAt") v = v ? String(v).slice(0, 10) : "";
        if (col.key === "slNo") v = v || pi + 1;
        c.value = display(v);
        c.font = { size: 10, color: { argb: COLORS.TEXT } };
        c.fill = fillSolid(bg);
        c.alignment = col.align === "left" ? { ...left } : { ...center };
        c.border = BORDER_BLACK;
      });
      ws.getRow(r).height = 18; r++;
    });
  }

  if (questions.length) {
    section(`Question Bank (${questions.length})`, COLORS.NAVY_LIGHT);
    // header: No | Question | Correct Answer | Difficulty
    [["No", 1, 1], ["Question", 2, 3], ["Correct Answer", 4, 5], ["Difficulty", 6, 6]].forEach(([label, a, b]) => {
      if (b > a) ws.mergeCells(r, a, r, b);
      const c = ws.getCell(r, a);
      c.value = label; c.font = { bold: true, color: { argb: COLORS.WHITE }, size: 10 };
      c.fill = fillSolid(COLORS.NAVY); c.alignment = center; c.border = BORDER_BLACK;
    });
    ws.getRow(r).height = 20; r++;
    questions.forEach((q, qi) => {
      const bg = qi % 2 === 0 ? COLORS.WHITE : COLORS.GRAY_ALT;
      const opts = Array.isArray(q.options) ? q.options : [];
      const correctIdx = Number(q.correct);
      const correctText = Number.isFinite(correctIdx) ? (opts[correctIdx] ?? "") : "";
      // No
      ws.getCell(r, 1).value = qi + 1;
      ws.getCell(r, 1).font = { size: 10 }; ws.getCell(r, 1).alignment = center; ws.getCell(r, 1).fill = fillSolid(bg); ws.getCell(r, 1).border = BORDER_BLACK;
      // Question
      ws.mergeCells(r, 2, r, 3);
      ws.getCell(r, 2).value = display(q.q); ws.getCell(r, 2).font = { size: 10 }; ws.getCell(r, 2).alignment = { ...left, wrapText: true }; ws.getCell(r, 2).fill = fillSolid(bg); ws.getCell(r, 2).border = BORDER_BLACK;
      // Correct answer
      ws.mergeCells(r, 4, r, 5);
      ws.getCell(r, 4).value = display(correctText); ws.getCell(r, 4).font = { size: 10, bold: true, color: { argb: COLORS.GREEN } }; ws.getCell(r, 4).alignment = { ...left, wrapText: true }; ws.getCell(r, 4).fill = fillSolid(bg); ws.getCell(r, 4).border = BORDER_BLACK;
      // Difficulty
      ws.getCell(r, 6).value = display(q.difficulty); ws.getCell(r, 6).font = { size: 10 }; ws.getCell(r, 6).alignment = center; ws.getCell(r, 6).fill = fillSolid(bg); ws.getCell(r, 6).border = BORDER_BLACK;
      const lines = String(q.q ?? "").split("\n").length;
      ws.getRow(r).height = Math.max(18, Math.min(lines, 4) * 14); r++;
    });
  }

  addFooter(ws, {
    checkedBy:  p.conductedBy || "",
    verifiedBy: p.verifiedBy || "",
  }, NC);
  return ws;
}
