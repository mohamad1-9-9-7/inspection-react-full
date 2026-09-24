// src/pages/settings/quotations/quotationExport.js
// -----------------------------------------------------------------------------
// Everything a quotation turns into:
//   • buildQuoteHtml(q)  — the A4 document (preview, print, PDF source).
//   • printQuote(q)      — browser print (Arabic-safe, "Save as PDF" works).
//   • downloadQuotePdf(q)— real .pdf file: the same HTML rasterised page by page.
//   • downloadQuoteXlsx(q) — editable Excel with LIVE formulas for every total.
// -----------------------------------------------------------------------------

import {
  computeTotals, cycleById, dmy, fmtMoney, lineTotal, num, statusById,
  unitById, validUntil,
} from "./quotationCore";

const esc = (s) => String(s ?? "").replace(/[<>&"]/g, (m) =>
  ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", "\"": "&quot;" }[m]));

const safeName = (s) => String(s || "quotation").replace(/[^\w؀-ۿ-]+/g, "_").replace(/_+/g, "_").slice(0, 80);
export const quoteFileBase = (q) => safeName(`${q.number || "Quotation"}_${q.clientName || ""}`);

/* ═══════════════════════════ HTML document ═══════════════════════════ */

const ARABIC = /[\u0600-\u06FF]/;

/* A bilingual term is written "English … / العربية …": show the Arabic half on
   its own right-to-left line so neither language gets scrambled. */
function termHtml(text) {
  const i = text.search(/\s\/\s(?=[^/]*[\u0600-\u06FF])/);
  if (i > 0 && !ARABIC.test(text.slice(0, i))) {
    return `<li>${esc(text.slice(0, i))}<span class="t-ar">${esc(text.slice(i + 3))}</span></li>`;
  }
  return `<li dir="auto">${esc(text)}</li>`;
}

const TEAL = "#0f766e";

export function buildQuoteHtml(q) {
  const t = computeTotals(q);
  const cyc = cycleById(q.cycle);
  const ar = q.showArabic !== false;
  const cur = q.currency || "";
  const recurring = (q.lines || []).filter((l) => l.kind !== "one_time");
  const oneTime = (q.lines || []).filter((l) => l.kind === "one_time");
  const hasLineDisc = (q.lines || []).some((l) => num(l.discountPct) > 0);

  const lbl = (en, arTxt) => ar
    ? `${en}<span class="ar"> / ${arTxt}</span>`
    : en;

  const lineRows = (list, startIdx) => list.map((l, i) => `
    <tr>
      <td class="c muted">${startIdx + i + 1}</td>
      <td>
        <div class="li-t">${esc(l.titleEn) || "—"}</div>
        ${ar && l.titleAr ? `<div class="li-ar" dir="rtl">${esc(l.titleAr)}</div>` : ""}
        ${l.details ? `<div class="li-d" dir="auto">${esc(l.details)}</div>` : ""}
      </td>
      <td class="c nowrap">${esc(num(l.qty))} <span class="muted">${esc(unitById(l.unit).en)}</span></td>
      <td class="r nowrap">${fmtMoney(l.unitPrice)}</td>
      ${hasLineDisc ? `<td class="c nowrap">${num(l.discountPct) ? `${num(l.discountPct)}%` : "—"}</td>` : ""}
      <td class="r nowrap b">${fmtMoney(lineTotal(l))}</td>
    </tr>`).join("");

  const head = `
    <tr>
      <th class="c" style="width:28px">#</th>
      <th>${lbl("Description", "الوصف")}</th>
      <th class="c">${lbl("Qty", "الكمية")}</th>
      <th class="r">${lbl("Unit price", "سعر الوحدة")}</th>
      ${hasLineDisc ? `<th class="c">${lbl("Disc.", "خصم")}</th>` : ""}
      <th class="r">${lbl("Amount", "المبلغ")}</th>
    </tr>`;

  const totalsBlock = (title, s) => `
    <table class="totals">
      <tr class="tt"><td colspan="2">${title}</td></tr>
      <tr><td>${lbl("Subtotal", "المجموع")}</td><td class="r">${fmtMoney(s.sub, cur)}</td></tr>
      ${num(q.discountPct) ? `<tr><td>${lbl(`Discount ${num(q.discountPct)}%`, "الخصم")}</td><td class="r">− ${fmtMoney(s.disc, cur)}</td></tr>` : ""}
      ${num(q.vatPct) ? `<tr><td>${lbl(`VAT ${num(q.vatPct)}%`, "الضريبة")}</td><td class="r">${fmtMoney(s.vat, cur)}</td></tr>` : ""}
      <tr class="gt"><td>${s.totalLabel}</td><td class="r">${fmtMoney(s.total, cur)}</td></tr>
    </table>`;

  const recurringTitle = cyc.id === "one_time"
    ? lbl("Fees", "الرسوم")
    : lbl(`${cyc.en} subscription`, `الاشتراك ال${cyc.ar}`);

  const summary = [];
  if (recurring.length && cyc.months > 0 && num(q.contractMonths) > 0) {
    summary.push(`<div class="sum"><div class="sum-l">${lbl(`Contract value (${num(q.contractMonths)} months)`, `قيمة العقد (${num(q.contractMonths)} شهر)`)}</div><div class="sum-v">${fmtMoney(t.contractValue, cur)}</div></div>`);
  }
  if (recurring.length && oneTime.length) {
    summary.push(`<div class="sum"><div class="sum-l">${lbl("First invoice", "الفاتورة الأولى")}</div><div class="sum-v">${fmtMoney(t.firstInvoice, cur)}</div></div>`);
  }

  const terms = String(q.terms || "").split(/\n+/).map((s) => s.trim()).filter(Boolean);
  const st = statusById(q.status);

  return `<!doctype html>
<html><head><meta charset="utf-8"><title>${esc(q.number)} — ${esc(q.clientName)}</title>
<style>
  @page { size: A4; margin: 12mm; }
  * { box-sizing: border-box; }
  body { margin: 0; background: #fff; color: #0f172a; font: 12.5px/1.55 "Segoe UI", Tahoma, Cairo, Arial, sans-serif; }
  .doc { max-width: 794px; margin: 0 auto; padding: 28px 30px; background: #fff; }
  .ar { color: #64748b; font-weight: 600; }
  .muted { color: #64748b; }
  .b { font-weight: 700; }
  .c { text-align: center; } .r { text-align: right; } .nowrap { white-space: nowrap; }
  .top { display: flex; justify-content: space-between; gap: 20px; align-items: flex-start; border-bottom: 3px solid ${TEAL}; padding-bottom: 16px; }
  .issuer-n { font-size: 18px; font-weight: 800; }
  .issuer-d { color: #475569; font-size: 11.5px; margin-top: 4px; white-space: pre-line; }
  .qt { text-align: right; }
  .qt-h { font-size: 26px; font-weight: 800; color: ${TEAL}; letter-spacing: 1px; line-height: 1.1; }
  .qt-ar { font-size: 18px; font-weight: 800; color: ${TEAL}; }
  .meta { margin-top: 8px; font-size: 11.5px; }
  .meta td { padding: 1px 0 1px 12px; } .meta td:first-child { color: #64748b; }
  .pill { display: inline-block; padding: 2px 10px; border-radius: 999px; font-size: 11px; font-weight: 700; background: ${st.bg}; color: ${st.tone}; }
  .parties { display: flex; gap: 14px; margin-top: 16px; }
  .party { flex: 1; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 10px 12px; }
  .party-l { font-size: 10.5px; font-weight: 800; letter-spacing: .8px; text-transform: uppercase; color: ${TEAL}; }
  .party-n { font-size: 14px; font-weight: 800; margin-top: 2px; }
  .party-d { color: #475569; font-size: 11.5px; white-space: pre-line; }
  table.kv { margin-top: 4px; font-size: 11.5px; border-collapse: collapse; }
  table.kv td { padding: 1px 12px 1px 0; color: #475569; vertical-align: top; }
  table.kv td:last-child { color: #0f172a; }
  .t-ar { display: block; direction: rtl; text-align: right; color: #475569; }
  .title { margin: 18px 0 4px; font-size: 16px; font-weight: 800; }
  .intro { color: #334155; white-space: pre-wrap; unicode-bidi: plaintext; text-align: start; margin: 4px 0 0; }
  h3 { margin: 18px 0 6px; font-size: 12px; letter-spacing: .6px; text-transform: uppercase; color: ${TEAL}; }
  table.items { width: 100%; border-collapse: collapse; }
  table.items th { background: ${TEAL}; color: #fff; font-size: 11px; font-weight: 700; padding: 7px 8px; text-align: left; }
  table.items th .ar { color: #ccfbf1; }
  table.items td { padding: 8px; border-bottom: 1px solid #e2e8f0; vertical-align: top; }
  table.items tr:nth-child(even) td { background: #f8fafc; }
  .li-t { font-weight: 700; } .li-ar { color: #475569; font-size: 12px; text-align: right; }
  .li-d { color: #64748b; font-size: 11px; white-space: pre-wrap; unicode-bidi: plaintext; text-align: start; }
  .tot-wrap { display: flex; justify-content: flex-end; gap: 14px; margin-top: 12px; flex-wrap: wrap; }
  table.totals { min-width: 290px; border-collapse: collapse; border: 1px solid #e2e8f0; border-radius: 8px; }
  table.totals td { padding: 6px 12px; border-bottom: 1px solid #f1f5f9; }
  table.totals .tt td { background: #f8fafc; font-weight: 800; font-size: 11px; text-transform: uppercase; letter-spacing: .5px; color: #334155; }
  table.totals .gt td { background: ${TEAL}; color: #fff; font-weight: 800; font-size: 14px; }
  table.totals .gt .ar { color: #ccfbf1; }
  .sums { display: flex; gap: 12px; justify-content: flex-end; margin-top: 10px; flex-wrap: wrap; }
  .sum { border: 1px dashed #99f6e4; background: #f0fdfa; border-radius: 8px; padding: 8px 14px; text-align: right; }
  .sum-l { font-size: 11px; color: #475569; } .sum-v { font-size: 15px; font-weight: 800; color: ${TEAL}; }
  ol.terms { margin: 4px 0 0; padding-left: 18px; color: #334155; font-size: 11.5px; }
  ol.terms li { margin: 3px 0; unicode-bidi: plaintext; }
  .notes { white-space: pre-wrap; unicode-bidi: plaintext; text-align: start; color: #334155; background: #fffbeb; border: 1px solid #fde68a; border-radius: 8px; padding: 8px 12px; }
  .sign { display: flex; gap: 30px; margin-top: 34px; }
  .sign > div { flex: 1; border-top: 1px solid #334155; padding-top: 6px; font-size: 11px; color: #475569; }
  .foot { margin-top: 22px; text-align: center; font-size: 10.5px; color: #94a3b8; }
  .avoid { break-inside: avoid; page-break-inside: avoid; }
</style></head>
<body><div class="doc">

  <div class="top">
    <div>
      <div class="issuer-n">${esc(q.issuerName) || "—"}</div>
      <div class="issuer-d">${[q.issuerAddress, q.issuerTaxId ? `TRN: ${q.issuerTaxId}` : "", [q.issuerEmail, q.issuerPhone].filter(Boolean).join(" · ")].filter(Boolean).map(esc).join("\n")}</div>
    </div>
    <div class="qt">
      <div class="qt-h">QUOTATION</div>
      ${ar ? `<div class="qt-ar">عرض سعر</div>` : ""}
      <table class="meta" align="right">
        <tr><td>${lbl("No.", "رقم")}</td><td class="b">${esc(q.number) || "—"}</td></tr>
        <tr><td>${lbl("Date", "التاريخ")}</td><td>${dmy(q.issueDate)}</td></tr>
        <tr><td>${lbl("Valid until", "صالح حتى")}</td><td>${dmy(validUntil(q))}</td></tr>
        <tr><td>${lbl("Status", "الحالة")}</td><td><span class="pill">${st.en}${ar ? ` · ${st.ar}` : ""}</span></td></tr>
      </table>
    </div>
  </div>

  <div class="parties">
    <div class="party">
      <div class="party-l">${lbl("Quotation for", "مقدّم إلى")}</div>
      <div class="party-n" dir="auto">${esc(q.clientName) || "—"}</div>
      <div class="party-d">${[q.clientContact ? `Attn: ${q.clientContact}` : "", q.clientAddress, [q.clientEmail, q.clientPhone].filter(Boolean).join(" · ")].filter(Boolean).map(esc).join("\n")}</div>
    </div>
    <div class="party">
      <div class="party-l">${lbl("Terms of offer", "تفاصيل العرض")}</div>
      <table class="kv">
        <tr><td>${lbl("Billing", "الفوترة")}</td><td><b>${cyc.en}</b>${ar ? ` <span class="ar">· ${cyc.ar}</span>` : ""}</td></tr>
        <tr><td>${lbl("Currency", "العملة")}</td><td><b>${esc(cur)}</b></td></tr>
        ${cyc.months > 0 && num(q.contractMonths) ? `<tr><td>${lbl("Contract term", "مدة العقد")}</td><td><b>${num(q.contractMonths)} months</b>${ar ? ` <span class="ar">· ${num(q.contractMonths)} شهر</span>` : ""}</td></tr>` : ""}
      </table>
    </div>
  </div>

  ${q.title ? `<div class="title" dir="auto">${esc(q.title)}</div>` : ""}
  ${q.intro ? `<div class="intro">${esc(q.intro)}</div>` : ""}

  ${recurring.length ? `
    <h3>${cyc.id === "one_time" ? lbl("Items", "البنود") : lbl(`Subscription — billed ${cyc.en.toLowerCase()}`, `الاشتراك — يُفوتر ${cyc.ar}`)}</h3>
    <table class="items">${head}${lineRows(recurring, 0)}</table>` : ""}

  ${oneTime.length ? `
    <h3>${lbl("One-time fees", "رسوم لمرة واحدة")}</h3>
    <table class="items">${head}${lineRows(oneTime, recurring.length)}</table>` : ""}

  <div class="tot-wrap avoid">
    ${recurring.length ? totalsBlock(recurringTitle, {
      sub: t.recurring, disc: t.recurringDiscount, vat: t.recurringVat, total: t.recurringTotal,
      totalLabel: cyc.id === "one_time" ? lbl("Total", "الإجمالي") : lbl(`Total ${cyc.perEn}`, `الإجمالي ${cyc.perAr}`),
    }) : ""}
    ${oneTime.length ? totalsBlock(lbl("One-time", "مرة واحدة"), {
      sub: t.oneTime, disc: t.oneTimeDiscount, vat: t.oneTimeVat, total: t.oneTimeTotal,
      totalLabel: lbl("Total one-time", "إجمالي لمرة واحدة"),
    }) : ""}
  </div>
  ${summary.length ? `<div class="sums avoid">${summary.join("")}</div>` : ""}

  ${terms.length ? `<div class="avoid"><h3>${lbl("Terms & conditions", "الشروط والأحكام")}</h3>
    <ol class="terms">${terms.map(termHtml).join("")}</ol>
    <div style="margin-top:6px;font-size:11.5px;color:#334155"><b>This quotation is valid until ${dmy(validUntil(q))}.</b>${ar ? `<span class="t-ar"><b>هذا العرض صالح حتى ${dmy(validUntil(q))}.</b></span>` : ""}</div></div>` : ""}

  ${q.notes ? `<div class="avoid"><h3>${lbl("Notes", "ملاحظات")}</h3><div class="notes">${esc(q.notes)}</div></div>` : ""}

  <div class="sign avoid">
    <div>${lbl("For", "عن")} <b>${esc(q.issuerName) || "—"}</b><br>${lbl("Name, signature & date", "الاسم والتوقيع والتاريخ")}</div>
    <div>${lbl("Accepted by", "موافقة")} <b dir="auto">${esc(q.clientName) || "—"}</b><br>${lbl("Name, signature, stamp & date", "الاسم والتوقيع والختم والتاريخ")}</div>
  </div>

  <div class="foot">${esc(q.number)} · ${esc(q.issuerName)}</div>
</div></body></html>`;
}

/* ═══════════════════════════ Print / PDF ═══════════════════════════ */

function mountFrame(html, visible = false) {
  const iframe = document.createElement("iframe");
  iframe.setAttribute("aria-hidden", "true");
  Object.assign(iframe.style, visible
    ? { position: "fixed", right: "0", bottom: "0", width: "0", height: "0", border: "0" }
    : { position: "fixed", left: "-10000px", top: "0", width: "794px", height: "1123px", border: "0" });
  document.body.appendChild(iframe);
  const doc = iframe.contentWindow.document;
  doc.open(); doc.write(html); doc.close();
  return iframe;
}

const waitFor = (iframe) => new Promise((resolve) => {
  const w = iframe.contentWindow;
  const done = () => setTimeout(resolve, 150);
  if (w.document.readyState === "complete") done();
  else w.addEventListener("load", done, { once: true });
});

export async function printQuote(q) {
  const iframe = mountFrame(buildQuoteHtml(q), true);
  await waitFor(iframe);
  iframe.contentWindow.focus();
  iframe.contentWindow.print();
  setTimeout(() => iframe.remove(), 2000);
}

export async function downloadQuotePdf(q) {
  const [{ jsPDF }, h2c] = await Promise.all([import("jspdf"), import("html2canvas")]);
  const html2canvas = h2c.default || h2c;
  const iframe = mountFrame(buildQuoteHtml(q));
  try {
    await waitFor(iframe);
    const docEl = iframe.contentWindow.document.querySelector(".doc");
    iframe.style.height = `${docEl.scrollHeight + 40}px`;
    const canvas = await html2canvas(docEl, { scale: 2, backgroundColor: "#ffffff", useCORS: true, windowWidth: 794 });

    const pdf = new jsPDF({ unit: "pt", format: "a4" });
    const pageW = pdf.internal.pageSize.getWidth();
    const pageH = pdf.internal.pageSize.getHeight();
    const margin = 18;
    const imgW = pageW - margin * 2;
    const scale = imgW / canvas.width;
    const sliceH = Math.floor((pageH - margin * 2) / scale); // canvas px per page

    for (let y = 0, page = 0; y < canvas.height; y += sliceH, page++) {
      const h = Math.min(sliceH, canvas.height - y);
      const part = document.createElement("canvas");
      part.width = canvas.width; part.height = h;
      part.getContext("2d").drawImage(canvas, 0, y, canvas.width, h, 0, 0, canvas.width, h);
      if (page > 0) pdf.addPage();
      pdf.addImage(part.toDataURL("image/jpeg", 0.92), "JPEG", margin, margin, imgW, h * scale);
    }
    pdf.save(`${quoteFileBase(q)}.pdf`);
  } finally {
    iframe.remove();
  }
}

/* ═══════════════════════════ Excel (live formulas) ═══════════════════════════ */

function saveBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1500);
}

export async function downloadQuoteXlsx(q) {
  const mod = await import("exceljs");
  const wb = buildQuoteWorkbook(q, mod.default || mod);
  const buf = await wb.xlsx.writeBuffer({ useStyles: true, useSharedStrings: true });
  saveBlob(new Blob([buf], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }), `${quoteFileBase(q)}.xlsx`);
}

export function buildQuoteWorkbook(q, ExcelJS) {
  const wb = new ExcelJS.Workbook();
  wb.creator = q.issuerName || "Quotation";
  wb.calcProperties.fullCalcOnLoad = true;
  const ws = wb.addWorksheet("Quotation", {
    views: [{ showGridLines: false }],
    pageSetup: { paperSize: 9, orientation: "portrait", fitToPage: true, fitToWidth: 1, fitToHeight: 0 },
  });

  const cyc = cycleById(q.cycle);
  const ar = q.showArabic !== false;
  const L = (en, a) => (ar && a ? `${en} / ${a}` : en);
  const FONT = "Arial";
  const tealFill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF0F766E" } };
  const greyFill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF1F5F9" } };
  const inputFill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFFF7D6" } };
  const thin = { style: "thin", color: { argb: "FFCBD5E1" } };
  const box = { top: thin, left: thin, bottom: thin, right: thin };
  const MONEY = '#,##0.00;(#,##0.00);"-"';
  const PCT = '0.0%;(0.0%);"-"';
  const blue = { name: FONT, size: 10, color: { argb: "FF0000FF" } };

  ws.columns = [
    { width: 5 }, { width: 46 }, { width: 30 }, { width: 11 }, { width: 11 }, { width: 14 }, { width: 10 }, { width: 16 },
  ];

  const put = (addr, value, style = {}) => {
    const c = ws.getCell(addr);
    c.value = value;
    c.font = { name: FONT, size: 10, ...(style.font || {}) };
    if (style.fill) c.fill = style.fill;
    if (style.alignment) c.alignment = style.alignment;
    if (style.numFmt) c.numFmt = style.numFmt;
    if (style.border) c.border = box;
    return c;
  };

  // Header
  ws.mergeCells("A1:D1"); put("A1", q.issuerName || "", { font: { bold: true, size: 16 } });
  ws.mergeCells("E1:H1"); put("E1", ar ? "QUOTATION  ·  عرض سعر" : "QUOTATION", { font: { bold: true, size: 18, color: { argb: "FF0F766E" } }, alignment: { horizontal: "right" } });
  ws.mergeCells("A2:D2"); put("A2", [q.issuerAddress, q.issuerTaxId ? `TRN: ${q.issuerTaxId}` : "", q.issuerEmail, q.issuerPhone].filter(Boolean).join("  ·  "), { font: { size: 9, color: { argb: "FF475569" } } });

  const meta = [
    [L("Quotation No.", "رقم العرض"), q.number || ""],
    [L("Date", "التاريخ"), q.issueDate ? new Date(`${q.issueDate}T00:00:00`) : null],
    [L("Valid (days)", "مدة الصلاحية"), num(q.validDays)],
    [L("Valid until", "صالح حتى"), null],
    [L("Currency", "العملة"), q.currency || ""],
    [L("Billing", "الفوترة"), ar ? `${cyc.en} / ${cyc.ar}` : cyc.en],
    [L("Contract months", "مدة العقد بالأشهر"), num(q.contractMonths)],
  ];
  let r = 4;
  const metaRow = {};
  meta.forEach(([k, v]) => {
    ws.mergeCells(`F${r}:G${r}`);
    put(`F${r}`, k, { font: { bold: true, color: { argb: "FF334155" } }, fill: greyFill, border: true });
    put(`H${r}`, v, { border: true, font: typeof v === "number" ? blue : {} });
    metaRow[k] = r;
    r++;
  });
  const rDate = 5, rDays = 6, rUntil = 7, rCur = 8, rMonths = 10;
  ws.getCell(`H${rDate}`).numFmt = "dd/mm/yyyy";
  ws.getCell(`H${rUntil}`).value = { formula: `H${rDate}+H${rDays}` };
  ws.getCell(`H${rUntil}`).numFmt = "dd/mm/yyyy";
  [rDays, rMonths].forEach((x) => { ws.getCell(`H${x}`).fill = inputFill; });

  // Client block (left side, rows 4-8)
  put("A4", L("Quotation for", "مقدّم إلى"), { font: { bold: true, size: 9, color: { argb: "FF0F766E" } } });
  ws.mergeCells("A5:D5"); put("A5", q.clientName || "", { font: { bold: true, size: 13 } });
  ws.mergeCells("A6:D6"); put("A6", q.clientContact ? `Attn: ${q.clientContact}` : "", { font: { color: { argb: "FF475569" } } });
  ws.mergeCells("A7:D7"); put("A7", [q.clientEmail, q.clientPhone].filter(Boolean).join("  ·  "), { font: { color: { argb: "FF475569" } } });
  ws.mergeCells("A8:D8"); put("A8", q.clientAddress || "", { font: { color: { argb: "FF475569" } } });
  if (q.title) { ws.mergeCells("A10:D10"); put("A10", q.title, { font: { bold: true, size: 12 } }); }

  // Lines table
  r = 12;
  const headers = ["#", L("Description", "الوصف"), L("Details", "التفاصيل"), L("Type", "النوع"), L("Qty", "الكمية"), L("Unit price", "سعر الوحدة"), L("Disc. %", "خصم %"), L("Amount", "المبلغ")];
  headers.forEach((h, i) => {
    const c = ws.getRow(r).getCell(i + 1);
    c.value = h; c.font = { name: FONT, size: 10, bold: true, color: { argb: "FFFFFFFF" } };
    c.fill = tealFill; c.border = box; c.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
  });
  ws.getRow(r).height = 30;
  const first = r + 1;
  (q.lines || []).forEach((l, i) => {
    r++;
    const row = ws.getRow(r);
    const title = ar && l.titleAr ? `${l.titleEn}\n${l.titleAr}` : l.titleEn;
    const vals = [i + 1, title, l.details || "", l.kind === "one_time" ? "One-time" : "Recurring", num(l.qty), num(l.unitPrice), num(l.discountPct) / 100, null];
    vals.forEach((v, j) => {
      const c = row.getCell(j + 1);
      c.value = v; c.border = box;
      c.font = { name: FONT, size: 10, ...([4, 5, 6].includes(j) ? { color: { argb: "FF0000FF" } } : {}) };
      c.alignment = { vertical: "top", wrapText: true, horizontal: j === 0 || j === 3 || j === 4 ? "center" : undefined };
      if ([4, 5, 6].includes(j)) c.fill = inputFill;
    });
    row.getCell(6).numFmt = MONEY;
    row.getCell(7).numFmt = PCT;
    row.getCell(8).value = { formula: `E${r}*F${r}*(1-G${r})` };
    row.getCell(8).numFmt = MONEY; row.getCell(8).font = { name: FONT, size: 10, bold: true };
    row.height = Math.max(30, 15 * (String(title).split("\n").length + Math.ceil(String(l.details || "").length / 40)));
  });
  const last = Math.max(r, first);
  if (!(q.lines || []).length) r++;

  // Totals — recurring and one-time, all live formulas
  r += 2;
  const lab = (row, text, strong) => {
    ws.mergeCells(`E${row}:G${row}`);
    put(`E${row}`, text, { font: { bold: true, color: { argb: strong ? "FFFFFFFF" : "FF334155" } }, fill: strong ? tealFill : greyFill, border: true, alignment: { horizontal: "right" } });
  };
  const val = (row, formula, fmt = MONEY, style = {}) => {
    put(`H${row}`, formula == null ? null : (typeof formula === "string" ? { formula } : formula), { numFmt: fmt, border: true, ...style });
  };

  const rDisc = r, rVat = r + 1;
  lab(rDisc, L("Discount %", "نسبة الخصم")); val(rDisc, num(q.discountPct) / 100, PCT, { fill: inputFill, font: blue });
  lab(rVat, L("VAT %", "ضريبة القيمة المضافة")); val(rVat, num(q.vatPct) / 100, PCT, { fill: inputFill, font: blue });
  r += 3;

  const range = `D${first}:D${last}`, amt = `H${first}:H${last}`;
  const block = (title, kindText, totalLabel) => {
    ws.mergeCells(`E${r}:H${r}`);
    put(`E${r}`, title, { font: { bold: true, size: 11, color: { argb: "FF0F766E" } } });
    const s = r + 1, d = r + 2, n = r + 3, v = r + 4, tt = r + 5;
    lab(s, L("Subtotal", "المجموع")); val(s, `SUMIF(${range},"${kindText}",${amt})`);
    lab(d, L("Discount", "الخصم")); val(d, `-H${s}*$H$${rDisc}`);
    lab(n, L("Net", "الصافي")); val(n, `H${s}+H${d}`);
    lab(v, L("VAT", "الضريبة")); val(v, `H${n}*$H$${rVat}`);
    lab(tt, totalLabel, true); val(tt, `H${n}+H${v}`, MONEY, { font: { bold: true, size: 12, color: { argb: "FFFFFFFF" } }, fill: tealFill });
    r = tt + 2;
    return tt;
  };
  const recTotal = block(
    cyc.id === "one_time" ? L("Fees", "الرسوم") : L(`${cyc.en} subscription`, `الاشتراك ال${cyc.ar}`),
    "Recurring",
    cyc.id === "one_time" ? L("Total", "الإجمالي") : L(`Total ${cyc.perEn}`, `الإجمالي ${cyc.perAr}`)
  );
  const oneTotal = block(L("One-time fees", "رسوم لمرة واحدة"), "One-time", L("Total one-time", "إجمالي لمرة واحدة"));

  if (cyc.months > 0) {
    lab(r, L("Contract value", "قيمة العقد"), true);
    val(r, `H${recTotal}*H${rMonths}/${cyc.months}+H${oneTotal}`, MONEY, { font: { bold: true, size: 12, color: { argb: "FFFFFFFF" } }, fill: tealFill });
    r += 2;
  }
  ws.mergeCells(`A${r}:H${r}`);
  put(`A${r}`, { formula: `"${ar ? "All amounts in " : "All amounts in "}"&H${rCur}${ar ? `&" · جميع المبالغ بعملة "&H${rCur}` : ""}` }, { font: { italic: true, size: 9, color: { argb: "FF64748B" } } });
  r += 2;

  // Terms & notes
  const terms = String(q.terms || "").split(/\n+/).map((s) => s.trim()).filter(Boolean);
  if (terms.length) {
    ws.mergeCells(`A${r}:H${r}`); put(`A${r}`, L("Terms & conditions", "الشروط والأحكام"), { font: { bold: true, size: 11, color: { argb: "FF0F766E" } } });
    terms.forEach((tx, i) => {
      r++; ws.mergeCells(`A${r}:H${r}`);
      put(`A${r}`, `${i + 1}. ${tx}`, { font: { size: 9, color: { argb: "FF334155" } }, alignment: { wrapText: true, vertical: "top" } });
      ws.getRow(r).height = Math.max(16, 14 * Math.ceil(tx.length / 110));
    });
    r += 2;
  }
  if (q.notes) {
    ws.mergeCells(`A${r}:H${r}`); put(`A${r}`, L("Notes", "ملاحظات"), { font: { bold: true, size: 11, color: { argb: "FF0F766E" } } });
    r++; ws.mergeCells(`A${r}:H${r}`);
    put(`A${r}`, q.notes, { font: { size: 10 }, alignment: { wrapText: true, vertical: "top" } });
    ws.getRow(r).height = Math.max(18, 15 * String(q.notes).split("\n").length);
    r += 2;
  }
  ws.mergeCells(`A${r}:H${r}`);
  put(`A${r}`, L("Yellow cells (blue text) are inputs — change them and every total recalculates.", "الخلايا الصفراء بالخط الأزرق مدخلات — عدّلها وكل المجاميع بتنحسب من جديد."), { font: { italic: true, size: 8, color: { argb: "FF94A3B8" } } });

  return wb;
}
