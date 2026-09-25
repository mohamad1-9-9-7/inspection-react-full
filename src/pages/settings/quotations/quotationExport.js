// src/pages/settings/quotations/quotationExport.js
// -----------------------------------------------------------------------------
// Everything a quotation turns into:
//   • buildQuoteHtml(q, {logo})  — the A4 document (preview, print, PDF source).
//   • printQuote(q, opts)        — browser print (Arabic-safe, "Save as PDF").
//   • downloadQuotePdf(q, opts)  — real .pdf file: the same HTML, page by page.
//   • downloadQuoteXlsx(q, opts) — editable Excel with LIVE formulas.
// -----------------------------------------------------------------------------

import {
  TERM_GROUPS, computeTotals, cycleById, dmy, fmtMoney, lineTotal, num, statusById,
  termTemplate, termText, termsListOf, themeById, unitById, validUntil,
} from "./quotationCore";
import { htmlToPdf, printHtml } from "../_shared/docRender";

const esc = (s) => String(s ?? "").replace(/[<>&"]/g, (m) =>
  ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", "\"": "&quot;" }[m]));

const safeName = (s) => String(s || "quotation").replace(/[^\w؀-ۿ-]+/g, "_").replace(/_+/g, "_").slice(0, 80);
export const quoteFileBase = (q) => safeName(`${q.number || "Quotation"}_${q.clientName || ""}`);

const initials = (name) => String(name || "Q").trim().split(/\s+/).slice(0, 2).map((w) => w[0]).join("").toUpperCase();

/* ═══════════════════════════ HTML document ═══════════════════════════ */

export function buildQuoteHtml(q, opts = {}) {
  const t = computeTotals(q);
  const th = themeById(q.theme);
  const cyc = cycleById(q.cycle);
  const ar = q.showArabic !== false;
  const cur = q.currency || "";
  const all = q.lines || [];
  const recurring = all.filter((l) => !l.optional && l.kind !== "one_time");
  const oneTime = all.filter((l) => !l.optional && l.kind === "one_time");
  const optional = all.filter((l) => l.optional);
  const hasLineDisc = all.some((l) => num(l.discountPct) > 0);
  const logo = q.showLogo !== false && opts.logo ? String(opts.logo) : "";
  const st = statusById(q.status);

  const bi = (en, arTxt, cls = "") => ar
    ? `<span class="bi ${cls}"><span class="en">${en}</span><span class="ar" dir="rtl">${arTxt}</span></span>`
    : `<span class="${cls}">${en}</span>`;
  const inline = (en, arTxt) => (ar ? `${en} <span class="arI" dir="rtl">${arTxt}</span>` : en);

  let n = 0;
  const lineRows = (list) => list.map((l) => {
    n += 1;
    return `
    <tr>
      <td class="no">${String(n).padStart(2, "0")}</td>
      <td>
        <div class="li-t">${esc(l.titleEn) || "—"}</div>
        ${ar && l.titleAr ? `<div class="li-ar" dir="rtl">${esc(l.titleAr)}</div>` : ""}
        ${l.details ? `<div class="li-d" dir="auto">${esc(l.details)}</div>` : ""}
      </td>
      <td class="c nowrap">${esc(num(l.qty))}<div class="unit">${esc(unitById(l.unit).en)}${ar ? ` · ${esc(unitById(l.unit).ar)}` : ""}</div></td>
      <td class="r nowrap">${fmtMoney(l.unitPrice)}</td>
      ${hasLineDisc ? `<td class="c nowrap">${num(l.discountPct) ? `<span class="disc">−${num(l.discountPct)}%</span>` : "—"}</td>` : ""}
      <td class="r nowrap amt">${fmtMoney(lineTotal(l))}</td>
    </tr>`;
  }).join("");

  const head = `
    <thead><tr>
      <th class="no">#</th>
      <th>${inline("Description", "الوصف")}</th>
      <th class="c">${inline("Qty", "الكمية")}</th>
      <th class="r">${inline("Unit price", "السعر")}</th>
      ${hasLineDisc ? `<th class="c">${inline("Disc.", "خصم")}</th>` : ""}
      <th class="r">${inline("Amount", "المبلغ")} <span class="cur">${esc(cur)}</span></th>
    </tr></thead>`;

  const section = (en, arTxt, list, badge) => list.length ? `
    <div class="sec-h">${bi(en, arTxt)}${badge ? `<span class="badge">${badge}</span>` : ""}</div>
    <table class="items">${head}<tbody>${lineRows(list)}</tbody></table>` : "";

  const totalsCard = (title, s) => `
    <div class="tcard">
      <div class="tc-h">${title}</div>
      <div class="tr"><span>${inline("Subtotal", "المجموع")}</span><b>${fmtMoney(s.sub)}</b></div>
      ${num(q.discountPct) ? `<div class="tr save"><span>${inline(`Discount ${num(q.discountPct)}%`, "خصم")}</span><b>− ${fmtMoney(s.disc)}</b></div>` : ""}
      ${num(q.vatPct) ? `<div class="tr"><span>${inline(`VAT ${num(q.vatPct)}%`, "الضريبة")}</span><b>${fmtMoney(s.vat)}</b></div>` : ""}
      <div class="tg"><span>${s.label}</span><b>${fmtMoney(s.total, cur)}</b></div>
    </div>`;

  const heroValue = recurring.length ? t.recurringTotal : t.oneTimeTotal;
  const heroLabel = recurring.length && cyc.months > 0
    ? inline(`Total ${cyc.perEn}`, `الإجمالي ${cyc.perAr}`)
    : inline("Total", "الإجمالي");

  /* Terms grouped by topic, numbered continuously. */
  const terms = termsListOf(q).filter((x) => x.on);
  let tn = 0;
  const groupOf = (x) => (x.key ? termTemplate(x.key)?.group : "other") || "other";
  const groups = [...TERM_GROUPS, { id: "other", en: "Other", ar: "أخرى" }]
    .map((g) => ({ g, items: terms.filter((x) => groupOf(x) === g.id) }))
    .filter((x) => x.items.length);
  const termsHtml = groups.map(({ g, items }) => `
    <div class="tg-h">${inline(g.en, g.ar)}</div>
    ${items.map((x) => {
      tn += 1;
      const en = termText(x, q, "en");
      const a = ar ? termText(x, q, "ar") : "";
      return `<div class="term"><span class="tn">${tn}</span><div>${en ? `<div dir="auto">${esc(en)}</div>` : ""}${a ? `<div class="t-ar" dir="rtl">${esc(a)}</div>` : ""}</div></div>`;
    }).join("")}`).join("");

  return `<!doctype html>
<html><head><meta charset="utf-8"><title>${esc(q.number)} — ${esc(q.clientName)}</title>
<style>
  @page { size: A4; margin: 10mm; }
  * { box-sizing: border-box; }
  :root { --a: ${th.a}; --b: ${th.b}; --soft: ${th.soft}; --line: ${th.line}; --ink: #0f172a; --mut: #64748b; }
  body { margin: 0; background: #fff; color: var(--ink); font: 12.5px/1.55 "Segoe UI", "Inter", Tahoma, Cairo, Arial, sans-serif; }
  .doc { max-width: 794px; margin: 0 auto; background: #fff; }
  .c { text-align: center; } .r { text-align: right; } .nowrap { white-space: nowrap; }
  .arI { color: inherit; opacity: .72; font-weight: 600; }
  .bi { display: inline-flex; gap: 8px; align-items: baseline; flex-wrap: wrap; }
  .bi .ar { opacity: .75; font-weight: 700; }

  /* ─── header band ─── */
  .band { position: relative; overflow: hidden; color: #fff; padding: 26px 30px 22px;
          background: linear-gradient(120deg, var(--a) 0%, var(--a) 45%, var(--b) 100%); }
  .band:before { content: ""; position: absolute; right: -80px; top: -120px; width: 320px; height: 320px; border-radius: 50%; background: rgba(255,255,255,.08); }
  .band:after  { content: ""; position: absolute; right: 120px; bottom: -150px; width: 260px; height: 260px; border-radius: 50%; background: rgba(255,255,255,.06); }
  .band-in { position: relative; display: flex; justify-content: space-between; gap: 18px; align-items: flex-start; }
  .brand { display: flex; gap: 14px; align-items: center; }
  .logo { width: 62px; height: 62px; border-radius: 14px; background: #fff; display: grid; place-items: center; overflow: hidden; box-shadow: 0 8px 20px rgba(0,0,0,.18); }
  .logo img { max-width: 54px; max-height: 54px; object-fit: contain; }
  .logo span { font-weight: 900; font-size: 22px; color: var(--a); }
  .iss-n { font-size: 19px; font-weight: 800; letter-spacing: .2px; }
  .iss-d { font-size: 11px; opacity: .85; margin-top: 3px; line-height: 1.5; }
  .qt { text-align: right; }
  .qt-k { font-size: 11px; letter-spacing: 3px; font-weight: 700; opacity: .85; }
  .qt-h { font-size: 30px; font-weight: 900; letter-spacing: 1.5px; line-height: 1.05; }
  .qt-ar { font-size: 17px; font-weight: 800; opacity: .9; }
  .chips { position: relative; display: flex; gap: 8px; flex-wrap: wrap; margin-top: 16px; }
  .chip { background: rgba(255,255,255,.14); border: 1px solid rgba(255,255,255,.28); border-radius: 999px; padding: 4px 12px; font-size: 11px; }
  .chip b { font-weight: 800; }
  .chip.st { background: #fff; color: ${st.tone}; border-color: #fff; font-weight: 800; }

  .body { padding: 22px 30px 26px; }

  /* ─── parties + hero total ─── */
  .grid3 { display: grid; grid-template-columns: 1.25fr 1fr 1fr; gap: 12px; }
  .card { border: 1px solid #e2e8f0; border-radius: 12px; padding: 12px 14px; background: #fff; }
  .card-k { font-size: 10px; font-weight: 800; letter-spacing: 1px; text-transform: uppercase; color: var(--a); }
  .card-k .ar { text-transform: none; letter-spacing: 0; }
  .card-n { font-size: 15px; font-weight: 800; margin-top: 3px; }
  .card-d { color: #475569; font-size: 11.5px; margin-top: 2px; line-height: 1.55; }
  .kv { display: flex; justify-content: space-between; gap: 8px; font-size: 11.5px; color: #475569; padding: 2px 0; }
  .kv b { color: var(--ink); }
  .hero { border-radius: 12px; padding: 12px 14px; color: #fff; background: linear-gradient(140deg, var(--a), var(--b)); display: flex; flex-direction: column; justify-content: space-between; }
  .hero-k { font-size: 10.5px; font-weight: 700; opacity: .9; letter-spacing: .5px; }
  .hero-v { font-size: 22px; font-weight: 900; margin-top: 4px; line-height: 1.1; }
  .hero-s { font-size: 10.5px; opacity: .9; margin-top: 6px; }

  .title { margin: 20px 0 2px; font-size: 18px; font-weight: 900; color: var(--ink); }
  .title-ar { font-size: 14px; font-weight: 800; color: #475569; }
  .intro { color: #334155; white-space: pre-wrap; unicode-bidi: plaintext; text-align: start; margin: 8px 0 0; padding: 10px 14px; background: var(--soft); border-radius: 10px; border-inline-start: 4px solid var(--a); }

  /* ─── items ─── */
  .sec-h { display: flex; align-items: center; gap: 10px; margin: 22px 0 8px; font-size: 12px; font-weight: 900; letter-spacing: .8px; text-transform: uppercase; color: var(--a); }
  .sec-h .ar { text-transform: none; letter-spacing: 0; }
  .sec-h:after { content: ""; flex: 1; height: 1px; background: var(--line); }
  .badge { font-size: 10px; background: var(--soft); color: var(--a); border: 1px solid var(--line); padding: 1px 8px; border-radius: 999px; letter-spacing: 0; text-transform: none; }
  table.items { width: 100%; border-collapse: separate; border-spacing: 0; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; }
  table.items th { background: var(--soft); color: #334155; font-size: 10.5px; font-weight: 800; padding: 8px 10px; text-align: left; border-bottom: 1px solid #e2e8f0; }
  table.items th.r { text-align: right; } table.items th.c { text-align: center; }
  table.items th .cur { color: var(--a); }
  table.items td { padding: 9px 10px; border-bottom: 1px solid #f1f5f9; vertical-align: top; }
  table.items tr:last-child td { border-bottom: 0; }
  td.no, th.no { width: 34px; color: #94a3b8; font-weight: 800; text-align: center; }
  .li-t { font-weight: 800; }
  .li-ar { color: #475569; font-size: 12px; text-align: right; font-weight: 600; }
  .li-d { color: var(--mut); font-size: 10.5px; margin-top: 2px; white-space: pre-wrap; unicode-bidi: plaintext; text-align: start; }
  .unit { font-size: 10px; color: #94a3b8; }
  .amt { font-weight: 900; }
  .disc { color: #b91c1c; font-weight: 800; }
  .opt table.items td { color: #475569; }
  .opt-note { font-size: 10.5px; color: var(--mut); margin-top: 4px; }

  /* ─── totals ─── */
  .tots { display: flex; gap: 12px; justify-content: flex-end; flex-wrap: wrap; margin-top: 14px; }
  .tcard { min-width: 280px; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; }
  .tc-h { background: var(--soft); padding: 7px 14px; font-size: 10.5px; font-weight: 900; letter-spacing: .6px; text-transform: uppercase; color: #334155; }
  .tr { display: flex; justify-content: space-between; gap: 14px; padding: 6px 14px; border-top: 1px solid #f1f5f9; color: #475569; }
  .tr b { color: var(--ink); } .tr.save b { color: #b91c1c; }
  .tg { display: flex; justify-content: space-between; gap: 14px; padding: 10px 14px; color: #fff; font-weight: 900; font-size: 14px; background: linear-gradient(120deg, var(--a), var(--b)); }
  .sums { display: flex; gap: 12px; justify-content: flex-end; flex-wrap: wrap; margin-top: 10px; }
  .sum { border: 1px dashed var(--line); background: var(--soft); border-radius: 12px; padding: 8px 14px; text-align: right; min-width: 180px; }
  .sum-l { font-size: 10.5px; color: #475569; } .sum-v { font-size: 15px; font-weight: 900; color: var(--a); }

  /* ─── terms ─── */
  .terms { margin-top: 6px; border: 1px solid #e2e8f0; border-radius: 12px; padding: 6px 14px 10px; }
  .tg-h { margin: 10px 0 4px; font-size: 10.5px; font-weight: 900; letter-spacing: .6px; text-transform: uppercase; color: var(--a); }
  .term { display: flex; gap: 10px; padding: 4px 0; font-size: 11.2px; color: #334155; }
  .tn { flex: 0 0 20px; height: 20px; border-radius: 6px; background: var(--soft); color: var(--a); font-weight: 900; font-size: 10px; display: grid; place-items: center; margin-top: 1px; }
  .term > div { flex: 1; min-width: 0; }
  .t-ar { text-align: right; color: #475569; }
  .valid { margin-top: 10px; padding: 8px 12px; border-radius: 10px; background: #fffbeb; border: 1px solid #fde68a; color: #92400e; font-weight: 700; font-size: 11.5px; display: flex; justify-content: space-between; gap: 10px; flex-wrap: wrap; }
  .notes { white-space: pre-wrap; unicode-bidi: plaintext; text-align: start; color: #334155; background: var(--soft); border-radius: 10px; padding: 10px 14px; }

  .sign { display: grid; grid-template-columns: 1fr 1fr; gap: 28px; margin-top: 30px; }
  .sign > div { border-top: 2px solid var(--ink); padding-top: 8px; font-size: 11px; color: #475569; }
  .sign b { color: var(--ink); }
  .foot { margin-top: 22px; padding-top: 10px; border-top: 1px solid #e2e8f0; display: flex; justify-content: space-between; font-size: 10px; color: #94a3b8; }
  .avoid { break-inside: avoid; page-break-inside: avoid; }
</style></head>
<body><div class="doc">

  <div class="band">
    <div class="band-in">
      <div class="brand">
        <div class="logo">${logo ? `<img src="${esc(logo)}" alt="">` : `<span>${esc(initials(q.issuerName))}</span>`}</div>
        <div>
          <div class="iss-n">${esc(q.issuerName) || "—"}</div>
          <div class="iss-d">${[q.issuerAddress, q.issuerTaxId ? `TRN ${q.issuerTaxId}` : "", [q.issuerEmail, q.issuerPhone].filter(Boolean).join(" · ")].filter(Boolean).map(esc).join("<br>")}</div>
        </div>
      </div>
      <div class="qt">
        <div class="qt-k">${esc(q.number) || ""}</div>
        <div class="qt-h">QUOTATION</div>
        ${ar ? `<div class="qt-ar">عرض سعر</div>` : ""}
      </div>
    </div>
    <div class="chips">
      <span class="chip">${inline("Date", "التاريخ")} <b>${dmy(q.issueDate)}</b></span>
      <span class="chip">${inline("Valid until", "صالح حتى")} <b>${dmy(validUntil(q))}</b></span>
      <span class="chip">${inline("Billing", "الفوترة")} <b>${cyc.en}${ar ? ` · ${cyc.ar}` : ""}</b></span>
      <span class="chip st">${st.en}${ar ? ` · ${st.ar}` : ""}</span>
    </div>
  </div>

  <div class="body">
    <div class="grid3 avoid">
      <div class="card">
        <div class="card-k">${inline("Prepared for", "مقدّم إلى")}</div>
        <div class="card-n" dir="auto">${esc(q.clientName) || "—"}</div>
        <div class="card-d">${[q.clientContact ? `Attn: ${q.clientContact}` : "", q.clientAddress, [q.clientEmail, q.clientPhone].filter(Boolean).join(" · ")].filter(Boolean).map(esc).join("<br>")}</div>
      </div>
      <div class="card">
        <div class="card-k">${inline("Offer", "العرض")}</div>
        <div class="kv"><span>${inline("Currency", "العملة")}</span><b>${esc(cur)}</b></div>
        ${cyc.months > 0 && num(q.contractMonths) ? `<div class="kv"><span>${inline("Contract", "العقد")}</span><b>${num(q.contractMonths)} ${ar ? "mo · شهر" : "months"}</b></div>` : ""}
        <div class="kv"><span>${inline("Items", "البنود")}</span><b>${recurring.length + oneTime.length}</b></div>
        ${q.preparedBy ? `<div class="kv"><span>${inline("By", "بواسطة")}</span><b dir="auto">${esc(q.preparedBy)}</b></div>` : ""}
      </div>
      <div class="hero">
        <div>
          <div class="hero-k">${heroLabel}</div>
          <div class="hero-v">${fmtMoney(heroValue, cur)}</div>
        </div>
        <div class="hero-s">${recurring.length && oneTime.length ? `${inline("+ one-time", "+ مرة واحدة")} ${fmtMoney(t.oneTimeTotal, cur)}<br>` : ""}${num(q.vatPct) ? inline(`incl. ${num(q.vatPct)}% VAT`, "شامل الضريبة") : ""}</div>
      </div>
    </div>

    ${q.title || q.titleAr ? `<div class="title" dir="auto">${esc(q.title)}${ar && q.titleAr ? `<div class="title-ar" dir="rtl">${esc(q.titleAr)}</div>` : ""}</div>` : ""}
    ${q.intro ? `<div class="intro">${esc(q.intro)}</div>` : ""}

    ${section(cyc.id === "one_time" ? "Items" : `Subscription · billed ${cyc.en.toLowerCase()}`, cyc.id === "one_time" ? "البنود" : `الاشتراك · ${cyc.ar}`, recurring)}
    ${section("One-time fees", "رسوم لمرة واحدة", oneTime)}

    <div class="tots avoid">
      ${recurring.length ? totalsCard(cyc.id === "one_time" ? inline("Fees", "الرسوم") : inline(`${cyc.en} subscription`, "الاشتراك"), {
        sub: t.recurring, disc: t.recurringDiscount, vat: t.recurringVat, total: t.recurringTotal,
        label: cyc.id === "one_time" ? inline("Total", "الإجمالي") : inline(`Total ${cyc.perEn}`, `الإجمالي ${cyc.perAr}`),
      }) : ""}
      ${oneTime.length ? totalsCard(inline("One-time", "مرة واحدة"), {
        sub: t.oneTime, disc: t.oneTimeDiscount, vat: t.oneTimeVat, total: t.oneTimeTotal,
        label: inline("Total one-time", "إجمالي لمرة واحدة"),
      }) : ""}
    </div>
    <div class="sums avoid">
      ${recurring.length && cyc.months > 0 && num(q.contractMonths) > 0 ? `<div class="sum"><div class="sum-l">${inline(`Contract value · ${num(q.contractMonths)} months`, `قيمة العقد · ${num(q.contractMonths)} شهر`)}</div><div class="sum-v">${fmtMoney(t.contractValue, cur)}</div></div>` : ""}
      ${recurring.length && oneTime.length ? `<div class="sum"><div class="sum-l">${inline("First invoice", "الفاتورة الأولى")}</div><div class="sum-v">${fmtMoney(t.firstInvoice, cur)}</div></div>` : ""}
      ${t.savings > 0 ? `<div class="sum"><div class="sum-l">${inline("You save", "توفيرك")}</div><div class="sum-v">${fmtMoney(t.savings, cur)}</div></div>` : ""}
    </div>

    ${optional.length ? `<div class="opt avoid">${section("Optional add-ons", "إضافات اختيارية", optional, ar ? "not included · غير مشمولة" : "not included")}
      <div class="opt-note">${inline("Prices before VAT. Add any of them on request.", "الأسعار قبل الضريبة، ويمكن إضافة أي منها عند الطلب.")}</div></div>` : ""}

    ${terms.length ? `<div class="sec-h">${bi("Terms & conditions", "الشروط والأحكام")}</div><div class="terms">${termsHtml}</div>` : ""}
    <div class="valid avoid"><span>This quotation is valid until ${dmy(validUntil(q))}.</span>${ar ? `<span dir="rtl">هذا العرض صالح حتى ${dmy(validUntil(q))}.</span>` : ""}</div>

    ${q.notes ? `<div class="avoid"><div class="sec-h">${bi("Notes", "ملاحظات")}</div><div class="notes">${esc(q.notes)}</div></div>` : ""}

    <div class="sign avoid">
      <div>${inline("For", "عن")} <b>${esc(q.issuerName) || "—"}</b><br>${inline("Name, signature & date", "الاسم والتوقيع والتاريخ")}</div>
      <div>${inline("Accepted by", "موافقة")} <b dir="auto">${esc(q.clientName) || "—"}</b><br>${inline("Name, signature, stamp & date", "الاسم والتوقيع والختم والتاريخ")}</div>
    </div>

    <div class="foot"><span>${esc(q.issuerName)}</span><span>${esc(q.number)} · ${dmy(q.issueDate)}</span></div>
  </div>
</div></body></html>`;
}

/* ═══════════════════════════ Print / PDF ═══════════════════════════ */

export function printQuote(q, opts = {}) {
  return printHtml(buildQuoteHtml(q, opts));
}

export function downloadQuotePdf(q, opts = {}) {
  return htmlToPdf(buildQuoteHtml(q, opts), `${quoteFileBase(q)}.pdf`);
}

/* ═══════════════════════════ Excel (live formulas) ═══════════════════════════ */

function saveBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1500);
}

export async function downloadQuoteXlsx(q, opts = {}) {
  const mod = await import("exceljs");
  const wb = buildQuoteWorkbook(q, mod.default || mod, opts);
  const buf = await wb.xlsx.writeBuffer({ useStyles: true, useSharedStrings: true });
  saveBlob(new Blob([buf], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }), `${quoteFileBase(q)}.xlsx`);
}

export function buildQuoteWorkbook(q, ExcelJS, opts = {}) {
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
  const th = themeById(q.theme);
  const argb = (hex) => `FF${hex.replace("#", "").toUpperCase()}`;
  const ACCENT = argb(th.a);
  const tealFill = { type: "pattern", pattern: "solid", fgColor: { argb: ACCENT } };
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

  // Header (logo sits over column A when there is one)
  const logo = opts.logo && q.showLogo !== false ? String(opts.logo) : "";
  if (logo.startsWith("data:image/")) {
    const ext = /^data:image\/(png|jpe?g|gif)/i.exec(logo)?.[1]?.toLowerCase().replace("jpg", "jpeg") || "png";
    const id = wb.addImage({ base64: logo, extension: ext });
    ws.addImage(id, { tl: { col: 0, row: 0 }, ext: { width: 56, height: 56 }, editAs: "oneCell" });
    ws.getRow(1).height = 30; ws.getRow(2).height = 26;
  }
  ws.mergeCells("A1:D1"); put("A1", `${logo ? "            " : ""}${q.issuerName || ""}`, { font: { bold: true, size: 16 } });
  ws.mergeCells("E1:H1"); put("E1", ar ? "QUOTATION  ·  عرض سعر" : "QUOTATION", { font: { bold: true, size: 18, color: { argb: ACCENT } }, alignment: { horizontal: "right" } });
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
  put("A4", L("Quotation for", "مقدّم إلى"), { font: { bold: true, size: 9, color: { argb: ACCENT } } });
  ws.mergeCells("A5:D5"); put("A5", q.clientName || "", { font: { bold: true, size: 13 } });
  ws.mergeCells("A6:D6"); put("A6", q.clientContact ? `Attn: ${q.clientContact}` : "", { font: { color: { argb: "FF475569" } } });
  ws.mergeCells("A7:D7"); put("A7", [q.clientEmail, q.clientPhone].filter(Boolean).join("  ·  "), { font: { color: { argb: "FF475569" } } });
  ws.mergeCells("A8:D8"); put("A8", q.clientAddress || "", { font: { color: { argb: "FF475569" } } });
  if (q.title || q.titleAr) { ws.mergeCells("A10:D10"); put("A10", [q.title, ar ? q.titleAr : ""].filter(Boolean).join("  ·  "), { font: { bold: true, size: 12 } }); }

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
    const vals = [i + 1, title, l.details || "", l.optional ? "Optional" : l.kind === "one_time" ? "One-time" : "Recurring", num(l.qty), num(l.unitPrice), num(l.discountPct) / 100, null];
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
    put(`E${r}`, title, { font: { bold: true, size: 11, color: { argb: ACCENT } } });
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

  if ((q.lines || []).some((l) => l.optional)) {
    lab(r, L("Optional add-ons (not included)", "إضافات اختيارية (غير مشمولة)"));
    val(r, `SUMIF(${range},"Optional",${amt})`);
    r += 2;
  }
  if (cyc.months > 0) {
    lab(r, L("Contract value", "قيمة العقد"), true);
    val(r, `H${recTotal}*H${rMonths}/${cyc.months}+H${oneTotal}`, MONEY, { font: { bold: true, size: 12, color: { argb: "FFFFFFFF" } }, fill: tealFill });
    r += 2;
  }
  ws.mergeCells(`A${r}:H${r}`);
  put(`A${r}`, { formula: `"${ar ? "All amounts in " : "All amounts in "}"&H${rCur}${ar ? `&" · جميع المبالغ بعملة "&H${rCur}` : ""}` }, { font: { italic: true, size: 9, color: { argb: "FF64748B" } } });
  r += 2;

  // Terms & notes
  const terms = termsListOf(q).filter((x) => x.on);
  if (terms.length) {
    ws.mergeCells(`A${r}:H${r}`); put(`A${r}`, L("Terms & conditions", "الشروط والأحكام"), { font: { bold: true, size: 11, color: { argb: ACCENT } } });
    terms.forEach((term, i) => {
      const en = termText(term, q, "en");
      const arTxt = ar ? termText(term, q, "ar") : "";
      const tx = [en, arTxt].filter(Boolean).join("\n");
      r++; ws.mergeCells(`A${r}:H${r}`);
      put(`A${r}`, `${i + 1}. ${tx}`, { font: { size: 9, color: { argb: "FF334155" } }, alignment: { wrapText: true, vertical: "top" } });
      ws.getRow(r).height = Math.max(16, 14 * (Math.ceil(en.length / 110) + (arTxt ? Math.ceil(arTxt.length / 110) : 0)));
    });
    r += 2;
  }
  if (q.notes) {
    ws.mergeCells(`A${r}:H${r}`); put(`A${r}`, L("Notes", "ملاحظات"), { font: { bold: true, size: 11, color: { argb: ACCENT } } });
    r++; ws.mergeCells(`A${r}:H${r}`);
    put(`A${r}`, q.notes, { font: { size: 10 }, alignment: { wrapText: true, vertical: "top" } });
    ws.getRow(r).height = Math.max(18, 15 * String(q.notes).split("\n").length);
    r += 2;
  }
  ws.mergeCells(`A${r}:H${r}`);
  put(`A${r}`, L("Yellow cells (blue text) are inputs — change them and every total recalculates.", "الخلايا الصفراء بالخط الأزرق مدخلات — عدّلها وكل المجاميع بتنحسب من جديد."), { font: { italic: true, size: 8, color: { argb: "FF94A3B8" } } });

  return wb;
}
