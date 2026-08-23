// src/pages/monitor/branches/pos6/POS6Hub.jsx
// POS 6 daily inputs — same sidebar screen as Production, five forms.
// Every sheet is written in the same Production style and saves to the server.

import React, { lazy, useState } from "react";
import BranchSidebarHub from "../_shared/BranchSidebarHub";
import { useLang } from "./pos6I18n";

const PersonalHygieneInput   = lazy(() => import("./POS6PersonalHygieneInput"));
const CleaningChecklistInput = lazy(() => import("./POS6CleaningChecklistInput"));
const ReceivingLogInput      = lazy(() => import("./POS6ReceivingLogInput"));
const CoolersInput           = lazy(() => import("./POS6CoolersTemperatureInput"));
const EquipmentInspection    = lazy(() => import("./POS6EquipmentInspectionInput"));

/* ===== Icons (same stroke set as the Production hub) ===== */
const Icon = ({ children, size = 20 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    {children}
  </svg>
);
const IconStore     = (p) => <Icon {...p}><path d="M3 9l1.5-5h15L21 9" /><path d="M4 9v11h16V9" /><path d="M9 20v-6h6v6" /></Icon>;
const IconHygiene   = (p) => <Icon {...p}><circle cx="12" cy="7" r="4" /><path d="M5 22v-2a7 7 0 0 1 14 0v2" /><path d="M12 11v2" /></Icon>;
const IconCleaning  = (p) => <Icon {...p}><path d="M3 21h18" /><rect x="7" y="13" width="10" height="8" rx="1" /><path d="M12 13V3" /><path d="M9 6h6" /></Icon>;
const IconEquipment = (p) => <Icon {...p}><path d="M9 3h6l1 4 3 2v6l-3 2-1 4H9l-1-4-3-2V9l3-2z" /><circle cx="12" cy="12" r="3" /></Icon>;
const IconReceiving = (p) => <Icon {...p}><path d="M12 3v12" /><path d="M7 10l5 5 5-5" /><path d="M4 19h16" /></Icon>;
const IconCooler    = (p) => <Icon {...p}><rect x="5" y="2" width="14" height="20" rx="2" /><path d="M5 11h14" /><path d="M9 6v2" /><path d="M9 15v2" /></Icon>;

const TAB_DEFS = [
  { key: "personal",  titleKey: "tab_hygiene",   subKey: "tab_hygiene_sub",   Icon: IconHygiene,   accent: "#0ea5e9", render: () => <PersonalHygieneInput /> },
  { key: "cleaning",  titleKey: "tab_cleaning",  subKey: "tab_cleaning_sub",  Icon: IconCleaning,  accent: "#22c55e", render: () => <CleaningChecklistInput /> },
  { key: "equipment", titleKey: "tab_equipment", subKey: "tab_equipment_sub", Icon: IconEquipment, accent: "#f59e0b", render: () => <EquipmentInspection /> },
  { key: "receiving", titleKey: "tab_receiving", subKey: "tab_receiving_sub", Icon: IconReceiving, accent: "#f97316", render: () => <ReceivingLogInput /> },
  { key: "coolers",   titleKey: "tab_coolers",   subKey: "tab_coolers_sub",   Icon: IconCooler,    accent: "#0284c7", render: () => <CoolersInput /> },
];

export default function POS6Hub() {
  const { t, lang, toggle, dir, isAr } = useLang();
  const [active, setActive] = useState(TAB_DEFS[0].key);

  const today = new Date().toLocaleDateString(isAr ? "ar-AE" : "en-GB", {
    weekday: "long", day: "2-digit", month: "short", year: "numeric",
  });

  const tabs = TAB_DEFS.map((tab) => ({
    ...tab,
    title: t(tab.titleKey),
    subtitle: t(tab.subKey),
  }));

  return (
    <BranchSidebarHub
      brandTitle={t("hub_title")}
      brandSubtitle={t("hub_subtitle")}
      BrandIcon={IconStore}
      todayText={today}
      breadcrumb={[t("breadcrumb_branch"), t("breadcrumb_inputs")]}
      tabs={tabs}
      activeKey={active}
      onSelect={setActive}
      labels={{
        forms: t("nav_forms"),
        footer: t("sidebar_footer"),
        footerSub: t("sidebar_footer_sub"),
        langToggle: t("lang_toggle"),
        loading: t("status_loading"),
      }}
      dir={dir}
      isAr={isAr}
      onToggleLang={toggle}
      contentKey={lang}
    />
  );
}
