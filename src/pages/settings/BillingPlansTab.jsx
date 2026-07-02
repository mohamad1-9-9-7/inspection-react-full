import React, { useState } from "react";
import { FiBarChart2, FiBriefcase, FiCreditCard, FiLayers } from "react-icons/fi";
import SubscriptionTab from "../admin/SubscriptionTab";
import BillingOverviewTab from "./BillingOverviewTab";
import CompaniesTab from "./CompaniesTab";
import PlansTab from "./PlansTab";
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
];

export default function BillingPlansTab() {
  const { dir, lang } = useSettingsLang();
  const [active, setActive] = useState("overview");
  const current = TABS.find((tab) => tab.id === active) || TABS[0];

  return (
    <div style={ui.page} dir={dir}>
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
              <Icon size={17} />
              <span>{lang === "ar" ? ar : en}</span>
            </button>
          );
        })}
      </div>

      <div style={styles.panel} role="tabpanel">
        {current.render()}
      </div>
    </div>
  );
}

const styles = {
  tabBar: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    flexWrap: "wrap",
    padding: 6,
    marginBottom: 18,
    background: "#f8fafc",
    border: "1px solid rgba(15,23,42,0.10)",
    borderRadius: 8,
  },
  tab: (selected) => ({
    minHeight: 42,
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    padding: "9px 14px",
    borderRadius: 8,
    border: `1px solid ${selected ? "#0f766e" : "transparent"}`,
    background: selected ? "#ffffff" : "transparent",
    color: selected ? "#0f766e" : "#475569",
    boxShadow: selected ? "0 8px 18px rgba(15,23,42,0.08)" : "none",
    fontWeight: 950,
    fontFamily: "inherit",
    cursor: "pointer",
  }),
  panel: {
    minWidth: 0,
  },
};
