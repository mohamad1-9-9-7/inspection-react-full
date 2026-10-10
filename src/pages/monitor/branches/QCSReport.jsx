// src/pages/monitor/branches/QCSReport.jsx
// QCS input forms. The sidebar layout is _shared/QcsSidebarHub (the QCS
// reports hub uses the same one).

import React, { lazy } from "react";
import QcsSidebarHub, {
  QCS_GROUPS,
  IconBox, IconSnow, IconHygiene, IconCleaning, IconChicken, IconTruck, IconFlask, IconPackage,
  IconAlert, IconWrench, IconClipboard, IconTrash, IconMeat, IconBug, IconRotate, IconUserCheck,
  IconHealth, IconReturn, IconReject, IconShield,
} from "./_shared/QcsSidebarHub";
import BranchCertificates from "./_shared/BranchCertificates";

const QcsCertificates = () => <BranchCertificates branch="QCS" />;

/* ===== Lazy Inputs ===== */
const QCSRawMaterialInspection      = lazy(() => import("./shipment_recc/QCSRawMaterialInspection"));
const CoolersTab                    = lazy(() => import("./qcs/CoolersTab"));
const PersonalHygieneTab            = lazy(() => import("./qcs/PersonalHygieneTab"));
const DailyCleanlinessTab           = lazy(() => import("./qcs/DailyCleanlinessTab"));
const FreshChickenInter             = lazy(() => import("./qcs/FreshChickenInter"));
const MamzarMeatInspection          = lazy(() => import("./qcs/MeatProductInspectionReport"));      // FTR 2 (Mamzar)
const MushrifMeatInspection         = lazy(() => import("./qcs/MeatProductInspectionReportFTR1"));  // FTR 1 (Mushrif)
const RMInspectionReportIngredients = lazy(() => import("./qcs/RMInspectionReportIngredients"));
const RMInspectionReportPackaging   = lazy(() => import("./qcs/RMInspectionReportPackaging"));
const NonConformanceReportInput     = lazy(() => import("./qcs/NonConformanceReportInput"));
const CorrectiveActionReportInput   = lazy(() => import("./qcs/CorrectiveActionReportInput"));
const InternalAuditInput            = lazy(() => import("./qcs/InternalAuditInput"));
const GarbageDisposalInput          = lazy(() => import("./qcs/GarbageDisposalInput"));
const MeatWasteDisposalInput        = lazy(() => import("./qcs/MeatWasteDisposalInput"));
const PestControlInput              = lazy(() => import("./qcs/PestControlInput"));
const StockRotationInput            = lazy(() => import("./qcs/StockRotationInput"));
const VisitorChecklistInput         = lazy(() => import("./qcs/VisitorChecklistInput"));
const StaffSicknessInput            = lazy(() => import("./qcs/StaffSicknessInput"));
const EmployeeReturnToWorkInput     = lazy(() => import("./qcs/EmployeeReturnToWorkInput"));
const ProductRejectionInput         = lazy(() => import("./qcs/ProductRejectionInput"));
const EmployeeWarningInput          = lazy(() => import("./qcs/EmployeeWarningInput"));


/* ===== Tabs ===== */
const TABS = [
  // ── Receiving & Storage ──
  { key: "shipment",             group: "receiving",  title: "Raw Material Receipt",   subtitle: "Shipment inspection",          Icon: IconBox,       accent: "#0ea5e9", Comp: QCSRawMaterialInspection },
  { key: "coolers",              group: "receiving",  title: "Coolers Temperatures",   subtitle: "Cold chain monitoring",        Icon: IconSnow,      accent: "#3b82f6", Comp: CoolersTab },
  { key: "stockRotation",        group: "receiving",  title: "Stock Rotation",         subtitle: "FIFO / FEFO log",              Icon: IconRotate,    accent: "#6366f1", Comp: StockRotationInput },

  // ── Hygiene & Cleaning ──
  { key: "personalHygiene",      group: "hygiene",    title: "Personal Hygiene",       subtitle: "Employee checklist",           Icon: IconHygiene,   accent: "#14b8a6", Comp: PersonalHygieneTab },
  { key: "dailyCleanliness",     group: "hygiene",    title: "Daily Cleanliness",      subtitle: "Facility cleaning record",     Icon: IconCleaning,  accent: "#22c55e", Comp: DailyCleanlinessTab },
  { key: "visitorChecklist",     group: "hygiene",    title: "Visitor Checklist",      subtitle: "Entry screening",              Icon: IconUserCheck, accent: "#84cc16", Comp: VisitorChecklistInput },

  // ── Product Inspection ──
  { key: "qusaisFreshChicken",   group: "inspection", title: "Fresh Chicken",          subtitle: "Al Qusais receiving",          Icon: IconChicken,   accent: "#f59e0b", Comp: FreshChickenInter },
  { key: "meatInspectionMamzar", group: "inspection", title: "Meat Inspection FTR 2",  subtitle: "Mamzar Park • pre-loading",     Icon: IconTruck,     accent: "#e11d48", Comp: MamzarMeatInspection },
  { key: "meatInspectionMushrif",group: "inspection", title: "Meat Inspection FTR 1",  subtitle: "Mushrif Park • pre-loading",    Icon: IconTruck,     accent: "#be123c", Comp: MushrifMeatInspection },
  { key: "physical_ing",         group: "inspection", title: "Physical — Ingredients", subtitle: "Ingredient inspection report",  Icon: IconFlask,     accent: "#a855f7", Comp: RMInspectionReportIngredients },
  { key: "physical_pack",        group: "inspection", title: "Physical — Packaging",   subtitle: "Packaging inspection report",   Icon: IconPackage,   accent: "#8b5cf6", Comp: RMInspectionReportPackaging },

  // ── Quality & Compliance ──
  { key: "nonConformance",       group: "quality",    title: "Non-Conformance",        subtitle: "NCR report",                   Icon: IconAlert,     accent: "#f97316", Comp: NonConformanceReportInput },
  { key: "car",                  group: "quality",    title: "Corrective Action",      subtitle: "CAPA report",                  Icon: IconWrench,    accent: "#0891b2", Comp: CorrectiveActionReportInput },
  { key: "internalAudit",        group: "quality",    title: "Internal Audit",         subtitle: "Audit checklist",              Icon: IconClipboard, accent: "#0f766e", Comp: InternalAuditInput },
  { key: "productRejection",     group: "quality",    title: "Product Rejection",      subtitle: "Rejection report",             Icon: IconReject,    accent: "#dc2626", Comp: ProductRejectionInput },
  { key: "employeeWarning",      group: "quality",    title: "Employee Warning",       subtitle: "Internal warning / notice",    Icon: IconAlert,     accent: "#b91c1c", Comp: EmployeeWarningInput },

  // ── Waste & Pest ──
  { key: "garbageDisposal",      group: "waste",      title: "Garbage Disposal",       subtitle: "Daily disposal log",           Icon: IconTrash,     accent: "#64748b", Comp: GarbageDisposalInput },
  { key: "meatWasteDisposal",    group: "waste",      title: "Meat Waste Disposal",    subtitle: "Condemned product log",        Icon: IconMeat,      accent: "#b45309", Comp: MeatWasteDisposalInput },
  { key: "pestControl",          group: "waste",      title: "Pest Control",           subtitle: "Monitoring log",               Icon: IconBug,       accent: "#7c3aed", Comp: PestControlInput },

  // ── People & Health ──
  { key: "staffSickness",        group: "people",     title: "Staff Sickness",         subtitle: "Illness / occupational injury",Icon: IconHealth,    accent: "#ec4899", Comp: StaffSicknessInput },
  { key: "returnToWork",         group: "people",     title: "Return to Work",         subtitle: "Fitness clearance",            Icon: IconReturn,    accent: "#10b981", Comp: EmployeeReturnToWorkInput },

  // ── Certificates (open / download) ──
  { key: "certificates",         group: "certs",      title: "Certificates",           subtitle: "ISO 22000 · HACCP",            Icon: IconShield,    accent: "#ca8a04", Comp: QcsCertificates },
];

/* Shared with the reports hub so both menus group the same way. */
const GROUPS = [...QCS_GROUPS, { key: "certs", label: "CERTIFICATES", color: "#facc15", Icon: IconShield }];

/* The sidebar layout lives in _shared/QcsSidebarHub (shared with the QCS
   reports hub, QCSReportsView). This file only lists the input forms. */
export default function QCSReport() {
  return (
    <QcsSidebarHub
      tabs={TABS}
      groups={GROUPS}
      brandSub="Daily Inputs"
      crumb="Inputs"
      param="tab"
      defaultKey="shipment"
      storagePrefix="qcs_nav"
      itemNoun="forms"
    />
  );
}
