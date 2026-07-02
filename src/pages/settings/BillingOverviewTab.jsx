import React, { useEffect, useMemo, useState } from "react";
import API_BASE from "../../config/api";
import { Button, PageHeader, StatusMessage, ui } from "./_shared/SettingsUIKit";
import { useSettingsLang, LangToggle } from "./_shared/settingsI18n";

const money = (amount, currency = "USD") => {
  const n = Number(amount || 0);
  return `${n.toLocaleString(undefined, { maximumFractionDigits: 2 })} ${currency || "USD"}`;
};

function daysLeft(date) {
  if (!date) return null;
  const end = new Date(date);
  if (Number.isNaN(end.getTime())) return null;
  end.setHours(0, 0, 0, 0);
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  return Math.ceil((end - now) / 86400000);
}

function normalizeStatus(status) {
  return String(status || "active").toLowerCase();
}

export default function BillingOverviewTab() {
  const { dir, lang, toggle: toggleLang } = useSettingsLang();
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState(null);
  const [data, setData] = useState({ subscription: null, plans: [], companies: [], invoices: [] });

  async function load() {
    setLoading(true);
    setMsg(null);
    try {
      const [subRes, plansRes, companiesRes, invoicesRes] = await Promise.all([
        fetch(`${API_BASE}/api/subscription`).then((r) => r.json()).catch(() => ({})),
        fetch(`${API_BASE}/api/plans`).then((r) => r.json()).catch(() => ({})),
        fetch(`${API_BASE}/api/companies`).then((r) => r.json()).catch(() => ({})),
        fetch(`${API_BASE}/api/invoices`).then((r) => r.json()).catch(() => ({})),
      ]);
      setData({
        subscription: subRes.ok ? subRes.subscription : null,
        plans: plansRes.ok && Array.isArray(plansRes.plans) ? plansRes.plans : [],
        companies: companiesRes.ok && Array.isArray(companiesRes.companies) ? companiesRes.companies : [],
        invoices: invoicesRes.ok && Array.isArray(invoicesRes.invoices) ? invoicesRes.invoices : [],
      });
    } catch (err) {
      setMsg({ kind: "err", text: err?.message || "Failed to load billing overview" });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  const stats = useMemo(() => {
    const activeCompanies = data.companies.filter((c) => normalizeStatus(c.status) === "active");
    const trialCompanies = data.companies.filter((c) => normalizeStatus(c.status) === "trial");
    const expiredCompanies = data.companies.filter((c) => normalizeStatus(c.status) === "expired");
    const suspendedCompanies = data.companies.filter((c) => normalizeStatus(c.status) === "suspended");
    const expiringSoon = data.companies
      .map((c) => ({ ...c, days: daysLeft(c.end_date) }))
      .filter((c) => c.days !== null && c.days >= 0 && c.days <= 14)
      .sort((a, b) => a.days - b.days);
    const overdue = data.companies
      .map((c) => ({ ...c, days: daysLeft(c.end_date) }))
      .filter((c) => c.days !== null && c.days < 0)
      .sort((a, b) => a.days - b.days);
    const mrr = activeCompanies.reduce((sum, c) => sum + Number(c.plan_price || 0), 0);
    const invoiceTotal = data.invoices.reduce((sum, inv) => sum + Number(inv.amount || 0), 0);
    const currency =
      activeCompanies.find((c) => c.plan_currency)?.plan_currency ||
      data.subscription?.currency ||
      data.plans.find((p) => p.currency)?.currency ||
      "USD";

    const planUsage = data.plans.map((plan) => {
      const used = data.companies.filter((c) => String(c.plan_name || "").toLowerCase() === String(plan.name || "").toLowerCase());
      return {
        ...plan,
        companies: used.length,
        activeCompanies: used.filter((c) => normalizeStatus(c.status) === "active").length,
        revenue: used.filter((c) => normalizeStatus(c.status) === "active").reduce((sum, c) => sum + Number(c.plan_price || plan.price || 0), 0),
      };
    }).sort((a, b) => b.companies - a.companies);

    return {
      activeCompanies,
      trialCompanies,
      expiredCompanies,
      suspendedCompanies,
      expiringSoon,
      overdue,
      mrr,
      invoiceTotal,
      currency,
      planUsage,
    };
  }, [data]);

  return (
    <div style={ui.page} dir={dir}>
      <PageHeader
        eyebrow="Billing Command Center"
        title={lang === "ar" ? "لوحة الفوترة والاشتراكات" : "Billing & Subscription Overview"}
        subtitle={lang === "ar"
          ? "ملخص تنفيذي للخطط، الشركات، الاشتراك، الفواتير، والتنبيهات القريبة."
          : "Executive view for plans, companies, subscription health, invoices, and renewal risk."}
        actions={
          <>
            <LangToggle lang={lang} toggle={toggleLang} style={{ background:"#0b1220", border:"1px solid #1e293b" }} />
            <Button onClick={load} disabled={loading} tone="secondary">{loading ? "Loading..." : "Refresh"}</Button>
          </>
        }
      />

      <StatusMessage message={msg} />

      {loading ? (
        <div style={sx.empty}>Loading billing data...</div>
      ) : (
        <>
          <div style={sx.kpiGrid}>
            <Kpi label="Active companies" value={stats.activeCompanies.length} sub={`${stats.trialCompanies.length} trial`} color="#0f766e" />
            <Kpi label="MRR estimate" value={money(stats.mrr, stats.currency)} sub="from active assigned plans" color="#2563eb" />
            <Kpi label="Renewal risk" value={stats.expiringSoon.length + stats.overdue.length} sub={`${stats.overdue.length} overdue`} color="#b91c1c" />
            <Kpi label="Invoices issued" value={data.invoices.length} sub={money(stats.invoiceTotal, stats.currency)} color="#7c3aed" />
          </div>

          <div style={sx.grid2}>
            <section style={ui.card}>
              <h3 style={sx.title}>Plan utilization</h3>
              {stats.planUsage.length === 0 ? <div style={sx.muted}>No plans yet.</div> : stats.planUsage.map((plan) => (
                <div key={plan.id || plan.name} style={sx.planRow}>
                  <div>
                    <div style={sx.rowTitle}>{plan.name}</div>
                    <div style={sx.muted}>{plan.activeCompanies} active / {plan.companies} total companies</div>
                  </div>
                  <div style={sx.rowMoney}>{money(plan.revenue, plan.currency || stats.currency)}</div>
                </div>
              ))}
            </section>

            <section style={ui.card}>
              <h3 style={sx.title}>Renewal watch</h3>
              {[...stats.overdue, ...stats.expiringSoon].slice(0, 8).map((c) => (
                <div key={c.id || c.name} style={sx.watchRow(c.days < 0)}>
                  <div>
                    <div style={sx.rowTitle}>{c.name}</div>
                    <div style={sx.muted}>{c.plan_name || "No plan"} · {c.end_date?.slice(0, 10) || "No end date"}</div>
                  </div>
                  <strong>{c.days < 0 ? `${Math.abs(c.days)}d overdue` : `${c.days}d left`}</strong>
                </div>
              ))}
              {stats.overdue.length + stats.expiringSoon.length === 0 && (
                <div style={sx.okBox}>No renewals due in the next 14 days.</div>
              )}
            </section>
          </div>

          <section style={ui.card}>
            <h3 style={sx.title}>Billing data gaps</h3>
            <div style={sx.gapGrid}>
              <Gap label="Companies without a plan" value={data.companies.filter((c) => !c.plan_name && !c.plan_id).length} />
              <Gap label="Companies without contact email" value={data.companies.filter((c) => !c.contact_email).length} />
              <Gap label="Companies without end date" value={data.companies.filter((c) => !c.end_date).length} />
              <Gap label="Inactive plans" value={data.plans.filter((p) => !p.is_active).length} />
            </div>
          </section>
        </>
      )}
    </div>
  );
}

function Kpi({ label, value, sub, color }) {
  return (
    <div style={{ ...ui.card, marginBottom: 0, borderTop: `4px solid ${color}` }}>
      <div style={sx.kpiLabel}>{label}</div>
      <div style={{ ...sx.kpiValue, color }}>{value}</div>
      <div style={sx.muted}>{sub}</div>
    </div>
  );
}

function Gap({ label, value }) {
  const bad = Number(value) > 0;
  return (
    <div style={sx.gap(bad)}>
      <strong>{value}</strong>
      <span>{label}</span>
    </div>
  );
}

const sx = {
  empty: { ...ui.card, textAlign: "center", color: "#64748b", fontWeight: 850 },
  kpiGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))", gap: 12, marginBottom: 16 },
  grid2: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 16 },
  title: { margin: "0 0 14px", color: "#0f172a", fontSize: 18, fontWeight: 1000 },
  kpiLabel: { color: "#64748b", fontSize: 12, fontWeight: 1000, textTransform: "uppercase", letterSpacing: "0.05em" },
  kpiValue: { marginTop: 6, fontSize: 28, fontWeight: 1000 },
  muted: { color: "#64748b", fontSize: 13, fontWeight: 750 },
  planRow: { display: "flex", justifyContent: "space-between", gap: 12, padding: "11px 0", borderBottom: "1px solid #e2e8f0" },
  watchRow: (danger) => ({
    display: "flex",
    justifyContent: "space-between",
    gap: 12,
    padding: "11px 12px",
    borderRadius: 8,
    background: danger ? "#fef2f2" : "#fffbeb",
    color: danger ? "#991b1b" : "#92400e",
    marginBottom: 8,
  }),
  rowTitle: { color: "#0f172a", fontWeight: 950 },
  rowMoney: { color: "#0f766e", fontWeight: 1000 },
  okBox: { padding: 14, borderRadius: 8, background: "#f0fdf4", color: "#166534", fontWeight: 850 },
  gapGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 10 },
  gap: (bad) => ({
    display: "flex",
    flexDirection: "column",
    gap: 4,
    padding: 14,
    borderRadius: 8,
    background: bad ? "#fef2f2" : "#f0fdf4",
    color: bad ? "#991b1b" : "#166534",
    border: `1px solid ${bad ? "#fecaca" : "#bbf7d0"}`,
  }),
};
