// src/pages/settings/invoices/invoiceDocument.js
// -----------------------------------------------------------------------------
// The invoice as a customer receives it: a self-contained A4 HTML document
// (preview, print, PDF source — see _shared/docRender). English only, so
// the rasterised PDF never has to shape Arabic.
//
// It prints ONLY what the server froze on the invoice (seller snapshot,
// lines, VAT split, totals). Nothing is recomputed or re-read from today's
// profile, so a re-print years later shows exactly what was issued.
// -----------------------------------------------------------------------------

import { STATUS, amountInWords, day, fmtDate, fmtMoney, statusOf } from "./invoiceCore";
import { DOC_BRAND as B, DOC_FONTS, PRINT_BREAK_CSS, htmlToPdf, printHtml } from "../_shared/docRender";

const esc = (s) => String(s ?? "").replace(/[<>&"]/g, (m) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;" }[m]));
const initials = (name) => String(name || "?").trim().split(/\s+/).slice(0, 2).map((w) => w[0]).join("").toUpperCase();
const iban4 = (v) => String(v || "").replace(/\s+/g, "").replace(/(.{4})/g, "$1 ").trim();

/* Legacy invoices (issued before lines existed) still print: one line. */
function linesOf(inv) {
  if (Array.isArray(inv.lines) && inv.lines.length) return inv.lines;
  const amount = Number(inv.subtotal ?? inv.amount ?? 0);
  return [{ description: `Subscription — ${inv.plan_name || "plan"}`, qty: 1, unit_price: amount, total: amount }];
}

export function buildInvoiceHtml(inv) {
  const s = inv.seller || {};
  const cur = inv.currency || "AED";
  const lines = linesOf(inv);
  const subtotal = Number(inv.subtotal ?? inv.amount ?? 0);
  const vatPct = Number(inv.vat_pct || 0);
  const vat = Number(inv.vat_amount || 0);
  const total = Number(inv.amount || 0);
  const status = statusOf(inv);
  const stamp = status === "paid" ? "PAID" : status === "void" ? "VOID" : "";
  const title = inv.title || (s.vat_registered ? "Tax Invoice" : "Invoice");
  const licence = s.license_no ? [`Licence No. ${s.license_no}`, s.license_authority].filter(Boolean).join(" · ") : "";
  const contact = [s.email, s.phone, s.website].filter(Boolean).join("  ·  ");
  const period = day(inv.period_start) || day(inv.period_end)
    ? `${fmtDate(inv.period_start)} – ${fmtDate(inv.period_end)}` : "";

  const rows = lines.map((l, i) => `
    <tr>
      <td class="n">${i + 1}</td>
      <td>${esc(l.description)}</td>
      <td class="r">${esc(Number(l.qty).toLocaleString("en-US"))}</td>
      <td class="r">${esc(fmtMoney(l.unit_price, cur))}</td>
      <td class="r b">${esc(fmtMoney(l.total ?? l.qty * l.unit_price, cur))}</td>
    </tr>`).join("");

  const st = STATUS[status] || STATUS.unpaid;
  const legal = s.legal_name && s.legal_name !== s.name ? s.legal_name : "";
  const footLeft = [legal || s.name || "INSPECT PRO", licence].filter(Boolean).join(" · ");

  return `<!doctype html><html><head><meta charset="utf-8"><title>${esc(inv.invoice_number)}</title>
${DOC_FONTS}
<style>
  @page { size: A4; margin: 0; }
  ${PRINT_BREAK_CSS}
  * { box-sizing: border-box; }
  body { margin: 0; background: #fff; color: #0f172a; font: 13px/1.5 "Segoe UI", Inter, Arial, sans-serif; }
  .doc { width: 794px; min-height: 1123px; margin: 0 auto; position: relative; display: flex; flex-direction: column; }
  .mont { font-family: Montserrat, "Segoe UI", sans-serif; }

  /* header band — the brand navy, a teal edge */
  .band { background: ${B.navy}; color: #fff; padding: 34px 44px 28px; position: relative; overflow: hidden; }
  .band:after { content: ""; position: absolute; left: 0; right: 0; bottom: 0; height: 5px; background: ${B.teal}; }
  .band:before { content: ""; position: absolute; right: -90px; top: -110px; width: 300px; height: 300px; border-radius: 50%; border: 38px solid rgba(14,165,164,.13); }
  .top { position: relative; display: flex; justify-content: space-between; gap: 24px; align-items: flex-start; }
  .brand { display: flex; gap: 16px; align-items: center; min-width: 0; }
  .logo { width: 66px; height: 66px; border-radius: 16px; background: #fff; display: grid; place-items: center; overflow: hidden; flex-shrink: 0; font-weight: 900; font-size: 22px; color: ${B.navy}; }
  .logo img { max-width: 54px; max-height: 54px; object-fit: contain; }
  .sname { font: 800 22px/1.15 Montserrat, "Segoe UI", sans-serif; letter-spacing: .6px; }
  .sname span { color: ${B.teal}; }
  .legal { font-size: 10.5px; font-weight: 700; letter-spacing: .3px; margin-top: 3px; opacity: .95; }
  .sd { font-size: 11px; opacity: .78; margin-top: 4px; line-height: 1.55; }
  .title { text-align: right; flex-shrink: 0; }
  .title h1 { margin: 0; font: 800 30px/1 Montserrat, "Segoe UI", sans-serif; letter-spacing: 3px; }
  .num { margin-top: 8px; font-size: 13px; font-weight: 700; letter-spacing: 1px; opacity: .9; }
  .pill { display: inline-block; margin-top: 10px; padding: 3px 12px; border-radius: 999px; font-size: 11px; font-weight: 800; letter-spacing: .5px; background: ${st.bg}; color: ${st.fg}; }

  .body { padding: 26px 44px 0; flex: 1; }
  .facts { display: grid; grid-template-columns: 1fr 1fr 1.55fr 1.15fr; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; }
  .fact { padding: 10px 14px; border-inline-start: 1px solid #e2e8f0; }
  .fact:first-child { border-inline-start: 0; }
  .fk { font-size: 10px; font-weight: 800; letter-spacing: .08em; text-transform: uppercase; color: #64748b; }
  .fv { font-size: 13.5px; font-weight: 800; margin-top: 2px; }
  .fact.due { background: ${B.soft}; }
  .fact.due .fv { color: ${B.navy}; }

  .parties { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-top: 18px; }
  .card { border: 1px solid #e2e8f0; border-radius: 12px; padding: 13px 16px; }
  .lbl { font-size: 10px; font-weight: 800; letter-spacing: .08em; text-transform: uppercase; color: ${B.teal}; margin-bottom: 5px; }
  .who { font-size: 15px; font-weight: 800; }
  .muted { color: #475569; }
  .small { font-size: 12px; }

  table { width: 100%; border-collapse: separate; border-spacing: 0; margin-top: 22px; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; }
  th { background: ${B.navy}; color: #fff; font-size: 10.5px; letter-spacing: .08em; text-transform: uppercase; text-align: left; padding: 10px 14px; font-weight: 800; }
  td { padding: 11px 14px; border-top: 1px solid #eef2f7; vertical-align: top; }
  tbody tr:nth-child(even) td { background: #fafcfd; }
  .r { text-align: right; white-space: nowrap; }
  th.r { text-align: right; }
  .n { width: 38px; color: #94a3b8; font-weight: 800; }
  .b { font-weight: 800; }

  .sumrow { display: grid; grid-template-columns: 1fr 320px; gap: 20px; margin-top: 16px; align-items: start; }
  .words { border: 1px dashed ${B.teal}; background: ${B.soft}; border-radius: 12px; padding: 11px 14px; font-size: 12px; }
  .words b { display: block; margin-top: 2px; font-size: 12.5px; color: ${B.navy}; }
  .totals div { display: flex; justify-content: space-between; padding: 6px 14px; }
  .totals .grand { margin-top: 6px; background: ${B.navy}; color: #fff; border-radius: 12px; font-size: 16px; font-weight: 900; padding: 12px 14px; border-inline-start: 6px solid ${B.teal}; }
  .note { margin-top: 6px; font-size: 11.5px; color: #64748b; text-align: right; }

  .pay { margin-top: 24px; display: grid; grid-template-columns: 1.3fr 1fr; gap: 16px; }
  .box { border: 1px solid #e2e8f0; border-radius: 12px; padding: 14px 16px; background: #f8fafc; }
  .mono { font-family: Consolas, "Courier New", monospace; letter-spacing: .03em; }
  .foot { margin: 28px 44px 0; padding: 12px 0 26px; display: flex; justify-content: space-between; gap: 16px; font-size: 10.5px; color: #94a3b8; border-top: 1px solid #e2e8f0; }
  .stamp { position: absolute; top: 300px; right: 70px; transform: rotate(-14deg); border: 5px solid; border-radius: 14px; padding: 6px 22px; font-size: 44px; font-weight: 900; letter-spacing: .12em; opacity: .2; }
  .stamp.PAID { color: #15803d; } .stamp.VOID { color: #b91c1c; }
  @media print { .doc { min-height: 0; } }
</style></head><body>
<div class="doc">
  ${stamp ? `<div class="stamp ${stamp}">${stamp}</div>` : ""}
  <div class="band">
    <div class="top">
      <div class="brand">
        <div class="logo">${s.logo_url ? `<img src="${esc(s.logo_url)}" alt="">` : esc(initials(s.name))}</div>
        <div style="min-width:0">
          <div class="sname">${esc(s.name || "INSPECT PRO")}</div>
          ${legal ? `<div class="legal">${esc(legal)}</div>` : ""}
          <div class="sd">${[licence, s.vat_registered && s.trn ? `TRN ${s.trn}` : "", s.address, contact].filter(Boolean).map(esc).join("<br>")}</div>
        </div>
      </div>
      <div class="title">
        <h1>${esc(title.toUpperCase())}</h1>
        <div class="num">${esc(inv.invoice_number)}</div>
        <div class="pill">${esc(st.en.toUpperCase())}</div>
      </div>
    </div>
  </div>

  <div class="body">
    <div class="facts">
      <div class="fact"><div class="fk">Issue date</div><div class="fv">${esc(fmtDate(inv.issue_date))}</div></div>
      <div class="fact"><div class="fk">Due date</div><div class="fv">${esc(inv.due_date ? fmtDate(inv.due_date) : "—")}</div></div>
      <div class="fact"><div class="fk">Period</div><div class="fv">${esc(period || "—")}</div></div>
      <div class="fact due"><div class="fk">${status === "unpaid" || status === "overdue" ? "Amount due" : "Amount"}</div><div class="fv">${esc(fmtMoney(total, cur))}</div></div>
    </div>

    <div class="parties">
      <div class="card">
        <div class="lbl">Billed to</div>
        <div class="who">${esc(inv.company_name || "—")}</div>
        ${[inv.buyer_contact, inv.buyer_email, inv.company_address, inv.tax_id ? `TRN ${inv.tax_id}` : ""].filter(Boolean).map((x) => `<div class="muted small">${esc(x)}</div>`).join("")}
      </div>
      <div class="card">
        <div class="lbl">${inv.plan_name ? "Subscription" : "Issued by"}</div>
        <div class="who">${esc(inv.plan_name || s.name || "INSPECT PRO")}</div>
        ${status === "paid" && inv.paid_at ? `<div class="muted small">Paid on ${esc(fmtDate(inv.paid_at))}${inv.payment_ref ? ` · Ref ${esc(inv.payment_ref)}` : ""}</div>` : ""}
        ${status === "void" && inv.void_reason ? `<div class="muted small">Voided: ${esc(inv.void_reason)}</div>` : ""}
      </div>
    </div>

    <table>
      <thead><tr><th>#</th><th>Description</th><th class="r">Qty</th><th class="r">Unit price</th><th class="r">Amount</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>

    <div class="sumrow">
      <div class="words">Amount in words<b>${esc(amountInWords(total, cur))}</b></div>
      <div>
        <div class="totals">
          <div><span class="muted">Subtotal</span><b>${esc(fmtMoney(subtotal, cur))}</b></div>
          ${vatPct || vat ? `<div><span class="muted">VAT ${esc(String(vatPct))} %</span><b>${esc(fmtMoney(vat, cur))}</b></div>` : ""}
          <div class="grand"><span>${status === "unpaid" || status === "overdue" ? "Total due" : "Total"}</span><span>${esc(fmtMoney(total, cur))}</span></div>
        </div>
        ${!s.vat_registered ? `<div class="note">Supplier not registered for VAT — no VAT charged.</div>` : ""}
      </div>
    </div>

    <div class="pay">
      <div class="box">
        <div class="lbl">Payment details</div>
        ${s.iban ? `
          <div><b>${esc(s.account_name || s.owner_name || s.name)}</b></div>
          ${s.bank_name ? `<div>${esc(s.bank_name)}</div>` : ""}
          <div class="mono">IBAN ${esc(iban4(s.iban))}</div>
          ${s.swift ? `<div class="mono">SWIFT ${esc(s.swift)}</div>` : ""}
          <div class="muted small" style="margin-top:6px">Please quote ${esc(inv.invoice_number)} as the payment reference.</div>
        ` : `<div class="muted">Payment details on request.</div>`}
      </div>
      <div class="box">
        <div class="lbl">Notes</div>
        <div class="muted">${inv.notes ? esc(inv.notes) : "Thank you for your business."}</div>
      </div>
    </div>
  </div>

  <div class="foot"><span>${esc(footLeft)}</span><span>${esc(inv.invoice_number)}</span></div>
</div>
</body></html>`;
}

export const printInvoice = (inv) => printHtml(buildInvoiceHtml(inv));
export const downloadInvoicePdf = (inv) =>
  htmlToPdf(buildInvoiceHtml(inv), `${String(inv.invoice_number || "invoice").replace(/[^\w-]+/g, "_")}.pdf`, { label: inv.invoice_number || "Invoice" });
