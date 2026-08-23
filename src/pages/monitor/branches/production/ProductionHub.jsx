// src/pages/monitor/branches/production/ProductionHub.jsx
// Production inputs. The sidebar screen itself is BranchSidebarHub, shared
// with POS 6 and the POS 10/11/15/24/26 layouts — this file is now just the
// list of forms and their labels.

import React, { useState, lazy } from "react";
import BranchSidebarHub from "../_shared/BranchSidebarHub";
import { useLang } from "./_shared/i18n";

/* ===== Lazy Inputs ===== */
const PersonalHygienePRDInput    = lazy(() => import("./PersonalHygienePRDInput"));
const CleaningChecklistPRDInput  = lazy(() => import("./CleaningChecklistPRDInput"));
const PRDDefrostingRecordInput   = lazy(() => import("./PRDDefrostingRecordInput"));
const PRDTraceabilityLogInput    = lazy(() => import("./PRDTraceabilityLogInput"));
const OnlineCuttingRecordInput   = lazy(() => import("./OnlineCuttingRecordInput"));
const DriedMeatProcessInput      = lazy(() => import("./DriedMeatProcessInput"));
const PRDVegSanitationInput      = lazy(() => import("./PRDVegSanitationInput"));
const PRDSanitizerInput          = lazy(() => import("./PRDSanitizerConcentrationInput"));
const EquipmentInspectionInput  = lazy(() => import("../pos15/POS15EquipmentInspectionSanitizingLogInput"));

/* ===== Icons (modern stroke icons) ===== */
const Icon = ({ children, size = 20 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    {children}
  </svg>
);
const IconHygiene    = (p) => <Icon {...p}><circle cx="12" cy="7" r="4" /><path d="M5 22v-2a7 7 0 0 1 14 0v2" /><path d="M12 11v2" /></Icon>;
const IconCleaning   = (p) => <Icon {...p}><path d="M3 21h18" /><rect x="7" y="13" width="10" height="8" rx="1" /><path d="M12 13V3" /><path d="M9 6h6" /></Icon>;
const IconDefrost    = (p) => <Icon {...p}><path d="M12 2v20" /><path d="M4.2 4.2l15.6 15.6" /><path d="M19.8 4.2L4.2 19.8" /><circle cx="12" cy="12" r="2" /></Icon>;
const IconTrace      = (p) => <Icon {...p}><path d="M7 3h10l4 4v10l-4 4H7l-4-4V7z" /><path d="M12 8v8" /><path d="M8 12h8" /></Icon>;
const IconFactory    = (p) => <Icon {...p}><path d="M2 21V9l7 4V9l7 4V5l5 3v13z" /><path d="M7 17h2" /><path d="M12 17h2" /><path d="M17 17h2" /></Icon>;
const IconScissors   = (p) => <Icon {...p}><circle cx="6" cy="6" r="3" /><circle cx="6" cy="18" r="3" /><path d="M20 4L8.12 15.88" /><path d="M14.47 14.48L20 20" /><path d="M8.12 8.12L12 12" /></Icon>;
const IconDried      = (p) => <Icon {...p}><path d="M4 5a3 3 0 0 1 3-3h10a3 3 0 0 1 3 3v3a6 6 0 0 1-2 4.47V17a5 5 0 0 1-10 0v-4.53A6 6 0 0 1 4 8z" /><path d="M9 17v2" /><path d="M15 17v2" /></Icon>;
const IconLeaf       = (p) => <Icon {...p}><path d="M20 4C12 4 6 8 5 16c4 1 9 0 12-3s3-9 3-9Z" /><path d="M4 20c3-5 7-8 12-10" /></Icon>;
const IconDrop       = (p) => <Icon {...p}><path d="M12 2S5 10 5 15a7 7 0 0 0 14 0c0-5-7-13-7-13Z" /><path d="M9 16a3 3 0 0 0 3 2" /></Icon>;
const IconEquipment  = (p) => <Icon {...p}><path d="M9 3h6l1 4 3 2v6l-3 2-1 4H9l-1-4-3-2V9l3-2z" /><circle cx="12" cy="12" r="3" /></Icon>;

const TABS = [
  {
    key: "personal",
    titleKey: "tab_hygiene",
    subtitleKey: "tab_hygiene_sub",
    Icon: IconHygiene,
    accent: "#0ea5e9",
    Comp: PersonalHygienePRDInput,
  },
  {
    key: "cleaning",
    titleKey: "tab_cleaning",
    subtitleKey: "tab_cleaning_sub",
    Icon: IconCleaning,
    accent: "#22c55e",
    Comp: CleaningChecklistPRDInput,
  },
  {
    key: "defrost",
    titleKey: "tab_defrost",
    subtitleKey: "tab_defrost_sub",
    Icon: IconDefrost,
    accent: "#3b82f6",
    Comp: PRDDefrostingRecordInput,
  },
  {
    key: "traceability",
    titleKey: "tab_trace",
    subtitleKey: "tab_trace_sub",
    Icon: IconTrace,
    accent: "#a855f7",
    Comp: PRDTraceabilityLogInput,
  },
  {
    key: "cutting",
    titleKey: "tab_cutting",
    subtitleKey: "tab_cutting_sub",
    Icon: IconScissors,
    accent: "#e11d48",
    Comp: OnlineCuttingRecordInput,
  },
  {
    key: "dried",
    titleKey: "tab_dried",
    subtitleKey: "tab_dried_sub",
    Icon: IconDried,
    accent: "#b45309",
    Comp: DriedMeatProcessInput,
  },
  {
    key: "vegSanitation",
    titleKey: "tab_veg_sanitation",
    subtitleKey: "tab_veg_sanitation_sub",
    Icon: IconLeaf,
    accent: "#16a34a",
    Comp: PRDVegSanitationInput,
  },
  {
    key: "sanitizer",
    titleKey: "tab_sanitizer",
    subtitleKey: "tab_sanitizer_sub",
    Icon: IconDrop,
    accent: "#0891b2",
    Comp: PRDSanitizerInput,
  },
  {
    key: "equipment",
    titleKey: "tab_equipment",
    subtitleKey: "tab_equipment_sub",
    Icon: IconEquipment,
    accent: "#f59e0b",
    Comp: () => <EquipmentInspectionInput reportType="prod_equipment_inspection" branch="Production" reporter="production" />,
  },
];

export default function ProductionHub() {
  const { t, lang, toggle, dir, isAr } = useLang();
  const [active, setActive] = useState(TABS[0].key);

  const today = new Date().toLocaleDateString(isAr ? "ar-AE" : "en-GB", {
    weekday: "long", day: "2-digit", month: "short", year: "numeric",
  });

  const tabs = TABS.map((tab) => ({
    key: tab.key,
    title: t(tab.titleKey),
    subtitle: t(tab.subtitleKey),
    Icon: tab.Icon,
    accent: tab.accent,
    render: () => <tab.Comp />,
  }));

  return (
    <BranchSidebarHub
      brandTitle={t("hub_title")}
      brandSubtitle={t("hub_subtitle")}
      BrandIcon={IconFactory}
      todayText={today}
      breadcrumb={[t("breadcrumb_prod"), t("breadcrumb_inputs")]}
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
