// src/pages/admin/InvoicesSection.jsx
// Invoices section embedded inside SubscriptionTab.
// - Lists past invoices (newest first) from /api/invoices
// - "Issue New Invoice" → modal pre-filled from current subscription + counts
// - "Billing Settings" → modal to edit single-row buyer info (/api/billing-profile)
// - Click row → viewer modal with on-screen preview + Print + PDF download
//
// PDF is rendered in English only via jsPDF (no Arabic font embedded). The
// on-screen preview + browser Print fully support Arabic via system fonts.

import React, { useState, useEffect, useCallback, useRef } from "react";
import API_BASE from "../../config/api";
import { useSettingsLang } from "../settings/_shared/settingsI18n";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

/* ── helpers ── */
function getUser() {
  try { return JSON.parse(localStorage.getItem("currentUser") || "{}"); } catch { return {}; }
}
function fmtDate(d) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}
function fmtMoney(amount, currency) {
  const n = Number(amount || 0);
  return `${n.toFixed(2)} ${currency || "USD"}`;
}
function today() { return new Date().toISOString().slice(0, 10); }
function addYear(d) {
  const x = new Date(d);
  x.setFullYear(x.getFullYear() + 1);
  return x.toISOString().slice(0, 10);
}

/* ── shared styles (light card inside dark/light contexts) ── */
const ui = {
  card: {
    background: "#fff", borderRadius: 14, border: "1px solid #e2e8f0",
    overflow: "hidden", boxShadow: "0 2px 8px rgba(0,0,0,.06)",
  },
  cardHeader: {
    padding: "18px 22px", borderBottom: "1px solid #e2e8f0",
    display: "flex", justifyContent: "space-between", alignItems: "center",
    gap: 10, flexWrap: "wrap",
  },
  h3: { margin: 0, fontWeight: 800, fontSize: 19, color: "#1e293b" },
  desc: { fontSize: 13, color: "#64748b", margin: "4px 0 0" },
  btnPrimary: {
    background: "#3b82f6", color: "#fff", border: "none", borderRadius: 8,
    padding: "9px 18px", fontWeight: 700, fontSize: 15, cursor: "pointer",
    fontFamily: "inherit",
  },
  btnSecondary: {
    background: "#f1f5f9", color: "#475569",
    border: "1.5px solid #e2e8f0", borderRadius: 8,
    padding: "9px 16px", fontWeight: 700, fontSize: 14, cursor: "pointer",
    fontFamily: "inherit",
  },
  btnGhost: {
    background: "transparent", color: "#3b82f6",
    border: "1.5px solid #bfdbfe", borderRadius: 8,
    padding: "8px 14px", fontWeight: 700, fontSize: 13, cursor: "pointer",
    fontFamily: "inherit",
  },
  table: { width: "100%", borderCollapse: "collapse", fontSize: 14 },
  th: {
    background: "#f8fafc", padding: "10px 14px",
    fontWeight: 800, fontSize: 13, color: "#475569",
    textAlign: "start", borderBottom: "1.5px solid #e2e8f0",
    whiteSpace: "nowrap",
  },
  td: { padding: "12px 14px", borderBottom: "1px solid #f1f5f9", color: "#1e293b" },
  empty: { padding: "32px 20px", textAlign: "center", color: "#94a3b8", fontSize: 14 },
  input: {
    width: "100%", border: "1.5px solid #e2e8f0", borderRadius: 8,
    padding: "10px 12px", fontSize: 15, color: "#1e293b",
    fontFamily: "inherit", background: "#f8fafc", boxSizing: "border-box",
  },
  label: { display: "block", fontSize: 13, fontWeight: 700, color: "#475569", marginBottom: 4 },
  overlay: {
    position: "fixed", inset: 0, background: "rgba(15,23,42,.55)",
    display: "flex", alignItems: "center", justifyContent: "center",
    zIndex: 9000, padding: 16, backdropFilter: "blur(6px)",
  },
  modal: {
    background: "#fff", borderRadius: 16, padding: "24px 28px",
    width: "min(640px, 96vw)", maxHeight: "92vh", overflowY: "auto",
    fontFamily: "Cairo, sans-serif", boxShadow: "0 28px 64px rgba(0,0,0,.35)",
  },
  msg: (ok) => ({
    background: ok ? "#d1fae5" : "#fee2e2",
    border: `1px solid ${ok ? "#6ee7b7" : "#fca5a5"}`,
    color: ok ? "#065f46" : "#991b1b",
    borderRadius: 8, padding: "10px 14px",
    fontWeight: 700, fontSize: 14, marginBottom: 14,
  }),
};

/* ════════════════════════════════════════════════════════════
   PDF GENERATION (English only — minimal, jsPDF + autotable)
═════════════════════════════════════════════════════════════ */
function downloadInvoicePdf(inv) {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const margin = 48;

  /* Header */
  doc.setFont("helvetica", "bold");
  doc.setFontSize(24);
  doc.text("INVOICE", margin, 64);

  doc.setFontSize(11);
  doc.setFont("helvetica", "normal");
  doc.text(`No.: ${inv.invoice_number}`, pageW - margin, 56, { align: "right" });
  doc.text(`Date: ${fmtDate(inv.issue_date)}`, pageW - margin, 72, { align: "right" });
  if (inv.period_start || inv.period_end) {
    doc.text(
      `Period: ${fmtDate(inv.period_start)} → ${fmtDate(inv.period_end)}`,
      pageW - margin, 88, { align: "right" }
    );
  }

  /* Billed to box */
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.5);
  doc.line(margin, 104, pageW - margin, 104);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text("BILLED TO", margin, 128);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(12);
  let y = 146;
  doc.text(inv.company_name || "—", margin, y); y += 16;
  if (inv.company_address) { doc.text(String(inv.company_address), margin, y); y += 16; }
  if (inv.tax_id)          { doc.text(`Tax ID: ${inv.tax_id}`, margin, y); y += 16; }

  /* Line items table */
  const lines = [
    [`Subscription — ${inv.plan_name || "—"} plan`, "1"],
    ["Active accounts", String(inv.accounts_count ?? 0)],
    ["Active branches", String(inv.branches_count ?? 0)],
  ];
  autoTable(doc, {
    startY: Math.max(y + 16, 220),
    head: [["Description", "Qty"]],
    body: lines,
    theme: "grid",
    margin: { left: margin, right: margin },
    headStyles: { fillColor: [59, 130, 246], textColor: 255, fontStyle: "bold" },
    styles: { fontSize: 11, cellPadding: 8 },
    columnStyles: { 1: { halign: "center", cellWidth: 80 } },
  });

  /* Total */
  const endY = (doc.lastAutoTable?.finalY || 300) + 24;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.text(`Total: ${fmtMoney(inv.amount, inv.currency)}`, pageW - margin, endY, { align: "right" });

  /* Notes */
  if (inv.notes) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`Notes: ${inv.notes}`, margin, endY + 28, { maxWidth: pageW - margin * 2 });
  }

  /* Footer */
  doc.setFont("helvetica", "italic");
  doc.setFontSize(10);
  doc.setTextColor(140);
  doc.text("Thank you for your business.", pageW / 2, doc.internal.pageSize.getHeight() - 40, { align: "center" });

  doc.save(`${inv.invoice_number}.pdf`);
}

/* ════════════════════════════════════════════════════════════
   BILLING SETTINGS MODAL
═════════════════════════════════════════════════════════════ */
function BillingSettingsModal({ profile, onClose, onSaved }) {
  const { t, dir } = useSettingsLang();
  const [form, setForm] = useState(() => ({
    company_name:    profile?.company_name    || "",
    company_address: profile?.company_address || "",
    tax_id:          profile?.tax_id          || "",
    contact_email:   profile?.contact_email   || "",
    contact_phone:   profile?.contact_phone   || "",
    notes:           profile?.notes           || "",
  }));
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  async function save() {
    setSaving(true); setErr("");
    try {
      const r = await fetch(`${API_BASE}/api/billing-profile`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const d = await r.json();
      if (d.ok) onSaved(d.profile);
      else setErr(t("invBpSaveFail"));
    } catch {
      setErr(t("invBpSaveFail"));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div style={ui.overlay} onClick={onClose}>
      <div style={ui.modal} dir={dir} onClick={e => e.stopPropagation()}>
        <h3 style={{ ...ui.h3, marginBottom: 6 }}>⚙️ {t("invBpTitle")}</h3>
        <p style={ui.desc}>{t("invBpDesc")}</p>

        {err && <div style={{ ...ui.msg(false), marginTop: 14 }}>{err}</div>}

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginTop: 16 }}>
          <div style={{ gridColumn: "1 / -1" }}>
            <label style={ui.label}>{t("invBpCompanyName")} *</label>
            <input style={ui.input} value={form.company_name}
              onChange={e => set("company_name", e.target.value)} />
          </div>
          <div style={{ gridColumn: "1 / -1" }}>
            <label style={ui.label}>{t("invBpAddress")}</label>
            <input style={ui.input} value={form.company_address}
              onChange={e => set("company_address", e.target.value)} />
          </div>
          <div>
            <label style={ui.label}>{t("invBpTaxId")}</label>
            <input style={ui.input} value={form.tax_id}
              onChange={e => set("tax_id", e.target.value)} />
          </div>
          <div>
            <label style={ui.label}>{t("invBpPhone")}</label>
            <input style={ui.input} value={form.contact_phone}
              onChange={e => set("contact_phone", e.target.value)} dir="ltr" />
          </div>
          <div style={{ gridColumn: "1 / -1" }}>
            <label style={ui.label}>{t("invBpEmail")}</label>
            <input style={ui.input} value={form.contact_email}
              onChange={e => set("contact_email", e.target.value)} dir="ltr" />
          </div>
          <div style={{ gridColumn: "1 / -1" }}>
            <label style={ui.label}>{t("invBpNotes")}</label>
            <textarea style={{ ...ui.input, minHeight: 70, resize: "vertical" }}
              value={form.notes} onChange={e => set("notes", e.target.value)} />
          </div>
        </div>

        <div style={{ display: "flex", gap: 10, marginTop: 20, justifyContent: "flex-end" }}>
          <button onClick={onClose} style={ui.btnSecondary}>{t("cancel")}</button>
          <button onClick={save} disabled={saving} style={ui.btnPrimary}>
            {saving ? t("saving") : `💾 ${t("save")}`}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════
   ISSUE INVOICE MODAL
═════════════════════════════════════════════════════════════ */
function IssueInvoiceModal({ profile, subscription, accountsCount, branchesCount, onClose, onIssued }) {
  const { t, dir } = useSettingsLang();
  const user = getUser();

  const [form, setForm] = useState(() => {
    const start = subscription?.start_date?.slice(0, 10) || today();
    const end   = subscription?.end_date?.slice(0, 10)   || addYear(start);
    return {
      issue_date:    today(),
      period_start:  start,
      period_end:    end,
      plan_name:     subscription?.plan || "",
      accounts_count: accountsCount,
      branches_count: branchesCount,
      amount:        subscription?.price || "",
      currency:      subscription?.currency || "USD",
      notes:         profile?.notes || "",
    };
  });
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  async function issue() {
    if (!profile?.company_name?.trim()) {
      setErr(t("invCompanyNameReq"));
      return;
    }
    setSaving(true); setErr("");
    try {
      const body = {
        ...form,
        company_name:    profile.company_name,
        company_address: profile.company_address,
        tax_id:          profile.tax_id,
        accounts_count: Number(form.accounts_count) || 0,
        branches_count: Number(form.branches_count) || 0,
        amount:         Number(form.amount)         || 0,
        created_by:     user.username || "admin",
      };
      const r = await fetch(`${API_BASE}/api/invoices`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const d = await r.json();
      if (d.ok) onIssued(d.invoice);
      else setErr(t("invIssueFail"));
    } catch {
      setErr(t("invIssueFail"));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div style={ui.overlay} onClick={onClose}>
      <div style={ui.modal} dir={dir} onClick={e => e.stopPropagation()}>
        <h3 style={{ ...ui.h3, marginBottom: 6 }}>🧾 {t("invIssueTitle")}</h3>
        <p style={ui.desc}>{t("invIssueIntro")}</p>

        {err && <div style={{ ...ui.msg(false), marginTop: 14 }}>{err}</div>}

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginTop: 16 }}>
          <div>
            <label style={ui.label}>{t("invFieldIssueDate")}</label>
            <input type="date" style={ui.input} value={form.issue_date}
              onChange={e => set("issue_date", e.target.value)} />
          </div>
          <div>
            <label style={ui.label}>{t("invFieldPlan")}</label>
            <input style={ui.input} value={form.plan_name}
              onChange={e => set("plan_name", e.target.value)} />
          </div>
          <div>
            <label style={ui.label}>{t("invFieldPeriodStart")}</label>
            <input type="date" style={ui.input} value={form.period_start}
              onChange={e => set("period_start", e.target.value)} />
          </div>
          <div>
            <label style={ui.label}>{t("invFieldPeriodEnd")}</label>
            <input type="date" style={ui.input} value={form.period_end}
              onChange={e => set("period_end", e.target.value)} />
          </div>
          <div>
            <label style={ui.label}>{t("invFieldAccounts")}</label>
            <input type="number" min="0" style={ui.input} value={form.accounts_count}
              onChange={e => set("accounts_count", e.target.value)} />
          </div>
          <div>
            <label style={ui.label}>{t("invFieldBranches")}</label>
            <input type="number" min="0" style={ui.input} value={form.branches_count}
              onChange={e => set("branches_count", e.target.value)} />
          </div>
          <div>
            <label style={ui.label}>{t("invFieldAmount")}</label>
            <input type="number" step="0.01" style={ui.input} value={form.amount}
              onChange={e => set("amount", e.target.value)} />
          </div>
          <div>
            <label style={ui.label}>{t("invFieldCurrency")}</label>
            <select style={ui.input} value={form.currency}
              onChange={e => set("currency", e.target.value)}>
              <option>USD</option><option>AED</option><option>EUR</option><option>GBP</option>
            </select>
          </div>
          <div style={{ gridColumn: "1 / -1" }}>
            <label style={ui.label}>{t("invFieldNotes")}</label>
            <textarea style={{ ...ui.input, minHeight: 60, resize: "vertical" }}
              value={form.notes} onChange={e => set("notes", e.target.value)} />
          </div>
        </div>

        <div style={{ display: "flex", gap: 10, marginTop: 20, justifyContent: "flex-end" }}>
          <button onClick={onClose} style={ui.btnSecondary}>{t("cancel")}</button>
          <button onClick={issue} disabled={saving} style={ui.btnPrimary}>
            {saving ? t("invIssuing") : `🧾 ${t("invIssueBtn")}`}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════
   INVOICE VIEWER MODAL (preview + print + PDF)
═════════════════════════════════════════════════════════════ */
function InvoiceViewerModal({ invoice, onClose }) {
  const { t, dir, isAr } = useSettingsLang();
  const printRef = useRef(null);

  const lines = [
    { desc: t("invLineSub").replace("{plan}", invoice.plan_name || "—"), qty: 1 },
    { desc: t("invLineAccounts"), qty: invoice.accounts_count ?? 0 },
    { desc: t("invLineBranches"), qty: invoice.branches_count ?? 0 },
  ];

  function handlePrint() {
    window.print();
  }

  return (
    <div style={ui.overlay} onClick={onClose}>
      <style>{`
        @media print {
          body * { visibility: hidden !important; }
          .invoice-print-root, .invoice-print-root * { visibility: visible !important; }
          .invoice-print-root {
            position: absolute !important; left: 0 !important; top: 0 !important;
            width: 100% !important; padding: 24px !important;
            box-shadow: none !important; border: none !important;
            max-height: none !important; overflow: visible !important;
          }
          .no-print { display: none !important; }
        }
      `}</style>

      <div style={{ ...ui.modal, width: "min(720px, 96vw)", padding: 0 }}
        dir={dir} onClick={e => e.stopPropagation()}>

        {/* Toolbar (hidden when printing) */}
        <div className="no-print" style={{
          padding: "12px 18px", borderBottom: "1px solid #e2e8f0",
          display: "flex", justifyContent: "space-between", alignItems: "center",
          flexWrap: "wrap", gap: 10,
        }}>
          <div style={{ fontWeight: 800, color: "#1e293b", fontSize: 15 }}>
            🧾 {t("invViewerTitle")} — {invoice.invoice_number}
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button onClick={handlePrint} style={ui.btnSecondary}>🖨️ {t("invPrint")}</button>
            <button onClick={() => downloadInvoicePdf(invoice)} style={ui.btnPrimary}>
              📄 {t("invDownloadPdf")}
            </button>
            <button onClick={onClose} style={ui.btnSecondary}>✕ {t("invClose")}</button>
          </div>
        </div>

        {/* Printable invoice body */}
        <div ref={printRef} className="invoice-print-root" style={{
          padding: "28px 32px", background: "#fff", color: "#1e293b",
          fontFamily: "Cairo, 'Segoe UI', sans-serif",
        }}>
          {/* Header */}
          <div style={{ display: "flex", justifyContent: "space-between",
            alignItems: "flex-start", gap: 16, flexWrap: "wrap", marginBottom: 22 }}>
            <div>
              <div style={{ fontSize: 30, fontWeight: 900, color: "#1e293b", letterSpacing: 1 }}>
                {t("invViewerTitle").toUpperCase()}
              </div>
              <div style={{ fontSize: 14, color: "#64748b", marginTop: 4 }}>
                {invoice.invoice_number}
              </div>
            </div>
            <div style={{ textAlign: isAr ? "left" : "right", fontSize: 14, color: "#475569" }}>
              <div><strong>{t("invDate")}:</strong> {fmtDate(invoice.issue_date)}</div>
              {(invoice.period_start || invoice.period_end) && (
                <div style={{ marginTop: 4 }}>
                  <strong>{t("invPeriod")}:</strong>{" "}
                  {fmtDate(invoice.period_start)} → {fmtDate(invoice.period_end)}
                </div>
              )}
            </div>
          </div>

          <div style={{ height: 1, background: "#e2e8f0", margin: "12px 0 20px" }} />

          {/* Billed to */}
          <div style={{ marginBottom: 22 }}>
            <div style={{ fontSize: 11, fontWeight: 800, color: "#94a3b8",
              textTransform: "uppercase", letterSpacing: ".08em", marginBottom: 6 }}>
              {t("invBilledTo")}
            </div>
            <div style={{ fontSize: 17, fontWeight: 800, color: "#1e293b" }}>
              {invoice.company_name || "—"}
            </div>
            {invoice.company_address && (
              <div style={{ fontSize: 14, color: "#475569", marginTop: 4 }}>
                {invoice.company_address}
              </div>
            )}
            {invoice.tax_id && (
              <div style={{ fontSize: 13, color: "#64748b", marginTop: 4 }}>
                {t("invBpTaxId")}: {invoice.tax_id}
              </div>
            )}
          </div>

          {/* Line items */}
          <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: 16 }}>
            <thead>
              <tr>
                <th style={{ ...ui.th, background: "#3b82f6", color: "#fff" }}>{t("invDescription")}</th>
                <th style={{ ...ui.th, background: "#3b82f6", color: "#fff", textAlign: "center", width: 100 }}>
                  {t("invQty")}
                </th>
              </tr>
            </thead>
            <tbody>
              {lines.map((ln, i) => (
                <tr key={i} style={{ background: i % 2 === 0 ? "#f8fafc" : "#fff" }}>
                  <td style={ui.td}>{ln.desc}</td>
                  <td style={{ ...ui.td, textAlign: "center", fontWeight: 800 }}>{ln.qty}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Total */}
          <div style={{ display: "flex", justifyContent: isAr ? "flex-start" : "flex-end",
            alignItems: "baseline", gap: 12, padding: "12px 0",
            borderTop: "2px solid #1e293b", marginTop: 8 }}>
            <span style={{ fontSize: 14, fontWeight: 700, color: "#64748b" }}>
              {t("invTotal")}:
            </span>
            <span style={{ fontSize: 22, fontWeight: 900, color: "#1e293b" }}>
              {fmtMoney(invoice.amount, invoice.currency)}
            </span>
          </div>

          {invoice.notes && (
            <div style={{ marginTop: 18, padding: "10px 14px", borderRadius: 8,
              background: "#f8fafc", border: "1px solid #e2e8f0",
              fontSize: 13, color: "#475569" }}>
              <strong>{t("invFieldNotes")}:</strong> {invoice.notes}
            </div>
          )}

          <div style={{ marginTop: 24, fontSize: 12, color: "#94a3b8",
            textAlign: "center", fontStyle: "italic" }}>
            {t("invThanks")}
          </div>

          {isAr && (
            <div className="no-print" style={{ marginTop: 18, fontSize: 11,
              color: "#94a3b8", textAlign: "center" }}>
              ℹ️ {t("invPdfNoteAr")}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════
   MAIN — Invoices Section
═════════════════════════════════════════════════════════════ */
export default function InvoicesSection({ subscription }) {
  const { t, dir } = useSettingsLang();
  const [invoices, setInvoices] = useState([]);
  const [profile, setProfile]   = useState(null);
  const [loading, setLoading]   = useState(true);
  const [accountsCount, setAccountsCount] = useState(0);
  const [branchesCount, setBranchesCount] = useState(0);
  const [msg, setMsg] = useState(null); // { ok:bool, text }

  const [showIssue, setShowIssue]     = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [viewInvoice, setViewInvoice]   = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [invRes, profRes, usersRes, compRes] = await Promise.all([
        fetch(`${API_BASE}/api/invoices`).then(r => r.json()).catch(() => ({})),
        fetch(`${API_BASE}/api/billing-profile`).then(r => r.json()).catch(() => ({})),
        fetch(`${API_BASE}/api/app-users`).then(r => r.json()).catch(() => ({})),
        fetch(`${API_BASE}/api/companies`).then(r => r.json()).catch(() => ({})),
      ]);
      if (invRes.ok)  setInvoices(invRes.invoices || []);
      if (profRes.ok) setProfile(profRes.profile || null);
      if (usersRes.ok) {
        const active = (usersRes.users || []).filter(u => u.is_active);
        setAccountsCount(active.length);
      }
      /* branches default: number of companies on platform (best minimal proxy);
         user can adjust in the modal */
      if (compRes.ok) {
        setBranchesCount(Array.isArray(compRes.companies) ? compRes.companies.length : 0);
      }
    } catch (e) {
      console.error("InvoicesSection load error:", e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  function flash(ok, text) {
    setMsg({ ok, text });
    setTimeout(() => setMsg(null), ok ? 3500 : 6000);
  }

  return (
    <section style={{ marginTop: 32 }} dir={dir}>
      <div style={ui.card}>
        {/* Header */}
        <div style={ui.cardHeader}>
          <div>
            <h3 style={ui.h3}>🧾 {t("invSectionTitle")}</h3>
            <p style={ui.desc}>{t("invSectionDesc")}</p>
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button onClick={() => setShowSettings(true)} style={ui.btnGhost}>
              ⚙️ {t("invBillingSettings")}
            </button>
            <button onClick={() => setShowIssue(true)} style={ui.btnPrimary}>
              ➕ {t("invIssueNew")}
            </button>
          </div>
        </div>

        {/* Message */}
        {msg && (
          <div style={{ padding: "0 22px", paddingTop: 14 }}>
            <div style={ui.msg(msg.ok)}>{msg.text}</div>
          </div>
        )}

        {/* History list */}
        <div>
          {loading ? (
            <div style={ui.empty}>⏳ {t("invLoading")}</div>
          ) : invoices.length === 0 ? (
            <div style={ui.empty}>📭 {t("invEmpty")}</div>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table style={ui.table}>
                <thead>
                  <tr>
                    <th style={ui.th}>{t("invColNumber")}</th>
                    <th style={ui.th}>{t("invColDate")}</th>
                    <th style={ui.th}>{t("invColCompany")}</th>
                    <th style={ui.th}>{t("invColPlan")}</th>
                    <th style={ui.th}>{t("invColPeriod")}</th>
                    <th style={{ ...ui.th, textAlign: "end" }}>{t("invColAmount")}</th>
                  </tr>
                </thead>
                <tbody>
                  {invoices.map(inv => (
                    <tr key={inv.id}
                      onClick={() => setViewInvoice(inv)}
                      style={{ cursor: "pointer", transition: "background .12s" }}
                      onMouseEnter={e => e.currentTarget.style.background = "#f8fafc"}
                      onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                      <td style={{ ...ui.td, fontWeight: 800, color: "#3b82f6" }}>
                        {inv.invoice_number}
                      </td>
                      <td style={ui.td}>{fmtDate(inv.issue_date)}</td>
                      <td style={ui.td}>{inv.company_name || "—"}</td>
                      <td style={ui.td}>{inv.plan_name || "—"}</td>
                      <td style={ui.td}>
                        {inv.period_start || inv.period_end
                          ? `${fmtDate(inv.period_start)} → ${fmtDate(inv.period_end)}`
                          : "—"}
                      </td>
                      <td style={{ ...ui.td, textAlign: "end", fontWeight: 800 }}>
                        {fmtMoney(inv.amount, inv.currency)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Modals */}
      {showSettings && (
        <BillingSettingsModal
          profile={profile}
          onClose={() => setShowSettings(false)}
          onSaved={(p) => { setProfile(p); setShowSettings(false); flash(true, t("invBpSaved")); }}
        />
      )}
      {showIssue && (
        <IssueInvoiceModal
          profile={profile}
          subscription={subscription}
          accountsCount={accountsCount}
          branchesCount={branchesCount}
          onClose={() => setShowIssue(false)}
          onIssued={(inv) => {
            setInvoices(prev => [inv, ...prev]);
            setShowIssue(false);
            flash(true, t("invIssuedOk"));
            setViewInvoice(inv); // open viewer right after issuing
          }}
        />
      )}
      {viewInvoice && (
        <InvoiceViewerModal invoice={viewInvoice} onClose={() => setViewInvoice(null)} />
      )}
    </section>
  );
}
