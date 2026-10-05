// src/pages/billing/MyBilling.jsx
// -----------------------------------------------------------------------------
// /my-billing — a company admin's own subscription and invoices, inside the
// app. Replaces e-mailing invoices: the customer opens the app every day, so
// the invoice is here, and the payment comes back the same way —
//   • see the subscription (plan, monthly price, promo, days left);
//   • open / print / download every invoice;
//   • pay by bank transfer, then upload the receipt picture: it is read on
//     this device (OCR) to fill the form, compared with the invoice, and sent
//     to INSPECT PRO for confirmation — confirming extends the subscription;
//   • in the last 60 days of a promo year: lock the discounted rate for
//     another year by paying it up front (issues that invoice at once).
// Server: routes/myBilling.cjs. Who may open it: the company's admins.
// -----------------------------------------------------------------------------

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useSettingsLang, LangToggle } from "../settings/_shared/settingsI18n";
import { buildInvoiceHtml, downloadInvoicePdf, printInvoice } from "../settings/invoices/invoiceDocument";
import { fmtDate, fmtMoney, statusOf } from "../settings/invoices/invoiceCore";
import ScaledDoc from "../settings/_shared/ScaledDoc";
import { deleteImage, uploadImage } from "../../utils/imageUpload";
import {
  apiMyBilling, apiRateLock, apiSendProof, apiWithdrawProof, daysUntil, DUE_SOON_DAYS, isBillingAdmin,
  matchReceipt, parseReceipt, todayISO,
} from "./myBillingCore";

const C = {
  ink: "#0f172a", sub: "#475569", line: "#dbeafe", sky: "#eff6ff", skyDeep: "#dbeafe", brand: "#0369a1",
  teal: "#0f766e", ok: "#166534", okBg: "#f0fdf4", warn: "#92400e", warnBg: "#fffbeb", bad: "#991b1b", badBg: "#fef2f2",
};

const INV_STATUS = {
  unpaid: { en: "Unpaid", ar: "غير مدفوعة", fg: C.warn, bg: C.warnBg },
  overdue: { en: "Overdue", ar: "متأخرة", fg: C.bad, bg: C.badBg },
  paid: { en: "Paid", ar: "مدفوعة", fg: C.ok, bg: C.okBg },
};
const PROOF_STATUS = {
  pending: { en: "Under review", ar: "قيد المراجعة", fg: C.brand, bg: C.sky },
  accepted: { en: "Confirmed", ar: "تم التأكيد", fg: C.ok, bg: C.okBg },
  rejected: { en: "Not accepted", ar: "مرفوض", fg: C.bad, bg: C.badBg },
};

export default function MyBilling() {
  const navigate = useNavigate();
  const { t, lang, dir, toggle } = useSettingsLang();
  const L = useCallback((en, ar) => t({ en, ar }), [t]);
  const allowed = isBillingAdmin();

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [msg, setMsg] = useState("");
  const [openInv, setOpenInv] = useState(null);
  const [payFor, setPayFor] = useState(null);
  const [locking, setLocking] = useState(false);
  const [lockAsk, setLockAsk] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setErr("");
    try {
      setData(await apiMyBilling(lang));
    } catch (e) {
      setErr(e.message);
    } finally {
      setLoading(false);
    }
  }, [lang]);

  useEffect(() => { if (allowed) load(); else setLoading(false); }, [allowed, load]);

  const company = data?.company;
  const invoices = useMemo(() => data?.invoices || [], [data]);
  const proofs = useMemo(() => data?.proofs || [], [data]);
  const pendingByInvoice = useMemo(() => {
    const m = {};
    proofs.forEach((p) => { if (p.status === "pending") m[p.invoice_id] = (m[p.invoice_id] || 0) + 1; });
    return m;
  }, [proofs]);
  const due = invoices.filter((i) => ["unpaid", "overdue"].includes(statusOf(i)));
  const days = daysUntil(company?.end_date);
  const promoOn = !!(company?.promo_code && company?.promo_until && company.promo_until >= todayISO());
  const monthlyOff = promoOn ? promoOffOf(company) : 0;

  async function lockRate() {
    setLocking(true);
    setErr("");
    try {
      const inv = await apiRateLock(lang);
      setLockAsk(false);
      await load();
      setOpenInv(inv);
      setMsg(L(`Invoice ${inv.invoice_number} is ready — pay it to lock your rate.`, `الفاتورة ${inv.invoice_number} جاهزة — ادفعها لتثبيت سعرك.`));
    } catch (e) {
      setErr(e.message);
    } finally {
      setLocking(false);
    }
  }

  if (!allowed) {
    return (
      <Shell dir={dir}>
        <div style={sx.card}>
          <h1 className="mbp-xl" style={{ margin: 0 }}>💳 {L("Subscription & invoices", "اشتراكي وفواتيري")}</h1>
          <p style={{ color: C.sub }}>{L("Only your company's admin can see billing. Ask your admin.", "الفوترة متاحة لمدير الشركة فقط — راجع مدير حسابكم.")}</p>
          <button type="button" style={sx.btn()} onClick={() => navigate(-1)}>{dir === "rtl" ? "→" : "←"} {L("Back", "رجوع")}</button>
        </div>
      </Shell>
    );
  }

  return (
    <Shell dir={dir}>
      <header style={sx.head}>
        <div style={{ minWidth: 0 }}>
          <div className="mbp-xs" style={{ color: C.brand, fontWeight: 900, letterSpacing: ".04em" }}>INSPECT PRO</div>
          <h1 className="mbp-xl" style={{ margin: "2px 0 0" }}>💳 {L("Subscription & invoices", "اشتراكي وفواتيري")}</h1>
          {company && <div style={{ color: C.sub, fontWeight: 700 }}>{company.name}</div>}
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <LangToggle lang={lang} toggle={toggle} style={{ background: "#fff", color: C.ink, border: `1px solid ${C.line}`, backdropFilter: "none" }} />
          <button type="button" style={sx.btn()} onClick={load} disabled={loading}>{loading ? "…" : `↻ ${L("Refresh", "تحديث")}`}</button>
          <button type="button" style={sx.btn()} onClick={() => navigate(-1)}>{dir === "rtl" ? "→" : "←"} {L("Back", "رجوع")}</button>
        </div>
      </header>

      {err && <div role="alert" style={sx.note(C.bad, C.badBg)}>⚠️ {err}</div>}
      {msg && <div role="status" style={sx.note(C.ok, C.okBg)}>✓ {msg}</div>}
      {loading && !data && <div style={sx.card}>{L("Loading…", "جاري التحميل…")}</div>}

      {company && (
        <>
          {/* Subscription */}
          <section style={sx.grid}>
            <div style={sx.card}>
              <div className="mbp-xs" style={sx.k}>{L("Subscription", "الاشتراك")}</div>
              <div className="mbp-lg" style={{ fontWeight: 900 }}>{company.plan_name || L("Custom plan", "خطة خاصة")}</div>
              <StatusChip status={company.status} L={L} />
              <div style={{ marginTop: 10, color: C.sub }}>
                {L("Branches", "الفروع")}: <b style={{ color: C.ink }}>{company.branches || 1}</b>
              </div>
            </div>
            <div style={sx.card}>
              <div className="mbp-xs" style={sx.k}>{L("Monthly price", "السعر الشهري")}</div>
              <div className="mbp-lg" style={{ fontWeight: 900 }}>{fmtMoney(company.price - monthlyOff, company.currency)}</div>
              {promoOn && monthlyOff > 0 && (
                <div style={{ color: C.teal, fontWeight: 800, marginTop: 4 }}>
                  🏷️ {company.promo_code} · <s style={{ color: C.sub }}>{fmtMoney(company.price, company.currency)}</s>
                  <div className="mbp-xs" style={{ color: C.sub, fontWeight: 700 }}>
                    {L(`Promo price until ${fmtDate(company.promo_until)}`, `سعر الخصم حتى ${fmtDate(company.promo_until)}`)}
                  </div>
                </div>
              )}
            </div>
            <div style={{ ...sx.card, ...(days != null && days <= DUE_SOON_DAYS ? { borderColor: days < 0 ? "#fca5a5" : "#fcd34d" } : {}) }}>
              <div className="mbp-xs" style={sx.k}>{L("Active until", "فعّال حتى")}</div>
              <div className="mbp-lg" style={{ fontWeight: 900 }}>{company.end_date ? fmtDate(company.end_date) : "—"}</div>
              {days != null && (
                <div style={{ fontWeight: 800, color: days < 0 ? C.bad : days <= DUE_SOON_DAYS ? C.warn : C.ok }}>
                  {days < 0 ? L(`Ended ${-days} days ago`, `انتهى قبل ${-days} يوم`)
                    : days === 0 ? L("Ends today", "بينتهي اليوم")
                      : L(`${days} days left`, `باقي ${days} يوم`)}
                </div>
              )}
            </div>
          </section>

          {due.length > 0 && (
            <div style={sx.note(C.warn, C.warnBg)}>
              🧾 {L(`${due.length} invoice${due.length > 1 ? "s" : ""} waiting for payment — pay by bank transfer, then upload the receipt here.`,
                `${due.length} فاتورة بانتظار الدفع — ادفع بتحويل بنكي، وبعدين ارفع صورة الإيصال من هون.`)}
            </div>
          )}

          {/* Rate lock */}
          <RateLock offer={data.rateLock} L={L} lockAsk={lockAsk} setLockAsk={setLockAsk} locking={locking} onLock={lockRate}
            onOpen={(id) => setOpenInv(invoices.find((i) => i.id === id) || null)} />

          {/* Invoices */}
          <section style={sx.card}>
            <h2 className="mbp-lg" style={sx.h2}>🧾 {L("Invoices", "الفواتير")}</h2>
            {!invoices.length ? (
              <div style={{ color: C.sub }}>{L("No invoices yet.", "لا توجد فواتير بعد.")}</div>
            ) : (
              <div style={{ display: "grid", gap: 10 }}>
                {invoices.map((i) => {
                  const st = statusOf(i);
                  const meta = INV_STATUS[st] || INV_STATUS.unpaid;
                  const pending = pendingByInvoice[i.id] || 0;
                  return (
                    <div key={i.id} style={sx.row}>
                      <div style={{ minWidth: 0, flex: "1 1 220px" }}>
                        <div style={{ fontWeight: 900, color: C.brand }}>
                          {i.invoice_number} {i.kind === "promo_lock" && <span title={L("Rate lock", "تثبيت السعر")}>🔒</span>}
                        </div>
                        <div className="mbp-xs" style={{ color: C.sub }}>
                          {i.period_start ? `${fmtDate(i.period_start)} → ${fmtDate(i.period_end)}` : fmtDate(i.issue_date)}
                          {(st === "unpaid" || st === "overdue") && i.due_date ? ` · ${L("due", "الاستحقاق")} ${fmtDate(i.due_date)}` : ""}
                        </div>
                      </div>
                      <div style={{ fontWeight: 900, whiteSpace: "nowrap" }}>{fmtMoney(i.amount, i.currency)}</div>
                      <Pill meta={meta} lang={lang} />
                      {pending > 0 && <Pill meta={PROOF_STATUS.pending} lang={lang} />}
                      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                        <button type="button" style={sx.btn()} onClick={() => setOpenInv(i)}>👁 {L("View", "عرض")}</button>
                        {(st === "unpaid" || st === "overdue") && (
                          <button type="button" style={sx.btn("primary")} onClick={() => setPayFor(i)}>📤 {L("I paid — upload receipt", "دفعت — ارفع الإيصال")}</button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          {/* How to pay */}
          <BankCard bank={data.bank} L={L} />

          {/* Receipts sent */}
          {proofs.length > 0 && (
            <section style={sx.card}>
              <h2 className="mbp-lg" style={sx.h2}>📎 {L("Receipts you sent", "الإيصالات المرسلة")}</h2>
              <div style={{ display: "grid", gap: 10 }}>
                {proofs.map((p) => {
                  const inv = invoices.find((i) => i.id === p.invoice_id);
                  return (
                    <div key={p.id} style={sx.row}>
                      <a href={p.image_url} target="_blank" rel="noreferrer" style={{ flex: "0 0 auto" }}>
                        <img src={p.image_url} alt="" style={{ width: 56, height: 56, objectFit: "cover", borderRadius: 10, border: `1px solid ${C.line}` }} />
                      </a>
                      <div style={{ minWidth: 0, flex: "1 1 200px" }}>
                        <div style={{ fontWeight: 900 }}>{fmtMoney(p.amount, inv?.currency)} · {inv?.invoice_number || "—"}</div>
                        <div className="mbp-xs" style={{ color: C.sub }}>
                          {fmtDate(p.paid_on || p.created_at)}{p.reference ? ` · ${p.reference}` : ""}
                        </div>
                        {p.status === "rejected" && p.reject_reason && (
                          <div className="mbp-xs" style={{ color: C.bad, fontWeight: 800 }}>{L("Reason", "السبب")}: {p.reject_reason}</div>
                        )}
                      </div>
                      <Pill meta={PROOF_STATUS[p.status] || PROOF_STATUS.pending} lang={lang} />
                      {p.status === "pending" && (
                        <button type="button" style={sx.btn()} onClick={async () => {
                          try {
                            const r = await apiWithdrawProof(p.id, lang);
                            if (r.image_url) deleteImage(r.image_url).catch(() => {});
                            load();
                          } catch (e) { setErr(e.message); }
                        }}>{L("Withdraw", "سحب")}</button>
                      )}
                    </div>
                  );
                })}
              </div>
            </section>
          )}
        </>
      )}

      {openInv && <InvoiceViewer inv={openInv} L={L} onClose={() => setOpenInv(null)}
        onPay={["unpaid", "overdue"].includes(statusOf(openInv)) ? () => { setPayFor(openInv); setOpenInv(null); } : null} />}
      {payFor && (
        <ProofModal invoice={payFor} invoices={due} L={L} lang={lang} onClose={() => setPayFor(null)}
          onSent={() => {
            setPayFor(null);
            setMsg(L("Receipt sent. INSPECT PRO will confirm it — your subscription is extended as soon as it is confirmed.",
              "تم إرسال الإيصال. INSPECT PRO رح تأكده — والاشتراك بيتمدد أول ما يتأكد."));
            try { localStorage.setItem(`billing_proof_sent_${currentCompanyKey()}`, company?.end_date || ""); } catch { /* convenience only */ }
            load();
          }} />
      )}
    </Shell>
  );
}

/* The banner hides once a receipt was sent for the current end date. */
function currentCompanyKey() {
  try { return String(JSON.parse(localStorage.getItem("currentUser") || "{}").companyId || ""); } catch { return ""; }
}

function promoOffOf(c) {
  const price = Number(c?.price) || 0;
  const amount = Number(c?.promo_amount) || 0;
  if (!(price > 0) || !(amount > 0)) return 0;
  const off = c.promo_kind === "aed" ? amount * Math.max(1, Number(c.branches) || 1) : (price * amount) / 100;
  return Math.min(price, Math.round(off * 100) / 100);
}

/* ─────────── rate lock ─────────── */

function RateLock({ offer, L, lockAsk, setLockAsk, locking, onLock, onOpen }) {
  if (!offer) return null;
  if (offer.reason === "issued") {
    return (
      <section style={{ ...sx.card, background: "linear-gradient(135deg,#ecfeff,#f0f9ff)" }}>
        <div style={{ fontWeight: 900 }}>🔒 {L("Rate lock", "تثبيت السعر")}</div>
        <div style={{ color: C.sub, margin: "4px 0 10px" }}>
          {offer.status === "paid"
            ? L("Paid — your promo rate continues for another year.", "مدفوعة — سعر الخصم مستمر لسنة كمان.")
            : L(`Invoice ${offer.invoiceNumber} is waiting for payment. Pay it before ${fmtDate(offer.promoUntil)} to keep your rate.`,
              `الفاتورة ${offer.invoiceNumber} بانتظار الدفع. ادفعها قبل ${fmtDate(offer.promoUntil)} لتحافظ على سعرك.`)}
        </div>
        <button type="button" style={sx.btn()} onClick={() => onOpen(offer.invoiceId)}>👁 {L("Open invoice", "فتح الفاتورة")}</button>
      </section>
    );
  }
  if (!offer.eligible) return null;
  const cur = offer.currency;
  return (
    <section style={{ ...sx.card, background: "linear-gradient(135deg,#f0fdfa,#eff6ff)", borderColor: "#99f6e4" }}>
      <div className="mbp-lg" style={{ fontWeight: 900 }}>🔒 {L("Keep your promo price for another year", "ثبّت سعر الخصم لسنة كمان")}</div>
      <p style={{ color: C.sub, margin: "6px 0 12px" }}>
        {L(`Your code ${offer.code} price ends on ${fmtDate(offer.promoUntil)} (${offer.daysLeft} days). After that the monthly price goes back to ${fmtMoney(offer.monthly, cur)}. Pay 12 months now and keep ${fmtMoney(offer.monthlyNet, cur)} a month.`,
          `سعر الكود ${offer.code} بينتهي ${fmtDate(offer.promoUntil)} (باقي ${offer.daysLeft} يوم). بعدها السعر الشهري بيرجع ${fmtMoney(offer.monthly, cur)}. ادفع 12 شهر هلق وخلّي سعرك ${fmtMoney(offer.monthlyNet, cur)} شهرياً.`)}
      </p>
      <div style={sx.grid}>
        <Fact k={L("12 months", "12 شهر")} v={fmtMoney(offer.subtotal, cur)} sub={L("before VAT", "قبل الضريبة")} />
        <Fact k={L("You save", "بتوفّر")} v={fmtMoney(offer.savings, cur)} good />
        <Fact k={L("Covers", "بيغطي")} v={`${fmtDate(offer.periodStart)} → ${fmtDate(offer.periodEnd)}`} />
      </div>
      {!lockAsk ? (
        <button type="button" style={{ ...sx.btn("primary"), marginTop: 12 }} onClick={() => setLockAsk(true)}>🔒 {L("Lock my rate", "ثبّت سعري")}</button>
      ) : (
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center", marginTop: 12 }}>
          <span style={{ fontWeight: 800, color: C.warn }}>{L("This issues a yearly invoice now. Continue?", "هالخطوة بتصدر فاتورة سنوية هلق. نكمل؟")}</span>
          <button type="button" style={sx.btn("primary")} disabled={locking} onClick={onLock}>{locking ? "…" : L("Yes, issue it", "نعم، أصدرها")}</button>
          <button type="button" style={sx.btn()} disabled={locking} onClick={() => setLockAsk(false)}>{L("Not now", "مش هلق")}</button>
        </div>
      )}
    </section>
  );
}

/* ─────────── bank details ─────────── */

function BankCard({ bank, L }) {
  const [copied, setCopied] = useState("");
  if (!bank || !(bank.iban || bank.bank_name)) {
    return (
      <section style={sx.card}>
        <h2 className="mbp-lg" style={sx.h2}>🏦 {L("How to pay", "طريقة الدفع")}</h2>
        <div style={{ color: C.sub }}>{L("Contact INSPECT PRO for the payment details.", "تواصل مع INSPECT PRO لتفاصيل الدفع.")}
          {bank?.phone ? <span dir="ltr"> · {bank.phone}</span> : null}</div>
      </section>
    );
  }
  const copy = async (k, v) => {
    try { await navigator.clipboard.writeText(v); setCopied(k); setTimeout(() => setCopied(""), 1500); } catch { /* clipboard blocked */ }
  };
  const rows = [
    ["payee", L("Beneficiary", "المستفيد"), bank.account_name || bank.payee],
    ["bank", L("Bank", "البنك"), bank.bank_name],
    ["iban", "IBAN", bank.iban],
    ["swift", "SWIFT", bank.swift],
  ].filter((r) => r[2]);
  return (
    <section style={sx.card}>
      <h2 className="mbp-lg" style={sx.h2}>🏦 {L("How to pay", "طريقة الدفع")}</h2>
      <div style={{ display: "grid", gap: 8 }}>
        {rows.map(([k, label, v]) => (
          <div key={k} style={{ ...sx.row, padding: "8px 12px" }}>
            <span style={{ color: C.sub, minWidth: 110 }}>{label}</span>
            <b dir="ltr" style={{ flex: 1, wordBreak: "break-all" }}>{v}</b>
            {(k === "iban" || k === "swift") && (
              <button type="button" style={sx.btn()} onClick={() => copy(k, v)}>{copied === k ? "✓" : L("Copy", "نسخ")}</button>
            )}
          </div>
        ))}
      </div>
      <div className="mbp-xs" style={{ color: C.sub, marginTop: 10 }}>
        💡 {L("Write the invoice number in the transfer note — it is matched faster.", "اكتب رقم الفاتورة بملاحظة التحويل — بتتطابق أسرع.")}
      </div>
    </section>
  );
}

/* ─────────── invoice viewer ─────────── */

function InvoiceViewer({ inv, L, onClose, onPay }) {
  const html = useMemo(() => buildInvoiceHtml(inv), [inv]);
  const [busy, setBusy] = useState("");
  const run = async (k, fn) => { setBusy(k); try { await fn(); } catch { /* the document helpers report their own failures */ } setBusy(""); };
  return (
    <Modal title={`🧾 ${inv.invoice_number}`} onClose={onClose}>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 12 }}>
        <button type="button" style={sx.btn()} disabled={!!busy} onClick={() => run("print", () => printInvoice(inv))}>🖨 {L("Print", "طباعة")}</button>
        <button type="button" style={sx.btn()} disabled={!!busy} onClick={() => run("pdf", () => downloadInvoicePdf(inv))}>{busy === "pdf" ? "…" : "⬇ PDF"}</button>
        {onPay && <button type="button" style={sx.btn("primary")} onClick={onPay}>📤 {L("I paid — upload receipt", "دفعت — ارفع الإيصال")}</button>}
      </div>
      <ScaledDoc title={inv.invoice_number} html={html} />
    </Modal>
  );
}

/* ─────────── receipt upload ─────────── */

function ProofModal({ invoice: first, invoices, L, lang, onClose, onSent }) {
  const [invoiceId, setInvoiceId] = useState(first.id);
  const invoice = invoices.find((i) => i.id === Number(invoiceId)) || first;
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState("");
  const [reading, setReading] = useState(null);
  const [ocrState, setOcrState] = useState(""); // "" | "reading" | "done" | "failed"
  const [progress, setProgress] = useState(0);
  const [amount, setAmount] = useState(String(Number(first.amount) || ""));
  const [reference, setReference] = useState("");
  const [paidOn, setPaidOn] = useState(todayISO());
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview); }, [preview]);

  async function pick(f) {
    if (!f) return;
    setErr("");
    setFile(f);
    setPreview(f.type.startsWith("image/") ? URL.createObjectURL(f) : "");
    setReading(null);
    if (!f.type.startsWith("image/")) { setOcrState(""); return; }
    // Read on this device — the picture is only uploaded when sent.
    setOcrState("reading");
    setProgress(0);
    try {
      const { ocrImage } = await import("../../utils/ocrScan");
      const page = await ocrImage(f, (p) => setProgress(Math.round((p || 0) * 100)), { deep: false });
      const r = parseReceipt(page?.text || "", invoices.map((i) => i.invoice_number));
      setReading(r);
      setOcrState("done");
      const due = Number(invoice.amount) || 0;
      const exact = r.amounts.find((a) => Math.abs(a - due) < 0.01);
      if (exact != null) setAmount(String(exact));
      else if (r.amounts[0]) setAmount(String(r.amounts[0]));
      if (r.references[0]) setReference(r.references[0]);
      if (r.dates[0] && r.dates[0] <= todayISO()) setPaidOn(r.dates[0]);
    } catch {
      setOcrState("failed");
    }
  }

  const match = matchReceipt(reading, invoice);
  const typedMatches = Math.abs((Number(amount) || 0) - (Number(invoice.amount) || 0)) < 0.01;

  async function send() {
    setBusy(true);
    setErr("");
    let url = "";
    try {
      url = await uploadImage(file, "payment_receipt");
      await apiSendProof({
        invoice_id: invoice.id, image_url: url, amount: Number(amount), reference, paid_on: paidOn, note,
        ocr: reading || undefined,
      }, lang);
      onSent();
    } catch (e) {
      if (url) deleteImage(url).catch(() => {});
      setErr(e.message);
    } finally {
      setBusy(false);
    }
  }

  const blocked = !file || !(Number(amount) > 0) || busy || ocrState === "reading";

  return (
    <Modal title={`📤 ${L("Upload the payment receipt", "رفع إيصال الدفع")}`} onClose={busy ? () => {} : onClose}>
      <div style={{ display: "grid", gap: 12 }}>
        {invoices.length > 1 && (
          <Field label={L("Invoice", "الفاتورة")}>
            <select style={sx.input} value={invoiceId} onChange={(e) => setInvoiceId(Number(e.target.value))}>
              {invoices.map((i) => <option key={i.id} value={i.id}>{i.invoice_number} · {fmtMoney(i.amount, i.currency)}</option>)}
            </select>
          </Field>
        )}
        <div style={{ ...sx.row, background: C.sky }}>
          <span>{L("Amount due", "المبلغ المستحق")}</span>
          <b className="mbp-lg">{fmtMoney(invoice.amount, invoice.currency)}</b>
        </div>

        <Field label={L("Receipt picture (photo or screenshot)", "صورة الإيصال (صورة أو لقطة شاشة)")}>
          <input type="file" accept="image/*,application/pdf" onChange={(e) => pick(e.target.files?.[0])} style={sx.input} />
        </Field>
        {preview && <img src={preview} alt="" style={{ maxHeight: 220, maxWidth: "100%", objectFit: "contain", borderRadius: 12, border: `1px solid ${C.line}` }} />}

        {ocrState === "reading" && <div style={sx.note(C.brand, C.sky)}>🔎 {L("Reading the receipt…", "عم نقرأ الإيصال…")} {progress}%</div>}
        {ocrState === "failed" && <div style={sx.note(C.warn, C.warnBg)}>{L("Couldn't read the picture — fill the details below.", "ما قدرنا نقرأ الصورة — عبّي التفاصيل تحت.")}</div>}
        {ocrState === "done" && (
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <Chip ok={match.amountMatch} text={match.amountMatch ? L("Amount on the receipt matches the invoice", "المبلغ على الإيصال مطابق للفاتورة") : L("No matching amount found on the receipt", "ما لقينا مبلغ مطابق على الإيصال")} />
            {match.invoiceNumberSeen && <Chip ok text={L("Invoice number found on the receipt", "رقم الفاتورة موجود على الإيصال")} />}
          </div>
        )}

        <div style={sx.grid}>
          <Field label={L("Amount transferred", "المبلغ المحوّل")}>
            <input type="number" min="0" step="any" style={sx.input} value={amount} onChange={(e) => setAmount(e.target.value)} />
            {amount && !typedMatches && <div className="mbp-xs" style={{ color: C.warn, fontWeight: 800 }}>{L("Differs from the amount due", "مختلف عن المبلغ المستحق")}</div>}
          </Field>
          <Field label={L("Transfer reference", "رقم الحوالة")}>
            <input style={sx.input} dir="ltr" value={reference} onChange={(e) => setReference(e.target.value)} placeholder={L("Optional", "اختياري")} />
          </Field>
          <Field label={L("Paid on", "تاريخ الدفع")}>
            <input type="date" style={sx.input} value={paidOn} max={todayISO()} onChange={(e) => setPaidOn(e.target.value)} />
          </Field>
        </div>
        <Field label={L("Note (optional)", "ملاحظة (اختياري)")}>
          <input style={sx.input} value={note} onChange={(e) => setNote(e.target.value)} />
        </Field>

        {err && <div role="alert" style={sx.note(C.bad, C.badBg)}>⚠️ {err}</div>}
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button type="button" style={sx.btn("primary")} disabled={blocked} onClick={send}>{busy ? "…" : `📤 ${L("Send to INSPECT PRO", "إرسال لـ INSPECT PRO")}`}</button>
          <button type="button" style={sx.btn()} disabled={busy} onClick={onClose}>{L("Cancel", "إلغاء")}</button>
        </div>
        <div className="mbp-xs" style={{ color: C.sub }}>
          {L("The picture is read on your device. It is uploaded only when you press Send.", "الصورة بتنقرأ على جهازك، وما بتنرفع إلا لما تكبس إرسال.")}
        </div>
      </div>
    </Modal>
  );
}

/* ─────────── small pieces ─────────── */

function StatusChip({ status, L }) {
  const m = {
    active: [L("Active", "فعّال"), C.ok, C.okBg], trial: [L("Trial", "تجربة"), C.warn, C.warnBg],
    expired: [L("Expired", "منتهي"), C.bad, C.badBg], suspended: [L("Suspended", "موقوف"), C.sub, "#f1f5f9"],
  }[status] || [status, C.sub, "#f1f5f9"];
  return <span style={{ display: "inline-block", marginTop: 6, padding: "2px 12px", borderRadius: 999, fontWeight: 900, color: m[1], background: m[2] }}>{m[0]}</span>;
}

const Pill = ({ meta, lang }) => (
  <span style={{ padding: "3px 12px", borderRadius: 999, fontWeight: 900, color: meta.fg, background: meta.bg, whiteSpace: "nowrap" }}>
    {lang === "ar" ? meta.ar : meta.en}
  </span>
);

const Chip = ({ ok, text }) => (
  <span style={{ padding: "4px 12px", borderRadius: 999, fontWeight: 800, color: ok ? C.ok : C.warn, background: ok ? C.okBg : C.warnBg }}>
    {ok ? "✓" : "⚠"} {text}
  </span>
);

const Fact = ({ k, v, sub, good }) => (
  <div style={{ ...sx.row, flexDirection: "column", alignItems: "flex-start", gap: 2, background: "#fff" }}>
    <span className="mbp-xs" style={{ color: C.sub }}>{k}</span>
    <b className="mbp-lg" style={{ color: good ? C.ok : C.ink }}>{v}</b>
    {sub && <span className="mbp-xs" style={{ color: C.sub }}>{sub}</span>}
  </div>
);

function Field({ label, children }) {
  return (
    <label style={{ display: "block", minWidth: 0 }}>
      <span className="mbp-sm" style={{ display: "block", marginBottom: 6, color: C.sub, fontWeight: 900 }}>{label}</span>
      {children}
    </label>
  );
}

function Modal({ title, children, onClose }) {
  useEffect(() => {
    const k = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, [onClose]);
  return (
    <div role="dialog" aria-modal="true" style={sx.overlay} onClick={onClose}>
      <div className="mbp mbp" style={sx.modal} onClick={(e) => e.stopPropagation()}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center", marginBottom: 12 }}>
          <div className="mbp-lg" style={{ fontWeight: 900 }}>{title}</div>
          <button type="button" style={sx.btn()} onClick={onClose} aria-label="Close">✕</button>
        </div>
        {children}
      </div>
    </div>
  );
}

function Shell({ dir, children }) {
  return (
    <div className="mbp mbp" dir={dir} style={sx.page}>
      <div style={sx.wrap}>{children}</div>
      <style>{CSS}</style>
    </div>
  );
}

const CSS = `
#root .mbp.mbp, #root .mbp.mbp *{ font-size: calc(17px * var(--app-fs, 1)) !important; }
#root .mbp.mbp .mbp-xl, #root .mbp.mbp .mbp-xl *{ font-size: calc(27px * var(--app-fs, 1)) !important; }
#root .mbp.mbp .mbp-lg, #root .mbp.mbp .mbp-lg *{ font-size: calc(21px * var(--app-fs, 1)) !important; }
#root .mbp.mbp .mbp-sm, #root .mbp.mbp .mbp-sm *{ font-size: calc(15px * var(--app-fs, 1)) !important; }
#root .mbp.mbp .mbp-xs, #root .mbp.mbp .mbp-xs *{ font-size: calc(14px * var(--app-fs, 1)) !important; }
#root .mbp.mbp button:not(:disabled){ cursor: pointer; }
#root .mbp.mbp button:disabled{ opacity: .55; }
`;

const sx = {
  page: { minHeight: "100vh", background: "linear-gradient(180deg,#f0f9ff 0%,#f8fafc 60%)", color: C.ink, padding: "20px 16px 90px", fontWeight: 700 },
  wrap: { maxWidth: 1040, margin: "0 auto", display: "grid", gap: 14 },
  head: { display: "flex", justifyContent: "space-between", alignItems: "flex-end", gap: 12, flexWrap: "wrap" },
  grid: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 220px), 1fr))", gap: 12 },
  card: { background: "#fff", border: `1px solid ${C.line}`, borderRadius: 18, padding: 18, boxShadow: "0 8px 24px rgba(3,105,161,.06)", minWidth: 0 },
  k: { color: C.sub, fontWeight: 800, marginBottom: 4 },
  h2: { margin: "0 0 12px", fontWeight: 900 },
  row: { display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", padding: "10px 12px", borderRadius: 14, border: `1px solid ${C.line}`, background: "#f8fbff" },
  note: (fg, bg) => ({ padding: "12px 14px", borderRadius: 14, color: fg, background: bg, fontWeight: 800, border: `1px solid ${fg}33` }),
  btn: (tone) => ({
    minHeight: 40, padding: "8px 14px", borderRadius: 12, fontWeight: 900, whiteSpace: "nowrap",
    border: tone === "primary" ? "none" : `1px solid ${C.line}`,
    background: tone === "primary" ? "linear-gradient(135deg,#0369a1,#0ea5e9)" : "#fff",
    color: tone === "primary" ? "#fff" : C.ink,
  }),
  input: { width: "100%", minHeight: 44, padding: "8px 12px", borderRadius: 12, border: `1px solid #cbd5e1`, background: "#fff", boxSizing: "border-box", fontWeight: 700 },
  overlay: { position: "fixed", inset: 0, background: "rgba(15,23,42,.45)", zIndex: 9500, display: "flex", alignItems: "flex-start", justifyContent: "center", padding: "24px 12px", overflowY: "auto" },
  modal: { background: "#fff", borderRadius: 18, padding: 18, width: "min(100%, 860px)", boxShadow: "0 24px 60px rgba(0,0,0,.25)", color: C.ink, fontWeight: 700 },
};
