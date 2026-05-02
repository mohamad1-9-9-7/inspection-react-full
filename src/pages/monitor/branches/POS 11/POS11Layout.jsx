// src/pages/monitor/branches/POS 11/POS11Layout.jsx
// POS 11 — Input Tabs (FTR1-style). يستخدم المكوّن المشترك BranchInputLayout.
import React, { lazy } from "react";
import BranchInputLayout from "../_shared/BranchInputLayout";

const QCSRawMaterialInspection = lazy(() =>
  import("../shipment_recc/QCSRawMaterialInspection").then((m) => ({
    default: m.default || m.QCSRawMaterialInspection,
  }))
);
const POS11PersonalHygiene      = lazy(() => import("./POS11PersonalHygiene"));
const POS11DailyCleaning        = lazy(() => import("./POS11DailyCleaning"));
const POS11TemperatureInput     = lazy(() => import("./POS11TemperatureInput"));
const POS11TraceabilityLogInput = lazy(() => import("./TraceabilityLogInput"));
const POS11ReceivingLogInput    = lazy(() => import("./POS11ReceivingLogInput"));
const POS11PestControlInput     = lazy(() => import("./POS11PestControlInput"));
const POS11CalibrationInput     = lazy(() => import("./POS11CalibrationInput"));

const config = {
  branch: "POS 11",
  source: "pos11-tabs",
  title: "📋 POS 11 — Operations Inputs (Al Ain Butchery)",
  description:
    "All input tabs (Shipments, Personal Hygiene, Daily Cleaning, Temperature, Traceability Log, Receiving Log, Pest Control, and Calibration) in one place.",
  defaultTab: "shipments",
  tabs: [
    { key: "shipments",    label: "📦 Shipments",          Component: QCSRawMaterialInspection,    loadingText: "Loading Shipments form…" },
    { key: "personal",     label: "🧑‍🔬 Personal Hygiene", Component: POS11PersonalHygiene,        loadingText: "Loading Personal Hygiene…" },
    { key: "daily",        label: "🧹 Daily Cleaning",     Component: POS11DailyCleaning,          loadingText: "Loading Daily Cleaning…" },
    { key: "temperature",  label: "🌡️ Temperature",        Component: POS11TemperatureInput,       loadingText: "Loading Temperature…" },
    { key: "traceability", label: "🧬 Traceability Log",   Component: POS11TraceabilityLogInput,   loadingText: "Loading Traceability Log…" },
    { key: "receiving",    label: "📥 Receiving Log",      Component: POS11ReceivingLogInput,      loadingText: "Loading Receiving Log…" },
    { key: "pest",         label: "🪲 Pest Control",       Component: POS11PestControlInput,       loadingText: "Loading Pest Control…" },
    { key: "calibration",  label: "🧰 Calibration",        Component: POS11CalibrationInput,       loadingText: "Loading Calibration…" },
  ],
};

export default function POS11Layout() {
  return <BranchInputLayout config={config} />;
}
