// src/pages/settings/invoices/InvoicesTab.jsx
// -----------------------------------------------------------------------------
// Settings → Billing & Plans → Invoices.
//
// INSPECT PRO billing its customer companies. One screen, three jobs:
//   • see who owes what  — headline numbers + a filterable list;
//   • issue an invoice   — pick a company, everything else is pre-filled
//                          (period after the last invoice, the company's
//                          price, VAT per the seller profile), live preview;
//   • follow it up       — print / PDF, mark paid (date + reference),
//                          undo, or void an unpaid one with a reason.
// An issued invoice is never edited — the server refuses it.
// -----------------------------------------------------------------------------

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import API_BASE from "../../../config/api";
import { Button, StatusMessage, ui } from "../_shared/SettingsUIKit";
import { useSettingsLang } from "../_shared/settingsI18n";
import { loadSeller, normalizeSeller, sellerGaps } from "../_shared/sellerProfile";
import { logSettingsAudit } from "../../../utils/settingsAudit";
import {
  STATUS, apiInvoiceAction, apiIssueInvoice, apiListInvoices, currencyOf, day, fmtDate, fmtMoney,
  invoiceKpis, moneyMap, nextPeriod, priceOf, statusOf, todayISO,
} from "./invoiceCore";
import { buildInvoiceHtml, downloadInvoicePdf, printInvoice } from "./invoiceDocument";

const audit = (entry) => { try { Promise.resolve(logSettingsAudit(entry)).catch(() => {}); } catch { /* ignore */ } };
const round2 = (n) => Math.round((Number(n) + Number.EPSILON) * 100) / 100;

export default function InvoicesTab({ onOpenProfile }) {
  const { t, lang, dir } = useSettingsLang();
  const L = useCallback((en, ar) => t({ en, ar }), [t]);

  const [invoices, setInvoices] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [seller, setSeller] = useState(() => normalizeSeller(null));
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState(null);
  const [query, setQuery] = useState("");
  const [companyFilter, setCompanyFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [issuing, setIssuing] = useState(false);
  const [openId, setOpenId] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [inv, comp, sel] = await Promise.all([
        apiListInvoices(lang),
        fetch(`${API_BASE}/api/companies`).then((r) => r.json()).catch(() => ({})),
        loadSeller().catch(() => normalizeSeller(null)),
      ]);
      setInvoices(inv);
      setCompanies(comp?.ok ? comp.companies || [] : []);
      setSeller(sel);
    } catch (e) {
      setMsg({ kind: "err", text: e.message });
    } finally {
      setLoading(false);
    }
  }, [lang]);

  useEffect(() => { load(); }, [load]);

  const upsert = (inv) => setInvoices((list) => [inv, ...list.filter((x) => x.id !== inv.id)]
    .sort((a, b) => day(b.issue_date).localeCompare(day(a.issue_date)) || b.id - a.id));

  const kpi = useMemo(() => invoiceKpis(invoices), [invoices]);
  const gaps = useMemo(() => sellerGaps(seller), [seller]);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return invoices
      .filter((i) => companyFilter === "all" || String(i.company_id) === companyFilter)
      .filter((i) => statusFilter === "all" || statusOf(i) === statusFilter)
      .filter((i) => !q || `${i.invoice_number} ${i.company_name} ${i.plan_name}`.toLowerCase().includes(q));
  }, [invoices, query, companyFilter, statusFilter]);

  const counts = useMemo(() => {
    const c = { all: invoices.length, unpaid: 0, overdue: 0, paid: 0, void: 0 };
    invoices.forEach((i) => { c[statusOf(i)] = (c[statusOf(i)] || 0) + 1; });
    return c;
  }, [invoices]);

  const opened = invoices.find((i) => i.id === openId) || null;

  return (
    <div style={ui.page} dir={dir}>
      <div style={sx.head}>
        <div>
          <p style={ui.eyebrow}>{L("Billing", "الفوترة")}</p>
          <h2 className="bpx-xl" style={ui.title}>{L("Invoices", "الفواتير")}</h2>
          <p className="bpx-sm" style={ui.subtitle}>
            {L("What INSPECT PRO has billed each company, and what is still owed.", "شو فوترت INSPECT PRO لكل شركة، وشو لسا ما اندفع.")}
          </p>
        </div>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <Button onClick={load} disabled={loading}>{loading ? "…" : `↻ ${L("Refresh", "تحديث")}`}</Button>
          <Button tone="primary" onClick={() => setIssuing(true)} disabled={!companies.length}>＋ {L("Issue invoice", "إصدار فاتورة")}</Button>
        </div>
      </div>

      {gaps.length > 0 && (
        <div className="bpx-sm" style={sx.gapBar}>
          <span>⚠️ {L("Your invoices are missing:", "فواتيرك ناقصها:")} <b>{gaps.map((g) => (lang === "ar" ? g.ar : g.en)).join(" · ")}</b></span>
          {onOpenProfile && <Button onClick={onOpenProfile} style={{ minHeight: 38 }}>{L("Complete the profile", "كمّل الهوية")}</Button>}
        </div>
      )}

      <StatusMessage message={msg} />

      <div style={sx.kpis}>
        <Kpi tone="#b45309" label={L("Outstanding", "غير محصّل")} value={moneyMap(kpi.outstanding)} />
        <Kpi tone={kpi.overdueCount ? "#b91c1c" : "#64748b"} label={L("Overdue", "متأخر")} value={moneyMap(kpi.overdue)} sub={`${kpi.overdueCount} ${L("invoice(s)", "فاتورة")}`} />
        <Kpi tone="#15803d" label={L("Collected this month", "المحصّل هالشهر")} value={moneyMap(kpi.collected)} />
        <Kpi tone="#0f766e" label={L("Issued this year", "صادرة هالسنة")} value={String(kpi.issuedThisYear)} />
      </div>

      <div style={sx.toolbar}>
        <input style={{ ...ui.input, flex: "1 1 240px", minHeight: 46 }} value={query} onChange={(e) => setQuery(e.target.value)}
          placeholder={L("Search number or company…", "ابحث برقم الفاتورة أو الشركة…")} />
        <select style={{ ...ui.input, width: 230, minHeight: 46 }} value={companyFilter} onChange={(e) => setCompanyFilter(e.target.value)}>
          <option value="all">{L("All companies", "كل الشركات")}</option>
          {companies.map((c) => <option key={c.id} value={String(c.id)}>{c.name}</option>)}
        </select>
        <div style={sx.chips}>
          {["all", "unpaid", "overdue", "paid", "void"].map((k) => (
            <button key={k} type="button" onClick={() => setStatusFilter(k)} style={sx.chip(statusFilter === k, STATUS[k])}>
              {k === "all" ? L("All", "الكل") : lang === "ar" ? STATUS[k].ar : STATUS[k].en}
              <span style={sx.chipCount}>{counts[k] || 0}</span>
            </button>
          ))}
        </div>
      </div>

      <div style={ui.tableWrap}>
        {loading ? (
          <div style={sx.empty}>{L("Loading…", "جاري التحميل…")}</div>
        ) : !invoices.length ? (
          <div style={sx.empty}>
            <div style={{ fontSize: 40 }}>🧾</div>
            <div style={{ fontWeight: 900, marginTop: 6 }}>{L("No invoices yet", "لا توجد فواتير بعد")}</div>
            <div className="bpx-sm" style={{ color: "#64748b", marginTop: 4 }}>{L("Issue the first one — the company's price and period are filled in for you.", "أصدر أول فاتورة — سعر الشركة والفترة بيتعبّوا لحالهم.")}</div>
          </div>
        ) : !visible.length ? (
          <div style={sx.empty}>{L("Nothing matches these filters.", "ما في نتائج بهالفلاتر.")}</div>
        ) : (
          <table style={ui.table}>
            <thead>
              <tr>
                <th className="bpx-xs" style={ui.th}>{L("Number", "الرقم")}</th>
                <th className="bpx-xs" style={ui.th}>{L("Company", "الشركة")}</th>
                <th className="bpx-xs" style={ui.th}>{L("Issued", "الإصدار")}</th>
                <th className="bpx-xs" style={ui.th}>{L("Due", "الاستحقاق")}</th>
                <th className="bpx-xs" style={{ ...ui.th, textAlign: "end" }}>{L("Total", "الإجمالي")}</th>
                <th className="bpx-xs" style={ui.th}>{L("Status", "الحالة")}</th>
              </tr>
            </thead>
            <tbody>
              {visible.map((i) => (
                <tr key={i.id} onClick={() => setOpenId(i.id)} style={{ cursor: "pointer" }} className="inv-row">
                  <td style={{ ...ui.td, fontWeight: 900, color: "#0f766e", whiteSpace: "nowrap" }}>{i.invoice_number}</td>
                  <td style={ui.td}>{i.company_name || "—"}</td>
                  <td style={{ ...ui.td, whiteSpace: "nowrap" }}>{fmtDate(i.issue_date)}</td>
                  <td style={{ ...ui.td, whiteSpace: "nowrap" }}>{fmtDate(i.due_date)}</td>
                  <td style={{ ...ui.td, textAlign: "end", fontWeight: 900, whiteSpace: "nowrap" }}>{fmtMoney(i.amount, i.currency)}</td>
                  <td style={ui.td}><StatusPill status={statusOf(i)} lang={lang} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      <style>{`#root .bpx.bpx .inv-row:hover td{ background:#f8fafc; }`}</style>

      {issuing && (
        <IssueModal
          companies={companies}
          invoices={invoices}
          seller={seller}
          onClose={() => setIssuing(false)}
          onIssued={(inv) => {
            upsert(inv);
            setIssuing(false);
            setOpenId(inv.id);
            audit({ area: "invoices", action: "issue_invoice", target: inv.invoice_number, before: null, after: inv, reason: "Invoice issued" });
            setMsg({ kind: "ok", text: `${L("Issued", "تم الإصدار")} · ${inv.invoice_number}` });
          }}
        />
      )}

      {opened && (
        <InvoiceModal
          invoice={opened}
          onClose={() => setOpenId(null)}
          onChanged={(inv, action) => {
            audit({ area: "invoices", action, target: inv.invoice_number, before: opened, after: inv, reason: action });
            upsert(inv);
          }}
        />
      )}
    </div>
  );
}

/* ═════════════ Issue ═════════════ */

function IssueModal({ companies, invoices, seller, onClose, onIssued }) {
  const { t, lang, dir } = useSettingsLang();
  const L = (en, ar) => t({ en, ar });
  // Customers who are paying first; a suspended one is still selectable.
  const ordered = useMemo(() => [...companies].sort((a, b) =>
    (a.status === "active" ? 0 : 1) - (b.status === "active" ? 0 : 1) || String(a.name).localeCompare(String(b.name))), [companies]);

  const [companyId, setCompanyId] = useState(ordered[0] ? String(ordered[0].id) : "");
  const company = companies.find((c) => String(c.id) === companyId) || null;
  const [issueDate, setIssueDate] = useState(todayISO());
  const [period, setPeriod] = useState({ start: "", end: "" });
  const [lines, setLines] = useState([]);
  const [notes, setNotes] = useState("");
  const [vatPct, setVatPct] = useState(5);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [confirming, setConfirming] = useState(false);

  /* Picking a company re-fills everything that depends on it. */
  useEffect(() => {
    if (!company) return;
    const p = nextPeriod(company, invoices);
    setPeriod(p);
    setLines([{ description: `Subscription — ${company.plan_name || "custom"} plan`, qty: 1, unit_price: priceOf(company) }]);
    setConfirming(false);
  }, [companyId]); // eslint-disable-line react-hooks/exhaustive-deps

  const cur = currencyOf(company);
  const vat = seller.vatRegistered ? Math.min(Math.max(Number(vatPct) || 0, 0), 100) : 0;
  const subtotal = round2(lines.reduce((s, l) => s + round2((Number(l.qty) || 0) * (Number(l.unit_price) || 0)), 0));
  const vatAmount = round2((subtotal * vat) / 100);
  const total = round2(subtotal + vatAmount);
  const lineProblem = !lines.length || lines.some((l) => !String(l.description).trim() || !(Number(l.qty) > 0) || !(Number(l.unit_price) >= 0));
  const periodProblem = period.start && period.end && period.end < period.start;
  const blocked = !company || lineProblem || periodProblem;

  const setLine = (i, patch) => setLines((ls) => ls.map((l, k) => (k === i ? { ...l, ...patch } : l)));

  /* The preview is the real document with the values it will be issued with. */
  const preview = useMemo(() => buildInvoiceHtml({
    invoice_number: L("(assigned on issue)", "(بيتحدد عند الإصدار)"),
    issue_date: issueDate,
    due_date: issueDate ? new Date(Date.parse(`${issueDate}T00:00:00Z`) + seller.paymentTermsDays * 86400000).toISOString().slice(0, 10) : "",
    period_start: period.start, period_end: period.end,
    company_name: company?.name, buyer_contact: company?.contact_name, buyer_email: company?.contact_email,
    plan_name: company?.plan_name, currency: cur, notes,
    title: seller.vatRegistered ? "Tax Invoice" : "Invoice",
    lines: lines.map((l) => ({ ...l, total: round2((Number(l.qty) || 0) * (Number(l.unit_price) || 0)) })),
    subtotal, vat_pct: vat, vat_amount: vatAmount, amount: total, status: "unpaid",
    seller: {
      name: seller.name, owner_name: seller.ownerName, address: seller.address, email: seller.email, phone: seller.phone,
      website: seller.website, logo_url: seller.logoUrl, license_no: seller.licenseStatus === "issued" ? seller.licenseNo : "",
      license_authority: seller.licenseAuthority, vat_registered: seller.vatRegistered, trn: seller.vatRegistered ? seller.trn : "",
      bank_name: seller.bankName, account_name: seller.accountName, iban: seller.iban, swift: seller.swift,
    },
  }), [company, issueDate, period, lines, notes, vat, vatAmount, subtotal, total, cur, seller]); // eslint-disable-line react-hooks/exhaustive-deps

  async function issue() {
    setBusy(true);
    setErr("");
    try {
      const inv = await apiIssueInvoice({
        company_id: Number(companyId),
        issue_date: issueDate,
        period_start: period.start || null,
        period_end: period.end || null,
        lines: lines.map((l) => ({ description: String(l.description).trim(), qty: Number(l.qty), unit_price: Number(l.unit_price) })),
        vat_pct: vat,
        notes,
      }, lang);
      onIssued(inv);
    } catch (e) {
      setErr(e.message);
      setConfirming(false);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal onClose={busy ? () => {} : onClose} wide title={`🧾 ${L("Issue an invoice", "إصدار فاتورة")}`}>
      <div className="inv-issue" dir={dir}>
        <div style={{ minWidth: 0 }}>
          <Field label={L("Company", "الشركة")}>
            <select style={inp()} value={companyId} onChange={(e) => setCompanyId(e.target.value)}>
              {ordered.map((c) => <option key={c.id} value={String(c.id)}>{c.name}{c.status !== "active" ? ` (${c.status})` : ""}</option>)}
            </select>
          </Field>

          <div className="inv-3" style={{ marginTop: 12 }}>
            <Field label={L("Issue date", "تاريخ الإصدار")}>
              <input type="date" style={inp()} value={issueDate} onChange={(e) => setIssueDate(e.target.value)} />
            </Field>
            <Field label={L("Period from", "الفترة من")} error={periodProblem ? L("After the end", "بعد النهاية") : ""}>
              <input type="date" style={inp(periodProblem)} value={period.start} onChange={(e) => setPeriod((p) => ({ ...p, start: e.target.value }))} />
            </Field>
            <Field label={L("to", "إلى")}>
              <input type="date" style={inp(periodProblem)} value={period.end} onChange={(e) => setPeriod((p) => ({ ...p, end: e.target.value }))} />
            </Field>
          </div>

          <div className="bpx-sm" style={{ fontWeight: 900, margin: "16px 0 8px" }}>{L("Lines", "البنود")}</div>
          <div style={{ display: "grid", gap: 8 }}>
            {lines.map((l, i) => (
              <div key={i} className="inv-line">
                <input style={inp(!String(l.description).trim())} value={l.description} onChange={(e) => setLine(i, { description: e.target.value })} placeholder={L("Description", "الوصف")} />
                <input type="number" min="0" step="any" style={inp(!(Number(l.qty) > 0))} value={l.qty} onChange={(e) => setLine(i, { qty: e.target.value })} title={L("Qty", "الكمية")} />
                <input type="number" min="0" step="any" style={inp(!(Number(l.unit_price) >= 0))} value={l.unit_price} onChange={(e) => setLine(i, { unit_price: e.target.value })} title={L("Unit price", "سعر الوحدة")} />
                <button type="button" style={sx.iconBtn} disabled={lines.length === 1} onClick={() => setLines((ls) => ls.filter((_, k) => k !== i))} title={L("Remove line", "حذف البند")}>✕</button>
              </div>
            ))}
          </div>
          <Button style={{ marginTop: 8, minHeight: 38 }} onClick={() => setLines((ls) => [...ls, { description: "", qty: 1, unit_price: 0 }])}>＋ {L("Add line", "إضافة بند")}</Button>

          <div className="inv-2" style={{ marginTop: 14 }}>
            <Field label={L("VAT %", "الضريبة %")}>
              {seller.vatRegistered
                ? <input type="number" min="0" max="100" step="any" style={inp()} value={vatPct} onChange={(e) => setVatPct(e.target.value)} />
                : <div className="bpx-sm" style={sx.vatLocked}>0 % · {L("not VAT registered", "غير مسجّل بالضريبة")}</div>}
            </Field>
            <Field label={L("Notes on the invoice", "ملاحظات على الفاتورة")}>
              <input style={inp()} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder={L("Optional", "اختياري")} />
            </Field>
          </div>

          <div className="inv-tot" style={sx.totalBox}>
            <div><span>{L("Subtotal", "المجموع")}</span><b>{fmtMoney(subtotal, cur)}</b></div>
            <div><span>VAT {vat} %</span><b>{fmtMoney(vatAmount, cur)}</b></div>
            <div className="bpx-lg" style={{ fontWeight: 1000, color: "#0f766e" }}><span>{L("Total", "الإجمالي")}</span><span>{fmtMoney(total, cur)}</span></div>
          </div>

          {err && <div className="bpx-sm" style={sx.err}>{err}</div>}

          <div style={{ display: "flex", gap: 10, marginTop: 14, flexWrap: "wrap", alignItems: "center" }}>
            {!confirming ? (
              <>
                <Button tone="primary" disabled={blocked || busy} onClick={() => setConfirming(true)}>{L("Issue…", "إصدار…")}</Button>
                <Button tone="muted" onClick={onClose} disabled={busy}>{L("Cancel", "إلغاء")}</Button>
              </>
            ) : (
              <>
                <span className="bpx-sm" style={{ fontWeight: 900, color: "#92400e" }}>
                  {L("An issued invoice can't be edited — only paid or voided. Issue it?", "الفاتورة بعد الإصدار ما بتتعدّل — بس بتندفع أو بتنلغى. نصدرها؟")}
                </span>
                <Button tone="primary" disabled={busy} onClick={issue}>{busy ? "…" : L("Yes, issue", "نعم، أصدر")}</Button>
                <Button tone="muted" disabled={busy} onClick={() => setConfirming(false)}>{L("Back", "رجوع")}</Button>
              </>
            )}
          </div>
        </div>

        <div className="inv-preview">
          <div className="bpx-xs" style={sx.previewLabel}>{L("Preview", "معاينة")}</div>
          <ScaledDoc title="Invoice preview" html={preview} />
        </div>
      </div>
      <style>{ISSUE_CSS}</style>
    </Modal>
  );
}

/* ═════════════ One invoice ═════════════ */

function InvoiceModal({ invoice: inv, onClose, onChanged }) {
  const { t, lang } = useSettingsLang();
  const L = (en, ar) => t({ en, ar });
  const status = statusOf(inv);
  const [mode, setMode] = useState(null); // null | "pay" | "void"
  const [paidAt, setPaidAt] = useState(todayISO());
  const [ref, setRef] = useState("");
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState("");
  const [err, setErr] = useState("");
  const html = useMemo(() => buildInvoiceHtml(inv), [inv]);

  const act = async (body, action) => {
    setBusy(action);
    setErr("");
    try {
      const next = await apiInvoiceAction(inv.id, body, lang);
      onChanged(next, action);
      setMode(null);
    } catch (e) {
      setErr(e.message);
    } finally {
      setBusy("");
    }
  };

  const run = async (key, fn) => { setBusy(key); try { await fn(); } catch (e) { setErr(e.message); } setBusy(""); };

  return (
    <Modal onClose={onClose} wide title={<span>{inv.invoice_number} <StatusPill status={status} lang={lang} /></span>}>
      <div className="inv-issue">
        <div style={{ minWidth: 0 }}>
          <div style={sx.facts}>
            <Fact k={L("Company", "الشركة")} v={inv.company_name} />
            <Fact k={L("Total", "الإجمالي")} v={fmtMoney(inv.amount, inv.currency)} strong />
            <Fact k={L("Issued", "الإصدار")} v={fmtDate(inv.issue_date)} />
            <Fact k={L("Due", "الاستحقاق")} v={fmtDate(inv.due_date)} />
            {status === "paid" && <Fact k={L("Paid on", "تاريخ الدفع")} v={`${fmtDate(inv.paid_at)}${inv.payment_ref ? ` · ${inv.payment_ref}` : ""}`} />}
            {status === "void" && <Fact k={L("Void reason", "سبب الإلغاء")} v={inv.void_reason || "—"} />}
          </div>

          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 14 }}>
            <Button onClick={() => run("print", () => printInvoice(inv))} disabled={!!busy}>🖨 {L("Print", "طباعة")}</Button>
            <Button onClick={() => run("pdf", () => downloadInvoicePdf(inv))} disabled={!!busy}>{busy === "pdf" ? "…" : `⬇ PDF`}</Button>
          </div>

          <div style={{ ...sx.actionBox, marginTop: 16 }}>
            <div className="bpx-sm" style={{ fontWeight: 900, marginBottom: 10 }}>{L("Payment", "الدفع")}</div>
            {(status === "unpaid" || status === "overdue") && mode === null && (
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <Button tone="primary" onClick={() => setMode("pay")}>✓ {L("Mark as paid", "تعليم كمدفوعة")}</Button>
                <Button tone="muted" onClick={() => setMode("void")}>{L("Void…", "إلغاء…")}</Button>
              </div>
            )}
            {mode === "pay" && (
              <div style={{ display: "grid", gap: 10 }}>
                <div className="inv-2">
                  <Field label={L("Paid on", "تاريخ الدفع")}><input type="date" style={inp()} value={paidAt} onChange={(e) => setPaidAt(e.target.value)} /></Field>
                  <Field label={L("Reference (transfer no.)", "المرجع (رقم الحوالة)")}><input style={inp()} value={ref} onChange={(e) => setRef(e.target.value)} /></Field>
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <Button tone="primary" disabled={!!busy} onClick={() => act({ action: "mark_paid", paid_at: paidAt, payment_ref: ref }, "mark_paid")}>{busy ? "…" : L("Confirm payment", "تأكيد الدفع")}</Button>
                  <Button tone="muted" onClick={() => setMode(null)}>{L("Cancel", "إلغاء")}</Button>
                </div>
              </div>
            )}
            {mode === "void" && (
              <div style={{ display: "grid", gap: 10 }}>
                <Field label={L("Why is it void?", "ليش بتنلغى؟")} hint={L("Printed on the invoice. Voiding is final.", "بتنطبع على الفاتورة. الإلغاء نهائي.")}>
                  <input style={inp()} value={reason} onChange={(e) => setReason(e.target.value)} placeholder={L("e.g. Issued twice", "مثلاً: انصدرت مرتين")} />
                </Field>
                <div style={{ display: "flex", gap: 8 }}>
                  <Button tone="danger" disabled={!!busy || !reason.trim()} onClick={() => act({ action: "void", reason }, "void_invoice")}>{busy ? "…" : L("Void invoice", "إلغاء الفاتورة")}</Button>
                  <Button tone="muted" onClick={() => setMode(null)}>{L("Back", "رجوع")}</Button>
                </div>
              </div>
            )}
            {status === "paid" && (
              <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
                <span className="bpx-sm" style={{ color: "#166534", fontWeight: 900 }}>✓ {L("Paid", "مدفوعة")}</span>
                <Button tone="muted" disabled={!!busy} onClick={() => act({ action: "mark_unpaid" }, "mark_unpaid")}>{L("Undo — it was not paid", "تراجع — ما اندفعت")}</Button>
              </div>
            )}
            {status === "void" && <div className="bpx-sm" style={{ color: "#475569" }}>{L("This invoice is void. Issue a new one if needed.", "هالفاتورة ملغاة. أصدر وحدة جديدة إذا لزم.")}</div>}
          </div>

          {err && <div className="bpx-sm" style={sx.err}>{err}</div>}
        </div>

        <div className="inv-preview">
          <ScaledDoc title={inv.invoice_number} html={html} />
        </div>
      </div>
      <style>{ISSUE_CSS}</style>
    </Modal>
  );
}

/* ═════════════ Small pieces ═════════════ */

/* An A4 page (794 × 1123 px) shrunk to whatever width its column has,
   like a PDF viewer — never a horizontal scrollbar, never cut off. */
const A4_W = 794;
const A4_H = 1123;
function ScaledDoc({ html, title }) {
  const box = useRef(null);
  const [scale, setScale] = useState(0.6);
  useEffect(() => {
    const el = box.current;
    if (!el) return undefined;
    const fit = () => setScale(Math.min(1, (el.clientWidth || A4_W) / A4_W));
    fit();
    if (typeof ResizeObserver === "undefined") return undefined;
    const ro = new ResizeObserver(fit);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return (
    <div ref={box} style={{ ...sx.frameBox, height: Math.round(A4_H * scale) }}>
      <iframe
        title={title}
        sandbox="allow-same-origin"
        srcDoc={html}
        scrolling="no"
        style={{ width: A4_W, height: A4_H, border: 0, display: "block", transform: `scale(${scale})`, transformOrigin: "top left" }}
      />
    </div>
  );
}

function StatusPill({ status, lang }) {
  const s = STATUS[status] || STATUS.unpaid;
  return (
    <span className="bpx-xs" style={{ display: "inline-block", padding: "3px 12px", borderRadius: 999, fontWeight: 900, color: s.fg, background: s.bg, border: `1px solid ${s.bd}`, whiteSpace: "nowrap" }}>
      {lang === "ar" ? s.ar : s.en}
    </span>
  );
}

function Kpi({ label, value, sub, tone }) {
  return (
    <div style={{ ...ui.card, marginBottom: 0, borderTop: `4px solid ${tone}`, padding: "14px 16px" }}>
      <div className="bpx-xs" style={{ color: "#64748b", fontWeight: 900, textTransform: "uppercase", letterSpacing: ".05em" }}>{label}</div>
      <div className="bpx-lg" style={{ fontWeight: 1000, color: tone, marginTop: 4, overflowWrap: "anywhere" }}>{value}</div>
      {sub && <div className="bpx-xs" style={{ color: "#64748b", fontWeight: 700 }}>{sub}</div>}
    </div>
  );
}

function Fact({ k, v, strong }) {
  return (
    <div>
      <div className="bpx-xs" style={{ color: "#64748b", fontWeight: 900 }}>{k}</div>
      <div className={strong ? "bpx-lg" : "bpx-sm"} style={{ fontWeight: strong ? 1000 : 800 }}>{v || "—"}</div>
    </div>
  );
}

function Field({ label, hint, error, children, style }) {
  return (
    <label style={{ display: "block", minWidth: 0, ...style }}>
      <span className="bpx-xs" style={{ display: "block", marginBottom: 5, color: "#334155", fontWeight: 900 }}>{label}</span>
      {children}
      {(error || hint) && <span className="bpx-xs" style={{ display: "block", marginTop: 4, color: error ? "#b91c1c" : "#64748b", fontWeight: 800 }}>{error || hint}</span>}
    </label>
  );
}

function Modal({ title, children, onClose, wide }) {
  useEffect(() => {
    const onKey = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);
  return (
    <div style={sx.overlay} onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={sx.modal(wide)} role="dialog" aria-modal="true">
        <div style={sx.modalHead}>
          <div className="bpx-lg" style={{ fontWeight: 1000 }}>{title}</div>
          <button type="button" onClick={onClose} style={sx.iconBtn} aria-label="Close">✕</button>
        </div>
        {children}
      </div>
    </div>
  );
}

const inp = (bad) => ({ ...ui.input, minHeight: 46, borderColor: bad ? "#f87171" : "rgba(15,23,42,0.16)" });

const ISSUE_CSS = `
#root .bpx.bpx .inv-issue{ display:grid; grid-template-columns:minmax(0,1fr) minmax(0,560px); gap:22px; align-items:start; }
#root .bpx.bpx .inv-preview{ position:sticky; top:0; }
#root .bpx.bpx .inv-tot > div{ display:flex; justify-content:space-between; gap:12px; }
#root .bpx.bpx .inv-3{ display:grid; grid-template-columns:repeat(3,minmax(0,1fr)); gap:10px; }
#root .bpx.bpx .inv-2{ display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:10px; }
#root .bpx.bpx .inv-line{ display:grid; grid-template-columns:minmax(0,1fr) 90px 140px 44px; gap:8px; }
@media (max-width: 1100px){ #root .bpx.bpx .inv-issue{ grid-template-columns:1fr; } #root .bpx.bpx .inv-preview{ position:static; } }
@media (max-width: 640px){ #root .bpx.bpx .inv-3, #root .bpx.bpx .inv-2{ grid-template-columns:1fr; } #root .bpx.bpx .inv-line{ grid-template-columns:1fr 70px 100px 40px; } }
`;

const sx = {
  head: { display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 16, flexWrap: "wrap", marginBottom: 16 },
  gapBar: { display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap", padding: "10px 14px", borderRadius: 10, background: "#fffbeb", border: "1px solid #fcd34d", color: "#92400e", marginBottom: 14 },
  kpis: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 12, marginBottom: 16 },
  toolbar: { display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center", marginBottom: 12 },
  chips: { display: "flex", gap: 6, flexWrap: "wrap" },
  chip: (on, s) => ({
    display: "inline-flex", alignItems: "center", gap: 8, minHeight: 42, padding: "0 14px", borderRadius: 999, cursor: "pointer", fontFamily: "inherit", fontWeight: 900,
    border: `1.5px solid ${on ? (s?.bd || "#0f766e") : "#e2e8f0"}`, background: on ? (s?.bg || "#f0fdfa") : "#fff", color: on ? (s?.fg || "#0f766e") : "#475569",
  }),
  chipCount: { minWidth: 24, padding: "0 7px", borderRadius: 999, background: "rgba(15,23,42,.07)", textAlign: "center" },
  empty: { padding: "40px 20px", textAlign: "center", color: "#334155" },
  overlay: { position: "fixed", inset: 0, zIndex: 9000, background: "rgba(15,23,42,.55)", backdropFilter: "blur(4px)", display: "flex", alignItems: "flex-start", justifyContent: "center", padding: "3vh 12px", overflowY: "auto" },
  modal: (wide) => ({ width: wide ? "min(1280px, 100%)" : "min(640px, 100%)", background: "#fff", borderRadius: 16, boxShadow: "0 30px 80px rgba(0,0,0,.35)", padding: "18px 22px 22px" }),
  modalHead: { display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, marginBottom: 14, paddingBottom: 12, borderBottom: "1px solid #e2e8f0" },
  iconBtn: { width: 44, minHeight: 44, borderRadius: 10, border: "1px solid #e2e8f0", background: "#fff", cursor: "pointer", fontWeight: 900, color: "#475569" },
  previewLabel: { color: "#64748b", fontWeight: 900, textTransform: "uppercase", letterSpacing: ".06em", marginBottom: 6 },
  frameBox: { width: "100%", overflow: "hidden", border: "1px solid #e2e8f0", borderRadius: 12, background: "#fff", boxShadow: "0 12px 30px rgba(15,23,42,.10)" },
  vatLocked: { minHeight: 46, display: "flex", alignItems: "center", padding: "0 14px", borderRadius: 10, background: "#f0fdf4", border: "1px solid #bbf7d0", color: "#166534", fontWeight: 900 },
  totalBox: { marginTop: 14, padding: "12px 14px", borderRadius: 12, background: "#f8fafc", border: "1px solid #e2e8f0", display: "grid", gap: 6 },
  err: { marginTop: 12, padding: "10px 14px", borderRadius: 10, background: "#fef2f2", border: "1px solid #fca5a5", color: "#991b1b", fontWeight: 800 },
  facts: { display: "grid", gridTemplateColumns: "repeat(2, minmax(0,1fr))", gap: 12 },
  actionBox: { padding: "14px 16px", borderRadius: 12, border: "1px solid #e2e8f0", background: "#f8fafc" },
};
