// src/pages/settings/invoices/PaymentProofsPanel.jsx
// -----------------------------------------------------------------------------
// Platform Center → Billing → Invoices: the receipts customers uploaded from
// /my-billing, waiting for the owner. Each shows the picture, what the
// customer typed, what the receipt reader found, and how that compares with
// the invoice — then one click:
//   • Confirm  → the invoice is paid (date + reference from the receipt,
//                editable) and the company's subscription is extended;
//   • Reject   → with a reason the customer sees.
// Server: routes/myBilling.cjs (/api/payment-proofs).
// -----------------------------------------------------------------------------

import React, { useCallback, useEffect, useState } from "react";
import API_BASE from "../../../config/api";
import { useSettingsLang } from "../_shared/settingsI18n";
import { fmtDate, fmtMoney } from "./invoiceCore";

async function call(method, path, body) {
  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
    cache: "no-store",
  });
  const j = await res.json().catch(() => ({}));
  if (!res.ok || j.ok === false) throw new Error(j.error || `HTTP ${res.status}`);
  return j;
}

const ERR = {
  not_pending: { en: "Already reviewed.", ar: "انراجع خلص." },
  invoice_void: { en: "The invoice was voided.", ar: "الفاتورة ملغاة." },
  reason_required: { en: "Write a reason.", ar: "اكتب السبب." },
};

export default function PaymentProofsPanel({ onChanged }) {
  const { t, lang } = useSettingsLang();
  const L = useCallback((en, ar) => t({ en, ar }), [t]);
  const [proofs, setProofs] = useState([]);
  const [err, setErr] = useState("");
  const [note, setNote] = useState("");

  const load = useCallback(async () => {
    try {
      const j = await call("GET", "/api/payment-proofs?status=pending");
      setProofs(j.proofs || []);
    } catch (e) {
      setErr(e.message);
    }
  }, []);
  useEffect(() => { load(); }, [load]);

  const msgOf = (e) => (ERR[e.message] ? ERR[e.message][lang === "ar" ? "ar" : "en"] : e.message);

  if (!proofs.length && !note && !err) return null;
  return (
    <section style={sx.box}>
      <div className="bpx-lg" style={{ fontWeight: 1000, marginBottom: 10 }}>
        📎 {L("Payment receipts to review", "إيصالات دفع بانتظار المراجعة")} <span style={sx.count}>{proofs.length}</span>
      </div>
      {note && <div className="bpx-sm" style={sx.ok}>✓ {note}</div>}
      {err && <div className="bpx-sm" style={sx.err}>{err}</div>}
      <div style={{ display: "grid", gap: 10 }}>
        {proofs.map((p) => (
          <ProofCard key={p.id} p={p} L={L}
            onAccept={async (body) => {
              setErr("");
              try {
                const j = await call("POST", `/api/payment-proofs/${p.id}/accept`, body);
                setNote(j.company?.to
                  ? L(`${p.invoice_number} paid · ${p.company_name} extended to ${fmtDate(j.company.to)}`, `${p.invoice_number} مدفوعة · ${p.company_name} تمدد لـ ${fmtDate(j.company.to)}`)
                  : L(`${p.invoice_number} paid`, `${p.invoice_number} مدفوعة`));
                await load();
                onChanged && onChanged(j.invoice);
              } catch (e) { setErr(msgOf(e)); }
            }}
            onReject={async (reason) => {
              setErr("");
              try {
                await call("POST", `/api/payment-proofs/${p.id}/reject`, { reason });
                setNote(L(`Receipt for ${p.invoice_number} rejected — the customer sees why.`, `انرفض إيصال ${p.invoice_number} — العميل بيشوف السبب.`));
                await load();
              } catch (e) { setErr(msgOf(e)); }
            }} />
        ))}
      </div>
    </section>
  );
}

function ProofCard({ p, L, onAccept, onReject }) {
  const [mode, setMode] = useState(null); // null | accept | reject
  const [paidAt, setPaidAt] = useState(p.paid_on || "");
  const [ref, setRef] = useState(p.reference || "");
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const run = async (fn) => { setBusy(true); try { await fn(); } finally { setBusy(false); } };

  const amountOk = Math.abs((Number(p.amount) || 0) - (Number(p.invoice_amount) || 0)) < 0.01;
  const ocr = p.ocr || {};
  const ocrAmountOk = (ocr.amounts || []).some((a) => Math.abs(Number(a) - Number(p.invoice_amount)) < 0.01);
  const ocrRefOk = !!p.reference && (ocr.references || []).includes(String(p.reference).toUpperCase());

  return (
    <div style={sx.card}>
      <a href={p.image_url} target="_blank" rel="noreferrer" title={L("Open the full picture", "فتح الصورة كاملة")}>
        <img src={p.image_url} alt="" style={sx.img} />
      </a>
      <div style={{ minWidth: 0, flex: "1 1 260px", display: "grid", gap: 4 }}>
        <div style={{ fontWeight: 1000 }}>{p.company_name} · <span style={{ color: "#0f766e" }}>{p.invoice_number}</span>{p.invoice_kind === "promo_lock" ? " 🔒" : ""}</div>
        <div className="bpx-sm">
          {L("Sent", "المرسل")}: <b>{fmtMoney(p.amount, p.currency)}</b> · {L("Invoice", "الفاتورة")}: <b>{fmtMoney(p.invoice_amount, p.currency)}</b>
        </div>
        <div className="bpx-xs" style={{ color: "#475569" }}>
          {p.paid_on ? `${L("Paid on", "تاريخ الدفع")} ${fmtDate(p.paid_on)} · ` : ""}{p.reference ? `${L("Ref", "المرجع")} ${p.reference} · ` : ""}{p.submitted_by} · {fmtDate(p.created_at)}
        </div>
        {p.note && <div className="bpx-xs" style={{ color: "#475569" }}>💬 {p.note}</div>}
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          <Tag ok={amountOk} text={amountOk ? L("Amount = invoice", "المبلغ = الفاتورة") : L("Amount differs", "المبلغ مختلف")} />
          {(ocr.amounts || []).length > 0 && <Tag ok={ocrAmountOk} text={ocrAmountOk ? L("Receipt shows the invoice amount", "الإيصال فيه مبلغ الفاتورة") : L("Receipt amount not matched", "مبلغ الإيصال مش مطابق")} />}
          {ocrRefOk && <Tag ok text={L("Reference read on the receipt", "المرجع مقروء من الإيصال")} />}
          {ocr.invoiceNumberSeen && <Tag ok text={L("Invoice no. on the receipt", "رقم الفاتورة على الإيصال")} />}
          {!(ocr.amounts || []).length && <Tag text={L("Receipt not machine-read — check the picture", "الإيصال ما انقرأ آلياً — راجع الصورة")} />}
        </div>

        {mode === null && (
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 6 }}>
            <button type="button" style={sx.btn("primary")} onClick={() => setMode("accept")}>✓ {L("Confirm payment", "تأكيد الدفع")}</button>
            <button type="button" style={sx.btn()} onClick={() => setMode("reject")}>{L("Reject…", "رفض…")}</button>
          </div>
        )}
        {mode === "accept" && (
          <div style={{ display: "grid", gap: 8, marginTop: 6 }}>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <input type="date" style={sx.input} value={paidAt} onChange={(e) => setPaidAt(e.target.value)} title={L("Paid on", "تاريخ الدفع")} />
              <input style={{ ...sx.input, flex: 1 }} value={ref} onChange={(e) => setRef(e.target.value)} placeholder={L("Reference", "المرجع")} />
            </div>
            <div className="bpx-xs" style={{ color: "#0f766e", fontWeight: 800 }}>
              📅 {L(`Marks ${p.invoice_number} paid and extends the subscription${p.period_end ? ` to ${fmtDate(p.period_end)}` : ""}.`, `بتعلّم ${p.invoice_number} مدفوعة وبتمدد الاشتراك${p.period_end ? ` لـ ${fmtDate(p.period_end)}` : ""}.`)}
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <button type="button" style={sx.btn("primary")} disabled={busy} onClick={() => run(() => onAccept({ paid_at: paidAt || undefined, payment_ref: ref }))}>{busy ? "…" : L("Yes, it was received", "نعم، وصل")}</button>
              <button type="button" style={sx.btn()} disabled={busy} onClick={() => setMode(null)}>{L("Back", "رجوع")}</button>
            </div>
          </div>
        )}
        {mode === "reject" && (
          <div style={{ display: "grid", gap: 8, marginTop: 6 }}>
            <input style={sx.input} value={reason} onChange={(e) => setReason(e.target.value)}
              placeholder={L("Why? The customer sees this (e.g. amount not received yet)", "ليش؟ العميل بيشوفها (مثلاً: المبلغ ما وصل لسا)")} />
            <div style={{ display: "flex", gap: 8 }}>
              <button type="button" style={sx.btn("danger")} disabled={busy || !reason.trim()} onClick={() => run(() => onReject(reason.trim()))}>{busy ? "…" : L("Reject receipt", "رفض الإيصال")}</button>
              <button type="button" style={sx.btn()} disabled={busy} onClick={() => setMode(null)}>{L("Back", "رجوع")}</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

const Tag = ({ ok, text }) => (
  <span className="bpx-xs" style={{ padding: "2px 10px", borderRadius: 999, fontWeight: 900,
    color: ok === true ? "#166534" : ok === false ? "#92400e" : "#475569", background: ok === true ? "#f0fdf4" : ok === false ? "#fffbeb" : "#f1f5f9" }}>
    {ok === true ? "✓" : ok === false ? "⚠" : "ℹ"} {text}
  </span>
);

const sx = {
  box: { border: "2px solid #7dd3fc", background: "linear-gradient(135deg,#f0f9ff,#ffffff)", borderRadius: 18, padding: 16, marginBottom: 16 },
  count: { display: "inline-block", minWidth: 28, textAlign: "center", padding: "0 8px", borderRadius: 999, background: "#0369a1", color: "#fff" },
  card: { display: "flex", gap: 12, flexWrap: "wrap", alignItems: "flex-start", background: "#fff", border: "1px solid #dbeafe", borderRadius: 14, padding: 12 },
  img: { width: 110, height: 110, objectFit: "cover", borderRadius: 12, border: "1px solid #dbeafe", display: "block" },
  input: { minHeight: 42, padding: "6px 10px", borderRadius: 10, border: "1px solid #cbd5e1", fontWeight: 700 },
  ok: { background: "#f0fdf4", color: "#166534", padding: "8px 12px", borderRadius: 10, marginBottom: 10, fontWeight: 800 },
  err: { background: "#fef2f2", color: "#991b1b", padding: "8px 12px", borderRadius: 10, marginBottom: 10, fontWeight: 800 },
  btn: (tone) => ({
    minHeight: 40, padding: "6px 14px", borderRadius: 10, fontWeight: 900, cursor: "pointer",
    border: tone ? "none" : "1px solid #cbd5e1",
    background: tone === "primary" ? "linear-gradient(135deg,#0f766e,#14b8a6)" : tone === "danger" ? "#dc2626" : "#fff",
    color: tone ? "#fff" : "#0f172a",
  }),
};
