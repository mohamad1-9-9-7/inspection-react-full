import React, { useState } from "react";
import { FiAward, FiBarChart2, FiBriefcase, FiCreditCard, FiFileText, FiLayers } from "react-icons/fi";
import InvoicesTab from "./invoices/InvoicesTab";
import BillingOverviewTab from "./BillingOverviewTab";
import CompaniesTab from "./CompaniesTab";
import PlansTab from "./PlansTab";
import QuotationsTab from "./quotations/QuotationsTab";
import SellerProfileTab from "./SellerProfileTab";
import { useSettingsLang } from "./_shared/settingsI18n";
import { ui } from "./_shared/SettingsUIKit";

const TABS = [
  {
    id: "overview",
    Icon: FiBarChart2,
    en: "Overview",
    ar: "نظرة عامة",
    render: () => <BillingOverviewTab />,
  },
  {
    id: "plans",
    Icon: FiLayers,
    en: "Plans",
    ar: "الخطط",
    render: () => <PlansTab />,
  },
  {
    id: "companies",
    Icon: FiBriefcase,
    en: "Companies",
    ar: "الشركات",
    render: () => <CompaniesTab />,
  },
  {
    id: "quotations",
    Icon: FiFileText,
    en: "Quotations",
    ar: "عروض الأسعار",
    render: () => <QuotationsTab />,
  },
  {
    id: "invoices",
    Icon: FiCreditCard,
    en: "Invoices",
    ar: "الفواتير",
    render: (go) => <InvoicesTab onOpenProfile={() => go("seller")} />,
  },
  {
    id: "seller",
    Icon: FiAward,
    en: "INSPECT PRO profile",
    ar: "هوية INSPECT PRO",
    render: () => <SellerProfileTab />,
  },
];

const TAB_KEY = "billing_plans_tab";

/* Base text for the whole card: 18px bold. `#root .bpx.bpx` out-ranks the
   project-wide `#root * { font-size:14px !important }` guard (and its 12px
   table rule); `bpx-*` helpers size headings / captions on top of it.
   font-weight is NOT !important so inline weights (900/1000) still win.
   globals.css sets overflow-x:hidden on html/body/#root, which turns them into
   scroll containers and silently breaks position:sticky — `clip` keeps the
   no-horizontal-scroll behaviour without that side effect. */
export const BILLING_CSS = `
html:has(.bpx.bpx), html:has(.bpx.bpx) body, html:has(.bpx.bpx) #root{ overflow-x: clip !important; }
#root .settings-new-page .settings-full-title{ font-size: 24px !important; }
#root .bpx.bpx, #root .bpx.bpx *{ font-size: 19px !important; }
#root .bpx.bpx{ font-weight: 700; line-height: 1.6; color: #0f172a; -webkit-font-smoothing: antialiased; text-rendering: optimizeLegibility; }
#root .bpx.bpx [style*="color: rgb(148, 163, 184)"]{ color: #475569 !important; }
#root .bpx.bpx [style*="color: rgb(100, 116, 139)"]{ color: #334155 !important; }
#root .bpx.bpx .bpx-xxl, #root .bpx.bpx .bpx-xxl *{ font-size: 34px !important; }
#root .bpx.bpx .bpx-xl,  #root .bpx.bpx .bpx-xl *{ font-size: 28px !important; }
#root .bpx.bpx .bpx-lg,  #root .bpx.bpx .bpx-lg *{ font-size: 22px !important; }
#root .bpx.bpx .bpx-sm,  #root .bpx.bpx .bpx-sm *{ font-size: 17px !important; }
#root .bpx.bpx .bpx-xs,  #root .bpx.bpx .bpx-xs *{ font-size: 15px !important; }
#root .bpx.bpx input, #root .bpx.bpx select, #root .bpx.bpx textarea{ font-weight: 700; }
#root .bpx.bpx input:focus, #root .bpx.bpx select:focus, #root .bpx.bpx textarea:focus{
  outline: none; border-color: #0d9488 !important; box-shadow: 0 0 0 4px rgba(13,148,136,.16) !important;
}
#root .bpx.bpx ::placeholder{ color:#64748b; font-weight: 600; }
#root .bpx.bpx button{ transition: transform .12s ease, box-shadow .12s ease, background .12s ease; }
#root .bpx.bpx button:not(:disabled):active{ transform: translateY(1px); }
/* card lists tile across the whole width instead of one stacked column */
#root .bpx.bpx .bpx-cards{ display: grid !important; grid-template-columns: repeat(auto-fill, minmax(min(100%, 520px), 1fr)); gap: 14px !important; }
#root .bpx.bpx .bpx-cards > *{ margin-bottom: 0 !important; min-width: 0; }
@keyframes bpxIn { from { opacity: 0; } to { opacity: 1; } }
#root .bpx.bpx .bpx-in{ animation: bpxIn .28s ease both; }
`;

export default function BillingPlansTab({ fullScreen = false }) {
  const { dir, lang } = useSettingsLang();
  const [active, setActiveState] = useState(() => {
    try { return sessionStorage.getItem(TAB_KEY) || "overview"; } catch { return "overview"; }
  });
  const setActive = (id) => {
    setActiveState(id);
    try { sessionStorage.setItem(TAB_KEY, id); } catch { /* ignore */ }
  };
  const current = TABS.find((tab) => tab.id === active) || TABS[0];

  /* SettingsPage already hides this tool from everyone but the platform
     owner; this is the second lock, for any future place that mounts it. */
  const isSuperAdmin = (() => {
    try { return !!JSON.parse(localStorage.getItem("currentUser") || "{}").isSuperAdmin; }
    catch { return false; }
  })();
  if (!isSuperAdmin) {
    return (
      <div className="bpx bpx" style={ui.page} dir={dir}>
        <div style={{ ...ui.card, textAlign: "center", color: "#475569", fontWeight: 850 }}>
          {lang === "ar"
            ? "هذه الصفحة خاصة بمالك المنصّة (INSPECT PRO)."
            : "This page belongs to the platform owner (INSPECT PRO)."}
        </div>
      </div>
    );
  }

  return (
    <div className="bpx bpx" style={{ ...ui.page, ...(fullScreen ? styles.fullShell : null) }} dir={dir}>
      <style>{BILLING_CSS}</style>
      <div style={styles.tabBar} role="tablist" aria-label={lang === "ar" ? "الاشتراكات والخطط" : "Billing and plans"}>
        {TABS.map(({ id, Icon, en, ar }) => {
          const selected = id === active;
          return (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={selected}
              onClick={() => setActive(id)}
              style={styles.tab(selected)}
            >
              <Icon size={20} />
              <span>{lang === "ar" ? ar : en}</span>
            </button>
          );
        })}
      </div>

      <div style={styles.panel} role="tabpanel" className="bpx-in" key={current.id}>
        {current.render(setActive)}
      </div>
    </div>
  );
}

const styles = {
  fullShell: {
    width: "100%",
    boxSizing: "border-box",
    minHeight: "calc(100vh - 76px)",
    background: "rgba(255,255,255,0.78)",
    border: "1px solid rgba(15,23,42,0.08)",
    borderRadius: 14,
    padding: "12px clamp(10px, 1.2vw, 22px) 22px",
    boxShadow: "0 20px 60px rgba(15,23,42,0.07)",
    /* no transform / filter / backdrop-filter here: any of them would trap the
       tabs' position:fixed modals inside this box instead of the viewport. */
  },
  tabBar: {
    display: "flex",
    alignItems: "center",
    gap: 6,
    flexWrap: "wrap",
    padding: 6,
    marginBottom: 20,
    background: "linear-gradient(135deg, #0f172a, #134e4a)",
    borderRadius: 14,
    boxShadow: "0 14px 30px rgba(15,23,42,0.18)",
  },
  tab: (selected) => ({
    minHeight: 50,
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    flex: "1 1 auto",
    padding: "10px 20px",
    borderRadius: 10,
    border: "none",
    background: selected ? "#ffffff" : "transparent",
    color: selected ? "#0f766e" : "rgba(255,255,255,0.82)",
    boxShadow: selected ? "0 8px 18px rgba(0,0,0,0.18)" : "none",
    fontWeight: 900,
    fontFamily: "inherit",
    cursor: "pointer",
  }),
  panel: {
    minWidth: 0,
  },
};
