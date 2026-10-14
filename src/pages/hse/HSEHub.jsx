// src/pages/hse/HSEHub.jsx
// /hse — the HSE card in the same full-screen sidebar hub the QCS card and
// every branch use (_shared/QcsSidebarHub): grouped sidebar with search,
// pins and a collapsible rail, and the chosen page open beside it.
//
// Each HSE page still has its own route (/hse/<page>) for old links and
// bookmarks; inside the hub the page drops its own back button, language
// toggle and full-page background (see EMBED_CSS) because the hub supplies them.

import React, { lazy, useMemo } from "react";
import { Navigate } from "react-router-dom";
import QcsSidebarHub, {
  Icon, IconShield, IconAlert, IconWrench, IconClipboard, IconTrash, IconBug,
  IconCleaning, IconFlask, IconHealth, IconChart, IconUserCheck,
} from "../monitor/branches/_shared/QcsSidebarHub";
import { useHSELang, HSELangToggle } from "./hseShared";
import { isItemAllowed } from "../../utils/sectionItems";

const HSECompanyProfile       = lazy(() => import("./HSECompanyProfile"));
const HSEPolicies             = lazy(() => import("./HSEPolicies"));
const HSESOPs                 = lazy(() => import("./HSESOPs"));
const HSERiskRegister         = lazy(() => import("./HSERiskRegister"));
const HSEIncidentReport       = lazy(() => import("./HSEIncidentReport"));
const HSENCR                  = lazy(() => import("./HSENCR"));
const HSEWorkPermit           = lazy(() => import("./HSEWorkPermit"));
const HSECleaningLog          = lazy(() => import("./HSECleaningLog"));
const HSESwabsLog             = lazy(() => import("./HSESwabsLog"));
const HSEPestControl          = lazy(() => import("./HSEPestControl"));
const HSEEquipmentMaintenance = lazy(() => import("./HSEEquipmentMaintenance"));
const HSEEvacuationDrills     = lazy(() => import("./HSEEvacuationDrills"));
const HSEPPELog               = lazy(() => import("./HSEPPELog"));
const HSEWasteLog             = lazy(() => import("./HSEWasteLog"));
const HSECAPATracker          = lazy(() => import("./HSECAPATracker"));
const HSEWelfare              = lazy(() => import("./HSEWelfare"));
const HSEFireEquipment        = lazy(() => import("./HSEFireEquipment"));
const HSEEmergencyContacts    = lazy(() => import("./HSEEmergencyContacts"));
const HSEForkliftInspection   = lazy(() => import("./HSEForkliftInspection"));
const HSEToolboxMeeting       = lazy(() => import("./HSEToolboxMeeting"));
const HSELicenses             = lazy(() => import("./HSELicenses"));
const HSEMonthlySafetyReport  = lazy(() => import("./HSEMonthlySafetyReport"));
const HSEKPIs                 = lazy(() => import("./HSEKPIs"));

/* Icons the shared set does not have. */
const IconBuilding = (p) => <Icon {...p}><rect x="4" y="3" width="16" height="18" rx="1" /><path d="M9 7h1M14 7h1M9 11h1M14 11h1M9 15h1M14 15h1" /><path d="M10 21v-3h4v3" /></Icon>;
const IconBook     = (p) => <Icon {...p}><path d="M4 4h6a3 3 0 0 1 3 3v13a2 2 0 0 0-2-2H4z" /><path d="M20 4h-6a3 3 0 0 0-3 3v13a2 2 0 0 1 2-2h7z" /></Icon>;
const IconFire     = (p) => <Icon {...p}><path d="M12 22c4 0 7-2.7 7-7 0-3-2-5.5-4-7.5 0 2.5-1.5 4-3 4 0-3-1-6-4-9.5C8 6 5 9.5 5 15c0 4.3 3 7 7 7Z" /></Icon>;
const IconPhone    = (p) => <Icon {...p}><path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 1.9.7 2.8a2 2 0 0 1-.5 2.1L8 9.9a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.5c.9.3 1.8.6 2.8.7a2 2 0 0 1 1.7 2Z" /></Icon>;
const IconForklift = (p) => <Icon {...p}><path d="M3 18V8h7l3 5v5" /><path d="M17 4v14h4" /><path d="M13 13h4" /><circle cx="6" cy="19" r="2" /><circle cx="12" cy="19" r="2" /></Icon>;
const IconPermit   = (p) => <Icon {...p}><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><path d="M14 2v6h6" /><path d="M9 15l2 2 4-4" /></Icon>;
const IconBadge    = (p) => <Icon {...p}><circle cx="12" cy="9" r="6" /><path d="M8.5 14 7 22l5-3 5 3-1.5-8" /></Icon>;
const IconGlove    = (p) => <Icon {...p}><path d="M7 11V6a1.5 1.5 0 0 1 3 0v4M10 10V4.5a1.5 1.5 0 0 1 3 0V10M13 10V5.5a1.5 1.5 0 0 1 3 0V12" /><path d="M16 12v-1.5a1.5 1.5 0 0 1 3 0V15a7 7 0 0 1-7 7h-1a6 6 0 0 1-5-2.7L3.5 15a1.5 1.5 0 0 1 2.5-1.7L7 15" /></Icon>;
const IconExit     = (p) => <Icon {...p}><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><path d="M16 17l5-5-5-5" /><path d="M21 12H9" /></Icon>;
const IconUsers    = (p) => <Icon {...p}><circle cx="9" cy="7" r="4" /><path d="M3 21v-2a6 6 0 0 1 12 0v2" /><path d="M16 3.1a4 4 0 0 1 0 7.8M21 21v-2a6 6 0 0 0-4-5.6" /></Icon>;

const GROUP_DEFS = [
  { key: "framework", ar: "الإطار والسياسات",   en: "FRAMEWORK & POLICIES", color: "#60a5fa", Icon: IconBook },
  { key: "incidents", ar: "الحوادث والإجراءات", en: "INCIDENTS & ACTIONS",  color: "#f87171", Icon: IconAlert },
  { key: "daily",     ar: "السجلات التشغيلية",  en: "OPERATIONAL LOGS",     color: "#2dd4bf", Icon: IconClipboard },
  { key: "fire",      ar: "الحريق والطوارئ",    en: "FIRE & EMERGENCY",     color: "#fb923c", Icon: IconFire },
  { key: "equipment", ar: "المعدات",            en: "EQUIPMENT",            color: "#fbbf24", Icon: IconWrench },
  { key: "people",    ar: "الأفراد والتدريب",    en: "PEOPLE & TRAINING",    color: "#f472b6", Icon: IconUsers },
  { key: "reports",   ar: "التقارير والمؤشرات",  en: "REPORTS & KPIs",       color: "#c084fc", Icon: IconChart },
];

/* id = the permission item in utils/sectionItems.js (hse.items) — the hub
   only lists the pages an account may open, same as the routes allow. */
const TAB_DEFS = [
  { id: "company-profile",       group: "framework", Icon: IconBuilding,  accent: "#0ea5e9", Comp: HSECompanyProfile,
    ar: "ملف الشركة",           en: "Company Profile",        subAr: "الرؤية والهيكل التنظيمي",   subEn: "Vision & organisation" },
  { id: "policies",              group: "framework", Icon: IconBook,      accent: "#3b82f6", Comp: HSEPolicies,
    ar: "السياسات",             en: "Policies",               subAr: "17 سياسة أساسية",           subEn: "17 core policies" },
  { id: "sops",                  group: "framework", Icon: IconClipboard, accent: "#6366f1", Comp: HSESOPs,
    ar: "الإجراءات القياسية",    en: "SOPs",                   subAr: "33 إجراء تشغيل",            subEn: "33 operating procedures" },
  { id: "risk-register",         group: "framework", Icon: IconShield,    accent: "#0f766e", Comp: HSERiskRegister,
    ar: "سجل المخاطر",          en: "Risk Register",          subAr: "F-02 · تقييم واعتماد",       subEn: "F-02 · assess & approve" },

  { id: "incident-report",       group: "incidents", Icon: IconAlert,     accent: "#dc2626", Comp: HSEIncidentReport,
    ar: "تقرير حادث",           en: "Incident Report",        subAr: "F-01 · حادث / شبه حادث",     subEn: "F-01 · incident / near-miss" },
  { id: "ncr",                   group: "incidents", Icon: IconAlert,     accent: "#f97316", Comp: HSENCR,
    ar: "عدم المطابقة",          en: "Non-Conformance",        subAr: "F-26 · NCR",                subEn: "F-26 · NCR" },
  { id: "capa-tracker",          group: "incidents", Icon: IconWrench,    accent: "#0891b2", Comp: HSECAPATracker,
    ar: "متابعة CAPA",          en: "CAPA Tracker",           subAr: "F-20 · تصحيحي ووقائي",       subEn: "F-20 · corrective & preventive" },

  { id: "work-permit",           group: "daily",     Icon: IconPermit,    accent: "#b45309", Comp: HSEWorkPermit,
    ar: "تصاريح العمل",          en: "Work Permits",           subAr: "F-07 · أعمال خطرة",          subEn: "F-07 · high-risk work" },
  { id: "cleaning-log",          group: "daily",     Icon: IconCleaning,  accent: "#22c55e", Comp: HSECleaningLog,
    ar: "التنظيف والتعقيم",      en: "Cleaning & Sanitation",  subAr: "F-10",                      subEn: "F-10" },
  { id: "swabs-log",             group: "daily",     Icon: IconFlask,     accent: "#a855f7", Comp: HSESwabsLog,
    ar: "المسحات الميكروبية",    en: "Microbiological Swabs",  subAr: "F-11",                      subEn: "F-11" },
  { id: "pest-control",          group: "daily",     Icon: IconBug,       accent: "#7c3aed", Comp: HSEPestControl,
    ar: "مكافحة الحشرات",        en: "Pest Control",           subAr: "F-12 · زيارة شهرية",         subEn: "F-12 · monthly visit" },
  { id: "waste-log",             group: "daily",     Icon: IconTrash,     accent: "#64748b", Comp: HSEWasteLog,
    ar: "التخلص من النفايات",    en: "Waste Disposal",         subAr: "F-19",                      subEn: "F-19" },
  { id: "welfare",               group: "daily",     Icon: IconHealth,    accent: "#ec4899", Comp: HSEWelfare,
    ar: "رعاية العمال",          en: "Worker Welfare",         subAr: "F-34 · قائمة فحص",           subEn: "F-34 · checklist" },

  { id: "fire-equipment",        group: "fire",      Icon: IconFire,      accent: "#ea580c", Comp: HSEFireEquipment,
    ar: "معدات الإطفاء",         en: "Fire Equipment",         subAr: "F-28 · فحص شهري",           subEn: "F-28 · monthly check" },
  { id: "evacuation-drills",     group: "fire",      Icon: IconExit,      accent: "#e11d48", Comp: HSEEvacuationDrills,
    ar: "تجارب الإخلاء",         en: "Evacuation Drills",      subAr: "F-16 · ربع سنوي",           subEn: "F-16 · quarterly" },
  { id: "emergency-contacts",    group: "fire",      Icon: IconPhone,     accent: "#be123c", Comp: HSEEmergencyContacts,
    ar: "جهات الطوارئ",          en: "Emergency Contacts",     subAr: "F-31",                      subEn: "F-31" },

  { id: "forklift-inspection",   group: "equipment", Icon: IconForklift,  accent: "#f59e0b", Comp: HSEForkliftInspection,
    ar: "فحص الرافعة الشوكية",   en: "Forklift Inspection",    subAr: "F-35 · قبل التشغيل",         subEn: "F-35 · pre-use" },
  { id: "equipment-maintenance", group: "equipment", Icon: IconWrench,    accent: "#d97706", Comp: HSEEquipmentMaintenance,
    ar: "صيانة المعدات",         en: "Equipment Maintenance",  subAr: "F-13 / F-18",               subEn: "F-13 / F-18" },

  { id: "ppe-log",               group: "people",    Icon: IconGlove,     accent: "#14b8a6", Comp: HSEPPELog,
    ar: "صرف معدات الوقاية",     en: "PPE Issue Log",          subAr: "PPE",                       subEn: "PPE" },
  { id: "toolbox-meeting",       group: "people",    Icon: IconUserCheck, accent: "#10b981", Comp: HSEToolboxMeeting,
    ar: "اجتماع Toolbox",        en: "Toolbox Meeting",        subAr: "F-29 · توعية يومية",         subEn: "F-29 · daily talk" },
  { id: "licenses",              group: "people",    Icon: IconBadge,     accent: "#0d9488", Comp: HSELicenses,
    ar: "التراخيص والشهادات",    en: "Licenses & Certificates",subAr: "متابعة الانتهاء",           subEn: "Expiry tracking" },

  { id: "monthly-safety",        group: "reports",   Icon: IconChart,     accent: "#9333ea", Comp: HSEMonthlySafetyReport,
    ar: "التقرير الشهري للسلامة", en: "Monthly Safety Report",  subAr: "F-21",                      subEn: "F-21" },
  { id: "kpis",                  group: "reports",   Icon: IconChart,     accent: "#7e22ce", Comp: HSEKPIs,
    ar: "لوحة المؤشرات",         en: "KPI Dashboard",          subAr: "LTIFR · TRIR · CAPA",       subEn: "LTIFR · TRIR · CAPA" },
];

/* The pages were written as stand-alone screens; inside the hub their own
   back button, language toggle and full-height background are redundant. */
const EMBED_CSS = `
  .hse-embed > main { min-height: auto !important; padding: 18px 20px 60px !important; background: transparent !important; }
  .hse-embed [data-hse-back], .hse-embed .hse-lang-toggle { display: none !important; }
`;

const embed = (node) => (
  <div className="hse-embed">
    <style>{EMBED_CSS}</style>
    {node}
  </div>
);

export default function HSEHub() {
  const { lang, toggle, dir } = useHSELang();
  const ar = lang === "ar";

  const groups = useMemo(
    () => GROUP_DEFS.map((g) => ({ key: g.key, label: ar ? g.ar : g.en, color: g.color, Icon: g.Icon })),
    [ar]
  );
  const tabs = useMemo(
    () => TAB_DEFS
      .filter((t) => isItemAllowed("hse", t.id))
      .map((t) => {
        const C = t.Comp;
        return {
          key: t.id,
          group: t.group,
          title: ar ? t.ar : t.en,
          subtitle: ar ? t.subAr : t.subEn,
          Icon: t.Icon,
          accent: t.accent,
          element: t.element !== undefined ? t.element : embed(<C />),
        };
      }),
    [ar]
  );

  if (!tabs.length) return <Navigate to="/named-dashboard" replace />;

  return (
    <QcsSidebarHub
      tabs={tabs}
      groups={groups}
      brandTitle="HSE"
      brandSub={ar ? "الصحة والسلامة والبيئة" : "Health · Safety · Environment"}
      crumb={ar ? "HSE" : "HSE"}
      param="tab"
      defaultKey="incident-report"
      storagePrefix="hse_nav"
      itemNoun={ar ? "نماذج" : "forms"}
      bodyDir={dir}
      topbarExtra={() => <HSELangToggle lang={lang} toggle={toggle} />}
    />
  );
}
