// src/pages/monitor/branches/ftr2/FTR2Report.jsx
// FTR 2 — Input Tabs. Same shared hub as POS 6/10/11/15/19 (BranchInputLayout):
// sidebar list, active tab in ?tab=, one form loaded at a time.
import React, { lazy } from "react";
import BranchInputLayout from "../_shared/BranchInputLayout";

const FTR2PersonalHygiene            = lazy(() => import("./FTR2PersonalHygiene"));
const FTR2DailyCleanliness           = lazy(() => import("./FTR2DailyCleanliness"));
const FTR2Temperature                = lazy(() => import("./FTR2Temperature"));
const FTR2OilCalibration             = lazy(() => import("./FTR2OilCalibration"));
const FTR2ReceivingLog               = lazy(() => import("./FTR2ReceivingLog"));
const FTR2CookingTemperatureLogInput = lazy(() => import("./FTR2CookingTemperatureLogInput"));

const config = {
  branch: "FTR 2",
  source: "ftr2-tabs",
  title: "📋 FTR 2 — Operations Inputs",
  description:
    "All input tabs (Personal Hygiene, Daily Cleanliness, Temperature, Oil Calibration, Receiving Log and Cooking Temperature Log) in one place.",
  defaultTab: "personal",
  // keys kept from the old tab bar so existing links/bookmarks still land
  tabs: [
    { key: "personal",  label: "🧑‍🔬 Personal Hygiene",   Component: FTR2PersonalHygiene,            loadingText: "Loading Personal Hygiene…" },
    { key: "daily",     label: "🧹 Daily Cleanliness",    Component: FTR2DailyCleanliness,           loadingText: "Loading Daily Cleanliness…" },
    { key: "temp",      label: "🌡️ Temperature",          Component: FTR2Temperature,                loadingText: "Loading Temperature…" },
    { key: "oil",       label: "🛢️ Oil Calibration",      Component: FTR2OilCalibration,             loadingText: "Loading Oil Calibration…" },
    { key: "receiving", label: "🚚 Receiving Log",        Component: FTR2ReceivingLog,               loadingText: "Loading Receiving Log…" },
    { key: "cooklog",     label: "🍳 Cooking Temp Log",     Component: FTR2CookingTemperatureLogInput, loadingText: "Loading Cooking Temp Log…" },
  ],
};

export default function FTR2Report() {
  return <BranchInputLayout config={config} />;
}
