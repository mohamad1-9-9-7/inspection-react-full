import React, { useState } from "react";
import { FiBarChart2, FiBriefcase, FiCreditCard, FiFileText, FiLayers } from "react-icons/fi";
import SubscriptionTab from "../admin/SubscriptionTab";
import BillingOverviewTab from "./BillingOverviewTab";
import CompaniesTab from "./CompaniesTab";
import PlansTab from "./PlansTab";
import QuotationsTab from "./quotations/QuotationsTab";
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
    id: "subscription",
    Icon: FiCreditCard,
    en: "Subscription",
    ar: "الاشتراك",
    render: () => <SubscriptionTab />,
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
#root .bpx.bpx, #root .bpx.bpx *{ font-size: 18px !important; }
#root .bpx.bpx{ font-weight: 700; line-height: 1.55; }
#root .bpx.bpx .bpx-xxl, #root .bpx.bpx .bpx-xxl *{ font-size: 34px !important; }
#root .bpx.bpx .bpx-xl,  #root .bpx.bpx .bpx-xl *{ font-size: 28px !important; }
#root .bpx.bpx .bpx-lg,  #root .bpx.bpx .bpx-lg *{ font-size: 22px !important; }
#root .bpx.bpx .bpx-sm,  #root .bpx.bpx .bpx-sm *{ font-size: 15px !important; }
#root .bpx.bpx .bpx-xs,  #root .bpx.bpx .bpx-xs *{ font-size: 13px !important; }
#root .bpx.bpx input, #root .bpx.bpx select, #root .bpx.bpx textarea{ font-weight: 700; }
#root .bpx.bpx input:focus, #root .bpx.bpx select:focus, #root .bpx.bpx textarea:focus{
  outline: none; border-color: #0d9488 !important; box-shadow: 0 0 0 4px rgba(13,148,136,.16) !important;
}
#root .bpx.bpx ::placeholder{ color:#94a3b8; font-weight: 600; }
#root .bpx.bpx button{ transition: transform .12s ease, box-shadow .12s ease, background .12s ease; }
#root .bpx.bpx button:not(:disabled):active{ transform: translateY(1px); }
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
        {current.render()}
      </div>
    </div>
  );
}

const styles = {
  fullShell: {
    minHeight: "calc(100vh - 90px)",
    background: "rgba(255,255,255,0.72)",
    border: "1px solid rgba(15,23,42,0.08)",
    borderRadius: 18,
    padding: "16px clamp(12px, 1.6vw, 26px) 26px",
    boxShadow: "0 30px 80px rgba(15,23,42,0.08)",
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
