import React, { useEffect, useMemo, useState } from "react";
import API_BASE from "../../config/api";
import { Button, PageHeader, StatusMessage, ui } from "./_shared/SettingsUIKit";
import { useSettingsLang, LangToggle } from "./_shared/settingsI18n";

const money = (amount, currency = "AED") => {
  const n = Number(amount || 0);
  return `${n.toLocaleString(undefined, { maximumFractionDigits: 2 })} ${currency || "AED"}`;
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

/* What a company is really in today — the login lock's rule: a stored
   active/trial whose end date has passed counts as expired. */
function statusOf(c) {
  const s = statusOf(c);
  if (s === "expired" || s === "suspended") return s;
  const d = daysLeft(c.end_date);
  return d !== null && d < 0 ? "expired" : s;
}

/* A company's monthly price: its own custom price, else its plan's. */
const priceOf = (c) => Number(c.price ?? c.plan_price ?? 0);

export default function BillingOverviewTab() {
  const { t, dir, lang, toggle: toggleLang } = useSettingsLang();
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState(null);
  const [data, setData] = useState({ plans: [], companies: [], invoices: [] });

  async function load() {
    setLoading(true);
    setMsg(null);
    try {
      const [plansRes, companiesRes, invoicesRes] = await Promise.all([
        fetch(`${API_BASE}/api/plans`).then((r) => r.json()).catch(() => ({})),
        fetch(`${API_BASE}/api/companies`).then((r) => r.json()).catch(() => ({})),
        fetch(`${API_BASE}/api/invoices`).then((r) => r.json()).catch(() => ({})),
      ]);
      setData({
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
    const activeCompanies = data.companies.filter((c) => statusOf(c) === "active");
    const trialCompanies = data.companies.filter((c) => statusOf(c) === "trial");
    const expiredCompanies = data.companies.filter((c) => statusOf(c) === "expired");
    const suspendedCompanies = data.companies.filter((c) => statusOf(c) === "suspended");
    const expiringSoon = data.companies
      .map((c) => ({ ...c, days: daysLeft(c.end_date) }))
      .filter((c) => c.days !== null && c.days >= 0 && c.days <= 14)
      .sort((a, b) => a.days - b.days);
    const overdue = data.companies
      .map((c) => ({ ...c, days: daysLeft(c.end_date) }))
      .filter((c) => c.days !== null && c.days < 0)
      .sort((a, b) => a.days - b.days);
    const mrr = activeCompanies.reduce((sum, c) => sum + priceOf(c), 0);
    const invoiceTotal = data.invoices.reduce((sum, inv) => sum + Number(inv.amount || 0), 0);
    const currency =
      activeCompanies.find((c) => c.plan_currency)?.plan_currency ||
      data.plans.find((p) => p.currency)?.currency ||
      "AED";

    const planUsage = data.plans.map((plan) => {
      const used = data.companies.filter((c) => String(c.plan_name || "").toLowerCase() === String(plan.name || "").toLowerCase());
      return {
        ...plan,
        companies: used.length,
        activeCompanies: used.filter((c) => statusOf(c) === "active").length,
        revenue: used.filter((c) => statusOf(c) === "active").reduce((sum, c) => sum + (c.price != null || c.plan_price != null ? priceOf(c) : Number(plan.price || 0)), 0),
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
        eyebrow={t("boEyebrow")}
        title={t("boTitle")}
        subtitle={t("boSubtitle")}
        actions={
          <>
            <LangToggle lang={lang} toggle={toggleLang} style={{ background:"#0b1220", border:"1px solid #1e293b" }} />
            <Button onClick={load} disabled={loading} tone="secondary">{loading ? t("loadingDots") : t("refresh")}</Button>
          </>
        }
      />

      <StatusMessage message={msg} />

      {loading ? (
        <div style={sx.empty}>{t("loadingData")}</div>
      ) : (
        <>
          <div style={sx.kpiGrid}>
            <Kpi label={t("boActiveCompanies")} value={stats.activeCompanies.length} sub={`${stats.trialCompanies.length} ${t("boTrialSuffix")}`} color="#0f766e" />
            <Kpi label={t("boMrr")} value={money(stats.mrr, stats.currency)} sub={t("boMrrSub")} color="#2563eb" />
            <Kpi label={t("boRenewalRisk")} value={stats.expiringSoon.length + stats.overdue.length} sub={`${stats.overdue.length} ${t("boOverdueSuffix")}`} color="#b91c1c" />
            <Kpi label={t("boInvoicesIssued")} value={data.invoices.length} sub={money(stats.invoiceTotal, stats.currency)} color="#7c3aed" />
          </div>

          <div style={sx.grid2}>
            <section style={ui.card}>
              <h3 style={sx.title}>{t("boPlanUtil")}</h3>
              {stats.planUsage.length === 0 ? <div style={sx.muted}>{t("boNoPlansYet")}</div> : stats.planUsage.map((plan) => (
                <div key={plan.id || plan.name} style={sx.planRow}>
                  <div>
                    <div style={sx.rowTitle}>{plan.name}</div>
                    <div style={sx.muted}>{plan.activeCompanies} {t("boActiveTotal")} {plan.companies} {t("boTotalCompanies")}</div>
                  </div>
                  <div style={sx.rowMoney}>{money(plan.revenue, plan.currency || stats.currency)}</div>
                </div>
              ))}
            </section>

            <section style={ui.card}>
              <h3 style={sx.title}>{t("boRenewalWatch")}</h3>
              {[...stats.overdue, ...stats.expiringSoon].slice(0, 8).map((c) => (
                <div key={c.id || c.name} style={sx.watchRow(c.days < 0)}>
                  <div>
                    <div style={sx.rowTitle}>{c.name}</div>
                    <div style={sx.muted}>{c.plan_name || t("boNoPlan")} · {c.end_date?.slice(0, 10) || t("boNoEndDate")}</div>
                  </div>
                  <strong>{c.days < 0 ? `${Math.abs(c.days)}${t("boDOverdue")}` : `${c.days}${t("boDLeft")}`}</strong>
                </div>
              ))}
              {stats.overdue.length + stats.expiringSoon.length === 0 && (
                <div style={sx.okBox}>{t("boNoRenewals")}</div>
              )}
            </section>
          </div>

          <section style={ui.card}>
            <h3 style={sx.title}>{t("boDataGaps")}</h3>
            <div style={sx.gapGrid}>
              <Gap label={t("boGapNoPlan")} value={data.companies.filter((c) => !c.plan_name && !c.plan_id).length} />
              <Gap label={t("boGapNoEmail")} value={data.companies.filter((c) => !c.contact_email).length} />
              <Gap label={t("boGapNoEnd")} value={data.companies.filter((c) => !c.end_date).length} />
              <Gap label={t("boGapInactive")} value={data.plans.filter((p) => !p.is_active).length} />
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
