// src/pages/monitor/branches/pos 10/POS10Layout.jsx
// POS 10 — Input Tabs (FTR1-style). يستخدم المكوّن المشترك BranchInputLayout.
// "Shipments" يستخدم النموذج العام؛ بقية التبويبات تأتي من ملفاتها بنفس المجلّد.
import React, { lazy } from "react";
import BranchInputLayout from "../_shared/BranchInputLayout";

const QCSRawMaterialInspection = lazy(() =>
  import("../shipment_recc/QCSRawMaterialInspection").then((m) => ({
    default: m.default || m.QCSRawMaterialInspection,
  }))
);
const POS10PersonalHygiene     = lazy(() => import("./POS10PersonalHygiene"));
const POS10DailyCleaning       = lazy(() => import("./POS10DailyCleaning"));
const POS10TemperatureInput    = lazy(() => import("./POS10TemperatureInput"));
const POS10TraceabilityLogInput = lazy(() => import("./TraceabilityLogInput"));
const POS10ReceivingLogInput   = lazy(() => import("./POS10ReceivingLogInput"));
const POS10PestControlInput    = lazy(() => import("./POS10PestControlInput"));
const POS10CalibrationInput    = lazy(() => import("./POS10CalibrationInput"));

const config = {
  branch: "POS 10",
  source: "pos10-tabs",
  title: "📋 POS 10 — Operations Inputs",
  description:
    "All input tabs (Shipments, Personal Hygiene, Daily Cleaning, Temperature, Traceability Log, Receiving Log, Pest Control, and Calibration) in one place.",
  defaultTab: "shipments",
  tabs: [
    { key: "shipments",    label: "📦 Shipments",          Component: QCSRawMaterialInspection,    loadingText: "Loading Shipments form…" },
    { key: "personal",     label: "🧑‍🔬 Personal Hygiene", Component: POS10PersonalHygiene,        loadingText: "Loading Personal Hygiene…" },
    { key: "daily",        label: "🧹 Daily Cleaning",     Component: POS10DailyCleaning,          loadingText: "Loading Daily Cleaning…" },
    { key: "temperature",  label: "🌡️ Temperature",        Component: POS10TemperatureInput,       loadingText: "Loading Temperature…" },
    { key: "traceability", label: "🧬 Traceability Log",   Component: POS10TraceabilityLogInput,   loadingText: "Loading Traceability Log…" },
    { key: "receiving",    label: "📥 Receiving Log",      Component: POS10ReceivingLogInput,      loadingText: "Loading Receiving Log…" },
    { key: "pest",         label: "🪲 Pest Control",       Component: POS10PestControlInput,       loadingText: "Loading Pest Control…" },
    { key: "calibration",  label: "🧰 Calibration",        Component: POS10CalibrationInput,       loadingText: "Loading Calibration…" },
  ],
};

export default function POS10Layout() {
  return <BranchInputLayout config={config} />;
}
