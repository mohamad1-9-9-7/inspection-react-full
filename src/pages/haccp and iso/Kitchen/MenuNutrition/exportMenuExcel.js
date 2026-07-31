// src/pages/haccp and iso/Kitchen/MenuNutrition/exportMenuExcel.js
// Excel export for the menu nutrition register.
//
// Sheet 1 mirrors the data-entry layout exactly (item info → per-100 g →
// per-portion → documentation), the same three colour-coded column groups as
// the original workbook. Sheet 2 is the printable menu with calories only.
//
// ExcelJS and file-saver are imported dynamically to keep them out of the
// main bundle.

import { DAYS, SECTIONS, parseWeight } from "./menuData";
import {
  DAILY_INTAKE_AR,
  DAILY_INTAKE_EN,
  NUTRIENTS,
  computePortion,
  itemStatus,
  num,
} from "./nutritionCalc";

const C = {
  navy: "FF1E3A5F",
  navyLight: "FF2D5A8E",
  info: "FFEAF1FE",
  yellow: "FFFDF3D4",
  yellowHead: "FFB26A00",
  green: "FFE8F8F5",
  greenHead: "FF0B7C71",
  gray: "FFF3F4F6",
  grayHead: "FF64748B",
  white: "FFFFFFFF",
  text: "FF1E293B",
  line: "FFCFDCEC",
  badBg: "FFFDEEF1",
  warnBg: "FFFDF5E6",
  goodBg: "FFE8F8F5",
};

const thin = { style: "thin", color: { argb: C.line } };
const box = { top: thin, left: thin, bottom: thin, right: thin };
const fill = (argb) => ({ type: "pattern", pattern: "solid", fgColor: { argb } });
const center = { horizontal: "center", vertical: "middle", wrapText: true };
const start = { horizontal: "left", vertical: "middle", wrapText: true };

/** Section / day label for the first column. */
function sectionLabel(item, t) {
  if (item.section === "day" && item.day) return t(item.day);
  const sec = SECTIONS.find((s) => s.id === item.section);
  return sec ? t(sec.labelKey) : item.section || "";
}

function statusLabel(st, t) {
  if (st.invalid) return t("statusInvalid");
  if (st.needsRecalc) return t("statusRecalc");
  if (st.status === "complete") return t("statusComplete");
  if (st.status === "partial") return t("statusPartial");
  return t("statusEmpty");
}

function statusFillFor(st) {
  if (st.invalid) return C.badBg;
  if (st.status === "complete") return C.goodBg;
  if (st.needsRecalc || st.status === "partial") return C.warnBg;
  return C.gray;
}

/** Group items the way the menu reads: days in order, then the fixed sections. */
function grouped(items, t) {
  const out = [];
  for (const sec of SECTIONS) {
    const inSec = items.filter((i) => i.section === sec.id);
    if (!inSec.length) continue;
    if (sec.id === "day") {
      for (const day of DAYS) {
        const dayItems = inSec.filter((i) => i.day === day);
        if (dayItems.length) out.push({ label: t(day), items: dayItems });
      }
      const noDay = inSec.filter((i) => !DAYS.includes(i.day));
      if (noDay.length) out.push({ label: t(sec.labelKey), items: noDay });
    } else {
      out.push({ label: t(sec.labelKey), items: inSec });
    }
  }
  return out;
}

/**
 * Build and download the workbook.
 * @param {Array} items    catalogue items
 * @param {Object} opts    { t, isAr }
 */
export function buildWorkbook(ExcelJS, items, { t, isAr }) {
  const wb = new ExcelJS.Workbook();
  wb.creator = "Al Mawashi — Kitchen / Menu Nutrition";
  wb.created = new Date();

  buildRegisterSheet(wb, items, { t, isAr });
  buildMenuSheet(wb, items, { t, isAr });
  return wb;
}

export default async function exportMenuExcel(items, { t, isAr }) {
  const [ExcelJSModule, fileSaverModule] = await Promise.all([
    import("exceljs"),
    import("file-saver"),
  ]);
  const ExcelJS = ExcelJSModule.default || ExcelJSModule;
  const saveAs = fileSaverModule.saveAs || fileSaverModule.default?.saveAs;

  const wb = buildWorkbook(ExcelJS, items, { t, isAr });

  const buf = await wb.xlsx.writeBuffer();
  const stamp = new Date().toISOString().slice(0, 10);
  saveAs(
    new Blob([buf], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    }),
    `Menu-Nutrition-Register-${stamp}.xlsx`
  );
}

/* ───────────────── Sheet 1 — full register ───────────────── */

function buildRegisterSheet(wb, items, { t, isAr }) {
  const ws = wb.addWorksheet(isAr ? "سجل الأصناف" : "Item Register", {
    views: [{ rightToLeft: !!isAr, state: "frozen", xSplit: 3, ySplit: 4 }],
    pageSetup: { orientation: "landscape", fitToPage: true, fitToWidth: 1, fitToHeight: 0 },
  });

  const infoCols = [
    { label: isAr ? "القسم / اليوم" : "Section / Day", width: 18 },
    { label: isAr ? "الصنف (إنجليزي)" : "Item (English)", width: 26 },
    { label: isAr ? "الصنف (عربي)" : "Item (Arabic)", width: 24 },
    { label: isAr ? "يُقدّم مع" : "Served With", width: 20 },
    { label: isAr ? "المكوّنات" : "Ingredients", width: 40 },
    { label: isAr ? "الوزن المُدخل" : "Weight (as entered)", width: 16 },
    { label: isAr ? "وزن الحصة (غ)" : "Portion (g)", width: 13 },
  ];
  const docCols = [
    { label: isAr ? "طريقة الحساب" : "Method", width: 22 },
    { label: isAr ? "المصدر" : "Source", width: 28 },
    { label: isAr ? "المرجع" : "Reference", width: 16 },
    { label: isAr ? "تاريخ الحساب" : "Calc. date", width: 14 },
    { label: isAr ? "أعدّها" : "Prepared by", width: 16 },
    { label: isAr ? "الحالة" : "Status", width: 18 },
  ];

  const nInfo = infoCols.length;
  const nNut = NUTRIENTS.length;
  const totalCols = nInfo + nNut * 2 + docCols.length;

  ws.columns = [
    ...infoCols.map((c) => ({ width: c.width })),
    ...NUTRIENTS.map(() => ({ width: 12 })),
    ...NUTRIENTS.map(() => ({ width: 12 })),
    ...docCols.map((c) => ({ width: c.width })),
  ];

  // Row 1 — document title
  const title = ws.getRow(1);
  ws.mergeCells(1, 1, 1, totalCols);
  title.getCell(1).value = isAr
    ? "وسم السعرات والقيم الغذائية للمنيو — لائحة أبوظبي ADG 10/2026"
    : "Menu Calorie & Nutrition Labelling — Abu Dhabi ADG 10/2026";
  title.getCell(1).font = { bold: true, size: 14, color: { argb: C.white } };
  title.getCell(1).fill = fill(C.navy);
  title.getCell(1).alignment = center;
  title.height = 28;

  // Row 2 — mandatory daily intake statement (both languages, verbatim)
  ws.mergeCells(2, 1, 2, totalCols);
  const intake = ws.getRow(2);
  intake.getCell(1).value = `${DAILY_INTAKE_EN}\n${DAILY_INTAKE_AR}`;
  intake.getCell(1).font = { size: 9, italic: true, color: { argb: C.text } };
  intake.getCell(1).fill = fill(C.info);
  intake.getCell(1).alignment = { ...center, wrapText: true };
  intake.height = 34;

  // Row 3 — column-group band
  const band = ws.getRow(3);
  const groups = [
    { from: 1, to: nInfo, label: isAr ? "بيانات الصنف" : "Item information", bg: C.navyLight, fg: C.white },
    {
      from: nInfo + 1,
      to: nInfo + nNut,
      label: isAr ? "القيم لكل 100 غرام (إدخال يدوي من مصدر معتمد)" : "Per 100 g (entered from an approved source)",
      bg: C.yellow,
      fg: C.yellowHead,
    },
    {
      from: nInfo + nNut + 1,
      to: nInfo + nNut * 2,
      label: isAr ? "القيم لكل حصة (محسوبة)" : "Per portion (calculated)",
      bg: C.green,
      fg: C.greenHead,
    },
    {
      from: nInfo + nNut * 2 + 1,
      to: totalCols,
      label: isAr ? "التوثيق" : "Documentation",
      bg: C.gray,
      fg: C.grayHead,
    },
  ];
  for (const g of groups) {
    ws.mergeCells(3, g.from, 3, g.to);
    const cell = band.getCell(g.from);
    cell.value = g.label;
    cell.font = { bold: true, size: 10, color: { argb: g.fg } };
    cell.fill = fill(g.bg);
    cell.alignment = center;
    cell.border = box;
  }
  band.height = 22;

  // Row 4 — column labels
  const head = ws.getRow(4);
  const labels = [
    ...infoCols.map((c) => ({ text: c.label, bg: C.navyLight, fg: C.white })),
    ...NUTRIENTS.map((n) => ({
      text: `${isAr ? n.ar : n.en}\n(${n.unit})`,
      bg: C.yellow,
      fg: C.yellowHead,
    })),
    ...NUTRIENTS.map((n) => ({
      text: `${isAr ? n.ar : n.en}\n(${n.unit})`,
      bg: C.green,
      fg: C.greenHead,
    })),
    ...docCols.map((c) => ({ text: c.label, bg: C.gray, fg: C.grayHead })),
  ];
  labels.forEach((l, i) => {
    const cell = head.getCell(i + 1);
    cell.value = l.text;
    cell.font = { bold: true, size: 9, color: { argb: l.fg } };
    cell.fill = fill(l.bg);
    cell.alignment = center;
    cell.border = box;
  });
  head.height = 34;

  // Data rows
  let r = 5;
  for (const g of grouped(items, t)) {
    // Group separator row
    ws.mergeCells(r, 1, r, totalCols);
    const sep = ws.getRow(r);
    sep.getCell(1).value = g.label;
    sep.getCell(1).font = { bold: true, size: 10, color: { argb: C.navy } };
    sep.getCell(1).fill = fill(C.info);
    sep.getCell(1).alignment = start;
    sep.getCell(1).border = box;
    r += 1;

    for (const item of g.items) {
      const st = itemStatus(item);
      const weight = parseWeight(item.weightRaw);
      const portion = computePortion(item.per100, weight.total);
      const row = ws.getRow(r);

      const values = [
        sectionLabel(item, t),
        item.nameEn || "",
        item.nameAr || "",
        [item.servedWith, item.servedWithAr].filter(Boolean).join(" / "),
        [item.ingredients, item.ingredientsAr].filter(Boolean).join(" / "),
        item.weightRaw || "",
        weight.total,
        ...NUTRIENTS.map((n) => num(item.per100?.[n.key])),
        ...NUTRIENTS.map((n) => portion[n.key]),
        item.doc?.method === "lab"
          ? t("docMethodLab")
          : item.doc?.method === "software"
          ? t("docMethodSoftware")
          : "",
        item.doc?.source || "",
        item.doc?.ref || "",
        item.doc?.date || "",
        item.doc?.by || "",
        statusLabel(st, t),
      ];

      values.forEach((v, i) => {
        const cell = row.getCell(i + 1);
        cell.value = v === null || v === undefined ? "" : v;
        cell.border = box;
        cell.font = { size: 10, color: { argb: C.text } };

        const isPer100 = i >= nInfo && i < nInfo + nNut;
        const isPortion = i >= nInfo + nNut && i < nInfo + nNut * 2;
        const isStatus = i === totalCols - 1;

        if (isPer100) {
          cell.fill = fill(C.yellow);
          cell.alignment = center;
          cell.numFmt = NUTRIENTS[i - nInfo].digits === 0 ? "0" : "0.0";
        } else if (isPortion) {
          cell.fill = fill(C.green);
          cell.alignment = center;
          cell.font = { size: 10, bold: true, color: { argb: C.greenHead } };
          cell.numFmt = NUTRIENTS[i - nInfo - nNut].digits === 0 ? "0" : "0.0";
        } else if (isStatus) {
          cell.fill = fill(statusFillFor(st));
          cell.alignment = center;
          cell.font = { size: 10, bold: true, color: { argb: C.text } };
        } else if (i === nInfo - 1) {
          cell.alignment = center;
          cell.numFmt = "0.#";
        } else {
          cell.alignment = start;
        }
      });

      row.height = 20;
      r += 1;
    }
  }

  // Footer note about the calculation rule
  ws.mergeCells(r + 1, 1, r + 1, totalCols);
  const note = ws.getRow(r + 1);
  note.getCell(1).value = isAr
    ? "القيمة للحصة = القيمة لكل 100غ × وزن الحصة ÷ 100 — تقريب لأقرب رقم صحيح للسعرات والصوديوم، ورقم عشري واحد لباقي العناصر."
    : "Portion value = per-100 g × portion weight ÷ 100 — calories and sodium rounded to whole numbers, other nutrients to one decimal.";
  note.getCell(1).font = { size: 9, italic: true, color: { argb: C.grayHead } };
  note.getCell(1).alignment = start;
}

/* ───────────────── Sheet 2 — printable menu ───────────────── */

function buildMenuSheet(wb, items, { t, isAr }) {
  const ws = wb.addWorksheet(isAr ? "المنيو" : "Menu", {
    views: [{ rightToLeft: !!isAr, state: "frozen", ySplit: 3 }],
    pageSetup: { orientation: "portrait", fitToPage: true, fitToWidth: 1, fitToHeight: 0 },
  });

  ws.columns = [{ width: 34 }, { width: 26 }, { width: 24 }, { width: 14 }, { width: 16 }];
  const totalCols = 5;

  ws.mergeCells(1, 1, 1, totalCols);
  const title = ws.getRow(1);
  title.getCell(1).value = isAr ? "المنيو — السعرات لكل حصة" : "Menu — calories per portion";
  title.getCell(1).font = { bold: true, size: 14, color: { argb: C.white } };
  title.getCell(1).fill = fill(C.navy);
  title.getCell(1).alignment = center;
  title.height = 28;

  ws.mergeCells(2, 1, 2, totalCols);
  const intake = ws.getRow(2);
  intake.getCell(1).value = `${DAILY_INTAKE_EN}\n${DAILY_INTAKE_AR}`;
  intake.getCell(1).font = { size: 9, italic: true, color: { argb: C.text } };
  intake.getCell(1).fill = fill(C.info);
  intake.getCell(1).alignment = { ...center, wrapText: true };
  intake.height = 34;

  const headLabels = isAr
    ? ["الصنف (إنجليزي)", "الصنف (عربي)", "يُقدّم مع", "الوزن (غ)", "السعرات (kcal)"]
    : ["Item (English)", "Item (Arabic)", "Served With", "Weight (g)", "Calories (kcal)"];
  const head = ws.getRow(3);
  headLabels.forEach((label, i) => {
    const cell = head.getCell(i + 1);
    cell.value = label;
    cell.font = { bold: true, size: 10, color: { argb: C.white } };
    cell.fill = fill(C.navyLight);
    cell.alignment = center;
    cell.border = box;
  });
  head.height = 22;

  let r = 4;
  for (const g of grouped(items, t)) {
    ws.mergeCells(r, 1, r, totalCols);
    const sep = ws.getRow(r);
    sep.getCell(1).value = g.label;
    sep.getCell(1).font = { bold: true, size: 11, color: { argb: C.navy } };
    sep.getCell(1).fill = fill(C.info);
    sep.getCell(1).alignment = start;
    sep.getCell(1).border = box;
    r += 1;

    for (const item of g.items) {
      const weight = parseWeight(item.weightRaw);
      const portion = computePortion(item.per100, weight.total);
      const row = ws.getRow(r);
      const values = [
        item.nameEn || "",
        item.nameAr || "",
        [item.servedWith, item.servedWithAr].filter(Boolean).join(" / "),
        weight.total,
        portion.calories,
      ];
      values.forEach((v, i) => {
        const cell = row.getCell(i + 1);
        cell.value = v === null || v === undefined ? "" : v;
        cell.border = box;
        cell.font = { size: 10, color: { argb: C.text } };
        cell.alignment = i >= 3 ? center : start;
        if (i === 3) cell.numFmt = "0.#";
        if (i === 4) {
          cell.numFmt = "0";
          cell.font = { size: 11, bold: true, color: { argb: C.navy } };
        }
      });
      row.height = 20;
      r += 1;
    }
  }
}
