// src/pages/monitor/branches/pos15/POS15Layout.jsx
// POS 15 — Input Tabs (FTR1-style). يستخدم المكوّن المشترك BranchInputLayout.
import React, { lazy } from "react";
import BranchInputLayout from "../_shared/BranchInputLayout";

const QCSRawMaterialInspection = lazy(() =>
  import("../shipment_recc/QCSRawMaterialInspection").then((m) => ({
    default: m.default || m.QCSRawMaterialInspection,
  }))
);
const POS15PersonalHygiene             = lazy(() => import("./POS15PersonalHygiene"));
const POS15DailyCleaning               = lazy(() => import("./POS15DailyCleaning"));
const POS15TemperatureInput            = lazy(() => import("./POS15TemperatureInput"));
const POS15ReceivingLogInput           = lazy(() => import("./POS15ReceivingLogInput"));
const POS15TraceabilityLogInput        = lazy(() => import("./POS15TraceabilityLogInput"));
const POS15EquipInspectSanitizingInput = lazy(() =>
  import("./POS15EquipmentInspectionSanitizingLogInput").then((m) => ({
    default:
      m.default ||
      m.POS15EquipmentInspectionSanitizingLogInput ||
      m.EquipmentInspectionSanitizingLogInput,
  }))
);
const POS15PestControlInput            = lazy(() =>
  import("./POS15PestControlInput").then((m) => ({
    default: m.default || m.POS15PestControlInput || m.PestControlInput,
  }))
);

const config = {
  branch: "POS 15",
  source: "pos15-tabs",
  title: "📋 POS 15 — Operations Inputs",
  description:
    "All input tabs (Shipments, Personal Hygiene, Daily Cleaning, Temperature, Receiving Log, Traceability Log, Equipment Inspection & Sanitizing, and Pest Control) in one place.",
  defaultTab: "shipments",
  tabs: [
    { key: "shipments",    label: "📦 Shipments",                            Component: QCSRawMaterialInspection,        loadingText: "Loading Shipments form…" },
    { key: "personal",     label: "🧑‍🔬 Personal Hygiene",                  Component: POS15PersonalHygiene,            loadingText: "Loading Personal Hygiene…" },
    { key: "daily",        label: "🧹 Daily Cleaning",                       Component: POS15DailyCleaning,              loadingText: "Loading Daily Cleaning…" },
    { key: "temperature",  label: "🌡️ Temperature",                          Component: POS15TemperatureInput,           loadingText: "Loading Temperature…" },
    { key: "receiving",    label: "📥 Receiving Log",                        Component: POS15ReceivingLogInput,          loadingText: "Loading Receiving Log…" },
    { key: "traceability", label: "🧬 Traceability Log",                     Component: POS15TraceabilityLogInput,       loadingText: "Loading Traceability Log…" },
    { key: "equip_sanit",  label: "🧪 Equipment Inspection & Sanitizing",   Component: POS15EquipInspectSanitizingInput, loadingText: "Loading Equipment Inspection & Sanitizing…" },
    { key: "pest",         label: "🪲 Pest Control",                         Component: POS15PestControlInput,           loadingText: "Loading Pest Control…" },
  ],
};

export default function POS15Layout() {
  return <BranchInputLayout config={config} />;
}
