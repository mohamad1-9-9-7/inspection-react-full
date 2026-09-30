// src/pages/settings/BillingOverviewTab.jsx
// Billing → Overview. The ONLY place the headline money numbers live:
// four figures, then one list of everything that needs the owner's hand
// (overdue invoices, lapsed or lapsing subscriptions, companies missing the
// data an invoice needs). Per-plan figures stay on the plan cards; the
// company list stays in Companies.
import React, { useCallback, useEffect, useMemo, useState } from "react";
import API_BASE from "../../config/api";
import { Button, StatusMessage, ui } from "./_shared/SettingsUIKit";
import { useSettingsLang } from "./_shared/settingsI18n";
import { companyStatus, daysLeft, mrrByCurrency } from "./_shared/companyBilling";
import { apiListInvoices, day, fmtMoney, invoiceKpis, moneyMap, statusOf, todayISO } from "./invoices/invoiceCore";

const SOON_DAYS = 14;

export default function BillingOverviewTab({ onGo }) {
  const { t, dir, lang } = useSettingsLang();
  const L = useCallback((en, ar) => t({ en, ar }), [t]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState(null);
  const [companies, setCompanies] = useState([]);
  const [invoices, setInvoices] = useState([]);

  const load = useCallback(async () => {
    setLoading(true);
    setMsg(null);
    try {
      const [comp, inv] = await Promise.all([
        fetch(`${API_BASE}/api/companies`).then((r) => r.json()).catch(() => ({})),
        apiListInvoices(lang).catch(() => []),
      ]);
      setCompanies(comp?.ok && Array.isArray(comp.companies) ? comp.companies : []);
      setInvoices(Array.isArray(inv) ? inv : []);
    } catch (e) {
      setMsg({ kind: "err", text: e?.message || L("Could not load.", "تعذّر التحميل.") });
    } finally {
      setLoading(false);
    }
  }, [lang, L]);

  useEffect(() => { load(); }, [load]);

  const view = useMemo(() => {
    const kpi = invoiceKpis(invoices);
    // A disabled company is switched off on purpose — nothing to chase.
    const live = companies.filter((c) => !c.disabled_at).map((c) => ({ ...c, days: daysLeft(c.end_date), st: companyStatus(c) }));
    const expired = live.filter((c) => c.st === "expired").sort((a, b) => (a.days ?? 0) - (b.days ?? 0));
    const soon = live.filter((c) => c.st !== "expired" && c.days !== null && c.days >= 0 && c.days <= SOON_DAYS).sort((a, b) => a.days - b.days);

    const today = todayISO();
    const overdueInv = invoices
      .filter((i) => statusOf(i) === "overdue")
      .map((i) => ({ ...i, late: Math.max(0, Math.round((new Date(today) - new Date(day(i.due_date) || today)) / 86400000)) }))
      .sort((a, b) => b.late - a.late);

    const gaps = live
      .map((c) => ({
        c,
        missing: [
          !c.plan_id && !c.plan_name && c.price == null ? L("plan or price", "خطة أو سعر") : null,
          !c.contact_email ? L("e-mail", "إيميل") : null,
          !c.end_date ? L("end date", "تاريخ انتهاء") : null,
        ].filter(Boolean),
      }))
      .filter((g) => g.missing.length);

    return { kpi, expired, soon, overdueInv, gaps, mrr: mrrByCurrency(companies) };
  }, [companies, invoices, L]);

  const actions = view.overdueInv.length + view.expired.length + view.soon.length + view.gaps.length;

  return (
    <div style={ui.page} dir={dir}>
      <div style={sx.head}>
        <div>
          <h2 className="bpx-xl" style={ui.title}>{L("Overview", "نظرة عامة")}</h2>
          <p className="bpx-sm" style={ui.subtitle}>{L("The money in one glance, and what needs you today.", "الفلوس بنظرة وحدة، وشو بدّه منك اليوم.")}</p>
        </div>
        <Button onClick={load} disabled={loading}>{loading ? "…" : `↻ ${L("Refresh", "تحديث")}`}</Button>
      </div>

      <StatusMessage message={msg} />

      {loading ? (
        <div style={sx.empty}>{L("Loading…", "جاري التحميل…")}</div>
      ) : (
        <>
          <div style={sx.kpis}>
            <Kpi color="#2563eb" label={L("Monthly revenue (MRR)", "الإيراد الشهري")} value={moneyMap(view.mrr)}
              sub={L("active companies, at their own price", "الشركات الفعّالة، كل وحدة بسعرها")} />
            <Kpi color="#15803d" label={L("Collected this month", "المحصّل هالشهر")} value={moneyMap(view.kpi.collected)} />
            <Kpi color={view.kpi.overdueCount ? "#b91c1c" : "#b45309"} label={L("Outstanding", "غير محصّل")} value={moneyMap(view.kpi.outstanding)}
              sub={view.kpi.overdueCount ? `${view.kpi.overdueCount} ${L("overdue", "متأخرة")} · ${moneyMap(view.kpi.overdue)}` : L("nothing overdue", "ولا فاتورة متأخرة")} />
            <Kpi color={view.expired.length ? "#b91c1c" : "#0f766e"} label={L(`Ending within ${SOON_DAYS} days`, `بتخلص خلال ${SOON_DAYS} يوم`)} value={String(view.soon.length)}
              sub={view.expired.length ? `${view.expired.length} ${L("already expired", "منتهية فعلاً")}` : L("none expired", "ولا وحدة منتهية")} />
          </div>

          <section style={ui.card}>
            <h3 className="bpx-lg" style={sx.title}>
              {L("Needs you", "بدها تصرّف")} <span style={sx.count(actions)}>{actions}</span>
            </h3>

            {actions === 0 && <div style={sx.ok}>✓ {L("Nothing to chase — every company is paid up and in date.", "ما في شي — كل الشركات دافعة وضمن المدة.")}</div>}

            {view.overdueInv.map((i) => (
              <Row key={`i${i.id}`} tone="red" onOpen={onGo && (() => onGo("invoices"))} openLabel={L("Invoices", "الفواتير")}
                title={`${i.company_name || "—"} · ${i.invoice_number}`}
                sub={`${L("Invoice overdue", "فاتورة متأخرة")} ${i.late} ${L("days", "يوم")} · ${fmtMoney(i.amount, i.currency)}`} />
            ))}
            {view.expired.map((c) => (
              <Row key={`e${c.id}`} tone="red" onOpen={onGo && (() => onGo("companies"))} openLabel={L("Companies", "الشركات")}
                title={c.name}
                sub={c.days !== null
                  ? `${L("Subscription ended", "الاشتراك خلص من")} ${-c.days} ${L("days ago", "يوم")} · ${c.end_date}`
                  : L("Marked expired", "معلّمة منتهية")} />
            ))}
            {view.soon.map((c) => (
              <Row key={`s${c.id}`} tone="amber" onOpen={onGo && (() => onGo("companies"))} openLabel={L("Companies", "الشركات")}
                title={c.name}
                sub={`${L("Ends in", "بتخلص بعد")} ${c.days} ${L("days", "يوم")} · ${c.end_date}`} />
            ))}
            {view.gaps.map(({ c, missing }) => (
              <Row key={`g${c.id}`} tone="grey" onOpen={onGo && (() => onGo("companies"))} openLabel={L("Companies", "الشركات")}
                title={c.name}
                sub={`${L("Missing", "ناقصها")}: ${missing.join(" · ")}`} />
            ))}
          </section>
        </>
      )}
    </div>
  );
}

function Kpi({ label, value, sub, color }) {
  return (
    <div style={{ ...ui.card, marginBottom: 0, borderTop: `4px solid ${color}` }}>
      <div className="bpx-xs" style={sx.kpiLabel}>{label}</div>
      <div className="bpx-lg" style={{ fontWeight: 1000, color, marginTop: 4 }}>{value}</div>
      {sub && <div className="bpx-xs" style={sx.muted}>{sub}</div>}
    </div>
  );
}

const TONES = {
  red:   { bg: "#fef2f2", fg: "#991b1b", bd: "#fecaca" },
  amber: { bg: "#fffbeb", fg: "#92400e", bd: "#fde68a" },
  grey:  { bg: "#f8fafc", fg: "#334155", bd: "#e2e8f0" },
};

function Row({ title, sub, tone, onOpen, openLabel }) {
  const c = TONES[tone] || TONES.grey;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 14px", marginBottom: 8, borderRadius: 10, background: c.bg, border: `1px solid ${c.bd}`, color: c.fg }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 950, color: "#0f172a" }}>{title}</div>
        <div className="bpx-sm" style={{ fontWeight: 800 }}>{sub}</div>
      </div>
      {onOpen && <Button onClick={onOpen} style={{ minHeight: 36 }}>{openLabel} →</Button>}
    </div>
  );
}

const sx = {
  head: { display: "flex", justifyContent: "space-between", alignItems: "flex-end", gap: 12, flexWrap: "wrap", marginBottom: 16 },
  empty: { ...ui.card, textAlign: "center", color: "#64748b", fontWeight: 850 },
  kpis: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 12, marginBottom: 16 },
  kpiLabel: { color: "#475569", fontWeight: 900 },
  muted: { color: "#475569", fontWeight: 750, marginTop: 2 },
  title: { margin: "0 0 14px", color: "#0f172a", fontWeight: 1000, display: "flex", alignItems: "center", gap: 10 },
  count: (n) => ({ minWidth: 30, textAlign: "center", padding: "0 10px", borderRadius: 999, background: n ? "#fee2e2" : "#dcfce7", color: n ? "#991b1b" : "#166534" }),
  ok: { padding: 14, borderRadius: 10, background: "#f0fdf4", color: "#166534", fontWeight: 850 },
};
