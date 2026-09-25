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

import { day, fmtDate, fmtMoney, statusOf } from "./invoiceCore";
import { htmlToPdf, printHtml } from "../_shared/docRender";

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

  return `<!doctype html><html><head><meta charset="utf-8"><title>${esc(inv.invoice_number)}</title>
<style>
  @page { size: A4; margin: 14mm; }
  * { box-sizing: border-box; }
  body { margin: 0; background: #fff; color: #0f172a; font: 13px/1.5 "Segoe UI", Inter, Arial, sans-serif; }
  .doc { width: 794px; min-height: 1080px; margin: 0 auto; padding: 44px 48px; position: relative; }
  .top { display: flex; justify-content: space-between; gap: 24px; align-items: flex-start; }
  .brand { display: flex; gap: 14px; align-items: center; min-width: 0; }
  .logo { width: 64px; height: 64px; border-radius: 14px; background: #f0fdfa; border: 1px solid #ccfbf1; display: grid; place-items: center; overflow: hidden; flex-shrink: 0; font-weight: 900; font-size: 22px; color: #0f766e; }
  .logo img { max-width: 58px; max-height: 58px; object-fit: contain; }
  .sname { font-size: 22px; font-weight: 900; line-height: 1.2; }
  .muted { color: #475569; }
  .small { font-size: 12px; }
  .title { text-align: right; }
  .title h1 { margin: 0; font-size: 28px; letter-spacing: .06em; color: #0f766e; }
  .meta { margin-top: 6px; display: grid; grid-template-columns: auto auto; gap: 2px 14px; justify-content: end; font-size: 12.5px; }
  .meta b { text-align: right; }
  .rule { height: 3px; background: linear-gradient(90deg, #0f766e, #0891b2); border-radius: 3px; margin: 22px 0; }
  .parties { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; }
  .lbl { font-size: 11px; font-weight: 900; letter-spacing: .08em; text-transform: uppercase; color: #64748b; margin-bottom: 6px; }
  .who { font-size: 15px; font-weight: 800; }
  table { width: 100%; border-collapse: collapse; margin-top: 26px; }
  th { background: #f1f5f9; color: #334155; font-size: 11px; letter-spacing: .06em; text-transform: uppercase; text-align: left; padding: 10px 12px; }
  td { padding: 11px 12px; border-bottom: 1px solid #e2e8f0; vertical-align: top; }
  .r { text-align: right; white-space: nowrap; }
  .n { width: 34px; color: #64748b; }
  .b { font-weight: 800; }
  .totals { margin: 16px 0 0 auto; width: 320px; }
  .totals div { display: flex; justify-content: space-between; padding: 6px 12px; }
  .totals .grand { margin-top: 4px; background: #0f766e; color: #fff; border-radius: 10px; font-size: 16px; font-weight: 900; padding: 10px 12px; }
  .note { margin-top: 8px; font-size: 12px; color: #475569; text-align: right; }
  .pay { margin-top: 30px; display: grid; grid-template-columns: 1.3fr 1fr; gap: 20px; }
  .box { border: 1px solid #e2e8f0; border-radius: 12px; padding: 14px 16px; background: #f8fafc; }
  .mono { font-family: Consolas, "Courier New", monospace; letter-spacing: .03em; }
  .foot { position: absolute; left: 48px; right: 48px; bottom: 28px; display: flex; justify-content: space-between; font-size: 11px; color: #94a3b8; border-top: 1px solid #e2e8f0; padding-top: 10px; }
  .stamp { position: absolute; top: 250px; right: 70px; transform: rotate(-14deg); border: 5px solid; border-radius: 14px; padding: 6px 22px; font-size: 44px; font-weight: 900; letter-spacing: .12em; opacity: .22; }
  .stamp.PAID { color: #15803d; } .stamp.VOID { color: #b91c1c; }
</style></head><body>
<div class="doc">
  ${stamp ? `<div class="stamp ${stamp}">${stamp}</div>` : ""}
  <div class="top">
    <div class="brand">
      <div class="logo">${s.logo_url ? `<img src="${esc(s.logo_url)}" alt="">` : esc(initials(s.name))}</div>
      <div>
        <div class="sname">${esc(s.name || "INSPECT PRO")}</div>
        ${s.owner_name ? `<div class="muted small">${esc(s.owner_name)}</div>` : ""}
        ${licence ? `<div class="muted small">${esc(licence)}</div>` : ""}
        ${s.vat_registered && s.trn ? `<div class="muted small">TRN ${esc(s.trn)}</div>` : ""}
        ${s.address ? `<div class="muted small">${esc(s.address)}</div>` : ""}
        ${contact ? `<div class="muted small">${esc(contact)}</div>` : ""}
      </div>
    </div>
    <div class="title">
      <h1>${esc(title.toUpperCase())}</h1>
      <div class="meta">
        <span class="muted">Number</span><b>${esc(inv.invoice_number)}</b>
        <span class="muted">Issue date</span><b>${esc(fmtDate(inv.issue_date))}</b>
        ${inv.due_date ? `<span class="muted">Due date</span><b>${esc(fmtDate(inv.due_date))}</b>` : ""}
        ${period ? `<span class="muted">Period</span><b>${esc(period)}</b>` : ""}
      </div>
    </div>
  </div>

  <div class="rule"></div>

  <div class="parties">
    <div>
      <div class="lbl">Billed to</div>
      <div class="who">${esc(inv.company_name || "—")}</div>
      ${inv.buyer_contact ? `<div class="muted">${esc(inv.buyer_contact)}</div>` : ""}
      ${inv.buyer_email ? `<div class="muted">${esc(inv.buyer_email)}</div>` : ""}
      ${inv.company_address ? `<div class="muted">${esc(inv.company_address)}</div>` : ""}
      ${inv.tax_id ? `<div class="muted">TRN ${esc(inv.tax_id)}</div>` : ""}
    </div>
    <div>
      ${inv.plan_name ? `<div class="lbl">Plan</div><div class="who">${esc(inv.plan_name)}</div>` : ""}
      ${status === "paid" && inv.paid_at ? `<div class="muted" style="margin-top:8px">Paid on ${esc(fmtDate(inv.paid_at))}${inv.payment_ref ? ` · Ref ${esc(inv.payment_ref)}` : ""}</div>` : ""}
      ${status === "void" && inv.void_reason ? `<div class="muted" style="margin-top:8px">Voided: ${esc(inv.void_reason)}</div>` : ""}
    </div>
  </div>

  <table>
    <thead><tr><th>#</th><th>Description</th><th class="r">Qty</th><th class="r">Unit price</th><th class="r">Amount</th></tr></thead>
    <tbody>${rows}</tbody>
  </table>

  <div class="totals">
    <div><span class="muted">Subtotal</span><b>${esc(fmtMoney(subtotal, cur))}</b></div>
    <div><span class="muted">VAT ${esc(String(vatPct))} %</span><b>${esc(fmtMoney(vat, cur))}</b></div>
    <div class="grand"><span>${status === "unpaid" || status === "overdue" ? "Total due" : "Total"}</span><span>${esc(fmtMoney(total, cur))}</span></div>
  </div>
  ${!s.vat_registered ? `<div class="note">Supplier not registered for VAT — no VAT charged.</div>` : ""}

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

  <div class="foot"><span>${esc(s.name || "INSPECT PRO")}</span><span>${esc(inv.invoice_number)}</span></div>
</div>
</body></html>`;
}

export const printInvoice = (inv) => printHtml(buildInvoiceHtml(inv));
export const downloadInvoicePdf = (inv) =>
  htmlToPdf(buildInvoiceHtml(inv), `${String(inv.invoice_number || "invoice").replace(/[^\w-]+/g, "_")}.pdf`);
